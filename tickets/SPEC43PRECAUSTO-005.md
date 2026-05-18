# SPEC43PRECAUSTO-005: `secret_introduction_anchor_integrity` Validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/secret-introduction-anchor-integrity.ts` (STSEC-specific introduction gate enforcing the first-lie rule + Mystery Reserve firewall preservation). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: 001, 002, 003

## Problem

SPEC-43 §Approach D Table row 3 + §Approach C STSEC rules + the §6a "first lie rule" require a STSEC-specific introduction validator that enforces: (a) `source_records[]` exists, naming records that made the secret branch-relevant; (b) `truth_anchor` exists if provided OR is null only when mystery/canon policy requires it; (c) `holders[]` are valid STENT ids or schema-allowed holder labels OR at least one of `holders` / `clue_carriers[]` / `truth_anchor` / `protected_mystery_refs[]` is populated (per SPEC-43 §Approach C STSEC "minimum grounding"). The validator also preserves the Mystery Reserve firewall — a new STSEC that touches Mystery Reserve must populate `protected_mystery_refs[]` and the existing `secret_mystery_firewall_compliance` validator's rules apply unchanged. Without this validator, an STSEC could land as a thin "author-only future twist" with no source records / holder / clue carrier / truth anchor — exactly the §5c anti-pattern.

## Assumption Reassessment (2026-05-18)

1. STSEC schema at `tools/validators/src/schemas/story-secret.schema.json` requires `["id", "story_id", "created_at_page", "secret_kind", "secret_claim", "holders", "source_records", "status"]` (verified via grep). `truth_anchor` is optional (line 26). `protected_mystery_refs` is optional (line 38). `clue_carriers` is optional (line 43). So the schema already enforces `holders` + `source_records` presence; this validator's job is to enforce that on mid-story creation those fields are NON-EMPTY and grounded in active records.
2. SPEC-43 §Approach C STSEC "first lie rule" restated in §Approach A corollary 6 of the SPEC: a first lie creates a `BEL` record (with appropriate `belief_mode` / `truth_relation`); STSEC creation is reserved for cases where the hidden truth must be tracked / protected / revealed through engine state. The validator does NOT enforce the BEL-creation side (that's authoring discipline); it enforces that an STSEC creation has the required grounding.
3. Cross-skill boundary under audit: this validator composes with the existing `secret-mystery-firewall-compliance.ts` (verified at `tools/validators/src/structural/` listing); the two validators run independently — firewall compliance governs Mystery Reserve interactions, introduction-anchor-integrity governs the STSEC's own grounding fields. The shared `secret-utils.ts` helper may be used for STSEC-shape helpers (parallel to `clock-utils.ts` usage in ticket 004).
4. FOUNDATIONS §Story Bundles §6a (Belief vs. Fact) restated: `BEL` records what a holder claims/believes/witnesses/lies about; `SF` records branch truth; STSEC binds together the BEL/SF/DA records pointing at the same hidden truth + names the secret's criticality. The "first lie rule" is the operational expression of §6a: a deceptive utterance creates a BEL with `truth_relation: false`; the STSEC only enters when the engine needs to track the hidden truth across multiple subsequent moves. Plus FOUNDATIONS §Validation Rules at story scope, Rule 7 (Preserve Mystery Deliberately): a new STSEC that references Mystery Reserve must not silently resolve an MR entry; the existing `secret_mystery_firewall_compliance` validator gates that.
5. HARD-GATE / Canon Safety surface: per-commit Phase 9 gate gating mid-story STSEC creation. This validator does NOT weaken the Mystery Reserve firewall — the existing `secret_mystery_firewall_compliance.ts` continues to gate MR interactions independently. The change preserves the §Rule 7 firewall by requiring `protected_mystery_refs[]` to be populated whenever the secret references MR; the validator emits `secret_intro_holder_missing` (or analogous failure code) when grounding evidence is absent across all four anchor fields, preventing thin "author-only" secrets that would skirt the firewall.

## Architecture Check

1. Cleaner than alternative #1 (fold STSEC checks into generic ticket-003): same per-class scoping rationale as ticket 004 — class-specific concerns live in per-class validators.
2. Cleaner than alternative #2 (extend existing `secret-mystery-firewall-compliance.ts`): that validator gates Mystery Reserve interactions specifically; introduction-anchor-integrity gates the STSEC's own grounding fields. Conflating them would couple mid-story creation tests to mystery firewall tests.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator; existing STSEC schema and `secret-mystery-firewall-compliance.ts` unchanged.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "secretIntroductionAnchorIntegrity\|secret_introduction_anchor_integrity" tools/validators/src/public/registry.ts` returns import + array entry.
2. Class-specific grounding enforcement → schema validation: ticket 002's `creation-pass/stsec-first-revealable-secret/` fixture passes; `creation-fail/stsec-author-only-future-twist/` fixture (no source records / holder / clue carrier / truth anchor) emits `secret_intro_missing_source` or `secret_intro_holder_missing`.
3. Mystery Reserve firewall preservation → FOUNDATIONS alignment check: a fixture where `protected_mystery_refs[]` references an MR entry passes both this validator AND `secret_mystery_firewall_compliance.ts`; a fixture that silently resolves an MR entry (without proper firewall handling) is caught by the existing firewall validator (separate ticket scope; out of scope here).
4. First-lie rule alignment → manual review: the validator does NOT enforce BEL creation (authoring discipline); reviewer confirms the test fixtures correctly exercise the boundary (a fixture where a lie is told and ONLY a BEL is created should pass schema validation; a fixture where an STSEC is created for that lie must satisfy this validator's grounding requirements).

## What to Change

### 1. Create `tools/validators/src/structural/secret-introduction-anchor-integrity.ts`

Validator object:
- `name: "secret_introduction_anchor_integrity"`.
- `applies_to: ["branching-story-turn-cycle"]`.
- `severity: "fail"`.
- For each STSEC record whose `created_at_page` is the new child PG (mid-story-created), verify:
  - `source_records[]` is non-empty AND every id resolves to a record active in parent PG OR created in the same SE.
  - `truth_anchor`, if non-null, exists in the bundle and is branch-legal (active record id).
  - `holders[]` is non-empty AND every id is a valid STENT-id (or schema-allowed holder label per the existing schema enum).
  - At least one of `holders` / `clue_carriers` / `truth_anchor` / `protected_mystery_refs` is populated (per SPEC-43 §Approach C STSEC "minimum grounding": at least one anchor).
- Failure codes: `secret_intro_missing_source`, `secret_intro_truth_anchor_missing`, `secret_intro_holder_missing`.

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-004, 006-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/secret-introduction-anchor-integrity.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass: first revealable secret (lie creates BEL + truth anchor SF + STSEC binding both, holders populated) → 0 failures.
- creation-fail: STSEC with empty source_records[] → emits `secret_intro_missing_source`.
- creation-fail: STSEC with empty holders[] AND empty clue_carriers[] AND null truth_anchor AND empty protected_mystery_refs[] → emits `secret_intro_holder_missing`.
- creation-fail: STSEC truth_anchor points to a non-existent record → emits `secret_intro_truth_anchor_missing`.
- mystery-firewall-still-valid: STSEC with populated protected_mystery_refs[] referencing an MR entry → 0 failures from this validator (the firewall validator runs independently).

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `secret_introduction_anchor_integrity` to the validator-name assertion list (coordinate with tickets 003-004, 006-012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/secret-introduction-anchor-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/secret-introduction-anchor-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)

## Out of Scope

- BEL creation discipline ("a first lie creates a BEL, not an STSEC") — authoring rule enforced by skill prose (ticket 015), not by validator.
- Mystery Reserve firewall logic — owned by existing `secret_mystery_firewall_compliance.ts`.
- Existing STSEC lifecycle (clue discovery, secret reveal) — owned by existing `critical_secret_clue_coverage_when_revealed.ts` + `secret_carrier_existence.ts`.
- Generic introduction grounding — handled by ticket 003.
- Narrative-shape field rejection on STSEC — handled by ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- secret-introduction-anchor-integrity` (test file passes).
2. `npm test --prefix tools/validators` (full validator package test pass).
3. `grep -n "secretIntroductionAnchorIntegrity\|secret_introduction_anchor_integrity" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The validator fires ONLY on mid-story-created STSEC records; root-bootstrapped STSEC (per `branching-story-bootstrap` §Approach C) is unaffected.
2. Mystery Reserve firewall logic remains owned by `secret_mystery_firewall_compliance.ts`; this validator does not duplicate or weaken that gate.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/secret-introduction-anchor-integrity.test.ts` — 5 test cases per §What to Change item 3; uses ticket 002's fixtures.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-004, 006-012 per §Step 6.5).

### Commands

1. `npm test --prefix tools/validators -- secret-introduction-anchor-integrity` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).
