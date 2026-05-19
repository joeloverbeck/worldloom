import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseStoryBundleSourceFile } from "../../src/parse/atomic.js";

test("STEMO records emit holder, trigger, appraisal, orientation, supersession, and derivation edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-emotion-edges-"));

  try {
    writeStoryEmotion(root, "harborwatch", "STEMO-2", [
      "id: STEMO-2",
      "story_id: STORY-47",
      "created_at_page: PG-4",
      "created_by_event: SE-4",
      "supersedes: STEMO-1",
      "holder: STENT-1",
      "status: active",
      "affect_kind: fear",
      "intensity: high",
      "orientation:",
      "  toward_records:",
      "    - STENT-2",
      "    - system",
      "appraisal_basis:",
      "  - BEL-2",
      "  - BEL-3",
      "trigger_event: SE-4",
      "behavioral_pressure: [flee, protect_other]",
      "agency_effect: constraining",
      "expires_when: when the bell tower is secure",
      "derived_from:",
      "  - SE-4",
      "  - SREL-1",
      "  - group:watch"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/emotions/STEMO-2.yaml"
    );

    assert.deepEqual(emotionEdges(parsed.edges), [
      edge("STEMO-2", "STENT-1", "emotion_holder"),
      edge("STEMO-2", "SE-4", "emotion_trigger_event"),
      edge("STEMO-2", "BEL-2", "emotion_appraisal_basis"),
      edge("STEMO-2", "BEL-3", "emotion_appraisal_basis"),
      edge("STEMO-2", "STENT-2", "emotion_oriented_toward"),
      edge("STEMO-2", "STEMO-1", "emotion_supersedes"),
      edge("STEMO-2", "SE-4", "emotion_derived_from"),
      edge("STEMO-2", "SREL-1", "emotion_derived_from")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dissociated STEMO records with empty optional fields emit only populated emotion edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-emotion-empty-"));

  try {
    writeStoryEmotion(root, "harborwatch", "STEMO-3", [
      "id: STEMO-3",
      "story_id: STORY-47",
      "created_at_page: PG-4",
      "created_by_event: SE-4",
      "supersedes: null",
      "holder: STENT-1",
      "status: dissociated",
      "affect_kind: null",
      "orientation:",
      "  toward_records: []",
      "appraisal_basis: []",
      "trigger_event: SE-4",
      "behavioral_pressure: []",
      "agency_effect: none",
      "expires_when: after grounded contact returns",
      "derived_from: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/emotions/STEMO-3.yaml"
    );

    assert.deepEqual(emotionEdges(parsed.edges), [
      edge("STEMO-3", "STENT-1", "emotion_holder"),
      edge("STEMO-3", "SE-4", "emotion_trigger_event")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function emotionEdges(
  edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>
): Array<{ source_node_id: string; target_unresolved_ref: string | null; edge_type: string; story_slug: string | null }> {
  return edges
    .filter((row) => row.edge_type.startsWith("emotion_"))
    .map((row) => ({
      source_node_id: row.source_node_id,
      target_unresolved_ref: row.target_unresolved_ref,
      edge_type: row.edge_type,
      story_slug: row.story_slug ?? null
    }));
}

function edge(sourceId: string, targetId: string, edgeType: string): {
  source_node_id: string;
  target_unresolved_ref: string;
  edge_type: string;
  story_slug: string;
} {
  return {
    source_node_id: `harborwatch:${sourceId}`,
    target_unresolved_ref: `harborwatch:${targetId}`,
    edge_type: edgeType,
    story_slug: "harborwatch"
  };
}

function writeStoryEmotion(root: string, storySlug: string, emotionId: string, lines: string[]): void {
  const directory = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", "emotions");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${emotionId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}
