# SPEC04VALFRA-002: JSON Schemas for 10 record classes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/validators/src/schemas/*.schema.json` (10 new top-level JSON Schema files plus shared `ExtensionEntry`) under the package introduced by ticket 001, and adds a package-local schema conformance test. No modifications to existing world-index / world-mcp / patch-engine runtime types; the schemas are authoritative-by-side alongside `tools/world-index/src/schema/types.ts` interfaces and are consumed by `record_schema_compliance` in ticket 003.
**Deps**: archive/tickets/SPEC04VALFRA-001.md

## Problem

The reassessed SPEC-04 §JSON Schemas section requires one JSON Schema per record class (10 total: CF, CH, INV, M, OQ, ENT, SEC, PA, CHAR, DA). These schemas are the input to `record_schema_compliance` (ticket 003's structural validator) and the field-shape authority for every new atomic record authored by `create-base-world` or by the patch engine. Before this ticket, `tools/world-index/src/schema/types.ts` defined TypeScript interfaces (landed by `archive/tickets/SPEC03PATENG-001.md`), but those were compile-time only; runtime validation of atomic YAML records required JSON Schemas.

Two deliberate design choices from the reassessed spec bind this ticket:

1. **SEC schema is a single file** covering all 7 subtypes (ELF / INS / MTS / GEO / ECR / PAS / TML); per-subtype variation is captured by the `file_class` enum discriminator, not by 7 separate schemas. Reassessment Q5 selected option (a).
2. **MR id-pattern is permissive** — `^M-\d+$` rather than `^M-\d{4}$` — because the animalia corpus uses unpadded ids (`M-1` through `M-NN`, confirmed via `ls worlds/animalia/_source/mystery-reserve/`). All other classes require the 4-digit zero-padded pattern per `CLAUDE.md` §ID Allocation Conventions.

## Assumption Reassessment (2026-04-25)

1. At intake, `tools/validators/src/schemas/` did not exist (confirmed via clean `git status --short` and live `tools/validators` file listing). This ticket creates it and the 10 top-level schema files.
2. The authoritative CF shape lives at `docs/FOUNDATIONS.md` §Canon Fact Record Schema (lines 257–320). The canonical TypeScript mirror is `tools/world-index/src/schema/types.ts` `CanonFactRecord` interface (confirmed present via earlier grep). The CF JSON Schema must match BOTH: FOUNDATIONS is the design contract; `types.ts` is the compile-time consumer. Any drift is a Rule 6 (No Silent Retcons) violation.
3. Shared boundary: `tools/validators/src/schemas/*.schema.json` are consumed by `record_schema_compliance` (ticket 003) via `ajv` (dependency declared in ticket 001's package.json). The schemas are NOT consumed by `tools/world-index` (which parses atomic YAML without runtime shape validation) nor by `tools/patch-engine` (which type-checks via TypeScript at compile time). The only runtime consumer is `record_schema_compliance`; cross-package coupling is therefore minimal.
4. FOUNDATIONS principle under audit: **§Canon Fact Record Schema** (authoritative for CF; also §Mystery Reserve at lines 73–90 is authoritative for MR's required-field concerns — "what is unknown, what is known around it, what kinds of answers are forbidden" — but the ACTUAL YAML keys in animalia data are `unknowns`, `knowns`, `disallowed_cheap_answers` per `worlds/animalia/_source/mystery-reserve/M-1.yaml`). The MR JSON Schema binds to the data-layer field names, not to the prose-descriptions' field names. Writing the MR schema against FOUNDATIONS prose-sourced names (`what_is_unknown`, `forbidden_answers`) would fail every real record.
5. Schema extension posture: **additive-only**. No existing schema artifacts to modify; 10 new files. Downstream consumer `record_schema_compliance` (ticket 003) is itself new. Existing world-index / world-mcp / patch-engine code is not touched.
6. Rename/removal blast radius: none. This ticket adds new files only; no renames, no removals.
7. Live-corpus mismatch corrected before coding: SPEC-04 and sibling ticket 003 described PA validation as frontmatter-only, but `worlds/animalia/adjudications/PA-*.md` and `.claude/skills/canon-addition/templates/adjudication-report.md` use a markdown Discovery block with canonical fields and no YAML frontmatter. The PA schema therefore lands as `adjudication-discovery.schema.json`, and SPEC-04 / ticket 003 wording is truthed to the Discovery-block surface.
8. Live-corpus grandfathering corrected during verification: the animalia corpus contains historical CH variants (`addition_with_qualification`, `narrows_via_firewalls_and_expands_via_new_entries`, object-shaped `change_scope` / `critic_panel`), prose list items parsed as one-key mappings due unquoted colons, CF `source_basis.derived_from` values pointing at `DA-0001`, `none_clarification_retcon` in one modification-history entry, and `M-5` with an empty `disallowed_cheap_answers` list. The schemas allow these existing shapes so `record_schema_compliance` validates current canon without forcing retcon-like cleanup in this ticket.

## Architecture Check

1. JSON Schema authoring is the right vehicle for runtime-shape enforcement: TypeScript interfaces (in `world-index/src/schema/types.ts`) catch drift at compile time for code that imports them, but atomic-YAML records on disk are authored by skills (`create-base-world`, `canon-addition` via patch-engine ops) and migrated data; they never pass through the TypeScript compiler. JSON Schema + `ajv` closes the runtime hole.
2. One SEC schema with a `file_class` discriminator (rather than 7 per-subtype schemas) matches the actual shape symmetry: every SEC record has the same top-level keys (`id`, `file_class`, `order`, `heading`, `heading_level`, `body`, `extensions`, `touched_by_cf`) — only `file_class` value varies. Seven schemas would repeat the same field set seven times for zero structural payoff; one schema with an enum-valued discriminator is concise AND catches cross-subtype typos at validation time.
3. MR id-pattern permissiveness (`^M-\d+$`) is a deliberate grandfather clause for the animalia corpus, NOT a precedent for future classes. CF / CH / INV / OQ / ENT / SEC / PA / CHAR / DA / PR / BATCH / AU / RP all use `^<PREFIX>-\d{4}$` or the category-aware pattern from CLAUDE.md. Re-padding animalia's MR ids is a separate `canon-addition`-owned maintenance run; this ticket does not attempt it.
4. Schema files are JSON (not YAML) per `ajv`'s native input format and the `$schema` keyword convention. Hand-written JSON is slightly less readable than YAML but allows `ajv.compile(require('./schemas/foo.schema.json'))` with no transform step — the simpler consumer contract earns its keep.
5. No backwards-compatibility aliasing/shims introduced. Schema field names are the atomic-record data-layer names (from animalia samples); prose-sourced alternatives (`what_is_unknown`, etc.) are NOT included as aliases.

## Verification Layers

1. All 10 schema files present and syntactically valid JSON → codebase grep-proof + JSON parse (`ls tools/validators/src/schemas/*.schema.json | wc -l` returns 10; `for f in tools/validators/src/schemas/*.schema.json; do node -e "require('$f')"; done` exits 0).
2. Each schema declares `$schema: "https://json-schema.org/draft/2020-12/schema"`, a `$id`, `type: "object"`, and an `additionalProperties: false` posture → grep-proof across all 10 files.
3. CF schema mirrors FOUNDATIONS §Canon Fact Record Schema 1:1 → manual review + field-count grep (`grep -cE '^\s*"(id|title|status|type|statement|scope|truth_scope|domains_affected|prerequisites|distribution|costs_and_limits|visible_consequences|required_world_updates|source_basis|contradiction_risk|notes|modification_history|extensions)"' tools/validators/src/schemas/canon-fact-record.schema.json` returns ≥17 top-level fields).
4. MR, CF, CH, INV, OQ, ENT, and SEC schemas validate against animalia's current `_source/` corpus → `cd tools/validators && npm test`.
5. SEC schema validates across all 7 subtypes and rejects cross-subtype prefix/file_class mismatches → `tools/validators/tests/schemas/corpus-conformance.test.ts`.
6. MR id-pattern accepts unpadded form → grep-proof (`grep -E '"pattern": "\\^M-\\[0-9\\]\\+\\$"' tools/validators/src/schemas/mystery-reserve.schema.json`) matches `^M-[0-9]+$` — not `^M-\d{4}$`.

## What to Change

### 1. Create `tools/validators/src/schemas/canon-fact-record.schema.json`

Authoritative shape from FOUNDATIONS.md §Canon Fact Record Schema (lines 257–320). Required fields: `id`, `title`, `status` (enum: `hard_canon | soft_canon | contested_canon | mystery_reserve`), `type`, `statement`, `scope` (object with `geographic`, `temporal`, `social` sub-enums per FOUNDATIONS), `truth_scope`, `domains_affected`, `source_basis`, `contradiction_risk`. Optional fields: `prerequisites`, `distribution` (with `who_can_do_it`, `who_cannot_easily_do_it`, `why_not_universal`), `costs_and_limits`, `visible_consequences`, `required_world_updates` (array of `file_class` tokens per SPEC-13, not filenames), `notes`, `modification_history` (array of `{date, change_id, originating_cf?, note}`), `extensions` (array of `ExtensionEntry` — see §2 below for the shared shape). `id` pattern `^CF-\d{4}$`.

### 2. Create `tools/validators/src/schemas/change-log-entry.schema.json`

Required fields per `worlds/animalia/_source/change-log/CH-0001.yaml` shape: `change_id`, `date`, `change_type` (enum including `addition`), `affected_fact_ids`, `summary`, `reason`, `scope` (object), plus any other keys observed in the CH-0001 sample. `change_id` pattern `^CH-\d{4}$`.

### 3. Create `tools/validators/src/schemas/invariant.schema.json`

Required fields: `id`, `category` (enum: `ontological | causal | distribution | social | aesthetic_thematic`), `title`, `statement`, `rationale`, `examples` (array of strings), `non_examples` (array of strings), `break_conditions`, `revision_difficulty` (enum: `low | medium | high`), `extensions` (array). `id` pattern: union of `^ONT-\d+$`, `^CAU-\d+$`, `^DIS-\d+$`, `^SOC-\d+$`, `^AES-\d+$` per `CLAUDE.md` §ID Allocation Conventions (category-prefix + 1-based counter per category).

### 4. Create `tools/validators/src/schemas/mystery-reserve.schema.json`

Required fields per `worlds/animalia/_source/mystery-reserve/M-1.yaml` shape: `id`, `title`, `status` (enum includes `active | passive | passive_depth | forbidden`), `knowns` (array of strings; non-empty), `unknowns` (array of strings; non-empty), `common_interpretations` (array; may be empty), `disallowed_cheap_answers` (array of strings; empty is allowed for existing forbidden MR entries such as `M-5`), `domains_touched` (array of strings; non-empty), `future_resolution_safety` (string; animalia has legacy values beyond `low | medium | high`), `extensions` (array). `id` pattern `^M-\d+$` (unpadded-tolerant grandfather clause; see Architecture Check §3).

### 5. Create `tools/validators/src/schemas/open-question.schema.json`

Fields per `archive/specs/SPEC-13-atomic-source-migration.md` §B open-question schema and against a representative OQ sample from `worlds/animalia/_source/open-questions/` at implementation time. Required at minimum: `id`, `topic`, `body`. `id` pattern `^OQ-\d{4}$`.

### 6. Create `tools/validators/src/schemas/entity.schema.json`

Fields per `archive/specs/SPEC-13-atomic-source-migration.md` §B entity-registry schema and against a representative ENT sample from `worlds/animalia/_source/entities/` at implementation time. Required at minimum: `id`, `name`, `type` (entity type enum per FOUNDATIONS §Ontology Categories or the animalia corpus's authored set — confirm at implementation). `id` pattern `^ENT-\d{4}$`.

### 7. Create `tools/validators/src/schemas/section.schema.json`

Single schema covering all 7 SEC subtypes. Required fields per `worlds/animalia/_source/peoples-and-species/SEC-PAS-001.yaml` (reference shape): `id`, `file_class` (enum: `EVERYDAY_LIFE | INSTITUTIONS | MAGIC_OR_TECH_SYSTEMS | GEOGRAPHY | ECONOMY_AND_RESOURCES | PEOPLES_AND_SPECIES | TIMELINE`), `order` (integer), `heading` (string), `heading_level` (integer), `body` (string), `extensions` (array), `touched_by_cf` (array of CF-NNNN strings). `id` pattern: union of `^SEC-ELF-\d{3}$`, `^SEC-INS-\d{3}$`, `^SEC-MTS-\d{3}$`, `^SEC-GEO-\d{3}$`, `^SEC-ECR-\d{3}$`, `^SEC-PAS-\d{3}$`, `^SEC-TML-\d{3}$`. Schema asserts `id`'s prefix matches `file_class`'s subtype via an `allOf` conditional clause — e.g., when `file_class == "PEOPLES_AND_SPECIES"`, `id` must match `^SEC-PAS-\d{3}$`. This catches cross-subtype typos where a record is authored with a mismatched prefix.

### 8. Create `tools/validators/src/schemas/adjudication-discovery.schema.json`

Discovery-block schema for `worlds/<slug>/adjudications/PA-NNNN-*.md` per the canon-addition skill's adjudication-record template at `.claude/skills/canon-addition/templates/adjudication-report.md`. Required parsed fields: `pa_id`, `date`, `verdict`, `mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`; `proposal_ref` remains optional. `pa_id` pattern `^PA-\d{4}$`. The markdown body is prose and is out of scope for JSON Schema validation.

### 9. Create `tools/validators/src/schemas/character-frontmatter.schema.json`

Frontmatter-only schema for `worlds/<slug>/characters/<slug>.md` per the character-generation skill's dossier template at `.claude/skills/character-generation/templates/*`. Required fields (confirm against the template at implementation time): `character_id`, `name`, plus the canon-distribution-conformance fields the character-generation skill's canon-safety check reads. `character_id` pattern `^CHAR-\d{4}$`.

### 10. Create `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`

Frontmatter-only schema for `worlds/<slug>/diegetic-artifacts/<slug>.md` per the diegetic-artifact-generation skill's template. Required fields (confirm against the template at implementation time): `da_id` or `artifact_id`, `title`, `author_persona`, `date`, `place`, `audience`, `world_relation`, `statement_of_existence` (or the current canonical field names). `artifact_id` pattern `^DA-\d{4}$`.

### 11. Shared `ExtensionEntry` sub-schema

Define `ExtensionEntry` as a shared `$ref` target (e.g., `tools/validators/src/schemas/_shared/extension-entry.schema.json` or inline in each file). Fields per `worlds/animalia/_source/mystery-reserve/M-1.yaml:extensions[]`: `originating_cf` (CF-NNNN pattern), `change_id` (CH-NNNN pattern), `date` (ISO-8601 date), `label` (string), `body` (string). CF, INV, MR, OQ, ENT, SEC schemas all reference this shared sub-schema for their `extensions` arrays.

## Files to Touch

- `tools/validators/src/schemas/canon-fact-record.schema.json` (new)
- `tools/validators/src/schemas/change-log-entry.schema.json` (new)
- `tools/validators/src/schemas/invariant.schema.json` (new)
- `tools/validators/src/schemas/mystery-reserve.schema.json` (new)
- `tools/validators/src/schemas/open-question.schema.json` (new)
- `tools/validators/src/schemas/entity.schema.json` (new)
- `tools/validators/src/schemas/section.schema.json` (new)
- `tools/validators/src/schemas/adjudication-discovery.schema.json` (new)
- `tools/validators/src/schemas/character-frontmatter.schema.json` (new)
- `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (new)
- `tools/validators/src/schemas/_shared/extension-entry.schema.json` (new; referenced by the atomic-record schemas that carry `extensions[]`)
- `tools/validators/tests/schemas/corpus-conformance.test.ts` (new; package-local corpus conformance and SEC mismatch proof)
- `specs/SPEC-04-validator-framework.md` (modify; PA schema surface corrected from frontmatter to Discovery block)
- `tickets/SPEC04VALFRA-003.md` (modify; sibling structural-validator ticket truthed to PA Discovery block)
- `tools/validators/README.md` (modify; schema status and PA Discovery surface documented)

## Out of Scope

- `record_schema_compliance` validator implementation — ticket 003.
- Using these schemas in any runtime code (validator, CLI, engine hook) — the schemas are static authoring artifacts in this ticket; consumption lands in 003.
- Re-padding animalia's MR ids from `M-1` to `M-0001` form — out-of-scope world-maintenance decision; MR schema's permissive id-pattern accommodates the legacy form.
- Breaking changes to any existing atomic record shape — schemas are authored to match the current corpus, not to tighten it.
- PR / BATCH / AU / RP schemas — these record classes live outside `_source/` (proposals, audits, retcon-proposals) and are out of scope for `record_schema_compliance`; they have their own skill-owned validation at authoring time.

## Acceptance Criteria

### Tests That Must Pass

1. `ls tools/validators/src/schemas/*.schema.json | wc -l` returns 10.
2. `for f in tools/validators/src/schemas/*.schema.json; do node -e "require('./$f')" || exit 1; done` exits 0 (all 10 files are valid JSON).
3. Runtime validation of animalia's CF corpus against `canon-fact-record.schema.json` passes for all 47 records (per `worlds/animalia/_source/canon/` count).
4. Runtime validation of animalia's CH corpus against `change-log-entry.schema.json` passes for all 18 records.
5. Runtime validation of animalia's MR corpus against `mystery-reserve.schema.json` passes for all records including `M-1.yaml` (unpadded id) and `M-5.yaml` (forbidden entry with empty `disallowed_cheap_answers`).
6. Runtime validation of animalia's SEC corpus against `section.schema.json` passes across all 7 subtype subdirectories; cross-subtype typo test — injecting a `SEC-GEO-001`-shaped record with `file_class: PEOPLES_AND_SPECIES` — FAILS per the `allOf` conditional clause.
7. Runtime validation of animalia's INV, OQ, ENT corpora against their respective schemas passes.
8. `cd tools/validators && npm run build` exits 0 (no TypeScript impact — schemas are JSON, not compiled — but the build must still pass to confirm ticket 001's framework code remains valid).

### Invariants

1. The CF schema's field set is a superset of every field named in FOUNDATIONS.md §Canon Fact Record Schema (lines 257–320). Any FOUNDATIONS-named field missing from the schema is a Rule 1 (No Floating Facts) violation.
2. The MR schema's field set matches `worlds/animalia/_source/mystery-reserve/M-1.yaml` data-layer keys exactly — `unknowns` / `knowns` / `disallowed_cheap_answers` / `domains_touched` / `future_resolution_safety`. The prose-sourced names (`what_is_unknown`, `forbidden_answers`, `what_is_known_around_it`) MUST NOT appear as field names OR as aliases. Reassessment Issue I1's CRITICAL classification exists precisely to prevent this drift.
3. The SEC schema is a single file — seven per-subtype schema files must not exist in `tools/validators/src/schemas/`.
4. Every schema uses `additionalProperties: false` at the top level.
5. `id` pattern regexes match the actual corpus. No schema's id pattern rejects a record that is currently in the animalia corpus; no schema's id pattern accepts an id that CLAUDE.md §ID Allocation Conventions explicitly forbids (except the deliberate MR grandfather clause).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/corpus-conformance.test.ts` — iterates over `worlds/animalia/_source/` subdirectories, loads each `.yaml` file with `js-yaml`, validates against the matching schema via `ajv`, asserts zero errors. One test per record class (CF, CH, INV, M, OQ, ENT, SEC — seven subtypes). Also includes a cross-subtype typo negative-test for SEC per Invariant §5.
2. PA / CHAR / DA hybrid surfaces are represented by static schemas in this ticket; runtime ingestion of those hybrid surfaces is exercised by tickets 003 and 007.

### Commands

1. `cd tools/validators && npm run build && npm run test` (targeted: compiles framework code from ticket 001, runs the corpus-conformance test over animalia).
2. `for f in tools/validators/src/schemas/*.schema.json; do echo "=== $f ==="; node -e "const s = require('./$f'); console.log('id:', s.\$id || '(none)'); console.log('top-level required:', (s.required || []).length);"; done` — manual audit surface for reviewer to eyeball schema shape before approving.
3. `ls tools/validators/src/schemas/*.schema.json | wc -l` returns 10 (the SEC single-schema decision verified by count).

## Outcome

Completed 2026-04-25.

Added 10 top-level JSON Schema files under `tools/validators/src/schemas/`, a shared `ExtensionEntry` schema under `tools/validators/src/schemas/_shared/`, and `tools/validators/tests/schemas/corpus-conformance.test.ts`. The atomic-record schemas validate the current animalia `_source/` corpus, and the SEC schema rejects id-prefix/file_class mismatches.

## Verification Result

- `cd tools/validators && npm run build` — PASS.
- `cd tools/validators && npm test` — PASS; runs the schema corpus conformance test and the SEC mismatch negative test.
- `ls tools/validators/src/schemas/*.schema.json | wc -l` — PASS, returned `10`.
- `for f in tools/validators/src/schemas/*.schema.json; do node -e "require('./$f')" || exit 1; done` — PASS.
- `grep -E '"pattern": "\\^M-\\[0-9\\]\\+\\$"' tools/validators/src/schemas/mystery-reserve.schema.json` — PASS; MR remains unpadded-tolerant.

## Deviations

- PA validation was corrected from a nonexistent YAML-frontmatter surface to the live Discovery-block surface.
- Several schemas deliberately include narrow grandfathering for existing animalia corpus variants discovered by the conformance test; those variants are documented in Assumption Reassessment item 8.
