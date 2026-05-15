# SPEC30STOCONHAR-005: Mystery-Claim `evidence_records[]` — Write/Validate Path

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — contract §4.2, `story-page.schema.json`, `state-snapshot-replay.ts` helper, `snapshot-replay-equality.ts` validator, `state-snapshot-integrity.ts` validator + tests
**Deps**: None

## Problem

`_shared-templates/story-state-contract.md:131-134` records `unresolved_mystery_claims[]` with `mystery_id`, `authority`, `status` only. The §Mystery Accretion rule at `docs/FOUNDATIONS.md:616` requires `branching-story-health-audit` to walk the branch page chain and flag accumulated narrowing — but with no `evidence_records` field, the audit relies on prose/plans or semantic reconstruction to identify which records caused the narrowing. The audit becomes deterministic only with explicit evidence pointers. This ticket lands the write/validate path: contract schema, JSON schema, replay helper, replay-equality coverage, integrity closure check. The audit consumer surface lands in SPEC30STOCONHAR-006.

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:131-134` carries the `unresolved_mystery_claims[]` schema with three fields exactly as the spec asserts: `mystery_id`, `authority`, `status` (no `evidence_records`).
2. Verified `tools/validators/src/schemas/story-page.schema.json:66-78` carries the JSON schema mirroring those three fields.
3. Verified `tools/validators/src/structural/snapshot-replay-equality.ts:183` carries the comment-noted exclusion: `// (visible_affordances, unresolved_mystery_claims, continuation) are excluded.`
4. Verified `docs/FOUNDATIONS.md:616` carries the §Mystery Accretion rule referencing `branching-story-health-audit` and the existing `unresolved_mystery_claims[].status` vocabulary.
5. Cross-skill / cross-artifact boundary under audit: the mystery-evidence contract spans (a) the shared contract §4.2 `unresolved_mystery_claims[]` schema, (b) the JSON schema for `PG`, (c) the snapshot-replay helper at `tools/validators/src/_helpers/state-snapshot-replay.ts`, (d) the snapshot-replay-equality validator, (e) the state-snapshot-integrity validator (closure check for `evidence_records` ids), (f) downstream the health-audit Mystery-Accretion sub-check and the MCP context-packet (covered by ticket 006).
6. FOUNDATIONS principle under audit: Rule 7 (Preserve Mystery Deliberately) — adding `evidence_records` does NOT weaken the Mystery Reserve firewall; it strengthens it by making accretion-narrowing deterministic. Adding the field is additive; existing PG records without `evidence_records` validate cleanly when `status` is `preserved`. The validator-side legality (required-when status is non-`preserved`) is new but only fires on patterns that today have no acceptance test at all.
7. HARD-GATE / Mystery Reserve firewall verification: this ticket extends `state_snapshot_integrity` (a fail-severity validator). The added closure check does not weaken any existing canon-safety check; it adds a new check that hardens accretion auditing. Rule 7 firewall preservation: confirmed — no M-record `status: forbidden` resolution is silently introduced by this change.
8. Schema extension classification: this IS a structured-output schema extension (PG `state_snapshot.unresolved_mystery_claims[]`). The extension is additive (new optional field with default `[]`); existing PG records still validate. Consumers: snapshot-replay-equality (updated here), state-snapshot-integrity (updated here), state-snapshot-replay helper (updated here), health-audit (ticket 006), MCP context-packet (ticket 006).
9. Existing test files `tools/validators/tests/structural/state-snapshot-integrity.test.ts`, `.../snapshot-replay-equality.test.ts`, and `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` are the test surfaces (paths corrected from spec's `src/` form per §Codebase truth).

## Architecture Check

1. Storing `evidence_records` per `unresolved_mystery_claims[]` entry — rather than in a sibling sidecar map — keeps the evidence colocated with the claim it grounds, lets snapshot-replay-equality compare evidence per-claim without joining across siblings, and gives the health-audit's chain walk (ticket 006) a single locality to read from. The alternative — a separate `mystery_evidence_log: {M-<id>: [SF-<id>, ...]}` block on the snapshot — would force every consumer to do a two-step lookup and fragment Rule 7 enforcement across two fields.
2. No backwards-compatibility shim: `evidence_records` defaults to `[]`, so existing PG records with `status: preserved` continue to validate untouched.

## Verification Layers

1. Schema admission → schema validation: PG with `unresolved_mystery_claims: [{mystery_id: M-1, authority: apparent, status: clue_added, evidence_records: [SF-7]}]` validates cleanly against `story-page.schema.json`.
2. Status-conditional legality → validator unit test: `status: narrowed` + empty `evidence_records` emits `mystery_evidence_required`; `status: preserved` + empty `evidence_records` passes.
3. Closure walk → validator unit test: `evidence_records: [SF-7, BEL-3]` resolves cleanly when SF-7 and BEL-3 exist in the bundle; `evidence_records: [SF-99]` (missing) emits a dangling-reference finding.
4. Replay equality → validator unit test: a child snapshot whose `unresolved_mystery_claims[].evidence_records` accumulate parents-plus-additions across a chain produces no `snapshot_replay_mismatch` finding when the helper preserves the field; flipping any single id mid-chain emits the finding.
5. FOUNDATIONS alignment check: Rule 7 surface — adding `evidence_records` does not silently resolve any Mystery Reserve M-record; the field is read-only at this layer (no auto-resolution logic added).

## What to Change

### 1. Contract §4.2 schema extension

In `.claude/skills/_shared-templates/story-state-contract.md` §4.2 PG schema (around line 131-134), extend `unresolved_mystery_claims[]` to include `evidence_records: [SF-<integer> | BEL-<integer> | DA-<integer> | SE-<integer>]`. Add the legality rule prose: *"`evidence_records` MUST be non-empty when `status` is `clue_added | narrowed | apparent_resolution | held_for_promotion`; MAY be `[]` when `status` is `preserved`. Every id in `evidence_records` MUST resolve to a story-local record in the bundle."*

### 2. JSON schema

In `tools/validators/src/schemas/story-page.schema.json` lines 66-78 (the `unresolved_mystery_claims` block), add `evidence_records` as an array property with item pattern `^(SF|BEL|DA|SE)-[0-9]+$`. Default value `[]`. The status-conditional non-empty legality is enforced by `state-snapshot-integrity`, not by JSON-schema `if`/`then` (parallel to ticket 001's input-legality architecture decision: validator enforcement where the conditional context lives in scope).

### 3. Snapshot-replay helper

In `tools/validators/src/_helpers/state-snapshot-replay.ts`, include `evidence_records` in the per-`unresolved_mystery_claims[]` projection so replay equality preserves the field across parent→child snapshot reconstruction. Default to `[]` when omitted in the parent snapshot for forward-compatibility with replays of pre-evidence-records authored PGs (none exist; defensive default).

### 4. Snapshot-replay-equality refinement

In `tools/validators/src/structural/snapshot-replay-equality.ts` around line 183, change the exclusion comment from "unresolved_mystery_claims excluded entirely" to "unresolved_mystery_claims compared on (mystery_id, authority, status, evidence_records) — in-page derivation still allowed beyond these four fields if any future field is added". Update the comparison logic accordingly so a replay mismatch on `evidence_records` is detected.

### 5. Integrity closure check

In `tools/validators/src/structural/state-snapshot-integrity.ts`, add two new checks: (a) status-conditional non-empty (`status` is one of `clue_added | narrowed | apparent_resolution | held_for_promotion` AND `evidence_records` is `[]`) → emit `mystery_evidence_required` (severity: fail); (b) closure walk (each id in `evidence_records` is a real story-local SF / BEL / DA / SE id in the bundle) — extend the existing `storyLocalReferences` collector to traverse `unresolved_mystery_claims[].evidence_records[]` (the collector already walks nested keys per `:144-173`, but verify traversal lands on this path; add a test case to lock the behavior).

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.2 schema + legality rule)
- `tools/validators/src/schemas/story-page.schema.json` (modify — `evidence_records` array property + default)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — projection includes `evidence_records`)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — comparison includes `evidence_records`)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — `mystery_evidence_required` check + closure traversal)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify — new test cases for status-conditional + closure)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — new test case for `evidence_records` replay equality)
- `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (modify — new test case verifying helper projects `evidence_records` correctly across a parent→child chain)

## Out of Scope

- Health-audit Mystery-Accretion sub-check (ticket 006).
- MCP context-packet inclusion of `evidence_records` cross-references (ticket 006).
- Any change to M-record schema or Mystery Reserve firewall logic.
- Any new authority level or status value.
- Auto-resolution of M-records based on `evidence_records` size (out of scope; field is read-only signal here, audit interpretation lives in ticket 006).

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds.
2. From `tools/validators`, `npm run test` — all validator tests pass including the new evidence-records cases across state-snapshot-integrity, snapshot-replay-equality, and state-snapshot-replay helper.
3. `grep -n "evidence_records" tools/validators/src/schemas/story-page.schema.json` returns the new array property hit.
4. `grep -n "mystery_evidence_required" tools/validators/src/structural/state-snapshot-integrity.ts` returns the new check.

### Invariants

1. PG records with `status: preserved` + empty `evidence_records` remain lawful (backwards-additive).
2. PG records with status in {clue_added, narrowed, apparent_resolution, held_for_promotion} cannot land with empty `evidence_records` post-validator.
3. Mystery Reserve firewall semantics at FOUNDATIONS:616 are unchanged; this ticket adds an auditing surface, not a resolution path.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — new cases for status-conditional non-empty + closure walk over `evidence_records`.
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — new case for evidence_records replay equality (parent→child chain accumulation).
3. `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` — new case verifying helper projects `evidence_records` correctly across a parent→child chain.

### Commands

1. From `tools/validators`: `npm run test`
2. `grep -n "evidence_records" tools/validators/src/schemas/story-page.schema.json .claude/skills/_shared-templates/story-state-contract.md`
3. The full validator `test` command is the correct boundary because three validator surfaces are touched simultaneously (helper, replay-equality, integrity).
