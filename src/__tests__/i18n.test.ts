/**
 * i18n translation tests — every supported language is checked against the
 * English source keys, so a new key cannot ship half-translated.
 *
 * Translation bundles mix flat keys (English source strings) with nested
 * groups (e.g. the aria2 option registry under options.*). Bundles are
 * flattened to dot paths before comparing so both shapes are checked.
 */

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
