import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  MAX_CONNECT_ATTEMPTS,
  startConnectCycle,
  useConnectionStore,
} from "@/api/connection";
import { useAppStore } from "@/store";

function rpcLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const STATUS_DOT: Record<string, string> = {
  connected: "bg-green-500",
  connecting: "bg-amber-500 animate-pulse",
  disconnected: "bg-red-500",
};

/**
 * Desktop status bar (AriaNg-style): connection state, RPC endpoint and
 * task counters. Live rates live in the header pill, not here. Connection
 * problems surface inline — reason, a shortcut to the connection settings
 * and a manual retry — instead of a banner over the page content.
 */
export function StatusBar() {
  const { t } = useTranslation();
  const rpcUrl = useAppStore((s) => s.rpcUrl);
  const status = useConnectionStore((s) => s.status);
  const attempt = useConnectionStore((s) => s.attempt);
  const error = useConnectionStore((s) => s.error);
  const stats = useConnectionStore((s) => s.stats);

  const chips: Array<{ label: string; value: string | number }> = [
    { label: t("Downloading"), value: stats?.numActive ?? "0" },
    { label: t("Waiting Tasks"), value: stats?.numWaiting ?? "0" },
    { label: t("Stopped Tasks"), value: stats?.numStopped ?? "0" },
  ];

  return (
    <footer className="hidden md:flex min-h-7 shrink-0 flex-wrap items-center gap-x-1 gap-y-0.5 border-t bg-card px-3 py-1 text-xs text-muted-foreground">
      <span
        className="flex items-center gap-1.5 rounded px-1.5 py-0.5"
        title={error ?? undefined}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
        {status === "connected" && t("Connected")}
        {status === "connecting" && (
          <>
            {t("Connecting")}
            <span className="tabular-nums">
              {attempt}/{MAX_CONNECT_ATTEMPTS}
            </span>
          </>
        )}
        {status === "disconnected" && t("Disconnected")}
      </span>
      <span className="rounded px-1.5 py-0.5 font-mono">
        {rpcLabel(rpcUrl)}
      </span>
      {status === "disconnected" && (
        <>
          <span className="text-destructive">
            {t("Cannot connect to Aria2. Check your settings.")}
          </span>
          <Link
            to="/settings"
            search={{ tab: "connection" }}
            className="rounded px-1.5 py-0.5 underline underline-offset-2 hover:text-foreground"
          >
            {t("Settings")}
          </Link>
          <button
            type="button"
            onClick={startConnectCycle}
            className="rounded px-1.5 py-0.5 underline underline-offset-2 hover:text-foreground"
          >
            {t("Retry")}
          </button>
        </>
      )}
      <span className="ml-auto flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 tabular-nums"
          >
            <span className="text-muted-foreground/70">{chip.label}</span>
            <span className="font-medium text-foreground">{chip.value}</span>
          </span>
        ))}
      </span>
    </footer>
  );
}
