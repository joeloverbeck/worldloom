# SPEC25STOCOHHAR-002: STSTAT replay enforcement

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/_helpers/state-snapshot-replay.ts`, `tools/validators/src/structural/snapshot-replay-equality.ts`, `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`; amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.2, §5).
**Deps**: archive/tickets/SPEC25STOCOHHAR-001.md

## Problem

With the `STSTAT` record class landed (SPEC25STOCOHHAR-001), `entity_status` can become a replayable derived projection instead of an independently-authored block. Today `snapshot-replay-equality.ts` `runNewSchemaReplay` excludes `entity_status` from replay comparison because it is "not reconstructible from state_delta alone," so a death / captivity / movement mismatch across a page boundary or a fork is uncaught. Separately, the `entity_status` predicate names its axis argument `axis` in the grammar but `field` in contract §5 — a latent inconsistency SPEC-25 D1 directs this work to reconcile.

## Assumption Reassessment (2026-05-14)

1. `tools/validators/src/structural/snapshot-replay-equality.ts` `runNewSchemaReplay` (line 184) carries a comment (lines ~180-184) stating `entity_status` (with `visible_affordances`, `unresolved_mystery_claims`, `continuation`) is "not reconstructible from state_delta alone and ... intentionally not compared here." `tools/validators/src/_helpers/state-snapshot-replay.ts` `ACTIVE_RECORDS_CLASSES` (lines 8-20) lists `STENT, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA` — no `STSTAT`.
2. SPEC-25 D1 prescribes: §4.2 redefine `entity_status` as a derived projection of active `STSTAT` (one entry per active `STENT`) and add `STSTAT` to `active_records`; §5 reconcile the `entity_status` predicate argument name. Verified: contract §5 line 578 already reads `entity_status(STENT-<integer>, field, value)` with "`field` is one of `life | agency | location`"; the grammar uses `axis` (`predicate-dsl-grammar.ts:82`). The contract is already correct — the reconcile is a grammar-side rename to match it.
3. Cross-artifact boundary under audit: the replay contract — `SE.state_delta` → `PG.state_snapshot.active_records` (now including `STSTAT` after SPEC25STOCOHHAR-001) → derived `entity_status` projection — spanning contract §4.2 / §4.3 ↔ `state-snapshot-replay.ts` ↔ `snapshot-replay-equality.ts`. Plus the predicate-DSL grammar surface (`predicate-dsl-grammar.ts`) shared with SPEC25STOCOHHAR-006.
4. FOUNDATIONS Rule 1 (No Floating Facts) + §Story Bundles §4a (Plan-Authority Boundary): restated before trusting the spec — the page snapshot is the fork primitive, and any committed page must be a valid replayable parent. Making `entity_status` replay-checked *strengthens* the fork primitive; it adds no second state engine and no `ARC_TRACE`-style parallel pass.
5. Rename / removal blast radius (FOUNDATIONS-aligned enforcement surface — the predicate grammar): the `axis`→`field` rename targets **only the `entity_status` predicate's argument**. The `relationship_axis` predicate also uses `axis` (`predicate-dsl-grammar.ts:83`, parser line 192) and the `SREL` record schema has its own `axis` field (contract line 446) — neither is touched. Blast radius for the `entity_status` rename: `predicate-dsl-grammar.ts:82` (`PREDICATE_ARG_SCHEMAS.entity_status.required`), `rule_storylet_predicate_dsl_parsability.ts:186` (`value.axis` read + the `${path}.axis` error-path string), contract §5 line 578 (already `field`). The `ENTITY_STATUS_AXES` constant in the parser names the *value* set (`life`/`agency`/`location`), not the argument — it is unchanged. Skill prose listing `entity_status(` as a literal (e.g. `branching-story-prose-attach` SKILL.md:173) names the predicate, not the argument — no change required.
6. Adjacent contradiction classification: the legacy-schema replay path (pre-`input.resolved_event_id` pages) must remain untouched, per SPEC-25 §Verification ("The legacy-schema replay path ... is untouched"). This is a required-scope boundary of this ticket, not a separate bug.

## Architecture Check

1. Deriving `entity_status` from the replayed active `STSTAT` set — rather than comparing an independently-authored block — makes it symmetric with `active_records`: both become projections of the replayed record set. The "intentionally not compared" exclusion shrinks to only genuinely page-local fields (`visible_affordances`, `unresolved_mystery_claims`, `continuation`).
2. No shims: the rename picks one canonical argument name (`field`, matching the contract) and aligns the grammar to it — no alias accepting both `axis` and `field`, no compatibility shim.

## Verification Layers

1. A child page whose `entity_status` mismatches the `STSTAT`-derived projection fails replay -> validator test: a constructed two-page entity-death fixture.
2. A correct child page passes replay -> validator test: the same fixture with a matching `entity_status`.
3. The legacy-schema replay path is unaffected -> codebase grep-proof + existing test: pre-`resolved_event_id` pages still route through the legacy branch and `snapshot-replay-equality.test.ts`'s legacy cases still pass.
4. The `entity_status` predicate argument is consistent contract ↔ grammar ↔ parser -> codebase grep-proof: `entity_status` uses `field` in all three; `relationship_axis` still uses `axis`.

## What to Change

### 1. Contract §4.2 — entity_status as derived projection

Redefine `PG.state_snapshot.entity_status` as a derived projection of active `STSTAT` records (one entry per active `STENT`, computed from that entity's current `STSTAT`), not an independently-authored block. Add `STSTAT` to `PG.state_snapshot.active_records`.

### 2. Contract §5 — entity_status predicate argument

Confirm §5 line 578 uses `field`; add a note that `entity_status(STENT-<integer>, field, value)` now resolves against active `STSTAT` records.

### 3. ACTIVE_RECORDS_CLASSES

Add `"STSTAT"` to `ACTIVE_RECORDS_CLASSES` in `tools/validators/src/_helpers/state-snapshot-replay.ts`.

### 4. snapshot-replay-equality runNewSchemaReplay

In `runNewSchemaReplay`, derive the expected `entity_status` from the replayed active `STSTAT` set and compare it against the page's `entity_status` block. Remove `entity_status` from the "intentionally not compared" exclusion and update the comment at lines ~180-184. Keep `visible_affordances` / `unresolved_mystery_claims` / `continuation` excluded as genuinely page-local.

### 5. Predicate grammar + parser rename

`predicate-dsl-grammar.ts:82`: change `entity_status` required args from `["entity", "axis", "value"]` to `["entity", "field", "value"]`. `rule_storylet_predicate_dsl_parsability.ts:186`: change the `value.axis` read to `value.field` and the `${path}.axis` error-path string to `${path}.field`. Leave `relationship_axis` and the `ENTITY_STATUS_AXES` value-set constant unchanged.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.2, §5)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — `ACTIVE_RECORDS_CLASSES`)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify — `runNewSchemaReplay`)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — `PREDICATE_ARG_SCHEMAS.entity_status`)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — `entity_status` arg parse)

## Out of Scope

- The STSTAT machine layer (schema, allocator, patch-engine op, MCP node-type) — archive/tickets/SPEC25STOCOHHAR-001.md.
- Story-pipeline skills emitting / reading STSTAT — SPEC25STOCOHHAR-003.
- The six new D4 existential predicates — SPEC25STOCOHHAR-006.
- The `relationship_axis` predicate or the `SREL.axis` record field — explicitly not renamed.
- The legacy-schema replay path (pre-`input.resolved_event_id` pages).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` — a two-page fixture where an entity dies on the parent page: replay *fails* a child page whose `entity_status` does not match the `STSTAT`-derived projection, and *passes* a correct child page.
2. `cd tools/validators && npm run build && npm run test` — the predicate-DSL parsability suite accepts `entity_status` with a `field` argument and rejects it with an `axis` argument.
3. `cd tools/validators && npm run build && npm run test` — full suite green, including the legacy-schema `snapshot-replay-equality` cases (unchanged).

### Invariants

1. `entity_status` is a derived projection of the replayed active `STSTAT` set, never independently authored — the only un-replayed `PG.state_snapshot` fields are `visible_affordances`, `unresolved_mystery_claims`, `continuation`.
2. The `entity_status` predicate argument is named `field` consistently across contract §5, `predicate-dsl-grammar.ts`, and `rule_storylet_predicate_dsl_parsability.ts`; `relationship_axis` is unaffected.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify) — add the two-page entity-death fixture with both a pass case (`entity_status` matches the STSTAT projection) and a fail case (mismatch).
2. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify) — confirm `entity_status` parses with `field` and is rejected with `axis`.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. `grep -nE "entity_status|relationship_axis" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — confirms `entity_status` uses `field`, `relationship_axis` still uses `axis`.
3. A package-scoped `npm run test` is the correct boundary — all four code surfaces (replay helper, replay validator, grammar, parser) live in `tools/validators`, and the contract edit is verified by the same suite round-tripping STSTAT-backed fixtures.
