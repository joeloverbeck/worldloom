# PEENH-011: Canon-addition envelope-shape reference must document world-canon create-op canonical ID field validation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation/reference update only in `.claude/skills/canon-addition/references/engine-envelope-shape.md`
**Deps**: `archive/tickets/PEENH-010-envelope-shape-per-op-payload-validation.md`

## Problem

PEENH-010 tightened `validate_patch_plan` / `submit_patch_plan` envelope-shape validation so malformed world-canon `create_*_record` payloads are rejected before downstream validators run. The public docs now name the behavior, but the canon-addition operator reference still only describes generic missing/malformed payloads and mentions the `create_ch_record` `change_id` asymmetry indirectly through path construction.

That leaves the most likely operator mistake underdocumented: using `payload.ch_record.id` instead of `payload.ch_record.change_id`. The runtime now reports this as a single early `invalid_input` error with `validators_run: []`; canon-addition's reference should teach that exact failure mode and recovery.

## Assumption Reassessment (2026-05-16)

1. PEENH-010 landed the runtime contract in `tools/world-mcp/src/tools/_shared.ts` using the patch-engine canonical-field map from `tools/patch-engine/src/envelope/schema.ts`, with tests in `tools/world-mcp/tests/tools/_shared.envelope-shape.test.ts` and `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`.
2. `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` now document the early world-canon create-op canonical ID field check and the `create_ch_record` `change_id` asymmetry.
3. The shared boundary under audit is the prose contract consumed by the `canon-addition` skill during patch-plan assembly/debugging, specifically `.claude/skills/canon-addition/references/engine-envelope-shape.md` §2 and §6.
4. FOUNDATIONS Rule 6 (No Silent Retcons) motivates the change: operators must see malformed canon-write payloads as root-cause envelope-shape errors, not downstream orphan-reference noise.
5. This ticket touches a hard-gate validation reference only; it does not weaken approval tokens, submit ordering, the Mystery Reserve firewall, or any canon-write enforcement.
6. Adjacent contradiction classified as future cleanup for this ticket: `.claude/skills/canon-addition/references/engine-envelope-shape.md` should explicitly state that `create_ch_record` uses `payload.ch_record.change_id` while the other world-canon create ops use `payload.<record_kind>.id`, and its failure-mode table should name the resulting `invalid_input` / `validators_run: []` behavior.

## Architecture Check

1. Updating the consuming skill reference is cleaner than changing runtime behavior again: the engine and MCP contracts are already correct after PEENH-010, while the remaining gap is operator-facing prose.
2. No backwards-compatibility aliasing/shims introduced. The docs must not recommend accepting `payload.ch_record.id` as an alias.

## Verification Layers

1. Canon-addition reference names the canonical ID field per world-canon create-op family -> codebase grep-proof.
2. The common failure-mode table names the new early validation behavior and `validators_run: []` skip signal -> codebase grep-proof and manual review.
3. FOUNDATIONS Rule 6 remains strengthened because malformed canon-write payloads are diagnosed at the root cause -> FOUNDATIONS alignment check.

## What to Change

### 1. Canon-addition per-op payload prose

Update `.claude/skills/canon-addition/references/engine-envelope-shape.md` §2 to explicitly distinguish:

- `create_ch_record`: `payload.ch_record.change_id`
- the other world-canon create ops: `payload.<record_kind>.id`

Make clear that `payload.ch_record.id` is invalid and should be corrected to `payload.ch_record.change_id`, not aliased.

### 2. Failure-mode table

Update §6 "Pre-validation envelope-shape errors" to include the PEENH-010 behavior: missing/malformed canonical ID fields on world-canon create-op payloads fail before validators run, with an `invalid_input` field path such as `patch_plan.patches[N].payload.ch_record.change_id` and `validators_run: []`.

## Files to Touch

- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify)

## Out of Scope

- Runtime changes in `tools/world-mcp` or `tools/patch-engine`.
- Changing the canonical field map or accepting alias fields.
- Updating unrelated skill references unless implementation discovers the same exact PEENH-010 prose gap in a directly linked canon-addition surface.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "payload\\.ch_record\\.change_id|payload\\.ch_record\\.id|validators_run: \\[\\]|canonical ID field" .claude/skills/canon-addition/references/engine-envelope-shape.md`
2. `git diff --check -- .claude/skills/canon-addition/references/engine-envelope-shape.md tickets/PEENH-011-canon-addition-engine-envelope-shape-ch-field-guidance.md`
3. Manual review confirms the reference recommends `change_id` for CH records and does not introduce a backwards-compatibility alias.

### Invariants

1. The canon-addition reference must not imply `create_ch_record` accepts `payload.ch_record.id`.
2. The failure-mode prose must match PEENH-010's early envelope-shape rejection contract: no validators run after a shape rejection.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing PEENH-010 runtime coverage is named in Assumption Reassessment.

### Commands

1. `rg -n "payload\\.ch_record\\.change_id|payload\\.ch_record\\.id|validators_run: \\[\\]|canonical ID field" .claude/skills/canon-addition/references/engine-envelope-shape.md`
2. `git diff --check -- .claude/skills/canon-addition/references/engine-envelope-shape.md tickets/PEENH-011-canon-addition-engine-envelope-shape-ch-field-guidance.md`
3. Manual review of `.claude/skills/canon-addition/references/engine-envelope-shape.md` §2 and §6 is the correct verification boundary because this ticket changes operator prose only.
