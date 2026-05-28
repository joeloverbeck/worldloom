# **Requirements-First Architectural Proposal: Replace Page Prose Plans with Scene-Range Prose Rendering**

## **Repository access note**

I did **not** clone the repository and did **not** use GitHub code search or snippet search. I used the uploaded manifest as the file inventory and fetched targeted files from the exact supplied commit SHA, `7df56b243fbee2cc86a796a5bbc4400f9eb4605e`.

I was **not able to conclusively verify** that current `main` resolves to that exact SHA. The GitHub connector could see `joeloverbeck/worldloom`, but its branch/ref metadata calls were pinned to a different exposed repository namespace and would not reliably return `worldloom`’s live `main` ref. Direct network access from the container was unavailable. So the repository evidence below is grounded in targeted exact-SHA fetches from the supplied commit, not an independently verified live-`main` SHA.

That limitation does **not** weaken the architectural conclusion, because the exact-SHA files and uploaded artifacts all point in the same direction.

---

## **1. Executive verdict**

Yes: **Worldloom should remove `pages-prose-plans/PG-X.md` as a first-class renderer artifact** and replace it with **scene/range prose plans and scene/range prose artifacts**.

The current design makes a PG do two jobs:

1. **Authoritative causal tick** — a committed state delta, branch snapshot, event result, and choice surface.  
2. **Reader-facing prose unit** — the thing the external writer renders as literary fiction.

Those are different units. Treating them as the same unit is now the central architectural mistake.

A PG is a causal beat. A scene is the prose unit.

The right architecture is:

* `branching-story-bootstrap`: state only.  
* `branching-story-turn-cycle`: state only.  
* `PG` YAML remains the authoritative fork/causal tick.  
* A new first-class `SCN` or render-unit record maps a contiguous branch-path range of PGs.  
* Scene plans are novelist-facing, derived from committed PGs, and editable without poisoning state.  
* Scene prose is attached and validated at scene level.  
* Story Explorer becomes scene-first, with PGs as collapsible x-ray subunits.

The best version of your intended direction is not “lighter page plans.” It is **delete page prose plans and introduce scene-range render units**.

---

## **2. Repository evidence**

### **Current live contract is PG-first and page-plan-heavy**

The current workflow says story state becomes authoritative when a page plan is committed; bootstrap and turn-cycle author comprehensive plans at `pages-prose-plans/PG-<integer>.md`; rendered prose is later supplied externally and attached as `pages-prose/PG-<integer>.md` with a page receipt.

The prose renderer contract is even more explicit: “the plan is the prompt,” and the per-page plan body contains nineteen sections, including story kernel, content policy, craft contract, world canon, active cast, location, selected event and state delta, turn driver trace, relationships, emotional causality, obligations, stopping point, choices, plan frontmatter, STCHAR packets, style notes, anti-pathology checklist, and render-time instruction.

That is an engine packet pretending to be a novelist packet. The README even forbids compacting the repeated prose contract blocks because each page render is treated as a cold context.

### **Turn-cycle is currently contaminated by page-plan authorship**

`branching-story-turn-cycle` currently describes itself as producing one causal tick **plus** `pages-prose-plans/PG-<integer>.md`, and its process flow has Phase 7 “Author page plan” before choice generation and final validation. The hard gate requires the page plan to be drafted with all nineteen sections and STCHAR packets before submission.

That boundary is wrong. The state turn should not need a renderer-facing plan to decide what happened. If the skill has to think in renderer-plan terms before it finalizes the causal state delta, the skill is doing fiction-rendering work inside the state engine.

### **The current state contract already supports separating state from prose**

The state contract already says rendered prose is a rendering of story state, not a second state engine, and that any committed page is a valid parent whether or not prose has been rendered.

That principle should be extended: not only should rendered prose be non-authoritative, but **renderer-facing prose plans should also be non-authoritative and outside the PG state hash contract**.

### **The PG schema currently hard-couples state to page plans**

The PG schema includes `plan.plan_hash` and `prose_plan_path: pages-prose-plans/PG-<integer>.md`, and deterministic PG hash computation includes the page-plan hash in the PG state payload.

This is the exact coupling that makes user-editable prose plans dangerous: a prose-plan edit can drift the PG’s integrity machinery even though the edit has no causal meaning.

### **Story Explorer is page-first**

Story Explorer’s current architecture has page routes, page details, page prose, page plans, page receipts, and page-level choice panels. The prose route family is explicitly `/prose/:pageId`, `/page-plans/:pageId`, and `/prose-receipts/:pageId`, mapping to `pages-prose`, `pages-prose-plans`, and `pages-prose-receipts`.

That is a reader UX problem. A reader does not experience “PG-7”; they experience “the bench negotiation scene.”

### **World-index only knows page prose/page plans today**

The world index currently enumerates story source directories including pages, choices, storylets, plans, emotions, events, etc., but there is no scene/render-unit source directory.

The story bundle markdown directories include `pages-prose` and `pages-prose-plans`, and the YAML receipt directory is `pages-prose-receipts`; there are no `scene-prose`, `scene-prose-plans`, `scene-prose-receipts`, or `_source/scenes` directories.

So scene-first is not a small UI tweak. It is a contract change across index, validators, Story Explorer, skills, and docs.

---

## **3. Uploaded sample artifact evidence**

The uploaded PG-5 through PG-8 artifacts are damning in the useful sense: they show exactly why PG should not be the prose unit.

PG-5, PG-6, PG-7, and PG-8 are not four scenes. They are one continuous bench scene:

* PG-5: Ane answers Jon’s offer with a probe.  
* PG-6: Jon discloses and over-offers.  
* PG-7: Ane translates the offer into priced terms.  
* PG-8: Jon shows the money and asks why the money is needed.

The prose itself reads as one uninterrupted scene: same bench, same POV, same cast, same location, same dramatic exchange, same unresolved tension. PG-5 ends with Jon holding the question; PG-6 continues directly from it; PG-7 continues from his wait; PG-8 continues from her terms.

The page plans prove the same thing from the machine side. PG-8’s plan frontmatter says the branch path is `PG-1 → PG-2 → PG-3 → PG-4 → PG-5 → PG-6 → PG-7 → PG-8`, records the selected SLT, driver kind, state delta, hash language, validation trace, and STCHAR packets.

The PG YAMLs show the authoritative state shape is already present without prose: PG records carry `state_snapshot`, active records, visible affordances, emitted choices, validation traces, state hashes, parent hashes, and prose-plan paths.

The plans also contain repeated anti-repetition instructions because page-level rendering forces every PG to defend itself against reusing the previous PG’s anchors. PG-8’s plan tells the renderer not to reuse PG-7 lines, sensory anchors, metaphors, and cadence, then proposes fresh wallet/cash/cold-air anchors for the next page.

That is a workaround for the wrong unit. A scene-range plan would not need four separate “do not reuse the prior page” sections for one continuous exchange. It would plan the whole scene’s internal escalation once.

The rendered prose is not bad. The architecture is bad. The prose works **despite** the page split, not because of it.

---

## **4. Research synthesis**

Research and prior implementation practice support the move from “one prose plan per causal tick” to “one prose plan per scene/range.”

Narrative-generation research repeatedly separates **planning** from **surface realization**. Plan-and-write architectures first build an explicit storyline or plan, then generate prose from that plan; this improves coherence and relevance compared with direct generation. Interactive plan/write/revise systems also show quality gains when planning and writing are treated as distinct stages rather than one monolithic generation step.

Narrative planning research also supports the idea that causality should be managed separately from prose. Causal relations are a major contributor to perceived plot coherence, and symbolic or hybrid planning systems exist precisely because causal coherence is fragile when left to pure surface generation.

Storylet-based interactive narrative practice points in the same direction. Storylets are good causal/control units: they let authors define triggers, preconditions, and narrative moves while retaining authorial control and player responsiveness. Modern LLM storylet systems explicitly combine storylet structure with generative prose because the structural unit and the prose realization unit are not the same thing.

Scene and beat craft theory also aligns with your hypothesis. A scene is normally a coherent dramatic unit with continuity of purpose, time/location, and conflict; a beat is a smaller turn or exchange within that scene. A PG maps much more naturally to a beat or causal tick than to a whole reader-facing scene.

LLM context research adds a practical reason to stop making page plans huge. Long-context models can underuse or lose information buried in the middle of long prompts, with performance strongest when relevant information is near the beginning or end. Current Worldloom page plans bury the actual prose mission inside a huge mixture of state delta, validation, hashes, STCHAR packets, anti-pathology contracts, and engine machinery. Scene plans should instead minimize prompt noise and put the novelist-facing mission first.

Generative-agent work also supports a clean separation between memory/state, retrieval, reflection/planning, and action generation: the system stores experiences, retrieves relevant memories, synthesizes them, and only then acts. Worldloom should follow the same separation: PGs store causal state; scene plans retrieve and translate relevant causal beats; prose rendering produces the reader-facing artifact.

Conclusion: the research backs the move. **PGs should be causal ticks. Scenes should be render units.**

---

## **5. Recommended architecture**

### **Core contract**

Worldloom should adopt this contract:

PGs are authoritative causal ticks. Scenes are reader-facing render units over contiguous PG ranges. Scene prose may dramatize, compress, smooth, and locally reorder non-causal micro-beats, but it must not contradict included PGs or create future state. Future turn-cycle execution runs from PG snapshots, not prose.

This gives you all three goals:

* Faster turn-cycle execution.  
* Cleaner state deltas.  
* Better prose.

The clean pipeline becomes:

bootstrap / turn-cycle  
 → causal resolution  
 → state delta  
 → SE  
 → PG snapshot  
 → CHCs  
 → validation trace

scene-plan  
 → select PG range  
 → translate causal ticks into novelist-facing scene brief

external prose render  
 → scene prose

scene-prose-attach  
 → validate prose against scene range  
 → write scene receipt  
 → no state mutation

The important boundary: **state-turn skills do not author renderer-facing prose plans.**

---

## **6. Direct answers to the core architectural questions**

### **1. Should page prose plans be removed?**

Yes.

Of the three options:

1. **Keep page plans but make them lighter** — wrong. This preserves the wrong prose unit.  
2. **Split internal page plan vs renderer packet** — better than today, but still wrong if page remains the render unit.  
3. **Eliminate page plans and introduce scene-range prose plans** — correct.

Recommendation: **delete page plans as a first-class renderer artifact.**

A small internal turn summary can remain inside PG/SE validation trace, but do not replace `pages-prose-plans/PG-X.md` with a renamed internal page plan unless a validator truly consumes it.

### **2. Should turn-cycle stop authoring prose plans?**

Yes.

`branching-story-turn-cycle` should stop after state delta, SE, PG, CHC, and validation trace.

If turn-cycle currently needs page-plan thinking to shape the state delta, that is a design smell. The correct order is:

driver resolution → commitment block → state delta → PG snapshot → choices

Only after those are committed should a scene-plan skill derive renderer material.

### **3. Should bootstrap stop authoring prose plans?**

Yes.

`branching-story-bootstrap` should create the initial story state, root branch, root SE/PG, seed records, and initial choices. It should not create `pages-prose-plans/PG-1.md`.

The root page does not need special treatment. The opening scene can be `SCN-1`, usually over `PG-1` or over `PG-1..PG-N` once enough committed beats exist to make a real opening scene.

### **4. What replaces page plans?**

A scene/range artifact stack:

_source/scenes/SCN-<n>.yaml  
scene-prose-plans/SCN-<n>.md  
scene-prose/SCN-<n>.md  
scene-prose-receipts/SCN-<n>.yaml

The `SCN` record is authoritative only for render-unit membership and publication status. It is **not** causal story state.

### **5. Should scenes be first-class story records?**

Yes.

Make scenes first-class story-local records because Story Explorer, validation, refresh, search, branch maps, and prose attach all need a stable object to point at.

But keep the record narrow. A scene record should not become a new state engine.

Recommended `SCN` responsibilities:

* `id`  
* `story_id`  
* `branch_id`  
* `pg_ids`  
* `start_page_id`  
* `end_page_id`  
* `previous_scene_id`  
* `status`  
* `title`  
* `slug`  
* `scene_purpose`  
* `boundary_rationale`  
* `choice_surface_page_id`  
* `emitted_choice_ids`  
* `prose_plan_path`  
* `prose_path`  
* `receipt_path`  
* optional `source_pg_fingerprint` for advisory freshness

Do not put beat-by-beat prose instructions in the YAML. Put those in the scene plan.

### **6. How should scene ranges be selected?**

Use **automatic suggestions plus manual override**.

Default automatic boundary suggestions:

* Start at root or after the prior scene’s end.  
* Continue while POV, location, time continuity, cast, and scene purpose remain coherent.  
* Include multiple continue/wait PGs when they are one dramatic exchange.  
* End at a meaningful current decision surface.  
* End on time jump, location jump, POV shift, major cast reset, purpose reset, or terminal surface.  
* Prefer ending at the latest playable PG so the reader sees one clear current choice surface.

Manual override is essential because scene boundaries are craft judgments.

### **7. Should a scene span multiple choice surfaces?**

A scene may span multiple **historical** choice surfaces on one committed branch path, but it must not span sibling alternatives.

Rules:

* Allowed: contiguous PGs on one branch path.  
* Allowed: PGs that include decisions already made earlier in the branch.  
* Allowed: multiple continue-or-pause PGs.  
* Allowed with caution: multiple historical player choice surfaces, if they are already resolved on this branch.  
* Not allowed: sibling alternatives in one scene.  
* Reader-facing playable choices: only the final scene-ending choice surface.

This preserves branching clarity.

### **8. What does scene-first Story Explorer mean?**

Main reader navigation should be scenes, not PGs.

A scene page should show:

1. Rendered scene prose first.  
2. Scene-ending choices second.  
3. Scene metadata quietly.  
4. PG x-ray as a collapsible layer.

PGs become subunits inside a scene.

### **9. What happens to prose attach?**

`branching-story-prose-attach` should become `branching-story-scene-prose-attach`.

It validates one scene prose file against one scene record, one scene plan, and all included PGs.

It should not mutate story state.

### **10. Should hashes be dropped?**

Drop the plan-hash contract.

Keep PG state hashes only if they are genuinely catching state corruption. Remove plan hashes from the PG state hash payload. Scene plans and scene prose should be editable without invalidating authoritative story state.

The current hook already treats plan-hash drift as advisory, which is the correct direction.

### **11. What validators become obsolete or need redesign?**

Page-plan validators should mostly die or be redesigned as scene validators. Details are in §12 below.

### **12. What should the new skills be?**

Recommended final skill set:

* `branching-story-bootstrap` — state only.  
* `branching-story-turn-cycle` — state only.  
* `branching-story-scene-plan` — select or refresh a scene range and write novelist-facing plan.  
* `branching-story-scene-prose-attach` — validate and attach rendered scene prose.  
* `branching-story-health-audit` — updated for scene/PG consistency.

A separate `branching-story-scene-boundary` helper is optional, but I would not start there. Boundary suggestion can live inside `scene-plan` until it gets complex.

### **13. How should the renderer-facing scene plan be structured?**

The renderer-facing body must be zero-ID, zero-hash, zero-validator, zero-schema, zero-lifecycle.

Recommended structure appears in §9.

### **14. How should PGs relate to scene prose?**

PGs are causal ticks. Scene prose is a non-authoritative literary rendering over PG ranges.

Scene prose can reveal and dramatize state, but cannot create state.

### **15. How should choice surfaces work?**

Only the final PG’s emitted choices are currently playable in the scene reader. Intermediate choices are historical/x-ray.

### **16. What docs need updates?**

All current page-plan and prose-renderer surfaces need contract updates. Details are in §13.

---

## **7. Responsibility split**

### **State-turn skills**

#### **`branching-story-bootstrap`**

Responsibilities:

* Create story kernel.  
* Create initial branch.  
* Create root event/page.  
* Create initial story records.  
* Create initial CHCs.  
* Validate causal state.

Outputs:

STORY_KERNEL.md  
_source/** records  
_source/events/SE-1.yaml  
_source/pages/PG-1.yaml  
_source/choices/CHC-*.yaml  
INDEX.md or equivalent story listing update

Non-responsibilities:

* No page prose plan.  
* No scene prose plan unless explicitly invoked as a separate phase.  
* No renderer-facing prose prompt.

#### **`branching-story-turn-cycle`**

Responsibilities:

* Resolve selected choice, write-in, or initiative driver.  
* Select or JIT commitment block.  
* Apply state delta.  
* Write SE.  
* Write PG.  
* Emit CHCs.  
* Validate state.

Outputs:

_source/events/SE-N.yaml  
_source/pages/PG-N.yaml  
_source/<state-records>/*.yaml  
_source/choices/CHC-*.yaml  
validation trace

Non-responsibilities:

* No `pages-prose-plans/PG-N.md`.  
* No renderer plan.  
* No prose continuity packet.  
* No STCHAR renderer packet.

### **Scene-plan skill**

#### **`branching-story-scene-plan`**

Inputs:

* `world_slug`  
* `story_slug`  
* `branch_id` or parent/latest PG  
* optional `start_page_id`  
* optional `end_page_id`  
* optional manual boundary override  
* optional refresh mode

Responsibilities:

* Select a contiguous PG range on one branch path.  
* Create or supersede `SCN-N.yaml`.  
* Derive a novelist-facing scene plan from committed PGs.  
* Translate record-heavy causal state into prose-facing language.  
* Ensure body has no record IDs, hashes, schema language, validator language, patch language, or supersession language.

Outputs:

_source/scenes/SCN-N.yaml  
scene-prose-plans/SCN-N.md

Hard gates:

* PG range is contiguous.  
* PGs are on one branch path.  
* No sibling alternatives included.  
* End PG has a clear choice/continue/terminal surface.  
* Scene body is renderer-clean.  
* Scene plan contains all must-render causal beats in natural language.

### **Scene-prose attach skill**

#### **`branching-story-scene-prose-attach`**

Inputs:

* `world_slug`  
* `story_slug`  
* `scene_id`  
* optional prose path, default `scene-prose/SCN-N.md`  
* optional craft critic flag

Responsibilities:

* Load SCN record.  
* Load included PGs, SEs, CHCs, and active records needed for validation.  
* Validate scene prose against all included PGs.  
* Write scene prose receipt.  
* Update index/publication status.  
* Avoid mutating PG or story state.

Outputs:

scene-prose-receipts/SCN-N.yaml

Optional output:

* A non-authoritative publication/audit event, only if later proven useful. Default should be no state mutation.

### **Story Explorer**

Responsibilities:

* Present scenes as reader units.  
* Present PGs as x-ray units.  
* Present branch maps at scene level by default.  
* Keep page-level navigation for debugging, not reading.

---

## **8. Proposed artifact model and path conventions**

Recommended paths:

worlds/<world>/stories/<story>/  
 _source/  
   pages/  
     PG-1.yaml  
     PG-2.yaml  
   events/  
     SE-1.yaml  
     SE-2.yaml  
   choices/  
     CHC-1.yaml  
   scenes/  
     SCN-1.yaml

 scene-prose-plans/  
   SCN-1.md

 scene-prose/  
   SCN-1.md

 scene-prose-receipts/  
   SCN-1.yaml

Do not use `pages-prose-plans/` for new stories.

Do not create `pages-prose/PG-X.md` for new stories.

### **`SCN` vs `RU`**

I recommend `SCN`.

`RU` is more abstract and technically pure, but Story Explorer should speak the author’s and reader’s language. “Scene” is the concept you want the user thinking in. If later you need render units that are not scenes — prologues, interstitials, codices, recaps — add `render_kind`.

Recommended field:

render_kind: scene | prologue | interstitial | recap | codex

Default to `scene`.

---

## **9. Proposed scene/range model**

A scene is a contiguous render range over a single branch path.

Minimum semantic rules:

* `SCN.pg_ids` must be ordered and contiguous along `PG.branch_path`.  
* `SCN.start_page_id` is the first included PG.  
* `SCN.end_page_id` is the last included PG.  
* `SCN.choice_surface_page_id` normally equals `end_page_id`.  
* `SCN.emitted_choice_ids` normally equals the end PG’s emitted CHCs.  
* Intermediate PG choices are historical, not playable.  
* Scene prose can include several PG commitment blocks.  
* Scene prose cannot include sibling branches.  
* Scene prose cannot create state.

### **Default boundary policy**

A scene continues while these remain coherent:

* POV  
* time continuity  
* location  
* cast  
* dramatic purpose  
* active exchange/conflict  
* reader expectation

A scene ends when one of these changes materially:

* time jump  
* location jump  
* POV change  
* major cast shift  
* purpose reset  
* full player choice hinge  
* terminal surface  
* branch fork point where alternatives become reader-visible

### **PG-5 through PG-8 as sample range**

The uploaded artifacts strongly suggest a scene like:

id: SCN-2  
title: The Bench Negotiation  
branch_id: BR-1  
pg_ids: [PG-5, PG-6, PG-7, PG-8]  
start_page_id: PG-5  
end_page_id: PG-8  
choice_surface_page_id: PG-8

This scene contains four causal ticks but one literary exchange.

---

## **10. Proposed renderer-facing scene-plan structure**

The scene plan should be a clean novelist packet. The body should not contain record IDs. It should not look like Worldloom internals.

Recommended structure:

# Scene: <Title>

## Render Mission  
Write the next continuous scene in <POV/style>. The scene begins with <natural-language opening state> and ends when <natural-language stopping point>.

## What Changes in This Scene  
A short prose-facing summary of the emotional, relational, and practical turn.

## Where the Scene Begins  
Concrete starting image, cast positions, recent line/action in shared context.

## Where the Scene Must End  
The final dramatic condition and reader-facing choice/continue surface.

## Beat Chain  
Natural-language beats, each expressed as scene movement:  
- Beat 1...  
- Beat 2...  
- Beat 3...

No record IDs. No “state delta.” No “supersedes.” No “validator.”

## POV and Observer Firewall  
What the POV character can know, infer, misread, or not know.

## Cast and Voice  
Scene-local voice constraints for each speaking or strongly perceived character.

## Emotional Throughline  
How the pressure changes across the scene.

## Relationship Throughline  
How the relationship changes across the scene.

## Physical Continuity  
Location, bodies, objects, time of day, affordances, movement limits.

## Secrets and Forbidden Reveals  
What must remain unspoken, unconfirmed, or ambiguous.

## Choice Surface  
What the reader should understand is now available at the scene end.

## Style Guidance  
Concise scene-specific craft constraints:  
- no padding  
- no repetitive anchors  
- trust subtext  
- no explanation after dialogue  
- prose only

### **Do not inline the full craft contract every time**

The full prose craft contract should become a reusable renderer system prompt or reusable house-style preamble. The scene plan should include a short scene-specific craft reminder only.

The current “inline everything into every page plan” policy exists because every page render is a cold context. Scene rendering should move away from that prompt bloat, not preserve it under a new directory name.

---

## **11. Proposed Story Explorer scene-first UX**

### **Main reader view**

Default route:

/stories/:storySlug/scenes/:sceneId

Not:

/stories/:storySlug/pages/:pageId

A scene page should show:

1. Scene title.  
2. Rendered scene prose.  
3. Final scene-ending choice surface.  
4. Scene metadata.  
5. X-ray panel.

### **PGs as x-ray subunits**

Inside the scene x-ray:

Scene X-Ray  
 PG-5 — Ane answers with a probe  
   What changed here  
   Event  
   State delta  
   Active records  
   Emitted choices  
   Raw YAML

 PG-6 — Jon discloses  
 PG-7 — Ane prices the frame  
 PG-8 — Jon shows the money

PGs remain inspectable. They stop being the reader-facing unit.

### **Branch maps**

Default branch map should be scene-level:

SCN-1 → SCN-2 → SCN-3  
             ↘ SCN-4

A page-level map remains available as x-ray/debug.

### **Search**

Search should return:

1. Scenes first.  
2. Prose hits.  
3. PGs.  
4. Records.  
5. Raw artifacts.

When a search hit is inside PG data, Story Explorer should show the containing scene.

### **Choices**

If a scene includes multiple PGs, only the final PG’s choices are playable in the scene reader.

Intermediate choices can appear under:

X-Ray → Historical choice surfaces

Do not show multiple active choice sets in the main reader. That would confuse the current playable decision point.

### **Tabs**

Current “Plan & Prose” becomes:

Scene Plan & Scene Prose

Current page-level validation becomes:

Scene Receipt  
PG Validation Trace  
---

## **12. Proposed validation and integrity model**

### **New validation philosophy**

Validate hard where prose could corrupt reader understanding. Be advisory where prose is merely editable publication material.

Hard checks:

* Scene range is contiguous.  
* Scene range is one branch path.  
* Scene prose does not include record IDs or engine jargon.  
* Scene prose does not contradict included PGs.  
* Scene prose does not invent structural facts.  
* Scene prose does not reveal forbidden mysteries.  
* Scene prose respects POV knowledge.  
* Scene ending exposes the correct final choice/continue/terminal surface.  
* STCHAR/voice fidelity holds across the scene.

Advisory checks:

* craft quality  
* repetition  
* pacing  
* omitted minor beats  
* stale scene plan after user edits  
* prose hash drift

### **Hash recommendation**

Be blunt: **plan hash should go.**

The current plan-hash contract is not pulling its weight. It couples an editable prose-planning artifact to authoritative story state. That is the wrong dependency direction.

Recommended integrity model:

1. **Remove `plan.plan_hash` from PG.**  
2. **Remove `prose_plan_path` from PG.**  
3. Keep PG state validation focused on causal state.  
4. Keep `state_hash` only for PG snapshot replay if it remains useful.  
5. Do not include scene plan/prose hashes in PG state.  
6. In scene receipts, use advisory freshness fields only:  
   * included PG IDs  
   * included PG state hashes at attach time, if state hashes survive  
   * scene plan content hash, advisory only  
   * prose content hash, advisory only

Receipt drift should mean:

“This receipt may be stale relative to the current prose/plan.”

It should never mean:

“The story state is invalid.”

For a single-user creative workflow, Git history, world-index freshness, validators, and PG validation traces provide enough confidence. This is not a regulated audit system.

---

## **13. Validators, schemas, tools, and docs impact analysis**

### **Keep mostly unchanged**

These remain state-level and should survive:

* record schema compliance for SE/PG/CHC/state records  
* append-only / no in-place mutation for state records  
* branch isolation  
* recursive reference closure  
* observer firewall  
* expected witness coverage  
* storylet predicate DSL parsability  
* choice set noncollapse  
* turn-driver schema compliance  
* state snapshot integrity  
* state delta class integrity  
* STPLAN/STEMO lifecycle validators  
* STCHAR authority validators  
* world-index freshness checks

### **Delete**

Delete or retire these as page-plan-era artifacts:

* page-plan 19-section structural validators  
* page-plan verbatim section integrity  
* page-plan verbatim canonical sources  
* page-plan turn-driver consistency  
* page-plan active-pressure disposition table requirement  
* page-plan STCHAR packet integrity  
* page-plan body engine vocabulary validator as currently scoped  
* plan-hash guard for story markdown  
* hard plan-hash computation in PG validation

The current page-plan validators exist because the renderer artifact is polluted by engine state. Removing the polluted artifact removes the need for many of these validators.

### **Redesign for scene level**

Replace page-level checks with scene-level equivalents:

| Current surface | New surface |
| ----- | ----- |
| `prose-receipt.schema.json` | `scene-prose-receipt.schema.json` |
| `pages-prose-receipts/PG-X.yaml` | `scene-prose-receipts/SCN-X.yaml` |
| `required_event_rendered` | `included_pg_events_rendered` |
| `choice_consequence_visibility` | `final_scene_choice_surface_visibility` |
| `entity_status_consistency` | `scene_range_entity_status_consistency` |
| `invented_structural_fact` | `scene_range_invented_structural_fact` |
| `forbidden_mystery_resolution` | `scene_range_forbidden_mystery_resolution` |
| `prose_receipt_stchar_integrity` | `scene_prose_stchar_fidelity` |
| `prose_receipt_hash_integrity` | advisory scene receipt freshness |

### **Move hard gates to advisory**

These should not block state:

* craft critic  
* prose repetition  
* style drift  
* scene plan hash drift  
* prose hash drift

They may block publication status if you want, but not causal progression.

### **World-index changes**

World-index must add:

stories/<story>/_source/scenes/*.yaml  
stories/<story>/scene-prose-plans/*.md  
stories/<story>/scene-prose/*.md  
stories/<story>/scene-prose-receipts/*.yaml

The current enumerator only lists page prose/page plan/page receipt directories for story publication artifacts.

### **Story Explorer changes**

Add:

* scene list route  
* scene detail route  
* scene prose route  
* scene plan route  
* scene receipt route  
* scene branch map  
* scene search result type  
* PG x-ray under scene

Keep page routes as debug/x-ray, not main reader.

### **Docs to update**

Update these contract surfaces:

* `README.md`  
* `docs/WORKFLOWS.md`  
* `docs/FOUNDATIONS.md`  
* `.claude/skills/_shared-templates/story-state-contract.md`  
* `.claude/skills/_shared-templates/story-record-schemas.md`  
* `docs/prose-renderer-contract/*`  
* `branching-story-bootstrap`  
* `branching-story-turn-cycle`  
* `branching-story-prose-attach`  
* `branching-story-health-audit`  
* Story Explorer README/specs  
* validator README/schema docs  
* world-index docs  
* any archived spec references that still teach page-plan behavior

Archive docs should be historical evidence only. Do not preserve stale page-plan architecture for compatibility.

---

## **14. Risks and tradeoffs**

### **Risk: scene ranges become too large**

If a scene covers too many PGs, the scene plan can become another bloated prompt.

Mitigation: default boundary rules, max-soft range guidance, and manual override.

### **Risk: scene prose omits a causal beat**

Scene prose can compress, but it cannot skip load-bearing causality.

Mitigation: scene attach validates coverage of each included PG’s required event/effect.

### **Risk: final choice surface becomes confusing**

If a scene includes multiple PGs, readers may not know which choice is playable.

Mitigation: only final PG choices are shown in main UI; intermediate choices are x-ray only.

### **Risk: SCN becomes a second state engine**

If SCN records start carrying causal truth, Worldloom will recreate the problem.

Mitigation: SCN records only describe render-unit membership, status, paths, and provenance. PG/SE remain causal authority.

### **Risk: less deterministic traceability for prose**

Dropping plan hashes reduces strict coupling.

Good. That coupling was harmful. Keep advisory fingerprints and validation receipts. Do not let a creative scene plan become a state checksum dependency.

---

## **15. Open questions**

1. Use `SCN` or `RU` as the record prefix? I recommend `SCN`.  
2. Should scene records be append-only with supersession, or editable publication manifests? I recommend lightweight supersession for range/status changes, free editing for plan/prose.  
3. Should scene-prose attach emit an optional `SE` audit event? I recommend no by default.  
4. Should scene boundaries be stored as user-authored decisions or generated suggestions with acceptance? I recommend generated suggestion plus explicit acceptance/override.  
5. Should root `SCN-1` be created immediately at bootstrap or only when the user invokes scene planning? I recommend only when invoked, to keep bootstrap state-only.

---

## **16. What not to do**

Do not keep per-PG prose plans and merely make them shorter.

Do not split the current page plan into “internal page packet” and “renderer page packet” and stop there. That still preserves the wrong prose unit.

Do not make turn-cycle wait for scene prose.

Do not parse prose as future state authority.

Do not put record IDs, hashes, schema fields, validator labels, patch-engine language, lifecycle language, or supersession language in the scene-plan body.

Do not let a scene span sibling alternatives.

Do not expose multiple active choice surfaces in the reader view.

Do not preserve plan hashes because they exist.

Do not keep Story Explorer page-first and add scenes as a side panel.

---

## **17. Acceptance criteria for future specs Claude Code will create**

Future specs should be accepted only if they satisfy these requirements:

1. `branching-story-bootstrap` produces no `pages-prose-plans/PG-1.md`.  
2. `branching-story-turn-cycle` produces no `pages-prose-plans/PG-N.md`.  
3. PG records remain authoritative causal ticks.  
4. PG records no longer require `prose_plan_path`.  
5. PG records no longer include a plan hash coupled to renderer-plan bytes.  
6. A first-class scene/render-unit record exists.  
7. Scene records map contiguous PG ranges on one branch path.  
8. Scene records cannot include sibling alternatives.  
9. Scene prose plans live under `scene-prose-plans/`.  
10. Scene prose lives under `scene-prose/`.  
11. Scene prose receipts live under `scene-prose-receipts/`.  
12. Scene plan bodies contain no record IDs, hashes, schema language, validator language, patch-engine language, lifecycle language, or supersession language.  
13. Scene attach validates against every included PG.  
14. Scene attach does not mutate PG/story causal state.  
15. Story Explorer’s main reader navigation is scene-first.  
16. PGs are available as x-ray subunits under scenes.  
17. Scene reader shows only the final scene-ending choice surface as playable.  
18. Page-level prose attach and page-level prose routes are retired or relegated to legacy/debug.  
19. World-index indexes `_source/scenes`, `scene-prose-plans`, `scene-prose`, and `scene-prose-receipts`.  
20. Page-plan validators are deleted or redesigned; they are not preserved as zombie gates.

The architectural north star is simple:

**PGs decide what happened. Scenes decide how the reader experiences what happened.**

