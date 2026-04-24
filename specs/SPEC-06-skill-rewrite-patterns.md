<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-06: Skill Rewrite Patterns — Thin Orchestrators

**Phase**: Phase 2 — all 8 skills full migration against atomic source (per SPEC-13, the originally-planned Phase 1 read-side pilot is folded into Phase 2; canon-addition's read-side rewrite lands together with its write-side against `_source/` atomic records)
**Depends on**: SPEC-01, SPEC-02, SPEC-03 (Phase 2), SPEC-04, SPEC-05, **SPEC-13 (atomic-source contract — skills read/write atomic records directly)**
**Blocks**: SPEC-08 acceptance criteria (token reduction depends on this spec landing)

## SPEC-13 amendment summary

This spec was originally written against monolithic-markdown storage. Per SPEC-13 §C, the following changes apply:

- **SPEC-06 Part A / Part B distinction collapses.** Part A was the Phase 1 canon-addition read-side pilot; Part B was Phase 2 full migration. With atomic-source landing in Phase 1.5 before Phase 2, there's no value in a read-only pilot against a storage form that will be retired — canon-addition's full rewrite (read + write) lands in Phase 2 against `_source/` directly.
- **Token reduction target lifts from ≥70% to ≥80%** for large deliveries. Atomic-record retrieval enables the higher target because skills read per-record YAML instead of full-file markdown, even beyond what SPEC-12's scoped-reference and packet-completeness machinery already delivered.
- **Skill-body size estimates revise downward by an additional 15–25% per skill** beyond the pre-SPEC-13 Phase 2 baseline. Prose-layout lore (e.g., "read the §Ordinary Hazards section of EVERYDAY_LIFE.md", "grep for `<!-- added by CF-NNNN -->`", "Large-file method") becomes fully deletable once retrieval is record-addressed.
- **Patch-plan construction shifts to record-id-addressed ops** (SPEC-03's `create_*` / `update_record_field` / `append_extension` / `append_touched_by_cf` vocabulary). No anchor-hash construction for atomic-record ops; `expected_content_hash` is retained for atomic records (per-record YAML hash) but no `expected_anchor_checksum` except for hybrid files (characters, diegetic artifacts).
- **`create-base-world` updates to emit `_source/` directly.** New worlds start in atomic-source form; no legacy storage accumulates after SPEC-13 migration.

## Problem Statement

The eight canon-reading / canon-mutating skills contain thousands of lines of procedural law that mechanism (index + MCP + engine + validators + hooks, SPEC-01 through SPEC-05) can now own. Skills currently mix **reasoning** (judgment — consequence propagation, verdict synthesis, Mystery Reserve firewall adjudication) with **mechanism** (law — file loading, ID allocation, anchor matching, attribution stamping, Rule 1–7 enforcement, write ordering).

**Empirical examples of procedural bloat that mechanism can own**:
- `canon-addition/SKILL.md` Procedure step 1 "Large-file method" (grep-then-targeted-read patterns for 8 file classes)
- `canon-addition/SKILL.md` Procedure step 5 Phase 12a modification_history scan (axis a/b/c decision test + worked examples)
- `canon-addition/SKILL.md` Validation Tests (10-test rubric)
- `canon-addition/references/phase-15a-checkpoint-grep-reference.md` (inter-step structural-integrity grep checkpoints)
- Pre-figuring diegetic-artifact check (glob + grep pattern)
- Discovery-section canonical field-name enforcement
- modification_history retrofit discipline

**Source context**: `brainstorming/structure-aware-retrieval.md` §6 (thin orchestrators), §8 (split retrieval and editing). Brainstorm decision: skills retain judgment; mechanism moves to code.

## Approach

Thin-orchestrator template. Skills retain **reasoning** (judgment phases), delegate **mechanism** (pre-flight, localization, anchor matching, attribution, validation, write ordering). Agent role split makes localization a first-class sub-agent role (Explore with `context: fork`, Hook 4 bootstrap).

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
    └── replaces 10-test Phase 14a rubric (judgment test 9 stays in skill)
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
| Rule 1–7 enforcement (Phase 14a tests 1–8, 10) | SPEC-04 validators |
| Discovery-section canonical field names | SPEC-04 `adjudication_discovery_fields` validator |
| modification_history retrofit discipline | SPEC-04 `modification_history_retrofit` validator |
| Phase 12a axis-(a)(b)(c) mechanical scan | SPEC-02 `find_impacted_fragments` + SPEC-04 `rule6_no_silent_retcons` |
| Large-delivery inter-step structural-integrity grep | SPEC-03 engine atomicity (structurally impossible to fail halfway) |

### What STAYS in each skill (judgment)

| Skill | Reasoning kept |
|---|---|
| `canon-addition` | Phases 1–11 reasoning (scope detection, invariant check, capability analysis, prerequisites, diffusion, consequence propagation with 13 exposition domains, escalation-gate critics, counterfactual pressure test, contradiction classification, repair pass, narrative-fit test, verdict synthesis); Phase 14a Test 9 (verdict cites phases); Phase 12a axis-(c) decision test (substantive extension vs cross-reference — this is a semantic judgment, not a mechanical scan) |
| `create-base-world` | Genesis brief interpretation; 13-file seeding logic; initial invariant synthesis; CH-0001 composition |
| `continuity-audit` | Audit reasoning across 8 audit categories (contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, diegetic leakage); retcon-proposal card composition |
| `character-generation` | Essence, niche, voice construction; Mystery Reserve firewall judgment; CF-distribution conformance check |
| `diegetic-artifact-generation` | Artist persona construction; truth-status discipline (narrator voice vs world-level); diegetic-to-world firewall judgment |
| `propose-new-canon-facts` | Thinness-gap identification; 5-angle reasoning (open niches, institutional adaptations, contested knowledge, mystery seeds, cross-domain couplings); card composition |
| `canon-facts-from-diegetic-artifacts` | Claim extraction from narrator voice; diegetic-to-world laundering firewall; contradiction segregation vs continuity-audit handoff |
| `propose-new-characters` | Open-niche diagnosis; negative-space identification; mosaic-mirror reasoning; essence/niche/voice audit trail |

### Per-skill rewrite plan

**Phase 1 pilot: `canon-addition` read-side**
- Replace Procedure step 1 pre-flight eager loads with `get_context_packet(task_type='canon-addition', seed_nodes=[proposal_node_id], token_budget=10000)`
- Replace "Large-file method" prose catalog with `get_node` / `search_nodes` calls
- Replace pre-figuring scan (glob + grep characters/, diegetic-artifacts/) with `find_named_entities(entities_in_proposal)` filtered by `node_type ∈ {character_record, diegetic_artifact_record}`
- Replace Phase 12a mechanical axis-(a)(b) scan with `find_impacted_fragments` + validator enforcement
- Writes still go via Edit (Phase 2 migrates writes)
- Expected size reduction: SKILL.md 237 → ~180 lines; references/*.md 8 files → 5 files (deleting phase-15a-checkpoint-grep-reference + parts of accept-path)

**Phase 2: `canon-addition` write-side + remaining 7 skills**

*canon-addition (completion)*:
- Replace Phase 13a artifact assembly with `PatchOperation[]` construction
- Replace Phase 14a 10-test rubric with `validate_patch_plan` call (Test 9 stays)
- Replace Phase 15a 25+ Edit calls with single `submit_patch_plan`
- Expected size reduction: final SKILL.md ~120 lines; final references/*.md ~600 lines across 2-3 files (proposal-normalization, consequence-analysis, counterfactual-and-verdict; others deleted or folded)

*create-base-world*:
- Replace initial file scaffolding (13 mandatory files) with `submit_patch_plan` containing `append_heading_section` / `append_cf_record` / `append_change_log_entry` for the genesis bundle
- Replace CH-0001 composition Edit with `append_change_log_entry`
- Expected size reduction: SKILL.md 304 → ~150 lines

*continuity-audit*:
- Replace ledger scan for audit categories with `search_nodes` + `get_neighbors` queries
- Writes to `audits/AU-NNNN-*.md` stay per-file but go through `submit_patch_plan` with `append_adjudication_record`-style op (new op `append_audit_record` added to SPEC-03 if needed)
- Expected size reduction: SKILL.md 486 → ~200 lines

*character-generation*:
- Replace pre-flight world-state load with `get_context_packet(task_type='character-generation', ...)`
- Replace `characters/<slug>.md` direct Write with `submit_patch_plan` carrying new op `append_character_record`
- Replace `characters/INDEX.md` Edit with engine-managed index append
- Expected size reduction: SKILL.md 433 → ~180 lines

*diegetic-artifact-generation*: same pattern as character-generation. 174 → ~140 lines.

*propose-new-canon-facts*:
- Replace pre-flight with `get_context_packet(task_type='propose-new-canon-facts', ...)`
- Writes to `proposals/PR-NNNN-*.md` may stay direct-Edit (allowed by Hook 3) OR route through engine if `proposals/INDEX.md` update is easier via engine — decide during implementation
- Expected size reduction: SKILL.md 167 → ~130 lines

*canon-facts-from-diegetic-artifacts*: same pattern as propose-new-canon-facts. 156 → ~120 lines.

*propose-new-characters*: same pattern. 594 → ~200 lines (biggest collapse — this skill has accumulated heavy reference material that mechanism owns).

### Agent role split

Post-migration, each canon-mutating skill invocation follows this agent structure:

**Localizer** (Explore sub-agent, `context: fork`, Hook 4-bootstrapped):
- Responsibilities: call `mcp__worldloom__search_nodes`, `find_named_entities`, `get_neighbors`; build structured evidence bundles
- Outputs: node_id lists + structured summaries, not narrative prose
- Invoked via: `Agent({subagent_type: 'Explore', prompt: '<localization task>'})`

**Editor** (main orchestrator, the skill itself):
- Responsibilities: Phases 0–N reasoning; patch plan assembly; HARD-GATE presentation; `submit_patch_plan`
- The "thin" in "thin orchestrator" means judgment-only, not mechanism

**Auditor** (optional, dispatched on large deliveries ≥6 required_world_updates files):
- Responsibilities: pre-submit sanity check of patch plan; verify every declared update is patched; flag suspicious surface area
- Output: red-flag list or clean-bill-of-health
- Invoked via: `Agent({subagent_type: 'code-reviewer' or domain-specific, prompt: '<audit task>'})`

### Expected aggregate impact (revised per SPEC-13)

| Metric | Current (animalia) | Post-SPEC-06 (pre-SPEC-13) | Post-SPEC-13 | Reduction vs current |
|---|---|---|---|---|
| canon-addition SKILL.md | 237 lines | ~120 lines | ~95 lines | ~60% |
| canon-addition references/ | 8 files / ~2500 lines | 3 files / ~600 lines | 2 files / ~360 lines | ~86% |
| canon-addition templates/ | 5 files | 2 files | 2 files (schemas engine-owned) | ~60% |
| character-generation SKILL.md | 433 lines | ~180 lines | ~155 lines | ~64% |
| continuity-audit SKILL.md | 486 lines | ~200 lines | ~150 lines | ~69% |
| propose-new-characters SKILL.md | 594 lines | ~200 lines | ~170 lines | ~71% |
| Total canon-pipeline skill surface | ~6500 lines | ~2200 lines | ~1700 lines | ~74% |
| canon-addition run tool-input tokens (large delivery) | baseline | ~30% of baseline | ~20% of baseline | ≥80% |

### Meta-skills (explicitly out of scope)

`brainstorm`, `skill-creator`, `skill-audit`, `skill-consolidate`, `skill-extract-references` do not touch worlds and do not use the index / MCP / engine / validators. No rewrite needed. They remain as-is.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Acceptance Tests | Remain author-driven; judgment stays in skills |
| §Tooling Recommendation | Skills consume the "non-negotiable load list" via a single `get_context_packet` call |
| §Change Control Policy | Skills assemble patch plans; engine applies them — clean separation |
| Rule 6 No Silent Retcons | Attribution stamping moves from skill-prose responsibility to engine-enforced |
| Rule 7 Preserve Mystery Deliberately | Mystery Reserve firewall judgment stays in skill (semantic); validator catches mechanical violations |
| HARD-GATE discipline | Gate remains at user-approval step; approval_token is the mechanism, not a replacement for the gate |

## Verification

- **Phase 1 pilot acceptance**: canon-addition run on animalia with a sample proposal:
  - Pre-flight tokens: <30% of current baseline (measured)
  - Zero raw `Read` calls on `_source/canon/` or `_source/change-log/` (Hook 2 blocks any oversize directory-read attempt post-SPEC-13; pre-SPEC-13 the equivalent guard was on `CANON_LEDGER.md`)
  - Phase 0–11 reasoning unchanged in output quality (human review)
- **Phase 2 full-migration acceptance**: all 8 skills run end-to-end via engine:
  - Canon-addition large delivery (≥6 required_world_updates): single `submit_patch_plan` call, zero raw Edit
  - Character-generation: writes via engine; `characters/INDEX.md` consistent
  - Every validator passes on post-write animalia state
  - Token reduction ≥70% vs baseline (measured across 3 representative runs per skill)
- **Reasoning preservation**: before/after comparison of canon-addition adjudications for 3 historical proposals; verdicts match; phase-citation coverage equivalent
- **Role split**: Localizer-Editor-Auditor dispatch measured; Localizer context fork keeps main agent context lean

## Out of Scope

- Meta-skill migration (brainstorm, skill-creator, etc. — not needed)
- New skill creation (this spec is migration, not feature addition)
- Performance optimization beyond the ≥70% token-reduction target
- Backwards compatibility with pre-migration skill invocations (cleanup during Phase 2)

## Risks & Open Questions

- **Reasoning preservation**: thinning a skill risks losing judgment subtleties encoded in prose (e.g., Phase 6b critic-recommendation-vs-decision-test reconciliation in canon-addition). Mitigation: preserve judgment reference files; only delete mechanism prose; code-review each rewrite against pre-migration behavior using historical adjudications.
- **Agent role split latency**: three-agent dispatch may add overhead. Mitigation: measure in Phase 1 pilot; if overhead >5% of total run time, collapse Auditor into main agent for small deliveries.
- **Sub-directory write discipline**: Phase 1 leaves `characters/`, `diegetic-artifacts/`, `adjudications/` as skill-direct writes (Hook 3 not active). Phase 2 moves them behind engine. The transition must be atomic per skill — half-migrated skill breaks. Mitigation: SPEC-08 sequences each skill's migration as a single unit.
- **Proposal cards stay direct-Edit**: `proposals/PR-NNNN-*.md` and `character-proposals/` remain writable directly even post-Phase-2 (Hook 3 allows). This is a deliberate escape hatch for proposal-generating skills — proposals are not canon. Risk: accidentally treated as canon. Mitigation: validator framework's `cross_file_reference` flags any proposal referenced as canon source.
- **Validator false-positives during migration**: a rewritten skill may trigger new validator fails on previously-passing world state. Mitigation: SPEC-08 Phase 2 bootstrap re-runs `world-validate`; fails are either fixed (one-off canon-addition) or grandfathered.
