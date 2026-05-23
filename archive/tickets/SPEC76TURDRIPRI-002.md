# SPEC76TURDRIPRI-002: Contract amendments — Gate 9 + §7a turn-driver section + §16a label tightening

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md`, `docs/FOUNDATIONS.md`, and `tools/validators/src/structural/validation-trace-shape-compliance.ts` (shared story state contract + existing validation-trace gate-shape validator)
**Deps**: archive/tickets/SPEC76TURDRIPRI-001.md

## Problem

The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` is authoritative for story-bundle record schemas per FOUNDATIONS §Story Bundles §5b. With SPEC76TURDRIPRI-001 landing the new `turn_driver` field on the SE record and per-`kind` constraints, the contract must (a) document the new `turn_driver` shape and collapsed `event_kind` enum in §4, (b) introduce a new shared hard gate "Gate 9: Turn-Driver Lawfulness" in §7 (joining the existing 8 gates), (c) introduce a required §7a "Turn driver / initiative trace" section in §8 page-plan structure with an active-pressure disposition table, and (d) tighten §16a STCHAR packet labels to a closed vocabulary that fails on unknown labels (current behavior at line 519 warns).

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/_shared-templates/story-state-contract.md` currently has §4 record schemas at lines 70-76 (cross-referencing the sibling `story-record-schemas.md` template); §7 shared hard gates at lines 391-404 with exactly 8 named gates (input legality / parent snapshot compatibility / mystery / invariant firewall / branch isolation / append-only delta / consequence capacity or terminal proof / plan grounding / canon promotion hold); §8 page-plan structure at lines 408-550 with 19 numbered sections plus optional §9b/§9c/§10b; §16a STCHAR packet labels at line 519 emits a warning on unknown labels (verified via reassess-spec Agent 2 in this session).
2. SPEC-76 §3.2 prescribes the contract amendments verbatim — Gate 9 ("Turn-Driver Lawfulness"), §7a section with required content lines + active-pressure disposition table, §16a tightening from warn → fail.
3. **Cross-skill / cross-artifact boundary**: this contract is consumed by all 8 story-pipeline skills (Skill Category 2c per FOUNDATIONS §Story Bundles §7) — `story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`. This ticket updates the shared contract and existing validation-trace shape validator. Skill-local phase prose that still says "8 shared hard gates" is intentionally left to SPEC76TURDRIPRI-008 and SPEC76TURDRIPRI-009 so the operational turn-cycle/bootstrap procedures move with their own tickets. The skills that produce or validate page plans (`branching-story-turn-cycle`, `branching-story-health-audit`, the page_plan_turn_driver_consistency validator in SPEC76TURDRIPRI-005) consume §7a's required content shape after their follow-up slices land.
4. **FOUNDATIONS principle**: §Story Bundles §4a (Plan-Authority Boundary) and §5c (Present Causal State, Not Narrative Shape — including the "Driver salience is local." extension landed by SPEC-78) jointly govern this ticket. §4a establishes that turn-driver lives on `SE` (causal event); page-plan §7a is a render-side projection of `SE.turn_driver`, validated for consistency by SPEC76TURDRIPRI-005 — the plan does not become a second state engine. §5c's "Driver salience is local" doctrine grounds Gate 9: driver-then-SLT selection is a prior local-salience-ranking pass before SLT selection, gated by Gate 9's lawfulness check.
5. **HARD-GATE semantics**: Gate 9 is a new shared hard gate added to §7. The eight existing gates remain unchanged; Gate 9 specifically requires every `turn_resolution` SE event to carry a well-formed `turn_driver` whose driver records are active on the parent page snapshot, and whose `pov_visibility` is consistent with the actor's information access per §6b (Observer Firewall). Gate 9 is enforced at page-plan commit by the structural validators landing in SPEC76TURDRIPRI-003 + SPEC76TURDRIPRI-004; this ticket establishes the contractual gate text, not the enforcement code. The §16a tightening from warn → fail is a behavior change on the existing `page_plan_stchar_packet_integrity` validator — **the validator source change LANDED INDEPENDENTLY before this ticket's contract amendment** (pattern (c) cross-spec follow-up per the SPEC-76 decomposition session 2026-05-23: `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` `unknown_role_label` emit site switched from `planWarn` to `planFail`; the `planWarn` helper removed as dead code; the test at `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` updated to assert `severity: "fail"`; all 972 validator tests pass). This ticket's contract amendment at line 519 of `_shared-templates/story-state-contract.md` (warn → fail) brings the contract documentation into alignment with the already-landed validator behavior; the validator code change does NOT need to be re-done as part of this ticket's implementation.
6. **Same-seam validator drift found during live reassessment**: `tools/validators/src/structural/validation-trace-shape-compliance.ts` still hard-codes the flat eight-key `PG.validation_trace` mapping and rejects extra keys. Because this ticket turns Gate 9 into a shared hard gate recorded on `PG.validation_trace`, the existing validator and its focused test must move in the same ticket; otherwise the amended contract would conflict with pre-apply validation immediately.
7. **Same-seam FOUNDATIONS drift found during live reassessment**: `docs/FOUNDATIONS.md` still references the "shared eight hard gates" in Story Bundle Rule 1, Mystery firewall enforcement, and §5c local-salience text. Because FOUNDATIONS wins over the shared contract, those count references must be updated to "nine" in the same contract amendment rather than left as conflicting current authority.

## Architecture Check

1. **Contract as authoritative source**: amending the shared contract first establishes the record-schema, gate, and page-plan-section shapes that downstream skills + validators consume. Per FOUNDATIONS §Story Bundles §5b, "skills must not add fields to those schemas without amending the contract first" — the contract amendment IS the precondition for the validators landing in SPEC76TURDRIPRI-003 through 006. Alternatives considered and rejected: (a) document Gate 9 only in `branching-story-turn-cycle/SKILL.md` — rejected, gate semantics are shared across all 8 story-pipeline skills and the contract is the canonical home; (b) defer §16a tightening to a future spec — rejected, SPEC-76 §3.2 explicitly raises it under the new contract.
2. **No backwards-compatibility aliasing**: §7 grows from 8 to 9 gates additively; §8 grows by a single new §7a section; §16a's warn→fail change is a behavior tightening, not a backwards-compatible deprecation path.

## Verification Layers

1. **Invariant**: §4 documents the new `turn_driver` shape and collapsed `event_kind` enum → grep-proof against the contract file for the new field names + retired enum values absent from §4.
2. **Invariant**: §7 contains exactly 9 named gates (the original 8 + Gate 9: Turn-Driver Lawfulness) → manual review of §7 + count assertion.
3. **Invariant**: §8 introduces §7a "Turn driver / initiative trace" with the required content lines + active-pressure disposition table → grep-proof for the §7a header + the required content keys (`Driver kind:`, `Initiator:`, `Driver records:`, `Player response mode:`, `POV visibility:`, `Observer-firewall note:`).
4. **Invariant**: §16a documents the warn→fail upgrade on unknown `Required because:` labels → grep-proof for the updated §16a paragraph's wording change.
5. **Invariant**: Gate 9's enforcement surface is named in the contract text → cross-reference to the structural validators landing in SPEC76TURDRIPRI-003 + SPEC76TURDRIPRI-004.

## Landed Changes

### 1. §4 — Documented the new `turn_driver` shape and collapsed `event_kind` enum

Updated the sibling `story-record-schemas.md` template that the main contract's §4 points to. The SE record now documents the collapsed `event_kind` enum, `turn_driver` object required for `turn_resolution`, extended `selection_source` enum, and the per-kind authoring constraints.

### 2. §7 — Added Gate 9: Turn-Driver Lawfulness

After the existing eighth gate (canon promotion hold), the shared contract now includes:

```
| 9 | Turn-Driver Lawfulness | Every `turn_resolution` event carries a well-formed `turn_driver` whose driver records are active on the parent page snapshot, and whose `pov_visibility` is consistent with the actor's information access per §6b (Observer Firewall). Enforced by `turn_driver_schema_compliance` for cross-record-boundary constraints and `turn_driver_pov_observer_firewall` for POV access-route consistency at page-plan commit. |
```

Updated same-seam gate-count references in the shared contract and FOUNDATIONS from eight to nine.

### 3. §8 — Introduced §7a Turn driver / initiative trace

Inserted a new §7a sub-section between page-plan §7 and §8. The section number §7a keeps the existing §8+ page-plan numbering stable. The landed content shape follows SPEC-76 §3.2:

```
### 7a. Turn driver / initiative trace

Required content (all lines must appear; values are page-author-supplied):

- Driver kind: <one of player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision>
- Initiator: <STENT-<integer> | player | world | system | unknown>
- Driver records: <comma-separated record ids; matches SE.turn_driver.driver_records>
- Player response mode: <initiates | responds | witnesses | chooses_continuation | none>
- POV visibility: <perceived_directly | inferred_from_trace | reported | discovered_after | withheld>
- Observer-firewall note: <one sentence on the access route for non-player drivers; "n/a" for player_action / player_write_in>

The SE.turn_resolution event's `world_logic_rationale` (an existing required field on SE) is the carrier for the driver-justification (the source-report `why_now` content folds into it per §3.1); §7a's `Driver kind:` and `Driver records:` lines together with `world_logic_rationale` form the complete driver provenance.

Active-pressure disposition (every high-urgency active record on parent PG.state_snapshot must appear in exactly one row):

| Record | Disposition | Reason / expiry |
|---|---|---|
| <ID> | selected | became this turn's driver |
| <ID> | deferred | <expires after PG-<integer> or condition> |
| <ID> | rejected | <one-sentence reason> |
```

Carve-out: §7a is omitted when SE-1 is `story_start` (driver-less) per SPEC76TURDRIPRI-009 (bootstrap skill).

### 4. §16a — Tightened `Required because:` label vocabulary to FAIL

Updated the §16a paragraph from "Labels outside the closed vocabulary emit a warning" to "Labels outside the closed vocabulary FAIL under the new contract." The already-landed `page_plan_stchar_packet_integrity` validator behavior remains aligned.

### 5. Validation-trace shape alignment

Updated `validation_trace_shape_compliance` and current-package fixtures so `PG.validation_trace` requires the ninth `turn_driver_lawfulness` gate key and no longer describes the shared mapping as eight-key.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.2 validation_trace and §4.3 SE shape live here)
- `docs/FOUNDATIONS.md` (modify — gate-count references only)
- `tools/validators/src/structural/validation-trace-shape-compliance.ts` (modify — require/allow the ninth shared hard-gate key)
- `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` (modify — focused validator fixture)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify — current validation_trace fixture)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — current validation_trace fixture)
- `tools/validators/tests/fixtures/midstory-introduction/compatibility/legacy-snapshot.yaml` (modify — current validation_trace fixture)

## Out of Scope

- The structural validators that enforce Gate 9's turn-driver semantics — ship in SPEC76TURDRIPRI-003 (`turn_driver_schema_compliance`) and SPEC76TURDRIPRI-004 (`turn_driver_pov_observer_firewall`). This ticket only updates the existing `validation_trace_shape_compliance` gate-key validator so `PG.validation_trace` can record the ninth gate.
- The page_plan_turn_driver_consistency validator that parses §7a — ships in SPEC76TURDRIPRI-005.
- The active_pressure_handling_discipline validator that enforces the §7a active-pressure table — ships in SPEC76TURDRIPRI-006.
- `page_plan_stchar_packet_integrity` validator source change (warn → fail) — out of scope; the validator's behavior is dictated by the contract text amended here; the validator's source code update lands in its own maintenance cycle or as a sibling follow-up if not absorbed elsewhere.
- Skill SKILL.md edits — ship in SPEC76TURDRIPRI-008/009/010.
- Schema JSON file changes — ship in SPEC76TURDRIPRI-001.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "\| 9 \| Turn-Driver Lawfulness|^### 7a\. Turn driver|Labels outside the closed vocabulary.*FAIL|turn_driver" .claude/skills/_shared-templates/story-state-contract.md` returns the Gate 9, §7a, §16a fail, and turn_driver contract hits.
2. `grep -nE "turn_driver_lawfulness|event_kind: story_start \| turn_resolution|selection_source: emitted_choice.*npc_initiative|turn_driver:" .claude/skills/_shared-templates/story-record-schemas.md` returns the §4 schema-template hits.
3. `rg -n "eight shared hard gates|8 shared hard gates|shared eight hard gates|eight hard gates|Eight Shared Hard Gates|flat eight-key|flat eight-gate|eight-key mapping|flat eight" docs/FOUNDATIONS.md .claude/skills/_shared-templates tools/validators/src/structural/validation-trace-shape-compliance.ts tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` returns no matches.
4. `grep -nE "Labels outside the closed vocabulary.*FAIL" .claude/skills/_shared-templates/story-state-contract.md` returns at least 1 match.
5. `cd tools/validators && node --test dist/tests/structural/validation-trace-shape-compliance.test.js` passes after `npm run build`.
6. `cd tools/validators && npm test` passes.

### Invariants

1. The shared story state contract is the single authoritative source for story-bundle record schemas, hard gates, and page-plan structure; downstream skills + validators reference the contract rather than re-declaring conventions.
2. Gate 9 joins the existing 8 gates additively; no existing gate is renamed, renumbered, or removed.
3. §7a is the render-side projection of `SE.turn_driver`, validated for consistency by SPEC76TURDRIPRI-005 — preserving the §4a Plan-Authority Boundary.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` — focused validator fixture now accepts/requires the nine-key `PG.validation_trace` mapping.
2. `tools/validators/tests/integration/spec34-integration.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, and `tools/validators/tests/fixtures/midstory-introduction/compatibility/legacy-snapshot.yaml` — existing current-fixture surfaces updated with `turn_driver_lawfulness` gate entries so broad package validation remains green.

### Commands

1. `grep -nE "\| 9 \| Turn-Driver Lawfulness|^### 7a\. Turn driver|Labels outside the closed vocabulary.*FAIL|turn_driver" .claude/skills/_shared-templates/story-state-contract.md` — proves Gate 9, §7a, §16a fail wording, and turn_driver contract references.
2. `grep -nE "turn_driver_lawfulness|event_kind: story_start \| turn_resolution|selection_source: emitted_choice.*npc_initiative|turn_driver:" .claude/skills/_shared-templates/story-record-schemas.md` — proves the §4 schema-template update.
3. `rg -n "eight shared hard gates|8 shared hard gates|shared eight hard gates|eight hard gates|Eight Shared Hard Gates|flat eight-key|flat eight-gate|eight-key mapping|flat eight" docs/FOUNDATIONS.md .claude/skills/_shared-templates tools/validators/src/structural/validation-trace-shape-compliance.ts tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` — expected no matches; proves owned old-count/current-validator stale anchors are gone.
4. `cd tools/validators && npm run build && node --test dist/tests/integration/spec34-integration.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/validation-trace-shape-compliance.test.js` — focused validator/package proof; sandboxed run hit child-process EPERM for the CLI-spawning `spec34` file, then `node dist/tests/integration/spec34-integration.test.js` passed under escalation.
5. `cd tools/validators && npm test` — full validator suite; sandboxed run hit child-process EPERM in CLI-spawning integration tests, escalated rerun passed.

## Outcome

Completed: 2026-05-23

Implemented the SPEC-76 shared contract amendment. The main story state contract now names nine shared hard gates, adds Gate 9: Turn-Driver Lawfulness, adds §7a Turn driver / initiative trace, updates the page-plan minimum contract, and tightens §16a unknown `Required because:` labels to fail.

Updated the sibling record schema template with the `SE.turn_driver` authoring shape, the collapsed `event_kind` enum, the extended `selection_source` enum, and the ninth `PG.validation_trace.turn_driver_lawfulness` key. Updated FOUNDATIONS gate-count references so the authoritative contract no longer conflicts with the shared template. Updated the existing `validation_trace_shape_compliance` validator, its focused test, and current fixture surfaces so pre-apply validation requires the nine-key trace.

## Verification Result

- `grep -nE "\| 9 \| Turn-Driver Lawfulness|^### 7a\. Turn driver|Labels outside the closed vocabulary.*FAIL|turn_driver" .claude/skills/_shared-templates/story-state-contract.md` — PASS; found the Gate 9 row, §7a heading, §16a fail wording, and turn_driver contract references.
- `grep -nE "turn_driver_lawfulness|event_kind: story_start \| turn_resolution|selection_source: emitted_choice.*npc_initiative|turn_driver:" .claude/skills/_shared-templates/story-record-schemas.md` — PASS; found the validation_trace key and SE schema-template shape.
- `rg -n "eight shared hard gates|8 shared hard gates|shared eight hard gates|eight hard gates|Eight Shared Hard Gates|flat eight-key|flat eight-gate|eight-key mapping|flat eight" docs/FOUNDATIONS.md .claude/skills/_shared-templates tools/validators/src/structural/validation-trace-shape-compliance.ts tools/validators/tests/structural/validation-trace-shape-compliance.test.ts` — PASS; no stale owned-surface hits.
- `cd tools/validators && node --test dist/tests/structural/validation-trace-shape-compliance.test.js` — PASS; 5 focused tests passed.
- `cd tools/validators && npm test` — PASS under escalation after the sandboxed run hit `spawnSync /usr/local/bin/node EPERM` in CLI-spawning integration tests; 972 tests passed.

## Deviations

- Same-seam scope widened from documentation-only to include `validation_trace_shape_compliance` and current fixtures. Without that, the new ninth gate would be documented but rejected by pre-apply validation as an extra `PG.validation_trace` key.
- Same-seam scope widened to update `docs/FOUNDATIONS.md` gate-count references because FOUNDATIONS is authoritative over the shared contract.
- Active skill SKILL.md references to "8 shared hard gates" remain out of scope and are owned by SPEC76TURDRIPRI-008 / SPEC76TURDRIPRI-009 turn-cycle and bootstrap skill updates.
