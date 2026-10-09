import type { Aria2Task } from "@/types/aria2";

/**
 * Decides which stopped aria2 tasks deserve a "download complete"
 * notification. Kept pure (and unit-tested) so the background service
 * worker only does storage and notification IO around it.
 */

/** Only completions newer than this are announced. */
export const COMPLETION_WINDOW_MS = 120_000;
/** Forget notified gids after a day. */
export const NOTIFIED_TTL_MS = 24 * 60 * 60 * 1000;
/** Upper bound for the notified-gid map. */
export const NOTIFIED_MAX_ENTRIES = 200;

export type NotifiedMap = Record<string, number>;

export function selectCompletedForNotification(
  tasks: Aria2Task[],
  notified: NotifiedMap,
  now: number,
  windowMs: number = COMPLETION_WINDOW_MS,
): { toNotify: Aria2Task[]; next: NotifiedMap } {
  const next: NotifiedMap = {};
  for (const [gid, at] of Object.entries(notified)) {
    if (now - at < NOTIFIED_TTL_MS) next[gid] = at;
  }

  const toNotify: Aria2Task[] = [];
  for (const task of tasks) {
    if (task.status !== "complete") continue;
    if (next[task.gid] !== undefined) continue;
    const completedAt = Number(task.completionDate ?? 0) * 1000;
    if (!completedAt || now - completedAt > windowMs) continue;
    toNotify.push(task);
    next[task.gid] = now;
  }

  // Keep the map bounded by dropping the oldest entries.
  const kept = Object.entries(next)
    .sort((a, b) => a[1] - b[1])
    .slice(-NOTIFIED_MAX_ENTRIES);
  return { toNotify, next: Object.fromEntries(kept) };
}
