# Story State Contract

Shared by every state-changing skill in the worldloom story-skill family. This is the only place where the page lifecycle, branch snapshots, event deltas, record schemas, predicate DSL, action-routing semantics, eight hard gates, and shared write order are defined. Each skill's `SKILL.md` references this contract for those concerns; the contract does not describe per-skill workflows.

Authored to support the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`.

## 1. Authority Model

Three layers, in strict precedence:

1. **World canon** — authoritative world-level truth, stored as atomic YAML under `worlds/<slug>/_source/` (CF / CH / INV / M / OQ / ENT / SEC records per FOUNDATIONS §Mandatory World Files). Story skills may read it. They never mutate it directly. The only lawful story-to-world canon mutation path is `story-fact-promotion-to-canon` → `canon-addition` → optional `story-promotion-closeout`.
2. **Story state** — authoritative branch-local narrative state inside a story bundle at `worlds/<slug>/stories/<story-slug>/_source/`. Written through story-bundle record-ops on the patch engine.
3. **Rendered prose** — authorial surface text at `pages-prose/PG-NNNN.md`. It can reveal, dramatize, omit, or stylize story state, but **it does not create story state by itself**. Prose is a rendering of state, not a second state engine.

**Plan-authority boundary.** Story state is authoritative at page-plan commit. A `PG` record is real the moment the patch engine accepts the page-cycle plan. Rendered prose is supplied externally (manual or LLM) and attached later via a prose receipt. The page snapshot is the fork primitive — any committed page is a valid parent for the next turn-cycle invocation, regardless of whether its prose has been rendered.

## 2. Schema-Minimalism Doctrine

Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped, because each field costs LLM tokens to author at every record and to read at every retrieval.

The field lists below are canonical. Skills must not add fields to these schemas without first amending this contract. A skill that needs a one-off field for its own workflow records the need in its `SKILL.md` and motivates the amendment.

## 3. Record Class Inventory

Story-bundle record classes (allocate via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`):

| Class | Purpose |
|---|---|
| `STENT` | Story-local entity mirror or story-local entity. |
| `STINT` | Intention held by an entity. |
| `SF` | Branch / story-local fact (what is true in the branch). |
| `BEL` | Belief, knowledge, suspicion, public claim, lie, witness memory, or misconception (what a holder believes about the world). |
| `SE` | Event; the single causal tick that produced a page. |
| `OBL` | Obligation. |
| `CNSQ` | Consequence. |
| `THR` | Thread. |
| `SREL` | Relationship. |
| `STLOC` | Location. |
| `STOBJ` | Object. |
| `DA` | Story-local diegetic artifact. |
| `BR` | Branch. |
| `PG` | Page / causal-tick state snapshot. |
| `CHC` | Emitted choice. |
| `SLT` | Commitment block (causal move with preconditions, beats, effects, exits, saliency). |

`SF` records what *is* true in the branch. `BEL` records what a holder *believes / claims / witnesses / lies about*. The two classes are kept separate so that lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent without inventing plot rails.

**Append-only / supersession discipline.** Once a record is committed it is not edited in place. Changes are expressed by writing a new record (next `-NNNN` id) whose `supersedes` field names the prior record. The patch engine enforces this at the file level for `_source/<class>/*.yaml`.

## 4. Record Schemas

Required fields are marked `*`. Fields not listed are not part of the schema. All YAML strings supporting natural language remain free-form unless an enum is named.

### 4.1 `BEL` (12 fields)

```yaml
id: BEL-NNNN*
story_id: STORY-NNNN*
created_at_page: PG-NNNN*
supersedes: BEL-NNNN | null            # default null
holder: STENT-NNNN | group:<name> | public | narrator   # *
claim: >                               # * natural-language statement
truth_relation: true | false | partly_true | unknown | contested | branch_counterfactual   # *
confidence: certain | likely | suspected | rumor | performative_lie   # *
visibility: private | shared | public | concealed | suppressed   # *
basis:
  source_event: SE-NNNN*               # the event that established this belief
consequences:
  opens: [OBL-NNNN | THR-NNNN | CNSQ-NNNN]
  constrains_choices: [CHC-NNNN]
```

The `truth_relation` field distinguishes belief from truth; the `visibility` field is consumed by the social-state firewall. `basis.source_event` is the strongest replay anchor — other provenance refinements (`witnessed_page`, `told_by`, `inferred_from`) are not retained at this layer.

### 4.2 `PG` (~21 sub-paths)

```yaml
id: PG-NNNN*
story_id: STORY-NNNN*
branch_id: BR-NNNN*
parent_page_id: PG-NNNN | null         # * null only for PG-0001
turn_index: 0*
input:
  choice_id: CHC-NNNN | null           # exactly one of choice_id / manual_action_text is non-null
  manual_action_text: null | string
  resolved_event_id: SE-NNNN*
state_hash_parent: null | sha256       # null only for PG-0001
state_hash: sha256*
state_snapshot:
  active_records:                      # *
    STENT: [STENT-NNNN]
    STINT: [STINT-NNNN]
    SF: [SF-NNNN]
    BEL: [BEL-NNNN]
    OBL: [OBL-NNNN]
    CNSQ: [CNSQ-NNNN]
    THR: [THR-NNNN]
    SREL: [SREL-NNNN]
    STLOC: [STLOC-NNNN]
    STOBJ: [STOBJ-NNNN]
    DA: [DA-NNNN]
  entity_status:                       # * one entry per active STENT
    STENT-NNNN:
      life: alive | dead | incapacitated | missing | unknown
      agency: free | constrained | captive | unconscious | dead
      location: STLOC-NNNN | unknown
  visible_affordances:                 # *
    - ordinal: 0                       # page-local index, not an allocated id
      label: "door to the alley"
      grounded_in: [STLOC-NNNN, STOBJ-NNNN]
      available_to: [STENT-NNNN]
      action_families: [escape, hide, pursue]
  unresolved_mystery_claims:           # *
    - mystery_id: M-NNNN
      authority: apparent | branch_local_counterfactual | canon_candidate
      status: preserved | advanced | held_for_promotion
  continuation:                        # *
    has_eligible_commitment_block: true | false
    terminal_status: open | branch_pause | terminal_closed
    terminal_rationale: null | string
plan:
  path: pages-prose-plans/PG-NNNN.md*
  plan_hash: sha256*
rendered_prose:
  path: pages-prose/PG-NNNN.md | null  # default null
  receipt_path: pages-prose-receipts/PG-NNNN.yaml | null   # default null
emitted_choices: [CHC-NNNN]*
validation_trace:                      # * one entry per shared gate with PASS + one-line rationale
  input_legality: "PASS: <rationale>"
  parent_snapshot_compatibility: "PASS: <rationale>"
  mystery_invariant_firewall: "PASS: <rationale>"
  branch_isolation: "PASS: <rationale>"
  append_only_delta: "PASS: <rationale>"
  consequence_or_terminal: "PASS: <rationale>"
  plan_grounding: "PASS: <rationale>"
  canon_promotion_hold: "PASS: <rationale>" | "NOT_APPLICABLE: <rationale>"
```

`rendered_prose.path` and `receipt_path` are informational. They are not a lifecycle status. There is no `prose_status` field. There is no `state_delta_summary` field — `SE.state_delta` is authoritative. There is no `open_debt` field on the snapshot — open obligations / consequences / threads are derived from `state_snapshot.active_records.OBL / CNSQ / THR`.

### 4.3 `SE` (~12 sub-paths)

```yaml
id: SE-NNNN*
story_id: STORY-NNNN*
created_at_page: PG-NNNN*
parent_page_id: PG-NNNN | null         # * null only for SE-0001
event_kind: story_start | selected_choice | write_in_attempt | world_block | repair | prose_attach | promotion_closeout   # *
actor: STENT-NNNN | system | unknown   # *
targets: [STENT-NNNN | STLOC-NNNN | STOBJ-NNNN]
outcome_route: accept | accommodate | attempt | world_block | promotion_hold | terminal   # *
world_logic_rationale: >               # * natural-language justification of why this route follows from world canon + branch state
state_delta:
  create: [record_id]
  supersede: [record_id]
  close: [record_id]
promotion_claims:
  - source_record: SF-NNNN | BEL-NNNN | DA-NNNN | STENT-NNNN
    authority: apparent | branch_local_counterfactual | canon_candidate
```

`world_logic_rationale` is required (no silent rejection — see §6). There is no `input_surface` block on SE; the PG record's `input.resolved_event_id` is the authoritative PG-to-SE link. There is no `state_delta.no_change` list — absence from `create / supersede / close` is the no-change signal. There is no `required_action` on promotion claims — `authority == canon_candidate` implies `run_story_fact_promotion_to_canon`.

### 4.4 `SLT` commitment block (~18 sub-paths)

```yaml
id: SLT-NNNN*
story_id: STORY-NNNN*
scope:
  visibility: author_pool | branch_scoped   # *
  branch_id: BR-NNNN | null            # * null only for author_pool
created_at_page: PG-NNNN | null        # null only for author_pool
title: string*
purpose: aftermath | escalation | reveal | refusal | negotiation | flight | investigation | intimacy | conflict | repair | closure | transition   # *
preconditions:
  hard: [<predicate>]*                 # see §5 closed predicate DSL
  soft: [<predicate>]
beats:                                 # * 1-5 beats per block
  - beat_id: B1*
    function: setup | pressure | turn | consequence | exit   # *
    instruction: >                     # * prose-facing beat instruction, no engine jargon
effects:                               # mirrors SE.state_delta
  create: [record_id]
  supersede: [record_id]
  close: [record_id]
exit_options:                          # *
  - intent: flee | confront | confess | hide | ask | attack | spare | bargain | wait | custom   # *
    surface_hint: string*
    likely_effects: [<short label>]
saliency:
  urgency: low | medium | high*
  cooldown_pages: 0*
  tags: [<string>]
mystery_policy:
  forbidden_resolutions: [M-NNNN]
  allowed_authority: apparent | branch_local_counterfactual | canon_candidate | none   # *
provenance:
  origin: bootstrap_seed | author_batch | audit_repair | runtime_jit   # *
```

There is no `record_version` (greenfield resets to 1; no v2 / v3 history). There is no `shape` discriminator (single shape — reintroduce only if a second shape is ever needed). There is no `required_context` block (redundant with predicate preconditions). There is no `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, or `stop_policy` — these are arc / plot-rail framings that commitment blocks deliberately reject. There is no `safety_valves.max_words` ceiling — the engine does not enforce word counts.

Commitment blocks are reusable causal moves, not dramatic acts, arcs, mini-stories, or plot rails. A good block says: "when these conditions hold, this kind of action can happen, these beats dramatize it, these state effects follow." A bad block says: "advance Act II" or "raise stakes before midpoint."

### 4.5 Prose receipt

Stored at `pages-prose-receipts/PG-NNNN.yaml` (direct-write artifact; not an atomic `_source/` record).

```yaml
page_id: PG-NNNN*
story_id: STORY-NNNN*
plan_path: pages-prose-plans/PG-NNNN.md*
prose_path: pages-prose/PG-NNNN.md*
plan_hash: sha256*
prose_hash: sha256*
state_hash_at_plan_time: sha256*
checked_at: iso8601*
strict: true | false*
verdict: PASS | WARN | FAIL*
checks:
  engine_jargon_leak: PASS | WARN | FAIL
  forbidden_mystery_resolution: PASS | FAIL
  required_event_rendered: PASS | WARN | FAIL
  entity_status_consistency: PASS | WARN | FAIL
  invented_structural_fact: PASS | WARN | FAIL
  canon_claim_without_authority: PASS | FAIL
  craft_critic: PASS | WARN | FAIL | NOT_RUN
notes: [<string>]
repair_recommendation: none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon
```

A failed receipt blocks publication only if the attaching skill ran with `strict=true`. **A receipt never mutates `PG` state.**

## 5. Closed Predicate DSL

`SLT.preconditions.hard | soft` use this closed grammar. No free-form predicate prose.

| Predicate | Shape | Consumed by |
|---|---|---|
| `fact_true(SF-NNNN)` | Branch-local fact must be currently active. | turn-cycle eligibility |
| `belief(holder, claim, confidence?)` | Belief must be held with at least the named confidence. | turn-cycle eligibility, social-state firewall |
| `entity_status(STENT-NNNN, field, value)` | `field` is one of `life | agency | location`. | turn-cycle eligibility |
| `relationship_axis(SREL-NNNN, axis, comparator, value)` | Comparator is one of `>= | <= | == | !=`. | turn-cycle eligibility |
| `obligation_open(OBL-NNNN)` | Obligation must be in an open state. | turn-cycle eligibility |
| `consequence_pending(CNSQ-NNNN)` | Consequence must be pending (unresolved). | turn-cycle eligibility |
| `thread_active(THR-NNNN)` | Thread must be active. | turn-cycle eligibility |
| `location(STENT-NNNN, STLOC-NNNN)` | Entity must currently be at location. | turn-cycle eligibility |
| `has_affordance(<action_family>)` | The current page's `visible_affordances` must include an affordance whose `action_families` contain the named family. | turn-cycle eligibility, plan grounding |
| `all[…]`, `any[…]`, `not[…]` | Boolean composition. | combinator |

## 6. Action Routing

When a player selects a `CHC` or supplies a write-in, the turn-cycle resolves it to exactly one of six outcomes:

| Route | Meaning |
|---|---|
| `accept` | The action can happen as stated. |
| `accommodate` | The intent is honored but transformed by world constraints. |
| `attempt` | Success is uncertain; resolve by state, capability, opposition, luck policy, and consequences. |
| `world_block` | The action is impossible in the current world / state; the page dramatizes the failed attempt or the impossibility itself. |
| `promotion_hold` | The action asserts a world-level truth or canon mystery resolution and pauses for `story-fact-promotion-to-canon`. |
| `terminal` | The action coherently closes the branch. |

**Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` record with `world_logic_rationale` explaining the route and a page plan that dramatizes the outcome. A skill that drops a player action without producing a page is broken.

## 7. Eight Shared Hard Gates

Every state-changing skill validates against these eight gates at page-plan commit. Each gate's pass entry on `PG.validation_trace` requires a one-line rationale (per CLAUDE.md "PASS entries require a one-line rationale").

| # | Gate | Checks |
|---|---|---|
| 1 | input legality | Exactly one source action (chosen CHC or write-in). Parent page exists and belongs to the named story bundle. The chosen CHC, if any, was emitted by the parent page and not retired. |
| 2 | parent snapshot compatibility | The loaded parent snapshot's `state_hash` matches `PG.state_hash_parent`. |
| 3 | mystery / invariant firewall | No `M-NNNN` with `status: forbidden` is resolved. No INV record is violated. `mystery_policy.forbidden_resolutions` of the selected commitment block is respected. |
| 4 | branch isolation | No record from a sibling branch appears in this page's `state_snapshot.active_records`. No author-pool commitment block references branch-local record ids. |
| 5 | append-only delta | All changes in `SE.state_delta` are creates / supersessions / closes. No in-place mutation of a prior record. |
| 6 | consequence capacity or terminal proof | The new page has at least one eligible commitment block OR `state_snapshot.continuation.terminal_status` is `branch_pause` / `terminal_closed` with a rationale that names how high-salience debts were closed, abandoned, or inherited. |
| 7 | plan grounding | Every declared affordance, every required beat from the chosen commitment block, and every CHC emitted by this page is grounded in `state_snapshot.active_records` or world canon. |
| 8 | canon promotion hold | If `SE.outcome_route == promotion_hold` or any `promotion_claims[].authority == canon_candidate`, the world-level truth is held for promotion (not asserted in this page's state delta as if already canon). Marked `NOT_APPLICABLE` with rationale when no canon claim is in play. |

A skill that bypasses any gate is broken. Hook 3 structurally enforces patch-engine-only writes to `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml`, so a malformed plan is rejected at the patch engine before any record lands.

## 8. Page Plan Minimum Contract

`pages-prose-plans/PG-NNNN.md` is a direct-write artifact (not an atomic `_source/` record). It is the prompt package for the external prose renderer. Each plan body has 19 sections:

| § | Section | Source |
|---|---|---|
| 1 | Story kernel excerpt | `STORY_KERNEL.md` slice |
| 2 | **Content Policy** | **inlined verbatim from `reports/prose-quality-instructions.md` §Content Policy** |
| 3 | **Prose Craft Contract** | **inlined verbatim from `reports/prose-quality-instructions.md` §Prose Craft Contract** |
| 4 | Relevant world-canon excerpt | context packet |
| 5 | Active cast and entity statuses | `state_snapshot.entity_status` |
| 6 | Current location and affordances | `state_snapshot.visible_affordances` |
| 7 | Selected event and state delta | `SE` |
| 8 | Required beats from the commitment block | selected `SLT.beats` |
| 9 | Relationship and belief context | active `SREL`, `BEL` |
| 10 | Open obligations, consequences, threads | active `OBL`, `CNSQ`, `THR` |
| 11 | Forbidden mystery resolutions | `mystery_policy.forbidden_resolutions` |
| 12 | Stopping point | from commitment block + author judgment |
| 13 | Next choices to foreshadow or make available | emitted `CHC[]` |
| 14 | Recent prose continuity (optional, when parent prose is rendered) | recent `pages-prose/*.md` |
| 15 | Plan frontmatter (engine fields, hash, page id) | engine |
| 16 | Cast material reality projection (optional) | per-skill |
| 17 | Style and register notes (optional) | per-skill |
| 18 | Anti-pathology checklist | per-skill |
| 19 | **Render-time instruction block** | **inlined verbatim from `reports/prose-quality-instructions.md` §Render-Time Instruction Template** |

**§2, §3, and §19 are inlined verbatim on every page plan.** This is operationally load-bearing: the external prose renderer has no cross-plan state — every page render is a cold context. Compacting these sections on subsequent pages would force the user to manually re-paste the canonical content on every render, defeating the self-contained-plan contract. Skills must not propose compacting these sections across pages.

The plan must not expose engine jargon to prose. Engine terms (record ids, gate names) may appear in §15 frontmatter only.

The plan must not include word-count targets, floors, ceilings, ranges, or budgets. Pacing is expressed structurally through beats and stop conditions. See FOUNDATIONS §Story Bundles §9.

## 9. Branching and Rewind

To advance the story from any committed page (continuation or fork):

1. Load that page's `state_snapshot`. No sibling-branch records are read.
2. If continuing the existing branch, reuse `parent.branch_id`. If forking, allocate a new `BR-NNNN` whose `parent_branch_id` names the parent's branch and `forked_at_page_id` names the parent page.
3. Resolve the selected `CHC` or write-in via §6 action routing.
4. Select or JIT-create one `SLT` commitment block.
5. Build the state delta, build the next snapshot, compute the new `state_hash`.
6. Author the page plan, generate the next `CHC` set, validate against §7 hard gates.
7. Submit one patch envelope (§10 write order).

No sibling-branch prose may be read for state assembly. Cross-branch comparison belongs only in audit, not in turn-cycle.

## 10. Shared Write Order

Every state-changing skill follows this order at commit:

1. Build patch plan for story-bundle `_source/<class>/*.yaml` records (creates + supersessions + closes).
2. Dry-run validate via `mcp__worldloom__validate_patch_plan`.
3. Obtain approval token when execution mode requires it.
4. Submit patch plan via `mcp__worldloom__submit_patch_plan`.
5. Write direct-markdown artifacts: page plan (`pages-prose-plans/PG-NNNN.md`), story kernel updates, receipts, manifests.
6. Update bundle `INDEX.md` last.
7. Update per-world `stories/INDEX.md` only when story visibility changed (new bundle, archived bundle).

Hook 3 blocks raw `Edit` / `Write` on `_source/<class>/*.yaml`. Story-bundle markdown surfaces (`STORY_KERNEL.md`, `INDEX.md`, `pages-prose/`, `pages-prose-plans/`, `audits/`, `storylet-batches/`, `story-promotions/`, `pages-prose-receipts/`) remain direct-write surfaces.

If patch submission succeeds but a direct-write artifact fails, the story `_source/` records are authoritative and the artifact should be repaired directly. The skill must surface the partial-failure state to the user; silent retry is forbidden.

## 11. Mystery and Canon Authority

Story-local resolution-like claims are classified into three authority levels:

| Authority | Meaning | Promotion path |
|---|---|---|
| `apparent` | What appears to be true in the branch from the cast's epistemic position. May or may not match world canon. | No promotion. Treated as `BEL` if a holder is named. |
| `branch_local_counterfactual` | What is true *only in this branch*; contradicts canon or another branch deliberately. | No promotion. Lives as `SF` with branch-scoped certainty. |
| `canon_candidate` | The branch asserts something that may be world-level truth and could be promoted to canon. | Pauses via §7 gate 8 until `story-fact-promotion-to-canon` runs and `canon-addition` adjudicates. |

Mysteries with `status: forbidden` are never resolved by any authority level. Mysteries with `status: active | passive` may be resolved per the `future_resolution_safety` coupling in FOUNDATIONS §Canon Layers.

## 12. How Skills Use This Contract

Each story-skill `SKILL.md` references this contract for: record schemas (§4), predicate DSL (§5), action-routing semantics (§6), the eight hard gates (§7), the page plan §19-section contract (§8), branching procedure (§9), shared write order (§10), and mystery/canon authority (§11).

Skills must not duplicate the contract's content. They cite it. If a skill needs a deviation, the deviation is amended into this contract first.

The contract does not describe:

- Per-skill workflow phases (each skill's `SKILL.md` owns these).
- Per-skill validation traces beyond the eight shared gates.
- Per-skill input / output specifications.
- Mode-specific behavior (e.g., `commitment-block-authoring` modes).
- Examples of skill invocations.

When `docs/FOUNDATIONS.md` and this contract disagree, FOUNDATIONS wins. Open the amendment by editing FOUNDATIONS first and propagating the change here.
