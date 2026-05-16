# MCPENH-050: `list_records` `fields` validation error response must enumerate accepted projection keys per record_type so operators don't trial-and-error to discover valid field names

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records.ts` (extends the `unknown_projection_keys` error response with `accepted_projection_keys`; validates against filtered response rows for atomic/story-bundle modes; keeps static hybrid metadata keys), `tools/world-mcp/src/server.ts` (capability description names the added diagnostic), `tools/world-mcp/tests/tools/list-records.test.ts` and `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (accepted-key and empty-result coverage), `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` (document the response-shape extension).
**Deps**: `archive/tickets/MCPENH-034-list-records-fields-validation-and-deep-projection-on-hybrid-default-mode.md` — MCPENH-034 introduced the `unknown_projection_keys` validation that produces the rejection; this ticket extends that validation's response shape to include the discoverability surface.

## Problem

At intake, mid-session during `canon-addition` PA-6 on `erotica-world` (2026-05-16), the operator needed to enumerate open-question records with a projection. The first attempt failed:

```
mcp__worldloom__list_records({
  world_slug: 'erotica-world',
  record_type: 'open_question_record',
  fields: ['record_id', 'question_summary']
})
→ {"code":"invalid_input","message":"Unknown list_records fields key 'question_summary'.",
   "details":{"field":"fields","unknown_projection_keys":["question_summary"],"record_type":"open_question_record"}}
```

The operator then tried `fields: ['record_id', 'summary', 'status']` (also rejected) before omitting `fields` entirely to fall back to the default projection. Net cost: three tool-call iterations to discover that `open_question_record`'s projection-valid keys are different from the operator's intuition (the actual top-level fields per `_source/open-questions/OQ-N.yaml` are `id`, `topic`, `body`, `caution`, `when_to_resolve`, `extensions`, `record_kind` — none of which were the operator's first guesses).

Before this ticket, the error response carried `unknown_projection_keys: [first-key]` (the offending key), `field: 'fields'` (which input field is invalid), and `record_type` (the operator's record_type input) — all useful for confirming WHICH input was wrong. But it did not carry the accepted-key set, so the operator had to either (a) guess again, (b) read the YAML schema for the record class directly, OR (c) call `list_records` without `fields` and inspect the default projection output to derive the valid keys. None of (a)/(b)/(c) is the natural rejection-moment response surface.

`get_record_schema` is the candidate alternative discoverability surface, but it doesn't expose per-record-type projection field enumeration as a separate API — its response is the JSON-schema-shaped record body, not a list of `list_records`-projection-valid keys. The two surfaces address different operator questions ("what's the schema of this record class?" vs "what fields can I project in `list_records`?"), and conflating them via doc-only routing ("read get_record_schema, derive the projectable fields") leaks the projection contract into operator memory.

This ticket extends the `unknown_projection_keys` error response with an `accepted_projection_keys` field listing the sorted union of valid keys for the rejected record_type's response shape. Operators now see the accepted set in the same error response that flags the rejection.

## Assumption Reassessment (2026-05-16)

1. **Codebase reassessment.** At intake, the `tools/world-mcp` `list_records` implementation did not yet expose accepted projection keys in unknown-field errors:
   - `tools/world-mcp/src/tools/list-records.ts` invoked `unknownProjectionKeys(args.record_type, parsedRows.map((entry) => entry.projectionSource), args.fields, args.include_full_body)` and on non-empty result built the error via `createMcpError("invalid_input", "Unknown list_records fields key 'X'.", {field: "fields", unknown_projection_keys: unknownFieldKeys, record_type: args.record_type})`. The accepted set was computable, but it was not included in the error details.
   - `unknownProjectionKeys` compared input `fields` against either parsed-record top-level keys (atomic + story-bundle modes) or the static metadata wrapper keys (hybrid mode). The landed implementation adds `acceptedProjectionKeys(...)` plus `projectionFieldValidation(...)`.
   - At intake, `tools/world-mcp/src/tools/list-records.ts` validated `unknownProjectionKeys(...)` before applying `filters`, so the drafted empty-result-set acceptance case was not live: a filtered request that matched zero rows still derived projection validity from the unfiltered record_type row set. This ticket therefore moved projection-field validation to the filtered response rows. For empty atomic/story-bundle filtered result sets, validation cannot derive accepted keys from row content, so the landed behavior rejects non-empty `fields` with `accepted_projection_keys: []` plus a `note` field. Hybrid mode keeps the static metadata wrapper set even when filters match zero rows.
   - `tools/world-mcp/tests/tools/list-records.test.ts` covers MCPENH-034's validation assertions per the precedent ticket; no existing test asserts the response carries an accepted-key set (because no such field exists at HEAD).
   - `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` document MCPENH-034's validation behavior but don't yet describe the discoverability extension.
   - Current-session intake started from a clean tracked worktree. Later unrelated dirt appeared outside the reviewed seam, but none of it changes the `tools/world-mcp` `list_records` gap or this ticket's owned boundary.
2. **Doc reassessment.** Archive content-grep `grep -lniE '(list_records.*fields|projection.*key|valid.*key.*enum|describe_record_projection|fields.*enum)' archive/tickets/MCPENH-*.md archive/tickets/VALENH-*.md` returned hits at MCPENH-003, MCPENH-007, MCPENH-021, MCPENH-023, MCPENH-024, MCPENH-030, MCPENH-034, VALENH-001, VALENH-011, VALENH-015. Reading MCPENH-034 specifically (the closest match): MCPENH-034's Outcome states "Hybrid default/projection mode now rejects `fields` outside the metadata wrapper keys" and "Atomic and story-bundle default/projection modes now reject `fields` that are absent from every parsed record in a non-empty result set" and "Valid-key projection output remains unchanged" — the validation IS implemented per MCPENH-034, but the error response does NOT enumerate the accepted set. MCPENH-034's Deviations §1 acknowledges "Empty atomic/story-bundle record sets still cannot validate unknown `fields` keys because there is no parsed response shape to inspect" — the same limitation applies to the accepted-key derivation. None of the archived tickets has an Outcome that adds `accepted_projection_keys` to the error response.
3. **Shared boundary under audit.** The MCP error-response contract between `@worldloom/world-mcp` (the error producer at `tools/world-mcp/src/tools/list-records.ts`) and the operator-facing skill prose that consumes the error (canon-addition's references/retrieval-tool-tree.md, character-generation, propose-new-canon-facts, every retrieval-using skill). Before this ticket, `details.unknown_projection_keys` carried the offending key. The landed contract keeps that field and adds `details.accepted_projection_keys` carrying the sorted accepted-key set for the record_type's response shape (or an empty array with a note when atomic/story-bundle empty-result-set prevents derivation). Additive — no consumer parsing the existing `unknown_projection_keys` field breaks.
4. **Existing output schema extension.** The MCP error-response shape for `list_records.invalid_input` was extended from `{code: 'invalid_input', message: "Unknown list_records fields key 'X'.", details: {field: 'fields', unknown_projection_keys: [...], record_type: '...'}}` to the same shape plus `details.accepted_projection_keys: [sorted string array]`. The extension is additive-only (new optional field with a sorted default); no consumer that parses `unknown_projection_keys` breaks. Hybrid mode always populates the static metadata wrapper keys (`record_id`, `record_kind`, `title`, `content_hash`, `file_path`); atomic and story-bundle modes populate the union of top-level keys derived from at least one matched parsed row after filters are applied, and an empty array with a `note` field ("Empty result set: accepted projection keys cannot be derived from matched records. Consult `get_record_schema` or omit `fields` to inspect default records.") when it's empty.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** Three options were considered:
   - **(A — chosen)** Extend the `unknown_projection_keys` error response with a sibling `accepted_projection_keys` field. The discoverability moment IS the rejection moment; surfacing the answer in the same response keeps the operator's tool-call cycle short. The implementation is single-file, additive-only, and uses the same logic the existing `unknownProjectionKeys` helper already computes (the unknown set is the input set minus the accepted set; both are available in the same scope).
   - **(B)** Add a new `mcp__worldloom__describe_record_projection({record_type})` tool. **Rejected**: the operator who hit the rejection has to leave the failure trace, run a separate tool, then return — twice the round trip. The new-tool approach is appropriate when the discoverability question is asked PROACTIVELY (operator wants to know before running the rejection-prone call), but here the canonical operator path is "run list_records, get rejected, learn from the error". Adding a new tool doesn't help the canonical path.
   - **(C)** Document the per-record-type accepted keys in `docs/MACHINE-FACING-LAYER.md` and trust operators to read the docs. **Rejected**: the docs would mirror what the YAML schemas already declare, so the documentation surface IS the per-class JSON schemas at `tools/validators/src/schemas/`; pointing operators to read those during a rejection moment is the same trial-and-error cost (different tab, same friction). The error-response extension is the canonical solution because the failure moment is the question moment.
2. **No backwards-compatibility aliasing/shims introduced.** The fix adds an optional field to the error response; no `--legacy-no-accepted-keys` flag, no version-gated behavior, no deprecation warning on the existing `unknown_projection_keys` field (which remains useful for naming WHICH input was wrong). Consumers parsing `unknown_projection_keys` continue to work; consumers using `accepted_projection_keys` benefit from the additional discoverability surface. No backwards-compatibility shim is needed because the change is purely additive.

## Verification Layers

1. **Error-response shape extension** → codebase grep-proof: `grep -n "accepted_projection_keys" tools/world-mcp/src/tools/list-records.ts` returns at least one match in the createMcpError call sites for the `unknownProjectionKeys` rejection path.
2. **Atomic-mode accepted-keys derivation** → automated test in `tools/world-mcp/tests/tools/list-records.test.ts`: assert that `list_records({record_type: 'open_question_record', fields: ['question_summary']})` returns `accepted_projection_keys: ['caution', 'extensions', 'id', 'record_kind', 'topic', 'when_to_resolve', ...]` (sorted; the actual key list depends on the record class's YAML structure).
3. **Hybrid-mode accepted-keys derivation** → automated test: assert that `list_records({record_type: 'character_record', fields: ['character_name']})` returns `accepted_projection_keys: ['content_hash', 'file_path', 'record_id', 'record_kind', 'title']` (the static hybrid metadata wrapper keys).
4. **Empty-result-set fallback** → automated test: assert that `list_records({record_type: 'open_question_record', filters: {id: 'OQ-99999'}, fields: ['xxx']})` (empty result set) returns `accepted_projection_keys: []` AND a `note` field naming `get_record_schema` or default projection inspection as the fallback discoverability surface.
5. **README / MACHINE-FACING-LAYER doc cross-check** → manual review: `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` `list_records` API sections document the `accepted_projection_keys` field including the empty-result-set fallback behavior.

## Landed Changes

### 1. Extended projection validation to return accepted keys

In `tools/world-mcp/src/tools/list-records.ts`, `acceptedProjectionKeys(...)` and `projectionFieldValidation(...)` now compute sorted accepted keys and include them in `invalid_input` details for unknown `fields`.

- **Hybrid mode** (`record_type in {character_record, diegetic_artifact_record, adjudication_record}`): `['content_hash', 'file_path', 'record_id', 'record_kind', 'title']` (the static metadata wrapper keys per MCPENH-034's hybrid validation).
- **Atomic mode**: the union of top-level keys across filtered parsed-record response rows. Empty filtered result sets return `accepted_projection_keys: []` plus `details.note`.
- **Story-bundle mode**: same as atomic mode, scoped to `story_slug` and post-filter response rows.
- **Full-body mode** (`include_full_body === true`): unchanged; `fields` is ignored per MCPENH-034.

### 2. Added response-shape tests

`tools/world-mcp/tests/tools/list-records.test.ts` now covers atomic accepted-key derivation, hybrid accepted-key derivation, partial-invalid hybrid projection, and empty atomic result-set notes.

`tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` now covers story-bundle accepted-key derivation and empty story-bundle result-set notes.

### 3. Documented the response-shape extension

`tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` now name `accepted_projection_keys`, the filtered-row derivation rule, and the empty-result-set note.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify) — extend the unknown-keys helper and the createMcpError call site
- `tools/world-mcp/src/server.ts` (modify) — capability description names `accepted_projection_keys`
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify) — atomic/hybrid accepted-key and empty-result cases
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify) — story-bundle accepted-key and empty-result cases
- `tools/world-mcp/README.md` (modify) — `list_records` API section response-shape paragraph
- `docs/MACHINE-FACING-LAYER.md` (modify) — `list_records` table row response-shape paragraph

## Out of Scope

- Adding a new `mcp__worldloom__describe_record_projection` tool (rejected per Architecture Check option B).
- Changing the existing `unknown_projection_keys` field shape or removing it.
- Backporting accepted-keys derivation to other MCP error responses (e.g., unknown-filter-key errors); separate scope if needed.
- The empty-result-set limitation is not solved by guessing schema keys; this ticket only makes the limitation explicit in the rejection response via `accepted_projection_keys: []` plus a `details.note`.
- Per-record-type projection-key documentation in any skill prose (canon-addition's references/retrieval-tool-tree.md, etc.) — those skills consume the new error response naturally; documenting per-record-type field lists in skill prose duplicates the JSON schemas and risks drift.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/tools/list-records.story-bundle.test.js` passes atomic, hybrid, story-bundle, and empty-result accepted-key cases.
2. `cd tools/world-mcp && npm test` passes including the new test cases.
3. `rg -n 'accepted_projection_keys|acceptedProjectionKeys|projectionFieldValidation|Empty result set: accepted projection keys' tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/tests/tools/list-records.test.ts tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` confirms the source, tests, docs, and registered capability surface carry the new diagnostic.

### Invariants

1. The error response for `unknown_projection_keys` rejection ALWAYS includes `accepted_projection_keys` (possibly empty for empty-result-set atomic/story-bundle modes).
2. Hybrid-mode `accepted_projection_keys` is the static set `['content_hash', 'file_path', 'record_id', 'record_kind', 'title']` regardless of result-set size.
3. The existing `unknown_projection_keys` field continues to carry the offending input keys (no removal, no rename).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` (modify) — atomic-mode, hybrid-mode, and empty-result-set test cases for the `accepted_projection_keys` response field.
2. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify) — story-bundle accepted-key and empty-result-set coverage.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/tools/list-records.story-bundle.test.js`
3. `cd tools/world-mcp && npm test`
4. `rg -n 'accepted_projection_keys|acceptedProjectionKeys|projectionFieldValidation|Empty result set: accepted projection keys' tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/tests/tools/list-records.test.ts tools/world-mcp/tests/tools/list-records.story-bundle.test.ts`

## Outcome

Completion date: 2026-05-16.

Completed. `list_records` unknown projection-field errors now include:

- `details.accepted_projection_keys` as a sorted key list for the request's response shape.
- `details.note` for empty atomic/story-bundle filtered result sets where accepted keys cannot be derived from matched rows.
- Existing `details.unknown_projection_keys`, `details.field`, and `details.record_type` unchanged.

Projection validation now runs against filtered response rows for atomic/story-bundle modes, so empty filtered result sets are handled truthfully. Hybrid mode continues to use the static metadata wrapper keys.

## Verification Result

Passed:

1. Pre-edit baseline: `cd tools/world-mcp && npm test` — passed (`363` passing tests).
2. `cd tools/world-mcp && npm run build`.
3. First focused proof: `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/tools/list-records.story-bundle.test.js` — failed once because the new atomic accepted-key assertion omitted the live `record_kind` key; test expectation was corrected.
4. Rerun focused proof: `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/tools/list-records.story-bundle.test.js` — passed (`29` passing tests).
5. `cd tools/world-mcp && npm test` — passed (`366` passing tests).
6. `rg -n 'accepted_projection_keys|acceptedProjectionKeys|projectionFieldValidation|Empty result set: accepted projection keys' tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/tests/tools/list-records.test.ts tools/world-mcp/tests/tools/list-records.story-bundle.test.ts`.

## Deviations

- Direct external `mcp__worldloom__list_records(...)` smoke was not claimed; this run changed source and validated through package-local compiled tests, full package tests, docs grep, and registered capability text without proving a restarted deployed MCP connector.
- Empty atomic/story-bundle result sets still cannot enumerate real valid keys from schema automatically. The landed behavior makes that limitation explicit with `accepted_projection_keys: []` and `details.note` instead of guessing schema fields.
- Reassessment found same-seam filter-order fallout: the pre-ticket handler validated projection fields before applying `filters`. This ticket moved field validation after filter application so accepted keys reflect the actual response rows.
- `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/dist/` are ignored package artifacts in the package-scoped status snapshot; `dist/` was refreshed by `npm run build` / `npm test`.
