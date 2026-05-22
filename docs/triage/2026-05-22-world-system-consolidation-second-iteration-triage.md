# Triage — World-System Consolidation, Second Iteration

**Date:** 2026-05-22
**Source report:** `archive/reports/world-system-consolidation-second-iteration.md` (ChatGPT-Pro)
**Triage method:** every claim verified against `main` via parallel codebase exploration; verdicts grounded in code/contract/FOUNDATIONS, not the report's self-assessment.
**Deliverables:** `archive/specs/SPEC-68` (Fault 3, corrected), `archive/specs/SPEC-69` (Fault 6, corrected). `specs/IMPLEMENTATION-ORDER.md` created and now records the completed batch.

## Headline finding — the report is substantially stale

The report was generated against a tree **predating SPEC-64** (world-system-compatibility-and-artifact-maturity-validation, PR #88) and **VALDA-001/002/003** (PR #90), both merged within ~24h of this triage. Its §5 "landed-surface check" omits `index_disk_consistency` and the `world-validate --compatibility` CLI mode, which already exist. It also re-proposes a finding the **first** iteration deliberately closed as YAGNI (`resolution_intent`), and re-litigates two SPEC-61 triage rejections (the `user_approved` rename and the `maturity_level` frontmatter field).

The first-iteration report (`world-system-consolidation-first-iteration.md`) was already triaged into **SPEC-60/61/62/63** plus follow-on **SPEC-64** and the **VALDA** tickets. This triage frames the second iteration as a delta against that landed work.

## Verdicts

### Accept (warranted → spec)

| ID | Fault | Verdict | Correction applied | Deliverable |
|---|---|---|---|---|
| F3 | DA `claim_map` untyped; 4 loose objects | **accept-with-modification** | Type against the **real** template vocabulary (`canon_status`/`narrator_belief`/`source`/`cf_id`/`mr_id`), NOT the report's invented `DAC-*`/`claim_kind`/`canonization_allowed` schema (which would break the skill). No new validator — `if/then` in the schema, enforced by existing `record_schema_compliance`. `world_relation` already typed (report missed it). | SPEC-68 |
| F6 | INDEX surfaces uncovered | **accept-with-modification** | Validator already exists (`index_disk_consistency`); this **extends coverage** to `adjudications/`, `characters/`, `diegetic-artifacts/`. Slug-named `CHAR`/`DA` files need a non-ID membership predicate (report glossed this). `world-proposals/` (root-level) out of scope. | SPEC-69 |

### Reject — honor prior committed decision

| ID | Fault / Rec | Verdict | Grounds |
|---|---|---|---|
| F5 + R4 | cross-surface mystery validator + `resolution_intent` enum | **reject** | `archive/tickets/SPEC62FOUANDDOC-003.md` §Out of Scope: *"The `resolution_intent` enum + `mystery_policy_validator` — dropped (YAGNI)."* Re-proposed with no new evidence of harm. Honored, not reversed. The report itself files it under §14 deferred research. |

### Already resolved (stale — no action)

| ID | Fault / Rec | Grounds |
|---|---|---|
| F10 + R5 | strict world-system compatibility CLI | `world-validate --compatibility` runs the compatibility validator subset fail-fast (SPEC-64, `tools/validators/src/cli/_helpers.ts`). |
| F2 (strictness) | maturity not strict | `artifact_maturity` fails under pre-apply, warns full-world; path/prefix-derived by deliberate SPEC-64 choice. |
| R1 (FOUNDATIONS text) | approval-vocabulary discipline | Already present at FOUNDATIONS line 101 (landed by SPEC-62). |

### Reject — YAGNI / no consumer / contradicts intentional design

| ID | Fault / Rec | Grounds |
|---|---|---|
| F1 + R1 | split `user_approved` into ~7 named fields | Mechanical review≠canon safety already enforced by `approval_semantics` + `artifact_maturity` + FOUNDATIONS line 101; artifact type/path already disambiguates the boolean. **Explicitly rejected at SPEC-61 triage** (its §Out of Scope) for the same blast-radius/no-consumer reasons. High churn (~10 schemas + validator + every skill + every example), marginal safety delta. |
| F7 | `world_story_leakage` validator | Verified: **no world-system schema contains** `page_id`/`act_position`/`plot_destiny` etc.; `narrative-shape-field-rejection` already fences the story records that could. A validator for a non-existent leak. |
| F9 | multi-CF genesis split | Contradicts the intentional "thin but concrete" genesis design (CF-1 anchor, ≥4 domains, 3 orders) and the report's own §3 "do not add more creative knobs." |
| F2 (shared-reference / `maturity_class` field) | shared maturity ref + schema constant | `maturity_level` frontmatter field **already rejected at SPEC-61 triage** (redundant with path/prefix derivation). A `_shared-references/` distillation is at most a nice-to-have. |

### Defer — legitimate but speculative/governance; own future cycle

| ID | Fault / Rec | Grounds |
|---|---|---|
| F8 | `docs/TAXONOMY-AUTHORITY.md` + `taxonomy_authority_consistency` + `mcp_skill_contract_consistency` contract-test harness | Genuinely useful drift-prevention, but large and speculative; the report itself tiers it moderate/nice-to-have. Warrants a dedicated brainstorm, not this pass. |
| F4 + R2 | split `proposed_status` into `proposal_route` + `proposed_cf_status` | Real modeling smell (`proposed_status` enum mixes CF statuses with `mystery_reserve`/`invariant_revision` record-class routes), but low demonstrated harm — `canon-addition` does not appear to dispatch on those values; they read as vestigial. Deferred at user's scope direction (chose F3 + F6). Revisit if a future skill needs route-based dispatch. |

## Notes on report quality (for future external-audit calibration)

- **Did not re-run the landed-surface check against current `main`** — the report's most consequential
  defect. Half its "blockers/majors" were already shipped or already rejected.
- **Invented a schema vocabulary** for the DA `claim_map` (`DAC-*`, `claim_kind`, `canonization_allowed`)
  that does not match the artifact the skill actually produces — adopting it verbatim would have broken
  the pipeline. The valid kernel survived only after re-grounding in `templates/diegetic-artifact.md`.
- **Strong general framing** (provenance, schema-closure, contract-testing lenses) and several genuinely
  correct gaps (F3, F6) — but conclusions must be verified against code, never trusted by inspection.
