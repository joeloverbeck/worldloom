# SPEC-58 — STCHAR Contract-to-Enforcement Reconciliation

**Status:** proposed
**Date:** 2026-05-21
**Classification:** story-canon-related (Skill Category 2c surface — branching-story pipeline)
**Source:** `reports/stchar-audit-first-iteration.md` §13 C1/C2/C3/C4 (verified against `main`)
**Depends on:** none — foundational; unblocks SPEC-59
**Companion:** `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`

## 1. Context

SPEC-56 (stchar-machine-foundation) and SPEC-57 (stchar-pipeline-integration) landed STCHAR
(story-local character authority, `STCHAR-<integer>`) as the runtime character-authority class.
The authoritative shared contract (`.claude/skills/_shared-templates/story-state-contract.md`,
`.claude/skills/_shared-templates/story-record-schemas.md`) permits STCHAR in several lifecycle
and derivation surfaces. **The JSON-schema and structural-validator layers drifted from that
contract**: lawful STCHAR records the contract explicitly permits are rejected, or are not
required where the contract treats them as load-bearing.

This spec corrects that drift on **existing** surfaces only. It adds no new validators (SPEC-59)
and touches no tooling (SPEC-60). Every change makes enforcement match the already-authoritative
contract — there is no contract amendment here.

## 2. Changes

### 2.1 C1 — `state_delta_class_integrity` accepts STCHAR lifecycle deltas

**Files:** `tools/validators/src/structural/state-delta-class-integrity.ts`

- Add `STCHAR` to the `STATE_DELTA_CLASSES` set (currently lines ~12–35; STCHAR absent).
- Add `story_character_authority_record` to the `STORY_RECORD_NODE_TYPES` node-type mapping
  (currently lines ~37–60; absent).

**Contract basis:** `story-state-contract.md:216` — *"`SE.state_delta.create[]`,
`supersede[]`, and `close[]` accept the same lifecycle-managed story-state class set, including
`STCHAR`, `STPLAN`, and `STEMO`; the event schema and `state_delta_class_integrity` validator
must move together with this contract."*

**Acceptance:**
- `SE.state_delta.create/supersede/close` referencing a `STCHAR-<n>` id passes
  `state_delta_class_integrity`.
- An unknown / non-lifecycle class still fails.
- `stchar_supersession_integrity` still catches superseded/retired STCHAR independently.

### 2.2 C2 — Mid-story STCHAR introduction is validated, not rejected

**Files:**
- `tools/validators/src/structural/midstory-introduction-utils.ts`
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts`
- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md`
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`

- Add `"STCHAR"` to the `MidstoryIntroductionClass` union (`midstory-introduction-utils.ts:4`,
  currently `"CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "SREL" | "STPLAN" | "STEMO"`).
- Add `"STCHAR"` to the `INTRO_CLASSES` set (`midstory-record-introduction-grounding.ts:6`).
- Update the two turn-cycle reference docs to name STCHAR among the classes that may be carried on
  `SE.record_introductions[]`.

**Policy (resolved — no open choice):** The contract already decides this. STCHAR **is** an
allowed mid-story introduction class (`story-state-contract.md:212-233`: *"Mid-story creation of
`CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `STCHAR`, `SREL`, `STPLAN`, or `STEMO` records is recorded
on `SE.record_introductions[]`"*). The validator must **add support**, not forbid. ChatGPT-Pro's
"or explicitly forbid and route to profile skill" alternative is rejected as contract-contradicting.

**Acceptance:**
- A STCHAR carried on `SE.record_introductions[]` with grounding evidence is validated for
  evidence + resolution and passes.
- A STCHAR introduction with missing evidence fails grounding.
- Direct world `CHAR-*` operational authority in the same surface still fails
  (via `no_char_authority_in_story_runtime`).

### 2.3 C3 — `SREL.derived_from[]` accepts STCHAR

**Files:** `tools/validators/src/schemas/story-relationship.schema.json`

- Add `STCHAR` to the `derived_from[]` item pattern (currently lines ~75–78; the union of ~23
  prefixes excludes STCHAR).

**Contract basis:** `story-record-schemas.md:555-560` — *"Use `STCHAR` in `derived_from[]` when a
relationship's stable conduct, voice, pressure behavior, or appraisal pattern depends on
story-local character authority."*

**Acceptance:**
- An `SREL` with `derived_from: [STCHAR-1, BEL-3]` passes `record_schema_compliance`.
- An `SREL` with `derived_from: [CHAR-1]` still fails (world CHAR is not a story-runtime authority).
- Regression test added.

### 2.4 C4 — `active_records.STCHAR` is a required snapshot key (shape-hardening)

**Files:**
- `tools/validators/src/schemas/story-page.schema.json`
- `tools/validators/src/_helpers/state-snapshot-replay.ts`
- `tools/validators/src/structural/active-records-full-shape.ts`
- `tools/validators/src/structural/state-snapshot-integrity.ts`

- Remove `STCHAR` from `OPTIONAL_ACTIVE_RECORDS_CLASSES` (`state-snapshot-replay.ts:31-39`) so a
  missing STCHAR key is a structural **failure**, not a WARN.
- Add `"STCHAR"` to the `required` keys for `state_snapshot.active_records` in
  `story-page.schema.json` (currently `active_records` lists STCHAR among `properties` with no
  `required` array — lines ~49–72).
- Adjust `active-records-full-shape.ts` / `state-snapshot-integrity.ts` so the missing-key verdict
  for STCHAR is fail-level; empty array (`STCHAR: []`) passes when no non-background STENT is active.

**Scope note (reframed from the report):** ChatGPT-Pro framed C4 as "undercuts the whole authority
model." It does not. `stchar_active_for_bound_stent` (`severity_mode: "fail"`,
`stchar-active-for-bound-stent.ts`) **already hard-fails** any active non-background STENT whose
bound STCHAR is not active on the page. The authority guarantee is already enforced. C4 is therefore
**snapshot-shape hardening** — preventing a snapshot from omitting the STCHAR key entirely and
silently passing — not closing an authority hole. Implement at the lower urgency this reframing
implies.

**Precondition (named assumption):** no production story bundles predate STCHAR. If a legacy
bundle exists, this change needs a `migration_attestation`-style carve-out instead of an
unconditional required key — confirm before implementing.

**Acceptance:**
- A current snapshot missing the `STCHAR` key fails (not warns).
- `STCHAR: []` passes only when no active non-background STENT is present.
- An active non-background STENT with no active bound STCHAR still fails via the existing
  `stchar_active_for_bound_stent` validator (unchanged).

## 3. Test requirements

- `state_delta_class_integrity`: positive create/supersede/close STCHAR; negative unknown class.
- `midstory_record_introduction_grounding`: positive STCHAR intro with evidence; negative missing
  evidence; negative `CHAR-*` authority.
- `record_schema_compliance`: positive `SREL.derived_from: [STCHAR-…]`; negative `[CHAR-…]`.
- `active_records_full_shape` / `snapshot_replay_equality`: missing STCHAR key fails; `STCHAR: []`
  passes when no non-background STENT active; STCHAR delta replays.
- `recursive_reference_closure`: STCHAR references in `SREL.derived_from` and `SE.state_delta`
  resolve.

## 4. Out of Scope

SPEC-58 covers only the C1–C4 contract-to-enforcement drift items from
`reports/stchar-audit-first-iteration.md` §13. The report's remaining items are adjudicated in the
companion triage record (`docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`) and routed
as follows — none is silently dropped:

- **C5** (executable page-plan/prose STCHAR validators), STENT↔STCHAR reciprocity, and
  `cast_bind_list` integrity → **SPEC-59** (depends on this spec).
- **I3** (structured-predicate edge extraction), **I4** (`story_character_profile` MCP task
  profile), the patch-engine stale-index STCHAR path, and **I5** (stale docs) → **SPEC-60**
  (independent).
- **I1** (expand `no_char_authority_in_story_runtime`) — **refuted by verification**: the validator
  already covers all story-runtime record classes plus prose surfaces. No work.
- **I2** (narrow over-broad ID unions to exclude STCHAR) and **§7** (template body-section
  additions) — **rejected** (YAGNI / would need a contract amendment / contradicts the report's own
  diagnosis). No work.
- `stchar_body_contract`, N1 section projections, N3 sufficiency rubric — **deferred** (no current
  consumer).

Also out of scope here: migration handling for legacy pre-STCHAR story bundles. §2.4 assumes none
exist; if a legacy bundle is found, the C4 required-key change must instead route through a
`migration_attestation`-style carve-out, which is not designed in this spec.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale |
|---|---|---|
| §6.1 Story-Local Character Authority | aligns | Required `active_records.STCHAR` and lawful STCHAR lifecycle deltas keep STCHAR the operational runtime authority instead of falling back to world `CHAR`. |
| §5b Schema-Minimalism At Story Scope | aligns | Changes only reconcile enforcement to the *existing* contract field set; no new fields are added, and the authoritative field lists in `story-record-schemas.md` already declare every surface touched. |
| §4a Plan-Authority Boundary | aligns | Hardening the page-snapshot shape keeps page-plan-commit state authoritative and replayable. |
| Rule 1 (No Floating Facts) | aligns | STCHAR lifecycle deltas become validatable rather than silently mis-rejected, preserving grounded story-state authority. |
| §5b "amend the contract first" | N/A | No contract amendment is required — the contract already permits/requires every surface this spec touches; only enforcement is being brought into line. |

## 6. Definition of Done

- **C1** — `state_delta_class_integrity` accepts STCHAR `create`/`supersede`/`close` deltas; unknown classes still fail.
- **C2** — STCHAR is a valid `SE.record_introductions[]` class (validated for evidence + resolution); the two turn-cycle reference docs name STCHAR among the introducible classes.
- **C3** — `SREL.derived_from[]` accepts `STCHAR-<n>` and still rejects `CHAR-<n>`.
- **C4** — a current page snapshot missing the `active_records.STCHAR` key fails (not warns); `STCHAR: []` passes when no non-background STENT is active.
- All §3 test cases are added and green.
- `tools/validators` build + test suite passes (`npm run build && npm test` in `tools/validators`).
- No FOUNDATIONS Validation Rule is weakened — the changes only align enforcement to the existing shared story-state contract.
