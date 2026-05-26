# PROSESPLIT2-006: Refresh or grandfather existing page-plan §2 / §3 / §19 drift after verbatim validator lands

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — existing `worlds/<slug>/stories/<story-slug>/pages-prose-plans/PG-<integer>.md` artifacts must be refreshed directly or a validator grandfather policy must be added
**Deps**: archive/tickets/PROSESPLIT2-005.md

## Problem

PROSESPLIT2-005 adds `page_plan_verbatim_section_integrity`, which compares page-plan §2 / §3 / §19 payloads against `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md`.

During PROSESPLIT2-005 verification, a direct smoke against `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` showed existing-plan drift after the canonical payload correction:

1. §3 drift remains because existing plans carry older prose-craft bytes than the current `prose-craft-contract.md`.
2. §19 drift remains because existing plans carry older render-time instruction bytes than the current `render-time-instruction.md`.

The validator is correct to fail current drift, but existing page plans were authored before this structural gate existed. This ticket owns the remediation decision so full-world validation can be made intentionally green or intentionally grandfathered.

## Assumption Reassessment (2026-05-26)

1. `page_plan_verbatim_section_integrity` is introduced by PROSESPLIT2-005 and emits `page_plan_verbatim_section_integrity.drift` for stale existing plans.
2. Existing `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-*.md` artifacts are direct-write story artifacts, not atomic `_source` records, but they are live world content and must be handled deliberately.
3. Shared boundary: the remediation must preserve the self-contained-plan contract without silently rewriting story-canon records.

## Architecture Check

1. A bounded remediation ticket is cleaner than weakening the new validator because the validator protects newly authored plans and pre-apply page-plan drafts.
2. No backwards-compatibility aliasing/shims should be added unless reassessment chooses an explicit grandfathering policy with exact file/path/message keys.

## Verification Layers

1. Existing plan drift is either refreshed or explicitly grandfathered -> direct validator smoke over affected page plans.
2. New page-plan drafts still fail on unapproved drift -> focused validator rejection test remains green.

## What to Change

### 1. Reassess the remediation path

Choose exactly one:

- Refresh existing page-plan §2 / §3 / §19 payloads from canonical source while preserving all story-specific sections.
- Add an exact grandfather policy for pre-validator plans, keyed narrowly enough that future drift still fails.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-*.md` (modify, if refresh path is chosen)
- validator grandfather/baseline files (modify, if grandfather path is chosen)

## Out of Scope

- Weakening `page_plan_verbatim_section_integrity` for newly authored plans.
- Changing the canonical renderer contract content.

## Acceptance Criteria

### Tests That Must Pass

1. Direct `page_plan_verbatim_section_integrity` smoke over affected existing plans returns the chosen intentional result.
2. Focused validator tests from PROSESPLIT2-005 still pass.

### Invariants

1. Newly authored page plans still require §2 / §3 / §19 byte equality with the canonical-source payloads.

## Test Plan

### New/Modified Tests

1. TBD by chosen path.

### Commands

1. TBD by chosen path.
