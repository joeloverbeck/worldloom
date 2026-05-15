# SPEC30STOCONHAR-003: Belief Predicate Split — `belief_record` (Atomic) + `any_belief` (Existential)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — contract §5, `predicate-dsl-grammar.ts`, `rule_storylet_predicate_dsl_parsability.ts` + test, three story skills + references, prose-attach predicate-DSL terms list
**Deps**: None

## Problem

`_shared-templates/story-state-contract.md:640` defines `belief(holder, claim, mode?, confidence_floor?)` where `claim` is a free string; line 662 references `belief(holder, BEL-<integer>)` as the actor-specific branch-execution form. Two execution semantics share one predicate name. The DSL grammar (`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:6`) and the parser both treat `belief` as a single predicate. Free-claim text matching is a Rule 1 (No Floating Facts → no free-form predicate prose) hazard: any consumer that tries to evaluate `belief(holder, "the king is dead")` must either do unsafe string matching or invent ad-hoc resolution. Removing the free-claim form and splitting into `belief_record` (BEL-id, hard branch-execution eligibility, social-state firewall) + `any_belief` (existential prefiltering, alias-binding — already in the grammar at `:650`) is cleaner than reconciling.

## Assumption Reassessment (2026-05-15)

1. Verified the contradictory contract pair: `_shared-templates/story-state-contract.md:640` carries `belief(holder, claim, mode?, confidence_floor?)` (free-claim row in §5 table); `:662` carries the explicit `belief(holder, BEL-<integer>)` BEL-id form for branch-execution. `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` is already a separate row in the §5 table at `:650`.
2. Verified DSL state: `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:6` lists `"belief"` in `PRED_TYPES`; `:88` defines `belief: { required: ["holder", "claim"] }` in `PREDICATE_ARG_SCHEMAS`. The parser at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` consumes those constants.
3. Cross-skill / cross-artifact boundary under audit: the predicate-DSL semantics span (a) the shared contract §5 table prose, (b) the grammar constants `PRED_TYPES` + `PREDICATE_ARG_SCHEMAS`, (c) the parsability rule validator, (d) the skill prose that instructs authors on which predicate form to use. Updating any single surface without the others produces drift.
4. FOUNDATIONS principle under audit: Rule 1 (No Floating Facts) at the predicate-DSL surface — every predicate must have a structured, machine-decidable resolution path; free-string `claim` arguments cannot be resolved without unsafe text matching. Rule 6 (No Silent Retcons): renaming `belief` to `belief_record` and reshaping the required args is a retcon of the predicate grammar — this ticket cites it explicitly under the rename/removal blast-radius section; no silent rewrite.
5. Rename/removal blast radius for the literal token `belief(` (excluding `any_belief(`): grepped pipeline-wide via `grep -rnE "\bbelief\(" .claude/skills/ .claude/skills/_shared-templates/ tools/validators/src/ tools/validators/tests/ | grep -v any_belief`. Hits: `_shared-templates/story-state-contract.md:640` + `:662`, `commitment-block-authoring/SKILL.md:206`, `branching-story-prose-attach/SKILL.md:182` (in a literal predicate-DSL terms list), plus the grammar + parser src and the tests directory. Today's grep finds no hits in bootstrap or turn-cycle SKILL.md; the cross-file sweep at acceptance must still cover the entire repo to catch any prose drift.
6. Existing test file `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` is the test surface (location corrected from spec's `src/` path per §Codebase truth).
7. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies a fail-severity rule validator (`storyletPredicateDslParsability` in the registry). It does NOT weaken the MR firewall — predicate-DSL parsing is upstream of MR enforcement; tighter parsing strengthens overall canon safety.
8. Schema extension classification: this is NOT a CF / Change Log / proposal-card / dossier / artifact schema extension — it is a grammar change. The grammar's consumers are the parser (named in scope) and skill authors (named in scope); both are updated in this ticket. No external grammar consumer exists.

## Architecture Check

1. Splitting `belief` into `belief_record` + `any_belief` aligns the predicate name with the resolution path: `belief_record` resolves by BEL-id closure, `any_belief` binds an alias existentially. One predicate per resolution semantic eliminates the Rule 1 hazard and makes the parser's job decidable. The alternative — keeping `belief` and overloading it on second-arg type — would force the parser to dispatch by argument shape, with no clean error message when authors mix forms.
2. No backwards-compatibility shim: the literal `belief(` form is replaced everywhere; the parser emits `unknown_predicate` for any residue. Hard cutover is lawful because no production story bundle exists (verified — `find worlds/ -path '*/_source/storylets/*.yaml'` returns empty). Pre-production is the lowest-cost migration moment.

## Verification Layers

1. Grammar parity → codebase grep-proof: `grep -nE "\"belief\b" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns hits only on `"belief_record"` (and the `any_belief` rows kept verbatim).
2. Parser-emitted error → validator unit test: SLT YAML with literal `belief(STENT-1, "free string")` emits `unknown_predicate` via `rule_storylet_predicate_dsl_parsability`.
3. Parser-accepted form → validator unit test: SLT YAML with `belief_record(STENT-1, BEL-3, mode: confident)` parses cleanly.
4. Cross-skill prose discipline → codebase grep-proof: `grep -rnE "\bbelief\(" .claude/skills/ .claude/skills/_shared-templates/ | grep -v any_belief | grep -v belief_record` returns ZERO matches after the edits.
5. FOUNDATIONS alignment check: Rule 1 prose at `docs/FOUNDATIONS.md` is unchanged; this ticket operationalizes the existing rule without modifying it.

## What to Change

### 1. Contract §5 table

In `.claude/skills/_shared-templates/story-state-contract.md`, replace the `:640` row from:

```
| `belief(holder, claim, mode?, confidence_floor?)` | Belief must be held with the optional `belief_mode` and at least the named confidence. | turn-cycle eligibility, social-state firewall |
```

with:

```
| `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` | Actor-specific BEL grounding must be held with the optional `belief_mode` and at least the named confidence. | turn-cycle eligibility, social-state firewall (actor-specific BEL grounding) |
```

In the `:662` paragraph immediately after the table, update the sentence to cite `belief_record(holder, BEL-<integer>)` (instead of `belief(holder, BEL-<integer>)`) for branch-execution and reference `any_belief(...)` (already at `:650`) for existential prefiltering. Append an explicit sentence: *"Free-claim string matching is not a lawful predicate; the only belief-family predicates are `belief_record` (exact BEL-id) and `any_belief` (existential alias-binding)."*

### 2. DSL grammar constants

In `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`:
- Replace `"belief"` in `PRED_TYPES` (line 6) with `"belief_record"`.
- Replace `belief: { required: ["holder", "claim"] }` in `PREDICATE_ARG_SCHEMAS` (line 88) with `belief_record: { required: ["holder", "belief_id"] }`. The second argument is documented in the contract as the BEL id; argument validation lives in the parser (see step 3).

### 3. DSL parser

In `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, rename every `belief`-handling arm to `belief_record`. Any literal `belief(` form remaining in SLT YAML must emit `unknown_predicate`. Add a per-arg validation check that the second argument matches `^BEL-\d+$`; if not, emit a parsability error with code `belief_record_argument_invalid` (severity per the validator's existing convention).

### 4. Skill prose — commitment-block-authoring

In `.claude/skills/commitment-block-authoring/SKILL.md:206`, replace the sentence `Use refined `belief(holder, claim, mode?, confidence_floor?)`, where `mode` is a `BEL.belief_mode` value.` with: *"Use `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` for hard execution eligibility (actor-specific BEL grounding) and `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` for author-pool / branch-prefix prefiltering. Free-claim string matching is not lawful."*

Audit the surrounding paragraph and `commitment-block-authoring/references/` for any other implicit references to free-claim belief; update consistently.

### 5. Skill prose — branching-story-prose-attach

In `.claude/skills/branching-story-prose-attach/SKILL.md:182`, the literal predicate-DSL terms list currently includes `belief(`. Replace it with `belief_record(`. Confirm `any_belief(` is in the list (it is currently absent based on the spec line's listed terms); add it alphabetized.

### 6. Cross-file legacy-string sweep — bootstrap + turn-cycle

Run `grep -rnE "\bbelief\(" .claude/skills/ | grep -v any_belief` and update every non-`any_belief` `belief(` token to `belief_record(` in any file the sweep returns. Spec narrative item 5 names bootstrap and turn-cycle explicitly; today's grep finds no hits there, but acceptance re-grep at merge time must still confirm zero residue.

### 7. Cross-file legacy-string sweep — repo-wide

After all primary edits, run `grep -rnE "\bbelief\(" . --include="*.md" --include="*.ts" --include="*.json" | grep -v any_belief | grep -v belief_record | grep -v node_modules | grep -v dist`. ZERO matches required for acceptance.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5 table row + adjacent prose)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — `PRED_TYPES` + `PREDICATE_ARG_SCHEMAS`)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — handler arms + arg validation)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — new test cases for `belief_record` accept and `belief(` reject)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — line ~206 sentence + any other refs)
- `.claude/skills/commitment-block-authoring/references/` (modify — only files that restate the belief-predicate semantics; sweep + update)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — line ~182 predicate-DSL terms list)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — only if cross-file sweep surfaces hits)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — only if cross-file sweep surfaces hits)

## Out of Scope

- Any change to `any_belief` predicate semantics or argument schema (already correct; only the table label and surrounding prose may be touched to harmonize with the renamed sibling).
- Any change to the `BEL` record schema or its `claim`, `belief_mode`, `confidence`, `truth_relation`, `visibility` fields.
- Backwards-compatibility shim accepting both `belief(` and `belief_record(` forms (deliberately rejected — no production bundles exist; hard cutover is lawful).
- Any change to `record-schema-compliance` for BEL records.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds.
2. `npm --prefix tools/validators run test` — all validator tests pass including the new `belief_record` accept and `belief(` reject cases under `rule_storylet_predicate_dsl_parsability`.
3. `grep -rnE "\bbelief\(" . --include="*.md" --include="*.ts" --include="*.json" | grep -v any_belief | grep -v belief_record | grep -v node_modules | grep -v dist` returns ZERO matches.
4. `grep -n "belief_record" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns hits on both `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS`.

### Invariants

1. The predicate-DSL grammar contains no predicate named `belief`. `belief_record` (exact BEL-id) and `any_belief` (existential) are the only belief-family predicates.
2. Free-claim string matching is not a lawful predicate evaluation path anywhere in the pipeline.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — new test cases: (a) `belief_record(STENT-1, BEL-3, mode: confident)` parses cleanly; (b) `belief_record(STENT-1, "free string")` emits `belief_record_argument_invalid`; (c) `belief(STENT-1, BEL-3)` emits `unknown_predicate` (old form rejected); (d) `any_belief(b, mode: knows)` parses cleanly (regression).

### Commands

1. `npm --prefix tools/validators run build && npm --prefix tools/validators run test`
2. `grep -rnE "\bbelief\(" . --include="*.md" --include="*.ts" --include="*.json" | grep -v any_belief | grep -v belief_record | grep -v node_modules | grep -v dist`
3. The full validator `test` command is the correct boundary because the grammar change cascades through the parsability validator's whole test surface.
