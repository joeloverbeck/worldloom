# SPEC53CHAPIPSEC-002: MCP NCP/NCB hybrid get/list retrieval

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-record.ts` + `list-records.ts` (MCP retrieval surface); no impact on the world-index parser (already first-classes NCP/NCB).
**Deps**: None

## Problem

The world-index already first-classes NCP/NCB (`NodeType` includes `character_proposal_card` / `character_proposal_batch`; `prose.ts` parses the ids; a structured `batch_id` edge exists; the ranking policy treats `character_proposal_card` as authority-bearing). But MCP targeted retrieval does not expose them: `get_record` (`HybridRecordKind`, `HYBRID_RECORD_ID_PATTERN`, `NODE_TYPE_TO_HYBRID_KIND`, `validateRecordId`) and `list_records` (`SUPPORTED_LIST_RECORD_TYPES`, `RECORD_TYPE_TO_NODE_TYPE`) recognize only `CHAR`/`DA`/`PA`. `get_record("NCP-1")` fails at `validateRecordId`; `list_records(record_type="character_proposal_card")` is rejected. This blocks duplicate-detection and proposal-to-character retrieval workflows from fetching prior cards by id.

## Assumption Reassessment (2026-05-20)

1. **Codebase**: `tools/world-mcp/src/tools/get-record.ts` — `HybridRecordKind` (line 55), `HYBRID_RECORD_ID_PATTERN = /^(?:CHAR|DA|PA)-\d+$/` (line 113), `NODE_TYPE_TO_HYBRID_KIND` (lines 131–135), `validateRecordId` expected-message (line 174) all exclude NCP/NCB. `tools/world-mcp/src/tools/list-records.ts` — `SUPPORTED_LIST_RECORD_TYPES` (lines 21–58) and `RECORD_TYPE_TO_NODE_TYPE` (lines 117–154) exclude the proposal types. World-index `NodeType` already includes `"character_proposal_card"` / `"character_proposal_batch"` (verified via `tools/world-index/src/schema/types.ts`).
2. **Spec/docs**: SPEC-53 Phase 2; SPEC-52 (archived) §Out of Scope deferred only a *new MCP task type / context-packet entry*, NOT hybrid get/list support — this ticket completes the unfinished retrieval surface, it does not re-open a deferred decision.
3. **Cross-package boundary under audit**: `tools/world-mcp` consumes `tools/world-index`'s public `NodeType` union and read surface (it may not reach into parser internals). The new map entries reference node types the index already exports — no boundary violation, no new type relocation needed.
4. **FOUNDATIONS principle (§Tooling Recommendation / §Canonical Storage Layer)**: typed retrieval over indexed nodes is the non-negotiable read contract. Nodes the index first-classes should be retrievable via `get_record` / `list_records`; this change closes the asymmetry without adding a new task type or context-packet surface.
5. **Public-surface drift found at reassessment**: `tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` described hybrid retrieval/enumeration as CHAR/DA/PA-only. Because this ticket changes a user-facing MCP retrieval contract and `describe_capabilities` exposes `list_records.record_type`, these same-seam docs/capability descriptions are owned proof-surface fallout.

## Architecture Check

1. The change is purely additive to two lookup maps + one id-pattern + one error string + two `list_records` arrays — it mirrors the existing CHAR/DA/PA wiring exactly, so the new types travel the same hybrid code path (`parseHybridFile`, `deriveHybridTitle`, section-path projection, oversize handling) with no special-casing.
2. No backwards-compatibility shim; no new task type, ranking profile, or context-packet entry (those remain deferred per SPEC-52). `deriveHybridTitle` already falls back to `node_id` (derived from `proposal_id` / `batch_id`) when no `title`/`name`/`summary` frontmatter key is present, so NCB manifests resolve a title without new code.

## Verification Layers

1. `get_record("NCP-1")` returns frontmatter + body sections → MCP tool test (hybrid path).
2. `get_record("NCP-1", section_path="frontmatter.memorability_profile")` projects → MCP tool test (section-path projection).
3. `list_records(record_type="character_proposal_card", include_full_body=true)` returns parsed cards; `"character_proposal_batch"` returns batches → MCP tool test.
4. Invalid-record-type / invalid-id error messages now list the proposal types → MCP tool test (error-message assertion).

## What to Change

### 1. `get-record.ts`

- Extend `HybridRecordKind` with `"character_proposal_card" | "character_proposal_batch"`.
- Extend `HYBRID_RECORD_ID_PATTERN` to `/^(?:CHAR|DA|PA|NCP|NCB)-\d+$/` (note the literal `\d+` — the source report's §14.2 candidate edit has a `-d+$` typo; do not copy it).
- Add `character_proposal_card`/`character_proposal_batch` entries to `NODE_TYPE_TO_HYBRID_KIND`.
- Update the `validateRecordId` expected-message text to list `NCP-<integer>`, `NCB-<integer>` in the hybrid group.

### 2. `list-records.ts`

- Add `"character_proposal_card"`, `"character_proposal_batch"` to `SUPPORTED_LIST_RECORD_TYPES` and to `RECORD_TYPE_TO_NODE_TYPE`.

## Files to Touch

- `tools/world-mcp/src/tools/get-record.ts` (modify)
- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify — capability descriptions / enum exposure)
- `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify)
- `tools/world-mcp/README.md` (modify — public retrieval docs)
- `docs/FOUNDATIONS.md` (modify — read-discipline contract)
- `docs/MACHINE-FACING-LAYER.md` (modify — retrieval tool table)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — follow-up retrieval table)

## Out of Scope

- A dedicated `character_proposal_upgrade` MCP task type, ranking profile, token budget, or context-packet entry (deferred per SPEC-52).
- Any change to the world-index parser (it already first-classes NCP/NCB).
- Wiring NCP/NCB into `get_context_packet`.

## Acceptance Criteria

### Tests That Must Pass

1. `get_record("NCP-1", world_slug)` and `get_record("NCB-1", world_slug)` return hybrid bodies (frontmatter + body sections) against a fixture world.
2. `list_records(record_type="character_proposal_card", include_full_body=true)` returns cards; `"character_proposal_batch"` returns batches.
3. `npm test --prefix tools/world-mcp` passes; invalid-id / invalid-record-type messages now name the proposal types.

### Invariants

1. CHAR/DA/PA retrieval behavior is unchanged (additive only).
2. NCP/NCB travel the same hybrid code path as CHAR — no special-case branch.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` — add NCP/NCB get + section-path projection cases.
2. `tools/world-mcp/tests/tools/list-records.test.ts` — add `character_proposal_card` / `character_proposal_batch` list cases + error-message assertion.

### Commands

1. `npm test --prefix tools/world-mcp`
2. `npm run build --prefix tools/world-mcp` (`tsc` covers typecheck; no `typecheck` script exists)

## Outcome

Completed 2026-05-20.

`tools/world-mcp` now treats proposal cards and proposal batches as first-class hybrid records:

- `get_record` accepts `NCP-<integer>` and `NCB-<integer>` ids, maps `character_proposal_card` / `character_proposal_batch` node types to hybrid record kinds, and returns parsed frontmatter plus body sections with the existing `section_path` projection behavior.
- `list_records` accepts `record_type="character_proposal_card"` and `record_type="character_proposal_batch"`, including compact metadata, filtering/projection, and `include_full_body` through the existing hybrid path.
- The MCP capability descriptions, package README, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` now name the proposal hybrid retrieval surface instead of describing hybrid support as CHAR/DA/PA-only.
- The active SPEC-53 Phase 2 section has a dated implementation note so the spec no longer presents this seam as wholly unlanded.

## Verification Result

Commands run from `tools/world-mcp`:

1. `npm test` before edits: PASS — 414 tests passed, establishing the package baseline.
2. `npm run build`: PASS — TypeScript compiled the world-mcp package and refreshed `dist/`.
3. `node --test dist/tests/tools/get-record-hybrid.test.js dist/tests/tools/list-records.test.js dist/tests/server/dispatch.test.js`: PASS — 66 focused tests passed, including NCP/NCB get/list coverage and capability enum exposure.
4. `npm test` after final edits: PASS — 417 tests passed, covering the full package lane.

## Deviations

- Same-seam public-surface truthing was broader than the draft file list: `tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` all described hybrid retrieval/enumeration as CHAR/DA/PA-only and moved with the MCP contract change.
- `tools/world-mcp/dist/` was regenerated by build/test commands and remains an ignored generated artifact. Existing ignored artifacts `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`, `tools/validators/dist/`, and `tools/validators/node_modules/` remain untracked/ignored and were not source edits for this ticket.
