# SPEC57STCHARPIPINT-006: Prose-attach STCHAR-authority receipt + prose-receipt schema

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/validators/src/schemas/prose-receipt.schema.json` and `tools/validators/src/structural/prose-receipt-schema-compliance.ts`; modifies `branching-story-prose-attach`.
**Deps**: SPEC57STCHARPIPINT-002 (validates the §16a page-plan packet hashes).

## Problem

Prose-attach receipts carry no STCHAR-authority verification, so a page plan could ship without the mandatory voice packet, with a hash-inconsistent packet, or citing world `CHAR` as operational authority, and prose-attach would not catch it. SPEC-57 Phase 5 adds a deterministic `stchar_authority` block + a judgment-assisted `profile_fidelity` block to the receipt, reusing the existing leak validator.

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/schemas/prose-receipt.schema.json` currently has zero STCHAR fields (its `checks` object covers `hash_integrity`, `engine_jargon_leak`, `forbidden_mystery_resolution`, etc.). The schema is consumed by the structural validator `tools/validators/src/structural/prose-receipt-schema-compliance.ts` and STCHAR validator utilities exist at `tools/validators/src/structural/stchar-utils.ts` (SPEC-56) — reuse them rather than re-implementing hash/active-state checks.
2. SPEC-57 §Phase 5 specifies the deterministic `stchar_authority` block (`packet_present`, `active_in_snapshot`, `{profile,voice_block,page_packet}_hash` expected-vs-observed → `deterministic_verdict`) and the judgment-assisted `profile_fidelity` block (`voice_fidelity` / `appraisal_fidelity` / `pressure_behavior_fidelity` / `relationship_conduct_fidelity` ∈ pass|minor_drift|major_drift|not_applicable, evidence, `repair_recommendation`). The CHAR-authority-leak verdict reuses the landed `no_char_authority_in_story_runtime` validator (its `TEXT_SURFACE_PATTERN` already scans page plans + prose receipts; error `char_authority_text_leak`).
3. Cross-skill boundary under audit: the prose-receipt schema is the shared contract between `branching-story-prose-attach` (producer) and the `prose-receipt-schema-compliance` validator (consumer); the §16a packet hashes (SPEC57STCHARPIPINT-002) are the inputs the deterministic block validates.
4. FOUNDATIONS §4a (prose is a receipt validated against the plan) and §6.1 (no `CHAR` operational authority): the deterministic block enforces packet presence + hash fidelity; the leak verdict surfaces §6.1 violations via the existing validator.
5. Canon Safety surface (per-ticket-type granularity): this ticket modifies the structural validator `prose-receipt-schema-compliance.ts` — a Canon Safety surface gating story-bundle prose-receipt conformance. The change must remain additive to the receipt contract and must not weaken the Mystery Reserve firewall (`forbidden_mystery_resolution` remains untouched).
6. Output-schema extension: `prose-receipt.schema.json` gains the `stchar_authority` + `profile_fidelity` blocks. Consumers: `prose-attach` (producer) and `prose-receipt-schema-compliance.ts` (validator). The extension is additive — the blocks are required only per-required-packet; receipts for pages with no qualifying character carry empty/absent blocks per the schema's conditional requirement.

## Architecture Check

1. Reusing `no_char_authority_in_story_runtime` for the leak verdict (rather than re-implementing a parallel scan in prose-attach) keeps a single source of truth for the world/story firewall and avoids two divergent leak definitions; the new receipt fields stay scoped to the STCHAR-specific packet/hash checks the existing validator does not cover.
2. No backwards-compatibility shim: the schema additions are additive blocks; existing receipts without qualifying characters remain valid.

## Verification Layers

1. Receipt carries deterministic `stchar_authority` + judgment-assisted `profile_fidelity` → schema validation (`prose-receipt.schema.json` accepts the blocks; `prose-receipt-schema-compliance.ts` validates them).
2. Missing/hash-inconsistent packets fail deterministically → unit test on the schema-compliance validator with a fixture receipt.
3. Page plan citing `CHAR-*` as operational authority fails → `no_char_authority_in_story_runtime` over the page-plan/receipt fixture (reused verdict surfaced as `char_authority_leak`).
4. Drift produces actionable repair recommendations → manual review of `profile_fidelity.repair_recommendation` enum.

## What to Change

### 1. Extend `prose-receipt.schema.json`

Add the `stchar_authority` block (per-packet `packet_present`, `active_in_snapshot`, three hash expected-vs-observed pairs, `deterministic_verdict`) and the `profile_fidelity` block (per-character four fidelity axes + evidence + `repair_recommendation`), with conditional requirement (required when a qualifying §16a packet exists).

### 2. Extend `prose-receipt-schema-compliance.ts`

Validate the new blocks; surface the CHAR-authority-leak verdict by consuming the existing `no_char_authority_in_story_runtime` result (do not re-implement the scan). Reuse `stchar-utils.ts` for hash/active-state checks.

### 3. Prose-attach skill

Document populating the `stchar_authority` (deterministic) and `profile_fidelity` (judgment) blocks: judge against the page-plan packet first; retrieve full STCHAR only when the packet is missing/hash-inconsistent. Update the FOUNDATIONS Alignment table to reference STCHAR.

## Files to Touch

- `tools/validators/src/schemas/prose-receipt.schema.json` (modify)
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (modify)
- `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Re-implementing the CHAR-authority leak scan (reuse `no_char_authority_in_story_runtime`).
- Broader cross-surface integration tests (SPEC57STCHARPIPINT-010).
- The §16a packet contract definition (SPEC57STCHARPIPINT-002).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` passes, including new cases in `prose-receipt-schema-compliance.test.ts` for a valid `stchar_authority` block, a missing packet (fail), and a hash-mismatch (fail).
2. A fixture receipt omitting a required `stchar_authority` block fails schema-compliance deterministically.
3. `grep -n "stchar_authority\|profile_fidelity" tools/validators/src/schemas/prose-receipt.schema.json` returns the new blocks.

### Invariants

1. The schema extension is additive — receipts for pages with no qualifying character remain valid.
2. The CHAR-authority leak verdict is sourced from `no_char_authority_in_story_runtime`, not a second leak scan.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` — add cases: valid `stchar_authority` block; missing-packet fail; hash-mismatch fail; absent-block-for-no-qualifying-character pass (rationale: prove deterministic verdicts and additive conditionality).

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (tsc typecheck; no `typecheck` script exists — build runs tsc)
3. The validators-package boundary is correct because the schema + structural validator + their unit test all live in `tools/validators`; the skill-prose change is verified by grep.
