# VALENH-049: Recognize `advance_initiative` (non-player driver) PG input legality in `state_snapshot_integrity`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `state_snapshot_integrity` carve-outs in `tools/validators/src/structural/state-snapshot-integrity.ts`; updates `story-page.schema.json` docstring; validator-package rebuild required so MCP dry-run and patch-engine submit see the new rule; companion docs update in `.claude/skills/_shared-templates/story-record-schemas.md` §4.2 (input-legality conditional rule), turn-cycle input/pre-flight guidance, bootstrap root-page reference wording, and `docs/WORKFLOWS.md`.
**Deps**: None

## Problem

The `branching-story-turn-cycle` skill defines `action_source_mode: advance_initiative` as a first-class input mode: when invoked, both `chosen_choice_id` and `manual_action_text` are absent, and a non-player record on the parent `PG.state_snapshot` (an active `STPLAN` step due, an active `STEMO` exerting behavioral pressure, a `CLK` at threshold, a `STSEC` reveal-ready, etc.) drives the turn. The skill's SKILL.md and `references/pre-flight-and-prerequisites.md` document this mode explicitly. The shared story state contract §6 names `npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision` as legal non-player `SE.turn_driver.kind` values; FOUNDATIONS §Story Bundles §5c ("Driver salience is local") enshrines non-player drivers as first-class causal initiators.

At intake, the validator `state_snapshot_integrity` enforced PG `input` legality in `validateInputLegality` by carving out exactly three event kinds for both-null inputs:

```ts
if (["story_start", "system_repair", "audit_repair"].includes(resolvedEventKind)) {
  if (!hasChoice && !hasManualAction) {
    return undefined;
  }
  return inputLegalityViolation(...);
}

if (hasChoice !== hasManualAction) {
  return undefined;
}

return inputLegalityViolation(...);
```

Before this ticket, `event_kind: turn_resolution` required exactly one of `choice_id` / `manual_action_text` non-null — there was **no carve-out for non-player drivers**. An honest `advance_initiative` turn (`SE.turn_driver.kind: npc_action`, both PG input fields null) hit `state_snapshot_integrity.pg_input_legality_violation` at dry-run.

The contradiction was hit empirically during a red-bunny PG-5 turn-cycle exercise. The author had to work around the validator by stuffing the player's `advance_initiative` directive into `manual_action_text` as a synthetic prose string (`"advance_initiative — let the non-player turn driver fire (Ane responds in her own register to Jon's pending offer)."`) so the validator would accept the page. This was dishonest: there was no player write-in; the player invoked an initiative-advance mode, not authored a player action. Existing audit trails with that synthetic string are left unchanged and remain out of scope.

This ticket teaches `state_snapshot_integrity` what FOUNDATIONS already says: non-player drivers are first-class. A `turn_resolution` event whose `SE.turn_driver.kind` is one of the six non-player values legitimately allows both `choice_id` and `manual_action_text` to be null without forcing a synthetic player-input string.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** At intake, `tools/validators/src/structural/state-snapshot-integrity.ts` `validateInputLegality` treated every event kind other than `story_start | system_repair | audit_repair` as requiring exactly-one-source-action. The landed code now keys `turn_resolution` input legality off resolved `SE.turn_driver.kind` while preserving legacy exactly-one behavior for missing/unknown driver kinds.
2. **Specs/docs reassessment.** At intake, `.claude/skills/branching-story-turn-cycle/SKILL.md` documented `action_source_mode: advance_initiative` requiring both player-action fields absent, but the argument descriptions and `references/pre-flight-and-prerequisites.md` still described strict `chosen_choice_id` / `manual_action_text` XOR. `references/phase-9-validation-gates.md` said "Action source legality — XOR enforced ..."; `tools/validators/src/schemas/story-page.schema.json` undercounted carve-outs; and `docs/WORKFLOWS.md` omitted `advance_initiative`. Those active contract surfaces now describe conditional legality by `event_kind`, `action_source_mode`, and `turn_driver.kind`.
3. **Cross-skill / cross-artifact boundary.** The shared boundary is the validator's interpretation of PG `input` legality against the resolved `SE.event_kind` and `SE.turn_driver.kind`. The validator already loaded the resolved SE via `maps.byId.get(resolvedEventId)`. Reading `SE.turn_driver.kind` from the resolved event's parsed body is an additive load — no new MCP call, no new IndexedRecord field. The PG-schema docstring is contract documentation; updating it keeps the contract narrative aligned with the validator behavior.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS §Story Bundles §5c ("Present Causal State, Not Narrative Shape") under the sub-heading "Driver salience is local" explicitly enshrines non-player drivers as first-class causal initiators: "Multi-source causality — player action plus active non-player pressure (NPC plans stepping, clocks firing, secrets reveal-ready, threads escalating, obligations falling due) — does not invite a global planner. Driver selection (which active record becomes this turn's causal initiator) is a *prior* local-salience-ranking pass before SLT selection." FOUNDATIONS also says "Silent rejection is forbidden" (story state contract §6, sourced from FOUNDATIONS §Story Bundles §4 Plan-Authority Boundary and §6b Information / Observer Firewall): every action including non-player initiative must produce an SE record. The intake validator rule effectively silently rejected honest non-player turns by demanding a synthetic player-input string — a violation of the spirit of "silent rejection is forbidden."
5. **HARD-GATE semantics impact.** The validator runs as part of the pre-apply gate (MCP `validate_patch_plan`) and the post-apply gate (patch engine). The fix tightens nothing on player-action turns (`player_action` / `player_write_in` still require exactly one source action). It correctly relaxes the rule for non-player-driver turns and rejects only the over-permissive both-sources-present shape. Mystery Reserve firewall is unaffected — the validator under audit governs PG input shape, not mystery resolution.
6. **Extension consumer audit.** The PG `input` field is read by `state_snapshot_integrity` (this ticket's target), `branching-story-health-audit` (no behavior change required; health audit cares about replay equality, not input legality), and prose-attach receipts (also no change needed; receipts read PG.plan.plan_hash and PG.state_hash, not input). No other validator parses PG.input legality conditions. The schema docstring update is the only consumer-facing change to advertise the new contract.
7. **Adjacent contradiction surfaced.** The skill's `references/phase-9-validation-gates.md`, `references/pre-flight-and-prerequisites.md`, `SKILL.md` argument prose, `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md`, and `docs/WORKFLOWS.md` preserved strict-XOR wording without naming the non-player-driver carve-out. This was the same contradiction expressed at active skill/workflow prose layers rather than the validator layer. Classified as a **required consequence of this ticket** and updated in this run.
8. **Proof-surface reassessment.** `tools/validators/package.json` runs `npm test` as `npm run build && node --test dist/tests/**/*.test.js`; targeted acceptance therefore built first and ran the compiled `dist/tests/structural/state-snapshot-integrity.test.js`, not the source `.ts` file directly. Baseline `cd tools/validators && npm test` passed before edits.
9. **Historical-envelope proof boundary.** `/tmp/red-bunny-pg5-envelope.json` exists in this checkout and remains useful as historical reproduction input, but it is checkout-local rather than portable CI evidence. The accepted proof surface stays on focused synthetic structural tests plus the validator package build/test lane; any red-bunny smoke is treated as optional historical-envelope confirmation and not as the only acceptance gate.

## Architecture Check

1. **Minimal extension of an existing carve-out.** The current rule has a closed list of carve-out event kinds. Adding a conditional sub-rule for `turn_resolution` events with non-player `turn_driver.kind` is the smallest change that resolves the contradiction. Alternatives considered: (a) treat `advance_initiative` as an event_kind value (e.g., `turn_resolution_initiative`) — rejected because the shared contract §6 already establishes that `event_kind: turn_resolution` covers all turn resolutions and the distinction lives on `SE.turn_driver.kind`, not event_kind; conflating the two would require a wider schema change. (b) make the validator key off PG.input being both-null OR exactly-one and only validate when the event kind says something specific — rejected as it diffuses the rule rather than making it explicit. The cleanest fix reads `SE.turn_driver.kind` and applies the non-player carve-out symmetrically with the existing repair/start carve-outs.
2. **No backwards-compatibility aliasing/shims introduced.** Existing player-action and player-write-in PG records continue to validate only when they have exactly one source action non-null. `turn_resolution` records with non-player drivers and both-null input now pass, and non-player-driver records with exactly one source action also remain valid for co-fired player input. No shim or alias is added; the validator simply recognizes the legitimate driver-kind-keyed input shapes.
3. **Authentic audit trail.** The fix removes the need for authors to invent synthetic `manual_action_text` strings for non-player turns. After this ticket, an honest advance_initiative turn records `input.choice_id: null, input.manual_action_text: null`, and the SE's `turn_driver` carries the actual driver-record provenance. Health audit, prose-attach, and future replays see the truthful shape.
4. **Strengthened validation.** This ticket also adds a defensive rule the current validator does not enforce: **when `SE.turn_driver.kind` is player_action or player_write_in, the PG.input MUST have exactly one source action non-null** — explicit, driver-kind-keyed. The current rule infers this implicitly by elimination ("not story_start/repair, not non-player → must be exactly-one"); the new explicit rule catches a hypothetical bug where a player-driver event ships with both-null input. This closes a previously-implicit invariant.

## Verification Layers

1. **Codebase grep-proof** → `rg -n 'npc_action|offstage_action|world_pressure|clock_fire|secret_reveal|multi_actor_collision' tools/validators/src/structural/state-snapshot-integrity.ts tools/validators/dist/src/structural/state-snapshot-integrity.js` returns hits in source and rebuilt dist.
2. **Validator unit tests (positive)** → new test cases assert that `state_snapshot_integrity` returns no verdicts when `SE.event_kind: turn_resolution`, `SE.turn_driver.kind ∈ {npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision}`, and PG.input has both fields null. One test per driver kind (six tests).
3. **Validator unit tests (negative — non-player)** → new test case asserts that `state_snapshot_integrity` returns the input-legality violation when `SE.event_kind: turn_resolution` and `SE.turn_driver.kind` is non-player but PG.input has both source fields non-null. Companion positive tests assert exactly-one source input still passes for non-player drivers when a player source co-fires.
4. **Validator unit tests (negative — player)** → new test cases assert that `state_snapshot_integrity` REJECTS both-null input when `SE.event_kind: turn_resolution` and `SE.turn_driver.kind ∈ {player_action, player_write_in}`. This is the strengthened-validation companion check.
5. **Validator unit tests (preserved)** → existing carve-out tests for story_start / repair pages continue to pass. Existing rejection-of-exactly-one-source-action-for-non-story_start test continues to pass when the resolved event has no turn_driver (e.g., legacy `selected_choice` event_kind in test fixtures).
6. **Schema docstring alignment** → `tools/validators/src/schemas/story-page.schema.json` `input` description updated to enumerate all three carve-outs (story_start, repair events, non-player driver). Verified by inspecting the schema file post-edit.
7. **FOUNDATIONS alignment check** → FOUNDATIONS §Story Bundles §5c (Driver salience is local) plus story state contract §6 (Action Routing): non-player drivers produce honest `SE` records without forcing player-input synthesis. After this ticket, the validator behavior matches the contract.
8. **Skill/workflow contract wording** → turn-cycle SKILL/pre-flight/Phase 9 prose, the shared story-record schema template, bootstrap root-page reference wording, and `docs/WORKFLOWS.md` no longer describe turn-cycle input legality as unconditional XOR.
9. **Historical-envelope smoke (optional)** → when the checkout-local `/tmp/red-bunny-pg5-envelope.json` can be converted safely, `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <sandbox-envelope>` may be used as reproduction confirmation; focused synthetic tests remain the portable acceptance proof.

## Landed Changes

### 1. `tools/validators/src/structural/state-snapshot-integrity.ts`

`validateInputLegality` now reads the resolved `SE` body once, checks `event_kind`, and keys `turn_resolution` legality off `turn_driver.kind`:

- `story_start`, `system_repair`, `audit_repair`, `prose_attach`, and `promotion_closeout` require both PG input source fields to be null.
- Non-player `turn_driver.kind` values (`npc_action`, `offstage_action`, `world_pressure`, `clock_fire`, `secret_reveal`, `multi_actor_collision`) allow both-null input for `advance_initiative` and still allow exactly-one source action for co-fired player input. Both source fields non-null is rejected.
- Player `turn_driver.kind` values (`player_action`, `player_write_in`) require exactly one source action.
- Missing or unknown `turn_driver.kind` preserves the legacy exactly-one fallback.

The `suggested_fix` text now names the carve-outs and the player-driver exactly-one rule.

### 2. Schema, Skill, And Workflow Contract Text

`tools/validators/src/schemas/story-page.schema.json`, `.claude/skills/_shared-templates/story-record-schemas.md`, the turn-cycle skill argument/pre-flight/Phase 9 prose, the bootstrap root-page reference, and `docs/WORKFLOWS.md` now describe conditional input legality instead of unconditional XOR.

### 3. Tests And Generated Artifact Freshness

`tools/validators/tests/structural/state-snapshot-integrity.test.ts` now covers six non-player both-null positives, non-player both-source rejection, non-player exactly-one positives, and two player-driver both-null rejections. `tools/validators/dist/**` was refreshed by `npm run build` / `npm test`; it remains an ignored generated artifact.

## Files to Touch

- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify docstring only)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify — add ~11 new tests)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify §4.2 input docstring prose)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify one-line gate description)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (tighten input argument/pre-flight language)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (tighten input-source legality check)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md` (update root-page reference wording)
- `docs/WORKFLOWS.md` (update turn-cycle quick-reference wording)
- `tools/validators/dist/**` (ignored generated artifact refreshed by build/test)

## Out of Scope

- Re-validating pre-existing PG records whose `input.manual_action_text` carries synthetic `advance_initiative` strings (such as the red-bunny PG-5 record just written under this validator's old behavior). They remain valid under both the old and new rules; future advance_initiative turns can use the honest both-null shape going forward.
- A separate validator that cross-checks the `turn_driver.kind` against the `manual_action_text` content for honesty (would catch a player-claimed write-in that was actually a non-player driver dressed up). Defer to a future ticket if empirical authoring drift is observed.
- Changing `event_kind` enum or `turn_driver` schema. The fix lives entirely in the input-legality validator and contract docstrings.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript compile + dist refresh completes cleanly.
2. `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js` — all existing tests pass plus the ~11 new tests (compiled path matches the `npm test` execution model).
3. `cd tools/validators && npm test` — full validator test suite passes with no regressions.
4. **Historical-envelope smoke (optional, checkout-local)**: not required for acceptance; focused structural tests prove the portable validator invariant.
5. **Regression**: synthetic structural tests include a turn_resolution event_kind, player_action turn_driver.kind, and both PG.input fields null; confirm `state_snapshot_integrity.pg_input_legality_violation` still fires. This proves the strengthened-validation companion check works.

### Invariants

1. **Honest input layer.** No turn produces an SE record that pretends a player wrote a string they did not write. Non-player drivers record null PG.input fields; the SE.turn_driver carries the driver-record provenance.
2. **Driver-kind-keyed legality.** The rule for PG.input legality on turn_resolution events is keyed off `SE.turn_driver.kind`, not inferred by elimination. Player drivers require exactly-one-source-action; non-player drivers admit both-null and (defensively) exactly-one.
3. **No silent rejection.** Per shared contract §6 ("Silent rejection is forbidden"), the validator never blocks an honest non-player turn by demanding a synthetic player-input string.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — added 6 positive tests (one per non-player driver kind: npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision) asserting empty verdicts when PG.input is both-null and SE.turn_driver.kind matches.
2. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — added over-permissiveness coverage: non-player driver + both PG.input fields non-null fails; non-player driver + only choice_id non-null passes; non-player driver + only manual_action_text non-null passes.
3. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — added 2 strengthened-validation tests: player_action driver + both null fails with input legality violation; player_write_in driver + both null fails with input legality violation.

### Commands

1. **Build:** `cd tools/validators && npm run build`
2. **Targeted (compiled):** `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js`
3. **Full suite:** `cd tools/validators && npm test`
4. **Post-build optional historical smoke:** not exercised; `/tmp/red-bunny-pg5-envelope.json` is checkout-local historical evidence, and the accepted proof stayed on synthetic structural tests plus the package suite.
5. **Post-build regression:** covered by `node --test dist/tests/structural/state-snapshot-integrity.test.js` with player-driver both-null rejection cases.

## Outcome

`state_snapshot_integrity` now accepts honest `advance_initiative` page inputs with both `PG.input.choice_id` and `PG.input.manual_action_text` null when the resolved `SE.turn_driver.kind` is one of the six non-player driver kinds. Player-driven `turn_resolution` pages still require exactly one source action, and the validator rejects the over-permissive shape where both source fields are present.

The same contract is now reflected in the PG JSON Schema description, the shared story-record template, active turn-cycle guidance, bootstrap root-page guidance, and the workflow quick reference.

## Verification Result

1. Baseline before edits: `cd tools/validators && npm test` passed (`pass 1061`, `fail 0`).
2. Build after edits: `cd tools/validators && npm run build` passed and refreshed ignored `tools/validators/dist/**`; rerun after final test/ticket closeout edits also passed.
3. Focused compiled test: `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js` passed (`31` tests, `0` failures); rerun after final test/ticket closeout edits also passed (`31` tests, `0` failures).
4. Full validator package suite: `cd tools/validators && npm test` passed (`pass 1072`, `fail 0`) before final ticket closeout and test-helper formatting cleanup; the affected build and focused compiled test were rerun afterward.
5. Consumer artifact check: `tools/world-mcp/node_modules/@worldloom/validators` resolves by symlink to `../../../validators`, so the rebuilt validators dist is the artifact the world-mcp CLI resolves.
6. Stale-anchor sweep: current active contract surfaces no longer contain the old unconditional-XOR wording; the shell-safe `rg` sweep over the edited skills, shared templates, docs, schema, and ticket returned no hits.
7. Package docs inspection: `tools/validators/README.md` only inventories `state_snapshot_integrity`; no same-package README wording needed a behavior update.
8. Hygiene: `git diff --check` passed.

## Deviations

- The optional red-bunny PG-5 historical-envelope smoke was not exercised. It is checkout-local reproduction evidence, not portable acceptance proof; the accepted invariant is covered by focused synthetic structural tests and the full validators package suite.
- `.claude/worktrees/spec88-stoexpfro` was already dirty before this run and remained unrelated to this ticket.
