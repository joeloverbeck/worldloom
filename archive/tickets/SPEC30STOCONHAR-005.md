# SPEC30STOCONHAR-005: Mystery-Claim `evidence_records[]` — Write/Validate Path

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — contract §4.2, SPEC-30 implementation note, `story-page.schema.json`, `state-snapshot-replay.ts` helper, `snapshot-replay-equality.ts` validator, `state-snapshot-integrity.ts` validator + tests
**Deps**: None

## Problem

At intake, `_shared-templates/story-state-contract.md` recorded `unresolved_mystery_claims[]` with `mystery_id`, `authority`, `status` only. The §Mystery Accretion rule at `docs/FOUNDATIONS.md:616` requires `branching-story-health-audit` to walk the branch page chain and flag accumulated narrowing; without `evidence_records`, that audit would have had to rely on prose/plans or semantic reconstruction to identify which records caused the narrowing. This ticket landed the write/validate path: contract schema, JSON schema, replay helper, replay-equality coverage, and integrity closure/status checks. The audit consumer surface remains in SPEC30STOCONHAR-006.

## Assumption Reassessment (2026-05-15)

1. At intake, verified `_shared-templates/story-state-contract.md:131-134` carried the `unresolved_mystery_claims[]` schema with three fields exactly as the spec asserted: `mystery_id`, `authority`, `status` (no `evidence_records`).
2. At intake, verified `tools/validators/src/schemas/story-page.schema.json:66-78` carried the JSON schema mirroring those three fields.
3. At intake, verified `tools/validators/src/structural/snapshot-replay-equality.ts:183` carried the comment-noted exclusion: `// (visible_affordances, unresolved_mystery_claims, continuation) are excluded.`
4. Verified `docs/FOUNDATIONS.md:616` carries the §Mystery Accretion rule referencing `branching-story-health-audit` and the existing `unresolved_mystery_claims[].status` vocabulary.
5. Cross-skill / cross-artifact boundary under audit: the mystery-evidence contract spans (a) the shared contract §4.2 `unresolved_mystery_claims[]` schema, (b) the JSON schema for `PG`, (c) the snapshot-replay helper at `tools/validators/src/_helpers/state-snapshot-replay.ts`, (d) the snapshot-replay-equality validator, (e) the state-snapshot-integrity validator (closure check for `evidence_records` ids), (f) downstream the health-audit Mystery-Accretion sub-check and the MCP context-packet (covered by ticket 006).
6. FOUNDATIONS principle under audit: Rule 7 (Preserve Mystery Deliberately) — adding `evidence_records` does NOT weaken the Mystery Reserve firewall; it strengthens it by making accretion-narrowing deterministic. Adding the field is additive; existing PG records without `evidence_records` validate cleanly when `status` is `preserved`. The validator-side legality (required-when status is non-`preserved`) is new but only fires on patterns that today have no acceptance test at all.
7. HARD-GATE / Mystery Reserve firewall verification: this ticket extends `state_snapshot_integrity` (a fail-severity validator). The added closure check does not weaken any existing canon-safety check; it adds a new check that hardens accretion auditing. Rule 7 firewall preservation: confirmed — no M-record `status: forbidden` resolution is silently introduced by this change.
8. Schema extension classification: this IS a structured-output schema extension (PG `state_snapshot.unresolved_mystery_claims[]`). The extension is additive (new optional field with default `[]`); existing PG records still validate. Consumers: snapshot-replay-equality (updated here), state-snapshot-integrity (updated here), state-snapshot-replay helper (updated here), health-audit (ticket 006), MCP context-packet (ticket 006).
9. Existing test files `tools/validators/tests/structural/state-snapshot-integrity.test.ts`, `.../snapshot-replay-equality.test.ts`, and `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` are the test surfaces (paths corrected from spec's `src/` form per §Codebase truth).
10. Baseline package proof before source edits: from `tools/validators`, `npm run test` passed 220 tests. Pre-existing ignored package artifacts were present under `tools/validators/dist/` and `tools/validators/node_modules/`; this run refreshed `dist/` through build/test commands and left `node_modules/` untouched.
11. Package public-surface check: `tools/validators/README.md` inventories validators/schemas at package level and does not enumerate PG subfields or validator verdict codes, so no README edit was required. `docs/WORKFLOWS.md` does not carry this PG subfield contract.

## Architecture Check

1. Storing `evidence_records` per `unresolved_mystery_claims[]` entry — rather than in a sibling sidecar map — keeps the evidence colocated with the claim it grounds, lets snapshot-replay-equality compare evidence per-claim without joining across siblings, and gives the health-audit's chain walk (ticket 006) a single locality to read from. The alternative — a separate `mystery_evidence_log: {M-<id>: [SF-<id>, ...]}` block on the snapshot — would force every consumer to do a two-step lookup and fragment Rule 7 enforcement across two fields.
2. No backwards-compatibility shim: `evidence_records` defaults to `[]`, so existing PG records with `status: preserved` continue to validate untouched.

## Verification Layers

1. Schema admission → schema validation: PG with `unresolved_mystery_claims: [{mystery_id: M-1, authority: apparent, status: clue_added, evidence_records: [SF-7]}]` validates cleanly against `story-page.schema.json`.
2. Status-conditional legality → validator unit test: `status: narrowed` + empty `evidence_records` emits `mystery_evidence_required`; `status: preserved` + empty `evidence_records` passes.
3. Closure walk → validator unit test: `evidence_records: [SF-7, BEL-3]` resolves cleanly when SF-7 and BEL-3 exist in the bundle; `evidence_records: [SF-99]` (missing) emits a dangling-reference finding.
4. Replay equality → validator unit test: a child snapshot whose `unresolved_mystery_claims[].evidence_records` accumulate parents-plus-additions across a chain produces no `snapshot_replay_equality.snapshot_drift` finding when the helper preserves the field; flipping any single id mid-chain emits the finding.
5. FOUNDATIONS alignment check: Rule 7 surface — adding `evidence_records` does not silently resolve any Mystery Reserve M-record; the field is read-only at this layer (no auto-resolution logic added).

## Landed Changes

### 1. Contract §4.2 schema extension

`.claude/skills/_shared-templates/story-state-contract.md` §4.2 PG schema now includes `evidence_records: [SF-<integer> | BEL-<integer> | DA-<integer> | SE-<integer>]` on each `unresolved_mystery_claims[]` entry, with prose stating the default/required-status and story-local closure rules.

### 2. JSON schema

`tools/validators/src/schemas/story-page.schema.json` now admits `evidence_records` as an array property with item pattern `^(SF|BEL|DA|SE)-[0-9]+$` and `default: []`. The status-conditional non-empty legality is enforced by `state-snapshot-integrity`, not by JSON-schema `if`/`then` (parallel to ticket 001's input-legality architecture decision: validator enforcement where the conditional context lives in scope).

### 3. Snapshot-replay helper

`tools/validators/src/_helpers/state-snapshot-replay.ts` now projects `unresolved_mystery_claims[]` with `evidence_records`, defaults omitted evidence to `[]`, and exposes replay support that preserves inherited evidence while accepting additions from the current resolved event.

### 4. Snapshot-replay-equality refinement

`tools/validators/src/structural/snapshot-replay-equality.ts` now compares `unresolved_mystery_claims` evidence lineage instead of excluding the field entirely. Parent evidence must remain present in the child claim, and newly cited evidence must come from the resolved event id or `SE.state_delta.create` ids in the `SF | BEL | DA | SE` evidence set.

### 5. Integrity closure check

`tools/validators/src/structural/state-snapshot-integrity.ts` now emits `state_snapshot_integrity.mystery_evidence_required` (`severity: fail`) when `status` is one of `clue_added | narrowed | apparent_resolution | held_for_promotion` and `evidence_records` is empty. It also checks that evidence ids resolve to story-local `SF | BEL | DA | SE` records; world-level `DA` ids remain lawful in other snapshot fields but are not accepted as mystery evidence.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.2 schema + legality rule)
- `tools/validators/src/schemas/story-page.schema.json` (modify — `evidence_records` array property + default)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — projection includes `evidence_records`)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — comparison includes `evidence_records`)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — `mystery_evidence_required` check + closure traversal)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify — new test cases for status-conditional + closure)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — new test case for `evidence_records` replay equality)
- `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (modify — new test case verifying helper projects `evidence_records` correctly across a parent→child chain)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify — schema admission/rejection coverage for `evidence_records`)
- `specs/SPEC-30-story-contract-hardening-ii.md` (modify — D5 implementation note)

## Out of Scope

- Health-audit Mystery-Accretion sub-check (ticket 006).
- MCP context-packet inclusion of `evidence_records` cross-references (ticket 006).
- Any change to M-record schema or Mystery Reserve firewall logic.
- Any new authority level or status value.
- Auto-resolution of M-records based on `evidence_records` size (out of scope; field is read-only signal here, audit interpretation lives in ticket 006).

## Acceptance Criteria

### Tests That Passed

1. From `tools/validators`, `npm run build` succeeds.
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
4. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — new cases for schema admission and malformed evidence-record rejection.

### Commands

1. From `tools/validators`: `npm run build`
2. From `tools/validators`: `node --test dist/tests/_helpers/state-snapshot-replay.test.js dist/tests/structural/record-schema-compliance-story-page.test.js dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/snapshot-replay-equality.test.js`
3. From `tools/validators`: `npm run test`
4. From repo root: `grep -n "evidence_records" tools/validators/src/schemas/story-page.schema.json .claude/skills/_shared-templates/story-state-contract.md`
5. From repo root: `grep -n "mystery_evidence_required" tools/validators/src/structural/state-snapshot-integrity.ts`
6. The full validator `test` command is the correct boundary because three validator surfaces are touched simultaneously (helper, replay-equality, integrity), with schema compliance coverage added for the PG JSON schema.

## Outcome

Completed. The PG mystery-claim write/validate path now carries explicit `evidence_records[]` pointers through the shared contract, JSON schema, snapshot replay helper, replay-equality validator, and state-snapshot integrity validator. Non-`preserved` mystery statuses now fail validation without evidence, evidence ids must resolve to story-local `SF | BEL | DA | SE` records, and replay equality detects child snapshots that drop inherited evidence or cite evidence not produced by the resolved event. SPEC-30 has a D5 implementation note; ticket 006 remains the health-audit/MCP read-consumer follow-up.

## Verification Result

1. Baseline before source edits: from `tools/validators`, `npm run test` passed 220 tests.
2. Post-change build: from `tools/validators`, `npm run build` passed.
3. Focused proof: from `tools/validators`, `npm run build && node --test dist/tests/_helpers/state-snapshot-replay.test.js dist/tests/structural/record-schema-compliance-story-page.test.js dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/snapshot-replay-equality.test.js` passed the four focused compiled test files.
4. Full package proof: from `tools/validators`, sandboxed `npm run test` hit `EPERM` in CLI tests that spawn the compiled `world-validate` executable / `git`; rerunning the same command with escalation passed 231 tests.
5. Grep proof: `grep -n "evidence_records" tools/validators/src/schemas/story-page.schema.json .claude/skills/_shared-templates/story-state-contract.md` returned the schema and shared-contract hits.
6. Grep proof: `grep -n "mystery_evidence_required" tools/validators/src/structural/state-snapshot-integrity.ts` returned the new fail-severity check.
7. FOUNDATIONS alignment review: `docs/FOUNDATIONS.md` Rule 7 / Mystery Accretion remains unchanged; this ticket adds evidence pointers and validator checks only, with no M-record resolution or canon mutation path.

## Deviations

1. The drafted verification plan omitted `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts`; it was added as same-seam schema admission/rejection proof for the new JSON-schema property.
2. The replay-equality implementation proves evidence lineage rather than reconstructing free-form mystery semantics: inherited parent evidence must remain present, and newly cited evidence must come from the resolved event id or `SE.state_delta.create` ids in `SF | BEL | DA | SE`. Health-audit interpretation of cumulative narrowing remains out of scope for ticket 006.
3. The package test command prints Node/git informational output from existing tests; all 231 tests passed in the escalated final run.
4. Pre-existing ignored package artifacts under `tools/validators/dist/` and `tools/validators/node_modules/` were present at intake. `dist/` was refreshed by build/test commands; `node_modules/` was left untouched.
