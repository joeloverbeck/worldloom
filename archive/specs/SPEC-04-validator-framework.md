<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-04: Validator Framework

**Status**: COMPLETED
**Phase**: 2 Tier 1 (structural validators activate via CLI; pre-apply MCP/engine integration is present)
**Depends on**: [SPEC-01 World Index](SPEC-01-world-index.md) (archived 2026-04-22), [SPEC-13 Atomic-Source Migration](SPEC-13-atomic-source-migration.md) (archived 2026-04-24 — validators consume atomic YAML records directly)
**Blocks**: SPEC-05 Hook 5 (PostToolUse; Phase 2 Tier 3), SPEC-06 (skills replace mechanized Phase 14a tests with validator calls)

## Problem Statement

FOUNDATIONS.md Rules 1–7 currently live as prose assertions in `canon-addition/references/foundations-and-rules-alignment.md`. Phase 14a's 10-test rubric lives as prose in `canon-addition/SKILL.md` Validation Tests. Structural invariants (YAML parse integrity, id uniqueness, record-schema compliance) have no enforcement at all — they're implicit. Every skill must re-read the rubric, and the model re-interprets it every run.

**Post-SPEC-13 context**: validators consume atomic YAML records from `worlds/<slug>/_source/` directly. No markdown parse step is needed for CF / CH / INV / M / OQ / ENT / SEC records. Hybrid files keep their structured surfaces: characters and diegetic artifacts use YAML frontmatter; adjudications use a canonical Discovery block. The validator inputs are simpler, typed, and schema-validatable.

**Source context**: `brainstorming/structure-aware-retrieval.md` §5 (validators) and SPEC-13 §C (amendments to this spec). Brainstorm decision: executable validators replace prose assertions for structural checks; semantic rules remain skill-judgment. Validators must be deterministic code, not prose heuristics.

## Approach

One TypeScript module per mechanized validator, running in three contexts:
1. **Patch engine pre-apply gate** (SPEC-03 Phase A step 5) — `mode: 'pre-apply'`, input is `(current_world_state + proposed_patch_plan)`
2. **Standalone CLI** (`world-validate`) — `mode: 'full-world'`, input is a world slug
3. **Hook 5 PostToolUse** (SPEC-05) — `mode: 'incremental'`, input is a list of just-mutated `_source/*.yaml` or hybrid-file paths

A validator is a function `(input, context) => Verdict[]`. Verdicts have uniform shape. The framework runs validators in parallel per input, aggregates verdicts, and writes them to the `validation_results` table in the index.

**No prose-content heuristics.** Every mechanized validator inspects structural fields, enum values, ID references, patch-plan op shapes, or JSON Schema compliance. Rules whose enforcement is inherently semantic (Rule 3 specialness inflation; the stabilizer-quality clause of Rule 4; the forbidden-answer overlap clause of Rule 7) remain `canon-addition` / `propose-new-canon-facts` skill-judgment rather than being mechanized with regex or NLP proxies. The skill-judgment catchment is named explicitly in the validator inventory and Phase 14a migration table below.

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
│   ├── schemas/                    # JSON Schemas per record class (see below)
│   └── cli/
│       └── world-validate.ts       # standalone CLI entry
├── tests/
└── fixtures/                       # small worlds with known-good and known-bad states
```

**Retired vs pre-SPEC-13**: `attribution-comment.ts` retired (attribution is now a structural field on records, not an HTML-comment authoring surface); `anchor-integrity.ts` retired (atomic records don't have prose-anchor drift; hybrid-file anchor drift is handled by the patch engine directly in SPEC-03's anchor-miss handling for hybrid files).

**Added post-SPEC-13**: `record-schema-compliance.ts` (validates each `_source/*.yaml` file against its record type's JSON Schema — one schema per CF / CH / INV / M / OQ / ENT / SEC / PA / CHAR / DA class; see §JSON Schemas below); `touched-by-cf-completeness.ts` (bidirectional CF↔SEC mapping check — for each SEC with `touched_by_cf: [CF-X]`, verifies CF-X's `required_world_updates` includes this SEC's `file_class`; for each CF with `required_world_updates: [FILE_CLASS]`, verifies at least one SEC under `_source/<file-subdir>/` has this CF in `touched_by_cf` or in an `extensions[].originating_cf`).

**Not mechanized (skill-judgment only)**: `rule3_no_specialness_inflation` remains `canon-addition` Phase 14a Test 10 prose-judgment (see `.claude/skills/canon-addition/SKILL.md:223`). Mechanical detection of "unmotivated superlative register" would require prose-content heuristics (regex over CF `statement` / `visible_consequences`; semantic evaluation of `distribution.why_not_universal` stabilizer quality); Rule 3 is inherently semantic and is kept in the skill-judgment catchment, parallel to the Phase 14a Test 9 precedent.

### JSON Schemas

`record_schema_compliance` requires one JSON Schema per record class. Schemas live at `tools/validators/src/schemas/<record-class>.schema.json`:

- `canon-fact-record.schema.json` (CF) — authoritative shape from FOUNDATIONS.md §Canon Fact Record Schema
- `change-log-entry.schema.json` (CH)
- `invariant.schema.json` (INV — single shape across ONT / CAU / DIS / SOC / AES; category preserved in the record's `category` field)
- `mystery-reserve.schema.json` (M — fields per `worlds/animalia/_source/mystery-reserve/M-*.yaml` shape: `id`, `title`, `status`, `knowns`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`, `domains_touched`, `future_resolution_safety`, `extensions`)
- `open-question.schema.json` (OQ)
- `entity.schema.json` (ENT)
- `section.schema.json` (SEC — single shape; `file_class` enum discriminator covers all 7 subtypes ELF / INS / MTS / GEO / ECR / PAS / TML)
- `adjudication-discovery.schema.json` (PA Discovery block only; adjudication records are markdown with canonical Discovery fields, not YAML frontmatter)
- `character-frontmatter.schema.json` (CHAR, frontmatter only)
- `diegetic-artifact-frontmatter.schema.json` (DA, frontmatter only)

**Source of truth**: CF's schema is derived by hand from FOUNDATIONS.md §Canon Fact Record Schema (which is authoritative). Other classes' schemas are derived from the atomic-source record shapes introduced by SPEC-13 and verified against the current animalia corpus. Schemas enforce (a) required-field presence, (b) field-type constraints, (c) enum-value constraints, (d) `id` pattern regex.

**ID pattern variance**: the MR schema's id pattern is `^M-\d+$` to match the animalia corpus (records `M-1` through `M-NN`, unpadded); all other classes require zero-padded 4-digit ids per CLAUDE.md §ID Allocation Conventions (e.g., `^CF-\d{4}$`). Re-padding animalia MR ids is a separate world-maintenance decision outside this spec's scope. New worlds produced by `create-base-world` should emit zero-padded MR ids; this is a `create-base-world` concern, not a validator concern.

### Validator inventory (13 mechanized + 1 skill-judgment)

#### Rule-derived mechanized validators (6)

| Validator | FOUNDATIONS rule | Checks |
|---|---|---|
| `rule1_no_floating_facts` | Rule 1 | CF records have non-empty `domains_affected`, `scope`, `costs_and_limits`, `visible_consequences`; `prerequisites` populated for operationally-conditioned types (`capability`, `artifact`, `technology`, `institution`, `ritual`, `event`, `craft`, `resource_distribution`) |
| `rule2_no_pure_cosmetics` | Rule 2 | `domains_affected` non-empty and drawn from canonical enum (labor, embodiment, social_norms, architecture, mobility, law, trade, war, kinship, religion, language, status_signaling, ecology, daily_routine) plus established ledger extensions (economy, settlement_life, memory_and_myth, magic, medicine, status_order, warfare, taboo_and_pollution) |
| `rule4_no_globalization_by_accident` | Rule 4 | Any CF with non-`global` geographic OR non-`public` social scope has `distribution.why_not_universal` populated with at least one entry. **Structural-only**: no prose inspection of stabilizer quality. Stabilizer-quality judgment remains `canon-addition` Phase 14a Tests 3/8 skill-judgment. |
| `rule5_no_consequence_evasion` | Rule 5 | **Pre-apply mode only** (skipped in full-world and incremental modes — no drafted patch to diff against; state-side equivalent check delivered by `touched_by_cf_completeness`). Every entry in the proposed CF's `required_world_updates` (a `file_class` list per SPEC-13) has at least one op in the submitted patch plan targeting a record whose `file_class` matches. Structural-only: no prose inspection of the proposal to identify "2nd/3rd-order consequences". |
| `rule6_no_silent_retcons` | Rule 6 | Every CF modification has (a) a CH entry with matching `affected_fact_ids`, (b) a `modification_history` array entry appended to the modified CF referencing the CH. Both conjuncts required. Post-SPEC-13 attribution is a structural record field, not an HTML-comment authoring surface — the pre-SPEC-13 "attribution comment" conjunct is retired (see Retired validators note above). |
| `rule7_mystery_reserve_preservation` | Rule 7 | **Structural-only.** New MR entries (added via patch plan ops or discovered at full-world audit) have non-empty `unknowns`, `knowns`, `disallowed_cheap_answers`, `domains_touched` fields, and valid enum values for `status` (`active \| passive \| forbidden`) and `future_resolution_safety`. Existing MR entries retain those fields across extensions. Field names match current animalia data (`worlds/animalia/_source/mystery-reserve/M-*.yaml`); FOUNDATIONS.md §Mystery Reserve prose describes the concerns by intent, and the record shape's field names are the structural surface. **No forbidden-answer overlap / collision check** — overlap detection is inherently prose-judgment and remains `canon-addition` Phase 12 / `propose-new-canon-facts` Phase 7 skill-judgment (see `.claude/skills/propose-new-canon-facts/references/phase-7-canon-safety-check.md`). |

#### Rule-derived skill-judgment (1, not mechanized)

| Rule | Catchment |
|---|---|
| Rule 3 No Specialness Inflation | `canon-addition` Phase 14a Test 10 prose-judgment; `propose-new-canon-facts` Phase 8 per-card check. Inherently semantic; no structural proxy is substitutable without inviting prose-heuristic brittleness. Skill prose rubric is the load-bearing enforcement surface. |

#### Structural validators (7)

| Validator | Checks |
|---|---|
| `yaml_parse_integrity` | Every `_source/*.yaml` file parses as valid YAML; required top-level keys present per record type; trimmed fields trimmed cleanly. Hybrid-file frontmatter for characters and diegetic artifacts is also parsed; PA adjudication Discovery blocks are checked by `adjudication_discovery_fields`. |
| `id_uniqueness` | No duplicate CF-NNNN / CH-NNNN / INV-IDs / M-NNNN / OQ-NNNN / ENT-NNNN / SEC-* / PA-NNNN / CHAR-NNNN / DA-NNNN / PR-NNNN / BATCH-NNNN / AU-NNNN / RP-NNNN within a world; cross-record-class uniqueness not required but intra-class uniqueness strict. Comparison is **string-literal** (no zero-padding normalization); padding-drift (e.g., `M-1` vs `M-0001` coexisting in a world) is caught by `record_schema_compliance` via each schema's `id` pattern regex, not by `id_uniqueness`. |
| `cross_file_reference` | Every id referenced in CF `derived_from`, CF `required_world_updates` (now a `file_class` list), CH `affected_fact_ids`, `modification_history[].originating_cf`, `extensions[].originating_cf`, `extensions[].change_id`, SEC `touched_by_cf[]` resolves to an indexed record. No orphan references. |
| `record_schema_compliance` | Every `_source/*.yaml` file and supported hybrid structured surface validates against its record type's JSON Schema (one schema per CF / CH / INV / M / OQ / ENT / SEC / PA / CHAR / DA class; see §JSON Schemas above). For PA records, the structured surface is the markdown Discovery block. Field types, enum values, required-field presence, and id-pattern regex all enforced structurally. |
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
    node_id?: string;                  // record id (CF-NNNN, CH-NNNN, etc.); named node_id for schema parity with world-index
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

**Persistence**: `ValidatorRun` is runtime-only — it is returned to callers (CLI, MCP tool, engine pre-apply gate) but NOT persisted. Per-verdict rows persist to the `validation_results` table in `worlds/<slug>/_index/world.db` (schema at `tools/world-index/src/schema/migrations/001_initial.sql:124-136`) with each row stamped `created_at`; the SQL row shape is `(result_id, world_slug, validator_name, severity, code, message, node_id, file_path, line_range_start, line_range_end, created_at)`. Run-level metadata (started_at, finished_at, summary) is not persisted.

### Per-run-mode applicability matrix

| Validator | pre-apply | full-world | incremental |
|---|---|---|---|
| `rule1_no_floating_facts` | ✓ | ✓ | ✓ (on CF writes) |
| `rule2_no_pure_cosmetics` | ✓ | ✓ | ✓ (on CF writes) |
| `rule3_no_specialness_inflation` | — | — | — (N/A — skill-judgment only) |
| `rule4_no_globalization_by_accident` | ✓ | ✓ | ✓ (on CF writes) |
| `rule5_no_consequence_evasion` | ✓ | — | — (needs patch plan; no drafted patch in non-pre-apply modes) |
| `rule6_no_silent_retcons` | ✓ | ✓ | ✓ (on CF or CH writes) |
| `rule7_mystery_reserve_preservation` | ✓ | ✓ | ✓ (on M writes) |
| `yaml_parse_integrity` | ✓ | ✓ | ✓ |
| `id_uniqueness` | ✓ | ✓ | ✓ |
| `cross_file_reference` | ✓ | ✓ | ✓ |
| `record_schema_compliance` | ✓ | ✓ | ✓ |
| `touched_by_cf_completeness` | ✓ | ✓ | ✓ (on SEC or CF writes) |
| `modification_history_retrofit` | ✓ | ✓ | ✓ (on CF writes) |
| `adjudication_discovery_fields` | ✓ | ✓ | ✓ (on PA writes) |

The `applies_to` predicate on each validator implements the incremental-mode filtering (see Validator implementation pattern below).

### Gate semantics

- **pre-apply mode** (called by patch engine): any `fail` blocks the commit; engine returns error listing all fails
- **full-world mode** (called by CLI): reports all verdicts; exit code `1` if any fail, `0` if all pass
- **incremental mode** (called by Hook 5 after write): reports verdicts; logs to `validation_results` table; does not block (write has already happened); surfaces failures via system reminder for skill to react

### Phase 14a migration (canon-addition skill)

Current Phase 14a's 10-test rubric maps to validators as follows. Note the split: structural cores mechanize to validators; semantic layers remain skill-judgment.

| Current Phase 14a test | Replaces with |
|---|---|
| Test 1: Domains populated (Rule 2) | `rule2_no_pure_cosmetics` |
| Test 2: Fact structure complete (Rule 1) | `rule1_no_floating_facts` |
| Test 3: Stabilizers for non-universal scope (Rule 4) | `rule4_no_globalization_by_accident` (structural core: non-empty `why_not_universal`); **stabilizer-quality judgment kept in skill** |
| Test 4: Consequences materialized (Rule 5) | `rule5_no_consequence_evasion` (pre-apply; `file_class` → patch-op matching) |
| Test 5: Retcon policy observed (Rule 6) | `rule6_no_silent_retcons` |
| Test 6: Mystery Reserve preserved (Rule 7) | `rule7_mystery_reserve_preservation` (structural core: required MR fields present and valid enums); **forbidden-answer overlap judgment kept in skill — `canon-addition` Phase 12 / `propose-new-canon-facts` Phase 7** |
| Test 7: Required updates enumerated AND patched | `rule5_no_consequence_evasion` (alone — the structural check already covers both the enumeration and the patch-op matching per deliverable) |
| Test 8: Stabilizer mechanisms named | **Kept in skill as judgment** — stabilizer-quality is semantic; structural field-presence catchment is Test 3 / Rule 4 |
| Test 9: Verdict cites phases | **Kept in skill as judgment** — not a mechanical check |
| Test 10: No specialness inflation (Rule 3) | **Kept in skill as judgment** — Rule 3 not mechanized (see Not-mechanized note in §Package Location) |

Post-migration, the skill's Phase 14a collapses to:
1. Call `mcp__worldloom__validate_patch_plan(plan)` — returns verdicts covering the structural catchments of Tests 1, 2, 3, 4, 5, 6, 7.
2. Inspect returned verdicts; loop back to the relevant Phase if any `fail`.
3. Hand-write PASS/FAIL with one-line rationale in the adjudication record for the surviving skill-judgment tests: **Test 3** (stabilizer-quality assessment on top of the structural pass), **Test 6** (forbidden-answer overlap check against MR entries), **Test 8** (stabilizer mechanism-quality assessment), **Test 9** (verdict cites phases), **Test 10** (specialness inflation — Rule 3 in full).

### Engine integration contract

The MCP pre-apply validation tool imports this package. `tools/world-mcp/src/tools/validate-patch-plan.ts` validates the permissive MCP envelope shape, then delegates to `@worldloom/validators`:

```typescript
const { validatePatchPlan } = await import("@worldloom/validators");
return validatePatchPlan(args.patch_plan);
```

Package: `@worldloom/validators` (published from `tools/validators/package.json`).

Entry function signature:

```typescript
export async function validatePatchPlan(
  envelope: PatchPlanEnvelope
): Promise<{ verdicts: Verdict[] }>;
```

Contract:
- Runs the pre-apply-mode validator set (13 mechanized validators × the `pre-apply` column of the applicability matrix) against `(current_world_state + envelope)`.
- Returns the aggregated verdict list; caller (engine) treats any `severity: 'fail'` as a block.
- The `PatchPlanEnvelope` type is imported from `tools/world-mcp/src/tools/_shared.ts` (already shared between the stub and the real implementation path).

The Verdict interface (see §Verdict schema) matches the existing stub's declaration at `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17`; no MCP response-shape change at swap time.

### CLI usage

```
world-validate <world-slug>                  # full audit; all validators
world-validate <world-slug> --rules=1,2,6    # subset of rule-derived validators
world-validate <world-slug> --structural     # structural validators only
world-validate <world-slug> --json           # machine-readable output (for CI / hooks)
world-validate <world-slug> --file <path>    # single-file scope
world-validate <world-slug> --since <commit> # only files changed since <commit> within the git repository containing <world-slug> (cross-repo diff out of scope)
world-validate --help
world-validate --version
```

Exit codes: `0` all pass, `1` any fail, `2` invalid world slug, `3` index missing.

### Bootstrap audit (SPEC-08 Phase 2 Tier 1 acceptance criterion)

Before SPEC-04 closes Phase 2 Tier 1, run `world-validate animalia` and the integration capstone after the now-wired SPEC-03/MCP pre-apply validation path. Any latent defects surfaced (pre-existing inconsistencies in the 47 CFs, 18 CHs, 17 PAs) are documented, and either resolved via a one-off cleanup canon-addition run OR accepted as grandfathered through `worlds/<slug>/audits/validation-grandfathering.yaml`.

The grandfather policy is exact-match and auditable: each accepted finding records the validator, code, file, optional node id, original message, and human rationale. The runner converts matched `fail` verdicts to `info` verdicts with a `Grandfathered by GF-NNNN` message prefix and rationale in `suggested_fix`, then persists those rows to `validation_results`. Unmatched failures remain `fail` and keep the CLI exit code non-zero.

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
          location: { file: cf.file_path, node_id: cf.parsed.id },
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
| Rules 1, 2, 4, 6, 7 | Each rule has a dedicated structural validator enforcing it mechanically (see §Validator inventory). Rule 4's stabilizer-quality clause and Rule 7's forbidden-answer overlap clause are delegated to skill-judgment rather than mechanized with prose heuristics — the structural core alone is what this spec enforces. |
| Rule 3 | Remains `canon-addition` Phase 14a Test 10 skill-judgment (see §Package Location Not-mechanized note); inherently semantic, no structural proxy is substitutable without inviting prose-heuristic brittleness. |
| Rule 5 | Dedicated validator runs in pre-apply mode only (structural file_class → patch-op matching); state-side equivalent check delivered by `touched_by_cf_completeness` in all three modes. |
| §Change Control Policy | `rule6_no_silent_retcons` + `modification_history_retrofit` jointly enforce downstream-updates discipline. |
| §Canon Fact Record Schema | `record_schema_compliance` validates every CF record against the authoritative JSON Schema derived from FOUNDATIONS.md §Canon Fact Record Schema; `yaml_parse_integrity` validates every `_source/*.yaml` file parses and has required top-level keys per record type. |
| §Acceptance Tests | Remain author-driven judgment; not mechanized (these are about world coherence, not schema compliance). |
| HARD-GATE discipline | Pre-apply validators are the gate's teeth; engine cannot commit on any `fail`. |

## Verification

- **Unit**: each of 13 mechanized validators tested against known-good and known-bad fixtures
- **Integration**: run full validator suite against animalia; compare verdicts against a hand-audit baseline
- **Pre-apply mode**: submit a patch plan with a deliberate Rule 4 violation (non-global CF missing `why_not_universal`); verify engine rejects
- **Full-world mode**: run `world-validate animalia`; verify exit code; verify JSON output parses; for animalia, verify the grandfathered bootstrap baseline emits 224 `info` verdicts and zero `fail` verdicts
- **Incremental mode**: after a test write, run Hook 5; verify only relevant validators run (per the §Per-run-mode applicability matrix via each validator's `applies_to` predicate)
- **Phase 14a migration**: replay a historical canon-addition run through the new validator-based Phase 14a; verify Tests 1, 2, 3 (structural), 4, 5, 6 (structural), 7 map cleanly to validators; verify Tests 3 (stabilizer quality), 6 (MR overlap), 8, 9, 10 remain skill-judgment producing hand-written PASS/FAIL with rationale
- **False-positive / bootstrap baseline**: run mechanized validators on unmodified animalia and compare verdicts against the hand-audit baseline. SPEC04VALFRA-007 landed the capstone and current structured baseline; SPEC04VALFRA-008 landed the explicit grandfather disposition, so the broader Phase 2 Tier 1 gate treats those exact bootstrap findings as `info` while preserving new or changed findings as `fail`.
- **Engine rewire**: `tools/world-mcp/src/tools/validate-patch-plan.ts` delegates to the real `@worldloom/validators` import per the §Engine integration contract; submit a plan and confirm verdicts flow through
- **Schema conformance**: run `record_schema_compliance` against animalia's `_source/` tree and supported hybrid/PA structured surfaces; zero schema violations are expected for atomic `_source/` records after ticket 002, while hybrid/PA findings are handled through the Bootstrap audit when they reflect pre-existing corpus drift.

## Out of Scope

- Prose-content validators (style, tone, register consistency, readability metrics, superlative detection, hand-wave detection)
- Validators requiring LLM calls (all mechanized validators are deterministic code)
- Cross-world validators
- Historical validator state (only most-recent run persisted to `validation_results`)
- Validator conflict resolution (if two validators disagree, both verdicts are reported; human resolves)
- Mechanized Rule 3 enforcement (inherently semantic; kept as skill-judgment)
- Forbidden-answer overlap mechanization for Rule 7 (inherently prose-judgment; kept as skill-judgment)
- Stabilizer-quality assessment for Rule 4 (inherently prose-judgment; kept as skill-judgment)
- Cross-repo git diff for `--since <commit>` (scoped to the world slug's containing repository only)

## Risks & Open Questions

- **Rule 3 left unmechanized**: Rule 3 (no specialness inflation) is inherently semantic and cannot be mechanized without prose-content heuristics. Mitigation: `canon-addition` Phase 14a Test 10 and `propose-new-canon-facts` Phase 8 continue as the catchments for Rule 3, matching the Test 9 precedent for verdict-rationale judgment. Drift from the prose rubric is a SPEC-06 concern, not a SPEC-04 concern.
- **Validator drift from prose rubric**: the Phase 14a prose rubric in `canon-addition/SKILL.md` must be pruned or redirected to this spec for mechanized rules (1, 2, 4 structural core, 5, 6, 7 structural core); Rule 3's Test 10 rubric plus the skill-judgment layers of Tests 3 (stabilizer quality), 6 (MR overlap), 8, 9 remain in-skill. Mitigation: SPEC-06 skill rewrite removes the mechanized-rule prose catchment and references validators by name while preserving the skill-judgment residue.
- **Performance on large worlds**: full-world validation of a 12,000-line world should complete in <10s. If slower, parallelize per validator.
- **Validator additions post-Phase-2**: new validators are additive; existing patch plans continue to pass. Migration: new validator runs as `warn` for one release cycle, then `fail`.
- **MR id-pattern grandfather**: animalia's MR ids are unpadded (`M-1` through `M-NN`) while CLAUDE.md's §ID Allocation Conventions documents `M-NNNN`. The MR JSON Schema's id pattern is deliberately permissive (`^M-\d+$`) to avoid failing the existing corpus; re-padding is a separate world-maintenance decision and is out of scope for this spec. If the decision is to re-pad, it becomes a one-off `canon-addition`-equivalent maintenance run outside the Rule-1–7 enforcement surface.

## Outcome

Completed: 2026-04-25

The validator framework shipped in `tools/validators/` with the 13 mechanized validators named in this spec, package-local build/test coverage, the `world-validate` CLI, and the public `validatePatchPlan` pre-apply entry consumed by the patch-engine/MCP path. The post-SPEC-13 atomic-source input model is the implemented contract: validators consume `_source/*.yaml` records and supported hybrid structured surfaces rather than retired monolithic markdown records.

The Animalia bootstrap audit was dispositioned by `archive/tickets/SPEC04VALFRA-008.md`: the exact 224 pre-existing bootstrap findings are recorded in `worlds/animalia/audits/validation-grandfathering.yaml` and emitted as `info` verdicts, while unmatched or new findings remain `fail` verdicts. Pre-apply validation remains fail-closed.

Deviations from the original plan:

- Rule 3, stabilizer-quality judgment, and Mystery Reserve forbidden-answer overlap remain skill-judgment surfaces rather than mechanized prose heuristics.
- Rule 5 is pre-apply-only in full implementation; full-world state-side coverage is handled by `touched_by_cf_completeness`.
- Animalia historical Mystery Reserve id padding is grandfathered by schema pattern rather than rewritten.

Verification results:

- `cd tools/validators && npm test` passed with 47/47 tests.
- `node tools/validators/dist/src/cli/world-validate.js animalia --json` exited 0 with `fail_count: 0`, `warn_count: 0`, `info_count: 224`; Rule 5 was skipped as `pre-apply-only`.
- SPEC-04 integration coverage proves registry cardinality, full-world grandfather baseline, pre-apply Rule 4 rejection, engine rewire verdict flow, incremental applicability filtering, and Rule 3 skill ownership.
