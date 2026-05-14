# SPEC27FOUCAN-003: Silence Semantics enforced at canonization time

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Core Principle), `.claude/skills/canon-addition` (`SKILL.md` Phase 0 + `references/proposal-normalization.md` + `references/counterfactual-and-verdict.md` PA body-shape reference), `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (D3 implementation note).
**Deps**: None

## Problem

At intake, `docs/FOUNDATIONS.md:24` ("Default Reality") required first canonization of a previously-unmodeled area to acknowledge that prior silence and route through Rule 6, but the only enforcement was `continuity-audit` Phase 4k, a post-acceptance retcon-proposal generator that never hard-fails. `canon-addition`, the skill that actually canonizes, had no prior-silence acknowledgment step.

## Assumption Reassessment (2026-05-14)

1. `canon-addition/SKILL.md` Phase 0 now runs the prior-silence acknowledgment sub-step and the misrecognition probe via `references/proposal-normalization.md`. `continuity-audit` Phase 4k remains the post-hoc silent-area check (soft, never hard-fails).
2. `docs/FOUNDATIONS.md` §Core Principle now carries the "Silence Semantics" paragraph immediately after "Default Reality" without introducing a CF schema field.
3. Shared boundary under audit: `canon-addition` Phase 0's normalization contract — `SKILL.md` Phase 0 step plus `references/proposal-normalization.md` and the PA body-shape reference in `references/counterfactual-and-verdict.md` — now consistently names the prior-silence acknowledgment step.
4. FOUNDATIONS principle under audit: §Core Principle "Default Reality" + Rule 6 (No Silent Retcons). The landed step moves enforcement of an already-stated obligation from a post-hoc auditor to canonization time; it adds no new world-canon record or schema field.
5. Enforcement surface touched: `canon-addition` Phase 0 normalization (not HARD-GATE / canon-write ordering). The change adds an acknowledgment requirement; it does not weaken the Mystery Reserve firewall or silently resolve any `M` entry.
6. Verification correction: no executable `canon-addition` dry-run runner is exposed in this repo/session for a prose-only skill contract check. The truthful proof surface is manual review of Phase 0 / PA `body_markdown` instructions plus grep proof over the edited skill/reference and FOUNDATIONS paragraph.
7. Explicit reference-spec truthing: `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` D3 contains current-state prose for this same seam, so this ticket also owns a dated D3 implementation note in that spec. Broader SPEC-27 rows remain historical intake context and out of scope.
8. Same-skill stale-reference sweep found `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` still naming the old Phase 0 PA sub-heading. That reference describes the same PA `body_markdown` contract, so it is required same-seam fallout and belongs in this ticket.

## Architecture Check

1. Enforcing the Default Reality obligation at canonization time — where the canonizing skill runs — is cleaner than relying on `continuity-audit` to retroactively flag the omission; the obligation is stated in FOUNDATIONS but unenforced where it matters.
2. No backwards-compatibility aliasing — a lightweight acknowledgment step, not a CF schema field; `continuity-audit` Phase 4k stays as the post-hoc backstop unchanged.

## Verification Layers

1. `canon-addition` Phase 0 instructs operators to record a prior-silence acknowledgment (or explicit "not previously silent" rationale) when a CF introduces a domain no prior CF covered -> manual review of Phase 0 / PA `body_markdown` prose.
2. `docs/FOUNDATIONS.md` §Core Principle carries the Silence Semantics paragraph -> FOUNDATIONS alignment check.
3. Cross-artifact boundary: the change spans `SKILL.md` Phase 0 prose and `references/proposal-normalization.md` — both must name the step consistently -> codebase grep-proof.

## Landed Changes

### 1. FOUNDATIONS §Core Principle — Silence Semantics paragraph

- Added the "Silence Semantics" paragraph after "Default Reality", naming a lightweight prior-silence classification (previously unmodeled, already implied, default-baseline, deliberately unknown / Mystery Reserve-adjacent) without introducing a CF schema field.

### 2. canon-addition Phase 0 prior-silence step

- Added the Phase 0 prior-silence acknowledgment sub-step parallel to the existing §Misrecognition Probe: when a CF's `domains_affected` introduces a domain no prior CF covered, record a one-line prior-silence acknowledgment in `cf.notes` or `cf.source_basis`, or record an explicit "not previously silent" rationale in the PA `body_markdown` Phase 0 sub-section. Updated same-skill PA body-shape references to the new Phase 0 sub-heading. `continuity-audit` Phase 4k remains the post-hoc backstop.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/canon-addition/SKILL.md` (modify)
- `.claude/skills/canon-addition/references/proposal-normalization.md` (modify)
- `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` (modify)
- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (modify)

## Out of Scope

- The reviewer's full six-state silence taxonomy (`unmodeled` / `default_baseline` / `implied` / `forbidden` / `hidden` / `contested`) as a CF schema field — the spec adopts a lightweight classification, not a schema field.
- Modifying `continuity-audit` Phase 4k — it stays as the post-hoc backstop.
- Adding any CF Record schema field.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review confirms `canon-addition` Phase 0 and `references/proposal-normalization.md` require the PA `body_markdown` Phase 0 sub-section to carry a prior-silence acknowledgment or explicit "not previously silent" rationale for the relevant CF.
2. `grep -n "Silence Semantics" docs/FOUNDATIONS.md` returns the new paragraph in §Core Principle.
3. `grep -rn "prior-silence\|previously unmodeled\|prior_silence\|Prior-Silence" .claude/skills/canon-addition/SKILL.md .claude/skills/canon-addition/references/proposal-normalization.md .claude/skills/canon-addition/references/counterfactual-and-verdict.md` returns the new Phase 0 step and PA body-shape references.

### Invariants

1. The prior-silence step is an acknowledgment requirement only — it adds no CF Record schema field and does not block canonization that supplies the acknowledgment.
2. `continuity-audit` Phase 4k behavior is unchanged.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is manual contract review + grep-proof, and existing coverage (continuity-audit Phase 4k) is named in Assumption Reassessment.`

### Commands

1. `grep -n "Silence Semantics" docs/FOUNDATIONS.md`
2. `grep -rn "prior-silence\|previously unmodeled\|prior_silence\|Prior-Silence" .claude/skills/canon-addition/SKILL.md .claude/skills/canon-addition/references/proposal-normalization.md .claude/skills/canon-addition/references/counterfactual-and-verdict.md`
3. Manual review of `.claude/skills/canon-addition/SKILL.md` Phase 0 and `.claude/skills/canon-addition/references/proposal-normalization.md` §Prior-Silence Acknowledgment.

## Outcome

Implemented D3's Silence Semantics contract at canonization time. `docs/FOUNDATIONS.md` now names the prior-silence classification discipline; `canon-addition` Phase 0 now requires the prior-silence acknowledgment / "not previously silent" rationale alongside the misrecognition probe; the PA `body_markdown` shape now includes `prior_silence:` in the Phase 0 sub-section; and the SPEC-27 D3 section carries a dated implementation note.

## Verification Result

1. `grep -n "Silence Semantics" docs/FOUNDATIONS.md` — PASS; returned the new §Core Principle paragraph.
2. `grep -rn "prior-silence\|previously unmodeled\|prior_silence\|Prior-Silence" .claude/skills/canon-addition/SKILL.md .claude/skills/canon-addition/references/proposal-normalization.md .claude/skills/canon-addition/references/counterfactual-and-verdict.md` — PASS; returned the Phase 0 instruction, normalization reference, and PA body-shape reference.
3. Manual review — PASS; the landed wording requires the acknowledgment/rationale, preserves the no-CF-schema-field invariant, leaves `continuity-audit` Phase 4k unchanged, and does not alter HARD-GATE / approval / submit ordering.
4. `git diff --check -- docs/FOUNDATIONS.md .claude/skills/canon-addition/SKILL.md .claude/skills/canon-addition/references/proposal-normalization.md .claude/skills/canon-addition/references/counterfactual-and-verdict.md specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md archive/tickets/SPEC27FOUCAN-003.md` — PASS.

## Deviations

- Replaced the drafted `canon-addition` dry-run proof with manual contract review plus grep proof because no executable prose-skill dry-run runner is exposed in this repo/session.
- Added `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` as required same-seam fallout after stale-anchor review found the old Phase 0 PA sub-heading.
- Added a dated implementation note to `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` because the user supplied `SPEC-27` as the same-seam authority and its D3 current-state prose would otherwise remain stale.
