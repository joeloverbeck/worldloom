# SPEC25STOCOHHAR-007: Predicate DSL v2 — skill integration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `commitment-block-authoring`, `branching-story-turn-cycle`, `branching-story-health-audit`; adds a bounded bootstrap follow-up ticket; updates the SPEC-25 implementation note. No tool / schema change.
**Deps**: archive/tickets/SPEC25STOCOHHAR-006.md

## Problem

At intake, the predicate DSL v2 grammar, storylet schema, and parsability validator had landed (SPEC25STOCOHHAR-006), but the D4-enumerated skills that author, resolve, and audit commitment blocks did not yet consistently use the six existential predicates and alias binding. `commitment-block-authoring`'s `direct_batch` mode could still read as affordance-prefilter-only; `branching-story-turn-cycle` needed explicit bind-then-instantiate resolution; `branching-story-health-audit` needed to count binding-predicate storylets as actionable only when aliases resolve against branch state.

## Assumption Reassessment (2026-05-14)

1. `commitment-block-authoring` has a `direct_batch` mode (fresh batch addressing 11 causal-function coverage targets) and an `audit_repair` mode (consumes `RSP-<integer>` cards). `branching-story-turn-cycle` resolves `SLT` eligibility against current branch state and emits `effects`. `branching-story-health-audit` has unactionable-debt and plan-grounding structural checks. All three are Skill Category 2c per FOUNDATIONS §Story Bundles §7.
2. SPEC-25 D4 §Skills prescribes: `commitment-block-authoring` (`direct_batch` + `audit_repair`) authors global-pool blocks with existential predicates against the 11 coverage targets; `branching-story-turn-cycle` resolves existential predicates against current branch state, binds aliases, and instantiates `effects` from bound aliases at block selection; `branching-story-health-audit` unactionable-debt / plan-grounding checks account for binding-predicate storylets.
3. Cross-skill boundary under audit: the predicate DSL (contract §5, landed by SPEC25STOCOHHAR-006) shared across `commitment-block-authoring` (authors predicates), `branching-story-turn-cycle` (resolves + binds + instantiates effects), and `branching-story-health-audit` (audits binding-predicate storylets). The shared contract under audit is the alias-binding resolution order.
4. FOUNDATIONS Rule 4 (No Globalization by Accident): restated before trusting the spec — `commitment-block-authoring`'s `direct_batch` must author `global_author_pool` blocks whose existential predicates reference no branch-local IDs. The skill's existing Rule 4 / Gate 4 discipline is unchanged in intent; the existential predicates broaden its expressive reach while staying actor-unbound.
5. Adjacent contradiction classification (SPEC-25 §Risks): SPEC-25 flagged `bound:<alias>` resolution order as "the most novel surface" — when `branching-story-turn-cycle` binds aliases versus when it instantiates `effects` from them at block selection needed a deterministic operational rule. Classified as a **required design task of this ticket** and resolved here: `branching-story-turn-cycle` now pins the order as bind first, select second, instantiate third. No §5 shared-template wording refinement was required because the existing contract already states alias binding during block selection.
6. Adjacent contradiction classification (`branching-story-bootstrap` seed blocks): SPEC-25 D4's Problem statement names "`branching-story-bootstrap`'s global seed blocks are shallow by construction" as part of the gap D4 closes, but D4 §Skills does not enumerate `branching-story-bootstrap` as a fix site. Live verification shows `branching-story-bootstrap` Phase 5 authors seed `SLT` records directly and the skill explicitly says it never invokes `commitment-block-authoring`. Classified as **separate follow-up-owned work**, not a required edit in this ticket. `archive/tickets/SPEC25STOCOHHAR-011.md` owns teaching bootstrap seed-block authoring to use predicate DSL v2; this ticket updates the three D4-enumerated skills only.
7. Verification-surface correction: the drafted "Skill dry-run" commands are not executable in the current Codex session; there is no exposed workflow runner that can safely invoke these canon-mutating `.claude/skills/*` flows end-to-end without user approval and live world inputs. The truthful verification surface for this skill-prose ticket is manual contract review plus grep/stale-anchor proof over the edited skills, backed by SPEC25STOCOHHAR-006's already-landed validator tests for parsability.
8. Contract §5 already states the needed alias-binding resolution order: existential predicates bind aliases during block selection, and `effects` / `likely_effects` may reference `bound:<alias>`. No shared-template edit is required for this ticket; the operational skill prose now consumes that existing contract.

## Architecture Check

1. The skill changes live in the three skills that already own block authoring / resolution / audit — no new skill, no new orchestration layer. The existential predicates broaden what `global_author_pool` blocks can prefilter on without changing the closed-DSL discipline.
2. No shims: `branching-story-turn-cycle` resolves existential predicates directly against current branch state; there is no compatibility path treating the new predicates as affordance-only or deferring binding.

## Verification Layers

1. `commitment-block-authoring` `direct_batch` / `audit_repair` author `global_author_pool` blocks using existential predicates -> manual review + grep-proof over `commitment-block-authoring` SKILL.md; emitted predicate parsability remains backed by SPEC25STOCOHHAR-006's validator tests.
2. `branching-story-turn-cycle` resolves an existential predicate, binds the alias, and instantiates `effects` from `bound:<alias>` -> manual review + grep-proof over `branching-story-turn-cycle` SKILL.md.
3. `branching-story-health-audit` unactionable-debt / plan-grounding checks account for binding-predicate storylets -> manual review + grep-proof over `branching-story-health-audit` SKILL.md.
4. The alias-binding resolution order is documented and deterministic -> manual review of `branching-story-turn-cycle` SKILL.md.

## Landed Changes

### 1. commitment-block-authoring

`direct_batch` and `audit_repair` modes now author `global_author_pool` blocks with existential predicates against the 11 causal-function coverage targets. `audit_repair` now translates author-pool RSP targets for `OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, and `STINT` into actor-unbound existential predicates instead of copying branch-local ids.

### 2. branching-story-turn-cycle

`SLT` eligibility now resolves existential predicates against current branch state, binds aliases, and instantiates `effects` / `likely_effects` from the bound aliases at block selection. The SKILL.md pins the resolution order as bind first, select second, instantiate third.

### 3. branching-story-health-audit

Unactionable-debt and plan-grounding checks now account for binding-predicate storylets. A storylet whose `effects` or `likely_effects` reference `bound:<alias>` is actionable / grounded only when its binding precondition can match current branch state.

### 4. Bootstrap follow-up boundary

Created `archive/tickets/SPEC25STOCOHHAR-011.md` for `branching-story-bootstrap` seed `SLT` authoring because bootstrap writes seed blocks directly and does not route through `commitment-block-authoring`.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `archive/tickets/SPEC25STOCOHHAR-011.md` (new — bootstrap seed-block follow-up, later completed/archived)
- `specs/SPEC-25-story-coherence-hardening.md` (modify — implementation note and D4 risk note)

## Out of Scope

- The DSL v2 grammar, storylet schema, and parsability validator — SPEC25STOCOHHAR-006.
- `branching-story-bootstrap` seed-block authoring — not enumerated in SPEC-25 D4 §Skills and verified as directly authored by bootstrap; owned by `archive/tickets/SPEC25STOCOHHAR-011.md`.
- `engine_jargon_leak` literal-list completeness in `branching-story-prose-attach` — see SPEC25STOCOHHAR-006 Out of Scope.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review + grep-proof: `commitment-block-authoring` `direct_batch` / `audit_repair` author `global_author_pool` blocks using existential predicates and `bound:<alias>` effect references where appropriate.
2. Manual review + grep-proof: `branching-story-turn-cycle` resolves existential predicates, binds aliases, and instantiates `effects` / `likely_effects` from `bound:<alias>` at block selection.
3. `grep -nE "bound:|resolution order|bind|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the bind-then-instantiate resolution order is documented.

### Invariants

1. `global_author_pool` blocks authored by `commitment-block-authoring` use existential predicates and reference no branch-local IDs.
2. `branching-story-turn-cycle` binds aliases before instantiating `effects` from them; the resolution order is documented and deterministic.

## Test Plan

### New/Modified Tests

None — skill-prose ticket (no automated test files change); verification is manual review + grep-proof, and the DSL v2 parsability coverage that backs this ticket is the `rule_storylet_predicate_dsl_parsability` test added in SPEC25STOCOHHAR-006, named in Assumption Reassessment item 3.

### Commands

1. `grep -nE "bound:|resolution order|bind|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `grep -nE "bound:|resolution order|bind|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/branching-story-turn-cycle/SKILL.md`
3. Manual review of the edited skill sections against `.claude/skills/_shared-templates/story-state-contract.md` §5 and SPEC25STOCOHHAR-006's landed validator contract. No executable skill runner is exposed in this Codex session; the structural validity of emitted predicate-bearing blocks is covered by SPEC25STOCOHHAR-006's `rule_storylet_predicate_dsl_parsability` tests.

## Outcome

Completed on 2026-05-14.

Implemented predicate DSL v2 operational guidance in the three D4-enumerated skills. `commitment-block-authoring` now teaches `direct_batch` and `audit_repair` to use all six existential predicates plus `bound:<alias>` effects. `branching-story-turn-cycle` now documents deterministic bind-first / select-second / instantiate-third alias resolution and treats instantiated `bound:<alias>` targets as concrete `SE.state_delta` targets. `branching-story-health-audit` now evaluates binding-predicate storylets for unactionable debt, plan grounding, and continuation checks by resolving aliases against the current leaf snapshot.

Created `archive/tickets/SPEC25STOCOHHAR-011.md` for the separately verified bootstrap seed-block gap, and updated `specs/SPEC-25-story-coherence-hardening.md` so the implementation note and D4 risk note no longer say all D4 skill integration remains unresolved.

## Verification Result

1. `grep -nE "bound:|resolution order|bind|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — PASS; all three edited skills surface the binding/predicate contract at their owned authoring, runtime, or audit seams.
2. `grep -nE "bound:|resolution order|bind|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/branching-story-turn-cycle/SKILL.md` — PASS; turn-cycle documents the bind-first / select-second / instantiate-third resolution order and all six existential predicates.
3. Manual review — PASS; the edited skill prose aligns with `.claude/skills/_shared-templates/story-state-contract.md` §5, which already defines alias binding and `bound:<alias>` effect references.
4. `git diff --check` — PASS.

## Deviations

- The drafted skill dry-runs were replaced with manual review plus grep-proof because no executable skill runner is exposed in this Codex session for safely invoking canon-mutating story-pipeline skills end-to-end with live world inputs.
- `.claude/skills/_shared-templates/story-state-contract.md` was not edited. Its §5 already states the required alias-binding order and `bound:<alias>` contract; this ticket only needed operational skill prose.
- `branching-story-bootstrap` seed-block authoring is not covered by `commitment-block-authoring`; it authors seed `SLT` records directly. That same-seam residual is split to `archive/tickets/SPEC25STOCOHHAR-011.md`.
