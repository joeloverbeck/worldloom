# SLTCAP-001: Require `created_at_page` on every storylet record (schema enforcement)

**Status**: DONE
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json` (consumed by `record_schema_compliance`, `get_record_schema`, `describe_envelope_schema`, and the `create_slt_record` patch op payload `$ref`)
**Deps**: None. Pairs with SLTCAP-002 (authoring fix) and SLTCAP-003 (backfill of records that this change makes non-conforming).

## Problem

`created_at_page` is load-bearing for branch-leak detection: `recursive_reference_closure` decides whether a storylet reached transitively from a page (active belief → `BEL.basis.source_event` → `SE.commitment.selected_slt_id`) is on-branch. A `global_author_pool` block is treated as branch-exempt **only** when its `created_at_page` is explicitly `null`; an *absent* field resolves to `undefined` and is rejected as a branch leak.

The storylet schema currently lists `created_at_page` as an optional property (`tools/validators/src/schemas/story-storylet.schema.json` property block at line 89, **not** in the `required` array at lines 5–18). As a result `red-bunny` storylets `SLT-20`…`SLT-25` (batch `SLB-3`) were committed with the field absent, while `SLT-1`…`SLT-19` carry the explicit `created_at_page: null`. The absent-field records become unselectable any turn they are reached through the reference chain above — observed live: a `branching-story-turn-cycle` turn that selected `SLT-21` (the best authorial fit) failed the dry-run with `recursive_reference_closure.branch_leak` solely because `SLT-21` lacks the field.

Making the field required at the schema layer turns silent unselectability into a loud, submit-time failure (via `record_schema_compliance`, which validates every patched record against this schema) and makes the validator's strict `=== null` exemption correct by construction.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/schemas/story-storylet.schema.json` defines `created_at_page` at the property block beginning line 89 as `{ "type": ["string", "null"], "pattern": "^PG-(0|[1-9][0-9]*)$" }`, and the top-level `required` array (lines 5–18) does **not** include it. Confirmed by direct read.
2. `recursive-reference-closure.ts` `createdAtPageFor()` (lines 246–264) returns `undefined` when no `created_at_page` / `generated_at_page` / `provenance.created_at_page` key is present; `isAllowedReference()` (lines 274–304) only reaches the `global_author_pool` exemption inside the `if (createdAtPage === null)` branch (line 285), so `undefined` falls through to `return createdAtPage !== undefined && branchPathSet.has(createdAtPage)` → `false`. Confirmed by direct read.
3. Cross-artifact boundary under audit: the shared `story-storylet.schema.json` contract, consumed by (a) `record_schema_compliance` at validate/submit, (b) `get_record_schema(node_type='storylet_record')` and `describe_envelope_schema(op_kind='create_slt_record')` discovery surfaces, and (c) the `create_slt_record` op payload `$ref`. Making the field required is enforced uniformly through (a); (b)/(c) reflect it automatically because they serialize the same schema.
4. FOUNDATIONS principle restated: §Story Bundles §5b (every story-bundle record field must be load-bearing). `created_at_page` is load-bearing — it is the branch-membership discriminator `recursive_reference_closure` consumes — so requiring its presence is consistent with schema-minimalism rather than adding a nice-to-have field. Rule 5 (No Consequence Evasion) also applies: a silently-unselectable commitment block is latent consequence-capacity loss, the same rationale `commitment-block-authoring/references/phase-2-draft-blocks.md` cites for permanently-inert blocks.
5. Schema-extension blast radius: this is not a new field; it tightens an existing optional field to required. It is therefore *breaking* for already-stored records that omit it. The only such records in the repo are `red-bunny` `SLT-20`…`SLT-25`; SLTCAP-003 backfills them. No backwards-compatibility shim is introduced (per `tickets/README.md` §Core Architectural Contract item 1); the data is brought into conformance instead.
6. Adjacent contradiction classification: the `recursive_reference_closure` `=== null` strictness is **not** a bug to loosen — under the "all storylets carry `created_at_page`" end-state it is correct. Loosening it to treat absent as `null` would be the shim this contract forbids. Left unchanged by deliberate decision.

## Architecture Check

1. Cleaner than the alternative of defaulting `created_at_page: null` inside `create-story-record.ts`: a silent engine default masks authoring drift (the SLB-3 omission would have been written as conformant and never surfaced), whereas a required field fails loudly at the exact authoring boundary that produced the gap. It is also cleaner than loosening `recursive_reference_closure` to accept absent-as-null, which would tolerate two encodings of the same fact forever.
2. No backwards-compatibility aliasing/shims introduced. Non-conforming historical records are repaired (SLTCAP-003), not tolerated by a compatibility branch.

## Verification Layers

1. Invariant: every storylet record must carry `created_at_page` → schema validation (`required` array contains `created_at_page`) + `record_schema_compliance` dry-run rejecting a `create_slt_record` op whose payload omits the field.
2. Invariant: the strict global-pool branch-exemption in `recursive_reference_closure` is satisfiable for every conformant author-pool block → skill dry-run (`branching-story-turn-cycle` selecting a global-pool SLT that carries `created_at_page: null` passes `recursive_reference_closure`).
3. Invariant: schema discovery surfaces report the field as required → codebase grep-proof on the serialized schema returned by `get_record_schema(node_type='storylet_record')`.

## What to Change

### 1. Add `created_at_page` to the storylet schema `required` array

In `tools/validators/src/schemas/story-storylet.schema.json`, add `"created_at_page"` to the top-level `required` array (lines 5–18). Keep the property definition (`type: ["string", "null"]`, `pattern`) unchanged so the explicit-`null` author-pool form and a `PG-<n>` runtime_jit form both remain valid; only *presence* becomes mandatory.

### 2. Confirm no other producer regresses

Bootstrap (`branching-story-bootstrap/references/phase-6-commitment-blocks.md:13`) already prescribes `created_at_page: null`; turn-cycle JIT blocks set `created_at_page: <new PG id>`. Only `commitment-block-authoring` allows omission — addressed in SLTCAP-002. No code change needed here beyond the schema.

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify)

## Out of Scope

- The `commitment-block-authoring` guidance fix (SLTCAP-002).
- Backfilling `SLT-20`…`SLT-25` (SLTCAP-003).
- Any change to `recursive-reference-closure.ts` (intentionally left strict).

## Acceptance Criteria

### Tests That Must Pass

1. A `create_slt_record` envelope whose `payload.record` omits `created_at_page` fails `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan>` with a `record_schema_compliance` failure naming the missing required field.
2. A `create_slt_record` envelope whose `payload.record` sets `created_at_page: null` (global_author_pool) passes the same command.
3. `get_record_schema(node_type='storylet_record')` returns a schema whose `required` array includes `created_at_page`.

### Invariants

1. Every storylet record persisted under `_source/storylets/*.yaml` carries `created_at_page` (string `PG-<n>` or `null`).
2. `recursive_reference_closure`'s `=== null` global-pool exemption is reachable for every conformant author-pool block (no absent-field path remains).

## Test Plan

### New/Modified Tests

1. `tools/validators` schema-compliance suite — add/extend a case asserting a storylet missing `created_at_page` is rejected and one with `created_at_page: null` is accepted (locate the existing `record_schema_compliance` storylet fixtures and add the negative case).

### Commands

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slt-missing-cap.json` (negative: expect `record_schema_compliance` fail) and `.../validate-patch-plan.js /tmp/slt-null-cap.json` (positive: expect pass).
2. `npm --prefix tools/validators test` (or the repo's validators test runner) to confirm no regression in storylet schema coverage.
