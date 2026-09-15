/**
 * useAria2Connection hook tests
 */

import { describe, expect, test } from "vitest";
import { buildRpcUrl, parseRpcUrl } from "@/hooks/useAria2Connection";

describe("parseRpcUrl", () => {
  test("parses ws:// URL", () => {
    const result = parseRpcUrl("ws://localhost:6800/jsonrpc");
    expect(result).toEqual({
      type: "ws",
      ssl: false,
      host: "localhost:6800/jsonrpc",
    });
  });

  test("parses wss:// URL", () => {
    const result = parseRpcUrl("wss://example.com/jsonrpc");
    expect(result).toEqual({
      type: "ws",
      ssl: true,
      host: "example.com/jsonrpc",
    });
  });

  test("parses http:// URL", () => {
    const result = parseRpcUrl("http://localhost:6800/jsonrpc");
    expect(result).toEqual({
      type: "http",
      ssl: false,
      host: "localhost:6800/jsonrpc",
    });
  });

  test("parses https:// URL", () => {
    const result = parseRpcUrl("https://example.com/jsonrpc");
    expect(result).toEqual({
      type: "http",
      ssl: true,
      host: "example.com/jsonrpc",
    });
  });

  test("defaults to ws for empty string", () => {
    const result = parseRpcUrl("");
    expect(result).toEqual({
      type: "ws",
      ssl: false,
      host: "",
    });
  });
});

describe("buildRpcUrl", () => {
  test("builds ws:// URL", () => {
    expect(buildRpcUrl("ws", false, "localhost:6800/jsonrpc")).toBe(
      "ws://localhost:6800/jsonrpc",
    );
  });

  test("builds wss:// URL", () => {
    expect(buildRpcUrl("ws", true, "example.com/jsonrpc")).toBe(
      "wss://example.com/jsonrpc",
    );
  });

  test("builds http:// URL", () => {
    expect(buildRpcUrl("http", false, "localhost:6800/jsonrpc")).toBe(
      "http://localhost:6800/jsonrpc",
    );
  });

  test("builds https:// URL", () => {
    expect(buildRpcUrl("http", true, "example.com/jsonrpc")).toBe(
      "https://example.com/jsonrpc",
    );
  });
});
