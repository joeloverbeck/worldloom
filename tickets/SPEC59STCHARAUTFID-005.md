# SPEC59STCHARAUTFID-005: `story_kernel_cast_bind_list_integrity` validator

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new structural validator in `tools/validators` registered in `structuralValidators`; no impact on existing validators (additive registry entry). Parses `STORY_KERNEL.md.cast_bind_list` and reads STCHAR records; mutates nothing.
**Deps**: None

## Problem

`STORY_KERNEL.md.cast_bind_list` (seeded by `branching-story-bootstrap`) has no structural validator — nothing verifies that each non-background cast STENT resolves to an `stchar_id`, that `source_char_id` is provenance-only, or that the legacy `bound_char_id` field is absent. SPEC-59 §2.5 adds `story_kernel_cast_bind_list_integrity`.

## Assumption Reassessment (2026-05-21)

1. `cast_bind_list` is documented in `.claude/skills/branching-story-bootstrap/SKILL.md` with entry fields `stchar_id`, `stent_id`, `source_char_id: CHAR-<integer> | null`, `role_in_story: [<role values>]`. The legacy `bound_char_id` appears nowhere in active code/templates (only in specs/archive/reports as the field that must NOT exist) — verified via repo-wide grep. STCHAR records carry `source_char_id` provenance (`tools/validators/src/schemas/story-character-authority.schema.json`). No file `story-kernel-cast-bind-list-integrity.ts` exists yet. `tests/structural/registry.test.ts` asserts the ordered `structuralValidators` name list.
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

Create `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` exporting `Validator` named `story_kernel_cast_bind_list_integrity`, `severity_mode: "fail"`. `run`: parse the `cast_bind_list` block from `STORY_KERNEL.md`; for each entry:
- assert every non-background STENT has a resolving `stchar_id`;
- assert `source_char_id`, if present, matches the resolved STCHAR's `source_char_id` (provenance only);
- assert no `bound_char_id` field is present.

Emit one fail verdict per missing-`stchar_id` / provenance-mismatch / `bound_char_id`-present.

### 2. Register in the structural registry

Import + array entry in `tools/validators/src/public/registry.ts`; add the name to the ordered list in `tools/validators/tests/structural/registry.test.ts`.

### 3. Fixtures

Add fixtures under `tools/validators/tests/fixtures/`: complete list (pass), missing `stchar_id` (fail), `bound_char_id` present (fail).

## Files to Touch

- `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — import + `structuralValidators` array entry
- `tools/validators/tests/structural/registry.test.ts` (modify) — add name to the ordered `deepEqual` name list
- `tools/validators/tests/fixtures/` — new cast-bind-list fixtures (new)
- `tools/validators/tests/structural/story-kernel-cast-bind-list-integrity.test.ts` (new) — validator unit tests

## Out of Scope

- The STENT↔STCHAR record-level reciprocity check (`stchar_bound_stent_reciprocity`, ticket 004) — this ticket parses the `STORY_KERNEL.md` cast-bind block, not `_source` records.
- Any change to `branching-story-bootstrap`'s cast-list authoring (the validator checks the produced kernel, it does not alter the producer).
- Re-introducing or migrating any `bound_char_id` data (the field is asserted absent, not transformed).

## Acceptance Criteria

### Tests That Must Pass

1. Missing-`stchar_id` and `bound_char_id`-present fixtures each produce a `severity_mode: "fail"` verdict.
2. A complete, well-formed cast list passes.
3. `npm test --prefix tools/validators` passes, including `tests/structural/registry.test.ts` (name list now includes `story_kernel_cast_bind_list_integrity`).

### Invariants

1. Every non-background cast STENT resolves to an `stchar_id`; `source_char_id` is provenance-only; `bound_char_id` is always absent.
2. The validator mutates no records and resolves no Mystery Reserve entry.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-kernel-cast-bind-list-integrity.test.ts` — fixture-driven fail/pass cases per §3.
2. `tools/validators/tests/structural/registry.test.ts` — extend the ordered name-list assertion.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
