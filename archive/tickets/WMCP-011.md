# WMCP-011: Tighten `harness_ceiling_chars` default and account for response-envelope overhead

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (lower `DEFAULT_HARNESS_CEILING_CHARS`; add `ENVELOPE_OVERHEAD_RESERVE_CHARS`; add `task_header.envelope_overhead_reserve_chars`), `tools/world-mcp/src/context-packet/assemble.ts` (apply the effective packet-body ceiling), `tools/world-mcp/src/context-packet/full-body-delivery.ts` (apply the effective packet-body ceiling while retaining full bodies), `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts`, `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, `.claude/skills/character-generation/SKILL.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/SKILL.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`
**Deps**: `archive/tickets/WMCP-005-reconcile-context-packet-budget-harness-ceiling.md` (dual-ceiling enforcement landed there; this ticket recalibrates the character-ceiling value and accounts for envelope overhead)

## Problem

At intake, WMCP-005 had landed `DEFAULT_HARNESS_CEILING_CHARS = 80000` based on a one-time observation that "the harness rejected at ~25K tokens / ~102K characters" in a May 2026 character-generation session. In the May 2 character-generation session against `worlds/erotica-world` that produced `CHAR-0002` (`iker-aguirre`), `mcp__worldloom__get_context_packet(task_type='character_generation', seed_nodes=['entity:donostia', 'entity:basque-country', 'entity:spain', 'entity:mount-igueldo'], token_budget=18000)` produced a `78,439`-character response that the harness STILL rejected with `result (78,439 characters) exceeds maximum allowed tokens. Output has been saved to /home/joeloverbeck/.claude/projects/.../tool-results/mcp-worldloom-mcp__worldloom__get_context_packet-1777675621491.txt`. The packet's `task_header.harness_ceiling_chars` was `80000`; the assembler thought the packet fit (78,439 < 80000) but the harness rejected at the smaller observed cap.

Two possibilities explain the gap, and the correct fix addresses both:

1. **Envelope-overhead miscount.** `enforceBudget` checks `JSON.stringify(packet).length` against `harness_ceiling_chars`. The harness measures the full serialized MCP-tool response, which includes the `content` wrapper, the `type: "text"` envelope, and any error-frame overhead added by the dispatcher. Real-world envelope overhead can be 1-3 KB depending on response shape. The assembler must reserve that overhead from the effective ceiling.
2. **Observed-cap drift.** WMCP-005's `~102K characters` observation is from May 1, 2026. The May 2 session showed the cap was at most `~78KB` (the response that triggered redirect). Either the harness limit shifted between May 1 and May 2, or the May 1 observation was noise (possibly a single successful sub-cap call mistaken for the cap itself). The previous `80000` default was not calibrated to either reading and was provably too loose under May 2 evidence.

The friction cost is real: when the harness rejects an inline response, the operator falls back to `jq` against the persisted file, an extra recovery round-trip per packet call. In the May 2 session this cost ~3 minutes of session time and a non-trivial cognitive shift away from the skill's documented "inline" pattern. The persisted-output fallback is engineered as a safety net, not a default; the default should reliably fit inline.

## Assumption Reassessment (2026-05-02)

1. `tools/world-mcp/src/context-packet/shared.ts` exposes `DEFAULT_HARNESS_CEILING_CHARS = 80000` and `resolveHarnessCeilingChars(envOverride)`. `tools/world-mcp/src/context-packet/assemble.ts` uses `estimateStablePacketChars(packet) <= harnessCeilingChars` in `packetFitsBudget`, checks the fully assembled preview packet against that same ceiling before returning either an inline packet or `persisted_with_summary`, and reruns budget enforcement after task-aware full-body delivery. `tools/world-mcp/src/context-packet/full-body-delivery.ts` also checks `estimateStablePacketChars(packet) > args.harnessCeilingChars` before retaining a `full_body`. None of these live checks reserve transport-envelope overhead.
2. The WMCP-005 verification result shows `cd tools/world-mcp && npm test` passed only when rerun with sandbox escalation; the test surface for the harness-ceiling boundary is `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` (oversize full packet returns a bounded `persisted_with_summary` inline response) and `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` (live `worlds/erotica-world` proof at `token_budget=18000` when the local gitignored world index exists). The latter is the regression surface this ticket must keep green.
3. Cross-skill shared boundary: every skill that calls `get_context_packet` consumes this ceiling. `character-generation` (`token_budget=18000`), `diegetic-artifact-generation` (`token_budget=10000`), and the canon-pipeline-adjacent skills (`canon-addition`, `propose-new-canon-facts`, `propose-new-characters`, `canon-facts-from-diegetic-artifacts`, `propose-new-worlds-from-preferences`, `emergent-pressure-events`, `continuity-audit`) all rely on the inline-response path being reliable at their prescribed budgets.
4. FOUNDATIONS principle under audit: §Tooling Recommendation (lines 476-490) — "completeness guarantees" of the context-packet pattern degrade when the packet's first leg (the inline response) reliably fails at the documented default. The persisted-output fallback preserves correctness but not the documented-default ergonomics.
5. Schema extension audit per `tickets/README.md` Pre-Implementation Check 10: this ticket is additive-only for the response shape because it adds `task_header.envelope_overhead_reserve_chars`; it also changes the default value of `task_header.harness_ceiling_chars` and the internal effective inline budget. Existing consumers that ignore the new field continue to work. Consumers reading `task_header.harness_ceiling_chars` will see a smaller configured ceiling and can compute the effective packet-body budget by subtracting the reserve.
6. Adjacent contradictions: `worlds/erotica-world` is the only mature production world locally available for the live-fit regression test; smaller worlds (genesis-only) trivially fit at any sane ceiling. The ceiling calibration should target the worst-case observed inline-fit envelope-size for `worlds/erotica-world` at `character_generation` defaults plus margin for envelope overhead.
7. Non-coincidental observation about session evidence: the May 2 session's 78,439-character packet hit the cap WITHOUT containing any of the high-value full bodies the skill promised — every INV record and every M record was downgraded to body-preview (see WMCP-012 for that adjacent issue). If those full bodies were included as the skill promises, the packet would be substantially larger, and the harness rejection would be even more aggressive. WMCP-011 must land alongside or before WMCP-012 so the larger payload doesn't trigger more rejections.

## Architecture Check

1. **Reserving envelope overhead in `enforceBudget` is structurally cleaner than tightening the ceiling alone.** A pure-ceiling tightening compensates only for the static observed gap; an envelope-overhead reserve compensates for the structural cause. The two together provide both correct calibration and structural robustness — if a future MCP transport layer adds more envelope wrappers, the reserve still covers it without a re-calibration ticket.
2. **Setting the calibrated ceiling at `60000` chars (rather than `50000` or `70000`) preserves a conservative default while avoiding unnecessary truncation.** The May 2 four-seed-node response was 78,439 chars and still overflowed the external harness. Lowering to `60000` plus a `4000`-character envelope-overhead reserve makes the effective packet-body budget `56000`, so the package either returns an inline body under that budget or switches to the existing `persisted_with_summary` recovery shape before the external harness sees an oversize response.
3. No backwards-compatibility aliasing/shims introduced. The `harness_ceiling_chars` and `estimator_version` fields remain in the response. The env-var override (`WORLDLOOM_MCP_HARNESS_CEILING_CHARS`) remains for the gross ceiling; consumers that override it explicitly continue to honor the override. The envelope-overhead reserve is a fixed package constant surfaced as telemetry, not a new env-var or per-call knob.

## Verification Layers

1. New default ceiling reflected in response -> codebase grep-proof: `DEFAULT_HARNESS_CEILING_CHARS = 60000` in `tools/world-mcp/src/context-packet/shared.ts`.
2. Envelope-overhead reserve applied in budget enforcement -> codebase grep-proof: `tools/world-mcp/src/context-packet/assemble.ts` and `full-body-delivery.ts` use `harnessCeilingChars - ENVELOPE_OVERHEAD_RESERVE_CHARS` as the effective packet-body ceiling before returning inline.
3. Default-budget call against live `worlds/erotica-world` produces an inline-deliverable response or the existing bounded summary response under the effective ceiling -> regression test `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` extended to assert `JSON.stringify(response).length <= harness_ceiling_chars - envelope_overhead_reserve_chars` at the new defaults when the local world index exists.
4. Pure character-ceiling enforcement still works -> existing `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` passes with the new constants and proves the persisted-summary inline response also fits the effective ceiling.
5. FOUNDATIONS alignment check: §Tooling Recommendation completeness-guarantee surface — the context-packet's documented default delivers inline reliably; persisted-output fallback retained as the safety net for unusually broad seed sets.

## Landed Changes

### 1. Lower `DEFAULT_HARNESS_CEILING_CHARS`

`tools/world-mcp/src/context-packet/shared.ts` now sets `DEFAULT_HARNESS_CEILING_CHARS = 60000`. This calibrates the ceiling to the May 2 observed hard limit minus envelope overhead.

### 2. Add envelope-overhead reserve

Introduced `ENVELOPE_OVERHEAD_RESERVE_CHARS = 4000` in `tools/world-mcp/src/context-packet/shared.ts`. `tools/world-mcp/src/context-packet/assemble.ts` and `tools/world-mcp/src/context-packet/full-body-delivery.ts` subtract this reserve from `harnessCeilingChars` before packet-body character comparisons. The effective inline ceiling is now `harness_ceiling_chars - ENVELOPE_OVERHEAD_RESERVE_CHARS = 56000` chars by default.

### 3. Surface the reserve in response telemetry

Added `task_header.envelope_overhead_reserve_chars: number` to the response (parallel to `task_header.harness_ceiling_chars`). Operators inspecting why a packet was downgraded or persisted can read the effective inline packet-body budget directly from the response telemetry.

### 4. Extend the live-fit regression test

`tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` now asserts the response is bounded by `harness_ceiling_chars - envelope_overhead_reserve_chars` for the `character_generation` (`18000`) and `diegetic_artifact_generation` (`10000`) defaults when the local `worlds/erotica-world` index exists. The May 2 78,439-character inline-response regression cannot recur through this package path.

### 5. Document the recalibration

Updated `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` to reflect the new default ceiling (`60000`), the envelope-overhead reserve (`4000`), and the effective inline budget (`56000`). Updated the character-generation and diegetic-artifact-generation skill prerequisite prose where it still cited the old `80000` literal.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — lower default; add reserve constant)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — apply reserve in full-packet, summary, enforcement, and error checks; surface reserve in response)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify — apply reserve while retaining high-value full bodies)
- `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` (modify — assertions against new constants)
- `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` (modify — extended effective-ceiling assertion)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — recalibrated values + rationale)
- `docs/MACHINE-FACING-LAYER.md` (modify — recalibrated values)
- `tools/world-mcp/README.md` (modify — recalibrated values)
- `.claude/skills/character-generation/SKILL.md` (modify — same-seam ceiling prose; file already had pre-existing unrelated/sibling edits)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — same-seam ceiling prose; file already had pre-existing unrelated/sibling edits)
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify — same-seam ceiling prose; file already had pre-existing unrelated/sibling edits)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify — same-seam ceiling prose; file already had pre-existing unrelated/sibling edits)

## Out of Scope

- Switching to a real tokenizer for `estimateTextTokens` (separate effort; WMCP-005 §Out of Scope #1).
- Raising the Claude Code harness's hard inline-response ceiling (outside our control).
- Making `ENVELOPE_OVERHEAD_RESERVE_CHARS` per-call configurable (env-var-only consistency with WMCP-005 §Out of Scope #4 — per-call override invites consumers to opt out of safety).
- Changing the default `delivery_mode` (kept at `full` per WMCP-005 §Out of Scope #3).
- Reserving budget for governing-context full bodies (WMCP-012's surface).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/harness-ceiling.test.js` — proves `enforceBudget` / persisted-summary handling honors the new lower ceiling AND applies the envelope-overhead reserve.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/erotica-world-fits.test.js` — proves the live `worlds/erotica-world` packet at `token_budget=18000` produces a bounded MCP response strictly under `harness_ceiling_chars - envelope_overhead_reserve_chars` (the May 2 78,439-char inline-response regression cannot recur).
3. `cd tools/world-mcp && npm test` — full package suite passes unchanged.

### Invariants

1. Every successful inline `get_context_packet` response satisfies `JSON.stringify(response).length <= harness_ceiling_chars - envelope_overhead_reserve_chars`.
2. `task_header.harness_ceiling_chars` is `60000` by default; `task_header.envelope_overhead_reserve_chars` is `4000` by default. Only `harness_ceiling_chars` is env-overridable through `WORLDLOOM_MCP_HARNESS_CEILING_CHARS`.
3. The `worlds/erotica-world` `character_generation` default-budget call produces a bounded MCP response under the effective packet-body ceiling when the local gitignored world index is present.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` — extended to assert (a) default ceiling is `60000`, (b) envelope-overhead reserve is `4000`, (c) persisted-summary responses fit `harness_ceiling_chars - envelope_overhead_reserve_chars`, (d) `WORLDLOOM_MCP_HARNESS_CEILING_CHARS` still overrides the gross ceiling while the reserve remains fixed.
2. `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` — extended to assert the local production-shaped `worlds/erotica-world` character and diegetic-artifact defaults produce a response under the effective inline budget, with margin recorded in the test rationale when the gitignored world index exists.

### Commands

1. `cd tools/world-mcp && npm test` — full package proof.
2. `cd tools/world-mcp && node --test dist/tests/context-packet/harness-ceiling.test.js dist/tests/context-packet/erotica-world-fits.test.js` — targeted verification of the recalibration.

## Outcome

Completion date: 2026-05-02.

Implemented the WMCP-011 recalibration:

1. `DEFAULT_HARNESS_CEILING_CHARS` is now `60000`.
2. `ENVELOPE_OVERHEAD_RESERVE_CHARS` is now `4000`, surfaced as `task_header.envelope_overhead_reserve_chars`.
3. `assembleContextPacket` applies the effective packet-body ceiling (`harness_ceiling_chars - envelope_overhead_reserve_chars`) before returning a full inline packet, returning a `persisted_with_summary` inline response, dropping layers, or emitting `packet_incomplete_required_classes`.
4. Task-aware full-body delivery uses the same effective ceiling before retaining `full_body` values.
5. Same-seam docs and the two consumer skill prerequisite references now document the 60000/4000/56000 contract.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/harness-ceiling.test.js dist/tests/context-packet/erotica-world-fits.test.js`
3. `cd tools/world-mcp && npm test` — 257 tests passed.
4. `git diff --check`

Manual/grep checks:

1. `rg -n '80000' docs tools/world-mcp .claude/skills/character-generation .claude/skills/diegetic-artifact-generation tickets/WMCP-011.md` leaves only historical intake/planning references inside this completed ticket.
2. `rg -n 'harness_ceiling_chars - envelope_overhead_reserve_chars|envelope_overhead_reserve_chars|DEFAULT_HARNESS_CEILING_CHARS = 60000|ENVELOPE_OVERHEAD_RESERVE_CHARS = 4000' ...` confirms the new constants, response field, docs, skill prose, and tests are present.

Ignored package artifacts remain expected pre-existing/generated state: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

- The live package already had a `persisted_with_summary` recovery path, so this ticket applies the reserve to both full inline packets and the bounded summary response rather than treating all serialized-response pressure as layer-dropping only.
- `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` now proves the load-bearing invariant: the MCP response body is under the effective ceiling. It no longer asserts zero dropped layers, because the new lower default ceiling may truthfully force layer drops while still preventing the external harness rejection.
- The four skill files had pre-existing same-family edits before this run. WMCP-011-owned hunks only update the 80000 ceiling prose to the 60000/4000 reserve contract.
- `tickets/WMCP-014.md` appeared untracked during the run and is treated as externally appeared sibling scope, not WMCP-011-owned work.
