import { describe, expect, test } from "vitest";
import {
  describeTaskUrl,
  isInterceptableUrl,
  isTaskUrl,
  truncate,
} from "@/lib/downloadUrl";
import { resolveLanguage, translate } from "@/lib/locale";

describe("isInterceptableUrl (click interception)", () => {
  test("claims magnet URIs", () => {
    expect(isInterceptableUrl("magnet:?xt=urn:btih:ABC123&dn=ubuntu.iso")).toBe(
      true,
    );
  });

  test("claims http(s) links with a downloadable extension", () => {
    expect(isInterceptableUrl("https://releases.lan/ubuntu-22.04.iso")).toBe(
      true,
    );
    expect(
      isInterceptableUrl("http://host.lan/files/Show.S01E01.mkv?x=1"),
    ).toBe(true);
    expect(isInterceptableUrl("https://host.lan/arch/pkg.tar.zst")).toBe(true);
    expect(isInterceptableUrl("https://host.lan/arch/pkg.ZIP")).toBe(true);
  });

  test("ignores regular pages and other schemes", () => {
    expect(isInterceptableUrl("https://host.lan/")).toBe(false);
    expect(isInterceptableUrl("https://host.lan/downloads")).toBe(false);
    expect(isInterceptableUrl("https://host.lan/page.php")).toBe(false);
    expect(isInterceptableUrl("ftp://host.lan/file.zip")).toBe(false);
    expect(isInterceptableUrl("chrome://extensions")).toBe(false);
    expect(isInterceptableUrl("not a url")).toBe(false);
    expect(isInterceptableUrl("")).toBe(false);
  });
});

describe("isTaskUrl (context menu)", () => {
  test("accepts any magnet/http(s)/ftp link", () => {
    expect(isTaskUrl("magnet:?xt=urn:btih:ABC123")).toBe(true);
    expect(isTaskUrl("https://host.lan/")).toBe(true);
    expect(isTaskUrl("ftp://host.lan/file.zip")).toBe(true);
  });

  test("rejects non-downloadable schemes and garbage", () => {
    expect(isTaskUrl("javascript:void(0)")).toBe(false);
    expect(isTaskUrl("file:///tmp/x.zip")).toBe(false);
    expect(isTaskUrl("")).toBe(false);
  });
});

describe("describeTaskUrl", () => {
  test("prefers the magnet display name", () => {
    expect(describeTaskUrl("magnet:?xt=urn:btih:ABC&dn=Ubuntu%2022.04")).toBe(
      "Ubuntu 22.04",
    );
  });

  test("falls back to a placeholder for anonymous magnets", () => {
    expect(describeTaskUrl("magnet:?xt=urn:btih:ABC")).toBe("magnet:…");
  });

  test("uses the file name of http(s) links", () => {
    expect(describeTaskUrl("https://host.lan/dir/movie%20night.mkv?t=2")).toBe(
      "movie night.mkv",
    );
    expect(describeTaskUrl("https://host.lan/")).toBe("host.lan");
  });
});

describe("truncate", () => {
  test("trims and cuts with an ellipsis", () => {
    expect(truncate("  ok ", 10)).toBe("ok");
    expect(truncate("abcdefgh", 4)).toBe("abc…");
    expect(truncate("abcd", 4)).toBe("abcd");
  });
});

describe("resolveLanguage", () => {
  test("maps system BCP-47 tags to supported bundles", () => {
    expect(resolveLanguage("system", "zh-CN")).toBe("zh");
    expect(resolveLanguage("system", "zh-TW")).toBe("zh-TW");
    expect(resolveLanguage("system", "en-US")).toBe("en");
    expect(resolveLanguage("system", "pt-BR")).toBe("pt");
    expect(resolveLanguage("system", "ko-KR")).toBe("ko");
  });

  test("honors an explicit preference over the UI language", () => {
    expect(resolveLanguage("ja", "en-US")).toBe("ja");
    expect(resolveLanguage("fr", "en-US")).toBe("fr");
  });

  test("falls back to English for unknown tags", () => {
    expect(resolveLanguage("xx-YY", "en-US")).toBe("en");
    expect(resolveLanguage("system", "xx-YY")).toBe("en");
  });
});

describe("translate", () => {
  test("looks keys up per language", () => {
    expect(translate("zh", "Task Added")).toBe("任务已添加");
    expect(translate("ja", "Task Added")).toBe("タスクを追加しました");
    expect(translate("en", "Task Added")).toBe("Task Added");
  });

  test("falls back to the key when missing everywhere", () => {
    expect(translate("zh", "__missing__")).toBe("__missing__");
  });
});
