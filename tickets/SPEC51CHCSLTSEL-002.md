# SPEC51CHCSLTSEL-002: Selected-commitment trace validator + eligibility-validator fold

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds `chc_slt_selected_commitment_trace` to `tools/validators/src/structural/`; removes `chc_slt_eligibility_source_grounding` (folded in); updates the structural validator registry; updates `tools/world-mcp`'s capability-parity test to reflect the validator-set change.
**Deps**: SPEC51CHCSLTSEL-001

## Problem

The most important story-bundle causal trace — active state → eligible `SLT` → emitted `CHC`/write-in → selected `SLT` → `SE.commitment.alias_bindings` → `SE.state_delta`/`state_relations` → next `PG.state_snapshot` — is not deterministically proven when the eligibility predicate is **existential**. The existing `chc_slt_eligibility_source_grounding` validator (SPEC-50 D.2) collects only literal record IDs from SLT predicate arguments; for `any_*` predicates the selected concrete record is known only through `alias_bindings`, so the validator skips it. No validator resolves an existential predicate to its bound record, proves `bound:<alias>` SLT effects land in the matching `SE.state_delta`, or proves the storylet-derived `CHC` grounds in the bound record. This ticket adds a per-event trace validator that closes that gap and folds the static-only eligibility validator into it, so exactly one CHC↔SLT grounding validator exists afterward (SPEC-51 §Approach A.1, A.3).

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/structural/chc-slt-eligibility-source-grounding.ts` collects only literal predicate record IDs (verified: lines 70-98) and recognizes the background-only marker `eligibility_background_only:` inside `likely_state_pressure` (verified: `BACKGROUND_MARKER` regex line 7). It is imported and registered in `tools/validators/src/public/registry.ts` (verified: lines 6, 111) with a test at `tools/validators/tests/structural/chc-slt-eligibility-source-grounding.test.ts`. `snapshot-replay-equality.ts` already proves child-`PG`-snapshot consistency (do NOT duplicate it). Shared alias-resolution + branch-locality helpers are provided by ticket 001.
2. SPEC-51 §Approach A.1/A.2/A.3 + §Risks: "A.1 selected-CHC resolvability" warns that `SE.commitment` carries no `selected_choice_id` field (verified — only `selected_slt_id`/`selection_source`/`alias_bindings`), and `associated_commitment_block` is many-CHC-to-one-SLT, so the CHC-grounding sub-check (step 3) FAILs ONLY when the selected CHC uniquely resolves and otherwise degrades to WARN. The migration posture (warning-first one revision cycle, then fail-closed) follows SPEC-44/49/50.
3. Cross-artifact boundary under audit: removing `chc_slt_eligibility_source_grounding` reaches `tools/validators/src/public/registry.ts`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, and the cross-package `tools/world-mcp/tests/server/capability-parity.test.ts` (verified blast-radius grep). All must reflect the validator-set change.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §5a (bound-effect mirror — `effects.*` mirrors `SE.state_delta`); Rule 1 No Floating Facts (existential eligibility becomes structurally checkable); §5c Present Causal State (the validator is a per-event causal trace and MUST NOT score choice-sets against an aggregate pressure distribution — that would reintroduce the rejected global drama manager); §6b Observer Firewall (alias-binding resolution reuses the firewall machinery extracted in 001). Restate before trusting the spec narrative: the validator widens enforcement, never weakens it.
5. Canon Safety surface: this is a structural validator gating story-bundle record consistency at engine pre-apply / `world-validate` time. Confirm the change does not weaken the Mystery Reserve firewall — it reads story-local `STSEC`/`STQ` records to resolve existential bindings but never resolves or reveals a Mystery Reserve `M-<integer>` entry; firewall coverage widens to existential bindings, it is not bypassed.
6. Rename/remove blast radius: `chc_slt_eligibility_source_grounding` is removed (its static-predicate grounding folds into step 3 of the new validator). Pipeline-wide grep (`tools/`, `.claude/skills/`, `docs/`, `specs/`) confirms its non-dist references are exactly: `registry.ts`, `registry.test.ts`, `validate-patch-plan.test.ts`, `capability-parity.test.ts`, the validator file, and its own test file. Each is updated or removed here. Rule 6 (No Silent Retcons): the removal is attributed in this ticket — the existing static-only behavior is preserved inside the new validator's step 1/step 3, not dropped.

## Architecture Check

1. One validator covering static + existential CHC↔SLT grounding is cleaner than two overlapping validators; the spec's contract ("exactly one CHC↔SLT grounding validator after this spec") is enforced structurally. Reusing 001's helpers avoids re-implementing alias resolution and branch-locality. Leaning on `snapshot-replay-equality` for child-snapshot consistency avoids duplicating replay logic — this validator closes only the gap replay treats as a black box (selected-SLT effects → `SE.state_delta`).
2. No backwards-compatibility shim: the eligibility validator is removed, not aliased. No transient two-validator coexistence (the spec forbids it).

## Verification Layers

1. Existential binding resolves + class-correct + active-in-parent -> new validator unit tests per existential family (codebase-driven fixtures); FAIL on wrong-class / unbound / inactive.
2. `bound:<alias>` SLT effect lands in matching `SE.state_delta` -> validator unit test; FAIL on omission; FAIL on unresolvable `bound:` in delta.
3. Static-grounding behavior preserved post-fold -> migrated assertions from the old eligibility test still pass.
4. §5c no-distribution-audit invariant -> code review + the validator's explicit per-event scope (no choice-set aggregation) -> FOUNDATIONS alignment check.
5. Registry + cross-package parity -> `registry.test.ts` name-list updated; `capability-parity.test.ts` reflects the validator-set change -> grep-proof old name absent, new name present.

## What to Change

### 1. New validator `chc_slt_selected_commitment_trace`

Create `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`. For each `SE` event carrying `commitment.selected_slt_id` (covers `selected_choice` and `write_in_attempt`): (1) predicate satisfaction & binding — static predicates' literal records must be active in parent `PG`; existential `any_*` predicates must have a class-correct, parent-active bound record in `alias_bindings` (FAIL otherwise; unbound → FAIL); (2) bound-effect reconciliation — every `bound:<alias>` SLT effect resolves through `alias_bindings` and appears in the matching `SE.state_delta.{create,supersede,close}` (FAIL on omission); static SLT effects likewise; extra `SE.state_delta` entries are permitted but any `bound:` in the delta must resolve; (3) CHC grounding link (when `selection_source = emitted_choice`) — the selected CHC must ground in a selecting-predicate record unless it carries the `eligibility_background_only` marker; FAIL ONLY when the selected CHC uniquely resolves via `page_emitted_choice` ∩ `choice_associated_storylet`, else WARN (per §Risks resolvability); (4) alias hygiene — orphan bindings → WARN; cross-branch bound record → FAIL (via 001's `isBranchLocal`). Use ticket 001's alias-binding + branch-locality helpers. Ship warning-first for one revision cycle, then fail-closed.

### 2. Fold + remove the eligibility validator

Fold `chc_slt_eligibility_source_grounding`'s static-predicate grounding (including its `eligibility_background_only` handling) into the new validator's step 1/step 3. Delete `chc-slt-eligibility-source-grounding.ts` and its test; migrate its still-relevant assertions into the new validator's test. Swap the import + array entry in `registry.ts`; update `registry.test.ts`'s name-list; update `validate-patch-plan.test.ts` and `capability-parity.test.ts` references.

### 3. Write-in coverage (A.2)

No separate validator: write-ins traverse the same trace (schema-enforced `selected_slt_id` + `alias_bindings`). Add test cases proving a `write_in_attempt` with a JIT SLT resolves existential bindings + bound effects + state delta identically to an emitted choice, and that a write-in whose `SE.state_delta` omits a declared bound effect FAILs.

## Files to Touch

- `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (new)
- `tools/validators/src/structural/chc-slt-eligibility-source-grounding.ts` (modify — remove; folded into the new validator)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (new)
- `tools/validators/tests/structural/chc-slt-eligibility-source-grounding.test.ts` (modify — remove; assertions migrated)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)

## Out of Scope

- Helper extraction (ticket 001 — this ticket imports the helpers).
- Any choice-set / pressure-distribution / aggregate-salience scoring (FOUNDATIONS §5c — explicitly excluded).
- Child-`PG`-snapshot consistency (already covered by `snapshot-replay-equality`).
- Any new schema field (e.g., a `selected_choice_id` on `SE`) — §5b forbids; resolvability degrades to WARN instead.
- MCP list/schema parity (ticket 003), world-index edge fix (ticket 004), skill prose (ticket 005).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — new validator's existential-family matrix, bound-effect reconciliation, CHC-grounding (FAIL/WARN split), alias-hygiene, and write-in cases all pass; migrated static-grounding assertions pass.
2. Grep-proof: `grep -rn "chc_slt_eligibility_source_grounding\|chcSltEligibilitySourceGrounding" tools/validators/src tools/world-mcp/tests` returns zero matches (rename/removal complete); the new validator name resolves in `registry.ts` + `registry.test.ts`.
3. `npm test --prefix tools/world-mcp` — `capability-parity.test.ts` passes with the updated validator set.

### Invariants

1. Exactly one CHC↔SLT grounding validator exists after this ticket.
2. The validator is per-event and read-only; it never aggregates across a choice set and never resolves a Mystery Reserve entry.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (new) — existential families (`STPLAN`/`STEMO`/`CLK`/`STSEC`/`STQ`/`OBL`/`CNSQ`/`THR`/`SREL`/`BEL`/`STINT`): correct binding → PASS; wrong-class / unbound / inactive → FAIL; bound-effect omitted from delta → FAIL; unresolvable `bound:` in delta → FAIL; CHC grounds in bound record → PASS; ambiguous selected-CHC → WARN; orphan binding → WARN; cross-branch bound record → FAIL; write-in JIT-SLT parity → PASS; write-in delta omission → FAIL.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — name-list reflects the swap.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` + `tools/world-mcp/tests/server/capability-parity.test.ts` (modify) — references updated.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators && npm test --prefix tools/world-mcp`
3. `node tools/validators/dist/src/cli/world-validate.js <representative-world> --structural` — full-pipeline structural run including the new validator.
