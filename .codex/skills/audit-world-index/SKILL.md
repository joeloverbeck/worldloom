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

Read `AGENTS.md` and `docs/FOUNDATIONS.md` before starting the audit. Read `tickets/_TEMPLATE.md` and `tickets/README.md` only if a reproduced defect actually warrants drafting a new ticket. For World Index work, also read the recent active/archived ticket family relevant to the seam you uncover so you do not reopen already-fixed issues or duplicate an active owner. In this repo that often means both older `SPEC-01*` cleanup tickets, the archived `SPEC10ENTSUR-*` / `SPEC-10` redesign records, and for authority-surface or registry-validation seams the archived `SPEC11CANENT-*` tickets plus `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md`.

In this checkout, prefer live `.codex/skills/...` paths when you need to inspect sibling Codex workflow skills. Do not assume a parallel `.claude/skills/...` copy exists unless you verify it.
If you consult `docs/WORKFLOWS.md` as a quick-reference index, treat any `.claude/skills/...` wording there as a stale pointer unless the path is verified live in this checkout.

This skill is audit-and-ticket only. Do not modify `worlds/<slug>/` canon files, and do not implement indexer fixes as part of this workflow unless the user explicitly pivots to implementation.

## Always First

- Resolve `world_slug` to the exact live path under `worlds/`.
- Snapshot the worktree with `git status --short` before rebuilding so you can distinguish your ticket edits from unrelated local state.
- If dirty paths already touch `tools/world-index` or an adjacent `SPEC-01*` ticket/archive move, treat that as live ownership context before drafting a new ticket. Do not create a duplicate follow-up until you confirm the seam is not already being worked in the current checkout.
- Rebuild before trusting any query result. Do not audit a checked-in `_index/world.db` that has not just been regenerated from the current code.
- Run producer and proof lanes sequentially, not in parallel: package build, then world-index build, then audit queries.
- For Codex specifically, do not use parallel tool wrappers for the rebuild lane. `npm run build`, `build <world_slug>`, and `verify <world_slug>` are a strict serial dependency chain, and an overlapped run is not a trustworthy proof surface.
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

- CLI summary: `stats <world_slug>` from the repo root, because the current CLI resolves the world root from `process.cwd()` just like `build` and `verify`
- SQLite schema shape and table presence
- node counts by `node_type`
- edge counts by `edge_type`, including unresolved targets
- `validation_results` grouped by `validator_name`, `severity`, `code`, and `file_path`
- file coverage via `file_versions`
- semantic surfaces most likely to rot downstream consumers, especially `entities`, `entity_aliases`, `entity_mentions`, and virtual `named_entity` nodes

Before writing deeper semantic queries, inspect the live table columns you will rely on. In the current live schema, virtual `named_entity` rows live in `nodes` with `node_type='named_entity'`; there is no separate `named_entity` table. Canonical names, kinds, and provenance now live on `entities`, exact alternates live on `entity_aliases`, and raw or resolved mention evidence lives on `entity_mentions(surface_text, resolved_entity_id, resolution_kind, extraction_method)`. Derive source node type and file family through joins back to `nodes` when that is the current schema.

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

When checking file coverage, compare the rebuilt `file_versions` rows against the current enumerator contract, not a naive count of every `*.md` file under `worlds/<slug>/`. In the current live package, `INDEX.md` files are intentionally excluded, so missing `INDEX.md` rows alone are a truthful no-issue rather than an index defect.

If these are clean, say so explicitly and move on. Do not inflate a semantic-quality issue into a structural-corruption claim.

### 5. Query for semantic reliability second

Focus on surfaces that downstream tooling will consume directly.

For the post-SPEC-10 entity surfaces, inspect:

- total canonical `entities` count and virtual `named_entity` count
- `entities.entity_kind` and `entities.provenance_scope` distribution
- `entity_mentions` split by `resolution_kind` / `extraction_method`
- top unresolved `surface_text` rows by mention count
- source-node-type concentration for suspicious unresolved evidence or suspicious canonical entities
- file-family concentration
- representative false positives or mis-promoted canonicals with exact source rows

If the live schema lacks direct concentration columns on the surface you need, compute those views by joining back to `nodes` or `entities` instead of treating the query failure as an index defect. Use `entities` as the primary canonical aggregation surface, `entity_mentions.surface_text` plus `resolution_kind` / `extraction_method` for evidence aggregation, and `nodes WHERE node_type='named_entity'` for virtual-entity counts and targeted body inspections rather than assuming serialized node `body` is the canonical source of truth.

When a result looks suspicious, trace it to concrete examples. A good ticket seam has:

- exact entity names or row patterns
- source node types or files causing the pollution
- proof that the issue reproduces after rebuild
- a bounded likely ownership seam in `tools/world-index`

Do not stop at entity-surface plausibility when the index owns other deterministic parser surfaces. For any surface where the current live parser contract makes source-vs-DB comparison truthful, check whether the DB stores the full authored payload instead of only checking for corruption or unresolved targets.

In this repo, the main non-entity example is `CANON_LEDGER.md` YAML-derived semantic edges. When auditing semantic completeness, read the live parser symbols first and, where appropriate, compare the authored source counts against the rebuilt DB counts for deterministic edge-bearing fields such as:

- `source_basis.derived_from` -> `derived_from`
- `required_world_updates` -> `required_world_update`
- `modification_history[].change_id` -> `modified_by`
- `affected_fact_ids` -> `affected_fact`

If you need a truthful authored-count baseline for those fields, prefer using the live built parser against `worlds/<slug>/CANON_LEDGER.md` instead of hand-counting YAML blocks. A representative pattern is:

```bash
cd /path/to/repo && node -e 'const fs=require("fs"); const {parseYamlWithRecovery}=require("./tools/world-index/dist/src/parse/yaml.js"); const text=fs.readFileSync("worlds/<world_slug>/CANON_LEDGER.md","utf8"); const blocks=[...text.matchAll(/```yaml\\n([\\s\\S]*?)```/g)].map(m=>m[1]); const counts={derived_from:0,required_world_updates:0,modified_by:0,affected_fact:0}; for (const block of blocks) { let doc; try { doc=parseYamlWithRecovery(block); } catch { continue; } if (!doc || typeof doc !== "object") continue; if (Array.isArray(doc.required_world_updates)) counts.required_world_updates += doc.required_world_updates.length; if (doc.source_basis && Array.isArray(doc.source_basis.derived_from)) counts.derived_from += doc.source_basis.derived_from.length; if (Array.isArray(doc.modification_history)) counts.modified_by += doc.modification_history.filter(x => x && typeof x.change_id === "string").length; if (Array.isArray(doc.affected_fact_ids)) counts.affected_fact += doc.affected_fact_ids.length; } console.log(JSON.stringify(counts, null, 2));'
cd /path/to/repo && sqlite3 -header -column worlds/<world_slug>/_index/world.db "SELECT edge_type, COUNT(*) AS count FROM edges WHERE edge_type IN ('derived_from','required_world_update','modified_by','affected_fact') GROUP BY edge_type ORDER BY edge_type;"
```

Use the first command as the source-of-truth authored baseline and the second as the rebuilt DB count. If they differ after rebuild, treat that as a reproduced semantic completeness defect rather than a guess about parser behavior.

If a deterministic source surface says the DB should contain more rows than it actually does, classify that as a real semantic indexing defect even if:

- `verify` passes
- the DB is structurally clean
- entity surfaces look healthy

When this kind of completeness gap appears, cite both sides of the reproducer in the audit:

- the exact live parser/file contract that says the source data is in-scope
- the rebuilt DB query that proves the stored rows are missing or undercounted

### 6. Reassess against existing ticket ownership

Before writing a new ticket:

1. Search `tickets/` and `archive/tickets/` for the same seam.
2. Read the most relevant active or recent ticket/spec records for that seam.
3. Confirm whether the issue is a regression, a new adjacent seam, or already owned work.
4. Check the most relevant current verification surface for that seam before drafting a ticket. For `tools/world-index`, that often means the closest package-level integration or capstone proof already covering the rebuilt live corpus.

If the seam was already fixed but the fresh rebuild still reproduces it, cite the archived ticket or spec in the new ticket's reassessment as regression context. For entity-surface issues after SPEC-10, check `archive/specs/SPEC-10-entity-surface-redesign.md` plus archived `SPEC10ENTSUR-*` tickets before drafting a new owner. For post-SPEC-11 authority-surface seams such as `ONTOLOGY.md` named-entity registry parsing, `validation_results` drift around the registry block, malformed authority-source handling, or proof-surface fallout from those contracts, also check `archive/specs/SPEC-11-canonical-entity-authority-surfaces.md` plus archived `SPEC11CANENT-*` tickets before drafting a new owner.

For post-SPEC-10 entity-surface audits, explicitly run the current capstone proof lane before drafting a new entity-seam ticket when rebuild, `verify`, and direct DB probes look clean:

```bash
cd tools/world-index && npm run test:spec10-verification
```

If that capstone passes and the suspicious rows remain unresolved evidence only (not canonical `entities` / `named_entity` rows and not `mentions_entity` edges), classify the result as a truthful no-issue unless you have a separate reproduced seam outside the capstone's coverage.

If the reproduced defect already fails the current verification surface, cite that proof lane in the audit and keep the new ticket focused on the implementation seam unless a separate active owner already exists. If the reproduced defect survives current proof because the verification surface does not check that class yet, say so explicitly and include the missing proof-surface coverage as part of the same ticket only when it is a required consequence of that seam.

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
