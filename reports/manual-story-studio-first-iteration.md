# **Manual Story Studio proposal**

## **1. Executive summary and recommendation**

Build **Manual Story Studio** as a sibling package:

tools/manual-story-studio/

Store its authored material under:

worlds/<world-slug>/manual-stories/<manual-story-slug>/

That location is the right call. It keeps Manual Story Studio outside `worlds/<world>/stories/`, outside normal story-bundle `_source/`, outside the world-index story-bundle parser surface, and outside patch-engine story-record operations. The existing index explicitly maps normal story-bundle `_source` directories such as `pages`, `choices`, `storylets`, `scenes`, `events`, `beliefs`, `plans`, and `emotions` to engine record types and uppercase ID patterns; Manual Story Studio should not accidentally enter that universe.

The product should be a **fast writer’s cockpit**, not another story engine. Its job is deterministic: maintain manual state records, compose a clean Markdown prompt, accept pasted prose, append it to the manuscript, and remind the author to update records. It must never run an LLM, never call OpenRouter, never infer state from prose, never branch, never create `PG`, `SE`, `SCN`, `CHC`, or `SLT`, and never write to existing story bundles or world canon.

The most important design decision: **reuse Worldloom’s concepts, not its lifecycle.** Worldloom’s branching story system is sophisticated because it has to support branch-local authority, causal ticks, page snapshots, predicate eligibility, state hashes, validators, patch-engine write ordering, and prose receipts. Manual Story Studio does not need that. Dragging it in would recreate the slowness this feature is supposed to escape.

The existing Worldloom doctrine that prose is downstream of state is worth preserving. The story-state contract explicitly separates world canon, story state, and rendered prose, and says prose can reveal or dramatize state but does not create story state by itself. Manual Story Studio should follow that principle in a lighter form: pasted prose is manuscript text, not authoritative state.

## **2. What to reuse from Worldloom and what not to reuse**

**Reuse the vocabulary where it helps the author think.** Manual Story Studio should keep the useful state categories: facts, beliefs, intentions, plans, emotions, relationships, obligations, consequences, clocks, secrets, questions, artifacts, locations, objects, statuses, characters/entities. The normal story contract already recognizes these as first-class story state classes.

**Reuse the role taxonomy, but trim it.** The existing `STENT.role_in_story` enum is useful: `viewpoint`, `primary_actor`, `opposing_actor`, `allied_actor`, `authority`, `dependent`, `witness`, `information_source`, `pressure_source`, `social_bridge`, and `background`. I would omit `player_proxy` in MVP unless Manual Story Studio later adds player-facing interactive fiction semantics.

**Reuse STCHAR’s author-facing sections, not STCHAR itself.** The `STCHAR` schema is heavy: it requires story IDs, source-kind tracking, bootstrap/generated page metadata, supersession/status fields, bound `STENT` IDs, profile revision, and body schema version. Manual Studio should borrow its useful profile sections—Stable Persona Core, Emotional Appraisal Map, Pressure Behavior, Voice Bible / Dialogue Authority, Perception and Embodiment, Agency and Planning Tendencies, Relationship-Specific Behavior, and Prose Rendering Constraints—without requiring branching-story bootstrapping.

**Reuse the canonical content policy verbatim.** The existing content-policy file is explicitly the canonical source inlined into every scene plan and is intended to be byte-for-byte reused by render prompts. Manual Studio should include that exact body in generated external prompts.

**Do not reuse the patch engine as the write path.** The patch engine’s story operations are explicitly normal story-bundle operations such as `create_pg_record`, `create_slt_record`, `create_scn_record`, `create_stplan_record`, and `append_story_character_authority_record`. Manual Studio writes should be ordinary guarded filesystem writes inside its own directory.

**Do not reuse MCP as a runtime dependency.** Manual Studio can read repository files directly. MCP is valuable for skills and indexed retrieval, but it adds latency, server state, schema expectations, and mental overhead. This tool should be deterministic local CRUD.

**Do not reuse branching-story validators wholesale.** Some validator ideas are reusable—YAML parse integrity and ID uniqueness—but most structural validators assume `PG`, branch paths, append-only supersession, snapshots, state deltas, scenes, and `_source` story records. YAML parse and ID uniqueness are simple enough to reimplement or extract in manual-specific form.

## **3. Proposed package/app boundary**

Create:

tools/manual-story-studio/  
 package.json  
 src/  
   server/  
   read/  
   write/  
   validate/  
   prompt/  
   manuscript/  
 web/  
   src/

The backend can mirror Story Explorer’s practical stack—Node 22, TypeScript, Fastify, React/Vite, YAML parsing—because that stack already fits the repository. Story Explorer uses Fastify, `@worldloom/world-index`, `better-sqlite3`, and `yaml`, but no patch engine or MCP dependency. Manual Studio should use Fastify and YAML, but should not depend on `@worldloom/patch-engine` or `@worldloom/world-mcp`.

Story Explorer must remain read-only. Its README is explicit: no `POST`, `PUT`, `PATCH`, or `DELETE` routes, no patch-engine or MCP dependency, no repository writes, and no in-process world-index build/sync. Its read-only route guard enforces GET/HEAD-only registration. Manual Studio should have its own write-enabled server with an opposite-style **write-scope guard**, never by adding write routes to Story Explorer.

Safe sharing is fine at the component/helper level: design tokens, CSS, disclosure components, markdown sanitization, route-error UI, and read-only world enumeration helpers. Do not share the Story Explorer backend identity.

## **4. Proposed filesystem layout**

Recommended layout:

worlds/<world-slug>/manual-stories/<manual-story-slug>/  
 manual-story.yaml  
 manuscript.md

 records/  
   cast/  
     mchar-jon.yaml  
     mchar-ane.yaml  
   entities/  
   statuses/  
   locations/  
   objects/  
   facts/  
   beliefs/  
   intentions/  
   plans/  
   emotions/  
   relationships/  
   threads/  
   obligations/  
   consequences/  
   clocks/  
   secrets/  
   questions/  
   artifacts/  
   beat-templates/

 prompts/  
   PROMPT-0001.md  
   PROMPT-0002.md

 prompt-runs/  
   PROMPT-0001.yaml  
   PROMPT-0002.yaml

 segments/  
   SEG-0001.md  
   SEG-0001.yaml  
   SEG-0002.md  
   SEG-0002.yaml

 indexes/  
   records.json       # optional, rebuildable  
   manuscript.json    # optional, rebuildable

`manual-story.yaml` is the canonical story metadata and segment order. `segments/*.md` are durable prose. `manuscript.md` is deterministic compiled output. `prompts/*.md` preserve generated prompts when the user chooses to save them or when prompt generation is configured to save automatically. `indexes/` must be treated as cache only and rebuildable.

This should not live under `stories/`. The normal story system’s contracts, parsers, and patch operations are all shaped around `worlds/<world>/stories/<story>/_source/...`, and Story Explorer’s story list reads from `worlds/<world>/stories`. Keeping manual stories under `manual-stories/` makes the safety boundary obvious to both people and tools.

## **5. Proposed manual story metadata schema**

Use one small YAML file:

schema_version: manual-story.v1  
world_slug: erotica-world  
manual_story_slug: jon-and-ane-park  
title: Jon and Ane in the Park  
created_at: "2026-05-30T00:00:00Z"  
updated_at: "2026-05-30T00:00:00Z"

source:  
 world_commit: null  
 notes: "Reads world canon only; manual story state is independent."

story_contract:  
 premise: ""  
 tone: ""  
 pov: "close third"  
 tense: "past"  
 content_intensity: "mature"  
 explicitness: "author-controlled"  
 language_register: ""  
 prose_preferences:  
   psychic_distance: "deep close unless overridden"  
   dialogue_density: "moment-led"  
   interiority: "free indirect, no filter-word padding"  
   paragraphing: "literary scene prose"

cast_order:  
 - mchar-jon  
 - mchar-ane

segment_order:  
 - SEG-0001  
 - SEG-0002

prompt_policy:  
 save_prompts: true  
 require_moment_directive: true  
 default_beat_count: "2-5"  
 include_recent_segments: 1

manuscript:  
 compile_on_segment_save: true  
 include_segment_titles: false

This file is not a database. It is a readable control file.

## **6. Proposed manual record classes and schema philosophy**

Manual record files should be **small YAML files**, one record per file. Do not use normal Worldloom uppercase IDs like `BEL-1`, `STPLAN-4`, or `STEMO-2`; those look like authoritative branching-story records. The existing repository already assigns meaning to those prefixes in world-index and patch-engine surfaces.

Recommended ID style:

mchar-ane  
mbel-jon-thinks-ane-is-hurt  
mrel-jon-ane  
mclock-ane-trust  
msecret-ane-was-followed  
mtemplate-soft-confrontation

The file path supplies the class:

records/beliefs/mbel-jon-thinks-ane-is-hurt.yaml

Common fields:

id: mbel-jon-thinks-ane-is-hurt  
title: "Jon thinks Ane is hurt"  
active: true  
importance: high  
tags: [park, ane, injury, suspicion]  
summary: "Jon believes Ane is hurt and is trying not to scare her off."  
details: ""  
refs:  
 characters: [mchar-jon, mchar-ane]  
 locations: [mloc-park-bench]  
 related_records: [mrel-jon-ane]  
prompt_visibility: include_when_relevant  
last_reviewed_after_segment: SEG-0003  
notes: ""

MVP classes:

characters / cast  
entities  
statuses  
locations  
objects  
facts  
beliefs  
intentions  
plans  
emotions  
relationships  
threads  
obligations  
consequences  
clocks  
secrets  
questions  
artifacts  
beat-templates

The user’s “sequences” should be interpreted as **consequences**, matching the existing `CNSQ` concept. Nothing I inspected suggests a better reading.

Deletion policy should be hybrid:

* If a record is unreferenced, allow hard delete.  
* If a record is referenced by active records, prompt history, segment metadata, or templates, default to `active: false` and `retired_reason`.  
* Allow force-delete only after showing deterministic reference warnings.

This is enough guardrail. Append-only supersession would be overkill for the MVP.

## **7. Proposed character/profile model**

Manual Studio should expose a **Manual Character Profile** that is pleasant to fill out by hand. It should not force `STCHAR` bootstrapping.

Recommended sections:

id: mchar-ane  
display_name: Ane  
roles: [primary_actor, information_source]  
source_world_character: CHAR-0007   # optional read-only provenance

identity:  
 one_line: ""  
 public_face: ""  
 private_pressure: ""

world_pressure_core:  
 world_produced_wound: ""  
 active_appetite: ""  
 self_mythology: ""  
 irreconcilable_contradiction: ""  
 relational_charge: ""  
 moral_psychological_edge: ""  
 cannot_be_swapped_out_because: ""

body_and_presence:  
 physicality: ""  
 body_limits: ""  
 habitual_gestures: ""  
 clothing_or_presentation: ""  
 social_presentation: ""

voice:  
 baseline: ""  
 under_pressure: ""  
 intimacy: ""  
 evasion: ""  
 anger: ""  
 lying: ""  
 anti_generic_warnings: []

pressure_behavior:  
 cornered: ""  
 tempted: ""  
 humiliated: ""  
 protecting_attachment: ""  
 offered_power: ""

perception_and_embodiment:  
 notices: ""  
 misses: ""  
 misreads: ""  
 sensory_bias: ""

agency_and_planning:  
 default_strategy: ""  
 risk_style: ""  
 fallback_style: ""  
 planning_blind_spots: ""

relationship_behavior:  
 jon: ""  
 authority_figures: ""  
 dependents: ""

prose_constraints:  
 prose_must_not_imply: []  
 forbidden_inventions: []  
 voice_do_not_do: []

This borrows the best parts of Worldloom’s protagonist-grade character engine: world-produced wound, appetite, self-mythology, contradiction, pressure behavior, relational charge, moral edge, signature behavior, voice under pressure, and cannot-swap reason. The character engine is bluntly correct that cosmetic eccentricity is failure; memorability has to come from modeled pressure, not quirks.

It also borrows the useful STCHAR operational section names, but not STCHAR’s lifecycle. `STCHAR`’s validator schema is designed for machine-created story-local authority artifacts with source maps, regeneration reasons, bound `STENT` IDs, status, and revisioning. Manual Studio should let the author fill in the good author-facing fields directly.

## **8. Proposed storylet / beat-template model**

Call them **beat templates** in the UI. “Storylet” is technically right, but in this app it risks implying an autonomous selection/execution system. The user should experience these as author-created reusable cards.

Research supports this lightweight approach. Emily Short describes storylets as pieces of content with prerequisites and effects, useful for more flexible narrative structures than simple branching, but also useful as index-card-like authoring tools rather than only full procedural engines. Kreminski and Wardrip-Fruin frame storylets as modular narrative units whose preconditions and content-selection architecture can vary widely across systems.

Manual Beat Template schema:

id: mtemplate-soft-confrontation  
title: "Soft confrontation that lets the other person retreat"  
active: true

classification:  
 move_family: negotiation  
 tags: [relationship, hurt, guarded-truth, park]  
 intensity: mature  
 tone_fit: [intimate, tense, tender]

role_slots:  
 initiator:  
   compatible_roles: [viewpoint, primary_actor]  
 guarded_other:  
   compatible_roles: [primary_actor, information_source, dependent]

requires:  
 record_classes_any: [beliefs, emotions, relationships]  
 record_tags_any: [hurt, secrecy, mistrust]  
 relationship_axes_any:  
   - trust  
   - fear  
   - attraction  
 location_tags_any: [public, semi-private, park]

excludes:  
 record_tags_any: [active-violence, chase]  
 forbidden_if_secret_tags: [must-not-reveal-yet]

beat_guidance:  
 - function: setup  
   instruction: "Begin with the initiator approaching without cornering the guarded other."  
 - function: pressure  
   instruction: "Let the guarded other protect the vulnerable fact indirectly."  
 - function: turn  
   instruction: "Make one concrete detail change the initiator's read of the situation."  
 - function: exit  
   instruction: "Stop at the first new response point; do not resolve the whole secret."

forbidden_inventions:  
 - "Do not reveal the guarded other's full secret unless the moment directive explicitly asks for it."

author_notes: ""

Keep 1–5 beat guidance items. This aligns with current `SLT` beat discipline without importing `SLT`’s scope, predicates, effects, branch visibility, cooldown, or patch-engine constraints. The current `SLT` schema requires scope, closed preconditions, beats, exit options, saliency, mystery policy, provenance, grounding, and created-at-page metadata. That is too heavy for Manual Studio.

## **9. Deterministic storylet filtering design**

Filtering should be simple, transparent, and non-authoritative. The existing `select-storylet-candidates` tool is useful as inspiration: it filters by scope, driver kind, action family, predicate shape/class, source record ID, mystery policy, and cooldown, then returns a trace and shortlist. Manual Studio should use the idea of staged deterministic filtering, but not the exact story-bundle machinery.

Manual filter inputs:

current manual story  
selected cast  
active records  
moment directive  
directive metadata, if user supplies it  
optional selected move family / tags / location

Filter stages:

1. Active templates only.  
2. Content-intensity compatibility.  
3. Role-slot satisfiability against selected cast.  
4. Required record classes present.  
5. Required tags present.  
6. Location/tone compatibility.  
7. Forbidden-secret / forbidden-reveal compatibility.  
8. Recent-use advisory, not hard block.  
9. Sort by explicit user pin, tag overlap, role fit, saliency, and title.

The UI should show candidates as cards:

Soft confrontation that lets the other person retreat  
Why suggested: relationship + hurt + guarded truth + selected cast fits initiator/guarded_other

No template is ever auto-selected. If the user chooses one, its beat guidance enters the prompt. If not, the prompt uses only the manual directive and selected state.

The current moment-signature work in commitment-block authoring is valuable but too heavy for this app. It computes latest-page event state, high-salience records, supersession sets, choice affordances, and cast-role engagement. Manual Studio should borrow only the principle: **extract shapes, not engine IDs**.

## **10. Deterministic prompt-composition pipeline**

The prompt composer is the heart of the app.

Pipeline:

1. Validate that a manual moment directive exists.  
2. Load story metadata and prose preferences.  
3. Load selected cast profiles.  
4. Load selected/active relevant records.  
5. Optionally load selected beat template.  
6. Load canonical content policy verbatim.  
7. Load Manual Studio prose craft / render instruction.  
8. Translate records into novelist-facing language.  
9. Compose one Markdown prompt.  
10. Run prompt lint:  
   - content policy present verbatim  
   - directive present  
   - no internal IDs  
   - no engine jargon  
   - no schema/validator/patch/lifecycle terms  
11. Preview in UI.  
12. Copy to clipboard and optionally save prompt file + sidecar.

This design is strongly supported by research on planning-before-generation. Plan-and-Write found that generating and using a storyline before surface realization improved story quality over direct generation. Re3 uses an overarching plan plus a current story state and reports improved human ratings for plot coherence and premise relevance versus direct generation. Plan/Write/Revise work also found that increasing human collaboration in planning and writing stages improved story quality and engagement. Manual Studio should exploit that: deterministic planning/context assembly inside the app, prose generation outside the app.

The pipeline must hide record IDs. The current scene-plan structure already enforces this for renderer-facing plans: no record IDs, hashes, schema terms, validator names, patch-engine language, lifecycle terms, raw state-delta vocabulary, or act/arc language. Manual Studio should enforce the same cleanliness.

## **11. Proposed external Markdown prompt format**

Recommended generated prompt:

# Manual Prose Prompt

## 1. Content Policy

[verbatim canonical content policy block]

## 2. Story Contract

Title:  
Tone:  
POV:  
Tense:  
Content intensity:  
Prose preferences:

## 3. Current Situation

[Short natural-language summary of the immediate situation.]

## 4. Manual Moment Directive

[The user's mandatory directive.]

## 5. Required Beat Cluster

Render only the next 2–5 beats as continuous prose.

Begin from the current situation. Follow the manual moment directive. Stop as soon as the immediate exchange or action produces the first materially new response point: a decision pressure, emotional turn, information change, practical result, refusal, reveal-withheld, changed tactic, or newly exposed vulnerability.

Do not continue into the next scene. Do not summarize future consequences. Do not add choices. Do not add headings. Do not explain the prose.

## 6. Optional Beat Template Guidance

[Only included if user selected a template.]

## 7. Cast and Voice

[Character-facing voice, body, pressure behavior, and conduct constraints.]

## 8. Emotional and Relationship State

[Only the relevant state, translated into prose-facing language.]

## 9. Current Intentions and Plans

[What each relevant character is trying to do now.]

## 10. Relevant Beliefs, Secrets, and Open Questions

[What may be revealed, what must remain hidden, what the POV may/may not know.]

## 11. Physical Continuity

Location:  
Bodies:  
Objects:  
Props:  
Recent concrete facts:

## 12. Forbidden Inventions and Forbidden Reveals

[Do-not-add and do-not-imply list.]

## 13. Style and Prose Craft

[Manual Studio craft contract.]

## 14. Stop Rule

Stop at the first materially new response point. The correct ending is the moment where the author has a new thing to decide, not the moment where the entire scene has resolved.

## 15. Output Instruction

Output prose only. No commentary. No Markdown headings. No bullet points. No notes.

The stop rule should be firmer than the current scene renderer’s “length follows content” instruction because Manual Studio is asking for a **short beat cluster**, not a committed scene range. The existing render-time instruction is scene-range specific: it tells the renderer to render a selected scene range over committed `PG` records, references plan sections, STCHAR packets, and scene stopping points. It is not cleanly reusable for Manual Studio.

## **12. Proposed prose paste/save/append flow**

Flow:

1. User copies generated Markdown prompt into an external LLM.  
2. User pastes returned prose into Manual Story Studio.  
3. User edits the prose in a review editor.  
4. User clicks **Save Segment**.  
5. App writes:

    segments/SEG-0007.md  
   segments/SEG-0007.yaml

6. App updates `manual-story.yaml` segment order.  
7. App recompiles `manuscript.md`.  
8. App shows a manual state update checklist.  
9. User updates records manually.

Segment sidecar:

id: SEG-0007  
created_at: "2026-05-30T00:00:00Z"  
title: "Jon approaches Ane in the park"  
prompt_id: PROMPT-0007  
prompt_sha256: "<hash>"  
moment_directive: "Jon approaches Ane in the park, intending to figure out why she's hurt."  
selected_template: mtemplate-soft-confrontation  
included_record_summary:  
 characters: [mchar-jon, mchar-ane]  
 records:  
   - mbel-jon-thinks-ane-is-hurt  
   - mrel-jon-ane  
author_note: ""

The app must not infer state from prose. The existing scene-prose attach skill is a good precedent: it validates/attaches user-supplied prose but never mutates `PG`, `SCN`, `SE`, or other `_source` story records. Manual Studio should be even simpler: no receipt gate, no state mutation, no inference.

## **13. Manuscript and segment storage design**

Use both durable segments and a compiled manuscript.

segments/SEG-0001.md  
segments/SEG-0001.yaml  
segments/SEG-0002.md  
segments/SEG-0002.yaml  
manuscript.md

`segments/*.md` are the source of truth for prose. `manuscript.md` is a deterministic compiled convenience artifact. Write it on every segment save, and also provide a **Rebuild Manuscript** command. That gives the author a normal file to open in an editor while still keeping segment-level recovery.

Do not store failed external attempts unless the user explicitly saves them. The default workflow should be disposable retries: adjust directive/records/template, regenerate prompt, try again externally.

## **14. Validation model**

MVP validation should be deterministic and lightweight:

Storage validation:  
- manual-story.yaml parses  
- every record YAML parses  
- required fields exist  
- record IDs unique within manual story  
- record file path class matches record class  
- refs point to existing records or explicitly archived records  
- active records do not reference hard-deleted records  
- segment order references existing segment files  
- prompt sidecars reference existing prompt files

Prompt validation:  
- moment directive present and non-empty  
- content policy included verbatim  
- selected cast profiles exist  
- selected records exist  
- no internal record IDs in external prompt  
- no engine jargon in external prompt  
- no schema/validator/patch/lifecycle terms  
- no Worldloom-specific record-class vocabulary unless quoted as story-world prose, which should normally be disallowed

Write validation:  
- real path is inside manual story root  
- write path is not a symlink escape  
- no writes under `worlds/<world>/stories/`  
- no writes under world `_source/`  
- no writes under `characters/`, `diegetic-artifacts/`, `_index/`, Story Explorer, or patch-engine surfaces

Do not use normal `record_schema_compliance`, `snapshot_replay_equality`, `recursive_reference_closure`, branch isolation, scene-range integrity, or STCHAR validators. Those are designed for the branching system.

## **15. Proposed website UX**

The UI should feel like Scrivener plus a continuity cockpit, not a validator console.

Main screens:

**World picker.** Lists worlds from `worlds/`, similar to Story Explorer’s world enumeration. Story Explorer already enumerates world directories and derives display names/counts.

**Manual story list/create.** Shows stories under `manual-stories/`, not normal `stories/`.

**Studio dashboard.** The home cockpit:

* current story contract  
* current directive draft  
* active cast  
* active high-importance records  
* open clocks/secrets/questions  
* latest segment  
* manuscript word count  
* “Generate Prompt” primary action

**Cast & Profiles.** Fast editor for manual character profiles.

**Records.** Class-filtered CRUD. A left rail lists classes; center shows record cards; right side edits YAML-backed form fields.

**Moment Composer.** The main workflow screen:

* mandatory moment directive  
* involved cast  
* relevant records picker  
* optional move/tags  
* filtered beat-template candidates  
* generate prompt button

**Prompt Preview.** Shows the exact Markdown to copy. It should have a lint status: “clean external prompt” or exact violations.

**Paste Prose.** Large editor, save segment button, optional title/note.

**State Update Checklist.** After save, show:

* statuses  
* emotions  
* beliefs  
* relationships  
* objects  
* plans  
* clocks  
* secrets  
* open questions  
* consequences  
* obligations  
* threads

The checklist must not say anything changed. It should say: “Review these categories manually.”

**Manuscript.** Full compiled manuscript view, segment list, segment reorder if allowed, rebuild button.

**Prompt History.** Saved prompts and their associated segments.

## **16. Safety rails preventing writes to normal story bundles or world canon**

Manual Studio needs a hard filesystem boundary.

Backend write rule:

Allowed:  
worlds/<world-slug>/manual-stories/<manual-story-slug>/**

Forbidden:  
worlds/<world-slug>/stories/**  
worlds/<world-slug>/_source/**  
worlds/<world-slug>/characters/**  
worlds/<world-slug>/diegetic-artifacts/**  
worlds/<world-slug>/_index/**  
tools/story-explorer/**  
tools/patch-engine/**  
tools/world-index/**  
tools/world-mcp/**

Every write route should accept logical IDs, not arbitrary paths. The backend resolves the manual story root, resolves the target path, checks real paths, rejects symlink escapes, rejects `..`, rejects absolute user-supplied paths, and writes only after validation.

Manual Studio should also have a startup banner:

Write root: worlds/<world>/manual-stories/<story>/  
World canon: read-only  
Normal story bundles: read-only  
External LLM: not connected

This is not cosmetic. It tells the user and future contributors what the app is.

## **17. Relationship to Story Explorer**

Story Explorer stays read-only. Full stop.

Story Explorer’s server wraps Fastify in `wrapRouterReadOnly`, then registers only read routes such as worlds, stories, overview, timeline, scenes, state x-ray, records, search, and branch map. Its frontend routes are story-bundle browsing routes—worlds, stories, story dashboard, timeline, scenes, unscened, search, branch map.

Manual Studio can reuse:

* visual tokens  
* layout styles  
* markdown sanitization  
* route error UI  
* disclosure components  
* read-only world list logic

It should not reuse:

* Story Explorer server  
* Story Explorer routes  
* Story Explorer read-only guard by weakening it  
* Story Explorer’s story-bundle assumptions

A future shared package such as `tools/worldloom-ui-shared/` or `tools/world-read/` would be reasonable, but only after Manual Studio has proven its shape.

## **18. Renderer contract audit**

**Content policy: reuse existing canonical file verbatim.** The user required it, and the existing file is explicitly canonical.

**Prose craft contract: create an additive Manual Studio version.** The existing craft contract has excellent advice—POV discipline, free indirect discourse, filter-word cuts, concrete sensory grounding, no ledger jargon, and length-following-content. But it is a scene-plan canonical source with diagnostic vocabulary tied to scene-prose qualitative review. Manual Studio should create:

docs/manual-story-studio/prose-craft-contract.md

This file can borrow the principles, but should remove scene/page-specific references, diagnostic verdict language, and references to prior pages unless Manual Studio explicitly supplies prior segment context.

**Render-time instruction: do not reuse.** The existing render-time instruction explicitly covers scene-range rendering over committed `PG` records and references plan sections, STCHAR packets, forbidden mystery sections, and scene prose structure. Create:

docs/manual-story-studio/manual-render-instruction.md

Manual version should say:

* render the next 2–5 beats  
* obey the manual moment directive  
* output prose only  
* stop at the first materially new response point  
* do not continue the scene  
* do not add choices  
* do not infer or announce future consequences  
* do not expose IDs or engine jargon

Do not modify existing branching renderer files in MVP. Add new files.

## **19. Open questions and tradeoffs**

**Hard delete vs inactive records.** Hard delete is fast and honest, but can break references. Default to inactive when referenced; allow hard delete when unreferenced.

**Prompt saving always vs optional.** I recommend saving prompts by default once generated or copied. It gives the author recoverability and lets segment sidecars reference exact prompt hashes. Add a setting to disable prompt history.

**Optional indexes.** Do not build a database in MVP. Rebuildable JSON indexes are fine later for search speed. Local-first writing tools benefit from ordinary files as the source of truth: the local-first ideal is fast local read/write, offline availability, longevity, and user control.

**How much world canon to import.** MVP should read world canon read-only and let the user manually copy useful summaries into manual records. Automatic canon import risks bloating prompts and making Manual Studio feel like a retrieval engine.

**How much storylet filtering.** Keep it deterministic and shallow. A system like Drama Llama uses LLM-powered natural-language triggers for storylet responsiveness; that is precisely the sort of intelligent internal selection Manual Studio should avoid.

**Beat count.** Default to 2–5 beats. The app’s value is producing constrained prompt packets, not asking an external model to write a whole chapter.

**Content policy and external LLM mismatch.** Manual Studio can include the required canonical policy. It should not try to adapt itself to every external model’s policy. That is outside scope.

## **20. Staged implementation strategy**

**Milestone 1: package boundary and write sandbox.** Create `tools/manual-story-studio/`, backend, frontend shell, world picker, manual story list, create/open manual story, and realpath-based write guard. No prompt generation yet.

**Milestone 2: manual records and cast profiles.** Add metadata editor, cast/profile editor, record CRUD for MVP classes, reference validation, active/inactive handling, and basic dashboard.

**Milestone 3: prompt composer.** Add mandatory moment directive, record selection, clean Markdown prompt generation, content-policy verbatim inclusion, no-ID/no-jargon lint, prompt preview, copy, and optional prompt save.

**Milestone 4: prose paste and manuscript pipeline.** Add paste editor, segment save, segment sidecars, deterministic `manuscript.md` compiler, segment list, prompt/segment association, and post-save manual checklist.

**Milestone 5: beat templates.** Add beat-template CRUD, deterministic filtering, candidate cards with “why suggested,” template selection, and prompt inclusion.

**Milestone 6: polish and safe read-only world helpers.** Add read-only canon/character lookup, manual copy/import helpers, search/filter UX, keyboard shortcuts, and optional rebuildable indexes. Do not add LLM calls, automatic state extraction, branching, patch-engine writes, or Story Explorer write integration.

## **Final blunt recommendation**

Build Manual Story Studio as a separate, boring, filesystem-backed writing cockpit. The “boring” part is the point. The existing branching system already does the heavy machine-authority work. Manual Studio should give the author a fast dashboard for **manual state, constrained prompt assembly, pasted prose, and manual follow-up edits**.

The fastest path to ruining this feature would be to reuse `PG`, `SCN`, `SLT`, patch plans, MCP context packets, append-only supersession, or normal story validators because they are “already there.” They are there for a different problem. Manual Story Studio should borrow the language of Worldloom and reject the machinery.

