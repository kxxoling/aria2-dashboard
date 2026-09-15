/**
 * Schema integrity tests, cross-checked against REAL aria2 responses
 * captured in src/mocks/fixtures.ts (aria2 1.37.0, 141 keys).
 */

import { describe, expect, test } from "vitest";
import {
  aria2Options,
  getOptionsForSurface,
  optionCategories,
} from "@/config/aria2Options";
import { realGlobalOption } from "@/mocks/fixtures";

describe("aria2Options schema", () => {
  /**
   * Real-verified behavior: getGlobalOption omits unset credential-ish
   * options entirely (they only appear once configured). Everything else
   * in the schema must exist verbatim in the captured response.
   */
  const omittedWhenUnset = new Set([
    "log",
    "all-proxy",
    "all-proxy-user",
    "all-proxy-passwd",
    "no-proxy",
    "http-user",
    "http-passwd",
    "referer",
    "header",
    "save-cookies",
    "ftp-user",
    "ftp-passwd",
    "bt-exclude-tracker",
    "rpc-secret",
  ]);

  test("every schema key exists in the real getGlobalOption response", () => {
    const unknown = aria2Options
      .filter(
        (def) =>
          !(def.key in realGlobalOption) && !omittedWhenUnset.has(def.key),
      )
      .map((def) => def.key);
    expect(unknown).toEqual([]);
  });

  test("schema keys are unique", () => {
    const keys = aria2Options.map((def) => def.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("all en and zh labels are non-empty", () => {
    for (const def of aria2Options) {
      expect(def.label.en.length).toBeGreaterThan(0);
      expect(def.label.zh.length).toBeGreaterThan(0);
    }
  });

  test("select fields expose the value aria2 actually returned", () => {
    for (const def of aria2Options) {
      if (def.type !== "select") continue;
      const realValue = realGlobalOption[def.key];
      if (realValue !== undefined && realValue !== "") {
        expect(
          def.choices,
          `${def.key}: real value "${realValue}" missing from choices`,
        ).toContain(realValue);
      }
    }
  });

  test("every option belongs to a known category", () => {
    const ids = new Set(optionCategories.map((c) => c.id));
    for (const def of aria2Options) {
      expect(ids.has(def.category)).toBe(true);
    }
  });

  test("options marked readonly match aria2's runtime-change exclusions", () => {
    // Startup/RPC/DHT options aria2 rejects in changeGlobalOption.
    const knownReadonly = [
      "enable-rpc",
      "rpc-listen-all",
      "rpc-listen-port",
      "rpc-allow-origin-all",
      "rpc-max-request-size",
      "enable-dht",
      "enable-dht6",
      "dht-listen-port",
      "listen-port",
      "peer-id-prefix",
      "peer-agent",
      "check-certificate",
      "bt-detach-seed-only",
      "auto-save-interval",
      "disable-ipv6",
      "event-poll",
      "min-tls-version",
      "quiet",
      "console-log-level",
      "disk-cache",
    ];
    for (const key of knownReadonly) {
      const def = aria2Options.find((o) => o.key === key);
      expect(def, `missing schema entry for ${key}`).toBeDefined();
      expect(def?.readonly, `${key} should be readonly`).toBe(true);
    }
    // Options in the documented changeGlobalOption whitelist must be writable.
    const changeable = [
      "dir",
      "max-concurrent-downloads",
      "max-overall-download-limit",
      "max-overall-upload-limit",
      "download-result",
      "bt-max-open-files",
      "log",
      "log-level",
    ];
    for (const key of changeable) {
      const def = aria2Options.find((o) => o.key === key);
      expect(def?.readonly, `${key} must NOT be readonly`).toBeFalsy();
    }
  });

  test("new-task and task-option surfaces reference existing definitions", () => {
    for (const surface of ["new-task", "task-option"] as const) {
      const defs = getOptionsForSurface(surface);
      expect(defs.length).toBeGreaterThan(10);
      expect(
        aria2Options.filter((o) => o.key === "dir")?.length,
      ).toBeGreaterThan(0);
    }
  });
});
