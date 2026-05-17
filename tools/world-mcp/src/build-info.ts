import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { OPERATION_KINDS } from "./package-interop.js";
import type { ToolCapability } from "./tools/describe-capabilities.js";
import { createPatchOperationSchemaManifest } from "./tools/describe-envelope-schema.js";

export interface BuildInfo {
  git_commit_hash: string;
  build_timestamp: string;
  source_schema_hash: string;
  validator_registry_hash: string;
  patch_operation_schema_hash: string;
}

function readGitCommitHash(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "unknown";
  }
}

function stableCapabilityPayload(tools: readonly ToolCapability[]): string {
  const normalized = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema_enums: Object.fromEntries(
      Object.entries(tool.input_schema_enums)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([field, values]) => [field, [...values]])
    )
  }));

  return JSON.stringify(normalized);
}

function findRepoRoot(): string {
  const starts = [process.cwd(), import.meta.dirname];

  for (const start of starts) {
    let current = path.resolve(start);

    while (true) {
      if (existsSync(path.join(current, "tools", "validators", "src"))) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return path.resolve(import.meta.dirname, "..", "..", "..", "..");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function validatorSourceFiles(): string[] {
  const root = findRepoRoot();
  const dirs = [
    path.join(root, "tools", "validators", "src", "rules"),
    path.join(root, "tools", "validators", "src", "structural")
  ];

  return dirs
    .flatMap((dir) =>
      readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
        .map((entry) => path.join(dir, entry.name))
    )
    .sort((left, right) => path.relative(root, left).localeCompare(path.relative(root, right)));
}

export function computeValidatorRegistryHash(): string {
  const hash = createHash("sha256");

  for (const filePath of validatorSourceFiles()) {
    hash.update(readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n"));
  }

  return hash.digest("hex");
}

export function computePatchOperationSchemaHash(): string {
  const manifest = Object.fromEntries(
    [...OPERATION_KINDS]
      .sort((left, right) => left.localeCompare(right))
      .map((kind) => [kind, createPatchOperationSchemaManifest([kind])[kind]])
  );

  return createHash("sha256").update(stableJson(manifest)).digest("hex");
}

export function createBuildInfo(tools: readonly ToolCapability[]): BuildInfo {
  return {
    git_commit_hash: readGitCommitHash(),
    build_timestamp: new Date().toISOString(),
    source_schema_hash: createHash("sha256").update(stableCapabilityPayload(tools)).digest("hex"),
    // Runtime computation keeps startup simple; createBuildInfo runs once per server instance.
    validator_registry_hash: computeValidatorRegistryHash(),
    patch_operation_schema_hash: computePatchOperationSchemaHash()
  };
}
