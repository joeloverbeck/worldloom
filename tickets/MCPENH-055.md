# MCPENH-055: Align story-skill packet-incomplete recovery wording with conditional retry advice

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None - skill and shared-template documentation only.
**Deps**: `archive/tickets/MCPENH-054.md`

## Problem

`MCPENH-054` changed the `packet_incomplete_required_classes` contract so `retry_with.token_budget` is emitted only when the token budget is the binding constraint. Harness-ceiling-binding responses omit `retry_with` and expose top-level `fallback_advice` for targeted retrieval.

Some downstream story-skill recovery prose still teaches unconditional or stale retry behavior. In the current worktree, `.claude/skills/_shared-templates/persisted-packet-recovery.md` has an in-flight section for `packet_incomplete_required_classes`, but it still says a harness-ceiling-binding error can carry `retry_with: { token_budget: <minimum_required_budget> }`. That is now stale against `docs/CONTEXT-PACKET-CONTRACT.md` and `tools/world-mcp/README.md`. Other story-generation prerequisites also still say to retry at `response.details.retry_with.token_budget` without first checking whether `retry_with` exists.

## Assumption Reassessment (2026-05-17)

1. `archive/tickets/MCPENH-054.md` completed the producer contract change: incomplete-packet errors omit `retry_with` when `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars`, and always include top-level `fallback_advice`.
2. The same-seam docs now state the conditional retry contract in `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md`.
3. The shared boundary under audit is the handoff from MCP error details to skill-consumer recovery procedure. Skill prose must not imply that `retry_with` is present or actionable when the harness ceiling is binding.
4. Current grep evidence found stale or potentially stale retry wording in `.claude/skills/_shared-templates/persisted-packet-recovery.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md`.
5. This is downstream consumer documentation, not unfinished owned work inside `MCPENH-054`. The producer response shape and same-seam machine-facing docs are complete; this ticket updates skills that consume that response.

## Architecture Check

1. Updating the shared recovery wording and direct skill callouts keeps retry semantics in one consistent consumer contract instead of requiring each operator to infer conditional behavior from lower-level MCP docs.
2. No backwards-compatibility aliases or shims are introduced; this is documentation-only alignment with the current MCP response shape.

## Verification Layers

1. Conditional retry wording: grep-proof that no edited skill path says to use `response.details.retry_with.token_budget` without checking that `retry_with` exists and is budget-binding.
2. Harness-ceiling fallback wording: manual review against `docs/CONTEXT-PACKET-CONTRACT.md` to confirm skill prose sends operators to `fallback_advice` / targeted retrieval when the harness ceiling is binding.
3. Story-skill cross-reference integrity: grep-proof that story skills referencing `.claude/skills/_shared-templates/persisted-packet-recovery.md` either rely on the corrected shared template or carry matching local wording.

## What to Change

### 1. Correct the shared recovery template

Update `.claude/skills/_shared-templates/persisted-packet-recovery.md` so `packet_incomplete_required_classes` recovery says:

- inspect `retry_with` presence before retrying;
- retry only when `retry_with.token_budget` is present, which means the token budget is the binding constraint under the current harness ceiling;
- when `retry_with` is absent and the harness ceiling is binding, follow top-level `fallback_advice` with targeted `get_record`, `get_records`, `get_record_field`, or class-scoped `list_records` calls.

### 2. Align direct consumer-skill wording

Update direct skill or reference prose that still says to retry at `response.details.retry_with.token_budget` unconditionally. At minimum, review and align:

- `.claude/skills/branching-story-turn-cycle/SKILL.md`
- `.claude/skills/character-generation/references/world-state-prerequisites.md`
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md`

Do not mix unrelated story-state or truth-relation changes into this ticket.

## Files to Touch

- `.claude/skills/_shared-templates/persisted-packet-recovery.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify if still carrying local packet-incomplete wording)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify)

## Out of Scope

- Changing the `tools/world-mcp` response shape.
- Changing context-packet budget, sizing, or persistence behavior.
- Broad story-skill refactors unrelated to `packet_incomplete_required_classes` recovery.
- The unrelated truth-relation propagation wording currently dirty in `.claude/skills/_shared-templates/story-state-contract.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "retry_with|packet_incomplete_required_classes|fallback_advice" .claude/skills docs/CONTEXT-PACKET-CONTRACT.md tools/world-mcp/README.md` shows consumer wording aligned with the conditional retry contract.
2. `git diff --check -- .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/character-generation/references/world-state-prerequisites.md .claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md .claude/skills/canon-addition/references/retrieval-tool-tree.md` passes.
3. Manual review confirms no edited skill tells an operator to blindly retry `packet_incomplete_required_classes` at `response.details.retry_with.token_budget`.

### Invariants

1. Skill-consumer recovery prose treats `retry_with` as conditional and actionable only when present.
2. Harness-ceiling-binding incomplete-packet errors route operators to targeted retrieval via `fallback_advice`, not to larger token budgets.

## Test Plan

### New/Modified Tests

1. None - skill documentation-only ticket; verification is grep-proof plus manual review against the MCP contract.

### Commands

1. `rg -n "retry_with|packet_incomplete_required_classes|fallback_advice" .claude/skills docs/CONTEXT-PACKET-CONTRACT.md tools/world-mcp/README.md`
2. `git diff --check -- .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/character-generation/references/world-state-prerequisites.md .claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md .claude/skills/canon-addition/references/retrieval-tool-tree.md`
