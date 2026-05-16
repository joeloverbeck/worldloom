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
world-index render <world-slug> --story <story-slug>
                                         # merged markdown view of indexed story-bundle records;
                                         # story-bundle records are rendered in stable indexed order
world-index stats <world-slug>           # counts by node_type; file freshness
world-index verify <world-slug>          # re-parse disk-backed indexed files; skip synthetic atomic logical rows; flag drift
```

`verify` flags drift between disk-backed indexed rows and current source files, but it does not rewrite stale parser-emitted vocabulary in place. If a schema-version migration changes what `node_type` the parser emits for unchanged source content, recovery belongs in the migration file plus a subsequent `world-index sync`; for severe local drift, `world-index init <world-slug>` deletes the DB and rebuilds from scratch.

## Migration authoring discipline

Each SQL file in `tools/world-index/src/schema/migrations/<NNN>_<slug>.sql` is executed once when `openIndex` detects `recordedVersion < CURRENT_INDEX_VERSION`. Migrations must satisfy the row-staleness contract: if the parser change introduced in the new schema version would emit a different `node_type` for the same source content, the migration must delete existing `nodes` rows whose `(file_path, node_type)` would be reclassified, delete dependent rows, and clear the corresponding `file_versions` rows so incremental sync re-parses the unchanged files.

Comment-only migrations are acceptable only when zero existing rows would be reclassified by the new parser. Otherwise the version file can show the new schema version while `nodes` still contains old parser vocabulary, which can make downstream `list_records`, `get_record`, and context-packet consumers fail on stale rows. MCPENH-049 is the precedent: v5 reclassified `WORLD_KERNEL.md` H2 spans from `section` to `narrative_section`, so migration 005 invalidates those rows and `WORLD_KERNEL.md` file freshness for v4 upgrades; migration 006 reapplies the same repair for indexes that had already recorded the original v5 no-op migration.

## Planned package layout

See `archive/specs/SPEC-01-world-index.md` §Deliverables §Package location.

## Dependencies

- Node.js ≥20
- `better-sqlite3` (SQLite driver)
- `unified` + `remark-parse` + `remark-gfm` (markdown AST)
- `yaml` (YAML parse/serialize)

## Public contract entry

`@worldloom/world-index/public/types` is a narrow public contract surface for `tools/world-mcp/`. It re-exports schema types, enum constants, the current index version, and the atomic logical-file list so retrieval tooling can typecheck SQLite rows and share lifecycle constants against the exact world-index contract.

`@worldloom/world-index/public/canonical-vocabularies` is the shared canonical vocabulary surface for validator and MCP consumers. It exports `CANONICAL_DOMAINS`, `VERDICT_ENUM`, `MYSTERY_STATUS_ENUM`, `MYSTERY_RESOLUTION_SAFETY_ENUM`, `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, `REVISION_DIFFICULTY_VALUES`, and the `CF_TYPE_*` values and coupling sets. It also exports small pure helpers for canonical-domain checks and mystery-resolution-safety coupling. It does not expose a query library or broader programmatic read surface.

## Output location per world

`worlds/<slug>/_index/world.db` (gitignored; regenerable from root-level primary-authored markdown, `_source/*.yaml` atomic records, and story-bundle records under `stories/<story-slug>/_source/**/*.yaml`).

When an atomic or story-bundle YAML record is present on disk but its extracted id does not match the registered schema pattern, `build` / `sync` skip the record instead of inserting an invalid node. Each skipped record is appended to `worlds/<slug>/_index/world.db.skipped_records.log` as tab-separated fields:

```text
<iso8601-timestamp> <file-path> <node-type> <extracted-id-or-> <skip-reason> <expected-pattern>
```

`world-index sync <world-slug>` prints per-record warnings and a summary naming the log path; `--quiet` suppresses the per-record warnings while keeping the summary and log. This is expected for legacy records whose ids no longer match the current schema, such as old `STINT-NNNN-<char>` intention records after the STINT contract tightened to bare numeric `STINT-NNNN`.
