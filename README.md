# Worldloom

Worldloom is a local-first, canon-safe worldbuilding and branching-story pipeline for Claude Code.

It is built for the hard part of generative fiction: not merely producing prose, but preserving canon, causality, mysteries, branch-local truth, character commitments, and story state across many sessions.

Worldloom stores authored worlds as structured prose plus append-only YAML records, indexes them in SQLite, exposes retrieval and mutation through MCP tools, validates patch plans before writes, and keeps rendered prose separate from authoritative story state.

## What Worldloom does

Worldloom helps you:

- Create a story world from a premise.
- Maintain canon as explicit, append-only records.
- Generate characters and diegetic artifacts without accidentally mutating canon.
- Propose new canon facts and adjudicate them through a gated workflow.
- Build branching story bundles inside a world.
- Advance a branching story one page/tick at a time.
- Preserve branch-local facts, beliefs, obligations, consequences, relationships, choices, and unresolved mysteries.
- Attach rendered prose after the authoritative page plan is committed.
- Promote story-local facts into world canon through a formal proposal path.
- Audit worlds and story bundles for drift, contradictions, dangling consequences, and weak causal structure.

The core idea is simple:

> Prose is the reader-facing artifact.  
> Structured records are the authoritative state.  
> The patch engine is the only safe writer for canon/story ledgers.  
> Validators enforce the contract before state changes land.

## Project status

Worldloom is an active, experimental writing engine.

The repo is partly a writing pipeline and partly a TypeScript toolchain. The human-facing workflows live in Claude Code skills under `.claude/skills/`. The machine-facing layer lives under `tools/`.

Expect the system to be powerful, opinionated, and contract-heavy. It is designed first for correctness over convenience.

## Repository layout

```text
docs/
  FOUNDATIONS.md                 Project-wide design contract.
  WORKFLOWS.md                   Quick reference for invoking skills.
  HARD-GATE-DISCIPLINE.md        Approval-gate and partial-failure rules.
  MACHINE-FACING-LAYER.md        Notes on the MCP/index/validator layer.
  CONTEXT-PACKET-CONTRACT.md     Retrieval-packet contract and limits.
  plans/                         Design docs emitted by brainstorm workflows.
  triage/                        Triage reports and improvement passes.

.claude/
  skills/
    <skill>/
      SKILL.md                   Claude Code skill instructions.
      references/                Optional supporting docs/templates.

.codex/
  skills/                        Codex-oriented implementation skills.
  run-state/                     Implementation-run state artifacts.

tools/
  world-index/                   SQLite-backed index over world files.
  world-mcp/                     MCP server exposing retrieval/mutation tools.
  patch-engine/                  Deterministic patch-plan applier.
  validators/                    Executable rule and structural validators.
  hooks/                         Claude Code hook support.

brainstorming/                   User-authored proposals for new skills/pipelines.
briefs/                          User-authored briefs; contents ignored by git.
worlds/                          Generated/private world content; contents ignored by git.
world-proposals/                 Generated/private world proposals; contents ignored by git.
archive/                         Superseded specs, tickets, plans, and reports.
reports/                         Analysis reports feeding specs/triage.
```

Only the pipeline, docs, skills, and tooling are intended to be version-controlled in this repo. User-specific world content under `briefs/`, `worlds/`, and `world-proposals/` is ignored by git.

## The main concepts

### Canon

World-level canon lives under:

```text
worlds/<world-slug>/_source/
```

Important record classes include:

- `CF-<n>` — Canon Fact Records.
- `CH-<n>` — Change Log Entries.
- `M-<n>` — Mystery Reserve entries.
- `OQ-<n>` — Open Questions.
- `ENT-<n>` — Named Entities.
- `SEC-<PREFIX>-<n>` — Atomic section records for mandatory world domains.
- Invariants such as `ONT-<n>`, `CAU-<n>`, `SOC-<n>`, `DIS-<n>`, and `AES-<n>`.

Canon is append-only in spirit. To change an accepted fact, create a new adjudicated change rather than silently overwriting old state.

### Story bundles

Branching stories live under:

```text
worlds/<world-slug>/stories/<story-slug>/
```

A story bundle contains story-local records such as:

- `STENT` — Story-local entities.
- `BEL` — Story-local beliefs.
- `SF` — Story-local facts.
- `SE` — Story events.
- `OBL` — Obligations.
- `CNSQ` — Consequences.
- `THR` — Threads.
- `SREL` — Story-local relationships.
- `STINT` — Intentions.
- `STLOC` — Story locations.
- `STOBJ` — Story objects.
- `BR` — Branches.
- `PG` — Page snapshots.
- `CHC` — Choices.
- `SLT` — Commitment/storylet blocks.
- Story-local `DA` — Diegetic artifacts.

A committed `PG` page record is the authoritative story-state snapshot. Rendered prose is attached afterward and validated against that snapshot.

### Page plans vs prose

Worldloom deliberately separates page planning from prose rendering.

```text
pages-prose-plans/PG-<n>.md      Comprehensive plan for a page.
pages-prose/PG-<n>.md            Rendered prose supplied externally.
pages-prose-receipts/PG-<n>.yaml Validation receipt for attached prose.
```

A story can advance from any committed page snapshot whether or not rendered prose has been attached.

### Hard gates

Canon-mutating and content-generating workflows use explicit approval gates. Invoking a skill is not approval to write. A skill must present the planned state change, wait for user approval, sign the exact patch envelope, and submit it through the patch engine.

The relevant contract is in:

```text
docs/HARD-GATE-DISCIPLINE.md
```

### Machine-facing layer

Worldloom uses a TypeScript toolchain to make the prose/YAML world state queryable and safely mutable.

```text
tools/world-index/      Builds and syncs a SQLite index.
tools/world-mcp/        Exposes MCP tools for retrieval, validation, ID allocation, and patch submission.
tools/patch-engine/     Applies signed patch plans deterministically.
tools/validators/       Runs executable structural and rule-derived validators.
```

The intended flow is:

```text
skill pre-flight
  -> retrieve context through MCP
  -> allocate IDs through MCP
  -> assemble patch plan
  -> validate patch plan
  -> present summary to user
  -> user approves
  -> sign approval token
  -> submit patch plan through MCP or CLI
  -> patch engine writes files
  -> index syncs
  -> skill writes direct markdown artifacts in documented order
```

## Requirements

The TypeScript tool packages currently target:

- Node.js `>=22`
- npm

Each tool package has its own `package.json`. There is not currently a root workspace command surface.

## Installing tool dependencies

Install dependencies package by package:

```bash
cd tools/world-index
npm install

cd ../patch-engine
npm install

cd ../validators
npm install

cd ../world-mcp
npm install
```

The packages use local `file:` dependencies on each other, so if you change one package and another package depends on it, rebuild the dependency before testing the consumer.

## Building and testing

From each package directory:

```bash
npm run build
npm test
```

Useful package-level commands:

```bash
# tools/world-index
npm run build
npm test

# tools/patch-engine
npm run build
npm test
npm run test:integration
npm run test:compile-reject

# tools/validators
npm run build
npm test

# tools/world-mcp
npm run build
npm test
```

The compiled `dist/` directories are ignored by git.

## Indexing a world

After creating or changing a world, use `world-index` to build or refresh the SQLite index.

From the repo root or an active worktree root:

```bash
node tools/world-index/dist/src/cli.js build <world-slug>
node tools/world-index/dist/src/cli.js sync <world-slug>
node tools/world-index/dist/src/cli.js stats <world-slug>
node tools/world-index/dist/src/cli.js verify <world-slug>
```

The generated index lives at:

```text
worlds/<world-slug>/_index/world.db
```

The index is derived state and is ignored by git.

## Validating a world

After building the validators package:

```bash
node tools/validators/dist/src/cli/world-validate.js <world-slug>
node tools/validators/dist/src/cli/world-validate.js <world-slug> --structural
node tools/validators/dist/src/cli/world-validate.js <world-slug> --rules=1,2,4,5,6,7,11,12
node tools/validators/dist/src/cli/world-validate.js <world-slug> --story <story-slug> --rules=choice_set_noncollapse
```

The validator layer includes schema checks, cross-file reference checks, snapshot replay checks, story-state checks, mystery-preservation checks, choice-set checks, and other structural/rule-derived guards.

## MCP server

The MCP server lives in:

```text
tools/world-mcp/
```

After building it, a local MCP config can point Claude Code at:

```json
{
  "mcpServers": {
    "worldloom": {
      "command": "node",
      "args": ["tools/world-mcp/dist/src/server.js"],
      "env": {}
    }
  }
}
```

The server exposes tools for:

- Searching indexed nodes.
- Retrieving records.
- Listing records by type.
- Building context packets.
- Finding neighbors and impacted fragments.
- Allocating next IDs.
- Validating patch plans.
- Submitting patch plans.
- Describing schemas and server capabilities.

See:

```text
tools/world-mcp/README.md
docs/CONTEXT-PACKET-CONTRACT.md
docs/MACHINE-FACING-LAYER.md
```

## Common workflows

The canonical quick reference is:

```text
docs/WORKFLOWS.md
```

### Create a new world

Use the Claude Code skill:

```text
/create-base-world
```

Inputs usually include a world name and optionally a premise brief under `briefs/`.

Outputs include:

```text
worlds/<world-slug>/WORLD_KERNEL.md
worlds/<world-slug>/ONTOLOGY.md
worlds/<world-slug>/_source/
```

### Add a canon fact

Use:

```text
/canon-addition
```

The skill adjudicates a proposal, creates or updates canonical records through the patch engine, and writes an adjudication record.

### Generate a character

Use:

```text
/character-generation
```

This writes a character dossier under:

```text
worlds/<world-slug>/characters/
```

Character generation reads canon but does not mutate world-level canon.

### Generate a diegetic artifact

Use:

```text
/diegetic-artifact-generation
```

This writes an in-world artifact under:

```text
worlds/<world-slug>/diegetic-artifacts/
```

Artifact generation reads canon but does not mutate world-level canon.

### Propose new canon facts

Use:

```text
/propose-new-canon-facts
```

This writes proposal cards under:

```text
worlds/<world-slug>/proposals/
```

Each proposal card can later be consumed by `canon-addition`.

### Start a branching story

Use:

```text
/branching-story-bootstrap
```

This creates a story bundle under:

```text
worlds/<world-slug>/stories/<story-slug>/
```

It writes story-local records, a story kernel, the first page plan, and initial choices.

### Advance a branching story

Use:

```text
/branching-story-turn-cycle
```

The skill advances from a committed parent page using either a selected `CHC-<n>` choice or a free-form write-in.

It writes the next page snapshot, event, updated story-local records, a new page plan, and new choices.

### Attach rendered prose

Use:

```text
/branching-story-prose-attach
```

Rendered prose is expected to already exist at:

```text
worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-<n>.md
```

The skill validates the prose against the committed page plan and writes a receipt.

### Audit story-bundle health

Use:

```text
/branching-story-health-audit
```

This diagnoses structural, prose, remediation, or cross-story health issues and may emit remediation proposal cards.

### Promote story-local truth into world canon

Use:

```text
/story-fact-promotion-to-canon
```

This creates a promotion package and ledger, then hands the candidate to `canon-addition`. Story skills never mutate world-level canon directly.

## Important rules

Worldloom is intentionally strict.

- Do not bypass hard gates.
- Do not hand-edit `_source/` records that are supposed to be patch-engine-owned.
- Do not silently overwrite or delete accepted records.
- Do not treat prose as authoritative story state.
- Do not promote story-local facts into world canon except through the promotion workflow.
- Do not rely on bulk `_source/` reads inside skills; use MCP retrieval.
- Do not commit generated private world content from `worlds/`, `briefs/`, or `world-proposals/`.
- Do not assume a validator skipped means it passed.
- Do not let README, skill docs, schemas, and registries drift apart.

## Private content and git hygiene

The repo ignores user-specific world content:

```text
briefs/*
worlds/*
world-proposals/*
```

The folders are preserved with `.gitkeep`, but their generated/private contents are not tracked here.

Derived and local machine artifacts are also ignored, including:

```text
tools/*/dist/
tools/*/node_modules/
worlds/*/_index/
tools/world-mcp/.secret
tools/hooks/logs/
```

## Design documents

Start here:

```text
docs/FOUNDATIONS.md
```

Then read:

```text
docs/WORKFLOWS.md
docs/HARD-GATE-DISCIPLINE.md
docs/MACHINE-FACING-LAYER.md
docs/CONTEXT-PACKET-CONTRACT.md
```

For implementation history and prior design work, see:

```text
archive/specs/
archive/tickets/
reports/
docs/triage/
```

## Development notes

This repo has many repeated contract surfaces: schemas, validator registries, MCP tool descriptions, skill instructions, docs, and archived specs. When changing a record type, operation kind, validator, ID class, or workflow contract, update all dependent surfaces or add generated docs/tests so the contract cannot drift silently.

High-risk change areas include:

- Patch-plan envelope shape.
- Operation kinds in the patch engine.
- Record schemas in validators.
- ID allocation classes and path conventions.
- Story-bundle record types.
- Context-packet delivery and truncation behavior.
- Hard-gate write ordering.
- Any workflow that touches `_source/`.

## Recommended local verification loop

For tool changes, a typical local loop is:

```bash
cd tools/world-index
npm run build
npm test

cd ../patch-engine
npm run build
npm test
npm run test:integration

cd ../validators
npm run build
npm test

cd ../world-mcp
npm run build
npm test
```

For world changes, a typical loop is:

```bash
node tools/world-index/dist/src/cli.js sync <world-slug>
node tools/validators/dist/src/cli/world-validate.js <world-slug>
```

For patch-plan debugging:

```bash
node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/plan.json
node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/plan.json > /tmp/token.txt
node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/plan.json /tmp/token.txt
```

Run patch-plan CLIs from the repo root or active worktree root so relative `worlds/`, `tools/`, and `docs/` paths resolve correctly.

## Philosophy

Worldloom is built on a few strong opinions:

1. Long-form generative fiction needs state, not just prompts.
2. Canon should be explicit, queryable, and append-only.
3. Mysteries are protected surfaces, not loose vibes.
4. Branch-local truths must not leak into world canon by accident.
5. Prose should be validated against state, not trusted as state.
6. Every meaningful mutation should be planned, approved, validated, and receipted.
7. LLM workflows need machine-checkable contracts if they are expected to survive many sessions.

Worldloom is therefore not a generic writing assistant. It is a canon-preserving narrative state machine with prose-facing workflows layered on top.