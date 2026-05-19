import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import { build } from "@worldloom/world-index/commands/build";

import { runValidators } from "../../src/framework/run.js";
import type { IndexedRecord, Validator } from "../../src/framework/types.js";
import { validatePatchPlan } from "../../src/public/index.js";
import { nonPropagationFactsCompleteness } from "../../src/structural/non-propagation-facts-completeness.js";
import { recordIntroductionUniqueness } from "../../src/structural/record-introduction-uniqueness.js";
import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { stplanEventPlanRelationConsistency } from "../../src/structural/stplan-event-plan-relation-consistency.js";
import { context, record } from "../structural/helpers.js";

const STORY_SLUG = "spec48-story";
const WORLD_SLUG = "spec48-world";

test("SPEC-48 capstone: structured SE fields validate, pre-apply materializes, and world-index emits introduction edges", async () => {
  const event = eventRecord();
  const validators: readonly Validator[] = [
    recordSchemaCompliance,
    recordIntroductionUniqueness,
    nonPropagationFactsCompleteness
  ];
  const validatorRun = await runValidators(validators, undefined, context([event], {
    run_mode: "pre-apply",
    patch_plan: createSePatchPlan(event.parsed) as unknown as PatchPlanEnvelope
  }));

  assert.deepEqual(validatorRun.verdicts, []);
  assert.deepEqual(
    executionStatuses(validatorRun.summary.executions, validators.map((validator) => validator.name)),
    {
      record_schema_compliance: "pass",
      record_introduction_uniqueness: "pass",
      non_propagation_facts_completeness: "pass"
    }
  );

  const planRelationVerdicts = await stplanEventPlanRelationConsistency.run(
    undefined,
    context([event, planRecord()])
  );
  assert.deepEqual(planRelationVerdicts, []);

  await withTempValidateRoot(async () => {
    const result = await validatePatchPlan(createPreApplySePatchPlan() as unknown as PatchPlanEnvelope);
    assert.deepEqual(result.verdicts, []);
    assert.equal(result.executions.find((row) => row.name === "record_schema_compliance")?.status, "pass");
    assert.equal(result.executions.find((row) => row.name === "record_introduction_uniqueness")?.status, "pass");
    assert.equal(result.executions.find((row) => row.name === "non_propagation_facts_completeness")?.status, "pass");
  });

  const root = createWorldRoot();
  try {
    writeStoryEvent(root, event.parsed);
    writeStoryClock(root);
    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);
    assert.deepEqual(creationEvidenceEdges(root), [
      {
        source_node_id: `${STORY_SLUG}:CLK-1`,
        target_node_id: `${STORY_SLUG}:SE-1`,
        target_unresolved_ref: null,
        edge_type: "creation_evidence"
      }
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SPEC-48 capstone: malformed structured fields fail through schema and structural validators", async () => {
  const invalidSchemaRun = await runValidators([recordSchemaCompliance], undefined, context([
    eventRecord({
      record_introductions: [
        intro("CLK-1", "CLK", "tactical_approach_committed"),
      ],
      state_relations: [{ relation: "convolves", target_record: "STPLAN-1" }],
      non_propagation_facts: [{ reason: "event_leaves_no_accessible_trace", group: "public_general", records: ["not-an-id"] }]
    })
  ]));
  assert.ok(invalidSchemaRun.verdicts.some((verdict) => verdict.code === "record_schema_compliance.oneOf"));
  assert.ok(invalidSchemaRun.verdicts.some((verdict) => verdict.code === "record_schema_compliance.enum"));
  assert.ok(invalidSchemaRun.verdicts.some((verdict) => verdict.code === "record_schema_compliance.pattern"));

  const duplicateRun = await runValidators([recordIntroductionUniqueness], undefined, context([
    eventRecord({
      record_introductions: [
        intro("THR-1", "THR", "investigation_line_opened"),
        {
          ...intro("THR-1", "THR", "mission_line_opened"),
          rationale: "Conflicting second introduction for the same record id."
        }
      ]
    })
  ]));
  assert.deepEqual(duplicateRun.verdicts.map((verdict) => verdict.code), ["record_introduction_duplicate_record_id"]);
});

test("SPEC-48 capstone: parser-deletion and skill-prose tag-syntax gates remain green", () => {
  for (const compiledPath of [
    "dist/tests/structural/parser-deletion-completeness.test.js",
    "dist/tests/structural/skill-prose-tag-syntax-absence.test.js"
  ]) {
    const run = spawnSync(process.execPath, ["--test", compiledPath], {
      cwd: packageRoot(),
      encoding: "utf8"
    });
    assert.equal(run.status, 0, `${compiledPath}\n${run.stdout}\n${run.stderr}`);
  }
});

test("SPEC-48 capstone: tag-like world_logic_rationale prose is inert without structured entries", async () => {
  const event = eventRecord({
    world_logic_rationale: "Mara wonders whether the intro: section will resolve, but no structured introduction is present.",
    record_introductions: [],
    state_relations: [],
    non_propagation_facts: [],
    state_delta: { create: [], supersede: [], close: [] }
  });
  const run = await runValidators([
    recordSchemaCompliance,
    recordIntroductionUniqueness,
    nonPropagationFactsCompleteness
  ], undefined, context([event]));

  assert.deepEqual(run.verdicts, []);
});

function eventRecord(overrides: Record<string, unknown> = {}): IndexedRecord {
  return {
    ...record("story_event_record", `${STORY_SLUG}:SE-1`, `stories/${STORY_SLUG}/_source/events/SE-1.yaml`, {
      id: "SE-1",
      story_id: "STORY-1",
      created_at_page: "PG-2",
      parent_page_id: "PG-1",
      event_kind: "selected_choice",
      actor: "system",
      targets: [],
      commitment: {
        selected_slt_id: "SLT-1",
        selection_source: "system_repair",
        alias_bindings: {}
      },
      outcome_route: "accept",
      world_logic_rationale:
        "The event advances the plan and explains event_leaves_no_accessible_trace through structured fields.",
      record_introductions: [intro("CLK-1", "CLK", "deadline_declared")],
      state_relations: [{ relation: "advances", target_record: "STPLAN-1" }],
      non_propagation_facts: [
        { reason: "event_leaves_no_accessible_trace", group: "public_general", records: ["DA-1"] }
      ],
      state_delta: { create: ["CLK-1"], supersede: ["STOBJ-1"], close: [] },
      promotion_claims: [],
      ...overrides
    }),
    story_slug: STORY_SLUG
  };
}

function intro(recordId: string, recordClass: string, trigger: string): Record<string, unknown> {
  return {
    record_id: recordId,
    class: recordClass,
    trigger,
    evidence: ["SE-1"],
    distinct_from: []
  };
}

function planRecord(): IndexedRecord {
  return {
    ...record("story_plan_record", `${STORY_SLUG}:STPLAN-1`, `stories/${STORY_SLUG}/_source/plans/STPLAN-1.yaml`, {
      id: "STPLAN-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      created_by_event: "SE-0",
      supersedes: null,
      holder: "STENT-1",
      root_intention: "STINT-1",
      objective: "Reach the archive.",
      plan_status: "active",
      belief_basis: ["BEL-1"],
      resource_basis: {
        facts: ["SF-1"],
        objects: ["STOBJ-1"],
        locations: [],
        artifacts: [],
        relationships: [],
        obligations: []
      },
      blockers: [],
      current_step: {
        action_family: "investigate",
        target_records: ["STOBJ-1"],
        success_condition: { predicates: [] }
      },
      fallback_steps: [],
      expires_when: "The archive is reached.",
      derived_from: []
    }),
    story_slug: STORY_SLUG
  };
}

function createSePatchPlan(parsed: Record<string, unknown>): Record<string, unknown> {
  return {
    plan_id: "plan-spec48-capstone",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "page_cycle_accept",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: { se_ids: ["SE-1"] },
    patches: [
      {
        op: "create_se_record",
        target_world: "seeded",
        target_file: `stories/${STORY_SLUG}/_source/events/SE-1.yaml`,
        payload: {
          story_slug: STORY_SLUG,
          record: parsed
        }
      }
    ]
  };
}

function createPreApplySePatchPlan(): Record<string, unknown> {
  const parsed = {
    ...eventRecord({
      created_at_page: "PG-1",
      parent_page_id: null,
      event_kind: "story_start",
      actor: "system",
      commitment: {
        selected_slt_id: null,
        selection_source: "none",
        alias_bindings: {}
      },
      state_delta: { create: ["CLK-1"], supersede: [], close: [] }
    }).parsed
  };
  return {
    plan_id: "plan-spec48-capstone-preapply",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "story_start_accept",
    originating_skill: "branching-story-bootstrap",
    expected_id_allocations: { se_ids: ["SE-1"], clk_ids: ["CLK-1"] },
    patches: [
      {
        op: "create_se_record",
        target_world: "seeded",
        target_file: `stories/${STORY_SLUG}/_source/events/SE-1.yaml`,
        payload: {
          story_slug: STORY_SLUG,
          record: parsed
        }
      },
      {
        op: "create_clk_record",
        target_world: "seeded",
        target_file: `stories/${STORY_SLUG}/_source/clocks/CLK-1.yaml`,
        payload: {
          story_slug: STORY_SLUG,
          record: {
            id: "CLK-1",
            story_id: "STORY-1",
            created_at_page: "PG-1",
            title: "Opening deadline",
            clock_kind: "deadline",
            driver: "system",
            linked_records: ["THR-1"],
            value: 1,
            max: 4,
            salience: "medium",
            visibility: "public",
            thresholds: [
              {
                at: 3,
                label: "Deadline tightens",
                effects: { create: ["CNSQ-1"], supersede: [], close: [] }
              }
            ],
            tick_history: [{ event: "SE-1", delta: 1, cause: "The story starts under deadline." }],
            status: "active"
          }
        }
      }
    ]
  };
}

async function withTempValidateRoot<T>(run: () => Promise<T>): Promise<T> {
  const root = mkdtempSync(path.join(os.tmpdir(), "spec48-validate-"));
  const originalCwd = process.cwd();
  mkdirSync(path.join(root, "tools", "validators"), { recursive: true });
  mkdirSync(path.join(root, "worlds", "seeded", "_index"), { recursive: true });

  const db = new Database(path.join(root, "worlds", "seeded", "_index", "world.db"));
  try {
    const migrations = path.resolve(packageRoot(), "../world-index/src/schema/migrations");
    for (const fileName of ["001_initial.sql", "002_scoped_references.sql", "004_story_bundle_scope.sql"]) {
      db.exec(readFileSync(path.join(migrations, fileName), "utf8"));
    }
  } finally {
    db.close();
  }

  writeFileSync(path.join(root, "tools", "validators", "package.json"), "{}\n", "utf8");
  process.chdir(path.join(root, "tools", "validators"));
  try {
    return await run();
  } finally {
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
}

function createWorldRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "spec48-world-index-"));
  const world = path.join(root, "worlds", WORLD_SLUG);
  mkdirSync(world, { recursive: true });
  writeFileSync(path.join(world, "WORLD_KERNEL.md"), "# SPEC-48 fixture\n", "utf8");
  writeFileSync(path.join(world, "ONTOLOGY.md"), "# Ontology\n", "utf8");
  writeAtomicRecord(world, "canon", "CF-1.yaml", [
    "id: CF-1",
    "title: Structured fields fixture",
    "status: hard_canon",
    "type: institution",
    "statement: Structured fields are exercised in this fixture.",
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

function writeStoryEvent(root: string, parsed: Record<string, unknown>): void {
  const directory = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", "events");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "SE-1.yaml"), serializeEvent(parsed), "utf8");
}

function writeStoryClock(root: string): void {
  const directory = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", "clocks");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "CLK-1.yaml"), [
    "id: CLK-1",
    "story_id: STORY-1",
    "created_at_page: PG-2",
    "title: Opening deadline",
    "clock_kind: deadline",
    "driver: system",
    "linked_records: [STOBJ-1]",
    "value: 1",
    "max: 4",
    "salience: medium",
    "visibility: public",
    "thresholds:",
    "  - at: 3",
    "    label: Deadline tightens",
    "    effects:",
    "      create: [CNSQ-1]",
    "      supersede: []",
    "      close: []",
    "tick_history:",
    "  - event: SE-1",
    "    delta: 1",
    "    cause: The event starts the deadline.",
    "status: active",
    ""
  ].join("\n"), "utf8");
}

function serializeEvent(parsed: Record<string, unknown>): string {
  const stateDelta = parsed.state_delta as { create: string[]; supersede: string[]; close: string[] };
  const introEntry = (parsed.record_introductions as Record<string, unknown>[])[0]!;
  const relation = (parsed.state_relations as Record<string, unknown>[])[0]!;
  const fact = (parsed.non_propagation_facts as Record<string, unknown>[])[0]!;
  return [
    `id: ${parsed.id}`,
    `story_id: ${parsed.story_id}`,
    `created_at_page: ${parsed.created_at_page}`,
    `parent_page_id: ${parsed.parent_page_id}`,
    `event_kind: ${parsed.event_kind}`,
    `actor: ${parsed.actor}`,
    "targets: []",
    "commitment:",
    `  selected_slt_id: ${(parsed.commitment as { selected_slt_id: string }).selected_slt_id}`,
    `  selection_source: ${(parsed.commitment as { selection_source: string }).selection_source}`,
    "  alias_bindings: {}",
    `outcome_route: ${parsed.outcome_route}`,
    `world_logic_rationale: ${JSON.stringify(parsed.world_logic_rationale)}`,
    "record_introductions:",
    `  - record_id: ${introEntry.record_id}`,
    `    class: ${introEntry.class}`,
    `    trigger: ${introEntry.trigger}`,
    "    evidence:",
    ...((introEntry.evidence as string[]).map((id) => `      - ${id}`)),
    "    distinct_from: []",
    "state_relations:",
    `  - relation: ${relation.relation}`,
    `    target_record: ${relation.target_record}`,
    "non_propagation_facts:",
    `  - reason: ${fact.reason}`,
    `    group: ${fact.group}`,
    "    records:",
    ...((fact.records as string[]).map((id) => `      - ${id}`)),
    "state_delta:",
    "  create:",
    ...stateDelta.create.map((id) => `    - ${id}`),
    "  supersede:",
    ...stateDelta.supersede.map((id) => `    - ${id}`),
    "  close: []",
    "promotion_claims: []",
    ""
  ].join("\n");
}

function writeAtomicRecord(world: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(world, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function creationEvidenceEdges(root: string): Array<{
  source_node_id: string;
  target_node_id: string | null;
  target_unresolved_ref: string | null;
  edge_type: string;
}> {
  const db = new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), { readonly: true });
  try {
    return db.prepare(
      `
        SELECT source_node_id, target_node_id, target_unresolved_ref, edge_type
        FROM edges
        WHERE edge_type = 'creation_evidence'
        ORDER BY source_node_id, target_unresolved_ref
      `
    ).all() as Array<{
      source_node_id: string;
      target_node_id: string | null;
      target_unresolved_ref: string | null;
      edge_type: string;
    }>;
  } finally {
    db.close();
  }
}

function executionStatuses(
  rows: Array<{ name: string; status: string }>,
  names: readonly string[]
): Record<string, string | undefined> {
  return Object.fromEntries(names.map((name) => [name, rows.find((row) => row.name === name)?.status]));
}

function packageRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(path.join("tools", "validators")) ? cwd : path.resolve(cwd, "tools", "validators");
}
