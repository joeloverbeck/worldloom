# BSBOOT-019: Define downstream `canon_revision: null` semantics for page-cycle and health audit

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — downstream story-skill contract prose only; no validator or patch-engine changes.
**Deps**: archive/tickets/BSBOOT-005.md

## Problem

`archive/tickets/BSBOOT-005.md` aligned the bootstrap BR-0001 and PG-0001 examples with the pre-flight authority: genesis worlds with no CH records use `canon_revision: null`, not `""`.

Downstream consumers mostly already treat `canon_revision` as an audit field, but two live consumer surfaces do not fully define the `null` case:

- `.claude/skills/branching-story-page-cycle/references/record-schemas.md:23` types `state_snapshot.canon_revision` as `CH-NNNN | null`.
- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md:54` says to read the latest `CH-NNNN.yaml` and record it, but does not say that worlds with no CH records must write `state_snapshot.canon_revision: null`.
- `.claude/skills/branching-story-health-audit/SKILL.md:251` says `canon_revision` must be monotonic-non-decreasing, but does not define how `null` compares to `CH-NNNN` or how an all-null genesis sequence is classified.

That leaves a small contract gap: bootstrap can now emit `null`, while page-cycle and health-audit do not state the exact downstream handling for a genesis-world branch before first canonization.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-005.md` completed the forward-looking bootstrap template change: BR-0001 and PG-0001 examples now use `canon_revision: null` for the no-CH-yet case.
2. `branching-story-page-cycle` already advertises the nullable page field in `references/record-schemas.md`, but its pre-flight current-revision bullet only names the latest `CH-NNNN.yaml` path and omits the no-CH fallback.
3. Cross-skill boundary: the shared contract is the story-bundle canon baseline field, specifically `BR.canon_revision` and `PG.state_snapshot.canon_revision`, as emitted by bootstrap, advanced by page-cycle, and audited by health-audit.
4. `branching-story-health-audit` consumes the field for canon-baseline drift and needs explicit ordering semantics: `null` means no world CH was visible at that tick, `null -> CH-NNNN` is a first-canonization advancement, `CH-NNNN -> null` is a regression/corrupt trail, and `null -> null` is stable in an uncanonized genesis world.
5. `story-fact-promotion-to-canon` was reviewed as a downstream consumer. It reads branch leaf `state_snapshot` records for contradiction analysis and creates world CH records through `canon-addition`, but it does not compare `canon_revision` values or emit page snapshots. No immediate change is required there for BSBOOT-005's null example.
6. `storylet-pool-authoring` was reviewed as a downstream consumer. It receives `caller_state_snapshot` in JIT mode and documents predicate evaluation against state fields, but it does not inspect or compare `canon_revision`. No immediate change is required there for BSBOOT-005's null example.
7. This is docs/skill-contract truthing only. No JSON schema tightening is required because `story-page.schema.json` and `story-branch.schema.json` remain intentionally permissive per BSBOOT-005.

## Architecture Check

1. Cleaner contract: define the nullable audit-trail semantics at the two consumers that act on the field, instead of adding schema constraints or migration logic for old bundles.
2. No backwards-compatibility aliasing/shims introduced. `null` remains the only documented absence value; historical empty strings are not normalized by these skills.

## Verification Layers

1. Page-cycle no-CH fallback is documented -> codebase grep-proof plus manual review of `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md`.
2. Health-audit null ordering is documented -> codebase grep-proof plus manual review of `.claude/skills/branching-story-health-audit/SKILL.md`.
3. Non-consuming downstream skills remain untouched -> codebase grep-proof that `story-fact-promotion-to-canon` and `storylet-pool-authoring` still do not claim `canon_revision` ordering/default semantics.

## What to Change

### 1. `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md`

Update the current-world-canon-revision bullet so it mirrors bootstrap:

- use `mcp__worldloom__list_records(world_slug, record_type='change_log_entry', fields=['record_id'])` or the existing context-packet governing context;
- choose the highest-numbered `CH-NNNN` when present;
- if no CH records exist, set `state_snapshot.canon_revision: null`;
- do not direct-list `_source/change-log/` except as the existing offline/debug fallback.

### 2. `.claude/skills/branching-story-health-audit/SKILL.md`

Update the Canon-Baseline Drift check to define nullable ordering:

- `null` means no CH record was visible at that page tick;
- `null -> null` is stable;
- `null -> CH-NNNN` is a valid first-canonization advancement;
- `CH-NNNN -> higher/equal CH-NNNN` is valid monotonic behavior;
- `CH-NNNN -> lower CH-NNNN` or `CH-NNNN -> null` is a regression/error.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `tickets/BSBOOT-019.md` (closeout)

## Out of Scope

- Editing `story-fact-promotion-to-canon`; it does not own `canon_revision` comparison or page-snapshot emission.
- Editing `storylet-pool-authoring`; it receives snapshots for predicate context but does not consume `canon_revision`.
- Adding JSON-schema constraints or migrations for historical bundles.
- Migrating any world or story-bundle content.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'canon_revision.*null|no CH|change_log_entry' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` shows the page-cycle no-CH fallback.
2. `rg -n 'null -> CH|CH-NNNN -> null|null means no CH|Canon-Baseline Drift' .claude/skills/branching-story-health-audit/SKILL.md` shows explicit nullable drift semantics.
3. `rg -n 'canon_revision' .claude/skills/story-fact-promotion-to-canon .claude/skills/storylet-pool-authoring` is either empty or limited to incidental snapshot mentions that do not define ordering/default behavior.

### Invariants

1. `null` is the only documented absence value for a missing world canon revision.
2. Downstream consumers do not treat `null` as an empty string or as a comparable `CH-NNNN` id.
3. Page-cycle and health-audit stay forward-only and do not mutate existing page snapshots.

## Test Plan

### New/Modified Tests

1. None — documentation-only skill-contract ticket; verification is grep/manual-review based.

### Commands

1. `rg -n 'canon_revision.*null|no CH|change_log_entry' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md`
2. `rg -n 'null -> CH|CH-NNNN -> null|null means no CH|Canon-Baseline Drift' .claude/skills/branching-story-health-audit/SKILL.md`
3. `rg -n 'canon_revision' .claude/skills/story-fact-promotion-to-canon .claude/skills/storylet-pool-authoring`
4. `git diff --check`
