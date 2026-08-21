import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptDirectory, "..");
const workspaceDirectory = resolve(appDirectory, "..", "..");
const schemaPath = resolve(appDirectory, "openapi", "openapi.json");
const backendSources = [
  resolve(workspaceDirectory, "services", "api", "app", "main.py"),
  resolve(workspaceDirectory, "services", "api", "app", "schemas.py"),
];

const source = (
  await Promise.all(
    backendSources.map(async (path) =>
      (await readFile(path, "utf8")).replaceAll("\r\n", "\n"),
    ),
  )
).join("\n---\n");
const digest = createHash("sha256").update(source).digest("hex");
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
schema["x-backend-contract-sha256"] = digest;
await writeFile(schemaPath, JSON.stringify(schema, null, 2) + "\n", "utf8");
