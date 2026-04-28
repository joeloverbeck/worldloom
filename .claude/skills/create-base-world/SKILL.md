---
name: create-base-world
description: "Use when starting a new worldloom world from a user premise. Produces: a new atomic-source world bundle at worlds/<world-slug>/ — WORLD_KERNEL.md and ONTOLOGY.md at the world root plus a genesis multi-record set under _source/ (CF-0001, CH-0001, ≥1 invariant per category, seed mysteries / open questions / named entities, and one initial section per prose concern), all created via a single engine-routed patch plan. Mutates: creates worlds/<world-slug>/ and emits its initial canonical state through mcp__worldloom__submit_patch_plan."
user-invocable: true
arguments:
  - name: world_name
    description: "Human-readable display name for the world (e.g., 'Ashen Dunes'). Kebab-cased to derive the directory slug worlds/<world-slug>/."
    required: true
  - name: premise_path
    description: "Path to a freeform markdown brief containing the user's premise, genre, mood, exclusions, intended use case, and optional inspirations / red lines. If omitted, Phase 0 interviews the user to elicit the same information."
    required: false
---

# Create Base World

Transforms a user premise into a self-consistent atomic-source world. After judgment-only synthesis phases, the skill writes `WORLD_KERNEL.md` + `ONTOLOGY.md` at the world root, bootstraps an empty world index, and then routes every atomized concern (Canon Ledger, Change Log, Invariants, Mystery Reserve, Open Questions, Named Entities, and the seven prose-section classes) through a single `mcp__worldloom__submit_patch_plan` call so genesis is atomic — the world is either fully created or not created at all.

<HARD-GATE>
Do NOT call `mcp__worldloom__submit_patch_plan` and do NOT write `WORLD_KERNEL.md` or `ONTOLOGY.md` until: (a) pre-flight confirms `worlds/<world-slug>/` does not already exist; (b) Phase 9 self-validation passes; (c) the user has explicitly approved the Phase 10 deliverable summary and issued an `approval_token`. If `worlds/<world-slug>/` already exists, abort and require the user to supply a different `world_name` — overwriting an existing world is forbidden. The gate is absolute under Auto Mode; invoking the skill is not approval of the deliverable.
</HARD-GATE>

## Process Flow

```
Pre-flight (slug; refuse-overwrite; load FOUNDATIONS.md)
   |
   v
Phase 0:  Normalize the user premise (parse premise_path OR interview)
   |
   v
Phase 1:  Establish baseline via minimal departure (23 domains: unchanged / altered / unknown)
   |
   v
Phase 2:  Compose World Kernel (genre / tone / chronotope / primary difference / pressures / engines)
   |
   v
Phase 3:  Synthesize Invariants (≥1 each: ontological / causal / distribution / social / aesthetic_thematic)
   |
   v
Phase 4:  Compose initial sections (one SEC per prose concern — GEO / PAS / INS / ECR / MTS / ELF / TML)
   |
   v
Phase 5:  Install Mystery Reserve seeds (active / passive / forbidden — at least one of each)
   |
   v
Phase 6:  Capture Open Questions (deferred design choices)
   |
   v
Phase 7:  Register Named Entities (genesis regions, polities, peoples — entity_kind set)
   |
   v
Phase 8:  Compose CF-0001 (the world's primary-difference fact) and CH-0001 (genesis change-log entry)
   |
   v
Phase 9:  Self-validate (rejection tests; CF Rule 1 schema check; bidirectional CF↔SEC pointer pre-check)
   |
   v
Phase 10: HARD-GATE — present deliverable summary; await user approval_token
   |
   v
Phase 11: Direct-write WORLD_KERNEL.md + ONTOLOGY.md → bootstrap empty index → submit_patch_plan
```

## Pre-flight

1. Derive `<world-slug>` from `world_name` (kebab-case, lowercase, punctuation-stripped).
2. If `worlds/<world-slug>/` already exists, **abort**. Overwriting is forbidden.
3. Load `docs/FOUNDATIONS.md` into working context (§Canon Layers, §Mandatory World Files atomic-source classification, §World Kernel template, §Invariants schema, §Canon Fact Record Schema, §Validation Rules, §Canonical Storage Layer).
4. Resolve canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class: "domain"})`, `({class: "verdict"})`, `({class: "mystery_resolution_safety"})` — apply at synthesis time so emitted records use canonical enum values from the start.

## Phase 0: Normalize the User Premise

Parse `premise_path` if provided; otherwise interview the user. Extract: genre identity, implied baseline reality, intended ontological departures, power-fantasy level, social density, violence level, cosmological scale, likely focal conflicts, what excites the user, what must not happen. Surface every inferred (vs. user-stated) item in the Phase 10 deliverable so the user can confirm or correct.

## Phase 1: Baseline via Minimal Departure

For each of 23 domains (physics, cosmology, biology, reproduction, lifespan, sentience, language, religion, governance, warfare, medicine, metallurgy, agriculture, labor, family structure, sexuality / kinship, trade, literacy, death, afterlife, weather, disease, ecology), mark **unchanged / altered / unknown**. Locate where difference enters; do not begin by inventing differences.

## Phase 2: World Kernel

Write a one-paragraph kernel; expand to FOUNDATIONS §World Kernel fields (genre contract, tonal contract, chronotope, primary difference, core pressures, natural story engines, what is ordinary / wonder / taboo). The kernel must distinguish what is common, what is rare, what is impossible — if it cannot, it is not ready.

## Phase 3: Invariants

Synthesize at minimum one invariant per category (ontological, causal, distribution, social, aesthetic_thematic) — more where the world demands. Each carries identifier (`ONT-N` / `CAU-N` / `DIS-N` / `SOC-N` / `AES-N`, 1-based per category), title, statement, rationale, examples, non_examples, break_conditions, revision_difficulty (`low` / `medium` / `high`), `extensions: []`. **Rule 2 (No Pure Cosmetics)** is enforced here — embodiment, magic, and institutions must change something material.

## Phase 4: Initial Prose Sections

Compose one initial section record per prose concern (seven total): geography (`SEC-GEO-001`), peoples and species (`SEC-PAS-001`), institutions (`SEC-INS-001`), economy and resources (`SEC-ECR-001`), magic or tech systems (`SEC-MTS-001`), everyday life (`SEC-ELF-001`), timeline (`SEC-TML-001`). Each carries `id`, `file_class` (canonical UPPER_SNAKE: `GEOGRAPHY` / `PEOPLES_AND_SPECIES` / `INSTITUTIONS` / `ECONOMY_AND_RESOURCES` / `MAGIC_OR_TECH_SYSTEMS` / `EVERYDAY_LIFE` / `TIMELINE`), `order: 1`, `heading`, `heading_level: 2`, `body` (markdown prose seeded with the genesis material), `touched_by_cf: [CF-0001]` for sections whose file class appears in CF-0001's `required_world_updates`, `extensions: []`. Each touched section's body MUST materialize ≥1 first-order consequence of CF-0001 in domain-appropriate prose; stubs that defer materialization to later `canon-addition` runs are rejected at Phase 9. The world starts **thin in coverage, not in concrete commitment** — each touched section's body materializes first-order consequences of CF-0001, while second / third-order consequences accumulate via `canon-addition`. One section per concern is sufficient at the structural level.

## Phase 5: Mystery Reserve

Seed at least one mystery in each status — `active` (characters care now), `passive` (atmospheric depth), `forbidden` (long-term unresolvable). Each: `id` (`M-N`, 1-based), `title`, `status`, `knowns`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`, `domains_touched`, `future_resolution_safety` (per FOUNDATIONS Resolution-safety semantics: `forbidden` ⇒ `none`; `active`/`passive` ⇒ `low`/`medium`/`high`), `extensions: []`. **Rule 7 (Preserve Mystery Deliberately)** — mystery must be bounded, not mushy.

## Phase 6: Open Questions

Capture deferred design choices the world is not committing yet (e.g., specific place names, sect-by-sect doctrinal detail, regional micro-cultures). Each: `id` (`OQ-NNNN`), `topic`, `body`, `when_to_resolve`, optional `caution`, `extensions: []`.

## Phase 7: Named Entities

Register genesis named entities — regions, prominent polities, peoples or species clusters — that the World Kernel depends on. Each: `id` (`ENT-NNNN`), `canonical_name`, `entity_kind` (per FOUNDATIONS §Ontology Categories: `region` / `polity` / `species` / `place` / etc.), `aliases: []`, `originating_cf: null` (genesis), `scope_notes` (one short line).

## Phase 8: Genesis CF-0001 and CH-0001

**CF-0001** is the primary-difference fact — the single canon fact most distinguishing of this world. Schema per FOUNDATIONS §Canon Fact Record Schema: `id: CF-0001`, `title`, `status: hard_canon`, `type` (from FOUNDATIONS §Ontology Categories enum), `statement`, `scope` (`geographic` / `temporal` / `social`), `truth_scope` (`world_level: true`, `diegetic_status: objective`), `domains_affected[]` (canonical-domain values from `get_canonical_vocabulary`), `prerequisites[]`, `distribution.{who_can_do_it, who_cannot_easily_do_it, why_not_universal}`, `costs_and_limits[]`, `visible_consequences[]`, `required_world_updates[]` (file-class names of every prose concern whose initial SEC cites CF-0001 in `touched_by_cf`), `source_basis.{direct_user_approval: true, derived_from: []}`, `contradiction_risk.{hard, soft}`, `notes`, `epistemic_profile`, `exception_governance`, `modification_history: []`. **Rule 1 (No Floating Facts)** — every required field must be non-empty (use inline N/A justification only when genuinely inapplicable).

**Genesis propagation requirements (SPEC-18 Track A2)**: `domains_affected[]` MUST span ≥4 canonical domains. `visible_consequences[]` MUST enumerate first / second / third-order consequences explicitly, distinguishing immediate effects (first-order) from cascade effects through institutions / professions / taboos (second-order) from far-edge effects on language / mourning / childhood (third-order). Three orders is the genesis bar; weaker propagation routes back to Phase 0. If CF-0001 introduces or depends on exceptional capability per `requiresExceptionGovernance(cf.type)`, populate Rule 11 leverage with ≥3 distinct ordinary- / mid-tier-actor leverage forms in CF-0001's `notes` field as a `leverage:`-prefixed comma-separated line, drawing forms from the permissible enum (`locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`) — matches the `rule11_action_space` validator's parsing convention used by canon-addition Phase 14a Test 11 (genesis spectator-caste check).

**Genesis-world conditionally-mandatory blocks (per SPEC-09)**: When constructing the genesis CF-0001 `create_cf_record` op, populate `epistemic_profile` and `exception_governance`, or set each to the `n_a`-with-fact-type-rationale form per `docs/FOUNDATIONS.md` §Canon Fact Record Schema. Treat the exported `requiresEpistemicProfile(cf.type)` and `requiresExceptionGovernance(cf.type)` helpers in `tools/validators/src/structural/record-schema-compliance.ts` as the source-of-truth taxonomy for conditional presence; this is a source-module reference, not a package export. If a block applies to the genesis fact (for example, CF-0001 introduces a capability, exception-bearing artifact, or knowledge-asymmetric truth), populate it from the user's premise interview, world-kernel synthesis, baseline-departure analysis, and equilibrium explanation. If a block does not apply (for example, CF-0001 is a pure geographic, structural, or institutional-plumbing fact), emit `n_a` with a rationale containing a fact-type keyword from `docs/FOUNDATIONS.md` §Ontology Categories. Surface ambiguity to the user in the Phase 10 deliverable summary rather than defaulting to `n_a`.

**CH-0001** is the genesis change-log entry. Schema per FOUNDATIONS §Change Control Policy: `change_id: CH-0001`, `date` (today's ISO date), `change_type: addition`, `affected_fact_ids: [CF-0001]`, `summary`, `reason: ["initial world creation"]`, `scope.{local_or_global: global, changes_ordinary_life: true, creates_new_story_engines: true, mystery_reserve_effect: expands}`, `downstream_updates: []`, `impact_on_existing_texts: []`, `severity_before_fix: 0`, `severity_after_fix: 0`, `retcon_policy_checks` (all true; trivially so at genesis), `latent_burdens_introduced: []`, `notes`.

## Phase 9: Self-validation

Run the rejection tests. Reject or revise if any are true:

- species or peoples are cosmetic (Rule 2) · magic / tech has no cost or social consequence · institutions do not explain how power persists · geography has no cultural or political effect · history leaves no residue · daily life is absent · every mystery is actually vagueness · world tone and ontology are mismatched · the world supports only heroes, not populations · there is no explanation for why extraordinary facts have not transformed everything (Rule 3 / Rule 4 — Equilibrium Explanation).

**SPEC-18 Track A3 Acceptance-Test additions**: add eight new tests to the rejection-test list. Each fires as judgment-only, consistent with Phase 9's existing test discipline; none are validator-bound at Phase-9 time. The eighth test mirrors the mechanical `rule11_action_space` validator's logic so Phase 9 catches a malformed leverage block before the Phase 10 HARD-GATE rather than at the Phase 11 engine pre-apply pass. Record each test as PASS or FAIL with a one-line rationale citing the world's specific element that satisfies the test; bare PASS without rationale is FAIL.

1. **Counterfactual (FOUNDATIONS §Acceptance Tests #1)** — FAIL if the world cannot name at least one nearby alternative it rejected and the constraint that forced the chosen shape. Repair by revising Phase 1 / Phase 2 until the baseline departure explains why this world, not the nearby alternative, exists.
2. **Inequality structure (FOUNDATIONS §Acceptance Tests #4)** — FAIL if inequality is merely culturally permitted or aesthetic rather than structurally produced. Repair by naming at least two inequalities generated by the world model's embodiment, resources, institutions, geography, or exceptional capabilities.
3. **Embodiment-forces (FOUNDATIONS §Acceptance Tests #6)** — FAIL if species, body-class, lifespan, reproduction, kinship, or personhood departures do not force concrete social or material consequences. Repair by naming at least one embodied consequence and routing it into the relevant Phase 4 section and CF-0001 visible consequences.
4. **Scarcity-forces (FOUNDATIONS §Acceptance Tests #7)** — FAIL if scarcity is generic pressure instead of a named survival variable with institutional or cultural consequences. Repair by naming the scarcest survival variable and at least one institution, taboo, labor form, settlement pattern, or conflict it produces.
5. **Multi-perspective (FOUNDATIONS §Acceptance Tests #11)** — FAIL if a child, laborer, priest, smuggler, and ruler would all describe the world's fundamental condition in the same way. Repair by differentiating the premise across social position, duty, risk, and access to knowledge.
6. **One-Sentence Fertility (Pattern #1 / #98)** — FAIL if the world reduces to a vague wonder such as "magic exists" or "technology is advanced" rather than one concrete impossible sentence that generates consequences in every direction. Repair by sharpening the primary difference into a concrete impossibility, such as a material, bodily, ecological, institutional, or ritual constraint that cascades across daily life.
7. **Native Story Procedures (Pattern #66 / #71)** — FAIL if the world cannot name at least three story procedures that are native to its premise and hard to reskin elsewhere, such as case, heist, expedition, hunt, dive, scavenge, pilgrimage, audit, ritual, or patrol. Repair by deriving procedures from the world's actual constraints rather than generic genre activity.
8. **Genesis spectator-caste check (FOUNDATIONS §Acceptance Tests #8 / Rule 11)** — If `requiresExceptionGovernance(CF-0001.type)` is true (`capability`, `bloodline`, `magic_practice`, `technology`, `divine_action`, `artifact_dependent_truth`, `exception_introducing_fact`), FAIL unless CF-0001's `notes` field contains a `leverage:`-prefixed line enumerating at least three forms from the permissible enum: `locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`. PASS rationale must name the leverage forms. If `requiresExceptionGovernance(CF-0001.type)` is false, PASS trivially with a rationale citing the type and noting the test is conditional. Repair by revising Phase 8 `notes` before Phase 10 approval.

Schema spot-check: every emitted CF / CH / INV / M / OQ / ENT / SEC has every required field populated; every SEC's `touched_by_cf` cites a CF whose `required_world_updates` lists that SEC's `file_class`, and every CF's `required_world_updates` has a matching SEC citation (bidirectional pointer pre-check — the engine and `touched_by_cf_completeness` validator will fail-fast otherwise).

**Coverage check (Rule-1 inverse)**: every distinct fact in the user's premise must map to ≥1 of: CF-0001 (or its `notes` cross-reference), an Open Question, a Mystery Reserve entry, an invariant, or — explicitly — an "unmapped" line in the Phase 10 summary asking the user to confirm intent.

## Phase 10: HARD-GATE — Deliverable Summary

Present the final summary to the user (do NOT write any file yet):

1. One-paragraph world kernel · 2. invariant table (id / category / one-line statement) · 3. species / peoples summary (cluster / population scale / distinguishing embodiment) · 4. geography-pressure summary · 5. institutional summary · 6. historical pressure summary · 7. pressure systems · 8. mystery reserve entries (id / status / one-line title) · 9. CF-0001 statement, `domains_affected`, `epistemic_profile`, and `exception_governance` · 10. genesis-bundle counts (`#CF: 1`, `#CH: 1`, `#INV: ≥5`, `#M: ≥3`, `#OQ`, `#ENT`, `#SEC: 7`) · 11. unresolved `epistemic_profile` / `exception_governance` ambiguity, if any · 12. unmapped-premise items (if any).

Wait for explicit user approval. The user's approval message must include or trigger an `approval_token` per `docs/HARD-GATE-DISCIPLINE.md`. **Do not advance to Phase 11 without it.**

## Phase 11: Bootstrap and Engine-Routed Genesis Write

Order matters — `submit_patch_plan` runs `world-index sync` post-apply, which requires `WORLD_KERNEL.md` and `ONTOLOGY.md` to exist:

1. **`Write` `worlds/<slug>/WORLD_KERNEL.md`** — narrative summary populated from the Phase 2 kernel and its expanded fields (Hook 3 explicitly allows world-root primary-authored files).
2. **`Write` `worlds/<slug>/ONTOLOGY.md`** — Categories in Use + Relation Types in Use + Notes on Use. The Named Entity Registry is **NOT** placed in `ONTOLOGY.md` post-SPEC-13 — entities ship as atomic `_source/entities/ENT-NNNN.yaml` records via the patch plan (Hook 3 allowlist).
3. **Bootstrap the empty world index** so `submit_patch_plan` can open it. Run from the project root: `node -e "require('@worldloom/world-index/index/open').openIndex(process.cwd(), '<world-slug>').close()"`. This creates `worlds/<slug>/_index/world.db` with the schema applied and zero nodes.
4. **Assemble the genesis `PatchPlanEnvelope`**:
   - `plan_id: PLAN-CBW-<slug>-0001`
   - `target_world: <world-slug>`
   - `verdict: APPROVED` · `originating_skill: "create-base-world"` · `originating_cf_ids: ["CF-0001"]` · `originating_ch_id: "CH-0001"`
   - `expected_id_allocations`: `{cf_ids: ["CF-0001"], ch_ids: ["CH-0001"], inv_ids: [<all genesis invariant ids in canonical order: ONT-1, CAU-1, DIS-1, SOC-1, AES-1, …>], m_ids: [<all genesis M-N ids>], oq_ids: [<all genesis OQ-NNNN ids>], ent_ids: [<all genesis ENT-NNNN ids>], sec_ids: [<all 7 SEC ids>]}`. On a fresh world the engine's `verifyExpectedIdAllocations` accepts these because no prior records exist.
   - `patches`: one `create_cf_record` (CF-0001) + one `create_ch_record` (CH-0001) + one `create_inv_record` per invariant + one `create_m_record` per mystery + one `create_oq_record` per open question + one `create_ent_record` per entity + seven `create_sec_record` ops. Each op carries `op`, `target_world`, and the typed payload field (`cf_record` / `ch_record` / `inv_record` / `m_record` / `oq_record` / `ent_record` / `sec_record`). No `expected_content_hash` (creates) and no `expected_anchor_checksum` (atomic-record ops).
5. **Optional**: call `mcp__worldloom__validate_patch_plan(envelope)` for a pre-apply validator pass (now possible because the index exists). Loop back to the responsible Phase on any `fail` verdict.
6. **Call `mcp__worldloom__submit_patch_plan(envelope, approval_token)`**. The engine: verifies the approval token, verifies ID allocations are still next, runs pre-apply validators, stages every op, commits atomically, then runs `world-index sync`. If any op fails, no files are written — the world is left with only `WORLD_KERNEL.md` + `ONTOLOGY.md` + the empty `_index/world.db`, and the skill must surface the engine error and prompt the user to retry or abort (do NOT manually clean up partial state without user direction).
7. **Verify the receipt**: `files_written` covers every emitted record; `new_nodes` count matches `#CF + #CH + #INV + #M + #OQ + #ENT + #SEC`. Report paths written. Do NOT `git commit` — the user reviews the diff and commits.

## Validation Rules This Skill Upholds

- **Rule 1** (No Floating Facts) — Phase 8 schema enforcement on CF-0001; Phase 9 schema spot-check on every emitted record.
- **Rule 2** (No Pure Cosmetics) — Phase 3 invariant synthesis (embodiment-must-matter); Phase 4 initial-section prose; Phase 9 cosmetic-rejection test.
- **Rule 3** (No Specialness Inflation) — Phase 9 equilibrium-explanation rejection test (every extraordinary capability meets resistance).
- **Rule 4** (No Globalization by Accident) — CF-0001's `distribution` and `scope` fields; Phase 9 globalization-rejection test.
- **Rule 5** (No Consequence Evasion) — CF-0001's `visible_consequences` + `costs_and_limits` + `required_world_updates`; Phase 4 initial sections cite CF-0001 in `touched_by_cf` (bidirectional).
- **Rule 6** (No Silent Retcons) — CH-0001 is the genesis audit-trail anchor; every future change-log entry must extend this chain.
- **Rule 7** (Preserve Mystery Deliberately) — Phase 5 Mystery Reserve seeds with bounded knowns/unknowns and disallowed cheap answers; `future_resolution_safety` coupled to `status`.
- **FOUNDATIONS §Acceptance Tests** — Phase 9 exercises 9 of 11 Acceptance Tests inline (6 net-new in SPEC-18: AT #1 Counterfactual, AT #4 Inequality structure, AT #6 Embodiment-forces, AT #7 Scarcity-forces, AT #8 Genesis spectator-caste check / Rule 11, AT #11 Multi-perspective; 3 partial holdovers via existing rejection triggers: AT #2 powers not optimized away, AT #3 capabilities not mundane, AT #5 geography forces). AT #9 ("What do people falsely believe?") is enforced at canon-addition Phase 14a Test 13 (delivered by SPEC18GENFER-004). AT #10 ("What contradictions are permitted because they are diegetic rather than ontological?") is N/A at fact-creation time and emerges only at world-growth time — currently unchecked, deferred to a future spec. Failure on any test routes back to the responsible upstream phase, typically Phase 2, Phase 4, or Phase 8.

## Record Schemas

- Canon Fact Record → `templates/canon-fact-record.yaml` (mirrors FOUNDATIONS.md §Canon Fact Record Schema)
- Change Log Entry → `templates/change-log-entry.yaml` (mirrors FOUNDATIONS.md §Change Control Policy)
- Invariant / Mystery / Open Question / Named Entity / Section schemas — engine-owned, validated by `record_schema_compliance`; FOUNDATIONS.md §Invariants and §Mystery Reserve are the authoritative human-facing references.

## Guardrails

- The skill bootstraps a new world; it **never** writes to an existing `worlds/<slug>/` directory.
- The skill writes only under `worlds/<world-slug>/`. It never edits `docs/FOUNDATIONS.md`, never edits other worlds, never touches `archive/` or `brainstorming/`.
- Every `_source/*.yaml` write goes through `mcp__worldloom__submit_patch_plan`. Direct `Edit`/`Write` to `_source/<subdir>/*.yaml` is blocked by Hook 3 and is not an acceptable substitute.
- Multi-role passes via the `Agent` tool are recommended for large worlds — more than 5 species clusters, more than 3 climate bands, contested cosmology, or any premise too large to hold in a single synthesis. Delegate Phases 3 (Invariants), 4 (Initial Sections), 5 (Mystery Reserve), and 7 (Named Entities) to role-tagged sub-agents (Ontology Architect, Geography / Ecology Analyst, Institutions Analyst, Mystery Curator) before re-entering Phase 8 for synthesis. For ordinary-scale worlds, monolithic synthesis by the main agent is acceptable.
- Do NOT `git commit` from this skill. Writes land in the working tree only.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root.
- The HARD-GATE at the top of this file is absolute. No file writes — including `WORLD_KERNEL.md` / `ONTOLOGY.md`, the index bootstrap, or the patch plan — before user approval of the Phase 10 deliverable summary.

## Final Rule

A base world is not committed until every required CF / INV / M / OQ / ENT / SEC field is populated, every extraordinary capability meets a stabilizer, every mystery is bounded rather than vague, the bidirectional CF↔SEC pointer holds, and the user has approved the complete deliverable — and once committed, `worlds/<world-slug>/` is treated as existing-world state that this skill will refuse to overwrite.
