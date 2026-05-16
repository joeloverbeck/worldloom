# SPEC35STOPIPEIG-005: Downgrade causal_dependency_threat_scan skill prose to judgment-based review

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/branching-story-health-audit/SKILL.md` (skill prose only)
**Deps**: `archive/specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D5

## Problem

At intake, `tools/validators/src/public/registry.ts` registered 20 structural validators; none was `causal_dependency_threat_scan`. Grep across `tools/validators/src/{structural,rules}/` returned zero implementation matches. The name appeared in skill prose as if it were a registered validator at:
- `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 9 step 8 ("Causal dependency threat scan (`causal_dependency_threat_scan`)")
- `.claude/skills/branching-story-turn-cycle/SKILL.md` Rule 5 mechanism prose
- `.claude/skills/branching-story-turn-cycle/SKILL.md` Rule 5 alignment table row
- `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2g replay sub-checks

(Step 2 codebase validation confirmed zero references in `.claude/skills/_shared-templates/story-state-contract.md` and `docs/FOUNDATIONS.md` — the spec's contemplated FOUNDATIONS edit is unnecessary; scope refined to 4 references across 2 skill files.)

This was documented-but-missing drift — skill prose promised a deterministic check that does not exist. Implementing the four subcases (`choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, `slt_precondition_clobbered`) is multi-file new-feature work; deferred to validator-hardening-II per SPEC-35 §Risks & Open Questions. This ticket now honestly frames the skill prose as judgment-based pre-apply/replay review with the planned validator named as a forward-pointer.

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

## Landed Changes

### 1. Reframe references in `branching-story-turn-cycle/SKILL.md`

- Phase 9 step 8 now frames the causal dependency threat scan as a judgment-based pre-apply review and points to SPEC-35 §Risks & Open Questions for the deferred full deterministic validator.
- Rule 5 mechanism prose now says the judgment-based causal dependency review rejects clobbered choices, affordances, obligations, and high-salience debt paths.
- The Rule 5 alignment table marks `causal_dependency_threat_scan` as judgment-based so the audit-trail row makes the deployment status visible.

### 2. Reframe reference in `branching-story-health-audit/SKILL.md`

- Phase 2g now frames the replay surface as judgment-based sub-checks parallel to `branching-story-turn-cycle` Phase 9 and points to SPEC-35 §Risks & Open Questions for the deferred full deterministic validator.

### 3. No registry change

The validator is not registered today; this deliverable did not add a registry entry. `tools/validators/src/public/registry.ts` is unchanged.

### 4. FOUNDATIONS unchanged (zero references)

Step 2 verification confirmed FOUNDATIONS has zero exact `causal_dependency_threat_scan` references. No edit needed.

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

## Outcome

Completed 2026-05-16. The two story-pipeline skill files now describe `causal_dependency_threat_scan` as judgment-based review/replay discipline with a SPEC-35 §Risks & Open Questions forward-pointer for the deferred deterministic validator. No validator registry, source, schema, FOUNDATIONS, or shared story-state contract changes were made.

## Verification Result

- `grep -nE 'causal_dependency_threat_scan' .claude/skills/branching-story-{turn-cycle,health-audit}/SKILL.md` returned three live skill hits, each with judgment-based/deferred-validator framing.
- `rg -n "registered validator|validator emits|the validator rejects|validator sub-checks|Causal dependency threat" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returned only the reframed Phase 9 heading, with no stale registered-validator or validator-rejects wording.
- `rg -n "causal_dependency_threat_scan|causal-dependency-threat-scan" tools/validators/src/structural tools/validators/src/rules` returned no implementation hits, confirming the registry/source boundary remains unchanged.
- `git diff --check -- .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` passed.

## Deviations

- The spec's broader D5 discussion mentioned possible FOUNDATIONS treatment, but live reassessment found no exact `causal_dependency_threat_scan` hits in `docs/FOUNDATIONS.md`; FOUNDATIONS stayed unchanged.
- The broader discovery sweep still finds historical/planning references in SPEC-35 and its triage doc. Those are not operational skill prose and remain valid provenance for the deferred validator-hardening-II work.
