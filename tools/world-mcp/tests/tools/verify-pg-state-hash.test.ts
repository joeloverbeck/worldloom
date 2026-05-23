import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { computePgStateHash, computePlanHash } from "../../src/package-interop.js";
import { verifyPgStateHash } from "../../src/tools/verify-pg-state-hash.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";

const WORLD_SLUG = "seeded";
const STORY_SLUG = "red-bunny";

interface SeedPgOptions {
  pageId?: string;
  planBody?: string | null;
  pgOverrides?: Record<string, unknown>;
}

function buildPgRecord(args: { pageId: string; planHash: string; overrides?: Record<string, unknown> }) {
  const base = {
    id: args.pageId,
    story_id: "STORY-1",
    parent_page_id: null,
    turn_index: 3,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
    plan: { plan_hash: args.planHash },
    emitted_choices: [],
    state_snapshot: {
      active_records: {},
      visible_affordances: []
    }
  };

  const withoutStateHash = { ...base };
  return {
    ...withoutStateHash,
    state_hash: computePgStateHash(withoutStateHash),
    ...args.overrides
  };
}

function toYaml(record: Record<string, unknown>): string {
  return [
    `id: ${record.id}`,
    `story_id: ${record.story_id}`,
    `parent_page_id: ${record.parent_page_id === null ? "null" : String(record.parent_page_id)}`,
    `turn_index: ${record.turn_index}`,
    "input:",
    "  choice_id: null",
    "  manual_action_text: null",
    "  resolved_event_id: null",
    "plan:",
    `  plan_hash: ${(record.plan as { plan_hash: string }).plan_hash}`,
    "emitted_choices: []",
    "state_snapshot:",
    "  active_records: {}",
    "  visible_affordances: []",
    `state_hash: ${record.state_hash}`,
    ""
  ].join("\n");
}

function seedPg(root: string, options: SeedPgOptions = {}): { pageId: string; planHash: string; stateHash: string } {
  const pageId = options.pageId ?? "PG-3";
  const planBody = options.planBody === undefined ? "Committed page plan.\n" : options.planBody;
  const planHash = computePlanHash(Buffer.from(planBody ?? "", "utf8"));
  const pgRecord = buildPgRecord({
    pageId,
    planHash,
    ...(options.pgOverrides !== undefined ? { overrides: options.pgOverrides } : {})
  });

  seedWorld(root, {
    worldSlug: WORLD_SLUG,
    nodes: [
      {
        node_id: `${STORY_SLUG}:${pageId}`,
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/pages/${pageId}.yaml`,
        heading_path: pageId,
        node_type: "page_record",
        body: toYaml(pgRecord)
      }
    ]
  });

  if (planBody !== null) {
    const planPath = path.join(
      root,
      "worlds",
      WORLD_SLUG,
      "stories",
      STORY_SLUG,
      "pages-prose-plans",
      `${pageId}.md`
    );
    mkdirSync(path.dirname(planPath), { recursive: true });
    writeFileSync(planPath, planBody, "utf8");
  }

  return { pageId, planHash, stateHash: pgRecord.state_hash as string };
}

async function withSeededPg<T>(
  options: SeedPgOptions,
  run: (root: string, seeded: ReturnType<typeof seedPg>) => Promise<T>
): Promise<T> {
  const root = createTempRepoRoot();
  try {
    const seeded = seedPg(root, options);
    return await withRepoRoot(root, () => run(root, seeded));
  } finally {
    destroyTempRepoRoot(root);
  }
}

test("verifyPgStateHash returns matching state and plan hashes for an unmodified PG", async () => {
  await withSeededPg({}, async (_root, seeded) => {
    const result = await verifyPgStateHash({
      world_slug: WORLD_SLUG,
      story_slug: STORY_SLUG,
      page_id: seeded.pageId
    });

    assert.ok(!("code" in result));
    assert.equal(result.recorded_state_hash, seeded.stateHash);
    assert.equal(result.computed_state_hash, seeded.stateHash);
    assert.equal(result.state_hash_match, true);
    assert.equal(result.recorded_plan_hash, seeded.planHash);
    assert.equal(result.computed_plan_hash, seeded.planHash);
    assert.equal(result.plan_hash_match, true);
  });
});

test("verifyPgStateHash reports state_hash_match false for a tampered committed PG", async () => {
  await withSeededPg({ pgOverrides: { turn_index: 4 } }, async (_root, seeded) => {
    const result = await verifyPgStateHash({
      world_slug: WORLD_SLUG,
      story_slug: STORY_SLUG,
      page_id: seeded.pageId
    });

    assert.ok(!("code" in result));
    assert.equal(result.recorded_state_hash, seeded.stateHash);
    assert.notEqual(result.computed_state_hash, seeded.stateHash);
    assert.equal(result.state_hash_match, false);
  });
});

test("verifyPgStateHash reports advisory plan_hash drift without changing state_hash verdict", async () => {
  await withSeededPg({}, async (root, seeded) => {
    const planPath = path.join(
      root,
      "worlds",
      WORLD_SLUG,
      "stories",
      STORY_SLUG,
      "pages-prose-plans",
      `${seeded.pageId}.md`
    );
    writeFileSync(planPath, "Committed page plan.\nPost-write drift.\n", "utf8");

    const result = await verifyPgStateHash({
      world_slug: WORLD_SLUG,
      story_slug: STORY_SLUG,
      page_id: seeded.pageId
    });

    assert.ok(!("code" in result));
    assert.equal(result.state_hash_match, true);
    assert.equal(result.plan_hash_match, false);
    assert.notEqual(result.computed_plan_hash, seeded.planHash);
  });
});

test("verifyPgStateHash treats a missing prose plan as non-fatal advisory state", async () => {
  await withSeededPg({ planBody: null }, async (_root, seeded) => {
    const result = await verifyPgStateHash({
      world_slug: WORLD_SLUG,
      story_slug: STORY_SLUG,
      page_id: seeded.pageId
    });

    assert.ok(!("code" in result));
    assert.equal(result.state_hash_match, true);
    assert.equal(result.computed_plan_hash, null);
    assert.equal(result.plan_hash_match, null);
  });
});

test("verifyPgStateHash returns invalid_input for a missing page", async () => {
  await withSeededPg({}, async () => {
    const result = await verifyPgStateHash({
      world_slug: WORLD_SLUG,
      story_slug: STORY_SLUG,
      page_id: "PG-999"
    });

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "page_id");
  });
});
