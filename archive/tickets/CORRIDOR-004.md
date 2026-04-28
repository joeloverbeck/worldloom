# CORRIDOR-004: `get_record` extended to hybrid records (CHAR / DA / PA) with optional `section_path`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/` (extend `get_record` tool dispatch); `tools/world-index/` (hybrid-file frontmatter parsing); `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline (one-sentence addition)
**Deps**: None — additive extension to existing tool

## Problem

`mcp__worldloom__get_record(record_id)` currently handles atomic records only (`CF-NNNN`, `CH-NNNN`, `INV-*`, `M-NNNN`, `OQ-NNNN`, `ENT-NNNN`, `SEC-*-NNN`). Hybrid records — `CHAR-NNNN` (character dossiers), `DA-NNNN` (diegetic artifacts), `PA-NNNN` (adjudications) — are not retrievable through `get_record`. Skills must instead `Read` the hybrid file's full markdown body, which has two failure modes: (a) hybrid files routinely exceed the Read tool's 25K-token cap (Namahan's CHAR-0003 dossier is 26,077 tokens; Vespera's CHAR-0001 is similar), forcing offset/limit chunked reads; (b) the most load-bearing piece of structured data in many hybrid files — the YAML frontmatter's `world_consistency` block (Phase 7 firewall trace) — is buried inside a 26K-token markdown file, with no targeted-retrieval path.

Session evidence from DA-0003 generation: the dossier-trace shortcut documented in `diegetic-artifact-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback Step 3 depends entirely on reading `CHAR-0003.world_consistency.{invariants_respected,mystery_reserve_firewall,canon_facts_consulted}`. There is currently no MCP path for this read; the operator must Read the whole dossier and parse the frontmatter manually.

`docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline currently says: "Skills read atomic records via `mcp__worldloom__get_record(record_id)` or `get_context_packet(...)`." This implicitly excludes hybrid records from MCP retrieval and aligns with current behavior. Extending `get_record` to handle hybrid records additively requires a one-sentence FOUNDATIONS update to acknowledge the extension.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/server.ts:249-250` registers `get_record` and `get_record_field`; the tool handler lives in `tools/world-mcp/src/tools/`. Atomic-record dispatch logic is in place; hybrid-record dispatch is the addition.
2. `tools/world-index/src/schema/types.ts:296` defines `DiegeticArtifactFrontmatter`; an analogous `CharacterDossier` interface exists in the same module (referenced by patch-engine envelope schema at `tools/patch-engine/src/envelope/schema.ts:5`). The frontmatter parsers already exist for the patch-engine's hybrid-file append ops; this ticket reuses them on the read side.
3. Cross-artifact boundary: extending `get_record` is additive to its dispatch table. Atomic-record callers are unaffected. Hybrid-record callers (new) gain a structured retrieval path. No existing MCP tool is renamed or removed.
4. FOUNDATIONS principle under audit: §Canonical Storage Layer §Read discipline (line 514) says atomic records load via `get_record`; this extension preserves that statement and adds a parallel statement for hybrid records. §Tooling Recommendation (line 476) requires LLM agents receive load-bearing context via the documented retrieval pattern; hybrid-record retrieval becomes part of that pattern after this ticket.
6. Schema extension: the response payload for hybrid records mirrors atomic records' shape (parsed frontmatter + content_hash + file_path) but includes the markdown body section structure. The optional `section_path` parameter projects a subset (e.g., `frontmatter.world_consistency`, `frontmatter.author_profile`, `body.Capabilities`) for narrow consumption — same projection-by-path discipline as the existing `get_record_field`.

## Architecture Check

1. Extending the existing `get_record` tool is cleaner than introducing a parallel `get_hybrid_record` because the dispatch is a single switch on the record-id prefix (`CF-` / `CHAR-` / `DA-` / `PA-`), not a different conceptual operation. Hybrid records ARE records; their storage form (hybrid YAML+markdown) is an implementation detail. A parallel tool would force callers to know the record-class taxonomy at call site, which is the kind of leakage MCP retrieval is designed to abstract.
2. No backwards-compatibility aliasing/shims introduced. Atomic-record ids continue to dispatch as before; hybrid-record ids are a new dispatch branch. The `section_path` parameter is optional and additive.

## Verification Layers

1. `get_record('CHAR-0003')` returns the full dossier as parsed frontmatter + body sections → schema validation: integration test asserts the response matches `CharacterDossier` interface shape with `content_hash` matching the file on disk.
2. `get_record('CHAR-0003', section_path='frontmatter.world_consistency')` returns only the world_consistency block → schema validation: response contains `invariants_respected`, `mystery_reserve_firewall`, `canon_facts_consulted` keys and nothing else from frontmatter or body.
3. FOUNDATIONS §Canonical Storage Layer §Read discipline mentions hybrid-record retrieval after this ticket → FOUNDATIONS alignment check (grep for "hybrid records" in §Read discipline subsection).
4. Hook 2 (large-read guard) does not interfere with hybrid-record retrieval via `get_record` → manual review: `get_record('CHAR-NNNN')` is an MCP tool call, not a raw `Read`, so Hook 2's `_source/` redirect doesn't apply. Confirmed by code path inspection.

## What to Change

### 1. Extend `get_record` dispatch in `tools/world-mcp/`

Add hybrid-record dispatch to `get_record` for ids matching `^(CHAR|DA|PA)-\d{4}$`:
- Resolve the hybrid file path via the world index's file-path lookup (already available for patch-engine's append ops; reuse the lookup helper).
- Parse the YAML frontmatter using the existing parser in `tools/world-index/`.
- Parse the markdown body into named sections (using H1/H2 boundaries; the same scheme `selective-read by structural anchors` consumers already rely on).
- Return `{record_id, parsed_frontmatter, body_sections, content_hash, file_path}`.

### 2. Add optional `section_path` parameter to `get_record`

Schema: `section_path: string` (optional). Format: dot-path notation. Examples:
- `frontmatter.world_consistency` — returns only the parsed frontmatter's `world_consistency` block.
- `frontmatter.author_profile` — returns only the author_profile block.
- `body.Capabilities` — returns only the body section under the `## Capabilities` heading.

Response when `section_path` is provided: `{record_id, section_path, value, content_hash, file_path}`. The `value` field carries the projected content (parsed YAML for frontmatter projections; markdown text for body projections).

If `section_path` does not resolve, return an error code `section_not_found` listing valid paths for that record.

### 3. Update `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline

Append one sentence after the existing "Skills read atomic records via `mcp__worldloom__get_record(record_id)` or `get_context_packet(...)`." sentence:

> Hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) are also retrievable via `get_record(record_id)` with optional `section_path` projection — frontmatter blocks (`frontmatter.world_consistency`, `frontmatter.author_profile`) and body sections (`body.Capabilities`) project as structured slices, paralleling `get_record_field` for atomic records.

### 4. Skill prose updates (cross-references)

The diegetic-artifact-generation skill's `references/world-state-prerequisites.md` §Context-packet-too-large fallback Step 3 currently describes the "dossier-trace shortcut" via direct Read of the dossier. Update Step 3 to use `get_record('CHAR-NNNN', section_path='frontmatter.world_consistency')` as the canonical path, with the manual Read named as a fallback when the hybrid-record retrieval is unavailable (pre-CORRIDOR-004 worlds, etc.).

The character-generation skill (and any other skill that consumes hybrid records) gets the same treatment in its prerequisites/references files.

## Files to Touch

- `tools/world-mcp/src/tools/get-record.ts` (modify — add hybrid-record dispatch + `section_path` projection)
- `tools/world-index/src/parsers/` (modify — expose hybrid-file frontmatter+body parser if not already exposed; reuse from patch-engine if present)
- `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline (modify — one-sentence addition per §3 above)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify — update §Context-packet-too-large fallback Step 3 to use hybrid-record retrieval)
- `.claude/skills/character-generation/` (modify — equivalent update; exact reference file path determined at implementation time)
- `tools/world-mcp/tests/` (new tests — hybrid-record retrieval + section_path projection)

## Out of Scope

- Mutation of hybrid records via `get_record` — read-only, mutation continues to route through `submit_patch_plan`'s `append_*_record` ops.
- A parallel `get_hybrid_record` tool — explicitly rejected per Architecture Check #1.
- Hook 2 changes — current Hook 2 redirects bulk `_source/` directory Reads; hybrid records live outside `_source/`, so Hook 2 is unaffected.
- Indexing hybrid records into world.db beyond what the index already does — the world-index already tracks hybrid records as nodes; this ticket reuses existing index queries.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --grep "get-record-hybrid"` — `get_record('CHAR-0003')` against `worlds/animalia/` returns parsed frontmatter + body sections with `content_hash` matching `sha256(file_contents)`.
2. `cd tools/world-mcp && npm test -- --grep "get-record-section-path"` — `get_record('CHAR-0003', 'frontmatter.world_consistency')` returns only the world_consistency block.
3. `cd tools/world-mcp && npm test -- --grep "get-record-section-path-missing"` — `get_record('CHAR-0003', 'body.NonExistentSection')` returns `section_not_found` error with valid-paths hint.
4. FOUNDATIONS §Canonical Storage Layer §Read discipline contains the new sentence per §3 above → grep verification: `grep -n "Hybrid records.*get_record" docs/FOUNDATIONS.md` returns the inserted line.

### Invariants

1. Atomic-record dispatch behavior is unchanged; existing `get_record('CF-NNNN')` callers see no behavioral difference.
2. Hybrid-record responses always include `content_hash` matching the file's current sha256 (so consumers can detect post-read mutation).
3. `section_path` projections never include content from a different record; cross-record leakage is prevented by per-record file resolution before parsing.
4. Hook 3 (engine-only mutation guard) is unaffected; this ticket is read-side only.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/get-record-hybrid.test.ts` — full hybrid-record retrieval for CHAR / DA / PA fixtures.
2. `tools/world-mcp/tests/get-record-section-path.test.ts` — section_path projection across frontmatter and body shapes.
3. `tools/world-mcp/tests/get-record-section-path-errors.test.ts` — error paths (invalid record_id, invalid section_path, malformed dot-path).

### Commands

1. `cd tools/world-mcp && npm test -- --grep "get-record"` — full get_record test suite (atomic + hybrid).
2. `cd tools/world-mcp && npm test` — full world-mcp suite.
3. `Skill diegetic-artifact-generation worlds/animalia briefs/<existing-brief>.md worlds/animalia/characters/namahan-of-the-third-gate.md` — manual full-pipeline verification that the dossier-trace shortcut in `references/world-state-prerequisites.md` §Step 3 successfully invokes `get_record('CHAR-0003', 'frontmatter.world_consistency')` and the firewall coverage carries forward to the artifact's Phase 7 trace.
