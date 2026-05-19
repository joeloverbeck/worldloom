# SPEC48SESTRINT-010: Add CI gates — parser-deletion-completeness + skill-prose tag-syntax-absence

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds 2 CI test files under `tools/validators/tests/structural/`
**Deps**: archive/tickets/SPEC48SESTRINT-009.md

## Problem

SPEC-48 §Phase C D-C3 + D-C4 specify two CI gates that prevent regression after the clean break: (i) a parser-deletion-completeness test asserting no source file under `tools/`, `.claude/skills/`, or `docs/` imports from the deleted `intro-tag-parser.ts` path (or its successor old path); (ii) a skill-prose tag-syntax-absence test asserting no `.claude/skills/**/*.md` file contains the closed list of deprecated tag-syntax substrings (`intro:<CLASS>`, `intro:CLK(`, ..., `plan_relation:`, `non_propagation:`). The parser deletion landed in archive/tickets/SPEC48SESTRINT-009.md. The reassessment M1 finding refined D-C4's grep scope from `**/SKILL.md` to `**/*.md` to catch shared-template drift symmetrically — the gates must therefore cover SKILL.md + references/ + shared templates under `_shared-templates/`. Without these gates, future edits could re-introduce parser imports or deprecated tag-syntax in skill prose silently; CI would not catch the regression.

## Assumption Reassessment (2026-05-19)

1. **Test-path convention verified**: the actual test directory convention is `tools/validators/tests/structural/*.test.ts` (verified via `ls tools/validators/tests/structural/` at Pre-Write Files-to-Touch existence check). SPEC-48 D-C3 + D-C4 originally cited `tools/validators/src/structural/__tests__/*.test.ts` — this is mechanical drift per SPEC-30 precedent (the corrected `tests/` paths propagate silently per the §Codebase truth guardrail; the test files land under `tools/validators/tests/structural/`).
2. **SPEC-48 D-C3 + D-C4 enumeration**: D-C3 grep target is the closed set of import patterns referencing the deleted parser (`intro-tag-parser`, `extractIntroTags`, `parsePlanRelationTags`, `parseIntroTag`). D-C4 grep target is the closed list of deprecated tag-syntax substrings (per reassessment M1, the scope expanded from `SKILL.md` to `**/*.md` to catch shared-template drift).
3. **Cross-skill boundary**: the CI gates protect cross-skill conventions — the parser-deletion gate ensures no validator file or world-index file or skill reference file re-introduces a parser import; the skill-prose gate ensures no skill prose (SKILL.md or `_shared-templates/*.md` or `references/*.md`) re-introduces deprecated tag-syntax. Both gates are static-analysis CI tests, not runtime validators — they run as part of the validator-package test suite via `node --test`.

## Architecture Check

1. **Static-analysis CI gates as the regression backstop**: both gates run as `node --test` cases in the validator package's existing `npm test` flow. The gates execute `grep` (or equivalent JavaScript file-traversal + regex match) against the relevant tree and assert zero matches. Cleaner than relying on per-commit code review to catch regressions: structural enforcement at CI time prevents the drift from landing.
2. **No backwards-compatibility aliasing**: the gates have no tolerance for "legacy" parser imports or "transitional" tag-syntax in skill prose. The gates assert strict zero-match; any matches fail the test.

## Verification Layers

1. Both test files exist at the corrected paths → `test -f tools/validators/tests/structural/parser-deletion-completeness.test.ts && test -f tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts` returns success.
2. Tests pass on the post-archive/tickets/SPEC48SESTRINT-009.md tree → `npm test --prefix tools/validators` includes the new test files; both report PASS (zero matches found for the closed grep patterns).
3. Tests would fail if regression introduced → mutation-style test: temporarily add a deprecated import or tag-syntax substring in a test fixture; the corresponding CI gate fails. Revert. (Not landed; covered by manual verification during implementation.)

## What to Change

### 1. Create `tools/validators/tests/structural/parser-deletion-completeness.test.ts`

Static-analysis test asserting no source file under `tools/`, `.claude/skills/`, or `docs/` imports from `tools/world-index/src/parse/intro-tag-parser` or names its exported symbols (`extractIntroTags`, `parsePlanRelationTags`, `parseIntroTag`).

```typescript
import test from "node:test";
import assert from "node:assert";
import { execSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEPRECATED_PATTERNS = [
  "intro-tag-parser",
  "extractIntroTags",
  "parsePlanRelationTags",
  "parseIntroTag"
];

test("no source file imports from the deleted intro-tag-parser path", () => {
  for (const pattern of DEPRECATED_PATTERNS) {
    // Search source trees only; exclude dist/ build artifacts and node_modules
    const cmd = `grep -rn "${pattern}" tools/ .claude/skills/ docs/ \
      --include="*.ts" --include="*.js" --include="*.md" \
      --exclude-dir=dist --exclude-dir=node_modules 2>/dev/null || true`;
    const output = execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(
      output.trim(),
      "",
      `parser-deletion-completeness gate failed: pattern "${pattern}" still appears in source/skill/docs trees:\n${output}`
    );
  }
});
```

### 2. Create `tools/validators/tests/structural/skill-prose-tag-syntax-absence.test.ts`

Static-analysis test asserting no `.claude/skills/**/*.md` file contains the closed list of deprecated tag-syntax substrings.

```typescript
import test from "node:test";
import assert from "node:assert";
import { execSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEPRECATED_TAG_SUBSTRINGS = [
  "intro:<CLASS>",
  "intro:CLK(",
  "intro:STSEC(",
  "intro:STQ(",
  "intro:THR(",
  "intro:STENT(",
  "intro:SREL(",
  "intro:STPLAN(",
  "intro:STEMO(",
  "plan_relation:",
  "non_propagation:"
];

test("no skill prose (.claude/skills/**/*.md) contains deprecated tag-syntax substrings", () => {
  for (const sub of DEPRECATED_TAG_SUBSTRINGS) {
    const escaped = sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cmd = `grep -rn "${escaped}" .claude/skills/ --include="*.md" 2>/dev/null || true`;
    const output = execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(
      output.trim(),
      "",
      `skill-prose tag-syntax-absence gate failed: substring "${sub}" still appears in skill prose:\n${output}`
    );
  }
});
```

The closed substring list is the M1-refined scope per SPEC-48 D-C4: covers the 9 `intro:<CLASS>(` patterns + `plan_relation:` + `non_propagation:` (11 substrings total).

### 3. Verify gates pass on the post-archive/tickets/SPEC48SESTRINT-009.md tree

After both test files are created and `tools/world-index/src/parse/intro-tag-parser.ts` has been deleted (archive/tickets/SPEC48SESTRINT-009.md dependency), both gates report PASS. Any false-positive matches (e.g., the parser-deletion gate matching this very test file because it lists the patterns as test inputs) need careful exclusion logic — either exclude the test files themselves from the grep, or scope the test fixtures to clearly non-functional contexts so the substrings appear only in unambiguous test-data positions. **Implementation note**: the most robust exclusion is to grep with `--exclude-dir=tools/validators/tests/structural` and `--exclude tools/validators/tests/structural/parser-deletion-completeness.test.ts` etc., but care must be taken that the exclusion list itself doesn't grow unbounded; preferred alternative is to encode the patterns in the test file as base64 / split strings that don't textually match.

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
2. Both gates report PASS on the post-archive/tickets/SPEC48SESTRINT-009.md + post-ticket-011 tree (parser deleted + skill prose updated).
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
2. Manual verification (one-shot): introduce a temporary regression (add a `parsePlanRelationTags` reference to a test fixture) and confirm the parser-deletion gate fails; revert and confirm it passes. Symmetrically for the skill-prose gate. Not landed in the test suite; verifies the gate's catching behavior at one-time review.
