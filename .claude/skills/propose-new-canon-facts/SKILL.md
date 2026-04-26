---
name: propose-new-canon-facts
description: "Use when generating candidate canon facts to enrich an existing worldloom world — proposal batches covering thinness gaps, institutional adaptations, contested knowledge, mystery seeds, and cross-domain couplings. Produces: proposal cards at worlds/<world-slug>/proposals/PR-NNNN-<slug>.md + batch manifest at worlds/<world-slug>/proposals/batches/BATCH-NNNN.md + auto-updated proposals/INDEX.md. Mutates: only worlds/<world-slug>/proposals/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any _source/ atomic record). Each emitted card's path is directly consumable as canon-addition's proposal_path."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: desired enrichment type(s) from {darker, stranger, more_political, more_local_texture, more_danger, more_religious_depth, more_economic_realism, more_archaeology, more_species_differentiation, more_travel_texture}; taboo areas to avoid; desired novelty range (conservative / moderate / bold); desired number of proposals (default 7); optional upstream_audit_path pointing to a continuity-audit report. If omitted, Phase 0 interviews the user."
    required: false
---

# Propose New Canon Facts

Generates a diversified batch of candidate canon-fact proposal cards for an existing worldloom world. Pre-flight loads world state via `mcp__worldloom__get_context_packet(task_type='other', ...)` plus direct reads of FOUNDATIONS / WORLD_KERNEL / ONTOLOGY; diagnosis and seed generation pull atomic records on demand via `search_nodes` / `get_record`; surviving cards are written direct-Edit on hybrid files (proposals are NOT canon — Hook 3 hybrid-file allowlist permits the writes). Each emitted card's path is directly consumable as `canon-addition`'s `proposal_path` for separate adjudication.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update — until: (a) pre-flight resolves `worlds/<world-slug>/`, allocates the next `BATCH-NNNN` via `mcp__worldloom__allocate_next_id`, and loads the context packet plus FOUNDATIONS / WORLD_KERNEL / ONTOLOGY; (b) Phase 7 Canon Safety Check passes for every surviving card with zero unrepaired violations; (c) Phase 8 Validation Tests pass with zero failures at both per-card and batch levels; (d) the user has explicitly approved the Phase 9 deliverable summary (full batch + diagnosis dossier + diversification audit + Canon Safety Check Trace + any 7e repairs + any drops). The user's approval may include a drop-list of card-IDs to exclude; dropped cards are never written. This gate is absolute under Auto Mode — invoking the skill is not deliverable approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id BATCH; get_context_packet for world state;
            direct Read FOUNDATIONS + WORLD_KERNEL + ONTOLOGY)
      |
      v
Phase 0:    Normalize Generation Parameters (parse OR interview)
      |
      v
Phases 1-2: Diagnose (thinness/overstability/overcomplexity scans
            via search_nodes + get_record over atomic _source/ records);
            map to enrichment categories A-J + Proposal Families 1-10
      |
      v
Phases 3-6: Generate seeds; score (8 dimensions); filter (9 triggers);
            diversify across the 7 batch slots; allocate PR-NNNN per
            slot-filler via allocate_next_id
      |
      v
Phase 7:    Canon Safety Check
            7a Per-card Invariant Conformance (every INV record in packet)
            7b Per-card Mystery Reserve Firewall (every M record)
            7c Per-card Distribution Discipline
            7d Batch-level Light Check (joint-closure + contradictions)
            --any fail--> 7e Repair Sub-Pass (narrow / reclassify /
                          add stabilizer / drop / regenerate slot)
      |
      v
Phase 8:    Validation Tests (10 tests; PASS/FAIL with one-line rationale)
      |
      v
Phase 9:    HARD-GATE deliverable summary --> on approval, direct-Edit
            cards + batch manifest + INDEX.md (hybrid-file allowlist)
```

## Output

- **Proposal cards** at `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` — one hybrid YAML-frontmatter + markdown-body file per surviving card. Frontmatter shape per `templates/proposal-card.md`. Each card's filesystem path is directly consumable as `canon-addition`'s `proposal_path`.
- **Batch manifest** at `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` — hybrid file per `templates/batch-manifest.md`. Frontmatter carries `batch_id`, `world_slug`, `parameters`, `card_ids`, `dropped_card_ids`, `user_approved`. Body carries diagnosis dossier, seed log, score matrix, rejected-seed log, diversification audit, Phase 7d trace, Phase 7e repair log, Phase 8 test results.
- **INDEX.md update** at `worlds/<world-slug>/proposals/INDEX.md` — one line per non-dropped card, sorted by PR-NNNN ascending. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record. Hook 3 enforces. No CF, CH, INV, M, OQ, ENT, or SEC record is emitted. Each card is a *candidate*; canonization happens only when `canon-addition` accepts it in a separate run.

## World-State Prerequisites

`docs/FOUNDATIONS.md`, `worlds/<slug>/WORLD_KERNEL.md`, and `worlds/<slug>/ONTOLOGY.md` load via direct `Read` (primary-authored at the world root; not in `_source/`). The atomic-record world-state slice loads via `mcp__worldloom__get_context_packet(task_type='other', seed_nodes=[<diagnosis-anchor seeds>], token_budget=15000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. The `'other'` task type is the registered fallback — `propose_new_canon_facts` is not in the TASK_TYPES enum and adding it is out of scope for this skill rewrite. The packet returns Kernel concepts + invariants + named-entity neighbors + section context for the seed-local domains; it is the entry point, not the whole load.

For records the packet does not surface, retrieve on demand: `mcp__worldloom__get_record(record_id)` for a specific CF / CH / INV / M / OQ / ENT / SEC; `mcp__worldloom__search_nodes(node_type=..., filters=...)` for domain-filtered scans (e.g., capability CFs whose distribution touches the diagnosis cluster); `mcp__worldloom__get_neighbors(node_id)` for the relation graph around a resolved entity; `mcp__worldloom__find_named_entities(names)` to resolve names from the parameters_path or upstream audit. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first.

## Procedure

1. **Pre-flight.** Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Allocate the batch id: `mcp__worldloom__allocate_next_id(world_slug, 'BATCH')` → `BATCH-NNNN`. Load FOUNDATIONS + WORLD_KERNEL + ONTOLOGY via direct `Read`. Load the context packet per §World-State Prerequisites with seed_nodes derived from `parameters_path` or `upstream_audit_path` if present, otherwise from a small set of high-domain seed nodes representing the world's core pressures (named in WORLD_KERNEL). Load `references/preflight-and-prerequisites.md` for the abort matrix and selective-retrieval pattern.

2. **Phase 0: Normalize Generation Parameters.** Load `references/phase-0-normalize-parameters.md`. Parse `parameters_path` if provided, else interview for `batch_size`, `novelty_range`, `enrichment_types`, `taboo_areas`, `upstream_audit_path`. Reject attempts to dictate specific facts (parameters are search-space, not content). If `upstream_audit_path` is provided, retrieve any cited records via `get_record` for Phase 1.

3. **Phases 1-2: Diagnose and Target.** Load `references/phases-1-2-diagnose-and-target.md`. Run thinness (12 indicators) / overstability (6) / overcomplexity (4) scans across the world's atomic records — drive the scans via `search_nodes(node_type='section', filters={file_class: ...})` per concern (everyday-life, institutions, magic-or-tech-systems, geography, economy-and-resources, peoples-and-species, timeline) plus `search_nodes(node_type='canon_fact')` and `get_record` on cited M / OQ / INV / ENT records. Each finding cites the specific record id (e.g., `SEC-INS-007`, `CF-0042`, `M-0003`). Map each `high`-value finding to enrichment categories A-J + Proposal Families 1-10 honoring user parameters. If `upstream_audit_path` was loaded, merge its findings — do not re-scan domains already covered.

4. **Phases 3-6: Generate / Score / Filter / Diversify.** Load `references/phases-3-6-generate-score-filter-diversify.md`. Generate 1-3 seeds per target using the 8 seed-generation prompts (Phase 3). Score each on 8 dimensions 1-5 with aggregate threshold +6 (Phase 4). Apply the 9 rejection triggers (Phase 5; rejected seeds logged with trigger + diagnosis_finding_reference). Diversify across 7 slots honoring fill-strategy-by-batch-size and empty-slot discipline (Phase 6). After diversification settles, allocate one `PR-NNNN` per slot-filling seed via `mcp__worldloom__allocate_next_id(world_slug, 'PR')` and bind it to the card draft. Slot regeneration during Phase 7e reuses the same allocation pattern; dropped cards leave permanent PR-NNNN gaps.

5. **Phase 7: Canon Safety Check.** Load `references/phase-7-canon-safety-check.md`. Run four sub-checks against atomic-record world state — 7a Per-card Invariant Conformance (against every INV record in the packet; record each tested INV id into the card's `canon_safety_check.invariants_respected`), 7b Per-card Mystery Reserve Firewall (against every M record in the packet; inverted check for Family J seeding cards; `find_named_entities` and `get_record` to expand if a seed implicates an M entry not in the packet), 7c Per-card Distribution Discipline (`recommended_scope` + `why_not_universal` with rumor carve-out; consult capability CFs via `search_nodes(node_type='canon_fact', filters={domain: ...})`), 7d Batch-level Light Check (joint-closure + direct contradiction + diagnosis redundancy). Any fail triggers Phase 7e Repair Sub-Pass (narrow / reclassify / add stabilizer / drop / regenerate single slot). Repairs land in the card's `notes` field as `Phase 7e repair: <check-id> — <repair-type> — <justification>`.

6. **Phase 8: Validation Tests.** Load `references/phase-8-validation-tests.md`. Run all 10 tests (6 per-card + 4 batch-level). Record each as PASS / FAIL with a one-line rationale into the batch manifest's Phase 8 Test Results section. A PASS without rationale is treated as FAIL. Any FAIL halts and loops to the responsible phase.

7. **Phase 9: Commit.** Present the deliverable summary:
   1. Full batch: every surviving card's frontmatter + body
   2. Batch manifest: diagnosis dossier, diversification audit, Phase 7d trace, Phase 5 rejected-seed log, Phase 7e repair log
   3. Phase 8 Test Results (10 results with rationales)
   4. Target write paths (per card + batch manifest + INDEX.md)

   **HARD-GATE fires here.** No file is written until the user explicitly approves. User may (a) approve as-is, (b) approve with a drop-list of card-IDs to exclude, (c) request specific revisions (loop to named phase), (d) reject and abort.

   ### Drop-list behavior

   - **Surviving cards retain their originally-allocated `PR-NNNN` IDs.** No renumbering. Dropped IDs become permanent gaps; the next batch's `allocate_next_id` scans the indexed state for `highest_pr` and increments — gaps are not reused.
   - **Slots formerly filled by dropped cards become empty in the Phase 6 Diversification Audit table** of the written manifest, with `user-drop at Phase 9` cited as the rationale. Empty-slot discipline applies (see §Guardrails) — do NOT regenerate to fill the slot at this point; the empty slot is a diagnostic signal.
   - **Phase 7d trace in the written manifest covers all card-pairs tested at generation time, including pairs involving dropped cards.** Dropped-pair results are retained as audit evidence that the full batch passed 7d before the drop-list was applied.
   - **Phase 5 Rejected-Seed Log is not affected by drops.** Drops are editorial selection at Phase 9, not Phase 5 rejection. The `dropped_card_ids` frontmatter field is the audit trail for drops; the Phase 5 log remains the audit trail for generation-time rejections.

   On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity, and a deterministic order makes partial-state recovery tractable:

   1. **Each non-dropped card first**: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` via direct `Write`. Set `source_basis.user_approved: true` on each card immediately before its write. `user_approved: true` here means "kept in batch after review", NOT "canonized".
   2. **Batch manifest second**: `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` via direct `Write` with `dropped_card_ids` populated from the drop-list and `user_approved: true`. Create the `batches/` directory if absent.
   3. **INDEX.md last**: `Read` existing file (create with header `# Proposal Cards — <World-Slug-TitleCased>` followed by a blank line if absent), append one line per non-dropped card in the form `- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / <enrichment_category>, batch BATCH-NNNN`, sort by PR-NNNN ascending, write back via direct `Edit`.

   All three paths sit under `worlds/<slug>/proposals/`, which Hook 3's hybrid-file allowlist permits for direct `Write` / `Edit`. Cards-first sequencing means a partial-failure state has either cards-without-index (detectable by grepping INDEX.md for card slugs) or a manifest-without-INDEX-row (detectable by grepping INDEX.md for the batch). **Recovery is manual.**

   Report all written paths. Do NOT commit to git.

## Canon Alignment

For Validation Rules this skill upholds (Rules 2, 3, 4, 5, 7), Record Schemas (proposal card + batch manifest frontmatter), and the full FOUNDATIONS Alignment table, load `references/canon-rules-and-foundations.md`.

## Guardrails

- **Single world per invocation.** Never creates a new world (`create-base-world` does that), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- **No canon writes.** Direct `Edit`/`Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. WORLD_KERNEL.md and ONTOLOGY.md are not in this skill's mutation surface. All writes are confined to `worlds/<slug>/proposals/` (cards, `batches/`, INDEX.md) — Hook 3's hybrid-file allowlist permits these.
- **Proposals are not canon.** Every emitted card is a candidate for `canon-addition`'s separate adjudication. A card's existence on disk is NOT equivalent to accepted canon. Downstream consumers must verify a card's `source_basis.user_approved: true` refers to *review approval for inclusion in the batch*, not to canon acceptance.
- **ID-collision abort.** If `allocate_next_id` returns an error or the resulting `PR-NNNN-<slug>.md` would collide with an existing file (concurrent run), abort and ask the user to resolve before retrying. Never overwrite an existing card, batch manifest, or INDEX row.
- **Interop with `canon-addition` is one-way and card-level.** This skill produces candidate cards; `canon-addition` consumes one card at a time via `proposal_path`. This skill does not batch-submit, does not assume adjudication will succeed, and does not update its cards after adjudication. Stale cards are the operator's cleanup concern.
- **Phase 7b + Phase 7d are the two Rule 7 enforcement points.** A future maintainer adding a phase between Phase 6 and Phase 8 that exposes cards to Mystery Reserve content must either extend both checks or explicitly classify the phase as out-of-scope for Rule 7 (documented in the manifest notes).
- **Empty slots are features, not bugs.** Phase 6's empty-slot discipline surfaces diagnostic signals about the world; the HARD-GATE deliverable summary names empty slots explicitly. Filling a slot with a lower-scoring card just to avoid the empty state is forbidden.
- **HARD-GATE absoluteness.** Auto Mode does not relax the gate — invocation is not deliverable approval.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A proposal batch is not written until every card has a `recommended_scope`, a `why_not_universal` (or explicit rumor scope), both orders of consequences, a complete Mystery Reserve firewall audit, and an invariant-conformance trace; the batch has a diagnosis dossier, a diversification audit, and a batch-level collision trace; and the user has approved the complete deliverable — and once written, each card is a candidate for `canon-addition`'s separate adjudication, not canon itself.
