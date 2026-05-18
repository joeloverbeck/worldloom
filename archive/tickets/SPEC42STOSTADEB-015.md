# SPEC42STOSTADEB-015: End-to-end verification capstone for CLK/STSEC/STQ

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Adds the SPEC-42 capstone integration test plus same-seam contract fixes for STSEC pre-apply materialization and `expected_id_allocations.stq_ids` envelope metadata.
**Deps**: archive/tickets/SPEC42STOSTADEB-010.md, archive/tickets/SPEC42STOSTADEB-011.md, archive/tickets/SPEC42STOSTADEB-012.md, archive/tickets/SPEC42STOSTADEB-013.md, archive/tickets/SPEC42STOSTADEB-014.md

## Problem

After all 14 upstream tickets (SPEC42STOSTADEB-001 through -014) have landed, the spec's §Verification section enumerates per-layer verifications (schema-level, validator-level, MCP-level, skill-level, backwards-compatibility) that need to compose end-to-end on a representative fixture bundle. Per-ticket tests verify their own surface; this capstone verifies the surfaces compose — a CLK can be created via patch-engine ops, indexed by world-index, retrieved via MCP, used in a turn-cycle SE.state_delta, surfaced in a page-plan §10b section, and audited for stalled-clock detection by health-audit — all in one end-to-end flow against a temp-copy of a fixture world. The capstone is the integration boundary that catches cross-ticket gaps that per-ticket tests miss.

## Assumption Reassessment (2026-05-18)

1. Codebase verified against the live SPEC-42 surfaces before editing: schemas, operation kinds, validators, MCP handlers, story-bundle fixtures, and story-pipeline skill contract files already existed from upstream tickets.
2. Spec verified at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` §Verification. The live repo has executable machine surfaces for schema, validator, MCP, and patch-plan behavior, but the story-pipeline skills are prose workflows without an executable dry-run runner.
3. Cross-skill / cross-tool shared boundary: the capstone belongs under `tools/world-mcp/tests/integration/` because it can compose schema discovery, envelope metadata, indexed retrieval, ID allocation, context packets, and validate-patch-plan behavior in one package-local proof lane while reading skill contract files as executable surrogates.
4. The draft's fixture-world-copy wording was adjusted to the live harness. The capstone uses the existing `buildStoryBundleWorld` temp fixture and an inline synthetic patch-plan fixture rather than adding a new persistent fixture world. No real `worlds/<slug>/` content is mutated.
5. The capstone exposed two same-seam production metadata gaps: STSEC create/supersede operations were not materialized into the validator pre-apply read surface, and `describe_envelope_schema` omitted `expected_id_allocations.stq_ids`. Both were fixed in the same ticket because they are required for the capstone's cross-surface contract to be truthful.

## Architecture Check

1. **Leaf-set dep per current spec-to-tickets guidance**: the upstream DAG is not a linear chain, so the capstone depends on the archived skill-integration leaves -010 / -011 / -012 / -013 plus archived docs ticket -014.
2. **Temp fixture isolation**: the test creates all world/index content in temporary directories through existing fixture builders and inline plan data. No durable world content is read-write.
3. **Executable surrogate for skills**: story-pipeline skill behavior is verified by contract-surface string checks against `.claude/skills/` and `.claude/story-state-contract.md`, not by pretending an executable skill runner exists.
4. **No wall-clock perf assertion**: SPEC-42 §Verification does not name a performance gate; this capstone omits a perf assertion.

## Verification Layers

1. Schema-level: `get_record_schema` exposes the CLK, STSEC, and STQ schema sources and required fields.
2. Envelope-level: `describe_envelope_schema` exposes SPEC-42 operation schemas and expected allocation keys for `clk_ids`, `stsec_ids`, and `stq_ids`.
3. MCP/index-level: `get_record`, `list_records`, `allocate_next_id`, and `get_context_packet` compose against a story-bundle temp fixture containing CLK/STSEC/STQ records.
4. Validator-level: `validate_patch_plan` accepts a same-envelope SPEC-42 create plan and rejects prohibited STQ fields through `record_schema_compliance`.
5. Skill-level: story-pipeline skills and the story-state contract are checked as executable text-contract surrogates for the SPEC-42 operations, predicates, visibility block, and audit/prose coverage.

## What to Change

### 1. Capstone integration test (new file)

Create `tools/world-mcp/tests/integration/spec42-capstone.test.ts`. The test:

a. Verifies schema discovery, envelope operation schemas, and expected allocation keys for CLK/STSEC/STQ.
b. Builds a temporary story-bundle world and proves indexed retrieval, listing, ID allocation, and story-pipeline context packet composition.
c. Validates an inline SPEC-42 create-record patch plan and proves STQ prohibited fields fail at the schema-compliance validator boundary.
d. Reads the story-pipeline skill contract surfaces as executable surrogates for skill-level coverage.

## Files to Touch

- `tools/world-mcp/tests/integration/spec42-capstone.test.ts` (new)
- `tools/validators/src/_helpers/index-access.ts`
- `tools/world-mcp/src/tools/describe-envelope-schema.ts`
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`
- `tools/world-mcp/tests/server/capability-parity.test.ts`
- `archive/tickets/SPEC42STOSTADEB-015.md`

## Out of Scope

- New persistent fixture worlds
- Wall-clock performance assertions (SPEC-42 names no perf gate)
- Broad production behavior beyond same-seam contract metadata/pre-apply materialization required by the capstone
- Documentation updates (owned by archive/tickets/SPEC42STOSTADEB-014.md)

## Acceptance Criteria

### Tests That Must Pass

1. `npm test` from `tools/world-mcp` passes, including the new capstone.
2. `npm test` from `tools/validators` passes after the STSEC pre-apply helper update.
3. The capstone maps the executable SPEC-42 verification surfaces to subtests and records skill-level coverage as contract-surface surrogates.
4. The test uses temporary fixture construction only and never mutates real `worlds/<slug>/` content.

### Invariants

1. The capstone is the single executable integration boundary for SPEC-42 composition.
2. Fixture isolation: real `worlds/` content is not mutated.
3. Skill-flow claims remain limited to contract-surface surrogate checks because no executable prose-skill runner exists.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec42-capstone.test.ts` (new)
2. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`
3. `tools/world-mcp/tests/server/capability-parity.test.ts`

### Commands

1. `npm run build` from `tools/validators` — passed
2. `npm test` from `tools/validators` — passed, 416 tests
3. `npm run build` from `tools/world-mcp` — passed
4. `node --test dist/tests/integration/spec42-capstone.test.js` from `tools/world-mcp` — passed, 4 tests
5. `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp` — passed, 5 tests
6. `npm test` from `tools/world-mcp` — passed, 399 tests

## Outcome

Completion date: 2026-05-18.

Completed. Added the SPEC-42 capstone under `tools/world-mcp/tests/integration/spec42-capstone.test.ts`, covering schema/envelope discovery, indexed story-bundle retrieval/listing/allocation/context composition, validate-patch-plan behavior, and story-pipeline skill contract surrogates for CLK/STSEC/STQ.

Same-seam capstone fallout was fixed:

1. STSEC create/supersede operations now materialize story secret records into the validator pre-apply read surface.
2. `describe_envelope_schema` now exposes `expected_id_allocations.stq_ids`.
3. The world-mcp validator capability parity test now includes the SPEC-42 validators.

## Deviations

The capstone does not execute `.claude/skills/` as live workflows. Those skills are prose instructions, not runnable programs, so skill-level verification is represented by executable contract-surface surrogate checks against the story-state contract and consuming skill files.
