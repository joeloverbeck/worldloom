# VALENH-033: story-bundle record schemas reject the optional `record_kind` discriminator that retrieval injects and the README documents as accepted

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-*.schema.json` (23 files); `record_schema_compliance` tests, schema field-set inventory, and `tools/world-mcp/README.md` wording.
**Deps**: none.

## Problem

At intake, MCP retrieval (`get_record` / `get_records` / `list_records`) injected a `record_kind` discriminator onto every returned record so clients could tell record classes apart; the on-disk `_source/<class>/*.yaml` files did not store that field. `tools/world-mcp/README.md` documented the intended round-trip: *"Patch validation accepts a matching optional `record_kind` discriminator in authored-record payloads, which lets retrieval-shaped records be copied into patch-plan constructors without `additionalProperties` failures; mismatched discriminators still fail schema validation."*

That contract held for **atomic** record schemas — `canon-fact-record`, `change-log-entry`, `entity`, `invariant`, `mystery-reserve`, `open-question`, `section` all declared an optional `record_kind` (`{"type": "string", "const": "<kind>"}`). At intake it was false for every story-bundle record schema: all 23 `tools/validators/src/schemas/story-*.schema.json` files set `additionalProperties: false` and declared no `record_kind` property. An author who copied a retrieval-shaped story record (which carried the injected `record_kind`) into a `create_*_record` payload was rejected by `record_schema_compliance` with `must NOT have additional properties` — exactly the failure the README said would not happen.

Historical session evidence (the intake `branching-story-turn-cycle` PG-2 turn): `BEL-6`, `BEL-7`, and `THR-4` were authored by mirroring `get_records` output (which carried `"record_kind":"belief_record"` / `"thread_record"`) into `create_bel_record` / `create_thr_record` payloads. `validate-patch-plan` rejected all three with `record_schema_compliance.additionalProperties`; `record_kind` had to be stripped from each before the dry-run passed. The validator caught it (no corrupt state shipped), but the documented copy-retrieval-shape-into-patch workflow was broken for the story-bundle surface before this ticket.

## Assumption Reassessment (2026-05-22)

1. **Codebase reassessment (existing behavior -> new behavior, Rule 6 retcon).** Existing behavior: all 23 `tools/validators/src/schemas/story-*.schema.json` have `additionalProperties: false` and no `record_kind` property, so `record_schema_compliance` (`tools/validators/src/structural/record-schema-compliance.ts`) rejects any payload carrying `record_kind`. Confirmed before source edits by enumerating every `story-*.schema.json` (`record_kind` absent from all 23). New behavior: each story-bundle schema gains an optional `record_kind` property pinned to that class's discriminator via `const`, mirroring the atomic schemas. Warrant: the README documents the tolerance as the supported workflow and the atomic schemas already implement it; the story-bundle schemas were never brought to parity. Current dirty worktree state is unrelated to the validators schema seam except this untracked active ticket; `tools/validators/src/schemas/` was clean before implementation.
2. **Doc reassessment.** `tools/world-mcp/README.md` asserted the `record_kind` tolerance in an atomic-focused paragraph; `docs/MACHINE-FACING-LAYER.md:193` and `docs/CONTEXT-PACKET-CONTRACT.md:314` describe `record_kind` as retrieval response metadata. Adding `record_kind` to the story-bundle schemas made the README's tolerance claim true for schema-backed story-bundle records; post-review wording now explicitly names parsed atomic and story-bundle records so the package README matches the landed contract.
3. **Shared boundary under audit.** The `record_kind` discriminator contract between the MCP retrieval output shape (`tools/world-mcp/src/tools/get-record.ts`, `get-records.ts`, `list-records.ts`, which set `record_kind` per returned record) and the patch-plan input schemas (`tools/validators/src/schemas/*.json`, enforced by `record_schema_compliance` at `validate-patch-plan` / `submit-patch-plan` pre-apply). The live discriminator authority for schema-backed story records is `tools/validators/src/structural/utils.ts` `RECORD_TYPE_TO_SCHEMA` / the matching `StoryBundleNodeType` values from world-index. The atomic side honors the optional pinned-discriminator contract; the story-bundle side does not. This ticket aligns the story-bundle input schemas to the retrieval output shape the README promises is round-trippable.
4. **Existing output schema extension (additive-only).** This ticket extends 23 existing story-bundle record schemas by adding one optional property (`record_kind`) pinned by `const`. The extension is additive-only: existing valid payloads (which omit `record_kind`) continue to pass because `record_kind` is not added to any schema's `required` list (matching the atomic schemas, where `record_kind` is optional). Consumers of these schemas — `record_schema_compliance` and the `describe_envelope_schema` / `get_record_schema` surfaces that serve the schemas to authors — inherit the change without code edits (they read the schema file). No consumer rejects a newly-optional property. The only behavior change is that a matching `record_kind` is now accepted and a mismatched one is rejected by `const`, which is the documented intent.

## Architecture Check

1. **Mirror the atomic-schema precedent exactly.** Atomic schemas declare `record_kind: {"type": "string", "const": "<kind>"}` (optional). Applying the identical shape to each story-bundle schema is cleaner than (a) flipping `additionalProperties` to `true` (would silently accept arbitrary junk fields, defeating schema minimalism), or (b) stripping `record_kind` in the MCP retrieval layer (would remove the discriminator clients legitimately use and contradict the documented atomic behavior). The `const` form delivers the README's "matching accepted, mismatched fails" semantics for free.
2. **No backwards-compatibility shims.** `record_kind` stays optional (absent from `required`), so no existing record or constructor changes; no alias field, no dual-read path. The single new optional property per schema is the whole change.

## Verification Layers

1. Every `tools/validators/src/schemas/story-*.schema.json` declares optional `record_kind` (`const: <class discriminator>`, not in `required`) → codebase grep-proof (post-edit re-run of the enumeration that found 0/23 at HEAD).
2. A representative story-bundle payload carrying the matching `record_kind` passes `record_schema_compliance`; the same payload carrying a mismatched `record_kind` fails → schema validation via `record-schema-compliance-bel.test.ts`.
3. Existing payloads that omit `record_kind` still pass (additive-only, no regression) → schema validation via the existing per-record tests and the full validators suite.
4. The `const` value for each class equals the discriminator MCP retrieval injects → codebase grep-proof against the `record_kind` mapping in `tools/world-mcp/src/tools/get-record.ts` / `list-records.ts` (e.g., `belief_record`, `thread_record`, `story_event_record`, `page_record`, `story_fact_record`).

## Landed Changes

### 1. Add optional `record_kind` to each story-bundle record schema

Each of the 23 `tools/validators/src/schemas/story-*.schema.json` files now includes this optional property shape:

```json
"record_kind": { "type": "string", "const": "<this class's indexed record_kind>" }
```

`additionalProperties: false` remains in place and `record_kind` was not added to any `required` list. The `const` value for each class matches the live node type / discriminator from `RECORD_TYPE_TO_SCHEMA` and the story-bundle node vocabulary (for example, `story-belief` -> `belief_record`, `story-thread` -> `thread_record`, `story-event` -> `story_event_record`, `story-fact` -> `story_fact_record`, `story-relationship` -> `relationship_record_story`, `story-pressure-clock` -> `pressure_clock_record`).

### 2. Extend schema-compliance tests

Added an aggregate structural test that enumerates every schema-backed story-bundle class from `RECORD_TYPE_TO_SCHEMA` and proves:

- each mapped `story-*.schema.json` has `properties.record_kind` with `type: "string"` and `const` equal to the live node type / discriminator;
- `record_kind` is absent from each schema's `required` list.

Also extended a representative `record_schema_compliance` test with matching-`record_kind` pass and mismatched-`record_kind` fail assertions so the schema contract is proved through the actual validator path, not only by direct JSON inspection.

The broad validators suite also exposed same-seam fixed field-set inventory fallout, so `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` now expects `record_kind` in the amended story schema property lists.

### 3. README accuracy

`tools/world-mcp/README.md` now names parsed atomic and story-bundle records in the `record_kind` copy-through note, so the package documentation matches the schema-backed story-bundle behavior covered by this ticket.

## Files to Touch

- `tools/validators/src/schemas/story-belief.schema.json` (modify)
- `tools/validators/src/schemas/story-branch.schema.json` (modify)
- `tools/validators/src/schemas/story-character-authority.schema.json` (modify)
- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify)
- `tools/validators/src/schemas/story-diegetic-artifact.schema.json` (modify)
- `tools/validators/src/schemas/story-emotion.schema.json` (modify)
- `tools/validators/src/schemas/story-entity.schema.json` (modify)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/src/schemas/story-fact.schema.json` (modify)
- `tools/validators/src/schemas/story-intention.schema.json` (modify)
- `tools/validators/src/schemas/story-location.schema.json` (modify)
- `tools/validators/src/schemas/story-object.schema.json` (modify)
- `tools/validators/src/schemas/story-obligation.schema.json` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/schemas/story-plan.schema.json` (modify)
- `tools/validators/src/schemas/story-pressure-clock.schema.json` (modify)
- `tools/validators/src/schemas/story-question.schema.json` (modify)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify)
- `tools/validators/src/schemas/story-secret.schema.json` (modify)
- `tools/validators/src/schemas/story-status.schema.json` (modify)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/schemas/story-thread.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` (modify — representative validator-path proof)
- `tools/validators/tests/structural/story-record-kind-schema-contract.test.ts` (new — aggregate all-23 schema guard)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify — same-seam expected property inventory)
- `tools/world-mcp/README.md` (modify — post-review doc accuracy wording)

## Out of Scope

- Changing `additionalProperties` from `false` to `true` on any schema (the fix is a single pinned optional property, not a strictness relaxation).
- Stripping or relocating `record_kind` in the MCP retrieval layer (`tools/world-mcp/src/tools/*`) — retrieval correctly exposes the discriminator; this ticket aligns the input schemas to it.
- The atomic record schemas (already correct) and the hybrid frontmatter schemas (`character-frontmatter`, `diegetic-artifact-frontmatter`, `adjudication-frontmatter` — separate retrieval shape `{ record_kind, frontmatter, body_sections }`, not a flat record body; out of scope).
- Any narrowing edit to `docs/MACHINE-FACING-LAYER.md` / `docs/CONTEXT-PACKET-CONTRACT.md` (those describe `record_kind` as response metadata, which remains accurate).

## Acceptance Criteria

### Tests That Must Pass

1. Every schema-backed story-bundle class declares an optional `record_kind` const equal to its live node type / retrieval discriminator, proved by an aggregate schema contract test.
2. A representative `record_schema_compliance` payload that includes the matching `record_kind` passes (no `additionalProperties` verdict), and the same payload with a non-matching `record_kind` fails by `const`.
3. Existing payloads that omit `record_kind` continue to pass unchanged (additive-only, no regression) through the existing per-record compliance tests.
4. `cd tools/validators && npm test` passes (full validator suite, including the extended per-record compliance tests and `integration/validate-patch-plan.test.ts`).

### Invariants

1. `record_kind` is optional (never in `required`) on every story-bundle schema, matching the atomic schemas.
2. The accepted `record_kind` const for each class equals the discriminator MCP retrieval injects for that class — the documented round-trip (retrieve → copy into patch constructor → submit) succeeds for every story-bundle record class.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-record-kind-schema-contract.test.ts` — add an aggregate all-23 schema contract test. Rationale: the invariant is schema-wide and should fail if a future story schema omits or mis-pins `record_kind`.
2. `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` — add representative matching-`record_kind`-passes and mismatched-`record_kind`-fails assertions. Rationale: proves the schema contract is exercised through `record_schema_compliance`; existing per-record tests continue to prove omission remains valid for the rest of the family.
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — update fixed story schema property lists to include optional `record_kind`. Rationale: this existing inventory is a same-seam schema field-set guard.

### Commands

1. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/story-record-kind-schema-contract.test.js dist/tests/structural/record-schema-compliance-bel.test.js` — the all-23 schema contract plus the representative validator-path matching/mismatched `record_kind` cases.
2. Full-pipeline: `cd tools/validators && npm test` — the full validator suite (build + `node --test dist/tests/**/*.test.js`); confirms no regression across all per-record compliance tests and the integration patch-plan tests.

## Outcome

Completed. All 23 schema-backed story-bundle JSON Schemas now accept an optional matching `record_kind` discriminator and still reject mismatches through the pinned `const` value. Existing authored payloads that omit `record_kind` remain valid because the new property is not required.

Outcome amended: 2026-05-22 — post-ticket review updated `tools/world-mcp/README.md` so the documented `record_kind` copy-through behavior explicitly covers parsed atomic and story-bundle records.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/story-record-kind-schema-contract.test.js dist/tests/structural/record-schema-compliance-bel.test.js` — PASS; 9 tests passed before the field-set inventory update.
3. `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/structural/story-record-kind-schema-contract.test.js dist/tests/structural/record-schema-compliance-bel.test.js` — PASS; 13 tests passed after updating the same-seam schema property inventory.
4. `cd tools/validators && npm test` — PASS; 879 tests passed.
5. Direct schema enumeration — PASS; `23/23 story schemas have optional record_kind`.
6. Post-review doc wording check — PASS; `tools/world-mcp/README.md` now names parsed atomic and story-bundle records in the `record_kind` note.

## Deviations

- The draft expected per-record assertions in every dedicated record-schema compliance file. Reassessment narrowed that to an aggregate all-23 schema contract guard plus a representative `record_schema_compliance` runner proof, because the invariant is schema-wide and `record_schema_compliance` consumes those schema files directly.
- The first broad `npm test` run failed only on same-seam fixed property-list fallout in `contract-schema-roundtrip.test.ts`; that inventory was updated and the final full suite passed.
- Post-ticket review made one package README wording correction. No implementation proof rerun was needed for that prose-only change; validators proof remains represented by the final `npm test` run above.
