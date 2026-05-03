# MCPENH-024: Extend `mcp__worldloom__list_records` to support hybrid record types

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (`list_records` tool implementation: `record_type` enum extension + listing implementation for hybrid types).
**Deps**: None.

## Problem

`mcp__worldloom__list_records(world_slug, record_type, ...)` accepts `record_type` from an enum that includes only atomic record types (per the in-session schema observation): `canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`. Hybrid record types — `character_record` (CHAR-NNNN files at `worlds/<slug>/characters/<slug>.md`), `diegetic_artifact_record` (DA-NNNN files at `worlds/<slug>/diegetic-artifacts/<slug>.md`), `adjudication_record` (PA-NNNN files at `worlds/<slug>/adjudications/<verdict-name>.md`) — are NOT in the enum. Operators wanting to enumerate the world's CHARs, DAs, or PAs must fall back to one of three workarounds: (i) `ls worlds/<slug>/<hybrid-dir>/`, (ii) read the per-directory `INDEX.md` file and parse it manually, or (iii) call `mcp__worldloom__find_named_entities(names=[...])` which returns mention counts but not the canonical (id, title, file_path) tuple needed for ID-based retrieval.

This is a friction-only gap — nothing is blocked, but the directory-listing fallback bypasses the MCP's structured retrieval surface that FOUNDATIONS §Tooling Recommendation commits to. Aligning the `list_records` API across atomic and hybrid records gives operators one canonical enumeration call regardless of record class.

Real-world evidence (this session, 2026-05-03): During `branching-story-bootstrap` on `worlds/erotica-world/`, the user's premise cited `DA-0001` by ID. To resolve the file path needed for the direct-Read fallback (the oversize-response recovery — see MCPENH-023), I `ls`'d `worlds/erotica-world/diegetic-artifacts/` to discover the file was `marla-kerns-journal-the-iker-entries.md`. A hypothetical `mcp__worldloom__list_records(world_slug='erotica-world', record_type='diegetic_artifact_record', fields=['id', 'title', 'file_path'])` would have returned the same information through the documented MCP API in one call.

The existing `find_named_entities` already exposes hybrid records via the `mentions_by_node_type` field (which counts mentions of named entities by record class), but it returns counts, not record listings. Its purpose is name resolution, not enumeration; extending it would conflate two surfaces. `list_records` is the right home for the enumeration use case.

## Assumption Reassessment (2026-05-03)

1. `mcp__worldloom__list_records` is implemented at `tools/world-mcp/` per CLAUDE.md "Repository Layout"; the exact source-file path requires verification at implementation start. The current `record_type` enum is observable in the tool's MCP schema (this session: 7 atomic record types, no hybrid types).
2. `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline reads: *"Hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) are also retrievable via `get_record(record_id)` with optional `section_path` projection..."* — this commits to per-record retrieval but is silent on per-class enumeration. §Tooling Recommendation commits to the context-packet + targeted-retrieval pattern; per-class enumeration is implicit in "retrieve relevant records" workflows but not explicitly named.
3. Cross-skill / cross-artifact: this ticket touches the shared `list_records` MCP API surface. Consumers of `list_records` include any skill that enumerates a record class — currently `branching-story-bootstrap` (whole-class M and INV loads), `continuity-audit` (per-class enumeration for cross-checks), and any future audit / promotion workflow. Extending the enum is additive; no consumer is forced to change.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation's "Whole-class enumeration is a legitimate primary loading pattern" sub-paragraph (added to FOUNDATIONS for the EPE / continuity-audit firewall surfaces) authorizes whole-class loads via `list_records(world_slug, record_type, include_full_body=true)`. The same enumeration legitimacy logically extends to hybrid record classes — a continuity audit covering CHAR distribution conformance or DA truth-register patterns benefits from the same primitive.
5. N/A (no HARD-GATE / canon-write / Mystery Reserve firewall surfaces touched).
6. Output schema extension: ADDITIVE-only. The new return shape for hybrid records is `{id, title, file_path, content_hash}` (parallel to atomic records' return shape, substituting `title` from the hybrid record's frontmatter for the atomic record's body-derived metadata). With `include_full_body=true`, the return shape extends to include the full parsed body sections, parallel to atomic records' `body` field. No existing return shape changes; existing atomic-record callers receive byte-identical responses.
7. No rename / removal of any symbol. The change is additive to the `record_type` enum.
8. Adjacent contradictions exposed: `find_named_entities`'s `mentions_by_node_type` field includes counts for `character_record` and `diegetic_artifact_record` even though `list_records` does not. This inconsistency between the two MCP tools' awareness of hybrid types is a correlated symptom, not a bug to fix in this ticket; this ticket aligns `list_records` with the broader pattern.
9. No mismatch + correction — `list_records` enum confirmed in-session via the tool's schema observation.

## Architecture Check

1. The proposed approach (extend `list_records`'s `record_type` enum + implement hybrid listing) is cleaner than alternatives:
   - **Alternative A**: extend `find_named_entities` to return file paths. Rejected — conflates name resolution with enumeration; `find_named_entities`'s purpose is fuzzy/canonical name lookup, not "give me all DAs."
   - **Alternative B**: introduce a new MCP tool `list_hybrid_records`. Rejected — bifurcates the enumeration API across two tools when one would do; consumers would need to decide which tool to call based on record class, adding cognitive overhead.
   - **Chosen approach**: one `list_records` API for both atomic and hybrid record types, enum-discriminated. Operators call the same tool regardless of record class; the tool dispatches to the appropriate parser internally.
2. No backwards-compatibility aliasing/shims introduced. The enum is additive (new accepted values; existing values unchanged). The return shape for hybrid records is new but doesn't conflict with atomic-record return shapes (they're discriminated by the request's `record_type`). No "old path" exists to preserve — `list_records` simply does not currently support hybrid types.

## Verification Layers

1. **Enum extension surfaces hybrid types** → schema validation: `mcp__worldloom__list_records`'s MCP tool schema (the deferred-tool descriptor that ToolSearch returns) includes `character_record`, `diegetic_artifact_record`, `adjudication_record` in the `record_type` enum.
2. **Hybrid-record listing returns the documented shape** → schema validation: `list_records(world_slug='erotica-world', record_type='character_record')` returns an array of `{record_id, content_hash, file_path, body: {title, ...}}` entries (with `body` populated when `include_full_body=true`, omitted otherwise — parallel to atomic records' shape).
3. **Atomic-record listings unchanged** → codebase grep-proof: existing `list_records` consumers (e.g., bootstrap's whole-class M and INV loads) receive byte-identical responses to the pre-change implementation. Verify by capturing pre-change responses and diffing post-change.
4. **`find_named_entities` divergence noted but not addressed** → manual review: the audit-trail entry on this ticket's implementation should explicitly note that `find_named_entities`'s `mentions_by_node_type` field continues to expose counts for hybrid types, retaining the existing query path; this ticket adds a parallel enumeration path, it does not deprecate the count path.

## What to Change

### 1. Extend `record_type` enum in `list_records` MCP tool schema

Add `character_record`, `diegetic_artifact_record`, `adjudication_record` to the `record_type` enum. The enum values mirror the existing atomic-record naming convention (snake_case suffix `_record`).

### 2. Implement hybrid-record directory enumeration

For each new enum value, implement a directory walker that:
- Lists files matching `worlds/<slug>/characters/*.md` (for `character_record`), `worlds/<slug>/diegetic-artifacts/*.md` (for `diegetic_artifact_record`), `worlds/<slug>/adjudications/*.md` (for `adjudication_record`).
- For each file, parses the YAML frontmatter to extract `id` (`character_id` / `artifact_id` / `pa_id` per the hybrid-record schemas) and `title` fields.
- Returns the standard `list_records` response shape: `{records: [{record_id, content_hash, file_path, body?}], total, truncated}`.
- When `include_full_body=true` is passed, populates the `body` field with the full parsed frontmatter + body sections (parallel to how atomic records populate `body` with the full parsed YAML).
- When `fields=[...]` is passed, filters the returned record fields to the named subset (parallel to atomic-records `fields` semantics).

### 3. Documentation update

Update `docs/MACHINE-FACING-LAYER.md` to document the extended enum + the hybrid-record listing return shape. Cross-reference from any worldloom skill SKILL.md that currently describes hybrid-record enumeration via directory listing or `INDEX.md` parsing — those workflows can now use `list_records` directly. (Skills that already use the atomic-record `list_records` pattern, like `branching-story-bootstrap`'s whole-class M and INV loads, do not need updating.)

## Files to Touch

- `tools/world-mcp/<list-records-implementation>` (modify) — extend the enum + add hybrid-type dispatch.
- `tools/world-mcp/<list-records-tool-schema>` (modify) — update the MCP tool descriptor's `record_type` enum.
- `docs/MACHINE-FACING-LAYER.md` (modify) — document the extended enum + hybrid-record return shape.
- `tools/world-mcp/<test-suite>/list-records-hybrid.test.ts` (new) — covers the new hybrid-record listing branch against a fixture world.

## Out of Scope

- **Extension to non-`worlds/<slug>/*` hybrid-like surfaces** (e.g., `world-proposals/NWP-NNNN-*.md` cards at the repository root, `tickets/<NAMESPACE>-NNN.md`, `docs/plans/*.md`). Those are pipeline-meta surfaces, not world canon; their enumeration belongs under separate MCP tools or none (they're already grep-discoverable). This ticket scopes to `worlds/<slug>/<hybrid-dir>/` records.
- **Per-record filtering on hybrid frontmatter content** (e.g., `list_records(record_type='character_record', filters={age_band: 'late-adolescent'})`). The current atomic `list_records` does not support filtering beyond `fields` projection; extending hybrid records with richer filters would diverge from the atomic API. Future ticket if needed.
- **Sorted return order**: existing atomic `list_records` returns records in id-ascending order (per the in-session observation); hybrid-record listings should preserve the same ordering convention. No new sort options introduced.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__list_records(world_slug='erotica-world', record_type='diegetic_artifact_record')` returns `{records: [{record_id: 'DA-0001', content_hash: <sha>, file_path: 'diegetic-artifacts/marla-kerns-journal-the-iker-entries.md'}], total: 1, truncated: false}`.
2. `mcp__worldloom__list_records(world_slug='erotica-world', record_type='character_record')` returns 2 records (`CHAR-0001` and `CHAR-0002`) with correct `file_path` values.
3. `mcp__worldloom__list_records(world_slug='erotica-world', record_type='character_record', fields=['record_id', 'file_path'])` returns the same record set with `body` and `content_hash` omitted (per `fields` filter semantics).
4. `mcp__worldloom__list_records(world_slug='erotica-world', record_type='character_record', include_full_body=true)` returns each record with `body` populated containing parsed frontmatter + body sections.
5. Existing atomic-record callers (e.g., bootstrap's `list_records(world_slug, record_type='mystery_record', include_full_body=true)`) receive byte-identical responses to the pre-change implementation. Verify by running the worldloom branching-story-bootstrap dry-run on `worlds/erotica-world/` and confirming the 4 M-records and 10 INV-records are returned with identical content_hashes.
6. The MCP tool schema (queryable via `ToolSearch` against the deferred tool descriptor) includes `character_record`, `diegetic_artifact_record`, `adjudication_record` in the `record_type` enum.

### Invariants

1. **Atomic-record listing API is preserved unchanged**: existing atomic `record_type` values (`canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`) return identical responses before and after the change.
2. **Hybrid-record listing follows the same response-shape contract as atomic records**: `{records: [...], total, truncated}` envelope; `{record_id, content_hash, file_path, body?}` per record; `fields` projection works identically across atomic and hybrid record types.
3. **Hybrid records are id-ordered**: returned records are sorted by `record_id` ascending (same convention as atomic records), regardless of file-system order.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/<test-suite>/list-records-hybrid.test.ts` (new) — covers the new hybrid-record listing branch with fixtures for `character_record`, `diegetic_artifact_record`, and `adjudication_record` record types. Tests cover the basic listing, `fields` projection, and `include_full_body=true` variants.
2. `tools/world-mcp/<test-suite>/list-records-atomic-regression.test.ts` (new — or extend existing) — captures pre-change atomic-record response snapshots for the standard fixture worlds; asserts byte-identical output post-change.

### Commands

1. `cd tools/world-mcp && npm test -- --grep "list_records hybrid"` — targeted test of the new hybrid-record branch.
2. `cd tools/world-mcp && npm test` — full MCP test suite, confirming no regression in atomic-record listings.
3. **Real-world dry-run**: from a Claude Code agent context, invoke `mcp__worldloom__list_records(world_slug='erotica-world', record_type='diegetic_artifact_record')` and `list_records(world_slug='erotica-world', record_type='character_record')`; confirm both return the expected records with correct ids, file paths, and content hashes matching the on-disk hybrid record files. The narrow targeted test boundary is appropriate because the change is additive (new enum values + new dispatch branches) without modification to existing atomic-record paths; the full-suite test confirms no regression but the primary verification is the hybrid-record branch's correctness.
