# branching-story-prose-attach — Streamlined v1

## Purpose

Attach and validate external prose for an already-committed page. This replaces `branching-story-page-prose-finalize`.

It does not make a page real. The page was already made real by bootstrap or turn-cycle. This skill only creates a prose receipt and updates indexes.

## Inputs

Required:

- `world_slug`
- `story_slug`
- `page_id`

Optional:

- `strict: true | false` default false
- `run_craft_critic: true | false` default false
- `accept_plan_drift: true | false` default false

## Required files

- `pages-prose-plans/PG-NNNN.md`
- `pages-prose/PG-NNNN.md`
- `PG-NNNN` record

There is no requirement that `PG.prose_status == pending`; that field is deprecated.

## Outputs

Direct markdown/YAML:

- `pages-prose-receipts/PG-NNNN.yaml`
- bundle `INDEX.md` update last

Optional patch-engine story record:

- `SE` with `event_kind: prose_attach` only if the project wants attach events in the story event log. Default is **no event**.

## Workflow

### 1. Pair plan, page, and prose

Load:

- `PG` record,
- page plan,
- rendered prose,
- prior 1-2 branch prose pages if they exist and `run_craft_critic=true`,
- forbidden mystery list from plan frontmatter,
- state hash and plan hash.

If the plan hash or state hash differs from the `PG` record, fail unless `accept_plan_drift=true`. Drift is recorded in the receipt, not in the `PG` record.

### 2. Deterministic checks

Run these checks first:

- engine vocabulary leaking into prose,
- forbidden mystery resolution,
- required event absent,
- prose contradicts entity status,
- prose invents a structural fact not present in the page plan or state snapshot,
- prose implies a world-canon truth without promotion authority.

### 3. Optional craft critic

When `run_craft_critic=true`, produce a compact craft report:

- point-of-view stability,
- sensory grounding,
- character interiority,
- rhythm/repetition,
- dialogue clarity,
- continuity with recent prose,
- whether choices were over-explained or hidden.

The craft critic cannot mutate story state. It returns `PASS`, `WARN`, or `FAIL` in the receipt.

### 4. Receipt verdict

Create `pages-prose-receipts/PG-NNNN.yaml`:

```yaml
page_id: PG-NNNN
story_id: STORY-NNNN
plan_path: pages-prose-plans/PG-NNNN.md
prose_path: pages-prose/PG-NNNN.md
plan_hash: sha256
prose_hash: sha256
state_hash_at_plan_time: sha256
checked_at: iso8601
strict: false
verdict: PASS | WARN | FAIL
checks:
  engine_jargon_leak: PASS | WARN | FAIL
  forbidden_mystery_resolution: PASS | FAIL
  required_event_rendered: PASS | WARN | FAIL
  entity_status_consistency: PASS | WARN | FAIL
  invented_structural_fact: PASS | WARN | FAIL
  canon_claim_without_authority: PASS | FAIL
  craft_critic: PASS | WARN | FAIL | NOT_RUN
notes:
  - string
repair_recommendation: none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon
```

### 5. Strict mode behavior

If `strict=true` and verdict is `FAIL`, write the receipt but do not mark the prose as publishable in `INDEX.md`.

If `strict=false`, write the receipt and index the warning/failure visibly.

### 6. Write

Write the receipt, then update bundle `INDEX.md` last.

## Removed from old finalize

- No `PG` field updates from pending to rendered.
- No finalize `SE` by default.
- No `ARC_TRACE` creation.
- No deferred gate resolution from page-cycle/bootstrap.
- No mode-dependent state hard gate.
- No story state mutation.

## Handling prose that adds facts

If prose invents a structural fact that improves the story, do not silently accept it. Choose one:

1. revise prose to match committed state,
2. run a repair turn that creates branch-local state supporting the prose,
3. run story-fact promotion if the prose asserts a world-canon candidate.

The prose receipt records the recommendation.
