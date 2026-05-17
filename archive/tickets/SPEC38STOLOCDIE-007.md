# SPEC38STOLOCDIE-007: Amend `commitment-block-authoring` with `artifact_accessible` predicate ref + anti-pattern

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/commitment-block-authoring/SKILL.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md

## Problem

At intake, the `artifact_accessible(STENT, DA)` predicate was defined at `.claude/skills/_shared-templates/story-state-contract.md` §5 but not taught in `commitment-block-authoring`'s SKILL.md prose. The skill listed `artifact_accessible` in the closed predicate catalog but gave no canonical reference for DA-grounded eligibility and no anti-pattern warning against SLT preconditions that depend on `DA-<n>` references the storylet author cannot guarantee exist at runtime. The validator's `storylet_predicate_dsl_parsability` rule cannot detect that semantic problem because predicate parsability does not verify record existence at authoring time. This ticket added the predicate reference and anti-pattern.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/commitment-block-authoring/SKILL.md` already listed `artifact_accessible` in the closed predicate catalog but did not explain DA-grounded eligibility usage or warn against fabricated DA preconditions.
2. Verified `.claude/skills/_shared-templates/story-state-contract.md` §5 defines `artifact_accessible(STENT-<integer>, DA-<integer>)`.
3. Cross-skill boundary: this ticket adds two cross-references — one to `story-state-contract.md` §5 (canonical predicate definition; existing convention, verified) and one to `da-authoring-reference.md` §Field semantics (created by ticket 001 for access-route semantics). Both cross-reference paths remain stable.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §6b Information / Observer Firewall (SLT bindings must respect actor access; the predicate is the canonical mechanism); §Story Bundles §5b Schema-Minimalism (storylets do not extend record-creation surface — the anti-pattern enforces this at SLT-authoring time).

## Architecture Check

1. Predicate-reference + anti-pattern (cleaner than enforcement-only): predicate parsability check at validator time catches malformed predicates but cannot verify referenced record existence; the anti-pattern documents the authoring-time discipline that prevents runtime never-binding storylets. Symmetric with other "predicate reference + anti-pattern" patterns in the skill (e.g., `any_belief` is mentioned alongside its authoring discipline).
2. No backwards-compatibility shims; both edits are additive.

## Verification Layers

1. Predicate reference present in the Predicate DSL section → codebase grep-proof: `grep -nE 'artifact_accessible\(STENT-' .claude/skills/commitment-block-authoring/SKILL.md`.
2. Anti-pattern entry present → grep-proof: `grep -nE 'fabricate DA existence|SLT precondition.*DA' .claude/skills/commitment-block-authoring/SKILL.md`.
3. Cross-references to `story-state-contract.md` §5 and `da-authoring-reference.md` concrete → grep-proof.
4. Single-layer ticket: documentation-only; verification is grep-based.

## Landed Changes

### 1. Added predicate reference near Predicate DSL discipline

Added an explicit DA-grounded eligibility paragraph to `.claude/skills/commitment-block-authoring/SKILL.md`:

```
For DA-grounded eligibility, use the `artifact_accessible(STENT-<integer>, DA-<integer>)`
predicate from `.claude/skills/_shared-templates/story-state-contract.md` §5.
Pair it with `any_belief(...)` when the content is known through belief rather
than current artifact access. See
`.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics for
the access-route semantics that ground this predicate.
```

### 2. Added anti-pattern guardrail

Added a guardrail anti-pattern to the skill:

```
**Do not fabricate DA existence in SLT preconditions.** An SLT may require
`artifact_accessible(...)` or `any_belief(... access_route=document ...)` over an
existing DA, but the storylet itself does not create DA records. DA creation
belongs to runtime state deltas authored by `branching-story-bootstrap` or
`branching-story-turn-cycle`.
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

1. `artifact_accessible` predicate explicitly referenced in the Predicate DSL section.
2. Anti-pattern entry present with the no-fabrication rule.
3. Cross-references to `story-state-contract.md` §5 and `da-authoring-reference.md` are concrete.

### Invariants

1. `commitment-block-authoring` continues to author SLT records only — no DA-creation logic is added by this ticket.
2. The predicate referenced (`artifact_accessible`) matches the canonical definition at `story-state-contract.md` §5.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'artifact_accessible\(STENT-' .claude/skills/commitment-block-authoring/SKILL.md`
2. `grep -nE 'fabricate DA existence' .claude/skills/commitment-block-authoring/SKILL.md`
3. `grep -nE 'artifact_accessible\(STENT-<integer>, DA-<integer>\)' .claude/skills/_shared-templates/story-state-contract.md` (cross-validation: the predicate definition the ticket references is the same one the contract defines)

## Outcome

Completed: 2026-05-17

What changed:
- Added the DA-grounded eligibility paragraph to `.claude/skills/commitment-block-authoring/SKILL.md`, citing `.claude/skills/_shared-templates/story-state-contract.md` §5 and `.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics.
- Added the no-fabricated-DA guardrail explaining that SLT preconditions may depend on existing DA records but do not create them.

Deviations from original plan:
- The landed predicate paragraph sits next to the existing Predicate DSL discipline, not in a separately named Information / Observer Firewall paragraph. This is the live section where the skill already enumerates the closed predicate catalog, so it is the tighter authority point.

## Verification Result

Commands run:

```bash
grep -nE 'artifact_accessible\(STENT-' .claude/skills/commitment-block-authoring/SKILL.md
```

Result: matched the new DA-grounded eligibility paragraph.

```bash
grep -nE 'fabricate DA existence' .claude/skills/commitment-block-authoring/SKILL.md
```

Result: matched the new guardrail.

```bash
grep -nE 'artifact_accessible\(STENT-<integer>, DA-<integer>\)' .claude/skills/_shared-templates/story-state-contract.md
```

Result: matched the canonical predicate definition in §5.
