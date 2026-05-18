# **Worldloom story-system ontology consolidation proposal**

## **1. Executive verdict**

**Verdict: the current story ontology is mostly sound, but moderately flawed at the ownership, lifecycle, provenance, and validation layers.** It does **not** need a wholesale conceptual replacement. It already has the right broad family of present-causal story structures: branch-local truth, beliefs, events, entity state, obligations, consequences, threads, clocks, secrets, story questions, relationships, locations, objects, artifacts, branches, pages, choices, and commitment blocks.

The problem is sharper and more dangerous than “missing vocabulary”: several machine-critical invariants are currently represented in the wrong place, or accepted too leniently.

The highest-risk issues are:

1. **Creation/introduction proof is stringly typed.** `intro:<CLASS>(...)` tags inside `SE.world_logic_rationale` are machine-critical, but stored as parseable prose. That is the wrong owner and the wrong representation.  
2. **Introduction proof only covers a subset of records.** Current mid-story proof focuses on `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, and `SREL`. Any created active state record should explain why it became branch-real.  
3. **Lifecycle operations mutate records in place.** Patch-engine ops such as `tick_pressure_clock`, `resolve_pressure_clock`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`, `answer_story_question`, and `abandon_story_question` load existing records, edit fields, and restage the same file. That conflicts with the append-only / supersession discipline in the story-state contract.  
4. **Compatibility/grandfathering paths undermine strict validation.** `compatibility_drift`, optional active-record key normalization, legacy snapshot replay, and “grandfathered snapshot” language allow old shapes to continue as if they are acceptable.  
5. **There is a schema/tooling mismatch.** The current `story-event.schema.json` `state_delta` id pattern omits `STSTAT`, `CLK`, `STSEC`, and `STQ`, even though skills and validators already require those records to participate in state deltas.  
6. **World-index/MCP support is shallower than the ontology.** Newer structures are indexed and summarized, but provenance, creation evidence, clue carriers, clock links, question answers, and page affordances are not first-class index edges.

**Major implementation churn is justified.** The churn should not be a new drama manager, act structure, or global plot-shape model. It should be a hardening/consolidation pass: structured provenance, strict snapshots, supersession-only lifecycle, stronger deterministic validators, and fuller MCP/index support.

The north-star recommendation is:

Keep the current first-class story ontology. Consolidate ownership. Replace string tags with structured `SE` provenance. Remove silent compatibility. Enforce supersession. Make every provable story-state transition deterministic.

---

## **2. Research synthesis filtered through `FOUNDATIONS.md`**

### **Event sourcing: adopt the append-only event/state discipline**

Event sourcing captures every state change as a sequence of events, and the event log can be used to reconstruct past states, perform temporal queries, and replay changes. Fowler’s description is directly aligned with Worldloom’s `SE` + `PG.state_snapshot` model: `SE` should be the authoritative causal tick, while `PG` is a replayable snapshot.

**Adopt:** use `SE` as the event/provenance owner; keep `PG.state_snapshot` as derived replay surface; make state changes append-only.

**Reject:** in-place mutation lifecycle ops. They erase the event log’s value.

**Worldloom implication:** lifecycle transitions for clocks, secrets, and questions should create superseding records, not mutate old records.

### **W3C PROV: adopt structured provenance, not parseable prose**

PROV defines provenance as information about entities, activities, and people involved in producing a thing, and explicitly supports identifying objects, attribution, processing steps, reproducibility, versioning, procedures, derivation, and validation constraints.

**Adopt:** `SE` should contain structured creation provenance because an `SE` is the “activity” that generates new story-state records.

**Adapt:** Worldloom does not need full PROV-O/RDF. It needs a domain-specific compact schema: record id, class, trigger, evidence, access route, distinctness, and branch lineage.

**Reject:** a separate active “provenance record” class. Provenance is not story state that should influence choices by itself; it is event metadata and indexable edge data.

### **Narrative planning / IPOCL: adopt intentionality, reject fixed goal-state planning**

Narrative-planning research emphasizes logical causal progression and character believability; IPOCL specifically models character intentionality by explaining why characters commit to goals.

**Adopt:** keep `STINT`, `BEL`, `STSTAT`, `SREL`, and `SLT` strongly connected. Actions should be grounded in beliefs, intentions, relationships, status, and available affordances.

**Adapt:** a future `STPLAN` may be useful if intentions remain too thin, but it should represent present plans, blockers, resources, and next intended moves, not an authorial future plot.

**Reject:** global search for an “optimal story,” predetermined endings, or act/climax machinery.

### **Storylets: keep commitment blocks as causal moves**

Recent storylet work frames storylets as structures that support responsive, open-ended interactive stories while preserving authorial control.

**Adopt:** Worldloom’s `SLT` model is basically right: preconditioned, reusable causal moves.

**Adapt:** Worldloom should not use natural-language trigger matching for validation. Keep deterministic predicate DSL and exact record references.

**Reject:** turning `SLT` into plot rails, arcs, scenes, or fixed narrative beats beyond local execution.

### **Branching authoring / possibility-space research: improve branch visibility, not convergence rails**

Interactive narrative authoring research increasingly focuses on helping authors understand divergent possibility spaces and control them without suppressing player variation.

**Adopt:** better MCP context about active debts, clocks, secrets, questions, branch state, and provenance.

**Future/adapt:** a branch convergence contract may be useful later, but it should validate compatibility of present branch state, not force a designed bottleneck.

**Reject:** branch-and-bottleneck rails as a default architecture.

### **Clue-based mystery design: keep `STSEC.clue_carriers`, do not add `STCLUE` yet**

GUMSHOE’s design premise is that investigative play should not stall on whether players find essential clues; the interesting work is interpreting clues.

**Adopt:** story-local secrets need explicit clue carriers, discovery state, and reveal evidence.

**Worldloom already has this:** `STSEC.clue_carriers` is embedded and schema-backed. That is enough for now.

**Reject for this pass:** a separate first-class `STCLUE` record. It would add churn without clear ownership unless clues need independent lifecycle across multiple secrets.

### **Clocks/fronts: keep `CLK` distinct from `THR`**

Progress-clock and front-style designs are useful because they make offscreen pressure visible, staged, and consequence-bearing. The useful part for Worldloom is not “GM plot agenda”; it is deterministic pressure state that can tick, cross thresholds, and fire consequences.

**Adopt:** `CLK` remains first-class and distinct from `THR`.

**Adapt:** use `CLK` for quantitative/staged pressure; use `THR` for named ongoing concern; link them when a thread has a pressure clock.

**Reject:** grim-portent scripts that secretly steer toward a predetermined doom.

### **Knowledge graphs / provenance graphs: strengthen index edges**

Graph-assisted storytelling research supports the value of explicit structured representations for coherence and user control. Causal graph work also supports structured causal chains over pure LLM text when coherence matters.

**Adopt:** world-index should extract edges from state deltas, provenance evidence, clue carriers, clock links, question payoffs, choice grounding, and page affordances.

**Reject:** keyword similarity or LLM-judgment validators pretending to prove graph relations.

---

## **3. Current architecture map**

Repository evidence below is from current non-archived paths only.

### **Foundations and contract**

`docs/FOUNDATIONS.md` establishes the key distinction: world canon is durable world-level truth; story bundles are branch-local, counterfactual/provisional/present-causal state under `worlds/<slug>/stories/<story-slug>/_source/...`. Story skills read canon through MCP, write story state through patch plans, and treat prose as rendering rather than hidden state.

`.claude/skills/_shared-templates/story-state-contract.md` is the real story-system constitution. It defines:

* world canon authority;  
* story-state authority;  
* rendered prose non-authority;  
* page-plan and page-snapshot discipline;  
* schema minimalism;  
* append-only / supersession doctrine;  
* branch isolation;  
* state replay;  
* observer firewall;  
* mid-story introduction tags;  
* action routing;  
* story hard gates.

`.claude/skills/_shared-templates/story-record-schemas.md` defines the record inventory and field semantics for the current ontology.

### **Current record classes**

Current first-class story classes in the contract and schemas:

`STENT`, `STSTAT`, `STINT`, `SF`, `BEL`, `SE`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, `SREL`, `STLOC`, `STOBJ`, story-local `DA`, `BR`, `PG`, `CHC`, and `SLT`.

World-index maps story bundle directories in `tools/world-index/src/parse/atomic.ts`:

* `entities` → `story_entity_record`  
* `status` → `story_status_record`  
* `beliefs` → `belief_record`  
* `facts` → `story_fact_record`  
* `events` → `story_event_record`  
* `obligations` → `obligation_record`  
* `consequences` → `consequence_record`  
* `threads` → `thread_record`  
* `relationships` → `relationship_record_story`  
* `intentions` → `intention_record`  
* `locations` → `story_location_record`  
* `objects` → `story_object_record`  
* `branches` → `branch_record`  
* `pages` → `page_record`  
* `choices` → `choice_record`  
* `storylets` → `storylet_record`  
* `clocks` → `pressure_clock_record`  
* `secrets` → `story_secret_record`  
* `story-questions` → `story_question_record`  
* `artifacts` → `story_diegetic_artifact_record`

### **Current lifecycle/update model**

The intended model is append-only: committed story records should not be edited; changes should create new records with `supersedes`, and `SE.state_delta` should create/supersede/close ids.

The implementation partially violates that:

* `tools/patch-engine/src/ops/tick-pressure-clock.ts` mutates existing `CLK.value` and `tick_history`.  
* `resolve-pressure-clock.ts` mutates `CLK.status` and `resolution_event`.  
* `append-secret-clue-carrier.ts` appends to existing `STSEC.clue_carriers`.  
* `mark-secret-clue-discovered.ts` mutates an embedded clue carrier.  
* `reveal-story-secret.ts` mutates `STSEC.status`, `reveal_event`, and `reveal_records`.  
* `answer-story-question.ts` mutates `STQ.status`, `answer_event`, and `answer_records`.  
* `abandon-story-question.ts` mutates `STQ.status` and abandonment rationale.

That is the strongest implementation-level contradiction in the current system.

### **Current validation model**

Validators are strong but uneven.

Already strong:

* schema compliance;  
* snapshot replay equality;  
* branch isolation;  
* observer firewall;  
* choice integrity;  
* storylet predicate DSL parsability;  
* mid-story introduction grounding for selected classes;  
* entity introduction/status pairing;  
* relationship grounding;  
* clock threshold/value/tick checks;  
* narrative-shape field rejection.

Weak or contradictory:

* `compatibility_drift` classifies missing optional dirs/keys as compatible/grandfathered rather than invalid.  
* `_helpers/state-snapshot-replay.ts` treats `DA`, `CLK`, `STSEC`, and `STQ` active-record keys as optional.  
* `snapshot-replay-equality.ts` normalizes missing optional active-record keys and still contains an old `applied_event_ops` / `SE.ops` replay route.  
* `midstory-record-introduction-grounding.ts` has a legacy compatibility bypass for pages missing new active-record arrays.  
* `story-event.schema.json` `state_delta` patterns omit several current classes.

### **Current MCP / patch-engine model**

Patch-engine:

* create ops exist for story records;  
* supersede ops exist for `CLK`, `STSEC`, and `STQ`;  
* lifecycle mutation ops also exist and should be removed or replaced.

MCP:

* `tools/world-mcp/src/tools/describe-envelope-schema.ts` exposes patch operation schemas directly from patch-engine operation kinds.  
* `tools/world-mcp/src/context-packet/story-bundle-context.ts` summarizes active obligations, threads, clocks, hidden secrets, open story questions, recent branch pages, mysteries, and cast.  
* `tools/world-mcp/src/context-packet/shared.ts` defines story-bundle context types and summary ids.

Gap: MCP context summarizes current story structures, but it does not expose structured provenance or enough indexed edges to let skills retrieve “why did this become real?” without reading whole records.

### **Current mid-story introduction model**

Current model:

* mid-story intro proof is parseable text in `SE.world_logic_rationale`;  
* syntax resembles `intro:<CLASS>(id=..., trigger=..., evidence=[...], distinct_from=[...])`;  
* classes are limited to `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `SREL`;  
* validators parse those tags and check state-delta/create evidence.

This was a good tactical patch. It should now be replaced.

### **Current backwards compatibility / normalization paths**

The current non-archived compatibility paths to remove or hard-fail are:

* `tools/validators/src/structural/compatibility-drift.ts`  
* `tools/validators/src/_helpers/state-snapshot-replay.ts` optional key normalization  
* `tools/validators/src/structural/snapshot-replay-equality.ts` legacy page/event replay branch  
* `tools/validators/src/structural/midstory-record-introduction-grounding.ts` legacy compatibility page bypass  
* health-audit compatibility language in `.claude/skills/branching-story-health-audit/SKILL.md`  
* shared-template compatibility classifications in `story-record-schemas.md`

### **Current embedded concepts**

Important embedded concepts:

* `PG.state_snapshot.visible_affordances`  
* `PG.state_snapshot.active_records`  
* `PG.state_snapshot.unresolved_mystery_claims`  
* `PG.validation_trace`  
* `SE.state_delta`  
* `SE.world_logic_rationale`  
* parseable intro/non-propagation tags  
* `CLK.thresholds`  
* `CLK.tick_history`  
* `STSEC.clue_carriers`  
* `CHC.grounded_in`  
* `SLT.effects`  
* `SLT.exit_options`

Most should stay embedded. The bad embedded concept is not “affordance”; it is **machine-critical provenance hidden in prose**.

---

## **4. Concept inventory and verdict table**

| Concept | Current purpose / owner | Distinct? | Main risk | Validation / MCP today | Recommendation | Impact |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `STENT` | Story entity identity or canon mirror | Yes | Temptation to carry status/knowledge | Same-event `STSTAT` validator exists | **Keep / sharpen** | Require structured creation provenance for all new `STENT` |
| `STSTAT` | Life, agency, location for entity | Yes | Lifecycle mutation temptation | Snapshot derives `entity_status` | **Keep / sharpen** | All status changes become superseding `STSTAT` |
| `STINT` | Present intention/goal | Yes, but thin | May be overloaded into plans | Predicate support | **Keep; future `STPLAN` only if needed** | Add provenance; do not add plan fields now |
| `SF` | Objective branch-local truth | Yes | Becoming canon silently; prose-as-state | Schema + promotion checks | **Keep / sharpen** | Creation proof required; canon claims route through promotion |
| `BEL` | Epistemic state: belief, rumor, lie, memory | Yes | Used as objective relation/fact | Observer firewall support | **Keep / sharpen** | Enforce no objective `SREL`/`SF` from BEL-only evidence unless justified |
| `SE` | Causal event / state transition | Yes | Provenance stored as prose; schema mismatch | State replay and event schemas | **Sharpen heavily** | Add structured `record_introductions` and `propagation_exceptions` |
| `OBL` | Duty/debt owed by/to someone | Yes | Overlaps with `STQ` promise/debt | Context packet includes open obligations | **Keep** | Lifecycle by supersession |
| `CNSQ` | Pending or realized consequence | Yes | Overlaps with `OBL` if vague | Some state validation | **Keep / sharpen** | Use for fallout, not owed duty or story promise |
| `THR` | Ongoing named story concern | Yes | Used as threat clock or story question | Context includes active threads | **Keep / sharpen** | Keep qualitative; link to `CLK`/`STQ` where applicable |
| `CLK` | Quantified/staged pressure | Yes | In-place tick/resolve mutation | Clock validators + MCP summary | **Keep; lifecycle supersede** | Remove tick/resolve mutation ops |
| `STSEC` | Hidden truth/revelation state | Yes | Embedded clue lifecycle mutation | Secret validators + MCP summary | **Keep; sharpen clue rules** | Supersede on clue/reveal changes; no `STCLUE` now |
| `STQ` | Setup/question/promise/payoff | Yes | Could drift into arc planning | Question validators + MCP summary | **Keep / sharpen** | Supersede on answer/abandon/payoff |
| `SREL` | Objective relationship | Yes | Duplicate active axes; BEL/SREL confusion | Duplicate currently warn-level | **Keep; make stricter** | Duplicate active same participants+axis+direction should fail |
| `STLOC` | Story-local location | Yes | Being used as affordance holder only | Basic indexing | **Keep** | Provenance + affordance grounding validation |
| `STOBJ` | Story-local object | Yes | Overlap with `DA` | Basic indexing | **Keep** | Object is material/access surface; DA is authored info artifact |
| `DA` | Diegetic artifact with content/circulation/truth relation | Yes | Claims become truth implicitly; propagation tags stringly | DA rules in skills | **Keep / sharpen** | Structured propagation exceptions; provenance |
| `BR` | Branch metadata | Yes | Branch convergence under-modeled | Index edges for leaf/parent | **Keep** | No new convergence record yet |
| `PG` | Page/fork-state snapshot | Yes | Compatibility normalization; active_records not strict | Snapshot replay | **Keep / strict** | Exact active-record shape; no legacy replay |
| `CHC` | Page-emitted choice surface | Yes | Becoming durable debt object | Choice validators | **Keep as transient input surface** | Strengthen grounding/access validation |
| `SLT` | Commitment block / storylet causal move | Yes | Turning into act/arc/rail | Predicate parsability | **Keep / sharpen** | Effects remain planned templates; actual state lives in `SE` |
| Page affordances | Embedded `PG.state_snapshot.visible_affordances` | Yes, but page-local | Candidate over-extraction | Schema only, partial validation | **Keep embedded; extract schema component** | Add deterministic validators and index edges |
| Active record snapshots | Embedded `PG.state_snapshot.active_records` | Yes | Optional/normalized keys | Replay validator normalizes old shapes | **Keep; strict exact shape** | Require every class key, arrays unique, no unknown keys |
| State deltas | Embedded `SE.state_delta` | Yes | Schema omits current classes | Replay uses it | **Keep; fix schema** | Add all active classes; validate ids and class semantics |
| Introduction/provenance tags | Parseable text in `SE.world_logic_rationale` | Concept yes, representation no | Stringly machine data | Validators parse strings | **Replace** | Structured `SE.record_introductions[]` |
| Mystery claims | Embedded page snapshot projection | Yes | Could become hidden state | Replay support | **Keep embedded** | Validate evidence ids; do not make active record |
| Validation traces | Embedded `PG.validation_trace` | Diagnostic | Mistaken for state | Mostly skill-produced | **Keep diagnostic only** | Must not affect state replay |
| Clue carriers | Embedded `STSEC.clue_carriers` | Yes | Mutation in place; `STCLUE` temptation | Secret schema/summary | **Keep embedded** | Supersede STSEC for clue lifecycle |
| Clock thresholds | Embedded `CLK.thresholds` | Yes | Threshold effects vague | Clock validators | **Keep embedded** | Validate order, firing, effects via `SE` |
| Choice grounding | Embedded `CHC.grounded_in` | Yes | Grounding unavailable to actor | Observer firewall | **Keep / stricter** | Validate active records and affordance ordinals |
| Storylet effects/exits | Embedded `SLT.effects`, `SLT.exit_options` | Yes | Planned effects mistaken for committed state | Predicate/effect checks | **Keep embedded** | Execution creates real records through `SE` |

---

## **5. Boundary recommendations**

### **`THR` vs `CLK` vs `STQ`**

**What is wrong:** `THR` can become a vague bucket for “anything ongoing,” including pressure clocks and story promises.

**Why it matters:** vague threads make stories feel coherent only by prose, not by state. The system cannot tell whether a concern is a named tension, a ticking pressure, or a promise owed to the audience/player.

**Recommendation:**

* `THR` owns qualitative ongoing concern: “Mira is hunted by the council.”  
* `CLK` owns quantified/staged pressure: “Council search reaches the safehouse: 3/6.”  
* `STQ` owns question/promise/payoff: “Who betrayed Mira?” or “The sealed letter promises a reveal.”

**Validator/MCP effect:** active `THR` may link to `CLK` and `STQ`, but cannot substitute for them when the state needs tick thresholds or payoff status.

**Skill effect:** turn-cycle should create `CLK` when there is staged pressure, `STQ` when a setup/question becomes narratively owed, and `THR` when a concern persists across turns.

### **`BEL` vs `SF` vs `SREL`**

**What is wrong:** objective relationship/fact records can be created from belief-only evidence.

**Why it matters:** mystery and social tension collapse if rumor becomes truth.

**Recommendation:**

* `BEL` owns “X thinks Y betrayed them.”  
* `SF` owns “Y betrayed X” only when branch truth establishes it.  
* `SREL` owns objective relationship state, not perceived relationship.

**Validator/MCP effect:** no active objective `SREL` if its only support is a `BEL` with rumor/false/uncertain truth relation, unless the `SE.record_introductions[]` evidence includes an objective parent-active or same-event-created record.

**Skill effect:** use `BEL` for suspicion, social misconception, propaganda, witness testimony; create `SREL` only when the relationship is objectively branch-real.

### **`STENT` vs `STSTAT`**

**What is wrong:** entity identity and mutable status must not blend.

**Why it matters:** branch replay and entity state projection depend on status being independently supersedable.

**Recommendation:** keep `STENT` identity-only. Every fresh `STENT` requires exactly one same-event `STSTAT`, and all later life/agency/location changes create superseding `STSTAT`.

### **`STOBJ` vs `DA`**

**What is wrong:** objects and artifacts overlap if “a letter” is both a physical object and a diegetic text.

**Why it matters:** action access and information access are different.

**Recommendation:**

* `STOBJ` owns physical access/manipulation.  
* `DA` owns authored/circulated information.  
* A sealed letter may be both: `STOBJ-4` for the physical letter, `DA-7` for the deciphered text, linked by source records.

### **`OBL` vs `CNSQ`**

**What is wrong:** both can represent “something pending.”

**Why it matters:** player agency needs to know whether the pending thing is a duty someone can fulfill, or fallout that will arrive.

**Recommendation:**

* `OBL` owns owed action / duty / promise between entities or institutions.  
* `CNSQ` owns causal fallout, cost, result, or repercussion.

### **`STSEC.clue_carriers` vs first-class `STCLUE`**

**What is wrong:** clue carriers look like a candidate first-class concept.

**Why not extract now:** the current schema already explicitly embeds clue carriers inside `STSEC`, and their identity is the carrier record (`DA`, `STOBJ`, `STLOC`, `BEL`, `SF`, `SE`). A separate `STCLUE` would introduce duplicate identity and lifecycle.

**Recommendation:** keep embedded. Supersede `STSEC` for clue lifecycle changes.

### **Page affordances**

**What is wrong:** affordances affect choices, action legality, object access, and observer grounding, so they look first-class.

**Why not extract:** affordance ordinals are page-local projections of the current state. They are not durable story entities. The durable owners are `STLOC`, `STOBJ`, `STSTAT`, `SF`, `BEL`, `CLK`, and `STSEC`.

**Recommendation:** keep `PG.state_snapshot.visible_affordances` embedded, but extract a reusable schema definition and add strict validators.

### **`SE.world_logic_rationale`**

**What is wrong:** it currently carries parseable intro/non-propagation machine tags.

**Why it matters:** prose is not hidden state. Machine-critical data must not depend on tag parsing inside a rationale string.

**Recommendation:** `world_logic_rationale` becomes human-readable explanatory prose only. Structured machine data moves to `SE.record_introductions[]` and `SE.propagation_exceptions[]`.

---

## **6. Missing concept recommendations**

### **No new first-class active story-state record should be added in this pass**

The current first-class ontology is already rich. The high-value consolidation is **not** another record class; it is ownership correction.

Add these **structured embedded concepts**, not new active records:

1. `SE.record_introductions[]`  
2. `SE.propagation_exceptions[]`  
3. reusable `PageAffordance` schema definition  
4. stricter supersession lifecycle semantics

### **Candidate future concept: `STPLAN`**

**Purpose:** character plan / motive chain: given beliefs, intentions, resources, relationships, and constraints, what is the entity presently trying to do?

**Why not now:** `STINT` + `BEL` + `SLT` + `SE.commitment.alias_bindings` may be enough once provenance and grounding are hardened.

**When to add:** if audits repeatedly show character actions are coherent locally but lack medium-range agency.

**Schema sketch:**

id: STPLAN-1

story_id: STORY-1

created_at_page: PG-12

supersedes: null

planner: STENT-3

root_intention: STINT-7

belief_basis: [BEL-12, BEL-13]

resource_basis: [STOBJ-4, SREL-2]

blocked_by: [CLK-2, OBL-5]

current_step: "bribe the customs clerk"

next_possible_moves: [SLT-18, SLT-21]

status: active

**Anti-patterns:** “this character will die in act three,” “this plan guarantees the climax,” “author wants betrayal later.”

### **Candidate future concept: branch convergence contract**

**Purpose:** validate when branches can safely converge.

**Why not now:** branch isolation and snapshots should be hardened first. A convergence contract is valuable only after strict active-state/provenance exists.

**Shape:** an audit/authoring record that compares active `STQ`, `STSEC`, `CLK`, `SREL`, `SF`, and `BEL` compatibility. It should never force convergence.

### **Explicitly rejected for this pass**

* `SCENE`, `ACT`, `ARC`, `MIDPOINT`, `CLIMAX`, `BEAT_POSITION`  
* global drama-manager target shape  
* “optimal story” search  
* theme/motif/pacing records  
* first-class `STCLUE`  
* prose-only hidden state  
* natural-language validator judgments

---

## **7. Generalized provenance / introduction proposal**

### **Should all created state records require introduction/provenance proof?**

**Yes.** Every created active story-state record should explain why it became branch-real.

This applies to:

`STENT`, `STSTAT`, `STINT`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, `SREL`, `STLOC`, `STOBJ`, and story-local `DA`.

Operational records need different handling:

* `SE`: created by the selected input / system action itself.  
* `PG`: created by applying an `SE`.  
* `BR`: created by fork operation.  
* `CHC`: emitted by a page and grounded in page snapshot.  
* `SLT`: authoring/pool record with its own provenance, not a branch-state creation in the same way.

### **Should `intro:<CLASS>(...)` remain?**

**No. Replace it.** Keep it only long enough for the next implementation ticket to delete it and fail old stories.

### **Should provenance be on `SE`, a separate record, or class-local?**

**Structured fields on `SE`.**

`SE` is the causal activity that generates state. Putting provenance there keeps the replay model clean:

* `SE.state_delta` says **what changed**.  
* `SE.record_introductions[]` says **why each created record was allowed to become real**.  
* record-local fields say **what the record means**.  
* world-index converts provenance into edges for retrieval.

Do not create a new first-class `PROV` record. It would not be active story state; it would be event metadata.

### **Proposed `SE` schema sketch**

record_introductions:

 - record: STSEC-4

   class: STSEC

   introduction_kind: midstory_creation

   trigger: discovered_contradiction

   evidence:

     parent_active: [DA-2, BEL-7]

     same_event_created: [STQ-5]

     creating_event: SE-12

   distinct_from: [STSEC-1]

   access_routes:

     - actor: STENT-1

       route: artifact_read

       via_records: [DA-2]

   rationale: "The ledger contradicts the public account and establishes a hidden motive."

propagation_exceptions:

 - record: DA-3

   expected_audience: group:council

   exception_kind: suppressed_before_circulation

   evidence_records: [SE-12, STENT-6]

   affected_holders: [group:council]

   rationale: "The clerk intercepted the broadsheet before it reached the chamber."

### **Interaction with existing fields**

* `created_at_page`: still required on the created record; must equal the child `PG`.  
* `source_event`: class-local semantic origin; should usually equal or reference the creating `SE`.  
* `derived_from`, `source_records`, `basis`, `linked_records`, `truth_anchor`: semantic evidence internal to the record.  
* `clue_carriers`: secret-specific clue design; not introduction proof.  
* `PG.state_snapshot`: replay surface; should not contain provenance except by active ids and mystery claim evidence.  
* `SE.state_delta`: remains the replay delta.

### **Deterministic validators**

Add:

* every `state_delta.create[]` active-state id has exactly one `record_introductions[]` entry;  
* intro record id/class matches;  
* created record exists in patch or repository;  
* created record’s `created_at_page` equals child `PG.id`;  
* evidence ids are either parent-active, same-event-created, or the creating event;  
* `distinct_from` ids exist and are same class when required;  
* `access_routes.via_records` are valid and available;  
* no parseable `intro:` tags remain in `world_logic_rationale`.

---

## **8. Backwards-compatibility removal plan**

| File / function | Current behavior | Problem | Recommendation | Expected failure message |
| ----- | ----- | ----- | ----- | ----- |
| `tools/validators/src/structural/compatibility-drift.ts` | Emits info/warn compatibility classifications for missing optional dirs/keys and old shapes | Normalizes old contracts socially, even if not replay-valid | Replace with strict `current_contract_shape` fail validator, or keep only as manual diagnostic not in pass path | `PG-7 uses a non-current snapshot shape: active_records missing required keys [CLK, STSEC, STQ]. Current story contract requires explicit arrays.` |
| `tools/validators/src/_helpers/state-snapshot-replay.ts` | Defines `OPTIONAL_ACTIVE_RECORDS_CLASSES = [DA, CLK, STSEC, STQ]` | Silent normalization | Remove optional class concept | `state_snapshot.active_records.CLK is missing; old snapshots are invalid under the current contract.` |
| `snapshot-replay-equality.ts` | Normalizes missing optional active-record keys; supports legacy `applied_event_ops` / `SE.ops` replay | Accepts old structure | Remove normalization and legacy replay branch | `PG-9 lacks input.resolved_event_id and current SE.state_delta replay surface.` |
| `midstory-record-introduction-grounding.ts` | Has legacy compatibility page bypass | Lets old snapshots skip intro proof | Remove bypass | `Created STSEC-4 has no structured record_introduction entry in SE-12.` |
| `story-record-schemas.md` compatibility classifications | Documents grandfathering and migration classes | Conflicts with desired strict posture | Rewrite as “invalid old shape diagnostics” | Same as validator |
| `branching-story-health-audit/SKILL.md` compatibility mode | Supports `grandfathered_snapshot_shape`, `compatible_optional_absence`, etc. | Tells skills old shapes may be acceptable | Change to “strict contract audit”; old shapes are invalid with manual repair guidance | `This story predates current contract; manual repair required before turn-cycle.` |
| `story-page.schema.json` | `active_records` keys not required; extra props allowed | Old shapes pass schema | Require exact full shape | Schema failure with missing key |
| `story-event.schema.json` | `state_delta` patterns omit `STSTAT`, `CLK`, `STSEC`, `STQ` | Current valid deltas can fail schema; invalid consistency | Fix pattern to include all active story classes | `SE-12.state_delta.create contains id class not allowed by current schema` |
| Patch-engine lifecycle ops | Mutate old record files in place | Violates append-only | Remove op kinds or make validation fail | `tick_pressure_clock is no longer valid; create superseding CLK record and cite it in SE.state_delta.` |
| `describe-envelope-schema.ts` | Advertises removed lifecycle ops | MCP teaches invalid operations | Remove op schemas | Tool no longer lists removed operations |

Keep `branching-story-prose-attach`’s explicit plan-drift handling. That is receipt/prose validation, not silent structural compatibility.

---

## **9. Deterministic validation plan**

| Validator | Severity | Rule | Records | Run | Failure code |
| ----- | ----- | ----- | ----- | ----- | ----- |
| `active_records_full_shape` | fail | Every `PG.state_snapshot.active_records` has exactly current class keys; each value array of unique ids; no unknown keys | `PG` | full + pre-apply | `active_records.missing_required_class` |
| `state_delta_class_integrity` | fail | `SE.state_delta.create/supersede/close` ids use allowed current classes, including `STSTAT`, `CLK`, `STSEC`, `STQ`; ids exist or are in patch | `SE`, patch | pre-apply + full | `state_delta.invalid_id_class` |
| `structured_creation_provenance_required` | fail | Every created active state record has exactly one `SE.record_introductions[]` entry | `SE`, created records | pre-apply + full | `provenance.missing_introduction` |
| `creation_provenance_evidence_reachable` | fail | Evidence is parent-active, same-event-created, or creating event; branch lineage valid | `SE`, `PG` | pre-apply + full | `provenance.unreachable_evidence` |
| `created_record_page_alignment` | fail | Created record’s `created_at_page` equals child `PG.id` | all created story state | pre-apply + full | `provenance.created_at_page_mismatch` |
| `no_machine_tags_in_rationale` | fail after cutover | `world_logic_rationale` contains no `intro:` or parseable non-propagation tags | `SE` | full | `event.machine_tag_in_rationale` |
| `snapshot_replay_strict` | fail | Child `PG.active_records` equals parent plus `SE.state_delta` with no normalization | `PG`, `SE` | pre-apply + full | `snapshot_replay.snapshot_drift` |
| `supersession_delta_integrity` | fail | Superseding record same class; old active in parent; new active in child; old inactive in child | all superseded classes | pre-apply + full | `supersession.invalid_transition` |
| `no_story_state_in_place_mutation` | fail | Patch plan must not stage existing story-state YAML for mutation; state changes require new id | patch plan | pre-apply | `append_only.in_place_mutation` |
| `page_affordance_integrity` | fail | Affordance ordinals unique; grounded records active; available entities active; family enum valid | `PG` | pre-apply + full | `affordance.invalid_grounding` |
| `choice_grounding_accessibility` | fail | `CHC.grounded_in.records` and affordance ordinals exist and are available to actor/viewpoint when actor-bound | `CHC`, `PG`, `SE` | pre-apply + full | `choice.grounding_unavailable` |
| `srel_active_duplicate_axis` | fail | No two active `SREL` records with same participants + axis + direction | `SREL`, `PG` | full | `srel.duplicate_active_axis` |
| `srel_not_belief_only` | fail | Objective `SREL` cannot be supported only by uncertain/false/rumor `BEL` | `SREL`, `BEL`, `SE` | full | `srel.objective_from_belief_only` |
| `stsec_reveal_evidence_integrity` | fail | Revealed `STSEC` supersession has reveal event and reveal records active/same-event; if clue carriers exist, at least one usable discovered/direct carrier supports reveal | `STSEC`, `SE` | full | `secret.invalid_reveal_evidence` |
| `stq_setup_precedes_payoff` | fail | `payoff_of` and answer/payoff events occur after setup on branch path | `STQ`, `PG`, `SE` | full | `story_question.payoff_before_setup` |
| `clock_threshold_effect_integrity` | fail | Thresholds ordered; fired thresholds have supporting `SE` and effect records; value within range | `CLK`, `SE` | full | `clock.invalid_threshold_effect` |
| `propagation_exception_integrity` | fail | Omitted expected propagation requires structured exception with evidence records | `SE`, `BEL`, `DA` | pre-apply + full | `propagation.missing_exception` |

Explicitly rejected validators:

* “Warn if two threads sound similar.”  
* “Infer thematic overlap by keyword.”  
* “LLM judges whether clue is sufficient.”  
* “Detect duplicate story questions by similar text.”  
* “Check if prose feels like payoff.”

Those belong in health-audit prose or human review, not deterministic validators.

---

## **10. MCP / patch-engine / index plan**

### **Patch-engine operation vocabulary**

Remove these mutation ops from valid story-state operation vocabulary:

* `tick_pressure_clock`  
* `resolve_pressure_clock`  
* `append_secret_clue_carrier`  
* `mark_secret_clue_discovered`  
* `reveal_story_secret`  
* `answer_story_question`  
* `abandon_story_question`

Keep:

* `create_*_record`  
* `supersede_clk_record`  
* `supersede_stsec_record`  
* `supersede_stq_record`

Consider adding generic supersede ops for all active state classes, or keep create ops plus `supersedes` field and let validators enforce transition. The cleaner long-term shape is a uniform `supersede_story_record` operation, but that may be more patch-engine churn than necessary for the first pass.

### **Envelope schemas**

Update `tools/world-mcp/src/tools/describe-envelope-schema.ts` so `describe_envelope_schema` no longer advertises removed lifecycle operations.

Update `tools/patch-engine/src/envelope/schema.ts` `OPERATION_KINDS`.

Update expected id allocation:

* lifecycle transitions now consume fresh ids;  
* clock tick consumes a new `CLK` id;  
* secret clue discovery consumes a new `STSEC` id;  
* question answer consumes a new `STQ` id.

### **ID allocation**

No new id namespace is needed for provenance because provenance lives inside `SE`.

If a future `STPLAN` or `CONV` is added, add `stplan_ids` / `conv_ids`, but not in this pass.

### **World-index**

Update `tools/world-index/src/schema/types.ts` with new story edge types:

* `created_by_event`  
* `state_delta_create`  
* `state_delta_supersede`  
* `state_delta_close`  
* `supersedes_record`  
* `creation_evidence`  
* `same_event_dependency`  
* `parent_active_evidence`  
* `truth_anchor`  
* `source_record`  
* `linked_record`  
* `clue_carrier`  
* `reveals_secret`  
* `answers_question`  
* `grounds_choice`  
* `affordance_grounded_in`  
* `affordance_available_to`  
* `propagation_exception_evidence`

Update `tools/world-index/src/parse/atomic.ts` to extract edges from:

* `SE.state_delta`  
* `SE.record_introductions`  
* `SE.propagation_exceptions`  
* `STSEC.truth_anchor`, `source_records`, `clue_carriers`, `reveal_records`  
* `STQ.source_event`, `source_records`, `payoff_of`, `answer_records`  
* `CLK.driver`, `linked_records`, `thresholds`  
* `CHC.grounded_in.records`  
* `PG.state_snapshot.visible_affordances`  
* `SLT.effects`, `exit_options` where deterministic ids exist

### **MCP retrieval**

Update story-bundle context to include:

* recent structured introductions;  
* active records with provenance summaries;  
* active clocks with last supersession source event;  
* secrets with clue carrier record ids and discovered counts;  
* story questions with payoff/answer lineage;  
* page affordance summaries for recent pages;  
* propagation exceptions relevant to recent `SE`.

Add targeted retrieval helpers if needed:

* `get_story_state_provenance(record_id)`  
* `get_page_affordances(page_id)`  
* `get_record_lineage(record_id)`  
* `get_active_story_state(story_slug, page_id)`

These can be implemented as MCP tools or slices over existing `get_records` and index edges.

### **Direct-write vs patch-engine**

Keep the rule strict:

* story-state records are patch-engine only;  
* prose receipts may be direct-write surfaces only if already explicitly outside state mutation;  
* health audits can create audit records/proposals, not mutate story state.

---

## **11. Skill integration plan**

### **`branching-story-bootstrap`**

Required changes:

* `SE-1` must include structured `record_introductions[]` for every initial state record.  
* All initial active-record arrays must be present, even if empty.  
* No `intro:` tags.  
* Bootstrap should explicitly distinguish:  
  * canon-derived state;  
  * premise-derived state;  
  * player/viewpoint affordances;  
  * initial secrets/questions/clocks.  
* Root `STENT` creation still requires paired `STSTAT`.

### **`branching-story-turn-cycle`**

Required changes:

* Replace mid-story intro tag phase with structured provenance phase.  
* Every created active state record must be listed in `SE.record_introductions[]`.  
* Replace non-propagation text tags with `SE.propagation_exceptions[]`.  
* Replace lifecycle ops with supersession records:  
  * ticking a clock creates `CLK-new` superseding `CLK-old`;  
  * revealing a secret creates `STSEC-new` superseding `STSEC-old`;  
  * answering a question creates `STQ-new` superseding `STQ-old`.  
* Phase 9 gates should run strict validators and fail old snapshot shapes.  
* `world_logic_rationale` becomes explanatory prose only.

### **`branching-story-prose-attach`**

Required changes:

* Do not create or mutate state provenance.  
* Render structured provenance into prose plans if useful, but do not treat prose as evidence.  
* Keep receipt validation separate from state validation.  
* Explicitly warn that prose may not introduce facts, secrets, statuses, or affordances unless corresponding records already exist.

### **`branching-story-health-audit`**

Required changes:

* Remove “compatible optional absence” and “grandfathered snapshot” as acceptable outcomes.  
* Add strict contract section:  
  * old snapshot shape;  
  * missing structured provenance;  
  * machine tags in rationale;  
  * in-place lifecycle mutation evidence;  
  * missing full active-record keys.  
* Keep craft/judgment sections separate and non-blocking.  
* Produce manual repair guidance, not auto-migration.

### **`commitment-block-authoring`**

Required changes:

* `SLT.effects` should describe intended possible state effects, but execution must create actual records via `SE`.  
* Add examples for:  
  * opening `STQ`;  
  * ticking/superseding `CLK`;  
  * adding clue carrier via superseding `STSEC`;  
  * resolving `OBL` by supersession.  
* Predicate DSL should be updated if new structured provenance predicates are useful, but do not allow `SLT` to require future plot shape.

### **`story-fact-promotion-to-canon`**

Required changes:

* Include `SE.record_introductions[]` as evidence in proposal packages where source story facts/entities/relationships are promoted.  
* Treat provenance as reliability evidence, not canon authority.  
* Do not center story-local character canonization in this pass.

### **`story-promotion-closeout`**

Required changes:

* If closeout creates/supersedes story records, its `SE` must include structured provenance with `introduction_kind: promotion_closeout`.  
* Continue avoiding world-canon mutation.  
* Continue superseding only when schema-backed fields actually change.

---

## **12. Concrete implementation plan**

### **Documentation**

`docs/FOUNDATIONS.md`

* Add a short “Story-state provenance” subsection:  
  * prose is not provenance;  
  * every state creation needs structured proof;  
  * current story structure is strict; old story shapes may fail.  
* Clarify no silent compatibility for story bundles.

`.claude/skills/_shared-templates/story-state-contract.md`

* Replace intro tag doctrine with structured `SE.record_introductions[]`.  
* Replace parseable non-propagation tag doctrine with `SE.propagation_exceptions[]`.  
* Strengthen append-only doctrine:  
  * no engine-owned mutable lifecycle fields for story state;  
  * supersession required for lifecycle transitions.  
* Define current active-state record set and exact `PG.active_records` shape.

`.claude/skills/_shared-templates/story-record-schemas.md`

* Update `SE` schema sketch.  
* Update `PG` active-record requirements.  
* Update `CLK`, `STSEC`, `STQ` lifecycle examples to supersession.  
* Keep `STSEC.clue_carriers` embedded and explicitly reject `STCLUE` for now.  
* Remove compatibility/grandfathering classifications.

### **Skill docs**

Update:

* `.claude/skills/branching-story-bootstrap/SKILL.md`  
* `.claude/skills/branching-story-turn-cycle/SKILL.md`  
* `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md`  
* `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`  
* `.claude/skills/branching-story-prose-attach/SKILL.md`  
* `.claude/skills/branching-story-health-audit/SKILL.md`  
* `.claude/skills/commitment-block-authoring/SKILL.md`  
* `.claude/skills/story-fact-promotion-to-canon/SKILL.md`  
* `.claude/skills/story-promotion-closeout/SKILL.md`

### **Validator schemas**

`tools/validators/src/schemas/story-event.schema.json`

* Add `record_introductions`.  
* Add `propagation_exceptions`.  
* Fix `state_delta` id regex to include `STSTAT`, `CLK`, `STSEC`, `STQ`.  
* Keep `world_logic_rationale` required but prose-only.  
* Consider adding `expected_witnesses` if validators still read it; otherwise remove validator dependence.

`tools/validators/src/schemas/story-page.schema.json`

* Require every `active_records` key.  
* Set `active_records.additionalProperties: false`.  
* Make nested `entity_status.additionalProperties` strict enough to avoid silent extra fields.  
* Extract `$defs.PageAffordance`.

`tools/validators/src/schemas/story-pressure-clock.schema.json`

* Enforce supersession consistency:  
  * terminal/resolved statuses require resolution event;  
  * tick history is immutable within a record and changes only in superseding version.

`tools/validators/src/schemas/story-secret.schema.json`

* Keep embedded clue carriers.  
* Require reveal fields when status is `revealed`.  
* Clarify `source_records` and `truth_anchor`.

`tools/validators/src/schemas/story-question.schema.json`

* Require answer fields when `answered` / `paid_off`.  
* Require abandonment rationale when `abandoned`.  
* Enforce `payoff_of` id shape.

### **Validator structural/rules modules**

Remove or rewrite:

* `tools/validators/src/structural/compatibility-drift.ts`  
* optional normalization in `_helpers/state-snapshot-replay.ts`  
* legacy branch in `snapshot-replay-equality.ts`  
* legacy bypass in `midstory-record-introduction-grounding.ts`

Add:

* `structured-creation-provenance-required.ts`  
* `creation-provenance-evidence-reachable.ts`  
* `active-records-full-shape.ts`  
* `state-delta-class-integrity.ts`  
* `no-machine-tags-in-rationale.ts`  
* `no-story-state-in-place-mutation.ts`  
* `supersession-delta-integrity.ts`  
* `page-affordance-integrity.ts`  
* `srel-active-duplicate-axis.ts`  
* `stsec-reveal-evidence-integrity.ts`  
* `stq-setup-precedes-payoff.ts`  
* `propagation-exception-integrity.ts`

### **Patch engine**

`tools/patch-engine/src/envelope/schema.ts`

* Remove lifecycle mutation op kinds.  
* Ensure id allocation keys remain for new superseding records.

`tools/patch-engine/src/ops/`

* Remove or deprecate-as-failing:  
  * `tick-pressure-clock.ts`  
  * `resolve-pressure-clock.ts`  
  * `append-secret-clue-carrier.ts`  
  * `mark-secret-clue-discovered.ts`  
  * `reveal-story-secret.ts`  
  * `answer-story-question.ts`  
  * `abandon-story-question.ts`  
* Keep/create uniform supersession support.

### **World-index**

`tools/world-index/src/schema/types.ts`

* Add story edge types listed above.

`tools/world-index/src/parse/atomic.ts`

* Extract edges from `SE`, `STSEC`, `STQ`, `CLK`, `CHC`, `PG`, `SLT`.

### **World-MCP**

`tools/world-mcp/src/tools/describe-envelope-schema.ts`

* Remove removed ops.  
* Include updated schemas.

`tools/world-mcp/src/context-packet/shared.ts`

* Add structured provenance summaries.

`tools/world-mcp/src/context-packet/story-bundle-context.ts`

* Include recent introductions, active-state provenance, affordance summaries, and propagation exceptions.

`tools/world-mcp/src/tools/get-record-schema.ts`

* Ensure updated schemas are retrievable.

`tools/world-mcp/src/tools/list-records.ts` / `search-nodes`

* Ensure new edge-rich record retrieval remains story-slug scoped.

### **Tests and fixtures**

Add/update tests for:

* strict active-record shape;  
* `SE.state_delta` includes `STSTAT`, `CLK`, `STSEC`, `STQ`;  
* missing provenance fails;  
* invalid provenance evidence fails;  
* parseable `intro:` tag fails after cutover;  
* lifecycle mutation ops rejected;  
* superseding `CLK` tick works;  
* superseding `STSEC` clue discovery/reveal works;  
* superseding `STQ` answer/abandon works;  
* old `applied_event_ops` page fails;  
* duplicate active `SREL` fails;  
* page affordance invalid grounding fails;  
* world-index provenance edges extracted;  
* MCP context includes active provenance summaries.

---

## **13. Migration / non-migration posture**

Do **not** silently migrate.

Desired posture:

* validators fail old structures;  
* errors are comprehensive and specific;  
* repair guidance is manual;  
* no hidden fallback;  
* no old production story exception;  
* no “compatibility drift” pass verdict that allows invalid state to proceed.

Optional explicit repair workflow:

* a separate `story-contract-repair-plan` skill may inspect an invalid story and propose a patch plan;  
* it must not run automatically;  
* it must not normalize without user approval;  
* its output must say exactly what it changed and why.

Example failure style:

FAIL active_records_full_shape

PG-14 state_snapshot.active_records is missing required keys: CLK, STSEC, STQ.

Current story contract requires every active record class to appear explicitly, even as [].

Suggested fix: manually repair PG-14 and descendants, then recompute state hashes.

FAIL append_only.in_place_mutation

Patch operation tick_pressure_clock mutates existing CLK-2.

Current story contract requires a new CLK record with supersedes: CLK-2 and an SE.state_delta transition.

FAIL provenance.missing_introduction

SE-12 creates STSEC-4 but has no record_introductions entry for STSEC-4.

Suggested fix: add structured introduction evidence citing parent-active or same-event-created records.

---

## **14. Examples**

### **Example A: mid-story character/entity introduction**

**Situation:** On `PG-8`, the player opens a cellar door. A courier steps out, already wounded, carrying a council seal.

Current model can create `STENT`, but proof is limited and stringly.

Recommended model:

`SE-12.state_delta.create`:

create: [STENT-9, STSTAT-21, BEL-30, STOBJ-8]

`SE-12.record_introductions`:

- record: STENT-9

 class: STENT

 introduction_kind: midstory_creation

 trigger: actor_enters_scene

 evidence:

   parent_active: [STLOC-2, STOBJ-4]

   same_event_created: [STSTAT-21]

   creating_event: SE-12

 distinct_from: [STENT-3]

 access_routes:

   - actor: STENT-1

     route: direct_observation

     via_records: [SE-12]

- record: STSTAT-21

 class: STSTAT

 introduction_kind: paired_status_for_new_entity

 trigger: entity_becomes_actionable

 evidence:

   same_event_created: [STENT-9]

   creating_event: SE-12

Validators prove:

* courier has status;  
* courier is not a duplicate of known entity unless intended;  
* actor had access;  
* child page active records include `STENT-9` and `STSTAT-21`.

### **Example B: secret/question/clock/thread interaction**

**Situation:** The sealed green-wax letter creates a question; the council investigation advances; a hidden betrayal is slowly revealed.

Records:

* `THR-2`: “Council betrayal pressure”  
* `STQ-3`: “Who sent the green-wax letter?”  
* `STSEC-4`: hidden truth: “The ally forged it”  
* `CLK-2`: “Council search reaches Mira,” value 2/6  
* `DA-7`: the letter  
* `BEL-12`: Mira suspects the steward

When the player deciphers a ledger:

* supersede `STSEC-4` → `STSEC-8` with one discovered clue carrier;  
* supersede `CLK-2` → `CLK-5` value 3/6;  
* optionally supersede `STQ-3` → `STQ-6` status `complicated`;  
* `SE.record_introductions` explains any newly created clue-bearing `DA`/`BEL`;  
* `SE.state_delta` creates/supersedes all ids.

This is better than current behavior because no lifecycle fields mutate in place, and the secret/question/clock/thread graph is retrievable.

### **Example C: affordance and choice grounding**

`PG-11.state_snapshot.visible_affordances`:

- ordinal: 2

 label: "open the rusted hatch"

 grounded_in: [STOBJ-4]

 available_to: [STENT-1]

 action_families: [use, investigate, move]

`CHC-5`:

grounded_in:

 records: [STOBJ-4, STLOC-2]

 affordance_ordinals: [2]

Validator checks:

* ordinal 2 exists on `PG-11`;  
* `STOBJ-4` is active;  
* `STENT-1` is active;  
* choice actor/viewpoint has access;  
* action family is legal.

No `AFF-1` record is needed. The affordance is page-local; the object and location are durable.

### **Example D: old invalid structure fails**

Old page:

state_snapshot:

 active_records:

   STENT: [...]

   SF: [...]

   BEL: [...]

Missing `CLK`, `STSEC`, `STQ`, `DA`, `STSTAT`, etc.

Old event:

world_logic_rationale: "intro:STSEC(id=STSEC-4, evidence=[BEL-7]) ..."

state_delta:

 create: [STSEC-4]

Old patch:

op: tick_pressure_clock

target_clock_id: CLK-2

delta: 1

Strict validators emit:

* `active_records.missing_required_class`  
* `event.machine_tag_in_rationale`  
* `provenance.missing_introduction`  
* `append_only.in_place_mutation`

The story breaks, correctly. The user can manually repair it.

---

## **15. Final recommendation**

### **Must-do**

1. **Replace parseable introduction/non-propagation tags with structured `SE` fields.**  
2. **Require creation provenance for every created active story-state record.**  
3. **Remove lifecycle mutation ops and enforce supersession-only state changes.**  
4. **Fix `story-event.schema.json` `state_delta` id patterns to include `STSTAT`, `CLK`, `STSEC`, and `STQ`.**  
5. **Make `PG.state_snapshot.active_records` strict and complete.**  
6. **Remove compatibility/grandfathering/normalization paths.**  
7. **Add deterministic provenance, replay, supersession, affordance, and lifecycle validators.**  
8. **Expand world-index edges and MCP context for provenance and story-state graph retrieval.**

### **Should-do**

1. Upgrade duplicate active `SREL` from warning to failure.  
2. Add strict `STSEC` reveal evidence validation.  
3. Add strict `STQ` setup-before-payoff validation.  
4. Add page-affordance schema component and validators.  
5. Update all story skills to use structured provenance and supersession examples.  
6. Add manual repair guidance for invalid old stories.

### **Optional / future**

1. `STPLAN` if character agency remains under-modeled after this pass.  
2. Branch convergence contract after strict provenance/replay is stable.  
3. Resource/capability records if affordance validation needs durable capability state.  
4. Better MCP lineage tools.

### **Explicitly rejected**

* act structure;  
* three-act / midpoint / climax machinery;  
* global drama-manager rails;  
* optimal-story global search;  
* heuristic validators;  
* silent backward compatibility;  
* prose as hidden state;  
* stringly typed machine-critical data;  
* fields that are neither validated nor consumed;  
* first-class `STCLUE` in this pass;  
* durable choice-debt objects replacing `CHC`.

### **What not to do**

Do not “improve storytelling” by adding arc labels. Do not add validators that guess meaning from text. Do not keep old snapshots alive through normalization. Do not let patch-engine mutate story-state YAML in place. Do not let `world_logic_rationale` carry hidden machine state. Do not add any first-class concept unless schema, patch-engine, index, MCP, validators, skills, fixtures, and story-bundle context all consume it.

