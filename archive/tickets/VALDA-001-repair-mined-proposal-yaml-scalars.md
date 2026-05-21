# VALDA-001: Repair mined proposal YAML scalar entries and harden source-skill guidance

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes - live proposal files plus `.claude/skills/canon-facts-from-diegetic-artifacts` guidance/templates
**Deps**: None

## Problem

At intake, `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` reported real `record_schema_compliance.type` failures in mined proposal cards because several YAML list items contained unquoted colons and parsed as mappings instead of strings. These were separate from the broader validator/schema drift tracked in `VALDA-002`: even after mined-from-DA schema support lands, these list items must still be scalar strings.

## Assumption Reassessment (2026-05-22)

1. Intake validator output against `erotica-world` reported non-string list entries in `PR-0002` and `PR-0003` under `record_schema_compliance.type`.
2. Live file check confirmed the scalar hazards before repair: `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` `/longer_term_consequences/2`, `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/immediate_consequences/3`, `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/longer_term_consequences/1`, and `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` `/longer_term_consequences/6`.
3. Cross-artifact boundary under audit: `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` produces YAML frontmatter consumed by `tools/validators/src/structural/record-schema-compliance.ts`; list values in `immediate_consequences` and `longer_term_consequences` must parse as strings before schema validation.
4. FOUNDATIONS alignment: Rule 2/Rule 5 style validation only works when proposal consequences remain machine-readable strings; malformed YAML hides the intended consequence text from validators and downstream `canon-addition` review.
5. HARD-GATE and Canon Safety Check surfaces are not weakened. This ticket only preserves authored proposal text as scalar strings and adds source-skill guidance to avoid future malformed frontmatter; it does not change the skill approval gate, write ordering, Phase 6 checks, or Mystery Reserve semantics.
6. Adjacent contradiction classified as separate bug: mined-from-DA proposal cards/batches use a richer frontmatter shape than the current validator schema accepts. That belongs to `VALDA-002`, not this ticket.
7. The active ticket file was untracked at intake, and the two `worlds/erotica-world/proposals/` cards live under gitignored world content. The repaired world-content paths were verified directly rather than relying on tracked-only git status.

## Architecture Check

1. Quoting or block-scalarizing the affected list entries preserves the authored text exactly while restoring the intended YAML type. Updating source-skill guidance prevents repeating the same class of malformed output.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. YAML scalar integrity -> schema validation probe against the four affected list paths after parsing frontmatter.
2. Source-skill prevention -> codebase grep-proof/manual review that `.claude/skills/canon-facts-from-diegetic-artifacts` tells authors to quote list items containing `:` or use block scalars.
3. Live validator boundary -> `world-validate erotica-world --json` no longer emits the specific `record_schema_compliance.type` messages for the four scalar paths, though broader schema-shape failures remain until `VALDA-002`.

## Landed Changes

### 1. Repair current live proposal cards

Converted the four affected `PR-0002` and `PR-0003` frontmatter list entries to folded block scalars so YAML parses each entry as a string. Authored prose content was preserved.

### 2. Harden source-skill guidance

Updated `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` and `.claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md` to state that frontmatter list entries containing colons must be quoted or written as folded block scalars. The instruction remains local to YAML frontmatter emission.

## Files to Touch

- `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` (modify)
- `worlds/erotica-world/proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md` (modify)
- `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` (modify)
- `.claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md` (modify)

## Out of Scope

- Do not normalize mined-from-DA cards to the older generic proposal-card schema.
- Do not change `tools/validators` schema routing; that is `VALDA-002`.
- Do not canonize or adjudicate any proposal.
- Do not edit `_source/` canon records.

## Acceptance Criteria

### Tests That Must Pass

1. A targeted YAML parse probe confirms the four affected list entries parse as strings.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` no longer reports `record_schema_compliance.type` for:
   - `PR-0002` `/longer_term_consequences/2`
   - `PR-0003` `/immediate_consequences/3`
   - `PR-0003` `/longer_term_consequences/1`
   - `PR-0003` `/longer_term_consequences/6`
3. Source-skill guidance explicitly prevents unquoted colon-bearing frontmatter list items.

### Invariants

1. Authored proposal meaning is preserved; only YAML scalar syntax changes.
2. Current schema-shape failures remain honestly visible until `VALDA-002`; this ticket must not hide them by deleting mined-from-DA audit fields.

## Test Plan

### New/Modified Tests

1. `None - current-world data repair plus skill guidance; verification is command-based and existing validator coverage is named in Assumption Reassessment.`

### Commands

1. From `tools/validators`, run a targeted YAML parse probe using package-local `js-yaml` to assert the four affected values are strings.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` - expected to remain failing until `VALDA-002`, but the four scalar type failures named above must be absent.
3. `rg -n "colon|block scalar|frontmatter list|YAML scalar|folded block" .claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md .claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md` - confirm source-skill prevention text exists.

## Outcome

Completed: 2026-05-22. The four malformed consequence-list entries now parse as YAML strings, not mappings, and the mining skill template plus Phase 7/8 validation reference now warn authors to quote colon-bearing list items or use folded block scalars.

## Verification Result

1. PASS - Targeted `js-yaml` parse probe from `tools/validators` confirmed all four affected values are strings:
   - `PR-0002` `/longer_term_consequences/2`
   - `PR-0003` `/immediate_consequences/3`
   - `PR-0003` `/longer_term_consequences/1`
   - `PR-0003` `/longer_term_consequences/6`
2. PASS - `rg -n "colon|block scalar|frontmatter list|YAML scalar|folded block" .claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md .claude/skills/canon-facts-from-diegetic-artifacts/references/phases-7-8-validate-and-commit.md` found prevention text in both edited skill surfaces.
3. PASS with expected nonzero validator exit - `node tools/validators/dist/src/cli/world-validate.js erotica-world --json | rg -n 'PR-0002 schema violation at /longer_term_consequences/2: must be string|PR-0003 schema violation at /immediate_consequences/3: must be string|PR-0003 schema violation at /longer_term_consequences/1: must be string|PR-0003 schema violation at /longer_term_consequences/6: must be string'` returned no matches. The full validator still exits 1 with `fail_count: 130`, preserving the broader schema-shape failures for `VALDA-002`.

## Deviations

- The validator CLI was run directly because a Node wrapper that attempted to spawn the CLI hit sandbox `EPERM`; this did not change the accepted proof surface.
- `node tools/validators/dist/src/cli/world-validate.js erotica-world --json --file <proposal>` still reported broad proposal and batch schema failures outside the four repaired scalar paths. Those failures remain visible and are not claimed by this ticket.
