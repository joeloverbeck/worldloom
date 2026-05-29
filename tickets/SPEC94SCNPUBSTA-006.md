# SPEC94SCNPUBSTA-006: Capstone — §6 completeness sweep + multi-package build/test + acceptance gate

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — verification-only ticket; exercises the surfaces changed by SPEC94SCNPUBSTA-001..005. Introduces no production code.
**Deps**: SPEC94SCNPUBSTA-001, SPEC94SCNPUBSTA-002, SPEC94SCNPUBSTA-003, SPEC94SCNPUBSTA-004, SPEC94SCNPUBSTA-005

## Problem

SPEC-94's acceptance is cross-cutting: the §6 completeness sweep ("zero in-scope `SCN`-publication-status references outside `archive/`") and the §9 acceptance criteria (1–8) can only be verified once the contract (001), schema+tests (002), both skills (003/004), and docs/fixtures (005) have all landed. This capstone runs the sweep, the three package build/test suites, and the acceptance-criteria checklist as the spec's end-to-end verification gate. It is the single place the §6 sweep's "re-run as an acceptance gate" requirement is satisfied.

## Assumption Reassessment (2026-05-29)

1. The §6 sweep grep is `grep -rn "planned | rendered | attached\|scn_status\|SCN\.status\|SCN status\|scene.*status" .claude/skills/ docs/ tools/validators/src tools/world-index/src tools/world-mcp/src | grep -v "archive/"`; per the reassessed §6 it is `src`-scoped (excludes `tests/`). The three package build/test commands are `cd tools/validators && npm test`, `cd tools/world-index && npm test`, `cd tools/world-mcp && npm test` — all scripts verified to exist this session.
2. SPEC-94 §8 (Build & test) + §9 (Acceptance criteria 1–8) define this ticket's test matrix. Each acceptance criterion maps to an upstream ticket's surface; this capstone confirms them together.
3. Cross-artifact verification boundary under audit: this ticket reads the post-implementation state of all five upstream tickets' surfaces (contract markdown, JSON schema, two skills, docs, fixtures) and proves the spec's invariants hold across them. It owns no production file.
4. FOUNDATIONS principle motivated: the capstone verifies the spec's FOUNDATIONS posture — no hash/freshness fingerprint added anywhere (§9 ac 6; the receipt's `included_pages[].state_hash_at_attach` unchanged), publication state derived not stored, and the Mystery Reserve firewall (`scene_range_forbidden_mystery_resolution`) preserved (Rule 7). These are alignment checks, not new mechanisms.

## Architecture Check

1. A single trailing verification ticket is the correct home for the §6 sweep (which is meaningless until every upstream edit lands) and for the multi-package suite run; folding it into any one implementation ticket would make that ticket's acceptance depend on siblings it doesn't own.
2. No backwards-compatibility shim and no production code — pure verification.

## Verification Layers

1. Zero in-scope `SCN`-publication-status references survive → codebase grep-proof (§6 sweep returns only out-of-scope `entity/story/clock/thread status` hits, each triaged and excluded).
2. Validator schema + tests green → schema validation + test-suite run (`cd tools/validators && npm test`).
3. world-index `SCN` enumeration unaffected; world-mcp retrieval unaffected → test-suite run (`cd tools/world-index && npm test`, `cd tools/world-mcp && npm test`).
4. No hash/freshness field added; receipt `state_hash_at_attach` unchanged → codebase grep-proof + manual review (FOUNDATIONS alignment).
5. MR firewall preserved → FOUNDATIONS alignment check (`scene_range_forbidden_mystery_resolution` untouched; no validator/skill pass silently resolves an `M` entry).

## What to Change

### 1. Run the §6 completeness sweep and triage

- Execute the §6 sweep grep; confirm every remaining hit is out-of-scope (`STSTAT`/`STQ`/`CLK`/`entity_status`/`scene_range_entity_status_consistency`/`signature_scene_behaviors`) and documented as excluded. Zero in-scope `SCN`-publication-status references.

### 2. Run the three package build/test suites

- `cd tools/validators && npm test` (schema + fixtures from 002).
- `cd tools/world-index && npm test` (enumeration regression; fixtures from 005).
- `cd tools/world-mcp && npm test` (retrieval regression; fixtures from 005).

### 3. Walk the §9 acceptance-criteria checklist (1–8)

- ac1 → §4.5.20 has no `status`, documents read-time derivation (001).
- ac2 → `story-scene.schema.json` lacks `status`; validator tests pass; stray-`status` rejected (002).
- ac3 → scene-plan writes no `status`; `previous_scene_id` uses adjacency+supersession; INDEX uses derived indicator (003).
- ac4 → scene-prose-attach has no `SCN.status` precondition; still writes only receipt+INDEX (004).
- ac5 → §6 sweep returns zero in-scope hits (this ticket, step 1).
- ac6 → no hash/freshness field added; receipt `state_hash_at_attach` unchanged.
- ac7 → world-index build+tests pass; SCN enumeration unaffected (005 fixtures + this ticket).
- ac8 → no scene-range validator, SE/PG/CHC engine, or `state_hash` chain behavior changed.

## Files to Touch

- None — verification-only ticket.

## Out of Scope

- Any production-code or contract change — all of that lands in SPEC94SCNPUBSTA-001..005.
- Any new test file (this ticket runs existing suites + the sweep; it authors no fixtures).
- Any work belonging to SPEC-95 (scene-coverage layer), SPEC-96..99 (explorer/backend/MCP), or SPEC-90 removal.

## Acceptance Criteria

### Tests That Must Pass

1. The §6 completeness sweep returns zero in-scope `SCN`-publication-status references outside `archive/` (out-of-scope `entity/story/clock/thread status` hits documented as excluded).
2. `cd tools/validators && npm test`, `cd tools/world-index && npm test`, and `cd tools/world-mcp && npm test` all pass.
3. `grep -rn "state_hash_at_attach" tools/validators/src/schemas/scene-prose-receipt.schema.json` confirms the advisory field is unchanged; no new hash/freshness field exists on `SCN`, scene plans, scene prose, or the receipt.

### Invariants

1. Publication state is derived everywhere it is consumed; no stored `SCN.status` survives in any in-scope surface.
2. The Mystery Reserve firewall (`scene_range_forbidden_mystery_resolution`) and the `state_hash` chain are unchanged — Rule 7 preserved, no causal-state behavior altered.

## Test Plan

### New/Modified Tests

1. `None — verification-only ticket; runs the existing per-package suites plus the §6 completeness sweep. No fixtures authored here.`

### Commands

1. `grep -rn "planned | rendered | attached\|scn_status\|SCN\.status\|SCN status\|scene.*status" .claude/skills/ docs/ tools/validators/src tools/world-index/src tools/world-mcp/src | grep -v "archive/"` (every hit must be out-of-scope)
2. `cd tools/validators && npm test && cd ../world-index && npm test && cd ../world-mcp && npm test`
3. `grep -rn "state_hash_at_attach" tools/validators/src/schemas/scene-prose-receipt.schema.json` (advisory field unchanged)
