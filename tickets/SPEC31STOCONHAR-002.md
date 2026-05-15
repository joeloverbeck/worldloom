# SPEC31STOCONHAR-002: Define audit-only SE lifecycle (§4.3a)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, new `tools/validators/src/structural/audit-only-se-shape.ts`, `tools/validators/src/public/registry.ts`, `tools/validators/src/structural/snapshot-replay-equality.ts` (verify skip path), `.claude/skills/branching-story-prose-attach/SKILL.md`, `.claude/skills/story-promotion-closeout/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

Contract `.claude/skills/_shared-templates/story-state-contract.md:209,214,242` enumerates `event_kind: prose_attach | promotion_closeout` and specifies `selection_source: none` / `selected_slt_id: null` for these. The contract does NOT define whether these events emit a page, carry state delta, or appear in snapshot replay. Without specification, an audit-only event could either corrupt replay (treated as page-producing) or vanish from the audit trail (treated as no-op). The story-event.schema.json already declares the event_kind enum at `tools/validators/src/schemas/story-event.schema.json:30-31` and reserves a conditional schema branch at `:126-127` for these kinds — but neither contract prose nor validator rule enforces the audit-only-shape constraints.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: `tools/validators/src/schemas/story-event.schema.json:30-31,126-127` confirmed `prose_attach` / `promotion_closeout` in the event_kind enum with a reserved conditional branch. Existing structural validators directory (`tools/validators/src/structural/`) does not contain `audit-only-se-shape.ts` — confirmed new file.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D2 fully specifies the audit-only SE shape (empty delta, no PG.input, replay-ignored, parent_page_id rules). No discrepancies with the codebase or contract.
3. **Cross-skill / cross-artifact boundary under audit**: SE schema + contract §4.3 + 3 skills that emit or consume audit-only SEs (prose-attach for `prose_attach`; closeout for `promotion_closeout`; health-audit for Phase 2a replay). The new validator `audit_only_se_shape` is the structural enforcement; replay's existing skip path needs verification, not modification.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §5b (Schema-Minimalism) — audit-only SEs already have schema-reserved enum slots and conditional branches; this ticket fills the load-bearing semantics that justify those slots.
5. **HARD-GATE / canon-write impact**: none. Audit-only SEs are story-bundle-scope records; they record audit events for prose-attach and promotion-closeout but introduce no world-canon write surface. Mystery Reserve firewall unaffected.

## Architecture Check

1. **Cleaner than alternative**: the alternative (let prose-attach and closeout each independently document audit-only SE behavior in their own skill prose) would scatter the contract across three files and let drift accumulate. Centralizing in contract §4.3a with one validator gives a single source of truth.
2. **No backwards-compatibility shims**: no existing story bundles exist; the contract addition is strict from day one. Fixtures must conform.

## Verification Layers

1. **Audit-only SE with non-empty `state_delta.create` is rejected** → schema validation (validator test: `prose_attach` SE with `state_delta.create: [SF-1]` → `audit_only_se_shape_violation` FAIL).
2. **Audit-only SE with `selected_slt_id` set is rejected** → schema validation (similar fixture).
3. **Audit-only SE with valid empty-delta shape passes** → schema validation.
4. **Snapshot replay walks audit-only SE as no-op** → skill dry-run (replay-equality test: bundle with `prose_attach` SE between PG-2 and PG-3 → PG-3 snapshot matches PG-2 plus its own delta).
5. **Skill prose cites §4.3a as conformance contract** → codebase grep-proof (`prose-attach`, `closeout`, `health-audit` Phase 2a all reference §4.3a in updated prose).

## What to Change

### 1. Contract `.claude/skills/_shared-templates/story-state-contract.md` §4.3

Insert a new sub-section §4.3a after the route consistency table:

```
#### 4.3a Audit-only SE events

`event_kind: prose_attach` and `event_kind: promotion_closeout` are audit-only
event records. They do NOT produce a page, do NOT appear in any
`PG.input.resolved_event_id`, and do NOT alter branch snapshots.

Required shape:
- `commitment.selected_slt_id: null`
- `commitment.selection_source: none`
- `commitment.alias_bindings: {}`
- `outcome_route: accept`
- `resolution` absent
- `state_delta.create: []`
- `state_delta.supersede: []`
- `state_delta.close: []`
- `promotion_claims: []`
- `parent_page_id` names the page whose prose or promotion closeout is being
  audited; null only when the bundle has no relevant page anchor.

`snapshot_replay_equality` ignores audit-only SE records except as ledger
evidence. Health-audit's structural-replay phases (2a, 2c, 2d) treat
audit-only SEs as no-op walkable events that do not alter cumulative state.
```

### 2. New validator `tools/validators/src/structural/audit-only-se-shape.ts`

Module exports a structural rule that:
- Loads any SE record with `event_kind ∈ {prose_attach, promotion_closeout}`.
- Verifies each required-shape constraint from §4.3a.
- Emits `audit_only_se_shape_violation` (severity: fail) on any mismatch.

### 3. Register the rule in `tools/validators/src/public/registry.ts`

Add `audit_only_se_shape` to the registered structural-rules list.

### 4. Verify `tools/validators/src/structural/snapshot-replay-equality.ts`

Confirm the replay walk already skips audit-only SE records (or treats their empty delta as no-op). If not, add the skip. Document the verification outcome inline as a comment if no code change is needed.

### 5. Prose-attach skill (`.claude/skills/branching-story-prose-attach/SKILL.md`)

Update the Phase prose describing the `emit_attach_event: true` path to cite §4.3a as the conformance requirement.

### 6. Closeout skill (`.claude/skills/story-promotion-closeout/SKILL.md`)

Update the Phase prose describing the `emit_closeout_event: true` path to cite §4.3a.

### 7. Health-audit skill (`.claude/skills/branching-story-health-audit/SKILL.md`) Phase 2a

Add a note that audit-only SE records are ledger-only and contribute no delta to cumulative state during replay.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — new §4.3a)
- `tools/validators/src/structural/audit-only-se-shape.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register new rule)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (verify; modify only if skip path absent)
- `tools/validators/tests/structural/audit-only-se-shape.test.ts` (new)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2a note)

## Out of Scope

- Other SE event_kinds (`story_start`, `selected_choice`, `write_in_attempt`, `system_repair`, `audit_repair`) — already governed by contract §4.3.
- Story-event schema changes to enforce the audit-only shape at JSON-schema level — the validator-rule level is sufficient; schema-level enforcement would require complex `if/then/else` conditional blocks for diminishing returns.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: `prose_attach` SE with non-empty `state_delta.create` → `audit_only_se_shape_violation` FAIL.
2. Validator test: `prose_attach` SE with `selected_slt_id: SLT-1` → FAIL.
3. Validator test: `promotion_closeout` SE with valid empty-delta shape → PASS.
4. Replay test: bundle with `prose_attach` SE between PG-2 and PG-3 → PG-3 snapshot matches PG-2 plus its own delta.

### Invariants

1. Any SE with `event_kind ∈ {prose_attach, promotion_closeout}` and non-empty state_delta → rejected by `audit_only_se_shape`.
2. `snapshot_replay_equality` produces deterministic snapshots regardless of how many audit-only SEs sit between page events.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/audit-only-se-shape.test.ts` — new fixtures covering all required-shape constraints + valid + invalid cases.
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — if not already covered, add fixture: bundle with interspersed audit-only SE → replay matches non-audit baseline.

### Commands

1. `pnpm --filter @worldloom/validators test -t "audit_only_se_shape"` → all cases PASS.
2. `pnpm --filter @worldloom/validators test` (full pipeline) → green.
3. `grep -n "§4.3a" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` → matches in all three (skill prose updated).
