# SPEC09CANSAFEXP-008: SPEC-09 verification capstone — exercise §Verification mechanizable scenarios end-to-end

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small-to-Medium
**Engine Changes**: Yes — `tools/validators/tests/integration/spec09-verification.test.ts` (new) — exercises SPEC-09 §Verification scenarios 1-7, 9, 10-surrogate, 11-surrogate via fixture-driven assertions and patch-plan envelope validation; no production code changes; no skill invocation. Same-seam spec/status truthing in `specs/SPEC-09-canon-safety-expansion.md` and `specs/IMPLEMENTATION-ORDER.md`.
**Deps**: `archive/tickets/SPEC09CANSAFEXP-004.md`

## Problem

SPEC-09 §Verification enumerates 12 numbered scenarios spanning structural, functional, regression, and measurement layers. Individual implementation tickets (-001 through -007) cover their own scope's acceptance criteria, but the spec's §Verification block is the only place where every cross-ticket integration claim is collected — and that collection deserves an executable mapping back to the spec.

This capstone provides spec→test traceability for the **mechanizable** scenarios — those exercisable purely through the validator framework, schema validation, and `validatePatchPlan` pre-apply enforcement — without invoking any Claude skill from `.claude/skills/`. Skill invocation in tests is intentionally avoided as a token-cost discipline; verification of skill-prose-only logic (e.g., continuity-audit's silent-area-canonization check, the canon-addition / create-base-world flow surfaces themselves) is deferred to manual review at spec-amendment time and to organic exercise on real adjudication runs. Per /spec-to-tickets §Spec-Integration Ticket Shape, this ticket introduces no new production code — it composes the pipeline assembled by the prior tickets.

## Assumption Reassessment (2026-04-27)

1. SPEC-09 §Verification has 12 numbered scenarios. Scenarios 1-3 are structural (FOUNDATIONS edits parse, schema parses, animalia regression for validators 11/12). Scenarios 4-7 are functional dry-runs of canon-addition where the spec-text framing is "dry-run canon-addition" but the testable surface is `record_schema_compliance` / `rule11-action-space` / `rule12-redundancy` against fixture CFs (no skill invocation needed). Scenario 8 is continuity-audit silent-area-canonization — skill-prose-only logic with no validator surface. Scenarios 9-10 are regression / end-to-end. Scenario 11 is create-base-world genesis. Scenario 12 is measurement (no token-budget regression target).
2. Animalia currently has 48 CFs at `worlds/animalia/_source/canon/` (confirmed via spot-check). The capstone test must re-enumerate the count at runtime (not hardcode 48) per /spec-to-tickets §Spec-Integration Ticket Shape — `Re-enumerated expected counts (not hardcoded), computed from the fixture at test start. Hardcoded counts become stale as canon grows`.
3. **Skill invocation excluded**: this capstone exercises only validator-mechanized surfaces. §V8 (continuity-audit silent-area canonization), §V10's skill-flow dimension, and §V11's skill-flow dimension all require running Claude skills, which is rejected on token-cost grounds. §V10 and §V11 are partially salvaged via patch-plan envelope surrogates: a hand-crafted `PatchPlanEnvelope` matching what canon-addition / create-base-world *would* produce is passed to `validatePatchPlan` to confirm pre-apply validation accepts the SPEC-09-shaped envelope. The surrogates exercise the integration of schema + Rule 11 + Rule 12 + structural validators at the patch-plan layer; they do NOT exercise skill-execution flow. §V8 has no validator surface and is dropped honestly rather than fabricated via a skill-prose grep test.
4. **FOUNDATIONS principle motivating this ticket**: per FOUNDATIONS §Tooling Recommendation (`LLM agents should never operate on prose alone`), the spec's mechanizable verification scenarios deserve executable proof, not only documentation-side enumeration. The non-mechanizable scenarios (§V8, §V10/§V11 skill-flow dimensions) remain prose-enforced in skill files.
5. **Fixture-world copy strategy** (per /spec-to-tickets §Spec-Integration Ticket Shape): `fs.cpSync` to a temp root so the test never mutates the real `worlds/animalia/`. Same pattern as `tools/validators/tests/integration/spec04-verification.test.ts` (which clones to `worldloom-spec04-*` under `os.tmpdir()`).
6. **No measurable target for §Verification 12** (token-budget regression). Capstone test does NOT include a wall-clock or token-budget assertion (per /spec-to-tickets §Spec-Integration Ticket Shape: SPEC-09 §Verification 12 is aspirational, no specific threshold named).
7. **Dependency selection**: this ticket lists archived -004 as the single transitive-head Dep. Per /spec-to-tickets §Spec-Integration Ticket Shape: prefer transitive-head convention. -004 (canon-addition Phase 14a Tests 11/12) transitively covers -001 (FOUNDATIONS + schema) / -002 (rule validators) / -003 (CLI rule filter). -005 (continuity-audit silent-area check) is no longer required because §V8 is dropped. -007 (create-base-world genesis emit) is no longer required because §V11 is surrogated via hand-crafted patch-plan envelope rather than skill execution. -006 (diegetic-artifact-generation cleanup) was never relevant because SPEC-09 §Verification names no scenario for it.
8. **Existing fixture reuse**: `tools/validators/tests/fixtures/cf-*.yaml` already contains fixtures suitable for §V4 (`cf-missing-required-block.yaml`), §V6 (`cf-with-na-blocks.yaml`), and §V7 (`cf-with-bare-na.yaml`). The capstone reuses these rather than creating duplicates under `tests/integration/fixtures/spec09/`. The §V5 shortfall shape already exists inline in `tests/rules/rule11-action-space.test.ts`, so the capstone inlines the same minimal record shape and adds no new fixture file.
9. **Rule 12 correction**: live `rule12_redundancy` applies to hard-canon core truths with canon-safety blocks regardless of `n_a` form. Therefore §V6 truthfully proves schema + Rule 11 pass for a geography `n_a` CF; Rule 12 success is proved in the §V10/§V11 patch-plan surrogates by adding section records with two trace registers. The earlier "Rules 11/12 pass trivially" wording was stale and is corrected here and in `specs/SPEC-09-canon-safety-expansion.md`.

## Architecture Check

1. A single integration-test file exercising every mechanizable §Verification sub-case as a test sub-case keeps the capstone surface coherent and the spec→test mapping legible. Sub-case naming preserves the §V-N number even where the sub-case is a surrogate (`§V10 (surrogate)`) or absent (§V8 documented as dropped in this ticket and the spec, with no skipped/todo placeholder in the test file).
2. Fixture-world copy via `fs.cpSync` preserves the real animalia tree. The test never mutates `worlds/animalia/`; mutations happen in a temp copy that is cleaned up post-test. Matches `tests/integration/spec04-verification.test.ts` exactly.
3. Re-enumerated counts (CF count) prevent staleness as animalia grows. Hardcoding `expect(count).toBe(48)` would break the test the moment animalia adds a 49th CF; computing the count from the fixture at test start stays valid.
4. No backwards-compatibility shims introduced — capstone is net-new test infrastructure under `tools/validators/tests/integration/`. No skill harness, no `skill-dry-run.ts` helper, no fixtures representing entire synthetic worlds.
5. Patch-plan envelope surrogates for §V10/§V11 reuse the existing `validatePatchPlan` public API used by `tests/integration/spec04-verification.test.ts` for its Rule 4 sub-case. Same import surface (`validatePatchPlan` from `../../src/public/index.js`), same `PatchPlanEnvelope` type from `@worldloom/patch-engine`. The technique is proven; this ticket extends it to two new envelope shapes.

## Verification Layers

1. §Verification 1 (FOUNDATIONS edits land + valid markdown + YAML extracts parse) — file-content assertion + ajv-compile of the YAML example block extracted from `docs/FOUNDATIONS.md` §Canon Fact Record Schema.
2. §Verification 2 (canon-fact-record.schema.json parses both populated and `n_a` variants) — schema validation: load schema, compile via ajv, validate fixture artifacts (`cf-with-populated-epistemic-profile.yaml`, `cf-with-populated-exception-governance.yaml`, `cf-with-na-blocks.yaml`).
3. §Verification 3 (validators ship + exit 0 on animalia 48 CFs) — `world-validate <fixture-animalia> --rules=11,12 --json` exits 0; CF count is re-enumerated at test start (`countAnimaliaCFs(tempWorldRoot)`).
4. §Verification 4 (capability CF without `exception_governance` fails `record_schema_compliance`) — assertion against existing `tests/fixtures/cf-missing-required-block.yaml`.
5. §Verification 5 (`rule-11-action-space` FAILS when leverage missing or non-permissible) — assertion against fixture with populated `exception_governance` but fewer than 3 permissible-form leverage entries. Reuse the rule11 test's existing fixture if available; otherwise add `tests/integration/fixtures/spec09/cf-capability-leverage-shortfall.yaml`.
6. §Verification 6 (geography CF with `n_a` blocks PASSES schema + Rule 11) — assertion against existing `tests/fixtures/cf-with-na-blocks.yaml`; Rule 12 is not trivial for hard-canon core truths and is covered by the trace-bearing §V10/§V11 envelopes.
7. §Verification 7 (bare `n_a` fails regex) — assertion against existing `tests/fixtures/cf-with-bare-na.yaml`. Confirms `record_schema_compliance` rejects rationales lacking a fact-type keyword from FOUNDATIONS §Ontology Categories.
8. §Verification 8 — **DROPPED**. Continuity-audit silent-area-canonization is skill-prose logic with no validator surface; cannot be mechanized without invoking the skill. Documented as out-of-scope in this ticket (and remains in the spec as a prose-enforced verification scenario).
9. §Verification 9 (animalia regression: zero new failures, grandfather holds structurally) — `world-validate <fixture-animalia> --json` (full rule set) exits 0. Confirms grandfather clause holds: historical CFs are not retroactively evaluated against Rules 11/12 or the new schema blocks.
10. §Verification 10 — **SURROGATED**. Hand-crafted `PatchPlanEnvelope` representing a hypothetical next-in-sequence animalia capability CF (with populated `epistemic_profile` + populated `exception_governance` + ≥3 permissible-form leverage entries + ≥2 distinct trace registers) is passed to `validatePatchPlan`. Result must report `ok: true` with no new violations. Confirms validator-layer integration on a SPEC-09-shaped envelope; does NOT confirm `canon-addition` skill flow produces such an envelope (that dimension is skill-prose-enforced and verified by manual review).
11. §Verification 11 — **SURROGATED**. Hand-crafted `PatchPlanEnvelope` representing a synthetic-new-world genesis bundle (one capability CF with both blocks populated + one geography CF with both blocks set to `n_a` plus fact-type rationale + section records containing trace registers for both CFs) is passed to `validatePatchPlan`. Result must contain zero verdicts. Exercises both populated and `n_a` code paths in a single envelope. Does NOT confirm `create-base-world` skill produces such a bundle.

## What to Change

### 1. `tools/validators/tests/integration/spec09-verification.test.ts` (new)

Create the integration test file with 10 `node:test` sub-cases. The landed test:

- resolves the validators package root from either `cd tools/validators` or repo-root direct invocation;
- copies `tests/fixtures/animalia` to a temp `worlds/animalia`, builds its `_index/world.db`, and runs `world-validate` against the temp root;
- compiles `canon-fact-record.schema.json` with the package's Ajv 2020 setup and shared extension schema;
- directly calls `record_schema_compliance`, `rule11_action_space`, and `validatePatchPlan` for focused synthetic proof;
- creates the synthetic `seeded` world index only inside the temp root for the §V11 surrogate.

Each sub-case asserts the spec's exact verification claim using either schema-validation calls, CLI invocations against the temp fixture, or `validatePatchPlan` calls on hand-crafted envelopes. §V8 is intentionally absent — no `test.skip` or `test.todo` placeholder; the spec→test mapping is documented in this ticket's §Out of Scope and Verification Layers entries.

### 2. Fixtures

**Reuse** (no new files needed):

- `tools/validators/tests/fixtures/cf-missing-required-block.yaml` — §V4
- `tools/validators/tests/fixtures/cf-with-na-blocks.yaml` — §V6
- `tools/validators/tests/fixtures/cf-with-bare-na.yaml` — §V7
- `tools/validators/tests/fixtures/cf-with-populated-epistemic-profile.yaml` — §V2 populated-variant assertion
- `tools/validators/tests/fixtures/cf-with-populated-exception-governance.yaml` — §V2 populated-variant assertion

**New**: no new fixture files. §V5 and the §V10/§V11 envelope surrogates are inlined as TS literals in the test file.

## Files to Touch

- `tools/validators/tests/integration/spec09-verification.test.ts` (new)
- `archive/tickets/SPEC09CANSAFEXP-008.md` (modify) — closeout, archival record, and reassessment truthing
- `specs/SPEC-09-canon-safety-expansion.md` (modify) — same-seam verification wording for mechanized capstone vs skill-flow proof
- `specs/IMPLEMENTATION-ORDER.md` (modify) — Phase 2.5 completion-gate wording and capstone ticket status

## Out of Scope

- Production code changes — capstone introduces no new validators, no new skill prose, no new schema fields. All production work is delivered by SPEC09CANSAFEXP-001 through -007.
- **Skill invocation in tests** — explicit token-cost discipline. The capstone exercises only validator-mechanized surfaces. The ticket adds no skill harness, no `skill-dry-run.ts` helper, no MCP-call surrogates. §V8 (continuity-audit silent-area canonization), §V10's skill-flow dimension ("the canon-addition skill produces a SPEC-09-shaped envelope"), and §V11's skill-flow dimension ("the create-base-world skill produces a SPEC-09-shaped genesis bundle") are skill-prose-enforced and verified by manual review at spec-amendment time and by organic exercise on real adjudication / world-creation runs.
- §Verification 8 (continuity-audit silent-area canonization) — DROPPED from the capstone. No validator surface; would require invoking continuity-audit. Acceptance is via skill-prose review of `continuity-audit/SKILL.md` and adjudication-record review on the next real audit run that exercises the check. SPEC-09 keeps §V8 as a prose/organic verification scenario and names it outside the mechanized capstone.
- §Verification 12 (token-budget regression measurement) — informational, not a CI gate. Spec names no specific threshold; capstone does not assert a wall-clock or token-budget bound.
- Skill-dry-run integration harness — explicitly NOT added. The original ticket's `tools/validators/tests/_helpers/skill-dry-run.ts` is no longer in scope.
- Synthetic-world fixture trees (`synthetic-world-silent-area-canonization/`, `synthetic-new-world-create-base/`) — original ticket's full-world synthetic fixtures are no longer needed. §V11's surrogate uses an inline patch-plan envelope, not a full `_source/` tree.
- Performance tuning of validators or skills — out of scope for SPEC-09 entirely.
- Diegetic-artifact-generation template-cleanup verification — SPEC-09 §Verification names no scenario for SPEC09CANSAFEXP-006; that ticket's acceptance criteria cover its own scope.
- Modifying the real `worlds/animalia/` tree — capstone uses `fs.cpSync` to a temp root and never mutates animalia.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes including the new integration test file.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds.
3. `node tools/validators/dist/tests/integration/spec09-verification.test.js` — integration test exits 0 with all 10 mechanizable §Verification sub-cases passing (§V1, V2, V3, V4, V5, V6, V7, V9, V10-surrogate, V11-surrogate).
4. CF count assertion in §V3 sub-case is computed from the fixture at runtime (re-enumerated), not hardcoded — codebase grep-proof: `grep -n "cfCount\|countAnimaliaCFs" tools/validators/tests/integration/spec09-verification.test.ts` returns the runtime-counting helper, NOT a literal `48` constant in an assertion context.
5. Animalia regression (§V9) passes: `world-validate <temp-animalia-copy> --json` exits 0 across the full rule set — confirms grandfather clause holds for historical CFs.
6. The temp fixture cleanup runs in `after` / `afterEach` hooks; no temp directories leak after test completion (verified by `find /tmp -maxdepth 1 -name 'spec09-*' -mmin -5` returning empty after a test run).
7. Test sub-case names contain the §V-N scenario number (`§V1`, `§V2`, ..., `§V10 (surrogate)`, `§V11 (surrogate)`) so a reader can reconstruct spec-to-test coverage from test output alone. §V8 is intentionally absent (no skipped/todo placeholder); the spec→test mapping is documented in this ticket and the spec.
8. **No skill invocation**: codebase grep-proof — `grep -n "\.claude/skills" tools/validators/tests/integration/spec09-verification.test.ts` returns empty; `grep -n "skill-dry-run\|invokeSkill\|runSkill" tools/validators/tests/integration/spec09-verification.test.ts` returns empty.

### Invariants

1. The real `worlds/animalia/` tree is never mutated by this test. Every assertion runs against a `cpSync`'d temp copy that is cleaned up post-test.
2. Re-enumerated counts (CF count) are computed at test start, not hardcoded. Animalia growing to 49 or 60 CFs does not break the test.
3. Test sub-case names map 1:1 to SPEC-09 §Verification mechanizable scenarios — the scenario number is part of the test name. §V8, §V12 are explicitly absent from the test file (no skipped/todo placeholders); a reader checking spec→test coverage will see 10 sub-cases for the 10 mechanizable scenarios and find §V8 / §V12 documented as out-of-scope here.
4. No production code is touched — SPEC09CANSAFEXP-008's diff is integration-test-only.
5. No Claude skill from `.claude/skills/` is invoked at any point during the test run. The verification surface is validator framework + schema + `validatePatchPlan` only.
6. Patch-plan envelope surrogates for §V10/§V11 verify the validator-layer integration (schema + Rule 11 + Rule 12 + structural validators on a SPEC-09-shaped envelope), not skill-flow behavior. The surrogate distinction is preserved in test naming (`(surrogate)` suffix) and in this ticket's §Verification Layers entries.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec09-verification.test.ts` (new) — 10 test sub-cases covering mechanizable §Verification scenarios (§V1, V2, V3, V4, V5, V6, V7, V9, V10-surrogate, V11-surrogate).
2. `None` — no new fixture file; §V5 uses an inline record matching the existing Rule 11 shortfall shape.

### Commands

1. `cd tools/validators && npm test` — package-local test suite including the integration test.
2. `cd tools/validators && npm run build` — TypeScript compile.
3. `node tools/validators/dist/tests/integration/spec09-verification.test.js` — direct invocation of the integration test for focused dev-loop iteration.
4. `find /tmp -maxdepth 1 -name 'spec09-*' -mmin -5` after a test run — should return empty (temp-fixture cleanup verification).
5. `grep -n '\.claude/skills' tools/validators/tests/integration/spec09-verification.test.ts` — should return empty (no-skill-invocation discipline).

## Outcome

Completion date: 2026-04-27.

Implemented the SPEC-09 mechanized capstone:

- Added `tools/validators/tests/integration/spec09-verification.test.ts` with 10 sub-cases for §V1, V2, V3, V4, V5, V6, V7, V9, V10-surrogate, and V11-surrogate.
- Reused existing CF fixtures and inline helper records; no new fixture directory was needed.
- Built temp animalia indexes and ran `world-validate` only against temp world copies.
- Truthed SPEC-09 and implementation-order wording so the active spec distinguishes validator-mechanized proof from skill-flow/manual verification.

## Verification Result

- `cd tools/validators && npm run build` — passed.
- `node tools/validators/dist/tests/integration/spec09-verification.test.js` — passed; 10/10 sub-cases passed.
- `cd tools/validators && npm test` — passed; full validator suite passed.
- `grep -n "cfCount\|countAnimaliaCFs" tools/validators/tests/integration/spec09-verification.test.ts` — passed; runtime count helper is present and the assertion compares the temp copy to the source fixture count rather than hardcoding `48`.
- `grep -n '\.claude/skills' tools/validators/tests/integration/spec09-verification.test.ts` — passed with no matches.
- `grep -nE 'skill-dry-run|invokeSkill|runSkill' tools/validators/tests/integration/spec09-verification.test.ts` — passed with no matches.
- `find /tmp -maxdepth 1 -name 'spec09-*' -mmin -5` — passed with no leaked temp directories after the test run.
- `git diff --check` — passed.

## Deviations

- No `tools/validators/tests/integration/fixtures/spec09/cf-capability-leverage-shortfall.yaml` file was added because the needed §V5 shape was already represented by the live Rule 11 test seam and could be inlined cleanly.
- §V6 was narrowed from "schema + Rules 11/12 pass trivially" to "schema + Rule 11 pass"; live Rule 12 still applies to hard-canon core truths with canon-safety blocks and requires trace registers. The §V10/§V11 surrogates include trace-bearing section records to prove Rule 12 success.
