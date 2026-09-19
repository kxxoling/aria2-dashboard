/**
 * Task display helpers tested against REAL captured magnet tasks
 * (src/mocks/fixtures.magnet.ts): the metadata phase and the BT task it
 * spawns, exactly as aria2 1.37.0 reports them.
 */

import { describe, expect, test } from "vitest";
import { resources } from "@/i18n";
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
  /** i18next-style t stub: returns the key prefixed, proving lookups go
   *  through the translator instead of a hardcoded language branch. */
  const t = ((key: string) => `T:${key}`) as never;

  test("known statuses resolve through the i18n key path", async () => {
    const { taskStatusLabel } = await import("@/lib/taskStatus");
    for (const status of [
      "active",
      "waiting",
      "paused",
      "error",
      "complete",
      "removed",
    ]) {
      expect(taskStatusLabel(status, t)).toEqual({
        label: `T:tasks.statuses.${status}`,
        known: true,
      });
    }
  });

  test("unknown statuses pass through unchanged", async () => {
    const { taskStatusLabel } = await import("@/lib/taskStatus");
    expect(taskStatusLabel("weird", t)).toEqual({
      label: "weird",
      known: false,
    });
  });

  test("every status is translated in every locale", async () => {
    const { taskStatusLabel } = await import("@/lib/taskStatus");
    const statuses = [
      "active",
      "waiting",
      "paused",
      "error",
      "complete",
      "removed",
    ];
    for (const [, bundle] of Object.entries(resources)) {
      const tree = bundle.translation as Record<string, unknown> as {
        tasks: { statuses: Record<string, string> };
      };
      for (const status of statuses) {
        // a missing entry would render the raw key path in the UI
        expect(tree.tasks.statuses[status]?.length, status).toBeGreaterThan(0);
        expect(tree.tasks.statuses[status], status).not.toBe(
          `tasks.statuses.${status}`,
        );
      }
      expect(taskStatusLabel("active", t).known).toBe(true);
    }
  });
});
