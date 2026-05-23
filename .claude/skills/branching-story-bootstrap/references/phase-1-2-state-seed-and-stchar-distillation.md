# Phase 1-2: State Seed and STCHAR Distillation

Covers original §Phase 1 (Normalize the premise into a state seed), §Phase 1b (extract opening temporal state into a Distillation Boundary Ledger), and §Phase 2 (Distill selected cast into STCHAR profiles).

## Phase 1: Normalize the premise into a state seed

Produce a structured seed capturing only the information required to initialize causal state. Do NOT author dramatic acts, act obligations, plot milestones, mandatory midpoint reversals, climax structures, or fixed ending paths.

```yaml
story_seed:
  premise: <verbatim user premise>
  pov: <inherited or supplied>
  tone: <inherited or supplied>
  content_intensity: tame | mature | explicit
  initial_location: <STLOC label + grounding canon>
  initial_pressure: <natural-language statement>
  starting_cast: [STENT-<integer>]   # one entry per cast member
  starting_character_authority: [STCHAR-<integer>]   # one entry per selected non-background cast member
  initial_public_situation: <what is publicly known or visible at the opening>
  private_knowledge: [<short label>]   # things one or more cast members know that the public does not
  contested_claims: [<short label>]    # claims one cast member holds that another denies
  forbidden_mystery_resolutions: [M-<integer>]   # forbidden mysteries plausibly triggered by this premise's pressures
```

## Phase 1b: Extract Opening Temporal State and Build the Distillation Boundary Ledger

Before drafting STCHAR profiles or opening state records, build a working-memory Distillation Boundary Ledger. This is a prompt-process hard gate, not a persistent schema field. Its job is to route opening facts before durable character authority is authored.

| Category | Route |
|---|---|
| Stable persona, voice, appraisal, pressure behavior, agency tendency, relationship-specific conduct, embodiment, capabilities, limits, dormant operational source material | STCHAR |
| Current physical condition, injury, clothing state, fatigue, location, concealment, ability to act | STSTAT / STOBJ / STLOC / PG.state_snapshot / page-plan §5 / §6 / §16 |
| Opening event or recent causal incident | SE / THR / CNSQ / CLK / STQ / STSEC as applicable |
| Current affective pressure, fear, shame, anger, exhaustion, suppression, dissociation | STEMO |
| Knowledge, misunderstanding, suspicion, distrust, lie, uncertainty, witness access | BEL |
| Current intention, tactical blockage, next step, fallback, inability to proceed | STINT / STPLAN |
| Current relationship state or branch-local change in relation | SREL |
| Active obligation, threat, consequence, debt, staged pressure | OBL / THR / CNSQ / CLK |
| Page-local presentation, "who the player/protagonist sees," current voice modulation, prose must-show for this page | page-plan §16a + prose plan sections |
| Provenance, source compression, omission rationale, validation trace | Source Distillation / Stable Source Material Inventory / Validation / Audit Anchors |

Opening-page relevance is not an omission criterion. At bootstrap, future branches are unknown; stable operational source material should be retained unless it is genuinely outside the story scope or non-operational trivia.

Phase 2 may draft STCHAR only from the Stable -> STCHAR row plus stable equivalents derived from transient opening facts. Phases 4 and 5 must consume the temporal rows to create the initial story-state records before root page-plan authoring.

## Phase 2: Distill selected cast into STCHAR profiles

Before drafting any `STENT`, `STSTAT`, `STINT`, temporal record, page, choice, or direct-write artifact, distill every selected non-background `CHAR-*` into a story-local `STCHAR-*` profile. Bootstrap owns bundle creation, so this inline authoring is lawful here; normal runtime skills do not repeat it.

Semantic Preservation Contract: for any STCHAR derived from a world `CHAR` (`source_kind: world_char`), every structured operational source fact must be copied, transformed, compressed, intentionally omitted with rationale, or marked story-irrelevant. No structured operational source fact may survive only in `## Source Distillation` or other audit/commentary prose if page planning, choice grounding, state derivation, or prose rendering may need it.

Use only the Distillation Boundary Ledger's Stable -> STCHAR row plus stable equivalents derived from transient facts. Specifically, do not copy opening temporal state into STCHAR. For each transient opening fact that seems character-relevant, decide whether a stable dispositional equivalent exists. If yes, write only the durable equivalent in an operational STCHAR section. If no, route the fact entirely to state records or page-plan §16a.

For each selected cast member:

1. Use the pre-flight `CHAR-*` resolution and targeted context-packet retrieval to assemble only the source sections needed for story-local distillation: identity, embodied constraints, voice, stable dispositions, relevant relationships, pressure behavior, canon limits, `dramatic_core` (all 10 engine fields), `## Capabilities`, `## Signature Scene Behavior`, and other loaded sections containing stable operational character material.
2. Draft the same `stchar.v1` 13-section body required by `.claude/skills/story-character-profile/SKILL.md`: Story-Facing Identity; Source Distillation; Stable Persona Core; Emotional Appraisal Map; Pressure Behavior; Voice Bible / Dialogue Authority; Page-Plan Voice Block; Perception and Embodiment; Agency and Planning Tendencies; Relationship-Specific Behavior; Story-State Derivation Guide; Prose Rendering Constraints; Validation / Audit Anchors. Retained structured source facts must land in operational STCHAR homes; `Source Distillation` may document provenance and compression choices, but it is not an operational target for retained facts.
3. Draft frontmatter against `tools/validators/src/schemas/story-character-authority.schema.json`: `source_kind: world_char`, `source_char_id: <CHAR-id>`, `source_char_sections_used[]`, `source_operational_fact_map[]`, `generated_at_page: story_bootstrap`, `created_by_skill: branching-story-bootstrap`, `supersedes: null`, `status: active`, `bound_stent_ids: [<future STENT id>]`, `profile_revision: 1`, and `body_schema_version: stchar.v1`. For each present structured `dramatic_core` field, include one `source_operational_fact_map` entry with disposition `copied`, `transformed`, `compressed`, `omitted_with_rationale`, or `story_irrelevant`; retained facts must name an operational STCHAR `target_section` other than `Source Distillation`, while omitted or story-irrelevant facts must carry a rationale.
4. For `source_kind: world_char`, include both preservation layers: `source_operational_fact_map` for the 10 `dramatic_core` fields and `Stable Source Material Inventory` for stable operational material from all loaded sections.
5. Validate the full STCHAR profile before proceeding. If any required selected cast member cannot produce a schema-valid STCHAR with all required body sections, abort before creating any story state or direct-write artifact.

`source_char_id` is provenance only. Do not copy a `CHAR-*` id into `STENT`, `CHC`, `PG`, page-plan §16a, or any runtime characterization field as operational authority.
