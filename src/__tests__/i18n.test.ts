/**
 * i18n translation tests — every supported language is checked against the
 * English source keys, so a new key cannot ship half-translated.
 *
 * Translation bundles mix flat keys (English source strings) with nested
 * groups (e.g. the aria2 option registry under options.*). Bundles are
 * flattened to dot paths before comparing so both shapes are checked.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { resources } from "@/i18n";

type Bundle = Record<string, unknown>;

/** Flatten a mixed flat/nested bundle into dot-separated string keys. */
function flatten(record: Bundle, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
    } else {
      Object.assign(out, flatten(value as Bundle, path));
    }
  }
  return out;
}

const enRecord = flatten(resources.en.translation as Bundle);

describe("i18n translation resources", () => {
  for (const [lang, bundle] of Object.entries(resources)) {
    const record = flatten(bundle.translation as Bundle);

    test(`${lang}: contains exactly the English key set`, () => {
      expect(Object.keys(record).sort()).toEqual(Object.keys(enRecord).sort());
    });

    test(`${lang}: no empty values`, () => {
      for (const [key, value] of Object.entries(record)) {
        expect(value.length, `${lang} ${key}`).toBeGreaterThan(0);
      }
    });

    test(`${lang}: interpolation placeholders preserved`, () => {
      const placeholders = (s: string) =>
        (s.match(/\{\{?\w+\}\}?/g) ?? []).sort().join(",");
      for (const [key, value] of Object.entries(record)) {
        expect(placeholders(value), `${lang} ${key}`).toBe(
          placeholders(enRecord[key]),
        );
      }
    });
  }
});

describe("static t() key coverage", () => {
  /**
   * Every literal t("...") key in the source must exist in the English
   * bundle. A key that never lands there renders as its own English text in
   * EVERY language (silent fallback) — exactly how the logs-unavailable
   * paragraph shipped untranslated once. The per-locale parity tests above
   * cannot catch this, because no locale has the key at all.
   */
  test("every static key used in components exists in the en bundle", () => {
    const sourceFiles: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (/\.tsx?$/.test(path)) {
          sourceFiles.push(path);
        }
      }
    };
    walk("src");
    const scanned = sourceFiles.filter(
      (f) =>
        !f.includes(join("src", "i18n")) &&
        !f.includes("__tests__") &&
        !/\.test\./.test(f),
    );

    const used = new Map<string, string>();
    for (const file of scanned) {
      for (const match of readFileSync(file, "utf8").matchAll(
        /\bt\(\s*(["'])((?:[^\\]|\\.)*?)\1/g,
      )) {
        const key = match[2];
        if (key && !key.includes("${")) used.set(key, file);
      }
    }
    expect(used.size).toBeGreaterThan(50); // sanity: the scan found real usage

    const missing = [...used.entries()].filter(([key]) => !enRecord[key]);
    expect(missing, "keys used in code but missing from en.ts").toEqual([]);
  });
});
