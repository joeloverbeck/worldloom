# PPLAN-007: Drop `forbidden_engine_vocabulary` body enumeration; one-line negative discipline in §18

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — edits canonical page-plan template §18 / §19 body comments and both phase-7 references. Frontmatter `forbidden_engine_vocabulary[]` is unchanged.
**Deps**: None directly. Pairs with `archive/tickets/PPLAN-002-mystery-enumeration-restriction.md` (the completed §18 DO NOT REVEAL mystery surface this ticket also touches), completed `archive/tickets/PPLAN-005-slt-schema-to-prose-translation.md` (the §15 cleanup), and PPLAN-006 (the §10/§11/§12 cleanup) as the renderer-facing body cleanup tier.

## Problem

`worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-0003.md` frontmatter `forbidden_engine_vocabulary[]` (lines 74-102) enumerates 28 internal record-id prefixes the renderer must not use in prose:

```
CF-NNNN, CH-NNNN, CHAR-NNNN, DA-NNNN, SF-NNNN, OBL-NNNN, THR-NNNN, SREL-NNNN,
STINT-NNNN, SE-NNNN, SLT-NNNN, CHC-NNNN, PG-NNNN, BR-NNNN, STLOC-NNNN, STOBJ-NNNN,
STENT-NNNN, ARCTRACE-NNNN, INV-N, ONT-N, CAU-N, SOC-N, AES-N, DIS-N, M-NNNN,
OQ-NNNN, ENT-NNNN, SEC-*
```

The body then mirrors this in two places:
- §18 DO NOT REVEAL last bullet (line 802): *"All engine vocabulary tokens (the forbidden_engine_vocabulary list in the frontmatter). The character does not know they live inside a ledger. The interior may name a *bruise*, a *secret*, a *promise*, a *threat* — never a record id, never a hyphenated record-id-compound (no "the saturation-substrate-of-consciousness register"; no "the SOC-2 floor"; no "the CAU-2 secrecy charge")."*
- §3 Prose Craft Contract Rule 9 (`no ledger-jargon in prose, ever`) explicitly tells the LLM about the engine ledger.
- §19 Render-time instruction block re-asserts the negative discipline.

This is the same "don't think of a pink elephant" pathology as the archived PPLAN-002 mystery-list problem. By enumerating 28 prefix patterns the renderer should never use, the plan introduces 28 vocabulary tokens as candidates the renderer must remember to suppress. The renderer in a clean rendering would never invent these prefixes (the prefix vocabulary is engine-internal — no natural prose ever produces "CF-NNNN" or "ARCTRACE-NNNN"). The enumeration teaches what to suppress rather than what to render.

`§3 Rule 9` "no ledger-jargon" is verbatim-inlined per the canonical Prose Craft Contract and stays per [[feedback-page-plan-verbatim-sections]] — the user requires §3 to remain verbatim. The §18 / §19 negative-discipline re-enumeration is what this ticket cleans.

## Assumption Reassessment (2026-05-12)

1. **Frontmatter `forbidden_engine_vocabulary[]` is read by `branching-story-page-prose-finalize` Phase 2.** Verified: `.claude/skills/branching-story-page-prose-finalize/references/phase-1-plan-prose-pairing.md:78`: *"Plan frontmatter cached for Phase 2's `forbidden_engine_vocabulary` and `forbidden_resolutions` reads"*. Phase 2 runs the deterministic prefix regex scan over rendered prose. The frontmatter list is the validator-bearing surface.
2. **Body §18 / §19 re-enumeration adds no validator value.** Verified by reading both phase-7 references and the canonical template — no validator gate depends on the body §18/§19 prose. The §3 Prose Craft Contract Rule 9 inlined per [[feedback-page-plan-verbatim-sections]] is the renderer-facing principle; the §18/§19 re-enumeration is redundant overhead.
3. **`§3 Prose Craft Contract` Rule 9 stays as inlined.** Per [[feedback-page-plan-verbatim-sections]] — §2 / §3 / §19 are inlined verbatim from `reports/prose-quality-instructions.md` and must remain so. The external LLM renders each page cold; §3 Rule 9 is the renderer-facing principle that survives every page. THIS TICKET DOES NOT REDUCE §3.
4. **The §19 render-time-instruction block is verbatim-inlined** per [[feedback-page-plan-verbatim-sections]] and `.claude/skills/_shared-templates/page-plan.md` template comment lines 12-14. Edits to §19 require coordination with the canonical source at `reports/prose-quality-instructions.md` §"Render-Time Instruction Template" rather than per-skill modification. THIS TICKET'S §19 changes go through that canonical source.
5. **Shared boundary under audit**: §18 last bullet (per-plan-author content) + §19 render-time-instruction block (verbatim from `reports/prose-quality-instructions.md`) + the canonical template's §18 comment in `.claude/skills/_shared-templates/page-plan.md` (around lines 217-219). Three editing sites; the §19 site routes through the upstream prose-quality-instructions source.
6. **FOUNDATIONS principle under audit**: §Story Bundles §4 (frontmatter is engine-bearing — `forbidden_engine_vocabulary[]` belongs there). The cleanup is body-shape hygiene.

## Architecture Check

1. The negative discipline becomes one renderer-facing sentence: *"Do not use internal record-identifier vocabulary in the prose."* No enumeration. The frontmatter list remains the engine surface. The §3 Rule 9 principle (preserved verbatim) is the craft-level discipline. Three layers of discipline reduce to two with no loss.
2. No backwards-compatibility shims. Frontmatter is unchanged; existing rendered plans with the verbose §18 / §19 body remain valid. Phase 2 finalize regex scan continues to fire on rendered-prose record-id leakage.

## Verification Layers

1. **§18 DO NOT REVEAL body bullet replaced with one-line negative** → codebase grep-proof: `grep -n 'forbidden_engine_vocabulary' .claude/skills/_shared-templates/page-plan.md` does NOT return body-level enumeration; the frontmatter section continues to declare the field.
2. **§19 render-time-instruction block updated at the canonical source** → codebase grep-proof: `grep -nE 'record-identifier|ledger jargon' reports/prose-quality-instructions.md` returns the simplified directive; per-plan §19 inlining picks up the cleaner shape on next plan author.
3. **Phase 2 finalize forbidden-engine-vocabulary regex scan continues to fire** → contrived test: insert "CF-0006" verbatim into a rendered `pages-prose/PG-NNNN.md`; `branching-story-page-prose-finalize` Phase 2 HARD-FAIL-rejects.
4. **Skill dry-run on PG-0004** of `worlds/erotica-world/stories/red-bunny` produces §18 without the 28-prefix re-enumeration; §19 inherits the cleaner shape.

## What to Change

### 1. `.claude/skills/_shared-templates/page-plan.md` §18 comment (lines 217-219)

Replace:
> `- <list of M-NNNN forbidden resolutions, with one-line summary of what each forbids>`
> `- engine vocabulary tokens (frontmatter forbidden_engine_vocabulary list) -->`

with:
> `- mysteries the renderer is in semantic risk of touching this page (carry the per-mystery posture cues from §7; do NOT collapse into a flat "never mention" list — see archive/tickets/PPLAN-002-mystery-enumeration-restriction.md for the engaged-mystery filter rule that drives §7)`
> `- "Do not use internal record-identifier vocabulary in the prose" (the literal 28-prefix list is engine-internal — surfaced in frontmatter forbidden_engine_vocabulary[] for branching-story-page-prose-finalize Phase 2's deterministic regex scan; the renderer-facing rule is the one-line negative). The §3 Prose Craft Contract Rule 9 ("no ledger-jargon in prose, ever") is the craft-level discipline that survives every page verbatim per [[feedback-page-plan-verbatim-sections]] — DO NOT compact it.`

### 2. `reports/prose-quality-instructions.md` §"Render-Time Instruction Template"

This is the canonical source for §19. Search for any 28-prefix enumeration and replace with the one-line negative ("Do not use internal record-identifier vocabulary in the prose"). Confirm the §3 Prose Craft Contract Rule 9 surface is unchanged (the rule body is the renderer-facing craft directive).

### 3. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (around lines 54-55)

Update the `[scene direction — REQUIRED TURN, STOPPING POINT, DO NOT REVEAL (the M-NNNN forbidden list and engine-vocabulary tokens list from frontmatter)]` prompt-assembly bullet:

> `[scene direction — REQUIRED TURN, STOPPING POINT, DO NOT REVEAL (the engaged-mystery list per §7 engaged-mystery filter, NOT the complete frontmatter list; one-line "do not use record-identifier vocabulary" negative discipline, NOT the 28-prefix enumeration)]`

### 4. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md`

Add the parallel update at the root case.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (modify — §18 comment)
- `reports/prose-quality-instructions.md` (modify — Render-Time Instruction Template section, if it carries the 28-prefix enumeration)
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
4. Phase 2 finalize forbidden-engine-vocabulary regex scan continues to HARD-FAIL on rendered prose carrying any of the 28 prefixes.
5. Skill dry-run on PG-0004 of `worlds/erotica-world/stories/red-bunny` produces §18 / §19 without 28-prefix body enumeration.

### Invariants

1. Frontmatter `forbidden_engine_vocabulary[]` continues to carry the 28-prefix list verbatim.
2. Phase 2 finalize regex scan reads the frontmatter list and is unchanged.
3. §3 Prose Craft Contract Rule 9 ("no ledger-jargon in prose, ever") remains in §3 verbatim — surviving every page per the external-LLM-cold-context constraint.

## Test Plan

### New/Modified Tests

1. Contrived rendered-prose injection of an engine prefix (e.g., "CF-0006") to confirm Phase 2 regex scan HARD-FAILs.

### Commands

1. `grep -nE 'forbidden_engine_vocabulary' .claude/skills/_shared-templates/page-plan.md` — frontmatter declaration remains; body re-enumeration is absent.
2. Manual diff: PG-0003 §18 (28-prefix bullet enumeration) vs re-authored PG-0004 §18 (one-line negative).
3. Hand-craft a `pages-prose/PG-NNNN.md` containing "CF-0006"; run finalize Phase 2 and confirm HARD-FAIL.
