# VALDA-003: Restore live mined proposal scalar repairs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None - direct proposal frontmatter repair only
**Deps**: `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`, `archive/tickets/VALDA-002-add-validator-support-for-mined-da-proposal-surfaces.md`

## Problem

After `VALDA-002` landed mined-from-DA proposal schema support, current `erotica-world` validation exposes four remaining `record_schema_compliance.type` failures in mined proposal cards. These are the same scalar-shape class originally repaired by `VALDA-001`, but the live checkout currently still parses those entries as mappings instead of strings.

Because `worlds/erotica-world/` is gitignored in this checkout, the archived VALDA-001 proof is historical evidence only. The current local world content must be repaired again or resynced so `world-validate erotica-world --json` can reach the intended green state after the schema fix.

## Assumption Reassessment (2026-05-22)

1. Current validator evidence: `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` exits 1 with `summary.fail_count: 4`; all four failures are `record_schema_compliance.type`.
2. Exact failing paths are:
   - `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` `/longer_term_consequences/2`
   - `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/immediate_consequences/3`
   - `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/longer_term_consequences/1`
   - `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/longer_term_consequences/6`
3. Cross-artifact boundary under audit: mined proposal Markdown frontmatter is emitted by `.claude/skills/canon-facts-from-diegetic-artifacts`, indexed as `proposal_card`, and validated by `tools/validators/src/structural/record-schema-compliance.ts`.
4. FOUNDATIONS principle under audit: Rule 5 consequence validation and proposal adjudication depend on consequence entries remaining machine-readable scalar strings.
5. HARD-GATE discipline is not weakened. These files live under `worlds/<slug>/proposals/`, which AGENTS marks as a direct-edit proposal surface, not an engine-only `_source/` canon record. This ticket must not canonize, adjudicate, or mutate `_source/` records.
6. Source-skill prevention text already exists in `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` and `.claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md`; no skill change is expected unless reassessment proves that guidance drifted.
7. Adjacent completed work: `archive/tickets/VALDA-002-add-validator-support-for-mined-da-proposal-surfaces.md` fixed the schema/tooling drift and reduced the live corpus to these scalar content failures.

## Architecture Check

1. Repair only the malformed YAML scalar syntax by quoting the affected list items or converting them to folded block scalars. This preserves authored proposal meaning while restoring the intended frontmatter type.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. YAML scalar integrity -> targeted parse probe confirms all four affected values are strings after repair.
2. Live validator boundary -> `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` reaches `summary.fail_count: 0` after VALDA-002 schema support and these content repairs.
3. FOUNDATIONS alignment check -> consequence text remains machine-readable for Rule 5 and proposal adjudication without canonizing the proposals.

## What to Change

### 1. Repair current live proposal cards

Convert the four affected consequence-list entries in `PR-0002` and `PR-0003` to YAML scalar strings. Prefer folded block scalars for long prose entries that contain colons.

## Files to Touch

- `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` (modify)
- `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` (modify)

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

1. Authored proposal meaning is preserved; only YAML scalar syntax changes.
2. Proposal approval metadata remains proposal maturity metadata, not canon acceptance.
3. No `_source/` world-level canon record is edited.

## Test Plan

### New/Modified Tests

1. `None - current-world proposal data repair; verification is command-based against the live validator and targeted YAML parsing.`

### Commands

1. From `tools/validators`, run a targeted `js-yaml` parse probe against the four affected paths.
2. From repo root: `node tools/validators/dist/src/cli/world-validate.js erotica-world --json`.
3. From repo root: `rg -n "colon|block scalar|frontmatter list|YAML scalar|folded block" .claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md .claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md`.
