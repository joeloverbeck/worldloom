---
name: audit-world-index
description: "Audit a rebuilt world-index database for a specific world and create bounded follow-up tickets when real index defects remain. Use when the user wants Codex to rebuild `tools/world-index`, rebuild `worlds/<slug>/_index/world.db`, query the fresh SQLite artifact extensively, identify structural or semantic indexing problems, and draft new tickets in `tickets/` aligned with `docs/FOUNDATIONS.md`."
user-invocable: true
arguments:
  - name: world_slug
    description: "World slug under `worlds/` to audit, for example `animalia`."
    required: true
---

# Audit World Index

Audit the live world-index output for one world by rebuilding first, querying the fresh SQLite artifact, and creating only evidence-backed follow-up tickets.

Read `AGENTS.md`, `docs/FOUNDATIONS.md`, `tickets/_TEMPLATE.md`, and `tickets/README.md` before drafting tickets. For World Index work, also read the recent active/archived `SPEC-01*` tickets relevant to the seam you uncover so you do not reopen already-fixed issues or duplicate an active owner.

This skill is audit-and-ticket only. Do not modify `worlds/<slug>/` canon files, and do not implement indexer fixes as part of this workflow unless the user explicitly pivots to implementation.

## Always First

- Resolve `world_slug` to the exact live path under `worlds/`.
- Snapshot the worktree with `git status --short` before rebuilding so you can distinguish your ticket edits from unrelated local state.
- Rebuild before trusting any query result. Do not audit a checked-in `_index/world.db` that has not just been regenerated from the current code.
- Run producer and proof lanes sequentially, not in parallel: package build, then world-index build, then audit queries.
- Treat stale checked-in index artifacts as non-issues once a fresh rebuild clears them.
- If a discovered issue is already owned by an active ticket, cite that ticket instead of creating a duplicate.

## Workflow

### 1. Rebuild the fresh artifact

From the repo root:

1. Confirm `worlds/<world_slug>/` exists.
2. Build the package from `tools/world-index/`.
3. Rebuild the world index from the repo root so path resolution is truthful.
4. Run `verify` on the rebuilt artifact before deeper auditing.

Use the current live CLI shape, not remembered command forms. For this repo the honest baseline is:

```bash
cd tools/world-index && npm run build
cd /path/to/repo && node tools/world-index/dist/src/cli.js build <world_slug>
cd /path/to/repo && node tools/world-index/dist/src/cli.js verify <world_slug>
```

If the build or verify command fails, stop the audit and report the failure seam instead of continuing into ticket authoring from a broken artifact.

### 2. Establish the audit surface

Audit the rebuilt `worlds/<world_slug>/_index/world.db`, not memory and not a temp narrative about what the DB "probably" contains.

Start with these surfaces:

- CLI summary: `stats <world_slug>`
- SQLite schema shape and table presence
- node counts by `node_type`
- edge counts by `edge_type`, including unresolved targets
- `validation_results` grouped by `severity`, `code`, and `file_path`
- file coverage via `file_versions`
- semantic surfaces most likely to rot downstream consumers, especially `named_entity` and `entity_mentions`

If the issue looks semantic rather than structural, trace it back to exact source node types, file families, and representative rows before drafting a ticket.

### 3. Separate issue classes

Classify each finding before deciding whether it needs a ticket:

- `stale artifact only`
- `already owned by active ticket`
- `already fixed in archived SPEC-01 ticket and not reproduced after rebuild`
- `real live defect requiring a new ticket`
- `truthful no-issue`

Do not create tickets for:

- failures that disappear after fresh rebuild
- speculative cleanup
- broad "quality could be better" impressions without a reproducible seam
- problems already owned by an active ticket

### 4. Query for structural integrity first

Prove the DB is or is not structurally trustworthy before chasing semantic noise.

Typical checks:

- unresolved edges by `edge_type`
- dangling `entity_mentions`
- dangling edge sources or targets
- nonzero `validation_results`
- bad path normalization or malformed sentinel metadata for synthetic rows
- indexed-file coverage through `file_versions`

If these are clean, say so explicitly and move on. Do not inflate a semantic-quality issue into a structural-corruption claim.

### 5. Query for semantic reliability second

Focus on surfaces that downstream tooling will consume directly.

For `named_entity` / `entity_mentions`, inspect:

- total `named_entity` count
- typed vs `Kind: unknown`
- top entity names by mention count
- source-node-type concentration
- file-family concentration
- representative false positives with exact source rows

When a result looks suspicious, trace it to concrete examples. A good ticket seam has:

- exact entity names or row patterns
- source node types or files causing the pollution
- proof that the issue reproduces after rebuild
- a bounded likely ownership seam in `tools/world-index`

### 6. Reassess against existing ticket ownership

Before writing a new ticket:

1. Search `tickets/` and `archive/tickets/` for the same seam.
2. Read the most relevant active or recent `SPEC-01*` tickets.
3. Confirm whether the issue is a regression, a new adjacent seam, or already owned work.

If the seam was already fixed but the fresh rebuild still reproduces it, cite that archived ticket in the new ticket's reassessment as regression context.

### 7. Draft new tickets only when warranted

Create each new ticket from `tickets/_TEMPLATE.md`.

Each ticket must:

- name one coherent defect
- cite the rebuilt world and exact audit evidence
- identify the real shared boundary under audit
- align with `docs/FOUNDATIONS.md`
- include truthful verification commands
- stay inside the indexer seam instead of smuggling in unrelated cleanup

Prefer one ticket per defect class. Split structural corruption, graph resolution drift, and semantic-noise issues into separate tickets when they have different owners or proof surfaces.

### 8. Report the audit clearly

End with:

- whether the rebuilt DB is structurally clean
- which issues reproduced after rebuild
- which issues were stale or already owned
- which new tickets were created
- which queries or commands proved the findings

## Ticket Authoring Guidance

- Use exact file paths and symbols for any non-trivial architectural claim.
- Cite the rebuilt DB evidence directly in `## Problem` and `## Assumption Reassessment`.
- Keep acceptance criteria tied to the audited invariant, not generic "improve quality" language.
- If the seam is semantic and not structural, say so explicitly.
- If the issue is concentrated in one surface such as `named_entity`, name the exact bad rows or patterns in the ticket.

## Guardrails

- `docs/FOUNDATIONS.md` wins over stale ticket/spec prose.
- Never audit without rebuilding first.
- Never create a ticket from stale checked-in `_index` state alone.
- Never duplicate an active ticket owner.
- Never modify world canon files during this workflow.
- Never claim reliability regressions without a fresh-rebuild reproducer.

## Example Usage

```text
/audit-world-index animalia
/audit-world-index my-world-slug
```
