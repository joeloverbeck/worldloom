# PPLAN-004: Storylet `notes:` discipline — character-agnostic body language; cast-bound only when storylet is cast-locked

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds authoring discipline to `storylet-pool-authoring` (skill prose + template); no validator or tool change. Reaches into the page-plan failure chain because storylet `notes:` is inlined verbatim into the page plan body §15 and into Phase 7 LLM prompt assembly as scene-direction context.
**Deps**: None directly. Pairs with `archive/tickets/PPLAN-003-clothing-consistency-check.md` (the completed deterministic clothing-consistency check) which catches the symptom when this discipline lapses; pairs with PPLAN-005 (§15 schema-to-prose translation) which is the consuming surface.

## Problem

At intake, `worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-0012.yaml` `notes:` field (inlined into `pages-prose-plans/PG-0003.md` §15 lines 742-746) read:

> *"The confession arc. Something she does (a glance, a small question, **the way she pulls her sleeve down over the bruise**) pulls a single specific true disclosure out of Jon."*

`worlds/erotica-world/characters/ane-arrieta.md:89` (the `Material Reality` section) states Ane wears a pink off-shoulder crop top, no sleeves. The storylet's gestural example bakes a clothing-specific motion (`pulls her sleeve down`) into a template that was authored without checking the target cast member's wardrobe. When the page-plan LLM consumes the storylet `notes:` verbatim via §15 + the page-cycle prompt-assembly "selected arc record" injection (`.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md:44-46`), the gestural anchor propagates into:
- `frontmatter.declared_visible_affordances[0]` ("sleeve angling to cover the bruise")
- §8 cast "Current intentions" ("pull sleeve, angle the body away")
- §19 Render-time instruction block beat 1 ("a sleeve adjustment")

The renderer then writes "Her sleeve moved" at line 1 of the rendered prose.

Before this ticket, the storylet template (`.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`) gave the `notes:` field only a free-form description: *"Free-form authorial notes — design rationale, mystery-edge sensitivity, tone intent, alternate-realization considerations."* No discipline restricted character-specific physical detail.

## Assumption Reassessment (2026-05-12)

1. **Storylet `notes:` is rendered verbatim into the page plan.** Verified: `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md:44-46` (`[selected arc record — the full SLT-NNNN selected at Phase 4: arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy.normal_exits, effect_model.variants[]]` — the full SLT record includes `notes:`); `pages-prose-plans/PG-0003.md:742-746` is the visible evidence. The `notes:` field is consumed by the plan-authoring LLM (which paraphrases it into declared_visible_affordances + §8 intentions + §19 beats) AND by the external prose renderer (via §15 verbatim inlining).
2. **The free-form `notes:` discipline gap is at the storylet-authoring layer, not at the page-plan layer.** Verified: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml:271-273` documents `notes:` as free-form. No authoring rule restricts character-specific clothing detail. `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` is the structured-drafting reference and has no clothing-discipline section.
3. **Storylet bindability is bimodal.** A storylet is either (a) generic/cast-agnostic — written for any cast member who fits role matchers (e.g., `actor: role:protagonist`, `target: role:recipient`), OR (b) cast-locked — explicitly bound to specific STENT ids in `arc_contract.actor`, `arc_contract.target`, or cast requirements. `visibility.allowed_branch_ids` narrows branch availability but is not by itself a cast identity guarantee unless the branch context fixes the cast member being referenced. The discipline this ticket adds: case (a) MUST use character-agnostic body language; case (b) MAY use character-specific clothing detail because the cast's Material Reality is known at authoring time.
4. **Shared boundary under audit**: the `notes:` field of `storylet_record.yaml`, the storylet-pool-authoring drafting references, and the Phase 4 storylet-selection consumer in `branching-story-page-cycle`. The discipline rule lives at the storylet-authoring layer; the consumer (page-cycle) does not need to change.
5. **FOUNDATIONS principle under audit**: Rule 1 (No Floating Facts) applied at the storylet artifact level — `notes:` content that references body parts/clothing not present on a cast member when the storylet is selected is a floating fact at the gestural anchor layer. Rule 7 (Preserve Mystery Deliberately) is not directly engaged.
6. **Proof-surface correction**: the drafted skill dry-run was not a truthful acceptance gate for this documentation-only change. `storylet-pool-authoring` direct seed mode requires live world/story context, candidate generation, HARD-GATE approval, and a write transaction; this ticket changes only the skill-local authoring contract. The accepted proof is grep evidence plus manual review of the four edited contract surfaces.

## Architecture Check

1. The discipline is documentary (skill prose + template comment update). No code change. Detection-side support is the completed deterministic gate in `archive/tickets/PPLAN-003-clothing-consistency-check.md`. Storylet-author discipline + page-plan-time deterministic gate is the two-layer defense.
2. No backwards-compatibility shims. Existing storylets are not re-authored; the discipline applies to new storylets authored after the rule lands. Existing storylets that carry character-specific gestural anchors continue to validate; archived PPLAN-003 catches the propagation at page-plan time.
3. Alternative considered and rejected: making the `notes:` field a structured schema (e.g., separate `tone_intent`, `gesture_examples`, `mystery_edge_notes` keys). This is over-engineering; the free-form notes shape is valuable for human authorial voice and the constraint can be expressed as a one-paragraph authoring rule.

## Verification Layers

1. **Storylet template's `notes:` comment names the discipline** → codebase grep-proof: `grep -n 'character-agnostic\|cast-locked\|sleeve' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns hits in the `notes:` field's leading comment.
2. **Phase 3 structured-drafting reference documents the discipline as a checklist item** → codebase grep-proof: `grep -n 'gestural\|body language\|clothing' .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` returns the new discipline paragraph.
3. **Skill-local contract review** → manual review of `storylet-pool-authoring` confirms the template, Phase 3 drafting reference, Phase 4/5 canon-safety check, and parent phase summary all carry the same forward authoring discipline. A real seed-mode dry-run is not the truthful proof surface for this ticket because `storylet-pool-authoring` requires live world/story context plus a HARD-GATE-backed approval/write flow; this implementation changes the skill contract only.
4. **Historical audit pointer**: SLT-0012 of `worlds/erotica-world/stories/red-bunny` is the named historical case; the ticket does NOT re-author it, but does note that archived PPLAN-003's deterministic gate is the runtime catch for already-authored cases.

## Landed Changes

### 1. `storylet-record.yaml` `notes:` guidance

The `notes:` field now carries the body-language and clothing discipline directly in the template: cast-agnostic storylets must use anatomy, posture, or non-clothing-specific gestures; cast-locked clothing detail is allowed only after Material Reality verification.

### 2. Phase 3 structured drafting reference

`phase-3-structured-drafting.md` now explains why `notes:` are load-bearing for downstream page planning, defines cast-agnostic versus cast-locked usage, gives pass/fail examples, and records the SLT-0012 / Ane Arrieta sleeve precedent as historical motivation.

### 3. Phase 4/5 author-side check

`phase-4-5-canon-safety-checks.md` now instructs Phase 4 revision review and Phase 5 batch review to scan `notes:` for garment vocabulary from `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`, revise cast-agnostic garment anchors to anatomy/posture/non-clothing-specific form, and verify cast-locked garment references against Material Reality.

### 4. Parent skill summary

`storylet-pool-authoring/SKILL.md` now points operators from the phase-flow summary to the new Phase 3 body-language discipline.

### 5. Triage status sync

`docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md` now names PPLAN-004 as completed rather than active.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify — `notes:` field comment)
- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify — add discipline subsection)
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify — add Phase 4/5 author-side check)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — phase-flow reminder line)
- `docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md` (modify — completed-status sync)

## Out of Scope

- Re-authoring SLT-0012 or any other existing storylet to retroactively comply. The discipline applies to storylets authored after this ticket lands.
- Adding a runtime gate at storylet submission. The discipline is authoring-time; runtime defense is archived PPLAN-003's clothing-consistency check at the consuming page-plan layer.
- Cast-agnostic / cast-locked storylet visibility-flag changes. Existing `visibility.scope` and `visibility.allowed_branch_ids` semantics are unchanged; this ticket does not make branch allowlists a new cast-locking mechanism.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'character-agnostic\|cast-locked\|sleeve' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns hits in the `notes:` comment block.
2. `grep -n 'Body-language and clothing discipline' .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` returns the new section header.
3. `grep -n 'clothing-consistency-vocabulary' .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns the new cross-reference to archived PPLAN-003's wordlist.
4. Manual contract review: the four edited storylet-pool-authoring surfaces consistently state that cast-agnostic storylet `notes:` use anatomy/posture/non-clothing-specific verbs, and that cast-locked clothing detail requires Material Reality verification.

### Invariants

1. The discipline applies at storylet-authoring time; no runtime side effects.
2. Cast-locked storylets may continue to use character-specific clothing detail, but the discipline carries an explicit verification step against the projected Material Reality at authoring time.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket. The discipline is enforced at authoring discretion + archived PPLAN-003 runtime gate.

### Commands

1. `grep -rn 'character-agnostic\|Body-language and clothing discipline' .claude/skills/storylet-pool-authoring/` (verifies the discipline propagated to all four sites).
2. `grep -n 'completed PPLAN-004\|PPLAN-004.*completed' docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md` (verifies same-seam triage status sync).
3. Manual review of `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md`, `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md`, `.claude/skills/storylet-pool-authoring/SKILL.md`, and `docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md`.

## Outcome

Completion date: 2026-05-12.

Completed. Storylet-pool-authoring now has an upstream authoring discipline for `notes:`: cast-agnostic storylets must avoid clothing-specific gestures, while cast-locked storylets may use garment detail only after checking the bound cast member's Material Reality. The rule is present in the SLT template, Phase 3 drafting reference, Phase 4/5 review reference, and parent skill flow summary.

## Verification Result

1. `grep -n 'character-agnostic\|cast-locked\|sleeve' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — PASS; the `notes:` guidance names character-agnostic wording, cast-locked allowance, and the sleeve failure class.
2. `grep -n 'Body-language and clothing discipline' .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` — PASS; the Phase 3 reference contains the new section.
3. `grep -n 'clothing-consistency-vocabulary' .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` — PASS; the Phase 4/5 reference links to the PPLAN-003 vocabulary.
4. `grep -rn 'character-agnostic\|Body-language and clothing discipline' .claude/skills/storylet-pool-authoring/` — PASS; the discipline appears across the template, Phase 3 reference, Phase 4/5 reference, and parent skill summary.
5. `grep -n 'completed PPLAN-004\|PPLAN-004.*completed' docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md` — PASS; the same-seam triage doc no longer calls PPLAN-004 active.
6. Manual contract review — PASS; no runtime validator or world-content write was introduced, branch allowlists were not turned into a new cast-lock mechanism, PPLAN-005 remains the owner for §15 schema-to-prose body translation, and the triage doc status wording matches this closeout.

## Deviations

- The drafted seed-mode dry-run was replaced with grep proof plus manual contract review. A direct `storylet-pool-authoring` run requires live story context, candidate generation, HARD-GATE approval, and write submission; that would exceed this ticket's documentation-only owner boundary.
- The ticket corrected its cast-lock definition during reassessment: specific STENT references in `arc_contract` or cast requirements are cast-locking; `visibility.allowed_branch_ids` is only clothing-safe when the branch context fixes the relevant cast member.
