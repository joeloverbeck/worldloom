# VALENH-019: snapshot_replay_equality migration to new SE.state_delta schema + state_hash equality check

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/_helpers/state-snapshot-replay.ts` (new schema-aware replay helpers; legacy `replayStateSnapshot` retained for `applied_event_ops`-bearing fixtures); `tools/validators/src/structural/snapshot-replay-equality.ts` (schema discrimination + new-schema replay path + state_hash equality check via `computePgStateHash`). The validator now imports `canonicalJsonStringify` and `computePgStateHash` from `@worldloom/world-index/hash/content` introduced by MCPENH-045.
**Deps**: `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md` (predecessor: enforced sha256 shape but explicitly out-scoped the validator's full rewrite — see VALENH-016 line 87); `archive/tickets/VALENH-011-register-bel-record-schema-compliance-and-drop-arc-trace-validators.md` (predecessor: noted "wholesale PG/SE replay-model rewrite to the rebuilt story-skill family" as out-of-scope — VALENH-011 line 26); `tickets/MCPENH-045.md` (companion: provides the shared `canonicalJsonStringify` / `computePgStateHash` helpers this ticket consumes).

## Problem

`snapshot_replay_equality` predates the greenfield SE-schema rewrite. The validator expected the legacy `PG.applied_event_ops: [SE-<integer>]` field paired with `SE.ops[].op_type` from a closed enum (`fact_create`, `obligation_open`, `consequence_open`, `thread_supersede`, `relationship_supersede`, `intention_refresh`, `cast_change`, `location_change`, `inventory_change`, `canon_sync`, etc.) mutating snapshot fields like `objective_facts` / `obligations_open` / `threads_active`.

The post-greenfield story state contract (`.claude/skills/_shared-templates/story-state-contract.md` §4.2 PG schema, §4.3 SE schema) instead uses `PG.input.resolved_event_id: SE-<integer>` with `SE.state_delta.{create, supersede, close}` mutating `PG.state_snapshot.active_records.{STENT|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA}`.

Concrete trigger this session (2026-05-13): a `branching-story-turn-cycle` invocation in `worlds/erotica-world/stories/red-bunny/` attempted to commit PG-2 (BR-1 continuation of PG-1 via CHC-2 → SLT-2). `mcp__worldloom__validate_patch_plan` returned `status: fail` with `snapshot_replay_equality.snapshot_drift` because the validator's replay applied zero ops (no `applied_event_ops` to walk; `SE-2.state_delta.create/supersede/close` invisible to the legacy code path) and reported every active_records-vs-parent diff as drift. PG-1 had passed at bootstrap because `parent_page_id` is null and the validator skips root pages — PG-2 was the first non-root page ever submitted with the new SE schema, exposing the latent gap.

`branching-story-turn-cycle` (the target skill of this audit) had to patch the validator in-session to unblock its own commit. The skill's Guardrails §Known integration debt section discloses MCPENH-040 / PEENH-007 / VALENH-011 but does NOT disclose this validator migration — VALENH-016 line 87 acknowledged the deferral ("`snapshot_replay_equality` validator's pre-greenfield-reset architecture references … that validator predates the rebuilt story-skill family; refactor / replace is a separate concern") but no ticket was ever filed to actualize it. This ticket files it.

Adjacent finding: the validator did not catch a separate authoring bug in the same session where `branching-story-turn-cycle`'s ad-hoc `/tmp/compute-pg2-hash.js` script computed PG-2.state_hash against truncated `validation_trace.parent_snapshot_compatibility` text. The initially submitted PG-2 record's stored `state_hash = f4f268d5b6ca0212b33a218351a7f2c307dfd77757cd3212ba97d10930742f93` differed from the canonical hash of its on-disk content (`25d7a8cb5be13e13d1d3163b68ee453359e1a529246673d12c76ba71db2909b3`). This ticket adds a `state_hash` equality check to the new-schema replay path so the validator catches that class of authoring bug at submit time. (The PG-2 repair itself landed through `archive/tickets/PEENH-009-story-record-field-repair.md`.)

## Assumption Reassessment (2026-05-13)

1. **Codebase reassessment.** `git show HEAD:tools/validators/src/structural/snapshot-replay-equality.ts` carries only the legacy code path: `applies_to` gates on `create_pg_record`; per-page loop reads `parsed.applied_event_ops`, walks `eventRecords` through `recordMap.byId`, applies legacy `op_type` semantics via `replayStateSnapshot` in `_helpers/state-snapshot-replay.ts`. No `state_delta` awareness, no `active_records.{class}` replay, no `state_hash` recomputation against canonical form. `git status --porcelain` at audit time shows `M tools/validators/src/_helpers/state-snapshot-replay.ts` and `M tools/validators/src/structural/snapshot-replay-equality.ts` — uncommitted in-session edits implement the new-schema branch + state_hash check; the landed version should match the working-tree shape. Verified by `grep -E 'runNewSchemaReplay|replayActiveRecords|computePgStateHash'` against the working-tree files.
2. **Doc reassessment.** `.claude/skills/_shared-templates/story-state-contract.md` §4.2 lists the new PG schema's `state_snapshot.active_records.{STENT|STINT|SF|BEL|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA}` shape; §4.3 defines `SE.state_delta.{create, supersede, close}`; §4.2a specifies the deterministic state_hash computation (canonical JSON with keys sorted lexicographically at every depth, excluding `state_hash` and `rendered_prose`). `archive/tickets/VALENH-016.md` line 87 explicitly out-scopes the validator rewrite. `archive/tickets/VALENH-011.md` line 26 says BEL acceptance is a focused fixture and a full replay-model rewrite is out of scope. No archived ticket has an Outcome resolving the gap.
3. **Shared boundary under audit.** The validator is the cross-skill enforcement surface for FOUNDATIONS Rule 5 (No Consequence Evasion) at page-cycle commit time. The input contracts are: `tools/patch-engine/src/envelope/schema.ts` `create_pg_record` and `create_se_record` payloads; `.claude/skills/_shared-templates/story-state-contract.md` §4.2 / §4.3 schema definitions; the new-schema replay primitive `replayActiveRecords` in `_helpers/state-snapshot-replay.ts`. Extending the validator must not weaken the legacy replay path that existing fixtures still exercise (per VALENH-011's "focused fixtures" approach).
4. **FOUNDATIONS principle under audit.** Rule 5 (No Consequence Evasion) — "if a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest." The validator's job is the structural backstop that proves `PG.state_snapshot.active_records` equals `replay(parent.active_records, SE.state_delta)`. Without the new-schema branch, the backstop is silently inert on every non-root post-greenfield page, and a malformed envelope where the recorded snapshot drifts from what `state_delta` would actually produce could land — silently losing obligations / facts / consequences. Rule 7 (Preserve Mystery Deliberately) is unaffected: gate 3 (mystery_invariant_firewall) is a separate validator on `mystery_policy.forbidden_resolutions`, not on snapshot replay.
5. **HARD-GATE / Canon Safety Check surface.** The validator runs at patch-engine pre-apply (per `tools/patch-engine/src/apply.ts` `runPreApplyValidators`); a `fail` verdict blocks the patch submission before any `_source/<class>/*.yaml` write. The change extends the validator's drift-detection coverage; it does NOT weaken the Mystery Reserve firewall (gate 3 is owned by a separate validator surface) and does NOT weaken any other Canon Safety Check. The state_hash equality addition is a strict tightening of consequence-evasion coverage.
6. **Adjacent contradictions.** (a) At intake, PG-2 in `worlds/erotica-world/stories/red-bunny/` had an inconsistent state_hash (declared `f4f268d5…`, canonical `25d7a8cb…`). Classified as: separate bug; the repair pathway landed in `archive/tickets/PEENH-009-story-record-field-repair.md` (story-bundle field repair via `originating_se` retcon attestation + self-consistent state_hash exemption). (b) Target skill `branching-story-turn-cycle` SKILL.md's Guardrails §Known integration debt section misses disclosure of this validator migration; classified as: skill-prose drift, routed via `/skill-audit .claude/skills/branching-story-turn-cycle` (Phase 8 of the audit that emitted this ticket), not this ticket's scope.
7. **Mismatch + correction.** Working-tree-vs-HEAD: uncommitted in-session edits to `tools/validators/src/_helpers/state-snapshot-replay.ts` and `tools/validators/src/structural/snapshot-replay-equality.ts` partially implement this ticket. The Phase 5 codebase verification was performed against HEAD (`git show HEAD:<path>`), not against the working tree. The landed version should match the working-tree shape: `ACTIVE_RECORDS_CLASSES` constant, `ActiveRecordsClass` type, `StateDelta` type, `activeRecordsClassOf()`, `replayActiveRecords()` exported from the helper; schema-discrimination branch + `runNewSchemaReplay()` + state_hash equality check in the validator. The 7 legacy tests under `tools/validators/dist/tests/structural/snapshot-replay-equality.test.js` all pass after the in-session refactor.

## Architecture Check

1. **Why this approach over alternatives.**
   - *Option A (chosen): schema discrimination at the per-page loop; legacy path unchanged for `applied_event_ops`-bearing fixtures, new path runs `replayActiveRecords` against `state_snapshot.active_records.{class}` and treats workflow-stamped fields (`visible_affordances`, `entity_status`, `unresolved_mystery_claims`, `continuation`) as not-reconstructible-from-delta-alone.* Preserves the legacy fixture coverage VALENH-003 / -005 / -006 / -008 / -011 built up, while adding the new-schema branch the rebuilt story-skill family requires. The new-schema state_hash equality check via `computePgStateHash` from `@worldloom/world-index/hash/content` (introduced by MCPENH-045) is the structural backstop that catches authoring bugs like the one this audit surfaced.
   - *Option B (rejected): wholesale replace `replayStateSnapshot`'s legacy op_type semantics with the new `state_delta` model.* Breaks every existing legacy fixture; conflicts with VALENH-016 line 87's deferral framing ("refactor / replace is a separate concern" implies a later, scoped rewrite, not an immediate wholesale replacement); loses the ability to keep validating PG records that were written under the legacy schema before the migration was decided.
   - *Option C (rejected): skip new-schema pages entirely (narrow `continue` if `applied_event_ops` absent).* Weakens the safety surface — the validator becomes silently inert on every new-schema page, and the safety property the validator was meant to enforce disappears for the entire rebuilt story-skill family. The Claude Code auto-mode classifier flagged this exact pattern in-session as a safety regression.
2. **No backwards-compatibility aliasing/shims introduced.** The legacy `replayStateSnapshot` export remains in `_helpers/state-snapshot-replay.ts` unchanged. Legacy fixtures continue passing without modification. The new exports (`ACTIVE_RECORDS_CLASSES`, `ActiveRecordsClass`, `StateDelta`, `activeRecordsClassOf`, `replayActiveRecords`) are additive. The schema-discrimination branch in the validator selects legacy-vs-new at runtime by checking the per-page record's `applied_event_ops` presence — no global toggle, no migration flag, no compatibility wrapper.

## Verification Layers

1. **Invariant**: `PG.state_snapshot.active_records.{class}` byte-equals `replayActiveRecords(parent.state_snapshot.active_records, SE.state_delta)` for every non-root new-schema PG → patch-engine pre-apply validator verdict (`snapshot_replay_equality.snapshot_drift` flags per-class drift with `expected` / `got` detail).
2. **Invariant**: `PG.state_hash` byte-equals `computePgStateHash(pg_record)` for every committed PG → patch-engine pre-apply validator verdict (`snapshot_replay_equality.state_hash_mismatch` flags author-time-vs-canonical hash drift; `suggested_fix` points at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`).
3. **Invariant**: legacy `applied_event_ops`-bearing fixtures still validate cleanly → existing 7-test suite at `tools/validators/dist/tests/structural/snapshot-replay-equality.test.js` continues to pass with zero modifications.
4. **Invariant**: cross-package consistency — the canonical-JSON serialization used at authoring time (compute-pg-hashes CLI from MCPENH-045) is byte-identical to what the validator uses for drift detection → shared `canonicalJsonStringify` / `computePgStateHash` import from `@worldloom/world-index/hash/content`; codebase grep-proof that no second canonical-JSON implementation lives in `tools/validators/src/`.

## What to Change

### 1. `tools/validators/src/_helpers/state-snapshot-replay.ts` — add new-schema replay helpers

Add (additive — legacy exports unchanged):

```typescript
export const ACTIVE_RECORDS_CLASSES = [
  "STENT", "STINT", "SF", "BEL", "OBL", "CNSQ", "THR",
  "SREL", "STLOC", "STOBJ", "DA"
] as const;
export type ActiveRecordsClass = (typeof ACTIVE_RECORDS_CLASSES)[number];

export interface StateDelta {
  create?: readonly string[];
  supersede?: readonly string[];
  close?: readonly string[];
}

export function activeRecordsClassOf(id: string): ActiveRecordsClass | null;
export function replayActiveRecords(
  parentActiveRecords: Record<string, readonly string[]>,
  delta: StateDelta
): Record<ActiveRecordsClass, string[]>;
```

Algorithm for `replayActiveRecords`:
- Seed `next[cls]` from `parentActiveRecords[cls]` for every class in `ACTIVE_RECORDS_CLASSES`; coerce non-array seeds to empty arrays.
- Drop ids in `delta.supersede ∪ delta.close` from every class list.
- For each id in `delta.create`, look up its class via `activeRecordsClassOf()`; append to `next[cls]` if not already present. Ids whose prefix is not in `ACTIVE_RECORDS_CLASSES` (e.g., `CHC-<integer>`, `SLT-<integer>`, `SE-<integer>`) are silently ignored — auxiliary records are tracked on other PG fields, not in `active_records`.

### 2. `tools/validators/src/structural/snapshot-replay-equality.ts` — schema discrimination + new-schema path

Import `canonicalJsonStringify` and `computePgStateHash` from `@worldloom/world-index/hash/content` (provided by MCPENH-045). Drop the local `sortJson`/`stableJson` definitions — single source of truth for canonical-JSON serialization lives in the helper package.

Insert schema-discriminator after `parentPageId` resolution:

```typescript
if (parsed.applied_event_ops === undefined) {
  verdicts.push(...runNewSchemaReplay(page, parsed, parent, recordMap.byId));
  continue;
}
// legacy path follows unchanged
```

`runNewSchemaReplay` algorithm:
1. Resolve `parsed.input.resolved_event_id`. Emit `snapshot_replay_equality.event_missing` if absent or unresolvable through `recordMap.byId`.
2. Build a `StateDelta` from `event.state_delta.{create, supersede, close}` (coerce to string arrays).
3. Call `replayActiveRecords(parent.state_snapshot.active_records, delta)`.
4. For each class in `ACTIVE_RECORDS_CLASSES`, compare expected-sorted vs got-sorted via `canonicalJsonStringify`. Per-class drifts accumulate into the verdict's `detail.drifts[]` with `field: "active_records.<CLASS>"`.
5. After replay-equality check: recompute `computePgStateHash(parsed)` and compare to declared `parsed.state_hash`. Mismatch emits `snapshot_replay_equality.state_hash_mismatch` with the canonical hash in the message and `suggested_fix` pointing at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`.
6. Workflow-stamped fields (`visible_affordances`, `entity_status`, `unresolved_mystery_claims`, `continuation`) are intentionally NOT compared — they are skill-authored, not delta-derivable, and gated by separate validators (plan-grounding, mystery-firewall).

### 3. Documentation cross-reference

No skill-prose edits in this ticket. Skill-prose drift on `branching-story-turn-cycle` Guardrails §Known integration debt is routed separately via `/skill-audit .claude/skills/branching-story-turn-cycle` per the audit's Phase 8.

## Files to Touch

- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — add a focused new-schema fixture per VALENH-011's pattern; the existing 7 legacy tests must continue to pass)

## Out of Scope

- Repairing the inconsistent PG-2.state_hash in `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml`. Completed by `archive/tickets/PEENH-009-story-record-field-repair.md` (engine support for story-bundle field repair).
- Wholesale replacement of the legacy `replayStateSnapshot` op_type semantics. The legacy fixtures continue to exercise the legacy code path; a future ticket may retire it once no committed PG records carry `applied_event_ops`.
- Updating `branching-story-turn-cycle` / `branching-story-bootstrap` SKILL.md prose to reference this ticket from their Guardrails §Known integration debt. Routed to `/skill-audit` per the audit's Phase 8 sibling handoff.
- The compute-pg-hashes CLI and shared canonical-JSON helpers in `@worldloom/world-index/hash/content`. Owned by `tickets/MCPENH-045.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/snapshot-replay-equality.test.js` — all 7 legacy tests pass; the new-schema fixture test passes; total 8+ passing tests.
2. `cd tools/validators && npm run build && node --test dist/tests/structural/registry.test.js` — passes (validator name still registered).
3. `cd tools/validators && npm run build && node --test dist/tests/integration/validate-patch-plan.test.js` — all 15 integration tests pass.
4. Re-validating the original `/tmp/patch-plan.json` (the PG-2 envelope from this session) through `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/patch-plan.json` returns `status: pass` when the environment includes the archived PEENH-009 PG-2 repair, OR returns the expected `state_hash_mismatch` verdict with the canonical-hash diagnosis when run against a pre-repair fixture.

### Invariants

1. Every committed PG record under the new SE.state_delta schema satisfies: `state_snapshot.active_records.{class}` is byte-equal to `replayActiveRecords(parent.state_snapshot.active_records, resolved_event.state_delta)` for every class in `ACTIVE_RECORDS_CLASSES`.
2. Every committed PG record satisfies: `state_hash` is byte-equal to `computePgStateHash(record)` where `computePgStateHash` excludes `state_hash` itself and `rendered_prose` from the canonical-JSON payload.
3. The canonical-JSON serialization used at PG-authoring time (via the compute-pg-hashes CLI from MCPENH-045) is byte-identical to what the validator uses for drift detection — both routes import `canonicalJsonStringify` from `@worldloom/world-index/hash/content`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — add a new-schema fixture parallel to VALENH-011's `test #2` ("compares active_records snapshots with BEL entries"): a parent PG with populated `state_snapshot.active_records.{STENT, STINT, SF, BEL}`, an SE with `state_delta.create: [...new ids]` and `state_delta.close: [...prior ids]`, and a child PG whose snapshot matches the expected replay. Add a paired failure-case fixture where the child's snapshot drifts in one class.
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — add a state_hash equality test: a child PG with a declared `state_hash` that disagrees with `computePgStateHash(child)` emits the `state_hash_mismatch` verdict; the same child with the corrected hash passes.

### Commands

1. `cd tools/validators && npm test` — full validator suite.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/patch-plan.json` — re-run the audit's reproduction case (the original PG-2 envelope); expect `status: pass` after the archived PEENH-009 PG-2 repair, or `state_hash_mismatch` when intentionally testing a pre-repair fixture.
3. `grep -E 'runNewSchemaReplay|replayActiveRecords|computePgStateHash' tools/validators/src/structural/snapshot-replay-equality.ts tools/validators/src/_helpers/state-snapshot-replay.ts` — confirm the new-schema path symbols are present in the landed code.
