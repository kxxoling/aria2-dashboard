/**
 * Zod validation for aria2 list options.
 *
 * Real-verified behavior: aria2 parses bt-tracker (and every other list
 * option) as comma-separated only. A newline-separated paste — the format
 * public tracker lists ship in — is silently accepted as ONE broken URI
 * and the whole list stops working, which is exactly what this validation
 * must reject before the value reaches the daemon.
 */
import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";
import {
  COMMA_LIST_ISSUE_KEY,
  validateOptionValue,
} from "@/config/optionValidation";

/** i18next-style t stub: the prefix proves the message went through the
 *  translator rather than being hardcoded English. */
const t = ((key: string) => `T:${key}`) as unknown as TFunction;

describe("validateOptionValue", () => {
  test("rejects newline-separated tracker lists with a translated message", () => {
    expect(
      validateOptionValue(
        "bt-tracker",
        "udp://tracker.opentrackr.org:1337/announce\n\nhttp://t.nyaatracker.com/announce",
        t,
      ),
    ).toBe(`T:${COMMA_LIST_ISSUE_KEY}`);
  });

  test("accepts a comma-separated mix of http/https/udp URLs", () => {
    expect(
      validateOptionValue(
        "bt-tracker",
        "udp://tracker.opentrackr.org:1337/announce,http://t.nyaatracker.com/announce,https://tr.bangumi.moe:9696/announce",
        t,
      ),
    ).toBeNull();
  });

  test("empty and whitespace-only values mean unset and pass", () => {
    expect(validateOptionValue("bt-tracker", "", t)).toBeNull();
    expect(validateOptionValue("bt-tracker", "  \n ", t)).toBeNull();
  });

  test("rejects entries with inner spaces or non-tracker schemes", () => {
    expect(
      validateOptionValue("bt-tracker", "udp://a.example/announce b", t),
    ).toBe(`T:${COMMA_LIST_ISSUE_KEY}`);
    expect(
      validateOptionValue("bt-tracker", "ftp://tracker.example/announce", t),
    ).toBe(`T:${COMMA_LIST_ISSUE_KEY}`);
  });

  test("bt-exclude-tracker carries the same rule", () => {
    expect(
      validateOptionValue(
        "bt-exclude-tracker",
        "http://bad.example/a\nhttp://b.example",
        t,
      ),
    ).toBe(`T:${COMMA_LIST_ISSUE_KEY}`);
  });

  test("keys without a rule pass anything through", () => {
    expect(validateOptionValue("dir", "/data\n/downloads", t)).toBeNull();
  });
});
