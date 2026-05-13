# SPEC23STOSTACON-001: Amend story-state contract + FOUNDATIONS §6a lockstep

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `docs/FOUNDATIONS.md`
**Deps**: None

## Problem

At intake, the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` was the single source of truth for the seven story-pipeline skills' record schemas, predicate DSL, action-routing semantics, and hard-gate surface (FOUNDATIONS §Story Bundles §5b), but it still carried the pre-SPEC-23 enum and predicate tables. SPEC-23 reassessed twelve enum-layer and predicate-layer defects in the contract; downstream schema/tool tickets consume the amended contract as their source of truth. This ticket landed the contract amendments first so downstream implementation does not chase a moving target. The BEL amendments also required a lockstep edit to `docs/FOUNDATIONS.md` §Story Bundles §6a per the contract's own §12 rule (FOUNDATIONS wins on disagreement) — the BEL visibility/truth_relation/belief_mode extensions are now documented in FOUNDATIONS as well as the contract.

## Assumption Reassessment (2026-05-13)

1. Contract structure verified: `.claude/skills/_shared-templates/story-state-contract.md` §3 (record inventory), §4.1 (BEL), §4.2 (PG), §4.3 (SE), §4.4 (SLT), §4.4a / §4.4b (shared taxonomies), and §5 (predicate DSL); FOUNDATIONS §Story Bundles §6a at `docs/FOUNDATIONS.md`.
2. Spec authority: `specs/SPEC-23-story-state-contract-taxonomies.md` §Approach enumerates the six workstreams; §Deliverables specify per-path edits; §Key design decisions motivate the trims and renames.
3. Cross-skill / cross-artifact boundary under audit: the contract IS the boundary per FOUNDATIONS §Story Bundles §5b. All seven story-pipeline skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) reference the contract for record schemas (§4), predicate DSL (§5), and action routing (§6). Lockstep boundary: FOUNDATIONS §6a defines BEL.visibility / BEL.truth_relation as a documented set; contract amendments here must propagate to FOUNDATIONS.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts) — every field in every story-bundle record schema must be load-bearing per FOUNDATIONS §Story Bundles §5b Schema-Minimalism. The amendments add new fields (BEL.belief_mode) and reshape enum values; downstream tickets land the validation surfaces (SPEC23STOSTACON-002 for SLT, -003 for PG, -004 for BEL, -005 for SE, -006 for STENT/SREL, -008 for predicate DSL) that prove the new fields are load-bearing.
5. Predicate DSL audit (per spec §Risks "fold in, because Workstream 5 needs the audited base"): implementation audited `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` PRED_TYPES (21 entries) and `rule_storylet_predicate_dsl_parsability.ts` consumption to distinguish the rebuilt story-skill predicate table from validator grammar implementation work. The contract §5 table is this ticket's output; validator grammar pruning remains downstream work owned by `SPEC23STOSTACON-008`.
6. Live sibling-ticket correction: initial status showed active same-family tickets only for `SPEC23STOSTACON-001` through `SPEC23STOSTACON-007`, but `SPEC23STOSTACON-008` / `SPEC23STOSTACON-009` appeared untracked during the run. Their scopes match the drafted downstream validator and skill-prose work, so they remain live downstream tickets outside this contract-only implementation. Post-review changed only their dependency / handoff references to the archived ticket path.
7. HARD-GATE relevance checked: `docs/HARD-GATE-DISCIPLINE.md` confirms story-bundle skills use hard gates and patch-engine-routed story `_source` writes. This ticket did not change write ordering or bypass behavior; it changed the shared schema/predicate vocabulary those gated flows read.

## Architecture Check

1. Single source of truth: the contract is the canonical authority per FOUNDATIONS §Story Bundles §5b. Atomic contract amendment prevents downstream tickets from depending on a partially-amended contract or forking the source of truth into multiple places.
2. No backwards-compatibility aliasing: the contract changes are forward-only — old field names (`purpose`, `intent` on exit_options) are renamed (to `move_family`, `action_family`); old enum values (`world_block` from event_kind; `rumor`/`performative_lie` from BEL.confidence; arc-positional `purpose` values like `aftermath`/`closure`) are removed without aliases. Spec §Risks §138 confirms no pre-existing BEL records to migrate; verified empty `worlds/erotica-world/stories/` directory.

## Verification Layers

1. Amended §3 inventory contains SLB / SAU / SP / RSP auxiliary classes → codebase grep-proof: `grep -nE '^\| \`(SLB|SAU|SP|RSP)\`' .claude/skills/_shared-templates/story-state-contract.md` returns four matches.
2. Amended §4.1 BEL documents `belief_mode` + extended visibility / truth_relation / refined confidence → codebase grep-proof: `grep -nE '(belief_mode|future_contingent|factional|rumored|uncommitted)' .claude/skills/_shared-templates/story-state-contract.md` returns contract matches.
3. Amended §4.2 PG.entity_status / unresolved_mystery_claims / visible_affordances reflect new enum sets → codebase grep-proof: `grep -nE '(clue_added|narrowed|apparent_resolution|coerced|offstage)' .claude/skills/_shared-templates/story-state-contract.md` returns contract matches.
4. Amended §4.3 SE.event_kind reflects 7-value set (no event-kind `world_block`, split `repair` → `system_repair | audit_repair`) → codebase grep-proof: `grep -nE 'event_kind:.*system_repair.*audit_repair' .claude/skills/_shared-templates/story-state-contract.md` returns one match; `grep -nE 'event_kind:.*world_block' .claude/skills/_shared-templates/story-state-contract.md` returns zero matches.
5. Amended §4.4 SLT names `move_family` (replacing `purpose`), `action_family` on exit_options (replacing `intent`), `mystery_policy.allowed_authority` 4-val incl. `none`, `scope.visibility` 3-val (incl. `branch_prefix_scoped`), `provenance.origin` reconciled + `manual_authoring` → codebase grep-proof: `grep -nE '(move_family|action_family|branch_prefix_scoped|manual_authoring)' .claude/skills/_shared-templates/story-state-contract.md` returns contract matches.
6. Amended §5 closed predicate table reflects audit outcome + 5 new predicates + `has_affordance` deprecation + refined `belief(holder, claim, mode?, confidence_floor?)` → codebase grep-proof: `grep -nE "(record_active|intention_active|object_accessible|artifact_accessible|affordance_available_to)" .claude/skills/_shared-templates/story-state-contract.md` returns 5 matches.
7. FOUNDATIONS §6a lockstep documents `belief_mode` mention + extended `BEL.visibility` + extended `BEL.truth_relation` → codebase grep-proof: `sed -n '/### 6a\\. Belief vs\\. Fact/,/### 7\\./p' docs/FOUNDATIONS.md | grep -nE '(belief_mode|factional|rumored|future_contingent)'` returns the amended §6a paragraph.

## Landed Changes

### 1. Contract §3 — split record inventory + add auxiliary classes

Split the existing single inventory table into two tables:
- **Core page-cycle state records** (existing 16): STENT, STINT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA, BR, PG, CHC, SLT — unchanged.
- **Auxiliary story-bundle records** (new): `SLB` (storylet / commitment-block batch manifest), `SAU` (story-bundle health audit), `SP` (story-promotion record), `RSP` (remediation-storylet proposal card, scoped under an audit).

### 2. Contract §4.1 — BEL schema amendments

Replaced the BEL block:
- Add required field `belief_mode: knows | believes | suspects | doubts | denies | reports | claims | deceives | misremembers | interprets` (10 values).
- Update `truth_relation` enum to add `future_contingent`: `true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent`.
- Refine `confidence` to subjective-certainty axis only: `certain | high | medium | low | uncommitted` (removes `rumor`, `performative_lie`, `likely`, `suspected` — rumor/performative-lie now expressed via `belief_mode: reports | deceives` plus `visibility`; likely/suspected collapse into `high/medium`).
- Extend `visibility` to add `factional` and `rumored`: `private | shared | factional | public | rumored | concealed | suppressed`.

Updated the explanatory paragraph to state that `belief_mode` separates sincerity / epistemic stance from `confidence` (subjective certainty axis).

### 3. Contract §4.2 — PG entity_status / mystery claims / visible_affordances

Updated the entity_status block:
- `life: alive | dead | unknown` (drops `incapacitated` and `missing`; `incapacitated` moves to agency, `missing` is expressible as `life: unknown` + `location: unknown | concealed`).
- `agency: free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown` (adds `coerced`, `incapacitated`, `unknown`).
- `location: STLOC-NNNN | unknown | concealed | offstage` (adds `concealed`, `offstage`).

Updated `visible_affordances[].action_families`: replaced the ad-hoc example `[escape, hide, pursue]` with reference to shared `action_family` taxonomy defined in §4.4a. Field is now `action_families: [<action_family>]` constrained to the shared taxonomy.

Updated `unresolved_mystery_claims[].status`: `preserved | clue_added | narrowed | apparent_resolution | held_for_promotion` (replaces `preserved | advanced | held_for_promotion` — refines `advanced` into three substates).

### 4. Contract §4.3 — SE.event_kind cleanup

Updated `event_kind`: `story_start | selected_choice | write_in_attempt | system_repair | audit_repair | prose_attach | promotion_closeout` (drops the retired event-kind value named `world_block` — redundant with `outcome_route` having the same value; splits `repair` into `system_repair` for engine-initiated repair and `audit_repair` for audit-finding-driven). Updated §6 action routing prose to note that `outcome_route: world_block` no longer pairs with the retired event-kind value named `world_block` (the event uses a different kind value; the route is dramatized via the page).

### 5. Contract §4.4 — SLT schema reshape

Reshaped the SLT block with these changes:
- Rename field `purpose` → `move_family` with new 16-value taxonomy: `orient | world_pressure | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | recovery`. Add a one-sentence operational definition per value below the schema block.
- `scope.visibility` adopts schema's 3-value set: `global_author_pool | branch_prefix_scoped | branch_scoped` (replaces 2-value `author_pool | branch_scoped`; the new `branch_prefix_scoped` is shared by a branch and its descendants).
- `beats[].function`: `setup | action | pressure | turn | consequence | exit` (adds `action`).
- `exit_options[].intent` → `exit_options[].action_family` field rename; values from new shared 20-value `action_family` taxonomy (see change 6); remove `custom` escape hatch.
- `mystery_policy.allowed_authority`: add `none` as a fourth value: `apparent | branch_local_counterfactual | canon_candidate | none`.
- `provenance.origin`: reconcile to clearer authoring-domain names + add `manual_authoring`: `bootstrap_seed | manual_authoring | author_batch | audit_repair | runtime_jit`.

### 6. Contract new §4.4a — shared `action_family` taxonomy

Defined `action_family` as a closed 20-value shared taxonomy: `move | evade | pursue | perceive | investigate | communicate | persuade | negotiate | bond | oppose | harm | protect | control | transfer | use | make_change | ritual_protocol | recover | wait | decide`. Added one-sentence operational definitions per value. Noted that this is a coarse top-level taxonomy; per-affordance `surface_hint: string` and per-affordance `likely_effects: [<label>]` carry local specificity.

Kept the existing §4.5 Prose receipt block number unchanged to avoid breaking current same-seam references in story-pipeline skills.

### 7. Contract new §4.4b — STENT.role_in_story + SREL.axis closed lists

Defined `STENT.role_in_story` as a closed 12-value list field (multi-valued, not scalar): `viewpoint | player_proxy | primary_actor | opposing_actor | allied_actor | authority | dependent | witness | information_source | pressure_source | social_bridge | background`. Added one-sentence operational definitions per value.

Defined `SREL.axis` as a closed 14-value list lifted verbatim from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`: `trust | fear | desire | debt | intimacy | loyalty | resentment | power_imbalance | attention | familiarity | approval | respect | obligation | hostility`. Added one-sentence operational definitions per axis.

### 8. Contract §5 — predicate DSL audit + amendment

Audited `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` PRED_TYPES (21 entries: `fact_true`, `fact_matches`, `entity_state`, `relationship`, `consequence_pending`, `obligation_open`, `location`, `epistemic`, `not`, `all`, `any`, `relationship_state`, `time_of_day`, `time_of_week`, `time_in_story`, `time_since_event`, `world_property`, `obligation_state`, `location_kind`, `location_id`, `location_class`) against `rule_storylet_predicate_dsl_parsability.ts` consumption and contract §4.4 SLT.preconditions usage. The contract now publishes the rebuilt story-skill predicate table; validator grammar pruning remains downstream work owned by `SPEC23STOSTACON-008`.

Canonized the §5 table with `fact_true`, `belief` (refined — see below), `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, `location`, `has_affordance` (deprecated to author-pool prefilter only — see below), the 5 new predicates below, and boolean composition.

Added 5 new closed predicates:
- `record_active(<record_id>)` — record must be active in current PG snapshot; accepts STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / DA classes.
- `intention_active(STINT-NNNN)` — named intention is currently held.
- `object_accessible(STENT-NNNN, STOBJ-NNNN)` — entity has page-state access to object.
- `artifact_accessible(STENT-NNNN, DA-NNNN)` — entity has access to story-local diegetic artifact.
- `affordance_available_to(STENT-NNNN, <action_family>)` — actor-specific affordance grounding.

Deprecated `has_affordance(<action_family>)` to author-pool prefilter only — branch-execution eligibility checks use `affordance_available_to(<actor>, <family>)` for actor-grounded plan-time eligibility. `has_affordance` remains valid for batch-synthesis prefiltering when actor is not yet bound.

Refined `belief(holder, claim, confidence?)` → `belief(holder, claim, mode?, confidence_floor?)` to consume the new BEL split: `mode` is a `belief_mode` value; `confidence_floor` is the minimum `confidence` enum value.

### 9. FOUNDATIONS §Story Bundles §6a lockstep

Edited `docs/FOUNDATIONS.md` §Story Bundles §6a:
- Update documented `BEL.truth_relation` set to: `true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent`.
- Update documented `BEL.visibility` set to: `private | shared | factional | public | rumored | concealed | suppressed`.
- Add a one-line mention of the new `belief_mode` field separating sincerity / epistemic stance from confidence (one sentence; pointer to contract §4.1 for the full enum).

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `docs/FOUNDATIONS.md` (modify)

## Out of Scope

- Schema implementation of the new contract surfaces (lands in SPEC23STOSTACON-002 for SLT, -003 for PG, -004 for BEL, -005 for SE, -006 for STENT / SREL).
- Validator changes (predicate DSL grammar prune + parsability rewrite + old-validator retirement) — downstream work owned by `SPEC23STOSTACON-008`.
- world-mcp projection updates (SPEC23STOSTACON-007).
- Skill prose updates — downstream work owned by `SPEC23STOSTACON-009`.
- Migration of pre-existing story bundles — spec §Risks §138 + empty `worlds/erotica-world/stories/` directory confirm no records to migrate.
- The "controlled-open" vocabulary policy framing — rejected at triage per spec §Key design decisions.
- `SE.event_kind` rename to `event_origin` — rejected at triage per spec §Key design decisions.

## Acceptance Criteria

### Tests That Must Pass

1. Contract §3 has two record-class tables (Core + Auxiliary) with SLB / SAU / SP / RSP in the Auxiliary table; grep: `grep -cE "^\| \`(SLB|SAU|SP|RSP)\`" .claude/skills/_shared-templates/story-state-contract.md` returns 4.
2. Contract §4.1 BEL schema includes `belief_mode` as a required field with 10 values; grep: `grep -E "belief_mode:.*knows.*deceives" .claude/skills/_shared-templates/story-state-contract.md` returns at least one match.
3. Contract §4.4 SLT uses `move_family` (no `purpose`); grep: `grep -c "^purpose:" .claude/skills/_shared-templates/story-state-contract.md` returns 0; `grep -c "^move_family:" .claude/skills/_shared-templates/story-state-contract.md` returns at least one match.
4. Contract §5 contains the 5 new predicates; grep: `grep -cE "(record_active|intention_active|object_accessible|artifact_accessible|affordance_available_to)" .claude/skills/_shared-templates/story-state-contract.md` returns at least 5.
5. FOUNDATIONS §6a documents `belief_mode` + extended visibility/truth_relation; grep: `sed -n '/### 6a\\. Belief vs\\. Fact/,/### 7\\./p' docs/FOUNDATIONS.md | grep -nE "(belief_mode|factional|rumored|future_contingent)"` returns the amended §6a paragraph.

### Invariants

1. Contract is the canonical authority for every story-bundle record schema (FOUNDATIONS §Story Bundles §5b). Downstream schemas (SPEC23STOSTACON-002 through -006), validators (-008), and skill prose (-009) consume the post-amendment contract as truth source.
2. FOUNDATIONS § Story Bundles §6a documents BEL.visibility + BEL.truth_relation as a published set. Contract amendments must propagate to FOUNDATIONS in lockstep per the contract's §12 "FOUNDATIONS wins on disagreement" rule.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "^\| \`(SLB|SAU|SP|RSP)\`" .claude/skills/_shared-templates/story-state-contract.md` — verifies §3 auxiliary-class additions.
2. `grep -nE "(move_family|action_family|belief_mode|future_contingent|factional|rumored|branch_prefix_scoped|manual_authoring|system_repair|audit_repair|clue_added|narrowed|apparent_resolution|coerced|concealed|offstage|record_active|intention_active|object_accessible|artifact_accessible|affordance_available_to)" .claude/skills/_shared-templates/story-state-contract.md` — comprehensive single-pass verification of all new enum values, field names, and predicates.
3. `sed -n '/### 6a\. Belief vs\. Fact/,/### 7\./p' docs/FOUNDATIONS.md | grep -nE "(belief_mode|factional|rumored|future_contingent)"` — verifies FOUNDATIONS §6a lockstep.
4. Narrower command rationale: a documentation-only ticket has no test surface; the contract IS the artifact, and grep-proofs are the appropriate verification boundary.

## Outcome

Completed on 2026-05-13. The shared story-state contract now publishes the SPEC-23 record inventory, BEL split, PG / SE / SLT enum amendments, shared `action_family`, `STENT.role_in_story`, `SREL.axis`, and the amended predicate DSL table. `docs/FOUNDATIONS.md` §Story Bundles §6a now documents `BEL.belief_mode`, `future_contingent`, `factional`, and `rumored` in lockstep with the contract.

Outcome amended on 2026-05-13 during post-ticket review: `docs/FOUNDATIONS.md` §Story Bundles §7 sibling-scan wording was also aligned with the amended shared predicate DSL and page-plan instruction surfaces, and the archived proof command below now names the archived ticket path.

## Verification Result

1. `grep -nE '^\| \`(SLB|SAU|SP|RSP)\`' .claude/skills/_shared-templates/story-state-contract.md` — PASS; four auxiliary-class rows found.
2. `grep -nE '(belief_mode|future_contingent|factional|rumored|uncommitted)' .claude/skills/_shared-templates/story-state-contract.md` — PASS; BEL field, enum values, and predicate refinement present.
3. `grep -nE '(clue_added|narrowed|apparent_resolution|coerced|offstage)' .claude/skills/_shared-templates/story-state-contract.md` — PASS; PG enum amendments present.
4. `grep -nE 'event_kind:.*system_repair.*audit_repair' .claude/skills/_shared-templates/story-state-contract.md` and `grep -nE 'event_kind:.*world_block' .claude/skills/_shared-templates/story-state-contract.md` — PASS; SE event-kind split present and old event-kind row absent.
5. `grep -nE '(move_family|action_family|branch_prefix_scoped|manual_authoring)' .claude/skills/_shared-templates/story-state-contract.md` — PASS; SLT and shared taxonomy amendments present.
6. `grep -nE '(record_active|intention_active|object_accessible|artifact_accessible|affordance_available_to)' .claude/skills/_shared-templates/story-state-contract.md` — PASS; five new predicates present.
7. `sed -n '/### 6a\\. Belief vs\\. Fact/,/### 7\\./p' docs/FOUNDATIONS.md | grep -nE '(belief_mode|factional|rumored|future_contingent)'` — PASS; FOUNDATIONS §6a lockstep paragraph present.
8. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md docs/FOUNDATIONS.md archive/tickets/SPEC23STOSTACON-001.md` — PASS; no whitespace errors.

## Deviations

1. The existing §4.5 Prose receipt heading was kept at §4.5 instead of renumbering it. This avoids creating stale references in story-pipeline skills that already cite the prose receipt section; the new shared taxonomies use §4.4a and §4.4b.
2. `SPEC23STOSTACON-008` and `SPEC23STOSTACON-009` appeared after the initial dirty-worktree snapshot. They match the downstream validator and skill-prose work that this ticket excludes, so this ticket leaves them live; post-review touched only archived-path dependency / handoff wording.
