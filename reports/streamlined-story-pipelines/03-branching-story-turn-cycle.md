# branching-story-turn-cycle — Streamlined v1

## Purpose

Advance a story by one causal tick from any parent page. This skill handles both continuation and forking. It consumes a selected choice or free-form write-in, applies world logic, commits the resulting state delta, writes a new page snapshot, emits a renderer-facing prose plan, and creates the next choices.

Parent rendered prose is optional. The authoritative input is the parent `PG.state_snapshot`.

## Inputs

Required:

- `world_slug`
- `story_slug`
- `parent_page_id`
- exactly one of:
  - `chosen_choice_id`
  - `manual_action_text`

Optional:

- `execution_mode: authoring | interactive_runtime | batch`
- `use_parent_prose_for_style: true | false` default true
- `allow_unrendered_parent: true | false` default true
- `force_branch_id` when intentionally forking into a named branch

## Outputs

Patch-engine story records:

- one `SE` event,
- new/superseding `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STLOC`, `STOBJ`, `DA`, `STENT`, `BR` records as needed,
- optional branch-scoped JIT `SLT` commitment block,
- one new `PG`,
- next `CHC` records.

Direct markdown:

- `pages-prose-plans/PG-NNNN.md`
- bundle `INDEX.md` last

## Workflow

### 1. Load parent snapshot

Load only:

- parent `PG`,
- records listed in `parent.state_snapshot.active_records`,
- story kernel,
- relevant world context packet,
- whole-class Mystery Reserve and Invariants as required by the firewall,
- selected `CHC` if using a structured choice,
- optional parent and grandparent prose for style continuity if files exist.

Do not require parent prose. Do not read sibling branch prose for state assembly.

### 2. Resolve action

If `chosen_choice_id` is supplied, verify that it belongs to the parent page and has not been retired.

If `manual_action_text` is supplied, parse it into:

```yaml
proposed_action:
  actor: STENT-NNNN | player_character | unknown
  action_family: attack | flee | hide | confess | ask | deceive | negotiate | steal | destroy | spare | help | wait | custom
  target_records: []
  intended_outcome: string
  visible_method: string
  implied_claims: []
```

Route the action as:

- `accept` — the action can happen as stated.
- `accommodate` — the intent is honored but transformed by world constraints.
- `attempt` — success is uncertain; resolve by state, capability, opposition, luck policy if available, and consequences.
- `world_block` — the action is impossible in the current world/state; the page should dramatize the failed attempt or impossibility.
- `promotion_hold` — the action asserts a world-level truth or canon mystery resolution and must pause for promotion.
- `terminal` — the action coherently closes the branch.

Silent rejection is forbidden.

### 3. Choose or create a commitment block

Select an eligible `SLT` commitment block using:

- hard preconditions,
- current debts,
- belief/relationship pressure,
- location affordances,
- saliency,
- cooldown/repetition,
- mystery policy.

If no block can handle the action, create one branch-scoped JIT commitment block with `provenance.origin: runtime_jit`. JIT blocks are small and specific: one purpose, 1-5 beats, minimal effects.

### 4. Apply state delta

Apply exactly one causal delta from the parent snapshot.

The delta may:

- create new facts,
- create or supersede beliefs,
- change entity status, including death, incapacity, absence, injury, capture, or escape,
- update intentions,
- update relationships,
- open/close/escalate obligations,
- create consequences,
- advance or close threads,
- move entities or objects,
- create or alter story-local artifacts,
- mark a branch terminal or paused.

Deaths and removals are first-class outcomes. Do not protect “main characters” with out-of-world logic. If the world and state permit an attempt to kill someone, route it as an attempt or accepted action and let the consequences restructure the branch.

When an entity dies or becomes unavailable, reconcile:

- their open intentions,
- obligations owed by or to them,
- relationships,
- witnesses and beliefs,
- objects/locations controlled by them,
- future choice availability.

### 5. Update belief and visibility state

For every public, witnessed, hidden, or deceptive event, decide:

- who knows,
- who suspects,
- who misunderstands,
- who can prove it,
- what rumor or lie may spread,
- what choices are now constrained.

Create or supersede `BEL` records as needed. This is mandatory for actions involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual.

### 6. Check mystery and canon authority

Classify every new resolution-like claim as:

- `apparent`,
- `branch_local_counterfactual`,
- `canon_candidate`.

Forbidden mysteries cannot be resolved. Canon candidates pause before state commit unless the committed event only records a branch-local appearance and explicitly holds the canon claim for promotion.

### 7. Materialize next page snapshot

Create `PG-NNNN` with:

- parent page id,
- branch id/path,
- event id,
- active record ids,
- entity statuses,
- belief records,
- open debt,
- grounded affordances,
- continuation/terminal status,
- state hash.

The page snapshot is the future fork point. It must be complete enough to continue without reading parent prose.

### 8. Generate page plan

The page plan gives the external renderer a self-contained prose prompt:

- parent context summary,
- optional style continuity from recent rendered prose,
- resolved user action,
- world-logic rationale,
- commitment block beats,
- required state changes that must be dramatized,
- beliefs and relationship shifts,
- grounded affordances,
- forbidden mystery resolutions,
- stopping point,
- emitted choices.

The plan must not expose engine jargon to prose. It can contain engine terms in frontmatter only.

### 9. Generate next choices

Emit 3-5 choices only if the page stops at a real commitment hinge. Otherwise emit a single continue/pause choice or mark branch terminal.

The next choice set should include different axes, for example:

- action vs restraint,
- truth vs deception,
- intimacy vs distance,
- risk vs safety,
- public vs private,
- duty vs desire.

Always allow a write-in slot unless the branch is terminal.

### 10. Validate

Run the shared eight gates.

Additional turn-cycle checks:

- no sibling-branch state in active snapshot,
- selected choice belongs to parent page,
- write-in route has a world-logic rationale,
- entity death/incapacity reconciliation completed,
- each new choice is grounded in current affordances or debt,
- if terminal, terminal proof names all unresolved high-salience debts and their closure/abandonment status.

### 11. Write

Use the shared write order. Do not write rendered prose. Do not update a parent page from pending to finalized. Do not create `ARC_TRACE`.

## Removed from old page-cycle

- Parent prose is no longer required.
- No selected scene-commitment arc trace lifecycle.
- No finalize-owned placeholders.
- No 19-gate per-phase validation ledger.
- No separate closure-readiness phase; terminal proof is part of validation.
- No embedded storylet authoring workflow; JIT block creation is a small local helper following the shared commitment block schema.
- No repeated patch-engine token mechanics.

## Runtime shortcut

For interactive runtime, the engine may use this fast path:

```text
parent snapshot -> action route -> commitment block -> event delta -> next snapshot -> plan -> choices
```

Only the page plan requires long-form language generation. All other state work should be compact structured YAML.
