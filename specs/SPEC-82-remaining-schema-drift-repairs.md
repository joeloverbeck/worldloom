# SPEC-82 — Remaining Schema Drift Repairs

**Spec ID:** SPEC-82
**Date:** 2026-05-24
**Source brainstorm:** `reports/slt-chc-overhaul-second-iteration.md` triaged at `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`.
**Status:** active

## §1 Goal

Repair two drift artifacts surfaced by iteration-2 codebase verification that did not migrate into SPEC-79 (CHC field removal):

1. A validator helper branch referencing a non-existent STQ schema field (dead code blocking STQ active-pressure escalation).
2. A bootstrap skill-prose comment referencing SPEC-77's `compatible_turn_drivers` field as "future" — the field has been required since SPEC-77 landed. Reassessment confirmed Phase 6 seed-block authoring does NOT prescribe SPEC-77's grounding fields, so this repair also extends Phase 6 with explicit grounding-population guidance.

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

**Repair (two parallel sites):**

**Site (i) — helper.** Replace the second clause with a check on the existing `salience` field. STQ's `salience` enum (`low | medium | high`, per `story-question.schema.json` line 28) is the natural analog of THR's `urgency === "high"` (lines 95-97 of the same helper) and OBL/CNSQ's `urgency === "high"` (lines 104-110). Proposed new line:

```ts
if (recordClass === "STQ") {
  return stringValue(parsed.status) === "complicated" && stringValue(parsed.salience) === "high";
}
```

This restores STQ as an escalatable active-pressure class with semantics parallel to the other debt classes.

**Site (ii) — existing test fixture (parallel update).** `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts:157-160` constructs an STQ-1 test fixture with `status: "complicated"` and `payoff_due: "true"` to exercise the helper's STQ branch; line 10's `HIGH_IDS` array expects STQ-1 in the active-high-urgency set; line 20 maps STQ-1 to a non-resolution disposition rationale. Without parallel update, the helper repair at site (i) would break this test (the fixture's `payoff_due: "true"` becomes inert; STQ-1 has no `salience` field; STQ-1 drops out of the active-high-urgency set; the test fails). Update line 159 from:

```ts
status: "complicated",
payoff_due: "true"
```

to:

```ts
status: "complicated",
salience: "high"
```

This preserves the test's intent (STQ-1 registers as active high-urgency pressure) under the new helper logic. The line-159 substitution is the entire test-fixture edit; line 10's `HIGH_IDS` and line 20's disposition map remain unchanged.

**Acceptance:**

- Line 102 of `page-plan-active-pressure.ts` references only fields declared in `story-question.schema.json`.
- `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts:159` reads `salience: "high"` instead of `payoff_due: "true"`, preserving the test's `HIGH_IDS` expectation of STQ-1 registering as active high-urgency pressure under the new helper logic. Existing test assertions pass without further modification.
- A new test case extending `tools/validators/tests/structural/active-pressure-handling-discipline.test.ts` (the natural consumer-test home — `page-plan-active-pressure.ts` is a shared helper, not a registered validator, so it has no dedicated test file) asserts the negative case: an STQ with `status: "complicated"` and `salience: "medium"` does NOT register as active high-urgency pressure. Pair with the implicit positive case already covered by site (ii)'s updated fixture.

### §3.2 Bootstrap stale-comment repair + Phase 6 grounding-population amendment

**File:** `.claude/skills/branching-story-bootstrap/SKILL.md`

**Current state (line 166):**

> Seeded SLTs may become eligible for non-player drivers when SPEC-77's `compatible_turn_drivers` field is available; this bootstrap skill does not populate that future field.

**Problem:** SPEC-77 landed (archived at `archive/specs/SPEC-77-slt-grounding-provenance-minimal.md`); `grounding.compatible_turn_drivers[]` is required and structurally enforced (`tools/validators/src/schemas/story-storylet.schema.json` lines 242-269; `additionalProperties: false`). The skill-prose comment is stale on its face. **Critically, the comment may hide an implementation gap**: if Phase 6 seed-block authoring does not in fact populate `grounding`, every bootstrap that seeds any SLT will fail `slt_grounding_minimal_integrity` and (transitively) the Phase 10 validation gate, blocking the HARD-GATE write.

**Repair (two parts — Phase 6 amendment scope determined by reassessment-time verification):**

A reassessment-time read of `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` (20 lines, entire file) confirms Phase 6 does NOT prescribe `grounding.compatible_turn_drivers[]` or `grounding.reason_to_exist` — the seed-block authoring guidance covers cast-role coverage, scope fields, and existential-predicate selection but skips the SPEC-77 grounding fields entirely. Branch 2 (Phase 6 amendment) is therefore the determined path; the verify-then-fix conditional is collapsed.

1. **Phase 6 amendment — populate grounding per seeded SLT.** Extend `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` with a new bullet (placement: after the "All seed blocks: `scope.visibility: global_author_pool`..." paragraph, before the "Use the existential predicates" paragraph): every seeded SLT must populate `grounding.compatible_turn_drivers[]` with the closed 8-value enum entries that match the block's predicate kinds and target driver kinds (`npc_action` for blocks gated by `any_plan_active` / `any_emotion_active`; `player_action` / `player_write_in` for blocks whose preconditions are player-context-only; etc.) plus a non-generic `grounding.reason_to_exist` (per SPEC-77's banned-phrase list). Name FOUNDATIONS §Story Bundles §5b and cite SPEC-77 §3.4 as the governing requirement.

2. **Replace the stale-future-tense comment with current-tense guidance.** Proposed replacement for line 166 of `branching-story-bootstrap/SKILL.md`:

   > Seeded SLTs populate `grounding.compatible_turn_drivers[]` and `grounding.reason_to_exist` per SPEC-77 (see Phase 6 reference). The `compatible_turn_drivers[]` enum entries describe which `SE.turn_driver.kind` values the block is eligible for; pick the kinds the block's predicates structurally support.

**Acceptance:**

- After the repair, executing `branching-story-bootstrap` end-to-end on a non-empty seed configuration produces SLT records that pass `slt_grounding_minimal_integrity`.
- The stale "future field" language is removed from `.claude/skills/branching-story-bootstrap/SKILL.md`.
- The Phase 6 amendment names FOUNDATIONS §Story Bundles §5b and cites SPEC-77 §3.4 as the rule basis.

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

1. **§3.1 dead-branch removed**: grep for `payoff_due` across `tools/validators/src/` AND `tools/validators/tests/` returns zero occurrences after the repair. The broadened grep scope catches both the helper site (`page-plan-active-pressure.ts:102`) and the test-fixture site (`active-pressure-handling-discipline.test.ts:159`) — both must be updated; a `tools/validators/src/`-only scope misses the test fixture and would let test breakage ship.
2. **§3.1 test-fixture parity**: after the line-159 substitution, `active-pressure-handling-discipline.test.ts`'s STQ-1 fixture has `status: "complicated"` and `salience: "high"`; line 10's `HIGH_IDS` array still includes STQ-1; the existing test assertion that STQ-1 is in the active-high-urgency set passes. A new negative-case test asserts an STQ with `salience: "medium"` does NOT register as active high-urgency pressure.
3. **§3.2 bootstrap grounding-population**: running `branching-story-bootstrap` end-to-end with `seed_commitment_blocks: minimal` produces SLT records that pass `slt_grounding_minimal_integrity`. The stale-future-tense sentence is replaced with the current-tense guidance proposed in §3.2; the Phase 6 reference at `branching-story-bootstrap/references/phase-6-commitment-blocks.md` carries the new bullet prescribing `grounding.compatible_turn_drivers[]` and `grounding.reason_to_exist` per seeded SLT.
4. **No regression in registered validators**: the validator framework's registered set (`tools/validators/src/public/registry.ts` imports 99 structural + 12 rule validators per iteration-2 verification) continues to load without error.

## §7 Implementation Notes

- The two repairs are independent and small; ship together or separately as convenient. §3.1 has two parallel sites (helper + test fixture) that MUST land in the same commit — the helper edit without the fixture update breaks the consumer test; the fixture update without the helper edit is a no-op that diverges fixture intent from helper behavior.
- §3.2's Phase 6 amendment scope was determined at reassessment time (see §3.2 preamble): Phase 6 does not currently prescribe SPEC-77's grounding fields, so the Phase 6 reference file IS extended as part of this spec — not just the SKILL.md stale comment.
- This is the smallest spec in the iteration-2 family and is sequenced first in `IMPLEMENTATION-ORDER.md` for that reason — it carries near-zero risk and unblocks reviewer confidence in the larger SPEC-79 / SPEC-81 work.
