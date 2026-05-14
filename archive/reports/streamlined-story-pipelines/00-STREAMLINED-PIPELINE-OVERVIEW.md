# Worldloom Story Pipeline — Streamlined v1

## Design call

The current architecture is pointed in the right direction, but it is paying too much runtime cost to preserve prose as a lifecycle state. The state transition already happens before prose exists. That means prose should not be the thing that authorizes the next state transition.

The streamlined pipeline makes one hard separation:

> **Story state is authoritative at page-plan commit. Prose is a rendering of that state, not a second state engine.**

This keeps the parts that are working: trackable entities, intentions, facts, obligations, consequences, threads, relationships, storylets, locations, objects, branches, pages, choices, branch-local facts, and page snapshots. It removes the slowest coupling: `pending -> finalized` state mutations after prose.

## Replacement skill set

The old seven skills collapse into six operational surfaces and one shared contract:

| New file | Replaces / changes |
|---|---|
| `01-SHARED-STORY-STATE-CONTRACT.md` | Shared schema, validation, page snapshot, event-sourced replay, patch submit discipline. This removes repeated envelope and lifecycle text from every skill. |
| `02-branching-story-bootstrap.md` | Still creates a story bundle and root page plan, but no pending-prose lifecycle and no finalize placeholders. |
| `03-branching-story-turn-cycle.md` | Replaces page-cycle. Advances one causal tick from a parent page snapshot. Parent prose is optional continuity context, not a hard prerequisite. |
| `04-branching-story-prose-attach.md` | Replaces page-prose-finalize. Validates/attaches external prose through a receipt. It does not mutate the `PG` record, does not create `ARC_TRACE`, and does not unblock/lock the story engine. |
| `05-commitment-block-authoring.md` | Replaces storylet-pool-authoring. Keeps `SLT` ids for compatibility but shrinks storylets into commitment blocks: preconditions, beats, effects, exits, saliency. |
| `06-branching-story-health-audit.md` | Keeps audit, but makes structural replay the default fast audit. Prose, remediation cards, and cross-story scans become explicit optional modes. |
| `07-story-fact-promotion-to-canon.md` | Ends after proposal package creation. No post-adjudication closeout inside the same skill. |
| `08-story-promotion-closeout.md` | New small skill: consumes canon-addition verdict and writes story-local supersession/branch flags. |

## What changes most

### 1. The page is a committed causal tick, not a pending artifact

At page commit, the engine writes:

- the event that happened (`SE`),
- the records created or superseded by that event,
- the materialized branch snapshot (`PG.state_snapshot`),
- the next choices (`CHC`),
- the renderer-facing page plan.

The external prose may be written before or after the next page is planned. The prose can be audited and attached, but it does not decide whether the story state is real.

### 2. Page snapshots are the rewind/fork primitive

Going back to any earlier page means loading that page's snapshot and applying a new turn from it. No sibling branch prose is needed. No replay from root is required unless doing a structural audit.

### 3. Add explicit belief/knowledge records

Current `SF.known_by` is not enough for arbitrary choice progression. The engine needs to distinguish:

- what is true in the branch,
- what a character believes,
- what a character witnessed,
- what is public,
- what is lied about,
- what is suspected but unproven.

Add `BEL-NNNN` story-local records. Most “how does the story remain coherent if the user lies, betrays, hides, kills, flees, frames someone, or exposes a secret?” problems become belief-state problems, not plot-arc problems.

### 4. Storylets become smaller commitment blocks

The current SLT shape is powerful but overbuilt. Keep `SLT` IDs, but new records use:

```yaml
record_version: 3
shape: commitment_block
```

A commitment block is not an act, not an arc, and not a mini story skeleton. It is a reusable causal move with:

- eligibility conditions,
- 1-5 beats,
- state effects,
- exit options,
- saliency/reuse controls,
- mystery/canon safety.

### 5. Kill `ARC_TRACE` as a default durable artifact

The old finalizer spends time proving that prose realized an arc chosen earlier. In the new model, the durable truth is already the page event and state delta. If prose deviates, that is a prose-quality issue or a repair issue, not a second state-transition pass.

### 6. Health audit becomes cheap by default

The default audit only checks deterministic story-engine health: snapshots, branch isolation, replay equality, open debts, continuation capacity, belief visibility, mystery/canon firewall, and terminal proof. Prose consistency and remediation drafting are separate opt-in modes.

## Minimal hard gates

Every state-changing skill uses the same eight gates:

1. input legality,
2. parent snapshot compatibility,
3. world invariant and mystery firewall,
4. branch isolation,
5. append-only delta legality,
6. consequence capacity or terminal proof,
7. grounded self-contained page plan,
8. canon-promotion hold if a world-level truth is being asserted.

No prose critic gate belongs in a state-transition skill.

## What remains intentionally unchanged

- Story-bundle `_source/**/*.yaml` writes still go through the patch engine.
- World canon is never mutated by story skills.
- Story-to-world canon still requires promotion and canon-addition.
- Story records remain append-only/superseding.
- No word-count targets are introduced.
- Mystery Reserve protection remains mandatory.
- User write-ins are routed through world logic; silent rejection remains forbidden.

## Fast path per user choice

1. Load `PG-NNNN.state_snapshot` from the selected parent page.
2. Resolve selected `CHC` or free-form write-in into an event route.
3. Apply one commitment block or JIT commitment block.
4. Create/supersede the changed records only.
5. Materialize `PG-NNNN+1.state_snapshot`.
6. Write a self-contained prose plan.
7. Emit the next choices.
8. Submit one patch envelope and update indexes.

The external prose renderer can then render the page plan. `prose-attach` can run later for quality/consistency receipts, but the next turn does not wait on it.
