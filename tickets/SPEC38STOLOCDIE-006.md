# SPEC38STOLOCDIE-006: Amend `branching-story-prose-attach` with load-bearing artifact-mention check

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-prose-attach/SKILL.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md, archive/tickets/SPEC38STOLOCDIE-012.md

## Problem

`branching-story-prose-attach` Phase 3 (`SKILL.md:204-218`) has an `invented_structural_fact` deterministic check that catches prose asserting a named record id absent from state, but does NOT catch prose mentioning a load-bearing artifact in narrative phrasing — e.g., "a letter arrived bearing the king's seal", "she unfolded the map", "the proclamation was nailed to the door" — without a corresponding DA in `PG.state_snapshot.active_records.DA[]`. Operators attaching rendered prose with such phrasings receive no warning that the prose introduces a structural fact the page-plan didn't author. This ticket adds a new deterministic check sub-section consuming ticket 012's `prose_load_bearing_artifact_mention` validator.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 3 at lines 204-218 (per brainstorm agent verification) contains `invented_structural_fact` deterministic check + `canon_claim_without_authority` check; the `invented_structural_fact` rule catches "prose asserts a named record id absent from the plan" but not narrative-phrasing artifact mentions without explicit id citation.
2. Verified SPEC-38 §D6 prescribes a new check sub-section to Phase 3 (placement: immediately after `invented_structural_fact` block at lines 204-218) consuming ticket 012's `prose_load_bearing_artifact_mention` validator. WARN-default-FAIL-on-quotation severity split is documented.
3. Cross-skill boundary: this ticket's prose-attach check consumes verdict code `prose_load_bearing_artifact_mention_without_da` (from ticket 012). The verdict-code name must match the validator implementation; ticket 006 lands AFTER 012 so the cited code resolves. Cross-reference to the validator must match its current name.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §4a Plan-Authority Boundary (rendered prose is a rendering of state, not a second state engine — prose-introduced load-bearing artifacts violate the boundary per FOUNDATIONS line 590); Rule 1 No Floating Facts (load-bearing prose mentions without state-record backing are floating facts in prose).

## Architecture Check

1. New check sub-section is additive within existing Phase 3 deterministic-checks structure; placement immediately after `invented_structural_fact` keeps related checks co-located for reader scannability.
2. WARN-default-FAIL-on-quotation severity split per SPEC-38 §D6 — WARN is the conservative default for pattern-matched mentions; FAIL escalates when the prose explicitly quotes the artifact content (heuristic: quoted-string spans naming the artifact). This calibrates against false positives.
3. No backwards-compatibility shims; the new check is additive.

## Verification Layers

1. New check sub-section present → codebase grep-proof: `grep -nE 'prose_load_bearing_artifact_mention_without_da|load-bearing artifact|prose mentions.*letter.*map.*diary' .claude/skills/branching-story-prose-attach/SKILL.md`.
2. Pattern list explicitly enumerated in the check sub-section → grep + manual review.
3. WARN/FAIL severity split documented → grep-proof.
4. Repair routing references existing disposition table → grep-proof for "repair turn" or "disposition table" cross-reference.

## What to Change

### 1. Add new deterministic check sub-section

Placement per SPEC-38 §D6: immediately after the existing `invented_structural_fact` block at lines 204-218. Content:

```
**`prose_load_bearing_artifact_mention_without_da`**: scan rendered prose
for load-bearing artifact phrases (letter, map, diary, decree, log,
recording, inscription, confession, notice, ledger, transcript, briefing,
proclamation, seal, codex, marginalia, redaction) used in a way that
grounds knowledge, choice availability, mystery progression, or character
action. If such a phrase appears AND the emitting PG's
`state_snapshot.active_records.DA[]` contains no DA matching the artifact's
diegetic role, emit verdict
`prose_load_bearing_artifact_mention_without_da` (WARN-level by default;
FAIL when the prose explicitly quotes the artifact's content or describes
the protagonist's access to it). Recommended repair: route the deviation
through the prose-attach disposition table (structural-fact issue → run a
repair turn that creates the DA + BEL + optional STOBJ).
```

D6 implementation depends on D12 validator (ticket 012); the validator implements the pattern-detection, context-filter, and quoted-content escalation logic.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Validator implementation (lives in ticket 012; this ticket only adds prose-attach skill prose that CONSUMES the verdict code)
- Pattern-list extension beyond the spec's enumeration (the validator's pattern list is extensible per ticket 012; this prose ticket cites the initial set)
- Other Phase 3 deterministic checks (`invented_structural_fact`, `canon_claim_without_authority`) — not modified by this ticket
- Phase 1, 2, or 4 of prose-attach — not modified

## Acceptance Criteria

### Tests That Must Pass

1. New check sub-section present in Phase 3 with the specified verdict code.
2. Pattern list explicitly enumerated (letter / map / diary / decree / log / recording / inscription / confession / notice / ledger / transcript / briefing / proclamation / seal / codex / marginalia / redaction at minimum).
3. WARN/FAIL severity split documented.
4. Repair routing references the existing disposition table (cross-reference present).
5. Validator verdict-code name matches ticket 012's implementation.

### Invariants

1. Phase 3's existing deterministic-checks structure is preserved; the new check is additive after `invented_structural_fact`.
2. prose-attach remains a validation skill — it does NOT create DAs (the repair-turn routing prescribes how to create them via turn-cycle).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'prose_load_bearing_artifact_mention_without_da|load-bearing artifact' .claude/skills/branching-story-prose-attach/SKILL.md`
2. `grep -nE 'prose_load_bearing_artifact_mention_without_da' tools/validators/src/rules/rule_prose_load_bearing_artifact_mention.ts` (cross-validation against ticket 012)
