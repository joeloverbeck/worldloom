# PATCHENG-002: Add validate-patch-plan CLI parity for size-bypass cases

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — add `tools/world-mcp/src/cli/validate-patch-plan.ts` (and `dist/`); tests in `tools/world-mcp/tests/`; documentation in `docs/HARD-GATE-DISCIPLINE.md` and `tools/world-mcp/README.md`; defensive ripple to `.claude/skills/create-base-world/references/engine-envelope-shape.md` §5 Submit-path selection table; `.claude/skills/canon-addition/SKILL.md` Phase 14a (or current validate-patch-plan reference) for the parity option.
**Deps**: None (CLI parity for an existing engine handler).

## Problem

`tools/world-mcp/dist/src/cli/submit-patch-plan.js` exists for >50KB envelopes that exceed MCP transport — the canonical bypass for size-constrained patch plans, documented at `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass). The CLI is a thin delegator over `handleSubmitPatchPlanTool`; same engine code, same `PatchReceipt`, same failure-mode codes.

But `validate_patch_plan` — the read-only pre-apply validator pass — has **no CLI equivalent**. For genesis envelopes (typically 80–100KB for `create-base-world`) and large `canon-addition` accept-paths, the optional pre-apply validation step is structurally unavailable through the CLI, while submission has CLI parity. The result: large envelopes can be submitted via CLI but cannot be optionally pre-validated via CLI, forcing operators to either skip validation entirely (the path I took on 2026-05-01) or attempt MCP validation that the size constraint blocks.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: the envelope was 89.5KB (42 ops, full prose bodies in 7 SEC records). The skill's Phase 11 step 5 says:

> **Optional**: call `mcp__worldloom__validate_patch_plan(envelope)` for a pre-apply validator pass (now possible because the index exists). Loop back to the responsible Phase on any `fail` verdict.

I did not call `validate_patch_plan` because the envelope was too large for MCP transport. The CLI offered no validate alternative. Three pre-apply errors (`invalid_input` × 2, `id_allocation_race`) only surfaced at submission time, each requiring a re-sign + resubmit cycle (MCP transport size doesn't constrain the CLI submit path, so submission worked even though validation didn't). Each round-trip cost ~5 minutes of envelope-rebuild + re-sign + re-submit.

If a `validate-patch-plan` CLI existed, the optional validation step in Phase 11 step 5 would have surfaced all three errors in one pass before the first submission attempt — saving ~15 minutes of round-trip cost and producing a cleaner audit trail.

This pattern will recur for every >50KB envelope:
- `create-base-world` genesis envelopes (typically 80–100KB)
- `canon-addition` accept-path envelopes with many section updates / modification-history appends / mystery-or-open-question records (per `docs/HARD-GATE-DISCIPLINE.md` §Submit-path selection by envelope size)
- Future skills emitting large multi-record envelopes

The fix is mechanical: add a thin CLI delegator over the existing `validate_patch_plan` MCP handler.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/dist/src/cli/submit-patch-plan.js` exists and is documented at `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass). Confirmed via direct ls + 2026-05-01 session use.
2. `tools/world-mcp/src/tools/validate-patch-plan.ts` (or equivalent — verify exact path at implementation time) is the MCP tool handler for the validate path. The validate handler is a read-only equivalent of the submit handler: same envelope ingestion, same pre-apply validators, same error/verdict envelope on output, no commit and no approval-token consumption.
3. Cross-tool boundary under audit: the contract between (a) the MCP transport layer and its size constraint, and (b) every consumer skill that emits a >50KB envelope and wants pre-apply validation. The shared contract is the validate-patch-plan handler; the gap is the missing CLI delegator that bypasses MCP transport.
4. **FOUNDATIONS principle motivating this ticket**: §Tooling Recommendation — "skills should always receive [X] with completeness guarantees." The completeness guarantee implies that pre-apply validation should be available regardless of envelope size; gating it on transport size violates the principle. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches a Canon Safety Check enforcement surface (pre-apply validators ARE the Canon Safety Check pass per FOUNDATIONS §Machine-Facing Layer §4), but the change is purely a NEW transport path for the same handler — Mystery Reserve firewall, HARD-GATE semantics, and validator outcomes are unchanged. Validators run identically; only the request shape (CLI invocation vs MCP call) differs.
5. Schema extension: NO schema changes. The validate handler's input/output shapes are unchanged. The CLI is a thin delegator that reads the plan from a file path and prints the verdict to stdout (parallel to `submit-patch-plan.js`'s shape).
6. Pipeline-wide grep for current validate_patch_plan callers: `.claude/skills/create-base-world/SKILL.md` Phase 11 step 5 (post-2026-05-01 audit) cites the MCP form; `.claude/skills/canon-addition/SKILL.md` Phase 14a (verify exact phase reference at implementation time) cites the same MCP form. After this ticket lands, both skill prose locations should be updated to mention the CLI parity path for size-constrained envelopes.
7. Adjacent contradiction surfaced during reassessment: none. The submit-patch-plan CLI was already added without a parallel validate-patch-plan CLI; this is a parity gap, not a separate bug.

## Architecture Check

1. Adding a CLI delegator parallel to `submit-patch-plan.js` is the minimal change — it reuses the existing engine handler, the existing transport-size-bypass pattern, and the existing CLI shape conventions. The alternative (raising the MCP transport limit) shifts the constraint up the stack and may break for larger envelopes; CLI parity is the right architectural fit.
2. No backwards-compatibility shims. The new CLI is additive; existing MCP path unchanged.
3. Equivalence guarantees per `docs/HARD-GATE-DISCIPLINE.md` §Equivalence guarantees apply identically to validate-CLI: same handler, same input shape, same output verdict shape, same failure-mode codes.

## Verification Layers

1. After fix: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` returns the same verdict object MCP returns for the validate handler → CLI integration test.
2. A 89KB genesis envelope validates without MCP transport involvement; verdict is returned cleanly → integration test (a representative create-base-world envelope persisted to /tmp).
3. CLI failure-mode parity: `invalid_input`, `envelope_shape_invalid`, `target_file_missing`, `id_allocation_race`, etc. — same codes, same JSON-on-stderr shape, same exit codes (0 success, 1 failure, 2 argv error) — parallel to `submit-patch-plan.js` per `docs/HARD-GATE-DISCIPLINE.md` §Equivalence guarantees → CLI test.
4. Documentation: `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass) extended to cover validate-CLI parity → grep-proof.
5. `.claude/skills/create-base-world/references/engine-envelope-shape.md` §5 Submit-path selection table extended with a validate-CLI row → grep-proof.

## What to Change

### 1. Add the validate-patch-plan CLI

Create `tools/world-mcp/src/cli/validate-patch-plan.ts`:
- Input: `<plan-path>` — single argv positional, JSON file containing the patch-plan envelope.
- Output: verdict object printed to stdout as JSON on success (exit 0); error object printed to stderr as JSON on failure (exit 1); argv error (exit 2). Verdict object shape matches the existing MCP `validate_patch_plan` handler's response.
- Implementation: read the plan-path file, parse JSON, invoke the existing validate handler (equivalent to the submit-plan CLI's pattern but without the approval token), serialize and print the verdict.
- The CLI is a thin delegator over `handleValidatePatchPlanTool` (or whatever the validate handler is named at implementation time — verify).

### 2. Build output

Ensure `tools/world-mcp/dist/src/cli/validate-patch-plan.js` is generated on `npm run build` parallel to `submit-patch-plan.js`.

### 3. Tests

`tools/world-mcp/tests/cli/validate-patch-plan.test.ts` (or extend existing CLI test file):
- Happy-path: well-formed envelope passes validation → exit 0, verdict on stdout.
- Failure-path: envelope with `target_file: ""` returns `invalid_input` → exit 1, error on stderr.
- Failure-path: envelope with mismatched expected_id_allocations returns `id_allocation_race` → exit 1.
- Argv error: missing plan-path argument → exit 2.

### 4. Documentation

`docs/HARD-GATE-DISCIPLINE.md`:
- §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass) — extend with a parallel paragraph naming the validate-CLI as the size-bypass path for the validate handler. Same equivalence-guarantees discipline applies.

`tools/world-mcp/README.md`:
- Add brief CLI entry alongside the existing `submit-patch-plan` CLI entry.

### 5. Skill prose ripple

`.claude/skills/create-base-world/references/engine-envelope-shape.md`:
- §5 Submit-path selection by envelope size table — add a validate-CLI row paralleling the submit-CLI row.
- §6 if applicable — note that pre-validation via CLI is now available for size-bypass cases.

`.claude/skills/create-base-world/SKILL.md` Phase 11 step 5:
- Add a one-line note: "For envelopes >50KB (typical for genesis), use the validate-CLI path: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` (per PATCHENG-002 / `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan)."

`.claude/skills/canon-addition/SKILL.md` Phase 14a (or current validate reference):
- Same one-line note for parity.

## Files to Touch

- `tools/world-mcp/src/cli/validate-patch-plan.ts` (new)
- `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` (new) OR extend existing CLI test
- `docs/HARD-GATE-DISCIPLINE.md` (modify — §Submitting the plan)
- `tools/world-mcp/README.md` (modify — CLI entry)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify — §5 Submit-path table; §6 cross-reference)
- `.claude/skills/create-base-world/SKILL.md` (modify — Phase 11 step 5 note)
- `.claude/skills/canon-addition/SKILL.md` (modify — Phase 14a / validate-patch-plan reference; verify exact phase at implementation time)

## Out of Scope

- Raising the MCP transport size limit (separate concern; the CLI bypass is the canonical workaround per HARD-GATE-DISCIPLINE.md and is the right fit for large envelopes).
- Schema introspection (covered by ENGINESYNC-003).
- Engine validator behavior changes (covered by separate tickets if needed; this ticket only adds a transport path).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes including new validate-CLI tests.
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <89kb-genesis-envelope.json>` returns clean verdict on a well-formed envelope.
3. CLI failure-mode codes parallel `submit-patch-plan.js`'s codes per `docs/HARD-GATE-DISCIPLINE.md` §Equivalence guarantees.

### Invariants

1. `submit-patch-plan` CLI and `validate-patch-plan` CLI use structurally identical delegation patterns — divergence between submit and validate transports is an architectural smell and is removed by this ticket.
2. `docs/HARD-GATE-DISCIPLINE.md` §Equivalence guarantees apply identically to validate-CLI as to submit-CLI.
3. Skill prose citing `validate_patch_plan` mentions both MCP and CLI paths uniformly.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` — new CLI delegator tests.

### Commands

1. `cd tools/world-mcp && npm test` — package-local pass.
2. Manual: persist a representative 89KB envelope to `/tmp/test-validate.json`, invoke the validate-CLI, confirm clean verdict.
3. Manual: corrupt the envelope (delete `target_file` from one op), re-validate, confirm `invalid_input` on stderr with the correct field path.
