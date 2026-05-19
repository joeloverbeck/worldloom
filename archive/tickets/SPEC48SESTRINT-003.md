# SPEC48SESTRINT-003: Refactor shared utility modules (drop parser re-exports + regex constants + rationale.includes shortcuts; expose typed readers)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — refactors 3 shared utility files in `tools/validators/src/structural/` (`midstory-introduction-utils.ts`, `stplan-utils.ts`, `stemo-utils.ts`); exposes new typed readers consumed by tickets 004-007
**Deps**: archive/tickets/SPEC48SESTRINT-001.md

## Problem

SPEC-48's clean-break design replaces the parseable tag grammar on `SE.world_logic_rationale` with three first-class structured fields. The 12 validators consuming the old grammar do so through three shared utility modules: `midstory-introduction-utils.ts` re-exports the parser's `extractIntroTags` / `parsePlanRelationTags` symbols + carries the 8 per-class trigger vocabularies; `stplan-utils.ts` carries local regex constants (`PLAN_CLOSURE_RELATION`, `PLAN_ADVANCES_RELATION`) that scan `world_logic_rationale` for plan-relation tags; `stemo-utils.ts` carries a `rationale.includes("plan_relation:")` shortcut at line 322. Without refactoring these utilities to expose typed readers over the new structured fields (ticket 001), the per-validator refactors in tickets 004-007 have no shared infrastructure to consume — each would have to inline its own structured-field read logic.

## Assumption Reassessment (2026-05-19)

1. **Current utility surface verified**: `tools/validators/src/structural/midstory-introduction-utils.ts:2-10` imports `MIDSTORY_TRIGGERS_BY_CLASS`, `MIDSTORY_TRIGGERS_CLK` through `MIDSTORY_TRIGGERS_THR`, `parsePlanRelationTags` from `@worldloom/world-index/parse/intro-tag-parser` and re-exports them (verified by Pre-Write Files-to-Touch existence check + the grep at SPEC-48 reassess-spec). `tools/validators/src/structural/stplan-utils.ts:24-25` defines local regex constants `PLAN_CLOSURE_RELATION` and `PLAN_ADVANCES_RELATION` that scan `SE.world_logic_rationale`. `tools/validators/src/structural/stemo-utils.ts:321-322` defines a function checking `rationale.includes("plan_relation:") || rationale.includes("non_propagation:")`.
2. **SPEC-48 D-B4/D-B5/D-B6 enumeration**: D-B4 specifies drop parser re-exports + keep per-class trigger constants as TS exports (for the schema-parity test) + expose typed reader `readSeIntroductions(event: StoryEvent): ParsedIntroduction[]` and matching readers for `state_relations[]` / `non_propagation_facts[]`. D-B5 drops `PLAN_CLOSURE_RELATION` and `PLAN_ADVANCES_RELATION`. D-B6 drops the `rationale.includes(...)` shortcut.
3. **Cross-skill boundary**: this utility refactor is consumed by tickets 004 (introduction-grounding refactor), 005 (plan-relation consumer refactor), 006 (expected-witness-coverage refactor), and 007 (non_propagation_facts_completeness validator). The typed readers are the shared contract those tickets consume; their argument and return shapes must match what those tickets need at compose-time.
4. **FOUNDATIONS §Story Bundles §5b (Schema-Minimalism)**: typed readers over structured fields enforce the load-bearing-only doctrine — each utility export has a named §5b-class consumer (the validator refactors in tickets 004-007 are the consumers). The 8 per-class trigger vocabularies are preserved as TS exports because they are the source of truth for the schema-vs-vocabulary parity test (added in this ticket).
5. **Canon Safety surface**: `midstory-introduction-utils.ts`, `stplan-utils.ts`, `stemo-utils.ts` all live under `tools/validators/src/structural/`. Modifying utility modules in that directory falls under the per-ticket-type granularity rule for structural validators — even though these are helpers rather than gate-firing validators, they are imported by gates and their refactor affects gate behavior at runtime. The change preserves all existing validator semantics (no firewall weakening; no Mystery Reserve exposure); typed readers expose the same data the parsed tags exposed, just through structured fields.
6. **Rename / remove**: regex constants `PLAN_CLOSURE_RELATION` + `PLAN_ADVANCES_RELATION` are removed from `stplan-utils.ts`; the `rationale.includes(...)` shortcut function in `stemo-utils.ts` is removed; `parsePlanRelationTags` re-export is dropped from `midstory-introduction-utils.ts` (the per-class trigger constants are KEPT as TS exports for the parity test, not removed). Blast radius for the removed symbols: every consumer in `tools/validators/src/structural/` that imported them needs the typed-reader migration in tickets 004-007. No `.claude/skills/` or `docs/` consumers exist (these are TypeScript-internal helpers).
7. **Same-seam proof fixture fallout**: after the utility helpers stopped parsing `world_logic_rationale`, three focused structural tests still encoded plan-relation evidence only as deprecated prose tags. These fixtures are part of this ticket's owned proof surface, not downstream validator implementation scope: `stplan-closure-status-requires-closure-event.test.ts`, `stplan-event-plan-relation-consistency.test.ts`, and `stemo-agency-effect-compatibility.test.ts` now express the same PASS/FAIL semantics through `SE.state_relations[]`.

## Architecture Check

1. **Typed readers as shared contract**: exposing `readSeIntroductions(event)`, `readSeStateRelations(event)`, `readSeNonPropagationFacts(event)` as the shared retrieval surface (in `midstory-introduction-utils.ts`) means each downstream validator's refactor is a 2-3 line change (replace parser-call with reader-call) rather than re-implementing structured-field iteration N times. Cleaner than per-validator inline structured reads: shared retrieval enforces the contract; per-validator inlining is duplication that drifts.
2. **Per-class trigger constants stay as TS exports**: the 8 vocabularies are also encoded in `tools/validators/src/schemas/story-event.schema.json` (per ticket 001) as `oneOf` branches, but the TS exports are kept for the schema-vs-vocabulary parity test (added in this ticket — `MIDSTORY_TRIGGERS_CLK.length === schemaTriggers.CLK.length` style assertion). Two source-of-truth representations are intentional: the schema is authoritative for runtime rejection at submit-time; the TS exports are authoritative for parity at build-time.
3. **No backwards-compatibility aliasing**: the parser re-exports are dropped outright; no shim re-export wrapping the typed reader is added. Consumers must migrate to the typed reader directly (tickets 004-007).

## Verification Layers

1. Parser re-exports dropped → grep proof: `grep -n "parsePlanRelationTags\|extractIntroTags" tools/validators/src/structural/midstory-introduction-utils.ts` returns zero matches AFTER refactor.
2. Per-class trigger constants preserved → grep proof: `grep -n "MIDSTORY_TRIGGERS_CLK\|MIDSTORY_TRIGGERS_STEMO" tools/validators/src/structural/midstory-introduction-utils.ts` returns ≥2 hits (the export declarations).
3. Regex constants removed → grep proof: `grep -n "PLAN_CLOSURE_RELATION\|PLAN_ADVANCES_RELATION" tools/validators/src/structural/stplan-utils.ts` returns zero matches AFTER refactor.
4. Rationale.includes shortcut removed → grep proof: `grep -n "rationale.includes" tools/validators/src/structural/stemo-utils.ts` returns zero matches for the `plan_relation:`/`non_propagation:` shortcut (any remaining `rationale.includes` calls are for unrelated reasons and must be inspected manually before commit).
5. Typed readers compile + run → `npm test --prefix tools/validators` builds via `tsc` cleanly; the new schema-vs-vocabulary parity test passes (covered in Test Plan).

## What to Change

### 1. Refactor `tools/validators/src/structural/midstory-introduction-utils.ts`

Drop the parser re-exports at line 2-12 (`MIDSTORY_TRIGGERS_*` constant re-exports are kept; `parsePlanRelationTags` re-export is dropped). Define three typed reader functions:

```typescript
export interface ParsedIntroduction {
  recordId: string;
  class: MidstoryIntroductionClass;
  trigger: string;
  evidence: string[];
  distinctFrom: string[];
  rationale?: string;
}

export interface ParsedStateRelation {
  relation: PlanRelation;
  targetRecord: string;
}

export interface ParsedNonPropagationFact {
  reason: string;
  group: string;
  records: string[];
}

export function readSeIntroductions(event: IndexedRecord): ParsedIntroduction[] { /* read SE.record_introductions[] from event.parsed */ }
export function readSeStateRelations(event: IndexedRecord): ParsedStateRelation[] { /* read SE.state_relations[] from event.parsed */ }
export function readSeNonPropagationFacts(event: IndexedRecord): ParsedNonPropagationFact[] { /* read SE.non_propagation_facts[] from event.parsed */ }
```

Keep the per-class `MIDSTORY_TRIGGERS_*` constant exports as TypeScript-side source-of-truth for the schema-parity test. Add a `PLAN_RELATIONS` TS export carrying the 7-value relation enum (migrated from the parser file before parser deletion in ticket 009).

### 2. Refactor `tools/validators/src/structural/stplan-utils.ts`

Remove the `PLAN_CLOSURE_RELATION` and `PLAN_ADVANCES_RELATION` regex constants at lines 24-25. Refactor the helper functions that used them (around lines 231-245 per the grep) to consume `readSeStateRelations(event)` from `midstory-introduction-utils.ts` instead. Preserve all existing helper-function signatures and behavior; only the internal mechanism changes from regex-scan-rationale to structured-field-read.

### 3. Refactor `tools/validators/src/structural/stemo-utils.ts`

Remove the `rationale.includes("plan_relation:") || rationale.includes("non_propagation:")` shortcut function at lines 321-322. Replace its callers with calls to `readSeStateRelations(event)` and `readSeNonPropagationFacts(event)` from `midstory-introduction-utils.ts`. Preserve all caller-side semantics: where the shortcut returned `true` for any plan_relation tag presence, the new check returns `true` when `readSeStateRelations(event).length > 0`; similarly for non-propagation.

### 4. Add schema-vs-vocabulary parity test

Add `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` asserting that each of the 8 `MIDSTORY_TRIGGERS_*` TS exports matches the corresponding `oneOf` branch in `tools/validators/src/schemas/story-event.schema.json` (ticket 001). The test parses the schema, extracts the per-class trigger enum lists, and compares each to the matching TS export by Set-equality. Same parity test for `PLAN_RELATIONS` and the schema's `state_relations.relation` enum, and for the 5-value non-propagation reasons and the schema's `non_propagation_facts.reason` enum.

## Files to Touch

- `tools/validators/src/structural/midstory-introduction-utils.ts` (modify)
- `tools/validators/src/structural/stplan-utils.ts` (modify)
- `tools/validators/src/structural/stemo-utils.ts` (modify)
- `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` (new)
- `tools/validators/tests/structural/stplan-closure-status-requires-closure-event.test.ts` (modify — same-seam fixture proof updated to structured `state_relations[]`)
- `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` (modify — same-seam fixture proof updated to structured `state_relations[]`)
- `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` (modify — same-seam fixture proof updated to structured `state_relations[]`)

## Out of Scope

- Per-validator refactors that consume the new typed readers (deferred to tickets 004-007).
- Parser file deletion (deferred to ticket 009).
- Closed-vocabulary expansion (per SPEC-48 §Out of Scope item 3 — new triggers / new relations / new reasons are future-spec work).
- Skill prose updates (deferred to ticket 011).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — build succeeds, all existing validator tests pass with no regression.
2. `node --test dist/tests/structural/midstory-vocabulary-parity.test.js` from `tools/validators/` after `npm run build --prefix tools/validators` — the new parity test passes for all 8 trigger classes + relation enum + non-propagation reasons.
3. Grep proof: `grep -n "PLAN_CLOSURE_RELATION\|PLAN_ADVANCES_RELATION" tools/validators/src/structural/stplan-utils.ts` returns zero matches.
4. Grep proof: `grep -n "rationale.includes.*plan_relation\|rationale.includes.*non_propagation" tools/validators/src/structural/stemo-utils.ts` returns zero matches.
5. Grep proof: `grep -n "parsePlanRelationTags" tools/validators/src/structural/midstory-introduction-utils.ts` returns zero matches.

### Invariants

1. Typed readers preserve the read-shape semantics of the symbols they replace — `readSeIntroductions(event).length` equals the count of structured-field entries (same as the count of parsed intro tags for any SE record carrying both representations during transition; under clean break, structured field is the only representation).
2. Per-class trigger vocabulary TS exports (`MIDSTORY_TRIGGERS_CLK` through `MIDSTORY_TRIGGERS_STEMO`) remain identical to the parser file's original definitions — this ticket migrates them as exports under `midstory-introduction-utils.ts`'s authority before the parser file itself is deleted in ticket 009.
3. No validator consuming the utilities sees behavioral drift — same inputs (now expressed as structured fields) produce same outputs (PASS/FAIL with same error messages, modulo the message-string update for ticket 004's `suggested_fix` rewrites).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` (new) — asserts TS-export ↔ JSON-schema parity for the 8 trigger classes + 7-value relation enum + 5-value non-propagation reason enum.
2. `tools/validators/tests/structural/stplan-closure-status-requires-closure-event.test.ts` (modified) — updates the closure-event pass fixture from deprecated tag prose to `state_relations[]`.
3. `tools/validators/tests/structural/stplan-event-plan-relation-consistency.test.ts` (modified) — updates advancing-event pass/fail fixtures from deprecated tag prose to `state_relations[]`.
4. `tools/validators/tests/structural/stemo-agency-effect-compatibility.test.ts` (modified) — updates the same-event explanation fixture from deprecated tag prose to `state_relations[]`.

### Commands

1. `npm test --prefix tools/validators` — full validator test suite (build + run).
2. `node --test dist/tests/structural/midstory-vocabulary-parity.test.js` from `tools/validators/` — focused parity proof.
3. `node -e "const utils = require('./tools/validators/dist/src/structural/midstory-introduction-utils.js'); console.log(Object.keys(utils).filter(k => k.startsWith('readSe') || k.startsWith('MIDSTORY_TRIGGERS') || k === 'PLAN_RELATIONS' || k === 'NON_PROPAGATION_REASONS').sort());"` — confirms the typed readers + preserved trigger constants + relation/reason enums are exported.
4. `grep -n "parsePlanRelationTags\|extractIntroTags" tools/validators/src/structural/midstory-introduction-utils.ts` — expected no-match exit 1.
5. `grep -n "PLAN_CLOSURE_RELATION\|PLAN_ADVANCES_RELATION" tools/validators/src/structural/stplan-utils.ts` — expected no-match exit 1.
6. `grep -n "rationale.includes.*plan_relation\|rationale.includes.*non_propagation" tools/validators/src/structural/stemo-utils.ts` — expected no-match exit 1.

## Outcome

Completed: 2026-05-19

Implemented the shared SPEC-48 utility seam:

- `tools/validators/src/structural/midstory-introduction-utils.ts` now owns the 8 mid-story trigger vocabularies, `PLAN_RELATIONS`, `NON_PROPAGATION_REASONS`, and typed readers for `SE.record_introductions[]`, `SE.state_relations[]`, and `SE.non_propagation_facts[]`.
- `tools/validators/src/structural/stplan-utils.ts` now reads closure and advancing relations through `readSeStateRelations(event)` instead of local plan-relation regexes.
- `tools/validators/src/structural/stemo-utils.ts` now treats same-event plan/non-propagation explanation as the presence of structured `state_relations[]` or `non_propagation_facts[]`, not tag substrings in `world_logic_rationale`.
- Added `tools/validators/tests/structural/midstory-vocabulary-parity.test.ts` and updated three STPLAN/STEMO focused fixtures so the utility consumers are exercised through structured fields.

Deviations:

- The ticket's narrowed parity command was replaced with a direct compiled test command because the package's `npm test` wrapper runs the full compiled suite rather than reliably narrowing by `--test-name-pattern`.
- Same-seam fixture updates were added after the first post-change full-suite run exposed three stale tag-prose fixtures. This did not widen into tickets 004-007; it only moved the proof fixtures for helper consumers touched by this ticket.

## Verification Result

- Baseline before edits: `npm test --prefix tools/validators` passed (`616` tests).
- `npm run build --prefix tools/validators` passed after implementation.
- `node --test dist/tests/structural/midstory-vocabulary-parity.test.js` passed from `tools/validators/`.
- Focused fallout tests passed: `node --test dist/tests/structural/stplan-closure-status-requires-closure-event.test.js`, `node --test dist/tests/structural/stplan-event-plan-relation-consistency.test.js`, and `node --test dist/tests/structural/stemo-agency-effect-compatibility.test.js`.
- Final full suite: `npm test --prefix tools/validators` passed (`617` tests).
- Negative grep proofs returned expected no-match exit 1 for parser re-exports in `midstory-introduction-utils.ts`, removed STPLAN regex constants in `stplan-utils.ts`, and deprecated `rationale.includes(...plan_relation/non_propagation...)` checks in `stemo-utils.ts`.
