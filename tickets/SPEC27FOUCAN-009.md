# SPEC27FOUCAN-009: Integration capstone — test lanes + stale-vocab sweep + cross-cutting docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md` (cross-cutting doc reconciliation). No production code; runs package test lanes for verification.
**Deps**: archive/tickets/SPEC27FOUCAN-001.md, archive/tickets/SPEC27FOUCAN-002.md, archive/tickets/SPEC27FOUCAN-003.md, SPEC27FOUCAN-004, SPEC27FOUCAN-005, SPEC27FOUCAN-006, SPEC27FOUCAN-007, SPEC27FOUCAN-008

## Problem

SPEC-27's amendments span the CF schema (D1), FOUNDATIONS structure (D2), `canon-addition` (D3), HARD-GATE discipline (D4), and the story-pipeline contract + skills (D5-D8). A final reconciliation pass is needed to confirm the validator and affected package test lanes pass, no stale `mystery_reserve` CF-status or retired-`.md`-filename residues remain, and `docs/WORKFLOWS.md` + `docs/MACHINE-FACING-LAYER.md` reflect the amended CF status enum and the rule-numbering map.

## Assumption Reassessment (2026-05-14)

1. `tools/validators`, `tools/world-index`, `tools/patch-engine`, and `tools/world-mcp` each expose `npm run build` + `npm test` (confirmed via the SPEC-27 spec-to-tickets Step 2 command-surface scan). `docs/WORKFLOWS.md` cites "Test 13" and CF-status terminology; `docs/MACHINE-FACING-LAYER.md` documents the validator framework and CF-status vocabulary — both must be checked against D1's amended enum and D2's rule-numbering map.
2. This ticket depends on `archive/tickets/SPEC27FOUCAN-001.md`, `archive/tickets/SPEC27FOUCAN-002.md`, `archive/tickets/SPEC27FOUCAN-003.md`, and SPEC27FOUCAN-004 through -008 having landed; it introduces no production code and exercises the surfaces those tickets produced. All eight `Deps` are tickets produced in this same decomposition run.
3. Shared boundary under audit: the full SPEC-27 amendment surface — the CF schema/type, the FOUNDATIONS §Validation Rules numbering, the story-pipeline contract + skills, and the two cross-cutting docs. This ticket verifies coherence across all of them; it owns no single deliverable's primary edit.
4. FOUNDATIONS principle under audit: the reconciliation confirms every SPEC-27 amendment (D1-D8) landed without leaving the doc set internally inconsistent — the spec's §Verification D9 contract.

## Architecture Check

1. A single trailing capstone is cleaner than per-ticket cross-cutting doc edits: `docs/WORKFLOWS.md` and `docs/MACHINE-FACING-LAYER.md` need all of D1-D8's surfaces to exist coherently before they can be reconciled in one breath (the CF-status enum, the rule-numbering map, the story-pipeline rules).
2. No backwards-compatibility aliasing — docs-and-verification only; no production code, no shims.

## Verification Layers

1. `tools/validators` + affected `tools/` package test lanes pass after D1-D8 land -> schema validation + test-lane run.
2. No `mystery_reserve` CF-status residue and no retired-`.md`-filename `required_world_updates` residue remain pipeline-wide -> codebase grep-proof.
3. `docs/WORKFLOWS.md` + `docs/MACHINE-FACING-LAYER.md` reflect the amended CF status enum and the rule-numbering map -> codebase grep-proof against the post-implementation tree + manual review.

## What to Change

### 1. Run the test lanes

- Run `npm test` in `tools/validators` and in any `tools/` package touched by D1 (`tools/world-index` for the `CanonFactStatus` change) and D6 (`tools/validators` for `story-page.schema.json` + `state-snapshot-replay.ts`). Confirm green.

### 2. Stale-vocabulary sweep

- `grep -rn "mystery_reserve"` pipeline-wide (`tools/`, `.claude/skills/`, `docs/`, `specs/`) — confirm no CF-`status` enum residue (only the separate `M-<integer>` record class should match). Grep for retired-`.md`-filename `required_world_updates` examples — confirm none remain. Apply any residue fixes found, naming the offending file.

### 3. WORKFLOWS.md reconciliation

- Reconcile `docs/WORKFLOWS.md` so its CF-status terminology and any rule/test references reflect D1's amended enum and D2's rule-numbering map (the "Test 13" reference is correct as a Test reference — confirm it is not mis-described as a Rule).

### 4. MACHINE-FACING-LAYER.md reconciliation

- Reconcile `docs/MACHINE-FACING-LAYER.md` so its validator-framework and CF-status descriptions reflect D1's amended enum.

## Files to Touch

- `docs/WORKFLOWS.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

Note: the test-lane runs and the stale-vocabulary sweep are verification actions, not file edits; any residue fix the sweep surfaces is applied to the offending file and named in the implementation summary.

## Out of Scope

- Re-implementing any D1-D8 deliverable — this ticket verifies and reconciles; it does not own a primary deliverable edit.
- Production code changes — docs + verification only.
- Editing `docs/FOUNDATIONS.md` — D1-D8 own all FOUNDATIONS edits.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes; `cd tools/world-index && npm test` passes.
2. `grep -rn "mystery_reserve" tools/ .claude/skills/ docs/ specs/` returns only `M-<integer>` Mystery Reserve record-class hits — no CF-`status` enum residue.
3. `grep -rn "INSTITUTIONS.md\|ECONOMY_AND_RESOURCES.md\|EVERYDAY_LIFE.md\|TIMELINE.md" docs/ .claude/skills/` returns no `required_world_updates` example residue.

### Invariants

1. After D1-D8 + this ticket, the CF-status vocabulary is consistent across `tools/`, `.claude/skills/`, and `docs/`.
2. `docs/WORKFLOWS.md` and `docs/MACHINE-FACING-LAYER.md` contain no CF-status or rule-numbering claim contradicted by the amended `docs/FOUNDATIONS.md`.

## Test Plan

### New/Modified Tests

1. `None — integration-capstone + cross-cutting-docs ticket; verification is test-lane runs + grep-proofs against the post-implementation tree. Test surface is owned by D1 (record_schema_compliance fixtures) and D6 (story-page.schema.json + state-snapshot-replay.test.ts).`

### Commands

1. `cd tools/validators && npm test && cd ../world-index && npm test`
2. `grep -rn "mystery_reserve" tools/ .claude/skills/ docs/ specs/`
3. `grep -rn "INSTITUTIONS.md\|ECONOMY_AND_RESOURCES.md\|EVERYDAY_LIFE.md\|TIMELINE.md" docs/ .claude/skills/`
