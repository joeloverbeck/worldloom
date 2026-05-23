# VALENH-034: predicate-DSL schema-discovery surface now encodes the `branch_scoped` × `any_*` runtime restriction

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-storylet.schema.json` extended with an additive cross-field conditional; `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` extended with a parity assertion per restricted predicate.
**Deps**: None

## Problem

At intake, the discoverable JSON Schema `tools/validators/src/schemas/story-storylet.schema.json` (surfaced verbatim to authors via `mcp__worldloom__describe_envelope_schema` and `mcp__worldloom__get_record_schema`) accepted an SLT shaped as `scope.visibility=branch_scoped` plus `preconditions.{hard,soft}[].pred ∈ {any_plan_active, any_emotion_active, any_obligation_open, any_consequence_pending, any_thread_active, any_clock_active, any_secret_unrevealed, any_story_question_open, any_relationship_axis, any_belief, any_intention}`. The enforced runtime grammar — `requireExistentialScope` in `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` — already rejected exactly this combination, emitting `predicate.invalid_scope` with the message `<path> uses <pred> outside global_author_pool or branch_prefix_scoped scope`.

Before this ticket, an author following the discoverable contract — for example, a runtime-JIT branch-scoped storylet emitted by `branching-story-turn-cycle` Phase 2/3 — could emit a schema-conformant envelope that the validator rejected, forcing a validate-cycle iteration. The friction showed up as a HARD-GATE-blocking dry-run failure that cost the author a re-draft before submit. The intake reproduction was a `branching-story-turn-cycle` invocation on `red-bunny / PG-3` that hit the rejection at `SLT-20: preconditions.soft[0] uses any_emotion_active outside global_author_pool or branch_prefix_scoped scope` and had to revise the JIT block before the second-pass validate cleared.

This is the same architectural pattern as the resolved VALENH-024 (`holder_role` field shape) but at a different invariant: VALENH-024 corrected an over-restrictive schema to match the permissive runtime; VALENH-034 corrects an over-permissive schema to match the restrictive runtime. Same surface family (`predicate-DSL discoverability vs runtime`), same fix shape (schema correction + parity test), distinct invariant (scope-vs-predicate cross-field constraint vs `holder_role` field shape).

## Assumption Reassessment (2026-05-23)

1. **Codebase verification at HEAD**: `grep -n "requireExistentialScope" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns 11 invocation sites at lines 296 (`any_plan_active`), 306 (`any_emotion_active`), 317 (`any_obligation_open`), 325 (`any_consequence_pending`), 332 (`any_thread_active`), 338 (`any_clock_active`), 344 (`any_secret_unrevealed`), 350 (`any_story_question_open`), 356 (`any_relationship_axis`), 364 (`any_belief`), and 372 (`any_intention`). The helper at line 484-491 reads `scope.visibility` from the parent SLT record and emits `predicate.invalid_scope` when visibility is neither `global_author_pool` nor `branch_prefix_scoped`. Note: `has_affordance` (case at line 381) does NOT call `requireExistentialScope` despite the contract prose at `.claude/skills/_shared-templates/story-state-contract.md` §5 grouping it with the existential predicates — that asymmetry is a separate concern out of this ticket's scope (see Out of Scope).

   Before implementation, `cat tools/validators/src/schemas/story-storylet.schema.json` confirmed `scope.visibility` enum admitted `branch_scoped`; the file's `scope` `allOf` block carried three branch conditionals (`branch_prefix_scoped` requires `visible_branch_path_prefix`; `global_author_pool` requires null `branch_id` and no path prefix; `branch_scoped` requires non-null `branch_id`) but no top-level `allOf` cross-field conditional restricting the `preconditions.{hard,soft}[].pred` enum when `scope.visibility=branch_scoped`. The landed schema now adds that top-level conditional and a single `$defs.scopeRestrictedExistentialPredicate` enum for the 11 runtime-restricted predicates.

   **Change attribution (no-silent-retcons)**: existing behavior — the schema-discovery artifact admits `branch_scoped + any_*` combinations; new behavior — the schema rejects those combinations at the schema-discovery layer matching the runtime; the warrant is the runtime rejection of the schema-conformant envelope (`branching-story-turn-cycle` session evidence above) plus the architectural precedent in VALENH-024 establishing the parity-test discipline.

2. **Spec/doc verification at HEAD**: `.claude/skills/_shared-templates/story-state-contract.md` §5 documents the runtime restriction in prose (`has_affordance(<action_family>) and the any_* existential predicates are valid only for global_author_pool and branch_prefix_scoped prefiltering when an actor is not yet bound`). The contract prose names the restriction; the schema does not encode it. No FOUNDATIONS amendment needed — this is an implementation-level alignment gap, not a contract-level commitment gap.

3. **Cross-skill shared boundary**: the predicate-DSL grammar at `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` and `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` is shared by every story-pipeline skill that emits SLT records (`branching-story-bootstrap`, `branching-story-turn-cycle`, `commitment-block-authoring`). The schema-discovery contract is read by authors via `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` and `mcp__worldloom__get_record_schema(node_type='storylet_record')`; the runtime is enforced at every `validate_patch_plan` / `submit_patch_plan` invocation. The shared boundary under audit is the parity between the two surfaces.

4. **FOUNDATIONS principle restatement**: §Tooling Recommendation — *"LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, ..."* The machine-facing layer realizes this commitment via `world-validate`, the context-packet API, and the schema-discovery API. When a discoverable schema misrepresents the runtime grammar it enforces, authors operating *through* the machine-facing layer (rather than on prose alone) still hit an undocumented runtime constraint — the very failure mode §Tooling Recommendation forbids. VALENH-034 restores parity so the discoverable schema is a faithful contract.

5. **Existing output schema extension**: `tools/validators/src/schemas/story-storylet.schema.json` is the schema under extension. Its consumers are: (a) the patch-engine pre-apply validator at `tools/patch-engine/src/` (which compiles the schema to enforce envelope shape before runtime predicates run); (b) the MCP `describe_envelope_schema` / `get_record_schema` tools at `tools/world-mcp/src/tools/` (which return the schema verbatim to authors); (c) every story-pipeline skill that emits SLT records. The extension is **additive-only**: a new top-level `allOf` clause that fails inputs already rejected at runtime — it tightens the schema toward the runtime without changing runtime behavior. The package-local parity test proves valid restricted-predicate shapes still pass under `global_author_pool` and `branch_prefix_scoped`, while `branch_scoped` variants fail schema validation.

6. **Baseline and proof-surface correction**: Pre-edit `cd tools/validators && npm test` passed with 901 tests. The original live red-bunny dry-run acceptance was narrowed to portable package-local schema proof because no checked-in red-bunny envelope is required to prove the invariant, and direct world-content reads are not needed for this validators-package change.

## Architecture Check

1. **Schema-side fix, not runtime-side fix.** The runtime is correct and already enforces the constraint with a clear actionable error. The discoverable schema is wrong. Fixing the schema is cheaper (one additive `allOf` clause), more discoverable (authors see the constraint at envelope-construction time via `describe_envelope_schema`, not at `validate_patch_plan` time), and architecturally cleaner (the schema-discovery surface becomes a faithful contract). Widening the runtime to admit `branch_scoped + any_*` would be the wrong direction — the contract prose at `_shared-templates/story-state-contract.md` §5 makes the restriction load-bearing for actor-binding semantics (existential predicates resolve their `alias` to a matched record at block-selection time, which is incoherent for `branch_scoped` blocks because the runtime resolves them only on the bound branch).
2. **No backwards-compatibility aliasing or shim layer.** The schema becomes stricter in a way the runtime always enforced. No backwards-compatible "warn instead of error" path is introduced. No legacy-tolerant schema branch is added.

## Verification Layers

1. **Schema-runtime parity per restricted predicate** → JSON-schema-discovery-vs-runtime parity test extending `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`: assert that for each of the 11 predicates that invoke `requireExistentialScope`, the `story-storylet.schema.json` cross-field conditional rejects the same combination an envelope-shaped Ajv compile would.
2. **Runtime behavior unchanged** → codebase grep-proof: `grep -n "requireExistentialScope" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns the same 11 invocation sites pre- and post-ticket; line counts at lines 296/306/317/325/332/338/344/350/356/364/372 stay the same.
3. **Existing valid SLT shape remains schema-conformant** → package-local schema proof: the parity test compiles `story-storylet.schema.json` with the package's Ajv 2020 setup and asserts the same restricted predicates still pass under `global_author_pool` while failing under `branch_scoped`. The live red-bunny failure remains intake evidence, not a required portable proof input for this ticket.
4. **FOUNDATIONS alignment** → §Tooling Recommendation machine-facing-layer contract: an author invoking `describe_envelope_schema(op_kind='create_slt_record')` then `validate_patch_plan(<schema-conformant envelope>)` MUST NOT encounter a runtime rejection on a discoverable-schema-conformant input.

## Landed Changes

### 1. Extended `tools/validators/src/schemas/story-storylet.schema.json` with a top-level `allOf` cross-field conditional

Added a new `allOf` entry at the schema's top level that fires when `scope.visibility=branch_scoped` and asserts the `preconditions.hard` and `preconditions.soft` arrays each contain no item whose `pred` matches `$defs.scopeRestrictedExistentialPredicate`. Combinator-nested cases (an `any_*` predicate nested under `all` / `any` / `not`) are not detected by this top-level schema clause — the runtime catches those cases at the per-predicate parser case branches, providing defense-in-depth. The top-level clause catches the common authoring case (the case `branching-story-turn-cycle` Phase 2/3 produces) without expanding the schema's recursive-search complexity.

The enum is kept in one `$defs` entry and reused for both the `hard` and `soft` branches (the runtime restriction applies to both arrays). The enum order matches the invocation order in `rule_storylet_predicate_dsl_parsability.ts`.

### 2. Extended `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` with a per-restricted-predicate scope-conditional parity assertion

Added a new test block in the existing parity test file. For each of the 11 predicates that invoke `requireExistentialScope` at runtime, it compiles `story-storylet.schema.json` with Ajv 2020 and asserts: (a) a fixture SLT with `scope.visibility=branch_scoped, branch_id=BR-1` and the restricted predicate in either `preconditions.hard[0]` or `preconditions.soft[0]` fails schema validation; (b) the same SLT with `scope.visibility=global_author_pool, branch_id=null` passes schema validation; (c) the same SLT with `scope.visibility=branch_prefix_scoped, branch_id=BR-1, visible_branch_path_prefix=[PG-1]` passes schema validation; and (d) each predicate still appears in a runtime `case` branch that invokes `requireExistentialScope`.

The existing test's `EXISTENTIAL_ROLE_FILTER_FIELDS` constant remains the analogous parity construct from VALENH-024. The new `EXISTENTIAL_SCOPE_RESTRICTED_PREDICATES` constant enumerates the 11 names and is checked against the schema `$defs` enum.

## Files to Touch

- `archive/tickets/VALENH-034.md` (modify) — close out and archive the ticket with the landed proof surface and deviations.
- `tools/validators/src/schemas/story-storylet.schema.json` (modify) — add the top-level `allOf` cross-field conditional per §1.
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify) — extend with the per-restricted-predicate scope-conditional parity assertion per §2.

## Out of Scope

- **`has_affordance` runtime scope-restriction asymmetry**: the contract prose at `_shared-templates/story-state-contract.md` §5 groups `has_affordance` with the existential predicates as "valid only for `global_author_pool` and `branch_prefix_scoped`", but `rule_storylet_predicate_dsl_parsability.ts:381-383` does not invoke `requireExistentialScope` for `has_affordance`. Resolving the asymmetry — either by widening the runtime to restrict `has_affordance` or by amending the contract prose — is a separate concern requiring a design judgment about whether `has_affordance` truly has the actor-not-yet-bound semantics the runtime restriction encodes. This ticket aligns the schema-discovery surface to the existing runtime; it does not change runtime semantics.
- **Combinator-nested cases**: a restricted `any_*` predicate nested under `all` / `any` / `not` combinator wrappers is not caught by the landed schema clause (the schema would have to descend recursively into combinator predicates, which adds significant schema complexity for a defense-in-depth case the runtime already catches at the per-predicate parser case branches). The top-level clause catches the common authoring case; combinator-nested cases remain runtime-only-detected.
- **Runtime behavior**: this ticket does not change `requireExistentialScope`, the 11 invocation sites, or any other runtime predicate-DSL behavior. The runtime stays as it is.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — the extended `predicate-dsl-grammar-parity.test.ts` passes; per-predicate scope-conditional parity assertions all hold.
2. `cd tools/validators && npm run build` — the schema compiles via `tsc` and the schema-using validators load it without parse errors.
3. Existing valid storylet predicate shapes remain schema-conformant under the package-local Ajv 2020 schema proof; no live-world or checkout-local red-bunny envelope is required for acceptance.

### Invariants

1. For every `requireExistentialScope` invocation site in `rule_storylet_predicate_dsl_parsability.ts`, the corresponding predicate name appears in the `story-storylet.schema.json` `allOf` cross-field conditional's enum.
2. `story-storylet.schema.json` rejects (at schema-compile-vs-instance time) every top-level `scope.visibility=branch_scoped` + `preconditions.{hard,soft}[].pred ∈ {11 restricted predicates}` combination that `rule_storylet_predicate_dsl_parsability.ts` rejects at runtime.
3. Existing accepted SLT predicate shapes remain schema-conformant under the tightened schema because the schema continues to accept the restricted predicates in `global_author_pool` and rejects only the `branch_scoped` combination the runtime already rejected.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify) — extended with the per-restricted-predicate scope-conditional parity assertion per §2 above; one parameterized test loop asserts schema-rejection-vs-runtime-rejection coverage parity for the `branch_scoped` × `restricted-predicate` cell across `preconditions.hard` and `preconditions.soft`.

### Commands

1. `cd tools/validators && npm test` — package-local invocation; runs `npm run build` then `node --test dist/tests/**/*.test.js`. The parity test exercise validates both the schema constraint and the runtime parity assertion in one run.
2. `cd tools/validators && npm run build` — verifies the schema compiles cleanly via the existing `tsc` step; the schema-using validators load the modified schema without parse errors.
3. The repo has no root `package.json` with `workspaces` declared (confirmed by absence of `workspaces` field — same precedent as MCPENH-063), so package-local invocation is the correct shape. `npm test --workspace=tools/validators` and `npm test --prefix tools/validators` do not resolve from the repo root.

## Outcome

Completed. `story-storylet.schema.json` now rejects top-level `branch_scoped` storylets whose `preconditions.hard[]` or `preconditions.soft[]` contain one of the 11 runtime-restricted existential predicates. Runtime parser behavior was not changed. The parity test now verifies the schema `$defs` enum, runtime `requireExistentialScope` case coverage, and Ajv 2020 acceptance/rejection behavior for both hard and soft precondition arrays.

## Verification Result

1. `cd tools/validators && npm test` before edits — PASS, 901 tests passed. This established the broad validators package baseline.
2. `cd tools/validators && npm run build` after schema/test edits — PASS. The first focused test attempt exposed Ajv strict-mode fallout in the new conditional; the schema was corrected with explicit `type: "object"` / `type: "array"` declarations and rebuilt successfully.
3. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js` — PASS, 6 tests passed. The new parity test proves all 11 restricted predicates fail under `branch_scoped` and pass under `global_author_pool` / `branch_prefix_scoped` for both `preconditions.hard` and `preconditions.soft`.
4. `cd tools/validators && npm test` after final edits — PASS, 901 tests passed.

## Deviations

- The drafted live red-bunny `validate_patch_plan` dry-run was not used as an acceptance gate. The red-bunny rejection remains intake evidence; the landed invariant is proven by portable package-local Ajv/schema parity coverage plus the full validators package suite.
- The schema implementation uses a single `$defs.scopeRestrictedExistentialPredicate` enum referenced from both `hard` and `soft`, rather than duplicating the enum inline in each branch. This keeps the hard/soft restriction source in one place while preserving the ticket's intended behavior.
- Post-ticket review created `tickets/VALENH-035.md` for the separate `has_affordance` contract/runtime scope asymmetry that this ticket intentionally left out of scope.
