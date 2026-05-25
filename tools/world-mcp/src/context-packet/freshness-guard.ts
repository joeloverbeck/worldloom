import { performance } from "node:perf_hooks";

import { resolveRepoRoot } from "../db/index.js";
import type { McpError } from "../errors.js";
import { buildWorldIndex, syncWorldIndex } from "../package-interop.js";

export interface FreshnessAudit {
  pre_call_index_was_stale?: true;
  drifted_files_synced?: string[];
  sync_duration_ms?: number;
  pre_call_index_version_was_old?: true;
  index_version_rebuilt_from?: string | null;
  index_version_rebuilt_to?: string;
  build_duration_ms?: number;
}

export interface FreshnessAuditedResponse {
  freshness_audit: FreshnessAudit;
}

type FreshnessGuardHandler<TArgs, TResult> = (args: TArgs) => Promise<TResult | McpError>;
type BuildWorldIndex = (worldRoot: string, worldSlug: string) => number;
type SyncWorldIndex = (worldRoot: string, worldSlug: string) => number;

export interface FreshnessGuardOptions<TArgs> {
  getWorldSlug?: (args: TArgs, error: McpError) => string | undefined;
  buildWorldIndex?: BuildWorldIndex;
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

function isIndexVersionMismatchError(value: unknown): value is McpError {
  return isMcpError(value) && value.code === "index_version_mismatch";
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function extractOptionalString(value: unknown): string | null | undefined {
  return value === null || typeof value === "string" ? value : undefined;
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

function withRecoveryDetails(error: McpError, attempted: "build" | "sync", outcome: string): McpError {
  return {
    ...error,
    details: {
      ...error.details,
      recovery_attempted: attempted,
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
  const runBuild = options.buildWorldIndex ?? buildWorldIndex;
  const runSync = options.syncWorldIndex ?? syncWorldIndex;
  const getWorldSlug = options.getWorldSlug ?? defaultWorldSlugExtractor<TArgs>;

  return async (args) => {
    const audit: FreshnessAudit = {};
    let result = await handler(args);
    let attemptedBuild = false;
    let attemptedSync = false;

    while (true) {
      if (isIndexVersionMismatchError(result)) {
        if (attemptedBuild) {
          return withRecoveryDetails(result, "build", "still_mismatched");
        }

        const worldSlug = getWorldSlug(args, result);
        if (worldSlug === undefined || worldSlug.length === 0) {
          return withRecoveryDetails(result, "build", "missing_world_slug");
        }

        attemptedBuild = true;
        const fromVersion = extractOptionalString(result.details?.actual);
        const toVersion = extractOptionalString(result.details?.expected);
        const startedAt = performance.now();
        const exitCode = runBuild(resolveRepoRoot(), worldSlug);
        const buildDurationMs = Math.round(performance.now() - startedAt);

        if (exitCode !== 0) {
          return withRecoveryDetails(result, "build", "build_failed");
        }

        audit.pre_call_index_version_was_old = true;
        if (fromVersion !== undefined) {
          audit.index_version_rebuilt_from = fromVersion;
        }
        if (toVersion !== undefined && toVersion !== null) {
          audit.index_version_rebuilt_to = toVersion;
        }
        audit.build_duration_ms = buildDurationMs;
        result = await handler(args);
        continue;
      }

      if (!isStaleIndexError(result)) {
        break;
      }

      const staleError = result;
      if (attemptedSync) {
        return withRecoveryDetails(staleError, "sync", "still_stale");
      }

      const worldSlug = getWorldSlug(args, staleError);
      if (worldSlug === undefined || worldSlug.length === 0) {
        return withRecoveryDetails(staleError, "sync", "missing_world_slug");
      }

      attemptedSync = true;
      const driftedFiles = extractStringArray(staleError.details?.drifted_files);
      const startedAt = performance.now();
      const exitCode = runSync(resolveRepoRoot(), worldSlug);
      const syncDurationMs = Math.round(performance.now() - startedAt);

      if (exitCode !== 0) {
        return withRecoveryDetails(staleError, "sync", "sync_failed");
      }

      audit.pre_call_index_was_stale = true;
      audit.drifted_files_synced = driftedFiles;
      audit.sync_duration_ms = syncDurationMs;
      result = await handler(args);
    }

    if (Object.keys(audit).length === 0) {
      return result;
    }

    return withFreshnessAudit(result, audit);
  };
}
