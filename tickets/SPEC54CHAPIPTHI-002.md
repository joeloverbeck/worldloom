# SPEC54CHAPIPTHI-002: Frontmatter integrity for character-proposals/

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` structural validators (`yaml-parse-integrity`, `record-schema-compliance`) + their tests.
**Deps**: None

## Problem

A malformed-or-missing-frontmatter NCP/NCB file escapes all three validators today: `yaml-parse-integrity` does not cover `character-proposals/`, and both `record-schema-compliance` (`parseYamlSurface` → `null` → `continue`) and `character-memorability-structure` (`parseFrontmatter` → `null` → skip) silently skip such files. Because the NCP protagonist-grade engine lives entirely in the `memorability_profile` frontmatter, a card whose frontmatter does not parse — or is absent — bypasses the AJV `memorability_profile` requirement with no verdict. SPEC-54 Phase 2. This is an integrity hole on the load-bearing frontmatter surface, distinct from (and not to be confused with) NCP body-prose heading checks.

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/structural/yaml-parse-integrity.ts` — confirmed the markdown-frontmatter path condition covers `characters/` and `diegetic-artifacts/` but NOT `character-proposals/` (it returns `frontmatterFor(content)` only for those two prefixes). `tools/validators/src/structural/record-schema-compliance.ts` — confirmed the NCP path `/^character-proposals\/[^/]+\.md$/` and NCB path `/^character-proposals\/batches\/[^/]+\.md$/` both call `frontmatterFor` then `parseYamlSurface`, and `continue` (skip) when the parse yields null.
2. SPEC-54 Phase 2. The protagonist-grade engine is the AJV-validated `memorability_profile` FRONTMATTER (SPEC-52 Phase 5 item 6); this ticket protects that load-bearing surface and explicitly does NOT add body-prose heading checks (rejected in SPEC-54 §Out of Scope).
3. Cross-artifact boundary under audit: `yaml-parse-integrity` is a general structural validator running across all hybrid/atomic records; `record-schema-compliance` applies the JSON schemas. The change must add `character-proposals/` coverage WITHOUT altering behavior for `characters/` or `diegetic-artifacts/`.
4. FOUNDATIONS §Machine-Facing Layer item 4 (Validator Framework — executable enforcement of structural invariants): the change adds deterministic enforcement on the previously-uncovered NCP/NCB frontmatter surface.
5. Canon Safety surface (template menu item 5): `yaml-parse-integrity.ts` and `record-schema-compliance.ts` are structural validators under `tools/validators/src/structural/`. The change is purely additive coverage — it emits verdicts where there were silent skips for `character-proposals/`; it does NOT weaken the Mystery Reserve firewall, relax any existing canon/record gate, or change behavior for any other path.

## Architecture Check

1. Extending `yaml-parse-integrity`'s path condition reuses the existing parse-integrity mechanism (catches malformed YAML); the missing-frontmatter verdict in `record-schema-compliance` reuses its existing verdict-emission path (catches absent frontmatter). Two complementary checks close both escape modes without introducing a new validator.
2. No backwards-compatibility aliasing/shims — files under `character-proposals/` must carry parseable frontmatter; no grandfathering of malformed cards.

## Verification Layers

1. Malformed-frontmatter NCP/NCB fails -> structural validation (parse-integrity verdict) via test.
2. Missing-frontmatter (body-only) NCP/NCB fails -> structural validation (record-schema-compliance missing-frontmatter verdict) via test.
3. Thin-but-well-formed NCP still passes, with no body-heading check introduced -> structural validation; guards the SPEC-52/SPEC-53 boundary.

## What to Change

### 1. yaml-parse-integrity path coverage

In `tools/validators/src/structural/yaml-parse-integrity.ts`, add `character-proposals/` to the markdown-frontmatter path condition alongside `characters/` and `diegetic-artifacts/` (this covers both `character-proposals/*.md` NCP cards and `character-proposals/batches/*.md` NCB manifests). Malformed YAML frontmatter on those files now yields a parse-integrity verdict instead of a silent skip.

### 2. Missing-frontmatter verdict

In `tools/validators/src/structural/record-schema-compliance.ts`, when a path matches the NCP card pattern or the NCB batch pattern but `frontmatterFor(content)` returns `null` (no frontmatter block at all), emit an actionable missing-frontmatter verdict rather than `continue`.

### 3. No body-section checks

Do NOT add NCP body-section heading checks. The existing `## Rejected Directions Audit` heading check for upgraded/user-seed cards (landed in SPEC-53) is the only NCP body heading that remains validated, and is unchanged.

## Files to Touch

- `tools/validators/src/structural/yaml-parse-integrity.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/validators/tests/structural/yaml-parse-integrity.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)

## Out of Scope

- NCP body-section heading validation (`Niche Analysis`, `Canon Safety Check Trace`, `Seed Essence`, `Upgrade Diagnosis`, the six base sections) — rejected in SPEC-54 §Out of Scope.
- Behavior changes for `characters/` or `diegetic-artifacts/` paths.

## Acceptance Criteria

### Tests That Must Pass

1. An NCP card with malformed YAML frontmatter fails (parse-integrity verdict), where today it is skipped.
2. An NCP card with no frontmatter block at all fails (missing-frontmatter verdict), where today it is skipped; an NCB manifest with malformed/missing frontmatter fails likewise.
3. A well-formed NCP/NCB with valid frontmatter and a thin-but-present body still passes the structural validators (no body-prose heading check introduced).

### Invariants

1. No NCP body-section heading check is introduced — the SPEC-52/SPEC-53 boundary (NCP body prose unchecked beyond the existing rejected-directions-audit heading) holds.
2. `characters/` and `diegetic-artifacts/` validation behavior is unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/yaml-parse-integrity.test.ts` — add malformed-frontmatter `character-proposals/` cases (NCP card + NCB manifest).
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` — add missing-frontmatter (body-only) NCP/NCB cases plus a thin-but-well-formed pass case.

### Commands

1. `npm test --prefix tools/validators`
