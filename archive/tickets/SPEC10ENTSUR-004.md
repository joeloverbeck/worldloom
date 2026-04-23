# SPEC10ENTSUR-004: Rewrite `entities.ts` three-stage extraction pipeline + repurpose stoplist

**Status**: COMPLETED

## Outcome

- Completed: 2026-04-23
- This ticket was absorbed into `SPEC10ENTSUR-001` because the three-stage extraction rewrite is the same live contract seam as the schema and write-path changes.
- The extraction and stoplist-scope changes landed in:
  - `tools/world-index/src/parse/entities.ts`
  - `tools/world-index/src/parse/stoplist.ts`
  - `tools/world-index/src/commands/shared.ts`
- Verification was performed under `SPEC10ENTSUR-001` with targeted entity tests, the animalia integration test, and the full package test lane.
