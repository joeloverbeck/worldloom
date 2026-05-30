# **Worldloom scene-first refinement audit proposal**

## **1. Executive verdict**

**Keep the scene-first architecture.** It is healthy enough to remain the foundation. The current direction is coherent: PGs are causal state ticks, scenes are reader-facing render units over committed PG ranges, scene planning and prose attach are separate, and prose attach must not create story state. That matches the settled intent in the uploaded mission: no page-prose return, no backwards-compatibility shims, and ranked refinements only.

The next iteration should **not** re-litigate scene-first. The real problems are narrower and more concrete:

1. Scene-prose receipts are too thin as persisted audit artifacts.  
2. Scene publication/freshness state is too presence-based for serious debugging.  
3. Live docs and a few contracts still leak page-prose terminology.  
4. Some validators prove the right things but do not explain failures well enough.  
5. Story Explorer is correctly scene-first, but it should surface freshness/validation problems more aggressively.  
6. The branch map should stay scene-layer-first for now; a PG/tick layer is useful, but not more urgent than receipt/freshness/diagnostic hardening.

My blunt verdict: **Worldloom’s big architecture is right; the next pass should make it auditable, evidentiary, and purge-stale—not bigger.**

---

## **2. Repository access note and SHA verification result**

The uploaded prompt required the pipeline: repository metadata → current `main` SHA → manifest → targeted exact-SHA fetches, with no clone and no GitHub code search. It also named the uploaded manifest SHA as `14ba796e57f9f59ac06e72276f378bbbacf344f9`.

Repository metadata lookup did identify `joeloverbeck/worldloom`, default branch `main`. However, the Git connector’s repository/commit metadata calls behaved unexpectedly: `get_repo` for `joeloverbeck/worldloom` returned metadata for `joeloverbeck/one-more-branch`, and branch/commit verification could not be trusted. Therefore, **I could not prove that live `main` currently resolves to `14ba796e57f9f59ac06e72276f378bbbacf344f9`**.

I proceeded using the safest available evidence path: the uploaded manifest as inventory, then targeted file fetches from exact `blob/14ba796e57f9f59ac06e72276f378bbbacf344f9/...` URLs. I did **not** clone the repository and did **not** use GitHub code search. The proposal below is tied to exact file fetches from that SHA, not to an unverified assumption about current `main`.

---

## **3. Current repository evidence**

Story Explorer has moved to a scene-first surface. Its README describes a read-only backend with deterministic, scene-first view models for overview, timeline, scene detail, unscened ranges, and state-tick x-ray, explicitly not a page-prose reader. The README also says SPEC-90’s page-centric branch-map/search contract was removed/superseded by SPEC-98. The frontend route table confirms the primary routes are worlds, stories, dashboard, timeline, scenes, scene detail, unscened, search, and branch map; there is no page-reader route in the frontend router.

The Story Explorer acceptance tests reinforce that state: every scene-first route is expected to resolve, old page-first routes such as `/pages/PG-1`, `/prose/PG-1`, `/page-plans/PG-1`, and `/prose-receipts/PG-1` are expected to 404, and the x-ray is explicitly tested as a technical PG surface rather than a reader page route.

The SCN schema is appropriately leaner than the old page-prose model. It requires identity/range/navigation fields plus `title`, `slug`, `prose_plan_path`, `prose_path`, and `receipt_path`; it includes `supersedes` and `previous_scene_id`, and it does **not** include `status`.

Scene planning is strongly scene-first and novelist-facing. The plan body forbids record IDs, hashes, schema terms, validator names, patch-engine language, lifecycle terms, raw state-delta vocabulary, and act/arc/midpoint/climax-style narrative-shape language. Its canonical sections require byte-equal Content Policy, Prose Craft Contract, and Render-Time Instruction blocks. Range selection is based on continuity of POV, time, location, cast, conflict/exchange, practical purpose, and reader expectation, and required range checks use `branch_path`, not numeric PG order.

Scene-prose attach is correctly no-state. Its write order creates a receipt, updates `INDEX.md`, then stops; it explicitly forbids patch-plan submission and `_source` story-record mutation. The receipt checks inspect the full `SCN.pg_ids` range, not just the end page, and include checks for included PG events, final choice surface, entity/status consistency, invented structural facts, forbidden mystery resolution, STCHAR fidelity, engine jargon, and canon claims without authority.

The big weakness is that persisted scene-prose receipts store check statuses, not structured evidence. The receipt schema requires `scene_id`, `story_id`, `branch_id`, plan/prose paths, `checked_at`, `strict`, `verdict`, `included_pages`, and `checks`; each check is just a PASS/WARN/FAIL enum. The skill says every PASS in the deliverable summary needs a one-line rationale with cited authority, but that rationale is not required in the YAML receipt itself.

`scene_coverage` exists and is the right derived layer. The migration creates a `scene_coverage` table with active scene IDs, superseded scene IDs, unscened ranges, PG→scene lookup, scene JSON, and `refreshed_at`. The world-index public API exports `querySceneCoverage` and its types. Story Explorer reads that derived view and degrades instead of fabricating scene coverage when the world index is not fresh.

The current publication state is intentionally presence-based: `planned`, `prose-present`, `attached:PASS`, `attached:WARN`, `attached:FAIL`, and `superseded`. The acceptance test even asserts that no hash/freshness/8-state field has leaked onto the current scene summary surface. That was a reasonable first landing. It is now too weak for the next refinement pass.

Legacy page-prose is mostly removed from live indexing: migration 008 deletes `pages-prose`, `pages-prose-plans`, and `pages-prose-receipts` nodes and related references from the index. But the health-audit skill still contains live page-prose prerequisites for prose-mode checks, which is now stale architecture language and should be purged. The uploaded manifest also shows still-live page-named turn-cycle references such as `phase-6-page-snapshot.md` and `phase-7-page-plan.md`, which should be audited rather than blindly retained.

---

## **4. Research synthesis**

Interactive narrative tooling supports Worldloom’s separation of graph/state/prose/debug layers. Twine treats passages as core story divisions and links as navigation between them; passages can be blocks of dialogue, time/space divisions, code sections, or project organization units. Yarn Spinner splits scripts into nodes with headers and bodies, where node bodies contain lines, commands, and options; it also has variables for stateful dialogue logic. Ink is explicitly a text-with-flow scripting language for branching dialogue, choices, knots, diverts, and recombination, and it aims to stay readable/testable for writers. Ren’Py likewise separates script control flow through labels/menus/jumps, flags, developer tools, and player-facing presentation.

The strongest lesson from those systems is **not** “everything should be a page.” It is that authoring tools need separate layers for authored text units, branching control, variables/state, preview/debug, and validation. Worldloom’s PG/SCN split is more specialized than Twine/Yarn/Ink, but the separation is directionally sound.

Storylet theory also supports Worldloom’s state-first runtime. Emily Short defines storylets as content plus prerequisites plus effects on world state; that maps well to Worldloom’s commitment/state tick model, where causal state and prose rendering are not the same artifact.

For receipts and provenance, the relevant lesson is that trust comes from traceable evidence, not just verdict labels. W3C PROV defines provenance as information about entities, activities, and people involved in producing a thing, used to assess quality, reliability, or trustworthiness; it also emphasizes derivation, versioning, validation, and provenance access. That directly supports making scene-prose receipts store evidence references, artifact hashes, and derivation context.

For LLM-assisted evaluation, freeform rationales alone are not enough. A 2024 paper on LLM rationales found prompting-based self-explanations are not always aligned with human rationales and can be less faithful than attribution-based explanations. The implication for Worldloom is not “avoid rationales”; it is “do not persist naked rationales as proof.” Persist rationale **plus** evidence spans, artifact hashes, PG IDs, plan-section anchors, and deterministic validator diagnostics.

Prompt bloat is a real risk for long PG ranges. “Lost in the Middle” found that LLM performance can degrade when relevant information sits in the middle of long contexts, even for long-context models. That argues for scene-plan range compression and beat grouping, not for undoing the scene-first architecture.

---

## **5. Architecture health assessment**

**Healthy enough to keep.** The evidence does not justify overthrowing scene-first. The repository now has scene-first routes, scene-first tests, SCN records, scene coverage, scene plans, scene prose receipts, and x-ray surfaces. The architecture matches the settled direction.

Remaining issues classify as follows:

| Area | Assessment |
| ----- | ----- |
| Architecture | Sound. Do not restore page-prose. Do not re-add `SCN.status`. |
| Schema/contract | SCN is mostly right; receipt schema is too weak; publication state needs richer derived diagnostics. |
| Validation | Range validation is conceptually strong; receipt and scene-plan diagnostics need more evidence and better failure payloads. |
| UX | Scene-first navigation is correct; validation/freshness failures should be more visible. |
| Retrieval/context | `scene_coverage` is bounded correctly, but its degraded/null states need clearer semantics in packets and audits. |
| Docs/cleanup | Live legacy page-prose language remains and should be purged. |
| Tests/fixtures | Good scene-first acceptance base, but missing stale/missing/unreadable/hash-mismatch cases. |
| Naming/terminology | “Page” is still acceptable for PG record internals only; author-facing surfaces should prefer “state tick,” “PG,” or “causal tick.” |
| Implementation hygiene | Some old page-plan seams remain; rename or retire them as part of cleanup, not architecture churn. |

---

## **6. Ranked recommended changes only**

### **Rank 1 — Make scene-prose receipts evidentiary, not just verdict-bearing**

**Problem.** Current receipts persist check statuses but not the evidence that justified them. That makes later audit, repair, and model-to-model handoff brittle.

**Evidence.** The receipt schema stores required check enums only. The skill requires PASS rationales in the deliverable summary, not in the persisted receipt. The attach skill already refuses to mutate story state, so the receipt is the natural place for provenance.

**Recommendation.** Change the receipt contract so every check persists:

* `status`  
* one concise `rationale`  
* `evidence[]` entries referencing paragraph numbers or prose spans, PG IDs, SE IDs where relevant, scene-plan section anchors, and active story-record IDs  
* `expected` / `observed` snippets for deterministic checks where possible  
* `repair_hint` when WARN/FAIL  
* `receipt_schema_version`  
* `scn_hash_at_attach`  
* `plan_hash_at_attach`  
* `prose_hash_at_attach`  
* retained `included_pages[].state_hash_at_attach`

Do **not** pretend every literary judgment can become deterministic. Instead, require structured evidence for every judgment-heavy check and deterministic validation for the receipt’s evidence shape.

**Expected benefit.** This makes receipts useful for audit, repair, Story Explorer display, future revision, and fail-fast diagnostics. It also reduces reliance on model memory or ephemeral handoff prose.

**Affected files/surfaces.** `scene-prose-receipt.schema.json`, receipt skill docs, `scene-prose-receipt-content`, `scene-prose-receipt-schema-compliance`, Story Explorer receipt panels, health-audit prose mode, scene-first fixtures.

**Validation/test implications.** Missing evidence/rationale should be schema failure in review/publishable mode. Hash mismatches should become explicit freshness diagnostics. Tests need PASS/WARN/FAIL examples with evidence and with missing evidence.

**Risk/tradeoff.** More receipt writing burden. Worth it. The current receipt is too thin for a system that relies on delayed prose rendering over causal state.

**Work type.** Schema/contract, validator, UX, docs, test/fixture.

---

### **Rank 2 — Enrich publication/freshness state in `scene_coverage`, not in SCN**

**Problem.** Current publication state is presence-based and intentionally excludes hash/freshness states. That was fine for landing scene-first, but it is too weak for debugging stale prose, unreadable receipts, missing plans, and hash mismatches.

**Evidence.** Current publication states are limited to `planned`, `prose-present`, `attached:PASS`, `attached:WARN`, `attached:FAIL`, and `superseded`; tests explicitly assert no hash/freshness state exists. `scene_coverage` already stores artifact availability and derived rows, and Story Explorer already treats stale/missing index as degraded rather than fabricating coverage.

**Recommendation.** Keep SCN minimal. Add derived artifact diagnostics to `scene_coverage` and Story Explorer:

* `missing-plan`  
* `missing-prose`  
* `missing-receipt`  
* `receipt-unreadable`  
* `receipt-schema-invalid`  
* `receipt-hash-mismatch`  
* `pg-state-hash-mismatch`  
* `plan-hash-mismatch`  
* `prose-hash-mismatch`  
* `superseded`  
* `degraded-index`  
* `unknown-no-coverage-row`

Keep the current coarse `publication_indicator` for compact summaries if desired, but add a richer `artifact_diagnostics[]` or `freshness` object. Do **not** put this back into `SCN.status`.

**Expected benefit.** Authors see exactly why a scene is not publishable. Validators can fail fast. Story Explorer can show the difference between “not attached yet,” “attached and failed,” and “was attached but is now stale.”

**Affected files/surfaces.** `scene_coverage`, migrations/types, Story Explorer scene summaries/detail/timeline/search/branch-map, MCP context packet projection, health audit.

**Validation/test implications.** Add fixture cases for missing plan, missing prose, missing receipt, unreadable receipt, invalid receipt, stale hashes, superseded scenes, and branch divergence.

**Risk/tradeoff.** More state labels can clutter UI. Solve this with a coarse badge plus expandable diagnostics, not by hiding the data.

**Work type.** Retrieval, UX, validator, test/fixture.

---

### **Rank 3 — Purge live page-prose language and fail-fast on live page-prose artifacts**

**Problem.** Page-prose architecture is dead, but live language and old fields still create ambiguity. This is exactly the kind of residue that causes future implementation drift.

**Evidence.** The repo deindexes legacy `pages-prose`, `pages-prose-plans`, and `pages-prose-receipts`, proving the architecture moved on. Yet the health-audit skill still references page-prose inputs for prose-mode checks. The manifest also shows still-live page-plan/page-snapshot naming under turn-cycle references. The uploaded prompt explicitly asks not to preserve page-prose merely because it appears in old docs or filenames.

**Recommendation.** Run a live-file purge audit with this classification:

* **Delete / replace now:** live references to `pages-prose`, `pages-prose-plans`, `pages-prose-receipts`, page-prose receipt paths, page reader/search/jump routes, and prose-mode health-audit page-prose inputs.  
* **Should fail validation:** live page-prose directories outside archive/grandfathered fixture contexts.  
* **Should become scene-aware:** `page-plan-active-pressure` and any page-plan validator still governing prose-render plans.  
* **Terminology acceptable because PG remains the record class:** `story-page.schema.json`, `_source/pages`, PG ID patterns, page-record validators that validate causal ticks.  
* **Correctly retained but rename eventually:** `stemo-no-future-page-ids`, `stplan-no-future-page-ids`, `slt-created-at-page-origin-consistency` if user-visible diagnostics say “page” rather than “PG/state tick.”  
* **Archived-only and harmless:** SPEC-90, page-prose tickets, old reports, Red Bunny artifacts, provided they are not imported by live docs/tests.

**Expected benefit.** Removes architectural ambiguity and prevents page-prose from creeping back through validators, docs, or health-audit prose mode.

**Affected files/surfaces.** Health audit, bootstrap/turn-cycle docs, shared record schemas, validators, docs, tests, fixtures.

**Validation/test implications.** Add a live-world validator that fails on `stories/*/pages-prose*` directories outside archive or explicitly named legacy fixtures. Add tests proving page-reader routes remain absent.

**Risk/tradeoff.** Some filenames still say “page” because PG is still the record class. Do not rename everything blindly. Rename user-facing terminology and stale prose artifacts, not legitimate PG internals.

**Work type.** Docs, validator, test/fixture, naming hygiene.

---

### **Rank 4 — Improve validator diagnostics before adding more architecture**

**Problem.** Existing validators often know what failed, but not all failure payloads are good enough for deliberate remediation of private story material.

**Evidence.** `scene-range-integrity` already validates branch-path contiguity, PG existence, same-branch membership, prefix lineage, choice surface, and emitted choices. Receipt schema compliance reports AJV paths and file/node IDs. This is the right base, but the user’s stated preference is fail-fast diagnostics with remediation paths, not compatibility shims.

**Recommendation.** Standardize diagnostic payloads across scene validators:

* exact file path  
* record ID  
* field path / section heading  
* expected value  
* actual value  
* offending token/span  
* related PG/SCN/CHC/SE IDs  
* stale artifact hashes where relevant  
* remediation category: revise SCN, revise scene plan, revise scene prose, rerun attach, rerun scene coverage, rebuild index, or run turn-cycle repair

Scene-plan body violations should identify the section and exact forbidden token. Scene-range failures should show the computed branch-path slice and why the supplied `pg_ids` differ. Receipt failures should show the check, missing evidence, stale hash, and artifact path.

**Expected benefit.** Private material can break loudly and usefully. That is better than accepting stale compatibility.

**Affected files/surfaces.** Structural validators, CLI JSON output, Story Explorer validation panels, health audit, tests.

**Validation/test implications.** Snapshot tests should assert diagnostic shape, not just PASS/FAIL.

**Risk/tradeoff.** More verbose errors. Good. This is an authoring system, not a minimal API.

**Work type.** Validator, UX, test/fixture.

---

### **Rank 5 — Keep scene-plan structure, but add long-range compression discipline**

**Problem.** Scene plans are structurally right, but long PG ranges can create prompt bloat and buried constraints.

**Evidence.** Scene-plan sections already translate state into novelist-facing prose and forbid engine vocabulary in the body. The plan’s beat chain must translate each included PG’s required event/effect into renderable beats. Research on long-context behavior shows models can degrade when relevant information is buried in the middle of long prompts.

**Recommendation.** Keep the current section order and byte-equal canonical blocks. Do **not** weaken the clean novelist-facing body contract. Add rules for long scenes:

* group contiguous PGs into beat clusters when a range exceeds a threshold  
* require an explicit “compressed but preserved” list for load-bearing events  
* require final-choice-surface clarity  
* require “must not omit” bullets for irreversible state changes  
* keep IDs/hashes out of the body; put machine traceability in frontmatter/SCN/receipt sidecars

`## 19. Render-Time Instruction` is awkward but acceptable. Fixing the number is low-value churn unless it is a trivial docs-only cleanup.

**Expected benefit.** Better prose generation under long ranges without reintroducing page-level render plans.

**Affected files/surfaces.** Scene-plan skill references, scene-plan validators, prose-renderer contract docs, tests.

**Validation/test implications.** Add fixtures for long-range scene plans, forbidden-token diagnostics, and canonical-block byte equality.

**Risk/tradeoff.** More plan-writing structure. Acceptable because it protects prose quality.

**Work type.** Docs, validator, test/fixture.

---

### **Rank 6 — Make Story Explorer an author debugging cockpit, not just a scene browser**

**Problem.** Story Explorer is now correctly scene-first, but validation/freshness failures are not yet first-class enough.

**Evidence.** The frontend route table is scene-first and has no page-reader route. Search groups hits by scene, unscened range, or branch-level container and treats PG hits as state ticks, not reader pages. Branch-map reading builds a scene-layer graph with scene nodes, unscened-run nodes, choice-surface nodes, branch splits, and terminal markers.

**Recommendation.** Keep primary navigation as dashboard/timeline/scenes/unscened/search/branch-map. Add stronger author-facing diagnostics:

* scene badges for missing/stale/unreadable artifacts  
* receipt check expansion with evidence spans  
* search filters for `validation`, `freshness`, `unscened`, `receipt:FAIL`, `receipt:WARN`, `stale`  
* timeline markers for unscened runs and stale scene artifacts  
* scene detail panel showing SCN range, plan/prose/receipt freshness, PG ticks, choices, event deltas, active records, and raw sources  
* keep `/state-ticks/:pgId/xray` as a technical deep link; do not make PGs reader pages

Branch map: keep the scene-layer MVP. Promote a narrow “causal debug focus” only after receipt/freshness work: when focusing an SCN, allow expanding its PG ticks and fork boundary. Do **not** build a full reader/causal toggle yet.

**Expected benefit.** Better branch clarity and debugging without confusing PGs with prose pages.

**Affected files/surfaces.** Story Explorer backend readers, view models, frontend panels, search modal, branch map, tests.

**Validation/test implications.** Add tests for search grouping by scene/unscened range, stale/failure filters, branch-map focus by SCN/PG/CHC, and x-ray-without-page-route semantics.

**Risk/tradeoff.** UI complexity. Keep the default view scene-first; put PG detail behind x-ray/expanders.

**Work type.** UX, API/view-model, test/fixture.

---

### **Rank 7 — Clarify `scene_coverage` semantics in MCP and health audit**

**Problem.** `scene_coverage` is the right bounded derived view, but consumers need sharper semantics for “trimmed,” “missing,” “stale,” and “not computed.”

**Evidence.** MCP shared types describe scene coverage as a bounded, prose-free projection carrying per-PG scene bindings, unscened flags, active SCN entries, publication indicators, and no prose. Health audit treats `story_bundle_context.scene_coverage` as a prerequisite for a scene-coverage/prose-debt sub-check and says to retrieve full SCN only when needed.

**Recommendation.** Keep `scene_coverage` bounded and trim-first under token pressure. Add a compact degradation reason:

* `available`  
* `trimmed_for_budget`  
* `no_coverage_rows`  
* `index_missing`  
* `index_stale`  
* `coverage_schema_unavailable`

Health audit should treat `available` as load-bearing, `trimmed_for_budget` as a skipped sub-check with explicit caveat, and stale/missing index as an actionable infrastructure finding. Turn-cycle should consume scene coverage only as advisory/non-gating context, if at all.

**Expected benefit.** Better audit honesty and no accidental coupling between state generation and prose coverage.

**Affected files/surfaces.** MCP context packet shared types, story-bundle context builder, health audit, docs, tests.

**Validation/test implications.** Add packet tests for available/trimmed/missing/stale coverage and health-audit behavior in each case.

**Risk/tradeoff.** Slightly more packet surface. Worth it because ambiguity here causes false confidence.

**Work type.** Retrieval, docs, test/fixture.

---

### **Rank 8 — Expand scene-first tests and fixtures to cover failure reality**

**Problem.** Current tests prove the happy-path migration and route absence. They do not yet cover enough degraded artifact states.

**Evidence.** Existing scene-first acceptance tests cover scene-first route resolution, page-first route absence, presence-based publication states, technical x-ray, and missing-index degradation. The test itself notes the publication surface intentionally has no hash/freshness/8-state field.

**Recommendation.** Add fixture coverage for:

* planned only  
* prose present without receipt  
* receipt PASS/WARN/FAIL  
* receipt unreadable  
* receipt schema invalid  
* receipt stale against PG state hash  
* prose stale against receipt hash  
* missing plan  
* superseded scene  
* unscened run  
* sibling branch divergence  
* scene covering wrong branch-path slice  
* legacy page-prose directory present outside archive  
* search result grouped under scene/unscened/branch-level  
* branch map scene/unscened/fork/terminal nodes  
* state-tick x-ray without page-reader route  
* context packet coverage trimmed/missing/stale  
* health-audit scene-coverage findings

**Expected benefit.** Prevents regression into page-prose and gives Claude Code a safe target for later specs.

**Affected files/surfaces.** Story Explorer fixtures/tests, world-index tests, validators tests, MCP tests, health-audit tests.

**Validation/test implications.** Fixture should intentionally include broken states and assert diagnostic payloads.

**Risk/tradeoff.** More fixture maintenance. Necessary.

**Work type.** Test/fixture.

---

### **Rank 9 — Add a small FOUNDATIONS clarification, not a rewrite**

**Problem.** FOUNDATIONS already governs canon, causality, artifact authority, mystery preservation, and story-bundle separation. It does not need a major rewrite, but the scene-first render layer now deserves a compact principle.

**Evidence.** FOUNDATIONS distinguishes artifact authority/maturity and says story-bundle execution state belongs to story-bundle workflows, not upstream world-canon authority. The uploaded prompt asks not to recommend FOUNDATIONS changes lightly, but names possible clarifications around non-authoritative prose, PG terminology, fail-fast validation, provenance, scene coverage, and page-prose purge.

**Recommendation.** Add a short clarification:

* PG records are causal state ticks and fork anchors.  
* SCN records bind contiguous committed PG ranges into reader-facing scenes.  
* Scene prose is a non-authoritative render artifact.  
* Scene plans and receipts are render/provenance artifacts, not story state.  
* Live page-prose architecture is retired.  
* Derived coverage/provenance surfaces may be stale and must identify freshness.  
* Validation should fail fast with actionable diagnostics, not silently preserve legacy compatibility.

**Expected benefit.** Gives future specs a stable constitutional anchor without expanding architecture.

**Affected files/surfaces.** `docs/FOUNDATIONS.md`, maybe `docs/WORKFLOWS.md` and `docs/CONTEXT-PACKET-CONTRACT.md`.

**Validation/test implications.** Docs-only, but downstream specs should cite the principle.

**Risk/tradeoff.** Low. Avoid turning FOUNDATIONS into implementation detail.

**Work type.** Docs.

---

## **7. Scene / SCN / publication-state recommendations**

SCN is now mostly correct. Removing `SCN.status` was the right move because publication/attachment state is derived artifact state, not causal story state.

`title` and `slug` are justified. They support UX, search, and stable scene navigation. `scene_descriptor` and `boundary_rationale` are also justified because they explain why a PG range is one scene without forcing narrative-shape language. The boundary policy explicitly requires factual continuity rather than act/midpoint/climax language.

`previous_scene_id` should remain optional. Branch roots, repairs, supersessions, and non-linear authoring all make a required previous pointer too rigid.

`supersedes` is sufficient as an SCN field. Strengthen supersession diagnostics elsewhere: validators and `scene_coverage` should detect dangling supersedes, cross-branch supersession weirdness, and active/superseded display conflicts.

The artifact paths on SCN are redundant but tolerable. Since paths are deterministic (`scene-prose-plans/SCN-N.md`, `scene-prose/SCN-N.md`, `scene-prose-receipts/SCN-N.yaml`), the cleanest model would derive them. But keeping required path anchors is not harmful if validators enforce canonical path equality and treat artifact existence as derived publication state. Do not spend the next iteration removing those fields unless the receipt/freshness work already touches the schema.

Publication state needs to grow outside SCN. Add freshness and artifact diagnostics to `scene_coverage`; do not add a new SCN lifecycle field.

---

## **8. Scene-plan recommendations**

The scene-plan structure is right. Keep the novelist-facing body contract. Keep Content Policy, Prose Craft Contract, and Render-Time Instruction inline and byte-equal. The prompt explicitly says to treat those as settled unless strong evidence justifies reconsideration, and the repository’s validators/skill docs are already built around byte equality.

The one refinement is long-range discipline. Long scenes should not dump every PG into a massive undifferentiated prompt. They should group beats, preserve irreversible state changes, and identify compressed-but-retained causality.

Do not move IDs/hashes into the plan body. If metadata is needed, use frontmatter or sidecars. The clean prose body is a feature, not overreach.

---

## **9. Scene-prose receipt and attach recommendations**

Receipts should become the main evidentiary artifact for prose attachment. Status-only receipts are not enough.

Required next shape:

* per-check status  
* per-check rationale  
* per-check evidence list  
* evidence type: prose paragraph/span, PG ID, SE ID, CHC ID, scene-plan section, active story-record ID, canon excerpt  
* expected/actual when deterministic  
* receipt schema version  
* SCN hash  
* plan hash  
* prose hash  
* included PG state hashes  
* repair recommendation per failing check or at least per receipt

Replace `strict: true | false` with a named validation profile if the schema is changing anyway: `draft`, `review`, `publishable`. Boolean strictness is too vague.

Attach must remain no-state. The existing skill is correct: leave failed receipts truthful, route repair, and do not mutate `_source`.

---

## **10. Story Explorer UX / API / search / branch-map recommendations**

Story Explorer’s primary navigation is correct. Dashboard/timeline/scenes/unscened/search/branch-map is the right author-facing structure.

Unscened PG runs should be impossible to miss. They are prose debt and scene-boundary debt, not obscure metadata.

State-tick x-ray is acceptable and should stay technical. `/state-ticks/:pgId/xray` is the right concept. Do not add `/pages/:pgId` back.

Search grouping under scenes/unscened ranges is right. The next upgrade is failure-oriented search: authors should be able to search for stale receipts, receipt FAILs, missing plans, unscened ranges, and validation failures.

Branch map is sufficient as a scene-layer MVP. Do not promote a full PG/tick map above receipt/freshness work. Add a focused expansion mode later: scene → contained PG ticks → choice/fork boundary. That is enough.

---

## **11. `scene_coverage` / world-index / MCP / health-audit recommendations**

`scene_coverage` should stay derived, bounded, and prose-free. Its job is coverage, publication/freshness summary, and PG→SCN lookup—not prose delivery.

Add artifact diagnostics and freshness hashes to `scene_coverage`, but keep full evidence in receipts.

MCP should keep trimming scene coverage first under budget pressure, but must distinguish “trimmed” from “not computed” from “stale index.” A null layer without reason is not good enough for audit quality.

Health audit should consume `scene_coverage` in a genuinely load-bearing way for prose debt and freshness checks. If the layer is missing or trimmed, the audit should say so explicitly. Turn-cycle should not gate on scene coverage; at most, it can warn that state is accumulating unscened.

---

## **12. Legacy page-prose language purge audit**

Classification:

| Legacy surface | Classification | Action |
| ----- | ----- | ----- |
| `pages-prose`, `pages-prose-plans`, `pages-prose-receipts` in live docs/skills | Delete / replace now | Replace with scene-prose equivalents. |
| Health-audit prose-mode page-prose prerequisite | Delete / replace now | Use scene prose, scene receipts, SCN ranges. |
| Live page-prose directories in story bundles | Should fail validation | Outside archive/explicit fixtures, treat as invalid live architecture. |
| SPEC-90 and page-prose archived specs/tickets | Archived-only harmless | Do not use as live evidence. |
| PG record class, `_source/pages`, `story-page.schema.json` | Terminology acceptable | PG remains causal tick storage. |
| User-facing “page” wording for PGs | Misleading but fixable | Prefer “state tick,” “PG,” or “causal tick.” |
| `phase-6-page-snapshot.md`, `phase-7-page-plan.md` | Needs audit | Snapshot may be PG-legitimate; page-plan likely stale. |
| `pg-affordance-integrity`, `pg-se-turn-driver-consistency` | Correctly retained | PG validators are state validators. |
| `page-plan-active-pressure` | Should become scene-aware or retire | Page-plan prose pressure validation is stale unless redefined over scene plans. |
| `stemo-no-future-page-ids`, `stplan-no-future-page-ids` | Correct but rename eventually | The concept is “no future PG/tick IDs.” |

---

## **13. Fail-fast validation and diagnostics recommendations**

Make these stricter:

* Missing receipt evidence/rationale in review/publishable profile.  
* Receipt hash mismatch against SCN, plan, prose, or included PG state.  
* Live page-prose directories outside archive/fixtures.  
* Scene range mismatch against branch-path slice.  
* SCN artifact path not equal to deterministic canonical path.  
* Scene-plan body forbidden tokens, with section-specific failure.  
* Receipt referencing PGs outside SCN range.  
* Receipt PASS with no evidence.  
* Receipt choice-surface PASS when final choices are absent/extra/contradicted.

Make these richer:

* `scene_range_integrity`  
* `scene_plan_structural`  
* `scene_plan_body_engine_vocabulary_cleanliness`  
* `scene_plan_verbatim_*`  
* `scene_prose_receipt_content`  
* `scene_prose_receipt_schema_compliance`  
* health-audit scene-coverage checks  
* Story Explorer stale/degraded index reporting

The diagnostic shape should always tell the author what failed, where, why, and what kind of repair is expected.

---

## **14. Docs / tests / fixtures impact analysis**

Docs need a targeted cleanup, not a rewrite. Update FOUNDATIONS lightly; update WORKFLOWS, CONTEXT-PACKET-CONTRACT, MACHINE-FACING-LAYER, health audit, scene plan, scene prose attach, and shared schema docs where they still imply page-prose or status-based SCN publication.

Fixtures need more broken cases. The current scene-first tests prove the migration landed. The next fixtures need to prove the architecture survives stale/missing/unreadable artifacts and branch divergence.

Tests should assert diagnostic payloads, not just boolean failure. A future Claude Code spec should not be accepted if it merely adds fields without proving they are displayed, validated, and covered by degraded-state tests.

---

## **15. FOUNDATIONS alignment and possible amendment**

Worldloom’s FOUNDATIONS already emphasize constrained models, causality, artifact maturity, and separation of story-bundle execution state from world canon. A small amendment is warranted because scene-first is now a core story-bundle principle.

Recommended amendment concept:

Story-bundle PG records are causal state ticks and fork anchors. SCN records bind contiguous committed PG ranges into reader-facing scenes. Scene prose is a non-authoritative render artifact over committed state; scene plans and receipts are render/provenance artifacts, not story state. Live page-prose architecture is retired. Validators should fail fast with diagnostic remediation rather than preserve stale compatibility.

Do not add implementation details to FOUNDATIONS. Keep it constitutional.

---

## **16. Risks and tradeoffs**

The biggest risk is over-formalizing creative prose evaluation. Avoid that by making deterministic validators check evidence shape, freshness, and obvious contradictions, while leaving literary judgment in receipt rationales with evidence.

The second risk is UI clutter. Solve it with layered diagnostics: badge first, detail on expand.

The third risk is stricter validation breaking current private story material. That is acceptable. The user preference is explicit: no compatibility shims; fail fast with remediation.

The fourth risk is spending a whole iteration renaming “page.” Do not. Purge page-prose and user-facing ambiguity; leave legitimate PG internals alone.

---

## **17. What not to do**

Do not restore page-prose.

Do not add `SCN.status` back.

Do not let scene prose mutate story state.

Do not turn PGs into reader pages.

Do not remove inline canonical Content Policy / Prose Craft Contract / Render-Time Instruction unless a separate strong reason appears.

Do not build a huge PG-level branch-map rewrite before receipts/freshness/diagnostics.

Do not hide stale artifacts behind a generic WARN.

Do not preserve legacy page-prose because old docs, old tickets, or old fixtures mention it.

Do not make backward compatibility a goal.

---

## **18. Acceptance criteria for future Claude Code specs**

A future implementation spec should be considered acceptable only if it satisfies these requirements:

1. SCN remains status-free and scene-first.  
2. Receipt schema persists per-check evidence and rationale.  
3. Receipt validation fails on missing evidence in review/publishable mode.  
4. Receipt freshness covers SCN, plan, prose, and included PG state hashes.  
5. `scene_coverage` exposes richer artifact/freshness diagnostics without embedding prose.  
6. Story Explorer displays scene freshness/validation state prominently.  
7. Search can find scenes by validation/freshness/prose-debt states.  
8. State-tick x-ray remains technical; page-reader routes remain absent.  
9. Health audit consumes scene coverage and scene receipts, not page-prose receipts.  
10. Live page-prose directories fail validation outside archive/fixtures.  
11. Scene-plan validators report section and offending token/span.  
12. Long-range scene plans have compression/beat-grouping discipline.  
13. Tests cover planned, prose-present, PASS/WARN/FAIL, stale, missing, unreadable, superseded, unscened, and branch-divergent cases.  
14. Docs contain no live page-prose architecture language except explicit legacy/archive explanation.  
15. No spec introduces compatibility shims for old page-prose material.

That is the next iteration: **evidence, freshness, diagnostics, purge. Not reinvention.**

