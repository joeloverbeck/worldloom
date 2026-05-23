import assert from "node:assert/strict";
import test from "node:test";

import { storyKernelCastBindListIntegrity } from "../../src/structural/story-kernel-cast-bind-list-integrity.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const KERNEL_PATH = `stories/${STORY}/STORY_KERNEL.md`;

test("story_kernel_cast_bind_list_integrity accepts complete cast bindings", async () => {
  const verdicts = await storyKernelCastBindListIntegrity.run(input(kernel()), context(baseRecords()));

  assert.deepEqual(verdicts, []);
});

test("story_kernel_cast_bind_list_integrity rejects non-background entries without stchar_id", async () => {
  const verdicts = await storyKernelCastBindListIntegrity.run(
    input(kernel({ stcharIdLine: "" })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "story_kernel_cast_bind_list_integrity.missing_stchar_id");
});

test("story_kernel_cast_bind_list_integrity rejects legacy bound_char_id entries", async () => {
  const verdicts = await storyKernelCastBindListIntegrity.run(
    input(kernel({ extraLine: "    bound_char_id: CHAR-1" })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "story_kernel_cast_bind_list_integrity.bound_char_id_present");
});

test("story_kernel_cast_bind_list_integrity rejects source_char_id provenance mismatches", async () => {
  const verdicts = await storyKernelCastBindListIntegrity.run(
    input(kernel({ sourceCharId: "CHAR-99" })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "story_kernel_cast_bind_list_integrity.source_char_id_mismatch");
});

test("story_kernel_cast_bind_list_integrity accepts background entries without STCHAR bindings", async () => {
  const verdicts = await storyKernelCastBindListIntegrity.run(
    input(kernel({
      stcharIdLine: "",
      roleInStory: "[background]",
      sourceCharId: null
    })),
    context(baseRecords())
  );

  assert.deepEqual(verdicts, []);
});

function input(content: string) {
  return {
    files: [{ path: KERNEL_PATH, content }]
  };
}

function baseRecords() {
  return [
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Test Character",
      bound_stchar_id: "STCHAR-1",
      role_in_story: ["speaker"]
    }),
    storyRecord("story_character_authority_record", "STCHAR-1", "story-characters", {
      id: "STCHAR-1",
      story_id: "STORY-1",
      story_slug: STORY,
      world_slug: "test",
      status: "active",
      source_kind: "world_char",
      source_char_id: "CHAR-1",
      source_char_sections_used: ["Overview"],
      generated_at_page: "story_bootstrap",
      created_by_skill: "branching-story-bootstrap",
      supersedes: null,
      bound_stent_ids: ["STENT-1"],
      profile_revision: 1,
      body_schema_version: "stchar.v1"
    })
  ];
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  const filePath = sourceDir === "story-characters"
    ? `stories/${STORY}/story-characters/${id}.md`
    : `stories/${STORY}/_source/${sourceDir}/${id}.yaml`;
  return {
    ...record(nodeType, `${STORY}:${id}`, filePath, parsed),
    story_slug: STORY
  };
}

function kernel(options: {
  stcharIdLine?: string;
  sourceCharId?: string | null;
  roleInStory?: string;
  extraLine?: string;
} = {}): string {
  const stcharIdLine = options.stcharIdLine ?? "    stchar_id: STCHAR-1";
  const sourceCharId = options.sourceCharId === undefined ? "CHAR-1" : options.sourceCharId;
  return [
    "---",
    "story_id: STORY-1",
    `story_slug: ${STORY}`,
    "root_branch_id: BR-1",
    "root_page_id: PG-1",
    "cast_bind_list:",
    "  - stent_id: STENT-1",
    stcharIdLine,
    `    source_char_id: ${sourceCharId ?? "null"}`,
    `    role_in_story: ${options.roleInStory ?? "[speaker]"}`,
    options.extraLine ?? "",
    "---",
    "# Test Story",
    ""
  ].filter((line) => line.length > 0).join("\n");
}
