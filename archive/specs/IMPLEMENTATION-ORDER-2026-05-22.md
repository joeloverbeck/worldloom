# Implementation Order

**Status**: COMPLETED — archived 2026-05-22 as `archive/specs/IMPLEMENTATION-ORDER-2026-05-22.md`

## World-system consolidation (first iteration)

Specs derived from `archive/reports/world-system-consolidation-first-iteration.md` (triage:
`docs/triage/2026-05-21-world-system-consolidation-triage.md`). First consolidation pass over the
world-system (non-story) skills, whose proposal/audit/pressure surfaces had the least prior iteration.

| Order | Spec | Scope | Depends on |
|---|---|---|---|
| 1 | **SPEC-61** — Proposal-surface schema coverage & approval-semantics enforcement (`archive/specs/SPEC-61-proposal-surface-schema-and-approval-enforcement.md`) | Completed: JSON schemas + structural validation for PR/BATCH/EPE/EPE-sidecar/EPE-batch/AU/RP/NWP/NWB; hard-fail non-CF `direct_user_approval`; fix RP collision; add capstone proof | none — foundational |
| 2 | **SPEC-62** — FOUNDATIONS & docs world-system reconciliation (`archive/specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md`) | Completed: FOUNDATIONS §Artifact Authority + §World Generativity paragraphs; documented `passive_depth`; relaxed forbidden-mystery mandate; REPOSITORY-MAP, ID-ALLOCATION, and DA-prose fixes | none — independent docs-only complement to SPEC-61 |
| 3 | **SPEC-64** — World-system compatibility & artifact-maturity validation | `artifact_maturity_validator` + `world_compatibility_validator` orchestration + index-consistency checks + `continuity-audit` compatibility reporting (triage D5 / Fault 11) | **SPEC-61** (landed schemas + `approval-semantics` validator) + **SPEC-62 §2.1** (`archive/specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md`; FOUNDATIONS §Artifact Authority and Maturity — landed by `archive/tickets/SPEC62FOUANDDOC-001.md`) |

SPEC-61 and SPEC-62 are both archived. SPEC-62 was the docs/FOUNDATIONS-only complement to SPEC-61.
SPEC-64 builds on SPEC-61's landed schemas + `approval-semantics` validator and **SPEC-62 §2.1**
(`archive/specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md`)
(FOUNDATIONS §Artifact Authority and Maturity, landed by `archive/tickets/SPEC62FOUANDDOC-001.md`):
its `artifact_maturity_validator` sources the maturity-tier vocabulary there. Triage **D5**
(continuity-audit compatibility / Fault 11) is lifted into SPEC-64.
Remaining deferred items stay deferred — each lacks a concrete consumer or pain signal: **D3**
(`taxonomy_authority_validator`, Fault 7 — low value/heavy, no consumer, authority-class convention
doesn't exist), **D4** (CF-1 sibling-genesis-CF split, Fault 10 — not urgent; SPEC-62 §2.4 already ruled
genesis forbidden-seeding an acceptable default), **D6** (patch-engine routing of proposal
direct-writes, report §9.5 — explicitly deferred there until direct-write recovery proves painful; its
prerequisite index-consistency checks land in SPEC-64). See the companion triage record.

---

## STCHAR audit (first iteration)

Active specs derived from `archive/reports/stchar-audit-first-iteration.md` (triage:
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

---

## STCHAR audit (second iteration)

Active specs derived from `archive/reports/stchar-audit-second-iteration.md` (triage:
`docs/triage/2026-05-21-stchar-audit-second-iteration-triage.md`). The second-iteration audit was
critically reassessed against the first-iteration triage and the merged SPEC-58/59/60/63; most of its
13 proposals were already resolved, already rejected, or contradicted its own §18 anti-patterns. Three
genuinely-new, FOUNDATIONS-aligned specs were selected. SPEC-65, SPEC-66, and SPEC-67 are now complete
and archived.

| Order | Spec | Scope | Depends on |
|---|---|---|---|
| done | **SPEC-65** — Story schema↔contract parity hardening (`archive/specs/SPEC-65-story-schema-contract-parity-hardening.md`) | Narrowed `SE.state_delta` and `SE.commitment.alias_bindings`; closed `PG.active_records`; added lightweight parity test; folded §16a packet-authority clarification + historical report headers | none — complete |
| done | **SPEC-66** — STCHAR body-integrity validator (`archive/specs/SPEC-66-stchar-body-integrity-validator.md`) | Added `stchar_body_integrity` validator for 13 required H2 sections, non-empty required bodies, and hash-shape checks; held back hash recompute because no pinned shared canonicalization exists | none — complete |
| done | **SPEC-67** — Story world-index edge parity, consumer-scoped (`archive/specs/SPEC-67-story-world-index-edge-parity.md`) | Added only consumer-backed story edges (`STSEC.protected_mystery_refs`/`source_records`, `OBL.owed_by/owed_to`, `CNSQ/THR.derived_from`, `STCHAR.superseded_by`); documented the rest as intentionally non-indexed | none — complete |

SPEC-65, SPEC-66, and SPEC-67 are archived as completed independent slices.

## Out of scope (second iteration — see companion triage record)

- **#1** story-record registry framework — **rejected** (contract is the source of truth; ~3 verified
  divergences fixed directly in archived SPEC-65; registry is overengineering per §18/§5b). Archived
  SPEC-65 §2.4 adds a lightweight parity snapshot test instead.
- **#4** expand `STCHAR_RELEVANT_OPS` — **rejected (moot)**: existing STCHAR validators don't read the
  added classes' bodies; only has teeth if #9 lands.
- **#9** `character_grounding_consistency` (deterministic) — **rejected**: conflates "has bound STCHAR"
  with "is persona-shaped"; would fire near-universally and make STCHAR the floating-justification
  record the report's own §5/§18 forbid. Judgment form already in prose-attach `profile_fidelity[]`.
- **#8** `stchar_binding_consistency`, **#11** direct-write-class docs — **already-resolved** (SPEC-59
  reciprocity/supersession validators; FOUNDATIONS §Story Bundles §4).
- **#12** STCHAR section projections — **deferred** (still no consumer); `SLT.effects` narrowing —
  **deferred** (no demonstrated misuse; see SPEC-65 §3).
