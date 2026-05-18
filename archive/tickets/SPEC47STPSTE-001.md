# SPEC47STPSTE-001: Add STPLAN + STEMO record-class schemas to shared record-schema template

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `.claude/skills/_shared-templates/story-record-schemas.md` with two new record-class schema sections (§4.5.17 STPLAN, §4.5.18 STEMO); no code changes
**Deps**: None

## Problem

SPEC-47 introduces two new active story-bundle record classes — `STPLAN` (actor-owned tactical plan) and `STEMO` (actor-owned affective state) — that close the two identified gaps in worldloom's current story ontology: medium-range character agency (where `STINT` records *what* an actor wants but not *how* they're presently trying to pursue it) and causal emotional state (where existing classes record cognitive appraisal / relational valence / material status but not transient affective pressure causally biasing the next action). The two new schemas are the load-bearing contract every downstream ticket (JSON schemas, validators, predicates, edges, summaries, page-plan sections, skill prose) implements. They must land first so the canonical field lists are pinned before downstream code references them.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `.claude/skills/_shared-templates/story-record-schemas.md` exists at HEAD (770 lines per the reassess-spec session); current §4.5 enumeration goes up to §4.5.16 `STQ` (added by archived SPEC-42), so §4.5.17 STPLAN + §4.5.18 STEMO are the next available section numbers. Verified current `STINT` schema at §4.5.2 has exactly 8 fields (`id`, `story_id`, `created_at_page`, `supersedes`, `holder`, `intent`, `urgency`, `expires_when`) — confirms the "STINT is too thin" claim that motivates STPLAN's existence.
2. Verified SPEC-47 §Approach §A specifies both schemas with closed enums: STPLAN strict-minimalist 11 fields (drops `risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale` per §5b consumer-required discipline); STEMO with research-backed closed enums (18-value `affect_kind`, 18-value `behavioral_pressure`, 5-value `status` including `dissociated`, 4-value `intensity`, 2-value `agency_effect`). The schemas as drafted in SPEC-47 §Approach §A are the authoritative source for this ticket's content.
3. Cross-skill boundary under audit: the shared record-schema template at `.claude/skills/_shared-templates/story-record-schemas.md` is consumed by every story-pipeline skill (Skill Category 2c — `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`). Adding §4.5.17 + §4.5.18 extends the contract surface those skills resolve at pre-flight; no existing section is modified.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism At Story Scope) — every field in every story-bundle record schema must be load-bearing (directly consumed by validation gate / replay primitive / predicate / fork operation / audit-trail discipline). The strict-minimalist STPLAN schema drops 4 candidate fields per this discipline. Plus §5c (Present Causal State, Not Narrative Shape) — STPLAN.objective expresses what the actor is presently trying, not future plot; STPLAN.plan_status enum has no "planned climax"/"expected outcome"/"target_act_position" values; STEMO.affect_kind enum is event-causality-anchored per the Cowen & Keltner / Ekman / Plutchik / OCC / GEW / Frijda research convergence cited in SPEC-47 §Key Design Decisions item 2.

## Architecture Check

1. Schema content is authored once in the shared template, consumed at pre-flight by every story-pipeline skill that needs to validate against it. Centralized authoring keeps the contract single-sourced; per-skill duplication would invite drift between skill prose and schema reality (the very failure mode that motivated SPEC-13's atomic-source migration and SPEC-42's contract-template restructuring).
2. No backwards-compatibility aliasing/shims introduced — both classes are net-new. Existing bundles without STPLAN/STEMO remain valid per SPEC-47 §Out of Scope item 9 ("Existing-bundle migration — none required. STPLAN/STEMO are optional active classes; bundles without either remain valid").

## Verification Layers

1. Schema content exists at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17 (STPLAN) and §4.5.18 (STEMO) → codebase grep-proof for the two section anchors after edit lands
2. Field lists match SPEC-47 §Approach §A specification verbatim (closed enums, required-field markers, default values) → manual review against the spec's authoritative schema sketches
3. Cross-skill boundary preserved: §4.5 existing subsection numbering (§4.5.1 through §4.5.16) is unchanged → codebase grep-proof `awk '/^#### 4\.5\./' .claude/skills/_shared-templates/story-record-schemas.md` returns exactly the existing 16 + 2 new = 18 subsections in order

## Landed Changes

### 1. Add §4.5.17 STPLAN schema

Inserted immediately after §4.5.16 STQ. The landed schema follows SPEC-47 §Approach §A:

```yaml
id: STPLAN-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
created_by_event: SE-<integer>*               # introducing event provenance
supersedes: STPLAN-<integer> | null           # default null
holder: STENT-<integer>*
root_intention: STINT-<integer>*
objective: string*                            # natural-language plan objective
plan_status: active | blocked | suspended | fulfilled | failed | abandoned | revised*
belief_basis: [BEL-<integer>]*                # default []; non-empty when plan_status: active
resource_basis:                                # composite; all sub-lists default []
  facts: [SF-<integer>]
  objects: [STOBJ-<integer>]
  locations: [STLOC-<integer>]
  artifacts: [DA-<integer>]
  relationships: [SREL-<integer>]
  obligations: [OBL-<integer>]
blockers: [<record_id>]                       # default []
current_step:                                  # composite; required when plan_status: active
  action_family: <action_family>*              # closed enum per story-state-contract.md §4.4a
  target_records: [<record_id>]                # default []
  success_condition:
    predicates: [<predicate object>]*          # closed predicate DSL per §5
fallback_steps:                                # default []; 0+ entries
  - action_family: <action_family>*
    trigger_predicates: [<predicate object>]*
    target_records: [<record_id>]
expires_when: string*                         # natural-language supersession trigger
derived_from: [<record_id>]                   # default []
```

Added prose preamble explaining actor-owned tactical plans over multiple pages; strict-minimalist v1 schema per §5b; and the dropped extension-list fields (`risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`) that require a future spec with concrete consumers.

### 2. Add §4.5.18 STEMO schema

Inserted immediately after §4.5.17 STPLAN. The landed schema follows SPEC-47 §Approach §A:

```yaml
id: STEMO-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
created_by_event: SE-<integer>*
supersedes: STEMO-<integer> | null            # default null
holder: STENT-<integer>*
status: active | suppressed | settled | transformed | dissociated*
affect_kind: <closed enum 18 values> | null   # null only when status: dissociated
                                              # values: fear | anxiety | anger | disgust | grief |
                                              #         shame | guilt | humiliation | hope | relief |
                                              #         joy | awe | tenderness | desire | envy |
                                              #         contempt | confusion | dread
intensity: low | medium | high | extreme*     # required when affect_kind != null
orientation:
  toward_records: [<record_id>]               # default []; observer firewall input
appraisal_basis: [BEL-<integer>]              # default []; required non-empty unless status: dissociated
trigger_event: SE-<integer>*                  # must resolve to SE on branch path or same-event
behavioral_pressure: [<closed enum 18 values>] # default []; required non-empty unless status: dissociated
                                              # values: approach | flee | freeze | attack | reject |
                                              #         dominate | submit | seek_contact |
                                              #         protect_other | seek_help | confess |
                                              #         conceal | withdraw_socially | plan |
                                              #         accommodate | self_soothe | ruminate | collapse
agency_effect: none | constraining*
expires_when: string*
derived_from: [<record_id>]                   # default []
```

Added prose preamble explaining actor-owned transient affective state; the closed-enum research basis from SPEC-47; and the two derivative design calls from SPEC-47 Key Design Decisions item 2: `numbness` is represented as `status: dissociated` + `affect_kind: null`, and `surprise` remains at the `SE.event_kind` / appraisal surface rather than STEMO.

## Files to Touch

- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- STPLAN extension fields (`risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`) — captured in SPEC-47 §Out of Scope item 1 as named extension list for follow-up spec.
- STEMO `orientation.toward_claim` free-form string — captured in SPEC-47 §Out of Scope item 2 (no §5b consumer in v1).
- JSON schema files (`story-plan.schema.json`, `story-emotion.schema.json`) — covered by ticket 003.
- Record-class inventory update (§3 of story-state-contract.md) and FOUNDATIONS §Story Bundles §6 backfill — covered by ticket 002.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "^#### 4\.5\.(17|18)" .claude/skills/_shared-templates/story-record-schemas.md` returns exactly 2 matches at the expected positions (STPLAN at §4.5.17, STEMO at §4.5.18).
2. `grep -c "^#### 4\.5\." .claude/skills/_shared-templates/story-record-schemas.md` returns 18 (16 existing + 2 new).
3. Manual review confirms both schemas match SPEC-47 §Approach §A specifications verbatim including all closed-enum values and required-field markers.

### Invariants

1. §4.5.1 through §4.5.16 subsection content unchanged — only §4.5.17 and §4.5.18 are added.
2. §4.6 prose-receipt section numbering unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -c "^#### 4\.5\." .claude/skills/_shared-templates/story-record-schemas.md` (returns 18)
2. `grep -nE "^#### 4\.5\.(17|18)" .claude/skills/_shared-templates/story-record-schemas.md` (returns 2 matches)
3. `grep -nE "STPLAN-<integer>|STEMO-<integer>" .claude/skills/_shared-templates/story-record-schemas.md | head -10` (confirms schema-anchor ids appear)

## Outcome

Completed: 2026-05-19.

- Added `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17 `STPLAN` with the SPEC-47 tactical-plan schema, strict-minimalist prose, and present-causal guardrails.
- Added `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.18 `STEMO` with the SPEC-47 affective-state schema, closed-enum notes, dissociated/null-affect handling, and observer-firewall-oriented field notes.
- Left existing §4.5.1 through §4.5.16 content unchanged; §4.6 Prose receipt remains the next top-level section.

## Verification Result

1. `grep -c "^#### 4\.5\." .claude/skills/_shared-templates/story-record-schemas.md` returned `18`.
2. `grep -nE "^#### 4\.5\.(17|18)" .claude/skills/_shared-templates/story-record-schemas.md` returned exactly:
   ```text
   733:#### 4.5.17 `STPLAN` (actor-owned tactical plan)
   771:#### 4.5.18 `STEMO` (actor-owned affective state)
   ```
3. `grep -nE "STPLAN-<integer>|STEMO-<integer>" .claude/skills/_shared-templates/story-record-schemas.md | head -10` returned the expected schema-anchor id lines for both classes.
4. `awk '/^#### 4\.5\./ {print}' .claude/skills/_shared-templates/story-record-schemas.md` showed the ordered sequence from §4.5.1 through §4.5.18, with the two new sections appended after §4.5.16.

## Deviations

- None. This ticket remained documentation/template-only; JSON schemas, engine wiring, validators, inventories, and downstream skill prose stay with the active follow-up tickets named in Out of Scope.
