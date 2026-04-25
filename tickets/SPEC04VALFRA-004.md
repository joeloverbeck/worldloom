# SPEC04VALFRA-004: 6 rule-derived mechanized validators

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds `tools/validators/src/rules/*.ts` (6 new validator modules: Rules 1, 2, 4, 5, 6, 7); appends 6 entries to the package-internal registry introduced by ticket 003. No modifications to existing pipeline code. Rule 3 is explicitly NOT mechanized per the reassessed spec's §Package Location Not-mechanized note.
**Deps**: archive/tickets/SPEC04VALFRA-001.md, archive/tickets/SPEC04VALFRA-002.md, SPEC04VALFRA-003

## Problem

The reassessed SPEC-04 §Validator inventory rule-derived mechanized set (6 validators) enforces FOUNDATIONS Rules 1, 2, 4, 5, 6, 7 via structural-only checks — no prose-content heuristics, no regex over natural-language CF statements, no "hand-wave vs mechanism" semantic judgments. This posture is load-bearing: the reassessment's User Hint ("I'm concerned some validators may be too brittle. I don't want heuristics based on prose content.") shaped five Issues (I2–I5, and most critically I1 on Rule 7) whose resolution stripped every prose heuristic from the mechanized surface.

Rule 3 (No Specialness Inflation) is inherently semantic and is kept as `canon-addition` Phase 14a Test 10 skill-judgment (confirmed in-spec via the §Not mechanized note; also see `.claude/skills/canon-addition/SKILL.md:223`). This ticket does NOT produce a `rule3-no-specialness-inflation.ts` file.

Rule 7 specifically uses the data-layer MR field names (`unknowns`, `knowns`, `disallowed_cheap_answers`, `domains_touched`, `future_resolution_safety`) per reassessment Issue I1 — prose-sourced names (`what_is_unknown`, `forbidden_answers`, `what_is_known_around_it` from FOUNDATIONS §Mystery Reserve prose) are the drift pitfall that Issue I1 fixes. The MR validator does NOT attempt forbidden-answer overlap detection; overlap is inherently prose-judgment and remains `canon-addition` Phase 12 / `propose-new-canon-facts` Phase 7 skill-judgment.

Rule 5 (No Consequence Evasion) runs in **pre-apply mode only** — it compares the proposed CF's `required_world_updates` against ops in the submitted patch plan. Full-world and incremental modes skip Rule 5 because there is no drafted patch to diff against; the state-side equivalent check is delivered by `touched_by_cf_completeness` from ticket 003.

## Assumption Reassessment (2026-04-25)

1. Framework + schemas + structural validators + registry all land in tickets 001–003. This ticket consumes `Verdict`/`Validator`/`Context` from framework, consults `ctx.patch_plan` for Rule 5's pre-apply-only check, and appends to `tools/validators/src/public/registry.ts` introduced by ticket 003 §8.
2. The canon-distribution-enum that `rule2_no_pure_cosmetics` enforces is per the reassessed SPEC-04 inventory line — 14 canonical domains (labor, embodiment, social_norms, architecture, mobility, law, trade, war, kinship, religion, language, status_signaling, ecology, daily_routine) plus 8 established ledger extensions (economy, settlement_life, memory_and_myth, magic, medicine, status_order, warfare, taboo_and_pollution) = 22 total. This enum is defined in this ticket as `tools/validators/src/rules/_shared/domain-enum.ts` and is load-bearing — adding a new domain requires a `canon-addition` run followed by a validator update (which becomes its own ticket; this decomposition assumes the current 22-entry enum is stable).
3. Rule 4's structural core checks: when `scope.geographic` is non-`global` (i.e., one of `local | regional | cosmic`) OR `scope.social` is non-`public` (one of `restricted_group | elite | secret | rumor`), `distribution.why_not_universal` must be non-empty. The reassessed spec stripped the "stabilizer cites mechanism, not hand-wave" gloss per Issue I3; the surviving structural core is non-empty-list enforcement only.
4. Rule 5's pre-apply check: for each op in `ctx.patch_plan.patches` that creates or updates a CF record, extract the CF's `required_world_updates` (a `file_class` list per SPEC-13, NOT a filename list — reassessment Issue I10). For each `file_class` listed, verify at least one op in the same patch plan targets a record whose class maps to that `file_class` (CF's required_world_updates includes `PEOPLES_AND_SPECIES` → at least one `create_sec_record` or `update_record_field` op in the patch plan targets a `SEC-PAS-NNN` record). The validator does NOT parse CF prose for "2nd/3rd-order consequences" — reassessment Issue I4 explicitly strips that clause.
5. Rule 6's two conjuncts (reduced from three per reassessment Issue I5): every CF modification has (a) a CH entry in the patch plan with matching `affected_fact_ids`, AND (b) a `modification_history[]` entry appended to the modified CF referencing the CH. The pre-SPEC-13 attribution-comment conjunct (c) is retired; the FOUNDATIONS.md §439 reference to "attribution compliance" is a cross-spec doc-drift concern owned by SPEC-07 Part B, not by this ticket.
6. Rule 7's structural-only posture: new MR entries have non-empty `unknowns`, `knowns`, `disallowed_cheap_answers`, `domains_touched` + valid enum values for `status` (`active | passive | forbidden`) and `future_resolution_safety` (enum set TBD; confirm against animalia's corpus at implementation time — likely `low | medium | high` based on the M-1 sample field `future_resolution_safety: medium`). No collision check. No prose-content analysis.
7. Shared boundary: the 6 rule modules append to `structuralValidators`'s sibling `ruleValidators: readonly Validator[]` array in `tools/validators/src/public/registry.ts` (created in ticket 003). Ticket 005 (CLI `--rules=<list>` filter) consults `ruleValidators` separately from `structuralValidators` so `world-validate --rules=1,2,6` can filter by rule-index prefix (`rule1_`, `rule2_`, `rule6_`) without conflating.
8. FOUNDATIONS principle under audit: **Rules 1, 2, 4, 5, 6, 7** — each validator in this ticket enforces its named rule at least as strictly as existing canon-pipeline skills (`canon-addition`, `continuity-audit`, `propose-new-canon-facts`). The reassessed spec's FOUNDATIONS Alignment table confirms this: mechanized rules have dedicated structural validators; Rules 4/7 delegate their semantic layers to skill-judgment. No Rule is weakened.
9. Schema extension posture: **additive-only**. 6 new validator modules; registry appended; no existing atomic record shape or hybrid-file frontmatter modified.

## Architecture Check

1. One module per rule validator (mirroring the structural-per-file convention from ticket 003). Each file is ~60–120 LOC; per-rule test fixtures are per-file.
2. The shared `domain-enum.ts` lives under `src/rules/_shared/` rather than inside `rule2`'s file, because future tickets that add Rule 11 / Rule 12 (per SPEC-09 Phase 2.5's `validator-rule-11-action-space` and `-rule-12-redundancy`) may reference the same canonical domain enum — co-locating it with Rule 2 would force those future rules to reach into Rule 2's internals or re-declare the enum.
3. `rule5_no_consequence_evasion`'s `applies_to` predicate returns `ctx.run_mode === 'pre-apply'`. This makes the per-run-mode applicability matrix a compile-time invariant of the validator module itself — Hook 5 (SPEC-05 Part B, incremental mode) consulting the registry and skipping Rule 5 happens automatically without a Hook 5-side filter.
4. `rule7_mystery_reserve_preservation` uses JSON Schema validation (loaded from ticket 002's `mystery-reserve.schema.json`) for the field-presence check. This is strictly weaker than `record_schema_compliance`'s same check — Rule 7 adds nothing beyond schema compliance for NEW MR entries. The rationale for keeping Rule 7 as its own validator rather than collapsing into `record_schema_compliance`: Rule 7's `name` and `code` values surface the Mystery-Reserve-firewall concern distinctly in `validation_results`, so an auditor scanning the table can identify MR-specific findings at a glance. The validator boundary serves audit-trail clarity, not new structural enforcement.
5. No backwards-compatibility aliasing/shims introduced. Each validator targets the post-SPEC-13 atomic-record shape. No retired validator names (`attribution_comment`, `anchor_integrity`) appear in module names, `name` fields, or code references.

## Verification Layers

1. All 6 rule validators export correct `Validator`-conforming objects → codebase grep-proof (`grep -c "^export const \(rule1NoFloatingFacts\|rule2NoPureCosmetics\|rule4NoGlobalizationByAccident\|rule5NoConsequenceEvasion\|rule6NoSilentRetcons\|rule7MysteryReservePreservation\): Validator" tools/validators/src/rules/*.ts` returns 6).
2. Rule 3 is NOT mechanized → codebase grep-proof (`find tools/validators/src/rules -name "rule3*"` returns empty; `grep -c "rule3_no_specialness_inflation" tools/validators/src/` returns 0).
3. Rule 5's `applies_to` is pre-apply-only → direct read of `tools/validators/src/rules/rule5-no-consequence-evasion.ts` shows `applies_to: (ctx) => ctx.run_mode === 'pre-apply'`.
4. Rule 7's field-name set matches animalia data → cross-reference between `rule7-mystery-reserve-preservation.ts` required-fields list and `worlds/animalia/_source/mystery-reserve/M-1.yaml` top-level keys.
5. Rule 4's structural core (non-empty `why_not_universal` for non-global/non-public scope) → fixture test (a CF with `scope.geographic: local` and `distribution.why_not_universal: []` emits `fail`; same CF with `why_not_universal: ['one stabilizer']` passes).
6. Rule 5 pre-apply — file_class ↔ patch-op matching → fixture test (a patch plan with a `create_cf_record` op whose CF has `required_world_updates: [INSTITUTIONS]` but NO `create_sec_record` / `update_record_field` op targeting a `SEC-INS-*` record emits `fail`; adding the SEC op removes the verdict).
7. Rule 6 two-conjunct requirement → fixture test (CF modification in patch plan with a CH op but NO `append_modification_history_entry` on the modified CF → `fail`; with BOTH → pass).
8. Rule 7 required-fields check against a synthetic MR missing `disallowed_cheap_answers` → `fail`.
9. All 6 rule validators pass against unmodified animalia in full-world mode (Rule 5 skips) → zero `fail` verdicts (zero-false-positive baseline per spec §Verification).
10. FOUNDATIONS Rule 7 preservation check → manual review: Rule 7's `run` function body contains no regex over prose fields, no `string.includes` on `statement` or `visible_consequences`, no substring matching between proposed CF text and MR `disallowed_cheap_answers` list.

## What to Change

### 1. Create `tools/validators/src/rules/_shared/domain-enum.ts`

Export `export const CANONICAL_DOMAINS: readonly string[] = [...]` with the 22-entry list per Assumption Reassessment §2. Also export `export function isCanonicalDomain(value: string): boolean` for direct consumption by Rule 2.

### 2. Create `tools/validators/src/rules/rule1-no-floating-facts.ts`

Export `rule1NoFloatingFacts: Validator`. `name: 'rule1_no_floating_facts'`, `severity_mode: 'fail'`. `applies_to`: all modes; incremental only on CF writes. `run`: for each CF, check non-empty `domains_affected`, `scope` (with all three sub-fields present), `costs_and_limits`, `visible_consequences`. For CFs of type in `{capability, artifact, technology, institution, ritual, event, craft, resource_distribution}`, additionally check non-empty `prerequisites`. Emit `fail` per missing field with `code: 'rule1.missing_<field>'`.

### 3. Create `tools/validators/src/rules/rule2-no-pure-cosmetics.ts`

Export `rule2NoPureCosmetics: Validator`. `name: 'rule2_no_pure_cosmetics'`, `severity_mode: 'fail'`. `applies_to`: all modes; incremental only on CF writes. `run`: for each CF, verify `domains_affected` is non-empty AND every entry is in `CANONICAL_DOMAINS`. Emit `fail` per non-canonical domain with `code: 'rule2.non_canonical_domain'`, `message` naming the offending domain and the CF id.

### 4. Create `tools/validators/src/rules/rule4-no-globalization-by-accident.ts`

Export `rule4NoGlobalizationByAccident: Validator`. `name: 'rule4_no_globalization_by_accident'`, `severity_mode: 'fail'`. `applies_to`: all modes; incremental only on CF writes. `run`: for each CF, check `scope.geographic ∈ {local, regional, cosmic}` OR `scope.social ∈ {restricted_group, elite, secret, rumor}`; when either trigger fires, require `distribution.why_not_universal` to be a non-empty array. On violation: `fail` with `code: 'rule4.missing_why_not_universal'`. No prose inspection; no stabilizer-quality judgment.

### 5. Create `tools/validators/src/rules/rule5-no-consequence-evasion.ts`

Export `rule5NoConsequenceEvasion: Validator`. `name: 'rule5_no_consequence_evasion'`, `severity_mode: 'fail'`. `applies_to: (ctx) => ctx.run_mode === 'pre-apply'`. `run`: for each `create_cf_record` / `update_record_field` op in `ctx.patch_plan.patches` whose target is a CF, extract the CF's `required_world_updates` (`file_class` list). For each `file_class`, verify at least one op in the same patch plan targets a record whose class matches — CF says `[INSTITUTIONS]` → at least one `create_sec_record` op with `file_class: INSTITUTIONS` OR an `update_record_field` op targeting a `SEC-INS-*` record. The `file_class → op-shape` mapping is constant. Emit `fail` per missing `file_class` with `code: 'rule5.required_update_not_patched'`.

### 6. Create `tools/validators/src/rules/rule6-no-silent-retcons.ts`

Export `rule6NoSilentRetcons: Validator`. `name: 'rule6_no_silent_retcons'`, `severity_mode: 'fail'`. `applies_to`: all modes; incremental on CF or CH writes. `run` — two modes:
- **Pre-apply**: for every CF modification op (`update_record_field` on a CF, `append_extension` on a CF, or `append_modification_history_entry`), verify the same plan contains a `create_ch_record` op whose CH has `affected_fact_ids` containing the modified CF's id AND an `append_modification_history_entry` op on the CF referencing the CH. Missing either conjunct → `fail` with `code: 'rule6.missing_ch_entry'` or `'rule6.missing_modification_history_entry'`.
- **Full-world / incremental**: for each CF with `modification_history[]` entries, verify each entry's `change_id` resolves to an existing CH record whose `affected_fact_ids` contains the CF's id. Dangling modification_history entries (no matching CH) → `fail` with `code: 'rule6.dangling_modification_history'`.

### 7. Create `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts`

Export `rule7MysteryReservePreservation: Validator`. `name: 'rule7_mystery_reserve_preservation'`, `severity_mode: 'fail'`. `applies_to`: all modes; incremental on M writes. `run`: for each MR record (new in pre-apply mode; all existing in full-world mode; touched-set in incremental mode), verify ALL required fields present and non-empty: `unknowns`, `knowns`, `disallowed_cheap_answers`, `domains_touched`; enum-valid `status` and `future_resolution_safety`. Delegates field-presence to `record_schema_compliance`'s same check but emits verdicts under `rule7_` name for audit-trail clarity. Missing fields → `fail` with `code: 'rule7.missing_<field>'`. NO collision check; NO prose scan.

### 8. Append to `tools/validators/src/public/registry.ts`

Append `export const ruleValidators: readonly Validator[] = [rule1NoFloatingFacts, rule2NoPureCosmetics, rule4NoGlobalizationByAccident, rule5NoConsequenceEvasion, rule6NoSilentRetcons, rule7MysteryReservePreservation];` alongside the existing `structuralValidators` export from ticket 003.

## Files to Touch

- `tools/validators/src/rules/_shared/domain-enum.ts` (new)
- `tools/validators/src/rules/rule1-no-floating-facts.ts` (new)
- `tools/validators/src/rules/rule2-no-pure-cosmetics.ts` (new)
- `tools/validators/src/rules/rule4-no-globalization-by-accident.ts` (new)
- `tools/validators/src/rules/rule5-no-consequence-evasion.ts` (new)
- `tools/validators/src/rules/rule6-no-silent-retcons.ts` (new)
- `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — append `ruleValidators` export)
- `tools/validators/tests/rules/*.test.ts` (new — one test file per rule validator, plus an animalia-zero-false-positive test)

## Out of Scope

- Rule 3 (No Specialness Inflation) — inherently semantic; kept as `canon-addition` Phase 14a Test 10 skill-judgment per the reassessed spec's §Not mechanized note. No code in this ticket.
- Rule 7 forbidden-answer overlap detection — inherently prose-judgment; kept as `canon-addition` Phase 12 / `propose-new-canon-facts` Phase 7 skill-judgment per reassessment Issue I1 resolution.
- Rule 4 stabilizer-quality assessment — inherently prose-judgment; kept as canon-addition Phase 14a Tests 3/8 skill-judgment per reassessment Issue I3.
- Rule 5's "2nd/3rd-order consequences named in proposal" prose clause — stripped per reassessment Issue I4; only the structural `file_class`→patch-op matching clause survives.
- `world-validate` CLI — ticket 005.
- Engine integration — ticket 006.
- Integration capstone + bootstrap audit — ticket 007.
- Adding Rules 11 / 12 from SPEC-09 — scheduled for Phase 2.5 (SPEC-09), not this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` exits 0; all 6 rule-validator test suites pass against known-good and known-bad fixtures.
2. `find tools/validators/src/rules -name "rule3*" -print` returns empty (Rule 3 not mechanized).
3. `grep -c "^export const .*Rule.*: Validator" tools/validators/src/rules/*.ts` returns 6.
4. `grep -c "export const ruleValidators" tools/validators/src/public/registry.ts` returns 1; array literal contains exactly 6 entries.
5. Running all 6 rule validators against unmodified animalia in full-world mode (Rule 5 skipped) emits zero `fail` verdicts (zero-false-positive baseline).
6. Rule 5 fixture: synthesize a patch plan with a CF whose `required_world_updates: [INSTITUTIONS]` but NO matching SEC op; assert the validator emits `fail` with `code: 'rule5.required_update_not_patched'`. Same plan with the matching op added → zero verdicts.
7. Rule 7 fixture: synthesize an MR record missing `disallowed_cheap_answers`; assert `fail` with `code: 'rule7.missing_disallowed_cheap_answers'`. Populate the field → zero verdicts. Also verify no `rule7.*` verdict references `what_is_unknown`, `forbidden_answers`, or any prose-sourced field name.

### Invariants

1. The 6 validator `name` fields are exactly: `rule1_no_floating_facts`, `rule2_no_pure_cosmetics`, `rule4_no_globalization_by_accident`, `rule5_no_consequence_evasion`, `rule6_no_silent_retcons`, `rule7_mystery_reserve_preservation`. Camelcase drift or prefix deviations break the CLI's `--rules=<list>` filter.
2. No rule validator's `run` function body contains regex over CF `statement`, `visible_consequences`, or `distribution` prose fields. No rule validator performs substring matching between proposed CF text and MR `disallowed_cheap_answers`. Any such code path must fail ticket review — the User Hint that shaped reassessment Issues I2–I4 and I1 makes prose-content heuristics a veto-level defect.
3. `rule5_no_consequence_evasion` is `applies_to`-filtered out of full-world and incremental modes. Running Rule 5 in those modes with a non-existent patch plan must NOT throw — the `applies_to` predicate prevents entry.
4. `CANONICAL_DOMAINS` has exactly 22 entries matching the reassessed SPEC-04 Rule 2 row. Adding or removing a domain is a separate canon-addition-driven workflow, not an inline amendment.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule1-no-floating-facts.test.ts` — CFs missing each required field (domains_affected, scope sub-field, costs_and_limits, visible_consequences, and prerequisites for operationally-conditioned types).
2. `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` — CF with non-canonical domain; CF with empty domains_affected.
3. `tools/validators/tests/rules/rule4-no-globalization-by-accident.test.ts` — local-scope CF with empty `why_not_universal` (fail); local-scope CF with single entry (pass); global+public CF ignored by validator.
4. `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` — pre-apply fixture patch plans with / without matching SEC ops; full-world fixture asserts validator skips.
5. `tools/validators/tests/rules/rule6-no-silent-retcons.test.ts` — pre-apply fixture with / without CH op and modification_history entry; full-world fixture with dangling modification_history entry.
6. `tools/validators/tests/rules/rule7-mystery-reserve-preservation.test.ts` — MR records missing each required data-layer field; synthetic MR with prose-sourced field names (`what_is_unknown`) must NOT satisfy Rule 7 — the validator must emit `fail` on the missing `unknowns` etc.
7. `tools/validators/tests/rules/animalia-zero-false-positive.test.ts` — run all 6 rule validators against `worlds/animalia/_source/` in full-world mode (Rule 5 auto-skipped); assert zero `fail` verdicts.

### Commands

1. `cd tools/validators && npm run build && npm run test` (targeted).
2. `grep -rn "includes.*statement\|match.*statement\|regex.*statement\|\.test(.*statement" tools/validators/src/rules/` returns zero hits (prose-content-heuristic veto).
3. `grep -rn "what_is_unknown\|forbidden_answers\|what_is_known_around_it" tools/validators/src/rules/` returns zero hits (prose-sourced MR field names must not appear).
4. Reviewer sanity: `cd tools/validators && node -e "const {ruleValidators} = require('./dist/src/public/registry'); for (const v of ruleValidators) { console.log(v.name, v.severity_mode); }"` prints all 6 rule names.
