# SPEC-70 — CHAR → STCHAR Semantic Preservation & Structured-Fact Coverage

**Status:** DRAFT
**Date:** 2026-05-22
**Classification:** story-canon-related (governs the `CHAR → STCHAR` story-character distillation seam: the `story-character-profile` skill, the STCHAR frontmatter schema, the STCHAR body validator, the §16a page-plan packet contract, and a new structural validator)
**Source:** `reports/character-bridge-consolidation-first-iteration.md` (external ChatGPT-Pro analysis) — triaged against `main` (SHA `fb1eb37`) 2026-05-22. The report proposed 7 changes across a 7-phase program; this spec implements the **subset that survives verification** and drops the rest (see §1 and §4).
**Depends on:** none — the STCHAR machine foundation, pipeline integration, body-integrity validator, and §16a packet integrity validator already landed (`archive/specs/SPEC-56`, `SPEC-57`, `SPEC-59`, `SPEC-63`, `SPEC-66`). This spec adds the one missing layer on top of them.
**Companion triage file:** none — single-deliverable triage below the ≥8-item carve-out threshold (7 proposals evaluated); verdicts are recorded inline in §1 + §4 and in the originating in-chat triage.

## 1. Context

### 1.1 What already exists (verified against `main`)

The `CHAR → STCHAR → §16a page-packet` bridge is mature. Verified directly:

- **`story-character-profile`** drafts STCHAR with exactly **13 required H2 sections** (`SKILL.md` Phase 3, lines 213–225), mirrored by `REQUIRED_STCHAR_SECTIONS` in `tools/validators/src/structural/stchar-body-integrity.ts`.
- **`tools/validators/src/structural/stchar-body-integrity.ts`** validates the 13 sections (present exactly once, non-empty) and recomputes `profile_hash` (full body) and `voice_block_hash` (`## Page-Plan Voice Block`); it shape-checks `page_packet_hash`.
- **`tools/validators/src/schemas/story-character-authority.schema.json`** requires provenance/hash fields (`source_kind`, `source_char_id`, `source_char_hash`, `source_char_sections_used`, `profile_hash`, `voice_block_hash`, `page_packet_hash`), with `source_char_id`/`source_char_hash` conditionally required for `source_kind: world_char` and null for `story_local`.
- **`tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`** (landed SPEC-59) already parses §16a packets, checks active-STCHAR membership and `required_because`, requires a voice block for speaker/viewpoint, **recomputes `page_packet_hash` from packet text** via `computeStcharPagePacketHash`, and forbids `CHAR-*` leakage.
- **`compute-stchar-hashes.ts`** defines `page_packet_hash` precisely (the §16a projection with its own hash value masked); §16a semantics are documented at `story-state-contract.md:496`.
- The **source `CHAR` dossier** (`character-generation/templates/character-dossier.md`) carries a standalone `## Capabilities` body section and a standalone `## Signature Scene Behavior` body section, plus a frontmatter `dramatic_core` block with the **10 protagonist-grade engine fields** (`_shared-references/protagonist-grade-character-engine.md`): `world_produced_wound`, `active_appetite`, `self_mythology`, `irreconcilable_contradiction`, `pressure_behavior` (5 keys), `relational_charge` (array), `moral_psychological_edge`, `signature_scene_behaviors` (array, ≥3), `voice_under_pressure` (4 keys), `cannot_be_swapped_out_because`.

### 1.2 The genuine gap (the report's surviving core thesis)

The bridge enforces **provenance** and **structural completeness**, but never proves **semantic coverage**. Verified:

- `story-character-profile` Phase 1 (line 183) names the source material to distill at the **concept level** — "identity, embodied constraints, voice, stable dispositions, relevant relationships, pressure behavior, and known canon limits." It **does not name** `## Capabilities`, `## Signature Scene Behavior`, or `dramatic_core.signature_scene_behaviors[]`.
- No "coverage / operational fact / fact-map / semantic preservation" requirement exists in the skill, the STCHAR schema, or any validator (confirmed by repo-wide grep — zero hits).
- `## Source Distillation` is positioned as a source/accounting section, **not** as an operational packet source. Nothing forbids an operational source fact (a signature behavior, a pressure response) from surviving **only** there.

**Triggering failure class (real):** a source `CHAR`'s signature scene behavior, recorded in `dramatic_core.signature_scene_behaviors[]`, is mentioned in the STCHAR only inside `## Source Distillation` commentary. It is human-readable but is **not** available to §16a packet construction, STPLAN/STEMO derivation, CHC grounding, or prose rendering — and every current gate (13 sections present, hashes valid, no `CHAR` leak, §16a packet self-consistent) **passes**.

### 1.3 Triage verdicts on the report's 7 proposals

| # | Proposal | Verdict | Disposition |
|---|----------|---------|-------------|
| P1 | Semantic Preservation Contract | accept-with-modification | §2.1 |
| P2 | Explicit STCHAR operational-capability / signature-behavior homes | accept-with-modification | §2.2 |
| P3 | `stchar_source_fact_coverage` validator | accept-with-modification (structured-fields scope) | §2.3–§2.4 |
| P4 | Refine §16a roles + "relevant capabilities/limits" line | accept-with-modification | §2.5 (capabilities line only; broad role taxonomy → §4) |
| P5 | Add `page_plan_stchar_packet_integrity` validator | **refuted-by-verification** | §4 — already exists (SPEC-59) |
| P6 | Clarify `page_packet_hash` semantics | **already-resolved** | §4 — SPEC-57/SPEC-66 + CLI |
| P7 | Golden failure fixture | accept | §6 |

## 2. Changes

### 2.1 Semantic Preservation Contract (skill + contract text)

Add the contract to `story-character-profile/SKILL.md` (Phase 1 + Phase 3), `branching-story-bootstrap/SKILL.md` (cast distillation phase), and `_shared-templates/story-state-contract.md` (STCHAR semantics):

> For any STCHAR derived from a world `CHAR` (`source_kind: world_char`), every **structured operational source fact** must be copied, transformed, compressed, intentionally omitted with rationale, or marked story-irrelevant. No structured operational source fact may survive only in `## Source Distillation` or other audit/commentary prose if page planning, choice grounding, state derivation, or prose rendering may need it.

"Structured operational source facts" are scoped to the machine-parseable `dramatic_core` fields (the 10 protagonist-grade engine fields) — the surface the validator in §2.4 can check deterministically. The contract text additionally **directs** authors to carry `## Capabilities` material into operational STCHAR homes, but capability prose is not deterministically gated (see §4).

Update `story-character-profile` Phase 1's source-section list to **explicitly name** `dramatic_core` (all engine fields), `## Capabilities`, and `## Signature Scene Behavior` as source material to distill — closing the concept-level/section-level gap identified in §1.2.

### 2.2 STCHAR operational-home subsections

Keep the 13 H2 sections. Add **required subsections** so capabilities have an explicit operational home rather than an implicit one:

- Under `## Agency and Planning Tendencies`:
  - `### Operational capabilities and affordances`
  - `### Capability limits, costs, and access constraints`
- Under `## Prose Rendering Constraints`:
  - `### Signature scene behaviors to render`

Update **both** `story-character-profile/SKILL.md` Phase 3 template **and** the validator's section model together (the skill's Phase 3 note already mandates co-update of `REQUIRED_STCHAR_SECTIONS`). Subsection enforcement is **presence + non-empty** only (extends `stchar-body-integrity.ts`); it does not judge content quality.

### 2.3 STCHAR schema: `source_operational_fact_map`

Add a frontmatter field to `story-character-authority.schema.json`:

```yaml
source_operational_fact_map:
  - source_field: signature_scene_behaviors   # one of the 10 dramatic_core engine field names
    disposition: copied                        # copied | transformed | compressed | omitted_with_rationale | story_irrelevant
    target_section: "Prose Rendering Constraints"  # required when disposition ∈ {copied, transformed, compressed}
    rationale: "…"                             # required when disposition ∈ {omitted_with_rationale, story_irrelevant}
```

- **Required and non-empty for `source_kind: world_char`**; must be `null` (or absent) for `source_kind: story_local` (no world `CHAR` provenance exists to map).
- `disposition` is a closed enum.
- `target_section` is constrained to a real operational STCHAR H2 name and **must not be `Source Distillation`** when `disposition ∈ {copied, transformed, compressed}`.
- `rationale` is required (non-empty) when `disposition ∈ {omitted_with_rationale, story_irrelevant}`.

Placement rationale: the map is consumed by the §2.4 validator on **every** `world_char` STCHAR validation, so per the report's own criterion (and FOUNDATIONS §schema-minimalism — every field load-bearing) frontmatter beats a parsed body block. The field is load-bearing precisely because §2.4 reads it.

### 2.4 New validator: `stchar_source_fact_coverage`

New file `tools/validators/src/structural/stchar-source-fact-coverage.ts`, registered and threaded through the STCHAR-relevant pre-apply path (`STCHAR_RELEVANT_OPS` in `stchar-utils.ts` already covers `append_story_character_authority_record` / `supersede_story_character_authority_record`).

For each STCHAR with `source_kind: world_char`:

1. Resolve the source `CHAR` by `source_char_id` (via typed retrieval — never bulk `_source/` reads) and confirm `source_char_hash` matches the indexed source content.
2. Enumerate the **structured** `dramatic_core` engine fields present on the source `CHAR` (the 10 fields; array fields like `signature_scene_behaviors[]` and `relational_charge[]` are covered by a single field-level map entry, not per-element).
3. Require a `source_operational_fact_map` entry for **each present** structured field.
4. Validate each entry's `disposition` enum, the `target_section` ≠ `Source Distillation` rule for retained dispositions, and the `rationale`-required rule for omission dispositions.
5. **Fail** when a structured field has no map entry, when a retained fact targets `Source Distillation`, or when an omission lacks a rationale.

The validator does **not** parse the free-prose `## Capabilities` / `## Signature Scene Behavior` body sections of the source `CHAR` (see §4) — coverage of capabilities is carried by the contract (§2.1), the operational-home subsections (§2.2), and any voluntary map entries, not by fragile prose parsing.

### 2.5 §16a "relevant capabilities / limits" line

Add one line to the **full** §16a packet template in `story-state-contract.md` (after `Agency and planning tendency:`):

```markdown
  - Relevant capabilities / limits for this page:
```

For the **reduced `offstage_causal`** packet, add the same line only when the offstage character's capability is the mechanism of their causal bearing (authoring judgment, not validator-graded — consistent with the existing offstage emit/omit boundary). The closed `required_because` vocabulary is **unchanged** (the report's broader role taxonomy is rejected — see §4). No new validator gate is added for this line; `page-plan-stchar-packet-integrity.ts` already governs §16a structure, and capability-relevance-per-page is judgment, not deterministic (FOUNDATIONS §Tooling Recommendation).

## 3. Edge cases / migration

- **3 existing STCHAR records** (`worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1..3.md`) predate this contract. Migration policy: the new requirements (§2.2 subsections, §2.3 `source_operational_fact_map`) **fail for new and superseding STCHAR**, and **warn** for untouched legacy records during a one-release migration window. The `stchar_source_fact_coverage` validator must skip (or warn-only) legacy `world_char` STCHAR that lack the field rather than blocking unrelated story writes. Confirm at implementation whether all 3 red-bunny STCHAR are `world_char` or `story_local` (the latter are exempt by §2.3).
- **`profile_hash` is over the full body**: adding the §2.2 subsections changes the body, so any migrated STCHAR needs `profile_hash` recomputation via `compute-stchar-hashes.ts`. The warn-until-touched window means this only bites when a legacy record is next regenerated/superseded.
- `voice_block_hash` (Page-Plan Voice Block only) and `page_packet_hash` (§16a projection) are **unaffected** by the frontmatter `source_operational_fact_map` field and by subsections outside the voice block.
- **Array fields**: `signature_scene_behaviors[]` and `relational_charge[]` take one field-level map entry each (disposition + target/rationale). Per-element mapping is explicitly not required — it would bloat the map against FOUNDATIONS §schema-minimalism.
- **`source_char_hash` drift**: if the indexed source `CHAR` content hash no longer matches the recorded `source_char_hash`, the validator reports a coverage-staleness drift rather than silently passing (the source the map was built against has changed).

## 4. Out of Scope

- **P5 — `page_plan_stchar_packet_integrity` validator (refuted-by-verification).** Already exists at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (SPEC-59) and already recomputes `page_packet_hash` from packet text (lines 172–190). The report's "no such validator" claim rested on three wrong path guesses (`page-plan-stchar-integrity.ts`, `pg-plan-stchar-integrity.ts`, `page-plan-hash-integrity.ts`) made because it could not list the directory.
- **P6 — `page_packet_hash` semantics clarification (already-resolved).** Defined precisely in `compute-stchar-hashes.ts` and `story-state-contract.md:496`; the recompute the report wanted is already performed by the SPEC-59 validator. No residual ambiguity.
- **Broad §16a role taxonomy** (`consequence_carrier`, `promise_thread_carrier`, `opposition_pressure`, `relationship_relevant`, `continuity_mention`). No named consumer; the `offstage_causal` tier already landed (SPEC-63); expanding the closed vocabulary is scope-creep against YAGNI. Only the single capabilities line (§2.5) is in scope.
- **Free-prose `## Capabilities` / `## Signature Scene Behavior` body parsing by the validator.** Per the chosen structured-fields scope: the validator gates only the machine-parseable `dramatic_core` engine fields. Prose-capability coverage is authoring discipline, not a deterministic gate (avoids the false-positive risk the report itself flagged).
- Collapsing STCHAR into `BEL`/`STINT`/`STPLAN`/`STEMO`/`SREL`; any new drama-manager; promoting story-local facts to world canon; reintroducing world `CHAR` as runtime authority; requiring every source fact to appear in every page. All explicit non-goals, all retained.

## 5. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §6.1 (Story-Local Character Authority) | aligns | "STCHAR shapes persona, voice, and pressure behavior; normal runtime consumes active STCHAR, not world CHAR." The coverage contract strengthens this: operational source facts must land in STCHAR operational homes rather than being stranded in audit prose, so runtime authority is complete without reaching back to `CHAR`. |
| §Tooling Recommendation / Validation Rules (deterministic vs judgment) | aligns | The validator gates only the closed, machine-parseable `dramatic_core` fields (deterministic); literary adequacy, per-page capability relevance, and free-prose capability coverage stay judgment (§2.5, §4). Mirrors the report's own schema-validates-shape-not-meaning point. |
| §Schema-minimalism (story scope) | aligns | `source_operational_fact_map` is load-bearing — consumed by `stchar_source_fact_coverage` on every `world_char` STCHAR validation. Array fields take one entry each; no nice-to-have surface added. |
| Rule 6 (No Silent Retcons) | aligns | A retained-with-transformation disposition forces an explicit `target_section`; an omission forces a `rationale` — semantic loss becomes a logged, justified decision rather than a silent drop. |
| Canon promotion boundary | N/A (defensive) | Adjacent surface (STCHAR derives from world `CHAR`), but nothing here promotes story-local facts to world canon; disclosed as intentionally out of scope. |

## 6. Testing strategy

Golden fixtures (the P7 deliverable) for `stchar_source_fact_coverage`:

- **Triggering case fails**: source `CHAR` with `dramatic_core.signature_scene_behaviors[]`; STCHAR map entry targets `Source Distillation` with `disposition: copied` → `fail`.
- **Valid mapped passes**: same source; map entry `disposition: copied`, `target_section: "Prose Rendering Constraints"`, with the behavior present in `### Signature scene behaviors to render` → no verdict.
- **Missing entry fails**: a present `dramatic_core` engine field with no map entry → `fail`.
- **Omitted-with-rationale passes; missing-rationale fails**: `disposition: omitted_with_rationale` with non-empty `rationale` passes; same disposition with empty `rationale` → `fail`.
- **`story_local` exemption**: `source_kind: story_local` STCHAR with null `source_operational_fact_map` → no verdict.
- **Legacy warn window**: untouched `world_char` STCHAR lacking the field → `warn` (not `fail`) under the migration window; a superseding revision → `fail` if still missing.

`stchar-body-integrity.ts` regression: new §2.2 subsections required (present + non-empty) for new STCHAR; existing 13-section fixtures stay green; `profile_hash` recompute over migrated bodies confirmed.

`npm run build` + `npm test` green in `tools/validators` (and `tools/world-mcp` if the schema or hash CLI surface is touched) before completion.
