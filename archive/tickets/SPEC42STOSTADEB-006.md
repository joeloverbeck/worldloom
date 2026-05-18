# SPEC42STOSTADEB-006: STSEC validators + predicates

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 3 new STSEC-specific structural validators under `tools/validators/src/structural/`, 4 new STSEC-specific predicates to the closed predicate DSL, and registers all 3 validators in the validator registry; integrates with the existing Mystery Reserve firewall via the `secret_mystery_firewall_compliance` validator; no existing predicate logic altered
**Deps**: archive/tickets/SPEC42STOSTADEB-002.md

## Problem

SPEC42STOSTADEB-002 landed the STSEC class foundation, but STSEC records have no validator coverage yet — clue-carrier references can point at non-existent records, critical secrets can be revealed without clue support (violating fair-revelation discipline), and the Mystery Reserve firewall integration needs explicit enforcement at the STSEC layer. Storylets also cannot precondition on secret state because the predicate DSL has no `secret_*` predicates yet. This ticket lands the STSEC-specific validator + predicate layer as one cohesive PR. The `critical_secret_clue_coverage_when_revealed` validator implements the structural defense for SPEC-42 §Risks open question (default: minimum 2 discovered carriers; optional per-STSEC override field flagged for future spec).

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` exists as the canonical world-level Mystery Reserve validator; this ticket's `secret_mystery_firewall_compliance` adds STSEC-side structural checks for `protected_mystery_refs[]` resolution and revealed-forbidden references. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and `tools/validators/src/public/registry.ts` are shared files with neighboring SPEC-42 tickets. Existing `unresolved_mystery_claims[].status: clue_added | narrowed | apparent_resolution | held_for_promotion` enum at `tools/validators/src/schemas/story-page.schema.json` is the canonical world-level mystery-accretion tracker that STSEC complements at the story-local layer.
2. Spec verified at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables Validators section (STSEC validators 3 listed) + §Deliverables Predicate DSL extensions (STSEC predicates 4 listed) + §Verification Validator-level section + §Risks "STSEC `critical_secret_clue_coverage_when_revealed` minimum threshold" open question (current proposal: minimum 2; alternative: per-STSEC `coverage_policy.minimum_clues_required` override field — RECOMMENDATION in spec is default 2 with optional override). This ticket implements the default-2 structural minimum; the optional per-STSEC override field is deferred to a follow-up decision flagged in spec §Out of Scope.
3. Cross-skill / cross-tool shared boundary: same as -005 — `predicate-dsl-grammar.ts` and `registry.ts` are shared. The **`rule7_mystery_reserve_preservation` validator** is the canonical world-level mystery-firewall enforcer; this ticket's `secret_mystery_firewall_compliance` validator is a STSEC-specific structural defense. The two validators compose: `secret_mystery_firewall_compliance` enforces STSEC-side structural correctness (the reference must resolve; revelation cannot proceed against a forbidden M-*), and `rule7_mystery_reserve_preservation` enforces the world-side firewall semantics.
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) motivates this ticket. STSEC.status: revealed cannot resolve a `M-*` entry with `status: forbidden`, regardless of clue coverage — this is structurally enforced by `secret_mystery_firewall_compliance` while `rule7_mystery_reserve_preservation` remains the world-level firewall validator. The `critical_secret_clue_coverage_when_revealed` validator implements the "fair revelation" discipline (sufficient clue carriers must precede the reveal event in the branch path) inspired by mystery-design literature cited in the ChatGPT-Pro proposal §6.5 (Mystery, clues, and revelation design; Alexandrian's Three Clue Rule; GUMSHOE core clues); SPEC-42 sets the default minimum at 2 (not 3) to avoid overconstraining open-ended fiction per SPEC-42 §Risks recommendation.
5. HARD-GATE validator surface: each of the 3 new validators registers in `tools/validators/src/public/registry.ts` and runs at engine pre-apply when patch plans include STSEC mutation ops. The `secret_mystery_firewall_compliance` validator gates STSEC reveal ops against the world Mystery Reserve firewall — strengthening the Canon Safety surface. Mystery Reserve firewall verified: this ticket STRENGTHENS the firewall (adds a STSEC-side structural check that composes with existing Rule 7 enforcement); does NOT weaken it; does NOT silently resolve any Mystery Reserve entry.
6. Live predicate boundary: `tools/validators` has a parser/schema/reference validator for storylet predicates, not a story-runtime predicate evaluator. This ticket therefore adds the STSEC predicate names, argument schemas, JSON schema mirrors, and `STSEC-*` reference validation; runtime truth evaluation remains owned by later turn-cycle integration work.

## Architecture Check

1. **Per-class validator cohesion**: STSEC's 3 validators all enforce STSEC-specific invariants. Bundling them keeps STSEC-specific structural-defense logic reviewable as a unit.
2. **`secret_mystery_firewall_compliance` composes with existing Rule 7 validator**: rather than changing the world-level Mystery Reserve rule, this validator adds the STSEC-side reference-resolution and revealed-forbidden checks. Two-validator composition keeps world-side firewall enforcement and STSEC-side structural enforcement separate.
3. **Predicates ship alongside their validator grammar hooks**: the 4 STSEC predicates are added to the closed storylet predicate grammar, schema mirror, and reference validator. Later storylet-eligibility/runtime integration owns truth evaluation of `secret_unrevealed`, `secret_revealed`, `revelation_ready`, and `any_secret_unrevealed`.
4. **Default-2 minimum is the structural baseline; optional per-STSEC override deferred**: the spec recommends a per-STSEC `coverage_policy.minimum_clues_required: <integer ≥ 1>` override field but defers the decision; this ticket implements the default-2 minimum without the override field, leaving room for a follow-up ticket to add the override if needed.

## Verification Layers

1. `secret_carrier_existence` FAILS for STSEC with `clue_carriers[].record` pointing at non-existent or branch-inactive record; PASSES otherwise → validator test
2. `critical_secret_clue_coverage_when_revealed` FAILS for STSEC with `salience: high` AND `status: revealed` AND fewer than 2 `clue_carriers[].status: discovered` entries preceding `reveal_event` in the branch path; PASSES with sufficient discovered carriers → validator test
3. `secret_mystery_firewall_compliance` FAILS for STSEC with `protected_mystery_refs[]` resolving to a forbidden `M-*` entry when `status: revealed`; PASSES for non-forbidden refs or non-revealed status → validator test (composes with `rule7_mystery_reserve_preservation`)
4. `secret_unrevealed(STSEC-<int>)` parses, schema-validates, and reference-validates against existing `story_secret_record` ids → predicate-DSL parser test
5. `secret_revealed(STSEC-<int>)` parses, schema-validates, and reference-validates against existing `story_secret_record` ids → predicate-DSL parser test
6. `revelation_ready(STSEC-<int>)` parses, schema-validates, and reference-validates against existing `story_secret_record` ids → predicate-DSL parser test
7. `any_secret_unrevealed(alias, salience?, kind?)` actor-unbound existential parses with optional salience/kind filters → predicate-DSL parser test

## What to Change

### 1. `secret_carrier_existence` validator (new file)

Create `tools/validators/src/structural/secret-carrier-existence.ts`. Validates: every `STSEC.clue_carriers[].record` reference resolves to an existing record in the branch path; the carrier kind matches the actual record class (e.g., `kind: DA` references must point at DA records, not STOBJ). HARD-REJECT on broken references.

### 2. `critical_secret_clue_coverage_when_revealed` validator (new file)

Create `tools/validators/src/structural/critical-secret-clue-coverage-when-revealed.ts`. Validates: when `STSEC.salience: high` AND `STSEC.status: revealed`, at least 2 `clue_carriers[].status: discovered` entries must precede `STSEC.reveal_event` in the branch path. The "preceding in the branch path" check walks the branch's PG chain ancestor-ward from the page containing the reveal event. HARD-REJECT (or WARNING — match the existing convention for fair-revelation checks if precedent exists) on violation.

### 3. `secret_mystery_firewall_compliance` validator (new file)

Create `tools/validators/src/structural/secret-mystery-firewall-compliance.ts`. Validates: every `STSEC.protected_mystery_refs[]` entry resolves to a real `M-<integer>` Mystery Reserve record; when `STSEC.status: revealed`, NONE of the referenced `M-*` records may have `status: forbidden`. HARD-REJECT on forbidden-M resolution attempts.

### 4. Predicate DSL grammar extension (modify — shared file)

Modify `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` to add 4 new STSEC predicates:
- `secret_unrevealed(STSEC-<int>)`
- `secret_revealed(STSEC-<int>)`
- `revelation_ready(STSEC-<int>)`
- `any_secret_unrevealed(alias, salience?, kind?)` — actor-unbound existential; binds the matching STSEC to `alias`

This package validates predicate shape and references; runtime truth evaluation belongs to SPEC42STOSTADEB-009 / storylet integration.

**Shared-file coordination**: SPEC42STOSTADEB-005 (CLK predicates) and -007 (STQ predicates) also extend this file.

### 5. Validator registry extension (modify — shared file)

Modify `tools/validators/src/public/registry.ts` to register the 3 new STSEC validators in the structural-validators registry block.

**Shared-file coordination**: SPEC42STOSTADEB-005 / -007 / -008 also extend this file.

## Files to Touch

- `tools/validators/src/structural/secret-carrier-existence.ts` (new)
- `tools/validators/src/structural/critical-secret-clue-coverage-when-revealed.ts` (new)
- `tools/validators/src/structural/secret-mystery-firewall-compliance.ts` (new)
- `tools/validators/src/structural/secret-utils.ts` (new shared STSEC validator utilities)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — adds 4 STSEC predicates; shared file with SPEC42STOSTADEB-005 / -007)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — validates STSEC predicate references and `any_secret_unrevealed` filters)
- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify — mirrors the new predicates and STSEC active-record patterns)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify — mirrors the closed predicate enum)
- `tools/validators/src/public/registry.ts` (modify — registers 3 new STSEC validators; shared file with SPEC42STOSTADEB-005 / -007 / -008)
- `tools/validators/tests/structural/secret-carrier-existence.test.ts` (new)
- `tools/validators/tests/structural/critical-secret-clue-coverage-when-revealed.test.ts` (new)
- `tools/validators/tests/structural/secret-mystery-firewall-compliance.test.ts` (new)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- STSEC class foundation — owned by archive/tickets/SPEC42STOSTADEB-002.md
- CLK and STQ validators + predicates — owned by SPEC42STOSTADEB-005 / -007
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Per-STSEC `coverage_policy.minimum_clues_required: <integer ≥ 1>` override field (SPEC-42 §Risks open question) — deferred to a follow-up decision; this ticket implements the default-2 structural minimum only
- Storylet authoring extensions consuming new STSEC predicates — owned by archive/tickets/SPEC42STOSTADEB-011.md
- Turn-cycle integration consuming new STSEC predicates at runtime — owned by SPEC42STOSTADEB-009
- Health-audit "under-supported revelation" check (uses `revelation_ready` predicate; complementary to this ticket's validator) — landed in `archive/tickets/SPEC42STOSTADEB-012.md`

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all 3 new STSEC validators PASS on positive fixtures and FAIL with correct error messages on negative fixtures; all 4 new STSEC predicates parse, schema-validate, and reference-validate correctly
2. `npm test --prefix tools/validators` (regression) — existing structural validators (including `rule7_mystery_reserve_preservation`) still pass; `secret_mystery_firewall_compliance` composes correctly with Rule 7 enforcement

### Invariants

1. The closed predicate DSL grows by 4 entries (28 → 32 after this ticket cumulative with -005)
2. The structural validator registry grows by 3 entries
3. All 3 STSEC validators run at engine pre-apply on every story-bundle commit involving STSEC records
4. Mystery Reserve firewall is preserved by composition: `secret_mystery_firewall_compliance` HARD-REJECTs STSEC reveals against forbidden M-* entries while `rule7_mystery_reserve_preservation` remains the world-level firewall validator
5. No existing validator's rule logic is altered; registry/count assertions and pre-apply skip expectations were updated for the new validators

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/secret-carrier-existence.test.ts` (new) — positive + negative cases for clue-carrier resolution
2. `tools/validators/tests/structural/critical-secret-clue-coverage-when-revealed.test.ts` (new) — positive + negative cases for fair-revelation discipline (default-2 minimum)
3. `tools/validators/tests/structural/secret-mystery-firewall-compliance.test.ts` (new) — positive + negative cases for protected_mystery_refs resolution; composition test with `rule7_mystery_reserve_preservation` (forbidden M-* HARD-REJECT)
4. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` and `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -007) — extend grammar/schema/parser tests with the 4 new STSEC predicates
5. `tools/validators/tests/structural/registry.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -007 / -008) — extend registry-registration tests with the 3 new STSEC validators

### Commands

1. `npm test --prefix tools/validators` — full validator test pass with new STSEC coverage
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone

## Outcome

Completed on 2026-05-17.

- Added `secret_carrier_existence`, `critical_secret_clue_coverage_when_revealed`, and `secret_mystery_firewall_compliance` as registered structural validators.
- Added shared `secret-utils.ts` helper code for STSEC validator applicability, story-scoped record lookup, clue-carrier extraction, branch-path checks, reveal-order checks, and consistent verdict generation.
- Added STSEC predicate grammar/schema entries for `secret_unrevealed`, `secret_revealed`, `revelation_ready`, and `any_secret_unrevealed`.
- Extended the storylet predicate validator to resolve `STSEC-*` references against `story_secret_record` ids and to accept `any_secret_unrevealed` salience/kind filters.
- Updated registry, schema-parity, storylet parser, record-schema compliance, and pre-apply integration tests for the three new validators and four new predicates.

## Verification Result

Passed:

1. Pre-edit baseline: `npm test --prefix tools/validators` from repo root — 391 tests passed.
2. Build: `npm run build` from `tools/validators` — passed.
3. Focused compiled validator/parser set from `tools/validators`: `node --test dist/tests/structural/secret-carrier-existence.test.js dist/tests/structural/critical-secret-clue-coverage-when-revealed.test.js dist/tests/structural/secret-mystery-firewall-compliance.test.js dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js dist/tests/structural/registry.test.js` — 23 tests passed.
4. Focused compiled schema/parser regression set from `tools/validators`: `node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` — 44 tests passed.
5. Final full suite: `npm test --prefix tools/validators` from repo root — 400 tests passed.

## Deviations

- The draft said the predicate additions should "evaluate" secret truth conditions. The live validator package only parses, schema-validates, and reference-validates storylet predicate DSL entries; runtime truth evaluation remains with later storylet/turn-cycle integration.
- The draft described `secret_mystery_firewall_compliance` as delegating to `rule7_mystery_reserve_preservation`. The implemented validator does not call Rule 7 directly; it composes with it by adding STSEC-side reference-resolution and revealed-forbidden checks while leaving Rule 7 as the world-level Mystery Reserve validator.
- `secret_carrier_existence` enforces branch-path membership when `page_record.branch_path` context is available. When page context is unavailable, it still enforces clue carrier kind/id shape and target existence.
- Direct compiled predicate/schema tests must be run from `tools/validators` because `predicate-dsl-grammar-parity.test.js` reads package-relative schema paths; the full `npm test --prefix tools/validators` command remains the root-safe proof lane.
