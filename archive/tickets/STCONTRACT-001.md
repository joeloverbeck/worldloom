# STCONTRACT-001: Expand `SE.turn_driver.driver_records` pattern to admit STINT and BEL

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-event.schema.json` (general pattern + `npc_action.contains` pattern), `.claude/skills/_shared-templates/story-record-schemas.md` (`SE.turn_driver.driver_records` contract prose), `.claude/skills/_shared-templates/story-state-contract.md` (§7a contract prose), and validator tests under `tools/validators/tests/`.
**Deps**: None.

## Problem

At intake, `SE.turn_driver.driver_records` restricted items to the pattern `^(STPLAN|STEMO|CLK|THR|STSEC|STQ|OBL|CNSQ|SREL|STCHAR)-[0-9]+$`. For `npc_action` and `offstage_action` turns, the most operationally direct driver records are typically the actor's `STINT` (the intention firing the act) and the actor's `BEL` (the shared knowing on which the act is grounded). The old schema forbade both, so authors had to cite less-direct records and the turn driver's provenance was artificially weaker than the underlying state.

Observed before this ticket at `red-bunny` SE-7: Ane's commit was driven by `STINT-10` (her high-urgency intent to commit a response register, whose `expires_when` trigger exactly described this turn) and `BEL-16` (her shared knowing of Jon's PG-6 disclosure-plus-amplification, which is the substrate her sort-grid ran on). Both had to be removed from `driver_records` to pass schema validation. This ticket fixes the schema/prose contract going forward; it does not rewrite existing live story records.

## Assumption Reassessment (2026-05-27)

1. At intake, the general pattern at `tools/validators/src/schemas/story-event.schema.json` was `^(STPLAN|STEMO|CLK|THR|STSEC|STQ|OBL|CNSQ|SREL|STCHAR)-[0-9]+$` (10 classes). `npc_action.contains.pattern` was narrower: `^(STPLAN|STEMO|CLK|THR|STCHAR)-[0-9]+$` (5 classes) — this is the "at least one of" guard ensuring the driver is rooted in ongoing causal pressure or stable authority, not in transient knowledge alone.
2. The shared contract `.claude/skills/_shared-templates/story-record-schemas.md` §4.3 enumerates `SE.turn_driver.driver_records`; `.claude/skills/_shared-templates/story-state-contract.md` §7a describes page-plan projection and Gate 9. `STINT` (intention) and `BEL` (belief) are both lifecycle-managed state classes and both are operationally what NPCs act under. Excluding them from `driver_records` was a schema choice, not a contract necessity.
3. Cross-skill boundary: this ticket audited the schema-level pattern restriction on `driver_records` items. The downstream consumers are (a) `tools/validators/src/structural/turn-driver-schema-compliance.ts`, (b) the shared authoring templates that document `SE.turn_driver` and §7a, and (c) structural validators that read `turn_driver.driver_records` as opaque ids or active-record ids.
4. FOUNDATIONS-aligned enforcement surface: the shared story-state contract §7 Gate 9 (Turn-Driver Lawfulness) consumes this schema directly. Gate 9's intent is "driver records are active on the parent page snapshot and POV access is consistent" — not "driver records may only be of these specific classes." Expanding the class set strengthens the audit-trail signal Gate 9 actually cares about (the active state that motivated the driver) without weakening any invariant.
5. Schema-extension consumers: the patch engine's `record_schema_compliance` validator consumes the schema directly. The structural-validator side (`turn-driver-schema-compliance`, `turn-driver-pov-observer-firewall`, `page-plan-turn-driver-consistency`, `turn-cycle-output-grounding-integrity`) reads `driver_records` as ids and does not reject `STINT` or `BEL` as classes.
6. Adjacent contradictions: the `npc_action.contains` constraint allowed STCHAR (stable authority, not pressure) but excluded STINT (ongoing actor commitment). STINT is conceptually closer to "ongoing causal pressure" than STCHAR is. The landed change adds STINT to the contains-constraint as well; BEL remains outside the contains-constraint to preserve the "must root in pressure or stable authority, not in knowledge alone" intent.
7. Live package command correction: there is no root `package.json` / pnpm workspace in this checkout. The validators package owns the proof lane from `tools/validators` with `npm run build`, direct compiled `node --test ...`, and `npm test`.
8. Live shared-template correction: `.claude/skills/_shared-templates/story-state-contract.md` §7a describes page-plan projection and Gate 9, but the explicit `SE.turn_driver.driver_records` class union lives in `.claude/skills/_shared-templates/story-record-schemas.md` §4.3. This ticket owns both surfaces: `story-record-schemas.md` for the explicit union, and `story-state-contract.md` for a §7a note that STINT/BEL may be the direct driver provenance.
9. Pre-edit broad baseline: `npm test` from `tools/validators` passed before source edits (1093 pass, 0 fail), so post-change validator failures are attributable unless a later command shows otherwise.

## Architecture Check

1. Cleaner than the alternative of keeping the restrictive pattern and forcing authors to cite less-direct records. The expansion is additive (no class removed); existing valid SE records continue to validate. Re-routing the audit-trail signal to its most direct source improves Gate 9's diagnostic value at zero contract-coherence cost.
2. No backwards-compatibility aliasing/shims introduced. The schema pattern is broadened in place; consumers that already iterate over `driver_records` and look up records by id are unchanged.

## Verification Layers

1. SE record with `STINT-N` or `BEL-N` in driver_records passes `record_schema_compliance` -> schema validation.
2. `npc_action`-shape SE with `STINT-N` in driver_records and at least one of {STPLAN, STEMO, CLK, THR, STCHAR, STINT} passes the `contains` guard -> schema validation.
3. Downstream structural validators (`active-pressure-handling-discipline`, `chc-slt-selected-commitment-trace`, any other consumer of `driver_records`) handle STINT/BEL ids without exception -> codebase grep-proof (no class-name-switched lookup that would throw on the new classes) + test fixture.
4. Shared template prose accurately reflects the expanded allowed-class set and §7a authoring guidance -> manual review.

## Landed Changes

### 1. Schema pattern expansion (`tools/validators/src/schemas/story-event.schema.json`)

- General `driver_records.items.pattern` is now `^(STPLAN|STEMO|CLK|THR|STSEC|STQ|OBL|CNSQ|SREL|STCHAR|STINT|BEL)-[0-9]+$`.
- `npc_action.contains.pattern` is now `^(STPLAN|STEMO|CLK|THR|STCHAR|STINT)-[0-9]+$`. STINT was added; BEL was not added because the contains-guard's intent is "rooted in ongoing causal pressure or stable authority," and beliefs alone do not satisfy that.
- Other per-driver-kind constraints (`offstage_action`, `world_pressure`, `secret_reveal`, `multi_actor_collision`, `clock_fire`) were left unchanged.

### 2. Shared contract update (`.claude/skills/_shared-templates/story-state-contract.md`)

- `.claude/skills/_shared-templates/story-record-schemas.md` §4.3 now includes STINT and BEL in the explicit `driver_records` union.
- `story-state-contract.md` §7a now notes that STINT is preferred when the actor's intent fires the act and BEL is preferred when the actor's knowing grounds the act, while BEL alone does not satisfy the `npc_action` pressure/stable-authority guard.
- The expansion is additive.

### 3. Skill-side cross-reference (`.claude/skills/branching-story-turn-cycle/SKILL.md` and `references/`)

The active turn-cycle skill tree was grepped for the old explicit allowed-class union. No additional current skill-side enumeration needed editing beyond the shared templates.

### 4. Downstream validator audit

`tools/validators/src/` was grepped for `driver_records` consumers. `turn-driver-schema-compliance` needed its `npc_action` pressure/stable-authority class list updated to include STINT. Other consumers read ids from the field and either compare active-record membership or cross-check page-plan text, without rejecting STINT/BEL by class.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.3 explicit `driver_records` union)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §7 / §7a prose update)
- `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts` (modify — add STINT/BEL schema cases)
- `tools/validators/tests/structural/turn-driver-schema-compliance.test.ts` (modify — add STINT/BEL structural active-record cases)

## Out of Scope

- Changes to driver-kind constraints beyond `general.items.pattern` and `npc_action.contains.pattern`.
- Re-classification of existing SE records (existing records remain valid under the broadened pattern).
- Adding additional record classes beyond STINT and BEL (e.g. SF, STSTAT) — those weren't observed as missing-driver cases in this turn-cycle and adding them would require fresh motivation.

## Acceptance Criteria

### Tests That Must Pass

1. New schema test in `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts`: SE record with `kind: npc_action` and `driver_records: [STINT-X, BEL-Y]` passes because STINT satisfies the pressure/stable-authority guard; SE record with only `BEL-X` fails the `contains` guard.
2. Regression test: SE-7-shaped driver list from `red-bunny` (`[STINT-10, STEMO-15, STQ-5, THR-7, BEL-16, STCHAR-1]`) passes the story-event schema compiler path.
3. Downstream-validator non-regression: re-run the focused compiled turn-driver tests and full validator package suite from `tools/validators`; `turn_driver_schema_compliance`, `active-pressure-handling-discipline`, `chc-slt-selected-commitment-trace`, and other existing `driver_records` consumers still pass.

### Invariants

1. The `general.items.pattern` and the `npc_action.contains.pattern` are the two surfaces governing driver-record class membership; no third surface enforces this independently.
2. `npc_action` turns must still root at least one driver record in ongoing causal pressure or stable authority (STPLAN, STEMO, CLK, THR, STCHAR, STINT). A driver_records list of only BEL ids fails the contains guard.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts` (modify) — schema accept cases for STINT/BEL + rejection case for BEL-only npc_action drivers.
2. `tools/validators/tests/structural/turn-driver-schema-compliance.test.ts` (modify) — structural active-record handling for STINT/BEL driver ids.
3. `None for skill SKILL.md / contract prose — documentation-only changes verified by manual review and stale-anchor grep`.

### Commands

1. From `tools/validators`: `npm run build` — confirm schema parses and compiled tests are fresh.
2. From `tools/validators`: `node --test dist/tests/schemas/story-event-turn-driver-schema.test.js dist/tests/structural/turn-driver-schema-compliance.test.js` — targeted compiled schema/structural proof.
3. From `tools/validators`: `npm test` — full validator suite.
4. The historical `red-bunny` SE-7 list is proved by the focused schema fixture rather than a checkout-local live-world patch-plan envelope; no world-content rewrite is in scope for this ticket.

## Outcome

Completion date: 2026-05-27.

Completed. `SE.turn_driver.driver_records` now admits STINT and BEL. `npc_action` may use STINT as the pressure/stable-authority root, while BEL can be included as provenance but cannot be the only root for the `contains` guard. The shared story-record schema prose and §7a authoring guidance now describe the expanded contract.

## Verification Result

1. Pre-edit baseline: from `tools/validators`, `npm test` passed before source edits (1093 pass, 0 fail).
2. Build: from `tools/validators`, `npm run build` passed after the schema/test edits.
3. Targeted proof: from `tools/validators`, `node --test dist/tests/schemas/story-event-turn-driver-schema.test.js dist/tests/structural/turn-driver-schema-compliance.test.js` passed (12 pass, 0 fail). This proves STINT/BEL schema acceptance, BEL-only `npc_action` rejection, and structural active-record handling for STINT/BEL driver ids.
4. Full validator proof: from `tools/validators`, `npm test` passed after implementation (1094 pass, 0 fail).
5. Stale-anchor proof: greps for the old explicit driver-record class union and the old regex patterns over `tools/validators/src`, `tools/validators/tests`, `.claude/skills/_shared-templates`, and `.claude/skills/branching-story-turn-cycle` returned no current-contract hits.

## Deviations

1. Drafted `pnpm -F @worldloom/validators ...` commands were replaced with package-local `npm` commands because this checkout has no root `package.json` / pnpm workspace.
2. Drafted live `red-bunny` patch-plan revalidation was replaced by a focused schema fixture with the same SE-7-shaped driver list. This keeps the ticket out of live world-content rewriting and proves the schema invariant directly.
3. `.claude/skills/branching-story-turn-cycle/SKILL.md` and references were inspected but not edited; they did not contain the old explicit allowed-class union that needed updating for this ticket.
