import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "../../src/framework/types.js";
import { stcharSourceFactCoverage } from "../../src/structural/stchar-source-fact-coverage.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const SOURCE_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const HASH = `sha256:${SOURCE_HASH}`;
const STCHAR_PATH = `stories/${STORY}/story-characters/STCHAR-1.md`;

test("stchar_source_fact_coverage rejects retained source facts mapped only to Source Distillation", async () => {
  const verdicts = await run([
    sourceChar(),
    stchar({
      source_operational_fact_map: [
        mapEntry("signature_scene_behaviors", "copied", { target_section: "Source Distillation" })
      ]
    })
  ]);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_fact_coverage.source_distillation_target");
});

test("stchar_source_fact_coverage accepts mapped structured source facts in operational STCHAR homes", async () => {
  const verdicts = await run([
    sourceChar({ dramatic_core: { signature_scene_behaviors: ["turns insults into filings"] } }),
    stchar({
      source_operational_fact_map: [
        mapEntry("signature_scene_behaviors", "copied", { target_section: "Prose Rendering Constraints" })
      ]
    })
  ]);

  assert.deepEqual(verdicts, []);
});

test("stchar_source_fact_coverage rejects present dramatic_core fields with no map entry", async () => {
  const verdicts = await run([
    sourceChar({ dramatic_core: { signature_scene_behaviors: ["turns insults into filings"] } }),
    stchar({ source_operational_fact_map: [] })
  ]);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_fact_coverage.missing_fact_map");
  assert.deepEqual((verdicts[0]?.detail as { missing_source_fields?: string[] }).missing_source_fields, [
    "signature_scene_behaviors"
  ]);
});

test("stchar_source_fact_coverage accepts omitted source facts with rationale", async () => {
  const verdicts = await run([
    sourceChar({ dramatic_core: { active_appetite: "She wants one public pardon." } }),
    stchar({
      source_operational_fact_map: [
        mapEntry("active_appetite", "omitted_with_rationale", {
          rationale: "Not relevant to the current story premise."
        })
      ]
    })
  ]);

  assert.deepEqual(verdicts, []);
});

test("stchar_source_fact_coverage rejects omitted source facts without rationale", async () => {
  const verdicts = await run([
    sourceChar({ dramatic_core: { active_appetite: "She wants one public pardon." } }),
    stchar({
      source_operational_fact_map: [
        mapEntry("active_appetite", "omitted_with_rationale")
      ]
    })
  ]);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_fact_coverage.missing_rationale");
});

test("stchar_source_fact_coverage skips story_local STCHARs with null maps", async () => {
  const verdicts = await run([
    stchar({
      source_kind: "story_local",
      source_char_id: null,
      source_char_hash: null,
      source_operational_fact_map: null
    })
  ]);

  assert.deepEqual(verdicts, []);
});

test("stchar_source_fact_coverage warns for untouched legacy world_char STCHARs lacking the map", async () => {
  const verdicts = await stcharSourceFactCoverage.run(undefined, context([
    sourceChar({ dramatic_core: { signature_scene_behaviors: ["turns insults into filings"] } }),
    stchar()
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_source_fact_coverage.missing_fact_map");
  assert.equal(verdicts[0]?.severity, "warn");
});

test("stchar_source_fact_coverage ignores source hash drift while checking fact-map coverage", async () => {
  const verdicts = await run([
    sourceChar({ dramatic_core: { signature_scene_behaviors: ["turns insults into filings"] } }),
    stchar({
      source_char_hash: `sha256:${"a".repeat(64)}`,
      source_operational_fact_map: [
        mapEntry("signature_scene_behaviors", "copied", { target_section: "Prose Rendering Constraints" })
      ]
    })
  ]);

  assert.deepEqual(verdicts, []);
});

test("stchar_source_fact_coverage runs for STCHAR pre-apply plans", async () => {
  assert.equal(stcharSourceFactCoverage.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  })), true);
});

test("stchar_source_fact_coverage checks repair_story_character_authority_body_integrity pre-apply plans", async () => {
  const verdicts = await stcharSourceFactCoverage.run(undefined, context([
    sourceChar({ dramatic_core: { signature_scene_behaviors: ["turns insults into filings"] } }),
    stchar({
      source_operational_fact_map: [
        mapEntry("signature_scene_behaviors", "compressed", {
          target_section: "Prose Rendering Constraints",
          rationale: "Carried into rendering constraints."
        })
      ]
    })
  ], {
    run_mode: "pre-apply",
    patch_plan: stcharRepairPatchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

async function run(records: ReturnType<typeof record>[]) {
  return stcharSourceFactCoverage.run(undefined, context(records, {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  }));
}

function stcharRepairPatchPlan(): PatchPlanEnvelope {
  return {
    plan_id: "plan-stchar-source-fact-repair",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{
      op: "repair_story_character_authority_body_integrity",
      target_world: "test",
      target_file: STCHAR_PATH,
      payload: {
        story_slug: STORY,
        target_record_id: "STCHAR-1",
        body_markdown: "## Profile\n\nBody.",
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
  } as unknown as PatchPlanEnvelope;
}

function sourceChar(overrides: Record<string, unknown> = {}) {
  return {
    ...record("character_record", "CHAR-1", "characters/source-char.md", {
      character_id: "CHAR-1",
      name: "Source Character",
      dramatic_core: {
        signature_scene_behaviors: ["turns insults into filings"]
      },
      ...overrides
    }),
    content_hash: SOURCE_HASH
  };
}

function stchar(overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `${STORY}:STCHAR-1`, STCHAR_PATH, stcharFrontmatter(overrides)),
    story_slug: STORY
  };
}

function stcharFrontmatter(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
    profile_hash: `sha256:${"b".repeat(64)}`,
    voice_block_hash: `sha256:${"c".repeat(64)}`,
    ...overrides
  };
}

function mapEntry(
  sourceField: string,
  disposition: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    source_field: sourceField,
    disposition,
    ...overrides
  };
}

function stcharPatchPlan(): PatchPlanEnvelope {
  return {
    plan_id: "plan-stchar-source-fact-coverage",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "test",
    expected_id_allocations: { stchar_ids: ["STCHAR-1"] },
    patches: [{
      op: "append_story_character_authority_record",
      target_world: "test",
      payload: { story_slug: STORY, record: stcharFrontmatter(), body_markdown: "## Profile\n\nBody." }
    }]
  } as PatchPlanEnvelope;
}
