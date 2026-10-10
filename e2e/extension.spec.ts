import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, expect, test } from "@playwright/test";

/**
 * Loads the BUILT extension into a real Chromium profile and exercises the
 * popup — the closest thing to "does it actually work when installed".
 * Requires `bun run build:ext` first (run via `bun run test:ext`); skipped
 * otherwise so the web e2e suite can run standalone.
 */

// Fixed by the "key" field in package.json → manifest.json
const EXTENSION_ID = "mnjincfgmahcekennhacoppkoglpnfnh";
const EXTENSION_PATH = path.resolve("build/chrome-mv3-prod");

test.skip(
  !existsSync(path.join(EXTENSION_PATH, "manifest.json")),
  "extension not built — run `bun run test:ext`",
);

test.describe("chrome extension popup", () => {
  test("loads, renders and navigates via hash routing", async () => {
    const profileDir = await mkdtemp(path.join(tmpdir(), "ext-test-"));
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 800, height: 600 },
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
      await page.waitForTimeout(1500);

      // Popup renders the dashboard shell
      await expect(page.getByText("Aria2 Dashboard").first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Tasks", exact: true }),
      ).toBeVisible();

      // Hash deep link goes straight to a page (no server round-trip);
      // Interface opens first, so click into the connection tab
      await page.goto(
        `chrome-extension://${EXTENSION_ID}/popup.html#/settings`,
      );
      await page.waitForTimeout(800);
      await page.getByRole("tab", { name: "Connection Settings" }).click();
      await expect(page.getByText("Connection Protocol")).toBeVisible();

      // Force an unreachable RPC target so the test does not depend on
      // whether something happens to listen on localhost:6800. After the 3
      // connect attempts (3s apart) run out, the status bar must surface
      // the error rather than silently showing an empty list.
      await page.evaluate(() => {
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
      await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html#/`);
      // Hash-only navigation does not remount the app — reload so the popup
      // hydrates from the (now unreachable) saved config.
      await page.reload();
      await page.waitForTimeout(9000);
      await expect(page.getByText(/Cannot connect to Aria2/)).toBeVisible();
    } finally {
      await context.close();
      await rm(profileDir, { recursive: true, force: true });
    }
  });

  test("persists settings in chrome.storage.local", async () => {
    const profileDir = await mkdtemp(path.join(tmpdir(), "ext-test-"));
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 800, height: 600 },
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      // Save a connection config from the settings page
      let page = await context.newPage();
      await page.goto(
        `chrome-extension://${EXTENSION_ID}/popup.html#/settings`,
      );
      await page.waitForTimeout(1000);
      await page.getByRole("tab", { name: "Connection Settings" }).click();
      await page.waitForTimeout(400);
      await page.getByLabel("WebSocket URL").fill("nas.lan:6800/jsonrpc");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.waitForTimeout(500);
      await page.close();

      // A fresh popup must read the persisted value back from chrome.storage
      page = await context.newPage();
      await page.goto(
        `chrome-extension://${EXTENSION_ID}/popup.html#/settings`,
      );
      await page.waitForTimeout(1200);
      await page.getByRole("tab", { name: "Connection Settings" }).click();
      await expect(page.getByLabel("WebSocket URL")).toHaveValue(
        "nas.lan:6800/jsonrpc",
      );
    } finally {
      await context.close();
      await rm(profileDir, { recursive: true, force: true });
    }
  });
});
