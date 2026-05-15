# SPEC32STOCONHAR-001: Sharpen eight-gates scope wording

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None (docs-only; sharpens shared story-state contract §7 opening + FOUNDATIONS Rule 7 firewall paragraph)
**Deps**: None

## Problem

`.claude/skills/_shared-templates/story-state-contract.md:766` opens §7 ("Eight Shared Hard Gates") with: *"Every state-changing skill validates against these eight gates at page-plan commit."* The leading clause "every state-changing skill" is operationally over-broad: the eight gates are page-plan-commit gates and apply only to the two PG-authoring skills (`branching-story-bootstrap` and `branching-story-turn-cycle`). The five non-PG state-changing story skills (`branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) preserve the same invariants — branch isolation, Mystery Reserve firewall, observer firewall, schema compliance, replay consistency, choice-set non-collapse, motivation grounding, terminal proof — through skill-local validation phases plus HARD-GATE discipline, not by emitting `PG.validation_trace`.

`docs/FOUNDATIONS.md:462` Rule 7's firewall paragraph parallel-mirrors the same broad framing: *"The firewall is a single plan-time gate — gate 3 (mystery / invariant firewall) of the shared eight hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 — in every state-changing story-pipeline skill."* This wording risks misleading non-PG implementers into faking PG-style validation traces for non-PG artifacts. Sharpening both passages aligns the contract with operational behavior without changing behavior anywhere.

## Assumption Reassessment (2026-05-16)

1. Contract §7 opening verified at `.claude/skills/_shared-templates/story-state-contract.md:766` — the literal sentence is *"Every state-changing skill validates against these eight gates at page-plan commit. Each gate's pass entry on `PG.validation_trace` requires a one-line rationale (per CLAUDE.md 'PASS entries require a one-line rationale')."* The second sentence (CLAUDE.md PASS-rationale cross-reference) is preserved structurally by the new wording's `PG.validation_trace.gates[]` mention.
2. FOUNDATIONS Rule 7 firewall paragraph verified at `docs/FOUNDATIONS.md:462`. Rule 7's heading at line 458 + Mystery firewall enforcement paragraph at line 462 are the two surfaces; only line 462 is touched by this ticket.
3. Cross-skill / cross-artifact boundary: contract §7 is the canonical home of the eight-gate definition; FOUNDATIONS Rule 7 cross-references it. Both surfaces co-evolve; sharpening one without the other would reopen the same ambiguity from the other side. Both surfaces are touched in this ticket.
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately) governs Mystery Reserve preservation; the firewall paragraph identifies gate 3 as the authoritative plan-time gate. The proposed sharpening preserves gate 3 as authoritative for PG-authoring and explicitly classifies the prose-attach `forbidden_mystery_resolution` deterministic check as a redundant downstream guard rather than a second authoritative gate.
5. The eight-gates contract (`.claude/skills/_shared-templates/story-state-contract.md` §7) IS the canonical HARD-GATE-semantics surface for PG-authoring story skills. The proposed sharpening narrows the textual scope of the §7 opening from "every state-changing skill" to "every PG-authoring story skill" without changing the eight-gate definitions, gate ordering, or rationale-recording discipline; gate 3 (Mystery Reserve / invariant firewall) remains authoritative for PG-authoring and is unchanged. The change does not weaken the Mystery Reserve firewall.

## Architecture Check

1. The proposed wording matches operational behavior in the existing codebase: only `branching-story-bootstrap` Phase 7 and `branching-story-turn-cycle` Phase 9 emit `PG.validation_trace.gates[]`; the five non-PG skills already enforce equivalent invariants through skill-local phases. The new wording documents what already happens.
2. No backwards-compatibility aliasing or shims. The change is purely a sentence rewrite at two surfaces.

## Verification Layers

1. Contract §7 opening enumerates PG-authoring vs non-PG explicitly → codebase grep-proof (`grep -n "PG-authoring story skill" .claude/skills/_shared-templates/story-state-contract.md` returns match).
2. FOUNDATIONS Rule 7 firewall paragraph references gate 3 for PG-authoring and skill-local phases for non-PG → codebase grep-proof (`grep -n "gate 3 of the shared eight hard gates" docs/FOUNDATIONS.md` returns match in the rewritten paragraph).
3. The five non-PG skills are correctly enumerated → manual review against `docs/FOUNDATIONS.md` §Story Bundles §7 (which already lists the seven-skill set) confirms enumeration matches.
4. Single-layer ticket otherwise — verification is documentation grep-proofs and manual review of the sharpened prose; no test runs.

## What to Change

### 1. Contract §7 opening rewrite

Replace the opening paragraph of `.claude/skills/_shared-templates/story-state-contract.md` §7 (line 766) — currently *"Every state-changing skill validates against these eight gates at page-plan commit. Each gate's pass entry on `PG.validation_trace` requires a one-line rationale (per CLAUDE.md 'PASS entries require a one-line rationale')."* — with:

```
Every PG-authoring story skill (`branching-story-bootstrap` and `branching-story-turn-cycle`) validates these eight hard gates at page-plan commit; gate results are recorded in `PG.validation_trace.gates[]`, and each gate's pass entry requires a one-line rationale (per CLAUDE.md "PASS entries require a one-line rationale"). Gate FAIL produces a direct-artifact partial failure under HARD-GATE discipline (see `docs/HARD-GATE-DISCIPLINE.md`). Non-PG story skills (`branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) preserve the same invariants — branch isolation, Mystery Reserve firewall, observer firewall, schema compliance, replay consistency, choice-set non-collapse, motivation grounding, terminal proof — through their own skill-local validation phases and HARD-GATE discipline. When non-PG skills emit audit-only SE records, §4.3a applies.
```

### 2. FOUNDATIONS Rule 7 firewall paragraph rewrite

Replace the existing firewall paragraph at `docs/FOUNDATIONS.md:462` — currently *"**Mystery firewall enforcement.** The firewall is a single plan-time gate — gate 3 (mystery / invariant firewall) of the shared eight hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 — in every state-changing story-pipeline skill. The deterministic forbidden-mystery-resolution check inside `branching-story-prose-attach` is a redundant downstream guard on rendered prose, not a second authoritative gate. Forbidden-status `M` is NEVER resolved at either site."* — with:

```
**Mystery firewall enforcement.** For PG-authoring state changes (`branching-story-bootstrap`, `branching-story-turn-cycle`), the authoritative plan-time firewall is gate 3 (mystery / invariant firewall) of the shared eight hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7. Non-PG story skills enforce the same firewall through their own named validation phases; the deterministic `forbidden_mystery_resolution` check inside `branching-story-prose-attach` is a redundant downstream guard on rendered prose, not a second authoritative state-transition gate. Forbidden-status `M` is NEVER resolved at either site.
```

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §7 opening at line 766)
- `docs/FOUNDATIONS.md` (modify — Rule 7 firewall paragraph at line 462)

## Out of Scope

- Validator changes — no validator currently consumes the eight-gates wording at the structural level; the gates are skill-internal.
- Fixture changes — no test fixture asserts the literal contract §7 opening sentence; sharpening it is invisible to the test suite.
- Renaming any of the eight gates — gate numbering and labels are preserved.
- Adding new gates or removing existing gates — purely a scope-wording clarification.
- Editing the eight-gate table at lines 768–777 — only the opening paragraph is rewritten.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Every PG-authoring story skill" .claude/skills/_shared-templates/story-state-contract.md` returns a match at the rewritten §7 opening.
2. `grep -n "Non-PG story skills" .claude/skills/_shared-templates/story-state-contract.md` returns a match enumerating the five non-PG skills.
3. `grep -n "For PG-authoring state changes" docs/FOUNDATIONS.md` returns a match in the rewritten Rule 7 firewall paragraph.
4. `grep -nE "every state-changing skill validates against these eight gates" .claude/skills/_shared-templates/story-state-contract.md` returns no matches (the old over-broad wording is gone).
5. The existing tools/validators test suite still passes from the package cwd (`cd tools/validators && npm test`) — no test currently asserts the literal contract §7 opening, so this is a regression check rather than a pass-on-rewrite proof.

### Invariants

1. Eight-gate definition (`PG.validation_trace.gates[]`) remains unchanged; only the opening prose scope is sharpened.
2. FOUNDATIONS Rule 7 firewall enforcement contract continues to designate gate 3 as authoritative for PG-authoring skills.
3. The prose-attach `forbidden_mystery_resolution` check remains classified as a redundant downstream guard, consistent with §SPEC32STOCONHAR-005 (D1) which sharpens the check's implementation but does not re-elevate it to a primary gate.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "Every PG-authoring story skill" .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -n "For PG-authoring state changes" docs/FOUNDATIONS.md`
3. `grep -nE "every state-changing skill validates against these eight gates" .claude/skills/_shared-templates/story-state-contract.md` (must return no matches)
4. `cd tools/validators && npm test` (regression check; no behavior change expected)

## Outcome

Completed: 2026-05-16.

The shared story-state contract §7 opening now scopes the eight shared hard gates to PG-authoring story skills (`branching-story-bootstrap` and `branching-story-turn-cycle`) and explicitly says non-PG story skills preserve the same invariants through skill-local validation phases and HARD-GATE discipline. `docs/FOUNDATIONS.md` Rule 7 now mirrors that boundary by naming gate 3 as the authoritative plan-time firewall for PG-authoring state changes and classifying non-PG enforcement as skill-local.

No gate labels, gate ordering, `PG.validation_trace.gates[]` structure, approval behavior, or validator behavior changed.

## Verification Result

1. `grep -n "Every PG-authoring story skill" .claude/skills/_shared-templates/story-state-contract.md` — passed at line 766.
2. `grep -n "Non-PG story skills" .claude/skills/_shared-templates/story-state-contract.md` — passed at line 766.
3. `grep -n "For PG-authoring state changes" docs/FOUNDATIONS.md` — passed at line 462.
4. `grep -nE "every state-changing skill validates against these eight gates" .claude/skills/_shared-templates/story-state-contract.md` — returned no matches, which is the expected proof that the old over-broad wording is gone.
5. `cd tools/validators && npm test` — passed, 269/269 tests.

## Deviations

- Replaced the drafted root-cwd regression command `npm --prefix tools/validators test` with `cd tools/validators && npm test`. The drafted command built successfully but ran the compiled CLI tests with `process.cwd()` at the repo root, causing the tests to look for `dist/src/cli/world-validate.js` at the repo root. Running from the package cwd matches the CLI tests' current path assumptions and passed.
