import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

if (existsSync(resolve(".env"))) {
  loadEnvFile(resolve(".env"));
}

const isWindows = process.platform === "win32";
const pnpmCommand = isWindows ? "pnpm.cmd" : "pnpm";
const pythonCommand = process.env.PYTHON ?? (isWindows ? "python.exe" : "python3");
const webCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : pnpmCommand;
const webArguments = isWindows
  ? ["/d", "/s", "/c", "pnpm --dir apps/web dev"]
  : ["--dir", "apps/web", "dev"];
const internalKey = process.env.INTERNAL_API_KEY ?? "local-development-only-change-me";
const localWorkbook = resolve("challenge_data_cleaned.xlsx");

const sharedEnv = {
  ...process.env,
  INTERNAL_API_KEY: internalKey,
  TZ: process.env.TZ ?? "Asia/Tehran",
};

const apiEnv = {
  ...sharedEnv,
  DATASET_PATH:
    process.env.DATASET_PATH ?? (existsSync(localWorkbook) ? localWorkbook : ""),
  DATA_DIR: process.env.DATA_DIR ?? resolve("services/api/.data"),
  DATABASE_PATH:
    process.env.DATABASE_PATH ?? resolve("services/api/.data/analytics.duckdb"),
};

const webEnv = {
  ...sharedEnv,
  API_BASE_URL: process.env.API_BASE_URL ?? "http://127.0.0.1:8000",
};

const children = [
  spawn(
    pythonCommand,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--app-dir",
      "services/api",
      "--host",
      "0.0.0.0",
      "--port",
      "8000",
    ],
    { env: apiEnv, stdio: "inherit" },
  ),
  spawn(webCommand, webArguments, {
    env: webEnv,
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(isWindows ? undefined : "SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 250).unref();
}

for (const [index, child] of children.entries()) {
  const label = index === 0 ? "API" : "web";
  child.on("error", (error) => {
    console.error(`[dev] ${label} failed to start: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] ${label} exited (${signal ?? code ?? "unknown"}).`);
    stop(code ?? 1);
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
