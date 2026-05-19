# SPEC48SESTRINT-004: Refactor 8 introduction-grounding validators to consume `SE.record_introductions[]`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — refactors 8 structural validators in `tools/validators/src/structural/`; retargets cross-package import at `midstory-record-introduction-grounding.ts`
**Deps**: 003

## Problem

SPEC-48 §Phase B specifies refactoring all validators that currently consume parseable `intro:<CLASS>(...)` tags via the `extractIntroTags` parser. The 8 introduction-grounding validators (6 per-class — clock / entity-pairing / relationship / secret / story-question / thread — + 1 unified `midstory-record-introduction-grounding.ts` + 1 cross-class `introduction-observer-firewall.ts`) are the largest consumer of the parser; without refactoring them, they continue to parse `world_logic_rationale` and the clean-break design fails (the new structured fields populate but the validators ignore them). The cross-package import at `midstory-record-introduction-grounding.ts:2` (`import { extractIntroTags } from "@worldloom/world-index/parse/intro-tag-parser"`) is particularly load-bearing: it must be retargeted to the new typed reader at `midstory-introduction-utils.ts` (ticket 003) before the parser file is deleted in ticket 009.

## Assumption Reassessment (2026-05-19)

1. **8 introduction-grounding validators verified**: `ls tools/validators/src/structural/ | grep introduction` returns exactly 8 files (per SPEC-48 reassessment I1's correction from "9" to "8"): `clock-introduction-grounding-integrity.ts`, `entity-introduction-status-pairing.ts`, `relationship-introduction-grounding-integrity.ts`, `secret-introduction-anchor-integrity.ts`, `story-question-introduction-grounding-integrity.ts`, `thread-introduction-grounding-integrity.ts`, `midstory-record-introduction-grounding.ts` (unified cross-class — SPEC-47 D-B6 extended this validator to recognize STPLAN/STEMO via `MIDSTORY_TRIGGERS_BY_CLASS`), `introduction-observer-firewall.ts` (cross-class firewall).
2. **SPEC-48 D-B1 enumeration**: replace parser-call sites with structured-field read sites via `readSeIntroductions(event)` from ticket 003's typed-reader API. Preserve every existing positive/negative test case (same inputs expressed structurally, same outputs). The Phase B preamble's M2-refined guidance applies: `suggested_fix` strings + `message` strings that reference the tag grammar verbatim MUST be rewritten to reference the structured-field form. Verified sites: `midstory-record-introduction-grounding.ts:209` (`"Carry every mid-story-created CLK/STSEC/STQ/THR/STENT/SREL/STPLAN/STEMO as a parseable intro:<CLASS>(...) tag in SE.world_logic_rationale"`).
3. **Cross-skill boundary under audit**: the 8 validators consume `SE.record_introductions[]` (extended by ticket 001 to the SE schema) via the typed reader `readSeIntroductions(event)` (added by ticket 003 to `midstory-introduction-utils.ts`). The cross-package import at `midstory-record-introduction-grounding.ts:2` is the load-bearing retarget — currently points at `@worldloom/world-index/parse/intro-tag-parser` (a soon-deleted module per ticket 009); after refactor, points at the local `midstory-introduction-utils.ts` typed reader. Without this retarget, ticket 009's parser deletion breaks the import.
4. **FOUNDATIONS Rule 7 (Preserve Mystery Deliberately)**: the `introduction-observer-firewall.ts` validator enforces the observer-firewall semantics that gate which actors can perceive newly-introduced records. The refactor preserves the existing firewall logic — only the read-mechanism changes (structured field instead of parsed tag); the firewall's PASS/FAIL semantics are identical. Verified by SPEC-48's FOUNDATIONS Alignment table: "the `introduction-observer-firewall.ts` validator continues to enforce observer-firewall semantics — refactored to read structured fields directly; no semantics change."
5. **Canon Safety surface**: all 8 files live under `tools/validators/src/structural/`. The per-ticket-type granularity rule for structural validators fires — these are gate-firing validators that fire at Phase 9 against SE records. Modifications must not weaken any Canon Safety check; the refactor preserves all existing PASS/FAIL semantics and only changes the read mechanism.

## Architecture Check

1. **Shared typed-reader as the read seam**: every validator imports `readSeIntroductions` (and where applicable, per-class trigger constants) from `midstory-introduction-utils.ts` — the same canonical retrieval surface — rather than each validator parsing its own slice of `world_logic_rationale`. Cleaner than per-validator parsing: one read seam, one schema source of truth, one parity test (ticket 003) keeping schema and TS exports aligned.
2. **No backwards-compatibility aliasing**: validators no longer fall back to parser invocations; if `SE.record_introductions[]` is absent on an event, the validator treats it as "no introductions" (consistent with the optional-field schema from ticket 001). No "try structured, fall back to parser" shim is introduced.

## Verification Layers

1. Parser imports removed → grep proof: `grep -rn "intro-tag-parser\|extractIntroTags" tools/validators/src/structural/` returns zero matches AFTER refactor.
2. Typed reader consumed → grep proof: `grep -rn "readSeIntroductions" tools/validators/src/structural/` returns ≥8 matches (one per refactored validator) AFTER refactor.
3. Validator regression coverage → `npm test --prefix tools/validators` passes with no test-case regression on the 8 refactored validators' existing positive/negative cases.
4. `suggested_fix` / `message` strings updated → grep proof: `grep -rn "intro:<CLASS>\\|intro:CLK\\|intro:STSEC\\|intro:STQ\\|intro:THR\\|intro:STENT\\|intro:SREL\\|intro:STPLAN\\|intro:STEMO\\|parseable intro" tools/validators/src/structural/` returns zero matches in production code (test fixtures may retain the strings for negative-case input only).
5. Observer-firewall behavior preserved → `npm test --prefix tools/validators -- --test-name-pattern=introduction-observer-firewall` passes with no regression.

## What to Change

### 1. Refactor `midstory-record-introduction-grounding.ts` — retarget cross-package import

Replace line 2's `import { extractIntroTags, type MidstoryIntroductionClass, type ParsedIntroTag } from "@worldloom/world-index/parse/intro-tag-parser"` with `import { readSeIntroductions, type ParsedIntroduction } from "./midstory-introduction-utils.js"` (and re-export `MidstoryIntroductionClass` from `midstory-introduction-utils.ts` per ticket 003 if not already). Replace the parser-call at line 78 (`tags = extractIntroTags(rationale)`) with `const introductions = readSeIntroductions(event)`. Rewrite the loop body to iterate `introductions[]` instead of `tags[]`. Update the `suggested_fix` string at line 209 from `"Carry every mid-story-created CLK/STSEC/STQ/THR/STENT/SREL/STPLAN/STEMO as a parseable intro:<CLASS>(...) tag in SE.world_logic_rationale."` to `"Carry every mid-story-created CLK/STSEC/STQ/THR/STENT/SREL/STPLAN/STEMO as a structured entry in SE.record_introductions[] (record_id, class, trigger, evidence, distinct_from)."`. Update the `message` string at line 180 similarly to reference structured fields instead of `intro:<CLASS>(...)` tags.

### 2. Refactor 6 per-class introduction-grounding validators

For each of:

- `clock-introduction-grounding-integrity.ts`
- `entity-introduction-status-pairing.ts`
- `relationship-introduction-grounding-integrity.ts`
- `secret-introduction-anchor-integrity.ts`
- `story-question-introduction-grounding-integrity.ts`
- `thread-introduction-grounding-integrity.ts`

Replace the parser-call site (if any — some of these may consume `midstory-introduction-utils.ts`'s re-exports rather than calling the parser directly) with `readSeIntroductions(event)` from `midstory-introduction-utils.ts`. Filter the returned `ParsedIntroduction[]` for the relevant class (CLK / STENT / SREL / STSEC / STQ / THR respectively). Preserve all existing PASS/FAIL semantics including class-specific trigger-vocabulary enforcement (now backed by the schema's `oneOf` per ticket 001 + the TS export parity test in ticket 003). Update any `suggested_fix` / `message` strings referencing tag-grammar to reference structured-field form.

### 3. Refactor `introduction-observer-firewall.ts` — cross-class observer-firewall gate

Replace the parser-call site with `readSeIntroductions(event)`. Iterate the returned introductions and apply the existing observer-firewall logic against each entry's `record_id`, `evidence[]`, and `distinct_from[]` fields (same shape as the parsed tag, just from a structured source). Preserve all existing firewall semantics — the validator's PASS/FAIL contract is unchanged; only the input shape changes from parsed-tag iteration to structured-field iteration. Update `suggested_fix` / `message` strings to reference structured-field form.

### 4. Re-run all 8 validator test suites with no regression

`npm test --prefix tools/validators` runs the full validator test suite, including all positive/negative cases for the 8 refactored validators. Verify that every existing test case continues to pass — the test inputs are updated where necessary to express the structured-field form (rather than the tag-grammar form), but the assertion outputs are unchanged.

## Files to Touch

- `tools/validators/src/structural/clock-introduction-grounding-integrity.ts` (modify)
- `tools/validators/src/structural/entity-introduction-status-pairing.ts` (modify)
- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (modify)
- `tools/validators/src/structural/secret-introduction-anchor-integrity.ts` (modify)
- `tools/validators/src/structural/story-question-introduction-grounding-integrity.ts` (modify)
- `tools/validators/src/structural/thread-introduction-grounding-integrity.ts` (modify)
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (modify)
- `tools/validators/src/structural/introduction-observer-firewall.ts` (modify)
- Per-validator test files at `tools/validators/tests/structural/` (modify — update test inputs to structured-field form; assertion outputs unchanged)

## Out of Scope

- Plan-relation consumer refactor (deferred to ticket 005).
- Expected-witness-coverage refactor (deferred to ticket 006).
- non-propagation-tag-shape replacement (deferred to ticket 007).
- World-index parser-consumer refactor at `atomic.ts` (deferred to ticket 008).
- Parser file deletion (deferred to ticket 009).
- Schema field changes (covered by ticket 001).
- Skill prose updates (deferred to ticket 011).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — full validator test suite, including 8 refactored validators, passes with zero regression.
2. Grep proof: `grep -rn "intro-tag-parser\|extractIntroTags" tools/validators/src/structural/` returns zero matches (no validator imports the parser).
3. Grep proof: `grep -rn "readSeIntroductions" tools/validators/src/structural/` returns ≥8 hits (one per refactored validator).
4. Grep proof: `grep -rn "parseable intro:\|intro:<CLASS>" tools/validators/src/structural/` returns zero matches in production code (test fixtures excluded).

### Invariants

1. Each refactored validator preserves its existing PASS/FAIL contract — same inputs (now expressed as structured fields) produce same verdicts (PASS / FAIL with same error codes and same severity).
2. The `introduction-observer-firewall.ts` validator continues to enforce observer-firewall semantics on every introduction; no Mystery Reserve entry is silently exposed; no actor's knowledge constraint is silently bypassed.
3. The cross-package import retarget at `midstory-record-introduction-grounding.ts:2` succeeds — the file no longer imports from `@worldloom/world-index/parse/intro-tag-parser`, enabling ticket 009's parser deletion without breaking this import.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/clock-introduction-grounding-integrity.test.ts` (modify) — update test inputs from tag-grammar form to structured-field form; assertion outputs unchanged.
2. `tools/validators/tests/structural/entity-introduction-status-pairing.test.ts` (modify) — same.
3. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` (modify) — same.
4. `tools/validators/tests/structural/secret-introduction-anchor-integrity.test.ts` (modify) — same.
5. `tools/validators/tests/structural/story-question-introduction-grounding-integrity.test.ts` (modify) — same.
6. `tools/validators/tests/structural/thread-introduction-grounding-integrity.test.ts` (modify) — same.
7. `tools/validators/tests/structural/midstory-record-introduction-grounding.test.ts` (modify) — same; verify `suggested_fix` / `message` string updates land.
8. `tools/validators/tests/structural/introduction-observer-firewall.test.ts` (modify) — same; verify firewall PASS/FAIL semantics preserved.

### Commands

1. `npm test --prefix tools/validators` — full test suite.
2. `grep -rn "extractIntroTags\|intro-tag-parser" tools/validators/src/structural/` — confirms zero matches AFTER refactor.
