/**
 * Connection manager lifecycle: the store must boot in "connecting" (never
 * "connected"), give up after MAX_CONNECT_ATTEMPTS probes into a settled
 * "disconnected", keep retry cycles going on the reconnect interval, and
 * flip to "connected" as soon as a probe succeeds.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGlobalStat: vi.fn(),
}));

vi.mock("@/api/aria2", () => ({ aria2Client: mocks }));

import {
  startConnectCycle,
  stopConnectionManager,
  useConnectionStore,
} from "@/api/connection";

const state = () => useConnectionStore.getState();

describe("connection manager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useConnectionStore.setState({
      status: "connecting",
      attempt: 1,
      error: null,
      stats: null,
    });
  });

  afterEach(() => {
    stopConnectionManager();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("boots in the connecting state", () => {
    expect(state().status).toBe("connecting");
    expect(state().stats).toBeNull();
  });

  test("first successful probe connects and stores stats", async () => {
    const stats = { downloadSpeed: "100", uploadSpeed: "10" };
    mocks.getGlobalStat.mockResolvedValue(stats);

    startConnectCycle();
    await vi.advanceTimersByTimeAsync(10);

    expect(state().status).toBe("connected");
    expect(state().error).toBeNull();
    expect(state().stats).toMatchObject(stats);
  });

  test("exhausts 3 attempts into a settled disconnected state", async () => {
    // The third probe hangs until released, so the 3/3 attempt state is
    // observable despite instant connection refusals.
    let failThird: ((e: Error) => void) | undefined;
    mocks.getGlobalStat
      .mockRejectedValueOnce(new Error("down"))
      .mockRejectedValueOnce(new Error("down"))
      .mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            failThird = reject;
          }),
      );

    startConnectCycle();
    expect(state().attempt).toBe(1);

    // Two inter-attempt pauses (3s each) carry the cycle to its third probe.
    await vi.advanceTimersByTimeAsync(3001);
    expect(state().status).toBe("connecting");
    expect(state().attempt).toBe(2);

    await vi.advanceTimersByTimeAsync(3001);
    expect(state().status).toBe("connecting");
    expect(state().attempt).toBe(3);

    failThird?.(new Error("connection refused"));
    await vi.advanceTimersByTimeAsync(10);
    expect(state().status).toBe("disconnected");
    expect(state().error).toBe("connection refused");
    expect(state().attempt).toBe(0);
  });

  test("schedules the next cycle after a failed one", async () => {
    mocks.getGlobalStat.mockRejectedValue(new Error("connection refused"));

    startConnectCycle();
    // 3 attempts + 2 pauses (3s) + retry delay (8s) + one more pause
    await vi.advanceTimersByTimeAsync(2 * 3000 + 8000 + 3001);

    expect(state().status).toBe("connecting");
    expect(state().attempt).toBe(2);
  });

  test("recovers to connected when the backend comes back", async () => {
    mocks.getGlobalStat.mockRejectedValueOnce(new Error("down"));
    const stats = { downloadSpeed: "0", uploadSpeed: "0" };
    mocks.getGlobalStat.mockResolvedValue(stats);

    startConnectCycle();
    await vi.advanceTimersByTimeAsync(3100);

    expect(state().status).toBe("connected");
    expect(state().stats).toMatchObject(stats);
  });
});
