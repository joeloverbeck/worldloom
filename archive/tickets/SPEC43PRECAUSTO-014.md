# SPEC43PRECAUSTO-014: Turn-Cycle Phase 2/3 + Phase 4/5 + Phase 7 Amendments

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies three turn-cycle reference files: `references/phase-2-3-commitment-and-state-delta.md` (Phase 3 mid-story introduction subsection after SLT binding), `references/phase-4-5-belief-and-mystery.md` (Phase 4 belief-propagation hook for STSEC creation + same-event-creation-precedence rule), `references/phase-7-page-plan.md` (§10b extension covering newly-introduced CLK/STSEC/STQ render-relevant visibility).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md, archive/tickets/SPEC43PRECAUSTO-013.md

## Problem

At intake, SPEC-43 §Approach G + the per-class introduction rules required turn-cycle skill amendments at THREE phase reference files: (a) phase-2-3 needed a Phase 3 "mid-story introduction" subsection after the SLT binding step, instructing the operator to ask whether the accepted event creates any new persistent causal object and to draft new records in `SE.state_delta.create[]` with `intro:<CLASS>(...)` tags; (b) phase-4-5 needed an explicit precedence rule (apply same-event creations BEFORE lifecycle updates) + a belief-propagation hook (any new STSEC, deceptive event, public relationship formation, new witness-bearing entity, or newly visible pressure MUST pass belief/visibility propagation); (c) phase-7 needed §10b extension covering how newly-introduced CLK/STSEC/STQ surface in the page plan's render-relevant visibility (what the renderer may show, what remains hidden, who knows, which choices are grounded). Those amendments are now landed in the three reference files.

## Assumption Reassessment (2026-05-18)

1. Three reference files exist (verified via directory listing of `.claude/skills/branching-story-turn-cycle/references/`): `phase-2-3-commitment-and-state-delta.md`, `phase-4-5-belief-and-mystery.md`, `phase-7-page-plan.md`. At intake, each was silent on mid-story introduction; per brainstorm exploration, the phase reference files covered only advance/supersede/lifecycle paths, never creation. The amendments are additive subsections.
2. SPEC-43 §Approach G specifies the amendment content per file; ticket 001 introduces the `intro:<CLASS>(...)` tag grammar that phase-2-3's new subsection references; ticket 013 introduces the SKILL.md Output table changes that this ticket's phase amendments operationalize.
3. Cross-skill boundary under audit: the three phase reference files are loaded by `branching-story-turn-cycle` operators at the corresponding phases. Live reassessment found `references/mid-story-record-introduction.md` is still owned by active follow-up `tickets/SPEC43PRECAUSTO-015.md`, so this ticket keeps 014 independently landable by pointing the Phase 3 threshold authority at `SPEC-43 §Approach C` until ticket 015 lands the dedicated reference file.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) + §5a (Commitment Blocks Are Causal Moves) restated: phase-2-3 amendment instructs operators to draft new records in `SE.state_delta.create[]` during page-plan commit (NOT after prose render) per §4a; phase-2-3 also instructs that introduction is mediated by SLT/JIT SLT selection per §5a (introduction is the effect of a causal move, not an out-of-band engine event). Phase 4-5 belief-propagation hook for STSEC creation preserves §6a (Belief vs Fact) discipline (STSEC creation triggers BEL propagation as if it were a reveal — the discovery side of the secret).
5. HARD-GATE discipline was read because the edited references govern a canon-mutating story workflow. The edits add authoring and validation discipline only; they do not remove approval, patch-engine routing, explicit PASS rationales, or user approval before world writes.

## Architecture Check

1. Cleaner than alternative #1 (single mega-amendment in SKILL.md without phase reference updates): the SKILL.md is a thin entry point that delegates phase-specific guidance to references/. Adding mid-story creation guidance only in SKILL.md would break the entry-point-vs-reference contract that the skill currently maintains.
2. Cleaner than alternative #2 (split into three separate tickets, one per phase reference file): the three amendments are logically coupled (Phase 3 introduces; Phase 4 propagates; Phase 7 renders). Bundling them in one ticket keeps the review surface focused on the mid-story-introduction workflow end-to-end.
3. No backwards-compatibility aliasing/shims introduced: the amendments are additive subsections; existing phase-reference content is unchanged.

## Verification Layers

1. Phase 2/3 amendment → codebase grep-proof: `grep -n "mid-story introduction\|intro:<CLASS>" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the new subsection.
2. Phase 4/5 amendment → codebase grep-proof: `grep -nE "same-event creation|belief.{0,40}propagation.{0,80}STSEC" .claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` returns the new precedence rule + propagation hook.
3. Phase 7 §10b extension → codebase grep-proof: `grep -nE "§10b|newly.{0,40}introduced" .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns the new §10b coverage.
4. FOUNDATIONS §4a + §5a alignment → FOUNDATIONS alignment check: amendments preserve plan-authority + causal-move primitive; rendered prose remains downstream of plan commit.

## Landed Changes

### 1. Amend phase-2-3-commitment-and-state-delta.md (Phase 3 mid-story introduction subsection)

Inserted after the Phase 3 state-delta opening:

> **Mid-story introduction rule** (SPEC-43): after binding/selecting the `SLT` for this turn, ask whether the accepted event creates any NEW persistent causal object that is not reducible to an existing active record AND that changes future eligibility, visibility, obligations, pressure, witness propagation, relationship constraints, affordances, or choice grounding. If YES, draft the new record (CLK / STSEC / STQ / THR / STENT / SREL) in `SE.state_delta.create[]` AND include a parseable `intro:<CLASS>(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag in `SE.world_logic_rationale` per the grammar at `_shared-templates/story-state-contract.md` §5a (closed trigger vocabulary per class).
>
> Prefer SUPERSEDING/ADVANCING an existing active record when the new event is merely an escalation, complication, discovery, tick, answer, reveal, status change, or relationship-axis change of an existing record. Fresh creation is for genuinely new causal objects, per the existing-record-preference corollary at SPEC-43 §Approach A.
>
> Until `references/mid-story-record-introduction.md` lands in ticket 015, use SPEC-43 §Approach C for per-class creation/supersede thresholds, minimum grounding requirements, and anti-patterns.

### 2. Amend phase-4-5-belief-and-mystery.md (same-event creation precedence + belief propagation hook)

Added to the opening of Phase 4/5 reference content:

> **Same-event creation precedence** (SPEC-43): BEFORE applying lifecycle updates to existing CLK / STSEC / STQ records (ticks, reveals, answers, abandonments), apply any same-event creations for those classes (per the Phase 3 mid-story introduction rule). Lifecycle operations run on the post-creation state, not on the pre-creation state — a CLK created and ticked in the same SE has the create op land first; the initial tick is then represented in `tick_history[]` per `tick_pressure_clock` semantics.
>
> **Belief-propagation hook for STSEC creation**: any new STSEC creation, deceptive event, public relationship formation, new witness-bearing entity, or newly visible pressure MUST pass the belief/visibility propagation discipline. Create/supersede `BEL` records (per the existing Phase 4 belief-state surface) or emit closed-set non-propagation tags (per `non-propagation-tag-shape.ts` semantics). A new STSEC involving deception or concealment must create initial `BEL` records for the holders' lie-or-knowledge state AND for any witnesses who observed the deceptive event.

### 3. Amend phase-7-page-plan.md (§10b extension)

Extended the existing §10b page-plan subsection:

> **Newly-introduced CLK / STSEC / STQ (SPEC-43)**: when the turn creates or activates any of these classes (per Phase 3 mid-story introduction rule), §10b must include their render-relevant visibility:
>
> - **Active clocks newly introduced**: name each new `CLK` with its `value`, `max`, nearest threshold, salience, visibility, AND a one-line note explaining the new pressure driver to the renderer.
> - **Story secrets newly introduced**: name each new `STSEC` with its `secret_kind`, what the renderer may show (the observable surface — e.g., a lie spoken, a clue carrier introduced) vs. what remains hidden (the secret claim, the truth anchor, the holders' actual knowledge state).
> - **Story questions newly introduced**: name each new `STQ` with its `setup_kind`, the concrete setup or affordance introduced, the audience visibility, AND which choices in this page plan ground in the new STQ.

Cross-reference: per `_shared-templates/story-state-contract.md` §5a for the tag grammar; per SPEC-43 §Approach C for per-class introduction examples until ticket 015 lands `references/mid-story-record-introduction.md`.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)

## Out of Scope

- SKILL.md Output table amendments — handled by ticket 013.
- Phase 9 gates 12-15 documentation — handled by ticket 013.
- NEW per-class reference file `mid-story-record-introduction.md` — handled by ticket 015 (this ticket only cross-references it).
- Phase 10 op enumeration — unchanged per R-correction-A.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "mid-story introduction\|intro:<CLASS>" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returns the new subsection.
2. `grep -nE "same-event creation|belief.{0,40}propagation.{0,80}STSEC" .claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` returns the new precedence rule + propagation hook.
3. `grep -nE "§10b|newly.{0,40}introduced" .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns the new §10b coverage.
4. Skill prose remains internally consistent: Phase 3 mid-story introduction → Phase 4 belief propagation → Phase 7 §10b visibility → Phase 9 gates (per ticket 013) form a coherent end-to-end flow.

### Invariants

1. Same-event creation precedence is one-directional: creates ALWAYS land before lifecycle ops on the same class in the same SE. The reverse (lifecycle then create) is not lawful.
2. STSEC creation TRIGGERS belief propagation (BEL records or non-propagation tags) — the secret can't enter the engine state without the corresponding belief surface being authored.
3. §10b surfaces newly-introduced records distinctly from existing ones — the renderer needs to know the difference (what's hidden behind the new STSEC vs. what's been hidden all along behind a pre-existing STSEC).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The per-validator behavior is tested by tickets 003-012; this ticket only updates skill prose to give operators the documented authoring path for mid-story introduction.

### Commands

1. `grep -nE "mid-story|intro:<CLASS>|same-event creation|§10b" .claude/skills/branching-story-turn-cycle/references/phase-{2-3,4-5,7}*.md` (sanity grep that the amendments landed across all three files).

## Outcome

Completed: 2026-05-18

Landed the Phase 3 mid-story introduction rule in `phase-2-3-commitment-and-state-delta.md`, including the `SE.state_delta.create[]` requirement, `intro:<CLASS>(...)` tag requirement, existing-record preference, and temporary SPEC-43 §Approach C authority for per-class thresholds until ticket 015 lands the dedicated reference.

Landed the Phase 4/5 same-event creation precedence rule and belief propagation hook for new STSEC/deceptive/public relationship/new witness/new pressure state in `phase-4-5-belief-and-mystery.md`.

Landed the Phase 7 §10b visibility extension in `phase-7-page-plan.md`, distinguishing newly introduced CLK/STSEC/STQ records from already-active records so the renderer receives the current visibility boundary.

## Verification Result

- `grep -n "mid-story introduction\|intro:<CLASS>" .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` returned the Phase 3 rule and tag requirement.
- `grep -nE "same-event creation|belief.{0,40}propagation.{0,80}STSEC" .claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` returned the precedence rule and STSEC propagation hook.
- `grep -nE "§10b|newly.{0,40}introduced" .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returned the §10b visibility extension.
- `grep -nE "mid-story|intro:<CLASS>|same-event creation|§10b" .claude/skills/branching-story-turn-cycle/references/phase-{2-3,4-5,7}*.md` returned hits across all three amended reference files.
- Manual FOUNDATIONS/HARD-GATE review: amendments preserve plan-authority, SLT-mediated causal moves, belief-vs-fact propagation, and patch-engine/HARD-GATE write discipline.

## Deviations

1. `references/mid-story-record-introduction.md` does not exist yet in the live checkout; active follow-up `tickets/SPEC43PRECAUSTO-015.md` owns that reference file. This ticket therefore points Phase 3 to SPEC-43 §Approach C as the temporary per-class threshold authority instead of introducing a broken operational link.
2. The Phase 4/5 proof command is case-sensitive, so the landed hook heading uses lower-case `belief propagation` to keep the accepted grep proof exact.
