## **Executive judgment**

Your current direction is **right**. The settled story system is much closer to a durable interactive-narrative engine than the earlier act-structure attempt would ever have been. The core choice to treat story as **present causal state** rather than dramatic progress is the correct foundation: branch-local facts, beliefs, obligations, consequences, threads, relationships, intentions, locations, objects, events, page snapshots, choices, and commitment blocks are exactly the right kinds of things to track. The system’s explicit rejection of act structure, ARC_TRACE, global drama management, and prose-as-state is a major strength.

The research mostly validates your architecture. Storylet theory says narrative chunks need prerequisites and effects; your `SLT` commitment blocks are doing that. Interactive narrative research identifies the core tension as coherence versus player agency; your hard gates and branch-local state are attacking that directly. Social simulation systems such as Versu and Comme il Faut show the value of beliefs, relationships, social norms, and autonomous local character reasoning; your `BEL`, `SREL`, `STINT`, `OBL`, and observer firewall are pointed in the right direction. Narrative planning research emphasizes causal progression and character intentionality; your event/state-delta model and intention records already support that.

The needed changes are therefore **not a conceptual redesign**. They are mostly contract hardening, schema-level auditability fixes, and validator/test improvements before production stories make migration painful.

---

## **Research takeaways that matter for Worldloom**

Interactive narrative research frames the problem as letting users meaningfully alter the direction or outcome of the story while preserving coherence. Riedl and Bulitko describe interactive narrative as a system where user actions have meaningful consequences and direct impact on direction or outcome; they also map systems along authorial intent, virtual character autonomy, and player modeling. Your system currently sits in a good middle zone: high authorial guardrails through canon and gates, but no preordained dramatic path.

Drama management research is useful mainly as a warning. Roberts and Isbell define drama managers as coordinators that track narrative progress and steer objects or agents toward narrative goals; they explicitly describe the tension between player autonomy and designer intent, and note that preserving designer intent often pushes against player freedom. That is exactly why your “no global drama manager” rule is correct. You can borrow **local coherence checks** from drama-management literature, but you should not adopt a global plot optimizer.

Storylets are the closest practical analogue to your `SLT` blocks. Emily Short’s storylet definition is: content, prerequisites, and effects on world state; she also stresses that storylets are atomic, robust, and recombinable. Your `SLT` schema is already a stronger version of this because it adds branch scope, mystery policy, saliency, exit options, and a closed predicate DSL.

Quality/resource narrative thinking reinforces one design principle: do not add a generic undifferentiated stat bag. Alexis Kennedy’s critique of “qualities” is that treating PC characteristics, currencies, and story progress as the same kind of variable erases useful distinctions; his “resource narrative” framing emphasizes resources whose interrelationships align with the grain of the story. Your typed records are better than a generic quality system, so keep that discipline.

Versu and Comme il Faut both suggest a useful direction: local social practices and norms can offer affordances without directly controlling agents. Versu’s “social practices” provide suggestions and affordances, while individual agents choose actions using utility-based selection; Comme il Faut models traits, relationships, statuses, norms, and social history so character behavior can be rich and surprising. Your system should strengthen **social-practice storylet batches**, not introduce act beats.

Linear-logic / resource-transition work such as Ceptre supports the idea that interactive stories are best modeled as state transitions with resource usage, not as prose blobs. Ceptre frames gameplay as proof search over rules and state changes, with interactive inspection of intermediate states. This backs your patch-engine + snapshot + replay approach.

Recent LLM narrative-generation work also supports your decision to make structured state authoritative. Long-form LLM story generation still suffers from factual, temporal, entity, and world-rule consistency errors; the safest architecture is therefore not “let the model remember,” but “make the model render from explicit state.”

---

## **What is already strong**

The best parts of the current system are these:

1. **World canon and story state are cleanly separated.** Story bundles are branch-local derived layers, while world canon remains CF / CH / INV / M / OQ / ENT / SEC records. Promotion is explicit and gated.  
2. **Plan authority is correct.** A `PG` page snapshot is the fork primitive; rendered prose is a receipt-bearing artifact, not a second state engine. This is the right answer for branching stories.  
3. **The state vocabulary is mostly right.** `SF` versus `BEL`, `STSTAT`, `STINT`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`, `SE`, `PG`, `CHC`, and `SLT` cover the causal surfaces a branching story needs.  
4. **Action routing is strong.** The six routes — `accept`, `accommodate`, `attempt`, `world_block`, `promotion_hold`, `terminal` — avoid silent rejection and make impossible actions narratively productive.  
5. **The observer firewall is essential and already present.** This is one of the most important safeguards in the whole architecture, because branching fiction collapses fast when actors act on unavailable information.  
6. **The story skills cover the correct lifecycle.** Bootstrap, turn-cycle, prose attach, commitment-block authoring, health audit, promotion, and closeout are the right seven skills. They are also correctly hard-gated.

---

## **P0 fixes: clean these before the first production story**

These are contract/documentation inconsistencies or authority bugs. They are small now and expensive later.

### **1. Fix prose-attach hash drift semantics**

`branching-story-prose-attach` currently says `accept_plan_drift=false` should fail on mismatch, but Phase 2 also says drift is recorded in notes and the verdict is driven only by the deterministic checks. That is contradictory.

Recommended change: add an eighth receipt check:

checks:

 hash_integrity: PASS | WARN | FAIL

Semantics:

hash_integrity:

 PASS: PG.plan.plan_hash matches computed_plan_hash and PG.state_hash is sha256-shaped.

 WARN: drift accepted because accept_plan_drift=true.

 FAIL: plan hash mismatch and accept_plan_drift=false, or PG hash fields are missing / placeholder / non-sha256.

Also delete the placeholder-hash exception now. You have no production stories; there is no reason to carry legacy placeholder tolerance forward.

### **2. Store selected commitment block and bindings on `SE`**

This is the biggest structural gap. The turn-cycle selects an `SLT`, resolves aliases, binds an actor, applies effects, and writes a page, but `SE` does not currently record the selected `SLT` or the resolved binding map. That makes cooldowns, replay explanation, audit, and observer-firewall review weaker than they should be.

Add this to `SE`:

commitment:

 selected_slt_id: SLT-<integer> | null

 selection_source: emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none

 actor_binding: STENT-<integer> | system | unknown

 target_bindings: [<record_id>]

 alias_bindings:

   <alias>: <record_id>

Rules:

* `selected_slt_id: null` only for `story_start`, `prose_attach`, `promotion_closeout`, or other non-storylet events.  
* Every `bound:<alias>` used by the selected block must appear in `alias_bindings`.  
* `saliency.cooldown_pages` becomes enforceable by scanning prior `SE.commitment.selected_slt_id`.  
* Health audit can now deterministically answer “why did this move fire?”

This change is worth the extra YAML. It turns commitment-block selection from plan prose into replayable state.

### **3. Add structured access routes to `BEL.basis`**

The observer firewall is correct, but `BEL.basis` only records `source_event`. That tells us when the belief entered state, not how the holder had access to the information. The health audit currently has to infer access from prose/plans/notes, which is too soft.

Amend `BEL.basis`:

basis:

 source_event: SE-<integer>*

 access_route: direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization

 access_records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | DA-<integer> | BEL-<integer> | SF-<integer> | SE-<integer>]

This gives the observer firewall a real audit trail. It also supports investigation stories, secrecy, lies, rumors, surveillance, legal procedure, and artifact evidence without inventing a new `EVD` record class.

Do **not** add a full evidence record yet. Use `DA`, `STOBJ`, `STLOC`, and `BEL.basis.access_records` first. Add a dedicated evidence/trace class only if the first real stories prove that physical or forensic traces are too awkward to represent through existing records.

### **4. Add minimal diegetic time to `PG.state_snapshot`**

`turn_index` and `record_age(... pages)` are not diegetic time. Page count cannot safely represent “three hours pass,” “winter begins,” “the trial is tomorrow,” “the wound festers overnight,” or “the patrol returns at dawn.” This will matter as soon as stories include travel, waiting, deadlines, seasonal rituals, recovery, decay, or pursuit.

Add:

state_snapshot:

 temporal_state:

   diegetic_label: string

   order: integer | null

   elapsed_since_parent: string | null

   calendar_anchor: string | null

Then add two predicate DSL forms:

time_order(comparator, integer)

time_label(string)

Keep it coarse. Do not build a calendar engine yet. The goal is simply to stop using page count as fake time.

### **5. Make `PG.validation_trace` authority-citable**

HARD-GATE discipline requires PASS/FAIL rationales to cite an authority: record id, packet layer, validator result, retrieved field, or loaded file authority. The current `PG.validation_trace` is a string map, which makes that discipline hard to validate mechanically.

Recommended schema change:

validation_trace:

 input_legality:

   verdict: PASS

   rationale: "<one-line rationale>"

   authority_refs: [PG-<integer>, CHC-<integer>, "validator:input_legality"]

 parent_snapshot_compatibility:

   verdict: PASS

   rationale: "<one-line rationale>"

   authority_refs: [PG-<parent>, "field:PG.state_hash", "field:PG.state_snapshot.canon_revision"]

 ...

This is more verbose, but it is worth it. The validation trace is not flavor; it is a legal/audit artifact.

### **6. Clean internal count and citation mismatches**

Fix these now:

* `branching-story-turn-cycle` hard gate says six additional checks; Phase 9 lists seven. Make it seven.  
* `branching-story-health-audit` says “seven sub-phases” but lists 2a–2h, which is eight. Make it eight.  
* `branching-story-health-audit` cites prose receipt as §4.5; the shared contract’s receipt schema is §4.6.

These are not conceptual problems, but they are exactly the sort of inconsistencies that become validator and skill drift.

### **7. Fix promotion package authority semantics**

In `story-fact-promotion-to-canon`, the CF-shaped candidate should not set `source_basis.direct_user_approval: true` merely because the user approved the promotion package. That approval is permission to create a proposal, not approval of world canon. Canon approval happens in `canon-addition`.

Change:

source_basis:

 direct_user_approval: false

Keep it false all the way through `story-fact-promotion-to-canon`.

Also change novel candidates from:

derived_from: [null]

to:

derived_from: []

A null inside an ID list is asking for schema trouble.

### **8. Fix closeout supersession/disposition wording**

`story-promotion-closeout` says source records are superseded only when their story-local fields actually change, but its validation gate also implies accepted-flavored verdicts require supersessions. That is contradictory.

Change the gate to require **explicit disposition per source record**, not supersession:

source_record_dispositions:

 SF-12: superseded

 BEL-9: ledger_only

 DA-3: unchanged_no_schema_field_changed

This preserves schema minimalism while keeping the closeout audit complete.

### **9. Resolve context-packet / story-kernel mismatch**

The Context Packet Contract says story-pipeline packets can use `STORY_KERNEL.md` frontmatter fields such as `mysteries_in_play`, `cast_bind_list`, and `invariants_acknowledged`, but the bootstrap skill’s `STORY_KERNEL.md` contract specifies ordered markdown sections, not required frontmatter.

Pick one approach:

Recommended: add minimal frontmatter to `STORY_KERNEL.md`.

---

story_id: STORY-<integer>

story_slug: <slug>

root_branch_id: BR-1

root_page_id: PG-1

cast_bind_list: [STENT-<integer>]

player_agency_surface: [STENT-<integer>]

mysteries_in_play: [M-<integer>]

invariants_acknowledged: [INV-<integer>]

---

Then the existing sections remain human-readable.

Also clarify `story_bootstrap` context-packet behavior. The bundle does not exist yet, so either `story_slug` is accepted as a target slug and `story_bundle_context` is empty, or bootstrap uses a world-canon-only packet. The contract and bootstrap skill should say the same thing.

### **10. Purge legacy story-surface vocabulary**

The current documents strongly say no ARC_TRACE and no shape/arc discriminators, but machine-facing docs still mention `arc_trace_record`, storylet shape/intensity counts, and arc-related vocabularies.

Remove or mark deprecated:

* `arc_trace_record`  
* `arc_archetype`  
* `narrative_point`  
* storylet `shape`  
* storylet `intensity`  
* old `commitment_family` / `commitment_class` vocabulary if it is no longer the active `move_family` / `action_family` taxonomy

Replace with:

* `move_family`  
* `action_family`  
* `saliency.urgency`  
* `cooldown_pages`  
* `mystery_policy`  
* `BEL` / `SREL` / `STINT` / `OBL` / `CNSQ` coverage

---

## **P1 improvements: strengthen branching behavior without adding plot rails**

### **1. Add shallow branch-viability forecasting**

Do not add a global drama manager. Do add a **local viability forecast**.

After Phase 8 in `branching-story-turn-cycle`, run a shallow dry-run over emitted choices:

* Does each `CHC` have a lawful route?  
* Does each route produce at least one non-cosmetic consequence, terminal proof, or meaningful block?  
* Are all choices secretly the same choice with different labels?  
* Does any choice immediately clobber its own grounding records?  
* Does every high-urgency open debt have at least one future pressure path?

This should not choose the “best story.” It should only reject fake agency, dead menus, and dependency breakage. Recent branching-LLM work uses tree exploration, cause/effect expansion, graph grounding, and MCTS to improve branch coherence; Worldloom should borrow the **diagnostic lookahead**, not the global scoring-director part.

Add health-audit findings:

choice_menu_degeneracy

choice_viability_unproven

all_choices_same_pressure

choice_lacks_future_consequence_path

### **2. Add character-initiative pressure checks**

The current system can represent NPC intentions, but it does not yet strongly enforce that active intentions become pressure. A free, alive, aware actor with a high-urgency `STINT` should eventually try something, ask something, block something, flee, confess, bargain, threaten, or otherwise change the branch.

Add a health-audit check:

inert_high_urgency_intention

Trigger when:

* active `STINT.urgency: high`  
* holder’s active `STSTAT.life: alive`  
* holder’s active `STSTAT.agency` is not incapacitated/dead/unconscious  
* holder has access to relevant belief/location/object state  
* no selected `SLT`, emitted `CHC`, `BEL`, `SREL`, `OBL`, `CNSQ`, or `THR` has engaged that intention for N pages

This is a local autonomy check, not a drama manager.

### **3. Add social-practice storylet batches**

Borrow from Versu and Comme il Faut without importing their whole architecture. A social practice is a reusable local protocol: trial testimony, oath-taking, dinner etiquette, military challenge, confession, market bargaining, mourning rite, interrogation, smuggling handoff.

No new schema needed. Use `SLB` manifests and `SLT.saliency.tags`:

saliency:

 tags:

   - practice:trial_testimony

   - norm:deference_to_magistrate

   - pressure:public_status

Then `commitment-block-authoring` can add a `social_practice_batch` focus convention:

* 3–8 `SLT`s around the same social practice  
* at least one `ritual_protocol` or `negotiation`  
* at least one `status_shift` or `bond_shift`  
* at least one `BEL` / `SREL` consequence path  
* no act labels  
* no required future plot outcome

This gives you reusable social depth without railroading.

### **4. Add temporal continuity findings**

Once `PG.state_snapshot.temporal_state` exists, add health-audit checks:

time_regression_without_counterfactual_authority

deadline_ignored_without_resolution

wait_action_without_temporal_delta

recovery_without_elapsed_time_or_mechanism

travel_without_elapsed_time_or_route

These will catch a lot of subtle branch incoherence.

### **5. Add “why is this choice available?” inspection**

For authoring and debugging, expose a computed explanation for every `CHC`:

choice_explanation:

 choice_id: CHC-<integer>

 available_because:

   - grounded record

   - visible affordance

   - actor belief access route

   - selected or candidate SLT

 unavailable_to:

   - STENT-<integer>: "lacks BEL access route"

This can be a tool/query, not a schema field. It would make the observer firewall visible to authors.

---

## **P2 validator and test-suite work**

Before production stories, build a hostile test suite. Interactive story engines fail in boring ways unless tested with rude player actions.

Add golden-path and adversarial fixtures for:

* player kills or incapacitates a central character  
* player abandons the premise  
* player destroys or loses a key object  
* player lies in public  
* player privately learns a secret and tries to act on it with another character  
* player waits through a deadline  
* player tries impossible world action  
* player asserts canon-level truth  
* player attempts to resolve a forbidden mystery  
* player forks from an unrendered page  
* canon changes after a committed page  
* prose invents a structural fact  
* promotion accepted, rejected, and deferred

For each fixture, assert:

* every action creates an `SE`  
* no silent rejection  
* no sibling-branch leakage  
* no actor uses unavailable knowledge  
* no accepted choice is cosmetic  
* state hash remains stable  
* selected `SLT` and alias bindings are recorded  
* high-salience debts are closed, transferred, inherited, or explicitly left unresolved  
* prose receipt cannot mutate `PG`  
* promotion never mutates world canon directly

This is the single best engineering investment after the P0 contract fixes.

---

## **What not to add**

Do **not** add act structure, midpoint tracking, climax obligations, or dramatic-shape fields. Your documents are correct that act structure and open branching are hostile to each other.

Do **not** add a global drama manager that optimizes toward a desired ending. Local salience ranking plus hard coherence gates is the right model. Drama-management research is valuable as a catalogue of failure modes, but a central plot optimizer would recreate the same railroading problem in a more technical disguise.

Do **not** add a generic `quality` / `stat` bag. If you later need resources, add typed `STRES` only when real stories demand it. For now, use existing typed records.

Do **not** let prose create state. Keep prose as rendering plus receipt. This is one of your strongest decisions.

Do **not** trust LLM memory for continuity. Use LLMs to draft plans/prose, but let structured records, hashes, gates, and audits decide what is true.

---

## **Recommended implementation order**

First, apply the P0 contract fixes: prose hash semantics, `SE.commitment`, `BEL.basis.access_route`, temporal state, structured validation trace, promotion authority semantics, closeout disposition semantics, context-packet/story-kernel alignment, and legacy ARC vocabulary cleanup.

Second, update the seven story skills to consume those changes. The most affected skills are `branching-story-turn-cycle`, `branching-story-health-audit`, `branching-story-prose-attach`, and `commitment-block-authoring`.

Third, implement validators and hostile fixtures before authoring production stories.

Fourth, add branch-viability forecasting and choice-explanation tooling.

Fifth, start production with one deliberately brutal pilot story whose test plan includes refusal, abandonment, violence, secrecy, waiting, impossible actions, canon drift, and promotion. A story engine that survives that pilot will be much more reliable than one tested only on cooperative choices.

