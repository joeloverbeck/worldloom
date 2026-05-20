# SPEC56STCHARMACFOU-003: STCHAR structural validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (6 new structural validators + registry registration + replay/closure validator updates + tests).
**Deps**: archive/tickets/SPEC56STCHARMACFOU-002.md

## Problem

STCHAR's correctness guarantees — non-background STENT must bind an STCHAR, references must resolve, the active STCHAR must be on-page, no superseded STCHAR is referenced by a later page, and (the load-bearing one) no story runtime cites `CHAR-*` as operational authority after STCHAR exists — are deterministic invariants that need structural validators. Without them the anti-split-authority guarantee is unenforced.

## Assumption Reassessment (2026-05-20)

1. Structural validators live in `tools/validators/src/structural/` and follow the `Validator` export shape `{ name, severity_mode, applies_to(), run() }` (e.g. `branch-isolation.ts`, `id-uniqueness.ts`, verified this session). They register in `tools/validators/src/public/registry.ts`; replay/closure validators are `snapshot-replay-equality.ts` and `recursive-reference-closure.ts` (both exist, confirmed).
2. The six validators + their semantics are specified in `specs/SPEC-56-stchar-machine-foundation.md` §Phase 3 (reassessed this session); `character_grounding_consistency` folds the report's separate choice/plan/emotion grounding validators into one (shared resolution logic).
3. **Cross-skill boundary under audit**: these validators consume the STCHAR schema (ticket 002) and the contract's STENT/active_records/grounding surfaces (ticket 001). `no_char_authority_in_story_runtime` enforces the world/story separation rule across story-bundle runtime records, page plans, and prose receipts — its exception set (STCHAR.source_char_id provenance + explicit promotion/adjudication surfaces) must match the contract's §Story-Local Character Authority wording exactly.
4. **FOUNDATIONS principle restatement**: §Story Bundles world/story separation — `no_char_authority_in_story_runtime` is the deterministic enforcement of "normal story runtime consumes active STCHAR, not world CHAR." This is the anti-split-authority guarantee; the validator must be kept strict (M5).
5. **Canon Safety surface** (`tools/validators/src/structural/`): these validators gate story-bundle record integrity at validation time. Confirm none weakens the Mystery Reserve firewall — STCHAR validators are orthogonal to MR (they govern character authority, not mystery resolution); the existing `rule7_mystery_reserve_preservation` and story mystery-firewall checks are untouched.

## Architecture Check

1. Folding the three grounding checks into one `character_grounding_consistency` validator (rather than three near-identical validators) keeps the validator set minimal while covering CHC/STPLAN/STEMO — they share STCHAR-in-grounding resolution logic. The other five are genuinely distinct invariants.
2. No backwards-compatibility aliasing: new validators are added to the registry; no existing validator is shimmed.

## Verification Layers

1. Each new validator fires on its failing fixture and passes its passing fixture → validator unit tests (`tests/structural/*`).
2. `no_char_authority_in_story_runtime` rejects a page plan / prose receipt citing `CHAR-*` as authority, allows `STCHAR.source_char_id` provenance → validator test with both cases.
3. `snapshot_replay_equality` + `recursive_reference_closure` accept STCHAR in `active_records` and follow `STENT→STCHAR` / `STCHAR→source CHAR` edges → updated replay/closure tests.
4. Registry exposes the six new validators → `tests/{rules,structural}/registry.test.ts` name-list assertion.

## What to Change

### 1. Six new structural validators

`stent_requires_stchar`, `stchar_resolves`, `stchar_active_for_bound_stent`, `stchar_supersession_integrity`, `no_char_authority_in_story_runtime`, `character_grounding_consistency` — each as a `Validator` module following the existing shape.

### 2. Registry registration

Add the six imports + array entries to `tools/validators/src/public/registry.ts`; extend the registry name-list test.

### 3. Replay/closure updates

`snapshot-replay-equality.ts` + `recursive-reference-closure.ts`: accept STCHAR in `active_records`; follow the STCHAR edges.

## Files to Touch

- `tools/validators/src/structural/stent-requires-stchar.ts` (new)
- `tools/validators/src/structural/stchar-resolves.ts` (new)
- `tools/validators/src/structural/stchar-active-for-bound-stent.ts` (new)
- `tools/validators/src/structural/stchar-supersession-integrity.ts` (new)
- `tools/validators/src/structural/no-char-authority-in-story-runtime.ts` (new)
- `tools/validators/src/structural/character-grounding-consistency.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/tests/structural/*` (new + modify — per-validator fixtures + registry test)

## Out of Scope

- Judgment-assisted voice/appraisal fidelity checks — those live in prose-attach / health-audit (SPEC-57), NOT deterministic validators.
- `page_plan_stchar_packet_presence` / hash-consistency checks — SPEC-57 (prose-attach / health-audit phase 2m).
- Schema definitions — ticket 002.

## Acceptance Criteria

### Tests That Must Pass

1. Each of the six validators has a passing fixture and a failing fixture; the direct-CHAR-authority leak and missing-STCHAR cases fail deterministically.
2. `snapshot_replay_equality` + `recursive_reference_closure` pass with STCHAR in `active_records`.
3. `npm test --prefix tools/validators` green; registry name-list assertion includes the six new validators.

### Invariants

1. After STCHAR exists for a story, no story-bundle runtime record / page plan / prose receipt cites `CHAR-*` as operational character authority (exceptions: STCHAR provenance, promotion/adjudication) — enforced by `no_char_authority_in_story_runtime`.
2. Every non-background STENT resolves to an active STCHAR present in its page's `active_records.STCHAR`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/*` (new) — one passing + one failing fixture per new validator.
2. `tools/validators/tests/{rules,structural}/registry.test.ts` (modify) — extend the validator name-list assertion.

### Commands

1. `npm run build --prefix tools/validators` (covers tsc).
2. `npm test --prefix tools/validators`.
