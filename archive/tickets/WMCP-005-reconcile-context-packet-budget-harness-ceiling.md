# WMCP-005: Reconcile `get_context_packet` token-budget enforcement with Claude Code MCP harness response-size ceiling

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` now enforces both token-budget and serialized-response character ceilings for context packets; `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and the character/diegetic-artifact skill prerequisites document the new ceiling and calibrated defaults.
**Deps**: None (independent of completed WMCP-004 task-aware full-body delivery)

## Problem

At intake, the contract claimed "strict" budget enforcement: under budget pressure, the assembler dropped layers in priority order until the response fit within `token_budget` (`docs/CONTEXT-PACKET-CONTRACT.md` §Budget Enforcement). In practice, the Claude Code MCP harness rejects responses whose serialized size exceeds an inline-response ceiling that is materially TIGHTER than the assembler's former notion of "fits", and redirects oversize responses to a persisted-output file with the error `result (N characters) exceeds maximum allowed tokens`. The two notions of "fits" diverged on two axes:

1. **Unit divergence**. `tools/world-mcp/src/context-packet/shared.ts:198 estimatePacketTokens` and the layered-drop loop in `assemble.ts:169 enforceBudget` count "tokens" via a chars-per-token approximation in `estimateTextTokens`. The harness counts tokens via the actual Anthropic tokenizer it enforces against. JSON-heavy responses with many keys and structural repetition can tokenize differently from the chars/4 approximation. The two estimators disagree on the same byte stream.
2. **Ceiling divergence**. Even with a perfect estimator, the harness's hard inline-response ceiling (observed at ~25K tokens / ~102K characters in the May 2026 character-generation session against `worlds/erotica-world`) was materially below the SKILL-prescribed default `token_budget=33000`. The assembler would allocate up to its requested budget; the harness rejected anything past its own ceiling regardless of what the assembler thought.

During the character-generation session that produced CHAR-0001 for `worlds/erotica-world`, the prescribed call `get_context_packet(task_type='character_generation', seed_nodes=['entity:donostia', 'entity:spain', 'entity:basque-country'], token_budget=33000)` against a moderately-sized world (10 invariants, 4 Mystery Reserve entries, 9 SEC records, ~12 named entities) emitted a 102,105-character response that the harness rejected inline and persisted to `~/.claude/.../tool-results/<file>.txt`. Recovery cost ~5 minutes of session time and a subagent-extraction round-trip; the persisted file's `truncation_summary` showed empty dropped layers (the assembler thought the packet fit at 33K tokens). The session's downstream work was not blocked — the SKILL's documented fallback (per `character-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback) covered the recovery — but the prescribed default loading pattern fails reliably for any production world past genesis size.

The `summary_only` and `node_classes` parameters introduced by prior MCP work (per `docs/CONTEXT-PACKET-CONTRACT.md` §Delivery Modes and §Class Filtering) would have prevented the overflow if the SKILL had used them. They didn't, because the SKILL prescribes default `delivery_mode: 'full'` (per the Default behavior clause). The fix is on the MCP side, not the SKILL side: either the assembler honors the harness ceiling, or the contract's defaults change, or both.

## Assumption Reassessment (2026-05-01)

1. Before this ticket, the assembler's budget enforcement was implemented in `tools/world-mcp/src/context-packet/assemble.ts` `enforceBudget` using `tools/world-mcp/src/context-packet/shared.ts` `estimateStablePacketSize`, which ultimately called `estimatePacketTokens` — a chars/4-style approximation. The Claude Code harness's inline-response ceiling is enforced in the harness itself, not in world-mcp; the error `result (102,105 characters) exceeds maximum allowed tokens` is emitted by the harness and is not greppable in `tools/world-mcp/src/`. The mismatch was a contract-vs-reality gap, not a bug in either implementation alone.
2. FOUNDATIONS principle under audit: §Tooling Recommendation ("LLM agents should never operate on prose alone... directly or via the documented context-packet + targeted-retrieval pattern... with completeness guarantees"). At intake, the completeness guarantee degraded under harness ceiling: a packet that "fit the budget" by world-mcp's count could still be rejected inline, forcing the consumer into the persisted-output fallback that required either subagent extraction (costly) or non-budget-aware recovery (fragile). The packet-plus-targeted-retrieval pattern survived, but the packet's first leg was unreliable at SKILL-prescribed defaults.
3. Cross-skill shared boundary: every skill that calls `get_context_packet` consumes this contract — `canon-addition`, `character-generation`, `diegetic-artifact-generation`, `continuity-audit`, `propose-new-canon-facts`, `propose-new-characters`, `canon-facts-from-diegetic-artifacts`, `propose-new-worlds-from-preferences`, `emergent-pressure-events`. Each skill's `references/world-state-prerequisites.md` (or equivalent) prescribes a default `token_budget`. Lowering the assembler's effective ceiling without lowering the SKILL-prescribed default would have broken those callers' assumptions; raising the harness ceiling is outside our control. The fix coordinated the assembler and the consumer skills.
4. FOUNDATIONS alignment: §Tooling Recommendation already permits "directly or via the documented context-packet + targeted-retrieval pattern". Reducing the default packet payload (via lower default `delivery_mode` or smaller default budget) and shifting body retrieval to targeted `get_record` calls is a valid expression of the contract — the packet still delivers an index-with-completeness-guarantees, the bodies are just retrieved on demand. No FOUNDATIONS amendment required; this ticket implements the existing contract more faithfully.
5. Existing same-seam behavior to preserve: the `truncation_summary` shape, the `packet_incomplete_required_classes` failure mode, the per-node `body_preview`/`summary`/`record`/`full_body` fields, and the `task_header.full_body_classes_delivered` audit field all remain. The change is in the budget UNIT and the default budget VALUE, not in the response shape.
6. Schema extension shape: additive — landed `task_header.harness_ceiling_chars` reporting the assembler's effective character ceiling, plus `task_header.estimator_version` (`"chars-per-token-v1"`) to let consumers detect which estimator produced `token_budget.allocated`. Existing consumers ignoring these new fields continue to work.
7. Adjacent contradictions: live package code already defaulted `character_generation` to `8000` via `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`, while the character-generation skill prescribed an explicit `token_budget=33000`. The package default stayed unchanged; the skill-prescribed explicit character-generation budget was lowered to `18000` after live `worlds/erotica-world` calibration showed the typical three-seed call fits without layer drops under the new `80000` character ceiling. The diegetic-artifact skill remains at `token_budget=10000` and now documents the character ceiling.
8. Mismatch + correction: the contract's "strict budget enforcement" claim now means both ceilings must pass: `estimateStablePacketSize(packet) <= token_budget` and `JSON.stringify(packet).length <= harness_ceiling_chars`. The assembler also reruns layer-drop enforcement after full-body downgrade metadata is added, because that metadata can itself push a tight packet over budget.

## Architecture Check

1. **Computing against character-budget is cleaner than maintaining two divergent estimators.** The harness rejects on character count; the assembler now drops layers until `JSON.stringify(packet).length <= harness_ceiling_chars`. This is observable, deterministic, and testable. The chars/4 approximation remains as a hint surface (`task_header.token_budget.allocated`) but the load-bearing ceiling includes the character count. The harness ceiling is configurable via env var (default `80000` chars) so future harness-limit changes do not require a code change — just an env update.
2. **Lowering the default `token_budget` for character_generation and diegetic_artifact_generation is cleaner than changing the default `delivery_mode`.** A budget change keeps the existing call shape: same parameter names, same per-task task-aware full-body delivery. Changing the default `delivery_mode` to `summary_only` would silently switch downstream consumers' code path; a budget change forces them to either explicitly opt into a higher budget (and accept fallback risk) or accept the safe default. The default `delivery_mode='full'` is preserved because it's correct for canon_addition's smaller per-call surface.
3. No backwards-compatibility aliasing/shims introduced. The `harness_ceiling_chars` field is additive on the response; the lowered defaults are documented; existing code that passes an explicit `token_budget` continues to honor the explicit value (the assembler will still drop layers as before, just against a more conservative effective ceiling).

## Verification Layers

1. Assembler honors the harness ceiling -> `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` (new) constructs a worst-case packet that would tokenize to within `token_budget` but serialize past the harness ceiling, and proves the assembler drops layers until `JSON.stringify(response).length <= effective_ceiling`.
2. Default `token_budget` for character_generation and diegetic_artifact_generation produces inline-deliverable responses for the live `worlds/erotica-world` -> `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` (new) calls `get_context_packet` at the new defaults with a typical 3-seed-node call and proves the response is <= harness_ceiling_chars.
3. Existing `truncation_summary` and `packet_incomplete_required_classes` semantics still hold -> existing `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` and other context-packet tests pass unchanged.
4. FOUNDATIONS alignment -> manual review of `docs/FOUNDATIONS.md` §Tooling Recommendation plus updated `docs/CONTEXT-PACKET-CONTRACT.md` §Budget Enforcement; the packet-plus-targeted-retrieval contract is preserved, just with more of the body content moving to targeted retrieval at default budget.
5. Cross-skill SKILL-default sync -> manual review that `character-generation/references/world-state-prerequisites.md` and `diegetic-artifact-generation/references/world-state-prerequisites.md` (and any other consumer skill with hard-coded `token_budget=NNNN`) document the lowered default.

## What to Change

### 1. Add character-budget enforcement in the assembler

Landed in `tools/world-mcp/src/context-packet/assemble.ts` and `shared.ts`: budget enforcement checks `JSON.stringify(packet).length` in addition to the token estimate. The character ceiling defaults to `80000` characters and is overridable via `WORLDLOOM_MCP_HARNESS_CEILING_CHARS` env var.

The landed drop loop is equivalent to:

```ts
function enforceBudget(packet: ContextPacket, requestedBudget: number, harnessCeilingChars: number): void {
  for (const layer of DROP_PRIORITY) {
    const tokenEstimate = estimateStablePacketSize(packet);
    const charEstimate = JSON.stringify(packet).length;
    if (tokenEstimate <= requestedBudget && charEstimate <= harnessCeilingChars) {
      return;
    }
    if (isLayerEmpty(packet, layer)) {
      continue;
    }
    const nodeIds = packet[layer].nodes.map((node) => node.id);
    clearLayer(packet, layer);
    recordDrop(packet, layer, nodeIds);
  }
}
```

Both the token estimate and character estimate must be satisfied for the loop to exit. If both `local_authority` and `governing_world_context` together exceed the harness ceiling alone, return `packet_incomplete_required_classes` per existing semantics (with `truncation_summary` populated for every droppable layer that was emptied).

### 2. Surface the harness ceiling in the response

Added `task_header.harness_ceiling_chars: number` to the response, recording the effective character ceiling used for this request. Added `task_header.estimator_version: string` with value `"chars-per-token-v1"` so future estimator changes (e.g., switching to a real tokenizer client-side) are observable to consumers without breaking the response contract.

### 3. Lower default `token_budget` in consumer SKILL prescriptions

Updated the SKILL-prescribed defaults in:

- `character-generation/references/world-state-prerequisites.md` §Primary load: context packet — changed `token_budget=33000` to `token_budget=18000`, calibrated against the new character ceiling and the live `worlds/erotica-world` three-seed proof.
- `diegetic-artifact-generation/references/world-state-prerequisites.md` §Primary load: context packet — kept `token_budget=10000`; the live `worlds/erotica-world` three-seed proof fits under the new character ceiling without dropped layers.
- Other consumer SKILL literals remain outside the active failing surface; the package/default docs already describe the default-budget table.

### 4. Update `docs/CONTEXT-PACKET-CONTRACT.md` §Budget Enforcement

Documented the dual-ceiling enforcement (`token_budget` + `harness_ceiling_chars`), the new `task_header.harness_ceiling_chars` and `estimator_version` fields, and the env-var override. Added a worked example showing a request that fits the token estimate but exceeds the character ceiling, and the resulting layer-drop sequence.

### 5. Update consumer SKILL fallback prose

The character-generation SKILL's `references/world-state-prerequisites.md` §Context-packet-too-large fallback previously described the persisted-output redirect as the common case for mature worlds. With this ticket's lowered defaults and character ceiling, the fallback is now framed as rare (still possible if seeds are unusually broad, an authority record is unusually large, or the server ceiling is lowered). Diegetic-artifact-generation now uses parallel wording.

## Files to Touch

- `tools/world-mcp/src/context-packet/assemble.ts` (modify) — add character-ceiling enforcement to `enforceBudget`
- `tools/world-mcp/src/context-packet/shared.ts` (modify) — add `estimateStablePacketChars` helper alongside the existing token estimator
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify) — enforce the character ceiling during high-value full-body allocation
- `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` (new) — proves the assembler honors the character ceiling
- `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` (new) — proves the new defaults fit inline against the live `worlds/erotica-world`
- `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` (modify) — keeps its token-budget-focused wide-packet assertions independent from the new default character ceiling
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify) — document dual-ceiling enforcement
- `docs/MACHINE-FACING-LAYER.md` (modify) — document response metadata and dual-ceiling semantics
- `tools/world-mcp/README.md` (modify) — document response metadata, env override, and error details
- `.claude/skills/character-generation/SKILL.md` (modify) — sync primary world-state prerequisite prose with the lowered default and character ceiling
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify) — lower default `token_budget`; reframe fallback as the rare case
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify) — sync primary world-state prerequisite prose with the character ceiling
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify) — verify default + reframe fallback parallel to character-generation

## Out of Scope

- Switching `estimateTextTokens` to a real tokenizer client-side (separate effort; current chars/4 approximation is good enough as a token-budget hint as long as the character ceiling is the load-bearing constraint).
- Raising the Claude Code harness's inline-response ceiling (outside our control).
- Changing the default `delivery_mode` (kept at `full` per Architecture Check #2).
- Adding a per-call client option to override `harness_ceiling_chars` (env-var-only is sufficient; per-call override invites consumers to opt out of safety).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/harness-ceiling.test.js` — proves the dual-ceiling enforcement works.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/erotica-world-fits.test.js` — proves the new defaults produce inline-deliverable responses for `worlds/erotica-world`.
3. `cd tools/world-mcp && npm test` — full test suite (existing context-packet tests + new tests + dispatcher tests + integration tests) passes unchanged.

### Invariants

1. After this ticket, every `get_context_packet` response satisfies `JSON.stringify(response).length <= harness_ceiling_chars` for the configured ceiling. Layer drops happen until this invariant holds (or `packet_incomplete_required_classes` is returned).
2. `truncation_summary.dropped_layers` and `truncation_summary.dropped_node_ids_by_layer` accurately reflect every layer dropped under either the token-budget or character-ceiling pressure (not just one of them).
3. `task_header.harness_ceiling_chars` is always present on a successful packet response and matches the env-configured ceiling at request time.
4. The default `token_budget` in every consumer SKILL prescription produces inline-deliverable responses for at least one production-shaped world (`worlds/erotica-world`) at the world's typical seed-node count.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` — fixture-based test proving a packet that token-fits but char-overflows triggers layer drops, `truncation_summary` reflects the char-driven drops, `task_header.harness_ceiling_chars` is populated, and env-var override is honored.
2. `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` — integration test against local `worlds/erotica-world` when present, proving the SKILL-prescribed character (`18000`) and diegetic-artifact (`10000`) budgets produce inline-deliverable responses with no dropped layers for a typical three-seed call.
3. `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` — modified to keep token-budget-focused wide-packet assertions truthful by overriding `WORLDLOOM_MCP_HARNESS_CEILING_CHARS` upward inside that test; the default character ceiling is covered by the new harness-ceiling and erotica-world tests.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/harness-ceiling.test.js dist/tests/context-packet/erotica-world-fits.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/tools/get-context-packet.test.js` — targeted verification of the new behavior and adjacent packet surfaces.
2. `cd tools/world-mcp && npm test` — full package suite. In Codex this required escalation because sandboxed child-process spawning returned `EPERM` for CLI subprocess tests; the escalated run passed.
3. Manual live probe replaced by mechanized `erotica-world-fits.test.ts`, which uses local `worlds/erotica-world/_index/world.db` when present and skips only when that gitignored world artifact is absent.

## Outcome

Completion date: 2026-05-01.

Implemented dual-ceiling context-packet enforcement:

- `tools/world-mcp/src/context-packet/shared.ts` now exposes `DEFAULT_HARNESS_CEILING_CHARS`, `CONTEXT_PACKET_ESTIMATOR_VERSION`, `estimatePacketChars`, `estimateStablePacketChars`, and `resolveHarnessCeilingChars`.
- `tools/world-mcp/src/context-packet/assemble.ts` includes `task_header.harness_ceiling_chars` and `task_header.estimator_version`, drops layers until both token and character ceilings fit, reports character-ceiling insufficiency details on `packet_incomplete_required_classes`, and reruns budget enforcement after full-body allocation/downgrade bookkeeping.
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` downgrades high-value full bodies when either ceiling would be exceeded.
- `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` document the dual ceiling and env override.
- `.claude/skills/character-generation/*` now prescribes `token_budget=18000` and treats persisted-output redirect as rare under the new cap; `.claude/skills/diegetic-artifact-generation/*` keeps `token_budget=10000` and documents the same ceiling/fallback semantics.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/harness-ceiling.test.js`
3. `cd tools/world-mcp && node --test dist/tests/context-packet/harness-ceiling.test.js dist/tests/context-packet/erotica-world-fits.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/tools/get-context-packet.test.js`
4. `cd tools/world-mcp && npm test` — passed only when rerun with sandbox escalation; the non-escalated run failed because CLI tests hit `spawnSync node EPERM`, not because of a code assertion.

Manual/grep checks:

1. Grep confirmed remaining `33000` references are historical intake text in this ticket or the worked example in `docs/CONTEXT-PACKET-CONTRACT.md`, not active consumer skill defaults.
2. Ignored package artifacts remain expected pre-existing/generated state: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

- No `tools/world-mcp/src/context-packet/types.ts` edit was needed; the live `ContextPacket` type lives in `shared.ts`.
- The package-level `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.character_generation` remains `8000`; the active failing surface was the character-generation skill's explicit `token_budget=33000` prescription, now lowered to `18000`.
- The new `erotica-world-fits.test.ts` is local-world aware because `worlds/` is gitignored user content; it proves the live checkout when `worlds/erotica-world/_index/world.db` exists and skips in checkouts without that local artifact.
