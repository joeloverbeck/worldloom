# PPLAN-009: Repair red-bunny PG-3 / PG-4 page-plan hash bridge drift

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — red-bunny PG-3 / PG-4 story-bundle page-plan hash bridge repair through engine-routed `PG.plan.plan_hash` / `state_hash` maintenance restamps
**Deps**: archive/tickets/PROSESPLIT2-006.md

## Problem

At intake, post-review of PROSESPLIT2-006 confirmed that the exact `page_plan_verbatim_section_integrity` drift was grandfathered, but the same review exposed a separate red-bunny integrity problem: `pages-prose-plans/PG-3.md` and `pages-prose-plans/PG-4.md` bytes did not match their committed `PG.plan.plan_hash` values.

Observed on 2026-05-26:

1. `sha256sum worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` reported `486916261e92900a8acbbbd1a4330bd82c03df6671066d1c9ab03e7e6605d6c0`, while `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` stamps `plan.plan_hash: 3e24c551af57046eaa74f0ca0156dd44f3cc02396d921d11cb8cf85107bc91f9`.
2. `sha256sum worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md` reported `de58a20196a2e83373a7c083ee6730d51fefe6368bdf39f7ec20bf82abedfdb1`, while `worlds/erotica-world/stories/red-bunny/_source/pages/PG-4.yaml` stamps `plan.plan_hash: cf949fc051310ffb6327878a33a28fc41ba7e55285efc0d4e313fdd5bb84d391`.

This was separate from PROSESPLIT2-006's verbatim-section grandfathering. A page plan can be intentionally grandfathered for historical §3 / §19 bytes and still need its committed PG hash bridge repaired.

## Assumption Reassessment (2026-05-26)

1. `archive/tickets/PROSESPLIT2-006.md` completed the exact-match grandfathering for `page_plan_verbatim_section_integrity` and deliberately left page-plan bytes untouched.
2. `docs/HARD-GATE-DISCIPLINE.md` and `.claude/skills/_shared-templates/story-state-contract.md` define `pages-prose-plans/PG-<integer>.md` as direct-write markdown, but `PG.plan.plan_hash` binds the committed PG record to those exact plan bytes.
3. Shared boundary: any repair must preserve the page-plan / PG-record hash bridge. If page-plan bytes change, the corresponding PG record must be restamped through the lawful patch-engine path; do not direct-edit `_source/pages/PG-*.yaml`.
4. Adjacent contradiction classification: the PG-3 / PG-4 hash mismatch is not unfinished work in PROSESPLIT2-006 because that ticket owned only the verbatim-section validator grandfathering. This ticket owns the hash-bridge repair.
5. Live reassessment chose the smallest lawful repair: preserve the current page-plan markdown bytes and restamp the PG records through the patch engine. `sha256sum` reported `486916261e92900a8acbbbd1a4330bd82c03df6671066d1c9ab03e7e6605d6c0` for PG-3 and `de58a20196a2e83373a7c083ee6730d51fefe6368bdf39f7ec20bf82abedfdb1` for PG-4 before and after repair. No page-plan body cleanup was required for this hash bridge repair.
6. The drafted `compute-pg-hashes` commands passed YAML PG paths, but the live CLI rejects YAML and requires JSON matching the patch-plan payload. Verification uses temporary JSON extracted from the current PG records (and, after submit, from the submitted envelope/repaired records), then compares the emitted hashes to the committed YAML fields.
7. Patch plan `/tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json` validated and submitted with `status: "pass"`. The plan class is schema/maintenance migration: it changes no story meaning, preserves existing plan bytes, and only repairs the recorded hash bridge.

## Architecture Check

1. Repairing the hash bridge preserves the story-state contract instead of normalizing plan-hash drift as acceptable historical noise.
2. No backwards-compatibility aliasing/shims are introduced; the existing hash contract remains authoritative.

## Verification Layers

1. PG-3 plan/hash bridge repaired -> `compute-pg-hashes` over a JSON PG payload reports `plan_hash` matching `PG-3.yaml` after repair.
2. PG-4 plan/hash bridge repaired -> `compute-pg-hashes` over a JSON PG payload reports `plan_hash` matching `PG-4.yaml` after repair.
3. `_source/pages/PG-3.yaml` / `PG-4.yaml` writes are engine-routed -> patch-engine validate/submit receipt confirms both files were written and index sync completed.

## Landed Changes

### 1. Reassess the repair strategy

Compared current PG-3 / PG-4 page-plan bytes, current stamped PG hashes, and the live `compute-pg-hashes` CLI shape. The chosen repair preserves current page-plan bytes and restamps the PG records.

### 2. Repair PG-3 and PG-4 hash bridges

Restamped `plan.plan_hash` and dependent `state_hash` through the patch engine for PG-3 and PG-4. Page-plan markdown remains unchanged.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` (engine-routed modify)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-4.yaml` (engine-routed modify)
- `worlds/erotica-world/_index/world.db` (ignored derived artifact refreshed when the engine/index path runs)
- `archive/tickets/PPLAN-009-red-bunny-pg3-pg4-plan-hash-bridge-repair.md` (modify — reassessment, closeout, and archival self-reference)

## Out of Scope

- Weakening hash checks, Hook 6, `compute-pg-hashes`, or `page_plan_verbatim_section_integrity`.
- Changing PROSESPLIT2-006's exact grandfather policy except if live reassessment proves the policy keys must move with an intentional page-plan repair.
- Broad red-bunny page-plan body cleanup beyond what is required to make the chosen PG-3 / PG-4 hash repair lawful and verifiable.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md --pg /tmp/worldloom-pplan-009/PG-3-post-submit.json` reports a `plan_hash` matching `PG-3.yaml`.
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md --pg /tmp/worldloom-pplan-009/PG-4-post-submit.json` reports a `plan_hash` matching `PG-4.yaml`.
3. The engine-routed PG restamp plan passes `validate_patch_plan` before approval/submission, and the submit receipt confirms the updated PG records and index sync.

### Invariants

1. Page-plan markdown remains a story-bundle artifact and does not claim world-canon authority.
2. `_source/pages/PG-3.yaml` and `_source/pages/PG-4.yaml` are not direct-edited.
3. Existing validator grandfathering remains exact-match only; unmatched/new page-plan drift still fails.

## Test Plan

### New/Modified Tests

1. None — live story-bundle hash-bridge repair; verification is command- and receipt-based.

### Commands

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json`
2. `node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json`
3. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json /tmp/worldloom-pplan-009/pplan-009-token.txt`
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md --pg /tmp/worldloom-pplan-009/PG-3-post-submit.json`
5. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md --pg /tmp/worldloom-pplan-009/PG-4-post-submit.json`

## Outcome

Completion date: 2026-05-26.

Submitted patch plan `/tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json` through the world-mcp patch-engine CLI after explicit user approval. The engine wrote `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` and `worlds/erotica-world/stories/red-bunny/_source/pages/PG-4.yaml`, refreshed the world index, and left the page-plan markdown bytes unchanged.

Final stamped values:

1. PG-3 `plan.plan_hash`: `486916261e92900a8acbbbd1a4330bd82c03df6671066d1c9ab03e7e6605d6c0`; `state_hash`: `3fe76d48d5995290c22fe19bfcd136e985bdc6a7b8f13966e34652526ca8e8f7`.
2. PG-4 `plan.plan_hash`: `de58a20196a2e83373a7c083ee6730d51fefe6368bdf39f7ec20bf82abedfdb1`; `state_hash`: `66654626c3302d1fa1eafcdd8e4c463ea30e20c6dc21b085d2fe3a780b6eae8b`.

## Verification Result

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json` — PASS; status `pass`, no verdicts.
2. `node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json` — PASS; token written to `/tmp/worldloom-pplan-009/pplan-009-token.txt`.
3. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/worldloom-pplan-009/pplan-009-red-bunny-pg3-pg4-hash-restamp.json /tmp/worldloom-pplan-009/pplan-009-token.txt` — PASS; receipt plan id `pplan-009-red-bunny-pg3-pg4-hash-restamp-2026-05-26`, files written PG-3 and PG-4, `index_sync_duration_ms: 757`.
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md --pg /tmp/worldloom-pplan-009/PG-3-post-submit.json` — PASS; emitted `plan_hash` and `state_hash` match `PG-3.yaml`.
5. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md --pg /tmp/worldloom-pplan-009/PG-4-post-submit.json` — PASS; emitted `plan_hash` and `state_hash` match `PG-4.yaml`.
6. `sha256sum worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-4.md` — PASS; page-plan bytes remain `486916261e92900a8acbbbd1a4330bd82c03df6671066d1c9ab03e7e6605d6c0` and `de58a20196a2e83373a7c083ee6730d51fefe6368bdf39f7ec20bf82abedfdb1`.
7. `sqlite3 worlds/erotica-world/_index/world.db "select node_id, content_hash from nodes where node_id in ('red-bunny:PG-3','red-bunny:PG-4') order by node_id;"` — PASS; index rows now carry `ab71e654ecf51582a17ede028e64d13e16207ae6742d524d59ddb6904c3ebc27` for PG-3 and `13b89e21127e351633abb5d8cab3389a33071d8f036e2ac5ef567eeffa5e703e` for PG-4, matching the submit receipt.

## Deviations

- The drafted `compute-pg-hashes --pg <yaml>` proof was corrected because the live CLI requires JSON PG input. Temporary JSON files under `/tmp/worldloom-pplan-009/` were used for hash proof.
- `worlds/erotica-world/` is gitignored in this checkout. The repaired PG records and refreshed `_index/world.db` were verified directly by file reads, hash commands, the patch-engine receipt, and SQLite queries rather than tracked `git diff`.
- Pre-existing unrelated dirty path `.claude/worktrees/spec89stoexpsta` was left untouched.
