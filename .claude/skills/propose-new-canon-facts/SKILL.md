---
name: propose-new-canon-facts
description: "Use when generating candidate canon facts to enrich an existing worldloom world — proposal batches covering thinness gaps, institutional adaptations, contested knowledge, mystery seeds, and cross-domain couplings. Produces: proposal cards at worlds/<world-slug>/proposals/PR-NNNN-<slug>.md + batch manifest at worlds/<world-slug>/proposals/batches/BATCH-NNNN.md + auto-updated proposals/INDEX.md. Mutates: only worlds/<world-slug>/proposals/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, or any other world-level canon file). Each emitted card's path is directly consumable as canon-addition's proposal_path."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, MAGIC_OR_TECH_SYSTEMS.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, OPEN_QUESTIONS.md, MYSTERY_RESERVE.md) is unreadable."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: desired enrichment type(s) from {darker, stranger, more_political, more_local_texture, more_danger, more_religious_depth, more_economic_realism, more_archaeology, more_species_differentiation, more_travel_texture}; taboo areas to avoid; desired novelty range (conservative / moderate / bold); desired number of proposals (default 7, covering all diversification categories); optional upstream_audit_path pointing to a continuity-audit report or weakness dossier. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Propose New Canon Facts

Generates a diversified batch of candidate canon-fact proposal cards for an existing worldloom world: reads all 12 world files + FOUNDATIONS, diagnoses thinness/overstability/overcomplexity, targets enrichment categories, generates seeds from world pressure points, scores and filters against FOUNDATIONS Rules 2/3/4/5/7, diversifies the batch, runs a Canon Safety Check firewall (invariants + Mystery Reserve + distribution discipline) on each card, and writes a batch of option cards whose paths are directly consumable by `canon-addition` for separate adjudication. These cards are **not canon** — they are candidates for the user to review, select, and submit to `canon-addition`.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update — until: (a) pre-flight check confirms worlds/<world-slug>/ exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable, and no batch manifest or card-slug collision would occur; (b) Phase 7 Canon Safety Check passes for every card in the batch with zero unrepaired violations across invariant conformance, Mystery Reserve firewall, and distribution discipline; (c) Phase 8 Validation and Rejection Tests pass with zero failures at both per-card and batch levels; (d) the user has explicitly approved the Phase 9 deliverable summary (full batch: diagnosis trace, diversification audit, every card's full content, every card's Canon Safety Check trace, any Phase 7d repairs that fired, any cards the user is dropping). The user's approval response may include a drop-list of card-IDs to exclude from the write; dropped cards are never written and are recorded in the batch manifest's `dropped_card_ids`. This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (resolve worlds/<world-slug>/; verify all 13 mandatory
                  files readable — docs/FOUNDATIONS.md + 12 world files;
                  allocate next BATCH-NNNN and PR-NNNN range;
                  scan proposals/ for slug-collision risk)
      |
      v
Phase 0: Normalize Generation Parameters (parse parameters_path OR interview;
          bind enrichment types, taboo areas, novelty range, batch size;
          ingest upstream_audit_path if provided)
      |
      v
Phase 1: Diagnose the Current World (thinness / overstability / overcomplexity
          scan across all 12 world files; produce diagnosis dossier with
          concrete cited weaknesses per domain)
      |
      v
Phase 2: Identify Enrichment Targets (select categories A-J + Proposal
          Families 1-10 that address diagnosis + honor user parameters
          + avoid taboo areas)
      |
      v
Phase 3: Generate Proposal Seeds (seeds from world pressure points;
          prefer multi-fact connections over disconnected novelty)
      |
      v
Phase 4: Score Each Proposal (8 dimensions 1-5:
          coherence / propagation / story_yield / distinctiveness /
          ordinary_life_relevance / mystery_preservation /
          integration_burden / redundancy_risk)
      |
      v
Phase 5: Filter Out Bad Proposals (9 rejection triggers;
          each rejection cited with trigger)
      |
      v
Phase 6: Diversify the Batch (ensure coverage of 7 Phase-5 slots;
          fill under-represented, prune over-represented)
      |
      v
Phase 7: Canon Safety Check
         7a: Per-card Invariant Conformance   (vs INVARIANTS.md)
         7b: Per-card Mystery Reserve firewall (vs MYSTERY_RESERVE.md)
         7c: Per-card Distribution Discipline  (recommended_scope +
                                                why_not_universal)
         7d: Batch-level Light Check           (no two cards jointly
                                                close one mystery;
                                                no mutual contradictions)
         --any fail--> Phase 7e Repair Sub-Pass
                       (narrow / reclassify as contested / add cost /
                        drop card from batch /
                        --unrepairable--> loop to Phase 3 with
                        flagged seed to regenerate)
      |
      v
Phase 8: Validation and Rejection Tests (per-card + batch-level;
          any FAIL halts and loops to responsible phase)
      |
    pass
      |
      v
Phase 9: Commit (HARD-GATE approval with drop-list --> atomic write of
          surviving cards + BATCH-NNNN.md manifest + INDEX.md update)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists and all 13 mandatory files are readable.

### Optional
- `parameters_path` — filesystem path — markdown file declaring: desired enrichment type(s) from the 10-value taxonomy; taboo areas to avoid (free-form); desired novelty range (`conservative` / `moderate` / `bold`); desired number of proposals (default 7); optional `upstream_audit_path` pointing to a continuity-audit report or weakness dossier whose findings short-circuit Phase 1's thinness scan. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

- **Proposal cards** at `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` — one file per surviving card, hybrid YAML frontmatter + markdown body. Each card's filesystem path is directly consumable as `canon-addition`'s `proposal_path` argument. Matches `templates/proposal-card.md`.
- **Batch manifest** at `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` — hybrid YAML frontmatter (`batch_id`, `world_slug`, `generated_date`, `parameters`, `diagnosis_summary`, `card_ids`, `dropped_card_ids`, `user_approved`) + markdown body (diagnosis prose, Phase-6 diversification audit, Phase 7d batch-level check trace). Matches `templates/batch-manifest.md`.
- **INDEX.md update** at `worlds/<world-slug>/proposals/INDEX.md` — one line per non-dropped card in the form `- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / <enrichment_category>, batch BATCH-NNNN`, sorted by PR-NNNN ascending. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. No Canon Fact Record emitted. No Change Log Entry emitted. Each card is a *candidate*; canonization happens only when `canon-addition` accepts it in a separate run.

## Procedure

1. **Pre-flight Check.** Verify `worlds/<world-slug>/` exists, all 13 mandatory files are readable; load FOUNDATIONS + 12 world files (with the CANON_LEDGER selective-read pattern if size warning triggers); allocate `next_batch_id` and `next_pr_id` by scanning for existing frontmatter IDs; read existing INDEX.md if present. Load `references/preflight-and-prerequisites.md`.

2. **Phase 0: Normalize Generation Parameters.** Parse `parameters_path` or interview for `batch_size`, `novelty_range`, `enrichment_types`, `taboo_areas`, `upstream_audit_path`; load upstream audit into context if provided; reject attempts to dictate specific facts (parameters are search-space, not content). Load `references/phase-0-normalize-parameters.md`.

3. **Phases 1-2: Diagnose and Target.** Run thinness (12 indicators), overstability (6 indicators), and overcomplexity (4 indicators) scans across the 12 world files producing a ranked diagnosis dossier (Phase 1); map each `high`-value finding to enrichment categories A-J and Proposal Families 1-10, honoring user parameters and the user-label → A-J mapping table (Phase 2). Load `references/phases-1-2-diagnose-and-target.md`.

4. **Phases 3-6: Generate / Score / Filter / Diversify.** Generate 1-3 seeds per target using the 8 seed-generation prompts (Phase 3); score each seed on 8 dimensions 1-5 with aggregate threshold +6 (Phase 4); apply the 9 rejection triggers with rejection logged to batch manifest (Phase 5); fill the 7 Phase-6 slots honoring fill-strategy-by-batch-size, leaving empty slots as diagnostic signals (Phase 6). Load `references/phases-3-6-generate-score-filter-diversify.md`.

5. **Phase 7: Canon Safety Check.** Run four independent sub-checks — 7a Per-card Invariant Conformance (with `invariant_revision` exception), 7b Per-card Mystery Reserve Firewall (with inverted check for Family J Mystery Seeding cards), 7c Per-card Distribution Discipline (`recommended_scope` + `why_not_universal` with rumor carve-out), 7d Batch-level Light Check (joint-closure + direct contradiction + diagnosis redundancy). Any fail triggers Phase 7e Repair Sub-Pass (narrow / reclassify / add stabilizer / drop / batch-wide regenerate). Load `references/phase-7-canon-safety-check.md`.

6. **Phase 8: Validation and Rejection Tests.** Run all 10 tests (6 per-card + 4 batch-level), each recorded as PASS/FAIL with one-line rationale in the batch manifest Canon Safety Check Trace. A PASS without rationale is treated as FAIL. Any FAIL halts and loops to the responsible phase. Load `references/phase-8-validation-tests.md`.

7. **Phase 9: Commit.** Present the deliverable summary to the user:
   1. Full batch: every surviving card's frontmatter + body
   2. Batch manifest: diagnosis dossier, Phase-6 diversification audit, Phase 7d check trace, Phase 5 rejected-seed log, Phase 7e repair log
   3. Canon Safety Check Trace (10 Phase-8 test results with rationales)
   4. Target write paths: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` (per card), `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md`, `worlds/<world-slug>/proposals/INDEX.md`

   **HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve as-is, (b) approve with a drop-list of card-IDs to exclude, (c) request specific revisions (loop to named phase), (d) reject and abort.

   ### Drop-list behavior

   If the user's Phase 9 approval includes a drop-list:

   - **Surviving cards retain their originally-allocated PR-NNNN IDs**. No renumbering. Dropped PR-NNNN IDs become permanent gaps in the monotonic sequence — pre-flight on the next batch scans existing cards for `highest_pr`, adds 1, and does not reuse the dropped IDs. Retention preserves audit-trail traceability between Phase 3 seeds, Phase 4/5/7 traces, and the manifest's `dropped_card_ids` entries; renumbering would break cross-references inside the manifest body.
   - **Slots formerly filled by dropped cards become empty in the Phase 6 Diversification Audit** table of the written manifest, with `user-drop at Phase 9` cited as the rationale. No regeneration fires; empty-slot discipline (see Guardrails §Empty slots in a batch are features, not bugs) applies. The empty slot is a diagnostic signal that the user chose to defer that enrichment slot for this batch — a future batch or a targeted single-card run can fill it if desired.
   - **Phase 7d trace in the written manifest covers all card-pairs tested at generation time, including pairs involving dropped cards**. Dropped-pair results are retained as audit evidence that the full batch passed 7d before the drop-list was applied. The manifest may additionally present a surviving-pair sub-trace for quick reading, but the full trace is the proof-of-work.
   - **Phase 5 Rejected-Seed Log is not affected by drops**. Drops are editorial selection at Phase 9, not Phase 5 rejection. The `dropped_card_ids` frontmatter field is the audit trail for drops; the `Phase 5 Rejected-Seed Log` remains the audit trail for generation-time rejections. Do not merge the two.

   On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity, and a deterministic order makes partial-state recovery tractable:

   1. **Each non-dropped card first**: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md`. Set `source_basis.user_approved: true` on each card immediately before its write. This is the moment of card commitment; a card's `user_approved: true` means it was reviewed and kept in the batch, NOT that it has been accepted as canon.
   2. **Batch manifest second**: `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` with `dropped_card_ids` populated from the user's drop-list and `user_approved: true`. Create the `batches/` directory if absent.
   3. **INDEX.md last**: read existing file (create with header `# Proposal Cards — <World-Slug-TitleCased>` followed by a blank line if absent), append one line per non-dropped card in the form `- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / <enrichment_category>, batch BATCH-NNNN`, sort by PR-NNNN ascending, write back.

   Cards-first sequencing means a partial-failure state has either cards-without-index (detectable by grepping INDEX.md for card slugs) or a manifest-without-INDEX-row (detectable by grepping INDEX.md for the batch). **Recovery is manual**, not automatic: either manually update INDEX.md to add missing rows, or delete the orphaned files and re-run the skill with the same parameters (which allocates fresh IDs).

   Report all written paths. Do NOT commit to git.

## Canon Alignment

For Validation Rules this skill upholds (Rules 2, 3, 4, 5, 7), Record Schemas (proposal card + batch manifest frontmatter), and the full FOUNDATIONS Alignment table, load `references/canon-rules-and-foundations.md`.

## Guardrails

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- This skill **never writes to world-level canon files** — not `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. All writes are confined to `worlds/<world-slug>/proposals/` (card files, `batches/` subdirectory, and `INDEX.md`).
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `parameters_path` / `upstream_audit_path`. Repo-root writes are forbidden.
- This skill **proposes candidates; it does not canonize them**. Every emitted card is a candidate for `canon-addition`'s separate adjudication. A card's existence on disk is NOT equivalent to accepted canon. Downstream users (both human and other skills) must verify a proposal card's `source_basis.user_approved: true` refers to *review approval for inclusion in the batch*, not to canon acceptance.
- If a pre-flight `next_batch_id`, `next_pr_id`, or `<slug>.md` would collide with an existing file, the skill aborts. Never overwrite an existing card, batch manifest, or INDEX row. Once written, a card is treated as existing proposal state; re-running with the same parameters produces a new `BATCH-NNNN` and new `PR-NNNN` IDs.
- **Interop seam with `canon-addition` is one-way, deliberate, and card-level**: this skill produces candidate cards; `canon-addition` consumes one card at a time (via `proposal_path`). This skill does not batch-submit cards to `canon-addition`, does not assume adjudication will succeed, and does not update its cards after adjudication. Adjudication outcomes are `canon-addition`'s territory; stale cards are the operator's cleanup concern, not this skill's.
- **Interop with future `continuity-audit` skill** is structural: `parameters_path` may declare an `upstream_audit_path` pointing to the audit report. If that sibling lands and changes its output format, this skill's Phase 1 merge logic adapts; the argument surface does not change.
- Phase 7b (per-card Mystery Reserve firewall) and Phase 7d (batch-level joint-closure check) are the two Rule 7 enforcement points. A future maintainer adding a phase that exposes cards to Mystery Reserve content between Phase 6 and Phase 8 must either extend both checks or explicitly classify the phase as out-of-scope for Rule 7 (documented in the batch manifest notes).
- **Empty slots in a batch are features, not bugs**. Phase 6's empty-slot discipline surfaces diagnostic signals about the world; the HARD-GATE deliverable summary names empty slots explicitly. Filling a slot with a lower-scoring card just to avoid the empty state is forbidden — that would hide diagnosis information the user needs.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root (so `worlds/<slug>/proposals/` is under the worktree, not the main repo).
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- The HARD-GATE at the top of this file is absolute. No `Write` or `Edit` to `worlds/<world-slug>/proposals/` until Phase 7 Canon Safety Check passes clean, Phase 8 validation tests pass clean, AND the user approves the Phase 9 deliverable summary (including any drop-list). Auto Mode does not override this — skill invocation is not deliverable approval.

## Final Rule

A proposal batch is not written until every card has a `recommended_scope`, a `why_not_universal` (or explicit rumor scope), both orders of consequences, a complete Mystery Reserve firewall audit, and an invariant-conformance trace; the batch has a diagnosis dossier, a diversification audit, and a batch-level collision trace; and the user has approved the complete deliverable — and once written, each card is a candidate for `canon-addition`'s separate adjudication, not canon itself.
