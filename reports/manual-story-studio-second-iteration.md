# **1. Executive summary and blunt verdict**

**Verdict: the first implementation is a strong scaffold, not the right final tool yet.** It correctly avoids the biggest trap: it is not an internal-LLM system, not an MCP client, not a patch-engine adapter, and not a branching-story runtime. The package boundary, deterministic prompt composition, write sandbox, and high-effort character profile model are worth preserving.

But the current implementation still feels too much like **“CRUD pages plus a prompt renderer”** and not enough like a **fast writer’s cockpit**. The most dangerous flaws are not cosmetic:

1. **State integrity is too quiet.** Several read paths turn malformed YAML, invalid sidecars, unreadable files, and corrupted metadata into `null`, empty lists, or “not found.” That violates the desired fail-fast model directly.  
2. **Prompt leakage should be hard-blocked, not soft-linted.** Internal manual IDs, engine IDs, schema terms, validators, lifecycle jargon, and patch language should never be copyable into the external prose prompt.  
3. **The prose/state boundary is currently overcorrected.** The app correctly must not infer state from pasted prose, but the Manual Studio prose contract risks telling the external LLM not to narrate state-worthy change at all.  
4. **Segment deletion/edit/reorder semantics do not match the intended author workflow.** If prose is bad, the likely workflow is “do not accept it; adjust directive/state/template and regenerate externally,” not “save, delete, reorder, or preserve orphan segment files.”  
5. **The schema surface is broad but uneven.** Cast profiles are rich and useful. Most other records are too shallow to preserve causal continuity, while the UI exposes them as form/admin categories rather than as a current writing cockpit.  
6. **Beat templates are a promising simplified storylet layer, but they need to become author-facing pressure/turn cards, not miniature SLTs and not vague tag bundles.**  
7. **The website is route-complete but not loop-complete.** The current app has Worlds, Dashboard, Records, Cast, Moment Composer, Prompt Preview, Paste Prose, Manuscript, Contract, Prompt History, and Beat Templates routes, but the core author loop is still scattered. The app should center one flow: **state glance → directive → template candidates → prompt preview/copy → paste accepted prose → manual state-review checklist → record updates.**

My strongest recommendation: **keep Manual Story Studio as a sibling local-first package with direct filesystem reads/writes and local validators. Do not add MCP. Do not add patch-engine writes. Do not add an internal LLM. Break storage/schema/UX if needed. Turn the current implementation into a fail-fast, prompt-safe, current-state cockpit.** The uploaded mission explicitly frames the absolute no-LLM rule and the default anti-MCP/anti-patch-engine stance, and it asks for a challenge-everything proposal rather than defense of the existing implementation.

---

# **2. Repository access note**

I could **not honestly verify** that live `main` resolves to `876463c98cce5795ab3052e7297f897106967086` through the GitHub connector.

The connector behaved unexpectedly: repository metadata for `joeloverbeck/worldloom` resolved through the connector namespace as `joeloverbeck/one-more-branch`, and the connector’s commit lookup for `876463c98cce5795ab3052e7297f897106967086` did not verify as a normal commit object. However, exact GitHub blob fetches at:

`joeloverbeck/worldloom` + `876463c98cce5795ab3052e7297f897106967086` + explicit paths

did return the expected Worldloom files. Per the prompt’s fallback rule, I treated that as a connector limitation and used the uploaded manifest only as inventory, then fetched targeted files from exact blob URLs at the provided tree-ish/SHA where possible. The uploaded manifest includes the Manual Studio source, tests, frontend, adjacent CI/index/story-explorer/hook surfaces, and confirms the relevant file inventory.

This audit is therefore grounded in:

* the uploaded mission prompt, which defines the audit scope and constraints;  
* the uploaded manifest as inventory;  
* targeted exact-path file fetches from the provided Worldloom ref;  
* external research.

---

# **3. Current implementation map**

The current Manual Story Studio implementation is a sibling package at `tools/manual-story-studio`. Its package description explicitly calls it a deterministic local writing cockpit for manual records, Markdown prompt composition, pasted-prose manuscript handling, with **no LLM, no MCP, and no patch engine**. Its runtime dependencies are only Fastify/static serving/YAML, not patch-engine, world-mcp, or SQLite.

The implemented surface includes:

* **Backend package:** CLI, Fastify server, routes for worlds, manual stories, metadata, records, beat templates, prompts, segments, and manuscript.  
* **Storage:** `worlds/<world>/manual-stories/<manual-story>/`.  
* **Metadata:** `manual-story.yaml` with story contract, cast order, segment order, prompt policy, and manuscript policy. The default policy includes `include_recent_segments: 1`, `recent_template_advisory_window: 2`, `compile_on_segment_save: true`, and `allow_reorder: false`.  
* **Records:** one YAML file per record under `records/<class>/<id>.yaml`, across cast, entities, statuses, locations, objects, facts, beliefs, intentions, plans, emotions, relationships, threads, obligations, consequences, clocks, secrets, questions, artifacts, and beat templates.  
* **Prompt composer:** deterministic composition pipeline with 15 prompt sections, content-policy inclusion, prose-craft inclusion, selected cast/records, optional template guidance, recent prose excerpt, lint, and save support.  
* **Prompt lint:** hard checks for empty directive/content contract/selected cast/selected records; soft checks for internal IDs, engine jargon, schema/validator terms, record-class narrator voice, and template findings.  
* **Segments/manuscript:** pasted prose becomes `SEG-*` Markdown plus YAML sidecar; metadata segment order is updated; `manuscript.md` can be compiled.  
* **Frontend:** route list includes Worlds, Manual Stories, Create, Dashboard, Records, Cast, Moment Composer, Prompt Preview, Paste Prose, Manuscript, Contract, Prompt History, and Beat Templates. The app-level banner states the write root, read-only world canon/story bundles, and no external LLM connection.  
* **CI:** a dedicated Manual Studio workflow installs the package and web subpackage and runs `npm test`.  
* **Monorepo scripts:** `scripts/build-all.sh` and `scripts/check-all.sh` do **not** include `manual-story-studio`, so it is covered by its dedicated CI but not by the all-tools local check path.  
* **World index integration:** world-index intentionally excludes `manual-stories` from indexing.  
* **Story Explorer:** remains separately read-only, with a route guard that throws on POST/PUT/PATCH/DELETE/OPTIONS.

---

# **4. What is strong and should probably survive**

**The package boundary is right.** Manual Studio is a sibling tool, not a subfeature of Story Explorer, MCP, patch-engine, or world-index. The package description, dependency list, and README stance are aligned with the product’s “no internal LLM, deterministic local cockpit” identity.

**The no-MCP/no-patch-engine dependency choice is correct.** The package README says direct file reads are sufficient because there is no intermediary LLM, and it explicitly excludes `@worldloom/patch-engine`, `@worldloom/world-mcp`, and `better-sqlite3`. That should remain the default.

**The write sandbox is a good base.** The sandbox resolves writes under `worlds/<world>/manual-stories/<story>`, rejects invalid slugs, checks real paths, rejects escapes, and denies world canon/story/tool prefixes.

**The route-registration write guard is useful defense-in-depth.** The Fastify server registers read routes normally and write routes only inside `wrapRouterWritable`. The guard itself rejects write methods unless route registration occurs inside the explicit writable scope.

**The cast/profile translator is the best part of the system.** It includes world pressure core, wound/appetite/self-mythology/contradiction, voice under pressure/intimacy/evasion/anger/lying, body/presence, pressure behavior, perception, agency/planning, relationship-specific behavior, and prose constraints. This is much closer to a prose-quality tool than the rest of the record model.

**The deterministic prompt composer is directionally right.** It reads content policy and craft contract at composition time, assembles deterministic sections, and does not call an LLM.

**The state-update checklist idea is right.** It states the app has not changed records and asks the author to review state categories after prose save. That is exactly the correct app/prose boundary; the implementation just needs richer category and reference awareness.

**The world-index exclusion is correct.** Manual stories should not become indexed world canon or ordinary branching-story state. The indexer explicitly excludes `manual-stories`.

---

# **5. What is weak, wrong, overbuilt, underbuilt, or risky**

**The read layer is the biggest correctness failure.** `readManualStoryMetadata` returns `null` on missing, malformed, unreadable, non-object YAML, or parse failure. `listRecords` silently continues past YAML parse failures and records without summaries. `readRecord` returns `null` for invalid IDs, missing files, or invalid parse. `listSegmentSidecars` silently skips invalid segment sidecars. This is the opposite of the user’s fail-fast requirement.

**The UI repeats that quietness.** Dashboard and Moment Composer use `.catch(() => {})` in multiple data-loading paths, so integrity failures disappear behind empty/loading states.

**Prompt leakage is treated too gently.** The lint model explicitly classifies internal IDs, engine jargon, schema/validator terms, and record-class narrator voice as soft rules. The Prompt Preview copy button is disabled only for `lint.blockingForCopy`, while soft findings can still be copied and saved via override. That is wrong for this tool.

**The prose craft contract accidentally neuters change.** It correctly says prose is manuscript, not state, but then says prose should not narrate state changes that have not happened in the record store yet. That conflicts with the clarified principle in the mission: the external LLM may write prose in which something meaningfully happens; the app must simply not infer machine state automatically.

**The segment pipeline has too much manuscript surgery.** Editing/deleting/reordering saved segments is an editor/admin workflow, not the intended generation loop. The write layer supports segment edit and delete, including hard delete, forced delete, and order-removal while preserving files when referrers exist. The user explicitly doubts deletion/reordering as a sensible workflow.

**The schema is broad but not cockpit-shaped.** There are many classes, but most are shallow. The cast profile is rich; locations, facts, statuses, beliefs, intentions, plans, emotions, relationships, threads, obligations, consequences, clocks, secrets, questions, and artifacts are often closer to tagged cards than authorially meaningful state objects. The schema breadth resembles branching-story state inventory, but the UI lacks the “what matters right now?” layer.

**The dashboard exposes IDs and classes too visibly.** Dashboard renders cast IDs and `class/id` links. IDs are acceptable in files and debugging, but they should be mostly invisible in the writer cockpit and absolutely absent from the external prompt.

**The current prompt likely over-sections.** Fifteen sections are testable and deterministic, but the external LLM does not need to see the implementation’s internal taxonomy as a long bureaucratic prompt. It needs a sharp task, the current fictional handoff, selected constraints, style/POV, a stop rule, and output-only instruction.

**The frontend is route-complete, not workflow-complete.** App routes are complete, but the top-level nav only links to Worlds, and the story loop is split across pages. Dashboard contains useful panels but is still a list of summaries, counts, and navigation links rather than an integrated cockpit.

---

# **6. Foundations alignment audit**

`docs/FOUNDATIONS.md` frames Worldloom around constrained models of ontology, space, time, causality, embodiment, institutions, resources, culture, knowledge, history, daily life, pressure points, and mystery reserves. Manual Studio should inherit the spirit of that: fiction state is not a bag of cool facts; it is a continuity model.

The current implementation partially aligns:

* It preserves local manual state outside world canon and story-bundle state.  
* It uses typed record classes for causal/continuity categories.  
* It avoids automatic canon mutation.  
* It excludes `manual-stories` from world-index.

But it also misaligns:

* **Too much absence-as-empty.** Foundations emphasizes that silence is not permission to invent; Manual Studio’s read layer turns corruption into silence.  
* **Too little causal pressure modeling.** Records exist, but the cockpit does not force the author to see causal pressures, current obligations, clocks, secrets, and consequences as the live current-state surface.  
* **Too little epistemic discipline in prompts.** Secrets/questions/beliefs exist, but the prompt leak model is soft and the external prompt may accidentally expose engine-ish vocabulary or durable state labels.  
* **Too much branching-story residue.** The class set resembles story-bundle record classes. That is not automatically wrong, but Manual Studio must translate these into author-facing writing concepts, not replay the branching engine’s ontology.

The correction is not to import more Foundations machinery. It is to apply Foundations discipline locally: **current state must be explicit, validated, and author-controlled; manuscript prose is evidence/material, not automatic machine authority; world canon stays read-only.**

---

# **7. Architecture/package-boundary audit**

The architecture should remain:

* `tools/manual-story-studio` as an independent package.  
* Direct filesystem access.  
* Local YAML/Markdown validation.  
* No internal LLM.  
* No world-mcp runtime.  
* No patch-engine write path.  
* No SQLite/index dependency.  
* Read-only optional world-canon browsing/import.

Current boundary choices are mostly correct. The package description and dependency list prove the current package has not smuggled in model, MCP, patch-engine, or SQLite dependencies. The package README explicitly says canon and normal story bundles are read-only and the storage root is `worlds/<slug>/manual-stories/<slug>/`.

The weak spots:

* The global `build-all.sh` and `check-all.sh` omit Manual Story Studio. Dedicated CI exists, but local “all green” can be misleading.  
* There is currently no shared health/integrity contract between backend and frontend. Every page handles failure ad hoc.  
* Duplication vs sharing is unresolved. Some validation utilities could be copied or extracted, but import-sharing from branching validators risks reintroducing engine vocabulary and state assumptions.

Recommendation: **keep isolation by default.** Extract only neutral helpers if they are genuinely domain-agnostic: safe path resolution, YAML parse-with-location, schema error formatting, and maybe typed ID allocation. Do not share branching-story validators, storylet selectors, or patch envelopes.

---

# **8. Storage layout audit**

The root location is right: **keep** `worlds/<world>/manual-stories/<manual-story>/`. It is local-first, file-visible, world-adjacent, and separable from canon/story bundles.

The current default metadata shape is reasonable but too permissive: it creates an empty premise and tone. A cockpit should allow draft creation, but **prompt composition should block until the minimum story contract is filled**.

Current layout issues:

* `manual-story.yaml` is doing too much: identity, contract, prompt policy, segment order, manuscript policy.  
* `records/<class>/<id>.yaml` is acceptable for file inspectability, but the system lacks a `current-context` or `working-set` file.  
* `segments/SEG-<n>.md` and `.yaml` are conceptually okay, but deletion/edit/reorder policy is wrong.  
* `prompts/PROMPT-<n>.md` plus `prompt-runs/PROMPT-<n>.yaml` splits one artifact into two directories. Same-basename sidecars would be simpler.  
* `manuscript.md` should be a derived artifact that can be persisted for convenience, but validation must be able to prove it matches accepted segment order.  
* Absence of indexes is mostly fine for now. A local `health.json` or `state-cache.json` is not needed if validation is fast; add a derived cache only when performance requires it.

My storage verdict: **keep file-first YAML/Markdown, add a current-context layer, simplify prompt/segment artifact pairing, remove general reorder/delete semantics.**

---

# **9. Schema and record model audit**

The current record classes are directionally useful but shaped too much like a state database. The mission explicitly asks whether records are too shallow, too rigid, or too CRUD-shaped. Answer: **yes — except for cast.**

Recommended framing: the schema should serve three tasks only:

1. Preserve continuity.  
2. Improve the next external prose prompt.  
3. Make post-prose manual review fast.

Classes should be reorganized in the UI into six author-facing groups:

1. **Cast and voices**  
    Cast profiles, current physical/social presentation overlays, role in current moment.  
2. **Continuity facts**  
    Locations, objects, statuses, facts, artifacts. These should answer: “What must not be contradicted in the next prose?”  
3. **Character dynamics**  
    Beliefs, emotions, intentions, plans, relationships. These should answer: “What do people currently want, fear, misunderstand, hide, and do under pressure?”  
4. **Pressure and causality**  
    Threads, obligations, consequences, clocks. These should answer: “What is pushing the fiction forward?”  
5. **Secrets, questions, reveal policy**  
    Secrets and questions should be richer than tags: who knows, who suspects, what evidence exists, what cannot be revealed, what may be misread.  
6. **Reusable beat templates**  
    Template cards, not branching storylets.

Most records need these common fields:

* `title`  
* `active`  
* `importance`  
* `current_relevance`: `background | available | active_now | must_include`  
* `prompt_visibility`: `never | only_if_selected | auto_if_relevant`  
* `author_summary`: short, promptable prose  
* `continuity_lock`: what not to contradict  
* `refs`: typed references  
* `evidence_segments`: accepted segment IDs, optional  
* `last_reviewed_after_segment`  
* `review_next_time`: boolean or category label

The big missing piece is **active-state/current-context selectors separate from the corpus**. A large record library is not a cockpit. The cockpit needs a file like `current-context.yaml` that says:

* current location;  
* current cast;  
* current POV holder;  
* active pressure clocks;  
* active secrets/questions;  
* records pinned for next prompt;  
* “must not reveal” constraints;  
* current handoff summary;  
* last accepted segment.

Without that layer, the prompt composer must infer relevance from importance/ref heuristics, which is not enough.

---

# **10. Character/profile model audit**

The Manual Character Profile is strong and should survive. The cast translator’s sections match the right craft concerns: identity, world-produced wound/appetite/contradiction, voice variation, body/presence, pressure behavior, perception, agency, relationship behavior, and anti-generic prose constraints.

But the current profile risks two problems:

1. **Permanent-profile bloat.** A character profile should not absorb every transient emotional or physical state.  
2. **Prompt overload.** Including the full profile for multiple cast members can drown the moment directive.

Revised model:

* Keep the deep **character profile** as durable authority.  
* Add separate **current presentation/status overlays**:  
  * current clothing/body condition;  
  * current emotional posture;  
  * current social mask;  
  * current objective;  
  * current withheld knowledge;  
  * current relationship stance toward other involved cast.  
* Add **profile compression modes** for prompt composition:  
  * `full` for protagonist or newly introduced important cast;  
  * `voice+pressure` for active secondary cast;  
  * `one-line` for present but background cast.  
* Add a “do not genericize” field that is rendered as a short imperative, not a profile essay.

The profile should not be smaller; it should be **better separated into durable identity vs current moment overlays**.

---

# **11. Storylet/beat-template model audit**

The current beat-template schema is a good start. It has `move_family`, tags, intensity, tone fit, role slots, relationship axes, beat functions, requires/excludes, beat guidance, forbidden inventions, and author notes.

But right now it is too shallow to be truly useful for Manual Studio. It is not a branching SLT, and it should not become one. Storylets in interactive narrative commonly consist of content, prerequisites, and effects; Emily Short’s summary is that a storylet has a piece of content, prerequisites for when it can play, and effects on world state after it plays. She also emphasizes that storylets can be simple card-like authoring tools, not only procedural AI systems.

Manual Studio should adapt that idea but remove automatic effects:

* **content/guidance:** what kind of beat this helps write;  
* **author-facing preconditions:** when it tends to fit;  
* **no automatic state effects:** only `expected_state_review` suggestions after prose;  
* **manual selection only:** the app suggests, the author chooses.

Add fields:

* `pressure_type`: threat, temptation, misunderstanding, deadline, debt, intimacy, exposure, reversal, choice, loss, discovery.  
* `turn_type`: reveal, refusal, concession, escalation, reversal, commitment, misread, sacrifice, boundary-crossing, discovery, consequence-arrives.  
* `scene_function`: not “act structure,” but author-facing function: complicate plan, test relationship, expose cost, force decision, withhold answer.  
* `preconditions_text`: plain English.  
* `requires_context`: cast roles, relationship axis, location kind, active secret/question/clock/thread.  
* `do_not_resolve`: constraints.  
* `expected_state_review`: records likely to review after prose.  
* `stop_after`: template-specific stop cue.  
* `example_use`: one brief example, not prose to paste.  
* `anti_patterns`: what this template should not become.  
* `cooldown`: advisory only.  
* `pin`: author override.

This is enough to be useful without importing SLT predicate DSL complexity.

---

# **12. Deterministic filtering audit**

Current filtering is a deterministic nine-stage pipeline. It filters active templates, intensity compatibility, role-slot satisfiability, required record classes/tags/location/secret exclusions, applies recent-use advisory, and sorts by pins/tags/role/tone/recent/title.

That is good. But it currently underuses actual story state:

* relationship axes are not grounded enough in active relationship records;  
* tone matching is too stringy;  
* clocks, open threads, obligations, and consequences are not first-class;  
* moment directive metadata is not structured enough to filter with confidence;  
* recent use is advisory but not integrated into author-facing “why.”

Filtering should be deterministic and humble. It should not pretend to be an AI selector.

Recommended deterministic filter inputs:

* selected cast and roles;  
* active/current context record IDs;  
* active record tags;  
* current location tags;  
* selected relationship records and axes;  
* clock states and urgency;  
* open threads;  
* obligations and consequences due soon;  
* secret forbidden reveal tags;  
* content intensity;  
* author pins;  
* recent template use;  
* optional directive metadata: `desired_pressure_type`, `desired_turn_type`, `target_relationship_axis`.

The UI should show both:

* **why suggested:** “fits trust pressure between A/B; active secret forbids direct reveal; current clock is urgent”;  
* **why not suggested:** hidden by default but available.

The user should always be able to choose “no template.”

---

# **13. Prompt composer and external Markdown prompt audit**

The 15-section prompt is structurally reasonable but too implementation-shaped. The current section 3 “current situation” uses high/central records, references to included cast, and recent last paragraph. That is useful, but it should be made more authorial.

Problems:

* Fifteen sections may produce a compliance prompt rather than a vivid writing brief.  
* The composer relies on record importance/ref heuristics rather than a current-context selector.  
* Recent prose is selected from segment files by numeric latest rather than necessarily validated segment order.  
* Missing/corrupt data can be silently swallowed in supporting helpers.  
* Soft prompt lint makes leakage acceptable.  
* Section titles themselves may be too visible as system taxonomy.

Recommended prompt shape:

1. **Task**  
    “Write the next short prose segment only.”  
2. **Story contract**  
    POV, tense, tone, content boundaries, language register.  
3. **Current handoff**  
    Author-curated current situation summary plus optional last paragraph of accepted manuscript.  
4. **Moment directive**  
    The primary instruction. This wins.  
5. **Required beat cluster**  
    2–5 concrete beats, if supplied.  
6. **Selected cast rendering**  
    Condensed voice/body/pressure info for involved cast.  
7. **Continuity constraints**  
    Location, objects, facts, current statuses, relationship/emotional state, plans, clocks.  
8. **Secrets/questions/reveal policy**  
    What must not be revealed, what can be hinted, what may be misread.  
9. **Optional beat-template guidance**  
    Only if selected, clearly advisory.  
10. **Style and craft contract**  
     Shortened craft rules.  
11. **Stop and output rule**  
     Prose only; stop after the beat cluster reaches the first new decision/response point.

The current output instruction is strong: “Output prose only. No commentary. No Markdown headings. No bullet points. No notes.” Keep that.

The stop rule is directionally right but needs sharper wording. Current rule: stop at the first materially new response point. Revised stop rule below in section 26.

---

# **14. Prose/state boundary audit**

This is the most important semantic correction.

Correct boundary:

* The **external LLM may write prose where something meaningfully happens**.  
* Manual Studio must **not infer** state from pasted prose.  
* The user manually decides which changes become records.  
* The checklist reminds the user what to review.  
* Prose is manuscript evidence and authorial material, not automatic machine state.

The mission explicitly states this clarification.

The current prose craft contract gets half right and half wrong. It correctly says the LLM writes prose and the author manually updates records; then it says prose should not narrate state changes that have not happened in the record store yet. That wording should be removed or heavily revised.

Better wording:

Prose may render decisive emotional, relational, practical, or informational turns when the directive and beat cluster call for them. Do not summarize or label a durable after-state as settled unless the directive asks for that. Render the observable experience of the turn. Manual Studio will not infer or apply state changes from the prose; after saving, the author reviews which records should be created or edited.

That preserves meaningful fiction while protecting machine state.

---

# **15. Segment/manuscript pipeline audit**

Current compile is usefully strict: it reads `segment_order`, renders each segment, and writes `manuscript.md`. Rendering a segment reads the Markdown file and, optionally, sidecar title. Good.

But current segment lifecycle is too broad. Save, edit, delete, forced delete, hard delete, and order-removal-with-files-preserved are not the right author model.

Recommended model:

* **Draft prose is external and unsaved until accepted.**  
* “Paste Prose” should mean “accept this as the next manuscript segment.”  
* Once accepted, a segment is append-only by default.  
* No ordinary reorder.  
* No ordinary delete.  
* Allow only:  
  * “discard before save”;  
  * “replace latest accepted segment” only if no later accepted segment exists and no state-review record has been marked complete;  
  * “retire segment” as a rare explicit repair mode, never silent deletion.  
* `manuscript.md` should be derived and rebuildable. Persist it for convenience, but validate it against segment order.  
* Segment IDs should be lowercase if you want total ID consistency: `seg-1`, `prompt-1`. If preserving uppercase `SEG-1`/`PROMPT-1`, keep them out of the prompt/UI. My preference: **lowercase all internal Manual Studio IDs** for consistency.

The user’s instinct is right: if the latest prose is bad, do not preserve it as a segment. Adjust the directive/state/template and run the external model again.

---

# **16. Validation and fail-fast integrity audit**

This needs a major redesign.

Current examples of silent failure:

* Metadata returns `null` on parse/read/object failure.  
* Record list skips invalid YAML or records with missing summaries.  
* Segment list skips invalid sidecars.  
* Frontend catches and ignores backend/API failures in dashboard/composer.

The user explicitly wants fail-fast: malformed records, missing sidecars, inconsistent prompt artifacts, missing selected records, broken references, and compile failures must surface clearly.

Recommended integrity model:

* Add `GET /api/worlds/:world/manual-stories/:story/health`.  
* Health returns:  
  * `ok | degraded | blocked`;  
  * structured findings with `severity`, `code`, `path`, `message`, `repair_hint`;  
  * file location;  
  * whether prompt copy/save/paste/manuscript compile is blocked.  
* Every read route does parse + schema validation, or consumes a validated story load object.  
* No silent empty list unless an optional directory is genuinely absent and validly absent.  
* Core files corrupt → dashboard blocked by health banner.  
* Record list corrupt → records route returns 409/422 with structured findings, not partial data.  
* Prompt compose with any selected missing/corrupt artifact → hard fail.  
* Segment sidecar/body mismatch → health blocked.  
* Prompt `.md`/sidecar mismatch → health degraded or blocked depending on copy/history reliance.  
* `manuscript.md` missing is okay before first compile; inconsistent manuscript is degraded with rebuild option.

Fail-fast does not mean hostile. It means **visible, specific, repairable failure**.

---

# **17. Test/CI/acceptance audit**

There are many backend tests in the manifest: capstones, prompt translators, prompt sections, read/write, server routes, sandbox, templates, refs, schema, and manuscript tests. That breadth is good.

But the web package’s `test` script is only `tsc --noEmit`; it does not run browser/component tests. The backend package test script builds backend, runs Node tests, and then runs the web package test. CI runs that package test.

What is missing:

* realistic manual story fixture;  
* browser-like acceptance tests;  
* corrupt-state tests that assert health banners and blocking behavior;  
* full workflow test:  
  * choose world;  
  * create manual story;  
  * fill contract;  
  * create cast/profile;  
  * create continuity records;  
  * compose prompt;  
  * hard-block leakage;  
  * save prompt;  
  * paste accepted prose;  
  * show checklist;  
  * update records;  
  * compile manuscript.  
* frontend tests for copy/save/paste/error states;  
* “no copy with internal ID” acceptance test;  
* “malformed YAML blocks dashboard” acceptance test;  
* “segment sidecar missing blocks manuscript” acceptance test;  
* “world canon is not writable” route sweep.

Recommendation: keep the many unit tests, but promote the acceptance layer. Capstone grep tests are useful only as smoke alarms. They cannot prove the app feels right or fails safely.

Also add Manual Studio to `build-all.sh` and `check-all.sh`, unless there is a deliberate reason not to.

---

# **18. Website UX audit**

The frontend is a page list with some cockpit panels. It is not yet a cockpit.

Dashboard has useful ideas: story contract, directive draft, active cast, high-importance records, open tracking, latest segment, word count, and prompt link. But it catches failures quietly and exposes IDs/classes.

Moment Composer has the right core controls: directive, involved cast, relevant records, beat template candidates, generate prompt. But suggested records are just high/central importance records, not a true current-state working set.

Prompt Preview has useful edit-back buttons and blocks copy/save only on hard lint. But for this product, “soft leakage copy anyway” should not exist for IDs/engine/schema jargon.

Recommended UX:

* One story cockpit page, not just dashboard.  
* Persistent health banner at top.  
* Left rail: current cast/location/clock/secrets.  
* Center: moment directive + beat cluster + template candidates.  
* Right rail: prompt health, selected records, leakage status.  
* Below: prompt preview and copy.  
* After paste: checklist with direct “open/create/update record” affordances.  
* Keyboard-first:  
  * `Cmd/Ctrl+Enter` compose;  
  * `Cmd/Ctrl+Shift+C` copy if clean;  
  * `Cmd/Ctrl+S` save current form;  
  * `/` quick record search;  
  * `g d`, `g p`, `g m` navigation.  
* Unsaved-change handling on directive, contract, records, templates.  
* IDs hidden by default; reveal only in technical details.

The app should make the author feel: “I know the current state, I can generate the next prompt safely, and I know what to update after reading the prose.”

---

# **19. Safety/write-boundary audit**

The safety boundary is strong but should not be treated as complete proof.

Strong points:

* `resolveManualStoryRoot` builds only under `worlds/<world>/manual-stories/<story>`.  
* `assertInsideSandbox` resolves real paths and rejects paths outside the manual story root.  
* It denylists world canon/story/index/tool destinations.  
* `safeWriteFile` rejects absolute relative paths and writes after sandbox assertion.  
* The server registers write routes inside the writable wrapper.

Risks:

* Route guard catches registration mistakes, not arbitrary filesystem writes inside a route.  
* Every write route should accept logical IDs, never arbitrary paths.  
* Delete flows need more scrutiny than write flows.  
* Symlink edge cases need negative tests for both existing and newly created parents.  
* Static serving seems read-only, but route/static ordering should be covered with tests.

Recommendation:

* Centralize all writes through a `ManualStoryStore` or equivalent.  
* Make raw filesystem write APIs unavailable to routes except through that store.  
* Add route inventory tests that enumerate every registered POST/PUT/PATCH/DELETE and prove it is under the writable wrapper.  
* Add sandbox tests for symlink root, symlink subdir, absolute path, traversal, and denied world/tool prefixes.  
* Remove ordinary segment delete, which reduces safety surface.

---

# **20. Story Explorer relationship audit**

Story Explorer must remain read-only. Its guard rejects non-read route methods. Manual Studio should not weaken or share write assumptions with it.

Safe sharing:

* visual components/patterns;  
* markdown sanitization;  
* error boundary conventions;  
* route loading components;  
* maybe record-link UI if made generic.

Unsafe sharing:

* read/write store logic;  
* story-bundle state parsers with branching assumptions;  
* storylet selectors;  
* validators that emit engine vocabulary;  
* any component that expects PG/SE/SCN/SLT concepts.

Manual Studio can learn from Story Explorer’s X-ray/current-state panels, but it should not become Story Explorer with write buttons.

---

# **21. Renderer contract/docs audit**

There is a clear documentation mismatch.

`docs/manual-story-studio/README.md` says SPEC-102 lands two Manual Studio variants: `prose-craft-contract.md` and `manual-render-instruction.md`. The uploaded manifest shows `docs/manual-story-studio/README.md` and `docs/manual-story-studio/prose-craft-contract.md`, but no `manual-render-instruction.md`.

Fix options:

1. Add `manual-render-instruction.md`.  
2. Remove the README claim and keep only `prose-craft-contract.md`.  
3. Fold render-time instruction and stop rule into prompt section source files.

My recommendation: **fewer docs, not more.**

Keep:

* `docs/manual-story-studio/README.md`  
* `docs/manual-story-studio/prose-craft-contract.md`  
* one new `docs/manual-story-studio/prompt-contract.md` only if it documents the rendered prompt’s public contract.

Do not fork or edit branching-story prose renderer docs unless there is a neutral shared contract. Manual Studio’s prose contract already says it is a sibling, not a fork, and is read fresh at compose time.

Most importantly: fix the prose/state wording in `prose-craft-contract.md`.

---

# **22. Research synthesis and how it changes the recommendation**

Local-first research supports the current file-first direction. Local-first software emphasizes local ownership, fast/offline operation, longevity, privacy, and user control; the classic local-first work is associated with Kleppmann, Wiggins, van Hardenberg, and McGranaghan. This argues against database-first, cloud-first, or MCP-first architecture for Manual Studio. The author’s manuscript and state should remain ordinary local files.

Plain-text writing workflows also support file-first storage. Markdown and Fountain show why writers accept lightweight markup: portable text, readable source, and tool-independent longevity. Fountain’s syntax is designed so a screenplay can be written as plain text while preserving intentional formatting and structure. Obsidian-like workflows also validate folders of Markdown files as a durable knowledge base model rather than opaque app databases.

Scrivener/Ulysses-style research points to a key UX lesson: writers need organization, compile/export, metadata, and focus, but not necessarily database admin. Scrivener is described as a writer’s word processor/outliner with documents, notes, metadata, templates, corkboard/outliner, and export/compile workflows. Ulysses-style Markdown writing emphasizes distraction reduction, large project management, Markdown, and export flexibility. The design implication: Manual Studio should keep records and metadata behind a cockpit, not make the author live inside record forms.

Storylet research supports simplified beat templates, not SLT import. Emily Short’s storylet framing — content, prerequisites, effects — is useful, but Manual Studio must drop automatic effects and replace them with manual post-prose review suggestions. Recent LLM-storylet work like Drama Llama explores LLM-powered triggers and natural-language authoring, but that direction is explicitly inappropriate here because Manual Studio must not run internal LLMs.

LLM story-generation research supports explicit planning/outline/beat guidance. Plan-and-Write found explicit storyline planning improved diversity, coherence, and topicality over generation without full planning. DOC-style detailed outline control improved long-story coherence, outline relevance, interestingness, and controllability. This argues for strong moment directives, beat clusters, and current-state summaries — not vague “continue the story” prompts.

Human-AI co-writing research reinforces authorial control. CoAuthor studied rich human/GPT-3 writing sessions and framed LMs as collaborators whose capabilities require careful interaction design. Scaffolding research found higher scaffolding can improve writing quality/productivity but may reduce ownership/satisfaction, which supports giving the writer explicit control over directives/templates/records rather than letting an internal model drive.

Security research reinforces hard prompt lint and least agency. OWASP treats prompt injection as a core LLM risk and recommends constraining model behavior, validating expected output, filtering input/output, least privilege, and human approval for high-risk actions. OWASP’s Excessive Agency category specifically warns against LLM systems with unnecessary tools, permissions, and autonomy. Manual Studio’s best mitigation is architectural: **no internal LLM, no tool access, no automatic state extraction, hard prompt leakage lint.**

---

# **23. Proposed revised architecture**

Keep the current package boundary, but reshape the internals:

tools/manual-story-studio/

 src/

   store/

     load-story.ts        # parse + validate full manual story health

     write-story.ts       # only write gateway

     health.ts            # structured integrity model

   schema/

     metadata.ts

     records.ts

     templates.ts

     artifacts.ts

   prompt/

     compose.ts

     lint.ts              # hard leakage gates

     sections/

   templates/

     filter.ts

     explain.ts

   manuscript/

     compile.ts

     validate.ts

   server/

     routes/

   web/

Architecture principles:

* **One validated story-load path.** Do not let every read route parse files differently.  
* **One write gateway.** Do not let routes call filesystem helpers freely.  
* **Health-first UI.** Every story page consumes health status.  
* **Prompt-safe by construction.** Translators must emit author-facing prose only; lint is a second gate, not the first defense.  
* **No MCP. No patch engine.** Direct filesystem writes plus local validation are sufficient and simpler.  
* **World canon read-only import only.** Manual Studio may copy selected canon facts/characters into manual records, but never sync automatically.

---

# **24. Proposed revised storage model**

Recommended layout:

worlds/<world>/manual-stories/<story>/

 manual-story.yaml

 current-context.yaml

 records/

   cast/mchar-1.yaml

   relationships/mrel-1.yaml

   clocks/mclock-1.yaml

   ...

 templates/

   mtemplate-1.yaml

 prompts/

   prompt-1.md

   prompt-1.yaml

 segments/

   seg-1.md

   seg-1.yaml

   seg-2.md

   seg-2.yaml

 manuscript.md

Key changes:

* Add `current-context.yaml`.  
* Move beat templates out of `records/beat-templates` into `templates/`, unless keeping all records together is more valuable. I prefer separate `templates/` because templates are prompt tools, not fictional state.  
* Use same-basename sidecars for prompts and segments.  
* Prefer lowercase `seg-1` and `prompt-1` for consistency.  
* Remove ordinary segment reorder/delete.  
* Keep `manuscript.md` as derived + persisted.  
* Treat `manual-story.yaml` as identity/contract/policy, not current-state selector.  
* Add no database unless scale forces it.

---

# **25. Proposed revised schemas, if needed**

The schema should become less CRUD-shaped and more prompt/review-shaped.

Common record fields:

id: mrel-1

kind: relationship

title: "Mara and Iven: brittle trust"

active: true

importance: high

current_relevance: active_now

prompt_visibility: auto_if_relevant

author_summary: >

 They trust each other tactically but not emotionally.

continuity_lock: >

 Do not portray easy warmth or settled forgiveness.

tags: [trust, resentment, debt]

refs:

 cast: [mchar-1, mchar-2]

evidence_segments: [seg-3]

last_reviewed_after_segment: seg-3

review_next_time: false

Add class-specific depth:

* **Belief:** holder, proposition, confidence, evidence, mistaken/true/contested, who else knows.  
* **Emotion:** holder, target, valence, intensity, trigger, bodily expression, suppression strategy, likely action bias.  
* **Relationship:** participants, axes with values, recent turn, rupture/repair state, public/private difference.  
* **Plan:** holder, goal, current step, resources, blockers, fallback, stakes, visibility.  
* **Clock:** pressure, value, threshold, direction, next visible symptom, who notices.  
* **Secret:** truth, holders, suspects, evidence, forbidden reveal tags, allowed hints, reveal policy.  
* **Question:** dramatic question, who cares, current evidence, allowed progress, must-not-answer-unless.  
* **Consequence:** caused_by, visible symptom, who pays, delayed cost, unresolved tail.  
* **Status/object/location:** physical continuity with “must not contradict” fields.

Do not over-normalize. These are hand-authored writer cards, not database tables.

---

# **26. Proposed revised prompt format and stop rule**

Recommended prompt outline:

# Write the next prose segment

Write prose only. Continue from the current handoff. Do not include notes, headings, analysis, alternatives, or bullet points.

## Story contract

...

## Current handoff

...

## Moment directive

...

## Required beats

...

## Cast rendering

...

## Continuity constraints

...

## Secrets and reveal limits

...

## Optional beat-template guidance

...

## Style contract

...

## Stop rule

Write only the beat cluster requested. Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it. Stop when the segment reaches the first new decision point, response point, interruption, irreversible beat, or changed immediate pressure that would require the author to choose what happens next. Do not summarize downstream aftermath. Do not continue into the next exchange merely to resolve tension. Do not declare durable machine-state conclusions unless the directive explicitly asks for that wording.

## Output

Prose only.

The important change is this sentence:

**“Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it.”**

That prevents the current accidental neutering.

Lint rules:

* Internal manual IDs: hard.  
* Engine IDs: hard.  
* Schema/validator/lifecycle/patch/MCP jargon: hard.  
* Record-class narrator voice: hard unless inside a hidden debug pane, never prompt.  
* Content-policy/craft contract byte mismatch: hard.  
* Missing selected record/cast/template: hard.  
* Empty directive: hard.  
* Overlong prompt: warning/soft.  
* Weak directive: soft.  
* Too many selected records: soft.  
* Recent segment unavailable: hard if policy requires it, soft if optional.

No “copy anyway” for leakage.

---

# **27. Proposed revised storylet/template model**

Beat template schema:

id: mtemplate-1

title: "Trust test under practical pressure"

active: true

move_family: confrontation

pressure_type: trust_test

turn_type: reluctant_concession

intensity: moderate

tone_fit: [tense, intimate, restrained]

role_slots:

 - name: pressure_holder

   required: true

 - name: person_being_tested

   required: true

relationship_axes: [trust, power]

requires_context:

 record_classes: [relationship, obligation]

 tags_any: [debt, distrust]

excludes:

 forbidden_reveal_tags: [core_secret]

preconditions_text: >

 Use when two characters need cooperation but neither wants to expose vulnerability.

beat_guidance:

 - One character needs something concrete.

 - The other can help, but the help costs pride, safety, or leverage.

 - Let the exchange alter immediate trust without resolving the whole relationship.

do_not_resolve:

 - Do not turn this into full reconciliation.

 - Do not reveal the hidden motive directly.

stop_after: >

 Stop after the first concession, refusal, or new demand changes the immediate pressure.

expected_state_review:

 - relationships

 - obligations

 - emotions

 - secrets

example_use: >

 A wounded ally asks for practical help from someone they recently betrayed.

author_notes: ""

cooldown_segments: 2

This is a **manual beat card**, not a branching storylet. It has no automatic effects. It offers a deterministic fit explanation and a post-prose review checklist.

---

# **28. Proposed revised validation model**

Validation should have three levels:

**Level 1 — File integrity**

* YAML parses.  
* Required files exist.  
* Sidecar/body pairs match.  
* IDs match filenames.  
* No duplicate IDs.  
* Segment and prompt sidecars match Markdown artifacts.  
* `manuscript.md` matches compile output or is marked stale.

**Level 2 — Schema integrity**

* Metadata valid.  
* Records valid.  
* Templates valid.  
* Prompt/segment sidecars valid.  
* Current context valid.

**Level 3 — Story reference integrity**

* Typed refs resolve.  
* Current context references active records.  
* Selected prompt records exist and are active.  
* Secrets/questions/reveal tags resolve.  
* Segment evidence refs resolve.  
* Template expected review classes are valid.  
* Cast order references existing active cast.

Route behavior:

* `200` only when requested data is valid.  
* `404` only for genuinely absent story/record.  
* `409` for story health blocked/corrupt.  
* `422` for invalid write input.  
* `500` only for unexpected server errors.

Frontend behavior:

* Health banner always visible.  
* Block prompt copy on health-blocking errors.  
* Allow record editing in “repair mode” if possible.  
* Never silently show empty lists when parse failed.

---

# **29. Proposed revised UX workflow**

The revised cockpit should be one loop:

1. **Open story**  
   * Health banner.  
   * Story contract status.  
   * Current location/cast/pressure glance.  
2. **Review current state**  
   * Active cast.  
   * Current context.  
   * Open clocks/secrets/questions/obligations/consequences.  
   * Last accepted prose excerpt.  
3. **Write directive**  
   * Free-form author directive.  
   * Optional structured metadata: pressure type, turn type, target relationship, desired length.  
4. **Choose beat template**  
   * Suggested templates with why.  
   * Excluded templates available in disclosure.  
   * Author chooses one or none.  
5. **Compose prompt**  
   * Hard lint.  
   * Prompt preview.  
   * Copy only if clean.  
   * Save prompt artifact.  
6. **External LLM**  
   * User manually pastes prompt outside app.  
   * User chooses output.  
7. **Paste accepted prose**  
   * Save as next accepted segment.  
   * Compile manuscript.  
   * Show state-review checklist.  
8. **Manual state update**  
   * Checklist opens relevant record forms.  
   * Quick create/update relationship, emotion, plan, clock, secret, consequence, etc.  
   * Mark review complete.  
9. **Next loop**  
   * Current context updates from manual edits only.

That is the cockpit. Everything else is secondary navigation.

---

# **30. Open questions and tradeoffs**

**Should segment IDs become lowercase?**  
 I would switch to `seg-1` and `prompt-1` for consistency, but uppercase is acceptable if hidden.

**Should templates live under `records/beat-templates` or `templates/`?**  
 I prefer `templates/` because they are authoring tools, not fictional facts. Keeping them under records is simpler but conceptually muddier.

**Should `manuscript.md` be committed or generated on demand?**  
 Both. Persist for convenience, validate as derived. Do not treat it as source of truth.

**Should world canon import exist now?**  
 Minimal version only: browse/copy selected world character/fact into a manual record with `source_world_ref`. No sync.

**Should records be append-only?**  
 No. Manual Studio is not the branching engine. It is a writer’s cockpit. Fail-fast validation matters more than append-only lifecycle ceremony. Preserve optional evidence links to segments.

**Should record classes be reduced?**  
 Not necessarily. Keep the classes if grouped well. The problem is not count alone; it is lack of current-context and poor manual ergonomics.

**Should prompt history be prominent?**  
 Useful, but secondary. The active loop matters more.

**Should soft lint exist at all?**  
 Yes, for quality warnings: prompt too long, weak directive, too many records, missing optional excerpt. Not for leakage.

---

# **31. Staged architecture-level implementation strategy, not tickets**

**Stage 1 — Integrity first**  
 Introduce story health loading. Replace silent read nulls/skips with structured health findings. Make dashboard health-aware. Block prompt copy/save when health is blocked.

**Stage 2 — Prompt safety**  
 Promote leakage lint to hard. Remove “copy anyway” for internal IDs, engine IDs, schema/validator/lifecycle/patch/MCP terms, and record-class narrator voice. Add acceptance tests proving these cannot be copied.

**Stage 3 — Prose/state contract repair**  
 Rewrite Manual Studio prose craft wording so the external LLM may render meaningful turns, while the app never infers state. Update stop rule and checklist language.

**Stage 4 — Segment lifecycle simplification**  
 Remove ordinary delete/reorder from the primary UX. Make accepted segments append-only by default. Keep repair/retire mode separate and scary. Validate segment/manuscript consistency.

**Stage 5 — Current-context layer**  
 Add `current-context.yaml` and use it as the prompt composer’s primary selector. Dashboard becomes current-state cockpit, not a records summary page.

**Stage 6 — Schema deepening where it pays off**  
 Deepen relationship, emotion, belief, plan, clock, secret, question, consequence, and current presentation overlays. Do not overbuild locations/facts/statuses beyond continuity usefulness.

**Stage 7 — Beat template revision**  
 Turn beat templates into author-facing pressure/turn cards with preconditions, do-not-resolve, stop-after, expected-state-review, examples, and better deterministic explanations.

**Stage 8 — UX consolidation**  
 Build the single fast loop: state glance → directive → template → prompt → paste → checklist → record updates. Add keyboard shortcuts and unsaved-change protection.

**Stage 9 — Acceptance test layer**  
 Add realistic fixtures and browser-like tests for the full writing loop, prompt safety, corrupt state, sandbox escapes, and manuscript compile integrity.

**Stage 10 — Optional world-canon import**  
 Add read-only browse/copy only after cockpit loop and integrity are solid. No sync, no MCP, no canon writes.

The final target is not “Manual Story Studio v1 with more features.” It is sharper than that: **a local-first, fail-fast, prompt-safe writer’s cockpit that helps the author maintain current fictional state and produce clean external prose prompts without becoming a second branching-story engine.**

