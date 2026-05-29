import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { readSceneArtifact } from "../src/read/scene-detail.js";

function createFixture(): { repoRoot: string; storyRoot: string } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-scene-traversal-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["scene-prose-plans", "scene-prose", "scene-prose-receipts"]) {
    mkdirSync(path.join(storyRoot, subdir), { recursive: true });
  }
  return { repoRoot, storyRoot };
}

test("readSceneArtifact reads a legitimate scene-prose file", async () => {
  const fixture = createFixture();
  writeFileSync(path.join(fixture.storyRoot, "scene-prose", "SCN-1.md"), "Scene prose\n", "utf8");

  const artifact = await readSceneArtifact("fixture-world", "red-bunny", "SCN-1", "prose", fixture.repoRoot);
  assert.equal(artifact?.body, "Scene prose\n");
});

test("readSceneArtifact refuses a sceneId that traverses outside worlds/", async () => {
  const fixture = createFixture();
  // Plant a sensitive file at the repo root, outside the worlds/ tree.
  writeFileSync(path.join(fixture.repoRoot, "secret.txt"), "top secret\n", "utf8");

  await assert.rejects(
    () =>
      readSceneArtifact(
        "fixture-world",
        "red-bunny",
        path.join("..", "..", "..", "..", "..", "secret"),
        "prose",
        fixture.repoRoot,
      ),
    /Refusing to read scene artifact outside worlds\//,
  );
});

test("readSceneArtifact refuses a worldSlug that traverses outside worlds/", async () => {
  const fixture = createFixture();

  await assert.rejects(
    () =>
      readSceneArtifact(
        path.join("..", "..", "etc"),
        "red-bunny",
        "SCN-1",
        "prose",
        fixture.repoRoot,
      ),
    /Refusing to read scene artifact outside worlds\//,
  );
});
