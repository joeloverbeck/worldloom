import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import Database from "better-sqlite3";

import { build } from "@worldloom/world-index/commands/build";
import { computePgStateHash } from "@worldloom/world-index/hash/content";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { replayActiveRecords } from "../../src/_helpers/state-snapshot-replay.js";
import { runValidators } from "../../src/framework/run.js";
import type { IndexedRecord } from "../../src/framework/types.js";
import {
  AFFECT_KINDS,
  BEHAVIORAL_PRESSURES,
  EMOTION_INTENSITIES,
  PRED_TYPES
} from "../../src/rules/_shared/predicate-dsl-grammar.js";
import { structuralValidators } from "../../src/public/registry.js";
import {
  MIDSTORY_TRIGGERS_STEMO,
  MIDSTORY_TRIGGERS_STPLAN,
  PLAN_RELATIONS
} from "../../src/structural/midstory-introduction-utils.js";
import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { snapshotReplayEquality } from "../../src/structural/snapshot-replay-equality.js";
import { context, record } from "../structural/helpers.js";

type Ajv2020Instance = {
  compile(schema: unknown): ValidateFunction;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

const WORLD_SLUG = "spec47-world";
const STORY_SLUG = "spec47-story";

const SPEC47_EDGE_TYPES = [
  "plan_holder",
  "plan_root_intention",
  "plan_belief_basis",
  "plan_resource_basis",
  "plan_blocker",
  "plan_current_step_target",
  "plan_created_by_event",
  "plan_supersedes",
  "emotion_holder",
  "emotion_trigger_event",
  "emotion_appraisal_basis",
  "emotion_oriented_toward",
  "emotion_supersedes",
  "emotion_derived_from"
] as const;

test("SPEC-47 T-1/T-2: STPLAN and STEMO schemas accept contract records and reject narrative-shape fields", () => {
  const planSchema = compileSchema("story-plan");
  const emotionSchema = compileSchema("story-emotion");

  assert.equal(planSchema(validPlan()), true, JSON.stringify(planSchema.errors, null, 2));
  assert.equal(planSchema(validPlan({ planned_resolution: "win the scene" })), false);
  assert.ok(planSchema.errors?.some((error) => error.keyword === "additionalProperties"));

  assert.equal(emotionSchema(validEmotion()), true, JSON.stringify(emotionSchema.errors, null, 2));
  assert.equal(
    emotionSchema(validEmotion({
      status: "dissociated",
      affect_kind: null,
      intensity: undefined,
      appraisal_basis: [],
      behavioral_pressure: []
    })),
    true,
    JSON.stringify(emotionSchema.errors, null, 2)
  );
  assert.equal(emotionSchema(validEmotion({ affect_kind: "surprise" })), false);
  assert.ok(emotionSchema.errors?.some((error) => error.instancePath === "/affect_kind"));
});

test("SPEC-47 T-3: snapshot replay carries STPLAN/STEMO active records through page state", async () => {
  const parentActiveRecords = baseActiveRecords();
  const childActiveRecords = replayActiveRecords(parentActiveRecords, {
    create: ["STPLAN-1", "STEMO-1"],
    supersede: [],
    close: []
  });
  assert.deepEqual(childActiveRecords.STPLAN, ["STPLAN-1"]);
  assert.deepEqual(childActiveRecords.STEMO, ["STEMO-1"]);

  const verdicts = await snapshotReplayEquality.run(undefined, context(snapshotRecords(childActiveRecords), {
    run_mode: "pre-apply",
    patch_plan: patchPlan()
  }));
  assert.deepEqual(verdicts, []);
});

test("SPEC-47 T-4: predicate DSL exposes all plan/emotion predicates and rejects invalid enum values", () => {
  const predicateSchema = compilePredicateSchema();
  const expectedPredicates = [
    "plan_active",
    "plan_blocked",
    "any_plan_active",
    "emotion_active",
    "any_emotion_active",
    "emotion_pressure"
  ];

  for (const pred of expectedPredicates) {
    assert.ok(PRED_TYPES.includes(pred as (typeof PRED_TYPES)[number]), `${pred} should be registered`);
    assert.equal(predicateSchema(validPredicate(pred)), true, `${pred} valid sample should pass`);
  }

  assert.equal(predicateSchema({ pred: "emotion_active", holder: "STENT-1", kind: "surprise" }), false);
  assert.equal(predicateSchema({ pred: "emotion_pressure", holder: "STENT-1", pressure: "teleport" }), false);
});

test("SPEC-47 T-5: structured SE vocabularies preserve STPLAN/STEMO extensions", () => {
  assert.ok(MIDSTORY_TRIGGERS_STPLAN.includes("tactical_approach_committed"));
  assert.ok(MIDSTORY_TRIGGERS_STEMO.includes("event_revealed_truth_to_actor"));
  assert.deepEqual([...PLAN_RELATIONS], [
    "advances",
    "tests",
    "blocks",
    "revises",
    "fulfills",
    "abandons",
    "ignores"
  ]);
  assert.equal((MIDSTORY_TRIGGERS_STPLAN as readonly string[]).includes("planned_resolution_reached"), false);
});

test("SPEC-47 T-6/T-7: world-index build registers and emits all new STPLAN/STEMO edge types", () => {
  const root = createAtomicRepoRoot();

  try {
    addSpec47Story(root);

    const registeredEdgeTypes = storyEdgeTypesFromSource();
    assert.equal(new Set(registeredEdgeTypes).size, registeredEdgeTypes.length);
    for (const edgeType of SPEC47_EDGE_TYPES) {
      assert.ok(registeredEdgeTypes.includes(edgeType), `${edgeType} should be registered`);
    }

    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);
    assert.deepEqual(countEdgeRows(root), {
      plan_holder: 1,
      plan_root_intention: 1,
      plan_belief_basis: 1,
      plan_resource_basis: 6,
      plan_blocker: 1,
      plan_current_step_target: 1,
      plan_created_by_event: 1,
      plan_supersedes: 1,
      emotion_holder: 1,
      emotion_trigger_event: 1,
      emotion_appraisal_basis: 1,
      emotion_oriented_toward: 1,
      emotion_supersedes: 1,
      emotion_derived_from: 2
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SPEC-47 T-8: MCP context-packet source exposes plan/emotion summary contracts", () => {
  const storyBundleContext = readRepoFile("tools/world-mcp/src/context-packet/story-bundle-context.ts");
  const sharedTypes = readRepoFile("tools/world-mcp/src/context-packet/shared.ts");
  const mcpTests = readRepoFile("tools/world-mcp/tests/context-packet/story-bundle-context.test.ts");

  for (const needle of [
    "active_actor_plans",
    "active_emotional_states",
    "active_plan_ids",
    "active_plan_holders",
    "active_emotion_ids",
    "active_emotion_holders",
    "current_step_action_family",
    "behavioral_pressure",
    "agency_effect"
  ]) {
    assert.ok(`${storyBundleContext}\n${sharedTypes}\n${mcpTests}`.includes(needle), `${needle} should be covered`);
  }
});

test("SPEC-47 T-9: present-causal lint rejects narrative-shape framing in SPEC-47 surfaces", () => {
  const surfaces = [
    readRepoFile("tools/validators/src/schemas/story-plan.schema.json"),
    readRepoFile("tools/validators/src/schemas/story-emotion.schema.json"),
    readRepoFile("tools/validators/src/schemas/story-event.schema.json"),
    readRepoFile("tools/validators/src/public/registry.ts"),
    readRepoFile("tools/validators/src/rules/_shared/predicate-dsl-grammar.ts"),
    readRepoFile("tools/validators/src/structural/midstory-introduction-utils.ts"),
    readRepoFile("tools/world-index/src/schema/types.ts"),
    readRepoFile(".claude/skills/_shared-templates/story-state-contract.md")
  ].join("\n");
  const narrativeShapeTokens = [
    "act_",
    "climax_",
    "beat_position_",
    "arc_",
    "expected_outcome_",
    "target_curve_",
    "planned_resolution_",
    "setup_for_",
    "payoff_at_"
  ];

  for (const token of narrativeShapeTokens) {
    assert.equal(new RegExp(`(^|[^a-z])${token}`).test(surfaces), false, `${token} should not appear in present-causal surfaces`);
  }
});

test("SPEC-47 T-10/D-A9: no-regression surfaces and Hook 3 coverage remain wired", async () => {
  const stemoFixtureRecords = stemoRecords();
  const validatorsRun = await runValidators(structuralValidators, undefined, context([
    ...stplanRecords(),
    ...stemoFixtureRecords
  ]));
  assert.equal(validatorsRun.summary.validators_run.filter((name) => name.startsWith("stplan_")).length, 13);
  assert.equal(validatorsRun.summary.validators_run.filter((name) => name.startsWith("stemo_")).length, 9);

  const orientationFixtureSchemaVerdicts = await recordSchemaCompliance.run(
    undefined,
    context(stemoFixtureRecords.filter((record) => ["STEMO-1", "STENT-2"].includes(record.parsed.id as string)))
  );
  assert.deepEqual(orientationFixtureSchemaVerdicts, []);

  const hook3 = readRepoFile("tools/hooks/src/hook3-guard-direct-edit.ts");
  assert.ok(hook3.includes("stories\\/[^/]+\\/_source\\/"));
  assert.ok(hook3.includes("_source/"));
  assert.ok(hook3.includes(".yaml"));
});

function compileSchema(name: string): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(JSON.parse(readFileSync(path.resolve(process.cwd(), "src/schemas", `${name}.schema.json`), "utf8")));
}

function compilePredicateSchema(): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(JSON.parse(readFileSync(path.resolve(process.cwd(), "src/schemas/predicate-dsl-grammar.schema.json"), "utf8")));
}

function validPlan(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STPLAN-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    created_by_event: "SE-1",
    supersedes: null,
    holder: "STENT-1",
    root_intention: "STINT-1",
    objective: "Reach the locked archive.",
    plan_status: "active",
    belief_basis: ["BEL-1"],
    resource_basis: {
      facts: ["SF-1"],
      objects: ["STOBJ-1"],
      locations: ["STLOC-1"],
      artifacts: ["DA-1"],
      relationships: ["SREL-1"],
      obligations: ["OBL-1"]
    },
    blockers: ["THR-1"],
    current_step: {
      action_family: "investigate",
      target_records: ["STOBJ-1"],
      success_condition: { predicates: [{ pred: "record_active", record: "SF-1" }] }
    },
    fallback_steps: [
      {
        action_family: "negotiate",
        trigger_predicates: [{ pred: "obligation_open", obligation: "OBL-1" }],
        target_records: ["STENT-2"]
      }
    ],
    expires_when: "The archive opens or the holder abandons the attempt.",
    derived_from: ["SE-1"],
    ...overrides
  };
}

function validEmotion(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const parsed: Record<string, unknown> = {
    id: "STEMO-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    created_by_event: "SE-1",
    supersedes: null,
    holder: "STENT-1",
    status: "active",
    affect_kind: "fear",
    intensity: "high",
    orientation: { toward_records: ["STENT-2"] },
    appraisal_basis: ["BEL-1"],
    trigger_event: "SE-1",
    behavioral_pressure: ["flee", "protect_other"],
    agency_effect: "constraining",
    expires_when: "The threat is resolved.",
    derived_from: ["SE-1"],
    ...overrides
  };
  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) {
      delete parsed[key];
    }
  }
  return parsed;
}

function validPredicate(pred: string): Record<string, unknown> {
  switch (pred) {
    case "plan_active":
      return { pred, holder: "STENT-1", plan: "STPLAN-1" };
    case "plan_blocked":
      return { pred, holder: "STENT-1" };
    case "any_plan_active":
      return { pred, alias: "active_plan" };
    case "emotion_active":
      return { pred, holder: "STENT-1", kind: "fear", min_intensity: "medium" };
    case "any_emotion_active":
      return { pred, alias: "active_emotion", kind: "relief", min_intensity: "low" };
    case "emotion_pressure":
      return { pred, holder: "STENT-1", pressure: "conceal" };
    default:
      throw new Error(`Unhandled predicate ${pred}`);
  }
}

function baseActiveRecords(): Record<string, string[]> {
  return {
    STENT: ["STENT-1"],
    STINT: ["STINT-1"],
    SF: ["SF-1"],
    BEL: ["BEL-1"],
    OBL: ["OBL-1"],
    CNSQ: [],
    THR: ["THR-1"],
    SREL: [],
    STLOC: ["STLOC-1"],
    STOBJ: [],
    DA: [],
    STSTAT: ["STSTAT-1"],
    STPLAN: [],
    STEMO: []
  };
}

function snapshotRecords(childActiveRecords: Record<string, readonly string[]>): IndexedRecord[] {
  return [
    record("page_record", "test-story:PG-1", "stories/test-story/_source/pages/PG-1.yaml", {
      id: "PG-1",
      story_id: "STORY-1",
      state_snapshot: { active_records: baseActiveRecords() },
      state_hash: "0".repeat(64)
    }),
    record("story_event_record", "test-story:SE-2", "stories/test-story/_source/events/SE-2.yaml", {
      id: "SE-2",
      story_id: "STORY-1",
      event_kind: "selected_choice",
      state_delta: {
        create: ["STPLAN-1", "STEMO-1"],
        supersede: [],
        close: []
      }
    }),
    record("story_plan_record", "test-story:STPLAN-1", "stories/test-story/_source/plans/STPLAN-1.yaml", validPlan()),
    record("story_emotion_record", "test-story:STEMO-1", "stories/test-story/_source/emotions/STEMO-1.yaml", validEmotion()),
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", childPage(childActiveRecords))
  ];
}

function childPage(activeRecords: Record<string, readonly string[]>): Record<string, unknown> {
  const page = {
    id: "PG-2",
    story_id: "STORY-1",
    parent_page_id: "PG-1",
    input: { resolved_event_id: "SE-2" },
    state_snapshot: { active_records: activeRecords },
    plan: {
      path: "pages-prose-plans/PG-2.md",
      plan_hash: "1".repeat(64)
    },
    validation_trace: {
      parent_snapshot_compatibility: "matched parent state_hash"
    }
  };
  return {
    ...page,
    state_hash: computePgStateHash(page)
  };
}

function patchPlan(): PatchPlanEnvelope {
  return {
    plan_id: "plan-spec47-capstone",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "page_cycle_accept",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: { pg_ids: ["PG-2"] },
    patches: [
      {
        op: "create_pg_record",
        target_world: "test",
        payload: {
          story_slug: "test-story",
          record: { id: "PG-2", story_id: "STORY-1" }
        }
      }
    ]
  };
}

function storyEdgeTypesFromSource(): string[] {
  const source = readRepoFile("tools/world-index/src/schema/types.ts");
  const match = /export const STORY_EDGE_TYPES = \[([\s\S]*?)\] as const;/.exec(source);
  assert.ok(match, "STORY_EDGE_TYPES registry should be present");
  const body = match[1] ?? "";
  return Array.from(body.matchAll(/"([^"]+)"/g), (item) => item[1] ?? "");
}

function createAtomicRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "spec47-capstone-"));
  const world = path.join(root, "worlds", WORLD_SLUG);
  mkdirSync(world, { recursive: true });
  writeFileSync(path.join(world, "WORLD_KERNEL.md"), "# SPEC-47 fixture\n", "utf8");
  writeFileSync(path.join(world, "ONTOLOGY.md"), "# Ontology\n", "utf8");
  writeAtomicRecord(world, "canon", "CF-0001.yaml", [
    "id: CF-0001",
    "title: The gate has a keeper",
    "status: hard_canon",
    "type: institution",
    "statement: The gate has a keeper.",
    "scope:",
    "  geographic: local",
    "  temporal: current",
    "  social: public",
    "truth_scope:",
    "  world_level: true",
    "  diegetic_status: objective",
    "domains_affected: [institutions]",
    "required_world_updates: [INSTITUTIONS]",
    "source_basis:",
    "  direct_user_approval: true",
    "modification_history: []"
  ]);
  return root;
}

function addSpec47Story(root: string): void {
  writeStoryRecord(root, "entities", "STENT-1.yaml", [
    "id: STENT-1",
    "story_id: STORY-47",
    "world_ent_id: ENT-1",
    "name: Keeper",
    "role_in_story: [primary_actor]",
    "present_at_start: true",
    "story_only: true",
    "created_at_page: PG-1"
  ]);
  writeStoryRecord(root, "intentions", "STINT-1.yaml", [
    "id: STINT-1",
    "story_id: STORY-47",
    "created_at_page: PG-1",
    "holder: STENT-1",
    "intent: Open the gate.",
    "urgency: high",
    "expires_when: when the gate opens"
  ]);
  writeStoryRecord(root, "plans", "STPLAN-2.yaml", [
    "id: STPLAN-2",
    "story_id: STORY-47",
    "created_at_page: PG-3",
    "created_by_event: SE-3",
    "supersedes: STPLAN-1",
    "holder: STENT-1",
    "root_intention: STINT-1",
    "objective: Open the gate before the watcher arrives.",
    "plan_status: active",
    "belief_basis: [BEL-1]",
    "resource_basis:",
    "  facts: [SF-1]",
    "  objects: [STOBJ-1]",
    "  locations: [STLOC-1]",
    "  artifacts: [DA-1]",
    "  relationships: [SREL-1]",
    "  obligations: [OBL-1]",
    "blockers: [THR-1]",
    "current_step:",
    "  action_family: investigate",
    "  target_records: [STOBJ-1]",
    "  success_condition:",
    "    predicates: []",
    "fallback_steps: []",
    "expires_when: when the gate opens",
    "derived_from: []"
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
    "  toward_records: [STENT-2]",
    "appraisal_basis: [BEL-1]",
    "trigger_event: SE-4",
    "behavioral_pressure: [flee, protect_other]",
    "agency_effect: constraining",
    "expires_when: when the gate opens",
    "derived_from: [SE-4, SREL-1]"
  ]);
}

function countEdgeRows(root: string): Record<(typeof SPEC47_EDGE_TYPES)[number], number> {
  const db = new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), { readonly: true });
  try {
    const rows = db
      .prepare(
        `
          SELECT edge_type
          FROM edges
          WHERE edge_type IN (${SPEC47_EDGE_TYPES.map(() => "?").join(", ")})
        `
      )
      .all(...SPEC47_EDGE_TYPES) as Array<{ edge_type: (typeof SPEC47_EDGE_TYPES)[number] }>;
    const counts = Object.fromEntries(SPEC47_EDGE_TYPES.map((edgeType) => [edgeType, 0])) as Record<
      (typeof SPEC47_EDGE_TYPES)[number],
      number
    >;
    for (const row of rows) {
      counts[row.edge_type] += 1;
    }
    return counts;
  } finally {
    db.close();
  }
}

function writeStoryRecord(root: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function writeAtomicRecord(world: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(world, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function stplanRecords(): IndexedRecord[] {
  return [
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
      id: "PG-2",
      branch_path: ["PG-1", "PG-2"],
      state_snapshot: {
        active_records: {
          STENT: ["STENT-1"],
          STINT: ["STINT-1"],
          BEL: ["BEL-1"],
          SF: ["SF-1"],
          STOBJ: ["STOBJ-1"],
          STLOC: ["STLOC-1"],
          DA: ["DA-1"],
          SREL: ["SREL-1"],
          OBL: ["OBL-1"],
          THR: ["THR-1"],
          STPLAN: ["STPLAN-1"]
        }
      }
    }),
    record("story_entity_record", "test-story:STENT-1", "stories/test-story/_source/entities/STENT-1.yaml", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Holder",
      bound_stchar_id: "STCHAR-1",
      role_in_story: ["primary_actor"]
    }),
    record("intention_record", "test-story:STINT-1", "stories/test-story/_source/intentions/STINT-1.yaml", { id: "STINT-1", created_at_page: "PG-1", holder: "STENT-1" }),
    record("belief_record", "test-story:BEL-1", "stories/test-story/_source/beliefs/BEL-1.yaml", { id: "BEL-1", created_at_page: "PG-1", holder: "STENT-1", basis: { access_records: ["STENT-1"] } }),
    record("story_fact_record", "test-story:SF-1", "stories/test-story/_source/facts/SF-1.yaml", { id: "SF-1", created_at_page: "PG-1" }),
    record("story_object_record", "test-story:STOBJ-1", "stories/test-story/_source/objects/STOBJ-1.yaml", { id: "STOBJ-1", created_at_page: "PG-1", owner: "STENT-1" }),
    record("story_location_record", "test-story:STLOC-1", "stories/test-story/_source/locations/STLOC-1.yaml", { id: "STLOC-1", created_at_page: "PG-1" }),
    record("story_diegetic_artifact_record", "test-story:DA-1", "stories/test-story/_source/artifacts/DA-1.yaml", { id: "DA-1", created_at_page: "PG-1", owner: "STENT-1" }),
    record("relationship_record_story", "test-story:SREL-1", "stories/test-story/_source/relationships/SREL-1.yaml", { id: "SREL-1", created_at_page: "PG-1", participants: ["STENT-1", "STENT-2"] }),
    record("obligation_record", "test-story:OBL-1", "stories/test-story/_source/obligations/OBL-1.yaml", { id: "OBL-1", created_at_page: "PG-1", owed_by: "STENT-1", owed_to: "STENT-2" }),
    record("thread_record", "test-story:THR-1", "stories/test-story/_source/threads/THR-1.yaml", { id: "THR-1", created_at_page: "PG-1" }),
    record("story_event_record", "test-story:SE-1", "stories/test-story/_source/events/SE-1.yaml", { id: "SE-1", created_at_page: "PG-1", world_logic_rationale: "No plan relation.", state_delta: { create: [], supersede: [], close: [] } }),
    record("story_event_record", "test-story:SE-2", "stories/test-story/_source/events/SE-2.yaml", { id: "SE-2", created_at_page: "PG-2", world_logic_rationale: "No plan relation.", state_delta: { create: [], supersede: [], close: [] } }),
    record("story_plan_record", "test-story:STPLAN-1", "stories/test-story/_source/plans/STPLAN-1.yaml", validPlan())
  ];
}

function stemoRecords(): IndexedRecord[] {
  return [
    record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2-stemo.yaml", {
      id: "PG-2",
      branch_path: ["PG-1", "PG-2"],
      state_snapshot: {
        active_records: {
          STENT: ["STENT-1", "STENT-2"],
          STSTAT: ["STSTAT-1", "STSTAT-2"],
          BEL: ["BEL-1"],
          SE: ["SE-1", "SE-2"],
          STEMO: ["STEMO-1"]
        }
      }
    }),
    record("story_entity_record", "test-story:STENT-2", "stories/test-story/_source/entities/STENT-2.yaml", {
      id: "STENT-2",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Visible target",
      bound_stchar_id: "STCHAR-2",
      role_in_story: ["witness"]
    }),
    record("story_status_record", "test-story:STSTAT-1", "stories/test-story/_source/status/STSTAT-1.yaml", {
      id: "STSTAT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      entity: "STENT-1",
      life: "alive",
      agency: "constrained",
      location: "STLOC-1"
    }),
    record("story_status_record", "test-story:STSTAT-2", "stories/test-story/_source/status/STSTAT-2.yaml", {
      id: "STSTAT-2",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      entity: "STENT-2",
      life: "alive",
      agency: "free",
      location: "STLOC-1"
    }),
    record("story_emotion_record", "test-story:STEMO-1", "stories/test-story/_source/emotions/STEMO-1.yaml", validEmotion())
  ];
}

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), "..", "..", relativePath), "utf8");
}

assert.ok(AFFECT_KINDS.includes("fear"));
assert.ok(EMOTION_INTENSITIES.includes("high"));
assert.ok(BEHAVIORAL_PRESSURES.includes("protect_other"));
