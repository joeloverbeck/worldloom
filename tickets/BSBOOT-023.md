# BSBOOT-023: Teach health audit to inspect bootstrap Phase 9.5 discipline trace

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-health-audit` skill/report-template prose only. No runtime page-cycle, storylet-pool, promotion, validator, schema, patch-engine, or world-content change.
**Deps**: `archive/tickets/BSBOOT-015.md`, `archive/tickets/BSBOOT-020.md`

## Problem

`BSBOOT-015` added bootstrap Phase 9.5 as a required pre-Phase-10 discipline validator and added `STORY_KERNEL.md.discipline_validation_trace` as the audit trail for its 10 checks.

`branching-story-health-audit` is the downstream skill that audits existing story bundles and reads `STORY_KERNEL.md`, but it currently only names bootstrap Rule 4 sketch integrity as a bootstrap-origin STORY_KERNEL audit surface. It does not inspect `discipline_validation_trace`, so a new-format bundle with a missing, incomplete, or bare-PASS Phase 9.5 trace could be audited without surfacing that bootstrap acceptance-trace gap.

The other reviewed downstream skills do not need direct changes:

- `branching-story-page-cycle` owns runtime page-tick gates and already enforces its own CHC/state/trace checks on new pages.
- `storylet-pool-authoring` produces SLT records and, for bootstrap seed mode, runs before bootstrap Phase 9.5 exists; it does not consume the final `STORY_KERNEL.md` acceptance trace.
- `story-fact-promotion-to-canon` consumes promotion provenance and source records; it does not own bootstrap acceptance-trace audit.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-015.md` completed Phase 9.5 and states that `STORY_KERNEL.md.discipline_validation_trace` is a sibling block to `validation_trace`, with one PASS-with-rationale entry for each of 10 discipline checks.
2. `.claude/skills/branching-story-health-audit/SKILL.md` reads `STORY_KERNEL.md` and audits `STORY_KERNEL.audited_thread_obligation_sketch`, but it has no `discipline_validation_trace` / Phase 9.5 references.
3. Cross-skill / cross-artifact boundary: `branching-story-bootstrap` produces `STORY_KERNEL.discipline_validation_trace`; `branching-story-health-audit` consumes existing story-bundle `STORY_KERNEL.md` for post-run audit and is the correct read-only consumer for missing/malformed bootstrap acceptance traces.
4. FOUNDATIONS principle under audit: story-scope validation rules require story bundles to preserve Rule 1 / Rule 4 / Rule 5 / Rule 7 evidence. Phase 9.5 is not a new FOUNDATIONS rule, but it is now a required bootstrap acceptance trace that supports the same hard-gate discipline: every validation/rejection check records PASS with a one-line rationale before approval.
5. `archive/tickets/BSBOOT-020.md` already established the pattern for health-audit bootstrap-consumer alignment: add a focused audit category/status for a new bootstrap `STORY_KERNEL.md` field, classify explicit legacy bundles without requiring migration, and keep health audit read-only against story state.
6. `branching-story-page-cycle` was reviewed as a downstream consumer. It has its own `validation_trace` / Phase 9 gates for runtime pages and does not consume bootstrap Phase 9.5; no source change is warranted there.
7. `storylet-pool-authoring` was reviewed as a downstream consumer. Bootstrap parent invocation of storylet-pool-authoring occurs at bootstrap Phase 6, before Phase 9.5 and before `STORY_KERNEL.md` is written; no source change is warranted there.
8. `story-fact-promotion-to-canon` was reviewed as a downstream consumer. It reads `STORY_KERNEL.md` for promotion context but does not validate bootstrap acceptance traces; no source change is warranted there.
9. Adjacent contradiction classification: this is a concrete downstream audit gap exposed by BSBOOT-015. It is not unfinished BSBOOT-015 work because bootstrap now writes the trace; the remaining concern is post-bootstrap audit visibility.

## Architecture Check

1. The clean end state keeps Phase 9.5 as bootstrap-owned producer discipline and teaches only the bundle-audit consumer to inspect the resulting trace. Runtime page ticks, storylet authoring, and canon promotion keep their own validation contracts instead of inheriting bootstrap-only gates.
2. No backwards-compatibility aliasing or shims are introduced. Historical bundles that predate `BSBOOT-015` should be classified as legacy/info rather than migrated or treated as corrupt by default.

## Verification Layers

1. Health audit reads/names `discipline_validation_trace` in `STORY_KERNEL.md` prerequisites and diagnostics -> codebase grep-proof.
2. A dedicated finding category or clearly extended bootstrap integrity category classifies missing, incomplete, bare-PASS, or malformed Phase 9.5 trace entries -> manual review + codebase grep-proof.
3. Health-audit report template can report the trace status -> codebase grep-proof.
4. Page-cycle, storylet-pool-authoring, and story-fact-promotion remain reviewed non-consumers -> manual review; no source edits required.
5. FOUNDATIONS/HARD-GATE discipline preserved -> manual review that the audit remains read-only and does not weaken approval, write ordering, Mystery Reserve, or canon-mutation gates.

## What to Change

### 1. `.claude/skills/branching-story-health-audit/SKILL.md`

- Add `discipline_validation_trace` to the `STORY_KERNEL.md` fields read at Pre-flight.
- Add a health-audit diagnostic for bootstrap Phase 9.5 trace integrity. Either add a new `audit_focus` value such as `bootstrap_discipline_trace_integrity`, or explicitly extend the existing bootstrap integrity family if that keeps the category list cleaner.
- Classify missing/malformed trace for new/uncertain post-BSBOOT-015 bundles as `warning` or `error` depending on whether the missing trace undermines the bootstrap acceptance audit trail.
- Classify explicit pre-BSBOOT-015 bundles as `info` legacy, not migration targets.
- Treat bare `"PASS"` without a one-line rationale as malformed, matching HARD-GATE discipline.
- Keep remediation as manual/bootstrap review only; health audit must not mutate `STORY_KERNEL.md`.

### 2. `.claude/skills/branching-story-health-audit/templates/story-audit-report.md`

- Add frontmatter/body guidance for recording Phase 9.5 trace status, or extend the existing bootstrap status wording if a new field is unnecessary.
- Ensure findings for this category cite `STORY_KERNEL.md`, the missing/malformed discipline-check key(s), and whether the bundle is new/uncertain or explicit legacy.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)

## Out of Scope

- Editing `branching-story-bootstrap`; BSBOOT-015 already landed the producer trace.
- Editing `branching-story-page-cycle`; runtime pages keep their own Phase 9 `validation_trace`.
- Editing `storylet-pool-authoring`; bootstrap seed authoring runs before Phase 9.5 and does not consume the final story kernel trace.
- Editing `story-fact-promotion-to-canon`; promotion consumes branch/source provenance, not bootstrap acceptance-trace integrity.
- Adding a code-level validator or migrating existing story bundles.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "discipline_validation_trace|Phase 9\\.5|bootstrap_discipline" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` returns the new health-audit/read-report surfaces.
2. `rg -n "pre-BSBOOT-015|BSBOOT-015|legacy" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` returns explicit legacy classification guidance.
3. Manual review confirms health audit remains read-only against `STORY_KERNEL.md` and only reports/flags missing or malformed Phase 9.5 trace data.
4. Manual review confirms no page-cycle, storylet-pool-authoring, or story-fact-promotion source edits are needed for this bootstrap acceptance-trace consumer gap.

### Invariants

1. Bootstrap remains the only producer of `discipline_validation_trace`.
2. Health audit is the only downstream consumer changed by this ticket.
3. Missing Phase 9.5 trace on explicit legacy bundles is not treated as migration-required corruption.
4. Bare PASS without a rationale is not accepted as a valid Phase 9.5 audit trail.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual-review based.

### Commands

1. `rg -n "discipline_validation_trace|Phase 9\\.5|bootstrap_discipline" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md`
2. `rg -n "pre-BSBOOT-015|BSBOOT-015|legacy" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md`
3. `rg -n "discipline_validation_trace|Phase 9\\.5" .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon` — expected no required source edits for this ticket; any hits should be manually classified as unrelated or already-owned runtime/page/storylet/promotion validation prose.
