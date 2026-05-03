# ANIMALIA-001: Reconcile animalia CH-0010 affected-fact references after PATCHENG-003 schema unification

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — canon-mutating animalia cleanup applied through the patch engine; no direct `_source` edits.
**Deps**: `archive/tickets/PATCHENG-003-remove-redundant-affected-cf-ids-from-ch-schema.md`; `worlds/animalia/audits/AU-0001-2026-04-19.md` finding F-01.

## Problem

PATCHENG-003 removed the retired Change Log Entry field `affected_cf_ids` from the schema and converged on `affected_fact_ids` as the single canonical Rule 6 audit-trail field.

At intake, the live animalia record `worlds/animalia/_source/change-log/CH-0010.yaml` contained both fields with divergent values:

- `affected_cf_ids: [CF-0036]`
- `affected_fact_ids: [CF-0017, CF-0024, CF-0026, CF-0033, CF-0034, CF-0035]`

After PATCHENG-003, this record was schema-invalid. It could not be mechanically migrated by deleting the alias because the alias carried meaningful audit information for CF-0036. The landed fix reconciled the split explicitly: CH-0010 now uses only `affected_fact_ids`, and that canonical list includes both the CF-0036 addition and the six existing CFs qualified by CH-0010.

## Assumption Reassessment (2026-05-03)

1. `archive/tickets/PATCHENG-003-remove-redundant-affected-cf-ids-from-ch-schema.md` completed the schema unification and deliberately left live `worlds/animalia/_source/change-log/CH-0010.yaml` out of scope because the two fields disagree.
2. `worlds/animalia/audits/AU-0001-2026-04-19.md` finding F-01 already names the CH-0010 `affected_cf_ids` / `affected_fact_ids` redundancy as an audit concern, so this ticket owns turning that audit finding into an explicit canon-safe reconciliation.
3. The shared boundary is the animalia Change Log Entry record for CH-0010 and the Rule 6 audit trail that connects the change record to the CF records it modified or introduced.
4. FOUNDATIONS Rule 6 (No Silent Retcons) controls this ticket: the fix must record what changed and why instead of silently picking one field value.
5. This is canon-mutating world-content cleanup. Direct edits to `worlds/animalia/_source/change-log/CH-0010.yaml` are out of bounds; use the patch engine and approval-token flow.
6. Baseline proof confirmed the current schema rejected `affected_cf_ids`: before submit, `node tools/validators/dist/src/cli/world-validate.js animalia` failed only on CH-0010's retired alias.
7. Live reassessment confirmed AU-0001's narrative establishes the truthful merged set: CH-0010 added `CF-0036` and qualified `CF-0017`, `CF-0024`, `CF-0026`, `CF-0033`, `CF-0034`, and `CF-0035`.
8. The approved patch-engine plan `PLAN-ANIMALIA-001-CH0010-RECONCILE-0001` preserved Rule 6 by using a Type-A retcon attestation on the `affected_fact_ids` set operation, then removed the retired alias with `remove_ch_affected_cf_ids`.

## Architecture Check

1. The clean path is an explicit retcon/adjudication decision that determines the correct final `affected_fact_ids` set for CH-0010, then applies that decision through the patch engine. This preserves the audit trail and avoids treating a semantic contradiction as a mechanical schema migration.
2. No backwards-compatibility aliasing or shims are introduced. The final record must use `affected_fact_ids` only.

## Verification Layers

1. Correct CH-0010 field shape -> schema validation: `record_schema_compliance` accepts CH-0010 after the patch.
2. Rule 6 audit trail remains truthful -> FOUNDATIONS alignment check: the final `affected_fact_ids` list is justified by the Type-A retcon attestation and does not silently drop or add affected CFs.
3. Animalia validates after reconciliation -> targeted tool command: `node tools/validators/dist/src/cli/world-validate.js animalia` reports zero verdicts.
4. No retired alias remains in live animalia CH records -> codebase grep-proof over `worlds/animalia/_source/change-log/`.

## Landed Changes

### 1. Determined the authoritative CH-0010 affected-fact set

AU-0001's Phase 2 trace and CH-0010 summary both establish that CH-0010 added `CF-0036` and qualified `CF-0017`, `CF-0024`, `CF-0026`, `CF-0033`, `CF-0034`, and `CF-0035`. The final `affected_fact_ids` list is the union of the retired alias value and the existing canonical-field values:

- `CF-0036`
- `CF-0017`
- `CF-0024`
- `CF-0026`
- `CF-0033`
- `CF-0034`
- `CF-0035`

### 2. Applied the correction through the patch engine

`PLAN-ANIMALIA-001-CH0010-RECONCILE-0001` was validated, approved, signed, and submitted through `node tools/world-mcp/dist/src/cli/submit-patch-plan.js`. The plan:

- set `CH-0010.affected_fact_ids` to the reconciled list above with Type-A retcon attestation
- removed `affected_cf_ids` through the constrained `remove_ch_affected_cf_ids` op
- synced the animalia world index

### 3. Verified animalia

Animalia now validates with zero verdicts. A negative grep over `worlds/animalia/_source/change-log/` confirms no live animalia CH record still uses `affected_cf_ids`.

## Files to Touch

- `worlds/animalia/_source/change-log/CH-0010.yaml` (modified via patch engine)
- `worlds/animalia/_index/world.db` (synced derived artifact)
- `archive/tickets/ANIMALIA-001-reconcile-ch-0010-affected-fact-ids-after-patcheng-003.md` (modified — closeout and archival)

## Out of Scope

- Changing the PATCHENG-003 schema decision.
- Reintroducing `affected_cf_ids` as an accepted alias.
- Direct-editing `_source` YAML outside the patch engine.
- Broad animalia audit cleanup outside AU-0001 F-01 / CH-0010 affected-fact reconciliation.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js animalia` — passes with zero verdicts.
2. `rg -n "affected_cf_ids" worlds/animalia/_source/change-log/` — exits 1 with no hits; no live animalia CH record uses the retired alias after the fix.
3. Patch-engine receipt for `PLAN-ANIMALIA-001-CH0010-RECONCILE-0001` confirms CH-0010 was updated through the engine, not by direct edit.

### Invariants

1. CH-0010 uses `affected_fact_ids` as the only CF-reference field.
2. The final affected-fact list is semantically justified, not mechanically guessed.
3. Rule 6 auditability is strengthened; no affected CF is silently dropped from the history.

## Test Plan

### New/Modified Tests

1. `None expected — this is a world-content retcon cleanup. Existing validator/schema coverage from PATCHENG-003 proves the retired alias is rejected.`

### Commands

1. `node tools/validators/dist/src/cli/world-validate.js animalia`
2. `rg -n "affected_cf_ids" worlds/animalia/_source/change-log/`
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/animalia-001-ch0010-plan.json`
4. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/animalia-001-ch0010-plan.json /tmp/animalia-001-ch0010-token.txt`
5. `node tools/world-index/dist/src/cli.js verify animalia`

## Outcome

Completed: 2026-05-03.

CH-0010 now uses `affected_fact_ids` as the only CF-reference field. The final list is `CF-0036`, `CF-0017`, `CF-0024`, `CF-0026`, `CF-0033`, `CF-0034`, and `CF-0035`, preserving both sides of the split intake record.

The mutation was applied through the patch engine after explicit approval. No direct `_source` edit was used. The submit receipt for `PLAN-ANIMALIA-001-CH0010-RECONCILE-0001` wrote `worlds/animalia/_source/change-log/CH-0010.yaml` and synced the animalia world index.

## Verification Result

1. `node tools/validators/dist/src/cli/world-validate.js animalia` before submit — expected fail: one `record_schema_compliance.additionalProperties` verdict on `_source/change-log/CH-0010.yaml`.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/animalia-001-ch0010-plan.json` — pass; all 14 pre-apply validators passed.
3. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/animalia-001-ch0010-plan.json /tmp/animalia-001-ch0010-token.txt` — success; receipt wrote CH-0010 and reported `index_sync_duration_ms: 1531`; all 14 pre-apply validators passed.
4. `node tools/validators/dist/src/cli/world-validate.js animalia` after submit — pass; 13 validators run, 1 skipped, 0 verdicts.
5. `rg -n "affected_cf_ids" worlds/animalia/_source/change-log/` after submit — no hits; command exited 1 as expected for a negative grep.
6. `node tools/world-index/dist/src/cli.js verify animalia` — pass; no drift output.

## Deviations

- The plan did not create a separate adjudication record. The semantic decision was already established by AU-0001 F-01 and the CH-0010 summary; the patch-engine Type-A retcon attestation on `affected_fact_ids` records the Rule 6-safe reconciliation directly.
- The world content and `_index/world.db` are under ignored `worlds/animalia/` state in this checkout. Verification read the exact live CH file and validator/index artifacts directly rather than relying on tracked git diff.
