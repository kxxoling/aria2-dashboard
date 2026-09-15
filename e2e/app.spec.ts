import { expect, test } from "@playwright/test";

test.describe("Aria2 Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads and displays title", async ({ page }) => {
    await expect(page).toHaveTitle("Aria2 Dashboard");
  });

  test("sidebar displays navigation links", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Tasks", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connection Settings", exact: true }),
    ).toBeVisible();
  });

  test("task list displays tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /All Tasks/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Active Tasks/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Waiting Tasks/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Stopped Tasks/ }),
    ).toBeVisible();
  });

  test("new task button exists", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New Task" })).toBeVisible();
  });

  test("click new task opens dialog", async ({ page }) => {
    await page.getByRole("button", { name: "New Task" }).click();
    await expect(page.getByText("Add New Task")).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter URLs, one per line..."),
    ).toBeVisible();
    await expect(page.getByText("Upload .torrent file")).toBeVisible();
  });

  test("new task dialog can be closed", async ({ page }) => {
    await page.getByRole("button", { name: "New Task" }).click();
    await expect(page.getByText("Add New Task")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Add New Task")).not.toBeVisible();
  });

  test("global actions button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Global Actions" }),
    ).toBeVisible();
  });

  test("click global actions shows menu", async ({ page }) => {
    await page.getByRole("button", { name: "Global Actions" }).click();
    await expect(page.getByText("Pause All")).toBeVisible();
    await expect(page.getByText("Resume All")).toBeVisible();
    await expect(page.getByText("Clear Finished")).toBeVisible();
  });

  test("navigate to settings page", async ({ page }) => {
    await page
      .getByRole("button", { name: "Connection Settings", exact: true })
      .click();
    await page.getByRole("tab", { name: "Connection Settings" }).click();
    await expect(page.getByText("Connection Protocol")).toBeVisible();
    await expect(page.getByRole("tab", { name: "WebSocket" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "HTTP" })).toBeVisible();
  });

  test("settings page displays protocol options", async ({ page }) => {
    await page
      .getByRole("button", { name: "Connection Settings", exact: true })
      .click();
    await page.getByRole("tab", { name: "Connection Settings" }).click();
    await expect(page.getByText("Secret")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Test Connection" }),
    ).toBeVisible();
  });

  test("settings page can switch protocol", async ({ page }) => {
    await page
      .getByRole("button", { name: "Connection Settings", exact: true })
      .click();
    await page.getByRole("tab", { name: "Connection Settings" }).click();

    await page.getByRole("tab", { name: "HTTP" }).click();
    await expect(page.getByText("HTTP URL")).toBeVisible();

    await page.getByRole("tab", { name: "WebSocket" }).click();
    await expect(page.getByText("WebSocket URL")).toBeVisible();
  });

  test("search input exists", async ({ page }) => {
    await expect(page.getByPlaceholder("Search tasks...")).toBeVisible();
  });

  test("sidebar can be collapsed", async ({ page }) => {
    const collapseButton = page.getByRole("button", { name: "Collapse" });
    await expect(collapseButton).toBeVisible();

    await collapseButton.click();
    await expect(page.getByText("Aria2 Dashboard")).not.toBeVisible();
  });

  test("speed display exists", async ({ page }) => {
    await expect(page.getByText("B/s").first()).toBeVisible();
  });
});
