/**
 * i18n translation tests — every supported language is checked against the
 * English source keys, so a new key cannot ship half-translated.
 */

import { describe, expect, test } from "vitest";
import { resources } from "@/i18n";

const en = resources.en.translation;
const enRecord: Record<string, string> = en;

describe("i18n translation resources", () => {
  for (const [lang, bundle] of Object.entries(resources)) {
    test(`${lang}: contains exactly the English key set`, () => {
      expect(Object.keys(bundle.translation).sort()).toEqual(
        Object.keys(en).sort(),
      );
    });

    test(`${lang}: no empty values`, () => {
      for (const [key, value] of Object.entries(bundle.translation)) {
        expect(value.length, `${lang} ${key}`).toBeGreaterThan(0);
      }
    });

    test(`${lang}: interpolation placeholders preserved`, () => {
      const placeholders = (s: string) =>
        (s.match(/\{\{?\w+\}\}?/g) ?? []).sort().join(",");
      for (const [key, value] of Object.entries(bundle.translation)) {
        expect(placeholders(value), `${lang} ${key}`).toBe(
          placeholders(enRecord[key]),
        );
      }
    });
  }
});
