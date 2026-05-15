# SPEC30STOCONHAR-003: Belief Predicate Split — `belief_record` (Atomic) + `any_belief` (Existential)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — contract §5, `predicate-dsl-grammar.ts`, `rule_storylet_predicate_dsl_parsability.ts` + test, story-skill prose, prose-attach predicate-DSL terms list, SPEC-30 status note
**Deps**: None

## Problem

At intake, `_shared-templates/story-state-contract.md` defined `belief(holder, claim, mode?, confidence_floor?)` where `claim` was a free string, while adjacent branch-execution prose referenced `belief(holder, BEL-<integer>)` as an actor-specific form. The DSL grammar and parser also treated `belief` as a single predicate. Free-claim text matching was a Rule 1 (No Floating Facts -> no free-form predicate prose) hazard: any consumer that tried to evaluate a prose claim would have needed unsafe string matching or ad-hoc resolution. This ticket replaces that ambiguous form with `belief_record` (BEL-id, hard branch-execution eligibility, social-state firewall) plus the already-separate `any_belief` (existential prefiltering, alias-binding).

## Assumption Reassessment (2026-05-15)

1. Verified the contradictory contract pair: `_shared-templates/story-state-contract.md:640` carries `belief(holder, claim, mode?, confidence_floor?)` (free-claim row in §5 table); `:662` carries the explicit `belief(holder, BEL-<integer>)` BEL-id form for branch-execution. `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` is already a separate row in the §5 table at `:650`.
2. Verified DSL state: `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:6` lists `"belief"` in `PRED_TYPES`; `:88` defines `belief: { required: ["holder", "claim"] }` in `PREDICATE_ARG_SCHEMAS`. The parser at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` consumes those constants.
3. Cross-skill / cross-artifact boundary under audit: the predicate-DSL semantics span (a) the shared contract §5 table prose, (b) the grammar constants `PRED_TYPES` + `PREDICATE_ARG_SCHEMAS`, (c) the parsability rule validator, (d) the skill prose that instructs authors on which predicate form to use. Updating any single surface without the others produces drift.
4. FOUNDATIONS principle under audit: Rule 1 (No Floating Facts) at the predicate-DSL surface — every predicate must have a structured, machine-decidable resolution path; free-string `claim` arguments cannot be resolved without unsafe text matching. Rule 6 (No Silent Retcons): renaming `belief` to `belief_record` and reshaping the required args is a retcon of the predicate grammar — this ticket cites it explicitly under the rename/removal blast-radius section; no silent rewrite.
5. Rename/removal blast radius for the literal token `belief(` (excluding `any_belief(`): grepped pipeline-wide via `grep -rnE "\bbelief\(" .claude/skills/ .claude/skills/_shared-templates/ tools/validators/src/ tools/validators/tests/ | grep -v any_belief`. Intake hits were `_shared-templates/story-state-contract.md`, `commitment-block-authoring/SKILL.md`, `branching-story-prose-attach/SKILL.md`, and validator source/tests. Bootstrap and turn-cycle had no current `belief(` hits.
6. Existing test file `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` is the test surface (location corrected from spec's `src/` path per §Codebase truth).
7. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies a fail-severity rule validator (`storyletPredicateDslParsability` in the registry). It does NOT weaken the MR firewall — predicate-DSL parsing is upstream of MR enforcement; tighter parsing strengthens overall canon safety.
8. Schema extension classification: this is NOT a CF / Change Log / proposal-card / dossier / artifact schema extension — it is a grammar change. The grammar's consumers are the parser (named in scope) and skill authors (named in scope); both are updated in this ticket. No external grammar consumer exists.
9. Proof-boundary correction: root-launched `npm --prefix tools/validators run test` built successfully but exited 1 because `dist/tests/cli/world-validate.story-bundle.test.js` and `dist/tests/cli/world-validate.test.js` resolved CLI paths from the repo root. Both compiled files passed when run directly from `tools/validators`, and the correct package-root broad lane `npm run test` from `tools/validators` passed after implementation. This ticket records the root-launched command as a wrong-cwd diagnostic, not as an active acceptance gate.
10. The drafted `commitment-block-authoring/references/` path is absent in the live checkout. No same-seam reference file exists there; the owned authoring prose surface is the parent `.claude/skills/commitment-block-authoring/SKILL.md`.

## Architecture Check

1. Splitting `belief` into `belief_record` + `any_belief` aligns the predicate name with the resolution path: `belief_record` resolves by BEL-id closure, `any_belief` binds an alias existentially. One predicate per resolution semantic eliminates the Rule 1 hazard and makes the parser's job decidable. The alternative — keeping `belief` and overloading it on second-arg type — would force the parser to dispatch by argument shape, with no clean error message when authors mix forms.
2. No backwards-compatibility shim: the literal `belief(` form is replaced everywhere; the parser emits `unknown_predicate` for any residue. Hard cutover is lawful because no production story bundle exists (verified — `find worlds/ -path '*/_source/storylets/*.yaml'` returns empty). Pre-production is the lowest-cost migration moment.

## Verification Layers

1. Grammar parity → codebase grep-proof: `grep -nE "\"belief\b" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns hits only on `"belief_record"` (and the `any_belief` rows kept verbatim).
2. Parser-emitted error → validator unit test: SLT YAML with literal `belief(STENT-1, "free string")` emits `unknown_predicate` via `rule_storylet_predicate_dsl_parsability`.
3. Parser-accepted form → validator unit test: SLT YAML with `belief_record(STENT-1, BEL-3, mode: confident)` parses cleanly.
4. Cross-skill prose discipline → codebase grep-proof: `grep -rnE "\bbelief\(" .claude/skills/ .claude/skills/_shared-templates/ | grep -v any_belief | grep -v belief_record` returns ZERO matches after the edits.
5. FOUNDATIONS alignment check: Rule 1 prose at `docs/FOUNDATIONS.md` is unchanged; this ticket operationalizes the existing rule without modifying it.
6. Package proof boundary → `npm --prefix tools/validators run build`, `node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` from `tools/validators`, and the package-root broad lane `npm run test` from `tools/validators`.

## Landed Changes

### 1. Contract §5 table

In `.claude/skills/_shared-templates/story-state-contract.md`, the §5 row now uses:

```
| `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` | Actor-specific BEL grounding must be held with the optional `belief_mode` and at least the named confidence. | turn-cycle eligibility, social-state firewall (actor-specific BEL grounding) |
```

The paragraph immediately after the table now cites `belief_record(holder, BEL-<integer>)` for branch execution, keeps `any_belief(...)` for existential prefiltering, and explicitly forbids free-claim string matching.

### 2. DSL grammar constants

In `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `PRED_TYPES` now contains `"belief_record"` and `PREDICATE_ARG_SCHEMAS` now requires `belief_record: { required: ["holder", "belief_id"] }`.

### 3. DSL parser

In `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, the predicate handler is now `belief_record`. Legacy `belief` remains outside `PRED_TYPES` and emits `predicate.unknown_pred`; `belief_record.belief_id` must be a `BEL-<integer>` id or the parser emits `belief_record_argument_invalid`.

### 4. Skill prose — commitment-block-authoring

`.claude/skills/commitment-block-authoring/SKILL.md` now lists `belief_record` in the closed predicate forms and states that `belief_record(...)` is for hard execution eligibility while `any_belief(...)` is for author-pool / branch-prefix prefiltering. The drafted `commitment-block-authoring/references/` path does not exist in this checkout.

### 5. Skill prose — branching-story-prose-attach

`.claude/skills/branching-story-prose-attach/SKILL.md` now flags `belief_record(` and `any_belief(` in the literal predicate-DSL engine-vocabulary list instead of legacy `belief(`.

### 6. Cross-file legacy-string sweep — bootstrap + turn-cycle

The active skill sweep is clean: no current `.claude/skills` `belief(` hits remain after excluding `any_belief` and `belief_record`.

### 7. Cross-file legacy-string sweep — repo-wide

The current-contract sweep over `.claude/skills`, `tools/validators/src`, and `tools/validators/tests` is clean. The broader repo discovery sweep still finds historical archive/report/spec/ticket mentions; those are classified in `## Deviations` and not treated as current operational guidance.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5 table row + adjacent prose)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — `PRED_TYPES` + `PREDICATE_ARG_SCHEMAS`)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — handler arms + arg validation)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — new test cases for `belief_record` accept and `belief(` reject)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — line ~206 sentence + any other refs)
- `.claude/skills/commitment-block-authoring/references/` (not present in live checkout; no edit)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — line ~182 predicate-DSL terms list)
- `specs/SPEC-30-story-contract-hardening-ii.md` (modify — D3 implementation note only; remaining deliverable prose remains historical spec context)

## Out of Scope

- Any change to `any_belief` predicate semantics or argument schema (already correct; only the table label and surrounding prose may be touched to harmonize with the renamed sibling).
- Any change to the `BEL` record schema or its `claim`, `belief_mode`, `confidence`, `truth_relation`, `visibility` fields.
- Backwards-compatibility shim accepting both `belief(` and `belief_record(` forms (deliberately rejected — no production bundles exist; hard cutover is lawful).
- Any change to `record-schema-compliance` for BEL records.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds.
2. From `tools/validators`, `node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` passes including the new `belief_record` accept and `belief(` reject cases.
3. `grep -rnE "\bbelief\(" .claude/skills tools/validators/src tools/validators/tests --include="*.md" --include="*.ts" --include="*.json" | grep -v any_belief | grep -v belief_record` returns ZERO current-contract matches.
4. `grep -n "belief_record" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns hits on both `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS`.
5. From `tools/validators`, `npm run test` passes as the broad validator package lane.

### Invariants

1. The predicate-DSL grammar contains no predicate named `belief`. `belief_record` (exact BEL-id) and `any_belief` (existential) are the only belief-family predicates.
2. Free-claim string matching is not a lawful predicate evaluation path anywhere in the pipeline.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — new test cases: (a) `belief_record(STENT-1, BEL-3, mode: confident)` parses cleanly; (b) `belief_record(STENT-1, "free string")` emits `belief_record_argument_invalid`; (c) `belief(STENT-1, BEL-3)` emits `unknown_predicate` (old form rejected); (d) `any_belief(b, mode: knows)` parses cleanly (regression).

### Commands

1. `npm --prefix tools/validators run build`
2. `grep -rnE "\bbelief\(" .claude/skills tools/validators/src tools/validators/tests --include="*.md" --include="*.ts" --include="*.json" | grep -v any_belief | grep -v belief_record`
3. From `tools/validators`: `node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js`
4. From `tools/validators`: `npm run test`

## Outcome

Implemented the D3 belief predicate split across the shared story-state contract, validator grammar/parser, predicate DSL tests, and active story-skill prose. `belief_record` is now the exact BEL-id execution predicate; `any_belief` remains the existential alias-binding predicate; legacy `belief` is rejected as unknown.

Added the SPEC-30 D3 implementation note so the explicit reference spec reflects the landed state while preserving the remaining deliverable prose as historical context.

## Verification Result

1. `npm --prefix tools/validators run build` — PASS.
2. From `tools/validators`, `node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` — PASS, 10/10 subtests.
3. `grep -rnE "\bbelief\(" .claude/skills tools/validators/src tools/validators/tests --include="*.md" --include="*.ts" --include="*.json" | grep -v any_belief | grep -v belief_record` — PASS by expected no-match exit 1; no current contract `belief(` residues remain.
4. `grep -n "belief_record" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — PASS; hits at `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS`.
5. `find worlds/ -path '*/_source/storylets/*.yaml' -print` — PASS by expected no-output result; no production storylet records need migration in this checkout.
6. From `tools/validators`, `npm run test` — PASS, 217/217 tests. This is the correct broad validator package lane because the compiled CLI tests derive paths from the package working directory.
7. `git diff --check` — PASS.

## Deviations

1. The drafted root-launched `npm --prefix tools/validators run test` command was corrected because the package's compiled CLI tests derive paths from `process.cwd()`. The accepted broad proof is package-root `npm run test` from `tools/validators`.
2. The drafted repo-wide zero-hit `belief(` grep was narrowed to current operational contract surfaces. A broad repo discovery grep still finds historical mentions in `archive/`, `reports/`, `specs/SPEC-30-story-contract-hardening-ii.md`, and this completed ticket's intake evidence. Those are historical/provenance surfaces, not current authoring or validator guidance.
3. The drafted `.claude/skills/commitment-block-authoring/references/` surface does not exist in the live checkout; no reference file was edited.
