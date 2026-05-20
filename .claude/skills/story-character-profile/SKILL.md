---
name: story-character-profile
description: "Use when creating or regenerating story-local STCHAR character authority profiles for a branching-story bundle. Three modes: create_from_world_char, create_story_local, regenerate. Produces: story-characters/STCHAR-<integer>.md via patch engine + bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: mode
    description: "create_from_world_char | create_story_local | regenerate"
    required: true
  - name: source_char_id
    description: "create_from_world_char and optional regenerate input: CHAR-<integer> dossier used as provenance and distillation source"
    required: false
  - name: target_stchar_id
    description: "regenerate only: active or superseded STCHAR-<integer> profile to rebuild from zero"
    required: false
  - name: target_stent_ids
    description: "Optional STENT-<integer> ids this profile should bind or continue to bind"
    required: false
  - name: emergence_context_records
    description: "Optional story-local records that explain why this STCHAR is needed now"
    required: false
  - name: story_local_brief
    description: "create_story_local input: operator-authored story-local characterization brief"
    required: false
  - name: regeneration_reason
    description: "regenerate input: fidelity failure, story-state drift, or other reason for a from-zero rebuild"
    required: false
---

# Story Character Profile

Create or regenerate a story-local character authority profile (`STCHAR`) for a branching-story bundle. This skill is the only general-purpose story-pipeline surface allowed to read a world `CHAR-*` dossier for characterization. Normal runtime skills consume active `STCHAR` profiles and must not use world `CHAR` as operational characterization authority.

<HARD-GATE>
Do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, do NOT write `worlds/<world_slug>/stories/<story_slug>/story-characters/STCHAR-<integer>.md`, and do NOT update `worlds/<world_slug>/stories/<story_slug>/INDEX.md` until:

(a) Pre-flight Check has completed: `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `tools/validators/src/schemas/story-character-authority.schema.json` are loaded; bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; mode validated; source `CHAR-*` resolved only for modes that need it; target `STCHAR-*` and bound `STENT-*` / story-local context records resolved when supplied; one new `STCHAR` id allocated via `mcp__worldloom__allocate_next_id`; relevant story-bundle context loaded via `mcp__worldloom__get_context_packet` and targeted `get_record` / `get_records` calls.

(b) Phases 1-7 have completed in working memory: source authority packet assembled; story-local need diagnosed; full `stchar.v1` profile drafted from zero; frontmatter drafted against `story-character-authority.schema.json`; all 13 required body sections present; `profile_hash`, `voice_block_hash`, and `page_packet_hash` computed from the final body slices; append or supersession patch plan assembled with `append_story_character_authority_record` or `supersede_story_character_authority_record`; bundle `INDEX.md` update drafted.

(c) Phase 7 has validated all 8 checks with a one-line PASS rationale per check: mode inputs complete; source authority lawful; no world mutation; no operational `CHAR-*` shortcut outside `source_char_id` provenance; `BEL.basis.access_records[]` is not given STCHAR as an epistemic route; frontmatter matches the schema; all 13 body sections are present; regeneration allocates a new id and links `supersedes` instead of rewriting the old profile's structural fields.

(d) The user has explicitly approved the deliverable summary: mode, target bundle, new `STCHAR` id, source/provenance summary, bound `STENT` ids, supersession link when applicable, section inventory, hash summary, validation trace, patch operations, and `INDEX.md` update preview.

This gate is authoritative under Auto Mode or any autonomous-execution context. Invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (FOUNDATIONS + shared contract + STCHAR schema loaded;
  bundle resolved; mode inputs validated; source/target records resolved;
  STCHAR id allocated; story context loaded)
        |
        v
Phase 1: Assemble source authority packet
        |
        v
Phase 2: Diagnose story-local characterization need
        |
        v
Phase 3: Draft full stchar.v1 body from zero
        |
        v
Phase 4: Draft schema frontmatter
        |
        v
Phase 5: Compute profile, voice-block, and page-packet hashes
        |
        v
Phase 6: Assemble patch plan + INDEX update
        |
        v
Phase 7: Validate STCHAR firewall, schema, body, and lifecycle checks
        |
        v
Phase 8: HARD-GATE fires -> atomic patch + INDEX update
```

## Modes

### create_from_world_char

Distill a world `CHAR-*` dossier into a story-local `STCHAR-*` profile.

Required inputs:

- `world_slug`
- `story_slug`
- `mode=create_from_world_char`
- `source_char_id`

Optional inputs:

- `target_stent_ids`
- `emergence_context_records`

Set `source_kind: world_char`, `source_char_id: <CHAR-id>`, `source_char_hash` to the hash of the source dossier content used, and `source_char_sections_used[]` to the loaded source sections. `source_char_id` is provenance only; do not copy it into operational story records, page-plan authority, or body prose as a shortcut.

### create_story_local

Author a story-local `STCHAR-*` profile from operator-provided story-local inputs without a world `CHAR-*` source.

Required inputs:

- `world_slug`
- `story_slug`
- `mode=create_story_local`
- `story_local_brief`

Optional inputs:

- `target_stent_ids`
- `emergence_context_records`

Set `source_kind: story_local`, `source_char_id: null`, `source_char_hash: null`, and `source_char_sections_used: []`. Populate `story_local_inputs_used[]` with the story-local records that actually informed the profile.

### regenerate

Supersede an existing `STCHAR-*` with a from-zero rebuild. Use this when page-plan/prose fidelity failures, changed story-local evidence, or a deliberate profile refresh makes the old profile stale.

Required inputs:

- `world_slug`
- `story_slug`
- `mode=regenerate`
- `target_stchar_id`
- `regeneration_reason`

Optional inputs:

- `source_char_id`
- `target_stent_ids`
- `emergence_context_records`

Read the old `STCHAR`, bound `STENT` records, relevant active pages/plans/emotions/relationships/intentions/status records, and optional source `CHAR` if supplied or already recorded as provenance. Draft a new profile from zero; do not patch body sections or structural frontmatter in place. Set `source_kind: regenerated`, `supersedes: <old-STCHAR-id>`, increment `profile_revision`, and use `supersede_story_character_authority_record` so the predecessor is lifecycle-marked by the engine.

## Output

- `story-characters/STCHAR-<integer>.md` - Always, written through `append_story_character_authority_record` or `supersede_story_character_authority_record`.
- Bundle `INDEX.md` - Always, updated after patch submission to list the new profile and lifecycle status.
- Repair note - Optional, included in the handoff when existing page plans should be rebuilt because the new profile changes voice, page-packet, or appraisal authority.

No world `CHAR`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, world `_source/`, or story `_source/` file is direct-written by this skill. Story hybrid writes are engine-routed.

## World-State Prerequisites

Before this skill acts, it MUST receive:

- `docs/FOUNDATIONS.md` - especially Story Bundles section 6.1 Story-Local Character Authority, Rule 4, Rule 6, Rule 7, and the Story-Pipeline Skill Category discipline.
- `.claude/skills/_shared-templates/story-state-contract.md` - story-bundle state, page-plan, predicate, and write-order contract.
- `tools/validators/src/schemas/story-character-authority.schema.json` - canonical STCHAR frontmatter field set.
- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` - story identity, cast binding, player agency, and branch contract.
- Existing bundle `INDEX.md` when present.
- Story-bundle context via `mcp__worldloom__get_context_packet(world_slug, task_type='story_character_profile', story_slug=<story_slug>, ...)`.
- Targeted story records needed for the mode via `mcp__worldloom__get_record`, `mcp__worldloom__get_records`, or `mcp__worldloom__list_records(..., include_full_body=true)`.
- `worlds/<world_slug>/characters/INDEX.md` and the targeted `CHAR-*` dossier only for `create_from_world_char`, or for `regenerate` when a source `CHAR` is explicitly supplied or already recorded as provenance.

If `get_context_packet`, `get_record`, or `get_records` returns `delivery_status: persisted_with_summary`, retrieve the required slices before drafting. Summary-only context is not enough to author voice, appraisal, pressure behavior, or relationship-specific conduct.

## Pre-flight Check

1. Load `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `tools/validators/src/schemas/story-character-authority.schema.json`.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with `bundle_not_found` if missing.
3. Validate `mode` exactly: `create_from_world_char`, `create_story_local`, or `regenerate`.
4. Validate mode inputs:
   - `create_from_world_char`: require `source_char_id`; reject missing or unresolved source dossier.
   - `create_story_local`: require a non-empty `story_local_brief`; reject supplied `source_char_id` as operational input.
   - `regenerate`: require `target_stchar_id` and `regeneration_reason`; resolve the existing STCHAR.
5. Resolve `target_stent_ids[]` when supplied. If a non-background `STENT` will use the profile, confirm the final handoff names the binding route; this skill writes STCHAR, not STENT, unless the patch engine operation explicitly owns a lifecycle side effect.
6. Resolve `emergence_context_records[]` through targeted retrieval. Do not rely on ids alone for behavioral claims.
7. Allocate one new `STCHAR` id via `mcp__worldloom__allocate_next_id(world_slug, id_class="STCHAR", story_slug=<story_slug>)`.
8. Load story-bundle context through `mcp__worldloom__get_context_packet`. Use targeted retrieval for any active `STPLAN`, `STEMO`, `SREL`, `STINT`, `STSTAT`, `BEL`, `PG`, or `CHC` body detail that shapes the profile.
9. Confirm no pre-flight step requires direct `_source/` edits or world-canon mutation. Abort if the request is actually a world-`CHAR` edit or canon promotion.

## Phase 1: Assemble Source Authority Packet

For `create_from_world_char`, load only the targeted `CHAR-*` dossier and sections needed for story-local distillation: identity, embodied constraints, voice, stable dispositions, relevant relationships, pressure behavior, and known canon limits. Compute a deterministic `source_char_hash` over the exact source content used when the tool surface exposes one; otherwise record the hash method in the deliverable summary before approval.

For `create_story_local`, assemble the operator brief and any story-local records used as evidence. Do not invent a world `CHAR` provenance field.

For `regenerate`, load:

- the old `STCHAR` full body and frontmatter
- bound `STENT` records and active status
- relevant story-local records named by `target_stent_ids`, `emergence_context_records`, or recent page-plan/prose-fidelity failures
- optional source `CHAR` only when explicit or already present as provenance

Output a compact authority packet with: mode, source records loaded, excluded records with reasons, provenance fields to write, and forbidden shortcuts.

## Phase 2: Diagnose Story-Local Characterization Need

State why this profile is needed now:

- cast bootstrap distillation
- story-local individual with persistent/speaking/viewpoint/action-driving/emotionally salient role
- relationship-specific or information-bearing pressure
- repair of page-plan/prose-fidelity drift
- regeneration after story evidence changed the usable authority

Classify whether each supplied `target_stent_id` is viewpoint, speaker, primary actor, direct choice target, emotionally salient, relationship-bearing, pressure-driving, or background-only. Background-only entities may remain without active STCHAR unless the user explicitly wants a profile.

## Phase 3: Draft Full stchar.v1 Body From Zero

Draft the body with exactly these 13 H2 sections in this order:

1. `## Story-Facing Identity`
2. `## Source Distillation`
3. `## Stable Persona Core`
4. `## Emotional Appraisal Map`
5. `## Pressure Behavior`
6. `## Voice Bible / Dialogue Authority`
7. `## Page-Plan Voice Block`
8. `## Perception and Embodiment`
9. `## Agency and Planning Tendencies`
10. `## Relationship-Specific Behavior`
11. `## Story-State Derivation Guide`
12. `## Prose Rendering Constraints`
13. `## Validation / Audit Anchors`

Template skeleton:

```markdown
## Story-Facing Identity

## Source Distillation

## Stable Persona Core

## Emotional Appraisal Map

## Pressure Behavior

## Voice Bible / Dialogue Authority

## Page-Plan Voice Block

## Perception and Embodiment

## Agency and Planning Tendencies

## Relationship-Specific Behavior

## Story-State Derivation Guide

## Prose Rendering Constraints

## Validation / Audit Anchors
```

Section requirements:

- `Story-Facing Identity`: display name, story role, active `STENT` bindings, viewpoint/speaker/actor status, and what this profile may authorize.
- `Source Distillation`: source kind, source ids, source sections used, story-local evidence, and explicit statement that `CHAR` provenance is not operational authority.
- `Stable Persona Core`: durable motives, refusals, limits, values, contradictions, and non-goals.
- `Emotional Appraisal Map`: how the character appraises threat, intimacy, status, risk, authority, debt, and uncertainty.
- `Pressure Behavior`: behavior under fear, desire, shame, hunger, pain, loyalty, coercion, secrecy, or public scrutiny.
- `Voice Bible / Dialogue Authority`: diction, rhythm, register, taboo words, silence behavior, direct-speech constraints, and anti-generic warnings.
- `Page-Plan Voice Block`: compact projection suitable for page-plan section 16a; this is the source of `voice_block_hash`.
- `Perception and Embodiment`: sensory access, bodily constraints, tells, physical affordances, and viewpoint-rendering limits.
- `Agency and Planning Tendencies`: planning horizon, risk posture, preferred tactics, refusal patterns, and how this can shape `STPLAN` / `STINT`.
- `Relationship-Specific Behavior`: named conduct differences by counterpart or role; do not globalize branch-local relationships.
- `Story-State Derivation Guide`: how future skills may derive `STINT`, `STPLAN`, `STEMO`, `SREL`, `CHC`, and page-plan content from the profile.
- `Prose Rendering Constraints`: must-show, must-not-imply, voice-fidelity checks, and repair recommendations.
- `Validation / Audit Anchors`: source list, hashes, validation checks, known limits, and future regeneration triggers.

No section may ask a runtime skill or prose renderer to infer characterization from `CHAR-*`. If a `CHAR-*` id appears outside frontmatter provenance or the Source Distillation section's historical source note, explain why it is non-operational.

## Phase 4: Draft Schema Frontmatter

Draft frontmatter that conforms to `story-character-authority.schema.json`:

```yaml
id: STCHAR-<integer>
story_id: STORY-<integer>
story_slug: <story_slug>
world_slug: <world_slug>
source_kind: world_char | story_local | regenerated
source_char_id: CHAR-<integer> | null
source_char_hash: sha256:<64 lowercase hex> | null
source_char_sections_used: []
story_local_inputs_used: []
generated_at_page: story_bootstrap | PG-<integer> | null
created_by_skill: story-character-profile
supersedes: STCHAR-<integer> | null
superseded_by: null
status: active
bound_stent_ids: []
profile_revision: 1
body_schema_version: stchar.v1
profile_hash: sha256:<64 lowercase hex>
voice_block_hash: sha256:<64 lowercase hex>
page_packet_hash: sha256:<64 lowercase hex>
```

Use `source_kind: regenerated` for regenerate mode even if the old profile had world provenance; preserve source `CHAR` only as provenance when it was actually read or inherited. Use `profile_revision: old + 1` for regeneration.

## Phase 5: Compute Hashes

Compute hashes after the final body text is stable:

- `profile_hash`: hash the complete STCHAR body markdown.
- `voice_block_hash`: hash only `## Page-Plan Voice Block`.
- `page_packet_hash`: hash the projected page-plan packet fields this profile authorizes for section 16a.

All hashes must use `sha256:<64 lowercase hex>`. If no helper tool exists for these profile hashes, use a deterministic byte-for-byte SHA-256 over UTF-8 text and record the exact source slices in `## Validation / Audit Anchors`.

## Phase 6: Assemble Patch Plan and INDEX Update

Use engine-routed story hybrid operations:

- `append_story_character_authority_record` for `create_from_world_char` and `create_story_local`.
- `supersede_story_character_authority_record` for `regenerate`.

The patch payload contains `story_slug`, the schema frontmatter as `record`, and the final body markdown as `body_markdown`.

Draft the bundle `INDEX.md` update as a direct-write artifact after patch submission. The index entry should name the new `STCHAR`, status, source kind, source `CHAR` provenance when present, bound `STENT` ids, profile revision, and supersession link when applicable.

## Phase 7: Validate

Run these checks before presenting the deliverable summary:

1. **Mode inputs complete** - PASS only if required mode-specific inputs were resolved from live files or MCP records.
2. **Source authority lawful** - PASS only if `CHAR` was loaded solely for `create_from_world_char` or explicit/regenerated provenance.
3. **No world mutation** - PASS only if the plan writes no world `CHAR`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, or world `_source/` record.
4. **No operational CHAR shortcut** - PASS only if `CHAR-*` appears only as STCHAR provenance/source evidence, not as runtime characterization authority.
5. **Belief firewall preserved** - PASS only if `STCHAR` is not added to `BEL.basis.access_records[]` and is described as conduct/voice/appraisal authority only.
6. **Schema frontmatter valid** - PASS only if required fields, source-kind conditionals, lifecycle fields, and hash patterns match `story-character-authority.schema.json`.
7. **Body sections present** - PASS only if all 13 required H2 sections are present exactly once.
8. **Lifecycle safe** - PASS only if regeneration creates a new `STCHAR` id with `supersedes` and leaves predecessor lifecycle marking to `supersede_story_character_authority_record`.

Every PASS requires a one-line rationale citing the loaded record, schema field, section name, patch op, or FOUNDATIONS rule that supports it.

## Phase 8: Present and Wait

Present a concise deliverable summary before any write:

- mode and target bundle
- new `STCHAR` id
- source/provenance summary
- bound `STENT` ids
- supersession link and profile revision when applicable
- 13-section inventory
- three hash values and their slices
- validation trace with 8 PASS/FAIL rows
- patch operation names and `INDEX.md` update preview
- any page-plan rebuild recommendation

Wait for explicit user approval. After approval, sign and submit the exact approved patch plan according to `docs/HARD-GATE-DISCIPLINE.md`, then apply the `INDEX.md` update.

## Final Rule

`STCHAR` is story-local character authority: it can shape voice, conduct, pressure behavior, appraisal, planning tendency, relationship conduct, and page-plan packets, but it never makes a world `CHAR-*` operational during normal story runtime and never becomes world canon without a separate promotion/adjudication workflow.
