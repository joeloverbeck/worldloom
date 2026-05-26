# VALENH-047: Enumerate allowed values inline on `record_schema_compliance.enum` verdict messages

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/record-schema-compliance.ts` (verdict-message formatter for AJV `enum`-keyword errors).
**Deps**: None.

## Problem

Before this ticket, when the `record_schema_compliance` validator rejected a record because a string field's value was not one of the schema's allowed `enum` values, the emitted verdict message read exactly `"<record_id> schema violation at <path>: must be equal to one of the allowed values"`. The allowed values themselves were absent from the human-readable message even though AJV makes them available on `error.params.allowedValues`. The author then had to grep the per-record JSON Schema at `tools/validators/src/schemas/<class>.schema.json` to discover which enum value to use — or call `mcp__worldloom__describe_envelope_schema(op_kind='create_<class>_record')` to surface the enum from the inline schema body.

At intake, during the `branching-story-turn-cycle` exercise that just landed PG-4 for the red-bunny bundle, this friction recurred twice in a single `validate-patch-plan` dry-run cycle: (a) `SE-4.commitment.selection_source` was drafted as `"write_in"` (mirroring the `turn_driver.kind: player_write_in` value) — the schema's enum allows `[emitted_choice, author_pool, runtime_jit, npc_initiative, offstage_initiative, clock_fire, world_pressure, secret_reveal, system_repair, audit_repair, none]` only; (b) `STEMO-8.behavioral_pressure[3]` was drafted as `"offer_help"` — the schema's enum allows `[approach, flee, freeze, attack, reject, dominate, submit, seek_contact, protect_other, seek_help, confess, conceal, withdraw_socially, plan, accommodate, self_soothe, ruminate, collapse]` only. Each failure required the author to switch context to a JSON-schema grep before the next draft cycle.

The error params already carried the allowed values; the landed change appends them to the message string as a pure-presentation change so authors can self-correct from the verdict alone, without a second tool call.

## Assumption Reassessment (2026-05-26)

1. **Current implementation**. `tools/validators/src/structural/record-schema-compliance.ts:141-169` defines `schemaVerdicts(record, errors)`, which maps each AJV `ErrorObject` to a verdict via the existing `record_schema_compliance.<keyword>` code path and now delegates the AJV message segment to `formatSchemaErrorMessage(error)`. Grep confirmed this was the sole construction path for AJV-derived verdicts in this file before implementation (the `customSchemaVerdict` helper builds non-AJV verdicts and remains out of scope). No other validator emits `record_schema_compliance.<keyword>` verdicts.

2. **Current docs / shared-template state**. `tickets/_TEMPLATE.md` and `tickets/README.md` are the authoring contract for this ticket — both at HEAD. The branching-story-turn-cycle skill that surfaced the friction has the canonical schema-discovery callout (`mcp__worldloom__describe_envelope_schema`) at Phase 10 step 1 (`.claude/skills/branching-story-turn-cycle/SKILL.md`) — that callout remains the canonical discoverability surface for op shapes and is not in scope for this ticket.

3. **Shared boundary under audit**. The verdict-message contract between (a) the validator (`record_schema_compliance` rule in `tools/validators/src/structural/record-schema-compliance.ts`) and (b) every consumer that displays verdict messages to operators — CLI output from `tools/world-mcp/dist/src/cli/validate-patch-plan.js` and `submit-patch-plan.js`, and the MCP-tool JSON shape returned by `mcp__worldloom__validate_patch_plan` / `submit_patch_plan`. Structured fields (`validator`, `severity`, `code`, `location`) remain unchanged. The change is additive on the human-readable `message` string only — consumers parsing `code` / `severity` / `location` are unaffected; consumers parsing `message` see strictly more information.

4. **HARD-GATE-facing signal classification**. `record_schema_compliance` participates in `pre-apply` validation through validate/submit patch-plan flows, so `docs/HARD-GATE-DISCIPLINE.md` was read before source edits. The landed change does not weaken the gate, downgrade severity, change validator selection, change approval-token behavior, or alter structured verdict fields; it only appends AJV `params.allowedValues` to enum messages when present.

5. **Package baseline**. Pre-edit `cd tools/validators && npm test` passed (1053 tests, 0 failures), so the package-local acceptance gate was green before the presentation-only change.

6. **Package user-facing surfaces**. `tools/validators/README.md` documents the generic `Verdict` schema and validator inventory but does not specify per-keyword AJV message text, so no README/docs change was needed. The same-seam consumer contract remains the emitted `message` text from `schemaVerdicts`.

## Architecture Check

1. The fix is local to the verdict-message formatter — a single conditional at the existing `schemaVerdicts` map step: when `error.keyword === "enum"`, append a formatted suffix derived from `error.params?.allowedValues`. No new module, no API surface, no schema field. The alternative ("rely on `describe_envelope_schema` or schema grep" — the current state) leaves a recurring author-side friction the validator output is positioned to remove for zero ongoing cost. Author tooling improvements that live in operator-prose rather than validator output regress every time the prose drifts; an inline message change is self-maintaining.
2. No backwards-compatibility aliasing/shims. The verdict shape is unchanged; consumers parsing `code` continue to receive `"record_schema_compliance.enum"` exactly as before. The `message` string gains a trailing `" (allowed: [val1, val2, ...])"` segment when the keyword is `enum`; non-enum keywords retain their existing message form. No version flag, no opt-in toggle — the new format is the new default.

## Verification Layers

1. **Invariant: enum-violation verdict message includes the allowed values inline** → validator unit test in `tools/validators/tests/structural/record-schema-compliance.test.ts` asserts that a fixture record with an unrecognized enum value produces a verdict whose `message` literally contains the formatted allowed-values list.
2. **Invariant: non-enum verdict messages are unchanged** → validator unit test asserts that violations under other keywords (`required`, `type`, `pattern`, `additionalProperties`) emit messages identical to the pre-change format.
3. **Invariant: structured verdict fields (`code`, `severity`, `location`) are unchanged** → same unit test asserts the verdict object shape matches the pre-change snapshot for all four keywords above; only `message` differs.

## Landed Changes

### 1. Append `params.allowedValues` to enum-violation messages

In `tools/validators/src/structural/record-schema-compliance.ts`, `schemaVerdicts` now formats AJV messages through `formatSchemaErrorMessage(error)`. When `error.keyword === "enum"` and `error.params.allowedValues` is a non-empty array, the verdict's `message` gains ` (allowed: ${JSON.stringify(error.params.allowedValues)})`. For all other keywords the message construction is unchanged.

### 2. Cover the new format in the existing test file

`tools/validators/tests/structural/record-schema-compliance.test.ts` now asserts that an enum violation includes the allowed-values segment verbatim and that `required`, `type`, `pattern`, and `additionalProperties` violation messages retain the previous exact string format. The assertions also cover structured-field stability (`validator`, `severity`, `code`, `location`) for the sampled enum and non-enum verdicts.

## Files to Touch

- `tools/validators/src/structural/record-schema-compliance.ts` (modify) — `schemaVerdicts` enum-keyword branch
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — extend with enum-message and non-enum-message assertions

## Out of Scope

- Changing the verdict's structured fields (`code`, `severity`, `location`) for any keyword. Only the `message` string format changes, and only for `keyword: "enum"`.
- Adding allowed-value enumeration to `customSchemaVerdict` (record-class-specific verdicts emitted outside the AJV path — STQ discipline at `record-schema-compliance.ts:236` and other custom verdicts). Custom verdicts already author their own message text and decide whether to enumerate context. Future tickets may extend specific custom verdicts case-by-case.
- Touching `describe_envelope_schema` or any other schema-discovery surface. The fix is purely in the validator's verdict-emission path.
- Touching any skill prose. The `branching-story-turn-cycle` SKILL.md will continue to direct authors to `describe_envelope_schema` for proactive schema discovery; this ticket only ensures that when a draft fails validation, the rejection itself carries enough information to self-correct without a second tool call.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — the existing test suite plus the new assertions in `tools/validators/tests/structural/record-schema-compliance.test.ts` all pass.
2. The new test cases in `record-schema-compliance.test.ts` verify that an enum-keyword violation emits a verdict whose `message` field literally contains the `(allowed: ...)` segment with the schema's actual allowed-values array.
3. The new test cases verify that non-enum-keyword violations (`required`, `type`, `pattern`, `additionalProperties`) emit verdict `message` strings identical to the pre-change format (no spurious appending).

### Invariants

1. The verdict object's structured fields (`validator`, `severity`, `code`, `location`) are byte-identical to the pre-change output for every keyword.
2. The verdict's `message` field is byte-identical to the pre-change output for every keyword except `enum`; for `enum`, it gains a trailing `" (allowed: <JSON-array>)"` segment AND nothing else.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — extend with two new cases: an enum-violation case asserting the allowed-values segment appears in `message`, and a non-enum-violation case asserting `message` is unchanged. Both cases additionally assert structured-field stability against the existing snapshot.

### Commands

1. `cd tools/validators && npm test` — package-local invocation; the validators package has no root-level workspace declaration so `--workspace` / `--prefix` shapes do not resolve from the repo root.

## Outcome

Completion date: 2026-05-26.

Implemented the enum-message presentation change in `record_schema_compliance` without changing verdict severity, code, location, validator name, or schema behavior. Enum AJV violations now include the JSON-stringified allowed-value list inline; non-enum AJV messages remain byte-identical for the sampled required, additionalProperties, pattern, and type keywords.

## Verification Result

1. `cd tools/validators && npm test` — pre-edit baseline passed (1053 tests, 0 failures).
2. `cd tools/validators && npm run build` — passed after implementation.
3. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js` — focused compiled proof passed (38 tests, 0 failures).
4. `cd tools/validators && npm test` — final package suite passed (1054 tests, 0 failures).
5. Manual review confirmed `tools/validators/README.md` has no per-keyword AJV message wording to update.

Generated/ignored artifacts refreshed: `tools/validators/dist/` was rebuilt by `npm run build` / `npm test`; `tools/validators/node_modules/` was pre-existing ignored package state and left in place.

## Deviations

None. The ticket landed at the drafted package-local boundary; the only additional reassessment note is that `docs/HARD-GATE-DISCIPLINE.md` was read because this validator participates in pre-apply validation signals.
