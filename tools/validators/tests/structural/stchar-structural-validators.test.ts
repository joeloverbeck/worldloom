import assert from "node:assert/strict";
import test from "node:test";

import { characterGroundingConsistency } from "../../src/structural/character-grounding-consistency.js";
import { noCharAuthorityInStoryRuntime } from "../../src/structural/no-char-authority-in-story-runtime.js";
import { stcharActiveForBoundStent } from "../../src/structural/stchar-active-for-bound-stent.js";
import { stcharResolves } from "../../src/structural/stchar-resolves.js";
import { stcharSupersessionIntegrity } from "../../src/structural/stchar-supersession-integrity.js";
import { stentRequiresStchar } from "../../src/structural/stent-requires-stchar.js";
import { context, record } from "./helpers.js";

test("stent_requires_stchar accepts background-only STENT and bound non-background STENT", async () => {
  const verdicts = await stentRequiresStchar.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1", { role_in_story: ["background"], bound_stchar_id: null })),
    storyRecord("story_entity_record", "STENT-2", "entities", stent("STENT-2"))
  ]));

  assert.deepEqual(verdicts, []);
});

test("stent_requires_stchar rejects non-background STENT without STCHAR binding", async () => {
  const verdicts = await stentRequiresStchar.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1", {
      role_in_story: ["witness", "pressure_source"],
      bound_stchar_id: null
    }))
  ]));

  assert.equal(verdicts[0]?.code, "stent_requires_stchar.missing_stchar_binding");
});

test("stchar_resolves accepts STENT and page references to existing STCHAR", async () => {
  const verdicts = await stcharResolves.run(undefined, context(baseRecords()));

  assert.deepEqual(verdicts, []);
});

test("stchar_resolves rejects missing STCHAR references from STENT and active_records", async () => {
  const verdicts = await stcharResolves.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1", { bound_stchar_id: "STCHAR-99" })),
    page("PG-1", { STENT: ["STENT-1"], STCHAR: ["STCHAR-100"] })
  ]));

  assert.deepEqual(
    verdicts.map((verdict) => (verdict.detail as { reference_id: string }).reference_id).sort(),
    ["STCHAR-100", "STCHAR-99"]
  );
});

test("stchar_active_for_bound_stent accepts active STENT when its bound STCHAR is active on the page", async () => {
  const verdicts = await stcharActiveForBoundStent.run(undefined, context(baseRecords()));

  assert.deepEqual(verdicts, []);
});

test("stchar_active_for_bound_stent rejects active STENT whose STCHAR is absent from page active_records", async () => {
  const verdicts = await stcharActiveForBoundStent.run(undefined, context([
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1")),
    stchar("STCHAR-1"),
    page("PG-1", { STENT: ["STENT-1"], STCHAR: [] })
  ]));

  assert.equal(verdicts[0]?.code, "stchar_active_for_bound_stent.missing_active_stchar");
});

test("stchar_supersession_integrity allows pre-supersession pages and rejects later pages referencing inactive STCHAR", async () => {
  const verdicts = await stcharSupersessionIntegrity.run(undefined, context([
    stchar("STCHAR-1", { status: "superseded", superseded_by: "STCHAR-2" }),
    stchar("STCHAR-2", { generated_at_page: "PG-2", supersedes: "STCHAR-1" }),
    page("PG-1", { STCHAR: ["STCHAR-1"] }),
    page("PG-3", { STCHAR: ["STCHAR-1"] })
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "stchar_supersession_integrity.inactive_stchar_active_on_page");
  assert.equal((verdicts[0]?.detail as { page_id: string }).page_id, "PG-3");
});

test("no_char_authority_in_story_runtime allows STCHAR provenance and promotion claims", async () => {
  const verdicts = await noCharAuthorityInStoryRuntime.run(undefined, context([
    stchar("STCHAR-1", { source_char_id: "CHAR-1" }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      promotion_claims: [{ source_record: "CHAR-1" }]
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("no_char_authority_in_story_runtime allows padded CHAR provenance on STCHAR source_char_id", async () => {
  const verdicts = await noCharAuthorityInStoryRuntime.run(undefined, context([
    stchar("STCHAR-1", { source_char_id: "CHAR-0003" })
  ]));

  assert.deepEqual(verdicts, []);
});

test("no_char_authority_in_story_runtime rejects CHAR authority in story records and page-plan text", async () => {
  const verdicts = await noCharAuthorityInStoryRuntime.run({
    files: [
      {
        path: "stories/test-story/pages-prose-plans/PG-1.md",
        content: "Use CHAR-7's dossier voice."
      }
    ]
  }, context([
    storyRecord("story_entity_record", "STENT-1", "entities", {
      ...stent("STENT-1"),
      authority_note: "Render as CHAR-4."
    })
  ]));

  assert.deepEqual(
    verdicts.map((verdict) => verdict.code).sort(),
    [
      "no_char_authority_in_story_runtime.char_authority_leak",
      "no_char_authority_in_story_runtime.char_authority_text_leak"
    ]
  );
});

test("no_char_authority_in_story_runtime rejects padded CHAR authority in story records and page-plan text", async () => {
  const verdicts = await noCharAuthorityInStoryRuntime.run({
    files: [
      {
        path: "stories/test-story/pages-prose-plans/PG-1.md",
        content: "Use CHAR-0003's dossier voice."
      }
    ]
  }, context([
    storyRecord("story_entity_record", "STENT-1", "entities", {
      ...stent("STENT-1"),
      authority_note: "Render as CHAR-0004."
    })
  ]));

  assert.deepEqual(
    verdicts.map((verdict) => verdict.code).sort(),
    [
      "no_char_authority_in_story_runtime.char_authority_leak",
      "no_char_authority_in_story_runtime.char_authority_text_leak"
    ]
  );
  assert.deepEqual(
    verdicts.map((verdict) => (verdict.detail as { reference_id: string }).reference_id).sort(),
    ["CHAR-0003", "CHAR-0004"]
  );
});

test("character_grounding_consistency accepts CHC/STPLAN/STEMO records grounded in STCHAR", async () => {
  const verdicts = await characterGroundingConsistency.run(undefined, context([
    choice("CHC-1", ["STENT-1", "STCHAR-1"]),
    plan("STPLAN-1", ["STCHAR-1"]),
    emotion("STEMO-1", ["STCHAR-1"])
  ]));

  assert.deepEqual(verdicts, []);
});

test("character_grounding_consistency rejects character-specific CHC/STPLAN/STEMO records without STCHAR grounding", async () => {
  const verdicts = await characterGroundingConsistency.run(undefined, context([
    choice("CHC-1", ["STENT-1"]),
    plan("STPLAN-1", ["BEL-1"]),
    emotion("STEMO-1", ["BEL-1"])
  ]));

  assert.deepEqual(
    verdicts.map((verdict) => verdict.code).sort(),
    [
      "character_grounding_consistency.choice_missing_stchar",
      "character_grounding_consistency.stemo_missing_stchar",
      "character_grounding_consistency.stplan_missing_stchar"
    ]
  );
});

function baseRecords() {
  return [
    storyRecord("story_entity_record", "STENT-1", "entities", stent("STENT-1")),
    stchar("STCHAR-1"),
    page("PG-1", { STENT: ["STENT-1"], STCHAR: ["STCHAR-1"] })
  ];
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function stchar(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `test-story:${id}`, `stories/test-story/story-characters/${id}.md`, {
      id,
      story_id: "STORY-1",
      story_slug: "test-story",
      world_slug: "test",
      source_kind: "world_char",
      source_char_id: "CHAR-1",
      source_char_hash: "sha256:" + "a".repeat(64),
      source_char_sections_used: ["Overview"],
      generated_at_page: "story_bootstrap",
      created_by_skill: "branching-story-bootstrap",
      supersedes: null,
      status: "active",
      bound_stent_ids: ["STENT-1"],
      profile_revision: 1,
      body_schema_version: "stchar.v1",
      profile_hash: "sha256:" + "b".repeat(64),
      voice_block_hash: "sha256:" + "c".repeat(64),
      page_packet_hash: "sha256:" + "d".repeat(64),
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function stent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    supersedes: null,
    display_name: "Test Character",
    bound_stchar_id: "STCHAR-1",
    role_in_story: ["witness"],
    ...overrides
  };
}

function page(id: string, active_records: Record<string, string[]> = {}) {
  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      state_snapshot: { active_records }
    }),
    story_slug: "test-story"
  };
}

function choice(id: string, groundedRecords: string[]) {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    surface_label: "Speak to witness",
    player_visible_intent: "Ask the witness what they know.",
    target_or_action_families: ["communicate"],
    likely_state_pressure: "Character-specific social pressure.",
    associated_commitment_block: null,
    grounded_in: { records: groundedRecords }
  });
}

function plan(id: string, derived_from: string[]) {
  return storyRecord("story_plan_record", id, "plans", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    created_by_event: "SE-1",
    holder: "STENT-1",
    root_intention: "STINT-1",
    objective: "Keep the secret.",
    plan_status: "active",
    belief_basis: ["BEL-1"],
    current_step: {
      action_family: "communicate",
      target_records: ["STENT-2"],
      success_condition: { predicates: [{ pred: "record_active(BEL-1)" }] }
    },
    expires_when: "after the confrontation",
    derived_from
  });
}

function emotion(id: string, derived_from: string[]) {
  return storyRecord("story_emotion_record", id, "emotions", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    created_by_event: "SE-1",
    holder: "STENT-1",
    status: "active",
    trigger_event: "SE-1",
    affect_kind: "fear",
    intensity: "high",
    appraisal_basis: ["BEL-1"],
    behavioral_pressure: ["conceal"],
    agency_effect: "constraining",
    expires_when: "when the threat passes",
    derived_from
  });
}
