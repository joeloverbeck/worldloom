# SPEC-78 — FOUNDATIONS Amendment for Driver-Primitive Principle Extensions

**Status:** Draft (proposed 2026-05-23)
**Spec ID:** SPEC-78
**Type:** FOUNDATIONS amendment (docs-only; no schema, no validator, no skill changes)
**Successors:** [SPEC-76](SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md), [SPEC-77](SPEC-77-slt-grounding-provenance-minimal.md) (downstream consumers — their FOUNDATIONS-citation surfaces reference the extended principles landed here)
**Source:** brainstorm continuation of `reports/slt-chc-overhaul-first-iteration.md` triage at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`. The user's question about FOUNDATIONS sufficiency for the driver primitive surfaced the two narrow principle extensions documented here.

## 1. Problem

SPEC-76 introduces the turn-driver primitive on `SE` — a meaningful expansion of what kinds of causality the engine supports. Event causality is no longer always player-initiated; events can be driven by NPCs, offstage actors, clocks, world pressure, secrets, or multi-actor collisions. The FOUNDATIONS document covers the underlying principles SPEC-76 honors — §Story Bundles §5c (Present Causal State, Not Narrative Shape) and §6b (Information / Observer Firewall) — but two specific surfaces in those sections were written assuming player-action initiation as the default and do not explicitly extend to the new shape:

**§5c "No global drama manager"** describes salience ranking as "the storylet pool offers commitment blocks, per-`SLT` `saliency` ranks the locally eligible ones." This is correct for SLT selection but does not name the *prior* salience pass that now happens at driver selection (which active record becomes this turn's causal initiator, when multiple are due). A future refactor could rationalize a global driver planner under §5c's existing language because the principle text does not explicitly cover the driver-selection layer.

**§6b "Information / Observer Firewall"** governs storylet selection, choice emission, and character action resolution. It does not explicitly cover event-level driver declaration — the new surface where `SE.turn_driver.driver_records[]` can cite hidden state (an unrevealed STSEC, an offstage STPLAN outside POV observation) and `pov_visibility` declares the access posture. A future operator reading §6b alone would not know the firewall extends to this surface.

Both extensions are *clarifications of existing principles*, not new principles. They are narrow (a single paragraph each). But they belong in FOUNDATIONS because the principles they extend already live there, and the shared story-state-contract is not the right home for principle-level scoping (per FOUNDATIONS §5b, the contract is authoritative for *schemas*; principles remain in FOUNDATIONS).

## 2. Decision

Amend `docs/FOUNDATIONS.md` with two surgical additions:

1. A new closing paragraph in §Story Bundles §5c titled **"Driver salience is local."** that extends the no-global-drama-manager principle to cover driver selection as a prior local-salience-ranking pass.
2. A new middle paragraph in §Story Bundles §6b that extends the Information / Observer Firewall to event-level driver declaration.

No other FOUNDATIONS sections change. No new sub-section (§5d, §6c) is created. The amendments are scoped to extending the language already present.

## 3. Scope — exact prose to add

### 3.1 §5c addition

**Placement:** at the end of `docs/FOUNDATIONS.md` §Story Bundles §5c (`docs/FOUNDATIONS.md:660-666`), after the existing "No global drama manager." paragraph that closes with "The architecture already embodies this; the principle exists to keep it from drifting."

**Prose to add (verbatim):**

```
**Driver salience is local.** Multi-source causality — player action plus active non-player pressure (NPC plans stepping, clocks firing, secrets reveal-ready, threads escalating, obligations falling due) — does not invite a global planner. Driver selection (which active record becomes this turn's causal initiator) is a *prior* local-salience-ranking pass before SLT selection: rank due drivers by urgency, break by player action when supplied, decline drivers whose access route is illegible. The system selects among existing active pressures; it does not look ahead to a target narrative shape. This composes with §5a (SLTs are causal moves) and the shared hard gates (story state contract §7) — driver-then-SLT is two local salience passes, not one global plan.
```

### 3.2 §6b addition

**Placement:** between the two existing paragraphs of `docs/FOUNDATIONS.md` §Story Bundles §6b (`docs/FOUNDATIONS.md:686-690`) — after the opening paragraph that ends with "...gives that actor an access route to the load-bearing information." and before the existing paragraph beginning with "This firewall governs move and choice generation."

**Prose to add (verbatim):**

```
The firewall also governs event-level driver declaration. When a causal event (`SE`) declares a non-player turn driver — `npc_action`, `offstage_action`, `clock_fire`, `world_pressure`, `secret_reveal`, `multi_actor_collision` — and its `driver_records[]` cite hidden state (an unrevealed `STSEC`, an offstage `STPLAN` outside POV observation, an active record the POV actor lacks an access route to), the declared `pov_visibility` must match the actor's actual access posture: `perceived_directly` only when the POV actor has direct observation; otherwise `inferred_from_trace`, `reported`, `discovered_after`, or `withheld`. The system may know the driver's full causal trace; the page-plan, prose, and emitted choices must render only what the POV is canonically licensed to know.
```

### 3.3 Coupling with SPEC-76

SPEC-76's §5 (Validation Rules Upheld) table cites §5c and §6b. With SPEC-78 landed, those citations remain valid but now reference the *extended* principles. SPEC-76 implementation should:

- Cite §5c (extended) as the source of the "driver selection is local salience ranking" discipline encoded in Phase 0.
- Cite §6b (extended) as the source of the `pov_visibility` enum and the `turn_driver_pov_observer_firewall` validator.

SPEC-76's §4 Out of Scope previously rejected "Updating `docs/FOUNDATIONS.md`"; that bullet was rewritten during the source brainstorm reversal session (2026-05-23) to instead point at SPEC-78 as the FOUNDATIONS amendment carrier. The edit is already in the working tree — implementers running Slice A should verify the `Carried separately by [SPEC-78]` bullet is present rather than re-applying the truthing edit.

## 4. Out of Scope

- **New §5d sub-section "Driver Authority".** Considered and rejected — would inflate FOUNDATIONS for what is fundamentally a clarification of two existing principles.
- **Amending §5a (Commitment Blocks Are Causal Moves), §5b (Schema-Minimalism), §6a (Belief vs Fact), or §6.1 (Story-Local Character Authority).** None need extension; the driver primitive composes with each without amendment.
- **Amending FOUNDATIONS §Validation Rules.** Rule 1 (No Floating Facts), Rule 4 (No Globalization by Accident), Rule 5 (No Consequence Evasion) all already cover the relevant surface; the driver primitive does not introduce new global-canon-mutation territory.
- **Amending `.claude/skills/_shared-templates/story-state-contract.md`.** Contract amendments are in SPEC-76's scope; SPEC-78 is FOUNDATIONS-only.
- **Updating skill descriptions, validators, or schemas.** SPEC-78 is docs-only. SPEC-76 and SPEC-77 carry all schema / validator / skill work.
- **Amending `docs/CONTEXT-PACKET-CONTRACT.md` and `docs/MACHINE-FACING-LAYER.md`.** The source report's §8.5 enumerated these alongside FOUNDATIONS.md to document new turn-driver and binding concepts. The triage's rejections (full `CHC.binding` object, candidate commitments, `SLT.grounding.source_records` — see [triage R1, R2, R5, R6](../docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md)) eliminated the source-report concepts that would have driven those contract amendments. SPEC-76's narrowed-scope additions (`SE.turn_driver`, `SLT.grounding.compatible_turn_drivers`, `reason_to_exist`) are accommodated by the existing context-packet projection and machine-layer retrieval surfaces without contract amendment.

## 5. Validation Rules Upheld

| Principle / surface | Source | How upheld |
|---|---|---|
| FOUNDATIONS §Change Control Policy | `docs/FOUNDATIONS.md:522-538` | Amendment is additive and surgical (two paragraphs). No existing principle is contradicted or relaxed. Existing language ("Selection is instead local salience ranking…") is extended, not replaced. |
| FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) | `docs/FOUNDATIONS.md:654-658` | Amendment adds no schema fields. The §5b test ("every field load-bearing") is moot for FOUNDATIONS prose. The amendments themselves are load-bearing principle clarifications — each names a structural surface (`driver_records`, `pov_visibility`) and an enforcement posture (local salience ranking, observer-firewall extension to event scope). |
| Downstream spec stability | SPEC-76 §5, SPEC-77 §5 | SPEC-76 and SPEC-77 do not need re-drafting; their FOUNDATIONS-citation references remain valid against the extended principles. The only consequent edit is to SPEC-76 §4 Out of Scope (removing the now-stale FOUNDATIONS-rejection bullet), included in Slice A. |
| Bar for future FOUNDATIONS amendments | This spec §1 | The amendment is scoped narrowly to two principle extensions whose absence would create a documentation gap a reader could not close from FOUNDATIONS alone. Schema additions that fit within existing principles (SPEC-47 STPLAN + STEMO, SPEC-48 SE `record_introductions[]` extension, SPEC-63 offstage causal packet tier) precedent that no FOUNDATIONS amendment fires by default; SPEC-78 fires because the driver primitive expands what kinds of *causal initiation* the engine recognizes — a principle-level expansion, not a record-class addition. |

## 6. Tests

FOUNDATIONS amendment is docs-only. The "tests" are reader-facing:

- A developer asking "does §6b cover event-level driver declaration?" should be able to answer "yes — see the second paragraph of §6b" by reading FOUNDATIONS alone, without needing to also read SPEC-76 or the shared story-state-contract. Verifiable by grep: `grep -A2 "firewall also governs event-level driver declaration" docs/FOUNDATIONS.md` returns the new paragraph.
- A future operator considering a global driver planner should hit §5c's "Driver salience is local." paragraph and be blocked at principle level, not just at contract / validator level. Verifiable by grep: `grep -B2 -A4 "Driver salience is local" docs/FOUNDATIONS.md` returns the new paragraph within §5c with the preceding "No global drama manager." closer separated by normal Markdown paragraph spacing.

No automated test harness changes.

## 7. Migration

None — no schema, no validator, no skill, no record migration. The amendment lands as two new paragraphs in `docs/FOUNDATIONS.md` plus a small edit to SPEC-76 §4 Out of Scope. The git diff is the migration record.

## 8. Implementation Slices

Single slice:

**Slice A — FOUNDATIONS prose additions.**
1. `Edit` `docs/FOUNDATIONS.md` to insert §5c addition at the end of §5c (after the existing "No global drama manager." paragraph). Verify surrounding text untouched.
2. `Edit` `docs/FOUNDATIONS.md` to insert §6b addition between the two existing paragraphs of §6b. Verify surrounding text untouched.
3. `Edit` to `specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md` §4 Out of Scope — **already applied during the source brainstorm session (2026-05-23)**; the `Carried separately by [SPEC-78]` bullet is already present. Implementers should verify presence (`grep -c "Carried separately by \[SPEC-78\]" specs/SPEC-76-*.md` returns 1) rather than re-applying.
4. Grep verification: the two new principle paragraphs appear in FOUNDATIONS with the exact prose from §3.1 and §3.2; SPEC-76 §4 carries the SPEC-78-pointing bullet (already in place per step 3).

`spec-to-tickets` will produce a single ticket for this slice.

## 9. Risk Reassessment

- **Setting a precedent for FOUNDATIONS amendments per schema change.** Real risk: every significant schema addition could be argued to warrant FOUNDATIONS amendment. Mitigation: the bar set by this spec is that an amendment fires only when the change expands a principle-level surface (a new kind of causal initiation, a new firewall surface) that a reader cannot infer from existing principles. SPEC-47 / SPEC-48 / SPEC-63 are the negative precedents — record-class additions within existing principles do not fire amendments. SPEC-78 is the positive precedent — principle-level surface expansion does.
- **Drift between FOUNDATIONS and the shared contract.** Mitigation: the shared story-state-contract amendment in SPEC-76 §3.2 (Gate 9: Turn-Driver Lawfulness) cites the extended §5c and §6b as the principles the gate enforces. Mutual citation keeps both documents aligned.
- **Reversal of an earlier triage decision.** The triage at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md` initially placed "Updating `docs/FOUNDATIONS.md`" in "Out of Scope" with the rationale "FOUNDATIONS principles are unchanged… only schema and contract surfaces change." The user's follow-up question about FOUNDATIONS sufficiency surfaced the gaps in §5c and §6b that the initial triage missed. The triage file was updated during the source brainstorm session (the `Update — 2026-05-23 — FOUNDATIONS amendment reversal` appendix); the triage update happened independently of Slice A and is recorded here as historical context rather than being a Slice A step.

## 10. References

- Source: brainstorm continuation of `reports/slt-chc-overhaul-first-iteration.md` triage at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`.
- FOUNDATIONS §Story Bundles §5c (existing prose to be extended): `docs/FOUNDATIONS.md:660-666`.
- FOUNDATIONS §Story Bundles §6b (existing prose to be extended): `docs/FOUNDATIONS.md:686-690`.
- Downstream consumers: [SPEC-76](SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md) (turn-driver primitive — relies on extended §5c for Phase 0 design and on extended §6b for `turn_driver_pov_observer_firewall` validator); [SPEC-77](SPEC-77-slt-grounding-provenance-minimal.md) (minimal SLT grounding — relies on extended §5c indirectly via the compatible-turn-drivers filter).
- Negative precedents (record-class additions that did not warrant FOUNDATIONS amendments): SPEC-47 (STPLAN + STEMO), SPEC-48 (SE `record_introductions[]` extension), SPEC-63 (offstage causal packet tier).
