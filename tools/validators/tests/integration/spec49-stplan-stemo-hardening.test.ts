import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import Database from "better-sqlite3";
import yaml from "js-yaml";
import { build } from "@worldloom/world-index/commands/build";

import { stateSnapshotIntegrity } from "../../src/structural/state-snapshot-integrity.js";
import { stemoAgencyEffectCompatibility } from "../../src/structural/stemo-agency-effect-compatibility.js";
import { stemoOrientationRecordsExist } from "../../src/structural/stemo-orientation-records-exist.js";
import { stplanEventPlanRelationConsistency } from "../../src/structural/stplan-event-plan-relation-consistency.js";
import { stplanPredicateReferences } from "../../src/structural/stplan-predicate-references.js";
import { context, record } from "../structural/helpers.js";
import {
  baseRecords as planBaseRecords,
  eventBody as planEventBody,
  hasCode as hasPlanCode,
  plan,
  storyRecord as planStoryRecord
} from "../structural/stplan-helpers.js";
import {
  baseRecords as emotionBaseRecords,
  emotion,
  hasCode as hasEmotionCode,
  storyRecord as emotionStoryRecord
} from "../structural/stemo-helpers.js";

type Ajv2020Instance = {
  compile(schema: unknown): ValidateFunction;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

const WORLD_SLUG = "spec49-world";
const STORY_SLUG = "spec49-story";

const SPEC49_EDGE_TYPES = [
  "plan_fallback_step_target",
  "plan_success_predicate_ref",
  "plan_fallback_predicate_ref",
  "plan_derived_from",
  "plan_expires_when_ref",
  "emotion_expires_when_ref"
] as const;

test("SPEC-49 capstone: schema constraints accept new STPLAN/STEMO references and enforce plan lifecycle shape", () => {
  const pageSchema = compileSchema("story-page");
  const choiceSchema = compileSchema("story-choice");
  const planSchema = compileSchema("story-plan");

  assert.equal(pageSchema(validPage()), true, JSON.stringify(pageSchema.errors, null, 2));
  assert.equal(choiceSchema(validChoice()), true, JSON.stringify(choiceSchema.errors, null, 2));

  const activePlanWithoutStep = validPlan({ current_step: undefined });
  assert.equal(planSchema(activePlanWithoutStep), false);
  assert.ok(planSchema.errors?.some((error) => error.keyword === "required" && error.message?.includes("current_step")));

  assert.equal(planSchema(validPlan({ plan_status: "fulfilled", belief_basis: [], current_step: undefined })), true);
  assert.equal(planSchema(validPlan({ belief_basis: [] })), false);
  assert.ok(planSchema.errors?.some((error) => error.keyword === "minItems" && error.instancePath === "/belief_basis"));
});

test("SPEC-49 capstone: structural validators compose the STPLAN/STEMO hardening behaviors", async () => {
  const agencyVerdicts = await stemoAgencyEffectCompatibility.run(
    undefined,
    context(emotionBaseRecords([
      emotionStoryRecord("story_status_record", "STSTAT-1", "status", {
        id: "STSTAT-1",
        created_at_page: "PG-1",
        entity: "STENT-1",
        agency: "free"
      }),
      emotion({ agency_effect: "constraining" })
    ]))
  );
  assert.ok(hasEmotionCode(agencyVerdicts, "stemo_agency_effect_compatibility.unexplained_constraining_effect"));

  const predicateVerdicts = await stplanPredicateReferences.run(
    undefined,
    context(planBaseRecords([
      plan({
        current_step: {
          action_family: "investigate",
          target_records: ["STOBJ-1"],
          success_condition: { predicates: [{ pred: "INVALID_GRAMMAR" }] }
        },
        fallback_steps: [
          {
            action_family: "evade",
            target_records: ["STPLAN-9999"],
            trigger_predicates: [{ pred: "record_active", record: "STPLAN-9999" }]
          }
        ]
      })
    ]))
  );
  assert.ok(hasPlanCode(predicateVerdicts, "stplan_predicate_references.predicate_unparseable"));
  assert.ok(hasPlanCode(predicateVerdicts, "stplan_predicate_references.predicate_record_unresolved"));

  const relationVerdicts = await stplanEventPlanRelationConsistency.run(
    undefined,
    context(planBaseRecords([
      planStoryRecord("story_event_record", "SE-3", "events", {
        ...planEventBody("SE-3", "The event claims to fulfill the plan without fulfilled status.", {
          create: ["STPLAN-2"],
          supersede: ["STPLAN-1"]
        }),
        state_relations: [{ relation: "fulfills", target_record: "STPLAN-1" }]
      }),
      plan(),
      plan({ id: "STPLAN-2", supersedes: "STPLAN-1", plan_status: "blocked" })
    ]))
  );
  assert.ok(hasPlanCode(relationVerdicts, "stplan_event_plan_relation_consistency.fulfills_status_mismatch"));

  const orientationVerdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(emotionBaseRecords([
      emotionStoryRecord("story_entity_record", "STENT-3", "entities", {
        id: "STENT-3",
        created_at_page: "PG-1"
      }),
      emotion({ orientation: { toward_records: ["STENT-3"] } })
    ]))
  );
  assert.ok(hasEmotionCode(orientationVerdicts, "stemo_orientation_records_active.inactive_target"));

  const snapshotVerdicts = await stateSnapshotIntegrity.run(undefined, context([
    record("page_record", `${STORY_SLUG}:PG-2`, `stories/${STORY_SLUG}/_source/pages/PG-2.yaml`, {
      id: "PG-2",
      story_id: "STORY-1",
      input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: "SE-1" },
      state_snapshot: {
        active_records: {
          STCHAR: [],
          STPLAN: ["STPLAN-1"],
          STEMO: ["STEMO-1"]
        }
      }
    }),
    record("story_event_record", `${STORY_SLUG}:SE-1`, `stories/${STORY_SLUG}/_source/events/SE-1.yaml`, {
      id: "SE-1",
      story_id: "STORY-1",
      event_kind: "selected_choice"
    }),
    record("story_plan_record", `${STORY_SLUG}:STPLAN-1`, `stories/${STORY_SLUG}/_source/plans/STPLAN-1.yaml`, {
      id: "STPLAN-1",
      story_id: "STORY-1",
      plan_status: "fulfilled"
    }),
    record("story_emotion_record", `${STORY_SLUG}:STEMO-1`, `stories/${STORY_SLUG}/_source/emotions/STEMO-1.yaml`, {
      id: "STEMO-1",
      story_id: "STORY-1",
      status: "settled"
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: {
      patches: [
        {
          op: "create_pg_record",
          payload: {
            story_slug: STORY_SLUG,
            record: { id: "PG-2", story_id: "STORY-1" }
          }
        }
      ]
    } as any
  }));
  assert.deepEqual(
    snapshotVerdicts
      .filter((verdict) => verdict.code === "state_snapshot_integrity.inactive_active_record")
      .map((verdict) => (verdict.detail as { reference_id: string }).reference_id)
      .sort(),
    ["STEMO-1", "STPLAN-1"]
  );
});

test("SPEC-49 capstone: world-index build emits the new STPLAN/STEMO edge rows", () => {
  const root = createAtomicRepoRoot();

  try {
    addStoryRecords(root);
    const storyEdgeTypes = storyEdgeTypesFromSource();
    for (const edgeType of SPEC49_EDGE_TYPES) {
      assert.ok(storyEdgeTypes.includes(edgeType), `${edgeType} should be registered`);
    }

    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);
    assert.deepEqual(edgeCounts(root), {
      plan_fallback_step_target: 1,
      plan_success_predicate_ref: 2,
      plan_fallback_predicate_ref: 2,
      plan_derived_from: 1,
      plan_expires_when_ref: 1,
      emotion_expires_when_ref: 1
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SPEC-49 capstone: Phase 2k health-audit prose names the four deterministic checks", () => {
  const skill = readRepoFile(".claude/skills/branching-story-health-audit/SKILL.md");
  for (const needle of [
    "stplan-contradictory-cluster",
    "stplan-long-blocked-no-fallback",
    "stemo-contradictory-stack",
    "stemo-suppression-render-conflict",
    "contradictory_affect_pairs",
    "legacy bundles needing repair"
  ]) {
    assert.ok(skill.includes(needle), `${needle} should be documented`);
  }
});

test("SPEC-50 D.1: health-audit contradictory affect table stays inside STEMO enum", () => {
  const skill = readRepoFile(".claude/skills/branching-story-health-audit/SKILL.md");
  const emotionSchema = JSON.parse(readRepoFile("tools/validators/src/schemas/story-emotion.schema.json")) as {
    properties?: { affect_kind?: { enum?: unknown[] } };
  };
  const affectKinds = new Set(
    (emotionSchema.properties?.affect_kind?.enum ?? []).filter((item): item is string => typeof item === "string")
  );
  const table = parseContradictoryAffectTable(skill);

  assert.equal(table.length, 5);
  for (const pair of table) {
    assert.ok(affectKinds.has(pair.a), `${pair.a} should be a STEMO affect_kind`);
    assert.ok(affectKinds.has(pair.b), `${pair.b} should be a STEMO affect_kind`);
  }
  assert.ok(table.some((pair) => pair.a === "tenderness" && pair.b === "contempt" && pair.same_target_required));
  assert.ok(table.some((pair) => pair.a === "grief" && pair.b === "joy" && !pair.same_target_required));
});

function compileSchema(name: string): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", `${name}.schema.json`), "utf8")));
}

function parseContradictoryAffectTable(skill: string): Array<{ a: string; b: string; same_target_required: boolean }> {
  const match = skill.match(/```yaml\n(contradictory_affect_pairs:[\s\S]*?)\n```/);
  assert.ok(match, "contradictory_affect_pairs YAML block should exist");
  const yamlSource = match[1];
  assert.ok(yamlSource, "contradictory_affect_pairs YAML source should be captured");
  const parsed = yaml.load(yamlSource) as {
    contradictory_affect_pairs?: Array<{ a?: unknown; b?: unknown; same_target_required?: unknown }>;
  };
  assert.ok(Array.isArray(parsed.contradictory_affect_pairs), "contradictory_affect_pairs should be an array");
  return parsed.contradictory_affect_pairs.map((pair) => {
    const { a, b, same_target_required: sameTargetRequired } = pair;
    if (typeof a !== "string" || typeof b !== "string" || typeof sameTargetRequired !== "boolean") {
      assert.fail("each contradictory_affect_pairs entry should have string a/b and boolean same_target_required");
    }
    return {
      a,
      b,
      same_target_required: sameTargetRequired
    };
  });
}

function validPage(): Record<string, unknown> {
  return {
    id: "PG-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: null,
    branch_path: ["PG-1"],
    turn_index: 0,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: "SE-1" },
    state_hash_parent: null,
    prose_plan_path: "pages-prose-plans/PG-1.md",
    plan: { plan_hash: "0".repeat(64) },
    state_hash: "1".repeat(64),
    state_snapshot: {
      canon_revision: "CH-1",
      entity_status: {},
      unresolved_mystery_claims: [],
      visible_affordances: [],
      active_records: {
        STCHAR: [],
        STPLAN: ["STPLAN-1"],
        STEMO: ["STEMO-1"]
      }
    },
    emitted_choices: [],
    validation_trace: { input_legality: "PASS" }
  };
}

function validChoice(): Record<string, unknown> {
  return {
    id: "CHC-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    surface_label: "Follow the tactical pressure",
    player_visible_intent: "Act from the current plan and emotion.",
    target_or_action_families: ["decide"],
    likely_state_pressure: "plan and emotion pressure",
    grounded_in: {
      records: ["STPLAN-1", "STEMO-1", "CLK-1", "STSEC-1", "STQ-1", "STINT-1", "SF-1"]
    }
  };
}

function validPlan(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const parsed: Record<string, unknown> = {
    id: "STPLAN-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    created_by_event: "SE-1",
    supersedes: null,
    holder: "STENT-1",
    root_intention: "STINT-1",
    objective: "Reach the archive.",
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
    fallback_steps: [],
    expires_when: "The archive opens.",
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

function createAtomicRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "spec49-capstone-"));
  const world = path.join(root, "worlds", WORLD_SLUG);
  mkdirSync(world, { recursive: true });
  writeFileSync(path.join(world, "WORLD_KERNEL.md"), "# SPEC-49 fixture\n", "utf8");
  writeFileSync(path.join(world, "ONTOLOGY.md"), "# Ontology\n", "utf8");
  writeRecord(world, "_source/canon", "CF-1.yaml", [
    "id: CF-1",
    "title: The archive exists",
    "status: hard_canon",
    "type: place",
    "statement: The archive exists.",
    "scope: { geographic: local, temporal: current, social: public }",
    "truth_scope: { world_level: true, diegetic_status: objective }",
    "domains_affected: [places]",
    "required_world_updates: [GEOGRAPHY]",
    "source_basis: { direct_user_approval: true }",
    "modification_history: []"
  ]);
  return root;
}

function addStoryRecords(root: string): void {
  writeStoryRecord(root, "plans", "STPLAN-2.yaml", [
    "id: STPLAN-2",
    "story_id: STORY-49",
    "created_at_page: PG-3",
    "created_by_event: SE-3",
    "supersedes: STPLAN-1",
    "holder: STENT-1",
    "root_intention: STINT-1",
    "objective: Reach the archive before dawn.",
    "plan_status: active",
    "belief_basis: [BEL-1, BEL-2]",
    "resource_basis: { facts: [], objects: [], locations: [], artifacts: [], relationships: [], obligations: [] }",
    "blockers: []",
    "current_step:",
    "  action_family: investigate",
    "  target_records: []",
    "  success_condition:",
    "    predicates:",
    "      - pred: plan_active(STPLAN-4)",
    "      - pred: record_active(BEL-3)",
    "fallback_steps:",
    "  - action_family: evade",
    "    target_records: [OBL-2]",
    "    trigger_predicates:",
    "      - pred: record_active(STSEC-2)",
    "      - pred: emotion_active(STENT-1, fear)",
    "expires_when: after STPLAN-4 fulfills",
    "derived_from: [SE-2]"
  ]);
  writeStoryRecord(root, "emotions", "STEMO-2.yaml", [
    "id: STEMO-2",
    "story_id: STORY-49",
    "created_at_page: PG-4",
    "created_by_event: SE-4",
    "supersedes: STEMO-1",
    "holder: STENT-1",
    "status: active",
    "affect_kind: fear",
    "intensity: high",
    "orientation: { toward_records: [] }",
    "appraisal_basis: []",
    "trigger_event: SE-4",
    "behavioral_pressure: [flee]",
    "agency_effect: constraining",
    "expires_when: after SE-5 resolves the tower",
    "derived_from: []"
  ]);
}

function edgeCounts(root: string): Record<(typeof SPEC49_EDGE_TYPES)[number], number> {
  const db = new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), { readonly: true });
  try {
    const rows = db
      .prepare(`SELECT edge_type FROM edges WHERE edge_type IN (${SPEC49_EDGE_TYPES.map(() => "?").join(", ")})`)
      .all(...SPEC49_EDGE_TYPES) as Array<{ edge_type: (typeof SPEC49_EDGE_TYPES)[number] }>;
    const counts = Object.fromEntries(SPEC49_EDGE_TYPES.map((edgeType) => [edgeType, 0])) as Record<
      (typeof SPEC49_EDGE_TYPES)[number],
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

function storyEdgeTypesFromSource(): string[] {
  const source = readRepoFile("tools/world-index/src/schema/types.ts");
  const match = /export const STORY_EDGE_TYPES = \[([\s\S]*?)\] as const;/.exec(source);
  assert.ok(match, "STORY_EDGE_TYPES registry should be present");
  return Array.from((match[1] ?? "").matchAll(/"([^"]+)"/g), (item) => item[1] ?? "");
}

function writeStoryRecord(root: string, directory: string, fileName: string, lines: string[]): void {
  writeRecord(path.join(root, "worlds", WORLD_SLUG), `stories/${STORY_SLUG}/_source/${directory}`, fileName, lines);
}

function writeRecord(world: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(world, directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), "..", "..", relativePath), "utf8");
}
