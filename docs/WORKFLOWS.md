# Worldloom Workflows

Quick reference for invoking each skill. For detailed skill behavior, see the skill's own `SKILL.md` under `.claude/skills/<slug>/`.

## World lifecycle

- **Start a new world**: `/create-base-world` with a `world_name` and optional `premise_path` (a markdown brief under `briefs/`). Produces the 13-file bundle at `worlds/<slug>/`.
- **Add a canon fact to an existing world**: `/canon-addition` with `world_slug` and `proposal_path`. Accept outcomes extend the ledger and patch affected domain files; non-accept outcomes write only an adjudication record.
- **Audit a world for contradictions, drift, or dangling consequences**: `/continuity-audit` with `world_slug`. Produces an audit report at `worlds/<slug>/audits/AU-NNNN-<date>.md` and optional retcon-proposal cards directly consumable as `canon-addition`'s `proposal_path`.

## Canon fact generation

- **Propose new canon facts (thinness gaps, institutional adaptations, mystery seeds, cross-domain couplings)**: `/propose-new-canon-facts` with `world_slug`. Produces proposal cards at `worlds/<slug>/proposals/PR-NNNN-*.md` plus a batch manifest.
- **Mine canon facts from an existing diegetic artifact**: `/canon-facts-from-diegetic-artifacts` with `world_slug` and the artifact path. Same output surface as above; enforces a Diegetic-to-World laundering firewall and segregates contradictions for `continuity-audit` rather than emitting them as cards.
- **Feed a proposal card into adjudication**: pass the `PR-NNNN-*.md` card path as `proposal_path` to `/canon-addition`.

## Content generation (never mutates world-level canon)

- **Generate a character**: `/character-generation` with `world_slug` and `character_brief_path`. Writes `worlds/<slug>/characters/<char-slug>.md` and updates `characters/INDEX.md`.
- **Generate an in-world text**: `/diegetic-artifact-generation` with `world_slug`, `brief_path`, and optionally `character_path` to lift an existing narrator. Writes `worlds/<slug>/diegetic-artifacts/<da-slug>.md` and updates `diegetic-artifacts/INDEX.md`.

## Pipeline meta-work

- **Explore a new pipeline before building it**: `/brainstorm` with a request. Writes design docs to `docs/plans/`.
- **Turn a brainstorming proposal into a skill**: `/skill-creator` with the `brainstorming/*.md` path.
- **Maintain an existing skill**: `/skill-audit` (evaluate quality), `/skill-consolidate` (remove redundancies), `/skill-extract-references` (refactor a bloated `SKILL.md` into `references/` docs).

## Machine-facing layer CLI

- **Build or refresh a world's index**: `world-index build <world-slug>` for a full rebuild, `world-index sync <world-slug>` for an incremental refresh.
- **Inspect index state**: `world-index stats <world-slug>` for counts and freshness; `world-index inspect <node-id>` for a single-node dump.
- **Verify index integrity**: `world-index verify <world-slug>` re-parses disk-backed indexed files, skips synthetic atomic logical rows for retired root markdown concerns, and reports drift.
- **Validate a world's state**: `world-validate <world-slug>` runs the SPEC-04 validator CLI against the world's index; `--structural` narrows to structural checks and `--rules=1,2,4,5,6,7` targets mechanized rule validators.
- **MCP retrieval surface**: Claude Code will use `.mcp.json` plus `tools/world-mcp/` to expose `mcp__worldloom__*` retrieval tools. If a workflow reports stale-index errors, refresh the index before debugging the skill itself.
