# VALENH-017: Align `storylet_predicate_dsl_parsability` ID regex with FOUNDATIONS-002 unpadded convention

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (source) and `tools/validators/dist/` (rebuilt). No test suite changes required; the existing rule tests still use padded fixtures and remain green under the looser regex.
**Deps**: `archive/tickets/VALENH-013.md` (the ticket that wired this validator into the pre-apply read surface — retconned below per Rule 6), `archive/tickets/FOUNDATIONS-002.md` (the unpadded natural-integer suffix convention this ticket realizes), `archive/tickets/MCPENH-028-tighten-stint-allocator-regex-to-bare-numeric.md` (precedent for FOUNDATIONS-002-driven regex tightening in an adjacent pipeline component).

## Problem

At intake, after VALENH-013 wired `storylet_predicate_dsl_parsability` into the pre-apply read surface (commit `06f5282`, 2026-05-13 15:46), every patch plan submission targeting `worlds/<slug>/stories/<story>/_source/storylets/` returned `status: fail` because the validator's two ID regexes — `STORY_ID_PATTERNS` and `RECORD_ACTIVE_PATTERN` at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts:23-36` — demanded 4-digit zero-padded suffixes (`^STENT-\d{4}$`, `^SF-\d{4}$`, ..., and the union for `RECORD_ACTIVE_PATTERN`).

FOUNDATIONS-002 §Canonical Storage Layer mandates **unpadded natural-integer** ID suffixes (`STENT-1`, not `STENT-0001`). Every existing bootstrap story-bundle record — STENT-1/2/3, STLOC-1/2, STOBJ-1/2, SREL-1/2, OBL-1, CNSQ-1/2, THR-1/2/3, BEL-1..9, SF-1..8, SE-1, PG-1, BR-1, SLT-1..10 in `worlds/erotica-world/stories/red-bunny/_source/` — used the unpadded form. The old regex therefore rejected every legitimate predicate reference to those records as `predicate.invalid_reference`.

Session evidence (commitment-block-authoring direct_batch invocation on red-bunny, 2026-05-13 17:00, this session): a 12-block SLT patch plan returned ~40 `predicate.invalid_reference` failures across all 22 SLT records (the 10 bootstrap blocks SLT-1..SLT-10 + the 12 new SLT-11..SLT-22), each one a single regex miss against `STENT-1` / `STLOC-1` / `SREL-1` / `OBL-1` / `CNSQ-2` / `STOBJ-1` / `BEL-1` / `BEL-3` in `preconditions.hard[].record` or `preconditions.hard[].entity` / `.location` / `.object`. Every patch plan submission to red-bunny was blocked until the regex was loosened in-session to `\d+`.

The validator regex was not aligned to FOUNDATIONS-002 because VALENH-013 focused on the stale node-type-name issue (`story_consequence_record` / `story_relationship_record` → `consequence_record` / `relationship_record_story`) and did not touch the ID-format regex; the regex predates FOUNDATIONS-002 and was carried forward unchanged through VALENH-013's wiring work.

## Assumption Reassessment (2026-05-13)

1. **Codebase state at HEAD**: `git show HEAD:tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` lines 23-36 confirms `STORY_ID_PATTERNS` declared `fact: /^SF-\d{4}$/, entity: /^STENT-\d{4}$/, belief: /^BEL-\d{4}$/, obligation: /^OBL-\d{4}$/, consequence: /^CNSQ-\d{4}$/, thread: /^THR-\d{4}$/, relationship: /^SREL-\d{4}$/, location: /^STLOC-\d{4}$/, object: /^STOBJ-\d{4}$/, artifact: /^DA-\d{4}$/, intention: /^STINT-\d{4}$/` and `RECORD_ACTIVE_PATTERN = /^(?:STENT|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA)-\d{4}$/`. The working tree now replaces each of those 12 regexes (11 in `STORY_ID_PATTERNS` + 1 in `RECORD_ACTIVE_PATTERN`) with `\d+` and includes a FOUNDATIONS-002 comment above the block.
2. **Spec / doc state**: `docs/FOUNDATIONS.md` §Canonical Storage Layer + CLAUDE.md §ID Allocation Conventions both state IDs use "the FOUNDATIONS-002 unpadded natural-integer suffix convention: `M-1`, not `M-0001`." The bootstrap of `worlds/erotica-world/stories/red-bunny/` (commit `549e9ef` and downstream) authored every story-bundle record in unpadded form, consistent with the contract. The validator regex is the only pipeline component holding the padded form against the contract.
3. **Shared boundary under audit**: the contract between the validator's ID regex and FOUNDATIONS-002's canonical ID format. The validator must accept every ID format the allocator emits and the patch engine accepts. Patch engine race check at `tools/patch-engine/src/apply.ts:250` uses `^STINT-(\d{4})$` for STINT — that's a separate surface (and was retconned by MCPENH-028 to bare-numeric `STINT-NNNN`); the predicate validator is the analog ticket for the predicate-DSL ID surface. The unwritten invariant: "every regex along the patch-plan submit path accepts the FOUNDATIONS-002 canonical ID format."
4. **FOUNDATIONS principle restated**: FOUNDATIONS-002 §Canonical Storage Layer is the design contract for ID suffixes. The validator's `\d{4}` regex violates the contract structurally — it would reject every conformant record at runtime if the validator were strict-enforced anywhere. VALENH-013's wiring into pre-apply is where that latent violation became a hard block. The validator must align with FOUNDATIONS-002, not the other way around — FOUNDATIONS-002 is the non-negotiable per CLAUDE.md.
5. **Adjacent contradiction surfaced during reassessment**: line 68 of the same file uses `/(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d{4}\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d{4}\.yaml$/` as the `applies_to` filename selector for incremental mode — companion `\d{4}` regex on a filename rather than an ID. Classification: future cleanup, separate ticket. Filed as VALENH-018 (companion to this ticket) so the predicate-DSL filename selector can be aligned separately. This ticket does NOT touch line 68; the scope is `STORY_ID_PATTERNS` + `RECORD_ACTIVE_PATTERN` only.
6. **Rule 6 retcon attribution**: VALENH-013 wired this validator into the pre-apply read surface, making the predicate-id regex strict-at-submit-time. Before VALENH-013, the regex was effectively dormant for live patches (the validator either didn't run on submit, or ran but its `fail` verdicts were tolerated). VALENH-013's wiring is the warrant; VALENH-013 itself did not own the regex scope. This ticket retcons VALENH-013's wiring by completing the FOUNDATIONS-002 alignment that VALENH-013's scope implicitly assumed. Existing behavior: regex rejects unpadded IDs; new behavior: regex accepts both padded and unpadded forms (`\d+` accepts `0001` as well as `1`), so no pre-VALENH-013 fixture regresses. The warrant for the change is the commitment-block-authoring session evidence: every SLT submission against unpadded story-bundles is structurally blocked.
7. **Proof command correction**: `tools/validators/package.json` is the live proof authority for this package. The accepted package proof is package-local `npm run build` and `npm test` from `tools/validators`. The drafted red-bunny `/tmp/slb-1-red-bunny-plan.json` smoke is not a portable checked-in proof artifact and was not required for this ticket because the owned change is local validator ID acceptance, not CLI envelope construction.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: a single-line edit per regex tightens the pattern from `\d{4}` to `\d+`, which is the minimal change that aligns the validator with FOUNDATIONS-002 while preserving acceptance of padded fixtures. The alternative — adding an alternation like `(?:\d{4}|\d+)` — is redundant since `\d+` subsumes `\d{4}`. The alternative of converting every existing record to padded form rejects FOUNDATIONS-002 and would require migrating every world's `_source/` content; that is the opposite of what FOUNDATIONS-002 mandates.
2. **No backwards-compatibility shim**: no alias / dual-regex / version-discriminator pattern is introduced. The new regex is the single canonical form; padded fixtures still match `\d+` so no test regression is induced; the dist is rebuilt from source in lockstep.

## Verification Layers

1. **Regex accepts unpadded IDs** → codebase grep-proof: `node -e "console.log(/^STENT-\d+$/.test('STENT-1'))"` returns `true`; same for SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA, STINT.
2. **Regex still accepts padded IDs** (no test regression) → existing fixtures at `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts:13-49` use `STENT-0001`, `SF-0001`, etc.; the test must still PASS unchanged.
3. **Pre-apply validator remains exercised through the package lane** → `cd tools/validators && npm test` covers the existing `validatePatchPlan` integration tests for Shape B storylet ops and the rule tests for padded fixtures; no portable red-bunny plan artifact is required for this local regex-only change.
4. **FOUNDATIONS alignment confirmed** → FOUNDATIONS alignment check: `docs/FOUNDATIONS.md` §Canonical Storage Layer states the unpadded-suffix convention; `\d+` accepts that form.

## Landed Changes

### 1. Loosen `STORY_ID_PATTERNS` and `RECORD_ACTIVE_PATTERN` in source

`tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` now replaces every `\d{4}` with `\d+` in the 11 `STORY_ID_PATTERNS` entries and the one `RECORD_ACTIVE_PATTERN` union. A short comment above the block names FOUNDATIONS-002 as the canonical ID format and notes that padded fixtures remain accepted by `\d+`.

### 2. Rebuild the dist

`cd tools/validators && npm run build` regenerated `tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js`. The dist file's ID regex block matches the source's `\d+` form after rebuild.

### 3. Confirm test suite passes

`cd tools/validators && npm test` passed after the rebuild. The package reported 183/183 passing tests, including the rule tests and pre-apply integration tests that exercise `storylet_predicate_dsl_parsability`.

## Files to Touch

- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify) — regex tightening lines 23-36.
- `tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js` (modify — regenerated by `npm run build`).

## Out of Scope

- Line 68 `applies_to` filename selector regex `SLT-\d{4}\.yaml` — companion gap, filed as VALENH-018.
- Adding new test fixtures for unpadded IDs — existing padded fixtures continue to pass under `\d+`; new fixtures are nice-to-have but not required for this minimal regex tightening. A janitorial test addition can be filed separately if regression surface tightening is wanted later.
- Patch engine race-check regex at `tools/patch-engine/src/apply.ts:250` — that surface is owned by MCPENH-028 and remains bare-numeric `\d{4}` for STINT (the bare-numeric form is also a subset of `\d+`, so no cross-surface conflict). Other classes may need similar tightening if they predate FOUNDATIONS-002 — surface separately.
- Allocator regexes in `tools/world-mcp/src/tools/allocate-next-id.ts` — separate concern; MCPENH-028 covered STINT; others may need audit but are out of scope for this validator ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validators package suite PASS unchanged.
2. Full-package build: `cd tools/validators && npm run build` — exits 0.
3. Targeted regex assertion: `node -e 'const ids=["STENT","SF","BEL","OBL","CNSQ","THR","SREL","STLOC","STOBJ","DA","STINT"]; for (const p of ids) { const r = new RegExp("^" + p + "-\\\\d+$"); if (!r.test(p + "-1") || !r.test(p + "-0001") || r.test(p + "-")) process.exit(1); } console.log("ok");'` — prints `ok`.

### Invariants

1. **FOUNDATIONS-002 alignment**: the predicate-DSL ID regex accepts every ID format FOUNDATIONS-002 §Canonical Storage Layer mandates (unpadded natural-integer suffixes).
2. **No backwards regression**: padded fixtures (`STENT-0001`, `SF-0001`, etc.) used in existing test suites continue to PASS — `\d+` is a strict superset of `\d{4}`.
3. **Single canonical regex per ID class**: no alias / dual-pattern / version-discriminator pattern in the source.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket on the test side; existing test suite covers acceptance via padded fixtures, and `\d+` is a strict superset of `\d{4}`. A janitorial unpadded-fixture addition can be filed separately; the regex tightening is the structural fix.

### Commands

1. `cd tools/validators && npm test` — full validator test suite.
2. `cd tools/validators && npm run build` — rebuilds the compiled validator artifact.
3. Targeted regex assertion: `node -e 'const ids=["STENT","SF","BEL","OBL","CNSQ","THR","SREL","STLOC","STOBJ","DA","STINT"]; for (const p of ids) { const r = new RegExp("^" + p + "-\\\\d+$"); if (!r.test(p + "-1") || !r.test(p + "-0001") || r.test(p + "-")) process.exit(1); } console.log("ok");'` — must print `ok`.

## Outcome

Completed. `storylet_predicate_dsl_parsability` now accepts FOUNDATIONS-002 unpadded natural-integer IDs for every predicate reference class covered by `STORY_ID_PATTERNS` and `RECORD_ACTIVE_PATTERN`, while still accepting existing padded test fixtures because `\d+` is a superset of `\d{4}`. The validators package was rebuilt so the ignored `tools/validators/dist/` artifact reflects the source.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `node -e 'const ids=["STENT","SF","BEL","OBL","CNSQ","THR","SREL","STLOC","STOBJ","DA","STINT"]; for (const p of ids) { const r = new RegExp("^" + p + "-\\\\d+$"); if (!r.test(p + "-1") || !r.test(p + "-0001") || r.test(p + "-")) process.exit(1); } console.log("ok");'` — passed, printed `ok`.
3. `rg -n '\\d\\{4\\}|\\d\\+' tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js` — confirmed source and dist use `\d+` for `STORY_ID_PATTERNS` and `RECORD_ACTIVE_PATTERN`; the remaining `SLT-\d{4}` hit is the out-of-scope incremental filename selector owned by VALENH-018.
4. `cd tools/validators && npm test` — passed, 183/183 tests. The run emitted the existing Git default-branch hint from a temp repo test; no validator test failed.
5. Manual FOUNDATIONS alignment review — `docs/FOUNDATIONS.md` §Canonical Storage Layer states per-class record IDs use unpadded natural-integer suffixes and engine regexes use `^<CLASS>-[0-9]+$` patterns; the landed regexes match that contract.

## Deviations

- The drafted `/tmp/slb-1-red-bunny-plan.json` CLI smoke was not run because that plan file is not a checked-in or otherwise available proof artifact. The accepted proof is the package-local validator build/test lane plus a direct regex assertion over every ID class this ticket owns.
- The remaining `SLT-\d{4}` filename selector in `applies_to` was intentionally left untouched by this ticket. That sibling scope was completed and archived as `archive/tickets/VALENH-018-predicate-dsl-applies-to-filename-regex-foundations-002-alignment.md`.
- The source regex hunk already existed as pre-existing same-seam dirty work at this run's intake. This run verified the hunk, rebuilt the compiled artifact, and closed out the ticket against the live proof surface.
