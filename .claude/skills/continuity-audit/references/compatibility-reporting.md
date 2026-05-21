# Compatibility Reporting Appendix

Use this reference for continuity-audit Phase 11b when the run includes optional world-system compatibility reporting. This phase is read-only and report-only: it summarizes validator output in the `AU-<integer>` audit report and never enforces, repairs, or mutates inspected world surfaces.

## Invocation

Run from the repository/worktree root after the normal audit draft exists in memory:

```bash
node tools/validators/dist/src/cli/world-validate.js <world-slug> --compatibility --json
```

If `tools/validators/dist/` is absent or stale, build tooling first:

```bash
npm run build --prefix tools/validators
```

The compatibility CLI runs in `full-world` mode by default. In that mode compatibility defects are reporting signals for the audit appendix; pre-apply enforcement belongs to the patch/canon mutation gate, not continuity-audit.

## Expected Validator Subset

The appendix must record the `summary.validators_run` list and verify it is exactly:

- `record_schema_compliance`
- `approval_semantics`
- `artifact_maturity`
- `index_disk_consistency`

If any validator is missing, do not call the world clean. Record `Compatibility Appendix: not run` or `Compatibility Appendix: incomplete` with the concrete subset mismatch.

## Appendix Shape

Add a `## Compatibility Appendix` section to the audit report draft.

Required fields:

- **Command**: the exact CLI command used.
- **Mode**: `full-world read-only reporting; warnings do not block this audit`.
- **Validators run**: the four-name subset from `summary.validators_run`.
- **Summary**: `fail_count`, `warn_count`, and `info_count`.
- **Findings by validator**: one subsection per validator that emitted verdicts, grouped by severity and code.
- **No mutation statement**: `Phase 11b wrote no world files and made no canon changes; the approved AU report under worlds/<world-slug>/audits/ is the only eventual write.`

If there are no verdicts, write: `No compatibility findings emitted by the CLI.` Do not omit the section when Phase 11b was enabled.

## Failure and Skip Semantics

If the CLI cannot run, JSON cannot be parsed, or the world index is missing, record the reason in the appendix instead of fabricating a PASS. The Phase 13 deliverable summary must call out the skip/incomplete status so the user can approve, request a rerun, or abort.

Do not use compatibility output to create retcon cards directly. If a compatibility finding looks like it should become canon work, surface it as an audit finding or follow-up recommendation with normal continuity-audit anchors and severity rationale.

## Write Boundary

This phase may read validator output and add text to the in-memory audit draft. It must not write to:

- `worlds/<world-slug>/_source/`
- `worlds/<world-slug>/proposals/`
- `worlds/<world-slug>/characters/`
- `worlds/<world-slug>/diegetic-artifacts/`
- `worlds/<world-slug>/adjudications/`
- `worlds/<world-slug>/pressure-events/`
- `worlds/<world-slug>/_index/`

The only eventual disk write is the approved audit output under `worlds/<world-slug>/audits/` during Phase 13.
