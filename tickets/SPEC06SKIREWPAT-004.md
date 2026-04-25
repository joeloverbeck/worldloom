# SPEC06SKIREWPAT-004: diegetic-artifact-generation — engine-routed migration

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/diegetic-artifact-generation/SKILL.md` rewritten; pre-flight world-state load via `get_context_packet`; writes via `append_diegetic_artifact_record` op + engine-managed `diegetic-artifacts/INDEX.md`
**Deps**: None — SPEC-01..SPEC-05 Part B + SPEC-13 + SPEC-14 archived. Independent of sibling tickets. Recommend landing after or in parallel with SPEC06SKIREWPAT-003 (same pattern, different skill).

## Problem

`diegetic-artifact-generation/SKILL.md` (174 lines) currently produces diegetic artifacts via direct `Write` to `worlds/<slug>/diegetic-artifacts/<da-slug>.md` plus a direct `Edit` to `diegetic-artifacts/INDEX.md`. The skill reads world state via inherited "Large-file method" patterns referring to retired monolithic files. Per SPEC-06 §Migration plan diegetic-artifact-generation subsection (line 164: "same pattern as character-generation"), pre-flight load shifts to `mcp__worldloom__get_context_packet(task_type='diegetic-artifact-generation', ...)`; writes route through `submit_patch_plan` carrying `append_diegetic_artifact_record` (which exists at `tools/patch-engine/src/ops/append-diegetic-artifact-record.ts`); index update is engine-managed.

Target: SKILL.md ~140 lines.

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/diegetic-artifact-generation/SKILL.md` (174 lines) references retired monolithic files in §World-State Prerequisites; uses inherited "Large-file method" pattern. The retired files are gone post-SPEC-13.
2. SPEC-06 §Migration plan diegetic-artifact-generation subsection (line 164) prescribes "same pattern as character-generation" with target 174 → ~140 lines. `append_diegetic_artifact_record` op exists at `tools/patch-engine/src/ops/append-diegetic-artifact-record.ts` (verified).
3. Cross-skill / cross-artifact boundary: diegetic artifact schema is the contract surface — `DA-NNNN` frontmatter (`diegetic_artifact_id`, plus artifact metadata: author persona, date, place, audience, relation to truth) + markdown body. Boundary preserved by this rewrite — only the WRITE PATH changes.
4. FOUNDATIONS principles under audit:
   - **Rule 6 (No Silent Retcons)**: diegetic-to-world firewall preserves the audit trail when narrator-voice claims are later elevated to world-level CFs (consumed by `canon-facts-from-diegetic-artifacts`). Firewall judgment STAYS in-skill (semantic).
   - **Rule 7 (Preserve Mystery Deliberately)**: a diegetic artifact's narrator may speculate about Mystery Reserve entries, but the artifact's truth-status discipline (`world_relation` field marking narrator-voice vs world-level claims) prevents silent resolution.
5. Truth-status discipline: every artifact carries an explicit `world_relation` block marking which claims are narrator-voice (potentially propagandistic, biased, mistaken) vs which are world-level true. This discipline STAYS in-skill (semantic judgment about which claims a narrator can make truthfully).

## Architecture Check

1. Thin-orchestrator pattern: pre-flight allocates `DA-NNNN` via `mcp__worldloom__allocate_next_id`; `get_context_packet(task_type='diegetic-artifact-generation', ...)` provides world-state context; artist-persona construction + truth-status discipline + diegetic-to-world firewall judgment retain semantic phases; assemble patch plan with single `append_diegetic_artifact_record` op; HARD-GATE before write.
2. No backwards-compatibility shims.

## Verification Layers

1. Engine-routed artifact write → grep-proof: skill text contains zero direct `Write worlds/<slug>/diegetic-artifacts/`; uses only `submit_patch_plan` with `append_diegetic_artifact_record`
2. `diegetic-artifacts/INDEX.md` consistent → engine fail-fast: every op atomically updates the index
3. Artifact frontmatter passes `record_schema_compliance` → schema validation: `world-validate animalia --json` reports zero failures on emitted artifacts
4. Diegetic-to-world firewall preserved → manual review: artifact's narrator-voice claims marked as such in `world_relation`; world-level claims attribute to existing CFs
5. Truth-status discipline → manual review: every artifact carries an explicit `world_relation` block; narrator's biases / propaganda / mistakes don't silently leak to world canon

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~140 lines)

Replace pre-flight world-state load with `mcp__worldloom__allocate_next_id(world_slug, 'diegetic_artifact_record')` + `get_context_packet(task_type='diegetic-artifact-generation', seed_nodes=[...artifact's world-anchor CFs...], token_budget=10000)`. Drop §World-State Prerequisites file enumeration referencing retired monolithic files. Replace direct `Write` of artifact with `submit_patch_plan` carrying `append_diegetic_artifact_record`. Drop direct `Edit` of `diegetic-artifacts/INDEX.md` (engine-managed).

### 2. Preserve artist-persona construction phase

The semantic judgment phase (who is the artist/author? what's their period, education, biases? what genre conventions do they work within?) STAYS in-skill.

### 3. Preserve truth-status discipline

The check "what claims is the narrator making?" STAYS in-skill. Every diegetic artifact carries an explicit `world_relation` block:
- `world_level: [...]` — claims the world treats as true (cite CFs)
- `narrator_belief: [...]` — claims the narrator believes (may or may not be true)
- `propagandistic: [...]` — claims the narrator pushes for in-world political reasons
- `unreliable: [...]` — claims the narrator may be mistaken about

### 4. Diegetic-to-world firewall judgment

The check "does this artifact silently elevate a narrator-voice claim to world-level truth?" STAYS in-skill (semantic). `canon-facts-from-diegetic-artifacts` later mines artifacts for canon, but only after explicit user adjudication via canon-addition; the firewall prevents short-circuit elevation.

### 5. HARD-GATE → submit_patch_plan

Present artifact summary + truth-status block + diegetic-to-world firewall check; user approves; skill calls `submit_patch_plan`.

## Files to Touch

- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify — rewrite ~174 → ~140 lines)
- `.claude/skills/diegetic-artifact-generation/references/` (modify — refresh retrieval-mechanism files; preserve artist-persona judgment files)
- `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` (modify if frontmatter schema needs refresh)

## Out of Scope

- Migration of OTHER skills
- Diegetic artifact schema changes
- Validator framework changes for diegetic artifact records
- Token-reduction measurement (SPEC06SKIREWPAT-009)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run producing a new diegetic artifact on animalia: pre-flight uses `allocate_next_id` + `get_context_packet`; zero raw `Read` of `_source/`; HARD-GATE fires before write.
2. Engine-emitted artifact passes `record_schema_compliance`; `diegetic-artifacts/INDEX.md` updated atomically.
3. Truth-status discipline: synthetic test where the proposed artifact's body silently states a narrator-voice claim as world-level fact; skill flags the missing `world_relation` annotation.
4. Diegetic-to-world firewall: synthetic test where the proposed artifact would silently elevate a narrator claim past the firewall; skill refuses to commit.

### Invariants

1. HARD-GATE absoluteness.
2. Truth-status block mandatory: every artifact carries `world_relation` with at least the world_level / narrator_belief partition.
3. Diegetic-to-world firewall: silent elevations halt the skill.
4. Artifact schema fidelity: every emitted artifact passes `record_schema_compliance`.

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + world-validate command-based.`

### Commands

1. `cd tools/patch-engine && npm test` — confirm `append_diegetic_artifact_record` op unchanged
2. `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` — post-skill-rewrite world state passes
3. Manual skill dry-run producing a test diegetic artifact on animalia; review truth-status discipline + diegetic-to-world firewall judgment. Manual review is the correct boundary because narrator-voice analysis is semantic judgment.
