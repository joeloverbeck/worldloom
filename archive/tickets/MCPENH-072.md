# MCPENH-072: Extend list_records fields projection with dotted-path navigation into parsed record bodies

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records.ts` (projection-time dotted-path navigation); `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (story-bundle dotted projection coverage); `tools/world-mcp/src/server.ts` (registered capability metadata); `tools/world-mcp/README.md` (operator-facing projection contract); `docs/MACHINE-FACING-LAYER.md` (machine-facing projection contract).
**Deps**: `archive/tickets/MCPENH-034-list-records-fields-validation-and-deep-projection-on-hybrid-default-mode.md` (explicit precedent — deferred this work as "Alternative A" pending downstream skill evidence; this ticket IS that evidence).

## Problem

At intake, `mcp__worldloom__list_records` accepted a `fields` projection list, but `tools/world-mcp/src/tools/list-records.ts` (`projectRecord`) used flat top-level key lookup only — `Object.prototype.hasOwnProperty.call(record, field)`. Requested fields that pointed at nested record-body paths (e.g., `grounding.compatible_turn_drivers` on a `storylet_record`) hard-failed with `invalid_input` / `Unknown list_records fields key '<field>'` because the accepted-key set at `acceptedProjectionKeys` derived from `Object.keys(record)` — top-level keys only.

The intake asymmetry was structural and visible in the same file: `valueAtDottedPath` already implemented dotted-path navigation and was used by the `filters` path through `matchesFilters` (so `filters={'scope.visibility': 'global_author_pool'}` worked correctly on `storylet_record`). The same dotted-path mechanism was not applied to the projection path before this ticket.

Session-evidence retcon justification (Rule 6): in the `commitment-block-authoring` session run that motivated this audit, the call `mcp__worldloom__list_records(record_type='storylet_record', story_slug='red-bunny', filters={'scope.visibility': ['global_author_pool', 'branch_prefix_scoped']}, fields=['move_family', 'compatible_turn_drivers', 'predicate_classes', 'action_families'])` errored on the first invocation; the operator fell back to projecting parent objects `fields=['move_family', 'grounding', 'preconditions', 'exit_options']` — over-fetching 5–10x the data the projection was meant to optimize. `compatible_turn_drivers` lives at `grounding.compatible_turn_drivers` on the SLT body; with dotted-path projection it becomes addressable directly.

`archive/tickets/MCPENH-034`'s Out-of-Scope section explicitly named this work: *"Dotted-path navigation for `fields` (Alternative A): extending `fields` to navigate dotted paths into the parsed record body … Out of scope here; may become a future ticket if downstream skill evidence demands it."* The `.claude/skills/commitment-block-authoring/SKILL.md` prose at lines 36, 112, 128, 177 names nested projection fields treating them as if Alternative A had landed — confirming the downstream-evidence trigger condition. The new behavior (dotted-path projection) is the new behavior; the prior behavior (flat-only projection with hard-fail validation) is the existing behavior; the audit's emergence IS the warrant.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment**. Before implementation, `tools/world-mcp/src/tools/list-records.ts` had `projectRecord` reading `record[field]` after a flat `hasOwnProperty` check — no dotted-path navigation. `acceptedProjectionKeys` derived accepted keys from `Object.keys(record)` (top-level only). `valueAtDottedPath` existed and was used by `matchesFilters` for the `filters` path. The dotted-path mechanism was present in-file; only the projection path was missing it. The validation hard-fail path at `projectionFieldValidation` emitted the `Unknown list_records fields key` error confirmed by the audit's session evidence.

2. **Doc reassessment**. `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` documented the `fields` parameter contract. Both now state that atomic/story-bundle `fields` accepts dotted-path strings that navigate into the parsed record body, paralleling the dotted-path semantics already in `filters`, with a concrete `fields=['grounding.compatible_turn_drivers']` storylet example.

3. **Shared-boundary identification**. Cross-skill / cross-tool boundary under audit: `tools/world-mcp/src/tools/list-records.ts` (provider) and every story-pipeline skill that uses `list_records` field projection on nested record bodies (consumers). The motivating downstream evidence is `.claude/skills/commitment-block-authoring/SKILL.md` (Pre-flight step 4 (i), World-State Prerequisites, Phase 1 SLT-pool load), but the contract change is general and benefits every consumer that otherwise has to project parent objects (`grounding`, `scope`, `mystery_policy`, `preconditions`, `effects`, etc.) when only one nested leaf is needed. The contract change is purely additive — flat top-level projection (the current contract) remains semantically identical; dotted-path projection is a new accepted form that produces a record with the dotted key as the response key (parallel to the flat-projection convention).

4. **FOUNDATIONS principle restatement**. Rule 6 (No Silent Retcons) governs every change to existing pipeline behavior: the existing behavior (flat-only projection with hard-fail validation on nested paths) is being changed to a new behavior (flat OR dotted projection with hard-fail validation on paths that resolve to nothing) — the change is warranted by the downstream skill evidence MCPENH-034 explicitly asked for. The retcon justification is recorded in this ticket's Problem section and in the Assumption Reassessment audit-trail. Tooling Recommendation (`docs/FOUNDATIONS.md` §"non-negotiable") — the MCP retrieval surface is the canonical context-packet + targeted-retrieval mechanism; closing this projection gap directly serves the recommendation by replacing the parent-object over-fetch fallback with a precise per-leaf projection.

5. **Schema extension shape**. `list_records` response remains `{records: [...], total, truncated}`; each projected record remains `{record_id, <projected-field>: <value>, ...}`. With dotted-path projection landed, the response shape is `{record_id, <dotted-or-flat-projected-field>: <value>, ...}` — the response-key naming convention follows the projection-key string exactly. Example: `fields=['grounding.compatible_turn_drivers']` on `SLT-1` produces `{record_id: 'SLT-1', 'grounding.compatible_turn_drivers': ['player_action', 'player_write_in']}`. Consumers of the existing flat-projection response shape see no behavior change — flat projection paths continue to work and continue to return flat-keyed responses. The extension is additive-only.

6. **Package public-surface correction**. Reassessment confirmed the implementation and docs surfaces named in the draft, and also found same-seam registered capability text in `tools/world-mcp/src/server.ts` that still described `fields` as response-shape top-level-key validation only. Because `describe_capabilities` exposes this text to operators and downstream skills, the active boundary includes updating that metadata alongside the handler and docs. The package baseline was run before source edits: `cd tools/world-mcp && npm test` passed with 479 tests.

## Architecture Check

1. **Cleaner than alternatives**. The dotted-path mechanism already exists in-file at `valueAtDottedPath` and is correctly applied to `filters`; reusing it for the projection path is the smallest, most consistent extension — no new helper, no new validation surface, no API-shape decision. The alternative of asking the operator to project parent objects (`grounding`) when they want one leaf (`grounding.compatible_turn_drivers`) defeats the projection's purpose of reducing payload size; the alternative of introducing per-projection helpers for each nested field is unbounded scope. Reusing `valueAtDottedPath` in `projectRecord` and updating `acceptedProjectionKeys` to recognize dotted-path candidates that resolve through the same navigator is the minimal coherent change.

2. **No backwards-compatibility aliasing/shims introduced**. Flat top-level field projection (the current contract) keeps working byte-identically — no shim, no alias. Dotted-path projection is a new accepted form that produces a new response-key shape (the dotted key, by convention). The concise `accepted_projection_keys` enumeration remains top-level starter keys. The behavior of the hard-fail validation path is unchanged — it now hard-fails on dotted paths that resolve to `undefined` on every returned record, same as it hard-fails on flat keys that match nothing.

## Verification Layers

1. **Dotted-path projection navigates into the parsed body** → codebase grep-proof: `rg -n 'valueAtDottedPath|dotted parsed-body paths|grounding.compatible_turn_drivers' tools/world-mcp/src/tools/list-records.ts tools/world-mcp/tests/tools/list-records.story-bundle.test.ts tools/world-mcp/src/server.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md`; package-local test at `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` exercises `fields=['grounding.compatible_turn_drivers']` on a `storylet_record` fixture and asserts the response carries `{'grounding.compatible_turn_drivers': [...]}` per record.
2. **Flat top-level projection remains unchanged** → same test file regression coverage: mixed `fields=['move_family', 'grounding.compatible_turn_drivers']` on `storylet_record` continues to return `{record_id, move_family, 'grounding.compatible_turn_drivers'}` with the flat key preserved.
3. **Hard-fail validation extends to dotted paths that resolve to `undefined`** → same test file: `fields=['grounding.nonexistent_leaf']` errors with `invalid_input` / `Unknown list_records fields key 'grounding.nonexistent_leaf'`; `accepted_projection_keys` payload remains the top-level starter set.
4. **Filters path is unchanged** → existing story-bundle test coverage continues to prove `filters={'visibility.scope': 'global_author_pool'}` filters correctly before projection.

## Landed Changes

### 1. `tools/world-mcp/src/tools/list-records.ts` — extend `projectRecord` and `acceptedProjectionKeys` to use the existing dotted-path helper

`projectRecord` now uses `valueAtDottedPath(record, field)` and assigns the navigated value to `projected[field]` when the value is not `undefined`. The response-key naming follows the projection-key string exactly (flat keys keep flat names; dotted keys keep dotted names) — consistent with the existing flat-projection convention.

`acceptedProjectionKeys` still returns top-level keys derived from `Object.keys(record)` for the concise discoverability hint path. `projectionFieldValidation` now additionally accepts dotted-path projection requests by recomputing acceptance per requested field: a requested field is accepted iff `valueAtDottedPath(record, field) !== undefined` for at least one record in `projectionSources`. The error path's `accepted_projection_keys` payload remains the top-level enumeration, while the error message now names dotted parsed-body paths as accepted when they resolve.

### 2. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` — add dotted-path projection coverage

Added tests asserting: (a) `fields=['grounding.compatible_turn_drivers']` on `storylet_record` returns `{record_id, 'grounding.compatible_turn_drivers': [...]}` per record; (b) mixed `fields=['move_family', 'grounding.compatible_turn_drivers']` returns both keys with their respective values; (c) `fields=['grounding.nonexistent_leaf']` returns `invalid_input` / `Unknown list_records fields key`; and (d) existing dotted-filter coverage continues to pass.

### 3. `tools/world-mcp/src/server.ts` — update registered capability metadata

Updated the `list_records` capability description so `describe_capabilities` advertises dotted-path `fields` projection for parsed atomic/story-bundle records, while preserving the hybrid compact-metadata / full-body escape-hatch boundary.

### 4. `tools/world-mcp/README.md` — update the `fields` projection contract paragraph

Updated the `list_records` paragraph to name dotted-path projection as a supported form, paralleling the dotted-path semantics already documented for `filters`. The paragraph includes the concrete example `fields=['grounding.compatible_turn_drivers']` on `storylet_record` returning `{record_id, 'grounding.compatible_turn_drivers': [...]}` per record. It also preserves the MCPENH-034 boundary: hybrid record default-mode projection remains governed by the existing compact metadata key set.

### 5. `docs/MACHINE-FACING-LAYER.md` — mirror the README contract update

Added the same dotted-path projection description and concrete example to the machine-facing reference, with wording kept consistent with the README so an operator reading either surface sees the same contract.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify) — `projectRecord` + `projectionFieldValidation` dotted-path support
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify) — dotted-path projection coverage + regression tests
- `tools/world-mcp/src/server.ts` (modify) — registered capability metadata
- `tools/world-mcp/README.md` (modify) — projection-contract paragraph with example
- `docs/MACHINE-FACING-LAYER.md` (modify) — parallel projection-contract paragraph with example

## Out of Scope

- **Array-element projection** (e.g., `fields=['exit_options[*].action_family']` on `storylet_record` to flatten an array-of-objects column). This is a richer DSL question (array index navigation, wildcard semantics, flattening shape) and deserves separate session evidence and design before commitment. The session evidence here is satisfied by dotted-path projection alone — operators wanting `action_families` still project the parent object `exit_options` (no regression) and may upgrade to per-leaf array projection in a future ticket when downstream evidence emerges.
- **Derived projection** (e.g., `fields=['predicate_classes']` on `storylet_record`, where `predicate_classes` is the set of record-class prefixes referenced by `preconditions.hard[*]` / `preconditions.soft[*]` — not a field on the record schema). Derived projection requires computation logic per field; it is a richer ask and likewise deferred pending separate evidence.
- **Hybrid default-mode projection extension**. Hybrid records (`character_record`, `diegetic_artifact_record`, `adjudication_record`, etc.) currently project the `HYBRID_METADATA_FIELD_KEYS` set under default mode (per MCPENH-024 / MCPENH-034); extending dotted-path projection into hybrid `body.frontmatter.*` or `body.body_sections.*` keys under `include_full_body=true` mode is the open API-shape decision MCPENH-034 explicitly named (does the projected output retain the `body` wrapper? how does it compose with the existing whole-section projection on `get_record`?). Out of scope for this ticket; may become a future ticket if downstream evidence demands it.
- **SKILL.md prose corrections**. The `.claude/skills/commitment-block-authoring/SKILL.md` prose currently names `compatible_turn_drivers`, `predicate_classes`, `action_families` as projection field names. After this ticket, `compatible_turn_drivers` is addressable as `grounding.compatible_turn_drivers` but `predicate_classes` and `action_families` remain parent-object-only. Post-ticket review created `tickets/MCPENH-073.md` to correct that skill prose; it is not part of this MCP package ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — full package test suite (build + node --test against `dist/tests/**/*.test.js`) passes including the new dotted-path projection assertions.
2. Programmatic `list_records(world_slug='<fixture>', record_type='storylet_record', story_slug='<fixture>', fields=['grounding.compatible_turn_drivers'])` returns each record as `{record_id, 'grounding.compatible_turn_drivers': [...]}` with the navigated array preserved.
3. Programmatic `list_records(..., fields=['move_family'])` on the same fixture continues to return `{record_id, move_family}` per record — flat-projection regression.
4. Programmatic `list_records(..., fields=['grounding.nonexistent_leaf'])` returns `invalid_input` with `unknown_projection_keys: ['grounding.nonexistent_leaf']`.
5. Programmatic `list_records(..., filters={'scope.visibility': 'global_author_pool'})` returns the filtered subset unchanged (filters-path regression).

### Invariants

1. Dotted-path projection produces a response key that exactly matches the requested projection-key string (no normalization, no flattening) — operators consuming the projected record see a known key shape.
2. Flat top-level projection behavior is byte-identical to current behavior — existing consumers see no change.
3. `valueAtDottedPath` is the single dotted-path navigator used by BOTH `projectRecord` and `matchesFilters` — no parallel implementation drift.
4. Hard-fail validation on projection paths that resolve to `undefined` across every returned record continues to short-circuit with `invalid_input`; the silent-drop failure mode MCPENH-034 closed for flat projection is not reintroduced for dotted projection.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` — extended with dotted-path projection cases (positive, hard-fail, mixed-flat-and-dotted) plus existing filters-regression coverage over the storylet_record fixture.

### Commands

1. `cd tools/world-mcp && npm test` — package-local full suite; the `test` script in `tools/world-mcp/package.json` runs `npm run build` then `node --test "dist/tests/**/*.test.js"` and is the canonical verification surface for this MCP-tool change (parallel to MCPENH-034's verification pattern).

## Outcome

Implemented dotted-path `fields` projection for atomic/story-bundle parsed record bodies in `mcp__worldloom__list_records`.

- `projectRecord` now uses `valueAtDottedPath` for projection, matching the existing dotted-path filter navigator.
- Projection validation now accepts requested dotted paths that resolve on at least one filtered projection source and still rejects paths that resolve nowhere.
- Projected response keys preserve the exact requested field string, including dotted field names.
- Hybrid default/projection mode remains limited to compact metadata keys; `include_full_body=true` still ignores `fields`.
- README, machine-facing docs, and registered capability metadata now describe the new projection contract.

## Verification Result

Passed:

1. Pre-edit baseline: `cd tools/world-mcp && npm test` — passed with 479 tests.
2. `cd tools/world-mcp && npm run build`.
3. `cd tools/world-mcp && node --test dist/tests/tools/list-records.story-bundle.test.js` — first run exposed a test-fixture miss (`move_family` absent from the synthetic large storylet fixture); after adding the fixture field, rerun passed with 14 tests.
4. Final broad proof: `cd tools/world-mcp && npm test` — passed with 482 tests.
5. `rg -n 'valueAtDottedPath|dotted parsed-body paths|grounding.compatible_turn_drivers|Atomic/story-bundle fields accept|fields accept top-level keys|Fields are validated against response-shape top-level keys' tools/world-mcp/src/tools/list-records.ts tools/world-mcp/tests/tools/list-records.story-bundle.test.ts tools/world-mcp/src/server.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` — confirmed handler, tests, docs, and capability text carry the updated contract.

## Deviations

- Added `tools/world-mcp/src/server.ts` to the owned file set during reassessment because `describe_capabilities` exposes the `list_records` projection contract to operators.
- Test coverage landed in `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts`, not `tools/world-mcp/tests/tools/list-records.test.ts`, because the owned example is story-bundle `storylet_record` projection.
- Post-ticket review created `tickets/MCPENH-073.md` for the out-of-scope commitment-block-authoring skill-prose correction.
- `npm test` emitted existing non-fatal fixture diagnostics for `drifted-world` and `skewed-world` lacking recognized SPEC-13 atomic source records; the suite still passed.
- `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/dist/` were ignored package artifacts in the package-scoped status snapshot; `dist/` was refreshed by `npm run build` / `npm test`.
