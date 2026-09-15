/**
 * formatBytes 工具函数测试
 */

import { describe, expect, test } from "vitest";
import { formatBytes } from "@/lib/utils.format";

describe("formatBytes", () => {
  test("0 字节返回 0 B", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("格式化字节", () => {
    expect(formatBytes(100)).toBe("100 B");
  });

  test("格式化 KB", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  test("格式化 MB", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
  });

  test("格式化 GB", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  test("保留指定小数位", () => {
    expect(formatBytes(1536, 1)).toBe("1.5 KB");
  });

  test("负小数位视为 0", () => {
    expect(formatBytes(1024, -1)).toBe("1 KB");
  });

  test("非数字返回 0 B", () => {
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});
