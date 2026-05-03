# ANIMALIA-001: Reconcile animalia CH-0010 affected-fact references after PATCHENG-003 schema unification

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — canon-mutating animalia cleanup through the patch engine; no direct `_source` edits.
**Deps**: `archive/tickets/PATCHENG-003-remove-redundant-affected-cf-ids-from-ch-schema.md`; `worlds/animalia/audits/AU-0001-2026-04-19.md` finding F-01.

## Problem

PATCHENG-003 removed the retired Change Log Entry field `affected_cf_ids` from the schema and converged on `affected_fact_ids` as the single canonical Rule 6 audit-trail field.

The live animalia record `worlds/animalia/_source/change-log/CH-0010.yaml` still contains both fields with divergent values:

- `affected_cf_ids: [CF-0036]`
- `affected_fact_ids: [CF-0017, CF-0024, CF-0026, CF-0033, CF-0034, CF-0035]`

After PATCHENG-003, this record is intentionally schema-invalid. It cannot be mechanically migrated by deleting the alias because the alias may carry meaningful audit information for CF-0036. Choosing, merging, or deleting values without a retcon decision would risk a Rule 6 silent retcon.

## Assumption Reassessment (2026-05-03)

1. `archive/tickets/PATCHENG-003-remove-redundant-affected-cf-ids-from-ch-schema.md` completed the schema unification and deliberately left live `worlds/animalia/_source/change-log/CH-0010.yaml` out of scope because the two fields disagree.
2. `worlds/animalia/audits/AU-0001-2026-04-19.md` finding F-01 already names the CH-0010 `affected_cf_ids` / `affected_fact_ids` redundancy as an audit concern, so this ticket owns turning that audit finding into an explicit canon-safe reconciliation.
3. The shared boundary is the animalia Change Log Entry record for CH-0010 and the Rule 6 audit trail that connects the change record to the CF records it modified or introduced.
4. FOUNDATIONS Rule 6 (No Silent Retcons) controls this ticket: the fix must record what changed and why instead of silently picking one field value.
5. This is canon-mutating world-content cleanup. Direct edits to `worlds/animalia/_source/change-log/CH-0010.yaml` are out of bounds; use the patch engine and approval-token flow.
6. The current schema rejects `affected_cf_ids`, so `node tools/validators/dist/src/cli/world-validate.js animalia` should fail until this record is reconciled.

## Architecture Check

1. The clean path is an explicit retcon/adjudication decision that determines the correct final `affected_fact_ids` set for CH-0010, then applies that decision through the patch engine. This preserves the audit trail and avoids treating a semantic contradiction as a mechanical schema migration.
2. No backwards-compatibility aliasing or shims are introduced. The final record must use `affected_fact_ids` only.

## Verification Layers

1. Correct CH-0010 field shape -> schema validation: `record_schema_compliance` accepts CH-0010 after the patch.
2. Rule 6 audit trail remains truthful -> FOUNDATIONS alignment check: the final `affected_fact_ids` list is justified by the retcon/adjudication record and does not silently drop or add affected CFs.
3. Animalia validates after reconciliation -> targeted tool command: `node tools/validators/dist/src/cli/world-validate.js animalia` reports zero PATCHENG-003-related verdicts.
4. No retired alias remains in live animalia CH records -> codebase grep-proof over `worlds/animalia/_source/change-log/`.

## What to Change

### 1. Determine the authoritative CH-0010 affected-fact set

Review CH-0010, the CF records it claims to affect, relevant modification histories, and AU-0001 F-01. Decide whether CF-0036 should be added to `affected_fact_ids`, whether any existing entries should be removed, or whether another retcon/adjudication entry is needed to document the correction.

### 2. Apply the correction through the patch engine

Use an engine-mediated patch plan to update CH-0010 to canonical `affected_fact_ids` only and remove the retired alias. Include whatever retcon attestation or change-log documentation the live patch-engine operation requires for a Rule 6-safe correction.

### 3. Verify animalia

Rebuild or sync the animalia world index as needed, then run validator proof. Preserve any unrelated pre-existing findings separately if they appear.

## Files to Touch

- `worlds/animalia/_source/change-log/CH-0010.yaml` (modify via patch engine)
- `worlds/animalia/_index/world.db` (regenerated/synced derived artifact, if needed)
- Optional follow-on audit/adjudication record if the retcon flow requires one.

## Out of Scope

- Changing the PATCHENG-003 schema decision.
- Reintroducing `affected_cf_ids` as an accepted alias.
- Direct-editing `_source` YAML outside the patch engine.
- Broad animalia audit cleanup outside AU-0001 F-01 / CH-0010 affected-fact reconciliation.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js animalia` — passes, or any remaining failures are unrelated and explicitly classified.
2. `rg -n "affected_cf_ids" worlds/animalia/_source/change-log/` — no live CH record uses the retired alias after the fix.
3. Patch-engine receipt or equivalent evidence confirms CH-0010 was updated through the engine, not by direct edit.

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
3. Patch-engine validate/submit command or MCP receipt for the approved CH-0010 correction plan.
