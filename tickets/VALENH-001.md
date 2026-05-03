# VALENH-001: Storylet predicate-DSL parsability validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` and registers it with the validator framework. No skill changes; storylet-pool-authoring's Phase 4 gate 7 already documents the prose-side rule, this ticket adds the machine-layer enforcement.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md` (validator queries indexed SLT nodes)

## Problem

`storylet-pool-authoring/SKILL.md` Phase 4 gate 7 declares: *"Predicate DSL parsability (Rule 1) — Every predicate in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions parses against the Predicate DSL grammar in `templates/predicate-dsl.md` (core forms + documented extensions; the DSL grammar is the authoritative enumeration)."* The gate is HARD-REJECT on parse failure.

But there is **no machine-layer validator** that runs the parse. Phase 4 gate 7 is a prose-side check executed by the skill at authoring time. Three failure modes follow:

1. **Bootstrap-pool drift undetected for the lifetime of the bundle.** During the storylet-pool-authoring session (this conversation), Issue 1 of the audit (HIGH severity) caught that the existing 20-storylet pool used 10 extended predicates (`relationship_state`, `time_of_day`, `time_of_week`, `time_in_story`, `time_since_event`, `world_property`, `obligation_state`, `location_kind`, `location_id`, `location_class`) that the strict DSL doc didn't originally enumerate. The bootstrap-generated pool would have hard-rejected against the documented gate. This drift had been in `worlds/erotica-world/stories/marla-kern-seduction/_source/storylets/` since the bundle's creation; the audit caught it only because it ran on the same skill in the same session. A validator running on every `world-validate` call would catch this drift at index-build time rather than at next-audit time.

2. **Future LLM-side invention.** Even with the now-expanded DSL doc, a future LLM proposer can invent a new pred type (e.g., `pred: phase_of_moon`), have it pass through the skill's prose-side gate (the skill operator may miss it on review), and land in the pool. The runtime page-cycle's Phase 4 selection would either silently fail eligibility for that storylet or fall back to LLM evaluation — both are invisible failures. A validator runs at write time AND at index-rebuild time; either would catch invented preds.

3. **No regression coverage on the DSL doc itself.** When MCPENH-026's expanded `entity_state` properties (`mode | visible | visible_to_protagonist | present_count`) were documented, they became accepted DSL forms. Without a validator, no test confirms that storylet records using those properties parse cleanly — the doc and the operational pool can drift again.

## Assumption Reassessment (2026-05-03)

1. **Validator framework exists and follows a per-rule file convention** — verified by inspecting `tools/validators/src/rules/`: 8 rule files (rule1-no-floating-facts.ts, rule2-no-pure-cosmetics.ts, rule4-no-globalization-by-accident.ts, rule5-no-consequence-evasion.ts, rule6-no-silent-retcons.ts, rule7-mystery-reserve-preservation.ts, rule11-action-space.ts, rule12-redundancy.ts) plus `_shared` helpers and `framework`, `cli`, `public`, `schemas`, `structural` sibling directories. Adding a new rule file is the established pattern.
2. **Predicate DSL grammar is documented as a closed enumeration** — verified by reading `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (post-implementation state from this session): 11 core forms + 10 documented extensions, plus structural rules (`subject` / `entity` / `from` / `to` accept STENT-NNNN or role:<role>; `fact` accepts SF-NNNN or fact_template; `op` is closed to 6 relational operators plus `in`; `not` / `all` / `any` recursive). The grammar is parseable; validator implementation is mechanical.
3. **FOUNDATIONS principle under audit** — Rule 1 (No Floating Facts): "No fact may exist without domain, scope, prerequisites, limits, consequences." Per `docs/FOUNDATIONS.md` §Story Bundles, Rule 1 governs story-bundle record schemas. Predicate DSL parsability is the structural backstop for SLT records: a malformed predicate is a "floating" eligibility constraint that the runtime cannot evaluate deterministically.
4. **Cross-skill shared boundary under audit** — the boundary is `templates/predicate-dsl.md` itself: it lives in `storylet-pool-authoring/templates/` but is cited by `branching-story-page-cycle/SKILL.md` line 1151 as the authoritative DSL surface. The validator parses the same grammar; if the grammar changes, the validator must update in lockstep. The validator's grammar definition should be exported as a closed constant from the storylet-pool-authoring skill OR mirrored byte-for-byte in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` with a structural-identity comment claiming "grammar derived from `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`". The mirroring approach keeps the validator self-contained at the cost of cascade-edit discipline; the export approach centralizes the grammar at the cost of cross-package import chains. Implementation chooses one and documents the choice; the structural-identity claim ensures schema drift is caught.
5. **No CF Record schema extension** — predicate DSL grammar is not a CF Record schema; it's a story-bundle SLT schema sub-component. CF Record schema in FOUNDATIONS unchanged.
6. **No Mystery Reserve firewall weakening** — the validator complements (does not replace) Phase 4 gate 1 (mystery firewall). Gate 1 enforces `forbidden`-status M-resolution rejection; this validator enforces predicate parsability. They are orthogonal Rule 1 / Rule 7 enforcement surfaces.
7. **No HARD-GATE semantics change** — validator is post-write, not pre-write. HARD-GATE applies at write time per the skill workflows; the validator runs at `world-validate` invocation time and at Hook 5 post-apply integration (when that lands per the Machine-Facing Layer roadmap).
8. **Adjacent contradictions** — the storylet-pool-authoring SKILL.md was just updated in this session to document the DSL extensions. Issue 1 of the storylet-pool-authoring audit was implemented as `templates/predicate-dsl.md` expansion (core + documented extensions). The validator's grammar SHOULD match the documented surface byte-for-byte; any divergence is a validator bug.

## Architecture Check

1. **Per-rule validator file is consistent with the existing rules/ convention** — every existing validator rule lives in its own `tools/validators/src/rules/<rule-name>.ts` file; this ticket adds one more. No structural deviation.
2. **Closed-grammar enumeration in `_shared/predicate-dsl-grammar.ts`** — the validator imports the grammar as a typed constant (`PRED_TYPES: readonly string[]`, `ENTITY_PROPERTIES: readonly string[]`, `RELATIONSHIP_AXES: readonly string[]`, `OPERATORS: readonly string[]`, etc.), each enumeration matching `templates/predicate-dsl.md` byte-for-byte. The structural-identity comment at the top of the file flags the source of truth.
3. **No backwards-compatibility shims** — the validator parses against the expanded DSL (core + documented extensions). The bootstrap-pool storylets will pass cleanly after the FOUNDATIONS §Story Bundles anchor and MCPENH-026 implementation, because the storylet-pool-authoring audit-implementation already expanded the doc. No compatibility-mode for the pre-expansion grammar.
4. **Validator output format matches the existing framework** — every rule reports findings as structured objects (`severity`, `rule_id`, `record_id`, `field_path`, `message`); this rule follows the same shape.

## Verification Layers

1. Validator runs against fixture SLT records covering every core form and every documented extension; PASS for all valid forms → schema validation.
2. Validator HARD-REJECTs an SLT with an invented `pred` type (`phase_of_moon`) → schema validation: report includes the offending pred type.
3. Validator HARD-REJECTs an SLT with a `relationship` axis outside the closed enum (`prestige`) → schema validation.
4. Validator HARD-REJECTs an SLT with a free-form prose predicate → schema validation.
5. Validator parses `not` / `all` / `any` recursively; nested invalid pred is detected at the deepest level → schema validation.
6. Validator runs against the live `worlds/erotica-world/stories/marla-kern-seduction/_source/storylets/` pool (35 records post-SLB-0001) and reports zero failures → integration check.
7. Validator's grammar enumeration matches `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` byte-for-byte → manual review + structural-identity comment in `_shared/predicate-dsl-grammar.ts`.
8. FOUNDATIONS Rule 1 alignment: every SLT's eligibility constraint is structurally well-formed → FOUNDATIONS alignment check.

## What to Change

### 1. Create the predicate-DSL grammar constant

`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — exports closed enumerations:

```typescript
// Grammar derived from .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md
// MUST be kept structurally identical; any drift between this file and the source-of-truth
// document is a validator bug. See VALENH-001 §Architecture Check item 2 + §Cross-skill
// shared boundary under audit (Assumption Reassessment item 4).

export const CORE_PRED_TYPES = ['fact_true', 'fact_matches', 'entity_state', 'relationship',
                                 'consequence_pending', 'obligation_open', 'location', 'epistemic',
                                 'not', 'all', 'any'] as const;

export const EXTENSION_PRED_TYPES = ['relationship_state', 'time_of_day', 'time_of_week',
                                      'time_in_story', 'time_since_event', 'world_property',
                                      'obligation_state', 'location_kind', 'location_id',
                                      'location_class'] as const;

export const ALL_PRED_TYPES = [...CORE_PRED_TYPES, ...EXTENSION_PRED_TYPES] as const;

export const ENTITY_PROPERTIES = ['alive', 'conscious', 'present', 'willing', 'armed', 'injured',
                                   'mobile', 'restrained', 'mode', 'visible', 'visible_to_protagonist',
                                   'present_count'] as const;

export const RELATIONSHIP_AXES = ['trust', 'fear', 'desire', 'debt', 'intimacy', 'loyalty',
                                   'resentment', 'power_imbalance'] as const;

export const FACT_MATCHES_PREDICATES = ['alive', 'present', 'has_object', 'knows', 'believes',
                                         'relationship_axis', 'location'] as const;

export const EPISTEMIC_CLASSES = ['objective', 'belief', 'rumor', 'reader_inference',
                                   'apparent', 'disputed'] as const;

export const RELATIONAL_OPERATORS = ['==', '!=', '>', '<', '>=', '<='] as const;
export const SET_OPERATORS = ['in'] as const;
```

### 2. Create the validator rule

`tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` — implements:

- Walk every SLT record (queried via the indexed story-bundle nodes per MCPENH-025).
- For each SLT, parse `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions (currently choice templates carry `uses_fact_role` references; if future schema adds preconditions field, expand here).
- Each predicate must be an object with a `pred` field whose value is in `ALL_PRED_TYPES`.
- Per-pred-type field validation:
  - `fact_true`: `fact` field, value matches `^SF-[0-9]+$`.
  - `fact_matches`: `subject` (STENT-NNNN or role:...), `predicate` ∈ `FACT_MATCHES_PREDICATES`, `object` (any).
  - `entity_state`: `entity` (STENT-NNNN or role:...), `property` ∈ `ENTITY_PROPERTIES`, `op` ∈ `RELATIONAL_OPERATORS`, `value`.
  - `relationship`: `from`, `to`, `axis` ∈ `RELATIONSHIP_AXES`, `op` ∈ `RELATIONAL_OPERATORS`, `value` (number).
  - `consequence_pending`: `kind`, `salience_min` (0..10).
  - `obligation_open`: `matcher` (object with allowed keys per `templates/predicate-dsl.md` §Obligation matcher schema).
  - `location`: `current_location` (STLOC-NNNN or role:...).
  - `epistemic`: `fact` (SF-NNNN), `class` ∈ `EPISTEMIC_CLASSES`, `certainty_min` (0.0..1.0).
  - `not`: `predicate` (recursive).
  - `all` / `any`: `predicates` (array, recursive).
  - `relationship_state`: `between` (pair), `property`, `op` ∈ `RELATIONAL_OPERATORS`, `value`.
  - `time_of_day` / `time_of_week` / `time_in_story`: `op` ∈ `RELATIONAL_OPERATORS` ∪ `SET_OPERATORS`, `value` (string or list when op=in).
  - `time_since_event`: `event_kind`, `op`, `value` (`hours:N | days:N | weeks:N`).
  - `world_property`: `property`, `op`, `value`.
  - `obligation_state`: `obligation_id` (OBL-NNNN), `property` (status | salience | urgency), `op`, `value`.
  - `location_kind`: `location` (STLOC-NNNN or role:...), `op` (== or in), `value`.
  - `location_id`: `op` (==), `value` (entity:<world-entity-slug>).
  - `location_class`: `location`, `op` (==), `value`.
- Free-form prose anywhere fails parse.
- Recursion depth capped at 10 (defensive against pathological nesting).

### 3. Register the rule with the validator framework

`tools/validators/src/framework/` — register `rule_storylet_predicate_dsl_parsability` in the rules registry so `world-validate` runs it as part of the standard rule sweep.

### 4. CLI integration

`tools/validators/src/cli/` — `world-validate worlds/<slug> --story <story-slug>` runs the rule against the named bundle's SLT records. Without `--story`, the rule runs across all bundles in the world. CLI flag `--rules storylet_predicate_dsl_parsability` runs only this rule; `--rules all` (default) runs every registered rule including this one.

### 5. Tests

Per Verification Layers; comprehensive fixtures.

## Files to Touch

- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (new)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (new)
- `tools/validators/src/framework/registry.ts` (modify — register new rule; exact filename per current framework structure, may need verification at implementation time)
- `tools/validators/src/cli/world-validate.ts` (modify — `--story <slug>` flag + rule routing; exact filename per current CLI structure)
- `tools/validators/src/public/` (modify if the rule should be exported in the public API surface)
- `tools/validators/tests/rule_storylet_predicate_dsl_parsability.test.ts` (new — fixture coverage per Verification Layers)

## Out of Scope

- Validators for other story-bundle Rule-1 / Rule-4 / Rule-5 / Rule-7 surfaces (recursive_reference_closure, branch-isolation invariant compliance, consequence-capacity, story-local mystery firewall) — those are separate VALENH tickets to follow.
- Storylet schema completeness validator (Phase 4 gate 9 prose-side equivalent) — separate VALENH ticket.
- Hook 5 post-apply integration for story-bundle writes — out of scope until PEENH-001 lands and Hook 3's namespace covers story-bundle `_source/`.

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter validators test` passes; new tests cover the rule per Verification Layers.
2. `world-validate worlds/erotica-world --story marla-kern-seduction --rules storylet_predicate_dsl_parsability` reports zero failures against the live 35-storylet pool.
3. `world-validate worlds/erotica-world --story marla-kern-seduction` (default rules, including this one) reports zero failures.
4. Fixture with one SLT carrying an invented `pred: phase_of_moon` triggers a HARD-REJECT report.
5. Fixture with one SLT carrying a free-form prose predicate triggers a HARD-REJECT report.

### Invariants

1. The grammar enumeration in `_shared/predicate-dsl-grammar.ts` matches `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` byte-for-byte (manual cross-reference + structural-identity comment).
2. Existing world-canon validator rules (rule1 through rule12) continue to pass identically against the world canon.
3. The rule does not mutate any record; read-only.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rule_storylet_predicate_dsl_parsability.test.ts` — comprehensive coverage: every core form + every documented extension as PASS fixtures; invented pred + invalid axis + invalid property + invalid operator + free-form prose + recursive-depth-violation as REJECT fixtures.
2. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` — assert CLI `--story <slug>` flag runs the rule against the named bundle's SLT records.

### Commands

1. `pnpm --filter validators lint && pnpm --filter validators typecheck && pnpm --filter validators test` (targeted pipeline verification).
2. `cd tools/validators && pnpm build && node dist/cli/world-validate.js worlds/erotica-world --story marla-kern-seduction --rules storylet_predicate_dsl_parsability` (full-pipeline integration check after `archive/tickets/MCPENH-025.md` has landed and the index is rebuilt).
