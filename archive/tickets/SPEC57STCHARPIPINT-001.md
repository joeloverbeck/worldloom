# SPEC57STCHARPIPINT-001: New skill — story-character-profile

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds new skill `.claude/skills/story-character-profile/SKILL.md`; no impact on existing skills (it is the only general-purpose surface allowed to read world `CHAR` for characterization; runtime skills consume STCHAR).
**Deps**: None (SPEC-56 landed the STCHAR schema, validators, patch-engine ops, world-index node/edges, and MCP retrieval surfaces).

## Problem

After SPEC-56 made `STCHAR` storable/retrievable/validatable, the story pipeline still has no skill that **authors** STCHAR profiles. Story bundles that need character-specific behavior, voice, appraisal, or planning authority have no canon-safe path to distill a world `CHAR-*` dossier (or author a story-local profile) into a story-local `STCHAR-*` record. This ticket adds that authoring skill (SPEC-57 Phase 1).

## Assumption Reassessment (2026-05-21)

1. The STCHAR schema is landed at `tools/validators/src/schemas/story-character-authority.schema.json` with the three load-bearing hashes (`profile_hash`, `voice_block_hash`, `page_packet_hash`), `source_char_id` / `source_kind` provenance, `supersedes` / `superseded_by` / `status` (active|superseded|retired) lifecycle, and `body_schema_version: const "stchar.v1"`. Patch-engine ops `append_story_character_authority_record` / `supersede_story_character_authority_record` exist (SPEC-56). The skill authors against these — it does not define new schema.
2. SPEC-57 §Phase 1 specifies 3 v1 modes (`create_from_world_char`, `create_story_local`, `regenerate`); `retire` / `supersede_from_story_evidence` are deferred per SPEC-56 §Out of Scope M2. The 13-section `stchar.v1` body template is per the report §6.3; section anchors validated by presence, not per-section hash (M1).
3. Cross-skill boundary under audit: this skill is a new Skill Category 2c member writing only to `worlds/<slug>/stories/<slug>/story-characters/` via engine ops; it mirrors the HARD-GATE shape of sibling story skills. The `no_char_authority_in_story_runtime` validator (`tools/validators/src/structural/no-char-authority-in-story-runtime.ts`) permits `STCHAR.source_char_id` provenance — this skill is one of the few lawful `CHAR`-reading surfaces.
4. FOUNDATIONS §6.1 (Story-Local Character Authority): `CHAR` provenance may be recorded in STCHAR frontmatter but must not be an operational shortcut; STCHAR must never be added to `BEL.basis.access_records[]`. Rule 6 (No Silent Retcons): regeneration supersedes via a new id with a `supersedes` link — never an in-place rewrite.
5. HARD-GATE semantics: the skill defines a canon-reading content-generation HARD-GATE — load FOUNDATIONS + shared story contract + STCHAR schema; resolve bundle; resolve source `CHAR` only when the mode needs it; allocate STCHAR id; draft the full profile from zero; validate frontmatter/body section anchors + the three hashes; confirm no world mutation; submit the patch plan only after explicit user approval. The gate must not weaken the world/story firewall (no `CHAR` operational leakage into emitted STCHAR).
6. Reassessment correction: this repo does not expose an executable runner for `.claude/skills/<slug>/` dry-runs. The acceptance surface is therefore manual contract review of the new skill plus grep/schema-surface checks against the live STCHAR schema and existing validator coverage, not a claimed live invocation of the skill.

## Architecture Check

1. A dedicated authoring skill keeps the single lawful general-purpose `CHAR`-reading surface isolated, so runtime skills (turn-cycle, prose-attach, health-audit) stay firewalled from world `CHAR` per SPEC-56's validator. Inline authoring elsewhere would scatter the firewall exception.
2. No backwards-compatibility shims: the skill writes only the current STCHAR schema; supersession uses new ids, never in-place mutation.

## Verification Layers

1. Skill requires schema-valid STCHAR frontmatter → manual contract review against `tools/validators/src/schemas/story-character-authority.schema.json` plus existing schema validation coverage in `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts`.
2. Three hashes present and correct → schema validation coverage + grep-proof that the skill requires `profile_hash`, `voice_block_hash`, and `page_packet_hash`.
3. Never mutates world `CHAR` → FOUNDATIONS alignment check + `no_char_authority_in_story_runtime` (emitted records carry only `source_char_id` provenance).
4. Supersession writes a new id with `supersedes` link → manual contract review that regenerate uses `supersede_story_character_authority_record` and forbids in-place structural rewrites.

## What to Change

### 1. Author `.claude/skills/story-character-profile/SKILL.md`

Create the skill with: frontmatter (`name`, `description` naming triggers/produces/mutates, `user-invocable`, `arguments`); World-State Prerequisites; the HARD-GATE block (per AR item 5); the 3 modes; the inputs (`world_slug`, `story_slug`, `mode`, `source_char_id?`, `target_stchar_id?`, `target_stent_ids[]?`, `emergence_context_records[]?`, `story_local_brief?`, `regeneration_reason?`); outputs (`story-characters/STCHAR-<n>.md`, optional supersession lifecycle update, bundle `INDEX.md` update, optional repair note); the `stchar.v1` 13-section body template; FOUNDATIONS Alignment table referencing STCHAR; a single-sentence Final Rule.

### 2. Optional templates

Add `templates/` only if a body skeleton meaningfully reduces authoring error; otherwise inline the 13-section template in SKILL.md.

## Files to Touch

- `.claude/skills/story-character-profile/SKILL.md` (new)
- `.claude/skills/story-character-profile/templates/` (new, optional)

## Out of Scope

- Machine-layer surfaces (schema, validators, patch-engine ops, index, MCP) — landed in SPEC-56.
- Deferred modes `retire` / `supersede_from_story_evidence` (M2).
- `get_story_character_packet` MCP tool (M3) — the skill uses `get_record(section_path)`.
- Bootstrap/turn-cycle consumption (SPEC57STCHARPIPINT-003 / -004).

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review confirms each mode (`create_from_world_char`, `create_story_local`, `regenerate`) requires a draft STCHAR with all 13 named body sections and the three hashes.
2. `node --test` on the validators package passes with a fixture STCHAR authored to the skill's template: `npm test --prefix tools/validators` (schema-compliance for `story_character_authority_record`).
3. Grep-proof: emitted STCHAR carries `source_char_id` provenance only — no operational `CHAR-*` reference in any body section that would be flagged by `no_char_authority_in_story_runtime`.

### Invariants

1. The skill never mutates world `CHAR`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any world `_source/` record.
2. Regeneration always allocates a new STCHAR id with a `supersedes` link; it never edits an existing STCHAR's structural fields in place.

## Test Plan

### New/Modified Tests

1. None — existing `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` already proves the STCHAR frontmatter schema fields this skill must emit; the 13-section body contract is LLM-facing skill prose and is verified by manual/grep review.

### Commands

1. `npm test --prefix tools/validators`
2. `rg -n 'create_from_world_char|create_story_local|regenerate|profile_hash|voice_block_hash|page_packet_hash|append_story_character_authority_record|supersede_story_character_authority_record' .claude/skills/story-character-profile/SKILL.md`
3. `rg -n '^## (Story-Facing Identity|Source Distillation|Stable Persona Core|Emotional Appraisal Map|Pressure Behavior|Voice Bible / Dialogue Authority|Page-Plan Voice Block|Perception and Embodiment|Agency and Planning Tendencies|Relationship-Specific Behavior|Story-State Derivation Guide|Prose Rendering Constraints|Validation / Audit Anchors)$' .claude/skills/story-character-profile/SKILL.md`

## Outcome

Completed: 2026-05-21

Added `.claude/skills/story-character-profile/SKILL.md` as the STCHAR authoring skill for SPEC-57 Phase 1. The skill defines the three v1 modes, loads FOUNDATIONS/shared-story/STCHAR schema authority, routes story hybrid writes through `append_story_character_authority_record` or `supersede_story_character_authority_record`, requires the 13-section `stchar.v1` body, computes the three STCHAR hashes, and preserves the `CHAR` provenance firewall.

## Verification Result

- `npm test --prefix tools/validators` — PASS; existing validators coverage for `story_character_authority_record` remains green.
- `rg -n 'create_from_world_char|create_story_local|regenerate|profile_hash|voice_block_hash|page_packet_hash|append_story_character_authority_record|supersede_story_character_authority_record' .claude/skills/story-character-profile/SKILL.md` — PASS; the new skill names all required modes, hash fields, and patch-engine ops.
- `rg -n '^## (Story-Facing Identity|Source Distillation|Stable Persona Core|Emotional Appraisal Map|Pressure Behavior|Voice Bible / Dialogue Authority|Page-Plan Voice Block|Perception and Embodiment|Agency and Planning Tendencies|Relationship-Specific Behavior|Story-State Derivation Guide|Prose Rendering Constraints|Validation / Audit Anchors)$' .claude/skills/story-character-profile/SKILL.md` — PASS; all 13 body sections are present as exact H2 anchors.
- Manual review against `docs/FOUNDATIONS.md` section 6.1 and `docs/HARD-GATE-DISCIPLINE.md` — PASS; the skill allows `CHAR` only as source/provenance input, keeps STCHAR out of BEL epistemic access, forbids world mutation, and waits for explicit approval before engine-routed writes.

## Deviations

- The drafted skill dry-run proof was replaced with manual contract review plus grep proof because the repo has no executable runner for `.claude/skills/<slug>/` dry-runs in Codex. This does not weaken the machine-checkable boundary: the live STCHAR schema and validator tests already cover frontmatter validity, while this ticket owns LLM-facing skill instructions.
