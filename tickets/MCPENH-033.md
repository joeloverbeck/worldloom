# MCPENH-033: `record_kind` injection asymmetry between MCP retrieval and patch payloads — surface a foot-gun-resistant convention

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — choice of `tools/world-mcp/src/tools/get-record.ts` + `get-records.ts` + `list-records.ts` (Option A) OR `tools/validators/src/schemas/*.schema.json` (Option B) OR `tools/patch-engine/src/ops/*.ts` (Option C); cross-skill prose correction in `.claude/skills/canon-addition/references/engine-envelope-shape.md` §2 sub-section regardless of option chosen
**Deps**: none

## Problem

The MCP retrieval tools (`mcp__worldloom__get_record`, `mcp__worldloom__get_records`, `mcp__worldloom__list_records`) inject a `record_kind` discriminator field at the top level of every parsed-record response. This is for consumer-side TypeScript-friendly typed-union convenience — the response type at `tools/world-mcp/src/tools/get-record.ts` lines 39-45 declares `({ record_kind: "canon_fact" } & CanonFactRecord) | ({ record_kind: "change_log" } & ChangeLogEntry) | ...`. The injection happens at retrieval time per `get-record.ts:294` (`record_kind: row.node_type`), `:319` (`record_kind: recordKind`), `:614, :624` (per-call injections), and parallel sites in `get-records.ts` and `list-records.ts`.

The on-disk YAML records under `worlds/<slug>/_source/<subdir>/*.yaml` do NOT carry this field. Direct inspection (`head -3 worlds/erotica-world/_source/canon/CF-0001.yaml`) shows the file body starts directly at the actual record fields (e.g., `contradiction_risk:`). `grep -rn "record_kind" tools/patch-engine/src/` returns zero matches — the patch engine does NOT add `record_kind` at write time. The on-disk shape is entirely without the discriminator.

The patch-engine schemas (`tools/validators/src/schemas/canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`) declare `additionalProperties: false` and do NOT list `record_kind` in their `properties`. Patch payloads that include `record_kind` fail `record_schema_compliance.additionalProperties` at validate time.

The asymmetry creates a foot-gun for the natural learn-by-example pattern. Operators authoring patch payloads commonly mirror the shape of an existing record by inspecting `mcp__worldloom__get_record(record_id)` or `get_records([record_ids])`. The retrieval response has `record_kind` at the top level; the operator copies the entire response into the payload constructor; validate fails with eight `additionalProperties` verdicts (one per CF/CH/M/OQ record in the plan). Recovery requires stripping `record_kind` from every payload and re-running validate.

This ticket proposes addressing the asymmetry rather than papering over it with prose-level discipline alone. (The canon-addition skill prose now warns operators about the asymmetry per the audit cycle that surfaced this finding — but the prose-level fix is downstream of the structural foot-gun.)

## Assumption Reassessment (2026-05-04)

1. Verified at HEAD: MCP retrieval tools inject `record_kind`. `grep "record_kind" tools/world-mcp/src/tools/get-record.ts` shows the discriminated-union response type at lines 39-45 and per-call injections at lines 294, 319, 532, 614, 624. Same pattern in `get-records.ts` (via the shared response shape) and `list-records.ts:141, 153, 161, 244, 261, 273`.
2. Verified at HEAD: on-disk YAML records do NOT carry `record_kind`. Direct `head -3` of `worlds/erotica-world/_source/canon/CF-0001.yaml`, `change-log/CH-0001.yaml`, `mystery-reserve/M-1.yaml`, `open-questions/OQ-0001.yaml` shows file bodies starting at the actual record fields with no discriminator at the top.
3. Verified at HEAD: patch engine does NOT write `record_kind`. `grep -rn "record_kind" tools/patch-engine/src/` returns zero matches. The engine writes the YAML body verbatim from the `cf_record` / `ch_record` / `m_record` / `oq_record` payload values; if the payload doesn't include `record_kind`, neither does the on-disk file.
4. Verified at HEAD: patch schemas reject `record_kind`. All four (`canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`) declare `additionalProperties: false`; none list `record_kind` in their `properties`.
5. Cross-skill / cross-artifact boundary: this ticket touches BOTH the MCP retrieval contract (every consumer of `get_record` / `get_records` / `list_records`) AND the patch-engine schema contract (every canon-mutating skill: canon-addition, create-base-world, story-fact-promotion-to-canon's transitive canon-addition handoff). The shared boundary is the on-disk record shape; both the retrieval tools and the patch engine are speaking about the same canonical record but flow it through different contracts. The implementer should pick a remediation option (A / B / C below) that resolves the asymmetry at exactly one site rather than two.
6. Per Rule 6 retcon attribution: the existing behavior is "MCP retrieval injects `record_kind` for typed-union convenience; patch schemas reject it; on-disk records don't have it; operators mirroring retrieval shape into patch payloads hit a foot-gun." The new behavior depends on the chosen option (A / B / C). Each option resolves the asymmetry at a different site; each is warranted because the current asymmetry was discovered through a canon-addition session this audit examines (one full validate-fail-and-rebuild cycle, eight `additionalProperties` verdicts on a single first attempt).
7. Pipeline-wide rename / removal scope: if Option A (wrap retrieval response so `record_kind` is metadata-side) is chosen, every consumer of `get_record` / `get_records` / `list_records` that destructures the response shape needs to know about the wrapping. The blast radius spans `.claude/skills/*` (skills consuming retrieval responses) and any TypeScript consumers under `tools/`. Grep `tools/` for response-shape destructuring patterns and audit each. If Option B (schema acceptance) is chosen, the blast radius is the four schema files; consumers are unaffected. If Option C (engine strip) is chosen, the blast radius is the engine ops; consumers are unaffected but the foot-gun is silently masked rather than addressed (least preferred).

## Architecture Check

1. Three remediation options with distinct trade-offs:

   - **Option A — wrap retrieval response so `record_kind` is clearly metadata.** Change retrieval response shape from `{ record_kind, ...record_fields }` to `{ record_kind, record: {...record_fields} }`. The `record` sub-object carries the on-disk shape exactly; `record_kind` is sibling metadata. Operators mirroring the retrieval shape would copy `response.record` into the payload constructor and never trip the asymmetry. Trade-off: breaking change to every retrieval consumer. Cleanest separation of concerns; highest implementation cost.
   - **Option B — relax patch schemas to allow `record_kind`.** Add `record_kind` as an optional property in each schema's `properties` map (with a const-or-enum value matching the discriminator) and either remove `additionalProperties: false` (looser; rejected) or keep it but explicitly list `record_kind`. The schema would validate that `record_kind: "canon_fact"` matches the canon-fact-record schema's discriminator and reject inconsistent values. Trade-off: schemas grow slightly; operators who include `record_kind` are no longer punished; the foot-gun is removed without a breaking change. Cheapest implementation; preserves existing behavior for operators who don't include the field.
   - **Option C — engine-side strip.** Have the patch engine strip `record_kind` from incoming payloads before schema validation. Trade-off: the asymmetry is hidden, not addressed; on-disk records remain consistent (no change); the foot-gun is silenced. Least preferred because it masks the asymmetry rather than acknowledging it; future operators won't learn the on-disk shape from the retrieval shape, just bypass the validator.

   Recommend Option A or Option B. Option B is the cheapest and most idempotent; Option A is the cleanest. Implementer chooses per project trade-offs.
2. No backwards-compatibility shims under any option.

## Verification Layers

1. Asymmetry resolution → schema validation: under chosen option, a patch payload that mirrors a retrieval response verbatim (including `record_kind` if Option A leaves it on the wrapper, or with `record_kind` at top level if Option B accepts it) validates without `additionalProperties` errors.
2. On-disk shape preservation → codebase grep-proof: `grep -rn "record_kind" worlds/<test-world>/_source/` returns zero matches after any new write (the on-disk shape stays clean of the discriminator regardless of which option is chosen — no on-disk schema change).
3. Retrieval consumer compatibility (Option A only) → skill dry-run: every canon-pipeline-adjacent skill that consumes retrieval responses runs end-to-end without broken destructuring assertions.
4. Schema consistency (Option B only) → schema validation: the discriminator constraint (`record_kind: const "canon_fact"` for the CF schema, etc.) rejects payloads with mismatched discriminators (e.g., `{record_kind: "change_log", ...CF-fields}`).
5. Engine purity (Option C only, if chosen) → codebase grep-proof: `grep -rn "record_kind" tools/patch-engine/src/` shows the strip happens at exactly one well-named site (e.g., a `stripRetrievalMetadata` utility) so future maintainers can find and reason about it.

## What to Change

### 1. Choose remediation option

The implementer makes the architectural decision per the trade-offs in the Architecture Check above. The remaining sub-sections are conditional on that choice.

### 2. (Option A) Wrap retrieval response

Update `tools/world-mcp/src/tools/get-record.ts` response type to `{ record_kind, content_hash, file_path, record: ParsedRecord }`. Update `get-records.ts` and `list-records.ts` parallel response shapes. Update every TypeScript and skill-prose consumer that destructures `response.<field>` to use `response.record.<field>` (or destructure `record_kind` from the wrapper). Cross-skill cascade: `.claude/skills/*/references/retrieval-tool-tree.md` if any cite the response shape; `.claude/skills/*/SKILL.md` if any have inline retrieval-shape examples.

### 3. (Option B) Schema acceptance

Edit each of the four schemas (`canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`) to add `record_kind` as an optional property with a `const` value matching the schema's discriminator (e.g., `record_kind: { type: "string", const: "canon_fact" }` for canon-fact-record). Keep `additionalProperties: false`; the explicit allow-list is preferred over relaxing the constraint.

### 4. (Option C) Engine-side strip

In each of `tools/patch-engine/src/ops/create-cf-record.ts`, `create-ch-record.ts`, `create-m-record.ts`, `create-oq-record.ts`, `create-inv-record.ts`, `create-ent-record.ts`, `create-sec-record.ts`, add a `stripRetrievalMetadata(record)` utility call that removes `record_kind` (and any other retrieval-injected metadata) from the payload before schema validation. Centralize the utility in a shared module so the strip happens at exactly one site.

### 5. (All options) Skill-prose correction in canon-addition's engine-envelope-shape.md §2

The current §2 sub-section in `.claude/skills/canon-addition/references/engine-envelope-shape.md` (added during the audit cycle that produced this ticket) states "On-disk records under `_source/<subdir>/*.yaml` carry a `record_kind` discriminator field at the top of the YAML body" and "The engine adds this field at write time". Both clauses are factually wrong (verified by Assumption Reassessment items 2 and 3 above; on-disk records do NOT carry `record_kind`; the engine does NOT add it at write time). Replace the sub-section with text that correctly attributes `record_kind` to MCP retrieval-time injection and states the chosen remediation:

- (Under Option A) "The retrieval tools wrap parsed records as `{ record_kind, ..., record: { ...record_fields } }`; copy `response.record` into the patch payload, not the full retrieval response."
- (Under Option B) "Patch payloads MAY include `record_kind` (the schema accepts and validates it as a discriminator); on-disk YAML records do not carry the field."
- (Under Option C) "Patch payloads MAY include `record_kind` (the engine strips it before validation); on-disk YAML records do not carry the field."

### 6. (All options) Cross-skill ripple

Grep `.claude/skills/*/references/*.md` for citations of the on-disk record shape or retrieval response shape; correct any prose that conflates the two.

## Files to Touch

- (Option A) `tools/world-mcp/src/tools/get-record.ts`, `get-records.ts`, `list-records.ts` (modify) + every `.claude/skills/*/` consumer of retrieval responses (modify).
- (Option B) `tools/validators/src/schemas/canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json` (modify); also `invariant.schema.json`, `entity.schema.json`, `section.schema.json` (modify) for full coverage of the on-disk record classes that MCP retrieval also injects discriminators for.
- (Option C) `tools/patch-engine/src/ops/create-cf-record.ts`, `create-ch-record.ts`, `create-m-record.ts`, `create-oq-record.ts`, `create-inv-record.ts`, `create-ent-record.ts`, `create-sec-record.ts` (modify); shared utility module (new or modify).
- (All options) `.claude/skills/canon-addition/references/engine-envelope-shape.md` §2 sub-section (modify) — correct the falsified premise and align with chosen option.
- (All options) `tools/world-mcp/README.md` (modify) — describe the retrieval-vs-payload contract under chosen option.

## Out of Scope

- Changes to the on-disk YAML record shape itself. The on-disk shape is correct (no `record_kind`); the asymmetry is between retrieval contract and patch schema, both of which describe the same on-disk record but differ in what they include around it.
- Changes to `mcp__worldloom__list_records`'s hybrid-record metadata-mode behavior (which uses `record_kind` as part of the compact metadata response per the existing convention; the metadata-mode is already structurally clear that the response is metadata not the record body). The asymmetry surfaces in default/projection mode and full-body mode, where the response carries the parsed record with `record_kind` injected.
- Changing the discriminator name from `record_kind` to something else (e.g., `record_type` to match other field naming conventions). This is a separate cosmetic concern; out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. (Option A) A patch payload constructed from `response.record` validates without `additionalProperties` errors. The wrapper's `record_kind` field is consumer-only metadata; never copied into the payload.
2. (Option B) A patch payload that includes `record_kind: "canon_fact"` for a `create_cf_record` op validates cleanly; a payload that includes `record_kind: "change_log"` for the same op fails with a discriminator-mismatch error (the schema rejects inconsistent discriminators).
3. (Option C) A patch payload that includes `record_kind: "canon_fact"` validates cleanly (the engine strips before schema check); the on-disk YAML written by the engine does NOT carry `record_kind`.
4. (All options) A representative canon-addition Phase-13a patch plan that mirrors a retrieval response into a `cf_record` payload validates without the `additionalProperties` foot-gun firing.

### Invariants

1. The on-disk YAML records under `worlds/<slug>/_source/<subdir>/*.yaml` do NOT carry `record_kind` after any write through the patch engine. (Preserved across all three options.)
2. Patch validation does not fail on `record_kind` presence under the chosen remediation. (Resolved by all three options.)
3. The retrieval response's `record_kind` discriminator value is consistent with the record's actual class (e.g., a CF record never carries `record_kind: "change_log"`).

## Test Plan

### New/Modified Tests

1. (Option A) `tools/world-mcp/src/tools/__tests__/get-record.test.ts` and parallel test files — assert response shape `{ record_kind, ..., record: {...} }`.
2. (Option B) `tools/validators/src/schemas/__tests__/<schema>.test.ts` for each affected schema — assert `record_kind: const "..."` validates and mismatches reject.
3. (Option C) `tools/patch-engine/src/ops/__tests__/create-cf-record.test.ts` and siblings — assert `stripRetrievalMetadata` removes `record_kind` from the payload pre-schema-check; assert on-disk YAML never carries the field.
4. (All options) `.claude/skills/canon-addition/__tests__/<integration>.test.ts` (or equivalent skill-dry-run smoke) — assert the mirror-from-retrieval pattern works end-to-end without `additionalProperties` errors.

### Commands

1. `pnpm -C tools/world-mcp test` (Option A) — full retrieval-tools test pass.
2. `pnpm -C tools/validators test` (Option B) — full schema-validation test pass.
3. `pnpm -C tools/patch-engine test` (Option C) — full patch-engine test pass.
4. `pnpm test` (all options) — full pipeline test pass.
5. (All options) Run a representative canon-addition session that mirrors retrieval shape into payloads; confirm validate runs clean on the first attempt.
