# Machine-Facing Layer

Worldloom's human-facing contract lives in markdown and YAML under `worlds/<slug>/`. The machine-facing layer is the retrieval, mutation, validation, and enforcement stack that lets skills operate on that world state structurally instead of by loading or editing prose directly.

This doc is the operational overview. The design details still live in the numbered specs and the tool package READMEs.

## Layers

1. **World index (`tools/world-index/`, SPEC-01)**  
   Builds `worlds/<slug>/_index/world.db`, a deterministic SQLite artifact containing parsed nodes, typed edges, anchor checksums, and search surfaces.
2. **Retrieval MCP (`tools/world-mcp/`, SPEC-02)**  
   Exposes the index as `mcp__worldloom__*` tools such as `search_nodes`, `get_node`, `get_neighbors`, and `get_context_packet`.
3. **Patch engine (`tools/patch-engine/`, SPEC-03)**  
   Applies typed patch plans with anchor-based targeting, append-only vocabulary, two-phase commit, and engine-controlled write ordering.
4. **Validators (`tools/validators/`, SPEC-04)**  
   Turn FOUNDATIONS Rules 1 through 7 and structural invariants into executable checks, exposed through `world-validate` and the engine pre-apply gate. On the patch-engine submission path, validator-run telemetry is reported via `PatchReceipt.validators_run[]` (success) or `EngineError.validators_run[]` (failure) — each entry carries `validator_name`, `status` (`pass` / `fail` / `skipped`), `duration_ms`, and an optional `detail` populated when status is not `pass`. Consumers that don't read `validators_run` are unaffected by its presence.
5. **Hooks (`tools/hooks/`, SPEC-05)**  
   Make retrieval and mutation discipline structural in Claude Code by blocking oversized reads, blocking direct writes to engine-only surfaces, bootstrapping subagents, and auto-running validation.

## How The Layers Compose

```text
world markdown/YAML
  -> world-index build/sync
  -> _index/world.db
  -> world-mcp retrieval tools
  -> context packet or localized node reads
  -> skill analysis
  -> patch plan
  -> validators + patch engine
  -> working tree writes
  -> index refresh / follow-up validation
```

Read-side work can stop after the retrieval layer. Write-side work adds validators, approval-token discipline, and patch-engine submission.

## Phase Boundaries

- **Phase 1 live surface**: `world-index` is implemented; the docs now reserve the retrieval and hook contract that SPEC-02, SPEC-05 Part A, and SPEC-06 Part A target.
- **Phase 1.5 canonical storage layer**: on machine-layer-enabled worlds, `_source/` atomic YAML is the sole source-of-truth for atomized CF / CH / INV / M / OQ / ENT / SEC records. The retired root-level files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, and `PEOPLES_AND_SPECIES.md`) do not exist on those worlds. Merged markdown views, if produced, are human-facing surfaces only (see `world-index render <world-slug> [--file <class>]` CLI — not delivered in this phase; driven by a future human-UX spec if/when authored); they are read-only and are not persisted. LLM agents consume atomic records via `mcp__worldloom__get_record` / `get_context_packet` instead. See SPEC-13 and `docs/FOUNDATIONS.md` §Canonical Storage Layer for the full contract.
- **Phase 2 live surface**: patch-engine writes, validator gating, and engine-only mutation guards become active.

The docs describe the intended steady-state contract, but any workflow should still be read against the phase it is actually running in.

## Which Layer To Reach For

| Need | Reach for |
|---|---|
| Rebuild or refresh machine-readable world state | `world-index build <world>` / `world-index sync <world>` |
| Inspect indexed structure or diagnose retrieval misses | `world-index stats`, `world-index inspect`, or retrieval MCP tools |
| Gather a skill-sized input bundle | `mcp__worldloom__get_context_packet` |
| Localize a specific node, record field, entity, or neighborhood | `search_nodes`, `get_node`, `get_record`, `list_records`, `get_record_field`, `get_neighbors`, `find_named_entities` |
| Localize source-local names that are not world-level canonical entities | `find_named_entities.scoped_matches`, `get_node.scoped_references`, and `search_nodes` with `reference_name` or `include_scoped_references` |
| Estimate downstream impact before a write | `find_impacted_fragments`, then validators |
| Validate a patch plan envelope without mutating world content | `validate_patch_plan`, which returns `status: "pass"`, `status: "fail"` with validator verdicts, or `status: "skipped"` with a reason when the envelope cannot be validated |
| Apply world-level changes on machine-layer-enabled worlds | `submit_patch_plan` via the patch engine |
| Prove structural integrity | `world-validate <world> --structural` |

## Retrieval Tool Scope

| Tool | Reads |
|---|---|
| `search_nodes` | FTS5 lexical node content plus structured filters such as node type, file path, canonical entity name, and scoped-reference name. Default mode is capped and ranked. Use `exhaustive: true` for Rule 6 audit scans that need presence/absence confirmation across prose bodies; exhaustive results are sorted by `node_id` and include `match_locations[]`. |
| `get_node` | One indexed node plus its structured links, mentions, scoped references, and file metadata. |
| `get_record` | The full parsed record for a structured id such as CF / CH / M / OQ / SEC / PA / DA / CHAR. Use this after context-packet previews before citing record content. |
| `list_records` | All parsed atomic records for one supported record type, with optional top-level field projection. Use for bulk-type sweeps such as every invariant or every Mystery Reserve firewall block. `record_id` is always included in projected records; large CF or SEC sweeps should be reserved for deliberate audit workflows. |
| `get_record_field` | A single field of a parsed atomic record. Use when the field is small and the record body is large, such as `touched_by_cf` on a large SEC record. Reuses `get_record`'s record-resolution path. |
| `get_record_schema` | JSON Schema for a record class plus transitively referenced schemas. Use to discover field constraints, regex patterns, enum values, and required/optional fields before authoring a record draft. |
| `get_neighbors` | Graph edges from the indexed node/record graph. Use for ontology and locality expansion. |
| `get_context_packet` | Ranked packet of Kernel, Invariants, relevant records, neighbors, and section context. Body previews are generally truncated and full text requires `get_record`; task-specific governing nodes may carry parsed `record` projections, such as `character_generation` invariant records and Mystery Reserve firewall fields. Omitted budgets use per-task defaults (`canon_addition` currently 16000; `propose_new_canon_facts` and `propose_new_characters` 15000; `propose_new_worlds_from_preferences` and `canon_facts_from_diegetic_artifacts` 12000; remaining task types 8000), and incomplete-packet errors include `retry_with.token_budget`. Optional `delivery_mode: 'full' \| 'summary_only'` (default `'full'`) selects per-node payload shape — `summary_only` replaces every node's `body_preview` with a ≤100-char `summary` for "what's relevant" index passes (see `docs/CONTEXT-PACKET-CONTRACT.md` §Delivery Modes). |
| `find_impacted_fragments` | Records and fragments likely affected by proposed changes to named nodes or CFs. Use before write assembly to catch incomplete downstream-update lists. |
| `find_sections_touched_by` | SEC records whose `touched_by_cf[]` currently cites a candidate CF. Use for modification-history axis-(c) judgments. |
| `find_named_entities` | Canonical entity names, entity aliases, scoped-reference display names, and scoped-reference aliases. This is exact-match resolution, not full-text search. Region descriptors (`drylands`, `canal-heartland`) and era descriptors (`Charter-Era`, `Incident Wave`) that appear only as parts of compound tokens may return empty with `hints[]`; use `search_nodes(query=...)` for those content lookups. Pair with `search_nodes(exhaustive: true)` for lexical-only Rule 6 evidence. |

**Recommended composition**: packet first (locality survey via `get_context_packet`), then `get_record` / `get_record_field` for full bodies of load-bearing nodes the packet cites unless a task-specific governing node already carries the required parsed `record` projection. See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern.

## Trust tiers

Retrieval now distinguishes four trust tiers instead of flattening everything into either canonical entities or lexical hits:

1. **Canonical entity** — world-level ontology or other declared canonical authority.
2. **Exact structured record edge** — deliberate record-to-record linkage already present in structured ids or fields.
3. **Scoped reference** — explicit source-local retrieval anchor declared on an authority-bearing record without promoting it to world-level ontology.
4. **Lexical evidence** — unresolved phrase evidence used for recall and debugging, not authority.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Retrieval tools report missing or stale nodes | `_index/world.db` is absent or out of date | Run `world-index build <world>` or `world-index sync <world>` |
| A skill still wants giant raw reads | Retrieval integration is incomplete for that skill or phase | Use the current skill contract, but treat the context-packet path as the target state |
| Direct Edit/Write is blocked on protected paths | Hook 3 sees an engine-only surface | Route the change through a patch plan instead of direct file editing |
| Validation fails after a write | Rule or structural invariant violation | Fix the underlying world state and rerun validation; do not bypass the validator surface |

## Where Details Live

- `docs/FOUNDATIONS.md` — authoritative contract
- [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md) — formal packet shape
- `tools/README.md` — package map
- `tools/world-index/README.md` — index CLI and artifact contract
- `tools/world-mcp/README.md` — retrieval tool inventory and approval-token notes
- `tools/patch-engine/README.md` — op vocabulary, atomicity, write order
- `tools/validators/README.md` — validator inventory and CLI
- `tools/hooks/README.md` — hook inventory and rollout phases

## Rollback Posture

The machine-facing layer is deliberately degradable:

- Removing `_index/` only removes the derived index; human-facing world files remain authoritative.
- If hooks are not configured, Claude continues to run; enforcement falls back to skill and operator discipline.
- If the patch engine is not yet live for a workflow, the existing skill-side write path remains the current behavior.

That degradation path is a migration feature, not a license to bypass the machine-facing contract once a world or workflow has been moved onto it.
