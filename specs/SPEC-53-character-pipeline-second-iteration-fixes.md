<!--
SPEC-53: Character Pipeline — Second-Iteration Implementation Fixes
Delta against SPEC-52 (Protagonist-Grade Character Pipeline, archived/implemented 2026-05-20).
Source audit: reports/deepening-characters-second-iteration.md (ChatGPT-Pro, second iteration).
-->

# SPEC-53: Character Pipeline — Second-Iteration Implementation Fixes

**Status:** proposed
**Date:** 2026-05-20
**Predecessor:** SPEC-52 — Protagonist-Grade Character Pipeline (archived; this spec is a focused delta on its landed deliverables)
**Source audit:** `reports/deepening-characters-second-iteration.md`

---

## Problem Statement

SPEC-52 landed the protagonist-grade character pipeline (shared engine doctrine, `propose-new-characters`, the new `deepen-character-proposal` skill, `character-generation` anti-flattening, NCP/NCB schemas, the `character-memorability-structure` validator, and world-index NCP/NCB parsing). A second-iteration audit found the design intent landed but surfaced two concrete implementation seams plus several smaller refinements. Verification against the codebase confirmed:

1. **The `deepen-character-proposal` skill produces schema-invalid cards.** Its `templates/upgraded-proposal-card.md` emits a deepening-specific `critic_pass_trace` (`seed_essence_extractor`, `world_pressure_mapper`, `blandness_executioner`, `protagonist_grade_critic`) and an **object-array** `upgrade_lineage.rejected_directions_audit`. The NCP schema (`character-proposal-card.schema.json`) requires the **batch** critic trace (`criticPassTrace` def, `additionalProperties:false`) and a **string-array** audit. Every upgraded card therefore fails AJV validation in two places. The existing fixtures test (`character-proposal-schema-fixtures.test.ts`, "single-seed upgrades without batch_id") masks this — it sets `origin_kind: upgraded_seed` but keeps the batch trace and a string audit, a shape the template never emits. This is the missed analog of the "schema/skill coupling" risk SPEC-52 flagged for batch cards.

2. **MCP targeted retrieval does not expose NCP/NCB**, although the world-index first-classes them. `get_record` (`HybridRecordKind`, `HYBRID_RECORD_ID_PATTERN`, `NODE_TYPE_TO_HYBRID_KIND`, `validateRecordId`) and `list_records` (`SUPPORTED_LIST_RECORD_TYPES`, `RECORD_TYPE_TO_NODE_TYPE`) recognize only `CHAR`/`DA`/`PA`. SPEC-52 §Out of Scope deferred only a *new MCP task type / context-packet entry* — not hybrid get/list support — so this is an unfinished completeness gap, not a deferred item. No current workflow breaks (dedup uses INDEX scans; the deepening skill reads its source by file path), so this is High, not Critical.

Three smaller items: the structural validator's rejected-directions-audit check covers only `upgraded_seed` and not `user_seed`; the anti-flattening path lacks fixtures and persists no NCP→CHAR provenance id; the Phase 13 composition slot is named ambiguously.

### Key design decisions

- **Reconcile schema to the existing template, not the reverse.** The deepening template's richer audit shape is the intended radicalization surface; the report's own §16 warns that forcing authors to collapse it into strings would weaken deepening. The schema accepts both shapes (string array for batch cards; object array for upgrade/user-seed cards), keyed on `upgrade_lineage.origin_kind`. Batch-generated cards must remain valid (regression guard).
- **Do NOT broaden NCP body-section structural validation.** SPEC-52 Phase 5 item 6 deliberately decided NCP body prose is *not* heading-checked because the engine lives in `memorability_profile` frontmatter (AJV-validated). Re-adding `Niche Analysis` / `Canon Safety Check Trace` / six-section heading checks (audit finding H1a) is rejected as validation bureaucracy that the audit itself warns against. Only the `user_seed` parity gap (H1b) is closed.
- **Anti-flattening stays an LLM-critic responsibility.** There is no LLM-in-the-loop deterministic test harness; the semantic preservation check already exists as `character-generation` Phase 8 Test 17 + the Phase 9 tradeoff summary. This spec adds only fixtures, a persisted provenance id, and a structural (not semantic) preservation check.
- **MCP NCP/NCB exposure is purely additive** to the two tool maps + one id pattern + one error string. No new task type, ranking profile, or context-packet entry (those remain deferred per SPEC-52).

---

## Approach

### Phase 1 — Reconcile NCP schema with the deepening template (C1) — Critical

**Implementation note (2026-05-20):** `archive/tickets/SPEC53CHAPIPSEC-001.md` landed this phase's schema/test seam. The NCP schema now accepts the deepening template's upgrade critic trace and object-shaped rejected-directions audit while preserving the batch trace path; validators package tests cover the upgraded positive fixture, origin-kind/trace mismatches, rejected-directions minimum, batch regression, and the updated legacy full-world baseline.

**Files**
- `tools/validators/src/schemas/character-proposal-card.schema.json` (edit)
- `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (edit — real upgraded fixtures)

**Work**
1. Add `$defs.batchCriticPassTrace` = the current `criticPassTrace` shape (the ten batch phases, `additionalProperties:false`). Add `$defs.upgradeCriticPassTrace` (`additionalProperties:false`, required `seed_essence_extractor`, `world_pressure_mapper`, `blandness_executioner`, `protagonist_grade_critic`, each `nonEmptyString`).
2. Add `$defs.rejectedDirectionAuditEntry` (`additionalProperties:false`, required `direction`, `preserved_essence` (array minItems 1 of `nonEmptyString`), `mutation_attempted`, `rejection_reason`).
3. Make the root `critic_pass_trace` property accept `oneOf: [batchCriticPassTrace, upgradeCriticPassTrace]` (covers cards lacking `upgrade_lineage`).
4. Change `$defs.upgradeLineage.properties.rejected_directions_audit` to `oneOf: [stringArray, {type: array, items: rejectedDirectionAuditEntry}]`.
5. Add root-level `allOf` conditionals keyed on `upgrade_lineage.origin_kind`, preserving the existing `canon-requiring` conditional:
   - `origin_kind ∈ {upgraded_seed, user_seed}` ⇒ `critic_pass_trace` is `upgradeCriticPassTrace` AND `upgrade_lineage.rejected_directions_audit` is an object array with `minItems: 3`.
   - `origin_kind == batch_generated` (or `upgrade_lineage` absent) ⇒ `critic_pass_trace` is `batchCriticPassTrace`.
   The two mechanisms are intentionally complementary: the origin-kind-keyed `if/then` governs the common case (cards carrying `upgrade_lineage`) and yields actionable AJV errors pointing at the offending field, while the property-level `oneOf` (item 3) is the fallback that constrains `critic_pass_trace` to one of the two valid shapes for any card that omits `upgrade_lineage` entirely (it is optional — not in the schema's root `required`).
6. **Regression guard:** batch cards (`origin_kind: batch_generated`, batch trace, string audit — the current `validCard()` fixture) must still validate.

**Acceptance**
- A fixture copied from `upgraded-proposal-card.md` (no `batch_id`; deepening trace; ≥3 object-shaped rejected directions) validates.
- The batch-card fixture still validates.
- A card with `origin_kind: upgraded_seed` but fewer than 3 rejected directions fails.
- A card with `origin_kind: upgraded_seed` carrying the batch trace fails (and vice versa).

### Phase 2 — MCP NCP/NCB hybrid retrieval (C2) — High

**Implementation note (2026-05-20):** `archive/tickets/SPEC53CHAPIPSEC-002.md` landed this phase's MCP retrieval seam. `get_record` now accepts NCP/NCB ids through the hybrid parser/projection path, `list_records` exposes `character_proposal_card` and `character_proposal_batch`, capability metadata and machine-facing docs name the proposal types, and `tools/world-mcp` tests cover NCP/NCB get/list behavior plus enum exposure.

**Files**
- `tools/world-mcp/src/tools/get-record.ts` (edit)
- `tools/world-mcp/src/tools/list-records.ts` (edit)
- corresponding MCP tool tests

**Work**
1. `get-record.ts`: extend `HybridRecordKind` with `"character_proposal_card" | "character_proposal_batch"`; extend `HYBRID_RECORD_ID_PATTERN` to `/^(?:CHAR|DA|PA|NCP|NCB)-\d+$/` (note the correct `\d+` — the audit's §14.2 candidate edit has a `-d+$` typo; do not copy it); add `character_proposal_card`/`character_proposal_batch` to `NODE_TYPE_TO_HYBRID_KIND`; update the `validateRecordId` expected-message text to list `NCP-<integer>`, `NCB-<integer>`.
2. `list-records.ts`: add `"character_proposal_card"`, `"character_proposal_batch"` to `SUPPORTED_LIST_RECORD_TYPES` and to `RECORD_TYPE_TO_NODE_TYPE`.
3. Confirm `parseHybridFile` / `deriveHybridTitle` handle NCP/NCB frontmatter (title falls back to `node_id` via `proposal_id`/`batch_id`).

**Acceptance**
- `get_record("NCP-1", world_slug)` returns frontmatter + body sections; `get_record("NCP-1", …, section_path="frontmatter.memorability_profile")` projects.
- `list_records(world_slug, record_type="character_proposal_card", include_full_body=true)` returns parsed cards; `record_type="character_proposal_batch"` returns batches.
- Invalid-record-type / invalid-id error messages now list the proposal types.

### Phase 3 — Validator parity for user-seed cards (H1b) — High

**Files**
- `tools/validators/src/structural/character-memorability-structure.ts` (edit)
- its test file (edit)

**Work**
1. Extend the rejected-directions-audit check (`proposalVerdicts`, currently `origin_kind === "upgraded_seed"` only) to cover `user_seed` as well — both require the `## Rejected Directions Audit` heading.
2. For `origin_kind ∈ {upgraded_seed, user_seed}`, add a structural check that `upgrade_lineage.rejected_directions_audit` is an array with ≥3 entries, emitting an actionable `rejected_directions_audit_min_items` verdict. This intentionally mirrors the Phase 1 schema `minItems: 3` rule at the structural layer — the same deliberate defense-in-depth as the existing `canon-requiring` implied-facts check, which is enforced in **both** the NCP schema's `allOf` and `character-memorability-structure.ts`'s `proposalVerdicts`; the structural verdict gives a clearer per-field message than the bare AJV failure.
3. **Do not** add NCP body-section heading checks beyond the existing `Rejected Directions Audit` — SPEC-52 Phase 5 item 6 deliberately keeps NCP body prose unchecked (engine validated in frontmatter).

**Acceptance**
- A `user_seed` NCP lacking `## Rejected Directions Audit` fails.
- An upgraded/user-seed NCP with fewer than 3 rejected directions fails.
- Batch-generated NCP cards are unaffected.

### Phase 4 — Anti-flattening provenance + fixtures (H2, scoped) — High

**Files**
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` and `SKILL.md` (edit — persist provenance; **load-bearing change**)
- `tools/validators/src/schemas/character-frontmatter.schema.json` (optional / documentation-only — `source_basis` is already an open object, so the field is accepted without a schema change; edit only to document the recognized field)
- new controlled NCP/CHAR fixtures + a structural test

**Work**
1. Persist NCP→CHAR provenance: when a CHAR is generated from an NCP, record the source proposal id under `source_basis.source_proposal_id`. The load-bearing change is the `character-generation` Phase-0 / SKILL prose that emits the field — `source_basis` is declared `{type: object}` (open; the top-level `additionalProperties: false` does not reach into it), so the id is already accepted with no schema change required. Today `input_memorability_contract.source_proposal_id` is a Phase-0 working artifact that is dropped, leaving no auditable link.
2. Add controlled NCP fixtures with sharp `memorability_profile` blocks (e.g., "beloved institutional monster", "erotic/status transgressor", "pathetic gatekeeper") for use by skill/validator tests.
3. Add a deterministic structural check that validates `source_basis.source_proposal_id` **format** (`^NCP-[0-9]+$`) when the field is present. A presence-check on `dramatic_core` would add nothing — `character-frontmatter.schema.json` already makes `dramatic_core` required at top level with all engine fields, `relational_charge` minItems 1, and `signature_scene_behaviors` minItems 3, so no valid CHAR can lack a populated `dramatic_core`. Semantic edge-preservation remains Phase 8 Test 17 / Phase 9, which already exist.

**Acceptance**
- A CHAR generated from an NCP records its `source_proposal_id`.
- A CHAR whose `source_basis.source_proposal_id` is present but malformed (not `^NCP-[0-9]+$`) fails the structural check. (A missing/empty `dramatic_core` is already rejected by the CHAR schema, independent of this check.)
- Semantic preservation continues to be enforced by the existing Phase 8 Test 17 + Phase 9 tradeoff summary (unchanged; documented as the responsible surface).

### Phase 5 — Critic-rationale substance + slot rename (M1, M2) — Medium

**Files**
- `.claude/skills/_shared-references/protagonist-grade-character-engine.md` and/or the proposal/deepening critic-pass references (edit — M1)
- `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (edit — M2)

**Work**
1. (M1) Require Blandness Executioner and Protagonist-Grade Critic PASS rationales to name: one concrete world pressure, one scene behavior, one cannot-swap reason, and one rejected weaker alternative. This is skill-prose tightening on top of the existing "bare PASS = FAIL" rule; **no** new deterministic gate (avoids the validation-bureaucracy risk).
2. (M2) Rename the Phase 13 slot "Protagonist-grade load-bearing character" to a name that cannot be misread as "only one card is protagonist-grade" (e.g., "highest-intensity load-bearing anchor"). Confirm no surrounding phase wording implies protagonist-grade is optional for other cards.

**Acceptance**
- Critic-pass guidance shows the four-element rationale requirement.
- No phase wording implies protagonist-grade applies to a single slot only.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Machine-Facing Layer (validators are executable enforcement) | aligns | C1 fixes a validator/schema that wrongly rejects valid authored output; a schema that rejects the skill's own template is a correctness defect in the enforcement surface. |
| §Tooling Recommendation / §Canonical Storage Layer (typed retrieval over indexed nodes) | aligns | C2 completes targeted retrieval for nodes the world-index already first-classes, honoring "skills read records via typed MCP retrieval" without raw-file reads. |
| Rule 6 (No Silent Retcons) / auditability | aligns | Phase 4's persisted `source_proposal_id` makes the NCP→CHAR derivation auditable rather than dropping the link after Phase 0. |
| Rule 2 (No Pure Cosmetics) / Rule 3 (No Specialness Inflation) | aligns | No change to capability/distribution or cosmetic-rejection semantics; M1 strengthens the critic rationale that enforces world-producedness. |
| §Story Bundles (world/story separation) | N/A (defensive) | No story-pipeline surface is touched; story bootstrap continues to consume CHAR ids. Listed defensively because the audit's §11 raised contamination risk; this spec introduces none. |
| Validation-test discipline (rationale required) | aligns | M1 extends the existing one-line-rationale rule; deterministic validators stay structural; literary judgment stays with the LLM critics. |

---

## Out of Scope

- Broadening NCP **body-section** structural validation (audit H1a) — explicitly rejected; contradicts SPEC-52 Phase 5 item 6's deliberate decision and the audit's own §16 anti-bureaucracy warning.
- Typed `dramatic_core`/`world_consistency` interfaces on `world-index` `CharacterDossier` (audit L1) — `world_consistency` is already declared; the interface is open; runtime + AJV already enforce shape; no TS consumer reads `dramatic_core`. Revisit only when such a consumer appears.
- A dedicated `character_proposal_upgrade` MCP task type, ranking profile, token budget, or context-packet entry (remains deferred per SPEC-52 §Out of Scope / Phase 6).
- Any LLM-in-the-loop automated semantic-preservation test harness (does not exist; semantic enforcement stays in Phase 8 Test 17 / Phase 9 skill prose).
- Any change to story-pipeline skills, capability/distribution validation semantics, or backward-compat migration for existing animalia records.

---

## Deliverables

1. Updated `tools/validators/src/schemas/character-proposal-card.schema.json` + real upgraded-card fixtures in `character-proposal-schema-fixtures.test.ts`.
2. Updated `tools/world-mcp/src/tools/get-record.ts` + `list-records.ts` + tests (NCP/NCB hybrid get/list).
3. Updated `tools/validators/src/structural/character-memorability-structure.ts` + test (user_seed parity + ≥3 rejected-directions structural check).
4. Updated `character-generation` Phase-0/SKILL prose (persist `source_basis.source_proposal_id` — load-bearing) + documentation-only edit to `tools/validators/src/schemas/character-frontmatter.schema.json` (recognized field; already accepted via open `source_basis`) + controlled NCP/CHAR fixtures + structural `source_proposal_id`-format check.
5. Updated critic-pass references (M1) + renamed Phase 13 slot in `propose-new-characters/references/phases-11-13-score-filter-diversify.md` (M2).

---

## Risks & Open Questions

- **Schema regression on batch cards.** The single highest risk: the origin-kind conditionals must keep batch-generated cards (the current `validCard()` shape) valid. Mitigated by an explicit regression fixture and the origin-kind-keyed `if/then` form.
- **Validation bureaucracy.** Mitigated by rejecting H1a and keeping M1 to skill prose; deterministic checks stay structural.
- **C2 consumer thinness.** No current workflow consumes `get_record(NCP-…)`; it is completeness/uniformity. If the user prefers, Phase 2 can be deferred without affecting Phases 1/3/4/5. Open question: confirm the first concrete consumer (likely `propose-new-characters` Phase 10d dedup migrating from INDEX scans, or `deepen-character-proposal` source read by id).
- **Provenance field placement (Phase 4).** Resolved: persist `source_proposal_id` under `source_basis` — it is an open object (`{type: object}`), so the field is accepted without a schema change, whereas a typed top-level field would require a `required` / `additionalProperties` migration on existing dossiers.
- **Sequencing.** Phase 1 (schema accepts object audit) should land before Phase 3's ≥3-object structural check, so the two layers agree.

---

## Test Plan

**Schema (AJV):** upgraded-template fixture validates; batch-card fixture still validates; `upgraded_seed`/`user_seed` with <3 rejected directions fails; mismatched trace-vs-origin_kind fails; `canon-requiring` with empty `implied_new_facts` still fails (unchanged).

**MCP:** `get_record(NCP-1)` and `get_record(NCB-1)` return hybrid bodies; section-path projection works on NCP frontmatter; `list_records` returns cards/batches with `include_full_body`; error messages list the proposal types.

**Structural:** `user_seed` NCP without `## Rejected Directions Audit` fails; upgraded/user-seed NCP with <3 rejected directions fails; batch NCP unaffected; NCP body prose still NOT heading-checked beyond the rejected-audit section.

**Anti-flattening:** NCP-derived CHAR records `source_proposal_id`; a present-but-malformed `source_proposal_id` fails the structural format check (`dramatic_core` completeness is already schema-enforced); Phase 8 Test 17 + Phase 9 remain the semantic surface.

**Skill prose (manual):** critic-pass rationale guidance shows the four required elements; Phase 13 slot rename carries no "single protagonist-grade card" implication.

Every validation-test PASS entry requires a one-line rationale; a bare PASS is treated as FAIL.

## Outcome

_(pending implementation)_
