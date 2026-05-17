import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  emitPermissionDecision,
  readHookInput,
  type PreToolUseReadInput
} from "./lib/hook-io.js";
import { logDecision } from "./lib/logging.js";

interface PreToolUseEditWriteInput extends PreToolUseReadInput {
  tool_input?: {
    file_path?: string;
    content?: string;
    old_string?: string;
    new_string?: string;
  };
}

interface StoryPathMatch {
  worldSlug: string;
  storySlug: string;
  rest: string;
  storyRoot: string;
}

interface PlanCheckResult {
  ok: boolean;
  reason?: string;
  planPath?: string;
  pgPath?: string;
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function storyPathMatch(filePath: string): StoryPathMatch | null {
  const normalized = normalizePath(filePath);
  const match = normalized.match(
    /^(?<prefix>.*?worlds\/(?<worldSlug>[a-z0-9-]+)\/stories\/(?<storySlug>[^/]+))\/(?<rest>.+)$/i
  );
  if (
    match?.groups === undefined ||
    match.groups.worldSlug === undefined ||
    match.groups.storySlug === undefined ||
    match.groups.rest === undefined ||
    match.groups.prefix === undefined
  ) {
    return null;
  }

  return {
    worldSlug: match.groups.worldSlug,
    storySlug: match.groups.storySlug,
    rest: match.groups.rest,
    storyRoot: match.groups.prefix
  };
}

function absolutePath(filePath: string, cwd: string | undefined): string {
  if (path.isAbsolute(filePath)) {
    return path.resolve(filePath);
  }
  return path.resolve(cwd ?? process.cwd(), filePath);
}

function computePlanHash(bytes: Buffer): string {
  // Mirror tools/world-mcp/src/cli/compute-pg-hashes.ts: computePlanHash(planResult.bytes).
  return createHash("sha256").update(bytes).digest("hex");
}

function pendingBody(
  input: PreToolUseEditWriteInput,
  filePath: string
): { ok: true; body: Buffer } | { ok: false; reason: string } {
  const toolInput = input.tool_input;
  if (input.tool_name === "Write") {
    if (typeof toolInput?.content !== "string") {
      return { ok: false, reason: "Write payload did not include content bytes." };
    }
    return { ok: true, body: Buffer.from(toolInput.content, "utf8") };
  }

  if (input.tool_name === "Edit") {
    if (typeof toolInput?.old_string === "string" && typeof toolInput.new_string === "string") {
      let current: string;
      try {
        current = readFileSync(filePath, "utf8");
      } catch (err) {
        const cause = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: `Unable to read current file for Edit simulation: ${cause}` };
      }

      const firstIndex = current.indexOf(toolInput.old_string);
      if (firstIndex === -1) {
        return { ok: false, reason: "Edit old_string was not found in the current file." };
      }
      const secondIndex = current.indexOf(toolInput.old_string, firstIndex + toolInput.old_string.length);
      if (secondIndex !== -1) {
        return { ok: false, reason: "Edit old_string matched multiple locations." };
      }

      const edited =
        current.slice(0, firstIndex) +
        toolInput.new_string +
        current.slice(firstIndex + toolInput.old_string.length);
      return { ok: true, body: Buffer.from(edited, "utf8") };
    }

    return { ok: false, reason: "Edit payload did not include old_string/new_string." };
  }

  return { ok: false, reason: `Unsupported tool ${input.tool_name ?? "<unknown>"}.` };
}

function extractPlanHash(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const plan = (parsed as Record<string, unknown>).plan;
      if (plan !== null && typeof plan === "object" && !Array.isArray(plan)) {
        const hash = (plan as Record<string, unknown>).plan_hash;
        if (typeof hash === "string" && hash.length > 0) {
          return hash;
        }
      }
    }
  } catch {
    // Fall through to the YAML-shaped scan used by story records in this repo.
  }

  const lines = raw.split(/\r?\n/);
  let inPlanBlock = false;
  let planIndent = -1;
  for (const line of lines) {
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      continue;
    }

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (/^\s*plan\s*:\s*(?:#.*)?$/.test(line)) {
      inPlanBlock = true;
      planIndent = indent;
      continue;
    }

    if (inPlanBlock && indent <= planIndent) {
      inPlanBlock = false;
      planIndent = -1;
    }

    if (inPlanBlock) {
      const match = line.match(/^\s*plan_hash\s*:\s*["']?([0-9a-fA-F]{64})["']?\s*(?:#.*)?$/);
      if (match?.[1] !== undefined) {
        return match[1];
      }
    }
  }

  return null;
}

function readStampedPlanHash(pgPath: string): { ok: true; hash: string } | { ok: false; reason: string } {
  if (!existsSync(pgPath)) {
    return { ok: false, reason: "missing_pg_record" };
  }

  let raw: string;
  try {
    raw = readFileSync(pgPath, "utf8");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Unable to read PG record: ${cause}` };
  }

  const hash = extractPlanHash(raw);
  if (hash === null) {
    return { ok: false, reason: "PG record has no parseable plan.plan_hash." };
  }
  return { ok: true, hash: hash.toLowerCase() };
}

function planRecordPaths(match: StoryPathMatch, pageId: string): { planPath: string; pgPath: string } {
  return {
    planPath: path.join(match.storyRoot, "pages-prose-plans", `${pageId}.md`),
    pgPath: path.join(match.storyRoot, "_source", "pages", `${pageId}.yaml`)
  };
}

function checkPlanHash(match: StoryPathMatch, pageId: string, body: Buffer): PlanCheckResult {
  const { planPath, pgPath } = planRecordPaths(match, pageId);
  const stamped = readStampedPlanHash(pgPath);
  if (!stamped.ok) {
    if (stamped.reason === "missing_pg_record") {
      return { ok: true, planPath, pgPath };
    }
    return { ok: false, reason: stamped.reason, planPath, pgPath };
  }

  const computed = computePlanHash(body);
  if (computed !== stamped.hash) {
    return {
      ok: false,
      reason: `plan_hash mismatch for ${pageId}: PG.plan.plan_hash=${stamped.hash} computed=${computed}`,
      planPath,
      pgPath
    };
  }

  return { ok: true, planPath, pgPath };
}

function pageIdsFromIndexBody(body: string): string[] {
  return Array.from(new Set(Array.from(body.matchAll(/\bPG-\d+\b/g), (match) => match[0]))).sort();
}

function bodyForIndexCheck(input: PreToolUseEditWriteInput, filePath: string): string {
  const pending = pendingBody(input, filePath);
  if (pending.ok) {
    return pending.body.toString("utf8");
  }

  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function checkReferencedPlans(match: StoryPathMatch, indexBody: string): PlanCheckResult {
  for (const pageId of pageIdsFromIndexBody(indexBody)) {
    const { planPath, pgPath } = planRecordPaths(match, pageId);
    if (!existsSync(planPath)) {
      continue;
    }

    const body = readFileSync(planPath);
    const result = checkPlanHash(match, pageId, body);
    if (!result.ok) {
      return { ...result, planPath, pgPath };
    }
  }

  return { ok: true };
}

function buildDenyReason(result: PlanCheckResult): string {
  const planPath = result.planPath ?? "<plan-path>";
  const pgPath = result.pgPath ?? "<pg-record-path>";
  return [
    "Direct Edit/Write would break the PG plan-hash bridge.",
    result.reason ?? "The plan body does not match the stamped PG.plan.plan_hash.",
    "Re-stamp or repair with:",
    `  node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan ${planPath} --pg ${pgPath}`,
    "Then route the PG record update through the patch-engine approval flow before updating the bundle INDEX."
  ].join("\n");
}

async function main(): Promise<void> {
  const input = await readHookInput<PreToolUseEditWriteInput>();
  if (input.tool_name !== "Edit" && input.tool_name !== "Write") {
    return;
  }

  const filePathInput = input.tool_input?.file_path;
  if (typeof filePathInput !== "string" || filePathInput.length === 0) {
    return;
  }

  const filePath = absolutePath(filePathInput, input.cwd);
  const match = storyPathMatch(filePath);
  if (match === null) {
    return;
  }

  const planMatch = match.rest.match(/^pages-prose-plans\/(?<pageId>PG-\d+)\.md$/);
  let result: PlanCheckResult | null = null;
  if (planMatch?.groups?.pageId !== undefined) {
    const body = pendingBody(input, filePath);
    result = body.ok
      ? checkPlanHash(match, planMatch.groups.pageId, body.body)
      : {
          ok: false,
          reason: body.reason,
          ...planRecordPaths(match, planMatch.groups.pageId)
        };
  } else if (match.rest === "INDEX.md") {
    result = checkReferencedPlans(match, bodyForIndexCheck(input, filePath));
  }

  if (result === null || result.ok) {
    return;
  }

  emitPermissionDecision("deny", buildDenyReason(result));
  logDecision(
    "info",
    "hook6-guard-story-markdown-hash",
    {
      decision: "deny",
      tool_name: input.tool_name,
      file_path: filePath,
      reason: result.reason
    },
    input.cwd
  );
}

main().catch((error) => {
  logDecision("error", "hook6-guard-story-markdown-hash", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
