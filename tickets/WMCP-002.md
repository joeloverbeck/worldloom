# WMCP-002: Extend `mcp__worldloom__get_canonical_vocabulary` to cover all documented enum classes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extend `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` and the typed `class` enum
**Deps**: None

## Problem

`canon-addition/SKILL.md` Procedure step 1 instructs the operator to "look up canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, and `revision_difficulty` so values are validated at reasoning time, eliminating post-write vocabulary-drift fails." The deployed tool's `class` parameter only accepts four of these nine: `domain | verdict | mystery_status | mystery_resolution_safety` (verified via tool-schema introspection during the canon-addition session that produced PA-0001).

When the operator needs to validate an `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, or `revision_difficulty` value at reasoning time, the tool returns an `InputValidationError`. The operator must fall back to reading source files directly (e.g., `tools/world-index/src/public/canonical-vocabularies.ts`, `tools/world-index/src/schema/types.ts`) — slower than the canonical lookup the skill prose promises, and prone to drift if the operator forgets and just hand-writes the value. The canon-addition session encountered this gap when validating `change_type: addition` for CH-0002 and `category: ontological / causal / distribution / social / aesthetic_thematic` for the ONT-2 extension's reference-context.

## Assumption Reassessment (2026-05-01)

1. The current tool definition (`tools/world-mcp/src/tools/get-canonical-vocabulary.ts` plus its registration in `tools/world-mcp/src/server.ts`) constrains `class` to a 4-member enum: `domain | verdict | mystery_status | mystery_resolution_safety`. The canonical-vocabularies module under `tools/world-index/src/public/canonical-vocabularies.ts` already exports more vocabularies than these four (notably `INVARIANT_CATEGORIES`, `CHANGE_TYPES`, `REVISION_DIFFICULTIES`, `ENTITY_KINDS`, `SEC_FILE_CLASSES`), so the data exists; only the MCP-tool surface is gated.
2. Specs / docs reference: `canon-addition/SKILL.md` Procedure step 1 enumerates all nine vocabulary classes the tool should support. `canon-addition/references/retrieval-tool-tree.md` §Pre-flight cites `mcp__worldloom__get_canonical_vocabulary({class})` without enumerating the supported classes; the skill-prose enumeration in SKILL.md is the authoritative list.
3. Cross-skill shared boundary: the tool is consumed by canon-addition, create-base-world, and any future skill that constructs structured records (character-generation, diegetic-artifact-generation, propose-new-canon-facts). Adding classes is additive; no consumer regression.
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 2 ("Retrieval MCP Server — structured read API over the world index"). The vocabulary tool is the canonical retrieval surface for enum values; gating it to a subset undermines the "structured read API" promise.
6. Schema extension shape: additive — adds 5 new `class` values to the existing enum. Existing callers using the original 4 values are unaffected. No CF / CH / proposal / dossier / artifact schema changes.
7. Adjacent contradictions: none. Sibling WMCP-001 and WMCP-003 cover separate tools.

## Architecture Check

1. Centralizing vocabulary lookup at the MCP layer is cleaner than letting each skill operator re-discover the source-of-truth files; vocabulary changes (new ENT kind, new SEC file class, new change_type) propagate via a single tool surface.
2. No backwards-compatibility aliasing/shims introduced; the `class` enum is extended additively.

## Verification Layers

1. Tool accepts all nine documented `class` values -> codebase grep-proof: `grep -n "INVARIANT_CATEGORIES\|CHANGE_TYPES\|REVISION_DIFFICULTIES\|ENTITY_KINDS\|SEC_FILE_CLASSES" tools/world-mcp/src/tools/get-canonical-vocabulary.ts`.
2. Tool returns correct enum members for each new class -> manual MCP call dry-run for each: `mcp__worldloom__get_canonical_vocabulary({class: 'invariant_category'})` returns `["ontological", "causal", "distribution", "social", "aesthetic_thematic"]`; similar for the other four new classes.
3. Existing four classes still work -> regression check via the same call shape on `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`.

## What to Change

### 1. Extend `class` parameter enum

Update `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (and the registered input schema in `server.ts`) to add `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty` to the `class` enum.

### 2. Wire each new class to its source-of-truth export

For each new `class` value, the handler returns the corresponding exported tuple from `tools/world-index/src/public/canonical-vocabularies.ts`:

- `invariant_category` → `INVARIANT_CATEGORIES`
- `entity_kind` → `ENTITY_KINDS`
- `sec_file_class` → `SEC_FILE_CLASSES`
- `change_type` → `CHANGE_TYPES`
- `revision_difficulty` → `REVISION_DIFFICULTIES`

If any of these vocabularies have associated coupling rules (parallel to `mystery_resolution_safety`'s `coupling.field/rule` pair), include them in the response.

### 3. No skill-prose change

`canon-addition/SKILL.md` already enumerates all nine classes correctly; no skill edit is required after this ticket lands.

## Files to Touch

- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify — extend the registered input schema)
- `tools/world-index/src/public/canonical-vocabularies.ts` (modify only if any of the five vocabularies are not yet exported there; verify before editing)

## Out of Scope

- Adding new vocabulary values (this ticket exposes existing values via the MCP tool; it does not extend the underlying enums).
- Implementing `describe_envelope_schema` (sibling ticket WMCP-001).
- Implementing `get_record_schema` (sibling ticket WMCP-003).

## Acceptance Criteria

### Tests That Must Pass

1. Each of the five new `class` values returns a non-empty `canonical_values[]` array on dry-run MCP call.
2. The four pre-existing `class` values still return their previous outputs unchanged.
3. Calling the tool with an unsupported `class` value returns `InputValidationError` (existing behavior preserved).

### Invariants

1. The `class` enum exposed by the tool is a strict superset of the previous one; no value is removed or renamed.
2. The values returned for each `class` match the source-of-truth tuple in `tools/world-index/src/public/canonical-vocabularies.ts` byte-for-byte; no manual mirroring.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/get-canonical-vocabulary.test.ts` (modify) — extend with cases for the five new `class` values; assert each returns the exported tuple.

### Commands

1. `pnpm --filter @worldloom/world-mcp test`.
2. Dry-run MCP calls: `mcp__worldloom__get_canonical_vocabulary({class: 'invariant_category'})` etc., one per new class.
