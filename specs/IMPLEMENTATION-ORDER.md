# Implementation Order — Structure-Aware Retrieval & Surgical Edits

This document records the implemented spec bundle (`SPEC-01` through `SPEC-17`) and its historical implementation sequence. It is distinct from the **read order** (in which a reviewer encounters the specs) and follows the phased rollout defined in `SPEC-08` as amended by archived `SPEC-13`, archived `SPEC-14`, and the archived post-pilot refinement specs.

## Design read order (for reviewers)

`SPEC-01` → `SPEC-10` → `SPEC-11` → `SPEC-02` → `SPEC-12` → `SPEC-13` → `SPEC-03` → `SPEC-04` → `SPEC-14` → `SPEC-05` → `SPEC-06` → `SPEC-07` → `SPEC-08` → `SPEC-09` → `SPEC-15` → `SPEC-16` → `SPEC-17`

This order builds conceptual understanding for the structure-aware retrieval bundle: foundation (index), then the entity-surface remediation that corrects the index's precision model, then the authority-surface remediation that makes canonical-entity completeness explicit and machine-readable, then the read surface (MCP), then the retrieval-reliability remediation that adds scoped references, structured cross-record locality, and packet-completeness discipline for downstream skills, then the **atomic-source migration** that moves canonical storage from monolithic markdown to per-record YAML (SPEC-13 — foundational for understanding how SPEC-03/04/05/06 now operate), then write surface (engine + validators, both reoriented to atomic records), then **PA contract & vocabulary reconciliation** (SPEC-14 — supersedes parts of archived SPEC-03 and SPEC-04 to align engine emission, validator parsing, and canonical vocabulary surfacing into a single contract), then enforcement (hooks, reoriented to `_source/` discipline), then consumption (skill rewrites against atomic records), then contract updates (docs), then sequencing (migration plan, amended by SPEC-13 and SPEC-14). SPEC-09 is read after the main retrieval bundle as an independent canon-safety expansion that depends on the bundle's validator framework and canon-addition rewrite but is not part of the retrieval bundle's architectural arc. SPEC-15, SPEC-16, and SPEC-17 are read last as the **post-pilot refinement track** surfaced by the 2026-04-26 first-live canon-addition run: SPEC-15 covers the immediately-actionable validator + documentation fixes (archived); SPEC-16 covers additive MCP retrieval-surface refinements (field-slice retrieval, schema discovery, auto-budget UX, exhaustive lexical scan; archived); SPEC-17 covers the contract-level audit-trail and retrieval-contract clarifications (deprecating the notes-paragraph convention; softening FOUNDATIONS §Tooling Recommendation prose to endorse the index + follow-up-retrieval pattern; archived at `archive/specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`). SPEC-17 §C2 depended on SPEC-16 §C3 + §C5 landing first.

## Implementation order (for builders)

### Phase 0 — Prep (Completed 2026-04-22)

1. Land this spec bundle in `specs/` (completed)
2. Create `tools/` directory tree scaffold (completed)
3. Update `.gitignore` (completed):
   - `worlds/*/_index/`
   - `worlds/*/_source/`
   - `tools/*/dist/`
   - `tools/*/node_modules/`
   - `tools/world-mcp/.secret`
   - `tools/hooks/logs/`
4. Create `.claude/settings.json.example` (completed)

**Completion gate**: Passed on 2026-04-22 via Phase 0 structural acceptance check:
- `specs/` bundle present, including `IMPLEMENTATION-ORDER.md` and `SPEC-08`
- `tools/` scaffold present with `world-index`, `world-mcp`, `patch-engine`, `validators`, and `hooks`
- `.claude/settings.json.example` present
- `.gitignore` contains all Phase 0 machine-layer ignore entries

### Phase 1 — Read Path + canon-addition Pilot

Parallelizable order (within each tier, items may proceed in parallel):

**Tier 1 (no dependencies)**:
- `SPEC-01` World Index — completed 2026-04-22; implementation landed at `tools/world-index/`, spec archived at `archive/specs/SPEC-01-world-index.md`
- `SPEC-07 Part A` docs updates — completed 2026-04-23; implementation landed at `docs/FOUNDATIONS.md`, `CLAUDE.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md`

**Tier 1.5 (depends on SPEC-01)**:
- `SPEC-10` Entity Surface Redesign — completed 2026-04-23; implementation landed via `archive/tickets/SPEC10ENTSUR-001.md`, `archive/tickets/SPEC10ENTSUR-007.md`, and `archive/tickets/SPEC10ENTSUR-008.md`; spec archived at `archive/specs/SPEC-10-entity-surface-redesign.md`

**Tier 1.75 (depends on Tier 1.5)**:
- `SPEC-11` Canonical Entity Authority Surfaces — completed 2026-04-23; implementation landed via `archive/tickets/SPEC11CANENT-001.md`, `archive/tickets/SPEC11CANENT-002.md`, `archive/tickets/SPEC11CANENT-003.md`, and `archive/tickets/SPEC11CANENT-004.md`; spec archived at `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md`

**Tier 2 (depends on Tier 1.5)**:
- `SPEC-02` MCP Retrieval Server — completed 2026-04-24; implementation landed at `tools/world-mcp/`, with `submit_patch_plan` intentionally stubbed per the Phase 1 contract; spec archived at `archive/specs/SPEC-02-retrieval-mcp-server.md`
- `SPEC-05 Part A` Hooks 1, 2, 4 (read-side + subagent) — completed 2026-04-24; implementation landed at `tools/hooks/` and `.claude/settings.json.example`; Hooks 3 and 5 remain Phase 2 work

**Tier 2.25 (depends on Tier 2)**:
- `SPEC-12` Skill-Reliable Retrieval — completed 2026-04-24; implementation landed via the archived `SPEC12SKIRELRET-*` ticket family plus live-corpus animalia proof, and the spec is archived at `archive/specs/SPEC-12-skill-reliable-retrieval.md`.

**Tier 3 (depends on Tier 2.25)**:
- ~~`SPEC-06 Part A` canon-addition read-side rewrite~~ — **SKIPPED**, folded into Phase 2. Rationale per SPEC-13: rewriting canon-addition's read-side against the monolithic ledger and then re-rewriting it against atomic records two phases later is wasteful. The Phase 1 pilot's token-reduction evidence has already landed via SPEC-12's live-corpus verification.

**Phase 1 completion gate**: substantially met via the landed tickets for SPEC-01 / SPEC-02 / SPEC-05 Part A / SPEC-07 Part A / SPEC-10 / SPEC-11 / SPEC-12. The SPEC-06 Part A pilot gate is retired per SPEC-13. Token-reduction measurement is retired entirely per 2026-04-26 scope narrowing on SPEC-06 — the project no longer treats runtime token measurement as a verification gate.

### Phase 1.5 — Atomic-Source Migration (SPEC-13)

**Supersedes** the previously-deferred SPEC-08 Phase 3 ("Atomic Source for CF/CH Records") and SPEC-08 Phase 4 ("High-Churn Prose Fragmentization") by pulling both forward into a single migration phase that precedes Phase 2 write-path work. Rationale: Phase 2's patch engine, validators, and skill rewrites should land against the final storage form, not against a monolithic ledger that will be retired weeks later. Landing atomic-source first eliminates rework.

**Status**: completed 2026-04-24; spec archived at `archive/specs/SPEC-13-atomic-source-migration.md`. The only remaining SPEC-13-family item is `tickets/SPEC13ATOSRCMIG-006.md`, a one-week delayed cleanup of the ignored `.pre-migration-snapshot/animalia/` restore copy. That ticket is a local safety cleanup exception, not a blocker for Phase 2.

**Scope**:
- Draft `SPEC-13` umbrella spec (done as part of the session that produced this amendment)
- Amendments to `SPEC-03`, `SPEC-04`, `SPEC-06`, `SPEC-07`, `SPEC-08` per SPEC-13 §C
- `docs/FOUNDATIONS.md` revision per SPEC-13 §D (§Mandatory World Files reclassification, new §Canonical Storage Layer, §Canon Fact Record Schema storage note)
- `CLAUDE.md` updates (repository layout, non-negotiables, ID allocation conventions)
- Manual migration of `worlds/animalia/` per SPEC-13 §E — authored by Claude in a follow-up session (no migration tool; single-world one-time transformation)
- SPEC-01 world-index parser refresh: read `_source/*.yaml` as primary input; retire markdown-record parsing for the 11 atomized files (WORLD_KERNEL.md and ONTOLOGY.md remain as prose inputs to the lexical layer)
- `.gitignore` update: reverse `worlds/*/_source/` entry (now tracked in git)

**Streams**:

- **Stream A — Spec drafting** (completed 2026-04-24):
  - SPEC-13
  - Sibling spec amendments (SPEC-03/04/06/07/08)
  - FOUNDATIONS.md revisions
  - CLAUDE.md updates
  - IMPLEMENTATION-ORDER.md re-sequencing (this file)

- **Stream B — Animalia migration execution** (completed 2026-04-24 in private-world commit `99f6a97`):
  - Pre-migration snapshot
  - File-class-by-file-class atomic record authoring per SPEC-13 §E steps 1–10
  - Monolithic file deletion (step 11) + `.gitignore` update (step 12)
  - `world-index build animalia` (step 13) + one-shot structural validation in lieu of the Phase 2 `world-validate` CLI (step 14)
  - Human review (step 15) + single migration commit (step 16)
  - Snapshot retention for one week, then cleanup (step 17) — tracked by `tickets/SPEC13ATOSRCMIG-006.md`

- **Stream C — SPEC-01 parser refresh** (completed 2026-04-24): atomic-source parser support landed first with legacy retained for the transition window, then legacy successful-build dispatch was removed after the Animalia migration commit.

**Phase 1.5 completion gate**:
- SPEC-13 and sibling amendments merged
- FOUNDATIONS.md, CLAUDE.md, IMPLEMENTATION-ORDER.md reflect atomic-source contract
- `worlds/animalia/_source/` fully populated
- `worlds/animalia/` monolithic files deleted (11 files)
- `world-index build animalia` succeeds against `_source/`
- `world-index verify animalia` is truthful for atomic-source worlds
- Legacy markdown successful-build dispatch removed from `tools/world-index`
- Hybrid-file artifacts (characters, diegetic artifacts, adjudications, proposals, audits) unchanged on disk
- Exception carried forward: `.pre-migration-snapshot/animalia/` remains until the one-week stability window in `tickets/SPEC13ATOSRCMIG-006.md` elapses

The original structural-validator gate was not used as the Phase 1.5 closeout proof because SPEC-04 validators had not shipped at that point. The current Phase 1.5 historical proof remains the world-index build/verify path plus direct source-shape checks; SPEC-04 validation is now a completed Phase 2 surface.

### Phase 2 — Write Path + All-Skill Migration

**Depends on**: Phase 1.5 complete (atomic-source migration landed on animalia; `_source/` is the only storage surface; legacy markdown retired).

**Scope** (content revised per SPEC-13 Tier 2 amendments):
- **SPEC-03** patch engine — completed 2026-04-25 and archived at `archive/specs/SPEC-03-patch-engine.md`: new atomic-record op vocabulary (7 retired markdown-anchor ops; 7 new `create_*` ops for CF/CH/INV/M/OQ/ENT/SEC; 3 repurposed ops `update_record_field` / `append_extension` / `append_touched_by_cf`; `append_adjudication_record` / `append_character_record` / `append_diegetic_artifact_record` / `append_modification_history_entry` retained). No compile step; simplified 3-tier write order (create-all → update-all → adjudication); anchor-hash machinery retained only for hybrid files (characters, diegetic artifacts). Production pre-apply validation is wired through SPEC-04's `validatePatchPlan` entry; SPEC-04's bootstrap audit disposition is completed via `archive/tickets/SPEC04VALFRA-008.md`.
- **SPEC-04** validator framework — completed 2026-04-25 and archived at `archive/specs/SPEC-04-validator-framework.md`: 2 retired (`attribution_comment`, `anchor_integrity`); 2 added (`record_schema_compliance`, `touched_by_cf_completeness`); input shifted from parsed-markdown to per-record YAML. Delivered `world-validate`, 13 mechanized validators, `validatePatchPlan`, and explicit Animalia bootstrap grandfathering via `archive/tickets/SPEC04VALFRA-008.md`.
- **SPEC-05 Part B** Hooks 3, 5 — completed 2026-04-26; implementation landed at `tools/hooks/src/hook3-guard-direct-edit.ts` and `tools/hooks/src/hook5-validate-after-patch.ts` with paired tests under `tools/hooks/tests/`. `.claude/settings.json.example` now wires all five hooks unconditionally. Hook 3 blocks direct `Edit`/`Write` on any `worlds/<slug>/_source/<subdir>/*.yaml` while explicitly allowing `WORLD_KERNEL.md`, `ONTOLOGY.md`, `_source/<subdir>/README.md`, and hybrid artifacts (characters, diegetic artifacts, adjudications, proposals, audits). Hook 5 runs `record_schema_compliance` + `id_uniqueness` + `cross_file_reference` + `touched_by_cf_completeness` via `world-validate --structural --json` and surfaces only `fail` verdicts whose `location.file` matches a path in the patch receipt.
- **SPEC-02-PHASE2** retrieval-MCP Phase 2 tooling update — completed 2026-04-25 and archived at `archive/specs/SPEC-02-phase2-tooling.md`: added `get_record(record_id)` and `find_sections_touched_by(cf_id)`; extended `allocate_next_id` to INV per-category / OQ / ENT / SEC per-file-class; dropped `get_compiled_view` per YAGNI reassessment. The `submit_patch_plan` rewire (removing the Phase 1 stub, importing from `@worldloom/patch-engine`) stays with SPEC-03 ticket 007 — conceptually a SPEC-02 surface touch, but mechanically owned by SPEC-03 since it consumes the engine package.
- **SPEC-06** all-skill migration — all 8 canon-mutating / canon-reading skills (`canon-addition`, `character-generation`, `diegetic-artifact-generation`, `continuity-audit`, `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`, `propose-new-characters`, `create-base-world`) rewritten against atomic source. SPEC-06 Part A / Part B distinction collapses since atomic-source landed in Phase 1.5. `create-base-world` updated to emit `_source/` directly for new worlds.
- **SPEC-07 Part B** — HARD-GATE-DISCIPLINE.md write-order rewrite (engine's new 3-tier ordering); CLAUDE.md phrasing refinement for Hook 3 / atomic-source non-negotiables.

**Parallelizable order**:

**Tier 1 (no new dependencies beyond Phase 1.5)**:
- `SPEC-04` validator framework — completed 2026-04-25; spec archived at `archive/specs/SPEC-04-validator-framework.md`; ticket family archived under `archive/tickets/SPEC04VALFRA-*.md`; delivered atomic-YAML validators, CLI, pre-apply entrypoint, and bootstrap audit disposition.
- `SPEC-07 Part B` docs updates

**Tier 2 (depends on Tier 1)**:
- `SPEC-03` patch engine — completed 2026-04-25; spec archived at `archive/specs/SPEC-03-patch-engine.md`; ticket family archived under `archive/tickets/SPEC03PATENG-*.md`. Production pre-apply validation is now wired through SPEC-04's `validatePatchPlan` entry; SPEC-04's bootstrap-audit disposition is completed via `archive/tickets/SPEC04VALFRA-008.md`.
- `SPEC-02-PHASE2` retrieval-MCP tooling update — completed 2026-04-25; spec archived at `archive/specs/SPEC-02-phase2-tooling.md`; ticket family archived under `archive/tickets/SPEC02PHA2TOO-*.md`. The `submit_patch_plan` stub removal itself remains under SPEC-03 ticket 007.

**Tier 3 (depends on Tier 2)**:
- `SPEC-05 Part B` Hooks 3, 5 — completed 2026-04-26; spec archived at `archive/specs/SPEC-05-hooks-discipline.md`; implementation at `tools/hooks/src/hook3-guard-direct-edit.ts` + `tools/hooks/src/hook5-validate-after-patch.ts`; 17 hook tests pass via `cd tools/hooks && npm test`.

**Tier 3.5 (depends on Tier 2; lands before Tier 4 SPEC-06 acceptance)**:
- `SPEC-14` PA Contract & Vocabulary Reconciliation — completed 2026-04-25 and archived at `archive/specs/SPEC-14-pa-contract-and-vocabulary-reconciliation.md`. Supersedes parts of archived SPEC-03 (`append_adjudication_record` payload shape; `append_touched_by_cf` semantics) and archived SPEC-04 (`record_schema_compliance` adjudication parsing; `rule7_mystery_reserve_preservation` enum; `rule2_no_pure_cosmetics` domain enum). Tier 2 tickets landed validator + engine + MCP changes; Tier 3 tickets executed the animalia bulk fix (decomposed in `docs/triage/2026-04-25-spec04-grandfathering-triage.md`). Collateral amendments: SPEC-06, SPEC-08, FOUNDATIONS.md, this file.

**Tier 4 (depends on Tier 3 + Tier 3.5)**:
- `SPEC-06` all-skill migration. Suggested sub-order (may parallelize within):
  1. `canon-addition` (proven pattern; migrate first as the fullest-surface pilot)
  2. `create-base-world` (update to emit `_source/` directly for new worlds)
  3. `character-generation` + `diegetic-artifact-generation` (similar pattern)
  4. `propose-new-canon-facts` + `canon-facts-from-diegetic-artifacts` (similar pattern)
  5. `propose-new-characters` (biggest; last once pattern is proven)
  6. `continuity-audit` (complex reasoning; done last on the main-orchestrator side)

**Phase 2 completion gate** (revised per SPEC-13 and SPEC-14):
- All 8 skills end-to-end via engine against `_source/` atomic records
- canon-addition large delivery: zero raw Edit; Hook 3 denies 100% of raw attempts on `_source/` surfaces
- **Per SPEC-14**: `world-validate animalia --json` reports **zero findings** (not "zero `fail` with `info` grandfathering as residual" — the 224-finding baseline has full fix paths via SPEC-14 Tier 3 tickets and the grandfathering file empties post-fix)
- ~~**≥80% token reduction** vs Phase 0 baseline (lifted from SPEC-08's ≥70% target — atomic-source retrieval enables the higher target; measured across 3 representative runs per skill)~~ — **retired** per 2026-04-26 scope narrowing on SPEC-06
- Atomicity injection tests pass (two-phase commit holds; no partial writes)
- Concurrency test passes (per-world write lock serializes same-world plans)
- Every `create_*` / `update_record_field` / `append_extension` / `append_touched_by_cf` op fixture-tested
- `touched_by_cf_completeness` validator passes on animalia post-Phase-2 state
- **Per SPEC-14**: every record emitted by a rewritten skill passes `record_schema_compliance` end-to-end (cross-package integration test asserts engine output matches validator schema)

### Phase 2.5 — Canon-Safety Expansion (independent track, SPEC-09)

Lands after Phase 2 completes. Independent of the structure-aware retrieval bundle's read-path / write-path sequencing; depends only on SPEC-04 (validator framework) and SPEC-06 (canon-addition rewrite) from the bundle.

Order (single tier; internal parallelization minimal):

1. **FOUNDATIONS.md edits** (Rules 11 & 12, two conditionally-mandatory CF schema blocks, six new relation types, Default Reality paragraph, genesis-world clause)
2. **canon-addition skill updates** (Tests 11 & 12, template extension, Phase 12 block-authoring)
3. **continuity-audit skill updates** (Silent-Area Canonization check)
4. **diegetic-artifact-generation template cleanup** (`statement_of_existence`, explicit `world_relation` block)
5. **SPEC-04 validator additions** (`validator-rule-11-action-space`, `validator-rule-12-redundancy`)
6. **docs/WORKFLOWS.md pointer** for the new tests

**Phase 2.5 completion gate**: `SPEC-09 Verification` checks 1–12 pass. Specifically:
- `world-validate animalia --json` reports zero new failures on historical CFs (grandfather clause holds structurally)
- Synthetic capability CF without `exception_governance` FAILS Test 12
- Synthetic geography CF with `exception_governance: { n_a: "..." }` PASSES
- Bare `n_a: "not applicable"` FAILS regex-and-taxonomy check
- `create-base-world` genesis test world emits CF-0001 with both blocks correctly populated or N/A'd per fact-type

### Phase 2.6 — Pilot Feedback Fixes (SPEC-15)

Independent post-pilot fix track, surfaced by the 2026-04-26 first-live canon-addition run (animalia PR-0015). Lands during or after Phase 2.5; not a blocker for any other phase.

**Scope** (full decomposition — two tickets cover the entire spec):
- **Track A**: validator coverage gap — `rule5_no_consequence_evasion` recognizes `append_extension` (implemented and archived at `archive/tickets/SPEC15PILFIX-001.md`).
- **Track B**: documentation + skill content — `pre_figured_by` semantics, `find_named_entities` scope, canon-addition retrieval-tool decision tree. Completed and archived at `archive/tickets/SPEC15PILFIX-002.md`.

**Out of SPEC-15**: engine-convention synchronization decisions (mod-history ↔ notes) and MCP retrieval-surface refinements (packet richness, slice tool, schema discovery, auto-budget UX, prose-body scan) are scoped to `brainstorming/post-pilot-retrieval-refinements.md`. Each requires a design call before ticketing; promotion to a separate spec (likely SPEC-16) when prioritized.

**Phase 2.6 completion gate** (completed; SPEC-15 archived):
- `cd tools/validators && npm test` passes after rule5 expansion
- `node tools/validators/dist/src/cli/world-validate.js animalia --json` reports unchanged fail count from repo root
- `docs/FOUNDATIONS.md`, `tools/world-mcp/README.md`, and `.claude/skills/canon-addition/references/` carry the new clarifications and decision tree
- A subsequent canon-addition run uses `append_extension` ops successfully (validator returns clean) and references the retrieval-tool decision tree at the appropriate phases
- SPEC-15 is archived at `archive/specs/SPEC-15-pilot-feedback-fixes.md`; SPEC15PILFIX-001 and SPEC15PILFIX-002 are both archived

### Phase 2.7 — Post-Pilot Retrieval Refinements (SPEC-16, SPEC-17) — COMPLETE

Independent post-pilot refinement track, surfaced by the 2026-04-26 first-live canon-addition run (animalia PR-0015) alongside SPEC-15. SPEC-15 (archived) covered the immediately-actionable validator + documentation fixes; SPEC-16 + SPEC-17 covered the contract-decision and additive-MCP-tooling items that required a separate design pass before ticketing. SPEC-16 is archived at `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md`; SPEC-17 is archived at `archive/specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`.

**Scope** (full decomposition):
- **SPEC-16** MCP retrieval-surface refinements — completed and archived 2026-04-26 at `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md`. Delivered four additive sub-tracks (`get_record_field` slice tool; `get_record_schema` discovery tool; per-task-type packet defaults + retry-hint error response; `search_nodes` exhaustive mode) plus cross-track docs in `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and the canon-addition retrieval-tool tree. All additive; no FOUNDATIONS amendments; no engine or validator changes.
- **SPEC-17** Audit-trail and retrieval-contract clarifications — completed and archived 2026-04-26 at `archive/specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`. Track C1 deprecated the pre-SPEC-13 notes-paragraph CF-modification convention in favor of `modification_history[]` as the canonical audit surface (no FOUNDATIONS amendment; SKILL.md + engine/validator README clarifications only). Track C2 amended FOUNDATIONS.md §Tooling Recommendation to explicitly endorse the documented context-packet + targeted-retrieval pattern after SPEC-16 §C3 + §C5 landed.

**Parallelizable order**:

**Tier 1 (independent of any other Phase 2.x work; Phase 2.5 may land in parallel)**:
- `SPEC-16` four sub-tracks parallelizable internally (C3 / C4 / C5 / C6); recommended sub-order if serialized is C5 (smallest, smoothes pilot UX) → C3 + C4 (additive tools) → C6 (largest test surface).
- `SPEC-17` Track C1 (notes-paragraph deprecation) — completed and archived at `archive/tickets/SPEC17AUDTRARET-001.md`; follow-up active-spec truthing completed and archived at `archive/tickets/SPEC17AUDTRARET-003.md`.

**Tier 2 (depended on Tier 1 SPEC-16 §C3 + §C5)**:
- `SPEC-17` Track C2 (FOUNDATIONS prose softening) — completed and archived at `archive/tickets/SPEC17AUDTRARET-002.md`; pre-flight check verified SPEC-16 archival before applying the FOUNDATIONS edit.

**Phase 2.7 completion gate**:
- SPEC-16 is implemented and archived: all four MCP retrieval-surface sub-tracks landed with package-local proof, and cross-track docs are updated.
- SPEC-17 is implemented and archived: `.claude/skills/canon-addition/SKILL.md` no longer prescribes the notes-paragraph convention; `docs/FOUNDATIONS.md` §Tooling Recommendation carries the index + follow-up-pattern endorsement; `docs/CONTEXT-PACKET-CONTRACT.md` carries the new §Index + Follow-Up Retrieval Pattern subsection; `archive/tickets/SPEC17AUDTRARET-003.md` completed the stale active-spec cleanup.
- A subsequent canon-addition run uses at least one of SPEC-16's new surfaces successfully (informal pilot evidence; not a gating criterion).

### Phase 3 — SUPERSEDED by Phase 1.5 (SPEC-13)

Previously: "Atomic Source for CF/CH Records" — deferred, optional, conditional on Phase 2 stability. **Superseded** by SPEC-13 Atomic-Source Migration, which pulls CF/CH atomization plus the full 11-file atomization forward into Phase 1.5 ahead of Phase 2. Phase 3 slot is retired.

### Phase 4 — SUPERSEDED by Phase 1.5 (SPEC-13)

Previously: "High-Churn Prose Fragmentization" — deferred, separate spec. **Superseded** by SPEC-13, which incorporates per-H2-section atomization of the five prose files (plus TIMELINE and PEOPLES_AND_SPECIES) into Phase 1.5's scope. Phase 4 slot is retired.

## Cross-phase dependency tree

```
Phase 0 (Prep) — COMPLETE
  │
  ├── tools/ scaffold ─────────┐
  ├── .gitignore updates       │
  └── specs/ bundle            │
                               ▼
Phase 1 (Read Path) — SUBSTANTIALLY COMPLETE; Tier 3 pilot folded into Phase 2
  │
  ├── SPEC-01 World Index ─────────┐
  │                                ▼
  ├── SPEC-10 Entity Surface Redesign ─┤
  │                                ▼
  ├── SPEC-11 Canonical Entity Authority Surfaces ─┤
  │                                ▼
  ├── SPEC-02 MCP Server ──────────┤
  │                                ▼
  ├── SPEC-12 Skill-Reliable Retrieval ─┤
  │                                ▼
  ├── SPEC-05 Hooks 1,2,4 ─────────┤
  │                                ▼
  └── SPEC-07 Part A (docs) ──────┐
                                   ▼
Phase 1.5 (Atomic-Source Migration, SPEC-13) ← NEW; supersedes old Phase 3 + Phase 4
  │
  ├── Stream A: spec drafting
  │     ├── SPEC-13 umbrella
  │     ├── SPEC-03/04/06/07/08 amendments
  │     ├── FOUNDATIONS.md revision (§Mandatory World Files, §Canonical Storage Layer, §Canon Fact Record Schema)
  │     ├── CLAUDE.md updates (repo layout, non-negotiables)
  │     └── IMPLEMENTATION-ORDER.md re-sequencing (this file)
  │
  ├── Stream B: animalia migration execution (manual, Claude-authored; single commit)
  │     ├── Pre-migration snapshot
  │     ├── File-class atomization (CF/CH/INV/M/OQ/ENT/SEC)
  │     ├── Monolithic file deletion + .gitignore update
  │     └── world-index build animalia + world-validate --structural
  │
  └── Stream C: SPEC-01 parser refresh (read _source/ as primary; retire legacy record-parsing)
                                   ▼
Phase 2 (Write Path + All-Skill Migration) — revised per SPEC-13
  │
  ├── SPEC-04 Validators (completed 2026-04-25) ───────┐
  │                                                      ▼
  ├── SPEC-07 Part B (docs) ───────────────────────────┤
  │                                                      ▼
  ├── SPEC-03 Patch Engine (completed 2026-04-25) ──────┤
  │                                                      ▼
  ├── SPEC-02 submit_patch_plan + new tools (done) ─────┤
  │                                                      ▼
  ├── SPEC-05 Hooks 3,5 (completed 2026-04-26) ────────┤
  │                                                      ▼
  ├── SPEC-14 PA Contract & Vocabulary Reconciliation ──┤
  │     ├── Tier 2: validator + engine + MCP code changes
  │     └── Tier 3: animalia bulk fix (PA migration + CF cleanup + one-offs)
  │                                                      ▼
  └── SPEC-06 all-skill migration (8 skills, atomic-source) ─┐
                                                              ▼
Phase 2.5 (Canon-Safety Expansion, SPEC-09) — independent; depends on SPEC-04 + SPEC-06
  │
  ├── FOUNDATIONS.md edits (Rules 11/12, schema blocks, relations, default-reality paragraph)
  ├── canon-addition skill updates (Tests 11/12, template, Phase 12 block authoring)
  ├── continuity-audit skill update (silent-area-canonization check)
  ├── diegetic-artifact-generation template cleanup
  ├── SPEC-04 validator additions (validator-rule-11-action-space, validator-rule-12-redundancy)
  └── docs/WORKFLOWS.md pointer

Phase 2.6 (Pilot Feedback Fixes, SPEC-15) ← COMPLETE; archived
  │
  ├── Track A: rule5_no_consequence_evasion + append_extension recognition
  └── Track B: pre_figured_by / find_named_entities / retrieval-tool-tree documentation

Phase 2.7 (Post-Pilot Retrieval Refinements, SPEC-16 + SPEC-17) ← COMPLETE; archived
  │
  ├── SPEC-16 MCP retrieval-surface refinements (additive, parallelizable; archived)
  │     ├── C3: get_record_field slice tool
  │     ├── C4: get_record_schema discovery tool
  │     ├── C5: per-task-type packet defaults + retry_with error surface
  │     └── C6: search_nodes exhaustive mode
  │
  └── SPEC-17 Audit-trail and retrieval-contract clarifications (archived)
        ├── C1: deprecate notes-paragraph convention (independent of SPEC-16)
        └── C2: FOUNDATIONS §Tooling Recommendation softening (depended on SPEC-16 C3 + C5)

Phase 3 (old: Optional Atomic Source for CF/CH) ← SUPERSEDED by Phase 1.5 (SPEC-13)
Phase 4 (old: High-Churn Prose Fragmentization) ← SUPERSEDED by Phase 1.5 (SPEC-13)
```

## Expected calendar

Estimates assume a single builder working at ~half-time; scale accordingly.

- **Phase 0**: 1 session (spec bundle landed; gitignore; scaffold) — COMPLETE
- **Phase 1**: 5–7 sessions — SUBSTANTIALLY COMPLETE
  - SPEC-01 (index + parser + CLI): 2 sessions — completed 2026-04-22
  - SPEC-10 (entity-surface remediation): 0.5–1 session — completed 2026-04-23
  - SPEC-11 (canonical entity authority surfaces): 0.5–1 session — completed 2026-04-23
  - SPEC-02 (MCP server + tools): 1 session — completed 2026-04-24
  - SPEC-12 (retrieval reliability + packet-v2): completed 2026-04-24
  - SPEC-05 Part A (3 hooks): 1 session — completed 2026-04-24
  - ~~SPEC-06 Part A (canon-addition read-side): 1 session~~ — SKIPPED per SPEC-13; folded into Phase 2
  - SPEC-07 Part A (docs): completed 2026-04-23 in parallel with Phase 1 code work
- **Phase 1.5** (SPEC-13 atomic-source migration): COMPLETE 2026-04-24
  - Stream A (spec drafting): completed and archived
  - Stream B (manual animalia migration): completed in private-world commit `99f6a97`
  - Stream C (SPEC-01 parser refresh): completed via archived `SPEC13ATOSRCMIG-002`, `SPEC13ATOSRCMIG-004`, and `SPEC13ATOSRCMIG-005`
  - Deferred exception: `SPEC13ATOSRCMIG-006` removes `.pre-migration-snapshot/animalia/` after the one-week stability window
- **Phase 2**: 5–8 sessions (reduced vs. original estimate; atomic-source simplifies patch engine and validator scope)
  - SPEC-04 (atomic-YAML validators, 13 mechanized validators): completed 2026-04-25; archived at `archive/specs/SPEC-04-validator-framework.md`
  - SPEC-03 (atomic-record patch engine, simplified op vocabulary): completed 2026-04-25; archived at `archive/specs/SPEC-03-patch-engine.md`
  - SPEC-02-PHASE2 (retrieval-MCP tooling update): completed 2026-04-25; archived at `archive/specs/SPEC-02-phase2-tooling.md`
  - SPEC-14 (PA contract & vocabulary reconciliation): 1–1.5 sessions
    - Tier 2 (validator + engine + MCP): 0.5–0.75 session
    - Tier 3 (animalia bulk fix): 0.5–0.75 session
  - SPEC-05 Part B (2 hooks, `_source/` discipline): completed 2026-04-26; archived at `archive/specs/SPEC-05-hooks-discipline.md`
  - SPEC-06 (all 8 skills against atomic source): 2.5–3 sessions
  - SPEC-07 Part B: 0.5 session
  - Animalia re-validation + cleanup: 0.5 session (lifted into SPEC-14 Tier 3)
- **Phase 2.5** (SPEC-09 canon-safety expansion): 1–2 sessions
- **Phase 2.6** (SPEC-15 pilot feedback fixes): COMPLETE 2026-04-26
- **Phase 2.7** (SPEC-16 + SPEC-17 post-pilot retrieval refinements): COMPLETE 2026-04-26
  - SPEC-16 four sub-tracks: completed and archived at `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md`
  - SPEC-17 two sub-tracks plus cleanup ticket: completed and archived at `archive/specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`
- **Phase 3** (old atomic-source): SUPERSEDED — not a separate phase
- **Phase 4** (old prose fragmentization): SUPERSEDED — not a separate phase

## Measurement baseline

Before Phase 1 begins, capture baseline measurements on animalia:
- Tool-input tokens for a representative canon-addition run (narrow proposal + large delivery; average)
- Elapsed time per phase
- Number of Edit tool calls per delivery
- Maximum context-window usage in a large delivery

These baseline numbers were originally captured to anchor the ≥50% (Phase 1) and ≥80% (Phase 2) reduction targets. Both targets are retired per 2026-04-26 scope narrowing on SPEC-06; the baseline notes here are preserved as historical reference only.

## Risk-adjusted re-sequencing options

If Phase 1 reveals that Hook 2 is too aggressive (false-positives on legitimate reads), SPEC-05 Part A may tighten thresholds before proceeding to Phase 2.

If SPEC-06 Phase 2 skill rewrites reveal systematic reasoning gaps (judgment being lost), pause Phase 2 and revisit SPEC-06's "what stays in each skill" table.

## Deliverable status

| Spec | Status |
|---|---|
| SPEC-01 World Index | ✓ implemented 2026-04-22; archived at `archive/specs/SPEC-01-world-index.md` |
| SPEC-02 Retrieval MCP Server | ✓ implemented 2026-04-24; archived at `archive/specs/SPEC-02-retrieval-mcp-server.md` |
| SPEC-02-PHASE2 Retrieval-MCP Phase 2 Tooling Update | ✓ implemented 2026-04-25; archived at `archive/specs/SPEC-02-phase2-tooling.md`; delivered `get_record`, `find_sections_touched_by`, and INV/OQ/ENT/SEC `allocate_next_id` extensions via archived `SPEC02PHA2TOO-*` tickets; `get_compiled_view` intentionally dropped |
| SPEC-03 Patch Engine | ✓ implemented 2026-04-25; archived at `archive/specs/SPEC-03-patch-engine.md`; ticket family archived under `archive/tickets/SPEC03PATENG-*.md` |
| SPEC-04 Validator Framework | ✓ implemented 2026-04-25; archived at `archive/specs/SPEC-04-validator-framework.md`; delivered `world-validate`, `validatePatchPlan`, 13 mechanized validators, and Animalia bootstrap grandfathering |
| SPEC-05 Hooks Discipline | ✓ implemented 2026-04-26; archived at `archive/specs/SPEC-05-hooks-discipline.md`; Part A implemented 2026-04-24 at `tools/hooks/` and `.claude/settings.json.example`; Part B implemented 2026-04-26 at `tools/hooks/src/hook3-guard-direct-edit.ts` and `tools/hooks/src/hook5-validate-after-patch.ts` (paired tests in `tools/hooks/tests/`); all five hooks wired in `.claude/settings.json.example` |
| SPEC-06 Skill Rewrite Patterns | ✓ specified |
| SPEC-07 Docs Updates | Part A implemented 2026-04-23 at `docs/FOUNDATIONS.md`, `CLAUDE.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md`; Part B remains specified; Part C retired by SPEC-13 |
| SPEC-08 Migration & Phasing | ✓ specified |
| SPEC-09 Canon-Safety Expansion | ✓ specified (independent; depends on SPEC-04, SPEC-06) |
| SPEC-10 Entity Surface Redesign | ✓ implemented 2026-04-23; archived at `archive/specs/SPEC-10-entity-surface-redesign.md` |
| SPEC-11 Canonical Entity Authority Surfaces | ✓ implemented 2026-04-23; archived at `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md` |
| SPEC-12 Skill-Reliable Retrieval | ✓ implemented 2026-04-24; archived at `archive/specs/SPEC-12-skill-reliable-retrieval.md` |
| SPEC-13 Atomic-Source Migration | ✓ implemented 2026-04-24; archived at `archive/specs/SPEC-13-atomic-source-migration.md`; delayed snapshot cleanup remains tracked by `tickets/SPEC13ATOSRCMIG-006.md` |
| SPEC-14 PA Contract & Vocabulary Reconciliation | ✓ implemented 2026-04-25; archived at `archive/specs/SPEC-14-pa-contract-and-vocabulary-reconciliation.md`; delivered PA contract reconciliation, canonical vocabulary surfacing, status-coupled Mystery Reserve validation, bidirectional CF/SEC engine checks, and Animalia zero-grandfathering closure via archived `SPEC14PAVOC-*` tickets |
| SPEC-15 Pilot Feedback Fixes | ✓ implemented 2026-04-26; archived at `archive/specs/SPEC-15-pilot-feedback-fixes.md`; `SPEC15PILFIX-001` (rule5 + append_extension) completed and archived at `archive/tickets/SPEC15PILFIX-001.md`; `SPEC15PILFIX-002` (documentation + skill content) completed and archived at `archive/tickets/SPEC15PILFIX-002.md`. Engine-convention sync + MCP retrieval-surface refinements promoted from `brainstorming/post-pilot-retrieval-refinements.md` into SPEC-16 + SPEC-17. |
| SPEC-16 MCP Retrieval-Surface Refinements | ✓ implemented 2026-04-26; archived at `archive/specs/SPEC-16-mcp-retrieval-surface-refinements.md`. Delivered C3 (`get_record_field` slice tool), C4 (`get_record_schema` discovery tool), C5 (per-task-type packet defaults + `retry_with` error surface), C6 (`search_nodes` exhaustive mode), and cross-track docs through `SPEC16MCPRETSUR-005`. Additive, no FOUNDATIONS amendments. SPEC-17 §C2 used the archived SPEC-16 §C3 + §C5 prerequisite before landing its FOUNDATIONS prose softening. |
| SPEC-17 Audit-Trail and Retrieval-Contract Clarifications | ✓ implemented 2026-04-26; archived at `archive/specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md`. C1 is completed and archived at `archive/tickets/SPEC17AUDTRARET-001.md` (deprecates the pre-SPEC-13 CF-modification notes-paragraph convention; `modification_history[]` is the canonical audit surface). C2 is completed and archived at `archive/tickets/SPEC17AUDTRARET-002.md` and amends FOUNDATIONS.md §Tooling Recommendation to endorse the documented context-packet + targeted-retrieval pattern after SPEC-16 §C3 + §C5 archival was verified. `archive/tickets/SPEC17AUDTRARET-003.md` completed active-spec truthing for the stale SPEC-06 notes-field row and deleted canon-addition template/reference explanation. No FOUNDATIONS amendment remains for SPEC-17. |
| IMPLEMENTATION-ORDER.md (this file) | ✓ delivered; amended 2026-04-24 per SPEC-13; amended 2026-04-25 per SPEC-14; amended 2026-04-26 per SPEC-15; amended 2026-04-26 per SPEC-16 + SPEC-17; updated 2026-04-26 after SPEC-16 implementation closeout; updated 2026-04-26 after SPEC-17 archival |

SPEC-01 through SPEC-08 are the Phase 0 deliverable of the brainstorm session captured in `brainstorming/structure-aware-retrieval.md`. SPEC-09 is the deliverable of a separate triage brainstorm over `brainstorming/foundational-improvements.md` (external worldbuilding review), sequenced as Phase 2.5 above. SPEC-10, SPEC-11, and SPEC-12 are architectural remediations of the original read-path contract: first the broad heuristic entity surface was narrowed, then canonical authority surfaces were made explicit, and finally downstream-skill retrieval reliability was formalized as a separate scoped-reference and packet-completeness layer. **SPEC-13 is the structural resolution of the condition the SPEC-10/11/12 arc revealed**: the remediations were patching a structural consequence of markdown-as-sole-storage. SPEC-13 moves canonical storage to atomic YAML under `_source/`, pulls the previously-deferred Phase 3 (CF/CH atomization) and Phase 4 (prose fragmentization) forward ahead of Phase 2, and retires both as separate phase slots. **SPEC-14 is the contract-reconciliation umbrella surfaced by the 2026-04-25 grandfathering triage** (`docs/triage/2026-04-25-spec04-grandfathering-triage.md`): the SPEC-04 baseline run on animalia exposed three-way drift between engine emission (`append_adjudication_record`), validator parsing (`record_schema_compliance`), and existing PA file shape; archived SPEC-14 supersedes the relevant parts of archived SPEC-03 and SPEC-04, adds canonical-vocabulary surfacing via MCP, and decomposes the animalia bulk fix into Tier 3 tickets that empty `audits/validation-grandfathering.yaml` to zero entries. **SPEC-15, SPEC-16, and SPEC-17 are the completed post-pilot refinement track surfaced by the 2026-04-26 first-live canon-addition run** (`brainstorming/post-pilot-retrieval-refinements.md`): SPEC-15 (archived) covers the immediately-actionable validator + documentation fixes; SPEC-16 (archived) covers four additive MCP retrieval-surface refinements (`get_record_field`, `get_record_schema`, per-task-type packet defaults + retry-hint, `search_nodes` exhaustive mode) plus cross-track docs; SPEC-17 (archived) covers the two contract-level decisions (deprecating the pre-SPEC-13 notes-paragraph convention; softening FOUNDATIONS §Tooling Recommendation prose to endorse the index + follow-up-retrieval pattern). The split between SPEC-16 and SPEC-17 is by architectural register — SPEC-16 is mechanical and additive, SPEC-17 is FOUNDATIONS-touching — and SPEC-17 §C2 landed only after SPEC-16 §C3 + §C5 were archived.
