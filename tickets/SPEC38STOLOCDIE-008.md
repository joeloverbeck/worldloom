# SPEC38STOLOCDIE-008: Amend `story-fact-promotion-to-canon` with FOUNDATIONS §365 routing rule

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/story-fact-promotion-to-canon/SKILL.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md

## Problem

`story-fact-promotion-to-canon` SKILL.md line 115 registers `artifact_canonization` as a `source_kind` taking a story-local `DA-<integer>` plus authoring `SE` (prose evidence required), but does NOT surface FOUNDATIONS.md line 365's binding routing rule: *"Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references."* Without an explicit anchor at the proposal-package-authoring surface, operators authoring `artifact_canonization` packages can plausibly place the source DA in `candidate.pre_figured_by[]`; schema validation will reject it at adjudication time (only CF references permitted per FOUNDATIONS line 365), wasting a round-trip. This ticket adds a paragraph at or adjacent to the `artifact_canonization` source-kind documentation that names the routing rule explicitly.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/story-fact-promotion-to-canon/SKILL.md` line 115 (per brainstorm agent verification: source-kind mapping table row `| artifact_canonization | DA-<integer> (story-local) | authoring SE | Required |`) registers the source-kind but does not address `pre_figured_by[]` routing.
2. Verified FOUNDATIONS.md line 365 (per brainstorm agent verbatim quote): *"The optional `pre_figured_by[]` field, when present in machine-readable Canon Fact Records, accepts CF ids only and records CF-to-CF foreshadowing: an earlier accepted CF that hinted at the later commitment before it was canonized. Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references."*
3. Cross-skill boundary: this ticket surfaces a FOUNDATIONS rule at the proposal-package-authoring boundary; the rule itself lives in FOUNDATIONS and is enforced by `record_schema_compliance` at adjudication time. The new paragraph prevents the round-trip cost; it does not duplicate enforcement.
4. FOUNDATIONS principles motivating this ticket: FOUNDATIONS.md line 365 (verbatim — the routing rule); Rule 6 No Silent Retcons (audit-trail routing through `source_basis.derived_from` preserves DA-to-CF lineage; placing the DA in `pre_figured_by[]` would either be rejected by `record_schema_compliance` or, if the rule slipped, would break Rule 6's audit-trail discipline).

## Architecture Check

1. Authoring-surface anchor (cleaner than adjudication-only enforcement): the routing rule already exists in FOUNDATIONS + is enforced by `record_schema_compliance`; this ticket surfaces it at the authoring boundary so operators don't author the wrong shape and discover the error at adjudication time. The anchor + the enforcement are paired (prevention + backstop).
2. No backwards-compatibility shims; the paragraph is additive at the existing line-115 row.

## Verification Layers

1. Routing-rule paragraph present at or near `artifact_canonization` source-kind row → codebase grep-proof: `grep -nE 'pre_figured_by.*CF.only|source_basis\.derived_from.*DA|FOUNDATIONS.*365' .claude/skills/story-fact-promotion-to-canon/SKILL.md`.
2. Explicit prohibition on `pre_figured_by[]` DA references → grep-proof: `grep -nE 'Do NOT.*pre_figured_by|pre_figured_by.*not.*DA' .claude/skills/story-fact-promotion-to-canon/SKILL.md`.
3. Cross-reference to FOUNDATIONS line 365 (or §-name where appropriate) present → grep-proof.
4. Single-layer ticket: documentation-only; verification is grep-based.

## What to Change

### 1. Add routing-rule paragraph at or adjacent to `artifact_canonization` source-kind row

Placement per SPEC-38 §D8: immediately adjacent to the existing `artifact_canonization` source-kind documentation at line 115. Content:

```
**DA-to-CF routing rule (FOUNDATIONS line 365).** When `source_kind:
artifact_canonization`, the source `DA-<integer>` is recorded in
`candidate.source_basis.derived_from[]` alongside any contributing CF
parents and any contributing `SE-<integer>` events. **Do NOT** place the
source DA in `candidate.pre_figured_by[]`; that field is CF-only per
FOUNDATIONS line 365, and `record_schema_compliance` will reject CF
candidates with non-CF `pre_figured_by[]` references at adjudication time.
The same routing rule applies to character pre-figurement (CHAR records
also belong in `source_basis.derived_from`, not `pre_figured_by`).
```

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)

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
4. Routing rule extends to CHAR records (parallel discipline named).

### Invariants

1. `story-fact-promotion-to-canon` continues to produce CF-shaped candidate proposal packages — no schema changes to the candidate format.
2. The routing rule cited matches FOUNDATIONS.md line 365 verbatim semantics (operators reading the ticket arrive at the same understanding as operators reading FOUNDATIONS directly).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'pre_figured_by.*CF.only|source_basis\.derived_from.*DA|FOUNDATIONS.*line 365' .claude/skills/story-fact-promotion-to-canon/SKILL.md`
2. `sed -n '365p' docs/FOUNDATIONS.md` (cross-validation: the line the routing rule cites is the line FOUNDATIONS documents)
