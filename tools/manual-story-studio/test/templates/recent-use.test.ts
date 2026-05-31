import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { computeRecentUseMap } from "../../src/templates/recent-use.js";

function mkRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "recent-use-"));
}

function writeSidecar(
  root: string,
  segmentId: string,
  selectedTemplate: string | null,
): void {
  const dir = path.join(root, "segments");
  mkdirSync(dir, { recursive: true });
  const sidecar = {
    id: segmentId,
    created_at: "2026-05-31T00:00:00.000Z",
    updated_at: "2026-05-31T00:00:00.000Z",
    title: "",
    prompt_id: null,
    prompt_sha256: null,
    moment_directive: "",
    selected_template: selectedTemplate,
    included_record_summary: { characters: [], records: [] },
    author_note: "",
    word_count: 10,
  };
  writeFileSync(path.join(dir, `${segmentId}.yaml`), YAML.stringify(sidecar));
}

test("computeRecentUseMap: window 2 over 5 segments returns last-2-only map", () => {
  const root = mkRoot();
  try {
    writeSidecar(root, "SEG-1", "mtemplate-7");
    writeSidecar(root, "SEG-2", null);
    writeSidecar(root, "SEG-3", "mtemplate-7");
    writeSidecar(root, "SEG-4", null);
    writeSidecar(root, "SEG-5", "mtemplate-7");
    const result = computeRecentUseMap({
      manualStoryRoot: root,
      segmentOrder: ["SEG-1", "SEG-2", "SEG-3", "SEG-4", "SEG-5"],
      recentWindow: 2,
    });
    assert.equal(result.windowSize, 2);
    assert.equal(result.recentTemplates.get("mtemplate-7"), "SEG-5");
    assert.equal(result.recentTemplates.size, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("computeRecentUseMap: window 0 disables advisory", () => {
  const root = mkRoot();
  try {
    writeSidecar(root, "SEG-1", "mtemplate-1");
    const result = computeRecentUseMap({
      manualStoryRoot: root,
      segmentOrder: ["SEG-1"],
      recentWindow: 0,
    });
    assert.equal(result.windowSize, 0);
    assert.equal(result.recentTemplates.size, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("computeRecentUseMap: all-null selected_template returns empty map", () => {
  const root = mkRoot();
  try {
    writeSidecar(root, "SEG-1", null);
    writeSidecar(root, "SEG-2", null);
    const result = computeRecentUseMap({
      manualStoryRoot: root,
      segmentOrder: ["SEG-1", "SEG-2"],
      recentWindow: 2,
    });
    assert.equal(result.recentTemplates.size, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("computeRecentUseMap: deterministic — same input twice yields same map", () => {
  const root = mkRoot();
  try {
    writeSidecar(root, "SEG-1", "mtemplate-2");
    writeSidecar(root, "SEG-2", "mtemplate-3");
    const inputArgs = {
      manualStoryRoot: root,
      segmentOrder: ["SEG-1", "SEG-2"],
      recentWindow: 2,
    };
    const a = computeRecentUseMap(inputArgs);
    const b = computeRecentUseMap(inputArgs);
    assert.deepEqual([...a.recentTemplates.entries()].sort(), [...b.recentTemplates.entries()].sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("computeRecentUseMap: missing sidecar on disk treated as no template", () => {
  const root = mkRoot();
  try {
    writeSidecar(root, "SEG-1", "mtemplate-9");
    // SEG-2 is in segment_order but no sidecar exists on disk
    const result = computeRecentUseMap({
      manualStoryRoot: root,
      segmentOrder: ["SEG-1", "SEG-2"],
      recentWindow: 2,
    });
    assert.equal(result.recentTemplates.size, 1);
    assert.equal(result.recentTemplates.get("mtemplate-9"), "SEG-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("computeRecentUseMap: window larger than segment_order length scans all", () => {
  const root = mkRoot();
  try {
    writeSidecar(root, "SEG-1", "mtemplate-2");
    const result = computeRecentUseMap({
      manualStoryRoot: root,
      segmentOrder: ["SEG-1"],
      recentWindow: 99,
    });
    assert.equal(result.recentTemplates.size, 1);
    assert.equal(result.recentTemplates.get("mtemplate-2"), "SEG-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("computeRecentUseMap: most-recent wins on collision", () => {
  const root = mkRoot();
  try {
    writeSidecar(root, "SEG-1", "mtemplate-5");
    writeSidecar(root, "SEG-2", "mtemplate-5");
    writeSidecar(root, "SEG-3", "mtemplate-5");
    const result = computeRecentUseMap({
      manualStoryRoot: root,
      segmentOrder: ["SEG-1", "SEG-2", "SEG-3"],
      recentWindow: 3,
    });
    assert.equal(result.recentTemplates.get("mtemplate-5"), "SEG-3");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
