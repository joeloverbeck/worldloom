# VALENH-008: Broaden recursive reference closure root to full page record

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/recursive-reference-closure.ts`, focused validator tests, and downstream story-skill contract prose.
**Deps**: `archive/tickets/BSBOOT-008.md`, `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md`, `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md`

## Problem

`archive/tickets/BSBOOT-008.md` corrected `branching-story-bootstrap` Phase 9 gate 12 so bootstrap closure traversal roots at PG-0001 itself, not only at `state_snapshot`. That was necessary because PG peer fields such as `storylet_realized`, `applied_event_ops`, and `emitted_choices` can cite story-local records that are not reachable from `state_snapshot`.

The same narrower root still exists in the runtime and audit backstops:

- `tools/validators/src/structural/recursive-reference-closure.ts` builds `roots` from `parsed.state_snapshot` only.
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` gate 3 says the runtime closure scan starts from `this_page.state_snapshot`.
- `.claude/skills/branching-story-health-audit/SKILL.md` Phase 4 says the audit walks records reachable from each page's `state_snapshot`.

That means a page could cite a dangling or sibling-branch `CHC` through `emitted_choices`, a bad `SE` through `applied_event_ops`, or an invalid `SLT` through `storylet_realized`, while the structural validator and audit prose still claim closure only over the snapshot-rooted graph.

## Assumption Reassessment (2026-05-06)

1. `tools/validators/src/structural/recursive-reference-closure.ts` currently derives closure roots with `storyLocalReferences(asPlainRecord(parsed.state_snapshot), "state_snapshot")`. Verified.
2. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` gate 3 currently roots recursive closure at `this_page.state_snapshot`. Verified.
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

## Architecture Check

1. Rooting recursive closure at the page record is the cleaner contract because the page record is the actual branch-state envelope. `state_snapshot` remains the state-register subset; peer fields are still first-class edges that can affect the next tick and must be branch-isolated.
2. No backwards-compatibility aliasing or shims. The validator name, verdict family, and gate key stay `recursive_reference_closure`; the root set is broadened.

## Verification Layers

1. Structural validator roots include page peer fields -> focused validator tests over `storylet_realized`, `applied_event_ops`, and `emitted_choices`.
2. Runtime page-cycle gate 3 names the full page-record root -> codebase grep-proof + manual review.
3. Health audit Phase 4 names the full page-record root -> codebase grep-proof + manual review.
4. Bootstrap BSBOOT-008 wording remains aligned -> grep-proof against `branching-story-bootstrap/references/phase-9-validation-gates.md`.
5. `story-fact-promotion-to-canon` and `storylet-pool-authoring` remain out of scope -> manual review notes in closeout.

## What to Change

### 1. `tools/validators/src/structural/recursive-reference-closure.ts`

Broaden the closure roots for each newly-created PG record from only:

```ts
storyLocalReferences(asPlainRecord(parsed.state_snapshot), "state_snapshot")
```

to the page-record reference graph:

- `state_snapshot`
- `storylet_realized`
- `applied_event_ops`
- `emitted_choices`

Then keep the existing recursive walk through every referenced record body, including each emitted CHC's `likely_effects`, `uses_fact`, `target`, and `actor` fields.

### 2. `tools/validators/tests/structural/recursive-reference-closure.test.ts`

Add focused tests that fail before the root broadening and pass after it:

- missing or sibling-branch `SLT` reached through `PG.storylet_realized`;
- missing or sibling-branch `SE` reached through `PG.applied_event_ops`;
- missing or sibling-branch `CHC` reached through `PG.emitted_choices`;
- nested CHC effect-graph leak reached through `PG.emitted_choices -> CHC.uses_fact` or `CHC.likely_effects`.

### 3. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`

Update gate 3 and the whole-class-loads note so runtime recursive closure roots at the page record itself, expanding through `state_snapshot`, `storylet_realized`, `applied_event_ops`, and `emitted_choices`, then recursively through every reached story-local record. Keep `state_snapshot_integrity` as the snapshot-field-population gate, not the closure root.

### 4. `.claude/skills/branching-story-health-audit/SKILL.md`

Update the World-State Prerequisites and Phase 4 drift-detection prose so health audit loads and walks the full page-record closure root for each in-scope page, not just records cited by `state_snapshot`. Name the peer fields explicitly and keep the sibling-branch read discipline intact.

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

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — add peer-field root tests and nested CHC effect-graph tests.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/registry.test.js`
3. `cd tools/validators && npm test`
4. `grep -nE 'page record itself|storylet_realized.*applied_event_ops.*emitted_choices|full page-record' .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-health-audit/SKILL.md`
