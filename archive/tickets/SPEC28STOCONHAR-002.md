# SPEC28STOCONHAR-002: Add SE.commitment block and make SLT cooldown_pages enforceable

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §4.3 (SE schema); `tools/validators/src/schemas/story-event.schema.json`; `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts`; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`; `branching-story-turn-cycle` skill (Phase 2 commitment write + cooldown enforcement); `branching-story-health-audit` skill (replay-sub-phase consumption); `specs/SPEC-28-story-contract-hardening.md` D2 implementation note.
**Deps**: None

## Problem

At intake, `SLT.saliency.cooldown_pages` was a dead field — `branching-story-turn-cycle` Phase 2 asserted it "permits use" with zero enforcement logic, and no `SE` or `PG` record captured which `SLT` fired on which page, so cooldown was unenforceable by any deterministic mechanism. This violated FOUNDATIONS §Story Bundles §5b (every story-bundle field must be load-bearing) and weakened the §6b observer-firewall post-hoc audit and health-audit replay ("why did this move fire?" was unanswerable). SPEC-28 D2 is now landed by making `SE.commitment` required, schema-backed, and consumed by turn-cycle and health-audit prose.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/_shared-templates/story-state-contract.md` §4.3: the `SE` schema has no `commitment` field, no `selected_slt_id`, no binding map — confirmed during SPEC-28's brainstorm verification. `SE` already carries `actor: STENT-<integer> | system | unknown` and `targets: [STENT|STLOC|STOBJ]`, so the SPEC-28 D2 design deliberately does NOT duplicate them — `commitment` adds only `selected_slt_id`, `selection_source`, `alias_bindings`. Verified against `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 2 (`saliency.cooldown_pages permits use`): the only `cooldown_pages` mention is the "permits use" assertion with no enforcement logic.
2. Verified against `.claude/skills/_shared-templates/story-state-contract.md` §4.4: `SLT.saliency.cooldown_pages` exists in the SLT schema and has no consumer. SPEC-28 D2 §Surfaces is the authoritative scope; Issue 1 (dispositioned `expand-scope-in-place` at decomposition) adds the `tools/validators/` seam below.
3. Cross-artifact shared boundary: the `SE` record schema, defined in `story-state-contract.md` §4.3 AND enforced by `tools/validators/src/schemas/story-event.schema.json` (`additionalProperties: false` at top-level + nested, verified at decomposition). SCAUD-003 kept the contract and the JSON schema in lockstep; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` covers `story-event` and will fail if they diverge. `tools/world-index` registers `SE` as a generic id-keyed atomic record (`tools/world-index/src/parse/atomic.ts:72`, `^SE-[0-9]+$` pattern) with no field-level parsing — no world-index change needed. `branching-story-turn-cycle` produces `SE`; `branching-story-health-audit` consumes it via replay.
4. FOUNDATIONS principle motivating this ticket — Rule 1 (No Floating Facts) and §Story Bundles §5b (Schema-Minimalism — every field "directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline"): D2 resolves `SLT.saliency.cooldown_pages` from a consumer-less floating field into a grounded one (turn-cycle Phase 2 scans prior `SE.commitment.selected_slt_id` along `PG.branch_path` against `cooldown_pages`). The new `commitment` fields are themselves load-bearing — cooldown enforcement (turn-cycle Phase 2), health-audit replay ("why did this move fire?"), and §6b observer-firewall post-hoc audit of the bound actor. The design trims the source report's proposed `actor_binding` / `target_bindings` because `SE.actor` / `SE.targets` already exist (minimalism applied to the fix).
5. HARD-GATE / canon-write ordering: `branching-story-turn-cycle` writes story-bundle records via the patch engine; `commitment` is written on the emitted `SE` during Phase 2. The change does not weaken the Mystery Reserve firewall — `commitment` is causal-move provenance (`selected_slt_id`, `selection_source`, `alias_bindings`), with no mystery-resolution semantics; gate 3 (mystery / invariant firewall) is untouched. The turn-cycle Phase 9 turn-cycle-additional check count is unaffected (cooldown enforcement happens during Phase 2 selection, not as a new Phase 9 validation check).
6. Schema extension: D2 extends the `SE` output schema. Consumers: `tools/validators/src/schemas/story-event.schema.json` (`record-schema-compliance` validator), `contract-schema-roundtrip.test.ts`, `record-schema-compliance-story-event.test.ts`, `branching-story-health-audit` (replay sub-phases). The extension adds a `commitment` block present on every `SE` (`selection_source: none` + `selected_slt_id: null` for `event_kind ∈ {story_start, prose_attach, promotion_closeout}`). Because there are zero production story bundles (SPEC-24 removed the red-bunny test bundle), this is a greenfield schema change with no record migration — only validator-test fixtures need the new block.
7. Adjacent contradiction surfaced at reassessment: `tools/validators/src/schemas/story-event.schema.json` is `additionalProperties: false` at every level — adding `commitment` to the contract WITHOUT the JSON schema would make valid `SE` records carrying `commitment` fail `record-schema-compliance`. Classified as a required consequence of this ticket (the Issue 1 `expand-scope-in-place` disposition), not a separate bug.
8. Verification command correction: the drafted `npm --prefix tools/validators test` shape is not a truthful package proof because the CLI tests compute `dist/src/cli/world-validate.js` from `process.cwd()`. When launched from the repo root, that command points CLI tests at `/home/joeloverbeck/projects/worldloom/dist/...` and fails with `MODULE_NOT_FOUND` / `ENOENT`. The accepted package proof is `npm test` from `tools/validators`, which runs the same build and compiled test lane from the package root.

## Architecture Check

1. Recording `selected_slt_id` + `selection_source` + `alias_bindings` on `SE` (rather than dropping `cooldown_pages` as the alternative §5b-compliant fix) is cleaner because the same structural addition serves three consumers at once — deterministic cooldown enforcement, health-audit "why did this move fire?" replay, and §6b observer-firewall post-hoc audit of the bound actor. Dropping `cooldown_pages` would resolve the §5b violation but lose the cooldown capability and leave the firewall un-auditable. Reusing `SE.actor` / `SE.targets` instead of the source report's proposed `actor_binding` / `target_bindings` keeps the addition minimal.
2. No backwards-compatibility shims or alias paths — `commitment` is added in place; the JSON schema and validator-test fixtures are updated to match, not aliased. There are zero production `SE` records, so no migration shim is meaningful.

## Verification Layers

1. Contract carries the block -> codebase grep-proof: `grep -nE "commitment:|selected_slt_id|selection_source|alias_bindings" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.3 with the rule that `selection_source: none` iff `event_kind ∈ {story_start, prose_attach, promotion_closeout}`.
2. JSON schema matches the contract -> schema validation: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` passes for `story-event`; `tools/validators/src/schemas/story-event.schema.json` defines `commitment` with the `selection_source` enum (`emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none`).
3. Record-schema compliance -> schema validation: `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` constructs an `SE` carrying `commitment` and passes; an `SE` missing `commitment` fails (the block is required).
4. Cooldown is enforceable -> manual review of turn-cycle Phase 2 prose + health-audit replay prose: `branching-story-turn-cycle/SKILL.md` Phase 2 describes scanning prior `SE.commitment.selected_slt_id` along `PG.branch_path` against `SLT.saliency.cooldown_pages`; `branching-story-health-audit/SKILL.md` references `SE.commitment` in its replay sub-phases.

## Landed Changes

### 1. Added the `commitment` block to the SE schema (`story-state-contract.md` §4.3)

Added a `commitment:` block to the `SE` schema:

```
commitment:
  selected_slt_id: SLT-<integer> | null   # null iff selection_source is none
  selection_source: emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none
  alias_bindings:
    <alias>: <record_id>
```

Documented the rules: `selection_source: none` (and therefore `selected_slt_id: null`) exactly for `event_kind ∈ {story_start, prose_attach, promotion_closeout}`; every `bound:<alias>` referenced by the selected block's preconditions/effects must appear in `alias_bindings`. The contract states explicitly that `commitment` does NOT duplicate `SE.actor` / `SE.targets` — those existing fields carry actor and target binding.

### 2. Added `commitment` to the SE JSON schema (per Issue 1 — expand-scope-in-place)

In `tools/validators/src/schemas/story-event.schema.json`, added the `commitment` object to `properties` with the `selection_source` enum and the nested `alias_bindings` map; marked `commitment` as `required` (it is present on every `SE`). Preserved `additionalProperties: false` at every level. The JSON schema now matches the §4.3 contract block produced in §1 above.

### 3. Updated validator test fixtures

In `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts`, updated SE fixtures to carry the `commitment` block (with `selection_source: none` for story-start/prose-attach/promotion-closeout fixtures, real `SLT-<integer>` references for selected-choice/write-in/repair fixtures). Added negative tests asserting an `SE` missing `commitment` fails validation and `selection_source: none` cannot carry a selected `SLT`. In `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`, updated the `story-event` expectation and representative record so the roundtrip between §4.3 and `story-event.schema.json` succeeds against the amended shape.

### 4. Wired cooldown enforcement and commitment write in turn-cycle

In `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 2: (a) writes `commitment` on the emitted `SE` — records the selected `SLT`, its `selection_source`, and the resolved `alias_bindings` map; (b) replaced the placeholder "saliency.cooldown_pages permits use" assertion with the actual cooldown check — scan prior `SE.commitment.selected_slt_id` along `PG.branch_path` and reject an `SLT` whose last firing is within `SLT.saliency.cooldown_pages` of the current page.

### 5. Consumed `commitment` in health-audit replay

In `.claude/skills/branching-story-health-audit/SKILL.md`, referenced `SE.commitment` in the replay sub-phases so the audit can deterministically answer "why did this move fire?" (read `selected_slt_id` + `selection_source`) and verify the bound actor (`SE.actor`) and aliases (`alias_bindings`) against the §6b observer-firewall audit in Phase 2d.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-28-story-contract-hardening.md` (modify — D2 implementation note)

## Out of Scope

- `BEL.basis` access routes — SPEC28STOCONHAR-003 (SPEC-28 D3).
- The turn-cycle / health-audit count and citation fixes — SPEC28STOCONHAR-004 (SPEC-28 D4).
- `tools/world-index` changes — verified not needed (`SE` is registered as a generic id-keyed atomic record at `atomic.ts:72` with no field-level parsing).
- Any `actor_binding` / `target_bindings` fields on `commitment` — the design deliberately reuses `SE.actor` / `SE.targets` (§5b minimalism).
- Migration of existing `SE` records — zero production bundles exist; SPEC-24 removed the red-bunny test bundle.

## Acceptance Criteria

### Tests That Must Pass

1. From `tools/validators`: `npm test` — the validators test lane passes, including `contract-schema-roundtrip.test.ts` (story-event roundtrip) and `record-schema-compliance-story-event.test.ts` (commitment-required fixture).
2. `grep -nE "commitment:|selected_slt_id|selection_source|alias_bindings" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.3 with the rule that `selection_source: none` iff `event_kind ∈ {story_start, prose_attach, promotion_closeout}`.
3. `grep -n "permits use" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no hits (the placeholder is replaced by the cooldown scan).

### Invariants

1. `commitment` is present on every `SE` record; `selected_slt_id: null` iff `selection_source: none`; every `bound:<alias>` referenced by the selected block's preconditions/effects appears in `alias_bindings`.
2. `commitment` does not duplicate `SE.actor` / `SE.targets` (FOUNDATIONS §Story Bundles §5b schema-minimalism).
3. `story-state-contract.md` §4.3 and `tools/validators/src/schemas/story-event.schema.json` define the same `SE` shape — `contract-schema-roundtrip.test.ts` enforces this.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — modified: SE fixtures carry the `commitment` block; an `SE` missing `commitment` is asserted to fail validation.
2. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — modified: the `story-event` expectation matches the amended §4.3.

### Commands

1. From `tools/validators`: `npm test`
2. `grep -nE "commitment|selected_slt_id|cooldown_pages" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
3. The validators test lane plus the two grep-proofs is the correct verification boundary — D2 has no skill-dry-run surface because zero production bundles exist (SPEC-28 §Verification: "verification is contract-and-prose conformance plus the `tools/validators` test lane, not bundle replay").

## Outcome

Implemented `SE.commitment` end to end for the D2 contract. The shared story-state contract and JSON schema now require `commitment` on every `SE`; the schema enforces `selection_source: none` / `selected_slt_id: null` for `story_start`, `prose_attach`, and `promotion_closeout`, and non-none selected-`SLT` provenance for turn-cycle/repair events. Turn-cycle Phase 2 now enforces `SLT.saliency.cooldown_pages` by scanning prior `SE.commitment.selected_slt_id` values along `PG.branch_path`, and Phase 6 writes the selected `SLT`, `selection_source`, and alias binding map. Health-audit replay now reads `SE.commitment` before applying deltas and uses it for §6b observer-firewall audit of selected `SLT` actor bindings.

Updated SPEC-28 D2 with a dated implementation note so the spec's current-state prose no longer implies this ticket is still pending.

## Verification Result

1. PASS — from `tools/validators`: `npm test` (220 tests passed).
2. PASS — `grep -nE "commitment:|selected_slt_id|selection_source|alias_bindings" .claude/skills/_shared-templates/story-state-contract.md` returns the §4.3 commitment block and rules.
3. PASS — `grep -n "permits use" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no hits; the old cooldown placeholder is gone.
4. PASS — `grep -nE "commitment|selected_slt_id|cooldown_pages" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` shows the turn-cycle cooldown scan, emitted `SE.commitment` block, and health-audit replay/observer-firewall consumption.

## Deviations

- The drafted root command `npm --prefix tools/validators test` was corrected to the package-root command `npm test` from `tools/validators`. The root command failed because the compiled CLI tests derive `dist/src/cli/world-validate.js` from `process.cwd()`, making the root invocation look for `/home/joeloverbeck/projects/worldloom/dist/...` instead of the package `dist/`.
- First package proof attempt exposed an Ajv strict-mode schema compile issue for nested conditional `commitment` constraints; fixed by adding explicit `type: "object"` in the conditional schema branches before the accepted proof.
