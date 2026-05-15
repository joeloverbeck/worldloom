# SPEC30STOCONHAR-007: SLT Effects Diversity-Check Three-Form OR

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/SKILL.md` + `specs/SPEC-30-story-contract-hardening-ii.md` implementation note (no schema change)
**Deps**: None

## Problem

At intake, `.claude/skills/commitment-block-authoring/SKILL.md` said `effects.create / supersede / close` MAY be empty when the block's effect-shape is contextual at runtime, but Phase 4 check 3 simultaneously required the batch-diversity belief-or-relationship-coverage check to find literal `effects.create / supersede / close` entries containing BEL/SREL references. Authors who legitimately deferred effects to runtime were forced to invent fake effects to pass the linter. The landed rule now verifies the intended authoring surface without changing the schema.

## Assumption Reassessment (2026-05-15)

1. Verified `.claude/skills/commitment-block-authoring/SKILL.md` carries the effects-may-be-empty allowance exactly as the spec asserts: "`effects.create / supersede / close` MAY be left empty (`[]`) when the block's effect-shape is contextual at runtime".
2. Verified `.claude/skills/commitment-block-authoring/SKILL.md` carries the literal-effects-only requirement at intake: "Intent expressed only in beats or `exit_options.likely_effects` does NOT satisfy this check — the engine's batch-diversity test is on the literal effects field."
3. Verified the batch-diversity check is described as Phase 4 in the SKILL with 4 sub-checks: move-family diversity, recovery coverage, belief-or-relationship coverage, no-branch-local. Only check 3 (belief-or-relationship coverage) has the literal-effects assumption; checks 1, 2, 4 are independent. The spec narrative's "audit ... for any other target with the same literal-effects assumption" call-out is satisfied by check 3 alone in the current SKILL.md state; this ticket documents the audit conclusion explicitly.
4. FOUNDATIONS principle under audit: Rule 1 (No Floating Facts) — schema-minimalism preservation. The three-form OR keeps the rule structural without adding schema fields (no new `effect_intent` or similar). All three forms (`effects.*`, `exit_options[].likely_effects`, `preconditions any_belief` / `any_relationship_axis`) already exist in the SLT schema per shared contract §4.4. Rule 6 (No Silent Retcons): the rule rewrite is a retcon of Phase 4 check 3's enforcement — this ticket cites it explicitly under the landed-change rationale; no silent rewrite.
5. Cross-skill or cross-artifact: this ticket is single-skill, single-rule. No cross-skill boundary.
6. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies skill-internal Phase 4 logic. It does NOT touch any validator or canon-safety check. Mystery Reserve firewall semantics are unchanged.
7. Schema extension classification: NOT a schema extension; this is a rule rewrite. SLT schema unchanged.
8. Live reference sweep correction: `.claude/skills/commitment-block-authoring/references/` does not exist in this checkout, so the reference-sweep proof is limited to the parent `SKILL.md`; no missing reference file is an implementation blocker.
9. Proof-surface correction: this repo has no executable skill runner or test harness for `.claude/skills/commitment-block-authoring`; the intended dry-run cases are verified by manual contract review against the rewritten Phase 4 OR, plus focused grep proof. No validator/tool surface is touched.
10. Explicit spec-reference truthing: `specs/SPEC-30-story-contract-hardening-ii.md` is an active draft with implementation notes for landed D1-D5 follow-ups. This ticket adds the corresponding D6 note rather than rewriting historical D6 proposal prose.

## Architecture Check

1. The three-form OR keeps the schema unchanged while honoring runtime-deferral; the rule now verifies *intent surface* (any of three pre-authored expressions of belief/relationship engagement) rather than forcing fake effects. Schema-minimalism preserved. The alternative — adding a new `effect_intent` field — would proliferate the SLT schema for a discipline that the existing three surfaces already cover.
2. No backwards-compatibility shim: the literal-effects-only rule is replaced outright; the new rule is strictly more permissive (every batch that passed the old rule passes the new rule), so no transitional behavior is needed.

## Verification Layers

1. Rule rewrite → codebase grep-proof: `grep -nE "three-form OR|any_belief|any_relationship_axis" .claude/skills/commitment-block-authoring/SKILL.md` returns the new phrasing.
2. Old absolute claim gone → codebase grep-proof: `! grep -n "literal effects field" .claude/skills/commitment-block-authoring/SKILL.md` returns zero matches.
3. Authoring contract cases → manual contract review: three batches: (a) belief-or-relationship-coverage block uses `any_belief(...)` in preconditions but empty `effects.*` → allowed by the rewritten OR; (b) block uses `exit_options[].likely_effects: [BEL-3]` but empty `effects.*` → allowed by the rewritten OR; (c) every block has empty `effects.*` AND no `exit_options.likely_effects` AND no `any_belief` / `any_relationship_axis` predicate → still fails the coverage rule.
4. Single-skill ticket: validator surface is untouched (the diversity check is skill-internal Phase 4 logic, not a separate validator file); additional layer mapping is not applicable.

## Landed Changes

### 1. Phase 4 check 3 rewrite

In `.claude/skills/commitment-block-authoring/SKILL.md` Phase 4 batch-diversity check 3, the literal-effects-only requirement was replaced with the three-form OR. At least one block in the batch satisfies belief-or-relationship coverage by ANY of:

- `effects.create / supersede / close` references a `BEL-<integer>` / `SREL-<integer>` record or a `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL` (existing literal form).
- `exit_options[].likely_effects` references a `BEL-<integer>` / `SREL-<integer>` record or `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL`.
- `preconditions.hard / soft` includes `any_belief(...)` or `any_relationship_axis(...)`.

The closing sentence now states: "Actual runtime consequences remain authoritative in `SE.state_delta` — the batch-diversity check verifies *intent surface*, not pre-authored effects."

### 2. Sibling-rule audit documentation

Within Phase 4, the skill now documents the audit conclusion that checks 1 (move-family diversity), 2 (recovery coverage), and 4 (no-branch-local) do not depend on literal-effects-only assumptions, so the three-form OR applies only to check 3. Spec narrative item 3 called for this audit explicitly; the conclusion is recorded inline so a future reader sees the call-out was honored.

### 3. References sweep

Searched `.claude/skills/commitment-block-authoring/SKILL.md` for the literal-effects-only stale anchor and confirmed `.claude/skills/commitment-block-authoring/references/` does not exist in this checkout. The SPEC-30 D6 status note was updated because the user explicitly supplied `specs/SPEC-30*` as an authority surface.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 4 check 3 rewrite + sibling-audit note)
- `specs/SPEC-30-story-contract-hardening-ii.md` (modify — D6 implementation note)

## Out of Scope

- Any change to the SLT schema (deliberately schema-minimalism preserved).
- Any change to checks 1, 2, 4 of Phase 4 (audit conclusion: parallel literal-effects assumption is absent).
- Any new predicate or any change to `any_belief` / `any_relationship_axis` semantics.
- Any change to runtime `SE.state_delta` discipline.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "three-form OR|any_belief|any_relationship_axis" .claude/skills/commitment-block-authoring/SKILL.md` returns hits in Phase 4 check 3.
2. `! grep -n "literal effects field" .claude/skills/commitment-block-authoring/SKILL.md` returns zero matches.
3. `test ! -d .claude/skills/commitment-block-authoring/references` confirms there is no references subtree requiring a stale-anchor sweep.
4. `grep -n "intent surface" .claude/skills/commitment-block-authoring/SKILL.md` returns the new closing sentence's anchor phrase.
5. Manual review confirms the three intended authoring cases above are encoded by the rewritten Phase 4 OR.

### Invariants

1. Schema minimalism preserved — no SLT field added.
2. Runtime-deferred effects (`effects.* = []`) are lawful when intent is expressed via `exit_options[].likely_effects` or `any_belief` / `any_relationship_axis` predicates.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is command-based plus manual contract review because no executable skill runner exists in this repo.`

### Commands

1. `grep -nE "three-form OR|any_belief|any_relationship_axis|intent surface" .claude/skills/commitment-block-authoring/SKILL.md`
2. `! grep -rn "literal effects field" .claude/skills/commitment-block-authoring/`
3. `test ! -d .claude/skills/commitment-block-authoring/references`
4. Manual review of Phase 4 check 3 against the three intended cases.
5. The narrow proof is correct because the change is in skill prose; no tool surface to typecheck and no validator surface to test.

## Outcome

Completed. `.claude/skills/commitment-block-authoring/SKILL.md` now lets Phase 4 belief-or-relationship coverage pass through literal effects, `exit_options[].likely_effects`, or `any_belief(...)` / `any_relationship_axis(...)` predicates, while keeping `SE.state_delta` authoritative for runtime consequences. The skill also records that the other Phase 4 checks do not inspect literal effects, and `specs/SPEC-30-story-contract-hardening-ii.md` now has a D6 implementation note.

## Verification Result

1. `grep -nE "three-form OR|any_belief|any_relationship_axis|intent surface" .claude/skills/commitment-block-authoring/SKILL.md` — PASS; returned the new Phase 4 three-form OR and intent-surface wording.
2. `! grep -n "literal effects field" .claude/skills/commitment-block-authoring/SKILL.md` — PASS; the old absolute claim is gone from the active skill.
3. `test ! -d .claude/skills/commitment-block-authoring/references` — PASS; there is no references subtree to update.
4. `grep -n "D6 landed" specs/SPEC-30-story-contract-hardening-ii.md` — PASS; returned the new D6 implementation note.
5. Manual contract review — PASS; the rewritten OR covers the `any_belief(...)` precondition case and the `exit_options[].likely_effects: [BEL-3]` case while preserving failure for batches with no literal effects, no likely effects, and no qualifying belief/relationship predicate.

## Deviations

- The drafted reference sweep named `.claude/skills/commitment-block-authoring/references/`, but that directory is absent in the live repo. The accepted proof records the absent subtree instead of running a noisy missing-path grep.
- The drafted skill dry-run was replaced with manual contract review plus grep proof because this repo has no executable skill runner for `.claude/skills/commitment-block-authoring`.
