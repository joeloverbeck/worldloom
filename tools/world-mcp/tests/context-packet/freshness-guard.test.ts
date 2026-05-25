import test from "node:test";
import assert from "node:assert/strict";

import {
  withIndexFreshnessGuard,
  type FreshnessAuditedResponse
} from "../../src/context-packet/freshness-guard.js";
import type { McpError } from "../../src/errors.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";

interface HandlerArgs {
  world_slug: string;
}

interface HandlerResponse {
  value: string;
}

function staleIndexError(worldSlug = "seeded"): McpError {
  return {
    code: "stale_index",
    message: "World index is stale.",
    details: {
      world_slug: worldSlug,
      drifted_files: ["_source/entities/ENT-0002.yaml"],
      remedy: "run world-index sync"
    }
  };
}

function indexVersionMismatchError(worldSlug = "seeded", actual = "6", expected = "7"): McpError {
  return {
    code: "index_version_mismatch",
    message: "World index schema version does not match the retrieval server expectation.",
    details: {
      world_slug: worldSlug,
      expected,
      actual,
      remedy: "run world-index build"
    }
  };
}

test("withIndexFreshnessGuard returns fresh responses unchanged", async () => {
  const root = createTempRepoRoot();

  try {
    let syncCalled = false;
    const guarded = withIndexFreshnessGuard<HandlerArgs, HandlerResponse>(
      async () => ({ value: "fresh" }),
      {
        syncWorldIndex: () => {
          syncCalled = true;
          return 0;
        }
      }
    );

    const result = await withRepoRoot(root, () => guarded({ world_slug: "seeded" }));

    assert.deepEqual(result, { value: "fresh" });
    assert.equal(syncCalled, false);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("withIndexFreshnessGuard syncs and retries once for recoverable stale_index", async () => {
  const root = createTempRepoRoot();

  try {
    let calls = 0;
    const syncCalls: Array<{ worldRoot: string; worldSlug: string }> = [];
    const guarded = withIndexFreshnessGuard<HandlerArgs, HandlerResponse>(
      async () => {
        calls += 1;
        return calls === 1 ? staleIndexError() : { value: "recovered" };
      },
      {
        syncWorldIndex: (worldRoot, worldSlug) => {
          syncCalls.push({ worldRoot, worldSlug });
          return 0;
        }
      }
    );

    const result = await withRepoRoot(root, () => guarded({ world_slug: "seeded" }));

    assert.equal(calls, 2);
    assert.deepEqual(syncCalls, [{ worldRoot: root, worldSlug: "seeded" }]);
    if ("code" in result) {
      assert.fail(`expected recovered response, got ${result.code}`);
    }
    assert.equal(result.value, "recovered");

    const audited = result as HandlerResponse & FreshnessAuditedResponse;
    assert.deepEqual(audited.freshness_audit.drifted_files_synced, [
      "_source/entities/ENT-0002.yaml"
    ]);
    assert.equal(audited.freshness_audit.pre_call_index_was_stale, true);
    assert.equal(Number.isInteger(audited.freshness_audit.sync_duration_ms), true);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("withIndexFreshnessGuard builds and retries once for recoverable index_version_mismatch", async () => {
  const root = createTempRepoRoot();

  try {
    let calls = 0;
    const buildCalls: Array<{ worldRoot: string; worldSlug: string }> = [];
    const guarded = withIndexFreshnessGuard<HandlerArgs, HandlerResponse>(
      async () => {
        calls += 1;
        return calls === 1 ? indexVersionMismatchError() : { value: "rebuilt" };
      },
      {
        buildWorldIndex: (worldRoot, worldSlug) => {
          buildCalls.push({ worldRoot, worldSlug });
          return 0;
        }
      }
    );

    const result = await withRepoRoot(root, () => guarded({ world_slug: "seeded" }));

    assert.equal(calls, 2);
    assert.deepEqual(buildCalls, [{ worldRoot: root, worldSlug: "seeded" }]);
    if ("code" in result) {
      assert.fail(`expected recovered response, got ${result.code}`);
    }
    assert.equal(result.value, "rebuilt");

    const audited = result as HandlerResponse & FreshnessAuditedResponse;
    assert.equal(audited.freshness_audit.pre_call_index_version_was_old, true);
    assert.equal(audited.freshness_audit.index_version_rebuilt_from, "6");
    assert.equal(audited.freshness_audit.index_version_rebuilt_to, "7");
    assert.equal(Number.isInteger(audited.freshness_audit.build_duration_ms), true);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("withIndexFreshnessGuard preserves index_version_mismatch when build does not repair the version", async () => {
  const root = createTempRepoRoot();

  try {
    let calls = 0;
    const guarded = withIndexFreshnessGuard<HandlerArgs, HandlerResponse>(
      async () => {
        calls += 1;
        return indexVersionMismatchError();
      },
      {
        buildWorldIndex: () => 0
      }
    );

    const result = await withRepoRoot(root, () => guarded({ world_slug: "seeded" }));

    assert.equal(calls, 2);
    assert.equal("code" in result, true);
    assert.equal((result as McpError).code, "index_version_mismatch");
    assert.equal((result as McpError).details?.recovery_attempted, "build");
    assert.equal((result as McpError).details?.recovery_outcome, "still_mismatched");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("withIndexFreshnessGuard can annotate version rebuild and stale sync on one recovered call", async () => {
  const root = createTempRepoRoot();

  try {
    let calls = 0;
    const buildCalls: string[] = [];
    const syncCalls: string[] = [];
    const guarded = withIndexFreshnessGuard<HandlerArgs, HandlerResponse>(
      async () => {
        calls += 1;
        if (calls === 1) {
          return indexVersionMismatchError();
        }
        if (calls === 2) {
          return staleIndexError();
        }
        return { value: "rebuilt-and-synced" };
      },
      {
        buildWorldIndex: (_worldRoot, worldSlug) => {
          buildCalls.push(worldSlug);
          return 0;
        },
        syncWorldIndex: (_worldRoot, worldSlug) => {
          syncCalls.push(worldSlug);
          return 0;
        }
      }
    );

    const result = await withRepoRoot(root, () => guarded({ world_slug: "seeded" }));

    assert.equal(calls, 3);
    assert.deepEqual(buildCalls, ["seeded"]);
    assert.deepEqual(syncCalls, ["seeded"]);
    if ("code" in result) {
      assert.fail(`expected recovered response, got ${result.code}`);
    }
    assert.equal(result.value, "rebuilt-and-synced");

    const audited = result as HandlerResponse & FreshnessAuditedResponse;
    assert.equal(audited.freshness_audit.pre_call_index_version_was_old, true);
    assert.equal(audited.freshness_audit.index_version_rebuilt_from, "6");
    assert.equal(audited.freshness_audit.index_version_rebuilt_to, "7");
    assert.equal(audited.freshness_audit.pre_call_index_was_stale, true);
    assert.deepEqual(audited.freshness_audit.drifted_files_synced, [
      "_source/entities/ENT-0002.yaml"
    ]);
    assert.equal(Number.isInteger(audited.freshness_audit.build_duration_ms), true);
    assert.equal(Number.isInteger(audited.freshness_audit.sync_duration_ms), true);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("withIndexFreshnessGuard preserves stale_index when sync does not repair staleness", async () => {
  const root = createTempRepoRoot();

  try {
    let calls = 0;
    const guarded = withIndexFreshnessGuard<HandlerArgs, HandlerResponse>(
      async () => {
        calls += 1;
        return staleIndexError();
      },
      {
        syncWorldIndex: () => 0
      }
    );

    const result = await withRepoRoot(root, () => guarded({ world_slug: "seeded" }));

    assert.equal(calls, 2);
    assert.equal("code" in result, true);
    assert.equal((result as McpError).code, "stale_index");
    assert.equal((result as McpError).details?.recovery_attempted, "sync");
    assert.equal((result as McpError).details?.recovery_outcome, "still_stale");
  } finally {
    destroyTempRepoRoot(root);
  }
});
