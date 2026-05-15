# SPEC32STOCONHAR-006: Cross-skill integration-debt reconciliation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — Guardrails §Known integration debt sections of four story-pipeline skills (`branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`)
**Deps**: None

## Problem

Four of the seven story-pipeline skills carry "Known integration debt" sections referencing MCPENH / PEENH / VALENH ticket IDs, with **inconsistent landed-status verdicts across sibling skills**:

- `.claude/skills/branching-story-health-audit/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, MCPENH-041.
- `.claude/skills/commitment-block-authoring/SKILL.md` — references MCPENH-041.
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, MCPENH-041.
- `.claude/skills/story-promotion-closeout/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, PEENH-008, MCPENH-041. Closeout marks **PEENH-007 as "Now landed" with file:line evidence** (*"verified during this skill's gap-filler infrastructure audit; the op is present in `tools/patch-engine/src/envelope/schema.ts`"*), while sibling skills (story-fact-promotion-to-canon, branching-story-health-audit) still list the same ID as open debt.

The remaining three story skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`) carry no integration-debt notes.

Operators encountering one skill's note and not its siblings cannot tell whether the debt is still active or already resolved. This ticket performs a **per-ticket-ID adjudication** (inspecting the named code surface for each of the five IDs), classifies each as `landed` / `still open` / `superseded`, and applies a **consistent verdict across all four affected skills**. The same ID gets the same verdict everywhere it appears; verified-landed IDs carry an identical file:line evidence citation across siblings; still-open IDs preserve the same one-line description.

## Assumption Reassessment (2026-05-16)

1. Integration-debt-note references confirmed by repo grep across the four named skills:
   - `branching-story-health-audit/SKILL.md` — MCPENH-040, PEENH-007, VALENH-011, MCPENH-041 (4 IDs).
   - `commitment-block-authoring/SKILL.md` — MCPENH-041 (1 ID).
   - `story-fact-promotion-to-canon/SKILL.md` — MCPENH-040, PEENH-007, VALENH-011, MCPENH-041 (4 IDs).
   - `story-promotion-closeout/SKILL.md` — MCPENH-040, PEENH-007, VALENH-011, PEENH-008, MCPENH-041 (5 IDs).
   - Three story skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`) carry no integration-debt notes.
2. Closeout's `PEENH-007: Now landed` marker is verified at `tools/patch-engine/src/envelope/schema.ts` — the `create_bel_record` op is present in the schema (verified by repo grep during this ticket's authoring phase). The other IDs require per-ID code-surface inspection at implementation time:
   - MCPENH-040 / MCPENH-041 — inspect `tools/world-mcp/src/tools/` for the named tool/argument/profile changes.
   - PEENH-008 — inspect `tools/patch-engine/src/envelope/schema.ts` and `tools/patch-engine/src/ops/` for the named op or schema changes.
   - VALENH-011 — inspect `tools/validators/src/structural/` and `tools/validators/src/schemas/` for the named validator-rule or schema changes.
3. Cross-skill / cross-artifact boundary: this ticket touches **four sibling skills' Guardrails §Known integration debt sections**. The shared boundary is the integration-debt ID nomenclature (MCPENH-NNN, PEENH-NNN, VALENH-NNN) — there is no schema, no validator, no MCP tool that consumes these IDs at runtime; they are purely documentation cross-references to engine-enhancement tickets. Reconciliation is doc-only, but the verdicts must be consistent across sibling files to avoid the existing closeout-vs-siblings drift.
4. Rename/remove blast radius (template item 7 selected and renumbered to 4): each named ID may be referenced in the four skills above, in any related references/ files under those skill directories, and in `tools/` source comments. The implementation pass must grep pipeline-wide for each of the five IDs to confirm completeness before declaring the reconciliation done. Grep targets:
   - `.claude/skills/*/SKILL.md`
   - `.claude/skills/*/references/`
   - `tools/world-mcp/src/`
   - `tools/patch-engine/src/`
   - `tools/validators/src/`
   - `docs/`
   No grep is needed against `archive/` paths — historical state is preserved as-is per worldloom convention.

## Architecture Check

1. Cleaner than leaving inconsistent verdicts in place: a future operator reading one skill's "open debt" note and another skill's "Now landed" marker for the same ID cannot reconcile the two without doing the same code-surface inspection this ticket performs once. A consistent verdict across all four skills closes that drift.
2. No backwards-compatibility shims. Per-ID adjudications are doc-only edits; no schema, validator, or runtime behavior changes.

## Verification Layers

1. Each of the five named IDs (MCPENH-040, MCPENH-041, PEENH-007, PEENH-008, VALENH-011) has a documented verdict (`landed` / `still open` / `superseded`) → grep proof across the four affected skills returns the same verdict for each ID.
2. Verified-landed verdicts carry file:line evidence → manual review confirms each landed marker cites a specific file path and (where possible) a specific symbol or line range.
3. Still-open verdicts preserve a one-line description naming what the debt is and why it remains → manual review.
4. No ID is silently dropped from any skill — explicit removal (when justified by a `landed` verdict that makes the note historical) is documented in the verification log captured in the implementation's commit message; no skill loses a reference without an explicit per-ID adjudication.

## What to Change

### 1. Per-ticket-ID adjudication

For each of the five named IDs, perform the inspection at the named code surface and record the verdict:

- **MCPENH-040** (BEL allocator registration / Shape C rollout): check `tools/world-mcp/src/tools/` and `tools/world-mcp/src/cli/` for the named tool/argument/profile changes. Classify as `landed` / `still open` / `superseded`.
- **MCPENH-041** (task_type rename): check `tools/world-mcp/src/tools/` (esp. `get-context-packet.ts`, `tool-names.ts`) for the named profile changes. Classify accordingly.
- **PEENH-007** (`create_bel_record` patch op): closeout already marks this `Now landed` at `tools/patch-engine/src/envelope/schema.ts`. Confirm and apply the same `Now landed` verdict to sibling skills (health-audit, story-fact-promotion-to-canon).
- **PEENH-008** (DA supersession ops for `source_kind: artifact_canonization`): check `tools/patch-engine/src/ops/` for `append_story_diegetic_artifact_record` and related DA supersession surfaces. Classify accordingly.
- **VALENH-011** (BEL `record_schema_compliance`): check `tools/validators/src/structural/record-schema-compliance.ts` and `tools/validators/src/schemas/` for BEL schema and validator-rule presence. Classify accordingly.

### 2. Apply consistent verdict across all four skills

For each ID, apply the SAME verdict to every skill that references it. The wording must be identical (e.g., every reference to PEENH-007 across the four skills becomes *"Now landed (verified at `tools/patch-engine/src/envelope/schema.ts`)"*). Drift between skills on the same ID is the failure mode this ticket exists to fix.

- `.claude/skills/branching-story-health-audit/SKILL.md` — update Guardrails §Known integration debt entries for MCPENH-040, MCPENH-041, PEENH-007, VALENH-011.
- `.claude/skills/commitment-block-authoring/SKILL.md` — update Guardrails §Known integration debt entry for MCPENH-041 (single ID).
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` — update Guardrails §Known integration debt entries for MCPENH-040, MCPENH-041, PEENH-007, VALENH-011.
- `.claude/skills/story-promotion-closeout/SKILL.md` — update Guardrails §Known integration debt entries for MCPENH-040, MCPENH-041, PEENH-007 (re-affirm existing `Now landed` marker), PEENH-008, VALENH-011.

### 3. Reconciliation log

At the end of the implementation, capture a short adjudication table in the commit message (or as a comment in the ticket's verification commit description) with the per-ID verdict and file:line evidence:

```
ID            Verdict       Evidence
MCPENH-040    <verdict>     <file:line or "still open: <one-line>">
MCPENH-041    <verdict>     <file:line or "still open: <one-line>">
PEENH-007     landed        tools/patch-engine/src/envelope/schema.ts (create_bel_record op present)
PEENH-008     <verdict>     <file:line or "still open: <one-line>">
VALENH-011    <verdict>     <file:line or "still open: <one-line>">
```

The companion triage at `docs/triage/2026-05-15-story-related-improvements-sixth-iteration-triage.md` cross-references this audit but does not duplicate it.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Guardrails §Known integration debt)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Guardrails §Known integration debt)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — Guardrails §Known integration debt)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — Guardrails §Known integration debt)

## Out of Scope

- Introducing new integration-debt IDs — only the five existing IDs are adjudicated.
- Modifying the engine code (`tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`) for IDs that are `still open` — this ticket performs documentation reconciliation only; implementation of any still-open debt is a separate follow-up ticket.
- Editing `archive/` paths — historical state is preserved.
- Three story skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`) — they carry no integration-debt notes and are not touched.
- Per-ID code surface refactoring — verification is grep-proof + manual code-surface inspection; no refactoring is performed.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` returns hits with consistent verdict wording per ID (verified by manual review of the grep output).
2. Each `Now landed` marker in the grep output carries a file:line or symbol-existence citation (verified by manual review).
3. Each `still open` reference preserves a one-line description of the debt.
4. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` returns no matches (the three uninvolved skills remain untouched).
5. `npm --prefix tools/validators test && npm --prefix tools/patch-engine test && npm --prefix tools/world-mcp test` (regression check; no behavior change expected — pure documentation reconciliation).

### Invariants

1. Each integration-debt ID has the same verdict across every skill that references it.
2. No `Now landed` marker exists without a file:line or symbol-existence citation.
3. No `still open` reference is dropped without an explicit per-ID adjudication (if a still-open reference is removed, the commit message documents why).
4. The reconciliation does not alter any engine code; this is doc-only.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (grep across the four affected skills + the three uninvolved skills) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` (verdict consistency check)
2. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` (must return no matches — the three uninvolved skills remain untouched)
3. `grep -rn "MCPENH\\|PEENH\\|VALENH" docs/ specs/` (cross-doc sweep — confirms no spec or documentation file independently references these IDs in a way that would drift from the reconciled skill verdicts; expected: scarce or no matches)
4. `npm --prefix tools/validators test` and `npm --prefix tools/patch-engine test` and `npm --prefix tools/world-mcp test` (regression check)
