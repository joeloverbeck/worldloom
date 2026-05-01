# WMCP-002: Validate `mcp__worldloom__get_canonical_vocabulary` covers all documented enum classes

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — validation-only closeout for the already-landed `tools/world-mcp` canonical-vocabulary expansion; strengthened wrapped MCP dispatch coverage in `tools/world-mcp/tests/server/dispatch.test.ts`
**Deps**: Archived implementation evidence: `archive/tickets/MCPENH-008-expand-canonical-vocabulary-classes.md`

## Problem

At intake, `canon-addition/SKILL.md` Procedure step 1 instructed the operator to "look up canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, and `revision_difficulty` so values are validated at reasoning time, eliminating post-write vocabulary-drift fails." The original WMCP-002 draft said the deployed tool's `class` parameter only accepted four of these nine: `domain | verdict | mystery_status | mystery_resolution_safety`.

By reassessment on 2026-05-01, the source implementation and direct handler tests for the five additional classes had already landed through archived ticket `MCPENH-008`. The remaining useful work for WMCP-002 was to verify the active checkout, strengthen the wrapped MCP boundary proof, and close the active duplicate ticket truthfully.

## Assumption Reassessment (2026-05-01)

1. The current tool definition in `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` already exports `VOCABULARY_CLASSES` with all nine documented values: `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, and `revision_difficulty`. The handler returns the five expanded classes from `tools/world-index/src/public/canonical-vocabularies.ts` via `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, and `REVISION_DIFFICULTY_VALUES`.
2. `tools/world-mcp/src/server.ts` derives `getCanonicalVocabularyInputSchema` from `VOCABULARY_CLASSES` and registers the class enum in `describe_capabilities` via `{ class: VOCABULARY_CLASSES }`. No separate `server.ts` source edit is required.
3. Cross-artifact boundary under audit: the shared MCP vocabulary contract between `tools/world-index/src/public/canonical-vocabularies.ts`, `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`, `tools/world-mcp/src/server.ts`, and skills that bind enum values at reasoning time (`canon-addition`, `create-base-world`, `continuity-audit`). The live skill and docs surfaces already name all nine classes.
4. FOUNDATIONS principle under audit: §Mandatory World Files / §Ontology Categories / §Invariants define controlled vocabularies that should be discoverable through the machine-facing retrieval layer rather than re-derived from prose during canon construction.
5. The archived implementation ticket `archive/tickets/MCPENH-008-expand-canonical-vocabulary-classes.md` already completed the source expansion, public canonical tuples, skill prose updates, README/docs updates, and direct handler tests. WMCP-002 is therefore not an independent source-implementation ticket in the current checkout.
6. Verification-surface correction: this Codex session does not expose a callable external `mcp__worldloom__get_canonical_vocabulary` tool. The truthful substitute is package-local proof: build the package, run the compiled direct handler test, run an in-memory MCP dispatch test that crosses the same wrapper/input-schema boundary, then run the package-local test suite.
7. Proof gap found during reassessment: `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` already asserted all nine classes against the shared tuples, but `tools/world-mcp/tests/server/dispatch.test.ts` only dispatched `class: "domain"` through the wrapped MCP server. This ticket adds the missing wrapped-boundary loop over every `VOCABULARY_CLASSES` value and asserts `describe_capabilities` reports the full `class` enum.
8. Dirty-worktree ledger at intake: no tracked dirty paths. Pre-existing ignored package artifacts were present under `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Architecture Check

1. Keeping the vocabulary class list centralized in `VOCABULARY_CLASSES` is the correct contract shape: the handler, server input schema, error details, and capability introspection derive from one tuple.
2. The added server dispatch test proves the wrapper/Zod/MCP boundary without adding a second hand-authored class list.
3. No backwards-compatibility aliases or shims were introduced; this is additive validation of the already-expanded enum.

## Verification Layers

1. Handler returns all nine documented classes from shared source-of-truth tuples -> `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`.
2. Wrapped MCP server accepts every registered vocabulary class and returns non-empty `canonical_values[]` -> `tools/world-mcp/tests/server/dispatch.test.ts`.
3. Runtime schema introspection reports the full `get_canonical_vocabulary.class` enum -> `tools/world-mcp/tests/server/dispatch.test.ts` `describe_capabilities` assertion.
4. User-facing docs/skills name the expanded class set -> reassessment grep/manual review of `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/create-base-world/SKILL.md`, and `.claude/skills/continuity-audit/SKILL.md`.

## What to Change

### 1. Preserve the existing source implementation

No source handler change is required. The current implementation already exposes `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, and `revision_difficulty`, sourced from `@worldloom/world-index/public/canonical-vocabularies`.

### 2. Strengthen wrapped MCP proof

Extend `tools/world-mcp/tests/server/dispatch.test.ts` so the in-memory MCP client calls `mcp__worldloom__get_canonical_vocabulary` once per `VOCABULARY_CLASSES` value and confirms each call returns a non-empty `canonical_values[]` array. Also assert `describe_capabilities` includes the full `class` enum for `get_canonical_vocabulary`.

## Files to Touch

- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — wrapped MCP boundary coverage for every vocabulary class)
- `tickets/WMCP-002.md` (modify — validation-only reassessment and closeout)

## Out of Scope

- Adding new vocabulary values.
- Reworking the already-landed handler implementation from archived `MCPENH-008`.
- Implementing `describe_envelope_schema` (sibling ticket WMCP-001, already archived).
- Implementing `get_record_schema` (sibling ticket WMCP-003).
- Direct external MCP smoke in this Codex session; package-local in-memory MCP dispatch is the accepted proof substitute.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js`.
3. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`.
4. `cd tools/world-mcp && npm test`.
5. `git diff --check`.

### Invariants

1. The `class` enum exposed by the tool remains a strict superset of the original four values; no value is removed or renamed.
2. Values returned for each `class` match the source-of-truth tuples in `tools/world-index/src/public/canonical-vocabularies.ts`; no manual mirroring is introduced.
3. The wrapped MCP server and `describe_capabilities` introspection both derive from `VOCABULARY_CLASSES`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/dispatch.test.ts` — extend with wrapped-boundary coverage for every `VOCABULARY_CLASSES` value and `describe_capabilities` class-enum introspection.

### Commands

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js`.
3. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`.
4. `cd tools/world-mcp && npm test`.
5. `git diff --check`.

## Outcome

WMCP-002 was completed as a validation-only duplicate closeout. The source expansion was already present from archived `MCPENH-008`; this ticket added missing wrapped MCP dispatch coverage so every registered vocabulary class is exercised through the server boundary, and `describe_capabilities` now has an explicit test assertion for the full `get_canonical_vocabulary.class` enum.

## Verification Result

1. `cd tools/world-mcp && npm run build` — pass.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js` — pass.
3. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — pass.
4. `cd tools/world-mcp && npm test` — pass; 237 tests passed.
5. `git diff --check` — pass.

Ignored/generated artifact state: `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were present before verification. `npm run build` / `npm test` refreshed the expected ignored `tools/world-mcp/dist/` artifact.

## Deviations

The original draft expected direct external calls such as `mcp__worldloom__get_canonical_vocabulary({class: 'invariant_category'})`. That tool is not exposed in this Codex session, so this ticket uses the stronger local substitute available here: compiled handler proof plus in-memory MCP client/server dispatch proof after `npm run build`.
