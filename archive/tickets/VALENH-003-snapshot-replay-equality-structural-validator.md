# VALENH-003: Snapshot-replay-equality structural validator

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/` (new validator), `tools/validators/src/_helpers/` (new op-application helper), `tools/validators/src/public/registry.ts` (register validator), plus paired tests under `tools/validators/tests/`.
**Deps**: none

## Problem

At intake, `branching-story-page-cycle` Phase 9 gate 4 (snapshot-replay equality) was only operator-verified: the operator inspected `parent.state_snapshot + applied_event_ops` and asserted equality with `new_pg.state_snapshot` on the new page's `validation_trace.snapshot_replay_equality` field with a one-line rationale. There was no programmatic backstop, so a careless operator could land an envelope where the recorded `state_snapshot` drifted from what the SE ops would actually produce, silently losing obligations / facts / consequences and violating Rule 5 (No Consequence Evasion). This ticket adds that structural backstop in the validators package.

## Assumption Reassessment (2026-05-05)

1. **Codebase reassessment** — `rg -n 'snapshot_replay|state_snapshot|applied_event_ops' tools/validators/src tools/patch-engine/src` still finds no existing replay-equality validator. `tools/validators/src/public/registry.ts` registers the structural validators (`yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `record_schema_compliance`, `touched_by_cf_completeness`, `modification_history_retrofit`), and none replay SE.ops. The drafted `tools/validators/src/framework/registry.ts` path is stale; the live registry is `tools/validators/src/public/registry.ts`.
2. **Doc reassessment** — `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` names gate 4 as `parent.state_snapshot + applied_event_ops == this_page.state_snapshot; state_hash_after of last op == this_page.state_hash` and assigns failures to Phase 5. `.claude/skills/branching-story-page-cycle/references/record-schemas.md` and `phase-5-state-mutation.md` define the live closed `op_type` enum as `fact_create`, `fact_invalidate`, `obligation_open`, `obligation_pay_off`, `obligation_complicate`, `obligation_supersede`, `obligation_transfer`, `obligation_abandon`, `consequence_open`, `consequence_address`, `thread_supersede`, `relationship_supersede`, `intention_refresh`, `cast_change`, `location_change`, `inventory_change`, and `canon_sync`. The draft omitted several live enum values; this ticket owns the validator semantics for the full current enum.
3. **Cross-skill / shared-boundary identification** — the validator's input contract is the patch engine's `PatchOperationEnvelope` shape (`tools/patch-engine/src/envelope/schema.ts`), specifically story Shape B `create_pg_record` and `create_se_record` payloads (`payload.story_slug`, `payload.record`). The shared boundary under audit is: PG `state_snapshot` + `parent_page_id` + `applied_event_ops` + `state_hash`, SE `ops[]` + `state_hash_after`, and the closed `op_type` enum semantics in `branching-story-page-cycle` Phase 5 / record schemas. The story record JSON schemas are intentionally permissive (`id` + `story_id` required, `additionalProperties: true`), so this validator must enforce the replay invariant without pretending the schema files enumerate the full body.
4. **FOUNDATIONS principle motivating the ticket** — Rule 5 (No Consequence Evasion). FOUNDATIONS.md §Validation Rules states Rule 5 governs that consequences must persist into the next state-snapshot; the page-cycle SKILL's `references/governance-and-foundations.md` table maps Rule 5 to Phase 9 gate 12 (consequence persistence) AND gate 4 (snapshot-replay equality) — both sides of the consequence-preservation invariant. Gate 12 is operator-verified at present; gate 4 is operator-verified at present. Programmatic enforcement of gate 4 is the missing structural backstop closest to Rule 5's intent.
5. **HARD-GATE / Canon Safety Check semantics** — Phase 9 IS the page-cycle skill's Canon Safety Check phase (per SKILL.md Phase 9 header `(Canon Safety Check phase)`). Adding a structural validator strengthens the firewall transitively: a snapshot-replay drift on a PG record could cause downstream Phase 4.5 canon-promotion handoffs (`story-fact-promotion-to-canon`) to operate on a corrupted state-snapshot. The new validator does not weaken the Mystery Reserve firewall; it strengthens the substrate gate-4 stands on.
6. **Package/proof reassessment** — there is no root `pnpm` workspace in this repo. The validators package is `tools/validators/package.json` with `npm run build`, `npm test`, and compiled `dist/tests/**/*.test.js` execution. `tools/world-mcp/node_modules/@worldloom/validators` is a symlink to `../../../validators`, so a producer `npm run build` in `tools/validators` is enough for the world-mcp CLI to resolve fresh compiled validator output.
7. **Adjacent contradictions surfaced** — Phase 9 gates 3 (recursive reference closure) and 10 (state_snapshot integrity) are also operator-verified. Both are candidates for follow-up structural validators (a recursive-reference-closure validator on PG.state_snapshot's reachability set; a state_snapshot integrity validator on field-population completeness). They are out of scope for this ticket — separate VALENH-NNN tickets if warranted by future audit signal — but flagged here so the parallel-validator pattern is acknowledged before any one of them lands. This ticket scopes to gate 4 only.

## Architecture Check

1. **Why this approach is cleaner than alternatives**:
   - **Structural validator (chosen)**: pre-apply check that runs alongside `cross_file_reference`, `id_uniqueness`, `record_schema_compliance` etc. The patch-engine framework already invokes structural validators for every envelope; adding the new validator slots into the existing pipeline cleanly. The op-application semantics encapsulate in a reusable `_helpers/` module that other validators (or runtime sub-tools) could consume.
   - **Rule-N validator (rejected)**: the Rule-N family governs semantic correctness of canon facts (Rule 1 floating-fact attribution, Rule 5 consequence-evasion semantic check, Rule 6 retcon attribution). State-replay equality is a structural invariant on record body field-equality, not a Rule-N semantic check. Wrong category.
   - **Engine-side check inside `tools/patch-engine/src/apply.ts` (rejected)**: the engine applies ops to disk; folding replay-equality verification into apply would couple verification with mutation, making the check harder to test in isolation. Validators live separately for reuse and testability.
   - **Operator-only (current state)**: drift risk is the warrant for this ticket.
2. **No backwards-compat shims**: the new validator runs as part of submit-time pre-apply check; it adds a check, not aliases. Existing PG records / SE records / `validation_trace.snapshot_replay_equality` operator-verified strings continue to be written; the validator just adds a programmatic verdict alongside.

## Verification Layers

1. **Per-op-type replay correctness** → unit tests in `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` cover the current closed-enum op_type families with golden parent-snapshot + ops → expected-snapshot fixtures.
2. **End-to-end replay equality on a representative envelope** → integration test in `tools/validators/tests/structural/snapshot-replay-equality.test.ts` that consumes a synthetic PG-cycle envelope and asserts the validator reports PASS.
3. **Drift detection** → negative-test fixture in `tools/validators/tests/structural/snapshot-replay-equality.test.ts` that synthesizes a deliberately drifted PG snapshot and asserts the validator reports FAIL with field-level drift detail.
4. **Validator registration** → `tools/validators/tests/structural/registry.test.ts` asserts the new `snapshot_replay_equality` validator name appears in the structural registry, ensuring validate/submit paths pick it up automatically.
5. **Pre-apply / CLI integration smoke** → a synthetic patch-plan fixture exercised through `tools/validators` proves the validator appears in `executions[]`; `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <fixture-envelope>` from repo root proves the same validator appears in `validators_run[]`.

## Landed Changes

### 1. New helper: state-snapshot-replay semantics

`tools/validators/src/_helpers/state-snapshot-replay.ts` exports a pure function that takes a parent snapshot, an array of SE ops, and a story-scoped record-id-to-record map (for resolving op `input_records` / `output_records` by id), and returns the computed next snapshot. Each op_type case implements its mutation semantics:

- `fact_create` → adds the new SF id to `objective_facts` / `apparent_facts` / `disputed_facts` / `reader_known_facts` / `belief_state_by_actor.<actor>` per the SF's `epistemic_class` (`objective` → objective_facts; `belief` → belief_state_by_actor.<actor>; etc.) and `known_by` (per-actor belief mapping).
- `obligation_supersede` → replaces the input OBL id with the output OBL id in `obligations_open` (preserving list-position semantics; supersession is in-place replacement).
- `obligation_open` → appends the new OBL id to `obligations_open`.
- `fact_invalidate` → removes the input SF id from all fact facets and adds/replaces the output SF id per the superseder fact's epistemic metadata.
- `obligation_pay_off` / `obligation_complicate` / `obligation_transfer` / `obligation_abandon` → moves or replaces the input OBL between the appropriate cumulative state lists.
- `consequence_open` → appends the new CNSQ id to `consequences_pending`.
- `consequence_address` → moves the input CNSQ id from `consequences_pending` to `consequences_addressed`.
- `thread_supersede` → replaces the input THR id with the output THR id in `threads_active`.
- `relationship_supersede` → replaces the input SREL id with the output SREL id in `relationships_current`.
- `intention_refresh` → replaces the input STINT id with the output STINT id in `intentions_current` when present, otherwise appends the output id.
- `location_change` → updates `current_location` to the op's `to` location-id.
- `cast_change` → updates `cast_present` and `entity_status` per the op's payload.
- `inventory_change` → updates `inventory_by_entity` and `objects_in_scope` per the op's payload / STOBJ supersession ids.
- `canon_sync` → updates `canon_revision` from the op payload.

Each case is a small switch arm; the helper composes them in op-array order to derive the next snapshot from the parent.

### 2. New structural validator

`tools/validators/src/structural/snapshot-replay-equality.ts` handles each `create_pg_record` op in the envelope:

- Resolve the parent PG record via `parent_page_id`. If the parent is in this same envelope (rare for page-cycle but legal), use the envelope's payload; otherwise look it up via the world index from indexed disk state (parent page is committed prior to this turn).
- Resolve every SE record cited by `applied_event_ops` in the same story scope.
- Resolve every record id referenced by SE.ops `input_records` / `output_records` from a combined same-story map of envelope-internal records + indexed disk state.
- Call `replayStateSnapshot(parent.state_snapshot, allOps, recordMap)` from the helper.
- Field-equal compare to `new_pg.state_snapshot`. On mismatch, emit a verdict with `location.file = '_source/pages/<PG-NNNN>.yaml'` and `detail.drifts = [{field: 'objective_facts', expected: [...], got: [...]}, ...]`.
- Verify `last_se.state_hash_after == new_pg.state_hash` (string-equal).

Validator name: `snapshot_replay_equality`. Pattern matches existing structural-validator naming (`yaml_parse_integrity`, `id_uniqueness`, etc.).

### 3. Framework registration

`tools/validators/src/public/registry.ts` (modify): add `snapshot_replay_equality` to the structural-validator registry list so it runs automatically on every envelope that contains at least one `create_pg_record` op. The `applies_to` predicate for this validator is `ctx.patch_plan?.patches.some(p => p.op === 'create_pg_record')` — envelopes without PG creates skip the validator (matches existing `applies_to=false` behavior visible in current validator execution output).

### 4. Tests

- `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` — unit tests per op_type in the current closed enum, each with a golden parent + ops + expected snapshot.
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — integration tests against synthetic page-cycle records; positive replay asserts PASS, negative drift asserts FAIL with field-level details, hash mismatch asserts FAIL, and a cross-story ID-collision regression proves lookups stay in the page's story scope.
- `tools/validators/tests/structural/registry.test.ts` (modify) — assert the new validator name is present in the structural list.

## Files to Touch

- `tools/validators/src/_helpers/state-snapshot-replay.ts` (new)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (new)
- `tools/validators/src/framework/types.ts` (modify — add optional verdict detail payload)
- `tools/validators/src/public/registry.ts` (modify — register validator)
- `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (new)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — PG-only validator skip expectation)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — assert registration)

## Out of Scope

- Op_type enum extension. This ticket implements replay semantics for the current closed enum named in `branching-story-page-cycle/references/record-schemas.md` and `phase-5-state-mutation.md`. Future op_types added to the enum require their own follow-up additions to the helper switch.
- Phase 9 gates 3 (recursive reference closure) and 10 (state_snapshot integrity). Both are also operator-verified gates and are candidates for parallel structural validators in their own VALENH-NNN tickets; this ticket scopes to gate 4 only to keep the change reviewable.
- Cross-page replay across an entire branch path (PG-0001 → PG-0002 → PG-0003 etc.). This validator scopes to single-PG-step replay; multi-step branch replay is a separate concern (and arguably a `branching-story-health-audit` rather than a structural validator).
- Removing the operator-verification string on `validation_trace.snapshot_replay_equality`. The string remains as audit-trail documentation; the new validator adds programmatic verification alongside, not in place of, the operator-recorded rationale.
- Modification to `branching-story-page-cycle` SKILL prose to link this ticket. Skill-prose updates linking landed validators are routed through `/skill-audit` follow-ups, not this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/validators` succeeds.
2. `node --test dist/tests/_helpers/state-snapshot-replay.test.js dist/tests/structural/snapshot-replay-equality.test.js dist/tests/structural/registry.test.js` from `tools/validators` passes for the helper, structural validator, and registry proof.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <PG-cycle-fixture-envelope>` returns a `validators_run[]` array containing `snapshot_replay_equality` with `status: pass` for a clean envelope; the package structural test covers the deliberately drifted envelope and asserts field-level drift detail.

### Invariants

1. For every `create_pg_record` op in any submitted envelope, `replayStateSnapshot(parent.state_snapshot, applied_event_ops, recordMap)` field-equals `new_pg.state_snapshot`.
2. `last_se_op.state_hash_after === new_pg.state_hash` (exact string equality).
3. Validator emits structured per-field drift details on FAIL, sufficient for the operator to identify which list / map / scalar diverged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` — unit tests per op_type with golden fixtures.
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — integration tests: positive case from a clean PG-cycle envelope, negative case with deliberate drift.
3. `tools/validators/tests/structural/registry.test.ts` — assert `snapshot_replay_equality` is registered in the structural list.

### Commands

1. `cd tools/validators && npm run build` — producer build for fresh compiled validator output.
2. `cd tools/validators && node --test dist/tests/_helpers/state-snapshot-replay.test.js dist/tests/structural/snapshot-replay-equality.test.js dist/tests/structural/registry.test.js` — targeted helper + validator + registry suite.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <synthetic-PG-cycle-envelope>` — full-pipeline integration confirming `snapshot_replay_equality` appears in `validators_run[]`.
4. `cd tools/validators && npm test` — broad validators package regression suite.

## Outcome

Implemented `snapshot_replay_equality` as a PG-create-only structural pre-apply validator in `tools/validators`. The validator resolves parent PG records, applied SE records, and referenced story records from the pre-apply overlay/read surface; replays SE `ops[]` through `replayStateSnapshot`; emits `snapshot_replay_equality.snapshot_drift` with `detail.drifts[]` when top-level snapshot fields differ; and emits `snapshot_replay_equality.state_hash_mismatch` when the final SE `state_hash_after` differs from the new PG `state_hash`.

Added the reusable replay helper for the current page-cycle op families and registered the validator in `tools/validators/src/public/registry.ts`. Updated same-seam integration expectations so the new PG-only validator is counted in the structural registry and is allowed to skip clean non-PG pre-apply plans.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/_helpers/state-snapshot-replay.test.js dist/tests/structural/snapshot-replay-equality.test.js dist/tests/structural/registry.test.js` — passed.
3. `cd tools/world-mcp && npm run build` — passed, proving the symlinked consumer can compile against the updated validator package surface.
4. `node /home/joeloverbeck/projects/worldloom/tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/worldloom-snapshot-cli-proof/plan.json` from `/tmp/worldloom-snapshot-cli-proof` — passed with `status: "pass"` and `validators_run[]` containing `{ "validator_name": "snapshot_replay_equality", "status": "pass" }`.
5. `cd tools/validators && npm test` — passed, 111/111 tests.

## Deviations

- Drafted `pnpm --filter validators ...` commands were replaced with package-local npm commands because this repo has package-local manifests and no root pnpm workspace.
- Drafted `tools/validators/src/framework/registry.ts` was corrected to the live registry path, `tools/validators/src/public/registry.ts`.
- The CLI smoke proves the clean-envelope `validators_run[]` surface. The fail/drift-detail case is proved by `tools/validators/tests/structural/snapshot-replay-equality.test.ts`, which is the narrower package-owned surface for inspecting the structured `detail.drifts[]` payload.
