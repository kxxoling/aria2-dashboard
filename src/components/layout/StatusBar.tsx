import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { useAppStore } from "@/store";

function rpcLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Desktop status bar (AriaNg-style): connection state, RPC endpoint and
 * task counters. Live rates live in the header pill, not here.
 */
export function StatusBar() {
  const { t } = useTranslation();
  const rpcUrl = useAppStore((s) => s.rpcUrl);
  const { data: stats, isError } = useQuery({
    queryKey: ["globalStat"],
    queryFn: () => aria2Client.getGlobalStat(),
    refetchInterval: 2000,
  });

  const chips: Array<{ label: string; value: string | number }> = [
    { label: t("Downloading"), value: stats?.numActive ?? "0" },
    { label: t("Waiting Tasks"), value: stats?.numWaiting ?? "0" },
    { label: t("Stopped Tasks"), value: stats?.numStopped ?? "0" },
  ];

  return (
    <footer className="hidden md:flex min-h-7 shrink-0 flex-wrap items-center gap-x-1 gap-y-0.5 border-t bg-card px-3 py-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5 rounded px-1.5 py-0.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${isError ? "bg-red-500" : "bg-green-500"}`}
        />
        {isError ? t("Disconnected") : t("Connected")}
      </span>
      <span className="rounded px-1.5 py-0.5 font-mono">
        {rpcLabel(rpcUrl)}
      </span>
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
