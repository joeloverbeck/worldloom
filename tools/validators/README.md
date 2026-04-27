# validators

Executable FOUNDATIONS Rules 1, 2, 4, 5, 6, 7, 11, and 12 plus structural invariant enforcement.

**Design**: `../../archive/specs/SPEC-04-validator-framework.md`
**Phase**: 2 Tier 1. CLI activation and the pre-apply engine/MCP entry point are present.
**Status**: package scaffold, framework types, record-class JSON Schemas, the 6 structural validators, the 8 rule-derived validators, package-internal structural/rule registries, the `world-validate` CLI, and the public `validatePatchPlan` entry point are present.

## Schemas

Static JSON Schemas live under `src/schemas/`. They cover the CF, CH, INV, M,
OQ, ENT, SEC, PA frontmatter, CHAR frontmatter, and DA frontmatter record
classes. The PA schema validates YAML frontmatter parsed from
`adjudications/PA-NNNN-*.md`; PA body prose is not schema-constrained.

## Validator Inventory

Rule-derived mechanized validators:

- `rule1_no_floating_facts`
- `rule2_no_pure_cosmetics`
- `rule4_no_globalization_by_accident`
- `rule5_no_consequence_evasion`
- `rule6_no_silent_retcons`
- `rule7_mystery_reserve_preservation`
- `rule11_action_space`
- `rule12_redundancy`

Structural validators:

- `yaml_parse_integrity`
- `id_uniqueness`
- `cross_file_reference`
- `record_schema_compliance`
- `touched_by_cf_completeness`
- `modification_history_retrofit`

Skill-judgment rule:

- Rule 3 No Specialness Inflation remains in `canon-addition` Phase 14a Test 10 and `propose-new-canon-facts` Phase 8. It is not mechanized because enforcing it would require prose-content heuristics.

## Verdict Schema

`Verdict` is exported from `@worldloom/validators/public/types`: `{ validator, severity: 'fail' | 'warn' | 'info', code, message, location: { file, line_range?, node_id? }, suggested_fix? }`.

## Gate Semantics

- Pre-apply mode: engine-called; any `fail` blocks the patch.
- Full-world mode: CLI reports all verdicts; exits 1 on any `fail`.
- Incremental mode: Hook 5 post-apply logs to `validation_results`; non-blocking because the write already happened.

## CLI

```text
world-validate <world-slug>
world-validate <world-slug> --rules=1,2,6,11,12
world-validate <world-slug> --structural
world-validate <world-slug> --json
world-validate <world-slug> --file <path>
world-validate <world-slug> --since <commit>
world-validate --help
world-validate --version
```

The CLI reads `worlds/<slug>/_index/world.db`, runs the selected validators in
`full-world` mode, writes per-verdict rows to `validation_results`, and exits
`1` when any `fail` verdict is emitted. `--file` and `--since` narrow selector
applicability and persistence cleanup to the touched files while preserving the
runtime `full-world` run mode.

## Bootstrap Grandfathering

When a world has an explicit `audits/validation-grandfathering.yaml` policy, the
runner matches exact `fail` verdicts by validator, code, file, node id, and
message. Matched bootstrap findings are emitted and persisted as `info` with a
`Grandfathered by GF-NNNN` audit reference and rationale. Unmatched failures stay
as `fail`, so the CLI still exits non-zero for new or changed defects.

## Phase 14a Migration

`canon-addition` Phase 14a collapses to `mcp__worldloom__validate_patch_plan(plan)` for the structural catchments of Tests 1, 2, 3, 4, 5, 6, and 7.

Skill judgment remains for:

- Test 3 stabilizer quality
- Test 6 Mystery Reserve forbidden-answer overlap
- Test 8 stabilizer mechanism quality
- Test 9 verdict cites phases
- Test 10 specialness inflation
