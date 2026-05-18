# **Proposal: Missing High-Value Story Features for Worldloom**

## **1. Executive summary**

Worldloom’s story system is already much stronger than the feature list in the prompt might imply. It already has branch-local facts, beliefs, events, intentions, relationships, obligations, consequences, threads, statuses, locations, objects, choices, storylets/commitment blocks, pages, branches, diegetic artifacts, story-to-canon promotion, closeout, deterministic snapshots, hard gates, health audits, and MCP/validator integration. The big missing pieces are not “more narrative vocabulary.” The big missing pieces are **first-class structures for narrative debt, revelation design, escalating pressure, character plans, and branch convergence**.

The highest-leverage additions are:

1. **`STQ` — Story Question / Promise-Payoff record.** This should be the first thing built. Worldloom needs an explicit ledger for “what question/promise/setup is alive, what would count as payoff, and whether it was answered, paid off, abandoned, or deferred.” Current `THR`, `CNSQ`, and `OBL` records approximate this, but none cleanly tracks audience-facing narrative debt.  
2. **`STSEC` + `STCLUE` — Story Secret and Clue records.** Worldloom already has strong `BEL`, `SF`, and `DA` handling, but it lacks a story-local revelation architecture: secrets, clues, clue carriers, clue strength, discovery state, and revelation validity. This is distinct from world-level Mystery Reserve. It is the missing machinery for mysteries, secrets, locked information, audience/character asymmetry, and revelations.  
3. **`CLK` — Pressure Clock / Escalation Ladder.** Current urgency fields are too coarse. Worldloom needs first-class ticking pressure: threats that advance, deadlines that mature, factions moving offscreen, and staged consequences. This should unify “threats with escalation stages,” “clocks,” “fronts,” “timers,” and “deadline-bearing obligations” without adding a whole tactical game layer.  
4. **`STPLAN` — Character Plan / Motive Chain.** Current `STINT` records say what a character wants, and `BEL` records say what they know or think. What is missing is the bridge: “given these beliefs, relationships, constraints, and resources, what plan is this agent pursuing?” This is the most important upgrade for character agency, but it should come after `STQ`, `STSEC/STCLUE`, and `CLK`.  
5. **`CONV` — Branch Convergence Contract.** This is valuable but not urgent. The current branch system is isolation-first; it needs an author-facing way to converge branches safely once high-salience commitments, secrets, clocks, and story questions are compatible.

Do **not** add scenes, acts, arcs, episodes, climax structures, dramatic curves, motif records, theme records, tone systems, or general “pacing curve” schemas now. Worldloom’s own contract explicitly rejects commitment blocks as acts/arcs/plot rails, and bootstrap explicitly warns against authoring fixed dramatic milestones. Adding those structures would drag the system toward generic outline tooling and away from its causal-engine philosophy. Commitment blocks already contain beats; pages already function as causal ticks; `STORY_KERNEL.md` already carries tone, POV, and player agency. The missing features should deepen causality and consequence, not install Hollywood-structure templates.

---

## **2. Current system reconstruction**

### **2.1 Foundational model**

Worldloom’s core philosophy is that a story world is not “a bag of cool facts” but a constrained model of ontology, space, time, causality, embodiment, institutions, resources, culture, knowledge, history, daily life, pressure points, and mystery reserves. Canon facts must live inside that model, and newly canonized domains must acknowledge prior silence rather than silently retconning the world.

The canon system distinguishes hard canon, derived canon, soft/local truth, contested canon, and separate Mystery Reserve records. Mystery Reserve entries are first-class `M-*` records, not a canon-fact status. Forbidden mysteries cannot be resolved, and active/passive mysteries have explicit future-resolution safety.

The key FOUNDATIONS rules relevant here are: no floating facts, no pure cosmetics, no specialness inflation, no globalization by accident, no consequence evasion, no silent retcons, preserve mystery deliberately, no spectator castes by accident, and no single-trace truths. Rule 3 remains judgment-only; the others have validator or skill enforcement surfaces.

### **2.2 Story bundles**

A story bundle is a per-world derived layer under `worlds/<slug>/stories/<story-slug>/`. It carries localized causal-engine state bound to a premise, cast, and tone contract. Story-bundle truth can be branch-scoped, counterfactual, provisional, or local to a narrative run; it is distinct from world canon.

The story authority stack is strict:

1. **World canon** is world-level truth and can only be mutated through the lawful promotion path.  
2. **Story state** is branch-local narrative state inside the story bundle.  
3. **Rendered prose** is only a rendering of story state; it does not create state by itself.

This is a crucial design constraint: any proposed feature must be a state-bearing structure only if it affects validation, replay, branching, authoring, or promotion. Otherwise it belongs in prose, page plans, or author guidance.

### **2.3 Existing story entities**

The current story-bundle record inventory is already broad. Core page-cycle records include:

| Class | Meaning |
| ----- | ----- |
| `STENT` | Story-local entity or mirror of a world character. |
| `STSTAT` | Life, agency, and location status for an entity. |
| `STINT` | Character intention. |
| `SF` | Branch-local fact: what is true in the branch. |
| `BEL` | Belief, knowledge, suspicion, lie, report, witness memory, misconception. |
| `SE` | Event: the causal tick that produced a page. |
| `OBL` | Obligation. |
| `CNSQ` | Consequence. |
| `THR` | Thread: active narrative tension across pages. |
| `SREL` | Relationship along a closed axis taxonomy. |
| `STLOC` | Story-local location. |
| `STOBJ` | Story-local object. |
| `DA` | Story-local diegetic artifact. |
| `BR` | Branch. |
| `PG` | Page / fork-state snapshot. |
| `CHC` | Emitted choice. |
| `SLT` | Commitment block / storylet. |

Auxiliary records include `SLB` storylet batch manifests, `SAU` health audits, `SP` story-promotion records, and `RSP` remediation-storylet proposal cards.

`SF` and `BEL` are deliberately separated. `SF` records branch truth; `BEL` records epistemic state, claims, lies, witness memories, rumors, misremembering, and interpretation. This separation is one of Worldloom’s strongest existing narrative features because it supports secrets, deception, contested public claims, and knowledge asymmetry without turning every assertion into truth.

### **2.4 Pages, events, and branching**

`PG` records are full branch snapshots. They include the parent page, branch path, input choice or write-in, resolved event, state hashes, active record sets, entity status projections, visible affordances, unresolved mystery claims, continuation status, emitted choices, and validation traces.

`SE` records are the causal tick. They store the selected commitment block, alias bindings, outcome route, resolution feedback, world-logic rationale, state delta, and promotion claims.

Branching is snapshot-based. To advance from any committed page, the turn-cycle loads that page’s snapshot, optionally forks a branch, resolves the selected choice or write-in, selects or JIT-creates a commitment block, applies one append-only state delta, materializes the next page snapshot, emits choices, validates gates, and submits one patch envelope. Sibling-branch state is not read for state assembly.

### **2.5 Commitment blocks / storylets**

`SLT` commitment blocks are reusable causal moves, not dramatic acts, arcs, mini-stories, or plot rails. A good block says: when these conditions hold, this kind of action can happen, these beats dramatize it, and these state effects follow. The schema explicitly rejects `arc_contract`, `dramatic_unit`, `execution_envelope`, nested effect models, stop policies, and similar plot-rail structures.

`SLT` records include:

* scope and branch visibility,  
* closed `move_family`,  
* hard/soft predicate-DSL preconditions,  
* 1–5 prose-facing beats,  
* effects,  
* exit options,  
* saliency,  
* mystery policy,  
* provenance.

The predicate DSL already supports many useful state checks: active facts, beliefs, entity status, relationship axes, obligations, consequences, threads, intentions, object/artifact access, visible affordances, record age, and boolean combinators.

The commitment-block authoring skill diagnoses coverage gaps across recovery, belief repair, movement/evasion, bond/status shifts, consequence resolution, decision/terminal setup, fallback continuation, investigation, disclosure, opposition/refusal, and negotiation/resource exchange.

### **2.6 Choices, consequences, and player agency**

Choices are not cosmetic. A selected choice or accepted write-in must produce a grounded consequence unless it was explicitly marked rhetorical. Turn-cycle validation includes action-source legality, motivation grounding, causal dependency threat scanning, choice-set noncollapse, and choice-consequence integrity.

The `STORY_KERNEL.md` contract includes a **Player Agency Contract** with agency surface, write-in envelope, and viewpoint limits. Bootstrap requires this, and turn-cycle uses it to route write-ins.

### **2.7 Belief, visibility, witness propagation, and artifacts**

The current system has strong epistemic machinery. `BEL` records have holder, claim, belief mode, truth relation, confidence, visibility, source event, access route, access records, and consequences.

Turn-cycle computes direct and indirect expected witnesses for events involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual. Missing propagation must be covered by `BEL` updates or parseable non-propagation tags.

Story-local diegetic artifacts are also well modeled. A `DA` is warranted when diegetic authorship, recoverable content, belief impact, choice grounding, mystery progression, circulation, truth status, or cross-page reference matters. Claims inside a `DA` do not automatically become `SF` or canon; branch truth still requires `SF`, and world truth still requires promotion.

### **2.8 Promotion and closeout**

The story-to-world path is explicit and conservative. `story-fact-promotion-to-canon` creates a proposal package only; it never mutates world canon. It supports source kinds such as story facts, mystery resolutions, character outcomes, artifact canonization, relationship/institutional outcomes, and other branch claims. It runs scope-inflation checks, mystery firewall checks, and downstream impact analysis.

After `canon-addition` adjudicates, `story-promotion-closeout` records the verdict, links accepted CF/CH/PA outputs, and supersedes story-local records only when their schema-backed fields actually change. It never mutates world canon.

### **2.9 MCP and validators**

Worldloom’s machine-facing layer composes: source files → world index → MCP retrieval → context packets / targeted records → patch plans → validators + patch engine → working tree writes.

The MCP surface includes `get_context_packet`, `get_record`, `get_records`, `list_records`, `get_record_schema`, `describe_envelope_schema`, `validate_patch_plan`, `submit_patch_plan`, `find_impacted_fragments`, `find_sections_touched_by`, `get_canonical_vocabulary`, and `describe_capabilities`. Story-bundle records require `story_slug` because story-local IDs are unique only within a story bundle.

The validator package has schemas for all current story-bundle atomic YAML classes and a substantial inventory of rule-derived and structural validators, including schema compliance, branch isolation, observer firewall, choice-set noncollapse, causal-dependency threat scan, expected-witness coverage, canon-baseline drift, snapshot replay, state snapshot integrity, proposal package shape, and prose receipt compliance.

### **2.10 Current gaps and ambiguities**

The biggest ambiguity is terminology: the prompt says “threats,” but the current schema uses `THR` for **threads**, not explicitly staged threats. `THR` tracks active narrative tension, status, title, summary, urgency, and derivation, but it has no progress value, escalation ladder, deadline, driver, threshold effects, or offscreen advancement model.

The current system also lacks explicit structures for:

* audience-facing dramatic questions and payoff obligations,  
* story-local secrets and clue networks,  
* staged pressure/clocks/fronts,  
* character plans that connect intentions to beliefs, resources, obstacles, and steps,  
* branch convergence requirements.

These gaps are not validation gaps; they are story-power gaps.

---

## **3. Foundations alignment**

The recommendations below align with these FOUNDATIONS principles.

**No Floating Facts.** Every new feature must have domain, scope, prerequisites, limits, and consequences. `STQ`, `STSEC/STCLUE`, `CLK`, `STPLAN`, and `CONV` all propose record links and state transitions that validators can inspect. None should be decorative.

**No Pure Cosmetics.** A story question must affect continuation, payoff, terminal proof, or choice surface. A clue must affect beliefs, secrets, choices, or revelation. A clock must advance consequences. A plan must ground actions. A convergence contract must constrain branch merge. Features that only label theme, tone, motif, or “vibes” fail this rule.

**No Consequence Evasion.** These recommendations all increase consequence pressure. `STQ` makes promises/payoffs auditable. `CLK` makes delayed consequences mature. `STPLAN` makes actions accountable to motivations and beliefs. `STSEC/STCLUE` prevents “sudden revelation from nowhere.”

**No Silent Retcons.** Any feature that turns branch-local state into canon must route through existing promotion. `STQ` answers, `STSEC` revelations, `CLK` outcomes, and `STPLAN` conclusions can all produce `SF.authority: canon_candidate` or `SE.promotion_claims[]`, but none may silently become world truth.

**Preserve Mystery Deliberately.** `STSEC/STCLUE` must be story-local and must not replace world-level Mystery Reserve. If a story secret touches an `M-*` record, the existing mystery firewall remains authoritative. Forbidden mysteries stay forbidden.

**Schema-Minimalism.** Each proposed field must be consumed by validation, replay, predicate eligibility, branching, closeout, or authoring. This is why I reject theme/motif/tone/pacing-curve records: most of their fields would not be load-bearing enough.

**Commitment blocks are causal moves, not plot rails.** This is the main reason not to add arcs, acts, episodes, midpoint reversals, climax schemas, or “three-act structure” records. Those would conflict with the current design’s explicit anti-rail posture.

---

## **4. External research synthesis**

### **Narrative causality and character agency**

Narrative-planning research emphasizes that successful interactive narrative must balance logical plot progression with characters who are perceived as intentional agents. IPOCL-style planning explicitly reasons about goals that explain character actions and about why characters commit to goals.

**Design implication for Worldloom:** `STINT` is useful but too thin. It says what a character wants, but it does not model plan structure, resources, blockers, fallback steps, or how beliefs motivate actions. Worldloom already audits “motivation grounding,” but a first-class `STPLAN` would make that grounding authorable and replayable.

### **Storylets and preconditioned content**

Storylet systems are valuable because they combine reusable content units with trigger/precondition logic. Recent LLM storylet research frames storylets as a way to preserve authorial control while allowing responsive interactive narratives.

**Design implication for Worldloom:** Worldloom’s `SLT` model is already strong. The missing features should not replace storylets. They should create better state for storylets to test: open dramatic questions, discovered clues, clock thresholds, active plans, and convergence readiness.

### **Planning vs. emergence**

Structured pipelines can reduce narrative drift in LLM-generated game content. Recent quest-line generation research argues that LLM RPG generation suffers from coherence, control, and structural consistency problems, and that intermediate structured data improves both global and local consistency.

**Design implication for Worldloom:** The right direction is not more prose guidance. It is small, inspectable, validator-readable story records. Worldloom is already pointed in the right direction; the proposal should add only records that reduce narrative drift.

### **Suspense and knowledge asymmetry**

Suspense depends on uncertainty, anticipation, and information control. Recent computational work on suspenseful story generation treats suspense as hard for LLMs and improves output by using theory-grounded planning.

Narratology also distinguishes events in chronological world order from their presentation order; Russian formalism’s fabula/syuzhet distinction is one classic formulation. Genette’s focalization distinction separates “who sees” from “who speaks,” which matters for audience knowledge versus character knowledge.

**Design implication for Worldloom:** The system already models character belief well, but it does not explicitly model **audience-facing unanswered questions** or **story-local revelation chains**. Suspense requires knowing not just who believes what, but what the narrative has promised the audience, what clues exist, what remains hidden, and what payoff is pending.

### **Mystery, clues, and revelation design**

Mystery design fails when a single necessary clue becomes a chokepoint. The Alexandrian’s “Three Clue Rule” argues that every conclusion the players must reach should have at least three clues, and also recommends making a revelation list so the designer knows which conclusions must be supported.

GUMSHOE’s core design similarly focuses on ensuring investigators obtain core clues needed to move the mystery forward, shifting play from “did we find the clue?” to “what do we make of it?”

**Design implication for Worldloom:** `BEL`, `DA`, and `SF` are necessary but insufficient. The system needs an explicit secret/clue/revelation layer, especially for critical revelations. It should validate clue coverage only when a revelation is marked critical; otherwise it will overconstrain open-ended fiction.

### **Clocks, fronts, and escalating pressure**

Blades in the Dark uses clocks to track ongoing obstacles, impending trouble, danger, racing situations, and faction activity. The clock reflects the fictional situation and can make offscreen world activity dynamic. Dungeon World fronts similarly organize linked dangers, grim portents, impending dooms, and stakes questions.

**Design implication for Worldloom:** `urgency: high` is not enough. Authors need pressure that progresses, escalates, and fires staged consequences. A `CLK` record would let Worldloom model threat escalation without turning `THR` into an overloaded catch-all.

### **Social simulation and agent memory**

The Generative Agents architecture stores agents’ experiences, retrieves relevant memories, reflects on them, and uses those retrieved/reflected memories to plan behavior. The paper argues that observation, planning, and reflection together produce more believable behavior.

**Design implication for Worldloom:** Worldloom already has excellent `BEL` and event provenance. It should not add a massive emotional simulation. A modest `STPLAN` record would capture enough planning structure to improve character agency while remaining deterministic.

### **Authoring tools and branch structure**

Narrative authoring research often treats interactive narrative as graph-structured authoring, with mixed-initiative tools helping authors create and revise narrative graphs under constraints.

**Design implication for Worldloom:** Branches already exist, but convergence is under-modeled. A branch convergence contract would help authors reason about when divergent branches can safely rejoin without sibling-state leakage.

---

## **5. Gap analysis**

### **5.1 Features already well covered**

Worldloom already covers these well:

* **Branch-local truth vs belief.** `SF` and `BEL` are correctly separated.  
* **Choices and consequences.** `CHC`, `SE`, `CNSQ`, and choice-consequence validation are strong.  
* **Storylets.** `SLT` is a robust storylet/commitment-block model.  
* **Branching and replay.** `PG` snapshots, state hashes, branch paths, and replay validators are strong.  
* **World-canon promotion.** `SP` proposal and closeout workflows are disciplined.  
* **Diegetic artifacts.** `DA` records have strong semantics for artifact authorship, circulation, truth relation, and belief impact.  
* **Witness and information firewall.** `BEL` plus expected-witness discipline is a major strength.  
* **Relationships.** `SREL` has a useful closed axis taxonomy.  
* **Status and embodiment.** `STSTAT` handles life, agency, and location.

### **5.2 Partially covered but under-modeled**

These are present, but too thin:

* **Threads/threats.** `THR` tracks active narrative tension, but not staged escalation, clocks, thresholds, offscreen pressure, or deadline firing.  
* **Intentions.** `STINT` tracks goals, but not plans, means, blockers, or contingent steps.  
* **Mysteries and revelations.** World-level Mystery Reserve exists, and `BEL`/`DA`/`SF` can express epistemic state, but there is no story-local clue/revelation architecture.  
* **Promises and payoffs.** `THR`, `CNSQ`, and `OBL` can approximate them, but none directly models “this setup has promised a payoff.”  
* **Branch convergence.** Branch isolation is strong, but convergence readiness and state reconciliation are not first-class.

### **5.3 Apparently missing**

The missing high-value concepts are:

1. Story questions / promises / payoff obligations.  
2. Story-local secrets and clues.  
3. Pressure clocks / staged threats.  
4. Character plans / motive chains.  
5. Branch convergence contracts.

### **5.4 Features that should remain out of scope**

Scenes, episodes, acts, arcs, climax structures, thematic motifs, tone meters, pacing curves, generic emotion state, and discourse/focalization layers should stay out of core story state for now.

Worldloom already has pages, page plans, `SLT.beats`, `STORY_KERNEL` tone/POV, rendered prose receipts, and authoring guidance. More abstract narrative labels would consume tokens and schema complexity without enough deterministic payoff.

### **5.5 Awkward approximations in the current system**

Current authors likely approximate missing features like this:

* A dramatic question becomes a `THR` with a title like “Can X escape?” That loses payoff semantics.  
* A setup/payoff becomes `CNSQ` or `THR`, but the system cannot validate whether the payoff references a setup.  
* A mystery clue becomes a `DA`, `BEL`, or `STOBJ`, but the system cannot validate that it supports a revelation.  
* A staged threat becomes a `THR` with escalating summaries, but no progress thresholds exist.  
* A character plan becomes multiple `STINT` records or prose in `world_logic_rationale`, but the system cannot reason over steps or blockers.  
* Branch convergence is handled manually by author judgment and health audit, but no convergence contract can say what must be true before rejoining.

---

## **6. Recommended new features**

## **Feature 1: `STQ` — Story Question / Promise-Payoff Record**

### **Narrative purpose**

`STQ` tracks the live narrative debts that make a story feel shaped: dramatic questions, promises, setups, payoffs, and intentionally abandoned expectations.

It answers: **What has the story made the reader/player care about, and what would count as satisfying it?**

### **Why existing concepts are insufficient**

`THR` tracks active narrative tension, but it does not encode a question, setup, promised payoff mode, answer, abandonment rationale, or payoff link. `CNSQ` tracks realized or pending effects from prior events, but not audience-facing narrative promises. `OBL` tracks duty. `STINT` tracks goals. `SLT` dramatizes moves. None of them says: “This is a promise the story now owes.”

### **User value**

Authors get a clean way to prevent dropped setups, accidental anticlimax, false endings, unresolved promises, and terminal branches that forget why the reader cared.

This will make Worldloom stories feel less like a sequence of robust events and more like fiction with expectation, escalation, and payoff.

### **Integration model**

`STQ` should link to:

* `SE` that created the question or setup.  
* `PG` where it became active.  
* `THR`, `OBL`, `CNSQ`, or `STINT` that carry the pressure.  
* `BEL`, `SF`, or `DA` if the question is knowledge-based.  
* `STOBJ` or `STLOC` if an object/place is the setup.  
* `CHC` choices that move toward answer/payoff.  
* `SLT` blocks that can resolve or complicate it.  
* `SP` promotion if the answer asserts world canon.  
* Branch terminal proof: high-salience open `STQ` must be resolved, abandoned, inherited, or intentionally left open.

### **Deterministic validation opportunities**

Validators can check:

* referenced `source_event`, `source_page`, and linked records exist;  
* `status: answered | paid_off` requires `answer_event`;  
* `payoff_of` must reference an earlier active `STQ`;  
* a payoff cannot predate its setup in the branch path;  
* `abandoned` requires `abandonment_rationale`;  
* high-salience open `STQ` cannot be ignored at terminal without explicit terminal rationale;  
* `CHC.grounded_in.records[]` may reference `STQ`, but only if `STQ` is active in the page snapshot;  
* a canon-bearing answer must route through `promotion_hold` or `SE.promotion_claims[]`;  
* branch-isolation rules prevent sibling-branch `STQ` leakage;  
* convergence requires compatible open/closed `STQ` state.

### **MCP implications**

Possible operations:

* `append_story_question_record`  
* `supersede_story_question_record`  
* `list_story_questions`  
* `get_story_question_context`  
* `evaluate_story_question_debt`

Predicate additions:

* `story_question_open(STQ-<integer>)`  
* `story_question_status(STQ-<integer>, status)`  
* `any_story_question_open(alias, salience?, kind?)`  
* `promise_due(STQ-<integer>, age_comparator?, pages?)`

### **Schema/data model sketch**

id: STQ-<integer>

story_id: STORY-<integer>

created_at_page: PG-<integer>

supersedes: STQ-<integer> | null

branch_scope:

 visibility: branch_scoped | branch_prefix_scoped | global_from_genesis

 branch_id: BR-<integer> | null

kind: dramatic_question | promise | setup | payoff | moral_question

question_or_promise: string

salience: low | medium | high

audience_visibility: hidden | implied | explicit

character_visibility: none | holder_specific | public

holders: [STENT-<integer> | group:<name> | public]

source_event: SE-<integer>

source_records: [SF-<integer> | BEL-<integer> | DA-<integer> | THR-<integer> | OBL-<integer> | CNSQ-<integer> | STINT-<integer> | SREL-<integer> | STLOC-<integer> | STOBJ-<integer>]

payoff_of: STQ-<integer> | null

expected_payoff_mode: answer | reversal | cost_paid | choice_forced | relationship_shift | revelation | consequence_fires

status: open | complicated | answered | paid_off | abandoned | inherited | superseded

answer_event: SE-<integer> | null

answer_records: [<story-local record id>]

abandonment_rationale: string | null

### **Example**

id: STQ-3

kind: promise

question_or_promise: "The sealed green-wax letter implies someone inside the council betrayed Mira."

salience: high

audience_visibility: explicit

character_visibility: holder_specific

holders: [STENT-1]

source_event: SE-4

source_records: [DA-2, BEL-7, THR-2]

expected_payoff_mode: revelation

status: open

A later page can pay it off by revealing that the green wax was a deliberate misdirection, superseding `BEL-7`, creating a new `STSEC` revelation, and closing or complicating the `STQ`.

### **Risks and anti-patterns**

The danger is turning `STQ` into an outline/arc system. Do not add act position, midpoint, climax, scene sequence, “expected chapter,” or required ending. `STQ` should track narrative debt, not plot shape.

### **Priority**

**Must-have.** This is the cleanest missing story-facing feature. It adds major narrative power with excellent validator potential and little conflict with existing design.

---

## **Feature 2: `STSEC` + `STCLUE` — Story Secrets and Clues**

### **Narrative purpose**

This feature creates a story-local revelation architecture: secrets, clues, clue carriers, discovery state, clue strength, misdirection, and reveal events.

It answers: **What is hidden, what evidence points toward it, who has access, and what revelation is now justified?**

### **Why existing concepts are insufficient**

`BEL` can say someone suspects or knows something. `SF` can say something is true in the branch. `DA` can preserve a written clue. `STOBJ` can hold an evidence object. But none of these records says:

* this clue supports this secret;  
* this secret is critical;  
* this revelation needs more evidence;  
* this clue is a red herring;  
* this audience-visible clue has not yet reached the character;  
* this branch has collapsed a mystery too early.

World-level `M-*` Mystery Reserve is not enough because many story secrets are local: who betrayed whom, where the ledger is hidden, why a character lied, what an artifact actually says.

### **User value**

Authors get better mysteries, cleaner foreshadowing, less accidental revelation, and stronger suspense. Players/readers get fairer payoffs because revelations can be traced to evidence.

### **Integration model**

`STSEC` links to:

* `SF` for branch-local truth, when the secret is true;  
* `BEL` when the secret is only believed, suspected, denied, or lied about;  
* `M-*` when the secret touches world Mystery Reserve;  
* `STQ` when the secret is also a dramatic question;  
* `DA`, `STOBJ`, `STLOC`, `SE`, or `BEL` as clue carriers;  
* `CHC` choices that investigate, disclose, hide, destroy, or misinterpret clues;  
* `SLT` blocks for investigation, disclosure, deception, protection, negotiation, or conflict;  
* `SP` if revealing the secret proposes world canon.

### **Deterministic validation opportunities**

Validators can check:

* every `STCLUE.secret_id` references an existing `STSEC`;  
* every clue carrier exists and is active when discovered;  
* `discovered_by` holders must have a valid access route;  
* a revelation event must disclose an existing secret;  
* a critical secret cannot be marked `revealed` without minimum clue coverage or explicit override;  
* clue evidence records must exist in the branch path;  
* a red herring must be represented as `BEL.truth_relation: false | partly_true | contested` or `DA.truth_relation: false | contested | partly_true`;  
* `STSEC.protected_mystery_refs[]` cannot resolve forbidden `M-*` entries;  
* a canon-level revelation must use `promotion_hold`;  
* public/factional clue artifacts trigger existing expected-witness propagation.

### **MCP implications**

Possible operations:

* `append_story_secret_record`  
* `append_story_clue_record`  
* `supersede_story_secret_record`  
* `mark_clue_discovered`  
* `reveal_story_secret`  
* `list_unresolved_story_secrets`  
* `get_revelation_readiness`

Predicate additions:

* `secret_unrevealed(STSEC-<integer>)`  
* `secret_revealed(STSEC-<integer>)`  
* `clue_discovered(STCLUE-<integer>, holder?)`  
* `any_clue_for_secret(alias, secret, discovered_by?)`  
* `revelation_ready(STSEC-<integer>)`

### **Schema/data model sketch**

# STSEC

id: STSEC-<integer>

story_id: STORY-<integer>

created_at_page: PG-<integer>

supersedes: STSEC-<integer> | null

branch_scope:

 branch_id: BR-<integer>

secret_kind: identity | motive | location | event_cause | artifact_truth | relationship | institutional | other

secret_claim: string

truth_anchor: SF-<integer> | BEL-<integer> | DA-<integer> | null

holders: [STENT-<integer> | group:<name> | narrator]

audience_state: unknown | suspected | partially_known | known | misled

criticality: optional | important | critical

protected_mystery_refs: [M-<integer>]

status: hidden | partially_revealed | revealed | disproven | abandoned

source_records: [<record id>]

reveal_event: SE-<integer> | null

reveal_records: [BEL-<integer> | SF-<integer> | DA-<integer> | STQ-<integer>]

# STCLUE

id: STCLUE-<integer>

story_id: STORY-<integer>

created_at_page: PG-<integer>

supersedes: STCLUE-<integer> | null

secret_id: STSEC-<integer>

carrier:

 kind: DA | STOBJ | STLOC | BEL | SF | SE

 record: <record id>

clue_text: string

clue_strength: weak | suggestive | confirming | decisive | misleading

access_conditions:

 records: [<record id>]

 action_families: [investigate | perceive | communicate | use | persuade | ritual_protocol]

discovered_by: [STENT-<integer> | group:<name> | public]

audience_visible: hidden | visible | ambiguous

misdirection_policy: none | red_herring | partial_truth | false_inference

status: available | discovered | destroyed | suppressed | superseded

### **Example**

secret:

 id: STSEC-2

 secret_kind: motive

 secret_claim: "Captain Sera hid the ferry manifests to protect her brother, not to help the plague-runners."

 truth_anchor: SF-12

 holders: [STENT-4]

 audience_state: suspected

 criticality: critical

 status: hidden

clue:

 id: STCLUE-5

 secret_id: STSEC-2

 carrier:

   kind: DA

   record: DA-7

 clue_text: "The manifest margin repeats the brother's childhood nickname, not Sera's official seal."

 clue_strength: suggestive

 discovered_by: [STENT-1]

 audience_visible: visible

### **Risks and anti-patterns**

Do not force every mystery to have three clues. Validate clue coverage only for `criticality: critical`. Optional secrets should remain loose. Also avoid making `STSEC` a second world Mystery Reserve; story secrets are branch-local unless explicitly promoted.

### **Priority**

**Must-have.** This is the missing structure for mysteries, secrets, revelations, clue fairness, and knowledge asymmetry.

---

## **Feature 3: `CLK` — Pressure Clock / Escalation Ladder**

### **Narrative purpose**

`CLK` tracks pressure that advances over time or through events: danger clocks, faction activity, countdowns, pursuit, exposure, deadlines, worsening conditions, and staged threats.

It answers: **What pressure is advancing, what moves it, what happens at thresholds, and who can see or affect it?**

### **Why existing concepts are insufficient**

`THR` is a narrative thread, but it has no progress, thresholds, deadline, driver, or staged effects. `OBL` has urgency and trigger-to-close, but no timer. `CNSQ` has pending/resolved/escalated, but no stepwise escalation. `STINT` has urgency, but no clock.

Authors can fake clocks by repeatedly superseding `THR` or `CNSQ`, but validators cannot tell whether escalation is coherent.

### **User value**

Authors get concrete pressure without railroading. The system can surface looming consequences, offscreen antagonists, faction moves, time-sensitive choices, and escalating costs. This is the feature most likely to make stories feel alive between pages.

### **Integration model**

`CLK` links to:

* `THR` as the narrative pressure it stages;  
* `OBL` for deadlines;  
* `CNSQ` for threshold effects;  
* `STINT` and `STPLAN` for actor/faction goals;  
* `SREL` for social pressure;  
* `STLOC` and `STOBJ` for physical constraints;  
* `BEL` for public/private awareness of the clock;  
* `CHC` choices that tick, pause, race, conceal, or resolve the clock;  
* `SLT` preconditions for “clock at least N” or “clock full”;  
* `SE` events that advance or resolve the clock.

### **Deterministic validation opportunities**

Validators can check:

* `value` is between `0` and `max`;  
* thresholds are ordered and within range;  
* every threshold effect references valid record IDs or valid effect templates;  
* every tick has a source event and cause;  
* active clocks must link to at least one active pressure-bearing record;  
* `status: fired` requires a firing event and threshold effects;  
* terminal branches must resolve, fire, inherit, or explicitly abandon high-salience clocks;  
* deadline anchors reference valid pages, events, or story time labels;  
* `clock_at_least` predicates cannot reference inactive or sibling-branch clocks;  
* if a clock creates public/factional consequences, expected-witness propagation applies.

### **MCP implications**

Possible operations:

* `append_pressure_clock_record`  
* `tick_pressure_clock`  
* `supersede_pressure_clock_record`  
* `resolve_pressure_clock`  
* `list_active_pressure_clocks`  
* `evaluate_clock_thresholds`

Predicate additions:

* `clock_at_least(CLK-<integer>, value)`  
* `clock_below(CLK-<integer>, value)`  
* `clock_full(CLK-<integer>)`  
* `any_clock_active(alias, kind?, salience?)`  
* `clock_deadline_due(CLK-<integer>)`

### **Schema/data model sketch**

id: CLK-<integer>

story_id: STORY-<integer>

created_at_page: PG-<integer>

supersedes: CLK-<integer> | null

branch_scope:

 branch_id: BR-<integer>

title: string

clock_kind: danger | racing | mission | faction | exposure | pursuit | deadline | front

driver: STENT-<integer> | group:<name> | system | unknown

linked_records: [THR-<integer> | OBL-<integer> | CNSQ-<integer> | STINT-<integer> | STPLAN-<integer> | SREL-<integer> | STLOC-<integer> | STOBJ-<integer> | STQ-<integer>]

value: integer

max: integer

salience: low | medium | high

visibility: hidden | holder_specific | public | factional | audience_only

deadline:

 anchor_page: PG-<integer> | null

 anchor_event: SE-<integer> | null

 natural_language: string | null

thresholds:

 - at: integer

   label: string

   effects:

     create: [<record id or effect template>]

     supersede: [<record id or effect template>]

     close: [<record id>]

tick_history:

 - event: SE-<integer>

   delta: integer

   cause: string

status: active | paused | resolved | fired | abandoned | superseded

resolution_event: SE-<integer> | null

### **Example**

id: CLK-1

title: "The River Guard identifies the ledger thief"

clock_kind: exposure

driver: group:river_guard

linked_records: [THR-2, STQ-3, DA-4]

value: 2

max: 6

salience: high

visibility: audience_only

thresholds:

 - at: 4

   label: "Rumors reach the dockworkers"

   effects:

     create: [BEL-18]

 - at: 6

   label: "Arrest warrant issued"

   effects:

     create: [CNSQ-9, OBL-6]

status: active

### **Risks and anti-patterns**

Too many clocks will make fiction feel like board-game state. Clocks should be reserved for pressure that can actually change choices or consequences. Do not use clocks as generic pacing meters.

### **Priority**

**Must-have.** This is the cleanest upgrade for dramatic escalation and consequence.

---

## **Feature 4: `STPLAN` — Character Plan / Motive Chain**

### **Narrative purpose**

`STPLAN` models how a character or faction intends to pursue a goal, based on beliefs, motives, resources, constraints, and fallback steps.

It answers: **Given what this actor knows and wants, what are they trying to do next, and why?**

### **Why existing concepts are insufficient**

`STINT` is a one-line active goal. `BEL` records epistemic state. `SREL` records relationship pressure. `OBL`, `CNSQ`, and `THR` record external pressures. But no current record ties these into a plan.

The health audit can flag `motivation_ungrounded`, but it mostly checks whether a rationale cites some motive source. It cannot reason over planned steps or blocked plans because no plan object exists.

### **User value**

Characters become more agentic. Antagonists can act offscreen for reasons. Allies can pursue goals that collide with the player. Betrayals become legible. Social simulation becomes richer without adding an emotional-stat spreadsheet.

### **Integration model**

`STPLAN` links to:

* `STENT` or group driver;  
* `STINT` goal;  
* `BEL` motive basis;  
* `SREL` emotional/social motive;  
* `OBL`, `CNSQ`, `THR`, `CLK`, and `STQ` pressures;  
* `STOBJ`, `STLOC`, and `DA` resources/evidence;  
* `SLT` blocks that can advance steps;  
* `SE` events that advance, block, revise, complete, or abandon the plan;  
* `STSTAT` because death, captivity, incapacity, and location changes can invalidate plans.

### **Deterministic validation opportunities**

Validators can check:

* plan holder exists and is active;  
* holder status permits planning unless plan is passive/factional;  
* `goal_ref` points to active `STINT` or a valid text goal;  
* motive-basis records exist;  
* actor-held `BEL` basis is actually held by the actor or available through a valid route;  
* current step is one of the declared steps;  
* step preconditions use the closed predicate DSL;  
* resources and blockers reference active records;  
* closed/superseded `STINT` requires dependent `STPLAN` closure, supersession, or transfer;  
* death/incapacity of holder requires plan reconciliation;  
* plan cannot use secrets unavailable to the holder.

### **MCP implications**

Possible operations:

* `append_character_plan_record`  
* `advance_character_plan`  
* `block_character_plan`  
* `abandon_character_plan`  
* `supersede_character_plan_record`  
* `list_active_character_plans`

Predicate additions:

* `plan_active(STPLAN-<integer>)`  
* `plan_step_ready(STPLAN-<integer>, step_id)`  
* `plan_blocked(STPLAN-<integer>)`  
* `any_plan_active(alias, holder_role?, salience?)`

### **Schema/data model sketch**

id: STPLAN-<integer>

story_id: STORY-<integer>

created_at_page: PG-<integer>

supersedes: STPLAN-<integer> | null

holder: STENT-<integer> | group:<name>

goal_ref: STINT-<integer> | null

goal_statement: string

salience: low | medium | high

visibility: private | shared | factional | public | narrator_only

motive_basis: [BEL-<integer> | SREL-<integer> | OBL-<integer> | CNSQ-<integer> | THR-<integer> | CLK-<integer> | STQ-<integer>]

resources: [STOBJ-<integer> | STLOC-<integer> | DA-<integer> | SREL-<integer> | BEL-<integer>]

constraints: [<record id>]

steps:

 - step_id: P1

   action_family: investigate | persuade | oppose | protect | transfer | move | communicate | use | decide

   objective: string

   preconditions: [<predicate object>]

   expected_effects:

     create: [<record id or template>]

     supersede: [<record id or template>]

     close: [<record id>]

   fallback_step: P2 | null

current_step: P1

blockers: [<record id>]

status: active | blocked | completed | abandoned | transferred | superseded

last_advanced_event: SE-<integer> | null

### **Example**

id: STPLAN-4

holder: STENT-6

goal_ref: STINT-9

goal_statement: "Recover the ledger before Mara gives it to the dockworkers."

motive_basis: [BEL-14, SREL-8, CLK-1]

resources: [SREL-3, STLOC-2]

steps:

 - step_id: P1

   action_family: persuade

   objective: "Convince the harbor clerk to reveal who crossed after moonrise."

   preconditions:

     - pred: relationship_axis

       relationship: SREL-3

       axis: trust

       comparator: ">="

       value: medium

current_step: P1

status: active

### **Risks and anti-patterns**

This can become an overgrown AI-agent planner. Keep it modest. Do not model every passing impulse. Use `STPLAN` only for actors whose agency affects branch state, clocks, revelations, or major choices.

### **Priority**

**Strongly recommended.** It will materially improve character agency, but the first implementation wave should prioritize `STQ`, `STSEC/STCLUE`, and `CLK`.

---

## **Feature 5: `CONV` — Branch Convergence Contract**

### **Narrative purpose**

`CONV` defines when divergent branches are allowed to rejoin or share downstream content without violating state, knowledge, commitments, or canon authority.

It answers: **What must be true before these branches can converge, and what state is carried forward or intentionally discarded?**

### **Why existing concepts are insufficient**

Worldloom has strong branch isolation and replay, but convergence is not currently a first-class authoring structure. Health audit can detect problems after the fact; it cannot express a planned convergence contract before reuse.

### **User value**

Authors can reduce combinatorial branch explosion while preserving consequence. Convergence becomes explicit, inspectable, and fair rather than a hidden authorial handwave.

### **Integration model**

`CONV` links to:

* source branches and target branch/page;  
* required open/closed states of `STQ`, `CLK`, `STSEC`, `OBL`, `CNSQ`, `THR`, `STPLAN`, and `BEL`;  
* carry-forward records;  
* records intentionally discarded with rationale;  
* `SLT` or `CHC` that performs the convergence;  
* terminal/closeout logic for source branches;  
* promotion conflicts, if branches disagree on canon candidates.

### **Deterministic validation opportunities**

Validators can check:

* source branches and target branch/page exist;  
* readiness predicates parse;  
* required records are active/resolved in each source branch;  
* high-salience `STQ`, `CLK`, `OBL`, `CNSQ`, and `THR` are resolved, inherited, or explicitly abandoned;  
* carried records are compatible across branches;  
* contradictory `SF` records cannot both be promoted;  
* `BEL` and secret visibility are reconciled;  
* no sibling-branch records enter target snapshot unless listed in `carry_forward_records`;  
* convergence cannot bypass promotion holds.

### **MCP implications**

Possible operations:

* `append_branch_convergence_contract`  
* `evaluate_branch_convergence`  
* `apply_branch_convergence_contract`  
* `list_pending_convergence_contracts`

Predicate addition:

* `convergence_ready(CONV-<integer>)`

### **Schema/data model sketch**

id: CONV-<integer>

story_id: STORY-<integer>

created_at_page: PG-<integer>

source_branch_ids: [BR-<integer>]

target_branch_id: BR-<integer> | null

target_page_id: PG-<integer> | null

target_slt_id: SLT-<integer> | null

readiness_predicates: [<predicate object>]

required_resolutions:

 story_questions: [STQ-<integer>]

 clocks: [CLK-<integer>]

 secrets: [STSEC-<integer>]

 debts: [OBL-<integer> | CNSQ-<integer> | THR-<integer>]

carry_forward_records: [<record id>]

discarded_records:

 - record: <record id>

   rationale: string

canon_conflict_policy: block | promotion_hold | leave_counterfactual | require_closeout

status: proposed | ready | applied | blocked | abandoned

applied_event: SE-<integer> | null

### **Example**

Two branches can rejoin only if:

* the ledger has either been destroyed or handed to the dockworkers;  
* the River Guard exposure clock is below 6 or has fired and been handled;  
* the betrayal question is answered or explicitly inherited;  
* Mara’s secret is either unrevealed in both branches or revealed in both.

### **Risks and anti-patterns**

Convergence can become a tool for erasing consequence. The contract must require explicit carry-forward and discard rationales. It should not allow “branches rejoin because the author wants them to.”

### **Priority**

**Experimental / strongly recommended for branch-heavy stories.** Build after the first three features prove useful.

---

## **7. Rejected or deferred features**

### **Scenes**

**Reject for now.** Pages already serve as causal ticks, and page plans already organize prose. A scene entity would mostly duplicate `PG` plus rendered prose. Add only if later there is a clear validator need around multi-page scene continuity.

### **Beats**

**Already covered.** `SLT.beats` already provides setup/action/pressure/turn/consequence/exit instructions. Adding a separate beat class would duplicate current commitment-block structure.

### **Episodes, acts, arcs, midpoint, crisis, climax, resolution structures**

**Reject.** These are tempting but misaligned. Worldloom’s bootstrap explicitly says not to author dramatic acts, plot milestones, midpoint reversals, climax structures, or fixed ending paths.

### **Theme and motif records**

**Defer / author guidance only.** They are important to fiction but too abstract for deterministic validation unless tied to a concrete `STQ`, `DA`, `STOBJ`, or repeated choice pattern. Do not add first-class schema.

### **Tone**

**Already covered.** `STORY_KERNEL.md` and page-plan style/register notes already carry tone. A tone state machine would be overkill.

### **Pacing and tension curves**

**Reject as direct schema.** Build `STQ` and `CLK` instead. Tension emerges from unresolved questions, secrets, pressure, and consequences; a “curve” record would invite superficial graph-chasing.

### **Full emotional state**

**Reject for now.** Relationship axes, beliefs, intentions, obligations, plans, and status already cover the story-relevant part. Emotional meters would be noisy and hard to validate.

### **Reputation/faction systems**

**Defer.** `BEL`, `SREL`, `OBL`, `STENT` groups, and world institutions can cover most of this. If faction play becomes central, it may deserve a later `STFACTION_STATE`, but it is not first-wave.

### **Location topology / access / ownership**

**Defer.** `STLOC`, `STSTAT.location`, visible affordances, and `object_accessible` already cover core movement/access. Add topology only if pathfinding-like constraints become story-critical.

### **Object symbolic role fields**

**Reject as separate feature.** Objects as evidence, keys, leverage, symbols, or MacGuffins are better represented through `STOBJ`, `DA`, `STCLUE`, `STQ`, and `CHC.grounded_in`.

### **POV / discourse / presentation-order layer**

**Defer.** Focalization and syuzhet matter, but Worldloom’s state model correctly treats prose as rendering, not state. POV limits already live in the Player Agency Contract. Add discourse tooling only after story-state gaps are addressed.

### **Continuity repair**

**Already covered.** Health audit, remediation cards, repair turns, prose receipts, and validators already serve this area.

---

## **8. Proposed implementation sequence**

### **Phase 1: Minimal high-value schema additions**

Add three new record classes first:

1. `STQ` — story question / promise-payoff.  
2. `STSEC` and `STCLUE` — secrets and clues.  
3. `CLK` — pressure clock.

Add them to:

* story-state contract inventory,  
* story-record schema template,  
* world-index story-bundle parser,  
* MCP `record_type` vocabulary,  
* `PG.state_snapshot.active_records`,  
* story-context packet retrieval,  
* patch op schemas.

Do **not** add `STPLAN` or `CONV` until the first three stabilize.

### **Phase 2: Validator/MCP integration**

Add validators:

* `story_question_payoff_integrity`  
* `critical_secret_clue_coverage`  
* `clue_access_route_integrity`  
* `pressure_clock_threshold_integrity`  
* `clock_terminal_debt_integrity`

Add predicate DSL entries:

* `story_question_open`  
* `any_story_question_open`  
* `secret_unrevealed`  
* `clue_discovered`  
* `revelation_ready`  
* `clock_at_least`  
* `clock_full`  
* `any_clock_active`

Add MCP operations through the patch-plan envelope and retrieval schema discovery.

### **Phase 3: Authoring workflows**

Update:

* `branching-story-bootstrap` to seed initial `STQ`, optional `STSEC/STCLUE`, and optional `CLK` when the opening premise requires them.  
* `branching-story-turn-cycle` to advance/resolve `STQ`, reveal clues/secrets, tick clocks, and include them in page plans.  
* `commitment-block-authoring` to include coverage targets for story questions, revelations, and clocks.  
* `branching-story-health-audit` to detect dropped promises, under-supported revelations, and stalled clocks.  
* `branching-story-prose-attach` to check rendered prose against promised questions, clue disclosure, and clock effects.

### **Phase 4: Migration/backfill**

No forced migration. Existing bundles remain valid.

Provide optional audit/backfill:

* detect `THR` records that look like dramatic questions and propose `STQ`;  
* detect `DA`/`BEL`/`SF` clusters that look like clues and propose `STSEC/STCLUE`;  
* detect high-urgency `THR`/`CNSQ`/`OBL` patterns that look like clocks and propose `CLK`.

### **Phase 5: Optional advanced features**

After production use:

1. Add `STPLAN` for high-agency characters/factions.  
2. Add `CONV` for branch-heavy stories.  
3. Consider a very small `STLOC.access` extension only if clock/plan/clue access repeatedly requires it.  
4. Do not add arcs/scenes unless a concrete validator-backed need appears.

---

## **9. Validator-first design matrix**

| Feature | New entity or extension? | Existing entities touched | Deterministic constraints | MCP operations | Canon-promotion implications | Branching implications | Closeout implications | Risk level |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `STQ` Story Question / Promise-Payoff | New entity | `PG`, `SE`, `THR`, `CNSQ`, `OBL`, `BEL`, `SF`, `DA`, `CHC`, `SLT`, `SP` | source refs exist; payoff references earlier setup; answered requires answer event; high-salience open questions must be terminal-resolved/inherited/abandoned; canon answers require promotion | append/supersede/list/evaluate story questions; predicates `story_question_open`, `promise_due` | Answer may create `SF.authority: canon_candidate` or `SE.promotion_claims[]` | Branch-scoped; payoff cannot reference sibling setup; convergence must reconcile | Accepted canon can supersede `STQ` answer state; rejected promotion may leave question branch-local | Low-medium |
| `STSEC` + `STCLUE` Secrets/Clues | New entities | `BEL`, `SF`, `DA`, `STOBJ`, `STLOC`, `SE`, `CHC`, `SLT`, `M`, `STQ` | clue points to valid secret; carrier exists; discovered_by has access; revelation discloses defined secret; critical secrets need clue coverage or override; no forbidden `M` resolution | append secret/clue; reveal secret; list unresolved; predicates `secret_unrevealed`, `clue_discovered`, `revelation_ready` | Revealing world-level truth requires promotion hold; forbidden mysteries blocked | Clues/secrets branch-scoped; audience/character state may diverge by branch | Accepted canon can mark secret canon-linked; rejection preserves branch-local belief/rumor | Medium |
| `CLK` Pressure Clock | New entity | `THR`, `OBL`, `CNSQ`, `STINT`, `SREL`, `BEL`, `CHC`, `SLT`, `STQ`, `STPLAN` later | value/max valid; thresholds ordered; tick history cites events; threshold effects valid; high-salience active clocks handled at terminal; deadline anchors valid | append/tick/resolve/list clocks; predicates `clock_at_least`, `clock_full` | Clock firing may assert canon candidate only via promotion | Clock values branch-local; forks inherit current clock state; sibling clock ticks isolated | Closeout may convert branch-local outcome into canon-linked fact | Medium |
| `STPLAN` Character Plan | New entity | `STENT`, `STSTAT`, `STINT`, `BEL`, `SREL`, `OBL`, `CNSQ`, `THR`, `CLK`, `STOBJ`, `DA`, `SLT`, `SE` | holder exists; holder has agency; goal ref valid; motive basis visible to holder; current step valid; predicates parse; death/incapacity reconciles plan; unavailable secrets cannot ground plan | append/advance/block/abandon/list plans; predicates `plan_active`, `plan_step_ready` | Plan outcome can become character_outcome promotion source | Plans branch-scoped; forks inherit or supersede; hidden plans can diverge | Accepted character/faction outcomes may supersede plans or mark them fulfilled | Medium-high |
| `CONV` Branch Convergence Contract | New auxiliary entity | `BR`, `PG`, `SF`, `BEL`, `STQ`, `CLK`, `STSEC`, `OBL`, `CNSQ`, `THR`, `STPLAN`, `SLT` | branches exist; predicates parse; required resolutions satisfied; carried records active; contradictory facts blocked; no sibling leakage outside carry list | append/evaluate/apply convergence; predicate `convergence_ready` | Conflicting canon candidates block or require promotion/closeout | Core feature; defines safe branch merge | Closeout may alter convergence readiness if canon adjudication changes story-local state | High |

---

## **10. Final recommendation**

Build **`STQ` first**. It is the cleanest, most useful missing feature. It will immediately improve payoff, closure, dramatic questions, author control, terminal proof, and branch convergence.

Build **`STSEC/STCLUE` second**. Worldloom already has strong belief and artifact machinery, but it needs explicit revelation design. This is the feature that will most improve mystery, suspense, secrets, foreshadowing, and fair payoff.

Build **`CLK` third**. The current `THR` record is too weak to model staged threats. Pressure clocks will make consequences feel alive without forcing plot rails.

Then build **`STPLAN`** if the authoring experience shows characters still feel reactive rather than agentic. It is valuable, but it should not precede the debt/revelation/pressure layer.

Add **`CONV`** only once branch-heavy stories start hurting from combinatorial growth. It is important, but it depends on the other structures: convergence is only meaningful once the system knows which questions, clocks, secrets, debts, and plans must be reconciled.

Avoid acts, arcs, scenes, episodes, motif systems, theme records, tone meters, pacing curves, and generic emotional-state systems. They sound literary, but they are mostly non-deterministic, token-expensive, and misaligned with Worldloom’s causal-state philosophy.

The single most important improvement to Worldloom’s story power would be this trio:

STQ   = what the story owes

STSEC/STCLUE = what the story hides and how it can be fairly revealed

CLK   = what pressure advances if no one stops it

Open questions before implementation:

1. Should `STQ`, `STSEC`, and `CLK` be active-record classes inside every `PG.state_snapshot`, or should some be query-derived from branch history?  
2. Should clue coverage validation require a fixed minimum only for `critical` secrets, or should authors choose a `coverage_policy` per secret?  
3. Should `CLK.thresholds.effects` be concrete IDs only, or allow effect templates that are materialized by turn-cycle?  
4. Should `STQ` allow `audience_only` questions that no character currently holds, or should every question be grounded in at least one record visible to someone?  
5. Should `CONV` be a first-class record or an audit/planning artifact until convergence is actually applied?

My blunt implementation call: **add `STQ`, `STSEC/STCLUE`, and `CLK`; do not add arcs/scenes/theme/pacing systems; defer `STPLAN` and `CONV` until the first three prove their value in real story bundles.**

