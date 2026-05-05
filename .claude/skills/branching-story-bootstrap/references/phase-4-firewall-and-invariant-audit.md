# Phase 4: Mystery Firewall + Invariant Audit

Reference for `branching-story-bootstrap` Phase 4 — the canon-safety check that runs the normalized premise + cast bindings + imported SFs (Phases 1-3 outputs) against every world Mystery Reserve and Invariant record loaded at Pre-flight. Hard-rejection routes back to the responsible upstream phase (or to the user with a premise-revision request) before any structural setup begins at Phase 5.

---

## Mystery firewall (Rule 7 enforcement)

For each `M-NNNN` in the whole-class load whose domain overlaps the premise OR whose narrative orbit includes any cast member:

> **Narrative orbit** is satisfied when (a) the cast member's world-canonical CHAR dossier `world_consistency.mystery_reserve_firewall` lists the M, OR (b) the M's `domains_touched` overlap a domain the cast member structurally engages per their dossier `major_local_pressures` or `intended_narrative_role`. Declare both classes in `mysteries_in_play[]`; the dossier-listing path is the conservative default and accounts for most declarations in practice.

- Declare it in `STORY_KERNEL.md`'s `mysteries_in_play[]` with the M's `status` and `future_resolution_safety`.
- **Hard reject** (abort the bootstrap) if any premise element, imported SF, planned thread, or planned obligation resolves a `forbidden`-status M.
- For `low | medium | high`-resolution-safety M entries: note that in-story resolution requires routing through `story-fact-promotion-to-canon`.

---

## Invariant audit (Rule 4 enforcement)

Run premise + cast + initial-threads + initial-obligations against every INV record from the whole-class load:

> **Phase ordering note**: Threads + obligations are not yet emitted at Phase 4; sketch their intended shape during the audit so the audit can reason against them, then formalize in Phase 5. If Phase 5 produces threads/obligations that diverge materially from the Phase 4 sketch (e.g., a thread that introduces a distribution claim the sketch did not anticipate), re-run the relevant INV audit branches before proceeding to Phase 6.

- Flag tensions: does the premise assume a capability that violates an INV's `break_conditions`? Does an obligation imply a distribution change that breaks Rule 4?
- **Hard reject** (or revise premise with user) if any tension is unresolvable.

---

**Output to STORY_KERNEL.md**: `mysteries_in_play[]` populated; `invariants_acknowledged[]` populated (cite the INV ids the story will respect — anchors later validation).
