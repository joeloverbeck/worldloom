# SPEC04VALFRA-003: 7 structural validators + per-mode filters

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds `tools/validators/src/structural/*.ts` (7 new validator modules) + a package-internal registry that tickets 005 (CLI) and 006 (engine integration) consume. Also updates the package README status to stop claiming concrete validators are future work. No modifications to existing pipeline code; downstream consumers import `@worldloom/validators` from tickets 005 and 006.
**Deps**: archive/tickets/SPEC04VALFRA-001.md, archive/tickets/SPEC04VALFRA-002.md

## Problem

The reassessed SPEC-04 §Validator inventory structural set (7 validators) enforces integrity of atomic-record state independent of canon semantics: YAML parse integrity, id uniqueness, cross-file reference resolution, JSON Schema compliance, bidirectional CF↔SEC mapping, modification-history retrofit against legacy notes-field patterns, and adjudication-record field canonicalization. All seven are mechanized in this ticket.

These validators are the foundation of Phase 2 Tier 1 acceptance: before the SPEC-03 engine's pre-apply gate can be unblocked from its current fail-closed state (per `archive/specs/SPEC-03-patch-engine.md` and the stub at `tools/world-mcp/src/tools/validate-patch-plan.ts`), structural validators must exist and be runnable against the animalia corpus. The live corpus currently has pre-existing structural findings; ticket 007 owns the Bootstrap-audit disposition before the broader gate is treated as clean. The `world-validate` CLI (ticket 005) exposes the validators; the engine integration (ticket 006) enforces them pre-apply; Hook 5 (SPEC-05 Part B) consumes them post-write.

Each validator declares its own `applies_to` predicate per the reassessed spec's §Per-run-mode applicability matrix — e.g., `record_schema_compliance` runs in all modes; `modification_history_retrofit` runs on CF writes in incremental mode; `adjudication_discovery_fields` runs on PA writes only.

## Assumption Reassessment (2026-04-25)

1. The framework surface (`Verdict`, `Validator`, `Context`, `RunMode`) lands in ticket 001 at `tools/validators/src/framework/types.ts`; the 10 JSON Schemas land in ticket 002 at `tools/validators/src/schemas/*.schema.json`. This ticket consumes both. Build order: 001 → 002 → 003.
2. The `validation_results` SQL table at `tools/world-index/src/schema/migrations/001_initial.sql:124-136` persists verdicts in full-world and incremental modes (row shape: `result_id, world_slug, validator_name, severity, code, message, node_id, file_path, line_range_start, line_range_end, created_at`). This ticket does NOT write to that table directly — persistence is the runner's responsibility (ticket 005 CLI + ticket 006 engine hook pass verdicts back to their callers, which persist). Structural validators emit `Verdict` objects only.
3. Shared boundary: this ticket defines a package-internal validator registry (e.g., `tools/validators/src/public/registry.ts`) exporting `structuralValidators: Validator[]`. Ticket 004 adds a parallel `ruleValidators: Validator[]`. Ticket 005 (CLI) and ticket 006 (engine hook) import both lists and filter by `applies_to(ctx)`. Neither list is a public export — they're internal package state — but the `validateWorld` / `validatePatchPlan` entry points (owned by tickets 005 and 006) consume them.
4. FOUNDATIONS principle under audit: **Rule 6 No Silent Retcons** (enforced via `modification_history_retrofit`: any CF with notes-field modification lines like `Modified YYYY-MM-DD by CH-NNNN` must have a matching `modification_history[]` array entry; partial population fails). Also **§Canon Fact Record Schema** (enforced via `record_schema_compliance` against the 10 JSON Schemas from ticket 002). Neither Validation Rule is weakened by this ticket; the structural-only posture is strictly additive.
5. Schema extension posture: **additive-only**. Structural validators emit new `Verdict` objects; they do NOT modify atomic records or hybrid-file frontmatter. Consumers (ticket 005, ticket 006) pick them up via the registry.
6. Cross-subtype rename/removal blast radius: none. Structural validators are new files. The retired `attribution_comment` and `anchor_integrity` validators (per the reassessed SPEC-04 Retired note) are NOT added — ticket 001's README rewrite already removes their names from the documented inventory.
7. Adjacent-contradiction classification: `adjudication_discovery_fields` checks the PA markdown Discovery block, not `_source/*.yaml` records and not YAML frontmatter. Ticket 002 corrected SPEC-04's stale frontmatter wording after confirming `worlds/animalia/adjudications/PA-*.md` and `.claude/skills/canon-addition/templates/adjudication-report.md` use canonical Discovery bullet fields without `---` frontmatter. The `yaml_parse_integrity` validator still handles atomic YAML plus CHAR/DA hybrid frontmatter; PA Discovery parsing is owned by `adjudication_discovery_fields`.
8. Reassessment correction: the drafted zero-fail animalia acceptance was stale. A post-implementation full structural probe against unmodified `worlds/animalia` reports real pre-existing corpus findings, not a clean baseline: `record_schema_compliance=4`, `touched_by_cf_completeness=45`, `modification_history_retrofit=1`, `adjudication_discovery_fields=7`, with `yaml_parse_integrity=0`, `id_uniqueness=0`, and `cross_file_reference=0`. Ticket 003 therefore proves the validator behavior with focused synthetic fixtures and records the animalia probe as diagnostic input for the Bootstrap audit in ticket 007 rather than requiring this implementation ticket to rewrite live canon or hybrid records.
9. Package command correction: `tools/validators/package.json` already defines `npm run test` as `npm run build && node --test dist/tests/**/*.test.js`; the truthful package-local proof command is `cd tools/validators && npm run test`. A separate `npm run build && npm run test` chain would redundantly build twice.
10. Pre-apply materialization boundary: ticket 001 intentionally left `PatchPlanEnvelope` opaque in `tools/validators/src/framework/types.ts`; ticket 006 owns the real engine/MCP adapter that materializes proposed patch-plan operations into validator input. Ticket 003 therefore implements validators over the established `ctx.index` read surface plus caller-provided file inputs, without inventing a speculative patch-plan parser.

## Architecture Check

1. One TypeScript module per validator (rather than a single file with all 7) preserves independent ownership, clear test boundaries (each validator has its own fixture subset), and per-validator `applies_to` predicates that are locally readable. The per-file convention matches the patch-engine's per-op module convention (`tools/patch-engine/src/ops/*.ts`).
2. The `applies_to` predicate is synchronous (per ticket 001's `Validator` interface) — it consults `ctx.run_mode` and `ctx.touched_files` without hitting the index. This is correct: the filter runs before `run()` even starts, so async filtering would force the runner to resolve predicates before dispatching, which is an unnecessary level of indirection.
3. `record_schema_compliance` uses `ajv.compile(schema)` with a per-class compiled-validator cache (loaded once at validator-module import time). Schema compilation is amortized across the entire run; re-compiling per record would be wasteful.
4. `id_uniqueness` uses string-literal comparison (no normalization). Padding-drift (e.g., `M-1` vs `M-0001`) is caught by `record_schema_compliance`'s id-pattern regex, not by this validator — the separation of concerns is deliberate per the reassessed spec's §Validator inventory id_uniqueness row.
5. `cross_file_reference` resolves every referenced id against the world-index (via `ctx.index.query`). Unresolved ids emit `fail`-severity verdicts. The check does NOT attempt to "repair" unresolved ids — that's out of scope; the repair path is `canon-addition`-owned.
6. `touched_by_cf_completeness` is bidirectional (per spec): SEC → CF direction checks `required_world_updates` contains the SEC's `file_class`; CF → SEC direction checks at least one SEC in the matching subdirectory has the CF in `touched_by_cf[]` OR in an `extensions[].originating_cf`. Both directions emit distinct error codes.
7. `modification_history_retrofit` parses the `notes` string field for the `Modified YYYY-MM-DD by CH-NNNN` pattern via regex (the pattern is structured even though it lives inside a prose field — this is the pre-SPEC-13 authoring convention the validator is named for). Matches must resolve to a `modification_history[]` entry with the same date + CH reference. Unmatched notes-pattern occurrences emit `fail` verdicts.
8. `adjudication_discovery_fields` parses the Discovery block from `adjudications/PA-NNNN-*.md` files. It enforces the canonical field name set (`mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`); ad-hoc names (`New CF`, `Modifications`, `Critics dispatched`) — historical shapes surfaced by the `canon-addition` skill's earlier iterations — emit `fail` verdicts per the reassessed spec's inventory row.
9. No backwards-compatibility aliasing/shims introduced. Each validator targets the post-SPEC-13 atomic-record shape, the current CHAR/DA hybrid-file frontmatter shape, and the current PA Discovery-block shape.

## Verification Layers

1. All 7 structural validator modules export correct `Validator`-conforming objects → codebase grep-proof (`grep -hEc "^export const (yamlParseIntegrity|idUniqueness|crossFileReference|recordSchemaCompliance|touchedByCfCompleteness|modificationHistoryRetrofit|adjudicationDiscoveryFields): Validator" tools/validators/src/structural/*.ts | awk '{sum += $1} END {print sum}'` returns 7).
2. Each validator's `applies_to` predicate matches the reassessed spec's §Per-run-mode applicability matrix → manual review of each module's `applies_to` against the matrix table.
3. `yaml_parse_integrity` catches malformed YAML → synthetic test input (a deliberate unbalanced-bracket atomic YAML file and hybrid frontmatter file emit `fail` verdicts).
4. `id_uniqueness` catches within-class duplicates and ignores cross-class → fixture test (two `CF-0099` records emit `fail`; a `CF-0099` + `CH-0099` pair emits no verdict).
5. `record_schema_compliance` catches the MR prose-sourced-vs-data-sourced drift → fixture test (an MR record with `what_is_unknown` / `forbidden_answers` fields FAILS per the schema's data-layer field names; an MR record with `unknowns` / `disallowed_cheap_answers` PASSES).
6. `touched_by_cf_completeness` catches both directions → fixture test (SEC citing CF that doesn't list the SEC's file_class → `fail` in SEC→CF direction; CF naming a file_class with no SEC citing it → `fail` in CF→SEC direction).
7. `modification_history_retrofit` catches retrofit gaps → fixture test (a CF whose `notes` field contains `Modified 2026-04-18 by CH-0006` without a matching `modification_history[]` entry → `fail`).
8. `adjudication_discovery_fields` catches ad-hoc field names → synthetic test input (a PA Discovery block using `New CF` instead of `cf_records_touched` → `fail`).
9. All 7 validators can run against unmodified animalia → diagnostic validator-count probe. The live corpus currently emits pre-existing findings (`record_schema_compliance=4`, `touched_by_cf_completeness=45`, `modification_history_retrofit=1`, `adjudication_discovery_fields=7`), so ticket 007 owns grandfather-or-fix disposition. This ticket's invariant is that the probe runs and reports structured verdict counts without crashing, not that animalia is already structurally clean.

## What to Change

### 1. Create `tools/validators/src/structural/yaml-parse-integrity.ts`

Export `yamlParseIntegrity: Validator`. `name: 'yaml_parse_integrity'`, `severity_mode: 'fail'`. `applies_to`: all modes (per matrix). `run`: iterates `_source/*.yaml` files in the world's `_source/` tree when a world root is provided, caller-provided file inputs, or the `touched_files` subset (incremental). Ticket 006 owns materializing patch-plan create ops into this file-input surface for pre-apply mode. For each file: attempt `js-yaml.load`; on parse error emit `fail` with `code: 'yaml_parse_integrity.parse_error'`, `message` containing the error detail, `location.file` set. Also validates CHAR/DA hybrid-file frontmatter by splitting on `---` delimiters and parsing the frontmatter block only; PA Discovery parsing is owned by `adjudication_discovery_fields`.

### 2. Create `tools/validators/src/structural/id-uniqueness.ts`

Export `idUniqueness: Validator`. `name: 'id_uniqueness'`, `severity_mode: 'fail'`. `applies_to`: all modes. `run`: queries the index for all records grouped by class; within each class, detects duplicate `id` values via a `Map<string, IndexedRecord[]>` pass. Emits `fail` per duplicate pair with `code: 'id_uniqueness.duplicate'`, `message` naming both file paths, `location.node_id` set to the duplicated id. String-literal comparison only (no normalization).

### 3. Create `tools/validators/src/structural/cross-file-reference.ts`

Export `crossFileReference: Validator`. `name: 'cross_file_reference'`, `severity_mode: 'fail'`. `applies_to`: all modes. `run`: for each record type that references other records — CF (`derived_from`, `required_world_updates` against the known `file_class` enum), CH (`affected_fact_ids`), any record's `modification_history[].originating_cf` and `extensions[].originating_cf` + `extensions[].change_id`, SEC (`touched_by_cf[]`) — resolve every referenced id against the index. Unresolved references emit `fail` with `code: 'cross_file_reference.orphan_reference'`, `message` naming both the citing record and the missing id, `location.node_id` set to the citer.

### 4. Create `tools/validators/src/structural/record-schema-compliance.ts`

Export `recordSchemaCompliance: Validator`. `name: 'record_schema_compliance'`, `severity_mode: 'fail'`. `applies_to`: all modes. `run`: loads the 10 JSON Schemas from ticket 002 at module-import time, compiles each with `ajv.compile`, builds a `Map<RecordClass, AjvValidateFn>`. At run time, for each record in scope, look up the compiled validator by class and invoke it; on schema errors emit `fail` per error with `code: 'record_schema_compliance.<schema-error-keyword>'` (e.g., `record_schema_compliance.required`, `record_schema_compliance.type`, `record_schema_compliance.enum`, `record_schema_compliance.pattern`), `message` carrying `ajv`'s error description + `instancePath`, `location.file` + `location.node_id` set.

For hybrid-file records, parse CHAR and DA frontmatter via `yaml_parse_integrity`'s same frontmatter-split helper. For PA records, parse the canonical Discovery block and validate the parsed structured object against `adjudication-discovery.schema.json`.

### 5. Create `tools/validators/src/structural/touched-by-cf-completeness.ts`

Export `touchedByCfCompleteness: Validator`. `name: 'touched_by_cf_completeness'`, `severity_mode: 'fail'`. `applies_to`: all modes; in incremental mode, applies only when touched files include SEC or CF records. `run`:
- SEC→CF direction: for each SEC with non-empty `touched_by_cf[]`, for each CF id listed, verify the CF's `required_world_updates` contains the SEC's `file_class`. On miss: emit `fail` with `code: 'touched_by_cf_completeness.sec_to_cf_miss'`, `message` naming the SEC, the CF, and the missing `file_class`.
- CF→SEC direction: for each CF with non-empty `required_world_updates`, for each `file_class` listed, verify at least one SEC under `_source/<subdir-for-file-class>/` has the CF in `touched_by_cf[]` OR in an `extensions[].originating_cf`. On miss: emit `fail` with `code: 'touched_by_cf_completeness.cf_to_sec_miss'`, `message` naming the CF, the `file_class`, and the count of SECs searched.

Include a `file_class → subdir` mapping as a package-internal constant for all current `required_world_updates` tokens, with CF→SEC bidirectional enforcement limited to the 7 SEC-backed classes (`EVERYDAY_LIFE`, `INSTITUTIONS`, `MAGIC_OR_TECH_SYSTEMS`, `GEOGRAPHY`, `ECONOMY_AND_RESOURCES`, `PEOPLES_AND_SPECIES`, `TIMELINE`).

### 6. Create `tools/validators/src/structural/modification-history-retrofit.ts`

Export `modificationHistoryRetrofit: Validator`. `name: 'modification_history_retrofit'`, `severity_mode: 'fail'`. `applies_to`: all modes; in incremental mode, applies only on CF writes. `run`: for each CF record, regex-scan `notes` (which may be multi-line) for the pattern `Modified (\d{4}-\d{2}-\d{2}) by (CH-\d{4})`. For each match, verify `modification_history[]` contains an entry with the same `date` and a `change_id` matching the captured CH. Unmatched notes patterns (no corresponding array entry) emit `fail` with `code: 'modification_history_retrofit.missing_entry'`.

### 7. Create `tools/validators/src/structural/adjudication-discovery-fields.ts`

Export `adjudicationDiscoveryFields: Validator`. `name: 'adjudication_discovery_fields'`, `severity_mode: 'fail'`. `applies_to`: all modes; in incremental mode, applies only on PA writes. `run`: for each `adjudications/PA-NNNN-*.md` file, locate and parse the Discovery block. Canonical field name set: `mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`. Any ad-hoc field name (regex-matched against a denylist derived from `canon-addition`'s earlier iterations: `New CF`, `Modifications`, `Critics dispatched`, `Dispatch`) emits `fail` with `code: 'adjudication_discovery_fields.non_canonical'`, `message` naming the non-canonical field.

### 8. Create `tools/validators/src/public/registry.ts`

Export `export const structuralValidators: readonly Validator[] = [yamlParseIntegrity, idUniqueness, crossFileReference, recordSchemaCompliance, touchedByCfCompleteness, modificationHistoryRetrofit, adjudicationDiscoveryFields];`. Package-internal only — NOT re-exported from `src/public/index.ts` or `src/public/types.ts`; consumed by tickets 005 and 006 via package-internal imports.

## Files to Touch

- `tools/validators/src/structural/yaml-parse-integrity.ts` (new)
- `tools/validators/src/structural/id-uniqueness.ts` (new)
- `tools/validators/src/structural/cross-file-reference.ts` (new)
- `tools/validators/src/structural/record-schema-compliance.ts` (new)
- `tools/validators/src/structural/touched-by-cf-completeness.ts` (new)
- `tools/validators/src/structural/modification-history-retrofit.ts` (new)
- `tools/validators/src/structural/adjudication-discovery-fields.ts` (new)
- `tools/validators/src/structural/utils.ts` (new; shared structural-validator helpers)
- `tools/validators/src/public/registry.ts` (new; initial population with 7 structural validators — ticket 004 appends rule validators)
- `tools/validators/README.md` (modify; package status now reflects landed structural validators)
- `tools/validators/tests/structural/*.test.ts` (new — one test file per structural validator)

## Out of Scope

- Rule-derived validator implementations — ticket 004.
- `world-validate` CLI — ticket 005.
- Engine integration (`validatePatchPlan` + stub swap) — ticket 006.
- Integration capstone + bootstrap audit — ticket 007.
- Persisting verdicts to `validation_results` — runner-side responsibility, implemented by tickets 005 (CLI) and 006 (engine).
- Cleaning up any pre-existing structural findings against animalia — Bootstrap audit in ticket 007 decides grandfather-or-fix per finding.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run test` exits 0; all 7 structural-validator test suites pass against focused synthetic fixtures (zero verdicts emitted for known-good cases and expected `fail` verdicts emitted with expected `code` values for known-bad cases).
2. `grep -hEc "^export const (yamlParseIntegrity|idUniqueness|crossFileReference|recordSchemaCompliance|touchedByCfCompleteness|modificationHistoryRetrofit|adjudicationDiscoveryFields): Validator" tools/validators/src/structural/*.ts | awk '{sum += $1} END {print sum}'` returns 7.
3. Ad-hoc diagnostic: run all 7 structural validators against unmodified animalia. The command completes and reports structured counts; current animalia `fail` verdicts are Bootstrap-audit input for ticket 007, not ticket 003 cleanup scope.
4. `grep -c "export const structuralValidators" tools/validators/src/public/registry.ts` returns 1; the array literal contains exactly 7 entries.

### Invariants

1. Each structural validator's `name` field matches the SPEC-04 §Validator inventory structural-table row's validator name exactly (snake_case). Camelcase drift in `name` breaks the `world-validate --rules=<list>` CLI (ticket 005) and Hook 5's incremental-mode filter (SPEC-05 Part B).
2. The MR schema's data-layer field names (`unknowns`, `knowns`, `disallowed_cheap_answers`, `domains_touched`, `future_resolution_safety`) are the ONLY names `record_schema_compliance` recognizes for MR records. Any code path that tries to validate against the prose-sourced FOUNDATIONS names fails fast — reassessment Issue I1's CRITICAL severity exists for exactly this.
3. `id_uniqueness` compares string-literals; padding-drift detection is `record_schema_compliance`'s responsibility via schema id-patterns. The validators must not overlap — double-counting a padding-drift finding would distort `validation_results` aggregates.
4. `cross_file_reference` resolves references via the index; it does NOT re-parse atomic records. The index is the authoritative resolution surface; direct file reads would violate the §Tooling Recommendation principle.
5. `adjudication_discovery_fields` validates the PA Discovery block only. The prose body of PA records is not parsed by this validator — that's out of scope for structural enforcement.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/yaml-parse-integrity.test.ts` — malformed-YAML fixture + CHAR/DA hybrid-frontmatter fixture.
2. `tools/validators/tests/structural/id-uniqueness.test.ts` — within-class duplicate fixture + cross-class non-collision fixture.
3. `tools/validators/tests/structural/cross-file-reference.test.ts` — orphan `derived_from` fixture + orphan `touched_by_cf` fixture.
4. `tools/validators/tests/structural/record-schema-compliance.test.ts` — prose-sourced-MR-field fixture (FAIL expected), data-sourced-MR-field fixture (PASS expected), SEC cross-subtype-typo fixture (FAIL expected).
5. `tools/validators/tests/structural/touched-by-cf-completeness.test.ts` — SEC→CF direction and CF→SEC direction fixtures.
6. `tools/validators/tests/structural/modification-history-retrofit.test.ts` — notes-pattern-without-array-entry fixture.
7. `tools/validators/tests/structural/adjudication-discovery-fields.test.ts` — ad-hoc field name fixture.
8. `tools/validators/tests/structural/registry.test.ts` — asserts the package-internal registry contains exactly the 7 structural validators in SPEC-04 order.

### Commands

1. `cd tools/validators && npm run test` (targeted build + package-local test suite).
2. `grep -hEc "^export const (yamlParseIntegrity|idUniqueness|crossFileReference|recordSchemaCompliance|touchedByCfCompleteness|modificationHistoryRetrofit|adjudicationDiscoveryFields): Validator" tools/validators/src/structural/*.ts | awk '{sum += $1} END {print sum}'` returns 7 (validator export verification).
3. `grep -c "export const structuralValidators" tools/validators/src/public/registry.ts` returns 1; the array literal contains exactly 7 entries.
4. Manual diagnostic command: run all 7 structural validators against unmodified animalia via the package registry after `npm run test` builds `dist/`; expected current output is `yaml_parse_integrity=0`, `id_uniqueness=0`, `cross_file_reference=0`, `record_schema_compliance=4`, `touched_by_cf_completeness=45`, `modification_history_retrofit=1`, `adjudication_discovery_fields=7`, total `57`.

## Outcome

Implemented the 7 SPEC-04 structural validators and a package-internal structural registry:

- `yaml_parse_integrity` parses atomic YAML and CHAR/DA hybrid frontmatter.
- `id_uniqueness` detects duplicate ids within the same indexed record class.
- `cross_file_reference` checks record-id references and known `required_world_updates` file-class tokens.
- `record_schema_compliance` validates indexed records plus parsed hybrid/PA structured surfaces against the ticket-002 JSON Schemas.
- `touched_by_cf_completeness` enforces the bidirectional CF↔SEC mapping for SEC file classes.
- `modification_history_retrofit` finds legacy `notes` modification lines without matching `modification_history[]` entries.
- `adjudication_discovery_fields` rejects non-canonical PA Discovery field names.

Also added focused structural tests and updated `tools/validators/README.md` so the package status reflects the landed structural-validator surface. The validators run against index records and explicit file inputs; ticket 006 owns adapting patch-plan operations into that input surface for the engine pre-apply path.

## Verification Result

Passed:

1. `cd tools/validators && npm run test` — 14 tests passed.
2. `grep -hEc "^export const (yamlParseIntegrity|idUniqueness|crossFileReference|recordSchemaCompliance|touchedByCfCompleteness|modificationHistoryRetrofit|adjudicationDiscoveryFields): Validator" tools/validators/src/structural/*.ts | awk '{sum += $1} END {print sum}'` — returned `7`.
3. `grep -c "export const structuralValidators" tools/validators/src/public/registry.ts` — returned `1`.
4. Animalia structural diagnostic after build — completed and reported `yaml_parse_integrity=0`, `id_uniqueness=0`, `cross_file_reference=0`, `record_schema_compliance=4`, `touched_by_cf_completeness=45`, `modification_history_retrofit=1`, `adjudication_discovery_fields=7`, total `57`.

Ignored generated artifacts: `tools/validators/dist/` is expected build output from `npm run test`; `tools/validators/node_modules/` was pre-existing package install state.

## Deviations

- The drafted fixture-directory plan was replaced with package-local synthetic test data in `tools/validators/tests/structural/*.test.ts`; this keeps the tests smaller while still exercising known-good and known-bad cases per validator.
- The drafted animalia zero-false-positive acceptance was corrected to a diagnostic-only probe because the live corpus currently contains real structural findings. Ticket 007 remains the Bootstrap-audit owner for grandfather-or-fix disposition.
