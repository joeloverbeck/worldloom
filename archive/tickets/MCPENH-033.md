# MCPENH-033: `record_kind` injection asymmetry between MCP retrieval and patch payloads — surface a foot-gun-resistant convention

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — Option B landed in `tools/validators/src/schemas/*.schema.json`; cross-skill prose correction in `.claude/skills/canon-addition/references/engine-envelope-shape.md`; retrieval/payload contract note in `tools/world-mcp/README.md`
**Deps**: none

## Problem

The MCP retrieval tools (`mcp__worldloom__get_record`, `mcp__worldloom__get_records`, `mcp__worldloom__list_records`) inject a `record_kind` discriminator field at the top level of every parsed-record response. This is for consumer-side TypeScript-friendly typed-union convenience — the response type at `tools/world-mcp/src/tools/get-record.ts` lines 39-45 declares `({ record_kind: "canon_fact" } & CanonFactRecord) | ({ record_kind: "change_log" } & ChangeLogEntry) | ...`. The injection happens at retrieval time per `get-record.ts:294` (`record_kind: row.node_type`), `:319` (`record_kind: recordKind`), `:614, :624` (per-call injections), and parallel sites in `get-records.ts` and `list-records.ts`.

The on-disk YAML records under `worlds/<slug>/_source/<subdir>/*.yaml` do NOT carry this field. Direct inspection (`head -3 worlds/erotica-world/_source/canon/CF-0001.yaml`) shows the file body starts directly at the actual record fields (e.g., `contradiction_risk:`). `grep -rn "record_kind" tools/patch-engine/src/` returns zero matches — the patch engine does NOT add `record_kind` at write time. The on-disk shape is entirely without the discriminator.

At intake, the patch-engine schemas (`tools/validators/src/schemas/canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`) declared `additionalProperties: false` and did NOT list `record_kind` in their `properties`. Patch payloads that included `record_kind` failed `record_schema_compliance.additionalProperties` at validate time.

The asymmetry created a foot-gun for the natural learn-by-example pattern. Operators authoring patch payloads commonly mirror the shape of an existing record by inspecting `mcp__worldloom__get_record(record_id)` or `get_records([record_ids])`. The retrieval response has `record_kind` at the top level; before this ticket, copying the entire response into the payload constructor could fail with `additionalProperties` verdicts. Option B resolves this by accepting matching retrieval discriminators while preserving discriminator mismatch failures.

This ticket proposes addressing the asymmetry rather than papering over it with prose-level discipline alone. (The canon-addition skill prose now warns operators about the asymmetry per the audit cycle that surfaced this finding — but the prose-level fix is downstream of the structural foot-gun.)

## Assumption Reassessment (2026-05-04)

1. Verified at HEAD: MCP retrieval tools inject `record_kind`. `grep "record_kind" tools/world-mcp/src/tools/get-record.ts` shows the discriminated-union response type at lines 39-45 and per-call injections at lines 294, 319, 532, 614, 624. Same pattern in `get-records.ts` (via the shared response shape) and `list-records.ts:141, 153, 161, 244, 261, 273`.
2. Verified at HEAD: on-disk YAML records do NOT carry `record_kind`. Direct `head -3` of `worlds/erotica-world/_source/canon/CF-0001.yaml`, `change-log/CH-0001.yaml`, `mystery-reserve/M-1.yaml`, `open-questions/OQ-0001.yaml` shows file bodies starting at the actual record fields with no discriminator at the top.
3. Verified at HEAD: patch engine does NOT write `record_kind`. `grep -rn "record_kind" tools/patch-engine/src/` returns zero matches. The engine writes the YAML body verbatim from the `cf_record` / `ch_record` / `m_record` / `oq_record` payload values; if the payload doesn't include `record_kind`, neither does the on-disk file.
4. Verified at intake: patch schemas rejected `record_kind`. All four originally named schemas (`canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`) declared `additionalProperties: false`; none listed `record_kind` in their `properties`. Final implementation updates those four plus `invariant.schema.json`, `entity.schema.json`, and `section.schema.json`.
5. Cross-skill / cross-artifact boundary: this ticket touches BOTH the MCP retrieval contract (every consumer of `get_record` / `get_records` / `list_records`) AND the patch-engine schema contract (every canon-mutating skill: canon-addition, create-base-world, story-fact-promotion-to-canon's transitive canon-addition handoff). The shared boundary is the on-disk record shape; both the retrieval tools and the patch engine are speaking about the same canonical record but flow it through different contracts.
6. Per Rule 6 retcon attribution: the intake behavior was "MCP retrieval injects `record_kind` for typed-union convenience; patch schemas reject it; on-disk records don't have it; operators mirroring retrieval shape into patch payloads hit a foot-gun." The landed behavior is "MCP retrieval injects `record_kind`; patch schemas accept matching discriminators and reject mismatches; on-disk records still don't have it."
7. Pipeline-wide rename / removal scope: Option B was chosen, so retrieval consumers and patch-engine ops are unaffected. The live blast radius is the seven atomic authored-record schemas, validator tests, canon-addition reference prose, and `tools/world-mcp/README.md`.
8. Final reassessment selected Option B. It is the smallest non-breaking fix: retrieval consumers keep the existing response shape, the patch engine stays pure, and authored-record schemas now accept only the matching `record_kind` const. Required same-seam widening: the ticket's four-schema draft was incomplete because MCP retrieval injects `record_kind` for all seven atomic record classes, so `invariant.schema.json`, `entity.schema.json`, and `section.schema.json` were included with the four originally named schemas.
9. `docs/HARD-GATE-DISCIPLINE.md` was read because this changes a pre-apply validation signal used by hard-gate patch-plan validation. The change remains fail-closed for mismatched discriminators and does not relax approval-token, submit, write-order, or Mystery Reserve firewall behavior.
10. Cross-skill sweep found the stale same-seam prose only in `.claude/skills/canon-addition/references/engine-envelope-shape.md`; `docs/MACHINE-FACING-LAYER.md` and `docs/CONTEXT-PACKET-CONTRACT.md` describe hybrid/story-bundle `record_kind` response bodies and remained true.

## Architecture Check

1. Three remediation options with distinct trade-offs:

   - **Option A — wrap retrieval response so `record_kind` is clearly metadata.** Change retrieval response shape from `{ record_kind, ...record_fields }` to `{ record_kind, record: {...record_fields} }`. The `record` sub-object carries the on-disk shape exactly; `record_kind` is sibling metadata. Operators mirroring the retrieval shape would copy `response.record` into the payload constructor and never trip the asymmetry. Trade-off: breaking change to every retrieval consumer. Cleanest separation of concerns; highest implementation cost.
   - **Option B — relax patch schemas to allow `record_kind`.** Add `record_kind` as an optional property in each schema's `properties` map (with a const-or-enum value matching the discriminator) and either remove `additionalProperties: false` (looser; rejected) or keep it but explicitly list `record_kind`. The schema would validate that `record_kind: "canon_fact"` matches the canon-fact-record schema's discriminator and reject inconsistent values. Trade-off: schemas grow slightly; operators who include `record_kind` are no longer punished; the foot-gun is removed without a breaking change. Cheapest implementation; preserves existing behavior for operators who don't include the field.
   - **Option C — engine-side strip.** Have the patch engine strip `record_kind` from incoming payloads before schema validation. Trade-off: the asymmetry is hidden, not addressed; on-disk records remain consistent (no change); the foot-gun is silenced. Least preferred because it masks the asymmetry rather than acknowledging it; future operators won't learn the on-disk shape from the retrieval shape, just bypass the validator.

   Option B was chosen. It is the cheapest idempotent remediation and avoids a breaking MCP retrieval response change.
2. No backwards-compatibility shims under any option.

## Verification Layers

1. Asymmetry resolution -> schema validation: `validatePatchPlan` accepts a `create_cf_record` payload with `record_kind: "canon_fact"` and no `additionalProperties` verdicts.
2. On-disk shape preservation -> codebase grep-proof / schema fixture proof: `rg -n 'record_kind' worlds/erotica-world/_source tests/fixtures/animalia/_source -g '*.yaml'` returns no matches for world-canon atomic records; the schema conformance test also asserts animalia atomic fixtures remain free of on-disk `record_kind`.
3. Schema consistency -> schema validation: all seven atomic schemas accept only their matching discriminator const and reject mismatches.
4. Hard-gate validation safety -> targeted package command: `npm test` in `tools/validators` passes, including pre-apply `validatePatchPlan` acceptance and rejection coverage.

## Landed Changes

### 1. Chosen remediation option

Option B landed.

### 2. Schema acceptance

Edited all seven atomic authored-record schemas (`canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `invariant.schema.json`, `entity.schema.json`, `section.schema.json`) to add `record_kind` as an optional property with a `const` value matching the retrieval discriminator. `additionalProperties: false` remains in place.

### 3. Skill-prose correction in canon-addition's engine-envelope-shape.md §2

Replaced the false "engine-added" subsection with text that attributes `record_kind` to MCP retrieval-time injection, says matching discriminators are accepted by schema validation, and states that on-disk YAML records do not carry the field.

### 4. Cross-skill ripple

Grepped `.claude/skills/`, `docs/`, and package docs for stale on-disk/retrieval-shape conflations. Updated `tools/world-mcp/README.md` with the retrieval-metadata versus patch-payload convention.

## Files to Touch

- `tools/validators/src/schemas/canon-fact-record.schema.json` (modify)
- `tools/validators/src/schemas/change-log-entry.schema.json` (modify)
- `tools/validators/src/schemas/mystery-reserve.schema.json` (modify)
- `tools/validators/src/schemas/open-question.schema.json` (modify)
- `tools/validators/src/schemas/invariant.schema.json` (modify)
- `tools/validators/src/schemas/entity.schema.json` (modify)
- `tools/validators/src/schemas/section.schema.json` (modify)
- `tools/validators/tests/schemas/corpus-conformance.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify)
- `tools/world-mcp/README.md` (modify)

## Out of Scope

- Changes to the on-disk YAML record shape itself. The on-disk shape is correct (no `record_kind`); the asymmetry is between retrieval contract and patch schema, both of which describe the same on-disk record but differ in what they include around it.
- Changes to `mcp__worldloom__list_records`'s hybrid-record metadata-mode behavior (which uses `record_kind` as part of the compact metadata response per the existing convention; the metadata-mode is already structurally clear that the response is metadata not the record body). The asymmetry surfaces in default/projection mode and full-body mode, where the response carries the parsed record with `record_kind` injected.
- Changing the discriminator name from `record_kind` to something else (e.g., `record_type` to match other field naming conventions). This is a separate cosmetic concern; out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. A patch payload that includes `record_kind: "canon_fact"` for a `create_cf_record` op validates cleanly.
2. A patch payload that includes `record_kind: "change_log"` for the same op fails with `record_schema_compliance.const`.
3. All seven atomic schemas accept matching `record_kind` values and reject mismatches.
4. Atomic on-disk YAML fixtures remain free of `record_kind`.

### Invariants

1. The on-disk YAML records under `worlds/<slug>/_source/<subdir>/*.yaml` do NOT carry `record_kind` after any write through the patch engine. (Preserved across all three options.)
2. Patch validation does not fail on matching `record_kind` presence under Option B.
3. The retrieval response's `record_kind` discriminator value is consistent with the record's actual class (e.g., a CF record never carries `record_kind: "change_log"`).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/corpus-conformance.test.ts` — asserts each atomic schema accepts matching `record_kind`, rejects mismatches, and checked fixtures do not store `record_kind` on disk.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — asserts pre-apply `validatePatchPlan` accepts matching `record_kind` in a `create_cf_record` payload and rejects mismatched discriminators.

### Commands

1. `npm test` from `tools/validators`.
2. `rg -n 'record_kind' worlds/erotica-world/_source tests/fixtures/animalia/_source -g '*.yaml'`.
3. `rg -n 'Engine-added `record_kind`|MUST NOT include `record_kind`|On-disk records under `_source/<subdir>/\*.yaml` carry|engine adds this field|Patch payloads MUST NOT include' .claude/skills docs tools/world-mcp/README.md`.

## Outcome

Option B landed. All seven atomic authored-record schemas now allow an optional retrieval `record_kind` field only when it matches the class-specific const. The validator package now proves both matching-discriminator acceptance and mismatch rejection, including through the pre-apply `validatePatchPlan` path used by hard-gate flows. Canon-addition prose now correctly says `record_kind` is retrieval-time metadata, not an engine-written on-disk field, and `tools/world-mcp/README.md` documents the retrieval-metadata versus patch-payload convention.

## Verification Result

1. `npm test` in `tools/validators` — passed; 96 tests passed.
2. `rg -n 'record_kind' worlds/erotica-world/_source tests/fixtures/animalia/_source -g '*.yaml'` — passed with no matches for world-canon atomic records / checked atomic fixtures.
3. `rg -n 'Engine-added `record_kind`|MUST NOT include `record_kind`|On-disk records under `_source/<subdir>/\*.yaml` carry|engine adds this field|Patch payloads MUST NOT include' .claude/skills docs tools/world-mcp/README.md` — passed with no stale same-seam prose hits.

## Deviations

The ticket's broad `worlds/<test-world>/_source/` negative grep was narrowed to world-canon atomic source paths. Story-bundle `_source` records in the local `worlds/erotica-world/stories/.../_source/` tree intentionally carry their own story-record `record_kind` fields and are outside this ticket's atomic world-canon payload seam.
