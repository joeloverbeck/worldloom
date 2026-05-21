# SPEC59STCHARAUTFID-005: `story_kernel_cast_bind_list_integrity` validator

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new structural validator in `tools/validators` registered in `structuralValidators`; no impact on existing validators (additive registry entry). Parses `STORY_KERNEL.md.cast_bind_list` and reads STCHAR records; mutates nothing.
**Deps**: None

## Problem

At intake, `STORY_KERNEL.md.cast_bind_list` (seeded by `branching-story-bootstrap`) had no structural validator — nothing verified that each non-background cast STENT resolved to an `stchar_id`, that `source_char_id` was provenance-only, or that the legacy `bound_char_id` field was absent. This ticket added `story_kernel_cast_bind_list_integrity` for SPEC-59 §2.5.

## Assumption Reassessment (2026-05-21)

1. `cast_bind_list` is documented in `.claude/skills/branching-story-bootstrap/SKILL.md` with entry fields `stchar_id`, `stent_id`, `source_char_id: CHAR-<integer> | null`, `role_in_story: [<role values>]`. The legacy `bound_char_id` appears nowhere in active code/templates (only in specs/archive/reports as the field that must NOT exist) — verified via repo-wide grep. STCHAR records carry `source_char_id` provenance (`tools/validators/src/schemas/story-character-authority.schema.json`). At intake, no file `story-kernel-cast-bind-list-integrity.ts` existed. `tests/structural/registry.test.ts` asserts the ordered `structuralValidators` name list.
2. SPEC-59 §2.5 is the source deliverable; §3 lists fixtures (complete list → pass; missing `stchar_id` → fail; `bound_char_id` present → fail).
3. Cross-artifact boundary: the validator parses the `cast_bind_list` block in the primary-authored `STORY_KERNEL.md` and cross-checks each entry's `source_char_id` against the resolved STCHAR record's `source_char_id` (provenance match). `STORY_KERNEL.md` is a markdown surface (not an atomic `_source/*.yaml` record), so the validator parses the kernel's cast-bind block directly.
4. FOUNDATIONS §6.1 Story-Local Character Authority motivates this ticket: the cast list must bind every non-background entity to an STCHAR (the operational authority) and must forbid `bound_char_id` (world `CHAR-*` leaking in as a runtime shortcut), keeping `CHAR` provenance-only.
5. Canon Safety surface: new structural validator under `tools/validators/src/structural/` gating story-kernel cast-binding integrity at validate-time / Hook 5. Read-only; mutates nothing; resolves no Mystery Reserve entry. The `bound_char_id`-absent assertion is a defensive firewall against a legacy world-CHAR-authority leak vector.

## Architecture Check

1. A dedicated kernel cast-list validator is cleaner than folding kernel parsing into the binding-reciprocity validator (ticket 004), which operates on `_source` STENT/STCHAR records rather than the `STORY_KERNEL.md` markdown surface — different parse target, different responsibility.
2. No backwards-compatibility shim: `bound_char_id` is a hard `fail` if present; `source_char_id` is validated as provenance-only (it must match the STCHAR's `source_char_id`, never used as a binding shortcut).

## Verification Layers

1. A cast entry for a non-background STENT with no resolving `stchar_id` fails -> schema validation (missing-`stchar_id` fixture).
2. An entry whose `source_char_id` does not match the resolved STCHAR's `source_char_id` fails -> provenance-mismatch check.
3. Any entry carrying `bound_char_id` fails -> grep-proof of the absent-field assertion + `bound_char_id`-present fixture.
4. A complete, well-formed cast list passes -> pass fixture.
5. Validator registered in `structuralValidators` and named in `tests/structural/registry.test.ts` -> codebase grep-proof.

## What to Change

### 1. New validator module

Created `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` exporting `Validator` named `story_kernel_cast_bind_list_integrity`, `severity_mode: "fail"`. `run` parses the `cast_bind_list` block from `STORY_KERNEL.md`; for each entry it:
- asserts every non-background STENT has a resolving `stchar_id`;
- asserts `source_char_id`, if present, matches the resolved STCHAR's `source_char_id` (provenance only);
- asserts no `bound_char_id` field is present.

It emits one fail verdict per missing-`stchar_id`, unresolved STCHAR, provenance mismatch, or `bound_char_id` present.

### 2. Register in the structural registry

Imported and added the validator in `tools/validators/src/public/registry.ts`; added the name to the ordered list in `tools/validators/tests/structural/registry.test.ts`; updated the package README validator inventory and SPEC-04 validator count guard; updated the pre-apply execution-status inventory so the new validator is expected to skip unrelated clean patch plans.

### 3. Fixtures

Added inline fixture-style test cases in `tools/validators/tests/structural/story-kernel-cast-bind-list-integrity.test.ts`: complete list (pass), missing `stchar_id` (fail), `bound_char_id` present (fail), provenance mismatch (fail), and background-only no-STCHAR entry (pass).

## Files to Touch

- `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — import + `structuralValidators` array entry
- `tools/validators/tests/structural/registry.test.ts` (modify) — add name to the ordered `deepEqual` name list
- `tools/validators/tests/structural/story-kernel-cast-bind-list-integrity.test.ts` (new) — validator unit tests
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — update structural validator count
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — classify the new validator as skipped for unrelated clean pre-apply plans
- `tools/validators/README.md` (modify) — update structural validator count and inventory

## Out of Scope

- The STENT↔STCHAR record-level reciprocity check (`stchar_bound_stent_reciprocity`, ticket 004) — this ticket parses the `STORY_KERNEL.md` cast-bind block, not `_source` records.
- Any change to `branching-story-bootstrap`'s cast-list authoring (the validator checks the produced kernel, it does not alter the producer).
- Re-introducing or migrating any `bound_char_id` data (the field is asserted absent, not transformed).

## Acceptance Criteria

### Tests That Must Pass

1. Missing-`stchar_id` and `bound_char_id`-present fixtures each produce a `severity_mode: "fail"` verdict.
2. A complete, well-formed cast list passes.
3. `npm test` from `tools/validators` passes, including `tests/structural/registry.test.ts` (name list now includes `story_kernel_cast_bind_list_integrity`).

### Invariants

1. Every non-background cast STENT resolves to an `stchar_id`; `source_char_id` is provenance-only; `bound_char_id` is always absent.
2. The validator mutates no records and resolves no Mystery Reserve entry.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-kernel-cast-bind-list-integrity.test.ts` — fixture-driven fail/pass cases per §3.
2. `tools/validators/tests/structural/registry.test.ts` — extend the ordered name-list assertion.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — update structural validator count.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — classify the validator as skipped for unrelated clean pre-apply plans.

### Commands

1. `npm run build` from `tools/validators`
2. `npm test` from `tools/validators`

## Outcome

Completed: 2026-05-21

Implemented `story_kernel_cast_bind_list_integrity` as a read-only structural validator over `STORY_KERNEL.md` frontmatter. The validator checks non-background cast entries for resolving STCHAR bindings, rejects legacy `bound_char_id`, and verifies `source_char_id` provenance against the resolved STCHAR record. Registered it in the structural registry, updated inventory/count assertions, and added focused unit coverage for pass/fail cases.

## Verification Result

- `npm run build` from `tools/validators` — passed.
- `node --test dist/tests/structural/story-kernel-cast-bind-list-integrity.test.js` from `tools/validators` — passed, 5/5 tests.
- `node --test dist/tests/structural/registry.test.js` from `tools/validators` — passed.
- `node --test dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` — passed, 20/20 tests, after updating the expected skip inventory for the new validator.
- `npm test` from `tools/validators` — first sandboxed run failed because child-process tests hit `spawnSync /usr/local/bin/node EPERM`; escalated rerun passed, 804/804 tests.

## Deviations

- The ticket drafted new files under `tools/validators/tests/fixtures/`; the landed proof uses inline fixture builders in the focused structural test, matching nearby STCHAR validator tests and avoiding extra fixture files.
- Same-seam inventory fallout added `tools/validators/README.md`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` to the landed file set.
