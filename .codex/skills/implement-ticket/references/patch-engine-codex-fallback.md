# Patch Engine Codex Fallback

Use this only when a ticket must mutate machine-layer `_source/*.yaml` records and the `mcp__worldloom__submit_patch_plan` tool is not available in the Codex toolset.

The goal is to preserve the patch-engine write boundary, not to make canon writes easier.

## Decision Rules

1. Prefer `mcp__worldloom__submit_patch_plan` whenever it is exposed.
2. If the MCP submit tool is unavailable, inspect the local patch-engine package before writing:
   - `tools/patch-engine/src/apply.ts`
   - `tools/patch-engine/src/envelope/schema.ts`
   - the op implementation for every operation in the plan
   - `tools/world-mcp/src/approval/token.ts` or the current approval-token implementation
3. Never direct-edit `_source/*.yaml` as a fallback.
4. Stop and escalate if the only available path would weaken a real hard gate, silently skip required approval semantics, or mutate canon without patch-engine staging.

## Minimum Local Driver Shape

A local temporary driver may submit through `submitPatchPlan` only when it does all of the following:

- builds a normal `PatchPlanEnvelope`
- computes current record content hashes from the patch-engine/world-index canonical hash helper rather than ad hoc hashing
- includes required retcon attestation, CH creation, modification-history append, expected id allocations, and any other live op requirements
- signs a short-lived approval token with the repo's local MCP secret using the same payload shape the engine verifies
- runs `validatePatchPlan` or the live pre-apply validator surface first and records the result
- calls `submitPatchPlan` from the repo root or with an explicit `worldRoot`
- keeps the temporary driver outside the repo unless the ticket explicitly owns adding reusable tooling

## Pre-Apply Verdict Handling

If `validatePatchPlan` reports failures, do not treat them as noise by default.

Classify each failure as:

- `owned blocker`: caused by this patch and must be fixed before submit
- `validator overbreadth for this op class`: not semantically applicable to this operation; record the exact verdict and why proceeding does not weaken the canon gate
- `separate validator bug or policy gap`: name or create the follow-up owner

Using an injected `preApplyValidator` callback is allowed only after that classification, and only when production/default behavior remains fail-closed. Record the callback and reason in the ticket `Assumption Reassessment` or `## Deviations`.

## Closeout Evidence

Before closeout, directly verify:

- the intended `_source/*.yaml` files changed through the engine receipt and on disk
- any created CH / modification-history / extension attribution is valid
- the world index was rebuilt or synced
- `world-validate <world>` reports the intended post-change state
- ignored generated/world artifacts are classified in the dirty-worktree ledger
