# Manual Story Studio — Full Removal Decision Record (2026-06-07)

## Goal

Remove every trace of the `tools/manual-story-studio/*` package (implemented across SPEC-100..SPEC-124) from this repository. The author judged the implementation wrong from the foundations and re-implemented it from scratch in a separate repo; the good material lives there. This repo is to be scrubbed of the package and its directly-attached surfaces (CI, docs, active-skill prose, reports, produced data).

## Classification

`tooling-adjacent` (brainstorm taxonomy). The package is a standalone writing-cockpit tool that explicitly disclaims canon-pipeline integration (`No LLM, no MCP, no patch engine`; its `package.json` excludes `@worldloom/patch-engine` and `@worldloom/world-mcp`). It produces non-canon `manual-story` bundles, never `_source/` records. No FOUNDATIONS read was required.

## Footprint (enumerated 2026-06-07)

| Surface | Disposition |
|---|---|
| `tools/manual-story-studio/` (src, test, web, dist, node_modules, manifests, README) | **Remove** — MSSREMOVE-001 |
| `.github/workflows/ci-manual-story-studio.yml` (only MSS workflow; no aggregator references it) | **Remove** — MSSREMOVE-002 |
| `docs/manual-story-studio/` (README + prose-craft-contract) | **Remove** — MSSREMOVE-003 |
| `docs/ID-ALLOCATION.md` "Manual-story-scoped" section | **Edit (excise section)** — MSSREMOVE-003 |
| `.claude/skills/reassess-spec/{SKILL.md, references/codebase-validation.md, references/foundations-alignment.md}` (10 sites) | **Edit (scrub MSS, keep general rules)** — MSSREMOVE-004 |
| `reports/manual-story-studio-{first..fifth}-iteration.md`, `reports/prompt_example.md` | **Remove** — MSSREMOVE-005 |
| `.codex/run-state/implement-spec-tickets.json` (points at archived SPEC-122) | **Remove** — MSSREMOVE-005 |
| `worlds/erotica-world/manual-stories/` (untracked produced data) | **Remove (working-tree cleanup)** — MSSREMOVE-005 |
| `reports/manifest_2026-06-03.txt` (dated repo-wide snapshot; 263/3371 lines name MSS) | **Retain** — historical snapshot, not an MSS-specific artifact |
| `archive/specs/SPEC-100..124`, `archive/specs/MSSUX-004` (~26 specs) | **Retain** — immutable history (see decision 1) |
| `archive/tickets/{MANSTOSTUFIX,MSSUX,SPEC1xxMANSTOSTU}-*` (~200 tickets) | **Retain** — immutable history |
| `archive/specs/IMPLEMENTATION-ORDER-*.md` (5 dated, mixed-content snapshots) | **Retain** — immutable history |

No root workspace manifest exists (`tools/<pkg>` packages are standalone), so the package is self-contained — no workspace member edit is needed. `CLAUDE.md`, `README.md`, `docs/REPOSITORY-MAP.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` carry zero MSS references.

## Scoping decisions (user-confirmed via AskUserQuestion, 2026-06-07)

1. **Archive scope → leave archives as history.** `archive/specs/` and `archive/tickets/` MSS files and the dated `IMPLEMENTATION-ORDER-*` snapshots are treated as an immutable record of what happened and are NOT deleted. The removal targets only live code, CI, docs, active skill prose, reports, and produced data. The residue sweep (MSSREMOVE-006) excludes `archive/` accordingly.
2. **reassess-spec carve-outs → keep general rules, drop MSS mentions.** Where a rule was generalized (notably the "write-enabled-but-canon-fenced package" carve-out, which cites MSS only as a worked precedent), the rule statement and any non-MSS precedents (e.g., SPEC-87/88/96 read-only examples) are preserved; only MSS-specific worked precedents, ID-class lists, and `tools/manual-story-studio/...` file-path examples are excised. MSS-only clauses/bullets (e.g., the manual-story-studio record-field-verification bullet, the lowercase-`m` ID doc-substitution clauses) are removed entirely, since the surrounding canon/story-bundle rules carry the generalized guidance.

## Ticket map

| Ticket | Scope |
|---|---|
| MSSREMOVE-001 | Delete the `tools/manual-story-studio/` package in full |
| MSSREMOVE-002 | Delete `.github/workflows/ci-manual-story-studio.yml` |
| MSSREMOVE-003 | Remove `docs/manual-story-studio/` + excise the `docs/ID-ALLOCATION.md` Manual-story-scoped section |
| MSSREMOVE-004 | Scrub MSS mentions from `reassess-spec` (keep generalized rules) |
| MSSREMOVE-005 | Remove MSS reports, the codex run-state pointer, and produced local data |
| MSSREMOVE-006 | Repo-wide residue sweep + closeout (lands last) |

Suggested order: 001/002/003/005 in any order, 004 after 003 (one scrub site references the ID-ALLOCATION section 003 removes), 006 last as the closing gate.
