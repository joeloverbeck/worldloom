# CORRIDOR-006: `submit-patch-plan` CLI parallel to `sign-approval-token`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/dist/src/cli/submit-patch-plan.js` (new CLI); `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token (cross-reference to new CLI)
**Deps**: None — additive CLI wrapping existing patch-engine + validators packages

## Problem

Skills that submit large patch plans (`canon-addition` accept-path with multiple ops; `diegetic-artifact-generation` with rich frontmatter and ~5K-word body; `create-base-world` genesis bundles) face a soft transport-size question: passing the full plan envelope through the MCP `patch_plan` parameter for `mcp__worldloom__submit_patch_plan` may strain transport size limits. Session evidence from DA-0003 generation: the plan envelope was 84KB; the operator chose to bypass MCP and invoke `submitPatchPlan` + `validatePatchPlan` directly via a hand-written Node script (`/tmp/submit_da_0003.mjs`), replicating in 30 lines what `tools/world-mcp/src/tools/submit-patch-plan.ts` does in 60 lines.

The bypass worked correctly — the patch engine wrote the file atomically with the same validators, locks, and receipts as the MCP path — but the workaround should be a documented escape hatch, not an ad-hoc rediscovery. A canonical CLI parallel to the existing `sign-approval-token.js` would standardize the bypass for any operator facing the same decision.

The HARD-GATE discipline doc (`docs/HARD-GATE-DISCIPLINE.md` §Issuing a token) currently documents the signer CLI; it should also document the submitter CLI as the corresponding next-step tool when transport-size concerns warrant.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/dist/src/cli/sign-approval-token.js` is the existing canonical signer; `tools/world-mcp/dist/src/cli/` is the canonical CLI directory for world-mcp tools. Adding `submit-patch-plan.js` follows the established convention.
2. `tools/world-mcp/src/tools/submit-patch-plan.ts` (the MCP tool handler) calls `submitPatchPlan` from `@worldloom/patch-engine` and wires `validatePatchPlan` from `@worldloom/validators` as the `preApplyValidator`. The CLI replicates this exact wiring.
3. Cross-artifact boundary: the CLI is a thin wrapper over the same patch-engine and validators packages the MCP tool uses. The two paths are functionally equivalent; the CLI exists only to bypass MCP transport for size-constrained cases.
8. Information-path: post-CORRIDOR-006, the world-mutation pipeline has TWO lawful submission paths — MCP `submit_patch_plan` and CLI `submit-patch-plan.js`. Both route through the same engine code (`submitPatchPlan` in `tools/patch-engine/dist/src/apply.js`). The canonical end-state recognizes both paths; documentation names the CLI as the bypass for size-constrained cases and the MCP path as the default.

## Architecture Check

1. A CLI wrapping `submitPatchPlan` is cleaner than expanding the MCP tool's parameter shape (e.g., accepting `patch_plan_path` as an alternative to `patch_plan`) because the size constraint belongs to MCP transport, not the engine. Skills already write the plan envelope to `/tmp/<plan-id>.json` per HARD-GATE-DISCIPLINE.md guidance; the CLI consumes that same path. Expanding the MCP tool would introduce an alternate-input branch that complicates the tool handler without changing the engine code path.
2. No backwards-compatibility aliasing/shims introduced. The MCP tool is unchanged. The CLI is net-new.

## Verification Layers

1. CLI invocation produces the same `PatchReceipt` as the MCP tool for the same inputs → integration test: build a small valid plan envelope; sign it; submit via both paths; assert receipts match (modulo `applied_at` timestamp).
2. CLI errors propagate identically → unit test: malformed plan via CLI returns the same error code as MCP submission with the same plan.
3. Pre-apply validators run identically → integration test: a plan that fails Rule 7 firewall validation via MCP also fails via CLI with the same `validator_failed` error.
4. HARD-GATE-DISCIPLINE.md cross-reference is correct → grep verification: `grep -n "submit-patch-plan" docs/HARD-GATE-DISCIPLINE.md` returns the inserted reference.

## What to Change

### 1. Create `tools/world-mcp/src/cli/submit-patch-plan.ts`

The CLI script:

```typescript
// Inputs:
//   argv[2]: <plan-path>  — JSON file with the patch plan envelope
//   argv[3]: <token-path> — file containing the signed approval token (one line, base64)
//
// Behavior:
//   1. Read the plan envelope from <plan-path>.
//   2. Read the approval token from <token-path>.
//   3. Call submitPatchPlan(envelope, token, { preApplyValidator: validatePatchPlan-wrapped })
//      — exactly as tools/world-mcp/src/tools/submit-patch-plan.ts does.
//   4. Print the PatchReceipt to stdout as JSON (same shape the MCP tool returns).
//   5. Exit 0 on success; exit 1 on any error with the error printed to stderr.
```

Build via the existing `tsc -p tsconfig.json` step that produces `dist/src/cli/`. Confirm the existing build pipeline picks up the new file without configuration changes.

### 2. Update `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token

Add a new subsection §Submitting the plan after the existing §Issuing a token. Document:
- The MCP path (`mcp__worldloom__submit_patch_plan(plan, approval_token)`) is the default.
- The CLI path (`node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>`) is an equivalent bypass for size-constrained cases (large plan envelopes that strain MCP transport).
- Both paths route through the same engine code and produce the same `PatchReceipt`.
- The CLI requires the plan to be persisted to a file; skills already do this per HARD-GATE-DISCIPLINE.md §Issuing a token guidance ("e.g., `/tmp/<plan-id>.json`").
- Failure modes: same as MCP path (`approval_expired`, `approval_replayed`, `validator_failed`, etc.) with stderr output instead of MCP error fields.

### 3. Skill prose updates (cross-references) — optional follow-up

Skills with Phase 9 Commit instructions that currently name only the MCP path may add a parenthetical cross-reference to the CLI path for size-constrained cases. Out of scope for this ticket; documented as a follow-up improvement opportunity.

## Files to Touch

- `tools/world-mcp/src/cli/submit-patch-plan.ts` (new)
- `tools/world-mcp/dist/src/cli/submit-patch-plan.js` (build artifact — produced by `tsc`)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — add §Submitting the plan subsection)
- `tools/world-mcp/tests/cli/submit-patch-plan.test.ts` (new)

## Out of Scope

- Expanding the MCP `submit_patch_plan` tool to accept `patch_plan_path` — explicitly rejected per Architecture Check #1.
- Skill prose updates that mention the CLI in Phase 9 instructions — separate per-skill tickets if/when adopted.
- A unified CLI for sign + submit (e.g., `sign-and-submit.sh`) — composition is a shell-script concern, not a tool concern.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --grep "cli-submit-patch-plan"` — CLI submission path returns the same `PatchReceipt` as the MCP path for an identical plan + token.
2. `cd tools/world-mcp && npm test -- --grep "cli-submit-patch-plan-errors"` — CLI propagates `approval_expired`, `approval_replayed`, `validator_failed` error codes.
3. Manual full-pipeline: regenerate DA-0003-equivalent plan, sign, submit via CLI, confirm receipt matches the actual DA-0003 receipt.

### Invariants

1. CLI and MCP submission paths produce equivalent receipts (modulo `applied_at` timestamp); tested by parametrized test.
2. CLI exits 0 on success; non-zero on any failure.
3. Pre-apply validators run identically across both paths (same validator wiring per Architecture Check).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/submit-patch-plan.test.ts` — happy-path equivalence + error-path equivalence with MCP submission.
2. `tools/world-mcp/tests/cli/submit-patch-plan-args.test.ts` — invalid argv handling (missing args, non-existent paths, malformed JSON).

### Commands

1. `cd tools/world-mcp && npm test -- --grep "cli-submit-patch-plan"` — targeted test suite.
2. `cd tools/world-mcp && npm test` — full world-mcp suite.
3. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/<plan>.json /tmp/<token>.txt` — manual smoke test against a freshly-signed plan.
