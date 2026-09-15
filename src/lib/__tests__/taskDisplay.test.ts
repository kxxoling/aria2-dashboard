/**
 * Task display helpers tested against REAL captured magnet tasks
 * (src/mocks/fixtures.magnet.ts): the metadata phase and the BT task it
 * spawns, exactly as aria2 1.37.0 reports them.
 */

import { describe, expect, test } from "vitest";
import {
  isMetadataTask,
  metadataTaskLabel,
  taskDisplayName,
} from "@/lib/taskDisplay";
import { realBtTask, realHttpTask } from "@/mocks/fixtures";
import {
  realBtFromMagnetTask,
  realMagnetMetadataTask,
} from "@/mocks/fixtures.magnet";

describe("isMetadataTask", () => {
  test("recognizes the magnet metadata phase by its literal [METADATA] path", () => {
    expect(isMetadataTask(realMagnetMetadataTask)).toBe(true);
  });

  test("regular BT and HTTP tasks are not metadata tasks", () => {
    expect(isMetadataTask(realBtFromMagnetTask)).toBe(false);
    expect(isMetadataTask(realBtTask)).toBe(false);
    expect(isMetadataTask(realHttpTask)).toBe(false);
  });
});

describe("taskDisplayName", () => {
  test("metadata task falls back to its info hash", () => {
    expect(taskDisplayName(realMagnetMetadataTask, "fallback")).toBe(
      `magnet:${realMagnetMetadataTask.infoHash?.slice(0, 12)}`,
    );
  });

  test("BT task carries the torrent name from bittorrent.info.name", () => {
    expect(taskDisplayName(realBtFromMagnetTask, "fallback")).toContain(
      "Tenmaku",
    );
  });

  test("regular tasks use the file name", () => {
    expect(taskDisplayName(realHttpTask, "fallback")).toBe("Release");
  });
});

describe("metadataTaskLabel", () => {
  test("short info-hash label distinguishes multiple magnets", () => {
    expect(metadataTaskLabel(realMagnetMetadataTask)).toBe(
      realMagnetMetadataTask.infoHash?.slice(0, 12),
    );
  });
});

describe("taskStatusLabel", () => {
  test("translates every aria2 status into both languages", async () => {
    const { taskStatusLabel } = await import("@/lib/taskStatus");
    for (const status of [
      "active",
      "waiting",
      "paused",
      "error",
      "complete",
      "removed",
    ]) {
      expect(taskStatusLabel(status, "en").known).toBe(true);
      expect(taskStatusLabel(status, "en-US").label.length).toBeGreaterThan(0);
      expect(taskStatusLabel(status, "zh-CN").label).not.toBe(status);
    }
    expect(taskStatusLabel("active", "en").label).toBe("Active");
    expect(taskStatusLabel("active", "zh").label).toBe("下载中");
    expect(taskStatusLabel("complete", "zh").label).toBe("已完成");
  });

  test("unknown statuses pass through unchanged", async () => {
    const { taskStatusLabel } = await import("@/lib/taskStatus");
    expect(taskStatusLabel("weird", "zh")).toEqual({
      label: "weird",
      known: false,
    });
  });
});
