# VALENH-052: Widen SREL `record_introductions[]` trigger enum to cover all 14 closed-axis values

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends the `SREL` branch of `record_introductions[].trigger.enum` in `tools/validators/src/schemas/story-event.schema.json`; extends the source-of-truth `MIDSTORY_TRIGGERS_BY_CLASS.SREL` in `tools/validators/src/structural/midstory-introduction-utils.ts`; extends the §5a SREL Triggers table in `.claude/skills/_shared-templates/story-state-contract.md`; validator-package rebuild required so MCP `describe_envelope_schema` surface and patch-engine pre-apply gate see the new triggers; adds positive schema-compliance coverage in `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` and relationship-grounding coverage in `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts`.
**Deps**: None

## Problem

At intake, the `SE.record_introductions[]` schema enumerated a closed `trigger` enum per introduced class (`tools/validators/src/schemas/story-event.schema.json` `oneOf` branches; mirrored in `MIDSTORY_TRIGGERS_BY_CLASS` at `tools/validators/src/structural/midstory-introduction-utils.ts`). The SREL branch admitted exactly **7 triggers**: `alliance_forms`, `rivalry_forms`, `debt_relation_forms`, `authority_relation_forms`, `trust_axis_becomes_relevant`, `intimacy_axis_becomes_relevant`, `hostility_axis_becomes_relevant`.

At intake, the SREL `axis` closed enum (`.claude/skills/_shared-templates/story-record-schemas.md` §4.4b) carried **14 axes**: `trust`, `fear`, `desire`, `debt`, `intimacy`, `loyalty`, `resentment`, `power_imbalance`, `attention`, `familiarity`, `approval`, `respect`, `obligation`, `hostility`. Only three of those axes (`trust`, `intimacy`, `hostility`) had a corresponding `_axis_becomes_relevant` trigger; one was covered by a relation-formation trigger (`debt` ↔ `debt_relation_forms`); the remaining **10 axes** (`fear`, `desire`, `loyalty`, `resentment`, `power_imbalance`, `attention`, `familiarity`, `approval`, `respect`, `obligation`) had **no honest introduction trigger**.

The gap was hit empirically during a `branching-story-turn-cycle` advance_initiative turn on `red-bunny` PG-5. The author wanted to introduce a fresh `attention`-axis SREL (Ane → Jon, recording the moment her sort-grid first attended to him as a stable relational fact distinct from STEMO-10 confusion + BEL-15 read). Before this ticket, no `attention_axis_becomes_relevant` trigger existed; choosing a wrong-but-accepted trigger (e.g., `trust_axis_becomes_relevant` for a not-yet-trust relationship) would have laundered dishonest provenance into `SE.record_introductions[]`, undermining FOUNDATIONS §Rule 6's audit-trail integrity. The author dropped the SREL entirely and modeled state via STEMO+BEL — losing graph-level relational provenance the SREL would have carried.

Before this ticket, a future non-vigilant operator might have picked a wrong-but-accepted trigger to push their work through, producing dishonest `record_introductions[]` evidence. The discoverable schema (via `mcp__worldloom__describe_envelope_schema`) did not warn that 10 of 14 axes were unmodelled at the trigger surface.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** At intake, `tools/validators/src/schemas/story-event.schema.json` SREL `oneOf` branch's `trigger.enum` listed exactly `["alliance_forms", "rivalry_forms", "debt_relation_forms", "authority_relation_forms", "trust_axis_becomes_relevant", "intimacy_axis_becomes_relevant", "hostility_axis_becomes_relevant"]` (7 values). `tools/validators/src/structural/midstory-introduction-utils.ts` is the source-of-truth (`MIDSTORY_TRIGGERS_BY_CLASS.SREL`) the schema mirrors; the existing parity test `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` enforces that the schema enum and the utility constant carry the same set. The SREL `axis` closed enum at `.claude/skills/_shared-templates/story-record-schemas.md` §4.4b lists 14 values. Set-difference at intake: 10 axes lacked an `_axis_becomes_relevant` trigger.
2. **Specs/docs reassessment.** At intake, `.claude/skills/_shared-templates/story-state-contract.md` §5a SREL Triggers table listed exactly the 7 existing triggers with one-line "Present-causal meaning" entries each. The contract did not name a rationale for excluding the other 10 axes. The omission was therefore treated as an oversight, not a design decision documented elsewhere. The shared contract also explicitly admits `attention`, `familiarity`, `approval`, `respect`, `obligation`, `fear`, `desire`, `loyalty`, `resentment`, `power_imbalance` as load-bearing relationship axes in §4.4b's per-axis operational definitions — every one of those axes has narratively-load-bearing "becomes relevant" cases (e.g., "Ane starts attending to Jon" on `attention`; "Ane develops fear of Marisa" on `fear`; etc.).
3. **Cross-skill / cross-artifact boundary.** The shared boundary is the `record_introductions[]` schema and its source-of-truth utility constant. Consumers: `relationship_introduction_grounding_integrity` validator (consumes the SREL branch); `mcp__worldloom__describe_envelope_schema` (exposes the schema text to authors at authoring time); patch-engine pre-apply gate (rejects ill-formed `SE` records before commit); shared-contract §5a Triggers table (the human-readable documentation surface). All four consumers must align — the existing parity test enforces schema ↔ utility alignment, and the contract table is the human-readable documentation that authors consult when picking a trigger value.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS §Rule 6 (No Silent Retcons) requires "all canon changes must be logged with justification" — the `record_introductions[]` mechanism IS the per-event audit-trail surface that makes mid-story state introductions logged and justified (via the `trigger` + `evidence` + `distinct_from` triple). A trigger enum that omits 10 of 14 lawful axis-introduction cases forces authors into either (a) dishonest reuse of a wrong-but-accepted trigger (laundering false provenance into the audit trail) or (b) dropping the introduction entirely (losing the audit-trail entry). Both outcomes weaken Rule 6's audit-trail integrity. FOUNDATIONS §Tooling Recommendation also requires that "LLM agents should never operate on prose alone" — they should receive truthful schemas; a schema whose enum omits 10 of 14 lawful axes is structurally incomplete relative to the sibling closed-enum the same package defines (§4.4b SREL axes).
5. **Existing output schema extension shape.** The `record_introductions[]` schema was **additively widened**: 10 new trigger values were added to the existing SREL `oneOf` branch's enum. Existing records that use the 7 pre-existing triggers continue to validate; new records can use any of the 17 values. Set-membership widening is monotonic — no existing valid record becomes invalid. Schema consumers (the validator's per-class trigger check, `describe_envelope_schema`'s discoverable surface, the parity test) all consume the same source-of-truth and therefore see the extension consistently after `MIDSTORY_TRIGGERS_BY_CLASS.SREL` was updated alongside the schema. The shared-contract §5a SREL Triggers table was updated in parallel to keep the human-readable documentation honest.
6. **Proof-surface correction.** The drafted plan said `relationship-introduction-grounding-integrity.test.ts` alone would prove AJV acceptance of the new `trigger.enum` values, but that structural validator does not compile or enforce the SE JSON Schema. The live schema proof belongs in `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts`, which runs `record_schema_compliance` through the package's schema compiler. `relationship-introduction-grounding-integrity.test.ts` remains in scope for a focused positive SREL relationship invariant using a new axis/trigger pair.

## Architecture Check

1. **Per-axis trigger naming pattern preserves consistency.** The existing 3 axis-relevance triggers use the `<axis>_axis_becomes_relevant` form (`trust_axis_becomes_relevant`, `intimacy_axis_becomes_relevant`, `hostility_axis_becomes_relevant`). Adding 10 new triggers using the same form (`fear_axis_becomes_relevant`, `desire_axis_becomes_relevant`, ..., `obligation_axis_becomes_relevant`) preserves the established naming pattern and lets the parity test continue to do its alignment check without grammar changes. Alternative considered: a single generic `axis_becomes_relevant` trigger with the axis carried in an `axis` field — rejected because the existing 7 triggers are class-keyed, not axis-keyed at the schema level; introducing a second-level field-keying on SREL would require restructuring the `oneOf` branch, breaking the parity-test contract that pins per-class trigger enums.
2. **No backwards-compatibility aliasing/shims introduced.** Existing records continue to validate. Existing trigger enum values are unchanged. The shared-contract table grows by 10 rows but does not rewrite or relocate existing rows.
3. **Audit-trail integrity strengthened.** After this ticket, an author introducing a fresh `attention`-axis SREL records `trigger: attention_axis_becomes_relevant` honestly. No more wrong-but-accepted-trigger laundering; no more dropped-introduction silence. The audit trail truthfully names which axis the new relationship pins on.
4. **Parity test catches future drift.** The existing `midstory-vocabulary-parity.test.ts` source-of-truth alignment check fires whenever the schema or the utility constant drifts. Adding 10 new triggers to both files in the same patch keeps the parity test green; adding them to only one would fail the test, surfacing the drift immediately. No new parity test needed.

## Verification Layers

1. **Schema validation** → AJV-compiled `story-event.schema.json` accepts an `SE.record_introductions[]` entry with `class: SREL` and `trigger: <each of the 10 new values>`. Proven by extending `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` with positive coverage for each new trigger.
2. **Source-of-truth parity** → `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` continues to pass after `MIDSTORY_TRIGGERS_BY_CLASS.SREL` and the schema enum are both extended. The existing test is the structural backstop.
3. **Codebase grep-proof** → `grep -c "axis_becomes_relevant" tools/validators/src/structural/midstory-introduction-utils.ts` returns 13 hits after the edit; `grep -c "axis_becomes_relevant" tools/validators/src/schemas/story-event.schema.json` returns 13 hits after the edit.
4. **Shared contract alignment** → `.claude/skills/_shared-templates/story-state-contract.md` §5a SREL Triggers table grew from 7 rows to 17 rows after the edit. Verified by `grep -c "^\|.*axis_becomes_relevant" .claude/skills/_shared-templates/story-state-contract.md` returning 13 after the edit within the SREL Triggers table.
5. **FOUNDATIONS alignment check** → FOUNDATIONS §Rule 6 (No Silent Retcons) is upheld because authors can now record honest provenance for every lawful SREL axis introduction.
6. **Historical sandbox smoke** → a sandbox copy of the red-bunny PG-5 turn-cycle envelope with restored SREL-7 (Ane → Jon, axis: `attention`, trigger: `attention_axis_becomes_relevant`) exercises the rebuilt pre-apply validator bundle. Because PG-5 and its sibling records are already committed in the checkout, the full historical envelope now correctly fails append-only and ID-allocation validators; the relevant owned validators (`record_schema_compliance`, `relationship_introduction_grounding_integrity`, and `midstory_record_introduction_grounding`) pass on that smoke.

## Landed Changes

### 1. `tools/validators/src/structural/midstory-introduction-utils.ts`

Extended `MIDSTORY_TRIGGERS_BY_CLASS.SREL` from 7 values to 17 by adding the 10 missing `_axis_becomes_relevant` triggers (one per axis from §4.4b's closed enum that doesn't already have a relation-formation trigger):

- `fear_axis_becomes_relevant`
- `desire_axis_becomes_relevant`
- `loyalty_axis_becomes_relevant`
- `resentment_axis_becomes_relevant`
- `power_imbalance_axis_becomes_relevant`
- `attention_axis_becomes_relevant`
- `familiarity_axis_becomes_relevant`
- `approval_axis_becomes_relevant`
- `respect_axis_becomes_relevant`
- `obligation_axis_becomes_relevant`

Preserved the existing 7 trigger values unchanged. Total after edit: 17 SREL triggers (7 existing + 10 new). The other-class enums (CLK, STSEC, STQ, THR, STENT, STCHAR, STPLAN, STEMO) are unchanged.

### 2. `tools/validators/src/schemas/story-event.schema.json`

Mirrored the utility-side extension in the SREL `oneOf` branch's `trigger.enum`. Added the same 10 trigger values in the same order as the utility constant. The schema's source-of-truth is `midstory-introduction-utils.ts` per the parity test, but both files carry the same values in practice.

### 3. `.claude/skills/_shared-templates/story-state-contract.md` §5a SREL Triggers

Extended the SREL Triggers table with 10 new rows, one per new trigger value, each carrying a one-line "Present-causal meaning" entry consistent with the existing trigger style:

| Trigger | Present-causal meaning |
|---|---|
| `fear_axis_becomes_relevant` | Fear becomes a load-bearing relationship axis. |
| `desire_axis_becomes_relevant` | Desire becomes a load-bearing relationship axis. |
| `loyalty_axis_becomes_relevant` | Loyalty becomes a load-bearing relationship axis. |
| `resentment_axis_becomes_relevant` | Resentment becomes a load-bearing relationship axis. |
| `power_imbalance_axis_becomes_relevant` | Power imbalance becomes a load-bearing relationship axis. |
| `attention_axis_becomes_relevant` | Attention becomes a load-bearing relationship axis. |
| `familiarity_axis_becomes_relevant` | Familiarity becomes a load-bearing relationship axis. |
| `approval_axis_becomes_relevant` | Approval becomes a load-bearing relationship axis. |
| `respect_axis_becomes_relevant` | Respect becomes a load-bearing relationship axis. |
| `obligation_axis_becomes_relevant` | Obligation becomes a load-bearing relationship axis. |

### 4. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts`

Added positive schema-compliance coverage asserting that `record_schema_compliance` accepts an `SE.record_introductions[]` entry with `class: SREL` and each new trigger value.

### 5. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts`

Added a focused positive-case test asserting that a fresh SREL with `axis: attention` paired with `trigger: attention_axis_becomes_relevant` passes `relationship_introduction_grounding_integrity` when participants, evidence, and derived_from are well-formed. Existing tests for the 7 pre-existing triggers continue to pass unchanged.

### 6. Rebuild

Ran `cd tools/validators && npm run build` so `dist/` reflects the widened schema and utility constant. The MCP `describe_envelope_schema` tool was probed through compiled `tools/world-mcp/dist` and returned the 17-value SREL trigger enum from `story-event.schema.json`; the patch-engine pre-apply gate consumed the rebuilt validator bundle during the sandbox smoke.

## Files to Touch

- `tools/validators/src/structural/midstory-introduction-utils.ts` (modify)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5a SREL Triggers table)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify — add positive schema coverage for the 10 new triggers)
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` (modify — add positive relationship-grounding coverage for a new trigger/axis pair)
- `tools/validators/dist/**` (rebuild artifact)

## Out of Scope

- Restructuring the `record_introductions[]` schema to use a single generic `axis_becomes_relevant` trigger paired with an `axis` field (rejected at Architecture Check; preserves per-class trigger enum pattern).
- Adding new triggers for other classes (CLK, STSEC, STQ, THR, STENT, STCHAR, STPLAN, STEMO) — those enums are not under audit here. If a future authoring move surfaces a similar gap on a different class, file a separate ticket.
- Auto-deriving the SREL trigger enum from the SREL axis closed enum (would require a build-time codegen step that the existing parity-test mechanism doesn't currently use). Deferred as a structural consolidation candidate for a future ticket; for now, keep the explicit per-axis enumeration so each trigger can carry its own §5a docstring.
- Re-validating already-committed `SE.record_introductions[]` records that used wrong-but-accepted triggers as workarounds. After this ticket, future records use honest triggers; existing records remain valid under both old and new enum.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript compile + dist refresh completes cleanly.
2. `cd tools/validators && node --test dist/tests/structural/midstory-vocabulary-parity.test.js` — the existing parity test passes (schema enum and `MIDSTORY_TRIGGERS_BY_CLASS.SREL` are aligned at the new 17-value set).
3. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-event.test.js` — `record_schema_compliance` accepts all 10 new SREL trigger values through the compiled JSON Schema.
4. `cd tools/validators && node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js` — existing tests pass plus the new positive relationship-grounding case for a new trigger/axis pair.
5. `cd tools/validators && npm test` — full validator test suite passes with no regressions.
6. **Historical sandbox smoke**: prepare a sandbox copy of `/tmp/red-bunny-pg5-envelope.json` with a restored SREL-7 record (`axis: attention`, `direction.from: STENT-1`, `direction.to: STENT-3`, plus `SE-5.state_delta.create += ["SREL-7"]` and `SE-5.record_introductions[]` entry with `class: SREL, trigger: attention_axis_becomes_relevant`); recompute hashes; run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/red-bunny-pg5-page-plan-drafts.json <sandbox-envelope>`. The relevant owned validators must pass; the whole historical envelope is not expected to pass after PG-5 has already been committed in the checkout.

### Invariants

1. **Set-membership widening monotonicity.** No record valid under the pre-VALENH-052 SREL trigger enum becomes invalid after the extension. Set-membership widening is monotonic.
2. **Schema-utility parity.** `MIDSTORY_TRIGGERS_BY_CLASS.SREL` (utility source-of-truth) and the SREL `oneOf` branch's `trigger.enum` in `story-event.schema.json` carry the same 17-value set after the edit. Enforced by the existing `midstory-vocabulary-parity.test.ts` parity test.
3. **Audit-trail honesty.** Every SREL axis named in `.claude/skills/_shared-templates/story-record-schemas.md` §4.4b has a corresponding `_axis_becomes_relevant` trigger OR a relation-formation trigger (`alliance_forms`, `rivalry_forms`, `debt_relation_forms`, `authority_relation_forms`). After this ticket, the only axes without an `_axis_becomes_relevant` trigger are those whose lawful introduction reason is already covered by a relation-formation trigger.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — extended with 10 new positive-coverage checks, one per new trigger value, proving compiled schema acceptance through `record_schema_compliance`.
2. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` — added a positive relationship-grounding test for a new trigger + matching axis pair.
3. `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` — no change required; the existing test fires on any utility-vs-schema drift and continues to do so after the patch.

### Commands

1. **Build:** `cd tools/validators && npm run build`
2. **Targeted (parity):** `cd tools/validators && node --test dist/tests/structural/midstory-vocabulary-parity.test.js`
3. **Targeted (schema compliance):** `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-event.test.js`
4. **Targeted (SREL introduction):** `cd tools/validators && node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js`
5. **Full suite:** `cd tools/validators && npm test`
6. **Post-build historical sandbox smoke:** prepare a sandbox `red-bunny-pg5` envelope with a restored SREL-7 + matching `record_introductions[]` entry; recompute hashes; validate via `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/red-bunny-pg5-page-plan-drafts.json <sandbox-envelope>`; expect the owned validators to pass even though the full already-committed historical envelope fails append-only/id-allocation checks.

## Outcome

Completed on 2026-05-26. `MIDSTORY_TRIGGERS_BY_CLASS.SREL`, the SREL branch of `story-event.schema.json`, and the shared §5a SREL Triggers table now expose 17 SREL triggers, including the 10 missing axis-relevance triggers for `fear`, `desire`, `loyalty`, `resentment`, `power_imbalance`, `attention`, `familiarity`, `approval`, `respect`, and `obligation`.

Added compiled schema-compliance coverage for all 10 new trigger values and relationship-grounding coverage for `attention_axis_becomes_relevant` paired with `axis: attention`.

## Verification Result

Pre-edit baseline:

- `cd tools/validators && npm test` — PASS, 1075/1075 tests passed before source edits.

Post-edit verification:

- `cd tools/validators && npm run build` — PASS.
- `cd tools/validators && node --test dist/tests/structural/midstory-vocabulary-parity.test.js` — PASS, 1/1 test passed.
- `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-event.test.js` — PASS, 20/20 tests passed.
- `cd tools/validators && node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js` — PASS, 12/12 tests passed.
- `grep -c "axis_becomes_relevant" tools/validators/src/structural/midstory-introduction-utils.ts` — PASS, returned `13`.
- `grep -c "axis_becomes_relevant" tools/validators/src/schemas/story-event.schema.json` — PASS, returned `13`.
- `grep -c '^|.*axis_becomes_relevant' .claude/skills/_shared-templates/story-state-contract.md` — PASS, returned `13`.
- Compiled `describeEnvelopeSchema({ op_kind: "create_se_record" })` probe — PASS, returned 17 SREL trigger enum values including all 10 new values.
- `cd tools/validators && npm test` — PASS, 1077/1077 tests passed after source edits.
- Historical sandbox smoke using `/tmp/red-bunny-pg5-valenh-052-smoke.json` — PARTIAL/EXPECTED CURRENT-STATE FAIL: `record_schema_compliance`, `relationship_introduction_grounding_integrity`, and `midstory_record_introduction_grounding` passed with `attention_axis_becomes_relevant`; the full envelope failed `no_story_state_in_place_mutation` and `id_allocation_race` because PG-5 and the sibling records already exist in the checkout.

## Deviations

- The drafted proof plan said `relationship-introduction-grounding-integrity.test.ts` alone would prove AJV schema acceptance. Reassessment corrected this: `record-schema-compliance-story-event.test.ts` is the schema-compiler proof, while `relationship-introduction-grounding-integrity.test.ts` proves relationship-grounding behavior for a new trigger/axis pair.
- The drafted sandbox smoke expected the historical red-bunny PG-5 envelope to pass end-to-end. That is no longer truthful after PG-5 was committed: the historical replay now correctly fails append-only and ID-allocation guards. The owned validator signals passed, so no world-content repair or direct `_source/` edit was performed.
