# SPEC10ENTSUR-008: Fresh-rebuild + verification capstone on `animalia`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — add a `tools/world-index` capstone verification script plus one package `npm run` entry to execute the SPEC-10 shell-level acceptance surface against rebuilt `animalia`.
**Deps**: SPEC10ENTSUR-001

## Problem

SPEC-10 §Verification names seven acceptance behaviors the rebuilt `animalia` index must exhibit after the entity-surface redesign ships: (1) fresh rebuild + verify succeed, (2) post-migration schema shape is the three-surface set, (3) SPEC-01-020..025 false-positive classes no longer materialize as canonical `named_entity` rows, (4) structured anchors (ONTOLOGY, character, artifact) remain canonical, (5) exact-phrase retrieval still returns noncanonical evidence, (6) `find_impacted_fragments`-shaped queries over `mentions_entity` no longer depend on unresolved heuristic phrases, (7) no per-string stoplist expansion is needed for currently-reproduced residual fragments. Upstream tickets -001 through -006 each prove a slice of this; none proves the composition. A capstone spec-integration ticket exists precisely to run the live-corpus composition check and surface regressions that would otherwise hide in per-ticket green-ness.

## Assumption Reassessment (2026-04-23)

1. `worlds/animalia/` is the live reference corpus and `tools/world-index/src/cli.ts` still exposes `build` and `verify`. No existing `tools/world-index` capstone script or package-script entry covered SPEC-10's shell-level composition check, so the ticket's owned delta remained real.
2. `specs/SPEC-10-entity-surface-redesign.md` `## Verification` is the authoritative acceptance matrix for this ticket. The new capstone script maps each spec bullet to a concrete assertion over rebuilt `worlds/animalia/_index/world.db`.
3. Shared boundary under audit: the rebuilt `animalia` index artifact, the `tools/world-index` package entrypoint surface, and the SPEC-10 verification prose. This ticket owns only the shell-level composition proof; it does not reopen the underlying entity-surface implementation from `SPEC10ENTSUR-001`.
4. `docs/FOUNDATIONS.md` `Tooling Recommendation` requires canon consumers to operate against structured world state rather than raw prose. The capstone proves that separation directly by asserting the canonical `entities` surface, the recall-oriented `entity_mentions` surface, and the canonical-only graph edge behavior against the live rebuilt corpus.
5. `archive/tickets/SPEC10ENTSUR-001.md` still truthfully leaves `SPEC10ENTSUR-008` active as a separate shell-level capstone beyond the passing integration-test surface, so no sibling absorption was required here.
6. The package-local runtime probe needed to execute from `tools/world-index`, not repo root, because `better-sqlite3` resolves from the package's local dependencies. The script was corrected to keep the DB probe package-local while still targeting the rebuilt repo-level `animalia` artifact.

## Architecture Check

1. A single capstone ticket with `Deps: SPEC10ENTSUR-001` is cleaner than enumerating `Deps: 001, 002, 003, 004, 005, 006, 007`. `SPEC10ENTSUR-001` is now the truthful owner of the landed entity-surface seam after absorbing `003` through `006`, so a single dependency is sufficient.
2. No backwards-compatibility aliasing: the capstone's commands are copy-paste of SPEC-10's §Verification commands, with zero reinterpretation.

## Verification Layers

1. Fresh build succeeds cleanly on `animalia`. -> `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js build animalia` exits 0, run by the capstone script.
2. Fresh verify succeeds on `animalia`. -> `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js verify animalia` exits 0, run by the capstone script.
3. Post-migration schema shape: `entities`, `entity_aliases`, and redesigned `entity_mentions` exist with the right columns and indexes. -> readonly DB introspection inside `tools/world-index/tests/integration/spec10-verification.sh`.
4. SPEC-01-020..025 false-positive classes: zero canonical `entities.canonical_name` rows match the consolidated banned phrase set. -> readonly DB query inside the capstone script.
5. Structured-anchor retention: `Vespera Nightwhisper`, `Atreia Selviss`, and two known diegetic-artifact titles remain canonical. -> readonly DB query inside the capstone script.
6. Noncanonical evidence retrieval: `Melissa Threadscar`, `Charter Hall`, `Copper Weir`, and `Bent Willow` remain unresolved evidence only, with zero canonical entities and zero `mentions_entity` edges. -> readonly DB query inside the capstone script.
7. Mystery Reserve firewall: zero canonical entities whose `canonical_name` equals any rebuilt Mystery Reserve entry title on `animalia`. -> readonly DB query inside the capstone script.

## What to Change

### 1. No code; assemble a capstone verification script

Create `tools/world-index/tests/integration/spec10-verification.sh` (or embed as a scripted acceptance-command sequence in this ticket — prefer the sh file because it can re-run during regression sweeps). The script:

1. Runs `cd tools/world-index && npm run build`.
2. Runs `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js build animalia` (exit 0 required).
3. Runs `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js verify animalia` (exit 0 required).
4. Runs an embedded Node command against `worlds/animalia/_index/world.db` (readonly) that emits a single JSON document containing:
   - `tables` — sorted list of user tables (must include `entities`, `entity_aliases`, `entity_mentions`).
   - `indexes` — sorted list of user indexes (must include `idx_entities_name`, `idx_entities_scope`, `idx_entity_alias_unique`, `idx_entity_alias_text`, `idx_entity_mentions_surface`, `idx_entity_mentions_resolved`).
   - `banned_canonicals` — per-phrase count from `entities.canonical_name` for the SPEC-01-020..025 banned list (each must be `0`).
   - `kept_canonicals` — per-phrase count for the structured-anchor list (each must be `≥1`).
   - `noncanonical_evidence` — counts for `Copper Weir`, `Charter Hall`, `Melissa Threadscar`, and `Bent Willow` in `entity_mentions WHERE resolution_kind='unresolved'`, and zero canonical `named_entity` rows for those phrases.
   - `mystery_reserve_firewall` — zero canonical entities whose `canonical_name` equals any Mystery Reserve entry title.
   - `validation_results` count, `unresolved_edges` count, `dangling_entity_mentions` count, `dangling_edge_sources` count, `dangling_edge_targets` count — each must be `0`.
5. The script exits `0` only when every assertion holds; otherwise `1` with a diagnostic message naming the failing slice.

### 2. Wire the script into the integration-test bundle

Add a single `npm run` script entry in `tools/world-index/package.json` — `test:spec10-verification` — pointing at the script. This makes the capstone runnable both from the ticket's acceptance commands and from future regression sweeps.

### 3. Do not re-enumerate expected-count numeric gates

Per the skill's spec-integration guidance, the script re-enumerates expected sets from the corpus at run time (banned list is a constant from SPEC-01-020..025; kept list is derived from the rebuilt corpus as a subset check). No hardcoded total counts. No wall-clock perf gate — SPEC-10 does not specify one.

## Files to Touch

- `tools/world-index/tests/integration/spec10-verification.sh` (new)
- `tools/world-index/package.json` (modify — add one `scripts` entry)

## Out of Scope

- Any production-code change — upstream tickets -001 through -006 own that
- SPEC-02 documentation (SPEC10ENTSUR-007)
- Performance tuning or benchmark comparison — SPEC-10 names no perf gate
- Retroactively running the capstone against pre-redesign `animalia` indices — the capstone is forward-looking

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm run test:spec10-verification` — exits 0, emits the required JSON, every assertion holds.
3. `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js build animalia` — exit 0.
4. `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli.js verify animalia` — exit 0.

### Invariants

1. Every SPEC-10 §Verification bullet corresponds to at least one assertion in the capstone script.
2. The capstone never mutates `worlds/animalia/` content or canon; it only reads rebuilt index state.
3. Banned-canonical and kept-canonical lists are the same lists used in SPEC10ENTSUR-001's `tests/integration/build-animalia.test.ts` coverage. Divergence between the two surfaces is a regression to fix before this ticket accepts.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/spec10-verification.sh` — new. Composes every upstream ticket's work into a single live-corpus acceptance run.
2. `tools/world-index/package.json` — modified. Adds `test:spec10-verification` so the capstone is rerunnable in package-local regression sweeps.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm run test:spec10-verification`
3. Narrower command scope: the capstone itself IS the full-pipeline verification boundary for SPEC-10; running per-test-file commands is the right iteration loop during implementation of -001 through -006, but the capstone is the ticket-acceptance gate.

## Outcome

- **Completion date**: 2026-04-23
- **What changed**: Added `tools/world-index/tests/integration/spec10-verification.sh` and wired `tools/world-index/package.json` with `npm run test:spec10-verification`. The new capstone rebuilds and verifies `animalia`, then emits a single JSON report asserting the SPEC-10 verification surface: required schema tables/indexes/columns, banned canonical false positives absent, structured anchors retained, unresolved evidence preserved without canonical promotion or `mentions_entity` edges, Mystery Reserve titles blocked from canonical promotion, and zero integrity/dangling-reference counts.
- **Deviations from original plan**: The first draft of the capstone script launched its inline Node DB probe from repo root, which broke package-local `better-sqlite3` resolution. The landed script now runs the probe from `tools/world-index` while still reading the rebuilt repo-level `worlds/animalia/_index/world.db`, which is the truthful command shape for this package-local verification surface.
- **Verification results**:
  1. Ran `cd tools/world-index && npm run build`
  2. Ran `cd tools/world-index && npm run test:spec10-verification`
  3. Confirmed the capstone script internally ran `node tools/world-index/dist/src/cli.js build animalia` and `node tools/world-index/dist/src/cli.js verify animalia` successfully before the DB assertions
