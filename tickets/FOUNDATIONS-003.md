# FOUNDATIONS-003: Refresh skill ID notation after FOUNDATIONS-002

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — skill and skill-reference prose/templates only; no package/runtime code or world content.
**Deps**: `archive/tickets/FOUNDATIONS-002.md`

## Problem

FOUNDATIONS-002 canonicalized per-class record IDs to unpadded natural-integer suffixes across `docs/FOUNDATIONS.md`, schemas, allocators, index parsing, MCP retrieval helpers, and patch-engine validation. Post-review found that multiple skill-facing prose and template surfaces still teach padded or placeholder forms such as `SP-NNNN`, `PG-NNNN`, `M-NNNN`, `CF-NNNN`, `SEC-GEO-NNN`, `DA-0000`, and `^CF-[0-9]{4}$`.

Those stale examples are not just cosmetic: story and canon skills are operational instructions. If left unchanged, future runs can mint or request padded IDs that no longer match the documented allocation convention.

## Assumption Reassessment (2026-05-13)

1. FOUNDATIONS-002 is archived at `archive/tickets/FOUNDATIONS-002.md` and codifies the active contract: unpadded natural-integer suffixes, with filenames matching the `id` field exactly except suffix-bearing hybrid artifacts.
2. Post-review grep found stale ID notation in skill surfaces, including `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md`, and `.codex/skills/implement-ticket/references/validator-schema-migrations.md`.
3. Shared boundary under audit: human/agent-facing skill instructions and templates must use the same ID notation as `docs/FOUNDATIONS.md` and the machine-facing allocator/schema surfaces. This ticket owns prose/template cleanup only, not engine behavior.
4. FOUNDATIONS principle under audit: §Canonical Storage Layer now requires unpadded natural-integer IDs; skill instructions that still prefer padded examples undermine the canonical storage contract and the Tooling Recommendation's retrievable-record expectation.
5. Adjacent contradictions: some stale examples may intentionally describe historical ticket prefixes such as `<PREFIX>-NNN`; those should be classified and left alone when they are not world/story record IDs. The implementation must distinguish world/story ID examples from ticket-number placeholders.

## Architecture Check

1. Updating skill prose/templates in place is cleaner than adding aliases or compatibility language. It keeps operators, agents, schemas, and allocators aligned to one active convention.
2. No backwards-compatibility aliasing/shims are introduced. Historical or ticket-number placeholders may remain only when they are clearly not record IDs.

## Verification Layers

1. Skill prose and templates use `<integer>` or concrete unpadded examples for world/story record IDs -> codebase grep-proof over `.claude/skills/` and `.codex/skills/`.
2. Canon-addition envelope examples match the active patch-engine/validator allocation contract -> manual review against `docs/FOUNDATIONS.md` §Canonical Storage Layer and `tools/world-mcp/README.md`.
3. Ticket-number placeholders remain distinguishable from record IDs -> manual classification of remaining `NNN`/`NNNN` hits after the cleanup.

## What to Change

### 1. Update stale record-ID notation in skill prose

Replace active world/story record placeholders such as `CF-NNNN`, `CH-NNNN`, `M-NNNN`, `SEC-GEO-NNN`, `PG-NNNN`, `CHC-NNNN`, `SP-NNNN`, and `SAU-NNNN` with `<integer>` forms or unpadded concrete examples.

### 2. Update templates and schema comments

Refresh template comments and embedded regex examples that still pin fixed-width IDs, especially comments like `DA-0000`, `CF-NNNN`, and `^CF-[0-9]{4}$`.

### 3. Preserve non-record placeholders

Leave ticket-family placeholders such as `<PREFIX>-NNN` intact when they describe ticket IDs rather than world/story record IDs. Record any intentionally preserved hits in closeout.

## Files to Touch

- `.claude/skills/**/*.md` (modify where stale world/story record ID notation appears)
- `.claude/skills/**/templates/*` (modify where stale world/story record ID notation appears)
- `.claude/skills/**/references/*.md` (modify where stale world/story record ID notation appears)
- `.codex/skills/implement-ticket/references/validator-schema-migrations.md` (modify if the `DA-NNNN` example still describes a world/story record ID)

## Out of Scope

- Package/runtime code changes.
- World-content migration or direct edits under `worlds/<slug>/`.
- Changing ticket-number placeholder conventions such as `<PREFIX>-NNN`.
- Reworking skill behavior beyond ID notation alignment.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'CF-NNNN|CH-NNNN|M-NNNN|OQ-NNNN|ENT-NNNN|SEC-[A-Z]{3}-NNN|PG-NNNN|CHC-NNNN|SLT-NNNN|SLB-NNNN|SAU-NNNN|SP-NNNN|RSP-NNNN|DA-0000|\\[0-9\\]\\{4\\}|\\\\d\\{4\\}' .claude/skills .codex/skills` emits no active world/story record-ID contract hits, or every remaining hit is explicitly classified as historical/non-record/ticket placeholder in closeout.
2. Manual review confirms canon-addition and story-pipeline skill examples now use the FOUNDATIONS-002 `<integer>` convention.

### Invariants

1. Skill-facing record-ID notation matches FOUNDATIONS-002.
2. No skill gains backwards-compatible aliasing guidance for padded IDs.

## Test Plan

### New/Modified Tests

1. `None — skill documentation/template cleanup; verification is grep-proof plus manual review against FOUNDATIONS-002.`

### Commands

1. `rg -n 'CF-NNNN|CH-NNNN|M-NNNN|OQ-NNNN|ENT-NNNN|SEC-[A-Z]{3}-NNN|PG-NNNN|CHC-NNNN|SLT-NNNN|SLB-NNNN|SAU-NNNN|SP-NNNN|RSP-NNNN|DA-0000|\\[0-9\\]\\{4\\}|\\\\d\\{4\\}' .claude/skills .codex/skills`
2. `git diff --check`
