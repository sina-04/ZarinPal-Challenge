import { cp, lstat, mkdir, readlink, readdir, rm, stat, symlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptsDirectory, "..");
const workspaceDirectory = resolve(appDirectory, "..", "..");
const standaloneRoot = resolve(appDirectory, ".next", "standalone");
const standaloneApp = resolve(standaloneRoot, "apps", "web");

await mkdir(resolve(standaloneApp, ".next"), { recursive: true });
await cp(
  resolve(appDirectory, ".next", "static"),
  resolve(standaloneApp, ".next", "static"),
  { force: true, recursive: true },
);
const publicDirectory = resolve(appDirectory, "public");
const standalonePublicDirectory = resolve(standaloneApp, "public");
const publicDirectoryInfo = await stat(publicDirectory).catch((error) => {
  if (error?.code === "ENOENT") return null;
  throw error;
});
if (publicDirectoryInfo?.isDirectory()) {
  await cp(publicDirectory, standalonePublicDirectory, {
    force: true,
    recursive: true,
  });
} else {
  await rm(standalonePublicDirectory, { force: true, recursive: true });
}

// Next's Windows file tracer can retain the pnpm link while copying only the CJS
// half of @swc/helpers. Copy the complete package so the standalone result is
// executable on both Windows and Linux, including the ESM require hooks.
const standalonePnpm = resolve(standaloneRoot, "node_modules", ".pnpm");
const workspacePnpm = resolve(workspaceDirectory, "node_modules", ".pnpm");
const entries = await readdir(standalonePnpm, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory() || !entry.name.startsWith("@swc+helpers@")) continue;
  await cp(
    resolve(workspacePnpm, entry.name, "node_modules", "@swc", "helpers"),
    resolve(standalonePnpm, entry.name, "node_modules", "@swc", "helpers"),
    { force: true, recursive: true },
  );
}

async function repairWindowsDirectoryLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) {
      const target = resolve(dirname(path), await readlink(path));
      if (!target.startsWith(standaloneRoot)) continue;
      const targetInfo = await stat(target).catch(() => null);
      if (!targetInfo?.isDirectory()) continue;
      await rm(path, { force: true });
      await symlink(target, path, "junction");
      continue;
    }
    if (info.isDirectory()) await repairWindowsDirectoryLinks(path);
  }
}

if (process.platform === "win32") {
  await repairWindowsDirectoryLinks(resolve(standaloneRoot, "node_modules"));
}
