# SPEC59STCHARAUTFID-001: Require `char_authority_leak` in prose-receipt schema

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (tightens `prose-receipt.schema.json`; affects the `prose_receipt_schema_compliance` validator's accept/reject boundary). No new validator module.
**Deps**: None

## Problem

`prose-receipt.schema.json` defines `checks.char_authority_leak` (enum `["PASS","FAIL"]`) in `checks.properties` but omits it from `checks.required`. A prose receipt that drops the `char_authority_leak` verdict therefore passes `prose_receipt_schema_compliance` — the CHAR-leak firewall verdict can silently go unrecorded. SPEC-59 §2.1 (C5a) requires the field, so every receipt must carry the verdict.

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/schemas/prose-receipt.schema.json` `checks` block (lines ~34–59) defines `checks.required` as a 9-entry array (`hash_integrity`, `engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `choice_consequence_visibility`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`, `craft_critic`) and `checks.properties.char_authority_leak` exists with enum `["PASS","FAIL"]` but is NOT in `required`. Verified against current schema.
2. SPEC-59 §2.1 (C5a) is the source deliverable; acceptance is "a prose receipt omitting `char_authority_leak` fails `prose_receipt_schema_compliance`."
3. Cross-artifact boundary: the receipt schema is consumed by `branching-story-prose-attach` (producer of `pages-prose-receipts/PG-<integer>.yaml`) and validated by `prose_receipt_schema_compliance`. `branching-story-prose-attach/SKILL.md` already prescribes emitting `checks.char_authority_leak` (SKILL.md sub-step 9 + the receipt template), so the producer side already populates the field — this change tightens the schema to match the producer contract, not to introduce a new field the producer must learn to emit.
4. FOUNDATIONS §6.1 Story-Local Character Authority motivates this ticket: `char_authority_leak` surfaces the `no_char_authority_in_story_runtime` verdict, the firewall against world `CHAR-*` authority leaking into story runtime. Requiring the verdict keeps the firewall result auditable on every receipt rather than optionally elided.
5. Output-schema extension: the prose-receipt schema is an existing output schema (emitted by `branching-story-prose-attach`). This change moves an existing optional field into `required` — a tightening, not an additive new field. Consumer check: the sole producer (`branching-story-prose-attach`) already emits `char_authority_leak` on every receipt per its SKILL.md, so no producer update is required and no pre-existing in-tree receipt fixture should be missing the field. The change is breaking only for hypothetical receipts that omit the field — which the spec intends to reject.

## Architecture Check

1. Moving the field into `checks.required` reuses the existing AJV schema-compliance path (`prose_receipt_schema_compliance` already loads this schema) — no new validator, no new code path. The schema is the single source of truth for receipt shape; tightening it is cleaner than adding a bespoke presence check in validator code.
2. No backwards-compatibility shim: receipts omitting the field are rejected outright (the spec's intent), not warned-then-accepted.

## Verification Layers

1. `char_authority_leak` is present in `checks.required` -> codebase grep-proof (`grep -A12 '"checks"' prose-receipt.schema.json` shows the field in the `required` array).
2. A receipt omitting `char_authority_leak` fails compliance -> schema validation (fixture-driven `prose_receipt_schema_compliance` run via `npm test`).
3. Single-package, single-schema change; cross-skill proof is the producer-contract confirmation in Assumption Reassessment item 3 (no producer edit needed). No additional layer applies.

## What to Change

### 1. Add `char_authority_leak` to `checks.required`

In `tools/validators/src/schemas/prose-receipt.schema.json`, add `"char_authority_leak"` to the `checks.required` array (it already exists in `checks.properties`). Preserve ordering convention — place it adjacent to the other PASS/FAIL leak checks (e.g., after `canon_claim_without_authority`). Do not change `checks.properties.char_authority_leak` (its enum stays `["PASS","FAIL"]`).

### 2. Add a schema-compliance fixture

Add a fail-case fixture: a prose receipt whose `checks` block omits `char_authority_leak`, expected to fail `prose_receipt_schema_compliance`. Place it under the existing fixtures convention in `tools/validators/tests/fixtures/` (topic-clustered, with an `expected_verdict` annotation), and assert it in the relevant `prose_receipt_schema_compliance` test.

## Files to Touch

- `tools/validators/src/schemas/prose-receipt.schema.json` (modify)
- `tools/validators/tests/fixtures/` — new fail-case fixture for the omitted-field receipt (new)
- `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` (modify) — assert the omitted-field fixture fails

## Out of Scope

- The four new STCHAR validators (§2.2–§2.5) — separate tickets 002–005.
- Any change to `checks.properties` enums or to other `checks` fields.
- Any change to `branching-story-prose-attach` (its receipt template already emits the field).

## Acceptance Criteria

### Tests That Must Pass

1. A prose receipt whose `checks` block omits `char_authority_leak` fails `prose_receipt_schema_compliance` (new fixture).
2. A valid prose receipt carrying `char_authority_leak` still passes (existing fixtures unaffected).
3. `npm test --prefix tools/validators` passes (full validator suite, including `prose_receipt_schema_compliance` and the registry name-list test, both unaffected by a schema-only tightening).

### Invariants

1. Every schema-valid prose receipt records the `char_authority_leak` verdict (PASS or FAIL) — the CHAR-leak firewall result is never silently absent.
2. The change is schema-only; `prose_receipt_schema_compliance` validator code is unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/` — new omitted-`char_authority_leak` receipt fixture (fail case).
2. `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` — assert the new fixture fails compliance.

### Commands

1. `npm run build --prefix tools/validators` (compiles TS + schema; `tsc` typecheck surface)
2. `npm test --prefix tools/validators` (runs the full validator suite against the built output)
