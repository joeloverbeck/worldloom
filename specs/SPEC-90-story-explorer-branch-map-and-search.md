# SPEC-90 — Story Explorer Branch Map & Search

**Status**: draft
**Depends on**: SPEC-87 (backend foundation; archived at `archive/specs/SPEC-87-story-explorer-backend-foundation.md`), SPEC-88 (frontend foundation; archived at `archive/specs/SPEC-88-story-explorer-frontend-foundation.md`), SPEC-89 (state x-ray)
**Related**: `specs/IMPLEMENTATION-ORDER.md`
**Companion triage**: `docs/triage/2026-05-25-website-proposal-triage.md`

---

## 1. Purpose

Add the two orientation surfaces the proposal flags as required for v1 but separable from the page-reading + X-Ray pair: the **Branch Map drawer/modal** (visualizes PG parent-child structure and CHC labels) and **Page Search/Jump** (FTS-backed search over PG IDs, branch IDs, choice labels, child outcome labels, SE outcome routes, prose text, record IDs, record classes, and title/claim/objective fields).

Both are orientation aids; neither competes with the reading surface. The branch map opens as a focus-trapped drawer/modal from the page header; search opens from the page header and from the Page Entry screen.

## 2. Scope

### In scope

- Backend search endpoint full implementation (SPEC-87 stubs the route signature; SPEC-90 implements).
- Backend branch-map endpoint full implementation (SPEC-87 stubs the route signature; SPEC-90 implements).
- Frontend branch-map drawer: PG nodes, parent-child edges, CHC surface labels on edges, current-page highlight, sibling-page visibility around current branch path, search/filter inside the drawer.
- Frontend page-search modal: query input, result list with deterministic preview, jump-to-page action.
- Accessible drawer / modal patterns per WAI-ARIA APG (focus trap, Escape closes, focus returns to invoking element).
- React Flow (or equivalent canvas library — implementer's choice) used ONLY inside the drawer; never as a permanent dominant graph.

### Out of scope

- Timeline mode (Future Enhancements).
- Sibling branch comparison (Future Enhancements).
- "What differs between these two outcome variants" view (Future Enhancements).
- Rich graph analytics, clustering, branch coloring beyond minimum required for branch identification (Future Enhancements).
- Graph neighborhood around a selected record (Future Enhancements).
- Static export of map / search results (Future Enhancements).

## 3. Backend — search endpoint

`GET /api/worlds/:slug/stories/:storySlug/search?q=<text>&kinds=<csv>&limit=<n>&offset=<n>`

Query parameters:

- `q` — free-text query string. Required.
- `kinds` — comma-separated filter. Allowed values: `page`, `choice`, `record`, `prose`, `outcome`. Default: all.
- `limit` — page size, default 50, max 200.
- `offset` — pagination offset.

Sources, in order:

1. **PG ID exact match** (`q` matches `PG-<n>` pattern): direct PG lookup, returned first as a single "Exact page match" result.
2. **Record ID exact match** (`q` matches any story-bundle ID pattern): direct record lookup, returned next.
3. **Branch ID exact match** (`q` matches `BR-<n>`): branch-membership lookup, returned with all PGs on that branch.
4. **FTS over `fts_nodes`** (when index is fresh): hits include prose text, plan text, parsed record bodies, choice surface labels, SE outcome routes, title/claim/objective fields. Each hit returns: result kind, record/page ID, branch ID, turn index (when applicable), a short text excerpt with the matched span highlighted, and link target.
5. **Direct grep fallback** (when index is stale and degraded mode is enabled): scan `pages-prose/*.md`, `pages-prose-plans/*.md`, and `_source/<class>/*.yaml` for the query string. Slower; clearly flagged in the result envelope as "degraded search (stale index)".

Response shape:

```ts
interface SearchResponse {
  query: string;
  totalCount: number;
  results: SearchHit[];
  searchMode: 'indexed' | 'degraded_direct';
  _envelope: { worldIndexStatus: IndexStatus; ... };
}

interface SearchHit {
  kind: 'page' | 'choice' | 'record' | 'prose' | 'outcome';
  id: string;            // PG-N, CHC-N, etc.
  branchId: string | null;
  turnIndex: number | null;
  pageId: string | null;  // for hits that aren't themselves a page
  title: string;          // deterministic summary line for the hit
  excerpt: string;        // surrounding text with <mark> spans
  linkTarget: string;     // frontend route to jump to
}
```

Page-search results NEVER return raw record bodies; SPEC-89's record route is the body source. Results return deterministic summaries (per SPEC-89 §7) and an excerpt.

## 4. Backend — branch-map endpoint

`GET /api/worlds/:slug/stories/:storySlug/branch-map?focus=<pageId>&depth=<n>`

Query parameters:

- `focus` — center the returned subgraph on this PG. Required.
- `depth` — neighborhood depth in graph hops from focus, default 3, max 10. Larger values risk performance issues on huge stories.

Returns:

```ts
interface BranchMapResponse {
  focusPageId: string;
  nodes: BranchMapNode[];
  edges: BranchMapEdge[];
  truncated: boolean;       // true when actual neighborhood exceeded depth
  _envelope: { worldIndexStatus: IndexStatus; ... };
}

interface BranchMapNode {
  pageId: string;
  branchId: string;
  turnIndex: number;
  label: string;           // deterministic short label
  hasProse: boolean;
  isCurrent: boolean;      // true iff pageId === focusPageId
  isLeaf: boolean;
  isTerminal: boolean;
  eventKind: string | null;
  outcomeRoute: string | null;
}

interface BranchMapEdge {
  fromPageId: string;
  toPageId: string;
  choiceId: string | null;
  choiceLabel: string | null;  // CHC surface_label when input.choice_id resolves
  variantLabel: string | null; // for multi-variant CHCs
  branchId: string;
}
```

Source: indexed PG nodes (`parent_page_id` + `input.choice_id`) and CHC nodes (`surface_label`) within the depth-bounded neighborhood. Outcome routes pulled from each child PG's resolved SE.

Performance: the endpoint MUST bound result size. If `depth` would return more than 500 nodes, the endpoint truncates to the 500 nearest-to-focus and sets `truncated: true`. The frontend can render an "Expand neighborhood" affordance to request increased depth, with a clear performance warning.

## 5. Frontend — branch map drawer

The drawer opens from the page header's "Branch Map" button (placeholder slot from SPEC-88; SPEC-90 wires it).

### 5.1 Drawer / modal interaction (WAI-ARIA APG)

- Focus moves into the drawer on open.
- Tab / Shift+Tab cycle stays inside the drawer.
- Escape closes the drawer.
- Focus returns to the "Branch Map" button on close.
- The drawer has a visible title and an `aria-modal` attribute. The rest of the page is set inert (or aria-hidden) for the duration.

### 5.2 Graph rendering

- Library: React Flow (default; alternatives acceptable if implementer prefers — Svelte/Solid equivalents). The choice is named here as the default; substituting is a single-spec change.
- Nodes: PG records. Visual shape: small rounded rectangle with PG ID + branch chip.
- Edges: parent → child PG. Edge label: CHC `surface_label` when `input.choice_id` resolves; unlabeled when the child has no choice (manual action / event-driven page).
- Node chips for: branch ID, terminal status, rendered-prose presence, event kind.
- Current page highlighted (color + outline; not color-only — outline ensures contrast).
- Sibling pages around the current branch path visible by default (parent's other children, current's siblings on same branch).
- Initial render: focus neighborhood at depth 3. "Expand neighborhood" button increases depth.

### 5.3 In-drawer search/filter

A search input inside the drawer filters the visible nodes by PG ID, branch ID, or label substring. Matching nodes pulse; non-matching nodes dim. Clear-filter restores.

### 5.4 Click behavior

- Click on a node → drawer closes + page navigates to that PG.
- Click on an edge label → no navigation; opens a tooltip with the full CHC compact summary.

### 5.5 Performance

- Branch map drawer is lazy-loaded: the graph library code chunk is only fetched on first drawer open.
- Initial render virtualizes off-screen nodes when feasible.
- Reduced-motion users get a static (non-animated) layout pass.

## 6. Frontend — page-search modal

Opens from:

- the page header's "Jump" affordance (placeholder slot from SPEC-88; SPEC-90 wires it)
- the Page Entry screen's "Choose page" affordance (placeholder slot from SPEC-88; SPEC-90 wires it)
- keyboard shortcut: `Cmd+K` / `Ctrl+K` (scoped to the document, not a single-letter global per the SPEC-88 accessibility baseline)

### 6.1 Modal pattern

Standard WAI-ARIA modal: focus trap, Escape closes, focus returns to opener.

### 6.2 Input & results

- Single input at the top. Debounce 200ms.
- Kind filter chips below input (`Pages`, `Choices`, `Records`, `Prose`, `Outcomes`) — all on by default; toggle to refine.
- Result list below, virtualized for large result sets.
- Each result row: kind icon + title + excerpt with `<mark>` highlighting + branch/turn chip when applicable.
- Click result → modal closes + navigates to `linkTarget`.
- Empty state: "No results. Try a different query or check that the index is fresh."
- Degraded mode banner: when `searchMode === 'degraded_direct'`, show "Searching directly (index stale). Results may be incomplete; run `world-index sync` to restore indexed search."

### 6.3 Accessibility

- Modal pattern per WAI-ARIA APG.
- Result list is keyboard-navigable: up/down to focus result, Enter to navigate, Escape to close.
- Highlighted match (`<mark>`) is announced by screen readers via appropriate `aria-label` on the row, not relying on visual mark alone.

## 7. Build & test

- Backend tests: search endpoint with FTS fresh-index path; search endpoint degraded-mode path; branch-map endpoint focus + depth bounds; branch-map truncation behavior; search kind filtering.
- Frontend tests: branch-map drawer focus trap; modal focus trap; keyboard navigation in result list; reduced-motion fallback; degraded-mode banner visibility.
- Manual smoke against a multi-branch fixture story bundle (if available; fall back to `red-bunny` single-page bundle and a script that creates additional PGs in a test fixture).

## 8. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
|---|---|---|
| §Story Bundles §3 — Read Discipline (`story_slug` scoping; indexed retrieval) | aligns @ backend endpoint surface | Both new routes scope by `story_slug` and use indexed-node + indexed-edge access; degraded direct-read mode is named, bounded, and clearly flagged. |
| §Story Bundles §4 — Write Discipline (engine-only writes) | aligns @ backend route surface | Both new routes are GET; no write surface introduced. Inherits the four-layer fence from SPEC-87. |
| §Story Bundles §5 — Validation Rules at Story Scope (CHC `grounded_in`) | aligns @ branch-map edge labels | Edge labels derive from CHC `surface_label`; the field's load-bearing role is honored. Multi-variant rendering preserves the "one choice → multiple outcomes" structure rather than collapsing it. |
| §Story Bundles §4a — Plan-Authority Boundary (PG is page authority) | aligns @ branch-map nodes | Nodes are PG records; `hasProse` is a presentation flag derived from filesystem presence, not a fork primitive — the fork primitive remains PG per FOUNDATIONS. |
| §Tooling Recommendation — agents never operate on prose alone | N/A @ this surface | Search and branch map are human orientation surfaces, not LLM agent surfaces. |
