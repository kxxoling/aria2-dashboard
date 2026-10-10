import { describe, expect, test } from "vitest";
import {
  NOTIFIED_MAX_ENTRIES,
  selectCompletedForNotification,
} from "@/lib/completionNotify";
import type { Aria2Task } from "@/types/aria2";

const NOW = 1_000_000_000_000;

function completedTask(gid: string, completedAtMs: number): Aria2Task {
  return {
    gid,
    status: "complete",
    totalLength: "0",
    completedLength: "0",
    uploadLength: "0",
    downloadSpeed: "0",
    uploadSpeed: "0",
    completionDate: String(Math.round(completedAtMs / 1000)),
    dir: "/tmp",
  };
}

function failedTask(gid: string): Aria2Task {
  return {
    gid,
    status: "error",
    totalLength: "0",
    completedLength: "0",
    uploadLength: "0",
    downloadSpeed: "0",
    uploadSpeed: "0",
    completionDate: String(NOW / 1000),
    dir: "/tmp",
  };
}

describe("selectCompletedForNotification", () => {
  test("selects only fresh completed tasks", () => {
    const tasks = [
      completedTask("fresh", NOW - 5_000),
      completedTask("old", NOW - 10 * 60_000),
      failedTask("errored"),
    ];
    const { toNotify, next } = selectCompletedForNotification(tasks, {}, NOW);
    expect(toNotify.map((t) => t.gid)).toEqual(["fresh"]);
    expect(next).toEqual({ fresh: NOW });
  });

  test("skips tasks without a usable completion date", () => {
    const task: Aria2Task = {
      gid: "nodate",
      status: "complete",
      totalLength: "0",
      completedLength: "0",
      uploadLength: "0",
      downloadSpeed: "0",
      uploadSpeed: "0",
      dir: "/tmp",
    };
    const { toNotify } = selectCompletedForNotification([task], {}, NOW);
    expect(toNotify).toEqual([]);
  });

  test("does not re-notify already announced gids", () => {
    const tasks = [completedTask("gid1", NOW - 5_000)];
    const first = selectCompletedForNotification(tasks, {}, NOW);
    expect(first.toNotify).toHaveLength(1);

    const second = selectCompletedForNotification(tasks, first.next, NOW + 1);
    expect(second.toNotify).toEqual([]);
    expect(second.next.gid1).toBe(NOW);
  });

  test("prunes stale notified entries", () => {
    const stale = { gone: NOW - 25 * 60 * 60 * 1000 };
    const { next } = selectCompletedForNotification([], stale, NOW);
    expect(next).toEqual({});
  });

  test("caps the notified map at the maximum size", () => {
    const notified: Record<string, number> = {};
    for (let i = 0; i < NOTIFIED_MAX_ENTRIES + 10; i++) {
      notified[`gid${i}`] = NOW - 60_000 + i;
    }
    const { next } = selectCompletedForNotification([], notified, NOW);
    expect(Object.keys(next)).toHaveLength(NOTIFIED_MAX_ENTRIES);
    expect(next.gid0).toBeUndefined(); // oldest dropped
    expect(next[`gid${NOTIFIED_MAX_ENTRIES + 9}`]).toBeDefined();
  });
});
