import assert from "node:assert/strict";
import {
  existsSync,
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

import type { CompileManuscriptResult } from "../../src/manuscript/compile.js";
import type { ReadResult } from "../../src/read/result.js";
import type {
  ManualConsequenceRecord,
  ManualStoryMetadata,
  RecordCommonFields,
  SegmentSidecar,
} from "../../src/schema/manual-story.js";
import {
  deleteSegment,
  editSegment,
  saveSegment,
} from "../../src/write/segments.js";
import { resolveManualStoryRoot, type ManualStoryRoot } from "../../src/write/sandbox.js";

type FixtureRoot = ReturnType<typeof resolveManualStoryRoot>;

interface Fixture {
  tempRoot: string;
  manualStoryRoot: FixtureRoot;
}

interface FileSnapshot {
  relativePath: string;
  size: number;
  mtimeMs: number;
  contents: string;
}

function mkFixture(opts: {
  compileOnSave?: boolean;
  withPrompt?: boolean;
} = {}): Fixture {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "manual-segments-"));
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
  writeMetadata(manualStoryRoot, {
    segmentOrder: [],
    compileOnSave: opts.compileOnSave ?? true,
  });
  if (opts.withPrompt ?? true) {
    seedPrompt(manualStoryRoot);
  }
  return { tempRoot, manualStoryRoot };
}

function writeMetadata(
  manualStoryRoot: FixtureRoot,
  opts: { segmentOrder: string[]; compileOnSave: boolean },
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
      compile_on_segment_save: opts.compileOnSave,
      include_segment_titles: false,
      allow_reorder: false,
    },
  };
  writeFileSync(
    path.join(manualStoryRoot.absolutePath, "manual-story.yaml"),
    YAML.stringify(metadata),
  );
}

function seedPrompt(root: ManualStoryRoot): void {
  mkdirSync(path.join(root.absolutePath, "prompts"), { recursive: true });
  mkdirSync(path.join(root.absolutePath, "prompt-runs"), { recursive: true });
  writeFileSync(
    path.join(root.absolutePath, "prompts", "PROMPT-1.md"),
    "## Prompt\n\nWrite the lantern scene.\n",
  );
  writeFileSync(
    path.join(root.absolutePath, "prompt-runs", "PROMPT-1.yaml"),
    YAML.stringify({
      id: "PROMPT-1",
      created_at: "2026-05-31T09:00:00Z",
      manual_story_slug: "fixture-story",
      included_cast: ["mchar-1"],
      included_records: ["mbel-1"],
      // Realistic path shape; the segment-write layer derives the
      // mtemplate-N id from the path tail per SPEC-104 §2.6.
      included_template_path: "records/beat-templates/mtemplate-1.yaml",
      moment_directive: "Write the lantern scene.",
      prompt_sha256: "historical-sidecar-sha",
    }),
  );
}

function readMetadata(root: ManualStoryRoot): ManualStoryMetadata {
  return YAML.parse(
    readFileSync(path.join(root.absolutePath, "manual-story.yaml"), "utf8"),
  ) as ManualStoryMetadata;
}

function readSidecar(root: ManualStoryRoot, id: string): SegmentSidecar {
  return YAML.parse(
    readFileSync(path.join(root.absolutePath, "segments", `${id}.yaml`), "utf8"),
  ) as SegmentSidecar;
}

function commonFields(id: string): RecordCommonFields {
  return {
    id,
    title: id,
    active: true,
    importance: "medium",
    tags: [],
    summary: "",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    notes: "",
  };
}

function seedConsequence(root: ManualStoryRoot, segmentId: string): void {
  const record: ManualConsequenceRecord = {
    ...commonFields("mcnsq-1"),
    caused_by_segment: segmentId,
    pending: true,
    urgency: "low",
  };
  const dir = path.join(root.absolutePath, "records", "consequences");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "mcnsq-1.yaml"), YAML.stringify(record));
}

function snapshotFiles(root: string): FileSnapshot[] {
  if (!existsSync(root)) return [];
  const out: FileSnapshot[] = [];
  collect(root, root, out);
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function collect(root: string, dir: string, out: FileSnapshot[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(root, fullPath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = statSync(fullPath);
    out.push({
      relativePath: path.relative(root, fullPath),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      contents: readFileSync(fullPath, "utf8"),
    });
  }
}

function saveOne(
  root: ManualStoryRoot,
  compile: () => ReadResult<CompileManuscriptResult> = noopCompile,
): string {
  const result = saveSegment({
    root,
    prose: "Lanterns rise.",
    title: "Lanterns",
    prompt_id: "PROMPT-1",
    author_note: "draft",
    now: () => "2026-05-31T10:00:00.000Z",
    compile,
  });
  return result.segment_id;
}

function noopCompile(): ReadResult<CompileManuscriptResult> {
  return {
    ok: true,
    value: { manuscript_path: "", segments_compiled: 0, byte_count: 0 },
  };
}

test("saveSegment writes paired segment files and appends segment_order", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const first = saveSegment({
      root: manualStoryRoot,
      prose: "Lanterns rise.",
      title: "Lanterns",
      prompt_id: "PROMPT-1",
      author_note: "draft",
      now: () => "2026-05-31T10:00:00.000Z",
      compile: noopCompile,
    });
    const second = saveSegment({
      root: manualStoryRoot,
      prose: "Rain answers.",
      prompt_id: null,
      now: () => "2026-05-31T10:01:00.000Z",
      compile: noopCompile,
    });

    assert.equal(first.segment_id, "SEG-1");
    assert.equal(second.segment_id, "SEG-2");
    assert.equal(
      readFileSync(
        path.join(manualStoryRoot.absolutePath, "segments", "SEG-1.md"),
        "utf8",
      ),
      "Lanterns rise.",
    );
    const sidecar = readSidecar(manualStoryRoot, "SEG-1");
    assert.equal(sidecar.id, "SEG-1");
    assert.equal(sidecar.title, "Lanterns");
    assert.equal(sidecar.prompt_id, "PROMPT-1");
    assert.equal(sidecar.moment_directive, "Write the lantern scene.");
    assert.deepEqual(sidecar.included_record_summary.characters, ["mchar-1"]);
    assert.deepEqual(sidecar.included_record_summary.records, ["mbel-1"]);
    assert.equal(sidecar.selected_template, "mtemplate-1");
    assert.equal(sidecar.word_count, 2);
    assert.deepEqual(readMetadata(manualStoryRoot).segment_order, [
      "SEG-1",
      "SEG-2",
    ]);
    assert.equal(["checklist", "payload"].join("_") in first, false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("editSegment updates prose and sidecar in place without appending order", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    saveOne(manualStoryRoot, noopCompile);
    const before = readSidecar(manualStoryRoot, "SEG-1");

    const result = editSegment({
      root: manualStoryRoot,
      segment_id: "SEG-1",
      prose: "Lanterns rise again.",
      author_note: "revised",
      now: () => "2026-05-31T11:00:00.000Z",
      compile: noopCompile,
    });

    const after = result.sidecar;
    assert.equal(after.id, "SEG-1");
    assert.equal(after.created_at, before.created_at);
    assert.equal(after.updated_at, "2026-05-31T11:00:00.000Z");
    assert.equal(after.author_note, "revised");
    assert.equal(after.word_count, 3);
    assert.deepEqual(readMetadata(manualStoryRoot).segment_order, ["SEG-1"]);
    assert.equal(
      readFileSync(
        path.join(manualStoryRoot.absolutePath, "segments", "SEG-1.md"),
        "utf8",
      ),
      "Lanterns rise again.",
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("deleteSegment hard-deletes unreferenced files and removes segment_order", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    saveOne(manualStoryRoot, noopCompile);
    const result = deleteSegment({
      root: manualStoryRoot,
      segment_id: "SEG-1",
      compile: noopCompile,
    });
    assert.equal("outcome" in result && result.outcome, "hard_deleted");
    assert.equal(
      existsSync(path.join(manualStoryRoot.absolutePath, "segments", "SEG-1.md")),
      false,
    );
    assert.equal(
      existsSync(path.join(manualStoryRoot.absolutePath, "segments", "SEG-1.yaml")),
      false,
    );
    assert.deepEqual(readMetadata(manualStoryRoot).segment_order, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("deleteSegment preserves referenced files and reports consequence referrers", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    saveOne(manualStoryRoot, noopCompile);
    seedConsequence(manualStoryRoot, "SEG-1");

    const result = deleteSegment({
      root: manualStoryRoot,
      segment_id: "SEG-1",
      compile: noopCompile,
    });

    assert.equal(
      "outcome" in result && result.outcome,
      "segment_order_removed_files_preserved",
    );
    if ("outcome" in result) {
      assert.deepEqual(result.referrers.map((r) => r.id), ["mcnsq-1"]);
    }
    assert.equal(
      existsSync(path.join(manualStoryRoot.absolutePath, "segments", "SEG-1.md")),
      true,
    );
    assert.deepEqual(readMetadata(manualStoryRoot).segment_order, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("deleteSegment force-deletes referenced files with warning payload", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    saveOne(manualStoryRoot, noopCompile);
    seedConsequence(manualStoryRoot, "SEG-1");

    const result = deleteSegment({
      root: manualStoryRoot,
      segment_id: "SEG-1",
      force: true,
      compile: noopCompile,
    });

    assert.equal("outcome" in result && result.outcome, "force_deleted");
    if ("outcome" in result && result.outcome === "force_deleted") {
      assert.match(result.warning, /mcnsq-1/);
      assert.deepEqual(result.referrers.map((r) => r.id), ["mcnsq-1"]);
    }
    assert.equal(
      existsSync(path.join(manualStoryRoot.absolutePath, "segments", "SEG-1.md")),
      false,
    );
    assert.deepEqual(readMetadata(manualStoryRoot).segment_order, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("saveSegment compiles only when compile_on_segment_save is true", () => {
  const onFixture = mkFixture({ compileOnSave: true });
  const offFixture = mkFixture({ compileOnSave: false });
  try {
    let onCount = 0;
    saveOne(onFixture.manualStoryRoot, () => {
      onCount += 1;
      return noopCompile();
    });
    let offCount = 0;
    saveOne(offFixture.manualStoryRoot, () => {
      offCount += 1;
      return noopCompile();
    });
    assert.equal(onCount, 1);
    assert.equal(offCount, 0);
  } finally {
    rmSync(onFixture.tempRoot, { recursive: true, force: true });
    rmSync(offFixture.tempRoot, { recursive: true, force: true });
  }
});

test("save, edit, and delete do not mutate record files", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    seedConsequence(manualStoryRoot, "SEG-1");
    const recordsRoot = path.join(manualStoryRoot.absolutePath, "records");
    const before = snapshotFiles(recordsRoot);

    saveOne(manualStoryRoot, noopCompile);
    editSegment({
      root: manualStoryRoot,
      segment_id: "SEG-1",
      prose: "Changed prose.",
      now: () => "2026-05-31T12:00:00.000Z",
      compile: noopCompile,
    });
    deleteSegment({
      root: manualStoryRoot,
      segment_id: "SEG-1",
      compile: noopCompile,
    });

    assert.deepEqual(snapshotFiles(recordsRoot), before);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
