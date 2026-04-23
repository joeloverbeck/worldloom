# SPEC10ENTSUR-008: Fresh-rebuild + verification capstone on `animalia`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — this ticket exercises the pipeline landed via SPEC10ENTSUR-001, including the work originally drafted in SPEC10ENTSUR-003 through -006. It introduces no new production code; its acceptance surface is the spec §Verification bullets run end-to-end against the live `animalia` corpus.
**Deps**: SPEC10ENTSUR-001

## Problem

SPEC-10 §Verification names seven acceptance behaviors the rebuilt `animalia` index must exhibit after the entity-surface redesign ships: (1) fresh rebuild + verify succeed, (2) post-migration schema shape is the three-surface set, (3) SPEC-01-020..025 false-positive classes no longer materialize as canonical `named_entity` rows, (4) structured anchors (ONTOLOGY, character, artifact) remain canonical, (5) exact-phrase retrieval still returns noncanonical evidence, (6) `find_impacted_fragments`-shaped queries over `mentions_entity` no longer depend on unresolved heuristic phrases, (7) no per-string stoplist expansion is needed for currently-reproduced residual fragments. Upstream tickets -001 through -006 each prove a slice of this; none proves the composition. A capstone spec-integration ticket exists precisely to run the live-corpus composition check and surface regressions that would otherwise hide in per-ticket green-ness.

## Assumption Reassessment (2026-04-22)

1. `worlds/animalia/` is the reference corpus and is present on disk. `tools/world-index/src/cli.ts` exposes `build` and `verify` commands. `SPEC10ENTSUR-001`'s absorbed test rewrite already exercises much of this through `tests/integration/build-animalia.test.ts`; the capstone's job is to enforce that the composition holds via shell-level invocations that match the spec's own §Verification bullet text verbatim.
2. `specs/SPEC-10-entity-surface-redesign.md` §Verification is the authoritative test matrix for this ticket. Each bullet maps to one capstone acceptance criterion.
3. Shared boundary under audit: the rebuilt `worlds/animalia/_index/world.db` plus the prose text of SPEC-10 §Verification. The capstone binds the two: rebuilt DB shape must satisfy every §Verification bullet, and any drift between them is a regression caught at this ticket's acceptance gate.
4. `docs/FOUNDATIONS.md` §Tooling Recommendation requires canon consumers to operate against structured world state, not raw prose. The capstone verifies that the redesigned entity surface delivers that: `entities` exists as the structured canonical source; `entity_mentions` exists as the recall-oriented evidence source; they are queryable independently.
5. Mystery Reserve firewall (§Rule 7): `tests/integration/build-animalia.test.ts` (rewritten under SPEC10ENTSUR-001's absorbed seam) already encodes the zero-MR-as-canonical assertion. The capstone additionally runs a freestanding shell-level query as a belt-and-suspenders check — the rewritten test + the capstone command together guarantee the firewall holds after every rebuild, not just after the one rebuild `node --test` happens to run.

## Architecture Check

1. A single capstone ticket with `Deps: SPEC10ENTSUR-001` is cleaner than enumerating `Deps: 001, 002, 003, 004, 005, 006, 007`. `SPEC10ENTSUR-001` is now the truthful owner of the landed entity-surface seam after absorbing `003` through `006`, so a single dependency is sufficient.
2. No backwards-compatibility aliasing: the capstone's commands are copy-paste of SPEC-10's §Verification commands, with zero reinterpretation.

## Verification Layers

1. Fresh build succeeds cleanly on `animalia`. -> `node tools/world-index/dist/src/cli.js build animalia` exits 0.
2. Fresh verify succeeds on `animalia`. -> `node tools/world-index/dist/src/cli.js verify animalia` exits 0.
3. Post-migration schema shape: `entities`, `entity_aliases`, and redesigned `entity_mentions` exist with the right columns and indexes. -> readonly DB introspection command.
4. SPEC-01-020..025 false-positive classes: zero `named_entity` rows whose canonical name matches the union of audit-record banned phrases. -> readonly DB query.
5. Structured-anchor retention: `Vespera Nightwhisper`, `Atreia Selviss`, and at least two known diegetic-artifact titles are canonical. -> readonly DB query filtered by `entities.provenance_scope`.
6. Noncanonical evidence retrieval: `Copper Weir` OR `Charter Hall` (prose-only) returns ≥1 `entity_mentions` row with `resolution_kind='unresolved'`, AND zero `mentions_entity` edges reference them. -> readonly DB query.
7. Mystery Reserve firewall: zero canonical entities whose `canonical_name` equals any Mystery Reserve entry's title on `animalia`. -> readonly DB query.

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

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm run test:spec10-verification`
3. Narrower command scope: the capstone itself IS the full-pipeline verification boundary for SPEC-10; running per-test-file commands is the right iteration loop during implementation of -001 through -006, but the capstone is the ticket-acceptance gate.
