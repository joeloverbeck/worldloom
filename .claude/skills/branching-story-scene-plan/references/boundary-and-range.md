# Boundary And Range

Use this reference during Phase 1 of `branching-story-scene-plan`.

## Default Boundary Policy

A scene continues while these dimensions remain coherent:

- POV
- time continuity
- location
- cast
- active exchange or conflict
- practical purpose
- reader expectation

A scene usually ends on one of these material changes:

- time jump
- location jump
- POV change
- major cast shift
- purpose reset
- full player-choice hinge
- terminal surface
- fork point where sibling alternatives become reader-visible

Prefer ending at the latest playable `PG` when the range still reads as one continuous exchange. The reader should see one clear current choice surface at scene end.

## Required Range Checks

Validate from the end page's `branch_path`:

1. `start_page_id` exists inside `end_page_id.branch_path`.
2. `pg_ids` equals the inclusive contiguous slice from `start_page_id` to `end_page_id`.
3. Every included page has the same `branch_id`.
4. Every included page's own `branch_path` is a prefix of `end_page_id.branch_path`.
5. `choice_surface_page_id` equals `end_page_id`.
6. `emitted_choice_ids` equals the end page's `emitted_choices` in order.

Do not infer contiguity from numeric page ids. Use `branch_path`; it is the causal lineage.

## Boundary Rationale

`boundary_rationale` must explain why this committed range belongs together as a reader scene. Good rationales name factual continuity:

- same bench exchange
- same immediate pursuit
- same room and cast with no time break
- same decision aftermath through the next visible choice surface

Bad rationales name narrative shape or future obligation:

- Act I setup
- midpoint reversal
- rising action beat
- builds toward the confrontation
- this scene must force the climax

If the user supplies a rationale with narrative-shape language, rewrite it into factual continuity language before validation and approval.
