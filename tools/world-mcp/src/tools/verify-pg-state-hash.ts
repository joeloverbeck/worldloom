import { readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { withIndexFreshnessGuard } from "../context-packet/freshness-guard.js";
import { resolveRepoRoot } from "../db/index.js";
import { createMcpError, type McpError } from "../errors.js";
import { computePgStateHash, computePlanHash } from "../package-interop.js";

import { isMcpError, resolveRecordRow } from "./get-record.js";

export interface VerifyPgStateHashArgs {
  world_slug: string;
  story_slug: string;
  page_id: string;
}

export interface VerifyPgStateHashResponse {
  world_slug: string;
  story_slug: string;
  page_id: string;
  recorded_state_hash: unknown;
  computed_state_hash: string;
  state_hash_match: boolean;
  recorded_plan_hash: unknown;
  computed_plan_hash: string | null;
  plan_hash_match: boolean | null;
  content_hash: string;
  file_path: string;
}

const PAGE_ID_PATTERN = /^PG-\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPlanHash(args: VerifyPgStateHashArgs): string | null | McpError {
  const planPath = path.join(
    resolveRepoRoot(),
    "worlds",
    args.world_slug,
    "stories",
    args.story_slug,
    "pages-prose-plans",
    `${args.page_id}.md`
  );

  try {
    return computePlanHash(readFileSync(planPath));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    return createMcpError("invalid_input", `Unable to read prose plan for ${args.page_id}.`, {
      field: "page_id",
      page_id: args.page_id,
      plan_path: planPath,
      read_error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function verifyPgStateHashImpl(
  args: VerifyPgStateHashArgs
): Promise<VerifyPgStateHashResponse | McpError> {
  if (!PAGE_ID_PATTERN.test(args.page_id)) {
    return createMcpError("invalid_input", `page_id '${args.page_id}' must match PG-<integer>.`, {
      field: "page_id",
      page_id: args.page_id
    });
  }

  const resolved = resolveRecordRow({
    record_id: args.page_id,
    world_slug: args.world_slug,
    story_slug: args.story_slug
  });

  if (isMcpError(resolved)) {
    if (resolved.code === "record_not_found") {
      return createMcpError("invalid_input", `Page '${args.page_id}' does not exist.`, {
        field: "page_id",
        page_id: args.page_id,
        world_slug: args.world_slug,
        story_slug: args.story_slug
      });
    }
    return resolved;
  }

  if (resolved.row.node_type !== "page_record") {
    return createMcpError("invalid_input", `Record '${args.page_id}' is not a PG page_record.`, {
      field: "page_id",
      page_id: args.page_id,
      node_type: resolved.row.node_type
    });
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(resolved.row.body);
  } catch (error) {
    return createMcpError("invalid_input", `Page '${args.page_id}' body is not parseable YAML.`, {
      field: "page_id",
      page_id: args.page_id,
      parse_error: error instanceof Error ? error.message : String(error)
    });
  }

  if (!isRecord(parsed)) {
    return createMcpError("invalid_input", `Page '${args.page_id}' body is not a YAML mapping.`, {
      field: "page_id",
      page_id: args.page_id
    });
  }

  const plan = isRecord(parsed.plan) ? parsed.plan : {};
  const recordedStateHash = parsed.state_hash;
  const recordedPlanHash = plan.plan_hash;
  const computedStateHash = computePgStateHash(parsed);
  const computedPlanHash = readPlanHash(args);
  if (isMcpError(computedPlanHash)) {
    return computedPlanHash;
  }

  return {
    world_slug: args.world_slug,
    story_slug: args.story_slug,
    page_id: args.page_id,
    recorded_state_hash: recordedStateHash,
    computed_state_hash: computedStateHash,
    state_hash_match: recordedStateHash === computedStateHash,
    recorded_plan_hash: recordedPlanHash,
    computed_plan_hash: computedPlanHash,
    plan_hash_match: computedPlanHash === null ? null : recordedPlanHash === computedPlanHash,
    content_hash: resolved.row.content_hash,
    file_path: resolved.row.file_path
  };
}

export const verifyPgStateHash = withIndexFreshnessGuard(verifyPgStateHashImpl);
