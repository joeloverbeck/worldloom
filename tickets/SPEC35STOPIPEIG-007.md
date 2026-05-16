# SPEC35STOPIPEIG-007: Wire full BEL schema in create_bel_record envelope discovery

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (`describe-envelope-schema.ts` tool) + schema-discovery test
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D7

## Problem

`tools/world-mcp/src/tools/describe-envelope-schema.ts:425–426` handles `create_bel_record` as:

```typescript
case "create_bel_record":
  return baseOperationProperties(kind, storyPayloadWithGenericRecord("^BEL-[0-9]+$"));
```

Every sibling story-record op at `tools/world-mcp/src/tools/describe-envelope-schema.ts:397–424` uses `storyPayloadWithRecord(KEY)` to validate against the full record schema. The BEL schema file exists at `tools/validators/src/schemas/story-belief.schema.json` (verified at Step 2) but is not registered in `RECORD_SCHEMA_BY_PAYLOAD_KEY` (`tools/world-mcp/src/tools/describe-envelope-schema.ts:76–103`). Schema discovery for `create_bel_record` under-teaches the schema; skills authoring BEL records have only the ID-pattern check at discovery time, and the full BEL validation only fires at submit-time inside the patch engine.

The patch engine itself is correctly wired (`tools/patch-engine/src/ops/create-story-record.ts` dispatches `create_bel_record` uniformly with siblings — verified by brainstorm parallel-agent inspection); only the MCP-side discovery surface is wrong.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/src/tools/describe-envelope-schema.ts:425–426` uses `storyPayloadWithGenericRecord` for `create_bel_record`; sibling ops at `:397–424` use `storyPayloadWithRecord(KEY)`. Verified by brainstorm parallel-agent inspection.
2. `tools/validators/src/schemas/story-belief.schema.json` exists; verified at Step 2 (`ls tools/validators/src/schemas/ | grep -iE 'belief|bel'` returned `story-belief.schema.json`). SPEC-35 §Risks & Open Questions item closed.
3. Cross-skill boundary under audit: `describe_envelope_schema`'s `RECORD_SCHEMA_BY_PAYLOAD_KEY` mapping (the wire between MCP schema-discovery and the canonical JSON schemas in `tools/validators/src/schemas/`). The fix is to register the BEL schema in the mapping and dispatch via `storyPayloadWithRecord("belief_record")`.
4. §Machine-Facing Layer (schema-discovery currency, per `docs/FOUNDATIONS.md:532-544`) motivates this ticket: discovery output must match the schema used at validation time. Restated: skills authoring BEL records call `describe_envelope_schema(op_kind="create_bel_record")` BEFORE submission to validate their payload locally; if the discovery surface under-teaches the schema (returns only an ID-pattern check while the patch-engine submit-time validator checks the full BEL schema), skills will silently produce payloads that pass discovery but fail at submit. Aligning discovery with submit-time validation closes that gap.
5. This ticket extends the schema-discovery contract for `create_bel_record`: the existing consumer (skills calling `describe_envelope_schema(op_kind="create_bel_record")` before authoring BEL records) currently sees only the ID pattern; post-ticket they will see the full belief record schema. This is an ADDITIVE extension (the new schema is more permissive at discovery time, not less — schema fields are exposed that weren't exposed before; nothing previously discoverable is removed). No consumer breaks; consumers that author BEL records gain ahead-of-time validation.

## Architecture Check

1. The fix preserves uniformity across story-record op envelope schemas: every story-record op uses `storyPayloadWithRecord(KEY)` after this ticket. Alternative considered: leave `create_bel_record` as generic (deferring full BEL validation to patch-engine submit-time) — rejected because the discovery surface is documented as the pre-authoring validation surface (per `docs/MACHINE-FACING-LAYER.md` schema-discovery currency); under-teaching the schema at discovery defeats the surface's purpose.
2. No backwards-compatibility aliasing introduced. The change is a one-line dispatch swap plus a one-line map entry; no shims, no deprecation paths.

## Verification Layers

1. `create_bel_record` envelope schema exposes full BEL fields → schema-discovery test asserts `describeEnvelopeSchema({ op_kind: "create_bel_record" })` returns a schema that requires fields like `holder`, `claim`, `belief_mode`, `truth_relation`, `confidence`, `visibility`, `basis` (the BEL field set per `story-belief.schema.json`), not just `id`.
2. `RECORD_SCHEMA_BY_PAYLOAD_KEY` contains a `belief_record` entry → grep-proof: `grep -n 'belief_record' tools/world-mcp/src/tools/describe-envelope-schema.ts` returns matches in both the mapping block (lines 76-103 area) and the dispatch block (line 425).
3. Sibling op envelope schemas unchanged → existing schema-discovery tests for `create_sf_record`, `create_se_record`, etc. continue to pass.
4. Full `tools/world-mcp/` test suite green → `npm test`.

## What to Change

### 1. Add `belief_record` entry to `RECORD_SCHEMA_BY_PAYLOAD_KEY`

In `tools/world-mcp/src/tools/describe-envelope-schema.ts:76–103`, add a new entry to the `RECORD_SCHEMA_BY_PAYLOAD_KEY` mapping:

```typescript
belief_record: "story-belief.schema.json"
```

Insert in alphabetically-or-logically-coherent position alongside `story_event_record`, `story_fact_record`, etc.

### 2. Swap `create_bel_record` dispatch

In `tools/world-mcp/src/tools/describe-envelope-schema.ts:425–426`, replace:

```typescript
case "create_bel_record":
  return baseOperationProperties(kind, storyPayloadWithGenericRecord("^BEL-[0-9]+$"));
```

with:

```typescript
case "create_bel_record":
  return baseOperationProperties(kind, storyPayloadWithRecord("belief_record"));
```

### 3. Add schema-discovery test

In `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (extend if present; create if not):
- Call `describeEnvelopeSchema({ op_kind: "create_bel_record" })`.
- Assert the returned schema's `record` property references the BEL schema (via `$ref` or whatever shape `storyPayloadWithRecord` produces).
- Assert the returned schema requires (or surfaces) the BEL field set: `holder`, `claim`, `belief_mode`, `truth_relation`, `confidence`, `visibility`, `basis`.
- Assert it does NOT match the prior generic-shape (only `id` required).

## Files to Touch

- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify — 2 sites: mapping table + dispatch case)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify or new)

## Out of Scope

- Patch-engine-side `create_bel_record` op wiring — already correct per brainstorm parallel-agent verification of `tools/patch-engine/src/ops/create-story-record.ts`.
- Changes to other story-record envelope dispatches — all siblings are already correctly wired.
- Changes to `story-belief.schema.json` content — only the discovery wiring changes.

## Acceptance Criteria

### Tests That Must Pass

1. New/extended schema-discovery test asserts full BEL field set surfaces in `create_bel_record` envelope schema.
2. `grep -n 'belief_record' tools/world-mcp/src/tools/describe-envelope-schema.ts` returns at least 2 matches (mapping + dispatch).
3. `grep -n 'storyPayloadWithGenericRecord.*BEL' tools/world-mcp/src/tools/describe-envelope-schema.ts` returns zero matches.
4. `npm test` in `tools/world-mcp/` returns green.

### Invariants

1. `create_bel_record` envelope discovery exposes the full BEL schema — same fields validators check at submit time.
2. The discovery surface is uniform across all story-record `create_*` ops (all use `storyPayloadWithRecord(KEY)`).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — new or extended test asserting `create_bel_record` exposes full BEL schema.

### Commands

1. `cd tools/world-mcp && npm test` — full MCP suite.
2. `cd tools/world-mcp && npm run build` — typechecks the change.
3. Post-landing: rebuild MCP `dist/` so the running server (if any) picks up the new schema discovery — `cd tools/world-mcp && npm run build` is sufficient; restart any long-running MCP server consumer.
