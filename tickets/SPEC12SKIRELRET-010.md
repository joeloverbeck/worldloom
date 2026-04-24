# SPEC12SKIRELRET-010: Live-corpus proof on animalia + integration capstone

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — frontmatter-only edits to three `worlds/animalia/` records (Phase 1 hand-edit carve-out per SPEC-12 D7); adds integration test at `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` that enumerates SPEC-12 §Verification bullets 1-15 as test sub-cases.
**Deps**: SPEC12SKIRELRET-009

## Problem

Per SPEC-12 D7, implementation is not complete until the live `animalia` corpus passes a production truth-check under a realistic skill budget: `find_named_entities` must surface Melissa canonically and `Mudbrook`/`Rill`/`Aldous`/`Bertram`/`Copperplate`/`Harrowgate`/`Charter Hall of Harrowgate` through canonical or scoped tiers; `get_neighbors` for Melissa and DA-0002 must expose exact record links and source-local references matching the raw documents; `get_context_packet` for Melissa and DA-0002 must return a truthful v2 packet without dropping seed-local anchors. This ticket repairs the three affected records (adding the `aliases: [Melissa Threadscar]` entry on Melissa and `scoped_references` blocks on all three), re-indexes animalia, and captures the §Verification output as an integration test. This is the spec-integration capstone per the skill's §Spec-Integration Ticket Shape.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `worlds/animalia/characters/melissa-threadscar.md:1-10` has `name: "Threadscar" Melissa` (quoted-nickname-first canonical form) and no `aliases` entry nor `scoped_references` block. Repair: add `aliases: [Melissa Threadscar]` (so the unquoted-form probe resolves canonically) and a `scoped_references` block naming `Mudbrook-on-the-Bend` / `Rill` / `Aldous` / `Bertram` / `Registrar Copperplate` per her existing prose (`Major local pressures` and `Institutional Embedding` sections).
2. `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md:1-50` has `author_character_id: CHAR-0002` (already satisfied by ticket 003's structured adapter) but no `scoped_references` block. Repair: add a `scoped_references` block naming `Harrowgate`, `Charter Hall of Harrowgate`, `Upper Drynn`, `Stone-Fork`, `Long Board tavern` per existing artifact prose. `worlds/animalia/characters/vespera-nightwhisper.md` is assumed to have similar shape (not re-read here; ticket reviewer should confirm during implementation); repair: add `scoped_references` block covering names she shares with Melissa (Mudbrook, Rill, Aldous) plus any locally-load-bearing names in her prose (Common Pantheon, First Cat tradition if they map cleanly to scoped-reference semantics).
3. Cross-artifact contract under audit: this ticket edits three authority-bearing world-level files. Per SPEC-12 D7 Phase 1 write carve-out, direct `Edit`/`Write` is permitted because Hook 3 (engine-only mutation guard) is Phase 2 work per `specs/SPEC-05-hooks-discipline.md` §Part B; in Phase 1 the patch engine is not yet wired. Phase 2 will route equivalent future edits through patch plans; this corpus repair is a one-time Phase 1 action documented in the spec's D7 and repeated here for audit-trail clarity.
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) enforcement surface under audit: each scoped-reference entry added in this ticket must not silently resolve any Mystery Reserve entry (M-1 through M-18 in animalia). Repair entries are local persons / places / institutions explicitly named in the records' prose — no new ontological commitments, no silent MR resolutions. Verification: manual review of each added entry against `worlds/animalia/MYSTERY_RESERVE.md`'s M-NNN list to confirm zero overlap.

## Architecture Check

1. Restricting corpus edits to the three records named in SPEC-12 D7 keeps the change scope bounded — §Backfill policy explicitly requires incremental authoring only (no batch migration).
2. A single integration test (`spec12-live-corpus.test.ts`) runs §Verification bullets 1-15 end-to-end, producing a reproducible pass/fail signal that can be re-run after subsequent canon growth to detect regression.
3. Fixture-world copy strategy (via `fs.cpSync` to a temp root at test start) keeps the real `worlds/animalia/_index/` untouched and makes the test re-runnable without requiring a clean working tree.
4. Re-enumerated expected counts (computed from fixture at test start, not hardcoded) stay valid over time as canon grows.
5. No backwards-compatibility aliasing.

## Verification Layers

1. Frontmatter YAML parses cleanly after edits -> schema validation (`world-index build animalia` succeeds without `malformed_authority_source` validation results).
2. Aliases and scoped_references entries reference names/phrases already present in each record's prose (no new facts) -> manual review.
3. `world-index build animalia` emits non-zero `scoped_references` row count -> SQL query after rebuild.
4. `find_named_entities(["Melissa Threadscar"])` returns a `canonical_matches` row resolving to CHAR-0002 via alias match -> MCP query.
5. `find_named_entities(["Mudbrook", "Rill", "Aldous", "Bertram", "Copperplate", "Harrowgate", "Charter Hall of Harrowgate"])` returns ≥1 row per query across `canonical_matches` + `scoped_matches` (never only `surface_matches`) -> MCP query.
6. `get_neighbors("<melissa-node-id>")` includes neighbors via `references_scoped_name` edges -> MCP query.
7. `get_neighbors("DA-0002")` includes CHAR-0002 via a `references_record` edge -> MCP query.
8. `get_context_packet({task_type: "character_generation", seed_nodes: ["CHAR-0002"], token_budget: 8000})` returns a v2 packet with non-empty `local_authority`, `exact_record_links`, `scoped_local_context` classes -> MCP query + shape assertion.
9. §Rule 7 firewall preserved: no new Mystery Reserve resolutions introduced by any added entry -> manual review against `MYSTERY_RESERVE.md`.

## What to Change

### 1. Edit `worlds/animalia/characters/melissa-threadscar.md` (frontmatter only)

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

### 4. Re-index animalia

After the three edits:

```bash
rm -rf worlds/animalia/_index
pnpm --filter @worldloom/world-index run cli build animalia
```

This forces a clean rebuild (cache-invalidation-safe).

### 5. Add integration test `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts`

Test fixture-world shape:

- At test start, copy `worlds/animalia/` to a temp root via `fs.cpSync` (parallel to the spec-integration fixture-copy strategy called out in the spec-to-tickets skill).
- Run `world-index build` against the temp root.
- Enumerate expected counts from the fixture frontmatter at test start (not hardcoded).

Assertion matrix — one assertion per SPEC-12 §Verification bullet:

- Structural 1-6: `scoped_references` + `scoped_reference_aliases` tables present; `nodes.node_type='scoped_reference'` present; `references_record` + `references_scoped_name` edges emitted without widening `mentions_entity`; `scoped_matches`, `structured_links`, v2 packet error code present; ranking orders scoped + structured above lexical; `search_nodes` filters exist.
- Functional 7-12: DA-0002 author_character_id adapter hit; fixture char with scoped_references produces scoped_matches without canonical rows; `find_named_entities` preserves the canonical-vs-scoped-vs-surface split; `get_context_packet` returns `packet_incomplete_required_classes` under tight budget; `search_nodes` exposes `match_basis` and ranks authority ahead of lexical; `find_impacted_fragments` does NOT traverse new edges.
- Live-corpus 13-15: animalia queries for Melissa, Vespera, DA-0002, Mudbrook, Rill, Aldous, Bertram, Copperplate, Harrowgate, Charter Hall of Harrowgate all resolve through canonical/scoped/structured tiers; Melissa + DA-0002 `get_context_packet` returns truthful packets under realistic skill budget.

### 6. Do not commit

Per skill guardrails, leave edits and the new test for user review. User commits the diff after reviewing.

## Files to Touch

- `worlds/animalia/characters/melissa-threadscar.md` (modify — frontmatter only)
- `worlds/animalia/characters/vespera-nightwhisper.md` (modify — frontmatter only)
- `worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md` (modify — frontmatter only)
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
2. `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references WHERE world_slug='animalia'"` returns ≥ 10 (five per Melissa + five per DA-0002 at minimum; Vespera adds more).
3. `find_named_entities({names: ["Melissa Threadscar"]})` returns a row in `canonical_matches` with `match_kind='alias'` resolving to CHAR-0002's entity_id.
4. `find_named_entities({names: ["Mudbrook", "Rill", "Aldous", "Bertram", "Copperplate", "Harrowgate", "Charter Hall of Harrowgate"]})` returns at least one match per query across `canonical_matches` ∪ `scoped_matches` (no query resolves only via `surface_matches`).
5. `get_neighbors({node_id: "<melissa-node-id>"})` returns at least one neighbor reached via a `references_scoped_name` edge.
6. `get_neighbors({node_id: "DA-0002"})` returns CHAR-0002 via a `references_record` edge.
7. `get_context_packet({task_type: "character_generation", world_slug: "animalia", seed_nodes: ["CHAR-0002"], token_budget: 8000})` returns a v2 packet with `local_authority.nodes.length > 0`, `exact_record_links.nodes.length > 0` OR `scoped_local_context.nodes.length > 0`, AND `packet_version === 2`.
8. `pnpm --filter @worldloom/world-mcp test tests/integration/spec12-live-corpus.test.ts` passes all 15 §Verification assertions.
9. `pnpm -r test` passes.

### Invariants

1. World canon (`CANON_LEDGER.md`, `INVARIANTS.md`, `ONTOLOGY.md`, and other mandatory world files) is NOT touched by this ticket.
2. `ONTOLOGY.md`'s Named Entity Registry is unchanged; no scoped reference added here is promoted to canonical entity status.
3. Mystery Reserve firewall preserved: every added scoped-reference entry verified against animalia's M-1..M-18 list to confirm zero silent resolutions.
4. The three repaired records' prose bodies are byte-identical before/after (only frontmatter sections change).
5. `find_impacted_fragments` traversal unchanged (canonical-only); re-verified via the integration test's Functional bullet 12.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` — full integration assertion suite covering SPEC-12 §Verification bullets 1-15.

### Commands

1. `rm -rf worlds/animalia/_index`
2. `pnpm --filter @worldloom/world-index run cli build animalia`
3. `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM scoped_references WHERE world_slug='animalia'"` (expect ≥ 10)
4. `pnpm --filter @worldloom/world-mcp test tests/integration/spec12-live-corpus.test.ts`
5. `pnpm -r test`
