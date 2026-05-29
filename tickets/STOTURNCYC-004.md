# STOTURNCYC-004: character_grounding_consistency treats any STENT-grounded choice as character-specific, contradicting §11a "materially persona-dependent" intent

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `character_grounding_consistency` validator heuristic and/or `_shared-templates/story-state-contract.md` §11a + turn-cycle phase-8 reference (reconcile one to the other).
**Deps**: None

## Problem

Two emitted choices (CHC-6 "Name a lit, public place and offer to walk her only that far"; CHC-8 "Ask plainly who hurt her and what she's running from") failed the dry-run:

```
character_grounding_consistency.choice_missing_stchar:
CHC-6 is character-specific but grounded_in.records does not include an STCHAR.
```

Both grounded in `STENT-1, STENT-2` plus belief/thread records — ordinary **actor** grounding, not a claim that the choice's *surface* depends on Jon's persona profile. The validator (`character-grounding-consistency.ts:85-88`) returns `true` from `isCharacterSpecificChoice` for **any** choice whose `grounded_in.records` contains a `STENT-` id. Because virtually every meaningful CHC grounds in its actor STENT, this forces nearly every choice to cite an STCHAR.

That contradicts the **documented intent**: §11a's CHC quality discipline says cite STCHAR "**Where a CHC's surface depends on** character-specific refusal / appetite / fear / relationship pressure / voice / plan / belief / emotion," and the validator's own doc note (SKILL/contract) says it fires "when a CHC's **text** indicates a persona-specific surface." §11a further warns the citation should be reserved for the **materially persona-dependent** case, not applied reflexively — a discipline this blanket STENT rule actively defeats by diluting the signal.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/structural/character-grounding-consistency.ts:85-99` — `isCharacterSpecificChoice` returns `true` immediately if any grounded record starts with `STENT-` (lines 86-88), *before* the text-keyword heuristic (lines 89-98, matching `\b(character|persona|voice|speaker|dialogue|relationship|emotion|appraisal|pressure)\b`). The STENT short-circuit is the over-broad trigger.
2. `.claude/skills/_shared-templates/story-state-contract.md` §11a — "CHC quality discipline (judgment-territory)" and "Hard discipline vs warning vs judgment": "persona-specific CHCs must cite STCHAR (`character-grounding-consistency`)"; the surrounding text scopes this to choices whose *surface* is persona-specific, and explicitly frames STCHAR citation as a *materially-persona-dependent* requirement, not a blanket one.
3. `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` — "When a choice's wording, salience, refusal, appetite, pressure behavior, relationship conduct, or persona-specific risk depends on a character profile, cite the relevant active `STCHAR`." This is a *conditional* ("when … depends on"), not "whenever a STENT is grounded."
4. CHC schema `story-record-schemas.md` §4.5.12 — `grounded_in.records` lists STENT as a normal grounding class; grounding a choice in its actor STENT is the baseline, not a persona-specificity signal. The validator conflates "has an actor" with "is persona-specific."
5. FOUNDATIONS / schema-minimalism alignment: §2 schema-minimalism and §11a both push against reflexive over-citation. The blanket rule pushes authors to staple an STCHAR onto every choice, which is noise, not grounding.
6. Shared boundary under audit: the persona-specificity contract between (a) §11a, (b) the phase-8 reference, and (c) `character_grounding_consistency.isCharacterSpecificChoice`. The two valid end-states are mutually exclusive; the ticket must pick one. Recommendation: narrow the validator (drop the STENT short-circuit) to match the documented text/persona-class heuristic, because that is the FOUNDATIONS/§11a-aligned intent.

## Architecture Check

1. Narrowing `isCharacterSpecificChoice` to the text-keyword heuristic (and/or grounding in an actual persona-class signal) makes the validator enforce what §11a actually wants — a meaningful "this choice's surface is persona-shaped" signal — rather than "this choice has an actor." This restores the citation's information value.
2. No shim: the change removes an over-broad branch rather than adding a compatibility path. If instead the maintainer keeps the blanket rule, the alternative is a pure-doc change (no shim either).

## Verification Layers

1. Heuristic matches intent -> codebase grep-proof: `isCharacterSpecificChoice` no longer returns `true` solely on STENT grounding (or §11a/phase-8 are amended to state the blanket rule verbatim).
2. Non-persona actor choice passes -> skill dry-run: a CHC grounded in `STENT` + `BEL`/`THR` with neutral surface text passes without an STCHAR.
3. Persona-surface choice still caught -> validator unit test: a CHC whose text invokes voice/refusal/appetite without an STCHAR still fails.

## What to Change

### 1. (Recommended) Narrow the validator
In `character-grounding-consistency.ts`, remove the blanket `STENT-` short-circuit so persona-specificity is decided by the text heuristic (lines 89-98) and/or grounding in an actual persona-bearing signal, matching §11a. Keep the STPLAN/STEMO persona-derived-shape checks unchanged.

### 2. (Alternative, if maintainer prefers the strict rule) Update the docs
Amend §11a and the phase-8 reference to state plainly: "Any CHC grounded in a STENT MUST also cite that actor's STCHAR." Then the docs stop contradicting the implementation. (Less FOUNDATIONS-aligned; recorded for completeness.)

## Files to Touch

- `tools/validators/src/structural/character-grounding-consistency.ts` (modify) — under recommended option 1
- `.claude/skills/_shared-templates/story-state-contract.md` (modify, §11a) — under option 2, or a clarifying note under option 1
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify) — align wording to the chosen end-state
- `tools/validators/tests/` (new/modified test)

## Out of Scope

- STPLAN/STEMO `derived_from` persona-shape checks (lines 66-83, 101-112) — those are correctly scoped.

## Acceptance Criteria

### Tests That Must Pass

1. A CHC grounded in `STENT-1, BEL-2` with neutral surface text passes `character_grounding_consistency` without an STCHAR (option 1), OR §11a/phase-8 verbatim state the blanket requirement (option 2).
2. A CHC whose surface text invokes voice/refusal/appetite without an STCHAR still fails.
3. `cd tools/validators && npm test`.

### Invariants

1. The validator's persona-specificity trigger and the §11a/phase-8 documented trigger are identical.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/` character-grounding case: neutral actor-grounded CHC → pass (asserts the narrowed heuristic).
2. `tools/validators/tests/` character-grounding case: persona-surface CHC without STCHAR → fail (asserts the signal is preserved).

### Commands

1. `cd tools/validators && npm run build && npm test`
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <envelope with a neutral actor-grounded CHC>` returns no `choice_missing_stchar`.
3. The validator unit test is the correct boundary because the heuristic is internal and reproducible without a full bundle.
