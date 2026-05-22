# VALENH-027: Relax `no_char_authority_in_story_runtime` CHAR-leak regex to match padded world CHAR ids

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`src/structural/stchar-utils.ts`, `src/structural/no-char-authority-in-story-runtime.ts`, `tests/structural/stchar-structural-validators.test.ts`)
**Deps**: None

## Problem

At intake, `no_char_authority_in_story_runtime` enforced FOUNDATIONS §Story Bundles §6.1 / Rule 4: world `CHAR-*` ids must not appear as operational authority in story-runtime records (CHC, PG snapshot, SF, page-plan §16a body, etc.); runtime character authority flows through `STCHAR`, and `STCHAR.source_char_id` is the lone exempt provenance surface. Detection used `CHAR_ID = /\bCHAR-(0|[1-9][0-9]*)\b/` (`tools/validators/src/structural/stchar-utils.ts`), the no-leading-zeros form, consumed by `recordCharLeaks`, while `textSurfaceCharLeaks` carried a parallel hard-coded no-leading-zeros regex.

Worlds created before the FOUNDATIONS-002 unpadded convention use zero-padded CHAR ids (e.g., `erotica-world`'s `CHAR-0003` / `CHAR-0004` / `CHAR-0005`). During a `branching-story-bootstrap` run against `erotica-world` this session, the STCHAR `source_char_id` schema pattern was relaxed to `^CHAR-[0-9]+$` (committed) so the bundle could legitimately reference padded CHAR provenance. Before this ticket, that had landed only half of padded-CHAR-id support: the leak-detector regex could not match `CHAR-0003`, so a padded world CHAR id wrongly placed in a non-exempt story-runtime field was silently not flagged. The landed validator now recognizes padded and unpadded world CHAR ids on both structured runtime records and page-plan/prose-receipt text surfaces.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: before this ticket, `tools/validators/src/structural/stchar-utils.ts` defined `CHAR_ID = /\bCHAR-(0|[1-9][0-9]*)\b/`; `recordCharLeaks` consumed it through `collectStringReferences`. Reassessment found a same-seam source-file omission in the drafted ticket: `textSurfaceCharLeaks` had its own hard-coded `/\bCHAR-(0|[1-9][0-9]*)\b/g`, so page-plan/prose-receipt text leaks would have remained blind to padded CHAR ids if only `stchar-utils.ts` changed. The landed implementation sets `CHAR_ID = /\bCHAR-[0-9]+\b/` and makes the text-surface scan derive its global matcher from `CHAR_ID.source`. `STCHAR_ID` remains correctly unpadded — STCHAR ids are allocated unpadded — and is out of scope. The companion `source_char_id` schema remains `^CHAR-[0-9]+$` (`tools/validators/src/schemas/story-character-authority.schema.json`); the schema and both runtime leak surfaces now agree on the accepted CHAR id-space. **Rule 6 retcon attribution**: previous behavior — the leak detector matched only unpadded CHAR ids, so padded-world runtime leaks passed undetected; new behavior — it matches any `CHAR-<digits>` id; warrant — the session's padded-id bootstrap plus the `source_char_id` schema relaxation exposed the asymmetry, and `\bCHAR-[0-9]+\b` is a strict superset of the prior pattern so no previously detected leak stops being detected.
2. **Doc**: FOUNDATIONS §Story Bundles §6.1 (`source_char_id` is provenance only; runtime consumes STCHAR) and §Canonical Storage Layer FOUNDATIONS-002 (unpadded form for *new* records, but legacy padded records — `CF-0001`, `CHAR-0003` — remain valid). The leak detector must match the CHAR id-space that legitimately exists in the world, not only the post-convention unpadded shape. Precedent: `archive/tickets/VALENH-017` / `VALENH-018` relaxed padded `\d{4}` → `\d+` in the predicate-DSL selectors for the same FOUNDATIONS-002 alignment reason.
3. **Shared boundary under audit**: the CHAR id-space contract shared by (a) STCHAR `source_char_id` schema acceptance (`^CHAR-[0-9]+$`) and (b) the `no_char_authority_in_story_runtime` structured-record and text-surface detection regexes. These surfaces must agree on which CHAR ids exist; they now do.
4. **FOUNDATIONS principle**: §Story Bundles §6.1 + Rule 4 (No Globalization by Accident) — world CHAR ids must not be laundered into runtime authority. The validator IS that firewall; a regex blind to padded ids leaves it silently down for padded worlds. Restated before trusting the spec narrative: the firewall's contract is "no world CHAR id as runtime authority", not "no unpadded world CHAR id as runtime authority".
5. **Canon Safety surface**: this modifies a `tools/validators/src/structural/` enforcement surface. The change only widens detection and never weakens any firewall or touches the Mystery Reserve (this validator has no MR interaction). `\bCHAR-[0-9]+\b` is a strict superset of `\bCHAR-(0|[1-9][0-9]*)\b`, so every previously flagged leak is still flagged; the exemption set (`isAllowedCharReference`: STCHAR `.source_char_id`, SE `.promotion_claims[`, adjudication records) is unchanged.
6. **Live-corpus classification**: post-change `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` exited 1 because the newly widened validator detected an existing padded-CHAR runtime leak in the gitignored/local `red-bunny` story bundle: `PG-1.validation_trace.branch_isolation` cited `CHAR-0003`. That was evidence this ticket's validator change worked; post-ticket review created and later archived `archive/tickets/EROTICA-002-repair-red-bunny-char-authority-leak.md` for the separate world-content repair. This package ticket did not direct-edit story-bundle `_source` records.

## Architecture Check

1. A single-line constant change — `CHAR_ID = /\bCHAR-[0-9]+\b/` — mirrors the `source_char_id` schema's `^CHAR-[0-9]+$` exactly and the VALENH-017/018 padded→`\d+` precedent. The alternative (leave the regex padded "until needed") keeps the firewall silently inert on padded worlds with no benefit.
2. No backwards-compatibility aliasing/shims: `\bCHAR-[0-9]+\b` is a strict superset of the prior pattern; padded and unpadded both match; no dual-regex or version discriminator.

## Verification Layers

1. Regex matches padded and unpadded CHAR ids → codebase grep-proof: `node -e "const r=/\bCHAR-[0-9]+\b/; console.log(r.test('CHAR-0003'), r.test('CHAR-3'))"` prints `true true`.
2. Leak detection fires on a padded CHAR id in non-exempt runtime surfaces → new validator unit test: a story record carrying `CHAR-0003` in a non-exempt field yields `no_char_authority_in_story_runtime.char_authority_leak`, and a page-plan text fixture carrying `CHAR-0003` yields `no_char_authority_in_story_runtime.char_authority_text_leak`.
3. Exemptions preserved → manual review + test: a STCHAR record carrying `CHAR-0003` in `.source_char_id` produces no leak verdict (`isAllowedCharReference` path unchanged).

## Landed Changes

### 1. Widen the CHAR-leak detection regex

`tools/validators/src/structural/stchar-utils.ts` now changes `CHAR_ID` from `/\bCHAR-(0|[1-9][0-9]*)\b/` to `/\bCHAR-[0-9]+\b/`. `tools/validators/src/structural/no-char-authority-in-story-runtime.ts` now derives the text-surface matcher from `CHAR_ID.source`, so structured records and text surfaces use the same padded-compatible CHAR id-space. `STCHAR_ID` is unchanged.

### 2. Add padded-id test coverage

`tools/validators/tests/structural/stchar-structural-validators.test.ts` adds cases asserting (a) padded `CHAR-0003` / `CHAR-0004` in non-exempt story-runtime record/text surfaces are flagged as `char_authority_leak` / `char_authority_text_leak`, and (b) padded `CHAR-0003` in STCHAR `.source_char_id` remains exempt.

## Files to Touch

- `tools/validators/src/structural/stchar-utils.ts` (modify)
- `tools/validators/src/structural/no-char-authority-in-story-runtime.ts` (modify)
- `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify)

## Out of Scope

- `STCHAR_ID` regex (line 10) — STCHAR ids are unpadded by allocation; unchanged.
- `source_char_id` schema pattern — already `^CHAR-[0-9]+$` at HEAD.
- STCHAR `source_char_hash` correctness (separate concern; see VALENH-028).
- The `isAllowedCharReference` exemption set — unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. New test: padded `CHAR-0003` in a non-exempt story-runtime record field and page-plan text → `no_char_authority_in_story_runtime.char_authority_leak` and `no_char_authority_in_story_runtime.char_authority_text_leak` fire.
2. New test: padded `CHAR-0003` in STCHAR `.source_char_id` → no leak verdict (exemption preserved).
3. `cd tools/validators && npm test` (build + full structural/rule suite) passes.

### Invariants

1. `CHAR_ID` matches `CHAR-<any digits>` and is a strict superset of the prior no-leading-zeros pattern.
2. The leak exemptions (STCHAR `.source_char_id`, SE `.promotion_claims[`, adjudication records) are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify) — add padded-id record/text leak-flagged + padded-id provenance-exempt cases.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/stchar-structural-validators.test.js`
3. `node -e "const r=/\bCHAR-[0-9]+\b/; console.log(r.test('CHAR-0003'), r.test('CHAR-3'))"`
4. `cd tools/validators && npm test`
5. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` — expected nonzero live-corpus witness after this ticket because the widened validator now finds the local `red-bunny` padded-CHAR runtime leak.

## Outcome

Completed. The structured-record CHAR leak detector now matches `CHAR-<any digits>`, and the page-plan/prose-receipt text-surface detector reuses the same matcher instead of carrying a separate unpadded regex. Focused structural tests now cover padded runtime leaks and padded STCHAR provenance exemption.

No package README/docs change was needed: `tools/validators/README.md` lists the validator name only and does not document the regex shape.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/stchar-structural-validators.test.js` — passed, 13 tests.
3. `node -e "const r=/\bCHAR-[0-9]+\b/; console.log(r.test('CHAR-0003'), r.test('CHAR-3'))"` — printed `true true`.
4. `cd tools/validators && npm test` — passed after implementation, 851 tests. Pre-edit baseline also passed, 849 tests.
5. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` — exited 1 with the intended new live-corpus witness: `no_char_authority_in_story_runtime.char_authority_leak` on `stories/red-bunny/_source/pages/PG-1.yaml` / `red-bunny:PG-1`, `reference_id: CHAR-0003`, `reference_path: PG-1.validation_trace.branch_isolation`. The same run also emitted three `compatibility_drift` info verdicts for optional directory absence.

## Deviations

- Reassessment added `tools/validators/src/structural/no-char-authority-in-story-runtime.ts` to the owned file set because `textSurfaceCharLeaks` had a same-seam hard-coded unpadded CHAR regex.
- The drafted live-corpus command was not a green acceptance gate for this package ticket. After the fix, it truthfully failed on an existing local story-bundle content leak. Repairing `red-bunny` story `_source` content was outside this package implementation ticket and was completed under `archive/tickets/EROTICA-002-repair-red-bunny-char-authority-leak.md`.
