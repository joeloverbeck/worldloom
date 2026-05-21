# Historical — superseded by the merged SPEC-58/59/60/63 STCHAR contracts; retained for audit trail

# Triage — STCHAR Audit (First Iteration)

**Date:** 2026-05-21
**Source report:** `reports/stchar-audit-first-iteration.md` (ChatGPT-Pro, audit of merged SPEC-56/57 STCHAR work)
**Method:** every codebase claim verified against `main` via parallel Explore agents (file:line evidence). ChatGPT-Pro inspected `main` by eye without cloning, so each "current implementation status" cell was treated as a hypothesis until confirmed.
**Deliverables:** SPEC-58, SPEC-59, SPEC-60 + `specs/IMPLEMENTATION-ORDER.md`

## Reframing corrections (verification overturned the report)

1. **I1 is refuted.** ChatGPT-Pro's headline "Important" finding — that
   `no_char_authority_in_story_runtime` "only applies to a subset of ops/paths" — is **false**.
   `no-char-authority-in-story-runtime.ts:22-47` enumerates **all 25 story-runtime record types**
   (including relationships, beliefs, facts, intentions, storylets, status, secrets, questions,
   clocks, artifacts) **plus** page-plan and prose-receipt text surfaces. The only uncovered
   surfaces are health-audit/promotion-ledger *markdown* outputs, which are not `_source` records
   and lie outside the validator's record-scan model.

2. **C4's severity is overstated.** ChatGPT-Pro: making `active_records.STCHAR` optional "undercuts
   the whole authority model." It does not — `stchar_active_for_bound_stent`
   (`severity_mode: "fail"`) already hard-fails any active non-background STENT whose bound STCHAR
   is not active on the page. C4 is **snapshot-shape hardening**, not an authority-hole fix.

3. **C5's gap is narrower than claimed.** The prose-receipt schema **already defines**
   `char_authority_leak`, `stchar_authority[]` (3 required hashes), and `profile_fidelity[]`
   (`prose-receipt.schema.json:34-196`). They are merely *optional* and lack an executable validator
   beyond schema-shape. The "move from prose discipline into validation" framing implies more is
   missing than is.

## Verdicts

### accept → SPEC-58 (contract-to-enforcement drift, existing surfaces)

| Item | Verdict | Grounds |
|---|---|---|
| C1 — `state_delta_class_integrity` omits STCHAR | accept | `state-delta-class-integrity.ts:12-60` omits STCHAR; contract `story-state-contract.md:216` says they "must move together." |
| C2 — mid-story introduction omits STCHAR | accept | `midstory-introduction-utils.ts:4` / `midstory-record-introduction-grounding.ts:6` omit STCHAR; contract `:212-233` lists it as an allowed intro class. Policy resolved: add support (not forbid). |
| C3 — `SREL.derived_from[]` rejects STCHAR | accept | `story-relationship.schema.json:75-78` excludes STCHAR; contract `story-record-schemas.md:555-560` says to use it. |

### accept-with-modification

| Item | Verdict | Modification scope |
|---|---|---|
| C4 — require `active_records.STCHAR` | accept-with-modification → SPEC-58 | Implement as snapshot-shape hardening (require key, drop warn-only). Predicated on no legacy pre-STCHAR bundles. |
| C5 — executable page-plan/prose validators | accept-with-modification → SPEC-59 | Schema blocks already exist; scope to (a) make `char_authority_leak` required, (b) add `page_plan_stchar_packet_integrity` + `prose_receipt_stchar_integrity`. Keep fidelity judgment-assisted. |
| I3 — structured predicate-arg edge extraction | accept-with-modification → SPEC-60 | Real bug (`atomic.ts:1422-1430`) but **general** (all classes), not STCHAR-specific. Frame class-agnostically. |
| I5 — stale docs | accept-with-modification → SPEC-60 | Obsolete/archive `story-character-dossier-retrieval-concerns.md`; update `MACHINE-FACING-LAYER.md` + `CONTEXT-PACKET-CONTRACT.md`. **Do not** edit the historical STCHAR migration reports. |

### accept (confirmed gaps ChatGPT-Pro did not elevate)

| Item | Verdict | Grounds |
|---|---|---|
| Patch-engine stale-index omits STCHAR path | landed → `archive/tickets/SPEC60STCHARMACLAY-003.md` | `tools/patch-engine/src/apply.ts` now watches `stories/%/story-characters/%.md` in addition to world-level hybrids. |
| I4 — `story_character_profile` MCP task profile | accept → SPEC-60 | `ranking/profiles/index.ts:19-35` omits it; `story-character-profile/SKILL.md:160` calls it. |
| reciprocity + cast_bind_list validators | accept (small) → SPEC-59 | One-way STENT→STCHAR resolution only; no reciprocal check; no cast_bind_list validator. |

### refuted-by-verification

| Item | Verdict | Verification source |
|---|---|---|
| I1 — expand direct CHAR authority guard | refuted-by-verification | `no-char-authority-in-story-runtime.ts:22-47` already covers all 25 story-runtime classes + prose surfaces. |

### reject

| Item | Verdict | Alternative path |
|---|---|---|
| I2 — narrow over-broad ID unions to exclude STCHAR | reject | Contract uses broad `<record_id>` deliberately; exclusion needs a contract amendment (FOUNDATIONS §5b) and there is no evidence of misuse. The genuine `^[A-Z]+-[0-9]+$` hygiene issue in `story-secret.source_records[]` / `story-question.answer_records[]` is a separate, non-STCHAR schema-hygiene task. |
| §7 — add template body sections | reject | Contradicts the report's own diagnosis ("template is already strong; the gap is validator readability"); no validator consumer; adds authoring burden (YAGNI + report §14). |

### defer

| Item | Verdict | Deferred to |
|---|---|---|
| `stchar_body_contract` (body re-hash) | defer | Audit-driven backfill; SPEC-59 uses declared-vs-stored hash equality, no body re-hash needed yet. |
| N1 — STCHAR section projections | defer | Audit-driven backfill keyed to a concrete page-plan-packet-assembly consumer. |
| N3 — packet sufficiency rubric | defer | Low-value judgment rubric. |
| N2 — Phase 2m fixture suite | folded | Not standalone; folds into each spec's test requirements. |

## Named assumptions

1. No production story bundles predate STCHAR → C4 can require the key without a migration window.
2. The `^[A-Z]+-` schema-hygiene cleanup is out of scope for this STCHAR audit.
3. The STCHAR migration reports (`stchar-implementation/audit-first-iteration.md`) stay as-is (historical).
