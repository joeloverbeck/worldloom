# Phases 4-5: Belief / Visibility and Mystery / Canon Authority

## Phase 4: Update belief and visibility state

Before belief propagation, apply any instantiated new-class state transitions from `SE.state_delta`.

**Same-event creation precedence (SPEC-43).** Apply any same-event creations for
`CLK`, `STSEC`, and `STQ` before lifecycle operations against those classes.
Lifecycle operations run on the post-creation state, not on the pre-creation
state. A `CLK` created and ticked in the same `SE` lands through create first;
the initial tick is then represented through `tick_history[]` per
`tick_pressure_clock` semantics.

**belief propagation for STSEC creation and new causal state (SPEC-43).** Any new `STSEC`,
deceptive event, public relationship formation, new witness-bearing entity, or
newly visible pressure must pass the belief/visibility propagation discipline
below. Create or supersede `BEL` records through the existing Phase 4 belief
surface, or emit closed-set non-propagation tags. A new `STSEC` involving
deception or concealment must create initial `BEL` records for the holders'
lie-or-knowledge state and for witnesses who observed the deceptive event.

Apply class-specific lifecycle transitions:

- **CLK pressure clocks.** When the accepted event advances or resolves an active `CLK`, emit `tick_pressure_clock` with `target_clock_id`, `event: SE-<integer>`, nonzero `delta`, and a concrete `cause`; use `resolve_pressure_clock` when the clock is resolved without another tick. If a tick crosses one or more `CLK.thresholds[].at` values, materialize the threshold's `effects.create[]`, `effects.supersede[]`, and `effects.close[]` entries in the same `SE.state_delta` after resolving any `bound:<alias>` targets from Phase 2. Do not encode clock progress by directly editing prior CLK YAML or by inventing a prose-only clock note.
- **STSEC story secrets.** When the event discovers a clue carrier, emit `mark_secret_clue_discovered` for the carrier record and discoverer. When the event reveals the secret, emit `reveal_story_secret` with `reveal_event: SE-<integer>` and the BEL / SF / DA / STQ records that carry the revealed truth. A STSEC reveal is a secrecy / betrayal / deception event for this phase, so witness propagation below is mandatory: create or supersede the required `BEL` records for direct and indirect witnesses, or record closed-set non-propagation tags.
- **STQ open setups.** When the event answers or pays off an open `STQ`, emit `answer_story_question` with `status: answered | paid_off`, `answer_event: SE-<integer>`, and the answer records that prove the closure. When the event intentionally abandons an open setup, emit `abandon_story_question` with a non-empty `abandonment_rationale`. Never add prohibited future-shape fields such as `expected_payoff_mode`, `act_position`, `midpoint`, `climax`, or `dramatic_curve_position`; `STQ` remains present-causal open-setup state per shared contract §4.5.16.
- **Snapshot handoff.** Ensure Phase 6 recomputes `PG.state_snapshot.active_records.CLK`, `.STSEC`, and `.STQ` from the post-delta active set. Newly resolved / revealed / answered / abandoned records remain active or close only according to their class lifecycle and the patch-engine / validator semantics; do not remove an id from the snapshot merely because it was mentioned in a delta.

For every public, witnessed, hidden, or deceptive event in the delta, draft `BEL` records per shared contract §4.1 + FOUNDATIONS §Story Bundles §6a:

- First compute `expected_witnesses` for the event:
  - `direct`: active `STENT` records at the event location per active `STSTAT.location`, excluding entities whose active `STSTAT.agency` is unconscious, dead, incapacitated, or otherwise unavailable.
  - `indirect`: public or factional holders who would receive the event through law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or other accessible evidence (`DA` / `STOBJ` / location-state traces).
  - `excluded`: `STENT` records that are concealed, offstage, unconscious, socially barred, lacking access, or otherwise unable to perceive or receive the event.
- The structural validator `expected_witness_coverage` enforces the indirect-witness obligation deterministically for one specific cue: when the SE's `state_delta.create[]` produces a DA with `circulation` in `{public, factional}`, at least one BEL referencing that DA via `basis.access_records[]` MUST carry `basis.access_route` in the indirect-route set `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}`, or the SE's `world_logic_rationale` MUST carry a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[<DA-id>])` tag. Missing coverage emits `expected_witness_coverage_missing_indirect_propagation`. Other indirect-witness obligations (multi-location supersession, STENT-death with SREL ties, environmental change) remain authorial discipline and are not yet enforced by the validator; see SPEC-37 D2 for the indirect-cue calibration roadmap.
- For the full circulation-and-propagation rule set including the `BEL` access-route enum, non-propagation tag syntax, and worked examples, see `.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics and §Patch obligations.
- For every relevant direct or indirect witness group, account for propagation with either a created/superseded `BEL` or an explicit non-propagation rationale from this closed set: `no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`.
- Record each non-propagation rationale in `SE.world_logic_rationale` with the parseable tag form `non_propagation:<reason>(group=<label>, records=[<record_ids>])`, using one tag per uncovered witness group. The `group` label must match the direct or indirect witness group from `expected_witnesses`; `records` names the story records that prove concealment, incapacity, institutional suppression, lack of accessible trace, or other closed-set reason (use `records=[]` only for `no_witness` when no record can exist). Authoring notes may elaborate, but the tag in `SE.world_logic_rationale` is the replay authority for `branching-story-health-audit`.
- Who knows (`belief_mode: knows`, `truth_relation: true`, `visibility: shared` or `public`, `confidence: certain`).
- Who suspects (`belief_mode: suspects`, `truth_relation: unknown`, `confidence: medium | low`).
- Who misunderstands (`truth_relation: partly_true | false`, `confidence: certain`).
- Who can prove it (`consequences.opens[]` linking to potential `OBL` / `CNSQ`).
- What rumor or lie may spread (additional `BEL` with `belief_mode: reports`, `visibility: rumored`; or `belief_mode: deceives` when the holder knows the claim is false but presents it as true).
- What choices are now constrained (`consequences.constrains_choices[]` linking to upcoming `CHC`).
- For every created or superseding `BEL`, populate `basis.access_route` with one of the shared contract routes (`direct_observation`, `testimony`, `document`, `object_trace`, `location_trace`, `inference`, `surveillance`, `institutional_channel`, `magic_tech`, `rumor`, or `authorial_initialization`) and populate `basis.access_records` with the enabling `STENT` / `STLOC` / `STOBJ` / `DA` / `BEL` / `SF` / `SE` ids when the route depends on story records. Use `authorial_initialization` only for bundle-genesis beliefs whose access is seeded by the initial story setup rather than learned inside a prior event.

**This phase is mandatory** for any action involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual. Phase 9 turn-cycle-additional check 3 verifies expected-witness completeness, not mere `BEL` presence.

## Phase 5: Check mystery and canon authority

Classify every new resolution-like claim in the delta per shared contract §11:

- `apparent` — what appears to be true from the cast's epistemic position; recorded on `BEL` records.
- `branch_local` — ordinary branch-local truth; recorded on `SF`.
- `branch_local_counterfactual` — true only in this branch; recorded on `SF.authority` with branch-scoped truth.
- `canon_candidate` — may be world-level truth; recorded on `SF.authority` and held for promotion via `story-fact-promotion-to-canon`.

If the action would resolve any mystery with `status: forbidden`, abort before patch submission with a mystery-firewall error. If the action asserts a `canon_candidate` claim, set `outcome_route: promotion_hold` and ensure the state delta records ONLY the branch-local appearance; emit `SE.promotion_claims[]` so the user knows to invoke `story-fact-promotion-to-canon` after this turn lands.
