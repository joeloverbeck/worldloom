# SPEC77SLTGROPRO-001: SLT grounding schema + utility + fixture migration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — extends `tools/validators/src/schemas/story-storylet.schema.json`; adds new utility module `tools/validators/src/structural/slt-grounding-utils.ts`; amends shared-record-schemas contract at `_shared-templates/story-record-schemas.md` §4.4; migrates inline-fixture builders and schema field-set guards across `tools/validators/tests/{integration,structural,cli,rules,schemas,fixtures}/`
**Deps**: None

## Problem

At intake, the `SLT` (commitment block) JSON Schema at `tools/validators/src/schemas/story-storylet.schema.json` accepted schema-valid blocks whose presence was justified only by *"dramatic variety"* or similar generic placeholders, which `docs/FOUNDATIONS.md` §Story Bundles §5a forbids semantically (*"a bad block says: advance Act II"*) but was not yet structurally represented. The schema also had no driver-kind compatibility surface, so storylets could not declare which `SE.turn_driver.kind` values they can serve at selection time (SPEC-76 landed the closed `turn_driver.kind` enum but storylets had no field to reference it).

SPEC-77's Slice A introduces the minimum-viable two-field `grounding` object (`compatible_turn_drivers: []` referencing the SPEC-76 8-value enum + `reason_to_exist: string` with `minLength: 16`) as a new required top-level property, plus the banned-phrase list utility that the Slice B validator will consume. Because the new field is required and SPEC-77 §7 Migration explicitly rejects backwards-compat shims, the schema change and the test-fixture migration must land atomically — any commit between them produces failing tests.

## Assumption Reassessment (2026-05-24)

1. `tools/validators/src/schemas/story-storylet.schema.json` exists at HEAD (verified during `/reassess-spec` session) with the current required-array enumerating `id, story_id, scope, title, move_family, preconditions, beats, exit_options, saliency, mystery_policy, provenance` and `additionalProperties: false` at root level. The new `grounding` entry is appended to the required-array and to `properties`; the root `additionalProperties: false` constraint requires properties-declaration before the field is acceptable.
2. SPEC-77 §3.1 specifies the `grounding` object exactly: `additionalProperties: false`, `required: [compatible_turn_drivers, reason_to_exist]`, `compatible_turn_drivers` as a `uniqueItems: true` array with `minItems: 1` and a closed 8-value enum (`player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision`), `reason_to_exist` as `type: string` with `minLength: 16`. The 8-value enum must match `archive/specs/SPEC-76-…md` §3.1's `turn_driver.kind` byte-for-byte (verified at reassess-spec time).
3. Cross-artifact boundary: this ticket spans (a) the JSON Schema source-of-truth at `tools/validators/src/schemas/`, (b) the shared-record-schemas contract at `.claude/skills/_shared-templates/story-record-schemas.md` §4.4 which is the canonical home of the SLT field-list per FOUNDATIONS §Story Bundles §5b, (c) the new banned-phrase list utility at `tools/validators/src/structural/slt-grounding-utils.ts` which the Slice B validator (SPEC77SLTGROPRO-002) will consume, and (d) the inline-fixture-builder surface across `tools/validators/tests/{integration,structural,cli,rules,fixtures}/` enumerated at SPEC-77 §6.3.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) at `docs/FOUNDATIONS.md:654-658`: every field in every story-bundle record schema must be load-bearing. Both new sub-paths are load-bearing — `compatible_turn_drivers` drives the Slice D Phase 2.1 selection filter and the Slice B validator's compatibility checks; `reason_to_exist` is structured audit-trail per §5b's "recorded audit-trail discipline" carve-out, with minLength + banned-phrase list making it functionally enforced rather than decorative. The triage at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md` slimmed the source report's 7-field grounding object down to these 2 because the other 5 (`causal_pressures`, `source_records`, `actor_binding_policy`, `stchar_axes`, `role_lanes`) duplicated existing surface and failed §5b's load-bearing test.
5. Canon Safety surface: this schema is consumed by the patch-engine's pre-apply validator framework via `record_schema_compliance.ts` at `tools/validators/src/structural/`, which blocks `create_slt_record` patches that violate the schema. The new required `grounding` field strengthens (not weakens) the pre-apply gate; no Mystery Reserve firewall surface is touched (the `mystery_policy.forbidden_resolutions[]` field on SLT records is untouched by this change).
6. Existing output schema extended: this ticket extends `story-storylet.schema.json` (an existing structured output schema). The extension is **breaking** (new required field with `additionalProperties: false` on the new object). Consumers of the schema: (a) `tools/patch-engine/src/ops/story-record-specs.ts:171` (create_slt_record op spec) consumes the schema by reference at runtime — no source change needed; (b) `tools/world-mcp/src/tools/describe-envelope-schema.ts:485` + `get-record-schema.ts:101` expose the schema via MCP by reading the JSON file — no source change needed; (c) the validator framework's `record_schema_compliance.ts` reads the schema for pre-apply validation — no source change needed; (d) inline-fixture builders in tests construct SLT records — these MUST be migrated in this ticket per SPEC-77 §6.3 (the test surface is the only inline-construction site for SLT records; no live `worlds/*/stories/*/_source/storylets/` records exist in the worktree).
7. Live reassessment widened the fixture migration within the same validators-package seam. The SPEC-77 §6.3 list names the primary `record_schema_compliance` and patch-plan fixtures, but `rg -n 'record_kind.*storylet_record|create_slt_record|storylet_record' tools/validators/tests` also finds current-contract positive storylet fixtures in `predicate-dsl-grammar-parity.test.ts`, `causal-dependency-threat-scan.test.ts`, `observer-firewall.test.ts`, `snapshot-replay-equality.test.ts`, and `slt-created-at-page-origin-consistency.test.ts`, plus helper fixtures in `branch-isolation.test.ts` and `recursive-reference-closure.test.ts`. Because `grounding` becomes a required schema field, these positive fixtures must receive valid `grounding` where they participate in schema/pre-apply/full-validator proof; intentional negative or unrelated applicability-only fixtures may stay minimal when they do not exercise `record_schema_compliance`.

## Architecture Check

1. **Why atomic schema + fixture migration**: separating the schema change from the fixture migration would either (a) require an interim phase where `grounding` is optional (violating SPEC-77 §7 Migration's fail-fast posture and SPEC-76 §7's precedent), or (b) produce a guaranteed-failing intermediate state. Atomic landing in one ticket is the only path that respects SPEC-77 §7's "no backwards-compat shims" contract.
2. **Why utility file separate from validator**: the banned-phrase list lives in `slt-grounding-utils.ts` (this ticket) rather than inside the validator file (SPEC77SLTGROPRO-002) so the test suite can import the list directly and assert against it without coupling the validator to its test surface — pattern used by `slt-grounding-utils.ts`'s sibling utilities (`alias-binding-utils.ts`, `secret-utils.ts`, `clock-utils.ts`, `story-question-utils.ts`, `stchar-utils.ts`, `stplan-utils.ts`, `stemo-utils.ts`).
3. No backwards-compatibility aliasing/shims introduced — SPEC-77 §7 Migration explicitly rejects them, and the fixture migration covers the only inline-construction surface (validator tests).

## Verification Layers

1. **Schema accepts well-formed `grounding`** → schema validation: `npm test` schema-level fixtures (§6.1) pass with `grounding: { compatible_turn_drivers: ["npc_action"], reason_to_exist: "<16+ char string>" }` on representative SLT records.
2. **Schema rejects missing `grounding` / empty `compatible_turn_drivers` / short `reason_to_exist` / unknown driver kind** → schema validation: the new schema-level negative-fixture tests at `tools/validators/tests/schemas/` (§6.1's five negative cases) fail-fast as expected.
3. **`compatible_turn_drivers` enum matches SPEC-76 byte-for-byte** → codebase grep-proof: `grep -nE "player_action|player_write_in|npc_action|offstage_action|world_pressure|clock_fire|secret_reveal|multi_actor_collision" tools/validators/src/schemas/story-{event,storylet}.schema.json` returns the same 8 values in both files.
4. **Inline-fixture builders supply `grounding` at every current-contract SLT-construction site** → codebase grep-proof: `rg -n 'storylet_record' tools/validators/tests` returns migrated positive fixtures, while intentional non-schema applicability fixtures are classified as not exercising the required field (verified by post-migration test run passing `npm test`).
5. **Shared-record-schemas contract documents the new sub-paths** → codebase grep-proof: `grep -n 'grounding\|compatible_turn_drivers\|reason_to_exist' .claude/skills/_shared-templates/story-record-schemas.md` returns the new §4.4 entries with SPEC-77 cited in the change note.
6. **FOUNDATIONS §Story Bundles §5b alignment** → FOUNDATIONS alignment check: both new sub-paths are load-bearing per §5b — `compatible_turn_drivers` consumed by Slice D filter (SPEC77SLTGROPRO-004) + Slice B validator (SPEC77SLTGROPRO-002); `reason_to_exist` enforced by Slice B validator's `slt_grounding_reason_too_short` + `slt_grounding_reason_generic` codes.

## Landed Changes

### 1. Schema change — `tools/validators/src/schemas/story-storylet.schema.json`

Appended `grounding` to the root `required` array (after `provenance`). Appended a `grounding` property to `properties` with this shape:

```json
"grounding": {
  "type": "object",
  "required": ["compatible_turn_drivers", "reason_to_exist"],
  "additionalProperties": false,
  "properties": {
    "compatible_turn_drivers": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "player_action",
          "player_write_in",
          "npc_action",
          "offstage_action",
          "world_pressure",
          "clock_fire",
          "secret_reveal",
          "multi_actor_collision"
        ]
      }
    },
    "reason_to_exist": {
      "type": "string",
      "minLength": 16
    }
  }
}
```

The `additionalProperties: false` on `grounding` is intentional per SPEC-77 §3.1 — forbids the 5 dropped fields (`causal_pressures`, `source_records`, `actor_binding_policy`, `stchar_axes`, `role_lanes`) from creeping back; a successor spec is required to add a field.

### 2. New banned-phrase list utility — `tools/validators/src/structural/slt-grounding-utils.ts`

Added a new file exporting the closed banned-phrase list as a frozen constant array so the Slice B validator and its test suite both consume the same source of truth:

```typescript
export const SLT_GROUNDING_BANNED_PHRASES: readonly string[] = Object.freeze([
  "dramatic variety",
  "good conflict",
  "advance the plot",
  "raise stakes",
  "create tension",
  "for pacing",
  "dramatic moment",
  "story beat",
  "narrative momentum"
]);

export function reasonContainsBannedPhrase(reason: string): string | null {
  const haystack = reason.toLowerCase();
  for (const phrase of SLT_GROUNDING_BANNED_PHRASES) {
    if (haystack.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}
```

The 9-entry list mirrors SPEC-77 §3.3 / §3.4 verbatim. Case-insensitive substring matching per SPEC-77 §3.4 code description.

### 3. Shared-record-schemas contract amendment — `.claude/skills/_shared-templates/story-record-schemas.md` §4.4

Appended two sub-paths to the SLT field list (at the location previously ending with `provenance.origin`):

```yaml
grounding:
  compatible_turn_drivers: [<turn-driver-kind>]*  # closed 8-value enum matching SPEC-76 turn_driver.kind byte-for-byte; minItems: 1; uniqueItems: true
  reason_to_exist: string*                        # minLength: 16; rejected by slt_grounding_minimal_integrity banned-phrase list
```

Added a change note naming SPEC-77, the two-field grounding object, and the dropped-field boundary from spec §4 Out of Scope.

### 4. Schema-level negative tests — `tools/validators/tests/schemas/`

Added `story-storylet-grounding.test.ts` covering SPEC-77 §6.1's five negative cases:
- SLT without `grounding` fails.
- SLT with `grounding.compatible_turn_drivers: []` (empty) fails.
- SLT with `grounding.compatible_turn_drivers: ["bogus_kind"]` fails.
- SLT with `grounding.reason_to_exist: "short"` (<16 chars) fails.
- SLT with `additionalProperties` under `grounding` (e.g., `grounding.causal_pressures: [...]`) fails.

Plus one positive baseline test confirming a well-formed `grounding` passes.

### 5. Inline-fixture migration — `tools/validators/tests/`

Added minimal `grounding` to every current-contract SLT-construction site required by the validators package proof. The final landed surface included the SPEC-77 §6.3 sites plus same-seam fixtures discovered during live reassessment:

- `integration/validate-patch-plan.test.ts` (lines ~845, ~928) — update `completeStoryletRecord()` factory (or equivalent helper) to supply `grounding: { compatible_turn_drivers: ["npc_action"], reason_to_exist: "Default fixture grounding for test purposes." }`.
- `integration/spec34-integration.test.ts:305`
- `integration/spec57-stchar-pipeline-integration.test.ts:77`
- `cli/world-validate.story-bundle.test.ts:88`
- `structural/chc-slt-selected-commitment-trace.test.ts:325`
- `structural/branch-isolation.test.ts:208`
- `structural/causal-dependency-threat-scan.test.ts`
- `structural/recursive-reference-closure.test.ts:113`
- `structural/observer-firewall.test.ts`
- `structural/record-schema-compliance.test.ts:904`
- `structural/slt-created-at-page-origin-consistency.test.ts`
- `structural/snapshot-replay-equality.test.ts`
- `structural/contract-schema-roundtrip.test.ts`
- `predicate-dsl-grammar-parity.test.ts`
- `rules/rule_storylet_predicate_dsl_parsability.test.ts:399`

Plus JSON fixture migration:
- `fixtures/patch-plan-complete-slt.json` — add `grounding` to the SLT record.
- `fixtures/patch-plan-missing-mystery-safety-slt.json` — add `grounding` to the SLT record.

Shared helper call sites were updated where that was the smallest current-contract fixture migration; per-test overrides remain limited to tests whose assertions depend on the grounding shape.

## Files to Touch

- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/structural/slt-grounding-utils.ts` (new)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/tests/schemas/story-storylet-grounding.test.ts` (new)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify)
- `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` (modify)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify)
- `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (modify)
- `tools/validators/tests/structural/branch-isolation.test.ts` (modify)
- `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/slt-created-at-page-origin-consistency.test.ts` (modify)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)
- `tools/validators/tests/fixtures/patch-plan-complete-slt.json` (modify)
- `tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json` (modify)

## Out of Scope

- The `slt_grounding_minimal_integrity` structural validator itself + its registry registration + its inline-fixture-builder test (covered by SPEC77SLTGROPRO-002, Slice B). This ticket lands the banned-phrase list utility the validator will consume, but not the validator.
- Commitment-block-authoring SKILL.md Phase 4 amendment (covered by `archive/tickets/SPEC77SLTGROPRO-003.md`, Slice C). This ticket lands the schema field the skill will require, but not the skill amendment.
- Turn-cycle Phase 2.1 compatible-driver filter (covered by SPEC77SLTGROPRO-004, Slice D). This ticket lands the schema field the filter will read, but not the filter prose.
- Any `worlds/*/stories/*/_source/storylets/` record migration — no live SLT records exist in the worktree per reassess-spec time enumeration; migration scope is the test surface only.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes after schema + fixture migration; specifically, the new schema-level negative tests at `tools/validators/tests/schemas/story-storylet-grounding.test.ts` exercise all 5 SPEC-77 §6.1 cases.
2. `cd tools/validators && npm run build` — TypeScript build passes; the new `slt-grounding-utils.ts` module compiles cleanly.
3. `grep -nE '"compatible_turn_drivers"' tools/validators/src/schemas/story-storylet.schema.json` returns the property declaration with the 8-value enum.
4. `grep -nE 'grounding' tools/validators/src/schemas/story-storylet.schema.json` returns the required-array entry AND the property declaration.

### Invariants

1. **Schema-minimalism preservation** — `grounding` has exactly two sub-paths (`compatible_turn_drivers` + `reason_to_exist`); `additionalProperties: false` blocks any future drift back to the 7-field source-report shape without an explicit successor spec.
2. **Enum-match with SPEC-76** — `compatible_turn_drivers` enum values match `turn_driver.kind` enum values in `story-event.schema.json` byte-for-byte (same 8 strings in the same order).
3. **Atomic landing** — no commit point in this ticket's history leaves the test suite in a broken state (schema change without fixture migration would break tests; fixture migration without schema change would be no-op).
4. **Banned-phrase list is the single source of truth** — `SLT_GROUNDING_BANNED_PHRASES` exported from `slt-grounding-utils.ts` is the only place the 9-entry list is defined; the Slice B validator (SPEC77SLTGROPRO-002) imports from it; tests import from it.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-storylet-grounding.test.ts` — new file covering SPEC-77 §6.1's 5 negative cases + 1 positive baseline; exercises JSON-Schema-level enforcement before the structural validator's diagnostic codes kick in.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — modified to populate `grounding` in the `completeStoryletRecord()` factory (or equivalent inline builder).
3. `tools/validators/tests/integration/spec34-integration.test.ts` — modified to populate `grounding` in the SLT fixture at line ~305.
4. `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` — modified to populate `grounding` in the SLT fixture at line ~77.
5. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` — modified to populate `grounding` in the storylet fixture at line ~88.
6. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` — modified to populate `grounding` in the `storyRecord("storylet_record", …)` helper call at line ~325.
7. `tools/validators/tests/structural/branch-isolation.test.ts` — modified to populate `grounding` in the `storyRecord("storylet_record", …)` helper call at line ~208.
8. `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` — modified to populate `grounding` in the SLT helper.
9. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — modified to populate `grounding` in the SLT helper call at line ~113 and branch-prefix helper.
10. `tools/validators/tests/structural/observer-firewall.test.ts` — modified to populate `grounding` in the storylet fixture helper.
11. `tools/validators/tests/structural/record-schema-compliance.test.ts` — modified to populate `grounding` in the SLT helper call at line ~904.
12. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — modified to include `grounding` in the expected field set and representative SLT fixture.
13. `tools/validators/tests/structural/slt-created-at-page-origin-consistency.test.ts` — modified to populate `grounding` in the storylet helper.
14. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — modified to populate `grounding` in the storylet fixture.
15. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` — modified to populate `grounding` in the storylet fixture.
16. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — modified to populate `grounding` in the SLT helper call at line ~399.
17. `tools/validators/tests/fixtures/patch-plan-complete-slt.json` — modified to populate `grounding` in the SLT record.
18. `tools/validators/tests/fixtures/patch-plan-missing-mystery-safety-slt.json` — modified to populate `grounding` in the SLT record.

### Commands

1. `cd tools/validators && npm test` — full validator test suite after schema + fixture migration; expected: all tests pass.
2. `cd tools/validators && npm run build` — TypeScript build passes including new `slt-grounding-utils.ts` module.

## Outcome

Completed: 2026-05-24.

Implemented SPEC-77 Slice A. `story-storylet.schema.json` now requires a two-field `grounding` object with `compatible_turn_drivers[]` and `reason_to_exist`, with `additionalProperties: false` preserving the intentionally minimal contract. Added `slt-grounding-utils.ts` as the banned-phrase list source of truth for Slice B, updated `.claude/skills/_shared-templates/story-record-schemas.md` §4.4, added schema-level grounding tests, and migrated validators-package current-contract SLT fixtures plus the schema field-set guard.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && npm test` — first sandboxed run hit `spawnSync /usr/local/bin/node EPERM` in CLI child-process tests; rerun outside the sandbox passed: 1007 tests, 1007 pass, 0 fail.
3. `node -e 'const fs=require("fs"); const e=JSON.parse(fs.readFileSync("tools/validators/src/schemas/story-event.schema.json","utf8")); const s=JSON.parse(fs.readFileSync("tools/validators/src/schemas/story-storylet.schema.json","utf8")); const a=e.properties.turn_driver.properties.kind.enum; const b=s.properties.grounding.properties.compatible_turn_drivers.items.enum; console.log(JSON.stringify({event:a, storylet:b, equal:JSON.stringify(a)===JSON.stringify(b)})); if (JSON.stringify(a)!==JSON.stringify(b)) process.exit(1);'` — passed with `equal: true`, proving byte-for-byte enum order match.
4. `rg -n 'grounding|compatible_turn_drivers|reason_to_exist' tools/validators/src/schemas/story-storylet.schema.json .claude/skills/_shared-templates/story-record-schemas.md tools/validators/src/structural/slt-grounding-utils.ts tools/validators/tests/schemas/story-storylet-grounding.test.ts` — confirmed the schema, shared contract, utility, and schema tests carry the new field names.

## Deviations

1. Live reassessment found additional same-seam validators-package storylet fixtures and the `contract-schema-roundtrip` expected-field-set guard that were not listed in the draft. They were included because the schema change is breaking and package proof requires the current positive SLT fixture surface to move atomically.
2. Some intentional applicability-only storylet fixtures remain minimal where they do not exercise `record_schema_compliance` or the required JSON Schema field set.
