# FOUNDATIONS-005: Reconcile `direct_user_approval` CF field authority

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `tools/validators/src/schemas/canon-fact-record.schema.json`, `canon-addition` / CF-parity producer surfaces as needed.
**Deps**: `archive/tickets/SPEC28STOCONHAR-005.md`

## Problem

`archive/tickets/SPEC28STOCONHAR-005.md` corrected the story-promotion proposal-package comments so `source_basis.direct_user_approval` stays `false` through `story-fact-promotion-to-canon`; Phase 7 approves proposal creation, not canon acceptance. During that work, reassessment preserved a separate world-canon concern: `source_basis.direct_user_approval` exists in the Canon Fact Record shape and validator schema, but no live validator, `canon-addition` phase, or patch-engine operation appears to consume the field's value.

Leaving a required CF field without operational or documented authority is brittle: future skills may mistake it for a canon-acceptance switch, while the actual canon acceptance authority is `canon-addition` adjudication plus HARD-GATE approval and patch-engine submission.

## Assumption Reassessment (2026-05-15)

1. Verified against `archive/tickets/SPEC28STOCONHAR-005.md`: D5 intentionally fixed only the story-promotion skill/template comments and explicitly left the CF-schema-level `direct_user_approval` question out of scope.
2. Verified against `docs/triage/2026-05-15-story-related-improvements-triage.md`: the `source_basis.direct_user_approval` field-without-a-consumer concern is listed as a follow-up, not an accepted SPEC-28 deliverable.
3. Cross-artifact shared boundary: Canon Fact Record authority and acceptance provenance across `docs/FOUNDATIONS.md` §Canon Fact Record Schema, `tools/validators/src/schemas/canon-fact-record.schema.json`, `.claude/skills/canon-addition`, and CF-shaped producer templates such as `story-fact-promotion-to-canon`.
4. FOUNDATIONS principle motivating this ticket: canon acceptance is an append-only canon process, not a template-side boolean. The field must either be given documented semantics and a real consumer, or be removed/relaxed consistently so it no longer looks like a shadow approval path.
5. HARD-GATE / canon-write ordering: this ticket must not weaken `canon-addition`'s HARD-GATE, approval-token, or patch-engine submission discipline. Any reconciliation keeps canon acceptance authority in `canon-addition` and the patch engine.
6. Adjacent contradiction classification: this is separate cleanup exposed by SPEC28STOCONHAR-005, not unfinished D5 work. D5 is complete because it corrected the misleading story-skill handoff comments and `[null]` default.

## Architecture Check

1. A single reconciliation ticket is cleaner than piecemeal edits because `direct_user_approval` spans the CF schema, FOUNDATIONS sample, canon-addition examples/emitters, and CF-shaped producer templates.
2. No backwards-compatibility aliasing or parallel approval paths should be introduced. The final contract should have one authority story for canon acceptance.

## Verification Layers

1. Field authority reconciled -> codebase grep-proof / manual review over `docs/FOUNDATIONS.md`, `tools/validators/src/schemas/canon-fact-record.schema.json`, `.claude/skills/canon-addition`, `.claude/skills/story-fact-promotion-to-canon`, and other CF-parity producer surfaces.
2. Canon acceptance authority preserved -> FOUNDATIONS alignment check against §Story Bundles write discipline and `docs/HARD-GATE-DISCIPLINE.md`.
3. Validator/schema behavior truthful -> targeted validator schema proof or schema grep-proof matching the chosen reconciliation path.
4. Producer/consumer parity preserved -> manual review that CF-shaped candidate templates and canon-addition parse/emit guidance no longer contradict the chosen field contract.

## What to Change

### 1. Reassess and choose the field contract

Determine whether `source_basis.direct_user_approval` should remain a CF field. If it remains, define its semantics in `docs/FOUNDATIONS.md` and ensure a real consumer or validation rule makes the value meaningful. If it does not remain, remove or relax it consistently from the validator schema and CF-parity producer surfaces.

### 2. Reconcile all CF-parity surfaces

Update `docs/FOUNDATIONS.md`, `tools/validators/src/schemas/canon-fact-record.schema.json`, `.claude/skills/canon-addition`, `.claude/skills/story-fact-promotion-to-canon`, and any other live CF-shaped templates/examples found by grep so the field contract is consistent.

### 3. Preserve the approval boundary

Keep canon acceptance authority in `canon-addition` adjudication, HARD-GATE approval, approval-token issuance, and patch-engine submission. Do not introduce a template-side boolean as an alternate approval path.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `tools/validators/src/schemas/canon-fact-record.schema.json` (modify if the field is removed, relaxed, or newly constrained)
- `.claude/skills/canon-addition/SKILL.md` and references/examples (modify as needed)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` and `templates/proposal-package.yaml` (modify as needed)
- Other CF-parity producer templates/examples found by grep (modify as needed)

## Out of Scope

- Reopening `archive/tickets/SPEC28STOCONHAR-005.md`; D5's story-promotion package correction is complete.
- Changing story-bundle promotion/closeout ordering beyond preserving the existing `story-fact-promotion-to-canon` -> `canon-addition` -> `story-promotion-closeout` handoff.
- Direct world-content migration unless live reassessment proves existing checked fixtures or sample worlds require it for the chosen schema contract.

## Acceptance Criteria

### Tests That Must Pass

1. A grep over `docs/FOUNDATIONS.md`, `tools/validators/src/schemas/canon-fact-record.schema.json`, `.claude/skills/`, and relevant examples/templates shows no stale `direct_user_approval` semantics that imply story-promotion Phase 7 canon acceptance.
2. `docs/FOUNDATIONS.md` and the validator schema agree on whether `source_basis.direct_user_approval` exists, is required, and what it means.
3. `canon-addition` remains the exclusive canon-acceptance authority; no producer template can set a boolean that bypasses adjudication, HARD-GATE approval, approval-token discipline, or patch-engine submission.

### Invariants

1. Canon acceptance authority is not duplicated across a CF field and `canon-addition`.
2. The CF schema and all CF-shaped producer templates remain in parity.
3. The Mystery Reserve firewall and HARD-GATE approval flow are not weakened.

## Test Plan

### New/Modified Tests

1. `tools/validators` schema tests — update or add focused coverage if the CF schema contract changes.
2. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` Use this only if reassessment keeps the field and reconciles prose without changing validator behavior.

### Commands

1. `rg -n "direct_user_approval|source_basis" docs/FOUNDATIONS.md tools/validators/src/schemas/canon-fact-record.schema.json .claude/skills`
2. Run the focused validator/schema proof required by the chosen reconciliation path.
3. `git diff --check`
