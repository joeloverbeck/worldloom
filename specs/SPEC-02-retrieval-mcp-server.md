<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-02: Retrieval MCP Server

**Phase**: 1
**Depends on**: SPEC-01
**Blocks**: SPEC-03 (submit_patch_plan delegation), SPEC-05 (hooks redirect here), SPEC-06 (skills call these tools)

## Problem Statement

Even with SPEC-01's index, skills need an ergonomic API to retrieve nodes, traverse edges, and assemble context packets. SPEC-05's Hook 2 needs somewhere to redirect blocked raw reads. The current canon-addition pre-flight loads 6 mandatory files + FOUNDATIONS + selective domain files + adjudication directory + templates + pre-figuring scans — each of these should become a single API call returning only the relevant nodes.

**Source context**: `brainstorming/structure-aware-retrieval.md` §3 (retrieval MCP server), §12 (context packet contract), §14 (ranking strategy). Brainstorm decision: exact-match-first retrieval ordering; semantic retrieval as fallback only, not foundation.

## Approach

A Node.js MCP server at `tools/world-mcp/` that reads from SPEC-01's `world.db` and exposes 9 tools over the Model Context Protocol. Retrieval policy is **exact-match-first**: exact ids → exact entity names → heading-path → backlink expansion → lexical (FTS5) → semantic (future fallback). The context-packet assembler enforces the 5-layer contract so skills receive structured evidence, not raw file chunks.

## Deliverables

### Package location

`tools/world-mcp/` — standalone TypeScript package that depends on `tools/world-index/`.

```
tools/world-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts                 # MCP server entry point
│   ├── tools/
│   │   ├── search-nodes.ts
│   │   ├── get-node.ts
│   │   ├── get-neighbors.ts
│   │   ├── get-context-packet.ts
│   │   ├── find-impacted-fragments.ts
│   │   ├── find-named-entities.ts
│   │   ├── find-edit-anchors.ts
│   │   ├── validate-patch-plan.ts       # delegates to SPEC-04 validator framework
│   │   ├── submit-patch-plan.ts         # delegates to SPEC-03 patch engine
│   │   └── allocate-next-id.ts
│   ├── ranking/
│   │   ├── policy.ts                    # ordered ranking pipeline
│   │   └── profiles/                    # per-task-type ranking weights
│   │       ├── canon-addition.ts
│   │       ├── character-generation.ts
│   │       ├── continuity-audit.ts
│   │       └── default.ts
│   ├── context-packet/
│   │   ├── assemble.ts                  # 5-layer composition
│   │   ├── nucleus.ts
│   │   ├── envelope.ts
│   │   ├── constraints.ts
│   │   └── suggested-impact.ts
│   └── approval/
│       └── token.ts                     # approval_token signing/verification
├── tests/
└── .mcp.json.example                    # for user's Claude Code config
```

### Tool surface (9 tools + 1 id-allocation utility)

#### 1. `mcp__worldloom__search_nodes(query, filters)`

- **Input**: `query: string`, `filters: { world_slug?, node_type?, file_path?, entity_name? }`
- **Behavior**: Run ranking pipeline; return top 20 nodes with id, node_type, heading_path, summary, body-truncated-to-200-chars
- **Used by**: open-ended localization

#### 2. `mcp__worldloom__get_node(node_id)`

- **Input**: `node_id: string`
- **Output**: full node body + edges (outgoing + incoming) + entity mentions + content_hash + anchor_checksum
- **Used by**: exact fetch when id is known

#### 3. `mcp__worldloom__get_neighbors(node_id, edge_types, depth)`

- **Input**: `node_id`, `edge_types: string[]` (empty = all), `depth: 1 | 2` (default 1)
- **Output**: graph expansion with per-hop labels
- **Used by**: impact analysis, backlink resolution

#### 4. `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`

- **Input**: `task_type` (see profiles), `seed_nodes: string[]` (ids of known-relevant nodes), `token_budget: number` (default 8000)
- **Output**: 5-layer context packet per the contract below
- **Used by**: skill pre-flight — replaces the eager-load list from the "Large-file method"

#### 5. `mcp__worldloom__find_impacted_fragments(node_ids)`

- **Input**: `node_ids: string[]` (proposed mutation targets)
- **Output**: list of downstream domain-file nodes likely affected (computed via `required_world_update` + `mentions_entity` edges)
- **Used by**: canon-addition Phase 12a (required_world_updates list generation)

#### 6. `mcp__worldloom__find_named_entities(names)`

- **Input**: `names: string[]`
- **Output**: for each name, list of nodes mentioning it (grouped by `node_type`, sorted by mention strength)
- **Used by**: canon-addition's pre-figuring scan (CF proposals naming specific entities)

#### 7. `mcp__worldloom__find_edit_anchors(targets)`

- **Input**: `targets: string[]` (node ids)
- **Output**: for each target, current `anchor_checksum`, `content_hash`, and the exact anchor form (for patch engine consumption)
- **Used by**: patch plan assembly in skills

#### 8. `mcp__worldloom__validate_patch_plan(patch_plan)`

- **Input**: full patch plan envelope per SPEC-03 §Edit Contract
- **Behavior**: delegates to SPEC-04 validator framework in dry-run mode; no writes
- **Output**: structured verdict list
- **Used by**: skills' pre-gate validation

#### 9. `mcp__worldloom__submit_patch_plan(patch_plan, approval_token)`

- **Input**: patch plan + approval_token issued at HARD-GATE approval
- **Behavior**: delegates to SPEC-03 patch engine
- **Output**: applied-patch receipt (applied ops, new file states, new node ids in index after re-sync)
- **Used by**: skills' commit step

#### 10. `mcp__worldloom__allocate_next_id(world_slug, id_class)`

- **Input**: `world_slug`, `id_class: 'CF' | 'CH' | 'PA' | 'DA' | 'CHAR' | 'PR' | 'BATCH' | 'AU' | 'RP' | 'M'`
- **Behavior**: scan index for highest existing id of that class; return next. For unscanned or first-run, returns `<class>-0001`.
- **Output**: the next id as string
- **Used by**: skill pre-flight — replaces grep-and-scan id allocation

### Retrieval policy (hard-coded ranking order)

For every candidate node returned from an underlying query, compute a composite score:

```
score = 100 * exact_id_match
      +  80 * exact_entity_match_in_target_field
      +  50 * heading_path_match
      +  40 * graph_distance_from_seed (1/(distance+1))
      +  25 * file_class_priority (CANON_LEDGER / INVARIANTS / KERNEL higher)
      +  15 * fts5_bm25_score_normalized
      +   5 * semantic_similarity (when enabled; 0 in Phase 1)
      +  10 * recency_of_modification_bonus
```

Weights are the per-task-type profile's **defaults**; profiles may override any weight. Profile `canon-addition` pushes `file_class_priority` higher for CF / CH / INVARIANTS / MR nodes. Profile `character-generation` pushes `mentions_entity` and Mystery Reserve firewall edges higher.

**Exact-match-first guarantee**: any node with `exact_id_match = 1` or `exact_entity_match_in_target_field = 1` always ranks above any node without. This prevents close-enough semantic hits from outranking exact canon anchors.

### Context packet contract (5 layers)

```typescript
interface ContextPacket {
  task_header: {
    task_type: string;              // "canon-addition" | "character-generation" | etc.
    world_slug: string;
    proposal_path?: string;
    detected_entities: string[];
    detected_ids: string[];
    token_budget: number;
  };
  nucleus: {
    // Exact nodes unquestionably relevant. Full body included.
    nodes: NodeWithBody[];          // proposal target, exact derived_from CFs, exact MR entries touched, exact OQ entries touched, exact target prose fragments
  };
  envelope: {
    // Minimal surrounding context. Summaries, not full bodies, when budget tight.
    parent_sections: NodeSummary[];
    siblings_prev: NodeSummary[];
    siblings_next: NodeSummary[];
    backlinks_summary: BacklinkSummary[];
    recent_modification_history: ModificationHistoryEntry[];
    local_style_rules: string[];    // extracted from target file's header / section intro
  };
  constraints: {
    // Validator rules that matter for this patch
    active_validator_rules: string[];    // e.g., ["rule1", "rule2", "rule4", "rule6"]
    prohibited_surfaces: string[];       // paths the skill must not touch
    required_output_schema: string;      // reference to SPEC-03 envelope
    max_patch_surface_area: {
      max_files: number;
      max_ops: number;
    };
    foundations_sections: string[];      // relevant FOUNDATIONS.md sections, summarized
  };
  suggested_impact_surfaces: {
    likely_downstream_files: string[];
    likely_named_entities: string[];
    likely_required_updates: string[];
  };
}
```

**Token budget allocation** (default, tunable per profile):
- Nucleus: 40%
- Envelope: 25%
- Constraints: 15%
- Suggested impact surfaces: 10%
- Overhead (headers, framing): 10%

Over-budget handling: drop from Envelope first (keep only direct siblings, not backlinks summary); then Suggested impact surfaces; never trim Nucleus — if Nucleus alone exceeds budget, return error asking caller to narrow `seed_nodes`.

### Approval token

`mcp__worldloom__submit_patch_plan` requires an `approval_token`. Tokens are HMAC-signed strings produced at HARD-GATE approval time:

```
approval_token = base64(
  payload={plan_id, world_slug, patch_hashes[], issued_at, expires_at},
  signature=hmac_sha256(secret, payload)
)
```

- Secret lives in `tools/world-mcp/.secret` (gitignored; generated on first run)
- Tokens are single-use (recorded in `approval_token_consumed` table after use)
- Tokens expire after 5 minutes
- User approves by presenting the deliverable summary; the skill assembles the token-payload-hash from the presented patch plan; the MCP server signs

This prevents a skill from submitting a different plan than the one the user approved.

### Server lifecycle

- Launched by Claude Code via `.mcp.json` configuration
- Reads from `worlds/<slug>/_index/world.db` (per request; no long-held connection)
- Multi-world: one server instance serves all worlds in repo (resolved per request via `world_slug` argument)
- Sync-on-read: if `file_versions` indicates any file hash drift vs. actual file, server returns an error instructing caller to run `world-index sync`
- Optionally: server calls `world-index sync` itself lazily on first read per session (configurable)

### `.mcp.json` (example)

```json
{
  "mcpServers": {
    "worldloom": {
      "command": "node",
      "args": ["tools/world-mcp/dist/server.js"],
      "env": {}
    }
  }
}
```

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Tooling Recommendation | Every non-negotiable load (Kernel, Invariants, relevant CFs, affected domain files, unresolved contradictions, MR entries) is a `get_context_packet` response layer |
| §Change Control Policy | `submit_patch_plan` is the commit gateway; approval_token ties user consent to specific plan bytes |
| Rule 6 No Silent Retcons | `find_impacted_fragments` surfaces modification_history targets; `modified_by` edges are first-class |
| §Canon Fact Record Schema | `get_node` on a CF returns the full YAML record verbatim; no schema translation |
| HARD-GATE discipline | Approval tokens make user-consent enforceable at commit time |

## Verification

- **Unit**: each tool tested in isolation against a seeded `world.db` fixture
- **Integration**: full canon-addition Phase 0 pre-flight replaced by a single `get_context_packet` call; response size <8k tokens vs current pre-flight's >25k
- **Ranking**: test that exact-id-match always outranks semantic-match; heading-path-match outranks FTS; profile overrides work
- **Approval token**: signed token passes submit; unsigned/expired/tampered rejected
- **Multi-world**: two concurrent requests for different worlds return distinct results
- **Empty index**: server returns structured error, not crash
- **Out-of-sync index**: server rejects stale `world.db` (file_versions drift)

## Out of Scope

- Semantic retrieval implementation (`semantic_similarity` weight stays 0 in Phase 1; separate future spec enables it)
- Authentication between MCP and client (relies on Claude Code's local-only MCP trust model)
- Multi-user concurrency within one world (single-user assumption)
- Cross-world queries
- GraphQL-style query language (tool surface is purpose-built)

## Risks & Open Questions

- **Context packet budget tuning**: 8k default may be too tight for escalated canon-addition runs (6 critic sub-agents). Mitigation: per-task-type override; measure in SPEC-08 Phase 1 pilot and adjust.
- **Approval token replay**: theoretical risk if secret leaks. Mitigation: secret is per-install, tokens single-use, tokens expire quickly, local-only trust model.
- **Lazy sync-on-read**: introduces startup latency on stale indices. Mitigation: explicit `world-index sync` in Hook 5 after writes keeps index fresh; server sync-on-read is a safety net.
- **File-class priority weighting**: hand-tuned in Phase 1; may need per-world calibration. Mitigation: expose weights in config; log ranking decisions for debugging.
