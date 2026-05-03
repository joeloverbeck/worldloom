# MCPENH-021: Allow `get_record(section_path='frontmatter')` and `get_record(section_path='body')` to project entire frontmatter or body without a key

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/server/tools/get-record.ts` (or wherever `section_path` validation lives — likely the input-validation layer for the `get_record` tool); `tools/world-mcp/tests/tools/get-record.test.ts` (new test cases for the relaxed validation); `tools/world-mcp/README.md` (`get_record` `section_path` documentation update); `docs/CONTEXT-PACKET-CONTRACT.md` (cross-reference if the contract enumerates `section_path` semantics)
**Deps**: None — `get_record` already supports `section_path` projection for hybrid records (CHAR / DA / PA); this ticket relaxes the validation rule

## Problem

`mcp__worldloom__get_record(record_id, section_path?)` is the typed-retrieval primitive for atomic and hybrid records. For hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`), `section_path` projects a structured subset — `frontmatter.<key>` for a single frontmatter field (e.g., `frontmatter.author_profile`, `frontmatter.world_consistency`), and `body.<section-name>` for a single body section (e.g., `body.Capabilities`, `body.Epistemic Position`).

The validator rejects bare `frontmatter` or bare `body`: the error message is `section_path 'frontmatter' must start with 'frontmatter.' or 'body.' followed by a key.` This forces operators who want the FULL frontmatter (a coherent block of operator-authored auxiliary context) or the FULL body (all prose sections concatenated) to choose between two suboptimal paths:

- **Multiple calls per key**: `get_record('CHAR-0001', 'frontmatter.author_profile')` + `get_record('CHAR-0001', 'frontmatter.epistemic_horizon')` + ... — N calls for N keys, with no way to enumerate keys beforehand without first loading the full record.
- **Full-record load (omit `section_path`)**: `get_record('CHAR-0001')` — returns frontmatter AND body together; for a CHAR-NNNN dossier where the body is 5-10 KB of prose, this is wasteful when the operator only needs the frontmatter's structured metadata.

Worked session evidence (2026-05-03): a `canon-facts-from-diegetic-artifacts` invocation needed CHAR-0001's full frontmatter to ground Phase 6d.2 epistemic-horizon reasoning (which consults `author_profile`, `epistemic_horizon`, and other structured frontmatter blocks). Calling `get_record('CHAR-0001', 'frontmatter')` returned the validation error above; the operator skipped the call and inferred author position from the artifact's own frontmatter binding instead. The friction was small in this case because the artifact's `author_character_id` binding gave the operator a workable substitute, but the API capability gap is real and surfaces wherever Phase 3 narrator-reliability mapping or Phase 6d.2 epistemic-horizon checks need a CHAR / DA / PA's full structured metadata.

The desired behavior: `section_path='frontmatter'` (no dot, no key) projects the entire frontmatter block as structured data without loading the body; `section_path='body'` projects the entire body (all sections, in document order) without loading the frontmatter. This is a strict superset of the current capability — `frontmatter.<key>` and `body.<section>` continue to work unchanged.

## Assumption Reassessment (2026-05-03)

1. **Current validation behavior verified by direct session evidence:** the error message `section_path 'frontmatter' must start with 'frontmatter.' or 'body.' followed by a key.` was produced by the `mcp__worldloom__get_record` MCP tool when called with `section_path='frontmatter'` against `record_id='CHAR-0001'` in `worlds/erotica-world/`. The error indicates the validation logic explicitly rejects bare `frontmatter` and bare `body`.
2. **Tool surface location:** `mcp__worldloom__get_record` lives in `tools/world-mcp/src/server/tools/get-record.ts` (or the equivalent path per the package's current layout); the `section_path` validation is likely an input-validation guard early in the tool's handler. Implementation-phase verification: grep `tools/world-mcp/src/` for the literal error string `must start with 'frontmatter.' or 'body.'` to locate the exact validation site.
3. **Cross-skill / cross-artifact boundary:** the shared boundary is the **`section_path` semantics contract** between the MCP tool and its consumers (every skill that calls `get_record` with `section_path`). Relaxing the validation is additive — existing callers using `frontmatter.<key>` or `body.<section>` continue to work identically; only new callers using bare `frontmatter` or bare `body` see the new behavior. No breaking changes.
4. **FOUNDATIONS principle under audit:** §Tooling Recommendation states LLM agents "should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." The targeted-retrieval pattern is named here as a complement to the context-packet path; relaxing `section_path` validation strengthens the targeted path by removing an artificial restriction on the projection granularity.
5. **No Mystery Reserve / HARD-GATE / Canon Safety Check surface touched:** the change is to retrieval input validation; canon mutation surfaces (Hook 3 engine-only `_source/` writes, the patch engine's append-only ledger discipline, MR firewall enforcement) are unaffected.
6. **Schema parity:** not applicable — no record schema change; only the `section_path` input parameter's validation rule.
7. **Adjacent contradictions:** the FOUNDATIONS.md §Canonical Storage Layer block describes hybrid-record retrieval as supporting "frontmatter blocks (`frontmatter.world_consistency`, `frontmatter.author_profile`) and body sections (`body.Capabilities`) project as structured slices." The wording is consistent with `<key>`-required usage but does not explicitly forbid bare `frontmatter` / bare `body` — the FOUNDATIONS prose does not need to change; the runtime validation is the tighter contract.
8. **Impact on persisted-packet retrieval:** `get_persisted_packet_slice` is a separate tool with its own `slice_spec` shape; this ticket does NOT touch that tool. Operators wanting the persisted packet's full record set should continue to use `get_persisted_packet_slice` or `get_records(record_ids: [...])` per MCPENH-020.

## Architecture Check

1. **Why this approach is cleaner than alternatives:**
   - Alternative A — keep the strict validation; document the workaround (call `get_record` without `section_path` for full record): rejected because the workaround forces a body-load when the operator only wants frontmatter, which is wasteful for hybrid records with large bodies (CHAR dossiers, DA artifacts).
   - Alternative B — add new tools `get_record_frontmatter(record_id)` and `get_record_body(record_id)`: rejected because it expands the tool surface unnecessarily; the existing `section_path` parameter can carry the new semantics with a one-line validation relaxation.
   - The chosen approach (relax validation to accept bare `frontmatter` and bare `body`) is a strict superset of current behavior, requires zero schema or contract changes, and aligns the API with operators' natural mental model (`section_path` is a hierarchical path; bare top-level segments should resolve to the entire sub-tree).

2. **No backwards-compatibility shims:** the relaxation is additive — `frontmatter.<key>` and `body.<section>` continue to validate as before; only the previously-rejected `frontmatter` and `body` values become accepted. No alias paths, no deprecation cycle, no version-gate.

## Verification Layers

1. **`get_record(record_id, 'frontmatter')` returns full frontmatter as structured data** → unit test in `tools/world-mcp/tests/tools/get-record.test.ts` against a hybrid record (CHAR / DA / PA fixture); response object includes `frontmatter` with all top-level keys present, no `body` key.
2. **`get_record(record_id, 'body')` returns full body as structured sections** → unit test; response object includes `body` with all sections in document order, no `frontmatter` key.
3. **`get_record(record_id, 'frontmatter.<key>')` continues to work** → existing tests must continue to pass; regression check.
4. **`get_record(record_id, 'body.<section>')` continues to work** → existing tests must continue to pass; regression check.
5. **`get_record(record_id, 'invalid')` (no dot, not 'frontmatter' or 'body') still rejects** → unit test asserting the validator still rejects malformed paths; the relaxation should be specific to `frontmatter` and `body` as bare values, not a general "any path" relaxation.
6. **Atomic records (CF / CH / INV / M / OQ / ENT / SEC) reject `section_path='frontmatter'` / `section_path='body'`** → unit test; atomic records are not hybrid and have no frontmatter/body distinction; the new bare-segment values should remain hybrid-record-only.
7. **MCP tool surface descriptor updated** → `tools/world-mcp/src/server/tools/get-record.ts` schema (the `section_path` parameter description) reflects the relaxed validation; `mcp__worldloom__describe_capabilities` (or equivalent test) reports the new accepted values.

## What to Change

### 1. Relax `section_path` validation

In `tools/world-mcp/src/server/tools/get-record.ts` (verify path at implementation phase via grep for the literal error string), relax the validation rule that produces `section_path 'frontmatter' must start with 'frontmatter.' or 'body.' followed by a key.`:

- Accept bare `section_path='frontmatter'` for hybrid records → return full frontmatter, no body.
- Accept bare `section_path='body'` for hybrid records → return full body, no frontmatter.
- Continue to reject `section_path='frontmatter'` / `section_path='body'` for atomic records (CF / CH / INV / M / OQ / ENT / SEC), with a descriptive error indicating these record kinds have no frontmatter/body distinction.
- Continue to accept `section_path='frontmatter.<key>'` and `section_path='body.<section>'` unchanged.
- Continue to reject malformed paths (e.g., `section_path='invalid'`, `section_path='frontmatter..'`, `section_path='.frontmatter'`).

### 2. Update tool input-schema description

The tool's `section_path` parameter description (the JSONSchema `description` field) currently reads (verify exact text at implementation phase):

> Optional section_path projects a hybrid record subset, e.g. 'frontmatter.world_consistency' or 'body.Capabilities'.

Update to:

> Optional section_path projects a hybrid record subset. Accepted forms: 'frontmatter' (full frontmatter, no body), 'body' (full body, no frontmatter), 'frontmatter.<key>' (single frontmatter field, e.g., 'frontmatter.world_consistency'), 'body.<section>' (single body section, e.g., 'body.Capabilities'). Atomic records (CF, CH, INV, M, OQ, ENT, SEC) reject section_path entirely — they have no frontmatter/body distinction.

### 3. Tests

In `tools/world-mcp/tests/tools/get-record.test.ts`:
- Add `get_record('<hybrid-fixture-id>', 'frontmatter')` test asserting full frontmatter projection.
- Add `get_record('<hybrid-fixture-id>', 'body')` test asserting full body projection.
- Add regression tests asserting `'frontmatter.<key>'` and `'body.<section>'` continue to work.
- Add validation-fail tests asserting atomic records reject `'frontmatter'` / `'body'` and malformed paths still reject.

### 4. Documentation

- `tools/world-mcp/README.md`: update the `get_record` section's `section_path` documentation to enumerate the four accepted forms.
- `docs/CONTEXT-PACKET-CONTRACT.md`: cross-reference if the contract enumerates `section_path` semantics; if so, sync the four-form list.
- The `mcp__worldloom__get_record` tool description in `tools/world-mcp/src/server/tools/get-record.ts` (per change 2 above).

## Files to Touch

- `tools/world-mcp/src/server/tools/get-record.ts` (modify — verify path at implementation phase)
- `tools/world-mcp/tests/tools/get-record.test.ts` (modify — add new tests)
- `tools/world-mcp/README.md` (modify — `get_record` `section_path` documentation)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify, conditional — if `section_path` semantics are documented there)

## Out of Scope

- Adding new accepted `section_path` forms beyond `frontmatter` and `body` as bare values — e.g., wildcard projections (`frontmatter.*` for all keys), multi-key projections (`frontmatter.[a,b,c]`), regex paths — these are speculative and not motivated by current session evidence.
- Changes to atomic-record retrieval — atomic records remain `section_path`-rejecting per their YAML-only structure.
- Changes to `get_records` (plural) — the plural tool can pick up the same relaxation in a follow-up if symmetry is wanted; this ticket is scoped to the singular `get_record`.
- Changes to `get_record_field` / `get_records_field` — the `_field` variants project specific YAML keys for atomic records; their semantics are distinct from `section_path` and out of scope here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --grep 'get_record.*section_path'` — new test cases pass; existing tests continue to pass.
2. `cd tools/world-mcp && npm run build` — TypeScript build succeeds.
3. `cd tools/world-mcp && npm test` — full package test lane passes.
4. Manual smoke test: `mcp__worldloom__get_record(record_id='CHAR-0001', section_path='frontmatter', world_slug='erotica-world')` against `worlds/erotica-world/characters/marla-kern.md` returns full frontmatter as structured object, no body content.

### Invariants

1. `section_path='frontmatter'` and `section_path='body'` are accepted for hybrid records and rejected for atomic records — the atomic / hybrid distinction is preserved.
2. Existing `section_path='frontmatter.<key>'` and `section_path='body.<section>'` behavior is unchanged — strict superset semantics.
3. Malformed paths (no dot, not `frontmatter` or `body`; multiple consecutive dots; leading dot; etc.) continue to reject with a descriptive error.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.test.ts` — add four test cases: `frontmatter` bare projection (CHAR fixture); `body` bare projection (CHAR fixture); `frontmatter` rejection on atomic record (CF fixture); regression of `frontmatter.<key>` and `body.<section>` against the same hybrid fixture.

### Commands

1. `cd tools/world-mcp && npm test -- --grep 'section_path'` — targeted test scope for the validation changes.
2. `cd tools/world-mcp && npm test` — full-package verification.
3. `cd tools/world-mcp && npm run build` — TypeScript compilation as final gate.
