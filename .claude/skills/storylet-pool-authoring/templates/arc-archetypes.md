# Arc Archetype Library

This template is the authoring reference for SPEC-21 scene-commitment arcs.
It gives proposers a stable set of orienting patterns for matching a
`commitment_class` to an `arc_archetype`, then turning that pairing into a
multi-beat dramatic unit.

Each archetype entry names the normal use case, the pressure it expects on
entry, the state delta it is designed to move, a small beat-plan pattern, an
execution envelope, a stop-policy sketch, an effect-model pattern, and native
exit seeds. The sketches are deliberately compact: Phase 3 should use them as
structural prompts, not as prewritten prose.

Authors should use these archetypes when one fits cleanly. They may also emit a
story-specific `arc_archetype` label when the library would distort the actual
dramatic structure. Novel labels should be concise snake_case, explained by the
arc's `dramatic_unit` and `beat_plan`, and treated as candidates for later
library expansion if they recur.

## fragile_offer

Typical commitment classes: offer_practical_help, restitution_offered.

Use when a character makes a help-oriented move that could be accepted,
misread, refused, or turned into a debt. The arc is strongest when the offer is
real but not clean: timing, pride, risk, or prior injury should make acceptance
dramatically costly.

Recommended arc shape:
```yaml
entry_pressure: someone has a need that cannot be safely ignored
value_delta_target: {obligation: accepted, relationship: increase_small}
beat_plan: [need_exposed, offer_made, hesitation_tested, response_received]
execution_envelope:
  invariants: [offer-must-remain-refusable, aid-has-a-cost]
  required_functions: [name-the-need, preserve-recipient-agency]
  prohibited_actions: [coerce-acceptance, erase-existing-debt]
stop_policy: [accepted_with_condition, refused_with_grace, interrupted_by_risk]
effect_model:
  variants: [help_accepted, help_refused, help_deferred]
exit_portfolio:
  native_seeds: [accepted-help-followup, refusal-aftercare, debt-reframed]
```

## bounded_question

Typical commitment classes: ask_one_bounded_question, force_disclosure.

Use when the dramatic move is a question with a limited scope rather than an
interrogation dump. The question should pressure information posture while
leaving the respondent a lawful way to answer, deflect, refuse, or reveal only
part of the truth.

Recommended arc shape:
```yaml
entry_pressure: one missing fact blocks the next responsible action
value_delta_target: {information_posture: investigated}
beat_plan: [question_framed, boundary_named, answer_or_deflection, consequence_marked]
execution_envelope:
  invariants: [one-question-only, answer-may-be-partial]
  required_functions: [identify-information-gap, respect-refusal-channel]
  prohibited_actions: [omniscient-extraction, unearned-confession]
stop_policy: [question_answered, question_refused, question_redirected]
effect_model:
  variants: [partial-answer, clean-refusal, useful-deflection]
exit_portfolio:
  native_seeds: [follow-the-answer, honor-the-refusal, test-the-deflection]
```

## confession_received

Typical commitment classes: stay_available_without_pressure, confess_one_thing.

Use when the arc receives a vulnerable disclosure and the dramatic work is in
the receiving, not in forcing the secret out. It is useful for soft landings
after pressure, relational pivots, and mystery-adjacent reveals that remain
inside the storylet's declared authority.

Recommended arc shape:
```yaml
entry_pressure: someone is ready to disclose one bounded truth
value_delta_target: {relationship: increase_small, information_posture: confessed}
beat_plan: [space_made, confession_given, response_chosen, new_terms_set]
execution_envelope:
  invariants: [disclosure-is-bounded, receiver-does-not-weaponize]
  required_functions: [hold-the-silence, mark-the-cost]
  prohibited_actions: [solve-forbidden-mystery, punish-vulnerability]
stop_policy: [confession-held, confession-complicates, disclosure-withdrawn]
effect_model:
  variants: [trust-increases, burden-shifts, thread-opens]
exit_portfolio:
  native_seeds: [protect-the-confidence, ask-next-bounded-question, process-aftermath]
```

## refusal_and_aftercare

Typical commitment classes: refuse_with_grace, defer_decision.

Use when a refusal is the right or necessary move, but the story still needs to
honor connection, duty, or safety afterward. The arc should separate "no" from
abandonment and make the cost of the refusal visible.

Recommended arc shape:
```yaml
entry_pressure: an offer or demand cannot be accepted as framed
value_delta_target: {obligation: refused, relationship: stabilize}
beat_plan: [request_received, refusal_named, harm_limited, next_boundary_set]
execution_envelope:
  invariants: [refusal-is-clear, aftercare-is-not-reversal]
  required_functions: [state-the-no, reduce-unnecessary-harm]
  prohibited_actions: [false-consent, punitive-withdrawal]
stop_policy: [refusal-accepted, refusal-contested, aftercare-deferred]
effect_model:
  variants: [boundary-respected, relationship-strained, obligation-transferred]
exit_portfolio:
  native_seeds: [repair-without-yes, find-alternative-help, revisit-later]
```

## practical_aid_attempt

Typical commitment classes: accept_offered_help, offer_practical_help.

Use when the commitment becomes concrete work: carrying, hiding, repairing,
escorting, translating, feeding, fetching, or otherwise trying to alter the
situation through action. Success may be partial, costly, or revealing.

Recommended arc shape:
```yaml
entry_pressure: practical failure is imminent without embodied action
value_delta_target: {obligation: discharged, risk_cost_exposure: increase_small}
beat_plan: [aid-accepted, action-started, complication-found, result-counted]
execution_envelope:
  invariants: [aid-has-material-limits, helper-is-not-magic-solution]
  required_functions: [name-resource-cost, show-embodied-effort]
  prohibited_actions: [instant-fix, invisible-labor]
stop_policy: [aid-succeeds, aid-partial, aid-blocked]
effect_model:
  variants: [material-progress, new-cost, hidden-risk-exposed]
exit_portfolio:
  native_seeds: [finish-the-task, pay-the-cost, seek-specialist-help]
```

## withdrawal_without_abandonment

Typical commitment classes: withdraw_without_abandoning, defer_decision.

Use when a character must step back while preserving care, duty, or future
access. The arc should make the difference between tactical withdrawal and
emotional abandonment legible.

Recommended arc shape:
```yaml
entry_pressure: staying in the scene would worsen the outcome
value_delta_target: {relationship: stabilize, thread_pressure: decrease}
beat_plan: [overload-recognized, limit-stated, connection-preserved, exit-made]
execution_envelope:
  invariants: [withdrawal-is-explicit, return-path-is-named]
  required_functions: [state-limit, leave-a-thread]
  prohibited_actions: [silent-disappearance, false-finality]
stop_policy: [space-created, withdrawal-contested, return-condition-set]
effect_model:
  variants: [pressure-lowers, trust-tests, obligation-deferred]
exit_portfolio:
  native_seeds: [return-under-new-terms, handle-the-gap, test-the-boundary]
```

## escalation_to_confrontation

Typical commitment classes: escalate_to_confrontation, tighten_pressure.

Use when avoidance stops working and a direct confrontation becomes the honest
dramatic move. The confrontation should narrow choices, expose stakes, and
alter thread pressure without guaranteeing a clean victory.

Recommended arc shape:
```yaml
entry_pressure: delay protects the wrong thing
value_delta_target: {thread_pressure: increase, risk_cost_exposure: increase_small}
beat_plan: [line-crossed, accusation-or-demand, counterpressure, outcome-locked]
execution_envelope:
  invariants: [stakes-are-explicit, confrontation-has-cost]
  required_functions: [name-the-line, force-a-position]
  prohibited_actions: [empty-bluster, consequence-free-threat]
stop_policy: [position-forced, confrontation-interrupted, cost-accepted]
effect_model:
  variants: [truth-exposed, alliance-damaged, adversary-commits]
exit_portfolio:
  native_seeds: [deal-with-fallout, pursue-the-new-line, retreat-and-regroup]
```

## concealment_under_pressure

Typical commitment classes: conceal_under_pressure, defer_decision.

Use when a character chooses concealment while pressure mounts. The arc should
not reward secrecy for free; every concealment should leave trace, debt, risk,
or narrowing future options.

Recommended arc shape:
```yaml
entry_pressure: revealing now would create immediate danger or loss
value_delta_target: {information_posture: concealed, thread_pressure: increase}
beat_plan: [risk-spotted, cover-chosen, pressure-tested, trace-left]
execution_envelope:
  invariants: [concealment-leaves-cost, hidden-truth-not-retconned]
  required_functions: [name-what-is-hidden, expose-risk-of-hiding]
  prohibited_actions: [perfect-cover, silent-retcon]
stop_policy: [cover-holds, cover-frays, concealment-forced-open]
effect_model:
  variants: [temporary-safety, suspicion-raised, obligation-created]
exit_portfolio:
  native_seeds: [maintain-cover, confess-one-thing, investigate-suspicion]
```

## third_party_intervention

Typical commitment classes: seek_third_party, offer_practical_help.

Use when the scene's next honest move requires another actor, institution,
mediator, witness, fixer, or antagonist to enter the pressure field. The third
party must change agency distribution rather than simply solve the scene.

Recommended arc shape:
```yaml
entry_pressure: two-party dynamics are stuck or unsafe
value_delta_target: {route_or_scene_type: tested, thread_pressure: stabilize}
beat_plan: [need-for-third-party, contact-made, intervention-terms, field-shift]
execution_envelope:
  invariants: [third-party-has-own-agenda, agency-is-redistributed]
  required_functions: [justify-the-call, show-new-leverage]
  prohibited_actions: [deus-ex-helper, agency-erasure]
stop_policy: [intervention-accepted, mediator-complicates, access-denied]
effect_model:
  variants: [new-resource, new-obligation, new-witness]
exit_portfolio:
  native_seeds: [follow-mediator-terms, resist-outsider-pressure, repay-access]
```

## investigation_followup

Typical commitment classes: ask_one_bounded_question, force_disclosure.

Use after a clue, contradiction, or partial answer requires a responsible
follow-up. The arc should advance information posture through observable work,
not through omniscient narration.

Recommended arc shape:
```yaml
entry_pressure: prior evidence creates a narrow investigative lead
value_delta_target: {information_posture: investigated}
beat_plan: [lead-reviewed, method-chosen, evidence-tested, next-lead-marked]
execution_envelope:
  invariants: [evidence-is-situated, conclusion-stays-bounded]
  required_functions: [cite-observed-basis, preserve-unknowns]
  prohibited_actions: [total-solution, forbidden-resolution]
stop_policy: [lead-confirmed, lead-disproved, lead-complicates]
effect_model:
  variants: [new-clue, redirection, risk-exposure]
exit_portfolio:
  native_seeds: [press-the-lead, ask-a-witness, secure-the-evidence]
```

## aftermath_processing

Typical commitment classes: stay_available_without_pressure, release_pressure.

Use when consequences need to be felt, sorted, or named after a prior action.
The arc is not filler; it should change relationship, obligation, thread
pressure, or intention by metabolizing what happened.

Recommended arc shape:
```yaml
entry_pressure: recent events have emotional or practical residue
value_delta_target: {relationship: stabilize, thread_pressure: decrease}
beat_plan: [residue-named, reaction-contained, meaning-tested, next-state-set]
execution_envelope:
  invariants: [consequence-not-erased, processing-changes-state]
  required_functions: [name-the-residue, choose-a-next-posture]
  prohibited_actions: [reset-to-neutral, empty-reflection]
stop_policy: [pressure-released, grief-complicates, new-intent-forms]
effect_model:
  variants: [bond-stabilized, obligation-shifted, intent-changed]
exit_portfolio:
  native_seeds: [act-on-new-intent, revisit-the-cost, seek-repair]
```

## route_change

Typical commitment classes: change_venue, withdraw_without_abandoning.

Use when the meaningful commitment is to move the scene elsewhere: into
privacy, public view, danger, sanctuary, institutional space, or a route with
different constraints. The change of place should change available action.

Recommended arc shape:
```yaml
entry_pressure: current location blocks the next honest move
value_delta_target: {route_or_scene_type: tested}
beat_plan: [current-place-fails, destination-chosen, crossing-tested, new-field-entered]
execution_envelope:
  invariants: [place-changes-options, travel-has-friction]
  required_functions: [name-why-move, show-threshold-cost]
  prohibited_actions: [teleporting-convenience, unchanged-scene-field]
stop_policy: [new-place-reached, route-blocked, threshold-complicates]
effect_model:
  variants: [access-gained, exposure-increased, pursuit-triggered]
exit_portfolio:
  native_seeds: [use-new-access, face-route-cost, hide-in-new-place]
```

## public_commitment

Typical commitment classes: make_public_commitment, tighten_pressure.

Use when a character makes a promise, accusation, allegiance, refusal, or
obligation visible to witnesses. Publicness should alter legitimacy,
reputation, leverage, or future constraints.

Recommended arc shape:
```yaml
entry_pressure: private intent no longer carries enough force
value_delta_target: {irreversibility: increase_small, obligation: accepted}
beat_plan: [witnesses-present, statement-made, reaction-measured, public-cost-set]
execution_envelope:
  invariants: [witnesses-matter, statement-constrains-future]
  required_functions: [mark-public-audience, define-commitment]
  prohibited_actions: [private-consequence-only, uncosted-grandstanding]
stop_policy: [commitment-recognized, public-challenge, authority-intervenes]
effect_model:
  variants: [legitimacy-gained, reputation-risked, obligation-locked]
exit_portfolio:
  native_seeds: [honor-public-word, exploit-public-word, repair-public-damage]
```

## private_betrayal

Typical commitment classes: confess_one_thing, private_betrayal.

Use when trust is broken or revealed in private before the public world can
respond. The arc should make betrayal specific: what was withheld, crossed,
or traded, and what relationship state changes as a result.

Recommended arc shape:
```yaml
entry_pressure: private knowledge exposes a crossed boundary
value_delta_target: {relationship: decrease_large, information_posture: revealed}
beat_plan: [trust-context-set, betrayal-surfaced, response-contained, damage-named]
execution_envelope:
  invariants: [betrayal-is-specific, harm-is-not-minimized]
  required_functions: [name-the-breach, show-the-new-distance]
  prohibited_actions: [instant-forgiveness, vague-harm]
stop_policy: [breach-acknowledged, denial-hardens, relationship-reframed]
effect_model:
  variants: [trust-drops, debt-opens, retaliation-seed]
exit_portfolio:
  native_seeds: [demand-restitution, keep-secret-for-now, expose-publicly]
```

## intimacy_negotiation

Typical commitment classes: intimacy_advance, refuse_with_grace.

Use when closeness, contact, disclosure, erotic intensity, or emotional access
must be negotiated rather than assumed. The arc should center consent,
specific boundaries, and the cost or relief of moving closer.

Recommended arc shape:
```yaml
entry_pressure: attraction or closeness asks for explicit terms
value_delta_target: {relationship: increase_small, character_intention: tested}
beat_plan: [desire-or-need-named, boundary-checked, response-held, terms-set]
execution_envelope:
  invariants: [consent-is-explicit, boundary-remains-valid]
  required_functions: [ask-or-offer-clearly, honor-the-answer]
  prohibited_actions: [assumed-consent, pressure-as-romance]
stop_policy: [terms-accepted, boundary-set, intimacy-deferred]
effect_model:
  variants: [closer-under-terms, graceful-refusal, new-vulnerability]
exit_portfolio:
  native_seeds: [continue-under-terms, process-refusal, protect-the-boundary]
```

## boundary_setting

Typical commitment classes: refuse_with_grace, withdraw_without_abandoning.

Use when the arc's work is to define a durable limit. The boundary can be
emotional, spatial, institutional, sexual, practical, or epistemic; it should
change what future arcs are allowed to ask.

Recommended arc shape:
```yaml
entry_pressure: a pattern will repeat unless a limit is named
value_delta_target: {obligation: deferred, character_intention: tested}
beat_plan: [pattern-recognized, boundary-stated, pushback-tested, enforcement-set]
execution_envelope:
  invariants: [boundary-is-actionable, enforcement-is-proportional]
  required_functions: [state-limit, define-consequence]
  prohibited_actions: [ambiguous-limit, boundary-as-punishment-only]
stop_policy: [boundary-respected, boundary-violated, enforcement-triggered]
effect_model:
  variants: [future-action-constrained, relationship-stabilized, pressure-rises]
exit_portfolio:
  native_seeds: [test-respect, enforce-limit, renegotiate-carefully]
```

## restitution_offered

Typical commitment classes: restitution_offered, offer_practical_help.

Use when repair is proposed after harm. Restitution must be concrete and
insufficient by itself to erase the harm; the recipient keeps authority to
accept, refuse, or demand different repair.

Recommended arc shape:
```yaml
entry_pressure: prior harm creates a repair obligation
value_delta_target: {obligation: accepted, relationship: stabilize}
beat_plan: [harm-named, restitution-offered, adequacy-tested, response-bound]
execution_envelope:
  invariants: [repair-does-not-erase-harm, recipient-has-agency]
  required_functions: [name-harm, offer-concrete-repair]
  prohibited_actions: [forgiveness-demand, symbolic-only-repair]
stop_policy: [repair-accepted, repair-refused, repair-revised]
effect_model:
  variants: [debt-reduced, debt-complicated, trust-tested]
exit_portfolio:
  native_seeds: [perform-repair, negotiate-better-repair, live-with-refusal]
```

## silent_witness

Typical commitment classes: mirror_acknowledgment, stay_available_without_pressure.

Use when presence, attention, and acknowledgement matter more than speech. The
arc is useful for grief, shame, vigilance, aftermath, secret keeping, or any
moment where witness changes state without claiming ownership of the event.

Recommended arc shape:
```yaml
entry_pressure: someone needs the event held without being solved
value_delta_target: {relationship: stabilize, information_posture: tested}
beat_plan: [presence-offered, event-held, recognition-marked, silence-kept]
execution_envelope:
  invariants: [witness-does-not-appropriate, silence-has-purpose]
  required_functions: [show-attention, mark-recognition]
  prohibited_actions: [explaining-away, resolving-forbidden-mystery]
stop_policy: [witness-accepted, silence-rejected, shared-meaning-forms]
effect_model:
  variants: [trust-stabilizes, burden-shared, clue-preserved]
exit_portfolio:
  native_seeds: [continue-presence, ask-later, protect-what-was-seen]
```

## forced_disclosure

Typical commitment classes: force_disclosure, tighten_pressure.

Use when circumstances, evidence, authority, or direct pressure force a hidden
fact into the scene. This archetype is high-risk: it must respect mystery
authority and should distinguish lawful exposure from coercive omniscience.

Recommended arc shape:
```yaml
entry_pressure: concealment can no longer hold under current evidence
value_delta_target: {information_posture: revealed, thread_pressure: increase}
beat_plan: [evidence-tightens, disclosure-demanded, fact-emerges, fallout-begins]
execution_envelope:
  invariants: [disclosure-has-basis, forbidden-mysteries-stay-forbidden]
  required_functions: [show-pressure-source, limit-revealed-fact]
  prohibited_actions: [omniscient-confession, unauthorized-resolution]
stop_policy: [fact-disclosed, partial-disclosure, disclosure-interrupted]
effect_model:
  variants: [truth-out, partial-truth, counteraccusation]
exit_portfolio:
  native_seeds: [act-on-truth, contain-fallout, test-the-partial-truth]
```

## pressure_release

Typical commitment classes: release_pressure, stay_available_without_pressure.

Use when the right move is to lower heat without pretending the problem is
gone. The release can be practical, emotional, institutional, erotic, or
spatial, but it should create a real next state rather than a reset.

Recommended arc shape:
```yaml
entry_pressure: accumulated pressure threatens to distort the next decision
value_delta_target: {thread_pressure: decrease, relationship: stabilize}
beat_plan: [pressure-identified, release-action-chosen, release-tested, residue-named]
execution_envelope:
  invariants: [release-is-not-erasure, residue-remains-visible]
  required_functions: [lower-one-pressure, name-what-remains]
  prohibited_actions: [total-reset, unearned-calm]
stop_policy: [pressure-lowered, release-fails, residue-opens-thread]
effect_model:
  variants: [space-created, obligation-deferred, hidden-cost-appears]
exit_portfolio:
  native_seeds: [use-the-space, face-the-residue, rebuild-pressure-safely]
```

# Mapping table (used by JIT mode)

| commitment_class | recommended arc_archetype |
|---|---|
| stay_available_without_pressure | confession_received |
| offer_practical_help | fragile_offer |
| ask_one_bounded_question | bounded_question |
| withdraw_without_abandoning | withdrawal_without_abandonment |
| confess_one_thing | private_betrayal |
| accept_offered_help | practical_aid_attempt |
| refuse_with_grace | refusal_and_aftercare |
| escalate_to_confrontation | escalation_to_confrontation |
| conceal_under_pressure | concealment_under_pressure |
| seek_third_party | third_party_intervention |
| change_venue | route_change |
| make_public_commitment | public_commitment |
| private_betrayal | private_betrayal |
| bear_witness | silent_witness |
| release_pressure | pressure_release |
| tighten_pressure | escalation_to_confrontation |
| defer_decision | withdrawal_without_abandonment |
| force_disclosure | forced_disclosure |
| mirror_acknowledgment | silent_witness |
| intimacy_advance | intimacy_negotiation |
