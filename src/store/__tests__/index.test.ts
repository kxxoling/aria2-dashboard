/**
 * Zustand store 测试
 */

import { describe, expect, test } from "vitest";
import { useAppStore } from "@/store";

describe("useAppStore", () => {
  test("store 实例存在", () => {
    expect(useAppStore).toBeDefined();
    expect(useAppStore.getState).toBeDefined();
  });

  test("初始状态包含 rpcUrl", () => {
    const state = useAppStore.getState();
    expect(state.rpcUrl).toBeDefined();
    expect(typeof state.rpcUrl).toBe("string");
  });
});
