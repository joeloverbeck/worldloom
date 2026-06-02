import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { computeHealth } from "../../src/health/compute.js";
import type { BlockedAction } from "../../src/health/types.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

interface Fixture {
  repoRoot: string;
  root: ManualStoryRoot;
}

function mkFixture(segmentOrder: string[] = []): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "health-deps-"));
  writeComposeDocs(repoRoot);
  const root = resolveManualStoryRoot(repoRoot, "fixture-world", "fixture-story");
  mkdirSync(root.absolutePath, { recursive: true });
  writeMetadata(root, segmentOrder);
  return { repoRoot, root };
}

function writeComposeDocs(repoRoot: string): void {
  const contentPolicyPath = path.join(
    repoRoot,
    "docs/prose-renderer-contract/content-policy.md",
  );
  const proseCraftPath = path.join(
    repoRoot,
    "docs/manual-story-studio/prose-craft-contract.md",
  );
  mkdirSync(path.dirname(contentPolicyPath), { recursive: true });
  mkdirSync(path.dirname(proseCraftPath), { recursive: true });
  writeFileSync(contentPolicyPath, "Content policy\n");
  writeFileSync(proseCraftPath, "Prose craft contract\n");
}

function writeMetadata(root: ManualStoryRoot, segmentOrder: string[]): void {
  const metadata = makeDefaultManualStoryMetadata(
    root.worldSlug,
    root.manualStorySlug,
    "Fixture Story",
    "2026-06-02T00:00:00.000Z",
  );
  metadata.segment_order = segmentOrder;
  writeFileSync(
    path.join(root.absolutePath, "manual-story.yaml"),
    YAML.stringify(metadata),
  );
}

function writeSegmentBody(root: ManualStoryRoot, segmentId: string): void {
  const segmentDir = path.join(root.absolutePath, "segments");
  mkdirSync(segmentDir, { recursive: true });
  writeFileSync(path.join(segmentDir, `${segmentId}.md`), "Segment body.\n");
}

function assertBlockedOnly(
  actual: readonly BlockedAction[],
  expected: readonly BlockedAction[],
): void {
  assert.deepEqual([...actual].sort(), [...expected].sort());
}

test("missing content policy blocks prompt actions only", () => {
  const { repoRoot, root } = mkFixture();
  try {
    unlinkSync(
      path.join(repoRoot, "docs/prose-renderer-contract/content-policy.md"),
    );

    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "blocked");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "content-policy-missing");
    assert.equal(report.findings[0]?.severity, "blocking");
    assertBlockedOnly(report.blocked_actions, ["prompt_copy", "prompt_save"]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("missing prose craft contract blocks prompt actions only", () => {
  const { repoRoot, root } = mkFixture();
  try {
    unlinkSync(
      path.join(repoRoot, "docs/manual-story-studio/prose-craft-contract.md"),
    );

    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "blocked");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "prose-craft-contract-missing");
    assert.equal(report.findings[0]?.severity, "blocking");
    assertBlockedOnly(report.blocked_actions, ["prompt_copy", "prompt_save"]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("missing segment sidecar blocks segment save and manuscript compile only", () => {
  const { repoRoot, root } = mkFixture(["SEG-1"]);
  try {
    writeSegmentBody(root, "SEG-1");

    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "blocked");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "segment-sidecar-missing");
    assert.equal(report.findings[0]?.severity, "blocking");
    assertBlockedOnly(report.blocked_actions, [
      "segment_save",
      "manuscript_compile",
    ]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("missing manuscript with ordered segments is degraded and blocks nothing", () => {
  const { repoRoot, root } = mkFixture(["SEG-1"]);
  try {
    writeSegmentBody(root, "SEG-1");
    writeFileSync(
      path.join(root.absolutePath, "segments", "SEG-1.yaml"),
      YAML.stringify({
        id: "SEG-1",
        created_at: "2026-06-02T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z",
        title: "Segment 1",
        prompt_id: null,
        prompt_sha256: null,
        moment_directive: "",
        selected_template: null,
        included_record_summary: { characters: [], records: [] },
        author_note: "",
        word_count: 2,
      }),
    );

    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "degraded");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "manuscript-stale");
    assert.equal(report.findings[0]?.severity, "error");
    assert.deepEqual(report.blocked_actions, []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
