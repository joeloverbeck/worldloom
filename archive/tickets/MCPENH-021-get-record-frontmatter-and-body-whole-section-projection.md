# MCPENH-021: Allow `get_record(section_path='frontmatter')` and `get_record(section_path='body')` to project entire frontmatter or body without a key

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-record.ts`; `tools/world-mcp/src/server.ts`; `tools/world-mcp/tests/tools/get-record-section-path.test.ts`; `tools/world-mcp/README.md`; `docs/MACHINE-FACING-LAYER.md`
**Deps**: None — `get_record` already supports `section_path` projection for hybrid records (CHAR / DA / PA); this ticket relaxes the validation rule

## Problem

At intake, `mcp__worldloom__get_record(record_id, section_path?)` was the typed-retrieval primitive for atomic and hybrid records. For hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`), `section_path` projected a structured subset — `frontmatter.<key>` for a single frontmatter field (e.g., `frontmatter.author_profile`, `frontmatter.world_consistency`), and `body.<section-name>` for a single body section (e.g., `body.Capabilities`, `body.Epistemic Position`).

Before this ticket, the validator rejected bare `frontmatter` or bare `body`: the error message was `section_path 'frontmatter' must start with 'frontmatter.' or 'body.' followed by a key.` This forced operators who wanted the FULL frontmatter (a coherent block of operator-authored auxiliary context) or the FULL body (all prose sections concatenated) to choose between two suboptimal paths:

- **Multiple calls per key**: `get_record('CHAR-0001', 'frontmatter.author_profile')` + `get_record('CHAR-0001', 'frontmatter.epistemic_horizon')` + ... — N calls for N keys, with no way to enumerate keys beforehand without first loading the full record.
- **Full-record load (omit `section_path`)**: `get_record('CHAR-0001')` — returns frontmatter AND body together; for a CHAR-NNNN dossier where the body is 5-10 KB of prose, this is wasteful when the operator only needs the frontmatter's structured metadata.

Worked session evidence (2026-05-03): a `canon-facts-from-diegetic-artifacts` invocation needed CHAR-0001's full frontmatter to ground Phase 6d.2 epistemic-horizon reasoning (which consults `author_profile`, `epistemic_horizon`, and other structured frontmatter blocks). Calling `get_record('CHAR-0001', 'frontmatter')` returned the validation error above; the operator skipped the call and inferred author position from the artifact's own frontmatter binding instead. The friction was small in this case because the artifact's `author_character_id` binding gave the operator a workable substitute, but the API capability gap is real and surfaces wherever Phase 3 narrator-reliability mapping or Phase 6d.2 epistemic-horizon checks need a CHAR / DA / PA's full structured metadata.

The landed behavior: `section_path='frontmatter'` (no dot, no key) projects the entire frontmatter block as structured data in the existing section response `value` without loading the body; `section_path='body'` projects every parsed body section in document order in `value` without loading the frontmatter. This is a strict superset of the prior capability — `frontmatter.<key>` and `body.<section>` continue to work unchanged.

## Assumption Reassessment (2026-05-03)

1. **Current validation behavior verified by direct session evidence:** the error message `section_path 'frontmatter' must start with 'frontmatter.' or 'body.' followed by a key.` was produced by the `mcp__worldloom__get_record` MCP tool when called with `section_path='frontmatter'` against `record_id='CHAR-0001'` in `worlds/erotica-world/`. The error indicates the validation logic explicitly rejects bare `frontmatter` and bare `body`.
2. **Tool surface location:** `mcp__worldloom__get_record` is registered in `tools/world-mcp/src/server.ts`; the handler and `section_path` validation live in `tools/world-mcp/src/tools/get-record.ts` (`projectSectionPath`). Existing focused tests live in `tools/world-mcp/tests/tools/get-record-section-path.test.ts`, not `get-record.test.ts`.
3. **Cross-skill / cross-artifact boundary:** the shared boundary is the **`section_path` semantics contract** between the MCP tool and its consumers (every skill that calls `get_record` with `section_path`). Relaxing the validation is additive — existing callers using `frontmatter.<key>` or `body.<section>` continue to work identically; only new callers using bare `frontmatter` or bare `body` see the new behavior. No breaking changes.
4. **FOUNDATIONS principle under audit:** §Tooling Recommendation states LLM agents "should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." The targeted-retrieval pattern is named here as a complement to the context-packet path; relaxing `section_path` validation strengthens the targeted path by removing an artificial restriction on the projection granularity.
5. **No Mystery Reserve / HARD-GATE / Canon Safety Check surface touched:** the change is to retrieval input validation; canon mutation surfaces (Hook 3 engine-only `_source/` writes, the patch engine's append-only ledger discipline, MR firewall enforcement) are unaffected.
6. **Schema parity:** not applicable — no record schema change; only the `section_path` input parameter's validation rule.
7. **Adjacent contradictions:** the FOUNDATIONS.md §Canonical Storage Layer block describes hybrid-record retrieval as supporting "frontmatter blocks (`frontmatter.world_consistency`, `frontmatter.author_profile`) and body sections (`body.Capabilities`) project as structured slices." The wording is consistent with `<key>`-required usage but does not explicitly forbid bare `frontmatter` / bare `body` — the FOUNDATIONS prose does not need to change; the runtime validation is the tighter contract.
8. **Impact on persisted-packet retrieval:** `get_persisted_packet_slice` is a separate tool with its own `slice_spec` shape; this ticket does NOT touch that tool. Operators wanting the persisted packet's full record set should continue to use `get_persisted_packet_slice` or `get_records(record_ids: [...])` per `archive/tickets/MCPENH-020-document-persisted-with-summary-fallback-and-batch-retrieval.md`.
9. **Verification command correction:** `tools/world-mcp/package.json` defines `npm test` as `npm run build && node --test "dist/tests/**/*.test.js"`; there is no `--grep` test lane. The targeted proof is `npm run build` followed by `node dist/tests/tools/get-record-section-path.test.js` from `tools/world-mcp/`. A diagnostic `node --test --test-name-pattern 'section_path' dist/tests/tools/get-record-section-path.test.js` invocation was too coarse for subtest reporting because the Node test runner treated the compiled file as the matching test wrapper.
10. **Direct MCP smoke substitution:** the active Codex toolset does not expose `mcp__worldloom__get_record`, so the post-change proof is package-local handler tests plus build. A direct deployed MCP smoke remains an operational follow-up after rebuilding and restarting the MCP server/client session.

## Architecture Check

1. **Why this approach is cleaner than alternatives:**
   - Alternative A — keep the strict validation; document the workaround (call `get_record` without `section_path` for full record): rejected because the workaround forces a body-load when the operator only wants frontmatter, which is wasteful for hybrid records with large bodies (CHAR dossiers, DA artifacts).
   - Alternative B — add new tools `get_record_frontmatter(record_id)` and `get_record_body(record_id)`: rejected because it expands the tool surface unnecessarily; the existing `section_path` parameter can carry the new semantics with a one-line validation relaxation.
   - The chosen approach (relax validation to accept bare `frontmatter` and bare `body`) is a strict superset of current behavior, requires zero schema or contract changes, and aligns the API with operators' natural mental model (`section_path` is a hierarchical path; bare top-level segments should resolve to the entire sub-tree).

2. **No backwards-compatibility shims:** the relaxation is additive — `frontmatter.<key>` and `body.<section>` continue to validate as before; only the previously-rejected `frontmatter` and `body` values become accepted. No alias paths, no deprecation cycle, no version-gate.

## Verification Layers

1. **`get_record(record_id, 'frontmatter')` returns full frontmatter as structured data** → unit test in `tools/world-mcp/tests/tools/get-record-section-path.test.ts` against a hybrid CHAR fixture; section response includes `section_path: "frontmatter"` and `value` with all top-level frontmatter keys present, no `body_sections` key.
2. **`get_record(record_id, 'body')` returns full body as structured sections** → unit test; section response includes `section_path: "body"` and `value` with all parsed body sections in document order, no `frontmatter` key.
3. **`get_record(record_id, 'frontmatter.<key>')` continues to work** → existing regression tests passed.
4. **`get_record(record_id, 'body.<section>')` continues to work** → existing regression tests passed.
5. **`get_record(record_id, 'invalid')` (no dot, not 'frontmatter' or 'body') still rejects** → unit test asserting the validator still rejects malformed paths; the relaxation should be specific to `frontmatter` and `body` as bare values, not a general "any path" relaxation.
6. **Atomic records (CF / CH / INV / M / OQ / ENT / SEC) reject `section_path='frontmatter'` / `section_path='body'`** → unit test; atomic records are not hybrid and have no frontmatter/body distinction; the new bare-segment values should remain hybrid-record-only.
7. **MCP tool surface descriptor updated** → `tools/world-mcp/src/server.ts` registered tool description reflects the relaxed validation and is covered by the full package lane.

## Landed Changes

### 1. Relax `section_path` validation

In `tools/world-mcp/src/tools/get-record.ts`, `projectSectionPath` now accepts bare `frontmatter` and bare `body` before dotted-path parsing:

- Bare `section_path='frontmatter'` on hybrid records returns the parsed frontmatter object in `value`, with no body payload.
- Bare `section_path='body'` on hybrid records returns the parsed body-section map in `value`, with no frontmatter payload.
- Atomic records (CF / CH / INV / M / OQ / ENT / SEC) still reject all `section_path` values, including bare `frontmatter` and bare `body`.
- Existing `section_path='frontmatter.<key>'` and `section_path='body.<section>'` behavior is unchanged.
- Malformed paths (e.g., `section_path='invalid'`, `section_path='frontmatter.'`, `section_path='.frontmatter'`) still reject with `invalid_input`.
- `enumerateValidPaths` now includes the bare `frontmatter` and `body` projection roots in `section_not_found` hints.

### 2. Update tool description

The registered tool description in `tools/world-mcp/src/server.ts` currently reads:

> Optional section_path projects a hybrid record subset, e.g. 'frontmatter.world_consistency' or 'body.Capabilities'.

It now describes the four accepted hybrid forms: `frontmatter`, `body`, `frontmatter.<key>`, and `body.<section>`, and states that atomic records reject `section_path`.

### 3. Tests

In `tools/world-mcp/tests/tools/get-record-section-path.test.ts`:
- Added `get_record('<hybrid-fixture-id>', 'frontmatter')` coverage asserting full frontmatter projection through `value`.
- Added `get_record('<hybrid-fixture-id>', 'body')` coverage asserting full body-section-map projection through `value`.
- Kept regression coverage for `'frontmatter.<key>'` and `'body.<section>'`.
- Expanded validation-fail coverage so atomic records reject `'frontmatter'`, `'body'`, and dotted section paths, and malformed paths still reject.

### 4. Documentation

- `tools/world-mcp/README.md`: updated the `get_record` section's `section_path` documentation to enumerate the four accepted forms.
- `docs/MACHINE-FACING-LAYER.md`: updated the retrieval-tool scope row for `get_record` so the machine-facing quick reference reflects hybrid projections.
- `docs/CONTEXT-PACKET-CONTRACT.md`: no source edit expected; reassessment found no `section_path` semantics enumeration there.
- The `mcp__worldloom__get_record` tool description in `tools/world-mcp/src/server.ts` was updated with the same four-form contract.

## Files to Touch

- `tools/world-mcp/src/tools/get-record.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify — registered tool description)
- `tools/world-mcp/tests/tools/get-record-section-path.test.ts` (modify — add new tests)
- `tools/world-mcp/README.md` (modify — `get_record` `section_path` documentation)
- `docs/MACHINE-FACING-LAYER.md` (modify — quick-reference retrieval semantics)

## Out of Scope

- Adding new accepted `section_path` forms beyond `frontmatter` and `body` as bare values — e.g., wildcard projections (`frontmatter.*` for all keys), multi-key projections (`frontmatter.[a,b,c]`), regex paths — these are speculative and not motivated by current session evidence.
- Changes to atomic-record retrieval — atomic records remain `section_path`-rejecting per their YAML-only structure.
- Changes to `get_records` (plural) — the plural tool can pick up the same relaxation in a follow-up if symmetry is wanted; this ticket is scoped to the singular `get_record`.
- Changes to `get_record_field` / `get_records_field` — the `_field` variants project specific YAML keys for atomic records; their semantics are distinct from `section_path` and out of scope here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` — TypeScript build succeeds and compiled test artifacts are fresh.
2. `cd tools/world-mcp && node dist/tests/tools/get-record-section-path.test.js` — targeted compiled handler tests pass for bare `frontmatter`, bare `body`, existing dotted projections, malformed paths, and atomic-record rejection.
3. `cd tools/world-mcp && npm test` — full package test lane passes.
4. Direct deployed MCP smoke is out of scope for this Codex run because `mcp__worldloom__get_record` is not exposed here; after rebuild/restart, the equivalent operational smoke is `mcp__worldloom__get_record(record_id='CHAR-0001', section_path='frontmatter', world_slug='erotica-world')` against a local indexed world.

### Invariants

1. `section_path='frontmatter'` and `section_path='body'` are accepted for hybrid records and rejected for atomic records — the atomic / hybrid distinction is preserved.
2. Existing `section_path='frontmatter.<key>'` and `section_path='body.<section>'` behavior is unchanged — strict superset semantics.
3. Malformed paths (no dot, not `frontmatter` or `body`; multiple consecutive dots; leading dot; etc.) continue to reject with a descriptive error.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-section-path.test.ts` — added focused test coverage for bare `frontmatter` projection, bare `body` projection, atomic-record rejection for bare values, malformed-path rejection, and regression of `frontmatter.<key>` / `body.<section>` against the same hybrid fixture.

### Commands

1. `cd tools/world-mcp && npm run build` — compile source and tests before exercising `dist/`.
2. `cd tools/world-mcp && node dist/tests/tools/get-record-section-path.test.js` — targeted test scope for the validation changes.
3. `cd tools/world-mcp && npm test` — full-package verification.

## Outcome

Completion date: 2026-05-03.

`get_record` now accepts bare `section_path='frontmatter'` and `section_path='body'` for hybrid CHAR / DA / PA records and returns those projections through the existing section-response `value` field. Existing dotted projection behavior remains unchanged, atomic records still reject `section_path`, and `section_not_found` hints now include the bare projection roots. The registered MCP tool description, package README, and machine-facing quick reference now document the four accepted hybrid projection forms.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node dist/tests/tools/get-record-section-path.test.js` — passed; 10 section-path subtests passed, including bare `frontmatter`, bare `body`, atomic rejection, malformed-path rejection, and dotted-path regressions.
3. `cd tools/world-mcp && npm test` — passed; full package lane reported 291 passing tests.

## Deviations

1. The drafted `npm test -- --grep ...` lane was not a real package command shape. The accepted targeted proof uses the freshly built compiled test file directly.
2. A direct deployed `mcp__worldloom__get_record(...)` smoke was not run because this Codex session does not expose the Worldloom MCP tool. Package-local handler and full package tests are the truthful proof surface for this implementation run.
3. `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/.secret` were already ignored package artifacts before verification. `npm run build` / `npm test` refreshed ignored `dist/` as expected; no tracked generated artifacts were added.
