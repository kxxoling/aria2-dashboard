import { expect, test } from "@playwright/test";

/** The MSW task store is a singleton shared across parallel tests — reset it
 *  to the seeded fixtures before each test for deterministic assertions. */
test.beforeEach(async ({ request }) => {
  await request.post("/jsonrpc", {
    data: {
      jsonrpc: "2.0",
      id: "reset",
      method: "mock.resetState",
      params: [],
    },
  });
});

/**
 * Runs against dev:mock — handlers seeded from real aria2 1.37.0 responses
 * (an active BitTorrent task with one connected peer, a completed HTTP task,
 * and a 141-key global option set).
 */

test.describe("Aria2 settings page", () => {
  test("navigation entry opens the aria2 settings tab", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Aria2 Settings", exact: true })
      .click();
    // The sidebar entry deep-links into the combined settings page
    await expect(page).toHaveURL(/#\/settings\?tab=aria2/);
    await expect(
      page.getByRole("tab", { name: "Aria2 Settings" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator("nav button", { hasText: "Basic" }),
    ).toBeVisible();
  });

  test("old /aria2-settings deep link redirects to the aria2 tab", async ({
    page,
  }) => {
    await page.goto("/#/aria2-settings");
    await expect(page).toHaveURL(/#\/settings\?tab=aria2/);
    await expect(
      page.getByRole("tab", { name: "Aria2 Settings" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("shows real global options from the fixture", async ({ page }) => {
    await page.goto("/#/settings?tab=aria2");
    await page.waitForTimeout(800);
    // Sections start collapsed; expand Basic (via the TOC) first
    await page.locator("nav button", { hasText: "Basic" }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText("Max concurrent downloads")).toBeVisible();
    const dirInput = page.locator("#aria2-option-dir");
    await expect(dirInput).toHaveValue(/downloads/);

    // RPC category marks startup options read-only
    await page
      .getByRole("button", { name: /^RPC$/ })
      .or(page.locator("nav button", { hasText: "RPC" }))
      .first()
      .click();
    await expect(page.getByText("Enable RPC")).toBeVisible();
    await expect(page.locator("#aria2-option-enable-rpc")).toBeDisabled();
  });

  test("editing an option shows unsaved state and saves", async ({ page }) => {
    await page.goto("/#/settings");
    await page.getByRole("tab", { name: "Aria2 Settings" }).click();
    await page.waitForTimeout(600);
    await page.locator("nav button", { hasText: "Basic" }).click();
    const input = page.locator("#aria2-option-max-concurrent-downloads");
    await page.waitForTimeout(400);
    await input.fill("7");
    await expect(page.getByText("1 unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Aria2 settings saved")).toBeVisible();
    await expect(input).toHaveValue("7");
  });
});

test.describe("task detail", () => {
  test("opens with overview and tabs for a real BT task", async ({ page }) => {
    await page.goto("/");
    // The seeded BT task from real fixtures — the detail dialog opens from
    // the task-name cell (td #1, after the select checkbox column)
    const row = page.locator("tr", { hasText: "ubuntu" }).first();
    await row.locator("td").nth(1).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Files" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Peers" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Task Options" })).toBeVisible();

    // Peers tab lists the real captured peer
    await page.getByRole("tab", { name: "Peers" }).click();
    await expect(page.getByText("185.125.190.59:6904")).toBeVisible();
  });

  test("task options tab shows real task option values", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("tr", { hasText: "ubuntu" })
      .first()
      .locator("td")
      .nth(1)
      .click();
    await page.getByRole("tab", { name: "Task Options" }).click();
    await expect(
      page.getByText("Splits (connections per download)"),
    ).toBeVisible();
  });
});

test.describe("new task advanced options", () => {
  test("collapsible advanced section renders schema fields", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "New Task" }).first().click();
    await page.getByRole("button", { name: /Advanced Options/ }).click();
    await expect(page.getByText("Download directory")).toBeVisible();
    await expect(page.getByText("Max connections per server")).toBeVisible();
    await expect(page.getByText("BT tracker servers")).toBeVisible();
  });
});

test.describe("magnet metadata tasks", () => {
  test("metadata phase is distinguishable from the real BT task", async ({
    page,
  }) => {
    await page.goto("/");
    // The stopped tab holds the completed metadata fetch; active holds the BT task
    await page.getByRole("button", { name: /Stopped Tasks/ }).click();
    await page.waitForTimeout(800);
    await expect(
      page.getByText("MAGNET", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: /Active Tasks/ }).click();
    await page.waitForTimeout(800);
    await expect(page.getByText("BT", { exact: true }).first()).toBeVisible();
    // BT task from the magnet shows its real torrent name
    await expect(page.getByText("Tenmaku").first()).toBeVisible();
  });
});

test.describe("header stats on small screens", () => {
  test("download speed and active task count stay visible on mobile", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForTimeout(1500);

    const header = page.locator("header");
    await expect(header.getByText(/\/s/).first()).toBeVisible();
    await expect(header.getByText(/^\d+$/)).toBeVisible();
    await expect(page.getByPlaceholder("Search tasks...")).toBeVisible();
    await context.close();
  });
});

test.describe("logs page", () => {
  test("renders real log lines with search and level filter", async ({
    page,
  }) => {
    await page.goto("/#/logs");
    await page.waitForTimeout(1500);

    // Real captured lines render with level badges colored by severity
    await expect(
      page.getByText("[NOTICE]", { exact: false }).first(),
    ).toBeVisible();

    // Search narrows the view
    await page.getByPlaceholder("Search logs...").fill("Download complete");
    await page.waitForTimeout(400);
    await expect(page.getByText("Download complete").first()).toBeVisible();

    // Level filter removes DEBUG lines
    await page.getByPlaceholder("Search logs...").fill("");
    await page.getByRole("checkbox", { name: "DEBUG" }).uncheck();
    await page.waitForTimeout(400);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("[DEBUG]");
  });
});

test.describe("status bar and speed chart", () => {
  test("desktop status bar shows counters and rates", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForTimeout(1500);
    await expect(
      page.getByRole("contentinfo", { name: "" }).or(page.locator("footer")),
    ).toBeVisible();
    await expect(
      page
        .getByText("Downloading 1", { exact: false })
        .or(page.locator("footer").getByText(/\d/).first()),
    ).toBeVisible();
    await context.close();
  });

  test("clicking the rate pill opens the speed chart", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2500);
    const pill = page.getByTitle("Global speed history");
    await pill.click();
    await expect(page.getByText(/Recent \d+ min/)).toBeVisible();
    await expect(page.locator("svg[role=img]").last()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Recent \d+ min/)).not.toBeVisible();
  });

  test("rate pill click toggles, outside click closes (no re-open)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(2500);
    const pill = page.getByTitle("Global speed history");
    const chart = page.getByText(/Recent \d+ min/);

    // second click on the pill closes it
    await pill.click();
    await expect(chart).toBeVisible();
    await pill.click();
    await expect(chart).not.toBeVisible();

    // outside click closes it (the sidebar is never covered by the popover;
    // the search box can be, since the chart is a full-width overlay)
    await pill.click();
    await expect(chart).toBeVisible();
    await page.getByRole("button", { name: "Tasks", exact: true }).click();
    await expect(chart).not.toBeVisible();
  });

  test("table header right-click toggles columns", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1500);
    const headerRow = page.locator("thead tr").first();
    await headerRow.click({ button: "right" });
    await page.getByRole("menuitemcheckbox", { name: "Size" }).uncheck();
    await page.waitForTimeout(400);
    await expect(page.getByRole("columnheader", { name: "Size" })).toHaveCount(
      0,
    );
    // restore for other tests
    await headerRow.click({ button: "right" });
    await page.getByRole("menuitemcheckbox", { name: "Size" }).check();
  });
});

test.describe("app settings (AriaNg parity)", () => {
  test("language switch applies instantly and persists", async ({ page }) => {
    await page.goto("/#/settings");
    await page.getByRole("tab", { name: "Interface" }).click();
    await page.getByLabel("Language").selectOption("zh");
    await expect(page.getByRole("tab", { name: "界面" })).toBeVisible();

    // persists across reload
    await page.reload();
    await page.waitForTimeout(1200);
    await expect(page.getByRole("tab", { name: "界面" })).toBeVisible();

    // restore for the other tests
    await page.getByRole("tab", { name: "界面" }).click();
    await page.getByLabel("语言").selectOption("en");
    await expect(page.getByRole("tab", { name: "Interface" })).toBeVisible();
  });

  test("all nine languages switch correctly", async ({ page }) => {
    await page.goto("/#/settings");
    // the Interface tab holds exactly one select; its label translates too,
    // so locate the element itself rather than by label
    const langSelect = page
      .locator("select")
      .filter({ has: page.locator('option[value="ja"]') });
    for (const [id, tabName] of [
      ["ja", "インターフェース"],
      ["ko", "인터페이스"],
      ["es", "Interfaz"],
      ["pt", "Interface"],
      ["ru", "Интерфейс"],
      ["fr", "Interface"],
      ["zh-TW", "介面"],
      ["zh", "界面"],
    ] as const) {
      await langSelect.selectOption(id);
      await expect(
        page.getByRole("tab", { name: tabName, exact: true }),
      ).toBeVisible({
        timeout: 3000,
      });
    }
    // restore
    await langSelect.selectOption("en");
    await expect(page.getByRole("tab", { name: "Interface" })).toBeVisible();
  });

  test("aria2 settings accordion expands categories", async ({ page }) => {
    await page.goto("/#/settings?tab=aria2");
    await page.waitForTimeout(800);
    // everything is collapsed by default
    await expect(page.locator("#aria2-option-dir")).toHaveCount(0);
    await expect(page.locator("#aria2-option-bt-max-peers")).toHaveCount(0);

    // expand BitTorrent, then collapse it again with a second click
    const bt = page
      .locator("[data-radix-collection-item]")
      .filter({ hasText: "BitTorrent" });
    await bt.click();
    await expect(page.locator("#aria2-option-bt-max-peers")).toBeVisible();
    await bt.click();
    await expect(page.locator("#aria2-option-bt-max-peers")).toHaveCount(0);
  });

  test("disk-cache renders human-readable", async ({ page }) => {
    await page.goto("/#/settings?tab=aria2");
    await page.waitForTimeout(800);
    await page.locator("nav button", { hasText: "Basic" }).click();
    await page.waitForTimeout(400);
    const value = await page.locator("#aria2-option-disk-cache").inputValue();
    // the real fixture reports 67108864 bytes
    expect(value).toBe("≈ 64 MB");
  });

  test("tab title shows live rates", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2500);
    await expect(page).toHaveTitle(/↓ .*\/s ↑ .*\/s - Aria2 Dashboard/);
  });

  test("task removal asks for confirmation", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1500);
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Remove" }).click();
    await expect(page.getByText("Remove task?")).toBeVisible();

    // cancel keeps the row; confirm removes it
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await firstRow.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.getByText(/Removed \d+ tasks/)).toBeVisible();
  });

  test("table sorting persists across reloads", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1500);
    await page.getByRole("columnheader", { name: "Size" }).click();
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForTimeout(1500);
    // the header still shows the sort direction indicator
    await expect(
      page.getByRole("columnheader", { name: /Size ↑|Size ↓/ }),
    ).toBeVisible();
  });
});

test.describe("color schemes", () => {
  test("switching scheme applies data-scheme and persists", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "Dracula" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-scheme",
      "dracula",
    );

    // persists across reload
    await page.reload();
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-scheme",
      "dracula",
    );

    // dark mode + scheme combine
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute(
      "data-scheme",
      "dracula",
    );

    // restore defaults for other tests
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "System" }).click();
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitemradio", { name: "Default" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-scheme",
      "default",
    );
  });
});
