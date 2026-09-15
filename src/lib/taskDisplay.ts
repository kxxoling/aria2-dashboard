import type { Aria2Task } from "@/types/aria2";

/**
 * Task display helpers, derived from real aria2 1.37.0 behavior:
 * a magnet link first creates a metadata task whose single file has the
 * literal path "[METADATA]"; once fetched, the real BT task appears via
 * followedBy (and points back through `following`), carrying the torrent
 * name under bittorrent.info.name.
 */

/** Metadata-fetching phase of a magnet download. */
export function isMetadataTask(task: Aria2Task): boolean {
  return task.files?.[0]?.path === "[METADATA]";
}

function bittorrentName(task: Aria2Task): string | undefined {
  const bt = task.bittorrent as { info?: { name?: string } } | undefined;
  return bt?.info?.name;
}

/** Best-effort human name for a task row. */
export function taskDisplayName(task: Aria2Task, fallback: string): string {
  const fromPath = task.files?.[0]?.path?.split("/").pop();
  if (fromPath && fromPath !== "[METADATA]") return fromPath;
  return (
    bittorrentName(task) ??
    (task.infoHash ? `magnet:${task.infoHash.slice(0, 12)}` : fallback)
  );
}

/** Short, distinguishable label for magnet metadata tasks. */
export function metadataTaskLabel(task: Aria2Task): string {
  return task.infoHash ? task.infoHash.slice(0, 12) : task.gid.slice(0, 12);
}
