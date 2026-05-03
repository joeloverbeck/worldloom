# VALENH-001: Storylet predicate-DSL structural parsability validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds a read-only `storylet_predicate_dsl_parsability` validator rule and registers it with the validator framework. Also clarifies `storylet-pool-authoring/templates/predicate-dsl.md` so future implementers preserve the boundary between closed runtime predicate forms and open story/world-local vocabularies.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md` (validator queries indexed SLT nodes)

## Problem

`storylet-pool-authoring/SKILL.md` Phase 4 gate 7 declares predicate-DSL parsability as a hard rejection surface for `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions. The purpose is sound: storylet eligibility must be deterministic, replayable, and auditable, not silently delegated to LLM judgment at runtime.

At intake there was no machine-layer validator that ran the parse. Phase 4 gate 7 was prose-side review executed by a skill operator. Three failure modes followed:

1. **Bootstrap-pool drift can survive until a later audit.** During storylet-pool-authoring work, existing pool predicates had already grown beyond the older strict DSL text. The correct repair was not to reject those storylets automatically; it was to align the documented runtime-supported DSL with the live operational pool. A validator would have surfaced that contract drift earlier.
2. **Future LLM-side invention can land as unparseable eligibility logic.** A future proposer can invent a new predicate form such as `pred: phase_of_moon`. If the runtime does not implement that predicate form, selection either fails invisibly or falls back to non-deterministic interpretation.
3. **The DSL document and validator can drift.** When the DSL gains a real new predicate form, operator-facing documentation, runtime support, and validator support must move together.

The validator must therefore enforce **structural parsability**, not freeze all possible story vocabularies. Unknown `pred` forms and invalid predicate bodies are hard failures. Story/world-local labels that the DSL deliberately leaves open, such as narrative-time tags, world-state scalar names, event kinds, location classes, and role matchers, are validated as typed strings or against available bundle records/state-schema surfaces, not against a hardcoded universal enum.

## Assumption Reassessment (2026-05-03)

1. **Validator framework exists and follows a per-rule file convention** — verified by inspecting `tools/validators/src/rules/`: existing rule files live under the per-rule convention, with shared helpers under `_shared` and framework/CLI/public siblings. Adding a storylet predicate rule follows that pattern.
2. **Story-bundle indexing dependency is landed** — `archive/tickets/MCPENH-025.md` completed story-bundle indexing into `world.db`, with story-scoped node ids and `story_slug` columns. This ticket can query indexed SLT nodes instead of walking files ad hoc.
3. **Cross-skill shared boundary under audit** — the boundary is the Predicate DSL used by `storylet-pool-authoring` for authoring and by `branching-story-page-cycle` for runtime storylet selection. The validator must enforce the same runtime-evaluable predicate shapes that those skills describe.
4. **FOUNDATIONS principle under audit** — `docs/FOUNDATIONS.md` §Story Bundles says Rule 1 governs story-bundle schemas and names predicate-DSL preconditions as part of SLT record structure. Rule 1 requires prerequisites and limits to be expressed in a structured place; it does not require every story-domain label to be globally enumerated for every possible future story.
5. **Closed/open mismatch corrected before implementation** — the earlier draft treated the entire DSL as a closed enumeration. Live `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` is more nuanced: `pred` forms and operators are finite, while values like `<story-specific narrative-time tag>`, `<other world-state-snapshot scalar>`, `<event-class string>`, and `<other location-class label>` are intentionally story/world-local vocabularies. This ticket now owns the validator as a structural parser, not as a universal creative-vocabulary freezer.
6. **No CF Record schema extension** — predicate DSL grammar is a story-bundle SLT sub-component, not a Canon Fact Record schema. FOUNDATIONS §Canon Fact Record Schema remains unchanged.
7. **No Mystery Reserve firewall weakening** — this validator complements, but does not replace, storylet mystery-firewall gates. It rejects malformed eligibility predicates. It does not adjudicate whether a storylet resolves a Mystery Reserve entry; that remains Rule 7 validator/skill surface.
8. **HARD-GATE semantics unchanged** — the validator is read-only and post-write/post-index proof in the current Shape A posture. It becomes a pre/post-apply participant only when PEENH-001 lands story-bundle patch-engine routing. It must remain fail-closed when wired into any future hard-gate path.
9. **CLI and package command shape corrected before implementation** — `tools/validators/package.json` exposes package-local `npm run build` and `npm test`; there is no root `pnpm --filter validators` workspace lane in this checkout. The current CLI accepts numeric `--rules=1,2,...` only and has no `--story` option, so this ticket owns name-based rule selection for `storylet_predicate_dsl_parsability`, `--rules=all`, and story-scope routing in `tools/validators/src/cli/_helpers.ts` / `world-validate.ts`.
10. **Registry path corrected before implementation** — the live validator registry is `tools/validators/src/public/registry.ts`, not `tools/validators/src/framework/registry.ts`. The active file set is corrected to the live registry surface.

## Architecture Check

1. **Closed predicate forms, open typed value domains** — deterministic runtime selection requires a finite set of implemented predicate forms (`pred` values) and operator semantics. It does not require San Sebastian romance, space opera, court intrigue, mythic epic, and detective stories to share one universal enum for location classes, event kinds, ambient registers, or narrative-time tags.
2. **Schema-aware validation over hardcoded story vocabularies** — where the current bundle or state schema can prove a value, the validator uses that source: `STENT-NNNN`, `STLOC-NNNN`, `SF-NNNN`, `OBL-NNNN`, role matchers, state-snapshot field names, or bundle-defined tags/classes. Where no structured registry exists yet, the validator enforces the documented mini-format and leaves semantic completeness to a follow-up schema/registry ticket.
3. **Single shared grammar helper** — the validator-local shared helper contains the closed structural parts (`PRED_TYPES`, operator sets, fixed predicate-field names, fixed small enums such as epistemic class and obligation status). It does not mirror open story vocabularies as hardcoded exhaustive arrays. A source-comment points to `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, and tests cover doc-aligned examples.
4. **No backwards-compatibility shims** — malformed predicates still fail. The correction is not a compatibility mode; it is a more accurate contract for which parts of the DSL are finite and which parts are story/domain extensibility points.

## Verification Layers

1. Unknown `pred` values are rejected with record id and field path -> schema validation.
2. Every documented predicate form parses when its required fields and operator/value shapes are valid -> schema validation.
3. Open story/domain values are accepted when they match the documented typed shape or live bundle/state-schema source -> schema validation plus fixture coverage.
4. Closed small enums remain closed where the DSL truly says they are closed (`epistemic.class`, relational operators, fixed `obligation_state.property`, fixed `obligation_state.status` values) -> rejection-path tests.
5. Free-form prose predicates are rejected -> schema validation.
6. Recursive `not` / `all` / `any` parse recursively with a defensive depth cap -> schema validation.
7. The live `worlds/erotica-world/stories/marla-kern-seduction/_source/storylets/` pool reports zero predicate-parse failures unless a real malformed predicate exists -> live-corpus integration check.
8. FOUNDATIONS Rule 1 alignment: every SLT eligibility constraint is structurally placed and runtime-evaluable without freezing all possible story vocabularies -> FOUNDATIONS alignment check.

## Landed Changes

### 1. Clarified the Predicate DSL document

`.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` now explicitly distinguishes:

- **Closed structural grammar**: supported `pred` forms, recursive combinators, required fields, operator sets, and fixed small enums.
- **Open typed vocabularies**: story/world-local labels such as event kinds, narrative-time tags, world-state scalar names, location kinds/classes, role matchers, and relationship-state properties not otherwise fixed by runtime data.

The parent `.claude/skills/storylet-pool-authoring/SKILL.md` summary now matches the same closed/open DSL boundary.

### 2. Created the predicate-DSL shared helper

`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` exports the closed structural constants only:

- supported `pred` types
- relational operators and set operators
- fixed `fact_matches.predicate` values
- fixed `entity_state.property` values that correspond to runtime `entity_status`
- fixed relationship axes where the runtime treats those as canonical axes
- fixed epistemic classes
- fixed obligation-state properties and statuses
- required-field metadata per predicate form

It does not export hardcoded exhaustive arrays for story-local `time_in_story` tags, `event_kind` values, `world_property` names, `location_kind` values, or `location_class` values.

### 3. Created the validator rule

`tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` implements:

- Walk every indexed SLT record for the selected world/story scope.
- Parse `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions when present.
- Require each predicate to be an object with a known `pred` field.
- Reject free-form prose anywhere a predicate object/list is expected.
- Validate required fields, field types, operators, identifier formats, and numeric ranges per predicate form.
- Validate record-id references against the indexed story-bundle nodes where feasible (`SF`, `STENT`, `STLOC`, `OBL`, etc.).
- Accept `role:<role>` matchers by documented syntax; do not require a universal role enum unless the bundle schema exposes one.
- Accept open story/domain labels by documented mini-format or live schema/registry lookup.
- Recursively parse `not`, `all`, and `any`, with a depth cap of 10.

### 4. Registered the rule with the validator framework

Registered `storylet_predicate_dsl_parsability` in `tools/validators/src/public/registry.ts`, and updated registry/capstone tests for the ninth active rule validator.

### 5. Added CLI integration

`world-validate <world-slug> --story <story-slug>` now scopes story-bundle validators to the named bundle. Without `--story`, the rule runs across all indexed story bundles in the world. `--rules storylet_predicate_dsl_parsability` runs only this rule; `--rules all` includes all rule validators.

### 6. Added tests and user-facing docs

Added fixture coverage for every documented predicate form, representative open story/domain labels, free-form prose rejection, unknown `pred` rejection, invalid fixed enum, invalid reference, malformed open value, recursive-depth rejection, CLI story scoping, selector validation, registry inventory, and the SPEC-04 capstone validator count. Updated `tools/validators/README.md` and `docs/WORKFLOWS.md` for the new command surface.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify — clarify closed structural grammar vs open typed vocabularies)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — parent skill summary matches the closed/open DSL boundary)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (new)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register the rule)
- `tools/validators/src/framework/types.ts` (modify — carry optional story scope through the validator context/read surface)
- `tools/validators/src/cli/_helpers.ts` (modify — name-based `--rules`, `--rules=all`, `--story`, and story-filtered read surface)
- `tools/validators/src/cli/world-validate.ts` (modify — parse/pass `--story`)
- `tools/validators/README.md` (modify — validator inventory and CLI examples)
- `docs/WORKFLOWS.md` (modify — validator quick-reference command surface)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (new)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (new)
- `tools/validators/tests/cli/rule-filter-pattern.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — prove the rule is skipped in pre-apply until story-bundle patch-engine routing exists)
- `tools/validators/tests/rules/registry.test.ts` (modify)

## Out of Scope

- Validators for other story-bundle Rule-1 / Rule-4 / Rule-5 / Rule-7 surfaces: recursive reference closure, branch-isolation invariant compliance, consequence capacity, story-local mystery firewall.
- A complete storylet schema validator for all SLT fields.
- Inventing a global ontology of all possible story genres, moods, event kinds, locations, social registers, or narrative-time tags.
- Hook 5 post-apply integration for story-bundle writes before PEENH-001 lands.
- Canon-mutating cleanup of any live world/story content.

## Acceptance Criteria

### Tests That Must Pass

1. Targeted validator tests pass and include valid fixtures for every documented predicate form.
2. A fixture with `pred: phase_of_moon` fails with a structured finding naming the offending field path.
3. A fixture with a free-form prose predicate fails with a structured finding.
4. Fixtures with open but well-formed story/domain values, such as a story-specific `time_in_story` tag, an event-kind string, a world-property key, and a location-class label, pass when the predicate structure is otherwise valid.
5. Fixtures with malformed open values fail by typed-shape rules, not because they are absent from a universal enum.
6. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story marla-kern-seduction --rules storylet_predicate_dsl_parsability` reports zero failures against the live pool.
7. Default `node tools/validators/dist/src/cli/world-validate.js erotica-world --story marla-kern-seduction --json` includes the rule in `validators_run`.
8. `validatePatchPlan` skips `storylet_predicate_dsl_parsability` while story-bundle writes remain Shape A and PEENH-001 is active.

### Invariants

1. Unknown predicate forms are fail-closed.
2. Runtime-implemented predicate forms remain deterministic and LLM-free at eligibility-check time.
3. Story/world-local vocabularies are not frozen into a universal enum unless a specific live registry/schema establishes that vocabulary.
4. The validator is read-only.
5. Existing world-canon validators continue to run identically against world canon.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — comprehensive parser coverage: valid documented forms, unknown `pred`, invalid fixed enum, invalid id reference, malformed open value, prose predicate, and recursive-depth violation.
2. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` — assert CLI story filtering and `--rules storylet_predicate_dsl_parsability` route only the requested rule/scope.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — assert pre-apply validation skips this story-bundle rule until Shape B patch-engine routing exists.

### Commands

1. `npm test` from `tools/validators` (package-local build plus validator test suite).
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story marla-kern-seduction --rules storylet_predicate_dsl_parsability` from the repo root (live-pool integration check against the existing indexed story bundle).

## Outcome

Completion date: 2026-05-03.

Completed. The validator package now has a read-only `storylet_predicate_dsl_parsability` rule backed by a validator-local closed-grammar helper, story-scoped indexed-record reference checks, recursive predicate parsing, open typed-value validation, and CLI routing for `--story`, name-based `--rules`, and `--rules=all`. The Predicate DSL template and parent skill summary now state the closed/open boundary explicitly. A post-review refinement keeps the rule out of `validatePatchPlan` pre-apply runs while story-bundle writes remain Shape A, with a regression witness for the skip.

## Verification Result

Passed:

1. `npm test` from `tools/validators` — package build plus 92 tests passed, including `validatePatchPlan skips storylet predicate parsing until story-bundle ops exist` and `storylet predicate DSL does not participate in pre-apply before Shape B routing`.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story marla-kern-seduction --rules storylet_predicate_dsl_parsability` — 1 validator ran; 0 fail, 0 warn, 0 info.
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story marla-kern-seduction --json` — default story-scoped run included `storylet_predicate_dsl_parsability` in `validators_run` and returned 0 fail, 0 warn, 0 info.
4. `git diff --check` — passed.
5. Manual review of `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, `.claude/skills/storylet-pool-authoring/SKILL.md`, `tools/validators/README.md`, `docs/WORKFLOWS.md`, `docs/FOUNDATIONS.md`, and `docs/HARD-GATE-DISCIPLINE.md` confirmed the same-seam command, DSL wording, and Shape A pre-apply boundary are aligned.

## Deviations

The drafted root `pnpm --filter validators` proof lane was replaced with the live package-local `npm test` lane. The live registry path is `tools/validators/src/public/registry.ts`, not `tools/validators/src/framework/registry.ts`. The implementation also updated `tools/validators/src/framework/types.ts`, `tools/validators/src/cli/_helpers.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, `tools/validators/README.md`, `docs/WORKFLOWS.md`, and the parent storylet-pool skill summary because the CLI story-scope surface, registry count, user-facing docs, parent skill wording, and pre-apply boundary are same-seam consumers of the new validator rule.

## Post-Review Refinement (2026-05-03)

The post-ticket review found that registering the rule in `ruleValidators` made it eligible for `validatePatchPlan` pre-apply runs. The implementation now excludes `pre-apply` in `storylet_predicate_dsl_parsability.applies_to` while PEENH-001 is active and story-bundle writes remain Shape A. `tools/validators/tests/integration/validate-patch-plan.test.ts` proves the validator is skipped with `detail: "applies_to=false"` in the pre-apply path.
