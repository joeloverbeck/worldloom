# VALENH-008: Broaden recursive reference closure root to full page record

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/recursive-reference-closure.ts`, focused validator tests, and downstream story-skill contract prose.
**Deps**: `archive/tickets/BSBOOT-008.md`, `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md`, `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md`

## Problem

At intake, `archive/tickets/BSBOOT-008.md` had corrected `branching-story-bootstrap` Phase 9 gate 12 so bootstrap closure traversal roots at PG-0001 itself, not only at `state_snapshot`. That was necessary because PG peer fields such as `storylet_realized`, `applied_event_ops`, and `emitted_choices` can cite story-local records that are not reachable from `state_snapshot`.

The same narrower root still existed in the runtime and audit backstops:

- At intake, `tools/validators/src/structural/recursive-reference-closure.ts` built `roots` from `parsed.state_snapshot` only.
- At intake, `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` gate 3 said the runtime closure scan starts from `this_page.state_snapshot`.
- At intake, `.claude/skills/branching-story-health-audit/SKILL.md` Phase 4 said the audit walks records reachable from each page's `state_snapshot`.

That meant a page could cite a dangling or sibling-branch `CHC` through `emitted_choices`, a bad `SE` through `applied_event_ops`, or an invalid `SLT` through `storylet_realized`, while the structural validator and audit prose still claimed closure only over the snapshot-rooted graph.

## Assumption Reassessment (2026-05-06)

1. At intake, `tools/validators/src/structural/recursive-reference-closure.ts` derived closure roots with `storyLocalReferences(asPlainRecord(parsed.state_snapshot), "state_snapshot")`. Verified before implementation.
2. At intake, `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` gate 3 rooted recursive closure at `this_page.state_snapshot`. Verified before implementation.
3. Shared boundary under audit: the story-page recursive-reference-closure contract across the structural validator, runtime page-cycle Phase 9 gate 3, and health-audit Phase 4 drift detection.
4. FOUNDATIONS / hard-gate principle: this strengthens Rule 4 story-scope branch isolation and preserves HARD-GATE Canon Safety Check fail-closed behavior; it does not alter Mystery Reserve or canon-promotion approvals.
5. `archive/tickets/BSBOOT-008.md` completed the bootstrap producer wording only. Runtime page-cycle, health audit, and the machine-facing validator were intentionally not changed there.
6. `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md` landed the validator with a `state_snapshot` root, matching the older page-cycle gate wording. `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md` corrected PG-id branch-anchor handling but explicitly did not change the skill prose or the root set.
7. Downstream consumer classification:
   - `branching-story-page-cycle` needs a contract wording change because it emits ordinary runtime pages with the same peer page references (`storylet_realized`, `applied_event_ops`, `emitted_choices`) that BSBOOT-008 fixed for PG-0001.
   - `branching-story-health-audit` needs a contract wording change because it is the read-only reviewer of branch-isolation health and would otherwise miss peer-field leaks when reporting recursive closure.
   - `story-fact-promotion-to-canon` does not need a source change for this ticket; it validates promotion provenance along `promotion_branch_path`, leaf snapshots, and supporting pages, but it does not own recursive closure enforcement for page peer fields.
   - `storylet-pool-authoring` does not need a source change for this ticket; it consumes branch state and emits storylets/choice templates, but the page peer-field closure backstop belongs to page-cycle, health-audit, and the validator.
8. Active sibling tickets checked: `tickets/BSBOOT-013.md` extends bootstrap CHC metadata and depends on `archive/tickets/BSBOOT-008.md`, but it does not own validator or runtime page-cycle recursive-closure rooting.
9. Implementation preserved the existing validator name, applies-to predicate, verdict codes, PG branch-anchor handling, legacy OBL `introduced_at_page` fallback, author-pool storylet allowance, branch-prefix storylet allowance, and world-level ID bypass. The only behavior change is the root set for newly-created PG records.

## Architecture Check

1. Rooting recursive closure at the page record is the cleaner contract because the page record is the actual branch-state envelope. `state_snapshot` remains the state-register subset; peer fields are still first-class edges that can affect the next tick and must be branch-isolated.
2. No backwards-compatibility aliasing or shims. The validator name, verdict family, and gate key stay `recursive_reference_closure`; the root set is broadened.

## Verification Layers

1. Structural validator roots include page peer fields -> focused validator tests over `storylet_realized`, `applied_event_ops`, and `emitted_choices`.
2. Runtime page-cycle gate 3 names the full page-record root -> codebase grep-proof + manual review.
3. Health audit Phase 4 names the full page-record root -> codebase grep-proof + manual review.
4. Bootstrap BSBOOT-008 wording remains aligned -> grep-proof against `branching-story-bootstrap/references/phase-9-validation-gates.md`.
5. `story-fact-promotion-to-canon` and `storylet-pool-authoring` remain out of scope -> manual review notes in closeout.

## Landed Changes

### 1. `tools/validators/src/structural/recursive-reference-closure.ts`

Broadened the closure roots for each newly-created PG record from only:

```ts
storyLocalReferences(asPlainRecord(parsed.state_snapshot), "state_snapshot")
```

to the page-record reference graph:

- `state_snapshot`
- `storylet_realized`
- `applied_event_ops`
- `emitted_choices`

The existing recursive walk through every referenced record body remains in place, including each emitted CHC's `likely_effects`, `uses_fact`, `target`, and `actor` fields.

### 2. `tools/validators/tests/structural/recursive-reference-closure.test.ts`

Added focused tests that fail before the root broadening and pass after it:

- sibling-branch `SLT` reached through `PG.storylet_realized`;
- sibling-branch `SE` reached through `PG.applied_event_ops`;
- missing `CHC` reached through `PG.emitted_choices`;
- nested CHC effect-graph leak reached through `PG.emitted_choices -> CHC.uses_fact`.

### 3. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`

Updated gate 3 and the whole-class-loads note so runtime recursive closure roots at the page record itself, expanding through `state_snapshot`, `storylet_realized`, `applied_event_ops`, and `emitted_choices`, then recursively through every reached story-local record. `state_snapshot_integrity` remains the snapshot-field-population gate, not the closure root.

### 4. `.claude/skills/branching-story-health-audit/SKILL.md`

Updated the overview, World-State Prerequisites, Phase 2 assembly note, Phase 4 drift-detection prose, and Rule 4 alignment table so health audit loads and walks the full page-record closure root for each in-scope page, not just records cited by `state_snapshot`. The sibling-branch read discipline remains intact.

## Files to Touch

- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Changing `story-fact-promotion-to-canon`; it owns canon-promotion provenance and contradiction handling, not page peer-field recursive closure.
- Changing `storylet-pool-authoring`; it owns storylet authoring/JIT/audit inputs, not page-record closure enforcement.
- Reworking `state_snapshot_integrity`; dangling references inside the snapshot subset remain covered there, but page-peer graph closure belongs to `recursive_reference_closure`.
- Migrating existing story content.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js`
3. `cd tools/validators && npm test`
4. `grep -nE 'page record itself|storylet_realized.*applied_event_ops.*emitted_choices|full page-record' .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-health-audit/SKILL.md`

### Invariants

1. Every story-local ID reachable from the page record root, recursively, resolves and is branch-legal.
2. `state_snapshot_integrity` remains scoped to the snapshot subset; it is not overloaded to validate page peer fields.
3. Page-cycle, health-audit, bootstrap, and the structural validator use one closure-root contract.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — added peer-field root tests and a nested CHC effect-graph test.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js`
3. `cd tools/validators && npm test`
4. `grep -nE 'page record itself|storylet_realized.*applied_event_ops.*emitted_choices|full page-record' .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-health-audit/SKILL.md`

## Outcome

Completed on 2026-05-06. `recursive_reference_closure` now seeds traversal from the full page-record root for newly-created PG records: `state_snapshot`, `storylet_realized`, `applied_event_ops`, and `emitted_choices`. The validator then preserves its existing recursive walk through reached record bodies, so CHC effect-graph references reached from `emitted_choices` are now enforced too.

The page-cycle Phase 9 gate 3 prose and health-audit recursive-closure prose now state the same full page-record root contract. `state_snapshot_integrity` remains separate and scoped to snapshot field population / dangling snapshot references.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js` — passed.
3. `cd tools/validators && npm test` — passed, 138/138 tests.
4. `grep -nE 'page record itself|storylet_realized.*applied_event_ops.*emitted_choices|full page-record' .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-health-audit/SKILL.md` — passed; matched the page-cycle gate and health-audit full-root references.
5. `grep -nE '^\| 12 .*PG-0001 itself.*storylet_realized.*emitted_choices.*likely_effects' .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — passed; bootstrap gate 12 remains aligned with the same full page-record closure contract.

## Deviations

- The landed focused tests use one representative failing surface per peer field: sibling `SLT` via `storylet_realized`, sibling `SE` via `applied_event_ops`, missing `CHC` via `emitted_choices`, and sibling `SF` via `emitted_choices -> CHC.uses_fact`. This proves the broadened root and recursive CHC walk without duplicating every missing/sibling permutation.
- Existing ignored package artifacts `tools/validators/dist/` and `tools/validators/node_modules/` were present before verification and were reused/refreshed by the package build/test commands.
