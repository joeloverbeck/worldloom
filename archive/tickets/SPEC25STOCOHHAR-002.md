# SPEC25STOCOHHAR-002: STSTAT replay enforcement

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/_helpers/state-snapshot-replay.ts`, `tools/validators/src/structural/snapshot-replay-equality.ts`, `tools/validators/src/structural/state-snapshot-integrity.ts`, `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`; amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.2, §5) and `specs/SPEC-25-story-coherence-hardening.md`.
**Deps**: archive/tickets/SPEC25STOCOHHAR-001.md

## Problem

At intake, with the `STSTAT` record class landed (SPEC25STOCOHHAR-001), `entity_status` could become a replayable derived projection instead of an independently-authored block. `snapshot-replay-equality.ts` `runNewSchemaReplay` excluded `entity_status` from replay comparison because it was "not reconstructible from state_delta alone," so a death / captivity / movement mismatch across a page boundary or a fork was uncaught. Separately, the `entity_status` predicate named its axis argument `axis` in the grammar but `field` in contract §5 — a latent inconsistency SPEC-25 D1 directed this work to reconcile.

## Assumption Reassessment (2026-05-14)

1. At intake, `tools/validators/src/structural/snapshot-replay-equality.ts` `runNewSchemaReplay` carried a comment stating `entity_status` (with `visible_affordances`, `unresolved_mystery_claims`, `continuation`) was "not reconstructible from state_delta alone and ... intentionally not compared here." `tools/validators/src/_helpers/state-snapshot-replay.ts` `ACTIVE_RECORDS_CLASSES` listed `STENT, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA` — no `STSTAT`.
2. SPEC-25 D1 prescribes: §4.2 redefine `entity_status` as a derived projection of active `STSTAT` (one entry per active `STENT`) and add `STSTAT` to `active_records`; §5 reconcile the `entity_status` predicate argument name. Verified: contract §5 line 578 already reads `entity_status(STENT-<integer>, field, value)` with "`field` is one of `life | agency | location`"; the grammar uses `axis` (`predicate-dsl-grammar.ts:82`). The contract is already correct — the reconcile is a grammar-side rename to match it.
3. Cross-artifact boundary under audit: the replay contract — `SE.state_delta` → `PG.state_snapshot.active_records` (now including `STSTAT` after SPEC25STOCOHHAR-001) → derived `entity_status` projection — spanning contract §4.2 / §4.3 ↔ `state-snapshot-replay.ts` ↔ `snapshot-replay-equality.ts`. Plus the predicate-DSL grammar surface (`predicate-dsl-grammar.ts`) shared with SPEC25STOCOHHAR-006.
4. FOUNDATIONS Rule 1 (No Floating Facts) + §Story Bundles §4a (Plan-Authority Boundary): restated before trusting the spec — the page snapshot is the fork primitive, and any committed page must be a valid replayable parent. Making `entity_status` replay-checked *strengthens* the fork primitive; it adds no second state engine and no `ARC_TRACE`-style parallel pass.
5. Rename / removal blast radius (FOUNDATIONS-aligned enforcement surface — the predicate grammar): the `axis`→`field` rename targets **only the `entity_status` predicate's argument**. The `relationship_axis` predicate also uses `axis` (`predicate-dsl-grammar.ts:83`, parser line 192) and the `SREL` record schema has its own `axis` field (contract line 446) — neither is touched. Blast radius for the `entity_status` rename: `predicate-dsl-grammar.ts:82` (`PREDICATE_ARG_SCHEMAS.entity_status.required`), `rule_storylet_predicate_dsl_parsability.ts:186` (`value.axis` read + the `${path}.axis` error-path string), contract §5 line 578 (already `field`). The `ENTITY_STATUS_AXES` constant in the parser names the *value* set (`life`/`agency`/`location`), not the argument — it is unchanged. Skill prose listing `entity_status(` as a literal (e.g. `branching-story-prose-attach` SKILL.md:173) names the predicate, not the argument — no change required.
6. Adjacent contradiction classification: the legacy-schema replay path (pre-`input.resolved_event_id` pages) must remain untouched, per SPEC-25 §Verification ("The legacy-schema replay path ... is untouched"). This is a required-scope boundary of this ticket, not a separate bug.
7. Required same-seam fallout found during implementation: `state-snapshot-integrity.ts` had a closed story-local ID regex that omitted `STSTAT`, and contract §5 / `record_active(<record_id>)` omitted `STSTAT` despite `STSTAT` becoming an active-record class. This ticket absorbs those validator/contract edits so active `STSTAT` references get the same dangling-reference and predicate coverage as the rest of `PG.state_snapshot.active_records`.

## Architecture Check

1. Deriving `entity_status` from the replayed active `STSTAT` set — rather than comparing an independently-authored block — makes it symmetric with `active_records`: both become projections of the replayed record set. The "intentionally not compared" exclusion shrinks to only genuinely page-local fields (`visible_affordances`, `unresolved_mystery_claims`, `continuation`).
2. No shims: the rename picks one canonical argument name (`field`, matching the contract) and aligns the grammar to it — no alias accepting both `axis` and `field`, no compatibility shim.

## Verification Layers

1. A child page whose `entity_status` mismatches the `STSTAT`-derived projection fails replay -> validator test: a constructed two-page entity-death fixture.
2. A correct child page passes replay -> validator test: the same fixture with a matching `entity_status`.
3. The legacy-schema replay path is unaffected -> codebase grep-proof + existing test: pre-`resolved_event_id` pages still route through the legacy branch and `snapshot-replay-equality.test.ts`'s legacy cases still pass.
4. The `entity_status` predicate argument is consistent contract ↔ grammar ↔ parser -> codebase grep-proof: `entity_status` uses `field` in all three; `relationship_axis` still uses `axis`.

## Landed Changes

### 1. Contract §4.2 — entity_status as derived projection

Redefined `PG.state_snapshot.entity_status` as a derived projection of active `STSTAT` records (one entry per active `STENT`, computed from that entity's current `STSTAT`), not an independently-authored block. Added `STSTAT` to `PG.state_snapshot.active_records`.

### 2. Contract §5 — entity_status predicate argument

Confirmed §5 uses `field` and added that `entity_status(STENT-<integer>, field, value)` resolves against active `STSTAT` records.

### 3. ACTIVE_RECORDS_CLASSES

Added `"STSTAT"` to `ACTIVE_RECORDS_CLASSES` in `tools/validators/src/_helpers/state-snapshot-replay.ts`.

### 4. snapshot-replay-equality runNewSchemaReplay

In `runNewSchemaReplay`, derived the expected `entity_status` from the replayed active `STSTAT` set and compared it against the page's `entity_status` block. Removed `entity_status` from the "intentionally not compared" exclusion and kept `visible_affordances` / `unresolved_mystery_claims` / `continuation` excluded as genuinely page-local.

### 5. Predicate grammar + parser rename

Changed `entity_status` required args from `["entity", "axis", "value"]` to `["entity", "field", "value"]`; the parser now reads `value.field` and reports `${path}.field`. `relationship_axis` and the `ENTITY_STATUS_AXES` value-set constant are unchanged.

### 6. Active-record reference fallout

Added `STSTAT` to the state-snapshot-integrity story-local ID regex and to the `record_active(<record_id>)` predicate's accepted active-record classes.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.2, §5)
- `specs/SPEC-25-story-coherence-hardening.md` (modify — implementation note for completed D1 validator/contract slice)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — `ACTIVE_RECORDS_CLASSES`)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — `runNewSchemaReplay`)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — story-local ID coverage for active `STSTAT`)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — `PREDICATE_ARG_SCHEMAS.entity_status`)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — `entity_status` arg parse)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify — `field` predicate fixture)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — STSTAT-backed replay pass/fail cases)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — `field` positive / `axis` rejection / `record_active(STSTAT)` coverage)

## Out of Scope

- The STSTAT machine layer (schema, allocator, patch-engine op, MCP node-type) — archive/tickets/SPEC25STOCOHHAR-001.md.
- Story-pipeline skills emitting / reading STSTAT — SPEC25STOCOHHAR-003.
- The six new D4 existential predicates — SPEC25STOCOHHAR-006.
- The `relationship_axis` predicate or the `SREL.axis` record field — explicitly not renamed.
- The legacy-schema replay path (pre-`input.resolved_event_id` pages).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — a two-page fixture where an entity dies on the parent page: replay *fails* a child page whose `entity_status` does not match the `STSTAT`-derived projection, and *passes* a correct child page.
2. `cd tools/validators && npm test` — the predicate-DSL parsability suite accepts `entity_status` with a `field` argument and rejects it with an `axis` argument.
3. `cd tools/validators && npm test` — full suite green, including the legacy-schema `snapshot-replay-equality` cases (unchanged).

### Invariants

1. `entity_status` is a derived projection of the replayed active `STSTAT` set, never independently authored — the only un-replayed `PG.state_snapshot` fields are `visible_affordances`, `unresolved_mystery_claims`, `continuation`.
2. The `entity_status` predicate argument is named `field` consistently across contract §5, `predicate-dsl-grammar.ts`, and `rule_storylet_predicate_dsl_parsability.ts`; `relationship_axis` is unaffected.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify) — added the two-page entity-death fixture with both a pass case (`entity_status` matches the STSTAT projection) and a fail case (mismatch).
2. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify) — confirmed `entity_status` parses with `field`, rejects legacy `axis`, and accepts `record_active(STSTAT-...)`.
3. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify) — updated the indexed CLI fixture to the `field` predicate argument.

### Commands

1. `cd tools/validators && npm test`
2. `grep -nE "entity_status|relationship_axis" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — confirms `entity_status` uses `field`, `relationship_axis` still uses `axis`.
3. A package-scoped `npm test` is the correct boundary — the replay helper, replay validator, state-snapshot integrity validator, grammar, parser, and focused tests all live in `tools/validators`, and the contract edit is verified by the same suite round-tripping STSTAT-backed fixtures.

## Outcome

Completed on 2026-05-14. `STSTAT` is now part of the replayed active-record class set; new-schema page replay derives `entity_status` from active `STSTAT` records and reports field-level drift when a page snapshot disagrees. The predicate DSL now uses `entity_status(..., field, value)` consistently, and `record_active` / state-snapshot reference validation include active `STSTAT` ids.

## Verification Result

- PASS: `cd tools/validators && npm test` (195 tests; rebuilds first via package script).
- PASS: package suite includes the new `snapshot_replay_equality` STSTAT-derived `entity_status` pass/fail cases, the `entity_status` `field` acceptance / legacy `axis` rejection cases, and the unchanged legacy-schema replay cases.
- PASS: `grep -nE "entity_status|relationship_axis" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` shows `entity_status` requires `field` while `relationship_axis` still requires `axis`.
- PASS: `git diff --check`.

## Deviations

- Same-seam active-record reference fallout was absorbed: `state-snapshot-integrity.ts` and `record_active(<record_id>)` now include `STSTAT`, because adding `STSTAT` to `PG.state_snapshot.active_records` would otherwise leave active status references under-covered.
- Verification used `npm test` from `tools/validators`; that package script runs `npm run build` before `node --test dist/tests/**/*.test.js`, so it is the same package-local build-plus-test boundary as the drafted command.
