# MCPENH-065: Align `get_record` server.ts description with canonical at-runtime story-bundle class list

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/server.ts` (description-only text fix), `tools/world-mcp/README.md` (same public list mirror), and a new parity test guarding against future drift.
**Deps**: None.

## Problem

At intake, the `mcp__worldloom__get_record` server-registration description at `tools/world-mcp/src/server.ts` enumerated a subset of supported story-bundle classes — `"PG-<integer>, BEL-<integer>, CLK-<integer>, STSEC-<integer>, STQ-<integer>, STPLAN-<integer>, STEMO-<integer>, story-local DA-<integer>, or SLT-<integer>"` (9 classes named) — while the canonical at-runtime support list in `tools/world-mcp/src/tools/_shared.ts` / `tools/world-mcp/src/tools/get-record.ts` covered the full supported story-bundle id surface. The missing classes — SE, SF, OBL, CNSQ, THR, SREL, STINT, STENT, STSTAT, STCHAR, STLOC, STOBJ, BR, CHC, SLB, SAU, SP, RSP — were all genuinely supported by `get_record` at runtime; only the LLM-facing capability description was incomplete.

Session evidence: during the `/branching-story-prose-attach --page_id PG-3` run on `red-bunny`, Phase 3 check 8 (`canon_claim_without_authority`) called for loading SE-3 via `PG.input.resolved_event_id` to verify `SE.promotion_claims[]` against any world-canon claim in the prose. The operator did not invoke `mcp__worldloom__get_record(record_id='SE-3', story_slug='red-bunny')` and instead trusted PG-3's embedded `validation_trace.canon_promotion_hold` text — a typed-retrieval shortcut. The discoverable description's silence on SE was a contributing factor: an LLM agent reading the old `server.ts` description in good faith would not know `get_record` covers SE.

The landed fix is a description correction in `server.ts`, a README mirror update, and a parity test that fails the build if the runtime support list diverges from the description in the future.

## Assumption Reassessment (2026-05-23)

1. **Codebase**: At intake, `tools/world-mcp/src/server.ts` carried the incomplete enumeration. The canonical runtime id-prefix list is `STORY_BUNDLE_ID_PREFIXES` in `tools/world-mcp/src/tools/_shared.ts`; `STORY_BUNDLE_NODE_TYPES` in the same file is the node-type peer set. `get_record` also accepts story-local `DA-<integer>` when `story_slug` is supplied via `STORY_DIEGETIC_ARTIFACT_ID_PATTERN` in `tools/world-mcp/src/tools/get-record.ts`. The landed description inline-enumerates the full supported id set for LLM discoverability, with a parity test guarding drift against the exported runtime constants.
2. **Doc**: At intake, `tools/world-mcp/README.md` documented the MCP tool surface for operators and enumerated the same `get_record` story-bundle class list, but it was missing `STCHAR`. `docs/MACHINE-FACING-LAYER.md` already enumerated the full `get_record` list, including story-local `DA` and `STCHAR`, so no MACHINE-FACING-LAYER edit was required.
3. **Shared boundary under audit**: the MCP capability text consumed by LLM agents via `describe_capabilities` tool registration. The `get_record` description in `server.ts` is the canonical operator-discoverable contract. Drift between it and the runtime guard breaks the LLM's mental model of what's fetchable, contributing to typed-retrieval shortcuts (the F2 session evidence) or direct `_source/` reads (a Hook 2 / Hook 3 surface tension).
4. **FOUNDATIONS principle / Tooling Recommendation restatement**: FOUNDATIONS §Tooling Recommendation directs operators to typed retrieval (`mcp__worldloom__get_record` / `get_context_packet` / etc.) rather than direct filesystem access for canon-adjacent data. The capability text IS the discovery surface for that discipline; an incomplete description tacitly degrades the typed-retrieval contract. Aligning the description restores the contract's authority.

## Architecture Check

1. The fix is a single-site description correction plus a structural parity test. No new tool, no new endpoint, no new behavior — just truth-in-advertising for the existing endpoint. The parity test fails-loud on future drift rather than relying on operator discipline to keep the two enumeration sites in sync.
2. No backwards-compatibility shims: the description is documentation surface; updating it does not break any caller's argument-parsing. The new parity test is purely additive.

## Verification Layers

1. Description matches runtime guard → unit test in `tools/world-mcp/tests/tools/get-record.test.ts` (extension) that extracts class IDs from the exported `server.ts` description string and compares against `STORY_BUNDLE_ID_PREFIXES` plus story-local `DA`, asserting set equality.
2. LLM-discoverable description is complete → grep proof: `grep -E 'SE-<integer>|SF-<integer>|OBL-<integer>|CNSQ-<integer>|THR-<integer>|SREL-<integer>|STINT-<integer>|STENT-<integer>|STSTAT-<integer>|STCHAR-<integer>|STLOC-<integer>|STOBJ-<integer>|BR-<integer>|CHC-<integer>|SLB-<integer>|SAU-<integer>|SP-<integer>|RSP-<integer>' tools/world-mcp/src/server.ts` returns matches.
3. `describe_capabilities` output reflects the corrected description → in-memory MCP probe against `dist/src/server.js` finds `SE-<integer>`, `STCHAR-<integer>`, and `RSP-<integer>` in the registered `get_record` description.

## Landed Changes

### 1. server.ts description correction

`tools/world-mcp/src/server.ts` now exports `GET_RECORD_DESCRIPTION` and registers `get_record` with the full story-bundle id enumeration: PG, SE, BEL, SF, OBL, CNSQ, THR, SREL, STINT, STENT, STSTAT, STCHAR, STLOC, STOBJ, CLK, STSEC, STQ, STPLAN, STEMO, BR, CHC, story-local DA, SLT, SLB, SAU, SP, and RSP. The rest of the description (ARC_TRACE rejection, `section_path` semantics, and oversize delivery) remains unchanged.

### 2. Parity test

`tools/world-mcp/tests/tools/get-record.test.ts` now reads `GET_RECORD_DESCRIPTION`, extracts every `<CLASS>-<integer>` token from the story-bundle enumeration block, and asserts set equality with `STORY_BUNDLE_ID_PREFIXES` plus story-local `DA`.

Test failure on future drift means an engineer adding a new story-bundle id class to `STORY_BUNDLE_ID_PREFIXES` is forced to update the description, closing the drift loop structurally.

### 3. README mirror

`tools/world-mcp/README.md` now includes `STCHAR` in the `get_record` story-bundle id list. `docs/MACHINE-FACING-LAYER.md` was inspected and already had the full list.

### 4. Adjacent enumerations left unchanged

Other `server.ts` tool descriptions that mention story-bundle records do not carry per-class enumerations of the same drift shape, or use open-set wording. This ticket scopes to `get_record` only; the parity test pattern can be extended by a follow-up ticket if future drift surfaces at sibling descriptions.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-mcp/tests/tools/get-record.test.ts` (modify) — extend with the parity test.

## Out of Scope

- Other `server.ts` tool descriptions. The parity test pattern can be extended in a follow-up ticket if needed.
- `tools/world-mcp/README.md` external documentation updates beyond mirroring the corrected `get_record` class set.
- The `isStoryBundleNodeType`, `STORY_BUNDLE_NODE_TYPES`, and `STORY_BUNDLE_ID_PREFIXES` runtime definitions. The runtime set is correct; this ticket only aligns the description to it.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — passes including the new / extended parity test.
2. Parity test asserts the `get_record` description's story-bundle class-id set equals `STORY_BUNDLE_ID_PREFIXES` plus story-local `DA`.
3. Description-grep proof: `grep -nE 'SE-<integer>|SF-<integer>|STCHAR-<integer>|RSP-<integer>' tools/world-mcp/src/server.ts` returns the corrected description constant.

### Invariants

1. The `server.ts` `get_record` description's story-bundle enumeration MUST equal the runtime-supported id-prefix set derived from `STORY_BUNDLE_ID_PREFIXES` plus story-local `DA`. The parity test fails the build if they diverge.
2. The fix is description-only at runtime; no `get_record` argument-parsing behavior or response-shape behavior changes.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.test.ts` (modify) — added the parity-test block.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm test`
3. `grep -nE 'SE-<integer>|SF-<integer>|STCHAR-<integer>|RSP-<integer>' tools/world-mcp/src/server.ts` — confirms the corrected enumeration is in place.

## Outcome

Completed. `get_record` capability registration now uses the exported `GET_RECORD_DESCRIPTION` constant with the full runtime-supported story-bundle id list, the package README mirrors the missing `STCHAR` public documentation fix, and the compiled test suite includes a parity test against `STORY_BUNDLE_ID_PREFIXES` plus story-local `DA`.

## Verification Result

1. Baseline before source edits: `cd tools/world-mcp && npm test` passed with 428 passing tests.
2. `cd tools/world-mcp && npm run build` initially failed on a strict TypeScript narrowing issue in the new test helper; after narrowing the regex capture explicitly, it passed.
3. `cd tools/world-mcp && node --test dist/tests/tools/get-record.test.js` passed with 5 passing tests, including `get_record description enumerates every runtime-supported story-bundle id class`.
4. `cd tools/world-mcp && npm test` passed with 429 passing tests.
5. `grep -nE 'SE-<integer>|SF-<integer>|STCHAR-<integer>|RSP-<integer>' tools/world-mcp/src/server.ts` returned the corrected `GET_RECORD_DESCRIPTION` line.
6. An in-memory `describe_capabilities` probe against `dist/src/server.js` found `SE-<integer>`, `STCHAR-<integer>`, and `RSP-<integer>` in the registered `get_record` description.
7. `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` were inspected for the same public list; the README needed and received the `STCHAR` mirror update, while MACHINE-FACING-LAYER was already complete.

## Deviations

1. The drafted authority wording named `STORY_BUNDLE_NODE_TYPES` from `@worldloom/world-index`; live reassessment found the package-local `STORY_BUNDLE_ID_PREFIXES` plus story-local `DA` is the correct id-class parity authority for this description.
2. The drafted `node tools/world-mcp/dist/src/cli/describe-capabilities.js` proof command is not executable because this package has no `describe-capabilities` CLI bin. It was replaced with an in-memory MCP `describe_capabilities` probe against the built server.
