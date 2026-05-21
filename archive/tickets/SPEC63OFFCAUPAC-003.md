# SPEC63OFFCAUPAC-003: Presence-aware page-plan validator + offstage fixtures

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (presence-awareness logic + new verdict code) plus test fixtures in `tools/validators/tests/structural/`. No registry change (validator already registered); no prose-receipt validator code change; no schema change.
**Deps**: `archive/tickets/SPEC63OFFCAUPAC-001.md`

## Problem

Before this ticket, `page_plan_stchar_packet_integrity` demanded a full §16a packet for every active non-background STENT bound to an active STCHAR, with no presence-awareness — so an offstage-but-causal character forced a full packet or removal from `active_records`. With the offstage tier defined (001), this ticket relaxed the missing-packet requirement for offstage characters and enforced the reduced packet's shape when it is present, while never auto-grading whether causal relevance warranted a packet.

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` derives the qualifying set from active `STENT` → `bound_stchar_id` active in `active_records.STCHAR`, demands a packet per qualifying STENT (`missing_packet`), checks hashes (`hash_mismatch`), inactive STCHAR (`inactive_stchar`), and requires a voice block when `Required because ∈ {speaker, viewpoint}` (`SPEAKER_VOICE_REQUIRED` Set membership, line 28; `missing_voice_block`). It has NO entity-location logic today — confirmed: the only `location` reference is the verdict's file-location field. Presence is available via `PG.state_snapshot.entity_status[<stent>].location` (a derived projection from active STSTAT; enum `STLOC-<integer> | unknown | concealed | offstage`).
2. Source: SPEC-63 §2.3 (R1–R5) + §2.4 (prose-receipt fixture, no code change) + §2.5 (no schema change). `required_because` is compared as a free string by `prose_receipt_stchar_integrity` and is `{ "type": "string", "minLength": 1 }` in `prose-receipt.schema.json` — adding `offstage_causal` breaks no consumer (verified at reassessment §3.6: no closed enum/switch on `required_because`).
3. Cross-artifact boundary under audit: the validator parses §16a packets defined by the contract (`archive/tickets/SPEC63OFFCAUPAC-001.md`) and reads `entity_status.location` from the `PG.state_snapshot` schema. The new verdict `offstage_packet_for_present_character` and R5's location-enum handling must match the contract's emit/omit boundary exactly.
4. FOUNDATIONS judgment-vs-deterministic boundary (§Tooling Recommendation): the validator checks reduced-shape conformance + present/offstage consistency deterministically; it never auto-grades whether offstage causal relevance *warranted* a packet. §6.1 — STCHAR remains the operational authority; no `CHAR-*` leak is introduced. Restated; both hold.
5. Canon Safety surface: `page_plan_stchar_packet_integrity` is a structural validator under `tools/validators/src/structural/` with `severity_mode: "fail"` and `applies_to: appliesToStcharStoryState` — it gates story-bundle record writes at engine pre-apply. This change RELAXES enforcement for offstage characters (a missing packet no longer fails). Confirm this does not weaken the Mystery Reserve firewall: it does not — the relaxation is character-packet-presence-only, orthogonal to mystery resolution; no forbidden-status `M` is narrowed. Backward-compatible (a full packet for an offstage character stays valid).

## Architecture Check

1. Reading presence from the page's `entity_status[].location` (already in the loaded `PG` snapshot — the validator reads `state_snapshot.active_records` from the same record) avoids a new record load. R1–R5 express the relaxation as deterministic rules keyed on `location == offstage`, mirroring SPEC-59's deterministic-shape-only philosophy.
2. No backwards-compatibility shim: present-character enforcement is unchanged; the offstage handling is additive (R1 only relaxes the requirement; R2 adds a new misuse verdict; R5 pins the location-enum default fail-closed).

## Verification Layers

1. Offstage character (`location == offstage`) with no packet passes -> validator unit test (`page-plan-stchar-packet-integrity.test.ts`).
2. Offstage_causal packet conformance (hashes match, no voice block) passes, and an `offstage_causal` packet on a present STENT fails `offstage_packet_for_present_character` -> validator unit tests.
3. Present non-background character with no packet still fails `missing_packet` (regression guard) -> validator unit test.
4. `prose_receipt_stchar_integrity` accepts an offstage `stchar_authority` entry (free-string `required_because` + `voice_fidelity: not_applicable`) against the UNCHANGED schema -> validator unit test (`prose-receipt-stchar-integrity.test.ts`) — verifies §2.4 + §2.5.
5. Judgment-vs-deterministic boundary preserved (no auto-grading of causal relevance) -> FOUNDATIONS alignment check + manual review of R1–R5.

## Landed Changes

### 1. Presence-awareness in `page-plan-stchar-packet-integrity.ts`

The validator reads `entity_status[<stent>].location` for each qualifying STENT and applies:
- **R1 (relax):** an offstage STENT (`location == offstage`) with no packet does not fail `missing_packet`; present STENTs unchanged.
- **R2 (present-misuse):** new verdict `offstage_packet_for_present_character` — an `offstage_causal` packet whose STENT location ≠ offstage fails.
- **R3 (voice-block exemption):** `offstage_causal` is naturally not a member of `SPEAKER_VOICE_REQUIRED`, so `missing_voice_block` does not apply (no special-casing needed).
- **R4 (hashes unchanged):** `hash_mismatch` / `inactive_stchar` still apply to all packets, including `offstage_causal`.
- **R5 (location-enum):** the relaxation keys strictly on `location == offstage`; `unknown`, `concealed`, and any `STLOC-*` are treated as present (fail-closed — packet required, and an `offstage_causal` packet at these locations fails R2).

### 2. Page-plan validator fixtures

`page-plan-stchar-packet-integrity.test.ts` covers: offstage + no packet (pass, R1); offstage + conformant `offstage_causal` packet (pass, R1+R3+R4); `offstage_causal` packet on a present STENT (fail `offstage_packet_for_present_character`, R2); `offstage_causal` packet on a non-`offstage` location (`unknown`/`concealed`) (fail, R2+R5 default); `offstage_causal` + hash mismatch (fail `hash_mismatch`, R4); present + no packet (fail `missing_packet`, regression guard).

### 3. Prose-receipt fixture (D2.4 — no validator code change)

`prose-receipt-stchar-integrity.test.ts` covers a `stchar_authority[]` entry with `required_because: offstage_causal`, matching hashes, and a `profile_fidelity` entry present with `voice_fidelity: not_applicable` — passing against the unchanged validator + schema (verifies §2.4 + §2.5).

## Files to Touch

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify)
- `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` (modify)

## Out of Scope

- `prose_receipt_stchar_integrity` validator logic (no code change — §2.4).
- `prose-receipt.schema.json` (no change — §2.5).
- `tools/validators/src/public/registry.ts` (validator already registered).
- The §16a contract definition (`archive/tickets/SPEC63OFFCAUPAC-001.md`) and authoring guidance (`archive/tickets/SPEC63OFFCAUPAC-002.md`).
- Auto-grading whether offstage causal relevance warranted a packet (SPEC-63 §5 — authoring judgment, not deterministic).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` passes (full suite, including the new fixtures).
2. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` — all R1–R5 fixtures pass.
3. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-stchar-integrity.test.js` — the offstage `stchar_authority` fixture passes.

### Invariants

1. Present-character enforcement is unchanged: a present non-background STENT bound to an active STCHAR with no packet still fails `missing_packet`.
2. The validator emits no verdict that auto-grades artistic or causal-relevance fidelity — only shape/hash/presence determinism.
3. A full packet authored for an offstage character remains valid (backward-compatible).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify) — adds the six R1–R5 fixtures.
2. `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` (modify) — adds the offstage `stchar_authority` fixture (D2.4).

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`
2. `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-stchar-integrity.test.js`
3. `npm test --prefix tools/validators`
4. The validators package boundary is the correct verification scope — the change is contained in one structural validator plus its sibling test files; no cross-package surface is touched.

## Outcome

Completed: 2026-05-21

Implemented presence-aware `page_plan_stchar_packet_integrity` behavior for the SPEC-63 offstage-causal §16a packet tier. The validator now reads `PG.state_snapshot.entity_status[STENT].location`, relaxes `missing_packet` only when the active STENT is explicitly `offstage`, and emits `page_plan_stchar_packet_integrity.offstage_packet_for_present_character` when an `offstage_causal` packet is used for a present, `unknown`, `concealed`, or missing-location character. Hash and inactive-STCHAR checks still apply to all packets, including offstage packets, and `offstage_causal` remains outside the speaker/viewpoint voice-block requirement.

Added page-plan fixtures for R1-R5: offstage omitted packet pass, offstage `offstage_causal` no-voice pass, present misuse fail, `unknown`/`concealed` fail-closed misuse, offstage hash mismatch fail, and present missing packet regression coverage. Added a prose-receipt fixture proving unchanged receipt-validator/schema behavior accepts `required_because: offstage_causal` with `voice_fidelity: not_applicable`.

Deviations: none. No prose-receipt validator code, schema, or registry changes were needed.

## Verification Result

1. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` — PASS.
2. `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-stchar-integrity.test.js` — PASS.
3. `npm test --prefix tools/validators` — PASS (810/810 tests).
