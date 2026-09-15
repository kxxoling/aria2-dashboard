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
    isLoading: loadingActive,
    isError: errorActive,
  } = useQuery({
    queryKey: ["activeTasks"],
    queryFn: () => aria2Client.tellActive(),
    refetchInterval: taskListInterval,
  });

  const { data: waitingTasks, isLoading: loadingWaiting } = useQuery({
    queryKey: ["waitingTasks"],
    queryFn: () => aria2Client.tellWaiting(0, 100),
    refetchInterval: taskListInterval * 2,
  });

  const { data: stoppedTasks, isLoading: loadingStopped } = useQuery({
    queryKey: ["stoppedTasks"],
    queryFn: () => aria2Client.tellStopped(0, 100),
    refetchInterval: taskListInterval * 4,
  });

  const allTasks = useMemo(
    () => [
      ...(activeTasks || []),
      ...(waitingTasks || []),
      ...(stoppedTasks || []),
    ],
    [activeTasks, waitingTasks, stoppedTasks],
  );

  const tasksMap: Record<TaskTab, Aria2Task[] | undefined> = {
    all: allTasks,
    active: activeTasks,
    waiting: waitingTasks,
    stopped: stoppedTasks,
  };

  const loadingMap: Record<TaskTab, boolean> = {
    all: loadingActive || loadingWaiting || loadingStopped,
    active: loadingActive,
    waiting: loadingWaiting,
    stopped: loadingStopped,
  };

  return { tasksMap, loadingMap, errorActive };
}
