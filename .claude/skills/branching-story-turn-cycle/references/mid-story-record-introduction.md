# Mid-Story Record Introduction

Use this reference during turn-cycle Phase 3 when deciding whether the accepted
event creates a new persistent causal object, during Phase 4 when new state
requires belief or visibility propagation, and during Phase 7 when page-plan
section 10b explains what newly introduced state may render or ground choices.
The `intro:<CLASS>(...)` tag grammar and closed trigger vocabularies live in
`.claude/skills/_shared-templates/story-state-contract.md` §5a. The parser
implementation lives at
`tools/validators/src/structural/midstory-introduction-utils.ts`.

Fresh creation is lawful only when the committed event or current branch state
creates present causal state that is not reducible to an existing active record.
Prefer advancing, superseding, ticking, resolving, revealing, answering,
changing status, or changing a relationship axis on an existing record when the
event is a complication of the same causal object. Do not introduce records to
prefigure act structure, future payoff, dramatic rhythm, or author-only plans.

## CLK — Pressure Clock

**Creation threshold.** Create a fresh `CLK` when a new pressure driver begins
to accumulate across time or events and future choices need to know its staged
state. Lawful triggers include a deadline being declared, a pursuit beginning,
exposure starting to accumulate, a faction mobilizing, environmental danger
worsening, a mission or race beginning, or staged danger becoming trackable.

**Supersede/advance threshold.** Tick or resolve an existing clock when the
same driver matures. Supersede only when the clock's identity, driver, or
threshold model changes while continuity remains clear. Do not create a second
clock for the same driver because tension increased.

**Minimum grounding.**

- `created_at_page` is the new `PG`.
- `driver` names the present pressure source.
- `linked_records[]` includes at least one active parent record or same-event
  created record that grounds the pressure, usually `THR`, `OBL`, `CNSQ`,
  `STINT`, `SREL`, `STLOC`, `STOBJ`, or `STQ`.
- `value`, `max`, `thresholds[]`, `salience`, `visibility`, and `status` are
  valid for the clock schema.
- `SE.state_delta.create[]` includes the new clock id.
- `SE.world_logic_rationale` includes an
  `intro:CLK(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag.

**Required turn-cycle handling.** Phase 3 may create a `CLK` before Phase 4
applies clock lifecycle operations. If the same event creates and immediately
ticks a clock, the create operation lands first and the initial tick is
represented through `tick_history[]` or `tick_pressure_clock` semantics; do not
direct-edit prior YAML.

**Validator checks.** `clock_introduction_grounding_integrity` checks non-empty
driver, positive `max`, valid thresholds, and at least one grounding
`linked_records[]` target active at the parent page or created in the same
`SE`. If the clock is ticked or fired, existing tick and threshold validators
still apply.

**Anti-patterns.**

- Clock for "rising tension."
- Clock for a single binary threat resolved by one event.
- Clock thresholds that hide an outline, such as "chapter 5 betrayal" or
  "midpoint twist."
- Faction clock for offscreen color that does not constrain branch state.

**Examples.**

- Lawful: "The guard captain orders a citywide search." Create `THR` for the
  search, maybe `STINT` for the captain, then create `CLK` for the tightening
  cordon linked to that thread or intention.
- Existing-record advance: "The search parties reach the bridge district."
  Tick the existing search clock.
- Rejected: "The scene feels too calm; start a danger clock."

**§5c safety.** The clock tracks a present driver's staged pressure. It is not a
dramatic timer.

## STSEC — Story Secret

**Creation threshold.** Create a fresh `STSEC` when a hidden truth becomes
engine-relevant because it constrains choices, beliefs, witness propagation,
secret holders, clue carriers, admissible reveals, or protected mystery
handling.

**Supersede/advance threshold.** Append clue carriers, mark carrier discovery,
or reveal an existing secret when the hidden truth is the same. Supersede only
when the secret's holder, source, or protection model changes while identity
remains continuous.

**Minimum grounding.**

- `secret_claim` states the hidden truth.
- `source_records[]` names records that made the secret branch-relevant.
- `truth_anchor` names branch truth when known, or is null only when mystery or
  canon policy requires it.
- `holders[]` names who actually knows or holds the secret.
- At least one of holder, clue carrier, `truth_anchor`, or protected mystery
  reference grounds the secret.
- If touching Mystery Reserve, `protected_mystery_refs[]` is populated and
  firewall rules apply.
- `SE.state_delta.create[]` includes the new secret id.
- `SE.world_logic_rationale` includes an
  `intro:STSEC(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag.

**Required turn-cycle handling.** Phase 4 must run belief and witness
propagation after any secret creation, clue discovery, or reveal. A first lie
is not automatically an `STSEC`; it is first a `BEL` with the appropriate
belief mode and truth relation. It becomes an `STSEC` only when the hidden
truth behind the lie must be tracked as revealable or protectable branch-local
state.

**Validator checks.** `secret_introduction_anchor_integrity` checks that
`source_records[]` exist and are active in the parent or created in the same
event, that `truth_anchor` exists and is branch-legal when present, and that
holders are active `STENT` ids or valid holder labels allowed by schema.
Existing carrier and mystery-firewall validators still apply.

**Anti-patterns.**

- Secret for an author-only future twist.
- Secret for information nobody in the branch can act on, hide, reveal, or
  discover.
- Secret used as a substitute for `BEL` falsehood.
- Secret used to bypass protected world mystery.

**Examples.**

- Lawful: "Mira claims she never saw the ledger while hiding that she burned
  page three." Create `BEL` for the claim or deception, an `SF` or `DA` anchor
  for the burned-page truth when branch-local, then `STSEC` if that hidden
  truth will constrain future discovery or reveal.
- Existing-record advance: "The ash-stained envelope is found." Append or mark
  the clue carrier on the existing `STSEC`.
- Rejected: "The author plans a betrayal ten pages later."

**§5c safety.** `STSEC` tracks hidden truth now protected by branch state, not
future reveal architecture.

## STQ — Story Question / Open Setup

**Creation threshold.** Create `STQ` when the event opens a concrete setup,
promise, or dramatic question that future choices or state closure may need to
reference. It can be explicit, such as a vow to deliver something by dawn, or
implied by a concrete introduced affordance or hazard, such as a locked box
being placed on the table.

**Supersede/advance threshold.** Answer, pay off, complicate, or abandon an
existing `STQ` when the new event addresses the same setup. Do not create a new
`STQ` for a rephrasing.

**Minimum grounding.**

- `source_event` equals the creating `SE`.
- `source_records[]` names concrete records created or active in that event.
- `setup_kind` is `setup`, `dramatic_question`, or `promise`.
- `status` starts as open or complicated according to schema.
- No prohibited future-shape fields are present.
- `SE.state_delta.create[]` includes the new question id.
- `SE.world_logic_rationale` includes an
  `intro:STQ(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag.

**Required turn-cycle handling.** Phase 3 may create `STQ`; Phase 4 may answer,
pay off, or abandon existing `STQ`. Page-plan section 10b should surface newly
active high-salience questions that affect rendering or choices.

**Validator checks.** `story_question_introduction_grounding_integrity` checks
that `source_event` exists and is the creating event for mid-story creation,
and that `source_records[]` exist and are active at `created_at_page`. Existing
setup-predates-payoff, payoff-integrity, terminal-debt, and grounding
validators continue to apply. `narrative_shape_field_rejection` and existing
record schema checks reject prohibited future-shape fields.

**Anti-patterns.**

- Reader curiosity without state consequences.
- "Moral question" as abstract theme.
- Expected payoff mode, chapter, act, climax, or scene sequence.
- Duplicate `STQ` for an existing open question.

**Examples.**

- Lawful: "The letter says, 'Ask the abbot what happened under the east
  stairs.'" Create `DA` for the letter and `STQ` with source records such as
  `[DA-x, BEL-y]`.
- Existing-record closure: "The abbot admits the cellar flood killed the
  courier." Answer the existing `STQ`.
- Rejected: "The story should pay this off near the climax."

**§5c safety.** `STQ` records an open present setup, not an obligation to
deliver a future dramatic shape.

## THR — Thread

**Creation threshold.** Create a `THR` when a new ongoing causal concern opens
and is expected to remain addressable across pages: investigation, pursuit,
negotiation, recovery, travel or mission, faction conflict, resource problem,
or social fallout.

**Supersede/advance threshold.** Advance or supersede an existing thread when
the event belongs to the same causal concern, even if stakes rise. Create new
only when the driver, participants, or branch concern is genuinely distinct.

**Minimum grounding.**

- `derived_from[]` includes the same-event `SE`, `SF`, `BEL`, `OBL`, `CNSQ`,
  `STINT`, `SREL`, `DA`, or another allowed grounding record.
- `status` is active or escalated as appropriate.
- `urgency` is set.
- Title and summary describe current causal concern, not theme.
- `SE.state_delta.create[]` includes the new thread id.
- `SE.world_logic_rationale` includes an
  `intro:THR(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag.

**Required turn-cycle handling.** Phase 3 may open a new thread beside
advancing or closing existing threads. Phase 8 choices can ground in the new
thread only if the thread is actor-visible and branch-active.

**Validator checks.** `thread_introduction_grounding_integrity` checks that
mid-story-created `THR` records have non-empty `derived_from[]` and that
grounding records exist and are active in the parent or created in the same
event. `narrative_shape_field_rejection` rejects future-shape or thematic
discriminator fields.

**Anti-patterns.**

- "The corruption theme."
- "Act II romance subplot."
- Thread created solely because the author wants a plotline.
- New thread when an existing `OBL`, `CNSQ`, or `CLK` already covers the
  concern.

**Examples.**

- Lawful: "The stolen medallion points to a second buyer." Create `THR` for
  tracing the second buyer.
- Existing-record advance: "The second buyer's runner is identified."
  Supersede or advance the same `THR`.
- Rejected: "The protagonist's spiritual arc begins."

**§5c safety.** A thread is an ongoing causal concern in state, not a narrative
arc.

## STENT — Story-Local Entity

**Creation threshold.** Create `STENT` when a person, group, or entity earns
branch-local representation because it now has agency, status, location,
beliefs, relationship edges, witness role, information-source role,
pressure-driver role, choice-target role, or object/obligation custody.

**Supersede/advance threshold.** Supersede existing `STENT` only for identity,
mirror, or role metadata changes. Life, agency, and location belong in
`STSTAT`, not `STENT`.

**Minimum grounding.**

- `created_at_page` is the new `PG`.
- `role_in_story` describes current engine value.
- A fresh `STENT` is paired in the same `SE` with exactly one fresh active
  `STSTAT` giving life, agency, and location.
- If only one actor believes the entity exists, create `BEL` first; do not
  create objective `STENT` unless branch state commits the entity.
- `SE.state_delta.create[]` includes the new entity id.
- `SE.world_logic_rationale` includes an
  `intro:STENT(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag.

**Required turn-cycle handling.** The output table allows `STENT` as new or
superseded. Phase 3 must require same-event `STSTAT` pairing for fresh `STENT`.
Phase 4 must account for witness and belief propagation when the new entity is
public, hidden, deceptive, or choice-relevant.

**Validator checks.** `entity_introduction_status_pairing` checks that every
fresh `STENT` in `SE.state_delta.create[]` has exactly one same-event `STSTAT`
whose entity field points to the new `STENT`, and that the child
`PG.state_snapshot.active_records` includes both records. Existing
one-active-status-per-entity checks still apply.

**Anti-patterns.**

- Background name-drop.
- Flavor NPC with no future state function.
- Abstract faction marker when `SF`, `THR`, or `CLK` would suffice.
- Creating `STENT` for a planned future actor not yet branch-real.

**Examples.**

- Lawful: "A masked courier enters, offers testimony, and can be followed."
  Create `STENT` for the courier plus paired `STSTAT`.
- Lawful group: "The Dock Wardens begin searching houses." Create a group
  `STENT` if the group acts as a branch-local actor; otherwise use `THR` or
  `CLK`.
- Rejected: "Someone mentions the king's cousin in gossip."

**§5c safety.** Entity representation is earned by present branch utility, not
outline importance.

## SREL — Relationship

**Creation threshold.** Create `SREL` when an objective branch-local
relationship axis now constrains choices, obligations, status, pressure,
intimacy, hostility, trust, debt, authority, access, or witness interpretation.

**Supersede/advance threshold.** Supersede an existing relationship when the
same participants and axis change value, valence, direction, or description. Do
not create parallel duplicate edges for incremental change.

**Minimum grounding.**

- Participants are active `STENT` records or are created in the same event.
- `axis`, `direction`, `value`, `valence`, and `description` are valid.
- `derived_from[]` includes the `SE` and/or `BEL`, `SF`, `OBL`, or `CNSQ`
  records proving the relationship became branch-local.
- If the relationship is only believed or rumored, use `BEL`, not objective
  `SREL`.
- `SE.state_delta.create[]` includes the new relationship id.
- `SE.world_logic_rationale` includes an
  `intro:SREL(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag.

**Required turn-cycle handling.** The output table allows `SREL` as new or
superseded. Phase 4 must propagate beliefs when relationship formation is
witnessed, public, secret, or deceptive.

**Validator checks.** `relationship_introduction_grounding_integrity` checks
that participants are active in the parent or created in the same event, that
`derived_from[]` is non-empty for mid-story creation, and that there is no
duplicate active relationship with the same participants, axis, and direction
unless the distinction is justified by a different axis. `introduction_observer_firewall`
checks emitted choices or actions grounded in the relationship for explicit
actor access routes.

**Anti-patterns.**

- One-off interaction that does not constrain future state.
- World-canon background relation not yet branch-relevant.
- Actor belief about a relation recorded as objective relation.
- Romance or rivalry arc planned but not yet state-real.

**Examples.**

- Lawful: "Rafi swears protection to Inez in front of the council." Create
  `SREL` for loyalty/protection and probably `OBL`.
- Existing-record advance: "Rafi breaks the oath." Supersede `SREL`,
  close or supersede `OBL`, and create `CNSQ`.
- Rejected: "They will become rivals later."

**§5c safety.** `SREL` tracks current objective branch constraints, not planned
emotional trajectory.

## Cross-References

- Tag grammar and closed trigger vocabularies:
  `.claude/skills/_shared-templates/story-state-contract.md` §5a.
- Parser and trigger constants:
  `tools/validators/src/structural/midstory-introduction-utils.ts`.
- Phase 3 creation decision:
  `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`.
- Phase 4 belief and visibility propagation:
  `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`.
- Phase 7 render-relevant visibility:
  `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`.
- Phase 9 validation gates:
  `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`.
