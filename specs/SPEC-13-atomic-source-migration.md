<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-13: Atomic-Source Migration

**Phase**: 1.5 (between Phase 1 read-path and Phase 2 write-path; supersedes SPEC-08 Phase 3 and Phase 4)
**Depends on**: SPEC-01 (index can read atomic sources), SPEC-10 / SPEC-11 / SPEC-12 (entity and retrieval remediations)
**Blocks**: SPEC-03 (op vocabulary rewrites against atomic records), SPEC-04 (validators consume atomic YAML), SPEC-06 Phase 2 skill rewrites (skills read/write atomic records), SPEC-08 Phase 2 completion gate

## Problem Statement

After SPEC-10, SPEC-11, and SPEC-12 shipped, the remediation arc made one fact visible: the brittleness the machine-facing layer had been patching was structurally inherent to **markdown-as-sole-storage**, not tooling bugs. Each remediation added explicit declaration surfaces (entity registries, scoped references, canonical authority markers) that prose-in-markdown cannot provide natively. Further patches in the same direction would compound rather than resolve.

Empirical state on the production world `worlds/animalia`:

- `CANON_LEDGER.md` is 8,666 lines — one monolithic edit surface for every canon mutation.
- Five canon-reading skills (`character-generation`, `diegetic-artifact-generation`, `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`, `continuity-audit`) load all 13 mandatory files in full on every invocation, burning tokens on prose they never query.
- Rule 5 and Rule 6 validators rely on heuristic scans of `<!-- added by CF-NNNN -->` HTML-comment attribution because there is no structural CF↔section mapping.
- Patch engine anchor drift (SPEC-03 `expected_anchor_checksum`) is a consequence of text-shifting around anchors in long prose files; stable record IDs don't drift.

**Source context**: user-initiated brainstorm (2026-04-24) triggered by the observation that SPEC-10/11/12 had been remediating a structural condition rather than fixing bugs. External research survey (PKM tools, headless CMS, IF authoring, TTRPG worldbuilders, LLM-agent-memory literature) converged on hybrid "structured-atomic-sources + markdown for inherently narrative content" as the dominant pattern; pure-DB alternatives have known failure modes (Roam lock-in, loss of git-audit, LLM prose-authoring degradation into DB cells). The brainstorm selected an expanded-scope atomization that pulls the original SPEC-08 Phase 3 (CF/CH atomization) and Phase 4 (prose fragmentization) forward into a single Phase 1.5 before Phase 2 write-path work begins.

## Approach

Move the canonical form of worldloom world state **from monolithic markdown files to atomic YAML records under `worlds/<slug>/_source/`**. Eleven of thirteen mandatory world files are retired as storage surfaces; one becomes hybrid (primary-authored with an atomized registry removed); one stays primary-authored. The machine-facing layer (index, MCP, patch engine, validators, hooks) reorients to read and write atomic records directly. Narrative prose stays prose: character dossiers, diegetic artifacts, adjudications, audits, proposals continue as per-file hybrid YAML-frontmatter-plus-markdown documents.

Key design commitments:

1. **`_source/` is the only storage.** There are no compiled views of canon, invariants, mystery reserve, open questions, prose sections, or named entities. Humans read `_source/` directly (IDE file-tree or `world-index render` CLI for merged views); skills read via MCP typed retrieval (`get_record`, `get_context_packet`); validators consume YAML directly; git diff provides surgical per-record audit.
2. **WORLD_KERNEL.md is the only primary-authored file at the world root.** It is the world's shortest accurate statement, read cover-to-cover, not retrieved piecewise.
3. **ONTOLOGY.md is hybrid-stripped.** The §Named Entity Registry block moves entirely to `_source/entities/`. The remaining Categories / Relation Types / Notes sections stay as primary-authored content at `ONTOLOGY.md`.
4. **Attribution (Rule 6) becomes structural.** Every record carries an `extensions[]` array; every section record carries a `touched_by_cf[]` reverse index. HTML-comment attribution is retired as an authoring surface — the compiler (for the `world-index render` read-only view only) renders extensions as HTML-comment-attributed prose on demand, but storage is structured.
5. **Append-only ledger discipline is preserved.** Per-file atomic records make the discipline structural rather than prose-enforced: a CF's YAML file is append-only on disk; mutations happen via `update_record_field` ops on `notes`, `modification_history`, and `extensions` fields, never on structural fields without explicit retcon attestation.
6. **The 13 mandatory world files contract in FOUNDATIONS §Mandatory World Files is preserved in count and semantics.** The storage-form changes; the design-contract does not. CF / CH / Invariant / Mystery / Open-Question / Named-Entity / Prose-Section records all continue to be the atomic units; they're just addressed per-file instead of by prose-position.

## Deliverables

### §A — `_source/` directory contract

Every machine-layer-enabled world has the following structure:

```
worlds/<slug>/
  WORLD_KERNEL.md                              ← primary-authored; only narrative file at root
  ONTOLOGY.md                                  ← primary-authored; Categories + Relation Types + Notes; NO Named Entity Registry
  _source/
    canon/CF-NNNN.yaml                         ← one file per Canon Fact Record
    change-log/CH-NNNN.yaml                    ← one file per Change Log Entry
    invariants/<ID>.yaml                       ← one file per Invariant, ID preserved (ONT-N, CAU-N, SOC-N, AES-N, DIS-N)
    mystery-reserve/M-NNNN.yaml                ← one file per Mystery Reserve entry
    open-questions/OQ-NNNN.yaml                ← one file per Open Question (synthetic sequential IDs)
    entities/ENT-NNNN.yaml                     ← one file per Named Entity
    everyday-life/SEC-ELF-NNN.yaml             ← one file per H2 section of former EVERYDAY_LIFE.md
    institutions/SEC-INS-NNN.yaml              ← one file per H2 section of former INSTITUTIONS.md
    magic-or-tech-systems/SEC-MTS-NNN.yaml     ← one file per H2 section of former MAGIC_OR_TECH_SYSTEMS.md
    geography/SEC-GEO-NNN.yaml                 ← one file per H2 section of former GEOGRAPHY.md
    economy-and-resources/SEC-ECR-NNN.yaml     ← one file per H2 section of former ECONOMY_AND_RESOURCES.md
    peoples-and-species/SEC-PAS-NNN.yaml       ← one file per H2 section of former PEOPLES_AND_SPECIES.md
    timeline/SEC-TML-NNN.yaml                  ← one file per historical Layer of former TIMELINE.md
    <subdir>/README.md                         ← optional per-subdir orientation note for new contributors
  _index/world.db                              ← derived; gitignored
  characters/<char-slug>.md                    ← unchanged — hybrid YAML-frontmatter + prose body
  diegetic-artifacts/<da-slug>.md              ← unchanged — hybrid
  adjudications/PA-NNNN-<verdict>.md           ← unchanged
  proposals/PR-NNNN-<slug>.md                  ← unchanged
  proposals/batches/BATCH-NNNN.md              ← unchanged
  character-proposals/                         ← unchanged
  audits/AU-NNNN-<date>.md                     ← unchanged
  audits/AU-NNNN/retcon-proposals/             ← unchanged
```

**Retired root-level files** (deleted during migration; no compiled replacement):
`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, `PEOPLES_AND_SPECIES.md`, `TIMELINE.md`.

**`.gitignore` changes**: remove `worlds/*/_source/` from ignore list (it's now source of truth and must be tracked). `worlds/*/_index/` remains ignored (derived).

### §B — Atomic record schemas

#### Canon Fact Record — `_source/canon/CF-NNNN.yaml`

Lift-and-shift of the current fenced-YAML CF record in `CANON_LEDGER.md`. Schema unchanged:

```yaml
id: CF-NNNN
title: <string>
status: hard_canon | derived_canon | soft_canon | contested_canon | mystery_reserve
type: <ontology-category>
statement: >
  <natural-language statement>
scope:
  geographic: local | regional | global | cosmic
  temporal: ancient | historical | current | future | cyclical
  social: restricted_group | public | elite | secret | rumor
truth_scope:
  world_level: true | false | uncertain
  diegetic_status: objective | believed | disputed | propagandistic | legendary
domains_affected: [<domain>, ...]
prerequisites: [<string>, ...]
distribution:
  who_can_do_it: [<string>, ...]
  who_cannot_easily_do_it: [<string>, ...]
  why_not_universal: [<string>, ...]
costs_and_limits: [<string>, ...]
visible_consequences: [<string>, ...]
required_world_updates: [<file_class>, ...]     # values like EVERYDAY_LIFE, INSTITUTIONS; no .md suffix
source_basis:
  direct_user_approval: <bool>
  derived_from: [<CF-ID>, ...]
contradiction_risk:
  hard: <bool>
  soft: <bool>
notes: >
  <free prose; may include "Modified YYYY-MM-DD by CH-NNNN (CF-NNNN):" lines>
modification_history:
  - change_id: CH-NNNN
    originating_cf: CF-NNNN
    date: YYYY-MM-DD
    summary: <string>
```

**Change from current form**: `required_world_updates` values are `file_class` tokens (`EVERYDAY_LIFE`) not filenames (`EVERYDAY_LIFE.md`), since files are retired. Migration normalizes this.

#### Change Log Entry — `_source/change-log/CH-NNNN.yaml`

Lift-and-shift of current CH block in `CANON_LEDGER.md`'s Change Log section. Schema unchanged from current practice.

#### Invariant — `_source/invariants/<ID>.yaml`

IDs preserved verbatim: `ONT-1.yaml`, `ONT-2.yaml`, `CAU-1.yaml`, `SOC-1.yaml`, `AES-1.yaml`, `DIS-1.yaml`, etc.

```yaml
id: <INV-ID>                                    # e.g., ONT-1
category: ontological | causal | distribution | social | aesthetic_thematic
title: <string>                                 # from the existing "### ONT-1 — Sentience requires..." heading
statement: >
  <full statement>
rationale: >
  <full rationale>
examples: [<string>, ...]
non_examples: [<string>, ...]
break_conditions: <string>
revision_difficulty: low | medium | high
extensions:                                     # formerly HTML-comment-attributed extensions
  - originating_cf: CF-NNNN
    change_id: CH-NNNN
    date: YYYY-MM-DD
    label: <string>                             # e.g., "Clarification", "Extended Clarification", "Firewall"
    body: >
      <full extension prose>
```

#### Mystery Reserve Entry — `_source/mystery-reserve/M-NNNN.yaml`

IDs preserved (animalia's current scheme is unpadded `M-1` through `M-20`; new worlds use zero-padded `M-NNNN`).

```yaml
id: M-<N>
title: <string>
status: active | passive_depth
knowns: [<string>, ...]
unknowns: [<string>, ...]
common_interpretations:
  - description: <string>
    holders: <string>                           # e.g., "some sectarian movements"
disallowed_cheap_answers: [<string>, ...]
domains_touched: [<string>, ...]
future_resolution_safety: low | medium | medium-low | high
extensions:
  - originating_cf: CF-NNNN
    change_id: CH-NNNN
    date: YYYY-MM-DD
    label: <string>                             # e.g., "Extension — Bandit-occupation shelter-scope firewall"
    body: >
      <full extension prose>
```

#### Open Question — `_source/open-questions/OQ-NNNN.yaml`

Current `OPEN_QUESTIONS.md` uses heading-scoped topics without explicit IDs. Migration assigns sequential `OQ-NNNN` IDs preserving heading order. `topic` carries the original heading verbatim.

```yaml
id: OQ-NNNN
topic: <string>                                 # e.g., "Place and Polity Naming"
body: >
  <body prose>
when_to_resolve: >
  <when-to-resolve prose>
caution: >                                      # optional; present when current file has "**Caution:**" line
  <caution prose>
extensions:
  - originating_cf: CF-NNNN
    change_id: CH-NNNN
    date: YYYY-MM-DD
    label: <string>
    body: >
      <full extension prose>
```

#### Named Entity — `_source/entities/ENT-NNNN.yaml`

Per-entity atomization of `ONTOLOGY.md §Named Entity Registry`.

```yaml
id: ENT-NNNN
canonical_name: <string>                        # e.g., "Canal Heartland", "Ash-Seal"
entity_kind: <string>                           # region | institution | place | faction | polity | ...
aliases: [<string>, ...]                        # default []
originating_cf: <CF-ID> | null                  # null for genesis entities; CF-ID for later additions
scope_notes: <string>                           # brief human-readable context
```

#### Prose Section — `_source/<file-subdir>/SEC-<PREFIX>-NNN.yaml`

File prefixes: `ELF` (EVERYDAY_LIFE), `INS` (INSTITUTIONS), `MTS` (MAGIC_OR_TECH_SYSTEMS), `GEO` (GEOGRAPHY), `ECR` (ECONOMY_AND_RESOURCES), `PAS` (PEOPLES_AND_SPECIES), `TML` (TIMELINE).

```yaml
id: SEC-<PREFIX>-NNN                            # e.g., SEC-ELF-007
file_class: <FILE_CLASS>                        # e.g., EVERYDAY_LIFE
order: <integer>                                # ordering within the former file
heading: <string>                               # the H2 heading text, e.g., "Ordinary Hazards"
heading_level: 2
body: |
  <verbatim markdown body, including H3 subsections, bullets, prose, preserved as-is>
extensions:                                     # HTML-comment-attributed extensions appended to this section
  - originating_cf: CF-NNNN
    change_id: CH-NNNN
    date: YYYY-MM-DD
    label: <string>
    body: |
      <full extension prose, preserved verbatim from the current HTML-comment block>
touched_by_cf: [<CF-ID>, ...]                   # reverse index: CFs whose required_world_updates references this file_class AND/OR HTML-comment attributions inside the body
```

**`touched_by_cf[]` derivation** (migration and post-migration):
- **Migration**: scan each section's body + extensions for `<!-- added by CF-NNNN -->` / `<!-- clarified by CH-NNNN -->` attributions; cross-check each CF's `required_world_updates` references this section's `file_class`. Union of both sources.
- **Post-migration** (via patch engine): whenever `append_extension` targets a SEC, the engine automatically appends the originating_cf to `touched_by_cf[]` unless already present.

### §C — Amendments to sibling specs

SPEC-13 is an umbrella that drives targeted edits in the following existing specs. The edits land in those specs directly (not duplicated here); SPEC-13 references them authoritatively.

#### SPEC-03 (Patch Engine)
Op vocabulary rewrite. Retire 7 markdown-anchor ops (`insert_before_node`, `insert_after_node`, `replace_node`, `insert_under_heading`, `append_bullet_cluster`, `append_heading_section`, `insert_attribution_comment`). Add 7 `create_*` ops for the new record classes (`create_cf_record`, `create_ch_record`, `create_inv_record`, `create_m_record`, `create_oq_record`, `create_ent_record`, `create_sec_record`). Repurpose 3 ops (`update_record_field`, `append_extension`, `append_touched_by_cf`). Retain 4 ops unchanged (`append_adjudication_record`, `append_character_record`, `append_diegetic_artifact_record`, `append_modification_history_entry`). Remove Phase B compile step (no compiled views to maintain). Simplify write-order to three tiers (create-all, update-all, adjudication-record) since no monolithic ledger serialization constraint remains. Retire anchor-hash machinery (`expected_anchor_checksum` retained only for hybrid files — characters and diegetic artifacts).

#### SPEC-04 (Validator Framework)
Retire 2 validators (`attribution_comment` — attribution is now a record field, no HTML-comment authoring surface; `anchor_integrity` — no anchors on atomic records). Add 2 validators (`record_schema_compliance`, `touched_by_cf_completeness`). Rule 1–7 validators unchanged in logic; simpler input (per-record YAML instead of parsed fenced-YAML blocks). `yaml_parse_integrity` now operates across every `_source/*.yaml` file.

#### SPEC-06 (Skill Rewrite Patterns)
Skill-body size estimates revise downward by an additional 15–25% per skill beyond SPEC-06's Phase 2 baseline (prose-layout lore and "Large-file method" catalogs become fully deletable once retrieval is record-addressed). Token reduction target lifts from ≥70% (SPEC-06 baseline) to ≥80% for large deliveries against atomized state. Patch-plan construction shifts to record-id-addressed ops (no anchor-hash construction). SPEC-06 Part A (canon-addition read-side pilot) is folded into Phase 2 full-skill migration rather than landing against the soon-retired monolithic ledger.

#### SPEC-05 (Hooks Discipline)
Hook 2 (PreToolUse on Read) block list covers `_source/` subdirectories (oversize YAML-directory reads redirected to MCP retrieval). Hook 3 (PreToolUse on Edit/Write) block list covers `_source/` subdirectories. Explicitly allowed direct edits: `WORLD_KERNEL.md`, `ONTOLOGY.md`, `_source/<subdir>/README.md`, `characters/*`, `diegetic-artifacts/*`, `proposals/*`, `audits/*`, `adjudications/*`. Compiled-file detection machinery retired (no compiled files exist).

#### SPEC-02 (MCP Retrieval Server)
Add 3 tools: `mcp__worldloom__get_record(record_id)` (generalizes `get_node` across all atomic record classes), `mcp__worldloom__find_sections_touched_by(cf_id)` (reverse-index lookup), `mcp__worldloom__get_compiled_view(file_class, sections?)` (on-demand render for HARD-GATE deliverable summaries; not stored on disk). `get_compiled_view` dispatches to the same render implementation used by the `world-index render` CLI (§A) so both surfaces produce byte-identical merged views. `allocate_next_id` extends to new classes (INV per-category, M, OQ, ENT, SEC per-file-class).

#### SPEC-07 (Docs Updates)
Part C (previously: Phase 3 docs updates for compiled-ledger-from-atomic-source) retired — SPEC-13 handles the FOUNDATIONS revision directly. Part B content remains (HARD-GATE-DISCIPLINE.md write-order rewrite for the new engine, CLAUDE.md phrasing refinement).

#### SPEC-08 (Migration & Phasing)
Phase 3 ("Atomic Source for CF/CH Records") and Phase 4 ("High-Churn Prose Fragmentization") are both superseded by SPEC-13's Phase 1.5 scope. The `worlds/*/_source/` `.gitignore` entry installed in Phase 0 is reversed during Phase 1.5.

#### SPEC-01 (World Index)
No spec rewrite required — already archived. Parser refresh lands as a Phase 1.5 execution ticket under IMPLEMENTATION-ORDER.md: the index parser reads `_source/*.yaml` as primary input; markdown files at the world root are no longer parsed for records (only WORLD_KERNEL.md and ONTOLOGY.md remain as prose inputs to the index's lexical layer).

### §D — FOUNDATIONS.md and related docs revision scope

Surgical edits:

**1. §Mandatory World Files** — reclassify as follows (count of 13 preserved; roles shift):

| File | Role |
|---|---|
| `WORLD_KERNEL.md` | Primary-authored narrative (root-level) |
| `ONTOLOGY.md` | Primary-authored (root-level); Named Entity Registry stripped to `_source/entities/` |
| `CANON_LEDGER.md` (logical) | Atomized: `_source/canon/` + `_source/change-log/` |
| `INVARIANTS.md` (logical) | Atomized: `_source/invariants/` |
| `MYSTERY_RESERVE.md` (logical) | Atomized: `_source/mystery-reserve/` |
| `OPEN_QUESTIONS.md` (logical) | Atomized: `_source/open-questions/` |
| `EVERYDAY_LIFE.md` (logical) | Atomized: `_source/everyday-life/` (per-H2-section SEC records) |
| `INSTITUTIONS.md` (logical) | Atomized: `_source/institutions/` |
| `MAGIC_OR_TECH_SYSTEMS.md` (logical) | Atomized: `_source/magic-or-tech-systems/` |
| `GEOGRAPHY.md` (logical) | Atomized: `_source/geography/` |
| `ECONOMY_AND_RESOURCES.md` (logical) | Atomized: `_source/economy-and-resources/` |
| `PEOPLES_AND_SPECIES.md` (logical) | Atomized: `_source/peoples-and-species/` |
| `TIMELINE.md` (logical) | Atomized: `_source/timeline/` (per-historical-Layer SEC records) |

The thirteen files remain "mandatory" in the sense that every world model must express each of them; storage form moves from monolithic markdown to atomic YAML under `_source/`.

**2. New subsection §Canonical Storage Layer** (inserted after §Machine-Facing Layer) — one-paragraph statement that canonical storage is `_source/` atomic YAML per record; there are no compiled views; engine-only write discipline applies to `_source/` subdirectories; human reading uses IDE file-tree or `world-index render` CLI; cross-reference to SPEC-13.

**3. §Canon Fact Record Schema** — add a note that CF records are stored as atomic files at `_source/canon/CF-NNNN.yaml`; the in-place `notes` field and `modification_history` array remain the authorized mutation surfaces for an accepted CF.

**4. §Tooling Recommendation** closing paragraph — update to reference the atomic-source contract: "skills should always receive X" items are delivered via `mcp__worldloom__get_context_packet` against atomic records.

Rules 1–7, Canon Layers, Invariants taxonomy, Ontology Categories, Relation Types, Acceptance Tests, Core Principle, Change Control Policy — unchanged.

**5. `docs/MACHINE-FACING-LAYER.md` §Phase Boundaries** — rewrite the "Phase 3 optional surface" bullet (currently at `docs/MACHINE-FACING-LAYER.md:41`) so it no longer describes `_source/` as optional, no longer describes `CANON_LEDGER.md` as a potential compiled artifact, and no longer places atomic-source storage in Phase 3. Replace with a "Phase 1.5 canonical storage layer" bullet stating that `_source/` atomic YAML is the sole source-of-truth for atomized concerns on machine-layer-enabled worlds; the retired root-level files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, plus the five large prose files, plus `TIMELINE.md`) do not exist on such worlds; merged markdown views are produced on-demand via `world-index render <world-slug> [--file <class>]` (read-only; not persisted). This is a Stream A deliverable landing alongside the FOUNDATIONS.md edits above. `docs/CONTEXT-PACKET-CONTRACT.md` is intentionally not updated — its contract is storage-form-agnostic (packet shape is type-driven, not derived from file layout).

### §E — Migration Procedure (animalia, one-time, manual)

Executed in a follow-up session after this spec and its siblings land. The procedure is authored-by-Claude (not toolchain-driven) on the single legacy world. Future worlds come through `create-base-world` (updated in Phase 2) which emits `_source/` directly — no legacy ever accumulates again.

**Pre-migration snapshot**: copy `worlds/animalia/` to a gitignored `.pre-migration-snapshot/` sibling directory. This gives an independent restore path alongside `git revert` if reconciliation surfaces a migration bug post-commit.

**Execution order** (file-class by file-class; each step is self-contained):

1. **CF records (mechanical)** — extract each fenced `yaml` block in `CANON_LEDGER.md` from `## Canon Fact Records` to `## Change Log`. Each block is already YAML; write to `_source/canon/CF-NNNN.yaml` verbatim plus a trailing newline. Normalize `required_world_updates` values to strip `.md` suffixes (`EVERYDAY_LIFE.md` → `EVERYDAY_LIFE`). Count check: 47 CFs extracted → 47 files written.

2. **CH entries (mechanical)** — same process for `## Change Log` section. 18 CHs → 18 files.

3. **Invariants (careful authoring)** — for each `### <ID> — <title>` heading in `INVARIANTS.md` (under ## Ontological / Causal / Distribution / Social / Aesthetic / Thematic Invariants), author `_source/invariants/<ID>.yaml` mapping the prose bullet fields (`**Statement**`, `**Rationale**`, `**Examples**`, `**Non-examples**`, `**Break conditions**`, `**Revision difficulty**`) to YAML keys. Every `<!-- added by CF-NNNN -->` HTML comment followed by a bold-label-prefixed extension becomes one entry in `extensions[]` with `originating_cf`, `change_id` (from the `(CH-NNNN)` parenthetical), `date` (cross-referenced from the change log), `label` (the bold prefix stripped of the `(CH-NNNN)` parenthetical), `body` (everything after the label colon until the next extension or next invariant heading).

4. **Mystery Reserve (careful authoring)** — same pattern as invariants. Each `## M-N — <title>` becomes `_source/mystery-reserve/M-N.yaml`. Prose fields `**Status**`, `**Knowns**`, `**Unknowns**`, `**Common in-world interpretations**`, `**Disallowed cheap answers**`, `**Domains touched**`, `**Future-resolution safety**` map to YAML keys; HTML-comment-attributed `**Extension (CH-NNNN) — <label>**` blocks become `extensions[]` entries.

5. **Open Questions (assign IDs + author)** — for each `## <topic>` heading in `OPEN_QUESTIONS.md`, assign `OQ-NNNN` sequentially in document order starting at `OQ-0001`. `topic` YAML field preserves the heading verbatim. Body prose and `**When to resolve**` / `**Caution**` fields map to `body` / `when_to_resolve` / `caution`. HTML-comment-attributed extensions map to `extensions[]`.

6. **Entities (mechanical)** — for each entry in the current `named_entities` YAML list in `ONTOLOGY.md` §Named Entity Registry, assign `ENT-NNNN` sequentially. Preserve `canonical_name` and `entity_kind`. `aliases` defaults to `[]`. `originating_cf` is `null` for genesis entities (Canal Heartland, Cold North, Drylands South, Fenlands West, Mountain East) and set to the introducing CF for later additions (Ash-Seal → `originating_cf: CF-0043`, verified by cross-checking the registry's addition history in the ledger). `scope_notes` is one short line of context extracted from the ontology entry or adjacent text.

7. **ONTOLOGY.md stripping** — delete the `## Named Entity Registry` section (YAML block + heading). Keep `## Categories in Use`, `## Relation Types in Use`, `## Notes on Use`. The HTML-comment-attributed entries within the Categories table (e.g., `<!-- added by CF-0035 -->` annotations in species / institution / artifact rows) remain in the primary-authored `ONTOLOGY.md` because they are inline table-cell annotations, not standalone records. (If future work demands these also become atomized, that's a separate follow-up — currently they function as table-embedded commentary and hand-editing is fine.)

8. **Prose sections (careful, bulkiest step)** — for each of 7 prose files (EVERYDAY_LIFE, INSTITUTIONS, MAGIC_OR_TECH_SYSTEMS, GEOGRAPHY, ECONOMY_AND_RESOURCES, PEOPLES_AND_SPECIES, TIMELINE), identify H2 headings in document order. For each H2:
   - Assign `SEC-<PREFIX>-NNN` sequentially per file (padded to 3 digits)
   - `file_class` = the file's constant (e.g., `EVERYDAY_LIFE`)
   - `order` = 1-based ordinal within the file
   - `heading` = H2 text (strip the `##`)
   - `body` = verbatim markdown from after the H2 heading up to (but not including) the next H2 heading, including any H3 children, bullets, prose, paragraphs, inline HTML comments that are NOT section-level extensions
   - `extensions[]` = section-level HTML-comment-attributed extension blocks (distinguished from inline bullet-level attributions by being free-standing blocks separated from surrounding prose, typically of the form `<!-- added by CF-NNNN --> **Label (CH-NNNN)**: <body>`). When uncertain, leave the comment in `body` and skip `extensions[]` for that note — conservative inclusion is preferred over aggressive extraction.
   - `touched_by_cf[]` = union of (a) CFs cited in HTML-comment attributions within body or extensions, and (b) CFs whose `required_world_updates` includes this section's `file_class`. Discrepancies (a CF claims to update the file but no section in that file attributes it) are collected in a migration-notes memo and resolved before commit (either attribute the CF to an existing section, or surface as a latent Rule 5/6 violation for a follow-up cleanup canon-addition run).

9. **Timeline atomization** — TIMELINE.md's Layer 1/2/3/4 H2 headings become one SEC each (`SEC-TML-001` through `SEC-TML-004`). Each layer's complete content (Material residue, Institutional residue, Symbolic residue, Who tells the story sub-sections) lives in `body`. HTML-comment-attributed Layer-annotation extensions (e.g., `<!-- added by CF-0037 --> **Pre-Charter folk-tradition residue (Layer-1 annotation)**: ...`) become `extensions[]` entries.

10. **Subdirectory READMEs** — optionally add a small `_source/<subdir>/README.md` per subdirectory orienting new contributors ("Canon facts in this world. Each file is one CF record per the schema in docs/FOUNDATIONS.md §Canon Fact Record Schema. See SPEC-13 for the atomic-source contract."). Not required but cheap.

11. **Delete monolithic files** — once all `_source/` records are authored, delete the 11 retired root-level markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, `PEOPLES_AND_SPECIES.md`, `TIMELINE.md`).

12. **Update `.gitignore`** — remove `worlds/*/_source/` from the ignore list.

13. **Rebuild index** — run `world-index build animalia` against the new source of truth. Must succeed; every YAML parses; IDs unique; cross-refs resolve.

14. **Structural validation** — run `world-validate animalia --structural` (validators scoped to structural invariants: `yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `record_schema_compliance`). Must report zero fails. Rule 1–7 validators are deferred to Phase 2 activation.

15. **Human review** — user reviews the migration commit's git diff: the `_source/` tree additions, the 11 file deletions, the `ONTOLOGY.md` strip, the `.gitignore` update. Approves or requests revisions.

16. **Commit** — single migration commit with message inventorying what moved where. One commit for audit clarity; no rebase, no squash with unrelated work.

17. **Post-commit cleanup** — after a week of confirmed working migration (skills still operate; index stable), delete the `.pre-migration-snapshot/` directory.

**Rollback**: `git revert` of the migration commit restores the monolithic files. The `.pre-migration-snapshot/` directory (retained for one week) provides an independent filesystem-level restore path if the revert gets complicated due to intervening commits.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| Core Principle (world model not bag of facts) | Unchanged; atomic records preserve the ontology / space / time / causality / embodiment / institutions / resources / culture / knowledge / history / daily life / pressure-points / mystery-reserve structure exactly |
| §Canon Layers | Unchanged; every atomic record carries `status` (CF) or equivalent layer marker |
| §Invariants taxonomy | Unchanged; invariant records carry `category` matching the 5-category taxonomy |
| §Ontology Categories / §Relation Types | Unchanged; no content revision, only a storage-form revision of the NEL |
| §Canon Fact Record Schema | Preserved verbatim as the CF YAML shape; only storage location changes (from fenced-YAML-in-ledger to per-file) |
| §Change Control Policy | Aligned; every CH record lives in `_source/change-log/` as its own file — change log is now more auditable, not less |
| §Tooling Recommendation (never operate on prose alone) | **Strengthened**; atomic records eliminate the residual prose-parsing step; context-packet retrieval operates on structured nodes throughout |
| Rule 1 No Floating Facts | Aligned; JSON-schema-compliant records make required-field validation trivial; `record_schema_compliance` validator enforces |
| Rule 2 No Pure Cosmetics | Aligned; `domains_affected` remains a required CF field; validator logic unchanged |
| Rule 3 No Specialness Inflation | Aligned; no storage-form effect |
| Rule 4 No Globalization by Accident | Aligned; no storage-form effect |
| Rule 5 No Consequence Evasion | **Strengthened**; `touched_by_cf[]` reverse index makes "did every required_world_updates file_class get a drafted patch?" a structural lookup, not a prose scan |
| Rule 6 No Silent Retcons | **Strengthened**; append-only discipline is per-file; `extensions[]` + `modification_history[]` arrays are structural audit trails; git log per-CF is surgical |
| Rule 7 Preserve Mystery Deliberately | Aligned; M records preserve all current bounded-unknown fields; firewall extensions are first-class `extensions[]` entries |
| §Acceptance Tests | Unchanged (these are world-coherence judgments, not schema compliance) |
| §Mandatory World Files (13) | Preserved in count and semantics; storage form changes |
| HARD-GATE discipline | Unchanged; `approval_token` binds to exact-bytes of the patch plan as before |

## Verification

- **Animalia migration acceptance**: all 17 procedure steps complete; `world-index build animalia` succeeds; `world-validate animalia --structural` reports zero fails; human git-diff review approved; single migration commit landed.
- **CF/CH count parity**: 47 CF YAML files, 18 CH YAML files — matches current ledger count.
- **Invariant / M / OQ / ENT / SEC count parity**: spot-checked per file class; discrepancies investigated.
- **`touched_by_cf[]` coverage**: for every CF with non-empty `required_world_updates`, at least one SEC under the corresponding `file_class` directory has that CF in `touched_by_cf[]`. Gaps investigated case-by-case.
- **Cross-reference integrity**: every `derived_from`, `affected_fact_ids`, `originating_cf`, `change_id` resolves to an indexed record.
- **Monolithic file absence**: no dangling references to the 11 retired files in `specs/**/*.md`, `docs/**/*.md`, or `CLAUDE.md` post-migration. (Pre-execution grep sweep is part of Stream A's spec-drafting verification; Stream B execution repeats the sweep.) Skill SKILL.md references to retired filenames are acknowledged as transient and are explicitly out of scope for the Phase 1.5 sweep — those references are rewritten end-to-end when skills are migrated against atomic-source retrieval as part of SPEC-06 Phase 2. Between the Phase 1.5 migration commit and the completion of SPEC-06 Phase 2, `.claude/skills/**/SKILL.md` files will carry dangling filename references; this is intentional and does not block Phase 1.5 landing.
- **Hybrid-file preservation**: characters, diegetic artifacts, adjudications, proposals, audits unchanged on disk; their structured frontmatter continues to be indexed.
- **ONTOLOGY.md integrity**: after strip, Categories / Relation Types / Notes sections remain byte-identical to pre-migration.
- **WORLD_KERNEL.md integrity**: unchanged.
- **Reversibility confidence**: `git revert` of the migration commit restores the pre-migration state; structural properties (CF count, file existence, skill operability) return to pre-migration baseline.

## Out of Scope

- Atomization of character dossiers (`characters/<slug>.md`) — stays hybrid single-file (YAML frontmatter + prose body); the 85% prose body is narrative and the frontmatter already carries indexable metadata
- Atomization of diegetic artifacts (`diegetic-artifacts/<da-slug>.md`) — stays hybrid for the same reason
- Atomization of adjudications, proposals, audits, retcon-proposals — already per-file; no further atomization needed
- Atomization of table-embedded annotations in ONTOLOGY.md Categories — inline table commentary, not record-shaped; hand-editable
- Migration tool / package — single-use; manual migration by Claude is cheaper and equally reliable (see §E)
- Back-compat layer for existing mid-flight sessions referencing monolithic filenames — not applicable; migration is atomic and lands between sessions
- Telemetry on migration effects — speculative; Phase 2 acceptance criteria measure token-reduction deltas
- Multi-world simultaneous migration — animalia is the only legacy-form world; no multi-world scenario exists
- Automated migration for new legacy worlds after animalia — `create-base-world` is updated in Phase 2 to emit `_source/` directly; no future legacy accumulates
- Compile-on-commit pipelines, git-hook-based validation, CI integration — Phase 2 and beyond; SPEC-13 scope ends at the migration commit

## Risks & Open Questions

- **`touched_by_cf[]` discrepancies surface latent Rule 5/6 violations in animalia's current state**. Expected outcome: a small number of CFs with `required_world_updates: [X]` whose section in file-class X has no HTML-comment attribution back to that CF. Mitigation: collect in migration-notes memo; resolve before migration commit by either (a) attributing the CF to an appropriate existing section (retroactive annotation is permissible during migration since the structural graph is being built; equivalent to adding the attribution in place), or (b) raising the gap as a latent defect and scheduling a follow-up canon-addition run to address it post-migration. Does not block migration landing; documented gaps are acceptable.
- **H2 boundary ambiguity in prose files**. Some sections may have ambiguous boundaries (e.g., a `<!-- added by CF-NNNN --> ### DIS-1-EXT` mid-file in INVARIANTS.md). Mitigation: the migration procedure treats INVARIANTS.md as invariant records, not SEC records — so this specific case is resolved by putting `DIS-1-EXT` content in `DIS-1.yaml`'s `extensions[]`, not in a SEC record. In prose files, mid-file `<!-- added by CF-NNNN -->` comments that introduce substantive subsection content stay in the enclosing H2 section's body (conservative over extracting).
- **Extension date extraction from ledger cross-reference**. Extensions in invariants / MR / OQ currently cite change IDs (`CH-NNNN`) but may not inline dates; the migration tool extracts dates from the corresponding `_source/change-log/CH-NNNN.yaml` record's `date` field. Requires CH extraction to complete before INV / M / OQ extraction begins (procedural dependency, not a blocker).
- **Character dossiers / diegetic artifacts reference CFs in their frontmatter**. These references (`canon_facts_consulted: [CF-0001, CF-0035]`) remain valid post-migration — the CFs still exist, just as `_source/canon/CF-0035.yaml` rather than as a fenced block in the ledger. The index resolves references by ID regardless of storage location.
- **`CLAUDE.md` and skill SKILL.md files contain many references to `CANON_LEDGER.md`** (as a filename, as a read target, as a prose example). Post-migration, these references become dangling unless updated. Mitigation: Stream A's SPEC-13 + sibling-spec work includes a CLAUDE.md update; skill SKILL.md updates land as part of SPEC-06 Phase 2 skill rewrites (where skills are rewritten anyway). Transitional language in specs may refer to "`CANON_LEDGER.md` (pre-migration) / `_source/canon/` (post-migration)" where both eras are relevant.
- **Authors hand-edit `_source/*.yaml` and introduce malformed YAML**. Mitigation: Hook 5 PostToolUse runs `record_schema_compliance` on any `_source/*.yaml` write; malformed YAML surfaces immediately with structured error messages pointing at the specific file and field.
- **Git history across the migration is discontinuous**. `git log --follow _source/canon/CF-0035.yaml` does not cross the migration boundary; the pre-migration history of that CF lives in `CANON_LEDGER.md`'s git log. Mitigation: the migration commit message explicitly inventories what moved where; a brief migration-history note in `docs/archival-workflow.md` (or similar existing doc) records the discontinuity with a pointer to the migration commit's SHA for future archaeology.
- **Reversibility relies on git + snapshot, not byte-identical compile round-trip**. Without a migration tool producing a reverse-compile, the assurance of "no information lost" rests on human review and structural verification (`world-index build` succeeds, `world-validate --structural` passes). Mitigation: the pre-migration snapshot directory is retained for one week post-commit; structural discrepancies surfaced in that window trigger supplementary manual reconciliation.
