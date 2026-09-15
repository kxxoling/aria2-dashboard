import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    // Dedicated port: 5173 is a common dev port and may be taken by
    // unrelated local services, which reuseExistingServer would happily use.
    baseURL: "http://localhost:5179",
    trace: "on-first-retry",
    locale: "en-US",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:5179",
          localStorage: [{ name: "i18nextLng", value: "en" }],
        },
      ],
    },
  },
  webServer: {
    // Mock mode serves tasks/global options seeded from real aria2 responses
    // (src/mocks/fixtures.ts), so the suite does not need a live daemon.
    command: "bunx vite --mode mock --port 5179 --strictPort",
    url: "http://localhost:5179",
    reuseExistingServer: !process.env.CI,
  },
});
