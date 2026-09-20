import { create } from "zustand";
import { aria2Client } from "@/api/aria2";
import { useAppStore } from "@/store";
import type { Aria2GlobalStat } from "@/types/aria2";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

/** Probe attempts per (re)connection cycle before surfacing "disconnected". */
export const MAX_CONNECT_ATTEMPTS = 3;
/** Pause between attempts inside one cycle. */
const ATTEMPT_DELAY_MS = 3000;
/** Pause after an exhausted cycle before the next one starts. */
const RETRY_DELAY_MS = 8000;

export interface ConnectionState {
  status: ConnectionStatus;
  /** 1-based attempt counter, only meaningful while connecting. */
  attempt: number;
  /** Last probe error message; set once a cycle exhausts all attempts. */
  error: string | null;
  stats: Aria2GlobalStat | null;
}

// The first paint must never claim "connected" — a backend that is down or
// not yet started has to show as connecting until a probe actually succeeds.
export const useConnectionStore = create<ConnectionState>()(() => ({
  status: "connecting",
  attempt: 1,
  error: null,
  stats: null,
}));

const patch = (p: Partial<ConnectionState>) => useConnectionStore.setState(p);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// No local timeout here on purpose: a probe runs until the client itself
// returns (aria2Client caps both transports at 15s), so a stalled backend
// that accepted the TCP connection but answers slowly gets to finish its
// failure before the next attempt is allowed to start.
const probe = () => aria2Client.getGlobalStat();

let cycleId = 0;
let monitorTimer: ReturnType<typeof setInterval> | null = null;
let monitorInFlight = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function stopTimers() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  monitorInFlight = false;
}

/**
 * One (re)connection cycle: up to MAX_CONNECT_ATTEMPTS probes, surfaced as
 * "connecting 1/3 … 3/3". Attempts run strictly one after another — each
 * waits for the previous probe's actual result — and only a fully exhausted
 * cycle settles into "disconnected", after which the next cycle starts
 * following RETRY_DELAY_MS so the badge recovers on its own once the
 * backend comes back.
 */
export function startConnectCycle() {
  cycleId += 1;
  const id = cycleId;
  stopTimers();
  void runCycle(id);
}

async function runCycle(id: number) {
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
    if (id !== cycleId) return;
    patch({ status: "connecting", attempt });
    try {
      const stats = await probe();
      if (id !== cycleId) return;
      patch({ status: "connected", attempt: 0, error: null, stats });
      startMonitor(id);
      return;
    } catch (e) {
      lastError = (e as Error).message;
      if (attempt < MAX_CONNECT_ATTEMPTS) await sleep(ATTEMPT_DELAY_MS);
    }
  }
  if (id !== cycleId) return;
  patch({ status: "disconnected", attempt: 0, error: lastError });
  retryTimer = setTimeout(() => {
    retryTimer = null;
    startConnectCycle();
  }, RETRY_DELAY_MS);
}

/** Light-touch polling while connected: refresh stats, detect dropouts. */
function startMonitor(id: number) {
  stopTimers();
  monitorTimer = setInterval(async () => {
    if (monitorInFlight || id !== cycleId) return;
    monitorInFlight = true;
    try {
      const stats = await probe();
      if (id === cycleId) patch({ stats });
    } catch {
      startConnectCycle();
    } finally {
      monitorInFlight = false;
    }
  }, useAppStore.getState().settings.globalStatInterval);
}

// A saved config change restarts connecting immediately, so new settings
// take effect without waiting for the current cycle to run out.
useAppStore.subscribe((state, prev) => {
  if (state.rpcUrl !== prev.rpcUrl || state.rpcSecret !== prev.rpcSecret) {
    startConnectCycle();
  }
});

/** Test hook: cancel every pending timer without touching store state. */
export function stopConnectionManager() {
  cycleId += 1;
  stopTimers();
}
