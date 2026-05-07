# SPEC20SCECOM-006: Phase 1 — Write-In Commitment-Class Classification

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` extended with §Write-In Commitment-Class Classification subsection after the existing four-way routing.
**Deps**: `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22 §Track 3 implements the `commitment_class` enum in canonical-vocabularies — the classifier's enum-bound output relies on this surface)

## Problem

At intake, Phase 1 Path B (write-in handling) routed free-form `manual_action_text` via four-way routing (`ACCEPT` / `ACCEPT_BUT_TRANSFORM` / `TREAT_AS_ATTEMPT` / `REFUSE_ONLY_THROUGH_WORLD_LOGIC`) but did not document the SPEC-20 §G commitment-class classifier. Under the scene-commitment-arc pivot, write-ins must additionally classify into the `commitment_class` enum so Phase 4's hard filter 6 (`arc.arc_contract.commitment_class` matches the chosen CHC's commitment_class OR the classified write-in commitment-class) can apply uniformly across Path A (CHC selection) and Path B (write-in). Without the classifier, write-ins would bypass arc-cadence discipline — a write-in is a commitment, not a beat-action.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` exists and houses Path B's existing four-way routing prose; the §Write-In Commitment-Class Classification subsection is additive (placed after the four-way routing decision; preserves existing routing semantics).
2. Verified archived SPEC-19 §E defines `commitment_class` as a closed 20-value enum (`stay_available_without_pressure`, `offer_practical_help`, `ask_one_bounded_question`, …, `intimacy_advance`); SPEC-22 §Track 3 owns the TypeScript enum implementation and the `mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'})` retrieval surface.
3. Cross-skill boundary: this ticket consumes the closed `commitment_class` enum via SPEC-22's `get_canonical_vocabulary` MCP tool; produces a classified commitment-class value handed to SPEC20SCECOM-001 Phase 4 hard filter 6. The contract is the enum exhaustiveness — if the LLM classifier's output is not in the enum, the engine routes via `REFUSE_ONLY_THROUGH_WORLD_LOGIC` even if Step 1 said `ACCEPT`.
4. Parent `branching-story-page-cycle/SKILL.md` process-flow integration remains SPEC20SCECOM-009 scope. This ticket owns only the Phase 1 reference subsection; SPEC20SCECOM-009 already tracks the parent Process Flow and phase-description update after all phase reference files land.
5. Verification-boundary correction: the drafted skill dry-run / fixture assertions are not executable yet because SPEC-22's v2 runtime validators and SPEC20SCECOM-011 capstone fixture lane remain pending. This ticket's truthful proof is documentation-surface grep plus manual contract review against SPEC-20 §G, SPEC-22 Track 3, archived SPEC-19 §E, and the existing Phase 4 consumer hard filter in `phase-4-storylet-and-mystery-authority.md`.

## Architecture Check

1. The classifier runs AFTER the existing four-way routing decision, not in place of it — preserves the existing routing semantics while layering the commitment-class discipline. A write-in that the four-way routing accepts but the commitment-classifier cannot bind is a sign that the action does not fit any commitment-class shape; routing via `REFUSE_ONLY_THROUGH_WORLD_LOGIC` is a safe default that preserves the user's intent (the action remains in-world; the arc filter applies a refusal envelope rather than a commitment envelope).
2. No backwards-compatibility aliasing/shims: pre-pivot write-ins did not need commitment-class classification because Phase 4 was beat-granular; post-cutover, Phase 4 hard filter 6 requires the classified value, so the classifier is mandatory.

## Verification Layers

1. §Write-In Commitment-Class Classification subsection exists in `phase-1-choice-resolution.md` → codebase grep-proof for the new subsection anchor.
2. Classifier output is enum-bound → documentation grep-proof plus manual contract review against SPEC-22 Track 3 and archived SPEC-19 §E; runtime schema validation remains SPEC20SCECOM-011 capstone scope.
3. REFUSE_ONLY_THROUGH_WORLD_LOGIC fallback → codebase grep-proof in the same file for the fallback rule.

## Landed Changes

### 1. §Write-In Commitment-Class Classification

In `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`, added a new subsection after the existing four-way routing prose:

> ### B.4 Write-In Commitment-Class Classification
>
> After the routing decision, an additional commitment-class classification step runs:
>
> 1. The LLM parser reads the user's free-form `manual_action_text`, the routing verdict, and the arc-eligible `commitment_class` enum (loaded via `mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'})`).
> 2. It classifies the manual action's intended commitment into ONE entry of the `commitment_class` enum.
> 3. If classification fails (the action does not fit any commitment class), the engine routes via `REFUSE_ONLY_THROUGH_WORLD_LOGIC` even if Step 1 said `ACCEPT`.
>
> The classified `commitment_class` is handed to Phase 4 as an arc-selection filter. See `phase-4-storylet-and-mystery-authority.md` §Hard Filters for the consumer-side filter. This ensures write-ins do not bypass the arc-cadence discipline — a write-in is a commitment, not a beat-action.

### 2. Cross-reference Phase 4

Added a cross-reference pointer at the end of the new subsection to `phase-4-storylet-and-mystery-authority.md` §Hard Filters for the consumer-side `arc.arc_contract.commitment_class` filter.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` (modify)

## Out of Scope

- `commitment_class` enum implementation in canonical-vocabularies (SPEC-22 §Track 3).
- `mcp__worldloom__get_canonical_vocabulary` extension (SPEC-22 §Track 3).
- Phase 4 hard filter 6 (SPEC20SCECOM-001).
- LLM classifier prompt template (engine-side; not a documentation deliverable).

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: `phase-1-choice-resolution.md` contains the §Write-In Commitment-Class Classification subsection after the existing four-way routing.
2. Documentation proof: the subsection states classifier output must be one closed `commitment_class` enum entry and that classification failure routes via `REFUSE_ONLY_THROUGH_WORLD_LOGIC`.
3. Documentation proof: the subsection points to Phase 4's consumer hard filter in `phase-4-storylet-and-mystery-authority.md`.

### Invariants

1. The classifier's output value is an entry of the closed `commitment_class` enum (else `REFUSE_ONLY_THROUGH_WORLD_LOGIC` fires).
2. The four-way routing decision is preserved as the FIRST decision; commitment-class classification is the SECOND decision (additive layer).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual contract review. Full-pipeline empirical verification owned by SPEC20SCECOM-011 capstone.

### Commands

1. `grep -n "Write-In Commitment-Class Classification" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` — confirms the subsection anchor is present.
2. `grep -n "REFUSE_ONLY_THROUGH_WORLD_LOGIC" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` — confirms fallback rule is documented.
3. `grep -n "phase-4-storylet-and-mystery-authority.md" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` — confirms the cross-reference pointer to Phase 4 is present.

## Outcome

Completed: 2026-05-07. `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` now documents the Phase 1 Path B write-in commitment-class classifier after the existing four-way routing decision.

The new subsection states that the parser consumes `manual_action_text`, the routing verdict, and the closed `commitment_class` enum from `mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'})`; emits exactly one legal enum value; and falls back through `REFUSE_ONLY_THROUGH_WORLD_LOGIC` when classification cannot bind. It also points Phase 1 readers to Phase 4's consumer hard filter.

## Verification Result

1. PASS — `grep -n "Write-In Commitment-Class Classification" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`.
2. PASS — `grep -n "REFUSE_ONLY_THROUGH_WORLD_LOGIC" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`.
3. PASS — `grep -n "phase-4-storylet-and-mystery-authority.md" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`.
4. PASS — `grep -n "mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'})" .claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`.
5. PASS — manual review against `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` §G, `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` Track 3, `archive/specs/SPEC-19-scene-commitment-arc-schema.md` §E, and `phase-4-storylet-and-mystery-authority.md` §Hard Filters confirmed the reference matches the closed-enum and Phase 4 consumer contract.

## Deviations

1. The drafted skill dry-run / fixture assertions were not executed because the live repo still lacks the SPEC-22 v2 runtime validators and SPEC20SCECOM-011 capstone fixture surface. This ticket's accepted proof is documentation-surface grep plus manual contract review.
2. Parent `.claude/skills/branching-story-page-cycle/SKILL.md` process-flow and phase-description integration remains SPEC20SCECOM-009 scope; this ticket intentionally touched only the Phase 1 reference.
