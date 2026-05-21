# Triage — STCHAR audit (second iteration)

**Date:** 2026-05-21
**Source report:** `reports/stchar-audit-second-iteration.md` (ChatGPT-Pro, 19 sections, 13 proposed improvements)
**Prior decision record:** `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md` (this triage is a delta against it)
**Method:** every load-bearing codebase claim verified against actual schema/validator/parser source on `main`, against the first-iteration triage, and against the merged SPEC-58/59/60/63.

## Lead correction

The report audits the "current merged implementation" but does not reconcile against the
first-iteration triage decisions or the just-merged STCHAR specs (SPEC-58/59/60/63). Several
Critical/Important proposals are already implemented, already rejected on stated grounds, or
contradict the report's own §18 anti-patterns. The genuinely-new, FOUNDATIONS-aligned set is three
specs (SPEC-65/66/67).

## Verdicts

### Accept → SPEC-65 (story schema↔contract parity hardening)

| Item | Verdict | Rationale |
|---|---|---|
| #2 narrow `SE.state_delta` | accept | Verified drift: schema allows `SE/PG/BR/CHC/SLT`; contract restricts to the 18 lifecycle-managed active-state classes. Contract is authoritative (FOUNDATIONS §5b) → correctness fix. |
| #3 narrow `SE.commitment.alias_bindings` | accept | Verified drift: schema allows the same over-broad union; contract restricts to precondition-bindable + `CLK/STSEC/STQ/STPLAN/STEMO`. STCHAR-as-alias is forbidden by §6.1. |
| #6 harden `PG.active_records` | accept-with-modification | **Modification:** add `additionalProperties: false` (catches typo-bucket silent state loss — real value); **drop** "require all 18 keys" (empty-required-arrays are boilerplate, tension §5b). Keep SPEC-58's `STCHAR` required. |
| #10 packet-authority boundary | accept (folded) | One-line §16a contract clarification; codifies existing behavior. Folded into SPEC-65 §2.5. |
| #13 historical report headers | accept (folded) | Doc hygiene; folded into SPEC-65 §2.5. Do NOT touch the `bound_char_id` validator (current enforcement). |

### Accept → SPEC-66 (STCHAR body-integrity validator)

| Item | Verdict | Rationale |
|---|---|---|
| #5 `stchar_body_integrity` | accept-with-modification (**reverses a first-iteration deferral**) | Verified: no `stchar-body-integrity.ts` exists; STCHAR is the load-bearing authority record yet nothing validates its own structure. Deferral condition ("await a concrete consumer") satisfied — the consumer is authority-record integrity. **Modification:** ship the safe checks (13 H2 sections present + non-empty + hash-shape); make the hash-*recompute* check contingent on a pinned canonicalization (else false mismatches). User confirmed reversal 2026-05-21. |

### Accept → SPEC-67 (story world-index edge parity, consumer-scoped)

| Item | Verdict | Rationale |
|---|---|---|
| #7 missing world-index edges | accept-with-modification | Verified: STLOC/STOBJ/CNSQ/story-DA have zero edge functions. **Modification:** add only consumer-backed edges (`STSEC.protected_mystery_refs`, `STSEC.source_records`, `OBL.owed_by/owed_to`, `OBL/CNSQ/THR.derived_from`, `STCHAR.superseded_by`); document the rest (`STSTAT.location`, `STOBJ.owner/current_location`, `STLOC.bound_ent`, `CLK.thresholds[].effects`) as intentionally non-indexed. **Correction:** `STQ.source_event/answer_event` are NOT missing — already emitted as `story_question_source`/`story_question_answer_record`. |

### Reject

| Item | Verdict | Rationale |
|---|---|---|
| #1 story-record registry framework | reject (framework) | Contract (`story-record-schemas.md` §4) is already the single source of truth; verified divergences are only ~3 surfaces, fixed directly in SPEC-65. A cross-layer registry module + generator is the over-engineering §18/§5b warn against. SPEC-65 §2.4 adds a lightweight parity snapshot test instead. |
| #4 expand `STCHAR_RELEVANT_OPS` | reject (moot) | Verified: existing STCHAR validators inspect only STENT/PG/STCHAR; none read SREL/BEL/STINT bodies. No-CHAR-leakage already scans prose surfaces; structured story-record schemas reject world `CHAR-*` by pattern. Expanding the op set only has teeth if #9 lands — and #9 is unsound. (Mirrors the first triage's refuted I1.) |
| #9 `character_grounding_consistency` (deterministic) | reject | The "deterministic default" (require STCHAR grounding whenever a holder/actor has a bound STCHAR) conflates "has bound STCHAR" with "is persona-shaped." Every non-background STENT requires a bound STCHAR, so the validator fires near-universally, forcing STCHAR into `derived_from` everywhere — the "floating justification record" the report's own §5/§18 forbid. The contract makes STCHAR grounding *selective* ("when persona-shaped" — judgment). Judgment form already lives in prose-attach `profile_fidelity[]`. |

### Already resolved / confirms-existing-position (no action)

| Item | Verdict | Rationale |
|---|---|---|
| #8 `stchar_binding_consistency` | already-resolved | Both proposed checks exist: `stchar-bound-stent-reciprocity.ts` (reciprocal binding, SPEC-59) + `stchar-supersession-integrity.ts` (no superseded STCHAR active). |
| #11 document direct-write classes | confirms-existing-position | FOUNDATIONS §Story Bundles §4 already documents SLB/SAU/SP/RSP as direct-write markdown surfaces. At most a one-line envelope-doc cross-reference (not spec-worthy). |
| §16a/prose-receipt enforcement, offstage tier, MCP task profile, predicate edges, docs reconciliation | already-resolved | Shipped in SPEC-59/60/63. Report's praise is accurate. |
| §18 anti-patterns | confirms-existing-position | Fully FOUNDATIONS-aligned (no arc/drama-manager, no STCHAR-as-universal-evidence, no word ceilings, no auto-promotion). |

### Defer (unchanged from first triage)

| Item | Verdict | Rationale |
|---|---|---|
| #12 STCHAR section projections | defer | First triage deferred (N1) "no consumer"; still none. |
| SLT.effects/likely_effects narrowing | defer | `effectReference` already permits any world ID via the generic arm, but no demonstrated misuse and SLT effects resolve through preconditions at authoring time. Lower value than SPEC-65 §2.1–2.3. Deferred pending a concrete misuse case (noted in SPEC-65 §3). |

## Deliverables

- `archive/specs/SPEC-65-story-schema-contract-parity-hardening.md`
- `specs/SPEC-66-stchar-body-integrity-validator.md`
- `specs/SPEC-67-story-world-index-edge-parity.md`
- `specs/IMPLEMENTATION-ORDER.md` updated (new "STCHAR audit (second iteration)" section).

All three are independent (no inter-spec build dependency) and may be scheduled in parallel.
