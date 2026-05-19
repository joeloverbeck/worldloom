# SPEC49STPSTEINT-002: Expand CHC.grounded_in.records[] pattern to include STPLAN, STEMO, CLK, STSEC, STQ, STINT, SF

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-choice.schema.json` (modify), `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` (new), `.claude/skills/_shared-templates/story-record-schemas.md` (modify), `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify), `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify), `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
**Deps**: None

## Problem

At intake, `tools/validators/src/schemas/story-choice.schema.json` restricted `CHC.grounded_in.records[]` IDs to the regex `^(STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA)-[0-9]+$` — 9 record classes. The bootstrap and turn-cycle skill prose described choice-emission discipline that requires choices to cite the active plan, emotion, clock, secret, question, intention, or branch-local fact that materially grounds the option's availability or salience. The schema forbade what the contract recommended: choices grounded in active STPLAN (the actor's current tactical plan), STEMO (affective pressure making the option available), CLK (staged pressure), STSEC (hidden truth), STQ (open setup), STINT (active desire/goal), or SF (branch-local fact rather than belief) could not cite those records under the old pattern. This ticket closes SPEC-49 §A.2 by extending the pattern to include all 7 classes the choice-emission discipline names.

## Assumption Reassessment (2026-05-19)

1. At intake, `tools/validators/src/schemas/story-choice.schema.json` explicitly enumerated 9 classes with no STPLAN/STEMO/CLK/STSEC/STQ/STINT/SF entries.
2. SPEC-49 §Approach §A.2 (per the reassess-spec-updated spec) cites the audit report's Priority 0 must-do list item 4 *"Expand `CHC.grounded_in.records[]` to include `STPLAN`, `STEMO`, `CLK`, `STSEC`, `STQ`, `STINT`, and probably `SF`"* with per-class rationale. SPEC-42 introduced CLK/STSEC/STQ as classes; the audit confirms choice-grounding extension was overlooked at SPEC-42 landing.
3. Cross-skill boundary under audit: `CHC.grounded_in.records[]` is the contract between choice-emission skills (`branching-story-bootstrap` opening choices + `branching-story-turn-cycle` continuation choices) and the schema validator (`story-choice.schema.json` via AJV pre-apply gate). The schema is the authority; `branching-story-bootstrap/SKILL.md`, `branching-story-turn-cycle/SKILL.md`, and the turn-cycle `references/phase-8-choice-generation.md` prose teach the choice-grounding discipline. Expanding the schema requires mirror updates in those skill surfaces so the prose continues to match the enforced contract.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: choices that materially depend on active state must cite the grounding record; without schema support, the citation cannot be enforced and the dependency floats. SPEC-49 §FOUNDATIONS Alignment confirms this Rule 1 alignment.
5. Schema extension is additive-only: 7 new classes added to the regex pattern. Existing choices grounded in the original 9 classes (`STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA`) remain valid; no migration is required for existing CHC records.
6. Live reassessment correction: the drafted file list named only `branching-story-turn-cycle/SKILL.md`, but the detailed turn-cycle choice-emission contract lives in `branching-story-turn-cycle/references/phase-8-choice-generation.md`; this ticket owns the reference update as same-seam prose fallout.

## Architecture Check

1. Single regex extension at one schema location is the minimal-blast-radius approach. Alternative (introducing a separate enum constant referenced by the regex) would over-engineer a 7-class expansion that has no expected churn.
2. No backwards-compatibility aliasing introduced. The SPEC-49 D-CX.1 distributed migration-posture contract applies to A.1 / A.3 / B.3 / B.4 only — not A.2 — because choice-emission is a forward-looking contract; existing choices grounded in the original 9 classes remain valid without WARN/FAIL gating. The two skill SKILL.md updates ensure choice-emission discipline taught to operators matches what the schema enforces.

## Verification Layers

1. JSON schema validation: `story-choice.schema.json` must accept CHC records grounded in any of the 16 expanded classes (9 original + 7 new). Validator surface: AJV pre-apply gate.
2. Shared-contract conformance: `.claude/skills/_shared-templates/story-record-schemas.md` CHC schema section must list all 16 classes with per-class rationale lines. Validator surface: schema-completeness grep at health-audit time.
3. Skill-prose conformance: `.claude/skills/branching-story-turn-cycle/SKILL.md` choice-emission discipline, `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` detailed choice-emission reference, and `.claude/skills/branching-story-bootstrap/SKILL.md` opening-choice discipline must reference the expanded class list when teaching choice grounding. Validator surface: manual review at skill-update time + grep-proof at acceptance.

## Landed Changes

### 1. Extend `tools/validators/src/schemas/story-choice.schema.json` grounded_in.records pattern

Update line 66 from:
```json
"pattern": "^(STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA)-[0-9]+$"
```
to:
```json
"pattern": "^(STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA|STPLAN|STEMO|CLK|STSEC|STQ|STINT|SF)-[0-9]+$"
```

### 2. Mirror in `.claude/skills/_shared-templates/story-record-schemas.md` CHC schema section

Find the CHC schema section's `grounded_in.records[]` enumeration and add 7 new allowed-class lines paralleling the existing 9. Each new entry follows the existing one-line per-class rationale format:

```markdown
- `STPLAN-<integer>` — when the choice's availability or salience materially depends on the actor's current tactical plan.
- `STEMO-<integer>` — when the choice exists because of affective pressure (e.g., a `flee` option available only because of an active fear emotion).
- `CLK-<integer>` — when the choice is grounded in active staged pressure (clock tick or threshold).
- `STSEC-<integer>` — when the choice references a hidden truth or clue carrier.
- `STQ-<integer>` — when the choice grounds in an open setup or story question.
- `STINT-<integer>` — when the choice is grounded in the actor's active desire/goal.
- `SF-<integer>` — when the choice rests on a branch-local fact rather than a belief (use sparingly; prefer `BEL` when the choice is grounded in the actor's belief, even if the belief is true).
```

### 3. Update `.claude/skills/branching-story-turn-cycle/SKILL.md` and Phase 8 reference choice-emission discipline

The turn-cycle main skill and detailed Phase 8 reference now require materially grounded active plan (`STPLAN`), emotion (`STEMO`), staged pressure (`CLK`), hidden truth (`STSEC`), open setup (`STQ`), intention (`STINT`), or branch-local fact (`SF`) choices to cite the relevant record in `grounded_in.records[]`; the 16-class union allowed by `story-choice.schema.json` is the authoritative list.

Also update `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md`, which carries the detailed CHC emission contract loaded by the main skill.

### 4. Update `.claude/skills/branching-story-bootstrap/SKILL.md` opening-choice discipline

The opening-choice discipline now carries the same 16-class grounding rule adapted to `PG-1` choice emission.

## Files to Touch

- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — shared with ticket 001; different section, mechanical merge)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify — same-seam detailed choice-emission reference)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` (new)

## Out of Scope

- Modifying the CHC schema's other fields (e.g., `text`, `selected`, `consequence_visibility`). Only `grounded_in.records[]` regex is extended.
- Enforcing that every CHC must cite at least one ground-record — the spec preserves the existing "may be empty" allowance.
- Validating that the cited records are active at the emitting page — that's a separate validator (`choice_state_reference_dangling`) and is out of scope for SPEC-49 §A.2.
- Modifying the `branching-story-prose-attach` skill's `choice_consequence_visibility` subcheck.

## Acceptance Criteria

### Tests That Must Pass

1. A CHC fixture with `grounded_in: { records: ["STPLAN-1"], affordance_ordinals: [] }` validates successfully against `story-choice.schema.json`.
2. CHC fixtures grounded in each of the 7 new classes (STPLAN, STEMO, CLK, STSEC, STQ, STINT, SF) all validate successfully.
3. A CHC fixture with `grounded_in: { records: ["INVALID-1"], affordance_ordinals: [] }` fails schema validation with the regex-mismatch error.
4. The two SKILL.md updates and the detailed turn-cycle Phase 8 reference contain a literal string match for the choice-grounding discipline addition (grep-proof: `grep "16-class union" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/SKILL.md` returns 3 matches).

### Invariants

1. The 16 classes allowed by `story-choice.schema.json:66` match exactly the classes documented in `story-record-schemas.md` CHC schema section.
2. The 7-class expansion is purely additive — existing choices grounded in the original 9 classes remain valid; no CHC record migration is required.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts` — new focused schema-compliance test covering all 16 allowed `CHC.grounded_in.records[]` classes plus one invalid class.

### Commands

1. `(cd tools/validators && npm test)` (full validator suite)
2. Targeted: `(cd tools/validators && npm run build && node --test dist/tests/structural/record-schema-compliance-story-choice.test.js)`
3. Grep-proof for SKILL.md/reference updates: `grep -n "16-class union" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/SKILL.md` should return exactly 3 matches.

## Outcome

Completed: 2026-05-19

The CHC `grounded_in.records[]` schema now accepts the original 9 grounding classes plus STPLAN, STEMO, CLK, STSEC, STQ, STINT, and SF. The shared CHC contract, bootstrap opening-choice guidance, turn-cycle phase list, and turn-cycle Phase 8 reference now teach the same 16-class grounding rule. A focused schema-compliance test proves all 16 classes are accepted and an invalid class is rejected.

## Verification Result

1. `(cd tools/validators && npm run build)` — passed before and after source edits; the final build produced fresh `dist/` output.
2. `(cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-choice.test.js)` — passed; 2 tests, 2 pass.
3. `grep -n "16-class union" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/SKILL.md` — returned exactly 3 matches.
4. `(cd tools/validators && npm test)` — passed; 630 tests, 630 pass.

## Deviations

1. The drafted test plan named fixture files and a possible `chc-schema-compliance.test.ts`; live reassessment used the existing `record_schema_compliance` structural test pattern instead, adding `record-schema-compliance-story-choice.test.ts`.
2. The drafted file list named only `branching-story-turn-cycle/SKILL.md` for turn-cycle prose, but the detailed choice-emission contract is in `branching-story-turn-cycle/references/phase-8-choice-generation.md`; the reference was updated as same-seam fallout.
