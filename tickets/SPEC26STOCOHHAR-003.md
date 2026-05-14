# SPEC26STOCOHHAR-003: Add SE.resolution block — schema, contract, validator, emitters

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` (§4.3 + §8), `tools/validators/src/schemas/story-event.schema.json`, `tools/validators` structural validation + test, `branching-story-turn-cycle` and `story-fact-promotion-to-canon` skill prose.
**Deps**: None

## Problem

Non-accept outcomes are not structurally explicit. `SE.outcome_route` records *which route* an action took (`accept` / `accommodate` / `attempt` / `world_block` / `promotion_hold` / `terminal`), but the *result within that route* — did the `attempt` succeed or fail? — lives only in `world_logic_rationale` prose and the `state_delta`. It is not directly auditable, and there is no structured field for the downstream prose-attach check (SPEC26STOCOHHAR-004) to verify the outcome was made visible to the player. This ticket adds the `SE.resolution` block — the schema/contract/validator/emitter half of SPEC-26 D3 (the prose-receipt half is SPEC26STOCOHHAR-004).

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `tools/validators/src/schemas/story-event.schema.json` has `additionalProperties: false` and no `resolution` property; `outcome_route` is a required enum (`accept | accommodate | attempt | world_block | promotion_hold | terminal`). `story-state-contract.md` §4.3 (`SE`, ~12 sub-paths, line 185) defines the current SE schema. `branching-story-turn-cycle/SKILL.md` Phase 1 resolves the action to an outcome route and Phase 7 authors the page plan. `tools/validators/` ships `record_schema_compliance` with per-class tests (`tools/validators/tests/structural/record-schema-compliance-*.test.ts`).
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D3: the `resolution` block carries `result` (`success | partial_success | failure | impossible | transformed | held_for_promotion`) and `player_visible_feedback`; it is required when `outcome_route ∈ {attempt, accommodate, world_block}` and absent/optional otherwise; the `route_resolution_consistency` constraint table maps each route to its allowed `result` set. `reason_class` is explicitly NOT added (SPEC-26 §Out of Scope).
3. Cross-skill / cross-artifact boundary under audit: the `SE` record schema, owned jointly by `story-state-contract.md` §4.3 (prose) and `tools/validators/src/schemas/story-event.schema.json` (executable). FOUNDATIONS §Story Bundles §5b makes the contract authoritative; the JSON schema must mirror it. The page-plan event section in `story-state-contract.md` §8 and the producers (`branching-story-turn-cycle`) and consumers (`record_schema_compliance`, prose-attach via SPEC26STOCOHHAR-004, `story-fact-promotion-to-canon`) all sit on this boundary.
4. FOUNDATIONS principles under audit: Rule 1 (No Floating Facts) — `SE.resolution` is a Rule-1 grounding field that makes a non-accept outcome's result and player-visible consequence explicit rather than inferred. §Story Bundles §5b (Schema-Minimalism At Story Scope) — every story-bundle field must be load-bearing; `resolution` adds exactly two sub-fields, both with named consumers (`result` → replay / prose-attach / promotion auditability; `player_visible_feedback` → the SPEC26STOCOHHAR-004 prose check). `reason_class` was rejected for having no consumer.
5. HARD-GATE / Canon Safety surface (per `tickets/README.md` check 9): this ticket touches `story-fact-promotion-to-canon` — a story-to-world canon-promotion skill. The change there is purely additive: when a promotion candidate derives from an `SE` with `resolution.result: held_for_promotion`, include `resolution.player_visible_feedback` in the proposal package's evidence narrative. It adds evidence; it does NOT alter the promotion HARD-GATE, the `canon-addition` handoff, or the Mystery Reserve firewall (FOUNDATIONS Rule 7) — confirmed: no `forbidden`-status mystery resolution path is touched.
6. Output-schema extension (per `tickets/_TEMPLATE.md` menu item 6): the schema extended is the `SE` record schema (`story-event.schema.json` + contract §4.3). The extension is **conditionally additive** — `resolution` is a new optional object that becomes required only for three of six `outcome_route` values. Consumers: `record_schema_compliance` (must enforce the conditional-required + per-route enum), `branching-story-turn-cycle` (producer), `story-fact-promotion-to-canon` and the SPEC26STOCOHHAR-004 prose-attach check (readers). Existing `accept`/`promotion_hold`/`terminal` SE records remain valid with `resolution` absent — no breaking change to already-shaped records.
7. Mismatch + correction (SPEC-26 Step 2 Issue 1): SPEC-26 D3 cites `.claude/skills/_shared-templates/page-plan.md` as the edit target for the page-plan event-section line. That file does not exist. The page-plan 19-section contract lives in `story-state-contract.md` §8 ("Page Plan Minimum Contract", line 664); the selected-event section is page-plan §7 (confirmed by `branching-story-prose-attach/SKILL.md:135` "Plan §7 (selected event + state delta)"). Correction (user-dispositioned `expand-scope-in-place` at Step 2): this ticket targets `story-state-contract.md` §8 page-plan §7, not the non-existent `page-plan.md`.

## Architecture Check

1. A structured `resolution` block is cleaner than the status quo (result distributed across `world_logic_rationale` free-text + `state_delta`): it makes non-accept outcomes machine-auditable for replay, prose-attach, and promotion, and gives the SPEC26STOCOHHAR-004 prose check a concrete contract to verify rather than a prose heuristic. Trimming `reason_class` keeps the addition to the minimum load-bearing surface (§5b).
2. No backwards-compatibility aliasing or shims — `resolution` is a net-new conditionally-required field; no alias for an old representation is introduced, and no migration is needed (zero production story bundles exist).

## Verification Layers

1. Contract ↔ schema consistency -> schema validation: every `resolution` sub-field and the `route_resolution_consistency` constraint in `story-state-contract.md` §4.3 is mirrored in `story-event.schema.json`, and `record_schema_compliance` round-trips a valid `SE` record with and without `resolution`.
2. The conditional-required + per-route enum is enforced -> schema validation: `story-event.schema.json` rejects an `attempt`-route `SE` with no `resolution`, and rejects a `world_block`-route `SE` with `resolution.result: success`.
3. The producer emits `resolution` on non-accept routes -> skill dry-run: `branching-story-turn-cycle` Phase 1 drafts `SE.resolution` for `attempt`/`accommodate`/`world_block` and Phase 7 carries `player_visible_feedback` into page-plan §7.
4. The promotion skill surfaces the feedback -> manual review: `story-fact-promotion-to-canon` includes `resolution.player_visible_feedback` in the evidence narrative for `held_for_promotion`-derived candidates, without touching the MR firewall.

## What to Change

### 1. Contract §4.3 — add the resolution block + constraint table

In `.claude/skills/_shared-templates/story-state-contract.md` §4.3 (`SE` schema), add the optional `resolution` block (`result`, `player_visible_feedback`), state that it is required when `outcome_route ∈ {attempt, accommodate, world_block}`, and add the `route_resolution_consistency` table: `accept` → `result` absent; `attempt` → `{success, partial_success, failure}`; `accommodate` → `{partial_success, transformed}`; `world_block` → `{impossible, failure}`; `promotion_hold` → absent or `held_for_promotion`; `terminal` → `{success, partial_success, failure, transformed}` or absent.

### 2. JSON schema — add resolution with conditional logic

In `tools/validators/src/schemas/story-event.schema.json`, add the `resolution` object to `properties` (the file is `additionalProperties: false`, so it must be declared). Express the conditional-required-ness and the per-route `result` enum with JSON Schema `allOf` / `if` / `then` so `record_schema_compliance` enforces it automatically. If the nested conditional proves un-expressible in AJV 2020 (the validator framework's draft), fall back to a dedicated structural check — see SPEC-26 §Risks; confirm AJV behavior before choosing.

### 3. Contract §8 — page-plan §7 carries player_visible_feedback

In `story-state-contract.md` §8 ("Page Plan Minimum Contract"), the page-plan §7 (selected-event) sub-section gains a required `resolution.player_visible_feedback` line for non-accept routes. §7 is not one of the verbatim-inlined sections (§2/§3/§19), so it is freely editable.

### 4. turn-cycle — draft and carry resolution

In `branching-story-turn-cycle/SKILL.md`: Phase 1 drafts `SE.resolution` for `attempt`/`accommodate`/`world_block` routes; Phase 7 carries `resolution.player_visible_feedback` into page-plan §7.

### 5. story-fact-promotion-to-canon — surface feedback for held_for_promotion

When a promotion candidate derives from an `SE` with `resolution.result: held_for_promotion`, include `resolution.player_visible_feedback` in the proposal package's evidence narrative.

### 6. Validator test

Add or extend `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` to cover: a conformant `attempt` SE with `resolution`, an `attempt` SE missing `resolution` (rejected), a `world_block` SE with an out-of-enum `result` (rejected), an `accept` SE with `resolution` absent (accepted).

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.3 + §8)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (new or modify — confirm whether a story-event compliance test already exists)

## Out of Scope

- The prose-attach `choice_consequence_visibility` check that consumes `resolution.player_visible_feedback` — that is SPEC26STOCOHHAR-004 (the read/verify half of D3).
- `SE.resolution.reason_class` — explicitly rejected (SPEC-26 §Out of Scope; §5b schema-minimalism).
- Any change to the `outcome_route` enum itself.
- `docs/FOUNDATIONS.md` §5 example list — that reconciliation is SPEC26STOCOHHAR-009 (D8).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` passes, including the new/extended `record-schema-compliance-story-event` cases.
2. `story-event.schema.json` rejects an `attempt`-route `SE` with no `resolution` and a `world_block`-route `SE` with `resolution.result: success`; it accepts a conformant record for each route.
3. `grep -n 'resolution' .claude/skills/_shared-templates/story-state-contract.md` shows `resolution` defined in §4.3 and referenced in §8 page-plan §7.

### Invariants

1. The contract §4.3 `resolution` schema and `story-event.schema.json` agree field-for-field and constraint-for-constraint (FOUNDATIONS §5b: the contract is authoritative; the JSON schema mirrors it).
2. `resolution` is conditionally-required exactly for `outcome_route ∈ {attempt, accommodate, world_block}`; `accept`/`promotion_hold`/`terminal` SE records remain valid with `resolution` absent.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — proves the conditional-required block, the per-route `result` enum, and absence-validity for `accept`/`promotion_hold`/`terminal`.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. `grep -rn 'resolution' .claude/skills/_shared-templates/story-state-contract.md tools/validators/src/schemas/story-event.schema.json`
3. The validator build/test in command 1 is the full machine-layer verification boundary; command 2 confirms the contract ↔ schema mirror at the prose layer.
