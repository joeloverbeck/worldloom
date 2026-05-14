# SPEC27FOUCAN-004: Authority-cited HARD-GATE rationales

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/HARD-GATE-DISCIPLINE.md`, `docs/FOUNDATIONS.md` (§Tooling Recommendation).
**Deps**: None

## Problem

`docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 and both `CLAUDE.md` files require each validation test to record PASS with a one-line rationale and treat a bare "PASS" as FAIL — but neither requires the rationale to cite the record id, validator result, or packet layer it rests on. `canon-addition` Phase 14a already practices the stronger discipline (cite the named mechanical validator + cite phase findings) skill-locally; it is not generalized, so "PASS because it seems consistent" can creep back in elsewhere.

## Assumption Reassessment (2026-05-14)

1. `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 requires "a one-line rationale" and "A bare 'PASS' is treated as FAIL" — no authority-citation requirement. `canon-addition/SKILL.md` Phase 14a already cites named mechanical validators (`record_schema_compliance`, etc.) via `validators_run[]` and requires phase-finding citations. Confirmed via in-context reads this session.
2. `docs/FOUNDATIONS.md` §Tooling Recommendation is the home for the one-line pointer to the strengthened discipline; the spec's D4 strengthens `HARD-GATE-DISCIPLINE.md` as the primary surface.
3. Shared boundary under audit: the HARD-GATE PASS/FAIL rationale convention, which every canon-mutating and content-generating skill instantiates. Strengthening it in `HARD-GATE-DISCIPLINE.md` generalizes `canon-addition`'s existing skill-local practice; no sibling skill's HARD-GATE block is edited by this ticket.
4. FOUNDATIONS principle under audit: §Tooling Recommendation ("LLM agents should never operate on prose alone"). Requiring authority-cited rationales aligns the gate discipline with the machine-facing retrieval model — the citation names the loaded authority.
5. Enforcement surface touched: `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 (the HARD-GATE rationale convention). The change raises the rationale bar; it does not alter canon-write ordering and does not weaken the Mystery Reserve firewall.

## Architecture Check

1. Codifying authority-cited rationales in `HARD-GATE-DISCIPLINE.md` generalizes a discipline `canon-addition` already practices, closing the "PASS because it seems consistent" loophole the bare-non-emptiness bar leaves open.
2. No backwards-compatibility aliasing — the existing bare-PASS-is-FAIL rule is strengthened in place, not aliased.

## Verification Layers

1. `docs/HARD-GATE-DISCIPLINE.md` step 3 requires rationales to cite record ids / packet layer / validator result / retrieved field; a model-memory-only or prose-impression rationale is documented as FAIL -> manual review.
2. `docs/FOUNDATIONS.md` §Tooling Recommendation carries a one-line pointer to the strengthened discipline -> FOUNDATIONS alignment check.
3. Cross-artifact boundary: the change spans `HARD-GATE-DISCIPLINE.md` (primary) and `FOUNDATIONS.md` §Tooling Recommendation (pointer) — both must name the discipline consistently -> codebase grep-proof.

## What to Change

### 1. Strengthen HARD-GATE-DISCIPLINE.md step 3

- In `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3, add: a canon-safety HARD-GATE PASS/FAIL rationale must cite the record ids, packet layer, validator result, or retrieved field that supports the judgment; a rationale resting only on model memory or prose impression is treated as FAIL.

### 2. FOUNDATIONS §Tooling Recommendation pointer

- In `docs/FOUNDATIONS.md` §Tooling Recommendation, add a one-line pointer to the strengthened authority-cited-rationale discipline in `docs/HARD-GATE-DISCIPLINE.md`.

## Files to Touch

- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `docs/FOUNDATIONS.md` (modify)

## Out of Scope

- Editing the project or global `CLAUDE.md` files. Decision (per spec §Risks, which named this a ticket-time judgment): leave both. The global `CLAUDE.md` is the user's cross-project instruction file — editing it from a worldloom spec ticket would be scope-inappropriate; the project `CLAUDE.md`'s "Validation test PASS entries require a one-line rationale" note is consistent with — not contradicted by — the strengthened discipline, so it stands as the weaker-but-not-wrong summary. `docs/HARD-GATE-DISCIPLINE.md` is the canonical home for HARD-GATE execution discipline.
- Editing any individual skill's HARD-GATE block — the discipline is generalized in `HARD-GATE-DISCIPLINE.md`, not re-stated per skill.

## Acceptance Criteria

### Tests That Must Pass

1. `docs/HARD-GATE-DISCIPLINE.md` step 3 requires authority-cited rationales; a bare or impression-only rationale is documented as FAIL.
2. `grep -n "authority-cited\|cite the record" docs/HARD-GATE-DISCIPLINE.md` returns the strengthened text.
3. `grep -n "authority-cited\|HARD-GATE-DISCIPLINE" docs/FOUNDATIONS.md` returns the §Tooling Recommendation pointer.

### Invariants

1. The strengthened rule is additive to the existing bare-PASS-is-FAIL rule — it raises the bar, it does not remove the existing requirement.
2. No `CLAUDE.md` file is edited by this ticket.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-proof + manual review; no pipeline test surface exists for HARD-GATE prose discipline.`

### Commands

1. `grep -n "authority-cited" docs/HARD-GATE-DISCIPLINE.md docs/FOUNDATIONS.md`
2. `git diff --stat docs/` — confirm only `HARD-GATE-DISCIPLINE.md` and `FOUNDATIONS.md` changed; no `CLAUDE.md`.
