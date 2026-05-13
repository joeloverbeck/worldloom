import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getRecordSchema, SUPPORTED_RECORD_SCHEMA_NODE_TYPES } from "../../src/tools/get-record-schema";
import { validatePatchPlan } from "../../src/tools/validate-patch-plan";
import type { PatchPlanEnvelope as McpPatchPlanEnvelope } from "../../src/tools/_shared";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const WORLD_SLUG = "spec22-capstone";
const STORY_SLUG = "harborwatch";

test("greenfield story contract rejects legacy ARC_TRACE create ops before patch submission", async () => {
  const validation = await validatePatchPlan({
    patch_plan: buildArcTraceEnvelope("ARCTRACE-0001") as unknown as McpPatchPlanEnvelope
  });

  assert.ok("status" in validation);
  assert.equal(validation.status, "skipped");
  assert.equal(validation.reason, "patch_plan.patches[0].op must be a supported operation kind.");
  assert.deepEqual(validation.verdicts, []);
  assert.deepEqual(validation.validators_run, []);
});

test("greenfield story schema discovery exposes BEL and omits retired ARC_TRACE", async () => {
  assert.ok(SUPPORTED_RECORD_SCHEMA_NODE_TYPES.includes("belief_record"));
  assert.ok(!SUPPORTED_RECORD_SCHEMA_NODE_TYPES.includes("arc_trace_node" as never));
  assert.equal(existsSync(path.join(REPO_ROOT, "tools", "validators", "src", "schemas", "story-belief.schema.json")), true);
  assert.equal(
    existsSync(path.join(REPO_ROOT, "tools", "validators", "src", "schemas", "story-arc-trace.schema.json")),
    false
  );

  const result = await getRecordSchema({ node_type: "belief_record" });
  assert.ok(!("code" in result));
  assert.equal(result.schema.$id, "https://worldloom.local/schemas/story-belief.schema.json");
  assert.equal(result.source_path, "tools/validators/src/schemas/story-belief.schema.json");
  assert.deepEqual(result.required_fields, [
    "id",
    "story_id",
    "created_at_page",
    "holder",
    "claim",
    "belief_mode",
    "truth_relation",
    "confidence",
    "visibility",
    "basis",
    "consequences"
  ]);
});

test("deleted legacy story skills are not required by current capstone coverage", () => {
  const deletedSkillPaths = [
    ".claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md",
    ".claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md",
    ".claude/skills/branching-story-page-cycle/SKILL.md",
    ".claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md"
  ];

  for (const relativePath of deletedSkillPaths) {
    assert.equal(existsSync(path.join(REPO_ROOT, relativePath)), false, `${relativePath} should stay deleted`);
  }

  const foundations = readRepoFile("docs/FOUNDATIONS.md");
  assert.match(foundations, /Per-bundle records include STENT, SF, BEL, SE/);
  assert.match(foundations, /No ARC_TRACE class/);

  const storyStateContract = readRepoFile(".claude/skills/_shared-templates/story-state-contract.md");
  assert.match(storyStateContract, /\| `BEL` \| Belief, knowledge, suspicion, public claim, lie, witness memory, or misconception/);
  assert.match(storyStateContract, /There is no `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, or `stop_policy`/);
});

function buildArcTraceEnvelope(id: string): McpPatchPlanEnvelope {
  return {
    plan_id: `PLAN-SPEC22-${id}`,
    target_world: WORLD_SLUG,
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: { arc_trace_ids: [id] },
    patches: [
      {
        op: "create_arc_trace_record",
        target_world: WORLD_SLUG,
        target_file: `stories/${STORY_SLUG}/_source/arc-traces/${id}.yaml`,
        payload: {
          story_slug: STORY_SLUG,
          record: { id }
        }
      }
    ]
  };
}

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}
