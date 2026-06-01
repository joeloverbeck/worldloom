# SPEC-107 — Manual Story Studio: Prose/State Contract Correction + Doc Cleanup

**Status:** PROPOSED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (affects only Manual Studio's external-prompt contract docs and one stop-rule section helper; no canon-pipeline integration).
**Depends on:** — (independent; can land in parallel with SPEC-106).
**Blocks:** — (no downstream spec depends on the contract correction).
**Related:** `docs/manual-story-studio/prose-craft-contract.md`, `docs/manual-story-studio/README.md`, `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts`, archived `archive/specs/SPEC-102-prompt-composer-and-renderer-contract.md`.
**Source:** critical triage of `reports/manual-story-studio-second-iteration.md` §§14 / 21 / 26 / 31 Stage 3 (ChatGPT-Pro, 2026-06-01). Accepted: the prose/state boundary is currently overcorrected (the contract tells the LLM not to render meaningful turns at all); the stop rule needs sharper wording; the missing `manual-render-instruction.md` is resolved by the report's "fewer docs, not more" path (remove the README claim).

---

## 1. Context & Motivation

Three verified problems on the prompt-contract surface:

**Problem 1 — the prose-craft contract neuters the external LLM.** The final paragraph of `docs/manual-story-studio/prose-craft-contract.md` (line 68) reads:

> Consequently, the prose should not narrate state changes that have not happened in the record store yet ("she finally trusted him" is the author's call to make in a status or clock record after the prose is written, not the LLM's call to assert mid-scene). Render the moment; let the author record the after-state.

This conflates two distinct concerns: (a) "the app must not infer machine state from prose" (correct discipline) and (b) "the LLM must not narrate state changes" (incorrect prohibition). The cockpit's purpose is to produce prose where meaningful things happen. Telling the LLM *not* to narrate the meaningful change defeats the cockpit. Per the report §14: the correct boundary is — the LLM may write prose where something meaningfully happens; the app simply does not infer state from that prose.

The current wording also blocks the most useful prose surface the cockpit produces: emotional/relational *turns* that the author then encodes manually (trust, refusal, concession, withdrawal, recognition). The "she finally trusted him" example the contract uses as a *don't* is precisely the kind of turn the cockpit exists to support.

**Problem 2 — the stop rule is too thin.** Verified at `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts:4`:

> Stop at the first materially new response point. The correct ending is the moment where the author has a new thing to decide, not the moment where the entire exchange has resolved.

This is directionally right but vague. "Materially new response point" leaves the LLM guessing whether emotional movement counts, whether an interruption counts, whether a refusal mid-exchange counts. The report §26 proposes a sharper formulation that names the concrete stop conditions and the anti-pattern explicitly.

**Problem 3 — the README claims a file that does not exist.** `docs/manual-story-studio/README.md:6` says SPEC-102 lands `manual-render-instruction.md`. Verified via `find docs/manual-story-studio -type f`: the file is not present; only `README.md` and `prose-craft-contract.md` exist. SPEC-102 (archived) does mention the file, but the file never landed. Two legitimate fix paths:

- **(a)** Add the file with content extracted from SPEC-102's intent.
- **(b)** Remove the README claim and let `prose-craft-contract.md` carry the prose-renderer surface alone.

The report §21 recommends (b) under the principle "fewer docs, not more" — the render-time instruction surface is already covered indirectly by the stop rule (now sharpened by Problem 2) and the prompt sections. Adding a third doc would fragment the contract across more files than the cockpit needs.

This spec is small (three textual surfaces) but load-bearing for the external prompt's quality. It is independent of the other six specs and lands cleanly in parallel.

## 2. Scope

### In scope

1. **Revise `docs/manual-story-studio/prose-craft-contract.md` §"Prose as Manuscript, Not State".** Replace the second paragraph (currently lines 67-68) with the report §14 wording (adapted for in-file context):

   > Prose may render decisive emotional, relational, practical, or informational turns when the directive and beat cluster call for them. Do not summarize or label a durable after-state as settled unless the directive explicitly asks for that. Render the observable experience of the turn. Manual Story Studio will not infer or apply state changes from the prose; after saving, the author reviews which records should be created or edited.

   The first paragraph (lines 64-66) is correct and unchanged: prose is manuscript, not state; the author updates records by hand. The change is to the second paragraph only.

2. **Revise `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts`.** Replace the `emitSection14()` return value with a sharpened stop rule adapted from the report §26:

   > Write only the beat cluster requested. Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it. Stop when the segment reaches the first new decision point, response point, interruption, irreversible beat, or changed immediate pressure that would require the author to choose what happens next. Do not summarize downstream aftermath. Do not continue into the next exchange merely to resolve tension. Do not declare durable machine-state conclusions unless the directive explicitly asks for that wording.

   The single-sentence current rule is replaced by this fuller formulation; the section title (`SECTION_14_TITLE`) remains `Stop Rule`.

3. **Resolve the `manual-render-instruction.md` mismatch via the "fewer docs" path.** Edit `docs/manual-story-studio/README.md` to remove the reference to the missing file:
   - Delete the `manual-render-instruction.md` bullet on line 6.
   - Soften line 3 from "SPEC-102 lands two files here" to "Manual Story Studio's renderer-contract surface lives here" (the SPEC-102 framing is now archived; the current state is the file that exists).
   - Update line 8 to reflect that the renderer-contract surface is `prose-craft-contract.md` alone; the stop rule and prompt structure are now carried by the prompt section helpers, not by a separate render-time-instruction doc.

   Do NOT delete `prose-craft-contract.md`. Do NOT create `manual-render-instruction.md`.

4. **Adjust the in-source SPEC-102 comment in `prose-craft-contract.md` only if it references the missing file by name.** Verify by reading the existing prose-craft-contract.md (already verified: no such reference; no change needed).

5. **Acceptance** under `tools/manual-story-studio/test/`:
   - **Backend test (`test/prompt-sections/section-14-stop-rule.test.ts`)**: assert the returned stop-rule text contains the sentence `"Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it."` (regression guard against accidental reversion).
   - **Backend test (extend existing `prompt-compose.test.ts` or add a new section-14 case)**: assert the composed prompt markdown's `## 14. Stop Rule` section is non-empty and matches the new wording.
   - **Doc-existence regression check (small Node script or test)**: assert that `docs/manual-story-studio/README.md` does not reference `manual-render-instruction.md`. (This prevents a future contributor from re-introducing the README claim without also landing the file.)
   - **No new doc files created.**

### Out of scope

- Modification of `docs/prose-renderer-contract/render-time-instruction.md` (the branching-pipeline sibling) — explicitly forbidden by Manual Studio's "sibling, not fork" stance.
- Modification of `docs/prose-renderer-contract/prose-craft-contract.md` (the branching-pipeline sibling) — same reason.
- Modification of `docs/prose-renderer-contract/content-policy.md` — the inlined-verbatim source-of-truth file; out of scope.
- Adding new prompt sections — the existing 15 sections (per `tools/manual-story-studio/src/prompt/sections/`) stay.
- Restructuring the prompt to the 11-section shape the report §13 proposes — that is a substantial re-shaping deferred indefinitely; the present spec only corrects the contract wording and the stop rule.
- Promoting any lint rule tier — **SPEC-106**.
- New `prompt-contract.md` doc the report §21 mentions as optional — defer; the current surface (prose-craft-contract.md + stop-rule section helper) is sufficient.

## 3. Key decisions

- **Edit the smallest possible textual surfaces.** The bug is in three textual places (one paragraph in one doc, one return string in one helper, one bullet in one README). The fix is in those same three places. No restructure, no new abstraction, no new file.

- **"Fewer docs, not more" for the missing render-instruction file.** Per the report §21 and §31 Stage 3: removing the claim is cleaner than adding a file whose intent overlaps the existing prose-craft-contract + stop rule. If a contributor later needs a render-time instruction surface, it can be added in a focused way; until then, two docs are easier to keep coherent than three.

- **The stop rule's anti-patterns are explicit.** "Do not summarize downstream aftermath. Do not continue into the next exchange merely to resolve tension. Do not declare durable machine-state conclusions" — naming the failure modes the LLM has been observed to commit is more reliable than describing only the positive criterion.

- **`"she finally trusted him"` example removed.** The prior contract used this phrase as an example of what the LLM should *not* write. Under the new contract, this is exactly the kind of turn the cockpit invites — the author then encodes it in a relationship/emotion/status record. Removing the example removes the contradiction.

- **Regression guard via tested literal substring, not whole-string equality.** The acceptance tests assert presence of the key sentence (e.g., `"Let meaningful action..."`) rather than byte-exact match — this keeps the rule editable without churn while still catching accidental reversion.

## 4. Files to touch

**Modify:**

- `docs/manual-story-studio/prose-craft-contract.md` — replace the second paragraph of the §"Prose as Manuscript, Not State" section (line 68) per §2 item 1. First paragraph unchanged.
- `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` — replace the `emitSection14()` return value per §2 item 2. `SECTION_14_TITLE` unchanged.
- `docs/manual-story-studio/README.md` — remove the `manual-render-instruction.md` reference per §2 item 3; soften the SPEC-102 framing.

**Create:**

- `tools/manual-story-studio/test/prompt-sections/section-14-stop-rule.test.ts` — regression test asserting the key sentence is present.
- `tools/manual-story-studio/test/docs-consistency.test.ts` — assert `docs/manual-story-studio/README.md` does not reference `manual-render-instruction.md` (load the file as text, `assert.ok(!text.includes("manual-render-instruction.md"))`).

**No modification to:**

- `docs/prose-renderer-contract/**` — branching-pipeline siblings stay.
- Other prompt section helpers (`section-1` through `section-13`, `section-15`) — out of scope.
- The prose-craft-contract's first paragraph of §"Prose as Manuscript, Not State" — correct as-is.
- Any record schema, validator, or backend route — none of those touch the corrected surfaces.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Soft Canon / Local Truth (must be explicit and author-controlled) | aligns @ prose-state-boundary doc | The corrected contract preserves the load-bearing rule "the app does not infer state from prose" while removing the over-correction that forbade meaningful turns; local truth remains author-controlled because the author updates records after the prose, not because the LLM is forbidden from rendering the turn. |
| §Story Bundles §4a Plan-Authority Boundary (rendered prose is non-authoritative) | aligns @ prose-state-boundary doc | The corrected wording keeps prose as evidence/material, not authority — the LLM may *render* a turn, but the cockpit does not *promote* the rendered turn into state without explicit author action. |
| §Story Bundles §9 Prose Length Discipline (no word-count quotas) | aligns @ stop-rule helper | The sharpened stop rule names concrete structural stop conditions (decision point, refusal, interruption, irreversible beat) rather than a length quota; length follows content. |
| §Tooling Recommendation (least-agency LLM packets) | aligns @ stop-rule helper | The "do not declare durable machine-state conclusions" clause keeps the LLM out of authoring durable state; its agency is bounded to the prose surface. |
| Rule 6 No Silent Retcons | N/A @ tooling-adjacent | No canon mutation; doc and helper edits only. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` runs the two new tests alongside the existing suite. The doc-consistency test is a one-line text check.

Manual verification: read the updated `prose-craft-contract.md` end-to-end; the section "Prose as Manuscript, Not State" reads coherently (first paragraph: prose is manuscript, author updates records by hand; second paragraph: prose may render turns, app will not infer state). Open Prompt Preview on any fixture; the `## 14. Stop Rule` section of the composed markdown matches the new wording.

## 7. Acceptance criteria

1. `docs/manual-story-studio/prose-craft-contract.md` line 68 area no longer contains the substring `"should not narrate state changes that have not happened in the record store yet"`. (verified by grep)
2. The same file contains the new sentence `"Prose may render decisive emotional, relational, practical, or informational turns when the directive and beat cluster call for them."` (verified by grep)
3. `emitSection14()` returns a string containing `"Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it."` and containing `"Do not declare durable machine-state conclusions unless the directive explicitly asks for that wording."` (acceptance test)
4. `docs/manual-story-studio/README.md` no longer contains `"manual-render-instruction.md"`. (acceptance test)
5. `docs/manual-story-studio/manual-render-instruction.md` does not exist (no file was created to "fix" the mismatch). (verified by `find docs/manual-story-studio -name manual-render-instruction.md` returning zero hits)
6. `tools/manual-story-studio/test/docs-consistency.test.ts` exists and passes. (acceptance test)
7. All existing tests under `tools/manual-story-studio/test/` continue to pass. The web `tsc --noEmit` step remains green.

## 8. Assumption reassessment

- **Assumption:** Removing the README claim about `manual-render-instruction.md` does not break any test that scans the doc directory for expected files. → Verify via `grep -rn "manual-render-instruction" tools/manual-story-studio/test/`. If a test asserts the file's presence, that test was always failing or never ran; resolve by deleting the obsolete assertion.
- **Assumption:** No code or test in the package reads `manual-render-instruction.md` from disk at runtime. → Verify via `grep -rn "manual-render-instruction" tools/manual-story-studio/src/ tools/manual-story-studio/web/src/`. If a stub was added expecting the file, decide between removing the stub (consistent with this spec) or restoring the file (contradicts this spec — re-open the choice).
- **Assumption:** The prompt composer's `section-14-stop-rule.ts` return value is the sole stop-rule emission site. → Verified via `grep -rn "Stop at the first materially new"` returning a single match in that file. Future-proof: the regression test in §2 item 5 catches accidental duplicate stop-rule emissions because any duplicate that re-introduces the old wording will fail the key-sentence assertion.
