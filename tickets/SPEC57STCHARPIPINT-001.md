# SPEC57STCHARPIPINT-001: New skill — story-character-profile

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds new skill `.claude/skills/story-character-profile/`; no impact on existing skills (it is the only general-purpose surface allowed to read world `CHAR` for characterization; runtime skills consume STCHAR).
**Deps**: None (SPEC-56 landed the STCHAR schema, validators, patch-engine ops, world-index node/edges, and MCP retrieval surfaces).

## Problem

After SPEC-56 made `STCHAR` storable/retrievable/validatable, the story pipeline still has no skill that **authors** STCHAR profiles. Story bundles that need character-specific behavior, voice, appraisal, or planning authority have no canon-safe path to distill a world `CHAR-*` dossier (or author a story-local profile) into a story-local `STCHAR-*` record. This ticket adds that authoring skill (SPEC-57 Phase 1).

## Assumption Reassessment (2026-05-21)

1. The STCHAR schema is landed at `tools/validators/src/schemas/story-character-authority.schema.json` with the three load-bearing hashes (`profile_hash`, `voice_block_hash`, `page_packet_hash`), `source_char_id` / `source_kind` provenance, `supersedes` / `superseded_by` / `status` (active|superseded|retired) lifecycle, and `body_schema_version: const "stchar.v1"`. Patch-engine ops `append_story_character_authority_record` / `supersede_story_character_authority_record` exist (SPEC-56). The skill authors against these — it does not define new schema.
2. SPEC-57 §Phase 1 specifies 3 v1 modes (`create_from_world_char`, `create_story_local`, `regenerate`); `retire` / `supersede_from_story_evidence` are deferred per SPEC-56 §Out of Scope M2. The 13-section `stchar.v1` body template is per the report §6.3; section anchors validated by presence, not per-section hash (M1).
3. Cross-skill boundary under audit: this skill is a new Skill Category 2c member writing only to `worlds/<slug>/stories/<slug>/story-characters/` via engine ops; it mirrors the HARD-GATE shape of sibling story skills. The `no_char_authority_in_story_runtime` validator (`tools/validators/src/structural/no-char-authority-in-story-runtime.ts`) permits `STCHAR.source_char_id` provenance — this skill is one of the few lawful `CHAR`-reading surfaces.
4. FOUNDATIONS §6.1 (Story-Local Character Authority): `CHAR` provenance may be recorded in STCHAR frontmatter but must not be an operational shortcut; STCHAR must never be added to `BEL.basis.access_records[]`. Rule 6 (No Silent Retcons): regeneration supersedes via a new id with a `supersedes` link — never an in-place rewrite.
5. HARD-GATE semantics: the skill defines a canon-reading content-generation HARD-GATE — load FOUNDATIONS + shared story contract + STCHAR schema; resolve bundle; resolve source `CHAR` only when the mode needs it; allocate STCHAR id; draft the full profile from zero; validate frontmatter/body section anchors + the three hashes; confirm no world mutation; submit the patch plan only after explicit user approval. The gate must not weaken the world/story firewall (no `CHAR` operational leakage into emitted STCHAR).

## Architecture Check

1. A dedicated authoring skill keeps the single lawful general-purpose `CHAR`-reading surface isolated, so runtime skills (turn-cycle, prose-attach, health-audit) stay firewalled from world `CHAR` per SPEC-56's validator. Inline authoring elsewhere would scatter the firewall exception.
2. No backwards-compatibility shims: the skill writes only the current STCHAR schema; supersession uses new ids, never in-place mutation.

## Verification Layers

1. Skill produces a schema-valid STCHAR → schema validation (`world-validate` against `story-character-authority.schema.json`).
2. Three hashes present and correct → schema validation + grep-proof of the hashed sections.
3. Never mutates world `CHAR` → FOUNDATIONS alignment check + `no_char_authority_in_story_runtime` (emitted records carry only `source_char_id` provenance).
4. Supersession writes a new id with `supersedes` link → skill dry-run inspection of the regenerate mode output.

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

1. A dry-run of each mode (`create_from_world_char`, `create_story_local`, `regenerate`) produces a draft STCHAR with all 13 named body sections and the three hashes.
2. `node --test` on the validators package passes with a fixture STCHAR authored to the skill's template: `npm test --prefix tools/validators` (schema-compliance for `story_character_authority_record`).
3. Grep-proof: emitted STCHAR carries `source_char_id` provenance only — no operational `CHAR-*` reference in any body section that would be flagged by `no_char_authority_in_story_runtime`.

### Invariants

1. The skill never mutates world `CHAR`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any world `_source/` record.
2. Regeneration always allocates a new STCHAR id with a `supersedes` link; it never edits an existing STCHAR's structural fields in place.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-character-authority.test.ts` — extend with a fixture authored to the skill's 13-section template (rationale: prove the skill's output shape is schema-valid). Modify-or-confirm; if SPEC-56 coverage already asserts the template shape, cite it in lieu of a new case.

### Commands

1. `npm test --prefix tools/validators`
2. Skill dry-run: invoke `story-character-profile` in each mode against a fixture bundle and inspect the drafted `STCHAR-<n>.md` without committing.
3. A narrower per-mode dry-run is the correct boundary here because skill behavior is LLM-executed and not unit-testable; schema validity is the machine-checkable surface.
