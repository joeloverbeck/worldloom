# SPEC74STCHARDISBOU-009: New validator stchar_temporal_reference_boundary + extract OPERATIONAL_TARGET_SECTIONS to shared module

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new validator file `tools/validators/src/structural/stchar-temporal-reference-boundary.ts`; registry append at `tools/validators/src/public/registry.ts`; new test file `tools/validators/tests/structural/stchar-temporal-reference-boundary.test.ts`; extract `OPERATIONAL_TARGET_SECTIONS` constant to a shared module (e.g., `tools/validators/src/structural/_stchar-operational-sections.ts`) imported by both `stchar-source-fact-coverage.ts` and the new validator
**Deps**: None

## Problem

Currently no validator detects when an operational STCHAR section cites a temporal story-state record id (e.g., `STEMO-1`, `BEL-2`, `STPLAN-4`) as durable character authority. This is the temporal-contamination gap empirically observed on `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md`: opening-scene state (`STEMO`/`BEL`/`STPLAN` references) was embedded into the Page-Plan Voice Block and Pressure Behavior sections, treating current state as if it were durable persona. Phrase-based detection ("today", "now", "opening") would produce false positives on legitimate prose ("at the opening of the gala"); structural detection via record-class-id regex on operational sections only is the FOUNDATIONS-aligned mechanism.

## Assumption Reassessment (2026-05-23)

1. Verified `tools/validators/src/structural/stchar-source-fact-coverage.ts` defines `OPERATIONAL_TARGET_SECTIONS` at line 23 as a 11-element `Set` of H2 names (`Story-Facing Identity`, `Stable Persona Core`, `Emotional Appraisal Map`, `Pressure Behavior`, `Voice Bible / Dialogue Authority`, `Page-Plan Voice Block`, `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`, `Story-State Derivation Guide`, `Prose Rendering Constraints`); currently declared as `const` (not exported).
2. Verified SPEC-74 §4.9 specifies the validator's rules + the explicit allowance for extracting the constant: "The implementing ticket may extract the constant to a shared module if both validators import it." This ticket takes the extract option (preferred over duplication) so the contract has a single source.
3. Cross-skill boundary under audit: this validator runs via the validator-framework run-loop; its diagnostic findings feed the health-audit Phase 2m `stchar_temporal_authority_contamination` finding (SPEC74STCHARDISBOU-012); its OPERATIONAL_TARGET_SECTIONS shared module is imported by both `stchar_source_fact_coverage` (existing, SPEC-70-introduced) and this new validator — both must use the same 11-H2 set for consistency.
4. FOUNDATIONS principle restated: §Story Bundles §5c ("Present Causal State, Not Narrative Shape") + §Tooling Recommendation ("LLM agents should never operate on prose alone" — structural validators on record-class-id occurrences in operational sections, not on phrase semantics). The validator's record-class-id regex is structural — it detects `STEMO-N` / `BEL-N` / etc. as literal id-tokens, not as conceptual references in prose.
5. HARD-GATE / Canon Safety Check surface touched: this is a new structural validator under `tools/validators/src/structural/`; per the per-ticket-type granularity in spec-to-tickets, a new structural validator engages this item. The validator gates STCHAR record writes by failing FAIL-everywhere on profiles that cite temporal-state records in operational sections.

## Architecture Check

1. Extracting `OPERATIONAL_TARGET_SECTIONS` to a shared module removes the duplication risk between `stchar_source_fact_coverage` and `stchar_temporal_reference_boundary` — both validators must use the same 11-H2 set, and a future addition (or removal) to the set must propagate to both. The shared module pattern is the canonical worldloom approach for cross-validator constants (parallel to other shared helpers under `tools/validators/src/structural/_helpers/`).
2. The record-class-id regex (`/\b(PG|SE|STEMO|BEL|STPLAN|STINT|STSTAT|STOBJ|STLOC|SREL|THR|OBL|CNSQ|CLK|STSEC|STQ)-\d+\b/g` or equivalent) scoped to operational sections is structural — it detects literal id-tokens, not prose semantics. The prose "at the opening of the gala" passes; the prose "as of PG-1 she is unable to go home" fails (cites `PG-1` in `Stable Persona Core`).
3. No backwards-compatibility shims. Existing contaminated STCHAR profiles will fail the validator; SPEC74STCHARDISBOU-013's migration pass remediates them before the validator registers.

## Verification Layers

1. **Validator file present and exports the validator** → codebase grep-proof: `grep -n 'stcharTemporalReferenceBoundary\|stchar_temporal_reference_boundary' tools/validators/src/structural/stchar-temporal-reference-boundary.ts` returns ≥2 matches (camelCase export + snake_case validator name).
2. **Shared OPERATIONAL_TARGET_SECTIONS module created** → file `tools/validators/src/structural/_stchar-operational-sections.ts` (or equivalent shared-module path) exists and exports the 11-H2 set; `stchar-source-fact-coverage.ts` refactored to import from the shared module instead of declaring locally; new validator imports from the shared module.
3. **Registry append in place** → grep-proof: `grep -n 'stcharTemporalReferenceBoundary\|stchar-temporal-reference-boundary' tools/validators/src/public/registry.ts` returns ≥2 matches.
4. **Allowed-context exception works correctly** → tests assert that record-id references in frontmatter fields (`story_local_inputs_used`, `generated_at_page`, `supersedes`), `Source Distillation` section, and `Validation / Audit Anchors` section PASS; references in operational sections FAIL.

## What to Change

### 1. Extract OPERATIONAL_TARGET_SECTIONS to shared module

Create `tools/validators/src/structural/_stchar-operational-sections.ts` (filename starts with underscore per the existing `_helpers/` convention to mark as internal-shared):

```ts
export const OPERATIONAL_TARGET_SECTIONS: ReadonlySet<string> = new Set([
  "Story-Facing Identity",
  "Stable Persona Core",
  "Emotional Appraisal Map",
  "Pressure Behavior",
  "Voice Bible / Dialogue Authority",
  "Page-Plan Voice Block",
  "Perception and Embodiment",
  "Agency and Planning Tendencies",
  "Relationship-Specific Behavior",
  "Story-State Derivation Guide",
  "Prose Rendering Constraints",
]);
```

Refactor `tools/validators/src/structural/stchar-source-fact-coverage.ts` to import the constant from the new shared module instead of declaring it locally at line 23.

### 2. Create the validator file

**File**: `tools/validators/src/structural/stchar-temporal-reference-boundary.ts`

**Registered name**: `stchar_temporal_reference_boundary`

**Severity**: FAIL on all STCHAR records (fail-everywhere policy per SPEC-74 §5).

**Rules**:

1. Parse the STCHAR body by H2 section.
2. Reuse the `OPERATIONAL_TARGET_SECTIONS` set imported from the shared module. Adding `Story-State Derivation Guide` to scope is permitted only when explicitly justified as a discussion of derivation rules, not a current-state recital — the implementing developer should err on the side of inclusion (the 11 H2s as defined by the shared module).
3. In any operational durable section, disallow occurrences of active temporal story-state record-class id patterns: `PG-<integer>`, `SE-<integer>`, `STEMO-<integer>`, `BEL-<integer>`, `STPLAN-<integer>`, `STINT-<integer>`, `STSTAT-<integer>`, `STOBJ-<integer>`, `STLOC-<integer>`, `SREL-<integer>`, `THR-<integer>`, `OBL-<integer>`, `CNSQ-<integer>`, `CLK-<integer>`, `STSEC-<integer>`, `STQ-<integer>`.
4. Allowed contexts: frontmatter fields (`story_local_inputs_used`, `generated_at_page`, `supersedes`), the `Source Distillation` section (provenance context), and the `Validation / Audit Anchors` section (audit context).
5. Failure message: `<STCHAR-id> operational section '<section>' cites temporal story-state record <record-id> as durable character authority. Route current state to the appropriate story-state record and project it through page-plan §16a.`

### 3. Register in `tools/validators/src/public/registry.ts`

Add the import + array entry following the existing STCHAR-validator pattern:

```ts
import { stcharTemporalReferenceBoundary } from "../structural/stchar-temporal-reference-boundary.js";
// ...
export const structuralValidators: readonly Validator[] = [
  // ... existing entries
  stcharTemporalReferenceBoundary,
];
```

### 4. Create the test file

**File**: `tools/validators/tests/structural/stchar-temporal-reference-boundary.test.ts`

Cases per SPEC-74 §7:

- **Positive**: STCHAR `Validation / Audit Anchors` may cite `SE-1`, `PG-1`, `STEMO-1` as evidence/provenance.
- **Positive**: STCHAR `Source Distillation` may cite `PG-1` as generation provenance.
- **Positive**: STCHAR stable section may say "under humiliation, she turns shame into bravado" (no record ids).
- **Positive**: prose "at the opening of the gala" in `Pressure Behavior` PASSES (no record-id cited).
- **Negative**: `Page-Plan Voice Block` cites `STEMO-1` as voice state — FAILS.
- **Negative**: `Stable Persona Core` says "as of PG-1 she is unable to go home" — FAILS.
- **Negative**: `Pressure Behavior` cites `BEL-2` or `STPLAN-4` as current authority — FAILS.

## Files to Touch

- `tools/validators/src/structural/_stchar-operational-sections.ts` (new — shared constant)
- `tools/validators/src/structural/stchar-source-fact-coverage.ts` (modify — refactor to import shared constant)
- `tools/validators/src/structural/stchar-temporal-reference-boundary.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/structural/stchar-temporal-reference-boundary.test.ts` (new)
- `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (likely modify — confirm refactored import doesn't break existing tests)

## Out of Scope

- The skill authoring instruction that motivates the validator (SPEC74STCHARDISBOU-001 — Durable-Authority Boundary section).
- Health-audit `stchar_temporal_authority_contamination` finding registration (SPEC74STCHARDISBOU-012).
- Migration of existing red-bunny STCHAR profiles that fail the validator (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'stcharTemporalReferenceBoundary' tools/validators/src/public/registry.ts` returns ≥2 matches (import + array entry).
2. `npm test --prefix tools/validators` PASSES with all new test cases AND existing `stchar-source-fact-coverage` tests (refactor preserves behavior).
3. A representative STCHAR profile citing `STEMO-1` in `Page-Plan Voice Block` FAILS the validator with the expected message.
4. A representative STCHAR profile citing `PG-1` in `Validation / Audit Anchors` PASSES (allowed context).
5. The same `OPERATIONAL_TARGET_SECTIONS` set is imported by both validators (`grep -nE 'from.*_stchar-operational-sections|import.*OPERATIONAL_TARGET_SECTIONS' tools/validators/src/structural/stchar-*.ts` returns ≥2 matches).

### Invariants

1. Operational STCHAR sections cite temporal-state record-class ids only in allowed contexts (frontmatter, Source Distillation, Validation / Audit Anchors).
2. The 11-H2 OPERATIONAL_TARGET_SECTIONS set has a single source — duplication between validators is removed.
3. The validator detects record-class-id occurrences structurally; it does NOT regex prose semantics ("today", "now", "opening").

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-temporal-reference-boundary.test.ts` (new) — positive (allowed contexts, no record ids) + negative (record ids in operational sections) cases per SPEC-74 §7.
2. `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (modify if needed) — confirm the refactor to import the shared constant preserves existing test behavior.

### Commands

1. `npm test --prefix tools/validators` (confirms all validator tests pass, including new file + refactored source-fact-coverage)
2. `grep -nE 'from.*_stchar-operational-sections' tools/validators/src/structural/stchar-*.ts` (confirms both validators import the shared constant)
3. Dry-run the validator against a contaminated red-bunny STCHAR fixture to confirm FAIL with the expected failure message.
