import { performance } from "node:perf_hooks";

import { sync as syncWorldIndex } from "@worldloom/world-index/commands/sync";

import { resolveRepoRoot } from "../db";
import type { McpError } from "../errors";

export interface FreshnessAudit {
  pre_call_index_was_stale: true;
  drifted_files_synced: string[];
  sync_duration_ms: number;
}

export interface FreshnessAuditedResponse {
  freshness_audit: FreshnessAudit;
}

type FreshnessGuardHandler<TArgs, TResult> = (args: TArgs) => Promise<TResult | McpError>;
type SyncWorldIndex = (worldRoot: string, worldSlug: string) => number;

export interface FreshnessGuardOptions<TArgs> {
  getWorldSlug?: (args: TArgs, error: McpError) => string | undefined;
  syncWorldIndex?: SyncWorldIndex;
}

function isMcpError(value: unknown): value is McpError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string"
  );
}

function isStaleIndexError(value: unknown): value is McpError {
  return isMcpError(value) && value.code === "stale_index";
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function defaultWorldSlugExtractor<TArgs>(
  args: TArgs,
  error: McpError
): string | undefined {
  const detailWorldSlug = error.details?.world_slug;
  if (typeof detailWorldSlug === "string" && detailWorldSlug.length > 0) {
    return detailWorldSlug;
  }

  if (typeof args === "object" && args !== null && "world_slug" in args) {
    const argWorldSlug = (args as { world_slug?: unknown }).world_slug;
    return typeof argWorldSlug === "string" ? argWorldSlug : undefined;
  }

  return undefined;
}

function withRecoveryDetails(error: McpError, outcome: string): McpError {
  return {
    ...error,
    details: {
      ...error.details,
      recovery_attempted: "sync",
      recovery_outcome: outcome
    }
  };
}

function withFreshnessAudit<TResult>(
  response: TResult,
  audit: FreshnessAudit
): TResult | (TResult & FreshnessAuditedResponse) {
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    return response;
  }

  return {
    ...response,
    freshness_audit: audit
  };
}

export function withIndexFreshnessGuard<TArgs, TResult>(
  handler: FreshnessGuardHandler<TArgs, TResult>,
  options: FreshnessGuardOptions<TArgs> = {}
): FreshnessGuardHandler<TArgs, TResult | (TResult & FreshnessAuditedResponse)> {
  const runSync = options.syncWorldIndex ?? syncWorldIndex;
  const getWorldSlug = options.getWorldSlug ?? defaultWorldSlugExtractor<TArgs>;

  return async (args) => {
    const first = await handler(args);
    if (!isStaleIndexError(first)) {
      return first;
    }

    const worldSlug = getWorldSlug(args, first);
    if (worldSlug === undefined || worldSlug.length === 0) {
      return withRecoveryDetails(first, "missing_world_slug");
    }

    const driftedFiles = extractStringArray(first.details?.drifted_files);
    const startedAt = performance.now();
    const exitCode = runSync(resolveRepoRoot(), worldSlug);
    const syncDurationMs = Math.round(performance.now() - startedAt);

    if (exitCode !== 0) {
      return withRecoveryDetails(first, "sync_failed");
    }

    const second = await handler(args);
    if (isStaleIndexError(second)) {
      return withRecoveryDetails(second, "still_stale");
    }

    return withFreshnessAudit(second, {
      pre_call_index_was_stale: true,
      drifted_files_synced: driftedFiles,
      sync_duration_ms: syncDurationMs
    });
  };
}
