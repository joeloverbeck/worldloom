# SPEC25STOCOHHAR-011: Predicate DSL v2 for bootstrap seed storylets

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `branching-story-bootstrap` and updates SPEC-25/ticket closeout only. No tool / schema change.
**Deps**: archive/tickets/SPEC25STOCOHHAR-007.md

## Problem

At intake, SPEC25STOCOHHAR-007 verified that `branching-story-bootstrap` authored seed `SLT` records directly instead of routing through `commitment-block-authoring`. Its Phase 5 seed blocks therefore remained outside the predicate DSL v2 operational guidance that SPEC25STOCOHHAR-007 added to the three D4-enumerated skills. This ticket aligned bootstrap seed blocks with the same actor-unbound existential predicates and `bound:<alias>` discipline when they create broad `global_author_pool` blocks from root-page state.

## Assumption Reassessment (2026-05-14)

1. `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 5 directly authors optional seed `SLT` records with `scope.visibility: global_author_pool`, `created_at_page: null`, and `provenance.origin: bootstrap_seed`; the skill explicitly says it never invokes `commitment-block-authoring`.
2. SPEC-25 D4's Problem statement named bootstrap global seed blocks as shallow by construction, but D4 §Skills enumerated `commitment-block-authoring`, `branching-story-turn-cycle`, and `branching-story-health-audit` as the immediate skill sites. SPEC25STOCOHHAR-007 landed those enumerated sites and split this direct bootstrap authoring surface here.
3. Cross-skill boundary under audit: bootstrap's seed `SLT` authoring must stay aligned with `.claude/skills/_shared-templates/story-state-contract.md` §4.4 / §5 and with the operational authoring discipline now documented in `commitment-block-authoring`.
4. FOUNDATIONS Rule 4 (No Globalization by Accident): bootstrap seed `global_author_pool` blocks may use actor-unbound existential predicates, but they must not name branch-local ids. At bootstrap there is no non-root branch-local state yet; nevertheless, the skill must preserve the same no-branch-local-dependency discipline for future consistency.
5. Dirty-worktree boundary: `archive/tickets/SPEC25STOCOHHAR-007.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `.codex/skills/implement-ticket/SKILL.md`, and the initial SPEC-25 implementation-note changes were pre-existing same-family/sibling work. This ticket owns only the new bootstrap Phase 5 predicate/alias prose, SPEC-25 note updates that mark SPEC25STOCOHHAR-011 landed, and this ticket closeout.

## Architecture Check

1. Updating bootstrap directly is cleaner than making bootstrap invoke `commitment-block-authoring`: the skills intentionally do not chain, and bootstrap owns its root-page bundle creation flow.
2. No shims: seed `SLT` guidance uses the same predicate DSL v2 contract, not a bootstrap-only alternate vocabulary.

## Verification Layers

1. Bootstrap Phase 5 names all six predicate DSL v2 existential predicates and `bound:<alias>` effect references -> grep-proof + manual review.
2. Bootstrap seed-block branch-isolation wording still forbids branch-local ids in `global_author_pool` blocks -> manual review against FOUNDATIONS Rule 4.

## Landed Changes

### 1. Bootstrap Phase 5 seed-block authoring

Bootstrap Phase 5 now teaches optional seed blocks to prefer `any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, and `any_intention` when the opening seed includes matching social state.

### 2. Alias-binding effects

Bootstrap Phase 5 now documents that `effects` / `likely_effects` may use `bound:<alias>` only when the same seed `SLT` preconditions bind that alias.

### 3. SPEC-25 closeout note

SPEC-25's implementation note and D4 risk entry now state that SPEC25STOCOHHAR-011 landed the bootstrap seed-block integration.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `archive/specs/SPEC-25-story-coherence-hardening.md` (modify)
- `archive/tickets/SPEC25STOCOHHAR-011.md` (modify — closeout/archive handoff)

## Out of Scope

- The grammar, schema, or validator for predicate DSL v2 — already landed in SPEC25STOCOHHAR-006.
- The D4-enumerated operational skill integration in `commitment-block-authoring`, `branching-story-turn-cycle`, and `branching-story-health-audit` — SPEC25STOCOHHAR-007.
- `CHC.grounded_in` and gate-7 validator work — SPEC25STOCOHHAR-008.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "bound:|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/branching-story-bootstrap/SKILL.md`
2. Manual review: Phase 5 seed-block authoring uses predicate DSL v2 without weakening branch-isolation wording.
3. `grep -nE "SPEC25STOCOHHAR-011 landed|bootstrap by SPEC25STOCOHHAR-011" archive/specs/SPEC-25-story-coherence-hardening.md`

### Invariants

1. Bootstrap seed `global_author_pool` blocks can prefilter on first-class social state without naming branch-local ids.
2. Every `bound:<alias>` seed-block reference is introduced by a same-`SLT` existential predicate.

## Test Plan

### New/Modified Tests

None — skill-prose ticket; verification is grep-proof plus manual review against the shared story-state contract.

### Commands

1. `grep -nE "bound:|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/branching-story-bootstrap/SKILL.md`
2. Manual review of Phase 5 against `.claude/skills/_shared-templates/story-state-contract.md` §4.4 / §5 and FOUNDATIONS Rule 4.
3. `grep -nE "SPEC25STOCOHHAR-011 landed|bootstrap by SPEC25STOCOHHAR-011" archive/specs/SPEC-25-story-coherence-hardening.md`
4. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md archive/specs/SPEC-25-story-coherence-hardening.md`
5. `awk '/[[:blank:]]$/ { print FILENAME ":" FNR ": trailing whitespace"; bad=1 } END { exit bad }' archive/tickets/SPEC25STOCOHHAR-011.md`
6. No broader package or workflow command applies; this is a skill-prose ticket and predicate parsability remains covered by the validator tests landed in archive/tickets/SPEC25STOCOHHAR-006.md.

## Outcome

Completed on 2026-05-14.

Updated `branching-story-bootstrap` Phase 5 so bootstrap seed `SLT` records use predicate DSL v2 for social-state coverage when the opening seed includes matching `OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, or `STINT` state. The skill now names all six actor-unbound existential predicates, gives stable alias examples, and constrains `bound:<alias>` references to same-`SLT` predicate bindings.

Updated SPEC-25's implementation note and D4 risk entry so the spec no longer describes bootstrap seed-block integration as pending.

## Verification Result

1. `grep -nE "bound:|any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" .claude/skills/branching-story-bootstrap/SKILL.md` — PASS; Phase 5 names all six existential predicates and the `bound:<alias>` discipline.
2. Manual review — PASS; Phase 5 keeps `global_author_pool` branch-isolation wording intact and aligns with `.claude/skills/_shared-templates/story-state-contract.md` §4.4 / §5 plus FOUNDATIONS Rule 4.
3. `grep -nE "SPEC25STOCOHHAR-011 landed|bootstrap by SPEC25STOCOHHAR-011" archive/specs/SPEC-25-story-coherence-hardening.md` — PASS; SPEC-25 records the landed bootstrap slice.
4. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md archive/specs/SPEC-25-story-coherence-hardening.md` — PASS; tracked edited skill/spec surfaces had no whitespace errors.
5. `awk '/[[:blank:]]$/ { print FILENAME ":" FNR ": trailing whitespace"; bad=1 } END { exit bad }' archive/tickets/SPEC25STOCOHHAR-011.md` — PASS; the untracked archived ticket file had no trailing whitespace after the plain-`mv` archive handoff.

## Deviations

- SPEC-25 was added to the touched files during closeout because the user explicitly supplied `specs/SPEC-25*`, and its same-seam implementation note/risk entry needed to stop describing SPEC25STOCOHHAR-011 as pending.
- No executable skill dry-run was run. This is a skill-prose ticket; predicate parsability and schema validity remain covered by SPEC25STOCOHHAR-006's validator tests, while this ticket's owned invariant is verified by grep-proof and manual contract review.
- Post-ticket review corrected the hygiene proof wording because the active ticket file was untracked at implementation time. Plain `git diff --check` did not cover that file, so review added the explicit `awk` trailing-whitespace check above and reran it on the archived path after archival.
