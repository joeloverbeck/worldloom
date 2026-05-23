# MCPENH-063: Add `story-characters/` to world-index `STORY_BUNDLE_MARKDOWN_DIRECTORIES`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/enumerate.ts` (extended `STORY_BUNDLE_MARKDOWN_DIRECTORIES` closed set with `story-characters`); `tools/world-index/tests/enumerate.test.ts` (extended STCHAR markdown coverage)
**Deps**: archive/tickets/MCPENH-037-extend-world-index-inventory-with-story-bundle-markdown-paths.md (parent ticket that established the closed-set discipline and named "adding new story-bundle directory types is a documented edit to this constant + a new ticket")

## Problem

At intake, when `world-index build` (or any tool that calls it transitively, including `mcp__worldloom__get_context_packet`) ran against a world that contained a story bundle with STCHAR profiles, the index emitted `unexpected_path` warnings for legitimate STCHAR hybrid markdown artifacts. A `commitment-block-authoring` session on 2026-05-23 surfaced three such warnings — one per active STCHAR profile in the bundle:

```
{"severity":"warn","code":"unexpected_path","message":"Unexpected world file 'stories/red-bunny/story-characters/STCHAR-3.md' is not part of the index inventory.","file_path":"stories/red-bunny/story-characters/STCHAR-3.md"}
{"severity":"warn","code":"unexpected_path","message":"Unexpected world file 'stories/red-bunny/story-characters/STCHAR-2.md' is not part of the index inventory.","file_path":"stories/red-bunny/story-characters/STCHAR-2.md"}
{"severity":"warn","code":"unexpected_path","message":"Unexpected world file 'stories/red-bunny/story-characters/STCHAR-1.md' is not part of the index inventory.","file_path":"stories/red-bunny/story-characters/STCHAR-1.md"}
```

The same `get_context_packet` response confirmed the world-index parser was otherwise fully integrated with STCHAR — `freshness_audit.drifted_files_synced` listed the same three files (parser auto-resyncs the STCHAR profiles at the call boundary) and `story_bundle_context_summary.active_story_character_ids` listed `["STCHAR-1","STCHAR-2","STCHAR-3"]`. This was the canonical parser-registered-but-enumerator-omitted pattern (MCPENH-037 / MCPENH-056 / MCPENH-060 worked precedents): `tools/world-index/src/parse/atomic.ts` registers STCHAR via `STORY_DIRS` and emits `story_character_authority_record` nodes, while `tools/world-index/src/enumerate.ts`'s `STORY_BUNDLE_MARKDOWN_DIRECTORIES` closed set did not include `story-characters`, so the inventory walker classified every STCHAR profile as `unexpected_path`.

The landed change adds `story-characters` to the closed inventory and extends the compiled enumeration fixture so STCHAR hybrid markdown files classify as indexable rather than unexpected.

The intake defect had two operational costs:

1. **`unexpected_path` signal degradation.** MCPENH-037's Architecture Check declared (line 71): *"The `unexpected_path` warning class returns to its intended use: surfacing genuinely-unexpected files (typos, orphaned tooling output, accidental commits) rather than chronic false positives on every story-pipeline build."* With STCHAR widely adopted post-SPEC-56, every world that contained an active story bundle re-emitted one chronic false-positive warning per STCHAR profile on every index build and every `get_context_packet` call — defeating MCPENH-037's intent for the signal class.
2. **Audit-discipline operator overhead.** An operator reviewing `open_risks` in a context packet had to consult `enumerate.ts` source to triage which `unexpected_path` entries were real and which were STCHAR false positives.

## Assumption Reassessment (2026-05-23)

1. **Codebase**: confirmed before implementation via grep against `tools/world-index/src/enumerate.ts` — `STORY_BUNDLE_MARKDOWN_DIRECTORIES = new Set(["pages-prose","pages-prose-plans","storylet-batches","story-promotions","audits","character-proposals"])`. `story-characters` is absent. The single consumer site is `isIndexablePath` (`bundleDirectory ? STORY_BUNDLE_MARKDOWN_DIRECTORIES.has(bundleDirectory) : false`); symbol-consumer-enumeration grep across `tools/world-index/src/` returns this one consumer only, so the fix is single-site. `tools/world-index/tests/enumerate.test.ts` grep for `story-characters|STCHAR` returns zero matches — no existing test coverage to preserve, only coverage to add.

2. **Docs**: confirmed against `docs/FOUNDATIONS.md` §Story Bundles §6 (Story-Bundle ID Classes) which declares STCHAR as "story-local character authority profile; hybrid markdown artifact under `story-characters/`" and §6.1 (Story-Local Character Authority) which mandates STCHAR for any bundle needing character-specific behavior / voice / appraisal / planning authority. The shared contract at `.claude/skills/_shared-templates/story-state-contract.md` §3 (Record Class Inventory) likewise names STCHAR as "hybrid markdown artifact under `story-characters/`". Both documents commit to `story-characters/` as the canonical directory name. The omission from `STORY_BUNDLE_MARKDOWN_DIRECTORIES` is unambiguous drift relative to that FOUNDATIONS commitment.

3. **Shared boundary under audit**: the contract between (a) `branching-story-bootstrap` and `story-character-profile` as producers of STCHAR hybrid markdown at `stories/<slug>/story-characters/STCHAR-*.md`, AND (b) `tools/world-index/src/enumerate.ts` as the consumer that classifies disk-backed world files into `indexable` vs `unexpected`. The producers write to the documented FOUNDATIONS-canonical directory; the consumer's closed enumeration must recognize it for the boundary to hold. This is the same contract MCPENH-037 established for `pages-prose`, `storylet-batches`, etc. — and the same closure pattern that MCPENH-056 used to add `pages-prose-plans` after SPEC-72 made plans mandatory.

4. **FOUNDATIONS principle restatement**: FOUNDATIONS §Story Bundles §2 (Storage Form) declares per-bundle markdown directories alongside atomic `_source/<class>/*.yaml` records as the canonical story-bundle storage form; §6 explicitly names `story-characters/` as STCHAR's storage path. Rule 6 (No Silent Retcons) is the relevant validation rule: the parser-vs-enumerator divergence is silent enough that operators triaging packet warnings cannot distinguish the false-positive STCHAR entries from genuinely unexpected files without consulting source. Bringing the enumerator into alignment with the documented FOUNDATIONS-canonical directory eliminates that silent divergence — the retcon attribution is that MCPENH-037's closed-set discipline (line 73 of its body) explicitly required new story-bundle directory types to be added via a documented edit + new ticket; STCHAR landed via SPEC-56 without that follow-up edit and this ticket is the deferred follow-up.

5. **Proof-command correction**: the active checkout has no root `package.json`, so the drafted `npm test --workspace=tools/world-index` / `npm run build --workspace=tools/world-index` commands are not runnable from the repo root. `tools/world-index/package.json` runs tests from compiled output via `node --test "dist/tests/**/*.test.js"`, so the truthful proof lane is package-local and sequential: run `npm run build` from `tools/world-index/`, then `node --test dist/tests/enumerate.test.js`, then `npm test` from the same package root. Pre-edit baseline `npm run build` + `npm test` passed in `tools/world-index/` with 131 passing tests; visible schema-pattern skip/log messages were pre-existing package fixture diagnostics, not this ticket's source fallout.

6. **Packet-boundary proof correction**: there is no `tools/world-mcp/dist/src/cli/get-context-packet.js` CLI in this checkout. The direct external `mcp__worldloom__get_context_packet` tool is also not exposed in this Codex session. The accepted packet-boundary proof for this run is therefore the package-local inventory classification test plus package-wide `world-index` suite; the live packet smoke remains a post-restart/operator regression check, not an active closeout gate.

## Architecture Check

1. **Why this is cleaner than alternatives.** The closed-set extension is single-line additive (one new string member of the existing `STORY_BUNDLE_MARKDOWN_DIRECTORIES` set), parallel to the precedents set by MCPENH-037 (initial set establishment) and MCPENH-056 (`pages-prose-plans` addition). Alternatives — adding a separate STCHAR-specific branch to `isIndexablePath`, or making STCHAR a special-case constant — would introduce inconsistency with the existing closed-set pattern and require a parallel test fixture. The closed-set extension reuses the existing fixture pattern and verification surface.

2. **No backwards-compatibility shims or alias paths introduced.** The change is purely additive to a closed enumeration. Existing world-level branches and existing story-bundle markdown branches are untouched. No fallback path, no shim, no deprecation surface — the inventory simply gains coverage for a surface FOUNDATIONS already commits to.

## Verification Layers

1. **Inventory completeness** (the closed set recognizes `stories/<slug>/story-characters/STCHAR-*.md`) → codebase grep-proof on `tools/world-index/src/enumerate.ts` confirms `story-characters` is present in `STORY_BUNDLE_MARKDOWN_DIRECTORIES`.
2. **No regression on previously-recognized story-bundle markdown directories** (`pages-prose`, `pages-prose-plans`, `storylet-batches`, `story-promotions`, `audits`, `character-proposals` continue to classify as indexable) → schema validation via `tools/world-index/tests/enumerate.test.ts` existing fixture continues to pass.
3. **`unexpected_path` false-positive elimination at the inventory boundary** (a world-index enumeration pass against a story bundle that contains STCHAR profiles no longer classifies those profiles as unexpected) → package-local compiled test proof in `tools/world-index/tests/enumerate.test.ts`, which exercises `stories/<slug>/story-characters/STCHAR-*.md` alongside the existing recognized story-bundle markdown directories.
4. **FOUNDATIONS alignment** (closed enumeration includes the `story-characters/` storage path named by `docs/FOUNDATIONS.md` §Story Bundles §6 for STCHAR) → FOUNDATIONS alignment check by line comparison against the landed `STORY_BUNDLE_MARKDOWN_DIRECTORIES` membership.

## Landed Changes

### 1. Extend `STORY_BUNDLE_MARKDOWN_DIRECTORIES` with `story-characters`

In `tools/world-index/src/enumerate.ts`, added `"story-characters"` as a new member of `STORY_BUNDLE_MARKDOWN_DIRECTORIES`. The set remains a closed literal, and no other file in `tools/world-index/src/` needed modification because `isIndexablePath` reads through the existing constant.

### 2. Extend `enumerate.test.ts` with STCHAR markdown coverage

In `tools/world-index/tests/enumerate.test.ts`, extended the existing story-bundle markdown coverage fixture with `stories/foo/story-characters/STCHAR-1.md` and `stories/foo/story-characters/STCHAR-2.md`. The fixture now asserts STCHAR files classify as `indexable`, not `unexpected`, alongside the existing `pages-prose`, `pages-prose-plans`, `storylet-batches`, `story-promotions`, `audits`, and `character-proposals` coverage.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/tests/enumerate.test.ts` (modify)

## Out of Scope

- STCHAR parser changes — the parser at `tools/world-index/src/parse/atomic.ts` already registers `STORY_DIRS` for STCHAR and emits `story_character_authority_record` nodes; this ticket only fixes the enumerator's classification of the same files.
- Edge emission for STCHAR records — covered by SPEC-67 (`STOWORIND-001` archived) and its successors; orthogonal to inventory enumeration.
- Adding other story-bundle directory types — only `story-characters` is added by this ticket. Future story-bundle directory types (if any are introduced post-SPEC-73) require their own MCPENH ticket per MCPENH-037 line 73's closed-set discipline.
- Hybrid YAML directories — `STORY_BUNDLE_YAML_DIRECTORIES` (currently `{"pages-prose-receipts"}`) is unchanged. STCHAR is a hybrid markdown artifact and belongs in the markdown set, not the YAML set.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/world-index/` succeeds so compiled source and tests are fresh.
2. A unit test asserting that `enumerate(<world-root>)` against a fixture containing `stories/<slug>/story-characters/STCHAR-1.md` returns the file in `indexable[]` and NOT in `unexpected[]`.
3. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` passes with the extended `enumerate.test.ts` coverage.
4. `npm test` from `tools/world-index/` passes as the package-wide compiled suite.
5. Optional post-restart/operator regression check: after a rebuilt live MCP server is available, invoking `mcp__worldloom__get_context_packet(world_slug='erotica-world', task_type='commitment_block_authoring', story_slug='red-bunny', seed_nodes=['M-3'])` should return zero `open_risks` entries with `code: unexpected_path` whose `file_path` matches `stories/red-bunny/story-characters/STCHAR-*.md`.

### Invariants

1. `STORY_BUNDLE_MARKDOWN_DIRECTORIES` remains a closed `Set<string>` literal — no dynamic discovery, no glob-driven membership. Adding a future story-bundle markdown directory type continues to require a documented edit + new MCPENH ticket per MCPENH-037 line 73's discipline.
2. STCHAR hybrid markdown classification is fully consistent across `tools/world-index/src/` — the parser registers it, the enumerator now recognizes it, and downstream consumers (`get_context_packet`, `world-validate`, `world-index render`) see no `unexpected_path` false positives for the documented STCHAR storage form.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/enumerate.test.ts` — extended the existing story-bundle markdown coverage fixture with `stories/foo/story-characters/STCHAR-1.md` and `stories/foo/story-characters/STCHAR-2.md`, asserting `indexable[]` membership and absence from `unexpected[]`. Rationale: follows MCPENH-037's coverage pattern; the single closed-set member addition is verifiable with the same fixture shape MCPENH-037 established.

### Commands

1. `npm run build` from `tools/world-index/` — compiles source and test edits into `dist/`.
2. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` — focused compiled proof for the new STCHAR inventory fixture.
3. `npm test` from `tools/world-index/` — package-wide compiled suite.
4. Manual packet check (post-restart/operator regression): invoke the available `mcp__worldloom__get_context_packet` boundary against `world_slug='erotica-world'`, `task_type='commitment_block_authoring'`, `story_slug='red-bunny'`, `seed_nodes=['M-3']`; it must return no `open_risks` entries with `code: unexpected_path` and `file_path` matching `stories/red-bunny/story-characters/STCHAR-*.md`. This session does not have the external MCP tool or a `get-context-packet` CLI, so this is not an active closeout gate.

## Outcome

`story-characters` is now part of the closed `STORY_BUNDLE_MARKDOWN_DIRECTORIES` inventory in `tools/world-index/src/enumerate.ts`. The existing story-bundle inventory fixture now writes two STCHAR hybrid markdown files under `stories/foo/story-characters/` and asserts they are indexable rather than unexpected.

No parser, edge, MCP handler, docs, or world-content edits were needed. Same-package README/docs surfaces were inspected; they do not document this internal enumeration constant or the STCHAR inventory directory as a user-facing command surface.

## Verification Result

1. Pre-edit baseline from `tools/world-index/`: `npm run build` passed.
2. Pre-edit baseline from `tools/world-index/`: `npm test` passed with 131 passing tests. The visible schema-pattern skip/log messages were existing fixture diagnostics, not active-ticket failures.
3. Final focused proof from `tools/world-index/`: `npm run build` passed.
4. Final focused proof from `tools/world-index/`: `node --test dist/tests/enumerate.test.js` passed with 3 passing tests.
5. Final package proof from `tools/world-index/`: `npm test` passed with 131 passing tests. The same non-fatal fixture diagnostics appeared as in the baseline.
6. Manual contract review confirmed `docs/FOUNDATIONS.md` §Story Bundles §6 and `.claude/skills/_shared-templates/story-state-contract.md` §3 still name STCHAR as a hybrid markdown artifact under `story-characters/`, matching the landed enumerator membership.

## Deviations

- The drafted root workspace commands were replaced with package-local commands because the active checkout has no root `package.json`.
- The drafted packet-boundary smoke was not run because this Codex session does not expose `mcp__worldloom__get_context_packet`, and the checkout has no `tools/world-mcp/dist/src/cli/get-context-packet.js` CLI. The package-local enumeration test plus package-wide `world-index` suite are the accepted proof for this implementation run; live MCP packet smoke remains a post-restart/operator regression check.
