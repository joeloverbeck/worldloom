# MCPENH-032: `get_canonical_vocabulary` — expose `mystery_reserve_effect` (CH `scope.mystery_reserve_effect` enum)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`; documentation update in `.claude/skills/canon-addition/SKILL.md` (rollback of the `describe_envelope_schema` workaround note added in this session)
**Deps**: archive/tickets/MCPENH-008-expand-canonical-vocabulary-classes.md

## Problem

The CH (change-log-entry) record's `scope.mystery_reserve_effect` field has a four-value enum defined in `tools/validators/src/schemas/change-log-entry.schema.json`: `"unchanged"`, `"expands"`, `"narrows"`, `"narrows_via_firewalls_and_expands_via_new_entries"`. The `record_schema_compliance` validator enforces this enum at patch-plan-validate time.

This enum is NOT exposed via `mcp__worldloom__get_canonical_vocabulary`. The tool currently exposes ten classes — `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty`, `cf_type` — and `mystery_reserve_effect` is absent from the registered enum set in `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`.

Operators following canon-addition's pre-flight discipline ("Look up canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_status`, ..., and `cf_type` so values are validated at reasoning time, eliminating post-write vocabulary-drift fails") may extrapolate `mystery_reserve_effect` from the `change_type` vocabulary patterns. When the extrapolation is wrong, the patch plan fails validation post-construction with `record_schema_compliance.enum: must be equal to one of the allowed values`. Recovery requires falling through to `mcp__worldloom__describe_envelope_schema()` to retrieve the change-log-entry schema and reading its `scope.mystery_reserve_effect.enum` array — a workaround path canon-addition's pre-flight does not name.

This is a follow-up to MCPENH-008 (expand-canonical-vocabulary-classes) which expanded the canonical class set during the SPEC-09 / SPEC-13 era but did not include `mystery_reserve_effect`. Whether the omission was deliberate scope-narrowing (e.g., "sub-field enums on CH-record scope blocks are not first-class vocabulary") or oversight is for the implementer to confirm; the gap surfaces in operator pipelines today.

## Assumption Reassessment (2026-05-04)

1. Verified at HEAD: `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` registers exactly ten enum classes via the `class` switch (`grep -nE "canonical_values|return.*ENUM|return.*VALUES" tools/world-mcp/src/tools/get-canonical-vocabulary.ts` shows return statements for `CANONICAL_DOMAINS`, `VERDICT_ENUM`, `MYSTERY_STATUS_ENUM`, `MYSTERY_RESOLUTION_SAFETY_ENUM`, `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, `REVISION_DIFFICULTY_VALUES`, `CF_TYPE_VALUES`). No `MYSTERY_RESERVE_EFFECT` constant is exported, imported, or referenced.
2. Verified against `tools/validators/src/schemas/change-log-entry.schema.json`: the `scope.mystery_reserve_effect.enum` field carries the four canonical values (`unchanged` / `expands` / `narrows` / `narrows_via_firewalls_and_expands_via_new_entries`). The schema is the source of truth; the new vocabulary export should derive from it.
3. Cross-skill / cross-artifact boundary: this ticket touches the canonical-vocabulary contract that canon-addition's pre-flight (Procedure step 1) consumes. Other canon-pipeline-adjacent skills (continuity-audit, canon-facts-from-diegetic-artifacts, story-fact-promotion-to-canon) that emit CH records or evaluate CH `scope.mystery_reserve_effect` semantics also benefit; verify their pre-flight enumerations and update if they cite the canonical-vocabulary class list verbatim.
4. Schema extension scope: this ticket extends `get_canonical_vocabulary`'s `class` parameter enum from ten values to eleven (adding `mystery_reserve_effect`); the extension is additive-only (existing callers querying any of the ten existing classes are unaffected; new callers can query the eleventh). No breaking changes to consumers.
5. Per Rule 6 retcon attribution: the existing behavior is "ten canonical vocabulary classes, sub-field enums like `mystery_reserve_effect` only discoverable via `describe_envelope_schema`." The new behavior is "eleven canonical vocabulary classes, including `mystery_reserve_effect` as a first-class queryable enum." The change is warranted because the canon-addition session this audit examines surfaced the gap as a validation-cycle cost (one validate-fail-and-retry round-trip per occurrence of the gap), and because there is no principled reason to scope `mystery_reserve_effect` differently from `change_type` (both are CH-record fields constrained by the change-log-entry schema; both should be queryable via the same canonical surface).

## Architecture Check

1. The cleanest implementation imports the `mystery_reserve_effect` enum array from the same source-of-truth point the schema reads from (or derives from the schema itself), then registers a new branch in `get_canonical_vocabulary`'s class switch. Alternative: ship a separate `get_record_schema_field_vocabulary` tool that handles all sub-field enums generically — rejected because it fragments the operator pattern. The canon-addition pre-flight consumes a single tool surface today; the change should preserve that single surface.
2. No backwards-compatibility shims. Operators querying any of the existing ten classes see no behavior change.

## Verification Layers

1. New `class: "mystery_reserve_effect"` query → schema validation: `mcp__worldloom__get_canonical_vocabulary({class: "mystery_reserve_effect"})` returns `{canonical_values: ["unchanged", "expands", "narrows", "narrows_via_firewalls_and_expands_via_new_entries"]}`.
2. Schema-source alignment → codebase grep-proof: the returned array matches `tools/validators/src/schemas/change-log-entry.schema.json`'s `scope.mystery_reserve_effect.enum` exactly (no drift).
3. Tool-registration surface → schema validation: the `class` parameter's accepted-value enum on the tool's input schema lists `mystery_reserve_effect` (so MCP clients can introspect the available classes).
4. Canon-addition pre-flight integration → skill dry-run: revoke the post-edit note in `.claude/skills/canon-addition/SKILL.md` (Procedure step 1) that points operators to `describe_envelope_schema` for `mystery_reserve_effect`, replacing it with a reference to the `get_canonical_vocabulary` class. Run a representative canon-addition pre-flight to confirm the new vocabulary class is queryable and the documentation alignment is consistent.

## What to Change

### 1. `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` — register the new class

Add a `MYSTERY_RESERVE_EFFECT_VALUES` constant (or reuse an existing shared-enum source) and a new `case "mystery_reserve_effect": return { canonical_values: [...MYSTERY_RESERVE_EFFECT_VALUES] };` branch in the class switch.

Update the `VocabularyClass` type to include `"mystery_reserve_effect"` so the input-schema's class enum is exhaustive.

### 2. Tool input-schema enum extension

If the tool's JSON-schema input-validation surface enumerates the accepted `class` values explicitly, add `"mystery_reserve_effect"` to that enum so MCP clients see the new class advertised at handshake time.

### 3. Source-of-truth shared constant

If the four-value enum is currently defined only in the JSON schema, extract it into a shared TypeScript constant (e.g., in a `tools/validators/src/schemas/_shared/` or `tools/world-mcp/src/shared-enums/` location) that BOTH the JSON-schema-validation path and the canonical-vocabulary path consume, so future enum changes only happen at one site. Alternative: have the vocabulary tool read the enum from the JSON schema at startup. Implementer decides per the project's existing convention for cross-tool enum sharing.

### 4. `.claude/skills/canon-addition/SKILL.md` — remove the workaround note

The Procedure step 1 currently carries the post-edit note "The CH record's `scope.mystery_reserve_effect` enum is NOT exposed via `get_canonical_vocabulary`; query `mcp__worldloom__describe_envelope_schema()` for the change-log-entry schema to retrieve allowed values..." Remove this note (it was added during the canon-addition audit cycle that surfaced this gap as MCPENH-032) and instead extend the vocabulary class list in the same sentence to include `mystery_reserve_effect`.

### 5. Other consumer-side updates

Grep `.claude/skills/*/SKILL.md` and `.claude/skills/*/references/*.md` for citations of the canonical-vocabulary class list; update any that enumerate the ten classes verbatim to include `mystery_reserve_effect`.

## Files to Touch

- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify) — register new class.
- `tools/world-mcp/src/tools/get-canonical-vocabulary.input.schema.json` (modify, if input-schema enum is enumerated explicitly) — add new value.
- `tools/world-mcp/src/shared-enums/<file>.ts` (new or modify) — shared constant for the four enum values; OR derive at startup from the JSON schema. Implementer decides.
- `tools/world-mcp/README.md` (modify) — list the eleventh class.
- `.claude/skills/canon-addition/SKILL.md` (modify) — remove workaround note in Procedure step 1; extend vocabulary class list.
- Other canon-pipeline-adjacent skill files cited by Section §What-to-Change item 5 (cross-skill ripple).

## Out of Scope

- Adding other CH-record sub-field enums to `get_canonical_vocabulary` (e.g., `scope.local_or_global` is two-valued; would benefit from same exposure but is a different finding). If the implementer wants to scope this ticket more broadly, they may, but the present session evidence is specific to `mystery_reserve_effect`.
- Restructuring `get_canonical_vocabulary` to discover sub-field enums automatically by traversing the JSON schemas. Out of scope as a generalization; this ticket is targeted.
- Changes to `record_schema_compliance` validator behavior — already correct; this ticket only widens the discoverability surface.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__get_canonical_vocabulary({class: "mystery_reserve_effect"})` returns `{canonical_values: ["unchanged", "expands", "narrows", "narrows_via_firewalls_and_expands_via_new_entries"]}` (order is the canonical order from the JSON schema).
2. The tool's input-schema's `class` enum includes `mystery_reserve_effect` (introspection-discoverable).
3. The vocabulary array exactly matches `tools/validators/src/schemas/change-log-entry.schema.json`'s `scope.mystery_reserve_effect.enum` (no drift; schema is the source of truth).
4. Pipeline-wide: a representative canon-addition Phase-13a CH-record construction queries `get_canonical_vocabulary({class: "mystery_reserve_effect"})` and successfully reasons over the four values without falling through to `describe_envelope_schema`.

### Invariants

1. The `get_canonical_vocabulary` tool's class enumeration matches every record-schema field that has a constrained vocabulary AND that operators reason over at construction time. (This invariant motivates the present ticket; future schema additions follow the same convention.)
2. The four-value enum's source of truth is defined exactly once in the codebase; both the JSON schema and the canonical-vocabulary tool derive from that single source.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/src/tools/__tests__/get-canonical-vocabulary.test.ts` — extend the existing test suite to cover the eleventh class.
2. `tools/validators/src/schemas/__tests__/change-log-entry.test.ts` — add a guard test verifying that `scope.mystery_reserve_effect.enum` matches the shared constant (drift detection).

### Commands

1. `pnpm -C tools/world-mcp test -- get-canonical-vocabulary` — targeted verification.
2. `pnpm -C tools/validators test -- change-log-entry` — drift-detection verification.
3. `pnpm test` — full pipeline test pass.
