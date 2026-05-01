import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import type { ToolCapability } from "./tools/describe-capabilities";

export interface BuildInfo {
  git_commit_hash: string;
  build_timestamp: string;
  source_schema_hash: string;
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

export function createBuildInfo(tools: readonly ToolCapability[]): BuildInfo {
  return {
    git_commit_hash: readGitCommitHash(),
    build_timestamp: new Date().toISOString(),
    source_schema_hash: createHash("sha256").update(stableCapabilityPayload(tools)).digest("hex")
  };
}
