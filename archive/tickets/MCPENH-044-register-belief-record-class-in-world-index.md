# MCPENH-044: Register `belief_record` class in world-index (parse / NODE_TYPES / MENTION_EVIDENCE)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/parse/atomic.ts` (STORY_DIRS map adds `beliefs/`), `tools/world-index/src/schema/types.ts` (NODE_TYPES adds `belief_record`), `tools/world-index/src/commands/shared.ts` (MENTION_EVIDENCE_SOURCE_NODE_TYPES adds `belief_record`), `tools/world-index/tests/types.test.ts` (NODE_TYPES registry count updated), and `tools/world-index/dist/` (rebuilt).
**Deps**: `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` (allocator-side BEL registration; explicitly scoped to leave retrieval / index / patch-engine surfaces to a separate track — this ticket completes the world-index leg of that track), `archive/tickets/VALENH-011-register-bel-record-schema-compliance-and-drop-arc-trace-validators.md` (validator-side BEL schema-compliance; this ticket is its world-index counterpart), `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md` (patch-engine-side BEL op).

## Problem

At intake, the world-index at `tools/world-index/src/parse/atomic.ts` STORY_DIRS map registered every other story-bundle record class — `entities` (`story_entity_record`), `facts` (`story_fact_record`), `events` (`story_event_record`), `obligations` (`obligation_record`), `consequences` (`consequence_record`), `threads` (`thread_record`), `relationships` (`relationship_record_story`), `intentions` (`intention_record`), `locations` (`story_location_record`), `objects` (`story_object_record`), `branches` (`branch_record`), `pages` (`page_record`), `choices` (`choice_record`), `storylets` (`storylet_record`), `arc-traces` (`arc_trace_node`), `artifacts` (`story_diegetic_artifact_record`) — but omitted `beliefs/`. The `belief_record` node type was also absent from `NODE_TYPES` in `tools/world-index/src/schema/types.ts` and from `MENTION_EVIDENCE_SOURCE_NODE_TYPES` in `tools/world-index/src/commands/shared.ts`. As a result, `_source/beliefs/BEL-NNNN.yaml` files existed on disk in every story-bundle world but were not indexed; downstream consumers that query `belief_record` (notably `storylet_predicate_dsl_parsability` via `loadReferenceSets` at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts:114-126`) received empty result sets for the bundle's BEL inventory.

Historical session evidence (commitment-block-authoring direct_batch invocation on red-bunny, 2026-05-13 17:00): after the predicate-DSL ID regex was loosened to FOUNDATIONS-002 form (per VALENH-017), `validate-patch-plan` returned `status: fail` with two `predicate.unresolved_reference` failures — `SLT-8: preconditions.hard[1].record references missing BEL-1` and `SLT-9: preconditions.hard[2].record references missing BEL-3`. Both SLT-8 and SLT-9 referenced BEL records via `record_active`; both BEL records existed at `worlds/erotica-world/stories/red-bunny/_source/beliefs/BEL-1.yaml` and `.../BEL-3.yaml`; the validator's `state.refs.beliefs` set was empty because the world-index did not track BEL records, so the resolver-against-index step failed. Additionally, `mcp__worldloom__get_context_packet` emitted seven `unexpected_path` warnings for `stories/red-bunny/_source/beliefs/BEL-*.yaml` files — a parallel symptom of the same gap: the path-enumerator + record-parser did not recognize `beliefs/` as a legitimate story-bundle subdirectory.

MCPENH-040 (BEL allocator registration) explicitly stated its scope: "Existing `get_record` / `list_records` / schema-discovery ARC_TRACE references are intentionally left to the separate retrieval/index/patch-engine removal track." MCPENH-040 was the allocator-side leg of the BEL pipeline; VALENH-011 was the validator-schema leg; PEENH-007 was the patch-engine-op leg; this ticket is the world-index parser-and-classification leg, completing the four-surface registration of `belief_record` across the pipeline.

## Assumption Reassessment (2026-05-13)

1. **Codebase state at closeout**: `tools/world-index/src/parse/atomic.ts` `STORY_DIRS` contains `["beliefs", recordSpec("belief_record", "id", "^BEL-[0-9]+$")]`; `tools/world-index/src/schema/types.ts` `NODE_TYPES` contains `"belief_record"` between `"story_entity_record"` and `"story_fact_record"`; `tools/world-index/src/commands/shared.ts` `MENTION_EVIDENCE_SOURCE_NODE_TYPES` contains `"belief_record"`. `tools/world-index/dist/` was rebuilt via `cd tools/world-index && npm run build`, and the matching generated files contain the same registration.
2. **Spec / doc state**: `.claude/skills/_shared-templates/story-state-contract.md` §3 (Record Class Inventory) lists `BEL` as a first-class story-bundle record class (and §4.1 defines its schema); `docs/FOUNDATIONS.md` §Story Bundles §6 (Story-Bundle ID Classes) names `BEL` among the per-bundle records; CLAUDE.md §ID Allocation Conventions lists `BEL-<integer>` under per-bundle classes. Every contract surface treats BEL as canonical; at intake, the world-index implementation lagged that contract.
3. **Shared boundary under audit**: the contract between the world-index's recognized node types and every downstream consumer that queries those types. The two primary consumers are (a) `storylet_predicate_dsl_parsability` at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts:114-126` which calls `query("belief_record")` directly in `loadReferenceSets`; (b) `mcp__worldloom__get_context_packet` at `tools/world-mcp/src/tools/get-context-packet.ts` which loads BEL nodes for story-pipeline task_types. Both consumers assume the index already tracks `belief_record`. The shared boundary is the unwritten "every story-bundle record class named in the shared story state contract has a STORY_DIRS entry + a NODE_TYPES entry + a MENTION_EVIDENCE entry" invariant.
4. **FOUNDATIONS principle restated**: FOUNDATIONS §Story Bundles §6 enumerates `BEL` (Belief) among the per-bundle records; FOUNDATIONS §6a (Belief vs. Fact) further codifies that `SF` records what is true in the branch while `BEL` records what a holder believes / claims / witnesses / suspects / denies / is deceived about — and that "the two classes are kept separate so that lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent without inventing plot rails." The world-index's omission of `belief_record` structurally undermines §6a's distinction: any consumer that queries the index for active belief state receives an empty result, collapsing the SF / BEL split at the read surface.
5. **Schema extension impact**: adding `belief_record` to NODE_TYPES is **additive** — no existing node type is renamed, removed, or restructured. Adding it to MENTION_EVIDENCE_SOURCE_NODE_TYPES is **additive** — beliefs become discoverable through scoped-reference / named-entity edge resolution alongside the other story-bundle records (this is the same pattern as how `story_entity_record` participates in MENTION_EVIDENCE). Adding `beliefs` to STORY_DIRS is **additive** — the parse loop in `parseAtomicSourceFile` already dispatches by directory name, so a new directory entry plugs into the existing dispatch without touching parser internals. Downstream consumers (validators, MCP retrieval, patch-engine) need no changes — they already issue `query("belief_record")` calls expecting them to succeed.
6. **Adjacent contradiction surfaced during reassessment**: `mcp__worldloom__get_context_packet`'s `unexpected_path` warnings on `_source/beliefs/BEL-*.yaml` files are a parallel symptom of the same gap, sourced from `tools/world-index/src/enumerate.ts`'s `isIndexablePath` enumeration. MCPENH-037 extended `isIndexablePath` for story-bundle MARKDOWN paths (STORY_KERNEL.md, pages-prose/*.md, storylet-batches/*.md, etc.) but did NOT extend it for the `_source/beliefs/*.yaml` shape because at that ticket's era no BEL class existed. Classification: required consequence of this ticket — the same patch that adds `beliefs/` to STORY_DIRS implicitly extends `isIndexablePath`'s `_source/<class>/*.yaml` recognition (since `isIndexablePath` derives from the STORY_DIRS / ATOMIC_DIRS registration), so no separate ticket is needed. If the dist verification shows `unexpected_path` warnings persist for `_source/beliefs/*.yaml` after this ticket lands, file a follow-up against `enumerate.ts` explicitly.
7. **Same-seam test fallout found during verification**: `cd tools/world-index && npm test` initially failed only in `tools/world-index/tests/types.test.ts`, where the registry-count invariant still expected `NODE_TYPES.length === 41`. Adding `belief_record` makes the truthful count 42, so this ticket owns the test-count update as proof-surface truthing.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: this ticket completes a four-surface registration pattern (allocator + validator-schema + patch-engine-op + world-index-parser-and-classification) that MCPENH-040 / VALENH-011 / PEENH-007 collectively initiated. Adding a new node type without registering it at all four surfaces leaves a structurally broken pipeline; doing all four with paired tickets keeps the pipeline's "every record class is first-class everywhere" invariant intact. The alternative — adding a special-case BEL handler in each downstream consumer — would scatter knowledge of the BEL class across `tools/validators/`, `tools/world-mcp/`, and `tools/patch-engine/`, defeating the centralized node-type-registry pattern.
2. **No backwards-compatibility shim**: no dual-name / version-discriminator / migration-mode pattern is introduced. `belief_record` is added directly to the canonical lists; legacy worlds with `_source/beliefs/` directories will be picked up on next `world-index sync` without any migration step. Worlds without `_source/beliefs/` continue to function (the STORY_DIRS dispatch tolerates missing directories per `existsSync` check at `tools/world-index/src/parse/atomic.ts` `listAtomicSourceFiles`).

## Verification Layers

1. **STORY_DIRS contains `beliefs`** → codebase grep-proof: `grep -n '"beliefs"' tools/world-index/src/parse/atomic.ts tools/world-index/dist/src/parse/atomic.js` returns matching lines in both source and dist.
2. **NODE_TYPES contains `belief_record`** → codebase grep-proof: `grep -n '"belief_record"' tools/world-index/src/schema/types.ts tools/world-index/dist/src/schema/types.js` returns matching lines in both source and dist.
3. **MENTION_EVIDENCE_SOURCE_NODE_TYPES contains `belief_record`** → codebase grep-proof: `grep -n '"belief_record"' tools/world-index/src/commands/shared.ts tools/world-index/dist/src/commands/shared.js` returns matching lines in both source and dist.
4. **Reindexed world surfaces BEL records** → skill dry-run: after `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js sync erotica-world`, `node tools/world-index/dist/src/cli.js stats erotica-world | grep belief_record` returns `belief_record: 9` (matching the 9 BEL records under `worlds/erotica-world/stories/red-bunny/_source/beliefs/`).
5. **Downstream validator consumes BEL records correctly** → skill dry-run: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slb-1-red-bunny-plan.json` against a representative patch plan that references BEL records via `record_active` reports `storylet_predicate_dsl_parsability` as PASS with no `predicate.unresolved_reference` failures for BEL-N. The historical plan's overall status now fails on stale SLT id allocation expectations, which is not a BEL-resolution failure.
6. **FOUNDATIONS alignment confirmed** → FOUNDATIONS alignment check: `docs/FOUNDATIONS.md` §Story Bundles §6 + §6a name BEL as canonical; the world-index registration completes the §6a SF / BEL separation at the read surface.

## Landed Changes

### 1. Added `beliefs/` entry to STORY_DIRS

`tools/world-index/src/parse/atomic.ts` `STORY_DIRS` now includes `["beliefs", recordSpec("belief_record", "id", "^BEL-[0-9]+$")]` immediately after the `entities` entry, matching the shared story-state ordering.

### 2. Added `belief_record` to NODE_TYPES

`tools/world-index/src/schema/types.ts` `NODE_TYPES` now includes `"belief_record"` between `"story_entity_record"` and `"story_fact_record"`.

### 3. Added `belief_record` to MENTION_EVIDENCE_SOURCE_NODE_TYPES

`tools/world-index/src/commands/shared.ts` `MENTION_EVIDENCE_SOURCE_NODE_TYPES` now includes `"belief_record"` between `"story_entity_record"` and `"story_fact_record"`.

### 4. Rebuilt dist

`cd tools/world-index && npm run build` regenerated `tools/world-index/dist/src/parse/atomic.js`, `tools/world-index/dist/src/schema/types.js`, `tools/world-index/dist/src/commands/shared.js`, and the compiled registry-count test.

### 5. Updated registry-count test

`tools/world-index/tests/types.test.ts` now expects `NODE_TYPES.length === 42`, matching the new additive node type.

### 6. Reindexed existing world with BEL content

`node tools/world-index/dist/src/cli.js sync erotica-world` refreshed the local derived index, and `stats erotica-world` reports `belief_record: 9`, matching the nine BEL records under `worlds/erotica-world/stories/red-bunny/_source/beliefs/`.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify) — STORY_DIRS map gets `beliefs/` entry.
- `tools/world-index/src/schema/types.ts` (modify) — NODE_TYPES gets `belief_record`.
- `tools/world-index/src/commands/shared.ts` (modify) — MENTION_EVIDENCE_SOURCE_NODE_TYPES gets `belief_record`.
- `tools/world-index/tests/types.test.ts` (modify) — NODE_TYPES registry count updated from 41 to 42.
- `tools/world-index/dist/src/parse/atomic.js` (modify — regenerated by `npm run build`).
- `tools/world-index/dist/src/schema/types.js` (modify — regenerated by `npm run build`).
- `tools/world-index/dist/src/commands/shared.js` (modify — regenerated by `npm run build`).
- `tools/world-index/dist/tests/types.test.js` (modify — regenerated by `npm run build`).

## Out of Scope

- Adding a new BEL-specific world-index unit test for `belief_record` parse / classification — the existing parse/index tests cover analogous story-bundle classes structurally, and this ticket updated the existing registry-count invariant. If BEL-specific parse / classification regression coverage is wanted, file a separate world-index test ticket.
- Special edge extraction for BEL records in `parseAtomicSourceFile` (e.g., extracting `basis.source_event` as an `SE-N` edge for graph traversal). The minimal registration enables node indexing; richer edge extraction is a follow-up if downstream graph queries need BEL → SE traversal.
- Extending `enumerate.ts` `isIndexablePath` with a separate `beliefs/` branch — `isIndexablePath` derives recognition from the same STORY_DIRS registration that this ticket updates; no separate change should be needed. If `unexpected_path` warnings persist after this ticket lands, file an `enumerate.ts`-specific follow-up.
- World canon `_source/<world-class>/*.yaml` surfaces — this ticket is story-bundle-scoped (`_source/beliefs/` under `worlds/<slug>/stories/<story>/`). No world-level surface is touched.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` — the world-index test suite PASSES.
2. `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js sync erotica-world && node tools/world-index/dist/src/cli.js stats erotica-world | grep '^  belief_record'` — prints `belief_record: 9` (matching the on-disk BEL count for red-bunny).
3. `node /home/joeloverbeck/projects/worldloom/tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slb-1-red-bunny-plan.json` — runs `storylet_predicate_dsl_parsability` as PASS with no `predicate.unresolved_reference` on BEL-N. The historical plan's overall `status` is currently fail for unrelated stale SLT id allocation expectations; see `## Deviations`.
4. Full-package build: `cd tools/world-index && npm run build` — exits 0.

### Invariants

1. **Four-surface BEL coverage**: BEL is now registered at all four pipeline surfaces (allocator per MCPENH-040; validator-schema per VALENH-011; patch-engine-op per PEENH-007; world-index parser-and-classification per THIS ticket).
2. **FOUNDATIONS §6a alignment**: the world-index now distinguishes `SF` (`story_fact_record`) from `BEL` (`belief_record`) at the indexed-node level, supporting the §6a SF / BEL separation that the shared story state contract §3-§4 codifies.
3. **No backwards regression**: legacy worlds without `_source/beliefs/` continue to index correctly (the STORY_DIRS dispatch tolerates missing directories); existing world-index tests PASS unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/types.test.ts` — update the NODE_TYPES registry-count invariant to 42 after adding the additive `belief_record` node type. A separate BEL-specific parser test can be filed if tighter per-class regression coverage is wanted.

### Commands

1. `cd tools/world-index && npm run build` — rebuilds source and compiled tests.
2. `cd tools/world-index && npm test` — full world-index suite.
3. `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js sync erotica-world && node tools/world-index/dist/src/cli.js stats erotica-world | grep -E '^  belief_record|^  story_entity_record'` — verifies BEL indexing landed.
4. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slb-1-red-bunny-plan.json` — validates the historical red-bunny plan far enough to prove BEL references now resolve; overall status is expected to fail on stale SLT id allocations in this checkout.

## Outcome

Completed: 2026-05-13.

`belief_record` is now registered in the world-index story-bundle parser, node-type vocabulary, and mention-evidence source set. The generated `dist/` output mirrors the source registration, the `erotica-world` derived index now reports nine indexed `belief_record` nodes for red-bunny, and the registry-count test was updated to the new 42-node-type contract.

## Verification Result

1. `cd tools/world-index && npm run build` — passed.
2. `cd tools/world-index && npm test` — passed after updating `tools/world-index/tests/types.test.ts` from 41 to 42 node types; 78 tests passed.
3. `grep -n 'beliefs\|belief_record' tools/world-index/dist/src/parse/atomic.js tools/world-index/dist/src/schema/types.js tools/world-index/dist/src/commands/shared.js` — found the generated `beliefs` / `belief_record` registrations in all three dist files.
4. `node tools/world-index/dist/src/cli.js sync erotica-world` — passed.
5. `node tools/world-index/dist/src/cli.js stats erotica-world | grep -E '^  belief_record|^  story_entity_record'` — printed `belief_record: 9` and `story_entity_record: 3`.
6. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/slb-1-red-bunny-plan.json` — `storylet_predicate_dsl_parsability` passed with no BEL unresolved-reference verdicts; the overall plan failed on stale `id_allocation_race` SLT expectations, recorded below.

## Deviations

- The three source registration files and generated dist files already contained the main `belief_record` additions at live reassessment time, but the active ticket remained PENDING and the same-seam registry-count test still expected 41 node types. This run completed the proof-surface update and closeout.
- The drafted representative patch-plan command no longer produces BEL unresolved-reference failures, but `/tmp/slb-1-red-bunny-plan.json` is no longer a full PASS witness because its `expected_id_allocations.slt_ids` are stale for the current red-bunny bundle (`SLT-11..22` expected while current next ids are `SLT-23..34`). This ticket's downstream proof is therefore the validator-specific PASS for `storylet_predicate_dsl_parsability`, not the historical plan's overall status.
