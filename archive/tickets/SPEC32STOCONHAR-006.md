# SPEC32STOCONHAR-006: Cross-skill integration-debt reconciliation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — Guardrails §Known integration debt sections of four story-pipeline skills (`branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) plus a SPEC-32 D6 implementation note
**Deps**: None

## Problem

At intake, four of the seven story-pipeline skills carried "Known integration debt" sections referencing MCPENH / PEENH / VALENH ticket IDs, with **inconsistent landed-status verdicts across sibling skills**:

- `.claude/skills/branching-story-health-audit/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, MCPENH-041.
- `.claude/skills/commitment-block-authoring/SKILL.md` — references MCPENH-041.
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, MCPENH-041.
- `.claude/skills/story-promotion-closeout/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, PEENH-008, MCPENH-041. Closeout marks **PEENH-007 as "Now landed" with file:line evidence** (*"verified during this skill's gap-filler infrastructure audit; the op is present in `tools/patch-engine/src/envelope/schema.ts`"*), while sibling skills (story-fact-promotion-to-canon, branching-story-health-audit) still list the same ID as open debt.

The remaining three story skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`) carry no integration-debt notes.

Operators encountering one skill's note and not its siblings could not tell whether the debt was still active or already resolved. This ticket performed a **per-ticket-ID adjudication** (inspecting the named code surface for each of the five IDs), classified each as landed, and applied a **consistent `Now landed` verdict across all four affected skills**. Verified-landed IDs now carry concrete file/symbol evidence across siblings.

## Assumption Reassessment (2026-05-16)

1. Integration-debt-note references confirmed by repo grep across the four named skills:
   - `branching-story-health-audit/SKILL.md` — MCPENH-040, PEENH-007, VALENH-011, MCPENH-041 (4 IDs).
   - At ticket authoring, `commitment-block-authoring/SKILL.md` was listed as MCPENH-041 only; live reassessment found it also already carried MCPENH-040, PEENH-007, and VALENH-011 inherited-BEL entries. The active ticket absorbs those same-seam debt entries so all four affected skills receive a consistent verdict.
   - `story-fact-promotion-to-canon/SKILL.md` — MCPENH-040, PEENH-007, VALENH-011, MCPENH-041 (4 IDs).
   - `story-promotion-closeout/SKILL.md` — MCPENH-040, PEENH-007, VALENH-011, PEENH-008, MCPENH-041 (5 IDs).
   - Three story skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`) carry no integration-debt notes.
2. Per-ID code-surface inspection completed:
   - MCPENH-040 is landed: `tools/world-mcp/src/tools/allocate-next-id.ts` registers `BEL` in `ID_CLASS_FORMATS` and `STORY_SCOPED_ID_CLASS_DIRECTORIES`; `tools/world-mcp/src/server.ts` includes `BEL` in `ID_CLASSES`.
   - MCPENH-041 is landed: `tools/world-mcp/src/ranking/profiles/index.ts` registers `story_turn_cycle`, `commitment_block_authoring`, `branching_story_health_audit`, and `story_fact_promotion_to_canon` in `TASK_TYPES`.
   - PEENH-007 is landed: `tools/patch-engine/src/envelope/schema.ts` lists `create_bel_record` in `OPERATION_KINDS`, and `tools/patch-engine/src/ops/create-story-record.ts` maps it to `belief_record` under `_source/beliefs/`.
   - PEENH-008 is landed as a contract-truthing fix using the existing op: `tools/patch-engine/src/envelope/schema.ts` lists `append_story_diegetic_artifact_record` and `story_da_ids`, and `tools/patch-engine/src/ops/create-story-record.ts` maps the op to `_source/artifacts/`.
   - VALENH-011 is landed: `tools/validators/src/schemas/story-belief.schema.json` exists, and `tools/validators/src/structural/utils.ts` maps `belief_record` to `story-belief`.
3. Cross-skill / cross-artifact boundary: this ticket touches **four sibling skills' Guardrails §Known integration debt sections**. The shared boundary is the integration-debt ID nomenclature (MCPENH-NNN, PEENH-NNN, VALENH-NNN) — there is no schema, no validator, no MCP tool that consumes these IDs at runtime; they are purely documentation cross-references to engine-enhancement tickets. Reconciliation is doc-only, but the verdicts must be consistent across sibling files to avoid the existing closeout-vs-siblings drift.
4. Rename/remove blast radius (template item 7 selected and renumbered to 4): each named ID may be referenced in the four skills above, in any related references/ files under those skill directories, and in `tools/` source comments. The implementation pass grepped pipeline-wide for each of the five IDs to confirm completeness before declaring the reconciliation done. Grep targets:
   - `.claude/skills/*/SKILL.md`
   - `.claude/skills/*/references/`
   - `tools/world-mcp/src/`
   - `tools/patch-engine/src/`
   - `tools/validators/src/`
   - `docs/`
   No grep was needed against `archive/` paths — historical state is preserved as-is per worldloom convention.

## Architecture Check

1. Cleaner than leaving inconsistent verdicts in place: a future operator reading one skill's "open debt" note and another skill's "Now landed" marker for the same ID cannot reconcile the two without doing the same code-surface inspection this ticket performs once. A consistent verdict across all four skills closes that drift.
2. No backwards-compatibility shims. Per-ID adjudications are doc-only edits; no schema, validator, or runtime behavior changes.

## Verification Layers

1. Each of the five named IDs (MCPENH-040, MCPENH-041, PEENH-007, PEENH-008, VALENH-011) has a documented verdict (`landed` / `still open` / `superseded`) → grep proof across the four affected skills returns the same verdict for each ID.
2. Verified-landed verdicts carry file:line evidence → manual review confirms each landed marker cites a specific file path and (where possible) a specific symbol or line range.
3. No still-open verdicts remain for the five adjudicated IDs → manual review of the four affected skills.
4. No ID is silently dropped from any skill — every ID remains present where the skill references it, with a landed verdict and evidence.

## Landed Changes

### 1. Per-ticket-ID adjudication

Each of the five named IDs was inspected at the named code surface and recorded with this verdict:

| ID | Verdict | Evidence |
|---|---|---|
| MCPENH-040 | landed | `tools/world-mcp/src/tools/allocate-next-id.ts` registers `BEL` in `ID_CLASS_FORMATS` and `STORY_SCOPED_ID_CLASS_DIRECTORIES`; `tools/world-mcp/src/server.ts` includes `BEL` in `ID_CLASSES`. |
| MCPENH-041 | landed | `tools/world-mcp/src/ranking/profiles/index.ts` registers rebuilt story-pipeline task types in `TASK_TYPES`. |
| PEENH-007 | landed | `tools/patch-engine/src/envelope/schema.ts` lists `create_bel_record` in `OPERATION_KINDS`; `tools/patch-engine/src/ops/create-story-record.ts` maps the op to `belief_record`. |
| PEENH-008 | landed | `tools/patch-engine/src/envelope/schema.ts` lists `append_story_diegetic_artifact_record` and `story_da_ids`; `tools/patch-engine/src/ops/create-story-record.ts` maps the op to `_source/artifacts/`. |
| VALENH-011 | landed | `tools/validators/src/schemas/story-belief.schema.json` exists; `tools/validators/src/structural/utils.ts` maps `belief_record` to `story-belief`. |

### 2. Apply consistent verdict across all four skills

For each ID, the same `Now landed` verdict and evidence class was applied to every skill that references it. Drift between skills on the same ID was the failure mode this ticket existed to fix.

- `.claude/skills/branching-story-health-audit/SKILL.md` — update Guardrails §Known integration debt entries for MCPENH-040, MCPENH-041, PEENH-007, VALENH-011.
- `.claude/skills/commitment-block-authoring/SKILL.md` — update Guardrails §Known integration debt entries for MCPENH-041, MCPENH-040, PEENH-007, and VALENH-011.
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` — update Guardrails §Known integration debt entries for MCPENH-040, MCPENH-041, PEENH-007, VALENH-011.
- `.claude/skills/story-promotion-closeout/SKILL.md` — update Guardrails §Known integration debt entries for MCPENH-040, MCPENH-041, PEENH-007 (re-affirm existing `Now landed` marker), PEENH-008, VALENH-011.

### 3. Reconciliation log

The adjudication table above is the implementation log. The companion triage at `docs/triage/2026-05-15-story-related-improvements-sixth-iteration-triage.md` remains historical intake context and does not duplicate the final verdict table.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Guardrails §Known integration debt)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Guardrails §Known integration debt)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — Guardrails §Known integration debt)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — Guardrails §Known integration debt)
- `archive/specs/SPEC-32-story-contract-hardening-iv.md` (modify — D6 implementation note)
- `archive/tickets/SPEC32STOCONHAR-006.md` (modify — closeout and corrected live-scope record)

## Out of Scope

- Introducing new integration-debt IDs — only the five existing IDs are adjudicated.
- Modifying the engine code (`tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`) for IDs that are `still open` — this ticket performs documentation reconciliation only; implementation of any still-open debt is a separate follow-up ticket.
- Editing `archive/` paths — historical state is preserved.
- Three story skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`) — they carry no integration-debt notes and are not touched.
- Per-ID code surface refactoring — verification is grep-proof + manual code-surface inspection; no refactoring is performed.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` returns hits with consistent `Now landed` verdict wording per ID (verified by manual review of the grep output).
2. Each `Now landed` marker in the grep output carries a file:line or symbol-existence citation (verified by manual review).
3. No `still open` reference remains for MCPENH-040, MCPENH-041, PEENH-007, PEENH-008, or VALENH-011 in the affected Known integration debt sections.
4. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` returns only the `branching-story-prose-attach` "No deferred-integration tickets named by this skill" inherited-infrastructure note, not a Known integration debt section; `branching-story-bootstrap` and `branching-story-turn-cycle` return no hits.
5. Regression packages are not rerun for this docs-only reconciliation because no engine, validator, or schema files changed; the accepted proof is code-surface inspection plus grep/manual review of the skill debt sections.

### Invariants

1. Each integration-debt ID has the same verdict across every skill that references it.
2. No `Now landed` marker exists without a file:line or symbol-existence citation.
3. No `still open` reference remains for the adjudicated IDs in affected Known integration debt sections.
4. The reconciliation does not alter any engine code; this is doc-only.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (grep across the four affected skills + the three uninvolved skills) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` (verdict consistency check)
2. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` (classify any hit; accepted result is only the prose-attach non-debt inherited-infrastructure note)
3. `grep -rn "MCPENH\\|PEENH\\|VALENH" docs/ specs/` (cross-doc sweep — confirms no spec or documentation file independently references these IDs in a way that would drift from the reconciled skill verdicts; expected: scarce or no matches)
4. Regression packages are not rerun for this docs-only reconciliation because no engine, validator, or schema files changed; the accepted proof is code-surface inspection plus grep/manual review of the skill debt sections.

## Outcome

Completed: 2026-05-16.

Reconciled the cross-skill integration-debt notes for MCPENH-040, MCPENH-041, PEENH-007, PEENH-008, and VALENH-011. All five IDs are currently landed in their named code surfaces, and every live story-pipeline skill that references one of those IDs now carries a `Now landed` verdict with concrete evidence. The live `commitment-block-authoring` debt section had already grown beyond the ticket's intake inventory, so this ticket absorbed the same-seam MCPENH-040 / PEENH-007 / VALENH-011 entries there and truthed them with the rest.

## Verification Result

1. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` — passed; every Known integration debt hit now carries a `Now landed` verdict with evidence. The command also surfaced two current operational mentions outside the debt section (`commitment-block-authoring` pre-flight and `story-promotion-closeout` Phase 5), both already point to landed inherited behavior.
2. `grep -nE "MCPENH-(040|041)|PEENH-(007|008)|VALENH-011" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` — returned only `branching-story-prose-attach`'s "No deferred-integration tickets named by this skill" inherited-infrastructure note; no Known integration debt section exists in those three skills.
3. `grep -rn "MCPENH\\|PEENH\\|VALENH" docs/ specs/` — returned historical/supporting references in `docs/MACHINE-FACING-LAYER.md`, `docs/FOUNDATIONS.md`, triage docs, and this active spec. `archive/specs/SPEC-32-story-contract-hardening-iv.md` was updated with a D6 implementation note; remaining D6 prose is historical intake context.
4. `git diff --check -- .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md archive/specs/SPEC-32-story-contract-hardening-iv.md archive/tickets/SPEC32STOCONHAR-006.md` — passed.

## Deviations

- The ticket's intake inventory undercounted `commitment-block-authoring`: live reassessment found MCPENH-040, PEENH-007, and VALENH-011 inherited-BEL entries in addition to MCPENH-041. Those entries are same-seam documentation reconciliation and were absorbed here.
- The drafted broad package regression command was removed from the active acceptance surface. This ticket changed only skill and ticket prose; package-level tests were already the proof surface for the archived engine/validator tickets that landed the referenced IDs. The final proof here is grep/manual review against the current code surfaces and skill debt sections.
- The drafted no-match proof over the three uninvolved story skills was too broad because `branching-story-prose-attach` has a deliberate "No deferred-integration tickets named by this skill" note that names inherited landed infrastructure IDs. The accepted proof classifies that hit as non-debt rather than rewriting an uninvolved skill.
