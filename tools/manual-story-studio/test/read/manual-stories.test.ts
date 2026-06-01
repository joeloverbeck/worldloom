import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { enumerateManualStories } from "../../src/read/manual-stories.js";
import type { ReadResult } from "../../src/read/result.js";
import type { ManualStoryEntry } from "../../src/read/manual-stories.js";

function createFixtureRepoRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-list-"));
}

function makeWorld(repoRoot: string, worldSlug: string): string {
  const worldRoot = path.join(repoRoot, "worlds", worldSlug);
  mkdirSync(worldRoot, { recursive: true });
  writeFileSync(path.join(worldRoot, "WORLD_KERNEL.md"), `# ${worldSlug}\n`);
  return worldRoot;
}

function unwrap(result: ReadResult<ManualStoryEntry[]>): ManualStoryEntry[] {
  if (!result.ok) assert.fail(`expected ok result, got ${result.error.code}`);
  return result.value;
}

test("enumerateManualStories returns [] when worlds/<slug>/manual-stories/ is absent", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    assert.deepEqual(unwrap(enumerateManualStories(repoRoot, "test-world")), []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("enumerateManualStories returns invalid_id_shape for an invalid world slug", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    const result = enumerateManualStories(repoRoot, "Bad World");
    if (result.ok) assert.fail("expected invalid_id_shape result");
    assert.equal(result.error.code, "invalid_id_shape");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("enumerateManualStories lists only directories containing manual-story.yaml", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const manualStoriesRoot = path.join(
      repoRoot,
      "worlds",
      "test-world",
      "manual-stories",
    );

    mkdirSync(path.join(manualStoriesRoot, "story-one"), { recursive: true });
    writeFileSync(
      path.join(manualStoriesRoot, "story-one", "manual-story.yaml"),
      "schema_version: manual-story.v1\ntitle: Story One\n",
    );
    mkdirSync(path.join(manualStoriesRoot, "story-two"), { recursive: true });
    writeFileSync(
      path.join(manualStoriesRoot, "story-two", "manual-story.yaml"),
      "schema_version: manual-story.v1\ntitle: Story Two\n",
    );
    mkdirSync(path.join(manualStoriesRoot, "broken"), { recursive: true });

    const results = unwrap(enumerateManualStories(repoRoot, "test-world"));

    assert.equal(results.length, 2);
    assert.equal(results[0]?.manualStorySlug, "story-one");
    assert.equal(results[0]?.title, "Story One");
    assert.equal(results[1]?.manualStorySlug, "story-two");
    assert.equal(results[1]?.title, "Story Two");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("enumerateManualStories returns title: null when yaml has no title", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const manualStoriesRoot = path.join(
      repoRoot,
      "worlds",
      "test-world",
      "manual-stories",
    );

    mkdirSync(path.join(manualStoriesRoot, "no-title"), { recursive: true });
    writeFileSync(
      path.join(manualStoriesRoot, "no-title", "manual-story.yaml"),
      "schema_version: manual-story.v1\n",
    );

    const results = unwrap(enumerateManualStories(repoRoot, "test-world"));

    assert.equal(results.length, 1);
    const titles = Object.fromEntries(results.map((r) => [r.manualStorySlug, r.title]));
    assert.equal(titles["no-title"], null);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("enumerateManualStories fails fast when a sibling manual-story.yaml is malformed", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const manualStoriesRoot = path.join(
      repoRoot,
      "worlds",
      "test-world",
      "manual-stories",
    );

    mkdirSync(path.join(manualStoriesRoot, "malformed"), { recursive: true });
    const yamlPath = path.join(
      manualStoriesRoot,
      "malformed",
      "manual-story.yaml",
    );
    writeFileSync(yamlPath, "schema_version: [unterminated");

    const result = enumerateManualStories(repoRoot, "test-world");

    if (result.ok) assert.fail("expected yaml_parse_failed result");
    assert.equal(result.error.code, "yaml_parse_failed");
    assert.equal(result.error.path, yamlPath);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("enumerateManualStories skips directories whose names don't match the slug pattern", () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const manualStoriesRoot = path.join(
      repoRoot,
      "worlds",
      "test-world",
      "manual-stories",
    );

    mkdirSync(path.join(manualStoriesRoot, "Bad Slug"), { recursive: true });
    writeFileSync(
      path.join(manualStoriesRoot, "Bad Slug", "manual-story.yaml"),
      "schema_version: manual-story.v1\n",
    );
    mkdirSync(path.join(manualStoriesRoot, "valid-slug"), { recursive: true });
    writeFileSync(
      path.join(manualStoriesRoot, "valid-slug", "manual-story.yaml"),
      "schema_version: manual-story.v1\ntitle: Valid\n",
    );

    const results = unwrap(enumerateManualStories(repoRoot, "test-world"));

    assert.equal(results.length, 1);
    assert.equal(results[0]?.manualStorySlug, "valid-slug");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
