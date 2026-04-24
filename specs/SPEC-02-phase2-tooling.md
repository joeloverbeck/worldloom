<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-02-PHASE2: Retrieval-MCP Phase 2 Tooling Update

**Phase**: 2
**Depends on**:
- archived SPEC-02 (Phase 1 retrieval-MCP surface at `tools/world-mcp/`; this spec extends that server; see `archive/specs/SPEC-02-retrieval-mcp-server.md`)
- **SPEC-13 §C line 255** (authoritative amendment source for the retrieval-tool additions + `allocate_next_id` extensions; archived at `archive/specs/SPEC-13-atomic-source-migration.md`). This spec drops the `get_compiled_view` commitment from SPEC-13 §C per reassessment findings (see Problem Statement — no consumer demonstrated; YAGNI). The companion doc updates under Part B keep repository docs consistent with the drop; the archived SPEC-13 record is not edited.
- SPEC-01 (atomic-source parser + record-class interfaces that `get_record` queries; archived at `archive/specs/SPEC-01-world-index.md`)
- `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 2 (scheduling — this spec formalizes the commitments tracked there in roadmap form)

**Blocks**:
- **SPEC-03 patch-engine integration**. Specifically:
  - `tickets/SPEC03PATENG-005.md` — approval-token verifier. The cryptographic contract (HMAC secret location, token payload shape, `canonicalOpHash` serialization) must agree between issuer and verifier. If this spec's ticket decomposition lands token-issuance work, 005 depends on it; if issuance is deferred to a follow-up spec, 005's dep weakens to "shared HMAC contract definition."
  - `tickets/SPEC03PATENG-009.md` — integration capstone. Exercises `get_record`, `find_sections_touched_by`, and extended `allocate_next_id` (for INV/OQ/ENT/SEC plan-creation paths). Without the tools this spec delivers, the capstone's post-apply sync integration assertion and its plan-creation test matrix cannot run end-to-end.
  - **Indirectly**, `tickets/SPEC03PATENG-006.md` (apply orchestration) consumes the extended `allocate_next_id` at Phase A step 4 (envelope allocation re-verification). 006's per-op unit tests do not exercise INV/OQ/ENT/SEC creates, so 006 can land without this spec on disk — but any integration test or live plan containing INV/OQ/ENT/SEC allocations will fail at runtime. That gap is caught by 009 (integration capstone), which is why 009 (not 006) is the explicitly blocked ticket.

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

SPEC-13 §C line 255 committed a set of new MCP retrieval tools and one extension to an existing tool as part of Phase 2 of the structure-aware-retrieval bundle. These commitments currently live as amendment clauses inside archived `SPEC-13-atomic-source-migration.md` and as one-line scheduling notes inside `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 2. Neither location is a normal active spec, and neither produces a decomposable ticket batch through `/reassess-spec` → `/spec-to-tickets`.

This matters because SPEC-03's patch engine depends on the commitments:

- Ticket SPEC03PATENG-006 (apply orchestration) invokes `allocate_next_id` during Phase A step 4 to verify envelope allocations still match current index state. Today that call fails for any INV/OQ/ENT/SEC record ID class (confirmed at reassessment — current implementation at `tools/world-mcp/src/tools/allocate-next-id.ts:4–17` supports only CF, CH, PA, CHAR, DA, PR, BATCH, NCP, NCB, AU, RP, M).
- Ticket SPEC03PATENG-009 (integration capstone) asserts `find_sections_touched_by(<new-cf-id>)` returns the correct SEC after apply — the tool does not exist today.
- Ticket SPEC03PATENG-005 (approval verifier) shares an HMAC cryptographic contract with whatever code eventually issues approval tokens; without a live issuer, 005 can only be tested against synthesized-token fixtures.

Without a concrete spec + ticket chain for these SPEC-02 Phase 2 commitments, the SPEC-03 decomposition's `Deps` list is left pointing at a conceptual commitment rather than at real tickets, and an implementer working through the SPEC-03 batch will discover the gap only when ticket 009 fails to exercise its post-apply sync assertion.

### SPEC-13 `get_compiled_view` commitment — dropped at reassessment

SPEC-13 §C line 255 also committed a third MCP tool, `mcp__worldloom__get_compiled_view(file_class, sections?)`, intended as an on-demand merged-markdown render from `_source/*.yaml`. Reassessment (2026-04-24) dropped this commitment per YAGNI:

- No active skill consumes it. `canon-addition` Phase 15a HARD-GATE deliverable summaries present structured YAML records (CF, CH, mod_history summaries, domain-file patches summarized per file, MR extensions, adjudication file path) — not merged markdown views. See `.claude/skills/canon-addition/SKILL.md:195`.
- No pending spec references it as a consumer. SPEC-03 explicitly says "compiled views don't exist to maintain" (SPEC-03 line 266); SPEC-06's skill rewrites target atomic records directly.
- The only real need for a merged markdown view is **human reading**, which is a CLI-tool concern (`world-index render`), not an MCP-tool concern. The CLI tool is not delivered by this spec either; if authored later, it's driven by a human-UX spec, not by Phase 2 machine-facing tooling.
- `get_record` + `get_context_packet` are the structured alternatives LLM agents actually consume per FOUNDATIONS.md §Tooling Recommendation.

If a future skill genuinely needs merged-view rendering, it gets added then, driven by a real consumer. This spec delivers only what Phase 2 actually needs.

**Source context**: `archive/specs/SPEC-13-atomic-source-migration.md` §C line 255 (the authoritative SPEC-02 amendment clause) + `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 2 (scheduling). No external brainstorm — this spec lifts existing commitments (minus the dropped `get_compiled_view`) into a decomposable form without introducing new design.

## Approach

Formalize three commitments from SPEC-13 §C line 255 as three numbered deliverables under `tools/world-mcp/`, plus one docs-consistency follow-up (Part B). Each MCP deliverable is an additive extension to the existing MCP server — no Phase 1 tools are modified, no breaking changes to existing schemas. The server re-uses its current read-side pattern (open world-index SQLite handle, query, serialize result) for the two new tools.

`allocate_next_id` extension is strictly additive: new classes are appended to the `ID_CLASS_FORMATS` enum. Existing classes remain unchanged.

No engine-side work lives here. SPEC-03 ticket 007 still owns the `submit_patch_plan` rewire (removing the Phase 1 stub and importing from `@worldloom/patch-engine`); this spec does not duplicate that work.

**Tool registration order**: new tools are registered in `tools/world-mcp/src/tool-names.ts` at positions that preserve existing logical grouping — `get_record` after `get_node` (ID-addressed retrieval), `find_sections_touched_by` after `find_impacted_fragments` (impact/reference retrieval). The `allocate_next_id` registry entry is unchanged; only its `ID_CLASS_FORMATS` and Zod enum are modified.

## Deliverables

### 1. `mcp__worldloom__get_record(record_id)` MCP tool

**Package location**:
- `tools/world-mcp/src/tools/get-record.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify — add `get_record` key to `MCP_TOOL_NAMES` and insert at the matching position in `MCP_TOOL_ORDER`)
- `tools/world-mcp/src/server.ts` (modify — register the new tool via `registerWrappedTool`, plus a Zod input schema matching the tool's args)

**Contract**: accepts a single `record_id` (`CF-NNNN` / `CH-NNNN` / `<INV-ID>` / `M-NNNN` / `OQ-NNNN` / `ENT-NNNN` / `SEC-<PREFIX>-NNN`), resolves it against the world index's `nodes` table, returns the **parsed YAML record as a field-structured object** (typed per the record's class — `CanonFactRecord`, `ChangeLogEntry`, `InvariantRecord`, `MysteryReserveEntry`, `OpenQuestionEntry`, `NamedEntityRecord`, `SectionRecord`) plus `content_hash` and `file_path`.

**Relationship to `get_node`**: `get_record` is distinct from the existing `get_node` tool. `get_node` returns a `NodeDetail` whose `body` field is the raw YAML source string (see `tools/world-mcp/src/tools/get-node.ts:56` and `tools/world-index/src/parse/atomic.ts:131`), and whose edges / mentions / structured_links / scoped_references are the graph-level projections of the record. `get_record` complements it by returning the **parsed YAML structure** — so callers composing patches, asserting on structural fields, or extracting typed field values do not re-parse the YAML string themselves. Both tools coexist; neither replaces the other.

Returns `McpError` with code `record_not_found` when no matching node exists; `invalid_input` when `record_id` doesn't match any known ID pattern.

### 2. `mcp__worldloom__find_sections_touched_by(cf_id)` MCP tool

**Package location**:
- `tools/world-mcp/src/tools/find-sections-touched-by.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify — add `find_sections_touched_by` key to `MCP_TOOL_NAMES` and insert at the matching position in `MCP_TOOL_ORDER`)
- `tools/world-mcp/src/server.ts` (modify — register the new tool via `registerWrappedTool`, plus a Zod input schema matching the tool's args)

**Contract**: accepts a CF ID, returns the list of SEC records whose `touched_by_cf[]` array contains that CF, plus the list of SEC records whose `extensions[].originating_cf` matches (the bidirectional-lookup surface SPEC-04's `touched_by_cf_completeness` validator uses). Reverse-index lookup against the atomic-source index.

Returns `{sections: Array<{sec_id, file_path, match_type: 'touched_by_cf' | 'extension'}>, total_count}`. Empty array when no matching SEC exists; not an error.

### 3. `allocate_next_id` extension to new record classes

**Package location**: `tools/world-mcp/src/tools/allocate-next-id.ts` (modify). No change to `tool-names.ts` (tool is already registered).

Extend `ID_CLASS_FORMATS` to support:

- `INV` per-category: five sub-classes `ONT` / `CAU` / `DIS` / `SOC` / `AES`, each with 1-based unpadded numbering (matching `worlds/animalia/_source/invariants/` current convention). The tool accepts `id_class: "ONT" | "CAU" | "DIS" | "SOC" | "AES"` and returns the next per-category ID (e.g., `ONT-7`).
- `OQ` with 4-wide zero-padded numbering (`OQ-NNNN`) per CLAUDE.md §ID Allocation Conventions.
- `ENT` with 4-wide zero-padded numbering (`ENT-NNNN`).
- `SEC` per-file-class: seven sub-classes encoded in the prefix (`SEC-ELF-NNN`, `SEC-INS-NNN`, `SEC-MTS-NNN`, `SEC-GEO-NNN`, `SEC-ECR-NNN`, `SEC-PAS-NNN`, `SEC-TML-NNN`). The tool accepts `id_class: "SEC-ELF" | "SEC-INS" | "SEC-MTS" | "SEC-GEO" | "SEC-ECR" | "SEC-PAS" | "SEC-TML"` and returns the next per-file-class ID (e.g., `SEC-GEO-004`).
- `M` remains at its current 1-wide unpadded format (already supported; no change).

Existing classes (`CF`, `CH`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`) remain unchanged.

**Design rule for `id_class` values**: each `id_class` value is the literal prefix of the allocated ID — `ONT` → `ONT-7`, `SEC-GEO` → `SEC-GEO-004`. INV uses five category prefixes directly (no compound `INV-*` shape — there is no `INV` class value on the tool's input). SEC uses seven compound prefixes that encode the file class (each is a distinct `id_class` value). After this deliverable, `ID_CLASS_FORMATS` grows from 12 entries to 26 (12 existing + 5 INV sub-classes + OQ + ENT + 7 SEC sub-classes).

**Zod schema at `tools/world-mcp/src/server.ts:120-138`** (the MCP tool arg validator) must be updated in lockstep — the `ID_CLASSES` closed-union enum rejects any id_class not in its list.

## Part B — Docs consistency follow-up

Dropping the `get_compiled_view` commitment leaves stale references in repository docs that were written against the original SPEC-13 commitment. Part B brings the docs into sync.

### B1. Remove `mcp__worldloom__get_compiled_view` reference from `docs/MACHINE-FACING-LAYER.md`

**Target**: `docs/MACHINE-FACING-LAYER.md:40` (the Phase 1.5 canonical-storage-layer bullet).

**Current text** contains: "Merged markdown views are produced on demand by `world-index render <world-slug> [--file <class>]` and `mcp__worldloom__get_compiled_view`; they are read-only and are not persisted."

**Target text**: remove the `mcp__worldloom__get_compiled_view` surface from the sentence, keep the `world-index render` CLI reference as-is (the CLI is out of scope for this spec — its fate is a separate human-UX concern). Replacement text: "Merged markdown views, if produced, are human-facing surfaces only (see `world-index render <world-slug> [--file <class>]` CLI — not delivered in this phase; driven by a future human-UX spec if/when authored). LLM agents consume atomic records via `mcp__worldloom__get_record` / `get_context_packet` instead."

**No other docs edits**: grep confirms `docs/FOUNDATIONS.md` does not reference `get_compiled_view` by name at line 454 or elsewhere — its text references only the `world-index render` CLI, which this spec leaves untouched.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Tooling Recommendation ("LLM agents should never operate on prose alone") | New tools preserve the structured-retrieval contract — `get_record` replaces raw YAML file reads with typed index lookups that return a parsed record object (not a string body); `find_sections_touched_by` exposes the CF↔SEC structural relationship that the atomic-source storage layer made explicit. The dropped `get_compiled_view` would have delivered merged prose, which §Tooling Recommendation explicitly flags ("operate on prose alone") as the anti-pattern — dropping it keeps the surface faithful. |
| §Canonical Storage Layer (SPEC-13) | Tools read `_source/*.yaml` via the world index's parsed representation; no direct filesystem reads. Preserves the engine-only-write contract — this spec adds read-side tools only. Part B docs update preserves the "`_source/` is the sole canonical form" statement intact. |
| §Change Control Policy | No world-state mutations introduced; all three MCP deliverables are read-side or allocation-side. No CH records emitted by these tools. |
| Rule 6 No Silent Retcons | `find_sections_touched_by` is the reverse-index tool that SPEC-04's `touched_by_cf_completeness` validator relies on; exposing it via MCP makes Rule 6's structural CF↔SEC mapping machine-queryable rather than only validator-enforced. The SPEC-13 retcon (dropping `get_compiled_view`) is surfaced explicitly in Problem Statement §"SPEC-13 `get_compiled_view` commitment — dropped at reassessment" — not a silent retcon. |
| Rule 7 Preserve Mystery Deliberately | `get_record` on M-N entries returns the structured record (including `disallowed_answers[]`, `what_is_known_around_it`, etc.) without resolving unknowns. No retrieval path weakens the MR firewall. |
| HARD-GATE discipline | No HARD-GATE surfaces introduced; read-only tools do not require user approval. |

## Verification

- **Unit**: each of the 2 new tools tested against a fixture world with known CF/CH/INV/M/OQ/ENT/SEC records. `get_record` returns each class's parsed YAML structure correctly (field-typed per record class, not raw string); `find_sections_touched_by` returns the expected SEC list for a CF with known touches + known extension references.
- **`allocate_next_id` extensions**: for each new class (INV per-category × 5, OQ, ENT, SEC per-file-class × 7), submit an allocation request against an animalia fixture copy; verify the returned ID is strictly greater than the highest existing ID of that class AND matches the class's regex.
- **Tool registration**: after landing, `getRegisteredToolNames()` from `tools/world-mcp/src/server.ts` returns 12 names (the existing 10 + `get_record` + `find_sections_touched_by`), and `MCP_TOOL_ORDER` in `tool-names.ts` contains both new names at their documented insertion positions.
- **Integration with SPEC-03**: after the SPEC-03 and SPEC-02-PHASE2 tickets land, SPEC-03 ticket 009's post-apply sync integration test exercises `get_record(<new-cf-id>)` and `find_sections_touched_by(<new-cf-id>)` end-to-end against a fixture world; both must return the expected records.
- **Backward compatibility**: all existing MCP tools (`search_nodes`, `get_node`, `get_neighbors`, `get_context_packet`, `find_impacted_fragments`, `find_named_entities`, `find_edit_anchors`, `validate_patch_plan`, `submit_patch_plan`, pre-existing `allocate_next_id` classes) continue to pass their existing test suites unchanged.
- **Part B docs update**: after Part B lands, `grep -n "get_compiled_view" docs/` returns zero matches (the only previous reference, `docs/MACHINE-FACING-LAYER.md:40`, is removed); `grep -n "world-index render" docs/` continues to match (the CLI reference is preserved as aspirational human-UX).

## Out of Scope

- **`get_compiled_view` MCP tool**: explicitly not delivered. Reassessment established no active consumer (see Problem Statement §"SPEC-13 `get_compiled_view` commitment — dropped at reassessment"). If a future skill genuinely needs merged-view rendering, add it then, driven by that skill's spec.
- **`world-index render` CLI**: the human-facing merged-view CLI command is not delivered here. Its fate is a separate human-UX concern; if authored later, it gets its own spec. Part B keeps the existing aspirational reference in docs intact because removing it would over-constrain that future decision.
- **Token issuance**: SPEC-03 assumes approval tokens are issued somewhere (per `tools/world-mcp/README.md` §Approval token), but neither Phase 1 nor this spec specifies the issuance flow. Token issuance is a separate design question — likely a fifth MCP tool (`mcp__worldloom__issue_approval_token(plan_hash, patch_hashes)`) gated on user approval, or a command-line step invoked during HARD-GATE presentation. That design is deferred to a separate spec OR a late addition to this spec's ticket decomposition. If it DOES land here, the Ticket-decomposition directive above becomes load-bearing for SPEC03PATENG-005 as well; if not, 005's dep is weak.
- **`submit_patch_plan` rewire**: SPEC-03 ticket 007 owns the rewire of `tools/world-mcp/src/tools/submit-patch-plan.ts` (stub removal + `@worldloom/patch-engine` import). This spec does not duplicate that work.
- **Engine-side work**: all patch-engine work remains in SPEC-03.
- **New node types or edge types in the world index**: the new tools query existing node/edge types; no schema extension on the world-index side.

## Risks & Open Questions

- **Token-issuance design deferral**: the SPEC-03 ticket-007 rewire works with an issuer-less world (tokens can be synthesized for testing), but any real skill invoking `submit_patch_plan` needs a way to obtain a valid token. Handling this later risks a gap between 005 verifier landing and any real skill path working end-to-end. Mitigation: treat token issuance as a mandatory part of Phase 2 skill-migration (SPEC-06) rather than a Phase 1.5 gap. Re-evaluate when SPEC-06 is decomposed.
- **Animalia ID-space assumptions**: the `allocate_next_id` extensions assume the existing animalia `_source/` ID-pattern conventions (unpadded `M-N`, unpadded per-category invariants like `ONT-7`, padded `SEC-GEO-003`) remain stable. If a future migration changes padding or prefix rules, this spec's enum must be updated.
- **Ticket-decomposition divergence**: if the future `/reassess-spec` run surfaces a design-level objection to one of the three MCP deliverables, the user's explicit dispositioning path applies — this spec is reassessable. The ticket-decomposition directive above remains load-bearing regardless of which deliverable lands under which package: the commitment is that SPEC-03 ticket 005 and 009 MUST reference the specific tickets that deliver their prerequisites.
- **`get_compiled_view` re-introduction risk**: if a future Phase 2+ skill surfaces a genuine merged-view need, re-introducing `get_compiled_view` requires (a) resurrecting the render-implementation-location decision (shared module? world-index package? world-mcp?), (b) restoring the docs at `docs/MACHINE-FACING-LAYER.md:40` (Part B removed one reference), and (c) re-entering SPEC-13's original byte-identical-with-CLI parity commitment. Mitigation: any such re-introduction runs through its own reassessment + brainstorm, not as an inline extension here.
