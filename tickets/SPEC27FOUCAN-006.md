# SPEC27FOUCAN-006: Canon Baseline Drift §4b + phantom-feature correction

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Story Bundles §4b), `.claude/skills/_shared-templates/story-state-contract.md` (§4.2 PG schema), `tools/validators/src/schemas/story-page.schema.json`, `.claude/skills/branching-story-turn-cycle`, `.claude/skills/branching-story-health-audit`, `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/validators/src/_helpers/state-snapshot-replay.ts` (latent infrastructure assessment).
**Deps**: None

## Problem

`docs/CONTEXT-PACKET-CONTRACT.md` describes the `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` context-packet profiles delivering a `change_log_entry` node "so the page can persist `state_snapshot.canon_revision`" and "so Phase 4 can compare the bundle's `canon_revision` baseline against recent canon movement" — but the consuming side does not exist: `state_snapshot.canon_revision` is not in the PG schema, no story-pipeline skill reads or writes it, and `branching-story-health-audit` has no canon-drift sub-phase. The retrieval doc describes a phantom feature. Separately, world canon can change after a story page is committed, and nothing detects or classifies that drift.

## Assumption Reassessment (2026-05-14)

1. `state_snapshot.canon_revision` is absent from the PG schema (`story-state-contract.md` §4.2 and `tools/validators/src/schemas/story-page.schema.json`); no story-pipeline skill reads or writes it; `tools/validators/src/_helpers/state-snapshot-replay.ts` carries latent `applyCanonSync` / `canon_revision` handling that is unwired to any current schema or skill. No new patch-engine op is needed — `canon_revision` is a field within `state_snapshot` on the existing `create_pg_record` op (`tools/patch-engine/src/ops/create-story-record.ts`). Confirmed via the SPEC-27 brainstorm verification pass and the SPEC-27 spec-to-tickets D6 parity scan.
2. `docs/CONTEXT-PACKET-CONTRACT.md` (the `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` profile sections) describes the `canon_revision` mechanism as if it exists — the phantom-feature doc-correctness bug the spec's D6 requires correcting regardless of the full mechanism's fate.
3. Shared boundary under audit: the `PG.state_snapshot` schema (canonically `story-state-contract.md` §4.2, enforced by `tools/validators/src/schemas/story-page.schema.json`) — produced by `branching-story-bootstrap` + `branching-story-turn-cycle` and consumed by every state-changing story skill at hard-gate validation. Adding `canon_revision` touches the contract, the JSON schema, and the producing/consuming skills.
4. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons) at story scope — D6 forbids story-pipeline skills from silently treating stale story-local assumptions as world-valid after a conflicting canon revision. The new §4b is a FOUNDATIONS-level rule.
5. Enforcement surface touched: the `PG.state_snapshot` schema + `branching-story-turn-cycle` (persist at commit; classify drift at turn-start) + `branching-story-health-audit` (drift sub-phase). The change adds a baseline-comparison gate; it does not weaken the Mystery Reserve firewall and does not retroactively mutate committed records.
6. Schema extended: `PG.state_snapshot` gains `canon_revision`. Consumers: every state-changing story skill that reads `state_snapshot` at hard-gate validation, plus `tools/validators/src/_helpers/state-snapshot-replay.ts`. The extension is additive (a new field); the spec's §Verification treats verification as contract-and-prose conformance because zero production story bundles exist.

## Architecture Check

1. Recording the loaded canon revision at page-plan commit and classifying drift at turn-start is cleaner than the status quo, where the retrieval doc claims a mechanism the schema and skills never implemented — D6 makes the consuming side real and reconciles the doc. Classifying drift (`compatible` / `grandfathered` / `requires_health_audit` / `requires_repair_turn` / `promotion_or_retcon_conflict`) rather than silently extending stale assumptions preserves Rule 6 at story scope.
2. No backwards-compatibility aliasing — `canon_revision` is a net-new additive `state_snapshot` field; the latent `state-snapshot-replay.ts` infrastructure is either wired to the now-real field or removed (the ticket assesses and chooses), not left as a dead alias.

## Verification Layers

1. `state_snapshot.canon_revision` is present in `story-state-contract.md` §4.2 and `story-page.schema.json`, and `branching-story-turn-cycle` persists it at page-plan commit -> schema validation + skill dry-run.
2. `branching-story-turn-cycle` classifies drift at turn-start against the parent page's `canon_revision`; `branching-story-health-audit` has a canon-drift structural sub-phase -> skill dry-run.
3. `docs/CONTEXT-PACKET-CONTRACT.md` describes only the now-real mechanism (no phantom) -> manual review against the implemented schema + skills.
4. `docs/FOUNDATIONS.md` §Story Bundles §4b carries the Canon Baseline Drift rule -> FOUNDATIONS alignment check.
5. The latent `state-snapshot-replay.ts` infrastructure is either wired to the real field or removed — no dead `canon_revision` handler remains -> codebase grep-proof.

## What to Change

### 1. FOUNDATIONS §Story Bundles §4b — Canon Baseline Drift

- In `docs/FOUNDATIONS.md` §Story Bundles, add §4b "Canon Baseline Drift": a committed story page is evaluated against the world-canon revision it loaded at page-plan commit; later world-canon changes do not silently rewrite committed records; a new turn must compare the parent page's recorded baseline against current canon and classify drift as `compatible` / `grandfathered` / `requires_health_audit` / `requires_repair_turn` / `promotion_or_retcon_conflict`; no story-pipeline skill may silently treat stale story-local assumptions as world-valid.

### 2. PG schema — `state_snapshot.canon_revision`

- Add `canon_revision` to `state_snapshot` in `.claude/skills/_shared-templates/story-state-contract.md` §4.2 and in `tools/validators/src/schemas/story-page.schema.json`, with identical field semantics in both.

### 3. turn-cycle — persist + classify

- In `.claude/skills/branching-story-turn-cycle/SKILL.md`: persist the loaded `canon_revision` baseline at page-plan commit; at turn-start, compare the parent page's `canon_revision` against current world canon and run the five-value drift classification.

### 4. health-audit — canon-drift sub-phase

- In `.claude/skills/branching-story-health-audit/SKILL.md`, add a canon-drift structural sub-phase that evaluates the bundle's baseline against recent canon movement.

### 5. CONTEXT-PACKET-CONTRACT.md — phantom-feature correction

- Reconcile the `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` profile sections of `docs/CONTEXT-PACKET-CONTRACT.md` so the retrieval-side description matches the now-real consuming side.

### 6. Latent infrastructure assessment

- Assess `tools/validators/src/_helpers/state-snapshot-replay.ts`'s latent `applyCanonSync` / `canon_revision` handling: wire it to the now-real `state_snapshot.canon_revision` field, or remove it if the implemented drift mechanism does not use it. Do not leave it as dead unwired code.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — wire-up or removal per the assessment)

## Out of Scope

- Adding a new patch-engine op — `canon_revision` is a field within `state_snapshot` on the existing `create_pg_record`.
- Retroactively mutating any committed `PG` / `SE` / `SF` / `BEL` / `OBL` / `CNSQ` / `THR` record — §4b explicitly forbids silent rewrites of committed pages.
- Splitting D6 into a follow-up spec — spec §Risks names this as an option; this ticket implements D6 whole. If review finds the diff disproportionate, the reviewer may request a write-path/read-path split at that point.

## Acceptance Criteria

### Tests That Must Pass

1. A PG fixture with `state_snapshot.canon_revision` passes `story-page.schema.json` validation; the field is documented in `story-state-contract.md` §4.2.
2. A `branching-story-turn-cycle` dry-run persists `canon_revision` at commit and classifies drift at turn-start with one of the five drift values.
3. A `branching-story-health-audit` dry-run runs the canon-drift sub-phase.
4. `grep -rn "canon_revision" docs/CONTEXT-PACKET-CONTRACT.md` descriptions resolve against the implemented schema (no phantom-feature prose); `grep -rn "canon_revision\|applyCanonSync" tools/validators/src/_helpers/state-snapshot-replay.ts` shows the handler wired or removed, not dead.

### Invariants

1. `state_snapshot.canon_revision` is identical in `story-state-contract.md` §4.2 and `tools/validators/src/schemas/story-page.schema.json`.
2. No committed story-bundle record is retroactively mutated by drift detection.
3. `docs/CONTEXT-PACKET-CONTRACT.md` describes no `canon_revision` mechanism that the schema and skills do not implement.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/` — add or extend a `story-page.schema.json` fixture exercising `state_snapshot.canon_revision`.
2. `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` — update to match the wired-up or removed `canon_revision` handling.

### Commands

1. `cd tools/validators && npm test`
2. `grep -rn "canon_revision" docs/CONTEXT-PACKET-CONTRACT.md .claude/skills/_shared-templates/story-state-contract.md tools/validators/src/schemas/story-page.schema.json`
3. `grep -rn "Canon Baseline Drift" docs/FOUNDATIONS.md` — confirm the §4b subsection.
