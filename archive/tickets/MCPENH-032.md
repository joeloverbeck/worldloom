# MCPENH-032: `get_canonical_vocabulary` — expose `mystery_reserve_effect` (CH `scope.mystery_reserve_effect` enum)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`; documentation updates in same-seam MCP docs and canon-pipeline skills
**Deps**: archive/tickets/MCPENH-008-expand-canonical-vocabulary-classes.md

## Problem

At intake, the CH (change-log-entry) record's `scope.mystery_reserve_effect` field had a four-value enum defined in `tools/validators/src/schemas/change-log-entry.schema.json`: `"unchanged"`, `"expands"`, `"narrows"`, `"narrows_via_firewalls_and_expands_via_new_entries"`. The `record_schema_compliance` validator enforced this enum at patch-plan-validate time.

Before this ticket, this enum was not exposed via `mcp__worldloom__get_canonical_vocabulary`. The tool exposed ten classes — `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty`, `cf_type` — and `mystery_reserve_effect` was absent from the registered enum set in `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`.

Operators following canon-addition's pre-flight discipline ("Look up canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_status`, ..., and `cf_type` so values are validated at reasoning time, eliminating post-write vocabulary-drift fails") may extrapolate `mystery_reserve_effect` from the `change_type` vocabulary patterns. When the extrapolation is wrong, the patch plan fails validation post-construction with `record_schema_compliance.enum: must be equal to one of the allowed values`. Recovery requires falling through to `mcp__worldloom__describe_envelope_schema()` to retrieve the change-log-entry schema and reading its `scope.mystery_reserve_effect.enum` array — a workaround path canon-addition's pre-flight does not name.

This is a follow-up to MCPENH-008 (expand-canonical-vocabulary-classes) which expanded the canonical class set during the SPEC-09 / SPEC-13 era but did not include `mystery_reserve_effect`. Whether the omission was deliberate scope-narrowing (e.g., "sub-field enums on CH-record scope blocks are not first-class vocabulary") or oversight is for the implementer to confirm; the gap surfaces in operator pipelines today.

## Assumption Reassessment (2026-05-04)

1. Verified at intake: `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` registered exactly ten enum classes via `VOCABULARY_CLASSES` and the `class` switch. No `mystery_reserve_effect` branch existed.
2. Verified against `tools/validators/src/schemas/change-log-entry.schema.json`: the `scope.mystery_reserve_effect.enum` field carries the four canonical values (`unchanged` / `expands` / `narrows` / `narrows_via_firewalls_and_expands_via_new_entries`). The schema is the source of truth; the new vocabulary export should derive from it.
3. Cross-skill / cross-artifact boundary: this ticket touches the canonical-vocabulary contract that canon-addition's pre-flight (Procedure step 1) consumes. Other canon-pipeline-adjacent skills (continuity-audit, canon-facts-from-diegetic-artifacts, story-fact-promotion-to-canon) that emit CH records or evaluate CH `scope.mystery_reserve_effect` semantics also benefit; verify their pre-flight enumerations and update if they cite the canonical-vocabulary class list verbatim.
4. Schema extension scope: this ticket extends `get_canonical_vocabulary`'s `class` parameter enum from ten values to eleven (adding `mystery_reserve_effect`); the extension is additive-only (existing callers querying any of the ten existing classes are unaffected; new callers can query the eleventh). No breaking changes to consumers.
5. Per Rule 6 retcon attribution: the pre-ticket behavior was "ten canonical vocabulary classes, sub-field enums like `mystery_reserve_effect` only discoverable via `describe_envelope_schema`." The implemented behavior is "eleven canonical vocabulary classes, including `mystery_reserve_effect` as a first-class queryable enum." The change is warranted because the canon-addition session this audit examines surfaced the gap as a validation-cycle cost (one validate-fail-and-retry round-trip per occurrence of the gap), and because there is no principled reason to scope `mystery_reserve_effect` differently from `change_type` (both are CH-record fields constrained by the change-log-entry schema; both should be queryable via the same canonical surface).
6. Reassessment correction: there is no `tools/world-mcp/src/tools/get-canonical-vocabulary.input.schema.json` file. The input-schema enum is supplied through `VOCABULARY_CLASSES` in `tools/world-mcp/src/server.ts` and is covered by `tools/world-mcp/tests/server/dispatch.test.ts`.
7. Source-of-truth correction: the implemented `mystery_reserve_effect` values are read from `tools/validators/src/schemas/change-log-entry.schema.json` at runtime by the MCP handler, rather than copied into a new shared-enum module. This keeps the JSON schema as the single source for this nested CH-scope enum.

## Architecture Check

1. The cleanest implementation imports the `mystery_reserve_effect` enum array from the same source-of-truth point the schema reads from (or derives from the schema itself), then registers a new branch in `get_canonical_vocabulary`'s class switch. Alternative: ship a separate `get_record_schema_field_vocabulary` tool that handles all sub-field enums generically — rejected because it fragments the operator pattern. The canon-addition pre-flight consumes a single tool surface today; the change should preserve that single surface.
2. No backwards-compatibility shims. Operators querying any of the existing ten classes see no behavior change.

## Verification Layers

1. New `class: "mystery_reserve_effect"` query → package-local compiled handler proof: `getCanonicalVocabulary({class: "mystery_reserve_effect"})` returns `{canonical_values: ["unchanged", "expands", "narrows", "narrows_via_firewalls_and_expands_via_new_entries"]}`.
2. Schema-source alignment → codebase grep-proof: the returned array matches `tools/validators/src/schemas/change-log-entry.schema.json`'s `scope.mystery_reserve_effect.enum` exactly (no drift).
3. Tool-registration surface → schema validation: the `class` parameter's accepted-value enum on the tool's input schema lists `mystery_reserve_effect` (so MCP clients can introspect the available classes).
4. Canon-addition pre-flight integration → grep/manual-review proof: revoke the post-edit note in `.claude/skills/canon-addition/SKILL.md` (Procedure step 1) that points operators to `describe_envelope_schema` for `mystery_reserve_effect`, replacing it with a reference to the `get_canonical_vocabulary` class. Full canon-addition dry-run is out of scope because it would enter a canon-mutating HARD-GATE workflow; package-local handler proof covers queryability.

## What to Change

### 1. `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` — register the new class

Add a `mystery_reserve_effect` class and a new `case "mystery_reserve_effect"` branch. The branch reads `scope.mystery_reserve_effect.enum` from `tools/validators/src/schemas/change-log-entry.schema.json` and returns those values as `canonical_values`.

Update the `VocabularyClass` type to include `"mystery_reserve_effect"` so the input-schema's class enum is exhaustive.

### 2. Tool input-schema enum extension

Add `"mystery_reserve_effect"` to `VOCABULARY_CLASSES` so the MCP input schema and `describe_capabilities` enum inventory advertise the new class at handshake time.

### 3. Source-of-truth shared constant

Because the four-value enum is defined only in the JSON schema, have the vocabulary tool read the enum from the JSON schema at runtime. This avoids a second hand-authored copy of the nested enum.

### 4. `.claude/skills/canon-addition/SKILL.md` — remove the workaround note

The Procedure step 1 currently carries the post-edit note "The CH record's `scope.mystery_reserve_effect` enum is NOT exposed via `get_canonical_vocabulary`; query `mcp__worldloom__describe_envelope_schema()` for the change-log-entry schema to retrieve allowed values..." Remove this note (it was added during the canon-addition audit cycle that surfaced this gap as MCPENH-032) and instead extend the vocabulary class list in the same sentence to include `mystery_reserve_effect`.

### 5. Other consumer-side updates

Grep `.claude/skills/*/SKILL.md` and `.claude/skills/*/references/*.md` for citations of the canonical-vocabulary class list; update any that enumerate the ten classes verbatim to include `mystery_reserve_effect`.

## Files to Touch

- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify) — register new class.
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (modify) — add query and schema-parity coverage for the eleventh class.
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify) — extend pre-flight vocabulary list.
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify) — extend constrained-field vocabulary list.
- `.claude/skills/create-base-world/SKILL.md` (modify) — extend genesis pre-flight vocabulary list.
- `.claude/skills/continuity-audit/SKILL.md` (modify) — extend audit pre-flight vocabulary list.
- `docs/MACHINE-FACING-LAYER.md` (modify) — list the eleventh class.
- `tools/world-mcp/README.md` (modify) — list the eleventh class.
- `.claude/skills/canon-addition/SKILL.md` (modify) — remove workaround note in Procedure step 1; extend vocabulary class list.

## Out of Scope

- Adding other CH-record sub-field enums to `get_canonical_vocabulary` (e.g., `scope.local_or_global` is two-valued; would benefit from same exposure but is a different finding). If the implementer wants to scope this ticket more broadly, they may, but the present session evidence is specific to `mystery_reserve_effect`.
- Restructuring `get_canonical_vocabulary` to discover sub-field enums automatically by traversing the JSON schemas. Out of scope as a generalization; this ticket is targeted.
- Changes to `record_schema_compliance` validator behavior — already correct; this ticket only widens the discoverability surface.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local compiled handler proof shows `getCanonicalVocabulary({class: "mystery_reserve_effect"})` returns `{canonical_values: ["unchanged", "expands", "narrows", "narrows_via_firewalls_and_expands_via_new_entries"]}` (order is the canonical order from the JSON schema).
2. The tool's input-schema's `class` enum includes `mystery_reserve_effect` (introspection-discoverable through the `VOCABULARY_CLASSES` / `describe_capabilities` path).
3. The vocabulary array exactly matches `tools/validators/src/schemas/change-log-entry.schema.json`'s `scope.mystery_reserve_effect.enum` (no drift; schema is the source of truth).
4. Pipeline-wide docs/skills no longer instruct operators to fall through to `describe_envelope_schema` for `mystery_reserve_effect`; the canon-addition pre-flight names `mystery_reserve_effect` in `get_canonical_vocabulary`.

### Invariants

1. The `get_canonical_vocabulary` tool's class enumeration matches every record-schema field that has a constrained vocabulary AND that operators reason over at construction time. (This invariant motivates the present ticket; future schema additions follow the same convention.)
2. The four-value enum's source of truth is defined exactly once in the codebase; both the JSON schema and the canonical-vocabulary tool derive from that single source.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — extend the existing test suite to cover the eleventh class and verify it matches `tools/validators/src/schemas/change-log-entry.schema.json`.

### Commands

1. `cd tools/world-mcp && npm test -- --test-name-pattern getCanonicalVocabulary` — package-local build plus targeted test-name proof. The package script still runs the compiled package test lane.
2. `cd tools/world-mcp && node -e "<compiled handler probe>"` — verifies the built handler returns `mystery_reserve_effect` and that `VOCABULARY_CLASSES` includes it.

## Outcome

Implemented `mystery_reserve_effect` as the eleventh `get_canonical_vocabulary` class. `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` now includes the class in `VOCABULARY_CLASSES`, advertises it through the existing server metadata path, and returns the enum by reading `tools/validators/src/schemas/change-log-entry.schema.json`'s `scope.mystery_reserve_effect.enum`.

Updated the MCP package README, `docs/MACHINE-FACING-LAYER.md`, canon-addition pre-flight prose, canon-addition reference docs, create-base-world pre-flight prose, and continuity-audit pre-flight prose so same-seam operator instructions no longer route `mystery_reserve_effect` through `describe_envelope_schema`.

## Verification Result

1. `cd tools/world-mcp && npm test -- --test-name-pattern getCanonicalVocabulary` — pass; the package built successfully and the compiled test lane passed with 330 tests passing. The new test asserts `mystery_reserve_effect` returns `["unchanged", "expands", "narrows", "narrows_via_firewalls_and_expands_via_new_entries"]` and matches the change-log-entry schema enum.
2. `cd tools/world-mcp && node -e "const { getCanonicalVocabulary, VOCABULARY_CLASSES } = require('./dist/src/tools/get-canonical-vocabulary.js'); Promise.all(['mystery_reserve_effect'].map(async (c) => [c, (await getCanonicalVocabulary({class: c})).canonical_values])).then((rows) => console.log(JSON.stringify({classes: VOCABULARY_CLASSES, rows})))"` — pass; output included `mystery_reserve_effect` in `VOCABULARY_CLASSES` and returned the four schema values in canonical order.
3. `rg -n 'NOT exposed via `get_canonical_vocabulary`|NOT exposed via get_canonical_vocabulary|mystery_reserve_effect.*describe_envelope_schema|describe_envelope_schema.*mystery_reserve_effect' .claude/skills docs tools/world-mcp tools/validators tickets/MCPENH-032.md` — pass for live surfaces; remaining hits are historicalized ticket/problem text.

Ignored/generated artifact state: `tools/world-mcp/dist/` was refreshed by `npm test`; `tools/world-mcp/node_modules/`, `tools/world-mcp/.secret`, `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/validators/dist/`, and `tools/validators/node_modules/` were already present ignored artifacts before verification.

## Deviations

Direct external `mcp__worldloom__get_canonical_vocabulary({class: "mystery_reserve_effect"})` invocation is not exposed as a callable Codex tool in this session. The accepted proof uses the package-local compiled test lane plus a compiled handler probe after build.

The drafted `tools/world-mcp/src/tools/get-canonical-vocabulary.input.schema.json` file does not exist; the input enum is generated from `VOCABULARY_CLASSES` through `tools/world-mcp/src/server.ts` and covered by existing dispatch/capability tests.

No separate shared-enum TypeScript module was added for `mystery_reserve_effect`; the handler reads the existing JSON schema enum so the nested CH-scope enum remains authored once.
