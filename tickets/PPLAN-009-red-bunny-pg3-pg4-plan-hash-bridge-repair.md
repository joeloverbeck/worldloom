# PPLAN-009: Repair red-bunny PG-3 / PG-4 page-plan hash bridge drift

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — red-bunny PG-3 / PG-4 story-bundle page-plan hash bridge repair, likely including engine-routed `PG.plan.plan_hash` / `state_hash` restamps after any page-plan body repair
**Deps**: archive/tickets/PROSESPLIT2-006.md

## Problem

Post-review of PROSESPLIT2-006 confirmed that the exact `page_plan_verbatim_section_integrity` drift is now grandfathered, but the same review exposed a separate red-bunny integrity problem: `pages-prose-plans/PG-3.md` and `pages-prose-plans/PG-4.md` bytes do not match their committed `PG.plan.plan_hash` values.

Observed on 2026-05-26:

1. `sha256sum worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` reported `486916261e92900a8acbbbd1a4330bd82c03df6671066d1c9ab03e7e6605d6c0`, while `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` stamps `plan.plan_hash: 3e24c551af57046eaa74f0ca0156dd44f3cc02396d921d11cb8cf85107bc91f9`.
2. `sha256sum worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md` reported `de58a20196a2e83373a7c083ee6730d51fefe6368bdf39f7ec20bf82abedfdb1`, while `worlds/erotica-world/stories/red-bunny/_source/pages/PG-4.yaml` stamps `plan.plan_hash: cf949fc051310ffb6327878a33a28fc41ba7e55285efc0d4e313fdd5bb84d391`.

This is separate from PROSESPLIT2-006's verbatim-section grandfathering. A page plan can be intentionally grandfathered for historical §3 / §19 bytes and still need its committed PG hash bridge repaired.

## Assumption Reassessment (2026-05-26)

1. `archive/tickets/PROSESPLIT2-006.md` completed the exact-match grandfathering for `page_plan_verbatim_section_integrity` and deliberately left page-plan bytes untouched.
2. `docs/HARD-GATE-DISCIPLINE.md` and `.claude/skills/_shared-templates/story-state-contract.md` define `pages-prose-plans/PG-<integer>.md` as direct-write markdown, but `PG.plan.plan_hash` binds the committed PG record to those exact plan bytes.
3. Shared boundary: any repair must preserve the page-plan / PG-record hash bridge. If page-plan bytes change, the corresponding PG record must be restamped through the lawful patch-engine path; do not direct-edit `_source/pages/PG-*.yaml`.
4. Adjacent contradiction classification: the PG-3 / PG-4 hash mismatch is not unfinished work in PROSESPLIT2-006 because that ticket owned only the verbatim-section validator grandfathering. This ticket owns the hash-bridge repair.
5. Implementation must decide during live reassessment whether to restore plan bytes to the already-stamped hash, preserve current plan bytes and restamp PG records, or combine minimal plan-body validator cleanup with a lawful hash restamp. The chosen path must be recorded before source edits.

## Architecture Check

1. Repairing the hash bridge preserves the story-state contract instead of normalizing plan-hash drift as acceptable historical noise.
2. No backwards-compatibility aliasing/shims are introduced; the existing hash contract remains authoritative.

## Verification Layers

1. PG-3 plan/hash bridge repaired -> `compute-pg-hashes` reports `plan_hash` matching `PG-3.yaml` after repair.
2. PG-4 plan/hash bridge repaired -> `compute-pg-hashes` reports `plan_hash` matching `PG-4.yaml` after repair.
3. `_source/pages/PG-3.yaml` / `PG-4.yaml` writes, if needed, are engine-routed -> patch-engine validate/submit receipt or an explicit no-PG-write rationale.

## What to Change

### 1. Reassess the repair strategy

Compare current PG-3 / PG-4 page-plan bytes, current validator failures, and stamped PG hashes. Choose the smallest lawful repair strategy that leaves both page plans hash-consistent with their PG records.

### 2. Repair PG-3 and PG-4 hash bridges

If page-plan markdown changes, recompute and restamp `plan.plan_hash` and dependent `state_hash` through the patch engine. If the markdown does not change, repair only the PG records needed to make the stamped hash match the current bytes, again through the patch engine.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` (modify, if the chosen repair changes plan bytes)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md` (modify, if the chosen repair changes plan bytes)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` (engine-routed modify, if hash restamp is needed)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-4.yaml` (engine-routed modify, if hash restamp is needed)
- `worlds/erotica-world/_index/world.db` (ignored derived artifact refreshed when the engine/index path runs)

## Out of Scope

- Weakening hash checks, Hook 6, `compute-pg-hashes`, or `page_plan_verbatim_section_integrity`.
- Changing PROSESPLIT2-006's exact grandfather policy except if live reassessment proves the policy keys must move with an intentional page-plan repair.
- Broad red-bunny page-plan body cleanup beyond what is required to make the chosen PG-3 / PG-4 hash repair lawful and verifiable.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` reports a `plan_hash` matching `PG-3.yaml`.
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-4.yaml` reports a `plan_hash` matching `PG-4.yaml`.
3. Any engine-routed PG restamp plan passes `validate_patch_plan` before approval/submission, and the submit receipt confirms the updated PG records and index sync.

### Invariants

1. Page-plan markdown remains a story-bundle artifact and does not claim world-canon authority.
2. `_source/pages/PG-3.yaml` and `_source/pages/PG-4.yaml` are not direct-edited.
3. Existing validator grandfathering remains exact-match only; unmatched/new page-plan drift still fails.

## Test Plan

### New/Modified Tests

1. None — live story-bundle hash-bridge repair; verification is command- and receipt-based.

### Commands

1. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml`
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-4.yaml`
3. Patch-engine validate/submit commands for any required PG restamp plan, recorded with the exact plan paths used.
