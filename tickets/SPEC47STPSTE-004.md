# SPEC47STPSTE-004: Wire STPLAN+STEMO into patch-engine (IdAllocations, ops, allocator, envelope-schema)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends patch-engine `IdAllocations`, `OPERATION_KINDS`, `PatchOperation`, `STORY_RECORD_SPECS`; extends MCP `allocate_next_id` allocator + `describe_envelope_schema` capability
**Deps**: `archive/tickets/SPEC47STPSTE-003.md`

## Problem

SPEC-47's two new record classes need engine-routed write paths. The patch engine must recognize `create_stplan_record` and `create_stemo_record` op kinds (with corresponding `PatchOperation` discriminated-union entries), register the classes in `STORY_RECORD_SPECS` so the commit phase knows where to write `_source/plans/STPLAN-<integer>.yaml` and `_source/emotions/STEMO-<integer>.yaml`, allocate STPLAN-N / STEMO-N IDs per the FOUNDATIONS-002 unpadded natural-integer convention, and surface both ops in the MCP `describe_envelope_schema` capability so downstream skills can discover them via the schema-discovery surface. Without this wiring, the JSON schemas (`archive/tickets/SPEC47STPSTE-003.md`) exist but are unreachable from skill-issued patch plans.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/patch-engine/src/ops/create-story-record.ts` is the central file containing `STORY_RECORD_SPECS` (a `Readonly<Record<StoryRecordOperationKind, StoryRecordSpec>>`) — confirmed by grep `grep -n "STORY_RECORD_SPECS" tools/patch-engine/src/`. The file aggregates all story-record op kinds (create_stent_record, create_ststat_record, create_clk_record, etc.); STPLAN/STEMO ops land alongside them. Verified `tools/patch-engine/src/envelope/validate.ts` contains the `IdAllocations` and envelope-validation surface that allocator updates touch. Verified `tools/world-mcp/src/tools/allocate-next-id.ts` exists (MCP allocator) and `tools/world-mcp/src/tools/describe-envelope-schema.ts` exists (capability description tool).
2. Verified SPEC-47 §Approach §A deliverables D-A6 (patch-engine `IdAllocations` + `OPERATION_KINDS` + `PatchOperation` + `STORY_RECORD_SPECS` extensions; new ops `create_stplan_record` + `create_stemo_record`); D-A7 (allocator recognized class list); D-A8 (`describe_envelope_schema` enumerates 2 new op kinds). Verified source-directory layout: `_source/plans/STPLAN-<integer>.yaml` and `_source/emotions/STEMO-<integer>.yaml` per SPEC-47 §Approach §A.
3. Cross-skill boundary under audit: the patch engine's op vocabulary is consumed by every skill that submits patch plans (story-pipeline skills, world-canon-mutating skills, audit-routing skills). Adding two new op kinds extends the closed `OPERATION_KINDS` enum that downstream skills use to construct patch plans. The MCP `allocate_next_id` and `describe_envelope_schema` tools are the discovery surfaces story-pipeline skills query at pre-flight to learn the op vocabulary.
4. FOUNDATIONS Rule 6 (No Silent Retcons) — the patch engine's append-only write discipline at `_source/<class>/*.yaml` is preserved per-file (no in-place mutation of prior records; supersession by writing a new record citing `supersedes`). The new ops follow this discipline; the corresponding source subdirs `_source/plans/` and `_source/emotions/` are append-only at the filesystem level.
5. STPLAN/STEMO op wiring touches `tools/patch-engine/src/` (per the §Step 6.2(c) per-ticket-type granularity rule for item 5: patch-engine op wiring is a Canon Safety surface — the engine gates story-bundle record writes at pre-apply time; modifying the op vocabulary directly affects what records can be written via `submit_patch_plan`). HARD-GATE discipline preserved: the new ops route through the same approval-token + envelope-validation path as existing ops; no canon-safety bypass introduced.

## Architecture Check

1. The patch-engine op vocabulary is the single point of truth for what writes the engine accepts; adding STPLAN/STEMO as new ops (rather than as field extensions to existing ops) preserves the per-class isolation that lets the validator chain reject mis-targeted writes (a `create_stent_record` op cannot mistakenly land a STPLAN body). Following the CLK/STSEC/STQ precedent from SPEC-42 keeps the engine's structure orthogonal.
2. No backwards-compatibility aliasing/shims introduced — both ops are net-new. The allocator's class-list extension is additive; existing allocations are unchanged.

## Verification Layers

1. `STORY_RECORD_SPECS` contains entries for STPLAN and STEMO with correct `prefix`, `nodeType`, and source-subdir mapping → codebase grep-proof + schema test
2. `OPERATION_KINDS` enum includes `create_stplan_record` and `create_stemo_record` → codebase grep-proof
3. `IdAllocations` recognizes STPLAN and STEMO as story-bundle-scoped allocation classes → schema validation against ID allocation tests
4. MCP `allocate_next_id` returns next STPLAN-N / STEMO-N when called with the new class names → skill dry-run via `mcp__worldloom__allocate_next_id`
5. MCP `describe_envelope_schema` enumerates `create_stplan_record` + `create_stemo_record` in its emitted schema description → capability dry-run via `mcp__worldloom__describe_envelope_schema`

## What to Change

### 1. Extend `tools/patch-engine/src/ops/create-story-record.ts`

Add two new entries to `STORY_RECORD_SPECS` following the existing CLK/STSEC/STQ pattern:

```typescript
create_stplan_record: {
  prefix: "STPLAN",
  nodeType: "story_plan_record",
  sourceSubdir: "plans",
  // ... matches existing per-spec shape (schema reference, op kind, etc.)
},
create_stemo_record: {
  prefix: "STEMO",
  nodeType: "story_emotion_record",
  sourceSubdir: "emotions",
  // ... matches existing per-spec shape
},
```

Update `StoryRecordOperationKind` type to include the two new op kind strings; update `StoryRecordSpec` consumers if any pre-existing assumption breaks under the additions.

### 2. Extend `tools/patch-engine/src/envelope/validate.ts`

Add STPLAN and STEMO to the `IdAllocations` recognized class list; ensure envelope-validation accepts the new op kinds and routes them through the same approval-token + commit-ordering path as existing story-record ops.

### 3. Extend `tools/world-mcp/src/tools/allocate-next-id.ts`

Add STPLAN and STEMO to the MCP allocator's recognized story-bundle-scoped class list. Allocation routes through `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug)` per FOUNDATIONS §Story Bundles §6 allocation discipline; the allocator scans `worlds/<slug>/stories/<story-slug>/_source/plans/STPLAN-*.yaml` (resp. `_source/emotions/STEMO-*.yaml`) for the highest existing N and returns N+1.

### 4. Extend `tools/world-mcp/src/tools/describe-envelope-schema.ts`

Update the emitted schema description to enumerate `create_stplan_record` and `create_stemo_record` alongside existing story-record op kinds. Schema-discovery output should include the JSON-schema reference paths for both new ops (pointing at `tools/validators/src/schemas/story-plan.schema.json` and `tools/validators/src/schemas/story-emotion.schema.json` per `archive/tickets/SPEC47STPSTE-003.md`).

## Files to Touch

- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/envelope/validate.ts` (modify)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)

## Out of Scope

- JSON schema content for STPLAN and STEMO — covered by `archive/tickets/SPEC47STPSTE-003.md` (this ticket only references the schema paths).
- Validator framework registration of per-class deterministic validators — covered by tickets 005 (STPLAN) and 006 (STEMO).
- Hook 3 path-blocking is automatic via the generic `**/stories/<slug>/_source/**/*.yaml` pattern at `tools/hooks/src/hook3-guard-direct-edit.ts:30-55` (verified during reassess-spec); no Hook 3 code change required (covered by ticket 017's integration-test verification per SPEC-47 D-A9).
- Story-record source-directory creation at runtime — handled by patch-engine commit-phase file-write logic (which creates parent dirs lazily); no separate ticket needed.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "create_stplan_record\|create_stemo_record" tools/patch-engine/src/ops/create-story-record.ts` returns 4+ matches (op kind in enum + spec entries).
2. `grep -n "STPLAN\|STEMO" tools/world-mcp/src/tools/allocate-next-id.ts` returns matches showing both classes registered.
3. A representative patch plan that includes `create_stplan_record` and `create_stemo_record` ops validates via `mcp__worldloom__validate_patch_plan` and submits via `mcp__worldloom__submit_patch_plan` against a fixture world.
4. `mcp__worldloom__describe_envelope_schema` emits both new op kinds in its capability description.

### Invariants

1. Existing patch-engine op kinds (create_stent_record, create_ststat_record, create_clk_record, ...) remain unchanged in behavior.
2. The append-only file-write discipline at `_source/<class>/*.yaml` is preserved for the new subdirs — no in-place mutation; supersession by writing a new record with `supersedes`.
3. Hook 3's generic `**/stories/<slug>/_source/**/*.yaml` pattern covers `_source/plans/` and `_source/emotions/` without code change (verified at ticket 017 integration test).

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-stplan-record.test.ts` (new) — round-trip: build a `create_stplan_record` op against a fixture world, submit via patch engine, verify the resulting `_source/plans/STPLAN-1.yaml` matches the JSON-schema and the expected ID-allocation result.
2. `tools/patch-engine/tests/ops/create-stemo-record.test.ts` (new) — same shape for STEMO including the `status: dissociated` + `affect_kind: null` case.
3. `tools/world-mcp/tests/tools/allocate-next-id-stplan-stemo.test.ts` (new) — `allocate_next_id` returns next STPLAN-N / STEMO-N given a fixture world with N-1 existing records.
4. `tools/world-mcp/tests/tools/describe-envelope-schema-stplan-stemo.test.ts` (new) — capability description includes both new op kinds with correct schema-reference paths.

### Commands

1. `npm --prefix tools/patch-engine run build && npm --prefix tools/patch-engine test` (patch-engine package tests pass)
2. `npm --prefix tools/world-mcp run build && npm --prefix tools/world-mcp test` (world-mcp package tests pass)
3. `npm --prefix tools/patch-engine run test:integration` (integration tests pass with new ops registered)
