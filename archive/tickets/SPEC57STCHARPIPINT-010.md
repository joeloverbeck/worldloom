# SPEC57STCHARPIPINT-010: Integration tests — STCHAR pipeline (machine surfaces)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds integration coverage under `tools/validators/tests/` and corrects the `tools/validators` predicate DSL runtime/discoverable schema so `record_active(STCHAR-*)` matches the live shared story-state contract.
**Deps**: archive/tickets/SPEC57STCHARPIPINT-006.md (the prose-receipt schema extension is the principal new machine surface this ticket exercises).

## Problem

SPEC-57's skill-side deliverables are LLM-executed and not unit-testable, but its machine surfaces are: the prose-receipt `stchar_authority` / `profile_fidelity` blocks, the `no_char_authority_in_story_runtime` leak path on page-plan/receipt fixtures, and `record_active(STCHAR-*)` predicate parsability. This ticket adds automated coverage for those surfaces (SPEC-57 Phase 9, automated portion); the skill-behavior assertions (bootstrap aborts, turn-cycle blocks, health-audit 2m) are verified by the §Definition of Done manual fixture walkthrough, not here.

## Assumption Reassessment (2026-05-21)

1. SPEC-57 §Phase 9 (as reassessed) scopes automated tests to the machine surfaces the spec adds: `prose-receipt.schema.json` accepts the new blocks; `no_char_authority_in_story_runtime` exercises its leak path on page-plan/prose-receipt fixtures citing `CHAR-*`; the predicate-DSL parsability validator confirms `record_active(STCHAR-*)` parses. Existing test infrastructure exists: `tools/validators/tests/integration/` (sibling `spec<NN>-integration.test.ts` files), `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` (owned by -006), and predicate DSL runtime/schema parity tests.
2. The skill-behavior assertions named in the original Phase 8/§Verification (bootstrap aborts on STCHAR failure; turn-cycle blocks a complex new STENT; health-audit 2m reports stale/superseded/missing STCHAR) have no automated harness — skills are LLM-executed; they are routed to the DoD's manual `bootstrap → turn-cycle → prose-attach → health-audit` walkthrough.
3. Cross-skill boundary under audit: this ticket asserts the verification surfaces composed by the implementation tickets — primarily -006's prose-receipt schema + the SPEC-56-landed `no_char_authority_in_story_runtime` validator and predicate-DSL parsability. It does not duplicate -006's unit test (`prose-receipt-schema-compliance.test.ts`); it adds integration-level coverage under `tools/validators/tests/integration/`.
4. Live reassessment found the drafted "tests only" boundary was too narrow: `.claude/skills/_shared-templates/story-state-contract.md` §5 already says `record_active(<record_id>)` accepts `STCHAR`, and `tools/validators/src/_helpers/state-snapshot-replay.ts` / `tools/validators/src/schemas/story-page.schema.json` already include `STCHAR` in active records, but `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` and `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` omitted it. This ticket absorbs that same-seam validator/schema correction so the integration test proves the live contract instead of preserving a false negative.
5. FOUNDATIONS §4a (plan-as-authority verified through the receipt) and §6.1 (firewall verified through the leak path): the integration tests prove these hold through in-memory validator framework fixtures and explicit file inputs, so no real `worlds/<slug>/` canon is mutated.

## Architecture Check

1. Scoping the test ticket to machine-checkable surfaces (and routing skill behaviors to the manual walkthrough) avoids asserting LLM-executed behavior in a unit harness that cannot exercise it — keeping the test suite honest about what it actually proves.
2. No backwards-compatibility shim: the new integration test extends the existing `spec<NN>-integration.test.ts` pattern, and the validator/schema change adds only the already-contractual `STCHAR` active-record class.

## Verification Layers

1. prose-receipt `stchar_authority` block validates through the validator framework over an explicit fixture receipt → integration test (`spec57-...test.ts`).
2. Page plan / receipt citing `CHAR-*` fails the leak path → integration assertion over a fixture exercising `no_char_authority_in_story_runtime`.
3. `record_active(STCHAR-*)` parses → integration assertion over a fixture SLT exercising `rule_storylet_predicate_dsl_parsability`.
4. Fixtures never mutate real canon → explicit in-memory records and file inputs; expected validator names / failure codes are enumerated from the test fixture setup.

## Landed Changes

### 1. Added integration test

Created `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` asserting: (a) a valid `stchar_authority` receipt passes the validator framework; (b) a missing/hash-inconsistent STCHAR packet fails schema validation; (c) a page-plan fixture citing `CHAR-*` as operational authority fails `no_char_authority_in_story_runtime`; (d) a fixture SLT with `record_active(STCHAR-*)` parses under the predicate-DSL parsability validator.

### 2. Corrected predicate DSL STCHAR active-record support

Updated the runtime predicate parser and discoverable predicate schema to include `STCHAR` in `record_active` / `record_age` active-record references, and updated parity/unit tests to cover the new class.

## Files to Touch

- `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` (new)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify)
- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)

## Out of Scope

- Skill-behavior assertions (bootstrap abort, turn-cycle block, health-audit 2m) — verified by the DoD manual walkthrough.
- The prose-receipt schema-compliance unit test (`prose-receipt-schema-compliance.test.ts`) — owned by archive/tickets/SPEC57STCHARPIPINT-006.md.
- `tools/world-mcp` fixture expansion — not needed; the integration test uses validators package fixtures.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test` from `tools/validators` passes including `spec57-stchar-pipeline-integration.test.ts`.
2. The integration test asserts a missing/hash-inconsistent `stchar_authority` receipt fails and a `CHAR-*`-citing page plan fails the leak path.
3. The test mutates no file under the real `worlds/<slug>/` tree (explicit in-memory fixtures and file inputs).

### Invariants

1. Expected counts are re-enumerated from the fixture at test start, not hardcoded.
2. The integration test does not duplicate -006's unit test; the only production change is the same-seam STCHAR predicate vocabulary correction required by the shared story-state contract.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` — new integration test for the three machine surfaces (rationale: prove the prose-receipt schema extension, leak path, and predicate parsability compose through the validator framework over explicit in-memory fixtures and file inputs).
2. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` — extended schema/runtime vocabulary parity to include `STCHAR`.
3. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — extended runtime predicate parser coverage to include `record_active(STCHAR-*)`.

### Commands

1. `npm run build` (from `tools/validators`)
2. `node --test dist/tests/integration/spec57-stchar-pipeline-integration.test.js dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js`
3. `npm test` (from `tools/validators`)

## Outcome

Completed: 2026-05-21.

Added the SPEC-57 validators integration test for the composed STCHAR machine surfaces, corrected the predicate DSL runtime/schema vocabulary so `record_active(STCHAR-*)` is accepted as the shared story-state contract already requires, and updated focused predicate parity/runtime tests.

## Verification Result

- Baseline before edits: `npm test` from `tools/validators` — PASS, 774 tests.
- `npm run build` from `tools/validators` — PASS.
- `node --test dist/tests/integration/spec57-stchar-pipeline-integration.test.js dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` from `tools/validators` — PASS, 19 tests.
- Final broad proof: `npm test` from `tools/validators` — PASS, 776 tests.

## Deviations

- The drafted "tests only / no production code" boundary was corrected during reassessment because the live predicate DSL omitted `STCHAR` even though the shared story-state contract and active-record schema already included it. The production delta is limited to adding `STCHAR` to that existing active-record vocabulary and its discoverable schema; no new predicate or backwards-compatibility alias was introduced.
- The drafted temp-root/world-validate fixture plan was replaced with explicit in-memory validator framework fixtures and file inputs. That proves the same schema, leak-validator, and predicate-parser surfaces without touching any real `worlds/<slug>/` tree.
- `tools/world-mcp` was not modified because no active-STCHAR context-packet projection fixture was needed for this validators-boundary ticket.
