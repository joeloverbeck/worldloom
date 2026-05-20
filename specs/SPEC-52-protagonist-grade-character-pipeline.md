<!-- spec-drafting-rules.md not present; using SPEC-46's structure (Status / Phase / Depends on / Blocks / Source header + Problem Statement + Key Design Decisions + Approach + per-phase sections + FOUNDATIONS Alignment + Out of Scope + Deliverables + Risks & Open Questions + Test Plan). -->

# SPEC-52: Protagonist-Grade Character Pipeline

**Status**: DRAFT
**Phase**: character-pipeline memorability hardening (one shared doctrine reference + one new skill + two skill revisions + schema/validator first-classing of NCP; no story-bundle record classes touched)
**Depends on**: none (additive to the canon-reading character pipeline). Builds on the existing `propose-new-characters` / `character-generation` skills, the `character_proposal_card` / `character_proposal_batch` world-index node types, and the validator framework.
**Blocks**: a possible future dedicated `character_proposal_upgrade` MCP task type + ranking profile (explicitly deferred — see §Key Design Decisions); a possible future `NCU-<integer>` upgrade-audit record class (explicitly deferred).
**Source**: `reports/deepening-characters-first-iteration.md` (external-research + repo-findings + proposed design, 2026-05-20). Brainstorm-triage verified the report's repository claims via four parallel Explore passes against `.claude/skills/character-generation/`, `.claude/skills/propose-new-characters/`, `tools/validators/src/`, `tools/world-index/src/`, `tools/world-mcp/src/`, and `docs/CONTEXT-PACKET-CONTRACT.md`; cross-checked against `docs/FOUNDATIONS.md` §Core Principle, Rules 1/2/3/4/7, §Story Bundles (separation), and the project HARD-GATE / validation-test discipline.

---

## Problem Statement

Worldloom's character pipeline is **canon-safe but not memorability-driven**. Verification confirmed every load-bearing claim in the source report:

- `character-generation` (Phases 0–9, dossier template with 9 body sections — Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks, Canon Safety Check Trace) builds grounded, validated dossiers. It has **no structured frontmatter or required body surface** for world-produced wound, active appetite, self-mythology, pressure behavior, relational charge, moral/psychological edge, or signature scene behavior. `templates/character-dossier.md` and `tools/validators/src/schemas/character-frontmatter.schema.json` (`additionalProperties: false`, `required: [character_id, slug, name, species, age_band, place_of_origin, current_location, date, social_position, profession, kinship_situation, religious_ideological_environment, major_local_pressures, intended_narrative_role, world_consistency, source_basis]`) carry zero such fields.

- `propose-new-characters` is the strongest existing surface: per-seed character engine (`phases-6-9-seeds-engine-epistemic-voice.md` line 34: `short_term_goal / long_term_desire / unavoidable_obligation / external_pressure / public_mask / private_appetite / social_fear / private_shame / central_contradiction / capability_path / cost_of_competence / relation_to_law_taboo_debt / repeated_forced_choice`), 10 scoring dimensions, 13 rejection triggers, 10 diversification slots. But protagonist-grade force is **one diversification slot (slot 10, "potentially load-bearing round character") among ten**, not the governing quality bar; "valid but dull" is not a named failure mode; appetite/contradiction/shame are prose fields that can flatten downstream.

- **NCP proposal cards are indexed but not schema-validated.** The world index treats `character_proposal_card` / `character_proposal_batch` as first-class: `tools/world-index/src/parse/prose.ts` maps `character-proposals/` → `character_proposal_card` and recognizes `NCP|NCB` in `STRUCTURED_ID_REGEX` (line 10); `tools/world-index/src/schema/types.ts` `NODE_TYPES` includes both (lines 23–24); `parse/scoped.ts` (lines 26/32) treats `character_proposal_card` as a scoped source; `parse/structured-edges.ts` (lines 66–71) links `character_proposal_card.batch_id → character_proposal_batch`. But the **validator** lags entirely: `tools/validators/src/structural/utils.ts` `STRUCTURAL_NODE_TYPES` (lines 8–41), `RECORD_TYPE_TO_SCHEMA` (lines 75–108), `isStructuralAuthorityRecord` (lines 221–323), and `listSupportedWorldFiles` (lines 325–356; markdown dirs at line 343 = `["characters","diegetic-artifacts","adjudications"]`) omit both proposal types; `record-schema-compliance.ts` `hybridRecordsFromFiles` (line 312) scans only `characters/`, `diegetic-artifacts/`, `adjudications/`. A repository-wide search for `character_proposal` in `tools/validators/` returns **zero matches**. This is the cleanest deterministic-validation gap.

- There is **no skill to deepen a single existing brief or NCP card** into a stronger proposal. The user has explicitly requested one.

- Story consumers are unaffected: `branching-story-bootstrap` consumes `selected_cast` as existing `CHAR-<integer>` ids verified against `characters/INDEX.md`; it never reads NCP cards or CHAR frontmatter dramatic fields. Ephemeral one-appearance figures (e.g. a single-scene tax-collector) are spawned by the story system as `STENT` records, **not** authored through `character-generation`. Therefore every character produced by this pipeline is a deliberately-kept world character.

The fix is a shared **Protagonist-Grade Character Engine** doctrine threaded through three surfaces (a new single-seed `deepen-character-proposal` skill, revised `propose-new-characters`, revised `character-generation`), plus first-class NCP schema validation. Memorability is interpreted strictly as **world pressure made personal** (Rule 2: No Pure Cosmetics) — never arbitrary eccentricity.

### Key design decisions

- **`dramatic_core` (CHAR) and `memorability_profile` (NCP) are universal hard-required, not tiered by `depth_class`.** Brainstorm-triage initially recommended scaling requiredness by depth class to avoid over-intensifying background characters. The repository owner corrected the premise: incidental one-appearance figures are created on-the-fly by the **story system as `STENT` records**, never through `character-generation`. Every character that flows through this pipeline is a deliberately-authored world character worth keeping, so it earns the full engine. The "operatic/melodramatic" risk is mitigated by **engine density, not theatrical loudness** (a quiet character still has appetite, contradiction, self-mythology, pressure behavior, and relational charge), and by Rule-2 enforcement that every strange trait be world-produced — not by exempting tiers.

- **No backward compatibility / no migration.** Existing `worlds/animalia/` CHAR dossiers and NCP cards that lack the new fields will fail `world-validate` once the schemas are active. This is intended: the validator must not silently tolerate weak structures. Failure posture is actionable (name the missing field/section; explain the content needed; no auto-migration; manual editing is the migration path). Acceptable because the change is additive-required and the affected record count is small.

- **The new `deepen-character-proposal` skill reuses the existing `propose_new_characters` MCP task type / ranking profile; a dedicated `character_proposal_upgrade` task type is deferred (YAGNI).** The source report proposed adding `character_proposal_upgrade` to `TASK_TYPES`, `rankingProfilesByTaskType`, default budgets, and `docs/CONTEXT-PACKET-CONTRACT.md`, with a bespoke ranking profile and a 15000-token budget. The new skill's only consumer of that surface is itself, and it reads materially the same nodes as `propose_new_characters` (character records, named entities, diegetic artifacts, adjudications, invariants, Mystery Reserve, canon facts, sections — `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` lines 24–44). The skill therefore loads context with `task_type='propose_new_characters'`, seeded on the input brief/NCP. A dedicated task type is added only if retrieval quality proves insufficient in practice — mirroring the report's own "do not add NCU yet" instinct.

- **Protagonist-grade additions to `propose-new-characters` augment the existing per-seed character engine *within* phases 6–9 — there is no new "Phase 7b".** The source report's "insert Phase 7b after Phase 7 character engine, before Phase 8 epistemic filter" mislabels the skill's structure: phases 6–9 (seeds / character engine / epistemic+perceptual filter / voice signature) are bundled in one reference file (`references/phases-6-9-seeds-engine-epistemic-voice.md`) with no standalone Phase 7/8 boundary. The protagonist-grade engine fields consolidate and intensify the existing engine fields in that reference. The report's "Phase 12 = filter/rejection triggers" and "Phase 15 = validation tests" references **are** accurate (`references/phases-11-13-score-filter-diversify.md` holds the 13 triggers; `references/phases-14-16-compose-validate-commit.md` holds the 12 validation tests).

- **The NCP lineage block is named `upgrade_lineage`, not `origin`.** The source report uses both names inconsistently (`origin:` at report line 313, `upgrade_lineage:` at line 1147). This spec standardizes on `upgrade_lineage` with `origin_kind: batch_generated | upgraded_seed | user_seed`. `batch_id` becomes optional on the NCP schema so single-seed upgrade cards need not synthesize a batch manifest; batch-generated cards retain `batch_id` and the existing `character_proposal_card.batch_id → character_proposal_batch` edge.

- **Deterministic validators enforce *exposure*; LLM critics judge *quality*.** AJV/structural checks enforce IDs, enums, required fields, non-empty arrays, route presence, body headings, placeholder absence, and field shape. LLM critic passes judge memorability, surprise, protagonist-grade force, contradiction quality, psychological specificity, moral edge, voice distinction, world-producedness, and anti-flattening. Every LLM-critic PASS entry must carry a one-line rationale (per the project validation-test discipline; a bare "PASS" is treated as FAIL).

- **No story-system-specific fields are added to CHAR or NCP.** No "arc beat", "act position", "plot destiny", or "companion quest" fields. All additions are character-in-world fields (behavior, pressure, relationships, voice, appetite, self-mythology, moral edge). `character-generation` does not become `story_bootstrap`-aware. "Likely Story Hooks" remains a pressure-surface description, not act structure.

---

## Approach

Six phases, sequenced so the doctrine reference and templates land first, the skills consume them, and the schemas/validators last enforce what the skills now emit. Schema enforcement intentionally lands *after* the skill revisions so batch-generated NCP cards already carry `memorability_profile` before the schema requires it.

---

### Phase 1 — Shared doctrine and templates

**Files**

- `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (new)
- `.claude/skills/propose-new-characters/templates/proposal-card.md` (edit)
- `.claude/skills/character-generation/templates/character-dossier.md` (edit)

**Work**

1. Author the shared reference defining: the protagonist-grade standard ("even a background figure feels like the protagonist of their own life — engine density, not screen time"); the required engine fields (`world_produced_wound`, `active_appetite`, `self_mythology`, `irreconcilable_contradiction`, `pressure_behavior`, `relational_charge`, `moral_psychological_edge`, `signature_scene_behaviors`, `voice_under_pressure`, `cannot_be_swapped_out_because`); the mutation rule (mutate the social/institutional/bodily/moral/epistemic engine, do not merely intensify adjectives); the single-seed mutation spread (darker / more pathetic / more institutionally dangerous / more ordinary-but-sharper / canon-edge-or-requiring / premise-reversal-preserving-essence); and the rejection triggers. Every field's prose must require world-producedness (Rule 2 hook).

2. Add a required `memorability_profile` block to the NCP template (`seed_essence_preserved[]`, the engine fields above) plus an `upgrade_lineage` block (`origin_kind`, `source_path`, `source_proposal_id`, `mutation_summary`, `rejected_directions_audit[]`).

3. Add a required `dramatic_core` block to the CHAR dossier template frontmatter (the engine fields above) and six new body sections (see Phase 4).

**Acceptance**: one canonical reference exists for protagonist-grade construction; both templates expose the required fields with correct YAML shape and heading set.

---

### Phase 2 — New `deepen-character-proposal` skill

**Files**

- `.claude/skills/deepen-character-proposal/SKILL.md` (new)
- `.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md` (new)

**Skill contract**

- `description`: "Use when deepening one user-authored character seed or one existing NCP proposal card into a stronger protagonist-grade NCP proposal card. Produces one improved NCP card; never writes canon; never writes a CHAR dossier." `user-invocable: true`.
- Arguments: `world_slug` (required), `input_path` (required — markdown seed brief OR existing NCP card), `upgrade_intensity` (optional: `tempered | radical | feral`; default `radical`), `canon_risk_tolerance` (optional: `conservative | open_to_edge | open_to_canon_requiring`; default `open_to_edge`), `output_mode` (optional: `preview_only | write_after_approval`; default `write_after_approval`).
- Output: one NCP card at `worlds/<world_slug>/character-proposals/NCP-<integer>-<slug>.md` (id allocated via `mcp__worldloom__allocate_next_id(world_slug, 'NCP')`) + `character-proposals/INDEX.md` update. **Mutates only `character-proposals/`.** No NCB manifest required for single-seed upgrades (`batch_id` omitted; `upgrade_lineage.origin_kind: upgraded_seed | user_seed`).

**`<HARD-GATE>`** (no file write until): FOUNDATIONS + WORLD_KERNEL + ONTOLOGY + the shared protagonist-grade reference are loaded; the input seed is parsed; context loaded with `task_type='propose_new_characters'` seeded on the input; existing CHAR/NCP registry overlap checked; invariant + Mystery Reserve firewall surfaces loaded; ≥5 mutation candidates generated and scored; rejected directions recorded; the upgraded NCP preview shown; the user explicitly approves the write.

**Process**: (1) pre-flight; (2) extract `seed_essence` (separate non-negotiables — world location, species/body premise, institutional slot, user constraints, taboo limits — from negotiables — profession expression, rank, wound, shame, appetite, moral edge, relationships, canon posture, voice, pressure behavior); (3) diagnose blandness/predictability; (4) map world pressures onto the seed (canon facts, sections, institutions, species/body logic, economy, geography, Mystery Reserve boundaries); (5) generate 5–8 radical mutations across the required spread, each stating what essence it preserves and what it mutates; (6) score on the two-layer rubric (Phase 3); (7) reject weak candidates against the rejection triggers; (8) select the strongest surviving candidate (not the safest); (9) canon-route — classify `canon-safe | canon-edge | canon-requiring`, list implied facts and route each to `canon-addition` (precise/local) or `propose-new-canon-facts` (systemic cluster), **never write canon**; (10) compose the upgraded NCP card with `memorability_profile` + `upgrade_lineage` + a compact rejected-directions audit (≥3 entries); (11) deterministic validation (required fields, ids, enums, non-empty sections, canon routing, body headings); (12) LLM protagonist-grade + blandness critic passes with rationale; (13) preview; (14) on approval, write card + INDEX.

**Acceptance**: emits one stronger NCP card; can consume both a markdown brief and an existing NCP; can feed its own output back into itself and forward into `character-generation` via `character_brief_path`.

---

### Phase 3 — Revise `propose-new-characters`

**Files**

- `.claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md` (edit — augment the per-seed engine)
- `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md` (edit — two-layer scoring + new triggers)
- `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` (edit — per-card tests)
- `.claude/skills/propose-new-characters/SKILL.md` (edit — flow diagram + critic-pass slots)
- `.claude/skills/propose-new-characters/templates/proposal-card.md` (edit — already covered by Phase 1; ensure `memorability_profile` populated per card)
- `.claude/skills/propose-new-characters/templates/batch-manifest.md` (edit — extend, do not replace, the audit record)

**Work**

1. **Augment the per-seed character engine (within phases 6–9)** to require a `protagonist_grade_engine` block (`world_produced_wound`, `active_appetite`, `self_mythology`, `irreconcilable_contradiction`, `pressure_behavior{cornered,tempted,humiliated,offered_power,protecting_attachment}`, `relational_charge[{target_or_relation_type,need,resentment_or_fear,likely_harm_or_betrayal}]`, `moral_psychological_edge`, `signature_scene_behaviors[]`, `cannot_be_swapped_out_because`). This consolidates and intensifies the existing `private_appetite` / `private_shame` / `central_contradiction` / `repeated_forced_choice` fields — it does not duplicate them; the reference must state the consolidation mapping explicitly.

2. **Add high-yield mutation families** to the existing 16 (self-mythologizer, shame-defender, corrupted caretaker, sincere fanatic, failed prodigy, beloved institutional monster, pathetic gatekeeper, bodily taboo carrier, erotic/status transgressor [only when world-valid and within user taboo limits], impossible witness, humiliated expert, dangerous innocent, obsolete loyalist, contaminating saint). These are mutation prompts, not surface archetypes; each must still pass world-rootedness and Rule 2.

3. **Replace the single 10-dimension score matrix with a two-layer matrix.** Layer A (world validity): `world_rootedness`, `niche_distinctiveness`, `institutional_embedding`, `ordinary_life_relevance`, `capability_cost_integrity`, `canon_safety`, `canon_burden` (lower better), `overlap_risk` (lower better). Layer B (memorability): `protagonist_grade_force`, `contradiction_irreconcilability`, `appetite_specificity`, `self_mythology_strength`, `pressure_behavior_distinctiveness`, `voice_pressure_distinction`, `relational_charge`, `moral_psychological_edge`, `world_specific_surprise`, `cannot_be_swapped_out`. Aggregate weights memorability heavily: `aggregate = validity_total + 1.5 * memorability_total − canon_burden − overlap_risk`. A canon-safe but weak-memorability proposal must not survive on validity alone.

4. **Add rejection triggers (extending the existing 13)**: valid-but-dull; abstract (non-behavioral) contradiction; generic/polite/missing appetite; missing or merely-stated self-mythology; absent/interchangeable pressure behavior; cosmetic (non-world-produced) weirdness; relationship-neutral; moral edge sanded off; timid mutation that restates the premise; suppressed-instead-of-routed canon-requiring brilliance; vocabulary-only voice distinction; "special" by exception without cost/bottleneck/secrecy/taboo/institutional mechanism.

5. **Add two mandatory critic-pass slots**: a blandness-executioner (fails "good Worldloom citizen but unmemorable" cards) and a protagonist-grade critic ("could this person carry a compelling story under world pressure?"). Both record rationale.

6. **Add per-card validation tests (extending the existing 12)**: protagonist-grade engine present and fully populated; `world_produced_wound`/`active_appetite`/`self_mythology` not generic; `pressure_behavior` has ≥4 distinct responses; `relational_charge` has ≥1 charged relation with need + harm risk; `cannot_be_swapped_out_because` names world-specific reasons; memorability critic pass recorded with rationale. Field-presence/shape is deterministic; quality is LLM-critic-judged.

**Acceptance**: future batch cards are protagonist-grade by default; "valid but dull" is a named hard failure; a bland seed is rejected; a canon-requiring strong seed routes rather than disappears.

---

### Phase 4 — Revise `character-generation`

**Files**

- `.claude/skills/character-generation/SKILL.md` (edit — flow diagram + Phase 4b + Phase 8 tests)
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` (edit — parse NCP `memorability_profile` as a preservation contract)
- `.claude/skills/character-generation/references/phases-1-6-character-construction.md` (edit — Phase 4b deepening/preservation)
- `.claude/skills/character-generation/references/phase-8-validation-tests.md` (edit — new tests)
- `.claude/skills/character-generation/templates/character-dossier.md` (edit — covered by Phase 1)

**Work**

1. **Preservation contract (Phase 0).** When `character_brief_path` points to an NCP card carrying `memorability_profile`, Phase 0 extracts it into an `input_memorability_contract` (`source_proposal_id`, `preserved_essence[]`, `protagonist_grade_engine{}`, `flattening_forbidden_without_user_approval: true`). If Phase 7 canon safety requires weakening a dramatic element, the skill must name the tradeoff before commit (anti-flattening).

2. **Phase 4b — Protagonist-Grade Deepening / Preservation** (inserted after Phase 4 Goal and Pressure Construction): preserve NCP `memorability_profile` if present, else derive a `dramatic_core` from the brief and generated character; convert contradiction → repeated behavior, shame → self-mythology, desire → appetite, social embedding → relational charge, voice → pressure speech; add ≥3 signature scene behaviors arising from body/work/status/fear/appetite/institution.

3. **Add required CHAR frontmatter `dramatic_core`** (the engine fields, with `signature_scene_behaviors` minItems 3, `pressure_behavior` 5 keys, `voice_under_pressure` 4 keys, `relational_charge` minItems 1).

4. **Add body sections** before "Likely Story Hooks": `## Protagonist-Grade Core`, `## Pressure Behavior`, `## Self-Mythology and Blind Spots`, `## Relational Charge`, `## Moral and Psychological Edge`, `## Signature Scene Behavior`. "Likely Story Hooks" stays a pressure-surface description (no act structure).

5. **Add Phase 8 validation tests**: `dramatic_core` required and complete; wound is world-produced (not generic biography); contradiction is behavioral and recurrent; pressure behaviors are distinct (not synonyms); relational charge includes need + likely harm/betrayal; voice-under-pressure passes a swap test; if source was NCP, the dossier preserves or explicitly names any altered memorability element; no story-system-specific fields added.

**Acceptance**: a strong NCP becomes a CHAR preserving all load-bearing elements; canon repair that weakens the profile is surfaced before approval; a non-NCP brief still yields a generated `dramatic_core`; a dossier without `dramatic_core` fails; CHAR remains a world entity, not story-aware.

---

### Phase 5 — Schemas and validators

**Files**

- `tools/validators/src/schemas/character-frontmatter.schema.json` (edit — add required `dramatic_core`)
- `tools/validators/src/schemas/character-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/character-proposal-batch.schema.json` (new)
- `tools/validators/src/structural/utils.ts` (edit)
- `tools/validators/src/structural/record-schema-compliance.ts` (edit — `hybridRecordsFromFiles`)
- `tools/validators/src/structural/character-memorability-structure.ts` (new)
- `tools/validators/src/public/registry.ts` (edit — register the new structural validator)
- `tools/world-index/src/parse/prose.ts` (edit — `CANONICAL_ID_REGEX`)
- `CLAUDE.md` (edit — add NCP / NCB to §ID Allocation Conventions)

**Work**

1. **CHAR schema**: add a required `dramatic_core` object (engine fields, nested `pressure_behavior`/`voice_under_pressure` objects with `additionalProperties:false`, `relational_charge` array minItems 1, `signature_scene_behaviors` array minItems 3, all leaf strings minLength 1). Add `dramatic_core` to the top-level `required` array. Existing animalia dossiers without it fail (intended).

2. **NCP schema** (`character-proposal-card.schema.json`): `additionalProperties:false`; required = the character-generation compatibility fields + `niche_summary`, `depth_class` (enum extended to `emblematic | elastic | round_load_bearing | protagonist_grade`), `proposal_family`, `diagnosis_target`, `memorability_profile` (full required block per the report's skeleton at report lines 1250–1321), `scores`, `canon_assumption_flags`, `recommended_next_step`, `critic_pass_trace`, `canon_safety_check`, `source_basis`. `batch_id` is **optional** (`^NCB-[0-9]+$`). `canon_assumption_flags.status ∈ {canon-safe, canon-edge, canon-requiring}`; conditional `allOf` requires non-empty `implied_new_facts` (each `{statement, reason_needed, preferred_route ∈ {canon-addition, propose-new-canon-facts}}`) when `status: canon-requiring`. Add an optional `upgrade_lineage` block. **Because `additionalProperties: false`, the schema's `properties` block must enumerate the FULL current NCP template surface, not only the required set — the optional fields `occupancy_strength`, `score_aggregate` (or the renamed aggregate field from Phase 3's two-layer scoring), `notes`, and the optional authorial-steer fields `central_contradiction` / `desired_emotional_tone` / `desired_arc_type` / `taboo_limit_themes` must be declared as permitted properties, or freshly-generated `propose-new-characters` cards carrying them fail validation. Keep `scores` a permissive `{type: object}` so Phase 3's scoring-shape change does not re-break the schema. The intended backward-compat break (Key Design Decisions) is scoped to the new required `memorability_profile` only; it must NOT extend to these legitimate optional fields.**

3. **NCB schema** (`character-proposal-batch.schema.json`): validate the batch-manifest frontmatter shape (extend, do not replace, the existing audit record).

4. **Structural utilities** (`utils.ts`): add `character_proposal_card` and `character_proposal_batch` to `STRUCTURAL_NODE_TYPES`; map them in `RECORD_TYPE_TO_SCHEMA` (`character-proposal-card`, `character-proposal-batch`); add path/id patterns to `isStructuralAuthorityRecord` (`/^character-proposals\/[^/]+\.md$/` for cards, `/^character-proposals\/batches\/[^/]+\.md$/` for batches); add `character-proposals` (and `character-proposals/batches`) to `listSupportedWorldFiles`.

5. **`hybridRecordsFromFiles`** (`record-schema-compliance.ts`): add a `character-proposals/` scan branch (canonicalize node_id via `proposal_id`; node_type `character_proposal_card`) and a `character-proposals/batches/` branch (node_id via `batch_id`; node_type `character_proposal_batch`), paralleling the existing `characters/` branch at lines 319–331.

6. **Structural body validator** (`character-memorability-structure.ts`, new — registered in `tools/validators/src/public/registry.ts` alongside the other structural validators, so `world-validate` actually runs it). **CHAR checks**: missing `## Protagonist-Grade Core` / `## Pressure Behavior` / `## Relational Charge` / `## Self-Mythology and Blind Spots` / `## Moral and Psychological Edge` / `## Signature Scene Behavior` body sections; `dramatic_core.signature_scene_behaviors` fewer than 3; duplicated/empty `pressure_behavior` values. **NCP checks**: missing `## Rejected Directions Audit` body section when `upgrade_lineage.origin_kind: upgraded_seed`; `canon-requiring` without implied facts. The six prose body sections are NOT checked on NCP — NCP carries the protagonist-grade engine in its `memorability_profile` frontmatter (validated by the AJV schema in item 2), not as body prose. **Both**: placeholder/TODO text. Failure messages are actionable (name field/section + content kind needed).

7. **World-index `CANONICAL_ID_REGEX`** (`prose.ts` line 28): add `NCB` so batch records can be canonicalized when frontmatter exposes `batch_id` (current regex `/^(DA|CHAR|PR|NCP|AU)-\d+$/` omits it; `STRUCTURED_ID_REGEX` already includes `NCB`). Index semantics otherwise unchanged.

8. **`CLAUDE.md` §ID Allocation Conventions** (docs): add `NCP-<integer>` (character proposal cards) and `NCB-<integer>` (character proposal batch manifests) to the §ID Allocation Conventions list. These IDs predate this spec (emitted by `propose-new-characters`) but are absent from the convention table; first-classing NCP/NCB schema validation here is the natural point to document them. The `allocate_next_id` allocator already supports both classes (`tools/world-mcp/src/tools/allocate-next-id.ts:21–22`).

**Acceptance**: NCP/NCB are first-class schema-validated through `hybridRecordsFromFiles`; `listSupportedWorldFiles` includes `character-proposals/*.md` and `character-proposals/batches/*.md`; old weak records fail with actionable messages; structured edge `character_proposal_card.batch_id → character_proposal_batch` still emits when `batch_id` present; story-bootstrap CHAR-id resolution is unchanged.

---

### Phase 6 — MCP / context packet (minimal; dedicated task type deferred)

**Files**

- (none required for the deferred-task-type path) — the new skill loads context with `task_type='propose_new_characters'`.

**Work**: confirm `deepen-character-proposal` retrieval quality using the existing `propose_new_characters` ranking profile (`tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` lines 24–44), seeded on the input brief/NCP node. **Do not** add `character_proposal_upgrade` to `TASK_TYPES`, `rankingProfilesByTaskType`, default budgets, or `docs/CONTEXT-PACKET-CONTRACT.md` in this spec. If, in practice, the upgrade skill's retrieval is demonstrably mis-ranked (e.g. the seed NCP/brief is not surfaced as local authority, or canon-edge routing lacks invariant context), open a follow-up spec to add the dedicated task type + profile + budget — with this spec's deferral as the documented precedent.

**Acceptance**: the upgrade skill receives sufficient context (input as seed authority, nearest CHAR/NCP overlaps, governing canon/invariants/Mystery Reserve) without a new task type, with no story contamination (story context is null for non-story task types per the context-packet contract).

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Core Principle (constrained model, not a bag of cool facts) | aligns | Memorability is defined as world pressure made personal; the shared engine forces every wound/appetite/edge to root in institutions, body/species, economy, geography, taboo, law, history, or epistemic limits. |
| Rule 2 (No Pure Cosmetics) | aligns | Every strange/abrasive/grotesque trait must change labor, embodiment, norms, status, ecology, etc.; cosmetic weirdness is an explicit rejection trigger and a deterministic-then-LLM check. |
| Rule 3 (No Specialness Inflation) | aligns | Universal `dramatic_core` does not mean universal exceptional capability; "engine density, not theatrical loudness." Capability claims still route through the existing Phase 5/7 capability-cost and distribution conformance — unchanged by this spec. |
| Rule 4 (No Globalization by Accident) | N/A (defensive) | This pipeline reads canon and never widens distribution scope; capability/distribution checks in `character-generation` Phase 7c are untouched. Listed defensively because the surface is capability-adjacent. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | The new skill and revised skills retain the existing Mystery Reserve firewall surfaces; canon-edge/canon-requiring mutations route implied facts to `canon-addition`/`propose-new-canon-facts` rather than asserting them, preserving the firewall. |
| §Story Bundles (world/story separation) | aligns | No story-system-specific fields on CHAR/NCP; story bootstrap continues to consume CHAR ids; ephemeral cast remains `STENT`, outside this spec. The character system stays a clean upstream world-canon-reading producer. |
| §Canonical Storage Layer (engine-only `_source/` writes) | aligns | All three skills remain canon-reading: they write only under `characters/` and `character-proposals/`; never `_source/`. Canon-requiring implications are routed, never written. |
| Validation-test discipline (rationale required) | aligns | Every LLM-critic PASS carries a one-line rationale; deterministic validators enforce shape only. |

---

## Out of Scope

- A dedicated `character_proposal_upgrade` MCP task type, ranking profile, default token budget, and context-packet-contract entry (deferred — Phase 6 / Key Design Decisions).
- An `NCU-<integer>` upgrade-audit record class and `character-proposals/upgrades/` directory (deferred; compact audit lives inside the card's `upgrade_lineage.rejected_directions_audit[]` first).
- Any change to `branching-story-bootstrap`, `branching-story-turn-cycle`, or other story-pipeline skills; story consumers receive richer CHAR dossiers but are not modified.
- Backward-compatibility shims or auto-migration for existing animalia CHAR/NCP records (intentionally fail; manual edit).
- Projection-completeness audits of unrelated MCP surfaces.
- Any change to capability/distribution validation semantics (Rules 3/4 enforcement surfaces are untouched).

---

## Deliverables

1. `.claude/skills/_shared-references/protagonist-grade-character-engine.md`
2. `.claude/skills/deepen-character-proposal/SKILL.md` + `templates/upgraded-proposal-card.md`
3. Revised `propose-new-characters` references (6–9, 11–13, 14–16), SKILL.md, and templates
4. Revised `character-generation` SKILL.md, references (phase-0, phases-1-6, phase-8), and dossier template
5. `tools/validators/src/schemas/character-proposal-card.schema.json` + `character-proposal-batch.schema.json` + updated `character-frontmatter.schema.json`
6. Updated `tools/validators/src/structural/utils.ts` + `record-schema-compliance.ts` + new `character-memorability-structure.ts` + its registration in `tools/validators/src/public/registry.ts`
7. Updated `tools/world-index/src/parse/prose.ts` (`CANONICAL_ID_REGEX`)
8. Updated `CLAUDE.md` §ID Allocation Conventions (add NCP / NCB)

---

## Risks & Open Questions

- **Over-intensification.** Mitigated by engine-density framing and Rule-2 world-producedness, not by tiering (decision: universal). If batch output trends operatic in practice, tune the LLM critic prompts (not the schema).
- **Cosmetic weirdness.** Mitigated by Rule 2 enforcement at the deterministic-then-critic boundary; every strange trait must trace to a world mechanism.
- **Canon-burden inflation** (best versions trend canon-requiring). Mitigated by scoring `canon_burden` separately, routing implied facts explicitly, and rejecting high-burden/low-payoff proposals.
- **Validator overreach.** Mitigated by the deterministic-vs-LLM split — AJV/structural enforce exposure of the engine; literary greatness is never encoded as JSON schema.
- **Schema/skill coupling.** The NCP `memorability_profile` requirement and the `propose-new-characters` Phase-3 emission must land together (Phase 3 before Phase 5); otherwise batch generation produces schema-invalid cards. Sequencing handles this.
- **Open question — `depth_class: protagonist_grade`.** The enum gains a fourth value; confirm whether `propose-new-characters` should ever emit it, or whether it is reserved for `deepen-character-proposal` output. Resolve during Phase 3 authoring.

---

## Test Plan

**Schema (AJV)**: NCP schema accepts a complete upgraded card; accepts a batch-generated card carrying the optional template fields (`occupancy_strength`, `score_aggregate`, the authorial-steer fields) under `additionalProperties: false`; rejects missing `memorability_profile`; rejects `canon-requiring` with empty `implied_new_facts`. CHAR schema rejects missing `dramatic_core`.

**Structural**: `character-memorability-structure.ts` rejects missing protagonist-grade body headings on CHAR dossiers (the six sections) and rejects CHAR `signature_scene_behaviors` < 3 and duplicated/empty `pressure_behavior`; it does NOT check NCP for the six prose body headings (NCP's engine lives in `memorability_profile` frontmatter). It rejects NCP missing `## Rejected Directions Audit` when `origin_kind: upgraded_seed`. `hybridRecordsFromFiles` validates `character-proposals/NCP-*.md` and `character-proposals/batches/NCB-*.md`; `listSupportedWorldFiles` includes both `character-proposals` paths.

**World-index**: NCP retains canonical node id via `proposal_id`; NCB canonicalizes via `batch_id` after the regex change; `character_proposal_card.batch_id → character_proposal_batch` edge still emits when `batch_id` present.

**Story (regression)**: `branching-story-bootstrap` fixture still resolves `selected_cast` CHAR ids unchanged; no story-bundle record is touched.

**Skill (manual / fixture)**: `deepen-character-proposal` consumes a markdown brief; consumes an existing NCP; produces a canon-safe output; produces a canon-requiring output with routes; records a rejected-directions audit (≥3). `propose-new-characters` rejects a bland seed and routes a canon-requiring strong seed. `character-generation` turns a strong NCP into a CHAR preserving load-bearing elements and surfaces any canon-forced flattening before approval.

Every validation-test PASS entry requires a one-line rationale; a bare PASS is treated as FAIL.
