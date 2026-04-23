<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-02: Retrieval MCP Server

**Phase**: 1
**Depends on**: SPEC-01 (archived at `archive/specs/SPEC-01-world-index.md`; exports public schema types per Deliverable 3 below), SPEC-10 (archived at `archive/specs/SPEC-10-entity-surface-redesign.md`; defines `find_named_entities` / `find_impacted_fragments` / `search_nodes.entity_name` contracts)
**Blocks**: SPEC-03 (submit_patch_plan delegation; owns `approval_tokens_consumed` schema per §Approval token), SPEC-05 (hooks redirect blocked reads here), SPEC-06 (skills call these tools), SPEC-07 Part B (WORKFLOWS.md + HARD-GATE-DISCIPLINE.md edits once tool surface lands)

## Problem Statement

Even with SPEC-01's index, skills need an ergonomic API to retrieve nodes, traverse edges, and assemble context packets. SPEC-05's Hook 2 needs somewhere to redirect blocked raw reads. The current canon-addition pre-flight loads 6 mandatory files + FOUNDATIONS + selective domain files + adjudication directory + templates + pre-figuring scans — each of these should become a single API call returning only the relevant nodes.

**Source context**: `brainstorming/structure-aware-retrieval.md` §3 (retrieval MCP server), §12 (context packet contract), §14 (ranking strategy). Brainstorm decision: exact-match-first retrieval ordering; semantic retrieval as fallback only, not foundation.

## Approach

A Node.js MCP server at `tools/world-mcp/` that reads `worlds/<slug>/_index/world.db` as a **read-only SQLite artifact** (per SPEC-01 §Public contract: world-index is a pure producer and does not export a programmatic query library; consumers open the SQLite file via their own `better-sqlite3` connection). The server exposes 9 tools + 1 id-allocation utility over the Model Context Protocol. Retrieval policy is **exact-match-first**: exact ids → exact entity names → heading-path → backlink expansion → lexical (FTS5) → semantic (future fallback). The context-packet assembler implements the canonical shape defined in `docs/CONTEXT-PACKET-CONTRACT.md` (landed 2026-04-23 via SPEC-07 Part A; named authoritative by FOUNDATIONS.md §Machine-Facing Layer).

## Deliverables

### Package location

`tools/world-mcp/` — standalone TypeScript package. It **reads** `worlds/<slug>/_index/world.db` directly via its own `better-sqlite3` connection; it does **not** import `tools/world-index` as a query library. It **imports shared schema types** (TypeScript-only: `CanonFactRecord`, `ChangeLogEntry`, `NodeType`, `EdgeType`, `ModificationHistoryEntry`, entity/edge enum constants) from world-index's new public-types re-export entry (see Deliverable 3). It also imports `tools/patch-engine` (Phase 2) and `tools/validators` (Phase 2) as runtime dependencies.

```
tools/world-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts                 # MCP server entry point
│   ├── db/
│   │   ├── open.ts               # per-request better-sqlite3 connection + index_version check
│   │   └── path.ts               # world_slug → worlds/<slug>/_index/world.db resolution
│   ├── tools/
│   │   ├── search-nodes.ts
│   │   ├── get-node.ts
│   │   ├── get-neighbors.ts
│   │   ├── get-context-packet.ts
│   │   ├── find-impacted-fragments.ts
│   │   ├── find-named-entities.ts
│   │   ├── find-edit-anchors.ts
│   │   ├── validate-patch-plan.ts       # delegates to SPEC-04 validator framework
│   │   ├── submit-patch-plan.ts         # Phase 1: stub; Phase 2: delegates to SPEC-03 patch engine
│   │   └── allocate-next-id.ts
│   ├── ranking/
│   │   ├── policy.ts                    # lexicographic-band ranking pipeline
│   │   └── profiles/                    # per-task-type ranking weights
│   │       ├── canon-addition.ts
│   │       ├── character-generation.ts
│   │       ├── continuity-audit.ts
│   │       └── default.ts
│   ├── context-packet/
│   │   ├── assemble.ts                  # 5-layer composition per CONTEXT-PACKET-CONTRACT.md
│   │   ├── nucleus.ts
│   │   ├── envelope.ts
│   │   ├── constraints.ts
│   │   └── suggested-impact.ts
│   ├── approval/
│   │   └── token.ts                     # approval_token signing; verification lives in SPEC-03 engine
│   └── errors.ts                        # structured error-code taxonomy
├── tests/
│   ├── fixtures/
│   │   └── seeded-world.db              # pre-built deterministic fixture
│   ├── tools/                           # per-tool unit tests
│   │   ├── search-nodes.test.ts
│   │   ├── get-node.test.ts
│   │   ├── get-neighbors.test.ts
│   │   ├── get-context-packet.test.ts
│   │   ├── find-impacted-fragments.test.ts
│   │   ├── find-named-entities.test.ts
│   │   ├── find-edit-anchors.test.ts
│   │   ├── validate-patch-plan.test.ts
│   │   ├── submit-patch-plan.test.ts
│   │   └── allocate-next-id.test.ts
│   ├── ranking/
│   │   └── exact-match-ordering.test.ts
│   ├── approval/
│   │   └── token-lifecycle.test.ts
│   └── integration/
│       ├── context-packet-canon-addition.test.ts
│       └── multi-world.test.ts
└── .mcp.json.example                    # for user's Claude Code config
```

#### Dependencies

npm dependencies (all pinned; match sibling tools where overlap exists):

- `@modelcontextprotocol/sdk` — MCP server framework (`^1.0.0` or latest 1.x at implementation time)
- `better-sqlite3` — synchronous SQLite driver; pinned to `12.2.0` to match `tools/world-index/package.json:17`

Dev dependencies:

- `@types/better-sqlite3` — at the same version tracked by `tools/world-index/package.json` (`7.6.13`)
- `@types/node` (`24.7.2`)
- `typescript` (`5.9.3`)

Internal (workspace) dependencies:

- `@worldloom/world-index` — **types-only import** through its new public-types entry (see Deliverable 3); no runtime query library is consumed
- `@worldloom/patch-engine` — runtime import for Phase 2 `submit_patch_plan` delegation
- `@worldloom/validators` — runtime import for `validate_patch_plan` (Phase 1 stubbed when validators not yet built; Phase 2 live)

### Tool surface (9 tools + 1 id-allocation utility)

#### 1. `mcp__worldloom__search_nodes(query, filters)`

- **Input**: `query: string`, `filters: { world_slug?, node_type?, file_path?, entity_name? }`
- **`entity_name` semantics**: exact match against `entities.canonical_name` OR `entity_aliases.alias_text` only. It never matches unresolved `entity_mentions.surface_text`; callers that need unresolved surface-phrase recall should use `find_named_entities(names).surface_matches` instead. SPEC-10 §Deliverable 6 is authoritative for this contract.
- **Behavior**: Run ranking pipeline (see §Retrieval policy); return top 20 nodes with `id`, `node_type`, `heading_path`, `summary`, `body_preview` (body truncated to 200 chars)
- **`summary` field in Phase 1**: `nodes.summary` is populated by SPEC-01 Phase 1.5 (Out of Scope for SPEC-01 Phase 1). In Phase 1, expect `summary: string | null`; when null, callers fall back to `body_preview`. Do not drop the field from the response shape — it returns `null` so Phase 1.5 wire-up is non-breaking.
- **Used by**: open-ended localization

#### 2. `mcp__worldloom__get_node(node_id)`

- **Input**: `node_id: string`
- **Output**: full node body + edges (outgoing + incoming) + entity mentions + `content_hash` + `anchor_checksum`
- **Used by**: exact fetch when id is known

#### 3. `mcp__worldloom__get_neighbors(node_id, edge_types, depth)`

- **Input**: `node_id`, `edge_types: string[]` (empty = all), `depth: 1 | 2` (default 1)
- **Output**: graph expansion with per-hop labels
- **Used by**: impact analysis, backlink resolution

#### 4. `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`

- **Input**:
  - `task_type: 'canon_addition' | 'character_generation' | 'diegetic_artifact_generation' | 'continuity_audit' | 'other'` (snake_case, matching `docs/CONTEXT-PACKET-CONTRACT.md`'s `task_type` enum; distinct from kebab-case skill directory names)
  - `seed_nodes: string[]` (ids of known-relevant nodes)
  - `token_budget: number` (default 8000)
- **Output**: the 5-layer context packet as specified by `docs/CONTEXT-PACKET-CONTRACT.md` (authoritative). The assembler's responsibility is to populate the canonical shape; it does not define a competing TypeScript shape in this spec. See §Context packet assembler below for the budget allocation, over-budget handling, and task-type-profile mapping this spec owns.
- **Used by**: skill pre-flight — replaces the eager-load list from the "Large-file method"

#### 5. `mcp__worldloom__find_impacted_fragments(node_ids)`

- **Input**: `node_ids: string[]` (proposed mutation targets)
- **Output**: list of downstream domain-file nodes likely affected (computed via `required_world_update` + canonical `mentions_entity` edges only)
- **Fallback semantics**: if an implementation adds phrase-search fallback, fallback-derived results must be explicitly flagged `noncanonical_fallback` and must not share the same ranking weight as canonical entity-link hits. SPEC-10 §Deliverable 6 is authoritative for this contract.
- **Used by**: canon-addition Phase 12a (required_world_updates list generation)

#### 6. `mcp__worldloom__find_named_entities(names)`

- **Input**: `names: string[]`
- **Output**: `{ canonical_matches, surface_matches }`
  - `canonical_matches`: exact canonical-name or alias matches, grouped by entity and then by mentioning `node_type`; each entity carries its `provenance_scope` per SPEC-10 so callers can filter world-scope from proposal-scope
  - `surface_matches`: unresolved exact surface-text matches, grouped by `node_type` and labeled `noncanonical`
  - Default sort order: canonical exact name, canonical exact alias, unresolved exact surface text
- **Contract source**: SPEC-10 §Deliverable 6 is authoritative for this split precision-vs-recall surface.
- **Used by**: canon-addition's pre-figuring scan (CF proposals naming specific entities)

#### 7. `mcp__worldloom__find_edit_anchors(targets)`

- **Input**: `targets: string[]` (node ids)
- **Output**: for each target, the current `anchor_checksum` and `content_hash` (from `nodes`), plus the exact `anchor_form` (from the `anchor_checksums` table — the authoritative text source, per SPEC-01 §SQLite schema lines 130–135; `nodes.anchor_checksum` is a denormalized copy of the checksum only, not of the anchor text)
- **Used by**: patch plan assembly in skills

#### 8. `mcp__worldloom__validate_patch_plan(patch_plan)`

- **Input**: full patch plan envelope per SPEC-03 §Edit Contract
- **Behavior**: delegates to SPEC-04 validator framework in dry-run mode; no writes
- **Output**: structured verdict list (shape per SPEC-04 §Verdict schema)
- **Phase 1 behavior**: validators package may not be live yet; if absent, returns a structured error `validator_unavailable` rather than a partial verdict
- **Used by**: skills' pre-gate validation

#### 9. `mcp__worldloom__submit_patch_plan(patch_plan, approval_token)`

- **Input**: patch plan + `approval_token` issued at HARD-GATE approval
- **Phase 1 behavior**: returns `{ code: 'phase1_stub', message: 'Engine integration activates in Phase 2 per SPEC-08.' }` — the stub deliberately does not forward to a nonexistent engine. Hook 3 (Phase 2) is what enforces that skills must not bypass the engine; during Phase 1 the stub plus skill discipline suffice.
- **Phase 2 behavior**: forwards envelope + token to SPEC-03 patch engine. Engine verifies HMAC and `patch_hashes`, applies ops via two-phase commit, marks the token consumed, triggers index sync. Returns the applied-patch receipt (applied ops, new file states, new node ids in index after re-sync).
- **Used by**: skills' commit step

#### 10. `mcp__worldloom__allocate_next_id(world_slug, id_class)`

- **Input**: `world_slug`, `id_class: 'CF' | 'CH' | 'PA' | 'CHAR' | 'DA' | 'PR' | 'BATCH' | 'NCP' | 'NCB' | 'AU' | 'RP' | 'M'`
- **`id_class` coverage rationale**: matches CLAUDE.md §ID Allocation Conventions (`CF`, `CH`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `AU`, `RP`) plus live but under-documented classes that the world index already treats as first-class: `NCP` (character proposal cards) and `NCB` (character proposal batches) emitted by `propose-new-characters` (live evidence: 7 NCP + 1 NCB in animalia per SPEC-01 empirical scale), and `M` (Mystery Reserve entries; structured id per SPEC-01 §Node ID scheme line 241 as `M-1`, `M-2`, …). The CLAUDE.md documentation gap for `M`, `NCP`, and `NCB` is a known follow-up flagged in SPEC-01's Risks and tracked for a future docs update — SPEC-02 conforms to the implementation surface, not the stale docs surface.
- **Behavior**: scan index for highest existing id of that class; return next. For unscanned or first-run, returns `<class>-0001` (or `M-1` for the `M` class, which uses a single-digit numeric form per SPEC-01 §Node ID scheme).
- **Output**: the next id as string
- **Used by**: skill pre-flight — replaces grep-and-scan id allocation

### Retrieval policy (lexicographic sort bands with in-band weighted score)

The spec's original "exact-match-first guarantee" cannot be enforced by weighted-sum alone (a non-exact candidate scoring fully on every other dimension can out-sum a bare exact match). Ranking is therefore lexicographic across **sort bands**; weights apply only within a band.

**Sort bands, in order of precedence**:

1. **Band E1 — exact id match** (`exact_id_match = 1`): candidate's `node_id` or any resolved id reference matches the query's parsed id
2. **Band E2 — exact entity match** (`exact_entity_match_in_target_field = 1`): candidate mentions an entity that exactly matches the query's parsed entity via `entities.canonical_name` or `entity_aliases.alias_text`
3. **Band W — weighted score**: everything else, ordered by the composite score below

Within each band, ties are broken by the weighted-score formula:

```
score = 50 * heading_path_match
      + 40 * graph_distance_from_seed (1/(distance+1))
      + 25 * file_class_priority (CANON_LEDGER / INVARIANTS / KERNEL higher)
      + 15 * fts5_bm25_score_normalized
      +  5 * semantic_similarity (when enabled; 0 in Phase 1)
      + 10 * recency_of_modification_bonus
```

Weights are the per-task-type profile's **defaults**; profiles may override any weight. Profile `canon_addition` pushes `file_class_priority` higher for CF / CH / INVARIANTS / MR nodes. Profile `character_generation` pushes `mentions_entity` and Mystery Reserve `firewall_for` edge weight higher.

**Exact-match-first guarantee (corrected)**: any node in Band E1 ranks above any node in Band E2, which ranks above any node in Band W — regardless of weighted-score comparison. This prevents semantically close weighted hits from outranking exact canon anchors.

### Context packet assembler

`mcp__worldloom__get_context_packet` produces the canonical packet shape defined by `docs/CONTEXT-PACKET-CONTRACT.md`. This spec owns the **assembler**, not the **shape**. The assembler is responsible for:

- populating `task_header` with `task_type`, `world_slug`, `generated_at`, `packet_version: 1`, `seed_nodes`, and `token_budget: { requested, allocated }`
- selecting nucleus nodes per task-type profile (e.g., `canon_addition` pulls CF records cited by the proposal, INVARIANTS nodes whose `domains_affected` intersect the proposal, and MR entries whose `firewall_for` edges target the proposed CF)
- selecting envelope nodes to contextualize the nucleus without recreating whole-file reads, attaching a `why_included[]` entry per node
- populating `constraints` with `active_rules`, `protected_surfaces`, `required_output_schema`, `prohibited_moves`, `open_risks` — reading live validator state from `validation_results` where applicable
- populating `suggested_impact_surfaces` with `nodes[]` and `rationale[]` derived from `required_world_update` edges + `mentions_entity` edges (canonical only)

**Token budget allocation** (defaults; tunable per profile):

- Nucleus: 40%
- Envelope: 25%
- Constraints: 15%
- Suggested impact surfaces: 10%
- Overhead (headers, framing, `why_included` rationales): 10%

**Over-budget handling**: drop from Envelope first; then Suggested impact surfaces; then Constraints' `open_risks` (keep `active_rules` and `protected_surfaces` always). Never trim Nucleus — if Nucleus alone exceeds budget, return a structured error asking the caller to narrow `seed_nodes`. The assembler sets `task_header.token_budget.allocated` to the final computed size so callers can observe budget pressure.

**Packet version**: v1 is the shape defined by CONTEXT-PACKET-CONTRACT.md. Any assembler change that alters the observable packet shape MUST bump `packet_version` and be reflected in the canonical doc — never silently.

### Approval token

`mcp__worldloom__submit_patch_plan` requires an `approval_token`. The MCP server **signs** tokens at HARD-GATE approval time; the patch engine **verifies** them at apply time (SPEC-03 Phase A step 1). The secret is a shared file, not a shared code path.

```
approval_token = base64(
  payload={plan_id, world_slug, patch_hashes[], issued_at, expires_at},
  signature=hmac_sha256(secret, payload)
)
```

- **Secret file**: lives at `tools/world-mcp/.secret` (gitignored; generated on first run). The MCP server owns its lifecycle (creation, rotation). The patch engine (`tools/patch-engine/src/approval/verify-token.ts` per SPEC-03:56) reads the same file for verification — this coupling is deliberate and is the only cross-package filesystem dependency between MCP and engine.
- **Tokens are single-use**: consumption is recorded in the **`approval_tokens_consumed` table** (plural, aligned with SPEC-03:192 and SPEC-07:120). The table lives in per-world `worlds/<slug>/_index/world.db`; the patch engine is authoritative for writing the row at SPEC-03 Phase B step 5, and the MCP server never writes it directly. Rebuilding the world index (`world-index build`) clears the table along with the rest of `world.db` — this is intentional: stale tokens from a prior index shouldn't be honored after a rebuild. The table's schema is declared by SPEC-03 (engine-owned). A cross-spec edit to SPEC-03 is required to land this declaration; noted in §Risks & Open Questions.
- **Tokens expire** after 5 minutes
- **Flow**: user approves by inspecting the deliverable summary; the skill assembles the token-payload-hash from the presented patch plan; the MCP server signs it and returns the token; the skill submits; the engine verifies signature + expiry + single-use-not-yet-consumed; on apply, the engine marks the token consumed

This prevents a skill from submitting a different plan than the one the user approved.

### Server lifecycle

- **Launch**: by Claude Code via `.mcp.json` configuration (per-user setup; example in the `.mcp.json.example` file this package ships)
- **Path resolution**: `world_slug` → `worlds/<slug>/_index/world.db` relative to repo root; not configurable (deterministic for audit simplicity)
- **Connection**: per-request, no long-held connection; each tool opens the SQLite file with `better-sqlite3` in read-only mode (Phase 1) or read-write (Phase 2, only for the engine's marking-token-consumed write — MCP itself remains read-only)
- **Index-version check** (on every tool call): read `worlds/<slug>/_index/index_version.txt`; compare against the MCP server's expected schema version (shipped as a constant). On mismatch, return structured error `index_version_mismatch { expected, actual, remedy: 'run world-index build' }` per SPEC-01 §Public contract
- **Multi-world**: one server instance serves all worlds in the repo (resolved per request via `world_slug`)
- **Stale-index drift detection**: default to **cheap mtime pre-check** — compare each referenced file's filesystem mtime against `file_versions.last_indexed_at`; only when mtime is newer does the server re-hash to confirm drift. Full re-hash per read (the conservative safety net) is opt-in via a server-config flag. On confirmed drift, return structured error `stale_index { drifted_files[], remedy: 'run world-index sync' }`
- **Graceful startup**: empty index returns `empty_index { world_slug }`; missing world returns `world_not_found { world_slug }`

### Error taxonomy

Structured error codes returned by MCP tools (mirrors SPEC-03's naming style):

| Code | Returned by | Meaning |
|------|-------------|---------|
| `index_missing` | all tools | `worlds/<slug>/_index/world.db` does not exist |
| `invalid_input` | tools with structured argument validation | malformed tool arguments or missing required fields |
| `index_version_mismatch` | all tools | `index_version.txt` does not match server's expected schema |
| `stale_index` | all tools | filesystem drift detected vs. `file_versions` |
| `empty_index` | all tools | index exists but contains zero nodes |
| `world_not_found` | all tools | `worlds/<slug>/` does not exist |
| `node_not_found` | `get_node`, `get_neighbors`, `find_edit_anchors` | referenced `node_id` not in index |
| `token_invalid` | `submit_patch_plan` | HMAC signature fails verification |
| `token_expired` | `submit_patch_plan` | `expires_at` is in the past |
| `token_consumed` | `submit_patch_plan` | token present in `approval_tokens_consumed` |
| `token_tampered` | `submit_patch_plan` | `patch_hashes[]` does not match envelope hashes |
| `budget_exhausted_nucleus` | `get_context_packet` | nucleus alone exceeds `token_budget` |
| `anchor_drift` | `validate_patch_plan`, `submit_patch_plan` | `expected_anchor_checksum` mismatch |
| `validator_unavailable` | `validate_patch_plan` | SPEC-04 validators not yet built (Phase 1 transitional) |
| `phase1_stub` | `submit_patch_plan` | Phase 1 sentinel — engine integration activates Phase 2 |

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

### Shared-types public entry (on `tools/world-index`)

Because `tools/world-mcp` must not import `tools/world-index` as a query library (per SPEC-01 §Public contract) but does need access to the TypeScript schema types to typecheck its SQLite reads and its MCP tool signatures, this spec requires a companion addition on `tools/world-index`:

- Add `tools/world-index/src/public/types.ts` — a re-export-only module that publicly exposes `CanonFactRecord`, `ChangeLogEntry`, `ModificationHistoryEntry`, `NodeType`, `EdgeType`, `NODE_TYPES`, `EDGE_TYPES`, `CanonScope`, `CanonTruthScope`, `CanonDistribution`, `CanonSourceBasis`, `CanonContradictionRisk`, and the entity/edge enum constants from `tools/world-index/src/schema/types.ts`.
- Expose `./public/types` in `tools/world-index/package.json`'s `exports` field so `tools/world-mcp` can import via `import type { CanonFactRecord, NodeType } from '@worldloom/world-index/public/types'`.
- Re-exports are **types-only**; no runtime query surface is added. This preserves SPEC-01 §Public contract's "pure producer" posture because types are not a query library.

This addition extends SPEC-01's public contract by one surface (types re-export), which is a scope change SPEC-01 was not authored to anticipate. It is noted in §Risks & Open Questions for cross-spec alignment follow-up.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Tooling Recommendation | Every non-negotiable load (Kernel, Invariants, relevant CFs, affected domain files, unresolved contradictions, MR entries) is a `get_context_packet` response layer per `docs/CONTEXT-PACKET-CONTRACT.md` (authoritative shape) |
| §Machine-Facing Layer | Realizes Layer 2 of the machine-facing stack: retrieval MCP over the world index, with context-packet assembly delegated to the canonical doc |
| §Change Control Policy | `submit_patch_plan` is the commit gateway; `approval_token` ties user consent to specific plan bytes |
| Rule 6 No Silent Retcons | `find_impacted_fragments` surfaces `modified_by` / attribution edges; `modified_by` and `patched_by` are first-class edge types in SPEC-01's schema |
| Rule 7 Preserve Mystery Deliberately | MR entries exposed via `firewall_for` edges; `character_generation` profile pushes MR firewall weight higher; enforcement of MR overlap is downstream in SPEC-04 validators |
| §Canon Fact Record Schema | `get_node` on a CF returns the full YAML record verbatim; no schema translation |
| HARD-GATE discipline | Approval tokens make user-consent enforceable at commit time; Phase 1 stub plus Hook 3 (Phase 2) jointly enforce that no skill bypasses the engine |

## Verification

- **Unit**: each tool tested in isolation against a seeded `world.db` fixture at `tests/fixtures/seeded-world.db`
- **Integration**: `tests/integration/context-packet-canon-addition.test.ts` — full canon-addition Phase 0 pre-flight replaced by a single `get_context_packet` call; response size <8k tokens vs current pre-flight's >25k
- **Ranking (band semantics)**: `tests/ranking/exact-match-ordering.test.ts` — exact-id-match always outranks exact-entity-match; exact-entity-match always outranks weighted-only hits; within a band, weighted score orders; heading-path-match outranks FTS within the weighted band; profile overrides work
- **Approval token**: `tests/approval/token-lifecycle.test.ts` — signed token passes submit; unsigned/expired/tampered/replayed rejected with the correct error code
- **Multi-world**: `tests/integration/multi-world.test.ts` — two concurrent requests for different worlds return distinct results without cross-contamination
- **Empty index**: server returns `empty_index` structured error, not crash
- **Out-of-sync index**: server rejects stale `world.db` (mtime/hash drift) with `stale_index`
- **Version skew**: modify `index_version.txt` to a mismatched value; verify every tool returns `index_version_mismatch`
- **Summary-null fallback**: run `search_nodes` against a fixture where `nodes.summary IS NULL`; verify response carries `summary: null` and callers can fall back to `body_preview`
- **Context-packet shape fidelity**: assembler output must validate against `docs/CONTEXT-PACKET-CONTRACT.md`'s shape (shape-conformance test reads the canonical doc's example and asserts structural match); any drift bumps `packet_version`
- **Types-only public export**: `tools/world-index/src/public/types.ts` has no runtime side effects (`node -e 'require("@worldloom/world-index/public/types")'` imports cleanly and performs no IO)
- **Phase 1 stub semantics**: `submit_patch_plan` with a valid-shaped payload returns `phase1_stub` in Phase 1; same payload succeeds in Phase 2 after engine integration

## Out of Scope

- Semantic retrieval implementation (`semantic_similarity` weight stays 0 in Phase 1; separate future spec enables it)
- Authentication between MCP and client (relies on Claude Code's local-only MCP trust model)
- Multi-user concurrency within one world (single-user assumption)
- Cross-world queries
- GraphQL-style query language (tool surface is purpose-built)
- Defining the context-packet shape (owned by `docs/CONTEXT-PACKET-CONTRACT.md`; this spec owns the assembler)
- Defining the `approval_tokens_consumed` table schema (owned by SPEC-03, engine-owned)

## Risks & Open Questions

- **Context packet budget tuning**: 8k default may be too tight for escalated canon-addition runs (6 critic sub-agents). Mitigation: per-task-type override; measure in SPEC-08 Phase 1 pilot and adjust.
- **Approval token replay**: theoretical risk if secret leaks. Mitigation: secret is per-install, tokens single-use, tokens expire quickly, local-only trust model.
- **Sync-on-read cost**: full re-hashing per request would be expensive. Mitigation: default to mtime pre-check; full-hash mode opt-in via config. Explicit `world-index sync` in Hook 5 after writes keeps index fresh; server sync-on-read is a safety net.
- **File-class priority weighting**: hand-tuned in Phase 1; may need per-world calibration. Mitigation: expose weights in config; log ranking decisions for debugging.
- **Cross-spec alignment follow-ups** (surfaced during reassessment 2026-04-23):
  - **SPEC-03 edit required**: SPEC-03 should declare the `approval_tokens_consumed` table schema inside `worlds/<slug>/_index/world.db` and formally assign row-write ownership to the patch engine. This is a narrow cross-spec edit that must land before Phase 2 write-path activation.
  - **SPEC-01 public contract extension**: the types-only public entry at `tools/world-index/src/public/types.ts` is a one-line extension to SPEC-01 §Public contract ("world-index is a pure producer; it does not export a programmatic query library"). The types re-export is not a query library, but the contract wording should be updated to name the narrow types-only exception.
  - **CLAUDE.md ID conventions drift**: `M`, `NCP`, `NCB` are absent from CLAUDE.md §ID Allocation Conventions despite being live ID classes SPEC-01 indexes and this spec allocates. Closing the doc gap is SPEC-07 Part B territory; SPEC-02 conforms to the implementation surface and flags the drift here.
