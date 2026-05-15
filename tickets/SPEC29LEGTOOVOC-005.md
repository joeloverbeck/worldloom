# SPEC29LEGTOOVOC-005: Update documented MCP surface to drop retired vocabulary + arc_trace_record references

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No new code surfaces; three documentation files updated to reflect the surface retirements landed in `archive/tickets/SPEC29LEGTOOVOC-001.md`, `archive/tickets/SPEC29LEGTOOVOC-002.md`, `archive/tickets/SPEC29LEGTOOVOC-003.md`, and `archive/tickets/SPEC29LEGTOOVOC-004.md`.
**Deps**: archive/tickets/SPEC29LEGTOOVOC-001.md, archive/tickets/SPEC29LEGTOOVOC-002.md, archive/tickets/SPEC29LEGTOOVOC-003.md, archive/tickets/SPEC29LEGTOOVOC-004.md

## Problem

Three documentation files carry references to the seven retired vocabulary classes and to `arc_trace_record`. Without this ticket, the docs continue to advertise an MCP surface that no longer exists:
- `docs/MACHINE-FACING-LAYER.md` — the `get_canonical_vocabulary` row (the line beginning at L80) enumerates all retired classes + per-class prose; the `list_records` row (preceding row in the same MCP-tools table) enumerates `arc_trace_record` in the supported record types + mentions "ARC_TRACE audit loads" in prose.
- `tools/world-mcp/README.md` — line 19 (the `list_records` description) enumerates `arc_trace_record` + mentions "ARC_TRACE audit loads"; line 28 (the `get_canonical_vocabulary` description) enumerates all retired classes + per-class prose.
- `tools/world-index/README.md` — line 16 (the CLI usage block) carries the `--arc-traces` flag in the `world-index render` command syntax; line 38 (the canonical-vocabularies export-surface paragraph) enumerates `commitment_family`, `commitment_class`, `COMMITMENT_CLASS_TO_FAMILY`, `commitmentFamilyForClass`, `arc_archetype` labels, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality**: each named line/row was verified at codebase validation 2026-05-15. The three documentation files are markdown prose; no machine consumer parses them as structured data (per SPEC-29 §Risks point 3: "Confirm at ticket time that the file's read pattern is just-prose"; verified by grep — no `.ts` file in `tools/` reads any of the three docs files programmatically).
2. **Spec/docs reality**: SPEC-29 §5 names only `docs/MACHINE-FACING-LAYER.md:80` (the `get_canonical_vocabulary` row), `tools/world-mcp/README.md`, and `tools/world-index/README.md`. Issue 4 from /spec-to-tickets Step 2 (2026-05-15) surfaced the additional `list_records` row references in `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md:19`, and the `--arc-traces` CLI flag mention in `tools/world-index/README.md:16`; all dispositioned **expand-scope-in-place**.
3. **Shared boundary under audit**: documentation prose ↔ MCP surface. Post-implementation, docs must match the surfaces in `tools/world-mcp/src/tools/list-records.ts`, `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`, and `tools/world-index/src/cli.ts` — verified by grep-proof at acceptance time. Per /spec-to-tickets §Cross-Cutting Docs Ticket Shape, `Deps` lists every upstream implementation ticket because each docs surface references a distinct implementation surface independently (no transitive-head dependency suffices — the `list_records` row references record types touched by `archive/tickets/SPEC29LEGTOOVOC-002.md` + `archive/tickets/SPEC29LEGTOOVOC-004.md`; the `get_canonical_vocabulary` row references classes touched by `archive/tickets/SPEC29LEGTOOVOC-001.md`; the `--arc-traces` CLI flag is touched by `archive/tickets/SPEC29LEGTOOVOC-004.md`; the canonical-vocabularies export prose references types touched by `archive/tickets/SPEC29LEGTOOVOC-001.md`).
4. **Documentation-only scope (per /spec-to-tickets §Cross-Cutting Docs Ticket Shape)**: this ticket touches markdown docs only — no production code, no tests. Acceptance is verified through grep-proofs against post-implementation state.

## Architecture Check

1. **Why this is cleaner than alternatives**: a single cross-cutting docs ticket gated by Deps on the four implementation tickets lands all docs edits in lockstep, post-implementation, eliminating any window during which docs advertise a retired surface. Per-implementation-ticket inline docs edits were considered and rejected (per /spec-to-tickets §Cross-Cutting Docs Ticket Shape "When NOT to use this shape"): the `list_records` row enumerates `arc_trace_record` in a list that includes record types touched by multiple implementation tickets, and the `get_canonical_vocabulary` row uses a comma-joined enumeration that benefits from a single atomic edit.
2. **No backwards-compatibility shims**: no `// @deprecated`-tagged class names, no "still-documented-for-now" residue. The docs reflect the new surface.

## Verification Layers

1. **Invariant: zero retired-vocabulary or arc_trace tokens remain in the three docs surfaces** → `grep -nE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record|arc_trace_node|arc-traces|ARC_TRACE|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-index/README.md` returns no hits.
2. **Invariant: docs continue to enumerate the 11 surviving vocabulary classes** → manual review of the post-edit `get_canonical_vocabulary` enumeration in both files; the 11 surviving classes (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, `cf_type`) all appear.
3. **Invariant: docs continue to enumerate the surviving 30 record types in `list_records`** → manual review of the `list_records` row prose in both `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md:19`; the story-bundle enumeration lists 20 types (the original 21 minus `arc_trace_record`).
4. **Invariant: pipeline-wide retired-token cleanliness** → `grep -rnE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" tools/ docs/ .claude/skills/` returns hits only in (a) `.claude/skills/_shared-templates/story-state-contract.md` §4.4 / §5a prohibition text (retained per SPEC-29 §6), (b) `archive/` files (historical record), (c) `docs/triage/` files (historical record). No live `tools/src/` or `.claude/skills/` hits.

## What to Change

### 1. Update `docs/MACHINE-FACING-LAYER.md`

Two rows in the MCP-tools table:
- **`list_records` row**: drop `arc_trace_record` from the story-bundle record-type enumeration (the comma-separated list currently includes 21 types; post-edit, 20 types — verify the enumeration matches `tools/world-mcp/src/tools/list-records.ts:SUPPORTED_LIST_RECORD_TYPES` after `archive/tickets/SPEC29LEGTOOVOC-002.md`). Remove "ARC_TRACE audit loads" from the prose example that lists bulk-sweep use cases ("Use full-body mode for deliberate whole-class sweeps such as every invariant, every Mystery Reserve firewall block, ARC_TRACE audit loads, or structured hybrid registry enumeration"); substitute another representative bulk-sweep example or simplify the prose to omit the third item.
- **`get_canonical_vocabulary` row (L80)**: drop the seven retired class names from the enumeration ("Current classes are `domain`, ..., `cf_type`, `commitment_family`, `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, and `stop_predicate`."); the resulting enumeration is 11 classes ending with `cf_type`. Remove the per-class prose explanations ("`commitment_family` returns the closed 16-family routing layer..." through "`arc_archetype` returns the recommended starter library..."). Keep the `mystery_reserve_effect` and `cf_type` conditional-block prose.

### 2. Update `tools/world-mcp/README.md`

Two locations:
- **Line 19 (`list_records` description)**: drop `arc_trace_record` from the story-bundle enumeration (same edit as Change 1 first bullet, but applied to this README's parallel prose). The enumeration is the same 20 surviving types.
- **Line 28 (`get_canonical_vocabulary` description)**: drop the seven retired class names from the enumeration; drop the per-class prose ("`commitment_family` is the closed 16-family routing layer..." through "`arc_archetype`... is orienting rather than exhaustive"). Same 11-class result as Change 1 second bullet.

### 3. Update `tools/world-index/README.md`

Two locations:
- **Line 16 (CLI usage block)**: drop `[--arc-traces]` from the `world-index render` command syntax line. Adjust surrounding example syntax to read cleanly without the optional flag.
- **Line 38 (canonical-vocabularies export-surface paragraph)**: rewrite the paragraph to enumerate only the surviving exports. Drop `commitment_family`, closed base `commitment_class`, `COMMITMENT_CLASS_TO_FAMILY`, `commitmentFamilyForClass`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`, and the per-class prose ("`commitment_class` remains the closed base routing key..." and "`arc_archetype` is an orienting pattern library..."). Surviving exports per `tools/world-index/src/public/canonical-vocabularies.ts` post-SPEC29LEGTOOVOC-001: `CANONICAL_DOMAINS` (the canonical domain list), `VERDICT_ENUM` (adjudication verdict enum), `MYSTERY_STATUS_ENUM` (mystery status enum), `MYSTERY_RESOLUTION_SAFETY_ENUM` (mystery resolution-safety enum), `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, `REVISION_DIFFICULTY_VALUES`, and the `CF_TYPE_*` family.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-index/README.md` (modify)

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
6. Cross-surface guard: `grep -rnE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" tools/ docs/ .claude/skills/` returns hits only in (a) `.claude/skills/_shared-templates/story-state-contract.md` §4.4 / §5a prohibition text, (b) `archive/` files, (c) `docs/triage/` files (per SPEC-29 §Verification's "Cross-surface guard" criterion).

### Invariants

1. Documentation parity: the three docs surfaces match the MCP / index / vocabulary surfaces shipped by `archive/tickets/SPEC29LEGTOOVOC-001.md`, `archive/tickets/SPEC29LEGTOOVOC-002.md`, `archive/tickets/SPEC29LEGTOOVOC-003.md`, and `archive/tickets/SPEC29LEGTOOVOC-004.md`.
2. Cross-cutting docs landing atomically post-implementation prevents any review window during which docs advertise a retired surface.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record|arc_trace_node|arc-traces|ARC_TRACE|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-index/README.md` (post-edit: no hits)
2. `grep -rnE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" tools/ docs/ .claude/skills/` (post-edit: hits only in retained prose locations per SPEC-29 §Verification cross-surface guard)
3. Each docs surface is verified by its own narrower grep, since the three files are independent and grep failures localize cleanly to the specific surface that drifted.
