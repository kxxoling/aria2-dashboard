/**
 * Semantic status colors shared by badges, progress bars and dots.
 * Kept as plain classes so both table and dialog can use them.
 */
export interface StatusVisual {
  badgeClass: string;
  barClass: string;
  dotClass: string;
}

const visuals: Record<string, StatusVisual> = {
  active: {
    badgeClass:
      "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    barClass: "bg-green-500",
    dotClass: "bg-green-500",
  },
  waiting: {
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    barClass: "bg-amber-500",
    dotClass: "bg-amber-500",
  },
  paused: {
    badgeClass: "bg-muted text-muted-foreground border-border",
    barClass: "bg-muted-foreground/50",
    dotClass: "bg-muted-foreground/50",
  },
  error: {
    badgeClass:
      "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
    barClass: "bg-red-500",
    dotClass: "bg-red-500",
  },
  complete: {
    badgeClass:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    barClass: "bg-blue-500",
    dotClass: "bg-blue-500",
  },
  removed: {
    badgeClass: "bg-muted text-muted-foreground border-border",
    barClass: "bg-muted-foreground/30",
    dotClass: "bg-muted-foreground/30",
  },
};

export function statusVisual(status: string): StatusVisual {
  return visuals[status] ?? visuals.paused;
}

/** Terminal statuses: the task will not progress further. */
export function isTerminalStatus(status: string): boolean {
  return status === "complete" || status === "error" || status === "removed";
}

/**
 * Task status labels, resolved through i18next from the nested
 * tasks.statuses.* locale trees (all nine languages). Unknown statuses
 * pass the raw aria2 string through.
 */
import type { TFunction } from "i18next";

const KNOWN_STATUSES = new Set([
  "active",
  "waiting",
  "paused",
  "error",
  "complete",
  "removed",
]);

export function taskStatusLabel(
  status: string,
  t: TFunction,
): { label: string; known: boolean } {
  if (!KNOWN_STATUSES.has(status)) return { label: status, known: false };
  return { label: t(`tasks.statuses.${status}`), known: true };
}
