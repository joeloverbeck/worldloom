# SPEC06SKIREWPAT-007: propose-new-characters — pre-flight migration

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/propose-new-characters/SKILL.md` rewritten; pre-flight world-state load via `get_context_packet`; proposal cards and `character-proposals/INDEX.md` remain direct-Edit on hybrid files (Hook 3 hybrid-file allowlist)
**Deps**: None — SPEC-01..SPEC-05 Part B + SPEC-13 + SPEC-14 archived. Independent of sibling tickets. Same pattern as SPEC06SKIREWPAT-005 / SPEC06SKIREWPAT-006 but biggest collapse.

## Problem

`propose-new-characters/SKILL.md` (594 lines) is the largest of the proposal-generating skills; per SPEC-06 §Migration plan propose-new-characters subsection (line 173: "same pattern. 594 → ~200 lines (biggest collapse — this skill has accumulated heavy reference material that mechanism owns)"), the SKILL.md has accumulated extensive prose on world-state retrieval mechanism (the "Large-file method" inherited patterns expanded with character-specific guidance) that becomes deletable once retrieval is record-addressed. Refreshed target per spec table: ~170 lines (~71% reduction — the biggest collapse in the bundle).

The skill produces character-proposal cards (`NCP-NNNN-<slug>.md` at `worlds/<slug>/character-proposals/`) and batch manifests (`NCB-NNNN.md` at `character-proposals/batches/`) directly consumable by `character-generation` via `character_brief_path`.

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/propose-new-characters/SKILL.md` (594 lines) references retired monolithic files; uses extensive "Large-file method" prose for character-relevant world state (institutions, peoples-and-species, everyday-life, geography). The retired files are gone post-SPEC-13.
2. SPEC-06 §Migration plan propose-new-characters subsection (line 173) prescribes "same pattern" as propose-new-canon-facts with biggest collapse. Spec table target is ~170 lines.
3. Cross-skill / cross-artifact boundary: character-proposal cards are consumed by `character-generation` via `character_brief_path` argument. Card schema (`ncp_id` plus character-design metadata: open-niche diagnosis, negative-space identification, mosaic-mirror reasoning, essence/niche/voice audit trail) is the contract surface; unchanged by this rewrite.
4. FOUNDATIONS principles under audit: same as `propose-new-canon-facts` — proposals are not canon; Rule 6 doesn't fire on emission.
5. Per CLAUDE.md §Skill Architecture and §ID Allocation Conventions, this skill uses `NCP-NNNN` (not `PR-NNNN`) for character-proposal cards and `NCB-NNNN` (not `BATCH-NNNN`) for batch manifests, distinct from `propose-new-canon-facts`'s `PR-NNNN` / `BATCH-NNNN` namespace.

## Architecture Check

1. Thin-orchestrator pattern: pre-flight allocates `NCP-NNNN`, `NCB-NNNN` via `mcp__worldloom__allocate_next_id` (per SPEC-02-PHASE2 — verify NCP/NCB classes are supported, or add them as part of this ticket if missing); `get_context_packet(task_type='propose-new-characters', seed_nodes=[<institutions>, <peoples-and-species>, <existing-characters>], token_budget=15000)` provides character-relevant world state; open-niche diagnosis + negative-space identification + mosaic-mirror reasoning + essence/niche/voice audit trail retain judgment; cards composed; HARD-GATE before write; direct-Edit of card + batch + index.
2. No backwards-compatibility shims.

## Verification Layers

1. Pre-flight uses MCP retrieval → grep-proof: skill text uses MCP tools, not raw `Read` of `_source/`
2. Direct-Edit on hybrid files → Hook 3 trace: `character-proposals/` allowed (per SPEC-05 Part B); `_source/*.yaml` blocked
3. Cards consumable by character-generation → schema validation: emitted NCP cards have correct frontmatter; character-generation's `character_brief_path` argument can parse them
4. 5-batch-angle coverage preserved → manual review: each batch covers open niches / negative-space / institutional lenses / artifact-author candidates / mosaic mirrors angles or produces explicit "no candidates this angle" entries

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~170 lines)

Replace pre-flight world-state load with `allocate_next_id` + `get_context_packet`. Drop §World-State Prerequisites file enumeration referencing retired monolithic files. Delete the extensive "Large-file method" expanded character-domain catalogue (this is where the bulk of the 594-line bloat sits).

### 2. Verify NCP-NNNN / NCB-NNNN allocation support

Per SPEC-02-PHASE2 archived spec, `allocate_next_id` was extended to INV / OQ / ENT / SEC classes. Check whether NCP and NCB classes are supported; if not, add them as part of this ticket (or split into a follow-up ticket — depends on SPEC-02-PHASE2 surface). Verify by reading `tools/world-mcp/src/tools/allocate-next-id.ts`.

### 3. Preserve open-niche / negative-space / mosaic-mirror reasoning phases

The semantic judgment phases (open-niche diagnosis: where are character-shaped gaps in the world's social fabric? negative-space identification: what character types are conspicuously absent? institutional lenses: what character would serve a specific institutional role meaningfully? artifact-author candidates: who could plausibly have authored this diegetic artifact? mosaic-mirror reasoning: what character would refract existing characters in a thematically resonant way?) STAY in-skill.

### 4. Card composition

Each character-proposal card carries:
- Frontmatter: `ncp_id: NCP-NNNN`, `proposed_essence`, `proposed_niche`, `proposed_voice`, `angle: open_niche | negative_space | institutional_lens | artifact_author | mosaic_mirror`, `audit_trail: { ... }`.
- Body markdown: full essence/niche/voice prose (richer than what character-generation needs as a brief; the card preserves the audit trail while exposing the brief-shape via frontmatter for direct consumption).

### 5. Batch manifest

Compose `NCB-NNNN.md` at `worlds/<slug>/character-proposals/batches/`.

### 6. HARD-GATE → direct-Edit batch

Present batch summary (cards by angle); user approves; direct-Edit writes.

## Files to Touch

- `.claude/skills/propose-new-characters/SKILL.md` (modify — rewrite ~594 → ~170 lines)
- `.claude/skills/propose-new-characters/references/` (modify — delete retrieval-mechanism files; survive judgment files)
- `.claude/skills/propose-new-characters/templates/character-proposal-card.md` (modify if frontmatter shape needs refresh)

## Out of Scope

- Migration of OTHER skills
- Engine-routed character-proposal writes (cards stay direct-Edit)
- Card schema changes
- Token-reduction measurement (SPEC06SKIREWPAT-009)
- character-generation integration (SPEC06SKIREWPAT-003 owns)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run producing a character-proposal batch on animalia: pre-flight uses `allocate_next_id` + `get_context_packet`; zero raw `Read` of `_source/`; HARD-GATE fires before write.
2. Direct-Edit on `character-proposals/` succeeds; direct-Edit on `_source/` blocked.
3. 5-angle coverage: produced batch covers all 5 angles or produces explicit "no candidates this angle" entries.
4. Cards consumable as character-generation's `character_brief_path`: handoff dry-run succeeds.
5. NCP-NNNN / NCB-NNNN allocation works via MCP (or follow-up ticket added if not supported).

### Invariants

1. HARD-GATE absoluteness.
2. Hybrid-file write discipline: only `character-proposals/` paths.
3. Card schema fidelity: every NCP-NNNN-*.md has correct frontmatter.
4. 5-angle coverage discipline: no silent angle skipping.

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + Hook 3 trace command-based.`

### Commands

1. `cd tools/world-mcp && npm test` — confirm `allocate_next_id` supports NCP/NCB classes (or add support as part of this ticket)
2. `cd tools/hooks && npm test` — confirm Hook 3 unchanged
3. Manual skill dry-run producing a test character-proposal batch on animalia; review 5-angle coverage + open-niche / negative-space / mosaic-mirror reasoning. Manual review is the correct boundary for character-design reasoning.
