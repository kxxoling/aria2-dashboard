import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ja } from "./ja";
import { ko } from "./ko";
import { pt } from "./pt";
import { ru } from "./ru";
import { zh } from "./zh";
import { zhTW } from "./zh-TW";

export const resources = {
  en: { translation: en.translation },
  zh: { translation: zh.translation },
  "zh-TW": { translation: zhTW.translation },
  ja: { translation: ja.translation },
  ko: { translation: ko.translation },
  es: { translation: es.translation },
  pt: { translation: pt.translation },
  ru: { translation: ru.translation },
  fr: { translation: fr.translation },
};

export const SUPPORTED_LANGUAGES = [
  { id: "en", nativeName: "English" },
  { id: "zh", nativeName: "简体中文" },
  { id: "zh-TW", nativeName: "繁體中文" },
  { id: "ja", nativeName: "日本語" },
  { id: "ko", nativeName: "한국어" },
  { id: "es", nativeName: "Español" },
  { id: "pt", nativeName: "Português" },
  { id: "ru", nativeName: "Русский" },
  { id: "fr", nativeName: "Français" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["id"];

export const STORAGE_KEY = "aria2-dashboard-storage";

/** Map any BCP-47 tag onto a supported language id. */
export function normalizeLanguage(tag: string | undefined): SupportedLanguage {
  switch (true) {
    case /^zh-(TW|HK|MO|Hant)/i.test(tag ?? ""):
      return "zh-TW";
    case /^zh/i.test(tag ?? ""):
      return "zh";
    case /^ja/i.test(tag ?? ""):
      return "ja";
    case /^ko/i.test(tag ?? ""):
      return "ko";
    case /^es/i.test(tag ?? ""):
      return "es";
    case /^pt/i.test(tag ?? ""):
      return "pt";
    case /^ru/i.test(tag ?? ""):
      return "ru";
    case /^fr/i.test(tag ?? ""):
      return "fr";
    case /^en/i.test(tag ?? ""):
      return "en";
    default:
      return "en";
  }
}

/** Resolves the initial language: stored preference, else system language. */
export function initialLanguage(
  getStored: (key: string) => string | null = (k) => localStorage.getItem(k),
  systemLanguage: string | undefined = navigator?.language,
): SupportedLanguage {
  try {
    const raw = getStored(STORAGE_KEY);
    const pref = raw
      ? (JSON.parse(raw).state?.settings?.language as string | undefined)
      : undefined;
    if (pref && pref !== "system") {
      const normalized = normalizeLanguage(pref);
      if (normalized !== "en" || pref.startsWith("en")) return normalized;
    }
    if (pref === "system") {
      return normalizeLanguage(systemLanguage);
    }
  } catch {
    /* fall through */
  }
  return normalizeLanguage(systemLanguage);
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
