import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import {
  makeDefaultManualStoryMetadata,
  updateManualStoryMetadata,
} from "../../src/write/manual-story-metadata.js";
import { resolveManualStoryRoot } from "../../src/write/sandbox.js";

function mkWorld() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-metadata-"));
  mkdirSync(
    path.join(repoRoot, "worlds", "test-world", "manual-stories", "test-story"),
    { recursive: true },
  );
  return {
    repoRoot,
    manualStoryRoot: resolveManualStoryRoot(
      repoRoot,
      "test-world",
      "test-story",
    ),
  };
}

test("updateManualStoryMetadata: round-trip; updated_at is rewritten", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const metadata = makeDefaultManualStoryMetadata(
      "test-world",
      "test-story",
      "Title",
      "2026-05-30T00:00:00.000Z",
    );
    const result = updateManualStoryMetadata(manualStoryRoot, metadata, {
      now: () => "2026-05-30T12:34:56.789Z",
    });
    assert.equal(result.ok, true);
    const fullPath = path.join(manualStoryRoot.absolutePath, "manual-story.yaml");
    assert.equal(existsSync(fullPath), true);
    const parsed = YAML.parse(readFileSync(fullPath, "utf8")) as Record<
      string,
      unknown
    >;
    assert.equal(parsed.updated_at, "2026-05-30T12:34:56.789Z");
    assert.equal(parsed.title, "Title");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("updateManualStoryMetadata: schema-fail rejects invalid enum; file not written", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const metadata = makeDefaultManualStoryMetadata(
      "test-world",
      "test-story",
      "Title",
      "2026-05-30T00:00:00.000Z",
    );
    const broken = {
      ...metadata,
      story_contract: {
        ...metadata.story_contract,
        pov: "third-omniscient",
      },
    } as unknown as typeof metadata;
    const result = updateManualStoryMetadata(manualStoryRoot, broken);
    assert.equal(result.ok, false);
    assert.equal(
      existsSync(path.join(manualStoryRoot.absolutePath, "manual-story.yaml")),
      false,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("makeDefaultManualStoryMetadata: prompt_policy defaults keep first prompt copyable", () => {
  const metadata = makeDefaultManualStoryMetadata(
    "test-world",
    "test-story",
    "Title",
    "2026-05-31T00:00:00.000Z",
  );
  assert.equal(metadata.prompt_policy.recent_template_advisory_window, 2);
  assert.equal(metadata.prompt_policy.include_recent_segments, 0);
});

test("updateManualStoryMetadata: rejects absolute relativePath via safeWriteFile guard", async () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const { safeWriteFile } = await import("../../src/write/sandbox.js");
    let threw = false;
    try {
      safeWriteFile(manualStoryRoot, "/etc/passwd", "x");
    } catch {
      threw = true;
    }
    assert.equal(threw, true);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
