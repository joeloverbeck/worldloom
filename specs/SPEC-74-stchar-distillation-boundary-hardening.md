# SPEC-74 — STCHAR distillation boundary hardening

**Status:** AUTHORED 2026-05-23
**Authored:** 2026-05-23
**Source report:** `reports/stchar-distillation-rework.md` §§4–10
**Companion triage:** [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md)
**Prior lineage:** `archive/specs/SPEC-70-char-stchar-semantic-preservation.md` (introduced `source_operational_fact_map` + `stchar_source_fact_coverage` + operational-home subsections); `archive/specs/SPEC-71-strip-stchar-tamper-hashes.md` (removed `profile_hash`, `voice_block_hash`, `page_packet_hash`, `source_char_hash`); `archive/specs/SPEC-73-page-packet-required-because-label-parsing.md` (multi-label `Required because` parsing).
**Related:** SPEC-75 (branch-aware STCHAR supersession — orthogonal scope split from this spec at triage time).

## 1. Overview

Close the two STCHAR distillation gaps surfaced by a recently observed authoring failure on `worlds/erotica-world/stories/red-bunny`: opening-page state was compressed into durable STCHAR profiles (temporal contamination), and stable operational source material outside the 10 structured `dramatic_core` fields was filtered out because the bootstrap prompt treated page-1 relevance as the inclusion test (semantic loss). The fix is skill/template wording hardening, one new schema field with a paired lifecycle validator, a new body subsection requirement with a paired inventory validator, a new temporal-reference-boundary validator using record-class references (not phrase heuristics), and a page-packet validator extension covering current-state grounding-record discipline.

The two bugs share a root cause — the bootstrap prompt mixes durable persona authority with opening-scene seed — and a fix surface (Phase 2 of `branching-story-bootstrap` plus the `story-character-profile` regenerate path). Bundling them in one spec preserves staging coherence: the wording changes (Stage 1) must land before the validators (Stages 2–6), or new validators emit noisy failures on previously-correct authoring patterns.

## 2. Context — verified evidence

### 2.1 What already exists (verified against `main` at SHA `de2f0c19`)

- **`source_operational_fact_map`** (`tools/validators/src/schemas/story-character-authority.schema.json:33-69`) tracks disposition for the 10 `dramatic_core` fields with enum `copied | transformed | compressed | omitted_with_rationale | story_irrelevant`. SPEC-70 landed this.
- **`stchar_source_fact_coverage`** (`tools/validators/src/structural/stchar-source-fact-coverage.ts:7-17`) inspects only `source.parsed.dramatic_core` for those 10 fields and forbids retained facts mapping to `Source Distillation` as operational home. Valid operational homes are the 11 H2s listed in `OPERATIONAL_TARGET_SECTIONS` (lines 23–35): `Story-Facing Identity`, `Stable Persona Core`, `Emotional Appraisal Map`, `Pressure Behavior`, `Voice Bible / Dialogue Authority`, `Page-Plan Voice Block`, `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`, `Story-State Derivation Guide`, `Prose Rendering Constraints`.
- **`stchar_body_integrity`** (`tools/validators/src/structural/stchar-body-integrity.ts:34-48`) currently requires three H3 subsections: `Operational capabilities and affordances` and `Capability limits, costs, and access constraints` under `Agency and Planning Tendencies`, plus `Signature scene behaviors to render` under `Prose Rendering Constraints`. SPEC-70 landed these.
- **`page_plan_stchar_packet_integrity`** (`tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:215, 222-229, 169-184`) parses `Required because` as a multi-token label set (SPEC-73), enforces voice-block requirement via set intersection with `{speaker, viewpoint, voice_shapes_page}`, enforces the `offstage_causal` locational guard via set membership, and emits WARN-only `unknown_role_label` for vocabulary outside the documented eight labels.
- **`no_char_authority_in_story_runtime`** (`tools/validators/src/structural/no-char-authority-in-story-runtime.ts:21`) blocks world-CHAR references appearing as authority in story runtime records.
- **STCHAR hash machinery is gone** — `profile_hash`, `voice_block_hash`, `page_packet_hash`, `source_char_hash` were all stripped by SPEC-71. The schema declares `additionalProperties: false`; the new `forbidden_stchar_tamper_hash_fields` validator prevents silent reintroduction.
- **`stchar_supersession_integrity`** uses page-ordinal logic (`tools/validators/src/structural/stchar-supersession-integrity.ts:33-42`); branch-ancestry rework is deferred to SPEC-75.
- **FOUNDATIONS §Story Bundles §6.1** already declares the doctrine: "World-level `CHAR-*` records remain story-agnostic. Story bundles that need character-specific behavior, voice, appraisal, or planning authority use story-local `STCHAR-*` profiles. Normal story runtime consumes active `STCHAR` profiles, not world `CHAR` dossiers." STCHAR is "not an epistemic access route".
- **Active STCHAR fixtures:** only `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` exist on main. No other bundle has STCHAR profiles yet.

### 2.2 The two genuine gaps

**Temporal contamination.** `story-character-profile/SKILL.md:31` lets `regeneration_reason` be "fidelity failure, story-state drift, or other reason" — the "or other reason" clause permits ordinary `STEMO`/`BEL`/`STPLAN`/`SREL` updates to be treated as regeneration triggers. `story-character-profile/SKILL.md:270` describes `Page-Plan Voice Block` as a "compact projection suitable for page-plan section 16a" — readable as "put a page packet into STCHAR". `branching-story-bootstrap/SKILL.md` Phase 2 produces STCHAR before Phase 4/5 produces state records, with no explicit temporal-state extraction pass — the authoring model can fold opening-scene state into the durable profile.

**Semantic loss.** `stchar_source_fact_coverage` only structures the 10 `dramatic_core` fields. CHAR dossiers also carry stable operational material in capabilities, embodiment, relationships, signature behavior prose, and voice examples. Those can be silently dropped if the bootstrap prompt treats opening-page relevance as the inclusion test. The user-reported failure on red-bunny is the empirical evidence.

Neither gap requires a new state class. The state-record taxonomy already exists. The fix is sharper routing at authoring time, one new schema field, and structural validators that catch the two failure shapes deterministically.

## 3. Out of Scope (deliberate)

| Item | Why excluded |
|---|---|
| Re-introducing any STCHAR tamper hash field (`profile_hash`, `voice_block_hash`, `page_packet_hash`, `source_char_hash`) | SPEC-71 removed all four with the explicit thesis that hashes do not detect contamination — they only detect tampering. Reintroducing them would reverse a recently-merged decision; the schema's `additionalProperties: false` plus the `forbidden_stchar_tamper_hash_fields` validator structurally prevent it. The source report's §6.3 / §6.5 / §6.12 verbatim text referencing these hashes is dropped; their non-hash substance (current-state grounding records, projection-vs-authority framing) survives in §4.3 / §4.5 / §4.12 below. |
| Re-spec'ing `Required because` multi-label parsing or `voice_shapes_page` voice-block requirement | Already-resolved by SPEC-73 at `page-plan-stchar-packet-integrity.ts:215, 169-184, 222-229`. The source report's §6.12 (1) and (2) duplicate landed work. |
| Hash-stability assertions on §16a projections ("cited active state records must not require an STCHAR hash change") | Refuted by SPEC-71 — there is no STCHAR hash to be stable. The source report's §6.12 (5) is dropped. |
| Branch-aware `stchar_supersession_integrity` rework | Deferred to SPEC-75. Orthogonal mechanism (branch-ancestry utilities), distinct test surface; bundling would inflate this spec without coupling benefit. |
| Promoting `story_irrelevant` rationale categories from prose to schema-structured frontmatter | Source report §11 Q4 acknowledges this is higher-blast-radius; the body-subsection inventory in §4.8 + §4.11 below structures the categories via validator, leaving the existing `source_operational_fact_map.rationale` schema string intact. |
| LLM-judgment semantic validators of STCHAR body prose | Per FOUNDATIONS §Tooling Recommendation, structural-reference validators only. All new checks in this spec use record-class id parsing or subsection presence — none parse free prose semantics. |

## 4. Changes

### 4.1 `story-character-profile/SKILL.md` — wording hardening

**Replace argument description at line ~31 (`regeneration_reason`)** with a constrained-vocabulary description naming the 5 valid reasons (`source_world_char_material_change`, `durable_branch_transformation`, `profile_fidelity_failure`, `story_local_character_promotion`, `stable_source_material_omission_repair`) and explicitly excluding ordinary state-record updates (`STEMO`, `BEL`, `STPLAN`, `STINT`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, `SE`, page-local prose) unless durably consolidated.

**Add new section after `## Modes`: `## Durable-Authority Boundary`** stating that STCHAR is a durable story-local character bible — not a root-page summary, opening-scene summary, compressed current-state packet, prose synopsis, or substitute for active story-state records. Include the inclusion rule (stable material that can lawfully shape future voice, conduct, appraisal, pressure behavior, agency, relationship behavior, perception, embodiment, capabilities, limits, or choices), the exclusion rule (any fact that would be false, stale, or branch-dependent after a different choice, later page, or sibling branch), and 3 paired durable-vs-transient examples. Include the explicit rule "Opening-page relevance is never the inclusion test."

**Replace `Page-Plan Voice Block` section requirement at line ~270** to characterize it as a "stable, context-free reusable voice-authority seed for page-plan §16a" describing durable voice behavior, dialogue constraints, silence behavior, pressure shifts, register, rhythm, taboo language, and anti-generic warnings that remain valid across branches until durable profile regeneration. Explicitly forbid mentioning the current page, opening scene, current event, current emotional state, current physical status, active page ids, active event ids, or active belief/plan/emotion/status/relationship records. Page-specific modulation belongs in page-plan §16a, grounded in active state records.

**Add new subsection under `## Source Distillation`: `### Stable Source Material Inventory`** as an authoring hard gate for `source_kind: world_char`. The inventory is a body table with 5 columns (`source_area`, `stable operational material`, `disposition`, `operational_home`, `rationale`) covering every loaded source area carrying stable operational character material — not just the 10 `dramatic_core` fields. Disposition vocabulary mirrors the schema enum (`copied | transformed | compressed | omitted_with_rationale | story_irrelevant`). For bootstrap `story_irrelevant`, the allowed rationale categories are `outside_story_scope`, `content_constraint`, `premise_incompatible`, `non_operational_trivia`, `duplicate_of_retained_material` — never `opening_not_relevant` or `not_needed_on_page_1`. Make explicit that `Source Distillation` is a provenance/compression-trace surface, not a retained operational home.

**Replace `regenerate` mode description** with the 5-reason constrained list, the exclusion list of ordinary state-record updates, and the rule that those become regeneration-worthy only after durable consolidation changes the character model. Use the same vocabulary that the new `regeneration_reason_class` schema field enforces.

### 4.2 `branching-story-bootstrap/SKILL.md` — Phase 1b + Phase 2 + Phase 4/5 + Phase 8

**Insert new `## Phase 1b: Extract Opening Temporal State and Build the Distillation Boundary Ledger`** between Phase 1 and Phase 2. The ledger is a working-memory prompt-process hard gate (not a persistent schema field) with 10 categorized rows naming what routes to STCHAR vs what routes to STSTAT/STOBJ/STLOC/PG snapshot, SE/THR/CNSQ/CLK/STSEC/STQ, STEMO, BEL, STINT/STPLAN, SREL, OBL/THR/CNSQ/CLK, page-plan §16a + prose plan, and Source Distillation / Stable Source Material Inventory / Validation Audit Anchors. The Phase 2 STCHAR draft consumes only the "Stable → STCHAR" row plus stable equivalents derived from transient facts. The Phase 4/5 initial-state creation consumes the temporal rows. Include the inclusion-test rule "Opening-page relevance is not an omission criterion. At bootstrap, future branches are unknown; stable operational source material should be retained unless it is genuinely outside the story scope or non-operational trivia."

**Replace Phase 2 STCHAR distillation rule** so Phase 2 draws on stable source sections (identity, embodied constraints, voice, stable dispositions, relationships, pressure behavior, known canon limits, all 10 `dramatic_core` fields, `## Capabilities`, `## Signature Scene Behavior`, and other loaded sections containing stable operational character material). Explicitly forbid copying opening temporal state into STCHAR. For each transient opening fact that seems character-relevant, require the authoring model to decide whether a stable dispositional equivalent exists; if yes, write only the durable equivalent in an operational STCHAR section; if no, route the fact entirely to state records or §16a. Require both preservation layers for `source_kind: world_char`: `source_operational_fact_map` for the 10 `dramatic_core` fields AND `Stable Source Material Inventory` for stable operational material from all loaded sections.

**Add to Phase 4/5 initial state creation:** explicit consumption of the Distillation Boundary Ledger — every opening-current fact identified as temporal state must be represented in the appropriate initial record class before root `PG` and page-plan authoring. List the routing: injury/fatigue/visibility/current location → STSTAT/STOBJ/STLOC/PG.state_snapshot; recent pursuit/opening incident → SE/THR/CNSQ/CLK; fear/shame/exhaustion → STEMO; distrust/suspicion/lie/witness access → BEL; inability to work/go home/speak/flee → STPLAN/STINT; active relationship change → SREL; page-local "seen as" presentation → root page-plan §16a. Closing rule: "If a fact is not durable enough for STCHAR and no state record is created for it, it must not appear in the root page plan as an unexplained assertion."

**Add to Phase 8 root page plan:** explicit instruction that root §16a is the first page-local projection of STCHAR + active opening state, and may mention current fear / bruises / exhaustion / location / tactical blockage / current distrust / page-specific voice fracture ONLY when grounded in active STEMO/BEL/STPLAN/STSTAT/STOBJ/SREL/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG records. Closing rule: "Do not repair missing state by copying temporal prose into STCHAR. Create the state record or omit the claim."

### 4.3 `_shared-templates/story-state-contract.md` — §16a rewrite

**Replace the §16a description** with the projection-vs-authority framing. §16a composes (1) stable STCHAR authority, (2) active current story-state records in the page snapshot, (3) this page's rendering needs. STCHAR supplies stable voice / conduct / appraisal / pressure behavior / relationship behavior / perception / embodiment / agency tendencies / capabilities / limits / anti-generic constraints. Active records supply current physical condition / belief / plan / emotion / relationship state / pressure / secret-question-clock state / location / objects / causal event. A §16a packet must not imply that current state lives inside STCHAR.

**Add new packet field `Current-state grounding records:`** to the per-character packet structure. When page-local modulation depends on active state, the field names the active records that ground the modulation (cited by id — e.g., `STEMO-3, BEL-7, STPLAN-2`). When no current-state record is needed, the field reads `Current-state grounding records: none; stable STCHAR authority only.` Forbid citing world `CHAR-*` as operational page-plan characterization authority.

**Do not reintroduce hash fields.** The post-SPEC-71 packet field list is `STENT / STCHAR / display name` + `Required because:` (composite, per SPEC-73) + `Stable STCHAR seed used` + `Current-state grounding records:` (this spec) + `Page-local projection` + `Prose must-show` + `Prose must-not-imply` + `Anti-generic warnings`.

### 4.4 `_shared-templates/story-record-schemas.md` — STCHAR prose + new field rule

**Add to the STCHAR schema prose section** an explicit boundary statement: "`STCHAR` is durable story-local character authority. It must not be used as a root-page summary, opening-scene summary, or compressed current-state packet. Opening or branch-current facts belong to `STSTAT`, `STOBJ`, `STLOC`, `SE`, `BEL`, `STPLAN`, `STINT`, `STEMO`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, and page-plan §16a." Add the dormant-stable-material inclusion rule restating the §4.1 Durable-Authority Boundary in schema-prose form.

**Add new frontmatter field rule for `regeneration_reason_class`** with vocabulary matching §4.7 below. Field is required and non-null when `source_kind: regenerated` OR `supersedes` is non-null. Ordinary updates to active state records or page-local prose are not valid reason classes unless evidence has durably consolidated.

### 4.5 `branching-story-turn-cycle/references/phase-7-page-plan.md` — §16a paragraph rewrite

**Replace the §16a paragraph** with the post-SPEC-71 / post-this-spec packet shape: mandatory when any viewpoint character / speaker / major actor / direct target / emotionally salient character / behavior-shaping or offstage-causal character is present. Per-character packet projects stable STCHAR authority through active current state. Required fields: `STENT / STCHAR / display name`; multi-token `Required because:` (SPEC-73 vocabulary); `Stable STCHAR seed used`; `Current-state grounding records:` (this spec — names active STEMO/BEL/STPLAN/SREL/STSTAT/STOBJ/STLOC/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG ids when page-local modulation depends on them, or `none; stable STCHAR authority only`); `Page-local projection`; `Prose must-show`; `Prose must-not-imply`; `Anti-generic warnings`. Closing rule: "Use the active STCHAR profile as stable authority. Use active story-state records for current state. Do not cite world `CHAR-*` as operational page-plan characterization authority. Do not imply that current state lives inside STCHAR."

**Drop all references to `profile_hash`, `voice_block_hash`, `page_packet_hash`** from the proposed paragraph — none of these fields exist post-SPEC-71.

### 4.6 `branching-story-health-audit/SKILL.md` — Phase 2m findings

**Verify current Phase 2m and source_drift mode naming before authoring tickets.** The source report's §6.6 references a "Phase 2n source_drift" mode; verification revealed the current code names that mode `Phase 2j compatibility_drift`. Tickets implementing this section must use the correct current phase names rather than the report's stale names.

**Add 3 new findings to Phase 2m STCHAR authority health:**

- **`stchar_temporal_authority_contamination`** — an operational STCHAR section or `Page-Plan Voice Block` cites active temporal story-state records as durable authority, or otherwise uses `PG`, `SE`, `STEMO`, `BEL`, `STPLAN`, `STINT`, `STSTAT`, `STOBJ`, `STLOC`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, or `STQ` as if current state belongs in the durable profile. Allowed contexts: frontmatter provenance fields, `Source Distillation`, `story_local_inputs_used`, `Validation / Audit Anchors` when the record is clearly cited as evidence/provenance. FAIL on all profiles (fail-everywhere policy chosen at triage; see §5). `repair_kind: turn_repair` when missing state records must be created; `repair_kind: prose_revision` when only §16a/page-plan text is wrong; `repair_kind: branch_flag` when durable regeneration is needed.
- **`stchar_semantic_loss_risk`** — a `source_kind: world_char` STCHAR lacks a `Stable Source Material Inventory`, maps retained stable source material only to `Source Distillation`, or uses `story_irrelevant` at bootstrap with rationale equivalent to opening-page irrelevance. FAIL on all profiles under fail-everywhere policy. `repair_kind: branch_flag` unless a specific later page already needs the omitted durable material, in which case recommend `story-character-profile regenerate`.
- **`stchar_regeneration_reason_invalid`** — a regenerated/superseding STCHAR lacks a durable `regeneration_reason_class`, or the reason is an ordinary current-state change rather than one of the 5 valid reasons. FAIL on all regenerated profiles.

### 4.7 `story-character-authority.schema.json` — `regeneration_reason_class` property

**Add to STCHAR record schema properties:**

```json
"regeneration_reason_class": {
  "type": ["string", "null"],
  "enum": [
    "source_world_char_material_change",
    "durable_branch_transformation",
    "profile_fidelity_failure",
    "story_local_character_promotion",
    "stable_source_material_omission_repair",
    null
  ]
}
```

**Add conditional rule** requiring the field be non-null with a string enum value when `source_kind: regenerated` OR `supersedes` is non-null. The conditional may be expressed via JSON Schema `if/then/anyOf` (source report §6.7 supplies a draft); the implementing ticket must verify the rule composes correctly with the schema's existing `additionalProperties: false` and any other STCHAR conditionals.

### 4.8 `stchar-body-integrity.ts` — required subsection extension

**Add to the required-subsection list** at `tools/validators/src/structural/stchar-body-integrity.ts:34-48`:

```ts
{
  section: "Source Distillation",
  subsections: ["Stable Source Material Inventory"],
}
```

The validator's existing convention (untouched-legacy-warn / touched-fail) is upgraded to **FAIL-everywhere** per the migration policy chosen at triage (§5). Update existing tests at `tools/validators/tests/structural/stchar-body-integrity.test.ts` accordingly.

### 4.9 New validator: `stchar-temporal-reference-boundary.ts`

**File:** `tools/validators/src/structural/stchar-temporal-reference-boundary.ts`
**Registered name:** `stchar_temporal_reference_boundary`
**Severity:** FAIL on all STCHAR records (fail-everywhere policy).

**Rule:**

1. Parse the STCHAR body by H2 section.
2. Reuse the `OPERATIONAL_TARGET_SECTIONS` set already exported by (or extracted from) `stchar-source-fact-coverage.ts` — the 11 operational H2 names listed in §2.1. Adding `Story-State Derivation Guide` is permitted only when explicitly justified as a discussion of derivation rules, not a current-state recital. The implementing ticket may extract the constant to a shared module if both validators import it.
3. In any operational durable section, disallow occurrences of active temporal story-state record-class id patterns: `PG-<integer>`, `SE-<integer>`, `STEMO-<integer>`, `BEL-<integer>`, `STPLAN-<integer>`, `STINT-<integer>`, `STSTAT-<integer>`, `STOBJ-<integer>`, `STLOC-<integer>`, `SREL-<integer>`, `THR-<integer>`, `OBL-<integer>`, `CNSQ-<integer>`, `CLK-<integer>`, `STSEC-<integer>`, `STQ-<integer>`.
4. Allowed contexts: frontmatter fields (`story_local_inputs_used`, `generated_at_page`, `supersedes`), the `Source Distillation` section (provenance context), and the `Validation / Audit Anchors` section (audit context).
5. Failure message: `<STCHAR-id> operational section '<section>' cites temporal story-state record <record-id> as durable character authority. Route current state to the appropriate story-state record and project it through page-plan §16a.`

This validator uses record-class-id references, not temporal words like "today", "now", or "opening". It will not flag prose like "at the opening of the gala" unless that prose also cites a current-state record id in an operational STCHAR section.

### 4.10 New validator: `stchar-regeneration-reason-integrity.ts`

**File:** `tools/validators/src/structural/stchar-regeneration-reason-integrity.ts`
**Registered name:** `stchar_regeneration_reason_integrity`
**Severity:** FAIL on all regenerated/superseding STCHAR records.

**Rule:**

1. If `source_kind: regenerated` OR `supersedes` is non-null, `regeneration_reason_class` must be one of the 5 enum values from §4.7.
2. When `regeneration_reason_class: durable_branch_transformation`, `story_local_inputs_used[]` or `Validation / Audit Anchors` must cite at least one story-local evidence record.
3. When `regeneration_reason_class: source_world_char_material_change`, `source_char_id` must be non-null. (Note: `source_char_hash` no longer exists post-SPEC-71, and no equivalent source-drift evidence mechanism exists in the current codebase — `source_char_id` non-null is the only structural evidence this validator can require. Implementing tickets must NOT reintroduce a hash check, and must NOT scope-extend to add a new source-drift mechanism without a separate follow-up spec. The health-audit SKILL.md's prose mention of "STCHAR source-drift reporting" is description-only artifact from SPEC-71's stripping and is not a working surface to consult.)
4. When `regeneration_reason_class: profile_fidelity_failure`, the profile must cite prose-receipt or page-plan fidelity evidence in `Validation / Audit Anchors` or `story_local_inputs_used[]`.
5. When `regeneration_reason_class: stable_source_material_omission_repair`, the profile must cite source-material-inventory evidence or prior coverage-failure evidence.
6. A regenerated STCHAR whose evidence consists only of ordinary active-state records without a durable-consolidation rationale in `Validation / Audit Anchors` emits `ordinary_state_not_regeneration_reason`.

This validator checks lifecycle classification and structural evidence, not prose semantics.

### 4.11 New validator: `stchar-source-material-inventory-integrity.ts`

**File:** `tools/validators/src/structural/stchar-source-material-inventory-integrity.ts`
**Registered name:** `stchar_source_material_inventory_integrity`
**Severity:** FAIL on all `source_kind: world_char` STCHAR records under fail-everywhere policy.

**Rule:**

1. Require a non-empty `### Stable Source Material Inventory` subsection under `## Source Distillation`.
2. Inventory rows must name `source_area`, `disposition`, `operational_home`, and `rationale` when disposition is `omitted_with_rationale` or `story_irrelevant`.
3. Valid retained operational homes are the same 11 H2s used by `stchar_source_fact_coverage`. `Source Distillation` is not a retained operational home.
4. At bootstrap, `story_irrelevant` rationale must be one of the structured categories: `outside_story_scope`, `content_constraint`, `premise_incompatible`, `non_operational_trivia`, `duplicate_of_retained_material`.
5. Rationale strings equivalent to `opening_not_relevant`, `not_needed_on_page_1`, `not_in_root_scene` (case-insensitive substring match on the rationale field, not free prose) are invalid as structured categories.

The validator inspects inventory shape and rationale categories. It does not regex-detect semantic phrases in free prose.

### 4.12 `page-plan-stchar-packet-integrity.ts` — current-state grounding extension

**Add two new checks to the existing validator at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`** (preserving the SPEC-73 parsing logic):

1. When a packet body cites current-state record ids (`STEMO-N`, `BEL-N`, `STPLAN-N`, `SREL-N`, `STSTAT-N`, `STOBJ-N`, `STLOC-N`, `THR-N`, `OBL-N`, `CNSQ-N`, `CLK-N`, `STSEC-N`, `STQ-N`) in any field other than the `Current-state grounding records:` line, each cited record must (a) resolve in the same story bundle, (b) be present in `PG.state_snapshot.active_records[]` for that page unless the cited record is the page's own `SE` or `PG`, and (c) be in an allowed current-state record class (never world `CHAR-*`). FAIL on violation. Diagnostic id: `stale_current_state_reference`.
2. When the packet's `Current-state grounding records:` field reads `none; stable STCHAR authority only`, the packet body must not cite any current-state record id elsewhere. FAIL on violation. Diagnostic id: `grounding_records_none_with_citations`.

Do NOT add any check requiring an STCHAR hash to be stable across pages — STCHAR hashes do not exist (SPEC-71). The source report's §6.12 (5) is dropped.

## 5. Migration

The user selected **fail-everywhere on landing** (not the report's warn-legacy / fail-touched recommendation). All STCHAR profiles must pass the new validators when this spec lands.

**Active STCHAR inventory.** Only `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` exist on main. No other bundle has STCHAR profiles.

**Pre-landing remediation pass.** Before the new validators register, run health-audit Phase 2m (with the §4.6 new findings) on the 3 red-bunny STCHAR profiles. For each finding:

| Finding | Repair action |
|---|---|
| `stchar_temporal_authority_contamination` only | Move current facts to state records / page plans via a turn-cycle repair turn. Regenerate STCHAR only if contamination is embedded in durable sections and cannot be cleanly removed via authorized in-place repair. |
| `stchar_semantic_loss_risk` | If stable source material was omitted and later pages would lawfully need it, run `story-character-profile regenerate` with `regeneration_reason_class: stable_source_material_omission_repair`. If bootstrap omission was objectively wrong, regenerate. |
| Body / subsection / schema-shape issue only | Repair body, schema, or both in place without changing the durable model. |

**Patch-engine prerequisite — KNOWN BLOCKER.** The active `MEMORY.md` entry `project_red_bunny_hash_drift.md` records that red-bunny's bundle has a `file_versions` hash-basis mismatch (index stores prose-normalized hash; patch-engine guard expects raw sha256) that BLOCKS the first post-bootstrap patch to any story bundle, tracked by ticket ENGINESYNC-005. **Any STCHAR remediation that routes through the patch engine will hit this blocker first.** The implementing ticket must either (a) confirm SPEC-71 / SPEC-72 incidentally cleared this mismatch — verify via a probe patch before assuming — or (b) coordinate with ENGINESYNC-005 sequencing. Direct edits to STCHAR files are blocked by Hook 3 (engine-only mutation surface for `story-characters/` per FOUNDATIONS); the band-aid hand-reconciliation noted in MEMORY.md is not a load-bearing path for this spec.

**No grandfathering.** The fail-everywhere choice means no profile escapes the new validators by being untouched. The spec's validator-registration step must happen AFTER the red-bunny remediation pass lands, not before.

## 6. FOUNDATIONS Alignment

| Principle | Stance | How honored |
|---|---|---|
| §Story Bundles §6.1 (Story-Local Character Authority) | aligns | STCHAR-as-durable-authority and active-records-as-current-state is directly the principle restated. The Durable-Authority Boundary section (§4.1), Distillation Boundary Ledger (§4.2), and `stchar_temporal_reference_boundary` validator (§4.9) operationalize the split. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | `regeneration_reason_class` (§4.7) is load-bearing: consumed by `stchar_regeneration_reason_integrity` (§4.10) for lifecycle classification, by the regenerate-mode skill instructions (§4.1) for authoring discipline, and by health-audit (§4.6) for the `stchar_regeneration_reason_invalid` finding. Passes the load-bearing test. |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns | Temporal contamination would make STCHAR carry "today's pose / today's fear" — the engine-scope analogue of `arc_contract` rejected at §5a / §5c. The new validators forbid that contamination structurally. |
| §Story Bundles §6a (Belief vs. Fact) | aligns | Routing "current distrust of male attention after the chase" to `BEL` (with `truth_relation` + `belief_mode` + `visibility`) instead of into STCHAR's Emotional Appraisal Map preserves the SF/BEL separation. The §4.2 Phase 4/5 routing makes this explicit. |
| §Story Bundles §6b (Information / Observer Firewall) | aligns | FOUNDATIONS already declares "`STCHAR` shapes persona, voice, and pressure behavior; it is not an epistemic access route and must not be added to `BEL.basis.access_records[]`." The Durable-Authority Boundary section reinforces this. |
| §Tooling Recommendation (no operating on prose alone) | aligns | All new validators (§4.9, §4.10, §4.11, §4.12) are structural — they parse record-class ids, frontmatter fields, body subsection presence, and `PG.state_snapshot.active_records[]` membership. None parse free prose semantics. The source report's explicit rejection of phrase-heuristic validators is honored. |
| Rule 6 (No Silent Retcons) | aligns | The `regeneration_reason_class` requirement (§4.7 + §4.10) is itself a retcon-audit field: every STCHAR regeneration must classify its lifecycle event explicitly with a durable consolidation rationale. |

## 7. Testing strategy

For each new or modified validator, mirror the existing test patterns under `tools/validators/tests/structural/`:

- `stchar-temporal-reference-boundary.test.ts` — positive: STCHAR `Validation / Audit Anchors` may cite `SE-1`, `PG-1`, `STEMO-1` as evidence; STCHAR `Source Distillation` may cite `PG-1` as generation provenance; STCHAR stable section may say "under humiliation, she turns shame into bravado" without any record ids. Negative: `Page-Plan Voice Block` cites `STEMO-1` as voice state; `Stable Persona Core` says "as of PG-1 she is unable to go home"; `Pressure Behavior` cites `BEL-2` or `STPLAN-4` as current authority.
- `stchar-regeneration-reason-integrity.test.ts` — positive: `source_kind: regenerated`, `supersedes: STCHAR-1`, `regeneration_reason_class: durable_branch_transformation`, with `story_local_inputs_used: [SE-9, SREL-4, STEMO-7]` and audit-anchor evidence; `profile_fidelity_failure` with prose-receipt evidence; `stable_source_material_omission_repair` with inventory evidence. Negative: regenerated STCHAR missing reason class; reason class null with `supersedes` non-null; reason says ordinary `STEMO` update without durable-consolidation evidence (emits `ordinary_state_not_regeneration_reason`).
- `stchar-source-material-inventory-integrity.test.ts` — positive: world-char STCHAR with non-empty inventory mapping retained material to operational H2s; story_irrelevant with structured category `non_operational_trivia` passes. Negative: missing inventory subsection; retained-disposition row with `operational_home: Source Distillation`; story_irrelevant with rationale containing `not_needed_on_page_1` or `opening_not_relevant`.
- Extend `stchar-body-integrity.test.ts` — new/touched world-char STCHAR missing `### Stable Source Material Inventory` fails; story-local STCHAR may omit inventory only when `source_kind` is not `world_char`.
- Extend `stchar-source-fact-coverage.test.ts` — `story_irrelevant` with rationale category `not_needed_on_page_1` fails at bootstrap; `story_irrelevant` with `non_operational_trivia` passes when `target_section` is null and rationale is explicit (composition with the new inventory rationale vocabulary).
- Extend `page-plan-stchar-packet-integrity.test.ts` — packet citing `STEMO-1` passes only when `STEMO-1` is in `PG.state_snapshot.active_records[]`; packet citing inactive `BEL-2` fails (`stale_current_state_reference`); packet with `Current-state grounding records: none; stable STCHAR authority only.` but body cites `STPLAN-1` fails (`grounding_records_none_with_citations`); two pages projecting different active `STEMO` records from the same STCHAR pass (no hash check, no stability requirement — the post-SPEC-71 packet has no hash fields to be stable across).
- Bootstrap/skill-level golden test — given a source CHAR with a dormant stable capability not needed on root page, bootstrap STCHAR includes it in `Agency and Planning Tendencies` or `Perception and Embodiment`. Given an opening seed with bruise/chase/crying/fear, generated initial records include `STSTAT`/`STEMO`/`BEL`/`THR` as appropriate, and STCHAR operational sections do not cite those record ids.

## 8. Sequencing

Implementation ticket order. Each stage is independently shippable; the ordering ensures no validator lands before its skill/template precondition.

1. **Stage 1 — Documentation/skill hardening (zero schema/validator churn):** §4.1, §4.2, §4.3, §4.4, §4.5, §4.6 finding-vocabulary documentation.
2. **Stage 2 — Schema:** §4.7 (`regeneration_reason_class` property + conditional). Update patch-engine STCHAR ops fixtures to pass null for non-regenerated profiles and a valid value for regenerated profiles.
3. **Stage 3 — Source-preservation hardening:** §4.8 (`Stable Source Material Inventory` subsection requirement) + §4.11 (new inventory validator). Extend `stchar-body-integrity.test.ts`.
4. **Stage 4 — Temporal-boundary structural enforcement:** §4.9 (new `stchar_temporal_reference_boundary` validator) + tests. Pre-land remediation pass for red-bunny STCHAR-{1,2,3} per §5.
5. **Stage 5 — Page-plan projection enforcement:** §4.12 (page-packet validator extension) + tests. Update page-plan examples / templates if any fail the new packet shape.
6. **Stage 6 — Regeneration lifecycle enforcement:** §4.10 (new `stchar_regeneration_reason_integrity` validator) + tests. Update `story-character-profile` patch payload examples.
7. **Stage 7 — Health-audit finding registration:** §4.6 (3 new findings wired into Phase 2m) + tests.
8. **Stage 8 — Migration verification:** rerun all STCHAR validators against red-bunny fixtures. Resolve any residual findings via in-place repair or `story-character-profile regenerate`. Verify ENGINESYNC-005 hash-drift blocker disposition before any engine-routed STCHAR mutation.

SPEC-75 (branch-aware supersession) is independently sequenced and does not block any stage above.

## 9. References

- Source report: `reports/stchar-distillation-rework.md` (the source proposal; §6.3 / §6.5 / §6.12 hash-citation text dropped per Out of Scope; §6.12 sub-items (1)(2) dropped as already-landed by SPEC-73; §6.13 deferred to SPEC-75).
- Companion triage: [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md) (per-item verdicts, refuted-by-verification list, deferral rationale).
- Prior lineage: `archive/specs/SPEC-70-char-stchar-semantic-preservation.md`, `archive/specs/SPEC-71-strip-stchar-tamper-hashes.md`, `archive/specs/SPEC-73-page-packet-required-because-label-parsing.md`.
- FOUNDATIONS: §Story Bundles §5b, §5c, §6.1, §6a, §6b; §Tooling Recommendation; Rule 6.
- Validator surfaces verified: `tools/validators/src/structural/stchar-body-integrity.ts`, `stchar-source-fact-coverage.ts`, `stchar-supersession-integrity.ts`, `page-plan-stchar-packet-integrity.ts`, `no-char-authority-in-story-runtime.ts`, `forbidden-stchar-tamper-hash-fields.ts`; schema at `tools/validators/src/schemas/story-character-authority.schema.json`.
- Skill surfaces verified: `.claude/skills/story-character-profile/SKILL.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, `.claude/skills/branching-story-health-audit/SKILL.md`.
- Template surfaces verified: `.claude/skills/_shared-templates/story-state-contract.md` §16a, `.claude/skills/_shared-templates/story-record-schemas.md` STCHAR section.
- Active STCHAR fixtures: `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md`.

## Outcome

When this spec lands, every STCHAR profile structurally cannot carry opening-scene state in its operational sections (caught by `stchar_temporal_reference_boundary`), structurally must inventory stable source material beyond `dramatic_core` for `source_kind: world_char` profiles (caught by `stchar_source_material_inventory_integrity` + the body-integrity subsection requirement), and structurally must classify every regeneration's lifecycle reason (caught by `stchar_regeneration_reason_integrity` + the schema conditional). Authoring discipline is hardened by the Durable-Authority Boundary section in `story-character-profile` and the Distillation Boundary Ledger Phase 1b in `branching-story-bootstrap`. Page-plan §16a packets must explicitly declare whether their projection depends on current state and ground those projections in active state records (caught by the `page_plan_stchar_packet_integrity` extension). The 3 active red-bunny STCHAR profiles are migrated through a one-shot remediation pass before the validators register, honoring the fail-everywhere policy chosen at triage.
