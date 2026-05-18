# **Worldloom proposal: mid-story state introduction + non-retcon compatibility repair**

Scope follows the uploaded proposal request and its repository-access limits.

## **1. Executive recommendation**

1. **Adopt a present-causal introduction doctrine:** a new `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, or `SREL` may be introduced mid-story only when the just-committed event or current branch state creates a persistent causal object that is not reducible to an existing active record and that changes future eligibility, visibility, obligation, pressure, relationship constraints, witness propagation, or choice grounding.  
2. **Make introduction storylet-mediated but not storylet-bloated.** Fresh records should normally appear as side effects of the selected `SLT` / JIT `SLT` and the resulting `SE.state_delta.create[]`. Do not create “record-introduction storylets” unless the player action itself is introduction-like: “ask the stranger’s name,” “declare a deadline,” “tell the lie,” “form an alliance.”  
3. **Wave 2 should not add new predicate DSL entries.** The current DSL is for eligibility over existing active state. Mid-story creation is proof about the just-committed event, so use `SE.state_delta.create[]`, existing grounding fields, and parseable `SE.world_logic_rationale` introduction tags instead.  
4. **Add minimal deterministic introduction validators.** Start with a generic `midstory_record_introduction_grounding` validator plus six small class-specific validators for `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, and `SREL`.  
5. **Amend turn-cycle prose immediately.** The patch engine already supports create operations for `CLK`, `STSEC`, and `STQ`; the turn-cycle skill should explicitly list fresh creation as lawful for those classes, and also for `THR`, `STENT`, and `SREL`.  
6. **Do not treat absence of optional new classes as invalid.** A story with no `CLK`, `STSEC`, or `STQ` can be perfectly healthy. The health-audit posture already says absence of those records is not a finding; keep that rule.  
7. **Add compatibility drift as a separate operational category, not a fiction category.** Older bundles can be `compatible_optional_absence`, `grandfathered_snapshot_shape`, `requires_compatibility_audit`, `requires_migration_patch`, or `manual_review` without implying the story world changed.  
8. **Handle old `PG.state_snapshot.active_records` maps by normalization, not PG rewrites.** If older snapshots lack `CLK`, `STSEC`, `STQ`, or `DA` keys, validators and replay should read missing keys as empty arrays for old pages. New child pages should materialize the full current active-record map.  
9. **Wave 2 scope:** skill amendments, introduction tags, deterministic validators, validator tests/fixtures, compatibility-drift audit/reporting, and snapshot-key normalization. **Wave 3+ deferrals:** dedicated compatibility-repair skill, richer trigger taxonomy, optional story-system-contract marker, batch private-story audit tooling, and any schema expansion.  
10. **Do not implement:** act-position logic, midpoint/climax fields, global drama-manager targets, automatic clock creation because “tension is low,” expected payoff modes, direct edits to `_source/*.yaml`, or production-story assumptions from unavailable private bundles.

---

## **2. Repository findings**

I inspected the requested non-archive surfaces on `main` and ignored archive hits from code search.

**FOUNDATIONS story-bundle authority.** `docs/FOUNDATIONS.md` makes story bundles a derived, per-world layer under `worlds/<slug>/stories/<story-slug>/`; story-bundle atomic records live under `_source/<class>/<ID>.yaml`; page plans are the authoritative state commit; rendered prose is downstream receipt/evidence, not a second state engine; and story-bundle `_source` writes route through the patch engine rather than raw edits. It also already defines canon-baseline drift classifications such as `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, and `promotion_or_retcon_conflict`.

**Schema/contract surface.** The shared story-state contract distinguishes world canon, story state, and prose; declares append-only/supersession discipline; includes `CLK`, `STSEC`, and `STQ` in the story record inventory; and defines a closed predicate DSL with existing active-record predicates for clocks, secrets, questions, social state, age, access, and affordances.

**Current record schemas.** The shared record schemas already define `SE.state_delta.create/supersede/close`, `SLT.effects.create/supersede/close`, and the key shapes for `STENT`, `THR`, `SREL`, `CLK`, `STSEC`, and `STQ`. `STQ` explicitly prohibits future-shape fields such as `expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `expected_chapter`, `scene_sequence`, and `holders[]`.

**Bootstrap creation path exists.** `branching-story-bootstrap` explicitly seeds optional `CLK`, `STSEC`, and `STQ` records when the premise warrants them and names `create_clk_record`, `create_stsec_record`, and `create_stq_record` in its patch obligations.

**Turn-cycle gap is real.** `branching-story-turn-cycle` says it can produce new/superseding records “as needed,” but its output table frames `CLK`, `STSEC`, and `STQ` as existing-record lifecycle updates; `THR`, `STENT`, and `SREL` are also phrased mostly as supersessions. Phase 4/5 similarly documents ticking/resolving clocks, discovering/revealing existing secrets, and answering/abandoning existing questions, not creating them mid-story.

**Patch-engine support is not the blocker.** `tools/patch-engine/src/envelope/schema.ts` includes id allocation slots for `clk_ids`, `stsec_ids`, and `stq_ids`, and the operation list supports `create_clk_record`, `create_stsec_record`, `create_stq_record`, supersession ops, and lifecycle ops.

**Current predicate DSL already covers existing active records.** The validator grammar lists `clock_at_least`, `clock_below`, `clock_full`, `any_clock_active`, `secret_unrevealed`, `secret_revealed`, `revelation_ready`, `any_secret_unrevealed`, `story_question_open`, `story_question_status`, `any_story_question_open`, `promise_due`, `record_age`, relationship/belief/intention predicates, and access predicates.

**Validator/audit surface is broad but not introduction-focused.** Validators cover schemas, replay, branch isolation, observer firewall, clock integrity, secret integrity, story-question integrity, and canon drift. Existing clock/secret/question validators check lifecycle mechanics such as tick provenance, fired-threshold crossing, clue-carrier existence, mystery firewall, and STQ source-record grounding.

**Health-audit already says absence is not a finding.** Phase 2i’s `CLK / STSEC / STQ mechanism health` checks only run when the corresponding class exists; absence of those record classes is explicitly never itself a finding.

**Current PG schema tolerates older active-record maps.** `story-page.schema.json` lists `CLK`, `STSEC`, and `STQ` under `state_snapshot.active_records`, but the map is not expressed as requiring every key and allows additional properties. That is a good compatibility opening: old snapshots missing new keys can be normalized as empty rather than rewritten.

**Production stories are not inspectable here.** The private production-story limitation comes from the uploaded request, not from repository evidence; this proposal therefore designs the workflow generally and does not rely on private fixtures.

---

## **3. FOUNDATIONS constraint analysis**

**Recommendation: mid-story introduction is legal only as a present-causal state delta.**

* **§4a Plan-Authority Boundary:** Introduction is decided before prose rendering, in the page-plan/patch envelope, and lands in `SE.state_delta.create[]` plus the new `PG.state_snapshot`.  
* **§5a Commitment Blocks Are Causal Moves:** The selected `SLT` or JIT `SLT` must be the causal move that made the new record necessary; the new record is an effect, not an arc promise.  
* **§5b Schema Minimalism:** Wave 2 uses existing record fields and existing `SE.world_logic_rationale`; no new record fields are required.  
* **§5c Present Causal State:** The trigger is “a new pressure/secret/question/entity/relation now exists,” never “the story needs a twist/stakes/payoff.”  
* **§6a Belief vs Fact:** A lie first becomes `BEL`; it becomes `STSEC` only when a hidden truth must be protected, tracked, or revealed through engine state.  
* **§6b Observer Firewall:** No created record may license actor behavior unless the actor has an access route through observation, testimony, `BEL`, `DA`, `STOBJ`, `STLOC`, institutional channel, inference, or another recorded route.

**Recommendation: compatibility drift is operational, not fictional.**

* **§4a:** Old `PG` snapshots remain historical page-plan commitments; compatibility checks read and normalize them.  
* **§5a:** Repair must not invent a narrative event unless there is an actual in-fiction repair turn.  
* **§5b:** Use audit findings and receipts first; add a story-system-contract marker only if validators consume it.  
* **§5c:** Compatibility repair never creates plot structures because the “current system likes them.”  
* **§6a:** Structural repair must not promote old beliefs into facts or vice versa.  
* **§6b:** New choices after repair must still be grounded in actor-available state.

### **§5c slippage traps**

Forbidden designs:

* `CLK` because “the story needs tension now.”  
* `STSEC` because “there should be a twist later.”  
* `STQ` with `expected_payoff_mode`, `expected_chapter`, “midpoint reveal,” or “climax payoff.”  
* `THR` as a thematic label like “the corruption arc.”  
* `STENT` because a character is important in the outline but has no branch-local agency, witness role, pressure role, or choice grounding.  
* `SREL` because a romance/rivalry is planned, before it constrains branch-local state.  
* Compatibility migration that pretends a schema change was an in-fiction event.  
* Any act/midpoint/climax/dramatic-curve discriminator in schemas, predicates, or validators.

---

## **4. Narrative/comparative evidence**

The useful craft evidence points in one direction: **track present causal forces, not authorial shape.**

| Framework | Classification | Useful for worldloom | Reject / translate |
| ----- | ----- | ----- | ----- |
| McKee-style inciting incident / disturbance | Compatible only after translation | A causal event can disturb a prior equilibrium and create a new intention, obligation, pressure, thread, or relationship. The New Yorker’s summary of McKee describes an inciting incident as a disturbance that produces desire against antagonistic forces. | Do not encode “quest,” “turning point,” or protagonist-object structure. Translate only to concrete branch state. |
| Syd Field three-act paradigm | Mostly incompatible; useful as caution | It explains why authors are tempted to insert midpoint/reversal fields. | Reject act boundaries, page-count midpoint, setup/confrontation/resolution metadata. |
| Campbell hero’s journey | Mostly incompatible; useful as caution | “Call,” “threshold,” and “trials” can inspire local event language. | Reject departure/initiation/return as engine state. Worldloom cannot require monomyth order. |
| Egri premise / thematic conflict | Compatible only after translation | Character pressure can become `STINT`, `BEL`, `SREL`, `OBL`, or `THR` when it constrains action. | Reject premise-as-proof, moral-question records, and thematic destiny. |
| Truby / Aronson / writers’ room thread discipline | Compatible only after translation | “Thread” is useful only when it means an ongoing causal concern with state consequences. | Reject planned reveal sequence, global weave management, or obligatory payoff ordering. |
| ChoiceScript | Directly compatible at state-machine level | ChoiceScript’s documentation shows choices, variables, and later conditional effects: earlier choices can affect later story state. | Worldloom should be stricter than plain variables because every state claim must be grounded and replayable. |
| Ink | Directly compatible at state-tracking level | Ink’s docs explicitly discuss advanced state tracking for interaction, continuity, player knowledge, and approximated world models. | Ink’s flexible script state is not enough; worldloom needs validator-readable record classes. |
| Blades in the Dark clocks | Directly compatible | Progress clocks track ongoing effort or impending trouble; not every situation needs a clock; clocks should be about obstacles, not methods; the clock reflects the fiction, not determines it. | Reject video-gamey overclocking and clocks that exist only because the author wants pressure. |
| Dungeon World fronts / dangers / stakes | Compatible only after translation | It usefully says not every element warrants a danger, and “stakes questions” are concrete questions to play to find out. | Grim portents and impending doom are too future-shaped unless translated into present-causal `CLK`, `THR`, or `STQ` state. |
| Improv “yes-and,” heightening, game of scene | Compatible as authoring heuristic | Continue or heighten existing state when it already explains the new event; introduce only when a new causal object exists. | Do not turn “heighten” into a drama-manager target. |
| Save-game / schema migration practice | Directly compatible operationally | Godot’s save guidance starts by identifying persistent objects and serializing only what must persist. Django treats migrations as versioned propagation of model/schema changes, not story events. SQLite’s `user_version` is an application-controlled compatibility marker. SemVer distinguishes backward-compatible additions from breaking changes. | Do not let operational migration alter fiction. Compatibility receipts are not plot. |

---

## **5. Mid-story introduction doctrine**

Recommended doctrine:

A new story-bundle structure may be introduced mid-story only when the just-committed event or current branch state creates a new persistent causal object that is not reducible to an existing active record and that changes future eligibility, visibility, obligations, pressure, witness propagation, relationship constraints, affordances, or choice grounding.

Corollaries:

1. **Same-event authority.** The introduction must be visible in the same accepted page-cycle plan: selected `SLT` / JIT `SLT`, `SE.state_delta.create[]`, patch create op, and next `PG.state_snapshot.active_records`.  
2. **Existing-record preference.** If the new event is merely an escalation, complication, discovery, tick, answer, reveal, status change, or relationship-axis change of an existing record, supersede/advance the existing record instead of creating a fresh one.  
3. **No prose-only structures.** If the pressure, secret, question, thread, entity, or relationship will constrain future engine behavior, it cannot live only in rendered prose.  
4. **No bootstrap over-seeding.** The system should not force authors to seed every possible future pressure/secret/question at root. Mid-story introduction is lawful and expected.  
5. **No future-shape contracts.** The new record may represent an open causal situation, but must not promise a future scene sequence, payoff mode, climax, midpoint, act position, or dramatic curve.  
6. **Introduction is not mandatory.** Background color, one-off interactions, flavor NPCs, and reader curiosity can remain prose, `SF`, `BEL`, or ordinary `SE` evidence if they do not need engine representation.

---

## **6. Class-by-class introduction rules**

### **`CLK` — pressure clock**

**Creation threshold.** Create a fresh `CLK` when a new pressure driver begins to accumulate across time/events and future choices need to know its staged state. Typical lawful triggers: deadline declared, pursuit begins, exposure starts accumulating, faction mobilizes, environmental danger starts worsening, mission/race begins, staged danger becomes trackable.

**Supersede/advance threshold.** Tick or resolve an existing clock when the same driver is maturing. Supersede only when its identity/driver/threshold model changes while continuity remains clear. Do not create a second clock for the same driver because tension increased.

**Minimum grounding.**

* `created_at_page: <new PG>`.  
* `driver` names the present pressure source.  
* `linked_records[]` includes at least one active parent record or same-event created record that grounds the pressure: usually `THR`, `OBL`, `CNSQ`, `STINT`, `SREL`, `STLOC`, `STOBJ`, or `STQ`.  
* `value`, `max`, `thresholds[]`, `salience`, `visibility`, and `status` are valid.  
* `SE.state_delta.create[]` includes the new clock id.  
* `SE.world_logic_rationale` includes an introduction tag.

**Required turn-cycle handling.** Phase 3 may create a `CLK` before Phase 4 applies clock lifecycle ops. If the same event both creates and immediately ticks a clock, the create op lands first and the initial tick is represented in `tick_history[]` or by `tick_pressure_clock` according to patch-engine semantics; do not edit YAML directly.

**Validator checks.**

* New `CLK` must have non-empty driver, valid `max`, valid `thresholds`, and at least one grounding `linked_records[]` target active at the parent page or created in the same `SE`.  
* If `status: fired`, existing threshold-crossing validators still apply.  
* If the clock is full/ticked, existing tick provenance must name an `SE`, nonzero delta, and non-empty cause.

**Anti-patterns.**

* Clock for “rising tension.”  
* Clock for a single binary threat resolved by one event.  
* Clock whose thresholds are a hidden outline: “chapter 5 betrayal,” “midpoint twist.”  
* Faction clock for offscreen color that does not constrain branch state.

**Examples.**

* Lawful: “The guard captain orders a citywide search.” Create `THR` “citywide search,” maybe `STINT` for the guard captain, then create `CLK` “Search cordon tightens” linked to that thread/intention.  
* Existing-record advance: “The search parties reach the bridge district.” Tick the existing search clock.  
* Rejected: “The scene feels too calm; start a danger clock.”

**§5c safety.** The clock tracks a present driver’s staged pressure. It is not a dramatic timer.

---

### **`STSEC` — story secret**

**Creation threshold.** Create a fresh `STSEC` when a hidden truth becomes engine-relevant: it constrains choices, beliefs, witness propagation, secret holders, clue carriers, admissible reveals, or protected mystery handling.

**First lie rule.** A first lie is not automatically an `STSEC`. It is first a `BEL` with appropriate `belief_mode`/truth relation. It becomes an `STSEC` only if the hidden truth behind the lie must be tracked as a revealable/protectable branch-local secret.

**Supersede/advance threshold.** Append clue carriers, mark carrier discovery, or reveal an existing secret when the hidden truth is the same. Supersede only when the secret’s holder/source/protection model changes but identity remains continuous.

**Minimum grounding.**

* `secret_claim` states the hidden truth.  
* `source_records[]` names records that made the secret branch-relevant.  
* `truth_anchor` names the branch truth if known, or is null only when mystery/canon policy requires it.  
* `holders[]` names who actually knows/holds the secret.  
* At least one of: holder, clue carrier, `truth_anchor`, or protected mystery reference.  
* If touching Mystery Reserve, `protected_mystery_refs[]` is populated and firewall rules apply.  
* `SE.state_delta.create[]` includes the new secret id.

**Required turn-cycle handling.** Phase 4 must run belief/witness propagation after any secret creation, clue discovery, or reveal. A secret creation involving deception or concealment must create/supersede `BEL` records or non-propagation tags.

**Validator checks.**

* `source_records[]` exist and are active in parent or created same event.  
* `truth_anchor`, if present, exists and is branch-legal.  
* `holders[]` are active `STENT` ids or valid holder labels allowed by schema.  
* Existing carrier and mystery-firewall validators continue to apply.  
* A revealed secret cannot resolve a forbidden Mystery Reserve entry.

**Anti-patterns.**

* Secret for author-only future twist.  
* Secret for information nobody in the branch can act on, hide, reveal, or discover.  
* Secret used as a substitute for `BEL` falsehood.  
* Secret used to bypass protected world mystery.

**Examples.**

* Lawful: “Mira claims she never saw the ledger while hiding that she burned page three.” Create `BEL` for the claim/deception, `SF` or `DA` anchor for the burned-page truth if branch-local, then `STSEC` if that hidden truth will constrain future discovery/reveal.  
* Existing-record advance: “The ash-stained envelope is found.” Append/mark clue carrier on existing `STSEC`.  
* Rejected: “The author plans a betrayal ten pages later.”

**§5c safety.** `STSEC` tracks hidden truth now protected by branch state, not future reveal architecture.

---

### **`STQ` — story question / open setup**

**Creation threshold.** Create `STQ` when the event opens a concrete setup, promise, or dramatic question that future choices or state closure may need to reference. It can be explicit (“Will you deliver this by dawn?”) or implied by a concrete introduced affordance/hazard (“the locked red box is placed on the table”).

**Supersede/advance threshold.** Answer, pay off, complicate, or abandon an existing `STQ` when the new event addresses the same setup. Do not create a new `STQ` for a rephrasing.

**Minimum grounding.**

* `source_event` equals the creating `SE`.  
* `source_records[]` names concrete records created or active in that event.  
* `setup_kind` is `setup`, `dramatic_question`, or `promise`.  
* `status` starts as open/complicated according to schema.  
* No prohibited future-shape fields.

**Required turn-cycle handling.** Phase 3 may create `STQ`; Phase 4 may answer/pay off/abandon existing `STQ`. Page-plan §10b should surface newly active high-salience questions that affect rendering or choices.

**Validator checks.**

* `source_event` exists and is the creating event for mid-story creation.  
* `source_records[]` exist and are active at `created_at_page`.  
* `answer_records[]` are required only at closure.  
* Existing `story_question_setup_predates_payoff`, payoff integrity, terminal debt, and grounding validators continue to apply.  
* `narrative_shape_field_rejection` hard-fails prohibited fields.

**Anti-patterns.**

* Reader curiosity without state consequences.  
* “Moral question” as abstract theme.  
* Expected payoff mode, chapter, act, climax, or scene sequence.  
* Duplicate `STQ` for an existing open question.

**Examples.**

* Lawful: “The letter says, ‘Ask the abbot what happened under the east stairs.’” Create `DA` letter and `STQ` with source records `[DA-x, BEL-y]`.  
* Existing-record closure: “The abbot admits the cellar flood killed the courier.” Answer the existing `STQ`.  
* Rejected: “The story should pay this off near the climax.”

**§5c safety.** `STQ` records an open present setup, not an obligation to deliver a future dramatic shape.

---

### **`THR` — thread**

**Creation threshold.** Create a `THR` when a new ongoing causal concern opens and is expected to remain addressable across pages: investigation, pursuit, negotiation, recovery, travel/mission, faction conflict, resource problem, social fallout.

**Supersede/advance threshold.** Advance/supersede an existing thread when the event belongs to the same causal concern, even if stakes rise. Create new only if the driver, participants, or branch concern is genuinely distinct.

**Minimum grounding.**

* `derived_from[]` includes same-event `SE`, `SF`, `BEL`, `OBL`, `CNSQ`, `STINT`, `SREL`, `DA`, or other allowed grounding records.  
* `status` is active/escalated as appropriate.  
* `urgency` is set.  
* Title/summary describe current causal concern, not theme.

**Required turn-cycle handling.** Phase 3 must explicitly allow “open a new thread” beside “advance/close existing threads.” Phase 8 choices can ground in the new thread only if actor-visible and branch-active.

**Validator checks.**

* `derived_from[]` non-empty for mid-story-created `THR`.  
* Grounding records exist and are active in parent or created same event.  
* No future-shape/thematic discriminator fields.  
* Optional warning for duplicate active thread with same title/tag/driver.

**Anti-patterns.**

* “The corruption theme.”  
* “Act II romance subplot.”  
* Thread created solely because the author wants a plotline.  
* New thread when an existing `OBL`, `CNSQ`, or `CLK` already covers the concern.

**Examples.**

* Lawful: “The stolen medallion points to a second buyer.” Create `THR` “trace the second buyer.”  
* Existing-record advance: “The second buyer’s runner is identified.” Supersede/advance same `THR`.  
* Rejected: “The protagonist’s spiritual arc begins.”

**§5c safety.** A thread is an ongoing causal concern in state, not a narrative arc.

---

### **`STENT` — story-local entity**

**Creation threshold.** Create `STENT` when a person, group, or entity earns branch-local representation because it now has agency, status, location, beliefs, relationship edges, witness role, information-source role, pressure-driver role, choice-target role, or object/obligation custody.

**Supersede threshold.** Supersede existing `STENT` only for identity mirror or role metadata changes. Life, agency, and location belong in `STSTAT`, not `STENT`.

**Minimum grounding.**

* `created_at_page` is the new `PG`.  
* `role_in_story` describes current engine value.  
* A fresh `STENT` must be paired in the same `SE` with exactly one fresh active `STSTAT` giving life/agency/location.  
* If only one actor believes the entity exists, create `BEL` first; do not create objective `STENT` unless the branch state commits the entity.

**Required turn-cycle handling.** Output table must say `STENT` can be new or superseded. Phase 3 must require same-event `STSTAT` pairing for fresh `STENT`.

**Validator checks.**

* Fresh `STENT` has same-event `STSTAT`.  
* New `STSTAT.entity_id` points to the new `STENT`.  
* Next `PG.state_snapshot.active_records.STENT` and `.STSTAT` include both.  
* Exactly one active status per active entity.

**Anti-patterns.**

* Background name-drop.  
* Flavor NPC with no future state function.  
* Abstract faction marker when an `SF`, `THR`, or `CLK` would suffice.  
* Creating `STENT` for a planned future actor not yet branch-real.

**Examples.**

* Lawful: “A masked courier enters, offers testimony, and can be followed.” Create `STENT` courier + `STSTAT`.  
* Lawful group: “The Dock Wardens begin searching houses.” Create group `STENT` if the group acts as a branch-local actor; otherwise use `THR`/`CLK`.  
* Rejected: “Someone mentions the king’s cousin in gossip.”

**§5c safety.** Entity representation is earned by present branch utility, not outline importance.

---

### **`SREL` — relationship**

**Creation threshold.** Create `SREL` when an objective branch-local relationship axis now constrains choices, obligations, status, pressure, intimacy, hostility, trust, debt, authority, access, or witness interpretation.

**Supersede threshold.** Supersede an existing relationship when the same participants/axis change value, valence, direction, or description. Do not create parallel duplicate edges for incremental change.

**Minimum grounding.**

* Participants are active `STENT` records or created same event.  
* `axis`, `direction`, `value`, `valence`, and `description` are valid.  
* `derived_from[]` includes the `SE` and/or `BEL`/`SF`/`OBL`/`CNSQ` records proving the relationship became branch-local.  
* If the relationship is only believed or rumored, use `BEL`, not objective `SREL`.

**Required turn-cycle handling.** Output table must say `SREL` can be new or superseded. Phase 4 must propagate beliefs when relationship formation is witnessed, public, secret, or deceptive.

**Validator checks.**

* Participants active in parent or same-event creation.  
* `derived_from[]` non-empty for mid-story creation.  
* No duplicate active relationship with same participants/axis/direction unless justified by different axis.  
* Observer firewall checks for choices/actions grounded in the relationship.

**Anti-patterns.**

* One-off interaction that does not constrain future state.  
* World-canon background relation not yet branch-relevant.  
* Actor belief about relation recorded as objective relation.  
* Romance/rivalry arc planned but not yet state-real.

**Examples.**

* Lawful: “Rafi swears protection to Inez in front of the council.” Create `SREL` loyalty/protection and probably `OBL`.  
* Existing-record advance: “Rafi breaks the oath.” Supersede `SREL`, close/supersede `OBL`, create `CNSQ`.  
* Rejected: “They will become rivals later.”

**§5c safety.** `SREL` tracks current objective branch constraints, not planned emotional trajectory.

---

## **7. Predicate and trigger design**

### **Recommendation: no new predicate DSL in Wave 2**

Do **not** add predicates like `pressure_emerged`, `secret_became_actionable`, or `setup_explicitly_introduced` in Wave 2. Those describe what the accepted event did, not what was already true in the parent snapshot. The predicate DSL should remain an eligibility language over active state.

### **Current DSL predicates**

Use existing predicates for preconditions over active records:

* Clock: `clock_at_least`, `clock_below`, `clock_full`, `any_clock_active`.  
* Secret: `secret_unrevealed`, `secret_revealed`, `revelation_ready`, `any_secret_unrevealed`.  
* Question: `story_question_open`, `story_question_status`, `any_story_question_open`, `promise_due`.  
* Social/state: `any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`, `record_age`, access predicates.

### **Proposed Wave 2 introduction evidence tags**

Use existing `SE.world_logic_rationale` with parseable tags, following the already-established non-propagation tag pattern.

Candidate tag shape:

intro:<CLASS>(

 id=<RECORD-ID>,

 trigger=<closed-trigger>,

 evidence=[<record ids>],

 distinct_from=[<record ids>]

)

Examples:

intro:CLK(id=CLK-12, trigger=deadline_declared, evidence=[SE-31,OBL-7,THR-9], distinct_from=[CLK-3])

intro:STSEC(id=STSEC-4, trigger=hidden_truth_became_actionable, evidence=[SE-31,BEL-19,DA-2], distinct_from=[])

intro:STQ(id=STQ-9, trigger=promise_made, evidence=[SE-31,BEL-20], distinct_from=[STQ-2])

intro:THR(id=THR-8, trigger=new_ongoing_causal_concern, evidence=[SE-31,CNSQ-2], distinct_from=[])

intro:STENT(id=STENT-14, trigger=actor_enters_branch, evidence=[SE-31], distinct_from=[])

intro:SREL(id=SREL-22, trigger=relationship_now_constrains_choices, evidence=[SE-31,BEL-21], distinct_from=[])

Closed trigger sets:

* `CLK`: `deadline_declared`, `pursuit_started`, `exposure_accumulation_started`, `faction_mobilized`, `environmental_degradation_started`, `mission_or_race_started`, `staged_danger_became_trackable`.  
* `STSEC`: `lie_made_hidden_truth_branch_relevant`, `hidden_truth_constrains_action`, `clue_carrier_enters_play`, `holder_access_changed`, `protected_mystery_story_secret_needed`.  
* `STQ`: `promise_made`, `explicit_question_raised`, `unexplained_evidence_introduced`, `affordance_setup_introduced`, `open_decision_created`.  
* `THR`: `new_ongoing_causal_concern`, `investigation_line_opened`, `recovery_line_opened`, `negotiation_line_opened`, `mission_line_opened`, `social_fallout_line_opened`.  
* `STENT`: `actor_enters_branch`, `witness_needed`, `information_source_enters`, `pressure_driver_enters`, `counterparty_enters`, `choice_target_enters`.  
* `SREL`: `alliance_forms`, `rivalry_forms`, `debt_relation_forms`, `authority_relation_forms`, `trust_axis_becomes_relevant`, `intimacy_axis_becomes_relevant`, `hostility_axis_becomes_relevant`.

**Consumers:**

* SLT eligibility: existing predicates only.  
* Event introduction proof: `SE.state_delta.create[]` plus `intro:*` tags.  
* Audit replay: reads tags to explain why a record appeared.  
* Validator checks: parse tags, verify evidence ids exist, and verify grounding fields.

**Why this avoids future-shape prediction:** every trigger describes something that happened or became true at the committed event. None names act position, desired escalation, future payoff, or planned sequence.

---

## **8. Turn-cycle skill amendments**

### **`branching-story-turn-cycle/SKILL.md` output table**

Replace the relevant rows with wording like this:

| `STENT-<integer>` (new or supersession) | `_source/entities/STENT-<integer>.yaml` | IF a person/group/entity first earns story-local representation through agency, witness role, information-source role, pressure-driving role, choice grounding, or relationship/obligation participation; OR IF identity mirror / role metadata changes. Fresh STENT requires same-event STSTAT. |

| `THR-<integer>` (new or supersession) | `_source/threads/THR-<integer>.yaml` | IF a new ongoing causal concern opens, or an existing thread advances, escalates, resolves, or is abandoned. |

| `CLK-<integer>` (new or lifecycle update) | `_source/clocks/CLK-<integer>.yaml` | IF the event creates a new staged pressure through `create_clk_record`, or advances/resolves an active pressure clock through `tick_pressure_clock` / `resolve_pressure_clock`. |

| `STSEC-<integer>` (new or lifecycle update) | `_source/secrets/STSEC-<integer>.yaml` | IF hidden truth becomes branch-relevant through `create_stsec_record`, or an accepted event adds/discovers clue carriers or reveals an existing secret. |

| `STQ-<integer>` (new or lifecycle update) | `_source/story-questions/STQ-<integer>.yaml` | IF the event opens a concrete setup/question/promise through `create_stq_record`, or answers/pays off/abandons an existing open setup. |

| `SREL-<integer>` (new or supersession) | `_source/relationships/SREL-<integer>.yaml` | IF an objective branch-local relationship first constrains choices/state, or an existing relationship changes. |

### **Phase 2/3 commitment and state delta**

Add:

Mid-story introduction rule: after binding/selecting the `SLT`, ask whether the accepted event creates any new persistent causal object not reducible to an active record. If yes, draft the new record in `SE.state_delta.create[]` and include a parseable `intro:<CLASS>(...)` tag in `SE.world_logic_rationale`.

Prefer superseding/advancing existing active records when identity/driver/question/participants remain continuous. Fresh creation is for genuinely new causal objects.

Author-pool `SLT.effects.create[]` may remain empty when ids are runtime-contextual. Branch-scoped JIT `SLT` records SHOULD include concrete created ids once allocated. Introduction should usually be a side effect of the broader causal move, not the block’s sole purpose.

Add to Phase 3 delta list:

- Create pressure clocks (`CLK`) when a new staged pressure driver emerges.

- Create story secrets (`STSEC`) when hidden truth becomes branch-relevant.

- Create story questions (`STQ`) when a concrete setup/question/promise opens.

- Open new threads (`THR`) when a new ongoing causal concern begins.

- Create story-local entities (`STENT`) with same-event `STSTAT` when a person/group/entity earns engine representation.

- Create objective branch-local relationships (`SREL`) when a relationship axis first constrains state or choices.

### **Phase 4/5 belief, visibility, and new-class state**

Amend the opening:

Before lifecycle updates to existing `CLK` / `STSEC` / `STQ`, apply any same-event creations for those classes. Then process ticks/resolutions, clue discovery/reveal, and question answer/payoff/abandonment.

Any new `STSEC`, deceptive event, public relationship formation, new witness-bearing entity, or newly visible pressure MUST pass the belief/visibility propagation discipline. Create/supersede `BEL` records or emit closed-set non-propagation tags.

### **Output table and page-plan §10b**

Add:

When the turn creates or activates `CLK`, `STSEC`, or `STQ`, page-plan §10b must include their render-relevant visibility: what the renderer may show, what remains hidden, who knows, and which choices are grounded in the new structure.

### **Phase 9 validation**

Add checks:

12. Mid-story introduction grounding: every newly created `CLK` / `STSEC` / `STQ` / `THR` / `STENT` / `SREL` has same-event `SE.state_delta.create[]` membership, valid `created_at_page`, grounding records active in parent or created in the same event, and a parseable `intro:<CLASS>` tag.

13. Fresh entity status pairing: every created `STENT` has exactly one same-event active `STSTAT`.

14. Relationship participant grounding: every created `SREL` names active or same-event-created participants and a non-empty `derived_from[]`.

15. Narrative-shape field rejection: no new record contains act/midpoint/climax/expected-payoff/dramatic-curve fields.

### **Phase 10 patch op list**

Add explicit create ops:

Operations include `create_clk_record`, `create_stsec_record`, and `create_stq_record` for mid-story introduction, in addition to `tick_pressure_clock`, `resolve_pressure_clock`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`, `answer_story_question`, and `abandon_story_question`.

Fresh `THR`, `STENT`, and `SREL` records use `create_thr_record`, `create_stent_record`, and `create_srel_record`; fresh `STENT` must be paired with `create_ststat_record`.

---

## **9. Validator and audit coverage**

| Validator | Severity | Inputs | Failure code examples | Exact rule | Deterministic? | False-positive risk | Wave |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `midstory_record_introduction_grounding` | fail | patch plan, created `SE`, created `PG`, created records | `midstory_intro_missing_state_delta`, `midstory_intro_created_at_mismatch`, `midstory_intro_missing_tag`, `midstory_intro_evidence_missing` | For any mid-story-created `CLK/STSEC/STQ/THR/STENT/SREL`, id must appear in same `SE.state_delta.create[]`, record `created_at_page` must equal new `PG`, tag must parse, evidence ids must exist and be parent-active or same-event-created. | Yes | Tags malformed by author; mitigated by exact syntax examples. | 2 |
| `clock_introduction_grounding_integrity` | fail | new `CLK`, parent snapshot, same-event creates | `clock_intro_missing_driver`, `clock_intro_missing_linked_record`, `clock_intro_link_not_active` | New `CLK` must have driver, valid max/thresholds, and at least one valid grounding linked record. | Yes | Some valid pressures may lack current allowed linked class; create `THR` or defer schema expansion. | 2 |
| `secret_introduction_anchor_integrity` | fail | new `STSEC`, source records, truth anchor, mysteries | `secret_intro_missing_source`, `secret_intro_truth_anchor_missing`, `secret_intro_holder_missing` | New `STSEC` must have source records; truth anchor must exist if provided; holder/carrier/protection evidence must exist. | Yes | Secret with intentionally unknown truth may need `truth_anchor: null`; allow if protected mystery/source records justify. | 2 |
| `story_question_introduction_grounding_integrity` extension | fail | new `STQ`, source event/records | `stq_intro_source_event_mismatch`, `stq_intro_source_not_active` | For mid-story `STQ`, `source_event` must equal creating `SE`; source records must exist and be active at created page. | Yes | None significant. | 2 |
| `thread_introduction_grounding_integrity` | fail | new `THR`, derived_from, parent snapshot | `thread_intro_missing_derived_from`, `thread_intro_grounding_missing` | Mid-story `THR` must have non-empty grounding evidence and active/same-event records. | Yes | Thin but legitimate threads may need one explicit `SE`/`CNSQ` grounding. | 2 |
| `entity_introduction_status_pairing` | fail | new `STENT`, same-event `STSTAT`, next PG | `entity_intro_missing_status`, `entity_intro_multiple_active_status` | Fresh `STENT` must have exactly one active same-event `STSTAT`; snapshot must include both. | Yes | None. | 2 |
| `relationship_introduction_grounding_integrity` | fail/warn | new `SREL`, participants, derived_from | `srel_intro_participant_inactive`, `srel_intro_missing_derived_from`, `srel_intro_duplicate_axis` | Participants must be active/same-event-created; derived evidence required; duplicate same-axis relation warns unless supersession. | Yes | Duplicate detection can over-warn nuanced relationships. | 2 |
| `introduction_observer_firewall` | fail | selected SLT, actor, created records, BEL/access | `intro_observer_no_access_route` | If created record grounds actor action or choice, acting entity must have recorded access route. | Mostly | Access may be inferential and hard to mechanize; keep focused on explicit record references. | 3 unless easy reuse of existing `observer_firewall` |
| `narrative_shape_field_rejection` | fail | all story records | `narrative_shape_forbidden_field` | Reject forbidden fields: `act_position`, `midpoint`, `climax`, `expected_payoff_mode`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`, etc. | Yes | None. | 2 |
| `compatibility_drift` | info/warn/fail | story bundle tree, PG snapshots, STORY_KERNEL marker if present, validators | `compat_missing_contract_marker`, `compat_missing_active_record_key`, `compat_optional_directory_absent`, `compat_requires_migration_patch` | Detect old contract surface separately from story failure. Missing optional class directories or keys are not hard failures. | Yes for structural cases | Semantic “would improve playability” remains advisory. | 2 |

Audit additions:

* Add health-audit mode `compatibility` or `structural,compatibility`.  
* Add a `Compatibility drift` section to SAU reports.  
* Emit advisory RSP cards only when missing optional structures reduce playability; never auto-create `CLK/STSEC/STQ`.  
* Keep current Phase 2i “absence is not a finding” rule.

---

## **10. Non-retcon compatibility repair workflow**

### **Final recommendation**

Use a hybrid:

1. **Inline validator finding:** add `compatibility_drift` so drift is visible in validator output.  
2. **Health-audit compatibility mode:** read-only detection, classification, and proposal cards.  
3. **Dedicated compatibility-repair skill in Wave 3:** applies only the minimum lawful repair, writes explicit compatibility receipts, and routes any `_source` changes through the patch engine.

### **Detection**

Run:

* Existing validators.  
* `compatibility_drift`.  
* Health-audit `mode=compatibility` or `mode=structural,compatibility`.  
* Optional private batch runner over local production bundles.

Detect:

* Missing newer optional subdirectories: `_source/clocks/`, `_source/secrets/`, `_source/story-questions/`, `_source/artifacts/`.  
* Older `PG.state_snapshot.active_records` maps missing newer keys.  
* Missing or stale story-system-contract marker, if present in Wave 3.  
* Validators that assume newer keys without normalizing absent optional arrays.  
* New pages created under current contract but failing to include full active-record map.

### **Classification**

Use these classifications:

* `current_contract`: bundle has current marker or passes current structural surface.  
* `compatible_optional_absence`: optional class directories/records are absent; no engine assumption depends on them.  
* `grandfathered_snapshot_shape`: old `PG` snapshots omit newer keys; replay normalizes missing keys to empty arrays.  
* `compatible_with_advisory`: story is valid, but audit sees optional structures that might improve playability.  
* `requires_compatibility_audit`: marker absent/stale and structural drift cannot be classified from cheap scan.  
* `requires_migration_patch`: current engine would fail without a patch-engine-routed structural repair.  
* `manual_review`: semantic ambiguity or private-story author judgment needed.  
* `blocked_contract_break`: incompatible contract change cannot be safely normalized.

### **Story-system-contract revision marker**

**Wave 2:** do not require a marker. Detect drift structurally.

**Wave 3:** add a top-level non-fiction marker in `STORY_KERNEL.md` frontmatter:

story_system_contract_revision: story-bundle-contract-2026-05-18

last_compatibility_audit: SCMP-12

Consumers:

* `branching-story-turn-cycle` preflight.  
* `branching-story-health-audit mode=compatibility`.  
* `compatibility_drift` validator.  
* `branching-story-compatibility-repair`.

This marker is not fiction and must not live in `PG.state_snapshot`.

### **Older `PG.active_records` maps missing newer keys**

Do not rewrite old `PG` records. Treat missing keys as empty arrays during replay if the page predates the relevant contract revision or lacks a marker. When a new turn advances from that parent, the new child `PG` must materialize the full current active-record map, including `CLK: []`, `STSEC: []`, and `STQ: []` when empty.

### **Repair artifact strategy**

Preferred:

* **Audit report:** `audits/SAU-<id>-<date>.md`.  
* **Compatibility receipt:** `audits/compatibility/SCMP-<id>-<date>.md`.  
* **Optional RSP cards:** for authorial follow-up.

Avoid:

* Superseding historical `PG` records just to add empty keys.  
* Creating `SE` events for pure compatibility.  
* Creating optional records automatically.

Patch-engine route:

* If repair must create or supersede `_source` records, use patch-engine ops.  
* If repair is pure metadata/audit, write direct audit/receipt artifacts under `audits/`.  
* If a future unavoidable `_source` repair needs an event, use `event_kind: system_repair`, `actor: system`, and `world_logic_rationale` tag `compatibility_migration(..., no_fiction_change=true)`. This should be rare.

### **Hard-fail vs warn vs info**

* **Hard fail:** new current-contract page omits required active-record shape; created record lacks grounding; replay mismatch; actual dangling references; direct `_source` mutation attempt.  
* **Warn:** old snapshot shape needs normalization; stale/absent marker; optional directory absent but tooling might assume it; advisory optional structure opportunity.  
* **Info:** no optional `CLK/STSEC/STQ`; empty optional directories; grandfathered old pages with successful normalization.

### **Private production batch audit**

Private stories should be audited locally, not uploaded. The safe workflow:

1. Run validators and health-audit compatibility mode per story slug.  
2. Produce local SAU/SCMP reports.  
3. Summarize counts by classification.  
4. Apply no patches automatically.  
5. For `requires_migration_patch`, dry-run patch plans first.  
6. For `compatible_with_advisory`, emit RSP cards but leave authorial adoption optional.

### **Technically valid but missing optional structures**

Do not repair. Emit `compatible_with_advisory` only. Optional structures improve playability only when a future turn causally introduces them.

---

## **11. Concrete implementation plan**

### **Wave 2 — small enough to ship**

1. **Amend turn-cycle docs.**  
   * `SKILL.md` output table.  
   * `phase-2-3-commitment-and-state-delta.md`.  
   * `phase-4-5-belief-and-mystery.md`.  
   * Phase 9 and Phase 10 operation guidance.  
2. **Add introduction tags to skill prose.**  
   * Define `intro:<CLASS>(...)` syntax.  
   * Require tags for fresh mid-story `CLK/STSEC/STQ/THR/STENT/SREL`.  
3. **Add validators.**  
   * Generic `midstory_record_introduction_grounding`.  
   * `clock_introduction_grounding_integrity`.  
   * `secret_introduction_anchor_integrity`.  
   * `story_question_introduction_grounding_integrity` extension.  
   * `thread_introduction_grounding_integrity`.  
   * `entity_introduction_status_pairing`.  
   * `relationship_introduction_grounding_integrity`.  
   * `narrative_shape_field_rejection`.  
4. **Add compatibility drift reporting.**  
   * `compatibility_drift` validator with info/warn/fail severities.  
   * Health-audit compatibility section.  
   * Snapshot-key normalization for old `PG.active_records`.  
5. **Add fixtures/tests.**  
   * Use synthetic non-production story bundles.  
   * Do not rely on private production cases.  
6. **Avoid schema expansion unless blocked.**  
   * If current `CLK.linked_records[]` proves too narrow for common introductions, log a Wave 3 schema ticket rather than widening immediately.

### **Wave 3+**

1. **Dedicated `branching-story-compatibility-repair` skill.**  
   * Consumes SAU/SCMP findings.  
   * Writes compatibility receipts.  
   * Routes `_source` repairs through patch engine only when necessary.  
2. **Story-system-contract marker.**  
   * Add `story_system_contract_revision` to `STORY_KERNEL.md` frontmatter.  
   * Add marker-aware validator normalization.  
3. **Richer trigger taxonomy.**  
   * Calibrate false positives after Wave 2 fixtures and live authoring.  
4. **Private batch audit tooling.**  
   * Local-only production-story sweep.  
   * Classification summary.  
   * No automatic patch application.  
5. **Optional schema expansions.**  
   * Only if validators prove a field is load-bearing.  
   * Candidate: broader `CLK.linked_records[]` support for `BEL/SF/DA` if repeated workarounds appear.

---

## **12. Test plan**

Repository tests and fixtures should include:

1. **Mid-story `CLK` creation passes.**  
   * Event declares a deadline.  
   * Same `SE` creates `OBL` or `THR`.  
   * New `CLK` links to grounding record.  
   * `intro:CLK(...)` tag parses.  
   * Next `PG.active_records.CLK` includes id.  
2. **Vague pressure `CLK` fails.**  
   * New `CLK` has no driver/linked record or trigger evidence.  
   * Expect `clock_intro_missing_grounding_link`.  
3. **Existing clock tick remains valid.**  
   * No new creation.  
   * `tick_pressure_clock` produces valid tick provenance.  
4. **Mid-story `STSEC` creation passes.**  
   * Event creates deceptive `BEL`, truth anchor, and secret.  
   * Holder and source records valid.  
   * Mystery firewall respected.  
5. **Author-only future twist `STSEC` fails.**  
   * No source records, holder, clue carrier, or truth anchor.  
6. **Mid-story `STQ` creation passes.**  
   * Event creates a `DA` letter that raises a concrete open question.  
   * `source_event` equals creating `SE`.  
   * Source records active.  
7. **Future-shape `STQ` fails.**  
   * Fixture includes `expected_payoff_mode` or `climax`.  
   * Expect `narrative_shape_forbidden_field`.  
8. **New `STENT` + `STSTAT` same-event pairing passes.**  
   * New courier enters, can act, has status/location.  
9. **New `STENT` without `STSTAT` fails.**  
   * Expect `entity_intro_missing_status`.  
10. **New `SREL` creation passes.**  
    * Two active participants form an alliance/debt/hostility edge.  
    * `derived_from[]` cites the event or belief/obligation.  
11. **Believed-only relationship as `SREL` fails or warns.**  
    * Actor merely suspects a relationship.  
    * Correct repair is `BEL`, not objective `SREL`.  
12. **New `THR` creation passes.**  
    * Ongoing investigation line opens with `derived_from[]`.  
13. **Thematic `THR` fails.**  
    * Thread has no grounding and is named as theme/arc.  
14. **Absent `CLK/STSEC/STQ` remains valid.**  
    * No optional records; health audit emits no finding for absence.  
15. **Old-style `PG.active_records` compatibility drift is reported but not hard-failed.**  
    * Old PG lacks `CLK/STSEC/STQ`.  
    * Replay normalizes to empty arrays.  
    * New child PG emits full map.  
16. **New current-contract PG missing keys fails or warns per policy.**  
    * If page is current-contract and omits required active-record keys, validator reports current-shape defect.  
17. **Hard rejection of future-shape fields across classes.**  
    * `act_position`, `midpoint`, `dramatic_curve_position`, `expected_chapter`, `scene_sequence` fail.  
18. **Compatibility repair does not create fiction.**  
    * Pure compatibility scan writes SAU/SCMP only.  
    * No `SE` or `PG` mutation for empty-key normalization.

---

## **13. Explicit non-goals**

* No act structure.  
* No global drama manager.  
* No midpoint/climax/dramatic-curve fields.  
* No expected payoff mode.  
* No automatic clock creation because “the story needs tension.”  
* No secret creation for author-only future twists.  
* No story question for mere reader curiosity.  
* No `THR` as theme/arc label.  
* No `STENT` for background mentions.  
* No `SREL` for planned relationships not yet state-real.  
* No direct edits to `_source/*.yaml`.  
* No treating absent optional `CLK/STSEC/STQ` as invalid.  
* No superseding old `PG` snapshots merely to add empty active-record keys.  
* No compatibility repair disguised as an in-fiction retcon.  
* No assumptions from unavailable private production stories.

---

## **Recommended spec title**

**SPEC-43: Present-Causal Mid-Story State Introduction and Non-Retcon Bundle Compatibility Repair**

## **Ordered tickets / amendments to write next**

1. **SPEC43-T01 — Turn-cycle mid-story creation amendment** for `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, and `SREL`.  
2. **SPEC43-T02 — `intro:<CLASS>` rationale tag grammar** and examples.  
3. **SPEC43-T03 — Generic `midstory_record_introduction_grounding` validator.**  
4. **SPEC43-T04 — Class-specific introduction validators** for clocks, secrets, questions, threads, entities, and relationships.  
5. **SPEC43-T05 — `narrative_shape_field_rejection` validator extension.**  
6. **SPEC43-T06 — Compatibility drift validator and old-snapshot active-record normalization.**  
7. **SPEC43-T07 — Health-audit `compatibility` mode and SAU compatibility section.**  
8. **SPEC43-T08 — Synthetic fixtures for all mid-story creation classes and old-style PG snapshots.**  
9. **SPEC43-T09 — Wave 3 `branching-story-compatibility-repair` skill proposal.**  
10. **SPEC43-T10 — Optional Wave 3 `story_system_contract_revision` marker in `STORY_KERNEL.md` frontmatter.**

