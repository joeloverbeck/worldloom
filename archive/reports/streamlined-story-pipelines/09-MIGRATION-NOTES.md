# Migration Notes — Current Pipeline to Streamlined v1

## 1. Keep existing records valid

Existing story bundles remain valid. The new pipeline is forward-compatible rather than destructive.

- Existing `SLT record_version: 2 shape: scene_commitment_arc` records can still be selected by old page-cycle or adapted by a shim.
- New `SLT` records should use `record_version: 3 shape: commitment_block`.
- Existing `PG.prose_status` fields are ignored by new turn-cycle.
- Existing `ARC_TRACE` records remain historical audit artifacts but are not required.

## 2. Add `BEL` support

Add `BEL` allocation and patch-engine create/supersede operations. Backfill only when needed:

- public facts can be turned into `BEL holder: public`,
- private character knowledge can become character-held `BEL`,
- false or contested facts should be migrated from overloaded `SF` usage into `BEL`.

Do not backfill every page at once. The health audit can flag where missing belief state causes incoherence.

## 3. Deprecate finalize as state mutation

Replace:

```text
page-cycle -> external prose -> finalize -> next page-cycle
```

with:

```text
turn-cycle -> external prose -> optional prose-attach
          \-> next turn-cycle may proceed from state snapshot
```

For existing bundles, run a one-time index repair:

- if `pages-prose/PG-NNNN.md` exists, set index display to rendered,
- if no prose exists, show missing prose,
- if old finalize event exists, optionally create a prose receipt from it.

## 4. Remove `ARC_TRACE` dependence

Health audit should not require `ARC_TRACE`. If an existing audit mode wants to check prose against old scene arcs, keep it as `mode: legacy_arc_trace`.

## 5. Shrink validation traces

Map old validation gates into shared gates:

| Old concern | New gate |
|---|---|
| chosen choice validity | input legality |
| parent prose rendered | removed |
| append-only mutation | append-only delta |
| branch isolation | branch isolation |
| mystery firewall | mystery/invariant firewall |
| affordance validation | plan grounding |
| prose-ledger consistency | prose-attach receipt only |
| arc-trace evidence alignment | removed / optional legacy |
| continuation feasibility | consequence capacity or terminal proof |
| canon candidate pause | canon promotion hold |

## 6. Update skill names gradually

Recommended migration order:

1. Implement shared story state contract.
2. Add `BEL` class and page snapshot schema changes.
3. Implement `prose-attach` while keeping old finalize available.
4. Implement `turn-cycle` with `allow_unrendered_parent=true`.
5. Migrate storylet authoring to commitment blocks.
6. Split health audit modes.
7. Split promotion closeout.
8. Retire old finalize after existing bundles have receipts or index repair.

## 7. Regression tests

Add tests for:

- fork from any previous page without reading sibling prose,
- kill/incapacitate a central character and reconcile obligations/relationships/choices,
- write-in impossible action routes to `world_block` with a page plan, not silent rejection,
- branch-local fact does not become canon without promotion,
- prose missing does not block turn-cycle,
- prose inventing a structural fact creates receipt warning/failure,
- author-pool commitment block cannot reference branch-local records,
- snapshot replay detects drift,
- terminal proof closes or accounts for high-salience debt.
