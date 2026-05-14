# SPEC27FOUCAN-003: Silence Semantics enforced at canonization time

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Core Principle), `.claude/skills/canon-addition` (`SKILL.md` Phase 0 + `references/proposal-normalization.md`).
**Deps**: None

## Problem

`docs/FOUNDATIONS.md:24` ("Default Reality") requires first canonization of a previously-unmodeled area to acknowledge that prior silence and route through Rule 6 — but the only enforcement is `continuity-audit` Phase 4k, a post-acceptance retcon-proposal generator that never hard-fails. `canon-addition`, the skill that actually canonizes, has zero references to prior-silence acknowledgment; it can canonize a previously-unmodeled domain with no acknowledgment at all.

## Assumption Reassessment (2026-05-14)

1. `canon-addition/SKILL.md` Phase 0 ("Normalize the Proposal") runs the misrecognition probe via `references/proposal-normalization.md` §Misrecognition Probe; `canon-addition` has no prior-silence step. `continuity-audit` Phase 4k is the only existing silent-area check (post-hoc, soft, never hard-fails). Confirmed via the SPEC-27 brainstorm verification pass.
2. `docs/FOUNDATIONS.md:24` carries the "Default Reality" paragraph; the spec's D3 adds an explicit "Silence Semantics" paragraph after it without introducing a CF schema field.
3. Shared boundary under audit: `canon-addition` Phase 0's normalization contract — `SKILL.md` Phase 0 step plus `references/proposal-normalization.md` — which the new prior-silence acknowledgment step extends in parallel with the existing §Misrecognition Probe sub-step.
4. FOUNDATIONS principle under audit: §Core Principle "Default Reality" + Rule 6 (No Silent Retcons). The new step moves enforcement of an already-stated obligation from a post-hoc auditor to canonization time; it adds no new world-canon record or schema field.
5. Enforcement surface touched: `canon-addition` Phase 0 normalization (not HARD-GATE / canon-write ordering). The change adds an acknowledgment requirement; it does not weaken the Mystery Reserve firewall or silently resolve any `M` entry.

## Architecture Check

1. Enforcing the Default Reality obligation at canonization time — where the canonizing skill runs — is cleaner than relying on `continuity-audit` to retroactively flag the omission; the obligation is stated in FOUNDATIONS but unenforced where it matters.
2. No backwards-compatibility aliasing — a lightweight acknowledgment step, not a CF schema field; `continuity-audit` Phase 4k stays as the post-hoc backstop unchanged.

## Verification Layers

1. `canon-addition` Phase 0 records a prior-silence acknowledgment (or explicit "not previously silent" rationale) when a CF introduces a domain no prior CF covered -> skill dry-run + manual review of the PA `body_markdown` Phase 0 sub-section.
2. `docs/FOUNDATIONS.md` §Core Principle carries the Silence Semantics paragraph -> FOUNDATIONS alignment check.
3. Cross-artifact boundary: the change spans `SKILL.md` Phase 0 prose and `references/proposal-normalization.md` — both must name the step consistently -> codebase grep-proof.

## What to Change

### 1. FOUNDATIONS §Core Principle — Silence Semantics paragraph

- After the "Default Reality" paragraph (`docs/FOUNDATIONS.md:24`), add a "Silence Semantics" paragraph naming a lightweight prior-silence classification (the load-bearing distinctions: previously-unmodeled vs. already-implied vs. default-baseline vs. deliberately-unknown), without introducing a CF schema field.

### 2. canon-addition Phase 0 prior-silence step

- In `.claude/skills/canon-addition/SKILL.md` Phase 0 and `.claude/skills/canon-addition/references/proposal-normalization.md`, add a prior-silence-acknowledgment sub-step parallel to the existing §Misrecognition Probe: when a CF's `domains_affected` introduces a domain no prior CF covered, record a one-line prior-silence acknowledgment in `cf.notes` or `cf.source_basis`, or record an explicit "not previously silent" rationale, in the PA `body_markdown` Phase 0 sub-section. `continuity-audit` Phase 4k remains the post-hoc backstop.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/canon-addition/SKILL.md` (modify)
- `.claude/skills/canon-addition/references/proposal-normalization.md` (modify)

## Out of Scope

- The reviewer's full six-state silence taxonomy (`unmodeled` / `default_baseline` / `implied` / `forbidden` / `hidden` / `contested`) as a CF schema field — the spec adopts a lightweight classification, not a schema field.
- Modifying `continuity-audit` Phase 4k — it stays as the post-hoc backstop.
- Adding any CF Record schema field.

## Acceptance Criteria

### Tests That Must Pass

1. A `canon-addition` dry-run on a CF introducing a previously-unmodeled domain produces a PA `body_markdown` Phase 0 sub-section with a prior-silence acknowledgment or an explicit "not previously silent" rationale.
2. `grep -n "Silence Semantics" docs/FOUNDATIONS.md` returns the new paragraph in §Core Principle.
3. `grep -rn "prior-silence\|previously unmodeled\|Silence Semantics" .claude/skills/canon-addition/SKILL.md .claude/skills/canon-addition/references/proposal-normalization.md` returns the new Phase 0 step in both files.

### Invariants

1. The prior-silence step is an acknowledgment requirement only — it adds no CF Record schema field and does not block canonization that supplies the acknowledgment.
2. `continuity-audit` Phase 4k behavior is unchanged.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is skill dry-run + grep-proof, and existing coverage (continuity-audit Phase 4k) is named in Assumption Reassessment.`

### Commands

1. `grep -n "Silence Semantics" docs/FOUNDATIONS.md`
2. `grep -rn "prior-silence\|previously unmodeled" .claude/skills/canon-addition/SKILL.md .claude/skills/canon-addition/references/proposal-normalization.md`
