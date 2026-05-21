import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { listStoryBundleSourceFiles, parseStoryBundleSourceFile } from "../../src/parse/atomic.js";

test("STCHAR hybrid records index as story_character_authority_record and emit authority edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stchar-edges-"));

  try {
    writeStoryCharacter(root, "harborwatch", "STCHAR-2", [
      "---",
      "id: STCHAR-2",
      "story_id: STORY-50",
      "story_slug: harborwatch",
      "world_slug: fixture-world",
      "source_kind: world_char",
      "source_char_id: CHAR-1",
      `source_char_hash: sha256:${"a".repeat(64)}`,
      "source_char_sections_used: [frontmatter]",
      "generated_at_page: PG-4",
      "created_by_skill: unit-test",
      "supersedes: STCHAR-1",
      "superseded_by: STCHAR-3",
      "status: active",
      "bound_stent_ids: [STENT-1, STENT-2]",
      "profile_revision: 2",
      "body_schema_version: stchar.v1",
      `profile_hash: sha256:${"b".repeat(64)}`,
      `voice_block_hash: sha256:${"c".repeat(64)}`,
      `page_packet_hash: sha256:${"d".repeat(64)}`,
      "---",
      "## Profile",
      "",
      "Marla acts with focused suspicion."
    ]);

    assert.deepEqual(listStoryBundleSourceFiles(path.join(root, "worlds", "fixture-world")), [
      "stories/harborwatch/story-characters/STCHAR-2.md"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/story-characters/STCHAR-2.md"
    );

    assert.equal(parsed.nodes.length, 1);
    assert.equal(parsed.nodes[0]?.node_type, "story_character_authority_record");
    assert.equal(parsed.nodes[0]?.node_id, "harborwatch:STCHAR-2");
    assert.match(parsed.nodes[0]?.body ?? "", /## Profile/);
    assert.deepEqual(stcharEdges(parsed.edges), [
      edge("STCHAR-2", "CHAR-1", "stchar_source_character"),
      edge("STCHAR-2", "STCHAR-1", "stchar_supersedes"),
      edge("STCHAR-2", "STCHAR-3", "stchar_superseded_by"),
      edge("STCHAR-2", "STENT-1", "stchar_bound_stent"),
      edge("STCHAR-2", "STENT-2", "stchar_bound_stent")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("STENT bound_stchar_id and page active_records.STCHAR emit STCHAR edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stchar-active-"));

  try {
    writeStoryRecord(root, "harborwatch", "entities", "STENT-1", [
      "id: STENT-1",
      "story_id: STORY-50",
      "display_name: Marla",
      "bound_stchar_id: STCHAR-2",
      "role_in_story: [primary_actor]",
      "created_at_page: PG-1"
    ]);
    writeStoryRecord(root, "harborwatch", "pages", "PG-4", [
      "id: PG-4",
      "story_id: STORY-50",
      "branch_id: BR-1",
      "parent_page_id: null",
      "branch_path: [PG-4]",
      "turn_index: 4",
      "input:",
      "  choice_id: null",
      "  manual_action_text: null",
      "  resolved_event_id: SE-4",
      "state_hash_parent: null",
      "state_hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "state_snapshot:",
      "  active_records:",
      "    STENT: [STENT-1]",
      "    STCHAR: [STCHAR-2]",
      "plan:",
      "  plan_hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "prose_plan_path: pages-prose/PG-4.md",
      "emitted_choices: []",
      "validation_trace: {}"
    ]);

    const stent = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/entities/STENT-1.yaml"
    );
    const page = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/pages/PG-4.yaml"
    );

    assert.deepEqual(stcharEdges(stent.edges), [
      edge("STENT-1", "STCHAR-2", "stent_character_authority")
    ]);
    assert.ok(
      stcharEdges(page.edges).some(
        (item) =>
          item.source_node_id === "harborwatch:PG-4" &&
          item.target_unresolved_ref === "harborwatch:STCHAR-2" &&
          item.edge_type === "page_active_record"
      )
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeStoryCharacter(root: string, storySlug: string, id: string, lines: string[]): void {
  const filePath = path.join(root, "worlds", "fixture-world", "stories", storySlug, "story-characters", `${id}.md`);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeStoryRecord(root: string, storySlug: string, subdir: string, id: string, lines: string[]): void {
  const filePath = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", subdir, `${id}.yaml`);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function stcharEdges(
  edges: readonly {
    source_node_id: string;
    target_unresolved_ref: string | null;
    edge_type: string;
  }[]
) {
  return edges
    .filter(
      (item) =>
        item.edge_type.includes("stchar") ||
        item.edge_type === "stent_character_authority" ||
        item.edge_type === "page_active_record"
    )
    .map(({ source_node_id, target_unresolved_ref, edge_type }) => ({
      source_node_id,
      target_unresolved_ref,
      edge_type
    }));
}

function edge(source: string, target: string, edgeType: string) {
  return {
    source_node_id: source.includes(":") ? source : `harborwatch:${source}`,
    target_unresolved_ref: target.startsWith("CHAR-") ? target : `harborwatch:${target}`,
    edge_type: edgeType
  };
}
