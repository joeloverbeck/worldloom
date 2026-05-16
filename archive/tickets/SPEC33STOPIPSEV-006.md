# SPEC33STOPIPSEV-006: Add shared persisted-packet-recovery template + cross-refs in 7 consuming skills

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new shared-template file at `.claude/skills/_shared-templates/persisted-packet-recovery.md`; cross-reference inserts in 7 story-pipeline consuming skills. No tool/validator/patch-engine changes.
**Deps**: None

## Problem

`docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery and `docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope define the persisted-summary recovery contract: when `get_context_packet`, `get_records`, or `describe_envelope_schema` returns `delivery_status: persisted_with_summary`, the consuming workflow must retrieve required slices via `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` before validation. The MCP side implements the recovery API (`tools/world-mcp/src/tools/get-persisted-packet-slice.ts`, registered in `tools/world-mcp/src/server.ts`; assembler emits `delivery_status` and `fallback_advice` at `tools/world-mcp/src/context-packet/assemble.ts`). At intake, none of the seven consuming story-pipeline skills documented recovery wording — under large bundles or wide CH windows, a skill could validate against a summary-only packet and miss governing records.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of MCP-side implementation**: live read confirms `tools/world-mcp/src/tools/get-persisted-packet-slice.ts` exists and is registered in `tools/world-mcp/src/server.ts`; the context-packet assembler emits `delivery_status: persisted_with_summary` correctly per `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery.
2. **Codebase verification of consuming-skill gap**: at intake, live read of all seven consuming SKILL.md files (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) confirmed none mentioned `persisted_with_summary` or `get_persisted_packet_slice`. This ticket added exactly one Pre-flight cross-reference to each consuming skill.
3. **Cross-skill boundary**: the shared boundary under audit is the persisted-summary recovery contract documented at `docs/CONTEXT-PACKET-CONTRACT.md` and `docs/MACHINE-FACING-LAYER.md`, plus the MCP-side `get_persisted_packet_slice` tool. The new shared template centralizes the skill-facing discipline so cross-skill divergence is structurally prevented; the precedent at `.claude/skills/_shared-templates/story-state-contract.md` establishes the shared-template pattern.
4. **FOUNDATIONS principle restatement**: §3 Read Discipline (story-pipeline retrieval via targeted MCP tools); §5 Validation Rules at Story Scope (validation rationales must cite real records, not summary metadata). Closing this gap brings consuming skills into compliance with the contract that already names the recovery API.

## Architecture Check

1. A single shared template plus seven cross-reference inserts is cleaner than seven verbatim inlines because (a) future amendments stay canonical (one file to edit, not seven), (b) the precedent at `_shared-templates/story-state-contract.md` is the established pattern for cross-skill discipline, and (c) the cross-reference inserts are minimal (~3 lines per skill) and locally readable. Alternatives considered: (i) seven verbatim inlines — would diverge under amendment, costing audit-trail clarity; (ii) leaving the discipline in the contract docs only — no skill-facing operationalization, so skill authors miss the recovery path.
2. No backwards-compatibility aliasing/shims introduced — the new template is additive; existing skill prose is augmented (not replaced) with cross-references.

## Verification Layers

1. Shared template file exists with canonical recovery wording → codebase grep-proof + manual review.
2. Each of seven consuming skills' Pre-flight section cross-references the shared template → codebase grep-proof per skill.
3. MCP-side `get_persisted_packet_slice` and `delivery_status: persisted_with_summary` already implemented → codebase grep-proof on `tools/world-mcp/`.

## Landed Changes

### 1. Create the shared template file

Created `.claude/skills/_shared-templates/persisted-packet-recovery.md` with the shared recovery discipline:

```markdown
# Persisted-Packet Recovery - Shared Discipline

This shared discipline applies to every story-pipeline skill whose Pre-flight
invokes `mcp__worldloom__get_context_packet`,
`mcp__worldloom__get_records`, or
`mcp__worldloom__describe_envelope_schema`. The contracts at
`docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery and
`docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope are authoritative; this
file is the skill-facing discipline that operationalizes them.

## When Recovery Fires

If `get_context_packet`, `get_records`, or `describe_envelope_schema` returns
`task_header.delivery_status: persisted_with_summary` (or the equivalent
envelope field on `get_records` / `describe_envelope_schema`), the inline
response is a recovery summary, not the full payload. The full packet lives
at `task_header.persisted_output_path`. Validation rationales may cite only
retrieved records, fields, packet layers, slices, or validator results -
never summary metadata alone.

## Recovery Action

Retrieve every load-bearing omitted slice before continuing analysis:

- For oversized `get_context_packet`: call
  `mcp__worldloom__get_persisted_packet_slice(persisted_path=<persisted_output_path>,
  slice_path=<dot-path>)` for each required layer or node id (e.g.,
  `governing_world_context.nodes` for governing records, or
  `local_authority.nodes[id=<seed_id>]` for a specific seed).
- For oversized `get_records`: retrieve
  `records[<N>].record.record` (or equivalent slice path) for every required
  id.
- For oversized `describe_envelope_schema`: either re-invoke with the
  specific `op_kind` argument, or slice `op_schemas.<op_kind>` from the
  persisted file.

The inline `governing_summary` is an index, not a substitute. Use it to
identify which slices to retrieve, then retrieve.

## Abort Condition

If a required slice cannot be retrieved (e.g., the persisted file is
inaccessible or the slice path is malformed), abort the workflow and surface
the persisted path to the user for post-session analysis. Do not validate
from summary-only context.
```

### 2. Cross-reference insert in each consuming skill's Pre-flight

Inserted this paragraph into each consuming skill's Pre-flight section, placed after the relevant retrieval-tool call or precondition block:

```
Persisted-summary recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices via
`mcp__worldloom__get_persisted_packet_slice` before continuing.
```

Insert sites:

- `branching-story-bootstrap/SKILL.md` — after Pre-flight step 6 (`get_context_packet`).
- `branching-story-turn-cycle/SKILL.md` — after Pre-flight step 12; the note covers step 9 `get_context_packet` and step 10 `get_records` recovery.
- `branching-story-prose-attach/SKILL.md` — after Pre-flight step 7; this skill has no context-packet pre-flight call, but the note covers any later `describe_envelope_schema` recovery path.
- `branching-story-health-audit/SKILL.md` — after Pre-flight step 6; the note covers step 5 `get_context_packet` / targeted retrieval recovery.
- `commitment-block-authoring/SKILL.md` — after Pre-flight step 6 (`get_context_packet` / targeted retrieval).
- `story-fact-promotion-to-canon/SKILL.md` — after Pre-flight step 7 (`get_context_packet` / targeted retrieval).
- `story-promotion-closeout/SKILL.md` — after Pre-flight step 7; the note covers step 5 `get_records` recovery.

## Files to Touch

- `.claude/skills/_shared-templates/persisted-packet-recovery.md` (new)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)

## Out of Scope

- MCP-side `get_persisted_packet_slice` implementation — already exists at `tools/world-mcp/src/tools/get-persisted-packet-slice.ts`; no tool changes.
- Context-packet assembler `delivery_status` emission — already implemented at `tools/world-mcp/src/context-packet/assemble.ts`; no changes.
- `docs/CONTEXT-PACKET-CONTRACT.md` and `docs/MACHINE-FACING-LAYER.md` — already authoritative; not modified.
- The 6th file under `_shared-templates/` (per SPEC-33 §Risks): the directory currently has 2 files (`clothing-consistency-vocabulary.md`, `story-state-contract.md`); after this ticket lands it will have 3, not 6 as the spec §Risks prose miscounted. The deliverable scope is correct (one new file at the named path); the count miscount is in spec narrative only.

## Acceptance Criteria

### Tests That Must Pass

1. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md` succeeds.
2. `grep -l 'persisted-packet-recovery.md' .claude/skills/{branching-story-bootstrap,branching-story-turn-cycle,branching-story-prose-attach,branching-story-health-audit,commitment-block-authoring,story-fact-promotion-to-canon,story-promotion-closeout}/SKILL.md` returns all seven file paths.
3. `grep -n 'persisted_with_summary' .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/{branching-story-bootstrap,branching-story-turn-cycle,branching-story-prose-attach,branching-story-health-audit,commitment-block-authoring,story-fact-promotion-to-canon,story-promotion-closeout}/SKILL.md` returns matches in the shared template + each consuming skill's Pre-flight cross-reference.
4. `test -f tools/world-mcp/src/tools/get-persisted-packet-slice.ts && rg -n "get_persisted_packet_slice" tools/world-mcp/src/server.ts tools/world-mcp/src/tool-names.ts` succeeds (sanity check that MCP-side implementation and registration are unchanged).

### Invariants

1. The shared template at `_shared-templates/persisted-packet-recovery.md` is the single canonical source of skill-facing persisted-summary recovery discipline.
2. Every consuming story-pipeline skill cross-references the shared template in its Pre-flight section.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md && echo "template exists"` — succeeded.
2. `grep -l 'persisted-packet-recovery.md' .claude/skills/{branching-story-bootstrap,branching-story-turn-cycle,branching-story-prose-attach,branching-story-health-audit,commitment-block-authoring,story-fact-promotion-to-canon,story-promotion-closeout}/SKILL.md` — returned all seven consuming skill paths.
3. `grep -n 'persisted_with_summary' .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/{branching-story-bootstrap,branching-story-turn-cycle,branching-story-prose-attach,branching-story-health-audit,commitment-block-authoring,story-fact-promotion-to-canon,story-promotion-closeout}/SKILL.md` — returned one shared-template match plus one match in each consuming skill.
4. A narrower glob-and-grep verification is the right boundary because the MCP-side recovery API is unchanged (no integration-test exercise of the MCP recovery surface is needed for this skill-prose-only ticket).

## Outcome

Completed: 2026-05-16

Added `.claude/skills/_shared-templates/persisted-packet-recovery.md` as the canonical skill-facing recovery discipline for `persisted_with_summary` responses from `get_context_packet`, `get_records`, and `describe_envelope_schema`. Added one Pre-flight cross-reference to each of the seven consuming story-pipeline skills.

No tool, validator, patch-engine, MCP handler, or world-content changes were made.

## Verification Result

1. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md && echo "template exists"` — passed.
2. `grep -l 'persisted-packet-recovery.md' .claude/skills/{branching-story-bootstrap,branching-story-turn-cycle,branching-story-prose-attach,branching-story-health-audit,commitment-block-authoring,story-fact-promotion-to-canon,story-promotion-closeout}/SKILL.md` — returned all seven consuming skill paths.
3. `grep -n 'persisted_with_summary' .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/{branching-story-bootstrap,branching-story-turn-cycle,branching-story-prose-attach,branching-story-health-audit,commitment-block-authoring,story-fact-promotion-to-canon,story-promotion-closeout}/SKILL.md` — returned the shared template plus all seven Pre-flight cross-reference hits.
4. `test -f tools/world-mcp/src/tools/get-persisted-packet-slice.ts && rg -n "get_persisted_packet_slice" tools/world-mcp/src/server.ts tools/world-mcp/src/tool-names.ts` — passed, confirming the existing MCP-side implementation file and registration references remain present.

## Deviations

1. The drafted command `grep -l 'get_persisted_packet_slice' tools/world-mcp/src/tools/` was stale for the live implementation: the handler file is `get-persisted-packet-slice.ts`, while the snake-case tool name is registered in `tools/world-mcp/src/server.ts` and `tools/world-mcp/src/tool-names.ts`. Closeout replaced that proof with the direct file-exists + registration grep above.
2. The drafted count command `grep -c 'persisted-packet-recovery.md' .claude/skills/*/SKILL.md` emits one count per file, not a scalar total. Closeout uses `grep -l` against the seven named consuming skills instead.
