# PATCHENG-003: Remove redundant `affected_cf_ids` field from Change Log Entry schema; converge on `affected_fact_ids` as the single canonical CF-reference field

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/change-log-entry.schema.json` (schema field removal); `tools/patch-engine` / `tools/world-mcp` constrained `remove_ch_affected_cf_ids` operation (engine-only migration path for the retired alias); `.claude/skills/canon-addition/references/engine-envelope-shape.md` (rollback of the "populate BOTH" workaround); engine-applied world-data migration for `worlds/erotica-world/_source/change-log/CH-0003.yaml` and `worlds/erotica-world/_source/change-log/CH-0004.yaml`; test-fixture decision for `tests/fixtures/animalia/_source/change-log/CH-0010.yaml`
**Deps**: None — `rule6_no_silent_retcons` already reads `affected_fact_ids` exclusively (`tools/validators/src/rules/rule6-no-silent-retcons.ts:37`). At intake no patch-engine code referenced `affected_cf_ids`; this ticket added the constrained `remove_ch_affected_cf_ids` migration op as the FOUNDATIONS-aligned engine path for removing the retired alias from existing CH records.

## Problem

At intake, the `Change Log Entry` schema (`tools/validators/src/schemas/change-log-entry.schema.json`) defined TWO field names that carried the same semantic content — the array of `CF-NNNN` ids the change record affects:

```json
"affected_fact_ids": { "type": "array", "items": { "type": "string", "pattern": "^CF-[0-9]{4}$" } },
"affected_cf_ids":   { "type": "array", "items": { "type": "string", "pattern": "^CF-[0-9]{4}$" } },
...
"anyOf": [
  { "properties": { "affected_fact_ids": true }, "required": ["affected_fact_ids"] },
  { "properties": { "affected_cf_ids":   true }, "required": ["affected_cf_ids"]   }
]
```

At intake, the schema's `anyOf` accepted either field as schema-valid. The validator (`tools/validators/src/rules/rule6-no-silent-retcons.ts`) did not — line 37 reads `affected_fact_ids` only:

```typescript
const affected = ch ? stringArray(asPlainRecord(ch.parsed).affected_fact_ids) : [];
```

When a CH record modifies an existing CF (via `append_modification_history_entry`, `append_extension` against an existing `_source/canon/CF-NNNN.yaml`, `update_record_field` on an existing CF, or any other op that touches a pre-existing CF), `rule6_no_silent_retcons` checks the CH's `affected_fact_ids` array and emits `rule6.missing_ch_entry: <CF-id> is modified without a CH record whose affected_fact_ids includes that CF` if the modified CF is absent. Before this ticket, records using ONLY `affected_cf_ids` were schema-valid but validator-rejected — a silent trap.

The field-name divergence has produced **active corruption in the wild**, not just operator friction:

- `worlds/animalia/_source/change-log/CH-0010.yaml` populates BOTH fields with **divergent values** (`affected_cf_ids: [CF-0036]`, `affected_fact_ids: [CF-0017]`). `worlds/animalia/audits/AU-0001-2026-04-19.md` lines 159 + 223 already flagged this as continuity-audit finding F-01 ("Which facts are now redundant? CH-0010 `affected_cf_ids` + `affected_fact_ids` redundancy").
- Before this ticket, `worlds/erotica-world/_source/change-log/CH-0003.yaml` populated ONLY `affected_cf_ids` (no `affected_fact_ids`). The engine migration copied that array to `affected_fact_ids` and removed the alias.
- Before this ticket, `worlds/erotica-world/_source/change-log/CH-0004.yaml` populated BOTH fields with the same array. The engine migration removed the redundant alias.
- Before this ticket, `tests/fixtures/animalia/_source/change-log/CH-0010.yaml` mirrored the divergent-values pattern from the wild record. The fixture is a checked-in positive validator corpus, so it was migrated to canonical `affected_fact_ids` while synthetic schema tests preserve rejection coverage for the retired alias.

Worked session evidence (2026-05-03): a `canon-addition` invocation for `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` (PA-0003 / CF-0004 / CH-0004) assembled a CH record with `affected_cf_ids: ["CF-0004", "CF-0003"]` (matching the schema's `anyOf` permissive surface). The CLI `validate-patch-plan` returned `rule6.missing_ch_entry: CF-0003 is modified without a CH record whose affected_fact_ids includes that CF`. The operator added `affected_fact_ids: ["CF-0004", "CF-0003"]` (in addition to `affected_cf_ids`) and the re-validate passed. The friction cost was one re-validate cycle; the operator subsequently encoded "populate BOTH fields" as the recommended practice in `.claude/skills/canon-addition/references/engine-envelope-shape.md` §"CH-record `affected_fact_ids` is required for any plan modifying an existing CF" — a workaround that propagates the redundancy rather than addressing the schema-validator divergence at its root.

The landed fix converges on `affected_fact_ids` as the single canonical field and removes `affected_cf_ids` from the schema entirely. The validator already treated `affected_fact_ids` as the canonical surface; the schema now matches. This eliminates the trap (operator can no longer choose the wrong alias), eliminates the redundancy (no more "which field is authoritative when they diverge?" question), and restores the "no backwards-compatibility shims" architectural contract that the dual-field schema violated.

## Assumption Reassessment (2026-05-03)

1. **Schema state verified by direct file read:** `tools/validators/src/schemas/change-log-entry.schema.json` lines 15-16 declare both fields; lines 54-57 implement `anyOf` requiring at least one. The schema does NOT mark either field as deprecated, preferred, or canonical — both are equally permissible.
2. **Validator state verified by direct file read:** `tools/validators/src/rules/rule6-no-silent-retcons.ts` lines 37, 66, 140 reference `affected_fact_ids` only. `affected_cf_ids` does not appear in the rule6 source. Consequently, the validator cannot satisfy a rule6 check via `affected_cf_ids` — the field is schema-permitted but functionally inert.
3. **Cross-skill / cross-artifact boundary:** the shared boundary is the **CH-record schema contract** between (a) the schema definition (`tools/validators/src/schemas/change-log-entry.schema.json`), (b) the `record_schema_compliance` validator that enforces it, (c) the `rule6_no_silent_retcons` validator that consumes the parsed record, (d) the patch-engine ops and world-mcp envelope introspection that expose valid CH mutation shapes, (e) the `canon-addition` skill (`.claude/skills/canon-addition/references/engine-envelope-shape.md`) that documents CH construction, and (f) the `create-base-world` skill (`.claude/skills/create-base-world/SKILL.md` line 111 + `templates/change-log-entry.yaml` line 27) that documents the genesis CH-0001 schema. Removing `affected_cf_ids` from the schema is the single-point contract fix; the constrained patch-engine op exists only to migrate existing CH records without violating the engine-only `_source` write boundary.
4. **FOUNDATIONS principle under audit (Rule 6 — No Silent Retcons):** §Validation Rules (Rule 6) requires every change to carry a Change Log Entry naming what was changed. The audit-trail field rule6 indexes on is `affected_fact_ids`; a CH record using only `affected_cf_ids` populates a phantom audit field rule6 cannot read, breaking the Rule 6 enforcement contract at the schema layer rather than at the validator layer. Converging on a single canonical field name strengthens Rule 6 enforcement structurally — the schema can no longer accept a CH record that fails to populate the audit-trail field rule6 actually reads.
5. **No HARD-GATE / Mystery Reserve firewall surface weakened:** the change is to retrieval-time / pre-apply schema validation; HARD-GATE token semantics, MR firewall enforcement (rule7), and engine-only `_source/` write blocking (Hook 3) remain identical. Removing the alias does NOT relax any canon-mutation gate — it tightens the schema contract.
6. **Schema parity (additive vs breaking):** **breaking change** for schema consumers. The `anyOf` surface that accepts `affected_cf_ids` is removed; CH records using only the alias become schema-invalid post-migration. Per the `tickets/README.md` Mandatory Pre-Implementation Check #10, breaking schema changes require consumer migration. `docs/FOUNDATIONS.md` §Canonical Storage Layer makes `_source/*.yaml` an engine-only write surface, so this ticket owns a constrained patch-engine migration op rather than direct YAML edits. In-scope migrations:
   - `worlds/erotica-world/_source/change-log/CH-0003.yaml` (engine-set `affected_fact_ids` to the existing alias array, then engine-remove retired `affected_cf_ids`).
   - `worlds/erotica-world/_source/change-log/CH-0004.yaml` (engine-remove redundant `affected_cf_ids`; `affected_fact_ids` already populated with the same array).
   - `tests/fixtures/animalia/_source/change-log/CH-0010.yaml` (migrated as a canonical positive fixture because validator package tests treat it as part of the clean corpus).
7. **Adjacent contradictions classified:**
   - `worlds/animalia/_source/change-log/CH-0010.yaml` divergent-values record: **separate cleanup, out-of-scope for this ticket.** This record has `affected_cf_ids: [CF-0036]` AND `affected_fact_ids: [CF-0017]` — two different arrays. Reconciling which CF ids are the truth requires a continuity-audit retcon, which is exactly what `worlds/animalia/audits/AU-0001-2026-04-19.md` finding F-01 already names. This ticket should NOT silently merge or pick one — that would itself be a Rule 6 silent retcon. Recommendation: this ticket lands the schema change; the animalia CH-0010 record is left for AU-0001 F-01's retcon flow to address before the next animalia validator pass succeeds. Document the dependency in the ticket's "Out of Scope" section so downstream operators know.
   - The `_source/CH-0001.yaml` genesis records in both worlds (`worlds/erotica-world/_source/change-log/CH-0001.yaml`, `worlds/animalia/_source/change-log/CH-0001.yaml`) and `worlds/erotica-world/_source/change-log/CH-0002.yaml` already use `affected_fact_ids` only — no migration needed. The `create-base-world` template at `.claude/skills/create-base-world/templates/change-log-entry.yaml` line 27 also uses `affected_fact_ids`. Confirmed via `grep -rn "affected_" worlds/*/​_source/change-log/`.
8. **Test fixture decision:** `tests/fixtures/animalia/_source/change-log/CH-0010.yaml` is loaded by positive corpus-conformance and full-world validator tests. It was migrated to canonical-only `affected_fact_ids` so the fixture corpus remains a clean positive baseline. Rejection coverage for the retired alias landed as a synthetic `record_schema_compliance` test, while the live `worlds/animalia/_source/change-log/CH-0010.yaml` remains deferred to AU-0001 F-01.
9. **Skill-doc rollback scope:** `.claude/skills/canon-addition/references/engine-envelope-shape.md` §"CH-record `affected_fact_ids` is required for any plan modifying an existing CF" (added in this session as the operator-side workaround for the validator-vs-schema gap) recommends "populate BOTH" — directly contradicts the post-migration schema. The section must be revised to state: "populate `affected_fact_ids` only — `affected_cf_ids` was a redundant alias removed by PATCHENG-003." Failing to revise leaves the skill prose authoritatively recommending a now-rejected schema variant.
10. **FOUNDATIONS-aligned migration boundary:** Direct edits to `worlds/erotica-world/_source/change-log/CH-0003.yaml` / `CH-0004.yaml` would violate `docs/FOUNDATIONS.md` §Canonical Storage Layer. The live patch-engine `update_record_field` op can set `affected_fact_ids` on CH-0003 but cannot remove `affected_cf_ids`; therefore this ticket absorbs a same-seam constrained `remove_ch_affected_cf_ids` op. The op is intentionally narrow rather than a generic unset/delete operation, so it cannot become a broad canon-mutation escape hatch.

## Architecture Check

1. **Why this approach is cleaner than alternatives:**
   - **Alternative A** — keep both fields in the schema; make `rule6_no_silent_retcons` check the union of `affected_fact_ids` and `affected_cf_ids`: rejected because it preserves the redundancy and the divergence trap (animalia CH-0010 would still validate with `[CF-0036]` and `[CF-0017]` as inconsistent values; the validator would canonicalize via union, hiding the divergence rather than surfacing it). This violates the "no backwards-compatibility shims or alias paths" rule in `tickets/README.md` Core Architectural Contract #1.
   - **Alternative B** — keep both fields; add a schema constraint requiring them to be array-equal when both present: rejected because it adds runtime complexity (operators must populate two fields with the same content; validators must compare them; engine ops must carry the redundancy through patch-plan assembly) for zero semantic gain. The right answer to "the two fields must agree" is "there is one field."
   - **Alternative C** — remove `affected_fact_ids` from the schema (favor `affected_cf_ids` as canonical): rejected because rule6 would need to be rewritten (currently reads `affected_fact_ids`), the canonical genesis CH-0001 records use `affected_fact_ids`, the create-base-world template uses `affected_fact_ids`, the worked example in `.claude/skills/canon-addition/examples/accept-with-required-updates.md:121` uses `affected_fact_ids`, and the audit precedent (`worlds/animalia/audits/AU-0001-2026-04-19.md` line 223) names `affected_fact_ids` as the established convention with `affected_cf_ids` as the divergent introduction. `affected_fact_ids` is the canonical convention; `affected_cf_ids` is the alias to remove.
   - **The chosen approach** (remove `affected_cf_ids` from the schema; preserve `affected_fact_ids` as the single required field; add a constrained engine migration op for existing CH records) follows established convention, preserves FOUNDATIONS engine-only `_source` write discipline, and matches the architectural contract's no-shims rule.

2. **No backwards-compatibility shims:** the migration is non-additive — `affected_cf_ids` is removed from the schema, the `anyOf` block becomes `required: ["affected_fact_ids"]`, and existing records using only the alias must be migrated. No deprecation cycle, no version-gate, no parallel-acceptance window. The animalia CH-0010 divergent-values record is explicitly out-of-scope for this ticket so its remediation (via AU-0001 F-01) can preserve audit-trail discipline rather than being silently reconciled by a schema-migration script.

## Verification Layers

1. **Schema rejects `affected_cf_ids`** → schema validation: `record_schema_compliance` against a synthetic CH record using only `affected_cf_ids` fails with a `schema_violation` verdict naming the missing-required `affected_fact_ids` field.
2. **Schema accepts `affected_fact_ids`** → schema validation: the same record with `affected_fact_ids` only passes `record_schema_compliance`.
3. **rule6 behavior unchanged for canonical-form records** → schema validation + skill dry-run: existing canon-addition flows that already populate `affected_fact_ids` continue to validate clean (rule6 passes); regression-coverage via `cd tools/validators && npm test`.
4. **Migrated erotica-world records validate clean** → codebase grep-proof + schema validation: post-migration `worlds/erotica-world/_source/change-log/CH-0003.yaml` and `CH-0004.yaml` carry `affected_fact_ids` only; `node tools/validators/dist/src/cli/world-validate.js erotica-world` reports zero verdicts.
5. **Skill-doc rollback applied** → manual review: `.claude/skills/canon-addition/references/engine-envelope-shape.md` §"CH-record `affected_fact_ids` is required for any plan modifying an existing CF" no longer recommends "populate BOTH"; the prose now names PATCHENG-003 as the schema unification and recommends `affected_fact_ids` only.
6. **Animalia CH-0010 divergent-values record explicitly deferred** → manual review of `tickets/PATCHENG-003-...md` Out of Scope section confirms the dependency on AU-0001 F-01 is named so the operator landing this ticket does NOT silently mutate `worlds/animalia/_source/change-log/CH-0010.yaml`.
7. **FOUNDATIONS Rule 6 enforcement strengthened** → FOUNDATIONS alignment check: §Validation Rules Rule 6 (No Silent Retcons) — the schema now structurally requires the audit-trail field rule6 reads; no CH record can be schema-valid while populating only the validator-inert alias.

## Landed Changes

### 1. Schema: remove `affected_cf_ids`

In `tools/validators/src/schemas/change-log-entry.schema.json`:

- Delete the `affected_cf_ids` field definition (line 16).
- Replaced the `anyOf` block with `required: ["change_id", "date", "change_type", "affected_fact_ids"]`.
- No other field shape changes; `affected_files`, `affected_fact_ids`, `change_summary`, `summary`, etc. stay as currently typed.

### 2. Validator pre-apply overlay

`tools/validators/src/rules/rule6-no-silent-retcons.ts` continues to read `affected_fact_ids` only. `tools/validators/src/_helpers/index-access.ts` now applies `remove_ch_affected_cf_ids` to pre-apply overlay records so validator CLI and submit pre-apply proof see the final migrated record shape.

### 3. World-data migration

Through the patch engine, update `worlds/erotica-world/_source/change-log/CH-0003.yaml`:

- `PLAN-PATCHENG-003-EROTICA-0002` set `affected_fact_ids:` to the existing `affected_cf_ids` array.
- The same plan removed retired `affected_cf_ids:` via the constrained `remove_ch_affected_cf_ids` op.
- Direct file read and grep confirmed no `affected_cf_ids` remains in the file.

Through the patch engine, update `worlds/erotica-world/_source/change-log/CH-0004.yaml`:

- `PLAN-PATCHENG-003-EROTICA-0002` removed the `affected_cf_ids:` line plus its array contents via the constrained `remove_ch_affected_cf_ids` op.
- Direct file read confirmed `affected_fact_ids:` carries the canonical CF list.

### 3a. Patch-engine migration op

Added `remove_ch_affected_cf_ids` as a constrained operation in `tools/patch-engine` and exposed it through `tools/world-mcp` envelope schema introspection:

- Payload: `target_ch_id`.
- Target: existing `change_log_entry` records only.
- Behavior: stage the existing CH record with the top-level `affected_cf_ids` key removed; no-op only if the key is already absent.
- Guardrails: reject non-CH ids; preserve normal expected-content-hash, approval-token, pre-apply validation, staging, receipt, and index-sync behavior.
- No generic field deletion operation was added.

### 4. Test-fixture decision

`tests/fixtures/animalia/_source/change-log/CH-0010.yaml` was migrated to canonical form because validator package tests load the fixture corpus as a clean positive baseline. Synthetic `record_schema_compliance` coverage now proves the retired alias is rejected.

### 5. Skill-doc rollback

`.claude/skills/canon-addition/references/engine-envelope-shape.md` now names PATCHENG-003 as the schema unification, states that `affected_cf_ids` was a redundant alias removed from the schema, recommends `affected_fact_ids` only, and cites genesis/worked-example precedent. The section's grep-anchor heading remains stable so downstream cross-references continue to resolve.

### 6. Out-of-scope record explicitly noted

`worlds/animalia/_source/change-log/CH-0010.yaml` was not modified. The divergent-values reconciliation is AU-0001 finding F-01's territory, and the expected validator failure is documented below as known-pending state.

## Files to Touch

- `tools/validators/src/schemas/change-log-entry.schema.json` (modify — remove field, tighten `anyOf` to `required`)
- `tools/patch-engine/src/envelope/schema.ts` (modify — register constrained op)
- `tools/patch-engine/src/commit/order.ts` (modify — place constrained op in update tier)
- `tools/patch-engine/src/commit/temp-file.ts` (modify — stage constrained op and overlay metadata)
- `tools/patch-engine/src/ops/remove-ch-affected-cf-ids.ts` (new — constrained CH alias removal)
- `tools/patch-engine/tests/ops/remove-ch-affected-cf-ids.test.ts` (new — operation proof)
- `tools/validators/src/_helpers/index-access.ts` (modify — pre-apply overlay support for constrained op)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify — describe constrained op)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — describe-envelope op-kind enum proof)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify — introspection proof)
- `tools/patch-engine/README.md` (modify — operation inventory)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — Tier 2 operation inventory)
- `worlds/erotica-world/_source/change-log/CH-0003.yaml` (modify via patch engine — set canonical field and remove retired alias)
- `worlds/erotica-world/_source/change-log/CH-0004.yaml` (modify via patch engine — remove redundant alias)
- `tests/fixtures/animalia/_source/change-log/CH-0010.yaml` (modify — canonical positive fixture)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify — rollback the "populate BOTH" recommendation)

## Out of Scope

- **`worlds/animalia/_source/change-log/CH-0010.yaml`**: divergent-values reconciliation belongs to `worlds/animalia/audits/AU-0001-2026-04-19.md` finding F-01. Animalia's `world-validate` reports a `schema_violation` on CH-0010 (record uses removed `affected_cf_ids` alias); F-01's retcon-proposal flow must address this before animalia validates clean. Do NOT pre-empt that retcon by mechanically editing the record in this ticket.
- **Follow-up owner created during post-ticket review:** `tickets/ANIMALIA-001-reconcile-ch-0010-affected-fact-ids-after-patcheng-003.md` owns the explicit CH-0010 affected-fact reconciliation and engine-mediated animalia cleanup.
- **Animalia world-state validation regression sweep**: out of scope. After the schema change, animalia has one schema violation (CH-0010); operator running `node tools/validators/dist/src/cli/world-validate.js animalia` should expect this single-record fail and route the fix through AU-0001 F-01.
- **Other potential field unifications**: this ticket is scoped to `affected_fact_ids` vs `affected_cf_ids` only. Other anyOf-permissive schema patterns (e.g., `change_scope` allowing string-or-object per line 30) are not part of this ticket.
- **Patch-engine envelope-level deduplication**: the engine does not currently deduplicate or alias-translate field names; this ticket does not introduce that capability. Records arriving at the engine use the post-migration schema directly.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator package suite passes against the modified schema; rule6 tests continue to pass; `record_schema_compliance` tests gain coverage for the rejection of `affected_cf_ids` and the acceptance of `affected_fact_ids`-only records.
2. `cd tools/patch-engine && npm test` — full patch-engine suite passes with `remove_ch_affected_cf_ids` operation coverage.
3. `cd tools/world-mcp && npm test` — full MCP package suite passes with envelope-introspection and dispatch enum coverage for the constrained op.
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world` — erotica-world validation reports zero verdicts after the migration.
5. `node tools/validators/dist/src/cli/world-validate.js animalia` — animalia validation reports exactly one fail against `_source/change-log/CH-0010.yaml` (the deferred AU-0001 F-01 case), and zero unexpected violations elsewhere.
6. `rg -n "affected_cf_ids" worlds/ .claude/skills/ docs/ tools/ tests/` — post-migration grep returns hits only in the deferred live animalia record/audit references, implementation code for the constrained removal op, docs/ticket removal-history prose, and no `erotica-world` or positive fixture source record hits.

### Invariants

1. **Single canonical CF-reference field on CH records**: post-migration, every CH record schema-validates ONLY when `affected_fact_ids` is populated; `affected_cf_ids` is a no-op alias the schema rejects.
2. **rule6 audit-trail field continuity preserved**: the field rule6 reads (`affected_fact_ids`) is the field the schema requires; no record can be schema-valid while populating only a validator-inert audit field.
3. **No silent reconciliation of divergent-values records**: animalia CH-0010 retains its divergent state until AU-0001 F-01's retcon flow addresses it explicitly; this ticket does not pre-empt that audit's authority over the conflict.
4. **canon-addition skill prose canonicalized**: `.claude/skills/canon-addition/references/engine-envelope-shape.md` recommends `affected_fact_ids` only, post-migration.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — added positive-case coverage for `affected_fact_ids` and negative-case coverage for the removed `affected_cf_ids` alias.
2. `tools/patch-engine/tests/ops/remove-ch-affected-cf-ids.test.ts` — added constrained-op coverage for alias removal and wrong-target rejection.
3. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` — added envelope-introspection and registered enum coverage for `remove_ch_affected_cf_ids`.

### Commands

1. `cd tools/validators && npm test` — full validator package verification (targeted to the schema and rule6 changes).
2. `cd tools/patch-engine && npm test` — full patch-engine verification for the new constrained op.
3. `cd tools/world-mcp && npm test` — full MCP package verification (the patch-engine schema is consumed by `validate_patch_plan` and `submit_patch_plan` handlers; verify no regression in those code paths).
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world` — post-migration smoke against the actively-canon erotica world.
5. `node tools/validators/dist/src/cli/world-validate.js animalia` — post-migration smoke confirming the expected single-record CH-0010 fail and no other new fails.
6. `rg -n "affected_cf_ids" worlds/ .claude/skills/ docs/ tools/ tests/` — coverage-completeness grep per the Acceptance Criteria check 6.

## Outcome

PATCHENG-003 landed the CH schema unification on `affected_fact_ids` as the only accepted CF-reference field. `tools/validators/src/schemas/change-log-entry.schema.json` now requires `affected_fact_ids` directly and rejects `affected_cf_ids` as an additional property. `record_schema_compliance` has positive and negative tests for the canonical and retired shapes.

The live `erotica-world` migration was applied through the patch engine, not by direct `_source` edits. `PLAN-PATCHENG-003-EROTICA-0002` set `CH-0003.affected_fact_ids` from the retired alias value, removed `affected_cf_ids` from CH-0003, removed the redundant alias from CH-0004, ran pre-apply validators cleanly, and synced the world index.

The patch engine now exposes a deliberately constrained `remove_ch_affected_cf_ids` op. It accepts only `target_ch_id`, rejects non-CH ids and non-`change_log_entry` targets, stages normal atomic writes, participates in Tier 2 ordering, and is included in `describe_envelope_schema`. The validators pre-apply overlay also understands this op so validation sees the post-migration record shape before submit.

The canon-addition reference no longer recommends "populate BOTH"; it names PATCHENG-003 and instructs `affected_fact_ids` only. `docs/HARD-GATE-DISCIPLINE.md` and `tools/patch-engine/README.md` list the new constrained operation.

`tests/fixtures/animalia/_source/change-log/CH-0010.yaml` was migrated to canonical positive-fixture shape because it is part of the checked-in clean validator corpus. The live `worlds/animalia/_source/change-log/CH-0010.yaml` remains unchanged and deferred to AU-0001 F-01.

## Verification Result

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/patcheng-003-erotica-plan.json` — pass for `PLAN-PATCHENG-003-EROTICA-0002`; all 14 pre-apply validators passed.
2. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/patcheng-003-erotica-plan.json /tmp/patcheng-003-erotica-token.txt` — success; wrote CH-0003 and CH-0004; `index_sync_duration_ms: 440`; all pre-apply validators passed.
3. `cd tools/patch-engine && npm test` — pass, 55 tests.
4. `cd tools/validators && npm test` — pass, 86 tests.
5. `cd tools/world-mcp && npm test` — pass, 291 tests.
6. `node tools/validators/dist/src/cli/world-validate.js erotica-world` — pass; 13 validators run, 1 skipped, 0 verdicts.
7. `node tools/validators/dist/src/cli/world-validate.js animalia` — expected fail only: `record_schema_compliance.additionalProperties` on `_source/change-log/CH-0010.yaml`.
8. `rg -n "affected_cf_ids" worlds/erotica-world tests/fixtures/animalia/_source/change-log/CH-0010.yaml` — no hits; command exited 1 as expected for a negative grep.
9. `rg -n "affected_cf_ids" worlds/animalia/_source/change-log/CH-0010.yaml worlds/animalia/audits/AU-0001-2026-04-19.md tests/fixtures/animalia/audits/AU-0001-2026-04-19.md` — hits only the deferred live CH-0010 record and audit references.

## Deviations

- The drafted `node tools/world-index/dist/src/cli.js validate <world>` proof command was stale; the live `world-index` CLI has no `validate` subcommand. Closeout uses `node tools/validators/dist/src/cli/world-validate.js <world>`, which is the current validator CLI.
- The first migration submit attempt (`PLAN-PATCHENG-003-EROTICA-0001`) failed before commit with `record_hash_drift` on the second same-file CH-0003 op because it supplied a hash for a staged intermediate record. The successful plan kept current on-disk hashes on first writers and omitted the dependent staged hash for the same-file removal op.
- A sandbox child-process restriction blocked a helper that tried to spawn `node` from inside `node` while writing the token file. The signer CLI itself worked; the token was written directly to `/tmp/patcheng-003-erotica-token.txt` and submit succeeded.
- Live `worlds/animalia/_source/change-log/CH-0010.yaml` remains schema-invalid by design. Reconciling its divergent `affected_cf_ids` / `affected_fact_ids` values is not a mechanical schema migration and remains owned by AU-0001 F-01.
- Post-ticket review created `tickets/ANIMALIA-001-reconcile-ch-0010-affected-fact-ids-after-patcheng-003.md` as the active owner for that AU-0001 F-01 / CH-0010 cleanup.
