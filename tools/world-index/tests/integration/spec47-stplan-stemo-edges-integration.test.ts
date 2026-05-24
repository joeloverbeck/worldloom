import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { build } from "../../src/commands/build.js";
import { STORY_EDGE_TYPES } from "../../src/schema/types.js";
import { cleanup, createAtomicRepoRoot } from "../helpers/atomic-fixture.js";

const WORLD_SLUG = "atomic-world";
const STORY_SLUG = "spec47-edges";

const SPEC47_EDGE_TYPES = [
  "plan_holder",
  "plan_root_intention",
  "plan_belief_basis",
  "plan_resource_basis",
  "plan_blocker",
  "plan_current_step_target",
  "plan_fallback_step_target",
  "plan_success_predicate_ref",
  "plan_fallback_predicate_ref",
  "plan_derived_from",
  "plan_expires_when_ref",
  "plan_created_by_event",
  "plan_supersedes",
  "emotion_holder",
  "emotion_trigger_event",
  "emotion_appraisal_basis",
  "emotion_oriented_toward",
  "emotion_supersedes",
  "emotion_derived_from",
  "emotion_expires_when_ref"
] as const;

test("SPEC-47/SPEC-49 STPLAN/STEMO edge integration builds all story edge rows", () => {
  const root = createAtomicRepoRoot(WORLD_SLUG);

  try {
    addSpec47Story(root);

    assert.equal(STORY_EDGE_TYPES.length, 79);
    assert.equal(new Set(STORY_EDGE_TYPES).size, STORY_EDGE_TYPES.length);
    for (const edgeType of SPEC47_EDGE_TYPES) {
      assert.ok(STORY_EDGE_TYPES.includes(edgeType), `${edgeType} should be registered`);
    }
    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);

    const rows = edgeRows(root);
    assert.deepEqual(countRows(rows), {
      plan_holder: 1,
      plan_root_intention: 1,
      plan_belief_basis: 2,
      plan_resource_basis: 6,
      plan_blocker: 1,
      plan_current_step_target: 1,
      plan_fallback_step_target: 1,
      plan_success_predicate_ref: 2,
      plan_fallback_predicate_ref: 2,
      plan_derived_from: 1,
      plan_expires_when_ref: 1,
      plan_created_by_event: 1,
      plan_supersedes: 1,
      emotion_holder: 1,
      emotion_trigger_event: 1,
      emotion_appraisal_basis: 2,
      emotion_oriented_toward: 1,
      emotion_supersedes: 1,
      emotion_derived_from: 2,
      emotion_expires_when_ref: 1
    });
    assert.ok(rows.every((row) => row.story_slug === STORY_SLUG));
    assertNoEdgeTarget(rows, "system");
    assertNoEdgeTarget(rows, "unknown");
    assertNoEdgeTarget(rows, "group:watch");
  } finally {
    cleanup(root);
  }
});

function addSpec47Story(root: string): void {
  writeStoryRecord(root, "entities", "STENT-1.yaml", [
    "id: STENT-1",
    "story_id: STORY-47",
    "world_ent_id: ENT-0001",
    "character_id: null",
    "name: Bell Keeper",
    "role_in_story: [primary_actor]",
    "present_at_start: true",
    "story_only: false",
    "created_at_page: PG-1"
  ]);
  writeStoryRecord(root, "intentions", "STINT-1.yaml", [
    "id: STINT-1",
    "story_id: STORY-47",
    "created_at_page: PG-1",
    "supersedes: null",
    "holder: STENT-1",
    "intent: Convene the bell council.",
    "urgency: high",
    "expires_when: after the bell council convenes"
  ]);
  writeStoryRecord(root, "plans", "STPLAN-2.yaml", [
    "id: STPLAN-2",
    "story_id: STORY-47",
    "created_at_page: PG-3",
    "created_by_event: SE-3",
    "supersedes: STPLAN-1",
    "holder: STENT-1",
    "root_intention: STINT-1",
    "objective: Use the watch bell to force a public reckoning.",
    "plan_status: active",
    "belief_basis: [BEL-1, BEL-2]",
    "resource_basis:",
    "  facts: [SF-1]",
    "  objects: [STOBJ-1]",
    "  locations: [STLOC-1]",
    "  artifacts: [DA-1]",
    "  relationships: [SREL-1]",
    "  obligations: [OBL-1]",
    "blockers: [STSEC-1, system, group:watch]",
    "current_step:",
    "  action_family: reveal",
    "  target_records: [STQ-1, unknown]",
    "  success_condition:",
    "    predicates:",
    "      - pred: plan_active(STPLAN-4)",
    "      - pred: record_active(BEL-3)",
    "fallback_steps:",
    "  - action_family: bargain",
    "    target_records: [OBL-2, group:watch]",
    "    trigger_predicates:",
    "      - pred: record_active(STSEC-2)",
    "      - pred: emotion_active(STENT-1, fear)",
    "expires_when: after STPLAN-4 fulfills",
    "derived_from: [SE-2]"
  ]);
  writeStoryRecord(root, "emotions", "STEMO-2.yaml", [
    "id: STEMO-2",
    "story_id: STORY-47",
    "created_at_page: PG-4",
    "created_by_event: SE-4",
    "supersedes: STEMO-1",
    "holder: STENT-1",
    "status: active",
    "affect_kind: fear",
    "intensity: high",
    "orientation:",
    "  toward_records: [STENT-2, system]",
    "appraisal_basis: [BEL-2, BEL-3]",
    "trigger_event: SE-4",
    "behavioral_pressure: [flee, protect_other]",
    "agency_effect: constraining",
    "expires_when: after SE-5 resolves the bell tower",
    "derived_from: [SE-4, SREL-1, group:watch]"
  ]);
}

function edgeRows(root: string): Array<{ edge_type: (typeof SPEC47_EDGE_TYPES)[number]; target_ref: string | null; story_slug: string | null }> {
  const db = new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), { readonly: true });
  try {
    return db
      .prepare(
        `
          SELECT edge_type, target_unresolved_ref AS target_ref, story_slug
          FROM edges
          WHERE story_slug = ?
            AND edge_type IN (${SPEC47_EDGE_TYPES.map(() => "?").join(", ")})
          ORDER BY edge_type, target_ref
        `
      )
      .all(STORY_SLUG, ...SPEC47_EDGE_TYPES) as Array<{
      edge_type: (typeof SPEC47_EDGE_TYPES)[number];
      target_ref: string | null;
      story_slug: string | null;
    }>;
  } finally {
    db.close();
  }
}

function countRows(
  rows: Array<{ edge_type: (typeof SPEC47_EDGE_TYPES)[number] }>
): Record<(typeof SPEC47_EDGE_TYPES)[number], number> {
  const counts = Object.fromEntries(SPEC47_EDGE_TYPES.map((edgeType) => [edgeType, 0])) as Record<
    (typeof SPEC47_EDGE_TYPES)[number],
    number
  >;
  for (const row of rows) {
    counts[row.edge_type] += 1;
  }
  return counts;
}

function assertNoEdgeTarget(rows: Array<{ target_ref: string | null }>, target: string): void {
  assert.equal(
    rows.some((row) => row.target_ref === `${STORY_SLUG}:${target}` || row.target_ref === target),
    false,
    `${target} should not be emitted as an edge target`
  );
}

function writeStoryRecord(root: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}
