import { useEffect } from "react";
import { useConnectionStore } from "@/api/connection";
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
 * Rates come from the shared connection manager's stats, so this adds no
 * polling of its own.
 */
export function useTitleSpeed() {
  const titleSpeedEnabled = useAppStore((s) => s.settings.titleSpeedEnabled);
  const stats = useConnectionStore((s) => s.stats);

  useEffect(() => {
    if (!titleSpeedEnabled || !stats) return;
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
