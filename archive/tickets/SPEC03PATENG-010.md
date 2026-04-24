# SPEC03PATENG-010: Truth SPEC-03 hybrid adjudication payload contract

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation/spec contract truthing only.
**Deps**: archive/tickets/SPEC03PATENG-004.md

## Problem

`SPEC03PATENG-004` landed the hybrid-file op modules and updated `tools/patch-engine/src/envelope/schema.ts` so `append_adjudication_record` uses `{adjudication_frontmatter, body_markdown, filename?}` while `op.target_file` owns addressing. `specs/SPEC-03-patch-engine.md` still documented the adjudication hybrid payload with the legacy verdict/body/filename shape in the Hybrid-file ops table, which contradicted the live engine type surface and the completed ticket.

## Assumption Reassessment (2026-04-24)

1. Live code after `SPEC03PATENG-004` types `append_adjudication_record` with `adjudication_frontmatter` and `body_markdown` in `tools/patch-engine/src/envelope/schema.ts`; the adjudication frontmatter interface is colocated at `tools/patch-engine/src/ops/append-adjudication-record.ts`.
2. The authoritative design spec previously described the `append_adjudication_record` payload with the legacy verdict/body/filename shape in `specs/SPEC-03-patch-engine.md` under `Hybrid-file ops`; this ticket replaces that stale wording with the live typed payload.
3. Shared boundary under audit: SPEC-03 is the design authority used by the remaining SPEC03PATENG tickets and by future skill rewrites that submit patch plans. The spec should match the live typed envelope before later tests or MCP wiring bake in stale examples.
4. FOUNDATIONS principle under audit: Rule 6 No Silent Retcons remains unchanged; this ticket only truths the documented patch-plan payload for append-only adjudication files.

## Architecture Check

1. Updating SPEC-03 keeps the design authority aligned with the landed engine contract without introducing aliases or backwards-compatibility payload shapes.
2. No backwards-compatibility aliasing/shims introduced; the stale legacy adjudication shape is replaced, not retained as an alternate accepted form.

## Verification Layers

1. SPEC-03 adjudication payload matches live `PatchOperation` type -> codebase grep-proof.
2. SPEC-03 still documents `op.target_file` as the addressing surface for hybrid-file ops -> manual review.
3. Remaining SPEC03PATENG tickets do not carry the stale adjudication payload into test or wiring contracts -> codebase grep-proof over `tickets/SPEC03PATENG-*.md`.

## What to Change

### 1. Update `specs/SPEC-03-patch-engine.md`

Replace the adjudication hybrid payload table entry with the landed payload shape:

```typescript
{
  adjudication_frontmatter: AdjudicationFrontmatter;
  body_markdown: string;
  filename?: string;
}
```

Keep `op.target_file` as the authoritative address and note that `filename` is optional legacy/helper metadata, not the path the engine resolves.

### 2. Sweep remaining SPEC03PATENG tickets

Grep active SPEC03PATENG tickets for stale adjudication payload snippets. Update only factual references that would mislead implementers of tickets 006-009.

## Files to Touch

- `specs/SPEC-03-patch-engine.md` (modify)
- `tickets/SPEC03PATENG-006.md` through `tickets/SPEC03PATENG-009.md` if grep finds stale adjudication payload wording that affects their implementation contracts

## Out of Scope

- Changing patch-engine code.
- Adding alternate accepted payload shapes.
- Implementing apply orchestration or per-op tests; those remain tickets 006 and 008.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "{verdict, body, filename}" specs/SPEC-03-patch-engine.md tickets/SPEC03PATENG-00[6-9].md` returns 0.
2. `grep -n "adjudication_frontmatter.*body_markdown" specs/SPEC-03-patch-engine.md` returns at least 1 match.
3. `grep -n "target_file" specs/SPEC-03-patch-engine.md` still shows the envelope/addressing contract for hybrid files.

### Invariants

1. SPEC-03 and the live TypeScript envelope agree on adjudication hybrid payload names.
2. `op.target_file` remains the path contract; `filename` must not be documented as the engine's resolved path.
3. No compatibility alias is introduced for the stale adjudication payload shape.

## Test Plan

### New/Modified Tests

1. `None — spec truthing only; verification is grep/manual-review based.`

### Commands

1. `grep -n "{verdict, body, filename}" specs/SPEC-03-patch-engine.md tickets/SPEC03PATENG-00[6-9].md`
2. `grep -n "adjudication_frontmatter.*body_markdown" specs/SPEC-03-patch-engine.md`
3. Manual review of the `Hybrid-file ops` table and `PatchOperation` envelope section in `specs/SPEC-03-patch-engine.md`.

## Outcome

Completed 2026-04-24. SPEC-03 now documents the live `append_adjudication_record` payload as `adjudication_frontmatter`, `body_markdown`, and optional helper `filename`, with `op.target_file` retained as the engine-resolved path. Active sibling tickets 006-009 did not contain the stale adjudication payload shape, so no sibling ticket edits were needed.

## Verification Result

Passed 2026-04-24:

1. `grep -n "{verdict, body, filename}" specs/SPEC-03-patch-engine.md tickets/SPEC03PATENG-00[6-9].md` returned no matches.
2. `grep -n "adjudication_frontmatter.*body_markdown" specs/SPEC-03-patch-engine.md` returned the updated Hybrid-file ops table row.
3. `grep -n "target_file" specs/SPEC-03-patch-engine.md` confirmed the envelope/addressing contract remains documented.
4. Manual review confirmed the `Hybrid-file ops` table no longer presents `filename` as the engine-resolved path.
