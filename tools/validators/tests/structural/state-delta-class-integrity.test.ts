import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { stateDeltaClassIntegrity } from "../../src/structural/state-delta-class-integrity.js";
import { context, record } from "./helpers.js";

test("state_delta_class_integrity is scoped to full-world, pre-apply SE creates, and touched SE records", () => {
  assert.equal(stateDeltaClassIntegrity.applies_to(context([])), true);
  assert.equal(
    stateDeltaClassIntegrity.applies_to(
      context([], { run_mode: "pre-apply", patch_plan: patchPlan([storyPatch("create_se_record", "SE-1")]) })
    ),
    true
  );
  assert.equal(
    stateDeltaClassIntegrity.applies_to(
      context([], { run_mode: "pre-apply", patch_plan: patchPlan([storyPatch("create_clk_record", "CLK-1")]) })
    ),
    false
  );
  assert.equal(
    stateDeltaClassIntegrity.applies_to(
      context([], { run_mode: "incremental", touched_files: ["stories/marla/_source/events/SE-1.yaml"] })
    ),
    true
  );
});

test("state_delta_class_integrity rejects class-prefix drift", async () => {
  const ctx = context([
    event("marla", "SE-1", { create: ["BADCLASS-1"], supersede: [], close: [] })
  ]);

  const verdicts = await stateDeltaClassIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "state_delta_class_integrity_violation");
  assert.equal((verdicts[0]?.detail as { failure_mode?: string }).failure_mode, "class_drift");
  assert.match(verdicts[0]?.message ?? "", /outside the permitted story-state class set/);
});

test("state_delta_class_integrity rejects unresolvable create ids", async () => {
  const ctx = context([
    event("marla", "SE-1", { create: ["STSTAT-99"], supersede: [], close: [] })
  ]);

  const verdicts = await stateDeltaClassIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal((verdicts[0]?.detail as { failure_mode?: string }).failure_mode, "unresolved_id");
  assert.match(verdicts[0]?.message ?? "", /STSTAT-99 which does not resolve/);
});

test("state_delta_class_integrity rejects unresolvable supersede ids", async () => {
  const ctx = context([
    event("marla", "SE-1", { create: [], supersede: ["CLK-99"], close: [] })
  ]);

  const verdicts = await stateDeltaClassIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.equal((verdicts[0]?.detail as { state_delta_key?: string }).state_delta_key, "supersede");
  assert.match(verdicts[0]?.message ?? "", /CLK-99 which does not resolve/);
});

test("state_delta_class_integrity accepts STCHAR lifecycle deltas when they resolve", async () => {
  const ctx = context([
    event("marla", "SE-1", { create: ["STCHAR-2"], supersede: ["STCHAR-1"], close: ["STCHAR-3"] }),
    storyRecord("story_character_authority_record", "marla", "STCHAR-1", "story-characters", { status: "superseded" }),
    storyRecord("story_character_authority_record", "marla", "STCHAR-2", "story-characters", {
      status: "active",
      supersedes: "STCHAR-1"
    }),
    storyRecord("story_character_authority_record", "marla", "STCHAR-3", "story-characters", { status: "retired" })
  ]);

  assert.deepEqual(await stateDeltaClassIntegrity.run({}, ctx), []);
});

test("state_delta_class_integrity accepts all newly permitted SPEC-44 and SPEC-47 classes when they resolve", async () => {
  const ctx = context([
    event("marla", "SE-1", { create: ["STSTAT-1", "CLK-1", "STSEC-1", "STQ-1", "STPLAN-1", "STEMO-1"], supersede: [], close: [] }),
    storyRecord("story_status_record", "marla", "STSTAT-1", "status"),
    storyRecord("pressure_clock_record", "marla", "CLK-1", "clocks"),
    storyRecord("story_secret_record", "marla", "STSEC-1", "secrets"),
    storyRecord("story_question_record", "marla", "STQ-1", "story-questions"),
    storyRecord("story_plan_record", "marla", "STPLAN-1", "plans"),
    storyRecord("story_emotion_record", "marla", "STEMO-1", "emotions")
  ]);

  assert.deepEqual(await stateDeltaClassIntegrity.run({}, ctx), []);
});

test("state_delta_class_integrity accepts mixed create and supersede across patch-plan and repository records", async () => {
  const ctx = context([
    event("marla", "SE-1", { create: ["CLK-3"], supersede: ["CLK-2"], close: [] }),
    storyRecord("pressure_clock_record", "marla", "CLK-2", "clocks", { status: "active" }),
    storyRecord("pressure_clock_record", "marla", "CLK-3", "clocks", { status: "active", supersedes: "CLK-2" })
  ]);

  assert.deepEqual(await stateDeltaClassIntegrity.run({}, ctx), []);
});

test("state_delta_class_integrity scopes same ids by story slug", async () => {
  const ctx = context([
    event("marla", "SE-1", { create: ["CLK-1"], supersede: [], close: [] }),
    storyRecord("pressure_clock_record", "other-story", "CLK-1", "clocks")
  ]);

  const verdicts = await stateDeltaClassIntegrity.run({}, ctx);

  assert.equal(verdicts.length, 1);
  assert.match(verdicts[0]?.message ?? "", /CLK-1 which does not resolve/);
});

function patchPlan(patches: unknown[]): PatchPlanEnvelope {
  return {
    plan_id: "plan-001",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches
  } as unknown as PatchPlanEnvelope;
}

function storyPatch(op: string, id: string): unknown {
  const sourceDir = op === "create_se_record" ? "events" : "clocks";
  return {
    op,
    target_world: "test",
    target_file: `stories/marla/_source/${sourceDir}/${id}.yaml`,
    payload: {
      story_slug: "marla",
      record: { id }
    }
  };
}

function event(
  storySlug: string,
  id: string,
  stateDelta: { create: string[]; supersede: string[]; close: string[] }
) {
  return {
    ...record("story_event_record", `${storySlug}:${id}`, `stories/${storySlug}/_source/events/${id}.yaml`, {
      id,
      state_delta: stateDelta
    }),
    story_slug: storySlug
  };
}

function storyRecord(
  nodeType: string,
  storySlug: string,
  id: string,
  sourceDir: string,
  overrides: Record<string, unknown> = {}
) {
  const filePath = sourceDir === "story-characters"
    ? `stories/${storySlug}/story-characters/${id}.md`
    : `stories/${storySlug}/_source/${sourceDir}/${id}.yaml`;
  return {
    ...record(nodeType, `${storySlug}:${id}`, filePath, {
      id,
      ...overrides
    }),
    story_slug: storySlug
  };
}
