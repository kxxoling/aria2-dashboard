import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, expect, test } from "@playwright/test";

/**
 * Loads the BUILT extension into a real Chromium profile and exercises the
 * download-link interception: a magnet click must reach the backend as an
 * aria2.addUri call and surface a native success/failure notification —
 * all without the popup being open. Requires `bun run build:ext` first
 * (run via `bun run test:ext`); skipped otherwise.
 */

// Fixed by the "key" field in package.json → manifest.json
const EXTENSION_ID = "mnjincfgmahcekennhacoppkoglpnfnh";
const EXTENSION_PATH = path.resolve("build/chrome-mv3-prod");

test.skip(
  !existsSync(path.join(EXTENSION_PATH, "manifest.json")),
  "extension not built — run `bun run test:ext`",
);

type RpcCall = { method: string; params: unknown };

const TASK_PAGE_HTML = `<!doctype html><html><body>
  <a id="magnet" href="magnet:?xt=urn:btih:TESTHASH&dn=e2e-magnet-test">magnet</a>
  <a id="file" href="/files/e2e-sample.zip">zip</a>
  <a id="page" href="/just/a/page">page</a>
</body></html>`;

/** Minimal aria2 JSON-RPC stand-in that records every call it receives. */
async function startMockAria2(rpcCalls: RpcCall[]) {
  const server: Server = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/jsonrpc") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const rpc = JSON.parse(body);
        rpcCalls.push({ method: rpc.method, params: rpc.params });
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: rpc.id,
            result: rpc.method === "aria2.addUri" ? "gid-e2e-1" : {},
          }),
        );
      });
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(TASK_PAGE_HTML);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  return {
    server,
    rpcUrl: `http://127.0.0.1:${port}/jsonrpc`,
    pageUrl: `http://127.0.0.1:${port}/page`,
  };
}

test.describe("download link interception", () => {
  test("magnet click adds a task with a success notification", async () => {
    const rpcCalls: RpcCall[] = [];
    const { server, rpcUrl, pageUrl } = await startMockAria2(rpcCalls);
    const profileDir = await mkdtemp(path.join(tmpdir(), "ext-tasks-"));
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 800, height: 600 },
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      // Point the extension at the mock backend, then keep a popup page open
      // as an extension context for reading chrome.notifications.
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
      await popup.evaluate((configUrl) => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              "aria2-dashboard-storage": JSON.stringify({
                state: { rpcUrl: configUrl },
                version: 0,
              }),
            },
            () => resolve(),
          );
        });
      }, rpcUrl);

      const site = await context.newPage();
      await site.goto(pageUrl);
      await site.click("#magnet");

      // The magnet URL must arrive as an aria2.addUri call…
      await expect
        .poll(
          () =>
            rpcCalls.some(
              (call) =>
                call.method === "aria2.addUri" &&
                JSON.stringify(call.params).includes(
                  "magnet:?xt=urn:btih:TESTHASH",
                ),
            ),
          { timeout: 10_000 },
        )
        .toBe(true);

      // …the browser default (external protocol dialog) must be suppressed…
      expect(new URL(site.url()).pathname).toBe("/page");

      // …and a native success notification must appear (getAll exposes
      // notification ids only, not their content).
      await expect
        .poll(
          async () =>
            Object.keys(
              await popup.evaluate(() => chrome.notifications.getAll()),
            ).length,
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0);
    } finally {
      await context.close();
      await rm(profileDir, { recursive: true, force: true });
      server.close();
    }
  });

  test("download-link click with an unreachable backend notifies failure", async () => {
    const rpcCalls: RpcCall[] = [];
    const { server, pageUrl } = await startMockAria2(rpcCalls);
    const profileDir = await mkdtemp(path.join(tmpdir(), "ext-tasks-"));
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 800, height: 600 },
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
      // Port 9 (discard) refuses immediately — the backend is "not running".
      await popup.evaluate(() => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              "aria2-dashboard-storage": JSON.stringify({
                state: { rpcUrl: "http://127.0.0.1:9/jsonrpc" },
                version: 0,
              }),
            },
            () => resolve(),
          );
        });
      });

      const site = await context.newPage();
      await site.goto(pageUrl);
      await site.click("#file"); // .zip → intercepted

      await expect
        .poll(
          async () =>
            Object.keys(
              await popup.evaluate(() => chrome.notifications.getAll()),
            ).length,
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0);

      // Nothing reached the (dead) backend and no download was started.
      expect(rpcCalls.some((call) => call.method === "aria2.addUri")).toBe(
        false,
      );
      expect(new URL(site.url()).pathname).toBe("/page");
    } finally {
      await context.close();
      await rm(profileDir, { recursive: true, force: true });
      server.close();
    }
  });
});
