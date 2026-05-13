# FOUNDATIONS-003: Refresh skill ID notation after FOUNDATIONS-002

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — skill and skill-reference prose/templates only; no package/runtime code or world content.
**Deps**: `archive/tickets/FOUNDATIONS-002.md`

## Problem

At intake, FOUNDATIONS-002 had canonicalized per-class record IDs to unpadded natural-integer suffixes across `docs/FOUNDATIONS.md`, schemas, allocators, index parsing, MCP retrieval helpers, and patch-engine validation. Post-review found that multiple skill-facing prose and template surfaces still taught padded or placeholder forms such as `SP-NNNN`, `PG-NNNN`, `M-NNNN`, `CF-NNNN`, `SEC-GEO-NNN`, `DA-0000`, and `^CF-[0-9]{4}$`.

Those stale examples were not just cosmetic: story and canon skills are operational instructions. Left unchanged, they could have caused future runs to mint or request padded IDs that no longer match the documented allocation convention.

## Assumption Reassessment (2026-05-13)

1. FOUNDATIONS-002 is archived at `archive/tickets/FOUNDATIONS-002.md` and codifies the active contract: unpadded natural-integer suffixes, with filenames matching the `id` field exactly except suffix-bearing hybrid artifacts.
2. Post-review grep found stale ID notation in skill surfaces, including `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md`, and `.codex/skills/implement-ticket/references/validator-schema-migrations.md`.
3. Shared boundary under audit: human/agent-facing skill instructions and templates must use the same ID notation as `docs/FOUNDATIONS.md` and the machine-facing allocator/schema surfaces. This ticket owns prose/template cleanup only, not engine behavior.
4. FOUNDATIONS principle under audit: §Canonical Storage Layer now requires unpadded natural-integer IDs; skill instructions that still prefer padded examples undermine the canonical storage contract and the Tooling Recommendation's retrievable-record expectation.
5. Adjacent contradictions: some stale examples may intentionally describe historical ticket prefixes such as `<PREFIX>-NNN`; those should be classified and left alone when they are not world/story record IDs. The implementation must distinguish world/story ID examples from ticket-number placeholders.
6. Live sweep showed the stale notation was broader than the initial named files. Same-seam skill surfaces under `.claude/skills/` also carried active pipeline, hybrid, proposal, audit, pressure-event, and story-bundle ID examples such as `PR-NNNN`, `BATCH-NNNN`, `NCP-NNNN`, `NWB-NNNN`, `EPE-NNNN`, concrete `PG-0001` / `SEC-GEO-001` examples, and `MR-0003` Mystery Reserve examples. These are absorbed as skill-facing notation cleanup because they share the same FOUNDATIONS-002 ID-format contract.
7. Historical example directories were not treated as the acceptance surface for the negative grep. A few example files moved where the same mechanical notation cleanup touched active skill examples, but remaining historical example IDs are classified as example provenance rather than active operator instructions.
8. Post-review reopened the ticket for one same-seam active-reference blocker: `.claude/skills/branching-story-bootstrap/SKILL.md` still named `tickets/FOUNDATIONS-003.md` as a completed pending-archival prerequisite. The live correction removes the active-ticket path from the skill prerequisite list so archival will not leave a stale source reference.

## Architecture Check

1. Updating skill prose/templates in place is cleaner than adding aliases or compatibility language. It keeps operators, agents, schemas, and allocators aligned to one active convention.
2. No backwards-compatibility aliasing/shims are introduced. Historical or ticket-number placeholders may remain only when they are clearly not record IDs.

## Verification Layers

1. Skill prose and templates use `<integer>` or concrete unpadded examples for world/story record IDs -> codebase grep-proof over `.claude/skills/` and `.codex/skills/`.
2. Canon-addition envelope examples match the active patch-engine/validator allocation contract -> manual review against `docs/FOUNDATIONS.md` §Canonical Storage Layer and `tools/world-mcp/README.md`.
3. Ticket-number placeholders remain distinguishable from record IDs -> manual classification of remaining `NNN`/`NNNN` hits after the cleanup.

## Landed Changes

### 1. Updated stale record-ID notation in skill prose

Active world, story, hybrid, proposal, audit, and pipeline record placeholders now use `<integer>` forms or unpadded concrete examples.

### 2. Updated templates and schema comments

Template comments and embedded regex examples that pinned fixed-width IDs now use unpadded notation, including the diegetic artifact template, canon-addition envelope examples, story-pipeline templates, and skill-local guidance.

### 3. Preserved non-record placeholders

Ticket-family placeholders such as `<PREFIX>-NNN` remain intact when they describe ticket IDs rather than world/story record IDs. Remaining historical example IDs are classified as historical examples, not active current contract prose.

## Files to Touch

- `.claude/skills/**/*.md` (modify where stale world/story record ID notation appears)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modified to remove the stale active `tickets/FOUNDATIONS-003.md` reference from completed prerequisite prose)
- `.claude/skills/**/templates/*` (modify where stale world/story record ID notation appears)
- `.claude/skills/**/references/*.md` (modify where stale world/story record ID notation appears)
- `.claude/skills/**/examples/*.md` (modify only where same-seam example prose was mechanically aligned)
- `.codex/skills/implement-ticket/references/validator-schema-migrations.md` (updated the `DA-NNNN` overlap example)

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
2. `rg -n 'tickets/FOUNDATIONS-003.md|archive/tickets/FOUNDATIONS-003.md' .claude/skills .codex/skills docs tickets --glob '!tickets/FOUNDATIONS-003.md'`
3. `git diff --check`

## Outcome

FOUNDATIONS-003 is implemented. Skill-facing current-contract surfaces now use the FOUNDATIONS-002 unpadded natural-integer notation for record IDs, including story-bundle, canon-addition, creation, audit, proposal, pressure-event, character, diegetic-artifact, and Codex implement-ticket reference surfaces.

Post-review refinement on 2026-05-13 also removed the stale active `tickets/FOUNDATIONS-003.md` reference from `.claude/skills/branching-story-bootstrap/SKILL.md`. No package/runtime code or world content was changed.

## Post-Review Refinement (2026-05-13)

Resolved the post-review blocker: `.claude/skills/branching-story-bootstrap/SKILL.md` no longer references `tickets/FOUNDATIONS-003.md` as a completed pending-archival prerequisite.

## Verification Result

- `rg -n 'CF-NNNN|CH-NNNN|M-NNNN|OQ-NNNN|ENT-NNNN|SEC-[A-Z]{3}-NNN|PG-NNNN|CHC-NNNN|SLT-NNNN|SLB-NNNN|SAU-NNNN|SP-NNNN|RSP-NNNN|DA-0000|\\[0-9\\]\\{4\\}|\\\\d\\{4\\}' .claude/skills .codex/skills` passed with no matches.
- `rg -n 'zero-padded|4-digit|SEC-<PREFIX>-NNN|SEC-[A-Z]{3}-001|[A-Z]{1,6}-NNNN|[A-Z]{1,6}-0000|MR-[0-9]{4}' .claude/skills .codex/skills --glob '!**/examples/**'` passed with no matches.
- Manual review confirmed canon-addition envelope examples now use `CF-<integer>`, `CH-<integer>`, `PA-<integer>`, `M-<integer>`, `OQ-<integer>`, and unpadded concrete examples such as `CF-1`.
- Manual review confirmed story-pipeline skills/templates now use story ID classes such as `PG-<integer>`, `SE-<integer>`, `SP-<integer>`, `RSP-<integer>`, and `SLT-<integer>`.
- `git diff --check` passed.
- `rg -n 'tickets/FOUNDATIONS-003.md|archive/tickets/FOUNDATIONS-003.md' .claude/skills .codex/skills docs tickets --glob '!tickets/FOUNDATIONS-003.md'` emitted no matches.

## Deviations

- The cleanup widened within the same skill-facing notation seam to include active pipeline/proposal/audit/pressure-event IDs beyond the ticket's initial examples (`NCP`, `NCB`, `NWP`, `NWB`, `EPE`, `PR`, `BATCH`, `AU`, `RP`) because those surfaces are governed by the same FOUNDATIONS-002 ID-format rule.
- Historical example directories are not the acceptance boundary for the active-contract grep. Remaining concrete padded IDs inside examples are historical provenance unless a future ticket explicitly refreshes or renames example files.
