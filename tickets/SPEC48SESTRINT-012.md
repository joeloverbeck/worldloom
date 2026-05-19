# SPEC48SESTRINT-012: MCP capability description + CONTEXT-PACKET-CONTRACT + MACHINE-FACING-LAYER docs updates — remove tag-grammar references

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — audits and updates 3 docs surfaces (`describe-capabilities.ts`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`); audits `story-bundle-context.ts` (verified clean at reassess time per M4 finding)
**Deps**: 009

## Problem

SPEC-48 §Phase D D-D2 + D-D3 + D-D4 specify auditing the world-mcp + documentation surfaces that may reference the deprecated tag grammar. SPEC-48 §Phase E D-E2 adds the same audit for `docs/MACHINE-FACING-LAYER.md`. The reassessment M4 finding confirmed `story-bundle-context.ts` has zero parser consumers (clean); the other 3 surfaces (`describe-capabilities.ts`, `CONTEXT-PACKET-CONTRACT.md`, `MACHINE-FACING-LAYER.md`) need audit + update where tag-grammar prose remains. Without this update, machine-facing-layer documentation continues to describe the world-mcp surface using deprecated grammar references — confusing future operators and giving validators-package readers a stale picture of what the MCP surface actually exposes for SE provenance.

## Assumption Reassessment (2026-05-19)

1. **4 surfaces under audit**: `tools/world-mcp/src/context-packet/story-bundle-context.ts` (verified clean by SPEC-48 reassess-spec M4 — zero parser-consumer matches); `tools/world-mcp/src/tools/describe-capabilities.ts` (audit candidate; may mention tag grammar in capability descriptions); `docs/CONTEXT-PACKET-CONTRACT.md` (audit candidate; may document tag-grammar provenance in `story_bundle_context` section); `docs/MACHINE-FACING-LAYER.md` (audit candidate; may document the parser surface in retrieval / story-bundle sections).
2. **SPEC-48 enumeration**: D-D2 = audit `story-bundle-context.ts` (sub-assertion; no change expected per M4 verification); D-D3 = update `describe-capabilities.ts` to reference 3 new SE fields instead of tag grammar (if applicable); D-D4 = update `CONTEXT-PACKET-CONTRACT.md` if it documents tag-grammar provenance; D-E2 = update `MACHINE-FACING-LAYER.md` if it documents the tag-grammar parser surface.
3. **Cross-skill boundary**: world-mcp's MCP-tool surface is the LLM-facing retrieval surface for story-pipeline skills. If MCP capability descriptions still reference deprecated tag grammar, LLM consumers receive stale guidance about how SE introduction provenance is exposed. The docs surfaces (`CONTEXT-PACKET-CONTRACT.md`, `MACHINE-FACING-LAYER.md`) are operator-facing documentation; staleness there carries the same risk for future implementers.

## Architecture Check

1. **Audit-and-update with sub-assertion fold-in**: this ticket consolidates four related audits (per SPEC-48 §Step 3 Cross-Cutting Docs Ticket Shape — "single cross-cutting docs ticket depending on the implementation tickets is a valid decomposition" — except the `story-bundle-context.ts` audit folds in as a sub-assertion confirmation since reassessment verified no change is needed there). Cleaner than 4 separate small audit tickets: docs/MCP surfaces share the same audit shape (grep for deprecated grammar references; update where present) and same dependency (parser deleted in ticket 009).
2. **No backwards-compatibility aliasing**: the docs surfaces are updated to reference structured-field semantics directly; no "see also tag grammar" fallback prose is preserved (except in audit-trail prose explaining what the docs used to describe, scoped to retrospective explanation per ticket 002's §5a rewrite precedent).

## Verification Layers

1. `story-bundle-context.ts` clean confirmation (sub-assertion) → grep proof: `grep -n "extractIntroTags\|intro-tag-parser\|intro:.*trigger=\|plan_relation:.*plan=\|non_propagation:.*group=" tools/world-mcp/src/context-packet/story-bundle-context.ts` returns zero matches. (M4 verified this at reassess-spec time; this ticket re-confirms in the post-ticket-009 tree.)
2. `describe-capabilities.ts` updated → grep proof: `grep -n "intro:.*trigger=\|plan_relation:.*plan=\|non_propagation:.*group=" tools/world-mcp/src/tools/describe-capabilities.ts` returns zero matches AFTER refactor.
3. `CONTEXT-PACKET-CONTRACT.md` updated → grep proof: `grep -n "intro:.*trigger=\|plan_relation:.*plan=\|non_propagation:.*group=\|parseable tag in world_logic_rationale" docs/CONTEXT-PACKET-CONTRACT.md` returns zero matches AFTER refactor.
4. `MACHINE-FACING-LAYER.md` updated → grep proof: `grep -n "intro-tag-parser\|parseable tag in world_logic_rationale\|intro:.*trigger=\|plan_relation:.*plan=\|non_propagation:.*group=" docs/MACHINE-FACING-LAYER.md` returns zero matches AFTER refactor.
5. World-mcp tests pass → `npm test --prefix tools/world-mcp` builds + tests clean (the `describe-capabilities.ts` edit is content-only — descriptive strings emitted by MCP capability listing; no behavior changes).

## What to Change

### 1. Audit `tools/world-mcp/src/context-packet/story-bundle-context.ts` (sub-assertion; no change expected)

Re-grep the file post-ticket-009 for any parser-import or tag-grammar reference. Expected outcome: zero matches (M4 verified at reassess-spec; this is a fresh confirmation against the post-clean-break tree). If a match is found that the audit missed, route it as a follow-up correction in this ticket; otherwise, document the audit's clean result in the ticket completion summary.

### 2. Update `tools/world-mcp/src/tools/describe-capabilities.ts`

Grep the file for deprecated tag-grammar substrings. For every match found in a capability-description string (e.g., a description claiming MCP exposes `intro:<CLASS>(...)` tag introspection), rewrite the description to reference `SE.record_introductions[]` / `SE.state_relations[]` / `SE.non_propagation_facts[]` structured fields instead. Preserve the surrounding tool-registration structure; only the descriptive strings change.

### 3. Update `docs/CONTEXT-PACKET-CONTRACT.md`

Grep for tag-grammar references — common locations are the `story_bundle_context` section, the `event_record` projection documentation, or anywhere the contract describes SE provenance fields. For every match, rewrite the prose to reference the structured fields. Preserve the contract's overall structure; only the SE-provenance prose changes.

### 4. Update `docs/MACHINE-FACING-LAYER.md`

Grep for `intro-tag-parser` / parser-surface references / tag-grammar references — common locations are the retrieval / story-bundle / world-index parser sections. For every match, rewrite the prose to reflect the post-clean-break state: the parser is deleted; SE structured fields (`record_introductions[]` / `state_relations[]` / `non_propagation_facts[]`) are the canonical provenance surface; the JSON-schema at `tools/validators/src/schemas/story-event.schema.json` is the authoritative shape. Preserve the doc's overall structure; only the parser / tag-grammar references change.

## Files to Touch

- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — audit-only; no change expected per M4 verification)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Schema file extension (covered by ticket 001).
- Contract document rewrite at `story-state-contract.md` / `story-record-schemas.md` (covered by ticket 002).
- Validator refactor (covered by tickets 003-007).
- World-index refactor (covered by ticket 008).
- Parser deletion (covered by ticket 009).
- CI gates (covered by ticket 010).
- Skill prose updates (covered by ticket 011).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-mcp` — world-mcp test suite passes (content-only edits don't change behavior; tests preserve all existing assertions).
2. Grep proof of `story-bundle-context.ts` clean: `grep -n "extractIntroTags\|intro-tag-parser\|intro:.*trigger=\|plan_relation:.*plan=\|non_propagation:.*group=" tools/world-mcp/src/context-packet/story-bundle-context.ts` returns zero matches.
3. Grep proof of MCP / docs updates: `grep -n "intro:.*trigger=\|plan_relation:.*plan=\|non_propagation:.*group=" tools/world-mcp/src/tools/describe-capabilities.ts docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md` returns zero matches AFTER refactor.
4. Grep proof of parser-surface reference removal: `grep -n "intro-tag-parser" docs/MACHINE-FACING-LAYER.md` returns zero matches AFTER refactor.

### Invariants

1. The 4 audit surfaces no longer reference the deprecated tag grammar; structured-field references replace every tag-grammar mention.
2. MCP capability descriptions reflect the post-clean-break SE schema — LLM consumers receive accurate guidance about provenance fields.

## Test Plan

### New/Modified Tests

1. `None — documentation + audit ticket; verification is grep-based and existing MCP test coverage is named in Assumption Reassessment.`

### Commands

1. `npm test --prefix tools/world-mcp` — world-mcp test suite passes.
2. `grep -n "extractIntroTags\|intro-tag-parser\|intro:.*trigger=\|plan_relation:.*plan=\|non_propagation:.*group=" tools/world-mcp/src/context-packet/story-bundle-context.ts tools/world-mcp/src/tools/describe-capabilities.ts docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md` — confirms zero matches across all 4 audit surfaces.
