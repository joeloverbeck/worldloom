# SPEC30STOCONHAR-007: SLT Effects Diversity-Check Three-Form OR

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/SKILL.md` + `references/` (no schema change)
**Deps**: None

## Problem

`commitment-block-authoring/SKILL.md:214` says `effects.create / supersede / close` MAY be empty when the block's effect-shape is contextual at runtime. `commitment-block-authoring/SKILL.md:241-242` simultaneously requires the batch-diversity belief-or-relationship-coverage check to find LITERAL `effects.create / supersede / close` entries containing BEL/SREL references. Authors who legitimately defer effects to runtime are forced to invent fake effects to pass the linter. The rule fights the schema's runtime-deferral allowance.

## Assumption Reassessment (2026-05-15)

1. Verified `commitment-block-authoring/SKILL.md:214` carries the effects-may-be-empty allowance exactly as the spec asserts: "`effects.create / supersede / close` MAY be left empty (`[]`) when the block's effect-shape is contextual at runtime".
2. Verified `commitment-block-authoring/SKILL.md:241-242` carries the literal-effects-only requirement: "Intent expressed only in beats or `exit_options.likely_effects` does NOT satisfy this check — the engine's batch-diversity test is on the literal effects field."
3. Verified the batch-diversity check is described as Phase 4 in the SKILL with 4 sub-checks: move-family diversity, recovery coverage, belief-or-relationship coverage, no-branch-local. Only check 3 (belief-or-relationship coverage) has the literal-effects assumption; checks 1, 2, 4 are independent. The spec narrative's "audit ... for any other target with the same literal-effects assumption" call-out is satisfied by check 3 alone in the current SKILL.md state; this ticket documents the audit conclusion explicitly.
4. FOUNDATIONS principle under audit: Rule 1 (No Floating Facts) — schema-minimalism preservation. The three-form OR keeps the rule structural without adding schema fields (no new `effect_intent` or similar). All three forms (`effects.*`, `exit_options[].likely_effects`, `preconditions any_belief` / `any_relationship_axis`) already exist in the SLT schema per shared contract §4.4. Rule 6 (No Silent Retcons): the rule rewrite is a retcon of Phase 4 check 3's enforcement — this ticket cites it explicitly under the §What to Change rationale; no silent rewrite.
5. Cross-skill or cross-artifact: this ticket is single-skill, single-rule. No cross-skill boundary.
6. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies skill-internal Phase 4 logic. It does NOT touch any validator or canon-safety check. Mystery Reserve firewall semantics are unchanged.
7. Schema extension classification: NOT a schema extension; this is a rule rewrite. SLT schema unchanged.

## Architecture Check

1. The three-form OR keeps the schema unchanged while honoring runtime-deferral; the rule now verifies *intent surface* (any of three pre-authored expressions of belief/relationship engagement) rather than forcing fake effects. Schema-minimalism preserved. The alternative — adding a new `effect_intent` field — would proliferate the SLT schema for a discipline that the existing three surfaces already cover.
2. No backwards-compatibility shim: the literal-effects-only rule is replaced outright; the new rule is strictly more permissive (every batch that passed the old rule passes the new rule), so no transitional behavior is needed.

## Verification Layers

1. Rule rewrite → codebase grep-proof: `grep -nE "three-form OR|any_belief|any_relationship_axis" .claude/skills/commitment-block-authoring/SKILL.md` returns the new phrasing.
2. Old absolute claim gone → codebase grep-proof: `grep -n "literal effects field" .claude/skills/commitment-block-authoring/SKILL.md` returns ZERO matches.
3. Authoring dry-run → skill dry-run: three batches: (a) belief-or-relationship-coverage block uses `any_belief(...)` in preconditions but empty `effects.*` → PASS; (b) block uses `exit_options[].likely_effects: [BEL-3]` but empty `effects.*` → PASS; (c) every block has empty `effects.*` AND no `exit_options.likely_effects` AND no `any_belief` / `any_relationship_axis` predicate → emits `belief_or_relationship_coverage_missing`.
4. Single-skill ticket: validator surface is untouched (the diversity check is skill-internal Phase 4 logic, not a separate validator file); additional layer mapping is not applicable.

## What to Change

### 1. Phase 4 check 3 rewrite

In `.claude/skills/commitment-block-authoring/SKILL.md:241-242` (Phase 4 batch-diversity, check 3 belief-or-relationship coverage), replace the literal-effects-only requirement with the three-form OR. At least one block in the batch must satisfy belief-or-relationship coverage by ANY of:

- `effects.create / supersede / close` references a `BEL-<integer>` / `SREL-<integer>` record or a `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL` (existing literal form).
- `exit_options[].likely_effects` references a `BEL-<integer>` / `SREL-<integer>` record or `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL`.
- `preconditions.hard / soft` includes `any_belief(...)` or `any_relationship_axis(...)`.

Add the closing sentence: *"Actual runtime consequences remain authoritative in `SE.state_delta` — the batch-diversity check verifies *intent surface*, not pre-authored effects."*

### 2. Sibling-rule audit documentation

Within Phase 4, document the audit conclusion that checks 1 (move-family diversity), 2 (recovery coverage), 4 (no-branch-local) do NOT depend on literal-effects-only assumptions, so the three-form OR does not need to extend to them. Spec narrative item 3 calls for this audit explicitly; the conclusion is recorded inline so a future reader sees the call-out was honored.

### 3. References sweep

Search `commitment-block-authoring/SKILL.md` and `commitment-block-authoring/references/` for any other restatement of the literal-effects-only rule (e.g., "the engine's batch-diversity test is on the literal effects field"); update to the three-form OR with consistent wording. The acceptance grep at the bottom of this ticket locks the cleanup.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 4 check 3 rewrite + sibling-audit note)
- `.claude/skills/commitment-block-authoring/references/` (modify — only files that restate the rule; sweep + update consistent wording)

## Out of Scope

- Any change to the SLT schema (deliberately schema-minimalism preserved).
- Any change to checks 1, 2, 4 of Phase 4 (audit conclusion: parallel literal-effects assumption is absent).
- Any new predicate or any change to `any_belief` / `any_relationship_axis` semantics.
- Any change to runtime `SE.state_delta` discipline.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "three-form OR|any_belief|any_relationship_axis" .claude/skills/commitment-block-authoring/SKILL.md` returns hits in Phase 4 check 3.
2. `grep -n "literal effects field" .claude/skills/commitment-block-authoring/SKILL.md` returns ZERO matches.
3. `grep -rn "literal effects field" .claude/skills/commitment-block-authoring/references/` returns ZERO matches.
4. `grep -n "intent surface" .claude/skills/commitment-block-authoring/SKILL.md` returns the new closing sentence's anchor phrase.

### Invariants

1. Schema minimalism preserved — no SLT field added.
2. Runtime-deferred effects (`effects.* = []`) are lawful when intent is expressed via `exit_options[].likely_effects` or `any_belief` / `any_relationship_axis` predicates.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and skill-internal Phase 4 logic is exercised by the skill's own dry-run discipline. Existing pipeline coverage (skill-audit, manual dry-run in commitment-block-authoring) is unchanged.`

### Commands

1. `grep -nE "three-form OR|any_belief|any_relationship_axis|intent surface" .claude/skills/commitment-block-authoring/SKILL.md`
2. `grep -rn "literal effects field" .claude/skills/commitment-block-authoring/`
3. The narrow command is correct because the change is in skill prose; no tool surface to typecheck, no validator surface to test. Skill dry-run is the integration path.
