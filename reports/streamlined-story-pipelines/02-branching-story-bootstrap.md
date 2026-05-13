# branching-story-bootstrap — Streamlined v1

## Purpose

Create a new story bundle, root causal state, root page snapshot, root prose plan, and first choices. It does not render prose and does not create a pending-prose lifecycle.

## Inputs

Required:

- `world_slug`
- `story_slug`
- `premise`
- `selected_cast[]`

Optional:

- `pov`
- `tone`
- `content_intensity`
- `initial_location`
- `opening_pressure`
- `seed_commitment_blocks: none | minimal | standard`

Default `seed_commitment_blocks` is `minimal`.

## Outputs

Patch-engine story records:

- `STENT` mirrors for selected cast.
- Initial `STINT` records.
- Relevant `SF` records mirrored from world canon.
- Initial `BEL` records for private/public knowledge and misconceptions.
- Initial `THR`, `OBL`, and `CNSQ` records.
- `BR-0001`.
- `SE-0001` with `event_kind: story_start`.
- `PG-0001` with full state snapshot.
- First `CHC` records.
- Optional `SLT` commitment blocks.

Direct markdown:

- `STORY_KERNEL.md`
- `pages-prose-plans/PG-0001.md`
- `INDEX.md`
- per-world `stories/INDEX.md` update last

## Workflow

### 1. Resolve world and story target

Load world kernel, selected character records, relevant canon, invariants, and Mystery Reserve. Reject story slug collisions. Allocate IDs through the allocator.

### 2. Normalize the premise into a state seed

Produce only the information required to initialize causal state:

```yaml
story_seed:
  premise: string
  tone: string
  pov: string
  content_intensity: tame | mature | explicit
  initial_location: STLOC candidate
  initial_pressure: string
  starting_cast: [STENT]
  initial_public_situation: string
  private_knowledge: []
  contested_claims: []
  forbidden_mystery_resolutions: [M-NNNN]
```

Do not create dramatic acts, act obligations, plot milestones, mandatory midpoint reversals, climax structures, or fixed ending paths.

### 3. Mirror only load-bearing world facts

Create `SF` records for facts needed by the premise, cast, initial location, or opening action logic. Do not mirror broad world background that can be retrieved later.

Each mirrored `SF` must include:

- `derived_from_cf`,
- branch/story scope,
- certainty,
- who knows it,
- why it matters to the opening state.

### 4. Create initial belief state

For every selected cast member, create only the beliefs that affect immediate choice logic:

- what they want,
- what they think is happening,
- what they know or misunderstand about other cast members,
- what they can plausibly perceive at the opening.

Use `BEL`, not `SF`, for false beliefs, suspicions, rumors, lies, or private assumptions.

### 5. Create initial debts

Create 1-3 threads and enough obligations/consequences to make the opening pressure actionable. Avoid creating debt just to satisfy a template.

Good debt:

- constrains a choice,
- demands response,
- tracks a promise/risk/threat/cost,
- creates a future consequence if ignored.

Bad debt:

- restates the premise,
- names a theme,
- encodes an act structure,
- predicts a future plot beat.

### 6. Create optional seed commitment blocks

If `seed_commitment_blocks: minimal`, create 4-8 broad blocks:

- one aftermath block,
- one confrontation/refusal block,
- one information-seeking block,
- one relationship-pressure block,
- one movement/escape block,
- one fallback continuation block.

If `none`, bootstrap relies on runtime JIT blocks in turn-cycle. If `standard`, create 8-14 blocks but no more.

### 7. Commit root event and snapshot

Create `SE-0001` as `story_start`. Materialize `PG-0001.state_snapshot` from the initial records. Compute `state_hash`.

`PG-0001` has no `prose_status`. It has:

```yaml
rendered_prose:
  path: null
  receipt_path: null
```

### 8. Generate the root page plan

The plan is the direct prompt package for the external prose renderer. It must include:

- the opening situation,
- cast states and beliefs,
- location and grounded affordances,
- debts in play,
- required opening beats,
- forbidden resolutions,
- what must not be invented,
- the intended stopping point,
- first choices.

No word-count target is allowed.

### 9. Generate first choices

Use the shared choice generator. Emit 3-5 structured choices plus the write-in slot. Choices should represent different commitments, not variants of the same wording.

Each `CHC` must include:

- surface label,
- player-visible intent,
- target or action family,
- likely state pressure,
- associated commitment block if known,
- success policy if it is an attempt.

### 10. Validate

Run the shared eight gates. Bootstrap additionally checks:

- `selected_cast` exists in world records,
- initial facts do not globalize local canon,
- the root plan is self-contained,
- there is either continuation capacity or explicit terminal proof, which should almost never be true at root.

### 11. Write

Use the shared write order. Do not write `pages-prose/PG-0001.md`.

## Removed from old bootstrap

- No separate Phase 9 / Phase 9.5 validation taxonomies.
- No deferred prose validator placeholders.
- No `prose_status: pending`.
- No root `ARC_TRACE` bypass logic.
- No large storylet target pool by default.
- No embedding of sibling skill internals.
- No patch-engine token mechanics repeated locally.

## Failure behavior

If validation fails before patch submission, write nothing. If patch submission succeeds and markdown write fails, story `_source` is authoritative and the index/plan should be repaired directly.
