import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "../../src/framework/types.js";
import { stcharTemporalReferenceBoundary } from "../../src/structural/stchar-temporal-reference-boundary.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const FILE_PATH = `stories/${STORY}/story-characters/STCHAR-1.md`;

test("stchar_temporal_reference_boundary accepts temporal ids in audit anchors", async () => {
  const verdicts = await run(body({
    "Validation / Audit Anchors": "Generated from SE-1, PG-1, and STEMO-1 evidence."
  }));

  assert.deepEqual(verdicts, []);
});

test("stchar_temporal_reference_boundary accepts temporal ids in Source Distillation provenance", async () => {
  const verdicts = await run(body({
    "Source Distillation": "Generated at PG-1 during story bootstrap."
  }));

  assert.deepEqual(verdicts, []);
});

test("stchar_temporal_reference_boundary accepts stable operational prose without record ids", async () => {
  const verdicts = await run(body({
    "Pressure Behavior": "Under humiliation, she turns shame into bravado.",
    "Stable Persona Core": "At the opening of the gala, her instinct is to make herself unforgettable."
  }));

  assert.deepEqual(verdicts, []);
});

test("stchar_temporal_reference_boundary rejects Page-Plan Voice Block current-state citations", async () => {
  const verdicts = await run(body({
    "Page-Plan Voice Block": "As of STEMO-1, her voice is cracked with fear."
  }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_temporal_reference_boundary.temporal_record_in_operational_section");
  assert.equal((verdicts[0]?.detail as { section?: string }).section, "Page-Plan Voice Block");
  assert.equal((verdicts[0]?.detail as { record_id?: string }).record_id, "STEMO-1");
});

test("stchar_temporal_reference_boundary rejects durable persona citations to PG", async () => {
  const verdicts = await run(body({
    "Stable Persona Core": "As of PG-1 she is unable to go home."
  }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_temporal_reference_boundary.temporal_record_in_operational_section");
  assert.equal((verdicts[0]?.detail as { section?: string }).section, "Stable Persona Core");
  assert.equal((verdicts[0]?.detail as { record_id?: string }).record_id, "PG-1");
});

test("stchar_temporal_reference_boundary rejects pressure behavior citations to active belief or plan records", async () => {
  const verdicts = await run(body({
    "Pressure Behavior": "BEL-2 makes her assume mockery; STPLAN-4 keeps her from retreating."
  }));

  assert.deepEqual(
    verdicts.map((verdict) => (verdict.detail as { record_id?: string }).record_id),
    ["BEL-2", "STPLAN-4"]
  );
});

test("stchar_temporal_reference_boundary runs for STCHAR pre-apply plans", async () => {
  assert.equal(stcharTemporalReferenceBoundary.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  })), true);
});

async function run(markdownBody: string) {
  const stchar = stcharRecord();
  return stcharTemporalReferenceBoundary.run({
    files: [{ path: FILE_PATH, content: hybrid(stchar.parsed as Record<string, unknown>, markdownBody) }]
  }, context([stchar], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  }));
}

function stcharRecord() {
  return {
    ...record("story_character_authority_record", `${STORY}:STCHAR-1`, FILE_PATH, {
      id: "STCHAR-1",
      story_id: "STORY-1",
      story_slug: STORY,
      world_slug: "test",
      source_kind: "world_char",
      story_local_inputs_used: ["SE-1", "STEMO-1"],
      generated_at_page: "PG-1",
      supersedes: null
    }),
    story_slug: STORY
  };
}

function hybrid(frontmatter: Record<string, unknown>, markdownBody: string): string {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${markdownBody}`;
}

function formatYamlValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  return JSON.stringify(value);
}

function body(overrides: Partial<Record<SectionName, string>> = {}): string {
  const sections: Record<SectionName, string> = {
    "Story-Facing Identity": "Identity authority prose.",
    "Source Distillation": "Compression trace only.",
    "Stable Persona Core": "Stable persona authority prose.",
    "Emotional Appraisal Map": "Appraisal authority prose.",
    "Pressure Behavior": "Pressure authority prose.",
    "Voice Bible / Dialogue Authority": "Voice authority prose.",
    "Page-Plan Voice Block": "Voice seed authority prose.",
    "Perception and Embodiment": "Embodiment authority prose.",
    "Agency and Planning Tendencies": "Agency authority prose.",
    "Relationship-Specific Behavior": "Relationship authority prose.",
    "Story-State Derivation Guide": "Derivation authority prose.",
    "Prose Rendering Constraints": "Rendering authority prose.",
    "Validation / Audit Anchors": "Audit anchor prose."
  };

  return Object.entries({ ...sections, ...overrides })
    .map(([section, text]) => `## ${section}\n\n${text}`)
    .join("\n\n");
}

type SectionName =
  | "Story-Facing Identity"
  | "Source Distillation"
  | "Stable Persona Core"
  | "Emotional Appraisal Map"
  | "Pressure Behavior"
  | "Voice Bible / Dialogue Authority"
  | "Page-Plan Voice Block"
  | "Perception and Embodiment"
  | "Agency and Planning Tendencies"
  | "Relationship-Specific Behavior"
  | "Story-State Derivation Guide"
  | "Prose Rendering Constraints"
  | "Validation / Audit Anchors";

function stcharPatchPlan(): PatchPlanEnvelope {
  return {
    plan_id: "plan-stchar-temporal-reference-boundary",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "test",
    expected_id_allocations: { stchar_ids: ["STCHAR-1"] },
    patches: [{
      op: "append_story_character_authority_record",
      target_world: "test",
      payload: {
        story_slug: STORY,
        record: { id: "STCHAR-1" },
        body_markdown: "## Profile\n\nBody."
      }
    }]
  } as PatchPlanEnvelope;
}
