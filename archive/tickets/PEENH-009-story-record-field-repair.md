# PEENH-009: Story-bundle field repair pathway in update_record_field

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/ops/update-record-field.ts` now accepts story-bundle `originating_se` retcon attestations and a self-consistent `PG.state_hash` repair exemption; `tools/patch-engine/src/envelope/schema.ts` makes `RetconAttestation` support exactly one of `originating_ch` / `originating_se`; `tools/world-mcp/src/tools/describe-envelope-schema.ts` exposes the updated schema-discovery contract. The existing `tools/validators/src/structural/snapshot-replay-equality.ts` `state_hash_mismatch` verdict remains the validation surface.
**Deps**: SPEC-13 atomic-source migration (landed); story state contract §4.2a deterministic PG hash (landed); `tools/world-mcp/src/cli/compute-pg-hashes.ts` (landed alongside this discovery).

## Problem

At intake, `update_record_field` required `retcon_attestation` with `originating_ch: ^CH-[0-9]+$` for any structural-field change outside a small allowlist (`isFreelyAppendable` for `notes`/`modification_history`/`extensions`/`touched_by_cf`; `isProseFinalizeTransition` for `prose_path`/`prose_status`/`state_snapshot.arc_trace_emitted`/`state_snapshot.arc_trace_id`/`deferred_validation_trace.*`). CH (Change Log Entry) is a **world-canon** ledger artifact; story-bundle records (`PG-<integer>`, `SE-<integer>`, `BEL-<integer>`, etc.) have no CH analog — their causal trail is in SE events, not CH.

This blocked legitimate story-bundle field repairs. Concrete trigger: a `branching-story-turn-cycle` invocation in the `red-bunny` bundle (world `erotica-world`) committed `PG-2` on 2026-05-13 with a `state_hash = f4f268d5…2f93` computed against a draft whose `validation_trace.parent_snapshot_compatibility` text contained an ellipsis (`d5acd57086758...4b639ae`) that did not match the bytes actually submitted to the engine. The on-disk record's canonical `state_hash` (per `computePgStateHash` in `@worldloom/world-index/hash/content`) is `25d7a8cb5be13e13d1d3163b68ee453359e1a529246673d12c76ba71db2909b3`. Before this ticket, repair through `update_record_field` failed with `retcon_attestation_required` because the only schema-valid `originating_ch` was a world-canon-ledger reference unrelated to PG-2.

The validator already detected this class of mismatch via `snapshot_replay_equality.state_hash_mismatch` (added 2026-05-13 alongside the new-schema replay branch); this ticket added the engine-side repair path and used it to repair PG-2.

## Assumption Reassessment (2026-05-13)

1. At intake, `tools/patch-engine/src/ops/update-record-field.ts` exempted only `prose_path`, `prose_status`, `state_snapshot.arc_trace_emitted`, `state_snapshot.arc_trace_id`, and `deferred_validation_trace.{prose_ledger_consistency, arc_trace_evidence_alignment, prose_critic_8_axis}` from retcon-attestation requirements. `state_hash` was not exempt. `state_hash_parent`, `state_snapshot.active_records`, `state_snapshot.entity_status`, etc. remain non-exempt because they are real fork state.
2. At intake, `tools/patch-engine/src/envelope/schema.ts` (`RetconAttestation`) constrained `originating_ch` to `^CH-[0-9]+$` and had no `originating_se` alternative. This ticket changed the type to accept exactly one of `originating_ch` or `originating_se`, with runtime namespace enforcement in `update-record-field.ts`.
3. **Shared boundary under audit**: `update_record_field` is the only patch-engine op that can mutate a previously-committed atomic record's fields. It is used today by world-canon mutators (`canon-addition`'s `append_extension` callers and similar) and by the prose-finalize exemption pathway. Extending it to cover story-bundle field repair must not weaken the world-canon retcon discipline (FOUNDATIONS §Rule 6).
4. **FOUNDATIONS principle under audit**: Rule 6 (No Silent Retcons) — every canon change must be logged with justification. For story-bundle records, the analogous discipline is "every story-state change must be recorded in an `SE` event." A story-bundle field repair should cite the SE event that authorizes the repair (or, for the PG-2 case, a *new* repair-specific SE event scoped to the bundle's own causal log).
5. **Adjacent contradiction surfaced and repaired**: PG-2's committed `state_hash` was inconsistent with its canonical-JSON form. Classified as: required consequence of this ticket. The repair was applied through `/tmp/repair-pg2-state-hash-PEENH-009.json` after explicit user approval, and the on-disk `PG-2.yaml` now stores `25d7a8cb5be13e13d1d3163b68ee453359e1a529246673d12c76ba71db2909b3`.
6. **Proof-surface correction**: the drafted `tools/patch-engine/tests/envelope/validate.test.ts` path does not exist. The schema-discovery proof landed in `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`, which exercises `describe_envelope_schema`'s public envelope-schema projection for `retcon_attestation`.

## Architecture Check

1. **Why this approach over alternatives.**
   - *Option A (chosen): make `RetconAttestation` accept `originating_se` for story-bundle records and add a tightly-scoped exemption for `state_hash` repair when the new value matches `computePgStateHash(record_after_update)`.* Preserves Rule 6 discipline (every repair is logged in an SE) while giving story-bundle records a schema-valid attestation pathway. The self-consistent check makes `state_hash` repair safe even without attestation — the engine refuses any new value that disagrees with the canonical form of the post-update record.
   - *Option B (rejected): add `state_hash` to `isProseFinalizeTransition`.* Bypasses the discipline entirely — skills could stamp any sha256 onto state_hash. Loses the safety property the validator just gained.
   - *Option C (rejected): cite an unrelated CH reference like CH-1.* Format-valid but semantically wrong. Pollutes the world-canon ledger's audit trail with story-bundle field repairs. Future readers cannot tell repair-of-PG-2 from a real canon retcon.
2. **No backwards-compatibility aliasing/shims introduced.** Existing `originating_ch` callers continue to work unchanged. New `originating_se` field is additive on `RetconAttestation`. The self-consistent-repair exemption is gated by exact-value equality, not by a wildcard.

## Verification Layers

1. **Invariant**: `state_hash` field on a PG record is byte-identical to `computePgStateHash(pg_record_after_update)` → `tools/validators/src/structural/snapshot-replay-equality.ts` `snapshot_replay_equality.state_hash_mismatch` verdict (already implemented as of 2026-05-13).
2. **Invariant**: `update_record_field` cannot set `state_hash` to a value that disagrees with the canonical form → patch-engine unit test in `tools/patch-engine/tests/ops/update-record-field.test.ts` exercising both the success path (matching hash, no attestation needed) and the failure path (non-matching hash, attestation required).
3. **Invariant**: `RetconAttestation` exposes `originating_se: ^SE-[0-9]+$` in the public envelope schema with exactly-one-origin semantics → schema-discovery test in `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`.
4. **Invariant**: World-canon retcons still require `originating_ch` and never accept `originating_se` → integration test on a world-canon `update_record_field` call with `originating_se` (must fail with a clear error).

## Landed Changes

### 1. Patch-engine: `RetconAttestation` schema

In `tools/patch-engine/src/envelope/schema.ts`, `RetconAttestation` was extended:

```typescript
interface RetconAttestation {
  retcon_type: "A" | "B" | "C" | "D" | "E" | "F";
  originating_ch?: string;  // ^CH-[0-9]+$, required for world-canon records
  originating_se?: string;  // ^SE-[0-9]+$, required for story-bundle records
  rationale: string;
}
```

The public schema-discovery constraint in `tools/world-mcp/src/tools/describe-envelope-schema.ts` now requires exactly one of `originating_ch` / `originating_se` (`oneOf` with the respective patterns).

### 2. Patch-engine: `validateRetconAttestation` discriminates by record namespace

In `tools/patch-engine/src/ops/update-record-field.ts`, retcon attestation now branches by the target record's class prefix:
- If `target_record_id` matches a world-canon class prefix (`CF`, `CH`, `INV`, `M`, `OQ`, `ENT`, `SEC-*`) → require `originating_ch`.
- If `target_record_id` matches a story-bundle class prefix (`PG`, `SE`, `STENT`, `STINT`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `CHC`, `SLT`, `BR`, `DA`) → require `originating_se`.

### 3. Patch-engine: self-consistent `state_hash` repair exemption

Added `isSelfConsistentStateHashRepair(record_after_update, fieldPath, operation, newValue)`:
- `fieldPath` is `["state_hash"]`
- `operation` is `"set"`
- `newValue` matches `computePgStateHash(record_after_update)` (using `@worldloom/world-index/hash/content`)

When this returns true, attestation is not required. The exemption is bounded: any other new value still requires `originating_se` attestation.

### 4. Tests for the new exemption

Reused the existing `snapshot_replay_equality.state_hash_mismatch` verdict. Added patch-engine tests that:
1. Stage an `update_record_field` op setting `PG.state_hash` to the canonical value with no attestation -> engine accepts.
2. Stage an `update_record_field` op setting `PG.state_hash` to an arbitrary other sha256 with no attestation -> engine rejects with `retcon_attestation_required`.

### 5. PG-2 repair patch plan (canon use of the new pathway)

Submitted after explicit user approval:

```json
{
  "op": "update_record_field",
  "target_file": "worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml",
  "target_record_id": "PG-2",
  "payload": {
    "target_record_id": "PG-2",
    "field_path": ["state_hash"],
    "operation": "set",
    "new_value": "25d7a8cb5be13e13d1d3163b68ee453359e1a529246673d12c76ba71db2909b3"
  }
}
```

This used the self-consistent-repair exemption (no attestation), so it worked without inventing an SE-citation.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/ops/update-record-field.ts` (modify)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` (engine-written repair)

## Out of Scope

- Generalizing the self-consistent-repair exemption to every derived field on every record class. PEENH-009 is scoped narrowly to `PG.state_hash` because that is the only currently-load-bearing case; if additional derived fields surface (e.g., a future `pages-prose-receipts/*.yaml` content_hash field), open a follow-up that builds on this pattern.
- Adding a story-bundle Change Log analog. Story-bundle records already have SE; layering another ledger on top would duplicate state.
- Repairing PG-2 via a placeholder CH-1 attestation. The user explicitly rejected this option on 2026-05-13 — it would pollute the world-canon ledger's audit trail with a story-bundle field repair.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test` — all existing tests plus the new update-record-field cases (story-record SE attestation, world-canon CH attestation rejection of SE, self-consistent state_hash repair without attestation).
2. `cd tools/validators && npm test` — `snapshot_replay_equality` legacy + new-schema tests still pass; on-disk PG-2 no longer trips the `state_hash_mismatch` verdict after the repair lands.
3. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` — prints `{plan_hash: edcd2487…, state_hash: 25d7a8cb…}` and the on-disk record's `state_hash` field matches the printed `state_hash` after the repair lands.

### Invariants

1. `state_hash` on every committed PG record (root and non-root) equals `computePgStateHash(record_with_state_hash_excluded)` to byte equality — the canonical form is the only source of truth.
2. World-canon retcons (`update_record_field` on `CF-<integer>`, `INV-<*>`, `M-<integer>`, `OQ-<integer>`, `SEC-*`, `ENT-<integer>`) still cite `originating_ch`. Story-bundle retcons cite `originating_se`. The two namespaces never cross.
3. `state_hash` self-consistent repair is the only exemption that bypasses attestation; all other story-bundle structural-field changes require an `originating_se` citation.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/update-record-field.test.ts` — new cases for SE-attested story-bundle field updates, world-canon rejection of `originating_se`, and the self-consistent state_hash repair (positive and negative cases).
2. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — schema-discovery cases for `RetconAttestation.originating_se` shape and exactly-one-origin semantics.
3. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — already covers the new-schema replay including state_hash equality (added 2026-05-13); no new test needed unless the new patch-engine surface introduces a code path that bypasses canonical-form computation.

### Commands

1. `cd tools/patch-engine && npm test`
2. `cd tools/world-mcp && npm test`
3. `cd tools/validators && npm test`
4. Build envelope at `/tmp/repair-pg2-state-hash-PEENH-009.json` containing the canonical-value update with no attestation; run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/repair-pg2-state-hash-PEENH-009.json` (PASS); sign token; submit via `tools/world-mcp/dist/src/cli/submit-patch-plan.js`; re-run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` (state_hash matches the on-disk value).

## Outcome

Completion date: 2026-05-13.

Implemented the story-bundle repair path in `update_record_field`. World-canon structural retcons still require `originating_ch`; story-bundle structural retcons require `originating_se`; `PG.state_hash` can be repaired without attestation only when the proposed value equals `computePgStateHash(record_after_update)`.

Updated the public `describe_envelope_schema` retcon-attestation shape so machine consumers can discover `originating_se` and exactly-one-origin semantics. Submitted the PG-2 repair plan through the patch-engine CLI after explicit user approval; `PG-2.yaml` now stores the canonical state hash.

## Verification Result

1. `cd tools/world-index && npm run build` — passed; refreshed the symlinked producer package export for `@worldloom/world-index/hash/content`.
2. `cd tools/patch-engine && npm test` — passed; 75/75 tests.
3. `cd tools/world-mcp && npm test` — passed; 354/354 tests.
4. `cd tools/validators && npm test` — passed; 183/183 tests.
5. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/repair-pg2-state-hash-PEENH-009.json` — passed before submit with `status: "pass"`.
6. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/repair-pg2-state-hash-PEENH-009.json /tmp/repair-pg2-state-hash-PEENH-009.token` — passed; wrote only `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` and synced the index.
7. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` — passed; printed `plan_hash: edcd248735f79e3adddd2113d04b4c2364aba6268ef56f63c0d7f0c42235583f` and `state_hash: 25d7a8cb5be13e13d1d3163b68ee453359e1a529246673d12c76ba71db2909b3`.
8. `rg -n '^state_hash:' worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` — confirmed the on-disk `state_hash` equals the computed value.

## Deviations

- The drafted patch-engine envelope test path `tools/patch-engine/tests/envelope/validate.test.ts` does not exist. The schema proof landed in `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`, which is the live public schema-discovery surface.
- The validator/hash CLI substrate (`tools/validators/src/_helpers/state-snapshot-replay.ts`, `tools/validators/src/structural/snapshot-replay-equality.ts`, `tools/world-index/src/hash/content.ts`, `tools/world-mcp/package.json`, `tools/world-mcp/src/cli/compute-pg-hashes.ts`, and `.claude/skills/_shared-templates/story-state-contract.md`) was pre-existing same-seam work at intake. This ticket relied on and verified it but did not author those hunks.
