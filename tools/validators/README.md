# validators

Executable FOUNDATIONS Rule 1–7 + structural invariant enforcement. Runs in three contexts: patch-engine pre-apply gate, `world-validate` CLI, Hook 5 PostToolUse.

**Design**: `specs/SPEC-04-validator-framework.md`
**Phase**: 2 (structural subset activates in Phase 1 via CLI)
**Status**: not yet implemented

## Validators (14)

Rule-derived (7):
- `rule1_no_floating_facts`
- `rule2_no_pure_cosmetics`
- `rule3_no_specialness_inflation`
- `rule4_no_globalization_by_accident`
- `rule5_no_consequence_evasion`
- `rule6_no_silent_retcons`
- `rule7_mystery_reserve_preservation`

Structural (7):
- `yaml_parse_integrity`
- `id_uniqueness`
- `cross_file_reference`
- `attribution_comment`
- `modification_history_retrofit`
- `adjudication_discovery_fields`
- `anchor_integrity`

## Verdict schema

`{severity: 'fail' | 'warn' | 'info', code, message, location, suggested_fix?}`

## Gate semantics

Pre-apply mode: any `fail` blocks the patch. Full-world mode: CLI reports all verdicts; exit 1 on any fail. Incremental mode: logs to `validation_results`; surfaces fails via system reminder.

## CLI (planned)

```
world-validate <world-slug>                  # full audit
world-validate <world-slug> --rules=1,2,6    # subset
world-validate <world-slug> --structural     # structural only
world-validate <world-slug> --json           # machine-readable
world-validate <world-slug> --file <path>    # single-file
world-validate <world-slug> --since <commit> # diff workflow
```

## Phase 14a migration

Current `canon-addition` Phase 14a 10-test rubric collapses to validator calls; only Test 9 (verdict cites phases) stays in skill as judgment.
