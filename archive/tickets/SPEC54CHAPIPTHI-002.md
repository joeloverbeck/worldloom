# SPEC54CHAPIPTHI-002: Frontmatter integrity for character-proposals/

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` structural validators (`yaml-parse-integrity`, `record-schema-compliance`) + their tests.
**Deps**: None

## Problem

At intake, malformed-or-missing-frontmatter NCP/NCB files escaped all three validators: `yaml-parse-integrity` did not cover `character-proposals/`, and both `record-schema-compliance` (`parseYamlSurface` -> `null` -> `continue`) and `character-memorability-structure` (`parseFrontmatter` -> `null` -> skip) silently skipped such files. Because the NCP protagonist-grade engine lives entirely in the `memorability_profile` frontmatter, a card whose frontmatter did not parse — or was absent — bypassed the AJV `memorability_profile` requirement with no verdict. SPEC-54 Phase 2. This ticket closed that integrity hole on the load-bearing frontmatter surface without adding NCP body-prose heading checks.

## Assumption Reassessment (2026-05-20)

1. At intake, `tools/validators/src/structural/yaml-parse-integrity.ts` covered `characters/` and `diegetic-artifacts/` but not `character-proposals/`; `tools/validators/src/structural/record-schema-compliance.ts` matched the NCP path `/^character-proposals\/[^/]+\.md$/` and NCB path `/^character-proposals\/batches\/[^/]+\.md$/` but skipped them when `frontmatterFor` or `parseYamlSurface` yielded null.
2. SPEC-54 Phase 2. The protagonist-grade engine is the AJV-validated `memorability_profile` frontmatter (SPEC-52 Phase 5 item 6); this ticket protects that load-bearing surface and did not add body-prose heading checks (rejected in SPEC-54 §Out of Scope).
3. Cross-artifact boundary under audit: `yaml-parse-integrity` is a general structural validator running across all hybrid/atomic records; `record-schema-compliance` applies the JSON schemas. This change added `character-proposals/` coverage without altering behavior for `characters/` or `diegetic-artifacts/`.
4. FOUNDATIONS §Machine-Facing Layer item 4 (Validator Framework — executable enforcement of structural invariants): the landed change adds deterministic enforcement on the previously-uncovered NCP/NCB frontmatter surface.
5. Canon Safety surface (template menu item 5): `yaml-parse-integrity.ts` and `record-schema-compliance.ts` are structural validators under `tools/validators/src/structural/`. The change is purely additive coverage — it emits verdicts where there were silent skips for `character-proposals/`; it does not weaken the Mystery Reserve firewall, relax any existing canon/record gate, or change behavior for any other path.

## Architecture Check

1. Extending `yaml-parse-integrity`'s path condition reuses the existing parse-integrity mechanism (catches malformed YAML); the missing-frontmatter verdict in `record-schema-compliance` reuses its existing verdict-emission path (catches absent frontmatter). Two complementary checks close both escape modes without introducing a new validator.
2. No backwards-compatibility aliasing/shims — files under `character-proposals/` now must carry parseable frontmatter; malformed or missing frontmatter is not grandfathered.

## Verification Layers

1. Malformed-frontmatter NCP/NCB fails -> structural validation (parse-integrity verdict) via test.
2. Missing-frontmatter (body-only) NCP/NCB fails -> structural validation (record-schema-compliance missing-frontmatter verdict) via test.
3. Thin-but-well-formed NCP still passes, with no body-heading check introduced -> structural validation; guards the SPEC-52/SPEC-53 boundary.

## Landed Changes

### 1. yaml-parse-integrity path coverage

In `tools/validators/src/structural/yaml-parse-integrity.ts`, `character-proposals/` is now part of the markdown-frontmatter path condition alongside `characters/` and `diegetic-artifacts/` (covering both `character-proposals/*.md` NCP cards and `character-proposals/batches/*.md` NCB manifests). Malformed YAML frontmatter on those files now yields a parse-integrity verdict instead of a silent skip.

### 2. Missing-frontmatter verdict

In `tools/validators/src/structural/record-schema-compliance.ts`, when a path matches the NCP card pattern or the NCB batch pattern but `frontmatterFor(content)` returns `null` (no frontmatter block at all), the validator now emits `record_schema_compliance.missing_frontmatter` rather than `continue`.

### 3. No body-section checks

No NCP body-section heading checks were added. The existing `## Rejected Directions Audit` heading check for upgraded/user-seed cards (landed in SPEC-53) is the only NCP body heading that remains validated, and is unchanged.

## Files to Touch

- `tools/validators/src/structural/yaml-parse-integrity.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/validators/tests/structural/yaml-parse-integrity.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify)
- `specs/SPEC-54-character-pipeline-third-iteration-fixes.md` (modify)

## Out of Scope

- NCP body-section heading validation (`Niche Analysis`, `Canon Safety Check Trace`, `Seed Essence`, `Upgrade Diagnosis`, the six base sections) — rejected in SPEC-54 §Out of Scope.
- Behavior changes for `characters/` or `diegetic-artifacts/` paths.

## Acceptance Criteria

### Tests That Must Pass

1. An NCP card with malformed YAML frontmatter fails with a parse-integrity verdict; an NCB manifest with malformed frontmatter fails likewise.
2. An NCP card with no frontmatter block at all fails with `record_schema_compliance.missing_frontmatter`; an NCB manifest with missing frontmatter fails likewise.
3. A well-formed NCP/NCB with valid frontmatter and a thin-but-present body still passes the structural validators (no body-prose heading check introduced).

### Invariants

1. No NCP body-section heading check is introduced — the SPEC-52/SPEC-53 boundary (NCP body prose unchecked beyond the existing rejected-directions-audit heading) holds.
2. `characters/` and `diegetic-artifacts/` validation behavior is unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/yaml-parse-integrity.test.ts` — added malformed-frontmatter `character-proposals/` cases (NCP card + NCB manifest).
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` — added missing-frontmatter (body-only) NCP/NCB cases while preserving the thin-but-well-formed pass case.
3. `tools/validators/tests/integration/spec04-verification.test.ts` and `tools/validators/tests/integration/spec09-verification.test.ts` — updated full-world legacy baseline assertions from 473 to 474 and included the new `record_schema_compliance.missing_frontmatter` code where the SPEC-04 code inventory checks it.

### Commands

1. `npm test --prefix tools/validators`

## Outcome

Completed: 2026-05-20

`yaml_parse_integrity` now parses frontmatter from `character-proposals/` markdown files, so malformed NCP and NCB frontmatter emits parse errors. `record_schema_compliance` now emits a dedicated `record_schema_compliance.missing_frontmatter` verdict for NCP/NCB paths with no frontmatter block. The existing thin-body, valid-frontmatter NCP/NCB path remains accepted, preserving the SPEC-52/SPEC-53 boundary that NCP body prose is not broadly heading-checked.

SPEC-54 now has a dated Phase 2 implementation note. The validators full-world legacy baseline moved from 473 to 474 known failures because the new missing-frontmatter check exposes one additional legacy proposal gap in the animalia fixture.

## Verification Result

1. Pre-edit `npm test --prefix tools/validators` — passed, 740 tests.
2. First post-edit `npm test --prefix tools/validators` — failed three same-seam full-world baseline assertions because the new missing-frontmatter verdict raised the known legacy fail count from 473 to 474. Updated SPEC-04/SPEC-09 baseline counts.
3. Second post-edit `npm test --prefix tools/validators` — failed two SPEC-04 expected-code inventories because `record_schema_compliance.missing_frontmatter` was now present. Updated those inventories.
4. Final `npm test --prefix tools/validators` — passed, 741 tests.

## Deviations

- Same-seam proof fallout expanded the touched test set beyond the drafted structural test files: SPEC-04/SPEC-09 full-world baseline assertions moved with the new validator verdict so package-wide verification remained truthful.
