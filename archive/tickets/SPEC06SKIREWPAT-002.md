# SPEC06SKIREWPAT-002: create-base-world — atomic-source genesis emission

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/create-base-world/SKILL.md` rewritten; genesis emission switches from direct file scaffolding to engine-routed multi-op patch plan covering all atomized concerns per SPEC-13
**Deps**: None — SPEC-01..SPEC-05 Part B + SPEC-13 + SPEC-14 archived. Independent of SPEC06SKIREWPAT-001 (different skill, different file set). Recommend landing 001 first to prove the thin-orchestrator pattern before applying it here.

## Problem

`create-base-world/SKILL.md` (304 lines) currently scaffolds new worlds by direct `Write` of 13 mandatory monolithic markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, plus 5 large prose files plus `WORLD_KERNEL.md` + `ONTOLOGY.md`). Per SPEC-13, 11 of the 13 concerns are now atomized YAML records under `worlds/<slug>/_source/<subdir>/`; only `WORLD_KERNEL.md` and the reduced `ONTOLOGY.md` remain primary-authored at the world root. The current skill produces worlds in a storage form that no longer exists. Per SPEC-06 §Migration plan create-base-world subsection (lines 148–151) and §SPEC-13 amendment summary line 27 ("`create-base-world` updates to emit `_source/` directly. New worlds start in atomic-source form; no legacy storage accumulates after SPEC-13 migration."), the rewrite emits a genesis multi-op patch plan via `submit_patch_plan`.

Target: SKILL.md ~150 lines (vs current 304); genesis emission via single `submit_patch_plan` call carrying `create_cf_record` + `create_ch_record` + `create_inv_record` + `create_m_record` + `create_oq_record` + `create_ent_record` + `create_sec_record` ops; `WORLD_KERNEL.md` and reduced `ONTOLOGY.md` written via direct `Write` (Hook 3 explicitly allows world-root primary-authored files).

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/create-base-world/SKILL.md` (304 lines) scaffolds 13 monolithic markdown files. The 11 atomized concerns (CF, CH, INV, M, OQ, ENT, plus the 7 per-section SEC classes for everyday-life / institutions / magic-or-tech-systems / geography / economy-and-resources / peoples-and-species / timeline) are now atomic YAML under `worlds/<slug>/_source/<subdir>/` per `docs/FOUNDATIONS.md` §Mandatory World Files (lines 95–119) and §Canonical Storage Layer (lines 456–466).
2. SPEC-06 §Migration plan create-base-world subsection (lines 148–151) prescribes: replace initial file scaffolding with `submit_patch_plan` containing the genesis multi-op bundle; replace CH-0001 composition Edit with `create_ch_record`. SPEC-03 (`archive/specs/SPEC-03-patch-engine.md`) defined the `create_*_record` op vocabulary; SPEC-02-PHASE2 (`archive/specs/SPEC-02-phase2-tooling.md`) extended `allocate_next_id` to INV per-category / OQ / ENT / SEC per-file-class.
3. Cross-skill / cross-artifact boundary: this rewrite changes the contract create-base-world exposes to downstream skills (canon-addition, character-generation, etc.) — they now receive worlds in atomic-source form from creation, not just from animalia's one-time SPEC-13 migration. Boundary preserved: every downstream skill reads via `mcp__worldloom__get_record` / `get_context_packet` and writes via engine ops; no skill assumes monolithic-markdown storage post-SPEC-13.
4. FOUNDATIONS principles under audit: **Rule 1 (No Floating Facts)** — genesis CF-0001 must declare `domain`, `scope`, `prerequisites`, `limits`, `consequences` per FOUNDATIONS.md §Validation Rules line 343–349; the genesis multi-op patch plan must satisfy this for every emitted CF. **Rule 6 (No Silent Retcons)** — genesis CH-0001 records the world's creation as the first change-log entry; no retcons exist at genesis time, but the audit-trail discipline starts here.
5. HARD-GATE semantics: gate fires at user-approval step before `submit_patch_plan` for the genesis bundle; user reviews the proposed world structure before atomic write; auto-Mode does not bypass.
6. CF Record schema preserved per FOUNDATIONS.md §Canon Fact Record Schema (lines 263–318); genesis CF-0001 satisfies the full schema. INV records use `<INV-ID>` per CLAUDE.md §ID Allocation Conventions (`ONT-N` ontological, `CAU-N` causal, `DIS-N` distribution, `SOC-N` social, `AES-N` aesthetic) with category-prefix + 1-based counter.

## Architecture Check

1. Thin-orchestrator pattern: pre-flight refuses to overwrite existing world directory; user-interview phase composes genesis brief (genre contract, tonal contract, chronotope, key ontological deviations, organizing pressures, natural story engines per FOUNDATIONS.md §World Kernel template); Phase N synthesizes initial invariants (5 categories minimum), genesis CF-0001 (the world's primary-difference fact), genesis CH-0001 (world creation entry), seed Mystery Reserve entries, seed Open Questions, seed Named Entities, per-prose-section SEC records; Phase N+1 assembles patch plan; HARD-GATE before `submit_patch_plan`. Cleaner than per-file `Write` because the engine atomicity ensures the world is either fully created or not created (no partial-genesis world that fails validator gates on first canon-addition run).
2. `WORLD_KERNEL.md` and reduced `ONTOLOGY.md` (Categories / Relation Types / Notes) written via direct `Write` because they are primary-authored at world root per FOUNDATIONS.md §Canonical Storage Layer line 464; Hook 3 explicitly allows. No backwards-compatibility shims — pre-migration scaffolding code is replaced wholesale.

## Verification Layers

1. Genesis world structure conforms to atomic-source contract → grep-proof: post-skill-run world has `worlds/<slug>/_source/canon/CF-0001.yaml`, `worlds/<slug>/_source/change-log/CH-0001.yaml`, `worlds/<slug>/_source/invariants/<ID>.yaml` (≥5 records, one per invariant category), `worlds/<slug>/_source/mystery-reserve/`, `worlds/<slug>/_source/open-questions/`, `worlds/<slug>/_source/entities/`, `worlds/<slug>/_source/<7 prose subdirs>/`; world root has `WORLD_KERNEL.md` and `ONTOLOGY.md`; no monolithic markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, etc.) present
2. Every emitted record passes `record_schema_compliance` → schema validation: `cd tools/validators && node dist/src/cli/world-validate.js <new-world-slug> --json` reports zero failures
3. CF-0001 satisfies Rule 1 → grep + manual review: CF-0001 has non-empty `domains_affected`, `prerequisites` (or inline N/A justification), `costs_and_limits`, `visible_consequences`, `required_world_updates`
4. `world-index build <new-world-slug>` succeeds against the genesis `_source/` tree → CLI test: index builds without errors; node count matches manual enumeration
5. HARD-GATE fires before write → skill dry-run trace: `submit_patch_plan` is never called without `approval_token` issued at user-approval step

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~150 lines)

Replace the per-file `Write` scaffolding (currently the bulk of the SKILL.md) with a single `submit_patch_plan` invocation. Pre-flight: refuse to overwrite existing `worlds/<slug>/` directory; allocate genesis IDs via `mcp__worldloom__allocate_next_id` for `CF-0001`, `CH-0001`, and category-prefixed invariant IDs (`ONT-1`, `CAU-1`, `DIS-1`, `SOC-1`, `AES-1` minimum) on a fresh world (allocator returns these IDs because no prior records exist). Phase 0 (interview): collect genesis brief per FOUNDATIONS.md §World Kernel template. Phase N (synthesis): compose genesis CF-0001 (primary-difference fact), genesis CH-0001 (creation entry), 5+ initial invariants, seed Mystery Reserve entries, seed Open Questions, seed Named Entities, per-prose-section SEC records (one initial section per prose concern is sufficient — the world starts thin and grows via canon-addition).

### 2. Genesis multi-op patch plan assembly

Compose `PatchOperation[]` referencing the IDs allocated at pre-flight:
- `create_cf_record` — CF-0001 with full FOUNDATIONS-compliant schema.
- `create_ch_record` — CH-0001 documenting the world's creation; `change_type: addition`; `affected_fact_ids: [CF-0001]`.
- `create_inv_record` × 5+ — one per invariant category (ONT, CAU, DIS, SOC, AES); each carries identifier, statement, rationale, examples, non-examples, break conditions, revision difficulty per FOUNDATIONS.md §Invariants line 187–195.
- `create_m_record` × N — seed Mystery Reserve entries; each defines `unknowns`, `knowns`, `disallowed_cheap_answers` (or current schema field names per the SPEC-13 atomic-source contract), `status` (`active` / `passive` / `forbidden`), `future_resolution_safety` (coupled per FOUNDATIONS line 91).
- `create_oq_record` × N — seed Open Questions.
- `create_ent_record` × N — seed Named Entities.
- `create_sec_record` × 7 — one initial SEC per prose concern (everyday-life, institutions, magic-or-tech-systems, geography, economy-and-resources, peoples-and-species, timeline); each carries the per-section schema per SPEC-13's atomic-source contract for that file class.

### 3. World-root primary-authored files

Write `worlds/<slug>/WORLD_KERNEL.md` (narrative summary per FOUNDATIONS.md §World Kernel template) and `worlds/<slug>/ONTOLOGY.md` (Categories in Use + Relation Types in Use + Notes; Named Entity Registry atomized to `_source/entities/` so it does NOT live in ONTOLOGY.md per FOUNDATIONS.md §Mandatory World Files line 102) via direct `Write` calls. Hook 3 explicitly allows these per SPEC-05 Part B (`WORLD_KERNEL.md`, `ONTOLOGY.md` are in the allowlist).

### 4. Phase 14a validation

Call `mcp__worldloom__validate_patch_plan(plan)` to exercise every validator on the genesis plan. Loop back to Phase N on validator fail. Skill-side judgment: verify the genesis brief is internally coherent (genre/tone/chronotope hang together; primary difference is genuinely distinguishing; pressures generate plausible story engines).

### 5. HARD-GATE → submit_patch_plan

Present genesis bundle summary to user (per SPEC-06 §Migration plan create-base-world subsection); user issues `approval_token`; skill calls `submit_patch_plan(plan, approval_token)`; engine applies atomically. Then write `WORLD_KERNEL.md` and `ONTOLOGY.md`.

### 6. Pre-migration vs post-migration deletion

Delete all references to monolithic markdown file names (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, etc.) from SKILL.md. The skill emits atomic source from the start; no transitional dual-form code.

## Files to Touch

- `.claude/skills/create-base-world/SKILL.md` (modify — rewrite ~304 → ~150 lines)
- `.claude/skills/create-base-world/templates/` (modify if present — refresh any per-file scaffolding templates to atomic-record schemas; or delete if engine schemas suffice)

## Out of Scope

- Migration of OTHER skills (covered by sibling tickets)
- New patch-engine ops beyond SPEC-03 vocabulary
- Animalia world re-creation (animalia migrated in SPEC-13 Stream B; this ticket covers create-base-world for NEW worlds only)
- Per-prose-section SEC schema design (atomic-source schemas are SPEC-13's contract; this ticket consumes them)
- World-validate CLI changes (validator framework owns; SPEC-04)
- Token-reduction measurement (covered by SPEC06SKIREWPAT-009 capstone)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run creating a new test-world: pre-flight refuses to overwrite existing world; genesis brief interview produces a coherent World Kernel; HARD-GATE fires before `submit_patch_plan`.
2. Post-skill-run new test-world structure matches atomic-source contract: `_source/canon/CF-0001.yaml` exists; `_source/change-log/CH-0001.yaml` exists; `_source/invariants/` has ≥5 records (one per category); 7 prose-concern subdirs exist with ≥1 SEC each; `WORLD_KERNEL.md` and `ONTOLOGY.md` exist at world root; no monolithic markdown files.
3. `cd tools/world-index && node dist/src/cli/world-index.js build <new-world-slug>` succeeds; node count matches manual enumeration.
4. `cd tools/validators && node dist/src/cli/world-validate.js <new-world-slug> --json` reports zero validator findings on the freshly-created world.
5. Genesis CF-0001 passes Rule 1 manual review: non-empty `domains_affected`, `prerequisites` (or inline N/A), `costs_and_limits`, `visible_consequences`, `required_world_updates`.

### Invariants

1. HARD-GATE absoluteness: skill cannot `submit_patch_plan` without `approval_token`. Auto-Mode does not bypass.
2. Refuse-to-overwrite: skill aborts pre-flight if `worlds/<slug>/` directory already exists.
3. Atomic-source-only emission: post-skill-run world has zero monolithic markdown files for atomized concerns; `WORLD_KERNEL.md` and `ONTOLOGY.md` are the only world-root markdown files.
4. CF-0001 + CH-0001 invariants: every new world's first canon fact and first change-log entry are committed atomically as part of genesis.

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + world-index build + world-validate command-based; engine and validator coverage exists per SPEC-03 and SPEC-04.`

### Commands

1. `cd tools/patch-engine && npm test` — confirm `create_*_record` ops unchanged
2. `cd tools/validators && npm test` — confirm validator coverage unchanged
3. `cd tools/world-index && node dist/src/cli/world-index.js build <new-world-slug>` — index builds against genesis `_source/`
4. `cd tools/validators && node dist/src/cli/world-validate.js <new-world-slug> --json` — zero findings on freshly-created world
5. Manual skill dry-run with a test world brief (e.g., a small thematic world); manual review of genesis brief coherence (judgment, not mechanizable). Manual review is the correct boundary because genesis-brief coherence is a semantic judgment, not a structural property.
