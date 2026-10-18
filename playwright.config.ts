import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";
import { requireTestDatabaseUrl } from "./server/config/test-database";

// E2E never inherits the application's DATABASE_URL or loads its .env files.
const databaseUrl = requireTestDatabaseUrl({
  DATABASE_URL: process.env.E2E_DATABASE_URL,
});
const port = 3107;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: randomBytes(32).toString("hex"),
      AUTH_URL: baseURL,
      APP_ORIGIN: baseURL,
      TRUST_PROXY_HEADERS: "true",
      CRON_SECRET: randomBytes(32).toString("hex"),
    },
  },
});
