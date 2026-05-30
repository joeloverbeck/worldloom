import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertInsideSandbox,
  resolveManualStoryRoot,
} from "../../src/write/sandbox.js";

interface Fixture {
  repoRoot: string;
  worldSlug: string;
  manualStorySlug: string;
  manualStoryAbsolutePath: string;
  cleanup: () => void;
}

function createFixture(): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-sandbox-"));
  const worldSlug = "test-world";
  const manualStorySlug = "test-story";
  const manualStoryAbsolutePath = path.join(
    repoRoot,
    "worlds",
    worldSlug,
    "manual-stories",
    manualStorySlug,
  );
  mkdirSync(manualStoryAbsolutePath, { recursive: true });
  return {
    repoRoot,
    worldSlug,
    manualStorySlug,
    manualStoryAbsolutePath,
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
  };
}

test("resolveManualStoryRoot rejects malformed world slug", () => {
  assert.throws(
    () => resolveManualStoryRoot("/repo", "World!", "story"),
    /invalid world slug/,
  );
});

test("resolveManualStoryRoot rejects malformed manual story slug", () => {
  assert.throws(
    () => resolveManualStoryRoot("/repo", "world", "story with spaces"),
    /invalid manual story slug/,
  );
});

test("resolveManualStoryRoot returns the correct absolute path for valid slugs", () => {
  const root = resolveManualStoryRoot("/repo", "the-world", "the-story");
  assert.equal(
    root.absolutePath,
    path.resolve("/repo", "worlds", "the-world", "manual-stories", "the-story"),
  );
  assert.equal(root.worldSlug, "the-world");
  assert.equal(root.manualStorySlug, "the-story");
  assert.equal(root.repoRoot, "/repo");
});

test("assertInsideSandbox accepts a target inside the manual story root", () => {
  const fixture = createFixture();
  try {
    const root = resolveManualStoryRoot(
      fixture.repoRoot,
      fixture.worldSlug,
      fixture.manualStorySlug,
    );
    const target = path.join(root.absolutePath, "manual-story.yaml");
    assert.doesNotThrow(() => assertInsideSandbox(target, root));
  } finally {
    fixture.cleanup();
  }
});

test("assertInsideSandbox rejects '..' traversal escapes", () => {
  const fixture = createFixture();
  try {
    const root = resolveManualStoryRoot(
      fixture.repoRoot,
      fixture.worldSlug,
      fixture.manualStorySlug,
    );
    const escape = path.join(root.absolutePath, "..", "..", "escape.txt");
    assert.throws(() => assertInsideSandbox(escape, root), /sandbox escape/);
  } finally {
    fixture.cleanup();
  }
});

test("assertInsideSandbox rejects absolute path outside the root", () => {
  const fixture = createFixture();
  try {
    const root = resolveManualStoryRoot(
      fixture.repoRoot,
      fixture.worldSlug,
      fixture.manualStorySlug,
    );
    const outsideDir = mkdtempSync(path.join(os.tmpdir(), "manual-studio-outside-"));
    try {
      const outsidePath = path.join(outsideDir, "elsewhere.txt");
      writeFileSync(outsidePath, "outside");
      assert.throws(() => assertInsideSandbox(outsidePath, root), /sandbox escape/);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  } finally {
    fixture.cleanup();
  }
});

test("assertInsideSandbox rejects symlinks pointing outside the root", () => {
  const fixture = createFixture();
  const outsideDir = mkdtempSync(path.join(os.tmpdir(), "manual-studio-symlink-target-"));
  try {
    const root = resolveManualStoryRoot(
      fixture.repoRoot,
      fixture.worldSlug,
      fixture.manualStorySlug,
    );
    const realOutside = path.join(outsideDir, "secret.txt");
    writeFileSync(realOutside, "outside-content");
    const linkPath = path.join(root.absolutePath, "link-out");
    symlinkSync(realOutside, linkPath);
    assert.throws(() => assertInsideSandbox(linkPath, root), /sandbox escape/);
  } finally {
    rmSync(outsideDir, { recursive: true, force: true });
    fixture.cleanup();
  }
});

test("assertInsideSandbox denylist hit fires when root is crafted under a forbidden destination", () => {
  const fixture = createFixture();
  try {
    const storiesDir = path.join(
      fixture.repoRoot,
      "worlds",
      fixture.worldSlug,
      "stories",
      "some-bundle",
    );
    mkdirSync(storiesDir, { recursive: true });
    const malformedRoot = {
      repoRoot: fixture.repoRoot,
      worldSlug: fixture.worldSlug,
      manualStorySlug: "some-bundle",
      absolutePath: storiesDir,
    };
    const target = path.join(storiesDir, "manual-story.yaml");
    assert.throws(
      () => assertInsideSandbox(target, malformedRoot),
      /sandbox denylist hit/,
    );
  } finally {
    fixture.cleanup();
  }
});

test("assertInsideSandbox denylist hit fires when target resolves under a forbidden tool prefix", () => {
  const fixture = createFixture();
  try {
    const toolDir = path.join(fixture.repoRoot, "tools", "world-index", "evil");
    mkdirSync(toolDir, { recursive: true });
    const malformedRoot = {
      repoRoot: fixture.repoRoot,
      worldSlug: fixture.worldSlug,
      manualStorySlug: "evil",
      absolutePath: toolDir,
    };
    const target = path.join(toolDir, "manual-story.yaml");
    assert.throws(
      () => assertInsideSandbox(target, malformedRoot),
      /sandbox denylist hit/,
    );
  } finally {
    fixture.cleanup();
  }
});
