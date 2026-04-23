# SPEC10ENTSUR-006: Rewrite entity-surface test coverage against the three-surface contract

**Status**: COMPLETED

## Outcome

- Completed: 2026-04-23
- This ticket was absorbed into `SPEC10ENTSUR-001` because the package-level contract change was not complete until the coupled test surfaces were rewritten.
- The rewritten test coverage landed in:
  - `tools/world-index/tests/schema.test.ts`
  - `tools/world-index/tests/crud.test.ts`
  - `tools/world-index/tests/entities.test.ts`
  - `tools/world-index/tests/commands.test.ts`
  - `tools/world-index/tests/integration/build-animalia.test.ts`
  - `tools/world-index/tests/types.test.ts`
- Verification was performed under `SPEC10ENTSUR-001` with `npm run build`, the targeted node-test lanes, the animalia integration test, and `npm test`.
