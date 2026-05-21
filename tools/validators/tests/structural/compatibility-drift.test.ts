import assert from "node:assert/strict";
import test from "node:test";

import { compatibilityDrift } from "../../src/structural/compatibility-drift.js";
import { context, record } from "./helpers.js";

test("compatibility_drift reports legacy optional directory and remaining optional active-record key absence as info", async () => {
  const verdicts = await compatibilityDrift.run(undefined, context([
    storyPage("PG-1", {
      STENT: ["STENT-1"],
      STSTAT: ["STSTAT-1"],
      STLOC: ["STLOC-1"],
      STINT: [],
      SF: [],
      BEL: [],
      OBL: [],
      CNSQ: [],
      THR: [],
      SREL: [],
      STOBJ: []
    })
  ]));

  assert.equal(verdicts.filter((verdict) => verdict.code === "compat_optional_directory_absent").length, 6);
  assert.equal(verdicts.filter((verdict) => verdict.code === "compat_missing_active_record_key").length, 1);
  assert.ok(verdicts.every((verdict) => verdict.severity === "info"));
  const classification = verdicts.find((verdict) => verdict.code === "compatibility_drift.classification");
  assert.deepEqual((classification?.detail as { classifications: string[] }).classifications, [
    "compatible_optional_absence",
    "grandfathered_snapshot_shape"
  ]);
});

test("compatibility_drift classifies current-contract bundles with full optional surfaces", async () => {
  const verdicts = await compatibilityDrift.run(undefined, context([
    storyPage("PG-1", fullActiveRecords()),
    optionalRecord("pressure_clock_record", "CLK-1", "clocks"),
    optionalRecord("story_secret_record", "STSEC-1", "secrets"),
    optionalRecord("story_question_record", "STQ-1", "story-questions"),
    optionalRecord("story_plan_record", "STPLAN-1", "plans"),
    optionalRecord("story_emotion_record", "STEMO-1", "emotions"),
    optionalRecord("story_diegetic_artifact_record", "DA-1", "artifacts")
  ]));

  assert.deepEqual(verdicts.map((verdict) => verdict.code), ["compatibility_drift.classification"]);
  assert.deepEqual((verdicts[0]?.detail as { classifications: string[] }).classifications, ["current_contract"]);
});

test("compatibility_drift warns when a new PG omits current optional active-record keys", async () => {
  const verdicts = await compatibilityDrift.run(undefined, context([
    storyPage("PG-1", fullActiveRecords()),
    storyPage("PG-2", {
      STENT: ["STENT-1"],
      STSTAT: ["STSTAT-1"],
      STLOC: ["STLOC-1"],
      STINT: [],
      SF: [],
      BEL: [],
      OBL: [],
      CNSQ: [],
      THR: [],
      SREL: [],
      STOBJ: []
    }, { parent_page_id: "PG-1" })
  ], {
    run_mode: "pre-apply",
    patch_plan: patchPlan("PG-2")
  }));

  const warning = verdicts.find((verdict) => verdict.code === "compat_requires_migration_patch");
  assert.ok(warning);
  assert.equal(warning.severity, "warn");
  assert.deepEqual((warning.detail as { missing_keys: string[] }).missing_keys, ["DA", "CLK", "STSEC", "STQ", "STPLAN", "STEMO"]);
});

test("compatibility_drift skips non-page pre-apply plans", () => {
  assert.equal(compatibilityDrift.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: { ...patchPlan("PG-2"), patches: [] }
  })), false);
});

function storyPage(
  id: string,
  activeRecords: Record<string, string[]>,
  overrides: Record<string, unknown> = {}
) {
  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      state_snapshot: {
        active_records: activeRecords
      },
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function optionalRecord(nodeType: string, id: string, sourceDir: string) {
  const filePath = nodeType === "story_character_authority_record"
    ? `stories/test-story/${sourceDir}/${id}.md`
    : `stories/test-story/_source/${sourceDir}/${id}.yaml`;
  return {
    ...record(nodeType, `test-story:${id}`, filePath, {
      id,
      story_id: "STORY-1"
    }),
    story_slug: "test-story"
  };
}

function fullActiveRecords(): Record<string, string[]> {
  return {
    STENT: ["STENT-1"],
    STINT: [],
    SF: [],
    BEL: [],
    OBL: [],
    CNSQ: [],
    THR: [],
    SREL: [],
    STLOC: ["STLOC-1"],
    STOBJ: [],
    DA: [],
    STCHAR: [],
    STSTAT: ["STSTAT-1"],
    CLK: [],
    STSEC: [],
    STQ: [],
    STPLAN: [],
    STEMO: []
  };
}

function patchPlan(pageId: string) {
  return {
    plan_id: "plan-compatibility-drift",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "page_cycle_accept",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: { pg_ids: [pageId] },
    patches: [
      {
        op: "create_pg_record" as const,
        target_world: "test",
        payload: {
          story_slug: "test-story",
          record: { id: pageId, story_id: "STORY-1" }
        }
      }
    ]
  };
}
