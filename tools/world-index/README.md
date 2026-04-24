# world-index

SQLite-backed structure-aware index over worldloom world sources. Parsed nodes, typed edges, entity mentions, anchor checksums — the machine-facing view that every other tool in `tools/` consumes.

**Design**: `archive/specs/SPEC-01-world-index.md`
**Phase**: 1
**Status**: core package implemented; public types entry added for SPEC-02

## Planned CLI

```
world-index build <world-slug>           # full rebuild
world-index sync <world-slug>            # incremental
world-index inspect <node-id>            # JSON dump of a single node
world-index stats <world-slug>           # counts by node_type; file freshness
world-index verify <world-slug>          # re-parse disk-backed indexed files; skip synthetic atomic logical rows; flag drift
```

## Planned package layout

See `archive/specs/SPEC-01-world-index.md` §Deliverables §Package location.

## Dependencies

- Node.js ≥20
- `better-sqlite3` (SQLite driver)
- `unified` + `remark-parse` + `remark-gfm` (markdown AST)
- `yaml` (YAML parse/serialize)

## Public contract entry

`@worldloom/world-index/public/types` is a narrow public contract surface for `tools/world-mcp/`. It re-exports schema types, enum constants, the current index version, and the atomic logical-file list so retrieval tooling can typecheck SQLite rows and share lifecycle constants against the exact world-index contract. It does not expose a query library, runtime helper, or any broader programmatic read surface.

## Output location per world

`worlds/<slug>/_index/world.db` (gitignored; regenerable from root-level primary-authored markdown and `_source/*.yaml` atomic records).
