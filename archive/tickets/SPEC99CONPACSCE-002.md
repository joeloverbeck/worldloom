# SPEC99CONPACSCE-002: Docs scene-first closeout sweep

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — documentation only (`README.md`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/prose-renderer-contract/*`, `tools/{world-index,world-mcp,validators,story-explorer}/README.md`). No production code.
**Deps**: SPEC99CONPACSCE-001

## Problem

Live docs still present page-prose as a live story artifact and reference removed page-first specs after the scene-first cutover (SPEC-92..98). SPEC-99 §2 item 4 closes this out: describe the scene-first explorer + the `scene_coverage` packet layer, and stop pointing at page-prose as a live artifact or at SPEC-90 as an active prerequisite (its spec file is already removed; SPEC-98 carries its contract).

## Assumption Reassessment (2026-05-30)

1. Confirmed stale-live page-prose sites: `README.md:134-136` (the `pages-prose-plans / pages-prose / pages-prose-receipts` directory table, "Rendered prose supplied externally") and `README.md:440`; the dangling `tools/story-explorer/README.md:82` reference to the already-removed `specs/SPEC-90-story-explorer-branch-map-and-search.md` (`find` returns zero `SPEC-90*` files anywhere; `specs/IMPLEMENTATION-ORDER.md:5,49` confirm removal/supersession). The `scene_coverage` packet layer described here is produced by SPEC99CONPACSCE-001.
2. Per SPEC-99 §2 item 4 + AC#4/#5. Already-verified-clean (no edit needed, recorded so the closeout is auditable): `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md`, and `tools/patch-engine/README.md` all frame page-prose as read-only legacy / grandfathered; the §4.6 legacy receipt block in `story-record-schemas.md` is deliberately retained (live consumer `story-fact-promotion-to-canon`) and MUST NOT be deleted.
3. Cross-artifact boundary under audit: the docs describe surfaces owned by multiple tools (`world-index`, `world-mcp`, `validators`, `story-explorer`) plus the context-packet contract; the sweep must describe them coherently against the post-SPEC-98 + post-001 tree.
4. FOUNDATIONS §"Machine-facing layer documents its surfaces" (SPEC-99 §5 row 4): the sweep restores truthful alignment between the docs surface and the landed scene-first pipeline; no canon semantics are touched.

## Architecture Check

1. A single cross-cutting docs ticket lands the doc surface atomically once 001's layer exists, avoiding a staleness window where docs describe a `scene_coverage` layer that is not yet in the packet.
2. No shim: prose edits only; the §4.6 legacy receipt block is preserved (a documented live-consumer dependency, not a back-compat shim).

## Verification Layers

1. No live doc says rendered prose lives at `pages-prose/PG-N.md` -> grep-proof across the swept docs (archive / triage / legacy-marked blocks excepted).
2. No live doc names SPEC-90 as an active prerequisite; the dangling `story-explorer/README.md:82` reference is fixed -> grep-proof.
3. Swept docs describe the scene-first explorer + `scene_coverage` layer -> grep-proof for the new terms.

## What to Change

### 1. README.md

Replace the page-prose-as-live directory table (lines 134-136) and the `pages-prose/PG-<n>.md` reference (line 440) with scene-first artifact descriptions (`scene-prose*`); add the `scene_coverage` packet layer where the context packet is described.

### 2. docs/WORKFLOWS.md, docs/MACHINE-FACING-LAYER.md, docs/prose-renderer-contract/*

Triage each for page-prose-as-live framing and update to describe the scene-first explorer + `scene_coverage` layer. Files already reading scene-first-correct receive no edit (see Out of Scope).

### 3. tools/{world-index,world-mcp,validators,story-explorer}/README.md

Update per-tool READMEs to the scene-first explorer; fix the dangling SPEC-90 reference at `tools/story-explorer/README.md:82` (file removed; superseded by SPEC-98).

## Files to Touch

- `README.md` (modify)
- `docs/WORKFLOWS.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `docs/prose-renderer-contract/README.md` (modify)
- `docs/prose-renderer-contract/content-policy.md` (modify)
- `docs/prose-renderer-contract/prose-craft-contract.md` (modify)
- `docs/prose-renderer-contract/render-time-instruction.md` (modify)
- `tools/world-index/README.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/validators/README.md` (modify)
- `tools/story-explorer/README.md` (modify)

## Out of Scope

- `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/*`, `tools/patch-engine/README.md` — verified already scene-first-correct (SPEC-99 §2 item 4); no edit.
- Deleting the §4.6 legacy `pages-prose-receipts` block in `story-record-schemas.md` (live consumer `story-fact-promotion-to-canon`).
- Any swept-set file that already reads scene-first-correct receives no edit (the sweep is a removal of stale-live framing, not a forced touch of every listed path).
- Any production code, tests, or schema files.
- The packet layer itself (SPEC99CONPACSCE-001) and the health-audit consumer (SPEC99CONPACSCE-003).
- `docs/CONTEXT-PACKET-CONTRACT.md` — its scene-first edit (§6 `scene_coverage` layer doc) is owned by SPEC99CONPACSCE-001.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "pages-prose/PG" README.md docs/WORKFLOWS.md docs/MACHINE-FACING-LAYER.md docs/prose-renderer-contract/ tools/world-index/README.md tools/world-mcp/README.md tools/validators/README.md tools/story-explorer/README.md` returns no live "rendered prose lives here" framing (legacy-marked / archive context excepted).
2. `grep -n "SPEC-90" tools/story-explorer/README.md` returns no active-prerequisite reference.
3. `grep -rn "scene_coverage" README.md docs/MACHINE-FACING-LAYER.md` confirms the layer is described in the swept docs.

### Invariants

1. The §4.6 legacy `pages-prose-receipts` block in `story-record-schemas.md` remains intact (not deleted).
2. Docs-only: no production code / test / schema file changes.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "pages-prose/PG\|Rendered prose supplied" README.md docs/ tools/world-index/README.md tools/world-mcp/README.md tools/validators/README.md tools/story-explorer/README.md` (triage live vs legacy-marked)
2. `grep -n "SPEC-90" tools/story-explorer/README.md`
3. Docs are prose; grep-proofs are the correct verification boundary (there is no runnable test suite for markdown content).
