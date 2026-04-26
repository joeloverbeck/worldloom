# SPEC06SKIREWPAT-003: character-generation — engine-routed migration

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/character-generation/SKILL.md` rewritten; pre-flight world-state load via `get_context_packet`; writes via `append_character_record` op + engine-managed `characters/INDEX.md`
**Deps**: None — SPEC-01..SPEC-05 Part B + SPEC-13 + SPEC-14 archived. Independent of sibling tickets. Recommend landing after SPEC06SKIREWPAT-001 (canon-addition pattern proven).

## Problem

`character-generation/SKILL.md` (165 lines — already extracted in commit `438d194` "Extracted references from skills") currently produces character dossiers via direct `Write` to `worlds/<slug>/characters/<char-slug>.md` plus a direct `Edit` to `characters/INDEX.md`. The skill reads world state via inherited "Large-file method" patterns referring to retired monolithic files. Per SPEC-06 §Migration plan character-generation subsection (lines 159–162), pre-flight load shifts to `mcp__worldloom__get_context_packet(task_type='character-generation', ...)`; writes route through `submit_patch_plan` carrying `append_character_record` (which exists at `tools/patch-engine/src/ops/append-character-record.ts`); index update is engine-managed.

Target: SKILL.md ~155 lines (modest reduction since references were already extracted; ~6%). The reduction is small because the SKILL.md was already thinned; the substantive change is the contract migration (engine-routed writes) more than the line-count delta.

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/character-generation/SKILL.md` (165 lines) references retired monolithic files in §World-State Prerequisites; uses inherited "Large-file method" pattern. The retired files are gone post-SPEC-13 per `docs/FOUNDATIONS.md` §Canonical Storage Layer line 458.
2. SPEC-06 §Migration plan character-generation subsection (lines 159–162) prescribes the rewrite. `append_character_record` op exists at `tools/patch-engine/src/ops/append-character-record.ts` (verified during /reassess-spec spot-check).
3. Cross-skill / cross-artifact boundary: character dossier schema is the contract surface — `CHAR-NNNN` frontmatter (`character_id`, plus dossier metadata) + markdown body. Boundary preserved by this rewrite — only the WRITE PATH changes (engine-routed instead of direct-`Write`), not the dossier content shape.
4. FOUNDATIONS principles under audit: **Rule 7 (Preserve Mystery Deliberately)** — character-generation's Mystery Reserve firewall judgment (a character must not be characterized in a way that resolves an M-N entry's forbidden answer) STAYS in-skill (semantic judgment about character backstory vs Mystery Reserve forbidden-answer collision); `rule7_mystery_reserve_preservation` validator catches mechanical violations.
5. HARD-GATE semantics: gate fires before `submit_patch_plan` carrying `append_character_record`; auto-Mode does not bypass.
6. Character dossier schema preserved (no schema change in this ticket); consumer-side: `record_schema_compliance` validator parses character frontmatter; engine `append_character_record` op writes hybrid file at `worlds/<slug>/characters/<char-slug>.md` + updates `characters/INDEX.md`.

## Architecture Check

1. Thin-orchestrator pattern: pre-flight allocates `CHAR-NNNN` via `mcp__worldloom__allocate_next_id`; `get_context_packet(task_type='character-generation', seed_nodes=[...world overview...], token_budget=10000)` provides world-state context (kernel, invariants, relevant CFs, Mystery Reserve entries touching the character's domain); essence/niche/voice construction phases retain judgment; CF-distribution conformance check + Mystery Reserve firewall judgment retain judgment; assemble patch plan with single `append_character_record` op; HARD-GATE before write. Cleaner than direct-`Write` because `characters/INDEX.md` is engine-managed (atomicity guarantees dossier and index land together; no half-updated index).
2. No backwards-compatibility shims — direct-`Write` paths replaced wholesale.

## Verification Layers

1. Engine-routed dossier write → grep-proof: skill text contains zero direct `Write worlds/<slug>/characters/`; uses only `submit_patch_plan` with `append_character_record`
2. `characters/INDEX.md` consistent → engine fail-fast: every `append_character_record` op atomically updates the index; no half-state where dossier exists without index entry
3. Character frontmatter passes `record_schema_compliance` → schema validation: `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` reports zero failures on emitted dossiers
4. Mystery Reserve firewall preserved → manual review: skill dry-run on a character whose backstory would touch a `status: forbidden` M-N entry; skill flags collision and refuses to commit until firewall is restored
5. CF-distribution conformance → manual review: character's claimed competencies/access/etc. align with `distribution.who_can_do_it` of relevant CFs (e.g., a character with combat training is plausible per relevant capability CFs)

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~155 lines)

Replace pre-flight world-state load (currently the inherited "Large-file method" patterns or direct `Read` calls) with `mcp__worldloom__allocate_next_id(world_slug, 'character_record')` for `CHAR-NNNN` allocation and `get_context_packet(task_type='character-generation', seed_nodes=[<world-overview-or-related-CFs>], token_budget=10000)`. Drop §World-State Prerequisites file enumeration referencing retired monolithic files. Replace direct `Write` of dossier with `submit_patch_plan` carrying `append_character_record`. Drop direct `Edit` of `characters/INDEX.md` (engine-managed).

### 2. Preserve essence / niche / voice construction phases

The semantic judgment phases (essence: who is this character at the deepest level? niche: what role do they fill in the world's social/institutional fabric? voice: how do they speak, what are their idiolect markers?) STAY in-skill. These are the judgment heart of character generation; mechanism cannot own them.

### 3. Mystery Reserve firewall judgment

The check "does this character's backstory or competencies collide with any `status: forbidden` M-N entry's forbidden answers?" STAYS in-skill (semantic). `rule7_mystery_reserve_preservation` validator catches mechanical violations (e.g., character's `source_basis` cites an M-N entry as resolved); semantic firewall judgment remains skill-side.

### 4. CF-distribution conformance

The check "does this character's claimed competencies match `distribution.who_can_do_it` of relevant capability CFs?" STAYS in-skill (semantic). Skill enumerates relevant CFs via `find_named_entities` + `search_nodes` filtered by domain; cross-checks character's profile.

### 5. HARD-GATE → submit_patch_plan

Present dossier summary + Mystery Reserve firewall check + CF-distribution conformance to user; user issues `approval_token`; skill calls `submit_patch_plan(plan, approval_token)`; engine applies atomically.

## Files to Touch

- `.claude/skills/character-generation/SKILL.md` (modify — rewrite ~165 → ~155 lines)
- `.claude/skills/character-generation/references/` (modify — refresh any retrieval-mechanism files; preserve essence/niche/voice judgment files)
- `.claude/skills/character-generation/templates/character-dossier.md` (modify if frontmatter schema needs SPEC-14-style refresh; otherwise leave)

## Out of Scope

- Migration of OTHER skills (covered by sibling tickets)
- Character dossier schema changes (frontmatter shape unchanged)
- Validator framework changes for character records (SPEC-04 owns)
- Token-reduction measurement (covered by SPEC06SKIREWPAT-009 capstone)
- Animalia character dossier re-emission (existing dossiers unchanged; this ticket affects future skill runs only)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run producing a new character dossier on animalia: pre-flight uses `allocate_next_id` + `get_context_packet`; zero raw `Read` of `_source/`; HARD-GATE fires before `submit_patch_plan`.
2. Engine-emitted dossier passes `record_schema_compliance` validation; `characters/INDEX.md` updated atomically; no half-state.
3. Mystery Reserve firewall: synthetic test where the proposed character backstory would resolve an M-N entry's forbidden answer; skill flags collision and refuses to commit until firewall is restored.
4. CF-distribution conformance: synthetic test where the proposed character claims a competency outside the relevant CF's `distribution.who_can_do_it`; skill flags conflict.
5. Direct-`Write` attempt on `worlds/<slug>/characters/` from within character-generation (synthetic) is replaced by engine route; no direct write occurs.

### Invariants

1. HARD-GATE absoluteness: skill cannot `submit_patch_plan` without `approval_token`.
2. Mystery Reserve firewall: every dossier passes the firewall check; semantic violations halt the skill.
3. Character dossier schema fidelity: every emitted dossier passes `record_schema_compliance`.
4. Index consistency: `characters/INDEX.md` always reflects the current set of dossier files (no stale entries, no missing entries).

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + world-validate command-based; engine and validator coverage exists.`

### Commands

1. `cd tools/patch-engine && npm test` — confirm `append_character_record` op unchanged
2. `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` — post-skill-rewrite world state passes
3. Manual skill dry-run producing a test character on animalia; review essence/niche/voice quality. Manual review is the correct boundary because essence/niche/voice are semantic judgment.
