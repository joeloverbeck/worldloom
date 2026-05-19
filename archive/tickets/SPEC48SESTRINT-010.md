# SPEC48SESTRINT-010: Add CI gates — parser-deletion-completeness + skill-prose tag-syntax-absence

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds 2 CI test files under `tools/validators/tests/structural/`
**Deps**: archive/tickets/SPEC48SESTRINT-009.md, archive/tickets/SPEC48SESTRINT-011.md

## Problem

SPEC-48 §Phase C D-C3 + D-C4 specify two CI gates that prevent regression after the clean break: (i) a parser-deletion-completeness test asserting no source file under `tools/`, `.claude/skills/`, or `docs/` imports from the deleted `intro-tag-parser.ts` path (or its successor old path); (ii) a skill-prose tag-syntax-absence test asserting no `.claude/skills/**/*.md` file contains the closed list of deprecated tag-syntax substrings (`intro:<CLASS>`, `intro:CLK(`, ..., `plan_relation:`, `non_propagation:`). The parser deletion landed in archive/tickets/SPEC48SESTRINT-009.md. The reassessment M1 finding refined D-C4's grep scope from `**/SKILL.md` to `**/*.md` to catch shared-template drift symmetrically — the gates must therefore cover SKILL.md + references/ + shared templates under `_shared-templates/`. Without these gates, future edits could re-introduce parser imports or deprecated tag-syntax in skill prose silently; CI would not catch the regression.

## Assumption Reassessment (2026-05-19)

1. **Test-path convention verified**: the actual test directory convention is `tools/validators/tests/structural/*.test.ts` (verified via `ls tools/validators/tests/structural/` at Pre-Write Files-to-Touch existence check). SPEC-48 D-C3 + D-C4 originally cited `tools/validators/src/structural/__tests__/*.test.ts` — this is mechanical drift per SPEC-30 precedent (the corrected `tests/` paths propagate silently per the §Codebase truth guardrail; the test files land under `tools/validators/tests/structural/`).
2. **SPEC-48 D-C3 + D-C4 enumeration**: D-C3 grep target is the closed set of import patterns referencing the deleted parser (`intro-tag-parser`, `extractIntroTags`, `parsePlanRelationTags`, `parseIntroTag`). D-C4 grep target is the closed list of deprecated tag-syntax substrings (per reassessment M1, the scope expanded from `SKILL.md` to `**/*.md` to catch shared-template drift).
3. **Cross-skill boundary**: the CI gates protect cross-skill conventions — the parser-deletion gate ensures no validator file or world-index file or skill reference file re-introduces a parser import; the skill-prose gate ensures no skill prose (SKILL.md or `_shared-templates/*.md` or `references/*.md`) re-introduces deprecated tag-syntax. Both gates are static-analysis CI tests, not runtime validators — they run as part of the validator-package test suite via `node --test`.
4. **Retargeted dependency ordering (2026-05-19)**: live grep over `.claude/skills/**/*.md` found deprecated tag-syntax owned by archive/tickets/SPEC48SESTRINT-011.md, including `plan_relation:` / `non_propagation:` / `intro:<CLASS>` references in story-pipeline skill prose and shared templates. Because this ticket's D-C4 gate is a strict zero-match test, it was not independently landable before ticket 011; the active dependency and harness queue were corrected to run ticket 011 first, then return to this gate ticket.
5. **Historical docs-plan exclusion**: live grep before implementation found deprecated parser/tag prose only in historical routing/design notes under `docs/plans/` (`2026-05-18-world-index-story-state-provenance-indexing-design.md`, `2026-05-19-spec47-followup-routing.md`). Those files are explicitly labelled archived design / triage recommendation rather than current operational contract. The parser-deletion gate therefore covers `tools/`, `.claude/skills/`, and current docs under `docs/` while excluding `docs/plans/` provenance notes; this preserves a strict current-contract CI gate without rewriting historical plan records.

## Architecture Check

1. **Static-analysis CI gates as the regression backstop**: both gates run as `node --test` cases in the validator package's existing `npm test` flow. The gates execute `grep` (or equivalent JavaScript file-traversal + regex match) against the relevant tree and assert zero matches. Cleaner than relying on per-commit code review to catch regressions: structural enforcement at CI time prevents the drift from landing.
2. **No backwards-compatibility aliasing**: the gates have no tolerance for "legacy" parser imports or "transitional" tag-syntax in skill prose. The gates assert strict zero-match; any matches fail the test.

## Verification Layers

1. Both test files exist at the corrected paths → `test -f tools/validators/tests/structural/parser-deletion-completeness.test.ts && test -f tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` returns success.
2. Tests pass on the post-archive/tickets/SPEC48SESTRINT-009.md tree → `npm test --prefix tools/validators` includes the new test files; both report PASS (zero current-contract matches found for the closed grep patterns; historical `docs/plans/` provenance notes are excluded from the parser-deletion gate).
3. Regression-catching behavior is encoded in the two static-analysis tests: each test reports the matching file, line, and deprecated pattern when a current-contract surface contains a forbidden parser reference or tag-syntax substring.

## Landed Changes

### 1. Created `tools/validators/tests/structural/parser-deletion-completeness.test.ts`

Static-analysis test asserts no current source, skill, or current-docs surface under `tools/`, `.claude/skills/`, or `docs/` references the deleted `intro-tag-parser` path or its retired exported symbols (`extractIntroTags`, `parsePlanRelationTags`, `parseIntroTag`). It excludes generated/package directories and historical `docs/plans/` provenance notes.

```typescript
import test from "node:test";
import assert from "node:assert";
// Implementation note: construct deprecated patterns from parts so the gate does not match its own test file.

test("no source file imports from the deleted intro-tag-parser path", () => {
  // Search source/current-contract trees only; exclude dist/, node_modules/, docs/plans/, and this test's pattern literals.
});
```

### 2. Created `tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts`

Static-analysis test asserts no `.claude/skills/**/*.md` file contains the closed list of deprecated tag-syntax substrings.

```typescript
import test from "node:test";
import assert from "node:assert";
// Implementation note: construct deprecated substrings from parts so the gate does not match its own test file.

test("no skill prose (.claude/skills/**/*.md) contains deprecated tag-syntax substrings", () => {
  // Search all markdown under .claude/skills/.
});
```

The closed substring list is the M1-refined scope per SPEC-48 D-C4: covers the 9 `intro:<CLASS>(` patterns + `plan_relation:` + `non_propagation:` (11 substrings total).

### 3. Verified gates pass on the post-archive/tickets/SPEC48SESTRINT-009.md + post-archive/tickets/SPEC48SESTRINT-011.md tree

`npm test --prefix tools/validators` passed after both test files were added. The tests construct deprecated patterns from string parts so they do not self-match, and the parser-deletion test excludes historical `docs/plans/` records that preserve old design/routing evidence.

## Files to Touch

- `tools/validators/tests/structural/parser-deletion-completeness.test.ts` (new)
- `tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` (new)

## Out of Scope

- Parser file deletion (covered by archive/tickets/SPEC48SESTRINT-009.md — this ticket's dependency).
- Validator refactor (covered by tickets 003-007).
- Schema field changes (covered by ticket 001).
- Skill prose updates (deferred to ticket 011 — without the prose updates, the skill-prose gate would fail on landing this ticket; coordinate landing order with ticket 011).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — full validator test suite passes, including the 2 new CI gates.
2. Both gates report PASS on the post-archive/tickets/SPEC48SESTRINT-009.md + post-archive/tickets/SPEC48SESTRINT-011.md tree (parser deleted + skill prose updated).
3. `test -f tools/validators/tests/structural/parser-deletion-completeness.test.ts && test -f tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` — both gate files exist at the corrected paths.

### Invariants

1. Both CI gates remain green for every future commit unless a regression is introduced; a regression deliberately re-introducing parser imports or deprecated tag-syntax requires updating the gate's closed pattern list and SPEC-48's audit-trail prose.
2. The gates scope to source / skill / docs trees only (`--exclude-dir=dist`, `--exclude-dir=node_modules`) — build artifacts that mirror source content are not subject to the gates.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/parser-deletion-completeness.test.ts` (new) — static-analysis gate asserting no deprecated parser imports remain in source / skill / docs trees.
2. `tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` (new) — static-analysis gate asserting no deprecated tag-syntax substrings remain in `.claude/skills/**/*.md`.

### Commands

1. `npm test --prefix tools/validators` — full validator test suite (includes the 2 new gates).
2. `git diff --check -- archive/tickets/SPEC48SESTRINT-010.md tools/validators/tests/structural/parser-deletion-completeness.test.ts tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` — whitespace hygiene for the owned tracked and newly added files.

## Outcome

Completed: 2026-05-19

Added the two SPEC-48 CI gates to the validator package. `parser-deletion-completeness.test.ts` fails if current source, skill, or current-docs surfaces reintroduce the deleted parser path or retired parser symbols. `skill-prose-tag-syntax-absence.test.ts` fails if `.claude/skills/**/*.md` reintroduces the closed deprecated tag-syntax list.

The ticket closeout also corrected the gate boundary for historical `docs/plans/` notes: those files still preserve old SPEC-45/SPEC-47 design provenance and are not treated as current operational contract.

## Verification Result

- `npm test --prefix tools/validators` passed: 622 tests, 0 failures. This includes the two new static-analysis gates after a fresh TypeScript build.
- `test -f tools/validators/tests/structural/parser-deletion-completeness.test.ts && test -f tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` passed.
- `git diff --check -- archive/tickets/SPEC48SESTRINT-010.md tools/validators/tests/structural/parser-deletion-completeness.test.ts tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` passed.

## Deviations

- The drafted parser-deletion gate searched every file under `docs/`; live reassessment found only historical `docs/plans/` design/routing records with deprecated parser prose. The landed gate excludes `docs/plans/` and still enforces zero matches across current source, skills, and current docs.
- The drafted implementation sketch used shell `grep` commands. The landed tests use JavaScript filesystem traversal, which avoids shell quoting issues and avoids self-matching by constructing deprecated strings from parts.
- The one-shot mutation-style manual verification was not performed; the regression behavior is covered by the test assertions that report any matching current-contract file/line/pattern.
