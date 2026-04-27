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
        target_file: "_source/canon/CF-0001.yaml",
        payload: {
          cf_record: {
            id: "CF-0001",
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
        target_file: "_source/institutions/SEC-INS-001.yaml",
        payload: {
          sec_record: {
            id: "SEC-INS-001",
            file_class: "INSTITUTIONS",
            order: 1,
            heading: "Harbor Office",
            heading_level: 2,
            body: "Brinewick maintains a harbor office.",
            extensions: [],
            touched_by_cf: ["CF-0001"]
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

    assert.deepEqual(result, { status: "pass", verdicts: [] });
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
    verdicts: []
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
    verdicts: []
  });
});
