import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "../../src/framework/types.js";
import { stcharSourceMaterialInventoryIntegrity } from "../../src/structural/stchar-source-material-inventory-integrity.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const HASH = `sha256:${"a".repeat(64)}`;
const FILE_PATH = `stories/${STORY}/story-characters/STCHAR-1.md`;

test("stchar_source_material_inventory_integrity accepts retained material mapped to operational homes", async () => {
  const verdicts = await run(body(inventory([
    row("Capabilities", "copied", "Agency and Planning Tendencies", "Stable capability shapes future choices.")
  ])));

  assert.deepEqual(verdicts, []);
});

test("stchar_source_material_inventory_integrity accepts structured story_irrelevant rationale", async () => {
  const verdicts = await run(body(inventory([
    row("Trivia", "story_irrelevant", null, "non_operational_trivia")
  ])));

  assert.deepEqual(verdicts, []);
});

test("stchar_source_material_inventory_integrity rejects missing inventory subsection", async () => {
  const verdicts = await run(body(null));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_material_inventory_integrity.missing_inventory");
});

test("stchar_source_material_inventory_integrity rejects empty inventory", async () => {
  const verdicts = await run(body(inventory([])));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_material_inventory_integrity.empty_inventory");
});

test("stchar_source_material_inventory_integrity rejects malformed inventory header", async () => {
  const verdicts = await run(body([
    "| source_area | disposition | rationale |",
    "|---|---|---|",
    "| Capabilities | copied | Stable capability. |"
  ].join("\n")));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_material_inventory_integrity.invalid_inventory_header");
});

test("stchar_source_material_inventory_integrity rejects retained rows mapped to Source Distillation", async () => {
  const verdicts = await run(body(inventory([
    row("Capabilities", "compressed", "Source Distillation", "Retained as provenance.")
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "stchar_source_material_inventory_integrity.source_distillation_operational_home"
  ));
});

test("stchar_source_material_inventory_integrity rejects invalid retained operational homes", async () => {
  const verdicts = await run(body(inventory([
    row("Capabilities", "copied", "Current Bruise Summary", "Stable capability.")
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "stchar_source_material_inventory_integrity.invalid_operational_home"
  ));
});

test("stchar_source_material_inventory_integrity rejects opening-page relevance rationales", async () => {
  const verdicts = await run(body(inventory([
    row("Capabilities", "story_irrelevant", null, "not_needed_on_page_1")
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "stchar_source_material_inventory_integrity.invalid_story_irrelevant_rationale"
  ));
  assert.ok(verdicts.some((verdict) =>
    verdict.code === "stchar_source_material_inventory_integrity.opening_relevance_rationale"
  ));
});

test("stchar_source_material_inventory_integrity rejects omitted rows without rationale", async () => {
  const verdicts = await run(body(inventory([
    row("Capabilities", "omitted_with_rationale", null, null)
  ])));

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "stchar_source_material_inventory_integrity.missing_rationale"
  ));
});

test("stchar_source_material_inventory_integrity permits story-local STCHAR without inventory", async () => {
  const verdicts = await run(body(null), {
    source_kind: "story_local",
    source_char_id: null,
    source_char_hash: null,
    source_char_sections_used: []
  });

  assert.deepEqual(verdicts, []);
});

test("stchar_source_material_inventory_integrity runs for STCHAR pre-apply plans", async () => {
  assert.equal(stcharSourceMaterialInventoryIntegrity.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  })), true);
});

async function run(markdownBody: string, overrides: Record<string, unknown> = {}) {
  const stchar = stcharRecord(markdownBody, overrides);
  return stcharSourceMaterialInventoryIntegrity.run({
    files: [{ path: FILE_PATH, content: hybrid(stchar.parsed as Record<string, unknown>, markdownBody) }]
  }, context([stchar], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  }));
}

function stcharRecord(markdownBody: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `${STORY}:STCHAR-1`, FILE_PATH, stcharFrontmatter(overrides, markdownBody)),
    story_slug: STORY
  };
}

function stcharFrontmatter(overrides: Record<string, unknown> = {}, markdownBody = body(inventory([
  row("Capabilities", "copied", "Agency and Planning Tendencies", "Stable capability shapes future choices.")
]))): Record<string, unknown> {
  return {
    id: "STCHAR-1",
    story_id: "STORY-1",
    story_slug: STORY,
    world_slug: "test",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_hash: HASH,
    source_char_sections_used: ["Overview"],
    source_operational_fact_map: [],
    story_local_inputs_used: [],
    generated_at_page: "story_bootstrap",
    created_by_skill: "story-character-profile",
    supersedes: null,
    superseded_by: null,
    status: "active",
    bound_stent_ids: ["STENT-1"],
    profile_revision: 1,
    body_schema_version: "stchar.v1",
    profile_hash: HASH,
    voice_block_hash: HASH,
    ...overrides
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

function body(inventoryMarkdown: string | null): string {
  const sourceDistillation = inventoryMarkdown === null
    ? "Compression trace only."
    : `Compression trace only.\n\n### Stable Source Material Inventory\n\n${inventoryMarkdown}`;
  return [
    "## Story-Facing Identity\n\nIdentity authority prose.",
    `## Source Distillation\n\n${sourceDistillation}`,
    "## Stable Persona Core\n\nStable persona authority prose.",
    "## Emotional Appraisal Map\n\nAppraisal authority prose.",
    "## Pressure Behavior\n\nPressure authority prose.",
    "## Voice Bible / Dialogue Authority\n\nVoice authority prose.",
    "## Page-Plan Voice Block\n\nVoice seed authority prose.",
    "## Perception and Embodiment\n\nEmbodiment authority prose.",
    "## Agency and Planning Tendencies\n\nAgency authority prose.\n\n### Operational capabilities and affordances\n\nCapability prose.\n\n### Capability limits, costs, and access constraints\n\nLimit prose.",
    "## Relationship-Specific Behavior\n\nRelationship authority prose.",
    "## Story-State Derivation Guide\n\nDerivation authority prose.",
    "## Prose Rendering Constraints\n\nRendering authority prose.\n\n### Signature scene behaviors to render\n\nSignature behavior prose.",
    "## Validation / Audit Anchors\n\nAudit anchor prose."
  ].join("\n\n");
}

function inventory(rows: string[]): string {
  return [
    "| source_area | stable operational material | disposition | operational_home | rationale |",
    "|---|---|---|---|---|",
    ...rows
  ].join("\n");
}

function row(sourceArea: string, disposition: string, operationalHome: string | null, rationale: string | null): string {
  return `| ${sourceArea} | Stable source material. | ${disposition} | ${operationalHome ?? ""} | ${rationale ?? ""} |`;
}

function stcharPatchPlan(): PatchPlanEnvelope {
  return {
    plan_id: "plan-stchar-source-material-inventory",
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
        record: stcharFrontmatter(),
        body_markdown: body(inventory([
          row("Capabilities", "copied", "Agency and Planning Tendencies", "Stable capability shapes future choices.")
        ]))
      }
    }]
  } as PatchPlanEnvelope;
}
