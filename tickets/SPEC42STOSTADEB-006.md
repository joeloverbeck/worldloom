# SPEC42STOSTADEB-006: STSEC validators + predicates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 3 new STSEC-specific structural validators under `tools/validators/src/structural/`, 4 new STSEC-specific predicates to the closed predicate DSL, and registers all 3 validators in the validator registry; integrates with the existing Mystery Reserve firewall via the `secret_mystery_firewall_compliance` validator; no existing validators or predicates altered
**Deps**: archive/tickets/SPEC42STOSTADEB-002.md

## Problem

SPEC42STOSTADEB-002 landed the STSEC class foundation, but STSEC records have no validator coverage yet — clue-carrier references can point at non-existent records, critical secrets can be revealed without clue support (violating fair-revelation discipline), and the Mystery Reserve firewall integration needs explicit enforcement at the STSEC layer. Storylets also cannot precondition on secret state because the predicate DSL has no `secret_*` predicates yet. This ticket lands the STSEC-specific validator + predicate layer as one cohesive PR. The `critical_secret_clue_coverage_when_revealed` validator implements the structural defense for SPEC-42 §Risks open question (default: minimum 2 discovered carriers; optional per-STSEC override field flagged for future spec).

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` exists (this ticket's `secret_mystery_firewall_compliance` validator defers to it); `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` shared file with -005 / -007; `tools/validators/src/public/registry.ts` shared file with -005 / -007 / -008. Existing `unresolved_mystery_claims[].status: clue_added | narrowed | apparent_resolution | held_for_promotion` enum at `tools/validators/src/schemas/story-page.schema.json` (verified by brainstorm agent reports) is the canonical world-level mystery-accretion tracker that STSEC complements at the story-local layer.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables Validators section (STSEC validators 3 listed) + §Deliverables Predicate DSL extensions (STSEC predicates 4 listed) + §Verification Validator-level section + §Risks "STSEC `critical_secret_clue_coverage_when_revealed` minimum threshold" open question (current proposal: minimum 2; alternative: per-STSEC `coverage_policy.minimum_clues_required` override field — RECOMMENDATION in spec is default 2 with optional override). This ticket implements the default-2 structural minimum; the optional per-STSEC override field is deferred to a follow-up decision flagged in spec §Out of Scope.
3. Cross-skill / cross-tool shared boundary: same as -005 — `predicate-dsl-grammar.ts` and `registry.ts` are shared. The **`rule7_mystery_reserve_preservation` validator** is the canonical world-level mystery-firewall enforcer; this ticket's `secret_mystery_firewall_compliance` validator is a STSEC-specific structural defense that defers to Rule 7 enforcement for `protected_mystery_refs[]` resolution checks — the two validators compose: `secret_mystery_firewall_compliance` enforces STSEC-side structural correctness (the reference must resolve; revelation cannot proceed against a forbidden M-*), and `rule7_mystery_reserve_preservation` enforces the world-side firewall semantics.
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) motivates this ticket. STSEC.status: revealed cannot resolve a `M-*` entry with `status: forbidden`, regardless of clue coverage — this is structurally enforced by `secret_mystery_firewall_compliance` deferring to `rule7_mystery_reserve_preservation`. The `critical_secret_clue_coverage_when_revealed` validator implements the "fair revelation" discipline (sufficient clue carriers must precede the reveal event in the branch path) inspired by mystery-design literature cited in the ChatGPT-Pro proposal §6.5 (Mystery, clues, and revelation design; Alexandrian's Three Clue Rule; GUMSHOE core clues); SPEC-42 sets the default minimum at 2 (not 3) to avoid overconstraining open-ended fiction per SPEC-42 §Risks recommendation.
5. HARD-GATE validator surface: each of the 3 new validators registers in `tools/validators/src/public/registry.ts` and runs at engine pre-apply on every story-bundle commit involving STSEC records. The `secret_mystery_firewall_compliance` validator gates STSEC reveal ops against the world Mystery Reserve firewall — strengthening the Canon Safety surface. Mystery Reserve firewall verified: this ticket STRENGTHENS the firewall (adds a STSEC-side structural check that composes with existing Rule 7 enforcement); does NOT weaken it; does NOT silently resolve any Mystery Reserve entry.

## Architecture Check

1. **Per-class validator cohesion**: STSEC's 3 validators all enforce STSEC-specific invariants. Bundling them keeps STSEC-specific structural-defense logic reviewable as a unit.
2. **`secret_mystery_firewall_compliance` defers to existing Rule 7 validator**: rather than duplicating Mystery Reserve firewall logic, this validator delegates to `rule7_mystery_reserve_preservation` for the firewall-semantics check; its own contribution is the STSEC-side structural reference-resolution check. Two-validator composition keeps single-source-of-truth for firewall enforcement.
3. **Predicates ship alongside their validators**: the 4 STSEC predicates are consumed at storylet-eligibility time; `revelation_ready` in particular is tightly coupled to `critical_secret_clue_coverage_when_revealed` (the predicate returns true iff the validator would PASS on a hypothetical reveal at this page).
4. **Default-2 minimum is the structural baseline; optional per-STSEC override deferred**: the spec recommends a per-STSEC `coverage_policy.minimum_clues_required: <integer ≥ 1>` override field but defers the decision; this ticket implements the default-2 minimum without the override field, leaving room for a follow-up ticket to add the override if needed.

## Verification Layers

1. `secret_carrier_existence` FAILS for STSEC with `clue_carriers[].record` pointing at non-existent or branch-inactive record; PASSES otherwise → validator test
2. `critical_secret_clue_coverage_when_revealed` FAILS for STSEC with `salience: high` AND `status: revealed` AND fewer than 2 `clue_carriers[].status: discovered` entries preceding `reveal_event` in the branch path; PASSES with sufficient discovered carriers → validator test
3. `secret_mystery_firewall_compliance` FAILS for STSEC with `protected_mystery_refs[]` resolving to a forbidden `M-*` entry when `status: revealed`; PASSES for non-forbidden refs or non-revealed status → validator test (composes with `rule7_mystery_reserve_preservation`)
4. `secret_unrevealed(STSEC-<int>)` predicate returns true iff `STSEC.status ∈ {hidden, partially_revealed}` → predicate-DSL parser test
5. `secret_revealed(STSEC-<int>)` returns true iff `STSEC.status == revealed` → predicate-DSL parser test
6. `revelation_ready(STSEC-<int>)` returns true iff `critical_secret_clue_coverage_when_revealed` would PASS on a hypothetical reveal at this page → predicate-DSL parser test (composes with the validator)
7. `any_secret_unrevealed(alias, salience?, kind?)` actor-unbound existential → predicate-DSL parser test

## What to Change

### 1. `secret_carrier_existence` validator (new file)

Create `tools/validators/src/structural/secret-carrier-existence.ts`. Validates: every `STSEC.clue_carriers[].record` reference resolves to an existing record in the branch path; the carrier kind matches the actual record class (e.g., `kind: DA` references must point at DA records, not STOBJ). HARD-REJECT on broken references.

### 2. `critical_secret_clue_coverage_when_revealed` validator (new file)

Create `tools/validators/src/structural/critical-secret-clue-coverage-when-revealed.ts`. Validates: when `STSEC.salience: high` AND `STSEC.status: revealed`, at least 2 `clue_carriers[].status: discovered` entries must precede `STSEC.reveal_event` in the branch path. The "preceding in the branch path" check walks the branch's PG chain ancestor-ward from the page containing the reveal event. HARD-REJECT (or WARNING — match the existing convention for fair-revelation checks if precedent exists) on violation.

### 3. `secret_mystery_firewall_compliance` validator (new file)

Create `tools/validators/src/structural/secret-mystery-firewall-compliance.ts`. Validates: every `STSEC.protected_mystery_refs[]` entry resolves to a real `M-<integer>` Mystery Reserve record; when `STSEC.status: revealed`, NONE of the referenced `M-*` records may have `status: forbidden` (delegate the forbidden-status check to `rule7_mystery_reserve_preservation`). HARD-REJECT on forbidden-M resolution attempts.

### 4. Predicate DSL grammar extension (modify — shared file)

Modify `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` to add 4 new STSEC predicates:
- `secret_unrevealed(STSEC-<int>)` — true iff `STSEC.status ∈ {hidden, partially_revealed}`
- `secret_revealed(STSEC-<int>)` — true iff `STSEC.status == revealed`
- `revelation_ready(STSEC-<int>)` — true iff `critical_secret_clue_coverage_when_revealed` would PASS on a hypothetical reveal at this page (composes the validator's per-page check into a predicate)
- `any_secret_unrevealed(alias, salience?, kind?)` — actor-unbound existential; binds the matching STSEC to `alias`

**Shared-file coordination**: SPEC42STOSTADEB-005 (CLK predicates) and -007 (STQ predicates) also extend this file.

### 5. Validator registry extension (modify — shared file)

Modify `tools/validators/src/public/registry.ts` to register the 3 new STSEC validators in the structural-validators registry block.

**Shared-file coordination**: SPEC42STOSTADEB-005 / -007 / -008 also extend this file.

## Files to Touch

- `tools/validators/src/structural/secret-carrier-existence.ts` (new)
- `tools/validators/src/structural/critical-secret-clue-coverage-when-revealed.ts` (new)
- `tools/validators/src/structural/secret-mystery-firewall-compliance.ts` (new)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — adds 4 STSEC predicates; shared file with SPEC42STOSTADEB-005 / -007)
- `tools/validators/src/public/registry.ts` (modify — registers 3 new STSEC validators; shared file with SPEC42STOSTADEB-005 / -007 / -008)

## Out of Scope

- STSEC class foundation — owned by archive/tickets/SPEC42STOSTADEB-002.md
- CLK and STQ validators + predicates — owned by SPEC42STOSTADEB-005 / -007
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Per-STSEC `coverage_policy.minimum_clues_required: <integer ≥ 1>` override field (SPEC-42 §Risks open question) — deferred to a follow-up decision; this ticket implements the default-2 structural minimum only
- Storylet authoring extensions consuming new STSEC predicates — owned by SPEC42STOSTADEB-011
- Turn-cycle integration consuming new STSEC predicates at runtime — owned by SPEC42STOSTADEB-009
- Health-audit "under-supported revelation" check (uses `revelation_ready` predicate; complementary to this ticket's validator) — owned by SPEC42STOSTADEB-012

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all 3 new STSEC validators PASS on positive fixtures and FAIL with correct error messages on negative fixtures; all 4 new STSEC predicates parse and evaluate correctly
2. `npm test --prefix tools/validators` (regression) — existing structural validators (including `rule7_mystery_reserve_preservation`) still pass; `secret_mystery_firewall_compliance` composes correctly with Rule 7 enforcement

### Invariants

1. The closed predicate DSL grows by 4 entries (26 → 30 after this ticket cumulative with -005)
2. The structural validator registry grows by 3 entries
3. All 3 STSEC validators run at engine pre-apply on every story-bundle commit involving STSEC records
4. Mystery Reserve firewall is preserved by composition: `secret_mystery_firewall_compliance` HARD-REJECTs STSEC reveals against forbidden M-* entries, deferring forbidden-status checks to `rule7_mystery_reserve_preservation`
5. No existing validator's logic is altered

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/secret-carrier-existence.test.ts` (new) — positive + negative cases for clue-carrier resolution
2. `tools/validators/tests/structural/critical-secret-clue-coverage-when-revealed.test.ts` (new) — positive + negative cases for fair-revelation discipline (default-2 minimum)
3. `tools/validators/tests/structural/secret-mystery-firewall-compliance.test.ts` (new) — positive + negative cases for protected_mystery_refs resolution; composition test with `rule7_mystery_reserve_preservation` (forbidden M-* HARD-REJECT)
4. `tools/validators/tests/rules/_shared/predicate-dsl-grammar.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -007) — extend grammar-parser tests with the 4 new STSEC predicates
5. `tools/validators/tests/structural/registry.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -007 / -008) — extend registry-registration tests with the 3 new STSEC validators

### Commands

1. `npm test --prefix tools/validators` — full validator test pass with new STSEC coverage
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
