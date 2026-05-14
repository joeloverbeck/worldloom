# SPEC27FOUCAN-006: Canon Baseline Drift §4b + phantom-feature correction

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Story Bundles §4b), `.claude/skills/_shared-templates/story-state-contract.md` (§4.2 PG schema), `tools/validators/src/schemas/story-page.schema.json`, `.claude/skills/branching-story-turn-cycle`, `.claude/skills/branching-story-health-audit`, `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/validators/src/_helpers/state-snapshot-replay.ts` (wired to real field), `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (implementation note), and focused validator tests.
**Deps**: None

## Problem

At intake, `docs/CONTEXT-PACKET-CONTRACT.md` described the `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` context-packet profiles delivering a `change_log_entry` node "so the page can persist `state_snapshot.canon_revision`" and "so Phase 4 can compare the bundle's `canon_revision` baseline against recent canon movement" — but the consuming side did not exist: `state_snapshot.canon_revision` was not in the PG schema, no story-pipeline skill read or wrote it, and `branching-story-health-audit` had no canon-drift sub-phase. The retrieval doc described a phantom feature. Separately, world canon could change after a story page was committed, and nothing detected or classified that drift.

## Assumption Reassessment (2026-05-14)

1. At intake, `state_snapshot.canon_revision` was absent from the PG schema (`story-state-contract.md` §4.2 and `tools/validators/src/schemas/story-page.schema.json`); no story-pipeline skill read or wrote it; `tools/validators/src/_helpers/state-snapshot-replay.ts` carried latent `applyCanonSync` / `canon_revision` handling that was unwired to any current schema or skill. No new patch-engine op was needed — `canon_revision` is a field within `state_snapshot` on the existing `create_pg_record` op (`tools/patch-engine/src/ops/create-story-record.ts`). Confirmed via the SPEC-27 brainstorm verification pass and the SPEC-27 spec-to-tickets D6 parity scan.
2. At intake, `docs/CONTEXT-PACKET-CONTRACT.md` (the `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` profile sections) described the `canon_revision` mechanism as if it existed — the phantom-feature doc-correctness bug the spec's D6 required correcting regardless of the full mechanism's fate.
3. Shared boundary under audit: the `PG.state_snapshot` schema (canonically `story-state-contract.md` §4.2, enforced by `tools/validators/src/schemas/story-page.schema.json`) — produced by `branching-story-bootstrap` + `branching-story-turn-cycle` and consumed by every state-changing story skill at hard-gate validation. Adding `canon_revision` touches the contract, the JSON schema, and the producing/consuming skills.
4. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons) at story scope — D6 forbids story-pipeline skills from silently treating stale story-local assumptions as world-valid after a conflicting canon revision. The new §4b is a FOUNDATIONS-level rule.
5. Enforcement surface touched: the `PG.state_snapshot` schema + `branching-story-turn-cycle` (persist at commit; classify drift at turn-start) + `branching-story-health-audit` (drift sub-phase). The change adds a baseline-comparison gate; it does not weaken the Mystery Reserve firewall and does not retroactively mutate committed records.
6. Schema extended: `PG.state_snapshot` gained `canon_revision`. Consumers updated in this ticket: `branching-story-turn-cycle` as producer/turn-start classifier, `branching-story-health-audit` as audit classifier, the shared hard-gate contract, `docs/CONTEXT-PACKET-CONTRACT.md`, and `tools/validators/src/_helpers/state-snapshot-replay.ts`. The extension is additive (a new field); the spec's §Verification treats verification as contract-and-prose conformance because zero production story bundles exist.
7. Reassessment correction: no executable story-skill dry-run runner is available in this Codex context, so the proof surface was narrowed to package schema/helper tests plus manual contract review and grep proof over the edited skills/docs.
8. Explicit reference sync: `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` now carries a 2026-05-15 implementation note for D6; the remaining D6 body is historical intake context.

## Architecture Check

1. Recording the loaded canon revision at page-plan commit and classifying drift at turn-start is cleaner than the status quo, where the retrieval doc claims a mechanism the schema and skills never implemented — D6 makes the consuming side real and reconciles the doc. Classifying drift (`compatible` / `grandfathered` / `requires_health_audit` / `requires_repair_turn` / `promotion_or_retcon_conflict`) rather than silently extending stale assumptions preserves Rule 6 at story scope.
2. No backwards-compatibility aliasing — `canon_revision` is a net-new additive `state_snapshot` field; the latent `state-snapshot-replay.ts` infrastructure is wired to the now-real field and covered by focused replay tests, not left as a dead alias.

## Verification Layers

1. `state_snapshot.canon_revision` is present in `story-state-contract.md` §4.2 and `story-page.schema.json`, and `branching-story-turn-cycle` persists it at page-plan commit -> schema validation + manual contract review.
2. `branching-story-turn-cycle` classifies drift at turn-start against the parent page's `canon_revision`; `branching-story-health-audit` has a canon-drift structural sub-phase -> manual contract review + grep proof. The current repo has no executable skill dry-run runner in this Codex context.
3. `docs/CONTEXT-PACKET-CONTRACT.md` describes only the now-real mechanism (no phantom) -> manual review against the implemented schema + skills.
4. `docs/FOUNDATIONS.md` §Story Bundles §4b carries the Canon Baseline Drift rule -> FOUNDATIONS alignment check.
5. The latent `state-snapshot-replay.ts` infrastructure is wired to the real field — no dead `canon_revision` handler remains -> codebase grep-proof.

## Landed Changes

### 1. FOUNDATIONS §Story Bundles §4b — Canon Baseline Drift

- `docs/FOUNDATIONS.md` §Story Bundles now has §4b "Canon Baseline Drift": a committed story page is evaluated against the world-canon revision it loaded at page-plan commit; later world-canon changes do not silently rewrite committed records; a new turn must compare the parent page's recorded baseline against current canon and classify drift as `compatible` / `grandfathered` / `requires_health_audit` / `requires_repair_turn` / `promotion_or_retcon_conflict`; no story-pipeline skill may silently treat stale story-local assumptions as world-valid.

### 2. PG schema — `state_snapshot.canon_revision`

- Added `canon_revision` to `state_snapshot` in `.claude/skills/_shared-templates/story-state-contract.md` §4.2 and in `tools/validators/src/schemas/story-page.schema.json`, with matching `CH-<integer> | null` semantics.

### 3. turn-cycle — persist + classify

- `.claude/skills/branching-story-turn-cycle/SKILL.md` now persists the loaded `canon_revision` baseline at page-plan commit; at turn-start, it compares the parent page's `canon_revision` against current world canon and runs the five-value drift classification.

### 4. health-audit — canon-drift sub-phase

- `.claude/skills/branching-story-health-audit/SKILL.md` now has Phase 2h, a canon-drift structural sub-phase that evaluates page baselines against recent canon movement.

### 5. CONTEXT-PACKET-CONTRACT.md — phantom-feature correction

- Reconciled the `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` profile sections of `docs/CONTEXT-PACKET-CONTRACT.md` so the retrieval-side description matches the now-real consuming side.

### 6. Latent infrastructure assessment

- Assessed `tools/validators/src/_helpers/state-snapshot-replay.ts`'s latent `applyCanonSync` / `canon_revision` handling and kept it as the now-wired replay helper for the real `state_snapshot.canon_revision` field, with focused test coverage for `canon_revision` and `change_id` payloads.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — wired to real `state_snapshot.canon_revision` field)
- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (modify — dated D6 implementation note)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify)
- `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (modify)

## Out of Scope

- Adding a new patch-engine op — `canon_revision` is a field within `state_snapshot` on the existing `create_pg_record`.
- Retroactively mutating any committed `PG` / `SE` / `SF` / `BEL` / `OBL` / `CNSQ` / `THR` record — §4b explicitly forbids silent rewrites of committed pages.
- Splitting D6 into a follow-up spec — spec §Risks named this as an option, but this ticket implements D6 whole.

## Acceptance Criteria

### Tests That Must Pass

1. A PG fixture with `state_snapshot.canon_revision` passes `story-page.schema.json` validation; the field is documented in `story-state-contract.md` §4.2.
2. Manual review and grep proof show `branching-story-turn-cycle` persists `canon_revision` at commit and classifies drift at turn-start with one of the five drift values.
3. Manual review and grep proof show `branching-story-health-audit` runs the canon-drift sub-phase.
4. `grep -rn "canon_revision" docs/CONTEXT-PACKET-CONTRACT.md` descriptions resolve against the implemented schema (no phantom-feature prose); `grep -rn "canon_revision\|applyCanonSync" tools/validators/src/_helpers/state-snapshot-replay.ts` shows the handler wired to the real field, not dead.

### Invariants

1. `state_snapshot.canon_revision` is identical in `story-state-contract.md` §4.2 and `tools/validators/src/schemas/story-page.schema.json`.
2. No committed story-bundle record is retroactively mutated by drift detection.
3. `docs/CONTEXT-PACKET-CONTRACT.md` describes no `canon_revision` mechanism that the schema and skills do not implement.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — extended a `story-page.schema.json` fixture exercising valid and invalid `state_snapshot.canon_revision`.
2. `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` — added `change_id` fallback coverage for wired `canon_revision` replay handling.

### Commands

1. `cd tools/validators && npm test`
2. `rg -n "canon_revision|Canon Baseline Drift|canon_baseline|Phase 2h|applyCanonSync" archive/tickets/SPEC27FOUCAN-006.md specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md docs/FOUNDATIONS.md docs/CONTEXT-PACKET-CONTRACT.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md tools/validators/src/schemas/story-page.schema.json tools/validators/src/_helpers/state-snapshot-replay.ts tools/validators/tests/structural/record-schema-compliance-story-page.test.ts tools/validators/tests/_helpers/state-snapshot-replay.test.ts`
3. `grep -rn "Canon Baseline Drift" docs/FOUNDATIONS.md` — confirm the §4b subsection.

## Outcome

Implemented SPEC-27 D6 across the contract and consumer surfaces. `docs/FOUNDATIONS.md` now defines Canon Baseline Drift §4b; the shared PG schema and JSON Schema expose `state_snapshot.canon_revision`; turn-cycle persists and classifies the baseline; health-audit has Phase 2h drift classification; context-packet docs now describe the real consuming side; the replay helper is wired to the real field; and focused validator tests cover the schema and replay behavior.

## Verification Result

1. `cd tools/validators && npm test` — PASS, 217 tests. This covered TypeScript build, `record_schema_compliance` schema compilation, the new PG `canon_revision` valid/rejection fixture coverage, the `state-snapshot-replay` `canon_sync` coverage, and the broader validators package lane.
2. `rg -n "canon_revision|Canon Baseline Drift|canon_baseline|Phase 2h|applyCanonSync" ...` — PASS by manual review. Hits are in the active ticket, SPEC-27 dated implementation note / historical D6 intake, FOUNDATIONS §4b, context-packet profiles, shared contract/schema, turn-cycle, health-audit Phase 2h, replay helper, and focused tests.
3. `grep -rn "Canon Baseline Drift" docs/FOUNDATIONS.md` — satisfied by `docs/FOUNDATIONS.md` §4b and same-seam skill/spec/ticket references.

## Deviations

The drafted skill dry-run proof was replaced with manual contract review plus grep proof because this repo exposes no executable story-skill dry-run runner in the current Codex context. `state_snapshot.canon_revision` is schema-declared as `CH-<integer> | null`; `null` remains lawful only when no change-log entry exists. No new patch-engine op was added.

## Post-Ticket Review Blocker (2026-05-15)

Resolved in follow-up implementation. Review confirmed the main D6 contract is present, and `.claude/skills/branching-story-turn-cycle/SKILL.md` now says `Plus 7 turn-cycle-additional checks` while listing seven checks, including `Canon Baseline Drift`.
