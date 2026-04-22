# world-index

SQLite-backed structure-aware index over worldloom markdown world files. Parsed nodes, typed edges, entity mentions, anchor checksums — the machine-facing view that every other tool in `tools/` consumes.

**Design**: `specs/SPEC-01-world-index.md`
**Phase**: 1
**Status**: not yet implemented

## Planned CLI

```
world-index build <world-slug>           # full rebuild
world-index sync <world-slug>            # incremental
world-index inspect <node-id>            # JSON dump of a single node
world-index stats <world-slug>           # counts by node_type; file freshness
world-index verify <world-slug>          # re-hash all nodes; flag drift
```

## Planned package layout

See `specs/SPEC-01-world-index.md` §Deliverables §Package location.

## Dependencies

- Node.js ≥20
- `better-sqlite3` (SQLite driver)
- `unified` + `remark-parse` + `remark-gfm` (markdown AST)
- `yaml` (YAML parse/serialize)

## Output location per world

`worlds/<slug>/_index/world.db` (gitignored; regenerable from markdown).
