/**
 * Zod validation for aria2 option values, driven by the schema registry.
 *
 * aria2 parses list options (bt-tracker, bt-exclude-tracker) as
 * comma-separated only. A newline-separated paste — the format public
 * tracker lists ship in — is silently accepted and stored as ONE broken
 * URI, so the whole list stops working without any error anywhere.
 * These schemas reject such input before it reaches the daemon.
 *
 * Message factory pattern: the schema takes the i18next `t` function so
 * issue messages come out already translated for the active locale.
 */
import type { TFunction } from "i18next";
import { z } from "zod";
import { findOptionDef } from "./aria2Options";

export const COMMA_LIST_ISSUE_KEY =
  "Only comma-separated tracker URLs are supported (no line breaks or spaces)";

/** Comma-separated http(s)/udp URLs; empty means "unset" and is allowed. */
export function commaSeparatedUrisSchema(t: TFunction) {
  return z.string().superRefine((value, ctx) => {
    const trimmed = value.trim();
    if (trimmed === "") return;
    for (const entry of trimmed.split(",")) {
      if (/\s/.test(entry) || !/^(https?|udp):\/\//i.test(entry)) {
        ctx.addIssue({ code: "custom", message: t(COMMA_LIST_ISSUE_KEY) });
        return;
      }
    }
  });
}

/** Schema for an option key, or undefined when the key has no rule. */
export function optionValueSchema(key: string, t: TFunction) {
  const def = findOptionDef(key);
  if (def?.listFormat === "comma") return commaSeparatedUrisSchema(t);
  return undefined;
}

/**
 * Validate one option value. Returns the translated error message, or
 * null when the value is valid / the key has no rule.
 */
export function validateOptionValue(
  key: string,
  value: string,
  t: TFunction,
): string | null {
  const schema = optionValueSchema(key, t);
  if (!schema) return null;
  const result = schema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}
