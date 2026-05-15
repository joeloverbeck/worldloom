# SPEC31STOCONHAR-008: Require CH-window retrieval for canon drift

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, new `tools/validators/src/structural/canon-drift-classification-evidence.ts`, `tools/validators/src/public/registry.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

Drift classification compares parent baseline to current world-canon revision (latest CH), but skills do not load the intervening CH window. `branching-story-turn-cycle/SKILL.md:164-165` extracts "current world-canon revision from the latest `change_log_entry` in the context packet." `branching-story-health-audit/SKILL.md:131,238` similarly compare against "the latest" without walking intervening CH entries or affected records. A page could classify as `compatible` because only the latest CH was inspected, while an intervening CH invalidated active story state.

**Important schema constraint** (codebase validation surfaced): `tools/validators/src/schemas/change-log-entry.schema.json` defines only `affected_fact_ids: array of CF-N` — no field naming M / INV / SEC ids directly. The spec D8 anticipated this in §Risks. The drift-evidence path is therefore a 2-step lookup: CH → `affected_fact_ids` (CF list) → `find_sections_touched_by(cf_id)` (or equivalent MCP retrieval against `touched_by_cf[]` graph on SEC/M/INV records).

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: turn-cycle `:164-165`, health-audit `:131,:238`, change-log-entry schema field list confirmed. CH schema has `affected_fact_ids: [CF-N]` only.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D8 specifies CH-window retrieval; §Risks acknowledged the CH "affects" field-naming open question.
3. **Cross-skill / cross-artifact boundary under audit**: CH record schema (consumer-side) + 2 skills (turn-cycle drift trigger; health-audit Phase 2h drift evidence) + MCP `find_sections_touched_by` retrieval surface + new validator.
4. **FOUNDATIONS principle under audit (restated)**: Rule 6 (No Silent Retcons) — drift classification cannot deem a page `compatible` against current canon without citing the intervening CH evidence; the audit trail requires the CH window to make the classification reproducible.
5. **Mismatch + correction**: spec D8 said "follow each CH's `affects: [<CF | M | INV | SEC ids>]`" — the actual schema is `affected_fact_ids: [CF-N]` only. The corrected lookup path is a 2-step graph traversal via `touched_by_cf[]` back-pointers. Documented in §What to Change.
6. **Verification-surface correction**: no executable story-skill dry-run harness is exposed in this repo. The skill-flow proof is therefore a contract grep/manual-review proof over the exact turn-cycle and health-audit instructions, backed by the mechanized `canon_drift_classification_evidence` validator and the validators package test lane.
7. **HARD-GATE read**: yes — this ticket registers a story-bundle structural validator that can participate in pre-apply validation for `create_pg_record` patch plans. The validator is warn-only and applies to page creation plans; it does not weaken approval, submit, or fail-closed HARD-GATE behavior.

## Architecture Check

1. **Cleaner than alternative**: requiring CH-window evidence at drift-classification time prevents silent drift acceptance and produces a reproducible audit trail. The alternative (relax drift classification to single-latest-CH comparison) was the source of the bug.
2. **No backwards-compatibility shims**: no production story bundles exist; drift classification can adopt the new evidence requirement directly.

## Verification Layers

1. **Drift compatible-classification without CH-window citation is flagged** → schema validation (validator test: PG with `canon_revision: CH-5`, current `CH-12`, classification `compatible`, no CH-window citation → `canon_drift_classification_missing_evidence` WARN).
2. **Drift classification with CH-window citation passes** → schema validation.
3. **Turn-cycle instructions load CH window when drift trigger fires** → codebase grep-proof + manual review.
4. **Health-audit Phase 2h walks CH window for stale baselines** → codebase grep-proof + manual review.

## What to Change

### 1. Contract `.claude/skills/_shared-templates/story-state-contract.md`

Add to §4b drift discipline (or a new sub-section near §9) the CH-window discipline:
```
When `parent.state_snapshot.canon_revision != current_world_canon_revision`,
drift classification MUST retrieve every CH entry newer than the parent
baseline. Each CH names its `affected_fact_ids: [CF-<integer>]`; the affected
M / INV / SEC ids are discovered via 2-step graph traversal through the
`touched_by_cf[]` back-pointers on SEC / M / INV records (via
`mcp__worldloom__find_sections_touched_by(cf_id)` or equivalent retrieval).
The latest CH from the context packet is the trigger for drift detection; the
CH window and its CF-graph reverse-lookup are the evidence for classification.
```

### 2. Turn-cycle `branching-story-turn-cycle/SKILL.md` Pre-flight (after `:165`)

If `parent.state_snapshot.canon_revision != latest_ch_id`, before classifying drift:
1. Call `mcp__worldloom__get_records(record_ids=<every CH id newer than parent baseline>, world_slug=<world_slug>)`.
2. For each CH's `affected_fact_ids`, call `mcp__worldloom__find_sections_touched_by(cf_id)` (and equivalent retrieval for M / INV ids via their `touched_by_cf[]` back-pointers) to enumerate the affected SEC/M/INV records.
3. Classify drift based on the full window's evidence.

### 3. Health-audit `branching-story-health-audit/SKILL.md` Phase 2h `:238`

Same discipline: for each stale baseline, walk the CH window from `PG.state_snapshot.canon_revision` to current. Classify based on full-window evidence; cite at least one specific CH-id in the new page plan or audit finding's rationale.

### 4. CONTEXT-PACKET-CONTRACT.md

Document the CH-window retrieval pattern as a recommended follow-up call after `get_context_packet` returns a drift trigger. Optionally add a `task_type='canon_drift_classification'` packet variant that automatically delivers the CH window; defer that variant to a follow-up spec (out of scope for D8 v1).

### 5. New validator `tools/validators/src/structural/canon-drift-classification-evidence.ts`

- When a PG's drift classification cites `compatible` or `grandfathered` against a baseline ≥2 CH revisions stale, the SE's rationale (or PG's `validation_trace`) MUST cite at least one specific CH-id from the window justifying the classification.
- Emit `canon_drift_classification_missing_evidence` (severity: warn) on absence.

Register in `tools/validators/src/public/registry.ts`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4b or new section)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Pre-flight after `:165`)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2h, `:238`)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — canon-drift recommendation)
- `tools/validators/src/structural/canon-drift-classification-evidence.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register)
- `tools/validators/tests/structural/canon-drift-classification-evidence.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — registry inventory)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator count)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply skip assertion)
- `tools/validators/README.md` (modify — validator inventory)

## Out of Scope

- `task_type='canon_drift_classification'` MCP packet variant — follow-up MCP ticket.
- CH schema extension to add `touched_records` or similar M/INV/SEC field — out of scope for D8; the 2-step graph traversal pattern is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: PG with `canon_revision: CH-5`, current `CH-12`, classification `compatible`, no CH-window citation → `canon_drift_classification_missing_evidence` WARN.
2. Validator test: same, classification `compatible` with rationale citing `CH-7` and `CH-10` from the window → PASS.
3. Contract proof: turn-cycle on a drifted parent is instructed to load the CH window via `get_records`; health-audit Phase 2h is instructed to classify from the same CH-window evidence and cite CH ids.

### Invariants

1. Drift classification post-D8 is reproducible from the audit trail: a reader can identify which CH entries the classification considered.
2. The 2-step CH → CF → SEC/M/INV graph traversal is consistent across turn-cycle and health-audit.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/canon-drift-classification-evidence.test.ts` — fixtures: compatible classification without CH-window citation warns; compatible classification with `validation_trace` or SE-rationale CH citation passes; one-CH drift windows do not warn; pre-apply selector is scoped to `create_pg_record`.
2. `tools/validators/tests/structural/registry.test.ts` — registry inventory includes the new validator.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — mechanized validator counts updated to 15 structural / 25 total.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — clean non-page pre-apply plans skip `canon_drift_classification_evidence`.

### Commands

1. `npm run build` (from `tools/validators`) → green.
2. `node --test dist/tests/structural/canon-drift-classification-evidence.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` (from `tools/validators`) → green, 21 tests pass.
3. `npm test` (from `tools/validators`) → green, 267 tests pass.
4. `rg -n 'CH window|affected_fact_ids|find_sections_touched_by|canon_drift_classification_evidence' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md docs/CONTEXT-PACKET-CONTRACT.md tools/validators/src tools/validators/tests tools/validators/README.md` → current contract and validator surfaces carry the CH-window pattern.

## Outcome

Completed: 2026-05-15

Implemented the D8 CH-window drift-evidence contract across the shared story-state contract, turn-cycle, health-audit, context-packet contract, and validators package. Added `canon_drift_classification_evidence`, a warn-only structural validator that checks page records with compatible/grandfathered stale-baseline classifications over two or more intervening CH entries and warns when no specific intervening CH id is cited in the page validation trace or page-producing SE rationale. Registered the validator, updated package inventory/count assertions, and added focused tests for missing citation, accepted `validation_trace` citation, accepted SE-rationale citation, one-CH windows, and pre-apply selector scope.

## Verification Result

- `npm run build` from `tools/validators` passed.
- `node --test dist/tests/structural/canon-drift-classification-evidence.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` passed: 21 tests.
- `npm test` from `tools/validators` passed: 267 tests.

## Deviations

- Replaced the drafted skill dry-run proof with manual contract review plus grep-proof over the live skill instructions, because this repo does not expose an executable story-skill dry-run harness.
- Kept the new validator warn-only. The ticket acceptance names a WARN verdict, and the purpose is audit-trail evidence quality for drift classifications, not blocking all page creation.
