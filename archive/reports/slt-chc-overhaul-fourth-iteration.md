**Status**: COMPLETED

# **Final STCHAR ⇄ SLT ⇄ CHC Character-Specificity Architecture Audit for Worldloom**

## **1. Executive verdict**

**The current architecture is basically right.** The live repository has the correct core: durable story-local character authority in `STCHAR`; present-causal state in `STPLAN`, `STEMO`, `BEL`, `SREL`, `OBL`, `CLK`, `STSEC`, `STQ`, and sibling records; late-bound `CHC` intent surfaces; selected `SLT` commitment in `SE.commitment`; and projection-based candidate retrieval instead of full-pool loading. The architecture should be preserved, not replaced.

**Genericness is still a serious risk.** The current machinery can produce structurally valid storylets and choices that are still dramatically generic. The validators prove legality, grounding, branch isolation, noncollapse, driver compatibility, cooldown, observer firewall, STCHAR page-plan/prose authority, and trace closure. They do not yet prove that the selected `SLT` or emitted `CHC` is specifically shaped by the character’s stable authority plus current plans, emotions, beliefs, relationships, obligations, clocks, secrets, questions, artifacts, and local world constraints.

**The missing piece is not “more STCHAR.”** The missing piece is a stronger **current-state-mediated character-fit selection model**. STCHAR should influence storylet selection primarily through current story records it helps create or interpret: `STPLAN`, `STEMO`, `BEL`, `SREL`, `STINT`, `STSTAT`, `OBL`, `CLK`, `STSEC`, `STQ`, visible affordances, and page-plan §16a packets. Direct `record_active(STCHAR-X)` should remain legal for branch-scoped or branch-prefix-scoped character-specific blocks, but global author-pool SLTs should not grow exact-STCHAR dependencies.

**Breaking persistent record changes are mostly not warranted.** I do **not** recommend adding a persistent `SSEL` record, direct `CHC → SLT` binding, outcome-promising CHC fields, rich free-form persona predicates, or a global drama manager. I also do **not** recommend turning `SLT.grounding` into a giant literary rubric; the implementation order explicitly records that rich SLT grounding fields were rejected in the previous pass, and the landed projection/predicate architecture is the right base.

**I do recommend a final hardening layer:**

1. Add a **Character-Fit Selection Contract** to shared story contracts and skills.  
2. Extend `select_storylet_candidates` with a non-persistent, projection-derived **specificity trace** and optional `specificity_signature`.  
3. Add index projections derived from existing SLT predicates and edges, not new SLT body fields.  
4. Add warning-level validators and health-audit diagnostics for generic SLTs/CHCs.  
5. Add golden fixtures that prove character-specific selection and player-facing choice quality, not merely legality.

Preferred architecture:

STCHAR durable authority  
   ↓ constrains / informs  
current story state: STPLAN + STEMO + BEL + SREL + STINT + STSTAT + OBL + CLK + STSEC + STQ + affordances  
   ↓ forms specificity signature  
projection-only SLT candidate retrieval  
   ↓ symbolic legality + specificity ranking  
shortlist full-body fetch  
   ↓ predicate / alias / observer-firewall / mystery / cooldown evaluation  
selected SLT in SE.commitment  
   ↓ state delta + child PG snapshot  
page-plan §16a character projection  
   ↓  
CHCs as player-facing intent, stance, response, witness, or continuation surfaces  
---

## **2. Evidence discipline**

Repository access followed the requested pipeline from the uploaded mission and manifest: repo metadata → branch SHA → uploaded tree manifest → targeted fetches → analysis. I used the uploaded manifest as the file inventory and the uploaded prompt as the mission specification.

Repository metadata resolved to `joeloverbeck/worldloom`. The current `main` ref resolved to full SHA `1108c9a81e7ebb0c4b904e778c4a53aee5b95f6c`, matching the user-supplied short SHA `1108c9a`. This audit uses that exact SHA.

No clone was used. No GitHub code search or snippet-based repository search was used as evidence. Repository search was used only to locate the installed repository; all repository evidence came from direct `fetch_file` calls at the verified SHA.

Directly fetched live files included these active surfaces:

**Constitutional / shared contracts**

`docs/FOUNDATIONS.md`; `.claude/skills/_shared-templates/story-state-contract.md`; `.claude/skills/_shared-templates/story-record-schemas.md`; `.claude/skills/_shared-references/protagonist-grade-character-engine.md`.

**Story skills**

`.claude/skills/branching-story-turn-cycle/SKILL.md`; `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`; `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md`; `.claude/skills/story-character-profile/SKILL.md`; `.claude/skills/commitment-block-authoring/SKILL.md`; `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`.

**Schemas**

`story-character-authority.schema.json`; `story-storylet.schema.json`; `story-choice.schema.json`; `story-event.schema.json`; `story-page.schema.json`; `story-plan.schema.json`; `story-emotion.schema.json`; `story-belief.schema.json`; `story-relationship.schema.json`; `story-intention.schema.json`; `story-status.schema.json`.

**Validators**

`public/registry.ts`; `stchar-body-integrity.ts`; `stchar-source-fact-coverage.ts`; `_stchar-operational-sections.ts`; `stchar-temporal-reference-boundary.ts`; `page-plan-stchar-packet-integrity.ts`; `prose-receipt-stchar-integrity.ts`; `no-char-authority-in-story-runtime.ts`; `character-grounding-consistency.ts`; `slt-grounding-minimal-integrity.ts`; `chc-slt-selected-commitment-trace.ts`; `rule_choice_set_noncollapse.ts`; `turn-driver-schema-compliance.ts`; `turn-driver-pov-observer-firewall.ts`; `page-plan-turn-driver-consistency.ts`; `active-pressure-handling-discipline.ts`; `turn-cycle-output-grounding-integrity.ts`.

**Index / MCP / retrieval**

`world-index/src/schema/migrations/007_slt_projection_columns.sql`; `world-index/src/schema/types.ts`; `world-index/src/parse/atomic.ts`; `world-mcp/src/tools/select-storylet-candidates.ts`; `world-mcp/tests/tools/select-storylet-candidates.test.ts`; `world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts`; `world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts`; `world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts`.

**Fixtures / tests**

SPEC-85 non-player-driver integration tests for offstage bridge sabotage, clock-fire route closure, secret-reveal ledger clue, and multi-actor collision confrontation; SPEC-81 candidate retrieval; SPEC-84 replay/branch-scope; candidate cooldown tests.

**Reports / implementation order**

`archive/reports/slt-chc-overhaul-third-iteration.md`; `archive/reports/stchar-distillation-rework.md`; `specs/IMPLEMENTATION-ORDER.md`. These reports were treated as context only. Live schemas, validators, skills, MCP/index code, tests, and shared contracts win whenever there is tension.

---

## **3. Current implemented architecture map**

### **STCHAR authority model**

`STCHAR` is now a durable story-local character bible. Its frontmatter records source/provenance, source operational fact mapping, bound STENTs, revision, status, supersession, and story/world identity. The source operational map covers the protagonist-grade dramatic core fields such as wound, appetite, self-mythology, contradiction, pressure behavior, relational charge, moral/psychological edge, signature scene behavior, and voice under pressure.

The body contract is strong. The `stchar-body-integrity` validator requires thirteen operational sections: story-facing identity, source distillation, stable persona core, emotional appraisal map, pressure behavior, voice bible, page-plan voice block, perception/embodiment, agency/planning tendencies, relationship-specific behavior, story-state derivation guide, prose rendering constraints, and validation/audit anchors.

The STCHAR/current-state boundary is explicitly enforced. Operational STCHAR sections may not contain temporal story-state record references; current facts belong in current state records and page-plan §16a, not in STCHAR.

STCHAR is not just prose color. It drives page-plan §16a packets, prose receipts, STENT binding, source preservation, temporal boundary checks, and runtime bans on world `CHAR-*` authority. Page-plan packets require explicit `required_because` reasons such as `viewpoint`, `speaker`, `major_actor`, `direct_target`, `emotionally_salient`, `behavior_shapes_page`, `voice_shapes_page`, and `offstage_causal`.

The gap: STCHAR is operationally strong for page planning and prose fidelity, but less directly operational in SLT retrieval/ranking. It can appear as a grounded CHC record or as `record_active(STCHAR-X)` in predicates, but the main selection machinery still operates mostly through driver kind, action family, predicate class, source record id, scope, mystery policy, cooldown, and salience.

### **SLT model**

`SLT` records are causal move templates, not plot arcs. They contain scope, title, move family, hard/soft preconditions, beats, effects, exit options, saliency, mystery policy, provenance, and grounding. The `move_family` and `action_family` enums are broad enough for rich action: investigation, disclosure, negotiation, bond shift, status shift, conflict, evasion, protection, ritual protocol, recovery, and more.

The predicate DSL already supports current-state specificity: exact record activity, belief records, relationship axes, obligations, consequences, threads, intentions, plans, emotions, clocks, secrets, questions, affordances, artifacts, visible objects, and existential `any_*` predicates. This is the correct substrate for character-specific selection because it lets character specificity flow through present-causal records instead of free-form persona claims.

`SLT.grounding` is intentionally minimal: compatible turn drivers plus a reason to exist. The validator enforces non-empty compatible drivers, legal driver kinds, no generic narrative-shape clichés, and singleton driver compatibility for runtime JIT.

The gap: `SLT.grounding.reason_to_exist` can be legal while still weak. The validator bans phrases like “advance the plot” and “raise stakes,” but it does not require the storylet to be specifically anchored in a character’s plan, emotion, belief, relationship, obligation, pressure, capability, refusal, or world peculiarity.

### **CHC model**

`CHC` records are player-facing choice surfaces. Required fields are `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, and `grounded_in`. `grounded_in.records` can cite `STCHAR`, `STPLAN`, `STEMO`, `BEL`, `SREL`, `STSTAT`, `CLK`, `STSEC`, `STQ`, `SF`, `DA`, and other active story-state records.

The turn-cycle choice-generation reference is clear: CHCs do not name a specific SLT. Selection happens later against the live pool filtered by CHC grounding, action families, and the parent PG snapshot. Choices whose wording, salience, refusal, appetite, pressure behavior, relationship conduct, or persona-specific risk depends on a character profile must cite the active `STCHAR`.

The gap: CHC fields can encode grounded intent, but they do not by themselves force the surface to be character-revealing. A menu can still say “Investigate,” “Confront,” “Comfort,” “Evade” and pass if grounding and noncollapse are technically distinct.

### **SE / PG / driver model**

`SE` is the committed causal event. `SE.commitment` records `selected_slt_id`, `selection_source`, and `alias_bindings`; `turn_driver` records initiative kind, initiator, driver records, player response mode, POV visibility, and rationale fields. The driver enum includes player action, write-in, NPC action, offstage action, world pressure, clock fire, secret reveal, and multi-actor collision.

`PG` is the page snapshot. It tracks branch lineage, state snapshot, active records, visible affordances, emitted choices, continuation state, plan/state hashes, and validation trace. Active records include all the classes needed for current-state-mediated specificity.

The driver validators are real. The public registry imports and runs turn-driver, STCHAR, SLT, CHC/SLT trace, branch isolation, observer firewall, active-pressure, STPLAN/STEMO, and other structural validators.

### **STPLAN / STEMO / current-state mediation**

`STPLAN` is the tactical agency surface: holder, objective, plan status, belief basis, resources, blockers, current step, fallback, and derived-from records.

`STEMO` is the causal affective-pressure surface: holder, trigger event, appraisal basis, orientation, affect kind, intensity, behavioral pressure, agency effect, and derived-from records.

`BEL` is epistemic state and access route; `SREL` is branch-local relationship state; `STINT` is intention; `STSTAT` is life/agency/location status. These are the right current-state surfaces for character-specific SLT/CHC selection.

### **Candidate retrieval / index pipeline**

The index currently stores compact SLT projection rows for scope, provenance, move family, saliency, cooldown, mystery authority, and projection hash.

Storylet compatibility, action families, predicate names, predicate classes, and predicate refs are indexed as edges. The parser extracts compatible drivers, action families, predicate refs/classes, effects, and exit likely effects from SLT bodies.

The MCP tool `select_storylet_candidates` accepts world/story/page, turn driver, optional intent signature, and max candidates. It returns filter trace, shortlisted projection records, and `requires_full_body_ids`, intentionally avoiding full-body pool loading.

Its current pipeline filters by scope, driver kind, action family, predicate shape, predicate class, source-record id, mystery policy, and cooldown, then ranks with urgency and move-family diversity.

### **Validators and what they really enforce**

Current validators enforce:

* STCHAR body shape and operational section presence.  
* STCHAR source-fact coverage for structured dramatic-core fields.  
* STCHAR temporal boundary.  
* STCHAR page-plan packet integrity.  
* Prose-receipt STCHAR integrity.  
* No world `CHAR-*` runtime authority.  
* CHC/STCHAR grounding consistency.  
* SLT driver grounding minimality.  
* CHC/SLT selected commitment trace closure.  
* Choice-set noncollapse.  
* Turn-driver schema legality.  
* Turn-driver observer firewall.  
* Active-pressure handling.  
* Non-player response choice topical grounding.

They do **not** deterministically enforce:

* A selected SLT being the best character-specific fit.  
* A CHC revealing character under pressure.  
* A generic storylet being rejected merely because it is bland.  
* A reusable author-pool SLT being insufficiently differentiated by current plans/emotions/relationships.  
* Large-pool retrieval ranking by character specificity.

That distinction matters. The current validators are good structural validators, not literary judges.

### **Tests and fixtures**

SPEC-81 proves a 1,000-SLT pool can be shortlisted without loading full bodies and that the context packet exposes a capped pool summary and shortlist.

SPEC-84 proves replay/branch-scope behavior: newer global SLTs can be seen on replay, global SLTs with story-bundle record refs can be rejected at the source-record stage, sibling branch-scoped SLTs are excluded, and branch-prefix SLTs obey path matching.

SPEC-85 proves non-player driver legality for offstage action, clock fire, secret reveal, and multi-actor collision. These fixtures catch direct perception leaks, missing access routes, missing pressure rows, bad response grounding, and invalid collision shapes.

The gap: these tests prove legal structure and scaling. They do not yet prove STCHAR-conditioned richness or anti-generic player experience.

### **Stepwise flow**

1. Parent PG snapshot loaded.  
2. Active STCHAR summaries and relevant sections loaded.  
3. Due drivers evaluated: player action or non-player pressure.  
4. Turn driver selected.  
5. CHC intent signature or driver_records form retrieval hints.  
6. MCP filters SLT projections:  
  scope → driver → action family → predicate shape/class → source record → mystery → cooldown.  
7. Full bodies fetched only for shortlist.  
8. Turn-cycle evaluates hard predicates, existential alias bindings, observer firewall, mystery firewall, cooldown.  
9. Eligible SLT selected or branch-scoped runtime JIT created.  
10. SE.commitment records selected_slt_id + alias_bindings.  
11. State delta creates/supersedes/closes current records.  
12. Child PG snapshot materialized.  
13. Page plan §16a projects STCHAR through current state.  
14. CHCs emitted as next-page intent/response surfaces.  
---

## **4. What previous recommendations are now obsolete**

### **Implemented recommendations**

The old direct `CHC → SLT` coupling concern is obsolete. Current CHCs do not bind to a commitment block; selected SLT lives in `SE.commitment.selected_slt_id`.

Driver-kind compatibility is implemented through `SLT.grounding.compatible_turn_drivers` and MCP filtering.

Projection-based large-pool filtering is implemented and tested with a 1,000-SLT synthetic fixture.

Cooldown, replay/fork, branch-scope, and non-player driver fixtures have landed in the implementation order.

STCHAR stable-authority hardening has largely landed: source mapping, body sections, temporal-boundary validators, page-plan packet integrity, prose-receipt integrity, and no-world-CHAR runtime authority.

### **Partially implemented recommendations**

Character-specific CHC grounding is partially implemented. CHCs must ground in active records, and if wording/salience/refusal/appetite/pressure behavior/persona-specific risk depends on STCHAR, they must cite STCHAR.

But the system does not yet require a CHC set to offer character-revealing stances, refusals, appetites, relational tension, or response/witness modes beyond topical grounding.

SLT character specificity is partially implemented. Commitment-block authoring allows STCHAR-conditioned eligibility only through `record_active(STCHAR-*)` and requires STCHAR section retrieval when block eligibility/beats/effects/pressure behavior/persona/voice depend on a character.

But the retrieval/ranking surface has no explicit character-fit signal beyond existing predicates and edges.

### **Still-live recommendations**

The still-live problem is **specificity proof**:

* Prove STCHAR-specific SLT selection.  
* Prove character-specific CHC generation.  
* Prove non-player-driver player-response richness.  
* Prove generic-SLT/generic-CHC failure cases.  
* Prove large-pool filtering can rank character-specific candidates without full-body loading.  
* Prove stable STCHAR authority mediates through current state rather than absorbing current state.

### **Recommendations now proven wrong or unnecessary**

A persistent `SSEL` record class is unnecessary. The current `SE.commitment` plus MCP `filter_trace` and validation trace are enough if augmented with non-persistent specificity diagnostics.

A direct `CHC.associated_commitment_block` field is wrong. It over-promises, breaks replay/fork flexibility, and undermines late-bound selection.

A global drama manager is wrong for this repo. FOUNDATIONS explicitly favors local salience and active story state over global dramatic-shape planning.

Rich free-form persona predicates are wrong. They would be hard to validate, branch-stale, and likely to launder literary judgments into symbolic legality.

### **New risks introduced by current implementation**

The main new risk is **checkbox validity**: because so many structural gates now exist, a low-quality storylet can look valid if it cites the right classes and avoids banned generic phrases.

The second risk is **projection blindness**: the retrieval layer can efficiently filter by symbolic classes, but it cannot yet explain why one candidate is more character-specific than another.

The third risk is **STCHAR overloading through authoring habits**: even with temporal-boundary validators, authors may treat STCHAR as “character flavor” and fail to mediate through `STPLAN`, `STEMO`, `BEL`, and `SREL`.

---

## **5. Research synthesis**

### **Character-driven narrative theory**

Egri’s dramatic-writing model argues against treating character as secondary decoration; well-defined characters generate plot through motive, contradiction, opposition, and pressure. That maps directly to Worldloom: STCHAR should not paste character names onto generic moves; it should provide stable pressure behavior and contradictions that generate current plans, emotions, refusals, appetites, and relational risks.

Computational narratology also struggles with character-centric understanding: LiSCU frames narrative comprehension around character roles, personalities, relationships, intents, and actions, and reports that machines need stronger character-centric narrative models. For Worldloom, that argues for explicit state records that expose intent, affect, relationship, belief, and pressure instead of relying on prose-summary memory.

**Implication:** STCHAR should be durable character law; current records should be the operational channel where character becomes action.

### **Storylets / quality-based narrative**

Drama Llama’s storylet framework highlights the value of combining authorial structure with LLM generativity: storylets preserve control and responsiveness, while generation fills local interaction.

Fallen London / StoryNexus-like quality-based narrative shows how large pools can be driven by accumulated qualities, stats, and quest state rather than linear scenes. Its long-running design relies on many state variables and hundreds of accumulated qualities rather than a single plot track.

**Implication:** Worldloom’s current predicate/index architecture is directionally right. Anti-genericness should not come from bigger prose prompts alone; it should come from richer state qualities and author-pool storylets whose predicates and beats engage those qualities.

### **Interactive fiction and choice design**

Ink is built as a scripting language for branching interactive narrative, with current choices presented from runtime story state. Its README emphasizes highly branching stories, current choices, and a flexible engine that slots into game/UI systems rather than replacing them.

Oxenfree’s “walk and talk” design lets dialogue choice happen during movement, including interrupting, waiting, or remaining silent; its choices influence relationships and endings. Until Dawn tracks clues, secrets, relationships, personality details, and consequences, with choices affecting future scenes and outcomes.

**Implication:** CHCs should not just be action labels. They should expose stance, timing, silence/restraint, relationship pressure, and self-definition when the state supports it.

### **Drama management / experience management**

Façade integrated believable agents with an interactive plot and drama manager, using behavior language for characters and a drama manager for event organization.

Modern interactive-drama research still treats immersion and agency as separate but crucial goals, and evaluates LLM drama systems by human judgment rather than only structural validity.

**Implication:** Worldloom should not become a global drama manager, but it does need local salience management. Non-player drivers are valuable because they let NPC/world pressure initiate events, but their selection must stay grounded in active character state.

### **BDI / believable agents / affective agents**

BDI separates beliefs, desires/goals, intentions, and plans; Rao and Georgeff frame intentions as plans of action an agent is committed to achieving.

The BDI software model separates plan selection from plan execution and treats beliefs as the agent’s informational state, desires as motivational state, intentions as deliberative commitment, and plans as action recipes.

Appraisal-based emotion work for LLM game agents argues that believable affective agents should model emotion through appraisal processes, and reports better user-experience/content metrics than standard LLM architectures.

**Implication:** Worldloom’s `BEL`, `STINT`, `STPLAN`, and `STEMO` surfaces are exactly the right mediation layer. STCHAR should not directly select every storylet; it should shape the beliefs/plans/emotions that selection consumes.

### **GOAP / HTN / game AI planning**

F.E.A.R.’s GOAP architecture used STRIPS-like goals/actions with preconditions and effects so NPCs could choose goals and plan how to reach them rather than follow hard-coded transitions.

HTN planning decomposes compound tasks into executable primitive tasks using hierarchy and ordering constraints; newer work such as ChatHTN explores interleaving LLM approximations with symbolic HTN while preserving soundness.

**Implication:** `SLT` should stay closer to GOAP/HTN action libraries than to prose beats. Preconditions/effects and current state should dominate legality; LLM judgment should rank and render, not decide legality from vibes.

### **Multi-agent narrative planning**

Narrative-planning work emphasizes causal soundness and character intentionality; recent LLM story-planning research notes that character intentionality and dramatic conflict remain hard even when causal coherence improves.

Interactive narratives as situated environments require agents to perceive, act, and talk in grounded worlds with commonsense reasoning and exploration challenges.

**Implication:** Multi-actor collision should not be a global plot device. It should be a local collision of active `STPLAN`, `STEMO`, `OBL`, `CLK`, `BEL`, and `SREL` records.

### **LLM agent memory/planning/retrieval**

Generative Agents stores observations, synthesizes higher-level reflections, and retrieves memories dynamically to plan behavior; observation, planning, and reflection each contribute to believability.

Drama Engine adapts multi-agent workflows, dynamic prompt assembly, companion development, mood systems, and context summarization for narrative agents.

**Implication:** Worldloom’s context-packet discipline is right. Full storylet pools and entire STCHAR bodies should not be hot-path context. The system needs compact, symbolic retrieval plus targeted full-body fetches.

### **RPG / CRPG / tabletop NPC and choice design**

Fate’s aspect system uses free-form descriptors that can be invoked for advantage or compelled into disadvantage.

D&D alignment and roleplaying frameworks are imperfect but useful structural guides: traits, moral outlook, and party/relationship compatibility shape behavior without mechanically dictating every action.

**Implication:** STCHAR should behave like a durable roleplaying authority plus compellable pressure tendencies. But current conditions, relationships, obligations, and knowledge must remain separate.

---

## **6. Current pain points**

### **Generic SLTs**

Current SLTs can be structurally valid while remaining generic. A block titled “Investigate the suspicious clue” with legal predicates, compatible driver, and harmless `reason_to_exist` can pass even if it would work for any character in any world.

The missing diagnostic is: “What current pressure makes this storylet the right move for this character now?”

### **Generic CHCs**

`choice_set_noncollapse` prevents identical material signatures, but it cannot tell whether choices are dramatically alive. “Investigate the clue,” “Ask about the clue,” and “Examine the clue quietly” may differ in action family or grounding yet still feel like the same menu wearing different labels.

### **Character-agnostic storylet generation**

Commitment-block authoring has rich coverage targets, including cast-role coverage, driver-kind composition coverage, and pressure-source-class composition coverage. But those can become checkbox-complete if blocks are written as generic functions rather than character-state collisions.

### **Weak STCHAR operationalization in selection**

STCHAR is strongly operational in page-plan/prose. It is weakly operational in candidate retrieval. That is acceptable only if current-state mediation is strong. Right now, STCHAR → current-state → SLT/CHC is described, but not proven by fixtures.

### **STCHAR/current-state boundary risks**

The STCHAR-distillation report correctly diagnosed temporal contamination risk: STCHAR must preserve durable authority, not opening-page state. The live validators help, but future character-specific selection pressure could tempt authors to stuff current state back into STCHAR for convenience.

### **Large storylet pool scaling**

The current projection pipeline scales, but only on current symbolic axes. It can return candidates efficiently; it cannot yet surface why one candidate is more character-specific than another without fetching the body.

### **Non-player driver choice richness**

SPEC-85 verifies that response choices ground in driver records. That is necessary but not sufficient. A response can be topical and still dramatically dead.

### **Replay/fork character-specificity**

SPEC-84 proves scope lawfulness. It does not prove that newer global SLTs preserve character-specificity under replay/fork, or that a branch with different current state selects different character-shaped storylets.

### **Player-facing agency under non-player initiative**

The current model supports responder, witness, and continuation modes. But player-facing experience still needs stronger CHC authoring: under NPC/world initiative, choices should expose response stance, constrained agency, witness interpretation, refusal, risk appetite, or relationship pressure, not just “respond / wait / investigate.”

### **Validation blind spots**

The blind spots are mostly warning-level or health-audit-level, not hard schema failures:

* Generic but legal SLT.  
* Generic but legal CHC set.  
* Selected SLT has no visible relationship to the actor’s plan/emotion/belief/relationship.  
* Non-player driver produces response choices that are topical but not agency-rich.  
* Author-pool storylet coverage exists by class but not by character-state collision.  
* Selection trace cannot explain why selected candidate beats near-equivalent generic candidates.

---

## **7. Architectural alternatives**

### **Alternative A — Preserve current implementation with stronger authoring only**

**Description:** Keep schemas, MCP/index, validators unchanged. Update skills to demand stronger prose rationales and anti-generic rubrics.

**STCHAR role:** Page-plan/prose authority; indirect current-state influence.

**SLT role:** Existing causal templates.

**CHC semantics:** Existing intent promise.

**Scaling:** No new retrieval support.

**Pros:** Lowest blast radius; aligns with previous rejections.

**Cons:** Too weak. It leaves character-specificity as prompt discipline and literary judgment.

**Repository fit:** Good short-term fit, insufficient final pass.

### **Alternative B — Add rich persistent SLT/CHC schema fields**

**Description:** Add SLT fields for role lanes, pressure classes, source records, actor-binding policy, character fit, and add CHC fields for stance/refusal/appetite/expression.

**STCHAR role:** Direct selection feature.

**SLT role:** Heavier, more semantically explicit templates.

**CHC semantics:** Richer player-facing expression metadata.

**Scaling:** Good if indexed.

**Pros:** Explicit, inspectable, testable.

**Cons:** Reopens previously rejected rich grounding fields, risks overfitting, schema bloat, free-form persona validation, and checklist authoring. It would tempt authors to encode literary quality as hard law.

**Repository fit:** Poor unless future production failure proves current surfaces inadequate. The active implementation order explicitly rejected rich SLT grounding fields.

### **Alternative C — Current-state-mediated specificity with derived retrieval trace**

**Description:** Keep SLT/CHC record shapes. Add derived projection fields and MCP specificity trace computed from existing predicates, edges, driver records, CHC grounding, active state, and STCHAR/STENT bindings. Add skill contracts and warning validators.

**STCHAR role:** Stable authority that shapes current state and page-plan packets; direct only for branch-scoped exact STCHAR blocks.

**SLT role:** Existing causal move with predicates/effects; specificity inferred from predicate/edge overlap with active character-state records.

**CHC semantics:** Existing intent promise; stronger authoring and warning-level review.

**Scaling:** Strong: symbolic projection first, targeted full-body fetch after shortlist.

**Pros:** Preserves landed architecture, avoids schema bloat, gives retrieval explainability, creates deterministic test surfaces, and supports character-specificity without turning STCHAR into current state.

**Cons:** Less explicit than adding persistent fields; requires careful MCP and health-audit work.

**Repository fit:** Best.

### **Alternative D — Pattern/instance storylet split**

**Description:** Split storylets into reusable abstract patterns plus branch-local instantiated SLTs. Global pool contains generic patterns; runtime creates character-specific branch-local instances.

**STCHAR role:** Used during instantiation.

**SLT role:** Pattern + instance.

**CHC semantics:** Late-bound to instances.

**Scaling:** Good if patterns projected compactly.

**Pros:** Powerful anti-generic architecture; clean separation of reusable trope and branch-specific realization.

**Cons:** Large conceptual change; new record class or schema family likely; risk of bloating runtime with JIT instances; unnecessary before exhausting current SLT scope/predicate design.

**Repository fit:** Interesting future option, not final-pass target.

### **Alternative E — Local drama manager**

**Description:** Add a planner that scores candidate moves by desired narrative tension, escalation, pacing, and arc shape.

**STCHAR role:** Character variables in drama-manager scoring.

**SLT role:** Move library.

**CHC semantics:** Player choices shaped by global experience plan.

**Scaling:** Could be efficient.

**Pros:** Strong narrative control.

**Cons:** Violates Worldloom’s local-salience principle; risks railroading; revives narrative-shape fields explicitly rejected by validators and fixtures.

**Repository fit:** Bad.

---

## **8. Recommended architecture**

Pick Alternative C: **current-state-mediated specificity with derived retrieval trace**.

The architecture should preserve:

* Late-bound CHC.  
* `SE.commitment.selected_slt_id`.  
* `SLT` as causal move, not arc.  
* `STCHAR` as durable authority, not current state.  
* Symbolic projection filtering before full-body fetch.  
* Local salience, no global drama manager.  
* Observer firewall.  
* Branch/replay scope lawfulness.

### **How STCHAR should influence SLT and CHC**

STCHAR should influence selection in four layers:

1. **Stable constraint layer:** capabilities, limits, perception, voice, refusal, pressure behavior, relationship behavior, and agency tendencies are stable law.  
2. **Current-state derivation layer:** those stable laws create or constrain `STPLAN`, `STEMO`, `BEL`, `SREL`, `STINT`, `STSTAT`, and affordances.  
3. **Eligibility/ranking layer:** SLT predicates and CHC grounding should match those current-state records.  
4. **Rendering/surface layer:** page-plan §16a and CHC wording express the character-specific surface.

Direct STCHAR predicates should remain narrow:

* Branch-scoped or branch-prefix-scoped SLTs may use `record_active(STCHAR-X)` when a specific character’s stable authority is intrinsic to the block.  
* Global author-pool SLTs should prefer role/current-state predicates such as `any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`, and active pressure records.

### **What remains mediated through current state**

Current fear, plan blockage, relationship rupture, suspicion, debt, clock pressure, secret access, public knowledge, object access, injury, location, and obligation must be mediated through current records, not STCHAR.

### **How to prevent generic storylets**

Require every selected non-fallback SLT to be explainable as at least one of:

* active plan pressure,  
* active emotion/appraisal pressure,  
* belief/knowledge access,  
* relationship-axis pressure,  
* obligation/consequence/thread pressure,  
* clock/secret/question pressure,  
* affordance/capability/limit pressure,  
* world-specific artifact/location/institutional constraint,  
* explicit branch-scoped STCHAR authority.

Do this through skills, MCP specificity trace, warning validators, and fixtures—not by adding prose-heavy schema fields.

### **How to prevent generic choices**

Every meaningful CHC set should contain at least two choices that differ not just by action family, but by **commitment stance**:

* risk vs safety,  
* truth vs concealment,  
* duty vs appetite,  
* intimacy vs distance,  
* public vs private,  
* restraint vs escalation,  
* protect self vs protect other,  
* obey plan vs betray plan,  
* soothe emotion vs exploit emotion,  
* accept obligation vs refuse obligation.

This is a skill/health-audit/judgment rubric, not hard schema law.

### **Replay/fork policy**

Replay/fork should keep current SPEC-84 semantics:

* Newer global SLTs may be available when replaying/forking from an old page.  
* Branch-scoped SLTs stay branch-scoped.  
* Branch-prefix SLTs require matching page path.  
* Character-specificity is re-evaluated from the parent PG snapshot and active records at fork time.  
* Historical committed choices remain historical; late-bound future resolution can benefit from newer author-pool SLTs without rewriting old pages.

### **Non-player drivers**

For `npc_action`, selected SLT should represent the NPC’s committed character-specific move, grounded in that NPC’s active `STPLAN`, `STEMO`, `BEL`, `SREL`, `OBL`, `CLK`, `THR`, or STCHAR-derived stable pressure.

For `offstage_action`, selected SLT should represent the offstage causal pressure, but page/choice surfaces must only expose the accessible trace.

For `clock_fire`, character-specificity enters through who is pressured, who caused it, who can respond, and what active plans/emotions/relationships the clock threatens.

For `secret_reveal`, character-specificity enters through holder, receiver, access route, relationship, and belief transformation.

For `multi_actor_collision`, the selected SLT should represent a local collision of multiple active plans/emotions/obligations/clocks, not a global plot beat.

### **Breaking changes**

No breaking persistent schema changes are justified for `STCHAR`, `SLT`, or `CHC` at this stage.

Small breaking or additive changes are justified for MCP/index surfaces if needed:

* derived projection columns,  
* optional MCP input `specificity_signature`,  
* response-only `specificity_trace`.

These do not change record semantics and have direct retrieval/test consumers.

---

## **9. Concrete schema / contract changes**

### **9.1 `story-character-authority.schema.json`**

**Current shape:** Strong frontmatter and `source_operational_fact_map`; body sections enforce stable authority.

**Proposed shape:** No JSON schema change.

**Contract change:** Add to shared contract and story-character-profile skill:

STCHAR may authorize stable appraisal, pressure behavior, agency tendency,  
relationship conduct, perception, embodiment, capability, limit, voice, and  
choice-shaping constraints. It must not store current fear, current belief,  
current plan, current relationship state, current status, current location,  
current object possession, active obligation, active clock, active secret,  
active question, or page-local presentation. Those belong in current story  
records and page-plan §16a.

**Breaking impact:** None.

**Example valid STCHAR material:**

## Pressure Behavior

When publicly cornered, Mara converts shame into clipped procedural objections  
before she asks for help. She does not confess need while the authority figure  
is still in the room.

**Example invalid STCHAR material:**

## Pressure Behavior

On PG-6, Mara is bruised, ashamed, and hiding behind the tollhouse after SE-5.

### **9.2 `story-storylet.schema.json`**

**Current shape:** Good. Do not add rich persistent fields.

**Proposed shape:** No record-schema change.

**Contract addition:** Add “Character-Fit Selection Contract” to `story-state-contract.md` and `commitment-block-authoring`:

A non-fallback SLT selected for a turn must be explainable from at least one  
active character/current-state pressure surface: STPLAN, STEMO, BEL, SREL,  
STINT, STSTAT, OBL, CNSQ, THR, CLK, STSEC, STQ, DA/STOBJ/STLOC affordance,  
or lawful branch-scoped STCHAR authority. Generic action-family fit alone is  
not enough for a high-confidence selection.

**Breaking impact:** None for records; new warning diagnostics possible.

**Example valid SLT:**

id: SLT-42  
scope:  
 visibility: global_author_pool  
move_family: bond_shift  
preconditions:  
 hard:  
   - pred: any_relationship_axis  
     alias: trust_edge  
     axis: trust  
     comparator: "<="  
     value: -1  
   - pred: any_emotion_active  
     alias: shame_pressure  
     holder_role: primary_actor  
     kind: shame  
     min_intensity: 3  
beats:  
 - beat_id: B1  
   function: pressure  
   instruction: The actor chooses whether to protect face or repair the damaged trust.  
exit_options:  
 - action_family: communicate  
   surface_hint: Admit only the part of the truth that protects the relationship.  
grounding:  
 compatible_turn_drivers: [player_action, npc_action]  
 reason_to_exist: Forces a trust-damaged actor under shame pressure to choose between face-saving and repair.

**Example invalid / warning SLT:**

id: SLT-43  
move_family: conflict  
preconditions:  
 hard:  
   - pred: has_affordance  
     action_family: oppose  
beats:  
 - beat_id: B1  
   function: action  
   instruction: Someone confronts someone.  
grounding:  
 compatible_turn_drivers: [player_action]  
 reason_to_exist: Provides a confrontation option.

This should not be a schema fail, but it should be a health-audit warning in a rich bundle.

### **9.3 `story-choice.schema.json`**

**Current shape:** Good. Do not add `selected_slt_id`, `late_bound`, or outcome fields.

**Proposed shape:** No schema change.

**Contract addition:** Add CHC quality contract:

A CHC freezes intent, stance, grounding, and likely pressure direction. It never  
promises success, exact outcome, exact state delta, secret truth, or selected  
storylet. When a CHC depends on character-specific refusal, appetite, fear,  
relationship pressure, voice, plan, belief, or emotion, it must ground in the  
active STCHAR and the active temporal record that makes the choice available now.

**Example valid CHC:**

id: CHC-12  
surface_label: "Ask her what the receipt cost her, not what it proves."  
player_visible_intent: "Approach Mara through the debt she is trying to hide rather than accusing her of forgery."  
target_or_action_families: [communicate, investigate, bond]  
likely_state_pressure: "May expose the obligation behind the receipt while avoiding a public accusation."  
grounded_in:  
 records: [STENT-2, STCHAR-2, BEL-7, OBL-3, DA-1, SREL-4]

**Example invalid / warning CHC:**

surface_label: "Investigate."  
player_visible_intent: "Look for more information."  
target_or_action_families: [investigate]  
likely_state_pressure: "May reveal something."  
grounded_in:  
 records: [STCHAR-2]

This is technically grounded but dramatically weak if the page has active `BEL`, `OBL`, `DA`, or `SREL` records that make the investigation meaningful.

### **9.4 `story-event.schema.json`**

**Current shape:** `SE.commitment` already has selected SLT and alias bindings. `world_logic_rationale` already exists in skill practice.

**Proposed shape:** No immediate schema change.

**Contract addition:** Require `SE.turn_resolution.world_logic_rationale` or page-plan §7a to include a **Selection Rationale** that names:

* selected driver,  
* selected SLT,  
* active records that made it specific,  
* whether STCHAR was direct or current-state mediated,  
* why obvious generic alternatives were rejected or deprioritized.

**Breaking impact:** None if kept in existing rationale text. Later, if production needs machine-readable audit, add a structured field. Do not add it now.

### **9.5 `story-page.schema.json`**

**Current shape:** PG has state snapshot, emitted choices, visible affordances, validation trace.

**Proposed shape:** No schema change.

**Contract addition:** Page-plan §7a should include candidate-filter summary only when a selection warning/audit demands it. The previous implementation order deferred mandatory §7a candidate-filter prose because no deterministic reader existed; keep it deferred unless the new specificity trace gets a validator/audit consumer.

### **9.6 MCP / index contracts**

**Current shape:** `slt_projections` stores compact projection columns; edges store driver/action/predicate data.

**Proposed additive projection fields derived from existing SLT bodies:**

slt_projection_predicate_classes_json  
slt_projection_predicate_refs_json  
slt_projection_action_families_json  
slt_projection_compatible_turn_drivers_json  
slt_projection_current_state_classes_json  
slt_projection_stchar_refs_json

These are not new SLT fields. They are denormalized projections of existing predicates/edges for faster filtering, explainability, and tests.

**Proposed MCP input addition:**

specificity_signature?: {  
 actor_stent_ids?: string[];  
 active_stchar_ids?: string[];  
 driver_record_ids?: string[];  
 grounding_record_ids?: string[];  
 pressure_record_classes?: string[];  
 preferred_action_families?: string[];  
 response_mode?: "initiates" | "responds" | "witnesses" | "chooses_continuation";  
}

**Proposed MCP response addition:**

specificity_trace?: {  
 candidate_id: string;  
 exact_record_matches: string[];  
 class_matches: string[];  
 action_family_matches: string[];  
 driver_matches: string[];  
 stchar_matches: string[];  
 specificity_score: number;  
 specificity_explanation: string;  
}[];

**Breaking impact:** Additive. Existing callers can ignore it.

**Why acceptable:** It has direct retrieval and test consumers; it does not mutate story records; it does not make embeddings a legality filter.

---

## **10. Skill changes**

### **`story-character-profile`**

Add an explicit “STCHAR influences selection through current-state mediation” subsection:

When drafting Story-State Derivation Guide, name how this character’s stable  
authority may generate or constrain STINT, STPLAN, STEMO, BEL, SREL, CHC,  
visible affordances, and page-plan §16a. Do not ask runtime skills to select  
storylets from STCHAR vibes. Give operational derivation rules.

### **`branching-story-bootstrap`**

In first-choice generation, require each non-write-in CHC to state which of these it samples:

* stable STCHAR only,  
* STCHAR + current emotion,  
* STCHAR + active relationship,  
* STCHAR + belief/secret,  
* STCHAR + obligation/thread/clock,  
* affordance/world constraint.

Bootstrap should not generate three “starter options” that differ only by verb.

### **`branching-story-turn-cycle`**

In Phase 2, after MCP shortlist and before final selection, add a **Specificity Pass**:

For each eligible candidate, score whether it matches the selected driver,  
chosen CHC grounding, active pressure records, actor’s STPLAN/STEMO/BEL/SREL,  
visible affordances, and STCHAR-mediated constraints. Prefer a candidate that  
uses current character-state pressure over a generic action-family match.

In Phase 8, add a **Choice Stance Pass**:

Before emitting CHCs, identify the page’s dominant character pressure. Each  
meaningful CHC should expose a distinct stance toward that pressure, not merely  
a different verb.

### **`commitment-block-authoring`**

Strengthen direct batch diagnosis:

For every planned SLT, write a one-line character/current-state specificity  
rationale. If the block is global_author_pool, the rationale must be expressed  
through role/current-state predicates, not exact STCHAR ids. If branch_scoped,  
exact STCHAR predicates are lawful when the character’s stable authority is the  
reason this block exists.

Add batch diversity target:

At least half of a direct_batch that targets a live story bundle should engage  
one of: STPLAN, STEMO, BEL, SREL, OBL/CNSQ/THR, CLK/STSEC/STQ, DA/STOBJ/STLOC  
affordance, or branch-scoped STCHAR authority.

### **`branching-story-health-audit`**

Add a character-specificity audit mode:

* generic SLT warnings,  
* generic CHC warnings,  
* STCHAR-current-state boundary warnings,  
* non-player driver response richness warnings,  
* large-pool projection explainability checks.

### **`branching-story-prose-attach`**

Do not add new structure unless actual rendered prose failures appear. Prose attach should continue to validate against page-plan §16a and prose receipt STCHAR fidelity. The current implementation order correctly defers non-player hidden-mind prose checks until real renderer outputs exist.

---

## **11. MCP / index / retrieval changes**

### **What projections currently exist**

Current projection support includes scope, provenance, move family, urgency, cooldown, mystery authority, compatible drivers, predicate names/classes/refs, and action families through a mix of projection rows and edges.

### **What new projections are needed**

Add derived, denormalized projection arrays for:

* predicate classes,  
* predicate refs,  
* action families,  
* compatible drivers,  
* STCHAR refs,  
* current-state classes,  
* existential predicate kinds.

This avoids repeated edge joins and gives the MCP response a compact explainability surface.

### **Should STCHAR-derived features be indexed?**

Index exact STCHAR refs only when already present in SLT predicates. Do **not** index free-form STCHAR traits like “wound” or “fear of abandonment.” That would create unvalidated persona search.

### **Should STPLAN/STEMO/BEL/SREL projections be enough?**

For global author-pool legality: yes. Global storylets should usually filter by current-state record classes and existential predicates.

For branch-scoped character-specific storylets: exact STCHAR refs are acceptable.

### **Candidate filtering API**

Recommended pipeline:

1. Scope / branch / replay lawfulness.  
2. Driver-kind compatibility.  
3. Action-family compatibility.  
4. Predicate shape/class compatibility.  
5. Exact source-record overlap.  
6. Mystery/canon policy.  
7. Cooldown.  
8. Specificity ranking:  
  - exact driver-record overlap  
  - CHC grounding overlap  
  - active current-state class overlap  
  - actor/STCHAR mediated overlap  
  - affordance/world constraint overlap  
  - diversity penalty for repeated move_family  
9. Return projection shortlist + specificity trace.  
10. Fetch full bodies only for shortlist.

### **Embeddings**

Embeddings may be used only above symbolic legality as a diversification or copy-edit aid. They must not decide legality, observer access, mystery safety, branch scope, or cooldown.

### **Tests proving retrieval correctness**

Add tests for:

* specificity trace scoring,  
* no full-body loading before shortlist,  
* STCHAR exact-ID branch-scoped match,  
* global-pool current-state existential match,  
* branch replay with newer global candidate,  
* non-player driver candidate ranking,  
* generic fallback deprioritized when character-specific candidate exists.

---

## **12. Validator changes**

### **`slt_character_specificity_warning`**

**Severity:** warn  
 **Applies-to:** full-world, patch-plan touching SLT, health audit  
 **Inputs:** SLT body, active bundle context when available  
 **Failure codes:**

* `slt_generic_reason_to_exist`  
* `slt_no_current_state_pressure`  
* `slt_branch_specificity_without_branch_scope`  
* `slt_exact_stchar_in_global_pool`

**Diagnostic example:**

SLT-44 is global_author_pool but depends on STCHAR-2 exact authority. Use branch_scoped/branch_prefix_scoped visibility or rewrite as role/current-state predicates.

### **`selected_slt_specificity_trace_warning`**

**Severity:** warn  
 **Applies-to:** SE/PG commit, health audit  
 **Inputs:** selected SE, parent PG snapshot, selected SLT, CHC if player-sourced, MCP specificity trace if available  
 **Failure codes:**

* `selected_slt_generic_action_family_only`  
* `selected_slt_no_driver_record_overlap`  
* `selected_slt_no_actor_state_overlap`  
* `selected_slt_stchar_unmediated_when_state_exists`

**Diagnostic example:**

SE-12 selected SLT-7 for STENT-2, but selection rationale cites only action_family=investigate while active STEMO-4 and SREL-3 constrain the actor.

### **`chc_character_specificity_warning`**

**Severity:** warn  
 **Applies-to:** CHC creation, health audit  
 **Inputs:** child PG snapshot, emitted CHCs, page plan §13, §16a  
 **Failure codes:**

* `chc_generic_surface_label`  
* `chc_grounding_too_thin_for_active_pressure`  
* `chc_missing_stchar_for_persona_specific_surface`  
* `chc_stance_not_distinct`

**Diagnostic example:**

CHC-5 says "Confront her" and grounds only in STCHAR-2, but active OBL-3 and SREL-4 are the material pressure. Ground the choice in the obligation/relationship or make it a stable-authority-only expressive choice.

### **`non_player_response_richness_warning`**

**Severity:** warn  
 **Applies-to:** non-player driver pages with emitted CHCs  
 **Inputs:** SE.turn_driver, CHCs, child PG snapshot  
 **Failure codes:**

* `response_choice_topical_but_not_agential`  
* `witness_choice_missing_interpretive_stance`  
* `continuation_choice_ignores_driver_pressure`

**Diagnostic example:**

PG-8 follows npc_action SE-7, but all emitted CHCs are generic continuation/investigation options. At least one response CHC should oppose, protect, question, evade, or reinterpret the NPC move through active driver records.

### **`stchar_current_state_mediation_warning`**

**Severity:** warn  
 **Applies-to:** STCHAR + CHC/SLT/SE health audit  
 **Inputs:** active STCHAR, active state records, selected SLT, CHCs  
 **Failure codes:**

* `stchar_used_without_current_state_when_current_state_exists`  
* `current_state_ignored_by_character_specific_choice`  
* `temporal_state_leaking_into_stchar_selection_rationale`

**Diagnostic example:**

Selection rationale cites STCHAR-2's pressure behavior, but active STEMO-5 is the current affective pressure and is not cited.

### **Things that must never be hard-validated**

Do not hard-validate “beautiful prose,” “compelling,” “emotionally moving,” “literary quality,” or “reveals character” as schema law. These are health-audit and judgment-assisted review categories.

---

## **13. Choice semantics and quality model**

### **CHC as intent promise**

A CHC promises what the player is trying to do or express, not what will happen.

It may promise:

* intent,  
* target/action family,  
* visible stance,  
* accessible grounding,  
* likely pressure direction,  
* optional attempt-success policy.

It must not promise:

* exact outcome,  
* hidden truth,  
* success,  
* selected SLT,  
* state delta,  
* NPC inner state without access route,  
* canonical promotion.

### **CHC as character-revealing expression**

A good CHC should often reveal how the player-character or player-directed actor responds under pressure. “Ask about the receipt” is weaker than “Ask what the receipt cost her, not what it proves.” The second exposes relationship pressure, belief access, and restraint.

### **CHC as surface affordance**

Physical/world affordances matter. A choice can be specific because only this location, object, institution, ritual, or artifact makes it available.

### **CHC under non-player initiative**

When the player is not the initiator, CHCs should still offer agency:

* respond,  
* witness,  
* choose continuation,  
* interpret,  
* protect,  
* refuse,  
* expose,  
* conceal,  
* redirect,  
* stay silent,  
* make a constrained write-in.

### **Deterministic axes**

Hard/warning validators can inspect:

* distinct action families,  
* distinct grounded records,  
* distinct likely_state_pressure text,  
* active pressure record coverage,  
* STCHAR grounding where persona-specific,  
* response grounding in driver records,  
* generic label lexicon warnings.

### **Judgment-assisted axes**

A human/LLM health-audit pass should review:

* whether choices reveal character,  
* whether alternatives are morally/relationally distinct,  
* whether the menu feels like agency rather than verbs,  
* whether wording respects POV limits,  
* whether the write-in envelope is honest.

---

## **14. Driver-aware, character-aware SLT selection model**

### **`player_action`**

Filter by chosen CHC action families and grounding. Rank candidates higher when they engage the chosen CHC’s current-state records, not merely its action family.

### **`player_write_in`**

Parse intent and visible affordances. Build specificity signature from parent PG active records plus inferred action family. Reject storylets requiring unavailable knowledge.

### **`npc_action`**

Driver records should usually include active `STPLAN`, `STEMO`, `CLK`, `THR`, or `STCHAR`. Select an SLT that expresses the NPC’s current plan/emotion/pressure, not generic “NPC does something.”

### **`offstage_action`**

Select from offstage-compatible SLTs. Candidate must be explainable through accessible trace records. Do not expose hidden motive unless BEL/DA/testimony/trace supports it.

### **`world_pressure`**

Select SLTs tied to location, institution, ritual, hazard, object, public belief, or canon constraint. Character specificity enters through who is exposed and what active plans/emotions/relationships are pressured.

### **`clock_fire`**

Select clock-compatible SLTs whose effects engage the fired `CLK` and affected active records. Character-specificity comes from who caused, suffers, can respond, or must choose under the clock.

### **`secret_reveal`**

Select an SLT grounded in `STSEC`, access route, holder/receiver, and belief transformation. Response CHCs must cite the secret or derived BEL.

### **`multi_actor_collision`**

Select an SLT whose predicates/bindings cover multiple driver records. Rank for real collision: plan vs obligation, emotion vs relationship, clock vs secret, etc.

### **`repair/audit`**

No literary flourish. Repair drivers should choose minimal, branch-lawful correction blocks.

---

## **15. Storylet generation / pool diversity model**

### **Bootstrap seed policy**

Bootstrap should seed fewer generic “basic actions” and more pressure-shaped blocks:

* relationship rupture,  
* blocked plan,  
* shame/fear pressure,  
* obligation conflict,  
* secret clue access,  
* clock threshold,  
* artifact/world-constraint pressure,  
* recovery/de-escalation.

### **Direct batch policy**

Direct batch should diagnose uncovered pairs:

driver kind × pressure source class × role lane

But the authoring prompt must add a specificity line:

Why this block would not be the same if the active actor/state changed:

### **Audit repair policy**

When an audit finds generic choice/storylet behavior, generate one repair SLT per actual gap. Do not grow generic pools.

### **Runtime JIT policy**

JIT is acceptable when no existing storylet fits. It must be branch-scoped, exact-record grounded, and include a short specificity rationale.

### **Character-specificity policy**

A storylet is character-specific when at least one of these is true:

* It requires a specific active plan/emotion/belief/relationship/obligation.  
* It requires a visible affordance only meaningful to the actor’s capability/limit.  
* It is branch-scoped around a specific active STCHAR.  
* Its beats force a stable refusal/appetite/pressure behavior into conflict with current state.

### **Reusable pattern vs branch-local specificity**

Global author-pool SLTs should be **patterns over current-state classes**.

Branch-scoped SLTs should be **instances over exact records**.

Branch-prefix SLTs can be **semi-specific patterns** for branch families.

---

## **16. STCHAR ⇄ current-state mediation model**

### **What belongs in STCHAR**

* stable persona core,  
* stable appraisal patterns,  
* pressure behavior,  
* voice/dialogue authority,  
* perception/embodiment,  
* agency/planning tendencies,  
* capability limits and costs,  
* relationship-specific conduct,  
* derivation guide,  
* prose-rendering constraints.

### **What belongs in current state**

* current emotion: `STEMO`,  
* current plan: `STPLAN`,  
* current belief/knowledge/access route: `BEL`,  
* current relation state: `SREL`,  
* current intention: `STINT`,  
* current status/location/agency: `STSTAT`,  
* current obligation/consequence/thread: `OBL`, `CNSQ`, `THR`,  
* current clock/secret/question: `CLK`, `STSEC`, `STQ`,  
* current artifact/object/location affordance: `DA`, `STOBJ`, `STLOC`.

### **How stable authority generates current state**

STCHAR says:

When cornered by public authority, she protects face before asking for help.

Current state records say:

STEMO: shame intensity 4 toward STENT-3  
STPLAN: keep ledger hidden until debt collector leaves  
BEL: she believes STENT-3 saw the altered receipt  
SREL: trust -2 with STENT-3

SLT/CHC selection should use the current records. STCHAR explains why those records are plausible and how to surface them.

### **Preventing temporal leakage into STCHAR**

Keep existing temporal-boundary validator. Add health-audit warning when selection rationale cites STCHAR for something already represented by current records.

### **Preventing STCHAR from being ignored**

Add health-audit warning when a CHC/SLT surfaces persona-specific refusal, appetite, voice, pressure behavior, or relationship conduct without citing the relevant active STCHAR.

---

## **17. Replay / fork semantics**

### **Newer global SLTs**

A branch forked from an old page may see newer global author-pool SLTs if they pass symbolic legality against that parent PG snapshot. SPEC-84 already proves this behavior.

### **Branch-scoped SLTs**

Only visible in their owning branch. No change.

### **Branch-prefix SLTs**

Visible only when the page path matches prefix. No change.

### **Character-specific replay lawfulness**

Character-specificity is evaluated at replay/fork time from the parent PG snapshot:

* active STCHARs,  
* active STPLAN/STEMO/BEL/SREL/etc.,  
* visible affordances,  
* branch path,  
* selected driver or CHC.

A newer global SLT should not become eligible merely because it names a character-ish theme. It must match active current-state classes or exact lawful grounding.

### **Frozen choices**

Historical CHC text remains frozen. It does not retroactively promise a newly-added SLT.

### **Late-bound choices**

Future resolution can select from newer global SLTs if the frozen CHC’s action family/grounding and the parent PG state make that lawful.

---

## **18. Implementation order**

1. **SPEC-A — Character-Fit Selection Contract**  
   * Update shared story-state contract, turn-cycle, commitment-block authoring, bootstrap, health-audit.  
   * Acceptance: skill text distinguishes stable STCHAR, current state, SLT eligibility, CHC stance.  
2. **SPEC-B — Derived Specificity Projection / MCP Trace**  
   * Add derived projection arrays or equivalent edge aggregation.  
   * Add optional `specificity_signature`.  
   * Add response-only `specificity_trace`.  
   * Acceptance: existing SPEC-81 tests still pass; no full-body loading before shortlist.  
3. **SPEC-C — Specificity Warning Validators**  
   * Add `slt_character_specificity_warning`, `selected_slt_specificity_trace_warning`, `chc_character_specificity_warning`, `non_player_response_richness_warning`.  
   * Acceptance: warnings only; no hard schema law for literary quality.  
4. **SPEC-D — Golden Character-Specific Selection Fixtures**  
   * Add STCHAR-specific, generic-SLT failure, generic-CHC failure, non-player response richness, replay/newer-global, and large-pool filtering fixtures.  
   * Acceptance: fixtures prove both positive and negative cases.  
5. **SPEC-E — Health Audit Character-Specificity Mode**  
   * Add audit report section and remediation card shape.  
   * Acceptance: audit can recommend SLT/CHC/story-state repairs without schema migration.  
6. **SPEC-F — Optional Production Follow-up**  
   * Only after real playtests: decide whether a structured `SE.commitment.selection_rationale` field is worth adding. Do not add now.

---

## **19. Golden fixtures / tests**

### **Rich STCHAR-specific selection fixture**

Two active STCHARs share a location and object. One has stable pressure behavior that, through active `STEMO` + `SREL`, makes a bond-shift SLT fit. The other has a different active `STPLAN` making a protection/evasion SLT fit.

**Pass condition:** selector ranks the correct SLT based on current-state overlap and specificity trace.

### **Generic SLT failure fixture**

A generic “confront/investigate” SLT matches action family but no pressure/source specificity. A richer SLT matches `STEMO`, `BEL`, and `SREL`.

**Pass condition:** generic SLT receives warning or lower specificity score.

### **Generic CHC failure fixture**

A page with active `OBL`, `BEL`, `SREL`, and `DA` emits CHCs:

Investigate.  
Confront.  
Comfort.  
Leave.

**Pass condition:** warning for thin grounding/generic surfaces.

### **Non-player-driver character-specific fixture**

NPC has active `STPLAN`, `STEMO`, and `SREL`; driver is `npc_action`; selected SLT expresses the NPC’s pressure-specific move; player response CHCs include oppose/protect/question/withhold stances grounded in driver records.

**Pass condition:** validator passes legality and health audit marks response richness.

### **Replay/newer-global-SLT fixture**

Old page fork sees newer global author-pool SLT only if its current-state predicates match the parent snapshot.

**Pass condition:** generic newer SLT excluded/deprioritized; current-state-specific newer SLT allowed.

### **Large synthetic pool filtering fixture**

1,000 SLTs; only 20 have matching current-state class; only 5 have exact driver/grounding overlap; no full-body load until shortlist.

**Pass condition:** specificity trace generated from projections.

### **STCHAR boundary fixture**

One STCHAR contains stable pressure behavior; active STEMO contains current fear. A selection rationale citing current fear from STCHAR fails warning.

**Pass condition:** warning demands `STEMO` grounding.

---

## **20. Non-goals**

Explicitly reject:

* outcome-promising CHCs,  
* direct CHC-to-SLT binding,  
* generic storylets with names pasted in,  
* global drama manager / target narrative-shape planner,  
* turning STCHAR into current state,  
* making NPCs omniscient,  
* validating literary quality as hard schema law,  
* loading thousands of full storylets into LLM context,  
* generic storylet generation without driver/pressure/cast grounding,  
* embeddings as legality filters,  
* persistent `SSEL` record class,  
* backwards-compatibility shims unless a real migration requires them,  
* schema fields without deterministic validator, retrieval/index consumer, skill consumer, or replay/selection purpose.

---

## **21. Open questions**

1. Whether MCP specificity trace should remain response-only forever or eventually become a structured `SE.commitment.selection_rationale` field. I recommend response-only until real audit failures prove persistence is needed.  
2. Whether `choice_set_noncollapse` should grow a warning-only sibling for stance diversity. Hard failure would be too brittle; warning looks right.  
3. Whether production storylet pools will actually reach a scale where denormalized projection arrays matter. SPEC-81 proves synthetic scale; authored large-pool proof is still deferred, but character-specific ranking may make it necessary sooner.  
4. Whether branch-prefix-scoped STCHAR-specific storylets should be common. My bias: rare but useful. Most character specificity should flow through current state, not exact STCHAR predicates.

---

# **Bottom line**

Worldloom’s architecture is sound. The system already has the right primitives: durable STCHAR, current-state records, symbolic storylets, late-bound choices, driver-aware events, branch-aware retrieval, and strong legality validators.

The final improvement pass should not redesign that. It should make the system **prove and explain character fit**:

not “this action is legal”  
but “this is the right causal move for this actor, under this pressure, with this knowledge, in this relationship, at this page.”

That is the missing layer between structural validity and story that feels alive.

## Outcome

Archived on 2026-05-25 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
