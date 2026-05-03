# FOUNDATIONS-001: Amend FOUNDATIONS.md to acknowledge the Story Bundle architecture as a per-world derived layer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — documentation amendment only; the amendment then unblocks scope-correct downstream tickets (MCPENH-025/026/027, VALENH-001, PEENH-001) by giving them a FOUNDATIONS-aligned design contract to cite.
**Deps**: None (this is the FOUNDATIONS-anchor ticket; downstream tickets cite it)

## Problem

`docs/FOUNDATIONS.md` is the project's "non-negotiable design contract" (per CLAUDE.md §Authoritative Source of Truth) — it documents Canon Layers, the thirteen Mandatory World Files, Validation Rules 1-7, the Canon Fact Record schema, the Canonical Storage Layer contract, and the Machine-Facing Layer (World Index, Retrieval MCP, Patch Engine, Validator Framework, Hooks).

At intake, it did not acknowledge the **Story Bundle** architectural layer at all. Yet five user-invocable skills already produced or consumed story-bundle records:

- `branching-story-bootstrap` — creates a story bundle at `worlds/<slug>/stories/<slug>/` with STORY_KERNEL.md + atomic-YAML records under `_source/` (entities / facts / events / obligations / threads / intentions / storylets / branches / pages / choices / story-local relationships / locations / objects / consequences / artifacts).
- `branching-story-page-cycle` — advances one tick of an existing story bundle, emitting per-turn PG / SE / SF / OBL / CNSQ / THR / SREL / STINT / CHC records (and JIT SLT / story-local STLOC / STOBJ / DA records when introduced).
- `storylet-pool-authoring` — authors or expands the SLT pool inside a story bundle.
- `branching-story-health-audit` — audits an existing story bundle without mutating its state.
- `story-fact-promotion-to-canon` — promotes a story-local fact, mystery resolution, character-arc outcome, or in-story diegetic artifact into world canon (the only lawful path by which a branching story may mutate world canon).

CLAUDE.md §Repository Layout names `worlds/<world-slug>/stories/<story-slug>/` and lists its sub-directories. CLAUDE.md §ID Allocation Conventions enumerates 8 story-bundle-scoped ID classes (SAU, SP, RSP plus the implicit STORY/PG/SE/SF/OBL/CNSQ/THR/SREL/STINT/STLOC/STOBJ/BR/CHC/STENT/SLT/SLB through `mcp__worldloom__allocate_next_id`'s `id_class` enum). But FOUNDATIONS.md — the higher-priority design contract — is silent on the story-bundle layer.

That silence was a load-bearing problem: every downstream story-pipeline tooling enhancement (story-bundle indexing, story-bundle MCP retrieval, predicate-DSL validator, engine-ops migration) needs a FOUNDATIONS principle to align against. Without one, follow-up tickets had to invoke world-canon principles by analogy, weakening the architectural contract.

The `skill-audit` skill's category classification (in `.claude/skills/skill-audit/references/cross-skill-consistency.md`) was just expanded in this session to include **Category 2c — Story-pipeline content-generation** (the implementation ran in this same conversation). That sibling-side acknowledgement makes the FOUNDATIONS-side silence even more conspicuous.

## Assumption Reassessment (2026-05-03)

1. **CLAUDE.md acknowledges the story-bundle layer; FOUNDATIONS.md does not** — verified via direct Read of both files at session start. CLAUDE.md §Repository Layout lists `worlds/<world-slug>/stories/<story-slug>/` and its sub-directories (STORY_KERNEL.md, _source/, characters/, diegetic-artifacts/, audits/, etc.). FOUNDATIONS.md §Mandatory World Files lists 13 world-level concerns and §Canonical Storage Layer specifies engine-only `_source/` write discipline — both scoped to `worlds/<slug>/_source/<world-subdir>/`, NOT to `worlds/<slug>/stories/<slug>/_source/<story-subdir>/`. The omission is deliberate-or-inherited from a pre-story-pipeline FOUNDATIONS state, not a commitment that story bundles are out-of-scope for the design contract.
2. **The five story-pipeline skills exist and are user-invocable** — verified via the skill registry surfaced in this session's available-skills list. Each skill's SKILL.md `description` field names its mutation surface as `worlds/<world-slug>/stories/<story-slug>/`.
3. **Cross-skill shared boundary under audit** — the boundary is "what is a story bundle, structurally and ontologically, in this world model?". Currently each skill answers this in its own SKILL.md prose; FOUNDATIONS provides no canonical definition. The amendment establishes the canonical definition that the five skills (and the downstream tooling tickets) cite.
4. **FOUNDATIONS principle under audit** — the principle is "the design contract is complete: no major architectural layer is left undocumented in FOUNDATIONS.md". Current state violates this by treating story bundles as skill-internal-prose-only. The amendment restores completeness.
5. **No Mystery Reserve firewall weakening** — the amendment is descriptive, not prescriptive at the runtime gate level. It documents that the five story-pipeline skills implement Rule 7 firewalls (each skill's own §Mystery Firewall sub-rule) rather than restating those firewalls at the FOUNDATIONS layer. The Mystery Reserve firewall remains unchanged at the world-canon layer (M-NNNN records, `forbidden`-status semantics, `future_resolution_safety` enum).
6. **No CF Record schema extension** — FOUNDATIONS §Canon Fact Record Schema is unchanged. Story-bundle records have their own per-class schemas (defined in `branching-story-bootstrap/templates/story-records.yaml` for most classes and `storylet-pool-authoring/templates/storylet-record.yaml` for SLT records); the amendment cites those schema sources rather than absorbing them.
7. **Adjacent contradictions corrected during reassessment** — the drafted placement text said to put §Story Bundles "between §Canonical Storage Layer and §Machine-Facing Layer", but live `docs/FOUNDATIONS.md` orders those sections as §Machine-Facing Layer then §Canonical Storage Layer. The truthful additive placement is after §Canonical Storage Layer, with no existing section reorder. The drafted file set also omitted `.claude/skills/skill-audit/references/cross-skill-consistency.md`, but its pre-existing Category 2c hunk must receive the `FOUNDATIONS §Story Bundles` citation required by this ticket's own acceptance criteria.

## Architecture Check

1. **Documentation-first amendment, no machine-layer change** — FOUNDATIONS is the design contract; it should describe the architecture before the tooling implements it. Adding §Story Bundles before MCPENH-025/026/027, VALENH-001, PEENH-001 means each downstream ticket cites a FOUNDATIONS section that exists, rather than back-filling FOUNDATIONS as a last-step cleanup.
2. **Additive only — no rename, no removal, no schema change** — FOUNDATIONS retains every existing section and appends the new §Story Bundles section after §Canonical Storage Layer. No backwards-compatibility shims because nothing existing changes.

## Verification Layers

1. FOUNDATIONS §Story Bundles section exists with the documented sub-sections → manual review (read the amendment end-to-end after writing).
2. The five story-pipeline skills' descriptions of story-bundle architecture remain consistent with FOUNDATIONS §Story Bundles → codebase grep-proof: grep `.claude/skills/branching-*/SKILL.md` and `.claude/skills/storylet-pool-authoring/SKILL.md` and `.claude/skills/story-fact-promotion-to-canon/SKILL.md` for "story bundle" / "stories/<slug>/_source/" and verify no skill prose contradicts FOUNDATIONS §Story Bundles.
3. CLAUDE.md §Repository Layout's story-bundle sub-tree remains consistent with FOUNDATIONS §Story Bundles → manual review (CLAUDE.md is the project-instructions surface; FOUNDATIONS is the design contract; the two should reinforce each other).
4. Skill Category 2c (story-pipeline content-generation) defined in `.claude/skills/skill-audit/references/cross-skill-consistency.md` cites FOUNDATIONS §Story Bundles → codebase grep-proof: grep `.claude/skills/skill-audit/references/cross-skill-consistency.md` for the `(2c)` bullet and confirm it cites FOUNDATIONS §Story Bundles for the "FOUNDATIONS-alignment APPLIES" claim.

## Landed Changes

### 1. Inserted §Story Bundles section into `docs/FOUNDATIONS.md`

Placed after the existing §Canonical Storage Layer section. The existing §Machine-Facing Layer and §Canonical Storage Layer sections were not reordered.

The new section covers, in order:

1. **What a story bundle is** — a per-world derived layer at `worlds/<slug>/stories/<slug>/` carrying a localized causal-engine state (entities / facts / events / obligations / consequences / threads / relationships / intentions / locations / objects / pages / branches / choices / storylets / artifacts) bound to a specific premise + cast + tone contract. Distinct from world canon: story-bundle records are story-local truths; world canon (CF / CH / INV / M / OQ / ENT / SEC) is world-level truth.

2. **Storage form** — STORY_KERNEL.md primary-authored at the story-bundle root (parallel to WORLD_KERNEL.md at the world root); atomic-YAML records under `worlds/<slug>/stories/<slug>/_source/<class>/<ID>.yaml` (one file per record per class) following SPEC-13's atomic-source convention; per-bundle INDEX.md as a derived rendering of the bundle's branch / thread / mystery / cast / pool / page state.

3. **Read discipline** — story-bundle records are read directly via the Read tool (Hook 2's match pattern is `worlds/<slug>/_source/...` which does NOT match `worlds/<slug>/stories/<slug>/_source/...`, so direct reads are not redirected to MCP retrieval). World canon read by story-pipeline skills routes through `mcp__worldloom__get_record` / `get_context_packet` / `list_records` per FOUNDATIONS §Tooling Recommendation, unchanged.

4. **Write discipline** — currently **Shape A** (direct `Write` to story-bundle YAML files); future **Shape B** (engine-routed via `mcp__worldloom__submit_patch_plan` with story-bundle record-ops) deferred to PEENH-001. Hook 3's match pattern is `worlds/<slug>/_source/...` which currently does NOT match `worlds/<slug>/stories/<slug>/_source/...`; PEENH-001 extends that pattern when Shape B lands. World-canon mutation by story-pipeline skills is BLOCKED at the story-pipeline layer — the only lawful path is `story-fact-promotion-to-canon`'s explicit handoff to `canon-addition`, which assembles the actual CF/CH/PA patch plan against world canon.

5. **Validation Rules at story scope** — Rule 1 (No Floating Facts) governs story-bundle record schemas (every SLT requires `mystery_safety`, `provenance`, `visibility`, predicate-DSL preconds, structured fact/relationship effects per `storylet-pool-authoring/templates/storylet-record.yaml`); Rule 4 (No Globalization by Accident) governs story-scope branch-isolation (`global_author_pool` storylets cannot reference branch-local record IDs whose `created_at_page` is non-null); Rule 5 (No Consequence Evasion) governs per-page consequence-capacity (every page leaves at least one continuation storylet eligible); Rule 7 (Preserve Mystery Deliberately) governs story-local `M_resolution_claims` authority discipline (apparent / branch_local_counterfactual / canon_candidate). Rules 2 / 3 / 6 / 11 / 12 do NOT apply at story scope — they govern world-canon-mutation surfaces (`canon-addition`, `propose-new-canon-facts`, `create-base-world`).

6. **Story-bundle ID classes** — eight world-scoped or story-bundle-scoped classes are unique to the story-pipeline architecture (per CLAUDE.md §ID Allocation Conventions): STORY-NNN (per-world), and per-bundle: STENT, SF, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, SLB, plus per-bundle audit/promotion classes (SAU, SP) and per-sub-audit RSP. Allocation routes through `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)` — the same allocator used for world-canon classes.

7. **Story-pipeline skill category** — the five story-pipeline skills constitute Skill Category 2c per `.claude/skills/skill-audit/references/cross-skill-consistency.md` (story-pipeline content-generation). FOUNDATIONS-alignment APPLIES per the Validation-Rules-at-story-scope sub-section above; sibling-scan is RECOMMENDED-as-defensive-default for the inter-skill-pipeline shared surfaces (predicate DSL, STENT `role_in_story` enum, `state_snapshot` schema, RSP card schema, content_policy block).

8. **Story bundle as derived per-world layer** — story bundles are NOT canonical world state in the sense of world canon (CF / CH / INV / M / OQ / ENT / SEC). They are derivative narrative-content layers per world. Multiple story bundles can coexist in one world (one per story-slug under `worlds/<slug>/stories/`); each is independent. Story-bundle deletion is permitted (a bundle is not append-only at the bundle-level); within a bundle, atomic-YAML records remain append-only at the file-system level (per the same record-append-only discipline that governs `_source/<world-subdir>/*.yaml`).

### 2. Added a §Story Bundles cross-reference at FOUNDATIONS §Tooling Recommendation

Appended a single sentence to the §Tooling Recommendation paragraph noting that story-pipeline skills (Category 2c) depend on this same MCP retrieval surface for world-canon reads, with the story-bundle-context layer (per MCPENH-027) extending the packet for story-pipeline task_types.

### 3. Updated Category 2c cross-reference

Updated `.claude/skills/skill-audit/references/cross-skill-consistency.md` so the existing Category 2c bullet cites `FOUNDATIONS §Story Bundles` for the FOUNDATIONS-alignment claim.

No other FOUNDATIONS sections were changed beyond the Tooling Recommendation cross-reference and the appended §Story Bundles section. Existing FOUNDATIONS §sections (Core Principle, Canon Layers, Mandatory World Files, World Kernel, Invariants, Ontology Categories, Relation Types, Canon Fact Record Schema, World Queries Every Tool Must Be Able To Answer, Validation Rules, Acceptance Tests, Change Control Policy, Tooling Recommendation, Machine-Facing Layer, Canonical Storage Layer) are unchanged.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `.claude/skills/skill-audit/references/cross-skill-consistency.md` (modify existing pre-ticket Category 2c hunk only to cite `FOUNDATIONS §Story Bundles`)

## Out of Scope

- Adding `mcp__worldloom__list_records` story-bundle record types (covered by MCPENH-026).
- Adding story-bundle index tables to `_index/world.db` (covered by MCPENH-025).
- Adding story-bundle context layer to `get_context_packet` (covered by MCPENH-027).
- Migrating story-pipeline skills' write discipline from Shape A to Shape B (covered by PEENH-001).
- Adding the predicate-DSL parsability validator (covered by VALENH-001).
- Modifying any of the five story-pipeline skills' SKILL.md (their existing prose is consistent with the amendment by design).

## Acceptance Criteria

### Tests That Passed

1. `grep -n "Story Bundles" docs/FOUNDATIONS.md` returned the §Tooling Recommendation cross-reference and the new §Story Bundles header.
2. `grep -nE 'worlds/<slug>/stories/<story-slug>/|worlds/<world-slug>/stories/<story-slug>/' docs/FOUNDATIONS.md` returned the story-bundle path matches in the new section.
3. Manual read-through of the new §Story Bundles section confirmed the 8 sub-sections from §Landed Changes item 1 are all present and ordered as listed.
4. `grep -rn "FOUNDATIONS §Story Bundles" .claude/skills/skill-audit/references/cross-skill-consistency.md` returned the Category 2c citation.

### Invariants

1. FOUNDATIONS.md remains additive-only relative to the pre-amendment state — no existing section is renamed, removed, or semantically altered by this ticket.
2. The new §Story Bundles section sits after §Canonical Storage Layer, preserving the document's current read-order narrative without reordering existing sections (Core Principle → Canon Layers → Mandatory World Files → World Kernel → Invariants → Ontology → Relations → CF Schema → World Queries → Validation Rules → Acceptance Tests → Change Control → Tooling Recommendation → Machine-Facing Layer → Canonical Storage Layer → **Story Bundles**).
3. Every claim in the new §Story Bundles section that names a file path, ID class, or skill is verifiable by direct `Read` or grep against the named target.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "## Story Bundles" docs/FOUNDATIONS.md` — confirms the new section header exists.
2. `grep -nE "Skill Category 2c|story-pipeline content-generation" docs/FOUNDATIONS.md` — confirms the skill-category cross-reference is present in the new section.
3. `grep -rn "FOUNDATIONS §Story Bundles" .claude/skills/` — surfaces all skills that cite the new section; verifies the cross-reference network is intact post-amendment.

## Outcome

Completion date: 2026-05-03.

Completed. `docs/FOUNDATIONS.md` now defines story bundles as a derived per-world layer, including storage, read/write discipline, story-scope validation rules, ID classes, Category 2c alignment, and non-canon derived-layer semantics. The Tooling Recommendation section now names story-pipeline MCP retrieval dependency and the MCPENH-027 packet-extension boundary. The existing Category 2c reference in `.claude/skills/skill-audit/references/cross-skill-consistency.md` now cites `FOUNDATIONS §Story Bundles`.

## Verification Result

Passed:

1. `grep -n "Story Bundles" docs/FOUNDATIONS.md`
2. `grep -nE 'worlds/<slug>/stories/<story-slug>/|worlds/<world-slug>/stories/<story-slug>/' docs/FOUNDATIONS.md`
3. `grep -nE "Skill Category 2c|story-pipeline content-generation" docs/FOUNDATIONS.md`
4. `grep -rn "FOUNDATIONS §Story Bundles" .claude/skills/`
5. `rg -n "^## Story Bundles|^### [1-8]\\." docs/FOUNDATIONS.md`

Manual review confirmed the new §Story Bundles section has the required eight sub-sections in order and does not reorder existing FOUNDATIONS sections.

## Deviations

The drafted placement text was corrected during reassessment: the section landed after §Canonical Storage Layer because live FOUNDATIONS orders §Machine-Facing Layer before §Canonical Storage Layer. `.claude/skills/skill-audit/references/cross-skill-consistency.md` was added to the landed file set because the ticket's acceptance criteria required the existing Category 2c bullet to cite `FOUNDATIONS §Story Bundles`.
