# SPEC35STOPIPEIG-005: Downgrade causal_dependency_threat_scan skill prose to judgment-based review

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/branching-story-health-audit/SKILL.md` (skill prose only)
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D5

## Problem

`tools/validators/src/public/registry.ts` registers 20 structural validators; none is `causal_dependency_threat_scan`. Grep across `tools/validators/src/{structural,rules}/` returns zero implementation matches. The name appears in skill prose as if it were a registered validator at:
- `.claude/skills/branching-story-turn-cycle/SKILL.md:443` (Phase 9 step 8, "Causal dependency threat scan (`causal_dependency_threat_scan`)")
- `.claude/skills/branching-story-turn-cycle/SKILL.md:495` (Rule 5 mechanism prose)
- `.claude/skills/branching-story-turn-cycle/SKILL.md:510` (Rule 5 alignment table row)
- `.claude/skills/branching-story-health-audit/SKILL.md:236` (Replay sub-checks)

(Step 2 codebase validation confirmed zero references in `.claude/skills/_shared-templates/story-state-contract.md` and `docs/FOUNDATIONS.md` — the spec's contemplated FOUNDATIONS edit is unnecessary; scope refined to 4 references across 2 skill files.)

This is documented-but-missing drift — skill prose promises a deterministic check that does not exist. Implementing the four subcases (`choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, `slt_precondition_clobbered`) is multi-file new-feature work; deferred to validator-hardening-II per SPEC-35 §Risks & Open Questions. The immediate fix is to honestly frame the skill prose: it's a judgment-based pre-apply review with the planned validator named as a forward-pointer.

## Assumption Reassessment (2026-05-16)

1. Step 2 grep verified zero implementation hits in `tools/validators/src/{structural,rules}/`. Skill-prose hits enumerated at the 4 sites above (verified via `grep -rn 'causal_dependency_threat_scan\|causal-dependency-threat-scan' .claude/skills/ docs/ | grep -v '/archive/'`).
2. `.claude/skills/_shared-templates/story-state-contract.md` has ZERO references to `causal_dependency_threat_scan`; `docs/FOUNDATIONS.md` has zero references. The spec's "FOUNDATIONS may keep the principle-level naming since it describes the desired check, not a deployed validator — operator judgment at edit time" allowance is moot because no FOUNDATIONS references exist to begin with. Scope refined.
3. Cross-skill boundary under audit: the validator-name convention used across the two story-pipeline skill files' Phase listings and Rule 5 alignment tables. The skills currently list `causal_dependency_threat_scan` alongside registered validators; the rewrite moves it to a clearly-labeled "judgment-based pre-apply review" framing with a SPEC-35 §Risks & Open Questions forward-pointer.
4. Rule 5 (No Consequence Evasion) motivates this ticket: the principle is enforced today by judgment + the registered validators named in FOUNDATIONS §Validation Rules §Rule 5 enforcement map (`tools/validators/src/rules/rule5-no-consequence-evasion.ts`); future causal-dependency clobbering coverage would extend Rule 5 at structural-validator scope, but is deferred. The skill prose must accurately describe what is enforced today.

## Architecture Check

1. Honest framing (judgment-based review + forward-pointer to deferred implementation) is structurally correct: a future skill reader sees the discipline that runs today and the planned validator that doesn't yet exist. Alternative considered: leave the prose unchanged and add a footnote — rejected because the validator name appears in operational Phase 9 step listings and Rule 5 mechanism tables; future skill readers would still treat it as a registered validator. The rewrite at each reference site is the only durable framing.
2. No backwards-compatibility aliasing introduced. The skill-prose change is editorial; no registry, no validator code, no test coverage changes.

## Verification Layers

1. Each `causal_dependency_threat_scan` reference in the 2 skill files is framed as judgment-based review with forward-pointer → grep-proof: `grep -nE 'causal_dependency_threat_scan' .claude/skills/branching-story-{turn-cycle,health-audit}/SKILL.md` returns matches where surrounding prose includes a "judgment-based" framing AND a SPEC-35 §Risks & Open Questions reference at the first occurrence per skill.
2. No skill prose claims `causal_dependency_threat_scan` is a registered validator after this ticket lands → manual review of the 4 reference sites confirms framing.
3. Skill files parse cleanly as markdown → no broken section headers, no unclosed code blocks.

## What to Change

### 1. Reframe references in `branching-story-turn-cycle/SKILL.md`

- Line 443 (Phase 9 step 8): change the framing from "validator emits X" to a judgment-based-review framing with the forward-pointer. Specifically, replace the existing step's framing (`Causal dependency threat scan (causal_dependency_threat_scan)`) with `Causal dependency threat scan (judgment-based pre-apply review; full deterministic validator implementation deferred — see SPEC-35 §Risks & Open Questions)`. The step's substantive sub-check descriptions (the 4 subcases) remain unchanged.
- Line 495 (Rule 5 mechanism prose): rephrase any "the validator rejects" language as "the operator's judgment-based review rejects" within the relevant sub-clause. Substantive content (the 4 subcases) unchanged.
- Line 510 (Rule 5 alignment table row): in the table cell, change `\`causal_dependency_threat_scan\`` to `causal_dependency_threat_scan (judgment-based)` so the audit-trail row makes the deployment status visible.

### 2. Reframe reference in `branching-story-health-audit/SKILL.md`

- Line 236 (Replay sub-checks): change the framing from "validator sub-checks" to "judgment-based replay sub-checks (parallel to `branching-story-turn-cycle` Phase 9; full deterministic validator implementation deferred — see SPEC-35 §Risks & Open Questions)". The substantive sub-check descriptions remain unchanged.

### 3. No registry change

The validator is not registered today; this deliverable does NOT add a registry entry. `tools/validators/src/public/registry.ts` is unchanged.

### 4. FOUNDATIONS unchanged (zero references)

Step 2 verification confirmed FOUNDATIONS has zero references to `causal_dependency_threat_scan`. No edit needed.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — 3 reference sites at lines 443/495/510)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — 1 reference site at line 236)

## Out of Scope

- Implementing the `causal_dependency_threat_scan` validator (4 subcases) — deferred to validator-hardening-II spec per SPEC-35 §Risks & Open Questions.
- Registry changes — the validator is not registered today and is not added by this ticket.
- FOUNDATIONS edits — Step 2 grep confirmed zero references; no edit needed.
- Shared story-state contract edits — zero references; no edit needed.

## Acceptance Criteria

### Tests That Must Pass

1. Skill grep `grep -nE 'causal_dependency_threat_scan' .claude/skills/branching-story-{turn-cycle,health-audit}/SKILL.md` returns matches that include the "judgment-based" framing AND a SPEC-35 §Risks & Open Questions forward-pointer at the FIRST occurrence per skill.
2. No skill prose at the 4 reference sites claims the validator is registered.
3. Both skill files parse cleanly as markdown (no broken headers, no unclosed code blocks, no broken cross-references).

### Invariants

1. Skill prose accurately describes what is enforced today (judgment-based review) and what is deferred (the registered validator implementation).
2. The forward-pointer (SPEC-35 §Risks & Open Questions) is present at the first occurrence in each skill file so a future reader knows where to find the deferral rationale.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'causal_dependency_threat_scan' .claude/skills/branching-story-{turn-cycle,health-audit}/SKILL.md` — verification grep; expected to return matches WITH the "judgment-based" framing visible in surrounding context.
2. Manual markdown review of the 4 reference sites to confirm framing.
