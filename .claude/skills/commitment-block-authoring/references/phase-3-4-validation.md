# Phases 3-4: Per-Block & Batch-Diversity Validation

## Phase 3: Per-block validation

Run 6 per-block gates on each drafted SLT record:

1. **Schema and origin completeness** — all required fields per shared contract §4.4 are present (`id`, `story_id`, `scope.visibility`, `title`, `move_family`, `preconditions.hard` with ≥1 entry, `beats[]` with ≥1 entry, `exit_options[]` with ≥1 entry, `saliency.urgency`, `saliency.cooldown_pages`, `mystery_policy.allowed_authority`, `provenance.origin`, `grounding`). `provenance.origin` MUST be `author_batch` for `direct_batch` and `audit_repair` for `audit_repair`; this skill never emits `runtime_jit`, so `created_at_page` MAY be null per shared contract §4.4. The presence of ANY of the explicitly-forbidden legacy fields (`arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version > 1`, `shape:`) is `FAIL` per FOUNDATIONS §Story Bundles §5a. Missing required field, wrong origin, or presence of forbidden field → `FAIL`.

2. **Predicate parse** — every predicate in `preconditions.hard` and `preconditions.soft` is one of the closed-DSL predicates, with valid argument shapes, record-id references, and `bound:<alias>` references backed by same-`SLT` existential bindings. Free-form prose, undefined predicates, ill-formed combinator syntax, or unbound aliases → `FAIL`.

3. **Branch-scope legality** — `scope.visibility: global_author_pool` blocks reference NO `branch_local_record` per shared contract §4.2 branch-scope vocabulary, including no exact `STCHAR-*` ids. `bundle_genesis_record` references remain legal for global-author-pool blocks because genesis records are visible to every branch; this matches bootstrap practice (e.g., SLT-9 in any bootstrapped bundle references `BEL-3` minted at PG-1). `scope.visibility: branch_prefix_scoped` blocks reference only records visible at pages whose `branch_path` starts with the SLT's `visible_branch_path_prefix` (the PG-array prefix per the storylet schema); exact `STCHAR-*` ids are lawful only when active at one of those pages and paired with the actor's active `STENT`/state. `scope.visibility: branch_scoped` blocks reference only records visible on the branch named by `scope.branch_id`; exact `STCHAR-*` ids are lawful only for bound or branch-visible characters in that branch. Cross-branch references to records minted on non-root pages of sibling branches → `FAIL`.

4. **Mystery / invariant firewall** — `mystery_policy.forbidden_resolutions[]` does NOT include any mystery the block's effects could resolve. `mystery_policy.allowed_authority` is compatible with the block's effects (a block whose effects create a `canon_candidate`-authority `SF` cannot have `allowed_authority: none`). World invariants (loaded in `references/pre-flight-and-prerequisites.md` §Pre-flight Check step 6) are NOT violated by any predicate or effect. Inconsistent OR violating → `FAIL`.

5. **Effect legality** — `effects.create | supersede | close` references valid record classes or `bound:<alias>` tokens. Supersede / close targets must reference records the block's preconditions establish as active, either by an exact-ID predicate or by an existential `any_*` predicate (hard OR soft) binding the alias — soft-bound aliases are lawful in effects because runtime selection resolves the alias to whichever matched record bound it, regardless of whether the binding predicate was a hard gate or a soft preference (parallel to `references/phase-2-draft-blocks.md` §Alias-binding discipline). Close targets must be currently open per the bundle state. Dangling references or unbound aliases → `FAIL`.

6. **Exit-option grounding** — each entry in `exit_options[]` has a non-empty `action_family`, `surface_hint`, and at least an empty `likely_effects[]` list (per shared contract §4.4). Missing field → `FAIL`.

Blocks that fail any gate are removed from the batch with a logged rejection reason in Phase 5's manifest. If all blocks fail, abort before Phase 4.

## Phase 4: Batch-diversity validation (`direct_batch` only)

`audit_repair` skips this phase — its blocks are RSP-driven and may legitimately concentrate on one repair theme.

### Grounding (SPEC-77)

> An SLT's reason_to_exist must name the active or reusable pressure logic the storylet captures: what causal state makes it eligible, and what kind of move it represents. Generic phrases like "dramatic variety," "good conflict," "advance the plot," "raise stakes," "create tension," and "for pacing" are structurally rejected (see `slt_grounding_minimal_integrity` banned-phrase list below).

Per-field requirements:

- Require `grounding.compatible_turn_drivers[]` to be set per block. For a global-author-pool / branch-prefix pattern, list every driver kind the pattern can serve (commonly: `[player_action, player_write_in, npc_action, offstage_action]` for a pursuit pattern; `[clock_fire, world_pressure]` for a deadline-pressure pattern). For a branch-scoped runtime_jit block, list the single driver kind the JIT was created for.
- Require `grounding.reason_to_exist` per block. Provide a 1-2 sentence statement naming the active pressure record(s) or reusable pressure class. Examples:
  - "Covers offstage or onstage pursuit pressure from an active opposing actor." (global pattern)
  - "Varro's active plan (STPLAN-9) and ambush clock (CLK-3) became due; Jon and Mara must react in POV." (runtime_jit)
- Banned-phrase list (rejected by `slt_grounding_minimal_integrity`): "dramatic variety", "good conflict", "advance the plot", "raise stakes", "create tension", "for pacing", "dramatic moment", "story beat", "narrative momentum". This list is amendable via the shared utility at `tools/validators/src/structural/slt-grounding-utils.ts`; mirror amendments in this reference when the utility changes.

For `direct_batch`, verify across the surviving blocks:

**Batch-size precondition, pool-wide recovery, and focused-scope carve-out**: Check 1 (move-family diversity) is **batch-scoped** — diversity is a property of the batch — and applies when `target_count ≥ 3`; for `target_count < 3` (focused-scope `direct_batch`), or when the user-supplied `focus` categorically excludes recovery shape, the operator may apply documented scope-override status to Check 1, citing the user-requested narrow scope as warrant in the Phase 6 deliverable summary. Check 2 (recovery coverage) is **bundle-scoped** — recovery sufficiency is a property of the bundle's live SLT pool, not of any batch in isolation — and is satisfied by any one of three independent conditions:

- **(a) Batch supplies recovery** — this batch contains ≥1 `move_family: recovery` block.
- **(b) Pool already covers recovery** — the bundle's live pool already contains ≥1 `global_author_pool` / `branch_prefix_scoped` `move_family: recovery` block and the batch adds none. Record the pool's recovery coverage (count + ids) in the Phase 6 deliverable summary as the authorization record. This applies regardless of `target_count`; a redundant recovery block is never required solely to satisfy Check 2 when pool coverage already exists.
- **(c) Narrow scope / recovery-excluding focus** — `target_count < 3` or `focus` is incompatible with recovery shape; surface the scope-override explicitly in the deliverable summary.

The HARD-GATE deliverable summary's user-acknowledgment step is sufficient authorization for any scope-override or pool-coverage warrant above; no separate ticket is required. Checks 3 (belief-or-relationship coverage) and 4 (no branch-local deps in global pool) apply regardless of batch size — both can be satisfied by a single block.

1. **Move-family diversity** — at least 3 distinct `move_family` values across the batch.
2. **Recovery coverage (bundle-scoped)** — the bundle's live SLT pool (existing pool ∪ this batch) contains ≥1 `move_family: recovery` block. The bundle needs recovery coverage so that violence, betrayal, sex, and death outcomes route to graceful follow-up — this is a property of the live pool, not of any single batch, and it agrees with the Phase 1 pool-wide recovery diagnosis (causal-function target #1). Satisfied per the three conditions (a)/(b)/(c) in the batch-size precondition above: the batch supplies a recovery block, OR the existing pool already covers recovery (record count + ids in the deliverable summary), OR a narrow-scope / recovery-excluding-focus override applies. If the live pool has **zero** recovery coverage and no override applies, the batch MUST supply a recovery block.
3. **Belief-or-relationship coverage** — at least 1 block satisfies the three-form OR below. The social-state engine needs ongoing pool support per FOUNDATIONS §Story Bundles §6a.
   - Literal effects form: `effects.create`, `effects.supersede`, or `effects.close` contains a `BEL-<integer>` / `SREL-<integer>` reference or a `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL` (for example `any_belief` or `any_relationship_axis`). For `supersede` / `close` targets, the referenced record must be established active by the block's `preconditions.hard` (per Phase 3 gate 5 effect legality).
   - Exit-preview form: `exit_options[].likely_effects` contains a `BEL-<integer>` / `SREL-<integer>` reference or a `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL`.
   - Predicate-intent form: `preconditions.hard` or `preconditions.soft` includes `any_belief(...)` or `any_relationship_axis(...)`.
   Actual runtime consequences remain authoritative in `SE.state_delta` — the batch-diversity check verifies *intent surface*, not pre-authored effects.
4. **No branch-local dependencies in global-author-pool blocks** — re-verifies Phase 3 gate 3 at batch scope.

Plan/emotion predicates can satisfy a block's local grounding, but they do not replace the four batch-diversity checks above. If a batch focuses on tactical or affective pressure, still preserve move-family spread, recovery coverage, social-state coverage, and branch-scope legality.

Checks 1 (move-family diversity), 2 (recovery coverage), and 4 (no branch-local dependencies) do not inspect literal `effects` entries, so the three-form OR applies only to check 3.

If any batch-level check fails, regenerate the affected blocks (loop to Phase 2 for replacements) OR shrink the batch to the diversity-compliant subset. Surface the regeneration / shrink decision in the Phase 6 deliverable summary.
