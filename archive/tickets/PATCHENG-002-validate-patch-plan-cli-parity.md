# PATCHENG-002: Add validate-patch-plan CLI parity for size-bypass cases

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — add `tools/world-mcp/src/cli/validate-patch-plan.ts` (generated `dist/` output via build); tests in `tools/world-mcp/tests/`; package bin/build metadata; documentation in `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md`; defensive ripple to `.claude/skills/create-base-world/references/engine-envelope-shape.md` §5 validation/submit path selection table; `.claude/skills/create-base-world/SKILL.md`, `.claude/skills/canon-addition/SKILL.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md` for the parity option.
**Deps**: None (CLI parity for an existing engine handler).

## Problem

At intake, `tools/world-mcp/dist/src/cli/submit-patch-plan.js` existed for >50KB envelopes that exceed MCP transport — the canonical bypass for size-constrained patch plans. After this ticket, submit and validate bypasses are documented together at `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan. The submit CLI remains a thin delegator over `handleSubmitPatchPlanTool`; same engine code, same `PatchReceipt`, same failure-mode codes.

Before this ticket, `validate_patch_plan` — the read-only pre-apply validator pass — had **no CLI equivalent**. For genesis envelopes (typically 80–100KB for `create-base-world`) and large `canon-addition` accept-paths, the optional pre-apply validation step was structurally unavailable through the CLI, while submission had CLI parity. The result: large envelopes could be submitted via CLI but could not be optionally pre-validated via CLI, forcing operators to either skip validation entirely (the path I took on 2026-05-01) or attempt MCP validation that the size constraint blocks.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: the envelope was 89.5KB (42 ops, full prose bodies in 7 SEC records). The skill's Phase 11 step 5 says:

> **Optional**: call `mcp__worldloom__validate_patch_plan(envelope)` for a pre-apply validator pass (now possible because the index exists). Loop back to the responsible Phase on any `fail` verdict.

I did not call `validate_patch_plan` because the envelope was too large for MCP transport. The CLI offered no validate alternative. Three pre-apply errors (`invalid_input` × 2, `id_allocation_race`) only surfaced at submission time, each requiring a re-sign + resubmit cycle (MCP transport size doesn't constrain the CLI submit path, so submission worked even though validation didn't). Each round-trip cost ~5 minutes of envelope-rebuild + re-sign + re-submit.

If a `validate-patch-plan` CLI existed, the optional validation step in Phase 11 step 5 would have surfaced all three errors in one pass before the first submission attempt — saving ~15 minutes of round-trip cost and producing a cleaner audit trail.

This pattern will recur for every >50KB envelope:
- `create-base-world` genesis envelopes (typically 80–100KB)
- `canon-addition` accept-path envelopes with many section updates / modification-history appends / mystery-or-open-question records (per `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan)
- Future skills emitting large multi-record envelopes

This ticket adds the missing thin CLI delegator over the existing `validate_patch_plan` MCP handler.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/dist/src/cli/submit-patch-plan.js` exists and is documented at `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan. Confirmed via direct ls + 2026-05-01 session use.
2. `tools/world-mcp/src/tools/validate-patch-plan.ts` is the MCP tool handler for the validate path. The validate handler is a read-only pre-apply validator path: same envelope-shape checker and validator package, no commit, no approval-token consumption. Live contract drift from the intake ticket: malformed envelope shape returns `{ status: "skipped", reason, verdicts: [] }`, not submit-style `invalid_input` / `envelope_shape_invalid` error JSON.
3. Cross-tool boundary under audit: the contract between (a) the MCP transport layer and its size constraint, and (b) every consumer skill that emits a >50KB envelope and wants pre-apply validation. The shared contract is the validate-patch-plan handler; the gap is the missing CLI delegator that bypasses MCP transport.
4. **FOUNDATIONS principle motivating this ticket**: §Tooling Recommendation — "skills should always receive [X] with completeness guarantees." The completeness guarantee implies that pre-apply validation should be available regardless of envelope size; gating it on transport size violates the principle. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches a Canon Safety Check enforcement surface (pre-apply validators ARE the Canon Safety Check pass per FOUNDATIONS §Machine-Facing Layer §4), but the change is purely a NEW transport path for the same handler — Mystery Reserve firewall, HARD-GATE semantics, and validator outcomes are unchanged. Validators run identically; only the request shape (CLI invocation vs MCP call) differs.
5. Schema extension: NO schema changes. The validate handler's input/output shapes are unchanged. The CLI is a thin delegator that reads the plan from a file path and prints the same status object the MCP handler returns. Exit-code convention is CLI-local: `pass` exits 0; `fail` and `skipped` exit 1; argv errors exit 2.
6. Package checkpoint: `tools/world-mcp/package.json` exposes `sign-approval-token` and `submit-patch-plan` only; its build script chmods only those two CLI outputs. The validate CLI must be added to `bin` and to the build chmod list so the generated artifact is runnable after `npm run build`.
7. Pipeline-wide grep for current validate_patch_plan callers found `.claude/skills/create-base-world/SKILL.md` Phase 11 step 5, `.claude/skills/canon-addition/SKILL.md` Phase 14a, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md`. This ticket updates those skill prose locations to mention the CLI parity path for size-constrained envelopes.
8. Adjacent contradiction surfaced during reassessment: the drafted failure-mode parity overstated submit-style error-code equivalence for `validate_patch_plan`. The truthful parity is transport parity over the existing validate handler: same validator status object and verdicts; no mutation, token verification, write lock, or submit-only engine failure codes.

## Architecture Check

1. Adding a CLI delegator parallel to `submit-patch-plan.js` is the minimal change — it reuses the existing engine handler, the existing transport-size-bypass pattern, and the existing CLI shape conventions. The alternative (raising the MCP transport limit) shifts the constraint up the stack and may break for larger envelopes; CLI parity is the right architectural fit.
2. No backwards-compatibility shims. The new CLI is additive; existing MCP path unchanged.
3. Equivalence guarantees per `docs/HARD-GATE-DISCIPLINE.md` apply to the shared validate handler: same input envelope shape, same `pass` / `fail` / `skipped` status object, same validator verdicts. Submit-only engine failure codes remain submit-only.

## Verification Layers

1. Landed behavior: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` returns the same status object MCP returns for the validate handler → CLI integration test.
2. A >50KB genesis-style envelope validates without MCP transport involvement; verdict is returned cleanly → built-CLI smoke against a representative create-base-world envelope persisted to `/tmp`.
3. CLI status parity: handler `pass` returns JSON on stdout with exit 0; handler `fail` or `skipped` returns the same status JSON on stderr with exit 1; missing/invalid CLI argv returns exit 2 → CLI test.
4. Documentation: `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan extended to cover validate-CLI parity → grep-proof.
5. `.claude/skills/create-base-world/references/engine-envelope-shape.md` §5 validate/submit path selection table extended with a validate-CLI row → grep-proof.

## What to Change

### 1. Add the validate-patch-plan CLI

Create `tools/world-mcp/src/cli/validate-patch-plan.ts`:
- Input: `<plan-path>` — single argv positional, JSON file containing the patch-plan envelope.
- Output: `pass` status object printed to stdout as JSON on success (exit 0); `fail` or `skipped` status object printed to stderr as JSON on validation failure / skipped validation (exit 1); argv error (exit 2). Status object shape matches the existing MCP `validate_patch_plan` handler's response.
- Implementation: read the plan-path file, parse JSON, invoke the existing validate handler (equivalent to the submit-plan CLI's pattern but without the approval token), serialize and print the returned status object.
- The CLI is a thin delegator over `validatePatchPlan`.

### 2. Build output

Ensure `tools/world-mcp/dist/src/cli/validate-patch-plan.js` is generated and chmodded on `npm run build` parallel to `submit-patch-plan.js`; add the package `bin` entry.

### 3. Tests

`tools/world-mcp/tests/cli/validate-patch-plan.test.ts`:
- Happy-path: well-formed envelope passes validation → exit 0, verdict on stdout.
- Failure-path: envelope with validator failures returns `status: "fail"` → exit 1, status object on stderr.
- Skipped-path: malformed envelope such as empty `target_file` returns `status: "skipped"` → exit 1, status object on stderr.
- Argv error: missing plan-path argument → exit 2.

### 4. Documentation

`docs/HARD-GATE-DISCIPLINE.md`:
- §Validating and submitting the plan — extend with a parallel paragraph naming the validate-CLI as the size-bypass path for the validate handler. Same-handler parity applies without claiming submit-only engine failure codes.

`tools/world-mcp/README.md`:
- Add brief CLI entry alongside the existing `submit-patch-plan` CLI entry.

### 5. Skill prose ripple

`.claude/skills/create-base-world/references/engine-envelope-shape.md`:
- §5 validate/submit path selection by envelope size table — add a validate-CLI row paralleling the submit-CLI row.

`.claude/skills/create-base-world/SKILL.md` Phase 11 step 5:
- Add a one-line note: "For envelopes >50KB (typical for genesis), use the validate-CLI path: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>`."

`.claude/skills/canon-addition/SKILL.md` Phase 14a:
- Same one-line note for parity.

## Files to Touch

- `tools/world-mcp/src/cli/validate-patch-plan.ts` (new)
- `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` (new)
- `tools/world-mcp/package.json` (modify — `bin` and build chmod list)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — §Validating and submitting the plan)
- `docs/MACHINE-FACING-LAYER.md` (modify — machine-facing command inventory)
- `tools/world-mcp/README.md` (modify — CLI entry)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify — §5 validate/submit path table)
- `.claude/skills/create-base-world/SKILL.md` (modify — Phase 11 step 5 note)
- `.claude/skills/canon-addition/SKILL.md` (modify — Phase 14a validate-patch-plan reference)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — Phase 14a validation path)

## Out of Scope

- Raising the MCP transport size limit (separate concern; the CLI bypass is the canonical workaround per HARD-GATE-DISCIPLINE.md and is the right fit for large envelopes).
- Schema introspection (covered by ENGINESYNC-003).
- Engine validator behavior changes (covered by separate tickets if needed; this ticket only adds a transport path).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes including new validate-CLI tests.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <large-genesis-envelope.json>` returns clean verdict on a well-formed >50KB envelope.
3. CLI status handling parallels the existing validate handler: `pass` exits 0, `fail` / `skipped` exit 1, argv errors exit 2.

### Invariants

1. `submit-patch-plan` CLI and `validate-patch-plan` CLI use structurally identical delegation patterns — divergence between submit and validate transports is an architectural smell and is removed by this ticket.
2. `docs/HARD-GATE-DISCIPLINE.md` records validate-CLI as transport parity over the validate handler, without claiming submit-only engine failure codes.
3. Operator-path skill prose for `validate_patch_plan` names both MCP and CLI paths where envelope size affects the invocation route.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` — new CLI delegator tests.

### Commands

1. `cd tools/world-mcp && npm test` — package-local pass.
2. Manual: persist a representative >50KB envelope to `/tmp/test-validate.json`, invoke the validate-CLI, confirm clean verdict.
3. Manual: corrupt the envelope (delete `target_file` from one op), re-validate, confirm `status: "skipped"` on stderr with the field path in `reason`.

## Outcome

Implemented validate CLI parity for size-constrained patch-plan validation:

Completion date: 2026-05-01.

- Added `tools/world-mcp/src/cli/validate-patch-plan.ts`, a thin delegator over `validatePatchPlan`.
- Added `validate-patch-plan` to `tools/world-mcp/package.json` `bin` and build chmod metadata so `npm run build` emits a runnable `dist/src/cli/validate-patch-plan.js`.
- Added `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` covering pass, fail, skipped, help, missing arg, missing file, and malformed JSON behavior.
- Updated hard-gate, machine-facing, package README, `create-base-world`, and `canon-addition` docs/skill references to name the validate CLI as the large-envelope validation bypass.

## Verification Result

1. `npm test` from `tools/world-mcp` — passed after building; includes the new validate CLI tests.
2. Large-envelope built-CLI smoke — passed with a 97,533-byte temporary plan from a temp seeded repo root: exit 0, output status `pass`. The first harness attempt hit sandbox child-process restriction (`spawnSync node EPERM`); rerun with escalation succeeded.
3. Skipped-envelope built-CLI smoke — passed: empty `target_file` emitted `status: "skipped"` to stderr with reason `patch_plan.patches[0].target_file must be a non-empty string.` and exit 1.

## Deviations

The intake ticket overclaimed submit-style failure-code parity for the validate path. The landed contract preserves the existing MCP validate status object: `pass` exits 0 on stdout; `fail` and `skipped` exit 1 on stderr. Submit-only engine errors remain submit-only.

Dirty-worktree ledger: initial snapshot was clean. Owned edits are the tracked docs/skill/package/ticket files plus new source/test files listed above. Verification rebuilt ignored `tools/world-mcp/dist/`; existing ignored `tools/world-mcp/node_modules/` and `tools/world-mcp/.secret` remained ignored package artifacts.
