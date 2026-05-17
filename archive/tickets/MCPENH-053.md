# MCPENH-053: Register `belief_record` / `BEL` in world-mcp retrieval enums (`_shared.ts`, `list-records.ts`, `get-record.ts` error string)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/_shared.ts`, `tools/world-mcp/src/tools/list-records.ts`, `tools/world-mcp/src/tools/get-record.ts`, `tools/world-mcp/src/server.ts`, matching `tools/world-mcp/tests/` coverage, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` retrieval-row docs.
**Deps**: `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` (allocator-side BEL registration; explicitly left `get_record` / `list_records` retrieval enums to a "separate greenfield removal/retrieval track" per its §Out of Scope item 4), `archive/tickets/MCPENH-044-register-belief-record-class-in-world-index.md` (world-index parser-side BEL registration; the world-index does index BEL records, but world-mcp's retrieval enums never learned), `archive/tickets/VALENH-011-register-bel-record-schema-compliance-and-drop-arc-trace-validators.md` (validator-side BEL schema compliance), `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md` (patch-engine-side BEL op).

## Problem

At intake, the world-mcp retrieval surface — `mcp__worldloom__get_record(BEL-N)`, `mcp__worldloom__get_records([BEL-N, …])`, `mcp__worldloom__list_records(record_type='belief_record', …)`, and any tool routing through `isStoryBundleRecordId()` / `isStoryBundleNodeType()` (notably `get_neighbors`, `find_impacted_fragments`) — rejected `BEL-N` IDs and `belief_record` node types as unsupported, even though every other layer of the pipeline recognized them:

- Allocator (MCPENH-040): `BEL: "beliefs"` registered in `STORY_SCOPED_ID_CLASS_DIRECTORIES` and `BEL` in `ID_CLASSES`.
- World-index parser (MCPENH-044): `["beliefs", recordSpec("belief_record", "id", "^BEL-[0-9]+$")]` registered in `STORY_DIRS`; `belief_record` in `NODE_TYPES` and `MENTION_EVIDENCE_SOURCE_NODE_TYPES`.
- Patch engine (PEENH-007): `create_bel_record` op registered; `belief_record` recognized by envelope schema discovery (`describe-envelope-schema.ts:91, 427`).
- Validators (VALENH-011): `record_schema_compliance` knows `belief_record` per `story-belief.schema.json`.
- Schema discovery (`get_record_schema`): `belief_record` listed at `get-record-schema.ts:41, 87`.
- Context packet seed-node regex (`get-context-packet.ts:30`): includes `BEL`.

Before this ticket, the only surfaces that did not know about belief_record / BEL were the world-mcp retrieval enums. As a direct consequence, `branching-story-turn-cycle` (and every future story-pipeline skill that loads BEL records into working memory — `branching-story-health-audit`, `commitment-block-authoring`, `branching-story-prose-attach`, `story-fact-promotion-to-canon`) was forced into a per-file `Read` fallback on `worlds/<slug>/stories/<story-slug>/_source/beliefs/BEL-N.yaml` to load belief state — exactly the pattern §Tooling Recommendation tells skills to avoid.

Historical session evidence (before this ticket, `branching-story-turn-cycle` on `red-bunny` PG-1 → PG-2): `get_records(record_ids=["BEL-1", "BEL-2", "BEL-3", "BEL-4", "BEL-5", "BEL-6", "BEL-7", "BEL-8", …])` returned per-id `invalid_input` errors with `"expected": "atomic (CF-<integer>, …), hybrid (CHAR-<integer>, …), or story-bundle (PG/SE/SF/OBL/CNSQ/THR/SREL/STINT/STENT/STSTAT/STLOC/STOBJ/BR/CHC/SLT/SLB/SAU/SP/RSP-<integer>)"` — BEL was absent from the supported story-bundle list. The skill had to fall back to 8 individual `Read` tool calls on `worlds/erotica-world/stories/red-bunny/_source/beliefs/BEL-*.yaml` to load Ane's and Jon's beliefs (BEL-1 through BEL-8) for Phase 1 context loading, Phase 4 belief-state planning, and Phase 6 PG snapshot composition.

## Assumption Reassessment (2026-05-17)

1. **Codebase state at intake**. Verified at HEAD via grep against `tools/world-mcp/src/`:
   - `tools/world-mcp/src/tools/_shared.ts:80-101` (`STORY_BUNDLE_NODE_TYPES` array) — enumerates 20 node types (story_entity_record, story_status_record, story_fact_record, story_event_record, obligation_record, consequence_record, thread_record, relationship_record_story, intention_record, story_location_record, story_object_record, branch_record, page_record, choice_record, storylet_record, story_diegetic_artifact_record, audit_record_story, promotion_record, storylet_batch_manifest, remediation_storylet_proposal_card). `belief_record` is absent.
   - `tools/world-mcp/src/tools/_shared.ts:105-125` (`STORY_BUNDLE_ID_PREFIXES` array) — enumerates 19 prefixes (PG, SE, SF, OBL, CNSQ, THR, SREL, STINT, STENT, STSTAT, STLOC, STOBJ, BR, CHC, SLT, SLB, SAU, SP, RSP). `BEL` is absent.
   - `tools/world-mcp/src/tools/list-records.ts:21-52` (`SUPPORTED_LIST_RECORD_TYPES` array) — enumerates 30 record types (10 atomic + 3 hybrid + 17 story-bundle = 30). `belief_record` is absent.
   - `tools/world-mcp/src/tools/list-records.ts:111-142` (`RECORD_TYPE_TO_NODE_TYPE` map) — maps each `SUPPORTED_LIST_RECORD_TYPES` value to a `NodeType`. No `belief_record` entry.
   - `tools/world-mcp/src/tools/get-record.ts:174` (error-string enumeration in the `invalid_input` response when an unsupported `record_id` is passed) — story-bundle list omits `BEL`.
   - `tools/world-mcp/src/tools/_shared.ts:127-129` derives `STORY_BUNDLE_RECORD_ID_PATTERN` from `STORY_BUNDLE_ID_PREFIXES`; downstream `isStoryBundleRecordId()` (line 135-137) returns `false` for `BEL-N` because the regex never matched. Consumers: `get-record.ts` (lines 25, 138, 166, 191, 231, 294, 629), `get-neighbors.ts` (lines 8, 157, 166), `find-impacted-fragments.ts` (lines 6, 38), `list-records.ts` (line 7, 378 — via `isStoryBundleNodeType`).
   - At pre-implementation intake, `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts`, `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts`, `tools/world-mcp/tests/tools/get-records.test.ts`, `tools/world-mcp/tests/tools/get-neighbors.story-bundle.test.ts`, `tools/world-mcp/tests/tools/find-impacted-fragments.story-bundle.test.ts`, `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts`, `tools/world-mcp/tests/tools/describe-capabilities.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts` all existed but did not reference `belief_record` / `BEL` (grep returned zero matches).
2. **Docs / spec state at intake**. `docs/FOUNDATIONS.md` §Story Bundles §1 and §6 commit `BEL` as a first-class story-bundle record class; CLAUDE.md §ID Allocation Conventions names `BEL-<integer>`; `.claude/skills/_shared-templates/story-state-contract.md` §3 (Record Class Inventory) lists `BEL` and §4.1 defines its schema. `branching-story-turn-cycle/SKILL.md` World-State Prerequisites references `mcp__worldloom__get_records(record_ids=..., story_slug=<story_slug>)` for loading bundle records generically (implicitly assumes BEL is supported); the same prose in §Pre-flight step 9 says "Load parent's `state_snapshot.active_records` into working state" — that active_records map's `BEL` key requires BEL retrieval to be functional. Every contract surface treats BEL as canonical. Only the world-mcp retrieval enums lag.
3. **Shared boundary under audit**. The contract between the four-surface BEL registration pattern (allocator + world-index parser + patch-engine op + validator schema-compliance) and the world-mcp retrieval enums. MCPENH-040 explicitly named the gap: *"Existing `get_record` / `list_records` / schema-discovery ARC_TRACE references are intentionally left to the separate greenfield removal/retrieval track."* MCPENH-040 closed the allocator leg; MCPENH-044 closed the world-index leg; PEENH-007 closed the patch-engine leg; VALENH-011 closed the validator leg. The retrieval-enum leg of that track was never opened. This ticket completes it. The invariant is: every story-bundle record class registered in the patch engine's `create_*_record` op set must also be retrievable through the world-mcp retrieval surface (otherwise the engine can write records the retrieval surface cannot read).
4. **FOUNDATIONS principle restated**. §Tooling Recommendation commits to MCP retrieval as the canonical read path for indexed records; the recommendation is non-negotiable for story-pipeline skills loading bundle context. §Story Bundles §1 / §6 commit `BEL` as a canonical record class. The implementation gap is the retrieval surface not honoring that contract for the `BEL` class — same shape as the pre-MCPENH-040 allocator gap, the pre-MCPENH-044 world-index gap, and the pre-VALENH-011 validator gap, all of which were correctly resolved as MCPENH / VALENH tickets per the same principle.
5. **Output schema extension impact**. Extending `STORY_BUNDLE_NODE_TYPES`, `STORY_BUNDLE_ID_PREFIXES`, `SUPPORTED_LIST_RECORD_TYPES`, and `RECORD_TYPE_TO_NODE_TYPE` with `belief_record` / `BEL` entries is **additive-only**. No existing consumer's call shape changes; existing record-type values continue to work identically. The `get-record.ts` error-string enumeration update adds `BEL` to the human-readable expected-pattern documentation; existing pattern matches remain unchanged. Final verification found no registry-count assertion in `_shared.envelope-shape.test.ts`; the adjacent proof fallout was the shared story-bundle fixture's `search_nodes` expectation after BEL rows were added.
6. **Mismatch + correction**. At intake, the implicit assumption in the branching-story-turn-cycle SKILL.md Phase 1 / Phase 6 prose was that `get_records` supports every story-bundle record class. The actual codebase state is that the world-mcp retrieval enums were never extended for `belief_record` / `BEL` because MCPENH-040 deliberately scoped that work out and the follow-up retrieval-track ticket was never filed. The correction is this ticket: extend the four enum sites + update the error-string + add test coverage, completing the four-surface BEL registration pattern across (allocator, world-index, patch-engine, validator) + (retrieval). With this ticket landed, `get_records(record_ids=["BEL-N", …], story_slug=…)` returns successfully and the per-file `Read` fallback recurring every turn-cycle invocation goes away.
7. **Same-fixture proof fallout (current run)**. Adding BEL records to the shared `tools/world-mcp/tests/tools/story-bundle-fixture.ts` fixture makes `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`'s exhaustive `loft` result truthful only if it includes the new `belief_record` row. This is same-seam proof-surface truthing, not a behavior expansion beyond retrieval enums, because `search_nodes` already supports story-bundle records and the fixture now contains a BEL node with matching lexical evidence.

## Architecture Check

1. **Additive enum extension is the minimal change consistent with the four-surface BEL registration contract.** Alternative considered: introduce a separate `BELIEF_BUNDLE_NODE_TYPES` constant and a `isBeliefRecordId()` helper to avoid touching the existing enums. Rejected — every other story-bundle class lives in the single canonical `STORY_BUNDLE_*` registry; a parallel BELIEF-only registry would be the opposite of the four-surface unification pattern this ticket is closing. The world-mcp retrieval surface is the only one still treating BEL as different, and the fix is to STOP treating it as different.
2. **No backwards-compatibility shims or alias paths introduced.** No `BEL`-to-`ARCTRACE` alias, no fallback retrieval path that decays to direct file reads — every story-bundle record class either is or is not retrievable through the MCP. The fix flips BEL from "is not" to "is" by extending the enums.

## Verification Layers

1. **Enum extension exposes BEL** → schema validation: `tools/world-mcp/tests/tools/describe-capabilities.test.ts` proves `describe_capabilities` advertises `belief_record` in the `list_records.record_type` enum and `BEL` in any documented story-bundle-prefix metadata.
2. **`get_record(BEL-N)` and `get_records([BEL-N, …])` succeed** → targeted tool tests: extend `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` and add a BEL fixture to `tools/world-mcp/tests/tools/get-records.test.ts` covering a single BEL fetch and a mixed-class batch fetch where at least one BEL record is present.
3. **`list_records(record_type='belief_record', story_slug=…)` returns indexed BEL records** → targeted tool test: extend `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` to cover the belief_record enumeration path against a story-bundle fixture with at least two BEL records, asserting the metadata and full-body shapes match the existing story-bundle pattern.
4. **`get_neighbors(BEL-N)` and `find_impacted_fragments(BEL-N)` no longer reject** → codebase grep-proof + targeted test: extend `tools/world-mcp/tests/tools/get-neighbors.story-bundle.test.ts` and `tools/world-mcp/tests/tools/find-impacted-fragments.story-bundle.test.ts` to cover at least one BEL-N invocation that previously errored under `isStoryBundleRecordId()` returning false.
5. **MCP boundary accepts BEL after rebuild** → in-memory MCP dispatch: `get_record`, `get_records`, and `list_records(record_type="belief_record")` return BEL records inline against the seeded `opening-bells` fixture; no `invalid_input` errors.
6. **FOUNDATIONS alignment** → spec alignment check: `docs/FOUNDATIONS.md` §Story Bundles §6 still lists `BEL` as a canonical bundle class (no change to that file); CLAUDE.md and `.claude/skills/_shared-templates/story-state-contract.md` still treat BEL as first-class (no change to those files); the world-mcp retrieval enums now match those contract surfaces.

## Landed Changes

### 1. Extended `STORY_BUNDLE_NODE_TYPES` and `STORY_BUNDLE_ID_PREFIXES` in `_shared.ts`

`tools/world-mcp/src/tools/_shared.ts` now includes `"belief_record"` in `STORY_BUNDLE_NODE_TYPES` and `"BEL"` in `STORY_BUNDLE_ID_PREFIXES`. `STORY_BUNDLE_RECORD_ID_PATTERN`, `isStoryBundleNodeType()`, and `isStoryBundleRecordId()` inherit the new class from those registries.

### 2. Extended `SUPPORTED_LIST_RECORD_TYPES` and `RECORD_TYPE_TO_NODE_TYPE` in `list-records.ts`

`tools/world-mcp/src/tools/list-records.ts` now accepts `record_type: "belief_record"` and maps it directly to the indexed `belief_record` node type.

### 3. Updated error-string enumeration and MCP metadata

`tools/world-mcp/src/tools/get-record.ts` now names `BEL` in the unsupported-id expected-pattern string, and `tools/world-mcp/src/server.ts` names `BEL-<integer>` in the registered `get_record` capability description.

### 4. Extended test coverage

The shared story-bundle fixture now includes two `belief_record` rows and a BEL edge. Focused tests cover direct handler retrieval (`get_record`, `get_records`, `list_records`, `get_neighbors`, `find_impacted_fragments`), capability enum exposure, in-memory MCP dispatch for `get_record` / `get_records` / `list_records`, and the search fixture fallout from adding BEL to the shared indexed fixture.

### 5. Updated README + docs

`tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` now list `BEL` / `belief_record` among supported retrieval classes for `get_record` and `list_records`.

## Files to Touch

- `tools/world-mcp/src/tools/_shared.ts` (modify)
- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tools/get-record.ts` (modify — error string only; no other behavior change)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-records.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-neighbors.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/find-impacted-fragments.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify — shared BEL fixture fallout)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify — enum-membership assertion)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — BEL dispatch coverage)
- `tools/world-mcp/README.md` (modify — supported-class rows for get_record / get_records / list_records)
- `docs/MACHINE-FACING-LAYER.md` (modify — machine-facing retrieval rows)
- `tools/world-mcp/dist/` (rebuilt — `cd tools/world-mcp && npm run build`)

## Out of Scope

- World-index changes (already covered by MCPENH-044).
- Allocator changes (already covered by MCPENH-040).
- Patch-engine `create_bel_record` op changes (already covered by PEENH-007).
- Validator `record_schema_compliance` for BEL (already covered by VALENH-011).
- Schema-discovery `get_record_schema` for belief_record (already supported at `get-record-schema.ts:41, 87`).
- Adding ARC_TRACE removal to retrieval surfaces (separate cleanup track — this ticket strictly adds BEL/belief_record support; ARC_TRACE removal is a parallel concern flagged in MCPENH-040 §Out-of-Scope item 4 and not addressed here).
- Updating `branching-story-turn-cycle/SKILL.md` Guardrails to note the prior per-file `Read` fallback as a known-deferred-debt disclosure that is now resolved — that prose update is downstream of this ticket landing and belongs in a `/skill-audit` follow-up, not in this ticket.
- Updating `branching-story-bootstrap` / `branching-story-health-audit` / `commitment-block-authoring` / `branching-story-prose-attach` / `story-fact-promotion-to-canon` SKILL.md prose to remove any per-file BEL Read fallbacks they may currently document — same /skill-audit follow-up scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --reporter dot` passes with all extended tests in §4 above (BEL fixture coverage in get-record, get-records, list-records, get-neighbors, find-impacted-fragments, search fixture fallout, capability metadata, and in-memory MCP dispatch).
2. `cd tools/world-mcp && npm run build` succeeds with no TypeScript errors after the enum extensions.
3. In-memory MCP dispatch smoke after rebuild: `get_records(record_ids=["BEL-1"], story_slug="opening-bells", world_slug="seeded")` returns the BEL-1 record inline (not an `invalid_input` error).
4. In-memory MCP dispatch smoke after rebuild: `list_records(record_type='belief_record', story_slug="opening-bells", world_slug="seeded")` returns the indexed BEL record from the seeded fixture.
5. `cd tools/validators && npm test -- --reporter dot` continues passing (no downstream validator break).

### Invariants

1. Every story-bundle record class registered in the patch engine's `create_*_record` op set is retrievable through `mcp__worldloom__get_record` / `mcp__worldloom__get_records` / `mcp__worldloom__list_records`. (The four-surface BEL registration pattern + retrieval surface forms the canonical complete surface for any story-bundle class.)
2. `STORY_BUNDLE_NODE_TYPES`, `STORY_BUNDLE_ID_PREFIXES`, and `SUPPORTED_LIST_RECORD_TYPES` remain in 1:1 correspondence with the story-bundle record classes declared in `.claude/skills/_shared-templates/story-state-contract.md` §3 — the contract surface is the authority; the world-mcp enums must mirror it without divergence.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify) — BEL retrieval coverage including section_path projection on §4.1 schema fields.
2. `tools/world-mcp/tests/tools/get-records.test.ts` (modify) — batch fetch including at least one BEL record alongside other classes.
3. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify) — belief_record enumeration coverage.
4. `tools/world-mcp/tests/tools/get-neighbors.story-bundle.test.ts` (modify) — BEL-N invocation no longer errors at `isStoryBundleRecordId()` gate.
5. `tools/world-mcp/tests/tools/find-impacted-fragments.story-bundle.test.ts` (modify) — BEL-N invocation no longer errors at `isStoryBundleRecordId()` gate.
6. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify) — shared fixture result list includes the new BEL row.
7. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify) — capability enum advertises `belief_record`.
8. `tools/world-mcp/tests/server/dispatch.test.ts` (modify) — in-memory MCP dispatch accepts BEL on retrieval tools.

### Commands

1. `cd tools/world-mcp && npm test -- --reporter dot` — full world-mcp package test lane.
2. `cd tools/world-mcp && npm run build` — TypeScript compile must succeed after the enum additions.
3. `cd tools/validators && npm test -- --reporter dot` — confirm no downstream validator regression on belief_record retrieval-shape changes (validators don't currently route through world-mcp retrieval, but full-pipeline sanity).

## Outcome

Completed on 2026-05-17. The world-mcp retrieval surface now treats `BEL` / `belief_record` as a first-class story-bundle retrieval class: `get_record`, `get_records`, `list_records`, `get_neighbors`, and `find_impacted_fragments` accept BEL-authored ids when `story_slug` is supplied, and `describe_capabilities` advertises `belief_record` in the `list_records.record_type` enum. Package README and machine-facing docs now list the BEL retrieval class.

## Verification Result

1. `cd tools/world-mcp && npm test -- --reporter dot` — pre-edit baseline passed: 380 tests passed.
2. `cd tools/world-mcp && npm run build` — passed after the final source/test edits.
3. `cd tools/world-mcp && node --test dist/tests/tools/get-records.test.js dist/tests/tools/get-record.story-bundle.test.js dist/tests/tools/list-records.story-bundle.test.js dist/tests/server/dispatch.test.js` — passed: 52 tests passed.
4. `cd tools/world-mcp && npm test -- --reporter dot` — passed after final edits: 388 tests passed.
5. `cd tools/validators && npm test -- --reporter dot` — passed: 342 tests passed.
6. `git diff --check -- <owned paths including archive/tickets/MCPENH-053.md>` — passed after using `git add -N` to include this untracked ticket in the whitespace check, then clearing the intent-to-add entry.
7. Manual/source review: `tools/world-mcp/src/tools/_shared.ts`, `list-records.ts`, `get-record.ts`, `src/server.ts`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` now include `BEL` / `belief_record` in the owned retrieval surfaces.

## Deviations

- The drafted direct external `mcp__worldloom__...` smoke against local `erotica-world/red-bunny` was replaced with in-memory MCP server dispatch tests against the seeded `opening-bells` fixture. The external MCP toolset/restarted server boundary is not exposed in this Codex session, while the in-memory dispatch tests exercise the same package registration and Zod input-schema boundary after a fresh build.
- The validator package was run as a downstream sanity gate because the ticket listed it, but this ticket does not change validator behavior; the authoritative acceptance surface is the `tools/world-mcp` build, focused retrieval tests, in-memory MCP dispatch tests, and full package suite.
- Adding BEL records to the shared story-bundle fixture exposed same-seam `search_nodes` fixture-count fallout. The search test was updated to include the new BEL row; no `search_nodes` runtime behavior changed.
