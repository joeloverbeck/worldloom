# SPEC67STOWORIND-001: Add 7 consumer-backed story-bundle edges to the world-index parser

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` parser (`atomic.ts`) + edge-type schema (`types.ts`); `docs/MACHINE-FACING-LAYER.md` edge catalog. No DB migration (the `edges.edge_type` column is free `TEXT`, no CHECK constraint). No impact on existing edge emission — purely additive.
**Deps**: None

## Problem

The world-index parser (`tools/world-index/src/parse/atomic.ts`) emits no edges for several documented story-bundle reference fields, and four story node types (`STLOC`, `STOBJ`, `CNSQ`, story-local `DA`) have zero edge functions. Per SPEC-67 §2.1, seven consumer-backed edges are missing — each read by a current or near-term consumer (`branching-story-health-audit` traversal, `get_neighbors`, `find_impacted_fragments`). Without them: the Mystery-Accretion firewall walk cannot traverse which secrets protect which Mystery Reserve entries; `CNSQ` records are entirely un-traversable; obligation debt-party and consequence/thread provenance cannot be followed; and reverse-supersession lookup for stale `STCHAR` detection is unavailable.

## Assumption Reassessment (2026-05-21)

1. **Codebase** — Verified against `tools/world-index/src/parse/atomic.ts`: `createStoryRefEdge` (def ~line 607) builds `target_unresolved_ref: storyNodeId(storySlug, targetRef)` = `${storySlug}:${ref}` (story-scoped); `createRefEdge` (def ~line 1197) leaves the target ref unprefixed and is used for the existing story→world edges `world_entity_binding` (STENT→ENT, line 600), `stchar_source_character` (STCHAR→CHAR, line 733), and `story_fact_derived_from` (SF→CF, guarded by `CANON_FACT_REF_REGEX = /^CF-\d+$/`, line 607). `isStoryRecordReference` (~line 1460) is `/^[A-Z]+-[0-9]+$/`. Existing per-class blocks confirmed: `edgesForStorySecret` (STSEC — currently emits `secret_truth_anchor`/`secret_holder`/`secret_clue_carrier`/`secret_reveal_record`, NOT `protected_mystery_refs`/`source_records`); `obligation_record` block (line 709, emits only `dependent_fact` from `dependent_facts`); `thread_record` block (line 715, emits `thread_obligation`); `edgesForStoryCharacterAuthority` (emits `stchar_supersedes` from `supersedes`, line 739). There is NO `consequence_record` node_type case — CNSQ has zero edges, confirming the spec.
2. **Specs/docs** — SPEC-67 §2.1 is the source. Schema fields verified real in `.claude/skills/_shared-templates/story-record-schemas.md`: `STSEC.protected_mystery_refs[]` (line 719), `STSEC.source_records` (line 734), `OBL.owed_by`/`owed_to` (lines 496–497), `CNSQ.derived_from` (line 518), `THR.derived_from` (line 534), `STCHAR.superseded_by` (line 863). **`OBL` has NO `derived_from` field** (closed `additionalProperties: false` schema at `tools/validators/src/schemas/story-obligation.schema.json`) — so `obligation_derived_from` is correctly NOT in this ticket (7 edges, not 8), per the SPEC-67 reassessment that removed it.
3. **Cross-artifact shared boundary under audit** — The contract is `STORY_EDGE_TYPES` (`tools/world-index/src/schema/types.ts:92`) and the `edges` table it populates: produced by the `atomic.ts` parser, consumed by `tools/world-mcp/src/tools/get-neighbors.ts` (filters only by caller-supplied `edge_types`; empty = returns all — line 81-82), `find-impacted-fragments.ts`, and the `branching-story-health-audit` skill's traversal. `STORY_EDGE_TYPES` spreads into `EDGE_TYPES` (types.ts ~line 166) and re-exports via `tools/world-index/src/public/types.ts` — adding to `STORY_EDGE_TYPES` flows to all consumers automatically. No retrieval allowlist gates these consumers; `LOCAL_CONTEXT_EDGE_TYPES` (world-mcp `scoped-local-context.ts`) is a curated packet-layer subset the SPEC-67 consumers do not route through, so it is intentionally NOT touched.
4. **FOUNDATIONS principle under audit** — **Rule 7 (Preserve Mystery Deliberately)**: `secret_protected_mystery` is the edge that *enables* the Mystery-Accretion firewall walk to traverse which secrets protect which `M-*` Mystery Reserve entries (FOUNDATIONS §5 Mystery Accretion). Adding the edge strengthens, never weakens, the firewall and resolves no `M` entry. **Rule 5 (No Consequence Evasion)**: `obligation_owed_by/owed_to`, `consequence_derived_from`, `thread_derived_from` serve debt-party and provenance traversal — the second-order "who still owes what / what caused what" questions. **§5b Schema-Minimalism / YAGNI**: only consumer-backed edges are added; the non-indexed fields are deferred to SPEC67STOWORIND-002.

## Architecture Check

1. Mirrors the parser's existing two-constructor convention rather than inventing a new mechanism: six story-local-target edges reuse `createStoryRefEdge`/`pushStoryEdgeIfReference` (slug-scoped targets); the one cross-namespace edge (`secret_protected_mystery` → world-canon `M-*`) reuses `createRefEdge` + an `M-` guard regex, exactly as `world_entity_binding`/`stchar_source_character`/`story_fact_derived_from` already do for STENT→ENT / STCHAR→CHAR / SF→CF. Using the wrong constructor for the cross-namespace edge would story-scope the target to `<slug>:M-1` and dangle.
2. No backwards-compatibility aliasing/shims. New edge types are additive entries in `STORY_EDGE_TYPES`; the `edges.edge_type` column is unconstrained `TEXT` so no schema migration or shim is introduced.

## Verification Layers

1. New edge types registered → codebase grep-proof: `grep -c '"' STORY_EDGE_TYPES block` = 76; `grep -n "secret_protected_mystery\|secret_source_record\|obligation_owed_by\|obligation_owed_to\|consequence_derived_from\|thread_derived_from\|stchar_superseded_by" tools/world-index/src/schema/types.ts` returns 7.
2. Edges emitted when fields populated → parser dry-run via positive test fixtures: six YAML story-record edge types in `tools/world-index/tests/story-bundle-edges.test.ts` and the `STCHAR.superseded_by` hybrid edge in `tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts`, asserted through the parse pipeline.
3. Cross-namespace edge resolves correctly → schema/codebase grep-proof: the `secret_protected_mystery` fixture asserts an unprefixed `M-<n>` target (`target_unresolved_ref` has no `<slug>:` prefix), distinguishing it from the slug-scoped story-local edges.
4. Mystery Reserve firewall preserved → FOUNDATIONS alignment check: the edge is read-only graph structure; no parse/emit path resolves or narrows an `M` entry (Rule 7).

## Landed Changes

### 1. Registered 7 edge types in `STORY_EDGE_TYPES`

In `tools/world-index/src/schema/types.ts`, appended `secret_protected_mystery`, `secret_source_record`, `obligation_owed_by`, `obligation_owed_to`, `consequence_derived_from`, `thread_derived_from`, and `stchar_superseded_by` to `STORY_EDGE_TYPES`. They flow into `EDGE_TYPES` and the public re-export automatically.

### 2. Emitted the six story-local-target edges in `atomic.ts`

- `edgesForStorySecret`: emit `secret_source_record` for each `source_records[]` reference (story-scoped, via the existing `createStoryRefEdge` pattern).
- `obligation_record` block: emit `obligation_owed_by` from `owed_by` and `obligation_owed_to` from `owed_to`, guarded by `isStoryRecordReference` (so `group:<name>`, `public`, `null` are skipped — only `STENT-<integer>` emits).
- New `consequence_record` node_type case: emit `consequence_derived_from` for each `derived_from[]` reference.
- `thread_record` block: emit `thread_derived_from` for each `derived_from[]` reference.
- `edgesForStoryCharacterAuthority`: emit `stchar_superseded_by` from `superseded_by` (story-scoped), the reverse of the existing `stchar_supersedes`.

### 3. Emitted the one cross-namespace edge `secret_protected_mystery`

In `edgesForStorySecret`, `secret_protected_mystery` emits for each valid `protected_mystery_refs[]` entry using `createRefEdge` (NOT `createStoryRefEdge`) so the `M-*` target is left unprefixed, guarded by an `M-` ref regex (`/^M-\d+$/`, mirroring `CANON_FACT_REF_REGEX`). This matches the indexing of world-canon Mystery Reserve nodes (`mystery_reserve_entry`, id `^M-[0-9]+$`, no story-slug prefix).

### 4. Added positive fixtures + updated count assertions

- Added positive parser-test fixtures for the six YAML story-record edge types in `tools/world-index/tests/story-bundle-edges.test.ts`; the `STCHAR.superseded_by` hybrid fixture landed in `tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts`.
- Updated `tools/world-index/tests/types.test.ts` count assertions: `STORY_EDGE_TYPES.length` 69 → 76 and aggregate `EDGE_TYPES.length` 84 → 91.
- Updated existing integration count assertions in `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` and `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` from 69 to 76 after the first broad package run exposed the stale proof-surface counts.

### 5. Updated the `docs/MACHINE-FACING-LAYER.md` edge catalog

Added a new edge-type subsection (one row per new edge, naming the source field and target shape — note `secret_protected_mystery` targets world-canon `M-*`). Reconciled the catalog's stated running total against the actual `STORY_EDGE_TYPES.length` rather than adding to the printed figure: the doc previously said "65 story-bundle edge types" but the constant already held 69 (pre-existing drift), so the correct post-change total is **76**.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify) — 7 new `STORY_EDGE_TYPES` entries
- `tools/world-index/src/parse/atomic.ts` (modify) — emission for STSEC ×2 (one cross-namespace), OBL ×2, CNSQ (new node_type case), THR, STCHAR
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify) — positive fixtures for six YAML story-record edge types
- `tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts` (modify) — `stchar_superseded_by` positive hybrid fixture
- `tools/world-index/tests/types.test.ts` (modify) — `STORY_EDGE_TYPES.length` 69 → 76 and `EDGE_TYPES.length` 84 → 91
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify) — story edge registry count 69 → 76
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify) — story edge registry count 69 → 76
- `docs/MACHINE-FACING-LAYER.md` (modify) — edge-catalog subsection + total reconciliation (65→76)

## Out of Scope

- `obligation_derived_from` — OBL has no `derived_from` field (closed schema); not an edge.
- Edges for the four non-indexed field groups (`STSTAT.location`, `STOBJ.owner`/`current_location`, `STLOC.bound_ent`, `CLK.thresholds[].effects`) — deferred until a consumer exists; documented in SPEC67STOWORIND-002.
- A `world_index_edge_parity` registry-driven meta-test — rejected with the registry framework in SPEC-65; per-edge positive fixtures are the proportionate guard.
- Any DB migration (the `edge_type` column is unconstrained `TEXT`).
- Adding the new edges to `LOCAL_CONTEXT_EDGE_TYPES` (world-mcp scoped-local-context) — that curated subset is out of the SPEC-67 consumer set.

## Acceptance Criteria

### Tests That Must Pass

1. `STORY_EDGE_TYPES` contains all 7 new edge types and `.length === 76` (`tools/world-index/tests/types.test.ts`).
2. Each new edge type has a passing positive fixture; the `secret_protected_mystery` fixture asserts an unprefixed `M-<n>` target.
3. Full world-index build + test pass: `npm run build --prefix tools/world-index && npm test --prefix tools/world-index`.

### Invariants

1. `secret_protected_mystery` targets a world-canon `M-*` node with no `<slug>:` prefix; the six story-local edges target slug-scoped story records.
2. `obligation_owed_by`/`obligation_owed_to` emit only for `STENT-<integer>` values; `group:<name>`/`public`/`null` are skipped.
3. No emit path resolves or narrows any Mystery Reserve `M` entry (Rule 7); edges are read-only graph structure.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — positive fixtures for `secret_protected_mystery`, `secret_source_record`, `obligation_owed_by`, `obligation_owed_to`, `consequence_derived_from`, and `thread_derived_from`; the cross-namespace fixture asserts unprefixed `M-` target.
2. `tools/world-index/tests/parse/atomic-edges-for-story-character-authority.test.ts` — positive fixture for `stchar_superseded_by`.
3. `tools/world-index/tests/types.test.ts` — count assertions 69 → 76 for `STORY_EDGE_TYPES` and 84 → 91 for aggregate `EDGE_TYPES`.
4. `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` and `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` — count assertions 69 → 76.

### Commands

1. `npm run build --prefix tools/world-index && node --test tools/world-index/dist/tests/story-bundle-edges.test.js` — targeted fixture verification.
2. `npm run build --prefix tools/world-index && npm test --prefix tools/world-index` — full-package verification (build is required because `test` runs against compiled `dist/tests/**`).
3. `grep -n "secret_protected_mystery\|secret_source_record\|obligation_owed_by\|obligation_owed_to\|consequence_derived_from\|thread_derived_from\|stchar_superseded_by" tools/world-index/src/schema/types.ts` — confirms 7 registered entries.

## Outcome

Completed 2026-05-21.

- Added seven additive `STORY_EDGE_TYPES`: `secret_protected_mystery`, `secret_source_record`, `obligation_owed_by`, `obligation_owed_to`, `consequence_derived_from`, `thread_derived_from`, and `stchar_superseded_by`.
- Emitted the six story-local-target edges through existing story-ref guards and emitted `secret_protected_mystery` as an unprefixed world-canon `M-*` target.
- Added parser fixtures for the new edges, updated edge-count assertions to 76 story edges / 91 total edges, and updated `docs/MACHINE-FACING-LAYER.md` with the SPEC-67 edge catalog rows.

## Verification Result

- `npm run build` from `tools/world-index` — PASS.
- `node --test dist/tests/story-bundle-edges.test.js dist/tests/parse/atomic-edges-for-story-character-authority.test.js dist/tests/types.test.js` from `tools/world-index` — PASS, 27 tests.
- First `npm test` from `tools/world-index` exposed two stale same-seam integration count assertions still expecting 69 story edge types; those were updated to 76.
- Final `npm test` from `tools/world-index` — PASS, 130 tests.

## Deviations

- The drafted fixture location was narrowed: the `STCHAR.superseded_by` positive fixture belongs with the existing hybrid STCHAR parser test, not `story-bundle-edges.test.ts`.
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` needed no edit; the full package suite covered the registered-edge parity after the new fixture emissions.
