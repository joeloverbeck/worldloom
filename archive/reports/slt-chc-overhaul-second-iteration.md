**Status**: COMPLETED

# **Research-Driven Storylet Selection, CHC Binding, and Driver-Aware Narrative Causality Proposal**

## **1. Executive verdict**

The landed driver primitive is **the right direction**, but the current architecture is **not yet the right architecture**. `SE.turn_driver`, non-player driver kinds, page-plan §7a, active-pressure disposition, and minimal `SLT.grounding.compatible_turn_drivers[]` are good first cuts. They establish that a page can be caused by something other than a player menu click, and they make the driver visible to validators.

But the current CHC ↔ SLT model is still wrong for a growing, replayable storylet pool. `CHC.associated_commitment_block: SLT|null` remains required in the live `story-choice` schema, which means a player-facing choice is still structurally tied to a particular storylet or to a null-JIT escape hatch. That is too brittle for a live global author pool where newer global SLTs should be eligible when replaying or forking from old pages.

Breaking changes are warranted. The preferred next architecture is:

parent PG snapshot  
 -> due-driver evaluation  
 -> driver-first indexed SLT candidate filtering  
 -> deterministic predicate + branch + access-route evaluation  
 -> small shortlisted candidate set  
 -> LLM narrative-fit selection or driver-specific JIT  
 -> SE records selected_slt_id + selection_trace_id + source choice/write-in, if any  
 -> child PG emits CHCs as player-facing promises

The clean target is a **hybrid CHC binding object + persistent SLT selection trace + richer indexed SLT grounding**. Remove `CHC.associated_commitment_block` as a required scalar. Replace it with explicit binding semantics: late-bound intent, candidate-bound, exact-bound, and continuation/witness modes. Exact binding survives only as a rare, explicit, frozen promise.

The replay policy should be **branch-safe live global pool**: when replaying or forking from an older page, newer `global_author_pool` SLTs are considered if they pass scope, branch, predicate, driver, access-route, and mystery/canon legality against that old parent snapshot. Branch-scoped and branch-prefix-scoped SLTs remain branch-lawful and must not leak.

## **2. Evidence discipline**

Repository mission and manifest came from the uploaded prompt and uploaded tree manifest.

Repository metadata was verified through the GitHub Git app, not through code search. The current `main` branch resolves to:

joeloverbeck/worldloom  
main = 7a808d4c670eff6af53ce82cf33bf76d1ee54bb2  
merge title = Merge pull request #108 from joeloverbeck/spec-77-slt-grounding-provenance

No clone was used. No GitHub code search or snippet-based repository search was used as evidence. The uploaded manifest was used as file inventory, then material files were fetched directly from exact SHA `7a808d4c670eff6af53ce82cf33bf76d1ee54bb2`.

Directly fetched evidence included the constitutional/shared contracts (`docs/FOUNDATIONS.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md`), the live story skills, schemas, validators, MCP/index code, Red Kiln fixtures/tests, and the active SLT/CHC report as context. Live contracts, schemas, skills, validators, and tests were treated as authority; active reports were not allowed to override current-main code.

## **3. Current landed architecture map**

### **3.1 Current SE / PG / SLT / CHC flow**

The live shared contract defines the story-bundle authority stack as world canon, story state, then rendered prose. Story state is authoritative at page-plan commit; rendered prose is a rendering, not state authority. The `PG` snapshot is the fork primitive.

Current turn advancement is:

parent PG snapshot  
 -> selected CHC / write-in / advance_initiative  
 -> selected or JIT-created SLT  
 -> SE state_delta  
 -> child PG snapshot  
 -> page plan  
 -> emitted CHCs

The turn-cycle skill now includes `action_source_mode`, including `advance_initiative`, and Phase 0 evaluates due non-player pressure before Phase 1 action resolution.

### **3.2 Current driver flow**

The live `story-event` schema defines `turn_driver.kind` as:

player_action  
player_write_in  
npc_action  
offstage_action  
world_pressure  
clock_fire  
secret_reveal  
multi_actor_collision

It requires `turn_driver` for ordinary `turn_resolution` events and forbids it for story-start and audit/prose-attach event kinds. It also has per-kind constraints: player drivers must have empty `driver_records`; `npc_action` must cite at least one active `STPLAN`, `STEMO`, `CLK`, `THR`, or `STCHAR`; `clock_fire` must cite `CLK`; `secret_reveal` must cite `STSEC`; and `multi_actor_collision` needs multiple driver records.

The registered validators enforce this driver layer:

turn_driver_schema_compliance  
turn_driver_pov_observer_firewall  
page_plan_turn_driver_consistency  
active_pressure_handling_discipline  
slt_grounding_minimal_integrity

The public registry confirms these validators are active.

### **3.3 Current SLT applicability pipeline**

The turn-cycle skill currently filters SLTs by:

1. scope: global author pool, branch-prefix scoped, branch scoped;  
2. hard predicate truth;  
3. existential predicate alias binding;  
4. observer firewall;  
5. mystery/canon authority;  
6. cooldown and salience;  
7. move-family × action-family fit;  
8. target records and diversity;  
9. JIT branch-scoped SLT if no existing eligible SLT fits;  
10. SPEC-77 driver compatibility: `SLT.grounding.compatible_turn_drivers[]` must contain current `SE.turn_driver.kind`.

That pipeline is conceptually strong, but it is still skill-prose, not yet a scalable indexed retrieval surface.

### **3.4 Current CHC association model**

The live `story-choice` schema requires:

associated_commitment_block: SLT | null

It also requires `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, and `grounded_in`.

The selected-commitment validator still resolves an emitted-choice event by checking that the selected `SLT` matches the chosen `CHC.associated_commitment_block`. This proves the current system is structurally tied to direct CHC→SLT association, not merely informally using it.

### **3.5 Current SLT grounding**

The live `story-storylet` schema requires `grounding`, but the grounding object is minimal:

grounding:  
 compatible_turn_drivers: [...]  
 reason_to_exist: string

Additional grounding fields are forbidden by `additionalProperties: false`.

The validator enforces only non-empty driver compatibility, valid driver enum values, minimum reason length, generic-phrase rejection, and singleton driver compatibility for runtime JIT SLTs.

### **3.6 Current index / MCP scaling surface**

The story-bundle context packet summarizes the storylet pool by total count, move-family distribution, urgency distribution, and at most 50 visible storylet records with compact fields.

`list_records` can filter parsed storylet records by dotted fields and project top-level fields, but it currently loads all rows of a story-bundle record type, parses them, filters in process, and then projects. That is useful but not a compiled storylet-candidate engine.

The index emits edges for CHC grounding, CHC associated storylet, storylet predicate refs, effects, and exit likely effects, but not driver compatibility, grounding features, predicate class projections, or candidate-selection indexes.

### **3.7 Current proof fixture**

The Red Kiln Ambush fixture proves a non-player `npc_action` driver: `SE-2` is driven by `STPLAN-9`, `STEMO-12`, `CLK-3`, and `THR-4`; §7a records the driver trace and active-pressure disposition; emitted choices respond to the driver.

But the fixture also exposes schema drift: its CHC records use fields like `choice_text` and `player_response_mode`, while the current `story-choice` schema requires `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, `associated_commitment_block`, and rejects additional properties.

## **4. Research synthesis**

### **4.1 Storylets / quality-based narrative**

Storylet theory supports Worldloom’s `SLT` concept. Emily Short describes storylets as content units with prerequisites and effects on world state, and emphasizes that storylet systems are valuable because they let authors add new material later and interlock it with existing circumstances.

Quality-based narrative similarly uses state qualities to unlock modular content; salience-based narrative picks applicable content from a larger pool instead of forcing a single branch tree.

Implication: older pages should not be frozen to only the SLTs known when they were authored. A live global storylet pool is not a bug; it is the point of storylets. But applicability must be lawful, symbolic, and branch-safe.

### **4.2 Interactive-fiction choice design**

Ink’s practical model separates choice text from output text and treats branching/rejoining as ordinary control flow; this supports the idea that a choice label is not the same thing as the resulting event.

ChoiceScript-like stat-driven systems show the opposite useful lesson: player choices can be intent/action selections whose consequences are mediated by state variables, not hard promises of success.

Implication: `CHC` should promise an available player-facing affordance or intent envelope, not a specific outcome and not necessarily a specific SLT.

### **4.3 Drama management / experience management**

Façade combined believable agents with a drama manager that organized events toward interactive dramatic coherence.

Interactive-storytelling literature often distinguishes a drama manager, user model, and agent model; the agent model proposes character actions while the drama manager preserves coherence.

Implication: Worldloom should not add an opaque global drama manager, because FOUNDATIONS explicitly rejects target narrative shapes and global story rails. But Worldloom should add local driver-aware selection: due pressures select candidate moves without pretending that all causality originates in the player.

### **4.4 BDI / believable agents / affective agents**

BDI architecture separates beliefs, desires, intentions, and plan execution. Intentions are commitments to future action, and plan libraries mediate action selection.

Implication: Worldloom’s separation between `BEL`, `STINT`, `STPLAN`, `STEMO`, and `STCHAR` is correct. The missing link is using active `STPLAN` and `STEMO` records as first-class driver inputs to SLT candidate selection, not just as flavor context.

### **4.5 GOAP / HTN / planning**

GOAP-style game AI uses action libraries with preconditions and effects, then selects actions at runtime from the current world state; F.E.A.R. is the standard practical reference.

HTN planning decomposes high-level tasks into lower-level methods/actions; the practical lesson is not “make Worldloom a planner,” but “compile the action library into cheap retrieval and legality tests before invoking narrative judgment.”

Implication: large SLT pools should be filtered by symbolic features: scope, driver kind, active record classes, predicate opcodes, exact refs, action family, salience, and actor access route.

### **4.6 Multi-agent narrative planning**

Narrative planning research stresses both plot causality and character intentionality. IPOCL-style work argues that character actions should be explainable by goals and intentions rather than appearing as arbitrary plot beats.

Implication: an NPC-driven `SE` should not be “the author needed tension.” It should cite `STPLAN`, `STEMO`, `BEL`, `CLK`, `THR`, `STSEC`, or related pressure records that explain why the NPC/world/clock acted now.

### **4.7 LLM agent retrieval / planning**

Generative Agents used memory, reflection, retrieval, and planning to produce believable behavior; the important architectural point is separation between stable persona, memory/current state, retrieval, and action planning.

Recent LLM interactive-drama and LLM-storylet work reinforces the same lesson: LLMs are useful for narrative fit and realization, but control and legality need structured scaffolding.

Implication: Worldloom should use LLM judgment only after deterministic filtering has reduced thousands of SLTs to a small lawful set.

### **4.8 Practical interactive narrative systems**

StoryNexus/Fallen London-like quality systems, Ink, ChoiceScript, and Twine-style passage systems all teach the same operational lesson: state variables and content availability are separate from player-facing text. Good systems let the player choose a surface/intent while the engine resolves consequences under current state.

Implication: CHCs should be stable player promises, but the SLT resolution behind them should be late-bound unless an exact binding is explicitly declared.

## **5. Current pain points**

### **5.1 Stale CHC / SLT direct association**

The current required scalar `associated_commitment_block` is the wrong default. It makes an old choice point at an old SLT even when a newer, better, globally lawful SLT exists.

### **5.2 Large storylet-pool scaling**

The current MCP context packet caps visible storylets at 50 and summarizes the rest. `list_records` can filter fields, but it is not a compiled candidate-selection API. Loading all full SLTs is already rejected by the repo’s tooling doctrine and will collapse at thousands.

### **5.3 Replay / fork semantics**

The shared contract says any committed page can be a fork primitive, and branch rewind loads that page’s snapshot without sibling branch records.

But current CHC→SLT scalar binding fights that: replay from an old page should be able to see newly authored global SLTs, while branch-local SLTs must remain excluded.

### **5.4 Non-player drivers remain under-integrated**

Driver schema and validation landed. Selection semantics remain too thin. For non-player drivers, the selected SLT should be the causal move produced by the driver, not merely a response to a player menu.

### **5.5 Storylet generation diversity is still pre-driver**

`commitment-block-authoring` diagnoses move-family and causal-function coverage, but the next architecture needs driver-kind × pressure-source × actor-role × state-class coverage.

### **5.6 Minimal SLT grounding is too thin**

`compatible_turn_drivers[]` is necessary but not sufficient. It cannot express whether an SLT is for plan pressure, affect pressure, clock pressure, secret reveal, offstage consequence, or role-lane binding.

### **5.7 Choice quality is under-validated**

`rule_choice_set_noncollapse` detects full material collapse, but it does not validate choice promise type, outcome-promise leakage, intent clarity, response relevance, or stale binding.

### **5.8 Player agency contract needs non-player roles**

The current system implicitly treats choice as initiation too often. The Player Agency Contract should distinguish player as initiator, responder, witness, continuation confirmer, and constrained write-in author.

### **5.9 Schema / validator drift**

Two concrete drifts matter:

* Red Kiln CHCs include `player_response_mode`, but the CHC schema forbids it.  
* `page-plan-active-pressure` checks `STQ.payoff_due`, but the `story-question` schema has no such field.

## **6. Architectural alternatives**

### **Alternative A — Preserve `associated_commitment_block` with stricter validation**

**Description:** Keep `CHC.associated_commitment_block: SLT|null`; add validators for stale/missing/ineligible SLTs.

**CHC promise:** A CHC remains either exact-bound to one SLT or punts to JIT.

**Replay/fork:** Historical freeze by accident. New global SLTs are invisible unless CHC has null and JIT runs.

**Scaling:** Still poor, because candidate selection is not first-class.

**Non-player drivers:** Can be patched but remains player-choice-centric.

**Pros:** Smallest change. Keeps current validator shape.

**Cons:** Architecturally wrong. Stale by design. It confuses choice promise with content selection.

**Research support:** Weak. Storylet research favors modular future addition and recombination.

**Repository fit:** Fits existing code but contradicts the live global-pool objective.

### **Alternative B — Pure late-bound CHC intent model**

**Description:** Remove direct binding entirely. Every CHC resolves by intent signature against current lawful SLT pool.

**CHC promise:** Player intent/action family/target only.

**Replay/fork:** Excellent live-pool behavior.

**Scaling:** Requires indexed candidate retrieval.

**Non-player drivers:** Strong if driver-first.

**Pros:** Clean, maximally future-proof.

**Cons:** No way to freeze exact tutorial beats, authored set pieces, or deliberately curated candidate sets.

**Research support:** Strong for QBN/state-driven choice, but too extreme for authored narrative control.

**Repository fit:** Big break, but clean.

### **Alternative C — Hybrid CHC binding object**

**Description:** Replace scalar with:

binding:  
 mode: late_bound_intent | candidate_set | exact_slt | continuation_only  
 promise_type: intent | surface_affordance | exact_move | witness | continuation  
 intent_signature: ...  
 candidate_slt_ids: ...  
 exact_slt_id: ...  
 replay_policy: live_global_pool | frozen_exact

**CHC promise:** Explicit. CHC says what is frozen and what is late-bound.

**Replay/fork:** Late-bound and candidate-set choices see new global SLTs; exact-bound choices freeze.

**Scaling:** Requires candidate API, but binding fields support cheap prefiltering.

**Non-player drivers:** Good. Response choices can be `responds`, `witnesses`, or `chooses_continuation`.

**Pros:** Best balance of player trust, author control, replay lawfulness, and future authoring.

**Cons:** Breaking schema and validator changes.

**Research support:** Strong: storylets benefit from late modular addition; choice systems separate surface from resolved consequences.

**Repository fit:** Best fit. It preserves `SE.commitment.selected_slt_id` while replacing the bad CHC scalar.

### **Alternative D — Persistent candidate commitment record**

**Description:** Add a record such as `SSEL-<n>` for selection traces and/or candidate commitments.

**CHC promise:** CHC may point to a candidate commitment record instead of raw SLTs.

**Replay/fork:** Can record exact candidate set at emission time or resolution time.

**Scaling:** Strong for diagnostics and validation.

**Non-player drivers:** Strong; the record can store driver snapshot and filter trace.

**Pros:** Validator-readable. Excellent for replay/stale-choice proof.

**Cons:** More machinery. If used at CHC emission time for every choice, it can prematurely freeze candidates.

**Research support:** Strong from planning/action-library systems: selection needs explainable preconditions/effects and current-state provenance.

**Repository fit:** Good if used primarily as a **selection trace at resolution**, not as mandatory precomputed candidate lists on every CHC.

### **Alternative E — Pattern / instance split for storylets**

**Description:** Introduce reusable `SLTPAT` patterns and branch-local `SLT` instances.

**CHC promise:** Usually binds to pattern/intent, instance created at resolution.

**Replay/fork:** Excellent if patterns are global and instances branch-local.

**Scaling:** Potentially strong.

**Non-player drivers:** Strong.

**Pros:** Elegant for reusable global moves.

**Cons:** More invasive than needed right now. The current SLT schema can already represent many reusable patterns with existential predicates.

**Research support:** Strong from storylets and HTN/GOAP analogies, but not necessary for the immediate break.

**Repository fit:** Future option. Do not land first unless the hybrid binding + selection trace still cannot prevent generic SLT spam.

### **Alternative F — Driver-first indexed retrieval pipeline**

**Description:** Keep records mostly as-is but add a compiled retrieval API that filters by driver, scope, active records, predicates, access, and salience.

**CHC promise:** Depends on CHC schema; can be paired with A, B, or C.

**Replay/fork:** Good only if paired with live global-pool semantics.

**Scaling:** Essential.

**Non-player drivers:** Essential.

**Pros:** Must be built.

**Cons:** Not sufficient alone; it does not solve CHC promise semantics.

**Repository fit:** Excellent. Builds on world-index/MCP.

## **7. Recommended architecture**

Pick **Alternative C + D + F**:

Hybrid CHC binding object  
+ persistent SSEL selection trace  
+ driver-first indexed retrieval pipeline

Reject Alternative A. It preserves the bad scalar.

Reject pure Alternative B. It overcorrects and removes useful exact/candidate authoring modes.

Reject immediate full pattern/instance split. Keep it as a future refinement after the binding/selection/retrieval layer lands.

### **What happens to `CHC.associated_commitment_block`?**

Remove it. Do not keep it as a required field. Do not keep it as a compatibility alias.

Replacement:

binding:  
 mode: late_bound_intent  
 promise_type: intent  
 intent_signature:  
   action_families: [protect]  
   target_records: [STENT-4]  
   stance: intervene  
   required_grounding_records: [STPLAN-9]  
 replay_policy: live_global_pool

Exact binding becomes explicit:

binding:  
 mode: exact_slt  
 promise_type: exact_move  
 exact_slt_id: SLT-22  
 replay_policy: frozen_exact  
 exact_binding_reason: "Tutorial branch: authored fixed resolution."

### **Replay policy**

Use **branch-safe live global pool**.

Newer `global_author_pool` SLTs are eligible during replay/fork from an older page if they pass:

scope == global_author_pool  
no branch-local exact dependencies  
compatible_turn_drivers contains current driver  
hard predicates pass against parent PG snapshot  
alias bindings resolve against active parent records  
actor access-route passes  
mystery/canon policy passes  
cooldown/history passes

Branch-scoped SLTs are eligible only on their branch. Branch-prefix-scoped SLTs are eligible only when the current branch path contains the required prefix.

### **Non-player driver policy**

Every ordinary `turn_resolution` should resolve through an SLT. If no existing SLT passes, create a driver-specific `runtime_jit` SLT with singleton `compatible_turn_drivers`.

Do not allow driver-resolved SEs without SLT except for non-turn-resolution audit/prose/promotion events already covered by schema.

### **Large-pool policy**

The LLM should never see thousands of full storylets. It should see:

1. active state summary;  
2. compact SLT projections;  
3. filter trace counts;  
4. top 12–24 full candidate SLTs;  
5. JIT instructions only if no lawful candidate exists.

## **8. Concrete schema / contract changes**

### **8.1 `tools/validators/src/schemas/story-choice.schema.json`**

**Current shape:** Required `associated_commitment_block: SLT|null`.

**Proposed shape:** Remove `associated_commitment_block`; add required `binding`.

binding:  
 mode: late_bound_intent | candidate_set | exact_slt | continuation_only  
 promise_type: intent | surface_affordance | exact_move | witness | continuation  
 intent_signature:  
   action_families: [protect]  
   target_records: [STENT-2]  
   grounded_record_classes: [STPLAN]  
   required_grounding_records: [STPLAN-9]  
   stance: intervene  
 candidate_slt_ids: []  
 exact_slt_id: null  
 replay_policy: live_global_pool | frozen_exact  
 promise_limits:  
   outcome_promised: false  
   success_promised: false

**Breaking impact:** All existing CHCs must be repaired. This is acceptable because existing story bundles can be repaired and the old field is semantically wrong.

**Example valid:**

id: CHC-21  
story_id: STORY-76  
created_at_page: PG-2  
surface_label: "Throw yourself across Mara’s line of fire."  
player_visible_intent: "Protect Mara from the ambush without promising success."  
target_or_action_families: [protect, move]  
likely_state_pressure: "Jon reacts to Varro's shot line."  
grounded_in:  
 records: [STPLAN-9, CLK-3]  
binding:  
 mode: late_bound_intent  
 promise_type: intent  
 intent_signature:  
   action_families: [protect]  
   target_records: [STENT-2]  
   required_grounding_records: [STPLAN-9]  
   stance: intervene  
 replay_policy: live_global_pool  
 promise_limits:  
   outcome_promised: false  
   success_promised: false  
success_policy: "Attempt protection; resolve by position, timing, and opposition."

**Example invalid:**

binding:  
 mode: late_bound_intent  
 promise_type: intent  
 promise_limits:  
   outcome_promised: true

Invalid because CHC promises outcome.

### **8.2 `tools/validators/src/schemas/story-storylet.schema.json`**

**Current shape:** Minimal `grounding.compatible_turn_drivers[]` and `reason_to_exist`.

**Proposed shape:**

grounding:  
 compatible_turn_drivers: [npc_action]  
 reason_to_exist: "Lets an active hostile plan become a visible pressure event."  
 causal_pressure_classes: [STPLAN, STEMO, CLK]  
 required_active_record_classes: [STPLAN]  
 role_lanes:  
   initiator: opposing_actor  
   target: player_proxy  
   pressure_source: pressure_source  
 actor_binding_policy:  
   initiator_source: turn_driver.initiator  
   target_source: choice_intent_or_predicate  
   permits_offstage_initiator: false  
   requires_player_access_route: true  
 source_records: []

**Why each field is load-bearing:**

* `causal_pressure_classes`: generator coverage, MCP filter, validator checks driver relevance.  
* `required_active_record_classes`: cheap prefilter and validator check.  
* `role_lanes`: generation diversity and actor binding.  
* `actor_binding_policy`: observer firewall and non-player driver access.  
* `source_records`: branch/runtime provenance and global-pool branch-leak validation.

Do **not** add `stchar_axes` yet. It is attractive but premature unless a concrete STCHAR axis projection consumer lands. Keep STCHAR authority in STCHAR and page-plan §16a.

### **8.3 `tools/validators/src/schemas/story-event.schema.json`**

Keep `SE.commitment.selected_slt_id`, `selection_source`, and `alias_bindings`. Add:

commitment:  
 selected_slt_id: SLT-...  
 selection_source: emitted_choice | player_write_in | npc_initiative | ...  
 source_choice_id: CHC-... | null  
 selection_trace_id: SSEL-...  
 alias_bindings: {}

Current `SE.commitment` already records selected SLT and aliases; adding source choice and trace closes replay diagnostics without changing SE’s core role.

### **8.4 New `story-selection-trace.schema.json`**

New record class: `SSEL`.

id: SSEL-1  
story_id: STORY-76  
parent_page_id: PG-2  
resolving_event_id: SE-3  
source_choice_id: CHC-21  
action_source_mode: resolve_selected_choice  
turn_driver:  
 kind: player_action  
 initiator: player  
 driver_records: []  
binding_snapshot:  
 mode: late_bound_intent  
 promise_type: intent  
 action_families: [protect]  
filter_trace:  
 pool_total: 1248  
 after_scope: 913  
 after_driver: 211  
 after_binding_intent: 38  
 after_predicate_shape: 21  
 after_predicate_eval: 8  
 after_access_route: 6  
 after_mystery_policy: 6  
 shortlisted: [SLT-91, SLT-204, SLT-314]  
selected_slt_id: SLT-204  
selection_reason: "Only shortlisted SLT that matched protection intent and Varro ambush pressure without resolving forbidden mystery."  
alias_bindings: {}

### **8.5 `story-page.schema.json`**

Add no new required field yet. `PG.input.choice_id` can remain as page-level input, but SE must carry `source_choice_id` for event-local trace closure. Current page schema already carries active record snapshots and input fields.

### **8.6 Shared contracts**

Update `.claude/skills/_shared-templates/story-state-contract.md`:

* §6 Action Routing: distinguish player initiation from response/witness/continuation.  
* §7 hard gate 7: selected SLT and CHC binding trace must pass.  
* §9 Branching and Rewind: explicitly state branch-safe live global pool.  
* §5 Predicate DSL: preserve existential alias binding, but name compiled predicate projection as required retrieval behavior.

### **8.7 Player Agency Contract in `STORY_KERNEL.md`**

Require these roles:

player_agency_modes:  
 initiator: ...  
 responder: ...  
 witness: ...  
 continuation_confirmer: ...  
 constrained_write_in_author: ...  
non_player_initiative_policy:  
 allowed: true  
 response_choices_required_when_player_visible: true  
 outcome_promises_forbidden: true

## **9. Skill changes**

### **9.1 `branching-story-bootstrap`**

Bootstrap currently seeds optional SLTs, but one live line still says seeded SLTs do not populate a “future” compatible-driver field even though `grounding.compatible_turn_drivers` is now required.

Required changes:

* Seed SLTs with rich grounding.  
* Generate initial CHCs with `binding`, not `associated_commitment_block`.  
* Add Player Agency Contract modes.  
* Seed global SLTs as role-parametric patterns, not exact cast-bound blocks.

### **9.2 `branching-story-turn-cycle`**

Required changes:

* Phase 0 becomes authoritative due-driver selection.  
* Phase 2.1 calls candidate projection API, not whole-pool loading.  
* Phase 2–3 writes `SSEL`.  
* Phase 8 emits CHCs with binding modes and response roles.  
* Red Kiln-style non-player drivers must create schema-valid CHCs.

### **9.3 `commitment-block-authoring`**

Current direct-batch mode reads current SLT pool through `list_records(... include_full_body=true)`, which will not scale.

Required changes:

* Audit projections first.  
* Diagnose coverage by driver-kind × pressure-source × role-lane × action-family.  
* Generate rich grounding.  
* Refuse generic global SLTs with no pressure/source/role lane.  
* Create runtime JIT only after indexed filter failure.

### **9.4 `branching-story-health-audit`**

Health audit already has replay, branch isolation, active-state underuse, and reactivity inertness surfaces.

Add:

* stale binding audit;  
* selection trace integrity audit;  
* live global-pool replay audit;  
* branch-scoped leakage audit;  
* non-player response-quality audit;  
* large-pool projection health.

### **9.5 `branching-story-prose-attach`**

Prose attach already validates player agency contract and response visibility.

Add:

* verify non-player pages render driver consequence without hidden mind leak;  
* check response CHCs are not outcome-promised in prose;  
* check secret/clock/offstage driver visibility rules.

### **9.6 `story-character-profile`**

Do not put current-state or current plans into STCHAR. The skill’s durable-authority boundary is correct.

Add only optional stable role-lane hints if they are durable. Do not add transient `driver_kind` or `current_pressure` to STCHAR.

## **10. MCP / index / retrieval changes**

### **10.1 New projection: `storylet_candidate_projection`**

For every SLT, index:

id  
story_id  
scope.visibility  
scope.branch_id  
scope.visible_branch_path_prefix  
created_at_page  
provenance.origin  
move_family  
exit_action_families  
saliency.urgency  
saliency.cooldown_pages  
mystery_policy.allowed_authority  
grounding.compatible_turn_drivers  
grounding.causal_pressure_classes  
grounding.required_active_record_classes  
grounding.role_lanes  
grounding.actor_binding_policy  
predicate_opcodes  
predicate_record_refs  
predicate_record_classes  
predicate_existential_classes  
effect_record_refs  
exit_likely_effect_refs  
source_records

### **10.2 New MCP tool: `select_storylet_candidates`**

Inputs:

world_slug  
story_slug  
parent_page_id  
turn_driver  
choice_binding | write_in_intent | null  
max_candidates  
include_rejection_summary: true

Outputs:

candidate_projection_hash  
filter_trace  
shortlisted_candidate_ids  
shortlisted_projection_records  
requires_full_body_ids

The tool does **not** choose prose. It filters legality and ranks candidates.

### **10.3 Filtering pipeline**

1. story scope filter  
2. branch visibility filter  
3. driver-kind filter  
4. binding/action-family/response-family filter  
5. active-record-class filter  
6. predicate-shape / exact-ref / existential-class filter  
7. symbolic predicate evaluation against parent PG snapshot  
8. alias binding  
9. actor access-route / observer firewall filter  
10. mystery/canon authority filter  
11. cooldown/recent-use filter  
12. salience and diversity ranking  
13. fetch full bodies for top N only  
14. LLM narrative-fit pick or driver-specific JIT

### **10.4 Embeddings**

Do not use embeddings for legality. At most, use embedding search after hard symbolic gates over compact candidate summaries to diversify top-N narrative fit. Symbolic indexes dominate.

## **11. Validator changes**

### **11.1 `chc_binding_schema_compliance`**

**Severity:** fail  
 **Mode:** schema/structural  
 **Inputs:** CHC records  
 **Failure codes:**

* `chc_binding_missing`  
* `chc_binding_mode_invalid`  
* `chc_exact_binding_missing_slt`  
* `chc_binding_outcome_promise_forbidden`

**Diagnostic:**  
 `CHC-21 binding.mode=late_bound_intent must not set promise_limits.outcome_promised=true; choices promise intent/affordance, not outcome.`

### **11.2 `choice_binding_resolution_trace_integrity`**

**Severity:** fail  
 **Inputs:** CHC, SE, SSEL, selected SLT  
 **Codes:**

* `selection_trace_missing`  
* `selection_trace_source_choice_mismatch`  
* `selected_slt_not_in_shortlist`  
* `binding_intent_not_satisfied`

### **11.3 `live_global_pool_replay_lawfulness`**

**Severity:** fail  
 **Inputs:** parent PG, SLT projections, SSEL  
 **Codes:**

* `global_slt_excluded_by_author_date`  
* `branch_scoped_slt_leaked`  
* `branch_prefix_slt_prefix_mismatch`  
* `global_slt_branch_local_dependency`

### **11.4 `slt_grounding_rich_integrity`**

**Severity:** fail  
 **Inputs:** SLT  
 **Codes:**

* `slt_grounding_pressure_class_missing`  
* `slt_grounding_required_class_not_in_predicates`  
* `slt_role_lane_invalid`  
* `slt_source_record_branch_leak`  
* `runtime_jit_multi_driver_forbidden`

### **11.5 `driver_actor_access_route_integrity`**

**Severity:** fail  
 **Inputs:** SE.turn_driver, STPLAN/STEMO/BEL/STCHAR/CLK/STSEC/STQ  
 **Codes:**

* `npc_driver_plan_holder_mismatch`  
* `driver_belief_access_missing`  
* `secret_reveal_access_route_missing`  
* `offstage_driver_direct_perception_forbidden`

### **11.6 `non_player_response_choice_quality`**

**Severity:** fail for structural, warn for quality  
 **Inputs:** non-player SE, created CHCs  
 **Codes:**

* `non_player_driver_no_response_choice`  
* `response_choice_not_grounded_in_driver`  
* `witness_choice_promises_control`  
* `continuation_choice_not_distinct`

This should replace the current schema-drifting use of `player_response_mode` until that field is formally added to CHC or binding.

### **11.7 `stq_due_pressure_schema_parity`**

**Severity:** fail  
 **Inputs:** STQ schema + active-pressure validator  
 **Codes:**

* `active_pressure_references_unknown_stq_field`

This catches the current `payoff_due` mismatch.

### **11.8 `large_pool_selection_trace_integrity`**

**Severity:** fail  
 **Inputs:** SSEL filter trace  
 **Codes:**

* `selection_trace_loaded_full_pool`  
* `filter_trace_count_inconsistent`  
* `candidate_projection_hash_missing`  
* `shortlist_exceeds_configured_limit`

### **11.9 Warning / health-audit validators**

* `storylet_generic_grounding_warning`  
* `driver_pressure_role_coverage_gap`  
* `choice_pair_intent_distance_warning`  
* `choice_surface_outcome_language_warning`  
* `candidate_diversity_starvation`

### **11.10 Must never be hard-validated**

Do not hard-validate literary beauty, surprise, exact pacing, “dramatic tension,” fixed act structure, or the player always initiating action.

## **12. Choice semantics and quality model**

### **12.1 CHC as intent promise vs surface promise**

Preferred model: **hybrid**.

A CHC may promise:

* **intent:** “protect Mara”;  
* **surface affordance:** “grab the lantern”;  
* **witness stance:** “watch from cover”;  
* **continuation confirmation:** “let Varro continue talking”;  
* **exact move:** rare, explicit, frozen.

A CHC must not promise:

* success;  
* exact outcome;  
* mystery resolution;  
* canon truth;  
* an SLT unless `binding.mode=exact_slt`.

### **12.2 Deterministic choice-quality axes**

Hard or warning checks can evaluate:

distinct action/intent family  
distinct target or stance  
grounded in active records  
does not rely on hidden info  
does not promise outcome  
lawful player role for current driver  
has binding mode  
has replay policy  
materially responds to non-player driver when required

### **12.3 Judgment-assisted choice review**

Human/LLM review should assess:

does the menu feel like real agency?  
are choices emotionally and tactically different?  
are response choices too checklist-like?  
does the wording preserve the fictive dream?

Do not turn those into schema law.

## **13. Driver-aware SLT selection model**

### **13.1 Player driver**

For `player_action` / `player_write_in`, binding intent dominates candidate filtering. The selected SLT realizes the player’s attempted action under world constraints.

### **13.2 NPC driver**

For `npc_action`, the selected SLT represents the NPC’s committed move. It should be grounded in the initiator’s active `STPLAN`, `STEMO`, `BEL`, `STCHAR`, relationship state, access route, and available resources.

### **13.3 Offstage driver**

For `offstage_action`, the selected SLT is an offstage causal packet. It should produce player-visible consequence through trace/report/discovery, not hidden interiority.

### **13.4 World pressure**

For `world_pressure`, the selected SLT is an environmental/social/systemic pressure event grounded in active clocks, threads, consequences, obligations, or world-state records.

### **13.5 Clock fire**

For `clock_fire`, the clock threshold is the trigger; the selected SLT is the threshold consequence packet. The `CLK` record owns threshold data; the SLT owns realization into event/choices.

### **13.6 Secret reveal**

For `secret_reveal`, `STSEC` owns hidden content and authority; the selected SLT owns reveal mechanism and player-facing reaction surface. Observer firewall is strict.

### **13.7 Multi-actor collision**

For `multi_actor_collision`, select a local collision SLT that composes multiple driver records. It is not a global drama-manager beat. It is a causal resolution of simultaneous local pressures.

### **13.8 Repair/audit cases**

Repair turns may use `system_repair` or `audit_repair` event kinds where schema allows no ordinary turn driver. Do not use repair exceptions to bypass storylet trace closure for normal turn resolution.

## **14. Storylet generation / pool diversity model**

### **14.1 Bootstrap seed policy**

Create broad, role-parametric global SLTs:

driver_kind × pressure_source_class × role_lane × action_family

Use existential predicates. Avoid exact branch-local IDs.

### **14.2 Direct batch policy**

Diagnose gaps by matrix:

driver kind  
move family  
response/action family  
pressure source class  
actor role lane  
onstage/offstage  
mystery/canon authority  
aftermath/recovery/de-escalation

### **14.3 Audit repair policy**

If a branch has a specific missing causal move, create branch-scoped or branch-prefix-scoped SLT with exact predicates.

### **14.4 Runtime JIT policy**

JIT only after indexed filtering finds no lawful candidate. Runtime JIT must:

* have singleton compatible driver;  
* cite source records;  
* avoid generic reason phrases;  
* carry rich grounding;  
* be branch-scoped unless proven global-safe.

### **14.5 Pattern vs instance**

Do not introduce separate pattern records yet. First make SLTs richly grounded and selection traces persistent. Revisit pattern/instance split when global pool size or duplication proves it necessary.

## **15. Replay / fork semantics**

### **15.1 Newer global SLTs**

Eligible on replay/fork if legal. Author date is not a legality criterion.

### **15.2 Branch-scoped SLTs**

Eligible only on the same branch. Never leak to siblings.

### **15.3 Branch-prefix-scoped SLTs**

Eligible only if the current branch path contains the declared prefix.

### **15.4 Exact/frozen choices**

Only `binding.mode=exact_slt` freezes. If the exact SLT is stale or ineligible, fail with a stale exact binding diagnostic. Do not reinterpret silently.

### **15.5 Late-bound choices**

Late-bound choices use the live global pool plus branch-lawful scoped pool.

### **15.6 Historical reproducibility**

Historical reproducibility comes from `SSEL` selection traces, not from freezing old pages to old global pools by default.

## **16. Implementation order**

### **SPEC-79 — CHC binding object**

Acceptance:

* `associated_commitment_block` removed.  
* `binding` required.  
* CHC tests cover late-bound, candidate-set, exact-bound, witness/continuation.  
* Old scalar records fail clearly.

### **SPEC-80 — Rich SLT grounding**

Acceptance:

* Schema adds load-bearing fields.  
* Validator enforces pressure classes, active classes, role lanes, source records.  
* Runtime JIT singleton driver still enforced.

### **SPEC-81 — Selection trace record**

Acceptance:

* New `SSEL` schema.  
* SE commitment carries `source_choice_id` and `selection_trace_id`.  
* Validator proves selected SLT was in shortlist and binding was satisfied.

### **SPEC-82 — Indexed candidate retrieval**

Acceptance:

* world-index emits SLT projection fields/edges.  
* MCP exposes `select_storylet_candidates`.  
* Synthetic 1000-SLT fixture proves full bodies are not loaded before shortlist.

### **SPEC-83 — Replay/fork live global pool**

Acceptance:

* Older page replay sees newer legal global SLT.  
* Branch-scoped leakage fails.  
* Exact-bound stale SLT fails.

### **SPEC-84 — Non-player driver semantics**

Acceptance:

* NPC/offstage/clock/secret/multi-actor fixtures pass.  
* Response CHCs are schema-valid.  
* Hidden mind leaks fail.

### **SPEC-85 — Storylet generation matrix**

Acceptance:

* commitment-block-authoring diagnoses driver × pressure × role gaps.  
* generic global SLTs fail/warn.  
* audit repair produces scoped SLTs.

### **SPEC-86 — Schema drift repairs**

Acceptance:

* Red Kiln CHCs conform to current CHC schema or schema formally gains response-mode field.  
* STQ due/payoff logic uses schema-backed fields only.

## **17. Golden fixtures / tests**

### **17.1 Replay stale-global fixture**

Parent `PG-4` has a late-bound CHC emitted before `SLT-200` was authored. Replay from `PG-4` selects `SLT-200` because it is global, driver-compatible, predicate-true, and access-lawful.

Negative variant: `SLT-201` references branch-local `STPLAN-99`; global-pool branch leak fails.

### **17.2 Exact stale binding fixture**

CHC uses `binding.mode=exact_slt` with `SLT-22`. Replay finds `SLT-22` predicate false. Validator emits stale exact binding fail. It does not silently select another SLT.

### **17.3 NPC driver fixture**

Active `STPLAN` and `STEMO` for Varro drive `npc_action`. Candidate selection must prefer SLTs whose grounding pressure classes include `STPLAN`/`STEMO` and role lanes include `opposing_actor -> player_proxy`.

### **17.4 Offstage driver fixture**

Offstage courier burns a letter. Player learns through smoke, missing document, or witness report. Direct interiority fails.

### **17.5 Clock fire fixture**

`CLK-3` crosses threshold. Selected SLT realizes threshold consequence and response CHCs.

### **17.6 Secret reveal fixture**

`STSEC` reveal creates/accesses `BEL` or `DA` through valid carrier. Observer-firewall negative case fails.

### **17.7 Multi-actor collision fixture**

Two active plans collide locally. Selection trace shows both pressure records, local collision storylet, and no global drama-manager target.

### **17.8 Large synthetic pool fixture**

1000 SLTs, only 7 legal after filters. Test asserts no full-body loading before shortlist.

### **17.9 Generic storylet fixture**

SLT with reason “raise the stakes” fails grounding validator. Existing banned phrase list already supports this direction.

### **17.10 Choice quality fixture**

Two choices share action family but differ target, stance, and binding intent. Pass. Three choices differ only wording. Fail or warn beyond current noncollapse.

## **18. Non-goals**

Reject:

* outcome-promising CHCs;  
* global drama manager / target narrative shape planner;  
* turning STCHAR into current state;  
* making NPCs omniscient;  
* hard-validating literary quality;  
* loading thousands of full storylets into LLM context;  
* generic storylet generation without driver/pressure/cast grounding;  
* backwards-compatibility shims for `associated_commitment_block`;  
* embeddings as legality filters;  
* silent reinterpretation of stale exact-bound choices.

## **19. Open questions**

1. Should the selection trace record be named `SSEL`, `SLTSEL`, or another ID class? The proposal uses `SSEL` for brevity, but the final name should match Worldloom’s allocator conventions.  
2. Should `player_response_mode` live directly on CHC or inside `CHC.binding.promise_type`? The current Red Kiln fixture assumes a direct CHC field, while the schema does not. My recommendation is to encode it through binding promise type unless multiple consumers genuinely need a top-level field.  
3. Should `source_records` be required for all SLTs or only runtime/audit/branch-scoped SLTs? I recommend required for runtime/audit/branch-scoped and optional for global patterns, but this should be tested against bootstrap authoring burden.  
4. Should pattern/instance split be introduced after SPEC-85? It is probably useful later, but not before the binding and indexed candidate pipeline proves its limits.

## Outcome

Archived on 2026-05-25 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
