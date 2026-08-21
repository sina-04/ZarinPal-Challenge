import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import "./prepare-standalone.mjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptsDirectory, "..");
const standaloneRoot = resolve(appDirectory, ".next", "standalone");
const standaloneApp = resolve(standaloneRoot, "apps", "web");

const child = spawn(process.execPath, [resolve(standaloneApp, "server.js")], {
  cwd: standaloneRoot,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
