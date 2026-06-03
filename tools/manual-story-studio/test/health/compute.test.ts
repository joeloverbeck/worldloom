import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { computeHealth } from "../../src/health/compute.js";
import type { ManualFactRecord } from "../../src/schema/manual-story.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import { resolveManualStoryRoot } from "../../src/write/sandbox.js";

type FixtureRoot = ReturnType<typeof resolveManualStoryRoot>;

function mkFixture(): { tempRoot: string; manualStoryRoot: FixtureRoot } {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "manual-health-"));
  writeComposeDocs(tempRoot);
  const manualStoryRoot = resolveManualStoryRoot(
    tempRoot,
    "fixture-world",
    "fixture-story",
  );
  mkdirSync(manualStoryRoot.absolutePath, { recursive: true });
  writeMetadata(manualStoryRoot, []);
  return { tempRoot, manualStoryRoot };
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

function writeMetadata(root: FixtureRoot, segmentOrder: string[]): void {
  const metadata = makeDefaultManualStoryMetadata(
    root.worldSlug,
    root.manualStorySlug,
    "Fixture Story",
    "2026-06-01T00:00:00.000Z",
  );
  metadata.segment_order = segmentOrder;
  writeFileSync(
    path.join(root.absolutePath, "manual-story.yaml"),
    YAML.stringify(metadata),
  );
}

function writeFact(root: FixtureRoot, record: Partial<ManualFactRecord> = {}): void {
  const fact: ManualFactRecord = {
    id: "mfact-1",
    title: "Lantern fact",
    active: true,
    importance: "medium",
    tags: [],
    summary: "Lanterns matter.",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    notes: "",
    ...record,
  };
  const dir = path.join(root.absolutePath, "records", "facts");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${fact.id}.yaml`), YAML.stringify(fact));
}

test("computeHealth returns ok for a valid empty manual story", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const report = computeHealth(manualStoryRoot.absolutePath);

    assert.equal(report.status, "ok");
    assert.deepEqual(report.findings, []);
    assert.deepEqual(report.blocked_actions, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("computeHealth blocks on corrupt manual-story.yaml", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const metadataPath = path.join(manualStoryRoot.absolutePath, "manual-story.yaml");
    writeFileSync(metadataPath, "schema_version: [unterminated");

    const report = computeHealth(manualStoryRoot.absolutePath);

    assert.equal(report.status, "blocked");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "metadata-yaml-parse-failed");
    assert.equal(report.findings[0]?.severity, "blocking");
    assert.deepEqual(report.blocked_actions, [
      "prompt_copy",
      "prompt_save",
      "segment_save",
      "manuscript_compile",
    ]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("computeHealth degrades on corrupt single record YAML", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const dir = path.join(manualStoryRoot.absolutePath, "records", "facts");
    mkdirSync(dir, { recursive: true });
    const recordPath = path.join(dir, "mfact-1.yaml");
    writeFileSync(recordPath, "id: [unterminated");

    const report = computeHealth(manualStoryRoot.absolutePath);

    assert.equal(report.status, "degraded");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "record-yaml-parse-failed");
    assert.equal(report.findings[0]?.severity, "error");
    assert.equal(report.findings[0]?.path, recordPath);
    assert.deepEqual(report.blocked_actions, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("computeHealth blocks on missing segment sidecar", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    writeMetadata(manualStoryRoot, ["SEG-1"]);
    mkdirSync(path.join(manualStoryRoot.absolutePath, "segments"), {
      recursive: true,
    });
    writeFileSync(
      path.join(manualStoryRoot.absolutePath, "segments", "SEG-1.md"),
      "A segment body.",
    );

    const report = computeHealth(manualStoryRoot.absolutePath);

    assert.equal(report.status, "blocked");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "segment-sidecar-missing");
    assert.equal(report.findings[0]?.severity, "blocking");
    assert.deepEqual(report.blocked_actions, [
      "segment_save",
      "manuscript_compile",
    ]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("computeHealth degrades on dangling typed ref", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    writeFact(manualStoryRoot, {
      refs: {
        characters: ["mchar-999"],
        locations: [],
        related_records: [],
      },
    });

    const report = computeHealth(manualStoryRoot.absolutePath);

    assert.equal(report.status, "degraded");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "reference-resolution-failed");
    assert.equal(report.findings[0]?.severity, "error");
    assert.deepEqual(report.blocked_actions, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
