import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { readManualStoryMetadata } from "../../src/read/manual-story-metadata.js";

test("readManualStoryMetadata: missing file returns file_not_found error", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "manual-studio-readmeta-"));
  try {
    const result = readManualStoryMetadata(root);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "file_not_found");
      assert.match(result.error.path, /manual-story\.yaml$/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readManualStoryMetadata: corrupt YAML returns yaml_parse_failed error", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "manual-studio-readmeta-"));
  try {
    writeFileSync(path.join(root, "manual-story.yaml"), "title: [unterminated\n");

    const result = readManualStoryMetadata(root);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "yaml_parse_failed");
      assert.match(result.error.repair_hint, /Fix YAML syntax/);
    }
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
        recent_template_advisory_window: 2,
      },
      manuscript: {
        compile_on_segment_save: true,
        include_segment_titles: false,
        allow_reorder: false,
      },
    };
    writeFileSync(path.join(root, "manual-story.yaml"), YAML.stringify(metadata));
    const parsed = readManualStoryMetadata(root);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.title, "T");
      assert.equal(parsed.value.story_contract.pov, "first");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
