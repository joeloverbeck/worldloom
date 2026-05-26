# MCPENH-071: Disclose preview-only semantics in `allocate_next_id` / `allocate_many_ids` tool descriptions

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — modified tool-registration description strings in `tools/world-mcp/src/server.ts` for `allocate_next_id` and `allocate_many_ids`; updated `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` to document the preview-then-reserve flow; rebuilt `tools/world-mcp/dist/` so MCP `describe_capabilities` surface shows the updated descriptions; no behavioral change in the tools or in the patch engine.
**Deps**: None

## Problem

At intake, the MCP allocation tools `mcp__worldloom__allocate_next_id` and `mcp__worldloom__allocate_many_ids` returned **preview IDs**: they queried the per-class allocation registry and computed the next-N IDs without reserving them. Actual reservation happens only when a patch plan that consumes those IDs (via the envelope's `expected_id_allocations` field) lands through `mcp__worldloom__submit_patch_plan`. This is a coherent, intentional design — the MCP allocate surface is read-only; the patch engine is the single authoritative writer — but the tool-description text exposed none of this.

Empirical hit during a `branching-story-turn-cycle` advance_initiative turn on `red-bunny` PG-5: the author called `allocate_many_ids` with 15 IDs (including `STINT-7`), realized one more `STINT` was needed mid-flow, called `allocate_next_id(STINT)` and received `STINT-7` again (same ID as the unconsumed prior call). Switched to `allocate_many_ids([STINT, STINT])` and received `[STINT-7, STINT-8]` correctly. The author inferred the preview semantics by observation, but the tool-description text reading "Allocate the next append-only id ..." implies allocation-with-side-effect, not read-only preview.

Before this ticket, a future operator (especially an LLM-operator reading only the discoverable tool description via `describe_capabilities`) was at risk of:
- Calling `allocate_next_id` multiple times incrementally and receiving the same ID on every call.
- Misinterpreting the same-ID return as a tool error rather than the documented preview semantics.
- Failing to batch their allocation intent into a single `allocate_many_ids` call when batched intent is the canonical approach for multi-ID needs.

The landed fix is purely textual: the description strings and same-seam docs now disclose the preview-then-reserve flow explicitly. No behavior changed. The patch-engine commit-via-`expected_id_allocations` flow remains the reservation mechanism.

## Assumption Reassessment (2026-05-26)

1. **Current-run reassessment.** Verified immediately before implementation that `tools/world-mcp` had a green baseline (`npm test` from the package root: 479 tests, 0 failures). The active change remained text-only, but live same-seam docs inspection found `docs/MACHINE-FACING-LAYER.md` also described the allocation surface as "Allocate append-only IDs" without preview/reservation disclosure, so that repo-level machine-facing quick-reference row was owned by this ticket alongside the package README and registered descriptions. HARD-GATE read was not required for this run because the change did not alter validation criteria, approval-token behavior, `validate_patch_plan`, `submit_patch_plan`, pre-apply behavior, or any `<HARD-GATE>` block; it only describes the existing reservation path.
2. **Codebase reassessment.** Verified before implementation that `tools/world-mcp/src/server.ts` `registerToolWithCapability("allocate_next_id", ...)` carried the description string `"Allocate the next append-only id for a world-specific, story-bundle-scoped, sub-audit-scoped, or pipeline-scoped record class. Story-bundle-scoped classes return unpadded natural-integer IDs such as <CLASS>-1 for a fresh missing bundle under an existing world (per FOUNDATIONS-002). RSP requires story_slug and audit_id."` — no preview/reservation/idempotent-call disclosure. The companion `allocate_many_ids` description mentioned "Allocate multiple append-only ids ... Each allocation entry uses the same id_class, story_slug, and audit_id rules as allocate_next_id; repeated entries for the same scope increment monotonically within the batch, ..." — the "within the batch" qualifier hinted at the boundary but did not explain what happens across separate MCP calls.
3. **Specs/docs reassessment.** `tools/world-mcp/README.md` documented tool inventory but did not explicitly call out the preview-then-reserve flow for the allocate tools. `docs/HARD-GATE-DISCIPLINE.md` describes the patch-engine `expected_id_allocations` consumption mechanism; `docs/MACHINE-FACING-LAYER.md` described the per-package boundary and named the allocation tools in its "Which Layer To Reach For" table, but its row also omitted the preview/reservation disclosure and therefore belonged in the same-seam doc update. An LLM-operator reading only `describe_capabilities` output would have seen the tool name and description text — neither named the semantic. The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` does not document allocation semantics (it documents record-class schemas and predicate DSL); contracts and skills name `mcp__worldloom__allocate_next_id` as the allocation surface without elaborating call-semantics. Skill prose in `branching-story-turn-cycle/SKILL.md` names `allocate_many_ids` as the batch-allocation variant, but the call-shape choice is operator discretion; the tool-description text is the load-bearing semantic surface for first-encounter operators.
4. **Cross-skill / cross-artifact boundary.** The shared boundary is the MCP tool-description text exposed via `mcp__worldloom__describe_capabilities` and the per-tool MCP registration string. Consumers: LLM operators reading the discoverable schema; future skill authors building on the allocation flow; the `describe_capabilities` test surface at `tools/world-mcp/tests/server/capability-parity.test.ts`. The landed fix only modifies description strings and docs; no schema, behavior, or call-shape changed.
5. **FOUNDATIONS principle restatement.** FOUNDATIONS §Tooling Recommendation requires the pipeline surface to be "explicit and truthful as well (for example: canonical entity declarations and scoped-reference blocks on authority-bearing records); raw file reads alone cannot enforce the contract" — by extension, tool descriptions must be explicit about semantics that influence operator call patterns. A description that says "Allocate" when the semantic is "preview the next-would-be ID" was technically truthful (the eventual allocation does proceed via the patch engine) but operationally misleading at the discoverable surface. Making the description explicit closes the gap structurally so an operator does not have to consult external docs to understand the call-shape implications. FOUNDATIONS §HARD-GATE-DISCIPLINE references in `docs/HARD-GATE-DISCIPLINE.md` already document the patch-engine reservation path; this ticket lifted the relevant summary into the tool-description text and quick-reference docs so it is discoverable inline.

## Architecture Check

1. **Pure description-string and docs change.** The fix touches only the description strings emitted at tool registration and same-seam docs. No behavioral change, no schema change, no test-fixture data change. The MCP transport layer, patch engine, and registry storage all remain as-is.
2. **No backwards-compatibility aliasing/shims introduced.** Existing operators using either tool continue to function identically. Existing tests that exercise tool-call behavior continue to pass without modification.
3. **Strengthened operator pedagogy.** An LLM-operator reading `describe_capabilities` output now sees the preview-then-reserve flow explicitly. Future skill authors building on the allocation flow can cite the description rather than embedding the semantic in skill prose.
4. **Consistency with sibling tools.** `mcp__worldloom__describe_envelope_schema` and `mcp__worldloom__get_context_packet` already include detailed operational-semantic descriptions (e.g., the `persisted_with_summary` flow, the `delivery_status` enum). Bringing the allocate tools up to the same descriptive standard preserves consistency across the tool surface.

## Verification Layers

1. **Codebase grep-proof** -> `rg -n "Preview the next append-only id|Preview multiple append-only ids|read-only|expected_id_allocations" tools/world-mcp/src/server.ts tools/world-mcp/dist/src/server.js tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` returned hits in the source registration, rebuilt compiled server, package README, and machine-facing docs.
2. **Docs alignment** → `tools/world-mcp/README.md` documents the preview-then-reserve flow inline (e.g., adds a one-paragraph note under the allocation-tools section).
3. **MCP capability output** → `describe_capabilities` includes the new description text after rebuild. The existing test `tools/world-mcp/tests/server/capability-parity.test.ts` continues to pass (it tests tool-name parity and structural shape, not description-text content).
4. **FOUNDATIONS alignment check** → §Tooling Recommendation pedagogical-validation discipline applied to MCP tool descriptions: discoverable surface accurately reflects call semantics.

## Landed Changes

### 1. `tools/world-mcp/src/server.ts` — `allocate_next_id` description

Updated the registration description to disclose that the call previews the next ID, is read-only, can return the same ID on repeated separate calls, and commits only through `submit_patch_plan` with `envelope.expected_id_allocations`.

### 2. `tools/world-mcp/src/server.ts` — `allocate_many_ids` description

Updated the registration description to disclose that the batch call previews multiple IDs, increments repeated same-scope entries only within the batch, and does not advance the baseline across separate MCP calls until the patch plan lands.

### 3. `tools/world-mcp/README.md`

Updated the allocation tool rows and added a paragraph explaining that allocation calls are read-only previews and reservation happens only through `submit_patch_plan` with `envelope.expected_id_allocations`.

### 4. `docs/MACHINE-FACING-LAYER.md`

Updated the "Which Layer To Reach For" allocation row to name preview semantics, separate-call baseline invariance, and patch-plan reservation through `submit_patch_plan`.

### 5. Rebuild

Rebuilt `tools/world-mcp/dist/` so the compiled MCP server and `describe_capabilities` surface reflect the updated descriptions.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify — two description-string blocks)
- `tools/world-mcp/README.md` (modify — add allocation-flow note)
- `docs/MACHINE-FACING-LAYER.md` (modify — update allocation row with preview/reservation semantics)
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
3. **Post-build smoke**: invoke `mcp__worldloom__describe_capabilities` through an in-memory MCP client and confirm `allocate_next_id` / `allocate_many_ids` description strings include "Preview", "read-only", "submit_patch_plan", and "expected_id_allocations" per the updated text.

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
3. **Grep-verify:** `rg -n "Preview the next append-only id|Preview multiple append-only ids|read-only|expected_id_allocations" tools/world-mcp/src/server.ts tools/world-mcp/dist/src/server.js tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md`
4. **Discoverable-surface verify:** invoke `mcp__worldloom__describe_capabilities` through an in-memory MCP client and confirm the description strings contain the new preview-then-reserve language.

## Outcome

Completion date: 2026-05-26.

Completed. The registered `allocate_next_id` and `allocate_many_ids` descriptions now disclose preview-only/read-only semantics, same-baseline behavior across separate calls, and the `submit_patch_plan` / `envelope.expected_id_allocations` reservation path. `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` now carry the same preview-then-reserve explanation. No allocator behavior, return shape, schema, validation path, or patch-engine behavior changed.

## Verification Result

1. `npm test` from `tools/world-mcp` before implementation passed: 479 tests, 0 failures.
2. `npm run build` from `tools/world-mcp` passed and refreshed `dist/`.
3. `rg -n "Preview the next append-only id|Preview multiple append-only ids|read-only|expected_id_allocations" tools/world-mcp/src/server.ts tools/world-mcp/dist/src/server.js tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` returned hits in the source registration, rebuilt compiled server, package README, and machine-facing docs.
4. In-memory MCP smoke using `mcp__worldloom__describe_capabilities` passed and printed both updated allocation descriptions from `dist/src/server.js`.
5. Final `npm test` from `tools/world-mcp` passed: 479 tests, 0 failures.

## Deviations

- Reassessment added `docs/MACHINE-FACING-LAYER.md` to the owned file set because its allocation row was a same-seam current quick-reference surface with the same missing preview/reservation disclosure.
- Direct external Claude Code MCP invocation was not available in this Codex session, so the discoverable-surface proof used the package's in-memory MCP client/server boundary against the rebuilt `dist/` server. An initial smoke used the unqualified tool name and failed with "Tool describe_capabilities not found"; the corrected smoke used `mcp__worldloom__describe_capabilities` and passed.
