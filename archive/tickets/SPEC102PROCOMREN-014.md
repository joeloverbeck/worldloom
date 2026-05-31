# SPEC102PROCOMREN-014: Capstone test — SPEC-102 §7 acceptance criteria #1-#10

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/test/capstone-spec102.test.ts`. No production code changes; verifies the SPEC-102 §7 acceptance criteria end-to-end against the assembled prompt-composer pipeline.
**Deps**: 013

## Problem

SPEC-102 §7 names 10 acceptance criteria that span the entire prompt-composer surface — pipeline determinism (#1), 15-section structure with verbatim content-policy (#2), per-rule lint fixtures (#3), UI flow (#4), write + sidecar persistence (#5), prose-craft contract read at compose time (#6), no internal record IDs in body (#7), no engine jargon in body (#8), override flow logged into sidecar (#9), `npm test` passes (#10). A capstone test verifies the automated portions and documents the manual dry-run portions; without it the spec has no end-to-end signal that the 13 prior tickets compose into a working whole.

## Assumption Reassessment (2026-05-30)

1. Verified the existing capstone-test convention at `tools/manual-story-studio/test/capstone-spec100.test.ts` and `tools/manual-story-studio/test/capstone-spec101.test.ts`. SPEC-101's capstone uses the hybrid pattern: a manual dry-run runbook in the file header comment (covering frontend visual checks that require Vite + browser) plus automated assertions for the test-suite-runnable portion. The same hybrid pattern fits SPEC-102 because AC #4 (UI flow), AC #5 (file landing), and AC #9 (override flow) are partly UI-driven.
2. SPEC-102 §7 enumerates the 10 criteria; this ticket's acceptance is that the capstone test asserts each automatable AC and documents each manual AC. Specifically: #1, #2, #3, #6, #7, #8, #10 are fully automatable (compose, lint, fixture checks); #4 is partly automatable (route registration + API contract) and partly manual (button interactions); #5 is fully automatable (writePrompt persists files); #9 is fully automatable (save with `lint_override` persists the field).
3. Cross-artifact shared boundary: the capstone composes EVERY upstream surface from this batch — `composePrompt` (007), `lintPrompt` (008), `writePrompt` (009), HTTP routes (010), and (via runbook) the three frontend pages. The fixture-world strategy mirrors the SPEC-101 capstone's `mkdtempSync` pattern so real `worlds/` is never mutated.
4. FOUNDATIONS principle restated: §Tooling Recommendation — "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." The capstone's manual review confirms that the emitted fixture prompt covers the Manual-Studio-equivalent surfaces (story contract + cast voice + active records + reveal-permission language) — the externalized realization of this packet across the process boundary.

## Architecture Check

1. The hybrid runbook-plus-automated capstone is the established convention; it ships in one file with the manual steps in a header comment and the automated assertions in the test body. This makes both halves discoverable from one path and prevents the runbook from drifting away from the automated portion.
2. Re-enumerated expected counts (e.g., 15 sections, exact engine-jargon denylist size) computed from the fixture at test start rather than hardcoded — keeps the capstone valid as the spec evolves.
3. No backwards-compatibility aliasing — capstone is greenfield.

## Verification Layers

1. AC #1 (byte-deterministic) — schema validation (compose 5 times, assert byte-equal).
2. AC #2 (15 sections + verbatim content-policy) — schema validation (regex over headings + byte-equality of §1 vs disk).
3. AC #3 (lint rules fire on synthetic fixtures) — covered fully by `prompt-lint.test.ts` from ticket 008; the capstone re-runs a representative subset.
4. AC #4 (UI flow) — manual dry-run runbook (capstone documents the manual steps).
5. AC #5 (write + sidecar) — schema validation (writePrompt result + on-disk files).
6. AC #6 (prose-craft read at compose time) — schema validation (§13 body equals disk byte-for-byte; deletion of disk file → compose fails).
7. AC #7 (no internal IDs in body) — schema validation (regex `m[a-z]+-[0-9]+` over emitted body returns no matches for the clean fixture).
8. AC #8 (no engine jargon) — schema validation (closed denylist sweep).
9. AC #9 (override logged) — schema validation (savePrompt with `lint_override` → sidecar carries the field).
10. AC #10 (`npm test` passes) — schema validation (the capstone IS part of `npm test`; passing the capstone satisfies AC #10).

## What to Change

### 1. Create `tools/manual-story-studio/test/capstone-spec102.test.ts`

Header comment runbook covers manual AC #4 (UI flow), and any manual portions of AC #5 / #9 that require browser interaction. Automated body covers AC #1, #2, #3, #5 (file-landing portion), #6, #7, #8, #9 (sidecar-persistence portion).

Structure (sketch):

```ts
/**
 * Manual Studio capstone: SPEC-102 acceptance criteria #1-#10.
 *
 * Automated assertions (run via `cd tools/manual-story-studio && npm test`):
 *   - AC #1: composePrompt determinism (5 invocations, byte-equal).
 *   - AC #2: 15-section structure + verbatim content-policy.
 *   - AC #3: representative lint rules fire on synthetic fixtures (full coverage in prompt-lint.test.ts).
 *   - AC #5: writePrompt persists prompts/PROMPT-N.md + prompt-runs/PROMPT-N.yaml; ID allocator increments.
 *   - AC #6: prose-craft contract read at compose time (§13 byte-equality).
 *   - AC #7: no `m[a-z]+-[0-9]+` substring in composed body for clean fixture.
 *   - AC #8: no engine-jargon denylist term in composed body for clean fixture.
 *   - AC #9: savePrompt with lint_override persists the override into the sidecar.
 *   - AC #10: this test is part of `npm test`.
 *
 * Manual dry-run runbook (AC #4 — frontend UI flow):
 *
 *   Prerequisite: this test file passes via `cd tools/manual-story-studio && npm test`.
 *
 *   Step 1. Seed a temp world with a manual story containing fixture records:
 *     cd tools/manual-story-studio && npm test  (the test below seeds; capture the fixture root from the test logs)
 *
 *   Step 2. Build everything:
 *     cd tools/manual-story-studio && npm run build
 *
 *   Step 3. Boot backend + Vite dev server:
 *     node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root <fixture-root>
 *     cd tools/manual-story-studio/web && npm run dev
 *
 *   Step 4 (AC #4 — Moment Composer + Prompt Preview flow):
 *     Open http://127.0.0.1:5176/worlds/<world>/manual-stories/<story>/moment-composer.
 *     Confirm: textarea, cast multi-select pre-checked from cast_order, suggested + pinned records pickers.
 *     Type a moment directive. Click "Generate Prompt".
 *     Confirm navigation to /prompts/preview with the composed Markdown visible and lint badge showing "Clean external prompt (15 sections)".
 *     Click "Copy to clipboard" — paste elsewhere to confirm content.
 *     Click "Save Prompt" — confirm a toast / message indicates the new PROMPT-N id, and `ls worlds/<world>/manual-stories/<story>/prompts/` shows PROMPT-1.md.
 *     Click "Regenerate" — confirm the Markdown re-renders identically.
 *     Click "Edit Cast" — confirm navigation back to /moment-composer.
 *
 *   Step 5 (AC #9 manual portion — soft-override path):
 *     Type a moment directive containing the substring "STCHAR" (which triggers the engine-jargon soft denylist).
 *     Click "Generate Prompt".
 *     Confirm the lint badge shows the soft violation.
 *     Click "Save Prompt" — confirm a confirm() dialog appears asking "save anyway?".
 *     Accept — confirm the save proceeds and `cat worlds/<world>/manual-stories/<story>/prompt-runs/PROMPT-N.yaml` shows lint_override field populated.
 *
 *   Step 6. Cleanup:
 *     rm -rf <fixture-root>
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import { composePrompt } from "../src/prompt/compose.js";
import { writePrompt } from "../src/write/prompts.js";
import { resolveManualStoryRoot } from "../src/write/sandbox.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function mkFixture(): { repoRoot: string; manualStoryRoot: ReturnType<typeof resolveManualStoryRoot> } {
  const tempRepo = mkdtempSync(path.join(os.tmpdir(), "manual-studio-cap102-"));
  // Copy or symlink docs/ + relevant config so compose can read content-policy and prose-craft-contract.
  // Seed a manual story with cast + records sufficient for a clean fixture.
  // ...
}

test("AC #1 — composePrompt is byte-deterministic", async () => {
  const { manualStoryRoot } = mkFixture();
  const input = { /* fixture */ };
  const r1 = await composePrompt(input);
  for (let i = 0; i < 4; i++) {
    const ri = await composePrompt(input);
    assert.strictEqual(ri.markdown, r1.markdown, `invocation ${i + 2} diverged`);
  }
});

test("AC #2 — 15 sections in order + §1 verbatim content-policy", async () => {
  const { manualStoryRoot } = mkFixture();
  const result = await composePrompt({ /* fixture */ });
  const headings = [...result.markdown.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1]));
  assert.deepStrictEqual(headings, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const contentPolicy = readFileSync(path.join(REPO_ROOT, "docs/prose-renderer-contract/content-policy.md"), "utf8");
  assert.ok(result.markdown.includes(contentPolicy.trim()));
});

// Remaining AC tests follow the same pattern; see header runbook for the manual portions.
```

### 2. README / docs update

None — the capstone is self-documenting via its header comment. SPEC-102's archival (post-spec-landing) will move the spec to `archive/specs/`; that move is a separate process step not covered by this ticket.

## Files to Touch

- `tools/manual-story-studio/test/capstone-spec102.test.ts` (new)

## Out of Scope

- Archiving SPEC-102 — separate archival step per `docs/archival-workflow.md`.
- Adding a SPEC-102 row to `specs/IMPLEMENTATION-ORDER.md` Progress — the spec is currently `PROPOSED`; status flip happens post-landing.
- Coverage of SPEC-103 (segment paste flow) — out of scope per SPEC-102 §Out of scope; the capstone's `recent_segment_last_paragraph: null` path is the only segment-flow check here.
- Coverage of SPEC-104 (beat-template selection) — out of scope per SPEC-102 §Out of scope; the capstone's `included_template_path: undefined` path is the only template-flow check here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — the capstone is included in the test suite and asserts each automatable AC.
2. The capstone header comment runbook documents AC #4 (UI flow) and AC #9 (soft-override manual path) with explicit copy-paste-runnable steps.
3. Each automated assertion is labeled with its AC number in the test name (`AC #1 — ...`, `AC #2 — ...`, etc.) so the audit trail is clear.

### Invariants

1. The capstone never mutates the real `worlds/` tree — fixture-world copy strategy via `mkdtempSync`.
2. Expected counts (15 sections, denylist sizes) are re-enumerated from the fixture at test start, not hardcoded.
3. The runbook portion explicitly enumerates each manual AC's verification step; the test file is the single source of truth for both halves.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/capstone-spec102.test.ts` — end-to-end automated verification + manual dry-run runbook for SPEC-102 §7 AC #1-#10.

### Commands

1. `cd tools/manual-story-studio && npm test` — runs the capstone alongside all upstream tests.
2. `cd tools/manual-story-studio && npm run build` — confirms the whole package builds before the capstone runs.
