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
   Turn FOUNDATIONS Rules 1 through 7 and structural invariants into executable checks, exposed through `world-validate` and the engine pre-apply gate.
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
- **Phase 2 live surface**: patch-engine writes, validator gating, and engine-only mutation guards become active.
- **Phase 3 optional surface**: `_source/` becomes the canonical storage layer for atomic canon records, with `CANON_LEDGER.md` potentially becoming a compiled artifact.

The docs describe the intended steady-state contract, but any workflow should still be read against the phase it is actually running in.

## Which Layer To Reach For

| Need | Reach for |
|---|---|
| Rebuild or refresh machine-readable world state | `world-index build <world>` / `world-index sync <world>` |
| Inspect indexed structure or diagnose retrieval misses | `world-index stats`, `world-index inspect`, or retrieval MCP tools |
| Gather a skill-sized input bundle | `mcp__worldloom__get_context_packet` |
| Localize a specific node, entity, or neighborhood | `search_nodes`, `get_node`, `get_neighbors`, `find_named_entities` |
| Estimate downstream impact before a write | `find_impacted_fragments`, then validators |
| Apply world-level changes on machine-layer-enabled worlds | `submit_patch_plan` via the patch engine |
| Prove structural integrity | `world-validate <world> --structural` |

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
