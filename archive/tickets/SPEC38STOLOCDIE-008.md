# SPEC38STOLOCDIE-008: Amend `story-fact-promotion-to-canon` with FOUNDATIONS §365 routing rule

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/story-fact-promotion-to-canon/SKILL.md`; truths SPEC-38 D8 note; created follow-up now archived at `archive/tickets/SPEC38STOLOCDIE-013.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md

## Problem

At intake, `story-fact-promotion-to-canon` SKILL.md line 115 registered `artifact_canonization` as a `source_kind` taking a story-local `DA-<integer>` plus authoring `SE` (prose evidence required), but did not surface FOUNDATIONS.md line 365's binding routing rule: *"Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references."* Without an explicit anchor at the proposal-package-authoring surface, operators authoring `artifact_canonization` packages could plausibly place the source DA in `candidate.pre_figured_by[]`; schema validation would reject it at adjudication time. This ticket adds the DA routing paragraph adjacent to the `artifact_canonization` source-kind documentation and preserves a truthful CHAR caveat for follow-up.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/story-fact-promotion-to-canon/SKILL.md` line 115 (per brainstorm agent verification: source-kind mapping table row `| artifact_canonization | DA-<integer> (story-local) | authoring SE | Required |`) registers the source-kind but does not address `pre_figured_by[]` routing.
2. Verified FOUNDATIONS.md line 365 (per brainstorm agent verbatim quote): *"The optional `pre_figured_by[]` field, when present in machine-readable Canon Fact Records, accepts CF ids only and records CF-to-CF foreshadowing: an earlier accepted CF that hinted at the later commitment before it was canonized. Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references."*
3. Cross-skill boundary: this ticket surfaces a FOUNDATIONS rule at the proposal-package-authoring boundary; the rule itself lives in FOUNDATIONS and is enforced by `record_schema_compliance` at adjudication time. The new paragraph prevents the round-trip cost; it does not duplicate enforcement.
4. FOUNDATIONS principles motivating this ticket: FOUNDATIONS.md line 365 (verbatim — the routing rule); Rule 6 No Silent Retcons (audit-trail routing through `source_basis.derived_from` preserves DA-to-CF lineage; placing the DA in `pre_figured_by[]` would either be rejected by `record_schema_compliance` or, if the rule slipped, would break Rule 6's audit-trail discipline).
5. Live reassessment found `tools/validators/src/schemas/canon-fact-record.schema.json` currently patterns `source_basis.derived_from[]` as `^(CF|DA)-[0-9]+$`. That means the drafted `SE-<integer>` and `CHAR-<integer>` routing prose would instruct operators to author a candidate shape the validator rejects.
6. Corrected scope: the landed story-promotion paragraph routes story-local `DA-*` through `candidate.source_basis.derived_from[]`, keeps authoring `SE-*` provenance in top-level `proposal_evidence`, and forbids DA use in `candidate.pre_figured_by[]`.
7. Follow-up created and completed: `archive/tickets/SPEC38STOLOCDIE-013.md` owns the CHAR pre-figurement/schema alignment across FOUNDATIONS, canon-addition, story-promotion, and the Canon Fact schema.

## Architecture Check

1. Authoring-surface anchor (cleaner than adjudication-only enforcement): the routing rule already exists in FOUNDATIONS + is enforced by `record_schema_compliance`; this ticket surfaces it at the authoring boundary so operators don't author the wrong shape and discover the error at adjudication time. The anchor + the enforcement are paired (prevention + backstop).
2. No backwards-compatibility shims; the paragraph is additive at the existing line-115 row.

## Verification Layers

1. Routing-rule paragraph present at or near `artifact_canonization` source-kind row → codebase grep-proof: `grep -nE 'pre_figured_by.*CF.only|source_basis\.derived_from.*DA|FOUNDATIONS.*365' .claude/skills/story-fact-promotion-to-canon/SKILL.md`.
2. Explicit prohibition on `pre_figured_by[]` DA references → grep-proof: `grep -nE 'Do NOT.*pre_figured_by|pre_figured_by.*not.*DA' .claude/skills/story-fact-promotion-to-canon/SKILL.md`.
3. Cross-reference to FOUNDATIONS line 365 (or §-name where appropriate) present → grep-proof.
4. Single-layer ticket: documentation-only; verification is grep-based.

## Landed Changes

### 1. Added routing-rule paragraph at `artifact_canonization` source-kind row

The landed paragraph sits immediately after the source-kind mapping table. It records story-local `DA-*` pre-figurement in `candidate.source_basis.derived_from[]`, keeps authoring `SE-*` in top-level `proposal_evidence`, explicitly forbids DA references in `candidate.pre_figured_by[]`, and marks CHAR lineage as follow-up-owned until live schema support exists.

### 2. Truthed adjacent source-basis comments

Updated nearby Phase 2 and Guardrails prose that previously said `source_basis.derived_from[]` was reserved only for parent CFs. The live wording now allows parent CFs plus DA pre-figurement while preserving the branch-provenance boundary.

### 3. Recorded follow-up state

Added a dated SPEC-38 D8 implementation note and created the CHAR pre-figurement/schema follow-up, now completed and archived at `archive/tickets/SPEC38STOLOCDIE-013.md`.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `archive/specs/SPEC-38-story-local-diegetic-artifact-authoring.md` (modify)
- `archive/tickets/SPEC38STOLOCDIE-013.md` (follow-up, now archived)

## Out of Scope

- `pre_figured_by[]` semantics changes in FOUNDATIONS (the rule is authoritative as-is per line 365; this ticket surfaces it at the authoring boundary only)
- `record_schema_compliance` validator behavior changes (the enforcement is already in place; this ticket prevents the round-trip rather than adding new enforcement)
- Other source-kinds (`story_fact`, `mystery_resolution`, `character_outcome`, etc.) — not modified by this ticket
- Promotion-package schema changes (deferred per SPEC-38 §Out of Scope)

## Acceptance Criteria

### Tests That Must Pass

1. Routing-rule paragraph present at or near the `artifact_canonization` source-kind row.
2. Explicit prohibition on `pre_figured_by[]` DA references.
3. Cross-reference to FOUNDATIONS line 365.
4. CHAR record routing is no longer overclaimed; schema/prose alignment is completed by `archive/tickets/SPEC38STOLOCDIE-013.md`.

### Invariants

1. `story-fact-promotion-to-canon` continues to produce CF-shaped candidate proposal packages — no schema changes to the candidate format.
2. The routing rule cited matches FOUNDATIONS.md line 365 verbatim semantics (operators reading the ticket arrive at the same understanding as operators reading FOUNDATIONS directly).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'pre_figured_by.*CF.only|source_basis\.derived_from.*DA|FOUNDATIONS.*line 365' .claude/skills/story-fact-promotion-to-canon/SKILL.md`
2. `sed -n '365p' docs/FOUNDATIONS.md` (cross-validation: the line the routing rule cites is the line FOUNDATIONS documents)

## Outcome

Completed on 2026-05-17. `story-fact-promotion-to-canon` now has a DA-to-CF routing paragraph next to the `artifact_canonization` source-kind row, forbids DA references in `candidate.pre_figured_by[]`, and keeps branch/event provenance in top-level `proposal_evidence`. Same-skill comments that contradicted DA source-basis routing were corrected. SPEC-38 now records the narrowed D8 implementation note, and `archive/tickets/SPEC38STOLOCDIE-013.md` completed the CHAR pre-figurement/schema alignment work.

## Verification Result

Commands run:

1. `rg -n "pre_figured_by.*CF.only|source_basis\\.derived_from.*DA|FOUNDATIONS.*line 365|Do NOT.*pre_figured_by|pre_figured_by.*not.*DA|CHAR lineage" .claude/skills/story-fact-promotion-to-canon/SKILL.md` — found the new DA routing paragraph, explicit `pre_figured_by[]` prohibition, FOUNDATIONS line 365 citation, and the CHAR follow-up caveat.
2. `sed -n '365p' docs/FOUNDATIONS.md` — confirmed line 365 keeps `pre_figured_by[]` CF-only and routes diegetic-artifact/character pre-figurement through `source_basis.derived_from`.
3. `sed -n '60,85p' tools/validators/src/schemas/canon-fact-record.schema.json` — confirmed live schema currently accepts `CF-*` and `DA-*` in `source_basis.derived_from[]`, motivating the SE/CHAR correction and follow-up.
4. `git diff --check -- .claude/skills/story-fact-promotion-to-canon/SKILL.md` — passed.

Manual review: verified the edit is outside the skill's `<HARD-GATE>` block and preserves the proposal approval boundary from `docs/HARD-GATE-DISCIPLINE.md`.

## Deviations

- The drafted paragraph included authoring `SE-<integer>` events in `candidate.source_basis.derived_from[]`; live schema rejects `SE-*`, so the landed guidance keeps SE provenance in `proposal_evidence`.
- The drafted acceptance expected CHAR routing through `source_basis.derived_from[]`; live schema rejected `CHAR-*` at ticket-008 closeout, so ticket 008 recorded a caveat and `archive/tickets/SPEC38STOLOCDIE-013.md` completed schema/prose alignment.
