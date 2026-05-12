# PPLAN-003: Add Phase-7-post-LLM deterministic clothing-consistency check

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds a new deterministic check to Phase 7 post-LLM gates in both `branching-story-bootstrap` and `branching-story-page-cycle`; references the projected `body.Material Reality` data landed by PPLAN-001.
**Deps**: `archive/tickets/PPLAN-001-cast-material-reality-projection.md` (Material Reality projection landed first; this check reads from that projected data).

## Problem

Even with `body.Material Reality` projected at pre-flight (PPLAN-001), the plan-authoring LLM can still author a `frontmatter.declared_visible_affordances[]` entry or a §8 cast-block intention that contradicts the projected clothing/body data. The PG-0003 failure on `worlds/erotica-world/stories/red-bunny`:

- `pages-prose-plans/PG-0003.md:31` `frontmatter.declared_visible_affordances[0].affordance_text`: *"Ane on the bench, sleeve angling to cover the bruise"*
- `pages-prose-plans/PG-0003.md:378` §8 Ane "Current intentions": *"Cover the bruise more deliberately now that he has named it (pull sleeve, angle the body away)."*
- Same plan §8 line 374: clothing correctly stated as *"pink off-shoulder crop top, pink short flared skirt, white thigh-high socks with pink hearts, white platform sneakers"*. A crop top has no sleeves.

The plan is internally inconsistent: §8 clothing prose and frontmatter/intention body-cover gestural language disagree. Phase 7's existing post-LLM `plan_completeness_check` is structural (every section populated; record ids resolve; required keys present); it does not test prose-vs-prose semantic consistency.

A deterministic check at Phase 7's post-LLM step can catch the common class of body-part / clothing contradictions:
- Affordance or intention prose names a garment kind not present in projected `Material Reality` clothing (`sleeve` when wardrobe is sleeveless; `hood` when wardrobe has no hooded garment; `pocket` when wardrobe is pocketless; `lapel` when no jacket; etc.).
- Affordance or intention names a body posture incompatible with projected condition (e.g., "stands" when condition states immobile).

## Assumption Reassessment (2026-05-12)

1. **Phase 7 post-LLM check is the right insertion site.** Verified: `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md:104-115` and `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md:110-122` document the existing post-LLM check ("structural, not stylistic"). Up to 3 re-prompts share the Phase 7 budget; the new check fits this re-prompt loop.
2. **Material Reality data is structurally available after PPLAN-001.** Verified by `archive/tickets/PPLAN-001-cast-material-reality-projection.md`: the dossier section is projected to the plan-authoring LLM AND remains reachable for post-LLM deterministic check (via `mcp__worldloom__get_record(CHAR-NNNN, section_path='body.Material Reality')`).
3. **Garment / body-part vocabulary the check enumerates is bounded.** The check uses a closed wordlist of common garment kinds (sleeve, hood, pocket, lapel, collar, hem, cuff, button, zipper, belt, scarf, jacket-tail, skirt-fold, etc.) and posture verbs (stands, walks, crouches, etc.) — not unbounded NLU. A garment name in an affordance / intention must be present (or its parent garment present) in the cast member's Material Reality clothing summary; absence triggers re-prompt.
4. **Shared boundary under audit**: the `frontmatter.declared_visible_affordances[].affordance_text` and §8 "Current intentions" body section are the two surfaces the check inspects. Both are populated by the plan-authoring LLM and read by downstream consumers (Phase 7.5 declared-affordance validation reads frontmatter; the renderer reads body §8).
5. **FOUNDATIONS principle under audit**: Rule 1 (No Floating Facts) — the plan IS load-bearing engine output (per FOUNDATIONS §Validation Rule 1 paragraph: *"its frontmatter declares affordances, intended beats, stop conditions, and `forbidden_resolutions[]` with explicit consequences and prerequisites"*). An affordance grounded in a body-part that doesn't exist on the actor is a floating fact at the affordance layer. The new check is a Rule 1 strengthening at the per-affordance grounding scale.
6. **Adjacent contradiction**: PPLAN-004 addresses the upstream cause (storylet `notes:` gestural examples that bake in character-specific clothing). PPLAN-003 catches the symptom at plan-generation. Both are needed — discipline upstream prevents the issue; the deterministic check is the defense-in-depth backstop when a storylet was authored before the discipline landed.

## Architecture Check

1. The check is deterministic — closed wordlist + cast-Material-Reality projection lookup. Not LLM-based; no fuzzy semantic matching; failure modes are precise (named garment X is not in cast member Y's Material Reality clothing summary). This is consistent with Phase 7's existing post-LLM structural-not-stylistic posture.
2. No backwards-compatibility shims. The check is additive; existing plans with no garment contradiction pass trivially. Plans that DO have contradictions get a re-prompt — which is the existing Phase 7 budget mechanism, not a new control flow.
3. Failure handling matches existing Phase 7 budget: up to 3 re-prompts; escalates to user on exhaustion. The check does not introduce a new failure class outside the existing budget.

## Verification Layers

1. **Gate registered as Phase 7 post-LLM check** → codebase grep-proof: gate name `cast_material_reality_consistency` appears in both `phase-7-root-page-plan.md` and `phase-7-page-plan.md` post-LLM check enumeration AND in `phase-9-validation-gates.md` validation_trace mapping under the structural / by-construction layer (since Phase 7 surfaces it at plan-commit).
2. **Closed garment / posture wordlist is documented** → codebase grep-proof: `.claude/skills/_shared-templates/page-plan.md` or a new sibling reference (e.g., `.claude/skills/branching-story-page-cycle/references/clothing-consistency-vocabulary.md`) enumerates the garment-kind and posture-verb wordlists the check uses.
3. **Re-prompt fires on a contrived contradiction** → skill dry-run: hand-craft a Phase 7 working buffer where an affordance names "sleeve" for a cast member whose Material Reality summary contains only "crop top"; confirm the gate FAILs and re-prompts.
4. **Existing PG-0003 case re-triggers a re-prompt under the new gate** → manual review: feeding the existing `pages-prose-plans/PG-0003.md` frontmatter + §8 intention into a re-validation run against Ane Arrieta's dossier produces the exact failure the user observed.
5. **No false positives on generic body language** → skill dry-run: an affordance like "Ane's shoulder, angled toward Jon" passes (shoulder is body, not garment; projected condition does not contradict); an intention like "her hand reaching to her arm" passes (anatomy, not garment).

## What to Change

### 1. New reference: `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`

Document the closed wordlists the check uses:
- Garment kinds: sleeve, hood, pocket, lapel, collar, hem, cuff, button, zipper, belt, scarf, tie, jacket-tail, skirt-fold, sock, stocking, glove, hat, cap, helmet, veil, bandana, headband, headscarf, kerchief, brooch, pin, watch, bracelet, necklace, earring, ring (clothing + accessory subset that body-cover affordances commonly invoke).
- Garment-kind → parent-garment mapping: sleeve → {shirt, blouse, sweater, jacket, coat, dress, robe}; hood → {hoodie, sweatshirt, jacket, coat, robe, cape}; collar → {shirt, blouse, jacket, coat, dress}; etc. A garment-kind passes the check when its parent garment OR a synonym is present in the cast member's Material Reality clothing summary.
- Posture verbs: stands, walks, kneels, crouches, runs, sits, lies, leans, climbs, jumps — paired with projected condition checks (immobile, seated-only, bedridden, etc.). Posture inconsistency is a secondary check; garment inconsistency is the primary case the PG-0003 failure motivates.

### 2. New deterministic check spec — added inline to both phase-7 references

Insert after the existing post-LLM check enumeration in both `phase-7-root-page-plan.md` and `phase-7-page-plan.md`:

> **Cast Material Reality consistency** (deterministic, post-LLM): for each `frontmatter.declared_visible_affordances[]` entry mapping to a `STENT-NNNN` with a `character_id`, and for each §8 cast-block "Current intentions" prose paragraph for the same STENT — scan the prose for garment-kind tokens from the vocabulary at `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`. For each detected garment-kind token, verify the cast member's projected `body.Material Reality` clothing summary contains the parent garment (per the kind→parent mapping). FAIL → re-prompt Phase 7 with the offending affordance / intention prose and the cast member's actual Material Reality clothing summary inlined as correction context. Up to 3 re-prompts share the existing Phase 7 budget. Posture-vs-condition check follows the same shape, secondary in firing priority.

### 3. Phase 9 validation-gate mapping update

In both phase-9-validation-gates references, add the new check as a structural validator key:
- `cast_material_reality_consistency` recorded in PG-record `validation_trace` (or STORY_KERNEL.md frontmatter `validation_trace` for bootstrap). The gate records PASS-with-rationale when no garment-kind tokens detected OR all detected tokens grounded in projected Material Reality; FAIL feeds into the Phase 7 re-prompt budget.

### 4. Phase 7 re-prompt log update

When the check fires, the re-prompt assembly inlines:
- The offending affordance_text or intention prose with the garment-kind token highlighted.
- The cast member's exact Material Reality clothing summary (verbatim from projection).
- An explicit instruction: "Rewrite the affordance / intention without invoking a garment not present in the cast member's Material Reality, OR using anatomy / posture / object terms compatible with the projected clothing."

## Files to Touch

- `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md` (new)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- Fuzzy / semantic NLU matching beyond the closed garment wordlist. The check is precision-over-recall; rare or world-specific garments (e.g., chiton, kimono-obi) not in the wordlist will not trigger a check — discipline at storylet-authoring (PPLAN-004) and at plan-authoring per pre-flight projection (PPLAN-001) are the upstream defenses.
- Validating ENTIRELY-correct prose for plausibility ("the bruise was visible through her crop top, which she could not adjust" is correct under the check; a plan-author LLM that needs this kind of consequence-aware rewrite is the LLM's responsibility, not the deterministic check's).
- Tooling integration with `tools/validators/` package. The check lives inside the skill prose (Phase 7 post-LLM); promoting it to the validator framework is a future MCPENH-flavored ticket.

## Acceptance Criteria

### Tests That Must Pass

1. New reference `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md` exists and contains both wordlists.
2. Both `phase-7-root-page-plan.md` and `phase-7-page-plan.md` document the new `cast_material_reality_consistency` check in the post-LLM gate enumeration.
3. Both `phase-9-validation-gates.md` references include the new check as a recorded gate in the validation_trace mapping.
4. Hand-crafted contradiction case (sleeve affordance, crop-top wardrobe) triggers the re-prompt loop.
5. Existing PG-0003 frontmatter + §8 intention prose, re-validated against Ane Arrieta's dossier, fires the gate (audit verification that the new check would have caught the historical failure).

### Invariants

1. The check is deterministic; no LLM call inside the gate. (LLM is invoked only on re-prompt, which is the existing Phase 7 budget.)
2. The check operates on projected Material Reality content; if the projected section is unavailable at runtime despite the archived PPLAN-001 prerequisite, the gate records PASS-with-rationale documenting the missing projection rather than firing a false negative.

## Test Plan

### New/Modified Tests

1. Manual hand-crafted Phase 7 working-buffer contradiction case — used for first-run gate verification. No automated test infrastructure for skill-internal phase gates exists; verification is documented at the skill-prose level + dry-run.
2. Historical PG-0003 audit case — the existing `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-0003.md` frontmatter + §8 intention prose is the canonical regression case; the new check, simulated against Ane Arrieta's dossier, should fire.

### Commands

1. `grep -n 'cast_material_reality_consistency' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (all four sites name the new check).
2. Manual dry-run on PG-0004 of `worlds/erotica-world/stories/red-bunny` confirming the gate runs and records PASS (no contradiction) or appropriate FAIL with re-prompt context.
