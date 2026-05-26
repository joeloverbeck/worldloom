# MCPENH-068: Add MCP surgical maintenance for story-bundle state repairs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp`, package tests, package/repo machine-facing docs, and story-skill boundary prose. No patch-engine operation or validator semantic change landed.
**Deps**: None

## Problem

Some live-corpus story-bundle repairs are structural maintenance, not new fiction. `tickets/STEMOAGENCY-002.md` is the immediate example: red-bunny `STEMO-3` and `STEMO-4` need append-only restamping after `stemo_agency_effect_compatibility` stopped accepting `SE.non_propagation_facts[]` / `SE.state_relations[]` as constrained-agency receipts.

The current lawful write paths are too coarse for this class of repair. Direct `_source` edits are forbidden by `AGENTS.md` and `docs/HARD-GATE-DISCIPLINE.md`, while `.claude/skills/branching-story-turn-cycle` `repair_turn` is a full causal tick that normally produces new `SE`, `PG`, page-plan, choices, and index updates. For two existing stale records, that creates noisy narrative state just to perform maintenance.

## Assumption Reassessment (2026-05-25)

1. `tools/world-mcp/src/tool-names.ts` registers retrieval, ID allocation, schema description, validation, submission, and storylet-selection tools, but no dedicated surgical story-maintenance planning tool.
2. `.claude/skills/branching-story-turn-cycle/SKILL.md` has `action_source_mode: repair_turn`, but its contract is still a complete one-causal-tick page-creation workflow.
3. The shared boundary under audit is MCP-to-patch-engine story-bundle mutation: all `_source` writes must still pass through `validate_patch_plan` / `submit_patch_plan` with approval-token discipline. `docs/HARD-GATE-DISCIPLINE.md` was read on 2026-05-25 because this ticket touches patch-plan and approval-token guidance.
4. FOUNDATIONS Rule 1 and Rule 5 motivate the immediate STEMO repair: a constraining affect must either be visible in downstream state/choice pressure or stop claiming `agency_effect: constraining`.
5. This ticket must not weaken HARD-GATE semantics. It adds a narrower authoring/maintenance surface that still requires explicit user approval before submission.
6. Patch-engine operation reassessment: `tools/patch-engine/src/envelope/schema.ts` and `tools/patch-engine/src/ops/story-record-specs.ts` already expose create ops for the required classes (`create_stemo_record`, `create_stplan_record`, `create_srel_record`, `create_chc_record`), and the corresponding story JSON Schemas already accept `supersedes`. The live implementation should therefore plan existing ops, not add duplicate patch-engine operations.
7. Proof command correction: `tools/world-mcp/package.json` runs compiled `dist/tests/**/*.test.js`; the reliable focused proof is `npm run build` followed by direct `node --test dist/tests/...` files. The drafted `npm test -- --test-name-pattern ...` shape was checked as a baseline but is broader/noisier than the owned invariant.

## Architecture Check

1. A surgical MCP maintenance path is cleaner than forcing data repair through `branching-story-turn-cycle` because it preserves append-only provenance without inventing a new page or causal turn.
2. No backwards-compatibility shim or validator weakening is introduced.
3. The tool composes existing patch-engine primitives. The current `create_*_record` story ops are sufficient for append-only superseding records, so no duplicate patch-engine operation is added.

## Verification Layers

1. Tool registration complete -> `describe_capabilities`, `listTools`, and capability-parity tests show the new MCP tool.
2. Envelope shape correct -> unit tests prove generated maintenance plans enter the same `validate_patch_plan` path used by normal submissions instead of skipping at envelope shape.
3. Engine discipline preserved -> tests prove the tool returns a reviewable plan only, with no receipt/write result and no approval token consumption.
4. STEMO maintenance use case covered -> fixture test demonstrates superseding a `story_emotion_record` and creating downstream STPLAN/SREL/CHC grounding without creating a synthetic `PG`.

## Landed Changes

### 1. Add a story-maintenance planning tool

Added `mcp__worldloom__plan_story_state_maintenance` for bounded story-bundle repairs.

The tool:

- Requires `world_slug`, `story_slug`, `reason`, `source_ticket`, and an explicit list of intended record operations.
- Retrieves superseded predecessor records through existing indexed retrieval.
- Allocates replacement IDs through `allocate_many_ids` / existing story-scoped allocation rules.
- Emits a patch-plan envelope for review and never submits automatically.
- Restricts generated targets to story-bundle paths under `worlds/<world_slug>/stories/<story_slug>/_source/`.

### 2. Support append-only story-state restamping

The immediate required operation is superseding an existing story record with a new record carrying `supersedes: <prior-id>`. The tool supports:

- `story_emotion_record`
- `story_plan_record`
- `relationship_record_story`
- `choice_record` when needed as downstream grounding

Existing patch-engine create operations support this shape, so the MCP tool should reuse them and require replacement records to carry `supersedes` when the requested maintenance action supersedes an existing record.

### 3. Preserve validation and approval discipline

The generated plan is review-only. It carries `approval_token: PENDING_HARD_GATE_APPROVAL`, next-step guidance for validation and submission, and no receipt/write result. Operators still validate through `mcp__worldloom__validate_patch_plan` or the equivalent CLI path before approval, then submit through the existing `sign-approval-token` + `submit_patch_plan` flow.

### 4. Document the maintenance boundary

Updated `docs/MACHINE-FACING-LAYER.md`, `docs/WORKFLOWS.md`, `tools/world-mcp/README.md`, and `.claude/skills/branching-story-turn-cycle/SKILL.md` to distinguish:

- full `branching-story-turn-cycle` `repair_turn` for real causal repairs that need a new page snapshot
- surgical story-state maintenance for append-only correction of stale or invalid records where no new fictional turn occurred

## Files to Touch

- `tools/world-mcp/src/tool-names.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (new)
- `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` (new)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` and/or server capability-parity tests (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `docs/WORKFLOWS.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)

## Out of Scope

- Repairing red-bunny `STEMO-3` / `STEMO-4`; that remains `tickets/STEMOAGENCY-002.md`.
- Changing `stemo_agency_effect_compatibility` semantics.
- Adding a general-purpose arbitrary YAML edit tool.
- Bypassing HARD-GATE approval, approval tokens, or patch-engine validation.
- Creating rendered prose, page plans, or synthetic `PG` records for maintenance-only repairs.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/plan-story-state-maintenance.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/capability-parity.test.js`
3. `cd tools/world-mcp && npm test`

### Invariants

1. The maintenance tool returns a reviewable patch plan and never applies writes directly.
2. The plan is constrained to one `world_slug` / `story_slug` and cannot target world-canon `_source` paths.
3. Append-only semantics are preserved: existing story records are not overwritten; replacements carry `supersedes`.
4. Generated plans remain compatible with existing approval-token and submit-path discipline.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` — covers plan shape, path scoping, ID allocation expectations, and STEMO-style maintenance.
2. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — proves the tool is advertised.
3. `tools/world-mcp/tests/server/capability-parity.test.ts` — proves the registered MCP server exposes the new tool in `describe_capabilities`.
4. `tools/world-mcp/tests/server/dispatch.test.ts` — proves dispatch accepts the new tool and validates missing required inputs at the MCP boundary.
5. `tools/world-mcp/tests/server/list-tools.test.ts` — keeps the registered inventory assertion tied to `getRegisteredToolNames()`.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/plan-story-state-maintenance.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/capability-parity.test.js`
3. `cd tools/world-mcp && npm test`

## Outcome

Implemented `mcp__worldloom__plan_story_state_maintenance` as a review-only planner around existing story-record create ops. It allocates fresh story-scoped IDs, verifies superseded predecessor records through indexed `get_record`, fills append-only `id` / `supersedes` fields, emits bounded story `_source` targets for STEMO/STPLAN/SREL/CHC records, and leaves validation/signing/submission to the existing HARD-GATE patch-plan flow.

Documented the maintenance boundary in the package README, repo machine-facing/workflow docs, and `branching-story-turn-cycle`: maintenance-only restamps use the planner, while `repair_turn` remains for real causal ticks that require a new `SE`, `PG`, page plan, and choice/state continuity.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/plan-story-state-maintenance.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/capability-parity.test.js` — passed.
3. `cd tools/world-mcp && node --test dist/tests/server/*.test.js` — passed after replacing a stale hard-coded tool count with `getRegisteredToolNames().length`.
4. `cd tools/world-mcp && npm test` — passed: 463 tests, 463 pass, 0 fail.

## Deviations

- No patch-engine operation or validator change landed; reassessment proved the existing `create_stemo_record`, `create_stplan_record`, `create_srel_record`, and `create_chc_record` ops already express the maintenance plans.
- The drafted `npm test -- --test-name-pattern ...` commands were replaced with the package's actual compiled-output proof shape plus the full `npm test` package gate.
- The new planner does not repair red-bunny `STEMO-3` / `STEMO-4`; that remains owned by `tickets/STEMOAGENCY-002.md`.
