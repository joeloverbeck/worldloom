# **1. Executive summary and blunt verdict**

**Manual Story Studio is now pointed at the right product, but it is not yet the right product.** The latest pass moved it meaningfully away from the worst fourth-iteration failure modes: it now states the no-internal-LLM boundary clearly, saves accepted prose, routes directly to a post-segment workbench, tracks prompt inclusion/exclusion/suppression, hard-lints internal IDs and engine jargon, and treats `current-context` more like a Prompt Working Set than hidden state. Those are real wins.

But the app still smells too much like a **feature-category admin console** wrapped around a promising core loop. The main weakness is not backend correctness. The main weakness is that the author still has to jump across too many pages: Source Browser → Cast/Records → Prompt Working Set → Moment Composer → Prompt Preview → Paste Prose → Post-Segment Workbench → Records/Manuscript. The product target is a writing cockpit. The implementation is still a set of well-meaning panels.

The next product move should be **cockpit consolidation**, not more isolated features. Build a writing cockpit centered on three things: **Prompt Working Set**, **Writer Brief**, and **Current Story Records**. Keep separate deep pages, but make the cockpit the default loop surface.

The highest-priority product corrections are:

1. **Rename `current-context` to `prompt-working-set` across storage/API/UI now.** The current file is a selector/focus lens, not story state.  
2. **Stop source-derived creation for Belief/Location/Object in the primary Source Browser path.** Primary source promotions should be world character → story cast and canon fact/source text → story fact. Everything else should be manual or advanced literal-copy.  
3. **Remove post-segment seeded `summary = last paragraph` and `details = full segment body`.** That is record pollution and looks like fake prose extraction.  
4. **Render a writer-facing brief from the deterministic 15-section internal prompt assembly.** Keep the internal sections for traceability and linting, but the copied prompt should read like a strong brief to a fiction writer, not a contract appendix.  
5. **Enrich a small number of non-cast schemas immediately.** Cast is rich enough. Belief, Emotion, Plan, and Relationship are the urgent prompt-quality gaps; Secret/Question/Consequence/Clock come next.  
6. **Demote beat templates.** Keep deterministic suggestions as optional guidance, but stop giving them equal cockpit prominence.  
7. **Make selectors and record cards author-first with tiny technical IDs, not ID-first and not ID-hidden.**

The answer to the core question is: **Manual Story Studio should become a local-first, deterministic, split-pane continuity cockpit where the author maintains mutable current truth and produces an excellent writer-facing brief for an external LLM, with prompt transparency and health checks as support rails—not as the product center.**

# **2. Repository access note**

I used the uploaded mission prompt and uploaded manifest as governing inputs. The manifest was treated as inventory only, as requested.

I did **not** clone the repository and did **not** use GitHub code search or snippet-based repository search.

The Git connector behaved unexpectedly for repository/ref metadata. Installed-repository search found `joeloverbeck/worldloom` with default branch `main`, but the subsequent repo/ref/commit metadata operations either misrouted through `joeloverbeck/one-more-branch` or rejected the target commit. The connector could, however, fetch exact GitHub blob URLs under `joeloverbeck/worldloom` at the supplied ref `ed6e2ab8d2bc90484013f6757f5ef51c952273fb`; for example, exact blob fetches returned current Manual Story Studio files at that ref.

So I cannot honestly state that live `main` was verified to resolve to `ed6e2ab8d2bc90484013f6757f5ef51c952273fb`. I proceeded under the fallback instruction: state the connector limitation and inspect targeted files through exact GitHub blob URLs at the supplied SHA where possible.

# **3. Current implementation map after the latest pass**

The implementation now has a fairly complete vertical slice.

The package README defines Manual Story Studio as deterministic, local, no-LLM, no-MCP, and no-patch-engine. It explicitly says the external prose LLM is manually driven outside the app, and that world canon and normal story bundles are read-only.

The frontend routes are still organized as separate pages: Dashboard, Prompt Working Set, Cast, Records, Source Browser, Beat Templates, Moment Composer, Prompt Preview, Prompt History, Paste Prose, Manuscript, Edit Contract, and Repair. That route map reveals the core problem: the writing loop exists, but it is scattered across feature pages. The navigation reinforces the same category-first shape, with Beat Templates and Repair sitting alongside core loop surfaces.

The backend now includes the major pieces the workflow needs: records, current context, prompt composition, prompt writing, segment writing, manuscript compilation, health, world-source read-only browsing, beat-template filtering, and post-segment workbench. The manifest confirms those surfaces exist under `tools/manual-story-studio/src/` and the frontend under `tools/manual-story-studio/web/src/`.

The Prompt Working Set implementation is still named `current-context` in storage/API, but the schema now describes it correctly as an author-controlled selector over the manual story record corpus. Its fields include current location, current cast, POV holder, active clocks, active secrets/questions, pinned records, excluded records, must-not-reveal, handoff summary, and last accepted segment.

Prompt composition is deterministic. It takes a moment directive, included cast, included records, current context, content policy, prose craft contract, optional beat template, recent segment material, and emits a fixed sectioned prompt with a lint report, inclusion ledger, sidecar draft, and section map. The type layer now carries writer-identifying ledger metadata: title, summary, importance, prompt visibility, involved cast, tags, reasons, and sections.

The prompt sections are still the 15-section structure: content policy, story contract, current situation, moment directive, required beat cluster, optional template, cast/voice, emotional/relationship state, plans, beliefs/secrets/questions, physical continuity, forbidden inventions/reveals, style/prose craft, stop rule, and output instruction.

The prose save flow now saves accepted prose and navigates directly to the post-segment workbench. Segment writes create a segment sidecar, record prompt linkage where available, update manuscript segment order, and compile when configured.

The post-segment workbench now exists, shows accepted prose and segment metadata, reminds the author that Manual Studio did not infer record changes, and surfaces deterministic candidate records by scanning referrers around the segment and prompt-linked record/cast IDs.

Health checks now cover metadata, records, current context, segment bodies/sidecars, manuscript freshness, required prose docs, schema validation, and broken references, with dependency-scoped blocked actions for prompt copy/save and segment/manuscript operations.

# **4. What improved since the fourth-iteration audit**

The biggest improvements are real:

**The prose/state boundary is much clearer.** The stop rule now tells the external model not to declare durable continuity changes and explicitly says the author will update records manually after accepting or rejecting the segment.

**The prompt now has a better beat constraint.** The required beat cluster tells the external model to write only the next 3–5 meaningful beats, start from current circumstances, follow the moment directive, stop at the first materially new response point, and avoid downstream summary.

**Prompt lint is now serious.** Internal IDs and engine/schema vocabulary are hard blocked, and the lint module explicitly avoids disk, network, LLM, and external-process behavior. It hard-blocks a broad set of engine identifiers and schema-ish vocabulary, including story-engine prefixes and technical system terms.

**Prompt Confidence is closer to a real inspector.** The Prompt Preview page now includes hard lint findings, included/excluded/suppressed records, blocked inputs, section map, selected cast, selected template, and a “Why is this missing?” lookup.

**The direct post-segment transition is right.** After save, Paste Prose navigates straight to `/post-segment-workbench`, which is exactly the right loop closure.

**Delete lifecycle is closer to mutable-current-truth.** Record update writes in place, unreferenced delete hard-deletes, referenced delete blocks with referrers, and force delete is repair-mode-flavored with a repair log.

**Safety boundaries are strong.** The sandbox permits writes only under `worlds/<world>/manual-stories/<story>/`, rejects invalid slugs, checks real paths, rejects sandbox escape, and denies writes into world canon/source/index/story and adjacent tool directories.

# **5. What is still weak, wrong, overbuilt, underbuilt, or risky**

The app is strongest in backend integrity and weakest in writing-flow ergonomics.

The **weak** part is cockpit feel. The pages are well-named individually, but the combined app still makes the author operate a navigation bar rather than a writing instrument. Scrivener’s durable lesson is not “copy Scrivener”; it is that long-form writing tools succeed when manuscript, notes, research, outline, metadata, and compile are close at hand rather than separate administrative territories. Scrivener’s own product copy stresses integrated notes/research/writing, split views, project outline, corkboard/outliner, metadata, and compile/export in one writing environment.

The **wrong** part is post-segment default seeding from prose. The workbench currently initializes a new record with `summary` from the last paragraph and `details` from the full segment body. That is not deterministic record maintenance; it is a subtle fake extraction heuristic. It will pollute records with prose chunks the author then has to delete.

The **overbuilt** part is beat-template prominence and repair visibility. Beat Templates and Repair sit in the top story nav as peer features with Moment Composer, Manuscript, Records, and Prompt Working Set. That is too much prominence for optional/unproven scaffolding and rare repair.

The **underbuilt** part is non-cast prompt intelligence. Cast translation has rich fields, but Belief, Emotion, Plan, Relationship, Consequence, Clock, Secret, and Question translators often reduce to summary/details plus one or two typed fields. That is enough for a continuity reminder, not enough for an excellent external prose brief.

The **risky** part is terminology drift. UI says Prompt Working Set, but storage/API still say `current-context`; post-segment still says `touched_records`; Prompt Preview still leads with raw prompt and validator-ish sections. Those names matter because they train the author’s mental model.

# **6. Product identity audit: continuity cockpit and external-LLM prose brief generator**

The README states the correct identity: deterministic local writing cockpit, no internal LLM, no MCP, no patch-engine, external LLM manually driven, world canon read-only. That foundation is correct.

The product identity should now be sharpened:

**Manual Story Studio is a local continuity cockpit and writer-brief generator.** It helps the author decide what story truth matters now, creates a deterministic prose brief, saves accepted prose, and returns the author to current-record maintenance.

It should not be a writing app in the Ulysses/Scrivener sense. Ulysses succeeds by being a focused writing environment with project management, chunking, background material, markup-based editing, and export. Manual Studio should borrow “focused writing flow,” not become the prose editor. The prose editor is the external LLM plus the author’s outside review process.

It should not be an Obsidian clone either. Obsidian’s strength is local Markdown files, links, graph, plugins, and long-term user-owned notes. Manual Studio should borrow local-first transparency and linkable records, not become a general personal knowledge base.

It should not be a storylet runtime. Storylet systems organize content as playable pieces with prerequisites and effects on world state. Manual Studio’s records are not playable content, and accepted prose does not fire effects. The moment you import prerequisites/effects as the organizing metaphor, you have started rebuilding the branching engine.

# **7. Main loop audit from world source to post-segment record maintenance**

The intended loop is now technically possible, but not yet pleasing.

**World source → local story records:** The Source Browser can read world material, show details, copy text, and seed records. But it currently offers facts, beliefs, locations, objects, and cast as source-derived creation classes. That creates a bad first impression: the app appears to invite semantic interpretation of world source into multiple story-local classes. The user’s instinct is right: direct source-to-belief/location/object creation feels weird.

**Record maintenance:** Records can be created, edited, validated, referenced, deleted, and blocked on referrers. That backend is good. The frontend form is still too big and too generic for after-every-segment usage.

**Prompt Working Set:** The current context file is now conceptually right, and the UI heading says “Edit Prompt Working Set.” But because it lives on its own page and the route remains `/current-context/edit`, it still feels like configuration.

**Moment Composer:** It defaults included cast from current context and relevant records from pinned records, then generates a prompt from a moment directive, selected cast, selected records, and optional template. That is a workable composer, but it should live inside the cockpit as the main action surface.

**Prompt Confidence:** Much improved, but raw prompt preview still dominates. The author should first see confidence: included, excluded, suppressed, bloat warnings, missing expected records, protected reveals, and brief quality. The raw prompt should be a lower pane or tab.

**External LLM:** Correctly outside the app. Do not change this.

**Paste accepted prose:** Correctly saves and routes forward. But the textarea placeholder says “Paste or draft,” which blurs the product boundary. It should say “Paste accepted prose.”

**Post-segment workbench:** This is the right next surface, but its candidate naming and seeded defaults are wrong. It should feel like “Update current records after this accepted segment,” not “review touched records” and not “we guessed records from prose.”

# **8. Cockpit consolidation recommendation**

Build a **single default Writing Cockpit** for an open manual story. Keep deep pages for specialized editing, but stop making the user walk the route map for the main loop.

Recommended cockpit layout:

**Left rail: Prompt Working Set**  
 Shows current cast, POV, current location, active clocks, active secrets/questions, pinned records, excluded records, must-not-reveal, and handoff summary. Every item is a compact rich card with quick include/exclude/pin controls.

**Center: Next Writer Brief**  
 Contains moment directive, 3–5 beat target, optional tone/prose emphasis, relevant records picker, Generate Writer Brief, and the rendered writer-facing brief. Prompt Confidence is integrated here, not off to the side as a validator console.

**Right rail: Current Records**  
 Searchable cards grouped by “in working set,” “nearby records,” “recently changed,” and “source-derived facts/cast.” Selecting a card opens a detail drawer, not a route change.

**Bottom or secondary pane: Latest Segment / Manuscript**  
 Shows last accepted segment, current manuscript status, and a quick link to full manuscript reading.

After saving prose, the cockpit should enter **Post-Segment Mode**: latest accepted segment visible, prompt-linked records and deterministic referrers visible, quick-add/update/delete actions visible, no checklist debt, no inference.

This follows known productivity patterns: split-pane and side-by-side reference are valuable for writing and consistency checking; Scrivener explicitly emphasizes keeping research next to the work and viewing documents side by side. WAI-ARIA also supports richer selectors via editable comboboxes with listbox/grid popups, which fits record pickers that need title, class, summary, tags, cast, and status rather than plain text IDs.

# **9. Source browser and source-to-story creation audit**

Source Browser should be narrowed.

Current code makes facts, beliefs, locations, objects, and cast available as source-created record classes. It also seeds title/summary/details from selected source text or source title, tags the record as source-derived, and for cast records can attach `source_world_character`.

Recommended model:

**Primary source-derived creation**

* World character → story-local cast.  
* World canon fact / selected literal source text → story-local fact.

**Secondary/advanced creation**

* Location/Object/Artifact/Entity should be available only through “Create manual record using selected text as note,” not as a default source-derived class.  
* Belief should be removed from the primary source-derived flow. Beliefs are story-local mental states held by a story character. They should be authored manually, possibly with a copied source quote in notes.

**Literal-copy helpers**

* Copy selected source text.  
* Copy source citation/path.  
* “Start fact from selected text.”  
* “Start cast from world character.”

No automatic distillation. No provenance burden beyond useful deterministic links:

* cast may store `source_world_character`;  
* fact may store `source_paths` or a notes backlink;  
* everything else stays author-authored.

# **10. Source browser scale**

Scale is secondary, but there is one obvious problem: the current read layer recursively enumerates world root files, `_source`, characters, and diegetic artifacts, then reads raw text for each source item. The frontend then loads details for all listed source items and searches across raw text.

Do not build a sophisticated source browser yet. Do these high-value fixes only:

1. Lazy-load raw source detail when selected.  
2. Group by source kind and path folder.  
3. Provide “characters” and “canon facts/source files” first.  
4. Keep raw-text search, but show result snippets rather than forcing the author to scan full files.  
5. Add “copy selected text” and “create fact from selection” as primary actions.

The source browser should help the author pull material into mutable story-local records. It should not become a second world explorer.

# **11. Mutable current-truth lifecycle audit**

The backend lifecycle is mostly aligned with mutable current truth.

Records update in place. Create allocates a new manual ID, validate schema and references, then writes YAML safely. Update enforces URL/body ID consistency and overwrites the current record.

Delete behavior is right in principle:

* unreferenced record: hard delete;  
* referenced record: block and show referrers;  
* force delete: repair log and explicit force outcome.

The remaining product issue is vocabulary. `active` and `includeInactive` are acceptable if framed as “current / hidden from normal flow.” Avoid `archived`, `superseded`, `snapshot`, `state tick`, `append-only`, `review debt`, and anything that implies historical story state.

Recommended language:

* `active: true` → “Current”  
* `active: false` → “Hidden from normal writing flow”  
* `includeInactive` in API can remain internal, but UI should say “Show hidden records”  
* force delete → “Repair-only force delete”  
* referrers → “Still used by”  
* no “archive,” no “supersession,” no hidden history.

# **12. Record schema depth and translator-quality audit**

Cast is rich enough for now. Do not spend the next iteration enriching cast.

The urgent gap is non-cast records. The translator layer shows why: Belief renders holder, proposition/body, truth relation, confidence; Emotion renders holder, intensity, valence, and body; Plan renders holder, target, visibility, and body; Relationship renders parties, axes, dominant axis, and body.

For a strong prose brief, the external model needs not just “Mira believes X,” but what that belief does to action, perception, dialogue, and misreadings. Research on outline-guided story generation points the same direction: explicit planning improves coherence and on-topic generation, and more detailed outline control improves coherence, relevance, interestingness, and controllability.

Immediate schema enrichment priority:

**Belief**  
 Add proposition, holder, confidence, basis/evidence, behavioral effect, truth relation, who knows truth/falsehood. Beliefs drive misinterpretation and subtext.

**Emotion**  
 Add holder, target, trigger, valence, intensity, outward expression, masking behavior, impulse. Emotions drive beats, body language, dialogue pressure, and viewpoint prose.

**Plan**  
 Add holder, goal, current step, next action, blocker, resources, secrecy/visibility, failure condition. Plans make prose move.

**Relationship**  
 Add parties, current dynamic, dominant tension, recent change, live question, asymmetry/axis values. Relationships turn facts into scenes.

Next wave:

* Secret: reveal guard, clue state, suspected by, audience visibility.  
* Question: payoff guard, possible answer, must-not-resolve condition.  
* Consequence: cause, current effect, pending/realized, pressure.  
* Clock: axis, current value, threshold, direction, what ticks it, what happens at threshold.  
* Fact: story-local truth, scope, known by, hidden from, prompt relevance.

Do not deepen every class equally. Deepen fields that translate into prose movement.

# **13. External-LLM prose brief audit**

The copied prompt should become a **writer-facing brief**.

The current 15-section internal structure is useful for deterministic assembly and lintability. Keep it internally. But the copied prompt should not read like a machine contract. Current prompt engineering guidance across model providers favors clear structure, explicit role/instructions/context, constraints, and output expectations; Markdown headings are useful, but the purpose is clarity, not bureaucratic section count. OpenAI’s prompt guidance describes identity, instructions, examples, and context as common prompt sections, and notes Markdown/XML-style structure helps models distinguish content. Google’s current prompting guidance similarly emphasizes precise/direct instructions, consistent structure, explicit constraints, verbosity control, critical instruction placement, and long-context structure.

Recommended two-layer design:

**Internal layer**  
 Keep the 15 section emitters, inclusion ledger, section map, lint, blocked inputs, and traceability.

**Copied layer**  
 Render a natural brief:

* “You are writing the next short passage of a linear literary story.”  
* “Write only the next 3–5 meaningful beats.”  
* “Current situation.”  
* “The moment to write.”  
* “Characters and voices.”  
* “What matters now.”  
* “Live pressures: beliefs, emotions, plans, relationships, clocks.”  
* “Secrets/questions/reveals to protect.”  
* “Facts and physical continuity.”  
* “Style and prose expectations.”  
* “Forbidden inventions and overreach.”  
* “Stop rule.”

The external LLM needs enough current state to write from pressure, not enough schema to imitate your backend. Re3 and DOC both support the idea that long-form generation improves when each passage is generated with a structured plan and current story-state context, rather than from a vague continuation prompt.

# **14. Prompt Working Set / `current-context` rename recommendation**

Rename it now.

The schema comment already says this is an author-controlled selector over the manual story record corpus. The UI already uses “Edit Prompt Working Set” and “Save Prompt Working Set.” Keeping `current-context` in storage/API preserves the wrong conceptual smell.

Recommended naming:

* File: `prompt-working-set.yaml`  
* API: `/prompt-working-set`  
* Type: `PromptWorkingSet`  
* UI label: “Prompt Working Set”  
* Internal alias during transition only if necessary: `current-context` read fallback, but no compatibility burden means clean break is acceptable.

Field recommendations:

* `current_location`  
* `current_cast`  
* `pov_holder`  
* `active_pressure_clocks`  
* `active_secrets_questions`  
* `pinned_records`  
* `excluded_records`  
* `must_not_reveal`  
* `handoff_summary`  
* `last_accepted_segment`

Also consider adding:

* `default_beat_target: "3-5"`  
* `brief_style_note`  
* `recent_segment_policy`  
* `working_set_notes`

Do **not** call it “state.” Records are the state. This file is focus.

# **15. Prompt inclusion/exclusion model recommendation**

The Prompt Working Set should dominate normal inclusion. Per-record prompt visibility should be a secondary policy.

Recommended deterministic rules:

1. **Hidden/inactive records are excluded by default.**  
2. **`never_prompt` always excludes.** This is a hard privacy/quality policy.  
3. **`must_not_reveal` suppresses reveal content but can still contribute protection instructions.** It is not the same as `never_prompt`.  
4. **Prompt Working Set pins include records for this prompt.**  
5. **Working Set exclusions override pins and defaults.**  
6. **Active clocks and active secrets/questions are included or protected as appropriate.**  
7. **Moment Composer selected records are ad hoc pins for this generation.**  
8. **`always` means “include when the class or working set makes it eligible,” not “force into every prompt forever.”**  
9. **`include_when_relevant` should mostly be advisory until there is deterministic relevance logic.**  
10. **`only_if_pinned` should be visible on cards as a quiet policy, not front-and-center.**

The current type model already distinguishes included reasons, excluded reasons, and suppressed reasons. Good. The product should make those reasons author-legible.

Prevent prompt bloat with:

* a budget meter by class;  
* “too many records in brief” warning;  
* collapsed low-importance records;  
* conflict warning when excluded records are linked from included records;  
* “not in brief, still in story records” language.

# **16. Prompt Preview / Prompt Confidence audit**

Prompt Preview has improved, but it still leads with the wrong object. The raw prompt appears first, while confidence is an aside.

The author’s real question is: **“Did this prompt carry exactly the story truth I intended?”**

Make the page answer that first:

Top summary:

* Copy allowed / blocked.  
* Brief length.  
* Included record count by class.  
* Excluded record count.  
* Protected reveal count.  
* Missing expected records.  
* Possible bloat.  
* Recent segment included or not.  
* Hard lint status.

Then show:

* “Records shaping this brief”  
* “Records deliberately not shaping this brief”  
* “Protected secrets/questions”  
* “Why is this missing?” with fuzzy search over title, summary, class, tags, involved cast, and tiny ID.  
* “Brief preview”  
* “Internal section map” collapsed under technical details.

The current exact-title “Why is this missing?” lookup is useful but too brittle. It should search records, not exact-normalized title. The current fallback message says “not selected, pinned, or active in current context”; after rename it should say “not in the Prompt Working Set.”

# **17. Post-segment workbench audit**

This is the most important new surface, and it is half-right.

Right:

* It exists.  
* Save navigates there immediately.  
* It shows accepted prose.  
* It reminds the author that Manual Studio did not infer record changes.  
* It can edit/create/delete records and show referrer blocking.  
* It uses deterministic prompt/record/segment links.

Wrong:

* The payload calls candidates `touched_records`, and the UI says “Records that touch this segment.” That language is too close to inferred prose effects.  
* Candidate logic scans referrers around segment ID, included cast, and included records. This is deterministic, but the meaning is “records connected to this segment’s prompt/cast/records,” not “records touched by the segment.”  
* New records are seeded with last paragraph/full segment body. That is actively bad.  
* Included cast/records are displayed as raw IDs in the segment meta. That is not author-friendly.

Recommended rename:

* `touched_records` → `linked_record_candidates`  
* UI heading → “Records linked to the prompt or segment”  
* Reason line → “Linked through holder → Mira” or “Referenced by included record,” not raw `fields -> target_ids`.

Recommended new-record defaults:

* title empty;  
* summary empty;  
* details empty;  
* refs prefilled only if the author chooses “link to prompt cast/records”;  
* optional tag `segment:SEG-1`;  
* optional backlink field `noted_after_segment: SEG-1`;  
* explicit “Copy selected prose into notes” button, never automatic body seeding.

# **18. Checklist removal or replacement verdict**

Remove checklist UX if any remains. Do not preserve review debt.

After accepted prose, the author does not need a checklist. The author needs a workspace:

* latest accepted segment;  
* prompt-linked records;  
* quick add/edit/delete;  
* protected reveals;  
* changed-pressure shortcuts;  
* manuscript link.

Optional shortcuts are fine:

* “Update emotion”  
* “Update plan”  
* “Add consequence”  
* “Tick clock”  
* “Resolve question”  
* “Hide/deactivate stale record”

But those are affordances, not obligations. Manual Studio must not create fake debt from prose it did not understand.

# **19. Record identity, selectors, and ID visibility design**

Current RecordCard is already partway there: it shows title, ID, inactive status, class, prompt visibility, involved cast, summary, reason, and tags. That is a good foundation.

Recommended identity compromise:

**Always visible**

* title/name;  
* class badge;  
* one-line summary/proposition/current state;  
* involved cast chips;  
* tags;  
* prompt visibility chip;  
* active/hidden status;  
* reason line when in Prompt Confidence or post-segment workbench.

**Tiny technical visibility**

* small copyable ID chip, de-emphasized;  
* full technical refs only in details/repair mode;  
* no raw IDs in copied prompts.

Do not switch to human-readable slug IDs. They create rename headaches and false semantic guarantees. Keep stable opaque IDs, but make cards legible enough that authors rarely care.

Selectors should use rich options. WAI-ARIA’s combobox pattern explicitly supports popups as listbox or grid and notes grid popups are useful when suggestions include descriptive information. RecordPicker is already moving toward a combobox/listbox pattern, but it needs stronger keyboard/focus semantics, especially `aria-activedescendant` if DOM focus stays on the input.

# **20. Record editing UX proposal**

Current RecordForm is powerful but too form-shaped for frequent writing. It is fine as a detail editor, not as the default loop interaction.

Recommended editing model:

**Quick edit on cards**

* title;  
* summary/proposition;  
* active/hidden toggle;  
* prompt visibility;  
* tags;  
* involved cast;  
* class-specific “live” fields: emotion intensity, plan next step, clock value, question resolved/unresolved.

**Detail drawer**

* full typed fields;  
* refs;  
* notes;  
* details;  
* delete/referrer section;  
* repair-only force delete collapsed.

**Create flow**

* choose class from “What changed?” shortcuts;  
* minimal required fields;  
* class-specific starter fields;  
* no giant universal form until “More details.”

**Duplicate-from-existing**  
 Useful for creating a related plan, consequence, or relationship without retyping refs.

**Save/cancel**

* optimistic but explicit;  
* no route change on save;  
* unsaved changes warning only when real edits exist;  
* validation errors next to fields, not at top only.

Inline editing is not always superior. Use inline for one-line fields and toggles; use drawers for typed schemas.

# **21. Manuscript reading/compile audit**

The manuscript pipeline is basically right.

Segment save writes segment body/sidecar, updates `segment_order`, and compiles when `compile_on_segment_save` is enabled. Health checks manuscript freshness against segment sidecars/bodies.

Recommendations:

* Keep compile-on-save as the default.  
* Full manuscript page should be a pleasant reading view, not a repair console.  
* Manual compile should be secondary: useful when health says stale or after repair.  
* Segment title inclusion should be configurable per manuscript compile, not forced into prose reading if the author does not want it.  
* Add cockpit link: “Read story so far.”

Do not over-invest here before the cockpit/record-maintenance loop is good.

# **22. Segment repair audit**

Segment repair should be safe, hidden, and boring.

Current segment delete has three outcomes: hard delete, remove from segment order while preserving files, and force delete. The “segment_order_removed_files_preserved” behavior is safe, but as a product action it should not look like ordinary delete. It should be explicitly named:

* “Remove from manuscript order, preserve files”  
* “Repair replace latest segment”  
* “Force delete segment files”

Referenced segment deletion should block by default. Force delete should be under Repair only. Normal authors rarely delete accepted segments; repair must not dominate nav.

# **23. Beat-template deprioritization recommendation**

Beat templates are optional and unproven. They should not sit in the main nav as a core page equal to Records, Prompt Working Set, Moment Composer, and Manuscript.

Keep deterministic filtering, but make it advisory:

* “Optional beat guidance”  
* “Use this template”  
* “Hide templates for this story”  
* no global template library ambitions yet.

If refined, limit fields to prompt-useful craft:

* pressure type;  
* turn type;  
* beat guidance;  
* stop-after;  
* do-not-resolve;  
* anti-patterns;  
* forbidden inventions;  
* tone fit.

Do not import full storylet complexity. Storylets require prerequisites and effects on world state. Manual Studio explicitly must not fire effects.

# **24. Prose/state boundary audit**

This principle is now mostly preserved:

* external LLM writes prose;  
* author accepts/rejects outside app;  
* Manual Studio saves only accepted prose;  
* Manual Studio does not infer state from prose;  
* author manually updates records afterward.

The prompt stop rule is strong on this boundary. The post-segment reminder is strong.

Remaining leaks:

* “Paste or draft” placeholder in Paste Prose.  
* “touched_records” / “Records that touch this segment.”  
* seeded record summary/details from prose.  
* any checklist/review debt framing.

Fix those and the boundary becomes clean.

# **25. Validation and fail-fast health audit**

Health is good enough for now and should stay a support rail.

The health pass covers file reads, schema validation, references, current context, segment sidecars/bodies, manuscript freshness, content policy, and prose craft contract. It also maps blocking findings to dependency-scoped actions: prompt copy/save or segment/manuscript operations.

Do not turn health into the product center. The banner should be quiet when healthy, clear when blocking, and action-specific when degraded:

* “Prompt copy blocked because prose craft contract is missing.”  
* “Segment save blocked because segment sidecar is malformed.”  
* “Records have broken references; prompt allowed but confidence degraded.”

Schema/reference problems should be visible in Record detail and Prompt Confidence, not only Health.

# **26. Safety/write-boundary audit**

Safety looks strong.

Manual Story Studio write scope is restricted to manual story roots, while world canon, normal story bundles, source, characters, diegetic artifacts, index, and adjacent tools are denied. The sandbox validates slugs, resolves real paths, rejects traversal/symlink escape, and denies forbidden repo destinations and tool prefixes.

The product should keep this visible in the shell, but not overdo it. The current banner says write root, world canon read-only, normal story bundles read-only, external LLM not connected. That is good product trust language.

# **27. Story Explorer relationship audit**

Keep Story Explorer separate.

Manual Studio may borrow UI ideas from Story Explorer: x-ray cards, sticky rails, linked record peeks, compact/expanded record cards, grouped active records, readable record metadata. But it must not share write surfaces, mutate Story Explorer data, or import branch/state-tick concepts.

Story Explorer is a read-only explorer for existing story structures. Manual Studio is a writer-operated mutable-current-truth cockpit for linear fiction. The boundary should remain architectural and conceptual.

# **28. Research synthesis and how it changes the recommendation**

The research points to four strong conclusions.

**Local-first principles support Manual Studio’s current file-based, no-server-authority direction.** Local-first software emphasizes local data ownership, offline access, longevity, privacy, and user control; Obsidian similarly stores notes as local Markdown plain text in a vault and emphasizes private local files and long-term ownership. Manual Studio should stay deterministic and file-transparent.

**Writer tools succeed when reference material, structure, and writing flow are close together.** Scrivener integrates manuscript, notes, research, outline, metadata, split view, and compile/export. Ulysses emphasizes focused writing, project scale, scene/chapter management, background material, markup-based editing, and export. Manual Studio should not become either app, but it should adopt their “everything relevant is within reach” cockpit principle.

**LLM story generation research favors explicit plans, current state, and controllable context.** Plan-and-Write found explicit storyline planning improved diversity, coherence, and topicality; Re3 injects plan and current story state for each passage; DOC’s detailed outline control improved plot coherence, outline relevance, interestingness, and controllability; knowledge-graph-assisted storytelling research suggests structured story state can improve quality and user control. That supports Prompt Working Set + writer brief, not vague continuation prompts.

**Human-LLM co-writing research supports human control and careful scaffolding.** CoAuthor frames LLM writing ability as context-dependent and interaction-shaped; scaffolding studies show heavier suggestions can improve productivity/quality but may reduce ownership/satisfaction. Manual Studio’s no-internal-LLM boundary and external-prompt sidecar model are therefore product strengths, not limitations.

# **29. Proposed revised architecture/product shape**

Architecture-level shape:

**Core**

* Manual story root with mutable records, prompt working set, prompts, prompt-runs, segments, manuscript, repair log.  
* Deterministic prompt composer.  
* Deterministic prompt lint.  
* Deterministic world source browser.  
* Deterministic health.

**Frontend**

* Writing Cockpit as default story route.  
* Deep pages: Records, Source Browser, Manuscript, Prompt History, Repair, Contract, Beat Templates.  
* Post-Segment Mode inside Cockpit or as a cockpit sub-route, not a disconnected page.

**Prompt pipeline**

* Internal deterministic section assembly.  
* Internal lint and ledger.  
* Writer-facing brief renderer.  
* Prompt Confidence inspector.

**Record UX**

* Rich cards.  
* Searchable selectors.  
* Quick edit.  
* Detail drawer.  
* Repair drawer.

This architecture keeps the system deterministic while making the product feel like a cockpit.

# **30. Proposed revised storage/API naming**

Rename now:

* `current-context.yaml` → `prompt-working-set.yaml`  
* `src/schema/current-context.ts` → `prompt-working-set.ts`  
* `/current-context` routes → `/prompt-working-set`  
* `fetchCurrentContext` → `fetchPromptWorkingSet`  
* `saveCurrentContext` → `savePromptWorkingSet`  
* `CurrentContext` type → `PromptWorkingSet`

Keep the field semantics mostly intact, but rename:

* `current_handoff_summary` → `handoff_summary`  
* maybe `active_secrets_questions` → `active_reveal_controls`  
* keep `must_not_reveal` because it is clear and author-facing.

Because there is no compatibility burden, do not preserve old names longer than one migration/read fallback pass.

# **31. Proposed revised record schema direction**

Do not create a huge schema playground. Add fields only where they improve prompt translation and manual maintenance.

Immediate:

* Belief: proposition, basis, behavioral effect.  
* Emotion: target, trigger, outward expression, masking, impulse.  
* Plan: goal, current step, next action, blocker, failure condition.  
* Relationship: current dynamic, dominant tension, recent change, live question.

Next:

* Secret: clue state, reveal guard, suspected by.  
* Question: payoff guard, possible answer, must-not-resolve.  
* Consequence: current effect, pressure, affected records.  
* Clock: threshold, what ticks it, what happens at threshold.  
* Fact: scope, known_by, hidden_from.

Each new field must have:

* one-line UI help;  
* optional default;  
* translator support;  
* Prompt Confidence display;  
* no requirement unless essential.

# **32. Proposed revised prompt brief structure**

Keep internal 15 sections. Render copied brief like this:

**Brief for the next passage**

**Task**  
 Write the next 3–5 meaningful beats of the story as continuous prose. Start from the current situation. Stop when the situation reaches a new decision point, interruption, emotional turn, practical consequence, or changed pressure.

**Current situation**  
 Handoff summary, current location, recent segment continuity.

**Moment to write**  
 Author’s moment directive.

**Characters in the passage**  
 Cast, voices, current pressures, POV.

**Live story pressures**  
 Beliefs, emotions, plans, relationships, clocks, consequences.

**Facts that matter now**  
 Story-local facts and physical continuity.

**Protected secrets and open questions**  
 What must not be revealed, what may be hinted, what must not resolve.

**Style and prose**  
 Tone, prose craft, sensory density, dialogue expectations.

**Do not**  
 No internal IDs, no schema terms, no future summary, no invented reveals, no durable state declarations, no choices/headings/commentary.

**Output**  
 Prose only.

This is still lintable because it is rendered from the same deterministic section material.

# **33. Proposed revised Prompt Working Set model**

Prompt Working Set should be the cockpit’s left rail and the default inclusion source.

It should show:

* current cast;  
* POV;  
* current location;  
* active clocks;  
* active secrets/questions;  
* pinned records;  
* excluded records;  
* must-not-reveal;  
* handoff summary;  
* last accepted segment;  
* recent changed records.

Controls:

* pin/unpin;  
* exclude/include;  
* protect reveal;  
* quick add;  
* open drawer;  
* generate brief.

It should also include a “Brief readiness” indicator:

* no cast selected;  
* no POV set;  
* no active pressure;  
* too many records;  
* protected secret not in must-not-reveal;  
* current handoff empty;  
* recent segment missing.

# **34. Proposed revised source-browsing model**

Source Browser should become **World Source → Story Seeds**, not a general record generator.

Primary tabs:

* Characters  
* Canon facts/source text  
* Search all source

Primary actions:

* Create story cast from character.  
* Create story fact from selected text.  
* Copy selected text.  
* Copy source path.

Advanced actions:

* Start manual record with copied source note.  
* Link source path to existing record.

Remove Belief from the source-derived primary set. Move Location/Object to advanced or manual creation. A location can be story-local and manually relevant, but the user is right: direct source-to-location creation does not have the same obvious correlation as canon fact → story fact or world character → story cast.

# **35. Proposed revised post-segment record workbench**

Post-segment workbench should be a **record maintenance cockpit**, not a review checklist.

Layout:

**Left: Accepted segment**

* title;  
* prose;  
* prompt brief link;  
* moment directive;  
* included cast/records as cards, not IDs;  
* selected prose copy tool.

**Middle: Records to consider**

* prompt-linked records;  
* deterministic referrers;  
* recently edited records;  
* active clocks/questions/secrets;  
* records with protected reveals.

**Right: Edit drawer**

* quick edit existing record;  
* add consequence;  
* update emotion;  
* tick clock;  
* update plan;  
* resolve/keep question;  
* hide stale record;  
* delete with referrer cards.

No automatic record content from prose. Optional “copy selected prose into notes” only.

Rename:

* “Records that touch this segment” → “Records linked to this segment’s prompt”  
* “candidate” → “linked record”  
* `touched_records` → `linked_record_candidates`

# **36. Proposed revised selector/card/detail editing model**

Cards should be the universal identity surface:

* title;  
* class;  
* summary/proposition;  
* involved cast;  
* active/hidden;  
* prompt policy;  
* tags;  
* reason;  
* tiny ID.

Selectors should support:

* multi-class filtering;  
* fuzzy title/summary/tag/cast search;  
* keyboard navigation;  
* group headings;  
* selected chips with class/title;  
* no typed IDs in normal flow.

For accessibility, use APG-compliant combobox/listbox/grid semantics: input with combobox role, controlled popup, `aria-expanded`, `aria-controls`, and `aria-activedescendant` when focus remains on input; grid popup is justified if each option has multiple descriptive fields.

Detail editing should be drawer-based:

* quick fields first;  
* advanced fields collapsed;  
* refs section;  
* prompt policy section;  
* delete/repair section last.

# **37. Proposed acceptance-test strategy**

The Glass Orchard acceptance test is valuable, but it mostly proves backend happy path plus HTTP existence. It creates records, writes prompt working set, composes prompt, saves prompt, saves segment, hits post-segment workbench, updates records, deletes records, force-deletes, compiles manuscript, and checks prompt no internal IDs. That is good but insufficient.

Next acceptance priority should be a browser-like workflow:

1. Create manual story from synthetic world.  
2. Browse source.  
3. Create cast from world character.  
4. Create fact from selected source text.  
5. Manually create belief/emotion/plan/relationship/clock/secret/question/consequence.  
6. Use record selectors, not typed IDs.  
7. Set Prompt Working Set.  
8. Exclude a true future/hidden record.  
9. Generate writer-facing brief.  
10. Assert copied brief has no internal IDs and reads as prose-writer instructions, not a schema contract.  
11. Inspect Prompt Confidence included/excluded/suppressed records.  
12. Save prompt.  
13. Paste accepted prose.  
14. Land in post-segment workbench.  
15. Confirm no polluted summary/details from prose.  
16. Add/edit/delete records.  
17. Confirm blocked deletion shows referrer cards.  
18. Confirm repair-only force delete is hidden/collapsed.  
19. Confirm health banner blocks only dependent actions for corrupted state.

Keep isolated unit tests for lint, translators, refs, health, and write guards. But the product needs end-to-end UX tests now.

# **38. Open questions, tradeoffs, and staged architecture-level strategy**

Open questions:

* How much of the writer-facing brief should be customizable per story?  
* Should Prompt Working Set have named presets later, or is that too close to branching/state variants?  
* Should facts have `known_by`/`hidden_from`, or should that live in beliefs/secrets/questions?  
* Should post-segment mode live as a separate route or as a cockpit state?  
* How aggressively should Prompt Confidence warn about prompt bloat?  
* Should `always` be renamed to avoid implying universal inclusion?

Tradeoffs:

* A unified cockpit risks becoming crowded; solve with split panes and drawers, not a mega-form.  
* Richer schemas improve prompt quality but can slow manual maintenance; solve with optional fields and quick-edit summaries.  
* Writer-facing prompts reduce machine-contract ugliness but can obscure traceability; solve with internal 15-section assembly plus inspector.  
* Hiding IDs improves author flow but hurts debugging; solve with tiny copyable ID chips and repair-mode raw refs.  
* Source Browser provenance can become bureaucracy; solve with lightweight source path links only where useful.

Staged architecture-level strategy:

**Stage 1: Rename and mental-model cleanup**  
 Rename `current-context` to Prompt Working Set. Rename post-segment `touched_records`. Remove prose-seeded defaults. Adjust Paste Prose wording. Move Repair and Beat Templates out of primary nav.

**Stage 2: Cockpit shell**  
 Create the Writing Cockpit route with Prompt Working Set rail, Moment/Brief center, Current Records rail, and Latest Segment/Manuscript access. Keep old pages as deep links.

**Stage 3: Writer-facing brief renderer**  
 Keep the 15-section internal pipeline. Add a writer-brief renderer and make copied prompt use it. Prompt Confidence shows both rendered brief and internal trace.

**Stage 4: Record UX**  
 Add card quick edits, detail drawer, richer selector, better identity chips, and no typed IDs in normal flow.

**Stage 5: Non-cast schema enrichment**  
 Add prompt-useful fields to Belief, Emotion, Plan, Relationship first. Update translators and forms. Then Secret/Question/Consequence/Clock.

**Stage 6: Source Browser narrowing**  
 Primary creation becomes Cast + Fact. Advanced literal-copy helpers remain. Lazy-load raw source details.

**Stage 7: Acceptance coverage**  
 Add browser-like full-loop tests around the cockpit and writer brief. Keep backend capstone, but stop treating it as proof of usability.

Final blunt answer: **Manual Story Studio should become a cockpit before it becomes broader. The backend is good enough to support a real product loop; the frontend/product shape is not yet good enough for one real linear story. The next iteration should be ruthless about names, loop consolidation, prompt quality, and post-segment record maintenance.**

