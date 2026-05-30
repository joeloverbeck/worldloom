/**
 * Manual Studio capstone: SPEC-102 acceptance criteria #1-#10.
 *
 * Automated assertions (run via `cd tools/manual-story-studio && npm test`):
 *   - AC #1: composePrompt is byte-deterministic across 5 invocations.
 *   - AC #2: 15 sections in fixed order; §1 byte-equal to disk
 *            content-policy; §13 byte-equal to disk prose-craft.
 *   - AC #3: representative lint rules fire on synthetic violations
 *            (full coverage in prompt-lint.test.ts).
 *   - AC #5: writePrompt persists prompts/PROMPT-N.md +
 *            prompt-runs/PROMPT-N.yaml; ID allocator increments.
 *   - AC #6: prose-craft contract is read at compose time (§13 body
 *            byte-equality, AND removal of the disk file makes
 *            compose throw).
 *   - AC #7: no internal m[a-z]+-[0-9]+ ids in the composed body for
 *            a clean fixture.
 *   - AC #8: no engine-jargon denylist term in the composed body for
 *            a clean fixture.
 *   - AC #9: savePrompt with lint_override persists the override into
 *            the sidecar.
 *   - AC #10: this test is part of `npm test`.
 *
 * Manual dry-run runbook (AC #4 — frontend UI flow):
 *
 *   Prerequisite: this test file passes via
 *     `cd tools/manual-story-studio && npm test`.
 *
 *   Step 1. Build everything:
 *     cd tools/manual-story-studio && npm run build
 *
 *   Step 2. Pick or seed a fixture repo with a manual story:
 *     - Reuse worlds/<world>/manual-stories/<story> if one exists, OR
 *     - Use the SPEC-101 capstone's runbook to seed a fixture root.
 *
 *   Step 3. Boot backend + Vite dev server:
 *     node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root <fixture-root>
 *     cd tools/manual-story-studio/web && npm run dev
 *
 *   Step 4 (AC #4 — Moment Composer + Prompt Preview flow):
 *     Open http://127.0.0.1:5176/worlds/<world>/manual-stories/<story>/moment-composer
 *     Confirm: textarea for moment directive, cast multi-select pre-checked
 *     from cast_order, suggested + pinned record pickers.
 *     Type a moment directive. Click "Generate Prompt".
 *     Confirm navigation to .../prompts/preview with composed Markdown
 *     visible and lint badge showing "Clean external prompt (15 sections)".
 *     Click "Copy to clipboard"; paste elsewhere to confirm content.
 *     Click "Save Prompt"; confirm a status message reports the new
 *     PROMPT-N id, and `ls worlds/<world>/manual-stories/<story>/prompts/`
 *     shows PROMPT-1.md.
 *     Click "Regenerate"; confirm Markdown re-renders identically.
 *     Click "Edit Cast"; confirm navigation back to /moment-composer.
 *
 *   Step 5 (AC #9 manual portion — soft-override save):
 *     Type a moment directive containing the substring "STCHAR-7"
 *     (triggers the engine-jargon soft denylist via the lint sweep
 *     over the assembled body — the directive flows into §4 and the
 *     STCHAR-7 substring is sweep-visible).
 *     Click "Generate Prompt". Confirm the lint badge shows the soft
 *     violation.
 *     Click "Save Prompt". Confirm a confirm() dialog appears asking
 *     "save anyway?". Accept; confirm the save proceeds and
 *     `cat worlds/<world>/manual-stories/<story>/prompt-runs/PROMPT-N.yaml`
 *     shows a populated lint_override field.
 *
 *   Step 6. Cleanup any temp fixture roots if you seeded one.
 */

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { composePrompt } from "../src/prompt/compose.js";
import { ENGINE_JARGON_DENYLIST, INTERNAL_ID_REGEX } from "../src/prompt/lint.js";
import { writePrompt } from "../src/write/prompts.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../src/write/sandbox.js";
import { makeDefaultManualStoryMetadata } from "../src/write/manual-story-metadata.js";
import { fixtureCast } from "./prompt/fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../..");
const REAL_CONTENT_POLICY = path.join(
  REPO_ROOT,
  "docs/prose-renderer-contract/content-policy.md",
);
const REAL_PROSE_CRAFT = path.join(
  REPO_ROOT,
  "docs/manual-story-studio/prose-craft-contract.md",
);

interface Fixture {
  tempRoot: string;
  root: ManualStoryRoot;
}

function mkFixture(): Fixture {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "cap-spec102-"));
  // Copy (never symlink) docs so cleanup cannot follow a symlink and
  // wipe the real docs tree.
  mkdirSync(path.join(tempRoot, "docs"), { recursive: true });
  cpSync(
    path.join(REPO_ROOT, "docs/prose-renderer-contract"),
    path.join(tempRoot, "docs/prose-renderer-contract"),
    { recursive: true },
  );
  cpSync(
    path.join(REPO_ROOT, "docs/manual-story-studio"),
    path.join(tempRoot, "docs/manual-story-studio"),
    { recursive: true },
  );
  const worldSlug = "capstone-world";
  const msSlug = "capstone-story";
  mkdirSync(path.join(tempRoot, "worlds", worldSlug), { recursive: true });
  const root = resolveManualStoryRoot(tempRoot, worldSlug, msSlug);
  mkdirSync(root.absolutePath, { recursive: true });
  safeWriteFile(
    root,
    "manual-story.yaml",
    YAML.stringify(
      makeDefaultManualStoryMetadata(
        worldSlug,
        msSlug,
        "Capstone Story",
        "2026-05-30T00:00:00.000Z",
      ),
    ),
  );
  safeWriteFile(
    root,
    "records/cast/mchar-1.yaml",
    YAML.stringify(
      fixtureCast("mchar-1", "Jon", {
        identity: {
          one_line: "A scribe with a debt he cannot afford",
          public_face: "Polite, efficient",
          private_pressure: "He still hears the bells",
        },
      }),
    ),
  );
  return { tempRoot, root };
}

test("AC #1 — composePrompt is byte-deterministic across 5 invocations", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const input = {
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "Jon listens for the latch.",
      included_cast: ["mchar-1"],
      included_records: [],
    };
    const first = await composePrompt(input);
    for (let i = 0; i < 4; i++) {
      const next = await composePrompt(input);
      assert.equal(
        next.markdown,
        first.markdown,
        `invocation ${i + 2} diverged`,
      );
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #2 — 15 sections in order; §1 byte-equal to disk content-policy", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "Anything.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    const headings = [...result.markdown.matchAll(/^## (\d+)\. /gm)].map((m) =>
      Number(m[1]),
    );
    assert.deepStrictEqual(
      headings,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    );
    const policy = readFileSync(REAL_CONTENT_POLICY, "utf8").trim();
    assert.ok(result.markdown.includes(policy));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #3 — representative hard lint rule fires (empty directive)", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "  ",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    assert.ok(result.lint.blockingForCopy);
    assert.ok(
      result.lint.findings.some((f) => f.rule === "moment_directive_present"),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #5 — writePrompt persists PROMPT-1.md + sidecar; allocator increments", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "Save me.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    const r1 = writePrompt({ root, composeResult: result, now: () => "2026-05-30T12:00:00Z" });
    assert.equal(r1.id, "PROMPT-1");
    assert.ok(
      existsSync(path.join(root.absolutePath, "prompts", "PROMPT-1.md")),
    );
    assert.ok(
      existsSync(
        path.join(root.absolutePath, "prompt-runs", "PROMPT-1.yaml"),
      ),
    );
    const r2 = writePrompt({ root, composeResult: result, now: () => "2026-05-30T12:01:00Z" });
    assert.equal(r2.id, "PROMPT-2");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #6 — prose-craft contract read at compose time (§13 byte-equality + deletion → throw)", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "anything",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    const proseCraft = readFileSync(REAL_PROSE_CRAFT, "utf8").trim();
    assert.ok(result.markdown.includes(proseCraft));

    // Remove the disk file → next compose must throw.
    rmSync(
      path.join(tempRoot, "docs/manual-story-studio/prose-craft-contract.md"),
    );
    await assert.rejects(
      composePrompt({
        manualStoryRoot: root.absolutePath,
        repoRoot: tempRoot,
        moment_directive: "again",
        included_cast: ["mchar-1"],
        included_records: [],
      }),
      /prose_craft_contract_not_found/,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #7 — no internal m[a-z]+-[0-9]+ ids in composed body for clean fixture", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "Jon waits.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    const matches = result.markdown.match(INTERNAL_ID_REGEX);
    assert.equal(
      matches,
      null,
      `internal id leak: ${JSON.stringify(matches)}`,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #8 — no engine-jargon prefix in composed body for clean fixture", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "Jon waits.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    for (const prefix of ENGINE_JARGON_DENYLIST) {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}[0-9]+\\b`);
      assert.ok(
        !re.test(result.markdown),
        `engine jargon "${prefix}<n>" present in clean composed body`,
      );
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("AC #9 — savePrompt with lint_override persists the override into the sidecar", async () => {
  const { tempRoot, root } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot: tempRoot,
      moment_directive: "Jon waits.",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    const saved = writePrompt({
      root,
      composeResult: result,
      now: () => "2026-05-30T12:00:00Z",
      lint_override: {
        findings: [
          {
            rule: "no_engine_jargon",
            tier: "soft",
            message: "fixture override",
            snippet: "STCHAR-7",
          },
        ],
        copied_anyway_at: "2026-05-30T12:00:05Z",
      },
    });
    const sidecarPath = path.join(
      root.absolutePath,
      "prompt-runs",
      `${saved.id}.yaml`,
    );
    const onDisk = YAML.parse(readFileSync(sidecarPath, "utf8")) as {
      lint_override?: { findings: unknown[]; copied_anyway_at: string };
    };
    assert.ok(onDisk.lint_override);
    assert.equal(onDisk.lint_override?.findings?.length, 1);
    assert.equal(onDisk.lint_override?.copied_anyway_at, "2026-05-30T12:00:05Z");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
