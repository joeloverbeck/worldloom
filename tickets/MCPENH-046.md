# MCPENH-046: docs/MACHINE-FACING-LAYER.md — validator-bundle staleness and CLI-as-temporary-workaround

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/MACHINE-FACING-LAYER.md` (new sub-case in the existing stale-server troubleshooting matrix); `tools/world-mcp/README.md` (CLI usage section update naming the second purpose). No code changes; documentation-only ticket.
**Deps**: `archive/tickets/MCPENH-005` and `archive/tickets/ENGINESYNC-002` (the friction cases that motivated the existing `describe_capabilities()` introspection path documented at `docs/MACHINE-FACING-LAYER.md` line 110); `tickets/MCPENH-045.md` (introduces the `compute-pg-hashes` CLI; the broader pattern this docs ticket documents is "CLI scripts as fresh-process escape valves for the running MCP server's in-memory state").

## Problem

`docs/MACHINE-FACING-LAYER.md` lines 91 and 110 document the stale-server pattern where the running MCP server's compiled `tools/world-mcp/dist/` is older than the source checkout. The documented remediation is: run `mcp__worldloom__describe_capabilities()` to inspect the deployed enum / tool contract, then `cd tools/world-mcp && npm run build` and restart the MCP server/client session.

That remediation matrix covers stale MCP enum values and stale tool names, but NOT stale `@worldloom/validators` bundle bytes that the running world-mcp server holds in memory. The world-mcp server loads `@worldloom/validators`'s compiled `dist/` at startup; once the validators package is rebuilt mid-session (e.g., the operator edits validator code and runs `cd tools/validators && npm run build`), the world-mcp process continues using the cached bundle from its startup snapshot. The standard remediation ("restart the MCP server/client session") works but is heavy-weight — restarting a Claude Code session mid-conversation is not always available.

Concrete trigger this session (2026-05-13): `branching-story-turn-cycle` for PG-2 patched the validators package mid-flow (VALENH-019: snapshot_replay_equality migration to the new SE.state_delta schema). After `cd tools/validators && npm run build`, repeated `mcp__worldloom__validate_patch_plan` calls continued to fail with the same `snapshot_replay_equality.snapshot_drift` verdict against PG-2 even though the rebuilt code would have passed cleanly. The operator switched to `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/patch-plan.json` and `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/patch-plan.json /tmp/approval-token.txt` — these CLI paths spawn fresh Node processes that load the just-rebuilt validators bundle, bypassing the running server's stale in-memory cache.

The CLI paths are currently framed in `docs/HARD-GATE-DISCIPLINE.md` and `docs/MACHINE-FACING-LAYER.md` exclusively as transport-size escape valves (envelopes >50KB) — there is no mention that they are also the canonical escape valve for stale-validators-bundle scenarios. Operators hitting this scenario must rediscover the CLI-as-workaround empirically.

## Assumption Reassessment (2026-05-13)

1. **Codebase reassessment.** `docs/MACHINE-FACING-LAYER.md` at HEAD: line 91 names the stale-server pattern in prose; line 110 in the troubleshooting matrix names `describe_capabilities()` as the introspection surface and `npm run build + restart` as the remediation. The matrix covers enum-value-rejection and tool-name-rejection cases only. Lines around 110 do not mention validator-bundle-in-memory staleness or the CLI scripts. `docs/HARD-GATE-DISCIPLINE.md` mentions the CLI submit path as a transport-size escape valve (the threshold quoted as ~50KB). `tools/world-mcp/README.md` documents the CLI scripts; verify with `grep -nE 'stale|validator|in-memory|workaround' tools/world-mcp/README.md` — no matches in current source. `git status --porcelain` shows neither `docs/MACHINE-FACING-LAYER.md` nor `tools/world-mcp/README.md` modified in working tree; this gap is genuinely present at HEAD.
2. **Doc reassessment.** No archived MCPENH ticket addresses validator-bundle staleness specifically. `archive/tickets/MCPENH-005` and `archive/tickets/ENGINESYNC-002` motivated the existing schema-currency-verification path (`describe_capabilities()`) but are scoped to enum/tool surfaces. No archived ticket has an Outcome that adds the validator-bundle case to the troubleshooting matrix or names the CLI as a fresh-process workaround.
3. **Shared boundary under audit.** The cross-package boundary between `@worldloom/world-mcp` (the long-running MCP server that imports `@worldloom/validators` at startup) and `@worldloom/validators` (whose compiled bundle is what the server holds in memory). This boundary is invisible at the docs level: `describe_capabilities()` can introspect world-mcp's deployed enum / tool surface but does not surface the validators-bundle version it carries. The CLI scripts side-step the boundary by spawning a fresh process that runs the just-rebuilt code; this is a runtime workaround that ought to be documented alongside the principled fix (full server restart).
4. **FOUNDATIONS principle under audit.** Tooling Recommendation (§"non-negotiable"): the docs are the operator-facing surface for the machine-facing pipeline. An operator who reads the existing docs and follows them faithfully will hit the validator-bundle case, try `describe_capabilities()` (which returns clean output because the world-mcp tool/enum contract is current), run `npm run build` (already done), conclude the docs' remediation is exhausted, and improvise. The CLI workaround is empirically discoverable but not documented — pure prose drift against the operator's lived experience.
5. **Mismatch + correction.** Working-tree-vs-HEAD: no in-session edits to `docs/MACHINE-FACING-LAYER.md` or `tools/world-mcp/README.md`. The gap is genuinely present at HEAD and in working tree; the audit found the symptoms (operator switched paths empirically) but the docs amendment has not yet been written. This ticket lands the amendment.

## Architecture Check

1. **Why this approach over alternatives.**
   - *Option A (chosen): document the validator-bundle case as a new sub-row in the existing `docs/MACHINE-FACING-LAYER.md` troubleshooting matrix, name the CLI scripts as the temporary workaround, name the principled fix (full session restart with package rebuild) as the permanent remediation. Mirror the same content in `tools/world-mcp/README.md`'s CLI section.* Documentation-only change; uses the existing troubleshooting-matrix structure already in place; preserves the principled-fix-first ordering (the CLI is named as the temporary escape valve, not the recommendation). No code changes, no API surface changes.
   - *Option B (rejected): add a `describe_validator_bundle()` MCP introspection tool that returns the bundle's content hash.* Adds an API surface to track the bundle version, but does not solve the operator's actual problem (the bundle is already known stale; what they need is a remediation that doesn't require session restart). The CLI-as-workaround is the actual remediation; documentation is the right vehicle.
   - *Option C (rejected): rewrite the MCP server to lazy-load the validators bundle on every request.* Performance cost (validators-package size is non-trivial; load per request is wasteful); ignores the actual operator need (a one-off mid-session reload, not steady-state behavior).
2. **No backwards-compatibility aliasing/shims introduced.** Docs-only change; no code paths affected. The new sub-row in the troubleshooting matrix is additive; existing entries are unchanged.

## Verification Layers

1. **Invariant**: an operator who reads `docs/MACHINE-FACING-LAYER.md` from top-to-bottom and hits the validator-bundle staleness scenario can find both the principled fix (full restart) and the temporary workaround (CLI scripts) without empirical rediscovery → manual review of the docs amendment by reading the section as a fresh reader; grep-proof that the new sub-row mentions both the CLI script paths (`tools/world-mcp/dist/src/cli/{validate,submit}-patch-plan.js`) and the principled-fix-first ordering.
2. **Invariant**: `tools/world-mcp/README.md` CLI documentation lists the CLI's two purposes (transport-size escape valve AND stale-bundle escape valve) consistently with the `docs/MACHINE-FACING-LAYER.md` amendment → codebase grep-proof for `stale|workaround` in both files; identical phrasing where the two files overlap.

## What to Change

### 1. `docs/MACHINE-FACING-LAYER.md` — add validator-bundle sub-case

Append a new row to the troubleshooting matrix near line 110 (the existing entry on stale enum/tool contracts):

> | A tool's pre-apply validators reject a patch plan with verdicts inconsistent with the just-rebuilt validators source | The running world-mcp server still holds the pre-rebuild `@worldloom/validators` compiled bundle in memory. `describe_capabilities()` cannot detect this because the bundle version is not part of the world-mcp tool/enum contract surface. | Principled fix: `cd tools/validators && npm run build` (already done), then restart the MCP server/client session so the world-mcp process re-imports the rebuilt bundle. Temporary workaround when session restart is not immediately available: invoke the pre-apply validators through `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` and the patch engine through `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>`. Both CLI scripts spawn fresh Node processes that load the just-rebuilt validators bundle, bypassing the running server's startup-time cache. The CLI paths are functionally equivalent to the MCP tools — same engine wiring, same `PatchReceipt` output, same failure-mode codes; their secondary purpose (in addition to the transport-size escape valve at envelopes >50KB) is exactly this stale-bundle scenario. |

Also add a short paragraph after the matrix explaining the dual purpose of the CLI: "The `tools/world-mcp/dist/src/cli/` scripts (`validate-patch-plan.js`, `submit-patch-plan.js`, `sign-approval-token.js`, and `compute-pg-hashes.js` from MCPENH-045) serve two distinct escape-valve purposes: (1) the documented transport-size escape valve for envelopes that exceed the MCP transport's practical threshold (~50KB); (2) a fresh-process escape valve for any scenario where the running MCP server holds stale dependency code in memory and a full session restart is not immediately available. Operators should default to the principled fix (rebuild + session restart) and reserve the CLI workaround for the in-session mid-flow case."

### 2. `tools/world-mcp/README.md` — CLI section dual-purpose note

In the CLI section, after the existing transport-size note, add: "The CLI scripts also serve as a fresh-process workaround for the stale-validators-bundle case documented in `docs/MACHINE-FACING-LAYER.md` — when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory and a full session restart is not immediately available, invoke the corresponding CLI script directly. Same engine wiring, same output."

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/README.md` (modify)

## Out of Scope

- Adding any code-level introspection surface (e.g., `describe_validator_bundle()`). The user can rebuild + restart whenever they want the principled fix; the CLI workaround needs only documentation.
- Removing the CLI scripts' transport-size primary purpose. The CLI gains a secondary purpose; the primary use case (>50KB envelopes) remains.
- Auto-reloading the validators bundle on world-mcp source change. Hot-reload is a separate scope; the docs amendment documents the existing fresh-process workaround.
- Updating `docs/HARD-GATE-DISCIPLINE.md`. That doc covers HARD-GATE patterns specifically; the CLI's dual purpose belongs in `docs/MACHINE-FACING-LAYER.md` (server lifecycle) and the world-mcp README (CLI-specific docs).

## Acceptance Criteria

### Tests That Must Pass

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`
2. `grep -nE 'validator.{0,20}bundle|stale.{0,20}validator' docs/MACHINE-FACING-LAYER.md` — returns the new troubleshooting-matrix row.
3. `grep -nE 'fresh.process|stale.{0,20}bundle|workaround' tools/world-mcp/README.md` — returns the new dual-purpose note.

### Invariants

1. The CLI scripts' two purposes (transport-size escape valve; stale-bundle escape valve) are documented consistently across `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md`.
2. The principled fix (rebuild + session restart) is named first in the troubleshooting matrix; the CLI workaround is named as a temporary escape valve when session restart is not immediately available. The docs do not promote the workaround over the principled fix.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -niE 'validator.{0,20}bundle|stale.{0,20}validator' docs/MACHINE-FACING-LAYER.md` — verifies the new troubleshooting row is present.
2. `grep -niE 'fresh.process|stale.{0,20}bundle|workaround' tools/world-mcp/README.md` — verifies the CLI README dual-purpose note.
3. Manual review: read `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix top-to-bottom as a fresh reader; confirm the validator-bundle case is discoverable without empirical rediscovery.
