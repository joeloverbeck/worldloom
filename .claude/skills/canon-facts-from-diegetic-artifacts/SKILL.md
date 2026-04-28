---
name: canon-facts-from-diegetic-artifacts
description: "Use when mining candidate canon facts from a specific diegetic artifact in an existing worldloom world — extracting implied world details the author treats as given, with an explicit Diegetic-to-World laundering firewall preventing narrator-voice claims from being inflated into world-level canon. Produces: proposal cards at worlds/<world-slug>/proposals/PR-NNNN-<slug>.md + batch manifest at worlds/<world-slug>/proposals/batches/BATCH-NNNN.md + auto-updated proposals/INDEX.md. Contradictions with existing canon are NOT emitted as cards — they are segregated into a flagged-contradictions list and handed off to continuity-audit. Mutates: only worlds/<world-slug>/proposals/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any _source/ atomic record). Each emitted card's path is directly consumable as canon-addition's proposal_path."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: artifact_path
    description: "Path to a diegetic artifact file. MUST resolve inside worlds/<world-slug>/diegetic-artifacts/ — cross-world, out-of-tree, or repo-root paths are rejected at pre-flight. Both diegetic-artifact-generation-generated artifacts (with machine-readable frontmatter claim tags) and hand-authored artifacts (with sparse or missing tags) are supported; Phase 1 re-derives claims from prose as primary and consults any frontmatter tags as hints."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: max_cards (default 5, override with any integer ≥0); taboo_areas (free-form); novelty_range (conservative / moderate / bold); allow_soft_canon_only (boolean; demotes all surviving hard_canon proposals to soft_canon). If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Canon Facts From Diegetic Artifacts

Mines an existing diegetic artifact in a worldloom world for candidate canon facts. Pre-flight loads world state via `mcp__worldloom__get_context_packet(task_type='canon_facts_from_diegetic_artifacts', ...)` plus direct reads of FOUNDATIONS / WORLD_KERNEL / ONTOLOGY / the source artifact; classification and laundering judgment pull atomic records on demand via `search_nodes` / `get_record` / `find_named_entities`; surviving cards are written direct-Edit on hybrid files (proposals are NOT canon — Hook 3 hybrid-file allowlist permits the writes). Each emitted card's path is directly consumable as `canon-addition`'s `proposal_path` for separate adjudication.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update — until: (a) pre-flight resolves `worlds/<world-slug>/`, verifies `artifact_path` resolves inside `worlds/<world-slug>/diegetic-artifacts/` and is readable, parses the source `DA-NNNN` id, allocates the next `BATCH-NNNN` via `mcp__worldloom__allocate_next_id`, and loads the context packet plus FOUNDATIONS / WORLD_KERNEL / ONTOLOGY / the source artifact; (b) Phase 6 Canon Safety Check passes for every surviving card with zero unrepaired violations across 6a invariant conformance, 6b Mystery Reserve firewall, 6c distribution discipline, 6d Diegetic-to-World laundering (evidence-breadth three-pathway + epistemic-horizon + MR positional sub-tests), and 6e batch-level check (joint-closure + mutual-contradiction + single-narrator concentration); (c) Phase 7 Validation Tests pass with zero failures at both per-card and batch levels; (d) the user has explicitly approved the Phase 8 deliverable summary (claim extraction trace, Phase 2 classification counts, Phase 5 rejection-trigger log, flagged-contradictions list routed to continuity-audit, every surviving card's full content + Canon Safety Check trace, any Phase 6f repairs that fired, any cards the user is dropping). The HARD-GATE also fires for empty batches (zero surviving cards) — the batch manifest still writes as a diagnostic record with `card_ids: []`, and user approval is still required before that write. This gate is absolute under Auto Mode — invoking the skill is not deliverable approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id BATCH; get_context_packet for world state;
            direct Read FOUNDATIONS + WORLD_KERNEL + ONTOLOGY + artifact;
            parse DA-NNNN; prior-batch positional-flag scan)
      |
      v
Phase 0:    Normalize Mining Parameters (parse OR interview)
      |
      v
Phase 1:    Load and Parse Artifact — claim extraction (prose PRIMARY,
            frontmatter tags HINTS only; independent-assertion granularity)
      |
      v
Phases 2-5: Classify (search_nodes / get_record / find_named_entities to
            ground claims; grounded / partially_grounded discarded;
            contradicts / extends-soft routed to flagged-contradictions);
            map proposed_status (narrator-reliability); score (8 dimensions,
            +6 threshold); reject (R1-R12) and cap top max_cards; allocate
            PR-NNNN per surviving card via allocate_next_id
      |
      v
Phase 6:    Canon Safety Check
            6a Invariant Conformance (every INV consulted)
            6b Mystery Reserve Firewall (every M consulted)
            6c Distribution Discipline
            6d Diegetic-to-World Laundering Firewall
               (6d.1 evidence-breadth three-pathway / 6d.2 epistemic-horizon /
                6d.3 MR positional)
            6e Batch-level Check (joint-closure + mutual-contradiction +
                                  single-narrator concentration)
            --any fail--> 6f Repair Sub-Pass (narrow / reclassify /
                          add stabilizer / drop / unrepairable-loop ≤ 2)
      |
      v
Phase 7:    Validation Tests (11 tests: 7 per-card + 4 batch; PASS/FAIL
            with one-line rationale)
      |
      v
Phase 8:    HARD-GATE deliverable summary --> on approval, direct-Edit
            cards + batch manifest + INDEX.md (hybrid-file allowlist);
            empty batches write manifest with card_ids: [], still gated
```

## Output

- **Proposal cards** at `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` — one hybrid YAML-frontmatter + markdown-body file per surviving card. Frontmatter shape per `templates/proposal-card.md`. Each card carries `source_basis.derived_from: [DA-NNNN]` attribution to the source artifact. Each card's filesystem path is directly consumable as `canon-addition`'s `proposal_path`.
- **Batch manifest** at `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` — hybrid file per `templates/batch-manifest.md`. Frontmatter carries `batch_id`, `world_slug`, `source_artifact_id`, `parameters`, `card_ids`, `dropped_card_ids`, `flagged_contradictions`, `mr_positional_flags`, `user_approved`. Body carries claim extraction trace, Phase 2 classification accounting, Phase 5 rejection log, flagged-contradictions handoff prose, Phase 6 sub-check traces (including 6e batch-level), Phase 6f repair log, Phase 7 test results.
- **INDEX.md update** at `worlds/<world-slug>/proposals/INDEX.md` — one line per non-dropped card in the form `- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / mined-from-<DA-NNNN>, batch BATCH-NNNN`, sorted by PR-NNNN ascending. For empty batches: `- BATCH-NNNN (empty — see manifest) — mined-from-<DA-NNNN>`. Created if absent. The `mined-from-<DA-NNNN>` slot marks provenance and distinguishes visually from sibling `propose-new-canon-facts` entries that carry an enrichment-category-letter in the same slot — both conventions are valid.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record. Hook 3 enforces. No CF, CH, INV, M, OQ, ENT, or SEC record is emitted. No write to the source artifact or any other `diegetic-artifacts/` file. Each card is a *candidate*; canonization happens only when `canon-addition` accepts it in a separate run.

## World-State Prerequisites

`docs/FOUNDATIONS.md`, `worlds/<slug>/WORLD_KERNEL.md`, `worlds/<slug>/ONTOLOGY.md`, and the source artifact at `<artifact_path>` load via direct `Read` (primary-authored at the world root or a hybrid file that this skill needs in full for Phase 1 prose extraction). The atomic-record world-state slice loads via `mcp__worldloom__get_context_packet(task_type='canon_facts_from_diegetic_artifacts', seed_nodes=[<artifact-anchor seeds>], token_budget=12000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. MCPENH-002 registered this artifact-anchored profile so the packet prioritizes diegetic artifacts, referenced records, named-entity neighbors, canon facts, invariants, Mystery Reserve entries, and artifact-local section context. The packet is the entry point, not the whole load.

For records the packet does not surface, retrieve on demand: `mcp__worldloom__get_record(record_id)` for a specific CF / CH / INV / M / OQ / ENT / SEC; `mcp__worldloom__search_nodes(node_type=..., filters=...)` for domain-filtered scans (e.g., capability CFs whose distribution touches the artifact's claims, or `node_type='canon_fact'` for Phase 2 grounding); `mcp__worldloom__find_named_entities(names)` to resolve entities the artifact names; `mcp__worldloom__find_sections_touched_by(cf_id)` when grounding a candidate against the section context where a related CF was applied. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. If `artifact_path` resolves outside the declared world's `diegetic-artifacts/`, abort with the offending path.

## Procedure

1. **Pre-flight.** Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Verify `artifact_path` resolves inside `worlds/<world-slug>/diegetic-artifacts/` and is readable; parse the artifact's frontmatter (or filename, if frontmatter absent) to extract the `DA-NNNN` id and bind it to `source_artifact_id` for all downstream card frontmatter. Allocate the batch id: `mcp__worldloom__allocate_next_id(world_slug, 'BATCH')` → `BATCH-NNNN`. Load FOUNDATIONS + WORLD_KERNEL + ONTOLOGY + the source artifact body via direct `Read`. Load the context packet per §World-State Prerequisites with seed_nodes derived from named entities the artifact references (resolved via `find_named_entities`) plus any explicit `references_record` ids declared in the artifact's frontmatter. Run the prior-batch positional-flag scan (§step 8 of `references/preflight-and-prerequisites.md`) when the artifact declares `author_character_id` or a named `author`. Read existing `proposals/INDEX.md` if present. Load `references/preflight-and-prerequisites.md` for the abort matrix and selective-retrieval pattern.

2. **Phase 0: Normalize Mining Parameters.** Load `references/phase-0-normalize-parameters.md`. Parse `parameters_path` if provided, else interview for `max_cards` (default 5), `novelty_range` (default `moderate`), `taboo_areas`, `allow_soft_canon_only` (default `false`). Parameters are search-space constraints, not content directives.

3. **Phase 1: Load and Parse Artifact — Claim Extraction.** Load `references/phase-1-claim-extraction.md`. Read artifact body prose as PRIMARY source; construct a unified claim ledger with one row per distinct factual assertion at independent-assertion granularity (a sentence with two independent claims produces two rows). For each claim record: verbatim or paraphrased prose with citation, narrator stance (asserted / hedged / conditional / rhetorical), frontmatter tag hint if present (HINT only, not override). Prose-primary discipline is load-bearing — Phase 6d.1 assumes prose-extracted narrator stance.

4. **Phases 2-5: Classify / Map / Score / Reject.** Load `references/phases-2-5-classify-score-reject.md`. Classify each claim into five buckets (grounded / partially_grounded / not_addressed / contradicts / extends-soft) by grounding against atomic records — drive grounding via `search_nodes(node_type='canon_fact', filters={domain: ...})` per claim's apparent domain, `get_record` on cited CF / INV / M / OQ ids, `find_named_entities` for any named entity the claim asserts about. Route `contradicts` and `extends-soft` to the flagged-contradictions list (each entry citing the specific conflicting CF or invariant id, with continuity-audit handoff prose). Carry `not_addressed` forward through narrator-reliability mapping (Phase 3); score on 8 dimensions with aggregate threshold +6 (Phase 4); apply 12 rejection triggers (R1-R9 + R10 mere texture + R11 grounded with R11-partial subvariant + R12 invariant revision); keep top `max_cards`; log every rejection with trigger id + rationale. After Phase 5 settles, allocate one `PR-NNNN` per surviving card via `mcp__worldloom__allocate_next_id(world_slug, 'PR')`.

5. **Phase 6: Canon Safety Check.** Load `references/phase-6-canon-safety-check.md`. Run five sub-checks against atomic-record world state — 6a Per-card Invariant Conformance (consult every INV in the packet via `get_record` if not already loaded), 6b Per-card Mystery Reserve Firewall (consult every M record; expand via `search_nodes(node_type='mystery_record')` if a card implicates an M not in the packet), 6c Per-card Distribution Discipline (`recommended_scope` + `why_not_universal` with rumor carve-out; consult capability CFs via `search_nodes(node_type='canon_fact', filters={domain: ...})`), 6d Per-card Diegetic-to-World Laundering Firewall (6d.1 three-pathway evidence-breadth + 6d.2 epistemic-horizon + 6d.3 MR positional), 6e Batch-level Check (joint-closure + mutual-contradiction + single-narrator concentration). Any fail triggers Phase 6f Repair Sub-Pass (narrow / reclassify / add stabilizer / drop / unrepairable-loop capped at 2 attempts). Repairs land in the card's `notes` as `Phase 6f repair: <check-id> — <repair-type> — <justification>`.

6. **Phase 7: Validation Tests.** Load `references/phases-7-8-validate-and-commit.md`. Run all 11 tests (7 per-card + 4 batch-level). Record each as PASS / FAIL with a one-line rationale into the batch manifest. A PASS without rationale is treated as FAIL. T8 classification-accounting enforces tolerance by batch size (≤ 50 claims: exact enumeration; 51-150: rejection-log + count-check; > 150: ±5%). Any FAIL halts and loops to the responsible phase.

7. **Phase 8: Commit.** Load `references/phases-7-8-validate-and-commit.md` for the deliverable-summary structure (9 sections: claim extraction trace, Phase 2 classification counts, Phase 5 rejection-trigger log, flagged-contradictions list, surviving cards' full content, per-card Canon Safety Check trace, batch-level 6e trace, any 6f repairs, target write paths). **HARD-GATE fires here.** User response maps to approve-as-is / approve-with-drops / revise / reject per the response-mapping table. On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity:

   1. **Each non-dropped card first**: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` via direct `Write`. Set `source_basis.user_approved: true` immediately before each card's write. `user_approved: true` here means "kept in batch after review", NOT "canonized".
   2. **Batch manifest second**: `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` via direct `Write` with `dropped_card_ids` populated, `flagged_contradictions` populated, `mr_positional_flags` populated (if any), and `user_approved: true`. Empty batches still write the manifest with `card_ids: []`. Create `batches/` if absent.
   3. **INDEX.md last**: `Read` existing file (create with header `# Proposal Cards — <World-Slug-TitleCased>` followed by a blank line if absent), append one line per non-dropped card (or one empty-batch line for `card_ids: []`), sort by PR-NNNN ascending, write back via direct `Edit`.

   All three paths sit under `worlds/<slug>/proposals/`, which Hook 3's hybrid-file allowlist permits for direct `Write` / `Edit`. Cards-first sequencing means a partial-failure state has either cards-without-index (detectable by grepping INDEX.md for card slugs) or a manifest-without-INDEX-row (detectable by grepping INDEX.md for the batch). **Recovery is manual.**

   Report all written paths. Do NOT commit to git.

## Canon Alignment

For Validation Rules this skill upholds (Rules 2, 3, 4, 5, 7), Record Schemas (proposal card + batch manifest frontmatter), and the full FOUNDATIONS Alignment table, load `references/canon-rules-and-foundations.md`.

## Guardrails

- **Single world + single artifact per invocation.** Never creates a new world (`create-base-world` does that), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- **No canon writes; no artifact writes.** Direct `Edit`/`Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. WORLD_KERNEL.md and ONTOLOGY.md are not in this skill's mutation surface. The source artifact and all other `diegetic-artifacts/` files are read-only — re-interpreting an artifact's voice is a candidate for `canon-addition`'s adjudication, not a reason to patch the artifact. All writes are confined to `worlds/<slug>/proposals/` (cards, `batches/`, INDEX.md) — Hook 3's hybrid-file allowlist permits these.
- **Diegetic-to-world laundering firewall is load-bearing.** Only claims classified as `world_level` may become candidate proposal cards; `narrator_belief` / `propagandistic` / `unreliable` claims are excluded with a one-line rationale logged in the Phase 5 rejection log (R10 / R11 / R12 as applicable) or the Phase 6d trace. Every surviving card carries `source_basis.derived_from: [DA-NNNN]` attribution. A future maintainer must not weaken Phase 1 toward frontmatter-primary — Phase 6d.1 evidence-breadth assumes claims were extracted from prose with narrator-stance tags set from prose observation.
- **Contradictions never become silent proposal cards.** Claims classified as `contradicts` or `extends-soft` route to the manifest's `flagged_contradictions` list with continuity-audit handoff prose; the three-way separation (mine here / audit at `continuity-audit` / adjudicate at `canon-addition`) is load-bearing and must not be collapsed.
- **Proposals are not canon.** Every emitted card is a candidate for `canon-addition`'s separate adjudication. A card's existence on disk is NOT equivalent to accepted canon. `source_basis.user_approved: true` means "kept in batch after review", NOT canonized.
- **ID-collision abort.** If `allocate_next_id` errors or the resulting `PR-NNNN-<slug>.md` would collide with an existing file, abort and ask the user to resolve before retrying. Never overwrite an existing card, batch manifest, or INDEX row. An artifact can legitimately be re-mined — each mining run is a fresh batch.
- **Empty batches are diagnostic records, not failures.** An artifact that implies zero canonizable facts produces an empty-batch manifest documenting the examination. Filling an empty batch by lowering score thresholds or weakening rejection triggers is forbidden — it would hide diagnostic information about the artifact's canon density.
- **Phase 6d.3 MR positional flags are author-level, not just card-level.** A flag in `mr_positional_flags` warns that mining OTHER artifacts from the same author warrants elevated 6d.3 scrutiny. The pre-flight prior-batch positional-flag scan (`references/preflight-and-prerequisites.md` step 8) is the discovery mechanism that surfaces prior flags into the current run's deliverable summary. A future maintainer must not weaken 6d.3 to card-level-only.
- **HARD-GATE absoluteness.** Auto Mode does not relax the gate — invocation is not deliverable approval. Empty-batch manifests are still gated.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A mining batch is not written until every surviving card has a `source_artifact_id` binding, `source_basis.derived_from: [DA-NNNN]` attribution, a `recommended_scope` with either `why_not_universal` populated or `social: rumor` declared, both orders of consequences, a complete Mystery Reserve firewall audit, an invariant-conformance trace, and a Diegetic-to-World laundering audit covering 6d.1 three-pathway evidence-breadth, 6d.2 epistemic-horizon, and 6d.3 MR positional sub-tests; the batch has a claim extraction trace, a classification accounting summing across all five buckets, a Phase 5 rejection log with per-rejection trigger ids, a flagged-contradictions list with continuity-audit handoff prose per entry, and a 6e batch-level trace covering joint-closure / mutual-contradiction / single-narrator concentration; and the user has approved the complete deliverable — and once written, each card is a candidate for `canon-addition`'s separate adjudication, not canon itself, while flagged contradictions await `continuity-audit`'s separate retcon adjudication.
