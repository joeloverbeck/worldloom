# SPEC29LEGTOOVOC-005: Update documented MCP surface to drop retired vocabulary + arc_trace_record references

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No code changes; current documentation/spec/ticket prose updated to reflect the surface retirements landed in `archive/tickets/SPEC29LEGTOOVOC-001.md`, `archive/tickets/SPEC29LEGTOOVOC-002.md`, `archive/tickets/SPEC29LEGTOOVOC-003.md`, and `archive/tickets/SPEC29LEGTOOVOC-004.md`.
**Deps**: archive/tickets/SPEC29LEGTOOVOC-001.md, archive/tickets/SPEC29LEGTOOVOC-002.md, archive/tickets/SPEC29LEGTOOVOC-003.md, archive/tickets/SPEC29LEGTOOVOC-004.md

## Problem

At intake, three documentation files carried references to the seven retired vocabulary classes and to `arc_trace_record`. Those docs advertised an MCP surface that no longer exists:
- `docs/MACHINE-FACING-LAYER.md` — the `get_canonical_vocabulary` row (the line beginning at L80) enumerates all retired classes + per-class prose; the `list_records` row (preceding row in the same MCP-tools table) enumerates `arc_trace_record` in the supported record types + mentions "ARC_TRACE audit loads" in prose.
- `tools/world-mcp/README.md` — the drafted ticket expected stale `list_records` prose, but live reassessment found that row was already truthed by `archive/tickets/SPEC29LEGTOOVOC-002.md`; the `get_canonical_vocabulary` description still enumerated all retired classes + per-class prose.
- `tools/world-index/README.md` — line 16 (the CLI usage block) carried the `--arc-traces` flag in the `world-index render` command syntax; line 36 also advertised an `ARC_TRACE` public type surface; line 38 (the canonical-vocabularies export-surface paragraph) enumerated `commitment_family`, `commitment_class`, `COMMITMENT_CLASS_TO_FAMILY`, `commitmentFamilyForClass`, `arc_archetype` labels, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality**: each named line/row was verified at codebase validation 2026-05-15. The three documentation files are markdown prose; no machine consumer parses them as structured data (per SPEC-29 §Risks point 3: "Confirm at ticket time that the file's read pattern is just-prose"; verified by grep — no `.ts` file in `tools/` reads any of the three docs files programmatically).
2. **Spec/docs reality**: SPEC-29 §5 names only `docs/MACHINE-FACING-LAYER.md:80` (the `get_canonical_vocabulary` row), `tools/world-mcp/README.md`, and `tools/world-index/README.md`. Issue 4 from /spec-to-tickets Step 2 (2026-05-15) surfaced the additional `list_records` row references in `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md:19`, and the `--arc-traces` CLI flag mention in `tools/world-index/README.md:16`; live reassessment found the `tools/world-mcp/README.md` `list_records` row had already been truthed, while the `docs/MACHINE-FACING-LAYER.md` `list_records` row and `tools/world-index/README.md` render/public prose still required edits.
3. **Shared boundary under audit**: documentation prose ↔ MCP surface. Post-implementation, docs must match the surfaces in `tools/world-mcp/src/tools/list-records.ts`, `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`, and `tools/world-index/src/cli.ts` — verified by grep-proof at acceptance time. Per /spec-to-tickets §Cross-Cutting Docs Ticket Shape, `Deps` lists every upstream implementation ticket because each docs surface references a distinct implementation surface independently (no transitive-head dependency suffices — the `list_records` row references record types touched by `archive/tickets/SPEC29LEGTOOVOC-002.md` + `archive/tickets/SPEC29LEGTOOVOC-004.md`; the `get_canonical_vocabulary` row references classes touched by `archive/tickets/SPEC29LEGTOOVOC-001.md`; the `--arc-traces` CLI flag is touched by `archive/tickets/SPEC29LEGTOOVOC-004.md`; the canonical-vocabularies export prose references types touched by `archive/tickets/SPEC29LEGTOOVOC-001.md`).
4. **Documentation-only scope (per /spec-to-tickets §Cross-Cutting Docs Ticket Shape)**: this ticket touches markdown docs only — no production code, no tests. Acceptance is verified through grep-proofs against post-implementation state.
5. **Required same-seam docs fallout**: live `tools/world-index/src/public/types.ts` no longer exports any arc-trace row shape, but `tools/world-index/README.md` still advertised an `ARC_TRACE` public type surface. This is same README documentation parity fallout and was absorbed.
6. **Explicit SPEC-29 reference truthing**: the user supplied `specs/SPEC-29*` as authority. `archive/specs/SPEC-29-legacy-tools-vocabulary-cleanup.md` had current-state prose saying D5 remained active before it was archived; this ticket updates that note to completed while leaving older broad planning sections as historical context.
7. **Cross-surface guard correction**: the drafted broad grep over `tools/ docs/ .claude/skills/` is a discovery/classification proof, not a zero-hit proof. After current docs cleanup, remaining hits are historical `docs/plans/` / `docs/triage/` records and the retained `.claude/skills/_shared-templates/story-state-contract.md` prohibition text. No current source or public docs surface advertises the retired vocabulary or record class.

## Architecture Check

1. **Why this is cleaner than alternatives**: a single cross-cutting docs ticket gated by Deps on the four implementation tickets lands remaining docs edits in lockstep, post-implementation, eliminating any window during which current public docs advertise a retired surface. Per-implementation-ticket inline docs edits were considered and rejected (per /spec-to-tickets §Cross-Cutting Docs Ticket Shape "When NOT to use this shape"): the repo-level `list_records` row and the `get_canonical_vocabulary` rows use comma-joined enumerations that benefit from a single atomic docs cleanup.
2. **No backwards-compatibility shims**: no `// @deprecated`-tagged class names, no "still-documented-for-now" residue. The docs reflect the new surface.

## Verification Layers

1. **Invariant: zero retired-vocabulary or arc_trace tokens remain in the three docs surfaces** → `grep -nE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record|arc_trace_node|arc-traces|ARC_TRACE|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-index/README.md` returns no hits.
2. **Invariant: docs continue to enumerate the 11 surviving vocabulary classes** → manual review of the post-edit `get_canonical_vocabulary` enumeration in both files; the 11 surviving classes (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, `cf_type`) all appear.
3. **Invariant: docs continue to enumerate the surviving 30 record types in `list_records`** → manual review of the `list_records` row prose in both `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md:19`; the story-bundle enumeration lists 20 types (the original 21 minus `arc_trace_record`).
4. **Invariant: pipeline-wide retired-token cleanliness** → `grep -rnE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" tools/ docs/ .claude/skills/ --exclude-dir=node_modules --exclude-dir=dist` is a classification sweep. Remaining hits must be historical `docs/plans/` / `docs/triage/` records or retained prohibition text; no current source or public docs advertisement may remain.

## Landed Changes

### 1. Update `docs/MACHINE-FACING-LAYER.md`

Two rows in the MCP-tools table were updated:
- **`list_records` row**: removed `arc_trace_record` from the story-bundle record-type enumeration and replaced the `ARC_TRACE` bulk-sweep example with continuity-audit cross-check wording.
- **`get_canonical_vocabulary` row**: removed the seven retired class names and per-class prose; the row now lists the 11 surviving classes ending with `cf_type` and keeps the `mystery_reserve_effect` / `cf_type` notes.

### 2. Update `tools/world-mcp/README.md`

The package README already had the current 20-type `list_records` enumeration from `archive/tickets/SPEC29LEGTOOVOC-002.md`. The `get_canonical_vocabulary` description was updated to list only the 11 surviving classes and the retained `mystery_reserve_effect` / `cf_type` notes.

### 3. Update `tools/world-index/README.md`

Three locations were updated:
- **CLI usage block**: removed `[--arc-traces]` from the `world-index render` syntax and replaced the ARC_TRACE comment with stable story-bundle render wording.
- **Public types paragraph**: removed the stale `ARC_TRACE` index row shape claim.
- **Canonical-vocabularies paragraph**: replaced the retired scene-commitment/arc vocabulary prose with the surviving export set from `tools/world-index/src/public/canonical-vocabularies.ts`.

### 4. Update `archive/specs/SPEC-29-legacy-tools-vocabulary-cleanup.md`

The status and dated implementation note now record D5 as completed by this ticket. Older broad planning prose remains historical context.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-index/README.md` (modify)
- `archive/specs/SPEC-29-legacy-tools-vocabulary-cleanup.md` (modify)
- `archive/tickets/SPEC29LEGTOOVOC-005.md` (modify after archival)

## Out of Scope

- Source code changes (vocabulary, arc_trace_record, schema, parser, indexer) — those are `archive/tickets/SPEC29LEGTOOVOC-001.md`, `archive/tickets/SPEC29LEGTOOVOC-002.md`, `archive/tickets/SPEC29LEGTOOVOC-003.md`, and `archive/tickets/SPEC29LEGTOOVOC-004.md` (prerequisites per Deps).
- `.claude/skills/_shared-templates/story-state-contract.md` §4.4 / §5a prohibition text — retained per SPEC-29 §6 (design contract documenting what the SLT schema rejects).
- Archive prose (`archive/tickets/SCAUD-003*`, `archive/plans/2026-05-13*`, `archive/reports/streamlined-story-pipelines/*`) — historical record, not maintained.
- `docs/triage/*` files — historical record of triage decisions; not maintained.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record|arc_trace_node|arc-traces|ARC_TRACE|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-index/README.md` returns no hits.
2. The `docs/MACHINE-FACING-LAYER.md` `get_canonical_vocabulary` row prose enumerates exactly the 11 surviving classes (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, `cf_type`).
3. Both `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` `list_records` rows enumerate 20 story-bundle record types (the original 21 minus `arc_trace_record`).
4. `tools/world-index/README.md` line 16 CLI block does not mention `--arc-traces`.
5. `tools/world-index/README.md` line 38 paragraph enumerates only the surviving canonical-vocabularies exports.
6. Cross-surface guard: `grep -rnE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" tools/ docs/ .claude/skills/ --exclude-dir=node_modules --exclude-dir=dist` returns only classified historical/prohibition hits, not current source or public docs advertisements.

### Invariants

1. Documentation parity: the three docs surfaces match the MCP / index / vocabulary surfaces shipped by `archive/tickets/SPEC29LEGTOOVOC-001.md`, `archive/tickets/SPEC29LEGTOOVOC-002.md`, `archive/tickets/SPEC29LEGTOOVOC-003.md`, and `archive/tickets/SPEC29LEGTOOVOC-004.md`.
2. Cross-cutting docs landing atomically post-implementation prevents any review window during which docs advertise a retired surface.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record|arc_trace_node|arc-traces|ARC_TRACE|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-index/README.md` (post-edit: no hits)
2. `grep -rnE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" tools/ docs/ .claude/skills/ --exclude-dir=node_modules --exclude-dir=dist` (post-edit: classify remaining historical/prohibition hits; no current source or public docs advertisements)
3. Each docs surface is verified by its own narrower grep, since the three files are independent and grep failures localize cleanly to the specific surface that drifted.

## Outcome

Completed. The three current documentation surfaces no longer advertise the retired vocabulary classes, `arc_trace_record`, `arc_trace_node`, `--arc-traces`, or the stale `ARC_TRACE` world-index public type prose. SPEC-29 now records D5 and the full spec family as completed.

## Verification Result

1. `grep -nE 'commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record|arc_trace_node|arc-traces|ARC_TRACE|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass' docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-index/README.md` — returned no hits; the nonzero no-match exit is the expected success signal.
2. Manual review of `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` confirmed the `get_canonical_vocabulary` prose lists the 11 surviving classes: `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, and `cf_type`.
3. Manual review of the `list_records` rows in `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` confirmed the 20 surviving story-bundle record types and no `arc_trace_record`.
4. Manual review of `tools/world-index/README.md` confirmed the render command has no `--arc-traces`, the public-types paragraph has no `ARC_TRACE` row-shape claim, and the canonical-vocabularies paragraph lists only the surviving export families.
5. `grep -rnE 'commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record' tools/ docs/ .claude/skills/ --exclude-dir=node_modules --exclude-dir=dist` — returned only classified historical/prohibition hits: historical `docs/plans/` and `docs/triage/` records and the retained `.claude/skills/_shared-templates/story-state-contract.md` prohibition text. No current source or public documentation surface advertises the retired values.
6. `rg -n 'MACHINE-FACING-LAYER\.md|world-mcp/README\.md|world-index/README\.md' tools --glob '*.ts' --glob '!**/dist/**' --glob '!**/node_modules/**'` — returned no hits; no TypeScript consumer parses the edited docs as structured input.

## Deviations

1. `tools/world-index/README.md` also had stale `ARC_TRACE` public-types prose not explicitly called out in the ticket's original `Problem`; it was absorbed as same-README documentation parity fallout.
2. Because the user supplied `specs/SPEC-29*`, the spec status/implementation note was updated during closeout. Older broad-scope sections in SPEC-29 remain historical planning context rather than current instructions.
3. The broad cross-surface guard was corrected from a zero-hit expectation to manual classification of remaining historical/prohibition hits. `docs/plans/` contains historical pre-greenfield planning records, and `.claude/skills/_shared-templates/story-state-contract.md` intentionally preserves prohibition text per SPEC-29 §6.
