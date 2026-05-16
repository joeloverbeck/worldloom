# PEENH-010: Patch-engine envelope-shape validator must enforce world-canon create-op canonical ID fields at validate-time so wrong-field-name typos surface as a single clear error rather than as cascading cross_file_reference orphan failures

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/_shared.ts` (extend `validatePatchPlanEnvelopeShape` per-patch loop with per-op canonical record-id-field validation at envelope-shape stage, before any cross-reference / overlay-construction logic), `tools/patch-engine/src/envelope/schema.ts` and `tools/patch-engine/src/apply.ts` (export per-op canonical-field maps so the envelope-shape validator can read the canonical field name per world-canon `create_*_record` op without duplicating the asymmetry table — for example, `create_ch_record` → `change_id`, `create_cf_record` → `id`, `create_m_record` → `id`, `create_oq_record` → `id`, `create_inv_record` → `id`, `create_ent_record` → `id`, `create_sec_record` → `id`), `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` and `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify — assert wrong-field-name / missing-field in world-canon `create_*_record` payloads returns single clear `invalid_input` error citing `payload.<record_kind>.<missing_field>` before validator delegation rather than cascading cross_file_reference orphan failures), `tools/validators/src/_helpers/index-access.ts` (audit only — `recordForCreatePatch` remains unchanged), `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/HARD-GATE-DISCIPLINE.md` (modify — document per-op payload-shape validation and the canonical-field asymmetry), `.claude/skills/canon-addition/references/engine-envelope-shape.md` (out of scope; sibling skill-prose drift remains routed to `/skill-audit`).
**Deps**: None — `archive/tickets/PEENH-003-approval-malformed-error-detail-suggests-signing-cli.md` is an adjacent failure-mode error-detail improvement (it improves approval-token failure messages); this ticket extends envelope-shape validation, an orthogonal validation surface.

## Problem

At intake, mid-session during `canon-addition` PA-6 on `erotica-world` (2026-05-16), the operator's first `validate_patch_plan` run failed with 12 `cross_file_reference.orphan_reference` errors:

```
"AES-2 references missing CH-8 in change_id"
"CAU-2 references missing CH-8 in change_id"
"M-3 references missing CH-8 in change_id"
"M-4 references missing CH-8 in change_id"
"OQ-0006 references missing CH-8 in change_id"
"OQ-0007 references missing CH-8 in change_id"
"OQ-0009 references missing CH-8 in change_id"
"OQ-0010 references missing CH-8 in change_id"
"SEC-ECR-001 references missing CH-8 in change_id"
"SEC-ELF-001 references missing CH-8 in change_id"
"SEC-INS-001 references missing CH-8 in change_id"
"SEC-PAS-001 references missing CH-8 in change_id"
```

The pre-ticket cascade was extensive enough to read like a real cross-reference problem. The actual root cause was a single typo: the operator's `create_ch_record` payload used `id: "CH-8"` instead of the canonically-required `change_id: "CH-8"`. The patch-engine's `recordForCreatePatch` at `tools/validators/src/_helpers/index-access.ts:142` reads `patch.payload.ch_record.change_id` and got `undefined`; the resulting overlay record was constructed with `node_id: undefined`; `isStructuralAuthorityRecord` (`tools/validators/src/structural/utils.ts:218`) then filtered it out because `/^CH-\d+$/.test(undefined)` returns false; `cross_file_reference` then built `existingIds` without CH-8; every reference to `change_id: "CH-8"` from the 12 extension / touched_by_cf / append_modification_history_entry ops failed orphan-reference.

Before this ticket, `tools/world-mcp/src/tools/_shared.ts` `validatePatchPlanEnvelopeShape` validated only top-level patch fields (`op`, `target_world`, `target_file`, `payload` presence). It did not validate the inner payload's canonical record-id field. This ticket adds that envelope-shape assertion, so `create_ch_record` with `payload.ch_record.id` and no `payload.ch_record.change_id` is rejected before overlay construction and before cross-reference checking.

The asymmetry that triggers the pattern is real and documented but easily missed: `recordForCreatePatch` at `tools/validators/src/_helpers/index-access.ts:138-165` reads different canonical field names per op (`create_ch_record` → `payload.ch_record.change_id`; `create_cf_record` → `payload.cf_record.id`; `create_m_record` → `payload.m_record.id`; etc.). CH is the only create-op whose canonical record-id field is named `change_id` rather than `id`. An operator copying a `create_cf_record` example shape and adapting to `create_ch_record` will naturally type `id: "CH-N"` and hit the cascade.

The fix is to extend `validatePatchPlanEnvelopeShape` with per-op canonical record-id-field validation. The per-class JSON schemas at `tools/validators/src/schemas/` already declare the required-field contracts (e.g., `change-log-entry.schema.json` has `"required": ["change_id", "date", "change_type", "affected_fact_ids"]`), but live reassessment chose the narrower canonical-field map because the owned failure mode is the wrong or missing record-id field that prevents overlay construction from materializing the in-plan record.

## Assumption Reassessment (2026-05-16)

1. **Codebase reassessment.** At HEAD (per `git status --porcelain` showing zero modifications under `tools/world-mcp/src/tools/_shared.ts`, `tools/patch-engine/src/envelope/schema.ts`, `tools/validators/src/_helpers/index-access.ts`):
   - `tools/world-mcp/src/tools/_shared.ts:399-495` `validatePatchPlanEnvelopeShape` validates: `plan_id` (line 408), `target_world` (line 415), `approval_token` (line 422), `verdict` (line 429), `originating_skill` (line 436), `expected_id_allocations` (line 443), `patches` (lines 450-465). The per-patch loop at lines 467-494 validates `op`, `target_world`, `target_file`, `payload` presence — but NOT inner payload shape.
   - `tools/validators/src/_helpers/index-access.ts:138-165` `recordForCreatePatch` reads canonical fields per op:
     - `create_cf_record` → `patch.payload.cf_record.id` (line 139)
     - `create_ch_record` → `patch.payload.ch_record.change_id` (line 142) — the asymmetric one
     - `create_inv_record` → `patch.payload.inv_record.id` (line 145)
     - `create_m_record` → `patch.payload.m_record.id` (line 148)
     - `create_oq_record` → `patch.payload.oq_record.id` (line 151)
     - `create_ent_record` → `patch.payload.ent_record.id` (line 154)
     - `create_sec_record` → `patch.payload.sec_record.id` (line 157)
   - `tools/validators/src/schemas/change-log-entry.schema.json:7` declares `"required": ["change_id", "date", "change_type", "affected_fact_ids"]` — `change_id` is required.
   - `tools/validators/src/schemas/canon-fact-record.schema.json` declares `id` as required (per the existing schema fixture used by `record_schema_compliance`).
   - `tools/validators/src/structural/cross-file-reference.ts:21` builds `existingIds = new Set(records.map((record) => record.node_id))`; line 29 checks `if (ref.kind === "record" && !existingIds.has(ref.value))` → fails as orphan_reference. The validator behavior is correct; the upstream gap is that the in-plan CH-8 was filtered out of the overlay because `recordForCreatePatch` produced a record with empty `node_id` from the misshapen payload.
   - `tools/validators/src/structural/utils.ts:211-235` `isStructuralAuthorityRecord` checks regex on `record.node_id`; `/^CH-\d+$/.test(undefined)` returns false, filtering the misshapen record from the overlay's structural-authority set.
   - `mcp__worldloom__describe_envelope_schema` already exposes per-op JSON schemas (per the per-op_schemas surface naming `op_schemas.create_cf_record`, `op_schemas.create_ch_record`, etc.) — the canonical schemas are accessible through a package tool. For this ticket, the narrower live implementation boundary is a shared canonical record-id-field map exported by `@worldloom/patch-engine` and consumed by `@worldloom/world-mcp`, not a full JSON-schema runtime validation pass.
   - Pre-edit package baselines passed: `cd tools/patch-engine && npm test` (75 tests passing) and `cd tools/world-mcp && npm test` (360 tests passing).
   - `git status --porcelain` returned no tracked or untracked modifications at intake; ignored package artifacts already existed under `tools/patch-engine/{dist,node_modules}`, `tools/validators/{dist,node_modules}`, and `tools/world-mcp/{.secret,dist,node_modules}` before package commands.
2. **Doc reassessment.** Archive content-grep `grep -lniE '(envelope.*shape.*payload|per-op.*schema|create_ch_record.*payload|payload.*shape.*valid|cross_file_reference.*orphan)' archive/tickets/PEENH-*.md archive/tickets/VALENH-*.md archive/tickets/MCPENH-*.md` returned hits at PEENH-003, PEENH-007, MCPENH-033, MCPENH-035, VALENH-003. Reading each: PEENH-003 (`approval-malformed-error-detail-suggests-signing-cli`) addresses the approval-token failure-detail improvement, orthogonal to envelope-shape payload validation; PEENH-007 (`add-create-bel-record-op-and-drop-create-arctrace-record`) is a story-bundle op addition, not envelope-shape extension; MCPENH-033 / MCPENH-035 are MCP retrieval tickets, not envelope validation; VALENH-003 (`snapshot-replay-equality-structural-validator`) is a story-bundle structural validator. None has an Outcome that resolves the per-op payload-shape validation gap. `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` document the envelope-shape contract but don't describe per-op payload-shape validation. `.claude/skills/canon-addition/references/engine-envelope-shape.md:60` mentions in passing that `create_ch_record` paths are constructed from `record.change_id` — the asymmetry IS noted, but a parallel §10 worked example for `create_ch_record` is missing (separate skill-prose drift; routed to `/skill-audit` via Phase 8 sibling-handoff).
3. **Shared boundary under audit.** The validation contract between `@worldloom/world-mcp` (the entry point that runs `validatePatchPlanEnvelopeShape` before forwarding the envelope to the patch engine) and `@worldloom/patch-engine` (the engine that executes ops via `recordForCreatePatch` after envelope-shape validation passes). The contract today: envelope-shape validates only the outer wrapper; per-op payload-shape is left to the engine's overlay-construction step, where misshape silently produces incomplete overlay records that downstream validators interpret as missing-record orphan-references. The contract tomorrow: envelope-shape validates the outer wrapper AND the inner payload shape against per-op canonical-field requirements for the seven world-canon create ops. The boundary contract change spans `tools/world-mcp/src/tools/_shared.ts` plus a per-op canonical-field-map exported from `tools/patch-engine/src/envelope/schema.ts` and package root `tools/patch-engine/src/apply.ts`; the engine's overlay-construction step at `recordForCreatePatch` is unchanged behavior and stays a downstream defensive consumer.
4. **FOUNDATIONS principle under audit.** Rule 6: No Silent Retcons. The audit's emergence IS the retcon justification: the existing behavior (envelope-shape passes; overlay construction silently produces an empty-node_id record; downstream validators cascade orphan-reference failures) silently masks the per-op payload misshape. The new behavior (envelope-shape rejects per-op payloads missing canonical fields) surfaces the root cause at the earliest validation moment. The change is a behavior tightening, not a behavior weakening — existing valid plans continue to pass; existing misshapen plans that previously produced cascading downstream failures now produce a single clear envelope-shape rejection. Rule 6 is satisfied because the existing-behavior-vs-new-behavior delta is recorded in this Assumption Reassessment.
5. **Adjacent contradictions exposed by reassessment.** The `record_schema_compliance` validator at `tools/validators/src/structural/record-schema-compliance.ts` (per its presence in the validators_run output during canon-addition's first validate run) is supposed to catch schema violations on records — but it ONLY validates already-indexed records (via the overlay), and the misshapen in-plan CH-8 was filtered out of the overlay before `record_schema_compliance` could see it. So `record_schema_compliance` is structurally incapable of catching wrong-field-name in-plan create_*_record payloads on its own — the gap is upstream at envelope-shape validation, not at the structural-validator layer. Classification: **separate bug uncovered during reassessment**, addressed by THIS ticket. The `record_schema_compliance` validator's coverage scope (already-indexed records only) is correct as designed; extending it to validate in-plan creates would duplicate the per-op schema check. The cleaner solution is per-op envelope-shape validation, which is this ticket's scope.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** Three options were considered:
   - **(A — chosen)** Extend `validatePatchPlanEnvelopeShape` with per-op payload-shape validation that dispatches against per-op canonical-field maps. Single-file behavior change in `tools/world-mcp/src/tools/_shared.ts` plus a small map export from `tools/patch-engine/src/envelope/schema.ts` / package root. The validation runs at the earliest validation moment (envelope-shape stage), surfaces a single clear error (`payload.ch_record.change_id missing`) rather than cascading downstream, and shares the same canonical-field values that `recordForCreatePatch` already expects — no full JSON-schema runtime pass or schema duplication.
   - **(B)** Make `recordForCreatePatch` throw on missing canonical fields. Also valid; produces a less actionable error (a thrown exception inside overlay construction rather than a structured envelope-shape verdict that names which patch index, which payload field, which expected shape). The thrown-exception path also runs AFTER envelope-shape validation, so the operator sees envelope-shape pass and then an opaque internal error — worse UX than catching at envelope-shape.
   - **(C)** Extend `record_schema_compliance` to validate in-plan creates by simulating the patch-engine apply BEFORE running the structural validators. Rejected: doubles the validation surface (per-op shape check + post-overlay schema check on the same record); the per-op shape check at envelope-shape stage covers the gap with no overhead because the wrong-field-name failure mode is exactly what `recordForCreatePatch` already requires (the canonical field must be present and match the regex pattern).
2. **No backwards-compatibility aliasing/shims introduced.** The fix tightens envelope-shape validation by adding per-op payload-shape checks. No `--legacy-no-payload-check` flag, no version-gated behavior, no compatibility mode that retains the silent-overlay-mismatch path. Existing valid plans continue to pass envelope-shape validation unchanged (the new check is additive — it rejects misshape but accepts shape that was previously accepted by `recordForCreatePatch` without error). Existing misshapen plans that previously produced cascading orphan_reference failures now produce a single clear envelope-shape rejection — this is a behavior tightening, not a behavior break, because the previous "behavior" was a downstream failure cascade that operators had to debug back to the root cause; tightening the upstream check converts the downstream failure into an upstream rejection without changing what's accepted.

## Verification Layers

1. **Per-op payload-shape rejection** → automated test: `validatePatchPlanEnvelopeShape` and `validatePatchPlan` with `create_ch_record` payload using `id: "CH-N"` instead of `change_id: "CH-N"` returns single `invalid_input` error citing `patch_plan.patches[N].payload.ch_record.change_id must be a non-empty string matching ^CH-\\d+$`.
2. **Symmetric per-op coverage** → automated test: `create_cf_record` missing `cf_record.id`, `create_m_record` missing `m_record.id`, `create_oq_record` missing `oq_record.id`, `create_inv_record` missing `inv_record.id`, `create_ent_record` missing `ent_record.id`, `create_sec_record` missing `sec_record.id` each return single `invalid_input` with the correct payload-path naming.
3. **Existing valid plans pass without regression** → automated test: existing package tests in `tools/world-mcp/tests/tools/` pass envelope-shape validation unchanged.
4. **Wrong-field cascade no longer occurs** → automated test: a plan with the same misshape that triggered the canon-addition session cascade returns the SINGLE envelope-shape rejection error, NOT 12 cross_file_reference orphan_references.
5. **Canonical-field map source-of-truth** → codebase grep-proof: `rg -n 'CREATE_OP_CANONICAL_RECORD_ID_FIELD|payload\\.<record_kind>\\.<missing_field>|patch_plan\\.patches\\[N\\]\\.payload\\.ch_record\\.change_id' tools/patch-engine/src/envelope/schema.ts tools/patch-engine/src/apply.ts tools/world-mcp/src/tools/_shared.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/HARD-GATE-DISCIPLINE.md` returns matches showing the map is exported, consumed, and documented.

## Landed Changes

### 1. Shared canonical-field map

`tools/patch-engine/src/envelope/schema.ts` now exports `CREATE_OP_CANONICAL_RECORD_ID_FIELD` for the seven world-canon create ops, and `tools/patch-engine/src/apply.ts` re-exports it from the package root. The map captures the CH asymmetry (`change_id`) and the other world-canon create-op `id` fields with their accepted ID patterns.

### 2. Envelope-shape validation

`tools/world-mcp/src/tools/_shared.ts` now checks `payload.<record_key>.<canonical_id_field>` for world-canon create ops after the existing top-level patch-shape checks. Missing inner payload objects or malformed canonical ID fields produce `invalid_input` on the exact payload path before validators run.

### 3. Tests

`tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` covers all seven world-canon create ops, including the `create_ch_record` wrong-field-name case. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` proves the CH misshape returns `status: "skipped"` with `validators_run: []`, so the old cross-reference cascade cannot occur.

### 4. Documentation

`tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/HARD-GATE-DISCIPLINE.md` now document the per-op payload-shape check and the `create_ch_record` `change_id` asymmetry.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify) — add `CREATE_OP_CANONICAL_RECORD_ID_FIELD` export
- `tools/patch-engine/src/apply.ts` (modify) — re-export `CREATE_OP_CANONICAL_RECORD_ID_FIELD` from the package root
- `tools/world-mcp/src/tools/_shared.ts` (modify) — extend `validatePatchPlanEnvelopeShape` per-patch loop
- `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` (modify) — per-op rejection coverage for all seven world-canon create ops
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify) — validate handler skips before validator delegation for the CH wrong-field cascade case
- `tools/world-mcp/README.md` (modify) — patch-plan envelope shape "Per-op payload-shape validation" section
- `docs/MACHINE-FACING-LAYER.md` (modify) — machine-facing patch-plan validation reference
- `docs/HARD-GATE-DISCIPLINE.md` (modify) — failure-mode paragraph

Audited but not modified:

- `tools/validators/src/_helpers/index-access.ts` — `recordForCreatePatch` remains the downstream overlay consumer; no behavior change was required.

## Out of Scope

- Changing the per-class field-name asymmetry itself (CH using `change_id` while others use `id`). Would be a separate breaking-change ticket; the asymmetry is currently load-bearing across the patch-engine and validator surfaces.
- Adding full JSON-schema runtime validation against the per-class schemas at `tools/validators/src/schemas/` for the entire payload body (covered by `record_schema_compliance` post-overlay; this ticket only adds the canonical-record-id-field check at envelope-shape stage).
- Improving the `cross_file_reference.orphan_reference` error messaging to suggest "did you misshape an in-plan create_*_record op?" — the upstream fix supersedes this need.
- The `.claude/skills/canon-addition/references/engine-envelope-shape.md` §10 worked-example skill-prose drift (CH-canonical-field documentation in the skill's reference doc) — routed via Phase 8 sibling-handoff to `/skill-audit`.
- Per-op payload-shape validation for non-create ops (`append_extension`, `append_touched_by_cf`, `append_modification_history_entry`, `update_record_field`, etc.). Their canonical-field requirements differ; this ticket scopes to `create_*_record` ops where the wrong-field-name failure mode triggers the cascading orphan_reference pattern.

## Acceptance Criteria

### Tests That Passed

1. `validate_patch_plan` with envelope containing `create_ch_record` with `payload.ch_record.id: "CH-8"` (wrong field name) returns a single skipped-envelope `invalid_input` reason citing `patch_plan.patches[0].payload.ch_record.change_id must be a non-empty string matching ^CH-\d+$`.
2. Symmetric `create_cf_record`, `create_m_record`, `create_oq_record`, `create_inv_record`, `create_ent_record`, and `create_sec_record` missing canonical ID fields each return a single envelope-shape rejection citing the canonical field.
3. The same CH wrong-field shape behind the intake cascade now returns one envelope-shape rejection with `validators_run: []`, before cross-reference validators can emit orphan-reference verdicts.
4. `cd tools/world-mcp && npm test` passed including the new validate-patch-plan tests.
5. `cd tools/patch-engine && npm test` passed; the canonical-field-map export does not break engine apply behavior.
6. Existing tests in `tools/world-mcp/tests/tools/` and `tools/patch-engine/tests/` pass after the change.

### Invariants

1. Every world-canon `create_*_record` op's payload is validated against its canonical record-id field at envelope-shape stage; no misshape silently propagates to overlay construction.
2. The canonical-field asymmetry (`create_ch_record` → `change_id`; all other world-canon create ops → `id`) is encoded in a single exported source-of-truth map (`CREATE_OP_CANONICAL_RECORD_ID_FIELD`) that envelope-shape validation consumes and that matches `recordForCreatePatch`'s overlay expectations.
3. Existing valid plans pass envelope-shape validation without regression (additive tightening, not behavior break).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` (modify) — per-op canonical-field-rejection tests for all seven world-canon `create_*_record` ops.
2. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify) — cascade-no-longer-occurs regression test using the canon-addition-session misshape shape and proving `validators_run: []`.

### Commands

1. `cd tools/patch-engine && npm test`
2. `cd tools/world-mcp && npm test`
3. `cd tools/world-mcp && node --test dist/tests/tools/_shared.envelope-shape.test.js dist/tests/tools/validate-patch-plan.test.js`
4. `rg -n 'CREATE_OP_CANONICAL_RECORD_ID_FIELD|payload\\.<record_kind>\\.<missing_field>|patch_plan\\.patches\\[N\\]\\.payload\\.ch_record\\.change_id' tools/patch-engine/src/envelope/schema.ts tools/patch-engine/src/apply.ts tools/world-mcp/src/tools/_shared.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/HARD-GATE-DISCIPLINE.md` (codebase grep-proof of the new surface)

## Outcome

Completed. `validate_patch_plan` / `submit_patch_plan` envelope-shape validation now rejects misshapen world-canon create-op payloads before validator delegation. The CH `change_id` asymmetry is encoded in a patch-engine-exported canonical-field map, consumed by world-mcp, covered by focused tests, and documented in the package and repo-level machine-facing/HARD-GATE guidance.

## Verification Result

1. Pre-edit baseline: `cd tools/patch-engine && npm test` passed (75 tests); `cd tools/world-mcp && npm test` passed (360 tests).
2. Producer build: `cd tools/patch-engine && npm run build` passed after one local syntax fix to the new export list.
3. Consumer build: `cd tools/world-mcp && npm run build` passed.
4. Focused proof: `cd tools/world-mcp && node --test dist/tests/tools/_shared.envelope-shape.test.js dist/tests/tools/validate-patch-plan.test.js` passed (13 tests).
5. Broad producer proof: `cd tools/patch-engine && npm test` passed (75 tests).
6. Broad consumer proof: `cd tools/world-mcp && npm test` passed (363 tests).
7. Grep proof: `rg -n 'CREATE_OP_CANONICAL_RECORD_ID_FIELD|payload\\.<record_kind>\\.<missing_field>|patch_plan\\.patches\\[N\\]\\.payload\\.ch_record\\.change_id' tools/patch-engine/src/envelope/schema.ts tools/patch-engine/src/apply.ts tools/world-mcp/src/tools/_shared.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/HARD-GATE-DISCIPLINE.md` found the exported map, world-mcp consumption, and documented payload field paths.

## Deviations

1. Live reassessment narrowed the implementation from full per-class JSON Schema runtime validation to canonical record-id-field validation. This directly owns the observed wrong-field-name cascade without duplicating `record_schema_compliance`.
2. `docs/MACHINE-FACING-LAYER.md` was added to the file set as a same-seam machine-facing quick reference.
3. `.claude/skills/canon-addition/references/engine-envelope-shape.md` remains out of scope; its worked-example expansion is a sibling skill-prose cleanup, not required for this validation-signal landing.
4. Ignored package artifacts under `tools/patch-engine/dist/`, `tools/world-mcp/dist/`, and existing package `node_modules/` / `.secret` paths were refreshed or reused by build/test commands and are not tracked owned edits.
