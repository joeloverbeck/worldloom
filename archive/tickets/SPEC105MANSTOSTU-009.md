# SPEC105MANSTOSTU-009: Health compute pass

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/health/compute.ts` (3-pass integrity walk producing a `HealthReport`). Consumed by SPEC105MANSTOSTU-010 (the `/health` route) and indirectly by the route layer's 409 dispatch when an entire story is `blocked` for any read/write attempt.
**Deps**: archive/tickets/SPEC105MANSTOSTU-001.md, archive/tickets/SPEC105MANSTOSTU-004.md, archive/tickets/SPEC105MANSTOSTU-005.md, archive/tickets/SPEC105MANSTOSTU-006.md, archive/tickets/SPEC105MANSTOSTU-007.md, archive/tickets/SPEC105MANSTOSTU-008.md

## Problem

SPEC-105 §2 item 2 specifies the `/health` route walks the manual story directory and runs three integrity passes: (1) file integrity (YAML parses for `manual-story.yaml` + every record/segment/prompt sidecar pair; required files exist; IDs match filenames; no duplicate IDs), (2) schema integrity (records / metadata / sidecars validate against their schemas), (3) reference integrity (typed refs resolve; selected prompt records exist and are active; segment evidence refs resolve). The compute layer is what assembles the canonical `HealthReport` consumed by the route response, the route 409 dispatch (for blocked operations like prompt-copy / segment-save), and the frontend banner. Without this compute pass, the `/health` route has nothing to return.

## Assumption Reassessment (2026-06-01)

1. At intake, the `tools/manual-story-studio/src/health/compute.ts` path did NOT exist; this ticket creates it. The sibling `src/health/types.ts` exists from archive/tickets/SPEC105MANSTOSTU-001.md (provides `HealthStatus`, `HealthSeverity`, `HealthFinding`, `HealthReport`, `BlockedAction`, `deriveHealthStatus`).
2. SPEC-105 §2 item 2 + §7 ACs #2/3/4/5 + §1 Context all define the compute pass scope. Pass 1 severities are `blocking`; Pass 2/3 severities are `error` or `warn` depending on whether the affected surface is reachable without resolution. The `blocked_actions` array follows the spec §2 item 1 derivation rule: when ANY blocking finding is present, all four entries (`prompt_copy`, `prompt_save`, `segment_save`, `manuscript_compile`) populate; when only `error`-severity findings are present, `blocked_actions` is empty but `status` is `degraded`.
3. Cross-skill boundary: compute.ts is the load-bearing logic surface for SPEC-105's *"visible, specific, repairable failure"* model. It consumes the migrated read layer (`readManualStoryMetadata`, `listRecords`, `readRecord`, `listAllKnownIds`, `readSegmentSidecar`, `readSegmentBody`, `readManuscript`) from tickets 004–008 and the existing reference validator to surface parse / schema / reference failures as structured `HealthFinding`s. Without all reads migrated, compute.ts cannot distinguish "valid absence" from "corruption" at every walked file.
4. Rule 5 No Consequence Evasion grounding: the compute pass's job IS to propagate second-order effects of corruption. A single corrupt `manual-story.yaml` → `status: blocked` + `blocked_actions: all four` because every cockpit operation depends on valid metadata. A single corrupt record → `status: degraded` + `blocked_actions: []` because non-affected records still load. These propagations are the spec §2 item 1 / item 4 derivation rules made concrete; the compute pass IS the Rule 5 enforcement surface for the integrity model.

## Architecture Check

1. The 3-pass structure mirrors SPEC-105 §2 item 2 verbatim and SPEC-105 §28 (the report's "Validation and fail-fast integrity audit" recommended 3-level integrity model). Each pass is a discrete subroutine: `runFilePass`, `runSchemaPass`, `runReferencePass`. The top-level `computeHealth(manualStoryRoot)` function composes them and assembles the `HealthReport` via `deriveHealthStatus`.
2. The compute pass is purely a read-walker — no writes, no caching, no daemons. SPEC-105 §3 Key decisions explicitly chose on-demand-not-daemon ("Manual stories are small (dozens to low-hundreds of records); the passes complete in single-digit milliseconds. A persistent in-memory cache or background watcher is YAGNI; add only if measurement shows the read path is hot.").
3. Each `HealthFinding` carries the structured `severity` / `code` / `path` / `message` / `repair_hint` shape from types.ts (ticket 001). Codes are stable kebab-case strings consistent with the §2 item 4 dispatch table where applicable (e.g., `metadata-yaml-parse-failed`, `record-yaml-parse-failed`, `segment-sidecar-missing`, `reference-resolution-failed`) — these codes are emitted by compute.ts AT THE FINDING level (different from the `ReadError.code` vocabulary that's emitted by the read-layer migrations; the compute pass aggregates findings, while the read-layer codes are per-read-failure). See `tickets/README.md` §Required Ticket Sections — invariants are mapped to verification surfaces, and the codes are the surface for the test fixtures in SPEC105MANSTOSTU-014.
4. No backwards-compatibility aliasing/shims — this is a greenfield module.

## Verification Layers

1. Compute logic produces the canonical HealthReport per spec §2 item 1 → unit tests against fixture worlds covering: valid story (`status: "ok"`); corrupt metadata (`status: "blocked"`); corrupt single record (`status: "degraded"`); missing segment sidecar (`status: "blocked"` with `manuscript_compile` blocked); dangling ref (`status: "degraded"`).
2. Pass severity assignment is correct → unit tests assert Pass 1 emits `blocking` severities, Pass 2 emits `error`, Pass 3 emits `error` or `warn` depending on the affected surface.
3. `blocked_actions` populates per the spec rule → unit tests assert `blocked` status fills all four actions; `degraded` status emits `[]`.
4. End-to-end integration tested by SPEC105MANSTOSTU-014 against route + compute composition.

## Landed Changes

### 1. Created `tools/manual-story-studio/src/health/compute.ts`

The module exports `computeHealth(manualStoryRoot: string): HealthReport`.

The implementation preserves the three-pass structure:

1. `runFilePass` uses the migrated read layer to surface metadata parse failures, corrupt record YAML, missing segment sidecars/bodies, malformed segment sidecars, and manuscript read failures.
2. `runSchemaPass` uses `validateManualStoryMetadata` and `validateRecord` for metadata/record schema findings, skipping entries whose prerequisite read/list step already failed so one corrupt file does not emit duplicate findings.
3. `runReferencePass` uses `listAllKnownIds` and `validateRefs` to surface `reference-resolution-failed` findings.

`computeHealth` derives status through `deriveHealthStatus` and populates all four blocked actions only when status is `blocked`.

### 2. Created `tools/manual-story-studio/test/health/compute.test.ts`

Added unit tests against fixture worlds covering:
- Valid story: `status: "ok"`, `findings: []`, `blocked_actions: []`.
- Corrupt `manual-story.yaml`: `status: "blocked"`, one finding with `code: "metadata-yaml-parse-failed"`, `blocked_actions: ["prompt_copy", "prompt_save", "segment_save", "manuscript_compile"]`.
- Corrupt single record: `status: "degraded"`, one finding with `code: "record-yaml-parse-failed"`, `blocked_actions: []`.
- Missing segment sidecar: `status: "blocked"`, one finding with `code: "segment-sidecar-missing"`, `blocked_actions` includes `manuscript_compile`.
- Dangling typed ref: `status: "degraded"`, one finding with `code: "reference-resolution-failed"`, `blocked_actions: []`.

These tests use inline temp fixtures. SPEC105MANSTOSTU-014 may still add shared route/acceptance fixtures if needed.

## Files to Touch

- `tools/manual-story-studio/src/health/compute.ts` (new)
- `tools/manual-story-studio/test/health/compute.test.ts` (new — unit tests against fixtures)

## Out of Scope

- The `/health` HTTP route surface — SPEC105MANSTOSTU-010 wires `computeHealth` into a Fastify GET handler.
- Frontend rendering — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.
- End-to-end acceptance tests against the route — SPEC105MANSTOSTU-014.
- Caching / background-watcher / persistent in-memory state — explicitly rejected by SPEC-105 §3 Key decisions ("YAGNI; add only if measurement shows the read path is hot").

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly.
2. `cd tools/manual-story-studio && npm test` runs and the new `test/health/compute.test.ts` passes — covers the five fixture-world cases enumerated above.
3. `grep -nE "^export function computeHealth" tools/manual-story-studio/src/health/compute.ts` returns 1 match.

### Invariants

1. `computeHealth` is a pure function from `manualStoryRoot` to `HealthReport` — no I/O outside the read-layer calls; no caching, no side effects.
2. The 3-pass structure is preserved: Pass 1 emits `blocking` severities, Pass 2 emits `error`, Pass 3 emits `error` or `warn`. Status derivation follows the §2 item 1 rule via `deriveHealthStatus`.
3. `blocked_actions` populates per the spec rule: `blocked` status fills all four entries; non-`blocked` status emits `[]`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/health/compute.test.ts` — unit tests for `computeHealth` against fixture worlds.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.

## Outcome

Completed on 2026-06-01.

This ticket added `tools/manual-story-studio/src/health/compute.ts` with `computeHealth(manualStoryRoot)`, a three-pass health computation that returns the canonical `HealthReport` shape. It also added focused compute tests for valid story, corrupt metadata, corrupt record YAML, missing segment sidecar, and dangling typed references.

## Verification Result

Commands run:

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. `cd tools/manual-story-studio && node --test dist/test/health/compute.test.js` — passed; 5 focused tests.
3. `cd tools/manual-story-studio && npm test` — passed; backend reported 372 tests passing and web `tsc --noEmit` passed.
4. `grep -nE "^export function computeHealth" tools/manual-story-studio/src/health/compute.ts` — passed; returned 1 match.
5. `git diff --check` — passed.

## Deviations

- The ticket sketch mentioned shared fixtures under `test/health/fixtures/`; this implementation uses inline temp fixtures in `compute.test.ts`. SPEC105MANSTOSTU-014 remains free to add shared route/acceptance fixtures.
- `runReferencePass` uses the existing `validateRefs` + `listAllKnownIds` helpers directly rather than `scanReferences`, because `scanReferences` is a reverse-referrer search for a single target ID and does not validate all dangling references by itself.
