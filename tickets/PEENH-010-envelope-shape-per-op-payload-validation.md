# PEENH-010: Patch-engine envelope-shape validator must enforce per-op payload schemas at validate-time so wrong-field-name typos surface as a single clear error rather than as 12 cascading cross_file_reference orphan failures

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/_shared.ts` (extend `validatePatchPlanEnvelopeShape` per-patch loop with per-op payload-shape validation that dispatches against the per-class JSON schemas at `tools/validators/src/schemas/`; the validation runs at envelope-shape stage, before any cross-reference / overlay-construction logic), `tools/patch-engine/src/envelope/schema.ts` (export per-op canonical-field maps so the envelope-shape validator can read the canonical field name per `create_*_record` op without duplicating the asymmetry table — for example, `create_ch_record` → `change_id`, `create_cf_record` → `id`, `create_m_record` → `id`, `create_oq_record` → `id`, `create_inv_record` → `id`, `create_ent_record` → `id`, `create_sec_record` → `id`), `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (new test file or modify existing — assert that wrong-field-name in `create_*_record` payload returns single clear `invalid_input` error citing `payload.<record_kind>.<missing_field>` rather than cascading cross_file_reference orphan failures), `tools/validators/src/_helpers/index-access.ts` (audit `recordForCreatePatch` at lines 137-165 to confirm it can rely on the envelope-shape validator having pre-checked field presence — if so, no behavior change; defensive null-check on the field can be retained), `tools/world-mcp/README.md` (modify — patch-plan envelope shape paragraph documents the per-op payload-shape validation behavior and the canonical-field asymmetry between `create_ch_record` and other create ops), `docs/HARD-GATE-DISCIPLINE.md` (modify — envelope-validation-failure-mode paragraph adds the new "missing canonical record field" failure code), `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify by Phase 8 sibling-handoff to `/skill-audit` — call out the CH-uses-`change_id`-not-`id` asymmetry in §10 worked example).
**Deps**: None — `archive/tickets/PEENH-003-approval-malformed-error-detail-suggests-signing-cli.md` is an adjacent failure-mode error-detail improvement (it improves approval-token failure messages); this ticket extends envelope-shape validation, an orthogonal validation surface.

## Problem

Mid-session during `canon-addition` PA-6 on `erotica-world` (2026-05-16), the operator's first `validate_patch_plan` run failed with 12 `cross_file_reference.orphan_reference` errors:

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

The cascade was extensive enough to read like a real cross-reference problem. The actual root cause was a single typo: the operator's `create_ch_record` payload used `id: "CH-8"` instead of the canonically-required `change_id: "CH-8"`. The patch-engine's `recordForCreatePatch` at `tools/validators/src/_helpers/index-access.ts:142` reads `patch.payload.ch_record.change_id` and got `undefined`; the resulting overlay record was constructed with `node_id: undefined`; `isStructuralAuthorityRecord` (`tools/validators/src/structural/utils.ts:218`) then filtered it out because `/^CH-\d+$/.test(undefined)` returns false; `cross_file_reference` then built `existingIds` without CH-8; every reference to `change_id: "CH-8"` from the 12 extension / touched_by_cf / append_modification_history_entry ops failed orphan-reference.

The misleading downstream cascade is the operator-friction surface, but the underlying mechanism is the gap: `tools/world-mcp/src/tools/_shared.ts:399-495` `validatePatchPlanEnvelopeShape` validates only top-level patch fields (`op`, `target_world`, `target_file`, `payload` presence). It does NOT validate the inner payload shape against per-class JSON schemas. A single canonical assertion at envelope-shape stage — "for `create_ch_record`, `payload.ch_record.change_id` must be a non-empty string matching `^CH-\\d+$`" — would have surfaced the typo as a single clear error before any overlay construction, before any cross-reference checking.

The asymmetry that triggers the pattern is real and documented but easily missed: `recordForCreatePatch` at `tools/validators/src/_helpers/index-access.ts:138-165` reads different canonical field names per op (`create_ch_record` → `payload.ch_record.change_id`; `create_cf_record` → `payload.cf_record.id`; `create_m_record` → `payload.m_record.id`; etc.). CH is the only create-op whose canonical record-id field is named `change_id` rather than `id`. An operator copying a `create_cf_record` example shape and adapting to `create_ch_record` will naturally type `id: "CH-N"` and hit the cascade.

The fix is to extend `validatePatchPlanEnvelopeShape` with per-op payload-shape validation. The per-class JSON schemas at `tools/validators/src/schemas/` already declare the required-field contracts (e.g., `change-log-entry.schema.json` has `"required": ["change_id", "date", "change_type", "affected_fact_ids"]`); the envelope-shape validator can dispatch against the same schemas to catch the misshape at the earliest validation moment.

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
   - `mcp__worldloom__describe_envelope_schema` already exposes per-op JSON schemas (per the per-op_schemas surface naming `op_schemas.create_cf_record`, `op_schemas.create_ch_record`, etc.) — the canonical schemas are accessible at runtime. The fix can either inline the per-op required-field maps (small surface) OR import the per-class JSON schemas from `tools/validators/src/schemas/` and use a JSON-schema runtime validator (broader surface).
   - `git status --porcelain` returned only `.codex/skills/implement-spec-tickets/SKILL.md` and untracked report/ticket/spec drafts plus this-session canon-addition writes under `worlds/erotica-world/` — none in the Phase 5 grep scope; the gap is genuinely present at HEAD with no in-flight fix.
2. **Doc reassessment.** Archive content-grep `grep -lniE '(envelope.*shape.*payload|per-op.*schema|create_ch_record.*payload|payload.*shape.*valid|cross_file_reference.*orphan)' archive/tickets/PEENH-*.md archive/tickets/VALENH-*.md archive/tickets/MCPENH-*.md` returned hits at PEENH-003, PEENH-007, MCPENH-033, MCPENH-035, VALENH-003. Reading each: PEENH-003 (`approval-malformed-error-detail-suggests-signing-cli`) addresses the approval-token failure-detail improvement, orthogonal to envelope-shape payload validation; PEENH-007 (`add-create-bel-record-op-and-drop-create-arctrace-record`) is a story-bundle op addition, not envelope-shape extension; MCPENH-033 / MCPENH-035 are MCP retrieval tickets, not envelope validation; VALENH-003 (`snapshot-replay-equality-structural-validator`) is a story-bundle structural validator. None has an Outcome that resolves the per-op payload-shape validation gap. `docs/HARD-GATE-DISCIPLINE.md` and `tools/world-mcp/README.md` document the envelope-shape contract but don't describe per-op payload-shape validation. `.claude/skills/canon-addition/references/engine-envelope-shape.md:60` mentions in passing that `create_ch_record` paths are constructed from `record.change_id` — the asymmetry IS noted, but a parallel §10 worked example for `create_ch_record` is missing (separate skill-prose drift; routed to `/skill-audit` via Phase 8 sibling-handoff).
3. **Shared boundary under audit.** The validation contract between `@worldloom/world-mcp` (the entry point that runs `validatePatchPlanEnvelopeShape` before forwarding the envelope to the patch engine) and `@worldloom/patch-engine` (the engine that executes ops via `recordForCreatePatch` after envelope-shape validation passes). The contract today: envelope-shape validates only the outer wrapper; per-op payload-shape is left to the engine's overlay-construction step, where misshape silently produces incomplete overlay records that downstream validators interpret as missing-record orphan-references. The contract tomorrow: envelope-shape validates the outer wrapper AND the inner payload shape against per-op canonical-field requirements (at minimum, the canonical record-id field per `recordForCreatePatch`'s map). The boundary contract change is single-package (the change is in `tools/world-mcp/src/tools/_shared.ts` plus a per-op canonical-field-map exported from `tools/patch-engine/src/envelope/schema.ts`); the engine's overlay-construction step at `recordForCreatePatch` is unchanged behavior (it can still defensively null-check the field, or it can rely on the envelope-shape pre-check).
4. **FOUNDATIONS principle under audit.** Rule 6: No Silent Retcons. The audit's emergence IS the retcon justification: the existing behavior (envelope-shape passes; overlay construction silently produces an empty-node_id record; downstream validators cascade orphan-reference failures) silently masks the per-op payload misshape. The new behavior (envelope-shape rejects per-op payloads missing canonical fields) surfaces the root cause at the earliest validation moment. The change is a behavior tightening, not a behavior weakening — existing valid plans continue to pass; existing misshapen plans that previously produced cascading downstream failures now produce a single clear envelope-shape rejection. Rule 6 is satisfied because the existing-behavior-vs-new-behavior delta is recorded in this Assumption Reassessment.
5. **Adjacent contradictions exposed by reassessment.** The `record_schema_compliance` validator at `tools/validators/src/structural/record-schema-compliance.ts` (per its presence in the validators_run output during canon-addition's first validate run) is supposed to catch schema violations on records — but it ONLY validates already-indexed records (via the overlay), and the misshapen in-plan CH-8 was filtered out of the overlay before `record_schema_compliance` could see it. So `record_schema_compliance` is structurally incapable of catching wrong-field-name in-plan create_*_record payloads on its own — the gap is upstream at envelope-shape validation, not at the structural-validator layer. Classification: **separate bug uncovered during reassessment**, addressed by THIS ticket. The `record_schema_compliance` validator's coverage scope (already-indexed records only) is correct as designed; extending it to validate in-plan creates would duplicate the per-op schema check. The cleaner solution is per-op envelope-shape validation, which is this ticket's scope.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** Three options were considered:
   - **(A — chosen)** Extend `validatePatchPlanEnvelopeShape` with per-op payload-shape validation that dispatches against per-op canonical-field maps. Single-file change in `tools/world-mcp/src/tools/_shared.ts` plus a small map export from `tools/patch-engine/src/envelope/schema.ts`. The validation runs at the earliest validation moment (envelope-shape stage), surfaces a single clear error (`payload.ch_record.change_id missing`) rather than cascading downstream, and uses the same canonical-field map that `recordForCreatePatch` already enforces — no schema duplication.
   - **(B)** Make `recordForCreatePatch` throw on missing canonical fields. Also valid; produces a less actionable error (a thrown exception inside overlay construction rather than a structured envelope-shape verdict that names which patch index, which payload field, which expected shape). The thrown-exception path also runs AFTER envelope-shape validation, so the operator sees envelope-shape pass and then an opaque internal error — worse UX than catching at envelope-shape.
   - **(C)** Extend `record_schema_compliance` to validate in-plan creates by simulating the patch-engine apply BEFORE running the structural validators. Rejected: doubles the validation surface (per-op shape check + post-overlay schema check on the same record); the per-op shape check at envelope-shape stage covers the gap with no overhead because the wrong-field-name failure mode is exactly what `recordForCreatePatch` already requires (the canonical field must be present and match the regex pattern).
2. **No backwards-compatibility aliasing/shims introduced.** The fix tightens envelope-shape validation by adding per-op payload-shape checks. No `--legacy-no-payload-check` flag, no version-gated behavior, no compatibility mode that retains the silent-overlay-mismatch path. Existing valid plans continue to pass envelope-shape validation unchanged (the new check is additive — it rejects misshape but accepts shape that was previously accepted by `recordForCreatePatch` without error). Existing misshapen plans that previously produced cascading orphan_reference failures now produce a single clear envelope-shape rejection — this is a behavior tightening, not a behavior break, because the previous "behavior" was a downstream failure cascade that operators had to debug back to the root cause; tightening the upstream check converts the downstream failure into an upstream rejection without changing what's accepted.

## Verification Layers

1. **Per-op payload-shape rejection** → automated test: `validate_patch_plan` with `create_ch_record` payload using `id: "CH-N"` instead of `change_id: "CH-N"` returns single `invalid_input` error citing `patch_plan.patches[N].payload.ch_record.change_id must be a non-empty string` and pattern `^CH-\\d+$`.
2. **Symmetric per-op coverage** → automated test: `create_cf_record` missing `cf_record.id`, `create_m_record` missing `m_record.id`, `create_oq_record` missing `oq_record.id`, `create_inv_record` missing `inv_record.id`, `create_ent_record` missing `ent_record.id`, `create_sec_record` missing `sec_record.id` each return single `invalid_input` with the correct payload-path naming.
3. **Existing valid plans pass without regression** → automated test: every existing test fixture in `tools/world-mcp/tests/tools/` passes envelope-shape validation unchanged.
4. **Wrong-field cascade no longer occurs** → automated test: a plan with the same misshape that triggered the canon-addition session cascade returns the SINGLE envelope-shape rejection error, NOT 12 cross_file_reference orphan_references.
5. **Canonical-field map source-of-truth** → codebase grep-proof: `grep -n "createOpCanonicalFieldMap\|create_ch_record.*change_id" tools/patch-engine/src/envelope/schema.ts tools/world-mcp/src/tools/_shared.ts` returns matches showing the map is exported from envelope/schema.ts and consumed by _shared.ts.

## What to Change

### 1. Export per-op canonical-field map from envelope/schema.ts

In `tools/patch-engine/src/envelope/schema.ts`, add:

```ts
/**
 * Canonical record-id field per `create_*_record` op. CH is the only op whose
 * canonical field is `change_id`; all others use `id`. The envelope-shape
 * validator at `tools/world-mcp/src/tools/_shared.ts` consumes this map to
 * validate per-op payload shape at the earliest validation moment, before
 * overlay-construction in `recordForCreatePatch` would silently produce an
 * empty-node_id record. See PEENH-010.
 */
export const CREATE_OP_CANONICAL_RECORD_ID_FIELD: Readonly<Record<string, { recordKey: string; idField: string; idPattern: RegExp }>> = {
  create_cf_record: { recordKey: "cf_record", idField: "id", idPattern: /^CF-\d+$/ },
  create_ch_record: { recordKey: "ch_record", idField: "change_id", idPattern: /^CH-\d+$/ },
  create_inv_record: { recordKey: "inv_record", idField: "id", idPattern: /^(ONT|CAU|DIS|SOC|AES)-\d+$/ },
  create_m_record: { recordKey: "m_record", idField: "id", idPattern: /^M-\d+$/ },
  create_oq_record: { recordKey: "oq_record", idField: "id", idPattern: /^OQ-\d+$/ },
  create_ent_record: { recordKey: "ent_record", idField: "id", idPattern: /^ENT-\d+$/ },
  create_sec_record: { recordKey: "sec_record", idField: "id", idPattern: /^SEC-[A-Z]{3}-\d+$/ },
};
```

### 2. Extend `validatePatchPlanEnvelopeShape` per-patch loop with per-op payload-shape validation

In `tools/world-mcp/src/tools/_shared.ts`, after the existing per-patch loop validation (lines 467-494) — after the `payload presence` check at line 488 — insert per-op payload-shape validation that consumes the canonical-field map:

```ts
// Per-op payload-shape validation (PEENH-010): for create_*_record ops, verify
// the inner payload contains the canonical record-id field per
// CREATE_OP_CANONICAL_RECORD_ID_FIELD. Catches wrong-field-name typos at
// envelope-shape stage rather than as cascading cross_file_reference orphan
// failures downstream.
if (typeof patch.op === "string" && patch.op in CREATE_OP_CANONICAL_RECORD_ID_FIELD) {
  const { recordKey, idField, idPattern } = CREATE_OP_CANONICAL_RECORD_ID_FIELD[patch.op];
  const payload = isRecord(patch.payload) ? patch.payload : null;
  const innerRecord = payload && isRecord(payload[recordKey]) ? payload[recordKey] : null;
  if (!innerRecord) {
    errors.push(invalidInput(
      `patch_plan.patches[${index}].payload.${recordKey} must be an object.`,
      `patch_plan.patches[${index}].payload.${recordKey}`
    ));
  } else {
    const idValue = innerRecord[idField];
    if (typeof idValue !== "string" || !idPattern.test(idValue)) {
      errors.push(invalidInput(
        `patch_plan.patches[${index}].payload.${recordKey}.${idField} must be a string matching ${idPattern.source}.`,
        `patch_plan.patches[${index}].payload.${recordKey}.${idField}`
      ));
    }
  }
}
```

### 3. New tests asserting per-op payload-shape rejection

`tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (new file or add to existing):
- Wrong-field-name in `create_ch_record` (using `id` instead of `change_id`) returns single envelope-shape rejection.
- Wrong-field-name in `create_cf_record` (omitting `id`) returns single envelope-shape rejection.
- Wrong-field-name symmetric for `create_m_record`, `create_oq_record`, `create_inv_record`, `create_ent_record`, `create_sec_record`.
- Existing valid plans pass envelope-shape validation unchanged (regression).
- Cascade-no-longer-occurs test: a plan with the misshape from this session's canon-addition first-validate run produces SINGLE envelope-shape error, not 12 cross_file_reference orphan_references.

### 4. Document the per-op payload-shape validation behavior

In `tools/world-mcp/README.md`, patch-plan envelope shape paragraph: add a section "Per-op payload-shape validation" describing the canonical-record-id-field check, the asymmetry between `create_ch_record` (uses `change_id`) and other create ops (use `id`), and the corresponding envelope-shape failure shape.

In `docs/HARD-GATE-DISCIPLINE.md`, the envelope-validation-failure-mode paragraph: add `invalid_input.payload.<record_kind>.<missing_field>` as a documented failure code with a one-line explanation of when it fires.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify) — add `CREATE_OP_CANONICAL_RECORD_ID_FIELD` export
- `tools/world-mcp/src/tools/_shared.ts` (modify) — extend `validatePatchPlanEnvelopeShape` per-patch loop
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (new or modify) — per-op rejection + regression + cascade-no-longer-occurs cases
- `tools/world-mcp/README.md` (modify) — patch-plan envelope shape "Per-op payload-shape validation" section
- `docs/HARD-GATE-DISCIPLINE.md` (modify) — failure-mode paragraph
- `tools/validators/src/_helpers/index-access.ts` (audit only — confirm `recordForCreatePatch` can rely on envelope-shape pre-check; no behavior change required, but defensive null-check on the canonical field can be retained for double-belt-and-suspenders)

## Out of Scope

- Changing the per-class field-name asymmetry itself (CH using `change_id` while others use `id`). Would be a separate breaking-change ticket; the asymmetry is currently load-bearing across the patch-engine and validator surfaces.
- Adding full JSON-schema runtime validation against the per-class schemas at `tools/validators/src/schemas/` for the entire payload body (covered by `record_schema_compliance` post-overlay; this ticket only adds the canonical-record-id-field check at envelope-shape stage).
- Improving the `cross_file_reference.orphan_reference` error messaging to suggest "did you misshape an in-plan create_*_record op?" — the upstream fix supersedes this need.
- The `.claude/skills/canon-addition/references/engine-envelope-shape.md` §10 worked-example skill-prose drift (CH-canonical-field documentation in the skill's reference doc) — routed via Phase 8 sibling-handoff to `/skill-audit`.
- Per-op payload-shape validation for non-create ops (`append_extension`, `append_touched_by_cf`, `append_modification_history_entry`, `update_record_field`, etc.). Their canonical-field requirements differ; this ticket scopes to `create_*_record` ops where the wrong-field-name failure mode triggers the cascading orphan_reference pattern.

## Acceptance Criteria

### Tests That Must Pass

1. `validate_patch_plan` with envelope containing `create_ch_record` with `payload.ch_record.id: "CH-8"` (wrong field name) returns SINGLE `invalid_input` error citing `patch_plan.patches[N].payload.ch_record.change_id must be a string matching ^CH-\d+$`.
2. Symmetric: `create_cf_record` with `payload.cf_record` missing `id`, `create_m_record` with `payload.m_record` missing `id`, etc. each return single envelope-shape rejection citing the canonical field.
3. The same envelope from this session's canon-addition first-validate cascade (12 orphan_reference errors) now returns single envelope-shape rejection — confirmed by reproducing the misshape and asserting error count is 1, not 12+.
4. `cd tools/world-mcp && npm test` passes including new validate-patch-plan tests.
5. `cd tools/patch-engine && npm test` passes (no regression — the canonical-field-map export doesn't break engine apply behavior).
6. Existing fixtures in `tools/world-mcp/tests/tools/` and `tools/patch-engine/tests/` pass envelope-shape validation unchanged.

### Invariants

1. Every `create_*_record` op's payload is validated against its canonical record-id field at envelope-shape stage; no misshape silently propagates to overlay construction.
2. The canonical-field asymmetry (`create_ch_record` → `change_id`; all others → `id`) is encoded in a single source-of-truth map (`CREATE_OP_CANONICAL_RECORD_ID_FIELD`), consumed by both envelope-shape validation and `recordForCreatePatch`.
3. Existing valid plans pass envelope-shape validation without regression (additive tightening, not behavior break).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (new file or modify) — per-op canonical-field-rejection tests for all 7 `create_*_record` ops + cascade-no-longer-occurs regression test using the canon-addition-session misshape envelope.
2. `tools/patch-engine/tests/envelope/schema.test.ts` (modify if exists; new if not) — assert `CREATE_OP_CANONICAL_RECORD_ID_FIELD` export shape and that all `create_*_record` ops at HEAD have an entry.

### Commands

1. `cd tools/world-mcp && npm run build && npm test`
2. `cd tools/patch-engine && npm run build && npm test`
3. `rg -n 'CREATE_OP_CANONICAL_RECORD_ID_FIELD|payload\.<record_kind>\.<missing_field>' tools/world-mcp/src/tools/_shared.ts tools/patch-engine/src/envelope/schema.ts tools/world-mcp/README.md docs/HARD-GATE-DISCIPLINE.md` (codebase grep-proof of the new surface)
4. Reproduce the canon-addition-session misshape envelope (envelope copy) and run the validate-patch-plan CLI: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/misshape-fixture.json` — confirm single error, not cascade.
