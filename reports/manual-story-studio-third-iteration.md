## **1. Executive summary and blunt verdict**

Manual Story Studio is now **pointed in the right direction technically**, but it is **not yet shaped like a tool a writer will happily use every segment**.

The good news: the second pass fixed major architectural sins. The package declares the right boundary: deterministic local writing cockpit, external Markdown prompts, pasted prose, no LLM, no MCP, no patch engine. The package dependencies match that claim: Fastify/static/YAML-level tooling, not model APIs, SQLite, MCP, or patch-engine coupling.

The bad news: the product is still too much **record CRUD plus validator cockpit**, and not enough **fast continuity/prompt sidecar**. The backend is safer and more deterministic than before. The UI and data model still make the author type internal IDs, review category counts instead of actionable record cards, and think in “Current State / Current Context” terms that risk becoming a second state layer. The biggest next move is not more schema. It is **workflow compression**: source browsing + record workbench + prompt working set + prompt preview explanation + accepted-segment-adjacent manual record update.

Bluntly: **do not build more engine. Build less friction.**

## **2. Repository access note**

I treated the uploaded mission prompt as controlling and the uploaded manifest as the file inventory for commit e22ccd4f26ea9402beb1ec1cdccf37914381ac45.

Connector limitation: the GitHub connector could discover joeloverbeck/worldloom, but metadata/branch calls behaved inconsistently and appeared to route through joeloverbeck/one-more-branch in some responses. I therefore did **not** silently claim that current main was verified. I used the prompt’s fallback path: exact GitHub blob URL fetches at e22ccd4f26ea9402beb1ec1cdccf37914381ac45 for targeted files. The repository discovery call did identify joeloverbeck/worldloom with default branch main, but the inconsistent metadata behavior means the live-main SHA remains unverified in this audit.

I did not clone the repository, did not modify files, and did not use GitHub code search or snippet search for repository analysis.

## **3. Current implementation map after the second implementation pass**

Manual Story Studio currently has these major surfaces:

**Package / boundary.** tools/manual-story-studio is a local Fastify + React/Vite app. Its package description says the intended surface is deterministic local writing, manual records, external Markdown prompt generation, pasted prose, and no LLM/MCP/patch engine.

**Write sandbox.** Writes resolve only under worlds/<world>/manual-stories/<story>, with slug validation, symlink/realpath checks, denial of world canon/story/tool destinations, and safe relative file writes.

**Records.** The schema has a broad record corpus: cast, entities, statuses, locations, objects, facts, beliefs, intentions, plans, emotions, relationships, threads, obligations, consequences, clocks, secrets, questions, artifacts, and beat templates. Common fields include current activity, importance, tags, refs, prompt visibility, review markers, and notes. The current shape is broad enough, but many non-cast records are still shallow.

**Current context.** current-context.yaml is an author-controlled selector with current location, current cast, POV holder, active pressure clocks, active secrets/questions, pinned records, must-not-reveal records, handoff summary, last accepted segment, and last reviewed segment.

**Prompt composer.** Composition is deterministic, reads metadata/current context/selected records/content policy/prose craft contract, merges current-context pins into selected records, emits 15 prompt sections, and hard-lints the result before copy/save.

**Prompt lint.** Prompt lint is now hard-tier for missing directive, content-policy mismatch, unresolved cast/records, internal IDs, engine jargon, schema/validator terms, record-class narrator voice, and required recent segment absence. It explicitly has no disk I/O, LLM, or network.

**Health.** Health now has file, schema, and reference passes; it reads metadata, records, segment bodies/sidecars, manuscript, current context, validates records/current context/refs, and blocks prompt copy/save, segment save, and manuscript compile only when status is blocked.

**Segments/manuscript.** Segment save appends accepted prose and compiles manuscript from segment_order; manuscript compilation reads each segment body/sidecar in order and writes manuscript.md.

**Website.** The React app now has dashboard, current-state panel, record pages/forms/cards, prompt preview, paste prose, repair segments, manuscript, beat templates, health banner, and state update checklist. It is route-complete, but not yet cockpit-complete.

**CI.** scripts/check-all.sh now includes manual-story-studio in the local all-package build/test chain and runs build/test fail-fast.

## **4. What improved since the previous audit**

The second pass landed real fixes:

The package boundary is much stronger. The README now states the tool is no-LLM, no-MCP, no-patch-engine, outside the branching-story pipeline, and must not write world canon or normal story bundles.

The write sandbox is much more credible. It validates slugs, resolves paths, blocks sandbox escapes, denies canonical world/story/tool surfaces, and routes writes through safeWriteFile.

Read failure behavior improved. Record listing no longer silently skips malformed YAML; it returns structured errors for YAML parse failure and invalid summary shape. Record reads likewise return structured file-not-found/YAML/shape errors.

Current-context validation exists and checks current location, current cast, POV holder, active clocks, active secrets/questions, pinned records, must-not-reveal, segment IDs, and the rule that POV must be in current cast.

Prompt leakage hardening is materially better. Hard lint catches internal Manual Studio IDs, engine IDs, schema terms, and record-class narration.

The deterministic post-prose checklist does **not** infer from prose. It says records were not changed and only counts existing review categories and involved-cast references.

## **5. What is still weak, wrong, overbuilt, underbuilt, or risky**

The main weakness is **ergonomics, not backend determinism**.

The app still shows IDs in normal writer UI. RecordCard prints summary.id; CurrentStatePanel chips display raw IDs; the current-context editor asks for comma/newline-separated IDs with allowed prefixes.

Deletion behavior is wrong for the clarified product. The records page exposes normal Delete, then archives referenced records as active:false, then offers Force delete anyway. That is exactly the soft-delete/default-archive pattern the clarified brief rejects for normal flow.

Prompt Preview is still mostly a pre block plus lint badge and toolbar. It does not show included records, excluded records, why included/excluded, working-set resolution, section-to-record mapping, or hidden records.

World browsing is badly underbuilt. The world read layer only enumerates worlds with WORLD_KERNEL.md; it does not expose canon/source records, characters, artifacts, or searchable literal source browsing. The Worlds page only lists world slugs.

The post-segment checklist is honest but weak. It opens record categories filtered by involved cast and lets the author mark the current context reviewed; it does not put the accepted segment beside the relevant record cards or offer quick manual add/edit flows.

## **6. Product identity audit: mutable current-state sidecar vs story engine**

The backend identity is now mostly right. The package README explicitly says Manual Studio is local, deterministic, no-LLM, no-MCP, no-patch-engine, and outside the branching story pipeline.

The product identity is still fuzzy in the UI. Labels like **Current State** and **Current Context** imply a second state layer. The clarified product goal says the records are the state. So current-context.yaml should be renamed and reframed as **Prompt Working Set** or **Current Writing Focus**.

The tool should not ask “what is the current state?” It should ask:

**“What do you want the next prompt to know about?”**

That one sentence should drive the next iteration.

## **7. Foundations alignment audit**

Worldloom foundations distinguish world canon from story-local execution state. Foundations explicitly say world canon can describe generative pressures and affordances, but must not encode downstream story-bundle execution state such as page IDs, choice IDs, storylet IDs, plot destiny, companion quests, story-local clocks, or story-local state transitions.

Manual Story Studio aligns with this when it writes only under manual-stories/ and treats world canon as read-only. It drifts when it imports too much branching-engine vocabulary and lifecycle thinking: archive/force delete, engine-grade class spread, state review markers, and template filtering that resembles storylet selection.

The product should stay story-local and linear: mutable current records, accepted prose, deterministic prompt output.

## **8. Architecture/package-boundary audit**

The package boundary is strong. Keep it.

Do **not** add MCP. Do **not** add patch-engine. Do **not** add SQLite/world-index as runtime dependency. The package dependency list supports this lightweight design today.

Direct filesystem reads/writes are sufficient for the next stage because the tool needs local source browsing, local YAML validation, Markdown prompt composition, and manuscript compilation. Adding MCP or patch-engine would increase latency, failure modes, stale-index risk, and mental overhead without solving the core weakness: record maintenance speed.

## **9. Storage layout audit**

The storage direction is mostly right:

worlds/<world>/manual-stories/<manual-story>/  
 contains metadata, records, prompts, segments, current-context, and manuscript. The write sandbox enforces this locality.

What should change:

Rename current-context.yaml to prompt-working-set.yaml or migrate with read compatibility.

Keep lowercase numeric IDs internally.

Keep accepted segments in ordered Markdown files.

Keep prompt runs as saved artifacts.

Add no global state database.

Add no provenance pointers by default.

## **10. Mutable current-truth record lifecycle audit**

The clarified model says records are mutable current truth. The current implementation still has lifecycle residue:

active, retired_reason, includeArchived, inactive_default, and force_deleted are behaving like archive/supersession-lite. This is wrong for normal writer flow.

Revised lifecycle:

Create record.

Edit record in place.

Mark active/inactive only if “temporarily not in current story truth/relevance” is genuinely useful.

Hard-delete if no referrers.

Block delete if referenced. Show the referrers with titles, classes, summaries, and edit links.

Force-delete only in repair mode.

No supersession chains.

No historical state artifacts unless the author explicitly writes notes.

## **11. Record schema and record maintenance audit**

The cast schema is rich enough and probably too large for quick creation, but defensible for character voice/profile depth. The cast translator turns identity, pressure core, body/presence, voice, pressure behavior, perception, agency, relationships, and prose constraints into novelist-facing sections.

Most non-cast records are too shallow to support continuity work without overusing summary and details. The belief translator, for example, can express holder + body + truth relation, but not evidence, behavioral consequence, who knows the belief is wrong, or when it should matter. Plans have holder/target/visibility but not current step, blocker, next action, or failure condition.

The next schema work should be minimal and author-facing:

Belief: holder, proposition, truth relation, confidence, basis, behavioral effect.

Emotion: holder, toward, valence, intensity, trigger, outward expression.

Plan: holder, goal, current step, blocker, secrecy, next pressure.

Relationship: parties, current dynamic, tension, recent change, live question.

Consequence: cause, current effect, pending/realized, pressure.

Clock: axis, value, threshold, what happens at threshold, direction.

Secret: what, held by, suspected by, audience visibility, reveal guard.

Question: current question, possible answer, answer known to author, do-not-resolve guard.

Fact: current story truth, scope, known by, hidden from, prompt relevance.

Keep required fields extremely small: title, summary/proposition, active, prompt inclusion, primary refs.

## **12. Record-linking and selector UX audit**

The current UI still requires typing IDs in normal flows. That must stop.

Reference selectors should be first-class, not sugar. W3C’s combobox pattern is directly relevant: it supports editable search, suggestion popups, allowed-value selection, keyboard behavior, and descriptive grid/tree popups when options need richer metadata.

Design the selector around a record card:

Title.

Class.

One-line summary.

Active/inactive.

Tags.

Involved cast.

Current prompt status.

Working-set status.

Referenced-by count.

Last reviewed segment.

For non-character records, the selector must be class-filterable and searchable. “Pick a consequence” should be as good as “pick a character.” IDs belong in technical disclosure only.

## **13. Prompt Working Set / Current Writing Focus audit**

current-context.yaml is conceptually close but named wrong. It is not state. It is a **selection lens** over the state.

Keep these fields:

current location.

current cast.

POV holder.

active pressure clocks.

active secrets/questions.

pinned records.

must-not-reveal.

current handoff summary.

last accepted segment.

Change these:

Rename current-context to prompt-working-set.

Rename “Current State” UI to “Prompt Working Set” or “Current Writing Focus.”

Add explicit excluded records.

Remove or demote last_reviewed_after_segment; if retained, it belongs to workflow status, not prompt focus.

Make every field selectable via record picker, never typed ID.

## **14. Prompt inclusion/exclusion audit**

Current prompt_visibility has always, include_when_relevant, and only_if_pinned. That lacks a clean explicit exclude and lacks explainability.

Revised model:

Per-record prompt_mode:

default: include when active and relevant.

always: include unless explicitly excluded.

pinned_next: include in next prompt / working set.

excluded: keep record but do not include now.

never_prompt: author note/private scaffolding.

Working-set overrides:

Pinned records include.

Excluded records suppress.

Must-not-reveal suppresses revealable content and may include only a safety warning.

Prompt composition should return an inclusion ledger:

Included: record, reason, prompt section.

Excluded: record, reason.

Blocked: unresolved/malformed/safety.

This is the missing backbone of Prompt Preview.

## **15. World canon/source browsing audit**

This is the largest underbuilt area.

The current world surface lists worlds only. It does not let the author browse _source/canon, characters, diegetic artifacts, sections, mystery reserve, open questions, or root files.

Build deterministic source browsing:

Left pane: world source browser.

Right pane: story-local record workbench.

Search literal text, title, tags, class, filename.

Open records as read-only.

Copy selected literal text into a story record field.

Copy simple fields like title/name.

No semantic extraction.

No automatic transformation.

No required provenance pointer.

This is where Manual Studio replaces the branching skills’ automatic distillation: not by simulating it, but by making manual reading and record creation fast.

## **16. Character/profile model audit**

The cast/profile model is promising. It is one of the few places where the schema is rich enough to materially improve prose.

But the current form is too heavy for quick entry. Cast creation should have two modes:

Quick cast: display name, role, one-line identity, voice note, current pressure.

Full profile: pressure core, body/presence, voice, behavior under pressure, perception, agency, relationship behavior, prose constraints.

A source-world-character pointer can stay optional/informational. Do not force provenance. The validator already skips source_world_character as informational.

## **17. Beat-template/global-library audit**

Beat templates are currently sophisticated. Maybe too sophisticated.

The schema includes move family, pressure type, turn type, tone fit, relationship axes, role slots, requires/excludes, expected state review, stop-after, beat guidance, forbidden inventions, and author notes.

Keep beat templates optional. They should be **prompt-shaping cards**, not a storylet engine.

Recommended model:

Global read-only template library.

Copy template into story before editing.

Story-local templates can be modified.

No live dependency on mutable global templates after copy.

Template fields that matter now: pressure type, turn type, beat guidance, do-not-resolve, stop-after, anti-patterns, tone fit, forbidden inventions.

Fields to demote until proven: dense requires/excludes, expected state review, relationship-axis matching.

## **18. Deterministic filtering audit**

The deterministic filter is good engineering but risks overcentrality. It has a nine-stage deterministic pipeline with active filtering, intensity compatibility, role-slot satisfiability, required classes/tags, location/tone compatibility, forbidden-secret compatibility, recent-use advisory, sort, and why-suggested output.

Keep it, but do not make it the main user path. The main path is author selects what they want. The filter should be a helper that says, “These templates fit your selected cast/current focus,” not “the engine has chosen candidate storylets.”

Storylet research supports this caution. Storylet systems are powerful for responsive interactive narratives, especially when combined with LLM-based triggers, but Manual Studio is explicitly not an interactive narrative runtime and must not run an internal LLM.

## **19. Prompt composer and Prompt Preview explainability audit**

Prompt composition is deterministic and now uses current context as a seed. That is good. But it does not yet produce the author-facing resolution ledger.

Section 3 currently filters included records down to central/high or cast-referencing records and calls them “Pinned situation context.” That is not enough. It hides the inclusion decision process.

Prompt Preview should show:

Markdown prompt.

Hard lint status.

Selected template.

Working set used.

Included records grouped by prompt section.

Excluded records grouped by reason.

Records hidden because inactive.

Records hidden because excluded.

Records hidden because only_if_pinned and not pinned.

Records included because current cast/location/clock/secret/question.

Records included because manually pinned.

Records suppressed due to must-not-reveal.

A prompt-section map: “§8 was generated from these emotions/relationships.”

This is confidence UX, not a validator console.

## **20. Prose/state boundary audit**

This boundary is now mostly right.

The prompt composer asks an external LLM to write prose. The app saves only accepted prose. The deterministic checklist explicitly tells the author that Manual Studio has not changed records.

Keep this hard line:

No automatic prose parsing.

No suggested state changes from prose.

No hidden extraction.

No internal LLM.

No OpenRouter/local model.

The accepted prose is manuscript evidence and authorial material. It is not machine state.

## **21. Segment/manuscript pipeline audit**

The manuscript pipeline is straightforward and good: compile reads segment_order, renders each segment in order, and writes manuscript.md.

Normal segment workflow should be append-only:

Paste accepted prose.

Save segment.

Compile manuscript.

Show accepted segment beside record workbench.

No casual edit/delete/reorder.

Repair mode may exist, but it should be clearly exceptional. The current repair/delete model should be tightened: if a segment is referenced by consequences, deletion should block, not remove from segment_order while preserving files.

Segment IDs can remain SEG-* for now. Hide them in UI. Migrating to lowercase manual IDs is not worth the churn yet.

## **22. Validation and fail-fast health audit**

Health is much better than before. It now checks metadata, records, segment bodies, segment sidecars, manuscript, current context, schema, and references.

Remaining health improvements:

Validate prompt sidecars and prompt Markdown existence.

Validate content-policy and prose-craft contract presence before prompt routes.

Validate manuscript freshness against segment order or make manuscript purely derived and regenerable.

Validate current working set shape at read time, not only health/write time.

Block prompt compose when current focus contains broken refs.

Do not block all actions for every error; block only actions that depend on the broken surface.

Health status should not become the main UI. It should be a banner plus actionable repair links.

## **23. Test/CI/acceptance audit**

CI inclusion improved: check-all.sh runs manual-story-studio build/test.

The manifest shows many unit/capstone tests under tools/manual-story-studio/test/, including prompt translators, routes, health, current context, records, segments, templates, lint, and web hooks.

The missing test layer is **one real story acceptance**:

Create manual story.

Browse world source material.

Create cast/facts/beliefs/emotions/plans/clocks/secrets/questions.

Link records through selectors.

Set Prompt Working Set.

Compose prompt.

Inspect inclusion/exclusion explanation.

Save/copy prompt.

Paste accepted prose.

Read compiled manuscript.

Update records manually.

Block unsafe deletion.

Show health banner for corrupted state.

That should outrank more capstone grep tests.

## **24. Website UX audit focused on record-maintenance speed**

The website is route-complete, but too slow for every-segment use.

Problems:

Record cards show IDs and require opening full forms.

Current state chips show raw IDs.

Current-context editing uses ID textareas.

Prompt Preview is a raw preformatted block.

Post-prose review is a modal of category counts, not an editing workbench.

What it needs:

Inline edit common fields on cards.

Fast quick-add buttons by category.

Side-by-side accepted segment and record workbench.

Record pickers everywhere.

Prompt inclusion toggle on every card.

Bulk include/exclude.

Duplicate-from-existing.

Delete block with referrer list.

IDs hidden unless technical mode.

## **25. Safety/write-boundary audit**

The write-boundary work is one of the strongest parts of the second pass.

The README specifies allowed writes only under worlds/<slug>/manual-stories/<manual-story-slug>/** and explicitly forbids world stories, canon _source, characters, diegetic artifacts, indexes, and tool directories.

The sandbox enforces slug validation, realpath containment, world subdir denylist, and tool prefix denylist.

The route write-scope guard wraps route registration and throws on write methods registered outside the explicit writable scope.

Remaining concern: audit every route so no route takes arbitrary filesystem paths where logical world/story/record IDs would suffice. Keep exact paths out of user-controlled API bodies.

## **26. Story Explorer relationship audit**

Do not blend the tools.

Story Explorer is read-only and built around existing branching/story-bundle state. Manual Studio is a write-capable sidecar under manual-stories/. Manual Studio may reuse visual ideas from Story Explorer—compact record cards, x-ray drawers, raw technical disclosure—but it must not share write routes or mutate Story Explorer surfaces.

## **27. Research synthesis and how it changes the recommendation**

Local-first principles strongly support the current filesystem-first design: local-first software emphasizes local storage, offline use, longevity, privacy, and user control. That argues against MCP/runtime index dependency for this tool’s core loop.

Existing writing tools show the right product category. Scrivener combines manuscript organization, notes, metadata, corkboard/outliner, split screen, keywords, and export; Ulysses emphasizes focused writing plus project organization; Obsidian emphasizes local Markdown files, links, graph, plugins, and user-owned data. Manual Studio should not copy their prose editors, but it should copy their lesson: writers need fast navigation, local artifacts, and low-friction organization, not a validator console.

Continuity-management tools like Granthika exist because complex fiction creates tedious tracking work across characters, events, locations, and timelines. Manual Studio’s unique value should be lowering that continuity cost while keeping the author in control.

Story-generation research supports explicit planning/state surfaces. Plan-and-Write found explicit storyline planning improved generated story diversity, coherence, and topicality; outline-control systems similarly focus on controllability and coherence. Manual Studio should therefore preserve explicit author-selected context, but not overbuild it into an engine.

Human-LLM co-writing research supports the sidecar model: humans tend to introduce more semantic novelty and steer narrative direction, while LLMs elaborate and adapt. That maps exactly to Manual Studio’s target: author controls state/focus; external LLM drafts prose chunks.

Prompt injection research supports the no-internal-LLM boundary and hard lint. LLM-integrated apps remain vulnerable to prompt injection, and recent evaluations show many proposed defenses do not hold up under adaptive testing.

Scene/sequel craft supports simple beat templates: goal/conflict/disaster and reaction/dilemma/decision are enough to guide short chunks without importing full branching storylet machinery.

## **28. Proposed revised architecture**

Keep the package, but revise the conceptual modules:

Source Browser: deterministic read-only world material.

Record Workbench: mutable current-truth story records.

Prompt Working Set: selection/filter lens.

Prompt Composer: deterministic Markdown generator.

Prompt Preview Inspector: inclusion/exclusion/lint/section explanation.

Accepted Segment Pipeline: append prose and compile manuscript.

Post-Segment Record Workbench: manual update surface.

Repair Mode: hidden exceptional tools.

No engine runtime. No model calls. No patch-engine write path. No mandatory index.

## **29. Proposed revised storage model**

Recommended storage:

manual-story.yaml

records/<class>/<id>.yaml

prompt-working-set.yaml

prompts/<prompt-id>.md

prompts/<prompt-id>.yaml

segments/SEG-0001.md

segments/SEG-0001.yaml

manuscript.md

Optional:

templates/<mtemplate-id>.yaml

repair-log.yaml

Do not add archive/ by default.

Do not add supersession chains.

Do not add provenance ledger unless authors actually need it.

## **30. Proposed revised mutable record lifecycle**

Normal lifecycle:

Create.

Edit.

Prompt include/exclude.

Hard delete if no references.

Blocked delete if referenced.

Repair lifecycle:

Show technical IDs.

Show raw YAML.

Force delete with audit entry.

Repair segment sidecars.

Regenerate manuscript.

Normal UI should never archive a referenced record as the default delete behavior.

## **31. Proposed revised record-linking/selector model**

Every reference field should use a picker.

Character picker: name, role, summary, active, prompt status.

Location picker: title, summary, tags, current/past.

Record picker: title, class, summary, active, tags, involved cast, prompt mode, referenced-by count.

Segment picker: title, date, word count, first/last paragraph preview.

Template picker: title, pressure type, turn type, tags, why suggested.

Picker affordances:

Search.

Filter by class.

Filter by active/inactive.

Filter by prompt included/excluded.

Recently used.

Pinned.

Create new inline.

Duplicate existing.

Open detail drawer.

IDs only in detail/repair.

## **32. Proposed revised prompt working-set/current-focus model**

Rename to **Prompt Working Set**.

Fields:

current location.

current cast.

POV holder.

active pressure clocks.

active secrets/questions.

pinned records.

excluded records.

must-not-reveal.

handoff summary.

last accepted segment.

optional selected template.

optional desired pressure/turn.

Derived, not stored:

records included by relevance.

records excluded by relevance.

records hidden by prompt mode.

section map.

This keeps the working set as a cockpit lens, not duplicate story state.

## **33. Proposed revised prompt review/explainability model**

Prompt Preview should have two panes:

Left: Markdown prompt.

Right: Prompt Inspector.

Inspector sections:

Copy status: allowed/blocked.

Hard lint findings.

Selected cast.

Selected template.

Working set.

Included records with reasons.

Excluded records with reasons.

Suppressed reveals.

Prompt sections generated.

Missing/blocked inputs.

Search and highlight.

This is the author’s confidence panel: “Did the app process my records the way I expected?”

## **34. Proposed revised source-browsing model**

Source Browser should read:

WORLD_KERNEL.md

ONTOLOGY.md

_source/canon

_source/invariants

_source/mystery-reserve

_source/open-questions

_source/timeline

_source/geography

_source/peoples-and-species

_source/institutions

_source/economy-and-resources

_source/magic-or-tech-systems

_source/everyday-life

characters

diegetic-artifacts

UI:

left source record.

right story record form.

select text → copy literal text.

copy title/name.

create story fact/belief/location/object/character.

No semantic extraction. No sync. No provenance required.

## **35. Proposed revised beat-template/global-library model**

Keep templates optional.

Add global read-only library.

Copy into story for edits.

Template cards should be simple:

Title.

Pressure.

Turn.

Beat guidance.

Do-not-resolve.

Stop-after.

Anti-patterns.

Tone.

Why suggested.

Do not make templates a second state machine. Deterministic filtering is advisory only.

## **36. Proposed revised segment acceptance/repair model**

Normal:

Prompt generated.

External LLM used elsewhere.

Author accepts prose manually.

Paste prose.

Save segment.

Compile manuscript.

Open post-segment workbench.

Manual record updates.

Repair:

Hidden route.

Explicit warning.

Edit latest segment by default.

Delete only if no refs.

Block referenced segment deletion.

Force delete only with repair log.

No reorder unless a real linear-manuscript need emerges.

## **37. Proposed revised UX workflow for one real story**

Start with a world.

Create manual story.

Open Source Browser.

Read world canon/characters/artifacts.

Quick-create cast and key facts manually.

Create current records: beliefs, emotions, plans, relationship tensions, clocks, secrets, questions.

Open Prompt Working Set.

Pick current cast/location/POV/clocks/secrets/questions.

Pin key records.

Exclude irrelevant records.

Open Moment Composer.

Write short directive.

Optionally choose template.

Open Prompt Preview.

Inspect included/excluded records and lint.

Copy prompt.

Use external LLM.

Paste accepted prose.

Save segment.

Read accepted segment beside records.

Quick-add/edit/delete current records.

Block unsafe deletion with referrers.

Generate next prompt.

That is the product.

## **38. Open questions and tradeoffs**

Should active mean current truth, current relevance, or UI visibility? I recommend current truth/relevance; prompt inclusion needs separate fields.

Should last_reviewed_after_segment exist? Maybe, but not in Prompt Working Set. It is workflow metadata.

Should segment IDs migrate to lowercase? Not worth doing now.

Should templates be global-first? Yes, but copied local before editing.

Should source browsing use world-index? Not until direct filesystem browsing proves too slow.

Should prompts include many sections? Keep 15 sections for now. The problem is not section count; it is inclusion control and explainability.

Should records have provenance pointers? No default. Optional notes are enough.

## **39. Staged architecture-level implementation strategy, not tickets**

Stage 1: Rename/reframe current context to Prompt Working Set in UI and docs, with compatibility for existing current-context.yaml.

Stage 2: Replace ID entry with selectors everywhere: current focus, record refs, prompt composer, segment/prompt linking.

Stage 3: Add prompt inclusion ledger to compose result: included/excluded/suppressed/blocked with reasons and section mapping.

Stage 4: Rebuild Prompt Preview around that ledger.

Stage 5: Replace normal delete/archive behavior with block-on-referrer and referrer cards.

Stage 6: Build deterministic world source browser.

Stage 7: Rework post-segment flow into accepted-segment + record workbench.

Stage 8: Add one-real-story browser-like acceptance test.

Stage 9: Only after that, reassess templates and schema depth from actual use.

The next iteration should be judged by one question:

**Can an author maintain continuity after every accepted segment in under a minute without touching an internal ID?**

Right now, no. The architecture can support it, but the product surface cannot yet deliver it.

