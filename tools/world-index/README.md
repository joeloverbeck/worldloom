# world-index

SQLite-backed structure-aware index over worldloom world sources. Parsed nodes, typed edges, entity mentions, anchor checksums — the machine-facing view that every other tool in `tools/` consumes.

**Design**: `archive/specs/SPEC-01-world-index.md`
**Phase**: 1
**Status**: core package implemented; public types entry added for SPEC-02

## CLI

```
world-index init <world-slug>            # initialize an empty schema-applied world.db
world-index build <world-slug>           # full rebuild
world-index sync <world-slug> [--quiet]  # incremental; --quiet suppresses per-record skip warnings
world-index inspect <node-id>            # JSON dump of a single node
world-index render <world-slug> --story <story-slug> [--arc-traces]
                                         # merged markdown view of indexed story-bundle records;
                                         # ARC_TRACE records are opt-in
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

`@worldloom/world-index/public/types` is a narrow public contract surface for `tools/world-mcp/`. It re-exports schema types, enum constants, ARC_TRACE index row shape, the current index version, and the atomic logical-file list so retrieval tooling can typecheck SQLite rows and share lifecycle constants against the exact world-index contract.

`@worldloom/world-index/public/canonical-vocabularies` is the shared canonical vocabulary surface for validator and MCP consumers. It exports the canonical domain list, adjudication verdict enum, mystery status enum, mystery resolution-safety enum, scene-commitment arc enums (`commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, and `stop_predicate`), and small pure helpers. It does not expose a query library or broader programmatic read surface.

## Output location per world

`worlds/<slug>/_index/world.db` (gitignored; regenerable from root-level primary-authored markdown, `_source/*.yaml` atomic records, and story-bundle records under `stories/<story-slug>/_source/**/*.yaml`).

When an atomic or story-bundle YAML record is present on disk but its extracted id does not match the registered schema pattern, `build` / `sync` skip the record instead of inserting an invalid node. Each skipped record is appended to `worlds/<slug>/_index/world.db.skipped_records.log` as tab-separated fields:

```text
<iso8601-timestamp> <file-path> <node-type> <extracted-id-or-> <skip-reason> <expected-pattern>
```

`world-index sync <world-slug>` prints per-record warnings and a summary naming the log path; `--quiet` suppresses the per-record warnings while keeping the summary and log. This is expected for legacy records whose ids no longer match the current schema, such as old `STINT-NNNN-<char>` intention records after the STINT contract tightened to bare numeric `STINT-NNNN`.
