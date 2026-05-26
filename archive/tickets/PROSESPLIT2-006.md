# PROSESPLIT2-006: Grandfather existing page-plan §3 / §19 drift after verbatim validator lands

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `worlds/erotica-world/audits/validation-grandfathering.yaml` narrowly grandfathers existing pre-validator page-plan drift
**Deps**: archive/tickets/PROSESPLIT2-005.md

## Problem

PROSESPLIT2-005 adds `page_plan_verbatim_section_integrity`, which compares page-plan §2 / §3 / §19 payloads against `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md`.

During PROSESPLIT2-005 verification, a direct smoke against `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` showed existing-plan drift after the canonical payload correction:

1. §3 drift remains because existing plans carry older prose-craft bytes than the current `prose-craft-contract.md`.
2. §19 drift remains because existing plans carry older render-time instruction bytes than the current `render-time-instruction.md`.

The validator is correct to fail current drift, but existing page plans were authored before this structural gate existed. This ticket owns the remediation decision so this validator's live-corpus result can be made intentionally grandfathered without weakening new-plan validation.

## Assumption Reassessment (2026-05-26)

1. `page_plan_verbatim_section_integrity` is introduced by PROSESPLIT2-005 and emits `page_plan_verbatim_section_integrity.drift` for stale existing plans.
2. Existing `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-*.md` artifacts are direct-write story artifacts, not atomic `_source` records, but they are live world content and must be handled deliberately.
3. Shared boundary: the remediation must preserve the self-contained-plan contract without silently rewriting story-canon records.
4. Reassessment chose the grandfathering path. `pages-prose-plans/PG-*.md` is direct-write markdown, but each committed PG record stamps `PG.plan.plan_hash`; `sha256sum` showed PG-1, PG-2, and PG-5 currently match their stamped hashes, while PG-3 and PG-4 already have separate plan-hash drift. Refreshing §3 / §19 in the markdown files would create or worsen hash drift and would require a patch-engine PG reissue outside this ticket's owner boundary.
5. The existing validator framework supports exact-match grandfathering through `audits/validation-grandfathering.yaml`, matched by validator, code, file, node id, and message. That mechanism preserves unmatched/new drift as `fail`, so it is narrower than weakening `page_plan_verbatim_section_integrity`.
6. HARD-GATE-facing validation signal: `page_plan_verbatim_section_integrity` can run in pre-apply for `create_pg_record`; `docs/HARD-GATE-DISCIPLINE.md` was read. The grandfather policy is world-root full-world disposition data and does not downgrade pre-apply page-plan drafts without the exact world-root policy and exact historical finding keys.

## Architecture Check

1. A bounded grandfather policy is cleaner than rewriting old plan bytes because it preserves committed page-plan hash bridges while making the historical drift explicit and auditable.
2. No backwards-compatibility aliasing/shims are added. The validator remains fail-mode; only exact known findings are downgraded by the existing grandfathering framework.

## Verification Layers

1. Existing plan drift is explicitly grandfathered -> direct `world-validate` structural smoke over red-bunny shows the `page_plan_verbatim_section_integrity` findings downgraded to `info`.
2. New page-plan drafts still fail on unapproved drift -> focused validator rejection test remains green.

## Landed Changes

### 1. Add exact grandfather policy

Added exact findings for the ten known red-bunny `page_plan_verbatim_section_integrity.drift` verdicts: PG-1 through PG-5, sections §3 and §19.

## Files to Touch

- `worlds/erotica-world/audits/validation-grandfathering.yaml` (new)
- `archive/tickets/PROSESPLIT2-006.md` (modify — reassessment and closeout, archived after review)

## Out of Scope

- Weakening `page_plan_verbatim_section_integrity` for newly authored plans.
- Changing the canonical renderer contract content.
- Rewriting existing red-bunny `pages-prose-plans/PG-*.md` or reissuing hash-bridged PG records through the patch engine.
- Fixing unrelated existing red-bunny structural failures such as `page_plan_body_engine_vocabulary_cleanliness`.

## Acceptance Criteria

### Tests That Must Pass

1. Direct `page_plan_verbatim_section_integrity` smoke over affected existing plans returns `info` for the exact grandfathered findings and no `fail` findings from that validator.
2. Focused validator tests from PROSESPLIT2-005 still pass.

### Invariants

1. Newly authored page plans still require §2 / §3 / §19 byte equality with the canonical-source payloads.

## Test Plan

### New/Modified Tests

1. `worlds/erotica-world/audits/validation-grandfathering.yaml` — new exact-match grandfather policy for the ten known pre-validator red-bunny §3 / §19 findings.

### Commands

1. `npm run build` from `tools/validators/`.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny --json` from repo root, filtered to `page_plan_verbatim_section_integrity`, shows ten `info` verdicts and zero `fail` verdicts for that validator.
3. `node --test dist/tests/structural/page-plan-verbatim-section-integrity.test.js` from `tools/validators/`.

## Outcome

Completion date: 2026-05-26.

Added `worlds/erotica-world/audits/validation-grandfathering.yaml` with one exact-match grandfather entry for the ten historical red-bunny §3 / §19 page-plan drift verdicts. The existing validator remains fail-mode for unmatched/new drift, and existing `pages-prose-plans/PG-*.md` bytes were left untouched to avoid changing `PG.plan.plan_hash` bridges.

## Verification Result

1. `npm run build` from `tools/validators/` — PASS.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny --json | node -e '<filter page_plan_verbatim_section_integrity and assert 10 info / 0 fail>'` from repo root — PASS; the owned validator emitted ten `info` verdicts and zero `fail` verdicts.
3. `node --test dist/tests/structural/page-plan-verbatim-section-integrity.test.js` from `tools/validators/` — PASS, 7 tests.
4. Manual hash-bridge review — PASS; `sha256sum` matched stamped `PG.plan.plan_hash` for PG-1, PG-2, and PG-5 before remediation, while PG-3 and PG-4 already had separate plan-hash drift. No page-plan bytes were modified by this ticket.

## Deviations

- Reassessment chose grandfathering rather than refresh. Refreshing the old page-plan sections would require reissuing hash-bridged PG records through the patch engine, which is outside this ticket's remediation boundary.
- The broader red-bunny structural validation command still exits nonzero because of unrelated existing `page_plan_body_engine_vocabulary_cleanliness` failures. The accepted proof is scoped to `page_plan_verbatim_section_integrity`, the validator owned by this ticket.
- `worlds/erotica-world/` is gitignored in this checkout; the grandfather policy was verified by direct file/path reads and the validator CLI rather than by tracked `git diff` alone.
