import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { enumerate } from "../src/enumerate.js";
import { STORY_SOURCE_DIRECTORIES } from "../src/parse/story-directories.js";

function createFixtureWorldRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-enumerate-"));
  const source = path.resolve(import.meta.dirname, "..", "..", "tests", "fixtures", "fixture-world");
  const target = path.join(root, "fixture-world");
  cpSync(source, target, { recursive: true });
  return target;
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

test("enumerate returns every expected indexable path and no unexpected paths for the fixture world", () => {
  const worldRoot = createFixtureWorldRoot();

  try {
    const result = enumerate(worldRoot);

    assert.deepEqual(result.indexable, [
      "ONTOLOGY.md",
      "WORLD_KERNEL.md",
      "adjudications/PA-0001-sample.md",
      "audits/AU-0001-sample.md",
      "audits/AU-0001/retcon-proposals/RP-0001-sample.md",
      "character-proposals/NCP-0001-sample.md",
      "character-proposals/batches/NCB-0001.md",
      "characters/CHAR-0001-sample.md",
      "diegetic-artifacts/DA-0001-sample.md",
      "proposals/PR-0001-sample.md",
      "proposals/batches/BATCH-0001.md"
    ]);
    assert.deepEqual(result.unexpected, [
      "CANON_LEDGER.md",
      "ECONOMY_AND_RESOURCES.md",
      "EVERYDAY_LIFE.md",
      "GEOGRAPHY.md",
      "INSTITUTIONS.md",
      "INVARIANTS.md",
      "MAGIC_OR_TECH_SYSTEMS.md",
      "MYSTERY_RESERVE.md",
      "OPEN_QUESTIONS.md",
      "PEOPLES_AND_SPECIES.md",
      "TIMELINE.md",
      "_source/raw.md"
    ]);
    assert.deepEqual(
      result.indexable.filter((filePath) => result.unexpected.includes(filePath)),
      []
    );
  } finally {
    cleanup(path.dirname(worldRoot));
  }
});

test("unexpected markdown paths are reported while hidden files remain excluded", () => {
  const worldRoot = createFixtureWorldRoot();

  try {
    writeFileSync(path.join(worldRoot, "scratch.md"), "# Scratch\n", "utf8");
    writeFileSync(path.join(worldRoot, ".hidden.md"), "# Hidden\n", "utf8");
    writeFileSync(path.join(worldRoot, "audits", "AU-0001", "notes.txt"), "ignored note\n", "utf8");

    const result = enumerate(worldRoot);

    assert.equal(result.unexpected.includes("scratch.md"), true);
    assert.equal(result.unexpected.includes("audits/AU-0001/notes.txt"), true);
    assert.equal(result.indexable.includes(".hidden.md"), false);
    assert.equal(result.unexpected.includes(".hidden.md"), false);
  } finally {
    cleanup(path.dirname(worldRoot));
  }
});

test("story-bundle paths are recognized as indexable closed inventory", () => {
  const worldRoot = createFixtureWorldRoot();
  const storySourcePaths = STORY_SOURCE_DIRECTORIES.map(
    (directory, index) =>
      `stories/foo/_source/${directory}/STORY-SOURCE-${String(index + 1).padStart(4, "0")}.yaml`
  );

  try {
    for (const relativeFilePath of [
      "stories/foo/STORY_KERNEL.md",
      ...storySourcePaths,
      "stories/foo/pages-prose/PG-0001.md",
      "stories/foo/pages-prose-plans/PG-0001.md",
      "stories/foo/pages-prose-receipts/PG-0001.yaml",
      "stories/foo/storylet-batches/SLB-0001.md",
      "stories/foo/story-promotions/SP-0001.md",
      "stories/foo/audits/SAU-0001-2026-05-04.md",
      "stories/foo/audits/SAU-0001/remediation-storylet-proposals/RSP-0001-fix-thread-coverage.md",
      "stories/foo/character-proposals/NCP-0001-sample.md",
      "stories/foo/character-proposals/batches/NCB-0001.md",
      "stories/foo/notes.md",
      "stories/foo/pages-prose-rejected/PG-0001.yaml",
      "stories/foo/scratch/draft.md",
      "stories/foo/audits/SAU-0001/RSP-0001.md"
    ]) {
      const absoluteFilePath = path.join(worldRoot, relativeFilePath);
      mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
      writeFileSync(absoluteFilePath, "# Fixture\n", "utf8");
    }

    const result = enumerate(worldRoot);

    for (const expected of [
      "stories/foo/STORY_KERNEL.md",
      ...storySourcePaths,
      "stories/foo/pages-prose/PG-0001.md",
      "stories/foo/pages-prose-plans/PG-0001.md",
      "stories/foo/pages-prose-receipts/PG-0001.yaml",
      "stories/foo/storylet-batches/SLB-0001.md",
      "stories/foo/story-promotions/SP-0001.md",
      "stories/foo/audits/SAU-0001-2026-05-04.md",
      "stories/foo/audits/SAU-0001/remediation-storylet-proposals/RSP-0001-fix-thread-coverage.md",
      "stories/foo/character-proposals/NCP-0001-sample.md",
      "stories/foo/character-proposals/batches/NCB-0001.md"
    ]) {
      assert.equal(result.indexable.includes(expected), true);
      assert.equal(result.unexpected.includes(expected), false);
    }

    for (const unexpected of [
      "stories/foo/notes.md",
      "stories/foo/pages-prose-rejected/PG-0001.yaml",
      "stories/foo/scratch/draft.md",
      "stories/foo/audits/SAU-0001/RSP-0001.md"
    ]) {
      assert.equal(result.unexpected.includes(unexpected), true);
      assert.equal(result.indexable.includes(unexpected), false);
    }
  } finally {
    cleanup(path.dirname(worldRoot));
  }
});
