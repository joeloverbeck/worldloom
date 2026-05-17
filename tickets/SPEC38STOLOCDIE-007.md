# SPEC38STOLOCDIE-007: Amend `commitment-block-authoring` with `artifact_accessible` predicate ref + anti-pattern

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/commitment-block-authoring/SKILL.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md

## Problem

The `artifact_accessible(STENT, DA)` predicate is defined at `.claude/skills/_shared-templates/story-state-contract.md` §5 line 140 but NOT referenced in `commitment-block-authoring`'s SKILL.md prose. The skill's Information / Observer Firewall paragraph at line 256 mentions "accessible `DA` / `STOBJ` evidence" generically but does not name the predicate by syntax, so authors writing SLT preconditions have no canonical reference for how to express DA-grounded eligibility. Additionally, no anti-pattern warns against SLT preconditions that depend on `DA-<n>` references the storylet author cannot guarantee exist at runtime — the validator's `storylet_predicate_dsl_parsability` rule cannot detect this, since predicate parsability does not verify record existence at authoring time. This ticket adds the predicate reference + the anti-pattern.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/commitment-block-authoring/SKILL.md` line 256 (per brainstorm agent verification: "Apply the Information / Observer Firewall before selecting the block: the proposed actor-binding and move may rely only on information available to the acting entity through active `BEL`, direct observation, accessible `DA` / `STOBJ` evidence, testimony, document access, inference, surveillance, institutional channel, magic/tech, or another recorded access route.") mentions accessible DA/STOBJ generically but does NOT name `artifact_accessible(STENT, DA)` predicate.
2. Verified `.claude/skills/_shared-templates/story-state-contract.md` §5 line 140 defines `artifact_accessible(STENT-<integer>, DA-<integer>)` (per brainstorm agent quote).
3. Cross-skill boundary: this ticket adds two cross-references — one to `story-state-contract.md` §5 (canonical predicate definition; existing convention, verified) and one to `da-authoring-reference.md` §Field semantics (created by ticket 001 for access-route semantics). Both cross-reference paths must remain stable.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §6b Information / Observer Firewall (SLT bindings must respect actor access; the predicate is the canonical mechanism); §Story Bundles §5b Schema-Minimalism (storylets do not extend record-creation surface — the anti-pattern enforces this at SLT-authoring time).

## Architecture Check

1. Predicate-reference + anti-pattern (cleaner than enforcement-only): predicate parsability check at validator time catches malformed predicates but cannot verify referenced record existence; the anti-pattern documents the authoring-time discipline that prevents runtime never-binding storylets. Symmetric with other "predicate reference + anti-pattern" patterns in the skill (e.g., `any_belief` is mentioned alongside its authoring discipline).
2. No backwards-compatibility shims; both edits are additive.

## Verification Layers

1. Predicate reference present in firewall paragraph → codebase grep-proof: `grep -nE 'artifact_accessible\(STENT-' .claude/skills/commitment-block-authoring/SKILL.md`.
2. Anti-pattern entry present → grep-proof: `grep -nE 'fabricate DA existence|SLT precondition.*DA' .claude/skills/commitment-block-authoring/SKILL.md`.
3. Cross-references to `story-state-contract.md` §5 and `da-authoring-reference.md` concrete → grep-proof.
4. Single-layer ticket: documentation-only; verification is grep-based.

## What to Change

### 1. Add predicate reference to Information / Observer Firewall paragraph

In the firewall paragraph at line 256, add an explicit predicate reference per SPEC-38 §D7 §Change 1:

```
For DA-grounded eligibility, use the `artifact_accessible(STENT-<n>, DA-<n>)`
predicate (story-state-contract.md §5). Pair with `any_belief(...)` when the
content is known through belief rather than current artifact access. See
`.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics
for the access-route semantics that ground this predicate.
```

### 2. Add anti-pattern entry

In the skill's Anti-Patterns section (or equivalent), add per SPEC-38 §D7 §Change 2:

```
**Do not fabricate DA existence in SLT preconditions.** An SLT may require
`artifact_accessible(...)` or `any_belief(... access_route=document ...)`
over an EXISTING DA, but the storylet itself does not create DA records. DA
creation belongs to runtime state deltas authored by
`branching-story-bootstrap` or `branching-story-turn-cycle`. An SLT
precondition naming a `DA-<n>` that no runtime delta has created will
silently never bind; the validator's `storylet_predicate_dsl_parsability`
rule cannot detect this, since predicate parsability does not verify record
existence at authoring time.
```

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Predicate DSL extension or modification (the `artifact_accessible` predicate exists; this ticket only adds a reference to it)
- Validator behavior changes (`storylet_predicate_dsl_parsability` is unchanged)
- SLT schema changes (deferred per SPEC-38 §Out of Scope)
- Cross-cutting changes to other anti-patterns in the skill

## Acceptance Criteria

### Tests That Must Pass

1. `artifact_accessible` predicate explicitly referenced in the firewall paragraph.
2. Anti-pattern entry present with the no-fabrication rule.
3. Cross-references to `story-state-contract.md` §5 and `da-authoring-reference.md` are concrete.

### Invariants

1. `commitment-block-authoring` continues to author SLT records only — no DA-creation logic is added by this ticket.
2. The predicate referenced (`artifact_accessible`) matches the canonical definition at `story-state-contract.md` §5 line 140.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'artifact_accessible\(STENT-' .claude/skills/commitment-block-authoring/SKILL.md`
2. `grep -nE 'fabricate DA existence' .claude/skills/commitment-block-authoring/SKILL.md`
3. `grep -nE 'artifact_accessible\(STENT-<integer>, DA-<integer>\)' .claude/skills/_shared-templates/story-state-contract.md` (cross-validation: the predicate definition the ticket references is the same one the contract defines)
