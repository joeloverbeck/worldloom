# SPEC57STCHARPIPINT-010: Integration tests — STCHAR pipeline (machine surfaces)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes (tests only) — adds integration coverage under `tools/validators/tests/` (and `tools/world-mcp/tests/` where applicable); no production code.
**Deps**: archive/tickets/SPEC57STCHARPIPINT-006.md (the prose-receipt schema extension is the principal new machine surface this ticket exercises).

## Problem

SPEC-57's skill-side deliverables are LLM-executed and not unit-testable, but its machine surfaces are: the prose-receipt `stchar_authority` / `profile_fidelity` blocks, the `no_char_authority_in_story_runtime` leak path on page-plan/receipt fixtures, and `record_active(STCHAR-*)` predicate parsability. This ticket adds automated coverage for those surfaces (SPEC-57 Phase 9, automated portion); the skill-behavior assertions (bootstrap aborts, turn-cycle blocks, health-audit 2m) are verified by the §Definition of Done manual fixture walkthrough, not here.

## Assumption Reassessment (2026-05-21)

1. SPEC-57 §Phase 9 (as reassessed) scopes automated tests to the machine surfaces the spec adds: `prose-receipt.schema.json` accepts the new blocks; `no_char_authority_in_story_runtime` exercises its leak path on page-plan/prose-receipt fixtures citing `CHAR-*`; the predicate-DSL parsability validator confirms `record_active(STCHAR-*)` parses. Existing test infrastructure exists: `tools/world-mcp/tests/tools/story-bundle-fixture.ts`, `tools/validators/tests/integration/` (sibling `spec<NN>-integration.test.ts` files), and `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` (owned by -006).
2. The skill-behavior assertions named in the original Phase 8/§Verification (bootstrap aborts on STCHAR failure; turn-cycle blocks a complex new STENT; health-audit 2m reports stale/superseded/missing STCHAR) have no automated harness — skills are LLM-executed; they are routed to the DoD's manual `bootstrap → turn-cycle → prose-attach → health-audit` walkthrough.
3. Cross-skill boundary under audit: this ticket asserts the verification surfaces composed by the implementation tickets — primarily -006's prose-receipt schema + the SPEC-56-landed `no_char_authority_in_story_runtime` validator and predicate-DSL parsability. It does not duplicate -006's unit test (`prose-receipt-schema-compliance.test.ts`); it adds integration-level coverage under `tools/validators/tests/integration/`.
4. FOUNDATIONS §4a (plan-as-authority verified through the receipt) and §6.1 (firewall verified through the leak path): the integration tests prove these hold end-to-end over fixtures, using `fs.cpSync` to a temp root so no real `worlds/<slug>/` canon is mutated.

## Architecture Check

1. Scoping the test ticket to machine-checkable surfaces (and routing skill behaviors to the manual walkthrough) avoids asserting LLM-executed behavior in a unit harness that cannot exercise it — keeping the test suite honest about what it actually proves.
2. No backwards-compatibility shim: the new integration test extends the existing `spec<NN>-integration.test.ts` pattern; it introduces no production code.

## Verification Layers

1. prose-receipt `stchar_authority` block validates end-to-end through `world-validate` over a fixture receipt → integration test (`spec57-...test.ts`).
2. Page plan / receipt citing `CHAR-*` fails the leak path → integration assertion over a fixture exercising `no_char_authority_in_story_runtime`.
3. `record_active(STCHAR-*)` parses → integration assertion over a fixture SLT exercising `rule_storylet_predicate_dsl_parsability`.
4. Fixtures never mutate real canon → `fs.cpSync` to a temp root; re-enumerated expected counts computed at test start (not hardcoded).

## What to Change

### 1. Add integration test

Create `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` asserting: (a) a valid `stchar_authority` receipt passes `world-validate` and a missing/hash-inconsistent one fails; (b) a page-plan/receipt fixture citing `CHAR-*` as operational authority fails `no_char_authority_in_story_runtime`; (c) a fixture SLT with `record_active(STCHAR-*)` parses under the predicate-DSL parsability validator. Use a temp-root fixture copy; re-enumerate expected counts at test start.

### 2. Extend world-mcp fixtures if needed

If the integration test needs an active-STCHAR context-packet projection, extend `tools/world-mcp/tests/tools/story-bundle-fixture.ts` rather than duplicating fixture setup.

## Files to Touch

- `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` (new)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify, only if an active-STCHAR projection fixture is needed)

## Out of Scope

- Skill-behavior assertions (bootstrap abort, turn-cycle block, health-audit 2m) — verified by the DoD manual walkthrough.
- The prose-receipt schema-compliance unit test (`prose-receipt-schema-compliance.test.ts`) — owned by archive/tickets/SPEC57STCHARPIPINT-006.md.
- Any production code change.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` passes including `spec57-stchar-pipeline-integration.test.ts`.
2. The integration test asserts a missing/hash-inconsistent `stchar_authority` receipt fails and a `CHAR-*`-citing page plan fails the leak path.
3. The test mutates no file under the real `worlds/<slug>/` tree (temp-root copy verified).

### Invariants

1. Expected counts are re-enumerated from the fixture at test start, not hardcoded.
2. The integration test introduces no production code and does not duplicate -006's unit test.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec57-stchar-pipeline-integration.test.ts` — new integration test for the three machine surfaces (rationale: prove the prose-receipt schema extension, leak path, and predicate parsability compose end-to-end over a temp-root fixture).
2. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` — extend only if an active-STCHAR projection fixture is required.

### Commands

1. `npm test --prefix tools/validators`
2. `npm test --prefix tools/world-mcp` (only if the world-mcp fixture was extended)
3. The validators integration boundary is correct because every machine surface SPEC-57 adds is validated there; the skill behaviors are out of scope per the manual-walkthrough routing.
