# SPEC71STRSTCHARTAM-004: Remove the dead STCHAR hash helpers + delete the CLI

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/hash/content.ts` (remove dead STCHAR hash helpers), `tools/world-index/tests/hash/content.test.ts` (remove helper coverage), `tools/world-mcp/src/package-interop.ts` (remove re-exports), `tools/world-mcp/package.json` (remove CLI bin/chmod entry), delete `tools/world-mcp/src/cli/compute-stchar-hashes.ts` and its CLI test.
**Deps**: archive/tickets/SPEC71STRSTCHARTAM-002.md

## Problem

At intake, `computeStcharProfileHash` / `computeStcharVoiceBlockHash` / `computeStcharPagePacketHash`, their `world-mcp/package-interop.ts` re-exports, and the `compute-stchar-hashes.ts` CLI existed only to produce the four torn-down hashes (SPEC-71 §1.3 CLI row). Once all importers stopped importing them — the validators (001) and the producers (002) — they were dead. This ticket deleted them last, so no dangling import remains.

## Assumption Reassessment (2026-05-22)

1. Historical intake evidence: `tools/world-index/src/hash/content.ts` defined the three `computeStchar*` helpers; `tools/world-mcp/src/package-interop.ts` re-exported them; `tools/world-mcp/src/cli/compute-stchar-hashes.ts` was the CLI. After 001+002 landed, the only importers (`stchar-body-integrity`, `page-plan-stchar-packet-integrity`, `prose-receipt-stchar-integrity`, `create-story-record`, `index-access`) no longer imported them. `normalizeProseWhitespace` / `sha256Hex` in `hash/content.ts` and `contentHashForProse` in `parse/canonical.ts` were NOT removed (still used by `file_versions` + node identity).
2. Specs/docs: SPEC-71 §1.3 CLI row + §5 acceptance criterion 1 ("`compute-stchar-hashes` and its three helper exports are deleted").
3. Cross-artifact boundary under audit: the `@worldloom/world-index/hash/content` public export surface consumed across packages — removing the dead STCHAR hash exports must leave the surviving `hash/content` exports (`normalizeProseWhitespace`/`sha256Hex` and Job-A helpers) intact and their consumers unaffected. `contentHashForProse` remains in `tools/world-index/src/parse/canonical.ts`.
4. FOUNDATIONS §5b (Schema-Minimalism): dead helper/CLI removal once the hashes they computed no longer exist.
5. Historical intake evidence: the initial removed-helper/CLI blast radius expected `grep -rn "computeStchar" tools/ .claude/skills/ docs/ specs/` to show only the three definitions, the re-exports, and the CLI. Live reassessment on 2026-05-23 corrected that to include same-seam package manifest and test fallout while excluding active follow-up-owned prose/skill surfaces.

## Assumption Reassessment (2026-05-23)

1. Resume validation: `.codex/run-state/implement-spec-tickets.json` points at this ticket; `last_work_commit` (`d89489374949a9a40690c25d6c6b21ce427e4ff4`) is reachable; the latest state-file commit is `9027b960`; the tracked worktree is clean. Ignored package artifacts under `tools/{world-index,world-mcp,validators,patch-engine}` are pre-existing build/install outputs.
2. Live blast radius correction: the draft omitted same-seam package surfaces. `tools/world-mcp/package.json` still exposes `compute-stchar-hashes` in `bin` and its `build` chmod list; `tools/world-index/tests/hash/content.test.ts` still covers the STCHAR hash helpers; `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` tests the deleted CLI. These are ticket-owned proof/package fallout.
3. Live contract split: `.claude/skills/_shared-templates/story-record-schemas.md` and `.claude/skills/branching-story-bootstrap/SKILL.md` still mention the CLI/helper names, but active tickets `SPEC71STRSTCHARTAM-005` and `SPEC71STRSTCHARTAM-007` own those prose/skill surfaces. This ticket keeps its current-contract negative grep scoped to `tools/`.
4. Helper boundary correction: `extractStcharBodyMarkdown`, `extractStcharSection`, and `canonicalizeStcharPagePacketForHash` exist only to support the removed STCHAR hash helpers and CLI test. Removing them with the three `computeStchar*` exports is same-seam cleanup; `sha256Hex`, `normalizeProseWhitespace`, `serializeStableYaml`, `canonicalJsonStringify`, `sha256OfUtf8`, `computePgStateHash`, and `computePlanHash` remain.

## Architecture Check

1. Deleting last (Deps 002, which Deps 001) guarantees every importer has already stopped importing — no compile break at any tree state.
2. No shim: the helpers and CLI are deleted; no deprecated stub left behind.

## Verification Layers

1. The three `computeStchar*` symbols are gone from current `tools/` source/tests/package surfaces → `grep -rn "computeStchar" tools/` returns zero after excluding ignored build/install artifacts.
2. `normalizeProseWhitespace`/`sha256Hex`, `parse/canonical.ts` `contentHashForProse`, and the Job-A hash helpers still build through the affected packages.
3. CLI file gone → `test -f tools/world-mcp/src/cli/compute-stchar-hashes.ts` is false.

## Landed Changes

### 1. Removed the helper exports
`world-index/hash/content.ts`: deleted the STCHAR hash-only helpers (`extractStcharBodyMarkdown`, `extractStcharSection`, `canonicalizeStcharPagePacketForHash`, `computeStcharProfileHash`, `computeStcharVoiceBlockHash`, `computeStcharPagePacketHash`). Kept `normalizeProseWhitespace`/`sha256Hex`, `parse/canonical.ts` `contentHashForProse`, and the Job-A PG/plan helpers.

### 2. Removed the re-exports + deleted the CLI
`world-mcp/package-interop.ts`: deleted the STCHAR hash helper re-exports. Deleted `world-mcp/src/cli/compute-stchar-hashes.ts` and its CLI test. Removed the CLI from `world-mcp/package.json` `bin` and `build` chmod list. The compiled `dist/` artifacts are ignored generated output and were refreshed by package builds, not committed.

## Files to Touch

- `tools/world-index/src/hash/content.ts` (modify)
- `tools/world-index/tests/hash/content.test.ts` (modify)
- `tools/world-mcp/src/package-interop.ts` (modify)
- `tools/world-mcp/package.json` (modify)
- `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (delete)
- `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` (delete)
- any test referencing the CLI / the three helpers (delete/modify)

## Out of Scope

- The validators (001) and producers (002) that stopped importing the helpers — already done by Deps.
- `compute-pg-hashes` and the `state_hash`/`plan_hash` helpers (Job A — untouched, SPEC-71 §3).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "computeStchar" tools/` → zero matches.
2. `grep -rn "compute-stchar-hashes" tools/` → zero matches.
3. `test -f tools/world-mcp/src/cli/compute-stchar-hashes.ts` → false.
4. `npm run build --prefix tools/world-index`, `npm run build --prefix tools/patch-engine`, `npm run build --prefix tools/validators`, and `npm run build --prefix tools/world-mcp` — all green (no dangling import of the removed helpers or deleted CLI).

### Invariants

1. `normalizeProseWhitespace` / `sha256Hex` remain exported from `hash/content`; `contentHashForProse` remains exported from `parse/canonical`; Job-A + `file_versions` consumers are untouched.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/hash/content.test.ts` — removed STCHAR hash-helper cases and retained Job-A/primitive hash coverage.
2. `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` — deleted with the CLI.

### Commands

1. `grep -rn "computeStchar" tools/`
2. `grep -rn "compute-stchar-hashes" tools/`
3. `test -f tools/world-mcp/src/cli/compute-stchar-hashes.ts`
4. `npm run build --prefix tools/world-index`
5. `npm run build --prefix tools/patch-engine`
6. `npm run build --prefix tools/validators`
7. `npm run build --prefix tools/world-mcp`
8. `node --test tools/world-index/dist/tests/hash/content.test.js`
9. `npm test --prefix tools/world-mcp`

## Outcome

Completed: 2026-05-23.

The dead STCHAR hash helper exports were removed from `tools/world-index/src/hash/content.ts`, and their test coverage was removed from `tools/world-index/tests/hash/content.test.ts` while the surviving Job-A/hash primitive tests remain. `tools/world-mcp` no longer re-exports the removed helpers, no longer registers `compute-stchar-hashes` as a package binary, and no longer chmods or tests the deleted CLI.

## Verification Result

1. `grep -rn "computeStchar" tools/` returned no matches after `dist/` was cleaned.
2. `grep -rn "compute-stchar-hashes" tools/` returned no matches after `dist/` was cleaned.
3. `test -f tools/world-mcp/src/cli/compute-stchar-hashes.ts; printf '%s\n' $?` printed `1`, proving the source CLI is gone. `test -f tools/world-mcp/dist/src/cli/compute-stchar-hashes.js; printf '%s\n' $?` also printed `1` after clean rebuild.
4. `npm run build --prefix tools/world-index` passed.
5. `npm run build --prefix tools/patch-engine` passed.
6. `npm run build --prefix tools/validators` passed.
7. `npm run build --prefix tools/world-mcp` passed.
8. `node --test tools/world-index/dist/tests/hash/content.test.js` passed: 5 tests, 5 pass.
9. `npm test --prefix tools/world-mcp` passed: 428 tests, 428 pass.

## Deviations

- Reassessment expanded the live same-seam file set to include `tools/world-mcp/package.json`, `tools/world-index/tests/hash/content.test.ts`, and `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts`.
- The build proof ran in dependency order (`world-index`, `patch-engine`, `validators`, `world-mcp`) after cleaning `dist/` so deleted source/test artifacts could not survive in compiled output.
- Active prose/skill references to the deleted helper/CLI names remain intentionally out of scope here because `SPEC71STRSTCHARTAM-005` and `SPEC71STRSTCHARTAM-007` own those surfaces.
