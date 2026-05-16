# SPEC33STOPIPSEV-006: Add shared persisted-packet-recovery template + cross-refs in 7 consuming skills

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new shared-template file at `.claude/skills/_shared-templates/persisted-packet-recovery.md`; cross-reference inserts in 7 story-pipeline consuming skills. No tool/validator/patch-engine changes.
**Deps**: None

## Problem

`docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery and `docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope define the persisted-summary recovery contract: when `get_context_packet`, `get_records`, or `describe_envelope_schema` returns `delivery_status: persisted_with_summary`, the consuming workflow must retrieve required slices via `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` before validation. The MCP side implements the recovery API (`tools/world-mcp/src/tools/get-persisted-packet-slice.ts`, registered in `tools/world-mcp/src/server.ts`; assembler emits `delivery_status` and `fallback_advice` at `tools/world-mcp/src/context-packet/assemble.ts`). But none of the seven consuming story-pipeline skills documents recovery wording — under large bundles or wide CH windows, a skill could validate against a summary-only packet and miss governing records.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of MCP-side implementation**: live read confirms `tools/world-mcp/src/tools/get-persisted-packet-slice.ts` exists and is registered in `tools/world-mcp/src/server.ts`; the context-packet assembler emits `delivery_status: persisted_with_summary` correctly per `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery.
2. **Codebase verification of consuming-skill gap**: live read of all seven consuming SKILL.md files (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) confirms none mentions `persisted_with_summary` or `get_persisted_packet_slice`.
3. **Cross-skill boundary**: the shared boundary under audit is the persisted-summary recovery contract documented at `docs/CONTEXT-PACKET-CONTRACT.md` and `docs/MACHINE-FACING-LAYER.md`, plus the MCP-side `get_persisted_packet_slice` tool. The new shared template centralizes the skill-facing discipline so cross-skill divergence is structurally prevented; the precedent at `.claude/skills/_shared-templates/story-state-contract.md` establishes the shared-template pattern.
4. **FOUNDATIONS principle restatement**: §3 Read Discipline (story-pipeline retrieval via targeted MCP tools); §5 Validation Rules at Story Scope (validation rationales must cite real records, not summary metadata). Closing this gap brings consuming skills into compliance with the contract that already names the recovery API.

## Architecture Check

1. A single shared template plus seven cross-reference inserts is cleaner than seven verbatim inlines because (a) future amendments stay canonical (one file to edit, not seven), (b) the precedent at `_shared-templates/story-state-contract.md` is the established pattern for cross-skill discipline, and (c) the cross-reference inserts are minimal (~3 lines per skill) and locally readable. Alternatives considered: (i) seven verbatim inlines — would diverge under amendment, costing audit-trail clarity; (ii) leaving the discipline in the contract docs only — no skill-facing operationalization, so skill authors miss the recovery path.
2. No backwards-compatibility aliasing/shims introduced — the new template is additive; existing skill prose is augmented (not replaced) with cross-references.

## Verification Layers

1. Shared template file exists with canonical recovery wording → codebase grep-proof + manual review.
2. Each of seven consuming skills' Pre-flight section cross-references the shared template → codebase grep-proof per skill.
3. MCP-side `get_persisted_packet_slice` and `delivery_status: persisted_with_summary` already implemented → codebase grep-proof on `tools/world-mcp/`.

## What to Change

### 1. Create the shared template file

Create `.claude/skills/_shared-templates/persisted-packet-recovery.md` with this exact body:

```markdown
# Persisted-Packet Recovery — Shared Discipline

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
retrieved records, fields, packet layers, slices, or validator results —
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
the persisted-path to the user for post-session analysis. Do not validate
from summary-only context.
```

### 2. Cross-reference insert in each consuming skill's Pre-flight

Insert this exact paragraph into each consuming skill's Pre-flight section, placed immediately after the relevant retrieval-tool call (typically right after `mcp__worldloom__get_context_packet` or `mcp__worldloom__get_records`):

```
Persisted-summary recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices via
`mcp__worldloom__get_persisted_packet_slice` before continuing.
```

Insert sites (paths and approximate line markers — locate the relevant retrieval call by reading the file):

- `branching-story-bootstrap/SKILL.md` — after the `get_context_packet` call (~line 45 region).
- `branching-story-turn-cycle/SKILL.md` — after the `get_context_packet` call (~line 39 region).
- `branching-story-prose-attach/SKILL.md` — after the `get_firewall_content` reference in Pre-flight (~line 114 region; one short note covering the conditional retrieval path).
- `branching-story-health-audit/SKILL.md` — after the `get_context_packet` call (~line 33 region).
- `commitment-block-authoring/SKILL.md` — after the `get_context_packet` call (~line 36 region).
- `story-fact-promotion-to-canon/SKILL.md` — after the `get_context_packet` / `get_records` calls.
- `story-promotion-closeout/SKILL.md` — after the `get_records` call (~line 154 region for linked CF/CH/PA retrieval).

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
3. `grep -n 'persisted_with_summary' .claude/skills/` returns matches in the shared template + each consuming skill's Pre-flight cross-reference.
4. `grep -l 'get_persisted_packet_slice' tools/world-mcp/src/tools/` returns `get-persisted-packet-slice.ts` (sanity check that MCP-side implementation is unchanged).

### Invariants

1. The shared template at `_shared-templates/persisted-packet-recovery.md` is the single canonical source of skill-facing persisted-summary recovery discipline.
2. Every consuming story-pipeline skill cross-references the shared template in its Pre-flight section.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md && echo "✓ template exists"` — must succeed.
2. `grep -c 'persisted-packet-recovery.md' .claude/skills/*/SKILL.md` — count must be 7 (one cross-reference per consuming skill).
3. `grep -n 'persisted_with_summary' .claude/skills/_shared-templates/persisted-packet-recovery.md` — confirms the canonical recovery wording uses the contract terminology.
4. A narrower glob-and-grep verification is the right boundary because the MCP-side recovery API is unchanged (no integration-test exercise of the MCP recovery surface is needed for this skill-prose-only ticket).
