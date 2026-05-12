# PPLAN-004: Storylet `notes:` discipline — character-agnostic body language; cast-bound only when storylet is cast-locked

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds authoring discipline to `storylet-pool-authoring` (skill prose + template); no validator or tool change. Reaches into the page-plan failure chain because storylet `notes:` is inlined verbatim into the page plan body §15 and into Phase 7 LLM prompt assembly as scene-direction context.
**Deps**: None directly. Pairs with PPLAN-003 (the deterministic clothing-consistency check) which catches the symptom when this discipline lapses; pairs with PPLAN-005 (§15 schema-to-prose translation) which is the consuming surface.

## Problem

`worlds/erotica-world/stories/red-bunny/_source/storylets/SLT-0012.yaml` `notes:` field (inlined into `pages-prose-plans/PG-0003.md` §15 lines 742-746) reads:

> *"The confession arc. Something she does (a glance, a small question, **the way she pulls her sleeve down over the bruise**) pulls a single specific true disclosure out of Jon."*

`worlds/erotica-world/characters/ane-arrieta.md:89` (the `Material Reality` section) states Ane wears a pink off-shoulder crop top, no sleeves. The storylet's gestural example bakes a clothing-specific motion (`pulls her sleeve down`) into a template that was authored without checking the target cast member's wardrobe. When the page-plan LLM consumes the storylet `notes:` verbatim via §15 + the page-cycle prompt-assembly "selected arc record" injection (`.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md:44-46`), the gestural anchor propagates into:
- `frontmatter.declared_visible_affordances[0]` ("sleeve angling to cover the bruise")
- §8 cast "Current intentions" ("pull sleeve, angle the body away")
- §19 Render-time instruction block beat 1 ("a sleeve adjustment")

The renderer then writes "Her sleeve moved" at line 1 of the rendered prose.

The storylet template (`.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml:271`) gives the `notes:` field a free-form description: *"Free-form authorial notes — design rationale, mystery-edge sensitivity, tone intent, alternate-realization considerations."* No discipline restricts character-specific physical detail.

## Assumption Reassessment (2026-05-12)

1. **Storylet `notes:` is rendered verbatim into the page plan.** Verified: `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md:44-46` (`[selected arc record — the full SLT-NNNN selected at Phase 4: arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy.normal_exits, effect_model.variants[]]` — the full SLT record includes `notes:`); `pages-prose-plans/PG-0003.md:742-746` is the visible evidence. The `notes:` field is consumed by the plan-authoring LLM (which paraphrases it into declared_visible_affordances + §8 intentions + §19 beats) AND by the external prose renderer (via §15 verbatim inlining).
2. **The free-form `notes:` discipline gap is at the storylet-authoring layer, not at the page-plan layer.** Verified: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml:271-273` documents `notes:` as free-form. No authoring rule restricts character-specific clothing detail. `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` is the structured-drafting reference and has no clothing-discipline section.
3. **Storylet bindability is bimodal.** A storylet is either (a) generic/cast-agnostic — written for any cast member who fits the role tags (e.g., `actor: role:protagonist`, `target: role:recipient`), OR (b) cast-locked — explicitly bound to specific STENT ids in `visibility.allowed_branch_ids` or `arc_contract.actor/target` STENT refs. The discipline this ticket adds: case (a) MUST use character-agnostic body language; case (b) MAY use character-specific clothing detail because the cast's Material Reality is known at authoring time.
4. **Shared boundary under audit**: the `notes:` field of `storylet_record.yaml`, the storylet-pool-authoring drafting references, and the Phase 4 storylet-selection consumer in `branching-story-page-cycle`. The discipline rule lives at the storylet-authoring layer; the consumer (page-cycle) does not need to change.
5. **FOUNDATIONS principle under audit**: Rule 1 (No Floating Facts) applied at the storylet artifact level — `notes:` content that references body parts/clothing not present on a cast member when the storylet is selected is a floating fact at the gestural anchor layer. Rule 7 (Preserve Mystery Deliberately) is not directly engaged.

## Architecture Check

1. The discipline is documentary (skill prose + template comment update). No code change. Detection-side support is PPLAN-003's deterministic gate. Storylet-author discipline + page-plan-time deterministic gate is the two-layer defense.
2. No backwards-compatibility shims. Existing storylets are not re-authored; the discipline applies to new storylets authored after the rule lands. Existing storylets that carry character-specific gestural anchors continue to validate; PPLAN-003 catches the propagation at page-plan time.
3. Alternative considered and rejected: making the `notes:` field a structured schema (e.g., separate `tone_intent`, `gesture_examples`, `mystery_edge_notes` keys). This is over-engineering; the free-form notes shape is valuable for human authorial voice and the constraint can be expressed as a one-paragraph authoring rule.

## Verification Layers

1. **Storylet template's `notes:` comment names the discipline** → codebase grep-proof: `grep -n 'character-agnostic\|cast-bound\|cast-locked' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns hits in the `notes:` field's leading comment.
2. **Phase 3 structured-drafting reference documents the discipline as a checklist item** → codebase grep-proof: `grep -n 'gestural\|body language\|clothing' .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` returns the new discipline paragraph.
3. **Skill dry-run on seed authoring** → re-run `storylet-pool-authoring` seed mode for a hypothetical new story bundle and confirm the generated storylet `notes:` fields use character-agnostic body language by default (e.g., "a small motion to cover the bruise" not "pulls her sleeve down").
4. **Historical audit pointer**: SLT-0012 of `worlds/erotica-world/stories/red-bunny` is the named historical case; the ticket does NOT re-author it, but does note that PPLAN-003's deterministic gate is the runtime catch for already-authored cases.

## What to Change

### 1. `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (line 271 — the `notes:` field)

Replace the existing single-line free-form comment:
> `Free-form authorial notes — design rationale, mystery-edge sensitivity, tone intent, alternate-realization considerations.`

with:
> `Free-form authorial notes — design rationale, mystery-edge sensitivity, tone intent, alternate-realization considerations.`
> ``
> `**Body-language and clothing discipline.** When the storylet is cast-agnostic (actor / target use role: tags), gestural examples MUST use character-agnostic body language — anatomy ("a hand to the bruise"), posture ("angling the body away"), or non-clothing-specific verbs ("a small motion to cover"). DO NOT bake character-specific clothing details ("pulls her sleeve down", "tugs the hood lower", "smooths her skirt") into cast-agnostic storylet notes — the storylet may be selected for a cast member whose wardrobe does not include the referenced garment, and the page-plan LLM and downstream renderer will faithfully propagate the contradiction (see SLT-0012 ↔ Ane Arrieta crop-top precedent, 2026-05-04 → 2026-05-12). When the storylet is cast-locked (actor / target reference specific STENT ids OR visibility.allowed_branch_ids commits a specific cast), character-specific clothing detail IS permitted because the wardrobe is known at authoring time.`

### 2. `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md`

Add a discipline subsection (after the existing structured-field drafting guidance):

> `### Body-language and clothing discipline in storylet notes`
> ``
> `Storylet notes: are inlined verbatim into the consuming page plan §15 (Selected scene-commitment arc) AND fed into the page-plan-authoring LLM's prompt as scene-direction context. Gestural anchors in the notes propagate into frontmatter declared_visible_affordances, §8 cast-block intentions, and §19 render-time beat directions.`
> ``
> `**Rule**: Cast-agnostic storylets use character-agnostic body language in notes:. Cast-locked storylets may use character-specific clothing detail, but only after verifying against the cast member's CHAR dossier body.Material Reality clothing summary.`
> ``
> `**Examples**:`
> `- Cast-agnostic, audit-passing: "a glance, a small question, a small motion to cover the bruise"`
> `- Cast-agnostic, audit-failing: "the way she pulls her sleeve down over the bruise" (assumes a sleeved garment)`
> `- Cast-locked, audit-passing: "the way Iker (STENT-0003) tucks the manga magazine under his hoodie's hem" (Iker's Material Reality wardrobe carries the hoodie)`
> ``
> `**Rationale**: SLT-0012 of worlds/erotica-world/stories/red-bunny (authored 2026-05-04 with "the way she pulls her sleeve down over the bruise") produced the 2026-05-12 PG-0003 rendered-prose failure ("Her sleeve moved") when selected against Ane Arrieta, whose Material Reality specifies a sleeveless crop top.`

### 3. `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md`

Add the discipline as a Phase 4 / Phase 5 author-side check: "scan `notes:` for character-specific garment vocabulary (sleeve, hood, pocket, lapel, etc. — see `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`); if the storylet is cast-agnostic, the scan must return zero hits OR the wording must be revised to anatomy/posture form before the storylet is submitted."

### 4. `.claude/skills/storylet-pool-authoring/SKILL.md`

In the relevant phase-flow summary (around line 270-280, near the validate / submit step), add a one-line reminder: "Body-language discipline: cast-agnostic storylet notes: must use character-agnostic gestural language; see `references/phase-3-structured-drafting.md` §Body-language and clothing discipline."

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify — `notes:` field comment)
- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify — add discipline subsection)
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify — add Phase 4/5 author-side check)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — phase-flow reminder line)

## Out of Scope

- Re-authoring SLT-0012 or any other existing storylet to retroactively comply. The discipline applies to storylets authored after this ticket lands.
- Adding a runtime gate at storylet submission. The discipline is authoring-time; runtime defense is PPLAN-003's clothing-consistency check at the consuming page-plan layer.
- Cast-agnostic / cast-locked storylet visibility-flag changes. Existing `visibility.scope` and `visibility.allowed_branch_ids` semantics are unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'character-agnostic\|cast-locked\|sleeve' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns hits in the `notes:` comment block.
2. `grep -n 'Body-language and clothing discipline' .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` returns the new section header.
3. `grep -n 'clothing-consistency-vocabulary' .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` returns the new cross-reference to PPLAN-003's wordlist.
4. Skill dry-run: re-author a small seed storylet pool for a hypothetical story bundle; the generated `notes:` content uses cast-agnostic body language by default.

### Invariants

1. The discipline applies at storylet-authoring time; no runtime side effects.
2. Cast-locked storylets may continue to use character-specific clothing detail, but the discipline carries an explicit verification step against the projected Material Reality at authoring time.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket. The discipline is enforced at authoring discretion + PPLAN-003 runtime gate.

### Commands

1. `grep -rn 'character-agnostic\|Body-language and clothing discipline' .claude/skills/storylet-pool-authoring/` (verifies the discipline propagated to all four sites).
2. Manual dry-run on a seed authoring run for a new story bundle.
