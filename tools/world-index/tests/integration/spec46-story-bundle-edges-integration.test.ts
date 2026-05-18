import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import YAML from "yaml";

import { build } from "../../src/commands/build.js";
import { extractIntroTags } from "../../src/parse/intro-tag-parser.js";
import { STORY_EDGE_TYPES } from "../../src/schema/types.js";
import { cleanup, createAtomicRepoRoot } from "../helpers/atomic-fixture.js";

const WORLD_SLUG = "atomic-world";
const STORY_SLUG = "spec46-edges";

const SPEC46_EDGE_TYPES = [
  "belief_holder",
  "belief_basis_event",
  "belief_access_record",
  "belief_opens",
  "relationship_participant",
  "relationship_derived_from",
  "intention_holder",
  "intention_supersedes",
  "status_entity",
  "clock_linked_record",
  "clock_driver",
  "clock_tick_event",
  "secret_truth_anchor",
  "secret_holder",
  "secret_clue_carrier",
  "secret_reveal_record",
  "story_question_source",
  "story_question_payoff_of",
  "story_question_answer_record",
  "event_actor",
  "event_target",
  "event_selected_storylet"
] as const;

const PRE_PHASE_C_EDGE_TYPES = [
  "world_entity_binding",
  "story_fact_derived_from",
  "created_at_page",
  "state_delta_create",
  "state_delta_supersede",
  "creation_evidence",
  "opens_obligation",
  "pays_off_obligation",
  "complicates_obligation",
  "transfers_obligation",
  "parent_page",
  "leaf_page",
  "dependent_fact",
  "thread_obligation"
] as const;

type EdgeTypeUnderTest = (typeof SPEC46_EDGE_TYPES)[number] | (typeof PRE_PHASE_C_EDGE_TYPES)[number];

interface EdgeRow {
  source_node_id: string;
  target_ref: string | null;
  edge_type: EdgeTypeUnderTest;
  story_slug: string | null;
}

test("SPEC-46 story-bundle edge capstone builds all Phase C edge rows", () => {
  const root = createAtomicRepoRoot(WORLD_SLUG);

  try {
    addSpec46Story(root);

    const sourceRoot = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source");
    const expected = expectedCountsFromSource(sourceRoot);

    assert.equal(STORY_EDGE_TYPES.length, 36);
    assert.equal(new Set(STORY_EDGE_TYPES).size, STORY_EDGE_TYPES.length);
    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);

    const rows = edgeRows(root);
    assert.deepEqual(countRows(rows, SPEC46_EDGE_TYPES), pickCounts(expected, SPEC46_EDGE_TYPES));
    for (const edgeType of PRE_PHASE_C_EDGE_TYPES) {
      assert.ok(rows.some((row) => row.edge_type === edgeType), `${edgeType} should still emit from the fixture`);
    }
    assert.ok(rows.every((row) => row.story_slug === STORY_SLUG));

    assertNoEdgesFrom(rows, "BEL-2", ["belief_basis_event", "belief_access_record", "belief_opens"]);
    assertNoEdgesFrom(rows, "SREL-2", ["relationship_participant", "relationship_derived_from"]);
    assertNoEdgesFrom(rows, "CLK-2", ["clock_linked_record", "clock_driver", "clock_tick_event"]);
    assertNoEdgesFrom(rows, "STSEC-2", [
      "secret_truth_anchor",
      "secret_holder",
      "secret_clue_carrier",
      "secret_reveal_record"
    ]);
    assertNoEdgesFrom(rows, "STQ-3", [
      "story_question_source",
      "story_question_payoff_of",
      "story_question_answer_record"
    ]);
    assertNoEdgesFrom(rows, "SE-2", ["event_actor", "event_target", "event_selected_storylet"]);
  } finally {
    cleanup(root);
  }
});

function addSpec46Story(root: string): void {
  writeStoryRecord(root, "entities", "STENT-1.yaml", [
    "id: STENT-1",
    "story_id: STORY-46",
    "world_ent_id: ENT-0001",
    "character_id: null",
    "name: Bell Keeper",
    "role_in_story: [primary_actor]",
    "present_at_start: true",
    "story_only: false",
    "created_at_page: PG-1"
  ]);
  writeStoryRecord(root, "entities", "STENT-2.yaml", [
    "id: STENT-2",
    "story_id: STORY-46",
    "world_ent_id: null",
    "character_id: null",
    "name: Gate Witness",
    "role_in_story: [witness]",
    "present_at_start: true",
    "story_only: true",
    "created_at_page: PG-1"
  ]);
  writeStoryRecord(root, "pages", "PG-1.yaml", [
    "id: PG-1",
    "story_id: STORY-46",
    "branch_id: BR-1",
    "parent_page_id: null",
    "branch_path: [PG-1]",
    "state_snapshot:",
    "  objective_facts: [SF-1]"
  ]);
  writeStoryRecord(root, "pages", "PG-2.yaml", [
    "id: PG-2",
    "story_id: STORY-46",
    "branch_id: BR-1",
    "parent_page_id: PG-1",
    "branch_path: [PG-1, PG-2]",
    "state_snapshot:",
    "  objective_facts: [SF-1]"
  ]);
  writeStoryRecord(root, "choices", "CHC-1.yaml", [
    "id: CHC-1",
    "story_id: STORY-46",
    "parent_page_id: PG-1",
    "choice_text: Open the gate."
  ]);
  writeStoryRecord(root, "branches", "BR-1.yaml", [
    "id: BR-1",
    "story_id: STORY-46",
    "root_page_id: PG-1",
    "current_leaf_page_id: PG-2",
    "forked_from_page_id: PG-1"
  ]);
  writeStoryRecord(root, "facts", "SF-1.yaml", [
    "id: SF-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "subject: STENT-1",
    "predicate: guards",
    "object: salt gate",
    "epistemic_class: objective",
    "truth_value: true",
    "derived_from_cf: CF-0001"
  ]);
  writeStoryRecord(root, "obligations", "OBL-1.yaml", [
    "id: OBL-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "obligation_kind: promise",
    "description: Keep the salt gate watched.",
    "owed_by: STENT-1",
    "owed_to: STENT-2",
    "urgency: high",
    "trigger_to_close: Gate secured.",
    "dependent_facts: [SF-1]",
    "status: open"
  ]);
  writeStoryRecord(root, "threads", "THR-1.yaml", [
    "id: THR-1",
    "story_id: STORY-46",
    "type: mystery",
    "status: active",
    "title: Gate watch",
    "obligations: [OBL-1]",
    "created_at_page: PG-1"
  ]);
  writeStoryRecord(root, "storylets", "SLT-1.yaml", [
    "id: SLT-1",
    "story_id: STORY-46",
    "title: Open the gate",
    "opens_obligations: [OBL-1]",
    "pays_off_obligations: [OBL-1]",
    "complicates_obligations: [OBL-1]",
    "transfers_obligations: [OBL-1]",
    "provenance:",
    "  origin: fixture",
    "  created_at_page: PG-1"
  ]);
  writeStoryRecord(root, "beliefs", "BEL-1.yaml", [
    "id: BEL-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "holder: STENT-1",
    "claim: The gate needs guarding.",
    "belief_mode: believes",
    "truth_relation: true",
    "confidence: high",
    "visibility: shared",
    "basis:",
    "  source_event: SE-1",
    "  access_route: witnessed",
    "  access_records: [PG-1, DA-1]",
    "consequences:",
    "  opens: [OBL-1, STQ-1]",
    "  constrains_choices: []"
  ]);
  writeStoryRecord(root, "beliefs", "BEL-2.yaml", [
    "id: BEL-2",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "holder: STENT-2",
    "claim: A quiet unsupported suspicion.",
    "belief_mode: suspects",
    "truth_relation: unknown",
    "confidence: low",
    "visibility: private",
    "basis:",
    "  source_event: null",
    "  access_route: inference",
    "  access_records: []",
    "consequences:",
    "  opens: []",
    "  constrains_choices: []"
  ]);
  writeStoryRecord(root, "relationships", "SREL-1.yaml", [
    "id: SREL-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "participants: [STENT-1, STENT-2]",
    "axis: trust",
    "value: allied",
    "direction:",
    "  kind: bidirectional",
    "derived_from: [SE-1, BEL-1]"
  ]);
  writeStoryRecord(root, "relationships", "SREL-2.yaml", [
    "id: SREL-2",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "participants: []",
    "axis: trust",
    "value: neutral",
    "direction:",
    "  kind: bidirectional",
    "derived_from: []"
  ]);
  writeStoryRecord(root, "intentions", "STINT-1.yaml", [
    "id: STINT-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "holder: STENT-1",
    "intent: Keep watching.",
    "urgency: medium",
    "expires_when: Dawn arrives."
  ]);
  writeStoryRecord(root, "intentions", "STINT-2.yaml", [
    "id: STINT-2",
    "story_id: STORY-46",
    "created_at_page: PG-2",
    "supersedes: STINT-1",
    "holder: STENT-1",
    "intent: Open the gate carefully.",
    "urgency: high",
    "expires_when: Gate opens."
  ]);
  writeStoryRecord(root, "status", "STSTAT-1.yaml", [
    "id: STSTAT-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "entity: STENT-1",
    "life: alive",
    "agency: free",
    "location: STLOC-1",
    "derived_from: [SE-1]"
  ]);
  writeStoryRecord(root, "locations", "STLOC-1.yaml", [
    "id: STLOC-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "place_ref: ENT-0001",
    "location_state: public gate"
  ]);
  writeStoryRecord(root, "objects", "STOBJ-1.yaml", [
    "id: STOBJ-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "object_ref: gate-key",
    "object_state: hidden"
  ]);
  writeStoryRecord(root, "diegetic-artifacts", "DA-1.yaml", [
    "id: DA-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "artifact_kind: note",
    "title: Gate note",
    "body: The note names the gate."
  ]);
  writeStoryRecord(root, "clocks", "CLK-1.yaml", [
    "id: CLK-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "title: Gate deadline",
    "clock_kind: deadline",
    "driver: STENT-1",
    "linked_records: [OBL-1, STQ-1]",
    "value: 2",
    "max: 6",
    "salience: high",
    "visibility: public",
    "thresholds: []",
    "tick_history:",
    "  - event: SE-1",
    "    delta: 1",
    "    cause: Bell rang.",
    "  - event: SE-2",
    "    delta: -1",
    "    cause: Watch gained time.",
    "status: active",
    "resolution_event: null"
  ]);
  writeStoryRecord(root, "clocks", "CLK-2.yaml", [
    "id: CLK-2",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "title: Placeholder clock",
    "clock_kind: faction",
    "driver: system",
    "linked_records: []",
    "value: 1",
    "max: 4",
    "salience: low",
    "visibility: hidden",
    "thresholds: []",
    "tick_history: []",
    "status: active",
    "resolution_event: null"
  ]);
  writeStoryRecord(root, "secrets", "STSEC-1.yaml", [
    "id: STSEC-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "secret_kind: identity",
    "secret_claim: The gate keeper has the old key.",
    "truth_anchor: SF-1",
    "holders: [STENT-1, group:watch, narrator]",
    "salience: high",
    "protected_mystery_refs: []",
    "clue_carriers:",
    "  - kind: DA",
    "    record: DA-1",
    "    clue_text: The note names the key.",
    "    clue_strength: confirming",
    "reveal_records: [BEL-1, STQ-1]",
    "status: hidden"
  ]);
  writeStoryRecord(root, "secrets", "STSEC-2.yaml", [
    "id: STSEC-2",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "secret_kind: motive",
    "secret_claim: Empty secret.",
    "truth_anchor: null",
    "holders: []",
    "salience: low",
    "protected_mystery_refs: []",
    "clue_carriers: []",
    "reveal_records: []",
    "status: hidden"
  ]);
  writeStoryRecord(root, "story-questions", "STQ-1.yaml", [
    "id: STQ-1",
    "story_id: STORY-46",
    "created_at_page: PG-1",
    "supersedes: null",
    "setup_kind: setup",
    "question_or_setup: Who opens the gate?",
    "salience: medium",
    "audience_visibility: implied",
    "source_event: SE-1",
    "source_records: [DA-1]",
    "payoff_of: null",
    "status: open",
    "answer_event: null",
    "answer_records: []"
  ]);
  writeStoryRecord(root, "story-questions", "STQ-2.yaml", [
    "id: STQ-2",
    "story_id: STORY-46",
    "created_at_page: PG-2",
    "supersedes: null",
    "setup_kind: dramatic_question",
    "question_or_setup: The gate opens.",
    "salience: high",
    "audience_visibility: explicit",
    "source_event: SE-2",
    "source_records: [BEL-1, STSEC-1]",
    "payoff_of: STQ-1",
    "status: answered",
    "answer_event: SE-2",
    "answer_records: [BEL-2, DA-1]"
  ]);
  writeStoryRecord(root, "story-questions", "STQ-3.yaml", [
    "id: STQ-3",
    "story_id: STORY-46",
    "created_at_page: PG-2",
    "supersedes: null",
    "setup_kind: setup",
    "question_or_setup: Empty setup.",
    "salience: low",
    "audience_visibility: hidden",
    "source_event: null",
    "source_records: []",
    "payoff_of: null",
    "status: open",
    "answer_event: null",
    "answer_records: []"
  ]);
  writeStoryRecord(root, "events", "SE-1.yaml", [
    "id: SE-1",
    "story_id: STORY-46",
    "created_at_page: PG-2",
    "parent_page_id: PG-1",
    "event_kind: selected_choice",
    "actor: STENT-1",
    "targets: [STENT-2, STLOC-1, STOBJ-1]",
    "commitment:",
    "  selected_slt_id: SLT-1",
    "  selection_source: emitted_choice",
    "  alias_bindings:",
    "    actor: STENT-1",
    "world_logic_rationale: >-",
    "  intro:STQ(id=STQ-2, trigger=explicit_question_raised, evidence=[PG-2,SE-0], distinct_from=[])",
    "state_delta:",
    "  create: [BEL-1, STQ-2]",
    "  supersede: [STSTAT-1]",
    "  close: []"
  ]);
  writeStoryRecord(root, "events", "SE-2.yaml", [
    "id: SE-2",
    "story_id: STORY-46",
    "created_at_page: PG-2",
    "parent_page_id: null",
    "event_kind: story_start",
    "actor: unknown",
    "targets: []",
    "commitment:",
    "  selected_slt_id: null",
    "  selection_source: none",
    "  alias_bindings: {}",
    "world_logic_rationale: No structured intro tags here.",
    "state_delta:",
    "  create: []",
    "  supersede: []",
    "  close: []"
  ]);
}

function writeStoryRecord(root: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function edgeRows(root: string): EdgeRow[] {
  const db = new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), { readonly: true });

  try {
    return db
      .prepare(
        `
          SELECT source_node_id,
                 COALESCE(target_node_id, target_unresolved_ref) AS target_ref,
                 edge_type,
                 story_slug
          FROM edges
          WHERE story_slug = ?
            AND edge_type IN (${[...SPEC46_EDGE_TYPES, ...PRE_PHASE_C_EDGE_TYPES].map(() => "?").join(", ")})
          ORDER BY edge_type, source_node_id, target_ref
        `
      )
      .all(STORY_SLUG, ...SPEC46_EDGE_TYPES, ...PRE_PHASE_C_EDGE_TYPES) as EdgeRow[];
  } finally {
    db.close();
  }
}

function expectedCountsFromSource(sourceRoot: string): Record<EdgeTypeUnderTest, number> {
  const counts = Object.fromEntries(
    [...SPEC46_EDGE_TYPES, ...PRE_PHASE_C_EDGE_TYPES].map((edgeType) => [edgeType, 0])
  ) as Record<EdgeTypeUnderTest, number>;

  addCount(counts, "world_entity_binding", hasString(record(sourceRoot, "entities", "STENT-1.yaml"), "world_ent_id"));
  addCount(counts, "story_fact_derived_from", hasString(record(sourceRoot, "facts", "SF-1.yaml"), "derived_from_cf"));

  const createdAtRecords: Array<[string, string]> = [
    ["entities", "STENT-1.yaml"],
    ["entities", "STENT-2.yaml"],
    ["facts", "SF-1.yaml"],
    ["beliefs", "BEL-1.yaml"],
    ["beliefs", "BEL-2.yaml"],
    ["relationships", "SREL-1.yaml"],
    ["relationships", "SREL-2.yaml"],
    ["intentions", "STINT-1.yaml"],
    ["intentions", "STINT-2.yaml"],
    ["status", "STSTAT-1.yaml"],
    ["locations", "STLOC-1.yaml"],
    ["objects", "STOBJ-1.yaml"],
    ["diegetic-artifacts", "DA-1.yaml"],
    ["clocks", "CLK-1.yaml"],
    ["clocks", "CLK-2.yaml"],
    ["secrets", "STSEC-1.yaml"],
    ["secrets", "STSEC-2.yaml"],
    ["story-questions", "STQ-1.yaml"],
    ["story-questions", "STQ-2.yaml"],
    ["story-questions", "STQ-3.yaml"],
    ["events", "SE-1.yaml"],
    ["events", "SE-2.yaml"]
  ];

  for (const [directory, fileName] of createdAtRecords) {
    addCount(counts, "created_at_page", hasString(record(sourceRoot, directory, fileName), "created_at_page"));
  }

  const storylet = record(sourceRoot, "storylets", "SLT-1.yaml");
  addCount(counts, "opens_obligation", fieldArray(storylet, "opens_obligations").length);
  addCount(counts, "pays_off_obligation", fieldArray(storylet, "pays_off_obligations").length);
  addCount(counts, "complicates_obligation", fieldArray(storylet, "complicates_obligations").length);
  addCount(counts, "transfers_obligation", fieldArray(storylet, "transfers_obligations").length);
  addCount(counts, "parent_page", hasString(record(sourceRoot, "pages", "PG-2.yaml"), "parent_page_id"));
  addCount(counts, "parent_page", hasString(record(sourceRoot, "choices", "CHC-1.yaml"), "parent_page_id"));
  addCount(counts, "parent_page", hasString(record(sourceRoot, "branches", "BR-1.yaml"), "forked_from_page_id"));
  addCount(counts, "leaf_page", hasString(record(sourceRoot, "branches", "BR-1.yaml"), "current_leaf_page_id"));
  addCount(counts, "dependent_fact", fieldArray(record(sourceRoot, "obligations", "OBL-1.yaml"), "dependent_facts").length);
  addCount(counts, "thread_obligation", fieldArray(record(sourceRoot, "threads", "THR-1.yaml"), "obligations").length);

  for (const event of [record(sourceRoot, "events", "SE-1.yaml"), record(sourceRoot, "events", "SE-2.yaml")]) {
    addCount(counts, "event_actor", isStoryRecordReference(stringField(event, "actor")) ? 1 : 0);
    addCount(counts, "event_target", fieldArray(event, "targets").length);
    addCount(counts, "event_selected_storylet", hasString(nestedRecord(event, "commitment"), "selected_slt_id"));
    addCount(counts, "state_delta_create", fieldArray(nestedRecord(event, "state_delta"), "create").length);
    addCount(counts, "state_delta_supersede", fieldArray(nestedRecord(event, "state_delta"), "supersede").length);
    addCount(
      counts,
      "creation_evidence",
      extractIntroTags(stringField(event, "world_logic_rationale") ?? "").reduce((sum, tag) => sum + tag.evidence.length, 0)
    );
  }

  for (const belief of [record(sourceRoot, "beliefs", "BEL-1.yaml"), record(sourceRoot, "beliefs", "BEL-2.yaml")]) {
    addCount(counts, "belief_holder", hasString(belief, "holder"));
    addCount(counts, "belief_basis_event", hasString(nestedRecord(belief, "basis"), "source_event"));
    addCount(counts, "belief_access_record", fieldArray(nestedRecord(belief, "basis"), "access_records").length);
    addCount(counts, "belief_opens", fieldArray(nestedRecord(belief, "consequences"), "opens").length);
  }

  for (const relationship of [
    record(sourceRoot, "relationships", "SREL-1.yaml"),
    record(sourceRoot, "relationships", "SREL-2.yaml")
  ]) {
    addCount(counts, "relationship_participant", fieldArray(relationship, "participants").length);
    addCount(counts, "relationship_derived_from", fieldArray(relationship, "derived_from").length);
  }

  for (const intention of [
    record(sourceRoot, "intentions", "STINT-1.yaml"),
    record(sourceRoot, "intentions", "STINT-2.yaml")
  ]) {
    addCount(counts, "intention_holder", hasString(intention, "holder"));
    addCount(counts, "intention_supersedes", hasString(intention, "supersedes"));
  }

  addCount(counts, "status_entity", hasString(record(sourceRoot, "status", "STSTAT-1.yaml"), "entity"));

  for (const clock of [record(sourceRoot, "clocks", "CLK-1.yaml"), record(sourceRoot, "clocks", "CLK-2.yaml")]) {
    addCount(counts, "clock_linked_record", fieldArray(clock, "linked_records").length);
    addCount(counts, "clock_driver", isStoryRecordReference(stringField(clock, "driver")) ? 1 : 0);
    addCount(counts, "clock_tick_event", recordArray(clock, "tick_history").filter((tick) => hasString(tick, "event")).length);
  }

  for (const secret of [record(sourceRoot, "secrets", "STSEC-1.yaml"), record(sourceRoot, "secrets", "STSEC-2.yaml")]) {
    addCount(counts, "secret_truth_anchor", hasString(secret, "truth_anchor"));
    addCount(counts, "secret_holder", fieldArray(secret, "holders").filter(isStoryRecordReference).length);
    addCount(
      counts,
      "secret_clue_carrier",
      recordArray(secret, "clue_carriers").filter((carrier) => hasString(carrier, "record")).length
    );
    addCount(counts, "secret_reveal_record", fieldArray(secret, "reveal_records").length);
  }

  for (const question of [
    record(sourceRoot, "story-questions", "STQ-1.yaml"),
    record(sourceRoot, "story-questions", "STQ-2.yaml"),
    record(sourceRoot, "story-questions", "STQ-3.yaml")
  ]) {
    addCount(counts, "story_question_source", fieldArray(question, "source_records").length);
    addCount(counts, "story_question_payoff_of", hasString(question, "payoff_of"));
    addCount(counts, "story_question_answer_record", fieldArray(question, "answer_records").length);
  }

  return counts;
}

function countRows(rows: EdgeRow[], edgeTypes: readonly EdgeTypeUnderTest[]): Record<EdgeTypeUnderTest, number> {
  const counts = Object.fromEntries(edgeTypes.map((edgeType) => [edgeType, 0])) as Record<EdgeTypeUnderTest, number>;
  for (const row of rows) {
    if ((edgeTypes as readonly string[]).includes(row.edge_type)) {
      counts[row.edge_type] += 1;
    }
  }
  return counts;
}

function pickCounts(
  counts: Record<EdgeTypeUnderTest, number>,
  edgeTypes: readonly EdgeTypeUnderTest[]
): Record<EdgeTypeUnderTest, number> {
  return Object.fromEntries(edgeTypes.map((edgeType) => [edgeType, counts[edgeType]])) as Record<
    EdgeTypeUnderTest,
    number
  >;
}

function assertNoEdgesFrom(rows: EdgeRow[], recordId: string, edgeTypes: readonly EdgeTypeUnderTest[]): void {
  const sourceNodeId = storyNode(recordId);
  assert.deepEqual(
    rows.filter((row) => row.source_node_id === sourceNodeId && (edgeTypes as readonly string[]).includes(row.edge_type)),
    []
  );
}

function record(sourceRoot: string, directory: string, fileName: string): Record<string, unknown> {
  return YAML.parse(readFileSync(path.join(sourceRoot, directory, fileName), "utf8")) as Record<string, unknown>;
}

function nestedRecord(source: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = source[field];
  return isRecord(value) ? value : {};
}

function fieldArray(source: Record<string, unknown>, field: string): string[] {
  const value = source[field];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function recordArray(source: Record<string, unknown>, field: string): Array<Record<string, unknown>> {
  const value = source[field];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringField(source: Record<string, unknown>, field: string): string | null {
  const value = source[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function hasString(source: Record<string, unknown>, field: string): number {
  return stringField(source, field) === null ? 0 : 1;
}

function isStoryRecordReference(value: string | null): value is string {
  return value !== null && /^[A-Z]+-[0-9]+$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addCount(counts: Record<EdgeTypeUnderTest, number>, edgeType: EdgeTypeUnderTest, count: number): void {
  counts[edgeType] += count;
}

function storyNode(recordId: string): string {
  return `${STORY_SLUG}:${recordId}`;
}
