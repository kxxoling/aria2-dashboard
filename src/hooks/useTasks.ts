import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { aria2Client } from "@/api/aria2";
import { useAppStore } from "@/store";
import type { Aria2Task } from "@/types/aria2";

export type TaskTab = "all" | "active" | "waiting" | "stopped";

/**
 * Task data layer for the dashboard: the three list queries with their poll
 * cadences, plus the merged view and per-tab maps the page renders from.
 */
export function useTasks() {
  const taskListInterval = useAppStore((s) => s.settings.taskListInterval);
  const {
    data: activeTasks,
    dataUpdatedAt: activeFetchedAt,
    isLoading: loadingActive,
  } = useQuery({
    queryKey: ["activeTasks"],
    queryFn: () => aria2Client.tellActive(),
    refetchInterval: taskListInterval,
  });

  const {
    data: waitingTasks,
    dataUpdatedAt: waitingFetchedAt,
    isLoading: loadingWaiting,
  } = useQuery({
    queryKey: ["waitingTasks"],
    queryFn: () => aria2Client.tellWaiting(0, 100),
    refetchInterval: taskListInterval * 2,
  });

  const {
    data: stoppedTasks,
    dataUpdatedAt: stoppedFetchedAt,
    isLoading: loadingStopped,
  } = useQuery({
    queryKey: ["stoppedTasks"],
    queryFn: () => aria2Client.tellStopped(0, 100),
    refetchInterval: taskListInterval * 4,
  });

  // The three lists are fetched at different times (and a hung request keeps
  // serving its last snapshot), so one task can briefly appear in two lists
  // with different statuses. aria2 responses carry no server timestamp, so
  // "newest" is the list with the latest successful fetch (dataUpdatedAt):
  // merge in fetch order and let newer copies overwrite older ones by gid.
  const allTasks = useMemo(() => {
    const lists = [
      { tasks: activeTasks, fetchedAt: activeFetchedAt },
      { tasks: waitingTasks, fetchedAt: waitingFetchedAt },
      { tasks: stoppedTasks, fetchedAt: stoppedFetchedAt },
    ].sort((a, b) => a.fetchedAt - b.fetchedAt);
    const byGid = new Map<string, Aria2Task>();
    for (const { tasks } of lists) {
      for (const task of tasks ?? []) byGid.set(task.gid, task);
    }
    return [...byGid.values()];
  }, [
    activeTasks,
    waitingTasks,
    stoppedTasks,
    activeFetchedAt,
    waitingFetchedAt,
    stoppedFetchedAt,
  ]);

  // Memoized so the references stay stable across renders that don't carry
  // new data — the task table reacts to every new `data` reference (auto
  // reset + row-model rebuild), so a fresh map per render would drive a
  // render loop while polling.
  const tasksMap = useMemo<Record<TaskTab, Aria2Task[] | undefined>>(
    () => ({
      all: allTasks,
      active: activeTasks,
      waiting: waitingTasks,
      stopped: stoppedTasks,
    }),
    [allTasks, activeTasks, waitingTasks, stoppedTasks],
  );

  const loadingMap = useMemo<Record<TaskTab, boolean>>(
    () => ({
      all: loadingActive || loadingWaiting || loadingStopped,
      active: loadingActive,
      waiting: loadingWaiting,
      stopped: loadingStopped,
    }),
    [loadingActive, loadingWaiting, loadingStopped],
  );

  return { tasksMap, loadingMap };
}
