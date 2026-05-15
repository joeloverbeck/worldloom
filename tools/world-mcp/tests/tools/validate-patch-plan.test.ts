import assert from "node:assert/strict";
import test from "node:test";

import { validatePatchPlan } from "../../src/tools/validate-patch-plan";
import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildValidPatchPlan() {
  return {
    plan_id: "plan-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_cf_record",
        target_world: "seeded",
        target_file: "_source/canon/CF-1.yaml",
        payload: {
          cf_record: {
            id: "CF-1",
            title: "Brinewick Harbor Office",
            status: "hard_canon",
            type: "institution",
            statement: "Brinewick maintains a harbor office.",
            scope: { geographic: "local", temporal: "current", social: "public" },
            truth_scope: { world_level: true, diegetic_status: "objective" },
            domains_affected: ["law"],
            prerequisites: ["appointed clerks"],
            distribution: {
              who_can_do_it: ["clerks"],
              who_cannot_easily_do_it: ["outsiders"],
              why_not_universal: ["requires harbor appointment"]
            },
            costs_and_limits: ["bounded staff time"],
            visible_consequences: ["posted ledgers"],
            required_world_updates: ["INSTITUTIONS"],
            source_basis: { direct_user_approval: true, derived_from: [] },
            contradiction_risk: { hard: false, soft: false },
            notes: "None",
            extensions: []
          }
        }
      },
      {
        op: "create_sec_record",
        target_world: "seeded",
        target_file: "_source/institutions/SEC-INS-1.yaml",
        payload: {
          sec_record: {
            id: "SEC-INS-1",
            file_class: "INSTITUTIONS",
            order: 1,
            heading: "Harbor Office",
            heading_level: 2,
            body: "Brinewick maintains a harbor office.",
            extensions: [],
            touched_by_cf: ["CF-1"]
          }
        }
      }
    ]
  };
}

function seedEmptyWorld(root: string): void {
  seedWorld(root, { worldSlug: "seeded", nodes: [] });
}

test("validatePatchPlan returns pass when validators run without failures", async () => {
  const root = createTempRepoRoot();
  seedEmptyWorld(root);

  try {
    const result = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: buildValidPatchPlan() }));

    assert.ok("status" in result);
    assert.equal(result.status, "pass");
    assert.deepEqual(result.verdicts, []);
    assertValidatorRunEntries(result.validators_run);
    assert.ok(result.validators_run.some((entry) => entry.status === "pass"));
    assert.ok(
      result.validators_run.some(
        (entry) => entry.validator_name === "id_allocation_race" && entry.status === "pass"
      )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("validatePatchPlan accepts create_bel_record through pre-apply validation", async () => {
  const root = createTempRepoRoot();
  seedEmptyWorld(root);

  try {
    const plan = {
      plan_id: "plan-bel-001",
      target_world: "seeded",
      approval_token: "token-from-gate",
      verdict: "ACCEPT",
      originating_skill: "branching-story-bootstrap",
      expected_id_allocations: { bel_ids: ["BEL-1"] },
      patches: [
        {
          op: "create_bel_record",
          target_world: "seeded",
          target_file: "stories/marla-kern-seduction/_source/beliefs/BEL-1.yaml",
          payload: {
            story_slug: "marla-kern-seduction",
            record: {
              id: "BEL-1",
              story_id: "STORY-1",
              created_at_page: "PG-1",
              holder: "STENT-1",
              claim: "Mara believes Kern controls the harbor ledgers.",
              belief_mode: "believes",
              truth_relation: "unknown",
              confidence: "low",
              visibility: "private",
              basis: {
                source_event: "SE-1",
                access_route: "testimony",
                access_records: ["STENT-1", "SE-1"]
              },
              consequences: {
                opens: [],
                constrains_choices: []
              }
            }
          }
        }
      ]
    };

    const result = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: plan }));

    assert.ok("status" in result);
    assert.equal(result.status, "pass");
    assert.deepEqual(result.verdicts, []);
    assert.ok(
      result.validators_run.some(
        (entry) => entry.validator_name === "id_allocation_race" && entry.status === "pass"
      )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("validatePatchPlan accepts append_story_diegetic_artifact_record through pre-apply validation", async () => {
  const root = createTempRepoRoot();
  seedEmptyWorld(root);

  try {
    const plan = {
      plan_id: "plan-story-da-001",
      target_world: "seeded",
      approval_token: "token-from-gate",
      verdict: "ACCEPT",
      originating_skill: "story-promotion-closeout",
      expected_id_allocations: { story_da_ids: ["DA-1"] },
      patches: [
        {
          op: "append_story_diegetic_artifact_record",
          target_world: "seeded",
          target_file: "stories/marla-kern-seduction/_source/artifacts/DA-1.yaml",
          payload: {
            story_slug: "marla-kern-seduction",
            record: {
              id: "DA-1",
              story_id: "STORY-1",
              created_at_page: "PG-1",
              title: "Ledger Fragment",
              author: "STENT-1",
              genre: "letter",
              body: "A copied fragment points back to the harbor ledgers.",
              intended_audience: "STENT-1",
              circulation: "private",
              truth_relation: "partly_true"
            }
          }
        }
      ]
    };

    const result = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: plan }));

    assert.ok("status" in result);
    assert.equal(result.status, "pass");
    assert.deepEqual(result.verdicts, []);
    assert.ok(
      result.validators_run.some(
        (entry) => entry.validator_name === "id_allocation_race" && entry.status === "pass"
      )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("validatePatchPlan returns fail and surfaces rule verdicts from the validators package", async () => {
  const root = createTempRepoRoot();
  seedEmptyWorld(root);

  try {
    const plan = buildValidPatchPlan();
    (plan.patches[0]!.payload as any).cf_record.distribution.why_not_universal = [];
    const result = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: plan }));

    assert.ok("verdicts" in result);
    assert.equal(result.status, "fail");
    assert.ok(result.verdicts.some((verdict) => verdict.code === "rule4.missing_why_not_universal"));
    assertValidatorRunEntries(result.validators_run);
    assert.ok(result.validators_run.some((entry) => entry.status === "fail"));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("validatePatchPlan returns fail and surfaces id allocation races before signing", async () => {
  const root = createTempRepoRoot();
  seedEmptyWorld(root);

  try {
    const plan = buildValidPatchPlan();
    plan.expected_id_allocations = { cf_ids: ["CF-2"] };
    const result = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: plan }));

    assert.ok("verdicts" in result);
    assert.equal(result.status, "fail");
    assert.ok(
      result.validators_run.some(
        (entry) => entry.validator_name === "id_allocation_race" && entry.status === "fail"
      )
    );
    assert.ok(
      result.verdicts.some(
        (verdict) =>
          verdict.validator === "id_allocation_race" &&
          verdict.code === "id_allocation_race" &&
          verdict.message.includes("cf_ids allocation race: expected CF-2, current next id is CF-1.")
      )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("validatePatchPlan returns skipped for a malformed plan before validator delegation", async () => {
  const result = await validatePatchPlan({
    patch_plan: {
      ...buildValidPatchPlan(),
      plan_id: ""
    }
  });

  assert.deepEqual(result, {
    status: "skipped",
    reason: "patch_plan.plan_id must be a non-empty string.",
    verdicts: [],
    validators_run: []
  });
});

test("validatePatchPlan returns skipped for an empty patch list before validator delegation", async () => {
  const result = await validatePatchPlan({
    patch_plan: {
      ...buildValidPatchPlan(),
      patches: []
    }
  });

  assert.deepEqual(result, {
    status: "skipped",
    reason: "patch_plan.patches must be a non-empty array.",
    verdicts: [],
    validators_run: []
  });
});

test("validatePatchPlan preserves additional envelope-shape errors on skipped responses", async () => {
  const plan = buildValidPatchPlan();
  plan.patches = [
    { op: "", target_world: "seeded", target_file: "", payload: {} },
    { op: "create_sec_record", target_world: "", target_file: "_source/institutions/SEC-INS-1.yaml" }
  ] as unknown as ReturnType<typeof buildValidPatchPlan>["patches"];

  const result = await validatePatchPlan({ patch_plan: plan });

  assert.ok("status" in result);
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "patch_plan.patches[0].op must be a non-empty string.");
  assert.deepEqual(result.validators_run, []);
  assert.ok(result.details !== undefined);
  assert.equal(result.details.field, "patch_plan.patches[0].op");
  assert.deepEqual(
    (result.details.additional_errors as Array<{ details?: { field?: string } }>).map(
      (entry) => entry.details?.field
    ),
    [
      "patch_plan.patches[0].target_file",
      "patch_plan.patches[1].target_world",
      "patch_plan.patches[1].payload"
    ]
  );
});

test("validatePatchPlan rejects retired create_arc_trace_record before validator delegation", async () => {
  const plan = buildValidPatchPlan();
  plan.patches = [
    {
      op: "create_arc_trace_record",
      target_world: "seeded",
      target_file: "stories/marla-kern-seduction/_source/arc-traces/ARCTRACE-0001.yaml",
      payload: {
        story_slug: "marla-kern-seduction",
        record: { id: "ARCTRACE-0001" }
      }
    }
  ] as unknown as ReturnType<typeof buildValidPatchPlan>["patches"];

  const result = await validatePatchPlan({ patch_plan: plan });

  assert.deepEqual(result, {
    status: "skipped",
    reason: "patch_plan.patches[0].op must be a supported operation kind.",
    verdicts: [],
    validators_run: []
  });
});

function assertValidatorRunEntries(
  entries: Array<{ validator_name: string; status: string; duration_ms: number; detail?: string }>
): void {
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.equal(typeof entry.validator_name, "string");
    assert.match(entry.validator_name, /.+/);
    assert.ok(["pass", "fail", "skipped"].includes(entry.status));
    assert.equal(typeof entry.duration_ms, "number");
    assert.ok(entry.duration_ms >= 0);
    if (entry.detail !== undefined) {
      assert.equal(typeof entry.detail, "string");
    }
  }
}
