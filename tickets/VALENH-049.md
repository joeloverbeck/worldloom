# VALENH-049: Recognize `advance_initiative` (non-player driver) PG input legality in `state_snapshot_integrity`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `state_snapshot_integrity` carve-outs in `tools/validators/src/structural/state-snapshot-integrity.ts`; updates `story-page.schema.json` docstring; validator-package rebuild required so MCP dry-run and patch-engine submit see the new rule; companion docs update in `.claude/skills/_shared-templates/story-record-schemas.md` §4.2 (input-legality conditional rule).
**Deps**: None

## Problem

The `branching-story-turn-cycle` skill defines `action_source_mode: advance_initiative` as a first-class input mode: when invoked, both `chosen_choice_id` and `manual_action_text` are absent, and a non-player record on the parent `PG.state_snapshot` (an active `STPLAN` step due, an active `STEMO` exerting behavioral pressure, a `CLK` at threshold, a `STSEC` reveal-ready, etc.) drives the turn. The skill's SKILL.md and `references/pre-flight-and-prerequisites.md` document this mode explicitly. The shared story state contract §6 names `npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision` as legal non-player `SE.turn_driver.kind` values; FOUNDATIONS §Story Bundles §5c ("Driver salience is local") enshrines non-player drivers as first-class causal initiators.

The validator `state_snapshot_integrity` enforces PG `input` legality in `validateInputLegality` (`tools/validators/src/structural/state-snapshot-integrity.ts` line 175-211). The current rule carves out exactly three event kinds for both-null inputs:

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

For `event_kind: turn_resolution`, the rule requires exactly one of `choice_id` / `manual_action_text` non-null — there is **no carve-out for non-player drivers**. An honest `advance_initiative` turn (`SE.turn_driver.kind: npc_action`, both PG input fields null) hits `state_snapshot_integrity.pg_input_legality_violation` at dry-run.

The contradiction was hit empirically during a red-bunny PG-5 turn-cycle exercise. The author had to hack around the validator by stuffing the player's `advance_initiative` directive into `manual_action_text` as a synthetic prose string (`"advance_initiative — let the non-player turn driver fire (Ane responds in her own register to Jon's pending offer)."`) so the validator would accept the page. This is dishonest: there was no player write-in; the player invoked an initiative-advance mode, not authored a player action. The audit trail now carries a synthetic player-action string that future consumers (health-audit, prose-attach) will read as if a player did write that text.

The correct fix is to teach `state_snapshot_integrity` what FOUNDATIONS already says: non-player drivers are first-class. A `turn_resolution` event whose `SE.turn_driver.kind` is one of the six non-player values legitimately has both `choice_id` and `manual_action_text` null, and the validator must accept that shape without forcing a synthetic player-input string.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** `tools/validators/src/structural/state-snapshot-integrity.ts` `validateInputLegality` (lines 175-211) treats every event kind other than `story_start | system_repair | audit_repair` as requiring exactly-one-source-action. The `turn_resolution` event_kind (defined in `tools/validators/src/schemas/story-event.schema.json` `event_kind.enum`) is the dominant non-bootstrap case and is currently unrecognized by the carve-out. Verified by reading the source.
2. **Specs/docs reassessment.** `.claude/skills/branching-story-turn-cycle/SKILL.md` lines 70-73 document `action_source_mode: advance_initiative` requiring both player-action fields absent. `references/phase-9-validation-gates.md` numbered check 1 says "Action source legality — XOR enforced ..." which is itself the older framing; the more accurate framing per the shared contract §6 is "exactly one source action UNLESS the event is `story_start` or has a non-player driver." `tools/validators/src/schemas/story-page.schema.json` (the JSON-schema for `PG.input`) currently has a docstring on `input`: `"Exactly-one legality is enforced by state_snapshot_integrity conditional on the resolved event kind, with a carve-out for event_kind: story_start."` This docstring undercounts the carve-outs (repair events also pass; non-player drivers must also pass after this ticket).
3. **Cross-skill / cross-artifact boundary.** The shared boundary is the validator's interpretation of PG `input` legality against the resolved `SE.event_kind` and `SE.turn_driver.kind`. The validator already loads the resolved SE via `maps.byId.get(resolvedEventId)` (line 190). Reading `SE.turn_driver.kind` from the resolved event's parsed body is an additive load — no new MCP call, no new IndexedRecord field. The PG-schema docstring is contract documentation; updating it keeps the contract narrative aligned with the validator behavior.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS §Story Bundles §5c ("Present Causal State, Not Narrative Shape") under the sub-heading "Driver salience is local" explicitly enshrines non-player drivers as first-class causal initiators: "Multi-source causality — player action plus active non-player pressure (NPC plans stepping, clocks firing, secrets reveal-ready, threads escalating, obligations falling due) — does not invite a global planner. Driver selection (which active record becomes this turn's causal initiator) is a *prior* local-salience-ranking pass before SLT selection." FOUNDATIONS also says "Silent rejection is forbidden" (story state contract §6, sourced from FOUNDATIONS §Story Bundles §4 Plan-Authority Boundary and §6b Information / Observer Firewall): every action including non-player initiative must produce an SE record. The validator's current rule effectively silently rejects honest non-player turns by demanding a synthetic player-input string — a violation of the spirit of "silent rejection is forbidden."
5. **HARD-GATE semantics impact.** The validator runs as part of the pre-apply gate (MCP `validate_patch_plan`) and the post-apply gate (patch engine). The fix tightens nothing on player-action turns (player_action / player_write_in still require exactly one source action). It correctly relaxes the rule for non-player-driver turns. Mystery Reserve firewall is unaffected — the validator under audit governs PG input shape, not mystery resolution.
6. **Extension consumer audit.** The PG `input` field is read by `state_snapshot_integrity` (this ticket's target), `branching-story-health-audit` (no behavior change required; health audit cares about replay equality, not input legality), and prose-attach receipts (also no change needed; receipts read PG.plan.plan_hash and PG.state_hash, not input). No other validator parses PG.input legality conditions. The schema docstring update is the only consumer-facing change to advertise the new contract.
7. **Adjacent contradiction surfaced.** The skill's `references/phase-9-validation-gates.md` currently says "Action source legality — XOR enforced" without naming the non-player-driver carve-out. This is the same contradiction expressed at the skill-prose layer rather than the validator layer. Classified as a **required consequence of this ticket** (the skill prose must align with the validator behavior). Updated in scope.
8. **Proof-surface reassessment.** `tools/validators/package.json` runs `npm test` as `npm run build && node --test dist/tests/**/*.test.js`; targeted acceptance must therefore build first and run the compiled `dist/tests/structural/state-snapshot-integrity.test.js`, not the source `.ts` file directly. Baseline `cd tools/validators && npm test` must pass before edits to establish the regression baseline.

## Architecture Check

1. **Minimal extension of an existing carve-out.** The current rule has a closed list of carve-out event kinds. Adding a conditional sub-rule for `turn_resolution` events with non-player `turn_driver.kind` is the smallest change that resolves the contradiction. Alternatives considered: (a) treat `advance_initiative` as an event_kind value (e.g., `turn_resolution_initiative`) — rejected because the shared contract §6 already establishes that `event_kind: turn_resolution` covers all turn resolutions and the distinction lives on `SE.turn_driver.kind`, not event_kind; conflating the two would require a wider schema change. (b) make the validator key off PG.input being both-null OR exactly-one and only validate when the event kind says something specific — rejected as it diffuses the rule rather than making it explicit. The cleanest fix reads `SE.turn_driver.kind` and applies the non-player carve-out symmetrically with the existing repair/start carve-outs.
2. **No backwards-compatibility aliasing/shims introduced.** Existing player-action and player-write-in PG records continue to validate (they have exactly one source action non-null; the rule for them is unchanged). Existing turn_resolution records with synthetic both-null+driver bodies that previously failed will now pass (this is the intended fix). No shim or alias is added; the validator simply learns one more legitimate input shape.
3. **Authentic audit trail.** The fix removes the need for authors to invent synthetic `manual_action_text` strings for non-player turns. After this ticket, an honest advance_initiative turn records `input.choice_id: null, input.manual_action_text: null`, and the SE's `turn_driver` carries the actual driver-record provenance. Health audit, prose-attach, and future replays see the truthful shape.
4. **Strengthened validation.** This ticket also adds a defensive rule the current validator does not enforce: **when `SE.turn_driver.kind` is player_action or player_write_in, the PG.input MUST have exactly one source action non-null** — explicit, driver-kind-keyed. The current rule infers this implicitly by elimination ("not story_start/repair, not non-player → must be exactly-one"); the new explicit rule catches a hypothetical bug where a player-driver event ships with both-null input. This closes a previously-implicit invariant.

## Verification Layers

1. **Codebase grep-proof** → `grep "npc_action\|offstage_action\|world_pressure\|clock_fire\|secret_reveal\|multi_actor_collision" tools/validators/src/structural/state-snapshot-integrity.ts` returns hits after the edit (currently returns nothing).
2. **Validator unit tests (positive)** → new test cases assert that `state_snapshot_integrity` returns no verdicts when `SE.event_kind: turn_resolution`, `SE.turn_driver.kind ∈ {npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision}`, and PG.input has both fields null. One test per driver kind (six tests).
3. **Validator unit tests (negative — non-player)** → new test cases assert that `state_snapshot_integrity` STILL returns the input-legality violation when `SE.event_kind: turn_resolution` and `SE.turn_driver.kind` is non-player but PG.input has one or both fields non-null (the carve-out is conditional on both-null, not "any shape allowed"). This guards against accidental overpermissiveness.
4. **Validator unit tests (negative — player)** → new test cases assert that `state_snapshot_integrity` REJECTS both-null input when `SE.event_kind: turn_resolution` and `SE.turn_driver.kind ∈ {player_action, player_write_in}`. This is the strengthened-validation companion check.
5. **Validator unit tests (preserved)** → existing carve-out tests for story_start / repair pages continue to pass. Existing rejection-of-exactly-one-source-action-for-non-story_start test continues to pass when the resolved event has no turn_driver (e.g., legacy `selected_choice` event_kind in test fixtures).
6. **Schema docstring alignment** → `tools/validators/src/schemas/story-page.schema.json` `input` description updated to enumerate all three carve-outs (story_start, repair events, non-player driver). Verified by inspecting the schema file post-edit.
7. **FOUNDATIONS alignment check** → FOUNDATIONS §Story Bundles §5c (Driver salience is local) plus story state contract §6 (Action Routing): non-player drivers produce honest `SE` records without forcing player-input synthesis. After this ticket, the validator behavior matches the contract.
8. **Skill dry-run** → re-running the red-bunny PG-5 turn-cycle with `PG-5.input.manual_action_text` set back to `null` passes the dry-run via `node tools/world-mcp/dist/src/cli/validate-patch-plan.js`.

## What to Change

### 1. `tools/validators/src/structural/state-snapshot-integrity.ts`

Update `validateInputLegality` (lines 175-211) to load `SE.turn_driver.kind` from the resolved event and apply the non-player carve-out plus the strengthened player-driver check. New control flow:

```ts
function validateInputLegality(
  page: IndexedRecord,
  parsed: Record<string, unknown>,
  pageLabel: string,
  maps: RecordMaps
): Verdict | undefined {
  const input = asPlainRecord(parsed.input);
  const choiceId = input.choice_id;
  const manualActionText = input.manual_action_text;
  const resolvedEventId = stringValue(input.resolved_event_id);

  if (resolvedEventId === undefined) {
    return inputLegalityViolation(page, pageLabel, "<missing>", "<missing>", choiceId, manualActionText);
  }

  const resolvedEvent = maps.byId.get(resolvedEventId);
  const eventParsed = asPlainRecord(resolvedEvent?.parsed);
  const resolvedEventKind = stringValue(eventParsed.event_kind);
  if (resolvedEvent === undefined || resolvedEventKind === undefined) {
    return inputLegalityViolation(page, pageLabel, resolvedEventId, "<unresolved>", choiceId, manualActionText);
  }

  const hasChoice = choiceId !== null && choiceId !== undefined;
  const hasManualAction = manualActionText !== null && manualActionText !== undefined;

  // Carve-out: story_start and repair events require both-null PG.input
  if (["story_start", "system_repair", "audit_repair", "prose_attach", "promotion_closeout"].includes(resolvedEventKind)) {
    if (!hasChoice && !hasManualAction) {
      return undefined;
    }
    return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
  }

  // turn_resolution path: split on turn_driver.kind
  if (resolvedEventKind === "turn_resolution") {
    const driver = asPlainRecord(eventParsed.turn_driver);
    const driverKind = stringValue(driver.kind);
    const NON_PLAYER_DRIVER_KINDS = new Set([
      "npc_action", "offstage_action", "world_pressure",
      "clock_fire", "secret_reveal", "multi_actor_collision"
    ]);
    const PLAYER_DRIVER_KINDS = new Set(["player_action", "player_write_in"]);

    if (driverKind !== undefined && NON_PLAYER_DRIVER_KINDS.has(driverKind)) {
      // advance_initiative-mode turn: both null is the canonical legitimate shape;
      // exactly-one-non-null is also legitimate when an emitted CHC or write-in
      // co-fires under non-player initiative (shared contract §6 leaves this open).
      // Reject only when both are non-null (XOR violated upward).
      if (hasChoice && hasManualAction) {
        return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
      }
      return undefined;
    }

    if (driverKind !== undefined && PLAYER_DRIVER_KINDS.has(driverKind)) {
      // Strengthened: explicit driver-kind-keyed exactly-one check for player drivers.
      if (hasChoice !== hasManualAction) {
        return undefined;
      }
      return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
    }

    // Fallthrough for turn_resolution with missing/unknown turn_driver.kind:
    // preserve the legacy exactly-one rule (this is also caught by
    // turn_driver_schema_compliance independently, so this branch is
    // a belt-and-suspenders guard).
    if (hasChoice !== hasManualAction) {
      return undefined;
    }
    return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
  }

  // Default: any other event_kind (legacy / unknown). Preserve exactly-one rule.
  if (hasChoice !== hasManualAction) {
    return undefined;
  }
  return inputLegalityViolation(page, pageLabel, resolvedEventId, resolvedEventKind, choiceId, manualActionText);
}
```

Also update the `inputLegalityViolation` `suggested_fix` string to enumerate the three carve-outs:

```ts
suggested_fix: "Follow shared story state contract §4.2 input legality: story_start, audit-only events (system_repair, audit_repair, prose_attach, promotion_closeout), and turn_resolution events with non-player turn_driver.kind use both-null input fields; turn_resolution events with player_action / player_write_in driver kind use exactly one source action."
```

(Note: `prose_attach` and `promotion_closeout` are audit-only event kinds per shared contract §4.3a; their PG.input legality has not been explicitly tested before because these events do not produce pages — but if they ever did, both-null is the only sensible shape. Including them in the carve-out is defensive.)

### 2. `tools/validators/src/schemas/story-page.schema.json`

Update the `input` field's `description` to enumerate all three carve-outs:

```json
"input": {
  "type": "object",
  "description": "Exactly-one legality is enforced by state_snapshot_integrity conditional on the resolved event kind and turn_driver.kind. Carve-outs (both-null required): event_kind ∈ {story_start, system_repair, audit_repair, prose_attach, promotion_closeout}, OR event_kind: turn_resolution with turn_driver.kind ∈ {npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision}. Player-driver turns (event_kind: turn_resolution with turn_driver.kind ∈ {player_action, player_write_in}) require exactly-one-source-action.",
  ...
}
```

### 3. `tools/validators/tests/structural/state-snapshot-integrity.test.ts`

Add the test cases described in Verification Layers §2-§4. Helper file `helpers.ts` may need a `turnDriver({kind, initiator, driver_records, ...})` factory if one does not already exist; inline turn_driver object literals are also acceptable.

Specifically add:
- One positive test per non-player driver kind (6 tests).
- Three negative tests for `turn_resolution + non-player driver + at least one input non-null + both inputs non-null`.
- Two negative tests for `turn_resolution + player_action / player_write_in + both null`.

### 4. `.claude/skills/_shared-templates/story-record-schemas.md` §4.2 (PG schema input docstring)

Mirror the schema docstring update to keep the shared contract aligned with the JSON schema. The schema's `input` `description` is the authoritative carve-out enumeration; the shared contract `# Input legality` comment block must say the same thing in prose.

### 5. `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`

Update the "Action source legality" gate prose to name the three carve-outs by name (currently says "XOR enforced; chosen CHC not retired" without naming the non-player carve-out). One-line update.

### 6. `.claude/skills/branching-story-turn-cycle/SKILL.md`

Verify lines 70-73 already document `advance_initiative requires both player-action fields absent`; if so, no edit needed. If they hedge or under-document the rule, tighten the language.

### 7. Rebuild

`cd tools/validators && npm run build` so `dist/` reflects the new validator behavior. Confirm `node tools/world-mcp/dist/src/cli/validate-patch-plan.js` picks up the rebuilt validators (the MCP CLI consumes the compiled `dist/`).

## Files to Touch

- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify docstring only)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify — add ~11 new tests)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify §4.2 input docstring prose)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify one-line gate description)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (verify language; tighten if needed)
- `tools/validators/dist/**` (rebuild artifact)

## Out of Scope

- Re-validating pre-existing PG records whose `input.manual_action_text` carries synthetic `advance_initiative` strings (such as the red-bunny PG-5 record just written under this validator's old behavior). They remain valid under both the old and new rules; future advance_initiative turns can use the honest both-null shape going forward.
- A separate validator that cross-checks the `turn_driver.kind` against the `manual_action_text` content for honesty (would catch a player-claimed write-in that was actually a non-player driver dressed up). Defer to a future ticket if empirical authoring drift is observed.
- Changing `event_kind` enum or `turn_driver` schema. The fix lives entirely in the input-legality validator and contract docstrings.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript compile + dist refresh completes cleanly.
2. `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js` — all existing tests pass plus the ~11 new tests (compiled path matches the `npm test` execution model).
3. `cd tools/validators && npm test` — full validator test suite passes with no regressions.
4. **End-to-end smoke**: prepare a sandbox copy of `/tmp/red-bunny-pg5-envelope.json` with `PG-5.input.manual_action_text` restored to `null` and recompute hashes; run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <sandbox-envelope>`; confirm `status: pass`. This proves the architectural contradiction is resolved against a real (post-rebuild) MCP CLI dry-run.
5. **Regression**: prepare a sandbox envelope with a turn_resolution event_kind, player_action turn_driver.kind, and both PG.input fields null; confirm `state_snapshot_integrity.pg_input_legality_violation` still fires. This proves the strengthened-validation companion check works.

### Invariants

1. **Honest input layer.** No turn produces an SE record that pretends a player wrote a string they did not write. Non-player drivers record null PG.input fields; the SE.turn_driver carries the driver-record provenance.
2. **Driver-kind-keyed legality.** The rule for PG.input legality on turn_resolution events is keyed off `SE.turn_driver.kind`, not inferred by elimination. Player drivers require exactly-one-source-action; non-player drivers admit both-null and (defensively) exactly-one.
3. **No silent rejection.** Per shared contract §6 ("Silent rejection is forbidden"), the validator never blocks an honest non-player turn by demanding a synthetic player-input string.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — append 6 positive tests (one per non-player driver kind: npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision) asserting empty verdicts when PG.input is both-null and SE.turn_driver.kind matches.
2. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — append 3 negative tests for over-permissiveness: non-player driver + both PG.input fields non-null (should fail); non-player driver + only choice_id non-null (should pass; defensive); non-player driver + only manual_action_text non-null (should pass; defensive). The "both non-null" case is the rejection target; the "only one non-null" cases prove the rule isn't too strict.
3. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — append 2 strengthened-validation tests: player_action driver + both null (should fail with input legality violation); player_write_in driver + both null (should fail with input legality violation).

### Commands

1. **Build:** `cd tools/validators && npm run build`
2. **Targeted (compiled):** `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js`
3. **Full suite:** `cd tools/validators && npm test`
4. **Post-build smoke (positive):** prepare sandbox red-bunny PG-5 envelope copy with `manual_action_text: null`, recompute hashes via `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, then `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <sandbox-envelope>` expecting `status: pass`.
5. **Post-build smoke (negative):** prepare a sandbox envelope with `turn_driver.kind: player_action` and both PG.input fields null; run `validate-patch-plan.js`; expect `state_snapshot_integrity.pg_input_legality_violation` to fire.
