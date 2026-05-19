# SPEC48SESTRINT-012: MCP capability description + CONTEXT-PACKET-CONTRACT + MACHINE-FACING-LAYER docs updates — remove tag-grammar references

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — audits 4 MCP/docs surfaces, updates `docs/MACHINE-FACING-LAYER.md`, and truths one same-seam world-mcp integration fixture
**Deps**: archive/tickets/SPEC48SESTRINT-009.md

## Problem

At intake, SPEC-48 §Phase D D-D2 + D-D3 + D-D4 specified auditing the world-mcp + documentation surfaces that might reference the deprecated tag grammar. SPEC-48 §Phase E D-E2 added the same audit for `docs/MACHINE-FACING-LAYER.md`. The reassessment M4 finding confirmed `story-bundle-context.ts` had zero parser consumers (clean); live verification found the only stale current-contract prose in `docs/MACHINE-FACING-LAYER.md`'s `creation_evidence` edge description. Without this update, machine-facing-layer documentation would continue to describe the world-mcp surface using deprecated grammar references — confusing future operators and giving validators-package readers a stale picture of what the MCP surface actually exposes for SE provenance.

## Assumption Reassessment (2026-05-19)

1. **4 surfaces under audit**: `tools/world-mcp/src/context-packet/story-bundle-context.ts` (verified clean by SPEC-48 reassess-spec M4 — zero parser-consumer matches); `tools/world-mcp/src/tools/describe-capabilities.ts` (audit candidate; may mention tag grammar in capability descriptions); `docs/CONTEXT-PACKET-CONTRACT.md` (audit candidate; may document tag-grammar provenance in `story_bundle_context` section); `docs/MACHINE-FACING-LAYER.md` (audit candidate; may document the parser surface in retrieval / story-bundle sections).
2. **SPEC-48 enumeration**: D-D2 = audit `story-bundle-context.ts` (sub-assertion; no change expected per M4 verification); D-D3 = update `describe-capabilities.ts` to reference 3 new SE fields instead of tag grammar (if applicable); D-D4 = update `CONTEXT-PACKET-CONTRACT.md` if it documents tag-grammar provenance; D-E2 = update `MACHINE-FACING-LAYER.md` if it documents the tag-grammar parser surface.
3. **Cross-skill boundary**: world-mcp's MCP-tool surface is the LLM-facing retrieval surface for story-pipeline skills. If MCP capability descriptions still reference deprecated tag grammar, LLM consumers receive stale guidance about how SE introduction provenance is exposed. The docs surfaces (`CONTEXT-PACKET-CONTRACT.md`, `MACHINE-FACING-LAYER.md`) are operator-facing documentation; staleness there carries the same risk for future implementers.
4. **Proof-pattern correction**: the drafted grep patterns only searched `intro:.*trigger=` / `plan_relation:.*plan=` / `non_propagation:.*group=`, which missed the live stale `docs/MACHINE-FACING-LAYER.md` `intro:<CLASS>(...)` prose under `creation_evidence`. The accepted stale-anchor proof is widened to search `intro:`, `plan_relation:`, `non_propagation:`, `tag grammar`, `parseable`, and `intro-tag-parser` across the four audit surfaces.
5. **Broad proof same-seam fixture truthing**: `npm test --prefix tools/world-mcp` rebuilt the package and exposed a stale `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` fixture still expecting `creation_evidence` from an `intro:CLK(...)` parser tag. That fixture is same-seam MCP provenance proof fallout from SPEC-48's clean break, so this ticket updates only the fixture event to use `SE.record_introductions[]` while preserving the existing `get_story_state_provenance` assertions.

## Architecture Check

1. **Audit-and-update with sub-assertion fold-in**: this ticket consolidates four related audits (per SPEC-48 §Step 3 Cross-Cutting Docs Ticket Shape — "single cross-cutting docs ticket depending on the implementation tickets is a valid decomposition" — except the `story-bundle-context.ts` audit folds in as a sub-assertion confirmation since reassessment verified no change is needed there). Cleaner than 4 separate small audit tickets: docs/MCP surfaces share the same audit shape (grep for deprecated grammar references; update where present) and same dependency (parser deleted in archive/tickets/SPEC48SESTRINT-009.md).
2. **No backwards-compatibility aliasing**: the docs surfaces are updated to reference structured-field semantics directly; no "see also tag grammar" fallback prose is preserved (except in audit-trail prose explaining what the docs used to describe, scoped to retrospective explanation per ticket 002's §5a rewrite precedent).

## Verification Layers

1. `story-bundle-context.ts` clean confirmation (sub-assertion) → grep proof over `extractIntroTags`, `intro-tag-parser`, `intro:`, `plan_relation:`, `non_propagation:`, `tag grammar`, and `parseable` returns zero matches. (M4 verified this at reassess-spec time; this ticket re-confirms after archive/tickets/SPEC48SESTRINT-009.md.)
2. `describe-capabilities.ts` clean confirmation → the same grep proof returns zero matches. Live reassessment found the tool only mirrors registered descriptions; no stale tag-grammar capability prose existed in this helper.
3. `CONTEXT-PACKET-CONTRACT.md` clean confirmation → the same grep proof returns zero matches. Live reassessment found no stale tag-grammar provenance prose in the packet contract.
4. `MACHINE-FACING-LAYER.md` updated → the same grep proof returns zero matches after replacing the `creation_evidence` parser-grammar wording with `SE.record_introductions[]`.
5. World-mcp tests pass → `npm test --prefix tools/world-mcp` builds + tests clean after the stale SPEC-45 provenance fixture is expressed with structured fields.

## What to Change

### 1. Audit `tools/world-mcp/src/context-packet/story-bundle-context.ts` (sub-assertion; no change expected)

Re-grep the file after archive/tickets/SPEC48SESTRINT-009.md for any parser-import or tag-grammar reference. Expected outcome: zero matches (M4 verified at reassess-spec; this is a fresh confirmation against the post-clean-break tree). If a match is found that the audit missed, route it as a follow-up correction in this ticket; otherwise, document the audit's clean result in the ticket completion summary.

### 2. Update `tools/world-mcp/src/tools/describe-capabilities.ts`

Grep the file for deprecated tag-grammar substrings. For every match found in a capability-description string (e.g., a description claiming MCP exposes `intro:<CLASS>(...)` tag introspection), rewrite the description to reference `SE.record_introductions[]` / `SE.state_relations[]` / `SE.non_propagation_facts[]` structured fields instead. Preserve the surrounding tool-registration structure; only the descriptive strings change.

### 3. Update `docs/CONTEXT-PACKET-CONTRACT.md`

Grep for tag-grammar references — common locations are the `story_bundle_context` section, the `event_record` projection documentation, or anywhere the contract describes SE provenance fields. For every match, rewrite the prose to reference the structured fields. Preserve the contract's overall structure; only the SE-provenance prose changes.

### 4. Update `docs/MACHINE-FACING-LAYER.md`

Grep for `intro-tag-parser` / parser-surface references / tag-grammar references — common locations are the retrieval / story-bundle / world-index parser sections. For every match, rewrite the prose to reflect the post-clean-break state: the parser is deleted; SE structured fields (`record_introductions[]` / `state_relations[]` / `non_propagation_facts[]`) are the canonical provenance surface; the JSON-schema at `tools/validators/src/schemas/story-event.schema.json` is the authoritative shape. Preserve the doc's overall structure; only the parser / tag-grammar references change.

## Files to Touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (audit-only; no change expected per M4 verification)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (audit-only; no stale tag-grammar prose found)
- `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` (modify — proof fixture truthing from parser tag to structured `record_introductions[]`)
- `docs/CONTEXT-PACKET-CONTRACT.md` (audit-only; no stale tag-grammar prose found)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Schema file extension (covered by ticket 001).
- Contract document rewrite at `story-state-contract.md` / `story-record-schemas.md` (covered by ticket 002).
- Validator refactor (covered by tickets 003-007).
- World-index refactor (covered by archive/tickets/SPEC48SESTRINT-008.md).
- Parser deletion (covered by archive/tickets/SPEC48SESTRINT-009.md).
- CI gates (covered by archive/tickets/SPEC48SESTRINT-010.md).
- Skill prose updates (covered by archive/tickets/SPEC48SESTRINT-011.md).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-mcp` — world-mcp test suite passes (content-only edits don't change behavior; tests preserve all existing assertions).
2. Grep proof of all four audit surfaces clean: `rg -n 'extractIntroTags|intro-tag-parser|intro:|plan_relation:|non_propagation:|tag grammar|parseable' tools/world-mcp/src/context-packet/story-bundle-context.ts tools/world-mcp/src/tools/describe-capabilities.ts docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md` returns zero matches after refactor.
3. Grep proof of structured-field wording: `rg -n 'SE.record_introductions\\[\\]|SE.state_relations\\[\\]|SE.non_propagation_facts\\[\\]' docs/MACHINE-FACING-LAYER.md archive/specs/SPEC-48-se-structured-introduction-fields.md` confirms the canonical structured fields are documented.

### Invariants

1. The 4 audit surfaces no longer reference the deprecated tag grammar; structured-field references replace every tag-grammar mention.
2. MCP capability descriptions reflect the post-clean-break SE schema — LLM consumers receive accurate guidance about provenance fields.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` — existing MCP provenance capstone fixture updated from parser-tag evidence to structured `record_introductions[]` evidence.

### Commands

1. `npm test --prefix tools/world-mcp` — world-mcp test suite passes.
2. `rg -n 'extractIntroTags|intro-tag-parser|intro:|plan_relation:|non_propagation:|tag grammar|parseable' tools/world-mcp/src/context-packet/story-bundle-context.ts tools/world-mcp/src/tools/describe-capabilities.ts docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md` — confirms zero matches across all 4 audit surfaces.

## Outcome

Completed: 2026-05-19.

What changed:

- Replaced the stale `docs/MACHINE-FACING-LAYER.md` `creation_evidence` description that still pointed at parseable `intro:<CLASS>(...)` evidence with the structured `SE.record_introductions[]` source.
- Reconfirmed `tools/world-mcp/src/context-packet/story-bundle-context.ts`, `tools/world-mcp/src/tools/describe-capabilities.ts`, and `docs/CONTEXT-PACKET-CONTRACT.md` had no stale tag-grammar prose under the corrected stale-anchor pattern.
- Updated `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` so the existing MCP provenance capstone fixture emits `creation_evidence` through `SE.record_introductions[]`, not through the retired parser tag.

## Verification Result

- `rg -n 'extractIntroTags|intro-tag-parser|intro:|plan_relation:|non_propagation:|tag grammar|parseable' tools/world-mcp/src/context-packet/story-bundle-context.ts tools/world-mcp/src/tools/describe-capabilities.ts docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md` — passed with zero matches.
- `rg -n 'SE.record_introductions\[\]|SE.state_relations\[\]|SE.non_propagation_facts\[\]' docs/MACHINE-FACING-LAYER.md archive/specs/SPEC-48-se-structured-introduction-fields.md` — confirmed the structured-field terminology remains documented; `docs/MACHINE-FACING-LAYER.md` now names `SE.record_introductions[]`.
- `npm run build --prefix tools/world-mcp` — passed.
- `node --test dist/tests/tools/describe-capabilities.test.js` from `tools/world-mcp` — passed, 2 tests.
- `node --test dist/tests/server/dispatch.test.js --test-name-pattern 'describe_capabilities'` from `tools/world-mcp` — passed; the package wrapper ran the full dispatch file, 35 tests.
- `node --test dist/tests/integration/spec45-provenance-e2e.test.js` from `tools/world-mcp` — passed, 2 tests.
- `node dist/tests/integration/server-capabilities-hash-parity.test.js` from `tools/world-mcp` — first sandboxed run failed with `MCP error -32000: Connection closed`; escalated rerun passed, 1 test.
- `npm test --prefix tools/world-mcp` — sandboxed broad run initially failed on the stale SPEC-45 provenance fixture plus the sandboxed stdio-spawned capability test. After fixture truthing, escalated full-suite rerun passed, 407 tests.

## Deviations

- The drafted grep patterns were too narrow because they missed `intro:<CLASS>(...)` without `trigger=`. The accepted stale-anchor proof uses the wider literal set recorded above.
- The implementation touched one same-seam proof fixture (`tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts`) because the broad package suite exposed parser-era test data. No production MCP behavior changed.
- The stdio-spawned capability hash parity test needs to run outside the Codex sandbox in this session; focused in-memory MCP dispatch and the escalated full-suite run passed.
