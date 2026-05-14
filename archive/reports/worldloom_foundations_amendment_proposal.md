# Proposal: Amendments to `FOUNDATIONS.md` for Canon Propagation and Branching Interactive Story Robustness

**Status**: COMPLETED
**Prepared for:** Worldloom / Claude Code skill architecture  
**Target file:** `docs/FOUNDATIONS.md`  
**Date:** 2026-05-14  
**Scope:** Audit of `FOUNDATIONS.md` in light of recent story-pipeline additions, uploaded implementation docs, interactive narrative research, storylet systems, LLM narrative consistency research, narrative theory, and comparable narrative-authoring tools.

---

## Executive judgment

`FOUNDATIONS.md` is already unusually strong. Its core idea—canon as a constrained model rather than a bag of facts—is the correct north star. The story-pipeline additions are also pointed in the right direction: storylets as causal moves, plan-first state authority, belief/fact separation, branch-local fact authority, no global drama manager, no act-structure steering, and no rendered-prose word quotas are all defensible choices.

However, the file has grown organically enough that it now needs targeted amendments. I recommend **amending it**, not rewriting it. The necessary fixes fall into three categories:

1. **Schema correctness and internal consistency.** The Canon Fact schema currently omits `derived_canon` as a status even though Derived Canon is a named canon layer, and it still shows retired markdown filenames in `required_world_updates` despite the atomic-source storage model.
2. **Canon propagation discipline.** The file says facts must not stand alone, but it does not yet require a compact machine-readable integration chain showing upstream support, downstream pressure, contrary pressure, traces, and story impact.
3. **Interactive story integrity.** The story engine correctly rejects global drama management, but it needs explicit safeguards for meaningful choice consequences, story/canon baseline drift, external prose authority, player write-in authority, and information/observer constraints.

The proposed additions below are intentionally conservative. They do not change the architectural philosophy; they make it harder for future specs and skills to misread that philosophy.

---

## Research basis, summarized

The current `FOUNDATIONS.md` aligns with storylet research: storylet systems assemble interactive narrative from discrete reorderable units rather than from a single fixed branch tree, and both the player and system can influence the emerging story. Drama Llama extends that idea to LLM-assisted storylets while explicitly emphasizing authorial control, which supports Worldloom’s choice to combine LLM generation with hard gates, state records, and validator-backed structures.

Interactive narrative research repeatedly emphasizes meaningful consequence: users should feel their actions can significantly alter direction, outcome, or local state. This directly supports a new story-scope rule against cosmetic choices.

Narrative planning and Mimesis-style mediation research highlight causal links and exception handling. Worldloom should not import a global drama manager, but it should explicitly classify how accepted player write-ins and prose deviations become state changes, repairs, refusals, or canon-promotion candidates.

LLM long-story consistency research has become very direct: recent benchmarks show LLMs contradict established facts, character traits, timelines, and world rules during long-form generation. This supports making evidence, dependency, and exact-record grounding more explicit in `FOUNDATIONS.md`.

Knowledge-graph-assisted storytelling and truth-maintenance research both support Worldloom’s machine-facing direction: structured dependencies, reasons, and graph-like support are not decoration; they are how the system can detect contradiction, explain decisions, and propagate changes.

Narrative theory around transmedia worldbuilding and hyperdiegesis supports the Mystery Reserve and bounded unknowns, but also suggests a risk: if silence is treated too much like absence, the world cannot grow. The proposed “silence semantics” amendment fixes that by distinguishing unmodeled, default-baseline, implied, forbidden, hidden, and contested states.

---

## Proposed amendments

### Amendment 1 — Fix Canon Fact status and required update targets

**Priority:** High  
**Type:** Replacement  
**Location:** `## Canon Fact Record Schema`, inside the YAML example.

#### Problem

The document names **Derived Canon** as a canon layer and says it must cite hard canon, but the Canon Fact Record `status` enum does not include `derived_canon`. It currently reads:

```yaml
status: hard_canon | soft_canon | contested_canon | mystery_reserve
```

This is a real internal inconsistency. It encourages implementations either to misclassify derived facts as hard canon or to invent schema values not declared in FOUNDATIONS.

The same YAML example also lists retired root markdown files under `required_world_updates`, such as `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `EVERYDAY_LIFE.md`, and `TIMELINE.md`. But machine-layer-enabled worlds now store those concerns as atomic SEC records under `_source/`, and the retired root markdown files do not exist.

#### Replace

Replace this line:

```yaml
status: hard_canon | soft_canon | contested_canon | mystery_reserve
```

with:

```yaml
status: hard_canon | derived_canon | soft_canon | contested_canon
```

Then replace this block:

```yaml
required_world_updates:
  - INSTITUTIONS.md
  - ECONOMY_AND_RESOURCES.md
  - EVERYDAY_LIFE.md
  - TIMELINE.md
```

with:

```yaml
required_world_updates:
  - target_class: institutions
    target_record_ids: [SEC-INS-3]
    update_required: "Add enforcement, black-market, or institutional response consequences."
  - target_class: economy_and_resources
    target_record_ids: []
    discovery_required: true
    update_required: "Locate or create the relevant SEC-ECR record for trade, scarcity, or supply-chain effects."
  - target_class: everyday_life
    target_record_ids: [SEC-ELF-2]
    update_required: "Reflect visible ordinary-life consequences."
  - target_class: timeline
    target_record_ids: []
    discovery_required: true
    update_required: "Record historical or current emergence if the fact changes temporal interpretation."
```

#### Add immediately after the YAML example

```markdown
**Mystery linkage note.** Mystery Reserve entries are first-class `M-<integer>` records, not Canon Fact status values. A CF may touch, preserve, narrow, or falsely explain a Mystery Reserve entry, but new CFs must not use `status: mystery_reserve`. Use `mystery_links[]` or the relevant change-log / extension mechanism to relate a CF to one or more `M` records.

**Atomic update-target discipline.** In machine-layer-enabled worlds, `required_world_updates[]` names atomic target classes and record ids where known. Retired root markdown filenames such as `INSTITUTIONS.md` or `TIMELINE.md` must not appear as update targets for new CFs. If the exact record is not known at draft time, set `discovery_required: true` and name the target class.
```

#### Implementation notes

This requires a schema/validator adjustment. Existing historical CF records should remain valid under the existing “Genesis-world rule” / append-only history principle. For new CFs, validators should reject `status: mystery_reserve` and accept `status: derived_canon`.

---

### Amendment 2 — Add explicit silence semantics after Default Reality

**Priority:** High  
**Type:** Addition  
**Location:** `## Core Principle`, immediately after the existing **Default Reality** paragraph.

#### Problem

The current Default Reality language is valuable, but if read too rigidly it can overcorrect into a closed-world assumption: anything not modeled becomes treated as absent. That is dangerous for world growth, branching stories, and mystery reserves. The system needs explicit states for silence.

#### Insert

```markdown
**Silence Semantics.** Prior silence is not a single state. When a change touches an area the world has not previously modeled, the skill must classify that silence before canonizing the change:

- `unmodeled`: no prior commitment exists; the change may model it for the first time, but must say so.
- `default_baseline`: the world follows baseline reality unless canon says otherwise.
- `implied`: existing canon already pressures this conclusion, but it was not yet recorded explicitly.
- `forbidden`: existing canon, an invariant, or a Mystery Reserve boundary blocks this conclusion.
- `hidden`: the fact may already be true in-world but is not public, not recorded, or not widely knowable.
- `contested`: the claim exists diegetically without world-level commitment.

First canonization of an unmodeled area must state which of these cases applies. Story-local records may instantiate local, branch-scoped, or provisional details in unmodeled space, but they must not claim that a long-standing world-level truth had always been modeled unless routed through Rule 6.
```

#### Why this matters

This keeps Default Reality from becoming either too permissive or too restrictive. It preserves the “no silent retcon” rule while allowing controlled world growth, local story instantiation, and Mystery Reserve preservation.

---

### Amendment 3 — Add a Canon Integration Chain requirement

**Priority:** High  
**Type:** Addition plus schema extension  
**Location:** After `## Canon Fact Record Schema`, before `## World Queries Every Tool Must Be Able To Answer`.

#### Problem

`FOUNDATIONS.md` repeatedly says canon facts must propagate, but the CF schema does not require a compact record of how a new fact is integrated into the wider model. `source_basis.derived_from[]`, `domains_affected[]`, `visible_consequences[]`, and `required_world_updates[]` are useful, but they do not force the author to answer: what supports this, what does it pressure, what resists it, what traces prove it is integrated, and what story affordances it creates or closes?

#### Insert

```markdown
## Canon Integration Chain

Every new non-genesis Canon Fact must include an integration chain. Direct user approval establishes authority, but it does not by itself establish integration.

The integration chain answers five questions:

1. **Upstream support:** What hard canon, invariant, section record, user-approved premise, or explicit silence-semantics classification supports this fact?
2. **Downstream pressure:** What institutions, practices, resources, routes, laws, rituals, beliefs, hazards, ordinary routines, or story-bundle surfaces are pressured by it?
3. **Resistance / containment:** What prevents this fact from optimizing away the premise, globalizing by accident, becoming mundane, or collapsing existing tensions?
4. **Trace registers:** Where does this fact leave evidence in-world, unless its hiddenness is itself canonized?
5. **Story affordance:** What kinds of choices, conflicts, misunderstandings, obligations, consequences, or mysteries does this fact newly license or close?

Recommended machine-readable shape:

```yaml
integration_chain:
  silence_semantics: unmodeled | default_baseline | implied | forbidden | hidden | contested | n_a
  upstream_support:
    canon_facts: []
    invariants: []
    mystery_reserve_entries: []
    section_records: []
    user_premise: ""
  downstream_pressure:
    required_record_updates: []
    likely_impacted_records: []
    story_bundle_risks: []
  resistance_and_containment:
    stabilizers: []
    rate_limits: []
    counterpressures: []
    non_adoption_reasons: []
  trace_registers:
    visible_traces: []
    hiddenness_mechanism: ""
  story_affordances:
    enables: []
    constrains: []
    closes: []
```

`integration_chain` is required for new CFs unless the fact is a genesis seed in a newly created world. For small structural facts, fields may be brief, but they must not be omitted merely because the fact appears obvious.
```

#### Implementation notes

This is the most important propagation amendment. Validators do not need to semantic-judge every string at first; they can initially enforce presence, non-empty upstream support, and at least one downstream or trace entry. Later validators can cross-check IDs and affected records.

---

### Amendment 4 — Add a Rule Numbering and Enforcement Map

**Priority:** High  
**Type:** Addition  
**Location:** Immediately before `## Validation Rules` or at the top of `## Validation Rules`.

#### Problem

The current validation rules jump from Rule 7 to Rule 11 and Rule 12. Rule 9 and Rule 10 are referenced as handled elsewhere. `WORKFLOWS.md` also mentions canon-addition Test 13, but `FOUNDATIONS.md` does not define a Rule 13. This is a documentation reliability bug: every new plan/spec reads FOUNDATIONS, so unclear numbering will eventually cause mistaken references.

#### Insert

```markdown
### Rule Numbering and Enforcement Map

Rule numbers are stable references. A rule may be enforced by a dedicated validator, by a named skill phase, or by both, but a skill must not cite a rule number whose meaning is not declared here.

- **Rule 1:** No Floating Facts.
- **Rule 2:** No Pure Cosmetics.
- **Rule 3:** No Specialness Inflation.
- **Rule 4:** No Globalization by Accident.
- **Rule 5:** No Consequence Evasion.
- **Rule 6:** No Silent Retcons.
- **Rule 7:** Preserve Mystery Deliberately.
- **Rule 8:** Reserved. Do not cite Rule 8 until FOUNDATIONS assigns it.
- **Rule 9:** No Impossible Knowledge. Enforced by the relevant knowledge-distribution / epistemic-profile checks in character-generation, diegetic-artifact-generation, story-pipeline gates, and canon-addition where applicable.
- **Rule 10:** No Premise-Collapsing Exceptions. Enforced by diffusion analysis, counterfactual pressure tests, stabilizer checks, and exception-governance checks.
- **Rule 11:** No Spectator Castes by Accident.
- **Rule 12:** No Single-Trace Truths.
- **Rule 13:** No Perfect Recognition by Default.

Test numbers are not rule numbers. A skill may have Validation Test 13 without creating Rule 13 unless FOUNDATIONS declares that rule.
```

Then add the new Rule 13 below Rule 12:

```markdown
### Rule 13: No Perfect Recognition by Default

A new canon fact must not assume that all relevant actors correctly recognize, interpret, or act on it unless that recognition is itself canonized.

For facts with social, institutional, magical, technological, religious, or epistemic consequences, the change must name at least one plausible misrecognition, false explanation, contested interpretation, or knowledge-exclusion vector, unless `epistemic_profile.n_a` is justified.

This rule protects secrets, propaganda, local expertise, misinformation, taboo, class blindness, religious interpretation, bureaucratic distortion, and ordinary ignorance. It is the world-canon counterpart of the story-scope `BEL` / `SF` distinction.
```

#### Implementation notes

This is partly a documentation fix and partly an operational fix. The `epistemic_profile` already has `distortion_vectors`, `knowledge_exclusions`, and `propagation_channels`; Rule 13 gives those fields a named purpose.

---

### Amendment 5 — Add story-scope “No Cosmetic Choices” / Choice Consequence Integrity

**Priority:** High  
**Type:** Addition  
**Location:** In `## Story Bundles`, under `### 5. Validation Rules At Story Scope`, immediately after the current Rule 5 story-scope paragraph.

#### Problem

The current story-scope Rule 5 says every page must leave at least one continuation storylet eligible. That prevents dead ends, but it does not prevent fake agency. A page can technically continue while the player’s selected choice has no meaningful consequence.

Interactive narrative research strongly supports requiring meaningful consequences. This does not mean every choice must produce a huge branch. It means every accepted choice must change or reveal something load-bearing.

#### Insert

```markdown
**Choice Consequence Integrity.** At story scope, Rule 5 also means: no accepted player choice or accepted write-in may be cosmetic only.

Every committed `CHC` selection or accepted write-in must produce at least one grounded consequence in the page-cycle records:

- a `state_delta` on an `SE` record;
- a new, superseded, or closed `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STSTAT`, `STLOC`, or `STOBJ` record;
- a changed visibility / knowledge state;
- a changed affordance set for the next page;
- a materially different local interpretation, cost, delay, exposure, debt, or relationship pressure.

A choice may fail, be refused, or be blocked by world logic, but that failure must itself become a consequence. Cosmetic wording variants that lead to the same state are allowed only when the plan explicitly marks them as rhetorical / expressive choices rather than causal choices.
```

#### Implementation notes

This is a story analogue of Rule 2. It should be enforced in `branching-story-turn-cycle` and audited in `branching-story-health-audit`.

---

### Amendment 6 — Add Story/Canon Baseline Drift Protocol

**Priority:** High  
**Type:** Addition  
**Location:** In `## Story Bundles`, immediately after `### 4a. Plan-Authority Boundary`.

#### Problem

Story bundles are derived layers, but world canon can change after a story bundle or page has been committed. `CONTEXT-PACKET-CONTRACT.md` already indicates that story turns persist `state_snapshot.canon_revision` and health audits compare the story baseline against recent canon movement. `FOUNDATIONS.md` should state the governance rule explicitly.

#### Insert

```markdown
### 4b. Canon Baseline Drift

A committed story page is evaluated against the world-canon revision it loaded when the page-plan was committed. Later world-canon changes do not silently rewrite existing `PG`, `SE`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, or choice records.

When a new story turn begins, the turn-cycle must compare the parent page's `state_snapshot.canon_revision` against current world canon. If relevant canon moved, the turn must classify the drift:

- `compatible`: no repair needed; continue under current canon.
- `grandfathered`: existing committed pages remain valid as historical story-local state, but new turns must not extend the outdated assumption.
- `requires_health_audit`: the bundle may continue only after `branching-story-health-audit` evaluates the affected records.
- `requires_repair_turn`: the next page must spend causal attention reconciling the drift diegetically or structurally.
- `promotion_or_retcon_conflict`: the drift exposes a story-local fact that must be promoted, rejected, or retconned before further extension.

No story-pipeline skill may silently treat old story-local assumptions as still world-valid after a conflicting canon revision.
```

#### Implementation notes

This amendment turns an existing implementation practice into a FOUNDATIONS-level rule. It avoids retroactive mutation of committed branches while preventing future turns from extending stale assumptions.

---

### Amendment 7 — Add Authority Boundary for LLM, prose renderer, and player write-ins

**Priority:** High  
**Type:** Addition  
**Location:** In `## Story Bundles`, immediately after the proposed `### 4b. Canon Baseline Drift`, or immediately after existing `### 4a. Plan-Authority Boundary` if Amendment 6 is not adopted.

#### Problem

The plan/prose split is good, but the authority hierarchy should be explicit. External rendered prose, player write-ins, and LLM-generated plans are not equal sources of truth. Without a clear boundary, a future skill could launder prose or write-ins into state.

#### Insert

```markdown
### 4c. Authorship and Authority Boundary

The LLM is a drafting mechanism, not an authority source. The player is an input source, not an automatic fact source. The external prose renderer is a realization surface, not a state engine.

- **World canon authority** lives only in world-canon records and their approved patch / change-log path.
- **Story-local authority** lives only in committed story-bundle records and page plans accepted by the patch engine.
- **Player write-ins** are proposals until `branching-story-turn-cycle` accepts, rejects, redirects, or transforms them through the hard gates.
- **Rendered prose** may dramatize committed plan state but must not introduce new structural facts. If it does, `branching-story-prose-attach` routes the issue as prose revision, repair turn, or canon-promotion candidate.
- **LLM inference** may suggest derived implications, but those implications are not true until recorded at the appropriate world or story authority layer.

A skill must never cite generated prose, model inference, or player phrasing as sufficient authority for world-canon mutation without the normal promotion / canon-addition path.
```

#### Implementation notes

This amendment reinforces existing HARD-GATE and story-promotion discipline. It is especially important because the pipeline explicitly allows external prose rendering after plan commit.

---

### Amendment 8 — Add Information / Observer Firewall at story scope

**Priority:** Medium  
**Type:** Addition  
**Location:** In `## Story Bundles`, immediately after `### 6a. Belief vs. Fact`.

#### Problem

The file cleanly separates `SF` truth from `BEL` belief, but it should explicitly prohibit storylet selection, choice display, and character behavior from using omniscient knowledge.

#### Insert

```markdown
### 6b. Information / Observer Firewall

Story progression must respect who can know, observe, infer, record, suppress, or distort a fact.

A storylet, choice, or character action must not rely on information unavailable to the acting entity unless the plan records a valid route of access: direct observation, testimony, rumor, document, ritual authority, institutional channel, inference, surveillance, prophecy, magic / technology, or another canonically valid mechanism.

This firewall applies to:

- `BEL.visibility` and `BEL.truth_relation`;
- world-level `epistemic_profile` fields;
- location and access constraints;
- social trust and authority constraints;
- secrets, propaganda, taboo knowledge, and contested canon;
- choice text shown to the player.

A player may know more than the character, but character-facing choices must not smuggle player-only or narrator-only knowledge into the character's action space unless the story explicitly supports that stance.
```

#### Implementation notes

This is compatible with existing `BEL` / `SF` design and with epistemic_profile fields. It should become a health-audit check and a turn-cycle hard-gate rationale item.

---

### Amendment 9 — Add Mystery Accretion Discipline

**Priority:** Medium  
**Type:** Addition  
**Location:** Under Rule 7, after the existing “Mystery firewall enforcement” paragraph.

#### Problem

Mysteries are protected against direct resolution, but in branching stories a mystery can be accidentally solved by accumulated clues, near-misses, false explanations, or repeated narrowing. The system needs a lightweight rule for clue accretion.

#### Insert

```markdown
**Mystery accretion discipline.** A fact, storylet, page plan, clue, artifact, belief, or event that touches a Mystery Reserve entry must classify its mystery effect:

- `boundary`: clarifies what the answer cannot be;
- `clue`: adds evidence that narrows possible answers;
- `red_herring`: adds plausible but false or contested direction;
- `atmosphere`: deepens presence without narrowing the answer;
- `false_resolution`: lets an actor believe the mystery is solved without world-level resolution;
- `resolution_candidate`: proposes an answer and must obey `future_resolution_safety` and canon-promotion discipline.

Repeated clues can resolve a mystery by accumulation even when no single clue states the answer. Story-pipeline skills must check cumulative narrowing against the Mystery Reserve firewall, not merely direct answer statements.
```

#### Implementation notes

This should eventually be represented in `mystery_policy` or page-plan frontmatter, but the initial FOUNDATIONS amendment can be normative.

---

### Amendment 10 — Strengthen Change Control with an impact-surface map

**Priority:** Medium  
**Type:** Replacement / expansion  
**Location:** `## Change Control Policy`.

#### Problem

The current change-control list is correct but too brief for the project’s “canon facts do not stand in isolation” goal. It should explicitly require indirect impact surfaces and story-bundle effects.

#### Replace current block

Current block:

```markdown
Every approved change must:
- get a record
- list affected files
- state whether it is local or global
- state whether it changes ordinary life
- state whether it creates new story engines
- state whether it narrows or expands the Mystery Reserve

No change is complete until downstream files are updated.
```

Replace with:

```markdown
Every approved world-canon change must:

- get a record;
- list affected atomic record ids or target classes, not retired root markdown filenames;
- state whether it is local, regional, global, cosmic, branch-local, or time-bounded;
- state whether it changes ordinary life;
- state whether it creates, closes, or alters story engines;
- state whether it narrows, expands, protects, falsely explains, or threatens the Mystery Reserve;
- name direct impact surfaces;
- name likely indirect impact surfaces;
- name story bundles that may need health audit, if any are known;
- state what traces should now exist in at least two registers when Rule 12 applies;
- state what actors are likely to misrecognize, suppress, distort, or exploit the change when Rule 13 applies.

Recommended machine-readable shape:

```yaml
impact_surface_map:
  direct_updates: []
  indirect_surfaces_to_inspect: []
  story_bundles_to_audit: []
  trace_registers_required: []
  mystery_effects: []
  misrecognition_vectors: []
  ordinary_life_effect: none | minor | material | structural
  story_engine_effect: creates | alters | closes | none
```

No change is complete until required downstream records are updated or explicitly deferred with a logged reason and an owner surface.
```

#### Implementation notes

This ties together Rule 5, Rule 12, Rule 13, context-packet impact surfaces, and story-bundle health auditing.

---

### Amendment 11 — Require hard-gate rationales to cite authority records

**Priority:** Medium  
**Type:** Addition  
**Location:** `## Tooling Recommendation`, after the paragraph beginning “This is non-negotiable.”

#### Problem

HARD-GATE-DISCIPLINE requires each validation test to record PASS with a one-line rationale. That is good, but FOUNDATIONS should require those rationales to cite the authority they loaded. Otherwise “PASS because it seems consistent” can creep back in.

#### Insert

```markdown
**Authority-cited gate rationales.** Any hard-gate PASS / FAIL rationale for canon safety must cite the record ids, packet layer, validator result, or retrieved field that supports the judgment. A bare rationale based on model memory, prose impression, or unstated inference is not sufficient.

Good: `PASS — CF-12 distribution limits and INV-DIST-2 rate-limit the capability to temple workshops.`

Bad: `PASS — seems plausible for the world.`
```

#### Implementation notes

This is a low-cost improvement. It also aligns with the retrieval model: the packet identifies what must be loaded, and targeted retrieval provides full bodies or fields.

---

### Amendment 12 — Operationalize aesthetic / thematic invariants for story bundles

**Priority:** Medium  
**Type:** Addition  
**Location:** In `## Story Bundles`, after `### 1. What A Story Bundle Is` or in `STORY_KERNEL.md` requirements if that section exists elsewhere.

#### Problem

Aesthetic and thematic invariants are part of the invariant model, but story bundles may acknowledge them as IDs without operationalizing them. That can lead to technically canon-safe but tonally alien branches.

#### Insert

```markdown
### 1a. Story-Local Operationalization of Invariants

When a story bundle acknowledges world invariants, especially aesthetic / thematic invariants, `STORY_KERNEL.md` must state the operational consequence for this story.

An invariant id alone is not enough. The story kernel should say how the invariant affects choices, consequences, tone, failure, reward, violence, mercy, social pressure, revelation, or closure.

Example:

```yaml
invariants_acknowledged:
  - invariant_id: ATH-2
    operational_consequence: "Victories should carry social, bodily, or moral cost; clean triumph choices are disallowed unless framed as illusion or propaganda."
```
```

#### Implementation notes

This preserves the “what makes the world feel like itself” function of aesthetic/thematic invariants across branches.

---

## Recommended non-changes

Do **not** remove or weaken these current commitments:

1. **No global drama manager.** The current stance is correct. Use local salience gated by coherence, not hidden optimization toward a target arc.
2. **No act structure in engine state.** This protects branching agency and avoids suppressing valid player actions.
3. **Commitment blocks as causal moves.** This is the right abstraction. Keep them as reusable causal blocks with preconditions, beats, effects, exits, and saliency.
4. **Plan-first authority.** Keep page-plan commit as the state transition and prose as a receipt / realization surface.
5. **No prose word quotas.** The existing prose-length discipline is sound. Pacing should follow beats and stopping conditions, not word budgets.
6. **Belief/fact separation.** `SF` and `BEL` separation is essential for lies, secrets, witness asymmetry, contested interpretation, and non-omniscient branching.
7. **Engine-routed writes.** The HARD-GATE + approval-token + patch-engine route is exactly the right posture for canon mutation.

---

## Implementation sequence

1. **Patch `FOUNDATIONS.md` text first.** Add the normative sections and schema replacement notes.
2. **Update canonical vocabularies and schemas.** Add `derived_canon`; deprecate new `status: mystery_reserve` on CF records; update `required_world_updates` shape if enforced.
3. **Update validators in phases.** Start with structural presence checks for `integration_chain`, then add cross-record checks later.
4. **Update story skills.** `branching-story-turn-cycle` should enforce Choice Consequence Integrity, Authorship/Authority Boundary, Information Firewall, and Canon Baseline Drift. `branching-story-health-audit` should audit them.
5. **Update canon-addition.** Add Rule 13 / misrecognition as a named FOUNDATIONS rule, enforce atomic update targets, and require authority-cited hard-gate rationales.
6. **Update context-packet profiles only if needed.** Most required retrieval already exists: story turns receive story-bundle context and governing world context; canon additions already retrieve canon facts, invariants, Mystery Reserve, and open questions.

---

## Minimal patch set

If you want the least disruptive change set, do only these five now:

1. Fix CF `status` to include `derived_canon` and remove/deprecate `mystery_reserve` as a CF status.
2. Replace retired markdown filenames in `required_world_updates` with atomic target classes / record IDs.
3. Add Silence Semantics after Default Reality.
4. Add Canon Integration Chain after Canon Fact Record Schema.
5. Add Choice Consequence Integrity under story-scope Rule 5.

Those five changes directly address the highest-risk failure mode: facts or choices that look plausible in isolation but do not propagate through the world/state model.

---

## Appendix: source areas consulted

The review used the uploaded Worldloom documents and research / implementation references in these areas:

- Worldloom `FOUNDATIONS.md`, `CONTEXT-PACKET-CONTRACT.md`, `HARD-GATE-DISCIPLINE.md`, `MACHINE-FACING-LAYER.md`, and `WORKFLOWS.md`.
- Storylet design-space research, including Kreminski and Wardrip-Fruin’s storylets work.
- LLM-assisted storylet research, especially Drama Llama.
- Interactive narrative and narrative planning research, including Riedl / Bulitko and Mimesis-related mediation work.
- LLM long-story consistency research, especially ConStory-Bench / Lost in Stories.
- Knowledge-graph-assisted storytelling and plot-planning work.
- Truth-maintenance / reason-maintenance research.
- Transmedia worldbuilding and hyperdiegesis theory.
- Comparable tools: Twine, ink, Yarn Spinner, and articy:draft.

## Outcome

Completed on 2026-05-15 as an exploited source report. Its recommendations were triaged into `docs/triage/2026-05-14-foundations-amendment-proposal-triage.md`, then formalized and implemented through `archive/specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` and the archived `SPEC27FOUCAN-001` through `SPEC27FOUCAN-009` ticket family.

The report remains preserved as provenance for the external review. Its proposed amendments are not current authority; `docs/FOUNDATIONS.md`, the SPEC-27 archive record, and the landed ticket closeouts are authoritative for the accepted, rejected, and modified outcomes.
