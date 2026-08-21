import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import openapiTS, { astToString } from "openapi-typescript";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptDirectory, "..");
const schemaPath = resolve(appDirectory, "openapi", "openapi.json");
const outputPath = resolve(appDirectory, "src", "lib", "api.generated.ts");
const workspaceDirectory = resolve(appDirectory, "..", "..");
const backendSources = [
  resolve(workspaceDirectory, "services", "api", "app", "main.py"),
  resolve(workspaceDirectory, "services", "api", "app", "schemas.py"),
];
const mode = process.argv[2];

if (mode !== "--write" && mode !== "--check") {
  throw new Error("Usage: node scripts/openapi-types.mjs --write|--check");
}

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const backendSource = (
  await Promise.all(
    backendSources.map(async (path) =>
      (await readFile(path, "utf8")).replaceAll("\r\n", "\n"),
    ),
  )
).join("\n---\n");
const backendDigest = createHash("sha256").update(backendSource).digest("hex");
if (schema["x-backend-contract-sha256"] !== backendDigest) {
  throw new Error(
    "FastAPI contract sources changed. Export openapi.json and run scripts/stamp-openapi.mjs.",
  );
}
const nodes = await openapiTS(schema, { alphabetize: true });
const generated =
  "/* This file is generated from openapi/openapi.json. Do not edit manually. */\n" +
  astToString(nodes);

if (mode === "--write") {
  await writeFile(outputPath, generated, "utf8");
} else {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== generated) {
    process.stderr.write(
      "OpenAPI client types are stale. Run: pnpm --dir apps/web api:types\n",
    );
    process.exitCode = 1;
  }
}
