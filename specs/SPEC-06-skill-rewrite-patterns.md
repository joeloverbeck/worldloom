<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-06: Skill Rewrite Patterns — Thin Orchestrators

**Phase**: Phase 2 — all 8 skills full migration against atomic source (per SPEC-13, the originally-planned Phase 1 read-side pilot is folded into Phase 2; canon-addition's read-side rewrite lands together with its write-side against `_source/` atomic records)
**Depends on**: SPEC-01, SPEC-02, SPEC-03 (Phase 2), SPEC-04, SPEC-05, **SPEC-13 (atomic-source contract — skills read/write atomic records directly)**, **SPEC-14 (PA contract & vocabulary reconciliation — skills emit validator-conformant adjudications and consume canonical vocabularies at reasoning time)**
**Blocks**: SPEC-08 acceptance criteria (token reduction depends on this spec landing); SPEC-09 Phase 2.5 (Tests 11 & 12 attach to canon-addition's post-rewrite Phase 14a — see `specs/SPEC-09-canon-safety-expansion.md` line 6)

## SPEC-14 amendment summary

This spec was originally written assuming the validator's `adjudication_discovery_fields` validator would catch Discovery-block field-name drift, and that canonical vocabularies (domain enum, mystery-resolution-safety enum) lived in code without a skill-facing API. Per SPEC-14, the following changes apply:

- **Adjudication emission contract.** PA records are hybrid frontmatter+body files (consistent with characters and diegetic artifacts). canon-addition's Phase 2 rewrite emits PAs through `append_adjudication_record` with the SPEC-14 frontmatter shape (`pa_id`, canonical-enum `verdict`, `originating_skill`, `change_id`, four `*_touched` arrays). Validator parses frontmatter via `record_schema_compliance`; the legacy `adjudication_discovery_fields` validator is retired. The "Discovery-section canonical field names" row in §What moves OUT of each skill now maps to `record_schema_compliance` (frontmatter schema) rather than the retired validator.
- **OQ allocation joins the patch plan.** When canon-addition's reasoning raises a new open question, the skill's patch plan includes a `create_oq_record` op AND cites the resulting `OQ-NNNN` ID in the PA's `open_questions_touched[]`. PA files no longer carry free-form OQ topic-strings.
- **Bidirectional `append_touched_by_cf`.** When canon-addition cites a section in `touched_by_cf`, the patch plan includes an `update_record_field` op extending the target CF's `required_world_updates` ahead of the section update — engine fail-fast (SPEC-14) rejects plans that lack the bidirectional pointer.
- **Canonical-vocabulary lookups at reasoning time.** Skills consume `mcp__worldloom__get_canonical_vocabulary({class})` during reasoning to validate domain values, verdict enum, and mystery-resolution-safety values BEFORE writing them into a patch plan. This eliminates a class of post-write validator fails (vocabulary drift) without coupling skill prose to validator code paths.
- **New acceptance criterion** added to §Verification: every record emitted by a rewritten skill must pass `record_schema_compliance` end-to-end. Skill rewrites that emit an artifact failing the schema are incomplete.

## SPEC-13 amendment summary

This spec was originally written against monolithic-markdown storage. Per SPEC-13 §C, the following changes apply:

- **SPEC-06 Part A / Part B distinction collapses.** Part A was the Phase 1 canon-addition read-side pilot; Part B was Phase 2 full migration. With atomic-source landing in Phase 1.5 before Phase 2, there's no value in a read-only pilot against a storage form that will be retired — canon-addition's full rewrite (read + write) lands in Phase 2 against `_source/` directly. `specs/IMPLEMENTATION-ORDER.md` Phase 1 Tier 3 records the SKIP explicitly; the Phase 1 pilot acceptance gate is retired and its token-reduction measurement rolls into Phase 2's ≥80% target.
- **Token reduction target lifts from ≥70% to ≥80%** for large deliveries. Atomic-record retrieval enables the higher target because skills read per-record YAML instead of full-file markdown, even beyond what SPEC-12's scoped-reference and packet-completeness machinery already delivered.
- **Skill-body size estimates revise downward by an additional 15–25% per skill** beyond the pre-SPEC-13 Phase 2 baseline. Prose-layout lore (e.g., "read the §Ordinary Hazards section of EVERYDAY_LIFE.md", "grep for `<!-- added by CF-NNNN -->`", "Large-file method") becomes fully deletable once retrieval is record-addressed.
- **Patch-plan construction shifts to record-id-addressed ops** (SPEC-03's `create_*` / `update_record_field` / `append_extension` / `append_touched_by_cf` vocabulary). No anchor-hash construction for atomic-record ops; `expected_content_hash` is retained for atomic records (per-record YAML hash) but no `expected_anchor_checksum` except for hybrid files (characters, diegetic artifacts).
- **`create-base-world` updates to emit `_source/` directly.** New worlds start in atomic-source form; no legacy storage accumulates after SPEC-13 migration.

## Problem Statement

The eight canon-reading / canon-mutating skills contain thousands of lines of procedural law that mechanism (index + MCP + engine + validators + hooks, SPEC-01 through SPEC-05) can now own. Skills currently mix **reasoning** (judgment — consequence propagation, verdict synthesis, Mystery Reserve firewall adjudication) with **mechanism** (law — file loading, ID allocation, anchor matching, attribution stamping, Rule 1–7 enforcement, write ordering).

**Empirical examples of procedural bloat that mechanism can own**:
- `canon-addition/SKILL.md` Procedure step 1 "Large-file method" (grep-then-targeted-read patterns for 8 file classes)
- `canon-addition/SKILL.md` Procedure step 5 Phase 12a modification_history scan (axis a/b/c decision test + worked examples)
- `canon-addition/SKILL.md` Validation Tests (10-test rubric — mechanical layers of Tests 1, 2, 3, 4, 5, 6, 7 mechanize; Tests 9, 10 plus the judgment layers of Tests 3, 6, 8 stay)
- `canon-addition/references/phase-15a-checkpoint-grep-reference.md` (inter-step structural-integrity grep checkpoints)
- Pre-figuring diegetic-artifact check (glob + grep pattern)
- Discovery-section canonical field-name enforcement
- modification_history retrofit discipline

**Source context**: `brainstorming/structure-aware-retrieval.md` §6 (thin orchestrators), §8 (split retrieval and editing). Brainstorm decision: skills retain judgment; mechanism moves to code.

## Approach

Thin-orchestrator template. Skills retain **reasoning** (judgment phases), delegate **mechanism** (pre-flight, localization, anchor matching, attribution, validation, write ordering). Agent role split makes localization a first-class sub-agent role (Explore subagent with fresh context, Hook 4 SubagentStart bootstrap).

## Deliverables

### Thin-orchestrator template

Every canon-mutating or canon-reading skill post-migration follows this shape:

```
Pre-flight
    └── mcp__worldloom__allocate_next_id(world_slug, id_class)    # replaces grep+scan
    └── mcp__worldloom__get_context_packet(task_type, seed_nodes, budget)    # replaces eager multi-file load

Phase 0: Normalize Input (skill-specific reasoning)
    └── if proposal_path: parse; classify
    └── if not: interview user

Phase N: Domain reasoning phases (JUDGMENT ONLY)
    └── canon-addition: Phases 1-11 (scope, invariants, capability, ..., verdict)
    └── character-generation: essence, niche, voice, MR firewall
    └── continuity-audit: 8 audit categories
    └── etc.

Phase N+1: Assemble patch plan from reasoning output
    └── build PatchOperation[] referencing node_ids from context packet
    └── engine auto-stamps attribution (no hand-formatting)

Phase N+2: mcp__worldloom__validate_patch_plan(plan)
    └── replaces mechanical layers of the 10-test Phase 14a rubric (Tests 1, 2, 4, 5, 7 fully mechanized; mechanical cores of Tests 3, 6 mechanized)
    └── skill-judgment tests (Tests 9, 10 fully; judgment layers of Tests 3, 6, 8) stay in-skill
    └── loop back to relevant Phase on fail

HARD-GATE: Present deliverable summary → wait for user approval → receive approval_token

Phase N+3: mcp__worldloom__submit_patch_plan(plan, approval_token)
    └── engine applies atomically; returns receipt
    └── replaces 25+ Edit tool calls
```

### What moves OUT of each skill (into mechanism)

| Current skill responsibility | Migrated to |
|---|---|
| File loading + FOUNDATIONS.md load | SPEC-02 `get_context_packet` constraints layer |
| Grep-then-targeted-read on large files | SPEC-02 retrieval tools |
| ID allocation via ledger scan | SPEC-02 `allocate_next_id` |
| Pre-figuring diegetic-artifact scan | SPEC-02 `find_named_entities` filtered by node_type |
| "Large-file method" pattern catalog | Deleted — SPEC-02 is the replacement |
| Phase 15a checkpoint grep commands | SPEC-03 engine internal (atomicity replaces checkpoints) |
| Anchor localization (Edit `old_string` construction) | SPEC-03 `expected_anchor_checksum` |
| Write-order discipline (Phase 15a sub-step ordering) | SPEC-03 engine-enforced |
| Attribution stamping (`<!-- added by CF-NNNN -->`, notes-field lines) | SPEC-03 engine auto-stamp |
| Rule 1, 2, 4, 5, 6, 7 mechanical enforcement (Phase 14a Tests 1, 2, 3 mechanical, 4, 5, 6 mechanical, 7) | SPEC-04 validators (Rule 3 / Test 10 stays in-skill — see §What STAYS; archived `archive/specs/SPEC-04-validator-framework.md` §Risks "Rule 3 left unmechanized") |
| Discovery-section canonical field names | SPEC-14 `record_schema_compliance` against the adjudication frontmatter schema (the legacy `adjudication_discovery_fields` validator is retired; PA records are now frontmatter+body hybrids) |
| modification_history retrofit discipline | SPEC-04 `modification_history_retrofit` validator |
| Canonical-vocabulary memorization (domain enum, verdict enum, mystery-resolution-safety enum) | SPEC-14 `mcp__worldloom__get_canonical_vocabulary({class})` MCP tool |
| Bidirectional CF↔SEC pointer maintenance | SPEC-14 engine fail-fast on `append_touched_by_cf` |
| OQ allocation when reasoning raises open questions | SPEC-14 patch plan includes `create_oq_record` op alongside the PA's `open_questions_touched[]` citation |
| Phase 12a axis-(a)(b)(c) mechanical scan | SPEC-02 `find_impacted_fragments` + SPEC-04 `rule6_no_silent_retcons` |
| Large-delivery inter-step structural-integrity grep | SPEC-03 engine atomicity (structurally impossible to fail halfway) |

### What STAYS in each skill (judgment)

| Skill | Reasoning kept |
|---|---|
| `canon-addition` | Phases 1–11 reasoning (scope detection, invariant check, capability analysis, prerequisites, diffusion, consequence propagation with 13 exposition domains, escalation-gate critics, counterfactual pressure test, contradiction classification, repair pass, narrative-fit test, verdict synthesis); Phase 14a Test 9 (verdict cites phases — fully judgment); Phase 14a Test 10 (Rule 3 No Specialness Inflation — Rule 3 unmechanized per archived SPEC-04 §Risks); judgment layers of Test 3 (stabilizer-quality assessment on top of the structural pass), Test 6 (forbidden-answer overlap check against MR entries), Test 8 (stabilizer-mechanism quality assessment) — mechanical cores migrate to validators, the judgment layers stay; Phase 12a axis-(c) decision test (substantive extension vs cross-reference — semantic judgment, not a mechanical scan) |
| `create-base-world` | Genesis brief interpretation; 13-file seeding logic; initial invariant synthesis; CH-0001 composition |
| `continuity-audit` | Audit reasoning across 8 audit categories (contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, diegetic leakage); retcon-proposal card composition |
| `character-generation` | Essence, niche, voice construction; Mystery Reserve firewall judgment; CF-distribution conformance check |
| `diegetic-artifact-generation` | Artist persona construction; truth-status discipline (narrator voice vs world-level); diegetic-to-world firewall judgment |
| `propose-new-canon-facts` | Thinness-gap identification; 5-angle reasoning (open niches, institutional adaptations, contested knowledge, mystery seeds, cross-domain couplings); card composition; per-card Rule 3 check (Phase 8) |
| `canon-facts-from-diegetic-artifacts` | Claim extraction from narrator voice; diegetic-to-world laundering firewall; contradiction segregation vs continuity-audit handoff |
| `propose-new-characters` | Open-niche diagnosis; negative-space identification; mosaic-mirror reasoning; essence/niche/voice audit trail |

### Migration plan

The eight canon-reading / canon-mutating skills migrate against atomic source in a single phase. The canonical sub-order lives in `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 4 (lines 130–140) and is mirrored here:

1. **`canon-addition`** (full read+write — proven pattern; migrate first as the fullest-surface pilot)
2. **`create-base-world`** (update to emit `_source/` directly for new worlds)
3. **`character-generation`** + **`diegetic-artifact-generation`** (similar pattern; may parallelize)
4. **`propose-new-canon-facts`** + **`canon-facts-from-diegetic-artifacts`** (similar pattern; may parallelize)
5. **`propose-new-characters`** (biggest content-generation skill; migrate once pattern is proven)
6. **`continuity-audit`** (complex reasoning; main-orchestrator side last)

Per-skill detail:

**`canon-addition`** (full read+write):
- Replace pre-flight eager loads with `get_context_packet(task_type='canon-addition', seed_nodes=[proposal_node_id], token_budget=10000)`
- Replace "Large-file method" prose catalog with `get_record` / `search_nodes` calls against `_source/` atomic records
- Replace pre-figuring scan (glob + grep characters/, diegetic-artifacts/) with `find_named_entities(entities_in_proposal)` filtered by `node_type ∈ {character_record, diegetic_artifact_record}`
- Replace Phase 12a mechanical axis-(a)(b) scan with `find_impacted_fragments` + `rule6_no_silent_retcons` validator enforcement
- Replace Phase 13a artifact assembly with `PatchOperation[]` construction
- Replace Phase 14a mechanical layers of the 10-test rubric with `validate_patch_plan` call (Tests 9, 10 stay; judgment layers of Tests 3, 6, 8 stay)
- Replace Phase 15a 25+ Edit calls with single `submit_patch_plan`
- **Per SPEC-14**: PA frontmatter assembled with canonical fields (`pa_id`, UPPERCASE `verdict`, `originating_skill: "canon-addition"`, `change_id`, four `*_touched` arrays); the analysis prose lands in `body_markdown` of `append_adjudication_record`. When reasoning raises a new open question, the patch plan includes a `create_oq_record` op AND cites the resulting `OQ-NNNN` in `open_questions_touched[]`. When the verdict cites a section in `touched_by_cf`, the patch plan includes an `update_record_field` op extending the target CF's `required_world_updates` ahead of `append_touched_by_cf`. Domain values, verdict enum, and mystery-resolution-safety values are validated at reasoning time via `get_canonical_vocabulary` lookups before the patch plan is finalized.
- **References file disposition**:
  - **Survive** — `proposal-normalization.md` (judgment lore: classification, tie-break rubric, retcon-proposal inputs), `consequence-analysis.md` (Phase 6 13-domain reasoning), `counterfactual-and-verdict.md` (Phases 7–11 judgment).
  - **Delete or fold** — `accept-path.md` (mechanism, replaced by engine ops + validators); `phase-15a-checkpoint-grep-reference.md` (deletable: engine atomicity replaces checkpoints); `foundations-and-rules-alignment.md` (foldable: surviving Test 9/10 judgment moves into SKILL.md inline); `guardrails.md` (foldable: surviving guardrails inline; engine-enforced ones deleted); `non-accept-path.md` (mechanism, fold into SKILL.md).
- **Forward-compat note for SPEC-09**: SPEC-09 Phase 2.5 will add Tests 11 (action-space) and 12 (redundancy) atop the post-rewrite Phase 14a — preserve the §Validation Tests structure such that two new tests can attach without re-restructuring the rewritten skill (per `specs/SPEC-09-canon-safety-expansion.md` line 6 "Depends on: SPEC-04 (Validator Framework — houses new validators), SPEC-06 (canon-addition rewrite — where Tests 11 & 12 attach)").
- Expected size reduction (per §Expected aggregate impact below): SKILL.md 237 → ~95 lines; references/ 8 files / ~847 lines → 3 files / ~360 lines.

**`create-base-world`**:
- Replace initial file scaffolding (the thirteen mandatory concerns) with a single `submit_patch_plan` containing the genesis multi-op bundle: `create_cf_record` for CF-0001 + `create_ch_record` for CH-0001 + `create_inv_record` per genesis ONT/CAU/DIS/SOC/AES invariant + `create_m_record` per genesis Mystery Reserve seed + `create_oq_record` per genesis Open Question + `create_ent_record` per genesis Named Entity + `create_sec_record` per genesis prose section (everyday-life, institutions, magic-or-tech-systems, geography, economy-and-resources, peoples-and-species, timeline). `WORLD_KERNEL.md` and the reduced `ONTOLOGY.md` (Categories / Relation Types / Notes) remain primary-authored at the world root and are written via `Write` directly (Hook 3 explicitly allows them per SPEC-05 Part B).
- Replace CH-0001 composition Edit with the `create_ch_record` op above.
- Expected size reduction: SKILL.md 304 → ~150 lines.

**`continuity-audit`**:
- Replace ledger scan for audit categories with `search_nodes` + `get_neighbors` queries against atomic records.
- Writes to `audits/AU-NNNN-*.md` remain direct-Edit (hybrid file; permitted by Hook 3 hybrid-file allowlist per SPEC-05 Part B — see `specs/IMPLEMENTATION-ORDER.md` line 112). Only the pre-flight + retrieval surfaces migrate to MCP; no new patch-engine op is required for audit records. Retcon-proposal cards under `audits/AU-NNNN/retcon-proposals/RP-NNNN-*.md` likewise stay direct-Edit.
- Expected size reduction: SKILL.md 486 → ~150 lines.

**`character-generation`**:
- Replace pre-flight world-state load with `get_context_packet(task_type='character-generation', ...)`.
- Replace `characters/<slug>.md` direct Write with `submit_patch_plan` carrying `append_character_record` (already implemented).
- Replace `characters/INDEX.md` Edit with engine-managed index append (engine surfaces this through the `append_character_record` op).
- Expected size reduction: SKILL.md 165 → ~155 lines.

**`diegetic-artifact-generation`**: same pattern as character-generation (route writes through `append_diegetic_artifact_record`; `diegetic-artifacts/INDEX.md` engine-managed). 174 → ~140 lines.

**`propose-new-canon-facts`**:
- Replace pre-flight with `get_context_packet(task_type='propose-new-canon-facts', ...)`.
- Writes to `proposals/PR-NNNN-*.md` and `proposals/batches/BATCH-NNNN.md` stay direct-Edit (hybrid files; permitted by Hook 3 hybrid-file allowlist). `proposals/INDEX.md` likewise stays direct-Edit.
- Expected size reduction: SKILL.md 167 → ~130 lines.

**`canon-facts-from-diegetic-artifacts`**: same pattern as propose-new-canon-facts. 156 → ~120 lines.

**`propose-new-characters`**: same pattern (pre-flight via packet; proposals stay direct-Edit). 594 → ~170 lines (biggest collapse — this skill has accumulated heavy reference material that mechanism owns).

### Agent role split

Post-migration, each canon-mutating skill invocation follows this agent structure:

**Localizer** (Explore sub-agent — fresh context window via `Agent({subagent_type: 'Explore'})`; Hook 4 SubagentStart bootstraps the subagent with the worldloom localization-discipline preface — exact-id search first, then exact entity names, then heading paths, then backlinks, then lexical; preferred tool order `mcp__worldloom__search_nodes` → `get_node` → `get_neighbors`):
- Responsibilities: call `mcp__worldloom__search_nodes`, `find_named_entities`, `get_neighbors`; build structured evidence bundles
- Outputs: node_id lists + structured summaries, not narrative prose

**Editor** (main orchestrator, the skill itself):
- Responsibilities: Phases 0–N reasoning; patch plan assembly; HARD-GATE presentation; `submit_patch_plan`
- The "thin" in "thin orchestrator" means judgment-only, not mechanism

**Auditor** (optional, dispatched on large deliveries ≥6 required_world_updates files):
- Responsibilities: pre-submit sanity check of patch plan; verify every declared update is patched; flag suspicious surface area
- Output: red-flag list or clean-bill-of-health
- Invoked via: `Agent({subagent_type: 'code-reviewer' or domain-specific, prompt: '<audit task>'})`

### Expected aggregate impact (revised per SPEC-13)

Two-column structure: pre-reassessment baseline (current skill state) vs post-SPEC-13 target (atomic-source migration end-state). The originally-planned "Post-SPEC-06 (pre-SPEC-13)" middle column is dropped — Phase 1 pilot was skipped per IMPLEMENTATION-ORDER.md line 54, so no measurement point exists between current and post-SPEC-13.

| Metric | Current (animalia) | Post-SPEC-13 | Reduction vs current |
|---|---|---|---|
| canon-addition SKILL.md | 237 lines | ~95 lines | ~60% |
| canon-addition references/ | 8 files / ~847 lines | 3 files / ~360 lines | ~58% |
| canon-addition templates/ | 5 files | 2 files (schemas engine-owned) | ~60% |
| character-generation SKILL.md | 165 lines | ~155 lines | ~6% (already extracted) |
| continuity-audit SKILL.md | 486 lines | ~150 lines | ~69% |
| propose-new-characters SKILL.md | 594 lines | ~170 lines | ~71% |
| Total canon-pipeline skill surface | ~3130 lines (8 SKILL.md files) | ~1110 lines | ~65% |
| canon-addition run tool-input tokens (large delivery) | baseline | ~20% of baseline | ≥80% |

Notes: `Total canon-pipeline skill surface` row sums the 8 SKILL.md files only (canon-addition 237 + create-base-world 304 + continuity-audit 486 + character-generation 165 + diegetic-artifact-generation 174 + propose-new-canon-facts 167 + canon-facts-from-diegetic-artifacts 156 + propose-new-characters 594 = 2283 lines; references/ and templates/ for canon-addition add the rest of the ~3130-line aggregate). character-generation's modest reduction reflects that its references were already extracted in commit `438d194` (2026-04-19); it starts the migration thinner than the other content-generation skills.

### Meta-skills (explicitly out of scope)

`brainstorm`, `skill-creator`, `skill-audit`, `skill-consolidate`, `skill-extract-references` do not touch worlds and do not use the index / MCP / engine / validators. No rewrite needed. They remain as-is.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Acceptance Tests | Remain author-driven; judgment stays in skills |
| §Tooling Recommendation | Skills consume the "non-negotiable load list" via a single `get_context_packet` call |
| §Change Control Policy | Skills assemble patch plans; engine applies them — clean separation |
| §Canonical Storage Layer | Skills route writes through engine ops on `_source/*.yaml` per SPEC-05 Part B Hook 3; reads via `get_record` / `get_context_packet` per Hook 2 redirection |
| §Mandatory World Files (atomic-source classification) | Skills' world-state reads use atomic-record retrieval — no monolithic-markdown reads of retired files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, and the five large prose files) |
| Rule 6 No Silent Retcons | Attribution stamping moves from skill-prose responsibility to engine-enforced; `modification_history_retrofit` validator catches unauthorized in-place CF mutations |
| Rule 7 Preserve Mystery Deliberately | Mystery Reserve firewall judgment stays in skill (semantic); `rule7_mystery_reserve_preservation` validator catches mechanical violations |
| HARD-GATE discipline | Gate remains at user-approval step; approval_token is the mechanism, not a replacement for the gate |

## Verification

- **Phase 2 full-migration acceptance**: all 8 skills run end-to-end via engine against `_source/` atomic records:
  - Canon-addition large delivery (≥6 required_world_updates): single `submit_patch_plan` call, zero raw Edit on `_source/` paths
  - Hook 3 denies any raw Edit attempt on `_source/<subdir>/*.yaml`; explicitly allows direct-Edit on hybrid artifacts (characters, diegetic artifacts, adjudications, proposals, audits) per SPEC-05 Part B
  - Character-generation: writes via engine `append_character_record`; `characters/INDEX.md` consistent
  - Every validator (`record_schema_compliance`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `modification_history_retrofit`, `yaml_parse_integrity`, plus Rules 1, 2, 4, 5, 6, 7) passes on post-write animalia state
  - Token reduction ≥80% vs baseline (measured across 3 representative runs per skill — aligned with SPEC-08 Phase 2 completion gate at `specs/IMPLEMENTATION-ORDER.md` line 146)
  - **Per SPEC-14**: every record emitted by a rewritten skill (PA frontmatter, character frontmatter, DA frontmatter, atomic CF/CH/M/OQ/INV/ENT/SEC YAML) passes `record_schema_compliance` end-to-end. A skill rewrite that emits any artifact failing the schema is incomplete and must not land. Verified by extending the per-skill integration test to assert validator pass on engine-emitted output.
- **Reasoning preservation**: before/after comparison of canon-addition adjudications for 3 historical proposals; verdicts match; phase-citation coverage equivalent
- **Role split**: Localizer-Editor-Auditor dispatch measured; the Localizer subagent's fresh-context window keeps the main agent context lean (Hook 4 SubagentStart preface confirms the discipline preface lands)

## Out of Scope

- Meta-skill migration (brainstorm, skill-creator, etc. — not needed)
- New skill creation (this spec is migration, not feature addition)
- Performance optimization beyond the ≥80% token-reduction target
- Backwards compatibility with pre-migration skill invocations (cleanup during migration)
- New patch-engine ops beyond the SPEC-03 / SPEC-14 vocabulary already shipped (audit records and proposal cards stay direct-Edit on hybrid files)

## Risks & Open Questions

- **Reasoning preservation**: thinning a skill risks losing judgment subtleties encoded in prose (e.g., Phase 6b critic-recommendation-vs-decision-test reconciliation in canon-addition). Mitigation: preserve judgment reference files (`proposal-normalization.md`, `consequence-analysis.md`, `counterfactual-and-verdict.md`); only delete mechanism prose; code-review each rewrite against pre-migration behavior using historical adjudications.
- **Agent role split latency**: three-agent dispatch may add overhead. Mitigation: measure during migration; if overhead >5% of total run time, collapse Auditor into main agent for small deliveries.
- **Hybrid-file engine-routing migration**: per SPEC-05 Part B Hook 3 hybrid-file allowlist (`specs/IMPLEMENTATION-ORDER.md` line 112), characters, diegetic artifacts, adjudications, proposals, and audits remain writable via direct-Edit even with Hook 3 active. Per-skill migration to engine ops (`append_character_record`, `append_diegetic_artifact_record`, `append_adjudication_record`) is therefore an internal-only refactor — pre-migration writes that pass and post-migration writes that pass against the same `record_schema_compliance` schema (per SPEC-14) are observationally indistinguishable. Risk shifts from "skill-direct vs engine-direct cliff" to "engine-emitted record must satisfy validator schema end-to-end" (covered by §Verification's `record_schema_compliance` acceptance criterion).
- **Proposal cards stay direct-Edit**: `proposals/PR-NNNN-*.md` and `character-proposals/` remain writable directly post-migration (Hook 3 allows). This is a deliberate escape hatch for proposal-generating skills — proposals are not canon. Risk: accidentally treated as canon. Mitigation: validator framework's `cross_file_reference` flags any proposal referenced as canon source.
- **Validator false-positives during migration**: a rewritten skill may trigger new validator fails on previously-passing world state. Mitigation: SPEC-08 Phase 2 bootstrap re-runs `world-validate`; fails are either fixed (one-off canon-addition) or surfaced as retcon proposals through `continuity-audit`.
