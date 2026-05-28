import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import { parseStoryBundleSourceFile } from "../../src/parse/atomic.js";
import { STORY_EDGE_TYPES } from "../../src/schema/types.js";

const STORY_SLUG = "harborwatch";

const EDGE_PARITY_CASES = [
  {
    directoryName: "choices",
    recordId: "CHC-2",
    lines: [
      "id: CHC-2",
      "story_id: STORY-50",
      "created_at_page: PG-4",
      "surface_label: Ring the bell.",
      "player_visible_intent: Warn the quay.",
      "target_or_action_families: [signal]",
      "likely_state_pressure: Raises alarm before the gate opens.",
      "grounded_in:",
      "  records: [STENT-1, STSTAT-1]",
      "  affordance_ordinals: [1]"
    ],
    expectedEdgeTypes: ["created_at_page", "choice_grounded_in", "choice_affordance_ordinal"]
  },
  {
    directoryName: "storylets",
    recordId: "SLT-3",
    lines: [
      "id: SLT-3",
      "story_id: STORY-50",
      "scope:",
      "  visibility: global_author_pool",
      "preconditions:",
      "  hard:",
      "    - pred: any_plan_active(plan_axis, STPLAN-2)",
      "  soft:",
      "    - pred: secret_unrevealed(STSEC-1)",
      "effects:",
      "  create: [STQ-1]",
      "  supersede: [STPLAN-3]",
      "  close: [CLK-1]",
      "exit_options:",
      "  - action_family: signal",
      "    surface_hint: Ring the watch bell.",
      "    likely_effects: [STSEC-2]"
    ],
    expectedEdgeTypes: [
      "storylet_predicate_ref",
      "storylet_effect_ref",
      "storylet_exit_likely_effect_ref",
      "storylet_predicate_pred",
      "storylet_predicate_class",
      "storylet_action_family"
    ]
  },
  {
    directoryName: "pages",
    recordId: "PG-4",
    lines: [
      "id: PG-4",
      "story_id: STORY-50",
      "branch_id: BR-1",
      "parent_page_id: PG-3",
      "branch_path: [PG-1, PG-4]",
      "turn_index: 4",
      "input:",
      "  choice_id: CHC-1",
      "  manual_action_text: null",
      "  resolved_event_id: SE-4",
      "state_hash_parent: null",
      "state_hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "state_snapshot:",
      "  canon_revision: CH-1",
      "  active_records:",
      "    STENT: [STENT-1]",
      "    STSTAT: [STSTAT-1]",
      "  visible_affordances:",
      "    - ordinal: 1",
      "      label: Harbor gate",
      "      grounded_in: [STLOC-1]",
      "      available_to: [STENT-1]",
      "      action_families: [move]",
      "  continuation:",
      "    has_eligible_commitment_block: true",
      "    terminal_status: open",
      "    terminal_rationale: null",
      "plan:",
      "  plan_hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "prose_plan_path: pages-prose/PG-4.md",
      "emitted_choices: [CHC-2]",
      "validation_trace: {}"
    ],
    expectedEdgeTypes: ["parent_page", "page_active_record", "page_visible_affordance_record", "page_emitted_choice"]
  },
  {
    directoryName: "scenes",
    recordId: "SCN-2",
    lines: [
      "id: SCN-2",
      "story_id: STORY-50",
      "branch_id: BR-1",
      "supersedes: null",
      "status: planned",
      "pg_ids: [PG-3, PG-4]",
      "start_page_id: PG-3",
      "end_page_id: PG-4",
      "previous_scene_id: SCN-1",
      "choice_surface_page_id: PG-4",
      "emitted_choice_ids: [CHC-2, CHC-3]",
      "title: Harbor Bell",
      "slug: harbor-bell",
      "scene_descriptor: The bell keeper reaches the gate.",
      "boundary_rationale: The scene ends at the playable bell choice.",
      "prose_plan_path: scene-prose-plans/SCN-2.md",
      "prose_path: scene-prose/SCN-2.md",
      "receipt_path: scene-prose-receipts/SCN-2.yaml"
    ],
    expectedEdgeTypes: ["scene_branch", "scene_includes_page", "scene_emitted_choice", "scene_previous_scene"]
  },
  {
    directoryName: "events",
    recordId: "SE-4",
    lines: [
      "id: SE-4",
      "story_id: STORY-50",
      "created_at_page: PG-4",
      "parent_page_id: PG-3",
      "event_kind: selected_choice",
      "actor: STENT-1",
      "targets: [STENT-2]",
      "commitment:",
      "  selected_slt_id: SLT-3",
      "  selection_source: emitted_choice",
      "  alias_bindings:",
      "    actor: STENT-1",
      "    clock: CLK-1",
      "    plan: STPLAN-2",
      "outcome_route: accept",
      "world_logic_rationale: The accepted choice closes a clock and introduces a question.",
      "record_introductions:",
      "  - record_id: STQ-4",
      "    class: STQ",
      "    trigger: explicit_question_raised",
      "    evidence: [PG-4, SE-3]",
      "    distinct_from: []",
      "state_relations:",
      "  - relation: advances",
      "    target_record: STPLAN-2",
      "state_delta:",
      "  create: [STPLAN-5, STEMO-5]",
      "  supersede: [STPLAN-4, STEMO-4]",
      "  close: [CLK-1, STSEC-1]",
      "promotion_claims: []"
    ],
    expectedEdgeTypes: [
      "created_at_page",
      "event_actor",
      "event_target",
      "event_selected_storylet",
      "state_delta_create",
      "state_delta_supersede",
      "state_delta_close",
      "event_state_relation_target",
      "event_alias_binding",
      "event_introduces_record",
      "creation_evidence"
    ]
  },
  {
    directoryName: "plans",
    recordId: "STPLAN-2",
    lines: [
      "id: STPLAN-2",
      "story_id: STORY-50",
      "created_at_page: PG-3",
      "created_by_event: SE-3",
      "supersedes: STPLAN-1",
      "holder: STENT-1",
      "root_intention: STINT-1",
      "objective: Use the watch bell to force a public reckoning.",
      "plan_status: active",
      "belief_basis: [BEL-1]",
      "resource_basis:",
      "  facts: [SF-1]",
      "  objects: [STOBJ-1]",
      "  locations: [STLOC-1]",
      "  artifacts: [DA-1]",
      "  relationships: [SREL-1]",
      "  obligations: [OBL-1]",
      "blockers: [STSEC-1]",
      "current_step:",
      "  action_family: reveal",
      "  target_records: [STQ-1]",
      "  success_condition:",
      "    predicates:",
      "      - pred: plan_active(STPLAN-4)",
      "fallback_steps:",
      "  - action_family: bargain",
      "    target_records: [OBL-2]",
      "    trigger_predicates:",
      "      - pred: record_active(STSEC-2)",
      "expires_when: after STPLAN-4 fulfills",
      "derived_from: [SE-2]"
    ],
    expectedEdgeTypes: [
      "created_at_page",
      "plan_holder",
      "plan_root_intention",
      "plan_belief_basis",
      "plan_resource_basis",
      "plan_blocker",
      "plan_current_step_target",
      "plan_success_predicate_ref",
      "plan_fallback_step_target",
      "plan_fallback_predicate_ref",
      "plan_derived_from",
      "plan_expires_when_ref",
      "plan_created_by_event",
      "plan_supersedes"
    ]
  },
  {
    directoryName: "emotions",
    recordId: "STEMO-2",
    lines: [
      "id: STEMO-2",
      "story_id: STORY-50",
      "created_at_page: PG-4",
      "created_by_event: SE-4",
      "supersedes: STEMO-1",
      "holder: STENT-1",
      "status: active",
      "affect_kind: fear",
      "intensity: high",
      "orientation:",
      "  toward_records: [STENT-2]",
      "appraisal_basis: [BEL-2]",
      "trigger_event: SE-4",
      "behavioral_pressure: [flee, protect_other]",
      "agency_effect: constraining",
      "expires_when: after SE-5 resolves the bell tower",
      "derived_from: [SE-4, SREL-1]"
    ],
    expectedEdgeTypes: [
      "created_at_page",
      "emotion_holder",
      "emotion_trigger_event",
      "emotion_appraisal_basis",
      "emotion_oriented_toward",
      "emotion_supersedes",
      "emotion_derived_from",
      "emotion_expires_when_ref"
    ]
  }
] as const;

const EXPECTED_PARITY_EDGE_TYPES = unique(
  EDGE_PARITY_CASES.flatMap((parityCase) => parityCase.expectedEdgeTypes)
);

test("SPEC-50 story-edge parity fields emit registered edge types", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-story-edge-parity-"));

  try {
    const emittedEdgeTypes = new Set<string>();

    for (const parityCase of EDGE_PARITY_CASES) {
      writeStoryRecord(root, STORY_SLUG, parityCase.directoryName, parityCase.recordId, parityCase.lines);

      const parsed = parseStoryBundleSourceFile(
        root,
        "fixture-world",
        `stories/${STORY_SLUG}/_source/${parityCase.directoryName}/${parityCase.recordId}.yaml`
      );
      const caseEdgeTypes = unique(parsed.edges.map((row) => row.edge_type));

      assert.deepEqual(
        [...caseEdgeTypes].sort(),
        [...parityCase.expectedEdgeTypes].sort(),
        `${parityCase.recordId} should emit only the expected parity edge types`
      );

      for (const edgeType of caseEdgeTypes) {
        emittedEdgeTypes.add(edgeType);
      }
    }

    assert.deepEqual([...emittedEdgeTypes].sort(), [...EXPECTED_PARITY_EDGE_TYPES].sort());
    for (const edgeType of emittedEdgeTypes) {
      assert.equal(
        (STORY_EDGE_TYPES as readonly string[]).includes(edgeType),
        true,
        `${edgeType} must remain registered in STORY_EDGE_TYPES`
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CHC parity fixtures satisfy the story-choice schema field contract", () => {
  const choiceCase = EDGE_PARITY_CASES.find((parityCase) => parityCase.recordId === "CHC-2");
  assert.ok(choiceCase, "CHC parity fixture exists");

  const validRecord = parseYaml(choiceCase.lines.join("\n"));
  assert.deepEqual(validateStoryChoiceTopLevel(validRecord), []);

  const legacyRecord = { ...validRecord, parent_page_id: "PG-4" };
  assert.deepEqual(validateStoryChoiceTopLevel(legacyRecord), ["additional property parent_page_id"]);
});

function writeStoryRecord(root: string, storySlug: string, directoryName: string, recordId: string, lines: readonly string[]): void {
  const directory = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", directoryName);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${recordId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

type JsonSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean;
};

function validateStoryChoiceTopLevel(record: unknown): string[] {
  const schema = loadStoryChoiceSchema();
  const errors: string[] = [];

  if (!isRecord(record)) {
    return ["record must be an object"];
  }

  for (const requiredKey of schema.required ?? []) {
    if (!(requiredKey in record)) {
      errors.push(`missing required property ${requiredKey}`);
    }
  }

  if (schema.additionalProperties === false) {
    const allowedKeys = new Set(Object.keys(schema.properties ?? {}));
    for (const key of Object.keys(record)) {
      if (!allowedKeys.has(key)) {
        errors.push(`additional property ${key}`);
      }
    }
  }

  return errors;
}

function loadStoryChoiceSchema(): JsonSchema {
  const testFile = fileURLToPath(import.meta.url);
  const worldIndexRoot = path.resolve(path.dirname(testFile), "..", "..", "..");
  const schemaPath = path.resolve(worldIndexRoot, "..", "validators", "src", "schemas", "story-choice.schema.json");
  return JSON.parse(readFileSync(schemaPath, "utf8")) as JsonSchema;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
