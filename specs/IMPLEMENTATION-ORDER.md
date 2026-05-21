# Implementation Order

## World-system consolidation (first iteration)

Specs derived from `reports/world-system-consolidation-first-iteration.md` (triage:
`docs/triage/2026-05-21-world-system-consolidation-triage.md`). First consolidation pass over the
world-system (non-story) skills, whose proposal/audit/pressure surfaces had the least prior iteration.

| Order | Spec | Scope | Depends on |
|---|---|---|---|
| 1 | **SPEC-61** — Proposal-surface schema coverage & approval-semantics enforcement (`archive/specs/SPEC-61-proposal-surface-schema-and-approval-enforcement.md`) | Completed: JSON schemas + structural validation for PR/BATCH/EPE/EPE-sidecar/EPE-batch/AU/RP/NWP/NWB; hard-fail non-CF `direct_user_approval`; fix RP collision; add capstone proof | none — foundational |
| 2 | **SPEC-62** — FOUNDATIONS & docs world-system reconciliation | FOUNDATIONS §Artifact Authority + §World Generativity paragraphs; document `passive_depth`; relax forbidden-mystery mandate; REPOSITORY-MAP + DA-prose fixes | none — independent; may run in parallel with SPEC-61 (docs-only; no schema/validator overlap) |

Both are independent and may run in parallel. SPEC-61 is now archived as completed executable coverage;
SPEC-62 is docs/FOUNDATIONS only (touches no schema, validator, or world data). Deferred items (D3–D6:
`taxonomy_authority_validator`, CF-1 split, continuity-audit compatibility checks, patch-engine
routing of proposal direct-writes) await a concrete consumer or SPEC-61 landing — see the companion
triage record.

---

## STCHAR audit (first iteration)

Active specs derived from `reports/stchar-audit-first-iteration.md` (triage:
`docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`). These audit the gaps left by the
just-merged SPEC-56 (stchar-machine-foundation) and SPEC-57 (stchar-pipeline-integration).

| Order | Spec | Scope | Depends on |
|---|---|---|---|
| 1 | **SPEC-58** — STCHAR contract-to-enforcement reconciliation (`archive/specs/SPEC-58-stchar-contract-enforcement-reconciliation.md`) | Completed: fixed existing schemas/validators that rejected or under-required lawful STCHAR (C1 state-delta, C2 mid-story intro, C3 SREL.derived_from, C4 active_records key) | none — foundational |
| 2 | **SPEC-59** — STCHAR authority-fidelity validators (`archive/specs/SPEC-59-stchar-authority-fidelity-validators.md`) | Completed: added executable validators for page-plan §16a packet integrity, prose-receipt STCHAR integrity, required `char_authority_leak`, STENT↔STCHAR reciprocity, and cast_bind_list integrity (C5 + reciprocity + kernel) | **SPEC-58** (`archive/specs/SPEC-58-stchar-contract-enforcement-reconciliation.md`; assumes schemas accept STCHAR and the active_records key is required) |
| 3 | **SPEC-60** — STCHAR machine-layer & docs completeness (`archive/specs/SPEC-60-stchar-machine-layer-and-docs-completeness.md`) | Completed: structured-predicate edge extraction (I3), `story_character_profile` MCP task profile (I4), patch-engine stale-index STCHAR path, stale-doc reconciliation (I5) | none — independent; may run in parallel with 1/2 |
| 4 | **SPEC-63** — Offstage-causal §16a packet tier (`archive/specs/SPEC-63-offstage-causal-packet-tier.md`) | Completed: added the reduced `offstage_causal` §16a packet tier deferred by SPEC-59 §5 — one new `required_because` value, reduced packet shape (no voice block), presence-aware `page_plan_stchar_packet_integrity`, and receipt fixture coverage; no schema change | **SPEC-59** (completed; extends `page_plan_stchar_packet_integrity` / `prose_receipt_stchar_integrity`) |

## Dependency rationale

- **SPEC-58 must precede SPEC-59 and is now archived at
  `archive/specs/SPEC-58-stchar-contract-enforcement-reconciliation.md`.** SPEC-59's `page_plan_stchar_packet_integrity` and
  `prose_receipt_stchar_integrity` validators assume the page schema requires `active_records.STCHAR`
  (SPEC-58 §2.4) and that the schema/validator layer accepts lawful STCHAR records (SPEC-58 §2.1–2.3).
  Building the new validators on the un-reconciled schemas would force rework.
- **SPEC-60 is independent.** It touches world-index, MCP ranking profiles, the patch-engine
  stale-index guard, and docs — none of which the validator-layer specs depend on, and vice versa.
  It can be scheduled in parallel.
- **SPEC-63 depends on SPEC-59 (already completed) and is now archived at
  `archive/specs/SPEC-63-offstage-causal-packet-tier.md`.** It extends the `page_plan_stchar_packet_integrity`
  and `prose_receipt_stchar_integrity` validators SPEC-59 landed, and amends the §16a authoring contract
  SPEC-59 validated against. Since SPEC-59 is archived/completed, SPEC-63 was unblocked and independent of
  the active world-system specs (SPEC-61/62). It is a follow-on to the same STCHAR-audit deliberation
  (the deferred item recorded in the companion triage record and SPEC-59 §5).

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
