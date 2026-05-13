# branching-story-turn-cycle

## Purpose

Advance a branching-story bundle by one causal tick from any parent page. The skill handles both continuation (advancing the active branch) and forking (starting a new branch from a parent page). It consumes a selected `CHC-NNNN` or a free-form write-in, applies world logic to route the action, commits the resulting state delta, materializes the next page snapshot, authors the comprehensive prose plan for the next page, and emits the next choices.

Parent rendered prose is **optional**. The authoritative input is the parent `PG.state_snapshot`. The turn-cycle may advance from any committed page snapshot regardless of whether its prose has been rendered (per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary).

Turn-cycle is the second skill in the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`. Every state-changing decision in this skill references the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` for record schemas (§4), the closed predicate DSL (§5), action-routing semantics (§6), the eight shared hard gates (§7), the page-plan minimum contract (§8), the branching procedure (§9), and the shared write order (§10).

## Inputs

Required:

- `world_slug` — existing world directory slug under `worlds/`.
- `story_slug` — existing story bundle slug under `worlds/<world_slug>/stories/`.
- `parent_page_id` — `PG-NNNN`; any committed page in the bundle. Continuation is implicit when `parent_page_id` is the active branch's leaf; forking is implicit when `parent_page_id` is any non-leaf page (including a leaf in a sibling branch).
- exactly one of:
  - `chosen_choice_id` — `CHC-NNNN`; must have been emitted by `parent_page_id`.
  - `manual_action_text` — natural-language player write-in.

Optional:

- `execution_mode` — `authoring | interactive_runtime | batch`. Default: `authoring`.
- `force_branch_id` — when intentionally forking into a named branch (otherwise the skill derives `BR-NNNN` from continuation-vs-fork detection).
- `accept_parent_unrendered` — `true | false`. Default: `true`. Setting `false` aborts at Pre-flight when `parent.rendered_prose.path` is null.

## Output Bundle

Patch-engine story records (submitted via `mcp__worldloom__submit_patch_plan` per shared contract §10):

- One `SE-NNNN` event (always; the causal tick this skill commits).
- New or superseding records as needed by the state delta — any of `STENT`, `STINT`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`.
- A new `BR-NNNN` when forking from a non-leaf parent or from another branch's leaf (continuation reuses `parent.branch_id`).
- One new `PG-NNNN` with full state snapshot (per shared contract §4.2).
- Optionally one branch-scoped JIT `SLT-NNNN` commitment block (`scope.visibility: branch_scoped`, `provenance.origin: runtime_jit`) when no eligible author-pool block fits the action.
- New `CHC-NNNN` records (3–5 plus the write-in slot) when the new page stops at a real commitment hinge; or one continue-or-pause `CHC` when the page continues into the next beat; or zero `CHC` when the branch is terminal.

Direct-write markdown:

- `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-NNNN.md` — comprehensive prose plan for the new page (per shared contract §8 19-section contract).
- `worlds/<world_slug>/stories/<story_slug>/INDEX.md` — bundle-local index updated last.

No `pages-prose/PG-NNNN.md` is written by this skill. No prose-receipt is written.

## Pre-Flight

1. **Load FOUNDATIONS** — `docs/FOUNDATIONS.md` must be loaded into context. The §Story Bundles subsections (especially §4a Plan-Authority Boundary, §5 Validation Rules At Story Scope, §5a Commitment Blocks Are Causal Moves, §5b Schema-Minimalism, §6a Belief vs. Fact) govern this skill.
2. **Load the shared contract** — `.claude/skills/_shared-templates/story-state-contract.md` for schemas, predicate DSL, action routing, gates, page-plan minimum contract, branching procedure, write order.
3. **Resolve the bundle** — confirm `worlds/<world_slug>/stories/<story_slug>/` exists with `STORY_KERNEL.md`, `INDEX.md`, and `_source/`. Abort with a clear bundle-not-found error otherwise.
4. **Load the parent page** — `_source/pages/<parent_page_id>.yaml` must exist; load it. Abort with a parent-not-found error otherwise.
5. **Verify input legality (action source)** —
   - If `chosen_choice_id` is supplied: verify the CHC exists, belongs to `parent_page_id` (its `emitted_by` field references `parent_page_id`), and has not been retired or superseded.
   - If `manual_action_text` is supplied: verify it is non-empty.
   - If both or neither: abort with an action-source error.
6. **Detect continuation vs fork**: continuation when `parent_page_id` is the active leaf of `parent.branch_id` and no `force_branch_id` is set; fork otherwise. Allocate a new `BR-NNNN` for forks via `mcp__worldloom__allocate_next_id(world_slug, 'BR', story_slug=<story_slug>)`.
7. **Verify parent prose policy** — if `accept_parent_unrendered: false` and `parent.rendered_prose.path` is null, abort with a parent-unrendered error. Otherwise proceed.
8. **Allocate ids** — through `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)` for: `SE`, `PG`, optional `BR`, candidate ids for any record class that might be created in Phase 4 (allocate lazily, on first use, to avoid wasted ids if a class is not touched this turn), and `CHC` ids for emissions (allocated in Phase 9 after the page stop-point is known).
9. **Load context** — the parent's `state_snapshot.active_records` are loaded into memory as the working state. Optional parent + grandparent prose loaded if files exist and the user wants style continuity in the page plan. Whole-class Mystery Reserve and Invariants loaded via context packet for the firewall gate.
10. **HARD-GATE deferral** — the HARD-GATE fires at Phase 10 (Commit / Write) AFTER the state delta + page plan + emitted choices have been drafted in working memory. The user reviews the full deliverable summary before any patch submission.

## Phases

### Phase 1: Resolve the action

If `chosen_choice_id` is supplied, load the `CHC` record; its `target_or_action_family` + `associated_commitment_block` + `success_policy` (if any) drive the routing.

If `manual_action_text` is supplied, parse it into a structured `proposed_action`:

```yaml
proposed_action:
  actor: STENT-NNNN | player_character | unknown
  action_family: attack | flee | hide | confess | ask | deceive | negotiate | steal | destroy | spare | help | wait | custom
  target_records: [<record id>]
  intended_outcome: <natural-language statement>
  visible_method: <natural-language statement>
  implied_claims: [<short label>]   # any world-level truth assertions the action carries
```

Route the action to exactly one outcome per shared contract §6:

- `accept` — the action can happen as stated given current state + world canon.
- `accommodate` — the intent is honored but world constraints transform the surface (e.g., the door is locked, so the cast member kicks it open instead of opening it).
- `attempt` — success is uncertain; resolve by state, capability, opposition, and consequences. Define a success / partial-success / failure path for the outcome ladder.
- `world_block` — the action is impossible in the current world / state. The page dramatizes the failed attempt or the impossibility itself.
- `promotion_hold` — the action asserts a world-level truth or canon mystery resolution; the turn-cycle pauses for `story-fact-promotion-to-canon`. **Bootstrap-additional check at this skill**: any `outcome_route == promotion_hold` must NOT commit a state delta that asserts the canon claim as already true; the page commits only the branch-local appearance + the promotion claim record.
- `terminal` — the action coherently closes the branch.

**Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` record with `world_logic_rationale` explaining the route plus a page plan that dramatizes the outcome.

### Phase 2: Select or create a commitment block

Filter the bundle's `SLT` records for eligibility against the parent snapshot:

- All `preconditions.hard` predicates evaluate true.
- `scope.visibility: author_pool` blocks are universally eligible (subject to predicates); `scope.visibility: branch_scoped` blocks are eligible only when `scope.branch_id` matches the active or new branch.
- `saliency.cooldown_pages` permits use (the block was not used within the last N pages of this branch).
- `mystery_policy.forbidden_resolutions` does not include any mystery the resolved action would resolve.
- `mystery_policy.allowed_authority` is compatible with the action's `outcome_route` (`canon_candidate` blocks may not be used for `accept` routes — they require a deliberate promotion-hold flow).

Rank eligible blocks by:

1. Match against the resolved action's `action_family` (a block whose `purpose` aligns with the action family wins).
2. `saliency.urgency` (high > medium > low).
3. Coverage of the action's `target_records`.
4. Diversity (avoid repeating the most-recently-used `purpose` on this branch).

If no eligible block exists for the resolved action, create one branch-scoped JIT block:

- `scope.visibility: branch_scoped`, `scope.branch_id: <active or new branch>`, `created_at_page: <new PG id>`, `provenance.origin: runtime_jit`.
- 1–5 beats authored from the action and current state. The JIT block is small and specific: one purpose, minimal effects, named exit options.
- Predicates reference only records active in the parent snapshot.
- `mystery_policy` honors the firewall.

Avoid creating JIT blocks pre-emptively. If a flexible author-pool block fits with slight reframing, prefer that block.

### Phase 3: Apply the state delta

Apply exactly one causal delta from the parent snapshot. The delta may:

- Create new facts (`SF`) or beliefs (`BEL`).
- Supersede beliefs when truth-relation or visibility changes (every public discovery, betrayal, lie, or confession produces at least one `BEL` supersession or new record per FOUNDATIONS §6a).
- Change entity status — including death, incapacity, absence, injury, capture, escape — via supersession of the affected `STENT.entity_status`.
- Update intentions (`STINT` supersession).
- Update relationships (`SREL` supersession).
- Open / close / escalate obligations (`OBL` supersession or new).
- Create consequences (`CNSQ` new) whose triggers fire at future pages.
- Advance or close threads (`THR` supersession).
- Move entities or objects (entity_status.location supersession; `STOBJ` supersession).
- Create or alter story-local artifacts (`DA` new or supersession).
- Mark the branch terminal (set `state_snapshot.continuation.terminal_status: terminal_closed` with terminal_rationale).

**Deaths and removals are first-class outcomes.** Do not protect "main characters" with out-of-world logic. If the world and state permit an attempt to kill someone, route as `attempt` or `accept` and let the consequences restructure the branch.

When an entity dies, becomes incapacitated, or becomes unavailable, reconcile in the same delta:

- Their open intentions (`STINT` supersession to `abandoned` / `transferred`).
- Obligations owed by or to them (`OBL` supersession or close).
- Relationships (`SREL` supersession; status becomes `severed` or `mourning` per context).
- Witnesses and beliefs (`BEL` records for who saw and what they now believe).
- Objects / locations they controlled (`STOBJ.controlled_by` supersession).
- Future choice availability (will be filtered at Phase 9 plan grounding).

### Phase 4: Update belief and visibility state

For every public, witnessed, hidden, or deceptive event in the delta, draft `BEL` records per shared contract §4.1 + FOUNDATIONS §6a:

- Who knows (each witness or recipient gets a `BEL` with `truth_relation: true` and `visibility: shared` or `public`).
- Who suspects (`truth_relation: unknown`, `confidence: suspected`).
- Who misunderstands (`truth_relation: partly_true | false`, `confidence: certain`).
- Who can prove it (entries in `consequences.opens[]` linking to potential `OBL` / `CNSQ` records).
- What rumor or lie may spread (additional `BEL` records with `visibility: shared`, `confidence: rumor`).
- What choices are now constrained (`consequences.constrains_choices[]` linking to upcoming `CHC` candidates).

This phase is **mandatory** for any action involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual. Phase 9 belief / visibility health (a bootstrap-additional check) verifies coverage.

### Phase 5: Check mystery and canon authority

Classify every new resolution-like claim in the delta per shared contract §11:

- `apparent` — what appears to be true from the cast's epistemic position; recorded on `BEL` records.
- `branch_local_counterfactual` — true only in this branch; recorded on `SF` records with branch-scoped certainty.
- `canon_candidate` — may be world-level truth; held for promotion via `story-fact-promotion-to-canon`.

If the action would resolve any mystery with `status: forbidden`, abort before patch submission with a mystery-firewall error. If the action asserts a `canon_candidate` claim, set the `outcome_route` to `promotion_hold` and ensure the state delta records only the branch-local appearance (not the canon assertion); emit `SE.promotion_claims[]` so the user knows to invoke `story-fact-promotion-to-canon` after this turn lands.

### Phase 6: Materialize the next page snapshot

Draft `PG-NNNN` per shared contract §4.2:

- `parent_page_id: <parent>`, `branch_id: <active or new branch>`, `turn_index: parent.turn_index + 1`.
- `input.choice_id` OR `input.manual_action_text` (exactly one non-null), `input.resolved_event_id: <new SE id>`.
- `state_hash_parent: parent.state_hash`, `state_hash: <computed from new state>`.
- Full `state_snapshot`: `active_records` (per-class lists including the BEL key with the records created or kept active this turn); `entity_status` per active STENT; `visible_affordances` recomputed for the new location / context; `unresolved_mystery_claims` updated; `continuation` (has_eligible_commitment_block, terminal_status, terminal_rationale).
- `plan.path: pages-prose-plans/PG-NNNN.md`, `plan.plan_hash: <computed>`.
- `rendered_prose.path: null`, `rendered_prose.receipt_path: null`.
- `validation_trace`: populated by Phase 9.

The snapshot must be complete enough to be a fork point for any future turn-cycle invocation. The new page is a valid parent for the next turn whether or not its prose is ever rendered (per FOUNDATIONS §4a Plan-Authority Boundary).

### Phase 7: Author the page plan

Write `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-NNNN.md` per shared contract §8 — 19 sections.

**§2 / §3 / §19 are inlined verbatim from `reports/prose-quality-instructions.md`.** Operationally load-bearing — external prose renderer has no cross-plan state.

Turn-cycle-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to this turn's action (faction stances, taboos, hazards that constrain dramatization); §5 enumerates active cast and entity statuses **as of this turn** (including any deaths, captures, or status changes from Phase 3); §6 names the current location and grounded affordances; §7 dramatizes the resolved event (the chosen `CHC` or write-in interpretation + the `outcome_route` + the `world_logic_rationale`); §8 names the required beats from the selected or JIT commitment block; §9 names the load-bearing relationships and beliefs after Phase 4 updates; §10 lists open obligations / consequences / threads that must be honored in the prose; §11 names forbidden mystery resolutions; §12 names the intended stopping point (the next commitment hinge or terminal close); §13 previews the emitted choices (or marks the branch terminal); §14 (optional) inlines recent rendered prose continuity from `pages-prose/<recent>.md` if available — this is the only section that consumes parent prose.

The plan must not expose engine jargon to prose. Engine terms confined to §15 frontmatter only. No word-count targets (per FOUNDATIONS §Story Bundles §9).

### Phase 8: Generate the next choices

Emit 3–5 `CHC` records only if the new page stops at a real commitment hinge. Otherwise emit a single continue-or-pause `CHC`. If the branch is terminal, emit zero `CHC` and set `state_snapshot.continuation.terminal_status: terminal_closed` with a `terminal_rationale` naming how high-salience debts were closed, abandoned, inherited, or intentionally left unresolved.

The next choice set should include different axes (per the same discipline as bootstrap Phase 8): action vs restraint, truth vs deception, intimacy vs distance, risk vs safety, public vs private, duty vs desire. Always allow a write-in slot unless the branch is terminal.

Each `CHC` carries `surface_label`, `player_visible_intent`, `target_or_action_family`, `likely_state_pressure`, `associated_commitment_block` (`SLT-NNNN` or null), `success_policy` (when `target_or_action_family == 'attempt'`).

### Phase 9: Validate

Run the 8 shared hard gates per shared contract §7 against the drafted records:

1. **input legality** — exactly one of `chosen_choice_id` / `manual_action_text`; the chosen CHC belongs to parent and is not retired; parent page exists; bundle exists.
2. **parent snapshot compatibility** — loaded parent snapshot's `state_hash` matches `PG.state_hash_parent`.
3. **mystery / invariant firewall** — no forbidden `M-NNNN` resolved by the action's outcome; no INV violated; selected commitment block's `mystery_policy.forbidden_resolutions` is respected.
4. **branch isolation** — no sibling-branch record appears in the new page's `state_snapshot.active_records`; no author-pool `SLT` block references branch-local records.
5. **append-only delta** — all changes in `SE.state_delta` are creates / supersessions / closes; no in-place mutation.
6. **consequence capacity or terminal proof** — the new page has at least one eligible commitment block (author-pool or JIT-able), OR `terminal_status: terminal_closed` with `terminal_rationale` naming high-salience debt closure.
7. **plan grounding** — every declared affordance, every required beat from the chosen / JIT commitment block, and every emitted `CHC` is grounded in active records or world canon.
8. **canon promotion hold** — if `outcome_route == promotion_hold` or any `SE.promotion_claims[].authority == canon_candidate`, the world-level truth is held for promotion (the state delta records only the branch-local appearance). Marked `NOT_APPLICABLE` with rationale when no canon claim is in play.

Plus turn-cycle-additional checks (recorded in working memory, not on `PG.validation_trace`):

1. **Action source legality** — exactly one of `chosen_choice_id` / `manual_action_text`; the chosen CHC is not retired.
2. **Entity death / incapacity reconciliation** — when Phase 3 applied a death or incapacity, the open intentions / obligations / relationships / object-controlled / belief-witness consequences are also in the delta (Phase 3 reconciliation completed).
3. **Belief / visibility coverage** — every action involving secrecy / betrayal / deception / violence / sex / law / status / public ritual produces at least one `BEL` create or supersession in the delta (Phase 4 mandatory).
4. **Write-in world-logic rationale** — when the action source is `manual_action_text`, `SE.world_logic_rationale` is non-empty and explains the route (silent rejection forbidden).

### Phase 10: Commit / Write — HARD-GATE fires

1. Build the patch plan covering every record drafted in Phases 1-8 as a single envelope. Operations include `create_se_record`, `create_pg_record` (always), plus `create_*_record` and `supersede_*_record` ops for every changed record class. Forking turns include `create_br_record`.
2. Dry-run via `mcp__worldloom__validate_patch_plan`.
3. Present the complete deliverable summary to the user:
   - Branch label (continuation of `BR-NNNN` or fork into new `BR-NNNN`).
   - Resolved action route (`accept` / `accommodate` / `attempt` / `world_block` / `promotion_hold` / `terminal`).
   - State delta inventory (creates + supersessions + closes per class).
   - Commitment block used (author-pool `SLT-NNNN` or new JIT `SLT-NNNN`).
   - Page plan structural preview (§5 / §6 / §7 / §12 / §13 only — verbatim §2 / §3 / §19 are too long to inline).
   - Emitted choices list (or terminal-close rationale).
   - Any `promotion_claims[]` that require a follow-up `story-fact-promotion-to-canon` invocation.
4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
5. On approval: obtain patch approval token; submit the patch plan via `mcp__worldloom__submit_patch_plan`.
6. On patch success, write the markdown artifacts in shared contract §10 write order: `pages-prose-plans/PG-NNNN.md` → bundle `INDEX.md` (updated to reflect the new page + branch state).
7. Report page path + record inventory to the user. If `promotion_claims[]` were emitted, surface the recommended next step (invoke `story-fact-promotion-to-canon` with the new `SE-NNNN` as evidence). Do NOT `git commit`.

## Failure Behavior

- If validation fails before patch submission, **write nothing**. Surface the failed gate or additional check and the corrective action.
- If patch submission succeeds but a direct-write markdown artifact fails, story-bundle `_source/` records are authoritative; surface the partial-failure to the user with a one-paragraph diagnostic. Do not silently retry.
- If the resolved action is `terminal`, the terminal proof must name how high-salience debts were closed, abandoned, inherited by another branch, or intentionally left unresolved. A terminal page without terminal proof aborts at Phase 9 gate 6.

## Runtime Shortcut

For `execution_mode: interactive_runtime`, the engine may use this fast path:

```
parent snapshot → action route → commitment block → state delta → next snapshot → plan → choices
```

Only the page plan requires long-form language generation. All other state work is compact structured YAML produced from the parent snapshot + selected / JIT block. The HARD-GATE still fires at Phase 10 — runtime mode does not bypass user approval.

## References

- `.claude/skills/_shared-templates/story-state-contract.md` — schemas (§4), predicate DSL (§5), action routing (§6), eight hard gates (§7), page-plan minimum contract (§8), branching procedure (§9), shared write order (§10), mystery / canon authority (§11).
- `.claude/skills/branching-story-bootstrap/SKILL.md` — sibling skill that produces the root `PG-0001`; turn-cycle reads any `PG-NNNN` regardless of which skill committed it.
- `reports/prose-quality-instructions.md` — canonical source for the §2 / §3 / §19 verbatim sections of the page plan.
- `docs/FOUNDATIONS.md` — §Story Bundles (especially §4a Plan-Authority Boundary, §5a Commitment Blocks Are Causal Moves, §5b Schema-Minimalism, §6a Belief vs. Fact) governs this skill.
- `reports/streamlined-story-pipelines/03-branching-story-turn-cycle.md` — streamlined-pipeline source report for this skill's design intent.
- `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` — greenfield plan; §C.2 is the blueprint summary for this skill.

## What is intentionally NOT in this skill

- No requirement that parent prose is rendered before the turn proceeds (FOUNDATIONS §4a — page snapshots are the fork primitive).
- No `prose_status` field on the new `PG-NNNN`.
- No ARC_TRACE record emission (no parallel "did the prose realize the planned arc" engine).
- No embedded storylet-authoring workflow — JIT block creation is a small local helper following shared contract §4.4.
- No 19-gate per-phase validation ledger — the 8 shared gates plus 4 turn-cycle-additional checks are the only validation surface.
- No serialization constraint that prose-attach must complete before the next turn (turn-cycle reads `PG.state_snapshot`, not rendered prose; `branching-story-prose-attach` is asynchronous and optional).
- No silent rejection of player actions — every action produces an `SE` and a page plan, even `world_block` routes.
- No protection of "main characters" via out-of-world logic — deaths and removals are first-class outcomes routed through the same action-resolution machinery as any other event.
