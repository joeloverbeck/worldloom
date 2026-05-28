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
  planless?: boolean;
  pgOverrides?: Record<string, unknown>;
}

function buildPgRecord(args: { pageId: string; planHash: string; planless?: boolean; overrides?: Record<string, unknown> }) {
  const base = {
    id: args.pageId,
    story_id: "STORY-1",
    parent_page_id: null,
    turn_index: 3,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
    emitted_choices: [],
    state_snapshot: {
      active_records: {},
      visible_affordances: []
    },
    ...(args.planless === true ? {} : { plan: { plan_hash: args.planHash } })
  };

  const withoutStateHash = { ...base };
  return {
    ...withoutStateHash,
    state_hash: computePgStateHash(withoutStateHash),
    ...args.overrides
  };
}

function toYaml(record: Record<string, unknown>): string {
  const lines = [
    `id: ${record.id}`,
    `story_id: ${record.story_id}`,
    `parent_page_id: ${record.parent_page_id === null ? "null" : String(record.parent_page_id)}`,
    `turn_index: ${record.turn_index}`,
    "input:",
    "  choice_id: null",
    "  manual_action_text: null",
    "  resolved_event_id: null",
    "emitted_choices: []",
    "state_snapshot:",
    "  active_records: {}",
    "  visible_affordances: []",
    `state_hash: ${record.state_hash}`,
    ""
  ];
  if ("plan" in record) {
    lines.splice(8, 0, "plan:", `  plan_hash: ${(record.plan as { plan_hash: string }).plan_hash}`);
  }
  return lines.join("\n");
}

function seedPg(root: string, options: SeedPgOptions = {}): { pageId: string; planHash: string; stateHash: string } {
  const pageId = options.pageId ?? "PG-3";
  const planBody = options.planBody === undefined ? "Committed page plan.\n" : options.planBody;
  const planHash = computePlanHash(Buffer.from(planBody ?? "", "utf8"));
  const pgRecord = buildPgRecord({
    pageId,
    planHash,
    ...(options.planless === undefined ? {} : { planless: options.planless }),
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

test("verifyPgStateHash returns matching state hash for an unmodified legacy PG", async () => {
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
    for (const key of ["recorded", "computed"].map((prefix) => `${prefix}_plan_hash`)) {
      assert.equal(key in result, false);
    }
    assert.equal(["plan", "hash", "match"].join("_") in result, false);
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

test("verifyPgStateHash returns matching state hash for a planless PG", async () => {
  await withSeededPg({ planless: true, planBody: null }, async (_root, seeded) => {
    const result = await verifyPgStateHash({
      world_slug: WORLD_SLUG,
      story_slug: STORY_SLUG,
      page_id: seeded.pageId
    });

    assert.ok(!("code" in result));
    assert.equal(result.recorded_state_hash, seeded.stateHash);
    assert.equal(result.computed_state_hash, seeded.stateHash);
    assert.equal(result.state_hash_match, true);
    assert.equal(["plan", "hash", "match"].join("_") in result, false);
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
