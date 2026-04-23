# SPEC10ENTSUR-003: Rewrite entity-write insert helpers and narrow entity-source node types

**Status**: COMPLETED

## Outcome

- Completed: 2026-04-23
- This ticket was absorbed into `SPEC10ENTSUR-001` because the schema/type break could not land truthfully without its direct write-path fallout in the same package.
- The helper and orchestration changes landed in:
  - `tools/world-index/src/index/nodes.ts`
  - `tools/world-index/src/commands/shared.ts`
- Verification was performed under `SPEC10ENTSUR-001` with:
  - `cd tools/world-index && npm run build`
  - `cd tools/world-index && npm test`
