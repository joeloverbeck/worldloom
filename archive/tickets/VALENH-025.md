# VALENH-025: STQ source_records is split three ways — reconcile the grounding-validator allow-set and contract doc to the widened schema

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/story-question-utils.ts`, `.claude/skills/_shared-templates/story-record-schemas.md`, `tools/validators/tests/structural/story-question-grounding-integrity.test.ts`, with the already-widened `tools/validators/src/schemas/story-question.schema.json` treated as pre-existing same-seam input.
**Deps**: None.

## Problem

At intake, a prior SPEC-47-followup edit had widened `STQ.source_records` in `tools/validators/src/schemas/story-question.schema.json` to allow 15 classes — adding `STSTAT`, `STPLAN`, and `STEMO`. Its two companions had not been updated:

- The grounding validator's allow-set, `SOURCE_RECORD_TYPES` in `tools/validators/src/structural/story-question-utils.ts`, still listed only the old 12 (no STSTAT/STPLAN/STEMO).
- The contract doc, `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.16, still listed the old 12.

Before this ticket, `story_question_grounding_integrity` (`story-question-grounding-integrity.ts`) rejected any source whose class was not in the map: `sourceRecordTypeFor(id) === undefined` -> `story_question_grounding_integrity.invalid_source_record`. **Consequence:** an `STQ` whose `source_records` cited `STPLAN-1` / `STEMO-1` / `STSTAT-1` passed `record_schema_compliance` (schema accepted it) but was rejected by `story_question_grounding_integrity` — two validators actively disagreed, and the contract doc misled authors. That mismatch is now closed by the landed allow-set, record loading, template, and parity test.

This is exactly the class of gap that crippled story-state authoring elsewhere (a record the schema accepts but a sibling validator rejects). A dramatic question can genuinely be sourced from an actor's plan ("will her escape plan hold?"), emotion ("will his rage cost the alliance?"), or status ("will she stay captive?"), so the schema's widening is the intended direction; the validator allow-set and doc must follow.

## Assumption Reassessment (2026-05-20)

1. Confirmed at intake and preserved at closeout: `story-question.schema.json` source_records pattern = `SF|BEL|DA|THR|OBL|CNSQ|STINT|SREL|STLOC|STOBJ|CLK|STSEC|STSTAT|STPLAN|STEMO` (15); this schema widening was pre-existing same-seam work, not created by this run.
2. Confirmed at intake: `SOURCE_RECORD_TYPES` in `story-question-utils.ts` listed 12 classes (no STSTAT/STPLAN/STEMO), and `story-question-grounding-integrity.ts` failed `invalid_source_record` when `sourceRecordTypeFor` returned `undefined`. Landed correction: `SOURCE_RECORD_TYPES` now admits `STSTAT`, `STPLAN`, and `STEMO`, and `loadStoryQuestionRecordSet()` loads their `story_status_record`, `story_plan_record`, and `story_emotion_record` rows for grounding lookup.
3. Confirmed at intake: `story-record-schemas.md` §4.5.16 listed the old 12 source classes. Landed correction: that shared template now lists STSTAT/STPLAN/STEMO alongside the existing STQ source classes.
4. Shared boundary under audit: the `STQ.source_records` contract spans (a) `story-question.schema.json` (consumed by `record_schema_compliance`), (b) `SOURCE_RECORD_TYPES` plus source record loading in `story-question-utils.ts` (consumed by `story_question_grounding_integrity`), and (c) `story-record-schemas.md` §4.5.16. The schema (a) is the already-widened source of truth; this ticket aligned (b) and (c) to it.
5. This is an additive-only extension of the STQ source-record allow-set — no source class was removed, every existing STQ record remains valid, and the added node-type values (`story_status_record`, `story_plan_record`, `story_emotion_record`) already exist as canonical node types elsewhere in the validator package.
6. HARD-GATE discipline was read because `story_question_grounding_integrity` can run in `pre-apply` for STQ patch plans. The change broadens acceptance only for schema-valid STQ source references; it does not alter approval-token handling, patch submission, or validator run-mode selection.
7. Package user-facing surfaces inspected: `tools/validators/README.md` lists `story_question_grounding_integrity` but does not enumerate STQ `source_records` classes; `docs/MACHINE-FACING-LAYER.md` documents generic `STQ story_question_source` edges and STSTAT/STPLAN/STEMO record classes but does not carry the stale 12-class STQ allow-list. No same-seam package README/repo-doc update was required.

## Architecture Check

1. The schema is the single source of truth and has already moved; aligning the validator allow-set and the doc to it (rather than narrowing the schema back) is the coherent direction, because plan/emotion/status are legitimate sources for a present-causal open setup. A schema↔allow-set parity assertion prevents the three surfaces from drifting apart again — the same guard pattern VALENH-024 added for the predicate-DSL role fields.
2. No backwards-compatibility shims: the allow-set is extended in place; no dual-path or legacy handling is introduced.

## Verification Layers

1. A plan/emotion/status-sourced STQ passes *both* validators → unit test (`tools/validators/tests/structural/story-question-grounding-integrity.test.ts`): an STQ with `source_records: [STPLAN-1, STEMO-1, STSTAT-1]` (each active at the STQ's `created_at_page`) yields no `invalid_source_record` verdict.
2. Allow-set ↔ schema parity → unit test: `SOURCE_RECORD_TYPES` keys equal the class set in `story-question.schema.json` `source_records` pattern.
3. Doc matches → grep: `story-record-schemas.md` §4.5.16 source_records list includes STSTAT/STPLAN/STEMO.

## Landed Changes

1. `tools/validators/src/structural/story-question-utils.ts` — added `STSTAT: "story_status_record"`, `STPLAN: "story_plan_record"`, and `STEMO: "story_emotion_record"` to `SOURCE_RECORD_TYPES`, and loaded those three node types into the record set used by STQ source grounding.
2. `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.16 — extended the `source_records` value list with `STSTAT-<integer>`, `STPLAN-<integer>`, and `STEMO-<integer>`.
3. `tools/validators/tests/structural/story-question-grounding-integrity.test.ts` — added a plan/emotion/status-sourced STQ acceptance test that exercises `record_schema_compliance` and `story_question_grounding_integrity`, plus a `SOURCE_RECORD_TYPES` keys == schema source-class set parity assertion.

## Files to Touch

- `tools/validators/src/structural/story-question-utils.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/tests/structural/story-question-grounding-integrity.test.ts` (modify)
- `archive/tickets/VALENH-025.md` (modify closeout/archive handoff)

## Out of Scope

- The `story-question.schema.json` schema itself (already widened; not to be re-narrowed).
- Any other STQ field or validator (`payoff_of`, `answer_records`, payoff/terminal-debt validators).
- The CLK `linked_records` STEMO question and the `story-state-contract.md` record-class count (separate items).

## Acceptance Criteria

- **Tests passed**: an STQ sourcing STPLAN/STEMO/STSTAT passes `record_schema_compliance` and `story_question_grounding_integrity`; the parity assertion holds; the existing STQ validator tests stay green.
- **Invariants**: no source class is removed; existing STQ records remain valid; the three surfaces (schema, allow-set, doc) enumerate the same source-class set.

## Test Plan

- **New/modified tests**: `story-question-grounding-integrity.test.ts` now includes (a) a plan/emotion/status-sourced STQ acceptance case and (b) a `SOURCE_RECORD_TYPES` keys == schema source-class set parity assertion.
- **Commands**:
  - `cd tools/validators && npm test`
  - Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/story-question-grounding-integrity.test.js`

## Outcome

Completed. The STQ grounding validator, source-record lookup set, shared authoring template, and focused tests now agree with the already-widened STQ schema for STSTAT/STPLAN/STEMO source records.

## Verification Result

- `cd tools/validators && npm run build` — passed after tightening the new schema-parity helper for strict TypeScript.
- `cd tools/validators && node --test dist/tests/structural/story-question-grounding-integrity.test.js` — passed; 4 tests, including the new schema-valid STSTAT/STPLAN/STEMO grounding case and schema/map parity assertion.
- `cd tools/validators && npm test` — passed; 706 tests.
- `rg` review over `tools/validators/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `.claude/skills/_shared-templates/story-record-schemas.md` found no remaining stale 12-class STQ allow-list in current package/user-facing surfaces.

## Deviations

- `tools/validators/src/schemas/story-question.schema.json` was already dirty before this run and was treated as the pre-existing same-seam schema source of truth; this run did not edit that schema.
- The broad validators package suite passed despite other pre-existing dirty validator/schema files in the worktree; those adjacent changes remain outside this ticket's ownership.
