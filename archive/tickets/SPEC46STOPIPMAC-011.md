# SPEC46STOPIPMAC-011: STSEC edge extraction (4 edges: truth_anchor, holders, clue_carriers.record, reveal_records) + placeholder-skip

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (4 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStorySecret` helper + dispatch wiring + placeholder-skip convention reuse), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests including placeholder-skip cases), `tools/world-index/tests/types.test.ts` (current registry-count assertion), and `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` (implementation note)
**Deps**: None

## Problem

At intake, the world-index story-edge extraction at `tools/world-index/src/parse/atomic.ts` did not extract `STSEC` (story secret) record relations. Secret truth-anchor binding (`STSEC.truth_anchor`), secret holder ownership (`STSEC.holders[]` — STENT ids or placeholders), clue-carrier per-record provenance (`STSEC.clue_carriers[].record`), and reveal-record outcomes (`STSEC.reveal_records[]`) are schema-defined on the `STSEC` record per SPEC-42 §4.5.15 but were not extracted as edges. The `STSEC.holders[]` field is the second Phase C application of the **placeholder-skip convention** (after CLK.driver in `archive/tickets/SPEC46STOPIPMAC-010.md`) — `holders` accepts `STENT-<integer> | group:<name> | narrator` values, and edges now emit only when the value resolves to a known node-id prefix per spec §Group/system reference convention.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:564` is the dispatch site; `archive/tickets/SPEC46STOPIPMAC-010.md` establishes the placeholder-skip convention application pattern. The `STSEC` schema at SPEC-42 §4.5.15 carries `truth_anchor: SF | BEL | DA | null`, `holders: [STENT | group:<name> | narrator]`, `clue_carriers: [{kind, record, ...}]`, and `reveal_records: [BEL | SF | DA | STQ]` fields.
2. `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the four STSEC edges and explicitly notes the `holders` placeholder-skip behavior (`skip group: and narrator entries — same exclusion pattern as clock_driver`). The §Group/system reference convention paragraph names STSEC.holders as one of two record classes where the convention applies. The `secret_truth_anchor` edge skips when `truth_anchor` is null.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by the future dramatic-irony packet (deferred per SPEC-46 §Out of Scope item 5). The placeholder-skip convention preserves the same semantics as `archive/tickets/SPEC46STOPIPMAC-010.md`: abstract holders (`group:<name>`, `narrator`) remain on the source record retrievable via `get_record`; only STENT-bound holders produce edges.
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) is the primary motivating principle: STSEC is the per-bundle hidden-truth class that protects Mystery Reserve entries at story scope per `story-state-contract.md` §5 ("Mystery firewall enforcement"). The edges added by this ticket do NOT weaken the mystery firewall — they make secret-to-anchor / secret-to-holder / secret-to-clue-carrier / secret-to-reveal relationships graph-queryable so audits and future Mystery Reserve checks can walk the relations, but the firewall logic (which forbids `STSEC.status: revealed` on a `protected_mystery_refs[]: forbidden M-*` ref per SPEC-42 §STSEC Story-local vs. world Mystery Reserve) is unaffected. FOUNDATIONS §Tooling Recommendation additionally motivates the secret-clue-carrier edges: clue-carrier visibility queries are a deferred-but-important downstream consumer.
5. Live package reassessment adds `tools/world-index/tests/types.test.ts` to the owned surface. The existing current registry-count assertion moves with each Phase C edge slice; this ticket updates it from 26 to 30 story-edge types and from 41 to 45 total edge types while leaving the final `36` story-edge capstone assertion to SPEC46STOPIPMAC-015.
6. Same-seam spec truthing: `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` is the originating authority and carries dated implementation notes for prior landed Phase C slices. This ticket adds a narrow implementation note for the STSEC slice rather than rewriting the proposal's broader historical Phase C prose.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief` and `archive/tickets/SPEC46STOPIPMAC-010.md`'s placeholder-skip pattern. `edgesForStorySecret` uses the same live `isStoryRecordReference` predicate as `edgesForStoryClock` for `holders[]`. The clue-carrier iteration projects the nested `record` field per array element. Alternative considered: emit additional edges per clue_carrier sub-field (`kind`, `discovered_by`, `audience_visible`, `status`) — rejected because edges capture record-to-record relations; sub-field payload stays on the source record per the SPEC-45 / SPEC-46 §Tick-history granularity convention.
2. No backwards-compatibility aliasing or shims introduced.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `STSEC` records with each of the four source fields populated emit the expected edges with correct source / target / `edge_type`.
2. **Per-edge negative case** → schema validation: fixture `STSEC` with `truth_anchor: null` emits no `secret_truth_anchor` edge; empty arrays emit no edges.
3. **Placeholder-skip case** → schema validation: fixture `STSEC` with `holders: [group:foundlings, narrator, STENT-7]` emits exactly one `secret_holder` edge (to STENT-7); group + narrator entries are silently skipped (T-7 scope, placeholder sub-check).
4. **Clue-carrier nested-field handling** → schema validation: `clue_carriers: [{kind: DA, record: DA-3}, {kind: STOBJ, record: STOBJ-5}]` emits two `secret_clue_carrier` edges, one per carrier's `record` field.
5. **§Rule 7 firewall preservation** → FOUNDATIONS alignment check: the new edges do NOT change `STSEC.status: revealed` semantics or the protected-mystery firewall (`rule7_mystery_reserve_preservation` validator behavior unchanged).
6. **No regression on existing edges** → `cd tools/world-index && npm test` passes for the full world-index test suite.

## Landed Changes

### 1. Extended `STORY_EDGE_TYPES` with four new edge type strings

In `tools/world-index/src/schema/types.ts`, added four entries to `STORY_EDGE_TYPES`: `"secret_truth_anchor"`, `"secret_holder"`, `"secret_clue_carrier"`, `"secret_reveal_record"`.

### 2. Implemented `edgesForStorySecret` helper with placeholder-skip reuse

In `tools/world-index/src/parse/atomic.ts`, added `edgesForStorySecret(node: NodeRow, record: Record<string, unknown>, storySlug: string)`:
- `STSEC.truth_anchor` → emit one `secret_truth_anchor` edge from node id to the anchor (SF / BEL / DA), skipping when null.
- `STSEC.holders[]` → iterate; emit one `secret_holder` edge per holder ONLY when the value resolves to a known node-id prefix (typically STENT); skip `group:<name>` and `narrator` entries per the placeholder-skip convention.
- `STSEC.clue_carriers[]` → iterate; emit one `secret_clue_carrier` edge per `carrier.record` field.
- `STSEC.reveal_records[]` → iterate; emit one `secret_reveal_record` edge per record id.

### 3. Wired `edgesForStorySecret` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts`, added a dispatch branch for the live `story_secret_record` node type.

### 4. Appended STSEC tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Appended positive + negative + placeholder-skip tests for all four STSEC edges. The mixed-holder test confirms the placeholder-skip behavior with multiple holder shapes in one record.

### 5. Updated current registry-count proof and SPEC-46 implementation note

Updated `tools/world-index/tests/types.test.ts` to the post-STSEC current count (`STORY_EDGE_TYPES.length === 30`; total `EDGE_TYPES.length === 45`). Added a dated SPEC-46 implementation note for this landed Phase C slice.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 4 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStorySecret` + dispatch wiring; reuse the same live `isStoryRecordReference` predicate as `archive/tickets/SPEC46STOPIPMAC-010.md`)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append STSEC tests including placeholder-skip cases)
- `tools/world-index/tests/types.test.ts` (modify — update current registry-count assertion to the post-STSEC count)
- `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` (modify — added dated implementation note for the landed STSEC slice)

## Out of Scope

- Other per-class extractors (BEL in 006, SREL in 007, STINT in 008, STSTAT in 009, CLK in 010, STQ in 012, SE extension in 013).
- Clue-carrier sub-field encoding (`kind`, `discovered_by`, `audience_visible`, `status`) as edge properties — payload stays on the source record per SPEC-45 / SPEC-46 §Tick-history granularity convention.
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion — capstone ticket 015.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- Changes to `rule7_mystery_reserve_preservation` validator behavior — explicitly out of scope; this ticket adds query surface without changing firewall semantics.

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `secret_truth_anchor`, `secret_holder` (with STENT-prefixed holder), `secret_clue_carrier`, `secret_reveal_record` — each emits expected edges with correct source / target / `edge_type` (T-7 scope).
2. Negative test for `secret_truth_anchor` with null source field — no edge emitted.
3. Placeholder-skip tests — `holders: [group:<name>, narrator]` emits zero `secret_holder` edges; mixed-holder `holders: [STENT-7, group:foundlings, narrator]` emits exactly one `secret_holder` edge to STENT-7.
4. Clue-carrier nested-field test — `clue_carriers` array with N entries produces N `secret_clue_carrier` edges, one per carrier's `record` field.
5. `cd tools/world-index && npm test` passes for the full world-index test suite.
6. `cd tools/world-index && npm run build` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. Placeholder values (`group:<name>`, `narrator`) in `STSEC.holders[]` NEVER produce edges — convention is uniform with `CLK.driver` (FOUNDATIONS §Rule 7 mystery-firewall posture preserved).
3. `secret_*` edges add query surface without changing the `rule7_mystery_reserve_preservation` validator's firewall semantics — no `STSEC.status: revealed` check is modified, no `protected_mystery_refs[]` semantics are touched.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative + placeholder-skip + clue-carrier-nested tests for the four STSEC edges.
2. `tools/world-index/tests/types.test.ts` — update the current registry-count assertion to the post-STSEC count.

### Commands

1. `cd tools/world-index && npm test` (targeted: full world-index test suite passes including new STSEC edge tests + placeholder-skip cases)
2. `cd tools/world-index && npm run build` (typechecks the extended `STORY_EDGE_TYPES`)

## Outcome

Completed on 2026-05-18. The world-index story-edge registry now includes `secret_truth_anchor`, `secret_holder`, `secret_clue_carrier`, and `secret_reveal_record`, and `story_secret_record` parser nodes emit those edges for populated `STSEC.truth_anchor`, STENT-shaped `STSEC.holders[]`, nested `STSEC.clue_carriers[].record`, and populated `STSEC.reveal_records[]` entries. Placeholder holders (`group:<name>` and `narrator`) are skipped, preserving the record-body-only semantics for abstract secret holders. Parser-level tests cover populated STSEC edges, empty/null fields, placeholder-only holders, and mixed placeholder/STENT holders. The current registry-count test now asserts the post-STSEC count (`STORY_EDGE_TYPES.length === 30`; total `EDGE_TYPES.length === 45`). SPEC-46 now carries a dated implementation note for this landed Phase C slice.

## Verification Result

- `npm run build` from `tools/world-index` — PASS.
- `npm test` from `tools/world-index` — PASS, 113 tests / 113 pass, including the new STSEC edge tests and registry-count test.

## Deviations

- `tools/world-index/tests/types.test.ts` was added to the touched surface during reassessment because the existing current-count assertion moves with each Phase C edge slice. This does not replace the final `STORY_EDGE_TYPES.length === 36` capstone assertion owned by SPEC46STOPIPMAC-015.
