## **1. Executive summary and blunt verdict**

**Verdict: Manual Story Studio is finally pointing at the right product, but it is not yet the product.** The latest pass moved it away from “validator console with CRUD” and toward a deterministic, local, external-prompt sidecar. The backend now has the right skeleton: no LLM dependency, typed manual records, a current-context/working-set layer, deterministic prompt composition, prompt inclusion resolution, segment sidecars, manuscript compilation, health checks, and a repair-mode delete lifecycle. The package description explicitly frames it as a “deterministic local writing cockpit” with “No LLM, no MCP, no patch engine,” and the dependency set is just Fastify/static/YAML, not model SDKs.

But the product still has three big problems.

First, **the main loop is still page-oriented, not cockpit-oriented**. The user moves between Source Browser, Records, Moment Composer, Prompt Preview, Paste Prose, Manuscript, and checklist modal. That is structurally closer to an admin app than to an authoring cockpit.

Second, **non-cast records are too shallow for the stated prose goal**. Cast has a strong profile model, but beliefs, emotions, plans, relationships, clocks, secrets, questions, and consequences mostly collapse into `summary`/`details` plus one or two typed fields. The current translators then produce thin prompt bullets. That is not enough to prepare an external LLM to move a story forward holistically for 3–5 meaningful beats.

Third, **the post-segment checklist should not be the center of the after-prose workflow**. It creates “review debt” without actually knowing what changed. It can only count categories and some cast-referencing records; it cannot infer state changes, and it must not try. The right replacement is an accepted-segment + record-workbench surface: read the accepted prose on the left, update records on the right, with category shortcuts.

My blunt recommendation: **stop adding perimeter features. Build one real loop.** Source distillation, record maintenance, prompt working set, prompt inspection, accepted prose, manuscript reading, and post-segment record updates need to feel like one workbench.

---

## **2. Repository access note**

The mission prompt and manifest were the governing inputs for this audit.

I did **not** clone the repository and did **not** use GitHub code search. The GitHub connector did find `joeloverbeck/worldloom` with default branch `main`, but repo-scoped metadata/file/commit calls behaved inconsistently and resolved through the connector namespace for `joeloverbeck/one-more-branch` rather than reliably returning worldloom metadata.

The public GitHub page confirms the repository exists and displays branch `main`, but I could not verify from the connector that current `main` resolves to `ededf1759dabe81af99a3e2f434f181f01310248`. Therefore, this audit is explicitly for the uploaded manifest’s commit surface, using direct exact-blob fetches at `ededf1759dabe81af99a3e2f434f181f01310248`. I am **not** claiming live `main` still equals that SHA.

---

## **3. Current implementation map after the latest pass**

The implementation now has these core surfaces:

**Backend/package boundary.** Manual Story Studio is a separate package with a local Fastify server and YAML file storage. The package description says the intended product boundary out loud: deterministic local writing cockpit, external Markdown prompt composition, pasted-prose manuscript pipeline, no LLM, no MCP, no patch engine.

**Storage model.** The schema defines manual story metadata, segment sidecars, prompt/manuscript policies, typed record classes, record summaries, and per-record prompt visibility. The current storage direction is `manual-story.yaml`, `records/<class>/<id>.yaml`, `current-context.yaml`, `prompts/`, `prompt-runs/`, `segments/`, `manuscript.md`, and repair logs.

**Record model.** Classes include cast, entities, statuses, locations, objects, facts, beliefs, intentions, plans, emotions, relationships, threads, obligations, consequences, clocks, secrets, questions, artifacts, and beat templates. IDs are lowercase class prefixes such as `mchar`, `mfact`, `mbel`, `mplan`, `memo`, `mrel`, `mclock`, `msecret`, and `mq`.

**Prompt Working Set / current-context layer.** The schema describes current context as an “author-controlled per-story selector/cockpit viewpoint onto the record corpus.” It contains current location, cast, POV holder, pressure clocks, secrets/questions, pinned records, excluded records, must-not-reveal, handoff summary, last segment, and last reviewed segment.

**Prompt composition.** The composer deterministically resolves inputs, current context, pinned records, excluded records, active secrets/questions, must-not-reveal, recent segment paragraph, contracts, section emitters, lint, and a resolution ledger. The prompt type surface includes included/excluded/suppressed/blocked records and a section map.

**Prompt structure.** The 15-section prompt includes content policy, story contract, current situation, manual directive, beat cluster, optional template guidance, cast/voice, emotional/relationship state, intentions/plans, beliefs/secrets/questions, physical continuity, forbidden inventions/reveals, prose craft, stop rule, and output instruction.

**Source browser.** The read layer loads world root files, `_source` directories, characters, and diegetic artifacts as read-only source material. The frontend workbench currently supports story-local creation for facts, beliefs, locations, objects, and cast.

**Record picker/card UI.** RecordPicker now has search, active/inactive filtering, class filtering, seeded/pinned/recent groups, and uses RecordCard. RecordCard shows title, importance, technical ID, active/archive status, class, prompt visibility, involved cast, summary, and tags.

**Segment/manuscript lifecycle.** Normal segment save is `POST`; segment `PUT` and `DELETE` require repair mode. The segment route blocks repair actions unless `?mode=repair` or body mode is present.

**Health.** Health computes file, schema, reference, current-context, segment, manuscript freshness, and required prompt-doc findings, with dependency-scoped blocked actions for prompt copy/save and segment/manuscript operations.

---

## **4. What improved since the third-iteration audit**

The most meaningful improvements are product-relevant, not cosmetic.

The app now has **real source browsing** rather than only internal record CRUD. It reads world root docs, `_source` domains, characters, and diegetic artifacts. That directly supports the first half of the target loop: browse world canon, copy literal source, distill into story-local records.

It now has **a current focus layer with exclusions**. `excluded_records` exists in the current-context schema, and the composer resolves working-set exclusions into the prompt resolution ledger. That is essential, because “story truth exists” and “story truth is relevant now” are not the same thing.

It now has **prompt explainability primitives**. Prompt results include included, excluded, suppressed, blocked, and section-map data. Prompt Preview renders a Prompt Inspector, record cards for included/excluded/suppressed records, hard lint, copy status, selected cast, selected template, working set, and blocked inputs.

It now has **a better delete lifecycle**. Records can be hard-deleted when unreferenced, blocked when referenced, and force-deleted with a repair log. The records route requires repair mode for force delete.

It now has **record selectors that are not raw ID boxes**. RecordPicker is moving in the right direction with search, filters, seed/pinned/recent groups, and card rendering.

It now has **stronger safety boundaries**. The sandbox resolver only writes under `worlds/<world>/manual-stories/<manual-story>`, rejects invalid slugs, checks real paths, rejects absolute relative paths, and denies canonical world subdirs plus other tool package destinations.

---

## **5. What is still weak, wrong, overbuilt, underbuilt, or risky**

**Weak:** the loop is still distributed across too many pages. An author should not have to mentally stitch together Source Browser → Records → Current Context → Moment Composer → Prompt Preview → Paste Prose → Checklist → Records. That is the shape of a management console, not a cockpit.

**Wrong:** the checklist modal is product debt. It is neither inference nor workflow. It says “review these categories manually,” counts records, and optionally stamps `last_reviewed_after_segment` into current context. That turns a prompt-selection lens into a compliance ledger.

**Overbuilt:** beat templates are getting too much structural weight for an unproven user need. The fixed 15-section prompt is fine; the optional template system should remain secondary.

**Underbuilt:** non-cast records. Beliefs, emotions, plans, relationships, consequences, clocks, secrets, and questions are exactly the story state that should shape the next 3–5 beats. Right now they are not structured deeply enough to translate into powerful prompt guidance.

**Risky:** `active`, `retired_reason`, `includeArchived`, and “archived” UI language still smell like an append-only lifecycle leaking into a mutable-current-truth tool. The delete lifecycle is good; the inactive/archive vocabulary needs product clarification.

**Risky:** segment repair can mutate `segment_order` while preserving referenced files in the write layer. That is not normal deletion, and it should not masquerade as deletion. Referenced segment deletion should block by default exactly like record deletion.

**Risky:** prompt cards and inspector still show too many IDs as primary evidence. RecordCard does show titles and summaries, but the Prompt Preview fallback summaries are fabricated from “Reason: …,” and selected cast/working set display raw ID lists.

---

## **6. Product identity audit: fast mutable prompt sidecar versus story engine**

Manual Story Studio should **not** inherit Worldloom’s branching-story engine identity. Worldloom itself is openly a canon-preserving narrative state machine with append-only canon, page snapshots, storylets/choices, and validators. Its README says structured records are authoritative state, prose is reader-facing, and the patch engine is the safe writer for canon/story ledgers. It also says not to treat prose as authoritative story state and not to silently overwrite/delete accepted records.

Manual Story Studio is different. It is a **local mutable sidecar** for linear fiction. Its records are author-maintained current truth, not committed branching snapshots. It should borrow Worldloom’s discipline — explicit state, no silent canon mutation, prose/state separation — but not its append-only mechanics, storylet runtime, page-state hash mindset, or validator-console tone.

The implementation is mostly aligned with this identity now. The package boundary says no LLM/MCP/patch-engine. The problem is not architecture purity; the problem is UX gravitational pull. The UI still makes the author feel like they are administering records rather than flying a continuity/prompt cockpit.

---

## **7. Core loop audit from source browsing to post-segment record maintenance**

The target loop is:

**source world → distill story-local records → select relevant current records → compose prompt → inspect prompt → external LLM → paste accepted prose → read manuscript → update records → repeat.**

Today, the pieces exist, but the seams are rough.

The strongest seam is **source → record**. SourceBrowser has a three-part structure: source list, source detail, record workbench. It allows literal copy into title/summary/details/notes and creation into a limited set of record classes. That is the right direction.

The weaker seam is **records → prompt working set**. Records, Current Context, and Moment Composer are still separate mental modes. The user needs a single “what matters in the next prompt?” surface with record cards, pin/exclude controls, and prompt-preview consequences.

The weakest seam is **accepted prose → record maintenance**. PasteProse saves a segment and opens a checklist modal. That is backwards. After a segment is accepted, the user should immediately see the accepted prose and the record workbench together. The checklist is a roadblock between acceptance and maintenance.

---

## **8. Foundations alignment audit**

Manual Story Studio aligns with the strongest Worldloom principles:

It keeps prose and state separate. It saves accepted prose as segments; records remain explicit YAML. It composes prompts deterministically rather than calling an internal LLM. It uses fail-fast health checks and safe write guards.

It should deliberately **break** from one Worldloom principle: append-only story state. Manual Studio’s story-local records should be mutable current truth. Worldloom’s append-only discipline is right for canonical branching ledgers; it is wrong for a manual prompt sidecar.

The foundation should be stated like this:

Canon remains append-only and patch-engine-owned. Manual story records are local, mutable, author-maintained current truth. Accepted prose is manuscript history. Manual Studio never infers state from prose and never mutates world canon.

That sentence would prevent most future product drift.

---

## **9. Architecture/package-boundary audit**

The package boundary is good. Keep Manual Studio independent from MCP, patch-engine, validators-as-product, and Story Explorer write surfaces. The package dependency list supports that boundary.

The architecture should evolve by adding **view-model APIs**, not by introducing new state engines. The missing backend layer is not “more validation”; it is “author-facing record identity and workflow projection”:

* record identity summaries with title/class/proposition/current state/involved cast/prompt status/referrer count;  
* prompt working-set resolution previews;  
* post-segment workbench payloads;  
* source-browser metadata/search payloads;  
* referrer cards for safe delete.

The current modules are basically right: `read/`, `write/`, `schema/`, `validate/`, `prompt/`, `server/routes/`, `health/`, and `web/`. The next work should not create a second runtime model.

---

## **10. Storage layout audit**

The current layout is close:

* `manual-story.yaml` for metadata and segment order;  
* `records/<class>/<id>.yaml` for mutable story records;  
* `current-context.yaml` for selection/focus;  
* `prompts/PROMPT-n.md` and `prompt-runs/PROMPT-n.yaml`;  
* `segments/SEG-n.md` and `segments/SEG-n.yaml`;  
* `manuscript.md`;  
* `repair-log.yaml`.

The biggest storage issue is naming. `current-context.yaml` should eventually become `prompt-working-set.yaml` or `writing-focus.yaml`, because “context” sounds like state, while this file is a selection/filter lens. The schema itself already calls it a “selector/cockpit viewpoint,” which is correct.

Recommended path: **keep `current-context.yaml` as a compatibility filename for one migration window, but change UI/API language immediately to Prompt Working Set.** Add an alias later if the file rename is worth the migration cost.

---

## **11. Mutable current-truth record lifecycle audit**

The desired lifecycle is:

1. create record;  
2. edit in place;  
3. hard delete when safe;  
4. block delete when referenced;  
5. force delete only in repair mode;  
6. no hidden archive/supersession;  
7. no automatic historical reconstruction.

The backend is mostly there. `deleteRecord` validates ID shape, scans referrers, hard-deletes unreferenced records, blocks referenced records, and force-deletes with an audit entry when requested.

But the vocabulary is still muddled. `active`, `retired_reason`, `includeArchived`, and UI “archived” language imply a retirement/archive lifecycle. For a mutable current-truth tool, “inactive” can be useful, but “archived” should not be the default mental model.

Use this language instead:

* **Active**: eligible for normal authoring and prompt selection.  
* **Inactive**: kept for reference, hidden from normal selection unless requested.  
* **Deleted**: file gone.  
* **Repair-forced deleted**: file gone, repair log records broken ref context.

Do not build supersession. Do not build historical state views unless manuscript segments naturally preserve history.

---

## **12. Record schema depth audit, especially non-cast records**

The cast schema is strong. It has identity, world pressure core, body/presence, voice, pressure behavior, perception/embodiment, agency/planning, relationship behavior, and prose constraints. That is exactly the kind of material an external LLM needs for prose.

The non-cast schemas are not yet strong enough. A belief with holder/truth_relation/confidence plus generic details is not enough. A plan with holder/target/visibility is not enough. An emotion with holder/valence/intensity is not enough.

The right approach is **not huge mandatory schemas**. It is “minimal required, powerful optional typed fields.” The user should be able to create a belief with just holder + proposition, then optionally add basis, confidence, behavioral effect, truth relation, and visibility.

Recommended schema direction:

| Record | Add fields that materially improve prompt translation |
| ----- | ----- |
| Belief | `proposition`, `holder`, `confidence`, `basis_or_evidence`, `behavioral_effect`, `truth_relation`, `known_by`, `hidden_from` |
| Emotion | `holder`, `toward`, `trigger`, `valence`, `intensity`, `outward_expression`, `masking_behavior`, `impulse` |
| Plan | `holder`, `goal`, `current_step`, `next_action`, `blocker`, `resources`, `visibility`, `failure_condition`, `secrecy_guard` |
| Relationship | `parties`, `current_dynamic`, `dominant_tension`, `recent_change`, `live_question`, `axis_values` |
| Consequence | `cause`, `current_effect`, `pending_or_realized`, `pressure`, `affected_records`, `next_pressure` |
| Clock | `axis`, `current_value`, `threshold`, `direction`, `what_ticks_it`, `what_happens_at_threshold` |
| Secret | `what_is_hidden`, `held_by`, `suspected_by`, `audience_visibility`, `reveal_guard`, `clue_state` |
| Question | `question`, `answer_known_to_author`, `possible_answer`, `known_by`, `must_not_resolve_until`, `payoff_guard` |
| Fact | `truth`, `scope`, `known_by`, `hidden_from`, `current_prompt_relevance` |

The winning schema is the one that makes the translator better and the form faster. If a field does not improve prompt translation or manual maintenance, do not add it.

---

## **13. Record-maintenance UX audit after every segment**

The current after-segment workflow is wrong because it presents a modal checklist instead of the accepted text and record workbench. PasteProse saves the segment and stores a checklist payload in state; then StateUpdateChecklist is displayed.

The desired post-segment page should be:

**Left pane:** accepted segment, with title, prompt ID, word count, last paragraph, and maybe selected prompt records.

**Right pane:** record workbench with quick-add buttons: Fact, Belief, Emotion, Plan, Relationship, Clock, Secret, Question, Consequence, Status. Pre-filter to involved cast, but do not assume only cast-linked records matter.

**Bottom or side rail:** “Records touched this pass” — not a required checklist, just a working pile.

**One-click flows:** duplicate existing record, edit inline common fields, open detail drawer for complex fields, delete with referrer cards.

The user may spend ten minutes after a segment carefully updating state. That is fine. The product goal is low friction and high confidence, not arbitrary speed.

---

## **14. Checklist challenge and replacement proposal**

The checklist should be removed as a primary modal.

The current checklist computes review classes, total record counts, and cast-referencing counts, then shows “Review N records” buttons and a “Mark state reviewed after SEG-x” action.

That is weak for three reasons.

First, it is fake specificity. It does not know what changed in the prose.

Second, it only checks `refs.characters` for cast involvement, while many meaningful typed references live in fields such as holder, between, owed_by, subject, held_by, etc. The broader referrer scan knows more than the checklist does.

Third, stamping `last_reviewed_after_segment` into current context makes the Prompt Working Set responsible for review debt. That is conceptually wrong.

Replacement:

* Remove modal from default save path.  
* After save, route to **Post-Segment Record Workbench**.  
* Show optional category shortcuts, not required review rows.  
* Keep a tiny reminder: “Manual Studio did not infer state. Update records you want to change.”  
* Hide “mark reviewed” unless there is a real use case later.

---

## **15. Record-linking and selector UX audit**

RecordPicker is much improved. It uses a combobox-like input, search, class filter, active filter, seeded/pinned/recent groups, and RecordCard options.

But a belief/emotion/plan/consequence still needs to be as selectable as a character. That means the selector option must show:

* title;  
* class badge;  
* current proposition/state;  
* involved cast;  
* tags;  
* prompt status;  
* active/inactive status;  
* reference count if useful;  
* tiny copyable technical ID.

WAI-ARIA guidance explicitly allows combobox popups to be listbox/grid/tree/dialog and notes that grid popups can present descriptive information for suggestions. That supports moving RecordPicker from “list of cards” toward a proper searchable card-grid selector with `aria-activedescendant` behavior.

Do not make users type IDs in normal flow. Do make IDs available in technical detail mode.

---

## **16. ID visibility/disambiguation audit**

The user is right to worry about fully hiding IDs. For non-character records, title collisions are real: two beliefs can both be “Mara distrusts the envoy,” but one may be about the envoy’s money and another about his oath.

The compromise should be:

* big: title/proposition/current state;  
* visible: class badge and involved cast;  
* visible: short summary;  
* visible: tags;  
* visible: prompt inclusion status;  
* visible: active/inactive;  
* small: technical ID chip, copyable;  
* hidden by default: full raw YAML path and low-level ref fields;  
* shown in repair mode: full ID/path/referrer technical view.

RecordCard currently shows raw ID under the title. That is acceptable as a first step, but it should become a de-emphasized technical chip, not a primary identity line.

Prompts must never include internal IDs unless the user explicitly enables technical debugging. External LLMs should receive titles and prose-facing descriptions, not `mrel-12` or `mclock-3`.

---

## **17. Prompt Working Set / Current Writing Focus audit**

The UI has already moved toward “Prompt Working Set.” CurrentStatePanel renders that term and displays current location, POV holder, current cast, active pressure clocks, active secrets/questions, and handoff summary.

That is the correct product language. The file/API are still `current-context`, which is tolerable internally for now but bad as a user-facing concept.

Recommended model:

* UI name: **Prompt Working Set**.  
* Optional subtitle: “Current Writing Focus.”  
* File name: keep `current-context.yaml` temporarily, migrate later.  
* API: introduce alias routes eventually, but do not block product work on rename.  
* Remove `last_reviewed_after_segment`.  
* Keep `last_accepted_segment` only if it is used to seed recent-prose context or manuscript navigation, not as review status.

The records are the state. The Prompt Working Set is only a deterministic selector and guardrail over the record corpus.

---

## **18. Prompt inclusion/exclusion audit**

The current inclusion model has three per-record visibility states: `always`, `include_when_relevant`, and `only_if_pinned`. The working set adds pinned and excluded records. The composer also suppresses must-not-reveal records and excludes inactive records.

That is close, but incomplete. It lacks a per-record “never prompt” mode. Some records should exist for continuity but never be sent to the external LLM unless the user explicitly changes the mode. Examples: hidden author-only answers, spoiler metadata, abandoned concepts, private notes.

Recommended deterministic policy:

1. **Record lifecycle gate:** inactive records are not candidates unless explicitly included or in repair/technical mode.  
2. **Per-record prompt mode:**  
   * `always`;  
   * `relevant_by_default`;  
   * `only_when_pinned`;  
   * `never_prompt`.  
3. **Prompt Working Set overrides:**  
   * pinned means include for this focus unless `never_prompt`;  
   * excluded means suppress for this focus even if normally relevant;  
   * must-not-reveal means do not reveal, but may include as “pressure/hidden fact” if safely translated.  
4. **Moment Composer selected records:** explicit one-run inclusion.  
5. **Inspector:** shows exactly why each record was included, excluded, suppressed, or blocked.

Avoid prompt bloat. The external LLM needs the current 3–5-beat situation, not the whole story bible.

---

## **19. Prompt generation target: holistic 3–5 beat forward movement**

The current prompt has good anti-overcontinuation instincts. Section 5 says render the next beat cluster, stop at a response point, and do not output summaries/headings/choices/explanations. Section 14 says stop at the first decision point, response point, interruption, irreversible beat, or changed immediate pressure.

But the default beat count is still 2–5, while the clarified target is roughly **3–5 meaningful beats**. Change the prompt language to 3–5 unless the author overrides it.

Also remove “machine-state conclusions” from author-facing prompt text. That phrase is internal-engine language. Say instead:

Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment.

The prompt should equip the external LLM to explore the current record space holistically: current situation, voices, facts, beliefs, emotions, plans, relationships, clocks, secrets, questions, consequences, and stop conditions. The 15-section structure can stay. The problem is not section count; the problem is whether the selected records translate into strong novelist-facing instructions.

---

## **20. Prompt Preview / Prompt Inspector explainability audit**

Prompt Inspector is one of the best improvements. It now has the right categories: included, excluded, suppressed reveals, blocked inputs, section mappings, selected cast, selected template, working set, lint, and copy status.

But it still feels too much like a validator console because it displays raw lists and synthetic reason summaries. The inspector should feel like an author confidence panel:

* “These records will shape the prompt.”  
* “These records were deliberately excluded.”  
* “These secrets are protected.”  
* “These selected inputs were blocked.”  
* “These sections used these records.”  
* “This prompt is safe to copy.”

For every record row, show title, class, concise state/proposition, involved cast, prompt mode, inclusion reason, and section. Do not show only ID lists for working set or selected cast.

The goal is not “prove the validator passed.” The goal is “the author can see whether the prompt carried the right story truth.”

---

## **21. World canon/source browsing audit**

The source browser is pointed at the right material: world root files, source domains, characters, and diegetic artifacts. It also correctly uses literal copy controls rather than automatic semantic extraction.

The source-to-story creation set should be adjusted:

**Primary creation buttons:**

* Create Cast  
* Create Fact

These are the most direct world-canon distillation actions.

**Secondary “more record types” drawer:**

* Location  
* Object  
* Entity  
* Artifact  
* Question  
* Secret

These can plausibly be story-local distillations from world source, but they should not crowd the primary path.

**Manual-only, not source-primary:**

* Emotion  
* Plan  
* Relationship  
* Consequence  
* Clock

Those are usually current story dynamics, not static source distillation. The author may still create them from selected source text, but the UI should treat that as an advanced/manual choice.

Do not add required provenance pointers. A `source_world_character` pointer for cast is useful, but forcing provenance on every fact or secret will slow the loop.

---

## **22. Character/profile model audit**

Cast is the current standout. The schema has enough craft-specific structure to shape prose: voice under pressure, intimacy, evasion, anger, lying; body limits; habitual gestures; perception biases; agency; planning blind spots; prose constraints.

This is the right direction because linear fiction prompting needs character behavior and voice, not just “name/role/backstory.”

Do not simplify the cast model. Instead, make the UI friendlier:

* quick create: display name, role, one-line identity, baseline voice;  
* detail drawer: full pressure/voice/body/perception/agency model;  
* prompt preview: show which cast fields are actually translated;  
* source import: copy name/title and optionally seed `source_world_character`, but never auto-distill the full profile.

The cast model is rich enough. The non-cast model needs to catch up selectively.

---

## **23. Beat-template/global-library audit, secondary to the main loop**

Beat templates should remain optional. The user does not yet know how they will use them, and the main loop is not excellent enough to justify centering templates.

Interactive-narrative research shows why this is dangerous. Storylet systems can provide authorial control, and recent LLM storylet work even uses natural-language triggers, but that is explicitly a framework for responsive interactive narrative. Manual Story Studio is not that. Deterministic template filtering is fine; LLM-assisted storylet triggers are not.

Keep beat templates as:

* advisory;  
* deterministic;  
* local;  
* copy-before-edit;  
* demoted in navigation;  
* excluded from the normal record CRUD path, as the current routes already enforce.

Useful template fields for later: pressure type, turn type, beat guidance, stop-after, do-not-resolve, anti-patterns, forbidden inventions, tone fit.

---

## **24. Segment acceptance and repair-mode audit**

Normal segment flow should be boring: paste accepted prose, save segment, compile manuscript if configured, return to records.

The current routes are mostly right: `POST` saves, while `PUT` and `DELETE` require repair mode.

The write-layer behavior around referenced segment deletion should change. If a segment is referenced by consequences or other records, deletion should block by default just like record deletion. The current “segment_order_removed_files_preserved” outcome sounds like a partial delete and risks surprise.

Recommended segment repair model:

* Normal: append accepted prose only.  
* Repair replace: latest-only by default; non-latest requires explicit force replace.  
* Repair delete unreferenced: allowed in repair mode.  
* Repair delete referenced: blocked with referrer cards.  
* Force delete referenced: separate danger flow with explicit typed confirmation.  
* Remove from manuscript order but preserve files: separate action named exactly that, not “delete.”

Segment deletion should be rare and visually hidden.

---

## **25. Manuscript reading/compile audit**

Manual Studio needs a pleasant “read the story so far” surface, not a full prose editor. Scrivener’s lesson is relevant: it gives writers reference material, split views, index cards/outliner, and compile/export; it is not just a text box.

For Manual Studio:

* compile manuscript automatically after normal segment save by default;  
* manual compile button for repair mode;  
* manuscript page should be readable, with good typography;  
* segment titles should be optional in manuscript output, configurable;  
* manuscript freshness health should warn, not dominate;  
* clicking a segment in manuscript view should open segment + related prompt + records used.

The current health layer already checks manuscript freshness, which is good.

---

## **26. Prose/state boundary audit**

The boundary must remain absolute:

* external LLM writes prose outside Manual Studio;  
* author accepts or rejects prose outside Manual Studio;  
* Manual Studio saves only accepted prose;  
* Manual Studio does not infer state from prose;  
* author manually updates records afterward.

The code and package boundary currently honor this. The package says no LLM; segment save stores prose and sidecars; checklist disclaimer explicitly says Manual Studio has not changed any records.

The UI should say this once, elegantly, after segment save:

Segment saved. Manual Studio did not infer record changes. Update any records you want to change.

No checklist debt. No fake automation. No prose-understanding claims.

---

## **27. Validation and fail-fast health audit**

The health layer is a major improvement. It checks metadata, record reads, segment sidecars/bodies, manuscript freshness, current context, schema validation, references, and required prompt documents. It maps blocking findings to dependent actions such as prompt copy/save or segment/manuscript operations.

That matches fail-fast principles: problems should surface early at the interface boundary instead of letting the author proceed with corrupt state.

Two improvements:

1. **Dependency-scoped health must stay scoped.** A malformed inactive record should not necessarily block prompt copy unless selected, pinned, or required by working set.  
2. **Silent fallback should become visible warning.** The prompt composer’s recent-segment paragraph loader catches read errors and returns null. That is probably too silent for an authoring tool; it should become a prompt lint warning or health finding.

Health should be a safety rail, not the dashboard’s personality.

---

## **28. Test/CI/acceptance audit**

The manifest shows many tests across schema, read/write, routes, prompt sections/translators, health, current context, prompt ledger, record picker, delete UX, and segment lifecycle. That is good coverage breadth.

But breadth is not the same as product confidence.

The next critical test is one **browser-like synthetic acceptance flow**:

1. create synthetic world;  
2. create manual story;  
3. browse source;  
4. create cast and facts from literal source;  
5. create belief/emotion/plan/relationship/clock/question/secret/consequence manually;  
6. link non-character records through selectors;  
7. set Prompt Working Set;  
8. exclude future/spoiler records;  
9. compose prompt;  
10. inspect included/excluded/suppressed records;  
11. save/copy prompt;  
12. paste accepted segment;  
13. read manuscript;  
14. return to post-segment record workbench;  
15. add/edit/delete records;  
16. block unsafe deletion with referrer cards;  
17. use repair mode for segment repair;  
18. surface corrupted-state health banner.

Do not tie this to `animalia`. The acceptance world should be tiny, synthetic, and deliberately world-agnostic.

---

## **29. Website UX audit focused on record-maintenance speed**

The UI is improving, but it still has admin-console bones.

Good:

* Record cards exist;  
* record picker exists;  
* source browser has a workbench;  
* Prompt Inspector exists;  
* CurrentStatePanel uses “Prompt Working Set” language;  
* Repair modes are not normal routes.

Weak:

* too much inline styling and page isolation;  
* too many giant generic forms;  
* no persistent cockpit rail;  
* no post-segment split pane;  
* source browser likely loads/searches bluntly;  
* prompt inspector still raw-ID-heavy;  
* records page likely remains the center instead of a workbench surface;  
* checklist modal interrupts the loop.

The UX pattern to copy is not “database admin.” It is closer to Scrivener split view + corkboard/index cards + Obsidian-style local linked notes + a custom continuity/prompt rail. Scrivener’s split screen and corkboard/outliner patterns are relevant because writers need reference, structure, and writing artifacts visible together. Obsidian’s Markdown-file local note model is relevant because plain files and links preserve user ownership and long-term control.

---

## **30. Safety/write-boundary audit**

The write boundary looks strong.

`resolveManualStoryRoot` restricts roots to `worlds/<world>/manual-stories/<story>` with lowercase slug validation. `assertInsideSandbox` checks real paths and rejects writes outside the manual story root. It also denies world subdirs like `stories`, `_source`, `characters`, `diegetic-artifacts`, `_index`, and tool package prefixes for Story Explorer, patch-engine, world-index, and world-mcp.

That is exactly the right posture. Manual Studio may read world source; it must not mutate world canon or Story Explorer data.

Keep testing for:

* symlink escape;  
* absolute paths;  
* traversal;  
* invalid slug;  
* wrong route writing outside manual story root;  
* source browser read-only;  
* prompt template path containment.

---

## **31. Story Explorer relationship audit**

Story Explorer remains read-only and should stay separate. Manual Studio may borrow UI ideas — record peeks, x-ray panels, cards, sticky rails, broken-reference chips — but it must not share write routes or mutate Story Explorer data.

The sandbox explicitly denies `tools/story-explorer/` write destinations, which supports that separation.

Do not blend the tools. Story Explorer is for inspecting branching story bundles. Manual Studio is for writing a linear story with mutable story-local records and deterministic external prompts.

---

## **32. Research synthesis and how it changes the recommendation**

Local-first software emphasizes local data ownership, offline use, low-latency operations, longevity, privacy, and user control. That directly supports Manual Studio’s local YAML-file sidecar identity.

Scrivener, Ulysses, and Obsidian point to the same lesson: writers value fast local text, project organization, metadata, search, split reference views, and export/compile more than heavy workflow ceremony.

Story bible tools and continuity workflows show the value of typed character/place/item/fact records, tags, filtering, and cross-reference, but Manual Studio should reject AI-analyzer features because internal inference violates the product boundary.

Beat theory supports thinking in meaningful turns: goal/conflict/reaction/decision, not just “write some continuation.” Scene/sequel theory’s goal-conflict-disaster and reaction-dilemma-decision pattern is useful as optional prompt language, not as a rigid engine.

Storylet research supports the warning: storylets are powerful for interactive narrative, but authorable storylet frameworks plus LLM-triggering move toward a runtime drama manager. Manual Studio should keep deterministic template filtering advisory only.

LLM story generation research supports the core architecture: long story generation suffers from consistency failures; knowledge graphs/structured state can improve user control; human-LLM co-writing research suggests humans drive narrative novelty/direction while LLMs elaborate.

Prompt-injection research reinforces why source text copied into prompts must be clearly framed as source/reference data, not executable instructions. Structured separation of instructions and data is a known mitigation direction.

Result: **Manual Studio should become a local-first structured-record cockpit that lets the human control narrative state and lets an external LLM elaborate prose only.**

---

## **33. Proposed revised architecture, if needed**

Do not rewrite the backend. Refactor the product surface around four author workflows:

1. **Source Distillation Workbench**  
   * world source left;  
   * story record creation right;  
   * literal copy only;  
   * primary Cast/Fact, secondary other types.  
2. **Prompt Cockpit**  
   * Prompt Working Set;  
   * selected/pinned/excluded records;  
   * moment directive;  
   * prompt preview/inspector;  
   * copy/save prompt.  
3. **Accepted Segment Workbench**  
   * accepted prose left;  
   * update records right;  
   * involved cast filter;  
   * quick-add and edit cards.  
4. **Manuscript Reader**  
   * compiled story;  
   * segment navigation;  
   * prompt/record provenance as optional side panel.

Keep repair and beat templates as secondary.

Backend additions should be view-model endpoints, not new engines.

---

## **34. Proposed revised storage model, if needed**

Keep the current file model, but rename concepts:

* keep `manual-story.yaml`;  
* keep `records/<class>/<id>.yaml`;  
* keep `segments/SEG-n.md` and `.yaml`;  
* keep `prompts/` and `prompt-runs/`;  
* keep `manuscript.md`;  
* keep `repair-log.yaml`;  
* migrate `current-context.yaml` → `prompt-working-set.yaml` eventually.

Add only if useful:

* `ui-state.json` for purely local non-authoritative panel state;  
* `record-views/` never;  
* hidden archives never;  
* supersession chains never.

Do not add a database. Do not add semantic embeddings. Do not add automatic extraction logs.

---

## **35. Proposed revised mutable record lifecycle**

Record lifecycle should be:

* **Create:** minimal required fields only.  
* **Edit:** in-place mutable YAML write.  
* **Deactivate:** optional, for “not current but kept for reference.”  
* **Delete:** hard delete if unreferenced.  
* **Blocked delete:** show referrer cards.  
* **Repair force delete:** hidden mode, explicit danger copy, repair log.

Remove “archived” from normal UI. Use “inactive” if the file remains. Use “deleted” if the file is gone.

Never use supersession for manual story records.

---

## **36. Proposed revised record schema direction**

Adopt a two-layer schema pattern:

**Common layer:**

* id;  
* title;  
* active;  
* importance;  
* tags;  
* summary;  
* prompt mode;  
* references;  
* author notes.

**Typed craft layer:** optional but structured fields per class.

The forms should show a minimal top section and expandable craft sections. Example: a Plan can be created with holder + goal + next action. The author can later add blocker, failure condition, visibility, and resources.

Translators should prefer typed fields over `details`, but gracefully fall back to summary/details.

---

## **37. Proposed revised selector/record identity model**

Every record picker option should render as:

**Title**  
 Class badge · prompt mode · active/inactive · tiny ID chip  
 One-line current state/proposition  
 Involved cast chips  
 Tags  
 Referenced-by count, if nonzero

For technical IDs:

* show a small chip like `mbel-12`;  
* click copies ID;  
* full path only in detail/repair disclosure;  
* never prompt the external LLM with IDs.

Use WAI-ARIA combobox/grid guidance for rich options, because record selectors need descriptive rows, not plain dropdowns.

---

## **38. Proposed revised prompt working-set model**

Prompt Working Set should contain:

* current location;  
* current cast;  
* POV holder;  
* active pressure clocks;  
* active secrets/questions;  
* pinned records;  
* excluded records;  
* must-not-reveal;  
* handoff summary;  
* maybe last accepted segment.

Remove:

* `last_reviewed_after_segment`.

Do not store:

* all currently relevant records if those belong only to a one-off prompt run;  
* checklist status;  
* inferred state;  
* prose summaries generated by an internal model.

The Prompt Working Set is a reusable lens. Prompt runs are one-time artifacts.

---

## **39. Proposed revised prompt inclusion/exclusion model**

Use four deterministic layers:

1. **Lifecycle:** active/inactive.  
2. **Per-record mode:** always / relevant by default / only when pinned / never prompt.  
3. **Prompt Working Set:** pinned / excluded / must-not-reveal.  
4. **Moment Composer:** selected for this prompt run.

Inspector output should say:

* included because explicitly selected;  
* included because pinned;  
* included because active pressure clock;  
* included because current cast reference;  
* excluded because working-set excluded;  
* excluded because inactive;  
* suppressed because must-not-reveal;  
* blocked because missing/broken/unsafe.

That is the right balance between continuity and prompt bloat.

---

## **40. Proposed revised prompt review/explainability model**

Prompt Preview should become a confidence cockpit:

* left: rendered Markdown prompt;  
* right: inspector cards;  
* top: copy/save/lint status;  
* middle: included/excluded/suppressed records;  
* bottom: section map and blocked inputs.

Replace raw ID lists with record identity cards. Keep section-map detail, but collapse it by default.

Add a “Why is this here?” affordance per record. Add “Why is this missing?” search: type a record title and see why it was not included.

This is much more valuable than another validator table.

---

## **41. Proposed revised source-browsing model**

Source browser should be:

* grouped by source kind/domain;  
* searchable by title/path/tags/raw text;  
* detail loaded lazily for large worlds;  
* literal-copy only;  
* source left, record workbench right;  
* primary create Cast/Fact;  
* secondary create Location/Object/Entity/Artifact/Question/Secret;  
* no automatic semantic extraction;  
* no required provenance except useful deterministic links such as cast source character.

Copied source text should be labeled as source material, not instruction. Prompt-injection research is clear that LLMs struggle to distinguish instructions from data, so copied raw source must be quoted/framed safely when included in prompts.

---

## **42. Proposed revised post-segment record workbench**

After saving accepted prose, route to:

**Post-Segment Workbench**

Left:

* accepted segment text;  
* prompt ID;  
* moment directive;  
* included records from prompt sidecar;  
* last paragraph.

Right:

* quick-add record buttons;  
* selected/involved cast filters;  
* editable record cards;  
* “records changed this pass” pile;  
* safe delete/referrer handling.

Optional top reminder:

Manual Studio did not infer changes. Update only the records you want to change.

This is the heart of the product. Build this before refining beat templates.

---

## **43. Proposed revised beat-template treatment**

Demote beat templates.

Keep:

* deterministic filtering;  
* local editable templates;  
* optional candidates;  
* copy-template-before-edit;  
* prompt section 6 as optional guidance.

Avoid:

* global runtime libraries as a near-term priority;  
* storylet triggers;  
* LLM-assisted template matching;  
* cooldowns/eligibility engines;  
* branching-story SLT complexity.

Beat templates should serve the prompt, not become the product.

---

## **44. Proposed revised segment repair model**

Segment repair should be a hidden utility area.

Normal authoring:

* save accepted segment;  
* compile manuscript;  
* update records.

Repair mode:

* replace latest segment;  
* replace non-latest only with force;  
* delete unreferenced segment;  
* block referenced segment deletion with referrer cards;  
* force delete referenced segment only with explicit danger flow;  
* remove from manuscript order as a distinct “exclude from manuscript order” operation.

Do not show repair in the main navigation except as a small technical link.

---

## **45. Proposed synthetic one-real-story acceptance workflow**

A good acceptance workflow should use a tiny synthetic world:

World: “The Glass Orchard.”  
 Source facts: orchard trees hold memories; a guild taxes memory-fruit; one character hides a broken grafting knife.  
 Cast: Mira, tax-guild inspector; Len, orchard keeper.  
 Story premise: Mira arrives to audit Len after a memory harvest fails.

Acceptance flow:

1. create manual story;  
2. browse `WORLD_KERNEL`, source facts, and characters;  
3. create Mira and Len as story-local cast;  
4. create facts about memory-fruit and tax audit;  
5. create belief: Len thinks Mira already knows about the knife;  
6. create emotion: Mira is irritated but curious toward Len;  
7. create plan: Len wants to hide the broken graft;  
8. create relationship: Mira/Len distrust with mutual fascination;  
9. create clock: audit pressure rising;  
10. create secret: broken grafting knife;  
11. create question: why did the harvest fail?;  
12. set Prompt Working Set;  
13. exclude the true answer from prompt;  
14. compose prompt for 3–5 beats;  
15. inspect included/excluded/suppressed records;  
16. save/copy prompt;  
17. paste accepted prose;  
18. read manuscript;  
19. post-segment update: Len’s plan changes, Mira’s belief changes, clock advances, new consequence appears;  
20. delete an unreferenced obsolete fact;  
21. attempt to delete referenced secret and see blocked referrers;  
22. use repair mode only for an artificial segment error;  
23. corrupt current context and verify scoped health blocking.

That one flow matters more than another dozen isolated tests.

---

## **46. Open questions and tradeoffs**

**How much typed schema is too much?** Add typed fields only where translators improve. Keep fields optional except the few that identify the record.

**Rename file/API now or later?** UI should rename now. File/API can migrate later with compatibility.

**Should source browser create secrets/questions directly?** Yes, but secondary. Cast and facts remain primary.

**Should inactive records exist at all?** Yes, but they should mean “kept but not normally active,” not “archived history.” Deletion should be normal when safe.

**Should prompt include last prose paragraph automatically?** Yes, but failure to load it should warn. The external LLM needs immediate continuity, but stale/failed recent prose should not disappear silently.

**Should prompts include source snippets?** Only when the author explicitly selects them, and they must be framed as source/reference, not instruction.

**Should record IDs ever appear in prompts?** No, except technical debug mode.

---

## **47. Staged architecture-level implementation strategy, not tickets**

**Stage 1: product language and navigation.** Rename UI concepts to Prompt Working Set, Current Writing Focus, Source Distillation, Prompt Cockpit, Accepted Segment Workbench, Repair. De-emphasize Records as a standalone CRUD page.

**Stage 2: remove checklist as default.** Replace post-save checklist modal with accepted-segment + record workbench. Keep category shortcuts only as optional aids.

**Stage 3: deepen non-cast records.** Add optional typed fields for belief, emotion, plan, relationship, consequence, clock, secret, question, and fact. Update forms and translators together.

**Stage 4: fix prompt inclusion model.** Add `never_prompt`; clarify active/inactive versus prompt relevance; make working-set pins/exclusions explicit; improve ledger reasons.

**Stage 5: upgrade Prompt Inspector.** Replace raw IDs with record identity cards, section usage, “why included/missing,” suppressed reveal explanations, and blocked input cards.

**Stage 6: polish source distillation.** Primary Cast/Fact buttons, secondary record types, better grouping/search, lazy raw detail, no provenance burden.

**Stage 7: segment/manuscript flow.** Auto-compile on save, readable manuscript view, segment-to-record side panel, repair mode hidden and safer.

**Stage 8: synthetic browser-like acceptance flow.** One end-to-end world-agnostic test proving a real author can complete the loop.

Final blunt call: **Manual Story Studio should become a continuity cockpit, not a record database.** The implementation now has enough machinery. The next pass should stop proving that files can be validated and start proving that one real linear story can be written through this loop without the author feeling like they are maintaining a miniature branching-story engine.

