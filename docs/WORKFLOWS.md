# Worldloom Workflows

Quick reference for invoking each skill. For detailed skill behavior, see the skill's own `SKILL.md` under `.claude/skills/<slug>/`.

## World lifecycle

- **Start a new world**: `/create-base-world` with a `world_name` and optional `premise_path` (a markdown brief under `briefs/`). Produces the 13-file bundle at `worlds/<slug>/`.
- **Add a canon fact to an existing world**: `/canon-addition` with `world_slug` and `proposal_path`. Accept outcomes extend the ledger and patch affected domain files; non-accept outcomes write only an adjudication record.
- **Audit a world for contradictions, drift, or dangling consequences**: `/continuity-audit` with `world_slug`. Produces an audit report at `worlds/<slug>/audits/AU-NNNN-<date>.md` and optional retcon-proposal cards directly consumable as `canon-addition`'s `proposal_path`.

Canon-addition validation now includes Test 11 (action-space leverage), Test 12 (trace redundancy), and Test 13 (misrecognition probe addressed). `epistemic_profile` and `exception_governance` remain governed by the conditional-mandate regime in `docs/FOUNDATIONS.md` §Canon Fact Record Schema and §Validation Rules.

## Canon fact generation

- **Propose new canon facts (thinness gaps, institutional adaptations, mystery seeds, cross-domain couplings)**: `/propose-new-canon-facts` with `world_slug`. Produces proposal cards at `worlds/<slug>/proposals/PR-NNNN-*.md` plus a batch manifest.
- **Mine canon facts from an existing diegetic artifact**: `/canon-facts-from-diegetic-artifacts` with `world_slug` and the artifact path. Same output surface as above; enforces a Diegetic-to-World laundering firewall and segregates contradictions for `continuity-audit` rather than emitting them as cards.
- **Feed a proposal card into adjudication**: pass the `PR-NNNN-*.md` card path as `proposal_path` to `/canon-addition`.

## Content generation (never mutates world-level canon)

- **Generate a character**: `/character-generation` with `world_slug` and `character_brief_path`. Writes `worlds/<slug>/characters/<char-slug>.md` and updates `characters/INDEX.md`.
- **Generate an in-world text**: `/diegetic-artifact-generation` with `world_slug`, `brief_path`, and optionally `character_path` to lift an existing narrator. Writes `worlds/<slug>/diegetic-artifacts/<da-slug>.md` and updates `diegetic-artifacts/INDEX.md`.

## Branching story bundles

Story-pipeline skills produce story-local records under `worlds/<slug>/stories/<story-slug>/`. They never mutate world-level canon directly — the only lawful story-to-world canon-promotion path is `story-fact-promotion-to-canon`, which hands the candidate to `canon-addition`.

After the prose-rendering split, the page authoring path is two skills converging on each page: bootstrap or page-cycle author the comprehensive plan at `pages-prose-plans/PG-NNNN.md`; the user (manually or via an external LLM) writes the rendered prose at `pages-prose/PG-NNNN.md`; finalize merges them.

- **Start a new branching story bundle**: `/branching-story-bootstrap` with `world_slug`, `story_slug`, `premise_path`, and a selected cast (drawn from the world's `characters/INDEX.md`). Writes `STORY_KERNEL.md`, the atomic `_source/` ledgers, the `pages-prose-plans/PG-0001.md` comprehensive plan and its first 4-6 generated choices, and a seed storylet pool. Rendered prose for PG-0001 is supplied externally and merged via `branching-story-page-prose-finalize`.
- **Advance one tick**: `/branching-story-page-cycle` with `world_slug`, `story_slug`, parent `page_id`, and either a chosen `choice_id` (`CHC-NNNN`) from that page's emitted choices or a free-form `write_in`. Authors the comprehensive prose plan for the next page at `pages-prose-plans/PG-NNNN.md` (alongside the per-turn PG/SE/SF/OBL/CNSQ/THR/SREL/STINT/CHC records). Rendered prose is supplied externally and merged via `branching-story-page-prose-finalize`. Pre-flight aborts when the parent page's `prose_status != "rendered"`.
- **Finalize rendered prose for a page**: `/branching-story-page-prose-finalize` with `world_slug`, `story_slug`, `page_id`, and optionally `execution_mode` (default `authoring`; alternatives `interactive_runtime`, `batch_generation`) and `accept_plan_drift` (default `false`; set `true` when canon was deliberately updated between plan-commit and prose-render). Required pre-state: PG record with `prose_status: pending`, `pages-prose-plans/PG-NNNN.md` exists, `pages-prose/PG-NNNN.md` exists. Runs the deferred prose-coupled validators (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`), extracts ARC_TRACE if the page has a selected arc, updates the PG record's `prose_status` to `rendered`, and emits a `prose_finalized` SE event (and `ARCTRACE-NNNN` if applicable). Per-execution-mode HARD-GATE visibility: `authoring` shows the gate; `interactive_runtime` and `batch_generation` auto-commit after gates PASS. Does NOT route to `story-fact-promotion-to-canon`.
  - Example: `/branching-story-page-prose-finalize world_slug=<slug> story_slug=<slug> page_id=PG-NNNN`
- **Author or expand the storylet pool**: `/storylet-pool-authoring` with `world_slug`, `story_slug`, and `mode` (`seed` / `focus` / `jit` / `audit`). `audit` mode consumes RSP cards from `branching-story-health-audit`'s output. Writes `_source/storylets/SLT-NNNN.yaml` records + `storylet-batches/SLB-NNNN.md` manifests + INDEX summary edits.
- **Audit story-bundle health**: `/branching-story-health-audit` with `world_slug` and `story_slug`. Writes `stories/<story-slug>/audits/SAU-NNNN-<date>.md` + optional `audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-*.md` (directly consumable by `storylet-pool-authoring` audit-mode).
- **Promote a story-local fact into world canon**: `/story-fact-promotion-to-canon` with `world_slug`, `story_slug`, the source-record reference, and a promotion rationale. Writes `story-promotions/SP-NNNN.md` + proposal-package sidecar, then hands the proposal package to `canon-addition` (which assembles and submits the actual CF/CH/PA world-canon patch plan under its own HARD-GATE).

### Authoring loop after the prose-rendering split

```
bootstrap-plan PG-0001 → external prose render → finalize PG-0001
                                                ↓
     page-cycle-plan PG-0002 ← (only after PG-0001.prose_status == rendered)
                            ↓
     external prose render → finalize PG-0002
                            ↓
     page-cycle-plan PG-0003 ← ...
```

Branching is unaffected — any rendered page can be a fork parent (page-cycle accepts ANY page in the tree, including non-leaf, as `parent_page_id`). Forking from a `pending`-status page is blocked by the page-cycle pre-flight check.

## Pipeline meta-work

- **Explore a new pipeline before building it**: `/brainstorm` with a request. Writes design docs to `docs/plans/`.
- **Turn a brainstorming proposal into a skill**: `/skill-creator` with the `brainstorming/*.md` path.
- **Maintain an existing skill**: `/skill-audit` (evaluate quality), `/skill-consolidate` (remove redundancies), `/skill-extract-references` (refactor a bloated `SKILL.md` into `references/` docs).

## Machine-facing layer CLI

- **Bootstrap, build, or refresh a world's index**: `world-index init <world-slug>` for an empty schema-applied bootstrap, `world-index build <world-slug>` for a full rebuild, `world-index sync <world-slug>` for an incremental refresh. If sync reports skipped schema-failed records, inspect `worlds/<slug>/_index/world.db.skipped_records.log`; `world-index sync <world-slug> --quiet` suppresses per-record warnings but still writes the log.
- **Inspect index state**: `world-index stats <world-slug>` for counts and freshness; `world-index inspect <node-id>` for a single-node dump.
- **Render story-bundle records for human inspection**: `world-index render <world-slug> --story <story-slug>` emits a merged read-only markdown view from indexed story-bundle records; add `--arc-traces` to include ARC_TRACE records.
- **Verify index integrity**: `world-index verify <world-slug>` re-parses disk-backed indexed files, skips synthetic atomic logical rows for retired root markdown concerns, and reports drift.
- **Validate a world's state**: `world-validate <world-slug>` runs the SPEC-04 validator CLI against the world's index; `--structural` narrows to structural checks, `--rules=1,2,4,5,6,7,11,12` targets mechanized numbered validators, and `--story <story-slug> --rules=storylet_predicate_dsl_parsability` checks one indexed story bundle's storylet predicate DSL.
- **MCP retrieval surface**: Claude Code will use `.mcp.json` plus `tools/world-mcp/` to expose `mcp__worldloom__*` retrieval tools. Explicit-world retrieval calls auto-sync and retry once when the index is stale; a successful response with `freshness_audit.pre_call_index_was_stale: true` is diagnostic only. If a retrieval call still returns persistent `stale_index`, inspect the drifted paths and refresh the index before debugging the skill itself.
