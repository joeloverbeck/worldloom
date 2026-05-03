# PEENH-001: Patch-engine ops + Hook 3 namespace extension for story-bundle records (Shape A → Shape B migration)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — adds patch-engine ops for every story-bundle record class; extends Hook 3's match pattern to cover `worlds/<slug>/stories/<slug>/_source/`; adds record-schema validators for each story-bundle class; migrates the five story-pipeline skills' write disciplines from Shape A (direct Write) to Shape B (engine-routed via `submit_patch_plan`).
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md`, `archive/tickets/VALENH-001.md` (predicate-DSL parsability validator; record-schema validators per class remain owned here)

## Problem

The five story-pipeline skills currently write story-bundle records via direct `Write` rather than through the patch engine:

- `branching-story-bootstrap` writes the entire bundle's initial state via direct Write per its Phase 11 transaction.
- `branching-story-page-cycle` writes the next-page bundle (PG / SE / SF / OBL / CNSQ / THR / SREL / STINT / CHC plus JIT SLT and story-local STLOC / STOBJ / DA) via direct Write per its Phase 11 transaction.
- `storylet-pool-authoring` writes SLT records and the SLB manifest via direct Write per its Phase 7 transaction (15 SLT YAMLs + 1 SLB manifest written this session).
- `branching-story-health-audit` writes SAU audit reports + RSP cards via direct Write.
- `story-fact-promotion-to-canon` writes SP promotion ledgers + superseding story-local source records via direct Write (its world-canon mutation routes through `canon-addition` and the patch engine, but the story-bundle side is direct Write).

Each skill's SKILL.md explicitly notes: *"Direct `Write` is the correct mutation surface for story-bundle records under the Shape A integration posture. Hook 3's match pattern is `worlds/<slug>/_source/...` which does NOT match `worlds/<slug>/stories/<slug>/_source/...`. SLT/SLB records are not world canon and no engine ops exist for them. A future maintainer who 'upgrades' the skill to engine routing must FIRST land patch-engine ops + Hook 3 namespace extension + record-schema validators for the SLT/SLB classes."*

This ticket is that future maintainer's instruction.

The motivation is alignment with FOUNDATIONS §Canonical Storage Layer's discipline: *"Write discipline: `worlds/<slug>/_source/` is an engine-only write surface. Direct `Edit`/`Write` on any `_source/*.yaml` file is blocked by Hook 3; mutations route through `mcp__worldloom__submit_patch_plan` with typed record-ops."* Per `docs/FOUNDATIONS.md` §Story Bundles, story-bundle records are first-class architectural objects subject to the same canonical-storage discipline. The Shape A → Shape B migration restores the "engine-only write surface" commitment to its full intended scope.

The session evidence: during the storylet-pool-authoring run, I direct-Wrote 16 files (15 SLT YAMLs + 1 SLB manifest). Each Write succeeded but bypassed the engine's pre-apply validation gates (Rule-1 schema completeness, Rule-7 mystery firewall, Rule-4 branch-contamination, Rule-5 consequence-capacity), which the skill's Phase 4 gates implement as prose-side checks. Engine routing would make these gates structurally enforced rather than skill-discipline-dependent.

## Assumption Reassessment (2026-05-03)

1. **Patch engine is concentrated under `tools/patch-engine/`** — verified by inspecting the directory: `src/apply.ts`, `src/approval/`, `src/commit/`, `src/envelope/`, `src/ops/`. The ops directory holds the typed record-op vocabulary (`create_cf_record`, `update_record_field`, `append_extension`, etc. per CLAUDE.md §Skill Architecture §Mutations).
2. **Hook 3 is `tools/hooks/src/hook3-guard-direct-edit.ts`** — verified by listing the hooks directory. Its current match pattern targets `worlds/<slug>/_source/...`. Extending it to also match `worlds/<slug>/stories/<slug>/_source/...` is a string-match-rule change.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Canonical Storage Layer §Write discipline + FOUNDATIONS §Machine-Facing Layer §3 (Patch Engine) commit to engine-only `_source/` writes. Per `docs/FOUNDATIONS.md` §Story Bundles, this commitment extends to story-bundle records once the engine ops + hook coverage land.
4. **Cross-skill shared boundary under audit** — the boundary is the patch-engine op vocabulary in `tools/patch-engine/src/ops/`. Currently the vocabulary covers world-canon ops (CF/CH/INV/M/OQ/ENT/SEC + hybrid CHAR/DA/PA appends). This ticket adds story-bundle record-class ops (per the closed enumeration from MCPENH-025 §Architecture Check item 3). Each new op needs (a) a typed input schema, (b) an apply implementation, (c) a pre-apply validator, (d) a post-apply Hook 5 hook entry.
5. **CF Record schema unchanged** — story-bundle records have their own per-class schemas; CF Record schema in FOUNDATIONS unchanged.
6. **No Mystery Reserve firewall weakening** — engine routing STRENGTHENS the Mystery Reserve firewall by making Phase 4 gate 1 (`forbidden`-status M-resolution rejection) structurally enforced as a pre-apply validator gate, not just a prose-side gate. Story-pipeline skills today rely on Phase 4 gate 1 running cleanly; engine routing makes it impossible to bypass. This is a strengthening, not a weakening.
7. **HARD-GATE semantics preserved** — the five story-pipeline skills' HARD-GATE workflows are unchanged: HARD-GATE fires at user-approval time (after the skill's Phase 4 + 5 validation passes); engine routing happens at commit time. The HARD-GATE gates the skill workflow; the patch engine gates the actual write. They are sequential, not redundant.
8. **Record-schema validators per class are required** — each story-bundle record class (STENT, SF, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, SLB, SAU, SP, RSP, plus story-local DA) needs a record-schema validator (in `tools/validators/src/schemas/` or `tools/validators/src/structural/` per current framework structure) so the engine's pre-apply gate can reject malformed records. `archive/tickets/VALENH-001.md` covers SLT predicate-DSL parsability; the record-schema validators are a separate concern. This ticket includes them; if their cumulative effort grows beyond Large, they can be split into per-class validator tickets (VALENH-002 through VALENH-N).
9. **Adjacent contradictions** — story-bundle INDEX.md writes (per-bundle index updates) are NOT atomic-YAML record writes; they are markdown-file writes. They should remain Shape A (direct Edit). Hook 3's extension must scope to `worlds/<slug>/stories/<slug>/_source/<class>/*.yaml` only — NOT to `worlds/<slug>/stories/<slug>/INDEX.md`, `STORY_KERNEL.md`, `pages-prose/*.md`, `audits/*.md`, `storylet-batches/*.md`, `story-promotions/*.md`, `audits/SAU-NNNN/remediation-storylet-proposals/*.md`. The hook3 match-pattern extension is precise: only the `_source/<class>/*.yaml` sub-tree.
10. **Hybrid records under stories/<slug>/diegetic-artifacts/** — story-local DA records (when introduced via page-cycle's Phase 4) are hybrid YAML-frontmatter + markdown body files, parallel to world-level diegetic-artifacts. Engine routing for them is via an `append_story_diegetic_artifact_record` op parallel to the world-level `append_diegetic_artifact_record`. This is in scope.

## Architecture Check

1. **Engine ops per record class is the cleanest extension** — the existing op vocabulary follows `create_<class>_record`, `update_record_field`, `append_extension`, etc. Adding `create_slt_record`, `create_obl_record`, etc. follows the same pattern. The op count grows with record classes but each op is small and isolated.
2. **Hook 3 pattern extension is precise and scoped** — match pattern adds `worlds/<slug>/stories/<slug>/_source/<class>/*.yaml` (with `<class>` enumerated to match indexed types). Markdown files under the bundle (INDEX.md, pages-prose/, audits/, storylet-batches/, story-promotions/) remain Shape A.
3. **No backwards-compatibility shims** — once engine routing lands, all five story-pipeline skills migrate atomically. There is no compatibility-mode where some skills route and others direct-Write; mixed-mode would produce inconsistent enforcement and is rejected by the Architectural Contract item 1 in `tickets/README.md`.
4. **Validator-first ordering** — `archive/tickets/VALENH-001.md` (predicate DSL) exists before engine routing lands, and per-class record-schema validators MUST also exist before Shape B routing is enabled. The engine's pre-apply gate calls validators; if validators don't exist, the gate is a no-op and routing provides no enforcement benefit. This ticket explicitly depends on the archived VALENH-001 prerequisite and includes per-class validators inline (or splits them into separate tickets if effort grows).
5. **Skill migration is atomic per skill** — when this ticket lands, each of the five story-pipeline skills updates its Phase 7 (or equivalent) write step from `Write` to `submit_patch_plan`. Skill prose updates (Guardrails, integration posture, etc.) come with the migration. The migration order respects the skill graph: bootstrap → page-cycle → storylet-pool-authoring → health-audit → promotion-to-canon (each later skill consumes the earlier ones' outputs).

## Verification Layers

1. Patch-engine `submit_patch_plan` accepts a plan with `create_slt_record` op and writes the SLT YAML correctly → schema validation: post-apply, the file at `worlds/<slug>/stories/<slug>/_source/storylets/SLT-NNNN.yaml` exists with the planned content.
2. `submit_patch_plan` rejects a plan whose `create_slt_record` op carries a malformed predicate → schema validation: the pre-apply gate calls VALENH-001's rule and returns the validator's HARD-REJECT report.
3. Direct `Write` to `worlds/<slug>/stories/<slug>/_source/storylets/SLT-NNNN.yaml` is blocked by Hook 3 → manual review: attempt the direct Write and confirm Hook 3 fires.
4. Direct `Edit` to `worlds/<slug>/stories/<slug>/INDEX.md` continues to work (markdown surface, not engine-only) → manual review.
5. Direct `Write` to `worlds/<slug>/stories/<slug>/storylet-batches/SLB-NNNN.md` continues to work (markdown surface) → manual review.
6. Storylet-pool-authoring's Phase 7 transaction routes through `submit_patch_plan` with N create_slt_record ops + 1 create_slb_record op (or markdown-file Edit for the SLB manifest, depending on how the manifest is classified) + 1 INDEX.md Edit op → skill dry-run: invoke the skill against a fixture bundle and inspect the patch-plan envelope.
7. Branching-story-bootstrap's Phase 11 transaction routes a single multi-op patch plan creating the entire bundle's atomic-YAML records → skill dry-run.
8. Branching-story-page-cycle's Phase 11 transaction routes a multi-op plan covering per-turn record creates + supersession updates → skill dry-run.
9. Hook 5 post-apply validation runs the per-class record-schema validators + VALENH-001 + future story-bundle Rule-4/5/7 validators → schema validation.
10. FOUNDATIONS §Canonical Storage Layer §Write discipline alignment: every story-bundle `_source/<class>/*.yaml` write routes through the engine post-implementation → FOUNDATIONS alignment check.

## What to Change

### 1. Add patch-engine ops for every story-bundle record class

`tools/patch-engine/src/ops/<class>.ts` files, one per class:

- `create_stent_record`, `create_sf_record`, `create_se_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_stloc_record`, `create_stobj_record`, `create_br_record`, `create_pg_record`, `create_chc_record`, `create_slt_record`.
- `update_record_field` (story-bundle variant) — generic field update on any story-bundle record.
- `supersede_pg_record`, `supersede_br_record` — for branch-cycle continuation supersession patterns.
- `append_story_diegetic_artifact_record` — for in-story DA records.
- `append_storylet_batch_manifest` — markdown manifest write through the engine (or remain Shape A — implementation choice; if Shape A, document that storylet-batches/ remains direct-Write per the bundle-specific markdown-surface carve-out).

### 2. Extend Hook 3's match pattern

`tools/hooks/src/hook3-guard-direct-edit.ts` — extend the pattern to additionally match `worlds/<slug>/stories/<slug>/_source/<class>/*.yaml`. Markdown files (INDEX.md, STORY_KERNEL.md, pages-prose/*.md, audits/*.md, storylet-batches/*.md, story-promotions/*.md) remain unmatched (Shape A continues).

### 3. Add per-class record-schema validators

`tools/validators/src/schemas/story-<class>.ts` files, one per class. Each validator schema-checks an atomic-YAML record against its class definition (per `branching-story-bootstrap/templates/story-records.yaml` for the canonical schemas plus `storylet-pool-authoring/templates/storylet-record.yaml` for SLT). Required-field completeness, type correctness, enum-value membership.

### 4. Wire validators into the patch-engine pre-apply gate

`tools/patch-engine/src/apply.ts` — extend the pre-apply validation step to call the per-class schema validator for each story-bundle op AND VALENH-001's predicate-DSL validator for SLT ops AND any future story-scope Rule-4/5/7 validators.

### 5. Wire validators into Hook 5 post-apply

`tools/hooks/src/hook5-validate-after-patch.ts` — extend to run the per-class validators on story-bundle writes that landed through the engine.

### 6. Migrate the five story-pipeline skills

Each skill's Phase 7 (or equivalent write phase) replaces direct `Write` calls with `submit_patch_plan` invocations:

- `branching-story-bootstrap/SKILL.md` — Phase 11 transaction restructures; integration-posture prose updates from Shape A to Shape B; the "Direct Write is correct" guardrail is removed.
- `branching-story-page-cycle/SKILL.md` — Phase 11 same.
- `storylet-pool-authoring/SKILL.md` — Phase 7 same.
- `branching-story-health-audit/SKILL.md` — write phase same.
- `story-fact-promotion-to-canon/SKILL.md` — story-bundle write phase same; world-canon-side handoff to `canon-addition` is unchanged (already engine-routed).

### 7. Documentation

- Update `docs/FOUNDATIONS.md` §Story Bundles §Write discipline sub-section: "currently Shape B (engine-routed via `mcp__worldloom__submit_patch_plan` with story-bundle record-ops); previously Shape A (direct `Write`) per the deferred-integration ticket PEENH-001 (now landed)."
- Update `docs/HARD-GATE-DISCIPLINE.md` if it makes claims about story-bundle writes that pre-date this ticket.
- Update each story-pipeline skill's Guardrails block to reflect Shape B routing.

## Files to Touch

- `tools/patch-engine/src/ops/<class>.ts` × ~14 (new)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/src/envelope/` (modify — add story-bundle op envelopes)
- `tools/hooks/src/hook3-guard-direct-edit.ts` (modify — pattern extension)
- `tools/hooks/src/hook5-validate-after-patch.ts` (modify — story-bundle validator wiring)
- `tools/validators/src/schemas/story-<class>.ts` × ~14 (new)
- `tools/validators/src/structural/` (modify — story-bundle structural rules if any)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Shape B migration)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — Shape B migration)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — Shape B migration)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Shape B migration)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — Shape B migration)
- `docs/FOUNDATIONS.md` (modify — Story Bundles §Write discipline post-migration)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — Shape A → Shape B reference)
- `tools/patch-engine/tests/` (new test files per op)
- `tools/hooks/tests/` (new test files per hook update)
- `tools/validators/tests/schemas/story-<class>.test.ts` × ~14 (new)

## Out of Scope

- Tooling for cross-bundle patches (a single patch plan touching multiple bundles in the same world) — out of scope by design; one bundle per plan preserves the per-bundle-isolation invariant.
- Tooling for cross-world patches — explicitly out of scope per FOUNDATIONS §Multi-world directory discipline.
- `archive/tickets/VALENH-001.md`'s predicate DSL parsability rule (separate completed ticket; this ticket depends on it).
- Story-bundle context layer in `get_context_packet` (covered by `archive/tickets/MCPENH-027.md`).

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter patch-engine test`, `pnpm --filter hooks test`, `pnpm --filter validators test` all pass.
2. `submit_patch_plan` with a `create_slt_record` op writes the SLT YAML and updates `world.db` accordingly.
3. Direct `Write` to `worlds/erotica-world/stories/marla-kern-seduction/_source/storylets/SLT-NNNN.yaml` is blocked by Hook 3 with a clear error message.
4. Direct `Edit` to `worlds/erotica-world/stories/marla-kern-seduction/INDEX.md` continues to work.
5. Re-running storylet-pool-authoring against a fixture bundle produces identical record content via `submit_patch_plan` as the pre-migration direct-Write produced.
6. Re-running branching-story-bootstrap against a fixture premise produces an identical bundle via engine routing as the pre-migration direct-Write produced.
7. Re-running branching-story-page-cycle for one tick produces an identical PG bundle via engine routing.
8. A patch plan with a malformed SLT predicate is rejected by the pre-apply gate citing VALENH-001's report.

### Invariants

1. World-canon writes (CF/CH/INV/M/OQ/ENT/SEC + hybrid CHAR/DA/PA appends) continue to work identically pre- and post-migration.
2. Story-bundle markdown writes (INDEX.md, STORY_KERNEL.md, pages-prose/, audits/, storylet-batches/, story-promotions/) continue to work as Shape A direct Edit/Write.
3. Story-bundle atomic-YAML writes ALL route through `submit_patch_plan` post-migration; Hook 3 enforces the no-direct-write rule.
4. Skill HARD-GATE workflows are preserved; engine routing happens after HARD-GATE approval, not as a replacement for it.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-slt.test.ts` and similar for each new op — assert the op writes correct YAML and updates the index.
2. `tools/patch-engine/tests/apply/story-bundle-pre-apply-gate.test.ts` — assert the gate calls per-class schema validators + VALENH-001 + future Rule-4/5/7 validators.
3. `tools/hooks/tests/hook3-guard-direct-edit.story-bundle.test.ts` — assert direct Write to `_source/<class>/*.yaml` is blocked; direct Edit to INDEX.md / STORY_KERNEL.md is allowed.
4. `tools/hooks/tests/hook5-validate-after-patch.story-bundle.test.ts` — assert post-apply validation runs the right validator set for story-bundle writes.
5. `tools/validators/tests/schemas/story-<class>.test.ts` × ~14 — per-class schema validator coverage.
6. Skill dry-run tests:
   - `tools/patch-engine/tests/integration/storylet-pool-authoring.test.ts` — invoke the skill against a fixture bundle; assert the resulting patch plan has the expected ops; apply and assert post-apply state matches the pre-migration direct-Write reference.
   - Same for branching-story-bootstrap, branching-story-page-cycle, branching-story-health-audit, story-fact-promotion-to-canon.

### Commands

1. `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` (full pipeline; this ticket's scope spans patch-engine, hooks, validators packages).
2. `cd tools/patch-engine && pnpm build && node dist/cli.js submit < fixture-storylet-pool-authoring-plan.json` (integration check after archived VALENH-001 + per-class validators land).
3. Try `Write` against a story-bundle YAML in the live `worlds/erotica-world/stories/marla-kern-seduction/_source/storylets/` and confirm Hook 3 fires.
