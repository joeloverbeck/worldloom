# SPEC91PAGPLABOD-002: §9 / §9b / §9c / §10b body translation in bootstrap + turn-cycle phase references

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, `.claude/skills/_shared-templates/story-state-contract.md` §8 rows for §9 / §9b / §9c / §10b.
**Deps**: None

## Problem

At intake, page-plan §9 ("Relationship and Belief Context"), §9b ("Active actor plans / tactical agency"), §9c ("Emotional causality / affective transition"), and §10b ("Open Setups, Active Clocks, Hidden Secrets") allowed body content that enumerated raw record-IDs and engine-style ledger language: §9 listed `SREL-N` / `BEL-N` pairs without prose translation; §9b's sub-bullets cited `This page's SE.state_relations[]: advances` verb-list and `action_family: investigation` engine vocabulary; §9c cited `Behavioral pressure: conceal, freeze` closed-enum tokens; §10b printed `CLK-N value: 2/4, salience: high, threshold at 3` numeric-engine summaries. The external prose renderer reads cold and can orbit these abstract tokens in the rendered prose. This ticket extends the PPLAN-005/006 + archived `archive/tickets/SPEC91PAGPLABOD-001.md` translation pattern to §9 / §9b / §9c / §10b: structural sub-bullet templates remain validator-enforced (per shared-contract §8 rows covering §9b / §9c required sub-bullet sets), only the per-bullet content shape changes to prose-direction language; numeric values and closed-enum tokens move to §15 frontmatter where validators read them.

## Assumption Reassessment (2026-05-26)

<!-- Items 1-3 always required. Items 4+ from menu, renumbered sequentially. -->

1. **Codebase reference check**: At intake, `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, and `.claude/skills/_shared-templates/story-state-contract.md` existed with §9b / §9c / §10b guidance still exposing engine-field wording in renderer-facing section bodies. After this ticket, those same files carry the SPEC-91 body-translation guidance while preserving the validator-enforced §9b / §9c heading and sub-bullet label shapes. Sample plans at `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` §9b/§9c/§10b remain historical pathology evidence only; existing plans are out of scope for rewrite per SPEC-91 §9.
2. **Spec reference**: SPEC-91 §6 §9 / §9b / §9c / §10b subsections specify the body-translation contract per-section, with worked-example before/after pairs. SPEC91-002 ticket scope at §11 enumerates the four sections and the structural-sub-bullet preservation rule.
3. **Cross-skill boundary**: shared `.claude/skills/_shared-templates/story-state-contract.md` §8 is the canonical authority for §9 / §9b / §9c / §10b structure. §9b and §9c templates at lines 467-498 are validator-enforced via `page_plan_stchar_packet_integrity` and related validators — those templates' sub-bullet labels (`Objective:`, `Root intention:`, `Current step:`, `Belief basis:`, `Resources/leverage:`, `Blockers:`, `Fallbacks currently available:` for §9b; `Affect (kind + intensity):`, `Trigger event:`, `Appraisal basis:`, `Behavioral pressure:`, `Transition this page (if any):`, `Prose must render:`, `Prose must avoid:` for §9c) MUST be preserved; only the per-bullet content shape changes.
4. **FOUNDATIONS principle restatement**: §Story Bundles §4 (Pipeline shape: plan-as-renderer-prompt single-artifact) and §5b (Schema-Minimalism — every field load-bearing) together govern this ticket. §4 preserves the renderer's cold-context shape; §5b ensures the structural sub-bullet labels stay because each label is consumed by a validator gate. The body-translation contract changes only the prose content WITHIN each label's bullet — not the label set, not the schema fields the labels project from.

## Architecture Check

1. **Why preserving structural labels while rewording content is cleaner**: the alternative — collapsing §9b / §9c sub-bullets into free-form prose paragraphs — would break the `page_plan_stchar_packet_integrity` and adjacent validators that grep for the `STPLAN-<integer> — Holder: STENT-<integer>` and `STEMO-<integer> — Holder: STENT-<integer>` label patterns. Preserving the labels and rewording only the content keeps the validator surface stable while addressing the renderer-readability pathology.
2. **No backwards-compatibility shims**: existing plans authored under the engine-vocabulary content shape continue to validate (the structural sub-bullets are preserved); only new plans authored after SPEC-91 lands carry the prose-direction content. No dual-shape parser, no migration helper.

## Verification Layers

1. **§9 body content shape (post-translation)** → manual review of new authoring guidance + grep-proof that updated phase references describe the "Jon and Ane have no prior shared history; she has still not noticed him" prose form rather than `SREL-N` / `BEL-N` enumeration.
2. **§9b / §9c structural sub-bullet preservation** → codebase grep-proof + manual review: the sub-bullet labels and the `STPLAN-<integer>` / `STEMO-<integer>` / `Holder: STENT-<integer>` heading patterns the validator greps for stay intact; only per-bullet content shape changes.
3. **§10b numeric value preservation in §15** → manual review confirming `value`, `max`, `threshold`, `salience` numeric fields relocated from §10b body prose to §15 frontmatter remain greppable for validator readback.
4. **Contract-to-phase-reference alignment** → codebase grep-proof that story-state-contract.md §8 rows for §9 / §9b / §9c / §10b match the body-translation framing in both phase reference files.

## Landed Changes

### 1. Updated `.claude/skills/_shared-templates/story-state-contract.md` §8

Updated §8 row content for §9, §9b, §9c, and §10b to reflect the body-translation contract per SPEC-91 §6 §9 / §9b / §9c / §10b subsections. The structural §9b / §9c headings and sub-bullet labels remain intact, while the body guidance now says record ids and engine-field values live in §15 frontmatter or §16a `Current-state grounding records:` and renderer-facing bodies carry prose-direction content. Added §9 authoring guidance and per-section discipline notes, including `Behavioral pressure:` prose translation and numeric §10b value relocation to §15.

### 2. Updated `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`

Added bootstrap §9 / §9b / §9c / §10b authoring guidance per SPEC-91 §6, including worked §9 relationship/belief prose, preserved §9b / §9c structural labels, behavior-prose translation for §9c pressure, §10b numeric-field relocation to §15, and the §16a current-state-grounding exception.

### 3. Updated `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`

Added turn-cycle §9 / §9b / §9c body-translation guidance and rewrote the existing §10b procedure so clocks, secrets, and story questions are described as renderable pressure/setup movement while numeric and link fields remain in §15 frontmatter.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)

## Out of Scope

- Modifying the structural sub-bullet label sets for §9b / §9c — those are validator-enforced; this ticket changes only per-bullet content.
- Rewriting existing PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/` — per SPEC-91 §9 Migration / scope, forward-only.
- §7 / §7a body translation — covered by `archive/tickets/SPEC91PAGPLABOD-001.md`.
- §14 restructure — covered by SPEC91PAGPLABOD-003.
- Touching `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` or related validators — the validator surface stays stable under this ticket.
- Modifying the closed enums (`affect_kind`, `behavioral_pressure`, `action_family`, `clock_kind`, `salience`, etc.) — body rendering changes; underlying enums do not.

## Acceptance Criteria

### Tests That Must Pass

1. **Contract-to-phase-reference alignment grep**: `grep -B1 -A3 "Relationship and belief context\|Active actor plans / tactical agency\|Emotional causality / affective transition\|Open Setups, Active Clocks, Hidden Secrets" .claude/skills/_shared-templates/story-state-contract.md` returns the body-translation framing; the same framing surfaces in both bootstrap phase-8-9 and turn-cycle phase-7 reference files.
2. **§9b / §9c structural label preservation grep**: `grep -E "Objective:|Root intention:|Current step:|Affect \(kind \+ intensity\)|Behavioral pressure:" .claude/skills/_shared-templates/story-state-contract.md` returns the same label set as pre-SPEC-91 (no label dropped or renamed).
3. **§10b numeric-field relocation language present**: `grep -E "numeric.*§15|value.*max.*frontmatter" .claude/skills/_shared-templates/story-state-contract.md` returns the §10b authoring discipline note for numeric value relocation.

### Invariants

1. **§9b / §9c sub-bullet label sets unchanged**: `page_plan_stchar_packet_integrity` and related validators continue to grep for the same label patterns; this ticket does not modify the label set.
2. **Numeric values remain validator-readable from §15**: `CLK.value` / `CLK.max` / `STSEC.discovered_clue_carrier_count` / `STQ.salience` etc. that previously appeared in §10b body prose are preserved in §15 frontmatter so validators that read them at gate time still find them.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -B1 -A3 "Relationship and belief context\|Active actor plans\|Emotional causality\|Open Setups" .claude/skills/_shared-templates/story-state-contract.md` — confirms contract §8 row treatment for all four sections.
2. `grep -E "Objective:|Root intention:|Affect \(kind \+ intensity\)|Behavioral pressure:" .claude/skills/_shared-templates/story-state-contract.md` — confirms structural sub-bullet labels preserved.
3. `grep -E "what (an actor|a holder)|the actor pulls toward|the pressure has reached" .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — confirms both phase references carry prose-direction worked examples.

## Outcome

Completed 2026-05-26.

SPEC91PAGPLABOD-002 landed the §9 / §9b / §9c / §10b body-translation contract in the shared story-state contract and the bootstrap / turn-cycle phase references. §9 now uses relationship/belief prose instead of active-record enumeration; §9b and §9c keep their validator-visible headings and labels while translating field contents into prose direction; §10b keeps numeric and closed-field values in §15 frontmatter while the body describes pressure, secrecy, and setup/payoff movement.

No validator code changed. Existing PG-1 through PG-5 artifacts remain historical and untouched per SPEC-91's forward-only migration scope.

## Verification Result

Commands run 2026-05-26:

1. `grep -B1 -A3 "Relationship and belief context\|Active actor plans\|Emotional causality\|Open Setups" .claude/skills/_shared-templates/story-state-contract.md` — PASS; the §8 rows now state the body-translation framing for §9 / §9b / §9c / §10b.
2. `grep -E "Objective:|Root intention:|Affect \(kind \+ intensity\)|Behavioral pressure:" .claude/skills/_shared-templates/story-state-contract.md` — PASS; the structural §9b / §9c labels remain present.
3. `grep -E "what (an actor|a holder)|the actor pulls toward|the pressure has reached|Jon and Ane" .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md .claude/skills/_shared-templates/story-state-contract.md` — PASS; both phase references and the shared contract carry prose-direction examples.
4. `grep -E "numeric.*§15|value.*max.*frontmatter" .claude/skills/_shared-templates/story-state-contract.md` — PASS; §10b numeric-field relocation to §15 is documented.
5. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — PASS; no whitespace errors in the edited guidance files.

## Deviations

- No executable skill dry-run was available for these prose workflow references, so verification stayed at the ticket's intended documentation boundary: manual contract review, grep-proof, and diff hygiene.
- Pre-existing unrelated dirty path `.claude/worktrees/spec88-stoexpfro` was left untouched. During the run, unrelated edits appeared in `specs/SPEC-89-story-explorer-state-xray-layer.md`; they are outside this Spec 91 ticket and were left unstaged.
