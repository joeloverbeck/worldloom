# MCPENH-024: Extend `mcp__worldloom__list_records` to support hybrid record types

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (`list_records` tool implementation, server schema/capability metadata, package docs/tests) and repo-level machine-facing docs.
**Deps**: None.

## Problem

Before this ticket, `mcp__worldloom__list_records(world_slug, record_type, ...)` accepted `record_type` from an enum that included only atomic record types (per the in-session schema observation): `canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`. Hybrid record types — `character_record` (CHAR-NNNN files at `worlds/<slug>/characters/<slug>.md`), `diegetic_artifact_record` (DA-NNNN files at `worlds/<slug>/diegetic-artifacts/<slug>.md`), `adjudication_record` (PA-NNNN files at `worlds/<slug>/adjudications/<verdict-name>.md`) — were not in the enum. Operators wanting to enumerate the world's CHARs, DAs, or PAs had to fall back to one of three workarounds: (i) `ls worlds/<slug>/<hybrid-dir>/`, (ii) read the per-directory `INDEX.md` file and parse it manually, or (iii) call `mcp__worldloom__find_named_entities(names=[...])` which returns mention counts but not the canonical (id, title, file_path) tuple needed for ID-based retrieval.

This is a friction-only gap — nothing is blocked, but the directory-listing fallback bypasses the MCP's structured retrieval surface that FOUNDATIONS §Tooling Recommendation commits to. Aligning the `list_records` API across atomic and hybrid records gives operators one canonical enumeration call regardless of record class.

Real-world evidence (this session, 2026-05-03): During `branching-story-bootstrap` on `worlds/erotica-world/`, the user's premise cited `DA-0001` by ID. To resolve the file path needed for the direct-Read fallback (the oversize-response recovery — see MCPENH-023), I `ls`'d `worlds/erotica-world/diegetic-artifacts/` to discover the file was `marla-kerns-journal-the-iker-entries.md`. A hypothetical `mcp__worldloom__list_records(world_slug='erotica-world', record_type='diegetic_artifact_record', fields=['id', 'title', 'file_path'])` would have returned the same information through the documented MCP API in one call.

The existing `find_named_entities` already exposes hybrid records via the `mentions_by_node_type` field (which counts mentions of named entities by record class), but it returns counts, not record listings. Its purpose is name resolution, not enumeration; extending it would conflate two surfaces. `list_records` is the right home for the enumeration use case.

## Assumption Reassessment (2026-05-03)

1. `mcp__worldloom__list_records` is implemented at `tools/world-mcp/src/tools/list-records.ts`; the server input schema and capability enum are registered in `tools/world-mcp/src/server.ts`. The current `SUPPORTED_LIST_RECORD_TYPES` enum contains 7 atomic record types and no hybrid types.
2. `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline reads: *"Hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) are also retrievable via `get_record(record_id)` with optional `section_path` projection..."* — this commits to per-record retrieval but is silent on per-class enumeration. §Tooling Recommendation commits to the context-packet + targeted-retrieval pattern; per-class enumeration is implicit in "retrieve relevant records" workflows but not explicitly named.
3. Cross-skill / cross-artifact: this ticket touches the shared `list_records` MCP API surface. Consumers of `list_records` include any skill that enumerates a record class — currently `branching-story-bootstrap` (whole-class M and INV loads), `continuity-audit` (per-class enumeration for cross-checks), and any future audit / promotion workflow. Extending the enum is additive; no consumer is forced to change.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation's "Whole-class enumeration is a legitimate primary loading pattern" sub-paragraph (added to FOUNDATIONS for the EPE / continuity-audit firewall surfaces) authorizes whole-class loads via `list_records(world_slug, record_type, include_full_body=true)`. The same enumeration legitimacy logically extends to hybrid record classes — a continuity audit covering CHAR distribution conformance or DA truth-register patterns benefits from the same primitive.
5. N/A (no HARD-GATE / canon-write / Mystery Reserve firewall surfaces touched).
6. Output schema extension: ADDITIVE-only. Atomic-record responses remain unchanged. Hybrid default/projection mode returns compact metadata fields available for enumeration: `{record_id, record_kind, title, content_hash, file_path}`. `title` is derived from hybrid frontmatter (`title`, then `name`, then `summary`, then `record_id`). With `include_full_body=true`, the return shape is `{record_id, content_hash, file_path, body}` where `body` contains `{record_kind, frontmatter, body_sections}`. This mirrors the existing `include_full_body` metadata wrapper while preserving the current `get_record` hybrid parse shape inside `body`.
7. No rename / removal of any symbol. The change is additive to the `record_type` enum.
8. Adjacent contradictions exposed: `find_named_entities`'s `mentions_by_node_type` field includes counts for `character_record` and `diegetic_artifact_record` even though `list_records` does not. This inconsistency between the two MCP tools' awareness of hybrid types is a correlated symptom, not a bug to fix in this ticket; this ticket aligns `list_records` with the broader pattern.
9. Mismatch + correction: the draft described a new directory walker and direct post-edit `mcp__worldloom__...` acceptance smoke. The live package already indexes hybrid records as `nodes` rows (`character_record`, `diegetic_artifact_record`, `adjudication_record`) and `get_record` already owns hybrid frontmatter/body parsing in `tools/world-mcp/src/tools/get-record.ts`; this ticket extends the existing index-backed `listRecords` dispatch and reuses that parser. Post-edit proof is package-local build/tests and in-memory MCP dispatch/capability tests; direct external MCP calls are not claimed unless the running server is rebuilt/restarted in a separate operational smoke.

## Architecture Check

1. The proposed approach (extend `list_records`'s `record_type` enum + implement hybrid listing) is cleaner than alternatives:
   - **Alternative A**: extend `find_named_entities` to return file paths. Rejected — conflates name resolution with enumeration; `find_named_entities`'s purpose is fuzzy/canonical name lookup, not "give me all DAs."
   - **Alternative B**: introduce a new MCP tool `list_hybrid_records`. Rejected — bifurcates the enumeration API across two tools when one would do; consumers would need to decide which tool to call based on record class, adding cognitive overhead.
   - **Chosen approach**: one `list_records` API for both atomic and hybrid record types, enum-discriminated. Operators call the same tool regardless of record class; the tool dispatches to the appropriate parser internally.
2. No backwards-compatibility aliasing/shims introduced. The enum is additive (new accepted values; existing values unchanged). The return shape for hybrid records is new but doesn't conflict with atomic-record return shapes (they're discriminated by the request's `record_type`). No "old path" exists to preserve — `list_records` simply does not currently support hybrid types.

## Verification Layers

1. **Enum extension surfaces hybrid types** → schema validation: `tools/world-mcp/tests/tools/describe-capabilities.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` prove `describe_capabilities` / registered MCP metadata includes `character_record`, `diegetic_artifact_record`, `adjudication_record` in the `record_type` enum.
2. **Hybrid-record listing returns the documented shape** → targeted tool command: `tools/world-mcp/tests/tools/list-records.test.ts` covers compact metadata, field projection, full-body mode, id ordering, and unsupported-type error details against a temp indexed fixture.
3. **Atomic-record listings unchanged** → targeted regression test: existing `tools/world-mcp/tests/tools/list-records.test.ts` atomic tests continue to assert parsed atomic default/projection/full-body behavior.
4. **`find_named_entities` divergence noted but not addressed** → manual review: the audit-trail entry on this ticket's implementation should explicitly note that `find_named_entities`'s `mentions_by_node_type` field continues to expose counts for hybrid types, retaining the existing query path; this ticket adds a parallel enumeration path, it does not deprecate the count path.

## Landed Changes

### 1. Extend `record_type` enum in `list_records` MCP tool schema

Added `character_record`, `diegetic_artifact_record`, `adjudication_record` to the `record_type` enum. The enum values mirror the existing atomic-record naming convention (snake_case suffix `_record`).

### 2. Implement hybrid-record index-backed enumeration

For each new enum value, the implementation extends the existing index-backed query path:
- Maps the list enum value to the indexed node type (`character_record`, `diegetic_artifact_record`, `adjudication_record`).
- Reuses the hybrid parser from `get_record` so `list_records` and `get_record` do not diverge on frontmatter/body-section parsing.
- Returns `{records, total, truncated}`. In default/projection mode, each hybrid entry is compact metadata: `{record_id, record_kind, title, content_hash, file_path}`. When `include_full_body=true`, each entry is `{record_id, content_hash, file_path, body: {record_kind, frontmatter, body_sections}}`.
- Preserves `fields` projection semantics for default/projection mode; `record_id` remains mandatory and `include_full_body=true` ignores `fields`.

### 3. Documentation update

Updated `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` to document the extended enum and hybrid-record listing return shape. Truthed same-seam skill references that previously used `find_named_entities` or direct index/directory scans as a proxy for enumerating world-level CHAR/DA/PA records. Slug-collision checks may still use direct directory or `INDEX.md` reads because they are file-path collision checks, not structured record enumeration.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify) — extend the enum and add hybrid-type dispatch.
- `tools/world-mcp/src/tools/get-record.ts` (modify) — export the existing hybrid parser/kind helper for reuse by `list_records`.
- `tools/world-mcp/src/server.ts` (modify) — server input schema/capability metadata receives the enum through `SUPPORTED_LIST_RECORD_TYPES`; description text must stop saying atomic-only.
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify) — covers the new hybrid-record listing branch against a fixture world.
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify) — capability metadata description/enum remains truthful.
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify) — in-memory MCP dispatch accepts a hybrid enum value.
- `tools/world-mcp/README.md` (modify) — document the extended enum + hybrid-record return shape.
- `docs/FOUNDATIONS.md` (modify) — update read discipline to name hybrid whole-class enumeration.
- `docs/MACHINE-FACING-LAYER.md` (modify) — document the extended enum + hybrid-record return shape.
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify) — update whole-class enumeration wording from atomic-only to supported record classes including hybrid.
- `.claude/skills/continuity-audit/references/audit-categories.md` (modify) — use `list_records` for CHAR/DA enumeration.
- `.claude/skills/continuity-audit/references/retrieval-tool-tree.md` (modify) — use `list_records` for CHAR/DA enumeration and keep `get_record` for deeper per-record details.
- `.claude/skills/propose-new-characters/SKILL.md` (modify) — parent skill world-state prerequisite language must match the reference files.
- `.claude/skills/propose-new-characters/references/canon-rules-and-foundations.md` (modify) — registry enumeration can use `list_records` for existing CHAR/DA/PA records.
- `.claude/skills/propose-new-characters/references/phases-1-2-registry-and-essence.md` (modify) — Phase 1 source list should prefer `list_records` for CHAR/DA/PA enumeration.
- `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` (modify) — pre-flight registry retrieval should prefer `list_records`.

## Out of Scope

- **Extension to non-`worlds/<slug>/*` hybrid-like surfaces** (e.g., `world-proposals/NWP-NNNN-*.md` cards at the repository root, `tickets/<NAMESPACE>-NNN.md`, `docs/plans/*.md`). Those are pipeline-meta surfaces, not world canon; their enumeration belongs under separate MCP tools or none (they're already grep-discoverable). This ticket scopes to `worlds/<slug>/<hybrid-dir>/` records.
- **Per-record filtering on hybrid frontmatter content** (e.g., `list_records(record_type='character_record', filters={age_band: 'late-adolescent'})`). The current atomic `list_records` does not support filtering beyond `fields` projection; extending hybrid records with richer filters would diverge from the atomic API. Future ticket if needed.
- **Sorted return order**: existing atomic `list_records` returns records in id-ascending order (per the in-session observation); hybrid-record listings should preserve the same ordering convention. No new sort options introduced.

## Acceptance Criteria

### Tests That Must Pass

1. `listRecords({world_slug: 'seeded', record_type: 'diegetic_artifact_record'})` returns compact DA metadata including `record_id: 'DA-0001'`, `record_kind: 'diegetic_artifact'`, `title`, `content_hash`, and `file_path`.
2. `listRecords({world_slug: 'seeded', record_type: 'character_record'})` returns `CHAR-0001` and `CHAR-0002` in id order with correct `file_path` values.
3. `listRecords({world_slug: 'seeded', record_type: 'character_record', fields: ['record_id', 'file_path']})` returns the same record set with only `record_id` and `file_path`.
4. `listRecords({world_slug: 'seeded', record_type: 'character_record', include_full_body: true})` returns each record with `body` populated as `{record_kind, frontmatter, body_sections}`.
5. Existing atomic-record tests continue to pass without changed assertions for default/projection/full-body shapes.
6. In-memory MCP server dispatch accepts `record_type: 'diegetic_artifact_record'`, and `describe_capabilities` exposes `character_record`, `diegetic_artifact_record`, `adjudication_record` in the `record_type` enum.

### Invariants

1. **Atomic-record listing API is preserved unchanged**: existing atomic `record_type` values (`canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`) return identical responses before and after the change.
2. **Hybrid-record listing preserves the same envelope and projection rules while using a hybrid-specific record body**: `{records: [...], total, truncated}` envelope; compact metadata by default; `{record_id, content_hash, file_path, body: {record_kind, frontmatter, body_sections}}` in full-body mode; `fields` projection works on default/projection-mode top-level fields.
3. **Hybrid records are id-ordered**: returned records are sorted by `record_id` ascending (same convention as atomic records), regardless of file-system order.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` (modify) — covers the new hybrid-record listing branch with fixtures for `character_record`, `diegetic_artifact_record`, and `adjudication_record` record types. Tests cover compact listing, `fields` projection, id ordering, unsupported-type details, and `include_full_body=true`.
2. Existing atomic tests in `tools/world-mcp/tests/tools/list-records.test.ts` remain unchanged as the atomic regression surface.
3. `tools/world-mcp/tests/server/dispatch.test.ts` and `tools/world-mcp/tests/tools/describe-capabilities.test.ts` cover in-memory MCP dispatch and capability enum exposure.

### Commands

1. `cd tools/world-mcp && npm test -- --test-name-pattern "listRecords"` — package-script proof for the list-records branch; the wrapper rebuilt and reported the full node-test lane while including the new listRecords tests.
2. `cd tools/world-mcp && npm test -- --test-name-pattern "list_records include_full_body dispatches through the MCP boundary|list_records accepts hybrid record types through the MCP boundary|describeCapabilities returns build metadata and enum-valued input contracts"` — package-script proof for in-memory MCP dispatch/capability coverage; the wrapper rebuilt and reported the full node-test lane while including the requested dispatch/capability tests.
3. `cd tools/world-mcp && npm test` — full MCP test suite, confirming no regression in atomic-record listings and adjacent server metadata.

## Outcome

Implemented the additive hybrid-record extension for `mcp__worldloom__list_records`.

- `SUPPORTED_LIST_RECORD_TYPES` now includes `character_record`, `diegetic_artifact_record`, and `adjudication_record`.
- `listRecords` remains index-backed and now maps the new enum values to the existing indexed hybrid node types.
- Hybrid parsing reuses `get_record`'s frontmatter/body-section parser so the two retrieval tools do not diverge.
- Default/projection-mode hybrid listings return compact enumeration metadata: `record_id`, `record_kind`, `title`, `content_hash`, and `file_path`.
- `include_full_body=true` returns `{record_id, content_hash, file_path, body}` where hybrid `body` is `{record_kind, frontmatter, body_sections}`.
- In-memory MCP server dispatch and `describe_capabilities` now surface the expanded `record_type` enum.
- Package README, FOUNDATIONS read discipline, machine-facing docs, context-packet docs, and same-seam continuity/propose-new-characters skill retrieval prose now point hybrid whole-class enumeration at `list_records` instead of directory/index/entity-resolution workarounds.

`find_named_entities` still exposes hybrid mention counts for name-resolution workflows. This ticket adds a structured enumeration path; it does not deprecate the existing count/name-resolution path.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm test -- --test-name-pattern "listRecords"` — rebuilt the package and passed the full reported node-test lane (`297` passing tests), including the new hybrid `listRecords` compact metadata, projection, full-body, id-order, and supported-type tests.
2. `cd tools/world-mcp && npm test -- --test-name-pattern "list_records include_full_body dispatches through the MCP boundary|list_records accepts hybrid record types through the MCP boundary|describeCapabilities returns build metadata and enum-valued input contracts"` — rebuilt the package and passed the full reported node-test lane (`297` passing tests), including in-memory MCP dispatch and capability enum exposure.
3. `cd tools/world-mcp && npm test` — final full package suite passed (`297` passing tests).

Direct external `mcp__worldloom__list_records(...)` smoke was not claimed because this run changed source and validated through package-local build/tests plus in-memory MCP server dispatch, not through a restarted deployed MCP connector.

## Deviations

- The draft's directory-walker implementation was replaced with the live index-backed node query path. This is the stronger contract because `world-index` already owns hybrid node indexing and freshness checks.
- The draft's direct `erotica-world` acceptance calls were replaced with portable temp-indexed fixture tests and in-memory MCP dispatch. Local ignored world content is not required for this package proof.
- `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/dist/` were ignored package artifacts in the package-scoped status snapshot; `dist/` was refreshed by `npm test` / `npm run build`.
