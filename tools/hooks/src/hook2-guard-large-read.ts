import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { detectWorldSlug, worldRelativeFilePath } from "./lib/detect-world.js";
import {
  emitPermissionDecision,
  readHookInput,
  tailContainsToken,
  type PreToolUseReadInput
} from "./lib/hook-io.js";
import { logDecision } from "./lib/logging.js";
import { resolveWorldRoot } from "./lib/pathing.js";
import {
  ATOMIC_SOURCE_DEFAULT_THRESHOLD,
  ALWAYS_ALLOWED_DIRECTORIES,
  ALWAYS_PROTECTED_FILES,
  isAtomicSourceYaml,
  thresholdForFile
} from "./lib/size-thresholds.js";

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

function buildDenyReasonAtomic(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  const fileName = path.basename(normalized);
  const recordId = fileName.replace(/\.ya?ml$/i, "");
  const storySlug = normalized.match(/^stories\/(?<storySlug>[^/]+)\/_source\//)?.groups?.storySlug;
  const recordClass = normalized.match(/(?:^|\/)_source\/(?<recordClass>[^/]+)\//)?.groups?.recordClass;
  const getRecordCall = storySlug === undefined
    ? `mcp__worldloom__get_record(record_id='${recordId}')`
    : `mcp__worldloom__get_record(record_id='${recordId}', story_slug='${storySlug}')`;
  const listRecordsHint = recordClass === undefined
    ? "mcp__worldloom__list_records(...) for whole-class enumeration"
    : `mcp__worldloom__list_records(record_type='${recordClass}', filters={...}) for whole-class enumeration`;

  return [
    `Full Read of atomic-source record ${normalized} is blocked.`,
    "Use instead:",
    `- ${getRecordCall} for this specific record`,
    "- mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget) for assembled context",
    `- ${listRecordsHint}`,
    "- Read with explicit offset+limit for scoped inspection",
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
  if (relativePath === null) {
    return;
  }

  const normalizedRelativePath = relativePath.split(path.sep).join("/");
  const [firstSegment] = normalizedRelativePath.split("/");
  if (firstSegment !== undefined && ALWAYS_ALLOWED_DIRECTORIES.includes(firstSegment)) {
    return;
  }

  if (isAtomicSourceYaml(normalizedRelativePath)) {
    const absolutePath = path.join(resolveWorldRoot(worldSlug, input.cwd), normalizedRelativePath);
    if (!existsSync(absolutePath)) {
      return;
    }

    if (countLines(readFileSync(absolutePath, "utf8")) <= ATOMIC_SOURCE_DEFAULT_THRESHOLD) {
      return;
    }

    emitPermissionDecision("deny", buildDenyReasonAtomic(normalizedRelativePath));
    logDecision("info", "hook2-guard-large-read", {
      decision: "deny",
      world_slug: worldSlug,
      file_path: normalizedRelativePath,
      surface: "atomic_source_yaml"
    }, input.cwd);
    return;
  }

  if (!normalizedRelativePath.endsWith(".md")) {
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
