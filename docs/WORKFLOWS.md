# Worldloom Workflows

Quick reference for invoking each skill. For detailed skill behavior, see the skill's own `SKILL.md` under `.claude/skills/<slug>/`.

## World lifecycle

- **Start a new world**: `/create-base-world` with a `world_name` and optional `premise_path` (a markdown brief under `briefs/`). Produces the 13-file bundle at `worlds/<slug>/`.
- **Add a canon fact to an existing world**: `/canon-addition` with `world_slug` and `proposal_path`. Accept outcomes extend the ledger and patch affected domain files; non-accept outcomes write only an adjudication record.
- **Audit a world for contradictions, drift, or dangling consequences**: `/continuity-audit` with `world_slug`. Produces an audit report at `worlds/<slug>/audits/AU-<integer>-<date>.md` and optional retcon-proposal cards directly consumable as `canon-addition`'s `proposal_path`.

Canon-addition validation now includes Test 11 (action-space leverage), Test 12 (trace redundancy), and Test 13 (misrecognition probe addressed). These are canon-addition Validation Tests, not FOUNDATIONS Validation Rules; there is no FOUNDATIONS Rule 13. Canon Fact `status` values are `hard_canon`, `derived_canon`, `soft_canon`, and `contested_canon`; Mystery Reserve remains a separate `M-<integer>` record class, not a CF status. `epistemic_profile` and `exception_governance` remain governed by the conditional-mandate regime in `docs/FOUNDATIONS.md` §Canon Fact Record Schema and §Validation Rules.

## Canon fact generation

- **Propose new canon facts (thinness gaps, institutional adaptations, mystery seeds, cross-domain couplings)**: `/propose-new-canon-facts` with `world_slug`. Produces proposal cards at `worlds/<slug>/proposals/PR-<integer>-*.md` plus a batch manifest.
- **Mine canon facts from an existing diegetic artifact**: `/canon-facts-from-diegetic-artifacts` with `world_slug` and the artifact path. Same output surface as above; enforces a Diegetic-to-World laundering firewall and segregates contradictions for `continuity-audit` rather than emitting them as cards.
- **Feed a proposal card into adjudication**: pass the `PR-<integer>-*.md` card path as `proposal_path` to `/canon-addition`.

## Content generation (never mutates world-level canon)

- **Generate a character**: `/character-generation` with `world_slug` and `character_brief_path`. Writes `worlds/<slug>/characters/<char-slug>.md` and updates `characters/INDEX.md`.
- **Generate an in-world text**: `/diegetic-artifact-generation` with `world_slug`, `brief_path`, and optionally `character_path` to lift an existing narrator. Writes `worlds/<slug>/diegetic-artifacts/<da-slug>.md` and updates `diegetic-artifacts/INDEX.md`.

## Branching story bundles

Story-pipeline skills produce story-local records under `worlds/<slug>/stories/<story-slug>/`. They never mutate world-level canon directly — the only lawful story-to-world canon-promotion path is `story-fact-promotion-to-canon`, which hands the candidate to `canon-addition`.

Story state is authoritative when the `PG` record and its companion `SE` / choice records are committed. Bootstrap and turn-cycle commit planless story state through the patch engine; they do not author legacy `pages-prose-plans/PG-<integer>.md` artifacts. Rendered prose is planned and attached at scene scope by `branching-story-scene-plan` and `branching-story-scene-prose-attach`.

The scene render layer is the prose-rendering surface. A planned `SCN` groups a contiguous committed `PG` range on one branch path for external prose rendering; `PG` records remain the causal authority and `SCN` remains a non-authoritative render-membership record.

- **Start a new branching story bundle**: `/branching-story-bootstrap` with `world_slug`, `story_slug`, `premise_path`, and a selected cast (drawn from the world's `characters/INDEX.md`). Writes `STORY_KERNEL.md`, the atomic `_source/` ledgers, a planless `PG-1` and its first 4-6 generated choices, and seed commitment-block records / batch manifests. Rendered prose is planned later with `branching-story-scene-plan` and attached with `branching-story-scene-prose-attach`.
- **Advance one tick**: `/branching-story-turn-cycle` with `world_slug`, `story_slug`, parent `page_id`, and `action_source_mode`: choose `resolve_selected_choice` with a parent-emitted `choice_id` (`CHC-<integer>`), `resolve_write_in` with a free-form `write_in`, or `advance_initiative` with both player-action fields absent so a non-player driver from parent-page pressure fires. Commits the next planless `PG` / `SE` / affected story records and choices. The state delta is reasoned from the parent page's story records via retrieval, not from prior prose or page-plan artifacts. Any committed page snapshot can be a parent, whether or not rendered prose has been attached.
- **Plan scene-range prose**: `/branching-story-scene-plan` with `world_slug`, `story_slug`, `start_page_id`, and `end_page_id`; optionally pass `existing_scene_id` when superseding a prior scene. Selects a contiguous single-branch `PG` range, creates or supersedes an `SCN` record through the patch engine, writes `scene-prose-plans/SCN-<integer>.md`, creates the scene publication directories as needed, and updates `INDEX.md` after explicit HARD-GATE approval.
  - Example: `/branching-story-scene-plan world_slug=<slug> story_slug=<slug> start_page_id=PG-<integer> end_page_id=PG-<integer>`
- **Attach rendered prose for a scene**: `/branching-story-scene-prose-attach` with `world_slug`, `story_slug`, `scene_id`, and rendered prose already present at `scene-prose/SCN-<integer>.md`. Validates the prose against every `PG` in `SCN.pg_ids`, writes `scene-prose-receipts/SCN-<integer>.yaml` plus an INDEX update, and never mutates `PG`, `SCN`, `SE`, or other story `_source` state.
  - Example: `/branching-story-scene-prose-attach world_slug=<slug> story_slug=<slug> scene_id=SCN-<integer>`
- **Author or expand commitment blocks**: `/commitment-block-authoring` with `world_slug`, `story_slug`, and the mode / audit handoff described by that skill. Audit mode consumes RSP cards from `branching-story-health-audit`'s output. Writes `_source/storylets/SLT-<integer>.yaml` records + `storylet-batches/SLB-<integer>.md` manifests + INDEX summary edits.
- **Audit story-bundle health**: `/branching-story-health-audit` with `world_slug` and `story_slug`. Writes `stories/<story-slug>/audits/SAU-<integer>-<date>.md` + optional `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-*.md` (directly consumable by `commitment-block-authoring` audit mode).
- **Promote a story-local fact into world canon**: `/story-fact-promotion-to-canon` with `world_slug`, `story_slug`, the source-record reference, and a promotion rationale. Writes `story-promotions/SP-<integer>.md` + proposal-package sidecar, then hands the proposal package to `canon-addition` (which assembles and submits the actual CF/CH/PA world-canon patch plan under its own HARD-GATE).

### Authoring loop after the scene render split

```
bootstrap state PG-1
             ↓
turn-cycle state PG-2 ← any committed parent page snapshot
             ↓
turn-cycle state PG-3 ← ...
             ↓
scene-plan SCN-1 over committed PG range → external scene prose → scene-prose-attach receipt SCN-1
```

Branching is state-first: any committed page can be a fork parent, including a non-leaf page or a page whose rendered prose has not yet been attached. Rendered prose and prose receipts are evidence / publication artifacts, not parent-page gates.

Scene prose planning can be run after one or more committed pages exist:

```
committed PG range → scene-plan SCN-1 → external scene prose → scene-prose-attach receipt SCN-1
```

Only the final `PG` in the `SCN.pg_ids` range supplies the playable choice surface. Intermediate choices inside the range are historical context for the renderer, not current choices.

## Pipeline meta-work

- **Explore a new pipeline before building it**: `/brainstorm` with a request. Writes design docs to `docs/plans/`.
- **Turn a brainstorming proposal into a skill**: `/skill-creator` with the `brainstorming/*.md` path.
- **Maintain an existing skill**: `/skill-audit` (evaluate quality), `/skill-consolidate` (remove redundancies), `/skill-extract-references` (refactor a bloated `SKILL.md` into `references/` docs).

## Machine-facing layer CLI

- **Bootstrap, build, or refresh a world's index**: `world-index init <world-slug>` for an empty schema-applied bootstrap, `world-index build <world-slug>` for a full rebuild, `world-index sync <world-slug>` for an incremental refresh. If sync reports skipped schema-failed records, inspect `worlds/<slug>/_index/world.db.skipped_records.log`; `world-index sync <world-slug> --quiet` suppresses per-record warnings but still writes the log.
- The bare `world-index ...` examples assume the `@worldloom/world-index` package bin is on the shell `PATH`. From a plain repository checkout, use the package-local bin instead: `npm exec --prefix tools/story-explorer -- world-index build <world-slug>` for rebuilds or `npm exec --prefix tools/story-explorer -- world-index sync <world-slug> --quiet` for refreshes. You can also run the compiled CLI directly with `node tools/world-index/dist/src/cli.js build <world-slug>` or `node tools/world-index/dist/src/cli.js sync <world-slug> --quiet`.
- **Inspect index state**: `world-index stats <world-slug>` for counts and freshness; `world-index inspect <node-id>` for a single-node dump.
- **Render story-bundle records for human inspection**: `world-index render <world-slug> --story <story-slug>` emits a merged read-only markdown view from indexed story-bundle records.
- **Verify index integrity**: `world-index verify <world-slug>` re-parses disk-backed indexed files, skips synthetic atomic logical rows for retired root markdown concerns, and reports drift.
- `world-index` commands resolve the worldloom project root by `--world-root <path>` > `WORLDLOOM_ROOT` > auto-discovery from cwd using `docs/FOUNDATIONS.md` + `worlds/` markers, and emit the chosen root to stderr as `[world-root] ...`.
- **Validate a world's state**: `world-validate <world-slug>` runs the SPEC-04 validator CLI against the world's index; `--structural` narrows to structural checks, `--rules=1,2,4,5,6,7,11,12` targets mechanized numbered validators, and `--story <story-slug> --rules=storylet_predicate_dsl_parsability` or `--story <story-slug> --rules=choice_set_noncollapse` checks one indexed story bundle's story-specific rule validators.
- **MCP retrieval surface**: Claude Code will use `.mcp.json` plus `tools/world-mcp/` to expose `mcp__worldloom__*` retrieval tools. Explicit-world index-backed calls auto-rebuild and/or auto-sync before retrying when the index schema is old or source files are stale; successful responses with `freshness_audit.pre_call_index_version_was_old: true` or `freshness_audit.pre_call_index_was_stale: true` are diagnostic only. If a retrieval call still returns persistent `index_version_mismatch` or `stale_index`, inspect the recovery details and refresh the index before debugging the skill itself.
- **Surgical story-state maintenance**: use `mcp__worldloom__plan_story_state_maintenance` for bounded append-only story-bundle repairs where no new fictional turn occurred. Supply the committed `parent_page_id` that the maintenance should fork from. The tool returns a review-only patch-plan envelope containing the maintenance records, an audit/system repair `SE`, and a planless maintenance `PG`. Validate the patch plan, obtain explicit approval, sign the exact plan, and submit through `mcp__worldloom__submit_patch_plan`. Use `branching-story-turn-cycle` `repair_turn` instead when the repair is a real causal tick that needs ordinary fictional state progression and choices.
