import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { composePrompt } from "../src/prompt/compose.js";
import type { ManualStoryMetadata } from "../src/schema/manual-story.js";

import { fixtureCast } from "./prompt/fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// dist/test -> dist -> manual-story-studio -> tools -> repo
const REPO_ROOT = path.resolve(HERE, "../../../..");

function baseMetadata(): ManualStoryMetadata {
  return {
    schema_version: "manual-story.v1",
    world_slug: "compose-fixture",
    manual_story_slug: "first-story",
    title: "Compose fixture",
    created_at: "2026-05-30T00:00:00Z",
    updated_at: "2026-05-30T00:00:00Z",
    source: { world_commit: null, notes: "" },
    story_contract: {
      premise: "A scribe and a witness meet",
      tone: "Patient",
      pov: "close third",
      tense: "past",
      content_intensity: "mature",
      explicitness: "implied unless central",
      language_register: "literary",
      prose_preferences: {
        psychic_distance: "close",
        dialogue_density: "moment_led",
        interiority: "free_indirect",
        paragraphing: "literary",
      },
    },
    cast_order: ["mchar-1"],
    segment_order: [],
    prompt_policy: {
      save_prompts: true,
      require_moment_directive: true,
      default_beat_count: "2-5",
      include_recent_segments: 0,
    },
    manuscript: {
      compile_on_segment_save: false,
      include_segment_titles: true,
    },
  };
}

function mkFixture(): { tempRoot: string; manualStoryRoot: string } {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "compose-fixture-"));
  const manualStoryRoot = path.join(
    tempRoot,
    "worlds",
    "compose-fixture",
    "manual-stories",
    "first-story",
  );
  mkdirSync(manualStoryRoot, { recursive: true });
  // Symlink docs/ from the real repo into the fixture root so compose can
  // read content-policy + prose-craft-contract.
  mkdirSync(path.join(tempRoot, "docs"), { recursive: true });
  const docsRealMs = path.join(REPO_ROOT, "docs", "manual-story-studio");
  const docsRealPr = path.join(REPO_ROOT, "docs", "prose-renderer-contract");
  const docsFakeMs = path.join(tempRoot, "docs", "manual-story-studio");
  const docsFakePr = path.join(tempRoot, "docs", "prose-renderer-contract");
  // Copy (never symlink). rmSync with recursive:true follows symlinks in
  // some Node versions / FS layouts and would delete the real docs tree.
  cpSync(docsRealPr, docsFakePr, { recursive: true });
  cpSync(docsRealMs, docsFakeMs, { recursive: true });

  writeFileSync(
    path.join(manualStoryRoot, "manual-story.yaml"),
    YAML.stringify(baseMetadata()),
  );
  const castDir = path.join(manualStoryRoot, "records", "cast");
  mkdirSync(castDir, { recursive: true });
  const cast = fixtureCast("mchar-1", "Jon", {
    identity: {
      one_line: "A scribe with a debt",
      public_face: "Polite, efficient",
      private_pressure: "Owes a debt he cannot afford",
    },
  });
  writeFileSync(
    path.join(castDir, "mchar-1.yaml"),
    YAML.stringify(cast),
  );
  return { tempRoot, manualStoryRoot };
}

test("AC #1 — composePrompt is byte-deterministic across 5 invocations", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const input = {
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Jon hesitates before he speaks.",
      included_cast: ["mchar-1"],
      included_records: [],
    };
    const first = await composePrompt(input);
    assert.ok(first.markdown.length > 0);
    for (let i = 0; i < 4; i++) {
      const next = await composePrompt(input);
      assert.equal(
        next.markdown,
        first.markdown,
        `divergence at invocation ${i + 2}`,
      );
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("empty moment_directive returns hard finding + empty markdown", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "   ",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    assert.equal(result.markdown, "");
    assert.ok(result.lint.blockingForCopy);
    assert.ok(
      result.lint.findings.some(
        (f) => f.rule === "moment_directive_present" && f.tier === "hard",
      ),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("missing cast id surfaces hard finding", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "A directive",
      included_cast: ["mchar-1", "mchar-99"],
      included_records: [],
    });
    assert.ok(
      result.lint.findings.some(
        (f) => f.rule === "selected_cast_exists" && f.tier === "hard",
      ),
    );
    assert.ok(result.lint.blockingForCopy);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("no-segments-yet path produces §3 without the recent-segment paragraph", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Jon stays in his chair.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    assert.ok(!result.markdown.includes("Most recent prose"));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("present-segment path includes the last paragraph in §3", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    // bump include_recent_segments to 1 and seed one segment file
    const meta = baseMetadata();
    meta.prompt_policy.include_recent_segments = 1;
    writeFileSync(
      path.join(manualStoryRoot, "manual-story.yaml"),
      YAML.stringify(meta),
    );
    const segDir = path.join(manualStoryRoot, "segments");
    mkdirSync(segDir, { recursive: true });
    writeFileSync(
      path.join(segDir, "SEG-1.md"),
      "First paragraph of an earlier beat.\n\nLast paragraph; the door was still open.\n",
    );

    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Jon hears the latch turn.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    assert.ok(result.markdown.includes("Most recent prose"));
    assert.ok(result.markdown.includes("the door was still open"));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #2 — content-policy is byte-equal to disk", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Anything.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    const diskContentPolicy = readFileSync(
      path.join(tempRoot, "docs/prose-renderer-contract/content-policy.md"),
      "utf8",
    ).trim();
    assert.ok(result.markdown.includes(diskContentPolicy));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("missing content-policy file throws", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    rmSync(path.join(tempRoot, "docs/prose-renderer-contract/content-policy.md"), { force: true });
    await assert.rejects(
      composePrompt({
        manualStoryRoot,
        repoRoot: tempRoot,
        moment_directive: "x",
        included_cast: ["mchar-1"],
        included_records: [],
      }),
      /content_policy_not_found/,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
