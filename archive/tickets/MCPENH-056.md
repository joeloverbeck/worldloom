# MCPENH-056: Extend world-index enumerator (`enumerate.ts`) to recognize `_source/beliefs/` and `pages-prose-receipts/` — co-update of MCPENH-044 parser-side fix plus first-class receipt-path inventory

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/enumerate.ts` (modify; STORY_SOURCE_DIRECTORIES gains `beliefs`; new STORY_BUNDLE_YAML_DIRECTORIES set + 4-segment YAML branch for `pages-prose-receipts/*.yaml`); `tools/world-index/tests/enumerate.test.ts` (modify; positive + negative cases); `tools/world-index/tests/helpers/atomic-fixture.ts` (modify; fixture gains a BEL record and a receipt file); `tools/world-index/tests/commands.test.ts` (modify; zero-unexpected-warnings assertion after build).
**Deps**: `archive/tickets/MCPENH-044-register-belief-record-class-in-world-index.md` (precedent — parser-side fix that did not co-update the enumerator); `archive/tickets/MCPENH-037-extend-world-index-inventory-with-story-bundle-markdown-paths.md` (precedent for the inventory-extension pattern, including the `enumerate.test.ts` / `commands.test.ts` / `atomic-fixture.ts` test-touching shape used here).

## Problem

At intake, `tools/world-index/src/enumerate.ts` enumerated two inventory sets used by `isIndexablePath`:

- `STORY_SOURCE_DIRECTORIES` — class subdirs under `stories/<slug>/_source/`; matches the 5-segment YAML branch.
- `STORY_BUNDLE_MARKDOWN_DIRECTORIES` — markdown subdirs under `stories/<slug>/`; matches the 4-segment `.md` branch.

Before this ticket, `STORY_SOURCE_DIRECTORIES` enumerated every story-bundle record class EXCEPT `beliefs`. `MCPENH-044` (completed 2026-05-13) added `beliefs/` to the parser side at `tools/world-index/src/parse/atomic.ts` STORY_DIRS and `belief_record` to `tools/world-index/src/schema/types.ts` NODE_TYPES, but the Files-to-Touch list did not include `enumerate.ts`. As a result, the parser correctly indexed BEL records into the DB, but the enumerator still classified the same files as `unexpected` because `STORY_SOURCE_DIRECTORIES.has('beliefs')` returned false.

Before this ticket, `STORY_BUNDLE_MARKDOWN_DIRECTORIES` was `.md`-only by design (the `.md` early-return preceded the markdown branch). `pages-prose-receipts/PG-<integer>.yaml` is a documented story-bundle artifact (output of `branching-story-prose-attach`, per its declared output table and per `CLAUDE.md`'s repo-level bundle layout) but is YAML-shaped, so it could not be added to `STORY_BUNDLE_MARKDOWN_DIRECTORIES`. The enumerator had no 4-segment YAML branch outside `_source/`, so every receipt file routed to `unexpected`.

`commands/shared.ts` persists every enumerator-flagged `unexpected` path as a `severity: warn` row in the `validation_results` table with `code: 'unexpected_path'`. `mcp__worldloom__get_context_packet` re-emits those rows in `governing_world_context.open_risks[]`; before this ticket, that produced chronic false-positive noise on story-pipeline retrieval.

**Session evidence** (2026-05-17): a `branching-story-turn-cycle` invocation against `worlds/erotica-world/stories/red-bunny` called `mcp__worldloom__get_context_packet(task_type='story_turn_cycle', seed_nodes=[...])`. The returned `governing_world_context.open_risks[]` contained 20 `severity: warn` entries with `code: unexpected_path`:

- `stories/red-bunny/pages-prose-receipts/PG-2.yaml`
- `stories/red-bunny/pages-prose-receipts/PG-1.yaml`
- `stories/red-bunny/_source/beliefs/BEL-1.yaml` … `BEL-12.yaml` (12 entries)

All 20 paths are legitimate bundle artifacts. Before this ticket, the same warnings would fire on every `get_context_packet` call against any story-bundle world with BEL records or rendered-prose receipts, polluting the open_risks surface skills consume for genuine risk signals (the same response also carried legitimate `mystery_reserve_firewall` info entries that operators must distinguish from this noise).

Per the audit's same-surface-vs-adjacent-surface verification rule, Phase 5 confirmed the gap was genuinely present at intake: `STORY_SOURCE_DIRECTORIES` enumerated `entities / status / facts / events / obligations / consequences / threads / relationships / intentions / locations / objects / branches / pages / choices / storylets / artifacts` only; MCPENH-044's claimed Outcome ("beliefs now indexed") was met code-wise on the parser side and DB-side, but the enumerator-side surface was not co-updated.

## Assumption Reassessment (2026-05-17)

1. **Codebase reassessment.** At intake, `tools/world-index/src/enumerate.ts` `STORY_SOURCE_DIRECTORIES` omitted `"beliefs"`, and `STORY_BUNDLE_MARKDOWN_DIRECTORIES` omitted `"pages-prose-receipts"` while remaining structurally `.md`-only. `tools/world-index/src/parse/atomic.ts` `STORY_DIRS` already registered `["beliefs", recordSpec("belief_record", "id", "^BEL-[0-9]+$")]`, and `tools/world-index/src/schema/types.ts` already contained `"belief_record"`, so the parser side was functional. This ticket added `"beliefs"` to `STORY_SOURCE_DIRECTORIES` and added `STORY_BUNDLE_YAML_DIRECTORIES` plus a 4-segment YAML branch for `pages-prose-receipts/*.yaml`.

2. **Doc reassessment.** `docs/FOUNDATIONS.md` §Story Bundles enumerates `_source/beliefs/` (BEL records) and `pages-prose-receipts/` as canonical story-bundle subdirectories. `CLAUDE.md` repo-level prose lists both as part of the canonical bundle layout: `pages-prose-receipts/  ← PG-<integer>.yaml prose-validation receipts written by branching-story-prose-attach`. `.claude/skills/branching-story-prose-attach/SKILL.md` declares `pages-prose-receipts/PG-<integer>.yaml` as a primary output. Neither path is exotic or undocumented at the contract level.

3. **Shared boundary.** The boundary under audit is the world-index's enumerator surface (`enumerate.ts`) vs. its parser surface (`atomic.ts` STORY_DIRS). These two surfaces co-evolve when a new story-bundle record class lands — MCPENH-044's Files-to-Touch updated `atomic.ts`, `types.ts`, and `commands/shared.ts` but did not include `enumerate.ts`, leaving the enumerator-side gap that is the same-surface-mechanism-gap precedent named in the audit's drop-rule (a) "the archived ticket's mechanism landed code-wise but didn't actually achieve the claimed Outcome — typically a migration / sync / post-deploy gap that the archived ticket's own verification didn't catch". The current ticket closes that gap for `beliefs` AND additionally introduces the receipt-path inventory branch that has no prior ticket.

4. **Adjacent contradictions surfaced during reassessment.** Phase 5 verification surfaced one structural constraint that's a required consequence of this ticket rather than a separate bug: `isIndexablePath`'s `.md` early-return made `STORY_BUNDLE_MARKDOWN_DIRECTORIES` strictly markdown-typed. Receipts (YAML) could not be added to that set; this ticket introduced a separate YAML inventory branch.

5. **Command-shape reassessment.** This checkout has no root `package.json`, `pnpm-workspace.yaml`, or `pnpm-lock.yaml`; the executable proof surface is package-local under `tools/world-index/package.json`. The package scripts are `npm run build` (`tsc -p tsconfig.json`) and `npm test` (`node --test "dist/tests/**/*.test.js"`). The drafted `pnpm --filter @worldloom/world-index test` command is not runnable in this repo and is replaced by package-local `npm` commands plus direct compiled `node --test dist/tests/...` targets. Pre-edit baseline: `npm test` from `tools/world-index/` passed on 2026-05-17 with 87 tests.

## Architecture Check

1. The fix is additive — one set entry for `beliefs` and one new YAML branch for `pages-prose-receipts`. Both extensions are structurally parallel to existing branches (`STORY_SOURCE_DIRECTORIES.has(...)` lookup is reused for the new set; the new 4-segment branch mirrors the existing 5-segment branch's shape). No refactor of `isIndexablePath` beyond inserting one new branch and one new set declaration. No alternative considered would do less work — refactoring `STORY_BUNDLE_MARKDOWN_DIRECTORIES` into a typed map of `directory → file-extension` would over-generalize for two known shapes.
2. No backwards-compatibility shims or aliases. The change is the missing entries.

## Verification Layers

1. `enumerate.ts` STORY_SOURCE_DIRECTORIES contains `beliefs` → codebase grep-proof (`grep -nE '"beliefs"' tools/world-index/src/enumerate.ts` returns the set entry).
2. `enumerate.ts` declares a new STORY_BUNDLE_YAML_DIRECTORIES set containing `pages-prose-receipts` → codebase grep-proof (`grep -nE 'STORY_BUNDLE_YAML_DIRECTORIES|pages-prose-receipts' tools/world-index/src/enumerate.ts`).
3. `stories/<slug>/_source/beliefs/BEL-<integer>.yaml` is classified `indexable` by `isIndexablePath` → unit test in `enumerate.test.ts` (positive case using a representative BEL path).
4. `stories/<slug>/pages-prose-receipts/PG-<integer>.yaml` is classified `indexable` by `isIndexablePath` → unit test in `enumerate.test.ts` (positive case using a representative receipt path).
5. Post-build, `validation_results` contains zero `code='unexpected_path'` rows whose `file_path` matches the BEL or receipt shapes → integration test in `commands.test.ts` against the extended atomic fixture.
6. Existing `unexpected_path` warning behavior for genuinely-foreign files remains intact → existing negative cases in `enumerate.test.ts` continue to pass; a new negative case asserts that an unknown 4-segment YAML path NOT in STORY_BUNDLE_YAML_DIRECTORIES still routes to `unexpected`.

## Landed Changes

### 1. Added `beliefs` to STORY_SOURCE_DIRECTORIES

`tools/world-index/src/enumerate.ts` now includes `"beliefs"` in the `STORY_SOURCE_DIRECTORIES` set. The existing 5-segment YAML branch routes `stories/<slug>/_source/<dir>/X.yaml` through `STORY_SOURCE_DIRECTORIES.has(...)`, so `_source/beliefs/BEL-N.yaml` paths now classify as `indexable`.

### 2. Added a new 4-segment YAML branch for `pages-prose-receipts/`

`tools/world-index/src/enumerate.ts` now declares:

```ts
const STORY_BUNDLE_YAML_DIRECTORIES = new Set(["pages-prose-receipts"]);
```

and checks it in `isIndexablePath` before the `.md` early-return:

```ts
if (
  segments.length === 4 &&
  segments[0] === "stories" &&
  basename.endsWith(".yaml")
) {
  const bundleDirectory = segments[2];
  return bundleDirectory ? STORY_BUNDLE_YAML_DIRECTORIES.has(bundleDirectory) : false;
}
```

The branch precedes the `.md` early-return because it inspects `.yaml` basenames; placing it after the early-return would route receipts to `unexpected` regardless of the set's contents.

### 3. Extended tests

- `tools/world-index/tests/enumerate.test.ts` now covers a positive `stories/<slug>/_source/beliefs/BEL-1.yaml` shape, a positive `stories/<slug>/pages-prose-receipts/PG-1.yaml` shape, and a negative 4-segment YAML path under an unknown bundle subdirectory (`stories/<slug>/pages-prose-rejected/PG-1.yaml`) to assert the new branch does not over-include.
- `tools/world-index/tests/helpers/atomic-fixture.ts` now includes `_source/beliefs/BEL-1.yaml` (minimal valid BEL record per `tools/validators/src/schemas/story-belief.schema.json`) and `pages-prose-receipts/PG-1.yaml` (minimal valid receipt YAML per `tools/validators/src/schemas/prose-receipt.schema.json`).
- `tools/world-index/tests/commands.test.ts` now includes an exact zero-unexpected-warnings assertion for BEL and receipt paths after build.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/tests/enumerate.test.ts` (modify)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify)
- `tools/world-index/tests/commands.test.ts` (modify)

## Out of Scope

- Parsing `pages-prose-receipts/*.yaml` into typed records (no `prose_receipt_record` NODE_TYPE registration; receipts remain non-parsed-but-indexable-as-paths under this ticket). A separate future ticket may add receipt parsing if downstream consumers need queryable receipt data.
- Re-parsing already-indexed worlds to clear historical `unexpected_path` rows in `validation_results` — the next `world-index build` run will overwrite the enumeration row set per the existing DELETE-then-INSERT pattern at `commands/shared.ts:500-518`. No migration sentinel required.
- Any change to `atomic.ts` STORY_DIRS, `types.ts` NODE_TYPES, or `commands/shared.ts` MENTION_EVIDENCE_SOURCE_NODE_TYPES — those landed correctly in MCPENH-044.
- Co-update of the `audits` directory's YAML inventory if a similar gap exists there (none surfaced this session; an audit-time follow-up should re-verify).

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/world-index/` — compiled source and tests are fresh.
2. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` — all existing cases pass; new positive cases for BEL and receipt paths classify `indexable`; new negative case for an unknown 4-segment YAML bundle subdirectory classifies `unexpected`.
3. `node --test dist/tests/commands.test.js` from `tools/world-index/` — the extended fixture's commands-test assertion of zero story `unexpected_path` warnings post-build passes.
4. `npm test` from `tools/world-index/` — the package-wide compiled suite passes.
5. Optional checkout-local live-world regression, when `worlds/erotica-world` exists: from repo root, `node tools/world-index/dist/src/cli.js build erotica-world`, followed by `sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM validation_results WHERE code='unexpected_path' AND (file_path LIKE '%_source/beliefs/%' OR file_path LIKE '%pages-prose-receipts/%')"` — expected output `0`.

### Invariants

1. Adding a new story-bundle record class to `atomic.ts` STORY_DIRS without co-updating `enumerate.ts` STORY_SOURCE_DIRECTORIES is detectable by the package's own integration tests — the extended atomic fixture's zero-unexpected-warnings assertion forces the co-update discipline structurally, so future record-class additions cannot land the parser side without landing the enumerator side.
2. `pages-prose-receipts/*.yaml` is a first-class indexable bundle path per FOUNDATIONS §Story Bundles and CLAUDE.md, and does not fire `unexpected_path` warnings under any retrieval surface.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/enumerate.test.ts` — positive case for `stories/<slug>/_source/beliefs/BEL-1.yaml`; positive case for `stories/<slug>/pages-prose-receipts/PG-1.yaml`; negative case for `stories/<slug>/pages-prose-rejected/PG-1.yaml` (unknown bundle YAML subdirectory).
2. `tools/world-index/tests/helpers/atomic-fixture.ts` — fixture contains a minimal `_source/beliefs/BEL-1.yaml` and a minimal `pages-prose-receipts/PG-1.yaml`; the fixture is the same canonical surface MCPENH-037 extended for story-bundle markdown paths.
3. `tools/world-index/tests/commands.test.ts` — post-build zero-unexpected-warnings assertion covers the extended fixture so a regression in either inventory set fails CI.

### Commands

1. `npm run build` (from `tools/world-index/`) — rebuilds source and compiled tests.
2. `node --test dist/tests/enumerate.test.js` (from `tools/world-index/`) — targeted inventory classification proof.
3. `node --test dist/tests/commands.test.js` (from `tools/world-index/`) — fixture build proof for zero story `unexpected_path` warnings.
4. `npm test` (from `tools/world-index/`) — package-wide compiled suite.
5. Optional checkout-local live-world regression when `worlds/erotica-world` exists: `node tools/world-index/dist/src/cli.js build erotica-world && sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM validation_results WHERE code='unexpected_path' AND (file_path LIKE '%_source/beliefs/%' OR file_path LIKE '%pages-prose-receipts/%')"` from repo root; expected output `0`.

## Outcome

Completed on 2026-05-17.

`tools/world-index/src/enumerate.ts` now recognizes `stories/<story-slug>/_source/beliefs/*.yaml` through the story `_source` inventory and recognizes `stories/<story-slug>/pages-prose-receipts/*.yaml` through a new closed YAML bundle-directory set. The atomic fixture now contains a BEL record and a prose receipt, and the command test asserts that neither path family produces `unexpected_path` validation rows after build.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/world-index/` — passed; 87 tests passed.
2. `npm run build` from `tools/world-index/` — passed.
3. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` — passed; 3 tests passed.
4. `node --test dist/tests/commands.test.js` from `tools/world-index/` — passed; 3 tests passed.
5. `npm test` from `tools/world-index/` — passed; 87 tests passed. Output still includes the existing intentional fixture diagnostics for one schema-pattern skip and one legacy-world rejection.
6. Optional checkout-local regression: `node tools/world-index/dist/src/cli.js build erotica-world` from repo root — passed.
7. Optional checkout-local DB query: `sqlite3 worlds/erotica-world/_index/world.db "SELECT COUNT(*) FROM validation_results WHERE code='unexpected_path' AND (file_path LIKE '%_source/beliefs/%' OR file_path LIKE '%pages-prose-receipts/%');"` — returned `0`.
8. Codebase grep-proof: `grep -nE '"beliefs"|STORY_BUNDLE_YAML_DIRECTORIES|pages-prose-receipts' tools/world-index/src/enumerate.ts` — found the BEL source-directory entry and receipt YAML inventory set/branch.
9. Manual package surface review: `tools/world-index/README.md`, `docs/WORKFLOWS.md`, `docs/FOUNDATIONS.md` §Story Bundles, `CLAUDE.md`, and `.claude/skills/branching-story-prose-attach/SKILL.md` already describe the relevant story-bundle receipt/BEL surfaces; no package README or repo-doc update was required because this ticket changes internal inventory classification, not CLI syntax or user-facing invocation.

## Deviations

- The drafted root `pnpm --filter @worldloom/world-index test` proof was replaced with package-local `npm` commands because this checkout has no root package/workspace manifests.
- Direct `mcp__worldloom__get_context_packet(...)` smoke was not exposed in this Codex session. The accepted substitute is package-local fixture proof plus the optional live `erotica-world` rebuild and direct `validation_results` query showing zero BEL/receipt `unexpected_path` rows.
- `tools/world-index/dist/` was refreshed by `npm run build` and `worlds/erotica-world/_index/` was refreshed by the optional live build; both are ignored generated artifacts, not tracked owned edits.
