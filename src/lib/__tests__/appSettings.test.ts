/**
 * Tests for the AriaNg-parity app settings: store persistence, language
 * resolution, tab-title template and schema annotations.
 */

import { beforeEach, describe, expect, test } from "vitest";
import { aria2Options } from "@/config/aria2Options";
import { initialLanguage } from "@/i18n";
import { formatTitleSpeed } from "@/lib/useTitleSpeed";
import { defaultSettings, useAppStore } from "@/store";

describe("app settings store", () => {
  beforeEach(() => {
    useAppStore.getState().setSettings(defaultSettings);
  });

  test("settings default values", () => {
    const s = useAppStore.getState().settings;
    expect(s.language).toBe("system");
    expect(s.titleSpeedEnabled).toBe(true);
    expect(s.confirmTaskRemoval).toBe(true);
    expect(s.globalStatInterval).toBe(1000);
    expect(s.taskListInterval).toBe(2000);
    expect(s.wsReconnectInterval).toBe(5000);
  });

  test("setSettings patches without clobbering siblings", () => {
    useAppStore.getState().setSettings({ language: "zh" });
    const s = useAppStore.getState().settings;
    expect(s.language).toBe("zh");
    expect(s.titleSpeedEnabled).toBe(true);
  });

  test("task sorting persists per tab", () => {
    useAppStore
      .getState()
      .setTaskSorting("active", [{ id: "totalLength", desc: true }]);
    expect(useAppStore.getState().taskSorting.active).toEqual([
      { id: "totalLength", desc: true },
    ]);
    expect(useAppStore.getState().taskSorting.stopped).toBeUndefined();
  });
});

describe("initialLanguage", () => {
  test("stored preference wins over system", () => {
    const stored = (lang: string) =>
      JSON.stringify({ state: { settings: { language: lang } } });
    expect(initialLanguage(() => stored("zh"), "en-US")).toBe("zh");
    expect(initialLanguage(() => stored("en"), "zh-CN")).toBe("en");
    expect(initialLanguage(() => stored("ja"), "en-US")).toBe("ja");
    expect(initialLanguage(() => stored("zh-TW"), "en-US")).toBe("zh-TW");
  });

  test("system preference maps every supported language family", () => {
    expect(initialLanguage(() => null, "zh-CN")).toBe("zh");
    expect(initialLanguage(() => null, "zh-TW")).toBe("zh-TW");
    expect(initialLanguage(() => null, "zh-HK")).toBe("zh-TW");
    expect(initialLanguage(() => null, "ja-JP")).toBe("ja");
    expect(initialLanguage(() => null, "ko-KR")).toBe("ko");
    expect(initialLanguage(() => null, "es-AR")).toBe("es");
    expect(initialLanguage(() => null, "pt-BR")).toBe("pt");
    expect(initialLanguage(() => null, "ru-RU")).toBe("ru");
    expect(initialLanguage(() => null, "fr-FR")).toBe("fr");
    expect(initialLanguage(() => null, "en-US")).toBe("en");
  });

  test("stored system preference follows the OS language", () => {
    const stored = JSON.stringify({
      state: { settings: { language: "system" } },
    });
    expect(initialLanguage(() => stored, "ja-JP")).toBe("ja");
  });

  test("garbage storage and unknown system tags fall back safely", () => {
    expect(initialLanguage(() => "{not json", "en-US")).toBe("en");
    expect(initialLanguage(() => null, undefined)).toBe("en");
    expect(initialLanguage(() => null, "xx-YY")).toBe("en");
  });
});

describe("formatTitleSpeed", () => {
  test("formats both rates with arrows", () => {
    expect(formatTitleSpeed(1258291, 20480)).toBe(
      "↓ 1.2 MB/s ↑ 20 KB/s - Aria2 Dashboard",
    );
  });

  test("zero rates render as 0 B", () => {
    expect(formatTitleSpeed(0, 0)).toBe("↓ 0 B/s ↑ 0 B/s - Aria2 Dashboard");
  });
});

describe("aria2Options schema annotations", () => {
  test("rpc-secret is read-only (not in the runtime change whitelist)", () => {
    const secret = aria2Options.find((o) => o.key === "rpc-secret");
    expect(secret?.readonly).toBe(true);
  });

  test("sizeFormat is only used on string fields", () => {
    const sized = aria2Options.filter((o) => o.sizeFormat);
    expect(sized.length).toBeGreaterThanOrEqual(5);
    expect(sized.every((o) => o.type === "string")).toBe(true);
    // The real daemon reports disk-cache as raw bytes — keep it covered.
    expect(sized.map((o) => o.key)).toContain("disk-cache");
  });
});

describe("color schemes", () => {
  test("scheme ids are unique and non-empty", async () => {
    const { colorSchemes } = await import("@/lib/colorSchemes");
    const ids = colorSchemes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(ids).toContain("solarized");
    expect(ids).toContain("dracula");
    expect(colorSchemes.every((s) => s.label.length > 0)).toBe(true);
  });

  test("store persists the scheme and it round-trips", () => {
    useAppStore.getState().setColorScheme("tokyo-night");
    expect(useAppStore.getState().colorScheme).toBe("tokyo-night");
    useAppStore.getState().setColorScheme("default");
  });
});
