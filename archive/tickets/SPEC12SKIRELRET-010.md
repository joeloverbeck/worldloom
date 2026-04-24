# SPEC12SKIRELRET-010: Live-corpus proof on animalia + integration capstone

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — frontmatter-only edits to three `worlds/animalia/` records (Phase 1 hand-edit carve-out per SPEC-12 D7); adds integration test at `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts`; updates `tools/world-index/tests/integration/build-animalia.test.ts` to remove the now-stale malformed-Melissa expectation; updates `tools/world-index/src/commands/verify.ts` so derived `scoped_reference` rows are not misclassified as drift.
**Deps**: SPEC12SKIRELRET-009

## Problem

Per SPEC-12 D7, implementation is not complete until the live `animalia` corpus passes a production truth-check under a realistic skill budget. The shared retrieval substrate from SPEC-12 already landed in `tools/world-index` / `tools/world-mcp`; the remaining delta is corpus truthing plus the missing live-corpus capstone proof. Melissa's dossier still has malformed authority-bearing frontmatter, preventing canonical entity emission and blocking DA-0002's `author_character_id` structured edge from resolving to Melissa's record; Melissa, Vespera, and DA-0002 also still lack the scoped-reference metadata required for locality-first retrieval. This ticket repairs those three records, updates the stale animalia build expectation that still hardcodes Melissa's malformed state, and captures the live-corpus proof as an integration test.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `worlds/animalia/characters/melissa-threadscar.md:1-10` was not merely missing aliases/scoped references; its `name: "Threadscar" Melissa` line was malformed YAML in the live file. After repair to a valid YAML scalar plus the added alias/scoped-reference block, Melissa now emits the canonical entity `entity:threadscar-melissa`, her character record node resolves to `CHAR-0002`, and DA-0002's `author_character_id: CHAR-0002` structured edge resolves to that record node.
2. `worlds/animalia/characters/vespera-nightwhisper.md` and `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md` both parse cleanly but currently expose no `scoped_references` block, so the live index only contains the structured-edge scoped rows (`23` total after rebuild) and none of the local-anchor rows this ticket is meant to add.
3. Cross-artifact contract under audit: this ticket edits three authority-bearing world-level files and proves the change through `tools/world-index` / `tools/world-mcp` consumers. Per SPEC-12 D7 Phase 1 write carve-out, direct `Edit`/`Write` is permitted because Hook 3 (engine-only mutation guard) is Phase 2 work per `specs/SPEC-05-hooks-discipline.md` §Part B; in Phase 1 the patch engine is not yet wired.
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) enforcement surface under audit: each scoped-reference entry added in this ticket must remain grounded in names already present in the source records' prose/frontmatter and must not silently resolve any Mystery Reserve entry in `worlds/animalia/MYSTERY_RESERVE.md`.
5. The drafted rebuild command is stale in the live repo: `@worldloom/world-index` has no `cli` package script. The truthful producer lane is `pnpm --filter @worldloom/world-index build` followed by `node tools/world-index/dist/src/cli.js build animalia` from the repo root (or equivalent in a temp-copy integration harness).
6. The drafted proof text overstated node-id shape during reassessment because Melissa's malformed frontmatter forced a fallback path-style whole-file node id. After the fix, the truthful live record node is `CHAR-0002`; acceptance and integration proof now use that rebuilt node id.
7. Same-seam fallout: `tools/world-index/tests/integration/build-animalia.test.ts` hardcoded Melissa's malformed-frontmatter warning as expected live animalia behavior, and its source-derived count helper omitted derived `scoped_reference` nodes. Both expectations had to be updated here to keep the copied-world build proof truthful.
8. Same-seam fallout: `tools/world-index/src/commands/verify.ts` previously ignored derived `named_entity` rows but not derived `scoped_reference` rows, so `verify(root, "animalia")` falsely reported drift after the corpus repair. The verifier now excludes both derived node types from parser-vs-index drift comparison.

## Architecture Check

1. Restricting corpus edits to the three records named in SPEC-12 D7 keeps the world-level change bounded while still fixing the actual live-corpus blockers: Melissa's malformed authority frontmatter and the missing scoped-reference declarations on the three records.
2. The capstone proof should exercise the live corpus through temp-copy rebuilds and real MCP tool calls, not through new parser-only fixtures. That preserves truthful regression coverage for the production seam this ticket exists to harden.
3. Updating the existing animalia build integration expectation in `tools/world-index/tests/integration/build-animalia.test.ts` is cleaner than leaving a known-false malformed warning as a legacy expectation beside the new capstone.
4. No backwards-compatibility aliasing.

## Verification Layers

1. Frontmatter YAML parses cleanly after edits -> schema validation (rebuilt animalia index contains no `malformed_authority_source` row for Melissa).
2. Aliases and scoped_references entries reference names/phrases already present in each record's prose (no new facts) -> manual review.
3. Rebuilt animalia index emits the expected corpus-local scoped-reference rows beyond the pre-existing structured-edge rows -> SQL query after rebuild.
4. `find_named_entities(["Melissa Threadscar"])` returns a `canonical_matches` alias row for Melissa's character entity instead of falling back to unresolved surface evidence -> MCP query.
5. `find_named_entities(["Mudbrook", "Rill", "Aldous", "Bertram", "Copperplate", "Harrowgate", "Charter Hall of Harrowgate"])` returns ≥1 row per query across `canonical_matches` + `scoped_matches` (never only `surface_matches`) -> MCP query.
6. `get_neighbors("CHAR-0002")` includes neighbors via `references_scoped_name` edges -> MCP query.
7. `get_neighbors("DA-0002")` includes Melissa's record node via a resolved `references_record` edge -> MCP query.
8. `get_context_packet({task_type: "character_generation", seed_nodes: ["CHAR-0002"], token_budget: 8000})` returns the structured insufficiency shape the live assembler currently promises, retaining locality-first classes rather than dropping local anchors -> MCP query + shape assertion.
9. §Rule 7 firewall preserved: no new Mystery Reserve resolutions introduced by any added entry -> manual review against `MYSTERY_RESERVE.md`.

## What to Change

### 1. Edit `worlds/animalia/characters/melissa-threadscar.md` (frontmatter only)

- Repair the malformed `name` line to a valid YAML scalar while preserving Melissa's quoted-nickname-first canonical form.
- Add `aliases: [Melissa Threadscar]` as a new key alongside the existing `name` field.
- Add a `scoped_references` block:
  - `Mudbrook-on-the-Bend` — kind `place`, relation `current_location`, aliases `[Mudbrook]`
  - `Rill` — kind `person`, relation `apprentice_candidate`
  - `Aldous` — kind `person`, relation `professional_associate`
  - `Bertram` — kind `person`, relation `gearfitter`, aliases `[Bertram the Muddy]`
  - `Registrar Copperplate` — kind `person`, relation `local_official`, aliases `[Copperplate]`
- Do NOT alter prose body, `canon_facts_consulted`, `invariants_respected`, or `mystery_reserve_firewall`.

### 2. Edit `worlds/animalia/characters/vespera-nightwhisper.md` (frontmatter only)

- Add a `scoped_references` block covering names already in her prose that map cleanly to scoped-reference semantics (person / place / institution / tradition). Candidate entries (confirm each against her actual prose during implementation):
  - `Mudbrook` — kind `place`, relation `current_location`
  - `Melissa` — kind `person`, relation `close_associate`, aliases `[Threadscar, "Threadscar" Melissa]`
  - `Rill` — kind `person`, relation `shared_apprentice_context`
  - `Aldous` — kind `person`, relation `professional_associate`
- Skip any candidate whose prose grounding is ambiguous. Do NOT alter prose body.

### 3. Edit `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md` (frontmatter only)

- Add a `scoped_references` block:
  - `Harrowgate` — kind `place`, relation `event_location`
  - `Charter Hall of Harrowgate` — kind `institution`, relation `filing_authority`
  - `Upper Drynn` — kind `place`, relation `regional_context`
  - `Stone-Fork` — kind `place`, relation `corridor_waypoint`
  - `Long Board tavern` — kind `institution`, relation `crew_vouch_site`
- Do NOT alter prose body, `claim_map`, `canon_links`, or `world_consistency`.

### 4. Update the existing animalia build integration expectation

- Patch `tools/world-index/tests/integration/build-animalia.test.ts` so the copied-world build no longer expects Melissa's malformed-frontmatter warning or treats `Melissa Threadscar` as permanently noncanonical-only evidence.

### 5. Add integration test `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts`

Test fixture-world shape:

- At test start, copy `worlds/animalia/` to a temp root via `fs.cpSync` (parallel to the spec-integration fixture-copy strategy called out in the spec-to-tickets skill).
- Build `tools/world-index` if needed, then run `node <repo>/tools/world-index/dist/src/cli.js build animalia` against the temp root.
- Use runtime probes against the rebuilt temp-copy index; do not hardcode counts whose truthful value can grow with future canon.

Assertion matrix — one assertion per SPEC-12 §Verification bullet:

- Structural 1-6: `scoped_references` + `scoped_reference_aliases` tables present; `nodes.node_type='scoped_reference'` present; `references_record` + `references_scoped_name` edges emitted without widening `mentions_entity`; `scoped_matches` and locality-first packet error shape present.
- Functional 7-12: DA-0002 `author_character_id` adapter resolves to Melissa's record after frontmatter repair; `find_named_entities` preserves the canonical-vs-scoped-vs-surface split; `get_context_packet` returns `packet_incomplete_required_classes` under the current tight-budget locality-first contract; `find_impacted_fragments` does NOT traverse the new edges.
- Live-corpus 13-15: animalia queries for Melissa, Mudbrook, Rill, Aldous, Bertram, Copperplate, Harrowgate, and Charter Hall of Harrowgate resolve through canonical/scoped/structured tiers; Melissa and DA-0002 neighbor/context queries retain the expected locality-first classes under realistic skill budget.

### 6. Do not commit

Per skill guardrails, leave edits and the new test for user review. User commits the diff after reviewing.

## Files to Touch

- `worlds/animalia/characters/melissa-threadscar.md` (modify — frontmatter only)
- `worlds/animalia/characters/vespera-nightwhisper.md` (modify — frontmatter only)
- `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md` (modify — frontmatter only)
- `tools/world-index/src/commands/verify.ts` (modify)
- `tools/world-index/tests/integration/build-animalia.test.ts` (modify)
- `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` (new)

## Out of Scope

- Prose body edits in any of the three records (frontmatter-only repair)
- Promotion of any scoped reference to world-level canonical entity in `ONTOLOGY.md` (explicitly forbidden by SPEC-12 §Out of Scope)
- Emission of new Canon Fact Records (no CF-NNNN allocation from this ticket)
- Corpus-wide backfill beyond the three named files (per SPEC-12 §Backfill policy — incremental authoring only)
- New animalia canon content (no new names, places, or institutions that aren't already present in prose)

## Acceptance Criteria

### Tests That Must Pass

1. `world-index build animalia` succeeds after the three edits, with zero `malformed_authority_source` validation results for the edited files.
2. `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references WHERE world_slug='animalia'"` returns a value greater than the pre-fix structured-edge-only baseline (`23` in the 2026-04-24 reassessment rebuild).
3. `find_named_entities({names: ["Melissa Threadscar"]})` returns a row in `canonical_matches` with `match_kind='alias'` and `canonical_name='"Threadscar" Melissa'`.
4. `find_named_entities({names: ["Mudbrook", "Rill", "Aldous", "Bertram", "Copperplate", "Harrowgate", "Charter Hall of Harrowgate"]})` returns at least one match per query across `canonical_matches` ∪ `scoped_matches` (no query resolves only via `surface_matches`).
5. `get_neighbors({node_id: "CHAR-0002"})` returns at least one neighbor reached via a `references_scoped_name` edge.
6. `get_neighbors({node_id: "DA-0002"})` returns `CHAR-0002` via a `references_record` edge.
7. `get_context_packet({task_type: "character_generation", world_slug: "animalia", seed_nodes: ["CHAR-0002"], token_budget: 8000})` returns `code === "packet_incomplete_required_classes"` with retained locality-first classes including `local_authority` and `scoped_local_context`.
8. `node --test dist/tests/integration/build-animalia.test.js` passes from `tools/world-index/`.
9. `node --test dist/tests/integration/spec12-live-corpus.test.js` passes from `tools/world-mcp/`.

### Invariants

1. World canon (`CANON_LEDGER.md`, `INVARIANTS.md`, `ONTOLOGY.md`, and other mandatory world files) is NOT touched by this ticket.
2. `ONTOLOGY.md`'s Named Entity Registry is unchanged; no scoped reference added here is promoted to canonical entity status.
3. Mystery Reserve firewall preserved: every added scoped-reference entry verified against animalia's M-1..M-18 list to confirm zero silent resolutions.
4. The three repaired records' prose bodies are byte-identical before/after (only frontmatter sections change).
5. `find_impacted_fragments` traversal unchanged (canonical-only); re-verified via the integration test's Functional bullet 12.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/build-animalia.test.ts` — copied-world animalia build remains truthful after Melissa frontmatter repair.
2. `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` — live-corpus integration assertion suite covering the repaired animalia retrieval seam.

### Commands

1. `pnpm --filter @worldloom/world-index build`
2. `node tools/world-index/dist/src/cli.js build animalia`
3. `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references WHERE world_slug='animalia'"` (expect `37`)
4. `cd tools/world-index && node --test dist/tests/integration/build-animalia.test.js`
5. `cd tools/world-mcp && node --test dist/tests/integration/spec12-live-corpus.test.js`

## Outcome

- Completion date: 2026-04-24.
- What actually changed: repaired Melissa's malformed frontmatter, added her explicit alias, and added scoped-reference blocks to Melissa, Vespera, and DA-0002 using only prose-grounded local anchors; restored Melissa to the canonical entity surface (`entity:threadscar-melissa`), which also let DA-0002's `author_character_id` structured edge resolve to `CHAR-0002`; updated the copied-world animalia build proof and the verifier's derived-node handling so the repaired corpus is truthfully accepted by the existing `world-index` lanes; added `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` as the live-corpus capstone proof.
- Deviations from original plan: live proof exposed same-seam fallout beyond the drafted corpus edits, so this ticket also updated `tools/world-index/tests/integration/build-animalia.test.ts` and `tools/world-index/src/commands/verify.ts` to keep the existing build and verify lanes truthful after the repaired corpus started emitting derived `scoped_reference` rows.
- Verification results: `pnpm --filter @worldloom/world-index build`; `node tools/world-index/dist/src/cli.js build animalia`; `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references WHERE world_slug='animalia'"` returned `37`; `node --test dist/tests/integration/build-animalia.test.js` from `tools/world-index/`; `pnpm --filter @worldloom/world-mcp build`; `node --test dist/tests/integration/spec12-live-corpus.test.js` from `tools/world-mcp/`.

## Verification Result

1. `pnpm --filter @worldloom/world-index build`
2. `node tools/world-index/dist/src/cli.js build animalia`
3. `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references WHERE world_slug='animalia'"` -> `37`
4. `node --test dist/tests/integration/build-animalia.test.js` (from `tools/world-index/`)
5. `pnpm --filter @worldloom/world-mcp build`
6. `node --test dist/tests/integration/spec12-live-corpus.test.js` (from `tools/world-mcp/`)
