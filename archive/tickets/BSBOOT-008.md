# BSBOOT-008: Broaden Phase 9 gate 12 closure root (PG-0001, not just `state_snapshot`)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/references/phase-9-validation-gates.md` and `branching-story-bootstrap/references/phase-7-root-page-render.md` only.
**Deps**: none

## Problem

At intake, Phase 9 gate 12 rooted its closure traversal at `state_snapshot`:

> `references/phase-9-validation-gates.md:20` — gate 12: "every non-PG story-local ID cited inside any record reachable from `state_snapshot` either has `created_at_page == null` … or `created_at_page == PG-0001`"

Several PG-0001 fields critical to runtime correctness are **peer fields** of `state_snapshot`, not children of it:

- `PG-0001.emitted_choices` (the CHC ids — references to choices)
- `PG-0001.storylet_realized` (the SLT id — reference to a storylet)
- `PG-0001.applied_event_ops` (the SE id — reference to the genesis event)

A dangling CHC reference (e.g. `CHC-0001` whose `uses_fact: SF-0099` points to a non-existent SF), a broken `storylet_realized`, or a missing SE-reference would not have been caught by the pre-ticket gate-12 wording because none of those fields are inside `state_snapshot` per `templates/story-records.yaml:285-319`. The CHC's effect graph (`CHC.likely_effects`, `CHC.uses_fact`, `CHC.target`, `CHC.actor`) is exactly the surface most likely to break a runtime page-cycle on the next tick.

## Assumption Reassessment (2026-05-06)

1. At intake, `references/phase-9-validation-gates.md:20` — gate 12 closure root was `state_snapshot`. Verified before the source edit.
2. `templates/story-records.yaml:285-319` — `state_snapshot` is a child block of PG-0001; `emitted_choices`, `storylet_realized`, `applied_event_ops` are peer fields. Verified.
3. Cross-skill / cross-artifact boundary: gate 12 is a recursive-reference-closure check on PG-0001's full reference graph. The runtime page-cycle (`branching-story-page-cycle`) inherits the same closure expectation when forking new pages; bootstrap-time closure must be at least as strong as runtime expects.
4. FOUNDATIONS principle: indirectly Rule 4 (causal closure). Closure of references is a structural integrity check, not a Foundations rule per se. The fix improves operator-discipline structural integrity.
5. HARD-GATE-semantics check: strengthening gate 12 is consistent with the HARD-GATE's "every gate records PASS with rationale" requirement. No relaxation.
6. Adjacent contradiction: this ticket overlaps with the dual-validation-trace mapping in `references/phase-7-root-page-render.md:97-121`, which maps gate 12 to `recursive_reference_closure` + `state_snapshot_integrity` on the PG-0001 record. Both keys remain valid; the closure-root broadening is consistent with both keys (the integrity key still covers state_snapshot completeness; the closure key now covers the full reference graph).

## Architecture Check

1. **Why cleaner**: rooting closure at PG-0001 itself catches every dangling reference that gate 12 was designed to catch. The narrow root (state_snapshot only) is a documentation slip, not an intentional design decision — the intent of gate 12 is "every story-local id cited anywhere on PG-0001 resolves correctly".
2. No backwards-compatibility shim. The gate's wording strengthens; the per-PG `validation_trace` keys remain unchanged.

## Verification Layers

1. Gate 12 wording roots traversal at PG-0001 → codebase grep-proof + manual review.
2. Closure traversal covers `state_snapshot` ∪ `storylet_realized` ∪ `applied_event_ops` ∪ `emitted_choices` → manual review (compare gate-12 wording against the PG record schema).
3. CHC effect-graph traversal — `CHC.likely_effects` / `CHC.uses_fact` / `CHC.target` / `CHC.actor` ids resolve → manual review (the new wording explicitly names these fields as part of the closure).
4. Dual-trace mapping consistency with `phase-7-root-page-render.md:97-121` → codebase grep-proof.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`

- Replaced gate 12's "Check" cell:

  **Before:**

  ```
  | 12 | State_snapshot completeness + recursive reference closure | `current_location`, `entity_status`, `relationships_current`, and the epistemic-faceted fact lists populated; every non-PG story-local ID cited inside any record reachable from `state_snapshot` either has `created_at_page == null` (globally legal — author-pool storylets only) or `created_at_page == PG-0001`; every PG reference is allowed when that PG id is in the root `branch_path` (`[PG-0001]`) because the page record's own id is its branch anchor | Phase 7 |
  ```

  **After:**

  ```
  | 12 | State_snapshot completeness + recursive reference closure | `current_location`, `entity_status`, `relationships_current`, and the epistemic-faceted fact lists populated on `state_snapshot`; closure traversal roots at PG-0001 itself, expanding through `state_snapshot`, `storylet_realized`, `applied_event_ops`, and `emitted_choices`, then through every CHC's `likely_effects`, `uses_fact`, `target`, and `actor`; every non-PG story-local ID encountered either has `created_at_page == null` (globally legal — author-pool storylets only) or `created_at_page == PG-0001`; every PG reference is allowed when that PG id is in the root `branch_path` (`[PG-0001]`) because the page record's own id is its branch anchor | Phase 7 |
  ```

### 2. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md`

- Updated the dual-validation-trace mapping note to clarify that the PG-0001 `validation_trace.recursive_reference_closure` key records the broader closure result, while `state_snapshot_integrity` records the field-population subset of the gate.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` (modify)

## Out of Scope

- Implementing a programmatic closure-traversal validator. The fix is documentation-level; the existing `cross_file_reference` validator at submit time catches the most-broken case (file-level missing references), and this gate is the in-skill backstop for in-memory references the validator would not see until after submit.
- Editing `branching-story-page-cycle` page-record discipline. The runtime page-cycle inherits the broader closure expectation by reading PG-0001 as a worked example; cross-skill alignment is implicit, not a separate code change.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE '^\| 12 .*PG-0001 itself.*storylet_realized.*emitted_choices.*likely_effects' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns a gate-12 row match.
2. `grep -nE 'reachable from .state_snapshot.' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns no matches; the new wording names PG-0001 as the root, with state_snapshot as one expansion edge among several.
3. The dual-validation-trace mapping in `phase-7-root-page-render.md` is consistent with the new gate-12 wording.

### Invariants

1. Closure traversal roots at PG-0001 and reaches every story-local id cited on the page record.
2. CHC effect-graph references (`likely_effects` / `uses_fact` / `target` / `actor`) participate in the closure check.
3. The gate-12 PASS rationale form (`PASS — <one-line rationale>`) is unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE '^\| 12 .*PG-0001 itself.*storylet_realized.*emitted_choices.*likely_effects' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms broader gate-12 wording.
2. `grep -nE 'reachable from .state_snapshot.' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — confirms the old sole-root wording is gone.
3. `grep -n 'recursive_reference_closure\|state_snapshot_integrity' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — confirms dual-trace mapping is still aligned.

## Outcome

Completed. Gate 12 now roots recursive-reference closure at PG-0001 itself, expands through the root page's `state_snapshot`, `storylet_realized`, `applied_event_ops`, and `emitted_choices`, and explicitly carries traversal into each emitted CHC's `likely_effects`, `uses_fact`, `target`, and `actor` fields. The Phase 7 dual-validation-trace mapping now records that `recursive_reference_closure` owns the broader PG graph closure while `state_snapshot_integrity` owns the state-snapshot population subset.

## Verification Result

1. `grep -nE '^\| 12 .*PG-0001 itself.*storylet_realized.*emitted_choices.*likely_effects' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; gate 12 contains the broader PG-0001 root and CHC effect-graph wording.
2. `grep -nE 'reachable from .state_snapshot.' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; exited 1 with no matches, confirming the stale sole-root phrase is gone.
3. `grep -n 'recursive_reference_closure\|state_snapshot_integrity' .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — pass; the mapping note distinguishes broad closure from state-snapshot field population.

## Deviations

- The landed wording uses comma-separated field names rather than the drafted union symbol form; the invariant is unchanged.
- An initial broad `rg` probe used an unsafe double-quoted pattern containing backticks and caused shell interpretation of `state_snapshot`; it was rerun with single-quoted literals before source edits, and the failed shell-shape probe was not counted as verification.
