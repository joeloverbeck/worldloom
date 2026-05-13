# commitment-block-authoring — Streamlined v1

## Purpose

Create compact reusable commitment blocks for the story engine. This replaces the broad `storylet-pool-authoring` workflow while keeping the `SLT` id class for compatibility.

Commitment blocks are not prose and not dramatic acts. They are small causal moves the turn-cycle can apply when a user commits to a choice or write-in.

## Modes

- `direct_batch` — create a small author-pool batch.
- `audit_repair` — create blocks that address audit findings.
- `in_memory_jit` — create exactly one branch-scoped block for turn-cycle; writes nothing by itself.

No mode owns patch-envelope mechanics; direct writes use the shared contract.

## Inputs

Common:

- `world_slug`
- `story_slug`
- `mode`
- `focus` optional

Mode-specific:

- `direct_batch.target_count` default 6, max 12.
- `audit_repair.finding_ids[]`.
- `in_memory_jit.parent_page_id`, `proposed_action`, `continuation_gap`.

## Record shape

```yaml
id: SLT-NNNN
record_version: 3
shape: commitment_block
story_id: STORY-NNNN
scope:
  visibility: author_pool | branch_scoped
  branch_id: BR-NNNN | null
created_at_page: null | PG-NNNN
title: string
purpose: aftermath | escalation | reveal | refusal | negotiation | flight | investigation | intimacy | conflict | repair | closure | transition
preconditions:
  hard:
    - predicate
  soft:
    - predicate
required_context:
  cast: [STENT-NNNN | role:any]
  locations: [STLOC-NNNN | kind:any]
  objects: [STOBJ-NNNN]
  beliefs: [BEL-NNNN]
beats:
  - beat_id: B1
    function: setup | pressure | turn | consequence | exit
    instruction: string
effects:
  facts: []
  beliefs: []
  relationships: []
  obligations: []
  consequences: []
  threads: []
  entity_status: []
  movement: []
exit_options:
  - intent: string
    surface_hint: string
    likely_effects: []
saliency:
  tags: []
  urgency: low | medium | high
  cooldown_pages: 0
mystery_policy:
  forbidden_resolutions: []
  allowed_authority: none | apparent | branch_local_counterfactual | canon_candidate
provenance:
  origin: bootstrap_seed | author_batch | audit_repair | runtime_jit
```

## Predicate discipline

Keep a closed predicate DSL, but keep it small:

- `fact_true(SF)`
- `belief(holder, claim, confidence?)`
- `entity_status(STENT, field, value)`
- `relationship_axis(SREL, axis, comparator, value)`
- `obligation_open(OBL)`
- `consequence_pending(CNSQ)`
- `thread_active(THR)`
- `location(entity, STLOC)`
- `has_affordance(action_family)`
- `all[]`, `any[]`, `not[]`

No free-form predicate prose.

## Workflow

### 1. Load compact context

Load:

- story kernel,
- current active snapshots for the target branch or representative branches,
- open obligations/consequences/threads,
- relationship and belief hotspots,
- current commitment block pool,
- relevant world canon/invariants/mysteries.

Do not load all prose unless mode explicitly asks for prose repetition analysis.

### 2. Diagnose need

Identify gaps by causal function, not by arc taxonomy:

- no aftermath block for violence/death,
- no belief-repair block after deception,
- no movement/escape block,
- no relationship-pressure block,
- no consequence-payoff block,
- no terminal/closure block,
- no fallback continuation block.

### 3. Draft blocks

Draft only enough blocks to cover the gap. Each block should be reusable but not vague.

A good block says: “when these conditions hold, this kind of action can happen, these beats dramatize it, and these state effects follow.”

A bad block says: “advance Act II” or “raise stakes before midpoint.”

### 4. Validate each block

Six gates:

1. schema completeness,
2. predicate parse,
3. branch-scope legality,
4. mystery/invariant firewall,
5. effect legality,
6. exit-option grounding.

### 5. Validate batch diversity

Only for `direct_batch`. Check:

- purposes are not all the same,
- at least one block handles aftermath,
- at least one block changes belief or relationship state,
- no block depends on branch-local records unless branch-scoped,
- cooldown/reuse fields prevent immediate repetition.

### 6. Return or write

- `in_memory_jit` returns one validated record to turn-cycle; it writes nothing.
- `direct_batch` and `audit_repair` submit patch records, then write `storylet-batches/SLB-NNNN.md`, then update `INDEX.md` last.

## Removed from old storylet authoring

- No separate arc-archetype library as a required schema authority.
- No `dramatic_unit` required field.
- No `arc_contract` required field.
- No nested `execution_envelope`.
- No nested `effect_model` required field.
- No stop-policy parsing except optional engine runaway defense.
- No target pool size plus 30% overgeneration.
- No direct JIT refusal; JIT is allowed only as parent-invoked no-write mode.

## Authoring targets

Bootstrap should seed 4-8 blocks, not dozens. Runtime JIT is acceptable and expected. Health audit can recommend gaps; it should not force the pool into a giant pre-authored taxonomy.
