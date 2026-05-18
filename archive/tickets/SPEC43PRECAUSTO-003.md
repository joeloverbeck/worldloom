# SPEC43PRECAUSTO-003: Generic `midstory_record_introduction_grounding` Validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (generic introduction validator gating any mid-story-created CLK / STSEC / STQ / THR / STENT / SREL via the `intro:<CLASS>(...)` tag from ticket 001). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets; see Step 6.5 overlap note).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md, archive/tickets/SPEC43PRECAUSTO-002.md

## Problem

SPEC-43 §Approach D's first validator entry — `midstory_record_introduction_grounding` — is the generic gate that runs at branching-story-turn-cycle's Phase 9 (per spec §Approach H) for every mid-story-created CLK / STSEC / STQ / THR / STENT / SREL. It enforces (a) the new record's id appears in the creating SE's `state_delta.create[]`, (b) `created_at_page` equals the new child PG, (c) the `intro:<CLASS>(...)` tag parses via ticket 001's `parseIntroTag()`, (d) every evidence record-id in the tag exists and is parent-active, same-event-created, or the creating SE itself. Per-class validators (tickets 004-009) layer class-specific grounding requirements on top of this generic gate; without the generic gate, each per-class validator would re-implement these four common checks.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/public/registry.ts` follows the import-then-array-append pattern (verified at registry.ts lines 1-50). Each new validator adds one import line + one array entry. 9 SPEC-43 tickets touch this file (tickets 003-012); per §Step 6.5, implementers should coordinate slot ordering — conflicts are mechanical (different lines, no semantic overlap).
2. SPEC-43 §Approach D Table row 1 specifies the generic validator's failure codes: `midstory_intro_missing_state_delta`, `midstory_intro_created_at_mismatch`, `midstory_intro_missing_tag`, `midstory_intro_evidence_missing`. SPEC-43 §Approach A corollary 1 ("Same-event authority") is the structural rule this validator enforces.
3. Cross-skill boundary under audit: this validator is consumed by branching-story-turn-cycle's Phase 9 (per ticket 013). The live `Validator` API exposes run-mode applicability through `applies_to(ctx)`, so the equivalent run-mode contract is full-world plus story-bundle pre-apply/incremental predicates for SE / PG / the six introducible record classes. The failure codes are surfaced in validator output for later SAU/health-audit integration (per ticket 016).
4. FOUNDATIONS §Story Bundles §5c (Present Causal State) + §5a (Commitment Blocks Are Causal Moves) restated: the generic validator's "evidence ids exist and are parent-active or same-event-created" check is what enforces §5c at engine pre-apply time — every introduction must be grounded in present state (the parent snapshot) or the just-committed event (the same SE), never in future scene structure. §5a alignment: the introduction is the effect of the selected `SLT` / JIT `SLT` causal move; the validator verifies the move authored the new record into `SE.state_delta.create[]`.
5. HARD-GATE / Canon Safety surface: this validator gates story-bundle record writes at Phase 9 of branching-story-turn-cycle (per SPEC-43 §Approach H). The change does not weaken the Mystery Reserve firewall — that's preserved by `secret-mystery-firewall-compliance.ts` + ticket 005 (`secret-introduction-anchor-integrity.ts`), which run independently.
6. Live validator API correction: `Validator` objects use `severity_mode: "fail"` and an `applies_to(ctx)` predicate, not a literal `applies_to: ["branching-story-turn-cycle"]` list. The live run-mode equivalent is full-world plus pre-apply/incremental story-bundle create/touched-file predicates for SE / PG / the six introducible record classes.
7. Live node-type correction: THR and SREL records are indexed as `thread_record` and `relationship_record_story` (verified in `tools/validators/src/structural/utils.ts`), even though the synthetic fixture manifest still labels some prose examples with drafted names. Tests must adapt the fixture intent to live `IndexedRecord` node types before validation.
8. Same-event evidence correction: ticket 002's accepted fixture uses the creating `SE` id itself as evidence for an introduction tag. The generic evidence set therefore includes parent-active ids, ids in `SE.state_delta.create[]`, and the current event id; this preserves SPEC-43's same-event authority while matching the landed fixture contract.

## Architecture Check

1. Cleaner than alternative #1 (per-class validators each re-check generic grounding): four common checks (state_delta membership, created_at match, tag parses, evidence ids exist) ×6 per-class validators = 24 duplicated checks. The generic validator runs once; per-class validators layer class-specific requirements (CLK driver presence, STSEC truth_anchor, STQ source_event=creating SE, etc.) without re-checking the generic four.
2. Cleaner than alternative #2 (fold generic checks into every per-class validator): same duplication risk; harder to reason about per-class scope when each validator includes generic + class-specific checks intermixed.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "midstoryRecordIntroductionGrounding\|midstory_record_introduction_grounding" tools/validators/src/public/registry.ts` returns the import + array entry.
2. Generic grounding gate enforcement → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `creation-pass/all-classes.yaml` cases pass (returns no failures); `creation-fail/failure-cases.yaml` cases for `missing-intro-tag`, `intro-evidence-missing`, and `created-at-mismatch` fail with the expected failure codes.
3. Tag-parser composition → schema validation: validator calls `parseIntroTag()` from `midstory-introduction-utils.ts` (ticket 001); malformed tags surface `midstory_intro_missing_tag` (not a separate parse-error code).
4. FOUNDATIONS §5c + §5a alignment → FOUNDATIONS alignment check: the four checks enforce same-event authority + present-causal grounding without referencing any future-shape predicate.

## What to Change

### 1. Create `tools/validators/src/structural/midstory-record-introduction-grounding.ts`

Validator object:
- `name: "midstory_record_introduction_grounding"`.
- `severity_mode: "fail"`.
- `applies_to(ctx)` returns true for full-world validation, relevant story-bundle pre-apply plans, and incremental touched files under events/pages or the six introducible record directories.
- Per-event walk: for each SE in the bundle, call `extractIntroTags(se.world_logic_rationale)`; for each `ParsedIntroTag`:
  - Verify `tag.recordId` appears in `se.state_delta.create[]` → emit `midstory_intro_missing_state_delta` if not.
  - Load the record file at `_source/<class-dir>/<recordId>.yaml`; verify `created_at_page` equals the SE's resulting PG → emit `midstory_intro_created_at_mismatch` if not.
  - For each evidence id in `tag.evidence`: verify it appears either in the parent PG's `state_snapshot.active_records.<class>[]` (parent-active), in `se.state_delta.create[]` (same-event-created), or is the creating SE id itself → emit `midstory_intro_evidence_missing` per absent id.
- Per-event walk additionally: for each id in `se.state_delta.create[]` of one of the 6 mid-story-introducible classes, verify a corresponding `intro:<CLASS>(id=...)` tag exists in `se.world_logic_rationale` → emit `midstory_intro_missing_tag` if not.

Implementation pattern follows `non-propagation-tag-shape.ts:44-131` (read `SE.world_logic_rationale` via `stringValue()`; emit typed failures).

### 2. Register in `tools/validators/src/public/registry.ts`

Add import:
```typescript
import { midstoryRecordIntroductionGrounding } from "../structural/midstory-record-introduction-grounding.js";
```

Add to the registered-validators export array (alphabetical insertion or end-of-array per registry convention; coordinate slot ordering with tickets 004-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass for each of 6 classes → validator returns 0 failures.
- creation-fail: tag missing → emits `midstory_intro_missing_tag`.
- creation-fail: evidence id absent → emits `midstory_intro_evidence_missing` with the absent id named.
- creation-fail: state_delta membership missing → emits `midstory_intro_missing_state_delta`.
- creation-fail: created_at mismatch → emits `midstory_intro_created_at_mismatch`.

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `midstory_record_introduction_grounding` to the validator-name assertion list (coordinate with tickets 004-012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count assertion)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean non-story pre-apply skip assertion)
- `tools/validators/README.md` (modify — structural validator inventory/status count)

## Out of Scope

- Per-class grounding rules (CLK driver, STSEC truth_anchor, STQ source_event=creating SE, etc.) — deferred to tickets 004-009.
- Tag parser implementation — already lives in `midstory-introduction-utils.ts` (ticket 001); this validator imports.
- Observer firewall (does the actor have an access route?) — deferred to ticket 011.
- Narrative-shape field rejection — deferred to ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/validators && cd tools/validators && node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` (test file passes).
2. `npm test --prefix tools/validators` (full validator package test pass; registry.test.ts includes the new validator).
3. `grep -n "midstoryRecordIntroductionGrounding\|midstory_record_introduction_grounding" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. Generic grounding checks run before per-class grounding checks (tickets 004-009 layer additional class-specific requirements; a failure at the generic gate short-circuits per-class evaluation — same-record validator composition pattern).
2. The validator never reads world canon (CF / CH / INV / M / OQ / ENT / SEC records); story-bundle introduction is gated against story-bundle state + the just-committed event only.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` — covers 4 failure codes + pass case per class; uses ticket 002's fixtures.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds `midstory_record_introduction_grounding` to the validator-name assertion (coordinate with tickets 004-012 per §Step 6.5).
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — confirms the validator is skipped for clean world-canon-only pre-apply plans.
4. `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — updates active structural/total validator counts.

### Commands

1. `npm run build --prefix tools/validators && cd tools/validators && node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` (targeted test pass).
2. `cd tools/validators && node --test --test-name-pattern "clean pre-apply" dist/tests/integration/validate-patch-plan.test.js` (clean non-story pre-apply skip proof).
3. `npm test --prefix tools/validators` (full validator package test pass; registry assertions include the new validator).

## Outcome

Completed: 2026-05-18.

Implemented `midstory_record_introduction_grounding` as an additive structural validator in `tools/validators/src/structural/midstory-record-introduction-grounding.ts` and registered it in `tools/validators/src/public/registry.ts`. The validator runs for full-world validation, relevant story-bundle pre-apply plans, and incremental touches to SE / PG / the six introducible record classes. It enforces the generic SPEC-43 grounding checks: matching `SE.state_delta.create[]`, matching `created_at_page`, parseable `intro:<CLASS>(...)` tags through the ticket 001 parser, and evidence ids grounded in the parent PG snapshot, same-event creates, or the creating SE itself.

Added focused structural tests covering the creation-pass fixture for all six classes plus `midstory_intro_missing_tag`, `midstory_intro_missing_state_delta`, `midstory_intro_evidence_missing`, and `midstory_intro_created_at_mismatch`. Updated registry, validator count, README inventory, and clean non-story pre-apply skip assertions so the package's broader guardrails remain truthful.

## Verification Result

- `node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` passed after `npm run build --prefix tools/validators`: 6 tests, 0 failures.
- `node --test --test-name-pattern "clean pre-apply" dist/tests/integration/validate-patch-plan.test.js` passed from `tools/validators`: 1 test, 0 failures.
- `npm test --prefix tools/validators` passed: 422 tests, 0 failures.
- `grep -n "midstoryRecordIntroductionGrounding\|midstory_record_introduction_grounding" tools/validators/src/public/registry.ts` returned the import and structural registry entry.

## Deviations

- The drafted `npm test --prefix tools/validators -- midstory-record-introduction-grounding` targeted command was not a true narrow target in this package: the package script still runs the compiled glob and treats the extra argument as an additional test path. The actual narrow proof used the compiled test directly after build.
- The live validator API uses `severity_mode` plus `applies_to(ctx)`, not a literal `applies_to: ["branching-story-turn-cycle"]` list. The implementation records the equivalent live run-mode predicate.
- The ticket 002 fixture manifest remains YAML-clustered fixture data rather than a complete indexed bundle. The new test adapts that fixture into live `IndexedRecord` shapes, including the current `thread_record` and `relationship_record_story` node types.
