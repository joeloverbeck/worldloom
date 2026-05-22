# SPEC71STRSTCHARTAM-004: Remove the dead STCHAR hash helpers + delete the CLI

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/hash/content.ts` (remove 3 helpers), `tools/world-mcp/src/package-interop.ts` (remove re-exports), delete `tools/world-mcp/src/cli/compute-stchar-hashes.ts`.
**Deps**: archive/tickets/SPEC71STRSTCHARTAM-002.md

## Problem

`computeStcharProfileHash` / `computeStcharVoiceBlockHash` / `computeStcharPagePacketHash` (`world-index/hash/content.ts:146,150,169`), their re-exports in `world-mcp/package-interop.ts:40-43`, and the `compute-stchar-hashes.ts` CLI exist only to produce the four torn-down hashes (SPEC-71 §1.3 CLI row). Once all importers stop importing them — the validators (001) and the producers (002) — they are dead. This ticket deletes them last, so no dangling import is ever left.

## Assumption Reassessment (2026-05-22)

1. Codebase: `tools/world-index/src/hash/content.ts:146/150/169` define the three `computeStchar*` helpers; `tools/world-mcp/src/package-interop.ts:40-43` re-export them; `tools/world-mcp/src/cli/compute-stchar-hashes.ts` is the CLI. After 001+002 land, the only importers (`stchar-body-integrity`, `page-plan-stchar-packet-integrity`, `prose-receipt-stchar-integrity`, `create-story-record`, `index-access`) no longer import them. `normalizeProseWhitespace` / `contentHashForProse` / `sha256Hex` in the same module are NOT removed (still used by `file_versions` + node identity).
2. Specs/docs: SPEC-71 §1.3 CLI row + §5 acceptance criterion 1 ("`compute-stchar-hashes` and its three helper exports are deleted").
3. Cross-artifact boundary under audit: the `@worldloom/world-index/hash/content` public export surface consumed across packages — removing three exports must leave the surviving exports (`normalizeProseWhitespace`/`contentHashForProse`/`sha256Hex`) intact and their consumers unaffected.
4. FOUNDATIONS §5b (Schema-Minimalism): dead helper/CLI removal once the hashes they computed no longer exist.
5. Removed-helper/CLI blast radius: `grep -rn "computeStchar" tools/ .claude/skills/ docs/ specs/` per area — after 001 (validators) and 002 (producers) land, the only matches are the three definitions in `tools/world-index/src/hash/content.ts`, the three re-exports in `tools/world-mcp/src/package-interop.ts`, and the CLI being deleted here; confirm zero external importers per area before deletion so no dangling reference remains (Job-A `compute-pg-hashes` + the surviving `normalizeProseWhitespace`/`contentHashForProse`/`sha256Hex` are out of scope and must still resolve).

## Architecture Check

1. Deleting last (Deps 002, which Deps 001) guarantees every importer has already stopped importing — no compile break at any tree state.
2. No shim: the helpers and CLI are deleted; no deprecated stub left behind.

## Verification Layers

1. The three `computeStchar*` symbols are gone repo-wide → `grep -rn "computeStchar" tools/` returns zero.
2. `normalizeProseWhitespace`/`contentHashForProse`/`sha256Hex` still exported and their consumers (`file_versions`, node identity) still build → `npm run build` across the affected packages.
3. CLI file gone → `test -f tools/world-mcp/src/cli/compute-stchar-hashes.ts` is false.

## What to Change

### 1. Remove the three helpers
`world-index/hash/content.ts`: delete `computeStcharProfileHash` (146), `computeStcharVoiceBlockHash` (150), `computeStcharPagePacketHash` (169). Keep `normalizeProseWhitespace`/`contentHashForProse`/`sha256Hex`.

### 2. Remove the re-exports + delete the CLI
`world-mcp/package-interop.ts`: delete the three re-export lines (40-43). Delete `world-mcp/src/cli/compute-stchar-hashes.ts` and its compiled `dist/` artifact + any test referencing it.

## Files to Touch

- `tools/world-index/src/hash/content.ts` (modify)
- `tools/world-mcp/src/package-interop.ts` (modify)
- `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (delete)
- any test referencing the CLI / the three helpers (delete/modify)

## Out of Scope

- The validators (001) and producers (002) that stopped importing the helpers — already done by Deps.
- `compute-pg-hashes` and the `state_hash`/`plan_hash` helpers (Job A — untouched, SPEC-71 §3).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "computeStchar" tools/` → zero matches.
2. `npm run build --prefix tools/world-index && npm run build --prefix tools/world-mcp && npm run build --prefix tools/validators && npm run build --prefix tools/patch-engine` — all green (no dangling import of the removed helpers).
3. `test -f tools/world-mcp/src/cli/compute-stchar-hashes.ts` → false.

### Invariants

1. `normalizeProseWhitespace` / `contentHashForProse` / `sha256Hex` remain exported and functional (Job-A + `file_versions` consumers untouched).

## Test Plan

### New/Modified Tests

1. `None — deletion ticket; verification is grep-proof + cross-package build. Surviving-helper coverage (`file_versions`, node identity) is exercised by existing world-index tests named in Assumption Reassessment item 1.`

### Commands

1. `grep -rn "computeStchar" tools/`
2. `npm run build --prefix tools/world-index && npm run build --prefix tools/world-mcp && npm run build --prefix tools/validators && npm run build --prefix tools/patch-engine`
