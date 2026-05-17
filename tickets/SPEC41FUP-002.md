# SPEC41FUP-002: Add `current_docs_do_not_cite_archive_as_authority` CI lint

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — introduces new lint script under `tools/validators/scripts/` and extends `.github/workflows/ci-validators.yml` with a new CI gate. No source modification.
**Deps**: None

## Problem

D2 of SPEC-41 (originating from SPEC-40 §Risks & Open Questions F2.b). Current authority docs (FOUNDATIONS, CLAUDE.md, skill prose, current specs, validator/tool READMEs) must not cite archived specs / tickets as current authority. SPEC-35 D9 fixed FOUNDATIONS.md citing `archive/specs/SPEC-02/03/05` reactively; SPEC-36 D4 fixed `tools/validators/README.md` citing an archived spec reactively. The drift recurs because no CI gate catches archive-citation drift at PR time. Legitimate historical citations exist — `**Supersedes**: archive/specs/SPEC-XX` headers, archived-context cross-references in continuing specs — so the lint requires a whitelist mechanism rather than a blanket prohibition.

## Assumption Reassessment (2026-05-17)

1. Codebase: `.github/workflows/` confirmed to have 6 CI configs per pre-spec verification (`ci-hooks.yml`, `ci-patch-engine.yml`, `ci-validators.yml`, `ci-world-index.yml`, `ci-world-mcp.yml`, `codeql.yml`); none contain archive-citation lint logic (grep returned zero matches for `archive.reference.lint` or `current_docs_do_not_cite_archive`). Legitimate-historical-citation patterns documented across the repo: `**Supersedes**:` headers (used in SPEC-14, SPEC-37 worked precedents), `historical`-tagged citations, archive-as-context paragraphs in continuing specs. Current-authority surfaces to scan: `docs/**/*.md`, `.claude/skills/**/*.md`, `specs/**/*.md`, `tools/**/README.md`, root-level `*.md` (CLAUDE.md, README.md).
2. Spec: SPEC-41 §D2 names the script + CI integration + whitelist mechanism as the minimal remediation. Originating SPEC-40 §Risks recommended this lint as the second recurring-drift channel worth closing.
3. Cross-skill boundary: the lint script lives at the validators package (same precedent as SPEC41FUP-001) but scans documentation surfaces across the entire repo. The shared contract under audit is the citation-authority discipline — current docs may reference archived material for context, but must not treat archived specs/tickets as load-bearing current authority. The whitelist mechanism is the structural acknowledgment that not all archive-references are drift; the lint's value is in catching the citations that ARE drift.

## Architecture Check

1. A grep-based bash script with a whitelist mechanism is structurally cleaner than embedding the check inside a doc-generator or doc-rendering pipeline — the convention is about authoring discipline at the text level, and a grep-based CI gate catches the issue at PR time independent of any rendering toolchain. Alternatives (e.g., a markdown linter plugin) would couple to a specific rendering ecosystem the repo doesn't otherwise depend on.
2. No backwards-compatibility aliasing or shims introduced — the lint is net-new and excludes legitimate-historical-citation patterns via the whitelist. Existing current-authority docs already conform per SPEC-35 D9 + SPEC-36 D4 work; the lint enforces the conformance going forward.

## Verification Layers

1. Lint script correctness → manual citation-test: create a temp file citing `archive/specs/SPEC-XX` without whitelist marker; run the script; assert non-zero exit. Create a temp file with the same citation inside a `**Supersedes**: archive/specs/SPEC-XX` block; run the script; assert zero exit.
2. CI integration → workflow file check: `grep -n 'check-archive-citation\|current_docs_do_not_cite_archive' .github/workflows/ci-validators.yml` returns the new step.
3. False-positive avoidance → manual review: run the lint against the full current-authority doc surface; confirm zero false-positives. If false positives surface (e.g., a legitimate-historical citation pattern not in the initial whitelist), document the new pattern and extend the whitelist incrementally as part of this ticket.

## What to Change

### 1. New lint script

Create `tools/validators/scripts/check-archive-citation-discipline.sh` (or equivalent path under `tools/validators/`):

- Scan `docs/**/*.md`, `.claude/skills/**/*.md`, `specs/**/*.md`, `tools/**/README.md`, root `*.md` (CLAUDE.md, README.md) — excluding `archive/`, `node_modules/`, `tickets/` (tickets may cite archive for context legitimately).
- Pattern: any line containing `archive/specs/SPEC-` or `archive/tickets/` not preceded (on the same line or up to 3 lines prior) by a whitelist marker: `**Supersedes**:`, `historical`, `archived for reference`, `archived-as-context`, `archived spec`, `archived ticket`, `prior art`.
- On match, write `file:line: archive citation found without whitelist marker; add a whitelist marker (e.g., **Supersedes**: archive/specs/SPEC-XX) or remove the citation` to stderr and exit non-zero.
- Use POSIX-compatible grep flags. Shebang `#!/usr/bin/env bash`; `set -euo pipefail`.

### 2. CI workflow integration

Extend `.github/workflows/ci-validators.yml`:

- Add a new step (or new job) invoking the new lint script.
- Step name: `Lint archive-citation discipline`.
- Failure messaging: when the lint fails, CI output names the offending files + lines + the missing whitelist marker.

### 3. Document the whitelist mechanism

In the new lint script's preamble comment, document the whitelist pattern set and the rationale for each pattern. Future operators adding a new legitimate-historical-citation pattern can extend the whitelist by adding to this list with rationale.

## Files to Touch

- `tools/validators/scripts/check-archive-citation-discipline.sh` (new)
- `.github/workflows/ci-validators.yml` (modify) — add a new step invoking the new lint script.

## Out of Scope

- No validator-source modification.
- No retroactive sweep of current-authority docs — all current docs already conform per SPEC-35 D9 + SPEC-36 D4 work; this ticket adds enforcement.
- No new schema fields, no new records, no new validators.
- No companion `fixture_unpadded_id_lint` — that's SPEC41FUP-001; separate concern, separate ticket.
- No scan of `tickets/` directory — tickets may legitimately cite archive paths for historical context (e.g., "follow-up to archive/tickets/XYZ-NNN"); enforcement would over-trigger.

## Acceptance Criteria

### Tests That Must Pass

1. Running the new lint script against a temp file containing `Reference: see archive/specs/SPEC-03 for original design` (no whitelist marker) exits non-zero with a file:line message.
2. Running the new lint script against a temp file containing `**Supersedes**: archive/specs/SPEC-03 (sections X, Y)` exits zero — whitelist marker present.
3. Running the new lint script against the current repo's current-authority doc surface exits zero — confirms no existing archive-citation drift remains.
4. CI workflow `ci-validators.yml` runs the new step on PRs and fails CI when a new doc introduces an un-whitelisted archive citation.

### Invariants

1. Archive-citation discipline is enforced at PR time across all current-authority doc surfaces.
2. Legitimate-historical citations (with whitelist markers) pass the lint unchanged.
3. `archive/` paths and `tickets/` paths are not scanned — archive is historical record; tickets may cite archive for context.
4. The lint script has zero false-positives on the current repo's docs.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` — the lint script's correctness is verified via direct invocation against synthesized fixtures (see Acceptance Criteria above), not via a sibling test file.

### Commands

1. `bash tools/validators/scripts/check-archive-citation-discipline.sh` — direct script invocation; expected exit code 0 on current repo state.
2. `echo "see archive/specs/SPEC-03 for the original design" > /tmp/lint-test.md && bash tools/validators/scripts/check-archive-citation-discipline.sh; echo "exit=$?"; rm /tmp/lint-test.md` — manual negative test confirming non-zero exit on un-whitelisted archive citation (adjust invocation to point at the temp path as needed).
3. `grep -n 'check-archive-citation' .github/workflows/ci-validators.yml` — confirms the workflow step is wired.
