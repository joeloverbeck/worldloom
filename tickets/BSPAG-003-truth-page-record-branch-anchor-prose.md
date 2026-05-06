# BSPAG-003: Truth page-record branch-anchor prose after VALENH-006

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes - `.claude/skills/branching-story-page-cycle/SKILL.md`, page-cycle reference prose, and branching-story-bootstrap templates/references only
**Deps**: `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md` (completed; establishes that PG records are branch anchors by id and do not need `created_at_page`)

## Problem

VALENH-006 corrected `recursive_reference_closure` so page-record references are authorized by the referenced PG id's membership in the new page's `branch_path`, not by a `created_at_page` field on the page record. That is now the validator contract: a page record is the page, so its own `id` is the branch anchor.

Several branching-story workflow instructions still tell operators and templates that PG records are ordinary emergent records carrying `created_at_page: this_PG` / `created_at_page: PG-0001`. That prose is now stale and can make future page-cycle/bootstrap runs reintroduce redundant PG `created_at_page` fields, obscuring the validator's intended branch-anchor model.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/VALENH-006-recursive-reference-closure-pg-handling.md` is the completed dependency and states that page targets are allowed when their PG id is in the branch path, independent of whether the page record carries `created_at_page`.
2. `.claude/skills/branching-story-page-cycle/SKILL.md` still says the Phase 5 branch-isolation invariant is `created_at_page == this_PG on every emergent record`, and its ID conventions list includes `PG` among records that carry `created_at_page: PG-NNNN`.
3. `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` still says every new story-local record, including `PG`, carries `created_at_page: this_PG`.
4. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` still has a root-page template section with `created_at_page: PG-0001`, even though live page records do not need that field under VALENH-006.
5. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` still describes recursive reference closure as every story-local id reachable from the root snapshot having `created_at_page == null` or `created_at_page == PG-0001`; it does not name the PG-id-as-branch-anchor exception.
6. Cross-skill boundary: this ticket owns prose/template alignment for branching-story page records only. It must preserve `created_at_page` requirements for non-PG branch-scoped records and preserve `provenance.created_at_page` for runtime-JIT storylets.
7. FOUNDATIONS alignment: this is a workflow-contract correction, not a world-content migration. It must not mutate existing world source records, silently retcon PG records, or weaken recursive reference closure for non-PG records.
8. Adjacent contradiction classification: stale PG `created_at_page` prose is separate workflow cleanup discovered during VALENH-006 post-ticket review. It is not required to make the validator implementation correct, but it should be fixed before the next page-cycle/bootstrap skill hardening pass relies on these instructions.

## Architecture Check

1. Correcting the workflow prose to distinguish page records from records-on-pages is cleaner than adding redundant `created_at_page` fields to PG records or migrating old story data.
2. No backwards-compatibility aliases, shims, or schema fallbacks are introduced. This ticket updates instructions/templates to match the current validator contract.

## Verification Layers

1. PG records are excluded from generic `created_at_page` requirements -> grep-proof over page-cycle skill/reference prose and bootstrap template/reference prose.
2. Non-PG branch-scoped records still require branch anchors -> manual review of edited lists to confirm only `PG` is removed from generic `created_at_page` wording.
3. Recursive reference closure prose names the PG branch-anchor rule -> grep-proof for language tying PG references to `branch_path` membership by PG id.
4. FOUNDATIONS append-only discipline is preserved -> manual review confirms no world source migration or canon mutation is requested.

## What to Change

### 1. Correct page-cycle branch-isolation wording

Update page-cycle summary and Phase 5 reference prose so "every emergent record carries `created_at_page`" becomes "every non-PG branch-scoped emergent record carries `created_at_page`; PG records are authorized by their own id in `branch_path`."

Keep `created_at_page` / `provenance.created_at_page` requirements for SF, SE, OBL, CNSQ, THR, SREL, STINT, SLT-JIT, STLOC, STOBJ, DA, CHC, and BR-on-fork where applicable.

### 2. Correct bootstrap root-page template/prose

Remove `created_at_page: PG-0001` from the PG-0001 page template and update bootstrap validation-gate prose so root-page PG references are checked by PG id membership in `[PG-0001]`, while non-PG story-local records remain anchored to PG-0001 or global-author-pool null visibility as appropriate.

### 3. Search for remaining stale PG-created-at claims

Run a targeted grep over `.claude/skills/branching-story-page-cycle` and `.claude/skills/branching-story-bootstrap` for stale claims that PG records carry `created_at_page`, then update only the sites that actually describe PG page records.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify if PG/branch-anchor prose is present)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- Validator code changes; VALENH-006 already changed `recursive_reference_closure`.
- Existing world-source migration or direct edits to `worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-*.yaml`.
- Removing `created_at_page` from non-PG story-local records.
- Changing runtime-JIT storylet provenance.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'SF / SE / OBL / CNSQ / THR / SREL / STINT / SLT-JIT / STLOC / STOBJ / DA / CHC / PG|every new story-local record .* PG|created_at_page == this_PG on every emergent record|PG records.*created_at_page|created_at_page: PG-0001' .claude/skills/branching-story-page-cycle .claude/skills/branching-story-bootstrap` returns no stale PG-page contract hits. Legitimate non-PG examples may remain and must be manually classified.
2. `rg -n 'PG.*branch_path|page record|page-record|branch anchor' .claude/skills/branching-story-page-cycle .claude/skills/branching-story-bootstrap` shows explicit PG-id branch-anchor wording in the edited skill/reference surfaces.
3. Manual contract review confirms non-PG branch-scoped records still carry `created_at_page` or `provenance.created_at_page` where the existing schema requires it.

### Invariants

1. Page records are branch anchors by `id`; they do not require `created_at_page` for recursive reference closure.
2. Non-PG story-local branch-scoped records still need a branch anchor, usually `created_at_page`, with VALENH-006's legacy OBL fallback left as validator implementation detail rather than new authoring guidance.
3. Workflow prose must not instruct operators to migrate or retcon existing page records.

## Test Plan

### New/Modified Tests

1. None - workflow prose and template contract cleanup; the validator behavior is already covered by VALENH-006 tests.

### Commands

1. `rg -n 'SF / SE / OBL / CNSQ / THR / SREL / STINT / SLT-JIT / STLOC / STOBJ / DA / CHC / PG|every new story-local record .* PG|created_at_page == this_PG on every emergent record|PG records.*created_at_page|created_at_page: PG-0001' .claude/skills/branching-story-page-cycle .claude/skills/branching-story-bootstrap`
2. `rg -n 'PG.*branch_path|page record|page-record|branch anchor' .claude/skills/branching-story-page-cycle .claude/skills/branching-story-bootstrap`
3. Manual contract review of the files listed in Files to Touch.
