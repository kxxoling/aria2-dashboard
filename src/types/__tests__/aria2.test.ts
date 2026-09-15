/**
 * Aria2 类型定义测试
 */

import { describe, expect, test } from "vitest";
import type { Aria2File, Aria2GlobalStat, Aria2Task } from "@/types/aria2";

describe("Aria2Task 类型", () => {
  test("创建完整的 active task", () => {
    const task: Aria2Task = {
      gid: "abc123",
      status: "active",
      totalLength: "1048576",
      completedLength: "524288",
      uploadLength: "0",
      downloadSpeed: "1024000",
      uploadSpeed: "0",
      dir: "/downloads",
      files: [],
    };
    expect(task.status).toBe("active");
    expect(task.gid).toBe("abc123");
  });

  test("创建带文件的 task", () => {
    const file: Aria2File = {
      index: "1",
      path: "/downloads/test.iso",
      length: "1048576",
      completedLength: "524288",
      selected: "true",
      uris: [{ status: "used", uri: "https://example.com/test.iso" }],
    };
    const task: Aria2Task = {
      gid: "def456",
      status: "complete",
      totalLength: "1048576",
      completedLength: "1048576",
      uploadLength: "0",
      downloadSpeed: "0",
      uploadSpeed: "0",
      dir: "/downloads",
      files: [file],
    };
    expect(task.files).toHaveLength(1);
    expect(task.files?.[0].path).toBe("/downloads/test.iso");
  });

  test("所有状态类型", () => {
    const statuses: Aria2Task["status"][] = [
      "active",
      "waiting",
      "paused",
      "error",
      "complete",
      "removed",
    ];
    expect(statuses).toHaveLength(6);
  });
});

describe("Aria2GlobalStat 类型", () => {
  test("创建全局统计", () => {
    const stat: Aria2GlobalStat = {
      downloadSpeed: "1024000",
      uploadSpeed: "256000",
      numActive: "3",
      numWaiting: "1",
      numStopped: "5",
      numStoppedTotal: "10",
    };
    expect(Number(stat.downloadSpeed)).toBe(1024000);
    expect(Number(stat.numActive)).toBe(3);
  });
});
