import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "../../src/framework/types.js";
import {
  REQUIRED_STCHAR_SECTIONS,
  REQUIRED_STCHAR_SUBSECTIONS,
  stcharBodyIntegrity
} from "../../src/structural/stchar-body-integrity.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const HASH = `sha256:${"a".repeat(64)}`;
const FILE_PATH = `stories/${STORY}/story-characters/STCHAR-1.md`;
interface BodyOptions {
  omit?: string;
  duplicate?: string;
  empty?: string;
  omitSubsection?: string;
  duplicateSubsection?: string;
  emptySubsection?: string;
  legacyNoSubsections?: boolean;
}

test("stchar_body_integrity accepts complete exactly-once STCHAR body sections", async () => {
  const verdicts = await run(body());

  assert.deepEqual(verdicts, []);
});

test("stchar_body_integrity rejects missing required STCHAR body sections", async () => {
  const verdicts = await run(body({ omit: "Relationship-Specific Behavior" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.missing_section"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("Relationship-Specific Behavior")));
});

test("stchar_body_integrity rejects duplicated required STCHAR body sections", async () => {
  const verdicts = await run(body({ duplicate: "Pressure Behavior" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.duplicate_section"));
});

test("stchar_body_integrity rejects empty required STCHAR sections", async () => {
  const verdicts = await run(body({ empty: "Voice Bible / Dialogue Authority" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.empty_section"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("Voice Bible / Dialogue Authority")));
});

test("stchar_body_integrity rejects empty Page-Plan Voice Block", async () => {
  const verdicts = await run(body({ empty: "Page-Plan Voice Block" }));

  assert.ok(verdicts.some((verdict) => verdict.code === "stchar_body_integrity.empty_section"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("Page-Plan Voice Block")));
});

test("stchar_body_integrity rejects missing required STCHAR operational-home subsections for new records", async () => {
  const verdicts = await run(body({ omitSubsection: "Operational capabilities and affordances" }), {}, {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  });

  const missing = verdicts.find((verdict) => verdict.code === "stchar_body_integrity.missing_subsection");
  assert.ok(missing);
  assert.equal(missing.severity, "fail");
  assert.match(missing.message, /Operational capabilities and affordances/);
});

test("stchar_body_integrity fails everywhere for STCHAR bodies without operational-home subsections", async () => {
  const verdicts = await run(body({ legacyNoSubsections: true }));

  const missing = verdicts.filter((verdict) => verdict.code === "stchar_body_integrity.missing_subsection");
  assert.equal(missing.length, 4);
  assert.ok(missing.every((verdict) => verdict.severity === "fail"));
});

test("stchar_body_integrity requires Stable Source Material Inventory for world-char STCHAR records", async () => {
  const verdicts = await run(body({ omitSubsection: "Stable Source Material Inventory" }));

  const missing = verdicts.find((verdict) =>
    verdict.code === "stchar_body_integrity.missing_subsection" &&
    verdict.message.includes("Stable Source Material Inventory")
  );
  assert.ok(missing);
  assert.equal(missing.severity, "fail");
});

test("stchar_body_integrity permits story-local STCHAR records without Stable Source Material Inventory", async () => {
  const verdicts = await run(
    body({ omitSubsection: "Stable Source Material Inventory" }),
    {
      source_kind: "story_local",
      source_char_id: null,
      source_char_hash: null,
      source_char_sections_used: []
    }
  );

  assert.ok(!verdicts.some((verdict) => verdict.message.includes("Stable Source Material Inventory")));
});

test("stchar_body_integrity rejects empty required operational-home subsections", async () => {
  const verdicts = await run(body({ emptySubsection: "Signature scene behaviors to render" }), {}, {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  });

  const empty = verdicts.find((verdict) => verdict.code === "stchar_body_integrity.empty_subsection");
  assert.ok(empty);
  assert.equal(empty.severity, "fail");
  assert.match(empty.message, /Signature scene behaviors to render/);
});

test("stchar_body_integrity ignores legacy tamper hash frontmatter while enforcing body structure", async () => {
  const verdicts = await run(body(), {
    profile_hash: "sha256:ABC",
    voice_block_hash: HASH
  }, {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  });

  assert.deepEqual(verdicts, []);
});

test("stchar_body_integrity runs for append_story_character_authority_record pre-apply plans", async () => {
  assert.equal(stcharBodyIntegrity.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: {
      plan_id: "plan-stchar-body-integrity",
      target_world: "test",
      approval_token: "token",
      verdict: "ACCEPT",
      originating_skill: "test",
      expected_id_allocations: { stchar_ids: ["STCHAR-1"] },
      patches: [{
        op: "append_story_character_authority_record",
        target_world: "test",
        payload: { story_slug: STORY, record: stcharFrontmatter(), body_markdown: body() }
      }]
    }
  })), true);
});

test("stchar_body_integrity checks repair_story_character_authority_body_integrity pre-apply plans", async () => {
  const verdicts = await run(body(), {}, {
    run_mode: "pre-apply",
    patch_plan: stcharRepairPatchPlan(body())
  });

  assert.deepEqual(verdicts, []);
});

async function run(
  markdownBody: string,
  overrides: Record<string, unknown> = {},
  contextOverrides: Parameters<typeof context>[1] = {}
) {
  const stchar = stcharRecord(markdownBody, overrides);
  return stcharBodyIntegrity.run({
    files: [{ path: FILE_PATH, content: hybrid(stchar.parsed as Record<string, unknown>, markdownBody) }]
  }, context([stchar], contextOverrides));
}

function stcharRepairPatchPlan(markdownBody: string): PatchPlanEnvelope {
  return {
    plan_id: "plan-stchar-body-repair",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{
      op: "repair_story_character_authority_body_integrity",
      target_world: "test",
      target_file: FILE_PATH,
      payload: {
        story_slug: STORY,
        target_record_id: "STCHAR-1",
        body_markdown: markdownBody,
        source_operational_fact_map: [
          {
            source_field: "signature_scene_behaviors",
            disposition: "compressed",
            target_section: "Prose Rendering Constraints",
            rationale: "Carried into rendering constraints."
          }
        ]
      }
    }]
  } as PatchPlanEnvelope;
}

function stcharRecord(markdownBody: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `${STORY}:STCHAR-1`, FILE_PATH, stcharFrontmatter(overrides, markdownBody)),
    story_slug: STORY
  };
}

function stcharFrontmatter(overrides: Record<string, unknown> = {}, markdownBody = body()): Record<string, unknown> {
  return {
    id: "STCHAR-1",
    story_id: "STORY-1",
    story_slug: STORY,
    world_slug: "test",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_hash: HASH,
    source_char_sections_used: ["Overview"],
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

function stcharPatchPlan(): PatchPlanEnvelope {
  return {
    plan_id: "plan-stchar-body-integrity",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "test",
    expected_id_allocations: { stchar_ids: ["STCHAR-1"] },
    patches: [{
      op: "append_story_character_authority_record",
      target_world: "test",
      payload: { story_slug: STORY, record: stcharFrontmatter(), body_markdown: body() }
    }]
  } as PatchPlanEnvelope;
}

function body(options: BodyOptions = {}): string {
  const sections = REQUIRED_STCHAR_SECTIONS
    .filter((section) => section !== options.omit)
    .flatMap((section) => section === options.duplicate ? [section, section] : [section]);
  return sections
    .map((section) => `## ${section}\n\n${sectionContent(section, options)}`)
    .join("\n\n");
}

function sectionContent(section: string, options: BodyOptions): string {
  if (section === options.empty) {
    return "";
  }

  const requirement = REQUIRED_STCHAR_SUBSECTIONS.find((item) => item.section === section);
  if (requirement === undefined || options.legacyNoSubsections) {
    return `${section} authority prose.`;
  }

  const subsections = requirement.subsections
    .filter((subsection) => subsection !== options.omitSubsection)
    .flatMap((subsection) => subsection === options.duplicateSubsection ? [subsection, subsection] : [subsection]);
  return [
    `${section} authority prose.`,
    ...subsections.map((subsection) =>
      `### ${subsection}\n\n${subsection === options.emptySubsection ? "" : `${subsection} authority prose.`}`
    )
  ].join("\n\n");
}
