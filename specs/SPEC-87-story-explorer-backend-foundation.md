# SPEC-87 — Story Explorer Backend Foundation

**Status**: draft
**Origin**: `reports/website-proposal.md` triage (2026-05-25)
**Related**: SPEC-88 (frontend), SPEC-89 (state x-ray), SPEC-90 (branch map & search), `specs/IMPLEMENTATION-ORDER.md`
**Companion triage**: `docs/triage/2026-05-25-website-proposal-triage.md`

---

## 1. Purpose

Establish a new local read-only backend package `tools/story-explorer/` that exposes worldloom story bundles to a web frontend (SPEC-88) for reading and author-x-ray inspection. The backend reads existing repository content — `world-index` SQLite for indexed nodes/edges/FTS, plus direct file reads for rendered prose, page plans, prose receipts, raw YAML, and exact missing-file semantics — and serves a deterministic view-model HTTP API. It exposes **no** write surface, **no** patch-engine submission, **no** ID allocation, **no** skill invocation, and **no** prose/plan/receipt mutation.

This is the structural base for SPEC-88 / SPEC-89 / SPEC-90. The package adds a new product surface (a viewable reader/author tool); it does not change canon semantics or story-pipeline behavior.

## 2. Scope

### In scope

- New tool package at `tools/story-explorer/` following the existing per-package convention (`package.json`, `tsconfig.json`, `src/`, `dist/`, ESM, Node `>=22`, private).
- Read-only HTTP API surface on a configurable local port (default `localhost:5174`).
- Read source priority:
  1. `world-index` SQLite (`worlds/<slug>/_index/world.db`) as primary read model when fresh.
  2. Direct file reads (`Read`-style, not `Edit`/`Write`) for `pages-prose/PG-<n>.md`, `pages-prose-plans/PG-<n>.md`, `pages-prose-receipts/PG-<n>.yaml`, `STORY_KERNEL.md`, raw `_source/<class>/<ID>.yaml` bodies surfaced through a "view raw" affordance, and exact missing-file presence checks.
- Index freshness detection using the existing `openExistingIndex` / `openExistingWorldIndex` helpers in `tools/world-index/src/index/open.ts`, plus `SchemaVersionMismatchError` recognition at the command layer.
- Deterministic view-model assembly per §4 (no LLM summaries).
- Structural fencing per §6 (no write routes by construction; no `submit_patch_plan` / `validate_patch_plan` / `allocate_*_id` / mutation imports).
- Build/test scripts that integrate with the existing `scripts/build-all.sh` dependency-ordered build (`world-index → patch-engine → validators → hooks → world-mcp → story-explorer`).

### Out of scope

- Any frontend code (SPEC-88).
- State X-Ray record-group rendering (SPEC-89).
- Branch map drawer + search (SPEC-90 — search endpoint sketch lives here as §5 placeholder; full implementation is SPEC-90).
- Index refresh from inside the explorer. See Named Assumption A in `specs/IMPLEMENTATION-ORDER.md`: users run `world-index sync` from the CLI in v1. The explorer detects and surfaces staleness; it does not trigger a refresh.
- MCP server hosting. The backend depends on `@worldloom/world-index` public exports + `better-sqlite3` directly and mirrors read-side parsing in-tree. It does NOT depend on `@worldloom/world-mcp` to avoid transitive mutation surface.
- LLM-generated summaries. All summaries are deterministic field-based per §8 of the source proposal.
- Spoiler protection. The explorer is an explicit author-x-ray tool; hidden state is shown with appropriate styling, not masked.

## 3. Package layout

```
tools/story-explorer/
├── package.json                    # name: @worldloom/story-explorer, private, ESM, type=module, bin: story-explorer
├── tsconfig.json                   # extends repo-standard
├── README.md                       # short usage doc
├── src/
│   ├── cli.ts                      # entry: parses args, starts server
│   ├── server/
│   │   ├── http.ts                 # HTTP server (Node http or Fastify — implementer's choice)
│   │   ├── routes/
│   │   │   ├── worlds.ts           # GET /api/worlds, GET /api/worlds/:slug
│   │   │   ├── stories.ts          # GET /api/worlds/:slug/stories, GET /api/worlds/:slug/stories/:storySlug
│   │   │   ├── pages.ts            # GET /api/worlds/:slug/stories/:storySlug/pages/:pageId
│   │   │   ├── records.ts          # GET /api/worlds/:slug/stories/:storySlug/records/:recordId
│   │   │   ├── prose.ts            # GET /api/worlds/:slug/stories/:storySlug/prose/:pageId (+ page-plans, prose-receipts)
│   │   │   ├── search.ts           # GET /api/worlds/:slug/stories/:storySlug/search (sketch only here; full impl SPEC-90)
│   │   │   ├── branch-map.ts       # GET /api/worlds/:slug/stories/:storySlug/branch-map (sketch only here; full impl SPEC-90)
│   │   │   ├── provenance.ts       # GET /api/worlds/:slug/stories/:storySlug/provenance/:recordId
│   │   │   └── health.ts           # GET /api/health (process-level, no world dependency)
│   │   └── readonly-guard.ts       # asserts no POST/PUT/PATCH/DELETE handlers registered
│   ├── read/
│   │   ├── world-list.ts           # enumerate `worlds/*/` from working tree
│   │   ├── story-list.ts           # enumerate `worlds/<slug>/stories/*/`
│   │   ├── page-detail.ts          # PageDetail view-model assembly
│   │   ├── record-card.ts          # RecordCard view-model assembly + deterministic summary rules
│   │   ├── prose-direct.ts         # direct read of pages-prose/plans/receipts
│   │   ├── raw-yaml.ts             # direct read of _source/*.yaml bodies
│   │   ├── index-status.ts         # wraps openExistingIndex, classifies into IndexStatus enum
│   │   └── provenance.ts           # state_delta_create/supersede/creation_evidence edge walks
│   ├── view-models/
│   │   ├── world-summary.ts
│   │   ├── story-summary.ts
│   │   ├── page-summary.ts
│   │   ├── page-detail.ts
│   │   ├── choice-navigation.ts
│   │   ├── child-outcome-variant.ts
│   │   ├── record-card.ts
│   │   ├── record-link.ts
│   │   ├── branch-map-node.ts      # type only (renderer in SPEC-90)
│   │   └── branch-map-edge.ts      # type only (renderer in SPEC-90)
│   └── config/
│       └── repo-root.ts            # resolves worktree-root-anchored paths
├── test/
│   ├── readonly-guard.test.ts
│   ├── index-status.test.ts
│   ├── page-detail.test.ts
│   ├── record-card.test.ts
│   ├── deterministic-summaries.test.ts
│   ├── missing-prose.test.ts
│   └── fixtures/                   # in-repo committed copies of minimal story bundles; first smoke target: a trimmed copy of worlds/erotica-world/stories/red-bunny/ (one PG, one prose, one plan, one receipt — complete artifact shape per brainstorm-time exploration)
└── dist/                           # gitignored build output
```

## 4. View models (TypeScript interfaces, summarized)

The proposal's §9 view models are adopted with field-name normalization. Concrete shapes:

```ts
interface WorldSummary {
  worldSlug: string;
  displayName: string;
  path: string;                     // absolute, anchored to worktree root
  indexStatus: IndexStatus;
  storyCount: number;
  hasWorldDb: boolean;
  indexVersion: number | null;
  driftedFiles: string[];           // empty when fresh
  errors: string[];
}

interface StorySummary {
  worldSlug: string;
  storySlug: string;
  storyId: string;                  // STORY-N from STORY_KERNEL.md frontmatter
  title: string | null;
  kernelPath: string;
  pageCount: number;
  choiceCount: number;
  branchCount: number;
  renderedProseCount: number;       // direct count of pages-prose/PG-*.md
  leafPageIds: string[];
  rootPageId: string | null;        // typically PG-1
  latestPageId: string | null;      // highest turn_index
  indexStatus: IndexStatus;
}

interface PageSummary {
  pageId: string;
  branchId: string;
  parentPageId: string | null;
  turnIndex: number;
  choiceId: string | null;          // PG.input.choice_id
  resolvedEventId: string | null;   // PG.input.resolved_event_id
  hasRenderedProse: boolean;        // direct path check
  hasPlan: boolean;                 // direct path check
  hasReceipt: boolean;              // direct path check
  activeRecordCounts: Record<string, number>;  // keyed by record class
  childCount: number;               // derived: PG records whose parent_page_id matches
  isLeaf: boolean;
  isTerminalOrPaused: boolean;
  terminalReason: 'no_children' | 'paused' | 'terminal' | null;  // discriminator for SPEC-88's <TerminalCard> body sub-line; null when isTerminalOrPaused is false
}

interface PageDetail {
  page: ParsedPageRecord;           // full PG body
  prose: string | null;             // rendered markdown body, or null when absent
  proseStatus: ProseStatus;         // present | missing | unreadable | hash_mismatch
  pagePlanSummary: PagePlanSummary | null;
  receiptSummary: ReceiptSummary | null;
  choiceNavigation: ChoiceNavigation[];
  currentStateRecordIds: string[];  // pass-through; SPEC-89 assembles RecordCard[]
  eventDelta: EventDeltaSummary;
  validationIntegrity: ValidationIntegritySummary;
  branchContext: BranchContext;
  rawSources: RawSourceReference[]; // per-record source paths + content hashes
}

interface ChoiceNavigation {
  choiceId: string;
  surfaceLabel: string;
  playerVisibleIntent: string;
  pressure: string[];
  groundedInCount: number;
  childOutcomeVariants: ChildOutcomeVariant[];
  isNavigable: boolean;             // true iff at least one childOutcomeVariant
}

interface ChildOutcomeVariant {
  pageId: string;
  branchId: string;
  turnIndex: number;
  resolvedEventId: string | null;
  outcomeRoute: string | null;
  resolutionPreview: string | null;
  selectedStoryletId: string | null;
  hasRenderedProse: boolean;
  stateDeltaCounts: { create: number; supersede: number; close: number };
}

type IndexStatus =
  | { kind: 'fresh'; version: number }
  | { kind: 'missing'; remedy: string }                  // "run world-index build"
  | { kind: 'version_mismatch'; expected: number; found: number; remedy: string }
  | { kind: 'empty'; remedy: string }
  | { kind: 'stale'; driftedFiles: string[]; remedy: string }  // "run world-index sync"
  | { kind: 'open_failed'; error: string };
```

Note: per the proposal-claim correction in the triage, `IndexStatus` is assembled by `src/read/index-status.ts` from the THROWN behavior of `openExistingIndex` plus the command-layer catch of `SchemaVersionMismatchError` — there is no single unified return shape upstream. The view-model presents one.

## 5. HTTP API (read-only)

All routes are GET. The router must structurally reject any non-GET method registration (see §6).

| Route | Returns | Source |
|---|---|---|
| `GET /api/health` | `{ ok: true, version }` | process-level |
| `GET /api/worlds` | `WorldSummary[]` | filesystem enumeration + index check per world |
| `GET /api/worlds/:slug` | `WorldSummary` with extended diagnostics | as above |
| `GET /api/worlds/:slug/stories` | `StorySummary[]` | story-bundle enumeration |
| `GET /api/worlds/:slug/stories/:storySlug` | `StorySummary` extended | as above |
| `GET /api/worlds/:slug/stories/:storySlug/pages?root&latest&list` | `PageSummary[]` or single PG-1 / latest leaf | indexed PG nodes; query selects view |
| `GET /api/worlds/:slug/stories/:storySlug/pages/:pageId` | `PageDetail` | combined index + direct reads |
| `GET /api/worlds/:slug/stories/:storySlug/records/:recordId` | full record body (parsed YAML / hybrid frontmatter+sections) | indexed node body or direct file read |
| `GET /api/worlds/:slug/stories/:storySlug/records/:recordId/raw` | raw YAML/markdown source + content hash + source path | direct file read |
| `GET /api/worlds/:slug/stories/:storySlug/prose/:pageId` | rendered markdown body + proseStatus | direct file read with hash check — separate from PageDetail so SPEC-88's `<ProsePanel>` can lazy-fetch the body when only PageSummary chrome has been rendered |
| `GET /api/worlds/:slug/stories/:storySlug/page-plans/:pageId` | page plan body | direct file read — PageDetail returns only `pagePlanSummary`; the full plan body is fetched on-demand when SPEC-89's Plan & Prose tab opens |
| `GET /api/worlds/:slug/stories/:storySlug/prose-receipts/:pageId` | parsed receipt YAML | direct file read — PageDetail returns only `receiptSummary`; the full receipt is fetched on-demand when SPEC-89's Validation & Integrity tab opens or when a hash-mismatch warning expands |
| `GET /api/worlds/:slug/stories/:storySlug/search?q=...&kinds=...` | sketch endpoint (SPEC-90 owns full implementation) | FTS via `fts_nodes` + parsed-field filters |
| `GET /api/worlds/:slug/stories/:storySlug/branch-map?focus=:pageId` | sketch endpoint (SPEC-90 owns) | indexed PG/CHC nodes + parent-child edges |
| `GET /api/worlds/:slug/stories/:storySlug/provenance/:recordId` | creating SE + modifying SE list + evidence records | `state_delta_create`, `state_delta_supersede`, `creation_evidence` edge walks (mirrors `get_story_state_provenance` logic from `tools/world-mcp/src/tools/get-story-state-provenance.ts`) |

All responses include an `_envelope` object with `requestId`, `serverVersion`, and `worldIndexStatus` so the frontend can surface staleness universally.

### Story-bundle ID `story_slug` scoping

All `/api/worlds/:slug/stories/:storySlug/records/:recordId` lookups validate that `recordId` is a story-bundle ID class per FOUNDATIONS §Story Bundles §6 — the full per-bundle class set (`PG`, `SE`, `BEL`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STENT`, `STSTAT`, `STCHAR`, `STLOC`, `STOBJ`, `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`, `BR`, `CHC`, `SLT`, `DA`, `SLB`) plus the audit / promotion classes (`SAU`, `SP`, `RSP`) — and that the resolution path passes `story_slug`. This mirrors the gate at `tools/world-mcp/src/tools/get-record.ts:244-252`. The first 23 classes route to indexed-node retrieval where the indexer's parser layer covers them; `SLB`, `SAU`, `SP`, `RSP` route to direct-file-read code paths per §7 (the indexer's parser layer does not currently parse them). Cross-bundle ID collisions return a structured `invalid_input` envelope error.

## 6. Read-only fencing (structural)

The backend must enforce read-only at multiple layers — being read-only by convention is insufficient.

**Layer 1 — package dependencies.** `tools/story-explorer/package.json` MUST NOT depend on `@worldloom/patch-engine`. It MAY depend on `@worldloom/world-index` (public exports + types) and on `better-sqlite3`. It MUST NOT depend on `@worldloom/world-mcp` (which transitively pulls in patch-engine and exposes mutation tools). **DB-connection acquisition**: use `openExistingIndex()` (from `@worldloom/world-index/index/open`) as the canonical surface for opening `_index/world.db` — this keeps the explorer's schema-version checking and stale-detection semantics consistent with `world-index sync`. Direct `better-sqlite3` use in `tools/story-explorer/src/` is limited to type references for the returned `Database` instance and to read-only query primitives (`db.prepare(...).all(...)`); the explorer MUST NOT open a separate `better-sqlite3.Database` handle to `_index/world.db` outside the `openExistingIndex` API, since a parallel connection would bypass the version-check side effects the world-index helper enforces.

**Layer 2 — route registrar.** `src/server/readonly-guard.ts` wraps the HTTP router and throws at startup if any handler is registered for `POST`/`PUT`/`PATCH`/`DELETE`. A test (`test/readonly-guard.test.ts`) verifies this by attempting to register a `POST` route and asserting the wrap rejects it.

**Layer 3 — file-system writes.** The backend MUST NOT call `fs.writeFile`, `fs.appendFile`, `fs.mkdir` (other than for ephemeral OS temp paths, none required by v1), or any equivalent. A test asserts the bundled `dist/` makes no `fs.write*` import-site references.

**Layer 4 — index refresh.** The backend MUST NOT invoke `world-index build` or `world-index sync` as a subprocess or in-process call. Staleness is surfaced via the IndexStatus view-model with a `remedy` string that the frontend renders as guidance to the user (who runs the CLI manually). Per Named Assumption A in `specs/IMPLEMENTATION-ORDER.md`, this can be relaxed in a future spec if friction warrants.

## 7. Source-priority rules

For each datum the frontend needs, the backend follows the proposal §9 priority table:

| Datum | Primary source | Secondary / fallback |
|---|---|---|
| PG / SE / CHC bodies + active record bodies | `world-index` SQLite (parsed `nodes.body`) | direct YAML parse from `_source/` (fallback when index stale-for-this-file or schema-version-mismatched) |
| FTS over prose / plan text | `fts_nodes` (when indexed and fresh) | direct file grep (degraded mode; only when index stale) |
| Rendered prose for display | direct `pages-prose/PG-<n>.md` read | indexed markdown-node body (used only when degraded direct-read fails) |
| Page plan | direct `pages-prose-plans/PG-<n>.md` read | indexed markdown-node body |
| Prose receipt | direct `pages-prose-receipts/PG-<n>.yaml` read | indexed YAML-node body |
| Raw record body | direct `_source/<class>/<ID>.yaml` read | indexed `nodes.body` |
| Edges / provenance | SQLite `edges` table | parsed record fields when index stale |
| Index freshness | `openExistingIndex` + `file_versions` table comparison | filesystem mtime+hash fallback only when DB cannot open |

Direct file reads are NOT a parallel state model; they are artifact reads where the file's presence/absence/hash is a UX fact. SLB / SAU / SP / RSP records (per the triage correction: not currently parsed at the indexer's parser layer) are read directly from their hybrid markdown files for v1; a future indexer extension can promote them to indexed-node retrieval.

## 8. Deterministic summaries (carry-over from proposal §8)

`src/read/record-card.ts` implements per-class summary rules per the proposal's §8 table — `STENT`, `STCHAR`, `STSTAT`, `BEL`, `SF`, `SE`, `CHC`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STLOC`, `STOBJ`, `DA`, `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`, `BR`, `SLT`. Field rendering is fully implemented in SPEC-89; SPEC-87 owns the data path (parsed body → summary inputs) and the fallback chain:

1. explicit `title` / `label` / `name` / `objective` / `claim`;
2. first meaningful string field defined per class;
3. record ID + class;
4. `"Untitled <CLASS> record"`.

Never fabricate text not present in the record.

## 9. Build & test

- `npm run build` compiles `src/` to `dist/`.
- `npm test` runs vitest (or the existing repo standard) with fixtures covering: fresh-index happy path, missing-prose first-class state, stale-index degraded mode, broken-reference detection, hash mismatch detection, story-bundle `story_slug` scoping gate, read-only fencing (all four layers).
- `scripts/build-all.sh` is extended to append `tools/story-explorer/` after `tools/world-mcp/` in the dependency-ordered build list.
- `scripts/check-all.sh` runs the test suite for `tools/story-explorer/` after upstream packages.

## 10. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
|---|---|---|
| §Canonical Storage Layer — engine-only write surface for `_source/` | aligns @ backend route surface | No POST/PUT/PATCH/DELETE routes (Layer 2 fence); no patch-engine dependency (Layer 1 fence); no `fs.write*` (Layer 3 fence). |
| §Story Bundles §3 — Read Discipline (targeted retrieval, `story_slug` scoping) | aligns @ runtime retrieval | All story-bundle record lookups validate `story_slug`; mirrors the gate in `tools/world-mcp/src/tools/get-record.ts:244-252`. |
| §Story Bundles §4a — Plan-Authority Boundary (PG is page authority; prose is renderable receipt) | aligns @ view-model assembly | `proseStatus` is first-class on PageDetail; missing prose is `present | missing | unreadable | hash_mismatch`, never an error that blocks page access. |
| §Story Bundles §4 — Write Discipline (story-bundle writes are engine-routed) | aligns @ structural fencing | Four-layer fence ensures no story-bundle mutation path exists from the explorer. |
| §Story Bundles §6.1 — Story-Local Character Authority | aligns @ record retrieval | STCHAR is fetched as story-local (hybrid frontmatter+body); world `CHAR` is not substituted as a runtime shortcut. |
| §Tooling Recommendation — agents never operate on prose alone | N/A @ this surface | The explorer is a human-facing reader/x-ray, not an LLM agent surface; the principle's audience does not apply. (Defensive disclosure: principle is in the canon-reading cluster, so the row is included.) |
