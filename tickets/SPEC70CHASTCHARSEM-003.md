# SPEC70CHASTCHARSEM-003: New `stchar_source_fact_coverage` validator + golden fixtures

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new structural validator `tools/validators/src/structural/stchar-source-fact-coverage.ts` registered in `tools/validators/src/public/registry.ts`; consumes the §2.3 schema field (`archive/tickets/SPEC70CHASTCHARSEM-001.md`) and reads source `CHAR` via typed retrieval. No impact on existing validators (registry append + new file).
**Deps**: archive/tickets/SPEC70CHASTCHARSEM-001.md, archive/tickets/SPEC70CHASTCHARSEM-002.md

## Problem

SPEC-70 §2.4: nothing deterministically proves that the structured operational facts of a source `CHAR` (the 10 `dramatic_core` engine fields) were carried into operational STCHAR homes rather than stranded in `## Source Distillation`. This ticket adds the `stchar_source_fact_coverage` validator: for each `world_char` STCHAR it resolves the source `CHAR`, requires a `source_operational_fact_map` entry per present structured field, and enforces the disposition / `target_section`-not-`Source Distillation` / rationale-required rules. Ships with the SPEC-70 §6 golden fixtures (the triggering failure case becomes a regression).

## Assumption Reassessment (2026-05-22)

1. `tools/validators/src/public/registry.ts` registers structural validators via `import { fnName } from "../structural/<file>.js"` + a registry-array entry (verified: `stcharBodyIntegrity` at line 73, `pagePlanStcharPacketIntegrity` at line 34). `tools/validators/src/structural/stchar-utils.ts` exports `STCHAR_RELEVANT_OPS` containing `append_story_character_authority_record` and `supersede_story_character_authority_record` (lines 21-22) — the new validator threads through the same STCHAR pre-apply scoping. The proposed path `tools/validators/src/structural/stchar-source-fact-coverage.ts` does not exist (no collision). A sibling `stchar-source-hash-matches-source.ts` validator already reads source `CHAR` content for hash-match — reuse its source-`CHAR` typed-retrieval pattern rather than inventing a new read path.
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

## What to Change

### 1. New validator module

Create `tools/validators/src/structural/stchar-source-fact-coverage.ts` implementing SPEC-70 §2.4 steps 1-5: resolve source `CHAR` by `source_char_id` (typed retrieval) and confirm `source_char_hash`; enumerate the 10 structured `dramatic_core` engine fields present (array fields `signature_scene_behaviors[]` / `relational_charge[]` covered by one field-level entry each); require a `source_operational_fact_map` entry per present field; validate `disposition` enum, `target_section` ≠ `Source Distillation` for `copied`/`transformed`/`compressed`, and `rationale` non-empty for `omitted_with_rationale`/`story_irrelevant`; FAIL on missing entry / retained-fact-targets-Source-Distillation / omission-without-rationale.

### 2. Register the validator

Add `import { stcharSourceFactCoverage } from "../structural/stchar-source-fact-coverage.js"` + the registry-array entry in `tools/validators/src/public/registry.ts`, scoped to the STCHAR pre-apply ops via the existing `STCHAR_RELEVANT_OPS` mechanism.

### 3. Golden fixtures

Add the SPEC-70 §6 fixtures under `tools/validators/tests/fixtures` (or inline in the test): triggering-case-FAIL, valid-mapped-pass (with §2.2 subsections present), missing-entry-FAIL, omitted-with-rationale-pass, missing-rationale-FAIL, `story_local`-exemption, legacy-WARN.

## Files to Touch

- `tools/validators/src/structural/stchar-source-fact-coverage.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (new)

## Out of Scope

- Defining the `source_operational_fact_map` schema field (`archive/tickets/SPEC70CHASTCHARSEM-001.md`).
- The STCHAR H3 subsections / body-integrity extension (`archive/tickets/SPEC70CHASTCHARSEM-002.md`).
- Parsing the free-prose `## Capabilities` / `## Signature Scene Behavior` body sections of the source `CHAR` (SPEC-70 §4 — explicitly out of scope; structured `dramatic_core` fields only).
- The §16a packet capabilities line and contract prose (SPEC70CHASTCHARSEM-004).
- Backfilling `source_operational_fact_map` into the 3 red-bunny STCHAR records.

## Acceptance Criteria

### Tests That Must Pass

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

1. `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (new) — the seven SPEC-70 §6 fixtures as discrete cases.

### Commands

1. `npm test --prefix tools/validators` — build + `node --test` over `dist/tests/**`.
2. `npm run build --prefix tools/validators` — tsc gate (no separate `typecheck` script).
