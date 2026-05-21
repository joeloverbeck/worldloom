# SPEC64WORSYSCOM-004: continuity-audit compatibility reporting phase

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `continuity-audit` skill gains an optional, read-only compatibility-reporting phase plus a supporting reference file. No canon mutation; the skill remains audit-only.
**Deps**: SPEC64WORSYSCOM-003

## Problem

`continuity-audit` has no first-class compatibility reporting for maturity / index / approval defect classes (report Fault 11's "optional continuity-audit reporting"). SPEC-64 D4 adds an optional, read-only phase that runs the world-compatibility CLI mode (SPEC64WORSYSCOM-003) in `full-world` warn mode and surfaces its findings as a compatibility appendix in the `AU-<integer>` report — without letting `continuity-audit` mutate any non-`audits/` surface.

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/continuity-audit/SKILL.md` carries a `<HARD-GATE>` (writes only to `audits/`), a `## Process Flow` with Phases 0–13, and a `references/` directory (`audit-categories.md`, `repair-and-retcon.md`, `retrieval-tool-tree.md`). The new phase invokes the `--compatibility` CLI mode delivered by SPEC64WORSYSCOM-003.
2. SPEC-64 §D4 specifies an optional, read-only compatibility-reporting phase appended as an appendix to the `AU-<integer>` report; report Fault 11 names "optional continuity-audit reporting"; enforcement (blocking) stays in the pre-apply gate, not in the audit.
3. Cross-skill boundary under audit: `continuity-audit` is the consumer; the world-compatibility CLI mode (SPEC64WORSYSCOM-003) is the produced surface. The phase MUST preserve continuity-audit's audit-only write discipline — it writes only to `worlds/<slug>/audits/` and never mutates any surface the compatibility check inspects (proposals, audits, pressure-events, `_source/`). The existing HARD-GATE already scopes writes to `audits/`; the new phase must not widen it.

## Architecture Check

1. A read-only reporting phase that folds the compatibility CLI's findings into an `AU-<integer>` appendix keeps *enforcement* (blocking) in the pre-apply gate (SPEC64WORSYSCOM-003) and *reporting* in the audit — no duplication of the check, and the audit gains visibility without gaining mutation authority.
2. No backwards-compatibility shim; the phase is optional and additive to the existing Phase flow, and does not alter the existing HARD-GATE or any canon-write ordering.

## Verification Layers

1. A compatibility appendix is emitted in the `AU-<integer>` report without mutating any non-`audits/` surface → skill dry-run + manual review.
2. The phase runs the compatibility CLI in `full-world` (warn) mode and surfaces maturity/index/approval findings → manual review of the phase prose referencing SPEC64WORSYSCOM-003's `--compatibility`.
3. continuity-audit remains audit-only → grep-proof that the new phase and its reference file prescribe writes only to `worlds/<slug>/audits/`.

## What to Change

### 1. Add the optional compatibility-reporting phase (`SKILL.md`)

Add an optional, read-only compatibility-reporting phase to the existing Phase flow (numbered into the sequence, before the HARD-GATE → commit phase) and reference it from `## Process Flow` and `## Procedure`. Emphasize: read-only; runs the `--compatibility` CLI mode in `full-world`; folds findings into the `AU-<integer>` report as a compatibility appendix; mutates nothing outside `audits/`.

### 2. Add the supporting reference file

Create `.claude/skills/continuity-audit/references/compatibility-reporting.md` describing how to invoke the world-compatibility CLI mode in `full-world` warn mode and fold its maturity / index / approval findings into the report appendix.

## Files to Touch

- `.claude/skills/continuity-audit/SKILL.md` (modify)
- `.claude/skills/continuity-audit/references/compatibility-reporting.md` (new)

## Out of Scope

- Compatibility *enforcement* / blocking — stays in the pre-apply gate (SPEC64WORSYSCOM-003).
- Any continuity-audit canon mutation or write outside `worlds/<slug>/audits/`.
- The validator and CLI-mode implementations (SPEC64WORSYSCOM-001 / -002 / -003).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "compatibility" .claude/skills/continuity-audit/SKILL.md` confirms the optional read-only compatibility-reporting phase is present and references the `--compatibility` CLI mode.
2. The new phase and `references/compatibility-reporting.md` prescribe writes only to `worlds/<slug>/audits/` (no mutation of inspected surfaces).
3. A continuity-audit dry-run emits a compatibility appendix in the `AU-<integer>` report without touching any non-`audits/` surface.

### Invariants

1. `continuity-audit` remains audit-only — the new phase writes only to `audits/`.
2. Compatibility enforcement (blocking) stays in the pre-apply gate; the audit phase only reports (warn mode).

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is grep-proof against SKILL.md + the new reference file plus a continuity-audit dry-run. Existing pipeline coverage: the compatibility CLI mode is tested by SPEC64WORSYSCOM-003 and SPEC64WORSYSCOM-005.`

### Commands

1. `grep -n "compatibility" .claude/skills/continuity-audit/SKILL.md`
2. `test -f .claude/skills/continuity-audit/references/compatibility-reporting.md && grep -n "audits/" .claude/skills/continuity-audit/references/compatibility-reporting.md`
3. A continuity-audit dry-run is the correct verification boundary here because the deliverable is skill prose, not production code — there is no validator binary to exercise.
