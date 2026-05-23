# **Research-Driven STCHAR ↔ SLT ↔ CHC Consolidation Architecture Proposal**

## **1. Executive verdict**

**The current architecture is basically right in its foundations, but not strong enough at the causal boundary where STCHAR-shaped character pressure becomes SLT commitments and CHC player-facing choices. Breaking changes are warranted.**

Worldloom already has the right high-level separation:

STCHAR = durable story-local character authority  
STPLAN/STEMO/BEL/SREL/CLK/THR/STQ/etc. = current branch-local pressure/state  
SLT = causal commitment block / reusable or JIT causal move  
CHC = player-facing choice emitted at a page hinge  
SE = actual causal event / state transition  
PG = page snapshot + emitted choices  
page plan §16a = page-local projection of STCHAR + active state

That is the correct skeleton. The repo’s shared contract already says rendered prose is not authority, STCHAR is stable story-local authority, and page plans compose STCHAR with active story records rather than mutating STCHAR into current state. The live schemas and validators already enforce many important pieces: active STENT→STCHAR binding, active STCHAR page presence, no world `CHAR-*` runtime leaks, page-plan §16a packet integrity, prose-receipt STCHAR integrity, selected CHC/SLT trace closure, observer firewall, active STPLAN/STEMO grounding, and choice-set noncollapse.

**But the current causal order is still too player-choice-first.** The current turn-cycle begins from selected CHC or write-in, then selects or JITs a commitment block, then writes the SE state delta and next PG/CHCs. That makes player choice the dominant causal initiator even though the story model also has active NPC plans, emotions, clocks, threats, secrets, questions, relationships, and offstage actors.

The preferred target architecture is:

active STCHAR + active state pressures + world/clock/thread/story-question pressure  
       ↓  
turn driver selected or inherited  
       ↓  
candidate commitments generated / matched / JIT-instantiated  
       ↓  
SLT pattern or branch-local SLT instance selected  
       ↓  
player-facing CHCs emitted as initiations, reactions, evasions, refusals, continuations, or moral stances  
       ↓  
selected CHC resolves through explicit binding policy  
       ↓  
SE records the actual instantiated commitment trace

**Strong recommendation:** adopt a **driver-first candidate commitment pipeline** with a **hybrid CHC binding model** and **SLT grounding provenance**.

The current `CHC.associated_commitment_block: SLT|null` should be replaced by a binding object. Direct pre-binding should survive only as one binding mode. Late-bound intent and candidate-SLT binding should become first-class because the stale-choice problem is real: a choice emitted before later storylets exist cannot lawfully bind to a better-fitting later SLT under the current scalar association model. The existing selected-trace validator currently resolves emitted choices by matching the selected SLT against `associated_commitment_block`, which proves the current system is structurally tied to direct association.

This is not novelty for its own sake. It is a consolidation of what Worldloom already wants to be: character-and-pressure-first causality, with player agency expressed through meaningful response surfaces rather than every page being implicitly initiated by a menu click.

---

## **2. Evidence discipline**

**Repository:** `joeloverbeck/worldloom`  
 **Default branch:** `main`  
 **Verified current `main` SHA:** `fd488d93dd55d29258c36f5090c0cff9cbbd82c5`  
 **User-provided short SHA:** `fd488d9`, verified as resolving to the current full `main` SHA.

**Manifest used:**

The user uploaded `manifest_2026-05-23(3).txt`, which I used as the initial inventory. A fresh current-main manifest also exists in the repo at `reports/manifest_2026-05-23.txt`, and I fetched it directly at `fd488d93dd55d29258c36f5090c0cff9cbbd82c5`; because the user instructed that a fresh manifest should be preferred if present, this repo manifest became the preferred inventory.

**Repository access discipline followed:**

1. repo metadata  
2. current main branch SHA  
3. tree manifest  
4. targeted file fetches from exact main SHA  
5. analysis

No repository clone was used. No GitHub code search was used. No snippet-based search results were used as evidence. Archived reports were not used as current authority. Active reports were consulted only as context and never allowed to override live contracts, schemas, skills, or validators.

**Directly fetched active files used as evidence at exact SHA:**

Constitutional and shared contracts:

* `docs/FOUNDATIONS.md`  
* `docs/CONTEXT-PACKET-CONTRACT.md`  
* `docs/HARD-GATE-DISCIPLINE.md`  
* `docs/MACHINE-FACING-LAYER.md`  
* `.claude/skills/_shared-templates/story-state-contract.md`  
* `.claude/skills/_shared-templates/story-record-schemas.md`

Story skills:

* `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md`  
* `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`  
* `.claude/skills/branching-story-turn-cycle/SKILL.md`  
* `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`  
* `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md`  
* `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`  
* `.claude/skills/commitment-block-authoring/SKILL.md`  
* `.claude/skills/story-character-profile/SKILL.md`

Schemas:

* `tools/validators/src/schemas/story-character-authority.schema.json`  
* `tools/validators/src/schemas/story-choice.schema.json`  
* `tools/validators/src/schemas/story-storylet.schema.json`  
* `tools/validators/src/schemas/story-event.schema.json`  
* `tools/validators/src/schemas/story-plan.schema.json`  
* `tools/validators/src/schemas/story-emotion.schema.json`

Validators and registry:

* `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`  
* `tools/validators/src/rules/rule_choice_set_noncollapse.ts`  
* `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`  
* `tools/validators/src/structural/stent-requires-stchar.ts`  
* `tools/validators/src/structural/stchar-active-for-bound-stent.ts`  
* `tools/validators/src/structural/stchar-bound-stent-reciprocity.ts`  
* `tools/validators/src/structural/no-char-authority-in-story-runtime.ts`  
* `tools/validators/src/structural/observer-firewall.ts`  
* `tools/validators/src/structural/introduction-observer-firewall.ts`  
* `tools/validators/src/structural/causal-dependency-threat-scan.ts`  
* `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts`  
* `tools/validators/src/structural/prose-receipt-stchar-integrity.ts`  
* `tools/validators/src/structural/stplan-holder-exists-and-active.ts`  
* `tools/validators/src/structural/stplan-root-intention-grounded.ts`  
* `tools/validators/src/structural/stplan-belief-basis-grounded.ts`  
* `tools/validators/src/structural/stemo-holder-exists-and-active.ts`  
* `tools/validators/src/structural/stemo-appraisal-basis-accessible-to-holder.ts`  
* `tools/validators/src/public/registry.ts`

Active reports consulted only as context:

* `reports/character-bridge-consolidation-first-iteration.md`  
* `reports/character-bridge-consolidation-second-iteration.md`  
* `reports/stchar-distillation-rework.md`

---

## **3. Current architecture map**

### **3.1 Current live flow**

The current turn-cycle flow is roughly:

Parent PG snapshot  
  ↓  
Player selects emitted CHC or writes in action  
  ↓  
Turn-cycle resolves action  
  ↓  
Eligible SLT selected from author pool OR branch-scoped runtime_jit SLT created  
  ↓  
SE records selected_slt_id, selection_source, alias_bindings, outcome_route, state_delta  
  ↓  
New / superseded / closed story records  
  ↓  
Child PG snapshot  
  ↓  
Page plan with §16a STCHAR packets + active state sections  
  ↓  
New CHC records emitted for next hinge

This is explicit in the turn-cycle skill and Phase 2–3 reference: selected CHC/write-in comes first, then SLT selection/JIT, then state delta, then page snapshot, page plan, and choices.

### **3.2 Current record responsibilities**

| Record / artifact | Current role | Strong current behavior | Weak seam |
| ----- | ----- | ----- | ----- |
| `STCHAR` | Durable story-local character authority. | Required for non-background STENTs; no runtime world `CHAR-*` leaks; page-plan packets derive from it. | CHC/SLT can cite STCHAR generally but not the operational axis used. |
| `STENT` | Story-local entity/person with `bound_stchar_id`. | Non-background STENT must bind STCHAR; reciprocal validator exists. | Offstage active STENTs may be causally important, but driver semantics are not first-class. |
| `STPLAN` | Active tactical plan held by an STENT. | Holder, root intention, belief basis, current step, resources, blockers are schema/validator-backed. | Current system validates plan integrity but does not require due plans to generate candidate commitments. |
| `STEMO` | Active affective/appraisal pressure. | Holder active; appraisal basis must be accessible; behavioral pressure is structured. | STEMO can ground choices, but no deterministic “emotion pressure produced candidate commitment” trace exists. |
| `SLT` | Commitment block / causal move. | Predicate/effect/exit-option schema is tight; blocks are causal moves, not arcs. | No required reason-to-exist provenance, no explicit STCHAR axis grounding, no reusable-pattern vs instance split. |
| `CHC` | Player-facing choice. | Must ground in active records; may cite STCHAR/STPLAN/STEMO/CLK/STSEC/STQ/STINT/SF. | Scalar `associated_commitment_block` creates stale-binding and direct-prebinding rigidity. |
| `SE` | Actual event and state transition. | Records `selected_slt_id`, `selection_source`, `alias_bindings`, state delta, introductions. | No `turn_driver`; current `event_kind` enum is too input-route-oriented. |
| `PG` | Snapshot of active state and emitted choices. | Active records include STCHAR/STPLAN/STEMO/CLK/STSEC/STQ/etc. | Page can show active pressures but not necessarily explain which became the turn driver. |
| Page plan §16a | Page-local STCHAR projection. | Full and offstage-causal packet tiers exist; validator checks missing/inactive/offstage misuse/current-state refs. | Role labels and demanded packet material need to be stronger and fail-fast. |

### **3.3 Current validator map**

STENT/STCHAR lifecycle:  
 stent_requires_stchar  
 stchar_bound_stent_reciprocity  
 stchar_active_for_bound_stent  
 stchar_body_integrity  
 stchar_source_fact_coverage  
 no_char_authority_in_story_runtime

Page/packet/prose:  
 page_plan_stchar_packet_integrity  
 prose_receipt_stchar_integrity  
 prose_receipt_hash_integrity  
 page_affordance_integrity

Choice/storylet/event:  
 rule_choice_set_noncollapse  
 chc_slt_selected_commitment_trace  
 causal_dependency_threat_scan  
 observer_firewall  
 introduction_observer_firewall  
 turn_cycle_output_grounding_integrity

Plans/emotions:  
 stplan_* validators  
 stemo_* validators

The registry confirms these are active validators, not dead files.

### **3.4 Core current defect**

The current architecture has **state authority** but lacks **driver authority**.

It knows what is active. It knows what a selected choice was associated with. It knows whether the selected SLT’s predicates/effects trace through. It does not yet have a first-class way to say:

This page is driven by Varro’s offstage plan becoming due,  
not by the player initiating a new action.

The player’s choices are reactions to that initiative.

The selected commitment was instantiated because STCHAR-7’s pressure behavior,  
STPLAN-9’s current step, CLK-3’s threshold, and THR-4’s threat all converged.

That is the missing consolidation layer.

---

## **4. Research synthesis**

### **4.1 Storylets and quality-based narrative**

Emily Short’s storylet definition is directly relevant: a storylet has content, prerequisites, and effects on world state; the point is flexibility, recombination, and interlocking with narrative circumstances rather than route-specific time-caves.

**Implication for Worldloom:** `SLT` should stay. The repo’s “commitment blocks are causal moves” discipline is research-aligned. The mistake would be treating SLTs as generic menu targets detached from active pressures. Storylets work because eligibility and effects are grounded. Therefore every SLT needs validator-visible **why-this-exists-now** provenance or a reusable pattern contract that explains how it becomes specific at binding time.

### **4.2 Drama management and experience management**

Façade is relevant because it integrated believable agents with a drama manager: character behavior and story control were not independent systems. Interactive storytelling architectures commonly distinguish a drama manager, user model, and agent model; the agent model can generate possible NPC actions while the drama manager keeps events coherent.

**Implication for Worldloom:** a pure player-choice-first architecture underuses the agent side. Worldloom should not add an opaque drama manager, but it should add an explicit **turn driver** field that records whether the current causal pressure came from the player, an NPC, offstage action, clock, world pressure, secret reveal, or multi-actor collision. This preserves authorial coherence without hiding causality.

### **4.3 Mimesis, automated drama management, and agency**

The broader interactive-storytelling literature frames agency as the player experiencing a story world that reacts coherently, not merely selecting from prewritten rails. Recent LLM interactive-drama work also treats immersion and agency as distinct, human-evaluated goals and explores techniques for aligning generated character reactions with player intention.

**Implication for Worldloom:** player agency does not require every turn to be initiated by the player. Agency can be stronger when the world acts and the player receives meaningful response choices. “Being hunted,” “being betrayed,” “being helped,” and “being trapped” are agency-rich if the player can respond with distinct commitments.

### **4.4 BDI and believable agents**

BDI separates beliefs, desires, intentions, plan selection, and plan execution; intentions imply commitment and temporal persistence, and plans can be hierarchical.

**Implication for Worldloom:** STCHAR must not absorb current plans or emotions. The repo is correct to keep STCHAR separate from BEL/STINT/STPLAN/STEMO. But active STPLAN/STEMO records must be allowed to **drive** SLT/CHC creation. NPCs become reactive when their plans and emotional pressures are only context for player menus rather than candidate causal drivers.

### **4.5 GOAP and HTN planning**

GOAP-style game AI uses actions with preconditions and effects and lets NPCs plan at runtime rather than hard-coding transitions; F.E.A.R. is the usual game-AI reference point for this style. HTN planning decomposes compound tasks into executable primitive tasks with ordering constraints and preconditions.

**Implication for Worldloom:** reusable causal moves are good, but only if they are parameterized and instantiated. The right split is:

Reusable SLT pattern:  
 "pursuer forces quarry from cover"

Instantiation:  
 Varro, humiliated and on a clock, fires into the kiln to flush Jon,  
 exposing Mara and generating player reaction choices.

Worldloom should not choose between generic reusable SLTs and tailored JIT SLTs. It needs a hybrid: reusable patterns plus branch-local commitment instances.

### **4.6 Multi-agent narrative planning**

IPOCL-style narrative planning argues that believable narratives need both causal plot progression and character intentionality: audiences understand stories better when character actions are backed by perceivable goals and commitments.

**Implication for Worldloom:** NPC initiative should be represented as intentional or pressure-driven causality, not as arbitrary author push. If an NPC acts, the SE should cite active STPLAN/STEMO/STCHAR/CLK/THR/etc. that explain why. The player does not need omniscient access to the NPC’s mind, but the system needs a lawful driver trace.

### **4.7 Interactive fiction and choice design**

Interactive works such as Until Dawn make choices consequential across relationships, survival, tone, and future scenes; Spec Ops: The Line is useful because it treats morally ambiguous choices as pressure on the player rather than transparent optimization buttons.

**Implication for Worldloom:** `choice_set_noncollapse` is necessary but insufficient. Distinct action families and grounding records are not the same as meaningful choices. Worldloom should validate deterministic choice axes—commitment, risk, affected actor, information position, opportunity cost—and leave literary force to judgment-assisted review.

### **4.8 LLM agent memory and planning systems**

Generative Agents stores observations, reflects over memory, retrieves relevant memories, plans behavior, and produces emergent social coordination; the ablation result that observation, planning, and reflection contribute to believability is directly relevant.

**Implication for Worldloom:** stable persona, current memory/state, and plan execution should remain separate. STCHAR is stable persona/authority; BEL/STPLAN/STEMO/SREL/CLK/etc. are current pressure; SLT/SE are action commitment and execution. The recommended architecture strengthens that separation instead of collapsing it.

---

## **5. Current pain points**

### **5.1 NPC reactivity**

The turn-cycle currently begins from selected CHC/write-in, which means the standard page loop makes the player the visible causal initiator. NPCs can have active STPLAN/STEMO records, but the system does not require those records to become the driver of a turn.

This is the user’s core concern, and it is valid. A mature branching story system needs pages where the player reacts to being hunted, shot at, seduced, trapped, pressured, helped, betrayed, rescued, accused, or interrupted.

### **5.2 Stale CHC→SLT binding**

The current `CHC` schema requires `associated_commitment_block` as `SLT|null`; the selected commitment trace validator resolves an emitted choice by finding a CHC whose `associated_commitment_block` matches the selected SLT.

That is too rigid. A choice emitted at `PG-7` might be conceptually correct, but by `PG-8` or after a clock fire, a more specific SLT may exist. The scalar field cannot express:

This choice promised “protect Mara by accepting exposure risk.”  
At selection time, bind it to the best current commitment satisfying that promise.

### **5.3 Generic/tailoring tension in SLTs**

The commitment-block skill already tells authors to load active STCHARs and cover pressure-bearing cast roles, including offstage actors; bootstrap seeding likewise requires offstage pressure-source representation.

But the `SLT` schema itself does not require `reason_to_exist`, causal-pressure provenance, STCHAR operational axes, or a reusable-pattern vs instantiated-commitment distinction. Schema-valid SLTs can still be too generic.

### **5.4 Choice quality**

The current noncollapse validator compares action families, grounded records, associated commitment block, and likely state pressure. That catches collapsed duplicate choices but not shallow choices that are technically distinct while dramatically equivalent.

Example of currently plausible but bad choice set:

1. Ask Mara what happened.  
2. Question Mara about the ambush.  
3. Press Mara for answers.

Even if the wording differs, the commitment may be identical.

### **5.5 Offstage active character pressure**

The page-plan contract already has reduced `offstage_causal` packets, and the validator knows offstage-causal packets are lawful only for offstage characters.

The gap is that offstage initiative is still mostly page-plan prose discipline, not first-class SE causality. An offstage actor can be “active,” but the architecture does not yet require a lawful driver trace:

offstage STENT + active STCHAR + active STPLAN/STEMO/CLK/THR → SE.turn_driver → reaction CHCs

### **5.6 Observer firewall for new initiative types**

The existing observer firewall checks `selected_choice` and `write_in_attempt` events for hidden-state leaks.

If new `npc_action`, `offstage_action`, or `clock_fire` driver types are introduced, observer-firewall logic must be extended. Otherwise, the system could accidentally expose offstage intent or hidden plans as player-visible knowledge.

### **5.7 Active-pressure exploitation gap**

Worldloom validates STPLAN/STEMO records internally: holders exist, beliefs are accessible, emotions have appraisal bases, and so on.

But it does not yet require high-urgency active records to be used, deferred, or rejected as candidate drivers. That means active world pressure can sit inert.

---

## **6. Architectural alternatives**

### **Alternative A — Preserve direct CHC→SLT pre-binding, add stricter validation**

**Description**

Keep `CHC.associated_commitment_block: SLT|null`, but add validators requiring:

CHC.associated_commitment_block exists or null with JIT rationale  
SLT predicates active at emission or selection  
STCHAR citations when character-dependent  
choice_set_noncollapse extended

**Player agency**

Simple and legible. A menu option is a promise to one known commitment block.

**NPC/offstage initiative**

Weak. NPC initiative still has to be smuggled through player-selected choices or author-created events outside the main loop.

**CHC/SLT binding**

Direct pre-binding remains the only strong mode. Late binding remains second-class.

**STCHAR use**

Can require CHCs and SLTs to cite STCHAR, but not enough to solve driver causality.

**Validator implications**

Lowest cost: update existing validators rather than replacing them.

**Pros**

* Fits current schema and validators.  
* Minimal change to world-index edges.  
* Easy to reason about exact commitments.

**Cons**

* Does not solve stale choices.  
* Keeps NPC/world pressure subordinate to player menu flow.  
* Encourages premature SLT creation.  
* Makes exact SLT availability too important at choice emission time.

**Research support**

Storylet systems do use prerequisites/effects, so exact binding is not inherently wrong. But storylets are valuable because they interlock with changing circumstances, and this alternative undercuts that flexibility.

**Repository fit**

High short-term fit, poor long-term fit.

**Verdict**

Reject as insufficient. Keep exact binding only as one mode.

---

### **Alternative B — Pure late-bound CHC intent model**

**Description**

Remove direct CHC→SLT association. Every CHC contains only intent semantics; at selection time the system chooses or JITs the best current SLT.

**Player agency**

Potentially strong if the intent is honored. Dangerous if the binding drifts and the player-visible label becomes a fake promise.

**NPC/offstage initiative**

Improves reaction choices because CHCs can be responses to a driver rather than pre-bound to a block.

**CHC/SLT binding**

All binding occurs at selection time.

**STCHAR use**

CHC intent can cite required STCHAR axes and active state records.

**Validator implications**

Harder. Validators must prove selected SLT satisfies intent signature, not merely that IDs match.

**Pros**

* Solves stale-choice problem cleanly.  
* Supports best-fit JIT.  
* Encourages commitment semantics over record-id coupling.

**Cons**

* Weakens exact player promise.  
* Can hide rails if binding policies are vague.  
* More difficult diagnostics.  
* Some choices really should freeze exact commitments.

**Research support**

GOAP and HTN support late planning from current state; LLM agent systems also plan from current memory/state.

**Repository fit**

Medium. It conflicts with current `associated_commitment_block` and selected-trace validator.

**Verdict**

Use late binding, but not exclusively.

---

### **Alternative C — Explicit turn-driver model without changing CHC binding**

**Description**

Add `turn_driver` to SE/page plan but leave `CHC.associated_commitment_block` unchanged.

**Player agency**

Improves clarity: player can react to NPC/world drivers.

**NPC/offstage initiative**

Strong improvement. NPC/world/clock pressure becomes visible in SE and page plan.

**CHC/SLT binding**

Still stale and scalar.

**STCHAR use**

Driver can cite STCHAR/STPLAN/STEMO/CLK/THR/etc.

**Validator implications**

Add driver validators and update observer firewall.

**Pros**

* Solves NPC reactivity partially.  
* Cleanly records why a page happened.  
* Fits existing SE centrality.

**Cons**

* Does not solve stale CHC binding.  
* Does not prevent generic SLTs.  
* Leaves old scalar binding as a bottleneck.

**Research support**

Drama management and multi-agent narrative planning strongly support recording whether causality is agent-, world-, or system-driven.

**Repository fit**

Good, because SE already records the causal event.

**Verdict**

Necessary but insufficient alone.

---

### **Alternative D — Dedicated commitment-intent / candidate-queue record**

**Description**

Introduce a new record type, for example `SCOM` or `STCAND`, representing candidate commitments before they become SLTs or selected SE commitments.

**Player agency**

Strong if candidates are player-visible promises or reaction surfaces.

**NPC/offstage initiative**

Strong. Candidate queue can contain NPC/world/clock-driven commitments.

**CHC/SLT binding**

Very clean: CHC binds to a commitment intent; intent resolves to SLT at execution.

**STCHAR use**

Candidate record can cite STCHAR axes, active pressures, driver records, and selection reasons.

**Validator implications**

Large. New schema, new lifecycle, new index edges, new validators.

**Pros**

* Architecturally pure.  
* Excellent auditability.  
* Solves stale binding and driver causality.

**Cons**

* Adds a new state layer.  
* Risks overengineering.  
* Current system can likely represent the same trace inside CHC binding + SE commitment.

**Research support**

Fits planning systems with candidate action sets, plan libraries, and runtime selection.

**Repository fit**

Medium-low initially. Worldloom already has many record classes.

**Verdict**

Defer. Add only if the recommended hybrid proves too cramped.

---

### **Alternative E — Recommended: driver-first candidate commitment pipeline with hybrid CHC binding and instantiated commitment trace**

**Description**

Add:

SE.turn_driver  
CHC.binding object  
SLT.grounding / creation provenance  
SE.commitment.binding_resolution  
SE.commitment.instantiated_commitment trace  
page-plan §7a turn-driver section  
page-plan §16a role-demand strengthening

**Player agency**

Strong. The player can initiate, respond, refuse, evade, sacrifice, investigate, disclose, delay, or reinterpret pressure. Player agency becomes commitment choice, not always causal initiation.

**NPC/offstage initiative**

Strong. NPC/world/clock actions can drive pages while remaining player-POV and observer-firewall-safe.

**CHC/SLT binding**

Hybrid:

* exact SLT binding when the commitment is already known and must be frozen;  
* candidate SLT set when several known SLTs can satisfy the promise;  
* late-bound intent when future/JIT selection is better;  
* rhetorical/no-SLT mode for expressive choices if explicitly marked.

**STCHAR use**

STCHAR shapes candidate creation, actor binding, eligibility, CHC wording, salience, and page-plan §16a packets. Character-dependent CHCs/SLTs cite specific STCHAR operational axes.

**Validator implications**

Moderate-high but tractable. Existing validators evolve rather than vanish.

**Pros**

* Solves stale-choice problem.  
* Solves NPC reactivity.  
* Preserves reusable SLTs.  
* Prevents generic SLT spam.  
* Gives deterministic validators real hooks.  
* Fits current STCHAR/STPLAN/STEMO architecture.

**Cons**

* Breaking schema change.  
* Requires skill updates across bootstrap, turn-cycle, commitment-block-authoring, health audit, and prose attach.  
* Requires validator rewrites for CHC/SLT trace.

**Research support**

This combines storylet prerequisites/effects, BDI plan commitment, GOAP/HTN action instantiation, drama-management driver awareness, and LLM-agent memory/planning separation.

**Repository fit**

Best long-term fit.

**Verdict**

Adopt.

---

## **7. Recommended architecture**

### **7.1 Preferred conceptual order**

Replace the current dominant order:

available SLTs → CHCs tagged to SLTs → player chooses CHC → selected SLT resolves

with:

active STCHAR + active state + world/clock/thread/story-question pressure  
  → candidate turn drivers  
  → candidate commitments  
  → match / instantiate / JIT SLT  
  → emit CHCs as player-facing initiation or reaction surfaces  
  → selected CHC resolves through explicit binding policy  
  → SE records instantiated commitment trace

The current order can still happen as a special case:

turn_driver.kind = player_action  
CHC.binding.mode = exact_slt  
SE.commitment.selection_source = emitted_choice

But it should not be the default mental model.

### **7.2 Where `turn_driver` belongs**

**Primary home: `SE`.**

`SE` is the causal event record. It already owns `commitment`, `outcome_route`, `world_logic_rationale`, record introductions, and `state_delta`; it is the correct authority surface for “why this turn happened.”

**Mirrors / references:**

* `PG.input.resolved_event_id` points to the SE as it already does.  
* Page plan gets a required §7a / §12 driver summary for prose planning.  
* `CHC.binding.intent_signature.response_to_driver` may reference the SE or driver records.  
* `SLT` may declare compatible driver kinds but should not own the driver.

**Do not put primary `turn_driver` only on PG.** PG is a snapshot, not the causal event.  
 **Do not put primary `turn_driver` only on CHC.** Some turns have no originating CHC.  
 **Do not put primary `turn_driver` only on SLT.** SLTs can be reusable patterns; the same pattern may be player-, NPC-, or clock-driven depending on instantiation.

### **7.3 CHC binding semantics**

Replace scalar direct binding with a binding object.

Allowed binding modes:

exact_slt  
candidate_slt_set  
late_bound_intent  
rhetorical

Binding policies:

freeze_exact  
revalidate_exact  
prefer_candidates_then_jit  
always_resolve_late  
rhetorical_no_slt

Stale policies:

fail_if_exact_invalid  
may_rebind_to_better_fit  
may_supersede_before_selection

Rules:

* Exact frozen choices are promises. Never silently rebind them.  
* Late-bound choices are intent promises. They may bind to a better SLT only if the binding satisfies the explicit `intent_signature`.  
* Candidate-set choices may choose among listed SLTs, or JIT only if `binding_policy` allows it.  
* Rhetorical choices must not masquerade as material choices.

### **7.4 NPC/offstage/world initiative**

Pages may be driven by:

player_action  
player_write_in  
npc_action  
offstage_action  
world_pressure  
clock_fire  
secret_reveal  
multi_actor_collision  
system_repair  
audit_repair  
prose_attach  
promotion_closeout

For NPC/offstage drivers, the player remains the POV anchor. The page shows what the player can perceive, infer, discover, or be told. It must not narrate omniscient offstage interiority unless the story contract explicitly allows it.

### **7.5 SLT specificity/reuse policy**

Adopt a hybrid:

global SLT pattern:  
 reusable, role-parametric, no branch-local exact ids, must declare role lanes and pressure classes

branch-prefix / branch SLT pattern:  
 semi-reusable within branch, may name active branch records

runtime_jit SLT:  
 exact, page-local, tailored to active cast/pressure/state

instantiated commitment trace:  
 SE-level binding of actors, driver, active records, STCHAR axes, and consequences

No SLT should exist merely because the taxonomy can produce it. Every SLT must have a reason grounded in active or reusable pressure logic.

---

## **8. Concrete schema/contract changes**

### **8.1 `tools/validators/src/schemas/story-event.schema.json`**

**Current shape**

`SE.event_kind` is limited to:

story_start  
selected_choice  
write_in_attempt  
system_repair  
audit_repair  
prose_attach  
promotion_closeout

`SE.commitment` has `selected_slt_id`, `selection_source`, and `alias_bindings`, but no turn driver.

**Proposed breaking shape**

Add required `turn_driver`.

Recommended event-kind cleanup:

event_kind: story_start | turn_resolution | system_repair | audit_repair | prose_attach | promotion_closeout

Add:

turn_driver:  
 kind: player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision | system_repair | audit_repair  
 initiator: STENT-<id> | player | world | system | unknown  
 driver_records: []  
 player_response_mode: initiates | responds | witnesses | chooses_continuation | none  
 pov_visibility: perceived_directly | inferred_from_trace | reported | discovered_after | withheld  
 why_now: string

Extend `commitment`:

commitment:  
 selected_slt_id: SLT-<id> | null  
 selection_source: emitted_choice | author_pool | runtime_jit | npc_initiative | offstage_initiative | clock_fire | world_pressure | system_repair | audit_repair | none  
 selected_choice_id: CHC-<id> | null  
 alias_bindings: {}  
 binding_resolution:  
   source_choice_binding_mode: exact_slt | candidate_slt_set | late_bound_intent | rhetorical | none  
   resolved_from_candidate_ids: []  
   stale_choice_status: current | superseded | exact_invalid | rebound_within_policy | not_choice_driven  
   resolution_reason: string  
 instantiated_commitment:  
   driver_records: []  
   actor_bindings:  
     - role: string  
       stent_id: STENT-<id>  
       stchar_id: STCHAR-<id> | null  
   stchar_operational_axes:  
     - stchar_id: STCHAR-<id>  
       axes: []  
   consequence_promises: []

**Valid example**

id: SE-12  
story_id: STORY-1  
created_at_page: PG-8  
parent_page_id: PG-7  
event_kind: turn_resolution  
actor: STENT-7  
turn_driver:  
 kind: npc_action  
 initiator: STENT-7  
 driver_records: [STPLAN-9, STEMO-12, CLK-3, THR-4, STCHAR-7]  
 player_response_mode: responds  
 pov_visibility: perceived_directly  
 why_now: "CLK-3 crossed its second threshold; STPLAN-9 current_step moved from stalking to flushing Jon from cover."  
commitment:  
 selected_slt_id: SLT-44  
 selection_source: npc_initiative  
 selected_choice_id: null  
 alias_bindings:  
   pursuer: STENT-7  
   quarry: STENT-1  
   exposed_ally: STENT-2  
   pressure_clock: CLK-3  
 binding_resolution:  
   source_choice_binding_mode: none  
   resolved_from_candidate_ids: []  
   stale_choice_status: not_choice_driven  
   resolution_reason: "NPC plan and clock threshold selected the commitment."  
 instantiated_commitment:  
   driver_records: [STPLAN-9, STEMO-12, CLK-3, THR-4]  
   actor_bindings:  
     - role: pursuer  
       stent_id: STENT-7  
       stchar_id: STCHAR-7  
   stchar_operational_axes:  
     - stchar_id: STCHAR-7  
       axes: [pressure_behavior, agency_planning_tendency, capability_limit]  
   consequence_promises:  
     - "The player sees the shot line and must react; Varro's hidden internal monologue remains withheld."  
outcome_route: accept  
world_logic_rationale: "The shot is visible to Jon; the motive is not omnisciently exposed."  
state_delta:  
 create: [CNSQ-8]  
 supersede: [CLK-3]  
 close: []

**Invalid example**

event_kind: selected_choice  
actor: STENT-7  
commitment:  
 selected_slt_id: SLT-44  
 selection_source: emitted_choice

Why invalid under the new contract: NPC-initiated action is misclassified as an emitted player choice, has no `turn_driver`, and carries no driver records.

**Breaking impact**

Existing SE records must be reshaped. This is acceptable because the user explicitly prefers fail-fast structural contracts and no migration shims.

---

### **8.2 `tools/validators/src/schemas/story-choice.schema.json`**

**Current shape**

`CHC` requires:

associated_commitment_block: SLT-<id> | null

and `grounded_in.records[]`.

**Proposed breaking shape**

Remove `associated_commitment_block`.

Add required:

binding:  
 mode: exact_slt | candidate_slt_set | late_bound_intent | rhetorical  
 exact_slt_id: SLT-<id> | null  
 candidate_slt_ids: []  
 binding_policy: freeze_exact | revalidate_exact | prefer_candidates_then_jit | always_resolve_late | rhetorical_no_slt  
 stale_policy: fail_if_exact_invalid | may_rebind_to_better_fit | may_supersede_before_selection  
 intent_signature:  
   player_role: initiator | responder | observer_response | continuation | expressive  
   response_to_driver: SE-<id> | CLK-<id> | STPLAN-<id> | STEMO-<id> | STSEC-<id> | STQ-<id> | THR-<id> | null  
   target_or_action_families: []  
   target_records: []  
   required_grounding_records: []  
   required_stchar_axes: []  
   unacceptable_bindings: []  
   promise_to_player: string

**Valid late-bound reaction CHC**

id: CHC-18  
story_id: STORY-1  
created_at_page: PG-8  
surface_label: "Get Mara behind the kiln before the shot line clears."  
player_visible_intent: "Protect Mara while accepting exposure risk."  
target_or_action_families: [protect, evade, move]  
likely_state_pressure: "Reaction to SE-12 npc_action; protects Mara but exposes Jon."  
grounded_in:  
 records: [SE-12, STENT-2, STCHAR-2, STPLAN-9, STEMO-12, STLOC-3]  
binding:  
 mode: late_bound_intent  
 exact_slt_id: null  
 candidate_slt_ids: []  
 binding_policy: prefer_candidates_then_jit  
 stale_policy: may_rebind_to_better_fit  
 intent_signature:  
   player_role: responder  
   response_to_driver: SE-12  
   target_or_action_families: [protect, evade]  
   target_records: [STENT-2, STLOC-3]  
   required_grounding_records: [SE-12, STCHAR-2, STPLAN-9]  
   required_stchar_axes:  
     - stchar_id: STCHAR-2  
       axes: [pressure_behavior, capability_limit]  
   unacceptable_bindings:  
     - "Any commitment that abandons Mara before protection is attempted."  
   promise_to_player: "Mara is protected first; Jon accepts exposure risk."

**Valid exact CHC**

id: CHC-19  
story_id: STORY-1  
created_at_page: PG-8  
surface_label: "Call Varro out by name."  
player_visible_intent: "Force the hidden shooter to reveal whether he is acting alone."  
target_or_action_families: [communicate, oppose, investigate]  
likely_state_pressure: "Risks drawing fire; may expose secret alliance."  
grounded_in:  
 records: [SE-12, STENT-7, STCHAR-7, STSEC-2, THR-4]  
binding:  
 mode: exact_slt  
 exact_slt_id: SLT-45  
 candidate_slt_ids: []  
 binding_policy: freeze_exact  
 stale_policy: fail_if_exact_invalid  
 intent_signature:  
   player_role: responder  
   response_to_driver: SE-12  
   target_or_action_families: [communicate, oppose]  
   target_records: [STENT-7]  
   required_grounding_records: [STSEC-2, THR-4]  
   required_stchar_axes:  
     - stchar_id: STCHAR-7  
       axes: [appraisal_rule, relationship_conduct]  
   unacceptable_bindings: []  
   promise_to_player: "The response confronts Varro publicly; it is not a stealth or escape action."

**Invalid CHC**

id: CHC-20  
surface_label: "Do something brave."  
target_or_action_families: [decide]  
grounded_in:  
 records: [STCHAR-2]  
binding:  
 mode: late_bound_intent  
 binding_policy: always_resolve_late

Why invalid: no intent signature, no target records, generic STCHAR grounding, no operational axes, no promise to player.

**Breaking impact**

All existing CHC records break. That is worth it because the old scalar cannot express the stale-choice distinction the user cares about.

---

### **8.3 `tools/validators/src/schemas/story-storylet.schema.json`**

**Current shape**

`SLT` has scope, move family, predicates, beats, effects, exit options, saliency, mystery policy, and provenance.

**Proposed breaking addition**

Add required:

reuse_mode: global_pattern | branch_pattern | branch_instantiated | runtime_jit  
grounding:  
 reason_to_exist: string  
 causal_pressures: []  
 source_records: []  
 actor_binding_policy: exact_actor | role_parametric | late_bound_actor  
 compatible_turn_drivers: []  
 stchar_axes: []  
 role_lanes: []

**Valid reusable pattern**

id: SLT-30  
story_id: STORY-1  
scope:  
 visibility: global_author_pool  
 branch_id: null  
created_at_page: null  
reuse_mode: global_pattern  
title: "Pursuer forces quarry out of cover"  
move_family: pursuit  
grounding:  
 reason_to_exist: "Covers offstage or onstage pursuit pressure from an active opposing actor."  
 causal_pressures: [plan_pressure, clock_pressure, world_pressure]  
 source_records: []  
 actor_binding_policy: role_parametric  
 compatible_turn_drivers: [npc_action, offstage_action, clock_fire]  
 stchar_axes: []  
 role_lanes:  
   - role: pursuer  
     required_axes: [agency_planning_tendency, pressure_behavior, capability_limit]  
   - role: quarry  
     required_axes: [perception_embodiment, pressure_behavior]  
preconditions:  
 hard:  
   - pred: any_plan_active  
     alias: pursuer_plan  
     holder_role: opposing_actor  
   - pred: any_clock_active  
     alias: pressure_clock  
     kind: pursuit  
beats:  
 - beat_id: setup  
   function: pressure  
   instruction: "Render a player-visible sign of pursuit pressure without omniscient access to the pursuer's interiority."  
exit_options:  
 - action_family: protect  
   surface_hint: "Protect someone exposed by the pressure."  
saliency:  
 urgency: high  
 cooldown_pages: 1  
mystery_policy:  
 allowed_authority: apparent  
provenance:  
 origin: author_batch

**Valid runtime JIT**

id: SLT-44  
story_id: STORY-1  
scope:  
 visibility: branch_scoped  
 branch_id: BR-2  
created_at_page: PG-8  
reuse_mode: runtime_jit  
title: "Varro fires into the kiln to flush Jon"  
move_family: pursuit  
grounding:  
 reason_to_exist: "Varro's active plan and ambush clock became due; Jon and Mara must react in POV."  
 causal_pressures: [plan_pressure, emotion_pressure, clock_pressure, threat_pressure]  
 source_records: [STPLAN-9, STEMO-12, CLK-3, THR-4, STCHAR-7]  
 actor_binding_policy: exact_actor  
 compatible_turn_drivers: [npc_action]  
 stchar_axes:  
   - stchar_id: STCHAR-7  
     axes: [pressure_behavior, agency_planning_tendency, capability_limit]  
 role_lanes: []  
preconditions:  
 hard:  
   - pred: plan_active  
     plan: STPLAN-9  
   - pred: emotion_pressure  
     emotion: STEMO-12  
   - pred: clock_at_least  
     clock: CLK-3  
     value: 2  
beats:  
 - beat_id: shot_line  
   function: pressure  
   instruction: "Show the shot line as Jon perceives it; do not narrate Varro's hidden thoughts."  
exit_options:  
 - action_family: protect  
   surface_hint: "Protect Mara from the exposed line."  
saliency:  
 urgency: high  
 cooldown_pages: 0  
mystery_policy:  
 allowed_authority: apparent  
provenance:  
 origin: runtime_jit

**Invalid SLT**

id: SLT-46  
title: "Confront the enemy"  
move_family: conflict  
reuse_mode: runtime_jit  
grounding:  
 reason_to_exist: "Good dramatic conflict."  
 causal_pressures: []  
 source_records: []

Why invalid: generic reason, no active source records, no pressure, no STCHAR axes, no driver compatibility.

**Breaking impact**

All SLTs need grounding metadata. This is worthwhile because the user explicitly rejects generic untailored storylets.

---

### **8.4 Page-plan contract**

**Current shape**

Page plans include §16a STCHAR-derived packets and optional active STPLAN/STEMO/CLK/STSEC/STQ sections.

**Proposed additions**

Add required section:

## 7a. Turn driver / initiative trace

Required content:

- Driver kind:  
- Initiator:  
- Driver records:  
- Why now:  
- Player response mode:  
- POV visibility:  
- Observer-firewall note:  
- Candidate commitments considered:  
 - selected:  
 - rejected:  
 - deferred:

Strengthen §16a:

* `Required because` becomes a closed, parseable multi-label set.  
* Unknown labels fail, not warn.  
* `offstage_causal` requires mechanism and driver records.  
* `capability_mechanism` requires capability + limit/cost/access.  
* `relationship_mechanism` requires SREL or explicit relationship-conduct grounding.  
* `plan_driver` requires STPLAN current-step reference.  
* `emotion_driver` requires STEMO behavioral pressure.  
* `clock_driver` requires CLK threshold.

**Breaking impact**

Existing page plans break until updated. This is acceptable; page plans are direct-write artifacts and the user wants fail-fast diagnostics.

---

### **8.5 Shared contracts and machine-facing layer**

Update:

* `docs/FOUNDATIONS.md`  
* `docs/CONTEXT-PACKET-CONTRACT.md`  
* `docs/MACHINE-FACING-LAYER.md`  
* `.claude/skills/_shared-templates/story-state-contract.md`  
* `.claude/skills/_shared-templates/story-record-schemas.md`

Required concepts:

turn driver  
candidate commitment  
CHC binding policy  
SLT grounding provenance  
instantiated commitment trace  
STCHAR operational axis citation  
offstage initiative POV rule

The machine-facing layer should add index edges for:

choice_binding_exact_storylet  
choice_binding_candidate_storylet  
choice_binding_response_to_driver  
choice_binding_required_grounding  
storylet_grounding_source_record  
storylet_grounding_stchar_axis  
event_turn_driver_record  
event_instantiated_actor_binding

The existing machine layer already indexes story-bundle edges such as choice/storylet association and event-selected-storylet; the proposed changes extend that graph rather than inventing a disconnected subsystem.

---

## **9. Skill changes**

### **9.1 `branching-story-bootstrap`**

Current bootstrap can seed broad SLTs and root choices; it already requires seed-block cast-role coverage including offstage pressure-bearing roles.

Change:

* Seed SLTs as `global_pattern` or `branch_pattern`, never as generic untailored blocks.  
* Add root `turn_driver.kind: story_start`.  
* Root choices use `binding`, not `associated_commitment_block`.  
* Root page plan §7a lists opening driver and candidate commitments.  
* Root §16a packets must include role-demand labels.  
* Offstage active pressure at bootstrap must be represented as either:  
  * seeded driver candidate,  
  * deferred with reason,  
  * omitted because not causally relevant.

### **9.2 `branching-story-turn-cycle`**

Current turn-cycle starts from selected CHC/write-in.

Change to support modes:

resolve_selected_choice  
resolve_write_in  
advance_initiative  
repair_turn

New Phase 0:

Evaluate due drivers:  
 player selected choice  
 write-in  
 due STPLAN current_step  
 high-intensity STEMO behavioral pressure  
 CLK threshold  
 active THR/OBL/CNSQ pressure  
 STSEC/STQ reveal/setup pressure  
 multi-actor collision

Phase 2 becomes:

driver → candidate commitments → match/JIT/instantiate SLT

Phase 8 choice generation becomes:

emit CHCs as response/continuation/initiative surfaces with binding policies

### **9.3 `commitment-block-authoring`**

Current skill already emphasizes causal moves, cast-role coverage, and STCHAR use.

Change:

* Require `reuse_mode`.  
* Require `grounding.reason_to_exist`.  
* Require role lanes for global patterns.  
* Require exact STCHAR axes for branch-scoped/JIT character-dependent SLTs.  
* Reject blocks whose reason is only “dramatic variety.”  
* Add batch report by causal pressure type, not only move family.  
* For `global_author_pool`, prohibit exact STCHAR IDs but require role-lane operational axes.

### **9.4 `story-character-profile`**

Current STCHAR already has stable operational sections, including appraisal, pressure, voice, perception, agency, relationship conduct, derivation, and rendering constraints.

Change:

* Add a required “Operational Axis Index” in `Validation / Audit Anchors` listing stable axis names and section anchors:  
  * `pressure_behavior`  
  * `appraisal_rule`  
  * `agency_planning_tendency`  
  * `relationship_conduct`  
  * `voice_communication_constraint`  
  * `capability_limit`  
  * `perception_embodiment`  
  * `anti_generic_warning`  
* Do not make STCHAR current state.  
* Do not force every axis into every page packet; use role-demanded projection.

### **9.5 `branching-story-health-audit`**

Change:

* Add “driver inertness” audit:  
  * high-urgency STPLAN/STEMO/CLK/THR/STQ active but never selected/deferred/rejected.  
* Add stale CHC binding audit.  
* Add generic SLT audit.  
* Add choice-quality axis audit.  
* Add NPC reactivity audit:  
  * repeated pages where all causality is `player_action` despite active NPC plans/clocks.

### **9.6 `branching-story-prose-attach`**

Current prose receipt already validates STCHAR packet authority and profile-fidelity entries.

Change:

* Receipt must record `turn_driver` fidelity:  
  * driver rendered?  
  * POV visibility honored?  
  * no hidden offstage mind leak?  
* Receipt must record reaction-choice setup:  
  * prose stops at a hinge consistent with emitted CHC response modes.  
* Keep literary fidelity judgment-assisted.

### **9.7 Shared templates**

Update `story-state-contract.md` and `story-record-schemas.md` to make the new architecture canonical:

STCHAR does not directly “drive” pages alone.  
STCHAR + active state + turn driver produce candidate commitments.  
SLT patterns are not player menus.  
CHCs are player-facing promises with explicit binding semantics.  
SE is the authority for instantiated commitment.  
---

## **10. Validator changes**

### **10.1 `turn_driver_schema_compliance`**

**Severity:** fail  
 **Applies to:** full-world; pre-apply touching SE/PG/page plans; incremental SE/PG.  
 **Inputs:** SE records, PG records, page plan §7a.  
 **Failure codes:**

turn_driver_missing  
turn_driver_kind_invalid  
turn_driver_initiator_invalid  
turn_driver_driver_record_missing  
turn_driver_player_response_mode_invalid  
turn_driver_pov_visibility_invalid

**Example diagnostic**

SE-12 lacks turn_driver.kind. Every turn_resolution SE must declare whether the causal driver is player_action, npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, or multi_actor_collision.

**Suggested fix**

Add SE-12.turn_driver with kind, initiator, driver_records, player_response_mode, pov_visibility, and why_now.

**Negative tests**

* SE turn_resolution with no `turn_driver`.  
* `npc_action` with `initiator: world`.  
* `clock_fire` with no `CLK-*` driver record.  
* `offstage_action` with initiator not STENT.

---

### **10.2 `turn_driver_pov_observer_firewall`**

**Severity:** fail  
 **Applies to:** full-world; pre-apply SE/PG/CHC/page plan.  
 **Inputs:** SE, PG, CHC, BEL, STPLAN, STEMO, STSEC, STQ, page plan.  
 **Failure codes:**

turn_driver_hidden_state_leak  
turn_driver_offstage_direct_mind_access  
turn_driver_missing_access_route  
turn_driver_pov_visibility_contradiction

**Example diagnostic**

SE-12 turn_driver cites offstage STPLAN-9 as directly perceived, but Jon has no BEL/access route to Varro's plan. Use inferred_from_trace, reported, or discovered_after.

**Suggested fix**

Change pov_visibility to inferred_from_trace and ground player-facing choices in the visible trace record, or create a lawful BEL/access route.

**Negative tests**

* Offstage plan shown as directly perceived.  
* CHC grounds in hidden STSEC without access.  
* Page plan narrates NPC interiority not available to POV.

This validator must extend the existing observer firewall, which currently focuses on selected-choice/write-in events.

---

### **10.3 `page_plan_turn_driver_consistency`**

**Severity:** fail  
 **Applies to:** page plans and PG/SE pairs.  
 **Inputs:** PG, SE, page plan §7a.  
 **Failure codes:**

page_plan_driver_section_missing  
page_plan_driver_mismatch  
page_plan_driver_record_omitted  
page_plan_candidate_commitment_trace_missing

**Example diagnostic**

PG-8 page plan §7a declares Driver kind=player_action, but resolved SE-12.turn_driver.kind is npc_action.

**Suggested fix**

Align page plan §7a with SE-12.turn_driver or repair the SE if the page plan is correct.

**Negative tests**

* PG resolved event has driver but plan omits §7a.  
* Plan names `CLK-3`; SE driver does not.  
* Plan lists no candidate commitments for a non-terminal page.

---

### **10.4 `chc_binding_policy_integrity`**

**Severity:** fail  
 **Applies to:** CHC records.  
 **Inputs:** CHC, SLT index, PG active records.  
 **Failure codes:**

chc_binding_missing  
chc_binding_mode_policy_mismatch  
chc_exact_slt_missing  
chc_candidate_slt_missing  
chc_late_bound_intent_signature_missing  
chc_rhetorical_has_slt  
chc_generic_stchar_grounding

**Example diagnostic**

CHC-18 uses late_bound_intent but has no intent_signature.promise_to_player.

**Suggested fix**

Add a binding.intent_signature that states player role, target/action families, required grounding, required STCHAR axes, unacceptable bindings, and player promise.

**Negative tests**

* `mode=exact_slt` with null `exact_slt_id`.  
* `mode=rhetorical` with candidate SLTs.  
* STCHAR in grounding but no required axis.

---

### **10.5 `chc_binding_resolution_trace`**

**Severity:** fail  
 **Applies to:** SE resolving selected CHC.  
 **Inputs:** SE, selected CHC, selected SLT, parent PG, active records.  
 **Failure codes:**

binding_resolution_missing  
exact_binding_resolved_to_wrong_slt  
late_bound_slt_violates_intent  
candidate_binding_resolved_outside_policy  
stale_choice_rebound_without_permission

**Example diagnostic**

SE-15 resolved CHC-18 to SLT-52, but CHC-18.binding.stale_policy is fail_if_exact_invalid.

**Suggested fix**

Select the exact promised SLT, supersede the CHC before selection, or change the binding policy before emission.

**Negative tests**

* Exact frozen CHC rebounds to new SLT.  
* Late-bound CHC resolves to an SLT with wrong action family.  
* Candidate-set CHC resolves to unlisted SLT without JIT permission.

This replaces the current direct `associated_commitment_block` trace logic.

---

### **10.6 `stale_exact_choice_binding`**

**Severity:** fail  
 **Applies to:** selection-time SE and active CHCs.  
 **Inputs:** CHC, SLT, parent PG snapshot, SLT predicates, branch locality.  
 **Failure codes:**

exact_slt_ineligible_at_selection  
exact_slt_superseded  
exact_slt_closed_by_state_delta  
exact_slt_cross_branch

**Example diagnostic**

CHC-12 is freeze_exact to SLT-20, but SLT-20 precondition STPLAN-3 is no longer active in PG-7.

**Suggested fix**

Supersede CHC-12 before emission/selection, or change it to late_bound_intent with an explicit promise.

**Negative tests**

* Frozen exact SLT predicate inactive.  
* Exact SLT branch mismatch.  
* Exact SLT superseded but CHC not superseded.

---

### **10.7 `slt_grounding_provenance_integrity`**

**Severity:** fail  
 **Applies to:** SLT records.  
 **Inputs:** SLT, active records, branch info.  
 **Failure codes:**

slt_grounding_missing  
slt_reason_generic  
slt_causal_pressures_empty  
slt_source_record_missing  
slt_runtime_jit_source_inactive  
slt_reuse_mode_scope_mismatch

**Example diagnostic**

SLT-46 is runtime_jit but grounding.source_records is empty. Runtime JIT storylets must cite active driver or pressure records.

**Suggested fix**

Add active source_records such as STPLAN/STEMO/CLK/THR/STQ/STCHAR and a specific reason_to_exist, or remove the untailored SLT.

**Negative tests**

* Runtime JIT with no source records.  
* Global pattern citing exact branch-only records.  
* Reason text “dramatic variety” with no pressure class.

---

### **10.8 `slt_stchar_axis_resolution`**

**Severity:** fail  
 **Applies to:** SLT records.  
 **Inputs:** SLT, STCHAR, STENT, PG active records.  
 **Failure codes:**

slt_character_dependent_without_stchar_axis  
slt_stchar_axis_unknown  
slt_exact_stchar_inactive  
slt_global_pattern_exact_stchar_forbidden  
slt_role_lane_missing_required_axis

**Example diagnostic**

SLT-44 names STCHAR-7 as source pressure but does not declare which operational axis is used.

**Suggested fix**

Add grounding.stchar_axes for STCHAR-7, e.g. pressure_behavior and agency_planning_tendency.

**Negative tests**

* Branch-scoped SLT cites STCHAR but no axis.  
* Global-author-pool SLT names exact STCHAR.  
* Axis not in closed vocabulary.

---

### **10.9 `choice_stchar_axis_grounding`**

**Severity:** fail  
 **Applies to:** CHC records.  
 **Inputs:** CHC, STCHAR records, page active records.  
 **Failure codes:**

choice_stchar_axis_missing  
choice_stchar_not_active  
choice_axis_not_supported  
choice_character_grounding_generic

**Example diagnostic**

CHC-18 grounds in STCHAR-2 but does not cite whether it depends on pressure_behavior, appraisal_rule, relationship_conduct, capability_limit, or another operational axis.

**Suggested fix**

Add binding.intent_signature.required_stchar_axes for STCHAR-2, or remove STCHAR-2 from grounding if it is not material.

**Negative tests**

* CHC cites STCHAR only to look character-specific.  
* CHC axis says `cool_vibe`.  
* CHC cites inactive STCHAR.

---

### **10.10 `npc_offstage_initiative_integrity`**

**Severity:** fail  
 **Applies to:** SE, PG, page plan §16a.  
 **Inputs:** SE turn_driver, STENT, STCHAR, STPLAN/STEMO/CLK/THR, page plan.  
 **Failure codes:**

offstage_driver_stent_not_offstage  
offstage_driver_missing_active_stchar  
offstage_driver_missing_pressure_record  
offstage_packet_missing  
offstage_packet_voice_block_forbidden  
offstage_packet_mechanism_missing

**Example diagnostic**

SE-12 turn_driver.kind=offstage_action by STENT-7, but PG-8 page plan has no §16a offstage_causal packet for STENT-7/STCHAR-7.

**Suggested fix**

Add a reduced offstage_causal §16a packet naming story-facing identity, appraisal/pressure behavior, offstage causal mechanism, must-not-imply, and anti-generic warnings.

**Negative tests**

* Offstage driver without STCHAR.  
* Offstage packet narrates dialogue/voice as if on-page.  
* Offstage action has no active plan/clock/threat basis.

---

### **10.11 `choice_set_quality_axes`**

**Severity:** fail for structural collapse; warn for weak quality risk.  
 **Applies to:** PG with emitted choices.  
 **Inputs:** PG, CHCs, binding objects, active records.  
 **Failure codes:**

choice_set_same_commitment  
choice_set_same_risk_profile  
choice_set_same_affected_actor  
choice_set_reaction_surface_missing  
choice_set_only_wording_variants

**Example diagnostic**

PG-8 emits four non-rhetorical choices, but all share the same binding promise and affected actor set. They differ only in wording.

**Suggested fix**

Differentiate choices by commitment, risk, affected actor, information stance, relationship cost, or response to the driver.

**Negative tests**

* Three “ask Mara” variants.  
* Four choices all late-bound to same promise.  
* NPC driver page with no genuine reaction options.

This extends, not replaces, existing `choice_set_noncollapse`.

---

### **10.12 `active_pressure_candidate_coverage`**

**Severity:** fail for high-urgency due records with no handling; warn for medium.  
 **Applies to:** page plan §7a and PG active snapshot.  
 **Inputs:** PG active records, page plan candidate table.  
 **Failure codes:**

active_pressure_unhandled  
active_pressure_rejection_reason_missing  
active_pressure_deferred_without_expiry

**Example diagnostic**

PG-8 has active high-urgency CLK-3 and STPLAN-9, but page plan §7a neither selects, rejects, nor defers them as candidate drivers.

**Suggested fix**

Add them to selected/rejected/deferred candidate commitments with a concise reason.

**Negative tests**

* High clock omitted.  
* Active NPC plan ignored across multiple pages.  
* Rejected pressure with no reason.

---

### **10.13 Existing validator updates**

Update:

* `observer_firewall` to inspect all new driver types, not only selected-choice/write-in events.  
* `chc_slt_selected_commitment_trace` to use `CHC.binding` and `SE.commitment.binding_resolution`, not `associated_commitment_block`.  
* `page_plan_stchar_packet_integrity` so unknown role labels fail under the new contract; current behavior warns.  
* `causal_dependency_threat_scan` to include new CHC binding dependencies and driver records.  
* `turn_cycle_output_grounding_integrity` to allow and require grounding through turn-driver records where relevant.

---

## **11. Choice quality model**

### **11.1 Deterministic part**

Hard validators should enforce:

Distinct commitment promises  
Distinct binding signatures  
Distinct risks or opportunity costs  
Distinct affected actors or relationship axes when the scene has relationship pressure  
Distinct information positions when secrets/questions matter  
Distinct response roles on NPC/world-driven pages  
Accessible grounding records  
Required STCHAR operational axes for character-dependent choices  
No unmarked rhetorical duplicates  
No generic “do something” choices

Minimum expected axes for a healthy non-terminal choice set:

at least 2 materially distinct commitments  
at least 2 distinct risk/cost profiles  
at least 1 choice that responds directly to the current turn driver  
write-in slot still allowed, but not counted as material differentiation

### **11.2 Judgment-assisted part**

Health audit or critic passes should assess:

Are the choices tempting?  
Are they emotionally legible?  
Do they create different future story pressures?  
Do they reflect the POV character’s actual situation?  
Are they too optimized, too vague, or too authorial?  
Do they feel like the same choice in different clothes?

These are not schema laws.

### **11.3 What should never be hard-validated**

Do not hard-validate:

literary elegance  
moral profundity  
exact emotional effect on reader  
whether a choice is “interesting enough”  
whether one option is aesthetically better

### **11.4 Avoid checklist-driven design**

The choice-quality model should be used as a floor, not a recipe. Validators should catch collapse and missing causal axes. Skills should still author choices as human-facing commitments, not as a checklist of “one moral, one social, one tactical.”

---

## **12. NPC/offstage agency model**

### **12.1 How NPC initiative becomes page-visible in player POV**

NPC/world initiative should surface as:

direct perception:  
 a door slams, a shot cracks, Mara grabs Jon's sleeve

trace:  
 mud on the sill, a moved ledger, a missing knife

report:  
 a messenger arrives, a shouted warning, a rumor

discovered aftermath:  
 the safe is open, the clock has advanced, the hostage is gone

constraint:  
 exit blocked, guards searching, debt called in

Never as:

omniscient cutaway into offstage mind  
secret motive stated without access route  
hidden plan described as fact to the player

unless the story contract explicitly allows omniscient interludes.

### **12.2 How offstage causal pressure is tracked**

Required chain:

offstage active STENT  
 → active bound STCHAR  
 → active pressure record: STPLAN/STEMO/CLK/THR/STQ/STSEC/OBL/CNSQ/SREL/BEL  
 → SE.turn_driver.kind = offstage_action / clock_fire / world_pressure  
 → page plan §7a driver trace  
 → page plan §16a reduced offstage_causal packet  
 → player-facing reaction CHCs

### **12.3 Meaningful reaction choices**

A reaction page should not merely ask:

What do you do?

It should offer distinct commitments:

protect the exposed ally  
pursue the attacker  
hide and preserve information  
sacrifice evidence for safety  
signal a third party  
refuse coercion  
accept humiliation to buy time  
confront publicly  
withdraw privately

### **12.4 Observer firewall preservation**

For every NPC/offstage driver:

System may know:  
 Varro fired because humiliation and plan threshold converged.

Player may perceive:  
 The west window bursts inward; kiln dust flashes white; Mara flinches before the second shot.

Player may infer:  
 Someone knows the kiln layout.

Player may not be told without access:  
 Varro felt humiliated and chose the shot to punish Jon.

The SE can record the full driver trace. The page plan/prose must render only the lawful POV layer.

---

## **13. SLT creation / reuse policy**

### **13.1 What makes an SLT worth existing**

An SLT is worth existing only if it has at least one of:

active character pressure  
active plan pressure  
active emotion pressure  
clock threshold or staged pressure  
open thread/consequence/obligation  
secret/question setup or reveal pressure  
relationship axis pressure  
location/object affordance  
world pressure  
repair/audit need

And it must say why in `grounding.reason_to_exist`.

### **13.2 Reusable patterns become specific through binding**

Reusable pattern:

A pursuer uses pressure to force a quarry from cover.

Specific instantiation:

Varro, offstage but active, uses his ambush plan and humiliation pressure to shoot into the kiln,  
forcing Jon to choose between protecting Mara and preserving the ledger.

The reusable pattern is allowed only if it declares role lanes and required axes. The instance must bind actors and active records.

### **13.3 Separate pattern from instantiation**

Recommended distinction:

SLT.global_pattern:  
 reusable, role-parametric, no exact branch ids

SLT.branch_pattern:  
 reusable within branch, can name branch-visible records

SLT.branch_instantiated / runtime_jit:  
 exact actors, active records, STCHAR axes, driver records

SE.instantiated_commitment:  
 actual causal packet selected/executed

### **13.4 Prevent generic storylet spam**

Fail if:

reason_to_exist is generic  
no source_records for branch/runtime SLT  
no role lanes for global pattern  
character-dependent block lacks STCHAR axes  
move_family is the only specificity  
beats could apply to any character in any scene  
---

## **14. Implementation order**

### **Ticket 1 — Contract spec: driver-first commitment architecture**

**Files:**

* `docs/FOUNDATIONS.md`  
* `.claude/skills/_shared-templates/story-state-contract.md`  
* `.claude/skills/_shared-templates/story-record-schemas.md`  
* `docs/MACHINE-FACING-LAYER.md`  
* `docs/CONTEXT-PACKET-CONTRACT.md`

**Acceptance criteria:**

* Defines `turn_driver`.  
* Defines CHC binding modes/policies.  
* Defines SLT grounding/reuse modes.  
* Defines instantiated commitment trace.  
* Defines STCHAR operational axes.  
* States no backwards compatibility.

### **Ticket 2 — Schema breaking changes**

**Files:**

* `story-event.schema.json`  
* `story-choice.schema.json`  
* `story-storylet.schema.json`  
* possibly `story-page.schema.json`

**Acceptance criteria:**

* Old scalar `associated_commitment_block` fails.  
* SE without `turn_driver` fails.  
* SLT without grounding fails.  
* Fixtures cover valid exact, candidate, late-bound, rhetorical choices.

### **Ticket 3 — Turn-cycle skill rewrite**

**Files:**

* `branching-story-turn-cycle/SKILL.md`  
* all phase references

**Acceptance criteria:**

* Supports `resolve_selected_choice`, `resolve_write_in`, `advance_initiative`.  
* Candidate driver table required.  
* Driver-first SLT selection/JIT described.  
* CHC generation uses binding object.

### **Ticket 4 — Bootstrap and commitment-block-authoring updates**

**Files:**

* bootstrap Phase 6 and Phase 8–9  
* `commitment-block-authoring/SKILL.md`

**Acceptance criteria:**

* Seed SLTs have `reuse_mode` and grounding.  
* Root choices use CHC binding.  
* Cast-role/offstage coverage maps to candidate drivers.

### **Ticket 5 — Core validators**

Implement:

turn_driver_schema_compliance  
page_plan_turn_driver_consistency  
chc_binding_policy_integrity  
slt_grounding_provenance_integrity

**Acceptance criteria:**

* Negative fixtures fail with detailed diagnostics.  
* Registered in `public/registry.ts`.  
* Pre-apply and full-world modes covered.

### **Ticket 6 — Trace and stale-binding validators**

Implement / update:

chc_binding_resolution_trace  
stale_exact_choice_binding  
update chc_slt_selected_commitment_trace

**Acceptance criteria:**

* Exact frozen rebinding fails.  
* Late-bound valid resolution passes.  
* Candidate out-of-policy resolution fails.

### **Ticket 7 — STCHAR axis and NPC/offstage validators**

Implement:

choice_stchar_axis_grounding  
slt_stchar_axis_resolution  
npc_offstage_initiative_integrity  
turn_driver_pov_observer_firewall

**Acceptance criteria:**

* Generic STCHAR citations fail.  
* Offstage initiative without §16a packet fails.  
* Hidden offstage mind leak fails.

### **Ticket 8 — Choice quality axis validator**

Implement:

choice_set_quality_axes

**Acceptance criteria:**

* Wording-only variants fail.  
* Distinct commitments pass.  
* Rhetorical variants require explicit marking.

### **Ticket 9 — Golden fixture suite**

Add one rich fixture proving all target behaviors in section 15.

**Acceptance criteria:**

* At least one passing fixture.  
* At least six failing fixtures:  
  * stale exact binding  
  * generic SLT  
  * NPC hidden-state leak  
  * missing STCHAR axis  
  * offstage initiative missing packet  
  * collapsed choice set

### **Ticket 10 — Health audit and prose attach updates**

**Files:**

* `branching-story-health-audit/SKILL.md`  
* `branching-story-prose-attach/SKILL.md`  
* prose receipt schema if needed

**Acceptance criteria:**

* Health audit reports active pressure inertness.  
* Prose attach records turn-driver fidelity.  
* Literary quality remains judgment-assisted.

---

## **15. Golden fixtures / tests**

### **Fixture: “Red Kiln Ambush”**

**Setup**

Active records at `PG-7`:

STENT-1 / STCHAR-1 = Jon, POV/player  
STENT-2 / STCHAR-2 = Mara, onstage ally, injured leg, protective pressure behavior  
STENT-7 / STCHAR-7 = Varro, offstage hunter/opponent  
STPLAN-9 = Varro’s plan: flush Jon from kiln  
STEMO-12 = Varro humiliation/anger with attack pressure  
CLK-3 = ambush clock at threshold 2  
THR-4 = active pursuit threat  
STQ-2 = open question: who betrayed the route?  
STLOC-3 = kiln with visible cover/exit affordances

### **Passing case**

`SE-12`:

turn_driver.kind = npc_action  
initiator = STENT-7  
driver_records = [STPLAN-9, STEMO-12, CLK-3, THR-4, STCHAR-7]  
pov_visibility = perceived_directly  
player_response_mode = responds

Page plan §7a says the driver is the shot through the west window. §16a includes:

STENT-7 / STCHAR-7 Required because: offstage_causal, plan_driver, clock_driver  
Offstage causal relevance: Varro’s active plan and clock threshold produce the shot-line pressure.  
Prose must-not-imply: Jon knows Varro’s motive or exact position.

Emitted choices:

1. Protect Mara behind the kiln.  
2. Dive for the ledger before smoke covers it.  
3. Call Varro out by name.  
4. Retreat through the ash chute alone.  
5. Write-in.

Each CHC has distinct binding promise, risk, affected actor, and response stance.

### **Required proof points**

**Active STCHAR drives choices**

`CHC-18` cites `STCHAR-2` with axes:

pressure_behavior  
capability_limit

because Mara’s injured leg and pressure response shape the protect choice.

**Active STPLAN/STEMO/CLK/THR/STQ drive candidates**

`SLT-44.grounding.source_records` includes:

STPLAN-9  
STEMO-12  
CLK-3  
THR-4  
STQ-2

**NPC-initiated event produces player reaction choices**

`SE-12.turn_driver.kind = npc_action`, and CHCs have `player_role: responder`.

**Stale CHC/SLT binding problem is caught or solved**

Failing fixture:

CHC-12.mode = exact_slt  
exact_slt_id = SLT-20  
stale_policy = fail_if_exact_invalid

But `SLT-20` is no longer eligible after `CLK-3` fires. Validator fails.

Passing fixture:

CHC-12.mode = late_bound_intent  
binding_policy = prefer_candidates_then_jit

It resolves to `SLT-44` because `SLT-44` satisfies the same promise.

**Generic untailored SLTs fail**

`SLT-46` titled “Confront the enemy” with no source records or STCHAR axes fails.

**Offstage active character pressure is lawful**

Varro is active, offstage, bound to STCHAR, and has active STPLAN/STEMO/CLK pressure. §16a reduced packet exists.

**Observer firewall preserved**

Failing fixture narrates:

Varro smiled because he knew Jon would choose Mara.

without access route. Validator fails.

Passing fixture renders:

The west window burst inward. Mara flinched before Jon heard the second shot.

No hidden mind leak.

---

## **16. Non-goals**

Explicitly reject:

Turning STCHAR into current state.  
Making NPCs omniscient.  
Making choices pure plot rails.  
Validating literary quality as hard schema law.  
Backwards-compatibility shims.  
Generic storylet generation without cast/pressure grounding.  
Omniscient offstage cutaways unless the story contract permits them.  
Forcing every SLT to be JIT-only.  
Forcing every choice to be late-bound.  
Replacing judgment-assisted prose/choice review with mechanical checklists.  
---

## **17. Open questions**

1. **Should a dedicated candidate-commitment record be introduced later?**  
    The recommended first implementation stores candidate/binding semantics in CHC, SLT, SE, and page plan. A separate `SCOM`/candidate record may become worthwhile if candidate queues need persistence across many pages.  
2. **Should `event_kind` be collapsed into fewer transaction kinds?**  
    I recommend simplifying it around `turn_resolution` plus `turn_driver.kind`, but a later schema spec should decide the exact enum split.  
3. **How strict should active-pressure coverage be for medium-urgency records?**  
    High-urgency due records should fail if unhandled. Medium urgency may begin as warning until fixtures show how noisy the rule is.  
4. **Should STCHAR operational axes be purely schema enum values or anchored to body section spans?**  
    Enum values are enough for the first pass. Section-span anchors would improve diagnostics but add authoring burden.  
5. **How much candidate-driver ranking should be deterministic?**  
    Validators can require that candidates are listed, grounded, selected/rejected/deferred, and lawful. They should not hard-code narrative priority beyond due clocks, active blockers, and impossible-state contradictions.

**Bottom line:** preserve Worldloom’s mature STCHAR/STPLAN/STEMO/SLT/CHC foundation, but break the CHC/SLT/SE boundary cleanly. Add explicit turn drivers, hybrid choice binding, SLT grounding provenance, and instantiated commitment traces. This gives NPCs and offstage actors real causal agency while keeping the story in player POV and preserving meaningful player choice.

