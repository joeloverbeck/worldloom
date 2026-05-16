# SPEC35STOPIPEIG-009: Replace FOUNDATIONS archive-spec references with current-doc citations

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — docs only (`docs/FOUNDATIONS.md`)
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D9

## Problem

`docs/FOUNDATIONS.md` cites three archived specs as design references in the §Machine-Facing Layer section:

- Line 537: `archive/specs/SPEC-02-retrieval-mcp-server.md` (Retrieval MCP Server)
- Line 538: `archive/specs/SPEC-03-patch-engine.md` (Patch Engine)
- Line 540: `archive/specs/SPEC-05-hooks-discipline.md` (Hooks)

The eighth-iteration audit prompt explicitly treats archived specs as non-authoritative; FOUNDATIONS as the top-of-stack authority document should not lean on archived references for current design. Each archived spec is reasonably superseded by current docs/code paths.

## Assumption Reassessment (2026-05-16)

1. `docs/FOUNDATIONS.md` lines 537/538/540 cite `archive/specs/SPEC-02/03/05`. Verified at Step 1 audit-phase Read; the cited lines and content match.
2. Current authority replacements available:
   - SPEC-02 (Retrieval MCP Server) → `docs/MACHINE-FACING-LAYER.md` (operational overview) + `tools/world-mcp/` (canonical source).
   - SPEC-03 (Patch Engine) → `docs/HARD-GATE-DISCIPLINE.md` (operational discipline) + `tools/patch-engine/` (canonical source).
   - SPEC-05 (Hooks) → `.claude/settings.json` (configuration surface) + `tools/hooks/` (canonical source).
3. Cross-skill boundary under audit: FOUNDATIONS is the top-of-stack design contract; its cross-references shape downstream audit and reassessment behavior. Replacing archive-spec citations with current-doc paths keeps the authority chain coherent.
4. §Read Discipline (current-source-over-archived, per the spec's §Risks & Open Questions framing and FOUNDATIONS as authority document) motivates this ticket: FOUNDATIONS is itself subject to the discipline it documents. Restated: archive material is non-authoritative; FOUNDATIONS' design-reference citations must point to living current authorities (current docs, current source code, current configuration), not archived specs that represent historical decisions.

## Architecture Check

1. Replacing `archive/specs/SPEC-NN-*.md` citations with current-authority paths is structurally correct: FOUNDATIONS becomes self-consistent (no cross-references to non-authoritative locations), and future audits can trace the citation chain without ambiguity. Alternative considered: keep the archive citations and add a `(historical reference — superseded by ...)` marker — acceptable as a fallback when no current doc covers the equivalent surface, but for these three citations, each archived spec IS reasonably superseded.
2. No backwards-compatibility aliasing introduced. The replacement is a docs-only edit; no code surface depends on FOUNDATIONS citation paths.

## Verification Layers

1. FOUNDATIONS no longer cites `archive/specs/` for current design references → grep-proof: `grep -nE 'archive/specs/' docs/FOUNDATIONS.md` returns zero matches OR every match is annotated with `(historical reference — ...)`.
2. Replaced references resolve to existing current-authority paths → `test -f docs/MACHINE-FACING-LAYER.md docs/HARD-GATE-DISCIPLINE.md .claude/settings.json` returns success for all four; `test -d tools/world-mcp tools/patch-engine tools/hooks` returns success for all three.
3. No broken cross-references introduced in FOUNDATIONS → manual review of the 3 edited lines confirms the new paths resolve.

## What to Change

### 1. Replace line 537 (Retrieval MCP Server citation)

In `docs/FOUNDATIONS.md:537`, replace `archive/specs/SPEC-02-retrieval-mcp-server.md` with current-authority citations:
- Replace the trailing `See \`tools/world-mcp/\` and \`archive/specs/SPEC-02-retrieval-mcp-server.md\`.` with `See \`tools/world-mcp/\` and \`docs/MACHINE-FACING-LAYER.md\`.`

### 2. Replace line 538 (Patch Engine citation)

In `docs/FOUNDATIONS.md:538`, replace `archive/specs/SPEC-03-patch-engine.md` with current-authority citations:
- Replace the trailing `See \`tools/patch-engine/\` and \`archive/specs/SPEC-03-patch-engine.md\`.` with `See \`tools/patch-engine/\` and \`docs/HARD-GATE-DISCIPLINE.md\`.`

### 3. Replace line 540 (Hooks citation)

In `docs/FOUNDATIONS.md:540`, replace `archive/specs/SPEC-05-hooks-discipline.md` with current-authority citations:
- Replace the trailing `See \`tools/hooks/\` and \`archive/specs/SPEC-05-hooks-discipline.md\`.` with `See \`tools/hooks/\` and \`.claude/settings.json\`.`

### 4. Marker convention (optional, operator-judgment)

If any archive reference must remain elsewhere in FOUNDATIONS (e.g., for historical context where no current doc covers the equivalent surface), label it explicitly: `(historical reference — superseded by <current authority>)`. Step 2 verified no other `archive/specs/` references exist in FOUNDATIONS, so this is preventive guidance for future edits; the convention is documented at this ticket for posterity.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — 3 line edits at 537/538/540)

## Out of Scope

- Edits to other `docs/*.md` files — only FOUNDATIONS is in scope per spec D9.
- A grep-based doc-hygiene test (spec D9 step 3 explicitly notes this as optional and out-of-deliverable scope unless the operator chooses to add it).
- Edits to `archive/specs/` themselves — archived material is read-only.
- A broader audit of FOUNDATIONS for other stale cross-references — out of scope; only the 3 verified archive-spec citations are addressed.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'archive/specs/' docs/FOUNDATIONS.md` returns ZERO matches OR every match is annotated with `(historical reference — ...)`.
2. Each replaced reference points to a current-authority path that exists: `test -f docs/MACHINE-FACING-LAYER.md docs/HARD-GATE-DISCIPLINE.md` returns success; `test -d tools/world-mcp tools/patch-engine tools/hooks` returns success.
3. FOUNDATIONS parses cleanly as markdown (no broken section headers, no unclosed code blocks).

### Invariants

1. FOUNDATIONS as top-of-stack design contract cites only current authorities (current docs, current source code, current configuration files) for current-design references.
2. Future readers tracing FOUNDATIONS citations land on living, maintained surfaces.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'archive/specs/' docs/FOUNDATIONS.md` — sweep verification; expected zero unannotated matches.
2. `test -f docs/MACHINE-FACING-LAYER.md && test -f docs/HARD-GATE-DISCIPLINE.md && test -f .claude/settings.json` — replacement-path existence verification.
3. `test -d tools/world-mcp && test -d tools/patch-engine && test -d tools/hooks` — replacement-directory existence verification.
