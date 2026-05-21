# VALDA-003: Restore live mined proposal scalar repairs

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None - live proposal/index state repair only
**Deps**: `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`, `archive/tickets/VALDA-002-add-validator-support-for-mined-da-proposal-surfaces.md`

## Problem

At intake, after `VALDA-002` landed mined-from-DA proposal schema support, current `erotica-world` validation exposed four remaining `record_schema_compliance.type` failures in mined proposal cards. These were the same scalar-shape class originally repaired by `VALDA-001`.

Because `worlds/erotica-world/` is gitignored in this checkout, the archived VALDA-001 proof was historical evidence only. Live reassessment showed the proposal Markdown files were already repaired, while the derived `_index/world.db` still carried the stale scalar shape. This ticket refreshed that derived state so `world-validate erotica-world --json` reaches the intended green state after the schema fix.

## Assumption Reassessment (2026-05-22)

1. Intake validator evidence: `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` exited 1 with `summary.fail_count: 4`; all four failures were `record_schema_compliance.type`.
2. Exact intake failing paths were:
   - `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` `/longer_term_consequences/2`
   - `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/immediate_consequences/3`
   - `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/longer_term_consequences/1`
   - `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/longer_term_consequences/6`
3. Direct `js-yaml` reassessment of the four live proposal frontmatter entries showed all four values already parse as strings. The remaining red validator signal came from stale derived index state, not from current proposal Markdown syntax.
4. Cross-artifact boundary under audit: mined proposal Markdown frontmatter is emitted by `.claude/skills/canon-facts-from-diegetic-artifacts`, indexed as `proposal_card` by `tools/world-index`, and validated by `tools/validators/src/structural/record-schema-compliance.ts`.
5. FOUNDATIONS principle under audit: Rule 5 consequence validation and proposal adjudication depend on consequence entries remaining machine-readable scalar strings.
6. HARD-GATE discipline is not weakened. These files live under `worlds/<slug>/proposals/`, which AGENTS marks as a direct-edit proposal surface, not an engine-only `_source/` canon record. This ticket did not canonize, adjudicate, or mutate `_source/` records.
7. Source-skill prevention text already exists in `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` and `.claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md`; reassessment confirmed no skill change was needed.
8. Adjacent completed work: `archive/tickets/VALDA-002-add-validator-support-for-mined-da-proposal-surfaces.md` fixed the schema/tooling drift and reduced the live corpus to these scalar/index-state failures.

## Architecture Check

1. Preserve the already-correct folded block scalar syntax in the live proposal Markdown and refresh only the derived index state. This preserves authored proposal meaning while restoring the validator's indexed frontmatter view.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. YAML scalar integrity -> targeted parse probe confirms all four affected values are strings in the live proposal Markdown.
2. Live validator boundary -> `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` reaches `summary.fail_count: 0` after VALDA-002 schema support and the refreshed live index.
3. FOUNDATIONS alignment check -> consequence text remains machine-readable for Rule 5 and proposal adjudication without canonizing the proposals.

## Landed Changes

### 1. Verified current live proposal cards

Confirmed the four affected consequence-list entries in `PR-0002` and `PR-0003` already parse as YAML scalar strings from the live Markdown files. No proposal prose or frontmatter text was changed during this run.

### 2. Refreshed derived live-world index

Rebuilt `tools/world-index/dist/` and then rebuilt `worlds/erotica-world/_index/world.db` from the live proposal files. The refreshed validator read surface no longer reports the stale scalar type failures.

## Files to Touch

- `archive/tickets/VALDA-003-restore-live-mined-proposal-scalar-repairs.md` (modify closeout)
- `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` (verified; no text edit needed)
- `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` (verified; no text edit needed)
- `worlds/erotica-world/_index/world.db` (ignored derived artifact refreshed by `world-index build`)
- `tools/world-index/dist/` (ignored generated artifact refreshed by `npm run build`)

## Out of Scope

- Do not edit `_source/` canon records.
- Do not canonize or adjudicate the proposals.
- Do not change validator schemas or schema routing; that was completed by `archive/tickets/VALDA-002-add-validator-support-for-mined-da-proposal-surfaces.md`.
- Do not change source-skill guidance unless reassessment proves the existing VALDA-001 guidance has drifted.

## Acceptance Criteria

### Tests That Must Pass

1. A targeted YAML parse probe confirms the four affected entries parse as strings.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` exits 0 with `summary.fail_count: 0`.
3. `rg -n "colon|block scalar|frontmatter list|YAML scalar|folded block" .claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md .claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md` still finds the existing prevention guidance.

### Invariants

1. Authored proposal meaning is preserved; no proposal prose or canon metadata is changed.
2. Proposal approval metadata remains proposal maturity metadata, not canon acceptance.
3. No `_source/` world-level canon record is edited.

## Test Plan

### New/Modified Tests

1. `None - current-world derived index refresh; verification is command-based against the live validator and targeted YAML parsing.`

### Commands

1. From repo root, run a targeted `js-yaml` parse probe against the four affected paths.
2. From repo root: `node tools/validators/dist/src/cli/world-validate.js erotica-world --json`.
3. From repo root: `rg -n "colon|block scalar|frontmatter list|YAML scalar|folded block" .claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md .claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md`.

## Outcome

Completed: 2026-05-22. The live proposal Markdown already contained scalar-safe folded block entries for the four paths, so no proposal text change was needed. Rebuilding the live `erotica-world` index refreshed the validator's derived read surface and cleared the four stale `record_schema_compliance.type` failures.

## Verification Result

1. PASS - Targeted `js-yaml` parse probe from repo root confirmed all four affected values are strings:
   - `PR-0002` `/longer_term_consequences/2`
   - `PR-0003` `/immediate_consequences/3`
   - `PR-0003` `/longer_term_consequences/1`
   - `PR-0003` `/longer_term_consequences/6`
2. PASS - `npm run build` from `tools/world-index` rebuilt the package CLI used for the derived artifact refresh.
3. PASS - `node tools/world-index/dist/src/cli.js build erotica-world` from repo root rebuilt `worlds/erotica-world/_index/world.db`.
4. PASS - `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` from repo root exited 0 with `summary.fail_count: 0`.
5. PASS - `rg -n "colon|block scalar|frontmatter list|YAML scalar|folded block" .claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md .claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md` found the existing prevention guidance in both skill surfaces.

## Deviations

- Reassessment narrowed the implementation from direct proposal frontmatter repair to derived index refresh. The proposal Markdown files were already scalar-correct; the validator failure was stale `worlds/erotica-world/_index/world.db` state.
- `worlds/erotica-world/` and `tools/world-index/dist/` are gitignored in this checkout, so the refreshed generated artifacts are verified directly and classified as expected ignored artifacts rather than tracked source edits.
