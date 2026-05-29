import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import { build } from "@worldloom/world-index/commands/build";

import { ACTIVE_RECORDS_CLASSES } from "../../src/_helpers/state-snapshot-replay.js";
import { runValidators } from "../../src/framework/run.js";
import type { Context, IndexedRecord, Validator, Verdict } from "../../src/framework/types.js";
import { activeRecordsFullShape } from "../../src/structural/active-records-full-shape.js";
import { expectedWitnessCoverage } from "../../src/structural/expected-witness-coverage.js";
import { noStoryStateInPlaceMutation } from "../../src/structural/no-story-state-in-place-mutation.js";
import { pgAffordanceIntegrity } from "../../src/structural/pg-affordance-integrity.js";
import { stateDeltaClassIntegrity } from "../../src/structural/state-delta-class-integrity.js";
import { parseJsonOutput, runWorldValidate } from "../_helpers/cli.js";
import { context, record } from "../structural/helpers.js";
import { materializeCompatibilityFixtureWorld } from "./synthetic-compatibility-world.js";

const STORY_SLUG = "spec44-capstone";
const SPEC44_VALIDATORS: readonly Validator[] = [
  noStoryStateInPlaceMutation,
  stateDeltaClassIntegrity,
  pgAffordanceIntegrity,
  expectedWitnessCoverage,
  activeRecordsFullShape
];

test("SPEC-44 capstone accepts all seven lifecycle transitions through append-only supersession", async () => {
  const records = baselineRecords();
  const patches = lifecycleScenarios().flatMap((scenario) => [
    storyPatch(scenario.op, scenario.sourceDir, scenario.next),
    storyPatch("create_se_record", "events", lifecycleEvent(scenario.eventId, {
      create: [scenario.nextId],
      supersede: [scenario.previousId]
    }))
  ]);
  const ctx = testContext([...records, ...patches.map(recordFromPatch)], {
    run_mode: "pre-apply",
    patch_plan: patchPlan(patches),
    pre_apply_existing_files: records.map((item) => item.file_path)
  });

  const run = await runValidators(SPEC44_VALIDATORS, undefined, ctx);

  assert.ok(run.summary.validators_run.includes("no_story_state_in_place_mutation"));
  assert.ok(run.summary.validators_run.includes("state_delta_class_integrity"));
  assert.deepEqual(failures(run.verdicts), []);
});

test("SPEC-44 capstone rejects an in-place story-state write to an existing record path", async () => {
  const existing = clock("CLK-2", { value: 2, max: 6 });
  const overwrite = storyPatch("create_clk_record", "clocks", clockBody("CLK-2", { value: 3, max: 6 }));
  const verdicts = await noStoryStateInPlaceMutation.run(undefined, testContext([existing], {
    run_mode: "pre-apply",
    patch_plan: patchPlan([overwrite]),
    pre_apply_existing_files: [existing.file_path]
  }));

  assertHas(verdicts, "no_story_state_in_place_mutation", "story_state_in_place_mutation", "fail");
});

test("SPEC-44 capstone rejects state_delta class drift and unresolved ids", async () => {
  const badEvent = event("SE-900", {
    create: ["BADCLASS-1"],
    supersede: ["CLK-404"]
  });
  const verdicts = await stateDeltaClassIntegrity.run(undefined, testContext([badEvent], {
    run_mode: "pre-apply",
    patch_plan: patchPlan([storyPatch("create_se_record", "events", badEvent.parsed)])
  }));

  assertHas(verdicts, "state_delta_class_integrity", "state_delta_class_integrity_violation", "fail");
  assert.ok(verdicts.some((verdict) => (verdict.detail as { failure_mode?: string }).failure_mode === "class_drift"));
  assert.ok(verdicts.some((verdict) => (verdict.detail as { failure_mode?: string }).failure_mode === "unresolved_id"));
});

test("SPEC-44 capstone rejects duplicate page affordance ordinals", async () => {
  const pageRecord = page("PG-8", {
    active_records: fullActiveRecords({ STENT: ["STENT-1"], STLOC: ["STLOC-1"], STOBJ: [] }),
    visible_affordances: [
      affordance({ ordinal: 2 }),
      affordance({ ordinal: 2, label: "second door" })
    ]
  });
  const verdicts = await pgAffordanceIntegrity.run(undefined, testContext([pageRecord], {
    run_mode: "pre-apply",
    patch_plan: patchPlan([storyPatch("create_pg_record", "pages", pageRecord.parsed)])
  }));

  assertHas(verdicts, "pg_affordance_integrity", "page_affordance_duplicate_ordinal", "fail");
});

test("SPEC-44 capstone preserves expected_witness_coverage as the semantic propagation gate", async () => {
  const verdicts = await expectedWitnessCoverage.run(undefined, testContext([
    location("STLOC-1"),
    entity("STENT-1"),
    entity("STENT-2"),
    entity("STENT-3"),
    page("PG-1", {
      active_records: fullActiveRecords({ STSTAT: ["STSTAT-1", "STSTAT-2", "STSTAT-3"] })
    }),
    status("STSTAT-1", "STENT-1"),
    status("STSTAT-2", "STENT-2"),
    status("STSTAT-3", "STENT-3"),
    event("SE-20", { create: ["DA-1"] }),
    artifact("DA-1", "public")
  ]));

  assertHas(verdicts, "expected_witness_coverage", "expected_witness_coverage_missing_public_bel", "fail");
});

test("SPEC-44 capstone reports non-STCHAR active_records_full_shape gaps as warn-level diagnostics", async () => {
  const verdicts = await activeRecordsFullShape.run(undefined, testContext([
    page("PG-9", {
      active_records: fullActiveRecords({ omit: ["CLK", "STSEC", "STQ", "DA"] })
    })
  ]));

  assert.equal(verdicts.length, 4);
  assert.ok(verdicts.every((verdict) => verdict.validator === "active_records_full_shape"));
  assert.ok(verdicts.every((verdict) => verdict.severity === "warn"));
  assert.deepEqual(
    verdicts.map((verdict) => (verdict.detail as { missing_class: string }).missing_class).sort(),
    ["CLK", "DA", "STQ", "STSEC"]
  );
});

test("SPEC-44 capstone synthetic story-bundle structural CLI smoke exits with no fail verdicts", () => {
  const tempRepo = mkdtempSync(path.join(tmpdir(), "spec44-synthetic-story-"));
  const fixture = materializeCompatibilityFixtureWorld(tempRepo, packageRoot());
  try {
    assert.equal(build(tempRepo, fixture.worldSlug, { quiet: true }), 0);
    const run = runWorldValidate([
      fixture.worldSlug,
      "--story",
      fixture.storySlug,
      "--structural",
      "--json"
    ], {
      cwd: tempRepo,
      expectedStatus: 0
    });
    const parsed = parseJsonOutput<{ summary: { fail_count: number } }>(run);
    assert.equal(parsed.summary.fail_count, 0);
  } finally {
    rmSync(tempRepo, { recursive: true, force: true });
  }
});

function lifecycleScenarios(): Array<{
  op: string;
  sourceDir: string;
  previousId: string;
  nextId: string;
  eventId: string;
  next: Record<string, unknown>;
}> {
  return [
    {
      op: "supersede_clk_record",
      sourceDir: "clocks",
      previousId: "CLK-2",
      nextId: "CLK-3",
      eventId: "SE-30",
      next: clockBody("CLK-3", { value: 3, max: 6, supersedes: "CLK-2" })
    },
    {
      op: "supersede_clk_record",
      sourceDir: "clocks",
      previousId: "CLK-12",
      nextId: "CLK-13",
      eventId: "SE-31",
      next: clockBody("CLK-13", { value: 3, max: 6, status: "resolved", resolution_event: "SE-31", supersedes: "CLK-12" })
    },
    {
      op: "supersede_stsec_record",
      sourceDir: "secrets",
      previousId: "STSEC-4",
      nextId: "STSEC-5",
      eventId: "SE-32",
      next: secretBody("STSEC-5", { clue_carriers: ["STOBJ-1", "DA-1"], supersedes: "STSEC-4" })
    },
    {
      op: "supersede_stsec_record",
      sourceDir: "secrets",
      previousId: "STSEC-15",
      nextId: "STSEC-16",
      eventId: "SE-33",
      next: secretBody("STSEC-16", { clue_status: "discovered", supersedes: "STSEC-15" })
    },
    {
      op: "supersede_stsec_record",
      sourceDir: "secrets",
      previousId: "STSEC-26",
      nextId: "STSEC-27",
      eventId: "SE-34",
      next: secretBody("STSEC-27", { status: "revealed", reveal_event: "SE-34", reveal_records: ["BEL-12", "SF-3"], supersedes: "STSEC-26" })
    },
    {
      op: "supersede_stq_record",
      sourceDir: "story-questions",
      previousId: "STQ-3",
      nextId: "STQ-4",
      eventId: "SE-35",
      next: questionBody("STQ-4", { status: "answered", answer_event: "SE-35", answer_records: ["BEL-12"], supersedes: "STQ-3" })
    },
    {
      op: "supersede_stq_record",
      sourceDir: "story-questions",
      previousId: "STQ-14",
      nextId: "STQ-15",
      eventId: "SE-36",
      next: questionBody("STQ-15", { status: "abandoned", abandonment_rationale: "The thread was closed by player action.", supersedes: "STQ-14" })
    }
  ];
}

function baselineRecords(): IndexedRecord[] {
  return [
    clock("CLK-2", { value: 2, max: 6 }),
    clock("CLK-12", { value: 3, max: 6 }),
    secret("STSEC-4"),
    secret("STSEC-15"),
    secret("STSEC-26"),
    question("STQ-3"),
    question("STQ-14"),
    belief("BEL-12"),
    fact("SF-3"),
    objectRecord("STOBJ-1"),
    artifact("DA-1", "private"),
    page("PG-2")
  ];
}

function patchPlan(patches: unknown[]): PatchPlanEnvelope {
  return {
    plan_id: "plan-spec44-capstone",
    target_world: "test",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches
  } as unknown as PatchPlanEnvelope;
}

function storyPatch(op: string, sourceDir: string, parsed: unknown): unknown {
  const id = String((parsed as Record<string, unknown>).id);
  return {
    op,
    target_world: "test",
    target_file: `stories/${STORY_SLUG}/_source/${sourceDir}/${id}.yaml`,
    payload: {
      story_slug: STORY_SLUG,
      record: parsed
    }
  };
}

function recordFromPatch(patch: unknown): IndexedRecord {
  const raw = patch as { op: string; target_file: string; payload: { record: Record<string, unknown> } };
  return storyRecord(nodeTypeForOp(raw.op), String(raw.payload.record.id), raw.target_file, raw.payload.record);
}

function storyRecord(nodeType: string, id: string, filePath: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    ...record(nodeType, `${STORY_SLUG}:${id}`, filePath, parsed),
    story_slug: STORY_SLUG
  };
}

function clock(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("pressure_clock_record", id, `stories/${STORY_SLUG}/_source/clocks/${id}.yaml`, clockBody(id, overrides));
}

function secret(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("story_secret_record", id, `stories/${STORY_SLUG}/_source/secrets/${id}.yaml`, secretBody(id, overrides));
}

function question(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("story_question_record", id, `stories/${STORY_SLUG}/_source/story-questions/${id}.yaml`, questionBody(id, overrides));
}

function event(id: string, delta: { create?: string[]; supersede?: string[]; close?: string[] }): IndexedRecord {
  return storyRecord("story_event_record", id, `stories/${STORY_SLUG}/_source/events/${id}.yaml`, lifecycleEvent(id, delta));
}

function page(id: string, overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY_SLUG}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    parent_page_id: null,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
    state_snapshot: {
      active_records: fullActiveRecords(),
      visible_affordances: [affordance()],
      ...overrides
    },
    emitted_choices: []
  });
}

function lifecycleEvent(id: string, delta: { create?: string[]; supersede?: string[]; close?: string[] }): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    parent_page_id: "PG-1",
    event_kind: "selected_choice",
    actor: "STENT-1",
    commitment: { selected_slt_id: "SLT-1", selection_source: "runtime_jit", alias_bindings: {} },
    outcome_route: "accept",
    world_logic_rationale: "SPEC-44 capstone supersession scenario.",
    state_delta: {
      create: delta.create ?? [],
      supersede: delta.supersede ?? [],
      close: delta.close ?? []
    }
  };
}

function clockBody(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    supersedes: null,
    title: "Exposure clock",
    clock_kind: "exposure",
    driver: "system",
    linked_records: [],
    value: 2,
    max: 6,
    salience: "high",
    visibility: "hidden",
    thresholds: [{ at: 4, label: "break", effects: { create: [], supersede: [], close: [] } }],
    tick_history: [],
    status: "active",
    resolution_event: null,
    ...overrides
  };
}

function secretBody(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    supersedes: null,
    secret_text: "The key is hidden in the lintel.",
    holders: ["STENT-1"],
    status: "hidden",
    clue_carriers: ["STOBJ-1"],
    clue_status: "available",
    reveal_event: null,
    reveal_records: [],
    ...overrides
  };
}

function questionBody(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    supersedes: null,
    setup_kind: "dramatic_question",
    question_or_setup: "Who opened the locked door?",
    salience: "high",
    audience_visibility: "explicit",
    source_event: "SE-1",
    source_records: ["SF-3"],
    payoff_of: null,
    status: "open",
    answer_event: null,
    answer_records: [],
    abandonment_rationale: null,
    ...overrides
  };
}

function entity(id: string): IndexedRecord {
  return storyRecord("story_entity_record", id, `stories/${STORY_SLUG}/_source/entities/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    display_name: id,
    bound_stchar_id: `STCHAR-${id.split("-")[1] ?? "1"}`,
    role_in_story: ["witness"]
  });
}

function location(id: string): IndexedRecord {
  return storyRecord("story_location_record", id, `stories/${STORY_SLUG}/_source/locations/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    display_name: id
  });
}

function status(id: string, entityId: string): IndexedRecord {
  return storyRecord("story_status_record", id, `stories/${STORY_SLUG}/_source/status/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    entity: entityId,
    life: "alive",
    agency: "free",
    location: "STLOC-1"
  });
}

function belief(id: string): IndexedRecord {
  return storyRecord("belief_record", id, `stories/${STORY_SLUG}/_source/beliefs/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    holder: "STENT-1",
    proposition: "The clue was found.",
    confidence: "high",
    source_event: "SE-34"
  });
}

function fact(id: string): IndexedRecord {
  return storyRecord("story_fact_record", id, `stories/${STORY_SLUG}/_source/facts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    statement: "The clue exists.",
    authority: "branch_local",
    evidence: [{ event_id: "SE-34" }]
  });
}

function objectRecord(id: string): IndexedRecord {
  return storyRecord("story_object_record", id, `stories/${STORY_SLUG}/_source/objects/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    display_name: "Lintel key",
    affordances: ["inspect"]
  });
}

function artifact(id: string, visibility: string): IndexedRecord {
  return storyRecord("story_diegetic_artifact_record", id, `stories/${STORY_SLUG}/_source/artifacts/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-2",
    title: id,
    author: "STENT-1",
    genre: "notice",
    body: "A visible clue.",
    intended_audience: "public",
    circulation: visibility,
    truth_relation: "true"
  });
}

function affordance(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ordinal: 0,
    label: "inspect the lintel",
    grounded_in: ["STOBJ-1"],
    available_to: ["STENT-1"],
    action_families: ["investigate"],
    ...overrides
  };
}

interface ActiveRecordsOptions {
  omit?: string[];
  [recordClass: string]: string[] | undefined;
}

function fullActiveRecords(options: ActiveRecordsOptions = {}): Record<string, string[]> {
  const omitted = new Set(options.omit ?? []);
  const active = Object.fromEntries(
    ACTIVE_RECORDS_CLASSES
      .filter((recordClass) => !omitted.has(recordClass))
      .map((recordClass) => [recordClass, []])
  ) as Record<string, string[]>;
  const defaults: Record<string, string[]> = {
    ...active,
    STENT: ["STENT-1"],
    STLOC: ["STLOC-1"],
    STOBJ: ["STOBJ-1"],
    CLK: ["CLK-2"],
    STSEC: ["STSEC-4"],
    STQ: ["STQ-3"],
    DA: ["DA-1"]
  };

  for (const recordClass of omitted) {
    delete defaults[recordClass];
  }
  for (const [recordClass, ids] of Object.entries(options)) {
    if (recordClass !== "omit" && ids !== undefined) {
      defaults[recordClass] = ids;
    }
  }
  return defaults;
}

function nodeTypeForOp(op: string): string {
  if (op.endsWith("_clk_record")) return "pressure_clock_record";
  if (op.endsWith("_stsec_record")) return "story_secret_record";
  if (op.endsWith("_stq_record")) return "story_question_record";
  if (op === "create_se_record") return "story_event_record";
  if (op === "create_pg_record") return "page_record";
  return "story_event_record";
}

function testContext(records: IndexedRecord[], overrides: Partial<Context> = {}): Context {
  return context(records, overrides);
}

function packageRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(path.join("tools", "validators")) ? cwd : path.join(cwd, "tools", "validators");
}

function failures(verdicts: readonly Verdict[]): Verdict[] {
  return verdicts.filter((verdict) => verdict.severity === "fail");
}

function assertHas(
  verdicts: readonly Verdict[],
  validator: string,
  code: string,
  severity: Verdict["severity"]
): void {
  assert.ok(
    verdicts.some((verdict) => verdict.validator === validator && verdict.code === code && verdict.severity === severity),
    `${validator}/${code}/${severity} not found in ${verdicts.map((verdict) => `${verdict.validator}/${verdict.code}/${verdict.severity}`).join(", ")}`
  );
}
