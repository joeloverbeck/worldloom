# SPEC78FOUAMEDRI-001: FOUNDATIONS §Story Bundles §5c + §6b prose extensions for driver primitive

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — docs-only amendment to `docs/FOUNDATIONS.md`; no schema, validator, hook, skill, or record changes. No new package or directory introduced.
**Deps**: None — SPEC-78 is row 1 in `specs/IMPLEMENTATION-ORDER.md` (FOUNDATIONS is upstream of the shared story-state-contract and the story-event / story-storylet schemas that SPEC-76 + SPEC-77 amend).

## Problem

SPEC-76 introduces the turn-driver primitive on `SE` — a meaningful expansion of what kinds of causality the engine supports (player_action / player_write_in / npc_action / offstage_action / clock_fire / world_pressure / secret_reveal / multi_actor_collision). FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) and §6b (Information / Observer Firewall) were written assuming player-action initiation as the default and do not explicitly extend to the new shape:

- **§5c** describes salience ranking as the storylet pool offering commitment blocks ("Selection is instead local salience ranking… per-`SLT` `saliency` ranks the locally eligible ones"); it does not name the *prior* salience pass that now happens at driver selection (which active record becomes this turn's causal initiator, when multiple are due). A future refactor could rationalize a global driver planner under §5c's existing language because the principle text does not explicitly cover the driver-selection layer.
- **§6b** governs storylet selection, choice emission, and character action resolution; it does not explicitly cover event-level driver declaration — the new surface where `SE.turn_driver.driver_records[]` can cite hidden state (an unrevealed `STSEC`, an offstage `STPLAN` outside POV observation) and `pov_visibility` declares the access posture.

This ticket lands the two narrow principle extensions per SPEC-78's Slice A items 1 + 2 — surgical additive paragraphs that preserve the existing principle structure rather than replacing it. Slice A item 3 (SPEC-76 §4 Out of Scope truthing) was pre-applied during the source brainstorm reversal session (2026-05-23); this ticket verifies its presence rather than re-applies. Slice A item 4 (grep verification) is the ticket's acceptance criterion.

## Assumption Reassessment (2026-05-23)

1. `docs/FOUNDATIONS.md` exists with §Story Bundles §5c at line 660 (heading: "Present Causal State, Not Narrative Shape" — closes with the "No global drama manager." paragraph ending "The architecture already embodies this; the principle exists to keep it from drifting.") and §6b at line 686 (heading: "Information / Observer Firewall" — opens with the storylet-selection / choice-emission / character-action paragraph ending "...gives that actor an access route to the load-bearing information."; closes with the `expected_witnesses` post-event propagation paragraph). Verified during SPEC-78 reassessment (this session, 2026-05-23) via `grep -n "^### 5c\|^### 6b" docs/FOUNDATIONS.md` returning lines 660 + 686 exactly.
2. SPEC-78 (this spec) is row 1 in `specs/IMPLEMENTATION-ORDER.md` ahead of SPEC-76 (row 2) and SPEC-77 (row 3); the sequencing rationale is "FOUNDATIONS is upstream — SPEC-76's `Validation Rules Upheld` table cites the extended §5c and §6b, so landing SPEC-76 first would mean SPEC-76 cites principles that don't yet exist in their extended form." SPEC-76 §4 Out of Scope already carries the `Carried separately by [SPEC-78]` forward-reference bullet (pre-applied during the source brainstorm reversal flow). `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md` carries an `Update — 2026-05-23 — FOUNDATIONS amendment reversal` appendix documenting the trigger question, verdict change, and audit-trail value.
3. **Cross-artifact boundary under audit**: this ticket lands FOUNDATIONS prose that SPEC-76 + SPEC-77 consume. The boundary is read-only from SPEC-76/77's perspective — they cite the principles by section name (`§5c`, `§6b`); this ticket does not modify SPEC-76 or SPEC-77 content. The contract is: post-landing, a reader following SPEC-76 §5's citation to `§5c` reaches the extended principle; following SPEC-76 §3.6.2's citation to `§6b` reaches the extended firewall. SPEC-76 §4 is verified-not-modified — the previously-rejected FOUNDATIONS-amendment bullet was already rewritten to `Carried separately by [SPEC-78]` during the source brainstorm reversal session, ahead of this ticket.
4. **FOUNDATIONS principle restatement** — §Story Bundles §5c (Present Causal State, Not Narrative Shape): the new closing paragraph "Driver salience is local." extends §5c's no-global-drama-manager principle by naming driver selection as a *prior* local-salience-ranking pass before SLT selection ("rank due drivers by urgency, break by player action when supplied, decline drivers whose access route is illegible"). The amendment preserves §5c's central thesis ("Selection is instead local salience ranking gated by hard coherence gates") and forecloses a future refactor that would smuggle a global driver planner through the gap. §Story Bundles §6b (Information / Observer Firewall): the new middle paragraph extends the firewall from actor-level discipline (storylet selection, choice emission, character action) to event-level driver declaration (`SE.turn_driver.driver_records[]` citing hidden state must declare `pov_visibility` matching the POV actor's actual access). The amendment strengthens FOUNDATIONS Rule 7 (Preserve Mystery Deliberately) by closing a documentation gap that would otherwise let a non-player driver's `driver_records[]` cite an unrevealed `STSEC` or an offstage `STPLAN` without explicit pov_visibility discipline. Both extensions are additive — existing language is preserved verbatim; the new paragraphs slot in at SPEC-78 §3.1 / §3.2's specified placements.

## Architecture Check

1. **Cleaner than the §5d alternative**: SPEC-78 considered and rejected adding a new §5d "Driver Authority" sub-section to FOUNDATIONS (rationale in SPEC-78 §4 Out of Scope). The two narrow in-place extensions inside §5c and §6b preserve the existing principle structure — new content extends rather than displaces the language already there — and avoid inflating FOUNDATIONS for what is fundamentally a clarification of two existing principles. SPEC-47 (STPLAN + STEMO), SPEC-48 (SE `record_introductions[]` extension), and SPEC-63 (offstage causal packet tier) are the negative precedents — record-class additions that did not trigger FOUNDATIONS amendments because they fit within existing principles. SPEC-78 is the positive precedent — principle-level surface expansion (a new kind of causal initiation, a new firewall surface) that justifies in-place extension.
2. **No backwards-compatibility aliasing or shims introduced**. FOUNDATIONS prose is the source of truth; the amendment is the new source of truth from the landing commit forward. No alias paths, no deprecation period, no parallel-rule structure.

## Verification Layers

1. The §5c "Driver salience is local." paragraph exists at the end of §Story Bundles §5c, after the existing "No global drama manager." paragraph → **codebase grep-proof**: `grep -B2 -A4 "Driver salience is local" docs/FOUNDATIONS.md` returns the new paragraph within §5c with the preceding "No global drama manager." closer separated by normal Markdown paragraph spacing.
2. The §6b event-level driver-declaration paragraph exists between the two existing paragraphs of §Story Bundles §6b → **codebase grep-proof**: `grep -A2 "firewall also governs event-level driver declaration" docs/FOUNDATIONS.md` returns the new paragraph followed by the existing "This firewall governs move and choice generation." opening of the existing post-event-propagation paragraph.
3. SPEC-76 §4 Out of Scope still carries the `Carried separately by [SPEC-78]` forward-reference bullet (pre-applied during source brainstorm reversal session 2026-05-23; this ticket verifies presence, not re-applies) → **codebase grep-proof**: `grep -c "Carried separately by \[SPEC-78\]" specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md` returns 1.
4. FOUNDATIONS §5c "No act structure." / "No global drama manager." paragraphs and §6b opening + closing paragraphs remain byte-unchanged (additive amendment, not replacement) → **manual review** of `git diff docs/FOUNDATIONS.md` before landing the commit; diff should show two new paragraph insertions only, with no modifications to surrounding text.

## Landed Changes

### 1. Insert §5c addition

`docs/FOUNDATIONS.md` now contains a new paragraph at the end of §Story Bundles §5c, AFTER the existing "No global drama manager." paragraph that closes with "The architecture already embodies this; the principle exists to keep it from drifting." Landed prose:

```
**Driver salience is local.** Multi-source causality — player action plus active non-player pressure (NPC plans stepping, clocks firing, secrets reveal-ready, threads escalating, obligations falling due) — does not invite a global planner. Driver selection (which active record becomes this turn's causal initiator) is a *prior* local-salience-ranking pass before SLT selection: rank due drivers by urgency, break by player action when supplied, decline drivers whose access route is illegible. The system selects among existing active pressures; it does not look ahead to a target narrative shape. This composes with §5a (SLTs are causal moves) and the shared hard gates (story state contract §7) — driver-then-SLT is two local salience passes, not one global plan.
```

The new paragraph slots between the existing "No global drama manager." paragraph's closing sentence and the §-headed boundary that begins §Story Bundles §6 (Story-Bundle ID Classes).

### 2. Insert §6b addition

`docs/FOUNDATIONS.md` now contains a new middle paragraph in §Story Bundles §6b, AFTER the existing opening paragraph (which ends with "...gives that actor an access route to the load-bearing information.") and BEFORE the existing closing paragraph (which begins with "This firewall governs move and choice generation."). Landed prose:

```
The firewall also governs event-level driver declaration. When a causal event (`SE`) declares a non-player turn driver — `npc_action`, `offstage_action`, `clock_fire`, `world_pressure`, `secret_reveal`, `multi_actor_collision` — and its `driver_records[]` cite hidden state (an unrevealed `STSEC`, an offstage `STPLAN` outside POV observation, an active record the POV actor lacks an access route to), the declared `pov_visibility` must match the actor's actual access posture: `perceived_directly` only when the POV actor has direct observation; otherwise `inferred_from_trace`, `reported`, `discovered_after`, or `withheld`. The system may know the driver's full causal trace; the page-plan, prose, and emitted choices must render only what the POV is canonically licensed to know.
```

The new paragraph slots between the existing two paragraphs of §6b — it must NOT be appended at the end (the closing `expected_witnesses` paragraph must remain the §6b closer).

### 3. Verify SPEC-76 §4 truthing (no edit required)

Per SPEC-78 §8 Slice A step 3, the SPEC-76 §4 Out of Scope bullet was rewritten to point at SPEC-78 during the source brainstorm reversal flow (2026-05-23). This ticket did not re-apply that edit; it verified the bullet's presence as part of acceptance:

```
grep -c "Carried separately by \[SPEC-78\]" specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md
```

Observed output: `1`.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify) — inserted two new paragraphs per §Landed Changes items 1 + 2.
- `specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md` (modify) — corrected the §5c grep proof from `-B1` to `-B2` so the command matches normal Markdown paragraph spacing.
- `archive/tickets/SPEC78FOUAMEDRI-001.md` (modify) — closeout truthing and archival.

## Out of Scope

- **Amending `.claude/skills/_shared-templates/story-state-contract.md`.** Contract amendments are in SPEC-76's scope (SPEC-76 §3.2 adds Gate 9: Turn-Driver Lawfulness to the shared contract's §7 hard gates).
- **Amending `docs/CONTEXT-PACKET-CONTRACT.md` or `docs/MACHINE-FACING-LAYER.md`.** Per SPEC-78 §4 Out of Scope, the slimmed architecture (after the triage rejections of full `CHC.binding` object, candidate commitments, and `SLT.grounding.source_records`) does not require new context-packet concepts or machine-layer edges.
- **Modifying any schema** (`tools/validators/src/schemas/story-event.schema.json`, `story-storylet.schema.json`, etc.). SPEC-76 + SPEC-77 carry all schema work.
- **Modifying any validator** (`tools/validators/src/structural/*.ts`, `tools/validators/src/rules/*.ts`). SPEC-76 §3.6 introduces 4 new validators (`turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`); SPEC-77 §3.4 adds `slt_grounding_minimal_integrity`. None of those land here.
- **Modifying any skill** (`.claude/skills/branching-story-turn-cycle/SKILL.md`, `branching-story-bootstrap/SKILL.md`, etc.). SPEC-76 §3.3-§3.5 carries the skill amendments (Phase 0 driver evaluation, bootstrap, health-audit).
- **Re-applying the SPEC-76 §4 Out of Scope truthing.** Already pre-applied; this ticket verifies presence only (Verification Layer 3).
- **Adding a new §5d "Driver Authority" FOUNDATIONS sub-section.** SPEC-78 §4 Out of Scope rejects this alternative — the two narrow in-place extensions are sufficient.
- **Product commit logic.** The ticket does not add repo tooling or workflow behavior for commits; orchestration commits are handled by the `implement-spec-tickets` harness after review.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -B2 -A4 "Driver salience is local" docs/FOUNDATIONS.md` returns the new §5c paragraph in full, with the preceding "No global drama manager." closer visible before the normal Markdown paragraph blank line.
2. `grep -A2 "firewall also governs event-level driver declaration" docs/FOUNDATIONS.md` returns the new §6b middle paragraph followed by the opening of the existing closing paragraph ("This firewall governs move and choice generation.") confirming the new paragraph slots between the two existing §6b paragraphs rather than appending after the closer.
3. `grep -c "Carried separately by \[SPEC-78\]" specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md` returns `1` (confirming the pre-applied SPEC-76 §4 truthing bullet remains in place).
4. Manual review: `git diff docs/FOUNDATIONS.md` shows exactly two new paragraph insertions; the surrounding text (§5c "No act structure." / "No global drama manager." paragraphs, §6b opening + closing paragraphs) is byte-unchanged.

### Invariants

1. FOUNDATIONS §Story Bundles §5c's "Driver salience is local." paragraph is the structural expression of the local-salience-ranking principle extended to driver selection. Future schema additions introducing a new kind of causal initiation must respect this principle (driver selection remains a prior local-salience-ranking pass before SLT selection; no global driver planner).
2. FOUNDATIONS §Story Bundles §6b's event-level driver-declaration paragraph extends the Information / Observer Firewall to `SE.turn_driver.driver_records[]` + `pov_visibility`. Any future SE-level event surface citing hidden state in driver-records must declare a `pov_visibility` consistent with the POV actor's actual access route.
3. The amendment is additive and surgical (two paragraphs); no existing FOUNDATIONS principle is contradicted or relaxed. Existing language ("Selection is instead local salience ranking…", "Storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity") is extended, not replaced.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based (the four grep / git-diff commands enumerated below) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -B2 -A4 "Driver salience is local" docs/FOUNDATIONS.md` — verifies the §5c extension landed within §Story Bundles §5c with correct leading context across normal Markdown paragraph spacing.
2. `grep -A2 "firewall also governs event-level driver declaration" docs/FOUNDATIONS.md` — verifies the §6b extension landed between the two existing §6b paragraphs (not after the closer).
3. `grep -c "Carried separately by \[SPEC-78\]" specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md` — verifies the pre-applied SPEC-76 §4 truthing bullet remains in place; expect `1`.
4. `git diff docs/FOUNDATIONS.md` — manual review surface for confirming the two paragraph insertions are surgical (no drift in surrounding text); the diff should show only two new contiguous paragraph blocks.

## Outcome

Completed: 2026-05-23.

The FOUNDATIONS amendment landed as two additive Story Bundles paragraphs: §5c now explicitly names driver selection as a prior local-salience-ranking pass, and §6b now explicitly extends the Information / Observer Firewall to event-level non-player driver declaration and `pov_visibility`. SPEC-76 §4's pre-applied SPEC-78 forward reference was verified unchanged.

## Verification Result

1. `grep -B2 -A4 "Driver salience is local" docs/FOUNDATIONS.md` — passed; output shows the new §5c paragraph immediately after the "No global drama manager." closer, with normal Markdown spacing.
2. `grep -A2 "firewall also governs event-level driver declaration" docs/FOUNDATIONS.md` — passed; output shows the new §6b middle paragraph followed by the existing "This firewall governs move and choice generation." closer.
3. `grep -c "Carried separately by \[SPEC-78\]" specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md` — passed with output `1`.
4. `git diff -- docs/FOUNDATIONS.md` — manually reviewed; the product diff is exactly two paragraph insertions in FOUNDATIONS.

## Deviations

- The drafted §5c proof used `grep -B1`, but normal Markdown paragraph spacing means `-B1` captures the blank line before the inserted paragraph. The accepted proof was corrected to `grep -B2 -A4 "Driver salience is local" docs/FOUNDATIONS.md` in this ticket and in SPEC-78.
- The harness state file `.codex/run-state/implement-spec-tickets.json` was refreshed from a stale SPEC-74 blocked run to the active SPEC-78 run; that is orchestration state, not a product deliverable.
