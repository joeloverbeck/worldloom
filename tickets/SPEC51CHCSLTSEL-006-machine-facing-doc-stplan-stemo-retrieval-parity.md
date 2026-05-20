# SPEC51CHCSLTSEL-006: truth machine-facing STPLAN/STEMO retrieval docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — documentation-only update to `docs/MACHINE-FACING-LAYER.md`; no tool, schema, validator, or skill behavior change.
**Deps**: `archive/tickets/SPEC51CHCSLTSEL-003.md`

## Problem

`archive/tickets/SPEC51CHCSLTSEL-003.md` completed `tools/world-mcp` support for `story_plan_record` and `story_emotion_record` in `list_records` and `get_record_schema`, with a parity test guarding `SUPPORTED_LIST_RECORD_TYPES` against `STORY_BUNDLE_NODE_TYPES`. The live `docs/MACHINE-FACING-LAYER.md` retrieval table still has stale examples:

1. The `get_record` row lists many story-bundle id prefixes that require `story_slug`, but omits `STPLAN`, `STEMO`, and other currently supported bundle-scoped prefixes such as `CLK`, `STSEC`, and `STQ`.
2. The `list_records` row lists supported story-bundle `record_type` values but omits `story_plan_record`, `story_emotion_record`, `pressure_clock_record`, `story_secret_record`, and `story_question_record`, all of which are present in `tools/world-mcp/src/tools/list-records.ts`.
3. The `get_record_schema` row gives examples of story-bundle schemas but omits the now-supported `story_plan_record` and `story_emotion_record` schema surfaces.

The code and tests are already correct; the remaining problem is stale machine-facing documentation for the targeted retrieval contract.

## Assumption Reassessment (2026-05-20)

1. Live code check: `tools/world-mcp/src/tools/list-records.ts` `SUPPORTED_LIST_RECORD_TYPES` includes `story_plan_record`, `story_emotion_record`, `pressure_clock_record`, `story_secret_record`, and `story_question_record`.
2. Live code check: `tools/world-mcp/src/tools/get-record-schema.ts` `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and `NODE_TYPE_TO_SCHEMA_FILE` include `story_plan_record` -> `story-plan.schema.json` and `story_emotion_record` -> `story-emotion.schema.json`.
3. Shared boundary under audit: repo-level machine-facing retrieval documentation must match the live world-mcp retrieval and schema-discovery surfaces for story-bundle records.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation / Index + Targeted Retrieval. The docs must tell operators to use `get_record`, `list_records`, and `get_record_schema` for precise record access rather than bulk-reading story `_source/` trees.
5. This is an adjacent docs drift discovered during PEENH-015 post-ticket review, not unfinished PEENH-015 work. PEENH-015 owned patch-engine internal classifiers; this ticket owns world-mcp retrieval documentation.

## Architecture Check

1. Truthing the repo-level machine-facing doc to the exported world-mcp constants keeps user-facing command guidance aligned with the tested retrieval surface without changing behavior.
2. No backwards-compatibility aliasing/shims introduced; this is a documentation correction only.

## Verification Layers

1. `get_record` story-bundle prefix guidance names the current bundle-scoped classes -> grep/manual review against `docs/MACHINE-FACING-LAYER.md`.
2. `list_records` story-bundle `record_type` guidance includes live supported types, including `story_plan_record` and `story_emotion_record` -> grep/manual review against `tools/world-mcp/src/tools/list-records.ts` and the doc row.
3. `get_record_schema` guidance names the now-supported STPLAN/STEMO schema node types -> grep/manual review against `tools/world-mcp/src/tools/get-record-schema.ts` and the doc row.

## What to Change

### 1. Update retrieval table rows

Patch `docs/MACHINE-FACING-LAYER.md` under `## Retrieval Tool Scope` so the `get_record`, `list_records`, and `get_record_schema` rows reflect the live STPLAN/STEMO retrieval and schema-discovery support.

### 2. Keep this docs-only

Do not modify world-mcp code or tests. `archive/tickets/SPEC51CHCSLTSEL-003.md` already landed and verified the runtime behavior.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Any change to `tools/world-mcp`.
- Any new retrieval capability, schema support, validator behavior, or story-bundle class.
- Reopening `archive/tickets/SPEC51CHCSLTSEL-003.md`; this ticket only corrects the current docs.

## Acceptance Criteria

### Tests That Must Pass

1. Grep/manual-review proof that the `get_record` row includes `STPLAN`, `STEMO`, `CLK`, `STSEC`, and `STQ` among story-bundle ids requiring `story_slug`.
2. Grep/manual-review proof that the `list_records` row includes `story_plan_record`, `story_emotion_record`, `pressure_clock_record`, `story_secret_record`, and `story_question_record`.
3. Grep/manual-review proof that the `get_record_schema` row includes `story_plan_record` and `story_emotion_record`.
4. `git diff --check -- docs/MACHINE-FACING-LAYER.md tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md`

### Invariants

1. Documentation matches the live world-mcp constants for the named STPLAN/STEMO retrieval surfaces.
2. The ticket remains docs-only; no runtime behavior changes are required.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `rg -n "STPLAN|STEMO|story_plan_record|story_emotion_record" docs/MACHINE-FACING-LAYER.md`
2. `rg -n "pressure_clock_record|story_secret_record|story_question_record" docs/MACHINE-FACING-LAYER.md`
3. `git diff --check -- docs/MACHINE-FACING-LAYER.md tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md`
