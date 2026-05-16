---
name: branching-story-turn-cycle
description: "Use when advancing a branching-story bundle by one causal tick from any parent page — continuation or fork. Produces: one SE event + new/superseding story-bundle records (STSTAT/STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA as needed) + optional new BR (fork) + new PG with full state snapshot + optional JIT SLT + 0-5 new CHC + pages-prose-plans/PG-<integer>.md + bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: parent_page_id
    description: "PG-<integer>; any committed page in the bundle. Continuation is implicit when parent is the active branch leaf; fork is implicit when parent is any non-leaf page or a sibling-branch leaf."
    required: true
  - name: chosen_choice_id
    description: "CHC-<integer> emitted by parent_page_id. Exactly one of chosen_choice_id / manual_action_text must be supplied (XOR enforced at Pre-flight step 5)."
    required: false
  - name: manual_action_text
    description: "Natural-language player write-in. Exactly one of chosen_choice_id / manual_action_text must be supplied (XOR enforced at Pre-flight step 5)."
    required: false
  - name: execution_mode
    description: "authoring | interactive_runtime | batch; default: authoring"
    required: false
  - name: force_branch_id
    description: "When intentionally forking into a named branch; otherwise the skill derives BR-<integer> from continuation-vs-fork detection"
    required: false
  - name: accept_parent_unrendered
    description: "true | false; default: true. Setting false aborts Pre-flight when pages-prose/<parent_page_id>.md is absent. Default true honors FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary)."
    required: false
---

# Branching Story Turn Cycle

Advance a branching-story bundle by one causal tick from any committed parent page — continuation or fork. Consumes a chosen `CHC` or write-in, applies world logic to route the action, commits the resulting state delta, materializes the next page snapshot, authors the comprehensive prose plan for the next page, and emits the next choices. Parent rendered prose is optional.

<HARD-GATE>
Do NOT write `pages-prose-plans/PG-<integer>.md` or update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, AND do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; `STORY_KERNEL.md` loaded, including `## Player Agency Contract`; parent page loaded from `_source/pages/<parent_page_id>.yaml`; XOR action source verified (exactly one of `chosen_choice_id` / `manual_action_text` non-null; chosen CHC belongs to parent and is not retired); continuation-vs-fork detected; ids allocated via `mcp__worldloom__allocate_next_id`; context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', ...)`; parent prose policy verified.

(b) Phases 1-9 have completed in working memory: action resolved to exactly one of six outcome routes (`accept | accommodate | attempt | world_block | promotion_hold | terminal`); commitment block selected from the author pool OR a branch-scoped JIT block created; state delta drafted (creates / supersessions via new record files carrying `supersedes:`); mandatory BEL updates drafted per FOUNDATIONS §Story Bundles §6a; parent-page canon-baseline drift classified per FOUNDATIONS §Story Bundles §4b; mystery and canon authority classified per shared contract §11; `SE-<integer>` and `PG-<integer>` drafted with full `state_snapshot` and `validation_trace`; `pages-prose-plans/PG-<integer>.md` drafted with all 19 sections including verbatim §2 / §3 / §19 inlined from `reports/prose-quality-instructions.md`; next `CHC` records drafted (3-5 for commitment-hinge stop; 1 for continue-or-pause; 0 for terminal).

(c) Phase 9 has validated all 8 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 with a one-line PASS rationale per gate on `PG-<integer>.validation_trace`, plus the 11 turn-cycle-additional checks (action source legality, entity death/incapacity reconciliation, belief/visibility coverage, expected witness tag presence, write-in world-logic rationale, Selection Rationale, Motivation Grounding, causal dependency threat scan, choice-set noncollapse, Choice Consequence Integrity, Canon Baseline Drift).

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
Phase 6: Materialize next page snapshot → SE-<integer> + PG-<integer> (in memory)
        |
        v
Phase 7: Author page plan → pages-prose-plans/PG-<integer>.md (in memory)
        |
        v
Phase 8: Generate next choices → CHC records (in memory; 0 for terminal)
        |
        v
Phase 9: Validate against shared 8 hard gates + 11 turn-cycle-additional;
  compute final PG hashes per shared contract §4.2a
        |
        v
Phase 10: HARD-GATE fires → atomic patch + markdown writes
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `parent_page_id` — `PG-<integer>` — any committed page in the bundle

### XOR-required (exactly one)

- `chosen_choice_id` — `CHC-<integer>` emitted by `parent_page_id` and not retired
- `manual_action_text` — natural-language player write-in

### Optional

- `execution_mode` — enum — `authoring | interactive_runtime | batch`; default: `authoring`
- `force_branch_id` — `BR-<integer>` — when intentionally forking into a named branch
- `accept_parent_unrendered` — `true | false` — default: `true` (honors FOUNDATIONS §Story Bundles §4a)

## Output

| Class | File path | Created when |
|---|---|---|
| `SE-<integer>` | `_source/events/SE-<integer>.yaml` | Always (the causal tick) |
| `PG-<integer>` | `_source/pages/PG-<integer>.yaml` | Always |
| `BR-<integer>` | `_source/branches/BR-<integer>.yaml` | IF fork (parent is non-leaf OR `force_branch_id` set) |
| `STSTAT-<integer>` (new or supersession) | `_source/status/STSTAT-<integer>.yaml` | IF life / agency / location changes; exactly one active status record per active `STENT` |
| `STENT-<integer>` (supersession) | `_source/entities/STENT-<integer>.yaml` | IF identity mirror / role metadata changes; not for life / agency / location status |
| `STINT-<integer>` (new or supersession) | `_source/intentions/STINT-<integer>.yaml` | IF intentions change this turn |
| `SF-<integer>` | `_source/facts/SF-<integer>.yaml` | IF new branch-local facts emerge; every SF carries `authority` per shared contract §4.5.3 |
| `BEL-<integer>` (new or supersession) | `_source/beliefs/BEL-<integer>.yaml` | IF belief/visibility changes — **mandatory** for actions involving secrecy / betrayal / deception / violence / sex / law / status / public ritual (Phase 4) |
| `OBL-<integer>` (new or supersession) | `_source/obligations/OBL-<integer>.yaml` | IF obligations open / close / escalate |
| `CNSQ-<integer>` | `_source/consequences/CNSQ-<integer>.yaml` | IF consequences fire |
| `THR-<integer>` (supersession) | `_source/threads/THR-<integer>.yaml` | IF threads advance or close |
| `SREL-<integer>` (supersession) | `_source/relationships/SREL-<integer>.yaml` | IF relationships change (mandatory after death/incapacity reconciliation) |
| `STLOC-<integer>` | `_source/locations/STLOC-<integer>.yaml` | IF new story-local location introduced |
| `STOBJ-<integer>` (new or supersession) | `_source/objects/STOBJ-<integer>.yaml` | IF objects are created / moved / changed |
| `DA-<integer>` | `_source/artifacts/DA-<integer>.yaml` | IF in-story diegetic artifact introduced |
| `SLT-<integer>` | `_source/storylets/SLT-<integer>.yaml` | IF Phase 2 created a JIT block (`provenance.origin: runtime_jit`) |
| `CHC-<integer>` | `_source/choices/CHC-<integer>.yaml` | 3-5 records if Phase 8 emits choice set; 1 for continue-or-pause; 0 if terminal |
| Page plan | `pages-prose-plans/PG-<integer>.md` | Always |
| Bundle INDEX | `INDEX.md` | Always (updated) |

Atomic-record writes route through `mcp__worldloom__submit_patch_plan`. Supersession is file-level append-only per shared contract §3 — a "supersession" is a new record file carrying `supersedes: <prior-id>`, using the existing `create_*_record` ops. Markdown writes are direct after patch submission per shared contract §10.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles (especially §4a Plan-Authority Boundary, §4b Canon Baseline Drift, §5 / §5a / §5b, §6a Belief vs. Fact) governs this skill
- `.claude/skills/_shared-templates/story-state-contract.md` — shared schemas (§4), predicate DSL (§5), action routing (§6), eight hard gates (§7), page-plan minimum contract (§8), branching procedure (§9), shared write order (§10)
- `reports/prose-quality-instructions.md` — canonical source for verbatim §2 / §3 / §19 of the page plan
- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` and `INDEX.md` — bundle root context
- `worlds/<world_slug>/stories/<story_slug>/_source/pages/<parent_page_id>.yaml` — parent page; MUST exist
- Parent's `state_snapshot.active_records` resolved to their `_source/<class>/*.yaml` files
- Optional `pages-prose/<recent>.md` for §14 continuity (only when parent prose exists)
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>, token_budget=<default>)`.
  Derive world-scope `seed_nodes` only from schema-backed anchors per the shared story-state contract §4 schemas:
  - active `STENT.bound_char_id` values when non-null;
  - active `STLOC.bound_ent` values when non-null;
  - parent `PG.state_snapshot.unresolved_mystery_claims[].mystery_id`;
  - parent `CF-<integer>` ids named by active mirrored `SF.derived_from[]`;
  - active-period `CH-<integer>` / `SEC-*` / `CF-<integer>` / `ENT-<integer>` anchors when already known from loaded world-canon context.
  Do not derive seeds from story-local ids or from fields not defined in the shared story-state contract. In particular, do not pass `STENT`, `STLOC`, `STSTAT`, `SF`, `BEL`, `PG`, `SE`, `CHC`, `SLT`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STOBJ`, `BR`, `SLB`, `SAU`, `SP`, or `RSP` ids as context-packet `seed_nodes`; story-local records are loaded through `story_slug` + `story_bundle_context`, `mcp__worldloom__get_records(record_ids=..., story_slug=<story_slug>)`, or `mcp__worldloom__list_records(record_type=..., story_slug=<story_slug>)`. The MCP server-side `story_local_seed_nodes_ignored` warning is a defensive backstop, not a substitute for this discipline. The latest `change_log_entry` in governing context is the current world-canon revision for §4b drift-trigger comparison. If the parent baseline is stale, targeted follow-up retrieval of the intervening CH window and CF-to-section reverse links is required before drift classification.
  Seed derivation conforms to story-state contract §4.5.1 (STENT) and §4.5.8 (STLOC); deviation requires contract amendment first.
- `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` — canonical CLI for deterministic PG hash computation per shared contract §4.2a "Tooling" subsection; consumed at Phase 9 step 2. Reuses the shared `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers exported from `@worldloom/world-index/hash/content` that the validator's `snapshot_replay_equality` consumes — single source of truth across authoring and validation paths. Hand-rolling the canonical-JSON serializer is forbidden.

The bundle MUST exist (non-bootstrap variant); parent page MUST exist; the new `_source/pages/PG-<integer>.yaml` MUST NOT exist (collision aborts Pre-flight).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `reports/prose-quality-instructions.md` into working context. Abort with clear missing-file error on any unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if the directory does not exist or is missing `STORY_KERNEL.md` / `_source/`.
3. Load `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` and its `## Player Agency Contract` section. Abort with agency-contract-missing error if the section is absent or does not name the agency surface, write-in envelope, and viewpoint limits.
4. Load `worlds/<world_slug>/stories/<story_slug>/_source/pages/<parent_page_id>.yaml`. Abort with parent-not-found error if missing.
5. Verify XOR action source: exactly one of `chosen_choice_id` / `manual_action_text` non-null. If `chosen_choice_id` supplied, verify the CHC exists, was emitted by `parent_page_id`, and is not retired. Abort with action-source error on any failure.
6. Detect continuation vs fork: continuation when `parent_page_id` is the active leaf of `parent.branch_id` and no `force_branch_id` is set; fork otherwise. Allocate a new `BR-<integer>` via `mcp__worldloom__allocate_next_id(world_slug, 'BR', story_slug=<story_slug>)` for forks.
7. Verify parent prose policy: if `accept_parent_unrendered: false` and `worlds/<world_slug>/stories/<story_slug>/pages-prose/<parent_page_id>.md` is absent on disk, abort with parent-unrendered error. Default `true` bypasses the check.
8. Allocate ids via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)` for: `SE`, `PG`, optional `BR`, candidate ids per record class (lazily on first use), `CHC` ids in Phase 8 after the page stop-point is known.
9. Load parent's `state_snapshot.active_records` into working state. Load optional parent + grandparent `pages-prose/*.md` if available for §14 continuity. Load whole-class Mystery Reserve and Invariants via context packet. Extract the current world-canon revision from the latest `change_log_entry` in the context packet (`CH-<integer>`, or `null` only if no change log exists).
10. If `parent.state_snapshot.canon_revision != current_world_canon_revision`, retrieve the full CH window before classification:
    - Call `mcp__worldloom__get_records(record_ids=<every CH id newer than parent baseline>, world_slug=<world_slug>)`.
    - For every CH `affected_fact_ids[]` entry, call `mcp__worldloom__find_sections_touched_by(cf_id)` or equivalent targeted retrieval to enumerate SEC / M / INV records whose `touched_by_cf[]` back-pointers include that CF id.
    - Treat the latest CH as the trigger only; classify from the full intervening CH window plus CF reverse-lookup evidence.
11. Compare `parent.state_snapshot.canon_revision` against the current world-canon revision and classify canon-baseline drift as exactly one of `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict`. Abort before Phase 1 unless the classification is `compatible` or `grandfathered`; route the other classifications to `branching-story-health-audit`, a repair turn, or `story-fact-promotion-to-canon` / `canon-addition` as appropriate. Record the classification and cited CH ids in working memory for the page plan and `validation_trace.parent_snapshot_compatibility` rationale.
12. Verify the new `_source/pages/PG-<integer>.yaml` does NOT already exist (defensive against a stale allocator state). Abort on collision.

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Resolve the action

If `chosen_choice_id` is supplied, load the `CHC` record; its action-family list, `associated_commitment_block`, and `success_policy` (if any) drive the routing.

If `manual_action_text` is supplied, parse it into a structured `proposed_action`:

```yaml
proposed_action:
  actor: STENT-<integer> | player_character | unknown
  action_family: move | evade | pursue | perceive | investigate | communicate | persuade | negotiate | bond | oppose | harm | protect | control | transfer | use | make_change | ritual_protocol | recover | wait | decide
  target_records: [<record id>]
  intended_outcome: <natural-language statement>
  visible_method: <natural-language statement>
  implied_claims: [<short label>]
```

The `## Player Agency Contract` is a required routing input for `manual_action_text`. Parse the action against:

- **Agency surface** — the actor must be the controlled `STENT` or a permitted multi-entity/proxy action named by the contract.
- **Write-in envelope** — the action family and method must fit the bundle's admissible manual-action categories; out-of-envelope actions route to `world_block` or `promotion_hold` as appropriate, never silent rejection.
- **Viewpoint limits** — private knowledge not available to the viewpoint character can guide a write-in only when the contract explicitly permits player-over-character knowledge.

Route to exactly one of six outcomes per shared contract §6:

- `accept` — the action can happen as stated given current state + world canon.
- `accommodate` — the intent is honored but world constraints transform the surface.
- `attempt` — success is uncertain; resolve by state / capability / opposition / consequences; define a success / partial-success / failure path.
- `world_block` — the action is impossible in the current world/state; the page dramatizes the failed attempt or the impossibility itself.
- `promotion_hold` — the action asserts a world-level truth or canon mystery resolution; pauses for `story-fact-promotion-to-canon`. The state delta records ONLY the branch-local appearance, not the canon claim as already true.
- `terminal` — the action coherently closes the branch.

Draft `SE.resolution` before leaving Phase 1:

- Required for `attempt`, `accommodate`, and `world_block`.
- `attempt` uses `result: success | partial_success | failure`.
- `accommodate` uses `result: partial_success | transformed`.
- `world_block` uses `result: impossible | failure`.
- `promotion_hold` may omit `resolution`, or use `result: held_for_promotion` when the page should explicitly surface that the result is held for promotion.
- `terminal` may omit `resolution`, or use `result: success | partial_success | failure | transformed` when the closure needs explicit consequence feedback.
- `accept` omits `resolution`.

When `resolution` is present, set `player_visible_feedback` to one sentence naming what the player should be able to perceive about why the action resolved this way. Do not add `reason_class`; the route, result, rationale, and state delta are sufficient.

**Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` record with `world_logic_rationale` explaining the route plus a page plan that dramatizes the outcome.

## Phase 2: Select or JIT-create a commitment block

Filter the bundle's `SLT` records for eligibility against the parent snapshot:

- All `preconditions.hard` predicates evaluate true (per shared contract §5 closed predicate DSL).
- `scope.visibility: global_author_pool` blocks are universally eligible (subject to predicates); `scope.visibility: branch_prefix_scoped` blocks are eligible when `scope.branch_id` is in the active branch's lineage; `scope.visibility: branch_scoped` blocks are eligible only when `scope.branch_id` matches the active or new branch.
- For action grounding, prefer `affordance_available_to(<actor>, <action_family>)`; `has_affordance(<action_family>)` is only an actor-agnostic author-pool prefilter when the actor is not yet bound.
- Resolve predicate DSL v2 existential predicates (`any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`) against the parent snapshot before ranking. Each satisfied existential predicate binds its `alias` to the matched active record for this selection only. The match must satisfy every supplied filter (`kind`, `urgency`, role, axis/comparator/value, belief mode, truth relation, or visibility); if multiple records match, retain all bindings for ranking and choose the concrete binding with the selected block.
- Apply the Information / Observer Firewall before selecting the block: the proposed actor-binding and move may rely only on information available to the acting entity through active `BEL`, direct observation, accessible `DA` / `STOBJ` evidence, testimony, document access, inference, surveillance, institutional channel, magic/tech, or another recorded access route. If the block's target, precondition match, or planned beat depends on narrator-only knowledge or knowledge held only by another actor, the block is ineligible unless the plan records a valid access route for the acting entity and the supporting record ids that make the route auditable.
- Evaluate `record_age(<record_id | bound:<alias>>, comparator, pages)` by deriving the matched record's age from its `created_at_page` position in the parent page's `branch_path` through the evaluating page. Use it only as present causal state: pressure can mature because a record has remained open across pages, never because the story reached an act or dramatic timer.
- Enforce `saliency.cooldown_pages`: scan prior pages in the active `PG.branch_path`, read each page's resolved `SE.commitment.selected_slt_id`, and reject an `SLT` whose last firing is within its `saliency.cooldown_pages` window of the current page. `cooldown_pages: 0` means no cooldown rejection.
- `mystery_policy.forbidden_resolutions` does not include any mystery the resolved action would resolve.
- `mystery_policy.allowed_authority` is compatible with `outcome_route`.

Rank eligible blocks by: (1) `move_family` × `action_family` match; (2) `saliency.urgency` (high > medium > low); (3) coverage of `target_records`; (4) diversity (avoid repeating the most-recently-used `move_family` on this branch).

**Alias-binding resolution order**: bind first, select second, instantiate third. During eligibility, evaluate every hard precondition and build the candidate alias-binding set. During ranking/selection, choose one concrete binding set for the selected `SLT`. Before Phase 3 drafts the `SE.state_delta`, replace every `bound:<alias>` in the selected block's `effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects` with the bound record id from that chosen set. If any `bound:<alias>` lacks a same-`SLT` binding, the block is invalid and cannot be selected; do not defer alias resolution to prose planning or approval time.

If no eligible block exists, create one branch-scoped JIT block:

- `scope.visibility: branch_scoped`, `scope.branch_id: <active or new branch>`, `created_at_page: <new PG id>`, `provenance.origin: runtime_jit`.
- 1–5 beats authored from the action + current state.
- Predicates reference only records active in the parent snapshot. JIT blocks are branch-scoped, so use exact-ID predicates rather than predicate DSL v2 existential author-pool prefilters.
- `mystery_policy` honors the firewall.

Avoid pre-emptive JIT creation. If a flexible author-pool block fits with slight reframing, prefer that block. JIT blocks follow FOUNDATIONS §Story Bundles §5a (commitment blocks are causal moves, not dramatic acts or arcs) — no `arc_contract` / `dramatic_unit` / `execution_envelope` / `stop_policy` / shape discriminators.

## Phase 3: Apply the state delta

Apply exactly one causal delta from parent snapshot. The delta may:

- Honor the selected `SLT`'s instantiated effects: after Phase 2's bind-then-instantiate step, any former `bound:<alias>` targets are concrete record ids and must be treated like exact effect targets in `SE.state_delta`.
- Create new facts (`SF`) or beliefs (`BEL`).
- Supersede beliefs when truth-relation or visibility changes (every public discovery, betrayal, lie, or confession produces at least one `BEL` create or supersession in this phase or Phase 4 per FOUNDATIONS §6a).
- Change entity status (life / agency / location) via `STSTAT` supersession — death, incapacity, absence, injury, capture, escape are first-class.
- Update intentions (`STINT` supersession).
- Update relationships (`SREL` supersession).
- Open / close / escalate obligations (`OBL` supersession or new), always setting `urgency` on the emitted record.
- Create consequences (`CNSQ` new), always setting `urgency` on the emitted record.
- Advance or close threads (`THR` supersession).
- Move entities or objects (`STSTAT.location` supersession for entity movement; `STOBJ` supersession for object movement).
- Create or alter story-local artifacts (`DA` new or supersession).
- Mark the branch terminal (set `PG-<integer>.state_snapshot.continuation.terminal_status: terminal_closed` with `terminal_rationale`).

Supersession is file-level append-only per shared contract §3 — a new record file (e.g., a new `SREL-<integer>.yaml` or `STSTAT-<integer>.yaml`) carries `supersedes: <prior-id>` in its YAML body. The existing `create_*_record` patch ops handle this.

For every life / agency / location change, supersede the affected entity's active `STSTAT` record and include both the superseded id and the new `STSTAT` id in `SE.state_delta` (`supersede` and `create`, respectively). Do not encode those status changes by superseding `STENT`; `STENT` remains stable identity / role metadata. Recompute `PG.state_snapshot.entity_status` from the resulting active `STSTAT` set.

**Deaths and removals are first-class outcomes.** Do not protect "main characters" with out-of-world logic. When an entity dies, becomes incapacitated, or becomes unavailable, reconcile in the same delta:

- Their open `STINT` records — close each in `SE.state_delta.close`; for an intention transferred to another holder, create a replacement `STINT` with the new `holder` and `supersedes` linking the closed/replaced intention. `STINT` has no `status` or `derived_from` field.
- `OBL` owed by or to them (supersede or close).
- Affected `SREL` records — supersede by changing `axis` / `direction` / `value` / `valence` / `description` as the death/incapacity warrants. `SREL` has no `status` field. `SREL.direction` uses shared contract §4.5.7's structured form: `kind: directed` requires non-null `from` and `to` STENT ids, while `kind: bidirectional` requires `from: null` and `to: null`.

```yaml
direction:
  kind: directed
  from: STENT-1
  to: STENT-2

direction:
  kind: bidirectional
  from: null
  to: null
```
- Witness `BEL` records (Phase 4 covers).
- Affected `STOBJ` records — supersede `owner` and/or `current_location` when death, capture, incapacity, or transfer changes custody. Do not use any separate control/custody field.
- Future choice availability (Phase 9 gate 7 filters).

## Phase 4: Update belief and visibility state

For every public, witnessed, hidden, or deceptive event in the delta, draft `BEL` records per shared contract §4.1 + FOUNDATIONS §Story Bundles §6a:

- First compute `expected_witnesses` for the event:
  - `direct`: active `STENT` records at the event location per active `STSTAT.location`, excluding entities whose active `STSTAT.agency` is unconscious, dead, incapacitated, or otherwise unavailable.
  - `indirect`: public or factional holders who would receive the event through law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or other accessible evidence (`DA` / `STOBJ` / location-state traces).
  - `excluded`: `STENT` records that are concealed, offstage, unconscious, socially barred, lacking access, or otherwise unable to perceive or receive the event.
- For every relevant direct or indirect witness group, account for propagation with either a created/superseded `BEL` or an explicit non-propagation rationale from this closed set: `no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`.
- Record each non-propagation rationale in `SE.world_logic_rationale` with the parseable tag form `non_propagation:<reason>(group=<label>, records=[<record_ids>])`, using one tag per uncovered witness group. The `group` label must match the direct or indirect witness group from `expected_witnesses`; `records` names the story records that prove concealment, incapacity, institutional suppression, lack of accessible trace, or other closed-set reason (use `records=[]` only for `no_witness` when no record can exist). Authoring notes may elaborate, but the tag in `SE.world_logic_rationale` is the replay authority for `branching-story-health-audit`.
- Who knows (`belief_mode: knows`, `truth_relation: true`, `visibility: shared` or `public`, `confidence: certain`).
- Who suspects (`belief_mode: suspects`, `truth_relation: unknown`, `confidence: medium | low`).
- Who misunderstands (`truth_relation: partly_true | false`, `confidence: certain`).
- Who can prove it (`consequences.opens[]` linking to potential `OBL` / `CNSQ`).
- What rumor or lie may spread (additional `BEL` with `belief_mode: reports`, `visibility: rumored`; or `belief_mode: deceives` when the holder knows the claim is false but presents it as true).
- What choices are now constrained (`consequences.constrains_choices[]` linking to upcoming `CHC`).
- For every created or superseding `BEL`, populate `basis.access_route` with one of the shared contract routes (`direct_observation`, `testimony`, `document`, `object_trace`, `location_trace`, `inference`, `surveillance`, `institutional_channel`, `magic_tech`, `rumor`, or `authorial_initialization`) and populate `basis.access_records` with the enabling `STENT` / `STLOC` / `STOBJ` / `DA` / `BEL` / `SF` / `SE` ids when the route depends on story records. Use `authorial_initialization` only for bundle-genesis beliefs whose access is seeded by the initial story setup rather than learned inside a prior event.

**This phase is mandatory** for any action involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual. Phase 9 turn-cycle-additional check 3 verifies expected-witness completeness, not mere `BEL` presence.

## Phase 5: Check mystery and canon authority

Classify every new resolution-like claim in the delta per shared contract §11:

- `apparent` — what appears to be true from the cast's epistemic position; recorded on `BEL` records.
- `branch_local` — ordinary branch-local truth; recorded on `SF`.
- `branch_local_counterfactual` — true only in this branch; recorded on `SF.authority` with branch-scoped truth.
- `canon_candidate` — may be world-level truth; recorded on `SF.authority` and held for promotion via `story-fact-promotion-to-canon`.

If the action would resolve any mystery with `status: forbidden`, abort before patch submission with a mystery-firewall error. If the action asserts a `canon_candidate` claim, set `outcome_route: promotion_hold` and ensure the state delta records ONLY the branch-local appearance; emit `SE.promotion_claims[]` so the user knows to invoke `story-fact-promotion-to-canon` after this turn lands.

## Phase 6: Materialize next page snapshot

Draft `SE-<integer>` per shared contract §4.3:

```yaml
id: SE-<integer>
event_kind: selected_choice | write_in_attempt | system_repair | audit_repair
actor: STENT-<integer> | system | unknown
targets: [<record id>]
commitment:
  selected_slt_id: SLT-<integer>
  selection_source: emitted_choice | author_pool | runtime_jit | system_repair | audit_repair
  alias_bindings:
    <alias>: <record id>
outcome_route: accept | accommodate | attempt | world_block | promotion_hold | terminal
resolution:
  result: success | partial_success | failure | impossible | transformed | held_for_promotion
  player_visible_feedback: <one-sentence player-legible consequence feedback>
world_logic_rationale: <why this route follows from current state + world canon>
state_delta:
  create: [<every record id created this turn>]
  supersede: [<every record id that received a supersession>]
  close: [<every record id closed this turn>]
promotion_claims:
  - source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer> | STSTAT-<integer> | SREL-<integer>
    authority: apparent | branch_local_counterfactual | canon_candidate
```

`resolution` follows the shared contract §4.3 route table: required for `attempt` / `accommodate` / `world_block`, absent for `accept`, and optional for `promotion_hold` / `terminal` when an explicit held-or-terminal result must be visible.

`commitment` is required on every emitted event. For turn-cycle events, `selected_slt_id` names the chosen author-pool or JIT `SLT`, `selection_source` records whether the block came from the chosen `CHC`, the author pool, runtime JIT creation, system repair, or audit repair, and `alias_bindings` records the concrete record id chosen for every `bound:<alias>` used by the selected block. Do not duplicate actor or target bindings inside `commitment`; `SE.actor` and `SE.targets` remain authoritative for those bindings.

### Selection Rationale

When `selected_slt_id` was chosen over one or more eligible competing blocks of equal-or-higher local salience, `SE.world_logic_rationale` MUST include a selection-rationale clause naming the selected block, at least one outranked competing block, and the reason the selected block won. Example: `selected SLT-12 over SLT-7 because SLT-7's obligation_open(OBL-3) predicate failed in the current visibility state.` When selection is uncontested because only one block was eligible, no selection-rationale clause is required.

Prose-only by current design; if audit-time prose matching proves too fuzzy after first production stories, the rationale gets promoted to a structured `SE.commitment.selection_rationale` field in a follow-up spec.

### Motivation Grounding

For every non-system character action, `SE.world_logic_rationale` MUST cite at least one active motivation or affordance source that belongs to, involves, or is immediately available to the acting `STENT`:

- an `STINT-<integer>` held by the actor;
- a `BEL-<integer>` held by the actor with relevant content;
- an `OBL-<integer>`, `CNSQ-<integer>`, or `THR-<integer>` involving the actor;
- an `SREL-<integer>` whose structured `direction.from` or `direction.to` includes the actor, or whose `participants[]` includes the actor for bidirectional/mutual relationships;
- an immediate physical affordance available to the actor at the page location.

Citation form is prose inside `world_logic_rationale`, for example: `STENT-1 acts on STINT-3 because ...`, `BEL-4 lets STENT-1 infer ...`, or `SREL-2.direction.from includes STENT-1, so ...`. System events (`story_start`, `system_repair`, `audit_repair`, `prose_attach`, `promotion_closeout`) are exempt. If no textual grounding source is cited for a non-system character action, `branching-story-health-audit` reports `motivation_ungrounded` as a WARNING audit signal, not a commit-blocking validator error.

Draft `PG-<integer>` per shared contract §4.2:

- `parent_page_id: <parent>`, `branch_id: <active or new>`, `turn_index: parent.turn_index + 1`.
- `input.choice_id` OR `input.manual_action_text` (exactly one non-null), `input.resolved_event_id: SE-<integer>`.
- `state_hash_parent: parent.state_hash` copied exactly from the already-committed parent PG; `state_hash` is the final sha256 computed per shared contract §4.2a after `plan.plan_hash` and `validation_trace` are finalized.
- Full `state_snapshot`: `canon_revision` copied from the current world-canon revision loaded in Pre-flight; `active_records` (per-class lists including `BEL` and `STSTAT` keys); `entity_status` derived from active `STSTAT` records, one entry per active `STENT`; `visible_affordances` recomputed for the new location/context; `unresolved_mystery_claims` updated; `continuation` (`has_eligible_commitment_block`, `terminal_status`, `terminal_rationale`).
- `plan.plan_hash: <final sha256 computed per shared contract §4.2a after the page plan bytes are finalized>`.
- `prose_plan_path: pages-prose-plans/PG-<integer>.md` (canonical top-level plan address; see `mcp__worldloom__describe_envelope_schema(op_kind='create_pg_record')` for the current machine-readable op shape).
- `validation_trace`: populated by Phase 9.

The snapshot is the future fork point — complete enough to be a valid parent for any subsequent turn-cycle invocation regardless of whether its prose is ever rendered (per FOUNDATIONS §Story Bundles §4a).

## Phase 7: Author the page plan

Write `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-<integer>.md` per shared contract §8 — 19 sections.

The drafted plan bytes are the future direct-write artifact. Keep the complete UTF-8 bytes stable in working memory so Phase 9 can compute `PG-<integer>.plan.plan_hash` over exactly the bytes that will be written after patch submission.

**§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `reports/prose-quality-instructions.md`.** Operationally load-bearing — external prose renderer has no cross-plan state; every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.

Turn-cycle-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to this turn's action; §5 enumerates active cast and entity statuses **as of this turn** (including any deaths, captures, or status changes from Phase 3); §6 names current location and grounded affordances; §7 dramatizes the resolved event (the chosen CHC or write-in interpretation + the `outcome_route` + the `world_logic_rationale` + `resolution.player_visible_feedback` for non-accept routes); §8 names the required beats from the selected or JIT commitment block; §9 names load-bearing relationships and beliefs AFTER Phase 4 updates; §10 lists open `OBL` / `CNSQ` / `THR` with `urgency` so debts that must be honored are visible to the prose renderer; §11 names forbidden mystery resolutions; §12 names the intended stopping point; §13 previews emitted choices (or marks terminal); §14 (optional) inlines recent rendered prose continuity from `pages-prose/<recent>.md` when available.

The plan must not expose engine jargon to prose. Engine terms confined to §15 frontmatter only. No word-count targets (per FOUNDATIONS §Story Bundles §9).

## Phase 8: Generate next choices

Emit 3–5 `CHC` records if the new page stops at a real commitment hinge. Emit a single continue-or-pause `CHC` if continuing into the next beat without a meaningful commitment surface. Emit zero `CHC` if the branch is terminal — in that case, set `PG-<integer>.state_snapshot.continuation.terminal_status: terminal_closed` with `terminal_rationale` naming how high-salience debts were closed, abandoned, inherited, or intentionally left unresolved.

The next choice set should include different axes (action vs restraint, truth vs deception, intimacy vs distance, risk vs safety, public vs private, duty vs desire). Always allow a write-in slot unless the branch is terminal.

Each `CHC` carries the shared contract §4.5.12 shape: `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families` (a non-empty list using the §4.4a `action_family` taxonomy), `likely_state_pressure`, `associated_commitment_block` (`SLT-<integer>` or null — turn-cycle will JIT next turn if null), `grounded_in`, and optional `success_policy` when this choice later resolves through `outcome_route: attempt`.

For every emitted `CHC`, populate `grounded_in.records` with at least one active record id from the new `PG-<integer>.state_snapshot.active_records` that makes the choice available or meaningful (for example the actor `STENT`, location `STLOC`, relevant `STOBJ`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, or story-local `DA`). When the choice directly exposes one or more visible affordances, also populate `grounded_in.affordance_ordinals` with the corresponding `PG-<integer>.state_snapshot.visible_affordances[].ordinal` values. Do not use `target_or_action_families` alone as grounding evidence.

For every emitted `CHC`, apply the Information / Observer Firewall: the `player_visible_intent`, likely pressure, and any associated commitment block must be grounded in information the acting entity can possess from active `BEL`, direct observation, accessible `DA` / `STOBJ` evidence, testimony, document access, inference, surveillance, institutional channel, magic/tech, or another recorded access route. Do not emit a choice that lets an actor exploit a secret, hidden state, or another actor's private knowledge unless the access route is named in the plan and grounded in active records or world canon. When the turn creates or supersedes `BEL` records to make that information available, retain the same route in `BEL.basis.access_route` and cite the enabling records in `BEL.basis.access_records`.

Before hashes are computed, run the `choice_set_noncollapse` validator against the drafted `PG` + emitted `CHC` set. The page commit fails when `choice_set_collapse` fires: a non-terminal page with more than one emitted choice must have at least two choices that differ materially in `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, or `likely_state_pressure`, unless at least two intentionally expressive variants are marked in the page plan as rhetorical or expressive. Use a line such as `Rhetorical choices: CHC-3, CHC-4 are expressive variants; they intentionally share the same material axes.` so the prose marker names the exact CHC ids before validation.

## Phase 9: Validate

Run the 8 shared hard gates per shared contract §7 against the drafted records. Populate `PG-<integer>.validation_trace` with one-line PASS rationale per gate:

1. **input legality** — XOR action source enforced; chosen CHC belongs to parent and is not retired; bundle + parent exist.
2. **parent snapshot compatibility** — `parent.state_hash` matches `PG-<integer>.state_hash_parent`; `parent.state_snapshot.canon_revision` has been compared against the current world-canon revision and canon-baseline drift is classified as `compatible` or `grandfathered` before proceeding.
3. **mystery / invariant firewall** — no forbidden `M-<integer>` resolved; INV honored; selected SLT's `mystery_policy.forbidden_resolutions` respected.
4. **branch isolation** — no sibling-branch records in new snapshot's `active_records`; no author-pool SLT references branch-local record ids.
5. **append-only delta** — all changes in `SE.state_delta` are creates / supersessions / closes; supersession is a new record file (no in-place mutation of structural fields).
6. **consequence capacity or terminal proof** — at least one eligible SLT (author-pool or JIT-able) OR `terminal_closed` with `terminal_rationale` covering high-salience debt closure. High-salience debt is determined from `urgency` on active `OBL`, `CNSQ`, `THR`, and `STINT` records. Choice Consequence Integrity is part of this gate: an accepted `CHC` selection or accepted write-in must produce at least one grounded consequence unless the parent page plan explicitly marked that choice as rhetorical.
7. **plan grounding** — every declared affordance / required beat / emitted CHC is grounded in active records or world canon; each emitted `CHC.grounded_in.records[]` resolves to the new page's `state_snapshot.active_records`, and each `grounded_in.affordance_ordinals[]` resolves to the new page's `state_snapshot.visible_affordances[].ordinal`. The Information / Observer Firewall is satisfied: selected `SLT` actor-bindings, character actions, and emitted choices rely only on information available to the acting entity or record a valid access route.
8. **canon promotion hold** — if `outcome_route == promotion_hold` or any `SE.promotion_claims[].authority == canon_candidate`, the state delta records only the branch-local appearance. Marked `NOT_APPLICABLE` with rationale when no canon claim is in play.

Plus 11 turn-cycle-additional checks (recorded in working memory):

1. **Action source legality** — XOR enforced; chosen CHC not retired. When `manual_action_text` is the source, the action has been parsed against `STORY_KERNEL.md` `## Player Agency Contract`: agency surface, write-in envelope, and viewpoint limits all support the route or the route records the exact agency-contract reason it was blocked/held.
2. **Entity death / incapacity reconciliation** — when Phase 3 applied death/incapacity, the open intentions / obligations / relationships / object-controlled / belief-witness consequences are in the same delta.
3. **Belief / visibility coverage** — every action involving secrecy / betrayal / deception / violence / sex / law / status / public ritual has complete `expected_witnesses` coverage: each relevant direct or indirect witness group from Phase 4 is accounted for by a created/superseded `BEL` (`knows`, `suspects`, `misremembers`, `reports`, or `deceives`) or by a recorded non-propagation rationale from the closed set (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`). Mere existence of some `BEL` record is not sufficient.
4. **Expected witness tag presence** — for each Phase 4 expected witness group that receives no `BEL` create/supersession, `SE.world_logic_rationale` contains `non_propagation:<reason>(group=<label>, records=[<record_ids>])` with a closed-set reason and the same group label used in `expected_witnesses`.
5. **Write-in world-logic rationale** — when `manual_action_text` is the action source, `SE.world_logic_rationale` is non-empty and explains the route (silent rejection forbidden).
6. **Selection Rationale** — when `SE.commitment.selected_slt_id` was chosen over one or more eligible competing `SLT` blocks of equal-or-higher local salience, `SE.world_logic_rationale` names the selected block, at least one outranked block, and why the selected block won. Uncontested single-eligible-block selection is exempt. Missing prose-rationale citations are known story-health debt that `branching-story-health-audit` surfaces as `saliency_starvation` (WARNING), not a validator error.
7. **Motivation Grounding** — for every non-system character action, `SE.world_logic_rationale` cites at least one active `STINT`, actor-held `BEL`, actor-involving `OBL` / `CNSQ` / `THR`, actor-matching `SREL.direction.from` / `SREL.direction.to` or `participants[]`, or immediate physical affordance available to the actor. Missing prose-grounding citations are known story-health debt that `branching-story-health-audit` surfaces as `motivation_ungrounded` (WARNING), not a validator error.
8. **Causal dependency threat scan** (`causal_dependency_threat_scan`) — after the state delta, next snapshot, visible affordances, and emitted choices are drafted, but before final PG hashes are computed, verify that the delta did not clobber dependencies that still survive in the committed page:
   - `choice_dependency_clobbered` (ERROR): a record in any emitted `CHC.grounded_in.records[]` is closed, superseded, moved, or invalidated by this turn while the `CHC` remains emitted or player-visible.
   - `affordance_dependency_clobbered` (ERROR): a `PG.state_snapshot.visible_affordances` entry remains after its grounding `STLOC`, `STOBJ`, or `STENT` is no longer active, accessible, or located where the affordance asserts.
   - `obligation_counterparty_unavailable_without_transfer` (ERROR): an entity owing or owed an open `OBL` becomes unavailable per its active `STSTAT` (dead, captive, offstage, incapacitated, or otherwise unable to participate) while the `OBL` is neither closed nor transferred.
   - `slt_precondition_clobbered` (WARNING): a high-salience open debt had an eligible author-pool `SLT` before this turn, but the new delta destroys that `SLT`'s preconditions without closing, transferring, or replacing the debt.
9. **Choice-set noncollapse** (`choice_set_noncollapse`) — run the validator over the drafted non-terminal `PG` and emitted `CHC` set. ERROR `choice_set_collapse` rejects a page whose choices all share the same `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, and `likely_state_pressure`, unless the page plan explicitly marks at least two named CHCs as rhetorical or expressive variants. WARNING `choice_set_rhetorical_unmarked` means an identical unmarked pair exists beside a materially distinct choice; resolve it or surface it in the deliverable summary as known story-health debt before approval.
10. **Choice Consequence Integrity** (`cosmetic_accepted_choice`) — when the route is `accept` for a selected `CHC` or accepted write-in, reject the turn if `SE.state_delta.create`, `SE.state_delta.supersede`, and `SE.state_delta.close` are all empty, no story-bundle record is created / superseded / closed, no visibility or affordance state changes, and the parent page plan did not explicitly mark the selected choice as rhetorical or expressive. `CHC.grounded_in` proves why a choice was available; it does not by itself prove that selecting the choice changed anything.
11. **Canon Baseline Drift** (`canon_baseline_drift`) — reject silent continuation when the parent page's `state_snapshot.canon_revision` is older than the current world-canon revision and the drift classification is not `compatible` or `grandfathered`. `requires_health_audit` routes to `branching-story-health-audit`; `requires_repair_turn` routes to a repair turn before new assertions; `promotion_or_retcon_conflict` routes to `story-fact-promotion-to-canon` / `canon-addition` review.

After all gates and additional checks pass, compute final PG hashes per shared contract §4.2a:

1. Confirm `PG-<integer>.state_hash_parent` is an exact copy of the committed parent PG's `state_hash`.
2. Compute `PG-<integer>.plan.plan_hash` and `PG-<integer>.state_hash` via the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-path> --pg <pg-draft-path>` per shared contract §4.2a "Tooling" subsection. The CLI emits `{plan_hash, state_hash}` as JSON to stdout: stamp the `plan_hash` output onto `PG-<integer>.plan.plan_hash` (covering the exact UTF-8 bytes of the finalized `pages-prose-plans/PG-<integer>.md` draft) and the `state_hash` output onto `PG-<integer>.state_hash` (covering the deterministic canonical JSON fork-state payload after `plan.plan_hash` and `validation_trace` are final, excluding only `state_hash` itself). Hand-rolling the canonical-JSON serializer is forbidden — the CLI reuses the shared `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers exported from `@worldloom/world-index/hash/content` that the validator's `snapshot_replay_equality` consumes, so authoring-time and validation-time hashes are byte-identical by construction. Pass a draft PG record that contains placeholder values for both hashes (or omits them entirely); the CLI ignores the input's `state_hash` field and overwrites the input's `plan.plan_hash` in the canonical payload with the value computed from `--plan`.
3. Verify both new hash values are 64-character lowercase hex sha256 strings. Missing, placeholder, uppercase, non-hex, or stale values are hard-stop authoring errors before Phase 10.

If any gate, ERROR-severity additional check, parent-hash copy check, or new-hash check fails, abort before Phase 10 — write nothing. WARNING-severity additional checks must be recorded in the deliverable summary and either resolved before approval or explicitly accepted by the user as known story-health debt.

## Phase 10: Commit / Write — HARD-GATE fires

1. Build the patch plan covering every record drafted in Phases 1-8 as a single envelope. Operations include `create_se_record`, `create_pg_record` (always), `create_br_record` (if fork), `create_*_record` for every changed record class (including `create_ststat_record` for entity life / agency / location status; each new file carrying `supersedes:` in its YAML body when applicable — supersession is file-level append-only per shared contract §3, using the existing `create_*_record` ops), `create_chc_record` per emission, `create_slt_record` if Phase 2 created a JIT block. BEL writes via `create_bel_record`. Each op requires a `target_file` field naming the on-disk write path (e.g., `worlds/<world_slug>/stories/<story_slug>/_source/<class>/<ID>.yaml`); see `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` or invoke `mcp__worldloom__describe_envelope_schema(op_kind?)` at pre-flight for the machine-readable per-op shape.
2. Dry-run via `mcp__worldloom__validate_patch_plan`. This run exercises `record_schema_compliance` for BEL and PG; placeholder or malformed PG hashes must not reach this step.
3. Present the complete deliverable summary to the user:
   - Branch label (continuation of `BR-<integer>` or fork into new `BR-<integer>`).
   - Resolved outcome route (`accept` / `accommodate` / `attempt` / `world_block` / `promotion_hold` / `terminal`).
   - State delta inventory (creates + supersessions + closes per class).
   - Commitment block used (author-pool `SLT-<integer>` or new JIT `SLT-<integer>`).
   - Page plan structural preview (§5 / §6 / §7 / §12 / §13 — verbatim §2 / §3 / §19 excluded for length).
   - Emitted choices list (or terminal rationale).
   - Any `SE.promotion_claims[]` requiring a follow-up `story-fact-promotion-to-canon` invocation.
4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
5. On approval: persist the patch plan envelope as JSON (e.g., `/tmp/<plan-id>.json`), invoke the canonical signer to issue the `approval_token` (`node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` — see `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token), then call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token. Approval tokens are single-use, plan-bound, default-20-minute-expiry. **Submit-path selection by envelope size**: turn-cycle envelopes vary widely (a tight continuation may be 10-20KB; a large supersession-heavy turn may exceed 50KB); for envelopes >50KB submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent — same engine code, same `PatchReceipt`, same failure-mode codes — but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan. The CLI path also serves as the fresh-process escape valve when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory and a full Claude Code session restart is not immediately available; in that case, switch to the CLI submit path regardless of envelope size (see `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix).
6. On patch success: write `pages-prose-plans/PG-<integer>.md` using the exact bytes hashed into `PG-<integer>.plan.plan_hash`.
7. Run post-write plan-hash verification (shared contract §10 step 5a) before any `INDEX.md` update: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/PG-<integer>.md --pg <PG record file>`, then confirm the emitted `plan_hash` equals the committed `PG-<integer>.plan.plan_hash`. If they differ, do not update `INDEX.md`; surface the mismatch and both hashes; treat it as a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`. The patch plan is not re-submitted; only the disk artifact is reconciled to the already-approved bytes.
8. After post-write verification passes, update bundle `INDEX.md` (per shared contract §10 write order). Specifically: append a Pages-table row for the new PG; append rows to Story-Local Facts / Story-Local Beliefs / other relevant tables for any new SF / BEL / etc. records; add a new `## Emitted Choices at PG-<integer>` section listing the new CHC menu; add a new `## Validation Trace on PG-<integer>` section per the shared eight hard gates. The convention is defined by `branching-story-bootstrap` at first-run; turn-cycle inherits and extends it.
9. Report page path + record inventory to the user. If `promotion_claims[]` were emitted, surface the recommended next step (invoke `story-fact-promotion-to-canon` with the new `SE-<integer>` as evidence). Do NOT `git commit`.

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
- **Rule 5 (No Consequence Evasion)** — Phase 3 + Phase 9 gate 6 + Phase 9 saliency-rationale, causal-dependency, and choice-consequence checks. Mechanism: Phase 3 death/incapacity reconciliation propagates second-order effects in the same delta; Phase 9 gate 6 requires continuation capacity (eligible SLT) or terminal proof (rationale naming high-salience debt closure), Selection Rationale explains why equal-or-higher-salience eligible blocks lost, and Choice Consequence Integrity for accepted choices; `causal_dependency_threat_scan` rejects choices, affordances, obligations, and high-salience debt paths whose dependencies were clobbered by the drafted delta.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 5 + Phase 9 gate 3. Mechanism: Phase 5 classifies claims and rejects forbidden mystery resolution; Phase 9 gate 3 mystery firewall verifies no forbidden `M-<integer>` is resolved and no selected SLT's `mystery_policy.forbidden_resolutions` is breached.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-state-contract.md` §4 (`BEL` §4.1, `PG` §4.2, `SE` §4.3, `SLT` §4.4). No skill-local templates needed — the shared contract is the canonical reference.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 3, 7 | Shared contract §4 record schemas; Phase 9 gate 7 plan grounding. |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — turn-cycle mutates branch-local story state; world canon is not touched. Handoff to `canon-addition` via `story-fact-promotion-to-canon` when a story claim promotes. |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — same handoff as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 5, 9 | Phase 5 canon-authority classification; Phase 9 gate 4 branch isolation. |
| Rule 5 (No Consequence Evasion) | Phase 3, 9 | Phase 3 death/incapacity reconciliation; Phase 9 gate 6 continuation or terminal proof; Phase 9 Selection Rationale, Choice Consequence Integrity, and `causal_dependency_threat_scan` for clobbered CHC / affordance / OBL / SLT dependencies. |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — turn-cycle mutates story-bundle scope, not world canon. World canon retcon routes through `canon-addition`. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 5, 9 | Phase 5 forbidden-mystery rejection; Phase 9 gate 3 mystery firewall. |
| Rule 11 (No Spectator Castes) | N/A | Not applicable — Rule 11 governs new exceptional capabilities at world canon. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — story-bundle scope, not world canon. |
| Canon Layers | Pre-flight, Phase 5 | World canon layers loaded via context packet; story-bundle records carry story-local truths per FOUNDATIONS §Story Bundles §1. |
| Mystery Reserve | Pre-flight, Phase 5, 9 | Whole-class Mystery Reserve loaded; Phase 5 classification; Phase 9 gate 3 enforces firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | Pre-flight, Phase 6, 10 | `accept_parent_unrendered: true` default; rendered prose remains a deterministic filesystem artifact outside PG; no ARC_TRACE emitted; the new PG is the next fork primitive. |
| §Story Bundles §4b (Canon Baseline Drift) | Pre-flight, Phase 6, 9 | Parent `state_snapshot.canon_revision` compared to the latest context-packet `change_log_entry`; new PG persists the current `canon_revision`; non-compatible drift routes to audit, repair, or promotion/retcon review. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2 | Selected or JIT SLT records follow §4.4 schema discipline; JIT blocks have 1-5 beats and minimal effects; no `arc_contract` / `dramatic_unit` / `stop_policy` / shape discriminators. |
| §Story Bundles §5b (Schema-Minimalism) | All record-drafting phases | Every drafted record conforms to shared contract §4 schemas; supersession is file-level append-only via `supersedes:` field, no new patch op. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 4 | Mandatory `expected_witnesses` coverage for actions involving secrecy / betrayal / deception / violence / sex / law / status / public ritual; each relevant witness group gets a `BEL` create/supersession or a closed-set non-propagation rationale. `truth_relation` + `visibility` + `confidence` are consumed by the social-state firewall. |
| §Story Bundles §6b (Information / Observer Firewall) | Phase 2, 4, 6, 8, 9 | Selected `SLT` actor-bindings, character actions, emitted `CHC` choices, and newly authored `BEL` records must rely only on information available to the acting entity, or record a valid access route through belief, observation, artifact/document access, inference, surveillance, institutional channel, magic/tech, or another canonically valid mechanism. Phase 6 records non-system character motivation grounding in `SE.world_logic_rationale`; Phase 4 retains knowledge-access routes in `BEL.basis.access_route` / `BEL.basis.access_records` for health-audit replay. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle records at `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` are the exclusive write surface, routed through the patch engine.
- **Never write rendered prose at turn-cycle.** Rendered prose at `pages-prose/PG-<integer>.md` is supplied externally and validated by `branching-story-prose-attach`. Turn-cycle writes only the plan and updates the bundle INDEX.
- **Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` and a page plan. `world_block` and `terminal` are first-class outcomes routed through the same machinery as `accept`.
- **Deaths and removals are first-class outcomes.** No main-character protection via out-of-world logic. Phase 3 reconciliation propagates death / incapacity effects in the same delta.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4 schemas. No nice-to-have fields. Supersession is file-level append-only (a new record file carrying `supersedes:` in its YAML body, using existing `create_*_record` ops).
- **Verbatim §2 / §3 / §19 of the page plan** inlined from `reports/prose-quality-instructions.md` on every page. Operationally load-bearing — external LLM has no cross-plan state.
- **No word-count targets** anywhere in the plan (per FOUNDATIONS §Story Bundles §9). Pacing is expressed structurally via beats and stop conditions.
- **Skills do not chain.** Turn-cycle never invokes `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. When `promotion_claims[]` are emitted, turn-cycle surfaces the recommendation; the user separately invokes `story-fact-promotion-to-canon` with the new `SE-<integer>` as evidence.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.

## Final Rule

Turn-cycle advances story state by exactly one causal tick from any committed page snapshot — continuation or fork — without requiring rendered parent prose, without silent rejection of any action, and without ever mutating world canon.
