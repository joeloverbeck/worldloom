# SPEC116MANSTOSTU-002: Dependency-scoped health gating + compose-doc presence + manuscript freshness

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` health pass (`compute.ts`, `types.ts`) and gate (`health-gate.ts`). No impact on canon pipeline (the package is canon-fenced).
**Deps**: None

## Problem

Manual Studio's health gating is all-or-nothing and skips compose preconditions:

- When status is `blocked`, **all four** actions are blocked together (`src/health/compute.ts:45` — `blocked_actions: status === "blocked" ? ALL_BLOCKED_ACTIONS : []`). A blocking finding isolated to one surface (e.g. a corrupt prompt input) needlessly blocks `segment_save` and `manuscript_compile`, which do not depend on it. Report §22: "block only actions that depend on the broken surface."
- Health does not validate the content-policy and prose-craft-contract documents the composer hard-requires (`composePrompt` throws at compose time — `src/prompt/compose.ts:226-241` — when `docs/prose-renderer-contract/content-policy.md` or `docs/manual-story-studio/prose-craft-contract.md` is absent), nor manuscript freshness against `segment_order`.

This ticket replaces the global gate with a per-action dependency map, promotes the compose-required-doc presence to actionable health findings (blocking the prompt actions only), and adds a non-blocking manuscript-freshness finding.

## Assumption Reassessment (2026-06-02)

1. `computeHealth` is all-or-nothing — confirmed at `src/health/compute.ts:45`. `deriveHealthStatus` (`src/health/types.ts:25-37`) returns `blocked` on any `blocking`-severity finding, `degraded` on any `error`. `blocked_actions` is already typed `BlockedAction[]` (`types.ts:22`) and `blockIfHealthDisallows` (`src/server/health-gate.ts:12`) already checks `report.blocked_actions.includes(action)` — so the gate consumes a per-action set with no logic change. `computeHealth(manualStoryRoot: string)` takes no `repoRoot` (`compute.ts:34`); the compose-required docs live at repo level (`compose.ts:36-39`).
2. SPEC-116 §2 items 2/3/4 (as reassessed 2026-06-02) direct: per-action dependency map; content-policy / prose-craft presence findings blocking prompt actions only; non-blocking manuscript-freshness finding. Item 3's `repoRoot` access is resolved (Q2=(a), 2026-06-02) by deriving `repoRoot` inside `computeHealth` via `path.resolve(manualStoryRoot, "../../../..")` — no call-site signature change.
3. Cross-artifact boundary under audit: the health pass (`compute.ts`) ↔ the compose pipeline's required-doc constants (`compose.ts` `CONTENT_POLICY_REL` / `PROSE_CRAFT_CONTRACT_REL`, lines 36-39) ↔ the gate (`health-gate.ts`). The health pass must reference the same two doc paths the composer requires; `health-gate.ts` and the GET `/health` route (`src/server/routes/health.ts:40`) plus the prompts/manuscript/segments callers all pass only `manualStoryRoot` and stay untouched under the derive-`repoRoot` approach.
4. FOUNDATIONS §Soft Canon / Local Truth (must be explicit and validated): validating compose-required documents at health time makes local-truth integrity explicit and actionable (a repair-link target) instead of surfacing as an opaque compose-time read error. Manuscript freshness is advisory only (`manuscript_compile` regenerates the manuscript), so it must never block — consistent with treating the manuscript as a derived artifact.

## Architecture Check

1. A small, explicit dependency map (surface → dependent actions) is testable and matches the report's §22 intent precisely; per-action computation over findings replaces an opaque global flag. Deriving `repoRoot` inside `computeHealth` keeps the blast radius to one file and avoids threading a new parameter through six call sites (`health-gate.ts`, `routes/health.ts`, the prompts/manuscript/segments callers) for a value mechanically recoverable from the existing argument.
2. No backwards-compatibility aliasing/shims: the global `status === "blocked" ? ALL_BLOCKED_ACTIONS : []` rule is replaced outright by the per-action computation; no legacy all-or-nothing path is retained.

## Verification Layers

1. A blocking finding on a prompt-only surface blocks `prompt_copy`/`prompt_save` but leaves `segment_save`/`manuscript_compile` allowed → new test `test/health/dependency-scoped-blocking.test.ts`.
2. A blocking finding on a segment sidecar blocks `segment_save`/`manuscript_compile` but leaves prompt actions allowed when prompt inputs are healthy → same test.
3. Missing content-policy / prose-craft doc produces a blocking finding scoped to prompt actions only → same test (asserts `segment_save` stays allowed).
4. Stale or missing `manuscript.md` (with non-empty `segment_order`) yields a `degraded` finding and blocks nothing → same test.

## What to Change

### 1. Per-action dependency-scoped blocking (`src/health/compute.ts`, `src/health/types.ts`)

Replace the `blocked_actions` computation at `compute.ts:45` with a per-action computation: define a dependency map (surface → dependent `BlockedAction`s) and, for each action, block it when at least one `blocking`-severity finding belongs to a surface that action depends on. Minimum map:
- `prompt_copy` / `prompt_save` ← metadata, records, current-context/working-set, content-policy, prose-craft-contract.
- `segment_save` ← metadata, segment sidecars/bodies.
- `manuscript_compile` ← metadata, `segment_order`, segment bodies.

Tag each emitted finding with a surface key the map keys on (extend `HealthFinding` in `types.ts` if needed, or map from the existing `code`). A finding on a surface no action depends on still appears in the report (and influences `status`) but blocks no action.

### 2. Compose-required-document presence (`src/health/compute.ts`)

Derive `repoRoot` inside `computeHealth` via `path.resolve(manualStoryRoot, "../../../..")` (mirroring `resolveManualStoryRoot`'s `worlds/<world>/manual-stories/<story>` layout). In the reference pass, add `blocking` findings (scoped to the prompt surfaces via the §1 map) when `<repoRoot>/docs/prose-renderer-contract/content-policy.md` or `<repoRoot>/docs/manual-story-studio/prose-craft-contract.md` is absent or unparseable. Reuse the same relative-path constants the composer uses.

### 3. Manuscript-freshness check (`src/health/compute.ts`)

Add a non-blocking `error`-severity (status `degraded`) finding when `manuscript.md` is older than the newest segment in `segment_order` (compare mtimes), or absent while `segment_order` is non-empty. The freshness surface is mapped to no action, so it never blocks.

### 4. Confirm the gate reads the per-action set (`src/server/health-gate.ts`)

No logic change expected — `blockIfHealthDisallows` already checks `report.blocked_actions.includes(action)`. Confirm it consumes the per-action set produced by §1 and add no global re-derivation.

## Files to Touch

- `tools/manual-story-studio/src/health/compute.ts` (modify)
- `tools/manual-story-studio/src/health/types.ts` (modify)
- `tools/manual-story-studio/src/server/health-gate.ts` (modify)
- `tools/manual-story-studio/test/health/dependency-scoped-blocking.test.ts` (new)

## Out of Scope

- Prompt-sidecar / prompt-markdown existence validation in health (report §22 rec. 1) — explicitly out of scope per SPEC-116 §Out of scope; the hard-tier lint runs at compose/save.
- Working-set shape validation at route read time (report §22 rec. 4) — out of scope; current-context refs are already validated in the health reference pass (`validateCurrentContext`).
- Health-banner UI / repair-link rendering (SPEC-112 / SPEC-113 frontend territory).
- Template-path containment (archive/tickets/SPEC116MANSTOSTU-001.md).

## Acceptance Criteria

### Tests That Must Pass

1. A blocking finding isolated to a prompt-only surface (e.g. missing content-policy) blocks `prompt_copy`/`prompt_save` but leaves `segment_save` and `manuscript_compile` allowed.
2. A blocking finding on a segment sidecar blocks `segment_save`/`manuscript_compile` but leaves the prompt actions allowed when prompt inputs are healthy.
3. A stale or missing `manuscript.md` (with non-empty `segment_order`) produces a `degraded` finding and blocks nothing.
4. `cd tools/manual-story-studio && npm test` is green end to end (existing health/route suites + the new dependency-scoped-blocking suite).

### Invariants

1. No action is blocked unless a `blocking`-severity finding belongs to a surface that action depends on.
2. Manuscript freshness never blocks any action (advisory `degraded` only).
3. `computeHealth`'s public signature is unchanged (`manualStoryRoot` only); `repoRoot` is derived internally, so all callers stay untouched.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/health/dependency-scoped-blocking.test.ts` (new) — asserts per-action blocking isolation (AC#1/#2), content-policy/prose-craft absence scoped to prompt actions (AC#1), and manuscript staleness as non-blocking `degraded` (AC#3).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend` (backend `node --test` over the new health suite + existing health/route suites)
2. `cd tools/manual-story-studio && npm test` (full: backend + `npm --prefix web test`)
3. `cd tools/manual-story-studio && npm run build` (confirms `tsc -p tsconfig.json` accepts the `types.ts` / `compute.ts` changes)

## Outcome

Completed: 2026-06-02

`computeHealth` now derives `blocked_actions` from an explicit finding-code dependency map instead of the prior all-or-nothing `status === "blocked"` rule. Metadata failures still block all four actions; current-context and compose-required-document failures block only `prompt_copy`/`prompt_save`; segment sidecar/body failures block only `segment_save`/`manuscript_compile`. `health-gate.ts` required no logic change because it already checks membership in `report.blocked_actions`.

The health reference pass now derives `repoRoot` from `manualStoryRoot` and validates the two compose-required documents: `docs/prose-renderer-contract/content-policy.md` and `docs/manual-story-studio/prose-craft-contract.md`. Missing/unreadable document findings are `blocking` severity but scoped by the dependency map to prompt actions only. The file pass now emits a non-blocking `manuscript-stale` finding when ordered segments exist but `manuscript.md` is missing or older than the ordered segment sidecar/body files; segment-file blocking findings suppress duplicate freshness noise.

Implemented files:

- `tools/manual-story-studio/src/health/compute.ts`
- `tools/manual-story-studio/test/health/dependency-scoped-blocking.test.ts`
- `tools/manual-story-studio/test/health/compute.test.ts`
- `tools/manual-story-studio/test/server/health.test.ts`
- `tools/manual-story-studio/test/current-context/health-integration.test.ts`

No public `HealthFinding` response shape change was needed; the surface key is derived from stable finding codes.

## Verification Result

PASS — pre-edit backend baseline was green: `cd tools/manual-story-studio && npm run test:backend` passed 74 compiled backend tests before implementation.

PASS — focused health proof passed after implementation: `cd tools/manual-story-studio && node --test dist/test/health/dependency-scoped-blocking.test.js dist/test/health/compute.test.js dist/test/server/health.test.js dist/test/current-context/health-integration.test.js` passed 23 compiled tests covering prompt-only doc failures, segment-only blocking, current-context scoping, missing-manuscript freshness, and route gate behavior.

PASS — backend package proof passed after implementation: `cd tools/manual-story-studio && npm run test:backend` passed 75 compiled backend tests, including the new dependency-scoped suite.

PASS — full package proof passed after implementation: `cd tools/manual-story-studio && npm test` passed 454 backend tests and `npm --prefix web test` (`tsc --noEmit`).

PASS — build proof passed after implementation: `cd tools/manual-story-studio && npm run build` completed the web install check, web production build, and backend TypeScript build.

## Deviations

- The implementation maps dependency surfaces from finding `code` values instead of adding a new public `HealthFinding.surface` field. This keeps the health response stable while preserving an explicit, test-covered dependency map.
