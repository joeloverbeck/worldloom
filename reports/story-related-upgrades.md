## **Executive position**

Your current story architecture is fundamentally right. I would **not** overhaul it. The important thing is that Worldloom has already rejected the two traps that usually wreck interactive fiction systems: dramatic act bookkeeping and centralized “optimal story” steering. The current model is a present-causal-state machine: page snapshots are fork points, `SLT` commitment blocks are causal moves rather than acts, action routing never silently rejects player input, story facts and beliefs are separate, and health audits replay actual state rather than judging whether the branch “fits the plot.” That aligns much better with interactive narrative research than an act model does.

The proposal below is therefore **tightening, not replacing**: fix a few schema-reference inconsistencies, add explicit causal-threat checks, strengthen attempt/world-block feedback, improve witness/perception discipline, add non-act pressure timing, add story-sifting audits, and make commitment-block coverage more systematic.

## **What the research says, stripped of act-structure baggage**

Storylet-based systems are the closest research/implementation match to your `SLT` model. Kreminski and Wardrip-Fruin describe storylet systems as assembling playthroughs from discrete chunks whose availability depends on the current game state, with player and system co-assembling the story rather than following a fixed sequence. That is almost exactly what Worldloom’s commitment blocks are doing, except your version is more canon-disciplined. Yarn Spinner’s current storylet documentation similarly frames storylets as modular chunks selected by saliency from game state, which supports your local-selection approach rather than global act enforcement.

Narrative planning research reinforces the need to track causal support, threats, and character intentionality. Riedl and Young’s IPOCL work argues that understandable narrative depends on logical causal progression and character believability, and their planner explicitly reasons about causal structure and intentions. Ware and Young’s CPOCL work is especially relevant because it treats conflict as something to preserve inside a causally sound plan rather than something to smooth away; that maps well to branches where valid player actions can destroy, threaten, or redirect prior obligations.

Interactive-narrative mediation research is useful, but only if you borrow the right part. “Accommodation” through replanning is valuable; forcing interventions to preserve a predetermined author path is not. The mediation model detects exceptional user actions and can respond by accommodation or intervention, but Worldloom should prefer accommodation/world-block/terminal/promotion-hold routes that preserve causal truth rather than covertly preserving a planned arc.

The research on agency also supports your “silent rejection is forbidden” rule. Interactive narrative aims for user actions to alter direction or outcome, not merely decorate a fixed plot. Wardrip-Fruin’s agency work warns that perceived agency collapses when the materials implied by the system are not actually usable by the player. Fendt et al. found that explicit acknowledgement and immediate feedback can support the illusion of agency even when the underlying structure is constrained, which strongly supports making every rejected, transformed, or failed action visibly consequential.

Social simulation research supports your `BEL` / `SREL` / `STINT` direction, but not a full agent-simulation rewrite yet. Versu models autonomous social agents using reactive social practices that provide affordances without controlling agents, while Comme il Faut reduces social authoring burden through reusable social norms and interactions. Worldloom can capture most of the benefit by strengthening belief, relationship, intention, and witness logic before introducing autonomous NPC utility systems.

Emergent narrative research points to a missing audit surface: story recognition or “story sifting.” Ryan, Mateas, and Wardrip-Fruin identify story recognition and story support as major design challenges for emergent narrative, because a simulation may produce meaningful event patterns that are invisible or unsupported unless the system can detect them. Felt and later story-sifting work treat the event chronicle as a searchable structure from which narratively meaningful sequences can be selected. This argues for a retrospective “what causal opportunities exist now?” audit mode, not a global drama manager.

The one thing to keep rejecting is centralized drama management. Roberts and Isbell define drama management as a coordinator that tracks narrative progress and directs responses toward a narrative or training goal, and they explicitly frame the tension between player autonomy and designer intent. That is exactly the back door by which act structure returns. Worldloom’s current “local salience plus hard gates” model is safer.

## **Current-state assessment**

### **What is already strong**

The **plan-authority boundary** is excellent. Story state becomes authoritative at page-plan commit; rendered prose is a receipt surface, not a second state engine. That prevents prose drift from silently rewriting branch truth and makes every committed page a fork primitive.

The **six-route action model** is also right: `accept`, `accommodate`, `attempt`, `world_block`, `promotion_hold`, and `terminal`. It is especially important that impossible actions still produce an `SE` record and a page plan. That is the correct alternative to both railroading and permissive nonsense.

The **commitment-block model** is directionally excellent. `SLT` records are state-gated causal moves with preconditions, effects, beats, exits, saliency, mystery policy, and provenance. They are explicitly not acts, arcs, or mini-stories.

The **turn-cycle** already covers the hardest state changes: facts, beliefs, status, intentions, relationships, obligations, consequences, threads, locations, objects, artifacts, death, incapacity, and removal. Deaths and removals are first-class outcomes rather than protected by protagonist armor, which is exactly what an interactive system needs.

The **health audit** is a serious advantage. It already checks replay, branch isolation, debt health, belief/visibility health, mystery/canon safety, and continuation/terminal proof. That makes the system repairable, not just generative.

### **What is currently weak or under-specified**

The current system tracks consequences well, but it does not yet explicitly detect **causal threats**: moments where a new event invalidates the dependency of an emitted choice, open obligation, pending consequence, active thread, or eligible commitment block.

The current system routes `attempt` and `world_block`, but the **result of an attempt** is not structurally explicit. It is inferable from state delta and prose plan, but not directly auditable.

The current belief model is strong, but **witness/perception discipline** still depends too much on skill prose. You require `BEL` updates for secrecy, betrayal, deception, violence, law, status, and public ritual, but there is no robust expected-witness validation pass yet.

The audit has debt aging thresholds, but the storylet predicate system lacks a clean way to express **causal pressure maturation** without act timing.

The health audit diagnoses structural breakage, but it does not yet do **story sifting**: detecting meaningful causal openings, recurring patterns, unresolved tensions, or payoff opportunities from the actual event chronicle.

There are also a few concrete schema-reference slips that should be fixed before production.

## **Proposal**

### **P0 — Fix schema-reference inconsistencies before any production story**

These are not philosophical changes; they are correctness fixes.

First, the health-audit skill refers to `SREL` supersessions whose `basis` does not trace to an `SE` or `BEL`, but the shared `SREL` schema uses `derived_from`, not `basis`. Change the audit finding from `relationship_change_without_basis` to something like `relationship_change_without_derived_from_trace`, and validate `SREL.derived_from[]`.

Second, the turn-cycle death/removal reconciliation says to supersede `STOBJ.controlled_by`, but the `STOBJ` schema has `owner` and `current_location`, not `controlled_by`. Change the skill language to “supersede affected `STOBJ.owner` and/or `STOBJ.current_location` records when death, capture, incapacity, or transfer changes custody.”

Third, the turn-cycle says open `STINT` should be “superseded to abandoned/transferred,” but `STINT` has no `status` field. The clean correction is: close the abandoned `STINT`; create a replacement `STINT` for transferred intentions. Do not add `status` unless you later find that closed-record replay is not enough.

Fourth, the turn-cycle says `SREL` status becomes severed or mourning, but `SREL` has no `status`; it has `axis`, `value`, `valence`, `description`, and `derived_from`. Change this to “supersede relevant `SREL` records by changing `axis` / `value` / `valence` / `description` as appropriate.”

Fifth, harmonize root-record scope. Some skill text treats any record with `created_at_page != null` as branch-local, while commitment-block-authoring correctly allows root-of-tree records to be globally visible because they sit in every branch path. Define this in the shared contract:

bundle_genesis_record:

 definition: >

   A story-bundle record created at PG-1, where PG-1 is the root_page_id

   of the root branch. Genesis records are visible to all branches unless

   later superseded or closed.

branch_local_record:

 definition: >

   A record created after PG-1 whose created_at_page is not in the active

   branch_path or the visible_branch_path_prefix authorized for the selected

   block.

Then update branch-isolation gates and health-audit wording to use this definition instead of the crude `created_at_page != null` test. This matters because otherwise valid bootstrap seed blocks can be falsely flagged as illegal global-author-pool dependencies.

### **P1 — Add a causal dependency threat scan**

This is the most important structural improvement.

Narrative planning research treats causal links and threats as central to story coherence. Worldloom currently enforces grounding and append-only deltas, but it does not explicitly ask: “Did this new event destroy a dependency that some still-open future choice, obligation, consequence, thread, or storylet relies on?”

Add a turn-cycle additional check:

causal_dependency_threat_scan: PASS | FAIL

It should run after the state delta is drafted and before hashes are computed. It checks:

choice_dependency_clobbered:

 severity: error

 condition: >

   A record grounding an emitted CHC is closed/superseded/moved/invalidated,

   but the CHC remains emitted or player-visible.

slt_precondition_clobbered:

 severity: warning | error

 condition: >

   A high-salience open debt had an eligible SLT before this turn, but the

   new delta destroys the SLT’s preconditions without closing, transferring,

   or replacing the debt.

affordance_dependency_clobbered:

 severity: error

 condition: >

   A visible affordance remains in PG.state_snapshot.visible_affordances

   after its grounding STLOC/STOBJ/STENT is no longer active, accessible,

   or located where the affordance says it is.

obligation_counterparty_unavailable_without_transfer:

 severity: error

 condition: >

   An entity owing or receiving an open OBL becomes dead, captive,

   offstage, incapacitated, or otherwise unavailable, but the obligation

   is neither closed nor transferred.

Add the same logic to health audit as a new structural subphase:

Phase 2g: Causal dependency health

This is not an act-structure feature. It does not ask where the story “should” go. It asks whether the current state still supports the obligations and choices it claims to support.

### **P1 — Add explicit `SE.resolution` for non-accept routes**

Right now `outcome_route: attempt` says success is uncertain, but the final result is encoded indirectly in `world_logic_rationale`, `SE.state_delta`, and the prose plan. That is too implicit for a system that wants to preserve agency.

Add an optional block to `SE`, required when `outcome_route` is `attempt`, `accommodate`, or `world_block`:

resolution:

 result: success | partial_success | failure | impossible | transformed | held_for_promotion

 reason_class: capability | opposition | resource_limit | world_invariant | knowledge_gap | social_block | chance | mixed | n_a

 player_visible_feedback: >

   One-sentence statement of what the player should be able to perceive

   about why the action resolved this way.

Validation:

route_resolution_consistency:

 accept:

   allowed_results: [success, null]

 attempt:

   allowed_results: [success, partial_success, failure]

 accommodate:

   allowed_results: [partial_success, transformed]

 world_block:

   allowed_results: [impossible, failure]

 promotion_hold:

   allowed_results: [held_for_promotion, null]

 terminal:

   allowed_results: [success, partial_success, failure, transformed, null]

Then require page-plan §7 to include `resolution.player_visible_feedback`, and make prose-attach verify that the feedback is actually visible in prose. This is supported by agency research: users tolerate constraint far better when the system acknowledges their action and gives meaningful immediate feedback.

### **P1 — Add a story-level agency contract to `STORY_KERNEL.md`**

Do not put this into atomic state. Put it in `STORY_KERNEL.md`, because it is a story-level authorial contract.

Add a required section:

## Player Agency Contract

- **Agency surface:** Which STENT record(s) the player primarily controls.

- **Control style:** direct action, intent declaration, dialogue choice, tactical instruction, or mixed.

- **Write-in envelope:** What kinds of manual actions are admissible.

- **Impossible-action policy:** Impossible actions still produce a page via world_block.

- **Consequence visibility promise:** How quickly the story should make transformed, failed, blocked, or partially successful actions perceptible.

- **Viewpoint limits:** Whether the player can act on knowledge the viewpoint character lacks.

Bootstrap should draft this. Turn-cycle should read it when parsing `manual_action_text`. Prose-attach should use it to flag prose that implies a broader or narrower agency surface than the story state permits.

This keeps user agency explicit without inventing an act model.

### **P1 — Strengthen witness and perception discipline**

Your `BEL` model is already the right abstraction. The missing piece is an expected-witness pass.

Do **not** add a full autonomous perception simulator yet. Add deterministic validation first.

In turn-cycle Phase 4, compute:

expected_witnesses:

 direct:

   - active STENT records at the event location with agency not unconscious/dead/incapacitated

 indirect:

   - public or factional holders when the event occurs through law, ritual, bureaucracy, artifact circulation, public violence, or visible environmental change

 excluded:

   - STENT records concealed, offstage, unconscious, socially barred, or lacking access

Then require one of the following for each relevant witness group:

BEL created/superseded:

 - knows true event

 - suspects unknown/partly_true event

 - misremembers partly_true/false event

 - reports rumor

 - deceives with false claim

or explicit non-propagation rationale:

 - no witness

 - witness incapacitated

 - evidence concealed

 - institution suppresses report

 - event leaves no accessible trace

This can initially live in the turn-cycle validation trace and health audit; no schema addition is required. If it becomes too hard to audit from derived state alone, then add a small optional `SE.perception` block later:

perception:

 apparent_to: [STENT-<integer> | group:<name> | public]

 concealed_from: [STENT-<integer> | group:<name> | public]

 evidence_left: [record_id]

My recommendation: **do not add `SE.perception` yet**. First try the validation pass using `STSTAT.location`, event targets, active `BEL`, and active `DA` / `STOBJ` evidence. Schema-minimalism is worth protecting.

### **P2 — Add non-act pressure timing through derived predicates**

You already have `urgency` on `OBL`, `CNSQ`, `THR`, and `STINT`, and health audit flags high-urgency debt ignored beyond fixed page thresholds. That is good, but too coarse.

Add predicate DSL support for age and urgency rather than adding act timers:

record_age(<record_id | bound:<alias>>, >= | <= | == | !=, <integer_pages>)

urgency_at_least(<record_id | bound:<alias>>, low | medium | high)

These are derivable from `created_at_page`, `branch_path`, and existing `urgency`, so they preserve schema minimalism.

Example `SLT` preconditions:

preconditions:

 hard:

   - any_consequence_pending(pending_fallout, urgency=high)

   - record_age(bound:pending_fallout, >=, 3)

This allows pressure to mature causally: ignored debts escalate because they have been ignored, not because the story has reached Act II.

### **P2 — Add health-audit `sifting` mode**

Add a new optional mode to `branching-story-health-audit`:

mode: structural | prose | remediation | cross_story | sifting

This mode should not report “errors” by default. It should report **opportunities** detected from the actual event chronicle.

Candidate sifting patterns:

deception_ready_to_surface:

 pattern: >

   BEL.deceives exists, at least one witness BEL.suspects exists,

   and evidence_left exists through STOBJ/DA/public consequence.

relationship_reversal_available:

 pattern: >

   SREL axis changed by two or more values across branch_path,

   but no bond_shift/status_shift recovery or confrontation block has followed.

debt_payoff_ready:

 pattern: >

   OBL/CNSQ/THR high urgency, age >= threshold, eligible actors present,

   and at least one affordance can engage it.

blocked_action_repetition:

 pattern: >

   Same action_family receives world_block more than once without a

   newly visible explanation or alternative affordance.

canon_candidate_pressure:

 pattern: >

   canon_candidate or promotion_hold exists, but supporting prose or

   witness BEL chain is incomplete.

terminal_setup_available:

 pattern: >

   high-salience debts are either resolved, transferred, or abandoned,

   and remaining continuation blocks are low-salience only.

Output these as `SAU` findings with severity `info` or a new label like `opportunity`. If remediation is requested, produce RSP cards.

This is story-sifting, not drama management. It does not steer toward a predetermined climax; it surfaces patterns already present in state. That distinction matters. Story-sifting research is about detecting meaningful sequences or patterns from simulated chronicles, which is exactly what this audit mode should do.

### **P2 — Replace simple SLT coverage with a state-demand coverage matrix**

Commitment-block-authoring already has coverage targets such as recovery, belief repair, movement, bond shift, consequence resolution, investigation, disclosure, opposition, negotiation, and fallback continuation. Good. But the current list is still hand-authored and slightly genre-shaped. Make it more state-driven.

Add a generated coverage matrix to `commitment-block-authoring` and health audit:

coverage_matrix:

 by_action_family:

   move: count

   evade: count

   pursue: count

   perceive: count

   investigate: count

   communicate: count

   persuade: count

   negotiate: count

   bond: count

   oppose: count

   harm: count

   protect: count

   control: count

   transfer: count

   use: count

   make_change: count

   ritual_protocol: count

   recover: count

   wait: count

   decide: count

 by_state_debt:

   open_obligation: count

   pending_consequence: count

   active_thread: count

   active_intention: count

 by_social_state:

   belief_change: count

   relationship_change: count

   public_visibility_change: count

   secret_or_deception_handling: count

 by_route_recovery:

   attempt_failure_followup: count

   world_block_followup: count

   accommodation_followup: count

   terminal_setup: count

Then add audit findings:

slt_pool_missing_route_recovery:

 severity: warning

 condition: >

   The bundle has attempt/world_block/accommodate routes in recent history

   but no eligible recovery/explanation/fallback block.

slt_pool_social_blind_spot:

 severity: warning

 condition: >

   Active BEL/SREL records exist, but no eligible block can alter, expose,

   repair, or exploit belief/relationship state.

slt_pool_debt_blind_spot:

 severity: warning

 condition: >

   Open OBL/CNSQ/THR/STINT exists at medium/high urgency, but no block

   can engage it.

This will reduce overuse of runtime JIT blocks and make author-pool growth more intentional.

### **P2 — Add prose-attach `choice_consequence_visibility`**

Prose-attach currently validates engine-jargon leaks, forbidden mystery resolution, required event rendering, entity status, structural inventions, canon claims, and optional craft. Good. Add one more check:

choice_consequence_visibility: PASS | WARN | FAIL

Definition:

PASS:

 The prose makes the selected action, route, and immediate consequence

 legible to a first-time reader.

WARN:

 The action occurred, but the causal consequence or route feedback is easy

 to miss.

FAIL:

 The prose obscures, contradicts, or omits the consequence of the selected

 action, especially for attempt, accommodate, world_block, promotion_hold,

 or terminal routes.

This pairs naturally with `SE.resolution.player_visible_feedback`.

It is important because player agency is not just having choices. It is seeing that the system understood the choice and seeing why the world responded as it did.

### **P3 — Do not add autonomous NPC agents yet**

Versu and Comme il Faut are tempting here, but a full utility-based social simulation would be premature.

Worldloom already has the key load-bearing ingredients: `STINT`, `BEL`, `SREL`, `OBL`, `CNSQ`, `THR`, saliency, and predicate-gated commitment blocks. Add stronger selection, witness, coverage, and sifting first.

A future NPC initiative system can be layered as:

NPC initiative = runtime_jit SLT selection

 seeded by:

   - active STINT urgency

   - SREL axis pressure

   - BEL truth_relation / visibility

   - OBL owed_by / owed_to

   - affordance_available_to(actor, action_family)

But do not create a new agent architecture now. It will explode schema and validation burden before you know whether the current causal-state pipeline is insufficient.

### **P3 — Do not store natural-language triggers as executable storylet logic**

Drama Llama is interesting because it combines LLMs with storylets and lets authors define triggers in natural language, but the paper also motivates the hybrid approach by noting that pure LLM systems struggle with structurelessness and lack of pushback.

For Worldloom, natural language can help **draft** predicates, but executable storylet eligibility should remain the closed predicate DSL. This is one of the best decisions in the current system. Store canonical trigger logic as predicates, not prose.

## **Skill-by-skill amendment plan**

### **`story-state-contract.md`**

Amend minimally:

1. Define `bundle_genesis_record` and `branch_local_record`.  
2. Add optional `SE.resolution`, required for `attempt`, `accommodate`, and `world_block`.  
3. Add predicate DSL forms:

    record_age(record_id | bound:<alias>, comparator, integer_pages)  
   urgency_at_least(record_id | bound:<alias>, low | medium | high)

4. Add hard-gate note under plan grounding: emitted choices must not depend on clobbered records.  
5. Add prose receipt field:

    choice_consequence_visibility: PASS | WARN | FAIL

### **`branching-story-bootstrap`**

Add a `STORY_KERNEL.md` section for the Player Agency Contract. Keep it direct-write, not atomic state.

Also update global-author-pool seed-block rules so they can lawfully reference genesis records but not later branch-local records.

### **`branching-story-turn-cycle`**

Add:

1. `causal_dependency_threat_scan` as a turn-cycle-additional check.  
2. `SE.resolution` drafting for `attempt`, `accommodate`, and `world_block`.  
3. Expected-witness validation in Phase 4.  
4. Schema wording fixes:  
   * `STINT` abandonment = close old intention, optionally create transferred replacement.  
   * `SREL` severance/mourning = supersede axis/value/valence/description.  
   * `STOBJ.controlled_by` → `STOBJ.owner/current_location`.

The current turn-cycle is already the core engine. These changes make it auditable at the points where interactive stories usually break: failed attempts, invalidated dependencies, unseen consequences, and knowledge leaks.

### **`commitment-block-authoring`**

Add the coverage matrix and require direct batches to cover at least:

1. one debt-engagement block,  
2. one social-state block,  
3. one route-recovery block,  
4. one affordance-changing block,  
5. one fallback continuation block.

Also allow `record_age(...)` predicates in block preconditions so pressure can mature without act timing.

### **`branching-story-health-audit`**

Add:

1. `Phase 2g: Causal dependency health`.  
2. Optional `sifting` mode.  
3. Schema wording fixes:  
   * `SREL.basis` → `SREL.derived_from`.  
   * branch-local detection uses `bundle_genesis_record` / `branch_local_record`, not just `created_at_page`.

The existing health audit is already strong; this turns it from “find broken state” into “find broken state plus causal opportunities.”

### **`branching-story-prose-attach`**

Add:

choice_consequence_visibility: PASS | WARN | FAIL

Tie this to `SE.resolution.player_visible_feedback`. A page that routes a player action to `world_block` but hides why it failed should not pass cleanly.

### **`story-fact-promotion-to-canon`**

No major structural change. The proposal package already does the right thing: branch truth is evidence, not world authority; forbidden mysteries abort; scope inflation is checked.

Possible small improvement: when a promotion candidate emerges from `SE.resolution.result: held_for_promotion`, include the resolution feedback in the proposal package’s evidence narrative.

### **`story-promotion-closeout`**

No major structural change. Keep it ledger-first and append-only. After closeout, recommend—but do not automatically invoke—a health audit to catch branch-local contradictions introduced by the new canon-linked fact.

## **Recommended implementation order**

### **First pass: correctness hardening**

Do these before production stories:

1. Fix schema-reference slips.  
2. Define genesis-record vs branch-local-record semantics.  
3. Add causal dependency threat scan.  
4. Add `SE.resolution`.  
5. Add prose-attach `choice_consequence_visibility`.

This gives you the biggest reduction in future story corruption.

### **Second pass: better continuation quality**

Then add:

1. expected-witness validation,  
2. `record_age` / `urgency_at_least` predicates,  
3. SLT coverage matrix,  
4. direct-batch coverage requirements.

This reduces bland JIT blocks and missed consequences.

### **Third pass: emergent opportunity support**

Finally add:

1. health-audit `sifting` mode,  
2. opportunity-style RSP cards,  
3. pattern library for deception, debt payoff, relationship reversal, repeated blocked action, and promotion evidence.

This gives authors power without introducing a drama manager.

## **Things I would explicitly not do**

Do **not** add acts, act labels, midpoint logic, climax obligations, or “shape preservation.” Your own foundation document is correct: interactive branches need present causal obligations, not future dramatic obligations.

Do **not** add a global drama manager. It will reintroduce railroading under a more technical name.

Do **not** replace the predicate DSL with natural-language storylet triggers. Use LLMs to draft and critique predicates, but keep executable eligibility deterministic.

Do **not** add full autonomous NPC simulation yet. Strengthen `BEL`, `SREL`, `STINT`, `OBL`, `CNSQ`, and `SLT` first.

Do **not** make rendered prose authoritative. The plan-authority boundary is one of the best parts of the system.

## **Final recommendation**

Keep the architecture. It is already pointed at the right target: **a causal promise machine**, not a plot machine.

The highest-value changes are small but sharp: fix schema wording, define genesis/global scope, add causal-threat detection, make non-accept outcomes structurally explicit, verify witness propagation, add pressure-age predicates, and give health audit a story-sifting mode. That will strengthen branching stories without ever asking whether the branch is “in Act II” or whether the player has broken the planned climax.

