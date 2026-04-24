<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-04: Validator Framework

**Phase**: 2 (structural validators activate in Phase 1)
**Depends on**: SPEC-01, **SPEC-13 (atomic-source contract — validators consume atomic YAML records directly)**
**Blocks**: SPEC-03 (engine pre-apply gate), SPEC-05 Hook 5 (PostToolUse), SPEC-06 (skills replace Phase 14a rubric with validator calls)

## Problem Statement

FOUNDATIONS.md Rules 1–7 currently live as prose assertions in `canon-addition/references/foundations-and-rules-alignment.md`. Phase 14a's 10-test rubric lives as prose in `canon-addition/SKILL.md` Validation Tests. Structural invariants (YAML parse integrity, id uniqueness, record-schema compliance) have no enforcement at all — they're implicit. Every skill must re-read the rubric, and the model re-interprets it every run.

**Post-SPEC-13 context**: validators consume atomic YAML records from `worlds/<slug>/_source/` directly. No markdown parse step is needed for CF / CH / INV / M / OQ / ENT / SEC records. Hybrid files (characters, diegetic artifacts, adjudications) continue to be parsed for their YAML frontmatter. The validator inputs are simpler, typed, and schema-validatable.

**Source context**: `brainstorming/structure-aware-retrieval.md` §5 (validators) and SPEC-13 §C (amendments to this spec). Brainstorm decision: executable validators replace prose assertions; validator = code, not prompt.

## Approach

One TypeScript module per validator, running in three contexts:
1. **Patch engine pre-apply gate** (SPEC-03 Phase A step 5) — `mode: 'pre-apply'`, input is `(current_world_state + proposed_patch_plan)`
2. **Standalone CLI** (`world-validate`) — `mode: 'full-world'`, input is a world slug
3. **Hook 5 PostToolUse** (SPEC-05) — `mode: 'incremental'`, input is a list of just-mutated `_source/*.yaml` or hybrid-file paths

A validator is a function `(input, context) => Verdict[]`. Verdicts have uniform shape. The framework runs validators in parallel per input, aggregates verdicts, and writes them to `validation_results` table in the index.

## Deliverables

### Package location

`tools/validators/` — TypeScript package; imported by `tools/patch-engine/`, `tools/world-mcp/`, and the `world-validate` CLI.

```
tools/validators/
├── package.json
├── tsconfig.json
├── src/
│   ├── framework/
│   │   ├── types.ts                # Verdict, Validator, RunMode, Context
│   │   ├── run.ts                  # parallel runner
│   │   └── aggregate.ts            # severity-based aggregation
│   ├── rules/
│   │   ├── rule1-no-floating-facts.ts
│   │   ├── rule2-no-pure-cosmetics.ts
│   │   ├── rule3-no-specialness-inflation.ts
│   │   ├── rule4-no-globalization-by-accident.ts
│   │   ├── rule5-no-consequence-evasion.ts
│   │   ├── rule6-no-silent-retcons.ts
│   │   └── rule7-mystery-reserve-preservation.ts
│   ├── structural/
│   │   ├── yaml-parse-integrity.ts
│   │   ├── id-uniqueness.ts
│   │   ├── cross-file-reference.ts
│   │   ├── record-schema-compliance.ts
│   │   ├── touched-by-cf-completeness.ts
│   │   ├── modification-history-retrofit.ts
│   │   └── adjudication-discovery-fields.ts
│   └── cli/
│       └── world-validate.ts       # standalone CLI entry
├── tests/
└── fixtures/                       # small worlds with known-good and known-bad states
```

**Retired vs pre-SPEC-13**: `attribution-comment.ts` retired (attribution is now a structural field on records, not an HTML-comment authoring surface); `anchor-integrity.ts` retired (atomic records don't have prose-anchor drift; hybrid-file anchor drift is handled by the patch engine directly in SPEC-03's anchor-miss handling for hybrid files).

**Added post-SPEC-13**: `record-schema-compliance.ts` (validates each `_source/*.yaml` file against its record type's JSON Schema — one schema per CF / CH / INV / M / OQ / ENT / SEC / PA / CHAR / DA class); `touched-by-cf-completeness.ts` (bidirectional CF↔SEC mapping check — for each SEC with `touched_by_cf: [CF-X]`, verifies CF-X's `required_world_updates` includes this SEC's `file_class`; for each CF with `required_world_updates: [FILE_CLASS]`, verifies at least one SEC under `_source/<file-subdir>/` has this CF in `touched_by_cf` or in an `extensions[].originating_cf`).

### Validator inventory (14)

#### Rule-derived validators (7)

| Validator | FOUNDATIONS rule | Checks |
|---|---|---|
| `rule1_no_floating_facts` | Rule 1 | CF records have non-empty `domains_affected`, `scope`, `costs_and_limits`, `visible_consequences`; `prerequisites` populated for operationally-conditioned types (`capability`, `artifact`, `technology`, `institution`, `ritual`, `event`, `craft`, `resource_distribution`) |
| `rule2_no_pure_cosmetics` | Rule 2 | `domains_affected` non-empty and drawn from canonical enum (labor, embodiment, social_norms, architecture, mobility, law, trade, war, kinship, religion, language, status_signaling, ecology, daily_routine) plus established ledger extensions (economy, settlement_life, memory_and_myth, magic, medicine, status_order, warfare, taboo_and_pollution) |
| `rule3_no_specialness_inflation` | Rule 3 | Detects unmotivated superlative register (`#1`, `most`, `second-most`, `world-first`, `greatest`, `unparalleled`, `unprecedented`, `the only`) in CF `statement`, `visible_consequences`, `distribution`. PASS when (a) `distribution.why_not_universal` cites a concrete stabilizer mechanism explaining durability of the primacy, OR (b) language softens to pragmatic-scale register (`among the foremost`, `notably large`, `one of the most`). |
| `rule4_no_globalization_by_accident` | Rule 4 | Any CF with non-`global` geographic OR non-`public` social scope has `distribution.why_not_universal` populated with at least one concrete stabilizer; stabilizer cites mechanism, not hand-wave |
| `rule5_no_consequence_evasion` | Rule 5 | 2nd/3rd-order consequences named in proposal materialize either in `visible_consequences` or in at least one Phase 13a patch targeting a `required_world_updates` file. A filename in `required_world_updates` without a corresponding drafted patch fails. |
| `rule6_no_silent_retcons` | Rule 6 | Every CF modification has (a) a CH entry with matching `affected_fact_ids`, (b) a `modification_history` entry on the modified CF, (c) an attribution comment in any modified domain prose. All three conjuncts required. |
| `rule7_mystery_reserve_preservation` | Rule 7 | No forbidden-answer collision with any MR entry; firewall extensions properly attributed; new MR entries have `what_is_unknown` + `what_is_known_around_it` + `forbidden_answers` populated |

#### Structural validators (7)

| Validator | Checks |
|---|---|
| `yaml_parse_integrity` | Every `_source/*.yaml` file parses as valid YAML; required top-level keys present per record type; trimmed fields trimmed cleanly. Hybrid-file frontmatter (characters, diegetic artifacts) also parsed. |
| `id_uniqueness` | No duplicate CF-NNNN / CH-NNNN / INV-IDs / M-NNNN / OQ-NNNN / ENT-NNNN / SEC-* / PA-NNNN / CHAR-NNNN / DA-NNNN / PR-NNNN / BATCH-NNNN / AU-NNNN / RP-NNNN within a world; cross-record-class uniqueness not required but intra-class uniqueness strict. |
| `cross_file_reference` | Every id referenced in CF `derived_from`, CF `required_world_updates` (now a `file_class` list), CH `affected_fact_ids`, `modification_history[].originating_cf`, `extensions[].originating_cf`, `extensions[].change_id`, SEC `touched_by_cf[]` resolves to an indexed record. No orphan references. |
| `record_schema_compliance` | Every `_source/*.yaml` file validates against its record type's JSON Schema (one schema per CF / CH / INV / M / OQ / ENT / SEC / PA / CHAR / DA class). Field types, enum values, required-field presence all enforced structurally. |
| `touched_by_cf_completeness` | For each SEC with `touched_by_cf: [CF-X, CF-Y]`, verify each listed CF's `required_world_updates` includes this SEC's `file_class`. For each CF with `required_world_updates: [FILE_CLASS]`, verify at least one SEC under `_source/<file-subdir-for-file-class>/` has this CF in `touched_by_cf[]` OR in an `extensions[].originating_cf`. Discrepancies in either direction are fails. |
| `modification_history_retrofit` | Any CF with notes-field modification lines (`Modified YYYY-MM-DD by CH-NNNN`) has a matching populated `modification_history` array entry; partial population (array has only current modification while notes reference earlier ones) is a fail |
| `adjudication_discovery_fields` | Every `adjudications/PA-NNNN-*.md` Discovery block uses canonical field names (`mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`); ad-hoc names (`New CF`, `Modifications`, `Critics dispatched`) fail |

### Verdict schema

```typescript
interface Verdict {
  validator: string;                   // e.g., "rule1_no_floating_facts"
  severity: 'fail' | 'warn' | 'info';
  code: string;                        // machine-readable, e.g., "rule1.missing_domains_affected"
  message: string;                     // human-readable
  location: {
    file: string;
    line_range?: [number, number];
    node_id?: string;
  };
  suggested_fix?: string;
}

interface ValidatorRun {
  run_mode: 'pre-apply' | 'full-world' | 'incremental';
  world_slug: string;
  started_at: string;
  finished_at: string;
  verdicts: Verdict[];
  summary: {
    fail_count: number;
    warn_count: number;
    info_count: number;
    validators_run: string[];
    validators_skipped: { name: string; reason: string }[];
  };
}
```

### Gate semantics

- **pre-apply mode** (called by patch engine): any `fail` blocks the commit; engine returns error listing all fails
- **full-world mode** (called by CLI): reports all verdicts; exit code `1` if any fail, `0` if all pass
- **incremental mode** (called by Hook 5 after write): reports verdicts; logs to `validation_results` table; does not block (write has already happened); surfaces failures via system reminder for skill to react

### Phase 14a migration (canon-addition skill)

Current Phase 14a's 10-test rubric maps to validators:

| Current Phase 14a test | Replaces with |
|---|---|
| Test 1: Domains populated (Rule 2) | `rule2_no_pure_cosmetics` |
| Test 2: Fact structure complete (Rule 1) | `rule1_no_floating_facts` |
| Test 3: Stabilizers for non-universal scope (Rule 4) | `rule4_no_globalization_by_accident` |
| Test 4: Consequences materialized (Rule 5) | `rule5_no_consequence_evasion` |
| Test 5: Retcon policy observed (Rule 6) | `rule6_no_silent_retcons` |
| Test 6: Mystery Reserve preserved (Rule 7) | `rule7_mystery_reserve_preservation` |
| Test 7: Required updates enumerated AND patched | `cross_file_reference` + `rule5_no_consequence_evasion` |
| Test 8: Stabilizer mechanisms named | `rule4_no_globalization_by_accident` (extended) |
| Test 9: Verdict cites phases | **Kept in skill as judgment** — not a mechanical check |
| Test 10: No specialness inflation (Rule 3) | `rule3_no_specialness_inflation` |

Post-migration, the skill's Phase 14a collapses to:
1. Call `mcp__worldloom__validate_patch_plan(plan)`
2. Inspect returned verdicts; loop back to relevant Phase if any `fail`
3. Hand-write the Test 9 (verdict cites phases) PASS/FAIL in the adjudication record

### CLI usage

```
world-validate <world-slug>                  # full audit; all validators
world-validate <world-slug> --rules=1,2,6    # subset of rule-derived validators
world-validate <world-slug> --structural     # structural validators only
world-validate <world-slug> --json           # machine-readable output (for CI / hooks)
world-validate <world-slug> --file <path>    # single-file scope
world-validate <world-slug> --since <commit> # only files changed since git commit (for diff workflows)
world-validate --help
world-validate --version
```

Exit codes: `0` all pass, `1` any fail, `2` invalid world slug, `3` index missing.

### Bootstrap audit (SPEC-08 Phase 1 acceptance criterion)

Before Phase 2 (patch engine + edit-guards) activates, run `world-validate animalia`. Any latent defects surfaced (pre-existing inconsistencies in the 47 CFs, 18 CHs, 17 PAs) are documented, and either resolved via a one-off cleanup canon-addition run OR accepted as grandfathered (recorded in a `validation_results` row with severity `info` and a human-authored reason).

### Validator implementation pattern

```typescript
export const rule1NoFloatingFacts: Validator = {
  name: 'rule1_no_floating_facts',
  severity_mode: 'fail',
  applies_to: (ctx) => ctx.run_mode !== 'incremental' || ctx.touched_files.some(f => f.match(/_source\/canon\/CF-\d+\.yaml$/)),
  run: async (input, ctx) => {
    const verdicts: Verdict[] = [];
    const cfRecords = await ctx.index.query({ record_type: 'canon_fact_record', world_slug: input.world_slug });
    for (const cf of cfRecords) {
      // cf.parsed is pre-parsed YAML; no markdown parsing step needed
      if (!cf.parsed.domains_affected || cf.parsed.domains_affected.length === 0) {
        verdicts.push({
          validator: 'rule1_no_floating_facts',
          severity: 'fail',
          code: 'rule1.missing_domains_affected',
          message: `CF ${cf.parsed.id} has empty domains_affected`,
          location: { file: cf.file_path, record_id: cf.parsed.id },
        });
      }
      // ... other checks ...
    }
    return verdicts;
  },
};
```

The key simplification post-SPEC-13: `cf.parsed` is pre-parsed YAML from the index (one file = one record = one parse). Pre-SPEC-13 validators had to locate fenced YAML blocks within a monolithic markdown file, extract them, and parse each — now every atomic file is already in parsed form in the index.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| Rules 1–7 | Each rule has a dedicated validator enforcing it mechanically |
| §Change Control Policy | `rule6_no_silent_retcons` + `attribution_comment` + `modification_history_retrofit` jointly enforce downstream-updates discipline |
| §Canon Fact Record Schema | `yaml_parse_integrity` validates every fenced-YAML block parses and has required fields |
| §Acceptance Tests | Remain author-driven judgment; not mechanized (these are about world coherence, not schema compliance) |
| HARD-GATE discipline | Pre-apply validators are the gate's teeth; engine cannot commit on any `fail` |

## Verification

- **Unit**: each of 14 validators tested against known-good and known-bad fixtures
- **Integration**: run full validator suite against animalia; compare verdicts against a hand-audit baseline
- **Pre-apply mode**: submit a patch plan with a deliberate Rule 4 violation (non-global CF missing `why_not_universal`); verify engine rejects
- **Full-world mode**: run `world-validate animalia`; verify exit code; verify JSON output parses
- **Incremental mode**: after a test write, run Hook 5; verify only relevant validators run (by `applies_to` filter)
- **Phase 14a migration**: replay a historical canon-addition run through the new validator-based Phase 14a; verify all 10 tests map cleanly
- **False-positive baseline**: run rule validators on unmodified animalia; no fails (zero-false-positive baseline)

## Out of Scope

- Style validators (prose tone, register consistency)
- Linguistic validators (readability metrics)
- Validators requiring LLM calls (all validators are deterministic code)
- Cross-world validators
- Historical validator state (only most-recent run persisted)
- Validator conflict resolution (if two validators disagree, both verdicts are reported; human resolves)

## Risks & Open Questions

- **False-positive rate on Rule 3 superlative detection**: regex-based detection may misfire on legitimate uses. Mitigation: start conservative (require stabilizer citation only for top-N superlatives); expand via empirical calibration.
- **Validator drift from prose rubric**: the Phase 14a prose rubric in `canon-addition/SKILL.md` must be deleted or redirected to this spec; otherwise two sources of truth. Mitigation: SPEC-06 skill rewrite removes the prose rubric and references validators by name.
- **Performance on large worlds**: full-world validation of a 12,000-line world should complete in <10s. If slower, parallelize per validator.
- **Validator additions post-Phase-2**: new validators are additive; existing patch plans continue to pass. Migration: new validator runs as `warn` for one release cycle, then `fail`.
