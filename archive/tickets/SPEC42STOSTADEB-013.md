# SPEC42STOSTADEB-013: branching-story-prose-attach verification for clock-tick + secret-reveal prose

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `branching-story-prose-attach` SKILL.md Phase 3 `required_event_rendered` deterministic check to verify that rendered prose mentions clock-tick events present in the page's SE state-delta AND discloses revealed secrets when STSEC.status flips to `revealed`; surfaces findings as prose-receipt `notes[]` observations (not engine HARD-REJECTs); no new prose-attach phases introduced
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md, archive/tickets/SPEC42STOSTADEB-009.md

## Problem

At intake, turn-cycle integration (`archive/tickets/SPEC42STOSTADEB-009.md`) landed clock-tick and secret-reveal mechanisms during page commits, but rendered prose at `pages-prose/PG-<integer>.md` did not yet have explicit prose-attach receipt observations for those transitions. A CLK that ticks but is not mentioned in prose leaves readers without the dramatic-pressure cue; a STSEC that flips to `revealed` but the prose does not disclose creates state/prose divergence. The live prose-attach skill keeps prose-vs-state checks in Phase 3 `required_event_rendered`; Phase 4 is the optional craft critic. This ticket extends Phase 3 with two new prose verification subchecks.

## Assumption Reassessment (2026-05-18)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified during implementation (2026-05-18): `.claude/skills/branching-story-prose-attach/SKILL.md` exists. Live drift corrected from the drafted ticket: prose-vs-state checks are Phase 3 deterministic checks, while Phase 4 is the optional craft critic. The owned implementation extends Phase 3 check 4, `required_event_rendered`, with two subchecks instead of adding or renaming a phase.
2. Spec verified at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 4: "`branching-story-prose-attach` rendered-prose verification (when SE has clock-tick effect, prose mentions tick; when secret status flips to `revealed`, prose discloses)" — this ticket implements both checks inside the live prose-attach deterministic-check phase while preserving the spec's skill-integration intent.
3. Cross-skill / cross-tool shared boundary: `branching-story-prose-attach` is a Skill Category 2c skill. It depends on turn-cycle integration (-009) being complete — the SE.state_delta entries it inspects are produced by turn-cycle Phase 4. Prose-attach does NOT mutate state; it produces receipt observations only (per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary — rendered prose is a renderable receipt artifact, not a second state engine).
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) motivates this ticket directly: *"Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. ... Prose deviating from plan is routed by `branching-story-prose-attach` as either a prose-quality issue (revise prose), a structural-fact issue (run a repair turn), or a canon-candidate (run promotion)."* The two new prose verification checks (clock-tick verification + secret-reveal verification) operate within this discipline: they SURFACE prose-vs-state divergence as receipt observations the user can act on (revise prose / run repair turn / route to promotion); they NEVER HARD-REJECT a page commit. This preserves the canonical posture that rendered prose is a receipt, not a second state engine — even when the new classes introduce new categories of prose/state divergence. The heuristic-keyword-match approach for v1 is consistent with §4a's discipline: divergence is observed and surfaced, not engine-gated.
5. Receipt schema reassessment: `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 and `tools/validators/src/schemas/prose-receipt.schema.json` define a closed top-level receipt with `checks` plus free-form `notes[]`; there is no structured observation enum to extend. The truthful landing records `clock_tick_undisclosed:` and `secret_reveal_undisclosed:` note prefixes and leaves the receipt schema unchanged.
6. Proof reassessment: no executable prose-attach dry-run or fixture harness exists in this repo for skill invocations. The accepted proof is manual contract review plus grep-proof over the edited skill and ticket, with `git diff --check` hygiene.

## Architecture Check

1. **Prose-receipt observations, not engine HARD-REJECTs**: this distinction preserves §4a Plan-Authority Boundary — rendered prose deviating from plan is routed by prose-attach as a prose-quality issue (revise prose), a structural-fact issue (run a repair turn), or a canon-candidate (run promotion); it does NOT HARD-REJECT the page commit. The two new checks follow this existing pattern.
2. **Two new checks share the same Phase 3 surface**: both clock-tick verification and secret-reveal verification are prose-vs-SE-state-delta diffs under `required_event_rendered`. Bundling them keeps the deterministic-check extension reviewable as a unit without adding new receipt fields.
3. **No new prose-attach phases**: extends Phase 3 check 4 only; preserves the existing 8 deterministic checks plus optional craft critic structure.

## Verification Layers

1. Prose-attach flags rendered prose that omits a clock-tick event present in the page's SE state-delta → manual contract review + grep-proof for `clock_tick_undisclosed` under `required_event_rendered`
2. Prose-attach flags rendered prose that does not disclose a STSEC status flip to `revealed` present in the page's SE state-delta → manual contract review + grep-proof for `secret_reveal_undisclosed` under `required_event_rendered`
3. Prose-attach does NOT flag pages without clock-tick or secret-reveal SE entries → manual contract review confirming both subchecks are conditional on `tick_pressure_clock`, `reveal_story_secret`, or STSEC reveal transitions in plan §7 / `SE.state_delta`
4. Prose-attach receipts include the new observations without breaking the existing receipt schema → manual schema-compatibility review confirming observations are `notes[]` prefixes, not new top-level fields

## Landed Changes

### 1. Phase 3 extension — clock-tick prose verification

Modified `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 3 check 4 (`required_event_rendered`):
- For each `tick_pressure_clock` op in plan §7 / `SE.state_delta`, the skill now verifies rendered prose mentions the pressure shift using the clock title, tick cause, or another unmistakable pressure cue from the plan.
- Omitted ticks are surfaced as prose-receipt notes beginning `clock_tick_undisclosed:` and drive `required_event_rendered: WARN` when the selected event is otherwise rendered.
- Contradicted ticks or hidden load-bearing threshold firings drive `required_event_rendered: FAIL`.

### 2. Phase 3 extension — secret-reveal prose verification

Added a second `required_event_rendered` subcheck:
- For each `reveal_story_secret` op or STSEC status transition to `revealed` in plan §7 / `SE.state_delta`, the skill now verifies rendered prose discloses the secret using keywords from `secret_claim`, `reveal_records[]`, or `clue_carriers[].clue_text` when present in the page plan.
- Omitted disclosures are surfaced as prose-receipt notes beginning `secret_reveal_undisclosed:` and drive `required_event_rendered: WARN` when the surrounding event is otherwise rendered.
- Contradicted reveals or prose implying the secret remains hidden after the committed reveal drive `required_event_rendered: FAIL`.

### 3. Receipt schema boundary

No schema change landed. The live prose receipt schema has free-form `notes[]` and no structured observation enum, so the observations use note prefixes and preserve the existing receipt shape.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — Phase 3 `required_event_rendered` subchecks)
- `archive/tickets/SPEC42STOSTADEB-013.md` (modify — reassessment, proof substitution, and closeout truthing)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class validators — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by archive/tickets/SPEC42STOSTADEB-008.md
- Turn-cycle integration producing the SE.state_delta entries this ticket inspects — landed in `archive/tickets/SPEC42STOSTADEB-009.md`
- Bootstrap optional seeding — owned by SPEC42STOSTADEB-010
- Commitment-block-authoring extension — owned by archive/tickets/SPEC42STOSTADEB-011.md
- Health-audit bundle-wide checks — landed in `archive/tickets/SPEC42STOSTADEB-012.md`
- STQ-specific prose verification (per SPEC-42 §E Phase 4 names CLK and STSEC; STQ has no equivalent prose-verification requirement in the spec)
- Semantic-match refinement for keyword-based heuristics (deferred to future tickets if the v1 heuristic proves insufficient)

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'clock_tick_undisclosed|secret_reveal_undisclosed|required_event_rendered|tick_pressure_clock|reveal_story_secret|notes\\[\\]' .claude/skills/branching-story-prose-attach/SKILL.md archive/tickets/SPEC42STOSTADEB-013.md` shows both observation note prefixes under `required_event_rendered`, with the triggering ops and `notes[]` receipt surface.
2. Manual contract review confirms the new checks are conditional on plan §7 / `SE.state_delta` entries and do not introduce false positives for pages with no clock-tick or secret-reveal transitions.
3. Manual schema-compatibility review confirms no new receipt top-level fields or `checks` fields were added; observations use existing free-form `notes[]`.
4. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md archive/tickets/SPEC42STOSTADEB-013.md` passes.

### Invariants

1. The two new checks are prose-receipt observations only — they NEVER HARD-REJECT a page commit (per §4a Plan-Authority Boundary)
2. The existing deterministic checks remain the same eight top-level receipt checks; the new guidance is contained inside `required_event_rendered`
3. The receipt schema is unchanged; existing receipts continue to parse without modification
4. The heuristic-keyword-match approach is v1; semantic-match refinement is explicit out-of-scope

## Test Plan

### New/Modified Tests

1. None — skill-prose integration ticket; no executable prose-attach dry-run harness or skill-fixture test structure is present in this repo. Verification is manual contract review plus grep/hygiene proof.

### Commands

1. `rg -n 'clock_tick_undisclosed|secret_reveal_undisclosed|required_event_rendered|tick_pressure_clock|reveal_story_secret|notes\\[\\]' .claude/skills/branching-story-prose-attach/SKILL.md archive/tickets/SPEC42STOSTADEB-013.md`
2. Manual contract review of `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 3 check 4, the `<HARD-GATE>` pre-write checklist, and `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 receipt schema
3. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md archive/tickets/SPEC42STOSTADEB-013.md`
4. The full-pipeline executable verification remains owned by SPEC42STOSTADEB-015 capstone

## Outcome

Completed on 2026-05-18.

`branching-story-prose-attach` now records SPEC-42 CLK tick and STSEC reveal prose/state divergence as deterministic `required_event_rendered` subchecks. Missing prose cues are reported through existing receipt `notes[]` prefixes (`clock_tick_undisclosed:` and `secret_reveal_undisclosed:`), preserving the closed receipt schema and the Plan-Authority Boundary. No new skill phase, receipt top-level field, or engine HARD-REJECT was introduced.

## Verification Result

1. `rg -n 'clock_tick_undisclosed|secret_reveal_undisclosed|required_event_rendered|tick_pressure_clock|reveal_story_secret|notes\\[\\]' .claude/skills/branching-story-prose-attach/SKILL.md archive/tickets/SPEC42STOSTADEB-013.md` — passed; found both note prefixes, the triggering ops, the `required_event_rendered` owner check, and the `notes[]` receipt surface.
2. Manual contract review — passed; the new checks are conditional on plan §7 / `SE.state_delta`, keep the existing eight top-level deterministic checks, and preserve the HARD-GATE approval boundary before receipt writes.
3. Manual schema-compatibility review — passed; `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 and `tools/validators/src/schemas/prose-receipt.schema.json` already provide free-form `notes[]`, so no validator/schema edit was needed.
4. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md archive/tickets/SPEC42STOSTADEB-013.md` — passed.

## Deviations

1. The drafted ticket described this as a Phase 4 prose-vs-state extension. Live prose-attach uses Phase 4 for the optional craft critic, so the implementation landed under Phase 3 `required_event_rendered`.
2. The drafted ticket named skill dry-runs and fixture tests, but no executable prose-attach runner or fixture harness exists in the live repo. Verification was narrowed to manual contract review plus grep/hygiene proof; the end-to-end executable proof remains owned by the capstone ticket.
3. The drafted ticket allowed a receipt schema extension if structured observation fields existed. Live receipts use free-form `notes[]`; no schema extension was needed or made.
