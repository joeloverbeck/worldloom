# PPLAN-003: Add Phase-7-post-LLM deterministic clothing-consistency check

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds a new deterministic check to Phase 7 post-LLM gates in both `branching-story-bootstrap` and `branching-story-page-cycle`; updates Phase 9 validation-trace gate lists and examples; references the projected `body.Material Reality` data landed by PPLAN-001.
**Deps**: `archive/tickets/PPLAN-001-cast-material-reality-projection.md` (Material Reality projection landed first; this check reads from that projected data).

## Problem

At intake, even with `body.Material Reality` projected at pre-flight (PPLAN-001), the plan-authoring LLM could still author a `frontmatter.declared_visible_affordances[]` entry or a §8 cast-block intention that contradicted the projected clothing/body data. The PG-0003 failure on `worlds/erotica-world/stories/red-bunny`:

- `pages-prose-plans/PG-0003.md:31` `frontmatter.declared_visible_affordances[0].affordance_text`: *"Ane on the bench, sleeve angling to cover the bruise"*
- `pages-prose-plans/PG-0003.md:378` §8 Ane "Current intentions": *"Cover the bruise more deliberately now that he has named it (pull sleeve, angle the body away)."*
- Same plan §8 line 374: clothing correctly stated as *"pink off-shoulder crop top, pink short flared skirt, white thigh-high socks with pink hearts, white platform sneakers"*. A crop top has no sleeves.

That plan was internally inconsistent: §8 clothing prose and frontmatter/intention body-cover gestural language disagreed. Before this ticket, Phase 7's existing post-LLM `plan_completeness_check` was structural (every section populated; record ids resolve; required keys present); it did not test prose-vs-prose semantic consistency.

A deterministic check at Phase 7's post-LLM step now catches the common class of body-part / clothing contradictions:
- Affordance or intention prose names a garment kind not present in projected `Material Reality` clothing (`sleeve` when wardrobe is sleeveless; `hood` when wardrobe has no hooded garment; `pocket` when wardrobe is pocketless; `lapel` when no jacket; etc.).
- Affordance or intention names a body posture incompatible with projected condition (e.g., "stands" when condition states immobile).

## Assumption Reassessment (2026-05-12)

1. **Phase 7 post-LLM check is the right insertion site.** Verified: `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md:104-115` and `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md:110-122` document the existing post-LLM check ("structural, not stylistic"). Up to 3 re-prompts share the Phase 7 budget; the new check fits this re-prompt loop.
2. **Material Reality data is structurally available after PPLAN-001.** Verified by `archive/tickets/PPLAN-001-cast-material-reality-projection.md`: the dossier section is projected to the plan-authoring LLM AND remains reachable for post-LLM deterministic check (via `mcp__worldloom__get_record(CHAR-NNNN, section_path='body.Material Reality')`).
3. **Garment / body-part vocabulary the check enumerates is bounded.** The check uses a closed wordlist of common garment kinds (sleeve, hood, pocket, lapel, collar, hem, cuff, button, zipper, belt, scarf, jacket-tail, skirt-fold, etc.) and posture verbs (stands, walks, crouches, etc.) — not unbounded NLU. A garment name in an affordance / intention must be present (or its parent garment present) in the cast member's Material Reality clothing summary; absence triggers re-prompt.
4. **Shared boundary under audit**: the `frontmatter.declared_visible_affordances[].affordance_text` and §8 "Current intentions" body section are the two surfaces the check inspects. Both are populated by the plan-authoring LLM and read by downstream consumers (Phase 7.5 declared-affordance validation reads frontmatter; the renderer reads body §8).
5. **FOUNDATIONS principle under audit**: Rule 1 (No Floating Facts) — the plan IS load-bearing engine output (per FOUNDATIONS §Validation Rule 1 paragraph: *"its frontmatter declares affordances, intended beats, stop conditions, and `forbidden_resolutions[]` with explicit consequences and prerequisites"*). An affordance grounded in a body-part that doesn't exist on the actor is a floating fact at the affordance layer. The new check is a Rule 1 strengthening at the per-affordance grounding scale.
6. **Adjacent contradiction**: PPLAN-004 addresses the upstream cause (storylet `notes:` gestural examples that bake in character-specific clothing). PPLAN-003 catches the symptom at plan-generation. Both are needed — discipline upstream prevents the issue; the deterministic check is the defense-in-depth backstop when a storylet was authored before the discipline landed.
7. **Same-seam validation-trace fallout**: the drafted file list was too narrow. Adding a new Phase 9 validation-trace key changes the gate count and required trace examples in the parent `branching-story-bootstrap` / `branching-story-page-cycle` skill summaries, `branching-story-page-cycle/references/record-schemas.md`, and bootstrap story/PG templates. These are not separate feature work; they are the same contract surface needed to keep the new gate truthful.

## Architecture Check

1. The check is deterministic — closed wordlist + cast-Material-Reality projection lookup. Not LLM-based; no fuzzy semantic matching; failure modes are precise (named garment X is not in cast member Y's Material Reality clothing summary). This is consistent with Phase 7's existing post-LLM structural-not-stylistic posture.
2. No backwards-compatibility shims. The check is additive; existing plans with no garment contradiction pass trivially. Plans that DO have contradictions get a re-prompt — which is the existing Phase 7 budget mechanism, not a new control flow.
3. Failure handling matches existing Phase 7 budget: up to 3 re-prompts; escalates to user on exhaustion. The check does not introduce a new failure class outside the existing budget.

## Verification Layers

1. **Gate registered as Phase 7 post-LLM check** → codebase grep-proof: gate name `cast_material_reality_consistency` appears in both `phase-7-root-page-plan.md` and `phase-7-page-plan.md` post-LLM check enumeration AND in `phase-9-validation-gates.md` validation_trace mapping under the structural / by-construction layer (since Phase 7 surfaces it at plan-commit).
2. **Closed garment / posture wordlist is documented** → codebase grep-proof: `.claude/skills/_shared-templates/page-plan.md` or a new sibling reference (e.g., `.claude/skills/branching-story-page-cycle/references/clothing-consistency-vocabulary.md`) enumerates the garment-kind and posture-verb wordlists the check uses.
3. **Contradiction and non-contradiction cases are specified at the deterministic boundary** → manual contract review: the vocabulary + Phase 7 gate prose define that `sleeve` fails against a crop-top-only Material Reality summary, while generic anatomy such as shoulder, hand, arm, bruise, face, or body is not a garment-kind token.
4. **Existing PG-0003 case is covered by the specified gate** → manual review: the historical `sleeve` frontmatter / §8 intention examples match the `sleeve` token and fail when the mapped cast member's Material Reality contains only crop-top wardrobe evidence.
5. **Validation-trace contract stays coherent** → codebase grep-proof/manual review: parent skill HARD-GATE summaries, Phase 9 references, `record-schemas.md`, and bootstrap templates all include the new validation-trace key and updated gate counts.

## Landed Changes

### 1. New reference: `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`

Documented the closed wordlists the check uses:
- Garment kinds: sleeve, hood, pocket, lapel, collar, hem, cuff, button, zipper, belt, scarf, tie, jacket-tail, skirt-fold, sock, stocking, glove, hat, cap, helmet, veil, bandana, headband, headscarf, kerchief, brooch, pin, watch, bracelet, necklace, earring, ring (clothing + accessory subset that body-cover affordances commonly invoke).
- Garment-kind → parent-garment mapping: sleeve → {shirt, blouse, sweater, jacket, coat, dress, robe}; hood → {hoodie, sweatshirt, jacket, coat, robe, cape}; collar → {shirt, blouse, jacket, coat, dress}; etc. A garment-kind passes the check when its parent garment OR a synonym is present in the cast member's Material Reality clothing summary.
- Posture verbs: stands, walks, kneels, crouches, runs, sits, lies, leans, climbs, jumps — paired with projected condition checks (immobile, seated-only, bedridden, etc.). Posture inconsistency is a secondary check; garment inconsistency is the primary case the PG-0003 failure motivates.

### 2. New deterministic check spec — added inline to both phase-7 references

Inserted after the existing post-LLM check enumeration in both `phase-7-root-page-plan.md` and `phase-7-page-plan.md`:

> **Cast Material Reality consistency** (deterministic, post-LLM): for each `frontmatter.declared_visible_affordances[]` entry mapping to a `STENT-NNNN` with a `character_id`, and for each §8 cast-block "Current intentions" prose paragraph for the same STENT — scan the prose for garment-kind tokens from the vocabulary at `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`. For each detected garment-kind token, verify the cast member's projected `body.Material Reality` clothing summary contains the parent garment (per the kind→parent mapping). FAIL → re-prompt Phase 7 with the offending affordance / intention prose and the cast member's actual Material Reality clothing summary inlined as correction context. Up to 3 re-prompts share the existing Phase 7 budget. Posture-vs-condition check follows the same shape, secondary in firing priority.

### 3. Phase 9 validation-gate mapping update

In both phase-9-validation-gates references, added the new check as a structural validator key:
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
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` (modify)

## Out of Scope

- Fuzzy / semantic NLU matching beyond the closed garment wordlist. The check is precision-over-recall; rare or world-specific garments (e.g., chiton, kimono-obi) not in the wordlist will not trigger a check — discipline at storylet-authoring (PPLAN-004) and at plan-authoring per pre-flight projection (PPLAN-001) are the upstream defenses.
- Validating ENTIRELY-correct prose for plausibility ("the bruise was visible through her crop top, which she could not adjust" is correct under the check; a plan-author LLM that needs this kind of consequence-aware rewrite is the LLM's responsibility, not the deterministic check's).
- Tooling integration with `tools/validators/` package. The check lives inside the skill prose (Phase 7 post-LLM); promoting it to the validator framework is a future MCPENH-flavored ticket.

## Acceptance Criteria

### Tests That Must Pass

1. New reference `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md` exists and contains both wordlists.
2. Both `phase-7-root-page-plan.md` and `phase-7-page-plan.md` document the new `cast_material_reality_consistency` check in the post-LLM gate enumeration.
3. Both `phase-9-validation-gates.md` references include the new check as a recorded gate in the validation_trace mapping.
4. Manual contract review confirms the hand-crafted contradiction case (sleeve affordance, crop-top wardrobe) is a FAIL/re-prompt under the landed vocabulary and gate prose.
5. Manual contract review confirms the existing PG-0003 frontmatter + §8 intention prose matches the `sleeve` token and would FAIL against Ane Arrieta's crop-top Material Reality summary.

### Invariants

1. The check is deterministic; no LLM call inside the gate. (LLM is invoked only on re-prompt, which is the existing Phase 7 budget.)
2. The check operates on projected Material Reality content from the archived PPLAN-001 prerequisite. If that projection is unavailable, the gate cannot ground garment/posture tokens and routes the failure through Phase 7 rather than inventing wardrobe evidence or silently passing a contradiction.

## Test Plan

### New/Modified Tests

1. None — documentation/skill-contract ticket. No automated executable harness exists for skill-internal Phase 7 gates in this repo; verification is grep-based plus manual contract review.

### Commands

1. `grep -n 'cast_material_reality_consistency' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/record-schemas.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` (all required trace/gate surfaces name the new check).
2. `grep -n 'sleeve' .claude/skills/_shared-templates/clothing-consistency-vocabulary.md` and manual review of the same file (wordlist + parent mapping + posture tokens present).
3. `rg -n 'Phase 9 19-gate|19 Phase 9 gates|18 gates|gates 1-18|18 PG-record' .claude/skills/branching-story-bootstrap .claude/skills/branching-story-page-cycle .claude/skills/_shared-templates` (no stale old-count hits except legitimate page-cycle 19-gate wording).

## Outcome

Completion date: 2026-05-12.

Completed. The branching-story bootstrap and page-cycle skills now define `cast_material_reality_consistency` as a deterministic Phase 7 post-LLM check over declared visible affordances and §8 cast intentions. The shared vocabulary file documents the closed garment/posture token sets and parent-garment mapping. Phase 9 gate lists, parent skill HARD-GATE summaries, PG record schemas, and bootstrap templates now carry the new validation-trace key with updated gate counts.

## Verification Result

1. `grep -n 'cast_material_reality_consistency' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/record-schemas.md .claude/skills/branching-story-bootstrap/templates/story-kernel.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — PASS; every required trace/gate surface names the new key.
2. `grep -n 'sleeve' .claude/skills/_shared-templates/clothing-consistency-vocabulary.md` — PASS; `sleeve` appears in both the garment-kind token list and parent-garment mapping.
3. `rg -n 'Phase 9 19-gate|19 Phase 9 gates|18 gates|gates 1-18|18 PG-record' .claude/skills/branching-story-bootstrap .claude/skills/branching-story-page-cycle .claude/skills/_shared-templates` — PASS; no stale old-count hits remain.
4. Manual contract review — PASS; the historical PG-0003 "sleeve" contradiction is covered because `sleeve` is a garment token and crop top is not a mapped parent garment. Generic anatomy references are explicitly excluded from garment-token failures.
5. `git diff --check -- <owned paths>` after `git add -N .claude/skills/_shared-templates/clothing-consistency-vocabulary.md` — PASS; whitespace hygiene covered the new untracked vocabulary file and all modified owned paths.

## Deviations

- No live `branching-story-bootstrap` / `branching-story-page-cycle` dry-run was executed. This repo has no executable harness for skill-internal Phase 7 post-LLM gate runs; the truthful proof surface is skill-contract grep proof plus manual review of the deterministic vocabulary and gate prose.
- Scope widened from the draft file list to include parent `SKILL.md` summaries, bootstrap templates, `record-schemas.md`, and related Phase 9 references because the new validation-trace key changes the enumerated gate contract.
- Post-review closeout correction: the original invariant text implied missing projected Material Reality should PASS-with-rationale. The landed contract is stricter and treats missing/ungrounded projection as not groundable, routing it through the Phase 7 failure path rather than silently passing.
