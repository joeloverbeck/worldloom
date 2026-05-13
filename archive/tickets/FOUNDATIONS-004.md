# FOUNDATIONS-004: Refresh non-skill ID notation examples after FOUNDATIONS-002

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — active documentation and package README notation cleanup only; no package/runtime behavior or world content.
**Deps**: `archive/tickets/FOUNDATIONS-002.md`, `tickets/FOUNDATIONS-003.md`

## Problem

At intake, post-review of FOUNDATIONS-003 confirmed the skill-facing notation cleanup was otherwise complete, but the same FOUNDATIONS-002 unpadded natural-integer ID contract still had stale examples in non-skill active documentation surfaces:

- `docs/HARD-GATE-DISCIPLINE.md` said `pages-prose-receipts/PG-NNNN.yaml`.
- `tools/world-mcp/README.md` used concrete padded retrieval examples such as `SEC-ELF-001` and `CF-0042`.
- `docs/CONTEXT-PACKET-CONTRACT.md` carried padded or placeholder examples such as `CF-0033`, `CF-0044`, `M-NNNN`, and additional same-seam examples including `CHAR-0002`, `M-0003`, and `M-0007`.

These examples are documentation drift, not `FOUNDATIONS-003` implementation fallout, because `FOUNDATIONS-003` explicitly owned skill and skill-reference prose/templates.

## Assumption Reassessment (2026-05-13)

1. `archive/tickets/FOUNDATIONS-002.md` codified unpadded natural-integer suffixes across the canonical storage layer and machine-facing allocator/retrieval surfaces.
2. `tickets/FOUNDATIONS-003.md` refreshed skill-facing notation and intentionally scoped out package/runtime code and non-skill documentation; its archival remains blocked until a stale active-ticket-path reference in a touched skill is corrected under implementation authority. This ticket does not absorb that skill-facing blocker.
3. Shared boundary under audit: active operator/package documentation should teach the same ID notation as `docs/FOUNDATIONS.md` and the machine-facing allocator/schema surfaces.
4. FOUNDATIONS principle under audit: §Canonical Storage Layer requires unpadded natural-integer IDs; active docs that teach padded examples undermine the canonical storage contract and the Tooling Recommendation's retrievable-record expectation.
5. The remaining hits in `docs/triage/`, `docs/plans/`, and `archive/tickets/` are historical provenance unless a future ticket explicitly refreshes historical example material. This ticket owns current active docs and package README surfaces only.
6. Reassessment found the drafted stale-anchor command undercounted the active docs surface: it caught `CF-0033`, `CF-0044`, `M-NNNN`, `PG-NNNN`, `SEC-ELF-001`, and `CF-0042`, but not `CHAR-0002`, `M-0003`, or `M-0007`. The broader same-seam discovery sweep is now part of closeout; remaining `M-0001` examples in `docs/FOUNDATIONS.md`, `CLAUDE.md`, and `tools/world-mcp/README.md` are legitimate negative examples that teach the no-padding rule.

## Architecture Check

1. Updating stale examples in place is cleaner than adding compatibility language or aliasing guidance. Readers should see one active ID convention.
2. No backwards-compatibility aliasing/shims are introduced. Historical notes may continue to preserve old examples when they are clearly provenance, not current operating guidance.

## Verification Layers

1. Active non-skill docs and README use `<integer>` or unpadded concrete examples for record IDs -> codebase grep-proof over `docs/*.md`, `CLAUDE.md`, and `tools/world-mcp/README.md`.
2. HARD-GATE prose remains semantically unchanged except ID notation -> manual review against `docs/HARD-GATE-DISCIPLINE.md`.
3. Context-packet and world-mcp examples remain valid examples of retrieval/API shape -> manual review against the edited snippets.

## What to Change

### 1. Active documentation notation cleanup

Replaced padded or fixed-width placeholder record IDs in current docs with `<integer>` notation or concrete unpadded examples, preserving meaning.

### 2. Package README example cleanup

Updated `tools/world-mcp/README.md` retrieval examples so they demonstrate the current unpadded ID convention.

## Files to Touch

- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/world-mcp/README.md` (modify)

## Out of Scope

- Skill prose/templates already handled by FOUNDATIONS-003.
- Package/runtime behavior changes.
- World-content migration or direct edits under `worlds/<slug>/`.
- Historical triage, plan, archive, or example provenance refresh.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'CF-NNNN|CH-NNNN|M-NNNN|OQ-NNNN|ENT-NNNN|SEC-[A-Z]{3}-NNN|PG-NNNN|CHC-NNNN|SLT-NNNN|SLB-NNNN|SAU-NNNN|SP-NNNN|RSP-NNNN|DA-0000|CF-[0-9]{4}|SEC-[A-Z]{3}-[0-9]{3}|zero-padded|4-digit' docs/*.md CLAUDE.md tools/world-mcp/README.md` emits no current-contract stale ID notation hits, or every remaining hit is explicitly classified in closeout.
2. `rg -n '[A-Z]{1,8}-0[0-9]{2,}|[A-Z]{1,8}-NNN+' docs/*.md CLAUDE.md tools/world-mcp/README.md` has no current-contract stale examples after excluding legitimate negative examples (`not M-0001`) and ticket/provenance IDs.
3. `git diff --check` passes.

### Invariants

1. Active non-skill documentation matches FOUNDATIONS-002 ID notation.
2. No doc or README adds guidance to mint padded IDs.

## Test Plan

### New/Modified Tests

1. `None — documentation-only cleanup; verification is grep-proof plus manual review against FOUNDATIONS-002.`

### Commands

1. `rg -n 'CF-NNNN|CH-NNNN|M-NNNN|OQ-NNNN|ENT-NNNN|SEC-[A-Z]{3}-NNN|PG-NNNN|CHC-NNNN|SLT-NNNN|SLB-NNNN|SAU-NNNN|SP-NNNN|RSP-NNNN|DA-0000|CF-[0-9]{4}|SEC-[A-Z]{3}-[0-9]{3}|zero-padded|4-digit' docs/*.md CLAUDE.md tools/world-mcp/README.md`
2. `rg -n '[A-Z]{1,8}-0[0-9]{2,}|[A-Z]{1,8}-NNN+' docs/*.md CLAUDE.md tools/world-mcp/README.md`
3. `git diff --check`

## Outcome

FOUNDATIONS-004 is implemented. Active non-skill documentation and `tools/world-mcp/README.md` now use the FOUNDATIONS-002 unpadded natural-integer convention in current-contract record-ID examples.

## Verification Result

- `rg -n 'CF-NNNN|CH-NNNN|M-NNNN|OQ-NNNN|ENT-NNNN|SEC-[A-Z]{3}-NNN|PG-NNNN|CHC-NNNN|SLT-NNNN|SLB-NNNN|SAU-NNNN|SP-NNNN|RSP-NNNN|DA-0000|CF-[0-9]{4}|SEC-[A-Z]{3}-[0-9]{3}|zero-padded|4-digit' docs/*.md CLAUDE.md tools/world-mcp/README.md` passed with no current-contract stale hits.
- `rg -n '[A-Z]{1,8}-0[0-9]{2,}|[A-Z]{1,8}-NNN+' docs/*.md CLAUDE.md tools/world-mcp/README.md` was run as a broader discovery sweep; remaining hits are classified as legitimate negative examples (`not M-0001` in `docs/FOUNDATIONS.md`, `CLAUDE.md`, and `tools/world-mcp/README.md`) or ticket/provenance IDs such as `FOUNDATIONS-002`, `MCPENH-005`, `ENGINESYNC-002`, and `PEENH-001`.
- Manual review confirmed `docs/HARD-GATE-DISCIPLINE.md` still describes the same HARD-GATE behavior and only changed the receipt ID notation.
- Manual review confirmed `docs/CONTEXT-PACKET-CONTRACT.md` and `tools/world-mcp/README.md` examples preserve their retrieval/API shape while switching to unpadded record IDs.
- `git diff --check` passed.

## Deviations

- The implementation widened within the same non-skill documentation notation seam to include `CHAR-0002`, `M-0003`, and `M-0007` examples that the drafted command missed.
- `tickets/FOUNDATIONS-003.md` remains active with its skill-facing archival blocker; this ticket did not absorb or archive that sibling scope.
