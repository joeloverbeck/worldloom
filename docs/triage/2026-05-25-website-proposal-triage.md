# Triage — website-proposal.md (Story Explorer)

**Date**: 2026-05-25
**Source report**: `reports/website-proposal.md` (1222 lines, ChatGPT-Pro)
**Trigger**: user request to critically reassess the ChatGPT-Pro proposal for correctness and benefit, and create specs aligned with FOUNDATIONS.md if changes are warranted.

**Outcome**: 4 specs created (SPEC-87, SPEC-88, SPEC-89, SPEC-90) plus `specs/IMPLEMENTATION-ORDER.md`. Proposal accepted with corrections to four repository claims; modifications to two design decisions (index refresh + spoiler protection — see Named Assumptions A and D in IMPLEMENTATION-ORDER); full §14 Future Enhancements backlog deferred; §16 (meta-prompt for ChatGPT) rejected as not applicable to a worldloom spec.

---

## Classification

**canon-related** per the Step 1 tie-break in the brainstorm skill: tooling work that touches canon-handling logic (MCP retrieval, `world-index` queries, validator schemas, story-bundle records under `_source/`) is classified canon-related, not tooling-adjacent. The Story Explorer also engages story-canon (per-bundle records, prose/plan/receipt artifacts), so FOUNDATIONS §Story Bundles is load-bearing for every spec's Alignment table.

---

## Verification audit — repository claims in the proposal

Three parallel Explore agents verified the proposal's load-bearing repository claims. Findings:

### VERIFIED (no correction needed)

- All MCP read tools cited (`search_nodes`, `get_record`, `get_records`, `get_records_field`, `get_story_state_provenance`, `verify_pg_state_hash`, `list_records`, `get_neighbors`, `get_context_packet`, `find_named_entities`) exist with the claimed behavior. File locations confirmed in `tools/world-mcp/src/tools/*.ts`.
- `world-index render <world-slug> --story <story-slug>` exists and emits raw-YAML view per claim (`tools/world-index/src/commands/render.ts`).
- `world-index build` and `world-index sync` exist (`tools/world-index/src/commands/{build,sync}.ts`).
- SQLite schema confirmed: `nodes`, `edges`, `entities`, `entity_aliases`, `entity_mentions`, `file_versions`, `anchor_checksums`, FTS5 `fts_nodes`, `summaries`, `validation_results` (per `tools/world-index/src/schema/migrations/001_initial.sql`).
- Story-bundle scope columns (`story_slug` on `nodes`, `edges`, `entity_mentions`) confirmed (`004_story_bundle_scope.sql`).
- All cited story-bundle edge types are emitted (`tools/world-index/src/schema/types.ts:92-172`).
- `get_record` requires `story_slug` for story-bundle IDs — gate verified at `tools/world-mcp/src/tools/get-record.ts:244-252`.
- `list_records` supports story-bundle types, projection fields, and parsed-field filters (`tools/world-mcp/src/tools/list-records.ts:21-76`).
- `get_story_state_provenance` resolves SE via `state_delta_create`, `state_delta_supersede`, `creation_evidence` edges (`tools/world-mcp/src/tools/get-story-state-provenance.ts:83-118`).
- `world-mcp` depends on `world-index`, `patch-engine`, `validators` — confirmed at `tools/world-mcp/package.json:18-21`. The proposal's warning to avoid `world-mcp`-as-a-whole for a read-only viewer is justified.
- Story-directories parser maps the 21 claimed classes (`tools/world-index/src/parse/story-directories.ts:10-32`). The `STCHAR` class is parsed via `atomic.ts` (story-characters directory).
- PG schema fields confirmed (`tools/validators/src/schemas/story-page.schema.json`).
- CHC schema fields confirmed; CHC contains no child-page pointer (navigation derives from PG `parent_page_id` + `input.choice_id`).
- SE schema fields confirmed (`tools/validators/src/schemas/story-event.schema.json`).
- Story-bundle artifact paths confirmed against `worlds/erotica-world/stories/red-bunny/`: STORY_KERNEL.md, `_source/<class>/<ID>.yaml`, pages-prose/PG-1.md, pages-prose-plans/PG-1.md, pages-prose-receipts/PG-1.yaml, story-characters/STCHAR-1.md, INDEX.md, `_index/world.db` all present.
- No prior viewer/explorer/web-UI proposals exist in `specs/` / `archive/specs/` / `archive/plans/` / `archive/brainstorming/`. No existing `tools/story-explorer/`. No root-level workspace or web framework infrastructure. Tools are independent packages per `tools/README.md` convention.
- Missing prose is first-class state in the pipeline: `branching-story-health-audit` checks `missing_prose_file`; validator test `prose-receipt-hash-integrity.test.ts` validates missing prose with `prose_unreadable` verdict.
- Build dependency order is enforced by `scripts/build-all.sh`: `world-index → patch-engine → validators → hooks → world-mcp`. A new `tools/story-explorer/` slots in after `world-mcp`.

### PARTIALLY VERIFIED / CORRECTED

| Claim | Correction |
|---|---|
| `openIndexDb` returns `index_missing` / `index_version_mismatch` / `empty_index` / `stale_index` as unified return shape | Actual function is `openExistingIndex()` (and wrapper `openExistingWorldIndex()`) in `tools/world-index/src/index/open.ts:163`. It THROWS on missing index; `SchemaVersionMismatchError` is caught at the command layer. The error families are real but distributed across open + command layers. SPEC-87 §4 explicitly addresses this by having `src/read/index-status.ts` assemble the unified `IndexStatus` view-model from the throw + command-layer-catch pattern. |
| `PG.plan.prose_plan_path` is nested under `plan` | Per `story-page.schema.json`, `prose_plan_path` is TOP-LEVEL on PG; `plan.plan_hash` is separately nested under `plan`. SPEC-87 §4 has the corrected shape. |
| Indexer parses SLB, SAU, SP, RSP at MCP layer | Not found in indexer parser; only `story-characters` (STCHAR) is parsed. Enumeration of `audits/`, `storylet-batches/`, `story-promotions/` is present in `enumerate.ts:45-54` but parsing is partial. SPEC-87 §7 uses direct file reads for SLB / SAU / SP / RSP in v1; a future indexer extension can promote them to indexed-node retrieval. |
| "MCP read-tool logic can be reused or mirrored carefully" without standing up MCP | Verified: NO shared read-only facade exists between `world-index` and `world-mcp`. SPEC-87 §7 + Named Assumption C in IMPLEMENTATION-ORDER document the chosen path: backend depends on `@worldloom/world-index` public exports + `better-sqlite3` directly, mirroring read-side parsing in-tree. |

These corrections were applied to the specs at write-time; no follow-up correction commit is needed.

---

## Per-section verdicts (against proposal §§1-16)

### ACCEPT (taken into specs as-recommended, corrections applied)

| Proposal § | Subject | Landed in |
|---|---|---|
| §1 | Executive verdict (literary reader + State X-Ray; local Node + web; read-only) | All four specs |
| §2 | Repository findings (used as design evidence; corrections per audit) | SPEC-87 §3-§5 |
| §4 | User intent & non-goals (no writes / no skills / no generation / etc.) | SPEC-87 §2 / §6, SPEC-88 §2, SPEC-89 §2, SPEC-90 §2 |
| §5 | Information architecture (World→Story→Page picker flow) | SPEC-88 §4 |
| §6 | Page experience design (header, prose panel, choice cards, terminal cards) | SPEC-88 §5-§7 |
| §7 | State X-Ray design (8 record groups, 4 tabs, sticky rail, mobile flow) | SPEC-89 §3-§9 |
| §8 | Deterministic summary rules per class | SPEC-89 §7 (data path: SPEC-87 §8) |
| §9 | Data model / view model | SPEC-87 §4 |
| §10 | Local read-only architecture | SPEC-87 §3 / §6 / §7 |
| §11 | Accessibility & interaction | SPEC-88 §8, SPEC-89 §11, SPEC-90 §5.1 / §6.3 |
| §12 | Edge case table (22 rows) | distributed across SPEC-87 §4-§7, SPEC-88 §6-§9, SPEC-89 §4.4 / §10, SPEC-90 §4 |
| §13 | MVP scope | IMPLEMENTATION-ORDER Named Assumption E |
| §15 | Decisions made by judgment | mapped to IMPLEMENTATION-ORDER Named Assumptions A-E |

### ACCEPT-WITH-MODIFICATION

| Proposal § | Modification | Lands in |
|---|---|---|
| §3 | Research findings (Twine / Ink / Ren'Py / Local-First / WAI-ARIA / WCAG / React Flow) | Kept as design rationale cited inline in specs rather than as a separate research deliverable — already done; no new external research warranted. |
| §10 "Refresh derived index" decision | Deferred to v2; v1 backend has no index-refresh code path. Index staleness surfaces via `IndexStatus.remedy`; user runs `world-index sync` from CLI. | IMPLEMENTATION-ORDER Named Assumption A; SPEC-87 §6 Layer 4 fence. |

### DEFER (not spec'd here; in "Future Enhancements" backlog)

§14 in entirety: richer branch map / timeline mode / sibling comparison / outcome-variant diff / static export / spoiler mode / receipt overlays / record diff / packaged desktop / author annotations / thumbnails / saved sessions / graph neighborhood / x-ray "why active" explainer / schema-aware validation explanations / import-free demo mode.

Plus all of §13 "Should Wait": timeline mode, sibling branch comparison, static export/share, reader-safe spoiler mode, receipt quality overlays, full record diff, packaged desktop, thumbnails/screenshots, rich graph analytics, editing/generation/continuation/skill integration.

Captured in `specs/IMPLEMENTATION-ORDER.md` § "Future Enhancements".

### REJECT

| Proposal § | Reason |
|---|---|
| §16 (Prompt for Claude Code Proposal-to-Spec Follow-up) | Meta-instruction directed at ChatGPT; not applicable to a worldloom spec. The specs themselves are the conversion this section describes. |

---

## Deliverables written

| # | File | Purpose |
|---|---|---|
| 1 | `specs/SPEC-87-story-explorer-backend-foundation.md` | Backend package, read-only HTTP API, view models, source priority, index freshness |
| 2 | `specs/SPEC-88-story-explorer-frontend-foundation.md` | React/Vite scaffold, World/Story/Page pickers, page reading surface (prose panel + choices), accessibility baseline |
| 3 | `specs/SPEC-89-story-explorer-state-xray-layer.md` | 8 record groups, 4 X-Ray tabs, deterministic summaries, raw YAML escape hatch, linked-record navigation |
| 4 | `specs/SPEC-90-story-explorer-branch-map-and-search.md` | Branch map drawer + page search modal (FTS-backed) |
| 5 | `specs/IMPLEMENTATION-ORDER.md` | Order, depends-on graph, named assumptions, "Future Enhancements" backlog |
| 6 | `docs/triage/2026-05-25-website-proposal-triage.md` | This file |

No code written. The specs are the deliverable; implementation comes next (separate user direction).

---

## Open decisions for user-eye on review

Carried into IMPLEMENTATION-ORDER §"Open decisions surfaced for user review":

1. Default local server port (SPEC-87 proposes 5174).
2. First manual smoke-test story bundle (proposed: `worlds/erotica-world/stories/red-bunny/`).
3. CLI bin name (proposed: `story-explorer` over a shorter `wl-view`).

None of these blocks SPEC-87 implementation; all are trivial to override on the first read.
