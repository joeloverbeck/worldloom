import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { readRecord, recordSourceDir } from "../src/read/record-io.js";

function createFixture(): { repoRoot: string; storyRoot: string } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-record-io-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "story-characters"), { recursive: true });
  return { repoRoot, storyRoot };
}

test("readRecord resolves STCHAR raw reads to story-characters markdown", async () => {
  const fixture = createFixture();
  const body = ["---", "id: STCHAR-1", "story_id: STORY-1", "title: Red Bunny", "---", "", "## Voice", "Careful and bright.", ""].join("\n");
  writeFileSync(path.join(fixture.storyRoot, "story-characters", "STCHAR-1.md"), body, "utf8");

  const record = await readRecord("fixture-world", "red-bunny", "STCHAR-1", fixture.repoRoot);

  assert.equal(record.body, body);
  assert.equal(path.relative(fixture.storyRoot, record.sourcePath), "story-characters/STCHAR-1.md");
  assert.equal(record.parsed.id, "STCHAR-1");
  assert.equal(record.parsed.title, "Red Bunny");
});

test("recordSourceDir rejects STCHAR so raw reads cannot fall back to _source/characters", () => {
  assert.throws(() => recordSourceDir("STCHAR-1"), /Unsupported story-bundle record class for STCHAR-1/);
});
