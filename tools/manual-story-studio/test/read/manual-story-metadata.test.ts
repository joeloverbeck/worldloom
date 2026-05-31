import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { readManualStoryMetadata } from "../../src/read/manual-story-metadata.js";

test("readManualStoryMetadata: missing file returns null", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "manual-studio-readmeta-"));
  try {
    assert.equal(readManualStoryMetadata(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readManualStoryMetadata: existing file parses to typed shape", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "manual-studio-readmeta-"));
  try {
    const metadata = {
      schema_version: "manual-story.v1",
      world_slug: "w",
      manual_story_slug: "ms",
      title: "T",
      created_at: "2026-05-30T00:00:00.000Z",
      updated_at: "2026-05-30T00:00:00.000Z",
      source: { world_commit: null, notes: "" },
      story_contract: {
        premise: "p",
        tone: "t",
        pov: "first",
        tense: "past",
        content_intensity: "general",
        explicitness: "",
        language_register: "casual",
        prose_preferences: {
          psychic_distance: "close",
          dialogue_density: "mixed",
          interiority: "mixed",
          paragraphing: "mixed",
        },
      },
      cast_order: [],
      segment_order: [],
      prompt_policy: {
        save_prompts: true,
        require_moment_directive: true,
        default_beat_count: "2-5",
        include_recent_segments: 1,
      },
      manuscript: {
        compile_on_segment_save: true,
        include_segment_titles: false,
        allow_reorder: false,
      },
    };
    writeFileSync(path.join(root, "manual-story.yaml"), YAML.stringify(metadata));
    const parsed = readManualStoryMetadata(root);
    assert.ok(parsed);
    assert.equal(parsed!.title, "T");
    assert.equal(parsed!.story_contract.pov, "first");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
