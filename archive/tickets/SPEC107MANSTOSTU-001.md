# SPEC107MANSTOSTU-001: Manual Studio prose/state contract correction + doc cleanup

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `docs/manual-story-studio/prose-craft-contract.md`, `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts`, `docs/manual-story-studio/README.md`, `tools/manual-story-studio/test/capstone-spec100.test.ts`, `tools/manual-story-studio/test/prompt-sections.test.ts`, plus two new test files under `tools/manual-story-studio/test/`. No impact on patch-engine, world-mcp, validators, hooks, or world canon.
**Deps**: None

## Problem

At intake, three verified problems existed on Manual Story Studio's external-prompt-contract surface:

1. **The prose-craft contract neuters the external LLM.** `docs/manual-story-studio/prose-craft-contract.md:68` reads *"the prose should not narrate state changes that have not happened in the record store yet ('she finally trusted him' is the author's call to make in a status or clock record after the prose is written, not the LLM's call to assert mid-scene)."* This conflates "the app must not infer machine state from prose" (correct discipline, per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary — prose is non-authoritative) with "the LLM must not narrate state changes" (incorrect prohibition that defeats the cockpit). The cockpit's purpose is to render prose where meaningful things happen — emotional/relational turns, refusals, recognitions, concessions — that the author then encodes manually in records.

2. **The stop rule is too thin.** `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts:4` reads *"Stop at the first materially new response point. The correct ending is the moment where the author has a new thing to decide, not the moment where the entire exchange has resolved."* This is directionally right but vague — "materially new response point" leaves the LLM guessing whether emotional movement counts, whether an interruption counts, whether a refusal mid-exchange counts.

3. **README claimed a file that did not exist.** At intake, `docs/manual-story-studio/README.md:6` said SPEC-102 landed `manual-render-instruction.md` here, but the file never landed (only `README.md` and `prose-craft-contract.md` exist). This ticket resolved the mismatch via the report §21 "fewer docs, not more" path: remove the README claim rather than create the missing file. At intake, `tools/manual-story-studio/test/capstone-spec100.test.ts:238` asserted the README contained `manual-render-instruction.md` (SPEC-100 AC #9); flipping that assertion to `assert.doesNotMatch` preserves the test's regression-guard purpose while reflecting the corrected README state.

Source: critical triage of `reports/manual-story-studio-second-iteration.md` §§14 / 21 / 26 / 31 Stage 3 (ChatGPT-Pro, 2026-06-01), captured in `docs/triage/2026-06-01-manual-story-studio-second-iteration-triage.md` and decomposed in `archive/specs/SPEC-107-manual-story-studio-prose-state-contract-correction.md` (reassessed 2026-06-01).

## Assumption Reassessment (2026-06-01)

1. Verified against the pre-implementation codebase: `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts:4` was the sole stop-rule emission site (`grep -rn "Stop at the first materially new" tools/ docs/` returned one match in this production file plus a paraphrase cross-reference at `docs/manual-story-studio/prose-craft-contract.md:54` which uses the phrase as in-prose paraphrase within §"2–5 Beat Cluster Framing", not duplicate emission — the paraphrase's expanded enumeration ("a decision pressure, an emotional turn, a changed tactic, a refusal, a reveal-withheld, a newly exposed vulnerability") is semantically compatible with the new stop rule's expanded structural conditions). `tools/manual-story-studio/test/capstone-spec100.test.ts:238` asserted `assert.match(docsReadme, /manual-render-instruction\.md/);` and passed against the intake README — the assertion was flipped to `assert.doesNotMatch` as part of this ticket. `tools/manual-story-studio/src/state-update-checklist.ts:24` `CHECKLIST_DISCLAIMER` reads *"Review these categories manually. Manual Story Studio has not changed any records."* — already aligned with the corrected boundary; intentionally out of scope per the spec's §8 deferred sub-claim note.

2. Verified against current specs/docs: `archive/specs/SPEC-107-manual-story-studio-prose-state-contract-correction.md` was reassessed 2026-06-01 with I1 (capstone-spec100 fix), M1 (test path swap to `test/prompt/`), and M2/Q1 (defer checklist-language sub-claim with §8 rationale) all applied via the reassess-spec recommended-disposition path. `specs/IMPLEMENTATION-ORDER.md:19,25` recorded SPEC-107 as independent (no inbound dependencies; can land alongside the SPEC-105 chain) before this ticket archived the spec. `archive/specs/SPEC-102-prompt-composer-and-renderer-contract.md:8` is the source of the README's original two-file claim — SPEC-102's actual landing inlined render-instruction content into §5 / §14 / §15 fixed strings rather than creating `manual-render-instruction.md`. `archive/specs/SPEC-100-manual-story-studio-package-boundary.md:29` is the source of the capstone-spec100 AC #9 test (the SPEC-100 capstone locks the README's distinction between verbatim and Manual Studio-specific renderer files).

3. Cross-skill / cross-artifact boundary under audit: `docs/manual-story-studio/prose-craft-contract.md` is inlined verbatim into §13 of the external prompt via the byte-for-byte test at `tools/manual-story-studio/test/prompt-sections.test.ts:136` (*"§13 body equals prose-craft-contract.md byte-for-byte"*). The new paragraph wording flows through automatically — no `prompt-sections.test.ts` change required. The composer reads `prose-craft-contract.md` fresh on every composition (per `tools/manual-story-studio/src/prompt/compose.ts:38,210-241`); the deletion-throws behavior is locked by `archive/specs/SPEC-102`-era capstone test `tools/manual-story-studio/test/capstone-spec102.test.ts:246-271`.

4. FOUNDATIONS principle restated before trusting the spec narrative: **§Story Bundles §4a Plan-Authority Boundary** (*"Story state is authoritative at PG record commit. Rendered prose is a rendering of that committed state, not a second state engine."*). The corrected contract preserves this principle (the app does not infer state from prose; the author updates records by hand) while removing the over-correction that forbade the LLM from rendering meaningful turns. Manual Story Studio's parallel discipline: prose is manuscript evidence, records are authority; the LLM may render the turn, but the app does not promote the rendered turn into state without explicit author action. The stop-rule sharpening also aligns with **§Story Bundles §9 Prose Length Discipline** (concrete structural stop conditions — decision point, response point, interruption, irreversible beat, changed immediate pressure — rather than length quotas) and with **§Tooling Recommendation (least-agency LLM packets)** (the "do not declare durable machine-state conclusions" clause keeps the LLM out of authoring durable state).

5. (Was template item 7) `manual-render-instruction.md` README-claim removal blast radius: `grep -rn "manual-render-instruction" tools/ docs/ specs/ archive/specs/` at reassessment 2026-06-01 surfaced consumers in (a) `docs/manual-story-studio/README.md:6` (target of §3 of this ticket), (b) `tools/manual-story-studio/test/capstone-spec100.test.ts:238` (covered by §4 of this ticket — assertion flip from `assert.match` to `assert.doesNotMatch`), (c) the SPEC-107 spec file itself (informational; the spec describes the removal), (d) `docs/triage/2026-06-01-manual-story-studio-second-iteration-triage.md` (triage record; intentionally retained as historical attribution per Rule 6 No Silent Retcons), (e) `archive/specs/SPEC-100-...md:29` + `archive/specs/SPEC-102-...md:8` (archived specs; retained for historical attribution — the originally-planned scaffold and the deviation from it). No production code path reads `manual-render-instruction.md` from disk at runtime — `grep -rn "manual-render-instruction" tools/manual-story-studio/src/ tools/manual-story-studio/web/src/` returned zero matches at reassessment.

## Architecture Check

1. **Smallest possible textual surfaces.** The contract bug lives in three textual places (one paragraph in `prose-craft-contract.md`, one return string in `section-14-stop-rule.ts`, one bullet in `README.md`) plus one downstream test (`capstone-spec100.test.ts:238`). The fix is in those same four places. No new abstraction, no new doc file, no schema change, no validator change, no engine surface modified, no prompt-section helper added or removed (the existing 15 sections in `tools/manual-story-studio/src/prompt/sections/` stay).

2. **No backwards-compatibility shims.** The old prose-craft paragraph and stop-rule string are removed outright, not preserved as deprecated paths. The corrected README has no soft-deprecation of the `manual-render-instruction.md` reference — it simply no longer claims the file. The flipped capstone-spec100 assertion replaces the old assertion outright; no parallel "supports both" assertion is introduced.

3. **Regression guard via tested literal substring, not whole-string equality.** The new section-14 test asserts presence of the key sentence (*"Let meaningful action..."*) rather than byte-exact match — this keeps the rule editable without churn while still catching accidental reversion. The docs-consistency test asserts absence of `manual-render-instruction.md` rather than presence of specific replacement copy — same rationale: future README copy can evolve without test churn.

## Verification Layers

1. **Prose-craft contract paragraph corrected** → codebase grep-proof (post-edit `grep -n "should not narrate state changes" docs/manual-story-studio/prose-craft-contract.md` returns 0; `grep -n "Prose may render decisive emotional" docs/manual-story-studio/prose-craft-contract.md` returns 1).
2. **Stop-rule string corrected** → backend test (`tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts` asserts the new key sentence + the durable-machine-state caveat are present in `emitSection14()`'s return value).
3. **README claim corrected** → backend test (`tools/manual-story-studio/test/docs-consistency.test.ts` asserts `docs/manual-story-studio/README.md` does not contain `manual-render-instruction.md`).
4. **Capstone-spec100 test flipped without breaking other assertions** → backend test re-run (`cd tools/manual-story-studio && npm run test:backend` passes; capstone-spec100 AC #9 now asserts `assert.doesNotMatch` against `/manual-render-instruction\.md/` while the parallel `assert.match` against `/prose-craft-contract\.md/` continues to pass).
5. **Composed prompt §13 automatically reflects corrected paragraph** → existing byte-equality test (`tools/manual-story-studio/test/prompt-sections.test.ts:136` passes; the composer reads `prose-craft-contract.md` fresh per `compose.ts:210-241`).
6. **FOUNDATIONS §Story Bundles §4a alignment** → manual review of the corrected paragraph's wording (*"Manual Story Studio will not infer or apply state changes from the prose"*) — preserves the non-authority-of-prose discipline while removing the meaningful-turn prohibition.
7. **SPEC-100 package-boundary fence preserved** → existing capstone-spec100 invariant test (`tools/manual-story-studio/test/capstone-spec100.test.ts:241+` continues to assert `package.json` excludes `@worldloom/patch-engine`, `@worldloom/world-mcp`, `better-sqlite3`).

## Landed Changes

### 1. Revise `docs/manual-story-studio/prose-craft-contract.md` §"Prose as Manuscript, Not State"

Replace the second paragraph (currently line 68) with the report §14 adapted wording:

```
Prose may render decisive emotional, relational, practical, or informational turns when the directive and beat cluster call for them. Do not summarize or label a durable after-state as settled unless the directive explicitly asks for that. Render the observable experience of the turn. Manual Story Studio will not infer or apply state changes from the prose; after saving, the author reviews which records should be created or edited.
```

The first paragraph (lines 64-66) is correct and unchanged: *"The LLM writes prose. The author updates Manual Studio records by hand after pasting the prose into the manuscript. The prose does not 'change state' — the author's record edits do. This frees the rendered prose from any obligation to be self-consistent with a state-update step; the prose is a manuscript artifact, and any inconsistencies with later record updates are reconciled by the author's review, not by the LLM."*

The §"2–5 Beat Cluster Framing" paragraph at line 54 (which paraphrases the stop rule with the phrase *"Stop at the first materially new response point per §14"*) is unchanged — the paraphrase remains semantically compatible with the new stop rule's expanded conditions and is not in scope for this ticket.

### 2. Revise `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts`

Replace the `emitSection14()` return value with the sharpened stop rule from the report §26. The full file body becomes:

```typescript
export const SECTION_14_TITLE = "Stop Rule";

export function emitSection14(): string {
  return "Write only the beat cluster requested. Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it. Stop when the segment reaches the first new decision point, response point, interruption, irreversible beat, or changed immediate pressure that would require the author to choose what happens next. Do not summarize downstream aftermath. Do not continue into the next exchange merely to resolve tension. Do not declare durable machine-state conclusions unless the directive explicitly asks for that wording.";
}
```

`SECTION_14_TITLE` stays `"Stop Rule"` (consumed by `tools/manual-story-studio/src/prompt/sections/index.ts:46`).

### 3. Edit `docs/manual-story-studio/README.md`

- **Line 3**: Soften from *"SPEC-102 lands two files here"* to *"Manual Story Studio's renderer-contract surface lives here"* (drop SPEC-102 attribution; reflect current state rather than originally-planned scaffold).
- **Line 6**: Delete the entire `manual-render-instruction.md` bullet.
- **Line 8**: Update to reflect that the renderer-contract surface is `prose-craft-contract.md` alone; the stop rule and prompt structure are carried by the prompt section helpers under `tools/manual-story-studio/src/prompt/sections/`, not by a separate render-time-instruction doc.

Do NOT delete `prose-craft-contract.md`. Do NOT create `manual-render-instruction.md`.

Suggested resulting README text (operator may refine wording while preserving intent):

```
# docs/manual-story-studio/

**Purpose**: this directory houses Manual Studio-specific renderer-contract files. Manual Story Studio's renderer-contract surface lives here:

- `prose-craft-contract.md` — Manual Studio-specific prose craft contract (variant of `docs/prose-renderer-contract/prose-craft-contract.md`, with scene/page-specific references and diagnostic verdict language removed for Manual Studio's segment-cluster context).

Only `docs/prose-renderer-contract/content-policy.md` is reused **verbatim** (inlined byte-for-byte into Manual Studio's external prompts per archived SPEC-102 §11). The renderer-contract surface is `prose-craft-contract.md` alone; the stop rule and prompt structure are carried by the prompt section helpers under `tools/manual-story-studio/src/prompt/sections/`, not by a separate render-time-instruction doc.
```

### 4. Update `tools/manual-story-studio/test/capstone-spec100.test.ts` AC #9 assertion

Line 238 currently reads:

```typescript
assert.match(docsReadme, /manual-render-instruction\.md/);
```

Replace with:

```typescript
assert.doesNotMatch(docsReadme, /manual-render-instruction\.md/);
```

The line 237 `prose-craft-contract\.md` assertion (positive match) stays unchanged — the file still exists and is still referenced in the README. The surrounding test name on line 230 and assertions on lines 220-227 / 235-236 / 241+ are unchanged. This preserves the SPEC-100 AC #9 test's purpose — distinguishing verbatim vs Manual Studio-specific renderer files — while updating it for the SPEC-107 "fewer docs, not more" outcome. Per FOUNDATIONS Rule 6 No Silent Retcons: the README's authored intent shifted (from "two Manual Studio variants lands" to "one variant lands; the other never landed and was resolved via the fewer-docs path"); the regression guard now locks the new intent rather than the original-but-never-realized intent.

### 5. Create `tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts`

Place under the existing `test/prompt/` subdir (which already houses `section-6-template-guidance.test.ts` and `beat-template-lint.test.ts`). Use `node:test` (the package's test runner) and `node:assert/strict`. Assertions cover (a) the new key meaningful-action sentence is present, (b) the durable-machine-state caveat is present, (c) `SECTION_14_TITLE` is unchanged. Suggested body:

```typescript
import assert from "node:assert/strict";
import test from "node:test";

import {
  emitSection14,
  SECTION_14_TITLE,
} from "../../src/prompt/sections/section-14-stop-rule.js";

test("emitSection14 contains the key meaningful-action sentence (SPEC-107 regression guard)", () => {
  const text = emitSection14();
  assert.ok(
    text.includes(
      "Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it.",
    ),
    "stop rule must permit meaningful turns explicitly per SPEC-107",
  );
});

test("emitSection14 contains the durable-machine-state caveat (SPEC-107 regression guard)", () => {
  const text = emitSection14();
  assert.ok(
    text.includes(
      "Do not declare durable machine-state conclusions unless the directive explicitly asks for that wording.",
    ),
    "stop rule must caveat durable machine-state declarations per SPEC-107",
  );
});

test("SECTION_14_TITLE remains 'Stop Rule'", () => {
  assert.strictEqual(SECTION_14_TITLE, "Stop Rule");
});
```

Relative import path from `dist/test/prompt/section-14-stop-rule.test.js` to `dist/src/prompt/sections/section-14-stop-rule.js` is `../../src/prompt/sections/section-14-stop-rule.js` — same shape as `test/prompt/section-6-template-guidance.test.ts:16-23` uses.

### 6. Create `tools/manual-story-studio/test/docs-consistency.test.ts`

Place at the `test/` root (no docs-related subdir exists; flat placement matches `prompt-compose.test.ts` / `prompt-lint.test.ts` cross-cutting concerns). Use `node:test` and `node:assert/strict`. Suggested body:

```typescript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// dist/test/docs-consistency.test.js -> repo root is four levels up
const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..");

test("docs/manual-story-studio/README.md does not reference manual-render-instruction.md (SPEC-107 regression guard)", () => {
  const readme = readFileSync(
    path.join(REPO_ROOT, "docs/manual-story-studio/README.md"),
    "utf8",
  );
  assert.ok(
    !readme.includes("manual-render-instruction.md"),
    "README must not re-introduce the missing-file claim without also landing the file (SPEC-107 fewer-docs path)",
  );
});
```

The `REPO_ROOT` resolution mirrors `tools/manual-story-studio/test/capstone-spec100.test.ts:66` — four `..` segments from `dist/test/<file>.test.js` to the repo root.

## Files to Touch

- `docs/manual-story-studio/prose-craft-contract.md` (modify)
- `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` (modify)
- `docs/manual-story-studio/README.md` (modify)
- `tools/manual-story-studio/test/capstone-spec100.test.ts` (modify)
- `tools/manual-story-studio/test/prompt-sections.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts` (new)
- `tools/manual-story-studio/test/docs-consistency.test.ts` (new)

## Out of Scope

- Modification of `docs/prose-renderer-contract/render-time-instruction.md` (branching-pipeline sibling — forbidden by Manual Studio's "sibling, not fork" stance).
- Modification of `docs/prose-renderer-contract/prose-craft-contract.md` (branching-pipeline sibling — same reason).
- Modification of `docs/prose-renderer-contract/content-policy.md` (inlined-verbatim source-of-truth file).
- Adding or removing prompt sections — the existing 15 sections in `tools/manual-story-studio/src/prompt/sections/` stay.
- Restructuring the prompt to the 11-section shape report §13 proposes (deferred indefinitely per spec §2 Out of scope).
- Promoting any lint rule tier (SPEC-106 territory — completed and archived).
- Creating a new `prompt-contract.md` doc that report §21 mentions as optional (deferred per spec §2 Out of scope).
- Editing `tools/manual-story-studio/src/state-update-checklist.ts` `CHECKLIST_DISCLAIMER` — current wording already aligns with the corrected boundary; report §31 Stage 3 "checklist language" sub-claim deferred per spec §8.
- Creating `docs/manual-story-studio/manual-render-instruction.md` — explicitly NOT created; this ticket removes the README claim instead.
- Editing the §"2–5 Beat Cluster Framing" paraphrase at `prose-craft-contract.md:54` — semantically compatible with the new stop rule; not in scope.
- Modifying `tools/manual-story-studio/src/prompt/compose.ts` or `tools/manual-story-studio/src/prompt/sections/index.ts` — the section-14 helper interface (`emitSection14()` + `SECTION_14_TITLE`) is preserved.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — all backend tests pass, including the two new tests (`test/prompt/section-14-stop-rule.test.ts` + `test/docs-consistency.test.ts`) and the updated `test/capstone-spec100.test.ts`.
2. `cd tools/manual-story-studio && npm test` — full test suite (backend + web) passes; `tsc --noEmit` step for `web/` remains green.
3. `grep -n "should not narrate state changes" docs/manual-story-studio/prose-craft-contract.md` — returns no matches.
4. `grep -n "Prose may render decisive emotional" docs/manual-story-studio/prose-craft-contract.md` — returns exactly one match.
5. `grep -n "manual-render-instruction" docs/manual-story-studio/README.md` — returns no matches.
6. `find docs/manual-story-studio -name manual-render-instruction.md` — returns no hits (no file was created).
7. `grep -n "Let meaningful action" tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` — returns exactly one match.
8. `grep -n "Stop at the first materially new" tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` — returns no matches (old wording removed from production helper).

### Invariants

1. **Composed prompt §13 reflects the corrected paragraph automatically.** The byte-equality test in `tools/manual-story-studio/test/prompt-sections.test.ts` continues to pass — the composer reads `prose-craft-contract.md` fresh on every composition (per `compose.ts:38,210-241`); the new paragraph wording flows through via the existing §13 inclusion seam.
2. **No prompt-section helper other than `section-14-stop-rule.ts` emits stop-rule text.** `grep -rn "Stop when\|Stop at" tools/manual-story-studio/src/prompt/sections/` continues to return matches only in `section-14-stop-rule.ts`.
3. **SPEC-100 package-boundary fence is preserved.** `tools/manual-story-studio/package.json` continues to exclude `@worldloom/patch-engine`, `@worldloom/world-mcp`, and `better-sqlite3` (the SPEC-100 capstone test AC invariant at `capstone-spec100.test.ts:241+` remains intact).
4. **FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary is preserved.** The corrected prose-craft paragraph maintains *"Manual Story Studio will not infer or apply state changes from the prose"* — prose remains non-authoritative; author still updates records by hand.
5. **The capstone-spec100 AC #9 test's regression-guard purpose is preserved.** The flipped assertion continues to distinguish verbatim (`content-policy.md`) from Manual Studio-specific (`prose-craft-contract.md`) renderer files; only the `manual-render-instruction.md` claim — which never landed — is rotated from a presence-assertion to an absence-assertion.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/section-14-stop-rule.test.ts` (new) — regression guard asserting the new key sentence + the durable-machine-state caveat are present in `emitSection14()` and `SECTION_14_TITLE` remains `"Stop Rule"`. Placed under existing `test/prompt/` subdir to match convention.
2. `tools/manual-story-studio/test/docs-consistency.test.ts` (new) — regression guard asserting `README.md` does not reference `manual-render-instruction.md`; prevents future contributor from re-introducing the claim without also landing the file.
3. `tools/manual-story-studio/test/capstone-spec100.test.ts` (modified) — flips AC #9 from `assert.match` to `assert.doesNotMatch`; updates the SPEC-100 capstone regression guard for the corrected README state.
4. `tools/manual-story-studio/test/prompt-sections.test.ts` (modified) — asserts assembled `## 14. Stop Rule` includes the SPEC-107 meaningful-turn sentence and durable-machine-state caveat.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend` — targeted backend test run (compiles TypeScript, then runs `node --test "dist/test/**/*.test.js"`); covers the test changes above plus the `test/prompt-sections.test.ts` byte-equality test that automatically validates the prose-craft paragraph edit.
2. `cd tools/manual-story-studio && npm test` — full-pipeline verification (backend + web).
3. `grep -rn "manual-render-instruction" tools/manual-story-studio/src/ tools/manual-story-studio/web/src/` — must return zero matches; confirms no code path reads the missing file at runtime.
4. `grep -rn "should not narrate state changes\|Stop at the first materially new response" tools/ docs/` — must return only the `prose-craft-contract.md:54` cross-reference paraphrase line (which is intentionally retained). The production `section-14-stop-rule.ts:4` and `prose-craft-contract.md:68` no longer carry the old wording.

## Outcome

Completed on 2026-06-01.

Manual Story Studio's prose/state prompt contract now permits meaningful emotional, relational, practical, and informational turns while keeping record authority with the author. The stop-rule helper now names concrete stopping conditions and the durable-machine-state caveat. The Manual Studio README no longer claims a missing `manual-render-instruction.md` file, and the SPEC-100 capstone assertion now guards that absence instead of requiring the stale claim.

Regression coverage landed in two new tests plus two modified tests: direct `emitSection14()` coverage, docs-consistency coverage for the README, the flipped capstone assertion, and assembled §14 prompt-section coverage.

## Verification Result

Passed:

1. Pre-edit baseline: `cd tools/manual-story-studio && npm run test:backend` — 61 tests passed.
2. `cd tools/manual-story-studio && npm run test:backend` — 63 tests passed after the SPEC-107 edits.
3. `cd tools/manual-story-studio && npm test` — 391 backend tests passed, followed by the web `tsc --noEmit` step.
4. `grep -n "should not narrate state changes" docs/manual-story-studio/prose-craft-contract.md` — no matches, as expected.
5. `grep -n "Prose may render decisive emotional" docs/manual-story-studio/prose-craft-contract.md` — one match at line 68.
6. `grep -n "manual-render-instruction" docs/manual-story-studio/README.md` — no matches, as expected.
7. `find docs/manual-story-studio -name manual-render-instruction.md` — no hits.
8. `grep -n "Let meaningful action" tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` — one match at line 4.
9. `grep -n "Stop at the first materially new" tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` — no matches, as expected.
10. `grep -rn "manual-render-instruction" tools/manual-story-studio/src/ tools/manual-story-studio/web/src/` — no matches, confirming no runtime code path reads the missing file.
11. `grep -rn "should not narrate state changes\|Stop at the first materially new response" tools/ docs/` — remaining hits are the intentionally retained `docs/manual-story-studio/prose-craft-contract.md:54` paraphrase plus historical triage notes in `docs/triage/2026-06-01-manual-story-studio-second-iteration-triage.md`.

## Deviations

- Added `tools/manual-story-studio/test/prompt-sections.test.ts` coverage for assembled §14. The spec requested composed-prompt section coverage; the existing section assembly test was the precise package-local proof surface.
- The broad stale-anchor grep returned historical triage notes in addition to the intended prose-craft §54 paraphrase. Those notes are retained as historical evidence, not current operational contract text.
