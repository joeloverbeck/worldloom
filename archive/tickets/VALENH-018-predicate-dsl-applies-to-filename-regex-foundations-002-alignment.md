# VALENH-018: Align `storylet_predicate_dsl_parsability` `applies_to` filename regex with FOUNDATIONS-002 unpadded convention

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` line 68 (incremental-mode filename selector), `tools/validators/dist/` (rebuilt). No test suite changes required.
**Deps**: `archive/tickets/VALENH-017-predicate-dsl-id-regex-foundations-002-alignment.md` (companion ticket — aligned the ID-suffix regex against FOUNDATIONS-002; this ticket completes the filename-selector counterpart so the entire validator file is FOUNDATIONS-002-aligned).

## Problem

At intake, after VALENH-017 loosened the predicate-DSL ID regex (`STORY_ID_PATTERNS` + `RECORD_ACTIVE_PATTERN` at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts:23-36`) from `\d{4}` to `\d+` for FOUNDATIONS-002 alignment, the same file still carried a companion `\d{4}` regex at line 68 — the incremental-mode `applies_to` filename selector:

```ts
(ctx.run_mode === "incremental" && ctx.touched_files.some((file) =>
  /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d{4}\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d{4}\.yaml$/.test(file))),
```

That selector is only consulted when `ctx.run_mode === "incremental"` — full-world pre-apply runs (the live submit-path validation flow) ignore `applies_to` entirely, so the defect was dormant on the path that surfaced VALENH-017. If incremental mode were activated for any reason (e.g., future per-file validator runs, a CLI mode that operates on a single touched SLT, or a follow-up VALENH ticket that uses incremental as a performance optimization), the pre-fix filename selector would silently skip every legitimate `SLT-NNN.yaml` filename (where N is unpadded per FOUNDATIONS-002), reproducing the same kind of structural skip that VALENH-013 documented for stale node-type-name queries.

Session evidence (commitment-block-authoring direct_batch invocation on red-bunny, 2026-05-13, this session): after the VALENH-017 in-session edit landed in the working tree, a follow-up grep `grep -n '\\\\d{4}\|\\\\d+\$' tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js` returned line 37 (the `applies_to` selector — same line in dist as line 68 in source) still showing `SLT-\d{4}\.yaml`. I called out the gap in the final session summary as "the same `\d{4}` filename regex remains in the predicate-DSL validator's incremental-mode `applies_to` selector (lines 37 / 68); harmless on our submit path but stale against FOUNDATIONS-002 if/when incremental mode is activated. Worth a small VALENH ticket; not blocking."

This ticket completed that follow-up.

## Assumption Reassessment (2026-05-13)

1. **Codebase state at intake**: `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` had the `applies_to` selector at line 68 with the `SLT-\d{4}\.yaml` filename regex. This ticket replaced both filename branches with `SLT-\d+\.yaml` in source and rebuilt `tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js`.
2. **Spec / doc state**: `docs/FOUNDATIONS.md` §Canonical Storage Layer + CLAUDE.md §ID Allocation Conventions both mandate FOUNDATIONS-002 unpadded form for the `<NAMESPACE>-<integer>` suffix; the filename derives from the record ID per `worlds/<slug>/stories/<story>/_source/storylets/SLT-<integer>.yaml` shape — same unpadded convention applies. `worlds/erotica-world/stories/red-bunny/_source/storylets/` currently contains `SLT-1.yaml` through `SLT-22.yaml` — every filename is unpadded.
3. **Shared boundary under audit**: the contract between the validator's filename selector and the FOUNDATIONS-002-conformant on-disk filename shape. Symmetric with VALENH-017's ID-regex boundary; same canonical source of truth (FOUNDATIONS-002), different application surface (filename vs ID field).
4. **FOUNDATIONS principle restated**: FOUNDATIONS-002 §Canonical Storage Layer. The applies_to regex must align with the actual on-disk filename shape FOUNDATIONS-002 produces, otherwise an incremental-mode validator run would silently exclude FOUNDATIONS-002-conformant SLT files from validation — a kind of silent "validator coverage skip" that is precisely the bug class the predicate-DSL validator was wired into pre-apply to prevent.
5. **Adjacent contradiction surfaced during reassessment**: are there other `\d{4}` filename regexes in `tools/validators/src/` for other story-bundle record classes (BEL, SF, OBL, CNSQ, THR, SREL, STLOC, STOBJ, STINT, BR, PG, CHC, DA) on similar incremental-mode selectors? `grep -rn 'SLT-\\\\d{4}\\\\\\\.yaml\\|STENT-\\\\d{4}\\\\\\\.yaml\\|BEL-\\\\d{4}\\\\\\\.yaml' tools/validators/src/` at HEAD will surface them. Classification: future cleanup, separate ticket per affected record class IF surfaced. This ticket's scope is the SLT filename selector only — the one regex that the predicate-DSL validator owns.
6. **Rule 6 retcon attribution**: VALENH-013 wired this validator into the pre-apply read surface and added the `applies_to` predicate; VALENH-017 loosened the predicate-id regex to FOUNDATIONS-002 form. Neither ticket touched the companion `applies_to` filename regex because it was dormant on their submit-path scope. The previous behavior was "incremental-mode runs silently skip FOUNDATIONS-002-conformant SLT filenames"; the new behavior is "incremental-mode runs include FOUNDATIONS-002-conformant SLT filenames." The warrant is the FOUNDATIONS-002 mandate plus the validator's structural contract that every applicable storylet file is validated, not just those matching a pre-FOUNDATIONS-002 padded shape.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: a single-line edit replaces `\d{4}` with `\d+` in the two-branch alternation regex at line 68, mirroring the VALENH-017 pattern exactly. The same FOUNDATIONS-002 alignment, the same regex tightening, the same "regex accepts both padded and unpadded forms" property (`\d+` is a strict superset of `\d{4}`). The alternative of leaving the regex padded "until incremental mode is activated" defers a known-broken state with no benefit; landing it now keeps the validator file internally consistent and unambiguous.
2. **No backwards-compatibility shim**: no alias / dual-regex / version-discriminator pattern. The new regex is the single canonical form for the filename selector; padded fixtures continue to match `\d+`.

## Verification Layers

1. **`applies_to` filename regex accepts unpadded filenames** → codebase grep-proof: `node -e "const r = /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d+\.yaml\$|(?:^|\/)_source\/storylets\/SLT-\d+\.yaml\$/; console.log(r.test('worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-1.yaml'))"` returns `true`; same for `SLT-11.yaml`, `SLT-22.yaml` (the actual filenames in `worlds/erotica-world/stories/red-bunny/_source/storylets/`).
2. **`applies_to` filename regex still accepts padded filenames** (no test regression) → existing fixtures in test suites continue to match.
3. **Pre-apply submit unchanged** → `cd tools/validators && npm test` continues to pass the package integration tests, including the `validatePatchPlan` storylet predicate pre-apply coverage. Pre-apply runs do not depend on the incremental filename selector changed here.
4. **FOUNDATIONS alignment confirmed** → FOUNDATIONS alignment check: companion to VALENH-017 invariant 1.

## Landed Changes

### 1. Loosen the `applies_to` filename selector regex

Edited `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` line 68: replaced both occurrences of `SLT-\d{4}\.yaml` (one in each branch of the alternation) with `SLT-\d+\.yaml`. The existing FOUNDATIONS-002 comment above the validator's ID regex block remains the local contract note.

### 2. Rebuild the dist

Ran `cd tools/validators && npm run build` to regenerate `tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js`. Line 37 of the dist mirrors the source.

### 3. Confirm test suite passes

Ran `cd tools/validators && npm test`. The package reported 183/183 passing tests.

## Files to Touch

- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify) — line 68 filename regex tightening.
- `tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js` (modify — regenerated by `npm run build`).

## Out of Scope

- Companion filename regexes for non-SLT story-bundle record classes — if `grep -rn '<CLASS>-\\\\d{4}\\\\\\\.yaml' tools/validators/src/` surfaces additional `applies_to` selectors at other classes, file per-class follow-up tickets. The predicate-DSL validator's only `applies_to` regex is the SLT one (this ticket).
- Allocator regexes in `tools/world-mcp/src/tools/allocate-next-id.ts` — separate concern; MCPENH-028 covered STINT's allocator regex; others may need audit.
- Patch-engine race-check regexes in `tools/patch-engine/src/apply.ts` — separate concern; MCPENH-028 covered STINT's race-check regex; others may need audit.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all 183 tests PASS unchanged.
2. Targeted filename regex assertion: `node -e "const r = /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d+\.yaml\$|(?:^|\/)_source\/storylets\/SLT-\d+\.yaml\$/; console.log(r.test('stories/red-bunny/_source/storylets/SLT-11.yaml'), r.test('stories/red-bunny/_source/storylets/SLT-0011.yaml'))"` — prints `true true`.
3. Full-package build: `cd tools/validators && npm run build` — exits 0.

### Invariants

1. **FOUNDATIONS-002 alignment for incremental-mode filename selector**: the predicate-DSL validator's `applies_to` selector matches every FOUNDATIONS-002-conformant SLT filename shape; companion to VALENH-017's invariant 1 for the ID-suffix regex.
2. **No backwards regression**: padded filenames (`SLT-0011.yaml`) used in any legacy fixtures continue to match — `\d+` is a strict superset of `\d{4}`.
3. **Single canonical regex per filename selector**: no dual-pattern / version-discriminator pattern.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket on the test side; existing test suite covers acceptance via padded fixtures, and `\d+` is a strict superset of `\d{4}`. A janitorial unpadded-filename-fixture addition can be filed separately if test regression-surface tightening is wanted later.

### Commands

1. `cd tools/validators && npm test` — full validator test suite.
2. `cd tools/validators && npm run build` — rebuild dist.
3. Targeted filename-regex assertion (see Acceptance Criteria #2) — verifies both unpadded and padded filenames match.

## Outcome

Completed on 2026-05-13. The predicate-DSL validator's incremental-mode `applies_to` selector now accepts FOUNDATIONS-002 unpadded SLT filenames (`SLT-11.yaml`) while continuing to accept padded legacy fixture filenames (`SLT-0011.yaml`). The validators package was rebuilt so the ignored `tools/validators/dist/` artifact reflects the source.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `node -e "const r = /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d+\.yaml\$|(?:^|\/)_source\/storylets\/SLT-\d+\.yaml\$/; console.log(r.test('stories/red-bunny/_source/storylets/SLT-11.yaml'), r.test('stories/red-bunny/_source/storylets/SLT-0011.yaml'))"` — printed `true true`.
3. `rg -n 'SLT-\\d\\{4\\}\\.yaml|SLT-\\d\\+\\.yaml' tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts tools/validators/dist/src/rules/rule_storylet_predicate_dsl_parsability.js` — confirmed source and dist use `SLT-\d+\.yaml`; no `SLT-\d{4}\.yaml` selector remains in this validator.
4. `cd tools/validators && npm test` — passed, 183/183 tests.
5. Manual FOUNDATIONS alignment review — `docs/FOUNDATIONS.md` §Canonical Storage Layer defines unpadded natural-integer suffixes and `docs/WORKFLOWS.md` documents `_source/storylets/SLT-<integer>.yaml`; the landed selector matches that contract.

## Deviations

- No new test file was added. The ticket's accepted proof surface is the targeted regex assertion plus the existing package suite; the existing rule test still proves padded fixture compatibility.
