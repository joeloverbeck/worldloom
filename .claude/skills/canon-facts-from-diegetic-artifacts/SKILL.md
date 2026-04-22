---
name: canon-facts-from-diegetic-artifacts
description: "Use when mining candidate canon facts from a specific diegetic artifact in an existing worldloom world — extracting implied world details the author treats as given, with an explicit Diegetic-to-World laundering firewall preventing narrator-voice claims from being inflated into world-level canon. Produces: proposal cards at worlds/<world-slug>/proposals/PR-NNNN-<slug>.md + batch manifest at worlds/<world-slug>/proposals/batches/BATCH-NNNN.md + auto-updated proposals/INDEX.md. Contradictions with existing canon are NOT emitted as cards — they are segregated into a flagged-contradictions list and handed off to continuity-audit. Mutates: only worlds/<world-slug>/proposals/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, or any other world-level canon file). Each emitted card's path is directly consumable as canon-addition's proposal_path."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, MAGIC_OR_TECH_SYSTEMS.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, OPEN_QUESTIONS.md, MYSTERY_RESERVE.md) is unreadable."
    required: true
  - name: artifact_path
    description: "Path to a diegetic artifact file. MUST resolve inside worlds/<world-slug>/diegetic-artifacts/ — cross-world, out-of-tree, or repo-root paths are rejected at pre-flight. Both diegetic-artifact-generation-generated artifacts (with machine-readable frontmatter claim tags) and hand-authored artifacts (with sparse or missing tags) are supported; Phase 1 re-derives claims from prose as primary and consults any frontmatter tags as hints."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: max_cards (default 5, override with any integer ≥0); taboo_areas (free-form); novelty_range (conservative / moderate / bold); allow_soft_canon_only (boolean; demotes all surviving hard_canon proposals to soft_canon). If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Canon Facts From Diegetic Artifacts

Mines an existing diegetic artifact in a worldloom world for candidate canon facts: extracts every factual claim from the artifact prose (consulting frontmatter tags as hints), classifies each claim against existing canon (including a `partially_grounded` bucket for below-threshold novelty), segregates contradictions into a flagged list for `continuity-audit` handoff, filters out texture and grounded claims, maps surviving candidates to `proposed_status` via a narrator-reliability rubric, scores and caps the batch, runs a five-layer Canon Safety Check culminating in a three-pathway Diegetic-to-World laundering firewall (full-support / partial / sole-source), and writes candidate proposal cards whose paths are directly consumable by `canon-addition` for separate adjudication. These cards are **not canon** — they are candidates for the user to review, select, and submit to `canon-addition`.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update — until: (a) pre-flight check confirms worlds/<world-slug>/ exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are reachable, artifact_path resolves inside worlds/<world-slug>/diegetic-artifacts/ AND that file is readable, and no batch manifest or card-slug collision would occur; (b) Phase 6 Canon Safety Check passes for every surviving card with zero unrepaired violations across 6a invariant conformance, 6b Mystery Reserve firewall, 6c distribution discipline, 6d Diegetic-to-World laundering (evidence-breadth three-pathway + epistemic-horizon + MR positional sub-tests), and 6e batch-level check (joint-closure + mutual-contradiction + single-narrator concentration); (c) Phase 7 Validation and Rejection Tests pass with zero failures at both per-card and batch levels; (d) the user has explicitly approved the Phase 8 deliverable summary (claim extraction trace from the artifact, Phase 2 classification counts, Phase 5 rejection-trigger log, flagged-contradictions list routed to continuity-audit, every surviving card's full content, every card's Canon Safety Check trace, any Phase 6f repairs that fired, any cards the user is dropping). The user's approval response may include a drop-list of card-IDs to exclude from the write; dropped cards are never written and are recorded in the batch manifest's `dropped_card_ids`. The HARD-GATE also fires for empty batches (zero surviving cards) — the batch manifest still writes as a diagnostic record with `card_ids: []`, and user approval is still required before that write. This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (resolve worlds/<world-slug>/; verify all 13 mandatory
                  files reachable; verify artifact_path resolves inside
                  worlds/<world-slug>/diegetic-artifacts/ and is readable;
                  allocate next BATCH-NNNN and PR-NNNN range;
                  scan proposals/ for slug-collision risk)
      |
      v
Phase 0: Normalize Mining Parameters (parse parameters_path OR interview;
          bind max_cards cap [default 5], novelty_range, taboo_areas,
          allow_soft_canon_only flag)
      |
      v
Phase 1: Load and Parse Artifact (read artifact body; extract every
          factual claim from prose as PRIMARY at independent-assertion
          granularity; consult frontmatter claim tags as HINTS only;
          build unified claim ledger)
      |
      v
Phase 2: Classify Claims vs Existing Canon
          - grounded            --> discard silently
          - partially_grounded  --> discard silently (R11-partial)
          - not_addressed       --> carry forward as candidate
          - contradicts         --> flagged-contradictions list
          - extends-soft        --> flagged-contradictions list
      |
      v
Phase 3: Proposed Status Mapping (narrator-reliability table per claim;
          allow_soft_canon_only override if set)
      |
      v
Phase 4: Score Each Candidate (8 dimensions 1-5, aggregate threshold +6)
      |
      v
Phase 5: Apply Rejection Triggers + Cap (R1-R12; rank by score; keep
          top max_cards; log all rejections with trigger)
      |
      v
Phase 6: Canon Safety Check
         6a: Per-card Invariant Conformance     (vs INVARIANTS.md)
         6b: Per-card Mystery Reserve firewall  (vs MYSTERY_RESERVE.md)
         6c: Per-card Distribution Discipline   (recommended_scope +
                                                 why_not_universal)
         6d: Per-card Diegetic-to-World Laundering Firewall
              6d.1 Evidence-breadth test (three pathways:
                   full-support / partial / sole-source)
              6d.2 Epistemic-horizon test
              6d.3 MR positional check
         6e: Batch-level Check (joint-closure + mutual-contradiction +
                                single-narrator concentration)
         --any fail--> Phase 6f Repair Sub-Pass
                       (narrow / reclassify / add stabilizer / drop /
                        --unrepairable--> loop to Phase 3; after 2
                        loop attempts unrepairable candidates become
                        drop-only)
      |
      v
Phase 7: Validation and Rejection Tests (11 tests: 7 per-card + 4 batch;
          any FAIL halts and loops to responsible phase)
      |
    pass
      |
      v
Phase 8: Commit (HARD-GATE approval with drop-list --> atomic write of
          surviving cards + BATCH-NNNN.md manifest + INDEX.md update;
          empty batches [card_ids: []] write manifest only, still require
          HARD-GATE approval, still add INDEX row)
```

## Inputs

### Required

- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists and all 13 mandatory files are reachable.
- `artifact_path` — filesystem path — must resolve inside `worlds/<world-slug>/diegetic-artifacts/` (cross-world / out-of-tree / repo-root paths rejected). The artifact's prose is the primary source; its frontmatter tags (if present) are consulted as hints.

### Optional

- `parameters_path` — filesystem path — markdown file declaring: `max_cards` (default 5; override with any integer ≥0); `taboo_areas` (free-form); `novelty_range` (`conservative` / `moderate` / `bold`); `allow_soft_canon_only` (boolean; demotes all surviving `hard_canon` proposals to `soft_canon`). If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

- **Proposal cards** at `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` — one file per surviving card, hybrid YAML frontmatter + markdown body. Each card's filesystem path is directly consumable as `canon-addition`'s `proposal_path` argument. Matches `templates/proposal-card.md`.
- **Batch manifest** at `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` — hybrid YAML frontmatter + markdown body. Matches `templates/batch-manifest.md`.
- **INDEX.md update** at `worlds/<world-slug>/proposals/INDEX.md` — one line per non-dropped card in the form `- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / mined-from-<DA-NNNN>, batch BATCH-NNNN`, sorted by PR-NNNN ascending. For empty batches: `- BATCH-NNNN (empty — see manifest) — mined-from-<DA-NNNN>`. Created if absent. The `mined-from-DA-NNNN` slot marks provenance and distinguishes visually from sibling `propose-new-canon-facts` entries that carry an enrichment-category-letter in the same slot — both conventions are valid and signal source-skill provenance in a shared INDEX.md.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. No Canon Fact Record emitted. No Change Log Entry emitted. No writes to the source artifact or any other `diegetic-artifacts/` file.

## Procedure

1. **Pre-flight Check.** Verify `worlds/<world-slug>/` exists and all 13 mandatory files are reachable; verify `artifact_path` resolves inside `worlds/<world-slug>/diegetic-artifacts/` and that file is readable; parse artifact frontmatter (or filename) to extract DA-NNNN id for `source_artifact_id` binding; load FOUNDATIONS + all 13 world files (selective-read pattern for oversize files — "readable" means reachable + permissioned, full content loads as Phase 2 needs it) + the source artifact; allocate `next_batch_id` and `next_pr_id` by scanning existing frontmatter; read existing INDEX.md if present. Load `references/preflight-and-prerequisites.md`.

2. **Phase 0: Normalize Mining Parameters.** Parse `parameters_path` if provided; otherwise interview user for `max_cards` (default 5), `novelty_range` (default `moderate`), `taboo_areas`, and `allow_soft_canon_only` (default `false`). Parameters are search-space constraints, not content directives. Load `references/phase-0-normalize-parameters.md`.

3. **Phase 1: Load and Parse Artifact — Claim Extraction.** Read artifact body prose as PRIMARY source; construct a unified claim ledger with one row per distinct factual assertion found in prose at independent-assertion granularity (a sentence with two independent claims produces two rows). For each claim record: verbatim or paraphrased prose with citation, narrator stance (asserted / hedged / conditional / rhetorical), frontmatter tag hint if present (HINT only, not override). Prose-primary discipline is load-bearing — Phase 6d.1 assumes prose-extracted narrator stance. Load `references/phase-1-claim-extraction.md`.

4. **Phases 2-5: Classify / Map / Score / Reject.** Classify each claim into five buckets (grounded / partially_grounded / not_addressed / contradicts / extends-soft); route `contradicts` and `extends-soft` to the flagged-contradictions list; carry `not_addressed` forward to narrator-reliability mapping (Phase 3); score candidates on 8 dimensions with aggregate threshold +6 (Phase 4); apply all 12 rejection triggers (R1-R9 from `propose-new-canon-facts` + R10 mere texture + R11 grounded [with R11-partial subvariant] + R12 invariant revision); keep top `max_cards`; log every rejection with trigger id + rationale. Load `references/phases-2-5-classify-score-reject.md`.

5. **Phase 6: Canon Safety Check.** Run five independent sub-checks — 6a Per-card Invariant Conformance (no `invariant_revision` exception), 6b Per-card Mystery Reserve Firewall (every MR id recorded), 6c Per-card Distribution Discipline (`recommended_scope` + `why_not_universal` with rumor carve-out), 6d Per-card Diegetic-to-World Laundering Firewall (6d.1 three-pathway evidence-breadth + 6d.2 epistemic-horizon + 6d.3 MR positional), 6e Batch-level Check (joint-closure + mutual-contradiction + single-narrator concentration). Any fail triggers Phase 6f Repair Sub-Pass (narrow / reclassify / add stabilizer / drop / unrepairable-loop capped at 2 attempts). Load `references/phase-6-canon-safety-check.md`.

6. **Phase 7: Validation and Rejection Tests.** Run all 11 tests (7 per-card + 4 batch-level), each recorded as PASS/FAIL with one-line rationale. A PASS without rationale is treated as FAIL. T8 classification-accounting enforces count fidelity with tolerance convention by batch size (≤ 50 claims: exact enumeration; 51-150: rejection-log + count-check; > 150: ±5% tolerance). Any FAIL halts and loops to the responsible phase. Load `references/phases-7-8-validate-and-commit.md`.

7. **Phase 8: Commit.** Present the deliverable summary to the user (9 sections). HARD-GATE fires here; user response maps to approve-as-is / approve-with-drops / revise / reject per the response-mapping table. On approval, atomic write: cards first, batch manifest second, INDEX.md last. Empty-batch writes the manifest only with `card_ids: []` plus an INDEX line. Load `references/phases-7-8-validate-and-commit.md`.

## Canon Alignment

For Validation Rules this skill upholds (Rules 2, 3, 4, 5, 7), Record Schemas (proposal card + batch manifest frontmatter), and the full FOUNDATIONS Alignment table, load `references/canon-rules-and-foundations.md`.

## Guardrails

- This skill operates on **exactly one existing world** per invocation and **exactly one existing diegetic artifact** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- This skill **never writes to world-level canon files** — not `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. All writes are confined to `worlds/<world-slug>/proposals/`.
- This skill **never writes to or modifies the source artifact** nor any other file under `worlds/<world-slug>/diegetic-artifacts/`. The source artifact is read-only evidence; mining it does not alter it. A card's claim that re-interprets the artifact's voice is a candidate for `canon-addition` to adjudicate, not a reason to patch the artifact itself.
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `artifact_path` / `parameters_path` (both pre-flight-validated to resolve inside the declared world). Repo-root writes are forbidden. Cross-world artifact paths are rejected at pre-flight.
- This skill **proposes candidates; it does not canonize them**. Every emitted card is a candidate for `canon-addition`'s separate adjudication. A card's existence on disk is NOT equivalent to accepted canon. Downstream users (both human and other skills) must verify a proposal card's `source_basis.user_approved: true` refers to *review approval for inclusion in the batch*, not to canon acceptance.
- **This skill does not emit retcons.** Claims classified at Phase 2 as `contradicts` or `extends-soft` are routed to the batch manifest's `flagged_contradictions` list with continuity-audit handoff prose, never emitted as cards. Retcon adjudication is `continuity-audit`'s authority; subsequent canon-level retcon application is `canon-addition`'s authority on a `continuity-audit`-emitted retcon proposal. The three-way separation (mine / audit / adjudicate) is load-bearing and must not be collapsed into this skill by a future maintainer.
- If pre-flight allocation of `next_batch_id`, `next_pr_id`, or `<slug>.md` would collide with an existing file, the skill aborts. Never overwrite an existing card, batch manifest, or INDEX row. Once written, a card is treated as existing proposal state; re-running with the same artifact produces a new `BATCH-NNNN` and new `PR-NNNN` IDs. An artifact can legitimately be re-mined (new world state since last mining may reveal new candidates); each mining run is a fresh batch.
- **Interop seam with `canon-addition` is one-way, deliberate, and card-level**: this skill produces candidate cards; `canon-addition` consumes one card at a time via `proposal_path`. This skill does not batch-submit cards to `canon-addition`, does not assume adjudication will succeed, and does not update its cards after adjudication.
- **Interop with `continuity-audit` is structural via the `flagged_contradictions` list in the batch manifest**: each entry names the specific CF or invariant the claim conflicts with, with handoff prose recommending `continuity-audit`. If `continuity-audit`'s input format evolves, this skill's Phase 2 classification logic adapts; the `flagged_contradictions` frontmatter field is the stable handoff contract.
- **Interop with `diegetic-artifact-generation` is consumption-only**: this skill reads artifacts that skill produces (or hand-authored artifacts with sparse frontmatter). The frontmatter claim tags are HINTS; prose remains primary. If `diegetic-artifact-generation`'s frontmatter schema evolves, Phase 1's hint-consultation logic adapts; prose-primary discipline ensures this skill does not break when hints are missing or wrong.
- **Phase 6d.3 MR positional check produces author-level warnings, not just card-level rejections.** If the batch manifest contains an `mr_positional_flags` entry, the user should weigh caution when mining OTHER artifacts from the same author — the positional vulnerability is a property of the author's world-position, not of the specific claim. A future maintainer must not weaken 6d.3 to card-level-only; the batch manifest's author-level flag is the signal that prevents serial mining of a single author from leaking MR answers across multiple batches. The pre-flight `Prior-batch positional-flag scan` step (see `references/preflight-and-prerequisites.md` §Pre-flight Check, step 8) is the discovery mechanism by which a future mining run on a different artifact by the same author surfaces prior flags to the Phase 8 deliverable summary.
- **Phase 1 prose-primacy is load-bearing.** If a future maintainer tilts Phase 1 toward frontmatter-primary (for speed or simplicity), Phase 6d.1 evidence-breadth silently loses effectiveness — because 6d.1 assumes claims were extracted from prose with narrator-stance tags set from prose observation, not copied from potentially-stale frontmatter. The prose-primary, tag-as-hint ordering must be preserved across refactors.
- **Empty batches are diagnostic records, not failures.** An artifact that implies zero canonizable facts produces an empty-batch manifest that documents the examination. Filling an empty batch by lowering score thresholds or weakening rejection triggers is forbidden — it would hide diagnostic information the user needs about the artifact's canon density.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root.
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- The HARD-GATE at the top of this file is absolute. No `Write` or `Edit` to `worlds/<world-slug>/proposals/` until Phase 6 Canon Safety Check passes clean, Phase 7 validation tests pass clean, AND the user approves the Phase 8 deliverable summary (including any drop-list, including empty-batch manifests). Auto Mode does not override this — skill invocation is not deliverable approval.

## Final Rule

A mining batch is not written until every surviving card has a `source_artifact_id` binding, a `recommended_scope` with either `why_not_universal` populated or `social: rumor` scope declared, both orders of consequences, a complete Mystery Reserve firewall audit covering every MR id (overlap or not), an invariant-conformance trace, and a Diegetic-to-World laundering audit covering three-pathway evidence-breadth, epistemic-horizon, and MR positional sub-tests; the batch has a claim extraction trace from the source artifact, a classification accounting that sums to the total claims extracted across five buckets, a Phase 5 rejection log with per-rejection trigger ids and rationales, a flagged-contradictions list with continuity-audit handoff prose per entry, and a batch-level CSC trace covering joint-closure, mutual-contradiction, and single-narrator concentration; and the user has approved the complete deliverable — and once written, each card is a candidate for `canon-addition`'s separate adjudication, not canon itself, while flagged contradictions await `continuity-audit`'s separate retcon adjudication.
