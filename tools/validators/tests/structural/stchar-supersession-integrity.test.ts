import assert from "node:assert/strict";
import test from "node:test";

import { stcharSupersessionIntegrity } from "../../src/structural/stchar-supersession-integrity.js";
import { context, record } from "./helpers.js";

const CODE = "stchar_supersession_integrity.inactive_stchar_active_on_descendant";

test("stchar_supersession_integrity accepts a descendant branch that activates the successor", async () => {
  const verdicts = await stcharSupersessionIntegrity.run(undefined, context([
    stchar("STCHAR-1", { status: "superseded", superseded_by: "STCHAR-2" }),
    stchar("STCHAR-2", { generated_at_page: "PG-6", supersedes: "STCHAR-1" }),
    page("PG-6", ["PG-1", "PG-6"], { STCHAR: ["STCHAR-2"] }),
    page("PG-7", ["PG-1", "PG-6", "PG-7"], { STCHAR: ["STCHAR-2"] })
  ]));

  assert.deepEqual(verdicts, []);
});

test("stchar_supersession_integrity accepts a sibling branch that keeps the predecessor", async () => {
  const verdicts = await stcharSupersessionIntegrity.run(undefined, context([
    stchar("STCHAR-1", { status: "superseded", superseded_by: "STCHAR-2" }),
    stchar("STCHAR-2", { generated_at_page: "PG-6", supersedes: "STCHAR-1" }),
    page("PG-6", ["PG-1", "PG-6"], { STCHAR: ["STCHAR-2"] }),
    page("PG-8", ["PG-1", "PG-8"], { STCHAR: ["STCHAR-1"] })
  ]));

  assert.deepEqual(verdicts, []);
});

test("stchar_supersession_integrity accepts a linear descendant that uses the successor", async () => {
  const verdicts = await stcharSupersessionIntegrity.run(undefined, context([
    stchar("STCHAR-1", { status: "superseded", superseded_by: "STCHAR-2" }),
    stchar("STCHAR-2", { generated_at_page: "PG-5", supersedes: "STCHAR-1" }),
    page("PG-5", ["PG-1", "PG-4", "PG-5"], { STCHAR: ["STCHAR-2"] }),
    page("PG-6", ["PG-1", "PG-4", "PG-5", "PG-6"], { STCHAR: ["STCHAR-2"] })
  ]));

  assert.deepEqual(verdicts, []);
});

test("stchar_supersession_integrity accepts a pre-supersession ancestor that keeps the predecessor", async () => {
  const verdicts = await stcharSupersessionIntegrity.run(undefined, context([
    stchar("STCHAR-1", { status: "superseded", superseded_by: "STCHAR-2" }),
    stchar("STCHAR-2", { generated_at_page: "PG-5", supersedes: "STCHAR-1" }),
    page("PG-4", ["PG-1", "PG-4"], { STCHAR: ["STCHAR-1"] }),
    page("PG-5", ["PG-1", "PG-4", "PG-5"], { STCHAR: ["STCHAR-2"] })
  ]));

  assert.deepEqual(verdicts, []);
});

test("stchar_supersession_integrity rejects a descendant that keeps the predecessor", async () => {
  const verdicts = await stcharSupersessionIntegrity.run(undefined, context([
    stchar("STCHAR-1", { status: "superseded", superseded_by: "STCHAR-2" }),
    stchar("STCHAR-2", { generated_at_page: "PG-6", supersedes: "STCHAR-1" }),
    page("PG-6", ["PG-1", "PG-6"], { STCHAR: ["STCHAR-2"] }),
    page("PG-7", ["PG-1", "PG-6", "PG-7"], { STCHAR: ["STCHAR-1"] })
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, CODE);
  assert.deepEqual(verdicts[0]?.detail, {
    page_id: "PG-7",
    stchar_id: "STCHAR-1",
    status: "superseded",
    reference_path: "state_snapshot.active_records.STCHAR[0]",
    supersession_page_id: "PG-6",
    successor_stchar_id: "STCHAR-2"
  });
});

test("stchar_supersession_integrity rejects a descendant where the successor is not active", async () => {
  const verdicts = await stcharSupersessionIntegrity.run(undefined, context([
    stchar("STCHAR-1", { status: "superseded", superseded_by: "STCHAR-2" }),
    stchar("STCHAR-2", { generated_at_page: "PG-6", supersedes: "STCHAR-1" }),
    page("PG-6", ["PG-1", "PG-6"], { STCHAR: ["STCHAR-2"] }),
    page("PG-7", ["PG-1", "PG-6", "PG-7"], { STCHAR: ["STCHAR-1", "STCHAR-3"] })
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, CODE);
  assert.deepEqual(verdicts[0]?.detail, {
    page_id: "PG-7",
    stchar_id: "STCHAR-1",
    status: "superseded",
    reference_path: "state_snapshot.active_records.STCHAR[0]",
    supersession_page_id: "PG-6",
    successor_stchar_id: "STCHAR-2"
  });
});

function stchar(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_character_authority_record", `test-story:${id}`, `stories/test-story/story-characters/${id}.md`, {
      id,
      story_id: "STORY-1",
      story_slug: "test-story",
      world_slug: "test",
      source_kind: "world_char",
      source_char_id: "CHAR-1",
      source_char_sections_used: ["Overview"],
      generated_at_page: "story_bootstrap",
      created_by_skill: "branching-story-bootstrap",
      supersedes: null,
      superseded_by: null,
      status: "active",
      bound_stent_ids: ["STENT-1"],
      profile_revision: 1,
      body_schema_version: "stchar.v1",
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function page(id: string, branchPath: string[], activeRecords: Record<string, string[]> = {}) {
  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      branch_id: branchId(branchPath),
      parent_page_id: branchPath.length > 1 ? branchPath[branchPath.length - 2] : null,
      branch_path: branchPath,
      turn_index: pageOrdinal(id),
      state_snapshot: { active_records: activeRecords },
      emitted_choices: []
    }),
    story_slug: "test-story"
  };
}

function branchId(branchPath: string[]): string {
  return branchPath.includes("PG-8") ? "BR-2" : "BR-1";
}

function pageOrdinal(id: string): number {
  const match = id.match(/^PG-(0|[1-9][0-9]*)$/);
  return match === null ? 0 : Number(match[1]);
}
