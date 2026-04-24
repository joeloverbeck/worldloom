<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-02-PHASE2: Retrieval-MCP Phase 2 Tooling Update

**Phase**: 2
**Depends on**:
- archived SPEC-02 (Phase 1 retrieval-MCP surface at `tools/world-mcp/`; this spec extends that server; see `archive/specs/SPEC-02-retrieval-mcp-server.md`)
- **SPEC-13 §C line 255** (authoritative amendment source for the 3 new retrieval tools + `allocate_next_id` extensions; archived at `archive/specs/SPEC-13-atomic-source-migration.md`)
- SPEC-01 (atomic-source parser + record-class interfaces that `get_record` queries; archived at `archive/specs/SPEC-01-world-index.md`)
- `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 2 (scheduling — this spec formalizes the commitments tracked there in roadmap form)

**Blocks**:
- **SPEC-03 patch-engine integration**. Specifically:
  - `tickets/SPEC03PATENG-005.md` — approval-token verifier. The cryptographic contract (HMAC secret location, token payload shape, `canonicalOpHash` serialization) must agree between issuer and verifier. If this spec's ticket decomposition lands token-issuance work, 005 depends on it; if issuance is deferred to a follow-up spec, 005's dep weakens to "shared HMAC contract definition."
  - `tickets/SPEC03PATENG-009.md` — integration capstone. Exercises `get_record`, `find_sections_touched_by`, and extended `allocate_next_id` (for INV/OQ/ENT/SEC plan-creation paths). Without the tools this spec delivers, the capstone's post-apply sync integration assertion and its plan-creation test matrix cannot run end-to-end.

> **Ticket-decomposition directive (load-bearing; do not skip)**
>
> When this spec is decomposed via `/spec-to-tickets` (in a future session), the resulting ticket IDs MUST be added as `Deps` entries to **both** `tickets/SPEC03PATENG-005.md` AND `tickets/SPEC03PATENG-009.md` before the SPEC-02-PHASE2 batch is considered complete.
>
> Concretely:
> - If this spec is decomposed under namespace `SPEC02PH2TOOL` (or similar), update `SPEC03PATENG-005.md`'s `**Deps**:` line to include the ticket(s) delivering the approval-token issuance / HMAC contract (if that work lands here; otherwise leave 005 unchanged).
> - Update `SPEC03PATENG-009.md`'s `**Deps**:` line to include the tickets delivering `get_record`, `find_sections_touched_by`, and extended `allocate_next_id` for INV/OQ/ENT/SEC classes.
>
> Without this cross-reference update, the SPEC-03 integration capstone (ticket 009) will surface the missing prerequisite only at implementation time — and the user's instruction at spec-drafting time ("or else we'll forget") would have been defeated. This is a Rule-5 (No Consequence Evasion) reminder: the dependency chain must be visible in BOTH directions once tickets exist on both sides.

## Problem Statement

SPEC-13 §C line 255 committed three new MCP retrieval tools and one extension to an existing tool as part of Phase 2 of the structure-aware-retrieval bundle. These commitments currently live as amendment clauses inside archived `SPEC-13-atomic-source-migration.md` and as one-line scheduling notes inside `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 2. Neither location is a normal active spec, and neither produces a decomposable ticket batch through `/reassess-spec` → `/spec-to-tickets`.

This matters because SPEC-03's patch engine depends on the commitments:

- Ticket SPEC03PATENG-006 (apply orchestration) invokes `allocate_next_id` during Phase A step 4 to verify envelope allocations still match current index state. Today that call fails for any INV/OQ/ENT/SEC record ID class (confirmed at reassessment — current implementation at `tools/world-mcp/src/tools/allocate-next-id.ts:4–17` supports only CF, CH, PA, CHAR, DA, PR, BATCH, NCP, NCB, AU, RP, M).
- Ticket SPEC03PATENG-009 (integration capstone) asserts `find_sections_touched_by(<new-cf-id>)` returns the correct SEC after apply — the tool does not exist today.
- Ticket SPEC03PATENG-005 (approval verifier) shares an HMAC cryptographic contract with whatever code eventually issues approval tokens; without a live issuer, 005 can only be tested against synthesized-token fixtures.

Without a concrete spec + ticket chain for these SPEC-02 Phase 2 commitments, the SPEC-03 decomposition's `Deps` list is left pointing at a conceptual commitment rather than at real tickets, and an implementer working through the SPEC-03 batch will discover the gap only when ticket 009 fails to exercise its post-apply sync assertion.

**Source context**: `archive/specs/SPEC-13-atomic-source-migration.md` §C line 255 (the authoritative SPEC-02 amendment clause) + `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 2 (scheduling). No external brainstorm — this spec lifts existing commitments into a decomposable form without introducing new design.

## Approach

Formalize the four commitments from SPEC-13 §C line 255 as four numbered deliverables under `tools/world-mcp/`. Each deliverable is an additive extension to the existing MCP server — no Phase 1 tools are modified, no breaking changes to existing schemas. The server re-uses its current read-side pattern (open world-index SQLite handle, query, serialize result) for all three new tools.

`allocate_next_id` extension is strictly additive: new classes are appended to the `ID_CLASS_FORMATS` enum. Existing classes remain unchanged.

No engine-side work lives here. SPEC-03 ticket 007 still owns the `submit_patch_plan` rewire (removing the Phase 1 stub and importing from `@worldloom/patch-engine`); this spec does not duplicate that work.

## Deliverables

### 1. `mcp__worldloom__get_record(record_id)` MCP tool

**Package location**: `tools/world-mcp/src/tools/get-record.ts` (new).

**Contract**: accepts a single `record_id` (`CF-NNNN` / `CH-NNNN` / `<INV-ID>` / `M-NNNN` / `OQ-NNNN` / `ENT-NNNN` / `SEC-<PREFIX>-NNN`), resolves it against the world index's `nodes` table, returns the record's full parsed YAML content plus `content_hash` and `file_path`. Generalizes the existing `get_node` tool across all atomic record classes.

Returns `McpError` with code `record_not_found` when no matching node exists; `invalid_input` when `record_id` doesn't match any known ID pattern.

### 2. `mcp__worldloom__find_sections_touched_by(cf_id)` MCP tool

**Package location**: `tools/world-mcp/src/tools/find-sections-touched-by.ts` (new).

**Contract**: accepts a CF ID, returns the list of SEC records whose `touched_by_cf[]` array contains that CF, plus the list of SEC records whose `extensions[].originating_cf` matches (the bidirectional-lookup surface SPEC-04's `touched_by_cf_completeness` validator uses). Reverse-index lookup against the atomic-source index.

Returns `{sections: Array<{sec_id, file_path, match_type: 'touched_by_cf' | 'extension'}>, total_count}`. Empty array when no matching SEC exists; not an error.

### 3. `mcp__worldloom__get_compiled_view(file_class, sections?)` MCP tool

**Package location**: `tools/world-mcp/src/tools/get-compiled-view.ts` (new).

**Contract**: on-demand render of a merged markdown view for a file class (`CANON_LEDGER` / `INVARIANTS` / `MYSTERY_RESERVE` / `OPEN_QUESTIONS` / `EVERYDAY_LIFE` / `INSTITUTIONS` / `MAGIC_OR_TECH_SYSTEMS` / `GEOGRAPHY` / `ECONOMY_AND_RESOURCES` / `PEOPLES_AND_SPECIES` / `TIMELINE`). Optional `sections` parameter scopes the render to specific SEC IDs. Dispatches to the same render implementation used by the `world-index render` CLI (SPEC-13 §A) so both surfaces produce byte-identical merged views.

Used primarily for HARD-GATE deliverable summaries — skills assembling a preview of a canon-addition's full downstream effect for user review.

Returns `{rendered_markdown: string, source_record_ids: string[]}`. No persistence — the render is computed per-call.

### 4. `allocate_next_id` extension to new record classes

**Package location**: `tools/world-mcp/src/tools/allocate-next-id.ts` (modify).

Extend `ID_CLASS_FORMATS` to support:

- `INV` per-category: five sub-classes `ONT` / `CAU` / `DIS` / `SOC` / `AES`, each with 1-based unpadded numbering (matching `worlds/animalia/_source/invariants/` current convention). The tool accepts `id_class: "ONT" | "CAU" | "DIS" | "SOC" | "AES"` and returns the next per-category ID (e.g., `ONT-7`).
- `OQ` with 4-wide zero-padded numbering (`OQ-NNNN`) per CLAUDE.md §ID Allocation Conventions.
- `ENT` with 4-wide zero-padded numbering (`ENT-NNNN`).
- `SEC` per-file-class: seven sub-classes encoded in the prefix (`SEC-ELF-NNN`, `SEC-INS-NNN`, `SEC-MTS-NNN`, `SEC-GEO-NNN`, `SEC-ECR-NNN`, `SEC-PAS-NNN`, `SEC-TML-NNN`). The tool accepts `id_class: "SEC-ELF" | "SEC-INS" | "SEC-MTS" | "SEC-GEO" | "SEC-ECR" | "SEC-PAS" | "SEC-TML"` and returns the next per-file-class ID (e.g., `SEC-GEO-004`).
- `M` remains at its current 1-wide unpadded format (already supported; no change).

Existing classes (`CF`, `CH`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`) remain unchanged.

**Zod schema at `tools/world-mcp/src/server.ts:120-138`** (the MCP tool arg validator) must be updated in lockstep — the enum's closed union rejects any id_class not in its list.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Tooling Recommendation ("LLM agents should never operate on prose alone") | New tools preserve the structured-retrieval contract — `get_record` replaces raw YAML file reads with typed index lookups; `find_sections_touched_by` exposes the CF↔SEC structural relationship that the atomic-source storage layer made explicit. |
| §Canonical Storage Layer (SPEC-13) | Tools read `_source/*.yaml` via the world index's parsed representation; no direct filesystem reads. Preserves the engine-only-write contract — this spec adds read-side tools only. |
| §Change Control Policy | No world-state mutations introduced; all four deliverables are read-side or allocation-side. No CH records emitted by these tools. |
| Rule 6 No Silent Retcons | `find_sections_touched_by` is the reverse-index tool that SPEC-04's `touched_by_cf_completeness` validator relies on; exposing it via MCP makes Rule 6's structural CF↔SEC mapping machine-queryable rather than only validator-enforced. |
| HARD-GATE discipline | No HARD-GATE surfaces introduced; read-only tools do not require user approval. |

## Verification

- **Unit**: each of the 3 new tools tested against a fixture world with known CF/CH/INV/M/OQ/ENT/SEC records. `get_record` returns each class's content correctly; `find_sections_touched_by` returns the expected SEC list for a CF with known touches + known extension references; `get_compiled_view` returns byte-identical output to the `world-index render` CLI on the same inputs.
- **`allocate_next_id` extensions**: for each new class (INV per-category × 5, OQ, ENT, SEC per-file-class × 7), submit an allocation request against an animalia fixture copy; verify the returned ID is strictly greater than the highest existing ID of that class AND matches the class's regex.
- **Integration with SPEC-03**: after the SPEC-03 and SPEC-02-PHASE2 tickets land, SPEC-03 ticket 009's post-apply sync integration test exercises `get_record(<new-cf-id>)` and `find_sections_touched_by(<new-cf-id>)` end-to-end against a fixture world; both must return the expected records.
- **Backward compatibility**: all existing MCP tools (`search_nodes`, `get_node`, `get_neighbors`, `get_context_packet`, `find_impacted_fragments`, `find_named_entities`, `find_edit_anchors`, `validate_patch_plan`, `submit_patch_plan`, pre-existing `allocate_next_id` classes) continue to pass their existing test suites unchanged.

## Out of Scope

- **Token issuance**: SPEC-03 assumes approval tokens are issued somewhere (per `tools/world-mcp/README.md` §Approval token), but neither Phase 1 nor this spec specifies the issuance flow. Token issuance is a separate design question — likely a fifth MCP tool (`mcp__worldloom__issue_approval_token(plan_hash, patch_hashes)`) gated on user approval, or a command-line step invoked during HARD-GATE presentation. That design is deferred to a separate spec OR a late addition to this spec's ticket decomposition. If it DOES land here, the Ticket-decomposition directive above becomes load-bearing for SPEC03PATENG-005 as well; if not, 005's dep is weak.
- **`submit_patch_plan` rewire**: SPEC-03 ticket 007 owns the rewire of `tools/world-mcp/src/tools/submit-patch-plan.ts` (stub removal + `@worldloom/patch-engine` import). This spec does not duplicate that work.
- **Engine-side work**: all patch-engine work remains in SPEC-03.
- **New node types or edge types in the world index**: the new tools query existing node/edge types; no schema extension on the world-index side.
- **Performance tuning on large worlds**: `get_compiled_view` on a very-large file class (e.g., a 50-section TIMELINE) may render slowly; performance optimization is deferred. Target: <500ms per compiled-view call on animalia-sized worlds.

## Risks & Open Questions

- **`get_compiled_view` / `world-index render` CLI parity**: SPEC-13 §C requires byte-identical output between MCP and CLI surfaces. If the render implementation lives in `tools/world-index/src/` today, this spec's MCP tool imports the same function. If the render lives in a different module or doesn't exist yet, a scope-extending follow-up ticket promotes it to a shared location before the MCP tool can delegate. Decision deferred to ticket decomposition; mitigation: `/reassess-spec` on this spec greps for a render implementation at reassessment time.
- **Token-issuance design deferral**: the SPEC-03 ticket-007 rewire works with an issuer-less world (tokens can be synthesized for testing), but any real skill invoking `submit_patch_plan` needs a way to obtain a valid token. Handling this later risks a gap between 005 verifier landing and any real skill path working end-to-end. Mitigation: treat token issuance as a mandatory part of Phase 2 skill-migration (SPEC-06) rather than a Phase 1.5 gap. Re-evaluate when SPEC-06 is decomposed.
- **Animalia ID-space assumptions**: the `allocate_next_id` extensions assume the existing animalia `_source/` ID-pattern conventions (unpadded `M-N`, unpadded per-category invariants like `ONT-7`, padded `SEC-GEO-003`) remain stable. If a future migration changes padding or prefix rules, this spec's enum must be updated.
- **Ticket-decomposition divergence**: if the future `/reassess-spec` run surfaces a design-level objection to one of the four deliverables (e.g., "`get_compiled_view` should live in world-index, not world-mcp"), the user's explicit dispositioning path applies — this spec is reassessable. The ticket-decomposition directive above remains load-bearing regardless of which deliverable lands under which package: the commitment is that SPEC-03 ticket 005 and 009 MUST reference the specific tickets that deliver their prerequisites.
