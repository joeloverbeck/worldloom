# MCPENH-050: `list_records` `fields` validation error response must enumerate accepted projection keys per record_type so operators don't trial-and-error to discover valid field names

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records.ts` (extend the `unknown_projection_keys` error response with an `accepted_projection_keys` field; compute the accepted set per record_type's response shape — atomic mode = parsed-record top-level keys derived from at least one matched row, hybrid mode = the static metadata wrapper keys `record_id`/`record_kind`/`title`/`content_hash`/`file_path`, story-bundle mode = parsed-record top-level keys with `story_slug` filter applied), `tools/world-mcp/tests/tools/list-records.test.ts` (modify — assert the error response carries `accepted_projection_keys` for each mode and that the union is sorted), `tools/world-mcp/README.md` (modify — `list_records` API section documents the response-shape extension), `docs/MACHINE-FACING-LAYER.md` (modify — `list_records` paragraph notes the `accepted_projection_keys` field).
**Deps**: `archive/tickets/MCPENH-034-list-records-fields-validation-and-deep-projection-on-hybrid-default-mode.md` — MCPENH-034 introduced the `unknown_projection_keys` validation that produces the rejection; this ticket extends that validation's response shape to include the discoverability surface.

## Problem

Mid-session during `canon-addition` PA-6 on `erotica-world` (2026-05-16), the operator needed to enumerate open-question records with a projection. The first attempt failed:

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

The error response carries `unknown_projection_keys: [first-key]` (the offending key), `field: 'fields'` (which input field is invalid), and `record_type` (the operator's record_type input) — all of which are useful for confirming WHICH input was wrong. But the response NEVER carries the accepted-key set, so the operator must either (a) guess again, (b) read the YAML schema for the record class directly, OR (c) call `list_records` without `fields` and inspect the default projection output to derive the valid keys. None of (a)/(b)/(c) is the natural rejection-moment response surface — the operator ran `list_records` because they wanted projection; nesting the answer one tool away (or one filesystem read away, or one trial-and-error iteration away) doubles the discoverability cost relative to surfacing the answer at the rejection moment.

`get_record_schema` is the candidate alternative discoverability surface, but it doesn't expose per-record-type projection field enumeration as a separate API — its response is the JSON-schema-shaped record body, not a list of `list_records`-projection-valid keys. The two surfaces address different operator questions ("what's the schema of this record class?" vs "what fields can I project in `list_records`?"), and conflating them via doc-only routing ("read get_record_schema, derive the projectable fields") leaks the projection contract into operator memory.

The fix is small and additive: extend the `unknown_projection_keys` error response with an `accepted_projection_keys` field listing the union of valid keys for the rejected record_type's response shape. Operators see the accepted set in the same error response that flagged the rejection.

## Assumption Reassessment (2026-05-16)

1. **Codebase reassessment.** At HEAD (per `git status --porcelain` showing zero modifications under `tools/world-mcp/src/tools/`):
   - `tools/world-mcp/src/tools/list-records.ts:443-455` invokes `unknownProjectionKeys(args.record_type, parsedRows.map((entry) => entry.projectionSource), args.fields, args.include_full_body)` and on non-empty result builds the error via `createMcpError("invalid_input", "Unknown list_records fields key 'X'.", {field: "fields", unknown_projection_keys: unknownFieldKeys, record_type: args.record_type})`. The accepted set is computable (the `unknownProjectionKeys` helper presumably knows what it's checking against), but it isn't included in the error details.
   - `unknownProjectionKeys` is presumably defined elsewhere in `tools/world-mcp/src/tools/list-records.ts` or in a `_shared`-type module. Its existing logic compares input `fields` against either parsed-record top-level keys (atomic + story-bundle modes) or the static metadata wrapper keys (hybrid mode). The fix extends the same helper to ALSO return the accepted set, OR adds a sibling `acceptedProjectionKeys` helper that consumers call after the unknown-set check.
   - `tools/world-mcp/src/tools/list-records.ts:382-388` is the row-fetch query (per MCPENH-047's reassessment); the projection-valid-key derivation happens after the rows are fetched. For empty result sets (zero matched records), atomic-mode validation cannot derive accepted keys from row content — same limitation noted in MCPENH-034's Deviations §1. The corresponding accepted-keys-on-empty-set behavior is "return the static metadata fallback set" or "return null with a deviation note in the error details".
   - `tools/world-mcp/tests/tools/list-records.test.ts` covers MCPENH-034's validation assertions per the precedent ticket; no existing test asserts the response carries an accepted-key set (because no such field exists at HEAD).
   - `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` document MCPENH-034's validation behavior but don't yet describe the discoverability extension.
   - `git status --porcelain` returned only `.codex/skills/implement-spec-tickets/SKILL.md` and untracked report/ticket/spec drafts plus this-session canon-addition writes under `worlds/erotica-world/` — none in the Phase 5 grep scope; the gap is genuinely present at HEAD.
2. **Doc reassessment.** Archive content-grep `grep -lniE '(list_records.*fields|projection.*key|valid.*key.*enum|describe_record_projection|fields.*enum)' archive/tickets/MCPENH-*.md archive/tickets/VALENH-*.md` returned hits at MCPENH-003, MCPENH-007, MCPENH-021, MCPENH-023, MCPENH-024, MCPENH-030, MCPENH-034, VALENH-001, VALENH-011, VALENH-015. Reading MCPENH-034 specifically (the closest match): MCPENH-034's Outcome states "Hybrid default/projection mode now rejects `fields` outside the metadata wrapper keys" and "Atomic and story-bundle default/projection modes now reject `fields` that are absent from every parsed record in a non-empty result set" and "Valid-key projection output remains unchanged" — the validation IS implemented per MCPENH-034, but the error response does NOT enumerate the accepted set. MCPENH-034's Deviations §1 acknowledges "Empty atomic/story-bundle record sets still cannot validate unknown `fields` keys because there is no parsed response shape to inspect" — the same limitation applies to the accepted-key derivation. None of the archived tickets has an Outcome that adds `accepted_projection_keys` to the error response.
3. **Shared boundary under audit.** The MCP error-response contract between `@worldloom/world-mcp` (the error producer at `tools/world-mcp/src/tools/list-records.ts`) and the operator-facing skill prose that consumes the error (canon-addition's references/retrieval-tool-tree.md, character-generation, propose-new-canon-facts, every retrieval-using skill). The contract today: `details.unknown_projection_keys` carries the offending key. The contract tomorrow: `details.unknown_projection_keys` carries the offending key AND `details.accepted_projection_keys` carries the sorted accepted-key set for the record_type's response shape (or an empty array with a deviation note when atomic/story-bundle empty-result-set prevents derivation). Additive — no consumer parsing the existing `unknown_projection_keys` field breaks.
4. **Existing output schema extension.** The MCP error-response shape for `list_records.invalid_input` is the existing schema being extended. Today: `{code: 'invalid_input', message: "Unknown list_records fields key 'X'.", details: {field: 'fields', unknown_projection_keys: [...], record_type: '...'}}`. Tomorrow: the same shape PLUS `details.accepted_projection_keys: [sorted string array]`. The extension is additive-only (new optional field with a sorted default); no consumer that parses `unknown_projection_keys` breaks. Hybrid mode always populates the static metadata wrapper keys (`record_id`, `record_kind`, `title`, `content_hash`, `file_path`); atomic and story-bundle modes populate the union of top-level keys derived from at least one matched parsed row when the result set is non-empty, and an empty array with a `note` field ("empty-result-set: accepted keys cannot be derived; consult the YAML schema at tools/validators/src/schemas/<record-class>.schema.json") when it's empty.

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
4. **Empty-result-set fallback** → automated test: assert that `list_records({record_type: 'open_question_record', filters: {id: 'OQ-99999'}, fields: ['xxx']})` (empty result set) returns `accepted_projection_keys: []` AND a `note` field naming the schema-file fallback.
5. **README / MACHINE-FACING-LAYER doc cross-check** → manual review: `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` `list_records` API sections document the `accepted_projection_keys` field including the empty-result-set fallback behavior.

## What to Change

### 1. Extend the unknown-keys helper to also return accepted keys

In `tools/world-mcp/src/tools/list-records.ts`, locate the `unknownProjectionKeys(record_type, projectionSources, fields, include_full_body)` helper. Refactor to either return a tuple `[unknown: string[], accepted: string[]]` OR introduce a sibling `acceptedProjectionKeys(record_type, projectionSources, include_full_body)` helper that returns the sorted accepted set. The accepted set is:

- **Hybrid mode** (`record_type in {character_record, diegetic_artifact_record, adjudication_record}`): `['content_hash', 'file_path', 'record_id', 'record_kind', 'title']` (the static metadata wrapper keys per MCPENH-034's hybrid validation).
- **Atomic mode**: the union of top-level keys across all `projectionSources` (parsed-record bodies). If `projectionSources` is empty (zero rows matched), return `[]`.
- **Story-bundle mode**: same as atomic mode but scoped to the `story_slug` filter.
- **Full-body mode** (`include_full_body === true`): N/A — `fields` is ignored in full-body mode per MCPENH-034.

Update the `createMcpError` call site at line 449-454:

```ts
if (unknownFieldKeys.length > 0) {
  const acceptedKeys = acceptedProjectionKeys(args.record_type, parsedRows.map((entry) => entry.projectionSource), args.include_full_body);
  return createMcpError("invalid_input", `Unknown list_records fields key '${unknownFieldKeys[0]}'.`, {
    field: "fields",
    unknown_projection_keys: unknownFieldKeys,
    record_type: args.record_type,
    accepted_projection_keys: acceptedKeys,
    ...(acceptedKeys.length === 0 ? {note: "Empty result set: accepted keys cannot be derived. Consult the YAML schema at tools/validators/src/schemas/<record-class>.schema.json or omit `fields` to receive the default projection."} : {}),
  });
}
```

### 2. New tests asserting the response shape

In `tools/world-mcp/tests/tools/list-records.test.ts`, add three new test cases:
- Atomic-mode accepted-keys derivation (rejected `fields` returns `accepted_projection_keys` with the parsed-record top-level keys).
- Hybrid-mode accepted-keys derivation (rejected `fields` for `character_record` returns the static metadata wrapper keys).
- Empty-result-set fallback (rejected `fields` with a filter that matches zero rows returns `accepted_projection_keys: []` plus the `note` field).

### 3. Document the response-shape extension

In `tools/world-mcp/README.md` `list_records` API section, append:

> When `fields` validation rejects an unknown key, the error response includes `details.accepted_projection_keys` listing the sorted set of valid projection keys for the request's `record_type` and mode (hybrid metadata wrapper keys, or atomic/story-bundle parsed-record top-level keys). For empty result sets, atomic and story-bundle modes return `accepted_projection_keys: []` plus a `details.note` field naming the per-class JSON schema as the fallback discoverability surface.

In `docs/MACHINE-FACING-LAYER.md` `list_records` table row, mirror the same paragraph at the `fields` validation surface description.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify) — extend the unknown-keys helper and the createMcpError call site
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify) — three new test cases
- `tools/world-mcp/README.md` (modify) — `list_records` API section response-shape paragraph
- `docs/MACHINE-FACING-LAYER.md` (modify) — `list_records` table row response-shape paragraph

## Out of Scope

- Adding a new `mcp__worldloom__describe_record_projection` tool (rejected per Architecture Check option B).
- Changing the existing `unknown_projection_keys` field shape or removing it.
- Backporting accepted-keys derivation to other MCP error responses (e.g., unknown-filter-key errors); separate scope if needed.
- The empty-result-set limitation is a documented deviation, not fixed by this ticket.
- Per-record-type projection-key documentation in any skill prose (canon-addition's references/retrieval-tool-tree.md, etc.) — those skills consume the new error response naturally; documenting per-record-type field lists in skill prose duplicates the JSON schemas and risks drift.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__list_records({world_slug: 'erotica-world', record_type: 'open_question_record', fields: ['question_summary']})` returns an error with `details.accepted_projection_keys` listing the sorted top-level keys of OQ records (`['caution', 'extensions', 'id', 'record_kind', 'topic', 'when_to_resolve']` or similar — exact list depends on parsed-record shape).
2. `mcp__worldloom__list_records({world_slug: 'erotica-world', record_type: 'character_record', fields: ['character_name']})` returns an error with `details.accepted_projection_keys: ['content_hash', 'file_path', 'record_id', 'record_kind', 'title']` (hybrid metadata wrapper keys).
3. `mcp__worldloom__list_records({world_slug: 'erotica-world', record_type: 'open_question_record', filters: {id: 'OQ-99999'}, fields: ['xxx']})` (empty result set) returns `details.accepted_projection_keys: []` AND `details.note` naming the schema-file fallback.
4. `cd tools/world-mcp && npm test` passes including the three new test cases.
5. Existing `tools/world-mcp/tests/tools/list-records.test.ts` cases pass without regression.

### Invariants

1. The error response for `unknown_projection_keys` rejection ALWAYS includes `accepted_projection_keys` (possibly empty for empty-result-set atomic/story-bundle modes).
2. Hybrid-mode `accepted_projection_keys` is the static set `['content_hash', 'file_path', 'record_id', 'record_kind', 'title']` regardless of result-set size.
3. The existing `unknown_projection_keys` field continues to carry the offending input keys (no removal, no rename).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` (modify) — add atomic-mode, hybrid-mode, and empty-result-set test cases for the `accepted_projection_keys` response field.

### Commands

1. `cd tools/world-mcp && npm run build && npm test`
2. `rg -n 'accepted_projection_keys' tools/world-mcp/src/tools/list-records.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` (codebase grep-proof of the new surface)
