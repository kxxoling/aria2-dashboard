import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { fr } from "@/i18n/fr";
import { ja } from "@/i18n/ja";
import { ko } from "@/i18n/ko";
import { pt } from "@/i18n/pt";
import { ru } from "@/i18n/ru";
import { zh } from "@/i18n/zh";
import { zhTW } from "@/i18n/zh-TW";

/**
 * Lean locale lookup for non-React surfaces (the extension background
 * service worker). Deliberately avoids importing the app i18n entry, whose
 * module-scope init expects a browser page environment.
 */

type Bundle = Record<string, unknown>;

const BUNDLES: Record<string, Bundle> = {
  en: en.translation,
  zh: zh.translation,
  "zh-TW": zhTW.translation,
  ja: ja.translation,
  ko: ko.translation,
  es: es.translation,
  pt: pt.translation,
  fr: fr.translation,
  ru: ru.translation,
};

/**
 * Maps the stored language preference (or a BCP-47 UI language when the
 * preference is "system") to one of the supported bundle keys.
 */
export function resolveLanguage(
  preference: string | undefined,
  systemLanguage: string,
): string {
  const target =
    preference && preference !== "system" ? preference : systemLanguage;
  const normalized = normalizeLanguage(target);
  return normalized in BUNDLES ? normalized : "en";
}

function normalizeLanguage(tag: string): string {
  const trimmed = (tag ?? "").trim();
  if (!trimmed) return "en";
  if (/^zh/i.test(trimmed)) {
    return /(-tw|-hk|-hant|^zh-tw|^zh-hk|^zh-hant)/i.test(trimmed)
      ? "zh-TW"
      : "zh";
  }
  const base = trimmed.split("-")[0].toLowerCase();
  return base;
}

/** Looks a key up in the language's bundle, falling back to English. */
export function translate(language: string, key: string): string {
  const value = BUNDLES[language]?.[key] ?? BUNDLES.en[key];
  return typeof value === "string" ? value : key;
}
