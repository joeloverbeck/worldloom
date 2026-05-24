# SPEC77SLTGROPRO-002: `slt_grounding_minimal_integrity` structural validator + registry + tests

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds new structural validator under `tools/validators/src/structural/`; appends new entry to the validator framework registry at `tools/validators/src/public/registry.ts`
**Deps**: SPEC77SLTGROPRO-001

## Problem

The schema change in SPEC77SLTGROPRO-001 makes `grounding.compatible_turn_drivers` and `grounding.reason_to_exist` required on every SLT record, with `additionalProperties: false` on the `grounding` object enforced at the JSON-Schema layer. But two semantic checks cannot be expressed in JSON Schema:

1. **Reason quality** — JSON Schema can enforce `minLength: 16`, but a 16-character string consisting of *"good conflict ok"* satisfies the length gate while still failing FOUNDATIONS §Story Bundles §5a's "bad block" rejection. SPEC-77's banned-phrase list (now living at `slt-grounding-utils.ts` from SPEC77SLTGROPRO-001) catches the canonical phrasings of authorial laziness via case-insensitive substring matching.
2. **Runtime_jit singleton constraint** — a `runtime_jit`-origin SLT is created for one specific driver context, so its `compatible_turn_drivers` must be length-1. JSON Schema cannot express a conditional `maxItems` keyed on another field's value (`provenance.origin = runtime_jit`).

The Slice B structural validator implements both checks, registers with the framework run-loop, and provides unified diagnostic codes covering both schema-overlap cases (`slt_grounding_missing`, `slt_grounding_compatible_turn_drivers_empty`) and structural-only cases (the four others enumerated below).

## Assumption Reassessment (2026-05-23)

1. `tools/validators/src/public/registry.ts` exists at HEAD with the established structural-validators array shape (verified during `/reassess-spec` session — line 115's `structuralValidators` array contains 100+ entries imported from sibling files in `tools/validators/src/structural/`). The registry-registered-validator pattern is the (a) variant per `/reassess-spec` Pre-Process — registry insertion IS the consumer wiring; the framework run-loop is the validator's consumer, satisfying §3.11 New-deliverable consumer verification without name-grep enumeration.
2. SPEC-77 §3.4 specifies 6 validator codes (`slt_grounding_missing`, `slt_grounding_compatible_turn_drivers_empty`, `slt_grounding_compatible_turn_drivers_unknown`, `slt_grounding_reason_too_short`, `slt_grounding_reason_generic`, `slt_grounding_runtime_jit_driver_kind_singleton`) with severity `fail` and run modes `full-world` + `pre-apply` per existing convention. SPEC-77 §3.4 Notes (added during reassess-spec M3 edit) makes the schema-overlap diagnostic semantics explicit: both validators emit independently for the schema-level codes; framework dedupe is downstream.
3. Cross-skill boundary: this validator integrates with the `tools/validators/` framework — it follows the `Validator` interface from `tools/validators/src/framework/types.ts` (the same interface `chc-slt-selected-commitment-trace.ts`, `branch-isolation.ts`, and the 100+ sibling structural validators implement); it imports the banned-phrase list from `tools/validators/src/structural/slt-grounding-utils.ts` (introduced by SPEC77SLTGROPRO-001); it is consumed by the framework run-loop registered in `tools/validators/src/public/registry.ts`.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) + §Validation Rule 1 (No Floating Facts): the validator enforces both new sub-paths are load-bearing. `reason_to_exist`'s minLength gate + banned-phrase list operationalize §5a's "a good block says: when these conditions hold, this kind of action can happen" requirement (per `docs/FOUNDATIONS.md:648-652`). The validator forecloses the floating-storylet shape — an SLT without grounding is a floating commitment block.
5. Canon Safety surface: this validator runs in `pre-apply` mode against `create_slt_record` patches submitted via `mcp__worldloom__submit_patch_plan`. A failing diagnostic blocks the patch plan from landing in `worlds/<slug>/stories/<slug>/_source/storylets/`. The validator does NOT read Mystery Reserve entries and does not weaken the MR firewall (verified at reassess-spec time under §3.9 carve-out reasoning).

## Architecture Check

1. **Why a separate structural validator rather than extending an existing one**: the established pattern is one validator per cohesive concern (cf. `chc-slt-selected-commitment-trace.ts` for SLT/CHC trace integrity, `state-delta-class-integrity.ts` for SE delta shape, `narrative-shape-field-rejection.ts` for prohibited fields). Adding `grounding` integrity checks to `record-schema-compliance.ts` would conflate schema-shape enforcement with semantic content enforcement (banned-phrase matching). A new file at `tools/validators/src/structural/slt-grounding-minimal-integrity.ts` mirrors the established granularity.
2. **Why the banned-phrase list lives in a sibling utility module**: per SPEC-77 §3.4 Notes, `slt-grounding-utils.ts` exports the closed list so the validator AND its test suite both import from a single source of truth. This mirrors the established sibling-utility pattern (`alias-binding-utils.ts`, `secret-utils.ts`, `clock-utils.ts`, `story-question-utils.ts`, `stchar-utils.ts`, `stplan-utils.ts`, `stemo-utils.ts`).
3. **Why singleton-validator-only (no SE/PG cross-reference check) for runtime_jit driver-kind match**: per SPEC-77 §3.5's documented responsibility split, the validator enforces only length-1 at storage time; match between the stored singleton and the resolved `SE.turn_driver.kind` is enforced by the Slice D Phase 2.1 filter at selection time. Adding a cross-record validator for the match would over-couple the validator to SE/PG retrieval; the regression scenario is structurally improbable.
4. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. **Validator emits the right code for each negative case** → schema validation + skill dry-run: inline-fixture-builder negative tests at `tools/validators/tests/structural/slt-grounding-minimal-integrity.test.ts` exercise each of the 6 codes individually; positive tests confirm well-formed SLT records pass.
2. **Validator runs in `full-world` and `pre-apply` modes** → codebase grep-proof: the validator's `applies_to` predicate matches the established convention (`ctx.run_mode === "full-world" || ctx.patch_plan?.patches.some(p => p.op === "create_slt_record")`), patterned on `narrative-shape-field-rejection.ts:33-36` and other structural validators that key on create_*_record ops.
3. **Banned-phrase list is the single source of truth** → codebase grep-proof: the validator imports `SLT_GROUNDING_BANNED_PHRASES` (or `reasonContainsBannedPhrase`) from `slt-grounding-utils.ts` rather than redefining the list; the test suite imports the same symbol.
4. **Registry registration** → codebase grep-proof: `grep -n 'sltGroundingMinimalIntegrity' tools/validators/src/public/registry.ts` returns both the import line and the entry in the `structuralValidators` array.
5. **FOUNDATIONS §Story Bundles §5b alignment** → FOUNDATIONS alignment check: validator's existence operationalizes the load-bearing-fields contract for the new grounding sub-paths; banned-phrase list operationalizes §5a's bad-block rejection.

## What to Change

### 1. New structural validator — `tools/validators/src/structural/slt-grounding-minimal-integrity.ts`

New file implementing the `Validator` interface, following the established structural-validator shape (cf. `narrative-shape-field-rejection.ts`):

```typescript
import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, touchedFilesInclude } from "./utils.js";
import { SLT_GROUNDING_BANNED_PHRASES, reasonContainsBannedPhrase } from "./slt-grounding-utils.js";

const VALIDATOR = "slt_grounding_minimal_integrity";
const COVERED_NODE_TYPES = new Set(["storylet_record"]);
const KNOWN_DRIVER_KINDS = new Set([
  "player_action", "player_write_in", "npc_action", "offstage_action",
  "world_pressure", "clock_fire", "secret_reveal", "multi_actor_collision"
]);

export const sltGroundingMinimalIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some(p => p.op === "create_slt_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/storylets\/SLT-\d+\.yaml$/),
  run: async (_input, ctx) => {
    const records = await queryStructuralRecords(ctx);
    return records.flatMap(record => groundingVerdicts(record));
  }
};

function groundingVerdicts(record: IndexedRecord): Verdict[] {
  if (!COVERED_NODE_TYPES.has(record.node_type)) return [];
  const parsed = asPlainRecord(record.parsed);
  const verdicts: Verdict[] = [];
  const grounding = parsed.grounding;

  if (!grounding || typeof grounding !== "object") {
    verdicts.push(missing(record));
    return verdicts;
  }

  const drivers = (grounding as Record<string, unknown>).compatible_turn_drivers;
  if (!Array.isArray(drivers) || drivers.length === 0) {
    verdicts.push(driversEmpty(record));
  } else {
    for (const driver of drivers) {
      if (typeof driver !== "string" || !KNOWN_DRIVER_KINDS.has(driver)) {
        verdicts.push(driversUnknown(record, String(driver)));
      }
    }
  }

  const reason = (grounding as Record<string, unknown>).reason_to_exist;
  if (typeof reason === "string") {
    if (reason.length < 16) {
      verdicts.push(reasonTooShort(record, reason.length));
    } else {
      const banned = reasonContainsBannedPhrase(reason);
      if (banned) verdicts.push(reasonGeneric(record, banned));
    }
  }

  const provenance = parsed.provenance as Record<string, unknown> | undefined;
  if (provenance?.origin === "runtime_jit" && Array.isArray(drivers) && drivers.length > 1) {
    verdicts.push(runtimeJitSingleton(record, drivers.length));
  }

  return verdicts;
}

// One emitter function per code; each follows the established shape:
// {validator: VALIDATOR, severity: "fail", code: <code>, message: ..., location: locationFor(record), detail: {...}, suggested_fix: ...}
```

Per SPEC-77 §3.4, the 6 codes are:
- `slt_grounding_missing` — `grounding` field absent.
- `slt_grounding_compatible_turn_drivers_empty` — empty array.
- `slt_grounding_compatible_turn_drivers_unknown` — value not in the SPEC-76 8-value enum.
- `slt_grounding_reason_too_short` — `reason_to_exist` shorter than 16 chars.
- `slt_grounding_reason_generic` — `reason_to_exist` matches a banned phrase.
- `slt_grounding_runtime_jit_driver_kind_singleton` — `provenance.origin = runtime_jit` with `compatible_turn_drivers.length > 1`.

### 2. Registry registration — `tools/validators/src/public/registry.ts`

Append the new validator's import and registration:

```typescript
// Near the top imports block (alphabetical placement among siblings):
import { sltGroundingMinimalIntegrity } from "../structural/slt-grounding-minimal-integrity.js";

// In the structuralValidators readonly array (alphabetical or grouped placement among SLT-related validators):
sltGroundingMinimalIntegrity,
```

### 3. Structural validator tests — `tools/validators/tests/structural/slt-grounding-minimal-integrity.test.ts`

New file following the established inline-fixture-builder convention (cf. `chc-slt-selected-commitment-trace.test.ts`, `branch-isolation.test.ts`). Test cases per SPEC-77 §6.2:

**Positive cases**:
- SLT with `compatible_turn_drivers: ["npc_action", "offstage_action"]` and `reason_to_exist: "Covers offstage pursuit pressure from an active opposing actor."` passes (no verdicts emitted).
- `runtime_jit`-origin SLT with `compatible_turn_drivers: ["npc_action"]` (singleton) and a specific source-naming reason passes.

**Negative cases (one per failure code)**:
- `reason_to_exist: "Good dramatic conflict"` → `slt_grounding_reason_generic` (substring match on "good conflict" or "dramatic moment" — verify against the deployed banned-phrase list).
- `reason_to_exist: "Raise stakes before the midpoint"` → `slt_grounding_reason_generic`.
- `runtime_jit`-origin SLT with `compatible_turn_drivers: ["npc_action", "clock_fire"]` → `slt_grounding_runtime_jit_driver_kind_singleton`.
- `compatible_turn_drivers: ["narrative_beat"]` (unknown kind) → `slt_grounding_compatible_turn_drivers_unknown`.
- `compatible_turn_drivers: []` (empty) → `slt_grounding_compatible_turn_drivers_empty`.
- SLT without `grounding` field → `slt_grounding_missing` (note: this is also caught at the JSON-Schema layer per SPEC-77 §3.4 Notes — both validators emit independently for unified diagnostics).
- `reason_to_exist: "too short"` (8 chars) → `slt_grounding_reason_too_short`.

The test file should also import `SLT_GROUNDING_BANNED_PHRASES` directly from `slt-grounding-utils.ts` to assert the list contents match the spec's 9 entries, providing one canonical source-of-truth check.

## Files to Touch

- `tools/validators/src/structural/slt-grounding-minimal-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/slt-grounding-minimal-integrity.test.ts` (new)

## Out of Scope

- The `slt-grounding-utils.ts` banned-phrase list module (covered by SPEC77SLTGROPRO-001, Slice A). This ticket consumes the utility; it does not introduce it.
- The schema-level negative tests at `tools/validators/tests/schemas/` (covered by SPEC77SLTGROPRO-001). This ticket's tests exercise the structural validator's diagnostic codes; the schema-level tests exercise JSON-Schema-layer enforcement.
- Cross-SE/PG cross-record checking for runtime_jit driver-kind match (per SPEC-77 §3.5 responsibility split: the match is enforced by Slice D's Phase 2.1 filter at selection time, not by this validator at storage time).
- Schema field declaration for `grounding` (covered by SPEC77SLTGROPRO-001).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes including the new structural validator tests; specifically, `slt-grounding-minimal-integrity.test.ts` exercises all 6 SPEC-77 §3.4 codes.
2. `cd tools/validators && npm run build` — TypeScript build passes; the new validator file compiles cleanly and imports resolve.
3. `grep -n 'sltGroundingMinimalIntegrity' tools/validators/src/public/registry.ts` returns both the import line and the array entry.

### Invariants

1. **Validator-level enforcement of FOUNDATIONS §Story Bundles §5a** — banned-phrase list rejects authorial laziness patterns at validation time; the SLT's `reason_to_exist` field is functionally enforced, not decorative.
2. **Single source of truth for banned-phrase list** — `SLT_GROUNDING_BANNED_PHRASES` exported from `slt-grounding-utils.ts` is the only place the 9-entry list is defined; the validator imports from it; the test suite imports from it; the skill prose at SPEC77SLTGROPRO-003 cross-references it.
3. **Responsibility split with Slice D** — this validator enforces singleton-length on runtime_jit `compatible_turn_drivers` at storage time; the Phase 2.1 filter (SPEC77SLTGROPRO-004) enforces the singleton-value match against `SE.turn_driver.kind` at selection time.
4. **Pre-apply gate strengthens canon-write discipline** — the validator runs against `create_slt_record` patches submitted via the patch engine; failing diagnostics block the patch plan from landing.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/slt-grounding-minimal-integrity.test.ts` — new file following the inline-fixture-builder convention; covers SPEC-77 §6.2's positive cases (1 generic pattern + 1 runtime_jit) and negative cases (one per of the 6 codes), plus a banned-phrase-list source-of-truth assertion against `SLT_GROUNDING_BANNED_PHRASES`.

### Commands

1. `cd tools/validators && npm test` — full validator test suite; expected: all tests pass including the new structural validator file.
2. `cd tools/validators && npm run build` — TypeScript build passes; new validator imports resolve.
