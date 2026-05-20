# SPEC51CHCSLTSEL-006: truth machine-facing STPLAN/STEMO retrieval docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — documentation/public-surface update to `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` capability descriptions; no tool handler, schema, validator, or skill behavior change.
**Deps**: `archive/tickets/SPEC51CHCSLTSEL-003.md`

## Problem

`archive/tickets/SPEC51CHCSLTSEL-003.md` completed `tools/world-mcp` support for `story_plan_record` and `story_emotion_record` in `list_records` and `get_record_schema`, with a parity test guarding `SUPPORTED_LIST_RECORD_TYPES` against `STORY_BUNDLE_NODE_TYPES`. At intake, the live machine-facing retrieval prose still had stale examples:

1. The `get_record` retrieval prose in `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` listed many story-bundle id prefixes that require `story_slug`, but omitted `STPLAN`, `STEMO`, and other currently supported bundle-scoped prefixes such as `CLK`, `STSEC`, and `STQ`.
2. The `list_records` retrieval prose in `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` listed supported story-bundle `record_type` values but omitted `story_plan_record`, `story_emotion_record`, `pressure_clock_record`, `story_secret_record`, and `story_question_record`, all of which are present in `tools/world-mcp/src/tools/list-records.ts`.
3. The `get_record_schema` retrieval prose in `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` omitted or under-exampled the now-supported `story_plan_record` and `story_emotion_record` schema surfaces.

The code and tests were already correct at intake; this ticket corrected stale machine-facing documentation for the targeted retrieval contract.

## Assumption Reassessment (2026-05-20)

1. Live code check: `tools/world-mcp/src/tools/list-records.ts` `SUPPORTED_LIST_RECORD_TYPES` includes `story_plan_record`, `story_emotion_record`, `pressure_clock_record`, `story_secret_record`, and `story_question_record`.
2. Live code check: `tools/world-mcp/src/tools/get-record-schema.ts` `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and `NODE_TYPE_TO_SCHEMA_FILE` include `story_plan_record` -> `story-plan.schema.json` and `story_emotion_record` -> `story-emotion.schema.json`.
3. Shared boundary under audit: repo-level machine-facing retrieval documentation, package README guidance, and registered capability prose must match the live world-mcp retrieval and schema-discovery surfaces for story-bundle records.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation / Index + Targeted Retrieval. The docs must tell operators to use `get_record`, `list_records`, and `get_record_schema` for precise record access rather than bulk-reading story `_source/` trees.
5. This is an adjacent docs drift discovered during PEENH-015 post-ticket review, not unfinished PEENH-015 work. PEENH-015 owned patch-engine internal classifiers; this ticket owns world-mcp retrieval documentation.
6. Reassessment widened the same documentation seam: `tools/world-mcp/README.md` and `tools/world-mcp/src/server.ts` capability descriptions exposed the same stale retrieval examples as `docs/MACHINE-FACING-LAYER.md`. These are public-surface prose changes only; handler behavior, input schemas, allowlists, and validator schemas remain out of scope.

## Architecture Check

1. Truthing the repo-level machine-facing doc, package README, and registered capability prose to the exported world-mcp constants keeps user-facing command guidance aligned with the tested retrieval surface without changing handler behavior.
2. No backwards-compatibility aliasing/shims introduced; this is a documentation correction only.

## Verification Layers

1. `get_record` story-bundle prefix guidance names the current bundle-scoped classes -> grep/manual review against `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts`.
2. `list_records` story-bundle `record_type` guidance includes live supported types, including `story_plan_record` and `story_emotion_record` -> grep/manual review against `tools/world-mcp/src/tools/list-records.ts`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md`.
3. `get_record_schema` guidance names the now-supported STPLAN/STEMO schema node types -> grep/manual review against `tools/world-mcp/src/tools/get-record-schema.ts`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts`.

## Landed Changes

### 1. Update retrieval table rows

Patched `docs/MACHINE-FACING-LAYER.md` under `## Retrieval Tool Scope` so the `get_record`, `list_records`, and `get_record_schema` rows reflect the live STPLAN/STEMO retrieval and schema-discovery support.

### 2. Update world-mcp public prose

Patched `tools/world-mcp/README.md` and `tools/world-mcp/src/server.ts` capability descriptions so package-local guidance and `describe_capabilities` prose match the same live retrieval and schema-discovery surfaces.

### 3. Keep this behavior-neutral

No world-mcp handlers, input schemas, allowlists, or tests changed. `archive/tickets/SPEC51CHCSLTSEL-003.md` already landed and verified the runtime behavior; this ticket only updates public prose and capability-description strings.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-mcp/src/server.ts` (modify capability descriptions only)

## Out of Scope

- Any change to `tools/world-mcp` handler behavior, input schemas, tests, or runtime retrieval capability.
- Any new retrieval capability, schema support, validator behavior, or story-bundle class.
- Reopening `archive/tickets/SPEC51CHCSLTSEL-003.md`; this ticket only corrects the current docs.

## Acceptance Criteria

### Tests That Must Pass

1. Grep/manual-review proof that the `get_record` row includes `STPLAN`, `STEMO`, `CLK`, `STSEC`, and `STQ` among story-bundle ids requiring `story_slug`.
2. Grep/manual-review proof that the `list_records` row includes `story_plan_record`, `story_emotion_record`, `pressure_clock_record`, `story_secret_record`, and `story_question_record`.
3. Grep/manual-review proof that the `get_record_schema` row includes `story_plan_record` and `story_emotion_record`.
4. Grep/manual-review proof that `tools/world-mcp/README.md` and `tools/world-mcp/src/server.ts` no longer preserve the stale same-seam examples.
5. `npm run build` from `tools/world-mcp` type-checks the capability-description string edit.
6. `git diff --check -- docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-mcp/src/server.ts archive/tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md`

### Invariants

1. Documentation and registered capability prose match the live world-mcp constants for the named STPLAN/STEMO retrieval surfaces.
2. The ticket remains behavior-neutral; no runtime handler, schema, validator, or test changes are required.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `rg -n "STPLAN|STEMO|story_plan_record|story_emotion_record" docs/MACHINE-FACING-LAYER.md`
2. `rg -n "pressure_clock_record|story_secret_record|story_question_record" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md`
3. `rg -n "story_plan_record|story_emotion_record|pressure_clock_record|story_secret_record|story_question_record" tools/world-mcp/README.md tools/world-mcp/src/server.ts`
4. From `tools/world-mcp`: `npm run build`
5. `git diff --check -- docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-mcp/src/server.ts archive/tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md`

## Outcome

Completed 2026-05-20.

`docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` now list `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` as bundle-scoped `get_record` id classes that require `story_slug`. Their `list_records` guidance now includes `story_plan_record`, `story_emotion_record`, `pressure_clock_record`, `story_secret_record`, and `story_question_record`. Their `get_record_schema` guidance now names the schema-backed STPLAN/STEMO surfaces.

`tools/world-mcp/src/server.ts` capability descriptions now advertise the same bundle-scoped `get_record` examples and the same `list_records` / `get_record_schema` examples through `describe_capabilities`. No handler behavior, allowlist, input schema, validator, or test changed.

## Verification Result

1. `rg -n "STPLAN|STEMO|story_plan_record|story_emotion_record" docs/MACHINE-FACING-LAYER.md` — PASS; the retrieval table now includes the STPLAN/STEMO id and schema-discovery prose.
2. `rg -n "pressure_clock_record|story_secret_record|story_question_record" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md` — PASS; both public docs now list the CLK/STSEC/STQ record types for `list_records`.
3. `rg -n "story_plan_record|story_emotion_record|pressure_clock_record|story_secret_record|story_question_record" tools/world-mcp/README.md tools/world-mcp/src/server.ts` — PASS; README and capability descriptions now expose the added story-bundle retrieval/schema examples.
4. `rg -n "STPLAN|STEMO|CLK|STSEC|STQ" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-mcp/src/server.ts` — PASS; manual review confirmed the current `get_record` rows/descriptions include the story-bundle id prefixes requiring `story_slug`.
5. From `tools/world-mcp`: `npm run build` — PASS; TypeScript compiled after the capability-description edit and refreshed ignored `tools/world-mcp/dist/`.
6. `rg -n "STPLAN|STEMO|story_plan_record|story_emotion_record|pressure_clock_record|story_secret_record|story_question_record" tools/world-mcp/dist/src/server.js` — PASS; the built ignored server artifact contains the refreshed capability descriptions.
7. `git diff --check -- docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-mcp/src/server.ts archive/tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md` — PASS.

## Deviations

- Reassessment widened the file set from only `docs/MACHINE-FACING-LAYER.md` to the same public retrieval prose in `tools/world-mcp/README.md` and `tools/world-mcp/src/server.ts` capability descriptions. This stayed inside the same machine-facing documentation seam and did not change handler behavior.
- `tools/world-mcp/dist/` was refreshed by `npm run build` as an expected ignored generated artifact; it is not a tracked source edit.
