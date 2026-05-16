# SPEC36STOPIPNIN-001: Replace archive citation in validators README

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`

## Problem

At intake, `tools/validators/README.md:5` cited `**Design**: ../../archive/specs/SPEC-04-validator-framework.md` without a historical caveat. The ninth-iteration audit (`reports/story-related-improvements-ninth-iteration.md` §WL-N9-P2-004) flagged that current docs citing archive paths as design authority can resurrect stale specs in reader memory. SPEC-35 D9 set the precedent for archive-citation cleanup with the historical-note marker convention; this ticket extends the same discipline to the validators README.

## Assumption Reassessment (2026-05-16)

1. At intake, `tools/validators/README.md:5` read `**Design**: \`../../archive/specs/SPEC-04-validator-framework.md\`` with no historical caveat — verified by direct read of the file's first 20 lines. The archived spec at `archive/specs/SPEC-04-validator-framework.md` is a completed historical record, not the current design authority.
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D4 specifies the exact replacement text (`**Current authority**:` + 4 named current docs + a `Historical note:` paragraph). The SPEC-35 D9 precedent (`archive/specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` §D9) used the `(historical reference — superseded by <current authority>)` marker convention for the same problem in `docs/FOUNDATIONS.md`; this ticket adapts the convention for a README file by promoting it to a paragraph-level `Historical note:` instead of an inline parenthetical.
3. Cross-artifact boundary under audit: the validators README is the docs-side surface that orients readers to current authority for the validators package; the archived SPEC-04 is the historical-record-side surface that documents what was implemented. The fix preserves both by retaining the archive path under an explicit historical caveat while routing readers to current authorities.
4. FOUNDATIONS principle: §Read Discipline (current-source-over-archived) — the canonical authority for current behavior lives at `docs/FOUNDATIONS.md` + `.claude/skills/_shared-templates/story-state-contract.md` + `docs/MACHINE-FACING-LAYER.md` + current validator source under `tools/validators/src/`, not at archived spec files. The README must orient readers to those current sources.

## Architecture Check

1. Single-line replacement (one source line → a multi-line block with current authorities + historical caveat) is the minimum edit that closes the audit gap without touching the rest of the README's structure. Alternative — repo-wide doc-lint enforcing the historical-caveat rule — was explicitly deferred to a follow-up doc-hygiene spec per SPEC-36 §Risks & Open Questions (`(pragmatic — scope-doubling)` softening).
2. No backwards-compatibility aliasing/shims introduced; the archive path is retained in the historical-note paragraph for archaeological discoverability.

## Verification Layers

1. README no longer cites `archive/specs/` as design authority without historical caveat → codebase grep-proof: `grep -n 'archive/specs/' tools/validators/README.md` returns either zero hits OR every hit appears next to "archived prior art only" / "historical note" / "not current authority".
2. Cited current authorities resolve → file-existence grep-proof: `test -f docs/FOUNDATIONS.md && test -f .claude/skills/_shared-templates/story-state-contract.md && test -f docs/MACHINE-FACING-LAYER.md && test -d tools/validators/src/`.
3. Single-layer docs-only ticket; no behavioral or schema invariants to verify beyond the grep-proofs above.

## What to Change

### 1. Replaced the archive-citation line in `tools/validators/README.md`

Replaced line 5 (the `**Design**:` line) with the exact replacement block specified in SPEC-36 §D4:

- Remove: `**Design**: \`../../archive/specs/SPEC-04-validator-framework.md\``
- Insert (replacement block):
  - `**Current authority**: \`docs/FOUNDATIONS.md\`, \`.claude/skills/_shared-templates/story-state-contract.md\`, \`docs/MACHINE-FACING-LAYER.md\`, and the current non-archived validator source under \`tools/validators/src/\`.`
  - Blank line.
  - `Historical note: \`archive/specs/SPEC-04-validator-framework.md\` is archived prior art only. It is not current design authority.`

Preserve the surrounding `**Phase**:` and `**Status**:` lines unchanged.

## Files Touched

- `tools/validators/README.md` (modify)

## Out of Scope

- Repo-wide doc-lint scanning all docs under `tools/`, `docs/`, `.claude/skills/`, and project root for stale `archive/` citations. Deferred to a follow-up doc-hygiene spec per SPEC-36 §Risks & Open Questions (`(pragmatic — scope-doubling)`).
- Edits to other validators-package documentation (validator inventory section, schemas section, etc.). Only the named line 5 changes.
- Edits to the archived `archive/specs/SPEC-04-validator-framework.md` itself — archived specs are completed historical records and not edited.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'archive/specs/' tools/validators/README.md` returns either zero hits OR every hit appears on a line containing "archived prior art only" / "historical note" / "not current authority" (the marker is what makes the citation lawful per SPEC-35 D9's precedent).
2. `grep -n 'Current authority' tools/validators/README.md` returns at least one hit pointing to the replacement block.
3. `test -f docs/FOUNDATIONS.md && test -f .claude/skills/_shared-templates/story-state-contract.md && test -f docs/MACHINE-FACING-LAYER.md` — all three current-authority paths resolve.

### Invariants

1. Current docs at `tools/validators/README.md` do NOT cite `archive/` paths as design authority without explicit historical-caveat phrasing per the SPEC-35 D9 marker convention.
2. The archived SPEC-04 path remains discoverable (as a historical reference) for readers who need to trace pre-supersession context.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'archive/specs/' tools/validators/README.md` — confirm any remaining archive references carry the historical caveat.
2. `grep -A2 'Current authority' tools/validators/README.md` — confirm the replacement block is present and lists the four current authorities.
3. Narrower verification suffices because the change is one paragraph in one docs file; no build / test pipeline depends on README content.

## Outcome

Completed: 2026-05-16

`tools/validators/README.md` now opens with a `**Current authority**:` block naming `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/validators/src/`. The archived SPEC-04 path remains only in a paragraph-level historical note that says it is archived prior art and not current design authority.

## Verification Result

1. `grep -n 'archive/specs/' tools/validators/README.md` — passed; the only remaining hit is the historical-note line with "archived prior art only" and "not current design authority".
2. `grep -A2 'Current authority' tools/validators/README.md` — passed; the replacement block lists the four current authorities and the historical note.
3. `test -f docs/FOUNDATIONS.md && test -f .claude/skills/_shared-templates/story-state-contract.md && test -f docs/MACHINE-FACING-LAYER.md && test -d tools/validators/src` — passed.
4. `git diff --check -- tools/validators/README.md archive/tickets/SPEC36STOPIPNIN-001.md .codex/run-state/implement-spec-tickets.json` — passed after archival path repair.

## Deviations

None. This remained a one-file documentation authority correction plus ticket/harness closeout.
