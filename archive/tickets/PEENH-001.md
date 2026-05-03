# PEENH-001: Patch-engine ops + Hook 3 namespace extension for story-bundle records (Shape A → Shape B migration)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — adds patch-engine ops for engine-routed story-bundle `_source` record classes; extends Hook 3's match pattern to cover `worlds/<slug>/stories/<slug>/_source/`; adds record-schema validators for those engine-routed story classes; migrates story-pipeline `_source` YAML write discipline from Shape A direct writes to Shape B via `submit_patch_plan`.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md`, `archive/tickets/VALENH-001.md` (predicate-DSL parsability validator; record-schema validators per class remain owned here)

## Outcome

PEENH-001 is implemented. Story-bundle atomic YAML under `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml` now routes through typed patch-engine operations, Hook 3 blocks direct writes to that subtree, validators apply story-bundle JSON Schemas through the existing `record_schema_compliance` framework, and the story-pipeline skills/docs now describe Shape B for `_source` YAML while preserving direct writes for story markdown surfaces.

The landed operation set is:

- `create_stent_record`, `create_sf_record`, `create_se_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_stloc_record`, `create_stobj_record`, `create_br_record`, `create_pg_record`, `create_chc_record`, `create_slt_record`
- `append_story_diegetic_artifact_record`

Story-local diegetic artifact allocation uses `expected_id_allocations.story_da_ids` so it does not collide conceptually with world-level `da_ids`. Storylet batch manifests remain markdown writes under `storylet-batches/`.

## Problem

At ticket intake, the five story-pipeline skills wrote story-bundle records via direct `Write` rather than through the patch engine:

- `branching-story-bootstrap` writes the entire bundle's initial state via direct Write per its Phase 11 transaction.
- `branching-story-page-cycle` writes the next-page bundle (PG / SE / SF / OBL / CNSQ / THR / SREL / STINT / CHC plus JIT SLT and story-local STLOC / STOBJ / DA) via direct Write per its Phase 11 transaction.
- `storylet-pool-authoring` writes SLT records and the SLB manifest via direct Write per its Phase 7 transaction (15 SLT YAMLs + 1 SLB manifest written this session).
- `branching-story-health-audit` writes SAU audit reports + RSP cards via direct Write.
- `story-fact-promotion-to-canon` writes SP promotion ledgers + superseding story-local source records via direct Write (its world-canon mutation routes through `canon-addition` and the patch engine, but the story-bundle side is direct Write).

At ticket intake, each skill's SKILL.md explicitly noted: *"Direct `Write` is the correct mutation surface for story-bundle records under the Shape A integration posture. Hook 3's match pattern is `worlds/<slug>/_source/...` which does NOT match `worlds/<slug>/stories/<slug>/_source/...`. SLT/SLB records are not world canon and no engine ops exist for them. A future maintainer who 'upgrades' the skill to engine routing must FIRST land patch-engine ops + Hook 3 namespace extension + record-schema validators for the SLT/SLB classes."*

This ticket is that future maintainer's instruction.

The motivation is alignment with FOUNDATIONS §Canonical Storage Layer's discipline: *"Write discipline: `worlds/<slug>/_source/` is an engine-only write surface. Direct `Edit`/`Write` on any `_source/*.yaml` file is blocked by Hook 3; mutations route through `mcp__worldloom__submit_patch_plan` with typed record-ops."* Per `docs/FOUNDATIONS.md` §Story Bundles, story-bundle records are first-class architectural objects subject to the same canonical-storage discipline. The Shape A → Shape B migration restores the "engine-only write surface" commitment to its full intended scope.

The session evidence: during the storylet-pool-authoring run, I direct-Wrote 16 files (15 SLT YAMLs + 1 SLB manifest). Each Write succeeded but bypassed the engine's pre-apply validation gates (Rule-1 schema completeness, Rule-7 mystery firewall, Rule-4 branch-contamination, Rule-5 consequence-capacity), which the skill's Phase 4 gates implement as prose-side checks. Engine routing would make these gates structurally enforced rather than skill-discipline-dependent.

## Assumption Reassessment (2026-05-03)

1. **Patch engine is concentrated under `tools/patch-engine/`** — verified by inspecting the directory: `src/apply.ts`, `src/approval/`, `src/commit/`, `src/envelope/`, `src/ops/`. The ops directory holds the typed record-op vocabulary (`create_cf_record`, `update_record_field`, `append_extension`, etc. per CLAUDE.md §Skill Architecture §Mutations).
2. **Hook 3 is `tools/hooks/src/hook3-guard-direct-edit.ts`** — verified by listing the hooks directory. Its current match pattern targets `worlds/<slug>/_source/...`. Extending it to also match `worlds/<slug>/stories/<slug>/_source/...` is a string-match-rule change.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Canonical Storage Layer §Write discipline + FOUNDATIONS §Machine-Facing Layer §3 (Patch Engine) commit to engine-only `_source/` writes. Per `docs/FOUNDATIONS.md` §Story Bundles, this commitment extends to story-bundle records once the engine ops + hook coverage land.
4. **Cross-skill shared boundary under audit** — the boundary is the patch-engine op vocabulary in `tools/patch-engine/src/ops/`. Before this ticket the vocabulary covered world-canon ops (CF/CH/INV/M/OQ/ENT/SEC + hybrid CHAR/DA/PA appends). This ticket adds story-bundle record-class ops (per the closed enumeration from MCPENH-025 §Architecture Check item 3). Each new op needs a typed input schema, an apply implementation, and pre-apply validator coverage. No Hook 5 source change was needed because story create validation is covered by the validator package before commit.
5. **CF Record schema unchanged** — story-bundle records have their own per-class schemas; CF Record schema in FOUNDATIONS unchanged.
6. **No Mystery Reserve firewall weakening** — engine routing STRENGTHENS the Mystery Reserve firewall by making Phase 4 gate 1 (`forbidden`-status M-resolution rejection) structurally enforced as a pre-apply validator gate, not just a prose-side gate. Story-pipeline skills today rely on Phase 4 gate 1 running cleanly; engine routing makes it impossible to bypass. This is a strengthening, not a weakening.
7. **HARD-GATE semantics preserved** — the five story-pipeline skills' HARD-GATE workflows are unchanged: HARD-GATE fires at user-approval time (after the skill's Phase 4 + 5 validation passes); engine routing happens at commit time. The HARD-GATE gates the skill workflow; the patch engine gates the actual write. They are sequential, not redundant.
8. **Record-schema validators per class are required** — each engine-routed story-bundle `_source` record class (STENT, SF, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, plus story-local DA) needs a record-schema validator so the pre-apply gate can reject malformed records. `archive/tickets/VALENH-001.md` covers SLT predicate-DSL parsability; this ticket adds JSON Schemas for the engine-routed story `_source` classes to the existing `record_schema_compliance` validator. Markdown-backed story surfaces (SLB, SAU, SP, RSP) remain direct and are not part of the engine-routed schema set.
9. **Adjacent contradictions** — story-bundle INDEX.md writes (per-bundle index updates) are NOT atomic-YAML record writes; they are markdown-file writes. They should remain Shape A (direct Edit). Hook 3's extension must scope to `worlds/<slug>/stories/<slug>/_source/<class>/*.yaml` only — NOT to `worlds/<slug>/stories/<slug>/INDEX.md`, `STORY_KERNEL.md`, `pages-prose/*.md`, `audits/*.md`, `storylet-batches/*.md`, `story-promotions/*.md`, `audits/SAU-NNNN/remediation-storylet-proposals/*.md`. The hook3 match-pattern extension is precise: only the `_source/<class>/*.yaml` sub-tree.
10. **Hybrid records under stories/<slug>/diegetic-artifacts/** — story-local DA records (when introduced via page-cycle's Phase 4) are hybrid YAML-frontmatter + markdown body files, parallel to world-level diegetic-artifacts. Engine routing for them is via an `append_story_diegetic_artifact_record` op parallel to the world-level `append_diegetic_artifact_record`. This is in scope.
11. **Live package command surface corrected before implementation** — this checkout has package-local `npm run build` / `npm test` scripts under `tools/patch-engine`, `tools/hooks`, and `tools/validators`; there is no repo-root `package.json`, `pnpm-workspace.yaml`, or `pnpm turbo` lane. Verification must use package-local npm commands.
12. **Shape B write boundary narrowed to atomic story-source YAML** — `docs/FOUNDATIONS.md` and `docs/HARD-GATE-DISCIPLINE.md` preserve direct writes for bundle markdown surfaces. This ticket owns engine routing for `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml` records, including story-local DA YAML under `_source/artifacts/`. It does not engine-route `INDEX.md`, `STORY_KERNEL.md`, `pages-prose/`, `audits/*.md`, `storylet-batches/*.md`, `story-promotions/*.md`, or remediation proposal cards.
13. **Existing validator framework shape corrected before implementation** — record-schema validation is centralized in `tools/validators/src/structural/record-schema-compliance.ts` using JSON Schemas under `tools/validators/src/schemas/` and the record-type map in `tools/validators/src/structural/utils.ts`. This ticket adds story-bundle schemas to that existing structural validator rather than creating a separate per-class validator runner.

## Architecture Check

1. **Engine ops per record class is the cleanest extension** — the existing op vocabulary follows `create_<class>_record`, `update_record_field`, `append_extension`, etc. Adding `create_slt_record`, `create_obl_record`, etc. follows the same pattern. The op count grows with record classes but each op is small and isolated.
2. **Hook 3 pattern extension is precise and scoped** — match pattern adds `worlds/<slug>/stories/<slug>/_source/<class>/*.yaml` (with `<class>` enumerated to match indexed types). Markdown files under the bundle (INDEX.md, pages-prose/, audits/, storylet-batches/, story-promotions/) remain Shape A.
3. **No backwards-compatibility shims** — once engine routing lands, all five story-pipeline skills migrate atomically. There is no compatibility-mode where some skills route and others direct-Write; mixed-mode would produce inconsistent enforcement and is rejected by the Architectural Contract item 1 in `tickets/README.md`.
4. **Validator-first ordering** — `archive/tickets/VALENH-001.md` (predicate DSL) exists before engine routing lands, and per-class record-schema validators MUST also exist before Shape B routing is enabled. The engine's pre-apply gate calls validators; if validators don't exist, the gate is a no-op and routing provides no enforcement benefit. This ticket explicitly depends on the archived VALENH-001 prerequisite and includes per-class validators inline (or splits them into separate tickets if effort grows).
5. **Skill migration is atomic per skill** — when this ticket lands, each story-pipeline skill updates its relevant write phase from direct `Write` to `submit_patch_plan` for story `_source/*.yaml`. Skill prose updates (Guardrails, integration posture, etc.) come with the migration. Markdown-only story outputs remain direct writes.

## Reviewed Verification Layers

1. Patch-engine op tests prove `create_slt_record` writes SLT YAML under `stories/<story>/_source/storylets/` and `append_story_diegetic_artifact_record` writes story-local DA YAML under `stories/<story>/_source/artifacts/`.
2. Patch-engine op tests prove missing story-scoped ID allocations are rejected.
3. Validator integration tests prove `create_slt_record` triggers VALENH-001's predicate DSL validator in pre-apply mode.
4. Validator integration tests prove story-bundle schemas are enforced through `record_schema_compliance`.
5. Hook tests prove direct writes to story-bundle `_source/*.yaml` are blocked by Hook 3.
6. Hook tests prove direct writes/edits to story markdown surfaces such as `INDEX.md`, `storylet-batches/*.md`, and audit markdown remain allowed.
7. Story-pipeline skill prose was reviewed and updated so `_source/*.yaml` writes route through story-bundle patch-engine ops while story markdown stays direct.
8. FOUNDATIONS and HARD-GATE-DISCIPLINE were reviewed and updated to state the post-PEENH Shape B write discipline.

## Landed Changes

### 1. Added patch-engine ops for story-bundle `_source` record classes

`tools/patch-engine/src/ops/create-story-record.ts` centralizes the story-bundle staging implementation:

- `create_stent_record`, `create_sf_record`, `create_se_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_stloc_record`, `create_stobj_record`, `create_br_record`, `create_pg_record`, `create_chc_record`, `create_slt_record`.
- `append_story_diegetic_artifact_record` — for in-story DA records.
- Storylet batch manifests remain Shape A markdown writes under `storylet-batches/`; they are not atomic `_source/*.yaml` records and are not engine-routed by this ticket.

### 2. Extend Hook 3's match pattern

`tools/hooks/src/hook3-guard-direct-edit.ts` — extend the pattern to additionally match `worlds/<slug>/stories/<slug>/_source/<class>/*.yaml`. Markdown files (INDEX.md, STORY_KERNEL.md, pages-prose/*.md, audits/*.md, storylet-batches/*.md, story-promotions/*.md) remain unmatched (Shape A continues).

### 3. Added per-class record-schema validators

`tools/validators/src/schemas/story-*.schema.json` files schema-check engine-routed story `_source` records through the existing structural `record_schema_compliance` validator. The mapping lives in `tools/validators/src/structural/utils.ts`.

### 4. Wired validators into the pre-apply surface

`tools/validators/src/_helpers/index-access.ts` overlays story create ops into the pre-apply read surface, and `rule_storylet_predicate_dsl_parsability` applies to `create_slt_record` patch plans.

### 5. Post-apply validation

No Hook 5 source change was needed. The patch engine already runs `world-index sync` after commit; story record validation is covered pre-apply through the validator package.

### 6. Migrated the story-pipeline skills

Each skill's Phase 7 (or equivalent write phase) replaces direct `Write` calls for story-bundle `_source/<class>/*.yaml` records with `submit_patch_plan` invocations. Bundle markdown writes remain direct Edit/Write under the existing markdown-surface carve-out:

- `branching-story-bootstrap/SKILL.md` — Phase 11 transaction restructures; integration-posture prose updates from Shape A to Shape B; the "Direct Write is correct" guardrail is removed.
- `branching-story-page-cycle/SKILL.md` — Phase 11 same.
- `storylet-pool-authoring/SKILL.md` — Phase 7 same.
- `branching-story-health-audit/SKILL.md` — write phase same.
- `story-fact-promotion-to-canon/SKILL.md` — story-bundle write phase same; world-canon-side handoff to `canon-addition` is unchanged (already engine-routed).

### 7. Documentation

- Updated `docs/FOUNDATIONS.md` §Story Bundles §Write discipline to state Shape B engine routing for story-bundle `_source` YAML and direct-write carve-outs for story markdown.
- Updated `docs/HARD-GATE-DISCIPLINE.md` to include story-bundle `_source` YAML in the engine-routed write discipline.
- Updated story-pipeline skill write phases and guardrails to reflect Shape B routing.

## Files to Touch

Implemented file set:

- `tools/patch-engine/src/envelope/schema.ts`
- `tools/patch-engine/src/ops/create-story-record.ts`
- `tools/patch-engine/src/commit/order.ts`
- `tools/patch-engine/src/commit/temp-file.ts`
- `tools/patch-engine/src/apply.ts`
- `tools/patch-engine/tests/ops/create-story-record.test.ts`
- `tools/patch-engine/README.md`
- `tools/hooks/src/hook3-guard-direct-edit.ts`
- `tools/hooks/tests/hook3-guard-direct-edit.test.ts`
- `tools/hooks/README.md`
- `tools/validators/src/schemas/story-*.schema.json`
- `tools/validators/src/structural/utils.ts`
- `tools/validators/src/_helpers/index-access.ts`
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`
- `tools/validators/tests/integration/validate-patch-plan.test.ts`
- `tools/validators/README.md`
- `tools/world-mcp/src/tools/describe-envelope-schema.ts`
- `tools/world-mcp/tests/server/dispatch.test.ts`
- `tools/world-mcp/README.md`
- `.claude/skills/branching-story-bootstrap/SKILL.md`
- `.claude/skills/branching-story-page-cycle/SKILL.md`
- `.claude/skills/storylet-pool-authoring/SKILL.md`
- `.claude/skills/branching-story-health-audit/SKILL.md`
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md`
- `docs/FOUNDATIONS.md`
- `docs/HARD-GATE-DISCIPLINE.md`

## Out of Scope

- Tooling for cross-bundle patches (a single patch plan touching multiple bundles in the same world) — out of scope by design; one bundle per plan preserves the per-bundle-isolation invariant.
- Tooling for cross-world patches — explicitly out of scope per FOUNDATIONS §Multi-world directory discipline.
- `archive/tickets/VALENH-001.md`'s predicate DSL parsability rule (separate completed ticket; this ticket depends on it).
- Story-bundle context layer in `get_context_packet` (covered by `archive/tickets/MCPENH-027.md`).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test` from `tools/patch-engine`, `tools/hooks`, and `tools/validators` all pass.
2. `npm test` from `tools/world-mcp` passes because `describe_envelope_schema` exposes the expanded operation vocabulary.
3. Patch-engine tests prove `create_slt_record` writes storylet YAML under `stories/<story>/_source/storylets/` and `append_story_diegetic_artifact_record` writes story-local DA YAML under `stories/<story>/_source/artifacts/`.
4. Hook tests prove direct writes to story-bundle `_source/*.yaml` are blocked while `INDEX.md`, `storylet-batches/*.md`, and audit markdown remain allowed.
5. Validator integration tests prove `create_slt_record` triggers predicate-DSL parsability pre-apply and that story-bundle schemas are enforced through `record_schema_compliance`.

### Invariants

1. World-canon writes (CF/CH/INV/M/OQ/ENT/SEC + hybrid CHAR/DA/PA appends) continue to work identically pre- and post-migration.
2. Story-bundle markdown writes (INDEX.md, STORY_KERNEL.md, pages-prose/, audits/, storylet-batches/, story-promotions/) continue to work as Shape A direct Edit/Write.
3. Story-bundle atomic-YAML writes ALL route through `submit_patch_plan` post-migration; Hook 3 enforces the no-direct-write rule.
4. Skill HARD-GATE workflows are preserved; engine routing happens after HARD-GATE approval, not as a replacement for it.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-story-record.test.ts` — asserts story source YAML creation, story-local DA creation, and expected allocation enforcement.
2. `tools/hooks/tests/hook3-guard-direct-edit.test.ts` — asserts story-bundle `_source` blocking and markdown carve-outs.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — asserts storylet predicate DSL and record-schema compliance run for story create ops.
4. `tools/world-mcp/tests/server/dispatch.test.ts` — asserts MCP capability metadata exposes the live patch-engine operation enum.

### Commands

1. `npm test` from `tools/patch-engine`.
2. `npm test` from `tools/hooks`.
3. `npm test` from `tools/validators`.
4. `npm test` from `tools/world-mcp`.

## Verification Result

Passed on 2026-05-03:

- `npm test` in `tools/patch-engine` — 58 tests passed.
- `npm test` in `tools/hooks` — 18 tests passed.
- `npm test` in `tools/validators` — 94 tests passed.
- `npm test` in `tools/world-mcp` — 316 tests passed; rerun required escalated permissions because the package's CLI/server tests spawn child `node` processes and the sandbox returned `spawnSync node EPERM`.

## Deviations

- The ticket's intake text mentioned possible story-bundle `update_record_field`, `supersede_pg_record`, and `supersede_br_record` variants. The landed scope is create-only story `_source` ops plus `append_story_diegetic_artifact_record`; supersession/update behavior remains a future semantic operation if a concrete skill needs it.
- Hook 5 did not need a source change. Pre-apply validator coverage was the truthful enforcement point for story create ops.
- Story-bundle markdown surfaces remain direct writes by design: `INDEX.md`, `STORY_KERNEL.md`, `pages-prose/`, `audits/`, `storylet-batches/`, `story-promotions/`, and remediation proposal cards.
- Post-ticket review created `tickets/PEENH-002.md` for stale read-discipline wording in story skills that still cites the old Hook 3 match-pattern gap. That follow-up does not block this ticket's write-discipline migration.
