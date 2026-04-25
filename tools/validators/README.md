# validators

Executable FOUNDATIONS Rule 1-7 plus structural invariant enforcement.

**Design**: `specs/SPEC-04-validator-framework.md`
**Phase**: 2 Tier 1. Structural subset activates through the CLI in ticket 005; engine integration lands in ticket 006.
**Status**: package scaffold, framework types, record-class JSON Schemas, the 7 structural validators, and the package-internal structural registry are present. Rule-derived validators, CLI, and engine entry point are staged in later SPEC-04 tickets.

## Schemas

Static JSON Schemas live under `src/schemas/`. They cover the CF, CH, INV, M,
OQ, ENT, SEC, PA Discovery, CHAR frontmatter, and DA frontmatter record classes.
The PA schema validates the canonical Discovery block parsed from
`adjudications/PA-NNNN-*.md`; those records do not use YAML frontmatter.

## Validator Inventory

Rule-derived mechanized validators:

- `rule1_no_floating_facts`
- `rule2_no_pure_cosmetics`
- `rule4_no_globalization_by_accident`
- `rule5_no_consequence_evasion`
- `rule6_no_silent_retcons`
- `rule7_mystery_reserve_preservation`

Structural validators:

- `yaml_parse_integrity`
- `id_uniqueness`
- `cross_file_reference`
- `record_schema_compliance`
- `touched_by_cf_completeness`
- `modification_history_retrofit`
- `adjudication_discovery_fields`

Skill-judgment rule:

- Rule 3 No Specialness Inflation remains in `canon-addition` Phase 14a Test 10 and `propose-new-canon-facts` Phase 8. It is not mechanized because enforcing it would require prose-content heuristics.

## Verdict Schema

`Verdict` matches `tools/world-mcp/src/tools/validate-patch-plan.ts`: `{ validator, severity: 'fail' | 'warn' | 'info', code, message, location: { file, line_range?, node_id? }, suggested_fix? }`.

## Gate Semantics

- Pre-apply mode: engine-called; any `fail` blocks the patch.
- Full-world mode: CLI reports all verdicts; exits 1 on any `fail`.
- Incremental mode: Hook 5 post-apply logs to `validation_results`; non-blocking because the write already happened.

## CLI

Planned in ticket 005:

```text
world-validate <world-slug>
world-validate <world-slug> --rules=1,2,6
world-validate <world-slug> --structural
world-validate <world-slug> --json
world-validate <world-slug> --file <path>
world-validate <world-slug> --since <commit>
world-validate --help
world-validate --version
```

## Phase 14a Migration

`canon-addition` Phase 14a collapses to `mcp__worldloom__validate_patch_plan(plan)` for the structural catchments of Tests 1, 2, 3, 4, 5, 6, and 7.

Skill judgment remains for:

- Test 3 stabilizer quality
- Test 6 Mystery Reserve forbidden-answer overlap
- Test 8 stabilizer mechanism quality
- Test 9 verdict cites phases
- Test 10 specialness inflation
