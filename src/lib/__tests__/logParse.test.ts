/**
 * Log parsing tests against REAL captured aria2 1.37.0 log lines
 * (debug-level capture in src/mocks/fixtures.logs.ts).
 */

import { describe, expect, test } from "vitest";
import {
  filterLogLines,
  type LogLevel,
  parseLog,
  parseLogLine,
} from "@/lib/logParse";
import { realAria2Log } from "@/mocks/fixtures.logs";

describe("parseLogLine", () => {
  test("parses a real NOTICE line with source and message", () => {
    const line = parseLogLine(
      "2026-09-15 08:15:38.980268 [NOTICE] [RequestGroup.cc:1214] Download complete: /data/Release",
    );
    expect(line.time).toBe("2026-09-15 08:15:38.980268");
    expect(line.level).toBe("NOTICE");
    expect(line.source).toBe("RequestGroup.cc:1214");
    expect(line.message).toBe("Download complete: /data/Release");
  });

  test("falls back gracefully on non-log text", () => {
    const line = parseLogLine("some random output");
    expect(line.level).toBeUndefined();
    expect(line.message).toBe("some random output");
  });
});

describe("parseLog (real capture)", () => {
  const lines = parseLog(realAria2Log);

  test("most captured lines carry a level; continuation lines still parse", () => {
    // Real logs contain multi-line banners and HTTP-trace continuations
    // without a leading timestamp — they must parse, just without a level.
    expect(lines.length).toBeGreaterThan(200);
    const withLevel = lines.filter((l) => l.level).length;
    expect(withLevel / lines.length).toBeGreaterThan(0.9);
    expect(lines.every((l) => l.message.length > 0)).toBe(true);
  });

  test("the capture contains DEBUG, INFO and NOTICE levels", () => {
    const levels = new Set(lines.map((l) => l.level));
    expect(levels.has("DEBUG")).toBe(true);
    expect(levels.has("INFO")).toBe(true);
    expect(levels.has("NOTICE")).toBe(true);
  });
});

describe("filterLogLines", () => {
  const lines = parseLog(realAria2Log);
  const all = new Set<LogLevel>(["DEBUG", "INFO", "NOTICE", "WARN", "ERROR"]);

  test("level filter excludes DEBUG", () => {
    const withoutDebug = new Set(all);
    withoutDebug.delete("DEBUG");
    const filtered = filterLogLines(lines, "", withoutDebug);
    expect(filtered.every((l) => l.level !== "DEBUG")).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  test("query matches case-insensitively across the raw line", () => {
    const filtered = filterLogLines(lines, "download complete", all);
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every((l) => l.raw.toLowerCase().includes("download complete")),
    ).toBe(true);
  });
});
