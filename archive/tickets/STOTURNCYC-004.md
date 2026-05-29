# STOTURNCYC-004: character_grounding_consistency treats any STENT-grounded choice as character-specific, contradicting §11a "materially persona-dependent" intent

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `character_grounding_consistency` validator heuristic and focused validators tests.
**Deps**: None

## Problem

At intake, two emitted choices (CHC-6 "Name a lit, public place and offer to walk her only that far"; CHC-8 "Ask plainly who hurt her and what she's running from") failed the dry-run:

```
character_grounding_consistency.choice_missing_stchar:
CHC-6 is character-specific but grounded_in.records does not include an STCHAR.
```

Both grounded in `STENT-1, STENT-2` plus belief/thread records — ordinary **actor** grounding, not a claim that the choice's *surface* depends on Jon's persona profile. Before this ticket, the validator returned `true` from `isCharacterSpecificChoice` for **any** choice whose `grounded_in.records` contained a `STENT-` id. Because virtually every meaningful CHC grounds in its actor STENT, this forced nearly every choice to cite an STCHAR.

That contradicted the **documented intent**: §11a's CHC quality discipline says cite STCHAR "**Where a CHC's surface depends on** character-specific refusal / appetite / fear / relationship pressure / voice / plan / belief / emotion," and the validator's own doc note (SKILL/contract) says it fires "when a CHC's **text** indicates a persona-specific surface." §11a further warns the citation should be reserved for the **materially persona-dependent** case, not applied reflexively — a discipline the old blanket STENT rule defeated by diluting the signal.

## Assumption Reassessment (2026-05-29)

1. Historical intake evidence: `tools/validators/src/structural/character-grounding-consistency.ts` returned `true` immediately if any grounded record started with `STENT-`, *before* the text-keyword heuristic. The STENT short-circuit was the over-broad trigger.
2. `.claude/skills/_shared-templates/story-state-contract.md` §11a — "CHC quality discipline (judgment-territory)" and "Hard discipline vs warning vs judgment": "persona-specific CHCs must cite STCHAR (`character-grounding-consistency`)"; the surrounding text scopes this to choices whose *surface* is persona-specific, and explicitly frames STCHAR citation as a *materially-persona-dependent* requirement, not a blanket one.
3. `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` — "When a choice's wording, salience, refusal, appetite, pressure behavior, relationship conduct, or persona-specific risk depends on a character profile, cite the relevant active `STCHAR`." This is a *conditional* ("when … depends on"), not "whenever a STENT is grounded."
4. CHC schema `story-record-schemas.md` §4.5.12 — `grounded_in.records` lists STENT as a normal grounding class; grounding a choice in its actor STENT is the baseline, not a persona-specificity signal. The validator conflates "has an actor" with "is persona-specific."
5. FOUNDATIONS / schema-minimalism alignment: §2 schema-minimalism and §11a both push against reflexive over-citation. The blanket rule pushes authors to staple an STCHAR onto every choice, which is noise, not grounding.
6. Shared boundary under audit: the persona-specificity contract between (a) §11a, (b) the phase-8 reference, and (c) `character_grounding_consistency.isCharacterSpecificChoice`. Live reassessment picked the validator-narrowing end-state: drop the STENT short-circuit to match the documented text/persona-class heuristic, because that is the FOUNDATIONS/§11a-aligned intent.
7. Package checkpoint: `tools/validators/package.json` exposes `npm run build` and `npm test`; `npm test` builds before running `node --test dist/tests/**/*.test.js`. Pre-edit `npm test` passed on 2026-05-29. `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored package artifacts.
8. Sibling scope: `tickets/STOTURNCYC-005.md` is a separate world-mcp storylet-selection ergonomics ticket and is excluded from this validator heuristic slice.

## Architecture Check

1. Narrowing `isCharacterSpecificChoice` to the text-keyword heuristic makes the validator enforce what §11a actually wants — a meaningful "this choice's surface is persona-shaped" signal — rather than "this choice has an actor." This restores the citation's information value.
2. No shim: the change removes an over-broad branch rather than adding a compatibility path. The docs already state the chosen conditional contract, so no doc rewrite is required.

## Verification Layers

1. Heuristic no longer contradicts intent -> codebase grep-proof: `isCharacterSpecificChoice` no longer returns `true` solely on STENT grounding.
2. Non-persona actor choice passes -> validator unit test: a CHC grounded in `STENT` + `BEL` with neutral surface text passes without an STCHAR.
3. Persona-surface choice still caught -> validator unit test: a CHC whose text invokes voice/refusal/appetite without an STCHAR still fails.

## Landed Changes

### 1. Narrowed the validator
`character-grounding-consistency.ts` now decides CHC persona-specificity from the surface-text heuristic, not from the mere presence of `STENT-*` grounding. STPLAN/STEMO persona-derived-shape checks are unchanged.

### 2. Added regression coverage
`stchar-structural-validators.test.ts` now includes a neutral actor-grounded CHC that passes without STCHAR, while the existing persona-surface CHC/STPLAN/STEMO rejection coverage still passes.

## Files to Touch

- `tools/validators/src/structural/character-grounding-consistency.ts` (modify)
- `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify)

## Out of Scope

- STPLAN/STEMO `derived_from` persona-shape checks (lines 66-83, 101-112) — those are correctly scoped.

## Acceptance Criteria

### Tests That Passed

1. A CHC grounded in `STENT-1, BEL-1` with neutral surface text passes `character_grounding_consistency` without an STCHAR.
2. A CHC whose surface text invokes voice/refusal/appetite without an STCHAR still fails.
3. `cd tools/validators && npm test`.

### Invariants

1. The validator's persona-specificity trigger no longer treats ordinary actor STENT grounding as persona-specific, preserving the §11a/phase-8 materially persona-dependent citation boundary.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/` character-grounding case: neutral actor-grounded CHC → pass (asserts the narrowed heuristic).
2. `tools/validators/tests/` character-grounding case: persona-surface CHC without STCHAR → fail (asserts the signal is preserved).

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/stchar-structural-validators.test.js`
3. `cd tools/validators && npm test`
4. The validator unit test is the correct boundary because the heuristic is internal and reproducible without a full bundle; direct `validate-patch-plan` smoke is not required because this ticket does not change envelope construction, handler wiring, or pre-apply overlay materialization.

## Outcome

`character_grounding_consistency` no longer treats actor STENT grounding as sufficient proof that a CHC surface is persona-specific. Neutral actor-grounded choices can pass without STCHAR, and CHCs caught by the surface-text persona heuristic, STPLAN persona-derived shapes, and STEMO persona-derived shapes still require STCHAR provenance.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/stchar-structural-validators.test.js` — passed; 13 tests passed, including the new neutral actor-grounded CHC acceptance case and the existing persona-surface rejection case.
3. `cd tools/validators && npm test` — passed; 1064 tests passed.
4. `if rg -n 'id\.startsWith\(\"STENT-\"\)' tools/validators/src/structural/character-grounding-consistency.ts; then exit 1; fi` — passed with no matches, proving the STENT starts-with short-circuit is gone.

## Deviations

1. The drafted direct `validate-patch-plan` smoke was not run. Focused validator unit coverage plus the full validators package suite is the truthful boundary because this ticket changed only the validator heuristic and tests, not envelope construction, handler wiring, or pre-apply overlay materialization.
2. `.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` were inspected but not edited; they already state the conditional persona-dependent STCHAR citation contract selected by this ticket.
3. `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored package artifacts; `dist/` was refreshed by build/test commands as expected verification output.
