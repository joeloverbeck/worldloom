import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { compileManuscript } from "../../src/manuscript/compile.js";
import type {
  ManualStoryMetadata,
  SegmentSidecar,
} from "../../src/schema/manual-story.js";
import { resolveManualStoryRoot } from "../../src/write/sandbox.js";

type FixtureRoot = ReturnType<typeof resolveManualStoryRoot>;

function mkFixture(opts: {
  segmentOrder?: string[];
  includeSegmentTitles?: boolean;
} = {}): { tempRoot: string; manualStoryRoot: FixtureRoot } {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "manual-manuscript-"));
  const manualStoryRoot = resolveManualStoryRoot(
    tempRoot,
    "fixture-world",
    "fixture-story",
  );
  mkdirSync(path.join(manualStoryRoot.absolutePath, "segments"), {
    recursive: true,
  });
  mkdirSync(path.join(manualStoryRoot.absolutePath, "records"), {
    recursive: true,
  });
  mkdirSync(path.join(manualStoryRoot.absolutePath, "prompts"), {
    recursive: true,
  });

  writeMetadata(manualStoryRoot, {
    segmentOrder: opts.segmentOrder ?? ["SEG-1", "SEG-2", "SEG-3"],
    includeSegmentTitles: opts.includeSegmentTitles ?? false,
  });
  seedSegment(manualStoryRoot, "SEG-1", "Lanterns rise.", "Lanterns");
  seedSegment(manualStoryRoot, "SEG-2", "Rain answers.", "Rain");
  seedSegment(manualStoryRoot, "SEG-3", "Doors open.", "Doors");
  writeFileSync(
    path.join(manualStoryRoot.absolutePath, "records", "sentinel.txt"),
    "record sentinel",
  );
  writeFileSync(
    path.join(manualStoryRoot.absolutePath, "prompts", "PROMPT-1.md"),
    "prompt sentinel",
  );

  return { tempRoot, manualStoryRoot };
}

function writeMetadata(
  manualStoryRoot: FixtureRoot,
  opts: { segmentOrder: string[]; includeSegmentTitles: boolean },
): void {
  const metadata: ManualStoryMetadata = {
    schema_version: "manual-story.v1",
    world_slug: "fixture-world",
    manual_story_slug: "fixture-story",
    title: "Fixture Story",
    created_at: "2026-05-31T10:00:00Z",
    updated_at: "2026-05-31T10:00:00Z",
    source: { world_commit: null, notes: "" },
    story_contract: {
      premise: "",
      tone: "",
      pov: "close third",
      tense: "past",
      content_intensity: "general",
      explicitness: "",
      language_register: "mixed",
      prose_preferences: {
        psychic_distance: "variable",
        dialogue_density: "mixed",
        interiority: "mixed",
        paragraphing: "mixed",
      },
    },
    cast_order: [],
    segment_order: opts.segmentOrder,
    prompt_policy: {
      save_prompts: true,
      require_moment_directive: true,
      default_beat_count: "2-5",
      include_recent_segments: 1,
      recent_template_advisory_window: 2,
    },
    manuscript: {
      compile_on_segment_save: true,
      include_segment_titles: opts.includeSegmentTitles,
      allow_reorder: false,
    },
  };
  writeFileSync(
    path.join(manualStoryRoot.absolutePath, "manual-story.yaml"),
    YAML.stringify(metadata),
  );
}

function seedSegment(
  manualStoryRoot: FixtureRoot,
  id: string,
  body: string,
  title: string,
): void {
  writeFileSync(
    path.join(manualStoryRoot.absolutePath, "segments", `${id}.md`),
    body,
  );
  const sidecar: SegmentSidecar = {
    id,
    created_at: "2026-05-31T10:00:00Z",
    updated_at: "2026-05-31T10:00:00Z",
    title,
    prompt_id: "PROMPT-1",
    prompt_sha256: "fixture-sha",
    moment_directive: "Write the next moment.",
    selected_template: null,
    included_record_summary: { characters: [], records: [] },
    author_note: "",
    word_count: body.split(/\s+/u).filter(Boolean).length,
  };
  writeFileSync(
    path.join(manualStoryRoot.absolutePath, "segments", `${id}.yaml`),
    YAML.stringify(sidecar),
  );
}

test("compileManuscript is deterministic across repeated runs", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const first = compileManuscript({ manualStoryRoot });
    const firstBody = readFileSync(first.manuscript_path, "utf8");
    const second = compileManuscript({ manualStoryRoot });
    const secondBody = readFileSync(second.manuscript_path, "utf8");

    assert.equal(firstBody, "Lanterns rise.\n\nRain answers.\n\nDoors open.");
    assert.equal(secondBody, firstBody);
    assert.equal(second.byte_count, Buffer.byteLength(secondBody, "utf8"));
    assert.equal(second.segments_compiled, 3);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("compileManuscript prepends segment titles when configured", () => {
  const { tempRoot, manualStoryRoot } = mkFixture({
    includeSegmentTitles: true,
  });
  try {
    const result = compileManuscript({ manualStoryRoot });
    assert.equal(
      readFileSync(result.manuscript_path, "utf8"),
      [
        "## Lanterns",
        "",
        "Lanterns rise.",
        "",
        "## Rain",
        "",
        "Rain answers.",
        "",
        "## Doors",
        "",
        "Doors open.",
      ].join("\n"),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("compileManuscript omits segment titles by default", () => {
  const { tempRoot, manualStoryRoot } = mkFixture({
    includeSegmentTitles: false,
  });
  try {
    const result = compileManuscript({ manualStoryRoot });
    assert.equal(
      readFileSync(result.manuscript_path, "utf8"),
      "Lanterns rise.\n\nRain answers.\n\nDoors open.",
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("compileManuscript writes an empty manuscript for empty segment_order", () => {
  const { tempRoot, manualStoryRoot } = mkFixture({ segmentOrder: [] });
  try {
    const result = compileManuscript({ manualStoryRoot });
    assert.equal(readFileSync(result.manuscript_path, "utf8"), "");
    assert.equal(result.segments_compiled, 0);
    assert.equal(result.byte_count, 0);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("compileManuscript honors segment_order instead of filesystem order", () => {
  const { tempRoot, manualStoryRoot } = mkFixture({
    segmentOrder: ["SEG-3", "SEG-1", "SEG-2"],
  });
  try {
    const result = compileManuscript({ manualStoryRoot });
    assert.equal(
      readFileSync(result.manuscript_path, "utf8"),
      "Doors open.\n\nLanterns rise.\n\nRain answers.",
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("compileManuscript does not touch records or prompt directories", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const beforeRootFiles = new Set(readdirSync(manualStoryRoot.absolutePath));
    const beforeRecordsMtime = statSync(
      path.join(manualStoryRoot.absolutePath, "records"),
    ).mtimeMs;
    const beforePromptsMtime = statSync(
      path.join(manualStoryRoot.absolutePath, "prompts"),
    ).mtimeMs;

    const result = compileManuscript({ manualStoryRoot });

    const afterRootFiles = new Set(readdirSync(manualStoryRoot.absolutePath));
    const addedRootFiles = [...afterRootFiles].filter(
      (entry) => !beforeRootFiles.has(entry),
    );
    assert.deepEqual(addedRootFiles, ["manuscript.md"]);
    assert.equal(
      statSync(path.join(manualStoryRoot.absolutePath, "records")).mtimeMs,
      beforeRecordsMtime,
    );
    assert.equal(
      statSync(path.join(manualStoryRoot.absolutePath, "prompts")).mtimeMs,
      beforePromptsMtime,
    );
    assert.equal(
      result.manuscript_path,
      path.join(manualStoryRoot.absolutePath, "manuscript.md"),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
