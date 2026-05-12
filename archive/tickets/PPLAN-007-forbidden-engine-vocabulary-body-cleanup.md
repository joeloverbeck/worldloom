# PPLAN-007: Drop `forbidden_engine_vocabulary` body enumeration; one-line negative discipline in §18

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — edits canonical page-plan template §18 / §19 body comments and both phase-7 references. Frontmatter `forbidden_engine_vocabulary[]` is unchanged.
**Deps**: None directly. Pairs with `archive/tickets/PPLAN-002-mystery-enumeration-restriction.md` (the completed §18 DO NOT REVEAL mystery surface this ticket also touches), completed `archive/tickets/PPLAN-005-slt-schema-to-prose-translation.md` (the §15 cleanup), and completed `archive/tickets/PPLAN-006-obligations-threads-consequences-prose-translation.md` (the §10/§11/§12 cleanup) as the renderer-facing body cleanup tier.

## Problem

At intake, `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-0003.md` frontmatter `forbidden_engine_vocabulary[]` (lines 74-102) enumerated 28 internal record-id prefixes the renderer must not use in prose:

```
CF-NNNN, CH-NNNN, CHAR-NNNN, DA-NNNN, SF-NNNN, OBL-NNNN, THR-NNNN, SREL-NNNN,
STINT-NNNN, SE-NNNN, SLT-NNNN, CHC-NNNN, PG-NNNN, BR-NNNN, STLOC-NNNN, STOBJ-NNNN,
STENT-NNNN, ARCTRACE-NNNN, INV-N, ONT-N, CAU-N, SOC-N, AES-N, DIS-N, M-NNNN,
OQ-NNNN, ENT-NNNN, SEC-*
```

At intake, body-side prompt surfaces mirrored or reasserted the same negative discipline:
- §18 DO NOT REVEAL last bullet (line 802): *"All engine vocabulary tokens (the forbidden_engine_vocabulary list in the frontmatter). The character does not know they live inside a ledger. The interior may name a *bruise*, a *secret*, a *promise*, a *threat* — never a record id, never a hyphenated record-id-compound (no "the saturation-substrate-of-consciousness register"; no "the SOC-2 floor"; no "the CAU-2 secrecy charge")."*
- §3 Prose Craft Contract Rule 9 (`no ledger-jargon in prose, ever`) explicitly tells the LLM about the engine ledger.
- §19 Render-time instruction block reasserted the generic negative discipline without a dedicated record-identifier sentence.

This was the same "don't think of a pink elephant" pathology as the archived PPLAN-002 mystery-list problem. By enumerating 28 prefix patterns the renderer should never use, the plan introduced 28 vocabulary tokens as candidates the renderer had to remember to suppress. The renderer in a clean rendering would never invent these prefixes (the prefix vocabulary is engine-internal — no natural prose ever produces "CF-NNNN" or "ARCTRACE-NNNN"). The enumeration taught what to suppress rather than what to render.

`§3 Rule 9` "no ledger-jargon" is verbatim-inlined per the canonical Prose Craft Contract and stays per [[feedback-page-plan-verbatim-sections]] — the user requires §3 to remain verbatim. This ticket cleans the §18 / Phase 7 body-list re-enumeration and gives §19 the same one-line record-identifier negative without compacting §3.

## Assumption Reassessment (2026-05-12)

1. **Frontmatter `forbidden_engine_vocabulary[]` is read by `branching-story-page-prose-finalize` Phase 2.** Verified: `.claude/skills/branching-story-page-prose-finalize/references/phase-1-plan-prose-pairing.md:78`: *"Plan frontmatter cached for Phase 2's `forbidden_engine_vocabulary` and `forbidden_resolutions` reads"*. Phase 2 runs the deterministic prefix regex scan over rendered prose. The frontmatter list is the validator-bearing surface.
2. **Body §18 / Phase 7 scene-direction re-enumeration adds no validator value.** Verified by reading both phase-7 references and the canonical template — no validator gate depends on the body §18 prose or Phase 7 prompt-assembly parenthetical. The §3 Prose Craft Contract Rule 9 inlined per [[feedback-page-plan-verbatim-sections]] is the renderer-facing principle; the §18 / Phase 7 re-enumeration is redundant overhead.
3. **`§3 Prose Craft Contract` Rule 9 stays as inlined.** Per [[feedback-page-plan-verbatim-sections]] — §2 / §3 / §19 are inlined verbatim from `reports/prose-quality-instructions.md` and must remain so. The external LLM renders each page cold; §3 Rule 9 is the renderer-facing principle that survives every page. THIS TICKET DOES NOT REDUCE §3.
4. **The §19 render-time-instruction block is verbatim-inlined** per [[feedback-page-plan-verbatim-sections]] and `.claude/skills/_shared-templates/page-plan.md` template comment lines 12-14. Edits to §19 require coordination with the canonical source at `reports/prose-quality-instructions.md` §"Render-Time Instruction Template" rather than per-skill modification. Reassessment correction: live §19 did not carry the 28-prefix list; it had only generic "No engine vocabulary" wording. THIS TICKET adds the one-line internal-record-identifier negative to the canonical §19 source without compacting §3 Rule 9.
5. **Shared boundary under audit**: §18 last bullet (per-plan-author content) + §19 render-time-instruction block (verbatim from `reports/prose-quality-instructions.md`) + the canonical template's §18 comment in `.claude/skills/_shared-templates/page-plan.md` (around lines 217-219) + both Phase 7 prompt-assembly scene-direction parentheticals. The §19 site routes through the upstream prose-quality-instructions source.
6. **FOUNDATIONS principle under audit**: §Story Bundles §4 (frontmatter is engine-bearing — `forbidden_engine_vocabulary[]` belongs there). The cleanup is body-shape hygiene.

## Architecture Check

1. The negative discipline becomes one renderer-facing sentence: *"Do not use internal record-identifier vocabulary in the prose."* No enumeration. The frontmatter list remains the engine surface. The §3 Rule 9 principle (preserved verbatim) is the craft-level discipline. Three layers of discipline reduce to two with no loss.
2. No backwards-compatibility shims. Frontmatter is unchanged; existing rendered plans with the verbose §18 / §19 body remain valid. Phase 2 finalize regex scan continues to fire on rendered-prose record-id leakage.

## Verification Layers

1. **§18 DO NOT REVEAL body bullet replaced with one-line negative** → codebase grep-proof: `rg -n 'frontmatter forbidden_engine_vocabulary list|engine-vocabulary tokens list from frontmatter' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` returns no hits.
2. **§19 render-time-instruction block updated at the canonical source** → codebase grep-proof: `rg -n 'internal record-identifier vocabulary' reports/prose-quality-instructions.md .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` returns the simplified directive across the source and body-authoring surfaces.
3. **Phase 2 finalize forbidden-engine-vocabulary regex scan remains frontmatter-driven and unchanged** → manual contract review of `.claude/skills/branching-story-page-prose-finalize/references/phase-2-deterministic-pre-critic.md` confirms the deterministic regex still reads `plan.forbidden_engine_vocabulary[]`.
4. **Skill dry-run substitute** → manual populated-template contract review verifies next plans authored from the shared template and Phase 7 references produce §18 / §19 without the frontmatter-list body parenthetical. No executable skill runner exists in this repo for a side-effect-free PG-0004 dry-run.

## Landed Changes

### 1. `.claude/skills/_shared-templates/page-plan.md` §18 comment (lines 217-219)

Kept the existing engaged-mystery posture bullet from archived PPLAN-002, and replaced:
> `- engine vocabulary tokens (frontmatter forbidden_engine_vocabulary list) -->`

with:
> `- "Do not use internal record-identifier vocabulary in the prose" (the literal 28-prefix list is engine-internal — surfaced in frontmatter forbidden_engine_vocabulary[] for branching-story-page-prose-finalize Phase 2's deterministic regex scan; the renderer-facing rule is the one-line negative). The §3 Prose Craft Contract Rule 9 ("no ledger-jargon in prose, ever") is the craft-level discipline that survives every page verbatim per [[feedback-page-plan-verbatim-sections]] — DO NOT compact it.`

### 2. `reports/prose-quality-instructions.md` §"Render-Time Instruction Template"

Added the one-line negative ("Do not use internal record-identifier vocabulary in the prose") to the §19 instruction body in the canonical source. Confirmed the §3 Prose Craft Contract Rule 9 surface is unchanged (the rule body remains the renderer-facing craft directive).

### 3. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (around lines 54-55)

Updated the scene-direction prompt-assembly bullet away from the drafted M-list / engine-vocabulary-list parenthetical:

> `[scene direction — REQUIRED TURN, STOPPING POINT, DO NOT REVEAL (the engaged-mystery list per §7 engaged-mystery filter, NOT the complete frontmatter list; one-line "do not use record-identifier vocabulary" negative discipline, NOT the 28-prefix enumeration)]`

### 4. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md`

Added the parallel update at the root case.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (modify — §18 comment)
- `reports/prose-quality-instructions.md` (modify — Render-Time Instruction Template one-line negative)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify — prompt-assembly scene-direction bullet)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify — root-case parallel)

## Out of Scope

- §3 Prose Craft Contract Rule 9 ("no ledger-jargon in prose, ever") — preserved verbatim per [[feedback-page-plan-verbatim-sections]]. This ticket does NOT compact §3.
- Frontmatter `forbidden_engine_vocabulary[]` enumeration (unchanged — remains the validator surface).
- Phase 2 finalize regex scan logic (unchanged — continues to read the frontmatter list).
- Re-authoring of existing rendered plans.

## Acceptance Criteria

### Tests That Must Pass

1. Canonical template `.claude/skills/_shared-templates/page-plan.md` §18 comment carries the one-line negative discipline and does NOT re-enumerate the 28 prefixes.
2. `reports/prose-quality-instructions.md` §"Render-Time Instruction Template" carries the one-line negative.
3. Phase 7 prompt-assembly scene-direction bullet (both bootstrap root and page-cycle) reflects the new shape.
4. Phase 2 finalize forbidden-engine-vocabulary regex scan remains frontmatter-driven and unchanged.
5. Manual populated-template contract review proves §18 / §19 and both Phase 7 prompt-assembly surfaces no longer ask the plan author to carry the frontmatter engine-vocabulary list into the body.

### Invariants

1. Frontmatter `forbidden_engine_vocabulary[]` continues to carry the 28-prefix list verbatim.
2. Phase 2 finalize regex scan reads the frontmatter list and is unchanged.
3. §3 Prose Craft Contract Rule 9 ("no ledger-jargon in prose, ever") remains in §3 verbatim — surviving every page per the external-LLM-cold-context constraint.

## Test Plan

### New/Modified Tests

1. None — skill/template contract cleanup; verification is grep-proof plus manual contract review of the unchanged Phase 2 deterministic scan.

### Commands

1. `rg -n 'frontmatter forbidden_engine_vocabulary list|engine-vocabulary tokens list from frontmatter' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` — stale body-list parentheticals are absent.
2. `rg -n 'internal record-identifier vocabulary' reports/prose-quality-instructions.md .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` — the one-line negative is present at the canonical source and body-authoring surfaces.
3. Manual review of `.claude/skills/branching-story-page-prose-finalize/references/phase-2-deterministic-pre-critic.md` — Phase 2 still reads `plan.forbidden_engine_vocabulary[]` and retains the regex scan.

## Outcome

Completion date: 2026-05-12

Completed the forward page-plan body cleanup:

1. `.claude/skills/_shared-templates/page-plan.md` §18 now carries only the one-line renderer-facing record-identifier negative while leaving the literal prefix list in frontmatter for finalize Phase 2.
2. `reports/prose-quality-instructions.md` §"Render-Time Instruction Template" now includes the same one-line negative, so future §19 inlining inherits the cleaner shape.
3. Both Phase 7 references now tell plan authors not to carry the frontmatter `forbidden_engine_vocabulary[]` prefix list into the plan body.
4. `branching-story-page-prose-finalize` Phase 2 was intentionally unchanged; its deterministic scan remains frontmatter-driven.

## Verification Result

1. `rg -n 'frontmatter forbidden_engine_vocabulary list|engine-vocabulary tokens list from frontmatter' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` — PASS; no stale body-list parenthetical remains in the active body-authoring surfaces.
2. `rg -n 'internal record-identifier vocabulary' reports/prose-quality-instructions.md .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` — PASS; four hits, one each in the canonical §19 source, the shared template §18, and both Phase 7 references.
3. Manual review of `.claude/skills/branching-story-page-prose-finalize/references/phase-2-deterministic-pre-critic.md` — PASS; Phase 2 still reads `plan.forbidden_engine_vocabulary[]`, keeps the deterministic literal-token regex, and preserves the hard-fail leakage behavior.

## Deviations

The drafted PG-0004 side-effect-free skill dry-run was replaced with manual populated-template contract review because this repo has no executable runner for invoking the story skills without mutating a live story bundle. The §19 reassessment also found no live 28-prefix enumeration inside `reports/prose-quality-instructions.md`; the landed change adds the one-line negative there instead of replacing a nonexistent list.
