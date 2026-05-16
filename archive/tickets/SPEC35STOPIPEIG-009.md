# SPEC35STOPIPEIG-009: Replace FOUNDATIONS archive-spec references with current-doc citations

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — docs/ticket closeout only (`docs/FOUNDATIONS.md`)
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D9

## Problem

`docs/FOUNDATIONS.md` cites three archived specs as design references in the §Machine-Facing Layer section:

- Line 537: `archive/specs/SPEC-02-retrieval-mcp-server.md` (Retrieval MCP Server)
- Line 538: `archive/specs/SPEC-03-patch-engine.md` (Patch Engine)
- Line 540: `archive/specs/SPEC-05-hooks-discipline.md` (Hooks)

The eighth-iteration audit prompt explicitly treats archived specs as non-authoritative; FOUNDATIONS as the top-of-stack authority document should not lean on archived references for current design. Each archived spec is reasonably superseded by current docs/code paths. At implementation time, the hooks configuration authority was corrected from the drafted `.claude/settings.json` path to the tracked `.claude/settings.json.example` plus `tools/hooks/README.md`; this checkout only has `.claude/settings.local.json` as a local, untracked project override.

## Assumption Reassessment (2026-05-16)

1. `docs/FOUNDATIONS.md` lines 537/538/540 cite `archive/specs/SPEC-02/03/05`. Verified at Step 1 audit-phase Read; the cited lines and content match.
2. Current authority replacements available:
   - SPEC-02 (Retrieval MCP Server) → `docs/MACHINE-FACING-LAYER.md` (operational overview) + `tools/world-mcp/` (canonical source).
   - SPEC-03 (Patch Engine) → `docs/HARD-GATE-DISCIPLINE.md` (operational discipline) + `tools/patch-engine/` (canonical source).
   - SPEC-05 (Hooks) → `.claude/settings.json.example` (tracked configuration example) + `tools/hooks/` and `tools/hooks/README.md` (canonical source and operational inventory). The drafted `.claude/settings.json` path is absent in this checkout; `.claude/settings.local.json` is user-local override state, not a tracked authority citation.
3. Cross-skill boundary under audit: FOUNDATIONS is the top-of-stack design contract; its cross-references shape downstream audit and reassessment behavior. Replacing archive-spec citations with current-doc paths keeps the authority chain coherent.
4. §Read Discipline (current-source-over-archived, per the spec's §Risks & Open Questions framing and FOUNDATIONS as authority document) motivates this ticket: FOUNDATIONS is itself subject to the discipline it documents. Restated: archive material is non-authoritative; FOUNDATIONS' design-reference citations must point to living current authorities (current docs, current source code, current configuration), not archived specs that represent historical decisions.

## Architecture Check

1. Replacing `archive/specs/SPEC-NN-*.md` citations with current-authority paths is structurally correct: FOUNDATIONS becomes self-consistent (no cross-references to non-authoritative locations), and future audits can trace the citation chain without ambiguity. Alternative considered: keep the archive citations and add a `(historical reference — superseded by ...)` marker — acceptable as a fallback when no current doc covers the equivalent surface, but for these three citations, each archived spec IS reasonably superseded.
2. No backwards-compatibility aliasing introduced. The replacement is a docs-only edit; no code surface depends on FOUNDATIONS citation paths.

## Verification Layers

1. FOUNDATIONS no longer cites `archive/specs/` for current design references → grep-proof: `grep -nE 'archive/specs/' docs/FOUNDATIONS.md` returns zero matches OR every match is annotated with `(historical reference — ...)`.
2. Replaced references resolve to existing current-authority paths → `test -f docs/MACHINE-FACING-LAYER.md docs/HARD-GATE-DISCIPLINE.md .claude/settings.json.example tools/hooks/README.md` returns success for all four; `test -d tools/world-mcp tools/patch-engine tools/hooks` returns success for all three.
3. No broken cross-references introduced in FOUNDATIONS → manual review of the 3 edited lines confirms the new paths resolve.

## Landed Changes

### 1. Replaced Retrieval MCP Server citation

In `docs/FOUNDATIONS.md`, replaced `archive/specs/SPEC-02-retrieval-mcp-server.md` with current-authority citations: `tools/world-mcp/` and `docs/MACHINE-FACING-LAYER.md`.

### 2. Replaced Patch Engine citation

In `docs/FOUNDATIONS.md`, replaced `archive/specs/SPEC-03-patch-engine.md` with current-authority citations: `tools/patch-engine/` and `docs/HARD-GATE-DISCIPLINE.md`.

### 3. Replaced Hooks citation

In `docs/FOUNDATIONS.md`, replaced `archive/specs/SPEC-05-hooks-discipline.md` with current-authority citations: `tools/hooks/`, `tools/hooks/README.md`, and `.claude/settings.json.example`.

### 4. Marker convention not needed

No `archive/specs/` reference remains in `docs/FOUNDATIONS.md`, so no historical-reference marker was needed.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — 3 line edits at the Machine-Facing Layer list)
- `archive/tickets/SPEC35STOPIPEIG-009.md` (modify — live-path mismatch correction and closeout)

## Out of Scope

- Edits to other `docs/*.md` files — only FOUNDATIONS is in scope per spec D9.
- A grep-based doc-hygiene test (spec D9 step 3 explicitly notes this as optional and out-of-deliverable scope unless the operator chooses to add it).
- Edits to `archive/specs/` themselves — archived material is read-only.
- A broader audit of FOUNDATIONS for other stale cross-references — out of scope; only the 3 verified archive-spec citations are addressed.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'archive/specs/' docs/FOUNDATIONS.md` returns ZERO matches OR every match is annotated with `(historical reference — ...)`.
2. Each replaced reference points to a current-authority path that exists: `test -f docs/MACHINE-FACING-LAYER.md docs/HARD-GATE-DISCIPLINE.md .claude/settings.json.example tools/hooks/README.md` returns success; `test -d tools/world-mcp tools/patch-engine tools/hooks` returns success.
3. FOUNDATIONS parses cleanly as markdown (no broken section headers, no unclosed code blocks).

### Invariants

1. FOUNDATIONS as top-of-stack design contract cites only current authorities (current docs, current source code, current configuration files) for current-design references.
2. Future readers tracing FOUNDATIONS citations land on living, maintained surfaces.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'archive/specs/' docs/FOUNDATIONS.md` — sweep verification; expected zero unannotated matches.
2. `test -f docs/MACHINE-FACING-LAYER.md && test -f docs/HARD-GATE-DISCIPLINE.md && test -f .claude/settings.json.example && test -f tools/hooks/README.md` — replacement-path existence verification.
3. `test -d tools/world-mcp && test -d tools/patch-engine && test -d tools/hooks` — replacement-directory existence verification.

## Outcome

Completed on 2026-05-16.

`docs/FOUNDATIONS.md` no longer cites archived SPEC-02, SPEC-03, or SPEC-05 as current Machine-Facing Layer design authorities. Retrieval MCP now cites `tools/world-mcp/` plus `docs/MACHINE-FACING-LAYER.md`; Patch Engine now cites `tools/patch-engine/` plus `docs/HARD-GATE-DISCIPLINE.md`; Hooks now cites `tools/hooks/`, `tools/hooks/README.md`, and `.claude/settings.json.example`.

## Verification Result

1. `grep -nE 'archive/specs/' docs/FOUNDATIONS.md` — exited 1 with no output, confirming zero remaining `archive/specs/` references in FOUNDATIONS.
2. `test -f docs/MACHINE-FACING-LAYER.md && test -f docs/HARD-GATE-DISCIPLINE.md && test -f .claude/settings.json.example && test -f tools/hooks/README.md` — passed.
3. `test -d tools/world-mcp && test -d tools/patch-engine && test -d tools/hooks` — passed.
4. Manual review of the edited Machine-Facing Layer list confirmed all three replacement citations are current tracked paths.

## Deviations

- The drafted hook replacement path `.claude/settings.json` does not exist in this checkout. The landed current-authority citation uses the tracked `.claude/settings.json.example` plus `tools/hooks/README.md`; `.claude/settings.local.json` remains user-local override state and is not cited as a tracked authority.
