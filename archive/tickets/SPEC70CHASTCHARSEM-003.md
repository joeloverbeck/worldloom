# SPEC70CHASTCHARSEM-003: New `stchar_source_fact_coverage` validator + golden fixtures

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new structural validator `tools/validators/src/structural/stchar-source-fact-coverage.ts` registered in `tools/validators/src/public/registry.ts`; consumes the §2.3 schema field (`archive/tickets/SPEC70CHASTCHARSEM-001.md`) and reads source `CHAR` via typed retrieval. Same-seam registry inventory/count surfaces were updated in `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`.
**Deps**: archive/tickets/SPEC70CHASTCHARSEM-001.md, archive/tickets/SPEC70CHASTCHARSEM-002.md

## Problem

At intake, SPEC-70 §2.4 identified that nothing deterministically proved the structured operational facts of a source `CHAR` (the 10 `dramatic_core` engine fields) were carried into operational STCHAR homes rather than stranded in `## Source Distillation`. This ticket added the `stchar_source_fact_coverage` validator: for each `world_char` STCHAR it resolves the source `CHAR`, requires a `source_operational_fact_map` entry per present structured field, and enforces the disposition / `target_section`-not-`Source Distillation` / rationale-required rules. The SPEC-70 §6 triggering failure case is now a regression test.

## Assumption Reassessment (2026-05-22)

1. At reassessment before implementation, `tools/validators/src/public/registry.ts` registered structural validators via `import { fnName } from "../structural/<file>.js"` + a registry-array entry, and `tools/validators/src/structural/stchar-utils.ts` exported `STCHAR_RELEVANT_OPS` containing `append_story_character_authority_record` and `supersede_story_character_authority_record` — the new validator now threads through the same STCHAR pre-apply scoping. The proposed path `tools/validators/src/structural/stchar-source-fact-coverage.ts` had no collision before this ticket created it. A sibling `stchar-source-hash-matches-source.ts` validator already read source `CHAR` content for hash-match, so this ticket reused its source-`CHAR` typed-retrieval pattern rather than inventing a new read path.
2. Spec source: SPEC-70 §2.4 (validator steps 1-5), §2.3 (the map field this validator consumes), §3 (migration: skip/warn legacy `world_char` STCHAR lacking the field; `source_char_hash` drift → coverage-staleness drift not silent pass), §6 (the six golden fixtures + the `story_local` exemption case).
3. Cross-artifact boundary under audit: this validator CONSUMES (does not define) the `source_operational_fact_map` field from `archive/tickets/SPEC70CHASTCHARSEM-001.md` — declare that archived ticket as a dependency. It reads the source `CHAR` (world canon) read-only via typed retrieval to enumerate the 10 `dramatic_core` engine fields present. It depends on `archive/tickets/SPEC70CHASTCHARSEM-002.md` only for fixture realism: the "valid mapped" golden STCHAR must carry the §2.2 H3 subsections (otherwise `stchar-body-integrity` would FAIL the fixture for an unrelated reason).
4. FOUNDATIONS §Tooling Recommendation: LLM agents never operate on prose alone; the source-`CHAR` read uses typed retrieval (never a bulk `_source/` read), and the validator gates only the closed, machine-parseable `dramatic_core` fields — deterministic. It does NOT parse the free-prose `## Capabilities` / `## Signature Scene Behavior` body sections (SPEC-70 §4 out-of-scope; avoids the false-positive risk of fragile prose parsing). Literary adequacy and per-page capability relevance stay judgment, per the deterministic/judgment split.
5. Canon-Safety surface: this is a story-bundle structural validator under `tools/validators/src/structural/` (gates STCHAR record writes at engine pre-apply). It reads world `CHAR` read-only and writes nothing; it does NOT touch the Mystery Reserve firewall, HARD-GATE semantics, or canon-write ordering, and cannot resolve an `M-<integer>` entry. Migration discipline: FAIL for new/superseding `world_char` STCHAR; skip-or-WARN for untouched legacy `world_char` STCHAR lacking the field, for one revision cycle, so it never blocks unrelated story writes (in lockstep with SPEC70CHASTCHARSEM-002's body-integrity legacy window over the same 3 red-bunny records).

## Architecture Check

1. A dedicated coverage validator (rather than folding coverage into `stchar-body-integrity`) keeps the body-structural check (presence/hashes, no source read) separate from the source-coverage check (requires resolving the source `CHAR`) — different read dependencies, different failure semantics. Scoping coverage to the machine-parseable `dramatic_core` fields (not free-prose `## Capabilities`) is the structured-fields choice SPEC-70 §2.4 made to keep the gate deterministic and conservative.
2. No backwards-compatibility shim: the legacy skip/WARN window is a time-bounded migration posture, not a permanent dual path; new/superseding records FAIL immediately. The validator reuses the existing source-`CHAR` typed-retrieval pattern rather than introducing a parallel read path.

## Verification Layers

1. Triggering case (signature behavior mapped to `Source Distillation` with `disposition: copied`) → FAIL → structural test (the SPEC-70 §6 regression fixture).
2. A present `dramatic_core` field with no map entry → FAIL → structural test.
3. `disposition: omitted_with_rationale` with empty `rationale` → FAIL; with non-empty rationale → pass → structural test (two fixtures).
4. `source_kind: story_local` STCHAR with null/absent map → no verdict → structural test (exemption fixture).
5. Untouched legacy `world_char` STCHAR lacking the field → WARN (not FAIL), never blocks the patch plan → skill dry-run / structural test against the migration window.
6. `source_char_hash` no longer matches indexed source `CHAR` → coverage-staleness drift verdict, not silent pass → structural test.

## Landed Changes

### 1. New validator module

Created `tools/validators/src/structural/stchar-source-fact-coverage.ts` implementing SPEC-70 §2.4 steps 1-5: resolves source `CHAR` by `source_char_id` through the structural index, confirms `source_char_hash`, enumerates present structured `dramatic_core` engine fields, requires a `source_operational_fact_map` entry per present field, validates retained target sections, requires omission rationales, and reports source-hash drift before trusting the map. The validator emits FAIL for pre-apply/touched STCHAR records and WARN for untouched full-world legacy `world_char` STCHAR records lacking the map.

### 2. Register the validator

Added `import { stcharSourceFactCoverage } from "../structural/stchar-source-fact-coverage.js"` + the registry-array entry in `tools/validators/src/public/registry.ts`, scoped through the existing `appliesToStcharStoryState` / `STCHAR_RELEVANT_OPS` mechanism.

### 3. Golden fixtures

Added inline focused fixtures in `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts`: triggering-case-FAIL, valid-mapped-pass, missing-entry-FAIL, omitted-with-rationale-pass, missing-rationale-FAIL, `story_local` exemption, legacy-WARN, source-hash drift, and pre-apply applicability.

### 4. Same-seam registry inventory updates

Updated the package validator inventory and count/list assertions that move with a registered structural validator: `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`.

## Files to Touch

- `tools/validators/src/structural/stchar-source-fact-coverage.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (new)
- `tools/validators/README.md` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- Defining the `source_operational_fact_map` schema field (`archive/tickets/SPEC70CHASTCHARSEM-001.md`).
- The STCHAR H3 subsections / body-integrity extension (`archive/tickets/SPEC70CHASTCHARSEM-002.md`).
- Parsing the free-prose `## Capabilities` / `## Signature Scene Behavior` body sections of the source `CHAR` (SPEC-70 §4 — explicitly out of scope; structured `dramatic_core` fields only).
- The §16a packet capabilities line and contract prose (SPEC70CHASTCHARSEM-004).
- Backfilling `source_operational_fact_map` into the 3 red-bunny STCHAR records.

## Acceptance Criteria

### Tests That Passed

1. Triggering fixture (capability mapped only to `Source Distillation`) → FAIL.
2. Valid-mapped fixture (`disposition: copied`, `target_section: "Prose Rendering Constraints"`, behavior present in `### Signature scene behaviors to render`) → no verdict.
3. Missing-entry, missing-rationale → FAIL; omitted-with-rationale, `story_local`-null-map → pass.
4. Legacy `world_char` STCHAR lacking the field → WARN, patch plan not blocked.
5. `npm test` green in `tools/validators`.

### Invariants

1. The validator reads source `CHAR` read-only via typed retrieval and never via a bulk `_source/` read; it writes nothing.
2. Coverage is gated only over the machine-parseable `dramatic_core` engine fields; free-prose body sections are never parsed.
3. New/superseding `world_char` STCHAR FAIL on incomplete coverage; legacy untouched records only WARN (one revision cycle).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (new) — the SPEC-70 §6 fixtures plus source-hash drift and pre-apply applicability cases.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — registry list includes `stchar_source_fact_coverage`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — structural/all-validator counts account for the added validator.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — clean pre-apply skipped STCHAR-family execution count accounts for the added validator.

### Commands

1. `npm test --prefix tools/validators` — build + `node --test` over `dist/tests/**`.
2. `npm run build --prefix tools/validators` — tsc gate (no separate `typecheck` script).

## Verification Result

Completed 2026-05-22:

1. Pre-edit baseline: `npm test --prefix tools/validators` — PASS, 887/887 package subtests.
2. `npm run build --prefix tools/validators` — PASS after correcting the new test's synthetic patch-plan helper to the package `PatchPlanEnvelope` type.
3. Focused test: from `tools/validators`, `node --test dist/tests/structural/stchar-source-fact-coverage.test.js` — PASS, 9/9 focused subtests.
4. Same-seam count fallout proof: from `tools/validators`, `node --test dist/tests/integration/validate-patch-plan.test.js` — PASS, 20/20 subtests after updating the STCHAR-family skipped-validator count from 7 to 8.
5. Final package gate: `npm test --prefix tools/validators` — PASS, 896/896 package subtests.

## Outcome

Completed 2026-05-22. Added the `stchar_source_fact_coverage` structural validator and registered it in the validators package. The validator reads source `CHAR` records from the structural index, checks the recorded source hash before trusting coverage, enumerates present `dramatic_core` engine fields, and enforces `source_operational_fact_map` coverage/disposition rules without parsing free-prose `## Capabilities` or `## Signature Scene Behavior` body sections.

The validator fails pre-apply/touched incomplete `world_char` STCHAR records, warns for untouched legacy full-world records lacking the map, skips `story_local` STCHAR records, and preserves the SPEC-70 migration boundary without backfilling live red-bunny STCHAR files.

## Deviations

- The golden fixtures were implemented inline in `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` rather than under `tools/validators/tests/fixtures`; this is the package's existing focused structural-test style and keeps the synthetic source/STCHAR records local to the validator proof.
- Same-seam registry inventory/count surfaces had to move with the registry append: the README validator list, exact registry list test, SPEC-04 validator counts, and the clean pre-apply skipped STCHAR-family count.
- Existing ignored artifacts `tools/validators/dist/` and `tools/validators/node_modules/` were present before verification and left in place; `dist/` was refreshed by `npm run build` / `npm test`.
