import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { writePrompt } from "../../src/write/prompts.js";
import { resolveManualStoryRoot } from "../../src/write/sandbox.js";
import type { PromptComposeResult } from "../../src/prompt/types.js";

function mkFixture(): { tempRoot: string; manualStoryRoot: ReturnType<typeof resolveManualStoryRoot> } {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "prompt-write-"));
  const manualStoryAbs = path.join(
    tempRoot,
    "worlds",
    "fixture-world",
    "manual-stories",
    "fixture-story",
  );
  mkdirSync(manualStoryAbs, { recursive: true });
  const root = resolveManualStoryRoot(tempRoot, "fixture-world", "fixture-story");
  return { tempRoot, manualStoryRoot: root };
}

function fixtureComposeResult(): PromptComposeResult {
  return {
    markdown: "## 1. Content Policy\n\nfixture body\n",
    lint: { findings: [], cleanForCopy: true, blockingForCopy: false },
    sidecar_draft: {
      manual_story_slug: "fixture-story",
      included_cast: ["mchar-1"],
      included_records: ["mbel-1"],
      included_template_path: null,
      moment_directive: "Jon waits.",
    },
    resolution: {
      included: [],
      excluded: [],
      suppressed: [],
      blocked: [],
      section_map: {},
    },
  };
}

test("sequential writes allocate PROMPT-1, PROMPT-2, PROMPT-3", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const r1 = writePrompt({
      root: manualStoryRoot,
      composeResult: fixtureComposeResult(),
      now: () => "2026-05-30T12:00:00Z",
    });
    assert.equal(r1.id, "PROMPT-1");
    const r2 = writePrompt({
      root: manualStoryRoot,
      composeResult: fixtureComposeResult(),
      now: () => "2026-05-30T12:01:00Z",
    });
    assert.equal(r2.id, "PROMPT-2");
    const r3 = writePrompt({
      root: manualStoryRoot,
      composeResult: fixtureComposeResult(),
      now: () => "2026-05-30T12:02:00Z",
    });
    assert.equal(r3.id, "PROMPT-3");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("Markdown file and sidecar both land inside manual-story root", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const r = writePrompt({
      root: manualStoryRoot,
      composeResult: fixtureComposeResult(),
      now: () => "2026-05-30T12:00:00Z",
    });
    assert.equal(
      r.markdown_path,
      path.join(manualStoryRoot.absolutePath, "prompts", "PROMPT-1.md"),
    );
    assert.equal(
      r.sidecar_path,
      path.join(manualStoryRoot.absolutePath, "prompt-runs", "PROMPT-1.yaml"),
    );
    const onDisk = readFileSync(r.markdown_path, "utf8");
    assert.equal(onDisk, fixtureComposeResult().markdown);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("sidecar carries mandatory fields and omits legacy lint_override", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const r = writePrompt({
      root: manualStoryRoot,
      composeResult: fixtureComposeResult(),
      now: () => "2026-05-30T12:00:00Z",
    });
    const onDisk = YAML.parse(readFileSync(r.sidecar_path, "utf8")) as Record<string, unknown>;
    assert.equal(onDisk.id, "PROMPT-1");
    assert.equal(onDisk.created_at, "2026-05-30T12:00:00Z");
    assert.equal(onDisk.manual_story_slug, "fixture-story");
    assert.deepStrictEqual(onDisk.included_cast, ["mchar-1"]);
    assert.deepStrictEqual(onDisk.included_records, ["mbel-1"]);
    assert.equal(onDisk.included_template_path, null);
    assert.equal(onDisk.moment_directive, "Jon waits.");
    assert.equal(typeof onDisk.prompt_sha256, "string");
    // SPEC-106: lint_override is read-tolerant legacy state, not written by new saves.
    assert.equal(onDisk.lint_override, undefined);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("prompt_sha256 equals sha256(markdown) byte-for-byte", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const compose = fixtureComposeResult();
    const expected = crypto
      .createHash("sha256")
      .update(compose.markdown)
      .digest("hex");
    const r = writePrompt({
      root: manualStoryRoot,
      composeResult: compose,
      now: () => "2026-05-30T12:00:00Z",
    });
    assert.equal(r.sidecar.prompt_sha256, expected);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("sandbox enforcement: attempting write outside root throws", () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    // Fake a sibling-world target via path traversal in the composer's
    // markdown filename — but writePrompt uses fixed relative paths, so
    // we instead point root.absolutePath at a denylisted destination and
    // attempt the write. Use safeWriteFile directly for this test.
    const denylistedRoot = {
      ...manualStoryRoot,
      absolutePath: path.join(
        tempRoot,
        "worlds",
        "fixture-world",
        "_source",
        "evil",
      ),
    };
    mkdirSync(denylistedRoot.absolutePath, { recursive: true });
    assert.throws(() =>
      writePrompt({
        root: denylistedRoot,
        composeResult: fixtureComposeResult(),
      }),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
