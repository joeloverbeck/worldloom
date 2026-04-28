# SPEC18GENFER-002: Phase 8 CF-0001 propagation breadth + Rule 11 leverage in `notes`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/create-base-world/SKILL.md` §Phase 8 prose
**Deps**: None

## Problem

At intake, `create-base-world/SKILL.md` Phase 8 required `domains_affected[]` to use canonical-domain values but set no minimum spread; `visible_consequences[]` was required but had no order-of-effects discipline; and Rule 11 (No Spectator Castes by Accident) was not applied at genesis. This produced three gaps relative to FOUNDATIONS.md and SPEC-09's per-CF discipline:

1. CF-0001 could commit to a single domain, leaving the world's primary-difference fact under-propagated.
2. Visible consequences could stop at first-order effects, missing the cascade through institutions / professions / taboos / language / mourning that FOUNDATIONS' "consequence engine" pattern requires.
3. Capability-bearing CF-0001 types (per `requiresExceptionGovernance(cf.type)` taxonomy) could emit no Rule 11 leverage block, causing the engine's mechanical `rule11_action_space` validator to reject the patch plan AFTER the user approves the Phase 10 deliverable summary — a HARD-GATE roundtrip.

## Assumption Reassessment (2026-04-28)

1. Pre-change Phase 8 prose at `.claude/skills/create-base-world/SKILL.md:105-109` confirmed — schema-population paragraph for CF-0001 listed `domains_affected[]`, `visible_consequences[]`, and SPEC-09 conditionally-mandatory blocks (`epistemic_profile`, `exception_governance`). The completed Phase 8 now has a new SPEC-18 Track A2 "Genesis propagation requirements" paragraph at `.claude/skills/create-base-world/SKILL.md:107`.
2. SPEC-18 §Approach Track A2 (lines 54-58) names the three requirements; §Deliverables A2 (lines 97-103) provides the canonical wording with the `notes:`-field landing surface for Rule 11 leverage.
3. Cross-skill boundary: the `rule11_action_space` validator at `tools/validators/src/rules/rule11-action-space.ts:80-104` is the consumer of this leverage convention. The validator parses `cf.notes` for lines containing `\bleverage\b`, splits on `[,;|]`, normalizes against the 12-form PERMISSIBLE enum at `tools/validators/src/rules/rule11-action-space.ts:8-21`. The `requiresExceptionGovernance` helper at `tools/validators/src/structural/record-schema-compliance.ts:168-170` returns true for `capability`, `bloodline`, `magic_practice`, `technology`, `divine_action`, `artifact_dependent_truth`, `exception_introducing_fact` (per `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` at line 21). No schema modification — landing in existing `cf.notes` field per existing validator parsing convention.
4. Rules 5 (No Consequence Evasion) and 11 (No Spectator Castes by Accident) motivate this — `visible_consequences[]` three-order requirement enforces Rule 5 at genesis; leverage forms enforce Rule 11 at genesis (parallels canon-addition Phase 14a Test 11's per-CF enforcement).

## Architecture Check

1. Genesis-time enforcement at Phase 8 prevents post-approval engine-validator rejection at Phase 11 — the HARD-GATE roundtrip risk is structurally avoided once SPEC18GENFER-003 lands a Phase 9 self-validation test mirroring `rule11_action_space`. Cleaner than letting the engine reject after the Phase 10 user approval gate has fired.
2. No new schema fields introduced — leverage forms land in the existing `cf.notes` field per the existing `rule11_action_space` validator parsing convention. The leverage block is conditional on `requiresExceptionGovernance(CF-0001.type)`; non-exception-bearing CF-0001 types (e.g., `place`, `event`, `species`) trivially satisfy with no leverage block expected.
3. No backwards-compat shim — pre-SPEC-18 worlds remain unaffected.

## Verification Layers

1. Phase 8 prose contains the three requirements (≥4 domains, three-order consequences, Rule 11 leverage in `notes`) → codebase grep-proof
2. `rule11_action_space` validator and its parsing convention exist unchanged → codebase grep-proof at `tools/validators/src/rules/rule11-action-space.ts`
3. `requiresExceptionGovernance` helper exists at the cited source-module location with the documented type taxonomy → codebase grep-proof at `tools/validators/src/structural/record-schema-compliance.ts:168-170` + `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` at line 21
4. Phase 9 verification of the leverage population (cross-ticket: SPEC18GENFER-003 adds a Genesis spectator-caste check at Phase 9) → cross-ticket dependency

## What to Change

### 1. Phase 8 — Add three CF-0001 schema-population requirements

In `.claude/skills/create-base-world/SKILL.md` §Phase 8, locate the existing CF-0001 schema-population paragraph (beginning "**CF-0001** is the primary-difference fact"). Add a SPEC-18 Track A2 "Genesis propagation requirements" paragraph immediately after it with three additions:

- Add to or alongside the `domains_affected[]` field description: "`domains_affected[]` MUST span ≥4 canonical domains."
- Add to or alongside the `visible_consequences[]` field description: "`visible_consequences[]` MUST enumerate first / second / third-order consequences explicitly, distinguishing immediate effects (first-order) from cascade effects through institutions / professions / taboos (second-order) from far-edge effects on language / mourning / childhood (third-order). Three orders is the genesis bar."
- Add: "If CF-0001 introduces or depends on exceptional capability per `requiresExceptionGovernance(cf.type)`, populate Rule 11 leverage with ≥3 distinct ordinary- / mid-tier-actor leverage forms in CF-0001's `notes` field as a `leverage:`-prefixed comma-separated line, drawing forms from the permissible enum (`locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`) — matches the `rule11_action_space` validator's parsing convention used by canon-addition Phase 14a Test 11 (genesis spectator-caste check)."

## Files to Touch

- `.claude/skills/create-base-world/SKILL.md` (modify)
- `specs/SPEC-18-genesis-fertility-and-misrecognition.md` (modify — same-seam historical wording truthing)

## Out of Scope

- Phase 4 substantive section requirement (delivered by SPEC18GENFER-001)
- Phase 9 verification of leverage population (delivered by SPEC18GENFER-003)
- canon-addition Phase 0 misrecognition probe (delivered by SPEC18GENFER-004)
- Schema modification of Canon Fact Record fields — explicit non-goal per SPEC-18 §Approach (no schema changes)
- Promotion of the genesis spectator-caste check to a mechanical validator separate from `rule11_action_space` — explicit non-goal per SPEC-18 §Out of Scope

## Acceptance Criteria

### Tests That Must Pass

1. `grep -F "domains_affected[]" .claude/skills/create-base-world/SKILL.md | grep -F "≥4 canonical domains"` returns 1 match
2. `grep -F "first / second / third-order consequences explicitly" .claude/skills/create-base-world/SKILL.md` returns 1 match
3. `grep -F "leverage:" .claude/skills/create-base-world/SKILL.md` returns 1+ match in the Phase 8 context
4. `grep -F "rule11_action_space" .claude/skills/create-base-world/SKILL.md` returns 1+ match (cross-reference to validator)
5. `grep -F "requiresExceptionGovernance" .claude/skills/create-base-world/SKILL.md` returns 1+ match in the Phase 8 context (the existing SPEC-09 reference plus the new Rule 11 reference)
6. Cross-ticket follow-up only: after SPEC18GENFER-003 lands, a skill dry-run with CF-0001 type=`geography` and `domains_affected: [magic]` should reject at Phase 9 (1 domain < ≥4 bar). This ticket does not own the Phase 9 self-validation test.

### Invariants

1. Leverage forms land exclusively in `cf.notes` per the `rule11_action_space` validator's parsing convention — no new schema field is introduced
2. The Rule 11 leverage requirement is conditional on `requiresExceptionGovernance(CF-0001.type)` returning true; non-exception-bearing types (per `EXCEPTION_GOVERNANCE_REQUIRED_TYPES`) trivially satisfy with no leverage block
3. The three-order consequence requirement is universal at genesis (applies to every CF-0001 regardless of type)
4. The ≥4-domain requirement is universal at genesis; weaker propagation routes back to Phase 0 per spec wording

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage (the `rule11_action_space` validator and `record-schema-compliance` validator) is named in Assumption Reassessment.

### Commands

1. `grep -F "≥4 canonical domains" .claude/skills/create-base-world/SKILL.md`
2. ``grep -F 'leverage:`-prefixed comma-separated line' .claude/skills/create-base-world/SKILL.md``
3. `grep -nE "requiresExceptionGovernance|rule11_action_space" tools/validators/src/rules/rule11-action-space.ts tools/validators/src/structural/record-schema-compliance.ts` (confirms validator targets exist unchanged)

## Outcome

Completed 2026-04-28.

Phase 8 in `.claude/skills/create-base-world/SKILL.md` now has a SPEC-18 Track A2 "Genesis propagation requirements" paragraph. It requires CF-0001 `domains_affected[]` to span ≥4 canonical domains, `visible_consequences[]` to enumerate first / second / third-order consequences explicitly, and capability-bearing CF-0001 records to place ≥3 Rule 11 leverage forms in `cf.notes` as a `leverage:`-prefixed comma-separated line matching `rule11_action_space`.

No validator code or CF schema fields changed.

The SPEC-18 reference now treats the old Phase 8 gap as pre-SPEC18GENFER-002 intake state instead of current live behavior.

## Verification Result

1. `grep -F "domains_affected[]" .claude/skills/create-base-world/SKILL.md | grep -F "≥4 canonical domains"` — passed.
2. `grep -F "first / second / third-order consequences explicitly" .claude/skills/create-base-world/SKILL.md` — passed.
3. `grep -F "leverage:" .claude/skills/create-base-world/SKILL.md` — passed.
4. `grep -F "rule11_action_space" .claude/skills/create-base-world/SKILL.md` — passed.
5. `grep -F "requiresExceptionGovernance" .claude/skills/create-base-world/SKILL.md` — passed.
6. `grep -nE "requiresExceptionGovernance|rule11_action_space" tools/validators/src/rules/rule11-action-space.ts tools/validators/src/structural/record-schema-compliance.ts` — passed; confirmed the validator/helper source-module references remain unchanged.
7. `rg -n 'Currently Phase 8|currently first applied' specs/SPEC-18-genesis-fertility-and-misrecognition.md` — passed with no matches; same-seam stale-current wording was removed from the SPEC-18 reference.

## Deviations

The leverage wording landed in a new Phase 8 "Genesis propagation requirements" paragraph immediately after the CF-0001 schema paragraph, rather than after the SPEC-09 conditionally-mandatory blocks paragraph. This keeps the three Track A2 population requirements together and does not change the intended schema or validator boundary.

The Phase 9 skill dry-run rejection for a one-domain CF-0001 remains owned by SPEC18GENFER-003, which is still active.
