# Pre-flight and World-State Prerequisites

Load this reference when running the skill's pre-flight check and establishing the world-state context for all subsequent phases.

## Pre-flight Check

Verify the following before any mining work begins:

1. **Directory existence**: `worlds/<world-slug>/` exists.
2. **Mandatory files reachable**: all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files — WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, MAGIC_OR_TECH_SYSTEMS.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, OPEN_QUESTIONS.md, MYSTERY_RESERVE.md) are reachable on disk and readable by the invoking process.
3. **Artifact path resolution**: `artifact_path` resolves inside `worlds/<world-slug>/diegetic-artifacts/` and that file is reachable and readable.
4. **Source-artifact ID parse**: parse the artifact file's frontmatter (or filename, if frontmatter absent) to extract the DA-NNNN id; bind to `source_artifact_id` for all downstream card frontmatter.
5. **Load FOUNDATIONS + world files + artifact**: load FOUNDATIONS.md and the 13 world files into working context per the oversize-file protocol below; load the source artifact body.
6. **ID allocation**: allocate `next_batch_id` by scanning `worlds/<world-slug>/proposals/batches/` for existing BATCH-NNNN frontmatter; allocate `next_pr_id` by scanning `worlds/<world-slug>/proposals/` for existing PR-NNNN frontmatter. Never reuse a dropped ID.
7. **Existing INDEX read**: read `worlds/<world-slug>/proposals/INDEX.md` if present (for append at Phase 8).

## Oversize-File Protocol

"Readable" for pre-flight purposes means *reachable + permissioned on disk*, NOT *fully loaded into working context in one Read*. World files for mature worlds routinely exceed the Read tool's token limit (e.g., CANON_LEDGER.md with dozens of CFs, INSTITUTIONS.md when fully populated, EVERYDAY_LIFE.md with all five cluster registers).

When a mandatory file's first-read exceeds the Read tool's token limit:

- **Selective-read pattern**: use offset/limit to load sections as needed by downstream phases. CANON_LEDGER.md has a named selective-read pattern — scan `grep -n "^id: CF-"` to map CF-ids to line ranges, then Read the specific CFs Phase 2 classification needs.
- **Deferred loading**: a file's contents need not be fully in context at pre-flight — Phase 2 loads what it needs for classification, Phase 6a loads what INVARIANTS.md provides for invariant conformance, Phase 6c loads what INSTITUTIONS.md and GEOGRAPHY.md need for distribution-discipline reasoning. Pre-flight passes when each file is reachable and permissioned; Phase 2 onwards handles load-for-use.
- **Load-completeness discipline**: before Phase 2 begins classifying a claim that touches a specific CF or domain, the relevant section of the consulting file MUST be loaded. A Phase 2 classification made without loading the CF it hinges on is a latent classification error that T8 accounting cannot detect. Treat "load what's needed" as a per-claim obligation, not a one-shot pre-flight obligation.
- **Selectively-loaded files cited in the batch manifest**: if selective-loading was used for any mandatory file, cite the loaded sections in the batch manifest's `notes` field so a reviewer can reconstruct what was vs. was not in context during classification.

## ABORT Conditions

Pre-flight aborts (skill does not proceed to Phase 0) when any of the following hold:

- World directory `worlds/<world-slug>/` is missing.
- Any of the 13 mandatory files is unreachable (missing from disk) or unpermissioned (cannot be read).
- `artifact_path` resolves outside `worlds/<world-slug>/diegetic-artifacts/` or outside the declared `world_slug` (cross-world, out-of-tree, or repo-root paths are rejected).
- Source artifact file is unreachable or unreadable.
- `next_pr_id` or `next_batch_id` allocation would collide with an existing file (never overwrite).
- Source artifact's DA-NNNN id cannot be parsed from frontmatter or filename.

An ABORT surfaces the specific condition to the user — it is not a silent failure.

## World-State Prerequisites (per FOUNDATIONS §"Tooling Recommendation")

This skill MUST have access to, and selectively load as needed, the following before any classification work:

| File | Used by | Purpose |
|---|---|---|
| `docs/FOUNDATIONS.md` | every phase | Canon-layer discipline, 7 Validation Rules, CF Schema, Change Control Policy |
| `WORLD_KERNEL.md` | Phase 4, per-card body | Genre / tonal / chronotope / core pressures — coherence scoring + "why it fits this world" prose |
| `INVARIANTS.md` | Phase 2, Phase 5 R12, Phase 6a | Detect `contradicts`; invariant-conformance check |
| `ONTOLOGY.md` | Phase 2 | Category validation for every claim's `type` field |
| `PEOPLES_AND_SPECIES.md` | Phase 3, Phase 6d.2, Phase 6d.3 | Narrator-reliability mapping; epistemic-horizon test; MR positional check |
| `GEOGRAPHY.md` | Phase 3, Phase 6d.2, Phase 6c | Scope narrowing; epistemic-horizon; distribution discipline |
| `INSTITUTIONS.md` | Phase 3, Phase 6d.2, Phase 6c | Narrator-reliability (institutional access, taboos); epistemic-horizon; distribution |
| `ECONOMY_AND_RESOURCES.md` | Phase 4, Phase 6c | `propagation_value` scoring; distribution discipline |
| `MAGIC_OR_TECH_SYSTEMS.md` | Phase 2 (selective) | Load when Phase 2 classifies any claim as `type: technology / magic_practice / metaphysical_rule` |
| `EVERYDAY_LIFE.md` | Phase 4, Phase 2 | `ordinary_life_relevance` scoring; grounded-detection for mundane details |
| `TIMELINE.md` | Phase 2, Phase 6a | Temporal-claim classification; chronology-conflict invariant check |
| `CANON_LEDGER.md` | Phase 2, Phase 6c | Full CF records (selective-read pattern when size warning triggers) |
| `OPEN_QUESTIONS.md` | Phase 6b | MR firewall context (questions explicitly left open vs MR-protected) |
| `MYSTERY_RESERVE.md` | Phase 6b, Phase 6d.3 | Per-card firewall check; positional check |
| `<artifact_path>` | Phase 1 | Source artifact; prose primary, frontmatter tags as hints only |
| `<parameters_path>` | Phase 0 | If provided: cap, novelty range, taboo areas, `allow_soft_canon_only` flag |
