import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const internalKey =
  process.env.INTERNAL_API_KEY ?? "local-development-only-change-me";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? "50%" : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [
        ["dot"],
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
      ]
    : [
        ["list"],
        ["html", { open: "on-failure", outputFolder: "playwright-report" }],
      ],
  use: {
    baseURL,
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-390",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer:
    process.env.BASE_URL
      ? undefined
      : [
          {
            command:
              "python -m uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000",
            url: "http://127.0.0.1:8000/healthz",
            reuseExistingServer: !isCI,
            timeout: 180_000,
            stdout: "pipe",
            stderr: "pipe",
            env: {
              ...process.env,
              INTERNAL_API_KEY: internalKey,
              ALLOW_DEMO_FALLBACK:
                process.env.ALLOW_DEMO_FALLBACK ?? (isCI ? "true" : "false"),
              USE_DEMO_DATA:
                process.env.USE_DEMO_DATA ?? (isCI ? "true" : "false"),
              DATA_DIR:
                process.env.E2E_DATA_DIR ?? "services/api/.data",
              DATABASE_PATH:
                process.env.E2E_DATABASE_PATH ??
                "services/api/.data/e2e.duckdb",
              TZ: process.env.TZ ?? "Asia/Tehran",
            },
          },
          {
            command: isCI
              ? "pnpm --dir apps/web start:standalone"
              : "pnpm --dir apps/web dev",
            url: "http://127.0.0.1:3000/api/health",
            reuseExistingServer: !isCI,
            timeout: 180_000,
            stdout: "pipe",
            stderr: "pipe",
            env: {
              ...process.env,
              HOSTNAME: "127.0.0.1",
              PORT: "3000",
              API_BASE_URL: "http://127.0.0.1:8000",
              INTERNAL_API_KEY: internalKey,
              OPENAI_API_KEY: "",
              TZ: process.env.TZ ?? "Asia/Tehran",
            },
          },
        ],
});
