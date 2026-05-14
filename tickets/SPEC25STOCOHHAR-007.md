# SPEC25STOCOHHAR-007: Predicate DSL v2 — skill integration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `commitment-block-authoring`, `branching-story-turn-cycle`, `branching-story-health-audit`; conditionally amends `.claude/skills/_shared-templates/story-state-contract.md` (§5 resolution-order prose only, per SPEC-25 §Risks). No tool / schema change.
**Deps**: archive/tickets/SPEC25STOCOHHAR-006.md

## Problem

With the predicate DSL v2 grammar, storylet schema, and parsability validator landed (SPEC25STOCOHHAR-006), the skills that author and resolve commitment blocks must actually use the six existential predicates and alias binding. `commitment-block-authoring`'s `direct_batch` mode authored global-pool blocks that could prefilter only on affordances; `branching-story-turn-cycle` must resolve existential predicates against branch state, bind aliases, and instantiate `effects` from the bound aliases at block selection. Without this ticket, DSL v2 is parseable but unused.

## Assumption Reassessment (2026-05-14)

1. `commitment-block-authoring` has a `direct_batch` mode (fresh batch addressing 11 causal-function coverage targets) and an `audit_repair` mode (consumes `RSP-<integer>` cards). `branching-story-turn-cycle` resolves `SLT` eligibility against current branch state and emits `effects`. `branching-story-health-audit` has unactionable-debt and plan-grounding structural checks. All three are Skill Category 2c per FOUNDATIONS §Story Bundles §7.
2. SPEC-25 D4 §Skills prescribes: `commitment-block-authoring` (`direct_batch` + `audit_repair`) authors global-pool blocks with existential predicates against the 11 coverage targets; `branching-story-turn-cycle` resolves existential predicates against current branch state, binds aliases, and instantiates `effects` from bound aliases at block selection; `branching-story-health-audit` unactionable-debt / plan-grounding checks account for binding-predicate storylets.
3. Cross-skill boundary under audit: the predicate DSL (contract §5, landed by SPEC25STOCOHHAR-006) shared across `commitment-block-authoring` (authors predicates), `branching-story-turn-cycle` (resolves + binds + instantiates effects), and `branching-story-health-audit` (audits binding-predicate storylets). The shared contract under audit is the alias-binding resolution order.
4. FOUNDATIONS Rule 4 (No Globalization by Accident): restated before trusting the spec — `commitment-block-authoring`'s `direct_batch` must author `global_author_pool` blocks whose existential predicates reference no branch-local IDs. The skill's existing Rule 4 / Gate 4 discipline is unchanged in intent; the existential predicates broaden its expressive reach while staying actor-unbound.
5. Adjacent contradiction classification (SPEC-25 §Risks): SPEC-25 flags `bound:<alias>` resolution order as "the most novel surface" — when `branching-story-turn-cycle` binds aliases versus when it instantiates `effects` from them at block selection "needs careful design at implementation time and may surface contract-wording refinements." Classified as a **required design task of this ticket**: the resolution order (bind-then-instantiate) must be pinned in `branching-story-turn-cycle` SKILL.md; if implementation surfaces a §5 wording refinement, it lands here as a targeted §5 edit scoped to the alias-binding resolution-order prose only — not as a follow-up ticket.
6. Adjacent contradiction classification (`branching-story-bootstrap` seed blocks): SPEC-25 D4's Problem statement names "`branching-story-bootstrap`'s global seed blocks are shallow by construction" as part of the gap D4 closes, but D4 §Skills does not enumerate `branching-story-bootstrap` as a fix site. Classified as: **needs implementer confirmation** during implementation — if `branching-story-bootstrap`'s global-seed-`SLT` authoring routes through `commitment-block-authoring`'s shared SLT-authoring discipline (the shared contract §4.4), this ticket's `commitment-block-authoring` changes cover it transitively; if `branching-story-bootstrap` authors seed blocks via its own logic, a follow-up ticket is required. Surfaced in this batch's Step 6 cross-spec follow-ups.

## Architecture Check

1. The skill changes live in the three skills that already own block authoring / resolution / audit — no new skill, no new orchestration layer. The existential predicates broaden what `global_author_pool` blocks can prefilter on without changing the closed-DSL discipline.
2. No shims: `branching-story-turn-cycle` resolves existential predicates directly against current branch state; there is no compatibility path treating the new predicates as affordance-only or deferring binding.

## Verification Layers

1. `commitment-block-authoring` `direct_batch` authors `global_author_pool` blocks using existential predicates -> skill dry-run; the emitted blocks pass `rule_storylet_predicate_dsl_parsability` (SPEC25STOCOHHAR-006).
2. `branching-story-turn-cycle` resolves an existential predicate, binds the alias, and instantiates `effects` from `bound:<alias>` -> skill dry-run on a branch with eligible social state.
3. `branching-story-health-audit` unactionable-debt / plan-grounding checks account for binding-predicate storylets -> skill dry-run against a fixture bundle containing binding-predicate `SLT` records.
4. The alias-binding resolution order is documented and deterministic -> manual review of `branching-story-turn-cycle` SKILL.md.

## What to Change

### 1. commitment-block-authoring

`direct_batch` and `audit_repair` modes author `global_author_pool` blocks with existential predicates against the 11 causal-function coverage targets.

### 2. branching-story-turn-cycle

`SLT` eligibility resolves existential predicates against current branch state, binds aliases, and instantiates `effects` from the bound aliases at block selection. Pin the resolution order (bind-then-instantiate) explicitly in the SKILL.md.

### 3. branching-story-health-audit

Unactionable-debt and plan-grounding checks account for binding-predicate storylets (a storylet whose `effects` reference `bound:<alias>` is actionable when its binding precondition can match current branch state).

### 4. Contract §5 resolution-order refinement (conditional)

If implementation surfaces a contract-wording refinement per SPEC-25 §Risks, land a targeted §5 edit scoped to the alias-binding resolution-order prose only. If no refinement is needed, this file is not touched.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5 alias-binding resolution-order prose; **conditional**, only if implementation surfaces a refinement per SPEC-25 §Risks)

## Out of Scope

- The DSL v2 grammar, storylet schema, and parsability validator — SPEC25STOCOHHAR-006.
- `branching-story-bootstrap` seed-block authoring — not enumerated in SPEC-25 D4 §Skills; see Assumption Reassessment item 6 for the classification (transitively covered via the shared SLT-authoring contract, or a follow-up ticket if `branching-story-bootstrap` authors seed blocks via its own logic).
- `engine_jargon_leak` literal-list completeness in `branching-story-prose-attach` — see SPEC25STOCOHHAR-006 Out of Scope.

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `commitment-block-authoring` `direct_batch` emits `global_author_pool` blocks using existential predicates that pass `rule_storylet_predicate_dsl_parsability`.
2. Skill dry-run: `branching-story-turn-cycle` resolves an existential predicate, binds an alias, and instantiates `effects` from `bound:<alias>` at block selection.
3. `grep -nE "bound:|resolution order|bind" .claude/skills/branching-story-turn-cycle/SKILL.md` confirms the bind-then-instantiate resolution order is documented.

### Invariants

1. `global_author_pool` blocks authored by `commitment-block-authoring` use existential predicates and reference no branch-local IDs.
2. `branching-story-turn-cycle` binds aliases before instantiating `effects` from them; the resolution order is documented and deterministic.

## Test Plan

### New/Modified Tests

None — skill-prose ticket (no automated test files change); verification is skill dry-run + grep-proof, and the DSL v2 parsability coverage that backs this ticket is the `rule_storylet_predicate_dsl_parsability` test added in SPEC25STOCOHHAR-006, named in Assumption Reassessment item 3.

### Commands

1. Skill dry-run of `commitment-block-authoring` (`direct_batch` mode) and `branching-story-turn-cycle` (invoke via the `Skill` tool, inspect emitted blocks / effects, do not commit).
2. `grep -nE "bound:|resolution order|bind" .claude/skills/branching-story-turn-cycle/SKILL.md`
3. Skill dry-runs are the correct verification boundary — story-pipeline skills have no unit-test harness; the structural validity of the emitted predicate-bearing blocks is covered by SPEC25STOCOHHAR-006's `rule_storylet_predicate_dsl_parsability` tests.
