# MCPENH-071: Disclose preview-only semantics in `allocate_next_id` / `allocate_many_ids` tool descriptions

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — modifies tool-registration description strings in `tools/world-mcp/src/server.ts` for `allocate_next_id` and `allocate_many_ids`; updates `tools/world-mcp/README.md` to document the preview-then-reserve flow; world-mcp-package rebuild required so MCP `describe_capabilities` surface shows the updated descriptions; no behavioral change in the tools or in the patch engine.
**Deps**: None

## Problem

The MCP allocation tools `mcp__worldloom__allocate_next_id` and `mcp__worldloom__allocate_many_ids` return **preview IDs**: they query the per-class allocation registry and compute the next-N IDs without reserving them. Actual reservation happens only when a patch plan that consumes those IDs (via the envelope's `expected_id_allocations` field) lands through `mcp__worldloom__submit_patch_plan`. This is a coherent, intentional design — the MCP allocate surface is read-only; the patch engine is the single authoritative writer — but the tool-description text exposes none of this.

Empirical hit during a `branching-story-turn-cycle` advance_initiative turn on `red-bunny` PG-5: the author called `allocate_many_ids` with 15 IDs (including `STINT-7`), realized one more `STINT` was needed mid-flow, called `allocate_next_id(STINT)` and received `STINT-7` again (same ID as the unconsumed prior call). Switched to `allocate_many_ids([STINT, STINT])` and received `[STINT-7, STINT-8]` correctly. The author inferred the preview semantics by observation, but the tool-description text reading "Allocate the next append-only id ..." implies allocation-with-side-effect, not read-only preview.

A future operator (especially an LLM-operator reading only the discoverable tool description via `describe_capabilities`) is at risk of:
- Calling `allocate_next_id` multiple times incrementally and receiving the same ID on every call.
- Misinterpreting the same-ID return as a tool error rather than the documented preview semantics.
- Failing to batch their allocation intent into a single `allocate_many_ids` call when batched intent is the canonical approach for multi-ID needs.

The fix is purely textual: extend the description strings to disclose the preview-then-reserve flow explicitly. No behavioral change. The patch-engine commit-via-`expected_id_allocations` flow is already documented at `docs/HARD-GATE-DISCIPLINE.md` and `docs/MACHINE-FACING-LAYER.md` — but the discoverable tool description doesn't link to those docs or summarize the semantics inline.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** Verified at HEAD: `tools/world-mcp/src/server.ts` `registerToolWithCapability("allocate_next_id", ...)` (around the allocate-tool registration block) carries the description string `"Allocate the next append-only id for a world-specific, story-bundle-scoped, sub-audit-scoped, or pipeline-scoped record class. Story-bundle-scoped classes return unpadded natural-integer IDs such as <CLASS>-1 for a fresh missing bundle under an existing world (per FOUNDATIONS-002). RSP requires story_slug and audit_id."` — no preview/reservation/idempotent-call disclosure. The companion `allocate_many_ids` description mentions "Allocate multiple append-only ids ... Each allocation entry uses the same id_class, story_slug, and audit_id rules as allocate_next_id; repeated entries for the same scope increment monotonically within the batch, ..." — the "within the batch" qualifier hints at the boundary but doesn't explain what happens across separate MCP calls.
2. **Specs/docs reassessment.** `tools/world-mcp/README.md` documents tool inventory but does not explicitly call out the preview-then-reserve flow for the allocate tools. `docs/HARD-GATE-DISCIPLINE.md` describes the patch-engine `expected_id_allocations` consumption mechanism; `docs/MACHINE-FACING-LAYER.md` describes the per-package boundary. Both are operator-side documentation surfaces, not discoverable from the tool surface. An LLM-operator reading only `describe_capabilities` output would see the tool name and description text — neither names the semantic. The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` does not document allocation semantics (it documents record-class schemas and predicate DSL); contracts and skills name `mcp__worldloom__allocate_next_id` as the allocation surface without elaborating call-semantics. Skill prose in `branching-story-turn-cycle/SKILL.md` (lines around the Pre-flight Check) does name `allocate_many_ids` as the batch-allocation variant, but the call-shape choice is operator discretion; the tool-description text is the load-bearing semantic surface for first-encounter operators.
3. **Cross-skill / cross-artifact boundary.** The shared boundary is the MCP tool-description text exposed via `mcp__worldloom__describe_capabilities` and the per-tool MCP registration string. Consumers: LLM operators reading the discoverable schema; future skill authors building on the allocation flow; the `describe_capabilities` test surface at `tools/world-mcp/tests/server/capability-parity.test.ts`. The fix only modifies description strings; no schema, behavior, or call-shape changes.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS §Tooling Recommendation requires the pipeline surface to be "explicit and truthful as well (for example: canonical entity declarations and scoped-reference blocks on authority-bearing records); raw file reads alone cannot enforce the contract" — by extension, tool descriptions must be explicit about semantics that influence operator call patterns. A description that says "Allocate" when the semantic is "preview the next-would-be ID" is technically truthful (the eventual allocation does proceed via the patch engine) but operationally misleading at the discoverable surface. Making the description explicit closes the gap structurally so an operator does not have to consult external docs to understand the call-shape implications. FOUNDATIONS §HARD-GATE-DISCIPLINE references in `docs/HARD-GATE-DISCIPLINE.md` already document the patch-engine reservation path; this ticket lifts the relevant summary into the tool-description text so it's discoverable inline.

## Architecture Check

1. **Pure description-string change.** The fix touches only the description strings emitted at tool registration. No behavioral change, no schema change, no test-fixture data change. The MCP transport layer, patch engine, and registry storage all remain as-is.
2. **No backwards-compatibility aliasing/shims introduced.** Existing operators using either tool continue to function identically. Existing tests that exercise tool-call behavior continue to pass without modification.
3. **Strengthened operator pedagogy.** After the edit, an LLM-operator reading `describe_capabilities` output sees the preview-then-reserve flow explicitly. Future skill authors building on the allocation flow can cite the description rather than embedding the semantic in skill prose.
4. **Consistency with sibling tools.** `mcp__worldloom__describe_envelope_schema` and `mcp__worldloom__get_context_packet` already include detailed operational-semantic descriptions (e.g., the `persisted_with_summary` flow, the `delivery_status` enum). Bringing the allocate tools up to the same descriptive standard preserves consistency across the tool surface.

## Verification Layers

1. **Codebase grep-proof** → `grep -E "preview|reservation|patch[ -]engine" tools/world-mcp/src/server.ts` returns hits in the `allocate_next_id` and `allocate_many_ids` registration blocks after the edit (currently returns no hits in those blocks).
2. **Docs alignment** → `tools/world-mcp/README.md` documents the preview-then-reserve flow inline (e.g., adds a one-paragraph note under the allocation-tools section).
3. **MCP capability output** → `describe_capabilities` includes the new description text after rebuild. The existing test `tools/world-mcp/tests/server/capability-parity.test.ts` continues to pass (it tests tool-name parity and structural shape, not description-text content).
4. **FOUNDATIONS alignment check** → §Tooling Recommendation pedagogical-validation discipline applied to MCP tool descriptions: discoverable surface accurately reflects call semantics.

## What to Change

### 1. `tools/world-mcp/src/server.ts` — `allocate_next_id` description

Update the description string to disclose preview-then-reserve semantics. Suggested form:

```
"Preview the next append-only id for a world-specific, story-bundle-scoped, sub-audit-scoped, or pipeline-scoped record class. The call is read-only: repeated invocations within the same session return the same id until a patch plan consuming that id lands via mcp__worldloom__submit_patch_plan with the id in envelope.expected_id_allocations. For multi-id needs, prefer mcp__worldloom__allocate_many_ids in a single call. Story-bundle-scoped classes return unpadded natural-integer IDs such as <CLASS>-1 for a fresh missing bundle under an existing world (per FOUNDATIONS-002). RSP requires story_slug and audit_id."
```

### 2. `tools/world-mcp/src/server.ts` — `allocate_many_ids` description

Update the description string to disclose preview semantics and cross-call invariance. Suggested form:

```
"allocate_many_ids: Preview multiple append-only ids for one world in a single ordered response. The call is read-only: ids increment monotonically within the batch, but across separate MCP calls (allocate_many_ids or allocate_next_id) the baseline does NOT advance until a patch plan consuming the ids lands via mcp__worldloom__submit_patch_plan with envelope.expected_id_allocations naming them. Each allocation entry uses the same id_class, story_slug, and audit_id rules as allocate_next_id; errors include successful_allocations for reconciliation."
```

### 3. `tools/world-mcp/README.md`

Add a one-paragraph note under the allocation-tools section (if absent, create the section under "Tool inventory" or "Allocation flow") explaining the preview-then-reserve semantic. Suggested location: near the existing description of patch-engine submission. Suggested text:

> **Allocation flow (preview-then-reserve).** `allocate_next_id` and `allocate_many_ids` are read-only MCP tools that return the next-would-be IDs computed from the per-class registry. Reservation happens only when a patch plan consuming those IDs lands through `submit_patch_plan` with the IDs named in `envelope.expected_id_allocations`. Operators batching their allocation intent should prefer `allocate_many_ids` over multiple `allocate_next_id` calls — the latter will return the same ID on repeated invocations because no commitment has occurred between calls.

### 4. Rebuild

`cd tools/world-mcp && npm run build` so `dist/` reflects the updated descriptions. The MCP `describe_capabilities` surface consumes the compiled `dist/` output.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify — two description-string blocks)
- `tools/world-mcp/README.md` (modify — add allocation-flow note)
- `tools/world-mcp/dist/**` (rebuild artifact)

## Out of Scope

- Changing the actual behavior of `allocate_next_id` or `allocate_many_ids` (e.g., introducing genuine reservation at MCP call time). Preview semantics remain by design — the MCP surface is read-only, the patch engine is the writer.
- Introducing a new MCP tool that would do reserve-style allocation (e.g., `reserve_ids`). The patch-engine `expected_id_allocations` flow is the canonical reservation mechanism; no parallel tool is warranted.
- Updating the `describe_envelope_schema` output to inline allocation-flow notes. The flow is described in tool descriptions and README; envelope schema is concerned with patch structure, not allocation semantics.
- Adding new tests that assert exact description-text content (would create high-friction maintenance cost; semantic correctness is verifiable by grep + manual review of `describe_capabilities` output).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` — TypeScript compile + dist refresh completes cleanly.
2. `cd tools/world-mcp && npm test` — full world-mcp test suite passes with no regressions. Existing `capability-parity.test.ts`, `dispatch.test.ts`, and integration tests are unaffected because they test tool-name parity, dispatch behavior, and integration flows, not the literal description-text content.
3. **Post-build smoke**: invoke `mcp__worldloom__describe_capabilities` (or read the equivalent CLI output) and confirm `allocate_next_id` / `allocate_many_ids` description strings include the words "preview" / "read-only" / "submit_patch_plan" / "expected_id_allocations" per the updated text.

### Invariants

1. **No behavioral change.** The tools' actual call semantics, return shapes, error codes, and registry-read behavior are unchanged. Only the description-string text changes.
2. **Discoverable semantic honesty.** An LLM-operator reading only the `describe_capabilities` output sees the preview-then-reserve flow explicitly — no inference from external docs required.
3. **Consistency.** `allocate_next_id` and `allocate_many_ids` descriptions both disclose the preview-then-reserve flow in compatible terms.

## Test Plan

### New/Modified Tests

1. None — documentation-text-only ticket; verification is command-based (grep + manual review of `describe_capabilities` output) and existing test coverage at `tools/world-mcp/tests/server/capability-parity.test.ts` plus integration tests already establishes that allocate-tool behavior is unchanged.

### Commands

1. **Build:** `cd tools/world-mcp && npm run build`
2. **Full suite:** `cd tools/world-mcp && npm test`
3. **Grep-verify:** `grep -E "preview|reservation|submit_patch_plan" tools/world-mcp/src/server.ts` — should return hits in the `allocate_next_id` and `allocate_many_ids` registration blocks.
4. **Discoverable-surface verify:** invoke `mcp__worldloom__describe_capabilities` (via MCP tool call from a Claude Code session) and visually confirm the description strings contain the new preview-then-reserve language.
