# SPEC-82 — Remaining Schema Drift Repairs

**Spec ID:** SPEC-82
**Date:** 2026-05-24
**Source brainstorm:** `reports/slt-chc-overhaul-second-iteration.md` triaged at `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`.
**Status:** active

## §1 Goal

Repair two drift artifacts surfaced by iteration-2 codebase verification that did not migrate into SPEC-79 (CHC field removal):

1. A validator helper branch referencing a non-existent STQ schema field (dead code blocking STQ active-pressure escalation).
2. A bootstrap skill-prose comment referencing SPEC-77's `compatible_turn_drivers` field as "future" — the field has been required since SPEC-77 landed. Accompanied by a verify-then-fix check on whether Phase 6 seed-block authoring actually populates the required field.

The Red Kiln Ambush fixture CHC repair from iteration-2 verification migrates to SPEC-79 §6.1 (the fixture must be schema-conformant under the post-removal CHC shape regardless; co-locating with the removal spec preserves a single point of fixture mutation).

This spec is small, independent of the other three iteration-2 specs, and shipped first in the implementation order because it carries the lowest risk.

## §2 Background

Iteration-2 verification (`docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md` §Verification ground truth) confirmed three concrete drift artifacts. The CHC fixture repair migrates to SPEC-79; the remaining two land here. Both are small, mechanical, and addable in a single landing.

## §3 Repairs

### §3.1 STQ active-pressure dead-branch repair

**File:** `tools/validators/src/structural/page-plan-active-pressure.ts`

**Current state (lines 101-103):**

```ts
if (recordClass === "STQ") {
  return stringValue(parsed.status) === "complicated" && stringValue(parsed.payoff_due) === "true";
}
```

**Problem:** `tools/validators/src/schemas/story-question.schema.json` defines STQ fields `id, story_id, created_at_page, supersedes, setup_kind, question_or_setup, salience, audience_visibility, source_event, source_records, payoff_of, status, answer_event, answer_records, abandonment_rationale` and sets `additionalProperties: false`. There is no `payoff_due` field; the branch's `stringValue(parsed.payoff_due) === "true"` test can never return true on a schema-valid STQ. STQ records can therefore never escalate to "active high-urgency pressure" in `active_pressure_handling_discipline` (importer at `active-pressure-handling-discipline.ts:15`) or `page_plan_turn_driver_consistency` (importer at `page-plan-turn-driver-consistency.ts:14`).

**Repair:** Replace the second clause with a check on the existing `salience` field. STQ's `salience` enum (`low | medium | high`, per `story-question.schema.json` line 28) is the natural analog of THR's `urgency === "high"` (lines 95-97 of the same helper) and OBL/CNSQ's `urgency === "high"` (lines 104-110). Proposed new line:

```ts
if (recordClass === "STQ") {
  return stringValue(parsed.status) === "complicated" && stringValue(parsed.salience) === "high";
}
```

This restores STQ as an escalatable active-pressure class with semantics parallel to the other debt classes.

**Acceptance:**

- Line 102 of `page-plan-active-pressure.ts` references only fields declared in `story-question.schema.json`.
- A new structural-validator integration test in `page-plan-active-pressure.test.ts` (or the file under the same name in the helper's test directory) asserts that an STQ with `status: "complicated"` and `salience: "high"` registers as active high-urgency pressure in both consuming validators; an STQ with `salience: "medium"` does not.
- Existing validator tests continue to pass without modification (no other call site reads `payoff_due`; verified via grep in §6.1 below).

### §3.2 Bootstrap stale-comment repair (with verify-then-fix on grounding population)

**File:** `.claude/skills/branching-story-bootstrap/SKILL.md`

**Current state (line 166):**

> Seeded SLTs may become eligible for non-player drivers when SPEC-77's `compatible_turn_drivers` field is available; this bootstrap skill does not populate that future field.

**Problem:** SPEC-77 landed (archived at `archive/specs/SPEC-77-slt-grounding-provenance-minimal.md`); `grounding.compatible_turn_drivers[]` is required and structurally enforced (`tools/validators/src/schemas/story-storylet.schema.json` lines 242-269; `additionalProperties: false`). The skill-prose comment is stale on its face. **Critically, the comment may hide an implementation gap**: if Phase 6 seed-block authoring does not in fact populate `grounding`, every bootstrap that seeds any SLT will fail `slt_grounding_minimal_integrity` and (transitively) the Phase 10 validation gate, blocking the HARD-GATE write.

**Repair (two parts):**

1. **Verify-then-fix on grounding population.** The implementor reads `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` in full. If Phase 6 already prescribes `grounding.compatible_turn_drivers[]` + `grounding.reason_to_exist` per seeded SLT (matching the minimal SPEC-77 shape), the implementation gap is documentation-only and Step 2 below suffices. If Phase 6 does NOT prescribe `grounding`, this spec extends to Phase 6: every seeded SLT must populate `grounding.compatible_turn_drivers[]` with the closed 8-value enum entries that match the block's predicate kinds and target driver kinds (`npc_action` for blocks gated by `any_plan_active` / `any_emotion_active`; `player_action` / `player_write_in` for blocks whose preconditions are player-context-only; etc.) plus a non-generic `grounding.reason_to_exist` (per SPEC-77's banned-phrase list).

2. **Replace the stale-future-tense comment with current-tense guidance.** Proposed replacement for line 166:

   > Seeded SLTs populate `grounding.compatible_turn_drivers[]` and `grounding.reason_to_exist` per SPEC-77 (see Phase 6 reference). The `compatible_turn_drivers[]` enum entries describe which `SE.turn_driver.kind` values the block is eligible for; pick the kinds the block's predicates structurally support.

The verify-then-fix branch is captured in the implementation commit message so the audit trail records which path fired.

**Acceptance:**

- After the repair, executing `branching-story-bootstrap` end-to-end on a non-empty seed configuration produces SLT records that pass `slt_grounding_minimal_integrity`.
- The stale "future field" language is removed from `.claude/skills/branching-story-bootstrap/SKILL.md`.
- If Phase 6 required substantive amendment (verify-then-fix Branch 2), the amendment names the rule (FOUNDATIONS §Story Bundles §5b) and cites SPEC-77 §3.4.

## §4 Out of Scope

- **Red Kiln Ambush fixture CHC repair**. Migrated to SPEC-79 §6.1. The fixture's CHC entries are repaired as part of the CHC field-removal spec because the fixture must be schema-conformant under the post-removal CHC shape regardless; co-locating with the removal spec preserves a single point of fixture mutation.
- **STQ schema additions (`payoff_due` as a real field)**. The dead-branch repair removes the reference; if a future spec genuinely needs a boolean "payoff is due" field on STQ, it can amend the schema explicitly. The active-pressure semantic the helper aims for is adequately expressed by `status: "complicated" + salience: "high"`.
- **Pool-coverage extension for seeded SLTs** (driver-kind, pressure-source). Lands in SPEC-80, not here.
- **Other registered validators referencing schema-drifting fields**. None were surfaced by iteration-2 verification beyond the STQ branch above. A negative-grep test in §6.1 confirms no other references.

## §5 FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5b (Schema-Minimalism) | aligns | No schema additions. §3.1 removes a dead-code reference to a phantom field; §3.2 brings bootstrap-seeded SLTs into conformance with the existing minimal SPEC-77 grounding schema and corrects skill-prose. Each repair restores the load-bearing discipline rather than expanding surface. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | aligns | §3.2's grounding-population requirement (`compatible_turn_drivers[]` + `reason_to_exist`) is exactly the SPEC-77 minimum that operationalizes §5a's "a good block says: when these conditions hold, this kind of action can happen" requirement. |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns | §3.1 restores STQ as an escalatable present-causal-state pressure (parallel to THR/OBL/CNSQ via `salience: high`), not as a narrative-shape artifact. No coverage scoring or aggregate-salience targeting is introduced. |
| Validation Rule 1 (No Floating Facts) | aligns | Both repairs strengthen schema-validator-skill coherence: §3.1 removes a dead reference to an undeclared field; §3.2 makes bootstrap-seeded SLTs declare grounding per SPEC-77. |
| Validation Rule 6 (No Silent Retcons) | aligns | This spec records its own scope in §3 and explicit out-of-scope handoffs in §4 with rationale citations. No silent reversal of prior decisions. |

## §6 Validation Tests

1. **§3.1 dead-branch removed**: grep for `payoff_due` across `tools/validators/src/` returns zero occurrences after the repair. A new unit test in the helper's test file covers the `salience: high` + `status: complicated` positive case and the `salience: medium` negative case.
2. **§3.2 bootstrap grounding-population**: running `branching-story-bootstrap` end-to-end with `seed_commitment_blocks: minimal` produces SLT records that pass `slt_grounding_minimal_integrity`. The stale-future-tense sentence is replaced with the current-tense guidance proposed in §3.2.
3. **§3.2 verify-branch audit-trail**: the implementation commit message names which verify-then-fix branch fired (documentation-only vs Phase 6 amendment), so the audit trail records the choice.
4. **No regression in registered validators**: the existing 140 TS validator files (per iteration-2 verification) load and register without error; `tools/validators/src/public/registry.ts` is unchanged.

## §7 Implementation Notes

- The two repairs are independent and small; ship together or separately as convenient.
- §3.2 may bifurcate at verify-time: documentation-only repair if Phase 6 already prescribes grounding; documentation + Phase 6 amendment if not. Either branch is in scope.
- This is the smallest spec in the iteration-2 family and is sequenced first in `IMPLEMENTATION-ORDER.md` for that reason — it carries near-zero risk and unblocks reviewer confidence in the larger SPEC-79 / SPEC-81 work.
