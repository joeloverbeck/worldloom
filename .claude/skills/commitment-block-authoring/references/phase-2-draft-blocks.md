# Phase 2: Draft Commitment Blocks

For each planned block (from Phase 1), draft a full `SLT` record per shared contract §4.4:

```yaml
id: SLT-<integer>
story_id: STORY-<integer>
scope:
  visibility: global_author_pool | branch_prefix_scoped | branch_scoped   # branch_scoped only when audit_repair RSP specifies it
  branch_id: BR-<integer> | null
  visible_branch_path_prefix: [PG-<integer>]       # branch_prefix_scoped only
created_at_page: null   # MANDATORY; always null for this skill's origins (author_batch / audit_repair, never runtime_jit)
title: <short descriptive title>
move_family: orient | world_pressure | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | recovery
preconditions:
  hard: [<predicate object per shared contract §5>]
  soft: [<predicate object per shared contract §5>]
beats:
  - beat_id: B1
    function: setup | action | pressure | turn | consequence | exit
    instruction: >
      <prose-facing beat instruction, no engine jargon>
  # 1-5 beats per block
effects:
  create: [<record id | bound:<alias>>]
  supersede: [<record id | bound:<alias>>]
  close: [<record id | bound:<alias>>]
exit_options:
  - action_family: move | evade | pursue | perceive | investigate | communicate | persuade | negotiate | bond | oppose | harm | protect | control | transfer | use | make_change | ritual_protocol | recover | wait | decide
    surface_hint: <player-visible label>
    likely_effects: [<record id | bound:<alias>>]
saliency:
  urgency: low | medium | high
  cooldown_pages: 0
  tags: [<string>]
mystery_policy:
  forbidden_resolutions: [M-<integer>]
  allowed_authority: apparent | branch_local_counterfactual | canon_candidate | none
provenance:
  origin: author_batch | audit_repair   # never runtime_jit for this skill
```

**Predicate DSL discipline** (per shared contract §5): every predicate in `preconditions.hard` and `preconditions.soft` is emitted as a flat object with `pred` plus predicate-specific fields. The function-call forms are notation for the closed DSL predicate catalog (`fact_true`, `belief_record`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, the nine `any_*` existential predicates, `location`, `has_affordance`, `record_active`, `record_age`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`, `plan_active`, `plan_blocked`, `any_plan_active`, `emotion_active`, `any_emotion_active`, `emotion_pressure`, plus `all[]` / `any[]` / `not[]` combinators). Prefer `affordance_available_to(<actor>, <action_family>)` for branch-scoped blocks; `has_affordance(<action_family>)` and the `any_*` predicates are only author-pool / branch-prefix prefilters when the actor or exact branch-local record is not yet bound. Use `record_age(<record_id | bound:<alias>>, >= | <= | == | !=, <integer_pages>)` when a block should mature an open pressure according to how long the matched record has existed in the current branch path; both `direct_batch` and `audit_repair` modes may use it in hard or soft preconditions. Use `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` for hard execution eligibility (actor-specific BEL grounding) and `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` for author-pool / branch-prefix prefiltering. Use `plan_active(holder, plan?)` and `plan_blocked(holder)` for exact actor/plan eligibility, `any_plan_active(alias, holder_role?)` for author-pool plan-aware blocks, `emotion_active(holder, kind?, min_intensity?)` and `emotion_pressure(holder, pressure)` for actor-specific affective pressure, and `any_emotion_active(alias, holder_role?, kind?, min_intensity?)` for author-pool affective prefilters. Character-fit STCHAR predicate usage is governed by the citation paragraph in Phase 1; free-claim string matching is not lawful, and persona-state predicates such as `character_has_wound` or `character_arc_stage` are not allowed.

**Plan / emotion authoring patterns**: plan-aware blocks should move an active `STPLAN` through present-causal pressure, not pre-script a future plot. A block may test a blocker, advance a current step, force revision, or fulfill / abandon a plan only when its predicates establish the relevant active plan and actor access. Emotion-aware blocks should use `emotion_active` / `emotion_pressure` to select moves shaped by affective pressure, then let runtime `SE.state_delta` create or supersede `STEMO` only when the event actually changes affective state. The existing causal-function coverage targets remain authoritative; do not add a separate "plan/emotion" coverage family just because the new predicates exist.

**Affect-predicate brittleness — do not over-narrow `kind` on a global-pool block.** The `STEMO` lifecycle the engine runs transitions affect between lifecycle-adjacent kinds (e.g. `dread` → `fear` → `anxiety` as a fright matures). A `global_author_pool` / `branch_prefix_scoped` block whose **hard** predicate pins an exact affect — `any_emotion_active(kind=dread)` or `emotion_active(kind=dread)` — couples its eligibility to one affect kind the lifecycle may move away from, and is rendered **permanently inert** the moment no active `STEMO` carries that exact kind, silently shrinking the eligible move pool with no signal (this is the `storylet_permanently_inert` finding `branching-story-health-audit` Phase 2o emits). When a block should fire across a fear-family pressure rather than one exact affect kind, prefer: `any_emotion_active` with **no** `kind` (fire on any active emotion the holder carries), a `kind` that is genuinely durable for this bundle's lifecycle, or an `any[…]` combinator over the lifecycle-adjacent kinds (e.g. `any[ any_emotion_active(kind=dread), any_emotion_active(kind=fear), any_emotion_active(kind=anxiety) ]`). Keep the block a causal move shaped by present affective pressure, not an arc rail keyed to one feeling. Reserve an exact-`kind` **hard** predicate for cases where that one affect is the durable, lifecycle-stable reason the block exists; otherwise put the `kind` narrowing in `soft` so it ranks rather than gates. (FOUNDATIONS §Story Bundles §5a — commitment blocks are causal moves; §5b — every field load-bearing; Rule 5 — No Consequence Evasion: a permanently-inert seed block is latent consequence-capacity loss.)

For DA-grounded eligibility, use the `artifact_accessible(STENT-<integer>, DA-<integer>)` predicate from `.claude/skills/_shared-templates/story-state-contract.md` §5. Pair it with `any_belief(...)` when the content is known through belief rather than current artifact access. See `.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics for the access-route semantics that ground this predicate.

**Alias-binding discipline**: an existential `any_*` predicate binds its `alias` to the matched active record at block selection. `effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects` may reference that match as `bound:<alias>`. Every `bound:<alias>` token MUST be introduced by a hard or soft precondition on the same `SLT`; do not use `bound:<alias>` as a prose label. For `global_author_pool` blocks, this is the preferred way to close, supersede, or preview effects on open `OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, or `STINT` records without naming branch-local ids.

**Beat discipline**: 1–5 beats per block. Each beat names a `function` (setup / action / pressure / turn / consequence / exit) and a prose-facing instruction that the renderer can dramatize without engine vocabulary.

**Schema-minimalism discipline** (per FOUNDATIONS §Story Bundles §5b): every field on the block conforms to the shared contract §4.4 schema. The forbidden legacy fields are enumerated and rejected by Phase 3 gate 1. The block is a causal move, not a dramatic-act surrogate.

**Effects-field convention**: `effects.create`, `effects.supersede`, and `effects.close` MAY be left empty (`[]`) when the block's effect-shape is contextual at runtime — matching bootstrap practice for `SLT-1..SLT-10` in any bootstrapped bundle. Populate `effects.{create,supersede,close}` with concrete record IDs or `bound:<alias>` references when the block's intent mandates a specific delta the author-time template is willing to commit to (e.g., a negotiation block that always supersedes the matched attention `SREL` as `bound:trust_edge`). Phase 4 check 3 (belief-or-relationship coverage) uses the three-form OR described below, so a block may satisfy the check through literal effects, `exit_options[].likely_effects`, or belief / relationship existential predicates without inventing fake author-time effects.

**`allowed_authority` default heuristic for empty-effects blocks**: when `effects.{create,supersede,close}` are all empty (contextual at runtime per the convention above), default `mystery_policy.allowed_authority` per `move_family` — `none` for pressure-dramatization families (`world_pressure`, `pursuit`, `recovery`, `transformation`, `conflict`, `evasion`, `protection`) that do not shape branch-apparent or canon-candidate truth, and `apparent` for state-shaping families (`investigation`, `disclosure`, `status_shift`, `negotiation`, `bond_shift`, `decision`, `resource_exchange`, `ritual_protocol`, `orient`) where runtime `SE.resolution` may produce branch-apparent claims. `branch_local_counterfactual` and `canon_candidate` remain reserved for blocks whose effects (or whose runtime `SE.state_delta` intent) explicitly create `SF` records with those authority levels. The Phase 3 gate 4 compatibility check still governs — this heuristic is a default starting point that author judgment may override when the block's intended runtime semantics dictate.
