# SPEC06SKIREWPAT-005: propose-new-canon-facts — pre-flight migration

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/propose-new-canon-facts/SKILL.md` rewritten; pre-flight world-state load via `get_context_packet`; proposal cards and `proposals/INDEX.md` remain direct-Edit on hybrid files (Hook 3 hybrid-file allowlist)
**Deps**: None — SPEC-01..SPEC-05 Part B + SPEC-13 + SPEC-14 archived. Independent of sibling tickets. Recommend landing after SPEC06SKIREWPAT-001 (canon-addition pattern proven).

## Problem

`propose-new-canon-facts/SKILL.md` (167 lines) currently reads world state via inherited "Large-file method" patterns referring to retired monolithic files; produces proposal cards via direct `Write` to `worlds/<slug>/proposals/PR-NNNN-<slug>.md` and batch manifests at `proposals/batches/BATCH-NNNN.md`. Per SPEC-06 §Migration plan propose-new-canon-facts subsection (lines 167–169), pre-flight load shifts to `mcp__worldloom__get_context_packet(task_type='propose-new-canon-facts', ...)`; writes to `proposals/PR-NNNN-*.md` STAY direct-Edit because they are hybrid files (Hook 3 hybrid-file allowlist permits per SPEC-05 Part B). Per spec line 168 ("Writes to `proposals/PR-NNNN-*.md` may stay direct-Edit (allowed by Hook 3) OR route through engine if `proposals/INDEX.md` update is easier via engine — decide during implementation"), this ticket commits to keeping all proposal-side writes direct-Edit (per /reassess-spec Question Q2's parallel resolution for audit records: hybrid files stay direct-Edit; only pre-flight + retrieval surfaces migrate to MCP).

Target: SKILL.md ~130 lines.

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/propose-new-canon-facts/SKILL.md` (167 lines) references retired monolithic files in §World-State Prerequisites; uses inherited "Large-file method" pattern. The retired files are gone post-SPEC-13.
2. SPEC-06 §Migration plan propose-new-canon-facts subsection (lines 167–169) prescribes the rewrite scope. Hook 3 hybrid-file allowlist confirmed at `tools/hooks/src/hook3-guard-direct-edit.ts` (only `_source/<subdir>/*.yaml` paths blocked; everything else allowed).
3. Cross-skill / cross-artifact boundary: proposal cards are consumed by canon-addition via `proposal_path`. Card schema (frontmatter: `pr_id`, `topic`, `angle`, `canon_safety_check`, etc. plus body markdown) is the contract surface; unchanged by this rewrite. The skill emits cards; canon-addition consumes; no engine-mediated handoff.
4. FOUNDATIONS principles under audit: **Proposals are not canon** (per `docs/FOUNDATIONS.md` §Canonical Storage Layer — only `_source/*.yaml` is canonical; `proposals/` is a candidate space). Proposal cards do NOT trigger Rule 6 (No Silent Retcons) on emission because they are not canon; canon-addition is where Rule 6 enforcement fires.
5. HARD-GATE semantics: gate fires before writing the batch manifest (`BATCH-NNNN.md`) and the proposal card files; auto-Mode does not bypass.

## Architecture Check

1. Thin-orchestrator pattern: pre-flight allocates `PR-NNNN` and `BATCH-NNNN` via `mcp__worldloom__allocate_next_id` (per SPEC-02-PHASE2's PR/BATCH extension); `get_context_packet(task_type='propose-new-canon-facts', seed_nodes=[...thinness-gap-anchors...], token_budget=15000)` provides world-state context (kernel, invariants, existing CFs, Mystery Reserve, Open Questions); 5-angle reasoning (open niches, institutional adaptations, contested knowledge, mystery seeds, cross-domain couplings) retains judgment phases; cards composed; HARD-GATE before write; direct-Edit of `proposals/PR-NNNN-*.md` + `proposals/batches/BATCH-NNNN.md` + `proposals/INDEX.md`. Cleaner than direct retired-file reads because retrieval is record-addressed; no oversize-file fallback.
2. Direct-Edit on hybrid files (Hook 3 allowlist) keeps the skill scope minimal — no engine-op extension needed for proposal-card emission. This matches the pattern used for audit records in SPEC06SKIREWPAT-008.

## Verification Layers

1. Pre-flight uses MCP retrieval → grep-proof: skill text contains zero raw `Read worlds/<slug>/_source/`; uses only MCP tools
2. Direct-Edit on `proposals/` succeeds → Hook 3 trace: synthetic test confirms direct-Edit on `proposals/PR-NNNN-*.md` is allowed; direct-Edit on `_source/*.yaml` is blocked
3. Proposal cards consumable by canon-addition → schema validation: emitted PR-NNNN-*.md cards have correct frontmatter shape per existing template; canon-addition's `proposal_path` argument can parse them
4. 5-angle reasoning preserved → manual review: each batch covers ≥1 card per applicable angle; angles with no candidates produce explicit "no candidates this batch" entries

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~130 lines)

Replace pre-flight world-state load with `mcp__worldloom__allocate_next_id` (for `PR-NNNN`, `BATCH-NNNN`) + `get_context_packet(task_type='propose-new-canon-facts', ...)`. Drop §World-State Prerequisites file enumeration referencing retired monolithic files.

### 2. Preserve 5-angle reasoning phases

The semantic judgment phases (open niches: where is the world thin? institutional adaptations: what existing institutions need elaboration to stay coherent under accumulated CFs? contested knowledge: what could be diegetic disagreement? mystery seeds: where can new bounded unknowns enrich without resolving existing M-N entries? cross-domain couplings: what new fact would link two existing CFs?) STAY in-skill.

### 3. Card composition

Each proposal card carries:
- Frontmatter: `pr_id: PR-NNNN`, `topic`, `angle: open_niche | institutional_adaptation | contested_knowledge | mystery_seed | cross_domain_coupling`, `canon_safety_check: { invariants_respected: [...], mr_firewall_status: ... }`, `derived_from_cfs: [...]`.
- Body markdown: proposed CF rationale + dramatic purpose + scope hints + revision appetite.

Card path: `worlds/<slug>/proposals/PR-NNNN-<slug>.md`.

### 4. Batch manifest

Compose `worlds/<slug>/proposals/batches/BATCH-NNNN.md` listing all PR-NNNN cards in this batch with one-line summaries; coverage analysis per angle.

### 5. Index update

Update `worlds/<slug>/proposals/INDEX.md` direct-Edit appending the new batch's cards.

### 6. HARD-GATE → direct-Edit batch

Present batch summary to user; user approves; skill writes all card files + batch manifest + index update via direct-Edit.

## Files to Touch

- `.claude/skills/propose-new-canon-facts/SKILL.md` (modify — rewrite ~167 → ~130 lines)
- `.claude/skills/propose-new-canon-facts/references/` (modify — refresh retrieval-mechanism files; preserve 5-angle judgment files)
- `.claude/skills/propose-new-canon-facts/templates/proposal-card.md` (modify if needed — refresh frontmatter shape)
- `.claude/skills/propose-new-canon-facts/templates/batch-manifest.md` (modify if needed)

## Out of Scope

- Migration of OTHER skills
- Engine-routed proposal-card writes (proposals stay direct-Edit per Hook 3 allowlist; per /reassess-spec Question Q2 pattern resolution)
- Proposal-card schema changes
- Token-reduction measurement (SPEC06SKIREWPAT-009)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run producing a proposal batch on animalia: pre-flight uses `allocate_next_id` + `get_context_packet`; zero raw `Read` of `_source/`; HARD-GATE fires before write.
2. Direct-Edit on `proposals/PR-NNNN-*.md` succeeds (Hook 3 allows hybrid file).
3. Direct-Edit on `_source/canon/*.yaml` from within propose-new-canon-facts (synthetic test) is blocked by Hook 3.
4. 5-angle coverage: produced batch covers all 5 angles or produces explicit "no candidates this angle" entries (no silent skipping).
5. Cards consumable as canon-addition `proposal_path`: handoff dry-run succeeds.

### Invariants

1. HARD-GATE absoluteness.
2. Hybrid-file write discipline: only `proposals/` paths, never `_source/`.
3. Card schema fidelity: every PR-NNNN-*.md has correct frontmatter shape.
4. 5-angle coverage discipline: no silent angle skipping.

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + Hook 3 trace command-based.`

### Commands

1. `cd tools/world-mcp && npm test` — confirm MCP retrieval surface unchanged
2. `cd tools/hooks && npm test` — confirm Hook 3 hybrid-file allowlist behavior unchanged
3. Manual skill dry-run producing a test proposal batch on animalia; review 5-angle coverage. Manual review is the correct boundary for thinness-gap reasoning.

## Outcome

**Completion date**: 2026-04-26

**What actually changed**:
- `.claude/skills/propose-new-canon-facts/SKILL.md` rewritten 167 → 132 lines (target ~130). Pre-flight uses `mcp__worldloom__allocate_next_id(world_slug, 'BATCH')` + direct Read of FOUNDATIONS / WORLD_KERNEL / ONTOLOGY + `mcp__worldloom__get_context_packet(...)`. PR-NNNN allocation moved to Phase 6 (after diversification settles), one allocation per slot-filling card. HARD-GATE preserved; Phase 9 writes go direct-Edit on the proposals/ hybrid-file allowlist (Hook 3 permits). 5-angle judgment phases (Phase 1 thinness/overstability/overcomplexity → Phase 2 enrichment-category mapping → Phases 3-6 generate/score/filter/diversify → Phase 7 Canon Safety Check → Phase 8 validation) preserved in-skill.
- `references/preflight-and-prerequisites.md` rewritten end-to-end against atomic-record retrieval; documents seed_nodes choice, on-demand `get_record` / `search_nodes`, and the `task_type='other'` decision.
- `references/phases-1-2-diagnose-and-target.md` Phase 1 thinness scans rewritten as a per-concern record-class pattern (12-row table mapping each thinness indicator to its primary `SEC-*` / `CF-*` / `M-*` / `OQ-*` record class).
- `references/phase-7-canon-safety-check.md` 7a/7b/7c retrieval references updated to atomic INV / M / CF records via packet + `search_nodes` / `get_record`.
- `references/phases-3-6-generate-score-filter-diversify.md` `redundancy_risk` cross-check rewired from CANON_LEDGER to `search_nodes(node_type='canon_fact')`.
- `references/canon-rules-and-foundations.md` Tooling Recommendation row updated to atomic-source loading.
- `templates/proposal-card.md` `likely_required_downstream_updates` example values changed from retired filenames (INSTITUTIONS.md, etc.) to `SEC-*` ids.
- `templates/batch-manifest.md` Diagnosis Dossier preface updated to atomic-record cite-by-id discipline.

**Deviations from original plan**:
- **`task_type` value**: SPEC-06 line 167 prescribes `task_type='propose-new-canon-facts'`, but that value is not in the registered `TASK_TYPES` enum (`tools/world-mcp/src/ranking/profiles/index.ts:7` registers only `canon_addition` | `character_generation` | `diegetic_artifact_generation` | `continuity_audit` | `other`). Per the ticket's "Files to Touch" scope (skill directory only), used `task_type='other'` (the registered fallback that uses `defaultRankingProfile`). Documented inline in the SKILL.md §World-State Prerequisites and the preflight reference. Token budget set explicitly to 15000. Adding a tailored `propose_new_canon_facts` task type with its own ranking profile is a separate MCP-side ticket if desired later.
- **Examples not modified**: `examples/PR-0001-*.md` and `PR-0002-*.md` still reference retired monolithic filenames in their illustrative content. These are vintage artifacts not loaded by the runtime; the ticket's "Files to Touch" did not list `examples/`.

**Verification results**:
- `cd tools/world-mcp && npm test` → 137/137 pass (MCP retrieval surface unchanged).
- `cd tools/hooks && npm test` → 17/17 pass (Hook 3 hybrid-file allowlist behavior unchanged).
- Skill dry-run against animalia (Test plan #3) reserved for an authoring session per the ticket's note that manual review is the correct boundary for thinness-gap reasoning.
