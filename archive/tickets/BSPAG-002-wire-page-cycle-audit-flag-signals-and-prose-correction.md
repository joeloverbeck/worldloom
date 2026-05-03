# BSPAG-002: Wire branching-story-page-cycle's narrative_health.flagged_for_audit + high-JIT-rate signals into branching-story-health-audit prioritization

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` (extends Pre-flight to inventory `narrative_health.flagged_for_audit` and runtime-JIT pages; adds `audit_focus=flagged_pages_priority`; extends Phase 9/report template summary surfaces for flagged pages and high-JIT-rate branches); `.claude/skills/branching-story-page-cycle/SKILL.md` (final prose truthing for the now-wired consumer); `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` and `examples/sau-mixed-severity.md` (mirror the new report sections)
**Deps**: `archive/tickets/BSPAG-001-extend-storylet-pool-authoring-with-jit-mode-and-delegate-page-cycle-jit.md` (completed; supplies page-cycle runtime-JIT provenance and existing `narrative_health.flagged_for_audit` signal)

## Problem

`branching-story-page-cycle` writes `narrative_health.flagged_for_audit: true` on pages whose Phase 3 consequence-capacity guarantees were waived (e.g., user picked "Accept anyway" past the soft-warning threshold). Reassessment found the oldest "deferred sibling" page-cycle prose had already been partly corrected, but the audit skill still did not branch-prioritize flagged pages, surface flagged-page counts, or surface high-JIT-rate branches. This ticket closes the remaining consumer side and removes the final page-cycle "BSPAG-002 will wire this" wording.

This ticket closes both halves of the seam:

1. **Audit-side consumption**: extend `branching-story-health-audit` to (a) read `narrative_health.flagged_for_audit` per page during Pre-flight scan, (b) surface the count of flagged pages in the Phase 9 deliverable summary, (c) accept a new `audit_focus=flagged_pages_priority` value that scopes the audit to those pages first.
2. **Page-cycle prose correction**: remove the remaining forward-looking BSPAG-002 wording now that the audit skill consumes the signals.

The factual prose correction is half-1 (cited-site repair); the consumption wiring is half-2 (the actual integration).

## Assumption Reassessment (2026-05-03)

1. `archive/tickets/BSPAG-001-extend-storylet-pool-authoring-with-jit-mode-and-delegate-page-cycle-jit.md` is the resolved dependency path. It completed page-cycle JIT delegation and requires `runtime_jit` provenance on returned SLT records; this ticket consumes that existing signal rather than changing JIT emission.
2. `.claude/skills/branching-story-page-cycle/SKILL.md` already had the old deferred-sibling audit prose partly corrected at lines 518, 565, and 1227-1230. The remaining drift was forward-looking BSPAG-002 wording saying the audit signal consumption was still in this ticket's future.
3. `.claude/skills/branching-story-health-audit/SKILL.md` Pre-flight already reads every `worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-*.yaml` for branch-tree assembly. Each page's `narrative_health` block is in the same scan, so adding `flagged_pages[]` and `jit_pages[]` inventory does not widen story-state read scope.
4. The audit's `audit_focus` enum did not include `flagged_pages_priority`. The landed value is a branch-scope focus, not a diagnostic category: it filters Phase 1 to branches whose `branch_path` contains a flagged page, then runs the normal diagnostic set on those branches.
5. High-JIT-rate signal: page-cycle writes JIT storylets via `storylet-pool-authoring` with `provenance.origin: runtime_jit`; the audit now computes a recent-20-page branch summary and marks branches high-JIT-rate when >30% of the window used runtime JIT.
6. Cross-skill / cross-artifact boundary: this ticket lands cross-cutting changes to two SKILL.md files and the audit report template/example. The audit-side change is additive; the page-cycle-side change is purely factual prose correction.

## Architecture Check

1. The audit skill's Pre-flight already loads every page; extending to inventory `flagged_for_audit` is mechanically trivial and avoids any new disk I/O. The `audit_focus=flagged_pages_priority` value adds one branch in Phase 1 Branch Scope Resolution; clean.
2. No new abstractions required: the deliverable summary's existing structure already accommodates additional signal lines (the proposal's §Phase 9 mock shows a flexible report shape). Adding a "FLAGGED PAGES" / "HIGH JIT-RATE BRANCHES" section is additive.
3. The page-cycle prose correction is bounded to existing audit-signal references; no behavior change to page-cycle itself.

## Verification Layers

1. **Audit Pre-flight inventories flagged pages** → manual contract review of `.claude/skills/branching-story-health-audit/SKILL.md` confirms Pre-flight builds `flagged_pages[]` during the existing page scan.
2. **`audit_focus=flagged_pages_priority` scopes correctly** → skill prose in Inputs and Phase 1 documents that the focus scopes to branches whose `branch_path` contains a flagged page and records non-matching branches as out of scope due to focus.
3. **High-JIT-rate signal surfaces** → skill prose and report template document recent-20-page runtime-JIT counting with a >30% high-JIT-rate threshold and a dedicated Phase 9/report section.
4. **Page-cycle prose corrections land** → stale-anchor grep over `branching-story-page-cycle/SKILL.md` confirms no audit-skill-related `deferred sibling`, `still deferred`, or `BSPAG-002 lands` wording remains.
5. **Audit known-debt is truthful** → `branching-story-health-audit` no longer lists BSPAG-002 or completed STPOOL-001 as active deferred integration debt.

## What to Change

### 1. Extend `branching-story-health-audit` Pre-flight

Add a per-page inventory step:

```
- During the existing per-page read loop, accumulate two signals:
  - `flagged_pages: [PG-NNNN, ...]` — pages whose `narrative_health.flagged_for_audit == true`.
  - `jit_pages_per_branch: { branch_leaf_id: [PG-NNNN, ...] }` — pages whose realized SLT record carries `provenance.origin == runtime_jit`, or whose page/SE metadata explicitly records a runtime-JIT expansion.
```

### 2. Extend `branching-story-health-audit` Inputs

Extend the `audit_focus` enum to include `flagged_pages_priority`. Document semantics: "Audits only branches whose `branch_path` contains a page with `narrative_health.flagged_for_audit == true`. Non-flagged-bearing branches are listed in the report as 'out of scope due to focus'."

### 3. Extend Phase 1 Branch Scope Resolution

Add a branch:

```
- Start from the Pre-flight-validated `branch_path_filter` leaf set when provided; otherwise start from every distinct leaf-bearing branch.
- If `audit_focus=flagged_pages_priority`: filter that starting set to only branches whose `branch_path` includes at least one page id in `flagged_pages`.
```

### 4. Extend Phase 9 Deliverable Summary

Add two sections after `FINDINGS BY SEVERITY`:

```
FLAGGED PAGES (from page-cycle narrative_health.flagged_for_audit):
- PG-NNNN (branch <leaf>) — flagged at <YYYY-MM-DD>
- ...
(empty section is recorded as "No flagged pages this bundle.")

HIGH JIT-RATE BRANCHES:
- Branch leaf PG-NNNN: <count> of last 20 pages used JIT expansion (<rate>%)
- ...
(empty section is recorded as "No high-JIT-rate branches this bundle.")
```

### 5. Correct `branching-story-page-cycle` prose at four sites

- **Line 518**: keep the audit reference factual and remove the forward-looking "BSPAG-002 wires" wording now that `audit_focus=flagged_pages_priority` exists.
- **Line 565**: keep the high-JIT-rate consumer reference factual and remove the ticket-local "consumption wiring per BSPAG-002" qualifier.
- **Line 1227-1230** (Sibling Interop): keep `story-fact-promotion-to-canon` under future siblings, and keep `branching-story-health-audit` under existing audit-feedback consumers with wording that says the audit value and deliverable summary are already wired.

If `story-fact-promotion-to-canon` or other genuinely-not-yet-shipping siblings remain in the "Future siblings" paragraph, keep them; only move the entries that no longer match the "not yet shipping" framing.

### 6. Cross-link to completed MCPENH-015 / MCPENH-016 / MCPENH-017 and archived STPOOL-001 in the audit skill

The audit skill's Guardrails §Known integration debt section named BSPAG-002 and still carried a completed STPOOL-001 cross-link. The landed edit removes both from active deferred-debt wording; STPOOL-001 remains cited only as an archived dependency/out-of-scope record in this ticket.

### 7. Keep audit report contract aligned

Update the audit report template and worked example so the Phase 9 flagged-page and high-JIT-rate sections also exist in generated SAU reports, not only in the prose skill instructions.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — extend Inputs/audit_focus enum; extend §World-State Prerequisites Pre-flight inventory; extend Phase 1 + Phase 9 deliverable summary)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — correct prose at lines 518, 565, 1227-1229)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify — add `flagged_pages`, `high_jit_rate_branches`, and matching report body sections)
- `.claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md` (modify — keep example report aligned with the template)

## Out of Scope

- Wiring the audit's RSP cards into `storylet-pool-authoring` mode=audit — completed in `archive/tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md`.
- New page-cycle behavior for emitting `flagged_for_audit` — the field is already written by page-cycle's existing Phase 3 infeasibility branch and persisted in the page record; this ticket only consumes it.
- Tuning the JIT-rate threshold (currently illustrative as "30% of last 20 pages") — defer to real-world calibration after a few audits run.

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review: `.claude/skills/branching-story-health-audit/SKILL.md` Pre-flight, Inputs, Phase 1, Phase 2, and Phase 9 document the flagged-page inventory, `audit_focus=flagged_pages_priority`, out-of-scope branch reporting, and high-JIT-rate summary.
2. Manual contract review: `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` and `examples/sau-mixed-severity.md` include the flagged-page and high-JIT-rate frontmatter/body surfaces.
3. `rg -n 'flagged_pages_priority|FLAGGED PAGES|HIGH JIT-RATE BRANCHES|high_jit_rate_branches|flagged_pages' .claude/skills/branching-story-health-audit` returns the expected skill/template/example anchors.
4. `rg -n 'deferred sibling|still deferred|BSPAG-002 lands|Until BSPAG-002|not yet branch-prioritized' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns no stale audit-wiring hits.

### Invariants

1. The audit skill's deliverable summary always includes the FLAGGED PAGES section (empty-state-aware: "No flagged pages this bundle." when none).
2. `audit_focus=flagged_pages_priority` is purely scope-narrowing — it does NOT change the severity rubric or self-check rules; flagged-page findings carry the same severity floors as non-flagged-page findings.
3. The page-cycle prose corrections do not change page-cycle behavior — only documentation.

## Test Plan

### New/Modified Tests

1. None — prose-skill contract and report-template changes; this repo has no executable branching-story audit runner or fixture harness.

### Commands

1. `rg -n 'flagged_pages_priority|FLAGGED PAGES|HIGH JIT-RATE BRANCHES|high_jit_rate_branches|flagged_pages' .claude/skills/branching-story-health-audit`
2. `rg -n 'deferred sibling|still deferred|BSPAG-002 lands|Until BSPAG-002|not yet branch-prioritized' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
3. Manual contract review of `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/branching-story-health-audit/templates/story-audit-report.md`, and `.claude/skills/branching-story-page-cycle/SKILL.md`.

## Outcome

Completed: 2026-05-03.

`branching-story-health-audit` now inventories `narrative_health.flagged_for_audit` and runtime-JIT pages during the existing page scan, exposes `audit_focus=flagged_pages_priority`, scopes Phase 1 to branches whose path contains flagged pages when that focus is selected, records non-matching branches as out of scope, and surfaces both flagged-page and high-JIT-rate branch summaries in Phase 9 and the report template.

`branching-story-page-cycle` now describes the audit consumer as already wired rather than as future BSPAG-002 work. The completed STPOOL-001 wording was removed from active known-debt prose in the audit skill.

## Verification Result

1. `rg -n 'flagged_pages_priority|FLAGGED PAGES|HIGH JIT-RATE BRANCHES|high_jit_rate_branches|flagged_pages' .claude/skills/branching-story-health-audit` — passed; anchors are present in the audit skill, report template, and example.
2. `rg -n 'deferred sibling|still deferred|BSPAG-002 lands|Until BSPAG-002|not yet branch-prioritized' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — passed; no matches.
3. Manual contract review confirmed `flagged_pages_priority` is a branch-scope focus rather than a finding category, and that high-JIT-rate detection uses runtime-JIT SLT provenance rather than changing page-cycle emission.
4. `git diff --check` — passed.

## Deviations

1. The drafted manual integration run was not executed because this repo has prose workflow definitions and no executable `branching-story-health-audit` runner or fixture harness. The truthful proof is grep/manual contract review over the changed skill, template, example, and producer prose.
2. The ticket widened slightly from SKILL.md-only prose to include the audit report template and worked example, because the new Phase 9/report sections would otherwise be documented in the skill but absent from the generated report contract.
