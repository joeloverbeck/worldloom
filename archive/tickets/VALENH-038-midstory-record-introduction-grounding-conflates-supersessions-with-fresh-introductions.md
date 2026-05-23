# VALENH-038: `midstory_record_introduction_grounding` no longer treats body-supersession creates as fresh introductions

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/midstory-record-introduction-grounding.ts`, `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts`, plus same-seam turn-cycle/shared-template prose that defines the validator contract.
**Deps**: none.

## Problem

Before this ticket, `midstory_record_introduction_grounding` (`tools/validators/src/structural/midstory-record-introduction-grounding.ts`) iterated `SE.state_delta.create[]` and demanded one `record_introductions[]` entry per created id whose class is in `INTRO_CLASSES` (`CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `STCHAR`, `SREL`, `STPLAN`, `STEMO`). The loop:

```ts
for (const createdId of createdIds) {
  const createdClass = introClassForId(createdId);
  if (createdClass === undefined) continue;
  const intro = introductionsByRecordId.get(createdId);
  if (intro === undefined || intro.class !== createdClass) {
    verdicts.push(missingIntroduction(event, createdId));
  }
}
```

The check was unconditional with respect to the created record's `supersedes:` field. A supersession (a new record file whose body carries `supersedes: <prior-id>` per shared contract §3) is structurally a `state_delta.create` entry, so the validator treated it identically to a fresh introduction. The skill prose at `.claude/skills/branching-story-turn-cycle/SKILL.md` §"SPEC-47 STPLAN / STEMO lifecycle duties" explicitly says "Mid-story **first** introductions of STCHAR, STPLAN, or STEMO require entries in `SE.record_introductions[]`" — "first" is the documented contract; before this ticket, the validator enforced "all creates."

The per-class trigger enums in `tools/validators/src/schemas/story-event.schema.json` make the consequence load-bearing: none of the eight non-STCHAR `INTRO_CLASSES` carries a supersession-shaped trigger. The full set (enumerated via `python3 -c "import json; print(json.load(open('tools/validators/src/schemas/story-event.schema.json'))['properties']['record_introductions']['items']['oneOf'])"`):

- `CLK`: `deadline_declared, pursuit_started, exposure_accumulation_started, faction_mobilized, environmental_degradation_started, mission_or_race_started, staged_danger_became_trackable` — every option ends in `_started` / `_declared` / `_mobilized` / `_became_trackable`; no `_advanced` / `_supersession` option.
- `STSEC`: `lie_made_hidden_truth_branch_relevant, hidden_truth_constrains_action, clue_carrier_enters_play, holder_access_changed, protected_mystery_story_secret_needed` — all fresh-introduction triggers.
- `STQ`: `promise_made, explicit_question_raised, unexplained_evidence_introduced, affordance_setup_introduced, open_decision_created` — all fresh-introduction triggers.
- `THR`: `new_ongoing_causal_concern, investigation_line_opened, recovery_line_opened, negotiation_line_opened, mission_line_opened, social_fallout_line_opened` — all fresh-introduction triggers (the "ongoing" wording in `new_ongoing_causal_concern` is the closest to a continuation but is still semantically "new").
- `STENT`: `actor_enters_branch, witness_needed, information_source_enters, pressure_driver_enters, counterparty_enters, choice_target_enters` — all fresh-introduction triggers.
- `SREL`: `alliance_forms, rivalry_forms, debt_relation_forms, authority_relation_forms, trust_axis_becomes_relevant, intimacy_axis_becomes_relevant, hostility_axis_becomes_relevant` — all fresh-introduction triggers.
- `STPLAN`: `tactical_approach_committed, resource_gained_enables_plan, blocker_requires_plan, pressure_forces_plan, opportunity_recognized, counterparty_plan_observed` — all fresh-introduction triggers.
- `STEMO`: `event_revealed_truth_to_actor, event_threatened_actor_or_charge, event_harmed_actor_or_charge, event_relieved_pressure_on_actor, event_violated_actor_principle_or_value, event_changed_relationship_with_other, accumulated_pressure_crossed_threshold` — all event-as-fresh-trigger shapes.
- `STCHAR` (the exception): `story_character_authority_distilled, story_character_authority_regenerated, story_local_character_authority_created` — `_regenerated` IS a supersession-shaped trigger. STCHAR is the lone class where the trigger enum admits a supersession.

Historical intake evidence: the PG-4 turn-cycle (`branching-story-turn-cycle --world_slug erotica-world --story_slug red-bunny --parent_page_id PG-3 --chosen_choice_id CHC-11`) committed CLK-1 → CLK-2 with `value 1 → 2` and threshold `"Full dark — the dog-walkers gone, the park empty"` firing. CLK-2 carries `supersedes: CLK-1` in its body, and SE-4.state_delta is `create: [BEL-10, BEL-11, CLK-2], supersede: [BEL-8, BEL-9, CLK-1]`. The first validate-patch-plan dry-run failed with `midstory_intro_missing_tag: SE-4 creates CLK-2 without a matching SE.record_introductions[] entry`. The operator added a `record_introductions[]` entry with trigger `environmental_degradation_started` to satisfy the validator — but the environmental degradation actually started at PG-1 with CLK-1, not at PG-4 with CLK-2. The SE-4.record_introductions[CLK-2] entry claims a fresh introduction that semantically never happened — the audit trail is structurally valid but semantically false.

Two paths exist to repair the contract:

- **Path A (validator skip)**: extend `midstory_record_introduction_grounding`'s `createdIds` loop with a "skip if the created record's body carries non-null `supersedes:`" condition, mirroring the documented "first introductions" contract. Lifecycle transitions (supersessions) keep using the standard create/supersede chain (`state_delta.create + state_delta.supersede + body.supersedes:`) which is already the canonical lifecycle marker per shared contract §3; the introduction-grounding validator stops conflating creates with first introductions.
- **Path B (schema extension)**: extend each non-STCHAR `INTRO_CLASSES` trigger enum with a supersession-shaped option (e.g., `clock_threshold_advanced`, `thread_state_advanced`, `secret_clue_state_changed`, `question_advancement`, `entity_role_changed`, `relationship_advanced`, `plan_lifecycle_advanced`, `emotion_lifecycle_advanced`). This is the per-class precedent STCHAR set; replicating it across the other 8 classes is invasive but allows explicit supersession labeling.

Path A is cleaner: the introduction-vs-supersession distinction is structural (the body's `supersedes:` field) and the lifecycle of supersessions is already governed by `no_story_state_in_place_mutation` + the standard supersede ops. The introduction-grounding validator's name and the SKILL prose's "first introductions" contract both name the narrower scope. Path B is an alternative but multiplies the surface area without resolving the contract drift — operators still face a per-class enum-disambiguation step every supersession.

## Assumption Reassessment (2026-05-23)

1. **Codebase check.** At intake, `tools/validators/src/structural/midstory-record-introduction-grounding.ts` had 0 references to `supersedes` (verified via `grep -c "supersedes\|supersede"`); the `validateEvent` loop iterated `state_delta.create` and demanded a `record_introductions[]` entry for every id whose class is in `INTRO_CLASSES` (CLK, STSEC, STQ, THR, STENT, STCHAR, SREL, STPLAN, STEMO) with no body-shape gating. The test fixture at `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` did not exercise the supersession-create case; this ticket added that coverage.
2. **Doc check.** `.claude/skills/branching-story-turn-cycle/SKILL.md` §"SPEC-47 STPLAN / STEMO lifecycle duties" says "Mid-story **first** introductions of STCHAR, STPLAN, or STEMO require entries in `SE.record_introductions[]`" (emphasis on "first"). The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §3 documents the supersession mechanism (new file with `supersedes:` in body); §5a was truthed by this ticket to state the same first-introduction boundary. The skill prose contract and the pre-ticket validator enforcement disagreed.
3. **Shared boundary under audit.** The introduction-vs-supersession contract between (a) `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (enforcement), (b) `tools/validators/src/schemas/story-event.schema.json` `record_introductions[]` trigger enum (per-class trigger vocabulary), (c) `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/branching-story-bootstrap/SKILL.md` prose (the "first introductions" contract author), and (d) `.claude/skills/_shared-templates/story-state-contract.md` §3 (the supersession mechanism contract). This ticket aligns enforcement (a) with documented contract (c) + (d); the trigger enum (b) is left as-is (no per-class additions are needed under Path A).
4. **FOUNDATIONS principle restated.** `docs/FOUNDATIONS.md` §Story Bundles' append-only discipline distinguishes introduction (a concern becoming branch-relevant for the first time) from supersession (an existing concern's lifecycle advancing). The introduction-grounding validator's job is to ensure introductions cite their evidence and trigger; supersession-creates already cite their lineage through the body's `supersedes:` field plus the `state_delta.supersede[]` entry, so the introduction-grounding semantics do not apply. Conflating creates with first introductions imports a synthetic discipline FOUNDATIONS does not codify and the skill prose explicitly narrows away from.
5. **Adjacent contradictions surfaced during reassessment.** The per-class trigger enums in `tools/validators/src/schemas/story-event.schema.json` are inconsistent in supersession-vocabulary coverage: STCHAR includes `story_character_authority_regenerated` (an explicit supersession-shaped trigger), while every other `INTRO_CLASSES` member offers only fresh-introduction triggers. Under Path A (validator skip), this contradiction stops mattering at runtime (supersession-creates aren't required to carry `record_introductions[]` entries, so the missing supersession triggers in per-class enums become structurally irrelevant). Under Path B (schema extension) the contradiction would be resolved by adding supersession triggers to every class — out of scope for this ticket per the Architecture Check below. The contradiction is a separate-bug candidate only if a future change ever NEEDS supersession-shaped triggers per class (e.g., for finer-grained lifecycle audit categorization); for now it is downgraded to "future-cleanup-if-needed" and noted here for audit-trail completeness.
6. **Same-seam prose drift corrected before implementation.** Live reassessment found `.claude/skills/_shared-templates/story-state-contract.md` §5a and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` Gate 12 still stated the old all-created-records introduction requirement, while `.claude/skills/branching-story-turn-cycle/SKILL.md` already narrowed the duty to "first introductions." This ticket therefore owns those active contract-prose updates alongside the validator/test change; the sibling `branching-story-turn-cycle/SKILL.md` line remains unchanged because it is already correct.
7. **Baseline proof.** Pre-edit `cd tools/validators && npm test` passed on 2026-05-23 with 908 passing tests, so the package acceptance lane was green before this change.

## Architecture Check

1. **Validator skip is structurally cleaner than schema extension.** The introduction-vs-supersession distinction lives in the body's `supersedes:` field, which is already the canonical lifecycle marker per shared contract §3. The landed "skip if body.supersedes is non-null" condition aligns enforcement with the skill prose's "first introductions" contract. Schema-side fixes (Path B) would require per-class trigger-enum additions across 8 classes, each with its own naming-convention question, and leave every supersession event-author with a per-create-id disambiguation step that the cleaner architecture does not need.
2. **No backwards-compatibility shims.** The landed change tightens the validator's scope. Existing patches that DO carry `record_introductions[]` entries for supersession-creates continue to pass (the entries are now permitted-but-not-required); existing patches that DO NOT carry them (when the create body has `supersedes:` non-null) now also pass. No alias, no dual-read flag, no migration. The only behavior change is that the missing-introduction verdict no longer fires for supersession-creates.

## Verification Layers

1. **Supersession-create without `record_introductions[]` entry passes** → schema validation via new `midstory-record-introduction-grounding.test.ts` case: SE with `state_delta.create: [CLK-2], state_delta.supersede: [CLK-1]` and CLK-2 body carrying `supersedes: CLK-1` and SE without a `record_introductions[CLK-2]` entry → `verdicts: []`.
2. **Fresh-create without `record_introductions[]` entry still fails** → schema validation via existing `midstory-record-introduction-grounding.test.ts` cases continue to pass without modification (the new condition is additive — fresh creates with no `supersedes:` in body still trigger the missing-introduction verdict).
3. **Supersession-create WITH a `record_introductions[]` entry continues to pass** → schema validation via new test case: same as item 1 but with a `record_introductions[CLK-2]` entry present — `verdicts: []` (entries become permitted-but-not-required for supersession-creates; existing patches that carry them are not broken).
4. **Same-seam authoring prose no longer instructs the old all-creates rule** → manual review plus grep over `.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` confirms the contract now requires `record_introductions[]` for first introductions / fresh introductions, not supersession-creates.
5. **The PG-4 envelope (in-session-evidence target) re-validates clean without its SE-4.record_introductions[CLK-2] entry** → optional end-to-end smoke: edit the envelope at `/tmp/red-bunny-pg4-envelope.json` to remove the `record_introductions[]` entry for CLK-2; re-run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg4-envelope.json`; confirm the owned `midstory_intro_missing_tag` verdict is absent. If other current-state/historical-envelope validators fail, classify them separately rather than treating the historical envelope as the primary acceptance gate.

## Landed Changes

### 1. Added a supersession-skip condition to `midstory_record_introduction_grounding`'s `createdIds` loop

`tools/validators/src/structural/midstory-record-introduction-grounding.ts` now skips created ids whose indexed record body carries scalar `supersedes:`. Missing created records still fall back to the pre-existing fail-closed behavior and require `record_introductions[]`.

### 2. Extended `midstory-record-introduction-grounding.test.ts` with supersession-create cases

`tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` now covers supersession-create without an introduction, supersession-create with an introduction, and a fresh CLK create without an introduction still failing.

### 3. Truthed same-seam authoring and validation prose

`.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` now state that `record_introductions[]` is required for first/fresh introductions, while body-supersession creates are lifecycle transitions. The top-level turn-cycle `SKILL.md` line already said "first introductions" and was left unchanged.

## Files to Touch

- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (modify — add `supersedes:`-skip condition to the `createdIds` loop)
- `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` (modify — add three supersession-create test cases)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — clarify first introductions vs supersession-creates)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify — align Gate 12 prose with the validator's first-introduction scope)

## Out of Scope

- **Path B (per-class trigger-enum extension)**: not pursued. Path A resolves the contract drift with one validator-side change; Path B multiplies surface area without solving the underlying conflation. If a future change ever requires explicit supersession labeling per class (e.g., for finer-grained lifecycle audit categorization), the trigger-enum extension would be filed as a separate ticket once that need is concrete.
- **STCHAR's `story_character_authority_regenerated` trigger**: left in place. Path A's body-supersedes skip means STCHAR supersessions also stop requiring `record_introductions[]` entries; the existing trigger remains available for any author that chooses to carry one. No deprecation, no migration.
- **`record_introductions[]` schema changes**: out of scope. The schema continues to admit `record_introductions[]` entries; the validator stops demanding them for supersessions.
- **Top-level `branching-story-turn-cycle/SKILL.md` edits**: not needed. The top-level SKILL prose already says "first introductions." Same-seam shared-template / phase-reference prose that still stated the older all-creates rule is in scope and will be truthed by this ticket.
- **Repairing the existing SE-4.record_introductions[CLK-2] entry in `worlds/erotica-world/stories/red-bunny/_source/events/SE-4.yaml`**: the existing entry is structurally valid and remains harmless under the post-fix validator (entries become permitted-but-not-required). The semantic imprecision is recorded in this ticket as the in-session evidence; the entry itself does not need retroactive removal.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` — PASS, including the three new supersession-create cases (skip-without-entry, fresh-still-fails, skip-with-entry-also-passes).
2. `cd tools/validators && npm test` — PASS, full validator suite, no regression in any of the pre-existing midstory-introduction tests or in the broader fresh-create coverage.
3. Manual same-seam prose review / grep confirms the active authoring contract no longer tells operators that supersession-creates must carry fresh `record_introductions[]` entries.
4. Optional historical-envelope smoke was exercised. The checkout-local envelope now exits `status: "fail"` because current world state has expected ID allocation races (`SE-4`, `PG-4`, `CHC-13`-`CHC-16`, `BEL-10`/`BEL-11`, `CLK-2` are already stale allocations), but `midstory_record_introduction_grounding` reports `status: "pass"` and no `midstory_intro_missing_tag` verdict is emitted for CLK-2.

### Invariants

1. The introduction-grounding validator's enforcement scope matches the documented "first introductions" contract: supersession-creates (records whose body carries non-null `supersedes:`) are exempt from the `record_introductions[]` requirement; fresh creates (records with `supersedes: null` or no `supersedes:` field) still require one entry per `INTRO_CLASSES` member.
2. Existing patches that carry `record_introductions[]` entries for supersession-creates continue to validate clean — the entries become permitted-but-not-required, not forbidden. This preserves audit-trail content authors have already committed to disk (including the in-session SE-4.record_introductions[CLK-2] entry).
3. The per-class trigger enums in `story-event.schema.json` remain unchanged — Path A does not need them extended.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` — added three supersession-create cases (skip-without-entry, fresh-still-fails, skip-with-entry-also-passes); existing fresh-create cases remain unchanged. Rationale: the supersession-create branch of the validator was previously untested behavior (pre-fix the branch produced a false-positive fail; post-fix the branch must produce a clean pass).
2. None for the schema side (`tools/validators/src/schemas/story-event.schema.json` is unchanged in this ticket per Out of Scope item 3).

### Commands Run

1. Baseline: `cd tools/validators && npm test` — PASS before edits, 908 tests passed.
2. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` — PASS after edits, 12 tests passed.
3. Full-pipeline: `cd tools/validators && npm test` — PASS after edits, 911 tests passed.
4. Same-seam prose grep:
   ```bash
   rg -n 'Mid-story creation of `CLK`|every newly-created `CLK`|every newly created `CLK`|all creates|all-created|created records is recorded on `SE\.record_introductions\[\]`|must carry fresh `record_introductions\[\]`' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle archive/tickets/VALENH-038-midstory-record-introduction-grounding-conflates-supersessions-with-fresh-introductions.md
   ```
   No active prose hits outside the ticket's own historical/proof text.
5. Optional historical-envelope smoke: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg4-envelope-without-clk-intro.json` — exit 1 due to historical ID allocation races, with `midstory_record_introduction_grounding` status `pass`.

## Outcome

Completed: 2026-05-23.

Implemented Path A. `midstory_record_introduction_grounding` now treats an indexed created record with scalar `supersedes:` as a lifecycle transition and does not require a fresh `SE.record_introductions[]` entry for it. Fresh introductions still require structured entries, and supersession introductions remain permitted if an existing patch carries one.

Same-seam authoring and validation prose now matches that behavior in the shared story-state contract and the turn-cycle Phase 9 gate reference.

## Verification Result

Passed:

1. `cd tools/validators && npm run build && node --test dist/tests/structural/midstory-record-introduction-grounding.test.js` — 12/12 tests passed.
2. `cd tools/validators && npm test` — 911/911 tests passed.
3. Same-seam prose grep over the shared template and Phase 9 reference found no remaining active all-creates introduction wording; remaining hits are the ticket's labelled historical/proof text.

Optional smoke:

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg4-envelope-without-clk-intro.json` exited 1 because the historical envelope has stale ID allocations against current `red-bunny` state. The owned validator row was `midstory_record_introduction_grounding: pass`, and no `midstory_intro_missing_tag` verdict appeared.

## Deviations

1. The active shared-template and Phase 9 reference prose were added to the file set during reassessment because they still stated the old all-creates requirement. The top-level `branching-story-turn-cycle/SKILL.md` was inspected and left unchanged because it already says "first introductions."
2. The checkout-local PG-4 envelope smoke is not a clean `status: "pass"` acceptance gate anymore because the historical envelope's expected IDs are stale after PG-4 landed. It remains supporting evidence for the owned validator only.
