## **Verdict**

The skill is **conceptually strong**: it understands that a branching-story bootstrap is not “write an opening page,” but a causal-state initialization problem. The best parts are the hard mystery/invariant firewall, story-local fact layer, obligation ledger, state snapshot, storylet seed pool, and explicit choice contracts. That is the right architecture for a system that must survive arbitrary later player choices.

But I would not ship it unchanged. It has several **pipeline-level contradictions** that can leave partial bundles, several **schema/template mismatches** that will create bad records or confusing runtime semantics, and a few **narrative-design gaps** that will produce technically valid but dramatically flat openings.

The biggest fixes are: make Phase 11 honestly transactional or explicitly resumable; repair STENT/STINT/SF defaults; widen invariant validation beyond applied_event_ops; add a real narrative-interest model; and make choice/storylet continuation validation state-valid rather than merely present.

---

## **What the skill already gets right**

The strongest design choice is that it treats the story bundle as a **causal-engine seed**, not as a prose artifact. The final rule explicitly says the bundle is only bootstrapped when ledgers, intentions, obligations, storylets, branches, pages, choices, firewall state, and recursive closure are all present, not merely when PG-0001 prose exists. That is exactly the right instinct for interactive fiction runtime stability.

It also aligns well with storylet theory. Emily Short describes storylets as atomic, recombinable narrative units with prerequisites and world-state effects; your pipeline’s storylet pool, hard preconditions, fact effects, obligation openings, and continuation checks are all in that tradition. The Twine Cookbook similarly frames storylets as nonlinear content selected by requirements rather than fixed links, which matches your seed-pool-plus-state approach.

The Phase 1 “designing principle” requirement is also excellent. It prevents the common failure where an LLM turns a premise into “events in order with vibes.” Your reference correctly demands a unique unfolding process rather than plot, chronology, or genre. That maps cleanly onto Aristotle’s insistence that plot is an organized whole with causal sequence rather than arbitrary incident order.

---

## **Critical issues**

### **1. Phase 11 is not actually atomic**

The docs repeatedly call the output a “single transaction,” but Phase 11 first creates directories, then writes STORY_KERNEL.md, then submits YAML through the patch engine, then writes prose and indexes. That means a failed patch submit can leave a directory and STORY_KERNEL.md; a later markdown failure can leave committed YAML without prose or indexes. The skill acknowledges partial-failure recovery, but that contradicts the “single transaction” claim.

This is not just wording. Because pre-flight refuses to overwrite an existing stories/<story-slug>/, a failed run can poison the slug and force manual cleanup before retry. The per-world index being last is good, but it only prevents discoverability; it does not prevent a broken bundle.

**Fix:** rename the phase to “staged commit,” add a .bootstrap-in-progress marker, and make retry/cleanup explicit. Better: write all markdown to temp paths, validate the patch plan, submit YAML, then atomically rename/copy markdown into place, then remove the marker. If any post-engine markdown write fails, write BOOTSTRAP_INCOMPLETE.md with the exact repair steps. Do not describe it as a single transaction unless the patch engine can write every artifact, including markdown.

---

### **2. The consequences ledger is contradictory**

Phase 5 says the consequences ledger is initialized as an empty directory, with consequences_pending: [] and consequences_addressed: [] on PG-0001. But SKILL.md’s tree shows CNSQ-NNNN.yaml “initialized empty at PG-0001,” and Phase 11 includes create_cnsq_record in the patch-plan op list.

The envelope reference also lists expected ID allocation classes but omits cnsq_ids and story-local da_ids, even though the op mapping includes create_cnsq_record and append_story_diegetic_artifact_record.

**Fix:** choose one model.

For bootstrap, I strongly recommend: no CNSQ-NNNN records at PG-0001 unless the premise explicitly starts after a consequence has already landed. Otherwise create only the directory and set consequences_pending: []. Remove create_cnsq_record from the default op list, or mark it conditional. Add cnsq_ids and da_ids to expected_id_allocations when those records are actually emitted.

---

### **3. STENT/STINT identity fields are confused**

The STENT example is internally inconsistent: it has character_id: CHAR-0007, role protagonist, and world_ent_id: ENT-0042, while the comment says world_ent_id must be null for character mirrors.

The STINT template is worse: it uses character_id: STENT-0001. That field name implies a world CHAR-NNNN, but the value is a story entity ID. Elsewhere, the docs say STINT’s character_id field carries per-character semantics, while the STENT has its own character_id pointing to the world character. This will confuse humans and validators, and it will almost certainly cause brittle downstream code.

**Fix:** make the intention record explicit:

id: STINT-0001

story_id: STORY-0001

stent_id: STENT-0001

world_character_id: CHAR-0007   # null for story-only cast

Then update Phase 9 gate 6 from “linked by character_id” to “every protagonist and major has a STINT whose stent_id points to its STENT.” Keep character_id only on STENT, where it already means world CHAR-NNNN.

---

### **4. Gate 2 is too narrow to enforce invariant safety**

Phase 4 says invariant audit must run the premise, cast, initial threads, and initial obligations against every invariant. But Phase 9 gate 2 only checks that applied_event_ops respect invariant break conditions. At PG-0001, the genesis event has no real ops; the page record simply anchors the bedrock snapshot.

That means Phase 9 can pass even if an imported SF, an OBL, a THR, a storylet precondition, or a CHC implies an invariant violation. The earlier Phase 4 audit may catch it, but the final gate’s wording does not actually backstop the full state.

**Fix:** redefine gate 2 as:

Every initial SF, THR, OBL, SLT, PG state snapshot, and CHC likely effect is compatible with every loaded INV break_condition; the Phase 5 emitted records must match the Phase 4 audited sketch.

Add a phase4_audit_input_hash or audited_thread_obligation_sketch to STORY_KERNEL.md, then compare Phase 5 emitted records against it.

---

### **5. Gate 12 starts from the wrong root**

Gate 12 checks recursive reference closure for IDs “reachable from state_snapshot.” But several important IDs are not necessarily reachable from state_snapshot: PG-0001.emitted_choices, CHC records, the selected storylet_realized, choice continuation storylets, and maybe story-local diegetic artifacts.

**Fix:** define the closure root as PG-0001 itself, not just PG-0001.state_snapshot. Traverse:

PG-0001 → state_snapshot + storylet_realized + applied_event_ops + emitted_choices → CHC likely_effects / uses_fact / target / actor → referenced SF/STENT/STLOC/STOBJ/OBL/THR/SREL/STINT/SLT/DA.

This catches dangling choice and storylet references, which are exactly the references that will break the runtime next.

---

### **6. The prose cross-check is too strict about offstage character mentions**

Phase 7’s cross-check says: “Does the prose mention any character not in cast_present? → re-prompt.” But Phase 9’s prose-ledger gate is better: it only forbids introducing an entity as physically present unless in cast_present.

The cross-check should match the gate. A page must be able to mention an absent father, a remembered rival, a dead saint, a name on a letter, or a rumored antagonist without staging them physically in the room.

**Fix:** change the check to:

Does the prose stage any entity as physically present, acting, speaking, being perceived directly, or available for immediate interaction unless in cast_present? If yes, re-prompt. Mere mention, memory, rumor, inscription, or offstage reference is allowed if grounded in reader_known_facts, belief_state_by_actor, DA content, or POV-accessible state.

---

### **7. Fact visibility defaults risk leaking secrets**

The SF template sets visible_to_reader: true in the example. Phase 3 correctly says canonical-but-secret facts must not automatically populate known_by, but it does not equally protect reader visibility.

In a mystery-heavy branching story, this is dangerous. A fact can be objective and true while neither the cast nor the reader should know it yet. If visible_to_reader defaults true, choice generation and prose assembly may leak hidden facts through labels or narration.

**Fix:** default visible_to_reader: false for objective imported facts unless the opening page, POV horizon, or deliberate dramatic irony exposes them. Add a reader_visibility_basis field:

visible_to_reader: false

reader_visibility_basis: unrevealed_objective_truth

Allowed values could be shown_in_pg0001, known_to_pov, dramatic_irony, diegetic_artifact_visible, unrevealed_objective_truth.

---

### **8. The seed storylet pool is under-scaled and not scale-aware**

The argument list says intended_scale is used by Phase 6 sizing, but Phase 6 mostly specifies a default ~20 storylets and fixed bootstrap-mix weights.

That may be okay for a one-shot or one chapter. It is too small for an arc or open-ended story, especially with multiple major cast members and high-salience obligations. The shape weights can also exceed the target if there are many non-protagonist majors.

**Fix:** compute pool size from scale and state complexity:

base_by_scale:

 one_shot: 14-18

 chapter: 18-26

 arc: 32-48

 open_ended: 45-70

add:

 +2 per major non-protagonist

 +2 per high-salience OBL

 +1 per active mystery-edge

 +1 per accessible location beyond root

Then cap or rebalance shape weights. If the user requests a seed size below the minimum coverage floor, Phase 6 should either raise the size automatically or record a warning in Phase 10.

---

## **Narrative-theory improvements**

### **9. Add a “dominant interaction grammar” to Phase 1**

Right now Phase 1 extracts genre, tone, designing principle, central dramatic question, POV, threads, obligations, cast tensions, location, and period. That is good, but it does not classify what kind of interaction the story primarily wants.

Marie-Laure Ryan’s interactive narrative work distinguishes plot types such as epic survival/action, dramatic interpersonal evolution, and epistemic mystery-solving; the important point for this skill is that the **kind of plot changes what user agency should mean**.

Add:

dominant_interaction_grammar:

 type: epistemic | dramatic | epic | institutional | survival | romance | moral_dilemma | hybrid

 player_primary_verb_set: [investigate, negotiate, conceal, flee, confess]

 agency_pleasure: discovery | pressure_management | intimacy_shift | tactical_survival | moral_cost

 failure_is_interesting_when: ...

This should feed Phase 6 storylet shape weights, Phase 7 root storylet selection, and Phase 8 choice-mode diversification.

---

### **10. Add a narrative-interest model: suspense, curiosity, surprise**

Your system has mysteries and obligations, but it does not explicitly plan the reader’s **information appetite**. Sternberg’s narrativity model treats curiosity, suspense, and surprise as master forces generated by the relation between represented events and disclosure order.

Add to STORY_KERNEL.md:

narrative_interest_mix:

 suspense: 0.4

 curiosity: 0.4

 surprise: 0.2

 primary_information_gap: "Why did X disappear?"

 primary_future_dread: "Whether Y reaches the city before Z"

 allowed_surprise_sources:

   - reversal_of_motive

   - hidden_cost

 forbidden_surprise_sources:

   - canon-violating reveal

   - unsupported betrayal

Then require each storylet and each CHC to declare which interest it serves. This prevents a seed pool from being mechanically diverse but emotionally monotonous.

---

### **11. Track focalization, not just POV mode**

The template has pov_mode, but it does not force per-page focalization discipline. Genette’s narratological model separates voice, narration time, and perspective/focalization; focalization specifically governs what information is selected through the perceiving consciousness.

For generated prose, this matters more than generic “single / rotating / omniscient.” Add to PG records:

focalization:

 mode: internal | external | zero

 focalizer: STENT-0001 | null

 narration_time: simultaneous | subsequent | interpolated

 voice_person: first | second | third

 access_rules:

   can_access_private_thoughts_of: [STENT-0001]

   can_report_hidden_facts: false

Then add a Phase 7 critic axis: “focalization breach.” This will catch accidental omniscience, which is one of the most common LLM prose failures.

---

### **12. Require a scene turn in PG-0001**

Phase 7 asks the page to stop when the beat is complete and choices naturally emerge, which is good. But it does not require a **turn**: a before/after change in pressure, knowledge, relationship, danger, or commitment.

Without that, the opening can be atmospheric and ledger-consistent but dramatically inert.

Add a post-render check:

PG-0001 scene_turn:

 before_state: ...

 intrusive_change: ...

 after_state: ...

 new_affordances_created: [...]

If no new affordance exists, the prose should fail even if it is well-written.

---

## **Choice-generation issues**

### **13. “At least one continuation storylet” is too weak**

Phase 8 requires every CHC to have at least one continuation storylet in the seed pool or be marked jit_generatable. That prevents hard dead ends, but it does not prove the continuation is valid **after the choice’s minimum state change**.

A continuation storylet might exist but not match the post-choice state, actor, location, obligation, or mystery-safety constraints.

**Fix:** validate each CHC against simulated post-choice deltas:

continuation_capacity:

 post_choice_delta:

   facts_added_or_changed: [...]

   obligations_changed: [...]

   location_changed: ...

   relationship_changed: ...

 valid_seed_storylets: [SLT-0007, SLT-0014]

 jit_shape_spec: null

 validation_basis: "hard_preconds satisfied after simulated minimum_state_change"

Gate 11 should fail if the continuation only exists abstractly.

---

### **14. Add semantic-distance validation between choices**

Phase 8 requires choices to cover main thread, relationship, OBL, less-obvious path, multiple modes, and multiple poetic effects. That is good, but two choices can still be cosmetic variants: “Question the guard” and “Press the guard harder” may share actor, target, operation, and likely effects.

**Fix:** add a choice_set_semantic_distance gate. Each pair of choices should differ in at least two of:

operation, actor, target, risk, minimum_state_change, obligation_engaged, relationship_vector, information_gain, location_vector, moral_cost.

---

### **15. Generate choices from the rendered page, not only state/storylet templates**

Phase 8 uses the state snapshot and selected storylet templates as anchors. But the actual prose may emphasize an object, gesture, line of dialogue, or emotional rupture not fully represented in the storylet template.

**Fix:** add a step between Phase 7 and Phase 8:

Phase 7.5: Visible Affordance Extraction

- parse PG-0001 prose for visible actors, objects, tensions, questions, exits, threats, unsaid offers

- map each to state IDs or reject as ungrounded

- feed these visible affordances into Phase 8

This prevents the runtime from offering choices that are technically legal but not psychologically available to the reader.

---

## **Schema and template issues**

### **16. The permissive JSON schemas make operator discipline too load-bearing**

The engine reference says story-bundle schemas require only id and story_id, with most fields enforced by discipline rather than JSON schema. That flexibility is useful, but the skill relies on many soft-required fields for runtime correctness: epistemic_class, possible_payoff_modes, state_snapshot, choice_contract, character_id / STINT linkage, etc.

**Fix:** add a bootstrap-specific strict validator before Phase 10. It does not need to be the global schema. It can be a local “skill conformance validator” that fails missing soft-required fields before the user ever sees the approval summary.

---

### **17. canon_revision: "" should be null**

The pre-flight reference says canon_revision should be the highest CH-NNNN, or null if the world has no CH records. But story-records.yaml uses empty strings for BR.canon_revision and PG.state_snapshot.canon_revision.

**Fix:** use null everywhere for no revision. Empty string is neither a valid CH id nor an intentional absence value.

---

### **18. STORY_KERNEL and INDEX shape labels disagree**

Phase 6 and STORY_KERNEL use shapes like entry_pressure, cast_introduction, threat_escalation, relational_dynamics, routine_disruption, aftermath_sequel, and reflection_dilemma. But the bundle index template summarizes shapes as opening, escalation, relational, routine, aftermath, reflection, other.

**Fix:** use the exact same enum everywhere. Do not summarize with near-synonyms in machine-consumed index files.

---

### **19. Storylet ID assignment timing is risky**

Phase 6 says the delegated storylet-pool authoring subroutine returns approved SLT records in memory, and bootstrap assigns final IDs later. If any storylet preconditions, validation summaries, choice templates, continuation references, or coverage caches refer to provisional IDs, late remapping can create dangling references.

**Fix:** preallocate the SLT IDs before calling the subroutine, or require the subroutine to use symbolic IDs that are remapped through an explicit closure pass:

id_map:

 ROOT_ENTRY: SLT-0001

 REL_CONFRONTATION_A: SLT-0002

Then run recursive reference closure after remapping.

---

## **What I would add to the pipeline**

The highest-value addition is a **Phase 1.5 Narrative Architecture Pass**:

narrative_architecture:

 dominant_interaction_grammar: epistemic | dramatic | epic | hybrid

 agency_pleasure: discovery | intimacy | survival | moral_cost | strategy

 narrative_interest_mix:

   suspense: 0.4

   curiosity: 0.4

   surprise: 0.2

 focalization_default:

   mode: internal

   focalizer: STENT-0001

   voice_person: third

   narration_time: simultaneous

 root_scene_contract:

   initial_stability: ...

   intrusive_change: ...

   scene_turn_required: true

   choice_affordance_floor: 3

Then use that pass to drive:

Phase 6 storylet weights, Phase 7 root storylet selection, Phase 7 prose critique, Phase 8 choice diversity, and Phase 9 validation.

This would make the skill better at producing a story that has not only canonical safety and runtime coherence, but an actual **pleasure engine**: the reader knows what kind of attention the story is asking from them.

---

## **Priority fix list**

1. **Repair Phase 11 staging/atomicity.** Add .bootstrap-in-progress, move STORY_KERNEL.md write after successful YAML submit or make failure recovery explicit.  
2. **Fix STENT/STINT field semantics.** Use stent_id plus world_character_id; correct the STENT example’s world_ent_id.  
3. **Make consequences and artifacts conditional.** Remove default create_cnsq_record; add cnsq_ids / da_ids allocations when used.  
4. **Rewrite Gate 2.** Check all initial records and choice/storylet implications against invariants, not only applied_event_ops.  
5. **Rewrite Gate 12.** Traverse from PG-0001, not just state_snapshot.  
6. **Change SF visibility defaults.** visible_to_reader: false unless justified.  
7. **Relax the prose character cross-check.** Forbid ungrounded physical presence, not offstage mentions.  
8. **Add narrative-interest and focalization fields.** This is the biggest prose-quality upgrade.  
9. **Make storylet pool sizing scale-aware.**  
10. **Validate CHC continuations against simulated post-choice state.**

My strongest opinion: the architecture is already unusually good for causal branching fiction, but it is currently more robust as a **state machine** than as a **dramatic machine**. The next improvement should not be more records; it should be stronger validation that every record contributes to pressure, disclosure, agency, or scene change.

