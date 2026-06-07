# MSSREMOVE-004: Scrub manual-story-studio mentions from the `reassess-spec` skill (keep generalized rules)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — edits the `reassess-spec` skill prose (`SKILL.md` + two reference files). These are directly-editable skill files (not canon-write surfaces).
**Deps**: MSSREMOVE-003 is a soft dependency — one scrub site points at `docs/ID-ALLOCATION.md §Manual-story-scoped`, which MSSREMOVE-003 removes; landing 003 first avoids referencing a section that still exists. Either order is acceptable as long as both land.

## Problem

The `reassess-spec` skill treats Manual Story Studio as a first-class record family and cites it across multiple carve-outs, validation rules, and worked precedents. Per the removal goal, every MSS mention must go — **but the author has decided the generalized rules stay**: where a rule was later generalized (e.g., the "write-enabled-but-canon-fenced package" carve-out), excise only the MSS-specific worked-precedent sentences, ID-class lists, and file-path examples; preserve the rule itself for any future fenced package.

## Assumption Reassessment (2026-06-07)

1. The MSS mentions are confined to three files (`grep -rn "manual-story" .claude/skills/reassess-spec/`):
   - `.claude/skills/reassess-spec/SKILL.md` — 3 sites (around lines 200, 214, 220)
   - `.claude/skills/reassess-spec/references/codebase-validation.md` — 6 sites (around lines 52, 55, 118, 120, 152, 180)
   - `.claude/skills/reassess-spec/references/foundations-alignment.md` — 1 site (around line 53)
2. Each site is one of two kinds, requiring different handling:
   - **MSS-specific clause/bullet** (exists only because of MSS) → remove the clause; the surrounding canon-record / story-bundle general rules already carry the generalized guidance.
   - **General rule + MSS worked-precedent/example** → keep the rule statement, delete only the MSS worked-precedent sentence(s), ID-class enumeration, and `tools/manual-story-studio/...` file-path examples.
3. Per-site classification (verify each against current line content before editing — line numbers will drift as edits are applied top-to-bottom; edit bottom-to-top or re-grep between edits):

   | File | Site | Kind | Action |
   |---|---|---|---|
   | SKILL.md | §3.10 Structured-ID prefixes (~200) | MSS-specific clause | Remove the "Manual-story-studio ID classes (lowercase `m`-prefix …) … compares manual-story-studio prefixes against `docs/ID-ALLOCATION.md` …" sentence. Keep the canon-record and story-bundle prefix guidance. |
   | SKILL.md | §Source-document engagement checkpoint (~214) | general rule + MSS precedent | Keep the checkpoint rule; delete the "Worked precedent … SPEC-103 reassessment … `reports/manual-story-studio-first-iteration.md` …" example. |
   | SKILL.md | §Worked precedents block (~220) | general rule + MSS precedents | Keep the canonical emission-timing rule; remove the SPEC-102/103/104/110 reassessment worked-precedent enumeration (all MSS). |
   | codebase-validation.md | §Manual-story-studio record-field verification (~52) | MSS-specific bullet | Remove the entire bullet. The adjacent canon-record and story-bundle record-field bullets carry the generalized "verify fields against the schema-authoritative source" rule. |
   | codebase-validation.md | §Cross-spec field-name drift (~55) | general rule + MSS precedent | Keep the rule; delete the "Worked precedent: SPEC-104 reassessment … `tools/manual-story-studio/src/...`" example. |
   | codebase-validation.md | §Test-only public helper carve-out (~118) | general rule + MSS precedent | Keep the carve-out; delete the SPEC-106 / `lintBeatTemplateGuidance` worked precedent. |
   | codebase-validation.md | §Symmetric case: audit-widened gate (~120) | general rule + MSS precedent | Keep the rule; delete the SPEC-106 / `web/src/types/manual-story.ts` worked precedent. |
   | codebase-validation.md | §Write-enabled-but-canon-fenced carve-out (~152) | **general rule (KEEP)** + MSS precedent | Keep the full carve-out and its non-MSS read-only precedents (SPEC-87/88/96); delete only the SPEC-104 / `tools/manual-story-studio/` worked precedent and the parenthetical MSS fence example if it leaves the rule self-contained. |
   | codebase-validation.md | §Manual-story-studio ID classes doc-substitution (~180) | MSS-specific clause | Remove the clause; the §3.10 canon/story-bundle doc-substitution guidance stays. |
   | foundations-alignment.md | §Write-enabled-but-canon-fenced carve-out (~53) | **general rule (KEEP)** + MSS precedent | Keep the carve-out statement; delete the SPEC-100/SPEC-104 / `tools/manual-story-studio/` worked precedent and MSS-specific fence example. |

4. Cross-skill boundary: `reassess-spec` is the only skill carrying MSS prose — `grep -rln "manual-story" .claude/skills/` returns only this skill's three files. No `_shared-references/` or `_shared-templates/` file references MSS.

## Architecture Check

1. Preserving the generalized rules (especially the write-enabled-but-canon-fenced carve-out) retains reusable guidance for any future package with the same fence shape, while removing the now-dead MSS specifics. This is cleaner than deleting whole rules and re-deriving them later.
2. No "this rule formerly applied to manual-story-studio" stub or aliasing comment is left behind; excisions are clean and the surrounding prose must read coherently after removal.

## Verification Layers

1. Zero MSS residue in the skill -> `grep -rn "manual-story\|MANSTOSTU\|MSSUX\|mtemplate\|mchar\|lintBeatTemplateGuidance" .claude/skills/reassess-spec/` returns nothing.
2. Generalized rules preserved -> the write-enabled-but-canon-fenced carve-out still exists in both `codebase-validation.md` and `foundations-alignment.md` (grep for "write-enabled" / "canon-fenced" still hits); the §3.10 prefix rule, source-document checkpoint, cross-spec field-name drift, test-only helper carve-out, and audit-widened gate rules all still exist (grep their distinctive labels).
3. Prose coherence -> manual read of each edited region confirms no dangling "as above", broken enumerations, or orphaned sub-clauses after excision.

## What to Change

### 1. Edit `.claude/skills/reassess-spec/SKILL.md`

Apply the 3 SKILL.md actions from the Assumption Reassessment table.

### 2. Edit `.claude/skills/reassess-spec/references/codebase-validation.md`

Apply the 6 codebase-validation.md actions from the table.

### 3. Edit `.claude/skills/reassess-spec/references/foundations-alignment.md`

Apply the 1 foundations-alignment.md action from the table.

## Files to Touch

- `.claude/skills/reassess-spec/SKILL.md` (modify)
- `.claude/skills/reassess-spec/references/codebase-validation.md` (modify)
- `.claude/skills/reassess-spec/references/foundations-alignment.md` (modify)

## Out of Scope

- Re-writing the generalized rules with replacement non-MSS worked precedents — leaving a rule without a worked precedent is acceptable; do not invent examples.
- Archived spec/ticket history that mentions these rules — intentionally retained.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "manual-story\|MANSTOSTU\|MSSUX\|mtemplate\|mchar\|BeatTemplate\|lintBeatTemplateGuidance\|manual-stories" .claude/skills/reassess-spec/ && echo FAIL || echo OK` — no MSS-specific token remains.
2. `grep -rln "write-enabled\|canon-fenced" .claude/skills/reassess-spec/references/` returns both `codebase-validation.md` and `foundations-alignment.md` — the generalized carve-out survived.
3. Manual review confirms each edited region reads coherently (no orphaned clauses, no dangling cross-references).

### Invariants

1. The generalized validation rules and carve-outs remain present and self-contained; only MSS-specific specifics were removed.
2. No MSS token (`manual-story*`, lowercase-`m` ID classes, `BeatTemplate`/`CurrentContext`, MSS SPEC/ticket IDs, MSS file paths) remains in the skill.

## Test Plan

### New/Modified Tests

1. `None — skill-prose-only ticket; verification is grep-based plus manual coherence review.`

### Commands

1. `grep -rn "manual-story" .claude/skills/reassess-spec/`
2. `grep -rn "mtemplate\|mchar\|mbel\|mrel\|BeatTemplate\|lintBeatTemplateGuidance" .claude/skills/reassess-spec/`
