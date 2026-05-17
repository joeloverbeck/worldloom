# MCPENH-055: Align story-skill packet-incomplete recovery wording with conditional retry advice

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None - skill and shared-template documentation only.
**Deps**: `archive/tickets/MCPENH-054.md`

## Problem

`MCPENH-054` changed the `packet_incomplete_required_classes` contract so `retry_with.token_budget` is emitted only when the token budget is the binding constraint. Harness-ceiling-binding responses omit `retry_with` and expose top-level `fallback_advice` for targeted retrieval.

At intake, some downstream story-skill recovery prose still taught unconditional or stale retry behavior. `.claude/skills/_shared-templates/persisted-packet-recovery.md` said a harness-ceiling-binding error could carry `retry_with: { token_budget: <minimum_required_budget> }`, which was stale against `docs/CONTEXT-PACKET-CONTRACT.md` and `tools/world-mcp/README.md`. Other story-generation prerequisites also said to retry at `response.details.retry_with.token_budget` without first checking whether `retry_with` exists.

## Assumption Reassessment (2026-05-17)

1. `archive/tickets/MCPENH-054.md` completed the producer contract change: incomplete-packet errors omit `retry_with` when `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars`, and always include top-level `fallback_advice`.
2. The same-seam docs now state the conditional retry contract in `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md`.
3. The shared boundary under audit is the handoff from MCP error details to skill-consumer recovery procedure. Skill prose must not imply that `retry_with` is present or actionable when the harness ceiling is binding.
4. Current grep evidence found stale or potentially stale retry wording in `.claude/skills/_shared-templates/persisted-packet-recovery.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/character-generation/SKILL.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/SKILL.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md`.
5. The parent character and diegetic-artifact `SKILL.md` files restate their reference fallback step ordering and therefore are same-seam consumer surfaces, not separate broad skill rewrites. Other story skills that only point to `.claude/skills/_shared-templates/persisted-packet-recovery.md` can rely on the corrected shared template.
6. This is downstream consumer documentation, not unfinished owned work inside `MCPENH-054`. The producer response shape and same-seam machine-facing docs are complete; this ticket updates skills that consume that response.

## Architecture Check

1. Updating the shared recovery wording and direct skill callouts keeps retry semantics in one consistent consumer contract instead of requiring each operator to infer conditional behavior from lower-level MCP docs.
2. No backwards-compatibility aliases or shims are introduced; this is documentation-only alignment with the current MCP response shape.

## Verification Layers

1. Conditional retry wording: grep-proof that no edited skill path says to use `response.details.retry_with.token_budget` without checking that `retry_with` exists and is budget-binding.
2. Harness-ceiling fallback wording: manual review against `docs/CONTEXT-PACKET-CONTRACT.md` to confirm skill prose sends operators to `fallback_advice` / targeted retrieval when the harness ceiling is binding.
3. Story-skill cross-reference integrity: grep-proof that story skills referencing `.claude/skills/_shared-templates/persisted-packet-recovery.md` either rely on the corrected shared template or carry matching local wording.

## Landed Changes

### 1. Correct the shared recovery template

Updated `.claude/skills/_shared-templates/persisted-packet-recovery.md` so `packet_incomplete_required_classes` recovery says:

- inspect `retry_with` presence before retrying;
- retry only when `retry_with.token_budget` is present, which means the token budget is the binding constraint under the current harness ceiling;
- when `retry_with` is absent and the harness ceiling is binding, follow top-level `fallback_advice` with targeted `get_record`, `get_records`, `get_record_field`, or class-scoped `list_records` calls.

### 2. Align direct consumer-skill wording

Updated direct skill or reference prose that still said to retry at `response.details.retry_with.token_budget` unconditionally. The aligned surfaces are:

- `.claude/skills/branching-story-turn-cycle/SKILL.md`
- `.claude/skills/character-generation/SKILL.md`
- `.claude/skills/character-generation/references/world-state-prerequisites.md`
- `.claude/skills/diegetic-artifact-generation/SKILL.md`
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md`

No unrelated story-state or truth-relation changes were mixed into this ticket.

## Files to Touch

- `.claude/skills/_shared-templates/persisted-packet-recovery.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify if still carrying local packet-incomplete wording)
- `.claude/skills/character-generation/SKILL.md` (modify)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify)
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify)
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
2. `git diff --check -- .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/world-state-prerequisites.md .claude/skills/diegetic-artifact-generation/SKILL.md .claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md .claude/skills/canon-addition/references/retrieval-tool-tree.md` passes.
3. Manual review confirms no edited skill tells an operator to blindly retry `packet_incomplete_required_classes` at `response.details.retry_with.token_budget`.

### Invariants

1. Skill-consumer recovery prose treats `retry_with` as conditional and actionable only when present.
2. Harness-ceiling-binding incomplete-packet errors route operators to targeted retrieval via `fallback_advice`, not to larger token budgets.

## Test Plan

### New/Modified Tests

1. None - skill documentation-only ticket; verification is grep-proof plus manual review against the MCP contract.

### Commands

1. `rg -n "retry_with|packet_incomplete_required_classes|fallback_advice" .claude/skills docs/CONTEXT-PACKET-CONTRACT.md tools/world-mcp/README.md`
2. `git diff --check -- .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/world-state-prerequisites.md .claude/skills/diegetic-artifact-generation/SKILL.md .claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md .claude/skills/canon-addition/references/retrieval-tool-tree.md`

## Outcome

Completed: 2026-05-17.

The skill-facing recovery contract now matches the MCP response shape: `retry_with.token_budget` is treated as conditional and actionable only when present, while harness-ceiling-binding `packet_incomplete_required_classes` errors route operators through `fallback_advice` and targeted retrieval. The shared template, direct story-turn-cycle callout, character-generation fallback prose, diegetic-artifact fallback prose, and canon-addition retrieval decision tree all carry the same conditional retry discipline.

## Verification Result

1. `rg -n "retry_with|packet_incomplete_required_classes|fallback_advice" .claude/skills docs/CONTEXT-PACKET-CONTRACT.md tools/world-mcp/README.md` — reviewed hits; edited skill surfaces now describe conditional `retry_with` checks and `fallback_advice` recovery, while remaining repo docs already state the same MCP contract.
2. Shell-safe stale-anchor grep for unconditional retry phrases — no matches, proving the stale unconditional retry phrases were removed from active skill prose:

```bash
rg -n 'retry at `response\.details\.retry_with\.token_budget`|retry once with `retry_with\.token_budget`|honor `response\.details\.retry_with\.token_budget`|blindly retry' .claude/skills
```

3. Shell-safe stale-anchor grep for the old shared-template claim — no matches, proving the stale claim about harness-ceiling errors carrying `retry_with` was removed:

```bash
rg -n 'when the error.s `retry_with|error.s `retry_with: \{ token_budget' .claude/skills
```

4. Manual review against `docs/CONTEXT-PACKET-CONTRACT.md` confirmed edited skill prose follows the documented contract: retry only when `retry_with` exists; otherwise use `fallback_advice` and targeted retrieval.
5. `git diff --check -- .claude/skills/_shared-templates/persisted-packet-recovery.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/world-state-prerequisites.md .claude/skills/diegetic-artifact-generation/SKILL.md .claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md .claude/skills/canon-addition/references/retrieval-tool-tree.md archive/tickets/MCPENH-055.md` — passed after archival.

## Deviations

- Reassessment absorbed `.claude/skills/character-generation/SKILL.md` and `.claude/skills/diegetic-artifact-generation/SKILL.md` because they restated the same stale fallback procedure as their reference files.
- The initial stale-anchor grep was rerun with shell-safe single-quoted patterns after a double-quoted backtick pattern failed in the shell; the failed shell shape was not accepted as proof.
