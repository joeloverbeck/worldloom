---
name: branching-story-turn-cycle
description: "Use when advancing a branching-story bundle by one causal tick from any parent page — continuation or fork. Produces: one SE event + new/superseding story-bundle records (STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA as needed) + optional new BR (fork) + new PG with full state snapshot + optional JIT SLT + 0-5 new CHC + pages-prose-plans/PG-NNNN.md + bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: parent_page_id
    description: "PG-NNNN; any committed page in the bundle. Continuation is implicit when parent is the active branch leaf; fork is implicit when parent is any non-leaf page or a sibling-branch leaf."
    required: true
  - name: chosen_choice_id
    description: "CHC-NNNN emitted by parent_page_id. Exactly one of chosen_choice_id / manual_action_text must be supplied (XOR enforced at Pre-flight step 4)."
    required: false
  - name: manual_action_text
    description: "Natural-language player write-in. Exactly one of chosen_choice_id / manual_action_text must be supplied (XOR enforced at Pre-flight step 4)."
    required: false
  - name: execution_mode
    description: "authoring | interactive_runtime | batch; default: authoring"
    required: false
  - name: force_branch_id
    description: "When intentionally forking into a named branch; otherwise the skill derives BR-NNNN from continuation-vs-fork detection"
    required: false
  - name: accept_parent_unrendered
    description: "true | false; default: true. Setting false aborts Pre-flight when parent.rendered_prose.path is null. Default true honors FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary)."
    required: false
---

# Branching Story Turn Cycle

Advance a branching-story bundle by one causal tick from any committed parent page — continuation or fork. Consumes a chosen `CHC` or write-in, applies world logic to route the action, commits the resulting state delta, materializes the next page snapshot, authors the comprehensive prose plan for the next page, and emits the next choices. Parent rendered prose is optional.

<HARD-GATE>
Do NOT write `pages-prose-plans/PG-NNNN.md` or update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, AND do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; parent page loaded from `_source/pages/<parent_page_id>.yaml`; XOR action source verified (exactly one of `chosen_choice_id` / `manual_action_text` non-null; chosen CHC belongs to parent and is not retired); continuation-vs-fork detected; ids allocated via `mcp__worldloom__allocate_next_id`; context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', ...)`; parent prose policy verified.

(b) Phases 1-9 have completed in working memory: action resolved to exactly one of six outcome routes (`accept | accommodate | attempt | world_block | promotion_hold | terminal`); commitment block selected from the author pool OR a branch-scoped JIT block created; state delta drafted (creates / supersessions via new record files carrying `supersedes:`); mandatory BEL updates drafted per FOUNDATIONS §Story Bundles §6a; mystery and canon authority classified per shared contract §11; `SE-NNNN` and `PG-NNNN` drafted with full `state_snapshot` and `validation_trace`; `pages-prose-plans/PG-NNNN.md` drafted with all 19 sections including verbatim §2 / §3 / §19 inlined from `reports/prose-quality-instructions.md`; next `CHC` records drafted (3-5 for commitment-hinge stop; 1 for continue-or-pause; 0 for terminal).

(c) Phase 9 has validated all 8 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 with a one-line PASS rationale per gate on `PG-NNNN.validation_trace`, plus the 4 turn-cycle-additional checks (action source legality, entity death/incapacity reconciliation, belief/visibility coverage, write-in world-logic rationale).

(d) The user has explicitly approved the deliverable summary (branch label, resolved outcome route, state delta inventory by class, commitment block used, page plan structural preview, emitted choices list, any `SE.promotion_claims[]` requiring a follow-up `story-fact-promotion-to-canon` invocation).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + contract + prose-quality sources;
  resolve bundle; load parent PG; verify XOR action source; detect
  continuation vs fork; verify parent prose policy; allocate ids;
  load context — parent state_snapshot + optional recent prose +
  Mystery Reserve + Invariants)
        |
        v
Phase 1: Resolve the action → outcome_route
        |
        v
Phase 2: Select or JIT-create commitment block → SLT
        |
        v
Phase 3: Apply state delta → creates/supersessions/closes (in memory)
        |
        v
Phase 4: Update belief and visibility state → BEL records (in memory)
        |
        v
Phase 5: Classify mystery and canon authority
        |
        v
Phase 6: Materialize next page snapshot → SE-NNNN + PG-NNNN (in memory)
        |
        v
Phase 7: Author page plan → pages-prose-plans/PG-NNNN.md (in memory)
        |
        v
Phase 8: Generate next choices → CHC records (in memory; 0 for terminal)
        |
        v
Phase 9: Validate against shared 8 hard gates + 4 turn-cycle-additional
        |
        v
Phase 10: HARD-GATE fires → atomic patch + markdown writes
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `parent_page_id` — `PG-NNNN` — any committed page in the bundle

### XOR-required (exactly one)

- `chosen_choice_id` — `CHC-NNNN` emitted by `parent_page_id` and not retired
- `manual_action_text` — natural-language player write-in

### Optional

- `execution_mode` — enum — `authoring | interactive_runtime | batch`; default: `authoring`
- `force_branch_id` — `BR-NNNN` — when intentionally forking into a named branch
- `accept_parent_unrendered` — `true | false` — default: `true` (honors FOUNDATIONS §Story Bundles §4a)

## Output

| Class | File path | Created when |
|---|---|---|
| `SE-NNNN` | `_source/events/SE-NNNN.yaml` | Always (the causal tick) |
| `PG-NNNN` | `_source/pages/PG-NNNN.yaml` | Always |
| `BR-NNNN` | `_source/branches/BR-NNNN.yaml` | IF fork (parent is non-leaf OR `force_branch_id` set) |
| `STENT-NNNN` (supersession) | `_source/entities/STENT-NNNN.yaml` | IF entity status changes (life / agency / location) |
| `STINT-NNNN` (new or supersession) | `_source/intentions/STINT-NNNN.yaml` | IF intentions change this turn |
| `SF-NNNN` | `_source/facts/SF-NNNN.yaml` | IF new branch-local facts emerge |
| `BEL-NNNN` (new or supersession) | `_source/beliefs/BEL-NNNN.yaml` | IF belief/visibility changes — **mandatory** for actions involving secrecy / betrayal / deception / violence / sex / law / status / public ritual (Phase 4) |
| `OBL-NNNN` (new or supersession) | `_source/obligations/OBL-NNNN.yaml` | IF obligations open / close / escalate |
| `CNSQ-NNNN` | `_source/consequences/CNSQ-NNNN.yaml` | IF consequences fire |
| `THR-NNNN` (supersession) | `_source/threads/THR-NNNN.yaml` | IF threads advance or close |
| `SREL-NNNN` (supersession) | `_source/relationships/SREL-NNNN.yaml` | IF relationships change (mandatory after death/incapacity reconciliation) |
| `STLOC-NNNN` | `_source/locations/STLOC-NNNN.yaml` | IF new story-local location introduced |
| `STOBJ-NNNN` (new or supersession) | `_source/objects/STOBJ-NNNN.yaml` | IF objects are created / moved / changed |
| `DA-NNNN` | `_source/artifacts/DA-NNNN.yaml` | IF in-story diegetic artifact introduced |
| `SLT-NNNN` | `_source/storylets/SLT-NNNN.yaml` | IF Phase 2 created a JIT block (`provenance.origin: runtime_jit`) |
| `CHC-NNNN` | `_source/choices/CHC-NNNN.yaml` | 3-5 records if Phase 8 emits choice set; 1 for continue-or-pause; 0 if terminal |
| Page plan | `pages-prose-plans/PG-NNNN.md` | Always |
| Bundle INDEX | `INDEX.md` | Always (updated) |

Atomic-record writes route through `mcp__worldloom__submit_patch_plan`. Supersession is file-level append-only per shared contract §3 — a "supersession" is a new record file carrying `supersedes: <prior-id>`, using the existing `create_*_record` ops. Markdown writes are direct after patch submission per shared contract §10.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles (especially §4a Plan-Authority Boundary, §5 / §5a / §5b, §6a Belief vs. Fact) governs this skill
- `.claude/skills/_shared-templates/story-state-contract.md` — shared schemas (§4), predicate DSL (§5), action routing (§6), eight hard gates (§7), page-plan minimum contract (§8), branching procedure (§9), shared write order (§10)
- `reports/prose-quality-instructions.md` — canonical source for verbatim §2 / §3 / §19 of the page plan
- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` and `INDEX.md` — bundle root context
- `worlds/<world_slug>/stories/<story_slug>/_source/pages/<parent_page_id>.yaml` — parent page; MUST exist
- Parent's `state_snapshot.active_records` resolved to their `_source/<class>/*.yaml` files
- Optional `pages-prose/<recent>.md` for §14 continuity (only when parent prose exists)
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', seed_nodes=<active cast + active location + parent's unresolved mystery claims>, token_budget=<default>)`

The bundle MUST exist (non-bootstrap variant); parent page MUST exist; the new `_source/pages/PG-NNNN.yaml` MUST NOT exist (collision aborts Pre-flight).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `reports/prose-quality-instructions.md` into working context. Abort with clear missing-file error on any unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if the directory does not exist or is missing `STORY_KERNEL.md` / `_source/`.
3. Load `worlds/<world_slug>/stories/<story_slug>/_source/pages/<parent_page_id>.yaml`. Abort with parent-not-found error if missing.
4. Verify XOR action source: exactly one of `chosen_choice_id` / `manual_action_text` non-null. If `chosen_choice_id` supplied, verify the CHC exists, was emitted by `parent_page_id`, and is not retired. Abort with action-source error on any failure.
5. Detect continuation vs fork: continuation when `parent_page_id` is the active leaf of `parent.branch_id` and no `force_branch_id` is set; fork otherwise. Allocate a new `BR-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, 'BR', story_slug=<story_slug>)` for forks.
6. Verify parent prose policy: if `accept_parent_unrendered: false` and `parent.rendered_prose.path` is null, abort with parent-unrendered error. Default `true` bypasses the check.
7. Allocate ids via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)` for: `SE`, `PG`, optional `BR`, candidate ids per record class (lazily on first use), `CHC` ids in Phase 8 after the page stop-point is known. The `BEL` id class lands via MCPENH-040 — see Guardrails §Known integration debt.
8. Load parent's `state_snapshot.active_records` into working state. Load optional parent + grandparent `pages-prose/*.md` if available for §14 continuity. Load whole-class Mystery Reserve and Invariants via context packet.
9. Verify the new `_source/pages/PG-NNNN.yaml` does NOT already exist (defensive against a stale allocator state). Abort on collision.

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Resolve the action

If `chosen_choice_id` is supplied, load the `CHC` record; its `target_or_action_family`, `associated_commitment_block`, and `success_policy` (if any) drive the routing.

If `manual_action_text` is supplied, parse it into a structured `proposed_action`:

```yaml
proposed_action:
  actor: STENT-NNNN | player_character | unknown
  action_family: attack | flee | hide | confess | ask | deceive | negotiate | steal | destroy | spare | help | wait | custom
  target_records: [<record id>]
  intended_outcome: <natural-language statement>
  visible_method: <natural-language statement>
  implied_claims: [<short label>]
```

Route to exactly one of six outcomes per shared contract §6:

- `accept` — the action can happen as stated given current state + world canon.
- `accommodate` — the intent is honored but world constraints transform the surface.
- `attempt` — success is uncertain; resolve by state / capability / opposition / consequences; define a success / partial-success / failure path.
- `world_block` — the action is impossible in the current world/state; the page dramatizes the failed attempt or the impossibility itself.
- `promotion_hold` — the action asserts a world-level truth or canon mystery resolution; pauses for `story-fact-promotion-to-canon`. The state delta records ONLY the branch-local appearance, not the canon claim as already true.
- `terminal` — the action coherently closes the branch.

**Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` record with `world_logic_rationale` explaining the route plus a page plan that dramatizes the outcome.

## Phase 2: Select or JIT-create a commitment block

Filter the bundle's `SLT` records for eligibility against the parent snapshot:

- All `preconditions.hard` predicates evaluate true (per shared contract §5 closed predicate DSL).
- `scope.visibility: author_pool` blocks are universally eligible (subject to predicates); `scope.visibility: branch_scoped` blocks are eligible only when `scope.branch_id` matches the active or new branch.
- `saliency.cooldown_pages` permits use.
- `mystery_policy.forbidden_resolutions` does not include any mystery the resolved action would resolve.
- `mystery_policy.allowed_authority` is compatible with `outcome_route`.

Rank eligible blocks by: (1) `purpose` × `action_family` match; (2) `saliency.urgency` (high > medium > low); (3) coverage of `target_records`; (4) diversity (avoid repeating the most-recently-used `purpose` on this branch).

If no eligible block exists, create one branch-scoped JIT block:

- `scope.visibility: branch_scoped`, `scope.branch_id: <active or new branch>`, `created_at_page: <new PG id>`, `provenance.origin: runtime_jit`.
- 1–5 beats authored from the action + current state.
- Predicates reference only records active in the parent snapshot.
- `mystery_policy` honors the firewall.

Avoid pre-emptive JIT creation. If a flexible author-pool block fits with slight reframing, prefer that block. JIT blocks follow FOUNDATIONS §Story Bundles §5a (commitment blocks are causal moves, not dramatic acts or arcs) — no `arc_contract` / `dramatic_unit` / `execution_envelope` / `stop_policy` / shape discriminators.

## Phase 3: Apply the state delta

Apply exactly one causal delta from parent snapshot. The delta may:

- Create new facts (`SF`) or beliefs (`BEL`).
- Supersede beliefs when truth-relation or visibility changes (every public discovery, betrayal, lie, or confession produces at least one `BEL` create or supersession in this phase or Phase 4 per FOUNDATIONS §6a).
- Change entity status (life / agency / location) via `STENT` supersession — death, incapacity, absence, injury, capture, escape are first-class.
- Update intentions (`STINT` supersession).
- Update relationships (`SREL` supersession).
- Open / close / escalate obligations (`OBL` supersession or new).
- Create consequences (`CNSQ` new).
- Advance or close threads (`THR` supersession).
- Move entities or objects (`STENT.entity_status.location` supersession; `STOBJ` supersession).
- Create or alter story-local artifacts (`DA` new or supersession).
- Mark the branch terminal (set `PG-NNNN.state_snapshot.continuation.terminal_status: terminal_closed` with `terminal_rationale`).

Supersession is file-level append-only per shared contract §3 — a new record file (e.g., `SREL-NNNN+1.yaml`) carries `supersedes: SREL-NNNN` in its YAML body. The existing `create_*_record` patch ops handle this.

**Deaths and removals are first-class outcomes.** Do not protect "main characters" with out-of-world logic. When an entity dies, becomes incapacitated, or becomes unavailable, reconcile in the same delta:

- Their open `STINT` (supersede to `abandoned` / `transferred`).
- `OBL` owed by or to them (supersede or close).
- `SREL` (supersede; status becomes `severed` or `mourning` per context).
- Witness `BEL` records (Phase 4 covers).
- `STOBJ.controlled_by` they controlled (supersede).
- Future choice availability (Phase 9 gate 7 filters).

## Phase 4: Update belief and visibility state

For every public, witnessed, hidden, or deceptive event in the delta, draft `BEL` records per shared contract §4.1 + FOUNDATIONS §Story Bundles §6a:

- Who knows (`truth_relation: true`, `visibility: shared` or `public`, `confidence: certain`).
- Who suspects (`truth_relation: unknown`, `confidence: suspected`).
- Who misunderstands (`truth_relation: partly_true | false`, `confidence: certain`).
- Who can prove it (`consequences.opens[]` linking to potential `OBL` / `CNSQ`).
- What rumor or lie may spread (additional `BEL` with `visibility: shared`, `confidence: rumor`; or `performative_lie` when the holder knows the claim is false but presents it as true).
- What choices are now constrained (`consequences.constrains_choices[]` linking to upcoming `CHC`).

**This phase is mandatory** for any action involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual. Phase 9 turn-cycle-additional check 3 verifies coverage.

## Phase 5: Check mystery and canon authority

Classify every new resolution-like claim in the delta per shared contract §11:

- `apparent` — what appears to be true from the cast's epistemic position; recorded on `BEL` records.
- `branch_local_counterfactual` — true only in this branch; recorded on `SF` with branch-scoped certainty.
- `canon_candidate` — may be world-level truth; held for promotion via `story-fact-promotion-to-canon`.

If the action would resolve any mystery with `status: forbidden`, abort before patch submission with a mystery-firewall error. If the action asserts a `canon_candidate` claim, set `outcome_route: promotion_hold` and ensure the state delta records ONLY the branch-local appearance; emit `SE.promotion_claims[]` so the user knows to invoke `story-fact-promotion-to-canon` after this turn lands.

## Phase 6: Materialize next page snapshot

Draft `SE-NNNN` per shared contract §4.3:

```yaml
id: SE-NNNN
event_kind: selected_choice | write_in_attempt | world_block | repair | terminal
actor: STENT-NNNN | system | unknown
targets: [<record id>]
outcome_route: accept | accommodate | attempt | world_block | promotion_hold | terminal
world_logic_rationale: <why this route follows from current state + world canon>
state_delta:
  create: [<every record id created this turn>]
  supersede: [<every record id that received a supersession>]
  close: [<every record id closed this turn>]
promotion_claims:
  - source_record: <SF-NNNN | BEL-NNNN | DA-NNNN | STENT-NNNN>
    authority: apparent | branch_local_counterfactual | canon_candidate
```

Draft `PG-NNNN` per shared contract §4.2:

- `parent_page_id: <parent>`, `branch_id: <active or new>`, `turn_index: parent.turn_index + 1`.
- `input.choice_id` OR `input.manual_action_text` (exactly one non-null), `input.resolved_event_id: SE-NNNN`.
- `state_hash_parent: parent.state_hash`, `state_hash: <computed>`.
- Full `state_snapshot`: `active_records` (per-class lists including `BEL` key); `entity_status` per active STENT; `visible_affordances` recomputed for the new location/context; `unresolved_mystery_claims` updated; `continuation` (`has_eligible_commitment_block`, `terminal_status`, `terminal_rationale`).
- `plan.path: pages-prose-plans/PG-NNNN.md`, `plan.plan_hash: <computed>`.
- `rendered_prose.path: null`, `rendered_prose.receipt_path: null`.
- `validation_trace`: populated by Phase 9.

The snapshot is the future fork point — complete enough to be a valid parent for any subsequent turn-cycle invocation regardless of whether its prose is ever rendered (per FOUNDATIONS §Story Bundles §4a).

## Phase 7: Author the page plan

Write `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-NNNN.md` per shared contract §8 — 19 sections.

**§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `reports/prose-quality-instructions.md`.** Operationally load-bearing — external prose renderer has no cross-plan state; every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.

Turn-cycle-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to this turn's action; §5 enumerates active cast and entity statuses **as of this turn** (including any deaths, captures, or status changes from Phase 3); §6 names current location and grounded affordances; §7 dramatizes the resolved event (the chosen CHC or write-in interpretation + the `outcome_route` + the `world_logic_rationale`); §8 names the required beats from the selected or JIT commitment block; §9 names load-bearing relationships and beliefs AFTER Phase 4 updates; §10 lists open `OBL` / `CNSQ` / `THR` that must be honored; §11 names forbidden mystery resolutions; §12 names the intended stopping point; §13 previews emitted choices (or marks terminal); §14 (optional) inlines recent rendered prose continuity from `pages-prose/<recent>.md` when available.

The plan must not expose engine jargon to prose. Engine terms confined to §15 frontmatter only. No word-count targets (per FOUNDATIONS §Story Bundles §9).

## Phase 8: Generate next choices

Emit 3–5 `CHC` records if the new page stops at a real commitment hinge. Emit a single continue-or-pause `CHC` if continuing into the next beat without a meaningful commitment surface. Emit zero `CHC` if the branch is terminal — in that case, set `PG-NNNN.state_snapshot.continuation.terminal_status: terminal_closed` with `terminal_rationale` naming how high-salience debts were closed, abandoned, inherited, or intentionally left unresolved.

The next choice set should include different axes (action vs restraint, truth vs deception, intimacy vs distance, risk vs safety, public vs private, duty vs desire). Always allow a write-in slot unless the branch is terminal.

Each `CHC` carries `surface_label`, `player_visible_intent`, `target_or_action_family`, `likely_state_pressure`, `associated_commitment_block` (`SLT-NNNN` or null — turn-cycle will JIT next turn if null), `success_policy` (only when `target_or_action_family == 'attempt'`).

## Phase 9: Validate

Run the 8 shared hard gates per shared contract §7 against the drafted records. Populate `PG-NNNN.validation_trace` with one-line PASS rationale per gate:

1. **input legality** — XOR action source enforced; chosen CHC belongs to parent and is not retired; bundle + parent exist.
2. **parent snapshot compatibility** — `parent.state_hash` matches `PG-NNNN.state_hash_parent`.
3. **mystery / invariant firewall** — no forbidden `M-NNNN` resolved; INV honored; selected SLT's `mystery_policy.forbidden_resolutions` respected.
4. **branch isolation** — no sibling-branch records in new snapshot's `active_records`; no author-pool SLT references branch-local record ids.
5. **append-only delta** — all changes in `SE.state_delta` are creates / supersessions / closes; supersession is a new record file (no in-place mutation of structural fields).
6. **consequence capacity or terminal proof** — at least one eligible SLT (author-pool or JIT-able) OR `terminal_closed` with `terminal_rationale` covering high-salience debt closure.
7. **plan grounding** — every declared affordance / required beat / emitted CHC is grounded in active records or world canon.
8. **canon promotion hold** — if `outcome_route == promotion_hold` or any `SE.promotion_claims[].authority == canon_candidate`, the state delta records only the branch-local appearance. Marked `NOT_APPLICABLE` with rationale when no canon claim is in play.

Plus 4 turn-cycle-additional checks (recorded in working memory):

1. **Action source legality** — XOR enforced; chosen CHC not retired.
2. **Entity death / incapacity reconciliation** — when Phase 3 applied death/incapacity, the open intentions / obligations / relationships / object-controlled / belief-witness consequences are in the same delta.
3. **Belief / visibility coverage** — every action involving secrecy / betrayal / deception / violence / sex / law / status / public ritual produces at least one BEL create or supersession.
4. **Write-in world-logic rationale** — when `manual_action_text` is the action source, `SE.world_logic_rationale` is non-empty and explains the route (silent rejection forbidden).

If any gate or additional check fails, abort before Phase 10 — write nothing.

## Phase 10: Commit / Write — HARD-GATE fires

1. Build the patch plan covering every record drafted in Phases 1-8 as a single envelope. Operations include `create_se_record`, `create_pg_record` (always), `create_br_record` (if fork), `create_*_record` for every changed record class (each new file carrying `supersedes:` in its YAML body when applicable — supersession is file-level append-only per shared contract §3, using the existing `create_*_record` ops), `create_chc_record` per emission, `create_slt_record` if Phase 2 created a JIT block. BEL writes via `create_bel_record` (PEENH-007 lands the op).
2. Dry-run via `mcp__worldloom__validate_patch_plan`. This run exercises `record_schema_compliance` for BEL (VALENH-011 lands the BEL schema entry).
3. Present the complete deliverable summary to the user:
   - Branch label (continuation of `BR-NNNN` or fork into new `BR-NNNN`).
   - Resolved outcome route (`accept` / `accommodate` / `attempt` / `world_block` / `promotion_hold` / `terminal`).
   - State delta inventory (creates + supersessions + closes per class).
   - Commitment block used (author-pool `SLT-NNNN` or new JIT `SLT-NNNN`).
   - Page plan structural preview (§5 / §6 / §7 / §12 / §13 — verbatim §2 / §3 / §19 excluded for length).
   - Emitted choices list (or terminal rationale).
   - Any `SE.promotion_claims[]` requiring a follow-up `story-fact-promotion-to-canon` invocation.
4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
5. On approval: obtain patch approval token; submit the patch plan via `mcp__worldloom__submit_patch_plan`.
6. On patch success: write `pages-prose-plans/PG-NNNN.md` → update bundle `INDEX.md` (per shared contract §10 write order).
7. Report page path + record inventory to the user. If `promotion_claims[]` were emitted, surface the recommended next step (invoke `story-fact-promotion-to-canon` with the new `SE-NNNN` as evidence). Do NOT `git commit`.

**Failure behavior**: patch fail → write nothing; surface failed gate. Patch success + markdown fail → story-bundle `_source/` authoritative; surface partial-failure; no silent retry. Terminal page without `terminal_rationale` → authoring error, abort before patch.

## Runtime Shortcut

For `execution_mode: interactive_runtime`, the engine uses this fast path:

```
parent snapshot → action route → commitment block → state delta → next snapshot → plan → choices
```

Only the page plan requires long-form language generation. All other state work is compact structured YAML produced from the parent snapshot + selected / JIT block. The HARD-GATE still fires at Phase 10 — runtime mode does not bypass user approval.

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — Phase 3 + Phase 7. Mechanism: every drafted record conforms to shared contract §4 schemas; Phase 9 gate 7 (plan grounding) requires every declared affordance / required beat / emitted CHC to be grounded in active records or world canon.
- **Rule 4 (No Globalization by Accident)** — Phase 5 + Phase 9 gate 4. Mechanism: Phase 5 canon-authority classification keeps branch-local truth from leaking world-wide (`branch_local_counterfactual` vs. `canon_candidate`); Phase 9 gate 4 branch isolation rejects sibling-branch records.
- **Rule 5 (No Consequence Evasion)** — Phase 3 + Phase 9 gate 6. Mechanism: Phase 3 death/incapacity reconciliation propagates second-order effects in the same delta; Phase 9 gate 6 requires continuation capacity (eligible SLT) or terminal proof (rationale naming high-salience debt closure).
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 5 + Phase 9 gate 3. Mechanism: Phase 5 classifies claims and rejects forbidden mystery resolution; Phase 9 gate 3 mystery firewall verifies no forbidden `M-NNNN` is resolved and no selected SLT's `mystery_policy.forbidden_resolutions` is breached.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-state-contract.md` §4 (`BEL` §4.1, `PG` §4.2, `SE` §4.3, `SLT` §4.4). No skill-local templates needed — the shared contract is the canonical reference.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 3, 7 | Shared contract §4 record schemas; Phase 9 gate 7 plan grounding. |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — turn-cycle mutates branch-local story state; world canon is not touched. Handoff to `canon-addition` via `story-fact-promotion-to-canon` when a story claim promotes. |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — same handoff as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 5, 9 | Phase 5 canon-authority classification; Phase 9 gate 4 branch isolation. |
| Rule 5 (No Consequence Evasion) | Phase 3, 9 | Phase 3 death/incapacity reconciliation; Phase 9 gate 6 continuation or terminal proof. |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — turn-cycle mutates story-bundle scope, not world canon. World canon retcon routes through `canon-addition`. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 5, 9 | Phase 5 forbidden-mystery rejection; Phase 9 gate 3 mystery firewall. |
| Rule 11 (No Spectator Castes) | N/A | Not applicable — Rule 11 governs new exceptional capabilities at world canon. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — story-bundle scope, not world canon. |
| Canon Layers | Pre-flight, Phase 5 | World canon layers loaded via context packet; story-bundle records carry story-local truths per FOUNDATIONS §Story Bundles §1. |
| Mystery Reserve | Pre-flight, Phase 5, 9 | Whole-class Mystery Reserve loaded; Phase 5 classification; Phase 9 gate 3 enforces firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | Pre-flight, Phase 6, 10 | `accept_parent_unrendered: true` default; PG-NNNN.rendered_prose.path null at commit; no ARC_TRACE emitted; the new PG is the next fork primitive. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2 | Selected or JIT SLT records follow §4.4 schema discipline; JIT blocks have 1-5 beats and minimal effects; no `arc_contract` / `dramatic_unit` / `stop_policy` / shape discriminators. |
| §Story Bundles §5b (Schema-Minimalism) | All record-drafting phases | Every drafted record conforms to shared contract §4 schemas; supersession is file-level append-only via `supersedes:` field, no new patch op. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 4 | Mandatory `BEL` records for actions involving secrecy / betrayal / deception / violence / sex / law / status / public ritual; `truth_relation` + `visibility` + `confidence` consumed by social-state firewall. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle records at `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` are the exclusive write surface, routed through the patch engine.
- **Never write rendered prose at turn-cycle.** Rendered prose at `pages-prose/PG-NNNN.md` is supplied externally and validated by `branching-story-prose-attach`. Turn-cycle writes only the plan and updates the bundle INDEX.
- **Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` and a page plan. `world_block` and `terminal` are first-class outcomes routed through the same machinery as `accept`.
- **Deaths and removals are first-class outcomes.** No main-character protection via out-of-world logic. Phase 3 reconciliation propagates death / incapacity effects in the same delta.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4 schemas. No nice-to-have fields. Supersession is file-level append-only (a new record file carrying `supersedes:` in its YAML body, using existing `create_*_record` ops).
- **Verbatim §2 / §3 / §19 of the page plan** inlined from `reports/prose-quality-instructions.md` on every page. Operationally load-bearing — external LLM has no cross-plan state.
- **No word-count targets** anywhere in the plan (per FOUNDATIONS §Story Bundles §9). Pacing is expressed structurally via beats and stop conditions.
- **Skills do not chain.** Turn-cycle never invokes `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. When `promotion_claims[]` are emitted, turn-cycle surfaces the recommendation; the user separately invokes `story-fact-promotion-to-canon` with the new `SE-NNNN` as evidence.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
- **Known integration debt**:
  - **MCPENH-040** — Register `BEL` id class in `tools/world-mcp/src/tools/allocate-next-id.ts`; drop `ARCTRACE` registration. Lands as a rebuilt-family prerequisite per bootstrap's Shape C rollout. Turn-cycle's Pre-flight step 7 depends on this for `BEL` allocation.
  - **PEENH-007** — Add `create_bel_record` operation to `tools/patch-engine/src/envelope/schema.ts`. Ships alongside the rebuilt family. Turn-cycle's Phase 10 submits `create_bel_record` ops.
  - **VALENH-011** — Register `BEL` in `record_schema_compliance` and structural validators; drop ARC_TRACE-related validators. Ships alongside the rebuilt family. Turn-cycle's Phase 10 dry-run exercises the BEL validator.

## Final Rule

Turn-cycle advances story state by exactly one causal tick from any committed page snapshot — continuation or fork — without requiring rendered parent prose, without silent rejection of any action, and without ever mutating world canon.
