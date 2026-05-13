# SPEC23STOSTACON-009: Update skill prose for new vocabularies

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md, archive/tickets/SPEC23STOSTACON-008.md

## Problem

Four story-pipeline `SKILL.md` files reference vocabularies and field names that the post-SPEC23STOSTACON-001 contract reshapes:

- `commitment-block-authoring/SKILL.md` — references `purpose` (renamed to `move_family`), `exit_options[].intent` (renamed to `exit_options[].action_family`), and authoring guidance for predicate preconditions that should now consume the 5 new predicates (`record_active`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`) and the refined `belief()` shape.
- `branching-story-turn-cycle/SKILL.md` — references `event_kind: world_block | repair` (the contract drops `world_block` from event_kind and splits `repair` into `system_repair | audit_repair`; line 269 carries the stale enum); references SLT-selection guidance that should now consume `move_family`; references affordance grounding that should consume `affordance_available_to` for actor-specific eligibility.
- `branching-story-bootstrap/SKILL.md` — references `role_in_story: protagonist` example (line 131 + 228 area; the contract's 12-value closed list does not include `protagonist`); affordance-construction prose should reference the shared `action_family` taxonomy.
- `branching-story-health-audit/SKILL.md` — references `event_kind: repair` audit prose; should differentiate `system_repair` from `audit_repair`; references `purpose` (now `move_family`) for SLT-quality audit checks.

`branching-story-prose-attach/SKILL.md` is unchanged per spec §74 — the skill already names `event_kind: prose_attach` which remains canonical.

This ticket lands the vocabulary updates atomically across all four skill files. Without these updates, the SKILL prose would document field names and enum values that disagree with the post-SPEC23STOSTACON-001 contract — violating FOUNDATIONS §Story Bundles §5b's "the contract is authoritative" rule.

## Assumption Reassessment (2026-05-13)

1. Current SKILL prose state verified: pipeline-wide grep at SPEC23STOSTACON-001 reassessment time confirmed `event_kind: world_block | repair` at `branching-story-turn-cycle/SKILL.md:269`; `role_in_story: protagonist` at `branching-story-bootstrap/SKILL.md:131` and surrounding; `world_block` at `turn-cycle/SKILL.md:186, 341, 401` (these reference `outcome_route: world_block` which is canonical — distinct from the deleted `event_kind: world_block`; care needed to preserve outcome_route mentions). `event_kind: prose_attach` at `branching-story-prose-attach/SKILL.md:25, 89, 256, 299` is unchanged. `event_kind: promotion_closeout` at `story-promotion-closeout/SKILL.md:37, 112, 124` is also unchanged.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` post-SPEC23STOSTACON-001 §4.3 `event_kind` enum (no `world_block`, split `repair`), §4.4 SLT `move_family` + `exit_options[].action_family`, §3a STENT `role_in_story` 12-value list, §3b shared `action_family` taxonomy, §5 5 new predicates + `has_affordance` deprecation + refined `belief()`.
3. Cross-skill / cross-artifact boundary under audit: SKILL.md prose is the human-facing authoring contract for each skill; it cites the shared contract for record schemas (§4) and predicate DSL (§5). The boundary is the named contract section the SKILL.md references. Every section reference in the SKILL.md must stay coherent with the post-amendment contract.
4. Skill / tool / hook / validator field rename or removal (menu item 7 per `tickets/_TEMPLATE.md`): the vocabulary changes are renames + value-set updates within four SKILL.md files. Blast radius is bounded by the four files; no production code is touched (this is documentation-only). Verify with pipeline-wide grep: `grep -rnE "(purpose|intent)" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-bootstrap,branching-story-health-audit}/SKILL.md` to enumerate the exact line ranges per file; care needed because `purpose` and `intent` are common English words — check context before replacing.

## Architecture Check

1. Landing all four skill updates atomically is cleaner than per-skill tickets: the vocabulary changes (move_family, action_family, event_kind split, role_in_story closed values, new predicates) are coordinated across the skills' joint workflow — partial completion leaves authors with disagreeing skill prose at the shared boundary, producing confusion. One ticket eliminates that mid-state.
2. No backwards-compatibility shim: skill prose cites only the post-amendment vocabulary. References to old names (`purpose`, `intent`, `event_kind: world_block`, `event_kind: repair`, `role_in_story: protagonist`) are replaced, not aliased. Spec §148 (Out of Scope) confirms "Per-skill workflow phase updates beyond contract references" are not in scope — this ticket touches only contract-reference vocabulary, not workflow shape.

## Verification Layers

1. `move_family` replaces `purpose` in the affected skill prose where it refers to the SLT field → grep proves no remaining `purpose:` field references in the four skill files (matches against authoring guidance for SLT records).
2. `action_family` replaces `intent` in SLT exit-options authoring prose → grep similar to above.
3. `event_kind: system_repair | audit_repair` replaces `event_kind: repair` in turn-cycle and health-audit prose; `event_kind: world_block` is removed (but `outcome_route: world_block` is preserved) → targeted grep at affected line ranges.
4. `role_in_story:` value examples use the 12-value canonical list — `protagonist` is replaced with a canonical value (e.g., `viewpoint` or `primary_actor`) → grep proves no `role_in_story: protagonist` survives.
5. New predicate references added to commitment-block-authoring prose under the predicate-authoring guidance section; `has_affordance` is documented as author-pool prefilter only with `affordance_available_to` recommended for branch-scoped blocks → grep proves both predicate names appear in `commitment-block-authoring/SKILL.md`.
6. `belief_mode` field is mentioned in commitment-block-authoring's predicate-authoring guidance and/or in the contract-citation block → grep proves at least one mention.

## What to Change

### 1. `commitment-block-authoring/SKILL.md`

- Replace `purpose` with `move_family` everywhere the prose references the SLT field (not where the word is used in a general English sense — verify each match's context).
- Update the per-mode authoring guidance for the new 16-value taxonomy (orient, world_pressure, pursuit, investigation, disclosure, negotiation, bond_shift, status_shift, conflict, evasion, protection, resource_exchange, transformation, ritual_protocol, decision, recovery). The mode-by-mode prose may currently list examples in the old taxonomy (aftermath, escalation, reveal, refusal, negotiation, flight, investigation, intimacy, conflict, repair, closure, transition); update to causal-move framing.
- Replace `intent` with `action_family` in exit-options authoring prose; remove any "custom" escape-hatch language. Use the 20-value shared taxonomy: move, evade, pursue, perceive, investigate, communicate, persuade, negotiate, bond, oppose, harm, protect, control, transfer, use, make_change, ritual_protocol, recover, wait, decide.
- Add a predicate-authoring guidance update: prefer `affordance_available_to(<actor>, <action_family>)` over `has_affordance(<action_family>)` for branch-scoped commitment blocks (has_affordance is now author-pool prefilter only). Document the 5 new predicates briefly: `record_active`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`. Mention the refined `belief(holder, claim, mode?, confidence_floor?)` shape and that `mode` references the new `belief_mode` field on BEL records.

### 2. `branching-story-turn-cycle/SKILL.md`

- Update line 269 (`event_kind: selected_choice | write_in_attempt | world_block | repair | terminal`): drop `world_block`, drop `repair`; resulting valid event_kind values for turn-cycle (per contract §4.3): `selected_choice | write_in_attempt | system_repair | audit_repair`. (`terminal` is not an event_kind value per the contract — verify; it may be an outcome_route reference miscategorized; correct.)
- Preserve `outcome_route: world_block` mentions at lines 186, 272, 341, 401 — these are correct per contract §6 action-routing table.
- Update SLT-selection guidance to reference `move_family` (replacing `purpose`).
- Update affordance-evaluation prose to consume `affordance_available_to(<actor>, <action_family>)` as the actor-grounded eligibility predicate at branch-execution time; note that `has_affordance` is author-pool prefilter only.

### 3. `branching-story-bootstrap/SKILL.md`

- Replace `role_in_story: protagonist` example values with canonical 12-value enum picks (line 131 + line 228 + any other matches). Recommended replacement: use `role_in_story: [viewpoint, primary_actor]` (multi-value, demonstrates list shape) OR a single-value form like `role_in_story: [primary_actor]`.
- Update affordance-construction prose for `PG.visible_affordances`: reference the shared `action_family` taxonomy (20 values) by name; remove ad-hoc example lists like `[escape, hide, pursue]` and replace with canonical enum picks.

### 4. `branching-story-health-audit/SKILL.md`

- Differentiate `system_repair` (engine-initiated, e.g., schema gate failure repair) from `audit_repair` (audit-finding-driven) in any prose that currently uses `event_kind: repair`.
- Update audit prose to reference `move_family` (replacing `purpose`) in SLT-quality audit checks.
- If the audit prose mentions `arc_contract`, `effect_model`, `stop_policy`, or any of the retired-validator names, drop those references — the retired validators (per archive/tickets/SPEC23STOSTACON-008.md) no longer produce findings.

### 5. `branching-story-prose-attach/SKILL.md` — verify no change

Per spec §74, this skill is unchanged. The references to `event_kind: prose_attach` at lines 25, 89, 256, 299 remain canonical (the contract retains `prose_attach` as a valid event_kind value). No edits.

### 6. `story-promotion-closeout/SKILL.md` — verify no change beyond spec scope

Per spec deliverables, the promotion-closeout skill is not listed for vocabulary updates. The references to `event_kind: promotion_closeout` at lines 37, 112, 124 remain canonical. No edits in this ticket.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Per-skill workflow phase changes beyond contract-reference vocabulary updates (spec line 148 confirms workflow shape is not changing).
- `branching-story-prose-attach/SKILL.md` (no change per spec §74).
- `story-promotion-closeout/SKILL.md` (no vocabulary changes in scope; `event_kind: promotion_closeout` remains canonical).
- `story-fact-promotion-to-canon/SKILL.md` (not named in spec deliverables; verify at implementation whether any of the renamed vocabularies appear there — if so, route as adjacent contradiction).
- Updating `.claude/skills/_shared-templates/story-state-contract.md` — owned by `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency).
- Updating other skill-reference files (`skill-audit/references/cross-skill-consistency.md` is known to contain stale skill names like `storylet-pool-authoring`, `branching-story-page-cycle` — that's an adjacent cleanup, candidate for a follow-up if visible in the audit-tool prose at implementation time).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rnE "^purpose:" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-bootstrap,branching-story-health-audit}/SKILL.md` returns no matches where the context is SLT-field documentation (verify in context — common English `purpose` may remain).
2. `grep -rnE "event_kind:.*\bworld_block\b" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-bootstrap,branching-story-health-audit}/SKILL.md` returns no matches (event_kind is no longer paired with world_block).
3. `grep -rnE "role_in_story:\s*protagonist" .claude/skills/branching-story-bootstrap/SKILL.md` returns no matches.
4. `grep -nE "(affordance_available_to|record_active|intention_active|object_accessible|artifact_accessible)" .claude/skills/commitment-block-authoring/SKILL.md` returns ≥5 matches (one per new predicate).
5. `grep -nE "system_repair|audit_repair" .claude/skills/branching-story-health-audit/SKILL.md` returns ≥1 match each.
6. `grep -nE "move_family" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-health-audit}/SKILL.md` returns ≥1 match per file.
7. `grep -nE "action_family" .claude/skills/{commitment-block-authoring,branching-story-bootstrap,branching-story-turn-cycle}/SKILL.md` returns ≥1 match per file.

### Invariants

1. The four updated SKILL.md files reference only post-SPEC23STOSTACON-001 vocabulary for SLT fields, event_kind values, role_in_story values, and predicate names. Old vocabulary (`purpose`, `intent`, `event_kind: world_block`, `event_kind: repair`, `role_in_story: protagonist`) does not appear as field/enum documentation in these files.
2. `outcome_route: world_block` (a distinct field per contract §6) remains documented in `branching-story-turn-cycle/SKILL.md` — the trim is on `event_kind`, not on `outcome_route`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rnE "(^purpose:|^intent:|event_kind:.*world_block|event_kind:.*\brepair\b|role_in_story:\s*protagonist)" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-bootstrap,branching-story-health-audit}/SKILL.md` returns no matches.
2. `grep -nE "(move_family|action_family|system_repair|audit_repair|affordance_available_to)" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-bootstrap,branching-story-health-audit}/SKILL.md` returns ≥5 cumulative matches (vocabulary is present where it should be).
3. `grep -nE "outcome_route.*world_block" .claude/skills/branching-story-turn-cycle/SKILL.md` returns ≥1 match (outcome_route mentions are preserved — verification that the trim was correctly scoped to event_kind).
4. Narrower command rationale: documentation-only ticket; grep-proofs at the post-implementation tree are the appropriate verification boundary. The four files have no test surface; their correctness is verified by reading the prose after edits land.
