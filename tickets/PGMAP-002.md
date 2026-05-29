# PGMAP-002: Audit whether PG active-record full-map warnings are load-bearing

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — likely `tools/validators/src/structural/compatibility-drift.ts`, `tools/validators/src/structural/active-records-full-shape.ts`, `tools/validators/src/_helpers/state-snapshot-replay.ts`, validator tests, and PG-authoring guidance if reassessment chooses to change the current contract.
**Deps**: `archive/tickets/PGMAP-001.md`

## Problem

PGMAP-001 aligned PG-authoring prose to the live structural-validator current contract: new/current-contract `PG.state_snapshot.active_records` maps materialize every `ACTIVE_RECORDS_CLASSES` key and use `[]` for inactive classes. During that closeout, reassessment preserved a real unresolved question instead of changing validator behavior: `compatibility_drift` warns for missing optional active-record keys on new/current-contract pages, while replay/compatibility paths normalize legacy missing optional keys to `[]`.

That creates a FOUNDATIONS §Story Bundles §5b question. If every consumer can derive absent optional keys as empty arrays, the stored empty arrays may be forward-shape hygiene rather than load-bearing data. If any consumer branches on key presence or needs the materialized map for deterministic replay, schema discovery, context-packet assembly, or authoring safety, the full-map warning remains justified. This ticket owns that audit and the smallest resulting contract correction.

## Assumption Reassessment (2026-05-29)

1. **Codebase check.** `tools/validators/src/_helpers/state-snapshot-replay.ts` defines `ACTIVE_RECORDS_CLASSES` as the full 18-key active-record vocabulary and `OPTIONAL_ACTIVE_RECORDS_CLASSES` as `DA`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`. It also replays active records by seeding every active class and treating missing parent lists as `[]`.
2. **Validator check.** `tools/validators/src/structural/compatibility-drift.ts` reports `compat_requires_migration_patch` WARNs for missing optional active-record keys on in-plan/current-contract-parented pages, but its legacy branch says replay validators normalize missing keys to `[]`. `tools/validators/src/structural/active-records-full-shape.ts` separately warns/fails in full-world mode for every missing `ACTIVE_RECORDS_CLASSES` key.
3. **Shared boundary under audit.** The `PG.state_snapshot.active_records` shape contract across validators, replay helpers, PG-authoring skills, context-packet/story-bundle retrieval, and story turn/scene planning consumers.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles §5b requires every story-bundle record field to be load-bearing: directly consumed by a validation gate, replay primitive, predicate, fork operation, or audit-trail discipline. Empty active-record arrays are acceptable only if materializing them is load-bearing for one of those purposes.
5. **Dependency state.** `archive/tickets/PGMAP-001.md` intentionally made authoring guidance match the current validators without deciding whether the validator requirement itself should remain.

## Architecture Check

1. The clean approach is an evidence-first consumer audit before changing warnings or schema guidance. Dropping warnings without proving consumer behavior could hide real fork/replay drift; preserving mandatory empty arrays without proof leaves possible §5b boilerplate.
2. No backwards-compatibility aliasing/shims should be introduced. The outcome should either preserve the current full-map contract with explicit load-bearing rationale, or change validator/guidance behavior at the single authoritative seam and keep legacy normalization explicit.

## Verification Layers

1. Consumer behavior classification -> codebase grep-proof/manual review over validators, replay helpers, context-packet assembly, story retrieval helpers, and PG-authoring guidance.
2. Chosen contract remains FOUNDATIONS-aligned -> FOUNDATIONS §5b alignment check with an explicit load-bearing or normalization rationale.
3. Validator behavior matches the chosen contract -> focused validator tests or unchanged-test proof, depending on whether behavior changes.
4. Authoring guidance matches the chosen contract -> stale-anchor grep over `branching-story-bootstrap`, `branching-story-turn-cycle`, and shared story-record schema prose.

## What to Change

### 1. Consumer audit

Inventory every current consumer that reads `PG.state_snapshot.active_records` or the active-record class constants. Classify whether it treats absent optional keys as `[]`, branches on key presence, requires the full key map for deterministic replay/forking, or only benefits from authoring consistency.

### 2. Contract decision

Choose one contract and make the repo consistent:

- Keep full-map authoring and validator WARNs, with an explicit load-bearing rationale tied to replay/fork/audit discipline.
- Or relax new-page warnings for optional key absence and update validators/guidance so missing optional keys are normalized consistently instead of treated as migration-worthy current-contract drift.

### 3. Proof and guidance alignment

Update validator tests, shared story-record schema prose, and PG-authoring guidance only as required by the chosen contract.

## Files to Touch

- `tools/validators/src/_helpers/state-snapshot-replay.ts` (inspect; modify only if contract changes)
- `tools/validators/src/structural/compatibility-drift.ts` (inspect; modify if warning policy changes)
- `tools/validators/src/structural/active-records-full-shape.ts` (inspect; modify if warning policy changes)
- `tools/validators/tests/**` (modify or add focused tests if behavior changes)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md` (modify if guidance changes)
- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify if guidance changes)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify if shared contract prose changes)
- `tickets/PGMAP-002.md` (modify closeout/reassessment)

## Out of Scope

- Editing live story-bundle `_source/` records.
- Changing `story-page.schema.json` before the consumer audit proves a schema-level change is necessary.
- Broad story-bundle migration of historical pages.

## Acceptance Criteria

### Tests That Must Pass

1. Consumer inventory proves whether absent optional active-record keys are semantically distinguishable from empty arrays in current validators/replay/retrieval surfaces.
2. The final contract has one clear source of truth and is reflected consistently in validators and PG-authoring guidance.
3. Focused validator tests prove either the preserved WARN behavior or the relaxed normalization behavior.

### Invariants

1. The chosen `PG.state_snapshot.active_records` contract satisfies FOUNDATIONS §Story Bundles §5b.
2. Legacy grandfathering remains explicit and does not weaken pre-apply validation or HARD-GATE-facing story-state checks.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/compatibility-drift.test.ts` — update or preserve focused coverage for missing optional active-record keys.
2. `tools/validators/tests/structural/active-records-full-shape.test.ts` — update or preserve full-world shape coverage.
3. `None` only if reassessment proves no validator behavior changes and the audit closes as documentation/test-plan truthing.

### Commands

1. `npm run build` from `tools/validators`.
2. `node --test dist/tests/structural/compatibility-drift.test.js dist/tests/structural/active-records-full-shape.test.js` from `tools/validators`.
3. `rg -n 'active_records|ACTIVE_RECORDS_CLASSES|OPTIONAL_ACTIVE_RECORDS_CLASSES' tools/validators/src tools/world-mcp/src .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle .claude/skills/_shared-templates` — classify remaining current-contract hits against the chosen contract.
