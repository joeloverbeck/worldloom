# VALENH-020: Loosen story-bundle cross-reference schema regexes to FOUNDATIONS-002's `^<CLASS>-[0-9]+$` form

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — story-bundle cross-reference regexes in `tools/validators/src/schemas/story-*.schema.json` plus focused structural schema coverage in `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`. No skill prose, no FOUNDATIONS edits, no hook changes.
**Deps**: `archive/tickets/FOUNDATIONS-002.md` (the contract the schemas must align with), `archive/tickets/VALENH-017-predicate-dsl-id-regex-foundations-002-alignment.md` (precedent for FOUNDATIONS-002-driven regex loosening on the predicate-DSL surface)

## Problem

At intake, the story-bundle JSON Schemas use `^<CLASS>-(0|[1-9][0-9]*)$` for both self-IDs and cross-reference fields. This pattern explicitly rejects zero-padded legacy IDs, but FOUNDATIONS-002 §22 stipulates "Engine regexes use `^<CLASS>-[0-9]+$`. The relaxed regex shape technically accepts padded legacy strings because `[0-9]+` matches them, but allocators and documentation now mint only unpadded IDs." The schemas are therefore tighter than the FOUNDATIONS contract authorizes.

Self-ID strictness is harmless (allocators emit unpadded only, so new records never have padded self-IDs to validate against). The damage is on **cross-reference fields** that legitimately point at pre-FOUNDATIONS-002 padded records that still exist on disk: `STENT.bound_char_id` referencing world-level `CHAR-NNNN` dossiers, and `SF.derived_from` referencing world-level `CF-NNNN` canon facts. Both are common-case bindings the bootstrap and turn-cycle skills depend on.

Session evidence (branching-story-bootstrap exercise, this Claude session, red-bunny bundle in erotica-world): every STENT record drafted with `bound_char_id: "CHAR-0005"` (Jon), `"CHAR-0003"` (Ane), or `"CHAR-0004"` (Marisa) failed validation with `record_schema_compliance.pattern` — `red-bunny:STENT-1 schema violation at /bound_char_id: must match pattern "^CHAR-(0|[1-9][0-9]*)$"`, repeated for STENT-2 and STENT-3. The same regex shape blocked SF records' `derived_from` arrays containing `CF-0005`, `CF-0006`, or any `CHAR-NNNN` parent-dossier reference. The operator's only available workaround was to set `bound_char_id: null` on all three STENT records and empty every SF `derived_from` array, then document the bindings only in `STORY_KERNEL.md` frontmatter and prose. The engine-side STENT↔CHAR binding — relied on by Hook 2 redirects, MCP `find_named_entities`, and any future cross-skill walker that traverses the binding — is now structurally absent for every cast member in the red-bunny bundle.

Codebase verification at HEAD confirms the gap: `tools/validators/src/schemas/story-entity.schema.json:12` declares `"bound_char_id": { "type": ["string", "null"], "pattern": "^CHAR-(0|[1-9][0-9]*)$" }`, and `tools/validators/src/schemas/story-fact.schema.json:16-22` declares `"derived_from": { "type": "array", "items": { "type": "string", "pattern": "^(CF|STENT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-(0|[1-9][0-9]*)$" } }`. Padded `CHAR-0001` through `CHAR-0005` exist at `worlds/erotica-world/characters/*.md`; padded `CF-0001` through `CF-0007` exist at `worlds/erotica-world/_source/canon/CF-NNNN.yaml` alongside unpadded `CF-8`, `CF-9`, `CF-10`. Working tree was clean at audit start (`git status --porcelain` returned empty).

VALENH-017 already established the precedent: the predicate-DSL ID regex at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` was loosened from `\d{4}` to `\d+` for exactly this kind of FOUNDATIONS-002 alignment problem. This ticket extends the same discipline to the JSON Schema cross-reference fields that VALENH-017 did not touch.

## Assumption Reassessment (2026-05-17)

1. **Codebase state at HEAD**: `tools/validators/src/schemas/story-entity.schema.json:12` confirms `bound_char_id` uses `"^CHAR-(0|[1-9][0-9]*)$"`. `tools/validators/src/schemas/story-fact.schema.json:16-22` confirms `derived_from` uses `"^(CF|STENT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-(0|[1-9][0-9]*)$"`. Similar patterns appear in `story-thread.schema.json:15`, `story-relationship.schema.json:75`, `story-diegetic-artifact.schema.json:18`, `story-status.schema.json:30`, `story-consequence.schema.json:16` (every story-bundle schema with a `derived_from` array uses the same overly-strict prefix-union regex). Self-ID patterns (`id`, `supersedes`, `story_id`, `parent_page_id`, `branch_id`, `created_at_page`, etc.) are out of scope for this ticket — allocators emit unpadded only, so self-ID strictness is harmless. Working tree was clean at audit start.
2. **Spec / doc state**: `docs/FOUNDATIONS.md` §Canonical Storage Layer (FOUNDATIONS-002 paragraph) states the canonical regex is `^<CLASS>-[0-9]+$`. `archive/tickets/FOUNDATIONS-002.md` §22 explicitly authorizes that the regex "technically accepts padded legacy strings because `[0-9]+` matches them" — this is intentional. `archive/tickets/FOUNDATIONS-002.md` §61 lists "Migration of existing world records" as out of scope. So FOUNDATIONS-002 deliberately chose a relaxed regex shape that accepts both forms, with allocators minting unpadded; the story-bundle JSON Schemas tightened that contract without authorization.
3. **Shared boundary under audit**: the contract between every story-bundle JSON Schema's cross-reference regex and FOUNDATIONS-002's canonical `^<CLASS>-[0-9]+$` form. The patch engine's pre-apply validator runs `record_schema_compliance` against every record being created; every cross-reference field carrying a regex stricter than FOUNDATIONS-002 silently rejects a class of legitimate live-data references. The unwritten invariant is: "every cross-reference regex along the patch-plan submit path accepts every ID format that FOUNDATIONS-002 mandates as canonical, including the padded legacy form `[0-9]+` admits." Cross-skill consumers downstream of the regex include `branching-story-bootstrap` (this audit's target), `branching-story-turn-cycle`, `commitment-block-authoring`, and `story-fact-promotion-to-canon` — every story-pipeline skill that emits records pointing at world-level CHAR or CF parents.
4. **FOUNDATIONS principle restated**: FOUNDATIONS-002 §Canonical Storage Layer is the design contract for ID suffixes; its stated regex is `^<CLASS>-[0-9]+$`; padded legacy forms are explicitly authorized as accepted-by-contract for backward compatibility because migration of existing world records was rejected as out-of-scope. The JSON Schemas tightened that regex to `^<CLASS>-(0|[1-9][0-9]*)$` without amending FOUNDATIONS-002. The validator must align with FOUNDATIONS-002, not the other way around; FOUNDATIONS-002 is the non-negotiable per CLAUDE.md.
5. **Existing-output schema extension**: this ticket modifies five+ existing engine-output JSON Schemas (`story-entity.schema.json`, `story-fact.schema.json`, `story-thread.schema.json`, `story-relationship.schema.json`, `story-diegetic-artifact.schema.json`, `story-status.schema.json`, `story-consequence.schema.json` — and any sibling whose cross-reference fields exhibit the same pattern). The change is **additive-only** in the sense that every reference that previously validated still validates (the tighter regex is a subset of the looser one); padded references that previously failed now validate. Schema consumers in the patch engine's `record_schema_compliance` validator and any downstream JSON-Schema-aware tooling continue to operate unchanged on unpadded references; padded references previously rejected are now accepted. No consumer breaks.
6. **Adjacent contradictions surfaced during reassessment**: every story-bundle JSON Schema with a cross-reference field using the strict `(0|[1-9][0-9]*)` suffix exhibits the same tightness pattern, not just the two surfaced in session evidence. A grep for `0\|[1-9][0-9]*` across `tools/validators/src/schemas/story-*.schema.json` is the canonical discovery surface; every match in a semantic cross-reference field is in scope. That includes `bound_*`, `derived_from`, participant/holder/location/object references, page snapshot references, event commitment/state-delta links, choice grounding links, and storylet effect/mystery links. Classification: required consequence of this ticket — the gap is a single defect manifesting across many schema reference surfaces; fixing only `bound_char_id` would leave sibling references broken in the same way. Self/lifecycle identity fields (`id`, `supersedes`, `story_id`, `created_at_page`, `parent_page_id`, `branch_id`, `branch_path`, `selected_slt_id`, `prose_plan_path`, and similar allocator-authored record identity or lineage fields) are NOT in scope — they remain strict because allocators emit unpadded only.
7. **Package baseline and ignored artifacts**: pre-edit `npm test` from `tools/validators` passed with 323/323 tests. `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored artifacts before this run; `dist/` will be refreshed by the validator build/test lane and is proof freshness, not a tracked source edit.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: a single regex-loosening per cross-reference field aligns each story-bundle JSON Schema with FOUNDATIONS-002's mandated `^<CLASS>-[0-9]+$` form. This is the minimal change that restores cross-reference validity for the entire pre-FOUNDATIONS-002 padded-record corpus across every world. The alternative — migrating every world's padded CHAR/CF records to unpadded form — is exactly what FOUNDATIONS-002 §61 rejected as out-of-scope and would require renaming files, updating every cross-reference inside every world bundle, and re-indexing every world database. The alternative of adding a `"pattern": "^<CLASS>-(0|[1-9][0-9]*|0[0-9]+)$"` alternation that explicitly enumerates the padded form is functionally equivalent to `[0-9]+` but redundant and noisier.
2. **No backwards-compatibility shim**: this is the opposite of a shim — it removes a stricter-than-contract regex and restores the FOUNDATIONS-002 contract. No alias / dual-regex / version-discriminator pattern is introduced. The new regex is the single canonical form; previously-passing references still pass; previously-failing-but-legitimate references now pass.

## Verification Layers

1. **Schema regex accepts padded legacy IDs** → package schema validation: `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js` passes with padded cross-reference records such as `CHAR-0005`, `CF-0005`, `STENT-0001`, `SE-0001`, and `M-0001`.
2. **Schema regex still rejects malformed refs** (no regression) → package schema validation: the same focused test passes with `CHAR-X` and `CF-` rejected via `record_schema_compliance.pattern`.
3. **Pre-apply validator path remains covered** → package validation lane: `cd tools/validators && npm test` passes after the schema edits and rebuild, including existing `validatePatchPlan` integration coverage that applies story-bundle record schemas to Shape B story ops.
4. **Sibling story-bundle schemas confirmed updated** → codebase grep-proof: `rg -n '0\|\[1-9\]\[0-9\]\*|\(0\|\[1-9\]\[0-9\]\*\)' tools/validators/src/schemas/story-*.schema.json` returns matches only on self/lifecycle identity or lineage fields, never on the loosened cross-reference fields.
5. **FOUNDATIONS alignment confirmed** → FOUNDATIONS alignment check: `docs/FOUNDATIONS.md` §Canonical Storage Layer states `^<CLASS>-[0-9]+$`; `[0-9]+` accepts both padded and unpadded forms, matching the schema after the change.

## Landed Changes

### 1. Loosen cross-reference regexes in story-bundle JSON Schemas

For each story-bundle schema file at `tools/validators/src/schemas/story-*.schema.json`, every property whose pattern used the strict `(0|[1-9][0-9]*)` suffix and whose semantic role is a cross-reference now uses a `[0-9]+` suffix.

Confirmed surfaces from implementation-time reassessment:
- `story-belief.schema.json` — `holder`, `basis.source_event`, `basis.access_records.items`, `consequences.opens.items`, `consequences.constrains_choices.items`
- `story-choice.schema.json` — `grounded_in.records.items`
- `story-entity.schema.json` — `bound_char_id` → `^CHAR-[0-9]+$`
- `story-event.schema.json` — `actor`, `targets.items`, `commitment.alias_bindings` values, `state_delta.create|supersede|close.items`, `promotion_claims.source_record`
- `story-fact.schema.json` — `derived_from.items` → `^(CF|STENT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$`
- `story-intention.schema.json` — `holder`
- `story-location.schema.json` — `bound_ent`
- `story-object.schema.json` — `owner`, `current_location`
- `story-obligation.schema.json` — `owed_by`, `owed_to`
- `story-page.schema.json` — `state_snapshot.canon_revision`, `entity_status.*.location`, `unresolved_mystery_claims.mystery_id`, `unresolved_mystery_claims.evidence_records.items`, `visible_affordances.grounded_in.items`, `visible_affordances.available_to.items`
- `story-relationship.schema.json` — `participants.items`, `direction.from`, `direction.to`, `derived_from.items`
- `story-status.schema.json` — `entity`, `location`, `derived_from.items`
- `story-storylet.schema.json` — `mystery_policy.forbidden_resolutions.items`, `$defs.effectReference`
- `story-thread.schema.json` — `derived_from.items`
- `story-diegetic-artifact.schema.json` — `author`, `intended_audience`, `derived_from.items`
- `story-consequence.schema.json` — `derived_from.items` → analogous loosening

The final strict-pattern grep confirms the remaining strict suffixes are self/lifecycle identity or lineage fields, not same-seam cross-reference fields.

Self/lifecycle identity patterns (`id`, `supersedes`, `story_id`, `parent_page_id`, `branch_id`, `created_at_page`, `forked_at_page_id`, `root_page_id`, `selected_slt_id`, and similar allocator-authored lineage fields) MUST NOT be loosened — they remain strict-unpadded because allocators emit unpadded only.

### 2. Add structural schema coverage

`tools/validators/tests/structural/contract-schema-roundtrip.test.ts` now asserts that representative padded legacy cross-references such as `CHAR-0005`, `CF-0005`, `STENT-0001`, `SE-0001`, `M-0001`, and sibling story-record references validate through `record_schema_compliance`, while malformed refs such as `CHAR-X` and `CF-` still fail with `record_schema_compliance.pattern`.

### 3. Rebuild the dist and confirm the test suite still passes

`cd tools/validators && npm run build` and `cd tools/validators && npm test` both pass. The build refreshes `tools/validators/dist/` as an ignored generated artifact; the tracked source of truth remains `src/schemas/` plus the TypeScript test.

## Files to Touch

- `tools/validators/src/schemas/story-entity.schema.json` (modify — `bound_char_id` regex)
- `tools/validators/src/schemas/story-fact.schema.json` (modify — `derived_from.items` regex)
- `tools/validators/src/schemas/story-thread.schema.json` (modify — `derived_from.items` regex)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify — `derived_from.items` regex)
- `tools/validators/src/schemas/story-diegetic-artifact.schema.json` (modify — author/intended-audience/derived-from reference regexes)
- `tools/validators/src/schemas/story-status.schema.json` (modify — `derived_from.items` regex)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify — `derived_from.items` regex)
- `tools/validators/src/schemas/story-belief.schema.json` (modify — holder/source/access/consequence reference regexes)
- `tools/validators/src/schemas/story-choice.schema.json` (modify — `grounded_in.records.items` regex)
- `tools/validators/src/schemas/story-event.schema.json` (modify — actor/target/alias/state-delta/promotion reference regexes)
- `tools/validators/src/schemas/story-intention.schema.json` (modify — `holder` regex)
- `tools/validators/src/schemas/story-location.schema.json` (modify — `bound_ent` regex)
- `tools/validators/src/schemas/story-object.schema.json` (modify — owner/location reference regexes)
- `tools/validators/src/schemas/story-obligation.schema.json` (modify — `owed_by` / `owed_to` regexes)
- `tools/validators/src/schemas/story-page.schema.json` (modify — snapshot reference regexes)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify — mystery/effect reference regexes)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify — positive padded-reference and malformed-reference coverage)

## Out of Scope

- Self-ID regex loosening (e.g., `STENT.id`, `SF.id`, `PG.id`). These remain strict because allocators emit unpadded only.
- Patch-engine pre-apply regex changes (allocator side). Allocators continue to emit unpadded; no behavior change there.
- Per-world migration of existing padded CHAR/CF records to unpadded form. Explicitly rejected by FOUNDATIONS-002 §61.
- Updating skill prose to disclose the cross-reference behavior. The `branching-story-bootstrap` SKILL.md does not currently mention `bound_char_id: null` as a fallback; once this ticket lands, the fallback is no longer needed. The skill prose currently does not document the fallback, so no skill-prose update is required (the bug existed silently).
- Loosening any non-story-bundle schema (e.g., `canon-fact-record.schema.json` cross-references). World-canon schemas are out of this ticket's scope; if a similar gap exists there, file a follow-up.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes after the schema edits and rebuild.
2. `node --test dist/tests/structural/contract-schema-roundtrip.test.js` passes after `cd tools/validators && npm run build`, including padded-reference acceptance and malformed-reference rejection coverage.
3. `rg -n '0\|\[1-9\]\[0-9\]\*|\(0\|\[1-9\]\[0-9\]\*\)' tools/validators/src/schemas/story-*.schema.json` returns only self/lifecycle identity or lineage fields after the change, not the loosened cross-reference fields.

### Invariants

1. Every cross-reference field in every story-bundle JSON Schema uses the FOUNDATIONS-002 canonical `^<CLASS>-[0-9]+$` form (or a multi-class prefix union with the same `[0-9]+` suffix shape).
2. Every reference to a pre-FOUNDATIONS-002 padded legacy record (CHAR-NNNN, CF-NNNN) from a newly-created story-bundle record validates against the schema.
3. Every reference malformed in shape (e.g., `CHAR-`, `CHAR-X`, empty string) still fails validation — the loosening expands accepted IDs, not accepted shapes.
4. Self-ID patterns remain strict-unpadded (allocator-aligned).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — added a focused schema-acceptance fixture asserting padded legacy cross-references validate and malformed cross-references still fail.

### Commands

1. `cd tools/validators && npm run build` — rebuild the compiled validator artifact.
2. `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js` — focused schema acceptance/rejection proof.
3. `cd tools/validators && npm test` — package-local validator suite.
4. `rg -n '0\|\[1-9\]\[0-9\]\*|\(0\|\[1-9\]\[0-9\]\*\)' tools/validators/src/schemas/story-*.schema.json` — confirms surviving strict patterns are self/lifecycle identity or lineage fields, not the loosened cross-reference fields.

## Outcome

Completed. Story-bundle JSON Schema cross-reference fields now align with FOUNDATIONS-002's `[0-9]+` suffix contract, so padded legacy references validate while malformed reference strings still fail. Self/lifecycle identity fields remain strict-unpadded.

## Verification Result

1. Pre-edit baseline: `cd tools/validators && npm test` — passed, 323/323 tests.
2. `cd tools/validators && npm run build` — passed.
3. `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js` — passed, 3/3 tests.
4. `cd tools/validators && npm test` — passed, 324/324 tests.
5. `rg -n '0\|\[1-9\]\[0-9\]\*|\(0\|\[1-9\]\[0-9\]\*\)' tools/validators/src/schemas/story-*.schema.json` — remaining hits are self/lifecycle identity or lineage fields (`id`, `supersedes`, `story_id`, `created_at_page`, page/branch lineage, selected SLT, emitted choice, and prose-plan path); loosened cross-reference fields no longer use the strict suffix.
6. Manual FOUNDATIONS alignment review — `docs/FOUNDATIONS.md` §Canonical Storage Layer states engine schemas use `^<CLASS>-[0-9]+$`; the landed cross-reference patterns match that suffix form.
7. Package README/docs inspection — `tools/validators/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` describe validator/schema surfaces at inventory level and do not publish the old strict cross-reference regex.

## Deviations

- The drafted `/tmp/red-bunny-restoration-plan.json` / `node tools/world-mcp/dist/src/cli/validate-patch-plan.js` proof was not run because the plan file is not a checked-in or present artifact in this checkout. The accepted substitute is package-local `record_schema_compliance` coverage through the validators package build/test lane, including a focused padded-reference fixture.
- The implementation-time inventory widened from the initial `bound_char_id` / `derived_from` list to every same-seam story-bundle semantic cross-reference field with the strict suffix. This stayed inside the ticket's validator-schema contract boundary.
- `tools/validators/dist/` was refreshed by build/test as a pre-existing ignored generated artifact, not a tracked source edit.
