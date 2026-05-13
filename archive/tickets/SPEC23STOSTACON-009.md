# SPEC23STOSTACON-009: Update skill prose for new vocabularies

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `specs/SPEC-23-story-state-contract-taxonomies.md`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md, archive/tickets/SPEC23STOSTACON-008.md

## Problem

At intake, four story-pipeline `SKILL.md` files referenced vocabularies and field names that the post-SPEC23STOSTACON-001 contract reshaped:

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
5. Live reassessment correction (2026-05-13): the drafted `role_in_story: protagonist` hit is no longer present in `branching-story-bootstrap/SKILL.md`; the live bootstrap drift is instead missing positive `role_in_story` closed-list guidance plus stale `scope.visibility: author_pool` and ad-hoc action-family examples. Same-seam stale vocabulary also exists in the named four files for `scope.visibility: author_pool`, `suggested_block_purpose`, `confidence: suspected`, `confidence: rumor`, and `performative_lie`. These are required consequence fallout of aligning the four skill prose files to the post-SPEC23STOSTACON-001 contract; no sibling ticket owns them.
6. HARD-GATE relevance checked: `docs/HARD-GATE-DISCIPLINE.md` was read because these edits touch content-generating skills' validation/prose instructions. The implementation only updates vocabulary and field names in skill prose; it does not weaken approval, write ordering, patch-engine routing, validation-gate count, or canon-mutation behavior.

## Architecture Check

1. Landing all four skill updates atomically is cleaner than per-skill tickets: the vocabulary changes (move_family, action_family, event_kind split, role_in_story closed values, new predicates) are coordinated across the skills' joint workflow — partial completion leaves authors with disagreeing skill prose at the shared boundary, producing confusion. One ticket eliminates that mid-state.
2. No backwards-compatibility shim: skill prose cites only the post-amendment vocabulary. References to old names (`purpose`, `intent`, `event_kind: world_block`, `event_kind: repair`, `role_in_story: protagonist`) are replaced, not aliased. Spec §148 (Out of Scope) confirms "Per-skill workflow phase updates beyond contract references" are not in scope — this ticket touches only contract-reference vocabulary, not workflow shape.

## Verification Layers

1. `move_family` replaced `purpose` in the affected skill prose where it refers to the SLT field. Grep proof covers stale field examples and current vocabulary hits.
2. `action_family` replaced `intent` in SLT exit-options authoring prose. Grep proof covers stale field examples and current vocabulary hits.
3. `system_repair | audit_repair` replaced the old repair event-kind prose; `event_kind: world_block` was removed while `outcome_route: world_block` was preserved.
4. Live correction: no `role_in_story: protagonist` example remained at implementation time. Bootstrap now has positive closed-list `role_in_story` guidance, and grep proves the stale protagonist example is absent.
5. New predicate references were added to commitment-block-authoring prose under the predicate-authoring guidance section; `has_affordance` is documented as an actor-agnostic author-pool prefilter with `affordance_available_to` recommended for branch-scoped blocks.
6. `belief_mode` is mentioned in the updated predicate / BEL guidance.

## Landed Changes

### 1. `commitment-block-authoring/SKILL.md`

- Replaced `purpose` field prose with `move_family`, including batch inventory, diversity checks, SLT examples, and manifest wording.
- Replaced bundle-wide `scope.visibility: author_pool` examples with `scope.visibility: global_author_pool` while preserving branch-scoped repair examples.
- Updated old 12-purpose examples to the 16-value causal `move_family` taxonomy.
- Replaced `exit_options[].intent` with `exit_options[].action_family` and removed the `custom` escape-hatch example.
- Added current predicate guidance for the 17-name DSL, including `record_active`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`, and the refined `belief(holder, claim, mode?, confidence_floor?)` shape.

### 2. `branching-story-turn-cycle/SKILL.md`

- Updated the SE draft example to current event-kind values: `selected_choice | write_in_attempt | system_repair | audit_repair`.
- Preserved `outcome_route: world_block` as the current action-routing value.
- Updated SLT selection to rank by `move_family` and `action_family`.
- Added actor-grounded `affordance_available_to(<actor>, <action_family>)` eligibility guidance while keeping `has_affordance` as an actor-agnostic author-pool prefilter.
- Updated BEL examples to use `belief_mode` plus current confidence values, removing stale `confidence: suspected`, `confidence: rumor`, and `performative_lie` examples.
- Updated branch-scope prose to the three-value `scope.visibility` contract.

### 3. `branching-story-bootstrap/SKILL.md`

- Live correction applied: no `role_in_story: protagonist` example remained, so bootstrap now has positive STENT role guidance using canonical list-form values.
- Updated choice / affordance prose to reference shared contract §4.4a `action_family`.
- Updated seed `SLT.scope.visibility` examples to `global_author_pool`.

### 4. `branching-story-health-audit/SKILL.md`

- Added repair-event prose that differentiates `system_repair` from `audit_repair`.
- Renamed RSP card `suggested_block_purpose` to `suggested_block_move_family` and updated the value list to the 16-value `move_family` taxonomy.
- Updated stale `BEL.confidence` / `belief_mode` examples and `scope.visibility: global_author_pool` prose.

### 5. `branching-story-prose-attach/SKILL.md` — verified no change

Per spec §74, this skill is unchanged. The references to `event_kind: prose_attach` at lines 25, 89, 256, 299 remain canonical (the contract retains `prose_attach` as a valid event_kind value). No edits.

### 6. `story-promotion-closeout/SKILL.md` — verified no change beyond spec scope

Per spec deliverables, the promotion-closeout skill is not listed for vocabulary updates. The references to `event_kind: promotion_closeout` at lines 37, 112, 124 remain canonical. No edits in this ticket.

### 7. `specs/SPEC-23-story-state-contract-taxonomies.md`

- Added a dated implementation note stating that `SPEC23STOSTACON-009` completed the four named story-skill prose updates. The note preserves the rest of the brainstorm-style spec as historical intake context unless a later ticket explicitly updates it.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-23-story-state-contract-taxonomies.md` (modify)
- `tickets/SPEC23STOSTACON-009.md` (modify)

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
8. `grep -rnE "confidence: (suspected|rumor)|performative_lie|suggested_block_purpose|scope.visibility: author_pool" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-bootstrap,branching-story-health-audit}/SKILL.md` returns no matches.

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
4. `grep -rnE "confidence: (suspected|rumor)|performative_lie|suggested_block_purpose|scope.visibility: author_pool" .claude/skills/{commitment-block-authoring,branching-story-turn-cycle,branching-story-bootstrap,branching-story-health-audit}/SKILL.md` returns no matches.
5. Narrower command rationale: documentation-only ticket; grep-proofs at the post-implementation tree are the appropriate verification boundary. The four files have no test surface; their correctness is verified by reading the prose after edits land.

## Outcome

Completed on 2026-05-13. The four named story-skill `SKILL.md` files now use the post-SPEC23STOSTACON-001 vocabulary for `move_family`, `action_family`, current SE repair event kinds, `scope.visibility`, `role_in_story`, BEL `belief_mode` / confidence examples, and the expanded predicate DSL. `branching-story-prose-attach` and `story-promotion-closeout` were rechecked and left unchanged. `specs/SPEC-23-story-state-contract-taxonomies.md` now has an implementation note marking this skill-prose slice complete.

## Verification Result

1. `rg -n '(^purpose:|^intent:|event_kind:.*world_block|event_kind:.*\brepair\b|role_in_story:\s*protagonist)' .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — PASS; no matches.
2. `rg -n '(confidence: (suspected|rumor)|performative_lie|suggested_block_purpose|scope.visibility: author_pool)' .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — PASS; no matches.
3. `rg -n '(move_family|action_family|system_repair|audit_repair|affordance_available_to)' .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — PASS; returned current-vocabulary hits across the edited files.
4. `rg -n 'outcome_route.*world_block' .claude/skills/branching-story-turn-cycle/SKILL.md` — PASS; the current outcome route remains documented.
5. `rg -n 'SPEC23STOSTACON-009.*completed|SPEC23STOSTACON-009' specs/SPEC-23-story-state-contract-taxonomies.md` — PASS; the spec implementation note is present.
6. `git diff --check -- .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md specs/SPEC-23-story-state-contract-taxonomies.md tickets/SPEC23STOSTACON-009.md` — PASS; no whitespace errors.

## Deviations

1. The drafted bootstrap `role_in_story: protagonist` hit was already absent. The live correction was to add positive canonical `role_in_story` list guidance and keep the negative grep proof.
2. Reassessment found same-seam vocabulary drift beyond the drafted four examples: `scope.visibility: author_pool`, `suggested_block_purpose`, and retired BEL confidence examples. Those were absorbed because they live in the same four skill-prose contract surfaces.
3. The explicit SPEC-23 reference was updated with a compact implementation note instead of row-by-row rewriting the brainstorm deliverables. Remaining old-surface prose in that spec is historical intake context unless a later ticket owns it.
