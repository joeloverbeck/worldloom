# CTXPKT-001: Context-packet active-state projections leak superseded clock/thread/secret records

**Status**: ✅ COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (context-packet story-bundle projection); affects every story-pipeline skill that reads `story_bundle_context` / `story_bundle_context_summary` (commitment-block-authoring, turn-cycle, health-audit, scene-plan).
**Deps**: None

## Problem

While exercising `commitment-block-authoring` on `worlds/erotica-world/stories/red-bunny`, the `get_context_packet` response reported `story_bundle_context_summary.active_clock_ids: ["CLK-1", "CLK-2"]`, but the authoritative latest-page snapshot `PG-3.state_snapshot.active_records.CLK` is `["CLK-2"]` only. CLK-2 carries `supersedes: CLK-1`; CLK-1 was superseded at PG-2 ("Dusk over the isolated park" supersedes "the failing light"). The projection surfaces a **superseded record as active**.

This matters directly for this skill's Phase 1: coverage target #12 (clock-advancing) and SPEC-80 §3.2 pressure-source-class coverage read the active-clock set to decide whether the SLT pool covers active `CLK` pressure. A leaked superseded clock inflates the active-clock set, can mislead coverage diagnosis, and could induce an author to ground a block on a stale clock. The same defect risks turn-cycle eligibility prefiltering and health-audit inertness/coverage findings.

Root cause is a missing supersession filter in three of the active-state builders.

## Assumption Reassessment (2026-05-29)

1. **Codebase**: `tools/world-mcp/src/context-packet/story-bundle-context.ts` defines `supersededRecordIds(rows)` (line 487). `buildActiveActorPlans` (line 503) and `buildActiveEmotionalStates` (line 528) compute `supersededIds` and filter `!supersededIds.has(id)`. `buildActiveThreads` (line 550), `buildActiveClocks` (line 564), and `buildHiddenSecrets` (line 581) filter ONLY on a status set and do **not** exclude superseded ids. `active_clock_ids` is projected at line 796 from `buildActiveClocks`.
2. **Data confirming the leak**: `worlds/erotica-world/stories/red-bunny/_source/clocks/CLK-1.yaml` has `status: active`, `supersedes: null`; `CLK-2.yaml` has `status: active`, `supersedes: CLK-1`. `ACTIVE_CLOCK_STATUSES = {"active","paused"}` (line 45), so both records pass the status-only filter and both appear. Supersession does not flip the superseded record's own `status` field — it is tracked by the successor's `supersedes` pointer and by the PG snapshot — so the status-only filter is structurally insufficient.
3. **Shared boundary under audit**: the `ContextPacketStoryBundleContext` active-state projection (consumed via `story_bundle_context` and `story_bundle_context_summary`, per `docs/CONTEXT-PACKET-CONTRACT.md`) versus the replay-checked `PG.state_snapshot.active_records` (the authoritative active set per `story-record-schemas.md` §4.2). These two views of "active records" must agree on supersession.
4. **FOUNDATIONS principle**: append-only + deliberate supersession discipline (Core Rules: "Never delete or overwrite an existing atomic record … mutation happens via supersession"). A "currently active" projection that includes a record whose successor exists violates the same supersession semantics that `snapshot_replay_equality` enforces on PG snapshots; the projection must reflect the latest superseding record only.
8. **Adjacent contradictions**: `buildActiveThreads` and `buildHiddenSecrets` share the identical omission. No bundle currently exercises a superseded THR/STSEC with a still-`active`/`hidden` status, so the leak is latent there but is the same defect and should be fixed in the same change (classified as a required consequence, not a separate ticket).

## Architecture Check

1. The fix reuses the existing `supersededRecordIds(rows)` helper already applied by two sibling builders — it makes all five active-state builders apply one consistent supersession rule, rather than adding a new mechanism. Cleaner than flipping superseded records' `status` on disk (which would violate append-only and require a migration).
2. No backwards-compatibility shim: the three builders gain the same `!supersededIds.has(id)` filter the other two already use; no alias path, no dual-read.

## Verification Layers

1. Superseded clock excluded from projection -> skill dry-run (`get_context_packet` on red-bunny returns `active_clock_ids: ["CLK-2"]`, not `["CLK-1","CLK-2"]`).
2. Projection agrees with replay-checked snapshot -> codebase grep-proof (`buildActiveClocks`/`buildActiveThreads`/`buildHiddenSecrets` each call `supersededRecordIds` and filter, matching `buildActiveActorPlans`).
3. No regression to status filtering -> schema validation (existing context-packet unit tests for active-state builders pass).
4. FOUNDATIONS supersession discipline upheld -> FOUNDATIONS alignment check (Core Rules append-only/supersession; parity with `snapshot_replay_equality`).

## What to Change

### 1. Apply supersession filter to the three remaining builders

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, add `const supersededIds = supersededRecordIds(rows);` to `buildActiveThreads`, `buildActiveClocks`, and `buildHiddenSecrets`, and add `!supersededIds.has(id)` to each `.filter(...)` predicate (computing `id` via `asString(record.id, authoredId(row))` as the sibling builders do).

### 2. Regression coverage

Add a unit test that feeds a superseded-with-active-status clock pair (CLK-1 active + CLK-2 active/supersedes CLK-1) and asserts only CLK-2 projects; mirror for THR and STSEC.

## Files to Touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/src/context-packet/*.test.ts` (new/modify — superseded-record projection test)

## Out of Scope

- Relationship/status/object/location builders (verify in passing but only fix if the same omission is proven there).
- Any change to PG snapshot authoring or `snapshot_replay_equality`.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: superseded-but-status-active CLK/THR/STSEC records are excluded from their active projections.
2. `get_context_packet(task_type='commitment_block_authoring', world_slug='erotica-world', story_slug='red-bunny', seed_nodes=['M-3'])` returns `story_bundle_context_summary.active_clock_ids` equal to the PG-3 snapshot CLK set (`["CLK-2"]`).
3. Full context-packet test suite passes.

### Invariants

1. For every active-state projection field, a record whose id appears in any sibling's `supersedes` is excluded.
2. The context-packet active-record projection set for a class equals the latest-page `PG.state_snapshot.active_records` set for that class (modulo class coverage), for the longest active branch path.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/src/context-packet/story-bundle-context.test.ts` — assert superseded clock/thread/secret exclusion (rationale: locks the supersession invariant across all active-state builders).

### Commands

1. `npm --prefix tools/world-mcp test` (targeted context-packet suite)
2. After rebuild: re-run the red-bunny `get_context_packet` dry-run and diff `active_clock_ids` against `get_records_field(['PG-3'], ['state_snapshot','active_records','CLK'])`.


## Outcome

**Completed**: 2026-05-29

### What changed

- `tools/world-mcp/src/context-packet/story-bundle-context.ts`: added `const supersededIds = supersededRecordIds(rows);` to `buildActiveThreads`, `buildActiveClocks`, and `buildHiddenSecrets`, and rewrote each `.filter(...)` predicate to compute `id` via `asString(record.id, authoredId(row))` and exclude `supersededIds.has(id)` — matching the existing `buildActiveActorPlans` / `buildActiveEmotionalStates` siblings. All five active-state builders now apply one consistent supersession rule.
- The three builders were promoted from module-private to `export function` (matching the two already-exported siblings) so the regression test can drive them directly with no new mechanism.
- New test `tools/world-mcp/tests/context-packet/active-state-supersession.test.ts`: feeds superseded-with-active-status CLK/THR/STSEC pairs and asserts only the superseding record projects, plus a status-filter-retained control.

### Deviations

- Test placed in a new dedicated file (`active-state-supersession.test.ts`) rather than appended to `story-bundle-context.test.ts`; the existing file is a single large fixture-driven assertion and a focused unit test against the exported builders is cleaner and more isolated. Invariant coverage is identical to the ticket request.

### Verification

- `npm --prefix tools/world-mcp run build` (tsc typecheck) — clean.
- New supersession suite: 4/4 pass.
- Full context-packet suite: 66/66 pass. Full world-mcp suite: 513/513 pass.
- `get_records_field([PG-3], [state_snapshot,active_records,CLK])` on red-bunny returns `["CLK-2"]`, confirming the authoritative target the projection must now match. The live `get_context_packet` MCP call still reports `["CLK-1","CLK-2"]` only because the connected MCP server process predates the rebuild and does not reload `dist/` mid-session; the rebuilt-and-tested projection logic produces `["CLK-2"]` and will surface on the next server restart.
