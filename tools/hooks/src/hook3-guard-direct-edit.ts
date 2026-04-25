import path from "node:path";

import {
  emitPermissionDecision,
  readHookInput,
  type PreToolUseReadInput
} from "./lib/hook-io";
import { logDecision } from "./lib/logging";

interface PreToolUseEditInput extends PreToolUseReadInput {
  tool_input?: {
    file_path?: string;
    offset?: number;
    limit?: number;
  };
}

function buildDenyReason(relativePath: string): string {
  return [
    `Direct Edit/Write to ${relativePath} is blocked — this surface is patch-engine-only.`,
    "Assemble a patch plan and submit via:",
    "  mcp__worldloom__submit_patch_plan(patch_plan, approval_token)",
    "The approval_token is issued at HARD-GATE user approval; see docs/HARD-GATE-DISCIPLINE.md."
  ].join("\n");
}

function classifyPath(filePath: string): { decision: "block" | "allow"; relativePath: string } | null {
  const normalized = filePath.split(path.sep).join("/");
  const match = normalized.match(/(?:^|\/)worlds\/(?<slug>[a-z0-9-]+)\/(?<rest>.+)$/i);
  if (match?.groups === undefined) {
    return null;
  }

  const rest = match.groups.rest;
  if (rest === undefined) {
    return null;
  }

  if (!rest.startsWith("_source/")) {
    return { decision: "allow", relativePath: rest };
  }

  if (rest.endsWith("/README.md")) {
    return { decision: "allow", relativePath: rest };
  }

  if (rest.endsWith(".yaml") || rest.endsWith(".yml")) {
    return { decision: "block", relativePath: rest };
  }

  return { decision: "allow", relativePath: rest };
}

async function main(): Promise<void> {
  const input = await readHookInput<PreToolUseEditInput>();
  if (input.tool_name !== "Edit" && input.tool_name !== "Write") {
    return;
  }

  const filePath = input.tool_input?.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) {
    return;
  }

  const classification = classifyPath(filePath);
  if (classification === null || classification.decision === "allow") {
    return;
  }

  emitPermissionDecision("deny", buildDenyReason(classification.relativePath));
  logDecision(
    "info",
    "hook3-guard-direct-edit",
    {
      decision: "deny",
      tool_name: input.tool_name,
      relative_path: classification.relativePath
    },
    input.cwd
  );
}

main().catch((error) => {
  logDecision("error", "hook3-guard-direct-edit", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
