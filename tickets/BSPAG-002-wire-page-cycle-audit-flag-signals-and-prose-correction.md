# BSPAG-002: Wire branching-story-page-cycle's narrative_health.flagged_for_audit + high-JIT-rate signals into branching-story-health-audit prioritization

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` (extend Pre-flight to read `narrative_health.flagged_for_audit` per page in scope and surface flagged-page count in deliverable summary; add a new `audit_focus` value `flagged_pages_priority` that scopes the audit to flagged pages first; extend Phase 9 deliverable summary to surface high-JIT-rate branches as a separate signal); update test-time fixtures if any
**Deps**: BSPAG-001 (BSPAG-001 already shipped — page-cycle's `narrative_health.flagged_for_audit` field exists per the page-cycle skill's lines 518/565/1227–1229 references; this ticket consumes that signal)

## Problem

`branching-story-page-cycle` writes `narrative_health.flagged_for_audit: true` on pages whose Phase 5/6 consequence-capacity guarantees were waived (e.g., user picked "Accept anyway" past the soft-warning threshold). The page-cycle's own §1227 currently states: "`branching-story-health-audit` — consumes `narrative_health.flagged_for_audit` and high-JIT-rate signals to surface branches needing curation. Until shipping, the flag is persisted but not consumed." The audit skill is now shipping (May 2026 batch), but the audit-side consumption is not yet wired. The prose in page-cycle still reads "Until shipping..." despite the audit skill landing this batch — that wording is the precise signature of the reverse-seam-scan hit per skill-creator's discipline.

This ticket closes both halves of the seam:

1. **Audit-side consumption**: extend `branching-story-health-audit` to (a) read `narrative_health.flagged_for_audit` per page during Pre-flight scan, (b) surface the count of flagged pages in the Phase 9 deliverable summary, (c) accept a new `audit_focus=flagged_pages_priority` value that scopes the audit to those pages first.
2. **Page-cycle prose correction**: replace page-cycle's "Until shipping..." / "deferred sibling" / "Future siblings (named in proposal; not yet shipping)" wording at lines 518, 565, 1227, 1229 with factual references to the now-shipping audit skill plus a forward pointer to this ticket for the consumption-wiring refactor (which is the work this ticket lands).

The factual prose correction is half-1 (cited-site repair); the consumption wiring is half-2 (the actual integration).

## Assumption Reassessment (2026-05-03)

1. `.claude/skills/branching-story-page-cycle/SKILL.md` lines 518, 565, 1227, 1229 (the four reverse-seam-scan hits per skill-creator §Reverse-seam scan) currently name `branching-story-health-audit` as not-yet-shipping. The audit skill is shipping in this batch (per `.claude/skills/branching-story-health-audit/SKILL.md` existence). The prose at those four sites is now factually incorrect.
2. `branching-story-health-audit` Pre-flight currently reads every `_source/pages/PG-*.yaml` for branch-tree assembly (per the skill's Pre-flight Check section). Each page record's `narrative_health` block is already in memory after this Pre-flight scan; extending Pre-flight to ALSO inventory `narrative_health.flagged_for_audit: true` pages is essentially free (no extra disk reads) and a one-line addition to the existing per-page loop.
3. The audit's `audit_focus` enum (per the skill's Inputs section) currently has 14 values plus `all`. Adding `flagged_pages_priority` is one more enum value. When set, Phase 1 Branch Scope Resolution prioritizes branches whose leaf pages OR ancestors include any flagged page; non-flagged-page-bearing branches are deprioritized (or skipped, per the user's choice).
4. High-JIT-rate signal: page-cycle's Phase 5 records JIT-expansion events per page (the page-cycle skill writes them as part of the page tick); a high JIT-rate branch is one whose recent N pages had JIT expansion firing on M of them (configurable threshold). The audit's Phase 5 repetition + thinness analysis ALREADY computes pool-utilization per branch; extending to compute JIT-rate per branch is a small addition feeding into the deliverable summary as a separate signal alongside flagged_for_audit count.
5. Cross-skill / cross-artifact boundary: this ticket lands cross-cutting changes to TWO skills' SKILL.md files. The audit-side change adds new functionality (one new `audit_focus` value, two new deliverable-summary lines). The page-cycle-side change is purely a factual prose correction (no behavior change).

## Architecture Check

1. The audit skill's Pre-flight already loads every page; extending to inventory `flagged_for_audit` is mechanically trivial and avoids any new disk I/O. The `audit_focus=flagged_pages_priority` value adds one branch in Phase 1 Branch Scope Resolution; clean.
2. No new abstractions required: the deliverable summary's existing structure already accommodates additional signal lines (the proposal's §Phase 9 mock shows a flexible report shape). Adding a "FLAGGED PAGES" / "HIGH JIT-RATE BRANCHES" section is additive.
3. The page-cycle prose correction is bounded by the four cited sites; no behavior change to page-cycle itself.

## Verification Layers

1. **Audit Pre-flight inventories flagged pages** → after running on a bundle whose page-cycle history wrote `flagged_for_audit: true` on PG-0017 and PG-0023, the audit's deliverable summary surfaces "FLAGGED PAGES: 2 (PG-0017, PG-0023)".
2. **`audit_focus=flagged_pages_priority` scopes correctly** → invoking the audit with this focus produces a report that audits ONLY branches whose `branch_path` contains a flagged page; non-flagged-bearing branches appear in the report as "out of scope due to focus".
3. **High-JIT-rate signal surfaces** → on a bundle whose page-cycle Phase 5 wrote JIT-expansion events on > 30% of recent pages, the deliverable summary surfaces "HIGH JIT-RATE BRANCH: PG-NNNN leaf — 7 of last 20 pages used JIT expansion (35%)".
4. **Page-cycle prose corrections land** → grep `branching-story-page-cycle/SKILL.md` for "deferred sibling", "Until shipping", "not yet shipping" and confirm those phrases are gone OR clarified to refer to the wiring-refactor ticket (this one) rather than the audit skill's existence.
5. **Page-cycle-side §Sibling Interop** updated to "Consumes (existing): branching-story-health-audit's RSP cards (post-STPOOL-001 wiring); produces inputs for branching-story-health-audit's flagged_for_audit + JIT-rate prioritization (BSPAG-002 wiring)" — replacing the current "Future siblings (named in proposal; not yet shipping)" framing.

## What to Change

### 1. Extend `branching-story-health-audit` Pre-flight

Add a per-page inventory step:

```
- During the existing per-page read loop, accumulate two signals:
  - `flagged_pages: [PG-NNNN, ...]` — pages whose `narrative_health.flagged_for_audit == true`.
  - `jit_pages_per_branch: { branch_leaf_id: [PG-NNNN, ...] }` — pages whose `applied_event_ops` include a JIT-generated SLT-NNNN write (the page-cycle SE record's `source.storylet_realized` cites a SLT whose `provenance.origin == runtime_jit`).
```

### 2. Extend `branching-story-health-audit` Inputs

Extend the `audit_focus` enum to include `flagged_pages_priority`. Document semantics: "Audits only branches whose `branch_path` contains a page with `narrative_health.flagged_for_audit == true`. Non-flagged-bearing branches are listed in the report as 'out of scope due to focus'."

### 3. Extend Phase 1 Branch Scope Resolution

Add a branch:

```
- If `audit_focus=flagged_pages_priority`: filter the leaf-bearing branches enumerated above to only those branches whose `branch_path` includes at least one page id in `flagged_pages`.
- Other audit_focus values: leaf-bearing branches enumerated normally.
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

- **Line 518**: "...flags the resulting page via `narrative_health.flagged_for_audit: true` for later review by `branching-story-health-audit` (deferred sibling)." → replace `(deferred sibling)` with `(see audit skill's audit_focus=flagged_pages_priority value, wired by BSPAG-002)`.
- **Line 565**: "JIT generation is not free — it expands the engine prompt budget and may produce lower-quality storylets than the author pool. `branching-story-health-audit` (still deferred) consumes the `flagged_for_audit` and high-JIT-rate signals." → replace `(still deferred)` with `(consumes flagged_for_audit and high-JIT-rate signals per BSPAG-002)`.
- **Line 1227-1229** (Sibling Interop §Future siblings paragraph): currently "**Future siblings (named in proposal; not yet shipping)**: ... `branching-story-health-audit` — consumes `narrative_health.flagged_for_audit` and high-JIT-rate signals to surface branches needing curation. Until shipping, the flag is persisted but not consumed." → restructure: move the entry out of "Future siblings" into "Existing siblings" with the wording: "`branching-story-health-audit` — consumes `narrative_health.flagged_for_audit` and high-JIT-rate signals to surface branches needing curation (BSPAG-002 wires the consumption)."

If `story-fact-promotion-to-canon` or other genuinely-not-yet-shipping siblings remain in the "Future siblings" paragraph, keep them; only move the entries that no longer match the "not yet shipping" framing.

### 6. Cross-link to completed MCPENH-015 / MCPENH-016 / MCPENH-017 and STPOOL-001 in the audit skill

The audit skill's Guardrails §Known integration debt section already names BSPAG-002. Verify the ticket-numbering reference is correct after this ticket lands, and treat the completed audit task-type registration as archived in `archive/tickets/MCPENH-017-register-branching-story-health-audit-task-type.md`.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — extend Inputs/audit_focus enum; extend §World-State Prerequisites Pre-flight inventory; extend Phase 1 + Phase 9 deliverable summary)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — correct prose at lines 518, 565, 1227-1229)

## Out of Scope

- Wiring the audit's RSP cards into `storylet-pool-authoring` mode=audit — separate ticket STPOOL-001.
- New page-cycle behavior for emitting `flagged_for_audit` — the field is already written by page-cycle's existing Phase 5/6; this ticket only consumes it.
- Tuning the JIT-rate threshold (currently illustrative as "30% of last 20 pages") — defer to real-world calibration after a few audits run.

## Acceptance Criteria

### Tests That Must Pass

1. Manual integration: invoke `branching-story-health-audit` on a bundle with two flagged pages → deliverable summary shows "FLAGGED PAGES: 2 (PG-NNNN, PG-NNNN)".
2. Manual integration: invoke with `audit_focus=flagged_pages_priority` → only flagged-bearing branches appear in scope; non-flagged-bearing branches recorded as "out of scope due to focus".
3. Manual integration: invoke on a bundle with > 30% JIT pages on a branch → deliverable summary shows "HIGH JIT-RATE BRANCHES: ...".
4. `grep -n "deferred sibling\|Until shipping\|still deferred" .claude/skills/branching-story-page-cycle/SKILL.md` returns no audit-skill-related matches.

### Invariants

1. The audit skill's deliverable summary always includes the FLAGGED PAGES section (empty-state-aware: "No flagged pages this bundle." when none).
2. `audit_focus=flagged_pages_priority` is purely scope-narrowing — it does NOT change the severity rubric or self-check rules; flagged-page findings carry the same severity floors as non-flagged-page findings.
3. The page-cycle prose corrections do not change page-cycle behavior — only documentation.

## Test Plan

### New/Modified Tests

1. None — documentation-and-prose-only changes plus integration verification via real audit invocations on a bundle constructed for the test (cast plus page-cycle invocations producing flagged pages).

### Commands

1. Manual: invoke `branching-story-health-audit` on a test bundle; inspect deliverable summary.
2. `grep -rn "branching-story-health-audit" .claude/skills/branching-story-page-cycle/` — verify no "deferred" / "not yet shipping" framing remains.
3. `grep -rn "deferred sibling\|Until shipping\|still deferred" .claude/skills/branching-story-page-cycle/SKILL.md` — should return no matches related to the audit skill.
