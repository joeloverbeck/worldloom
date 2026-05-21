# SPEC57STCHARPIPINT-006: Prose-attach STCHAR-authority receipt + prose-receipt schema

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/validators/src/schemas/prose-receipt.schema.json`, updates its structural tests, mirrors the receipt contract in `.claude/skills/_shared-templates/story-record-schemas.md`, and modifies `branching-story-prose-attach`.
**Deps**: archive/tickets/SPEC57STCHARPIPINT-002.md (validates the §16a page-plan packet hashes).

## Problem

At intake, prose-attach receipts carried no STCHAR-authority verification, so a page plan could ship without the mandatory voice packet, with a hash-inconsistent packet, or citing world `CHAR` as operational authority, and prose-attach would not catch it. SPEC-57 Phase 5 adds a deterministic `stchar_authority` block + a judgment-assisted `profile_fidelity` block to the receipt, reusing the existing leak validator.

## Assumption Reassessment (2026-05-21)

1. At intake, `tools/validators/src/schemas/prose-receipt.schema.json` had zero STCHAR fields (its `checks` object covered `hash_integrity`, `engine_jargon_leak`, `forbidden_mystery_resolution`, etc.). The schema is consumed by the structural validator `tools/validators/src/structural/prose-receipt-schema-compliance.ts`, and STCHAR validator utilities exist at `tools/validators/src/structural/stchar-utils.ts` (SPEC-56) — reuse the existing schema-compliance and leak-validator surfaces rather than re-implementing hash/active-state checks.
2. SPEC-57 §Phase 5 specifies the deterministic `stchar_authority` block (`packet_present`, `active_in_snapshot`, `{profile,voice_block,page_packet}_hash` expected-vs-observed → `deterministic_verdict`) and the judgment-assisted `profile_fidelity` block (`voice_fidelity` / `appraisal_fidelity` / `pressure_behavior_fidelity` / `relationship_conduct_fidelity` ∈ pass|minor_drift|major_drift|not_applicable, evidence, `repair_recommendation`). The CHAR-authority-leak verdict reuses the landed `no_char_authority_in_story_runtime` validator (its `TEXT_SURFACE_PATTERN` already scans page plans + prose receipts; error `char_authority_text_leak`).
3. Cross-skill boundary under audit: the prose-receipt schema is the shared contract between `branching-story-prose-attach` (producer), `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 (canonical skill-facing receipt contract), and the `prose-receipt-schema-compliance` validator (consumer); the §16a packet hashes (archive/tickets/SPEC57STCHARPIPINT-002.md) are the inputs the deterministic block validates.
4. FOUNDATIONS §4a (prose is a receipt validated against the plan) and §6.1 (no `CHAR` operational authority): the deterministic block enforces packet presence + hash fidelity; the leak verdict surfaces §6.1 violations via the existing validator.
5. Canon Safety surface (per-ticket-type granularity): this ticket modifies the schema consumed by `prose-receipt-schema-compliance.ts` — a Canon Safety surface gating story-bundle prose-receipt conformance. The change remains additive to the receipt contract and does not weaken the Mystery Reserve firewall (`forbidden_mystery_resolution` remains untouched).
6. Output-schema extension: `prose-receipt.schema.json` gained optional `stchar_authority` + `profile_fidelity` blocks plus an optional surfaced `checks.char_authority_leak` value. Consumers: `prose-attach` (producer), the shared receipt contract, and `prose-receipt-schema-compliance.ts` (validator). The extension is additive: existing receipts without qualifying characters or without the new leak field still validate; new prose-attach receipts emit one `stchar_authority[]` entry per required §16a packet, and invalid packet/hash verdict combinations are rejected by schema compliance.
7. Reassessment correction: `tools/validators/src/structural/prose-receipt-schema-compliance.ts` did not need code changes because it already compiles and applies the JSON Schema through Ajv2020. The actual validator delta is the JSON Schema plus focused tests that prove the new schema shape.

## Architecture Check

1. Reusing `no_char_authority_in_story_runtime` for the leak verdict (rather than re-implementing a parallel scan in prose-attach) keeps a single source of truth for the world/story firewall and avoids two divergent leak definitions; the new receipt fields stay scoped to the STCHAR-specific packet/hash checks the existing validator does not cover.
2. No backwards-compatibility shim: the schema additions are additive blocks; existing receipts without qualifying characters remain valid.

## Verification Layers

1. Receipt carries deterministic `stchar_authority` + judgment-assisted `profile_fidelity` → schema validation (`prose-receipt.schema.json` accepts the blocks; `prose-receipt-schema-compliance.ts` validates them through Ajv2020).
2. Missing/hash-inconsistent packets fail deterministically → unit test on the schema-compliance validator with fixture receipts whose `stchar_authority[]` entries try to mark missing packets or hash mismatches as `PASS`.
3. Page plan citing `CHAR-*` as operational authority fails → existing `no_char_authority_in_story_runtime` validator remains the single leak scan; prose-attach and the receipt contract surface that verdict as `checks.char_authority_leak`.
4. Drift produces actionable repair recommendations → manual review of `profile_fidelity.repair_recommendation` enum.

## Landed Changes

### 1. Extended `prose-receipt.schema.json`

Added the optional `stchar_authority` block (per-packet `packet_present`, `active_in_snapshot`, three hash expected-vs-observed pairs, `deterministic_verdict`) and the optional `profile_fidelity` block (per-character four fidelity axes + evidence + local `repair_recommendation`). Schema conditionals enforce that missing packets, inactive STCHARs, or failed hash comparisons cannot be marked with `deterministic_verdict: PASS`.

### 2. Extended schema-compliance tests

Added focused tests for valid `stchar_authority` / `profile_fidelity`, absent STCHAR blocks for no qualifying character, additive compatibility without `checks.char_authority_leak`, missing-packet fail, hash-mismatch fail, and invalid profile-fidelity repair tokens. No TypeScript validator code change was needed because schema compliance already delegates to the JSON Schema.

### 3. Updated prose-attach and shared receipt contract prose

Documented populating `stchar_authority` (deterministic) and `profile_fidelity` (judgment) blocks, judging against the page-plan packet first, retrieving full STCHAR only when the packet is missing/hash-inconsistent or insufficient for diagnosis, and surfacing the existing `no_char_authority_in_story_runtime` verdict as `checks.char_authority_leak`. The prose-attach FOUNDATIONS Alignment table now names §6.1 Story-Local Character Authority.

## Files to Touch

- `tools/validators/src/schemas/prose-receipt.schema.json` (modify)
- `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Re-implementing the CHAR-authority leak scan (reuse `no_char_authority_in_story_runtime`).
- Broader cross-surface integration tests (SPEC57STCHARPIPINT-010).
- The §16a packet contract definition (archive/tickets/SPEC57STCHARPIPINT-002.md).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` passes, including new cases in `prose-receipt-schema-compliance.test.ts` for a valid `stchar_authority` block, a missing packet (fail), and a hash-mismatch (fail).
2. A fixture receipt that records a missing packet or hash mismatch as `deterministic_verdict: PASS` fails schema-compliance deterministically.
3. `rg -n 'stchar_authority|profile_fidelity|char_authority_leak' tools/validators/src/schemas/prose-receipt.schema.json .claude/skills/_shared-templates/story-record-schemas.md .claude/skills/branching-story-prose-attach/SKILL.md` returns the new blocks and surfaced leak verdict contract.

### Invariants

1. The schema extension is additive — receipts for pages with no qualifying character and existing receipts without `checks.char_authority_leak` remain valid.
2. The CHAR-authority leak verdict is sourced from `no_char_authority_in_story_runtime`, not a second leak scan.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/prose-receipt-schema-compliance.test.ts` — added cases: valid `stchar_authority` / `profile_fidelity`; missing-packet fail; hash-mismatch fail; absent-block-for-no-qualifying-character pass; additive compatibility without `checks.char_authority_leak`; stale profile-fidelity repair token fail.

### Commands

1. From `tools/validators`: `npm run build`
2. From `tools/validators`: `node --test dist/tests/structural/prose-receipt-schema-compliance.test.js`
3. From `tools/validators`: `npm test`
4. From repo root: `rg -n 'stchar_authority|profile_fidelity|char_authority_leak' tools/validators/src/schemas/prose-receipt.schema.json .claude/skills/_shared-templates/story-record-schemas.md .claude/skills/branching-story-prose-attach/SKILL.md`

## Outcome

Completed: 2026-05-21

Extended the prose receipt schema with STCHAR packet-authority and profile-fidelity receipt blocks, kept the extension additive for existing receipts, and documented prose-attach production of those blocks. The existing `no_char_authority_in_story_runtime` validator remains the single CHAR leak scan; prose-attach and the shared receipt contract surface its result as `checks.char_authority_leak`.

## Verification Result

- `npm run build` (from `tools/validators`) — PASS; TypeScript compiled and the Ajv2020 schema compiled under strict settings after the schema conditionals were made strict-type-safe.
- `node --test dist/tests/structural/prose-receipt-schema-compliance.test.js` (from `tools/validators`) — PASS; 12 focused tests passed, including valid STCHAR blocks, absent/no-qualifying-character compatibility, missing-packet fail, hash-mismatch fail, and invalid profile-fidelity repair token fail.
- Pre-edit baseline `npm test` (from `tools/validators`) — PASS; 768/768 before implementation.
- Final broad `npm test` (from `tools/validators`) — PASS; 774/774 after implementation.
- `rg -n 'stchar_authority|profile_fidelity|char_authority_leak' tools/validators/src/schemas/prose-receipt.schema.json .claude/skills/_shared-templates/story-record-schemas.md .claude/skills/branching-story-prose-attach/SKILL.md` — PASS; the schema, shared receipt contract, and prose-attach skill all name the new receipt blocks and surfaced leak verdict.

## Deviations

- `tools/validators/src/structural/prose-receipt-schema-compliance.ts` stayed unchanged because the live validator already delegates to `prose-receipt.schema.json`; the schema and tests were the actual machine-layer delta.
- `.claude/skills/_shared-templates/story-record-schemas.md` was added to the touched file set because it is the canonical skill-facing prose receipt contract mirrored by the validator schema.
- `checks.char_authority_leak` is accepted and emitted by updated prose-attach guidance but not schema-required, preserving additive compatibility for existing receipts.
