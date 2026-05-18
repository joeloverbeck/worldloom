import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { OPERATION_KINDS } from "../../src/package-interop.js";
import { describeEnvelopeSchema } from "../../src/tools/describe-envelope-schema.js";
import { getContextPacket } from "../../src/tools/get-context-packet.js";
import { getRecord } from "../../src/tools/get-record.js";
import { getRecordSchema } from "../../src/tools/get-record-schema.js";
import { listRecords } from "../../src/tools/list-records.js";
import { allocateNextId } from "../../src/tools/allocate-next-id.js";
import { validatePatchPlan } from "../../src/tools/validate-patch-plan.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture.js";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const SPEC42_OPS = [
  "create_clk_record",
  "supersede_clk_record",
  "create_stsec_record",
  "supersede_stsec_record",
  "create_stq_record",
  "supersede_stq_record"
] as const;

test("SPEC-42 capstone exposes schema and envelope surfaces for CLK, STSEC, and STQ", async () => {
  const clockSchema = await getRecordSchema({ node_type: "pressure_clock_record" });
  const secretSchema = await getRecordSchema({ node_type: "story_secret_record" });
  const questionSchema = await getRecordSchema({ node_type: "story_question_record" });
  const pageSchema = await getRecordSchema({ node_type: "page_record" });
  const envelope = await withHarnessCeiling("1000000", () => describeEnvelopeSchema({}));

  assert.ok(!("code" in clockSchema));
  assert.ok(!("code" in secretSchema));
  assert.ok(!("code" in questionSchema));
  assert.ok(!("code" in pageSchema));
  assert.equal(clockSchema.source_path, "tools/validators/src/schemas/story-pressure-clock.schema.json");
  assert.equal(secretSchema.source_path, "tools/validators/src/schemas/story-secret.schema.json");
  assert.equal(questionSchema.source_path, "tools/validators/src/schemas/story-question.schema.json");
  assert.ok(clockSchema.required_fields.includes("clock_kind"));
  assert.ok(secretSchema.required_fields.includes("secret_claim"));
  assert.ok(questionSchema.required_fields.includes("question_or_setup"));

  const activeRecordProperties = (((pageSchema.schema.properties as Record<string, unknown>)
    .state_snapshot as { properties?: Record<string, unknown> }).properties?.active_records as {
    properties?: Record<string, unknown>;
  }).properties;
  assert.ok(activeRecordProperties?.CLK);
  assert.ok(activeRecordProperties?.STSEC);
  assert.ok(activeRecordProperties?.STQ);

  assert.ok(envelope.delivery_status === "inline");
  const envelopeProperties = envelope.envelope_schema.properties as Record<string, unknown>;
  const allocationProperties = (envelopeProperties.expected_id_allocations as {
    properties?: Record<string, unknown>;
  }).properties;
  assert.ok(allocationProperties?.clk_ids);
  assert.ok(allocationProperties?.stsec_ids);
  assert.ok(allocationProperties?.stq_ids);
  for (const op of SPEC42_OPS) {
    assert.ok(OPERATION_KINDS.includes(op), `${op} should be a patch-engine operation`);
    assert.ok(envelope.op_schemas[op], `${op} should be described by describe_envelope_schema`);
  }
});

test("SPEC-42 capstone composes indexed retrieval, allocation, and story-pipeline context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const clock = await withRepoRoot(root, () =>
      getRecord({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, record_id: "CLK-1" })
    );
    const secret = await withRepoRoot(root, () =>
      getRecord({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, record_id: "STSEC-1" })
    );
    const question = await withRepoRoot(root, () =>
      getRecord({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, record_id: "STQ-1" })
    );

    assert.ok("record" in clock);
    assert.ok("record" in secret);
    assert.ok("record" in question);
    assert.equal(clock.record.record_kind, "pressure_clock_record");
    assert.equal(secret.record.record_kind, "story_secret_record");
    assert.equal(question.record.record_kind, "story_question_record");

    const counts = [
      await withRepoRoot(root, () =>
        listRecords({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, record_type: "pressure_clock_record" })
      ),
      await withRepoRoot(root, () =>
        listRecords({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, record_type: "story_secret_record" })
      ),
      await withRepoRoot(root, () =>
        listRecords({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, record_type: "story_question_record" })
      )
    ];
    assert.deepEqual(counts.map((result) => ("total" in result ? result.total : -1)), [1, 1, 1]);

    const nextIds = [
      await withRepoRoot(root, () =>
        allocateNextId({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, id_class: "CLK" })
      ),
      await withRepoRoot(root, () =>
        allocateNextId({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, id_class: "STSEC" })
      ),
      await withRepoRoot(root, () =>
        allocateNextId({ world_slug: STORY_FIXTURE_WORLD, story_slug: STORY_FIXTURE_SLUG, id_class: "STQ" })
      )
    ];
    assert.deepEqual(nextIds.map((result) => ("next_id" in result ? result.next_id : "")), ["CLK-2", "STSEC-2", "STQ-2"]);

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_turn_cycle",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["CF-1"],
        token_budget: 18000
      })
    );
    assert.ok(!("code" in packet));
    assert.deepEqual(packet.story_bundle_context?.active_clocks.map((item) => item.id), ["CLK-1"]);
    assert.deepEqual(packet.story_bundle_context?.hidden_secrets.map((item) => item.id), ["STSEC-1"]);
    assert.deepEqual(packet.story_bundle_context?.open_story_questions.map((item) => item.id), ["STQ-1"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-42 capstone validates create-record plans and STQ prohibited-field rejection", async () => {
  const root = createTempRepoRoot();
  seedWorld(root, { worldSlug: "seeded", nodes: [] });

  try {
    const accepted = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: createSpec42Plan() }));
    assert.ok("status" in accepted);
    assert.equal(accepted.status, "pass", JSON.stringify(accepted, null, 2));
    assert.deepEqual(accepted.verdicts, []);
    assert.ok(accepted.validators_run.some((entry) => entry.validator_name === "record_schema_compliance" && entry.status === "pass"));
    assert.ok(accepted.validators_run.some((entry) => entry.validator_name === "secret_carrier_existence" && entry.status === "pass"));
    assert.ok(accepted.validators_run.some((entry) => entry.validator_name === "story_question_payoff_integrity" && entry.status === "pass"));
    assert.ok(accepted.validators_run.some((entry) => entry.validator_name === "id_allocation_race" && entry.status === "pass"));

    const rejected = await withRepoRoot(root, () =>
      validatePatchPlan({
        patch_plan: createSpec42Plan({
          stq: { expected_payoff_mode: "revelation", act_position: "climax" },
          planId: "spec42-rejected"
        })
      })
    );
    assert.ok("status" in rejected);
    assert.equal(rejected.status, "fail");
    assert.ok(
      rejected.verdicts.some(
        (verdict) =>
          verdict.validator === "record_schema_compliance" &&
          verdict.location.node_id === "marla:STQ-1" &&
          verdict.message.includes("expected_payoff_mode")
      )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-42 capstone covers story-skill contract surfaces as executable surrogates", () => {
  const contract = readRepoFile(".claude/skills/_shared-templates/story-state-contract.md");
  assertContains(contract, [
    "`CLK` | Pressure clock",
    "`STSEC` | Story secret",
    "`STQ` | Story question / open setup",
    "clock_at_least(CLK-<integer>, value)",
    "secret_unrevealed(STSEC-<integer>)",
    "story_question_open(STQ-<integer>)",
    "Open Setups, Active Clocks, Hidden Secrets"
  ]);

  assertContains(readRepoFile(".claude/skills/branching-story-bootstrap/SKILL.md"), [
    "create_clk_record",
    "create_stsec_record",
    "create_stq_record",
    "expected_id_allocations.story_da_ids",
    "id_class=\"CLK\"|\"STSEC\"|\"STQ\""
  ]);
  assertContains(readRepoFile(".claude/skills/branching-story-turn-cycle/SKILL.md"), [
    "create_clk_record",
    "create_stsec_record",
    "create_stq_record",
    "§10b new-class visibility block"
  ]);
  assertContains(readRepoFile(".claude/skills/commitment-block-authoring/SKILL.md"), [
    "clock_advancing",
    "clue_discovering",
    "setup_paying_off"
  ]);
  assertContains(readRepoFile(".claude/skills/branching-story-health-audit/SKILL.md"), [
    "stalled_clock_check",
    "under_supported_critical_revelation_check",
    "dropped_high_salience_setup_check"
  ]);
  assertContains(readRepoFile(".claude/skills/branching-story-prose-attach/SKILL.md"), [
    "required_event_rendered CLK tick",
    "secret_reveal_undisclosed"
  ]);
});

function createSpec42Plan(options: {
  planId?: string;
  stq?: Record<string, unknown>;
} = {}) {
  return {
    plan_id: options.planId ?? "spec42-capstone",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-bootstrap",
    expected_id_allocations: {
      se_ids: ["SE-1"],
      clk_ids: ["CLK-1"],
      stsec_ids: ["STSEC-1"],
      stq_ids: ["STQ-1"]
    },
    patches: [
      {
        op: "create_se_record",
        target_world: "seeded",
        target_file: "stories/marla/_source/events/SE-1.yaml",
        payload: {
          story_slug: "marla",
          record: {
            id: "SE-1",
            story_id: "STORY-1",
            created_at_page: "PG-1",
            parent_page_id: null,
            event_kind: "story_start",
            actor: "system",
            commitment: {
              selected_slt_id: null,
              selection_source: "none",
              alias_bindings: {}
            },
            outcome_route: "accept",
            world_logic_rationale: "Genesis event for the SPEC-42 capstone fixture.",
            state_delta: { create: [], supersede: [], close: [] }
          }
        }
      },
      {
        op: "create_clk_record",
        target_world: "seeded",
        target_file: "stories/marla/_source/clocks/CLK-1.yaml",
        payload: {
          story_slug: "marla",
          record: {
            id: "CLK-1",
            story_id: "STORY-1",
            created_at_page: "PG-1",
            supersedes: null,
            title: "Loft exposure",
            clock_kind: "exposure",
            driver: "system",
            linked_records: [],
            value: 1,
            max: 6,
            salience: "high",
            visibility: "hidden",
            thresholds: [{ at: 4, label: "Patrol arrives", effects: { create: [], supersede: [], close: [] } }],
            tick_history: [{ event: "SE-1", delta: 1, cause: "The bell rang." }],
            status: "active",
            resolution_event: null
          }
        }
      },
      {
        op: "create_stsec_record",
        target_world: "seeded",
        target_file: "stories/marla/_source/secrets/STSEC-1.yaml",
        payload: {
          story_slug: "marla",
          record: {
            id: "STSEC-1",
            story_id: "STORY-1",
            created_at_page: "PG-1",
            supersedes: null,
            secret_kind: "event_cause",
            secret_claim: "The bell rang because someone pulled the loft cord.",
            truth_anchor: null,
            holders: ["STENT-1"],
            salience: "high",
            protected_mystery_refs: [],
            clue_carriers: [],
            source_records: [],
            status: "hidden",
            reveal_event: null,
            reveal_records: []
          }
        }
      },
      {
        op: "create_stq_record",
        target_world: "seeded",
        target_file: "stories/marla/_source/story-questions/STQ-1.yaml",
        payload: {
          story_slug: "marla",
          record: {
            id: "STQ-1",
            story_id: "STORY-1",
            created_at_page: "PG-1",
            supersedes: null,
            setup_kind: "dramatic_question",
            question_or_setup: "Who rang the loft bell?",
            salience: "high",
            audience_visibility: "explicit",
            source_event: "SE-1",
            source_records: [],
            payoff_of: null,
            status: "open",
            answer_event: null,
            answer_records: [],
            abandonment_rationale: null,
            ...(options.stq ?? {})
          }
        }
      }
    ]
  };
}

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function assertContains(content: string, needles: string[]): void {
  for (const needle of needles) {
    assert.ok(content.includes(needle), `expected content to include ${needle}`);
  }
}

async function withHarnessCeiling<T>(ceiling: string, run: () => Promise<T>): Promise<T> {
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  try {
    process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = ceiling;
    return await run();
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
  }
}
