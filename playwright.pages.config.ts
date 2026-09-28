import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "pages.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:4187/tilapias/",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chromium",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "npm run preview -- --base=/tilapias/ --host 127.0.0.1 --port 4187 --strictPort",
    url: "http://127.0.0.1:4187/tilapias/",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
