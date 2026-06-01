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

import {
  buildStateUpdateChecklist,
  CHECKLIST_DISCLAIMER,
  CHECKLIST_REVIEW_CLASSES,
} from "../src/state-update-checklist.js";
import type { ReadResult } from "../src/read/result.js";
import type {
  ManualBeliefRecord,
  RecordCommonFields,
  SegmentSidecar,
} from "../src/schema/manual-story.js";

function mkManualStoryRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-checklist-"));
}

function commonFields(id: string, refsCharacters: string[]): RecordCommonFields {
  return {
    id,
    title: id,
    active: true,
    importance: "medium",
    tags: [],
    summary: "",
    details: "",
    refs: {
      characters: refsCharacters,
      locations: [],
      related_records: [],
    },
    prompt_visibility: "always",
    last_reviewed_after_segment: null,
    notes: "",
  };
}

function belief(id: string, refsCharacters: string[]): ManualBeliefRecord {
  return {
    ...commonFields(id, refsCharacters),
    holder: "mchar-1",
    truth_relation: "true",
    confidence: "medium",
  };
}

function writeYamlRecord(root: string, record: ManualBeliefRecord): void {
  const dir = path.join(root, "records", "beliefs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${record.id}.yaml`), YAML.stringify(record));
}

function segmentSidecar(): SegmentSidecar {
  return {
    id: "SEG-1",
    created_at: "2026-05-31T00:00:00.000Z",
    updated_at: "2026-05-31T00:00:00.000Z",
    title: "Segment",
    prompt_id: "PROMPT-1",
    prompt_sha256: "abc123",
    moment_directive: "Write the next beat.",
    selected_template: null,
    included_record_summary: {
      characters: ["mchar-A", "mchar-B"],
      records: [],
    },
    author_note: "",
    word_count: 4,
  };
}

interface FileSnapshot {
  relativePath: string;
  size: number;
  mtimeMs: number;
  contents: string;
}

function snapshotFiles(root: string): FileSnapshot[] {
  const out: FileSnapshot[] = [];
  collect(root, root, out);
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function unwrap<T>(result: ReadResult<T>): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected ok");
  return result.value;
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

test("state update checklist returns the fixed 12-class payload in order", () => {
  const root = mkManualStoryRoot();
  try {
    const payload = unwrap(buildStateUpdateChecklist({
      manualStoryRoot: root,
      sidecar: segmentSidecar(),
    }));

    assert.equal(payload.segment_id, "SEG-1");
    assert.deepEqual(payload.involved_cast, ["mchar-A", "mchar-B"]);
    assert.equal(payload.entries.length, CHECKLIST_REVIEW_CLASSES.length);
    assert.deepEqual(
      payload.entries.map((entry) => entry.record_class),
      CHECKLIST_REVIEW_CLASSES,
    );
    assert.equal(payload.disclaimer, CHECKLIST_DISCLAIMER);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state update checklist counts records referencing involved cast", () => {
  const root = mkManualStoryRoot();
  try {
    [
      belief("mbel-1", ["mchar-A"]),
      belief("mbel-2", ["mchar-A", "mchar-C"]),
      belief("mbel-3", ["mchar-A"]),
      belief("mbel-4", ["mchar-B"]),
      belief("mbel-5", ["mchar-C"]),
      belief("mbel-6", []),
    ].forEach((record) => writeYamlRecord(root, record));

    const payload = unwrap(buildStateUpdateChecklist({
      manualStoryRoot: root,
      sidecar: segmentSidecar(),
    }));
    const beliefsEntry = payload.entries.find(
      (entry) => entry.record_class === "beliefs",
    );

    assert.ok(beliefsEntry);
    assert.equal(beliefsEntry.total_records, 6);
    assert.equal(beliefsEntry.cast_referencing_count, 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state update checklist performs no file writes", () => {
  const root = mkManualStoryRoot();
  try {
    writeYamlRecord(root, belief("mbel-1", ["mchar-A"]));
    const before = snapshotFiles(root);

    unwrap(buildStateUpdateChecklist({
      manualStoryRoot: root,
      sidecar: segmentSidecar(),
    }));

    assert.deepEqual(snapshotFiles(root), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state update checklist returns read error for corrupt records", () => {
  const root = mkManualStoryRoot();
  try {
    const dir = path.join(root, "records", "beliefs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "mbel-1.yaml"), "title: [unterminated\n");

    const result = buildStateUpdateChecklist({
      manualStoryRoot: root,
      sidecar: segmentSidecar(),
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "yaml_parse_failed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
