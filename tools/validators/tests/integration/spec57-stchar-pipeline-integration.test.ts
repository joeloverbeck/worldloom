import assert from "node:assert/strict";
import test from "node:test";

import type { Context, IndexedEdge, IndexedRecord, Validator, WorldIndexReadSurface } from "../../src/framework/types.js";
import { runValidators } from "../../src/framework/run.js";
import { storyletPredicateDslParsability } from "../../src/rules/rule_storylet_predicate_dsl_parsability.js";
import { noCharAuthorityInStoryRuntime } from "../../src/structural/no-char-authority-in-story-runtime.js";

const STORY_SLUG = "red-bunny";
const PAGE_PLAN_PATH = `stories/${STORY_SLUG}/pages-prose-plans/PG-1.md`;
const SPEC57_VALIDATORS = [
  noCharAuthorityInStoryRuntime,
  storyletPredicateDslParsability
] as const satisfies readonly Validator[];

test("SPEC-57 machine surfaces compose over CHAR leak checks and STCHAR predicates", async () => {
  const input = fileInputs([
    { path: PAGE_PLAN_PATH, content: "Render from STCHAR-1 voice authority." }
  ]);
  const ctx = context(recordsWithStoryletPredicate("STCHAR-1"), [], [PAGE_PLAN_PATH]);

  const run = await runValidators(SPEC57_VALIDATORS, input, ctx);

  assert.deepEqual(run.summary.validators_run, SPEC57_VALIDATORS.map((validator) => validator.name));
  assert.equal(run.summary.fail_count, 0);
  assert.deepEqual(run.verdicts, []);
});

test("SPEC-57 machine surfaces reject CHAR page-plan authority", async () => {
  const expectedFailCodes = [
    "no_char_authority_in_story_runtime.char_authority_text_leak"
  ];
  const input = fileInputs([
    { path: PAGE_PLAN_PATH, content: "Use CHAR-7's dossier voice as operational authority." }
  ]);
  const ctx = context(recordsWithStoryletPredicate("STCHAR-1"), [], [PAGE_PLAN_PATH]);

  const run = await runValidators(SPEC57_VALIDATORS, input, ctx);
  const actualCodes = new Set(run.verdicts.map((verdict) => verdict.code));

  assert.deepEqual(run.summary.validators_run, SPEC57_VALIDATORS.map((validator) => validator.name));
  for (const code of expectedFailCodes) {
    assert.ok(actualCodes.has(code), `${code} missing from ${[...actualCodes].join(", ")}`);
  }
});

function recordsWithStoryletPredicate(recordActiveId: string): IndexedRecord[] {
  return [
    record("story_character_authority_record", "STCHAR-1", "story-characters/STCHAR-1.md", {
      id: "STCHAR-1",
      story_id: "STORY-1",
      story_slug: STORY_SLUG,
      world_slug: "test",
      source_kind: "world_char",
      source_char_id: "CHAR-1",
      source_char_sections_used: ["Overview"],
      generated_at_page: "story_bootstrap",
      created_by_skill: "story-character-profile",
      supersedes: null,
      status: "active",
      bound_stent_ids: ["STENT-1"],
      profile_revision: 1,
      body_schema_version: "stchar.v1"
    }),
    record("storylet_record", "SLT-1", "_source/storylets/SLT-1.yaml", {
      id: "SLT-1",
      story_id: "STORY-1",
      preconditions: {
        hard: [{ pred: "record_active", record: recordActiveId }],
        soft: []
      },
      grounding: {
        compatible_turn_drivers: ["npc_action"],
        reason_to_exist: "Exercises STCHAR-backed predicate grounding in the fixture."
      }
    })
  ];
}

function fileInputs(files: Array<{ path: string; content: string }>): { files: Array<{ path: string; content: string }> } {
  return { files };
}

function record(nodeType: string, id: string, relativePath: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    node_type: nodeType,
    node_id: `${STORY_SLUG}:${id}`,
    file_path: `stories/${STORY_SLUG}/${relativePath}`,
    parsed,
    world_slug: "test",
    story_slug: STORY_SLUG
  };
}

function context(records: IndexedRecord[], edges: IndexedEdge[], touchedFiles: string[]): Context {
  const index: WorldIndexReadSurface = {
    query: async ({ record_type, story_slug }) =>
      records.filter((item) =>
        (!record_type || item.node_type === record_type) &&
        (!story_slug || item.story_slug === story_slug)
      ),
    queryEdges: async ({ edge_type }) =>
      edges.filter((item) => !edge_type || item.edge_type === edge_type)
  };

  return {
    run_mode: "full-world",
    world_slug: "test",
    story_slug: STORY_SLUG,
    index,
    touched_files: touchedFiles
  };
}
