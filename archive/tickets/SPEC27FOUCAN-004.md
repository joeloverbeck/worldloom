# SPEC27FOUCAN-004: Authority-cited HARD-GATE rationales

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/HARD-GATE-DISCIPLINE.md`, `docs/FOUNDATIONS.md` (§Tooling Recommendation), `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (D4 implementation note).
**Deps**: None

## Problem

At intake, `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 and both `CLAUDE.md` files required each validation test to record PASS with a one-line rationale and treat a bare "PASS" as FAIL — but neither required the rationale to cite the record id, validator result, or packet layer it rests on. `canon-addition` Phase 14a already practiced the stronger discipline (cite the named mechanical validator + cite phase findings) skill-locally; this ticket generalized that discipline in `docs/HARD-GATE-DISCIPLINE.md` and added the matching `docs/FOUNDATIONS.md` pointer.

## Assumption Reassessment (2026-05-14)

1. `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 requires "a one-line rationale" and "A bare 'PASS' is treated as FAIL" — no authority-citation requirement. `canon-addition/SKILL.md` Phase 14a already cites named mechanical validators (`record_schema_compliance`, etc.) via `validators_run[]` and requires phase-finding citations. Confirmed via in-context reads this session.
2. `docs/FOUNDATIONS.md` §Tooling Recommendation is the home for the one-line pointer to the strengthened discipline; the spec's D4 strengthens `HARD-GATE-DISCIPLINE.md` as the primary surface.
3. Shared boundary under audit: the HARD-GATE PASS/FAIL rationale convention, which every canon-mutating and content-generating skill instantiates. Strengthening it in `HARD-GATE-DISCIPLINE.md` generalizes `canon-addition`'s existing skill-local practice; no sibling skill's HARD-GATE block is edited by this ticket.
4. FOUNDATIONS principle under audit: §Tooling Recommendation ("LLM agents should never operate on prose alone"). Requiring authority-cited rationales aligns the gate discipline with the machine-facing retrieval model — the citation names the loaded authority.
5. Enforcement surface touched: `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 (the HARD-GATE rationale convention). The change raises the rationale bar; it does not alter canon-write ordering and does not weaken the Mystery Reserve firewall.
6. User-supplied reference `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` contains current-state D4 prose for this exact seam, so this ticket owns a dated D4 implementation note there. The remaining D4 prose stays as historical intake context, consistent with prior D1-D3 notes in the same spec.

## Architecture Check

1. Codifying authority-cited rationales in `HARD-GATE-DISCIPLINE.md` generalizes a discipline `canon-addition` already practices, closing the "PASS because it seems consistent" loophole the bare-non-emptiness bar leaves open.
2. No backwards-compatibility aliasing — the existing bare-PASS-is-FAIL rule is strengthened in place, not aliased.

## Verification Layers

1. `docs/HARD-GATE-DISCIPLINE.md` step 3 requires rationales to cite record ids / packet layer / validator result / retrieved field; a model-memory-only or prose-impression rationale is documented as FAIL -> manual review.
2. `docs/FOUNDATIONS.md` §Tooling Recommendation carries a one-line pointer to the strengthened discipline -> FOUNDATIONS alignment check.
3. Cross-artifact boundary: the change spans `HARD-GATE-DISCIPLINE.md` (primary) and `FOUNDATIONS.md` §Tooling Recommendation (pointer) — both must name the discipline consistently -> codebase grep-proof.

## Landed Changes

### 1. Strengthen HARD-GATE-DISCIPLINE.md step 3

- `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 now requires an authority-cited one-line rationale. It names record id, packet layer, validator result, retrieved field, or named loaded authority as valid support, and treats bare PASS plus model-memory-only or impression-only rationales as FAIL.

### 2. FOUNDATIONS §Tooling Recommendation pointer

- `docs/FOUNDATIONS.md` §Tooling Recommendation now points to the strengthened authority-cited-rationale discipline in `docs/HARD-GATE-DISCIPLINE.md`.

### 3. SPEC-27 D4 note

- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` D4 now has a dated implementation note for `SPEC27FOUCAN-004`.

## Files to Touch

- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `docs/FOUNDATIONS.md` (modify)
- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (modify)

## Out of Scope

- Editing the project or global `CLAUDE.md` files. Decision (per spec §Risks, which named this a ticket-time judgment): leave both. The global `CLAUDE.md` is the user's cross-project instruction file — editing it from a worldloom spec ticket would be scope-inappropriate; the project `CLAUDE.md`'s "Validation test PASS entries require a one-line rationale" note is consistent with — not contradicted by — the strengthened discipline, so it stands as the weaker-but-not-wrong summary. `docs/HARD-GATE-DISCIPLINE.md` is the canonical home for HARD-GATE execution discipline.
- Editing any individual skill's HARD-GATE block — the discipline is generalized in `HARD-GATE-DISCIPLINE.md`, not re-stated per skill.

## Acceptance Criteria

### Tests That Must Pass

1. `docs/HARD-GATE-DISCIPLINE.md` step 3 requires authority-cited rationales; a bare or impression-only rationale is documented as FAIL.
2. `grep -n "authority-cited" docs/HARD-GATE-DISCIPLINE.md docs/FOUNDATIONS.md specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` returns the strengthened text and the D4 spec note.
3. `grep -n "cite the record" docs/HARD-GATE-DISCIPLINE.md` returns the step 3 authority-citation requirement.

### Invariants

1. The strengthened rule is additive to the existing bare-PASS-is-FAIL rule — it raises the bar, it does not remove the existing requirement.
2. No `CLAUDE.md` file is edited by this ticket.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-proof + manual review; no pipeline test surface exists for HARD-GATE prose discipline.`

### Commands

1. `grep -n "authority-cited" docs/HARD-GATE-DISCIPLINE.md docs/FOUNDATIONS.md specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md`
2. `grep -n "cite the record" docs/HARD-GATE-DISCIPLINE.md`
3. `git diff --stat docs/ specs/ archive/tickets/SPEC27FOUCAN-004.md` — confirm the owned docs/spec/ticket set after archival.
4. `git diff --check`

## Outcome

Completed. `docs/HARD-GATE-DISCIPLINE.md` now makes authority-cited rationales the general HARD-GATE PASS/FAIL convention, `docs/FOUNDATIONS.md` points Tooling Recommendation readers to that convention, and `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` records D4 as landed.

Outcome amended: 2026-05-14 — post-archive review updated the path-sensitive diff-stat proof command from the active ticket path to this archived ticket path.

## Verification Result

1. `grep -n "authority-cited" docs/HARD-GATE-DISCIPLINE.md docs/FOUNDATIONS.md specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` — PASS; returned the strengthened HARD-GATE step, FOUNDATIONS pointer, and SPEC-27 D4 note.
2. `grep -n "cite the record" docs/HARD-GATE-DISCIPLINE.md` — PASS; returned the step 3 sentence requiring the rationale to cite record id / packet layer / validator result / retrieved field / named loaded authority.
3. `git diff --stat docs/ specs/ archive/tickets/SPEC27FOUCAN-004.md` — PASS; showed only the owned docs, spec, and archived ticket.
4. `git diff --check` — PASS.

## Deviations

- The user-supplied `specs/SPEC-27*` reference had same-seam current-state D4 prose, so this run added a dated implementation note to the spec and updated `Files to Touch` accordingly. No individual skill HARD-GATE blocks or `CLAUDE.md` files were edited.
