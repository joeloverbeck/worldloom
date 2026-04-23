# SPEC10ENTSUR-005: Expand `inspect` command JSON payload to surface `entities` and `entity_aliases`

**Status**: COMPLETED

## Outcome

- Completed: 2026-04-23
- This ticket was absorbed into `SPEC10ENTSUR-001` because the inspect payload had to move with the same schema-breaking entity-surface contract.
- The payload expansion landed in:
  - `tools/world-index/src/commands/inspect.ts`
  - `tools/world-index/tests/commands.test.ts`
- Verification was performed under `SPEC10ENTSUR-001` with `cd tools/world-index && npm test`.
