# **1. Executive Verdict**

Build **a local read-only Worldloom Story Explorer**, not a dashboard, not an editor, not a skill runner, and not a CRUD admin panel.

The right product shape is:

**A literary reading surface with visual-novel rhythm, backed by a deterministic author x-ray.** The page’s rendered prose sits in the center. Existing navigable choices sit immediately below it. Everything else—records, state, event deltas, plan, receipt, validation, branch mechanics—lives in a refined “State X-Ray” layer beneath the reading experience, with a lightweight branch drawer for orientation.

The strongest v1 architecture is **a local Node/TypeScript backend plus a web frontend**. The backend should read the existing repository, use the `world-index` SQLite database as the primary indexed read model when it is fresh, and fall back to direct file reads only where the index is intentionally incomplete for the UI’s needs: rendered prose, prose plans, prose receipts, raw YAML, exact missing-file detection, and index-staleness reporting. It must not expose patch-engine submission, ID allocation, validators-as-actions, skill invocation, or any write endpoint.

The UI should **not** imitate `world-index render`. That command is useful evidence that the repo already has a story-bundle inspection surface, but it emits a merged raw-YAML markdown view. The product should invert that: deterministic human cards first, raw YAML last, behind an explicit control. `world-index render` proves the repository already sees story bundles as indexable bundles; it does not define the reader UX.

My opinionated recommendation: **make PG the page authority, prose the emotional artifact, SE the change explanation, and active records the x-ray default.** Anything else will misrepresent Worldloom.

---

# **2. Repository-Grounded Findings**

## **Current branch and manifest verification**

Using the Git app, I verified the repository as `joeloverbeck/worldloom`, with default branch `main`, and verified that `main` is identical to the user-supplied commit `af60b81`, full SHA:

`af60b817a04f966e2a00ad9b093c3f45ca67e53b`

All repository files below were fetched from that exact SHA. The uploaded manifest was used as an inventory only after the repository’s own `reports/manifest_2026-05-25.txt` at the verified SHA matched the uploaded tree listing; the uploaded manifest includes the required files and the relevant `tools/world-index/**`, `tools/world-mcp/**`, validators, story schemas, and skill paths.

## **Worldloom’s model is already built for this app—but not as an app**

The root README describes Worldloom as a **local-first, canon-safe worldbuilding and branching-story pipeline**. It explicitly separates authored structured records, a SQLite index, MCP retrieval/mutation tooling, validators, patch-engine writes, and rendered prose. It also states that rendered prose is separate from authoritative story state. That distinction is not optional for this UI; it is the product’s spine.

The foundations document reinforces the separation between world canon and story-bundle state. Story execution state—page IDs, choice IDs, storylets, clocks, and story-local transitions—must not be treated as world canon. That means the explorer’s story browser should live under `worlds/<world-slug>/stories/<story-slug>/`, not in global world-canon views.

## **Story-bundle storage paths**

The bootstrap skill gives the clearest operational inventory for story bundles. A story bundle lives under:

`worlds/<world_slug>/stories/<story_slug>/`

Key story surfaces include:

| Surface | Path pattern | UI meaning |
| ----- | ----- | ----- |
| Story kernel | `STORY_KERNEL.md` | Story-level metadata and framing |
| Story records | `_source/<class-dir>/<ID>.yaml` | Authoritative state/event/page/choice records |
| Stable story character authority | `story-characters/STCHAR-*.md` | Hybrid STCHAR records |
| Page plans | `pages-prose-plans/PG-<n>.md` | Prose-render plan, not reader prose |
| Rendered prose | `pages-prose/PG-<n>.md` | Reader-facing prose artifact |
| Prose receipts | `pages-prose-receipts/PG-<n>.yaml` | Validation receipt for attached prose |
| Bundle index | `INDEX.md` | Human index, not authority |

The bootstrap skill explicitly says it writes the root page plan but **does not** write `pages-prose/PG-1.md` or a prose receipt. That validates the missing-prose fallback as a first-class state, not an error state.

The turn-cycle skill likewise advances from any committed parent page and treats parent rendered prose as optional by default. This confirms that the explorer must not block page browsing when prose is absent.

## **Story record classes and source directories**

`tools/world-index/src/parse/story-directories.ts` maps current story `_source` directories to node types and ID patterns. Current indexed story record classes include:

`STENT`, `STSTAT`, `BEL`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STLOC`, `STOBJ`, `BR`, `PG`, `CHC`, `SLT`, `CLK`, `STSEC`, `STQ`, `DA`, `STPLAN`, `STEMO`, and `SE`.

The MCP shared read layer also includes `STCHAR`, `SLB`, `SAU`, `SP`, and `RSP` in its story-bundle ID prefixes, and its story-bundle node-type list includes `story_character_authority_record`, `audit_record_story`, `promotion_record`, `storylet_batch_manifest`, and `remediation_storylet_proposal_card`.

## **PG structure: the page is the authoritative fork snapshot**

The story schema template defines `PG` as the page/fork-state snapshot. Important fields for the explorer:

| PG field | UI use |
| ----- | ----- |
| `id` | Current page ID |
| `story_id` | Story binding |
| `branch_id` | Branch context chip |
| `parent_page_id` | Back/previous navigation |
| `branch_path` | Breadcrumb and branch map |
| `turn_index` | Page ordering and timeline cues |
| `input.choice_id` | Chosen parent choice for child derivation |
| `input.manual_action_text` | Write-in or non-choice action display |
| `input.resolved_event_id` | SE event that produced the page |
| `state_snapshot.active_records` | Default Current State x-ray |
| `state_snapshot.visible_affordances` | Scene/affordance card group |
| `emitted_choices` | Current page’s emitted CHC records |
| `plan.prose_plan_path` / `plan.plan_hash` | Plan/receipt boundary display |
| `validation_trace` | Validation and integrity display |

The schema notes that rendered prose and receipts are discovered through deterministic paths, not through PG fields, and that `SE.state_delta` is authoritative for change rather than a page-local summary field.

## **SE structure: the causal tick that produced a page**

`SE` records carry the “what happened and why” layer: actor, targets, selected storylet, turn driver, outcome route, resolution, world-logic rationale, record introductions, state relations, non-propagation facts, promotion claims, and `state_delta.create/supersede/close`.

The indexer emits explicit event edges for `event_actor`, `event_target`, `event_selected_storylet`, `state_delta_create`, `state_delta_supersede`, `state_delta_close`, `event_state_relation_target`, `event_alias_binding`, `event_introduces_record`, and `creation_evidence`. Those edges are ideal for the “What Changed Here” tab.

## **CHC structure: choices are emitted options, not child-page pointers**

The current schema says `CHC` records contain `created_at_page`, `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, and grounding information. They do **not** name a child page.

The indexer creates `choice_grounded_in` and `choice_affordance_ordinal` edges for CHC, and `page_emitted_choice` edges from PG. It does not create a direct `choice -> child page` edge. Child navigation must therefore be derived by scanning/listing committed `PG` records whose `parent_page_id` is the current page and whose `input.choice_id` matches the CHC.

## **Rendered prose, page plans, and prose receipts are intentionally separate**

The shared story-state contract states the authority model plainly: world canon → story state → rendered prose. Rendered prose lives at `pages-prose/PG-<integer>.md`; it may dramatize, omit, or stylize state, but it does not create state.

The prose-attach skill validates externally supplied prose against PG, plan, story kernel, and STCHAR material, then writes a receipt. It explicitly never mutates the page record. Its receipt path is `pages-prose-receipts/<page_id>.yaml`, and missing plan hash is advisory while PG state hash is verdict-driving tamper evidence.

For the web UI, this means:

* rendered prose is the main reader artifact;  
* missing prose is allowed;  
* page plans must not replace missing prose;  
* receipts are integrity artifacts, not prose;  
* raw plan and receipt material belongs in State X-Ray, not the emotional reading surface.

## **Existing machine-facing layer**

`world-index` is a SQLite-backed structure-aware index over world sources. It indexes parsed nodes, typed edges, entity mentions, anchor checksums, FTS content, validation results, and file versions.

The initial SQLite schema includes `nodes`, `edges`, `entities`, `entity_aliases`, `entity_mentions`, `file_versions`, `anchor_checksums`, FTS5 `fts_nodes`, `summaries`, and `validation_results`.

Story-bundle scope was added directly to the index through `story_slug` columns and indexes on `nodes`, `edges`, and `entity_mentions`.

The indexer enumerates story markdown and YAML surfaces, including `_source` story records, `pages-prose`, `pages-prose-plans`, `pages-prose-receipts`, `story-characters`, audits, storylet batches, and story promotions. This is important: the indexer is aware of prose/plans/receipts as files, but the app should still direct-read them for exact display and missing-file handling.

`world-index render <world-slug> --story <story-slug>` already emits a merged markdown view of story-bundle records in stable indexed order. Its implementation selects indexed story nodes and prints their bodies inside YAML code fences. That is useful as a low-level inspection command, but it is the wrong UI for this product because it leads with raw YAML.

## **MCP read APIs that can support the backend**

`world-mcp` exposes the world index as structured APIs. Its README lists read tools that are directly relevant to this app: `search_nodes`, `get_record`, `get_records`, `get_records_field`, `get_story_state_provenance`, `verify_pg_state_hash`, `list_records`, `get_neighbors`, `get_context_packet`, `find_named_entities`, and schema/capability tools. It also exposes write/mutation tools, but those must not be included in this app’s backend surface.

`get_record` enforces the fact that story-bundle IDs require `story_slug` because IDs are unique only within a bundle. It parses YAML story records and hybrid records into structured response shapes.

`list_records` supports story-bundle record types and supports projection fields and filters over parsed record fields. That is a strong fit for world/story/page listing and local search/filter.

`get_story_state_provenance` resolves creating and modifying SE records through indexed `state_delta_create`, `state_delta_supersede`, and `creation_evidence` edges. That is almost exactly the provenance source needed for x-ray cards.

`openIndexDb` opens SQLite in read-only mode, checks world existence, index existence, index schema version, empty index, and stale files. It returns `index_missing`, `index_version_mismatch`, `empty_index`, or `stale_index` with remedies such as `run world-index build` or `run world-index sync`.

## **Package and build constraints**

There is no root monorepo package surface in the manifest; tool packages are independent. `tools/README.md` says each sub-package has its own `package.json`, `tsconfig.json`, and `src/`, compiled output goes to `dist/`, and the machine-facing layer consists of `world-index`, `world-mcp`, `patch-engine`, `validators`, and `hooks`.

`world-index` is private ESM TypeScript, Node `>=22`, with exports for build/sync commands, content hashing, index opening, and public types/canonical vocabularies. It does **not** expose a broad public query library.

`world-mcp` is also private ESM TypeScript, Node `>=22`, and depends on `world-index`, `patch-engine`, `validators`, MCP SDK, SQLite, and YAML. Its package includes mutation-related CLIs, so the explorer should not depend on “world-mcp as a whole” without careful API fencing.

Repository-wide shell scripts build/check packages in dependency order: `world-index → patch-engine → validators → hooks → world-mcp`. A new explorer package should respect that dependency order if it reuses `world-index` or read-only MCP logic.

---

# **3. Research Findings**

Twine is the closest comparable model for nonlinear text-first browsing. Its official site describes it as an open-source tool for interactive, nonlinear stories, and the Twine reference says its UI is designed to visualize the flow through branches of a narrative. What applies to Worldloom: visible page/choice flow and a branch map. What does not apply: Twine’s story is passage/link-centric, while Worldloom’s authority is PG/SE/state records plus separate prose.

Ink is a useful model for text-and-choice rhythm. The ink page emphasizes “text comes first” and describes Inky’s play pane, where authors can play and test stories as choices reload. The writer’s manual shows text choices, branching, diverts, and rejoining flow. What applies: keep prose and choices readable, fast, and emotionally direct. What does not apply: Ink’s flow is script-native; Worldloom’s navigation must be inferred from committed PG records, not executed from a script.

Ren’Py is the strongest visual-novel interface reference. Its quickstart shows narration, dialogue, character naming, scene imagery, and transitions; its menu documentation says visual novels commonly present choices that control story outcome. What applies: the emotional UI should feel like a reading/game surface, with cinematic header, prose block, and clear choice cards. What does not apply: Worldloom v1 should not simulate sprites, animation, save/load gameplay, rollback, or visual-novel runtime state.

Progressive disclosure is the correct design principle for the x-ray. Nielsen Norman Group argues that deferring secondary material helps users prioritize what matters, but also says designers must split initial and secondary features correctly and label the route to secondary detail clearly. For Worldloom, the initial display is prose + existing choices + a compact state summary; the secondary display is grouped record detail, raw YAML, validation, and provenance.

Accessible disclosure and accordion behavior should follow WAI-ARIA APG. A disclosure is a button controlling hidden/visible content; Enter and Space toggle it; `aria-expanded` reflects state. Accordion headers should be buttons inside headings, and overusing landmark `region` can create landmark proliferation when many panels are open. This maps cleanly to State X-Ray groups and record-card expansion.

The branch map should be an overlay/drawer, not a permanent dominant graph. WAI-ARIA modal dialog guidance requires focus to move into the dialog, Tab/Shift+Tab to remain inside, Escape to close, and focus to return to the invoking element. That supports a branch-map drawer/modal pattern that preserves reading focus.

Local-first research and practice support keeping data on the user’s machine. The Local-First Software community describes apps that work offline, keep data private, and keep data with the user rather than locked in the cloud. For this product, that argues against a hosted SaaS version in v1. However, browser-only local file access is not ideal: MDN notes the File System API is only available in secure contexts and allows file/directory capabilities after user permission, with browser support constraints. A local Node backend is therefore the pragmatic v1 default.

Graph libraries are useful but should not dictate the product. React Flow documents a node/edge model and describes itself as software for node-based UIs; it can support the branch map drawer, but a permanent canvas would import the wrong mental model. Worldloom’s main object is a readable page with causal machinery behind it, not a graph editor.

Accessibility requirements are not polish. WCAG’s contrast guidance says normal text needs at least 4.5:1 contrast and large text at least 3:1; its reflow guidance says content should be readable without two-dimensional scrolling at narrow widths. Character-key shortcuts need disabling, remapping, or focus scoping. That argues for semantic page flow, high-contrast prose and chips, responsive stacking, and no global single-letter shortcuts by default.

---

# **4. User Intent and Non-Goals**

The intended product is:

**A local, read-only, literary-visual-novel-style Worldloom story explorer where prose and choices remain the emotional center, while the full causal record machinery of the current page is available as a beautiful deterministic x-ray layer.**

It is for a reader/player to enjoy and inspect an existing branching story. It should feel like reading an authored work, not like operating an admin console.

Non-goals:

* no writes;  
* no skill invocation;  
* no page generation;  
* no prose generation;  
* no story continuation;  
* no patch-plan submission;  
* no ID allocation;  
* no CRUD admin UI;  
* no deployment/sharing product in v1;  
* no raw-YAML-first interface;  
* no LLM-written summaries in v1;  
* no spoiler protection in v1;  
* no implementation-ticket output in this proposal.

The app can show hidden state, secrets, mystery state, branch-local truth, validation traces, and event provenance because it is explicitly an author-x-ray tool.

---

# **5. Information Architecture**

## **Top-level flow**

The landing flow should be:

`World Picker → Story Picker → Page Entry Choice → Reading Page`

### **World Picker**

The world picker lists directories under `worlds/` that contain world material, preferably with status badges:

| Badge | Meaning |
| ----- | ----- |
| Indexed | `_index/world.db` exists and opens |
| Stale index | source drift detected |
| Missing index | index must be built |
| Empty world | no story bundles found |
| Error | malformed/missing critical files |

The world picker should not require MCP. It can use direct filesystem listing, then optionally test `world-index`/SQLite freshness.

### **Story Picker**

After selecting a world, list story bundles under:

`worlds/<world-slug>/stories/<story-slug>/`

Each story card should show:

* story slug;  
* story title if available from `STORY_KERNEL.md`;  
* number of PG records;  
* number of leaf pages;  
* number of rendered prose files;  
* latest indexed turn/page;  
* index freshness state;  
* whether `PG-1` exists.

### **Page Entry Choice**

Default recommendation: **open `PG-1` on first entry**, with secondary buttons for **Latest Leaf** and **Page Search**.

Why: Worldloom stories are branching, not linear “latest document” objects. Opening latest leaf by default can drop a reader into a branch with no context. `PG-1` is the safest literary start. Once a user has visited a story, the local UI may restore “last viewed page” as a client preference, but that preference must not be written into the story bundle.

If metadata supports it, the story card can offer:

* “Start at root”;  
* “Open latest leaf”;  
* “Choose page”;  
* “Open last viewed” stored in browser local storage, not repo files.

## **Page breadcrumb**

Above the prose:

`World / Story / Branch BR-x / PG-y`

The breadcrumb should be light and non-debuggy. It should include:

* current page ID;  
* branch ID;  
* parent page link if present;  
* a short branch path preview;  
* “Branch Map” button;  
* “Jump” search.

Do not show a huge graph by default.

## **Child choice navigation**

The current page’s `PG.emitted_choices` gives CHC IDs to inspect. But a choice is navigable only when there is at least one committed child PG:

`child.parent_page_id === currentPage.id`  
 and  
 `child.input.choice_id === choice.id`

Only show such choices in the primary navigation.

If a CHC exists but has no committed child page, it can appear in the x-ray as an emitted but uncontinued choice, not as a playable navigation card.

## **Multiple child pages for one choice**

If several child PG records match the same parent/choice, render the CHC once, then show forked outcome variants beneath it:

**Choice card**  
 “Follow the smoke into the archive”

**Outcome variants**

* `PG-12` · `BR-2` · “quiet infiltration” derived from child SE outcome route  
* `PG-19` · `BR-5` · “guard confrontation” derived from child SE outcome route  
* `PG-24` · `BR-8` · “fire-clock escalation” derived from child SE outcome route

Do not collapse these into one destination. Multiplicity is meaningful in Worldloom.

## **Branch Map overlay/drawer**

The branch map should be a drawer or modal launched from the page header. It should show:

* nodes as PG records;  
* edges as parent → child page;  
* edge labels as CHC surface labels where `input.choice_id` resolves;  
* node chips for branch ID, terminal status, rendered-prose presence, and event kind;  
* current page highlighted;  
* sibling pages visible around current branch path;  
* search/filter inside the drawer.

This is orientation, not the main UI.

## **Page search/jump**

Search should support:

* page ID;  
* branch ID;  
* choice label;  
* child outcome label;  
* SE outcome route;  
* prose text if indexed or direct-searched;  
* record ID;  
* record class;  
* title/claim/objective fields.

Page search should return page summaries, not raw records.

## **Missing prose**

If `pages-prose/PG-<n>.md` is missing:

* show a polished prose panel placeholder: **“Rendered prose not attached yet.”**  
* include subtle subtext: “The page state exists; prose has not been attached.”  
* still show choices with existing child pages;  
* still show Current State and What Changed Here;  
* show page plan only in the State X-Ray “Plans & Emotion” / “Plan & Prose Boundary” area;  
* never render `pages-prose-plans/PG-<n>.md` as the main prose.

## **Terminal and branch-pause pages**

A page is terminal or paused when no navigable child pages exist.

The page should show:

* prose or missing-prose placeholder;  
* a terminal/paused card below prose:  
  * “No committed continuation from this page.”  
  * show emitted CHCs with no child pages only in x-ray;  
  * if PG continuation metadata indicates terminal/blocked/paused, render that reason deterministically;  
* still show State X-Ray.

The app must not offer “continue story” because that would imply generation.

---

# **6. Page Experience Design**

The page should feel like a **premium reading app with a visual-novel spine**, not an internal debugger.

## **Page header**

A cinematic but compact header:

* story title;  
* current page ID;  
* branch chip;  
* turn index;  
* parent/back control;  
* branch map button;  
* page jump/search;  
* integrity chip: “Index fresh”, “Index stale”, “Receipt missing”, “Prose missing”, etc.

Avoid engine vocabulary in the primary header. Use `PG-12` and `BR-3` because those are useful IDs, but do not lead with `state_snapshot`, `SE`, or YAML terms.

## **Prose panel**

The prose panel is the emotional center:

* generous reading column, roughly book-like;  
* strong typography;  
* high line height;  
* no record panels beside it on mobile;  
* no YAML above it;  
* no debug toolbar inside it;  
* rendered markdown should be sanitized and styled as literature.

The panel should optionally show a small page-status strip:

`PG-12 · Branch BR-3 · Turn 7`

That is enough.

## **Prose-missing placeholder**

Use a designed placeholder, not a file-not-found dump:

Rendered prose not attached yet.  
 This page’s state, choices, event delta, and records are available below.

A secondary “View page plan in State X-Ray” link can scroll to the relevant x-ray group.

## **Choice cards**

Choice navigation sits directly below prose.

Each choice card should show:

* surface label;  
* player-visible intent if available;  
* subtle grounded-in count or icon, not raw record IDs by default;  
* available outcome variants if multiple child pages exist.

Primary card text should be literary:

* label/title first;  
* consequence/pressure chip second;  
* page destination chips third.

Do not show all emitted CHCs if they have no child pages. Those belong in x-ray.

## **Branch/fork outcome variants**

When multiple child pages exist for one choice:

* keep one parent choice card;  
* nest variants under it;  
* label each variant from the child page’s resolved SE:  
  * `outcome_route`;  
  * `resolution`;  
  * selected storylet if useful;  
  * branch ID;  
  * child PG ID.

Do not pretend one choice has one canonical next page.

## **State X-Ray area**

Below choices, render a full-width section:

**State X-Ray**

Top tabs:

* **Current State**  
* **What Changed Here**  
* **Plan & Prose**  
* **Validation**

Default tab: **Current State**.

Inside each tab, use grouped record sections and cards. Record groups should be collapsible but show deterministic summary chips even when collapsed.

## **Sticky summary rail**

Recommended for desktop only.

A right rail can contain:

* current page chip;  
* branch chip;  
* prose/receipt status;  
* active record counts by group;  
* “What changed” count: created/superseded/closed;  
* mini table of contents for x-ray groups.

It must not compete with the prose. On mobile, it becomes an inline summary bar above State X-Ray.

## **Mobile behavior**

Mobile should be single-column:

1. header;  
2. prose;  
3. choices;  
4. compact state summary;  
5. x-ray groups.

The branch map opens full-screen. Record cards use disclosure panels. Avoid horizontal scrolling except for raw YAML/code blocks and graph drawer internals.

---

# **7. State X-Ray Design**

## **Record group taxonomy**

Use human groups, not raw folders:

| Group | Classes |
| ----- | ----- |
| Cast & Status | `STENT`, `STCHAR`, `STSTAT` |
| Scene & Affordances | `STLOC`, `STOBJ`, `DA`, visible affordances |
| Knowledge & Truth | `BEL`, `SF`, `STSEC`, `STQ` |
| Plans & Emotion | `STPLAN`, `STEMO`, `STINT` |
| Relationships & Debts | `SREL`, `OBL` |
| Pressure & Open Loops | `CNSQ`, `THR`, `CLK`, `SLT` where relevant |
| Event Delta | `SE`, state delta, record introductions, state relations, promotion claims |
| Validation & Integrity | PG validation trace, prose receipt, hash status, missing/stale index, broken refs |

This taxonomy fits the current schemas and edge model. It also matches how a human author thinks: who is here, what is true, what people want, what pressure exists, what changed.

## **Current State tab**

Default content comes from:

`PG.state_snapshot.active_records`

For every active record ID, fetch/parse the corresponding record and render a deterministic card.

Recommended ordering:

1. Cast & Status;  
2. Scene & Affordances;  
3. Knowledge & Truth;  
4. Plans & Emotion;  
5. Relationships & Debts;  
6. Pressure & Open Loops;  
7. Validation & Integrity.

Each group header shows counts and important chips:

`Knowledge & Truth · 8 active · 2 hidden · 1 low-confidence`

## **What Changed Here tab**

Source:

`PG.input.resolved_event_id → SE`

Show:

* selected event;  
* actor and targets;  
* turn driver;  
* outcome route;  
* selected SLT if present;  
* world-logic rationale;  
* state delta:  
  * created;  
  * superseded;  
  * closed;  
* record introductions;  
* creation evidence;  
* state relations;  
* non-propagation facts;  
* promotion claims.

This must be visually separate from Current State. Current State answers: “What is true/active now?” What Changed Here answers: “What caused this page to exist?”

## **Compact vs expanded record cards**

### **Compact card**

A compact card shows:

* record ID;  
* class chip;  
* human title/claim/objective/status;  
* holder/actor/participants;  
* urgency/salience/confidence/visibility where relevant;  
* created-at-page/provenance chip;  
* supersedes/superseded-by chip if present;  
* related-record count.

### **Expanded card**

Expanded card shows:

* all deterministic fields grouped by human labels;  
* related records as clickable chips;  
* provenance trail:  
  * created by SE;  
  * modified by SEs;  
  * evidence records;  
* raw YAML button.

## **Raw YAML escape hatch**

Each card has:

**View raw record**

This opens a code-style disclosure or drawer. It is not open by default. It should include:

* source path;  
* content hash;  
* raw YAML/markdown body;  
* copy button if desired;  
* no editing.

## **Linked-record navigation**

Record links should do one of three things:

* if linked record is active on current page: scroll to its card;  
* if linked record exists but is not active: open side peek with “not active on this page” chip;  
* if broken: show unresolved reference chip and include it in Validation & Integrity.

Clicking a PG link navigates page. Clicking an SE link opens event detail. Clicking CHC can highlight choice/navigation.

## **Validation and integrity display**

Validation should not dominate the reader view. It belongs under:

**Validation & Integrity**

Show:

* PG validation trace;  
* prose receipt presence/missing;  
* receipt verdict if available;  
* state hash status if checked;  
* plan hash status if checked;  
* stale/missing index state;  
* malformed YAML warnings;  
* skipped records log summary if available;  
* broken references.

The prose-attach skill’s checks are useful labels for receipt display: hash integrity, engine-jargon leak, mystery resolution, required event rendering, choice visibility, status consistency, invented structural fact, canon authority, character authority leak, and STCHAR fidelity.

## **Plan/prose/receipt boundaries**

The UI must be explicit:

* **Rendered prose**: reader-facing artifact.  
* **Page plan**: author/rendering plan.  
* **Prose receipt**: validation artifact.  
* **PG**: authoritative page snapshot.

Do not show page plan as prose. Do not imply receipt edits state. Do not imply prose edits state.

## **Spoiler stance**

No spoiler protection in v1.

Hidden beliefs, secrets, mystery reserve references, protected mystery links, non-propagation facts, branch-local truth, validation traces, and author-only plan material may appear in x-ray when relevant.

Use styling to mark hidden/secret/author-only material, not to hide it.

---

# **8. Deterministic Summary Rules**

No LLM summaries in v1. Every summary is field-based.

| Class | Deterministic card summary |
| ----- | ----- |
| `STENT` | `id` · entity label/name if present · world binding `world_ent_id` · bound `STCHAR` · active/status tags · created-at page |
| `STCHAR` | `id` · character name/title from frontmatter · bound `STENT` IDs · source character if any · supersession status · regeneration reason if present |
| `STSTAT` | `id` · entity · status label/value · severity/visibility if present · created-at page · supersedes |
| `BEL` | `id` · holder · claim · belief mode · truth relation · confidence · visibility · source event/basis · opens consequences |
| `SF` | `id` · fact/claim/title · truth/canon derivation · derived-from CF/SF refs · scope/visibility · created-at page |
| `SE` | `id` · event kind · actor → targets · outcome route · selected SLT · state delta counts · world-logic rationale preview |
| `CHC` | `id` · surface label · player-visible intent · created-at page · pressure chips · grounded-in record count · child outcome count |
| `OBL` | `id` · owed_by → owed_to · obligation text/objective · status · urgency/due condition · dependent facts |
| `CNSQ` | `id` · consequence statement · status · severity/urgency · derived-from · linked thread/clock if present |
| `THR` | `id` · thread title/name · status · active pressure · obligations count · derived-from |
| `SREL` | `id` · participants · relationship kind/label · polarity/intensity/status · derived-from |
| `STINT` | `id` · holder · intention/objective · status · urgency · supersedes |
| `STLOC` | `id` · location name · current scene role · access/affordance notes · created-at page |
| `STOBJ` | `id` · object name · holder/location · affordance/use · status · created-at page |
| `DA` | `id` · title/name · artifact type · holder/location/author if present · maturity/access · source records |
| `CLK` | `id` · clock name · current value/threshold · driver · status · linked records · last tick event |
| `STSEC` | `id` · secret label/truth anchor · holders · visibility/revealed status · clue carrier count · protected mystery refs |
| `STQ` | `id` · question text · status · source records · payoff-of/answer records · urgency if present |
| `STPLAN` | `id` · holder · objective/current step · root intention · status · blockers · success condition · supersedes |
| `STEMO` | `id` · holder · emotion/appraisal · intensity if present · orientation/toward records · trigger event · supersedes |
| `BR` | `id` · label · parent branch · forked/root page · created-at page · current/leaf page if derivable |
| `SLT` | `id` · move family · scope visibility · branch scope · urgency/salience · compatible turn drivers · precondition/effect counts |

For any missing display field, fall back in order:

1. explicit title/label/name/objective/claim;  
2. first meaningful string field for that class;  
3. record ID + class;  
4. “Untitled `<CLASS>` record”.

Never fabricate.

---

# **9. Data Model / View Model**

These are product view models, not implementation tickets.

## **`WorldSummary`**

Fields:

* `worldSlug`  
* `displayName`  
* `path`  
* `indexStatus`  
* `storyCount`  
* `hasWorldDb`  
* `indexVersion`  
* `driftedFiles`  
* `errors`

Source:

* direct filesystem list under `worlds/`;  
* `openIndexDb`-style freshness checks;  
* `world-index` SQLite metadata/file_versions.

Tradeoff: direct filesystem is needed before an index exists; SQLite gives richer status after build.

## **`StorySummary`**

Fields:

* `worldSlug`  
* `storySlug`  
* `storyId`  
* `title`  
* `kernelPath`  
* `pageCount`  
* `choiceCount`  
* `branchCount`  
* `renderedProseCount`  
* `leafPageIds`  
* `rootPageId`  
* `latestPageId`  
* `indexStatus`

Source:

* `STORY_KERNEL.md` direct read/frontmatter;  
* `list_records(page_record, choice_record, branch_record)` or SQLite nodes;  
* direct count of `pages-prose/PG-*.md`.

Tradeoff: the index can list PG/CHC/BR quickly; direct filesystem gives exact prose presence even when the index is stale.

## **`PageSummary`**

Fields:

* `pageId`  
* `branchId`  
* `parentPageId`  
* `turnIndex`  
* `choiceId`  
* `resolvedEventId`  
* `hasRenderedProse`  
* `hasPlan`  
* `hasReceipt`  
* `activeRecordCounts`  
* `childCount`  
* `isLeaf`  
* `isTerminalOrPaused`

Source:

* PG record;  
* direct path checks for prose/plan/receipt;  
* derived child PG scan.

## **`PageDetail`**

Fields:

* `page: PG`  
* `prose`  
* `proseStatus`  
* `pagePlanSummary`  
* `receiptSummary`  
* `choiceNavigation`  
* `currentStateGroups`  
* `eventDelta`  
* `validationIntegrity`  
* `branchContext`  
* `rawSources`

Source:

* PG from SQLite/MCP read API;  
* prose/plan/receipt direct file reads;  
* active records from `PG.state_snapshot.active_records`;  
* SE from `PG.input.resolved_event_id`;  
* related records from `get_records` / SQLite;  
* provenance from indexed edges or `get_story_state_provenance`.

## **`ChoiceNavigation`**

Fields:

* `choiceId`  
* `surfaceLabel`  
* `playerVisibleIntent`  
* `pressure`  
* `groundedIn`  
* `childOutcomeVariants[]`  
* `isNavigable`

Source:

* CHC record;  
* child PG records matching parent/choice;  
* child SE records for outcome labels.

## **`ChildOutcomeVariant`**

Fields:

* `pageId`  
* `branchId`  
* `turnIndex`  
* `resolvedEventId`  
* `outcomeRoute`  
* `resolutionPreview`  
* `selectedStoryletId`  
* `hasRenderedProse`  
* `stateDeltaCounts`

Source:

* child PG;  
* child SE;  
* direct prose path check.

## **`RecordCard`**

Fields:

* `recordId`  
* `recordClass`  
* `group`  
* `summaryLine`  
* `chips`  
* `primaryFields`  
* `secondaryFields`  
* `status`  
* `visibility`  
* `confidence`  
* `urgency`  
* `participants`  
* `provenance`  
* `links`  
* `rawAvailable`  
* `sourcePath`  
* `contentHash`

Source:

* parsed record body;  
* schema-derived class;  
* indexed edges;  
* provenance tool/edge queries;  
* deterministic summary rules.

## **`RecordLink`**

Fields:

* `recordId`  
* `recordClass`  
* `label`  
* `relationship`  
* `targetExists`  
* `activeOnCurrentPage`  
* `targetPageId` if PG  
* `brokenReason`

Source:

* index edges;  
* parsed fields;  
* record existence checks.

## **`BranchMapNode`**

Fields:

* `pageId`  
* `branchId`  
* `turnIndex`  
* `label`  
* `hasProse`  
* `isCurrent`  
* `isLeaf`  
* `isTerminal`  
* `eventKind`  
* `outcomeRoute`

Source:

* PG;  
* SE;  
* direct prose checks.

## **`BranchMapEdge`**

Fields:

* `fromPageId`  
* `toPageId`  
* `choiceId`  
* `choiceLabel`  
* `variantLabel`  
* `branchId`

Source:

* child PG `parent_page_id` and `input.choice_id`;  
* CHC `surface_label`;  
* child SE outcome route.

## **Source priority**

| Data | Preferred source | Secondary source |
| ----- | ----- | ----- |
| PG/SE/CHC/active records | SQLite index / read API | direct YAML parsing |
| Search | SQLite FTS + parsed filters | direct scan only for missing/stale index fallback |
| Prose display | direct `pages-prose` read | indexed markdown node if fresh |
| Page plan | direct `pages-prose-plans` read | indexed markdown node |
| Prose receipt | direct YAML read | indexed YAML node |
| Raw record body | direct file read or indexed `body` | MCP `get_record` |
| Edge/provenance | SQLite edges | parsed record fields |
| Staleness | `openIndexDb`-style file_versions check | filesystem timestamps/hash |

Do not build a parallel fragile parser as the primary system. Reuse index and MCP-equivalent parsing where possible, but keep direct reads for file artifacts whose presence/absence is part of the UX.

---

# **10. Local Read-Only Architecture**

## **Recommendation**

Build a new local app package, conceptually:

`tools/story-explorer/`

Use:

* Node/TypeScript backend;  
* web frontend served locally;  
* SQLite read access through `world-index` database;  
* direct file reads for prose, plan, receipt, raw source, and index diagnostics;  
* no patch-engine import unless unavoidable for type references;  
* no MCP server process required in v1, though MCP read-tool logic can be reused or mirrored carefully.

## **Local Node server vs static export**

Choose **local Node server** for v1.

A static export is tempting but wrong for v1 because:

* worlds are local filesystem trees;  
* SQLite access is needed;  
* direct file checks are needed;  
* index freshness must be detected;  
* browser File System API support and permissions are uneven;  
* browser-only SQLite/file traversal would add complexity without improving the read-only guarantee.

MDN’s File System API documentation confirms browser local file access is permission-based, secure-context bound, and includes write/file-management capabilities that would need extra fencing. A local Node process can be more predictable and easier to make read-only by design.

## **Use `world-index` SQLite as primary read model**

Yes, use it as the primary read model when fresh.

Reasons:

* it already indexes story-bundle records;  
* it has story_slug-aware node scope;  
* it has typed edges for pages, choices, events, active records, state delta, plans, emotions, secrets, questions, clocks, storylets;  
* it has FTS;  
* MCP read tools already build on it.

But do not rely on it blindly. If stale, show that state and either:

* offer a read-only “refresh index” action that runs `world-index sync`; or  
* allow a degraded direct-read mode for the selected story with an explicit stale badge.

## **Direct file reads still needed**

Use direct reads for:

* `pages-prose/PG-<n>.md`;  
* `pages-prose-plans/PG-<n>.md`;  
* `pages-prose-receipts/PG-<n>.yaml`;  
* raw YAML source;  
* `STORY_KERNEL.md`;  
* skipped-record logs;  
* exact missing-file status.

Direct reads are not a parallel state model; they are artifact reads.

## **Frontend framework**

React/Vite is a reasonable default, not a requirement.

Why React/Vite is plausible:

* good fit for stateful cards, drawers, tabs, accordions, search, and graph overlay;  
* React Flow is available for optional node/edge branch maps;  
* Vite is a natural local dev server/frontend package fit;  
* repository packages are already TypeScript/Node.

But do not overfit. SvelteKit, Solid, or plain Vite + web components could work. The key requirement is not framework; it is **read-only architecture + deterministic view models + high-quality prose UX**.

## **Avoid writes structurally**

The backend should enforce:

* no POST/PUT/PATCH/DELETE routes for story data;  
* no patch-engine submit route;  
* no ID allocation route;  
* no skill invocation route;  
* no “save preferences to repo” route;  
* no receipt writing;  
* no plan writing;  
* no prose writing;  
* no generated summaries.

Client preferences, such as last viewed page or theme, may live in browser local storage.

Index refresh is the one nuanced case. `world-index sync` mutates only the derived `_index/world.db`, not source story records. It should be presented as **Refresh derived index**, not “update story.” If strict read-only means no disk writes whatsoever, make it manual outside the app. My recommendation: allow a clearly labeled derived-index refresh only if the user accepts that `_index` is a regenerable cache. It must never write source records.

## **Stale or missing index**

Use the existing staleness semantics:

* missing world → world not found;  
* missing index → show build instruction;  
* index version mismatch → show build instruction;  
* empty index → show empty index;  
* stale index → show drifted file list and sync instruction.

`openIndexDb` already returns these error families and remedies.

## **Performance for large stories**

For large stories:

* list pages with projection fields first;  
* fetch PageDetail lazily;  
* fetch active records in batches;  
* virtualize huge record groups;  
* index search with FTS;  
* cache deterministic summaries in memory per session;  
* do not parse every YAML file on every navigation;  
* branch map should initially show neighborhood/current path, with “expand all” optional.

---

# **11. Accessibility and Interaction Requirements**

Keyboard navigation:

* Tab order follows visual order: header → prose controls → choices → x-ray tabs → record groups.  
* Choice cards are buttons/links with clear focus states.  
* Parent/back, branch map, search, and x-ray tabs are keyboard reachable.  
* No global single-letter shortcuts by default; any single-character shortcuts must be scoped to focused widgets or be disable/remappable to satisfy WCAG guidance.

Disclosure panels:

* Record cards and groups use button-based disclosure.  
* Enter/Space toggles.  
* `aria-expanded` reflects open state.  
* Use `aria-controls` where helpful.  
* Accordion headers use semantic headings.

Branch map drawer/modal:

* Focus moves into the drawer on open.  
* Tab/Shift+Tab stay inside while modal.  
* Escape closes.  
* Focus returns to the Branch Map button.  
* Dialog has visible title and `aria-modal` only if the rest of the page is truly inert.

Readable prose typography:

* high-contrast foreground/background;  
* comfortable line length;  
* scalable text;  
* no horizontal scrolling for prose;  
* respect user zoom.

Color contrast:

* body and card text should meet at least WCAG AA contrast: 4.5:1 for normal text, 3:1 for large text.

Responsive behavior:

* prose and record text reflow into one column on small screens;  
* branch graph may scroll/pan internally, but ordinary prose/cards should not require two-dimensional scrolling.

Reduced motion:

* avoid cinematic animations that interfere with reading;  
* branch drawer and card expansion should respect `prefers-reduced-motion`;  
* motion should never communicate the only state change.

Semantic structure:

* one page `<h1>` for story/page;  
* `<h2>` for Prose, Choices, State X-Ray;  
* `<h3>` for x-ray groups;  
* buttons for actions, links for navigation;  
* raw YAML in semantic code blocks with labels.

---

# **12. Edge Cases**

| Edge case | Required behavior |
| ----- | ----- |
| Missing prose | Show polished placeholder; keep choices and x-ray available; do not substitute page plan. |
| Missing page plan | Show “Page plan missing” in Plan & Prose; do not block page reading. |
| Missing prose receipt | Show “No prose receipt attached” in Validation & Integrity; do not mark prose invalid unless validation says so. |
| Stale index | Show stale badge, drifted files if known, and refresh/build guidance; optionally degraded direct-read mode. |
| Missing index | World/story picker should show world but mark unavailable until index build, or offer derived-index build if allowed. |
| Orphaned CHC | Show in x-ray as emitted/available record if referenced; do not show as navigable without child PG. |
| Child PG references missing choice | Show child in branch map with broken-choice chip; do not attach it to a choice card silently. |
| Multiple children for one choice | Show one choice with multiple outcome variants. |
| Branch-local records not current | Do not show in Current State unless active in PG snapshot; allow linked side peek with “not active on this page.” |
| Broken record references | Render unresolved chips and list in Validation & Integrity. |
| Malformed YAML | Show parse error card; preserve raw source view if readable; do not crash page. |
| Pre-current-schema legacy records | Show compatibility warning; use best-effort deterministic summary from available fields. |
| Terminal pages | Show no committed continuation message; keep x-ray. |
| No choices with existing children | Do not show fake navigation; show terminal/paused state. |
| Huge active record counts | Group, virtualize, collapse by default after threshold, keep summary counts visible. |
| Hidden/author-x-ray records | Show with “hidden/secret/author” chips; no spoiler masking in v1. |
| Prose receipt hash mismatch | Show warning/fail state in Validation & Integrity; do not mutate or “fix.” |
| PG state hash mismatch | Treat as high-severity integrity warning. |
| Story bundle with no `PG-1` | Story picker marks malformed/incomplete; allow page search if other PGs exist. |
| Duplicate page IDs in malformed files | Prefer index uniqueness if available; otherwise show fatal story integrity warning. |
| CHC emitted by PG but missing CHC file | Show missing-choice warning; child PGs referencing it appear with unresolved choice label. |
| Page plan exists but prose missing | Plan appears only in x-ray, never as prose. |
| Receipt exists but prose missing | Show inconsistent artifact warning. |
| Prose exists but PG missing | Do not list as a page; show orphaned prose only in integrity/audit view if story selected. |

---

# **13. Recommended MVP**

The smallest coherent v1 should be beautiful, read-only, and page-centered.

## **Must be in v1**

* local Node backend;  
* web frontend;  
* world picker;  
* story picker;  
* open `PG-1`;  
* page search/jump by PG ID;  
* centered rendered prose display;  
* missing-prose placeholder;  
* existing-child-only choice navigation;  
* multiple child variants per choice;  
* parent/back navigation;  
* lightweight breadcrumb;  
* branch map drawer with PG parent-child edges;  
* Current State x-ray from `PG.state_snapshot.active_records`;  
* What Changed Here x-ray from current page SE;  
* deterministic record cards for core classes;  
* raw YAML behind explicit affordance;  
* direct display of plan/prose/receipt boundaries;  
* stale/missing index detection;  
* local search/filter for records by ID/class/text/holder/status/visibility/confidence/active-on-page;  
* keyboard-accessible disclosures/tabs/drawer;  
* no write routes.

## **Should wait**

* timeline mode;  
* sibling branch comparison;  
* static export/share;  
* reader-safe spoiler mode;  
* receipt quality overlays over prose;  
* full record diff visualization;  
* packaged desktop app;  
* thumbnails/screenshots;  
* rich graph analytics;  
* editing, generation, continuation, or skill integration.

The MVP’s success metric is not “can it show every field.” The success metric is: **Can a reader enjoy a page, choose an existing continuation, and open a gorgeous deterministic x-ray that makes Worldloom’s causal machinery legible without dumping YAML first?**

---

# **14. Future Enhancements**

* richer branch map with clustering, branch coloring, and path focus;  
* timeline mode showing SE/PG/CHC evolution;  
* sibling branch comparison;  
* “what differs between these two outcome variants” view;  
* static export/share bundle;  
* reader-safe spoiler mode;  
* prose receipt quality overlays;  
* state-delta visualizations;  
* record diff views across supersession chains;  
* offline packaged desktop app;  
* author annotations if future records support them;  
* screenshot/thumbnail support if story assets ever exist;  
* saved reading sessions stored outside story source;  
* graph neighborhood around selected record;  
* x-ray “why is this active?” provenance explainer;  
* schema-aware validation explanations;  
* import-free demo mode using fixture worlds.

---

# **15. Questions Deferred / Decisions Made by Judgment**

Decisions made by judgment:

* **Default entry is `PG-1`**, not latest leaf, because this is primarily a reading app.  
* **Latest leaf remains a secondary entry option**, because authors may inspect current frontier pages.  
* **Branch map is a drawer**, not a permanent graph, because prose should remain central.  
* **Node/TypeScript local backend is preferred**, because the repo is already Node/TS and browser-only local file access is awkward.  
* **SQLite index is primary read model when fresh**, because the repo already has story-aware nodes, edges, FTS, and freshness checks.  
* **Direct file reads remain necessary**, because prose/plan/receipt presence and raw source are UX facts, not just indexed records.  
* **No LLM summaries in v1**, because deterministic summaries are safer, faster, inspectable, and aligned with author-x-ray trust.  
* **No spoiler protection in v1**, because the product is explicitly author-x-ray.  
* **Record groups are human-oriented**, because raw class folders would make the product feel like a debugger.  
* **Index refresh may be allowed only as derived-cache refresh**, never as source mutation. If strict read-only is interpreted as no disk writes at all, remove that button and show CLI instructions instead.

No further product questions are blocking the proposal.

---

# **16. Prompt for Claude Code Proposal-to-Spec Follow-up**

Use this prompt later when you want Claude Code to turn this proposal into implementation specs without losing the product intent:

Convert the requirements-first proposal for the local read-only Worldloom Story Explorer into implementation specs and tickets. Preserve the core product shape: prose-centered literary/visual-novel reading surface, existing-child-only choice navigation, deterministic State X-Ray, Current State from `PG.state_snapshot.active_records`, What Changed Here from the resolved `SE`, no writes, no skill invocation, no generation, no raw-YAML-first UI, and no LLM summaries in v1. Ground every implementation decision in the current repository at `main` commit `af60b817a04f966e2a00ad9b093c3f45ca67e53b`, using targeted file fetches rather than search snippets.

