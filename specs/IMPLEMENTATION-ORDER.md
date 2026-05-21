# Implementation Order

Active specs derived from `reports/stchar-audit-first-iteration.md` (triage:
`docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`). These audit the gaps left by the
just-merged SPEC-56 (stchar-machine-foundation) and SPEC-57 (stchar-pipeline-integration).

| Order | Spec | Scope | Depends on |
|---|---|---|---|
| 1 | **SPEC-58** — STCHAR contract-to-enforcement reconciliation (`archive/specs/SPEC-58-stchar-contract-enforcement-reconciliation.md`) | Completed: fixed existing schemas/validators that rejected or under-required lawful STCHAR (C1 state-delta, C2 mid-story intro, C3 SREL.derived_from, C4 active_records key) | none — foundational |
| 2 | **SPEC-59** — STCHAR authority-fidelity validators | New executable validators: page-plan §16a packet integrity, prose-receipt STCHAR integrity, require `char_authority_leak`, STENT↔STCHAR reciprocity, cast_bind_list integrity (C5 + reciprocity + kernel) | **SPEC-58** (`archive/specs/SPEC-58-stchar-contract-enforcement-reconciliation.md`; assumes schemas accept STCHAR and the active_records key is required) |
| 3 | **SPEC-60** — STCHAR machine-layer & docs completeness | Structured-predicate edge extraction (I3), `story_character_profile` MCP task profile (I4), patch-engine stale-index STCHAR path, stale-doc reconciliation (I5) | none — independent; may run in parallel with 1/2 |

## Dependency rationale

- **SPEC-58 must precede SPEC-59 and is now archived at
  `archive/specs/SPEC-58-stchar-contract-enforcement-reconciliation.md`.** SPEC-59's `page_plan_stchar_packet_integrity` and
  `prose_receipt_stchar_integrity` validators assume the page schema requires `active_records.STCHAR`
  (SPEC-58 §2.4) and that the schema/validator layer accepts lawful STCHAR records (SPEC-58 §2.1–2.3).
  Building the new validators on the un-reconciled schemas would force rework.
- **SPEC-60 is independent.** It touches world-index, MCP ranking profiles, the patch-engine
  stale-index guard, and docs — none of which the validator-layer specs depend on, and vice versa.
  It can be scheduled in parallel.

## Out of scope (rejected/deferred at triage — see companion triage record)

- ChatGPT-Pro **I1** (expand `no_char_authority_in_story_runtime`) — **refuted**: the validator
  already covers all story-runtime record classes + prose surfaces.
- ChatGPT-Pro **I2** (narrow over-broad ID unions to exclude STCHAR) — **rejected** (YAGNI; would
  need a contract amendment; no evidence of misuse). The genuine `^[A-Z]+-` schema-hygiene cleanup
  is a separate, non-STCHAR task if pursued.
- ChatGPT-Pro **§7** template body-section additions — **rejected** (contradicts the report's own
  "template is already strong" diagnosis; no validator consumer).
- `stchar_body_contract` (body re-hash), **N1** section projections, **N3** sufficiency rubric —
  **deferred** (no current consumer).
