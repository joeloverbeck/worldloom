# **Executive verdict**

Worldloom does **not** appear to be missing another major first-class active story-state record after `STPLAN` and `STEMO`.

The ontology is now structurally complete enough for causal branching fiction: it has branch-local truth, beliefs, events, statuses, intentions, tactical plans, affective pressure, obligations, consequences, threads, clocks, secrets, story questions, relationships, locations, objects, diegetic artifacts, pages, choices, branches, and storylets. The original missing active-state gap identified by the first audit—medium-range actor agency and causal emotion—has been addressed by `STPLAN` and `STEMO`. The earlier report explicitly recommended those two records and rejected first-class records for scene, conflict, dramatic irony, reader expectation, social reputation, resources, theme, motif, pacing, clue, quest, and act/beat structure; that baseline has now mostly landed.

The current problem is **not ontology absence**. It is **integration unevenness**:

1. `STPLAN` and `STEMO` are real first-class records in schemas, validators, world-index, MCP summaries, patch-engine create ops, bootstrap, turn-cycle, prose-attach, health-audit, promotion, and closeout.  
2. They are still not consistently represented in `PG.state_snapshot.active_records` documentation / JSON schema.  
3. `CHC.grounded_in.records[]` still omits `STPLAN` and `STEMO`, even though bootstrap says choices should cite them when choices depend on them.  
4. MCP summaries are present but too shallow for page-plan rendering.  
5. World-index edge extraction is good at core references but misses some fallback, success-condition, and derived-from plan edges.  
6. Health-audit and prose-attach know about plans/emotions, but their checks depend on page-plan §9b/§9c being present and sufficiently detailed.  
7. Several validators have surgical holes around active lifecycle, appraisal/plan basis, contradictory stacks, stale active records, and page-plan under-rendering.

My strongest recommendation: **stop adding active record classes for now**. Make this likely the final missing-structures audit unless sample-story evaluation reveals a recurrent active branch-local state that cannot be owned by the current set.

Future work should shift to:

* implementation hardening;  
* validator tightening;  
* MCP/index completeness;  
* page-plan rendering completeness;  
* prose-attach receipts;  
* health-audit depth;  
* sample-story evaluation;  
* prose-quality tuning.

The one caveat: Worldloom should add several **non-state projections/render packets**, not active records. The most important are present-causal situation, dramatic-irony / information-asymmetry, reader setup/payoff pressure, social/public-belief pressure, resource/access/leverage constraints, and branch possibility-space. These should be derived from existing records and rendered into page plans, not stored as new active state.

# **Repository architecture map**

## **Current active record classes**

The current story ontology is materially broad. The shared contract defines story-state authority, append-only/supersession doctrine, branch isolation, page snapshots, and schema minimalism; its active-record inventory now includes `STPLAN` and `STEMO` alongside the existing story-state classes.

| Class | Current ownership |
| ----- | ----- |
| `STENT` | Story-local entity mirror or story-only entity. |
| `STSTAT` | Entity life, agency, availability, and location status. |
| `STINT` | Actor-held intention / desire / active goal. |
| `STPLAN` | Actor-held tactical plan: current objective, belief/resource basis, blockers, current step, fallback, status. |
| `STEMO` | Actor-held causal affective pressure: appraisal, trigger, intensity, orientation, behavioral pressure, agency effect. |
| `SF` | Branch-local fact with authority/provenance. |
| `BEL` | Actor/group/public/narrator belief, visibility, access route, truth relation, consequences. |
| `SE` | Story event / causal tick: input, route, selected commitment block, rationale, state delta, promotion claims. |
| `OBL` | Obligation, duty, promise, debt, social/moral/legal pressure. |
| `CNSQ` | Pending or fired consequence/fallout. |
| `THR` | Qualitative ongoing thread/concern. |
| `CLK` | Quantified staged pressure clock. |
| `STSEC` | Story-local secret / hidden truth with clue carriers and reveal lifecycle. |
| `STQ` | Open setup, story question, promise/payoff/revelation lifecycle. |
| `SREL` | Objective relationship state between story entities. |
| `STLOC` | Story-local location state and affordances. |
| `STOBJ` | Story-local object state. |
| `DA` | Story-local diegetic artifact. |
| `BR` | Branch record. |
| `PG` | Page snapshot, page input, active records, emitted choices, plan hash, validation trace. |
| `CHC` | Choice record. |
| `SLT` | Storylet / commitment block: causal move with predicates, beats, effects, exits. |

The shared record schemas include `STPLAN` and `STEMO`, and the predicate DSL includes plan/emotion predicates such as `plan_active`, `plan_blocked`, `any_plan_active`, `emotion_active`, `any_emotion_active`, and `emotion_pressure`.

## **Current embedded concepts**

Several tempting “new structures” are already represented as embedded fields or derived relationships:

| Concept | Current owner |
| ----- | ----- |
| Actor knowledge / ignorance | `BEL`, `BEL.basis`, observer firewall, `DA`/`STOBJ`/`STLOC` access. |
| Dramatic irony | Difference between `BEL`, `STSEC`, `STQ`, page POV, and audience visibility. |
| Reader setup/payoff | `STQ`, `STSEC.clue_carriers`, `CLK`, page-plan §10b. |
| Social pressure | `BEL.visibility`, `SREL`, `OBL`, `CNSQ`, `STSTAT`, `DA.circulation`. |
| Tactical agency | `STINT` + `STPLAN` + `SLT` + `SE.state_relations`. |
| Emotional causality | `STEMO` + `BEL.appraisal_basis` + `SREL` + `STSTAT`. |
| Branch divergence | `BR`, `PG.parent_page_id`, `PG.state_snapshot`, `SF.authority`, branch isolation. |
| Mystery/clue interpretation | `STSEC`, `BEL`, `STQ`, `DA`, `SF.authority`. |
| Access / legitimacy / permission | `STLOC`, `STOBJ`, `STSTAT`, `SREL`, `OBL`, `BEL`, `CF/INV` grounding. |
| Resource/leverage constraints | `STOBJ`, `DA`, `SREL`, `OBL`, `CNSQ`, `CLK`, `STPLAN.resource_basis`. |
| Offscreen pressure | `SE`, `CLK`, `THR`, `BEL` witness propagation, `STSTAT`. |

These do not need new active records. They need better **derived packets, validators, and page-plan rendering**.

## **Non-state direct-write artifacts**

Worldloom correctly separates active state from authoring/audit/render artifacts:

| Artifact | Role |
| ----- | ----- |
| `STORY_KERNEL.md` | Story identity, agency contract, cast bindings, opening contract. |
| `pages-prose-plans/PG-<N>.md` | Prose-render authority; the prose renderer’s self-contained contract. |
| `pages-prose/PG-<N>.md` | User/external supplied rendered prose. |
| `pages-prose-receipts/PG-<N>.yaml` | Prose attach validation receipt. |
| `audits/SAU-*` | Health-audit reports. |
| `remediation-storylet-proposals/RSP-*` | Audit-to-storylet repair requests. |
| `story-promotions/SP-*` | Story-to-canon promotion package and ledgers. |
| `storylet-batches/SLB-*` | Commitment-block batch manifests. |
| `INDEX.md` files | Human/machine navigation surfaces. |

This boundary is sound. The new proposals below keep active state append-only and push derived synthesis into packets/plans/audits.

## **Story-skill responsibilities**

The skill layer now recognizes `STPLAN` and `STEMO` across the main story lifecycle.

`branching-story-bootstrap` can seed optional `STPLAN` and `STEMO` records only when load-bearing at story start, includes them in `SE-1.state_delta`, `PG-1.state_snapshot.active_records`, `CHC.grounded_in.records[]` when choices depend on them, and renders them in page-plan §9b/§9c. That is the right anti-bloat posture.

`branching-story-turn-cycle` creates/supersedes `STPLAN` when tactical agency changes and `STEMO` when affective pressure changes; it also requires page-plan §9b/§9c when relevant and uses `SE.state_relations[]` to record how events engage active plans.

`branching-story-prose-attach` validates plan/emotion rendering through `state_relation_undisclosed` and `affective_transition_undisclosed` subchecks inside `required_event_rendered`.

`branching-story-health-audit` has a dedicated Phase 2k for `STPLAN`/`STEMO` health: bootstrap drift, stale active plans, stale active emotions, and `SE.state_relations[]` consistency.

`commitment-block-authoring` includes plan/emotion predicates but correctly refuses to add a separate “plan/emotion move family.” Plans and emotions inform causal moves; they are not a new storylet taxonomy.

`story-fact-promotion-to-canon` treats `STPLAN` and `STEMO` as evidence context only, not promotion source classes. That is correct: tactical plans and transient affective states rarely promote directly to world canon.

`story-promotion-closeout` can supersede active `STPLAN` or `STEMO` if a canon verdict invalidates their basis. This is a strong integration point and should be preserved.

## **MCP/context-packet support**

The machine-facing layer is explicitly meant to reduce raw file reading and expose compact context packets.

The context-packet contract now includes `active_actor_plans` and `active_emotional_states`, but the documented summary fields are shallow: active plans include id, holder, root intention, objective, status, and current step action family; active emotions include id, holder, status, affect kind, intensity, behavioral pressure, and agency effect.

The implementation matches that shallow summary. `buildActiveActorPlans` omits belief basis, resource basis, blockers, current-step targets, fallback steps, and success-condition predicates; `buildActiveEmotionalStates` omits trigger event, appraisal basis, orientation, and expiry.

That is enough for “something exists,” but not enough for turn-cycle and page-plan rendering. Skills still need targeted record reads to understand why a plan/emotion matters.

## **World-index support**

World-index recognizes `plans` and `emotions` story directories and maps them to `story_plan_record` and `story_emotion_record`.

It extracts important `STPLAN` and `STEMO` edges:

* `plan_holder`;  
* `plan_root_intention`;  
* `plan_belief_basis`;  
* `plan_resource_basis`;  
* `plan_blocker`;  
* `plan_current_step_target`;  
* `plan_created_by_event`;  
* `plan_supersedes`;  
* `emotion_holder`;  
* `emotion_trigger_event`;  
* `emotion_appraisal_basis`;  
* `emotion_oriented_toward`;  
* `emotion_supersedes`;  
* `emotion_derived_from`.

This is a solid landing. The missing edge support is narrower: `STPLAN.fallback_steps`, fallback trigger predicates, current-step success-condition predicate references, `STPLAN.derived_from`, and possibly enum/facet indexing for `plan_status`, `behavioral_pressure`, `affect_kind`, and `agency_effect`.

## **Patch-engine operation vocabulary**

Patch-engine support exists for `create_stplan_record` and `create_stemo_record`, including ID patterns, target directories, operation specs, and allocation keys.

`describe-envelope-schema` also exposes `stplan_ids`, `stemo_ids`, `story_plan_record`, `story_emotion_record`, `create_stplan_record`, and `create_stemo_record`.

No dedicated `supersede_stplan_record` or `supersede_stemo_record` op exists. That is acceptable because turn-cycle explicitly states that most supersessions are ordinary create ops with `supersedes:` in the YAML body, while only `CLK`/`STSEC`/`STQ` have named supersede ops.

The risk is discoverability, not capability.

## **Source mismatches found**

The important mismatches are:

1. **`PG.state_snapshot.active_records` schema/docs omit `STPLAN` and `STEMO`.** The shared prose schema excerpt lists many active-record keys but stops at `STQ`; `STPLAN`/`STEMO` are missing there. The JSON page schema likewise has active-record class properties but no `STPLAN`/`STEMO` keys, with `additionalProperties: true` masking the omission.  
2. **Replay knows about them anyway.** `ACTIVE_RECORDS_CLASSES` includes `STPLAN` and `STEMO`, so replay/integrity helpers are ahead of the page schema.  
3. **Inactive active-record detection lags.** `state-snapshot-integrity` contains inactive-record checking that explicitly recognizes only `CLK|STSEC|STQ`, not `STPLAN|STEMO`.  
4. **`CHC.grounded_in.records[]` omits `STPLAN` and `STEMO`.** The shared CHC schema allows several classes but not plans/emotions, despite bootstrap saying choices should cite them when choices depend on them.  
5. **Page-plan Phase 7 reference omits detailed §9b/§9c instructions.** The main turn-cycle skill requires §9b/§9c, but the phase-7 reference only details §10b for clocks/secrets/questions.  
6. **`STEMO` agency-effect compatibility appears to have a field-name bug.** The helper checks story status records through `parsed.holder`, while `STSTAT` ownership is by entity, not holder.  
7. **`STPLAN` active-shape constraints are not fully aligned.** The JSON schema requires `current_step` always, while the written contract says it is required “when active”; meanwhile `belief_basis` is required but not enforced as non-empty for active plans.

# **STPLAN/STEMO integration audit**

## **STPLAN verdict**

`STPLAN` is conceptually sound. It does not duplicate `STINT`; it fills the gap between “what the actor wants” and “what tactical agency they are currently exercising.” The record is actor-owned, branch-local, current-state, and append-only. It avoids becoming an authorial future plot because its fields are grounded in current intention, belief basis, resources, blockers, current step, fallback steps, and status.

## **STPLAN integration strengths**

`STPLAN` is integrated in:

* shared inventory and predicate DSL;  
* record schema;  
* JSON validator schema;  
* dedicated validators for holder, root intention, belief basis, resource basis, blockers, current-step targets, no future page IDs, supersession chain, closure events, and event-plan relation consistency;  
* replay helper class inventory;  
* world-index directory mapping and edge extraction;  
* MCP context-packet summaries;  
* patch-engine create ops and envelope schema;  
* bootstrap, turn-cycle, prose-attach, health-audit, promotion, and closeout skills.

## **STPLAN gaps**

The gaps are implementation/support gaps, not proof that `STPLAN` is wrong.

| Area | Finding | Recommendation |
| ----- | ----- | ----- |
| PG schema | `PG.state_snapshot.active_records` docs and JSON schema omit `STPLAN`. | Add `STPLAN: [STPLAN-*]` as a current-contract key; treat omission as compatibility-only for old pages. |
| Active lifecycle | Inactive active-record detection only names `CLK | STSEC |
| CHC grounding | Choices cannot directly cite `STPLAN` under current CHC schema. | Add `STPLAN` to `CHC.grounded_in.records[]`. |
| MCP summary | Active plan summary omits belief/resource basis, blockers, targets, fallback, success condition. | Add detailed plan projection or targeted helper. |
| World-index | Fallback steps, fallback trigger predicates, success-condition predicate refs, and `derived_from` are not extracted. | Add these as edges or predicate-reference projections. |
| Validators | `belief_basis[]` is not enforced non-empty for active plans. | Require active/blocked/suspended plans to have at least one accessible belief basis unless explicitly `dissociated` equivalent does not exist for plans. |
| Validators | `current_step` required always in JSON but contract says when active. | Align status-conditioned requirements: active/blocked/suspended/revised need current_step; fulfilled/failed/abandoned may not. |
| Validators | `SE.state_relations[]` consistency mainly covers `advances`, with closure-adjacent checks elsewhere. | Validate `tests`, `blocks`, `revises`, `fulfills`, `abandons`, and `ignores` more deterministically. |
| Health audit | Lacks contradictory same-holder plan cluster and long-blocked-plan checks. | Add plan conflict / plan starvation / blocker-no-action checks. |
| Page plan | §9b exists in main contract/skill but not detailed in phase-7 reference. | Amend phase-7 reference with §9b requirements. |

## **STPLAN boundary concerns**

`STPLAN` should remain bounded this way:

* `STINT`: desire/goal.  
* `STPLAN`: current tactic for pursuing an intention.  
* `SLT`: reusable causal move template.  
* `SE`: the actual event/tick that happened.  
* `CHC`: player-facing option grounded in state.  
* `BEL`: belief basis, not the plan itself.  
* `OBL/CNSQ/THR/CLK`: pressures the plan may respond to.  
* `STSEC/STQ`: hidden/setup structures the plan may investigate or reveal.

Do **not** add multi-actor plan as a separate record. Use multiple `STPLAN` records plus `SREL`, `OBL`, `THR`, `SLT`, and a derived MCP “plan cluster” projection.

Do **not** add “strategy,” “scheme,” “quest,” or “mission” records. They are either `STPLAN`, `OBL`, `THR`, `CLK`, or `SLT`.

## **STEMO verdict**

`STEMO` is also conceptually sound. It does not duplicate `SREL` or `BEL`; it captures transient causal affective pressure that can constrain, redirect, or color action. `SREL` says something objective about a relationship; `BEL` says what someone believes/appraises; `STEMO` says what that appraisal is doing affectively and behaviorally now.

## **STEMO integration strengths**

`STEMO` is integrated in:

* shared inventory and predicate DSL;  
* shared schema and JSON schema;  
* validators for holder, trigger event, appraisal basis accessibility, orientation records, supersession lifecycle, and agency-effect compatibility;  
* replay helper class inventory;  
* world-index directory mapping and edge extraction;  
* MCP summaries;  
* patch-engine create ops and envelope schema;  
* bootstrap, turn-cycle, prose-attach, health-audit, promotion, and closeout.

## **STEMO gaps**

| Area | Finding | Recommendation |
| ----- | ----- | ----- |
| PG schema | `PG.state_snapshot.active_records` docs and JSON schema omit `STEMO`. | Add `STEMO: [STEMO-*]` as current-contract active-record key. |
| Active lifecycle | Inactive active-record detection omits terminal/settled/transformed emotion states. | Add lifecycle-aware active-record checks. |
| CHC grounding | Choices cannot cite `STEMO` even when an option exists because of affective pressure. | Add `STEMO` to `CHC.grounded_in.records[]`. |
| MCP summary | Active emotion summary omits trigger event, appraisal basis, orientation, expiry. | Add detailed emotion projection or targeted helper. |
| Validator bug | Agency-effect helper appears to read `STSTAT.holder`; status records use entity ownership. | Fix to read `STSTAT.entity` / active entity status. |
| Orientation | `orientation.toward_records[]` validator checks existence but not active status or accessibility. | Strengthen to active/accessible where applicable; allow inaccessible only when orientation is toward a known false/imagined object through `BEL`. |
| Emotion stacks | No deterministic check for contradictory same-holder emotion overload. | Health-audit cluster check: repeated high-intensity or contradictory emotions must be justified by appraisal basis. |
| Suppression/masking | `status: suppressed` exists but prose/page-plan checks are thin. | Page plan §9c should specify observable surface vs hidden affect; prose-attach should warn if suppressed affect is rendered as openly expressed. |
| Repetition | Health audit checks stale high-intensity emotions, but not repetitive affective beats. | Add repetitive-emotion rendering warnings. |

## **STEMO boundary concerns**

`STEMO` should remain bounded this way:

* `BEL`: appraisal belief and access route.  
* `SREL`: objective relationship axis.  
* `STEMO`: transient affective pressure arising from appraisal.  
* `STSTAT`: physical/agency/location condition.  
* `STINT`: desired goal.  
* `STPLAN`: tactical response.  
* prose tone: render surface, not state.

Do **not** add “mood board,” “tone,” “arc,” or “emotional beat” records. Those are prose-plan/craft concerns.

# **Research synthesis**

Interactive fiction tools such as Ink and ChoiceScript rely heavily on choices, branching, variables, conditionals, labels/knots, and state checks rather than on fixed act-structure records. Ink’s documentation foregrounds knots, diverts, choices, conditional content, and variables; ChoiceScript likewise shows choice blocks, labels/gotos, and variables/stats as the machinery that makes earlier decisions affect later story. This supports Worldloom’s present-causal state approach and argues against adding act/midpoint/climax machinery.

Storylet practice also supports Worldloom’s `SLT` design. Emily Short defines storylets as content with prerequisites and effects on world state, and notes that storylet systems can avoid pure branching combinatorial explosion while interlocking with other narrative circumstances. This maps closely to Worldloom’s predicate-gated `SLT` records and argues for stronger predicates/projections, not new “scene” or “plot beat” records.

Prom Week is a useful precedent for social simulation: its own project page describes it as a social simulation game using the Comme il Faut social AI system to combine Sims-like dynamic simulation with story-driven characters and dialogue. For Worldloom, the lesson is that social causality needs explicit beliefs, relationships, statuses, intentions, plans, and emotions; it does not imply a separate monolithic “social reputation” record.

Computational emotion work supports the `STEMO` design. Recent appraisal-model work connects emotion to goal relevance, goal conduciveness, power, and interactive task events; that aligns with `STEMO` as causal appraisal pressure grounded in beliefs and events, not a prose-tone field.

Investigation-game practice supports clue accessibility and interpretation over hidden single-point failure. The GUMSHOE system is designed around making investigative play about interpreting clues rather than merely finding them; that supports Worldloom’s `STSEC.clue_carriers`, `BEL` interpretation, `DA` evidence, and `STQ` payoff model over a new separate `STCLUE` active record.

Progress-clock practice supports `CLK` as staged pressure rather than plot rail. Progress clocks track ongoing events such as approaching enemies, challenge progress, or time-limited windows by filling segments toward an outcome; Worldloom already has the right first-class pressure record and should strengthen lifecycle/rendering rather than add fronts/acts/doom scripts.

# **Candidate structure inventory**

| Candidate | Classification | Decision |
| ----- | ----- | ----- |
| New active record: `STSCENE` | Active record | Reject. Page/SE/SLT/page-plan already own scene execution; scene is render unit, not branch-local state. |
| New active record: `STCONFLICT` | Active record | Reject. Conflict is derived from incompatible `STINT`, `STPLAN`, `SREL`, `OBL`, `CNSQ`, `THR`, `CLK`. |
| New active record: `STCLUE` | Active record | Reject for now. `STSEC.clue_carriers`, `DA`, `BEL`, `STQ` own this. |
| New active record: `STREP` / reputation | Active record | Reject. Use `BEL.visibility`, `SREL`, `OBL`, `CNSQ`, public/factional holders, and social-pressure projection. |
| New active record: `STRES` / resource | Active record | Reject. Use `STOBJ`, `DA`, `STLOC`, `SREL`, `OBL`, `CNSQ`, `CLK`, `STPLAN.resource_basis`. |
| New active record: `STACCESS` / permission | Active record | Reject. Use `STLOC/STOBJ` affordances, `STSTAT`, `SREL`, `OBL`, `BEL`, `CF/INV`. |
| New active record: `STNEG` / conversation state | Active record | Reject. Long negotiation is `THR` + `SREL` + `BEL` + `OBL` + `STPLAN` + `SLT`. |
| New active record: `STPROC` / ritual/legal procedure | Active record | Reject. Use `SLT.move_family: ritual_protocol`, `OBL`, `CLK`, `STQ`, `CF/INV`. |
| New active record: `STMETA` / theme/motif | Active record | Reject. Prose-plan/craft/audit only. |
| New active record: `STIRONY` | Active record | Reject. Dramatic irony is derived from `BEL`, `STSEC`, `STQ`, audience visibility, page POV. |
| New active record: `STPAYOFF` | Active record | Reject. `STQ` owns setup/payoff; page-plan needs better rendering. |
| New active record: group affect | Active record | Reject. Use multiple `STEMO` plus public/factional `BEL` and social-pressure projection. |
| Multi-actor coordinated plan | Embedded/projection | Sharpen existing: multiple `STPLAN`s plus plan-cluster MCP projection. |
| Competing plans same holder | Audit concept | Add health-audit contradiction/starvation checks. |
| Masked/suppressed emotion | Existing structure | Sharpen `STEMO.status: suppressed` and page-plan §9c. |
| Public belief cascade | Projection/audit | Add public-belief/social-pressure projection; no active record. |
| Unreliable narrator/viewpoint distortion | Page-plan/MCP | Add information-asymmetry packet; no active record. |
| Audience-known, character-unknown truth | Page-plan/MCP | Add dramatic-irony render packet. |
| Factional norms/sanctions | Existing structures | Use `CF/INV`, `OBL`, `SREL`, `BEL`, `CNSQ`, `CLK`. |
| Material scarcity/leverage | Projection | Add resource/leverage render packet from existing records. |
| Investigative clue interpretation | Existing structures | Sharpen `STSEC`/`BEL`/`DA`/`STQ` rendering. |
| Deferred/aborted payoffs | Existing structure | Sharpen `STQ` lifecycle and health-audit. |
| Branch-local contradiction compatibility | Existing structure | `SF.authority`, branch isolation, promotion/closeout. |
| Offscreen actor action | Existing structure | `SE`, `CLK`, `THR`, `BEL` witness propagation. |
| Recovery/aftermath | SLT/audit/page-plan | Keep as `SLT.move_family: recovery`, not record. |
| Trust repair/apology | Existing structures | `SREL`, `BEL`, `OBL`, `STEMO`, `SLT`. |
| Secret-keeping/deception maintenance | Existing structures | `STSEC`, `BEL`, `STPLAN`, `DA`, observer firewall. |
| Memory/misremembering/witness testimony | Existing structures | `BEL`, `DA`, `STSEC`, `SREL`; maybe page-plan projection. |
| Identity ambiguity | Existing structures | `STSEC`, `BEL`, `STENT` identity mirror, `SREL`. |
| Present-causal situation packet | MCP/page-plan | Accept as non-state projection. |
| Dramatic-irony packet | MCP/page-plan | Accept as non-state projection. |
| Social-pressure/public-belief packet | MCP/page-plan/audit | Accept as non-state projection. |
| Branch possibility-space packet | MCP/audit/page-plan | Accept as non-state projection. |
| Plan/emotion detailed context packet | MCP | Accept as support improvement. |
| CHC grounding expansion | Schema/support | Accept. |
| PG active-record schema alignment | Schema/validator | Accept. |

# **Accepted recommendations**

## **1. No new active story-state record now**

**Classification:** negative active-record recommendation / final ontology verdict.

**Story problem solved:** prevents ontology bloat and focuses implementation effort on making the existing causal state actually usable.

**Why existing structures are sufficient:** the major missing active-state gaps—medium-range tactical agency and causal affective state—are now owned by `STPLAN` and `STEMO`. Remaining candidates are either derived views, page-plan requirements, audit concepts, or combinations of existing records.

**Lifecycle:** none.

**Bootstrap use:** seed existing records only when load-bearing; avoid over-seeding.

**Turn-cycle use:** create/supersede existing records when state changes; add derived page-plan sections.

**Prose-attach use:** validate rendering of derived packets and active state.

**Health-audit use:** detect stale, contradictory, overgrown, unrendered, or unsupported existing state.

**MCP/context-packet requirements:** stronger projections.

**World-index requirements:** fuller edges for current records.

**Validator requirements:** tighten gaps listed in this proposal.

**Risks:** the main risk is under-modeling if future sample stories reveal a recurrent state that truly cannot be owned by existing records. That should be evidence-driven, not ontology-driven.

## **2. Align `PG.state_snapshot.active_records` with `STPLAN` and `STEMO`**

**Classification:** schema/validator correction.

**Problem solved:** current contracts/skills/replay know `STPLAN`/`STEMO` are active records, but page schema/docs lag. That can lead to snapshots that omit them, prose plans that omit them, and validators that fail to police them.

**Existing insufficiency:** replay helper includes both classes, but shared PG schema docs and JSON page schema do not.

**Structural shape:** `PG.state_snapshot.active_records` should include:

* `STPLAN: [STPLAN-*]`;  
* `STEMO: [STEMO-*]`.

**Lifecycle:** every create/supersession/closure must replay into the active-record map.

**Validators:** make omission a current-contract failure, not a warning, while retaining compatibility mode for old pages.

**Blast radius:** shared schema docs, JSON schema, snapshot integrity, active-records full-shape, replay equality, context packet builders, fixtures, tests.

## **3. Expand `CHC.grounded_in.records[]`**

**Classification:** schema/support correction.

**Problem solved:** choices cannot cite the active state that actually makes them available or salient.

**Why existing structures are insufficient:** `CHC.grounded_in.records[]` omits `STPLAN` and `STEMO`; it also omits several already-important SPEC-42 records (`CLK`, `STSEC`, `STQ`) and `STINT`, even though choices are often grounded in active clocks, secrets, open setups, intentions, plans, and emotions.

**Recommended allowed classes:** add at least:

* `STPLAN`;  
* `STEMO`;  
* `CLK`;  
* `STSEC`;  
* `STQ`;  
* `STINT`;  
* possibly `SF` when a choice rests on a branch-local fact rather than a belief.

**Lifecycle:** no new lifecycle; choices cite records active at the emitting page.

**Turn-cycle use:** generated choices must cite plan/emotion/setup/clock/secret state when materially grounding the option.

**Prose-attach use:** choice consequence visibility can check whether the prose makes choice-relevant plan/emotion pressure legible.

**Validators:** `choice_state_reference_dangling`, observer firewall, and choice consequence integrity should include these classes.

**Risk:** longer `grounded_in.records[]`. Mitigate with “only cite records that materially alter availability, salience, or consequence.”

## **4. Add detailed `STPLAN` / `STEMO` MCP projections**

**Classification:** MCP/context-packet support.

**Problem solved:** current MCP summaries prove existence but do not give enough detail for turn-cycle/page-plan decisions.

**Structural shape:**

`active_actor_plan_details` should include:

* id;  
* holder;  
* objective;  
* plan_status;  
* root_intention;  
* current_step action family;  
* current_step target records;  
* success-condition predicate references;  
* belief basis summary;  
* resource basis summary;  
* blockers;  
* fallback step labels/triggers;  
* expires_when;  
* created/superseded lineage.

`active_emotional_state_details` should include:

* id;  
* holder;  
* status;  
* affect_kind;  
* intensity;  
* trigger_event;  
* appraisal_basis summary;  
* orientation targets;  
* behavioral_pressure;  
* agency_effect;  
* observable surface vs hidden/suppressed posture;  
* expires_when;  
* supersession lineage.

**Existing insufficiency:** context packet currently omits those details.

**Page-plan rendering:** §9b/§9c should consume these details directly.

**Risk:** token bloat. Mitigate with compact summaries and only include records active/relevant to the page’s cast, location, selected event, emitted choices, or open debts.

## **5. Add derived render packets, not records**

**Classification:** non-state MCP/page-plan projection.

**Accepted packets:**

1. `present_causal_situation_packet`;  
2. `dramatic_irony_packet`;  
3. `reader_setup_payoff_packet`;  
4. `social_pressure_packet`;  
5. `resource_access_leverage_packet`;  
6. `branch_possibility_space_packet`.

**Story problem solved:** these are the things prose renderers need but should not become branch-local state.

**Why existing records are insufficient by themselves:** the information is distributed across many records. The page-plan writer needs a compact synthesis.

**Lifecycle:** derived per page/turn; never stored as active `_source` state.

**Validators:** validate packet consistency against records where deterministic; use health-audit/prose-audit for judgment-based quality.

**Risk:** projections becoming parallel state. Mitigate by requiring every packet item to cite source records and forbidding independent facts.

# **Sharpen-existing recommendations**

## **STPLAN**

Sharpen `STPLAN` without adding new fields unless absolutely necessary.

Required changes:

* enforce non-empty `belief_basis[]` for active/blocked/suspended plans;  
* align `current_step` requirement with status;  
* validate fallback step trigger predicates and target records;  
* validate `current_step.success_condition.predicates[]` references;  
* extract `derived_from` and fallback/success edges;  
* add contradictory-plan and plan-starvation health checks;  
* require §9b rendering when active plans affect the event, choices, or prose interpretation.

Do **not** add `coordination_group`, `risk_posture`, `authorial_arc`, or `future_beats`.

## **STEMO**

Sharpen `STEMO` around causality, suppression, and accessibility.

Required changes:

* fix `agency_effect` compatibility helper to read active `STSTAT.entity`;  
* strengthen orientation target checks;  
* detect stale high-intensity emotions and repetitive same-pressure rendering;  
* detect contradictory same-holder emotion clusters;  
* distinguish suppressed affect’s internal pressure from observable surface in §9c;  
* include appraisal/trigger/orientation in MCP summaries.

Do **not** add elaborate emotion taxonomies, melodrama arcs, or mood boards.

## **STQ**

`STQ` remains the owner of reader-facing setup/payoff. Strengthen:

* page-plan §10b should say what the reader has been promised, what this page must echo/pay off/complicate/withhold, and what choices are grounded in it;  
* health-audit should flag deferred/aborted payoffs not named in terminal rationale;  
* prose-attach should warn when a page that pays off an `STQ` buries the payoff.

## **BEL / SREL**

Use these for public belief, reputation, social norms, trust repair, apology, and witness state. Add:

* public/factional belief projection;  
* social-pressure page-plan packet;  
* health checks for public consequence without witness/evidence;  
* validation that public/factional `BEL` changes have an access route.

## **SLT**

Keep `SLT` as causal move, not plot unit. Expand support:

* allow plan/emotion/setup/clock/secret predicates and bindings to drive author-pool selection;  
* add coverage checks for plan-aware and emotion-aware blocks only when such records exist;  
* never add “plan/emotion” as a separate move family.

## **PG/page plans**

Page plans need stronger sections, not new state. See mandatory rendering section below.

# **Non-state support recommendations**

## **Present-causal situation packet**

A compact derived packet for page-plan §7/§9/§10:

* current actors;  
* location and affordances;  
* immediate pressure;  
* opposing intentions/plans;  
* relevant emotions;  
* open obligations/consequences/threads;  
* active clock/secret/question pressure;  
* current leverage/resource/access constraints;  
* what changed this turn.

This packet solves the “what is the scene actually about right now?” problem without creating `STSCENE` or `STCONFLICT`.

## **Dramatic-irony / information-asymmetry packet**

Derived from:

* `BEL` by holder;  
* `STSEC` holders/discoverers/reveal state;  
* `STQ.audience_visibility`;  
* `DA` circulation/readers;  
* page POV and agency contract.

It should say:

* what the reader may know;  
* what the viewpoint character knows;  
* what other actors know;  
* what must not be leaked;  
* what irony/suspense can be rendered.

No active `STIRONY` record.

## **Social-pressure packet**

Derived from:

* public/factional `BEL`;  
* `SREL`;  
* `OBL`;  
* `CNSQ`;  
* `STSTAT`;  
* visible `DA`/`STOBJ`/`STLOC` evidence;  
* relevant `CF/INV`.

It should say:

* who is watching or could learn;  
* what reputation/status/legal/institutional pressure exists;  
* what sanction or reward is plausible;  
* what access route supports public/factional knowledge.

No `STREP` record.

## **Resource/access/leverage packet**

Derived from:

* `STOBJ`;  
* `DA`;  
* `STLOC.affordances`;  
* `STSTAT.agency/location`;  
* `SREL`;  
* `OBL`;  
* `CNSQ`;  
* `CLK`;  
* `STPLAN.resource_basis`.

It should inform choices and prose about what actors can actually do.

No `STRES` or `STACCESS` record.

## **Branch possibility-space packet**

Derived from:

* current leaf `PG`;  
* emitted `CHC`;  
* open `SLT` eligibility;  
* high-salience debts;  
* open clocks/secrets/questions;  
* branch-local facts and promotion holds.

It should help turn-cycle avoid collapsed choices and help health-audit detect unactionable leaves.

No convergence rail.

# **Ontology bloat and overlap audit**

## **STPLAN bloat risk**

`STPLAN` could bloat if authors create one for every desire. That would duplicate `STINT`.

Mitigation:

* create only when the actor has a concrete tactic, belief/resource basis, current step, and blockers/fallbacks;  
* bootstrap should continue optional seeding only when first-page choices or prose depend on it;  
* health-audit bootstrap-drift should flag unused root plans.

## **STEMO bloat risk**

`STEMO` could bloat if authors create one for every mood. That would duplicate prose tone and `SREL`.

Mitigation:

* create only when affect changes choices, actions, interpretation, or agency;  
* require appraisal basis;  
* require behavioral pressure;  
* health-audit should flag repetitive/unrendered/unsupported emotional states.

## **STINT vs STPLAN**

Good boundary:

* `STINT`: “I want / intend X.”  
* `STPLAN`: “I am currently trying Y to get X, because I believe A and have B, but C blocks me.”

No merge recommended.

## **SREL/BEL/STEMO**

Good boundary:

* `SREL`: objective relationship state.  
* `BEL`: perceived/appraised claim.  
* `STEMO`: affective pressure caused by appraisal.

No merge recommended.

## **STQ/STSEC/DA/BEL**

Good boundary:

* `STSEC`: hidden truth and clue carrier lifecycle.  
* `STQ`: reader-facing open setup/question/promise.  
* `DA`: diegetic artifact evidence.  
* `BEL`: who believes/interprets what.

No `STCLUE` recommended.

## **Page-plan verbosity risk**

The page plan is already large. Adding many new sections could drown the prose renderer.

Mitigation:

* use optional sections only when source records are active/relevant;  
* keep sections prose-facing;  
* avoid record-id-heavy text outside machine frontmatter;  
* use compact “render / avoid / source records” bullets.

# **Negative recommendations**

Do **not** add:

* **Act / midpoint / climax / resolution records.** They violate the causal-engine philosophy.  
* **Scene record.** A page/event/page-plan already creates the render unit.  
* **Conflict record.** Conflict is a derived relation among active intentions, plans, obligations, relationships, clocks, and statuses.  
* **Dramatic irony record.** It is a projection of knowledge asymmetry.  
* **Reader expectation record.** `STQ` owns setup/payoff; page plans render it.  
* **Reputation record.** Use public/factional beliefs, relationships, obligations, consequences, and social-pressure projection.  
* **Resource record.** Use objects, artifacts, locations, relationships, obligations, and plan resource basis.  
* **Clue record.** Use `STSEC.clue_carriers`, `DA`, `BEL`, and `STQ`.  
* **Conversation/negotiation record.** Use `THR`, `SREL`, `BEL`, `OBL`, `STPLAN`, and `SLT`.  
* **Procedure record.** Use `SLT.move_family: ritual_protocol`, `OBL`, `CLK`, `STQ`, and canon/invariant grounding.  
* **Theme/motif record.** Prose/audit/craft only.  
* **Group emotion record.** Use multiple `STEMO`s plus public/factional belief/social-pressure projection.  
* **Offscreen action record.** Use `SE`, `CLK`, `THR`, `BEL` propagation, and `STSTAT`.

# **Page-plan rendering implications**

State only helps if the prose renderer receives it. This is currently the most important non-code design gap.

## **Existing section posture**

The turn-cycle says page plans contain 19 numbered sections and optional §9b active actor plans, §9c emotional causality, and §10b clocks/secrets/questions.

The phase-7 page-plan reference details the standard sections and §10b, but it does not give equivalent detailed instructions for §9b and §9c.

That should be fixed.

## **Required page-plan content**

For every major structure, `pages-prose-plans/PG-<N>.md` should expose:

| Structure | Required page-plan rendering |
| ----- | ----- |
| `STENT/STSTAT` | Active cast, life, agency, location, availability, viewpoint constraints. |
| `STLOC/STOBJ/DA` | Current place, physical affordances, accessible objects/artifacts, access constraints. |
| `SE` | What happened, route, player-visible feedback, delta, causal rationale. |
| `SLT` | Required beats, selected move, exit pressure. |
| `BEL` | Who believes/knows/misunderstands what; what the POV may know. |
| `SREL` | Relationship pressure that should shape action/dialogue. |
| `STINT` | Active desires/goals driving behavior. |
| `STPLAN` | §9b: objective, current step, plan movement this page, blockers/resources, what prose must show, what prose must not imply. |
| `STEMO` | §9c: trigger/appraisal, affect kind/intensity, behavioral pressure, observable surface, suppressed/hidden affect, required transition, what prose must avoid. |
| `OBL/CNSQ/THR` | Open debts/fallout/threads with urgency. |
| `CLK/STSEC/STQ` | §10b: staged pressure, clue/reveal state, open setup/payoff handling. |
| Information asymmetry | Who knows vs reader knows vs actor knows; forbidden leaks. |
| Reader expectation | Which setup/payoff to echo, complicate, answer, defer, or abandon. |
| Social pressure | Public/factional belief, reputation/legal/institutional consequences, witnesses. |
| Resource/leverage | Material scarcity, access, bargaining leverage, coercive constraints. |
| Branch possibility-space | What choices are now available, why they materially differ, what is off-limits. |

## **Amend §9b**

Add a mandatory optional section when active plans matter:

**§9b Active Actor Plans / Tactical Agency**

For each relevant active `STPLAN`:

* holder;  
* objective;  
* current step in plain prose;  
* relevant belief basis;  
* relevant resource basis;  
* blockers;  
* fallback or lack of fallback;  
* this page’s `SE.state_relations[]` posture;  
* what prose must show;  
* what prose must not imply;  
* emitted choices grounded in the plan.

## **Amend §9c**

Add a mandatory optional section when active emotions matter:

**§9c Emotional Causality / Affective Transition**

For each relevant active `STEMO`:

* holder;  
* trigger event;  
* appraisal basis;  
* affect kind and intensity;  
* behavioral pressure;  
* agency effect;  
* orientation target;  
* status, especially suppressed/dissociated/settled/transformed;  
* observable surface vs internal pressure;  
* what prose must render;  
* what prose must avoid;  
* emitted choices grounded in the emotion.

## **Add optional derived render sections**

Add compact derived sections only when relevant:

* **§9d Information Asymmetry / Dramatic Irony**  
* **§9e Social Pressure / Public Belief**  
* **§10c Resource, Access, and Leverage Constraints**  
* **§13b Branch Possibility-Space Notes**

These should be page-plan projections, not active records.

# **Validation strategy**

## **Deterministic validators to strengthen**

1. `PG.state_snapshot.active_records` must include `STPLAN` and `STEMO` for current-contract pages.  
2. Snapshot replay must fail when active plans/emotions are omitted from current pages.  
3. Inactive lifecycle checks must include `STPLAN` and `STEMO`.  
4. `CHC.grounded_in.records[]` references to `STPLAN`, `STEMO`, `CLK`, `STSEC`, `STQ`, and `STINT` must resolve to active records at the emitting page.  
5. `STPLAN.belief_basis[]` must be non-empty for active/blocked/suspended plans.  
6. `STPLAN.current_step` must be status-conditioned.  
7. `STPLAN.fallback_steps[].trigger_condition.predicates[]` must parse and reference valid records.  
8. `STPLAN.current_step.success_condition.predicates[]` must parse and reference valid records.  
9. `SE.state_relations[]` consistency must cover all relation values, not just `advances`.  
10. `STEMO.agency_effect` validator must read active `STSTAT.entity`.  
11. `STEMO.orientation.toward_records[]` should require active/access-valid targets where appropriate.  
12. Prose-attach should fail/warn when required §9b/§9c transitions are omitted or contradicted.

## **Health-audit checks to add**

1. Contradictory same-holder active plan cluster.  
2. Long-blocked active plan with no fallback/action/rationale.  
3. Active plan repeatedly ignored without `SE.state_relations[].relation: ignores`.  
4. Plan over-seeding / never-rendered / never-used warning.  
5. Same-holder contradictory active emotion cluster.  
6. High-intensity emotion over many pages without settlement/transformation/action.  
7. Suppressed emotion rendered as openly expressed.  
8. Repetitive emotional rendering across consecutive pages.  
9. Public/factional belief cascade without access route.  
10. Reader setup/payoff starvation where `STQ` is active but never rendered.  
11. Choice grounded in plan/emotion but page plan omits that pressure.

## **Judgment-based audits**

Do not pretend these are deterministic:

* prose quality;  
* whether emotional rendering is subtle enough;  
* whether dramatic irony is satisfying;  
* whether a payoff feels earned;  
* whether a social consequence is dramatically strong;  
* whether a plan feels clever;  
* whether a choice menu feels aesthetically varied beyond structural non-collapse.

These should remain health-audit/prose-craft findings, not hard schema gates.

# **MCP and world-index strategy**

## **MCP additions**

Add targeted helpers or expanded packet slices:

* `get_active_plan_details(story_slug, page_id?, holder?)`;  
* `get_active_emotion_details(story_slug, page_id?, holder?)`;  
* `get_present_causal_situation(story_slug, page_id)`;  
* `get_information_asymmetry(story_slug, page_id, viewpoint_holder?)`;  
* `get_social_pressure(story_slug, page_id)`;  
* `get_reader_setup_payoff_context(story_slug, page_id)`;  
* `get_resource_access_leverage(story_slug, page_id)`;  
* `get_branch_possibility_space(story_slug, page_id)`.

Each helper must cite source records and never invent independent state.

## **World-index edge additions**

Add extraction for:

* `STPLAN.derived_from`;  
* `STPLAN.current_step.success_condition.predicates[]` referenced records;  
* `STPLAN.fallback_steps[].target_records[]`;  
* `STPLAN.fallback_steps[].trigger_condition.predicates[]`;  
* `STPLAN.expires_when` record refs if any;  
* `STEMO.expires_when` record refs if any;  
* `CHC.grounded_in.records[]` for expanded classes;  
* `PG.visible_affordances.grounded_in`;  
* `SLT.preconditions` record/predicate references for plan/emotion/setup/clock/secret predicates;  
* `SE.state_relations.target_record`;  
* `SE.actor` / `SE.targets`;  
* `BEL.holder`, `BEL.basis.access_records`, `BEL.basis.source_event`;  
* `SREL.participants`;  
* `STSTAT.entity`;  
* `STSEC.clue_carriers.record`;  
* `STQ.source_records`, `answer_records`, `payoff_of`.

## **Stale or under-supported fields**

The current active-plan/emotion packet fields are too shallow. They should not be removed, but they should become the compact view, with detail slices available for page plans and turn-cycle.

# **Patch-engine and operation vocabulary implications**

## **ID allocations**

`stplan_ids` and `stemo_ids` already exist. No new ID class is needed.

## **Operation kinds**

`create_stplan_record` and `create_stemo_record` already exist. No new create op is needed.

## **Supersession operations**

Do not add `supersede_stplan_record` and `supersede_stemo_record` unless operator confusion becomes severe. The current create-with-`supersedes` path is consistent with most story-state records.

However, update docs and envelope descriptions to say plainly:

* `STPLAN` supersession uses `create_stplan_record` with `record.supersedes`;  
* `STEMO` supersession uses `create_stemo_record` with `record.supersedes`;  
* named supersede ops are exceptional discoverability wrappers for `CLK`, `STSEC`, and `STQ`.

## **Envelope schemas**

After CHC grounding expansion, `describe-envelope-schema` should expose the updated CHC schema and referenced record patterns.

## **Append-only lifecycle**

No active-state lifecycle should mutate old record files. `STPLAN`/`STEMO` appear designed around append-only supersession. Preserve that.

# **Blast-radius analysis**

## **P0: Add `STPLAN`/`STEMO` to `PG.active_records`**

Checklist:

* Docs: shared record schemas, story-state contract.  
* Shared schemas: `story-page.schema.json`.  
* Skill docs: bootstrap, turn-cycle, prose-attach, health-audit.  
* Validators: snapshot replay, state-snapshot integrity, active-records full-shape.  
* Validator registry: ensure strengthened checks run on `create_pg_record`.  
* Patch engine: no op change.  
* MCP: context-packet active-record assumptions.  
* Context packet builders: include page snapshots with new keys.  
* World-index: no directory change; possible PG active-record edge extraction.  
* Page-plan sections: §9b/§9c always available when active.  
* Prose receipts: state relation / affective transition subchecks.  
* Health-audit: compatibility mode for older pages.  
* Tests/fixtures: current-contract PG with missing STPLAN/STEMO must fail; legacy page may warn.  
* Existing bundles: migration posture should be compatibility-warning first, then hard gate after revision marker.

## **P0: Expand `CHC.grounded_in.records[]`**

Checklist:

* Docs: CHC schema.  
* Shared schemas: allowed ID pattern.  
* Skill docs: bootstrap, turn-cycle, choice generation.  
* Validators: CHC reference resolution, observer firewall, branch isolation.  
* Patch engine: schema reference only.  
* MCP: choice summaries.  
* World-index: choice-grounding edges.  
* Page-plan: choice preview cites plan/emotion/setup pressure.  
* Prose receipts: choice consequence visibility.  
* Tests: CHC grounded in `STPLAN`, `STEMO`, `CLK`, `STSEC`, `STQ`, `STINT`.  
* Migration: old choices unaffected.

## **P0: Fix `STEMO.agency_effect` compatibility**

Checklist:

* Docs: none or validator note.  
* Validators: helper reads `STSTAT.entity`.  
* Registry: unchanged.  
* Tests: constraining emotion passes with holder’s constrained/incapacitated status; fails without compatible status/relation.  
* Existing bundles: no migration.

## **P1: Detailed plan/emotion MCP projections**

Checklist:

* Docs: `CONTEXT-PACKET-CONTRACT.md`, `MACHINE-FACING-LAYER.md`.  
* MCP: packet builders and target helpers.  
* World-index: required edges.  
* Page-plan sections: consume projections.  
* Tests: packet includes basis/blockers/trigger/appraisal/orientation.  
* Risk: token budget; add compact/detail modes.

## **P1: Page-plan §9b/§9c reference amendment**

Checklist:

* Docs: story-state contract, turn-cycle Phase 7 reference.  
* Skill docs: prose-attach check descriptions.  
* Prose receipts: required-event subchecks.  
* Health-audit: state-change-unrendered and bootstrap-drift.  
* Tests: plan with active plan/emotion must include §9b/§9c when relevant.

## **P2: Derived packets**

Checklist:

* Docs: machine-facing layer, context-packet contract, turn-cycle.  
* MCP: helper functions.  
* World-index: supporting edges.  
* Page-plan: optional sections.  
* Prose attach: deterministic subset checks.  
* Health-audit: judgment-based under-rendering.  
* Tests: packet source-record citation, no independent facts.

# **Ranked roadmap**

## **Priority 0: must-do before more ontology expansion**

1. Add `STPLAN` and `STEMO` to `PG.state_snapshot.active_records` docs and JSON schema.  
2. Include `STPLAN` and `STEMO` in inactive-active-record lifecycle checks.  
3. Fix `STEMO.agency_effect` compatibility helper.  
4. Expand `CHC.grounded_in.records[]` to include `STPLAN`, `STEMO`, `CLK`, `STSEC`, `STQ`, `STINT`, and probably `SF`.  
5. Amend turn-cycle Phase 7 page-plan reference with detailed §9b/§9c.  
6. Enforce active `STPLAN` belief basis and status-conditioned current step.  
7. Add tests proving `STPLAN`/`STEMO` survive create → snapshot → replay → page plan → prose receipt.

## **Priority 1: high-value support improvements**

1. Detailed MCP projections for active plans and emotions.  
2. World-index edges for fallback/success/derived plan references.  
3. Health-audit checks for plan conflict, plan starvation, stale emotion, contradictory emotion stacks, and suppressed-emotion rendering.  
4. Prose-attach checks that use §9b/§9c more directly.

## **Priority 2: support/rendering/audit improvements**

1. Present-causal situation packet.  
2. Dramatic-irony / information-asymmetry packet.  
3. Social-pressure/public-belief packet.  
4. Reader setup/payoff packet.  
5. Resource/access/leverage packet.  
6. Branch possibility-space packet.

## **Priority 3: future candidates / defer**

Revisit only after sample-story failures:

* multi-actor plan cluster as a projection;  
* public belief cascade projection;  
* conversation/negotiation support packet;  
* identity ambiguity packet;  
* memory/witness testimony packet.

None currently meets the burden for a new active record.

## **Priority 4: do not revisit unless evidence changes**

Do not add:

* act structure;  
* fixed beats;  
* scene record;  
* conflict record;  
* theme/motif state;  
* clue record;  
* reputation record;  
* resource/access record;  
* drama-manager curves;  
* predetermined ending rails;  
* convergence mechanics that override branch state.

# **Final verdict**

Worldloom should **not add another first-class active story-state record now**.

`STPLAN` and `STEMO` are the right additions and appear conceptually well-bounded. They need hardening, not replacement. The main remaining gaps are implementation mismatches and support surfaces: page snapshot schema, choice grounding, deeper MCP projections, fuller world-index edges, stronger plan/emotion validators, page-plan §9b/§9c rendering, prose-attach checks, and health-audit depth.

The ontology is now structurally complete enough for rich causal branching fiction. Future work should stop hunting for familiar narrative nouns and instead make the current state impossible to under-render, silently omit, or misuse. Unless sample-story evaluation reveals a truly recurrent active branch-local state that cannot be owned by the existing records, this should be the final missing-structures audit.

