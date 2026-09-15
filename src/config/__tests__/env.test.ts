/**
 * env 配置测试
 */

import { describe, expect, test } from "vitest";

describe("env 配置", () => {
  test("默认 RPC URL", async () => {
    const { env } = await import("@/config/env");
    expect(env.ARIA2_RPC_URL).toBe("ws://localhost:6800/jsonrpc");
  });

  test("默认 RPC Secret 为空", async () => {
    const { env } = await import("@/config/env");
    expect(env.ARIA2_RPC_SECRET).toBe("");
  });

  test("Mock 模式默认关闭", async () => {
    const { env } = await import("@/config/env");
    expect(env.USE_MOCK).toBe(false);
  });
});
