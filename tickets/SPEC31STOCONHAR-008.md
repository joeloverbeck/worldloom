# SPEC31STOCONHAR-008: Require CH-window retrieval for canon drift

**Status**: PENDING
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

## Architecture Check

1. **Cleaner than alternative**: requiring CH-window evidence at drift-classification time prevents silent drift acceptance and produces a reproducible audit trail. The alternative (relax drift classification to single-latest-CH comparison) was the source of the bug.
2. **No backwards-compatibility shims**: no production story bundles exist; drift classification can adopt the new evidence requirement directly.

## Verification Layers

1. **Drift compatible-classification without CH-window citation is flagged** → schema validation (validator test: PG with `canon_revision: CH-5`, current `CH-12`, classification `compatible`, no CH-window citation → `canon_drift_classification_missing_evidence` WARN).
2. **Drift classification with CH-window citation passes** → schema validation.
3. **Turn-cycle dry-run loads CH window when drift trigger fires** → skill dry-run.
4. **Health-audit Phase 2h walks CH window for stale baselines** → skill dry-run.

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

## Out of Scope

- `task_type='canon_drift_classification'` MCP packet variant — follow-up MCP ticket.
- CH schema extension to add `touched_records` or similar M/INV/SEC field — out of scope for D8; the 2-step graph traversal pattern is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: PG with `canon_revision: CH-5`, current `CH-12`, classification `compatible`, no CH-window citation → `canon_drift_classification_missing_evidence` WARN.
2. Validator test: same, classification `compatible` with rationale citing `CH-7` and `CH-10` from the window → PASS.
3. Skill dry-run: turn-cycle on a drifted parent → loads CH window via `get_records`; classifies per loaded evidence.

### Invariants

1. Drift classification post-D8 is reproducible from the audit trail: a reader can identify which CH entries the classification considered.
2. The 2-step CH → CF → SEC/M/INV graph traversal is consistent across turn-cycle and health-audit.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/canon-drift-classification-evidence.test.ts` — fixtures: compatible / repair-turn / promotion-conflict / grandfathered with and without CH-window citation.

### Commands

1. `pnpm --filter @worldloom/validators test -t "canon_drift_classification_evidence"` → green.
2. `grep -n "canon_revision" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` → matches reflect CH-window pattern post-edit.
