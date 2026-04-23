import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { detectWorldSlug, worldRelativeFilePath } from "./lib/detect-world";
import {
  emitPermissionDecision,
  readHookInput,
  tailContainsToken,
  type PreToolUseReadInput
} from "./lib/hook-io";
import { logDecision } from "./lib/logging";
import { resolveWorldRoot } from "./lib/pathing";
import {
  ALWAYS_ALLOWED_DIRECTORIES,
  ALWAYS_PROTECTED_FILES,
  thresholdForFile
} from "./lib/size-thresholds";

function countLines(source: string): number {
  if (source.length === 0) {
    return 0;
  }

  return source.split("\n").length;
}

function isScopedRead(input: PreToolUseReadInput): boolean {
  const toolInput = input.tool_input;
  return typeof toolInput?.offset === "number" || typeof toolInput?.limit === "number";
}

function buildDenyReason(fileName: string): string {
  return [
    `Full Read of ${fileName} is blocked.`,
    "Use instead:",
    "- mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget) for assembled context",
    "- mcp__worldloom__get_node(node_id) for a specific CF/CH/PA/M record",
    "- mcp__worldloom__search_nodes(query, filters) for search",
    "- Read with explicit offset+limit for unstructured prose regions",
    "If you genuinely need the full file, include the token ALLOW_FULL_READ in your next prompt."
  ].join("\n");
}

async function main(): Promise<void> {
  const input = await readHookInput<PreToolUseReadInput>();
  if (input.tool_name !== "Read") {
    return;
  }

  const filePath = input.tool_input?.file_path;
  if (filePath === undefined || isScopedRead(input)) {
    return;
  }

  if (tailContainsToken(input.transcript_path, "ALLOW_FULL_READ")) {
    logDecision("info", "hook2-guard-large-read", {
      decision: "allow",
      reason: "override",
      file_path: filePath
    }, input.cwd);
    return;
  }

  let promptHint = "";
  if (input.transcript_path !== undefined) {
    try {
      promptHint = readFileSync(input.transcript_path, "utf8").slice(-65536);
    } catch {
      promptHint = "";
    }
  }
  const hintedWorldSlug = detectWorldSlug(promptHint, input.cwd);
  const worldSlugMatch = filePath.match(/[\\/]worlds[\\/](?<slug>[a-z0-9-]+)[\\/]/i)?.groups?.slug;
  const worldSlug = worldSlugMatch ?? hintedWorldSlug;

  if (worldSlug === undefined || worldSlug === null) {
    return;
  }

  const relativePath = worldRelativeFilePath(filePath, worldSlug);
  if (relativePath === null || !relativePath.endsWith(".md")) {
    return;
  }

  const normalizedRelativePath = relativePath.split(path.sep).join("/");
  const [firstSegment] = normalizedRelativePath.split("/");
  if (firstSegment !== undefined && ALWAYS_ALLOWED_DIRECTORIES.includes(firstSegment)) {
    return;
  }

  const fileName = path.basename(normalizedRelativePath);
  const absolutePath = path.join(resolveWorldRoot(worldSlug, input.cwd), normalizedRelativePath);
  if (!existsSync(absolutePath)) {
    return;
  }

  let shouldBlock = ALWAYS_PROTECTED_FILES.has(fileName);
  if (!shouldBlock) {
    const threshold = thresholdForFile(fileName);
    if (threshold !== null) {
      shouldBlock = countLines(readFileSync(absolutePath, "utf8")) > threshold;
    }
  }

  if (!shouldBlock) {
    return;
  }

  emitPermissionDecision("deny", buildDenyReason(fileName));
  logDecision("info", "hook2-guard-large-read", {
    decision: "deny",
    world_slug: worldSlug,
    file_path: normalizedRelativePath
  }, input.cwd);
}

main().catch((error) => {
  logDecision("error", "hook2-guard-large-read", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
