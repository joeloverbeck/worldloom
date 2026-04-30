The overall direction is right. The five-pipeline system is much better suited to branching fiction than an act spine: it treats a page as a state transaction, tracks obligations/promises, uses storylets as consequence-capable narrative operators, and enforces branch isolation through `branch_path`, per-page snapshots, and `created_at_page` provenance. That is the right foundation. The bootstrap explicitly replaces the act-spine model with a causal-promise engine, and the page-cycle explicitly treats fork/replay as normal continuation from any page while hiding sibling-branch state.

But I would **not ship these specs as-is**. They are conceptually strong but have several load-bearing gaps that will cause either hidden cross-branch contamination, brittle storylet matching, or a subtle return of “planned structure” under different names.

The most important fixes are:

1. Add **canon-version pinning** so newly promoted canon does not leak into old branches.  
2. Add **recursive reference-closure validation**, not just `created_at_page` checks on top-level records.  
3. Separate **objective truth**, **character belief**, **reader knowledge**, **rumor**, and **apparent truth**.  
4. Persist `required_aftermath` as a real ledger, not a temporary analysis artifact.  
5. Add explicit **storylet visibility scope** beyond `created_at_page: null | PG-NNNN`.  
6. Formalize the predicate / operation DSL, or replay equality will be mostly aspirational.  
7. Add branch records, relationship state, object/location/inventory state, and diegetic artifact records.  
8. Change mystery resolution so branches may contain **apparent** or **branch-local** resolutions without necessarily canonizing them.  
9. Remove or soften anything that recreates hidden act structure: especially `climax_options`, `denouement_residue`, and some “pacing” language.  
10. Replace the current prompt-level content policy with something production-safe and model-compatible.

Below is the concrete patch list.

---

# **1. Add canon-version pinning or promotions will contaminate sibling branches**

## **Problem**

The promotion pipeline correctly says story-local facts stay separate from world canon, and that promotion is the only path by which a branch outcome becomes world-level truth. It also scans other branches for contradictions.

However, the page-cycle also reads current world canon each turn. After a branch promotes a fact to canon, another branch that diverged earlier may continue later and suddenly retrieve the newly promoted CF. That is cross-contamination unless the user explicitly synchronizes that branch.

This is the biggest systemic hole.

## **Modify**

In `branching-story-bootstrap.md`, modify `STORY_KERNEL.md` output to include:

canon_baseline:  
 world_canon_revision: CH-NNNN | null  
 canon_sync_policy: pinned | prompt_on_new_canon | always_current

Default should be:

canon_sync_policy: pinned

In `branching-story-page-cycle.md`, modify Phase 0 / Reads.

### **Replacement rule**

### Canon Baseline Rule

The parent page's `state_snapshot` is the authoritative branch state.

World canon retrieval during page-cycle is used for:  
- invariant validation  
- mystery firewall validation  
- context for entities already present in the branch  
- detecting that new world canon exists

It must NOT silently add newly promoted CFs into an existing branch.

If the current world canon revision is newer than `parent_page.state_snapshot.canon_revision`, the engine must route according to `canon_sync_policy`:

- `pinned`: continue using the branch's existing canon baseline; new CFs are invisible unless explicitly imported by a canon-sync event.  
- `prompt_on_new_canon`: present a branch-sync choice to the user.  
- `always_current`: import compatible new CFs through explicit `canon_sync` applied_event_ops.

A branch that contradicts newly promoted canon remains valid as a counterfactual branch unless archived by explicit user action.

In the page record template, add:

state_snapshot:  
 canon_revision: CH-NNNN | null  
 canon_sync_policy: pinned | prompt_on_new_canon | always_current  
 canon_divergences:  
   - cf_id: CF-NNNN  
     relation: consistent | counterfactual | unknown | not_imported  
     reason: >  
       ...

In `story-fact-promotion-to-canon.md`, modify contradiction handling.

### **Replacement**

Promotion does not mutate existing branch snapshots.

On accept, contradicting branches are flagged, archived, or left alone per user decision, but no branch imports the new CF unless a later page-cycle run performs an explicit `canon_sync` transaction.  
---

# **2. Add recursive branch-reference closure validation**

## **Problem**

The current branch-isolation rule checks whether records cited in a page snapshot have `created_at_page ∈ branch_path`. That is necessary but insufficient.

A record created on the current branch could still contain internal references to sibling-branch records:

id: OBL-0100  
created_at_page: PG-0042   # valid current branch  
dependent_facts: [SF-0099] # actually created on sibling branch

The top-level record passes. The dependency leaks.

## **Add**

In `branching-story-page-cycle.md`, Phase 9 validation gates, add:

| Recursive reference closure | For every story-local record reachable from `this_page.state_snapshot`, recursively inspect all story-local ID references inside that record. Every referenced SF / SE / OBL / THR / STINT / STENT / SREL / DA / SLT / CHC must either have `created_at_page: null` where globally legal, or `created_at_page ∈ this_page.branch_path`. Any sibling-branch reference halts the transaction. |

In `branching-story-health-audit.md`, Phase 4, replace “Cross-Branch Records Leakage” with:

### Cross-Branch Reference Closure Leakage

For every record cited in any page's `state_snapshot`, recursively walk all story-local references inside that record.

If any reachable record has `created_at_page` outside this page's `branch_path`, or if a globally visible record references branch-local IDs, report `error`.

This should become the real structural branch-isolation audit, not merely a top-level `created_at_page` check. The audit already treats branch-isolation failures as errors, which is correct.

---

# **3. Separate objective truth, beliefs, rumors, reader knowledge, and apparent truth**

## **Problem**

`facts_truth_table: {SF-NNNN: certainty}` is too blunt. The docs use SFs for world imports, secrets, beliefs, mystery implications, and story-local facts. But a character belief is not the same thing as objective branch truth. A false belief should not sit in the same truth table as “the mentor is dead.”

This will create contradictions, especially in mysteries and dramatic irony.

## **Add**

In `branching-story-bootstrap.md`, after Phase 3 “World-Fact Import,” insert:

## Story Fact Schema

Every SF-NNNN must declare its epistemic class.

```yaml  
id: SF-0001  
story_id: STORY-001  
logical_id: SF-0001  
supersedes: null  
created_at_page: PG-0001

subject: STENT-NNNN | object | location | abstract  
predicate: <engine-checkable predicate>  
object: <value>

epistemic_class: objective | belief | rumor | reader_inference | apparent | disputed  
truth_value: true | false | unknown | contested  
certainty: 0.0..1.0

known_by: [STENT-NNNN, ...]  
believed_by: [STENT-NNNN, ...]  
disbelieved_by: [STENT-NNNN, ...]  
visible_to_reader: true | false

derived_from_cf: CF-NNNN | null  
canon_relation: canon_consistent | canon_divergent | canon_unknown | not_applicable

evidence:  
 - event_id: SE-NNNN  
   page_id: PG-NNNN  
   strength: weak | moderate | strong | decisive

notes: >  
 ...

Then modify every `state_snapshot` template in bootstrap and page-cycle:

```yaml  
state_snapshot:  
 objective_facts: [SF-NNNN, ...]  
 apparent_facts: [SF-NNNN, ...]  
 disputed_facts: [SF-NNNN, ...]  
 reader_known_facts: [SF-NNNN, ...]  
 belief_state_by_actor:  
   STENT-0001: [SF-NNNN, ...]

This is especially important because the bootstrap already uses STINT beliefs and secrets, but does not define how false beliefs differ from true facts.

---

# **4. Persist `required_aftermath` as a real ledger**

## **Problem**

The page-cycle’s impact analysis produces `required_aftermath`, and storylet scoring later refers to `pending_consequences`. But there is no persistent ledger for these.

That means the system can identify “body discovery,” “rumor wave,” or “faction reaction” during one turn, then lose it unless it is manually converted into an obligation.

For destructive branching, this is fatal.

## **Add**

Create a new ledger:

_source/consequences/        ← CNSQ-NNNN.yaml

In every story bundle structure, add:

├── _source/consequences/       ← CNSQ-NNNN.yaml

Add this schema to `branching-story-page-cycle.md`, after Phase 2 Impact Analysis:

id: CNSQ-0001  
story_id: STORY-001  
logical_id: CNSQ-0001  
supersedes: null  
created_at_page: PG-NNNN

kind: body_discovery | rumor_wave | faction_reaction | guilt_or_justification |  
     resource_loss | pursuit | public_scandal | relationship_fallout |  
     environmental_change | legal_consequence | other

source_event: SE-NNNN  
source_choice: CHC-NNNN | write_in  
subjects: [STENT-NNNN, ...]  
scope:  
 location: local | regional | global | private  
 social: private | factional | public | secret  
urgency: 0..10  
salience: 0..10  
visibility_to_reader: hidden | implied | explicit

status: pending | addressed | transformed | expired | impossible  
addressable_by_storylets: [SLT-NNNN, ...] # cache only; recomputable  
notes: >  
 ...

Modify `state_snapshot`:

consequences_pending: [CNSQ-NNNN, ...]  
consequences_addressed: [CNSQ-NNNN, ...]

Modify Phase 5 State Mutation:

required_aftermath items are instantiated as CNSQ records unless they are already represented by a new OBL. Consequence records are branch-scoped and must be visible only along the branch that created them.

This is not optional. The whole promise/consequence engine depends on remembering consequences.

---

# **5. Add storylet visibility scope; `created_at_page` alone is not enough**

## **Problem**

Author-pool storylets are globally visible with `created_at_page: null`; JIT storylets are branch-scoped with `created_at_page: PG-NNNN`. That is good for runtime JIT.

But `storylet-pool-authoring.md` says audit mode can produce either author-pool or branch-scoped storylets depending on whether the audit found a global or branch-local gap.

The schema does not make this decision explicit enough. A branch-local remediation storylet accidentally written with `created_at_page: null` will leak across the whole story.

## **Modify**

In `storylet-pool-authoring.md`, replace the current provenance section:

created_at_page: PG-NNNN | null

with:

provenance:  
 origin: bootstrap_seed | focus_authoring | audit_remediation | runtime_jit  
 source_audit: SAU-NNNN | null  
 source_rsp: RSP-NNNN | null  
 created_at_page: PG-NNNN | null

visibility:  
 scope: global_author_pool | branch_scoped | branch_prefix_scoped  
 visible_from_page: PG-NNNN | null  
 visible_branch_path_prefix: [PG-NNNN, ...] | null  
 allowed_branch_ids: [BR-NNNN, ...] | null

Then add this rule:

Audit-mode storylets must inherit visibility from the RSP card.

- If `target_branch: global pool`, use `visibility.scope: global_author_pool`.  
- If `target_branch` is a concrete branch path, use `visibility.scope: branch_prefix_scoped`.  
- If the storylet depends on any branch-local fact, obligation, consequence, intention, relationship, or page-specific event, it may not be global.

Also add this validation gate:

Global author-pool storylets may not directly reference story-local records created after PG-0001. They may use abstract matchers, role predicates, and world/root facts only.

This one change prevents a lot of accidental contamination.

---

# **6. Add explicit branch records**

## **Problem**

Right now, a branch is effectively a leaf page plus a `branch_path` array. That works structurally, but it is awkward for indexing, promotion, archive/flag decisions, analytics, and UI.

A branch should have an identity that survives as the leaf extends.

## **Add**

Add a branch ledger:

_source/branches/BR-NNNN.yaml

Schema:

id: BR-0001  
story_id: STORY-001  
root_page_id: PG-0001  
current_leaf_page_id: PG-NNNN

forked_from_branch_id: BR-NNNN | null  
forked_from_page_id: PG-NNNN | null  
forked_from_choice_id: CHC-NNNN | null  
forked_from_write_in_hash: <hash> | null

branch_path: [PG-0001, ...]  
status: active | terminal | archived | corrupt | contradicted_by_promoted_canon  
canon_revision: CH-NNNN | null

created_at_page: PG-NNNN  
created_at: <iso8601>  
notes: >  
 ...

Modify every page record:

branch_id: BR-NNNN

Modify `INDEX.md` branch tables to list `BR-NNNN`, not only leaf page IDs.

The page-cycle can still use `branch_path` as the authority. The branch ID just makes branch lifecycle manageable.

---

# **7. Formalize event and operation schemas**

## **Problem**

The page-cycle depends on replay equality:

parent.snapshot + applied_event_ops == this_page.snapshot

The audit also treats replay equality as load-bearing.

But `applied_event_ops` is not formal enough. If ops are opaque payloads, equality will be hard to compute, hard to audit, and easy for LLM output to corrupt.

## **Add**

In `branching-story-page-cycle.md`, after “Output / Files Written,” add:

# SE-NNNN.yaml  
id: SE-0042  
story_id: STORY-001  
branch_id: BR-NNNN  
created_at_page: PG-0042

source:  
 parent_page_id: PG-0017  
 chosen_choice_id: CHC-0098 | null  
 write_in_text_hash: <hash> | null  
 storylet_realized: SLT-0019

actor: STENT-NNNN | system | environment  
action: <canonical verb>  
target: STENT-NNNN | object | location | abstract | null  
instrument: STENT-NNNN | object | fact | null

preconditions_checked:  
 - predicate: <predicate>  
   result: pass | fail  
   evidence: <record-id>

ops:  
 - op_id: OP-0001  
   op_type: fact_create | fact_invalidate | obligation_open |  
            obligation_supersede | consequence_open | consequence_address |  
            thread_supersede | intention_refresh | relationship_supersede |  
            cast_change | location_change | inventory_change | canon_sync  
   input_records: [SF-NNNN, OBL-NNNN, ...]  
   output_records: [SF-NNNN, OBL-NNNN, ...]  
   deterministic_payload: {...}

state_hash_before: <hash>  
state_hash_after: <hash>

notes: >  
 ...

Then modify page records:

applied_event_ops: [SE-NNNN]  
state_hash: <hash>  
parent_state_hash: <hash>

The event should own the operations. The page should cite the event.

---

# **8. Add a predicate DSL**

## **Problem**

Storylet hard preconditions, choice validation, consequence-capacity checks, and invariant compatibility all depend on predicates. But the docs currently say `{predicate}` without defining a grammar.

Without a predicate DSL, the “engine deterministic” parts will become LLM-dependent.

## **Add**

In `storylet-pool-authoring.md`, before the storylet schema, insert:

## Predicate DSL

All `hard_preconds`, `soft_preconds`, `constraints`, and validation preconditions must use engine-checkable predicates.

Allowed forms:

```yaml  
- pred: fact_true  
 fact: SF-NNNN

- pred: fact_matches  
 subject: STENT-NNNN | role:<role>  
 predicate: alive | present | has_object | knows | believes | relationship_axis | location  
 object: <value or record-id>

- pred: entity_state  
 entity: STENT-NNNN | role:<role>  
 property: alive | conscious | present | willing | armed | injured  
 op: == | != | > | < | >= | <=  
 value: <value>

- pred: relationship  
 from: STENT-NNNN | role:<role>  
 to: STENT-NNNN | role:<role>  
 axis: trust | fear | desire | debt | intimacy | loyalty | resentment  
 op: == | != | > | < | >= | <=  
 value: <number>

- pred: consequence_pending  
 kind: <CNSQ kind>  
 salience_min: 0..10

- pred: obligation_open  
 matcher: {...}

- pred: not  
 predicate: {...}

- pred: all  
 predicates: [...]

- pred: any  
 predicates: [...]

Free-form prose predicates are invalid.

Then add a schema validation gate:

```markdown  
Any storylet with non-parseable predicates is rejected before LLM review.  
---

# **9. Add relationship state as a first-class ledger**

## **Problem**

Storylets have `relationship_effects`, and STINT records contain relationships, but there is no relationship ledger. This will make relational branching weak and hard to replay.

Relationships are not just character intentions. They are shared state.

## **Add**

Add:

_source/relationships/SREL-NNNN.yaml

Schema:

id: SREL-0001  
story_id: STORY-001  
logical_id: SREL-0001  
supersedes: null  
created_at_page: PG-NNNN

party_a: STENT-NNNN  
party_b: STENT-NNNN

axes:  
 trust: -10..10  
 fear: -10..10  
 desire: -10..10  
 intimacy: -10..10  
 loyalty: -10..10  
 resentment: -10..10  
 debt: -10..10  
 power_imbalance: -10..10

public_status: strangers | allies | lovers | enemies | family | rivals | ambiguous  
private_status_by_actor:  
 STENT-0001: <how A understands it>  
 STENT-0002: <how B understands it>

known_by: [STENT-NNNN, ...]  
visible_to_reader: true | false

source_events: [SE-NNNN, ...]  
notes: >  
 ...

Modify `state_snapshot`:

relationships_current: [SREL-NNNN, ...]

Modify storylet `relationship_effects` so they produce superseding SREL records, not just loose deltas.

This will help enormously with choice generation, intimacy, betrayal, rivalry, and forgiveness arcs.

---

# **10. Add object, location, and inventory state**

## **Problem**

The page-cycle validates whether an instrument is available, whether a target is in scope, whether a character can shoot, flee, use an object, etc. But the state snapshot has no explicit inventory, object, or location fields.

Encoding all of that as generic SFs is possible, but then affordance collection becomes fragile.

## **Add**

At minimum, modify every page snapshot:

state_snapshot:  
 current_location: STLOC-NNNN | string  
 accessible_locations: [STLOC-NNNN, ...]  
 objects_in_scope: [STOBJ-NNNN, ...]  
 inventory_by_entity:  
   STENT-0001: [STOBJ-NNNN, ...]  
 entity_status:  
   STENT-0001:  
     alive: true  
     present: true  
     conscious: true  
     mobile: true  
     restrained: false

Better: add lightweight ledgers:

_source/locations/STLOC-NNNN.yaml  
_source/objects/STOBJ-NNNN.yaml

Do not leave object/location state implicit. The choice system depends on it.

---

# **11. Add diegetic artifact records or remove artifact canonization**

## **Problem**

`story-fact-promotion-to-canon.md` supports `artifact_canonization` via `DA-NNNN`, but the story bundle structure has no diegetic artifact directory and no DA schema.

## **Modify**

Either remove `artifact_canonization` for now, or add:

_source/artifacts/DA-NNNN.yaml

Schema:

id: DA-0001  
story_id: STORY-001  
created_at_page: PG-NNNN  
creator: STENT-NNNN | unknown  
artifact_type: letter | decree | map | weapon | relic | recording | contract | other  
physical_form: >  
 ...  
contents_summary: >  
 ...  
current_holder: STENT-NNNN | location | unknown  
known_by: [STENT-NNNN, ...]  
visible_to_reader: true | false  
source_events: [SE-NNNN, ...]  
canon_status: story_local | promoted | rejected_for_promotion  
promoted_to_cf: CF-NNNN | null  
notes: >  
 ...

Also rename `source_char_id` in promotion inputs to `source_stent_id` for story-local character outcomes. `CHAR-NNNN` is world-level; `STENT-NNNN` is the story-local mirror.

---

# **12. Fix mystery resolution: add apparent / branch-local / canon-authoritative outcomes**

## **Problem**

The page-cycle says that if a selected storylet resolves a low/medium/high mystery, it must pause and route through canon promotion.

That protects world canon, but it also undermines the “stories are counterfactual” rule in the promotion pipeline. A branch may need to produce an apparent answer, a local false answer, or a counterfactual resolution without declaring that the world mystery is now objectively solved.

## **Modify**

In `storylet-pool-authoring.md`, replace:

M_resolved: [M-NNNN, ...]  
requires_canon_promotion: false | true

with:

mystery_safety:  
 forbidden_M_resolved: false  
 M_touched: [M-NNNN, ...]  
 M_progressed: [M-NNNN, ...]  
 M_resolution_claims:  
   - m_id: M-NNNN  
     resolution_authority: apparent | branch_local_counterfactual | canon_candidate  
     claim_strength: clue | theory | confession | proof | objective_event  
     requires_canon_promotion: true | false  
 resolution_safety_per_M:  
   M-NNNN: forbidden | low | medium | high

In `branching-story-page-cycle.md`, replace Phase 4.5 with:

### Phase 4.5: Mystery Resolution Authority

If a storylet makes an `apparent` mystery-resolution claim, the page-cycle may continue. The resulting SF must use `epistemic_class: apparent` or `belief`.

If a storylet makes a `branch_local_counterfactual` resolution claim, the page-cycle may continue only if the story mode permits counterfactual mystery branches. The resulting SF must use `canon_relation: canon_divergent` or `canon_unknown`, and must not update world M status.

If a storylet makes a `canon_candidate` resolution claim, page-cycle pauses and hands off to `story-fact-promotion-to-canon`.

A `forbidden` M remains hard-rejected in all cases.

This keeps mysteries protected without forcing every interesting branch into world canon.

---

# **13. Add terminal branch support**

## **Problem**

The current consequence-capacity rule assumes every choice must have continuation capacity. That is mostly right, but wild user choices can produce coherent endings. A branch can end.

Without terminal support, the engine may contort itself to continue branches that should simply terminate.

## **Add**

In `branching-story-page-cycle.md`, Phase 3 Continuation Feasibility:

### Terminal Feasibility

A choice does not fail continuation feasibility if it produces a coherent terminal branch.

A terminal branch must:  
- resolve or acknowledge all required-closure obligations visible to the reader  
- mark unresolved obligations as `abandoned_with_acknowledgment`, `tragic_loss`, or `failed_expectation`  
- address all pending high-salience consequences  
- produce a terminal page whose state_snapshot has `branch_terminal: true`  
- update BR-NNNN status to `terminal`

Terminality is not an act milestone. It is a state condition.

Modify page snapshot:

branch_terminal: true | false  
terminal_reason: resolved | tragic_end | dead_end_acknowledged | player_choice | invariant_block

Modify choice generation:

Terminal choices are allowed when they are honest, consequence-capable, and clearly labeled as potentially final without spoiling the exact outcome.  
---

# **14. Add choice contracts**

## **Problem**

A choice label creates a contract with the user. The docs already say labels must be faithful and not preview outcomes.

But the CHC schema only has `likely_effects`. That is too weak. If the user picks “Confess the secret,” the engine must not turn that into “almost confess but get interrupted” unless the choice was framed as an attempt.

## **Modify**

In `branching-story-page-cycle.md`, replace the CHC schema with this expanded version:

id: CHC-NNNN  
story_id: STORY-001  
emitted_at_page: PG-NNNN  
created_at_page: PG-NNNN

operation: <verb>  
actor: STENT-NNNN  
target: STENT-NNNN | object | location | abstract  
uses_fact: SF-NNNN | null

choice_contract:  
 user_intent: >  
   What the player is trying to do.  
 guaranteed_action: >  
   What will definitely be attempted or performed if selected.  
 success_policy: guaranteed | attempted | uncertain | opposed  
 allowed_outcome_band:  
   - succeeds  
   - partially_succeeds  
   - fails_with_consequence  
   - backfires  
 forbidden_outcomes:  
   - <outcome that would betray the label>  
 minimum_state_change:  
   - fact | obligation | consequence | relationship | intention | thread | location | cast | terminality

likely_effects: [...]  
choice_mode: <enum>  
poetic_effect: <enum>  
content_intensity_implied: tame | mature | explicit  
label: <user-facing text>

Add validation:

A selected CHC may not be transformed outside its `choice_contract.allowed_outcome_band` without explicit user confirmation.

This protects agency.

---

# **15. Fix prose cross-checks: mentions are not presence, and incidental detail is allowed**

## **Problem**

The bootstrap and page-cycle say the prose should not mention characters outside `cast_present` and should not invent facts beyond state context.

That is too strict. Fiction needs memories, rumors, names, scenery, weather, smells, gestures, and incidental objects. The actual problem is not “mention”; it is “depict as physically present / causally active / canonically true.”

## **Modify**

Replace prose checks in bootstrap Phase 7 and page-cycle Phase 7 with:

### Prose Ledger Consistency

The prose may include:  
- sensory detail  
- metaphor  
- non-load-bearing environmental color  
- memories  
- rumors  
- offstage references  
- named absent characters

The prose may not:  
- depict an entity as physically present unless included in `cast_present`  
- make a load-bearing factual claim absent from the state context  
- create a usable object, clue, location, relationship, or secret unless that fact is written as an SF / DA / STOBJ / STLOC record  
- resolve a mystery unless the selected storylet authorizes the correct resolution authority

Add a post-render extraction step:

After rendering, extract candidate load-bearing claims from prose.

Classify each as:  
- already-ledgered  
- incidental color  
- needs-ledger-record  
- contradiction  
- mystery-risk

Only `needs-ledger-record`, `contradiction`, and `mystery-risk` require intervention.

This will make the prose better and the validator less noisy.

---

# **16. Replace hidden act-language in storylet shapes**

## **Problem**

The system says it has rejected act structure, but `climax_options` and `denouement_residue` smuggle in late-stage act language. Storylet shapes should describe transaction types, not presumed position in a plot.

## **Modify**

In `storylet-pool-authoring.md`, replace these focus areas:

climax_options  
denouement_residue  
opening_beats

with:

thread_resolution_options  
aftermath_residue  
entry_pressure

Replace storylet shape enum:

shape: opening_pressure | cast_introduction | threat_escalation |  
      relational_dynamics | routine_disruption | aftermath_sequel |  
      reflection_dilemma | mystery_edge_brush | fork_recovery |  
      thread_resolution | residue | intimacy | confrontation | other

Not every story needs “climax.” Every story can have a thread resolution.

---

# **17. Change “break pacing” language in destructive-choice routing**

## **Problem**

The write-in routing says a possible action may be treated as an attempt if instant success would “break pacing.” That is dangerously close to the old act-spine problem.

## **Modify**

In `branching-story-page-cycle.md`, Phase 1 B.3, replace:

Action is possible but instant success would be cheap or break pacing

with:

Action is possible, but full success is not sufficiently supported by current state: opposition, distance, knowledge gaps, tools, character ability, environmental constraints, or established consequences make success uncertain.

This keeps the system causal, not authorially protective.

---

# **18. Remove or downgrade stale `compatible_storylets` on obligations**

## **Problem**

The OBL schema includes:

compatible_storylets: [SLT-NNNN, ...]

But storylet pools change, audit mode adds storylets, JIT creates branch-scoped storylets, and branch visibility changes. This field will go stale.

## **Modify**

In `branching-story-bootstrap.md`, OBL schema, replace:

compatible_storylets: [SLT-NNNN, ...]

with:

coverage_cache:  
 compatible_storylets: [SLT-NNNN, ...]  
 checked_at_page: PG-NNNN | null  
 checked_at_storylet_pool_hash: <hash> | null

Add rule:

`coverage_cache` is advisory only. Runtime selection and health audit must recompute compatibility against current branch visibility.  
---

# **19. Add authoring/runtime modes**

## **Problem**

Every pipeline has HARD-GATE approval, and page-cycle presents internal state deltas to the user before writing. That is good for an authoring tool. It is bad for a player-facing runtime.

Also, mandatory LLM critics on every page-cycle turn will be expensive and slow.

## **Add**

In every pipeline input section, add:

execution_mode: authoring | interactive_runtime | batch_generation

Rules:

- `authoring`: show hard gates, previews, state deltas, and critic summaries.  
- `interactive_runtime`: auto-commit after deterministic validation; expose only prose and choices; internal state deltas are hidden.  
- `batch_generation`: run without user approval until a validation failure or configured checkpoint.

Modify page-cycle “Mandatory LLM Roles”:

In `interactive_runtime`, only parser / proposer / renderer roles are mandatory. Critic roles run on validation failure, high-risk mystery interaction, high contradiction risk, or explicit audit mode.

In `authoring`, all listed critics run.

This will make the system usable.

---

# **20. Replace the current content-policy block**

## **Problem**

The prompt policy says, in effect, “no restrictions” and instructs the model not to self-censor. That is not a reliable production strategy. It can conflict with provider policies, make outputs inconsistent, and create avoidable failures.

This is not a moral objection. It is an implementation risk.

## **Modify**

In all five documents, replace the current content policy block with a mature-fiction policy that is compatible with actual model/runtime constraints.

### **Replacement**

<content_policy>  
RATING: Adults-only mature fiction.

The story may contain mature themes, strong language, sexuality, violence,  
psychological darkness, taboo subjects, and morally difficult character behavior  
when appropriate to the user's selected genre, tone, and branch state.

The generation system must:  
- obey applicable platform, legal, and safety constraints;  
- respect the story's configured content_intensity;  
- avoid abrupt intensity jumps unless caused by explicit user choice or state pressure;  
- distinguish depiction from endorsement;  
- preserve character authenticity without using safety policy language inside the fiction;  
- route disallowed or unsupported requests through in-world impossibility, fade-out,  
 abstraction, or user-facing refusal as appropriate.  
</content_policy>

Then keep `content_intensity` as a routing tag, which is a good idea.

---

# **21. Fix the “seven ledgers” mismatch**

## **Problem**

The bootstrap says “seven causal-engine ledgers,” but the bundle includes entities, facts, events, obligations, threads, intentions, storylets, pages, and choices — already more than seven.

After adding consequences, relationships, branches, objects, locations, and artifacts, the number will grow further.

## **Modify**

Replace:

the seven causal-engine ledgers

with:

the causal-engine ledgers

Do not promise a number. The architecture is ledger-based, not seven-ledger-based.

---

# **22. Add closure detection without acts**

## **Problem**

Without an act spine, you still need a way to know when a branch can end, pause, or continue open-ended. The current governor manages pacing pressure, but it does not define “this branch has reached a satisfying stopping state.”

## **Add**

In `branching-story-page-cycle.md`, after Phase 6 Narrative Governor:

### Closure Readiness Detection

Closure readiness is not an act milestone. It is derived from state.

A branch becomes closure-ready when:  
- no required-closure OBL remains open, OR all remaining required OBLs have explicit abandonment/tragic-loss acknowledgment routes;  
- no high-urgency CNSQ remains pending;  
- at least one major THR is resolved, failed, transformed, or deliberately left open;  
- character intention changes caused by recent events have been acknowledged;  
- contradiction risk is below threshold.

When closure-ready, Phase 8 should include at least one branch-ending or branch-pausing choice, alongside continuation choices if the story remains open-ended.

This gives stories shape without imposing acts.

---

# **Pipeline-by-pipeline summary**

## **`branching-story-bootstrap.md`**

Keep:

* Replacing act-spine with causal-promise design.  
* Initial STINTs.  
* Initial obligations with multiple payoff modes.  
* Seed storylet diversity.  
* Mystery/invariant firewall.

Change:

* Add canon baseline.  
* Add explicit SF schema.  
* Add relationship/consequence/object/location/artifact directories.  
* Stop saying “seven ledgers.”  
* Replace “halt and ask user to sharpen” with “auto-propose 3 candidate designing principles, then ask user to choose or edit” for better UX.  
* Rename act-like storylet concepts.

## **`branching-story-page-cycle.md`**

Keep:

* Page as transaction.  
* Fork from any parent page.  
* Append-only records.  
* Branch-path visibility.  
* Weighted top-K storylet selection.  
* Write-in routing.  
* No sibling branch reads.

Change:

* Add state hash, event op schema, predicate DSL.  
* Add consequence ledger persistence.  
* Add recursive reference-closure validation.  
* Add canon pinning.  
* Add choice contracts.  
* Add terminal branches.  
* Add relationship/object/location state.  
* Change mystery promotion handoff into apparent / branch-local / canon-candidate resolution.  
* Make approval gates mode-dependent.

## **`storylet-pool-authoring.md`**

Keep:

* Storylets as structured state transactions.  
* Mystery safety declarations.  
* Diversity audit.  
* Audit-mode remediation.

Change:

* Add explicit storylet visibility scope.  
* Forbid global storylets from referencing branch-local records.  
* Add predicate DSL.  
* Rename act-like focus areas.  
* Add batch-level branch-contamination audit.  
* Make audit-mode branch-local storylets inherit `target_branch` visibility from RSP cards.

## **`branching-story-health-audit.md`**

Keep:

* Read-only design.  
* Snapshot replay equality.  
* Branch isolation errors.  
* RSP remediation cards.  
* No automatic mutation.

Change:

* Upgrade branch isolation to recursive reference closure.  
* Add canon-baseline drift checks.  
* Add consequence-ledger coverage.  
* Add relationship continuity checks.  
* Add storylet-scope leakage checks.  
* Add terminal-branch health classification.

## **`story-fact-promotion-to-canon.md`**

Keep:

* Promotion as the only world-canon mutation path.  
* Explicit user approval.  
* Provenance.  
* Scope inflation check.  
* Downstream contradiction scan.  
* No deletion of story-local facts.

Change:

* Promotion must not silently update existing branch snapshots.  
* Add canon-sync policy.  
* Add `source_stent_id` instead of ambiguous `source_char_id`.  
* Define DA records or remove artifact canonization.  
* Allow branch-local/apparent mystery resolutions without promotion, while still forbidding authoritative resolution of forbidden mysteries.

---

# **Bottom line**

The architecture is promising because it treats branching fiction as **stateful causal accumulation**, not as a prewritten plot tree. That is exactly the right move.

The dangerous parts are not the absence of acts. The dangerous parts are:

* world canon drifting into old branches,  
* branch-local remediation storylets becoming global,  
* facts/beliefs/rumors collapsing into one truth table,  
* consequences being analyzed but not persisted,  
* “mystery resolution” being forced into canon promotion too early,  
* and validators checking only top-level record provenance instead of recursive references.

Fix those, and the system becomes much closer to what you actually want: a branching story engine where every branch remembers only what happened on that branch, where promises can mutate instead of forcing plot beats, and where story shape emerges from obligations, consequences, pressure, and character intention rather than from an act spine.

