# PPLAN-006: §10 / §11 / §12 body — replace engine vocabulary with prose-direction language

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — edits canonical page-plan template body comments for §10 (Open obligations), §11 (Active threads), §12 (Pending consequences); page-cycle and bootstrap phase-7 prompt-assembly/self-containment prose. Frontmatter and atomic OBL / THR / CNSQ records unchanged.
**Deps**: None directly. Co-travels with completed `archive/tickets/PPLAN-005-slt-schema-to-prose-translation.md` (§15) and PPLAN-007 (`forbidden_engine_vocabulary`) as the renderer-facing body cleanup tier.

## Problem

At intake, the renderer-facing body §10 / §11 / §12 of `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` surfaced engine-narrative vocabulary the external prose renderer could not directly act on. Sample (lines 427-471):

> §10 Open obligations:
> - **Ane's safe-passage home (threat type)**. Open. **Salience 6, urgency 7**. Owner: Ane. **Possible payoff modes: literal fulfillment (she gets home safely), ironic reversal (the help that arrives produces its own threat), abandon with acknowledgment (the story acknowledges the safe-passage need without resolving it)**. The hazard atmosphere is the air she walks through to get home. **Not directly resolved this page; sits as background.**

> §11 Active threads:
> - **Jon and Ane: encounter and disposition (relationship, current pressure 8)**. The main thread. The bench encounter has commenced... **Pressure increased from 7 to 8 at PG-2. This page is expected to compound it further (to 9)...**

> §12 Pending consequences:
> - None pending. **No consequence_address ops this turn.** The disclosure beat does not produce a **required_aftermath item** beyond what is absorbed by the newly-opened obligation to navigate the response register.

Engine vocabulary the renderer cannot use: "Salience 6, urgency 7", "Possible payoff modes: literal fulfillment / ironic reversal / abandon with acknowledgment", "current pressure 8", "Pressure increased from 7 to 8", "consequence_address ops", "required_aftermath item". These fields drive engine validators (`obligation_salience`, `consequence_persistence`, narrative-health weights, `arc_envelope_conformance`). The renderer needs the scene-relevant translation: *"The pressing thing under the scene is that she still has to get home through hazardous geography; this page holds it as ambient register, does not resolve it."*

Before this ticket, §10 / §11 / §12 had the same conflation as completed `archive/tickets/PPLAN-005-slt-schema-to-prose-translation.md` §15: engine schema vocabulary landed in body where prose-direction translation would serve. The engine OBL / THR / CNSQ records exist at `worlds/<slug>/stories/<slug>/_source/{obligations,threads,consequences}/*.yaml` and carry the schema fields; after this ticket, the page-plan body contract carries the prose-direction read.

## Assumption Reassessment (2026-05-12)

1. **OBL salience/urgency, THR pressure, and CNSQ required_aftermath are schema fields on atomic records.** Verified: `.claude/skills/branching-story-page-cycle/references/record-schemas.md` documents OBL / THR / CNSQ schemas. Validators (`obligation_salience` bootstrap gate; `consequence_persistence` page-cycle gate; narrative-health metric weights at `phase-9-validation-gates.md`) read these fields from the atomic records OR from `PG.state_snapshot.{obligations_open, threads_active, consequences_pending}` — not from §10/§11/§12 body prose.
2. **Engine vocabulary leaks into body §10/§11/§12 because the canonical template instructs verbatim record body inlining.** Verified: `.claude/skills/_shared-templates/page-plan.md:142-143` (§10 comment): *"INLINE: every OBL in obligations_open with salience, urgency, who owes whom, payoff_modes[], age, consequence_on_neglect."* This phrasing is engine-completeness oriented. Same shape at §11 (line 147): *"every THR ... with status, current_pressure, type"*. Same at §12 (line 151): *"every CNSQ ... with required_aftermath_text, urgency, source SE."*
3. **Shared boundary under audit**: the canonical template's §10/§11/§12 comments + the page-cycle and bootstrap phase-7 prompt-assembly / self-containment prose that directs the LLM author to inline these fields. Frontmatter shape and atomic-record schema fields are NOT under audit; only the body view.
4. **FOUNDATIONS principle under audit**: §Story Bundles §4 (the frontmatter-vs-body split — frontmatter is engine-bearing; body inlines canonical context for the renderer); Rule 1 grounding (preserved — the body translation preserves all prose-bearing context the renderer needs to understand the scene's pressures).
5. **Adjacent contradictions**: completed `archive/tickets/PPLAN-005-slt-schema-to-prose-translation.md` uses the same "prose-direction translation; engine fields go in frontmatter" mechanism for §15. PPLAN-007 cleans `forbidden_engine_vocabulary` body view. These tickets together implement the body-cleanup tier of Approach B; they share the same architectural rationale and can be implemented as a single body-cleanup sweep, but each is decomposed for review and verification.
6. **Reassessment correction (2026-05-12)**: the initial file set was too narrow. `.claude/skills/_shared-templates/page-plan.md` has a top-level "Every record id ... inlined verbatim" rule, `.claude/skills/branching-story-bootstrap/SKILL.md` says Phase 7 inlines every OBL / THR record body verbatim, and `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` says `plan_self_containment` requires a bare OBL id in §10 to include the OBL fields. Those are same-seam body-view contract surfaces and are updated here to preserve self-containment while allowing canonical prose-direction translations instead of full engine-field dumps.

## Architecture Check

1. The change is documentary — body view instructions move from "inline every record schema field" to "translate the obligation / thread / consequence into one prose sentence the renderer can read as scene pressure direction." Atomic-record schema and frontmatter are unchanged.
2. No backwards-compatibility shims. Existing plans (verbose engine vocabulary in §10/§11/§12) remain valid under validators; the new prose-direction shape applies to plans authored after the documentation change.
3. Alternative considered and rejected: keep the engine fields and add a parallel "prose direction" subsection per record. This double-counts content for no engine benefit and bloats the body further.

## Verification Layers

1. **§10/§11/§12 template comments document the prose-direction translation rule** → codebase grep-proof: `grep -nE 'prose-direction|scene pressure' .claude/skills/_shared-templates/page-plan.md` returns hits at the §10/§11/§12 comment blocks.
2. **page-cycle prompt-assembly directs the LLM author to translate, not inline** → codebase grep-proof: `grep -n 'translation\|engine field' .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` returns hits at the state-context block.
3. **Self-containment contract preserves renderer context without full schema dumps** → codebase grep-proof/manual review: the template and bootstrap `plan_self_containment` wording allow canonical prose-direction translations for §10/§11/§12 while still rejecting bare unresolved IDs.
4. **Validator gates continue to pass** → schema validation/manual contract review: `obligation_salience` (bootstrap), `consequence_persistence` (page-cycle), narrative-health gate weights continue to read atomic records / state_snapshot. A re-authored plan with prose-direction §10/§11/§12 body remains validator-compatible.
5. **Known-case dry-run boundary** → not exercised. The live repo does not expose an executable PG-4 re-authoring harness for this prose workflow; this layer is covered by the deviation below, with source contract review and stale-anchor grep as the truthful proof surface.

## Landed Changes

### 1. `.claude/skills/_shared-templates/page-plan.md` §10 comment (lines 140-143)

Replaced the old instruction:
> `INLINE: every OBL in obligations_open with salience, urgency, who owes whom, payoff_modes[], age, consequence_on_neglect.`

with the landed rule:
> `INLINE the prose-direction translation of each active obligation. For each OBL in obligations_open, one short paragraph: who owes what to whom, what makes it pressing right now (translate salience + urgency into prose register — "high pressure", "background substrate", "newly pressing"), how the page treats it (held / pressured / paid off / complicated / abandoned), and the named-aftermath cue if any (translate payoff_modes[] into the scene-relevant subset — typically one or two payoff modes the page might invoke, not the full enumeration).`
> ``
> `Engine fields NOT inlined: salience and urgency integer values, payoff_modes[] full enumeration, age, consequence_on_neglect verbatim text. These live on the atomic OBL record at worlds/<slug>/stories/<slug>/_source/obligations/OBL-NNNN.yaml and on PG.state_snapshot.obligations_open for validator readback (obligation_salience gate).`

### 2. `.claude/skills/_shared-templates/page-plan.md` §11 comment (line 147)

Replaced the old instruction:
> `INLINE: every THR in threads_active with status, current_pressure, type.`

with the landed rule:
> `INLINE the prose-direction translation of each active thread. For each THR in threads_active, one short paragraph: what the thread is about, how it stood at the prior page, what this page is expected to do with it (compound, hold, slacken, pivot, resolve). Translate current_pressure into prose register ("the main thread", "background substrate", "newly pressuring", "decisive this page") rather than the integer.`
> ``
> `Engine fields NOT inlined: current_pressure integer value, status code, type enum. These live on the atomic THR record and on PG.state_snapshot.threads_active for validator readback.`

### 3. `.claude/skills/_shared-templates/page-plan.md` §12 comment (line 151)

Replaced the old instruction:
> `INLINE: every CNSQ in consequences_pending with required_aftermath_text, urgency, source SE.`

with the landed rule:
> `INLINE the prose-direction translation of each pending consequence. For each CNSQ in consequences_pending, one short paragraph: what is pending, what the scene must acknowledge or honor about it, how the page treats it (addressed, deferred, complicated). When consequences_pending is empty, write a single sentence: "(no pending consequences this turn)" — do NOT inline engine ops vocabulary ("No consequence_address ops this turn") or schema reasoning.`
> ``
> `Engine fields NOT inlined: urgency integer, source_SE identifier, required_aftermath_text verbatim engine string. These live on the atomic CNSQ record and on PG.state_snapshot.consequences_pending.`

### 4. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (state-context block, around lines 41-43)

Updated the prompt-assembly "state context" line to instruct the LLM author to author §10/§11/§12 as prose-direction translations, not as schema-field dumps. Matched the language from the canonical template above.

### 5. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md`

PG-1 root-case had its own §10/§11/§12 inlining instruction. Added a root-case note: §10/§11/§12 contain only the initial bootstrap obligations / threads / consequences and use the same prose-direction translation rule.

### 6. Same-seam self-containment wording

Updated the canonical template's top-level authoring rule, `branching-story-bootstrap/SKILL.md`, `branching-story-page-cycle/SKILL.md`, bootstrap `plan_self_containment`, and the prose-rendering design note so self-containment means "record id plus renderer-facing context" for §10 / §11 / §12, not full OBL / THR / CNSQ engine-schema dumps.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (modify — §10, §11, §12 comments)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — Phase 10 plan-preview wording)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify — state-context prompt-assembly block)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 7 and Phase 10 plan-preview wording)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify — root-case note)
- `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (modify — plan_self_containment wording)
- `docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md` (modify — §10/§11/§12 body-shape summary)

## Out of Scope

- Atomic OBL / THR / CNSQ record schema changes (unchanged).
- Frontmatter shape (unchanged).
- Narrative-health metric weights and `obligation_salience` / `consequence_persistence` validator gates (unchanged; these continue to read from atomic records and state_snapshot).
- Re-authoring of existing rendered plans.

## Acceptance Criteria

### Tests That Passed

1. Canonical template §10/§11/§12 comments document the prose-direction translation rule with explicit "engine fields NOT inlined" enumeration per section.
2. page-cycle phase-7 prompt-assembly state-context block reflects the translation rule.
3. Bootstrap root phase-7 and `plan_self_containment` wording preserve the self-contained-plan invariant while allowing canonical prose-direction translations instead of full OBL / THR / CNSQ schema dumps.
4. Existing validators (`obligation_salience`, `consequence_persistence`, narrative-health-metric weighting) remain unchanged and continue to read atomic records / `state_snapshot`; verified by manual contract review rather than a live re-authoring run.
5. Skill dry-run on PG-4 was not run; no executable skill dry-run harness is exposed for this prose workflow in the repo. The implemented proof is source contract review plus grep/stale-anchor proof over the edited skill/template/design surfaces.

### Invariants

1. The renderer-facing body §10/§11/§12 carries scene-relevant prose translation; engine vocabulary (`salience: 7`, `current_pressure: 8`, `consequence_address`, `required_aftermath`) does NOT appear.
2. Validator gates that read obligation / thread / consequence schema fields continue to read from atomic records and state_snapshot, not from body prose.
3. Narrative-health metrics (open_obligation_count, high_salience_unpaid_count, recent_consequence_density, recent_reflection_density, tension, unresolved_threat_pressure) are computed from state_snapshot, unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket. Existing validator gates remain the proof surfaces.

### Commands Run

1. `rg -n 'prose-direction translation|Engine fields NOT inlined|satisfies self-containment' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`
2. `rg -n '§10 Open obligations: <N> OBLs inlined|§11 Active threads: <N> THRs inlined|INLINE: every OBL|INLINE: every THR|INLINE: every CNSQ|salience, urgency, who owes whom|status, current_pressure, type|required_aftermath_text, urgency, source SE' .claude/skills docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`
3. `rg -n 'OBL.*record body verbatim|THR.*record body verbatim|CNSQ.*record body verbatim|OBL.*fields inlined|THR.*fields inlined|CNSQ.*fields inlined|every referenced record body inlined|Every record id referenced in any plan section MUST be inlined verbatim' .claude/skills docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`
4. `git diff --check -- .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md tickets/PPLAN-006-obligations-threads-consequences-prose-translation.md`

## Outcome

Completion date: 2026-05-12.

Completed the §10 / §11 / §12 body cleanup. The canonical page-plan template now tells plan authors to translate obligations, threads, and pending consequences into renderer-facing scene pressure / thread posture / aftermath direction, while leaving OBL / THR / CNSQ engine fields on atomic records and `PG.state_snapshot` for validator readback.

Updated the page-cycle and bootstrap Phase 7 prompt-assembly prose, bootstrap self-containment wording, parent skill plan-preview text, and the prose-rendering design note so they no longer imply that §10 / §11 / §12 inline full OBL / THR / CNSQ schema dumps.

## Verification Result

1. `rg -n 'prose-direction translation|Engine fields NOT inlined|satisfies self-containment' ...` — PASS; edited template, skill, reference, validator, and design surfaces contain the new translation/self-containment wording.
2. `rg -n '§10 Open obligations: <N> OBLs inlined|§11 Active threads: <N> THRs inlined|INLINE: every OBL|INLINE: every THR|INLINE: every CNSQ|salience, urgency, who owes whom|status, current_pressure, type|required_aftermath_text, urgency, source SE' .claude/skills docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md` — PASS; command returned no matches after review corrected the design-note plan-preview rows.
3. `rg -n 'OBL.*record body verbatim|THR.*record body verbatim|CNSQ.*record body verbatim|OBL.*fields inlined|THR.*fields inlined|CNSQ.*fields inlined|every referenced record body inlined|Every record id referenced in any plan section MUST be inlined verbatim' .claude/skills docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md` — PASS; command returned no matches.
4. Manual FOUNDATIONS / validator contract review — PASS; `docs/FOUNDATIONS.md` §Story Bundles §4 still has the plan body carrying canonical renderer context, while frontmatter / atomic records remain the engine-bearing surfaces. `obligation_salience`, `consequence_persistence`, and narrative-health metrics are unchanged.
5. `git diff --check -- ...` over all edited files — PASS.

## Deviations

- The drafted PG-4 re-authoring dry-run and live Phase 9 validation were not run. The repo does not expose an executable dry-run harness for these prose workflow skills in this ticket's scope, and this documentation-only contract change is verified by source contract review plus grep/stale-anchor proof.
- Reassessment widened the same-seam file set to include bootstrap parent/self-containment wording and `docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`; those surfaces still stated or implied the old full-schema body view for §10 / §11 / §12.
