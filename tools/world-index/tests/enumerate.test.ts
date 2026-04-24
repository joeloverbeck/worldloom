import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { enumerate } from "../src/enumerate";

function createFixtureWorldRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-enumerate-"));
  const source = path.resolve(__dirname, "..", "..", "tests", "fixtures", "fixture-world");
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
      "TIMELINE.md"
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
