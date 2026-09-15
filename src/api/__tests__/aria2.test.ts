/**
 * Aria2 RPC 客户端测试
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/store", () => ({
  useAppStore: {
    getState: () => ({
      rpcUrl: "http://localhost:6800/jsonrpc",
      rpcSecret: "test-secret",
    }),
  },
}));

describe("Aria2Client", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  test("call 通过 HTTP 发送 JSON-RPC 请求", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          result: { downloadSpeed: "1024" },
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");
    const result = await aria2Client.getGlobalStat();

    expect(result.downloadSpeed).toBe("1024");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("http://localhost:6800/jsonrpc");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body as string);
    expect(body.method).toBe("aria2.getGlobalStat");
    expect(body.params[0]).toBe("token:test-secret");
  });

  test("call 处理 RPC 错误", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          error: { code: 1, message: "Unauthorized" },
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");
    await expect(aria2Client.getGlobalStat()).rejects.toThrow("Unauthorized");
  });

  test("addUri 发送正确的参数", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          result: "new-gid-123",
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");
    const gid = await aria2Client.addUri(["https://example.com/file.zip"]);

    expect(gid).toBe("new-gid-123");

    const body = JSON.parse(fetchSpy.mock.calls.at(-1)[1].body as string);
    expect(body.method).toBe("aria2.addUri");
    expect(body.params[1]).toEqual(["https://example.com/file.zip"]);
  });

  test("addTorrent 发送 base64 数据", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          result: "torrent-gid-456",
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");
    const gid = await aria2Client.addTorrent("base64data");

    expect(gid).toBe("torrent-gid-456");

    const body = JSON.parse(fetchSpy.mock.calls.at(-1)[1].body as string);
    expect(body.method).toBe("aria2.addTorrent");
    expect(body.params[1]).toBe("base64data");
  });

  test("remove 发送正确的 gid", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          result: "gid-789",
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");
    const result = await aria2Client.remove("gid-789");

    expect(result).toBe("gid-789");

    const body = JSON.parse(fetchSpy.mock.calls.at(-1)[1].body as string);
    expect(body.method).toBe("aria2.remove");
    expect(body.params[1]).toBe("gid-789");
  });

  test("pause 和 unpause 发送正确的 gid", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          result: "gid-abc",
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");

    await aria2Client.pause("gid-abc");
    let body = JSON.parse(fetchSpy.mock.calls.at(-1)[1].body as string);
    expect(body.method).toBe("aria2.pause");

    await aria2Client.unpause("gid-abc");
    body = JSON.parse(fetchSpy.mock.calls.at(-1)[1].body as string);
    expect(body.method).toBe("aria2.unpause");
  });

  test("pauseAll 和 unpauseAll 不需要参数", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          result: "OK",
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");

    await aria2Client.pauseAll();
    let body = JSON.parse(fetchSpy.mock.calls.at(-1)[1].body as string);
    expect(body.method).toBe("aria2.pauseAll");
    expect(body.params).toHaveLength(1);

    await aria2Client.unpauseAll();
    body = JSON.parse(fetchSpy.mock.calls.at(-1)[1].body as string);
    expect(body.method).toBe("aria2.unpauseAll");
  });

  test("getVersion 返回版本信息", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "test-id",
          result: { version: "1.36.0" },
        }),
    } as Response);

    const { aria2Client } = await import("@/api/aria2");
    const result = await aria2Client.getVersion();

    expect(result.version).toBe("1.36.0");
  });

  test("HTTP 错误抛出异常", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const { aria2Client } = await import("@/api/aria2");
    await expect(aria2Client.getGlobalStat()).rejects.toThrow(
      "HTTP Error: 500",
    );
  });

  test("网络错误抛出异常", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const { aria2Client } = await import("@/api/aria2");
    await expect(aria2Client.getGlobalStat()).rejects.toThrow("Network error");
  });
});

describe("resolveRpcUrl", () => {
  test("passes through ordinary urls", async () => {
    const { resolveRpcUrl } = await import("@/api/aria2");
    expect(resolveRpcUrl("ws://localhost:6800/jsonrpc")).toBe(
      "ws://localhost:6800/jsonrpc",
    );
  });

  test("resolves same-origin against the page location", async () => {
    const { resolveRpcUrl, SAME_ORIGIN_RPC } = await import("@/api/aria2");
    expect(resolveRpcUrl(SAME_ORIGIN_RPC)).toBe(
      `ws://${window.location.host}/jsonrpc`,
    );
  });
});
