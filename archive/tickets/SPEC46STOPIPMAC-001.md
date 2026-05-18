# SPEC46STOPIPMAC-001: Fix OBL projection drift in story-bundle context

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (`ContextPacketStoryBundleContext["open_obligations"]` type), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (`buildOpenObligations` builder), and the story-bundle fixture/context-packet test surface
**Deps**: None

## Problem

At intake, the MCP context-packet builder `buildOpenObligations` emitted an `open_obligations` projection whose field set did not match the current `OBL` schema. The persisted `OBL` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.4 carries `obligation_kind`, `description`, `owed_by`, `owed_to`, `trigger_to_close`, and `urgency: low | medium | high` (closed enum). The MCP projection instead emitted `type` (not `obligation_kind`), `owner` (absent from schema), `subjects` (absent from schema), numeric `salience` (absent from schema), and numeric `urgency` (schema is enum) — silent retrieval drift between the canonical persisted state and the projection skills consume through story-bundle context packets. This ticket aligned the projection and fixture proof to the schema.

## Assumption Reassessment (2026-05-18)

1. At intake, `tools/world-mcp/src/context-packet/shared.ts` defined `open_obligations: Array<...>` with the drift-shaped fields (`type`, `owner`, `subjects`, numeric `salience`, numeric `urgency`); `tools/world-mcp/src/context-packet/story-bundle-context.ts` (`buildOpenObligations`) emitted those drift-shaped values; `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` asserted on the projection's `id` field only (no field-shape assertion). The id projection (`open_obligation_ids`) is preserved unchanged because `obligation.id` survives the rename.
2. `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase A names the corrected shape and the consumer-audit step (D-A3) explicitly; OBL schema authority lives at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.4 lines 448-464 (verified at brainstorm-triage time and re-verified at Step 2).
3. Cross-skill boundary: the MCP context-packet contract is consumed by story-pipeline skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`) and by `tools/world-mcp` internal persistence/recovery surfaces; the field-shape change is observable to every caller of `mcp__worldloom__get_context_packet` with `story_slug`. Cross-package grep confirmed the only in-repo consumers are `tools/world-mcp/src/context-packet/shared.ts`, `tools/world-mcp/src/context-packet/story-bundle-context.ts`, and `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`; skills under `.claude/skills/` do not reference the field names directly.
4. FOUNDATIONS §Tooling Recommendation principle motivating this ticket: *"LLM agents should never operate on prose alone. They should always receive ... the documented context-packet + targeted-retrieval pattern"*. A projection whose field set silently diverges from the persisted record violates the contract — skills consuming the projection receive misleading state. The fix replaces silence with truth.
5. Rename blast radius per template item 7: the projection's field rename (`type` → `obligation_kind`, removal of `owner` / `subjects` / numeric `salience`, narrowing of `urgency` to enum) is a breaking change to the MCP context-packet shape. Pipeline-wide grep (`tools/`, `.claude/skills/`, `docs/`, `specs/`) for `open_obligations\b` returned exactly three production sites (`shared.ts:112`, `story-bundle-context.ts:197/442/473`) plus one test site (`story-bundle-context.test.ts:48`). All four sites land in this ticket. Out-of-repo consumers are not expected at this pipeline stage; the breaking change is accepted because the current projection is silently wrong and "preserve incorrect bytes" is not a viable contract.
6. Live package reassessment added `tools/world-mcp/tests/tools/story-bundle-fixture.ts` and `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` to the owned test surface. The fixture still used drift-shaped OBL records (`type`, `owner`, `subjects`, numeric `salience`, and derived payoff/cache fields), and the persisted-summary test expected only `OBL-1`; both had to move with the corrected projection to make the package proof truthful.
7. Final broad proof exposed one more fixture-coupled expectation in `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`: the new `OBL-4` fixture row legitimately matches the existing `"loft"` lexical search. The test expectation was updated as same-seam proof fallout.

## Architecture Check

1. The corrected projection mirrors the `OBL` schema field-for-field, preserving the closed-enum nature of `urgency` and the natural-language `description` / `trigger_to_close` fields. Alternatives considered: (a) emit BOTH old and new field names with deprecation alias — rejected because no out-of-repo consumer relies on the drift-shaped fields and the additional shape complexity would persist drift; (b) keep the projection shape and rename the schema instead — rejected because the schema is authoritative and persisted; the projection is the lagging surface.
2. No backwards-compatibility aliasing or shims introduced. The `possible_payoff_modes` and `coverage_cache_compatible_storylets` derived fields (per spec §Phase A) were removed because no in-repo consumer references them from `open_obligations`.

## Verification Layers

1. **Field-set fidelity** → schema validation: a fixture test loads representative `OBL` records and asserts `buildOpenObligations` emits exactly `{id, obligation_kind, description, owed_by, owed_to, urgency, trigger_to_close, status}` per record with no fabricated keys and no missing required keys (corresponds to spec test T-1).
2. **End-to-end projection truthfulness** → package-local fixture context-packet: load a fixture world's full `story_bundle_context` via `assembleContextPacket({task_type: "commitment_block_authoring", seed_nodes: [...], story_slug: ...})` and assert the corrected `open_obligations` shape end-to-end (substitute surface for spec test T-2).
3. **Summary-fallback preservation** → codebase grep-proof: confirm `open_obligation_ids` summary at `story-bundle-context.ts:442` still enumerates `obligation.id` correctly after the projection rename — id is preserved through the rename so the summary is structurally unaffected.
4. **FOUNDATIONS alignment** → §Tooling Recommendation check: the projection now reflects the persisted record's field set; the "directly or via the documented context-packet + targeted-retrieval pattern" promise is preserved.

## Landed Changes

### 1. Corrected the `ContextPacketStoryBundleContext["open_obligations"]` type definition

In `tools/world-mcp/src/context-packet/shared.ts`, the drift-shaped `open_obligations: Array<...>` declaration now uses the schema-aligned shape:

```typescript
open_obligations: Array<{
  id: string;
  obligation_kind: string;                // OBL.obligation_kind per story-record-schemas.md §4.5.4
  description: string;                    // OBL.description
  owed_by: string;                        // OBL.owed_by
  owed_to: string;                        // OBL.owed_to
  urgency: "low" | "medium" | "high";     // OBL.urgency (closed enum)
  trigger_to_close: string;               // OBL.trigger_to_close
  status: string;                         // OBL.status
}>;
```

`possible_payoff_modes` and `coverage_cache_compatible_storylets` were removed from the projection because the only live hits were the old fixture, old builder/type, this ticket/spec intake text, and historical/current planning prose; no in-repo runtime consumer reads them from `open_obligations`.

### 2. Updated `buildOpenObligations` to emit the corrected projection

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, `buildOpenObligations` now parses each `OBL` record row via `parseYamlRecord` and projects the eight schema-aligned fields. `urgency` is constrained to `low | medium | high` with a defensive fallback for malformed records.

### 3. Updated fixture and context-packet assertions

`tools/world-mcp/tests/tools/story-bundle-fixture.ts` now seeds five schema-shaped `OBL` rows spanning `obligation_kind` and `urgency` values. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` now asserts exact field keys and exact projected values for all five obligations. The persisted-summary test now expects the five preserved obligation ids, and the story-bundle lexical-search test now includes the additional fixture row that legitimately matches `loft`.

The id-list summary path remains unchanged in source because `open_obligation_ids` still derives from `obligation.id`.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — `open_obligations` type at line 112 within the `ContextPacketStoryBundleContext` interface at line 97)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — `buildOpenObligations` at line 197-211)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — existing assertion + new field-set fidelity test)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify — persisted summary id expectation)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — five schema-aligned OBL fixture rows)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify — fixture-coupled lexical-search expectation)

## Out of Scope

- New context-packet summary fields for STINT / BEL / SREL / STSTAT / STLOC / STOBJ / story-local DA (covered by SPEC46STOPIPMAC-002 / -003 / -004).
- Projection-completeness audits for `hidden_secrets` and `open_story_questions` (deferred to follow-up audit ticket per SPEC-46 §Out of Scope item 12).
- Any change to the persisted `OBL` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.4 — the schema is authoritative; this ticket aligns the projection to the schema, not the other way around.
- `docs/CONTEXT-PACKET-CONTRACT.md` updates (covered by SPEC46STOPIPMAC-005 alongside the Phase B summary docs).
- `describe-capabilities.ts` updates (covered by SPEC46STOPIPMAC-005).

## Acceptance Criteria

### Tests That Must Pass

1. The new field-set fidelity test (T-1) emits exactly the eight schema-aligned `OBL` fields per row with no fabricated keys and no missing required keys.
2. The end-to-end integration test (T-2) loads a fixture world's `story_bundle_context` through the package-local context-packet assembler and asserts the corrected `open_obligations` shape.
3. `npm test --prefix tools/world-mcp` passes for the full world-mcp test suite (existing tests unaffected).
4. `npm run build` from `tools/world-mcp` typechecks cleanly with the corrected `ContextPacketStoryBundleContext["open_obligations"]` type.

### Invariants

1. The `open_obligations` projection's field set matches the persisted `OBL` schema field-for-field; no fabricated fields, no missing required fields.
2. `open_obligation_ids` summary projection at `story-bundle-context.ts:442` continues to enumerate every `obligation.id` correctly (id field preserved through the rename).
3. No in-repo consumer of `open_obligations` reads the drift-shaped fields (`type` / `owner` / `subjects` / numeric `salience` / numeric `urgency`) after this ticket lands.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — modified existing `obligation.id` assertion to additionally verify the exact field set and projected values for five fixture obligations covering the schema enum space.
2. `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` — updated the persisted summary expectation for all fixture obligation ids.
3. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` — updated the OBL fixture records to match the live schema.
4. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` — updated the existing fixture-coupled lexical search expectation for the new OBL fixture row.

### Commands

1. `npm test` from `tools/world-mcp` (targeted: world-mcp test suite passes including the new T-1 assertions)
2. `npm run build` from `tools/world-mcp` (typechecks the corrected `ContextPacketStoryBundleContext["open_obligations"]` shape)
3. `rg -n 'open_obligations\\b' tools/ .claude/skills/` and stale-field sweeps (codebase grep-proof: confirm no consumer outside `tools/world-mcp/` references the projection field and no current runtime/test surface reads the drift-shaped OBL keys from `open_obligations`)

## Outcome

Completed on 2026-05-18. The story-bundle context packet now projects open obligations as `{id, obligation_kind, description, owed_by, owed_to, urgency, trigger_to_close, status}`. The old fabricated projection fields were removed from the type and builder. The fixture was updated to five schema-aligned OBL rows, and context-packet tests now assert the exact field set, exact values, preserved `open_obligation_ids` summary, and updated lexical-search expectation for the expanded fixture.

## Verification Result

- `npm test` from `tools/world-mcp` passed before edits as the baseline: 405 passing tests.
- `npm run build` from `tools/world-mcp` passed after the source/test edits.
- `node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/context-packet/story-bundle-budget.test.js` from `tools/world-mcp` passed: 4 passing tests.
- First final `npm test` from `tools/world-mcp` failed only in `searchNodes scopes lexical search to the requested story bundle` because the expanded fixture made `OBL-4` legitimately match the existing `"loft"` query; the expected fixture result was updated.
- Final rerun of `npm test` from `tools/world-mcp` passed after that proof-surface fix: full package suite green, including the new OBL field-set assertions.
- Consumer/stale-field review: `rg` showed `open_obligations` live consumers remain confined to the world-mcp type, builder, summary, and tests. Remaining `type` / `owner` / `subjects` / `salience` literals outside the owned OBL projection are legitimate unrelated schema/fixture fields or historical/spec/ticket intake prose, not current `open_obligations` consumers.

## Deviations

- Direct `mcp__worldloom__get_context_packet` was not available as an external MCP tool in this Codex session. The accepted T-2 proof uses the package-local `assembleContextPacket` fixture path, which exercises the same story-bundle context builder and persisted-summary surface after a fresh package build.
- The field-set fidelity assertion was added to the existing story-bundle context test rather than a separate new test block; it still fixture-loads five representative OBL records and asserts the exact schema-aligned projection.
