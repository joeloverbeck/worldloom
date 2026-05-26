# SPEC89STOEXPSTA-003: Per-class deterministic summary renderers (§7)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies the `RecordCardRenderers.tsx` stub created by SPEC89STOEXPSTA-002 to implement per-class compact-line rendering for the 22 record classes named in SPEC-89 §7
**Deps**: SPEC89STOEXPSTA-002

## Problem

SPEC-89 §7's "Deterministic summary rules per class" table is the canonical compact-line specification for the 22 record classes the X-Ray surfaces (STENT, STCHAR, STSTAT, BEL, SF, SE, CHC, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, DA, CLK, STSEC, STQ, STPLAN, STEMO, BR, SLT). SPEC-87 §8 owns the data path (parsed body → summary inputs); SPEC-89 owns the field rendering. This ticket implements the per-class JSX dispatch in `RecordCardRenderers.tsx` (created as a stub in SPEC89STOEXPSTA-002) so each compact card renders the correct primary-line fields for its class. Memoization per §10 caches the rendered output per recordCard within the session.

Per the 2026-05-26 reassessment, the compact-card primary line never fabricates text not present in the record (§7's "Never fabricate" rule; consistent with the no-LLM-summaries v1 decision); the renderers follow the explicit fallback chain: explicit title/label/name/objective/claim → first meaningful string field for that class → record ID + class → "Untitled <CLASS> record". The fallback chain is consumed from the `recordCard` view-model SPEC-87 §8 builds server-side.

## Assumption Reassessment (2026-05-26)

1. `RecordCardRenderers.tsx` stub exists at `tools/story-explorer/web/src/components/xray/` after SPEC89STOEXPSTA-002 lands (intra-batch dependency; this ticket modifies it). SPEC-87 `tools/story-explorer/src/read/record-card.ts` builds the RecordCard view-model with per-class fields populated server-side (verified — SPEC-87 §8). Schema fields cited in §7 (`SF.authority`, `OBL.urgency`, `CNSQ.urgency`, `CHC.grounded_in`, `CHC.likely_state_pressure`, `STPLAN.{holder,objective,blockers,current_step.success_condition}`, `STEMO.{holder,trigger_event,intensity,orientation}`, `BR.{label,parent_branch_id,forked_at_page_id,root_page_id}`, `SLT.{move_family,scope,saliency,compatible_turn_drivers}`) all exist on their respective schemas (verified during 2026-05-26 reassessment).
2. SPEC-89 §7 (Deterministic summary rules per class) holds the canonical 22-row table. The 2026-05-26 reassessment edits clarified CHC's pressure-chip wording — `likely_state_pressure` is a singular string per schema, not a plural array — and added BR + CHC to the §3 group taxonomy so per-class renderers have a home.
3. Cross-skill boundary: SPEC-87 §8 owns the data path (parsed body → summary inputs); SPEC-89 §7 owns the field rendering. This ticket implements the SPEC-89 side of that contract; it does NOT modify SPEC-87's `tools/story-explorer/src/read/record-card.ts` (which is the data-path source-of-truth). The fallback chain (1) explicit title/label/name/objective/claim, (2) first meaningful string, (3) record ID + class, (4) `"Untitled <CLASS> record"` is implemented by SPEC-87's `record-card.ts`; the renderers here consume the already-populated fallback result.
4. FOUNDATIONS principle restatement: §Story Bundles §5 (Validation Rules at Story Scope) and §5b (Schema-Minimalism) require every story-bundle record schema field to be load-bearing — directly consumed by a validation gate, replay primitive, predicate, fork operation, or recorded audit-trail discipline. The compact-card field selection per class (per SPEC-89 §7's table) mirrors the load-bearing fields the schemas require; no decorative-only fields render in compact view. §Story Bundles §6.1 (Story-Local Character Authority) requires STCHAR to render its story-local authority (not a CHAR substitute); the STCHAR row in §7's table explicitly names STENT binding and source-CHAR provenance as compact-card fields.

## Architecture Check

1. Single-module class dispatch (one file with a switch on `recordCard.recordClass`) keeps the 22-class rendering reviewable in one place. The alternative (22 per-class files) would spread the renderer surface across more files for marginal modularity gain; the renderers are small (10-15 lines each on average) and read better grouped.
2. No backwards-compatibility aliasing or shims — modifies the stub created in SPEC89STOEXPSTA-002 in place; no legacy code path retained.

## Verification Layers

1. Each of the 22 classes renders its compact line correctly given a sample fixture → render test per class → vitest + RTL with fixtures generated from real `tools/story-explorer/src/read/record-card.ts` outputs.
2. The fallback chain ((1) explicit, (2) first-meaningful, (3) id+class, (4) Untitled) renders predictably when fields are missing → test with progressively-sparse fixtures.
3. Memoization caches per recordCard ID + content-hash → test that re-rendering the same recordCard does not re-compute the JSX (assert by tracking render-counter via React.memo or useMemo).
4. FOUNDATIONS alignment: §Story Bundles §5 + §5b + §6.1 — the rendered fields for each class are exactly those the schema declares load-bearing → grep-proof against `tools/validators/src/schemas/story-<class>.schema.json` for each class.

## What to Change

### 1. Modify `RecordCardRenderers.tsx`

Replace the stub-fallback dispatch with the full 22-class dispatch. For each class, render the §7-prescribed compact line:

- **STENT**: `{id} · {entity label/name} · world-bound {world_ent_id} · STCHAR {bound STCHAR id} · {status tags} · created at {created_at_page}`
- **STCHAR**: `{id} · {character name/title} · STENT {bound STENT ids} · CHAR {source CHAR if any} · {supersession status} · {regeneration reason}`
- **STSTAT**: `{id} · {entity} · {status_label/value} · {severity}/{visibility} · created at {created_at_page} · supersedes {supersedes}`
- **BEL**: `{id} · holder {holder} · "{claim}" · {belief_mode} · {truth_relation} · {confidence} · {visibility} · basis {source event}`
- **SF**: `{id} · "{statement/claim}" · {authority} · derived-from {derived_from} · created at {created_at_page}`
- **SE**: `{id} · {event_kind} · {actor} → {targets} · {outcome_route} · SLT {selected_slt_id} · Δ {create} / {supersede} / {close}`
- **CHC**: `{id} · "{surface_label}" · {player_visible_intent} · created at {created_at_page} · pressure {likely_state_pressure} · grounded-in {count} · child-outcomes {count}`
- **OBL**: `{id} · {owed_by} → {owed_to} · "{description}" · {status} · {urgency}`
- **CNSQ**: `{id} · "{description}" · {status} · {urgency} · derived-from {derived_from}`
- **THR**: `{id} · "{title}" · {status} · {pressure} · obligations {count} · derived-from {derived_from}`
- **SREL**: `{id} · {participants} · {relationship_kind} · {polarity}/{intensity} · {status} · derived-from {derived_from}`
- **STINT**: `{id} · holder {holder} · "{objective}" · {status} · {urgency} · supersedes {supersedes}`
- **STLOC**: `{id} · "{location_name}" · {current_scene_role} · {access_notes} · created at {created_at_page}`
- **STOBJ**: `{id} · "{object_name}" · holder {holder}/location {location} · {affordance} · {status} · created at {created_at_page}`
- **DA**: `{id} · "{title}" · {artifact_type} · holder/location/author · {maturity} · sources {source_records}`
- **CLK**: `{id} · "{clock_name}" · {current_value}/{threshold} · driver {driver} · {status} · last-tick {last_tick_event}`
- **STSEC**: `{id} · "{secret_label}" · holders {holders} · {visibility}/{revealed_status} · clue-count {count} · protects {protected_mystery_refs}`
- **STQ**: `{id} · "{question_text}" · {status} · sources {source_records} · answer {payoff_records} · {urgency}`
- **STPLAN**: `{id} · holder {holder} · "{objective}" · step "{current_step}" · root {root_intention} · {status} · blockers {blockers} · success "{success_condition}" · supersedes {supersedes}`
- **STEMO**: `{id} · holder {holder} · {affect_kind}/{appraisal} · intensity {intensity} · toward {orientation} · trigger {trigger_event} · supersedes {supersedes}`
- **BR**: `{id} · "{label}" · parent {parent_branch_id} · forked at {forked_at_page_id} · root {root_page_id} · created at {created_at_page} · leaf {current_leaf if derivable}`
- **SLT**: `{id} · {move_family} · scope {scope.visibility} · branch {scope.branch_id} · saliency {saliency.urgency} · drivers {compatible_turn_drivers} · preconds {precondition_count} · effects {effect_count}`

Each renderer pulls its inputs from the already-populated `recordCard` view-model (per SPEC-87 §8); the renderers do NOT re-parse the underlying record body.

### 2. Add memoization

Wrap the dispatch function with `useMemo` keyed on `recordCard.recordId + recordCard.contentHash` so the rendered JSX is cached per session (per SPEC-89 §10 "Deterministic summaries are memoized in-memory per session"). When the same recordCard re-renders (same hash), the cached JSX is returned without re-computing.

### 3. Add `__tests__/RecordCardRenderers.test.tsx`

Per-class render tests with fixtures for each of the 22 classes. Verify the rendered compact line contains the expected field text + fallback behavior for sparse fixtures.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (modify — replace stub with 22-class dispatch + memoization)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` (new)

## Out of Scope

- Modifying the backend's `RecordCard` view-model shape or `tools/story-explorer/src/read/record-card.ts` — that's SPEC-87's data-path surface, not SPEC-89's.
- Per-class expanded-view field rendering beyond the compact line (SPEC89STOEXPSTA-002's RecordCardExpanded handles deterministic grouping; per-class expanded fields are out of scope for this ticket).
- Hybrid-record section parsing for STCHAR/DA expanded view (SPEC89STOEXPSTA-010).
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- RecordCardRenderers.test` — all 22 classes render their expected compact lines from fixtures.
2. `cd tools/story-explorer/web && npm test -- RecordCardRenderers.test` — fallback chain renders predictably with progressively-sparse fixtures.
3. `cd tools/story-explorer && npm run build` — build succeeds; renderers compile.

### Invariants

1. The compact-line text is fully determined by the `recordCard` view-model; renderers NEVER fabricate text not present in the record (the no-LLM-summaries v1 rule per Named Assumption + SPEC-89 §7).
2. Memoization cache key uses `recordId + contentHash`; a record whose content changed (different hash) re-renders correctly.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` — per-class fixture-driven render tests.

### Commands

1. `cd tools/story-explorer/web && npm test -- RecordCardRenderers.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.
