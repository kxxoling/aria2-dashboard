import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { aria2Client } from "@/api/aria2";
import { formatBytes } from "@/lib/utils.format";
import { useAppStore } from "@/store";

const BASE_TITLE = "Aria2 Dashboard";

/** AriaNg-style tab title: "↓ 1.2 MB/s ↑ 30 KB/s - Aria2 Dashboard". */
export function formatTitleSpeed(down: number, up: number): string {
  return `↓ ${formatBytes(down)}/s ↑ ${formatBytes(up)}/s - ${BASE_TITLE}`;
}

/**
 * Renders live rates into the browser tab title:
 * "↓ 1.2 MB/s ↑ 30 KB/s - Aria2 Dashboard" (AriaNg-style), toggleable.
 */
export function useTitleSpeed() {
  const titleSpeedEnabled = useAppStore((s) => s.settings.titleSpeedEnabled);
  const globalStatInterval = useAppStore((s) => s.settings.globalStatInterval);

  const { data: stats } = useQuery({
    queryKey: ["globalStat"],
    queryFn: () => aria2Client.getGlobalStat(),
    refetchInterval: titleSpeedEnabled
      ? Math.max(1000, globalStatInterval)
      : false,
    enabled: titleSpeedEnabled,
  });

  useEffect(() => {
    if (!titleSpeedEnabled) {
      document.title = BASE_TITLE;
      return;
    }
    if (!stats) return;
    document.title = formatTitleSpeed(
      Number(stats.downloadSpeed || 0),
      Number(stats.uploadSpeed || 0),
    );
  }, [stats, titleSpeedEnabled]);

  // Restore the plain title when the toggle turns off
  useEffect(() => {
    if (!titleSpeedEnabled) document.title = BASE_TITLE;
  }, [titleSpeedEnabled]);
}
