#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function exists(name) {
  return fs.existsSync(path.join(cwd, name));
}

const pkg = readJson(path.join(cwd, "package.json")) ?? {};
const components = readJson(path.join(cwd, "components.json"));
const allDeps = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
};

const packageManager =
  pkg.packageManager ??
  (exists("pnpm-lock.yaml")
    ? "pnpm"
    : exists("yarn.lock")
      ? "yarn"
      : exists("bun.lockb") || exists("bun.lock")
        ? "bun"
        : exists("package-lock.json")
          ? "npm"
          : "unknown");

const detectVersion = (...names) => {
  for (const name of names) {
    if (allDeps[name]) return { package: name, version: allDeps[name] };
  }
  return null;
};

const installedUiFiles = [];
for (const candidate of [
  "components/ui",
  "src/components/ui",
  "app/components/ui",
]) {
  const full = path.join(cwd, candidate);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    const files = fs.readdirSync(full).filter((name) => !name.startsWith("."));
    installedUiFiles.push({ directory: candidate, files });
  }
}

const result = {
  cwd,
  packageManager,
  framework: detectVersion("next", "vite", "@remix-run/react", "react-router", "astro"),
  react: detectVersion("react"),
  tailwind: detectVersion("tailwindcss"),
  shadcnConfigured: Boolean(components),
  componentsJson: components
    ? {
        style: components.style ?? null,
        rsc: components.rsc ?? null,
        tsx: components.tsx ?? null,
        iconLibrary: components.iconLibrary ?? null,
        aliases: components.aliases ?? null,
        cssVariables: components.tailwind?.cssVariables ?? null,
        baseColor: components.tailwind?.baseColor ?? null,
      }
    : null,
  uiDirectories: installedUiFiles,
  aiSdk: detectVersion("ai", "@ai-sdk/react", "@ai-sdk/openai"),
  aiElementsIndicators: Object.keys(allDeps).filter(
    (name) => name.includes("ai-elements") || name.includes("@ai-sdk")
  ),
  chartLibraries: Object.keys(allDeps).filter((name) =>
    ["recharts", "chart.js", "react-chartjs-2", "echarts", "d3", "nivo"].some(
      (token) => name.includes(token)
    )
  ),
  formLibraries: Object.keys(allDeps).filter((name) =>
    ["react-hook-form", "formik", "zod", "valibot", "yup"].some((token) =>
      name.includes(token)
    )
  ),
};

console.log(JSON.stringify(result, null, 2));
