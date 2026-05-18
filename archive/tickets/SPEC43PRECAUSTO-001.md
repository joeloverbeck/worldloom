# SPEC43PRECAUSTO-001: `intro:<CLASS>(...)` Tag Grammar + Closed Trigger Vocabularies

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/midstory-introduction-utils.ts` (parser + closed trigger vocabulary constants for 6 record classes); new §5a section in `.claude/skills/_shared-templates/story-state-contract.md` documenting the tag grammar + closed trigger vocabularies. No impact on existing `non-propagation-tag-shape.ts` (structurally parallel; not consumed).
**Deps**: None

## Problem

SPEC-43 introduces a new `intro:<CLASS>(...)` tag grammar carried in `SE.world_logic_rationale` to ground mid-story creation of `CLK` / `STSEC` / `STQ` / `THR` / `STENT` / `SREL` records with parseable evidence and closed-set triggers. The grammar must be documented in the shared story-state contract (so cross-skill consumers see one canonical reference) and exported as a parser utility (so the 6 class-specific introduction validators in tickets 003-009 can call `parseIntroTag()` rather than each re-implementing the parser). Without these two artifacts, every downstream ticket reinvents the parser and the closed trigger vocabulary fragments across files.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/structural/` follows a flat `<class>-utils.ts` convention (existing examples: `clock-utils.ts`, `secret-utils.ts`, `story-question-utils.ts`, `utils.ts`). No `_shared/` subdirectory exists. SPEC-43 §Deliverables originally cited `_shared/midstory-introduction-tag-parser.ts`; the corrected path is `tools/validators/src/structural/midstory-introduction-utils.ts` (mechanical-drift correction noted in Step 2 summary).
2. SPEC-43 §Approach B specifies the tag grammar + per-class closed trigger vocabularies; SPEC-43 §Deliverables originally cited `_shared-templates/story-state-contract.md` §4.5.X for the documentation site. The §4.5.X numbering convention lives in the sibling `_shared-templates/story-record-schemas.md` per the contract's pointer at line 67 (which enumerates §4.5.1 through §4.5.16 as record-class schemas, with SPEC-42 adding §4.5.14-16 for CLK/STSEC/STQ). The closed trigger vocabulary is structurally parallel to §5 "Closed Predicate DSL" (both are validator-readable closed grammars in `SE.world_logic_rationale` parseable text), so the correct insertion point is a new §5a sub-section in `story-state-contract.md` (mechanical-drift correction noted in Step 2 summary).
3. Cross-skill boundary under audit: `story-state-contract.md` §5a is consumed by 6 downstream validator tickets (003-009 reference the parser utility by import path; each cites the closed trigger vocabulary for its own class). `midstory-introduction-utils.ts` is consumed by the same 6 tickets + tickets 010-011 (narrative-shape-field-rejection + introduction-observer-firewall). The exported parser API is the load-bearing contract.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) restated: the `intro:<CLASS>(...)` tag rides on the existing `SE.world_logic_rationale` string field (verified at `_shared-templates/story-record-schemas.md:183, 208, 217`). No new schema field is introduced on any record class — the parseable-text pattern is structurally parallel to the existing `non_propagation:<reason>(group=<label>, records=[<record_ids>])` pattern at `non-propagation-tag-shape.ts:113-131`. The closed trigger vocabularies are validator-readable constants in TypeScript + documented enumerations in the contract; no new schema field is required to enforce the closed-set.
5. HARD-GATE / Canon Safety surface: the new utils file is consumed by validators that gate story-bundle record writes at engine pre-apply time (per `tools/validators/src/public/registry.ts` registration pattern, structural validators run before patch-engine commit). The exported `parseIntroTag()` API + closed trigger constants must therefore be deterministic (no I/O, no time-dependent state) so per-commit gating remains reproducible across runs. Mystery Reserve firewall is not affected by this ticket (no MR records read or written); preserved via downstream ticket 005's STSEC introduction grounding integrity.

## Architecture Check

1. Cleaner than alternative #1 (embed parser in each validator): six validator tickets re-implementing the same tag parser would duplicate grammar logic across files, leaking inconsistency risk every time the grammar evolves. Centralizing in `midstory-introduction-utils.ts` means one parser implementation tested once; the 6 class-specific validators import a typed result.
2. Cleaner than alternative #2 (extend `non-propagation-tag-shape.ts` to also parse intro tags): `non-propagation-tag-shape.ts` is a Validator object that gates non-propagation tag well-formedness at the SE record level. Mid-story introduction tags are consumed by 6 different validators (each gating a different record class) plus 2 cross-class validators. Centralizing in a utility (not a validator) lets the consumers compose the parser into their own gating logic without coupling to `non-propagation-tag-shape.ts`'s reason-list closed set.
3. No backwards-compatibility aliasing/shims introduced: the new utility module is purely additive. The new §5a contract section is additive (no renumbering of §5 Closed Predicate DSL or any other section).

## Verification Layers

1. Parser well-formedness → codebase grep-proof: `grep -nE "parseIntroTag|MIDSTORY_TRIGGERS_(CLK|STSEC|STQ|THR|STENT|SREL)" tools/validators/src/structural/midstory-introduction-utils.ts` returns the exported API + 6 trigger constants.
2. Contract documentation parity → codebase grep-proof: `grep -n "§5a\|Mid-Story Introduction Tag Grammar" .claude/skills/_shared-templates/story-state-contract.md` returns the new section header.
3. Closed-set enforcement → schema validation (informal — TypeScript const arrays act as the closed-set source of truth; the §5a contract section is the cross-skill cross-reference).
4. FOUNDATIONS §5b alignment → FOUNDATIONS alignment check: no new schema fields added on any record class; the existing `SE.world_logic_rationale` string field carries the tag.

## What to Change

### 1. Create `tools/validators/src/structural/midstory-introduction-utils.ts`

Exports:
- `MidstoryIntroductionClass` type union: `"CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "SREL"`.
- Six `MIDSTORY_TRIGGERS_<CLASS>` const arrays (one per class), each enumerating the closed trigger vocabulary per SPEC-43 §Approach B:
  - `MIDSTORY_TRIGGERS_CLK`: `["deadline_declared", "pursuit_started", "exposure_accumulation_started", "faction_mobilized", "environmental_degradation_started", "mission_or_race_started", "staged_danger_became_trackable"]`
  - `MIDSTORY_TRIGGERS_STSEC`: `["lie_made_hidden_truth_branch_relevant", "hidden_truth_constrains_action", "clue_carrier_enters_play", "holder_access_changed", "protected_mystery_story_secret_needed"]`
  - `MIDSTORY_TRIGGERS_STQ`: `["promise_made", "explicit_question_raised", "unexplained_evidence_introduced", "affordance_setup_introduced", "open_decision_created"]`
  - `MIDSTORY_TRIGGERS_THR`: `["new_ongoing_causal_concern", "investigation_line_opened", "recovery_line_opened", "negotiation_line_opened", "mission_line_opened", "social_fallout_line_opened"]`
  - `MIDSTORY_TRIGGERS_STENT`: `["actor_enters_branch", "witness_needed", "information_source_enters", "pressure_driver_enters", "counterparty_enters", "choice_target_enters"]`
  - `MIDSTORY_TRIGGERS_SREL`: `["alliance_forms", "rivalry_forms", "debt_relation_forms", "authority_relation_forms", "trust_axis_becomes_relevant", "intimacy_axis_becomes_relevant", "hostility_axis_becomes_relevant"]`
- `ParsedIntroTag` type: `{ class: MidstoryIntroductionClass, recordId: string, trigger: string, evidence: string[], distinctFrom: string[] }`.
- `parseIntroTag(rationale: string): ParsedIntroTag | null` — returns `null` if the rationale contains no `intro:<CLASS>(...)` substring; throws `MidstoryIntroductionTagError` (exported) with a parseable message naming the malformed field on grammar violation.
- `extractIntroTags(rationale: string): ParsedIntroTag[]` — returns all `intro:*` tags found (a single SE may introduce multiple records in one event).

Grammar (regex form, exported as `INTRO_TAG_PATTERN` const for downstream test reuse):
```
intro:(CLK|STSEC|STQ|THR|STENT|SREL)\(id=([A-Z]+-(?:0|[1-9][0-9]*)), trigger=([a-z_]+), evidence=\[([A-Z0-9,\-]*)\], distinct_from=\[([A-Z0-9,\-]*)\]\)
```

Implementation should follow the structural pattern at `tools/validators/src/structural/non-propagation-tag-shape.ts:44-131` (read `SE.world_logic_rationale` via `stringValue()`, parse each tag substring, emit typed failure codes).

### 2. Add §5a "Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies" to `_shared-templates/story-state-contract.md`

Insert immediately after §5 "Closed Predicate DSL" (line 107) and before §6 "Action Routing" (line 199). Section content:

- One-paragraph introduction stating that the tag rides on `SE.world_logic_rationale` (parallel to non-propagation tags), is consumed by per-commit validators (Phase 9 of branching-story-turn-cycle), and uses a closed trigger vocabulary per class to prevent narrative-shape drift.
- Grammar block (regex form + worked example):
  ```
  intro_tag    := "intro:" class "(" args ")"
  class        := "CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "SREL"
  args         := id_arg "," trigger_arg "," evidence_arg "," distinct_arg
  id_arg       := "id=" record_id
  trigger_arg  := "trigger=" trigger_name
  evidence_arg := "evidence=[" record_id_list "]"
  distinct_arg := "distinct_from=[" record_id_list "]"
  record_id    := uppercase_id "-" positive_integer
  trigger_name := lowercase_snake_case (must match one of the closed-set values below per class)
  ```
- Worked example: `intro:CLK(id=CLK-12, trigger=deadline_declared, evidence=[SE-31,OBL-7,THR-9], distinct_from=[CLK-3])`.
- Per-class closed trigger vocabulary tables (6 mini-tables, one per class, listing each trigger + a one-line semantic gloss anchored in a present-causal event).
- Cross-reference: parser implementation lives at `tools/validators/src/structural/midstory-introduction-utils.ts`; per-commit validators consuming the grammar are documented at `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (generic) + per-class siblings.

### 3. No changes to `tools/validators/src/public/registry.ts` in this ticket

The utility module is not a Validator object; it exports parser + constants only. Ticket 003 (generic introduction grounding validator) is the first ticket to register a Validator consuming `parseIntroTag()`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `tools/validators/src/structural/midstory-introduction-utils.ts` (new)

## Out of Scope

- No new Validator object registered in `registry.ts` (deferred to ticket 003).
- No widening of CLK `linked_records[]` pattern (deferred to Wave 3 per spec §Out of Scope).
- No documentation in `story-record-schemas.md` (the contract's §4.5.X record-class subsections are unchanged; this is a §5-family contract addition).
- No changes to `non-propagation-tag-shape.ts` (structurally parallel but functionally independent).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "MIDSTORY_TRIGGERS_(CLK|STSEC|STQ|THR|STENT|SREL)" tools/validators/src/structural/midstory-introduction-utils.ts` returns 6 lines (one per closed-set constant).
2. `grep -n "parseIntroTag\|extractIntroTags\|INTRO_TAG_PATTERN\|MidstoryIntroductionTagError" tools/validators/src/structural/midstory-introduction-utils.ts` returns 4 named exports.
3. `grep -nE "^### §?5a" .claude/skills/_shared-templates/story-state-contract.md` returns the new section header (positioned between §5 and §6).
4. `grep -c "intro:" .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 (worked example present).
5. `npm test --prefix tools/validators` succeeds (current tests continue to pass; this ticket adds no new tests — they land per-class in tickets 003-011).

### Invariants

1. The `intro:<CLASS>(...)` tag grammar is documented in exactly one location (contract §5a) and implemented in exactly one location (`midstory-introduction-utils.ts`). Downstream validators import; they do not re-implement the parser or re-enumerate the closed trigger vocabularies.
2. Each per-class trigger vocabulary is closed — no escape hatch for "other" / "miscellaneous" / free-form triggers. Adding a new trigger requires editing both the const array AND the contract §5a table.

## Test Plan

### New/Modified Tests

1. `None — utility module + contract documentation; the parser exercise lands in ticket 003's tests via the generic introduction-grounding validator, and each per-class validator (tickets 004-009) re-exercises the parser through its own gating.`

### Commands

1. `npm test --prefix tools/validators` (full validator package test pass — confirms current tests survive the new utility addition).
2. `grep -nE "parseIntroTag|MIDSTORY_TRIGGERS_|INTRO_TAG_PATTERN" tools/validators/src/structural/midstory-introduction-utils.ts` (sanity grep that the named exports landed).

## Outcome

Completed: 2026-05-18

Implemented the additive mid-story introduction parser contract in `tools/validators/src/structural/midstory-introduction-utils.ts`. The utility exports the six closed trigger vocabularies, `INTRO_TAG_PATTERN`, `ParsedIntroTag`, `MidstoryIntroductionTagError`, `parseIntroTag()`, and `extractIntroTags()`. The parser returns `null` when no `intro:` tag is present, throws a parseable tag error for malformed tags, accepts whitespace around delimiters, validates record-id list shape, and rejects triggers outside the per-class closed vocabulary.

Added `.claude/skills/_shared-templates/story-state-contract.md` §5a with the grammar, regex witness, worked example, six per-class trigger tables, and parser/validator cross-references. No `tools/validators/src/public/registry.ts` changes were made; ticket 003 remains the first validator-registration owner.

## Verification Result

- `grep -nE "MIDSTORY_TRIGGERS_(CLK|STSEC|STQ|THR|STENT|SREL)" tools/validators/src/structural/midstory-introduction-utils.ts` returned exactly 6 closed-set constant export lines.
- `grep -n "parseIntroTag\|extractIntroTags\|INTRO_TAG_PATTERN\|MidstoryIntroductionTagError" tools/validators/src/structural/midstory-introduction-utils.ts` returned the 4 named export lines.
- `grep -nE "^### §?5a" .claude/skills/_shared-templates/story-state-contract.md` returned the §5a contract section header.
- `grep -c "intro:" .claude/skills/_shared-templates/story-state-contract.md` returned `4`, proving the worked example and grammar references are present.
- `git diff --check -- .codex/run-state/implement-spec-tickets.json .claude/skills/_shared-templates/story-state-contract.md tools/validators/src/structural/midstory-introduction-utils.ts archive/tickets/SPEC43PRECAUSTO-001.md` passed.
- `npm test --prefix tools/validators` passed: 416 tests, 416 pass, 0 fail.

## Deviations

- The shared contract section is headed `### §5a...` rather than `## 5a...` so the accepted proof command `grep -nE "^### §?5a"` remains exact while the section still sits between §5 Closed Predicate DSL and §6 Action Routing.
- The exported trigger constants use private backing arrays so the acceptance grep returns exactly one line per exported `MIDSTORY_TRIGGERS_<CLASS>` constant.
