## **1. Executive verdict**

Worldloom’s next iteration should **not** be “make Story Explorer display scenes instead of pages.” That is too shallow and would preserve the old error under new names.

The correct next architecture is:

**Story Explorer becomes a branch-path author dashboard with scene segments, unscened causal-tick runs, and embedded PG x-ray.** Scene prose is prominent when it exists, but the primary authoring object is the **causal branch timeline**, segmented by scenes where available and by unrendered PG runs where not.

The blunt version:

1. **Delete page-as-prose from live systems.** No `pages-prose`, no page-plan routes, no page prose receipts, no `/pages/:pageId` reader route.  
2. **Keep PGs, but demote them in UX.** PGs are causal ticks / state snapshots / fork anchors. They are inspectable through timeline, scene detail, unscened-range detail, and x-ray drawers. They are not reader pages.  
3. **Retire SPEC-90.** Its search and branch-map intent is valuable, but its shape is page-first and stale.  
4. **Do not put publication workflow into mutable-looking `SCN.status`.** Scene publication state should be derived from the presence and freshness of plan/prose/receipt artifacts, not encoded as `planned | rendered | attached` on an append-only SCN record.  
5. **Keep the scene layer lean.** SCN should remain a render-membership record over committed PG ranges. Quality, freshness, prose verdicts, and publishability belong in receipts/index/view models.  
6. **Do the cleanup now.** There are no production stories and no backward-compatibility requirement. Keeping legacy page-prose compatibility will poison every new abstraction.

---

## **2. Repository access note and SHA verification result**

I could not complete the requested `main` SHA verification because the Git connector behaved inconsistently. Repository search found `joeloverbeck/worldloom`, but subsequent repository metadata and file calls repeatedly resolved through the connector namespace associated with `joeloverbeck/one-more-branch`; `fetch_file` against `joeloverbeck/worldloom` at the supplied SHA also failed for normal API-style calls, while direct exact blob fetches from `github.com/joeloverbeck/worldloom/blob/6c8bd0fedae907ab442c3588813d954250751b76/...` succeeded for targeted files.

So the precise status is:

**I could not prove whether current `main` equals `6c8bd0fedae907ab442c3588813d954250751b76`.** I therefore did not silently assume it. The repository evidence below is tied to targeted file fetches from the supplied exact SHA where direct blob fetches succeeded, and to the uploaded manifest as file inventory only. The uploaded manifest lists the live scene skills and tooling surfaces used for inventory, while archived `branching-story-prose-attach` references appear only under archive paths rather than as a live skill path.

---

## **3. Current repository evidence**

### **Scene/state split has mostly landed**

The live workflow documentation says story state is authoritative when PG/SE/choice records are committed; bootstrap and turn-cycle now commit planless state; rendered prose is planned and attached at scene scope; and any committed page snapshot can remain a parent regardless of prose status.

The shared state contract now states the core authority split: world canon, story state, and rendered prose are separate; rendered prose does not create story state; PG commit is authoritative; and SCN is a derived render-unit membership record over committed PG ranges.

`branching-story-scene-plan` exists and is explicitly described as selecting or refreshing a scene over committed PGs, creating or superseding an SCN record, and writing scene prose plans.

The scene plan structure is strongly novelist-facing: body prose is forbidden from using record IDs, hashes, schema vocabulary, validator names, patch-engine terms, lifecycle terms, raw state-delta vocabulary, or literary arc-shape language.

The scene range rules require a contiguous branch-path PG range, same branch, choice surface at the end PG, and emitted choices matching the end PG.

`branching-story-scene-prose-attach` exists and validates user-supplied rendered scene prose for a planned SCN, then writes a scene prose receipt. It has `strict` and `run_craft_notes` options, but its own contract says it writes only direct publication artifacts and does not mutate PG, SCN, SE, or other `_source` story state.

The scene-prose receipt checks cover the right conceptual territory: included PG events rendered, final choice surface visibility, entity/status consistency, invented structural facts, forbidden mystery resolution, STCHAR fidelity, engine jargon leak, and canon claims without authority.

### **SCN exists, but its status model is suspect**

The SCN schema requires `status`, `pg_ids`, `start_page_id`, `end_page_id`, `choice_surface_page_id`, `emitted_choice_ids`, `plan_path`, `prose_path`, and `receipt_path`.

The current `status` enum is `planned | rendered | attached`.

That clashes with attach semantics: if attach does not mutate SCN, `status` cannot reliably express rendered/attached state unless every attach writes a new SCN or an external process mutates it. The better model is derived publication state.

### **Scene validators are real**

`scene_range_integrity` is registered for SCN creation/supersession and scene files.

It enforces non-empty range, start/end consistency, end PG choice surface, same branch, contiguous branch path, no sibling PGs in range, and emitted choice parity with the end PG.

The scene-prose receipt schema requires `scene_id`, `story_id`, `scn_status`, `strict_mode`, `plan_path`, `prose_path`, `receipt_path`, `included_pages`, `checks`, `verdict`, `notes`, and `repair_recommendation`, with no additional properties.

### **Story Explorer is still page-first**

The backend still exposes `/api/worlds/:slug/stories/:storySlug/pages` and `/pages/:pageId`.

The backend still exposes page prose, page plans, and page prose receipts at `/prose/:pageId`, `/page-plans/:pageId`, and `/prose-receipts/:pageId`, reading from `pages-prose`, `pages-prose-plans`, and `pages-prose-receipts`.

The frontend route tree still imports `PageEntryRoute` and `PageReadRoute`, and routes `/worlds/:slug/stories/:storySlug/entry` plus `/worlds/:slug/stories/:storySlug/pages/:pageId`.

The page-read route loads `PageDetail`, calls `getPageDetail`, renders `PageHeader`, `ProsePanel`, choices, and `XRayPanel`, all centered on a `pageId`.

The `PageDetail` view model still combines `page`, `prose`, `pagePlanSummary`, `receiptSummary`, `choiceNavigation`, `eventDelta`, validation integrity, branch context, and raw sources.

### **SPEC-90 is live, draft, and page-centric**

SPEC-90’s purpose is branch map plus search for the old page-reading + x-ray pair. It explicitly defines a branch map that visualizes PG parent-child structure and a “Page Search/Jump” feature.

Its scope names PG nodes, page-search modal, current-page highlighting, page jump actions, and React Flow in a drawer attached to the page header.

The actual branch-map and search backend routes are placeholders that return `kind: "not_implemented"` and say implementation lands in SPEC-90.

### **World-index and patch-engine partially support scenes but still accept page prose artifacts**

World-index recognizes both `_source/pages` as `page_record` and `_source/scenes` as `scene_record`.

But the world-index file inventory still treats `pages-prose`, `pages-prose-plans`, `scene-prose`, and `scene-prose-plans` as indexable markdown directories, and still treats both `pages-prose-receipts` and `scene-prose-receipts` as indexable YAML directories.

The patch engine already has `create_scn_record` and `supersede_scn_record`, alongside `create_pg_record`.

The ID allocator already recognizes `SCN` and maps it to story-scoped `scenes`, while `PG` remains mapped to `pages`.

---

## **4. Research synthesis**

Interactive fiction tools consistently separate **authoring units**, **control flow**, and **state**, even when their visible authoring unit is called a passage, knot, node, scene, or label.

Twine’s core authoring unit is the passage: passages can represent divisions of time, space, dialogue, code, or project structure, and links connect passages into an interactive story. That supports the idea that a visible authoring unit need not be identical to a low-level state tick.

Yarn Spinner’s scripts are built from nodes; nodes contain dialogue, options, commands, and headers, and titles are used for jumping but not shown to players. This is directly relevant: title/control identity and player-facing text are separable.

Ink describes knots as a fundamental content structure, while also supporting branching, choices, diverts, and joining. Again, the content unit and the control-flow unit cooperate but are not the same thing.

ChoiceScript explicitly separates variables/stats from scene files and `*scene_list` flow; scenes are files in the player-facing progression, while state lives in variables and stats.

Ren’Py uses labels, jumps/calls, and menus: labels are control-flow anchors; menus present choices; the visual novel surface is not just a graph node dump.

The useful research lesson is not “Worldloom should copy Twine or Ink.” It is sharper:

**Author tools need two synchronized projections: a literary/navigation projection and a state/control/provenance projection.** Worldloom’s PGs are too granular and causal to be the literary projection. SCNs are the literary projection. But authors still need the state/control projection, so PG x-ray cannot disappear.

For provenance UX, the W3C PROV model frames provenance as information about entities, activities, and people used to assess reliability, quality, and trust; it also emphasizes processing steps, derivation, versioning, and procedures. That maps cleanly to Worldloom’s need to show “this scene prose derives from these PG state hashes, this plan, this receipt, and these events.”

For LLM context design, long-context research warns that models become less robust when relevant information sits in the middle of long prompts. That is a strong argument against letting scene plans become bloated page-plan bundles stuffed with every possible record, policy, craft note, and raw state detail.

---

## **5. Post-overhaul architecture assessment**

The overhaul landed the right core insight:

**PG = causal tick. SCN = render unit. Prose = non-authoritative rendering.**

But the repository is now in a half-overhauled state:

* The story engine is mostly scene-ready.  
* The scene planning and attach skills exist.  
* SCN validation exists.  
* Patch-engine and ID allocation recognize scenes.  
* The shared docs increasingly describe the new split.

But the live system still leaks the old architecture through:

* Story Explorer page routes.  
* Page prose/page plan/page receipt backend routes.  
* Frontend page-read/page-entry routes.  
* Page-based API client types.  
* World-index inventory support for page-prose directories.  
* Shared schema text preserving legacy page-prose receipt concepts.  
* Optional legacy PG `plan` and `prose_plan_path`.  
* SPEC-90.  
* Tests and fixture assumptions.

The current design is not yet “scene-first.” It is **state-first in the engine, page-first in the Explorer, and mixed in the contracts**.

That is dangerous because tools tend to fossilize around the UI. If Story Explorer continues to make `/pages/:pageId` the place where authors read, inspect, search, and branch, PGs will remain psychologically first-class prose units even if the skills say otherwise.

---

## **6. Story Explorer scene-first / author-x-ray UX architecture**

### **Primary navigation model**

Story Explorer should become a **branch-path timeline segmented by scene coverage**.

The main story view should not be a page list. It should be a **branch dashboard**:

* selected branch,  
* root PG,  
* latest committed PG,  
* latest planned scene,  
* latest rendered/publishable scene,  
* unscened committed PG runs,  
* active choice surfaces,  
* validation/freshness alerts,  
* branch siblings and forks.

The core visual unit should be a timeline of segments:

1. **Scene segment** — an SCN covering PG-N through PG-M.  
2. **Unscened run** — committed PG-N through PG-M with no SCN yet.  
3. **Choice/fork marker** — playable choices at the end PG of a scene or unscened run.  
4. **Terminal/pause marker** — branch pause or terminal closure.

This gives the author what they actually need: “Where am I in the branch? Which state ticks exist? Which ranges have been planned/rendered? Where are my unrendered causal ticks piling up?”

### **Scene detail**

A scene detail screen should be an author workbench, not a reader page.

Recommended layout:

* Header: `SCN-N`, branch, PG range, previous scene, coverage/freshness chips, plan/prose/receipt status.  
* Main left panel: scene prose when present; otherwise scene plan or “prose not attached.”  
* Main right panel: x-ray.  
* Bottom/side rail: PG tick list, event deltas, emitted choice surface, active records, validation/freshness.

Tabs:

* **Overview**  
* **Prose**  
* **Plan**  
* **Receipt**  
* **PG Ticks**  
* **Events & Deltas**  
* **Choices**  
* **Active Records**  
* **Validation & Freshness**  
* **Raw Sources**

### **Unscened range detail**

An unscened range is not an error. It is a normal authoring state.

It should show:

* PG range,  
* branch path,  
* state progression summary,  
* event deltas,  
* emitted choices at final PG,  
* active records at each tick or diffed between start/end,  
* validation traces,  
* likely scene planning readiness,  
* no reader/prose affordance except “no scene plan/prose exists yet.”

This is where the author works for many turns before rendering.

### **Render queue / coverage panel**

Use a “coverage” panel, not an automatic boundary recommender.

It should list:

* unscened committed PG runs,  
* planned-but-unrendered scenes,  
* rendered-but-unattached scenes,  
* attached-with-warnings scenes,  
* stale receipt/prose/plan scenes,  
* superseded scenes.

Automatic scene-boundary suggestion is not a priority and should not dominate. Optional helper behavior can group contiguous unscened PGs by branch and choice surface, but the author should choose the final range.

---

## **7. Backend/API architecture**

The backend should stop exposing page-first reader APIs. Use a scene/state vocabulary.

Recommended endpoint families:

### **Story overview**

`GET /api/worlds/:worldSlug/stories/:storySlug/overview`

Returns:

* story metadata,  
* branch summaries,  
* root PG,  
* latest PG per branch,  
* scene coverage counts,  
* unscened range counts,  
* plan/prose/receipt counts,  
* stale artifact counts,  
* validation/index status.

### **Branch timeline**

`GET /api/worlds/:worldSlug/stories/:storySlug/timeline?branchId=BR-N&focus=PG-N|SCN-N`

Returns ordered timeline segments:

* `scene_segment`,  
* `unscened_run`,  
* `choice_surface`,  
* `branch_split`,  
* `terminal_marker`.

This is the new backbone. Story Explorer should load this before scene detail.

### **Scene list/detail**

`GET /api/worlds/:worldSlug/stories/:storySlug/scenes`

Filters:

* `branchId`,  
* `hasPlan`,  
* `hasProse`,  
* `receiptVerdict`,  
* `freshness`,  
* `coverage=open|complete|superseded`.

`GET /api/worlds/:worldSlug/stories/:storySlug/scenes/:sceneId`

Returns:

* SCN record,  
* derived publication state,  
* included PG summaries,  
* end choice surface,  
* event delta summaries,  
* plan/prose/receipt availability,  
* freshness diagnostics,  
* links to x-ray payloads.

### **Scene artifacts**

Use explicit scene artifact routes:

* `GET /api/.../scenes/:sceneId/plan`  
* `GET /api/.../scenes/:sceneId/prose`  
* `GET /api/.../scenes/:sceneId/receipt`

Do not use `/prose/:pageId`, `/page-plans/:pageId`, or `/prose-receipts/:pageId`.

### **Unscened ranges**

`GET /api/worlds/:worldSlug/stories/:storySlug/unscened-ranges?branchId=BR-N`

Returns contiguous committed PG ranges on a branch path not covered by active SCN records.

Each range should include:

* start/end PG,  
* count,  
* final choice surface,  
* event delta summary,  
* active record delta summary,  
* validation status summary,  
* suggested default range label, not an automatic scene boundary verdict.

### **State tick x-ray**

Prefer embedded delivery through timeline and scene detail.

If a technical endpoint is necessary:

`GET /api/worlds/:worldSlug/stories/:storySlug/state-ticks/:pgId/xray`

This does not violate the user’s intent if it is clearly a technical x-ray endpoint and not a reader page route. But the frontend should prefer query-focused routes such as:

`/timeline?focus=PG-12`

not:

`/pages/PG-12`

### **Records/events/choices**

Keep technical lookup surfaces:

* `GET /api/.../records/:recordId`  
* `GET /api/.../events/:eventId`  
* `GET /api/.../choices/:choiceId`

These should be x-ray surfaces, not reader surfaces.

### **Branch map**

`GET /api/.../branch-map?layer=scene|tick|both&focus=SCN-N|PG-N|CHC-N|BR-N&depth=N`

### **Search**

`GET /api/.../search?q=&kinds=&domains=&groupBy=scene_or_unscened_range`

Do not call it `searchPages`.

### **Stale index behavior**

Every response should carry:

* world index status,  
* stale/missing index remedy,  
* whether response is indexed or degraded direct-read,  
* artifact freshness status for scene plans/prose/receipts.

Stale index should degrade orientation gracefully, but it must never fabricate scene coverage.

---

## **8. Frontend route/view-model/component architecture**

### **Delete these frontend route concepts**

* `/entry`  
* `/pages/:pageId`  
* `PageReadRoute`  
* `PageEntryRoute`  
* page reader not-found labels  
* page-first breadcrumbs  
* page-based “Plan & Prose” tabs

### **New route hierarchy**

Recommended:

/  
 worlds  
/worlds/:worldSlug/stories  
/worlds/:worldSlug/stories/:storySlug  
/worlds/:worldSlug/stories/:storySlug/timeline  
/worlds/:worldSlug/stories/:storySlug/scenes  
/worlds/:worldSlug/stories/:storySlug/scenes/:sceneId  
/worlds/:worldSlug/stories/:storySlug/unscened  
/worlds/:worldSlug/stories/:storySlug/branch-map  
/worlds/:worldSlug/stories/:storySlug/search

PG focus should be represented as query state:

/worlds/:worldSlug/stories/:storySlug/timeline?branch=BR-1&focus=PG-12  
/worlds/:worldSlug/stories/:storySlug/scenes/SCN-3?focusPg=PG-12

### **New view models**

Replace `PageDetail` with:

* `StoryOverview`  
* `BranchSummary`  
* `BranchTimeline`  
* `TimelineSegment`  
* `SceneSummary`  
* `SceneDetail`  
* `ScenePublicationState`  
* `SceneArtifactSummary`  
* `UnscenedRange`  
* `StateTickXray`  
* `EventDeltaSummary`  
* `ChoiceSurface`  
* `RecordCard`  
* `SearchHit`  
* `BranchMapGraph`

### **Component split**

Core components:

* `StoryDashboard`  
* `BranchSelector`  
* `TimelineSegmentList`  
* `SceneSegmentCard`  
* `UnscenedRunCard`  
* `ChoiceSurfacePanel`  
* `SceneDetailShell`  
* `SceneProsePanel`  
* `ScenePlanPanel`  
* `SceneReceiptPanel`  
* `StateTickDrawer`  
* `StateDeltaPanel`  
* `ActiveRecordsPanel`  
* `ValidationFreshnessPanel`  
* `BranchMapCanvas`  
* `SearchModal`

`ProsePanel` can survive only if renamed and semantically rebuilt as `SceneProsePanel`. A page-level `ProsePanel` should die.

---

## **9. State tick / PG x-ray model without page routes**

PG inspection remains essential. Page routes do not.

The model should be:

* PGs are shown as **ticks inside a timeline segment**.  
* Clicking a PG opens a **state tick x-ray drawer**.  
* A PG x-ray can be deep-linked through timeline focus, but not as a page reader.

A `StateTickXray` should include:

* PG id,  
* branch id,  
* parent PG,  
* branch path,  
* turn index,  
* input choice/write-in/manual mode,  
* resolved SE,  
* state hash and parent hash,  
* state snapshot summary,  
* active records by class,  
* visible affordances,  
* unresolved mystery claims,  
* continuation status,  
* emitted choices,  
* validation trace,  
* raw PG YAML,  
* event delta,  
* created/superseded/closed records,  
* links to containing SCN or unscened range.

This preserves everything authors need while killing the mental model that PG equals prose page.

A technical route like `/state-ticks/:pgId/xray` is acceptable only as an API/debug affordance. The product route should be timeline-focused, not PG-reader-focused.

---

## **10. Scene, SCN, scene-plan, and scene-prose attach architecture recommendations**

### **SCN schema**

The SCN record should stay minimal, but the current `status` field should change.

Current `planned | rendered | attached` is the wrong abstraction because attach does not mutate SCN. It creates a stale source of truth the moment receipt/prose files change out of band.

Recommended SCN fields:

* id,  
* story_id,  
* branch_id,  
* pg_ids,  
* start_page_id,  
* end_page_id,  
* choice_surface_page_id,  
* emitted_choice_ids,  
* previous_scene_id,  
* supersedes,  
* superseded_by or equivalent if the existing lifecycle pattern requires it,  
* plan_path,  
* prose_path,  
* receipt_path.

Remove publication workflow from SCN. Compute it in a derived `ScenePublicationState`:

missing_plan  
planned  
prose_present_no_receipt  
attached_pass  
attached_warn  
attached_fail  
stale_receipt  
superseded

Do not add `stale`, `failed`, `publishable`, or `needs_refresh` to SCN. Those are derived states, not membership facts.

### **`previous_scene_id`**

`previous_scene_id` is useful but insufficient. Branch sequencing must be derived from:

* branch id,  
* branch path,  
* start/end PG,  
* SCN coverage graph,  
* supersession status.

A previous pointer is a convenience, not authority.

### **`choice_surface_page_id`**

Keep `choice_surface_page_id == end_page_id` for now. It is a clean invariant and matches the workflow docs: only the final PG in the SCN range supplies the playable choice surface.

### **`emitted_choice_ids`**

Keep it. It duplicates end PG emitted choices, but usefully freezes the intended scene choice surface and supports direct scene integrity checks. The validator already checks it against the end PG.

### **Scene plans**

The current scene plan body rules are right, but the contract risks recreating bloated page plans.

Recommendations:

1. **Keep full content policy inline**, per user decision.  
2. **Stop permanently inlining the full prose craft contract and render-time instruction in every scene plan.** Use canonical contract references with version/hash, and generate a renderer packet when cold-paste rendering needs full text.  
3. **Keep the body novelist-facing.** Do not put record IDs in the prose-facing body.  
4. **Add metadata-sidecar support.** Store PG ids, event ids, hashes, source record maps, and validation references in frontmatter or a sidecar block/file. Body stays clean; validation stays grounded.  
5. **For long scenes, summarize by beat groups over PG ranges.** Do not dump every PG’s full state into the plan body. Preserve the load-bearing deltas and the final choice surface.

### **Scene-prose attach**

The eight checks are conceptually sound, but the receipt should become more evidentiary.

Change receipt semantics to include:

* per-check status,  
* per-check rationale,  
* optional paragraph/span references,  
* deterministic evidence fields,  
* freshness fingerprints:  
  * SCN record hash,  
  * plan hash,  
  * prose hash,  
  * included PG state hashes,  
  * receipt schema version.

Strict mode should become a **publication profile**, not just “write receipt but block publication marker.” Suggested profiles:

* `draft_attach`: receipt may contain WARN/FAIL; artifact is inspectable, not publishable.  
* `review_attach`: FAIL blocks publishable marker; WARN allowed with rationales.  
* `publishable_attach`: no FAIL, bounded WARN, evidence/rationale required.

Do not mutate `SCN.status` on attach. Do not write a patch-engine SE by default. Scene prose remains non-causal.

---

## **11. Legacy page-prose purge plan**

Purge from live systems:

* `pages-prose/`  
* `pages-prose-plans/`  
* `pages-prose-receipts/`  
* page prose routes  
* page plan routes  
* page receipt routes  
* page prose attach references  
* page-level `ProsePanel`  
* page-level “Plan & Prose” tab semantics  
* `PageDetail` as a reader view model  
* `PageSummary.hasRenderedProse`  
* `StorySummary.renderedProseCount` based on page prose  
* `searchPages`  
* branch-map node types that imply PG-as-reader-page  
* docs saying rendered prose lives at `pages-prose/PG-N.md`  
* live shared-schema §4.6 prose receipt contract  
* optional PG `plan` and `prose_plan_path` for new/live schemas

Keep:

* `_source/pages/PG-N.yaml` as causal tick storage.  
* `PG` as the low-level record class for now.  
* validators that actually check PG causal state, after renaming.  
* archived historical specs/reports/tickets, as archive only.

The live `.claude/skills/branching-story-prose-attach/SKILL.md` path was not present in targeted exact-SHA fetches, and the manifest shows only archived prose-attach references. So the live skill itself appears already removed; the remaining work is reference and concept cleanup.

---

## **12. SPEC-90 disposition**

**Retire SPEC-90. Do not implement it.**

Its useful goals are:

* branch map,  
* search/jump,  
* accessible modal/drawer patterns,  
* result filtering,  
* graph visualization bounded by focus/depth.

But its model is wrong now:

* branch map focuses on `pageId`,  
* graph nodes are PG pages,  
* search kinds include `page`,  
* search scans `pages-prose` and `pages-prose-plans`,  
* frontend actions jump to pages,  
* timeline mode is explicitly out of scope even though timeline is now the correct primary surface.

The route placeholders that reference SPEC-90 should be removed or replaced by the new scene/timeline search and branch-map architecture.

SPEC-90 should move to archive with a note: “superseded by scene-first / x-ray-first Story Explorer architecture.”

---

## **13. Validators/schemas/world-index/patch-engine/MCP impact analysis**

### **Validators**

| Surface | Verdict | Reason |
| ----- | ----- | ----- |
| `scene_range_integrity` | Keep, harden | It encodes the right SCN range invariants. |
| `scene_plan_structural` | Keep, harden | Scene plans need structure validation. |
| `scene_plan_body_engine_vocabulary_cleanliness` | Keep | Protects novelist-facing body. |
| `scene_plan_verbatim_section_integrity` | Redesign | Keep full content policy inline; reconsider craft/render-time inlining. |
| `scene_prose_receipt_schema_compliance` | Keep | Required. |
| `scene_prose_receipt_content` | Keep, expand | Move deterministic checks here; add evidence/rationale expectations. |
| `scn_no_narrative_shape_language` | Keep | Prevents SCN from becoming act/arc plot rails. |
| page-plan validators | Delete or replace | Do not preserve page-plan architecture. |
| page prose receipt validators | Delete | Replace with scene-prose receipt validators. |
| `page_plan_turn_driver_consistency` | Rename/keep | It checks PG/SE linkage, not page planning. |
| `page_plan_active_pressure` | Rename/keep as x-ray helper | It identifies high-urgency active records from PG state snapshots. |
| `page_affordance_integrity` | Likely rename/keep | If it validates PG `visible_affordances`, it is causal-state validation, not prose validation. |

### **Schemas**

Change:

* Remove live page prose receipt schema/contract surfaces.  
* Remove optional legacy PG `plan` and `prose_plan_path` from live schema expectations.  
* Remove `SCN.status` or reduce it to append-only lifecycle only.  
* Add derived publication-state view models, not SCN fields.  
* Add receipt evidence/rationale/fingerprint schema support.

### **World-index**

Change inventory:

* `scene-prose/`, `scene-prose-plans/`, `scene-prose-receipts/` remain indexable.  
* `pages-prose/`, `pages-prose-plans/`, `pages-prose-receipts/` become unexpected outside archive/legacy fixture quarantine.  
* Add derived scene coverage computation:  
  * active SCNs by branch,  
  * superseded SCNs excluded by default,  
  * unscened PG runs,  
  * scene-to-PG inclusion,  
  * PG-to-containing-scene lookup,  
  * scene artifact freshness.

### **Patch-engine**

Keep:

* `create_pg_record`,  
* `create_scn_record`,  
* `supersede_scn_record`.

Do not add patch operations for scene prose attach. Attach is direct-write publication artifact workflow, not story-state mutation.

### **MCP/context packet**

The story context packet should expose:

* active branch path,  
* recent PG ticks,  
* scene coverage over branch path,  
* unscened PG runs,  
* latest scene plan/prose/receipt status,  
* PG x-ray retrieval,  
* SCN retrieval,  
* scene artifact retrieval.

It should stop treating page prose as a live story artifact.

---

## **14. Search and branch-map architecture**

### **Search**

Search should return grouped, author-relevant results.

Result kinds:

* `scene`  
* `scene_prose`  
* `scene_plan`  
* `scene_receipt`  
* `unscened_range`  
* `state_tick`  
* `event`  
* `choice`  
* `record`  
* `validation`  
* `raw_source`

Domains:

* prose text,  
* plan text,  
* receipt text,  
* state YAML,  
* metadata/id,  
* validation/freshness.

Default grouping:

1. containing scene,  
2. unscened range,  
3. branch-level orphan/technical hit.

If a raw record matches, the result should say:

Record hit inside SCN-3, PG-9 state tick, Event Delta tab.

or:

Record hit inside unscened range PG-14..PG-18.

Raw record bodies should be expandable, not dumped as top-level search output.

When no scene exists, search must still work. It groups hits under unscened runs and PG x-ray contexts.

### **Branch map**

The branch map should be dual-layer.

Default: **scene layer**.

* scene nodes,  
* unscened run nodes,  
* branch split nodes,  
* choice surface nodes,  
* terminal markers.

Expandable: **tick layer**.

* PG nodes,  
* SE/event edges,  
* choice-to-child edges,  
* active scene coverage overlay.

Unscened PG runs should appear as compressed bars:

PG-14..PG-18 · 5 causal ticks · no SCN · final choices: 4

Sibling branches should appear even when scene ranges do not align. Do not force cross-branch scene segmentation. Scenes are branch-local coverage artifacts.

Focus modes:

* focus SCN,  
* focus PG,  
* focus CHC,  
* focus branch,  
* show ancestors,  
* show descendants,  
* show sibling outcomes.

The map should let the author switch between:

* **reader scene map** — fewer nodes, SCN/unscened segments.  
* **causal tick map** — PG-level graph.

---

## **15. Docs/tests/fixtures impact analysis**

### **Docs to update**

Update live docs:

* `README.md`  
* `docs/WORKFLOWS.md`  
* `docs/FOUNDATIONS.md`  
* `.claude/skills/_shared-templates/story-state-contract.md`  
* `.claude/skills/_shared-templates/story-record-schemas.md`  
* `docs/MACHINE-FACING-LAYER.md`  
* `docs/CONTEXT-PACKET-CONTRACT.md`  
* `docs/prose-renderer-contract/*`  
* `tools/story-explorer/README.md`  
* `tools/world-index/README.md`  
* `tools/validators/README.md`  
* `tools/patch-engine/README.md`  
* `specs/IMPLEMENTATION-ORDER.md`  
* `specs/SPEC-90-story-explorer-branch-map-and-search.md`

Archived material can remain, but live docs must stop pointing to archived page-first specs as active prerequisites.

### **Tests to delete**

Delete tests whose only purpose is page-prose compatibility:

* page prose route tests,  
* page plan route tests,  
* page receipt route tests,  
* missing page prose tests,  
* page-level ProsePanel tests,  
* page-read route tests,  
* page-entry route tests,  
* page-prose fixture tests,  
* page-plan validator tests that do not apply to scene plans.

### **Tests to rewrite**

Rewrite around:

* scene list/detail,  
* scene prose/plan/receipt routes,  
* unscened range detection,  
* timeline segment construction,  
* PG x-ray drawer payload,  
* search grouping by scene/unscened range,  
* branch map dual-layer semantics,  
* stale receipt/hash mismatch,  
* absence of page routes.

### **Fixture strategy**

Create a new scene-first fixture story:

* root PG,  
* several committed PGs,  
* SCN-1 covering PG-1..PG-3 with plan/prose/receipt,  
* PG-4..PG-6 unscened,  
* sibling branch with different PG range and no scene,  
* one stale receipt case,  
* one planned-but-unrendered scene,  
* one attached-with-WARN receipt,  
* no page-prose artifacts.

World-index tests should assert `pages-prose*` directories are unexpected outside archive/quarantine.

---

## **16. Risks and tradeoffs**

### **Risk: losing convenient PG deep links**

Mitigation: keep PG focus links through timeline query state and state-tick x-ray endpoints. The problem is not linking to PGs; the problem is treating PGs as reader pages.

### **Risk: over-deleting useful validators**

Mitigation: classify by semantic function, not filename. A validator named `page-plan-*` may actually validate PG/SE causal consistency. Rename and keep those.

### **Risk: scene plans become bloated page plans**

Mitigation: keep novelist body clean, move IDs/hashes to metadata/sidecar, externalize reusable craft/render contracts, and summarize long PG ranges by load-bearing deltas.

### **Risk: derived publication state feels less explicit than `SCN.status`**

It is more correct. SCN is append-only membership. Publication state is volatile and artifact-derived. The UI can make it explicit without putting it in SCN.

### **Risk: author x-ray overwhelms prose**

Mitigation: scene detail should have a prose-first left panel when prose exists, but x-ray remains equally accessible. This is an author tool, not a reader-safe product.

---

## **17. Open questions**

1. Should the low-level record class name `PG` eventually be renamed to something like `TICK`? My recommendation: **not now**. The systemic cost is high, and the UI can stop saying “page” first.  
2. Should scene plan metadata live in frontmatter or a sibling sidecar? My recommendation: frontmatter for compact metadata; sidecar only if it grows.  
3. Should Story Explorer ever trigger scene planning/rendering workflows? My recommendation: not in this iteration. Keep it read-only; show coverage and queue state.  
4. Should publishability be a receipt verdict or a derived index field? My recommendation: receipt records evidence; index derives current publishability from receipt + freshness.  
5. Should archived page-prose fixtures remain for historical tests? My recommendation: only if archive tests are explicitly quarantined and never treated as live compatibility.

---

## **18. What not to do**

Do not implement SPEC-90 as written.

Do not rename `/pages/:pageId` to `/scenes/:pageId`.

Do not keep page prose routes “temporarily” for compatibility.

Do not treat `PG` as a reader-facing unit.

Do not put `stale`, `failed`, `publishable`, or `needs_refresh` into SCN.

Do not mutate SCN during scene-prose attach.

Do not write patch-engine events for prose attach by default.

Do not let scene plans carry raw record IDs in novelist-facing body text.

Do not make automatic scene-boundary suggestion core.

Do not build a reader-only scene viewer and call it done.

---

## **19. Ranked implementation sequencing strategy**

This is an architectural phase order, not tickets.

### **1. Contract purge and model decision**

First settle the contract:

* remove live page-prose contract language,  
* remove or redesign `SCN.status`,  
* define derived `ScenePublicationState`,  
* define PG x-ray terminology,  
* retire SPEC-90 from active planning.

Do this before UI work, or every downstream surface will encode the wrong model.

### **2. Validator/schema cleanup**

Next classify validators:

* keep/rename PG causal validators,  
* delete page-plan/page-prose validators,  
* harden scene validators,  
* update SCN and receipt schemas.

This prevents invalid legacy fixtures from continuing to shape the app.

### **3. World-index scene coverage layer**

Then make index inventory and derived coverage correct:

* page-prose dirs unexpected,  
* scene artifact dirs indexable,  
* scene-to-PG and PG-to-scene coverage,  
* unscened run computation,  
* artifact freshness.

### **4. Backend scene/timeline/x-ray API**

Build the read model:

* overview,  
* timeline,  
* scenes,  
* scene artifacts,  
* unscened ranges,  
* state tick x-ray,  
* technical records/events/choices.

### **5. Frontend route replacement**

Replace page routes with:

* story dashboard,  
* branch timeline,  
* scene list/detail,  
* unscened range view,  
* embedded PG x-ray.

### **6. Search and branch map**

After timeline segments exist, implement search and branch map against the new segment model. Do not implement old page-search first.

### **7. MCP/context packet alignment**

Update context-packet surfaces so Claude Code and authoring skills can retrieve scene coverage and unscened ranges without reviving page prose.

### **8. Fixture and test rebuild**

Replace disposable page-prose fixtures with scene-first fixtures. Add negative tests asserting page routes and page-prose directories are gone.

### **9. Documentation closeout**

Update all live docs last, after names and contracts are stable. Archive SPEC-90 with a supersession note.

---

## **20. Acceptance criteria for future Claude Code specs**

A future spec derived from this proposal should be accepted only if all of the following are true:

1. No live Story Explorer route uses `/pages/:pageId` as a reader page.  
2. No live API exposes page prose, page plans, or page prose receipts.  
3. PG inspection exists only as state-tick x-ray under timeline/scene/unscened contexts.  
4. Scene list/detail/prose/plan/receipt APIs exist.  
5. Story overview exposes branch timeline, scene coverage, and unscened PG ranges.  
6. Scene publication state is derived from artifacts and receipts, not from mutable-looking SCN workflow status.  
7. Scene-prose attach does not mutate PG, SCN, SE, or other `_source` story state.  
8. Search groups hits by containing scene or unscened range.  
9. Branch map supports both scene-level and PG/tick-level layers.  
10. World-index no longer treats `pages-prose*` directories as live indexable story artifacts.  
11. Page-plan/page-prose validators are deleted or replaced by scene-plan/scene-receipt validators.  
12. PG causal validators that survive are renamed away from page-plan vocabulary.  
13. Fixtures contain scene-first stories with unscened PG runs.  
14. Tests assert absence of old page/prose/page-plan/page-receipt routes.  
15. Live docs no longer say rendered prose lives at `pages-prose/PG-N.md`.  
16. SPEC-90 is archived or explicitly superseded.  
17. The UI remains author-x-ray-first, not reader-only.  
18. No Red Bunny page-prose artifacts are used as evidence or compatibility targets.  
19. No backward-compatibility migration is required.  
20. The result makes the author’s real workflow obvious: **commit causal ticks quickly, inspect state deeply, later group committed ticks into scenes, then render prose without creating state.**

