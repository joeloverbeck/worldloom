**Status**: COMPLETED

# **1. Executive verdict**

**Adopt STCHAR.** Worldloom needs a first-class story-local character authority layer, not better `CHAR-*` retrieval alone. The current story system has strong temporal state records—`BEL`, `STINT`, `SREL`, `STPLAN`, `STEMO`, `STSTAT`, `THR`, `OBL`, `CNSQ`, and friends—but no stable story-facing authority for persona, voice, appraisal, pressure behavior, perception, and relationship-specific conduct. The uploaded mission correctly identifies the gap and explicitly supersedes the earlier recommendation against a story-local character record.

The architecture should be:

World CHAR-* dossier  
 world-level, story-agnostic, rich canon/proposal artifact  
       |  
       | one-time / on-demand distillation by allowed skills only  
       v  
Story STCHAR-*  
 story-local, branch-aware character authority  
 consumed by bootstrap, turn-cycle, page-plan, prose-attach, health-audit  
       |  
       v  
Temporal state records  
 BEL / STINT / SREL / STPLAN / STEMO / STSTAT / THR / OBL / CNSQ / CHC / SLT

The clean design is a **hybrid markdown + YAML-frontmatter artifact** stored inside the story bundle:

worlds/<world_slug>/stories/<story_slug>/story-characters/STCHAR-<integer>.md

`STCHAR-*` should be indexed and retrievable by MCP as `story_character_authority_record`, patch-engine-managed as a hybrid story-bundle authority artifact, included in `PG.state_snapshot.active_records.STCHAR`, and bound from `STENT.bound_stchar_id`. `STENT.bound_char_id` should be removed for new bundles. No migration is needed.

The most important rule: **after STCHAR exists for a story, normal story runtime must not read world `CHAR-*` for characterization.** The only skills that may read `CHAR-*` for character authority are bootstrap during STCHAR creation, the new dedicated STCHAR authoring/regeneration skill, and explicit promotion/adjudication workflows where world provenance is the subject rather than runtime characterization.

---

# **2. Current-state repo findings**

## **2.1 FOUNDATIONS already supports STCHAR in spirit**

`FOUNDATIONS.md` is very clear that Worldloom should not operate from raw prose or loose memory. Agents are expected to use context packets and targeted retrieval, and story bundles are a derived per-world layer stored under `worlds/<world_slug>/stories/<story_slug>/`. Story records are atomized under `_source/<class>/<ID>.yaml`; direct-write markdown is reserved for human-facing story artifacts such as `STORY_KERNEL.md`, `INDEX.md`, page plans, prose, and audits.

`FOUNDATIONS.md` also insists on schema-minimalism: every story record field must be load-bearing for replay, validation, retrieval, page-plan rendering, audit, or skill logic. It rejects act structure and global drama-manager logic; story state must be present-causal, not pre-scripted narrative shape. That is exactly why STCHAR should be a persona/performance authority, not an arc engine.

The current story ID-class list in `FOUNDATIONS.md` does **not** include `STCHAR`, and ID allocation is through `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`. Therefore STCHAR must be added as a story-scoped ID class and allocation target.

## **2.2 The existing investigation diagnosed the right gap**

The active report `reports/story-character-dossier-retrieval-concerns.md` shows that bootstrap accepts selected cast as `CHAR-*`, verifies them, creates `STENT` records with `bound_char_id`, and writes `STORY_KERNEL.md.cast_bind_list`. Turn-cycle later derives world seeds from active `STENT.bound_char_id`. But `STENT` stores only a pointer plus `role_in_story`; it does not carry voice, appraisal, pressure behavior, persona contradictions, or relationship-specific conduct.

That report also notes that upgraded `CHAR-*` dossiers can be very large, while story context delivery tends to provide previews unless the skill explicitly follows up. The risk is a false sense of authority: the story record points at a character dossier, but runtime and page-plan generation do not necessarily have enough dossier content to reproduce voice or behavior.

The report’s Option C—story-local character projection with source `CHAR`, hash, dramatic core, pressure behavior, voice, etc.—is very close to STCHAR. Its earlier hesitation was schema-minimalism. The user’s mission resolves that hesitation: STCHAR is load-bearing because it is consumed by retrieval, validation, page-plan packets, prose-attach, health-audit, and temporal-state derivation.

The triage doc confirms the same mechanical problem: story-task full-body delivery does not include `character_record`; body previews are small; bootstrap does not require per-CHAR deep retrieval; turn-cycle seeds from `STENT.bound_char_id` but does not load the dossier body; health audit does not check dossier drift or retrieval quality.

## **2.3 The shared story contract has no STCHAR surface**

The shared story-state contract currently lists story records such as `STENT`, `STSTAT`, `BEL`, `SREL`, `STPLAN`, `STEMO`, `SLT`, `CHC`, `PG`, and `SE`, but no `STCHAR`. The predicate DSL includes `record_active`, but its examples and record-class surface do not include STCHAR.

The contract’s `SE.record_introductions[]` classes currently allow `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `SREL`, `STPLAN`, and `STEMO`, but not `STCHAR`. The current page-plan minimum contract has sections for cast/status, beliefs/relationships, plans, emotions, material reality projection, and style/register notes, but no mandatory character-authority packet.

The shared record schemas show the same issue. `PG.state_snapshot.active_records` lacks `STCHAR`; `SE.promotion_claims[].source_record` lacks it; `BEL.basis.access_records[]` is epistemic and likewise lacks STCHAR.

Most importantly, `STENT` is currently:

id: STENT-<integer>  
story_id: STORY-<integer>  
created_at_page: PG-<integer>  
supersedes: STENT-<integer> | null  
display_name: <string>  
bound_char_id: CHAR-<integer> | null  
role_in_story: [...]

That is the thin pointer causing the problem.

## **2.4 Bootstrap and turn-cycle currently encourage split authority**

Bootstrap takes `selected_cast: [CHAR-*]` and writes `cast_bind_list` entries as `{char_id, stent_id, role_in_story}`. It does not create an intermediate story-local character authority artifact.

Turn-cycle can create a fresh `STENT` when a character enters as an actor, witness, information source, pressure driver, choice target, relationship participant, or obligation participant. It explicitly says story skills do not chain. That matters: if turn-cycle cannot invoke a sibling skill, it needs a deterministic “STCHAR required before commit” path rather than quietly creating a complex STENT without authority.

Turn-cycle pre-flight derives world-scope seed nodes from active `STENT.bound_char_id`. That is exactly the old authority path STCHAR should replace. Story-local records should be loaded through `story_slug` and targeted retrieval, not world-scope seeds.

## **2.5 Page plans are currently self-contained, but character authority is too weak**

The current page-plan contract is strong in many ways: it requires event intent, world/canon anchors, active cast/status, relationships/beliefs, unresolved debts, visible affordances, choices, and validation trace. But its character-specific material is scattered across optional or indirect sections. “Cast material reality projection” and “Style/register notes” are not a substitute for a stable character voice and behavior authority.

`CHC.grounded_in.records[]` must cite active records and is part of choice materiality, but the allowed record set does not include STCHAR, so a choice whose surface wording or availability depends on persona cannot currently ground itself in the stable character authority.

## **2.6 Prose-attach validates state fidelity, not character fidelity**

`branching-story-prose-attach` treats the committed page plan as the authority for rendered prose and checks hash integrity, engine jargon, forbidden mystery leakage, required event rendering, choice consequence visibility, entity status consistency, invented structural facts, unauthorized canon claims, and a craft critic verdict. It has no profile/voice fidelity check against a character authority.

The existing prose receipt schema likewise has no STCHAR voice/profile-fidelity section.

## **2.7 Health audit has no STCHAR phase**

Health audit already checks replay, branch isolation, debt health, belief/visibility, DA health, mystery/canon safety, continuation, causal dependency, canon baseline drift, mechanism health, STPLAN/STEMO health, and active-state underuse. It does not check missing character authority, stale profile references, page-plan character packets, voice-fidelity receipt failures, or direct `CHAR-*` leakage in story outputs.

The active-state-underuse phase is a useful model: STCHAR checks should report present-state underuse and grounding failures, not impose plot shape.

## **2.8 Promotion workflows should not auto-promote STCHAR**

`story-fact-promotion-to-canon` has a `character_outcome` source kind currently rooted in `STENT`, with `STSTAT` as evidence. It explicitly treats `STPLAN` and `STEMO` as explanatory context, not promotion source classes. STCHAR should follow the same pattern: useful evidence context, not automatic canon.

`story-promotion-closeout` supersedes story-local records only when schema fields actually change and never mutates world canon. STCHAR closeout handling should follow that ledger-first, story-local-only discipline.

## **2.9 Machine-facing surfaces do not know STCHAR**

The context-packet contract’s `story_bundle_context` summarizes active intentions, statuses, beliefs, relationships, locations, objects, artifacts, plans, emotions, threads, branch metadata, `cast_bind_list`, and mystery evidence chains. It has no STCHAR summary or packet projection. It also lists story-task full-body candidates, and `character_record` is not included for story-turn-cycle full-body delivery.

The machine-facing layer lists many story-bundle edge types—`page_active_record`, `choice_grounded_in`, `plan_derived_from`, `emotion_derived_from`, etc.—but no character-authority edge such as `stent_character_authority` or `stchar_source_character`.

`world-index` node types include `character_record`, `story_entity_record`, `story_plan_record`, `story_emotion_record`, and many other story classes, but no `story_character_authority_record`.

`world-mcp` `list_records` supports hybrid `character_record` and many story-bundle record types, but no STCHAR record type.

Patch-engine ID allocations, operation kinds, and story-record specs likewise have no `stchar_ids`, `create_stchar_profile`, or STCHAR hybrid write path.

## **2.10 Validator schemas currently block STCHAR**

`story-entity.schema.json` still permits `bound_char_id` and has no `bound_stchar_id`; `additionalProperties: false` means STCHAR binding would currently be rejected.

`story-page.schema.json` has no `active_records.STCHAR` bucket.

`story-choice.schema.json` does not allow STCHAR in `CHC.grounded_in.records[]`.

`story-event.schema.json` does not allow STCHAR in `record_introductions[]`, `state_delta.create/supersede/close`, or promotion source records.

The test fixture `story-bundle-fixture.ts` still creates `STENT-2` with `bound_char_id: CHAR-1` and `STENT-3` with `bound_char_id: null`, which proves current tests will need replacement rather than migration shims.

---

# **3. Research findings and architectural influence**

## **3.1 RAG supports explicit retrieved authority, not model memory**

Retrieval-augmented generation research argues that parametric model memory is not enough when outputs require precise, updateable, attributable knowledge; RAG combines model memory with explicit retrieved knowledge and improves specificity, factuality, and updateability.

For Worldloom, this means a story skill should not be expected to “remember” a nuanced `CHAR-*` dossier once it has been previewed or seen in an earlier phase. The authority must be present in the immediate retrieved context or explicitly projected into the page plan.

## **3.2 Long context is not a reliable substitute for structured packets**

“Lost in the Middle” shows that long-context models can underuse relevant information when it is buried in the middle of long inputs, even when the information is technically present.

This strongly supports STCHAR’s storage and retrieval shape: do not dump an entire 120k-character world dossier into story runtime and hope voice emerges. Build a story-facing authority with stable sections and page-plan projections, then require those projections for relevant characters.

## **3.3 Generative agents need memory, reflection, and planning surfaces**

The Generative Agents architecture stores experience in natural language, synthesizes reflections, retrieves relevant memories, and uses those retrieved surfaces for planning and believable behavior. Its core lesson is not “make every character autonomous”; it is that believable behavior depends on explicit memory/reflection/planning structures, not generic prompt vibes.

STCHAR should therefore be the stable reflective/persona layer, while `BEL`, `STINT`, `STPLAN`, and `STEMO` remain the present-state memory/planning/appraisal layer. STCHAR should not replace temporal records; it should discipline their creation.

## **3.4 Persona dialogue research supports a dedicated voice bible**

Persona-based dialogue research explicitly targets speaker consistency and style consistency. Li et al. model speaker persona and speaker-addressee interaction because generic dialogue models otherwise lose individual voice.

PersonaChat research similarly frames open-domain chit-chat as lacking specificity and consistent personality unless profile information is provided.

For Worldloom, the page plan must include explicit voice material for every speaker/viewpoint character. Merely citing `STENT-2` or `CHAR-1` is not enough.

## **3.5 Interactive narrative research supports character-grounded planning, not plot rails**

Narrative-planning work emphasizes that audience comprehension depends both on causal plot progression and characters perceived as intentional agents. Character intentions are not decorative; they make events legible.

Façade is a useful contrast case: it integrated believable agents with interactive plot management, but Worldloom’s `FOUNDATIONS.md` rejects global drama-manager/act-structure logic. The lesson to borrow is character-grounded behavior, not centralized plot rails.

## **3.6 Hybrid markdown + frontmatter is the right storage pattern**

Hybrid markdown with YAML frontmatter is a mature pattern for documents that need both machine-readable metadata and human-readable bodies; Jekyll’s frontmatter convention is a canonical example.

JSON Schema is still the right tool for validating the structured metadata and deterministic constraints.

Therefore STCHAR should be hybrid markdown with schema-validated frontmatter and validator-auditable section anchors. Pure YAML/JSON would be hostile to long voice/performance prose; direct-write markdown without frontmatter/schema would be too loose for replay, hashes, supersession, and MCP retrieval.

---

# **4. Proposed STCHAR concept and authority model**

## **4.1 Definition**

**STCHAR** is a story-local character authority artifact. It is the stable story-facing authority for:

* persona core;  
* wound, appetite, self-mythology, contradiction, refusals;  
* emotional appraisal rules;  
* pressure behavior;  
* voice/dialogue rendering;  
* perception and embodiment;  
* agency and planning tendencies;  
* relationship-specific conduct;  
* derivation guidance for temporal state records;  
* prose rendering constraints and anti-generic failure modes.

It is not world canon. It is not a plot arc. It is not an autonomous character agent. It is not a replacement for `BEL`, `STINT`, `SREL`, `STPLAN`, `STEMO`, or `STSTAT`.

## **4.2 Authority hierarchy**

World canon / CHAR-* source authority  
 - source truth about the character in the world  
 - story-agnostic  
 - may be read only by bootstrap, STCHAR authoring, and explicit promotion/adjudication flows

STCHAR-* story-local authority  
 - operational source for story characterization  
 - active in the story branch  
 - consumed by story runtime, page plan, prose attach, health audit

Temporal story records  
 - current beliefs, intentions, plans, emotions, relationships, status, debts  
 - derived from current events plus STCHAR persona/appraisal/pressure guidance

Page plan STCHAR packets  
 - the external prose writer’s only source for character behavior and speech  
 - copied or projected from STCHAR

## **4.3 Who may read `CHAR-*`**

Allowed:

.claude/skills/branching-story-bootstrap  
 only during STCHAR creation before meaningful story state exists

.claude/skills/story-character-profile  
 create/regenerate STCHAR from CHAR or story-local inputs

story-fact-promotion-to-canon / story-promotion-closeout  
 only when CHAR provenance or world-canon adjudication is explicitly in scope

branching-story-health-audit  
 only in an explicit optional source-drift/provenance mode, not normal runtime health

Forbidden for normal characterization:

branching-story-turn-cycle  
branching-story-prose-attach  
commitment-block-authoring  
branching-story-health-audit normal structural/prose modes  
normal page-plan authoring  
normal choice generation  
normal STPLAN/STEMO/BEL/SREL generation

Those skills consume STCHAR.

---

# **5. Storage-shape recommendation**

## **5.1 Recommendation**

Use **patch-engine-managed hybrid markdown + YAML frontmatter**:

worlds/<world_slug>/stories/<story_slug>/story-characters/STCHAR-<integer>.md

Node type:

story_character_authority_record

MCP record type:

story_character_authority_record

ID class:

STCHAR

Allocation:

mcp__worldloom__allocate_next_id(world_slug, "STCHAR", story_slug=<story_slug>)

## **5.2 Why hybrid markdown is best**

STCHAR must contain substantial prose sections: voice bible, pressure behavior, perception, relationship conduct, examples, anti-generic constraints, and page-plan-ready text. These sections need to be readable, editable, and copyable by authoring skills. Markdown is better for that than YAML strings.

But STCHAR also needs deterministic frontmatter for:

* ID and story/world scope;  
* source provenance;  
* source `CHAR-*` hash;  
* supersession;  
* active/retired status;  
* bound `STENT` ids;  
* profile and voice hashes;  
* section hashes;  
* schema version;  
* validation and retrieval.

Hybrid markdown gives both.

## **5.3 Alternatives rejected**

| Alternative | Verdict | Reason |
| ----- | ----- | ----- |
| Pure YAML in `_source/story-characters/STCHAR-*.yaml` | Reject | Long voice/prose sections become unreadable YAML blobs; page-plan projection gets worse. |
| Pure JSON | Reject | Good for validation, bad for authoring; too hostile to rich prose and examples. |
| Direct-write markdown only | Reject | Too loose for hashes, ID allocation, supersession, resolver integrity, and validation. |
| Paired `STCHAR.md` + `_source/STCHAR.yaml` manifest | Reject | Split authority creates sync drift and doubles validator burden. |
| Reusing world `CHAR-*` directly | Reject | Violates story/world separation and keeps the existing retrieval failure mode. |

## **5.4 Active records or parallel authority layer?**

**Include STCHAR in `PG.state_snapshot.active_records.STCHAR`.**

Reason: STCHAR is branch-local active authority. Supersession, retirement, replay, page-plan hash validation, and CHC/STPLAN/STEMO grounding all need to know which STCHAR profile was active on a given page. A parallel `character_authority` layer would add schema complexity and replay ambiguity. `active_records` already expresses “records active on this page,” and STCHAR is active authority.

---

# **6. STCHAR schema/template**

## **6.1 File path**

worlds/<world_slug>/stories/<story_slug>/story-characters/STCHAR-<integer>.md

## **6.2 Frontmatter schema**

Candidate frontmatter:

---  
id: STCHAR-1  
story_id: STORY-1  
story_slug: opening-bells  
world_slug: seeded

source_kind: world_char        # world_char | story_local | hybrid | regenerated  
source_char_id: CHAR-1         # CHAR-<integer> | null  
source_char_hash: "sha256:..." # null when no source CHAR  
source_char_sections_used:  
 - frontmatter  
 - body.Identity  
 - body.Voice  
 - body.Relationships

story_local_inputs_used:  
 - SE-4  
 - BEL-9  
 - SREL-2

generated_at_page: story_bootstrap # story_bootstrap | PG-<integer> | null  
created_by_skill: branching-story-bootstrap  
created_at: "2026-05-20T00:00:00Z"

supersedes: null              # STCHAR-<integer> | null  
superseded_by: null           # STCHAR-<integer> | null  
status: active                # active | superseded | retired

bound_stent_ids:  
 - STENT-1

profile_revision: 1  
body_schema_version: stchar.v1

profile_hash_algorithm: sha256_normalized_stchar_v1  
profile_hash: "sha256:..."  
voice_block_hash: "sha256:..."  
page_packet_hash: "sha256:..."

section_hashes:  
 story_facing_identity: "sha256:..."  
 source_distillation: "sha256:..."  
 stable_persona_core: "sha256:..."  
 emotional_appraisal_map: "sha256:..."  
 pressure_behavior: "sha256:..."  
 voice_bible_dialogue_authority: "sha256:..."  
 page_plan_voice_block: "sha256:..."  
 perception_and_embodiment: "sha256:..."  
 agency_and_planning_tendencies: "sha256:..."  
 relationship_specific_behavior: "sha256:..."  
 story_state_derivation_guide: "sha256:..."  
 prose_rendering_constraints: "sha256:..."  
 validation_audit_anchors: "sha256:..."  
---

Hash rules:

profile_hash  
 sha256 over normalized body + load-bearing frontmatter  
 excludes profile_hash, voice_block_hash, page_packet_hash, section_hashes,  
 status, superseded_by, and other mutable lifecycle fields

voice_block_hash  
 sha256 over normalized exact text of "## 7. Page-Plan Voice Block"

page_packet_hash  
 sha256 over canonical page-plan packet projection:  
   story-facing identity summary  
   relevant persona core  
   voice block  
   pressure/appraisal selectors  
   relationship conduct selectors  
   prose constraints

## **6.3 Body template**

# STCHAR-1: <Display Name>

## 1. Story-Facing Identity

### Who this person is in this story  
<Story-local identity. Not a full world dossier.>

### Local dramatic function  
<What function they serve in this premise without turning them into a plot rail.>

### Non-interchangeability constraints  
<What must remain true for this person not to become generic or swappable.>

## 2. Source Distillation

### Source material used  
<List source CHAR sections, story-local records, user inputs, page evidence.>

### Source material omitted  
<What was omitted because it is not story-relevant.>

### Transformations for story use  
<How world-level dossier material was reorganized for runtime, page planning, and prose.>

## 3. Stable Persona Core

### Wound  
<The old injury, lack, shame, or formative pressure that still shapes appraisal.>

### Appetite  
<What they hunger for beyond immediate goals.>

### Self-mythology  
<The story they tell themselves about who they are.>

### Irreconcilable contradiction  
<The contradiction that should repeatedly create non-generic choices.>

### Moral / psychological edge  
<Where they become dangerous, selfish, noble, cruel, evasive, or surprising.>

### Stable refusals  
<Things they strongly resist doing, admitting, seeing, or becoming.>

### Likely harms or betrayals under pressure  
<What damage they are likely to cause when cornered, tempted, or ashamed.>

## 4. Emotional Appraisal Map

### Threat  
<How this character appraises danger.>

### Desire  
<How desire changes perception and judgment.>

### Humiliation  
<What humiliation means to them and what it triggers.>

### Power  
<How offered/lost power feels and what it licenses.>

### Tenderness and intimacy  
<How they appraise care, vulnerability, sex, dependence, exposure.>

### Loss and shame  
<How grief, defeat, shame, and exposure convert into behavior.>

### Law, status, taboo, violence  
<Non-generic appraisal rules for institutional, social, taboo, and violent pressure.>

### Non-generic appraisal rules  
- <Rule 1>  
- <Rule 2>  
- <Rule 3>

## 5. Pressure Behavior

### Cornered  
<Behavior under no-exit pressure.>

### Tempted  
<What temptation looks like before they name it.>

### Humiliated  
<How they recover, retaliate, freeze, perform, lie, or confess.>

### Offered power  
<How they test, accept, refuse, or abuse power.>

### Protecting attachment  
<What they do when someone/something they care about is threatened.>

### Lied to  
<How they detect, ignore, punish, or exploit deception.>

### Caught lying  
<How their body, voice, logic, and tactics shift.>

### Desiring something forbidden  
<How they rationalize, conceal, act, or self-sabotage.>

### Threatened by authority  
<How status/law/institutional power changes them.>

### Confronted with tenderness or intimacy  
<How they handle being seen, wanted, pitied, touched, trusted.>

## 6. Voice Bible / Dialogue Authority

### Stable speaking style  
<Core voice in ordinary conditions.>

### Syntax and rhythm  
<Sentence length, punctuation feel, hesitation, compression, elaboration.>

### Education / class / register  
<Register, vocabulary, social codes, professional speech habits.>

### Preferred metaphors and image fields  
<What they compare things to.>

### Taboo words and avoided registers  
<Words, tones, abstractions, sentimentalities, or clichés they do not use.>

### When lying  
<Line shape, evasions, over-specificity, omissions.>

### When begging  
<How need appears in their syntax and tactics.>

### When threatening  
<How menace sounds from this person.>

### When grieving  
<What grief permits or forbids in their speech.>

### When aroused / ashamed / furious / afraid / excited  
<Distinct line-shape guidance for each state.>

### When hiding ignorance  
<How they mask, redirect, ask, bluff, or attack.>

### When dominating / submitting / seducing / protecting  
<Power-position speech shifts.>

### Forbidden generic voice patterns  
- <Pattern to avoid>  
- <Pattern to avoid>

### Relationship-specific speech shifts  
- **Toward STENT-2 / <name>**: <shift>  
- **Toward authority figures**: <shift>  
- **Toward dependents**: <shift>

### Sample line shapes  
These are line-shape examples, not mandatory lines.

- "<example>"  
- "<example>"

## 7. Page-Plan Voice Block

Copy or faithfully project this block into page plans whenever this character speaks,  
drives action, or shapes viewpoint narration.

<Stable concise-but-rich page-plan-ready voice and behavior authority. No artificial length cap.>

## 8. Perception and Embodiment

### Notices first  
<What attention goes to before thought catches up.>

### Overlooks  
<What they miss because of class, species, trauma, desire, profession, arrogance, fear.>

### Body and sensory style  
<Embodied perception, proprioception, pain, pleasure, fatigue, appetite, sex/status/social signals where relevant.>

### Profession / class / species / culture-shaped perception  
<How their background filters the world.>

## 9. Agency and Planning Tendencies

### How they choose  
<Decision pattern under ordinary and pressured conditions.>

### Plans they tend to form  
<Typical tactical shape; direct, social, evasive, bureaucratic, ritual, violent, etc.>

### Resources and leverage they reach for  
<Objects, people, secrets, law, charm, violence, ritual, status, debt, silence.>

### Fallback behavior  
<What they do when plan A fails.>

### What they will not consider  
<Hard constraints unless a major state change occurs.>

## 10. Relationship-Specific Behavior

### Active cast map  
- **STENT-2 / <name>**  
 - desire:  
 - fear:  
 - resentment:  
 - dependency:  
 - power imbalance:  
 - conduct:  
 - dialogue shift:  
 - likely SREL/BEL/STEMO/STPLAN implications:

### Relation-type defaults  
- **Authority figures**:  
- **Dependents**:  
- **Rivals**:  
- **Witnesses**:  
- **Lovers / desired people**:  
- **Enemies**:

## 11. Story-State Derivation Guide

### BEL derivation  
<What beliefs this character is prone to form, resist, deny, or misread.>

### STINT derivation  
<How stable appetite/refusal/pressure becomes immediate intention.>

### SREL derivation  
<How relationship axes should move when they are helped, exposed, humiliated, desired, betrayed.>

### STPLAN derivation  
<Which STCHAR sections must be consulted before creating or superseding plans.>

### STEMO derivation  
<Which appraisal rules must be consulted before creating or superseding emotions.>

### THR / OBL / CNSQ derivation  
<How this character creates threats, obligations, consequences, debts.>

### CHC grounding  
<When choices should cite this STCHAR as grounding.>

## 12. Prose Rendering Constraints

### Must show  
- <Observable behavior/prose rendering requirement>

### Must not imply  
- <Forbidden implication>

### Common failure modes  
- <Generic speech failure>  
- <Generic emotion failure>  
- <Generic plan failure>

### Anti-generic checklist  
- Does the line sound like this person rather than a competent NPC?  
- Does the emotion follow this character’s appraisal map?  
- Does the action use this character’s preferred leverage?  
- Does the narration notice what this character would notice?

## 13. Validation / Audit Anchors

### Required page-plan packet anchors  
- story_facing_identity  
- page_plan_voice_block  
- pressure_behavior  
- emotional_appraisal_map  
- relationship_specific_behavior  
- prose_rendering_constraints

### Deterministic validator anchors  
- profile_hash  
- voice_block_hash  
- page_packet_hash  
- bound_stent_ids  
- source_char_hash  
- supersedes/status

### Judgment-assisted audit anchors  
- voice fidelity  
- appraisal fidelity  
- pressure-behavior fidelity  
- relationship-conduct fidelity  
---

# **7. Skill-by-skill changes**

## **7.1 `branching-story-bootstrap`**

Bootstrap may still accept selected cast as `CHAR-*` for user convenience. But before creating meaningful story state, it must generate STCHAR profiles for every selected cast member.

New bootstrap sequence:

1. Load FOUNDATIONS and shared story contracts.  
2. Resolve selected_cast CHAR ids.  
3. For each selected CHAR:  
  a. retrieve full dossier or required sections through targeted MCP,  
  b. allocate STCHAR id,  
  c. draft STCHAR hybrid profile,  
  d. validate STCHAR frontmatter/body/hash requirements.  
4. Only after all STCHAR profiles pass:  
  a. create STENT records bound to STCHAR,  
  b. create initial BEL/STINT/SREL/STPLAN/STEMO/STSTAT/etc.,  
  c. create PG-1/SE-1/CHC/SLT as applicable,  
  d. write page plan with STCHAR-derived packets.  
5. If any required STCHAR generation fails, abort before story state creation.

Replace `STORY_KERNEL.md.cast_bind_list` shape:

cast_bind_list:  
 - stchar_id: STCHAR-1  
   stent_id: STENT-1  
   source_char_id: CHAR-1  
   role_in_story: [viewpoint, primary_actor]

Do not keep `char_id` as the operational authority. If provenance is desired in the kernel, call it `source_char_id` and mark it non-operational.

Initial records that are character-specific must cite or consume STCHAR:

BEL     consult STCHAR perception/appraisal only when belief formation is persona-shaped;  
       do not use STCHAR as epistemic access basis.

STINT   derive intent from STCHAR appetite/refusals/pressure behavior plus page premise.

SREL    include STCHAR in derived_from when stable relationship conduct is load-bearing.

STPLAN  include STCHAR in derived_from when plan shape follows persona/agency tendencies.

STEMO   include STCHAR in derived_from when appraisal map shapes emotion.

CHC     include STCHAR in grounded_in.records when choice wording/availability/pressure is character-specific.

PG      include active_records.STCHAR.

## **7.2 `branching-story-turn-cycle`**

Turn-cycle must load relevant active STCHAR profiles before:

* resolving player action;  
* selecting/JIT-authoring SLT;  
* creating/superseding `BEL`, `STINT`, `SREL`, `STPLAN`, `STEMO`;  
* generating choices;  
* writing page plans.

Turn-cycle pre-flight should stop deriving world `CHAR-*` seeds from `STENT.bound_char_id`. It should derive story-local character authority from active `STENT.bound_stchar_id` and `PG.state_snapshot.active_records.STCHAR`.

Complex new character rule:

If a new individual is persistent, speaking, viewpoint-relevant, action-driving,  
emotionally salient, relationship-bearing, information-bearing, pressure-driving,  
or a direct choice target, turn-cycle must not create a meaningful STENT without  
a bound active STCHAR.

Because skills do not chain, turn-cycle should use this workflow:

If new character is trivial background:  
 create STENT with role_in_story: [background], bound_stchar_id: null.

If new character is complex or persistent:  
 do not commit STENT/SE/PG.  
 emit a pre-commit routing result:  
   required_skill: story-character-profile  
   required_mode: create_story_local | create_from_world_char  
   proposed_display_name  
   emergence_context  
   source_records  
   intended_roles  
 User invokes story-character-profile.  
 User reruns turn-cycle after STCHAR exists.

This is cleaner than letting turn-cycle author a large STCHAR inline. Bootstrap is allowed to do that because bootstrap owns bundle creation; turn-cycle should remain a page-cycle skill.

## **7.3 New skill: `.claude/skills/story-character-profile/SKILL.md`**

Recommended name:

.claude/skills/story-character-profile/SKILL.md

Modes:

mode:  
 - create_from_world_char  
 - create_story_local  
 - regenerate_from_zero  
 - supersede_from_story_evidence  
 - retire

Inputs:

world_slug: <slug>  
story_slug: <slug>  
mode: create_from_world_char | create_story_local | regenerate_from_zero | supersede_from_story_evidence | retire  
source_char_id: CHAR-<integer> | null  
target_stchar_id: STCHAR-<integer> | null  
target_stent_ids: [STENT-<integer>]  
emergence_context_records: [SE-<integer>, PG-<integer>, BEL-<integer>, SREL-<integer>, ...]  
story_local_brief: <text>  
regeneration_reason: <text>  
supersession_policy: supersede # in-place mutation forbidden except lifecycle fields

Outputs:

story-characters/STCHAR-<integer>.md  
optional supersession lifecycle update to old STCHAR  
optional INDEX.md update  
optional audit note or repair instruction when page plans should be rebuilt

Hard gates:

1. Load `FOUNDATIONS.md`.  
2. Load shared story contract and STCHAR schema.  
3. Resolve story bundle.  
4. Resolve source `CHAR-*` only when mode needs it.  
5. Resolve story-local inputs.  
6. Allocate `STCHAR` id.  
7. Draft full STCHAR from zero.  
8. Validate section anchors and hashes.  
9. Confirm no world mutation.  
10. Submit patch plan/write hybrid file only after approval gate, matching existing skill pattern.

## **7.4 `commitment-block-authoring`**

Do not make commitment blocks character-specific plot rails. But STCHAR should be available as authoring context for actor-bound or JIT blocks.

Changes:

* Load active STCHAR summaries in pre-flight through `story_bundle_context`.  
* Retrieve full or projected STCHAR only when authoring a block whose behavior depends on a character profile.  
* Add STCHAR to predicate DSL only through `record_active(STCHAR-*)` and possibly `any_story_character_active(alias, role?, status?)` if global pool needs prefiltering. Do not add predicates like `character_has_wound` or `character_arc_stage`; those would violate schema-minimalism and create drama-manager creep.  
* SLT should not usually name STCHAR in global author-pool blocks. Branch-scoped/JIT blocks may cite STCHAR in rationale or preconditions when a move is lawful only because of character-specific profile authority.

## **7.5 `branching-story-prose-attach`**

Add deterministic and judgment-assisted character checks.

Deterministic checks:

stchar_packet_presence:  
 PASS | FAIL | NA

stchar_packet_hash_consistency:  
 PASS | FAIL | NA

stchar_active_authority_resolution:  
 PASS | FAIL | NA

char_authority_leak:  
 PASS | FAIL

Judgment-assisted checks:

profile_fidelity:  
 status: PASS | WARN | FAIL | NA  
 characters:  
   - stchar_id: STCHAR-1  
     stent_id: STENT-1  
     voice_fidelity: pass | minor_drift | major_drift | not_applicable  
     appraisal_fidelity: pass | minor_drift | major_drift | not_applicable  
     pressure_behavior_fidelity: pass | minor_drift | major_drift | not_applicable  
     relationship_conduct_fidelity: pass | minor_drift | major_drift | not_applicable  
     notes:  
       - <actionable note>  
     repair_recommendation: none | revise_prose | revise_page_plan | run_turn_cycle_repair | regenerate_stchar

The skill should judge against the page-plan packet first. Full STCHAR retrieval is needed only when the packet is missing, hash-inconsistent, or the prose receipt needs a deeper fidelity diagnosis.

## **7.6 `branching-story-health-audit`**

Add a new structural phase:

Phase 2m: STCHAR authority health

Checks:

stent_missing_required_stchar  
 Non-background STENT lacks bound_stchar_id.

stchar_unresolved  
 STENT or active_records.STCHAR references a missing STCHAR.

stchar_not_active_for_bound_stent  
 STENT is active but bound STCHAR is absent from page active_records.STCHAR.

stchar_superseded_still_active  
 Active page state references STCHAR.status=superseded or retired without explicit historical grandfathering.

page_plan_missing_stchar_packet  
 Page plan lacks required packet for viewpoint/speaker/actor/target/emotionally salient character.

page_plan_stchar_hash_mismatch  
 Packet hash does not match active STCHAR projection.

choice_character_grounding_missing  
 CHC is character-specific but lacks STCHAR in grounded_in.records.

plan_character_grounding_missing  
 STPLAN derives plan shape from persona but lacks STCHAR in derived_from.

emotion_character_grounding_missing  
 STEMO uses appraisal/pressure behavior but lacks STCHAR in derived_from.

split_character_authority  
 Story runtime/page plan/prose receipt references CHAR-* directly as character authority after STCHAR exists.

repeated_profile_fidelity_failure  
 Prose receipts show repeated WARN/FAIL for same STCHAR.

Normal health audit should **not** re-read world `CHAR-*` for drift. Optional source-drift mode may compare `source_char_hash` to current `CHAR-*`, but that is advisory and should not rewrite STCHAR automatically.

## **7.7 `story-fact-promotion-to-canon` and `story-promotion-closeout`**

STCHAR can be evidence context, not automatic world canon.

Changes:

* `character_outcome` source kind remains rooted in `STENT` / `STSTAT` outcomes.  
* STCHAR may be included in `proposal_evidence.supporting_story_character_profiles[]`.  
* Do not put STCHAR in `candidate.source_basis.derived_from[]` unless the canon-addition schema explicitly accepts story-local evidence there. The current promotion pattern keeps branch provenance in `proposal_evidence`, not in the CF candidate source basis.  
* If a story-local character should become a world-level `CHAR-*`, create a separate explicit promotion/adjudication workflow. Do not silently promote STCHAR to CHAR.

---

# **8. Contract, schema, validator, MCP, index, and patch-engine changes**

## **8.1 `FOUNDATIONS.md`**

Add STCHAR to story ID classes:

STCHAR — story-local character authority profile

Add a short principle:

### Story-Local Character Authority

World-level `CHAR-*` records remain story-agnostic. Story bundles that need  
character-specific behavior, voice, appraisal, or planning authority use  
story-local `STCHAR-*` profiles. Normal story runtime consumes active STCHAR  
profiles, not world CHAR dossiers. CHAR provenance may be recorded in STCHAR  
frontmatter; it must not be used as an operational shortcut in STENT, CHC, page  
plans, or prose receipts.

## **8.2 Shared story contract**

Add STCHAR to record inventory:

STCHAR — stable story-local character authority profile; hybrid markdown artifact under story-characters/.

Add to `record_active` lawful record classes.

Add to lifecycle write discipline:

STCHAR is a hybrid story-bundle authority artifact. It is created/superseded by  
patch-engine hybrid operations and participates in PG.state_snapshot.active_records.

Add to page-plan minimum contract as a mandatory section.

## **8.3 `story-record-schemas.md`**

Replace STENT schema:

id: STENT-<integer>  
story_id: STORY-<integer>  
created_at_page: PG-<integer>  
supersedes: STENT-<integer> | null  
display_name: <string>  
bound_stchar_id: STCHAR-<integer> | null  
role_in_story:  
 - viewpoint | player_proxy | primary_actor | opposing_actor | allied_actor  
   | authority | dependent | witness | information_source | pressure_source  
   | social_bridge | background

Rule:

bound_stchar_id may be null only when role_in_story is exactly [background].  
Any other role requires a resolvable active STCHAR.

Add `PG.state_snapshot.active_records.STCHAR`.

Add STCHAR to:

CHC.grounded_in.records[]  
SE.state_delta.create/supersede/close[]  
SE.record_introductions[].class  
SREL.derived_from[]  
STPLAN.derived_from[]  
STEMO.derived_from[]  
THR.derived_from[] where schema has it or future equivalent  
OBL/CNSQ derived_from/supporting records where schema has them

Do **not** add STCHAR to `BEL.basis.access_records[]` by default. Belief basis is epistemic access; STCHAR is persona authority. A belief may be shaped by STCHAR, but its access route should still cite observation, testimony, document, inference, DA/STOBJ/STLOC evidence, or authorial initialization.

Do **not** add STCHAR to `SE.promotion_claims[].source_record` for normal promotion. Use `proposal_evidence` instead.

## **8.4 JSON schemas**

### **`story-character-authority.schema.json`**

Create:

tools/validators/src/schemas/story-character-authority.schema.json

Minimum frontmatter schema:

{  
 "$schema": "https://json-schema.org/draft/2020-12/schema",  
 "$id": "https://worldloom.local/schemas/story-character-authority.schema.json",  
 "type": "object",  
 "required": [  
   "id",  
   "story_id",  
   "story_slug",  
   "world_slug",  
   "source_kind",  
   "source_char_id",  
   "source_char_hash",  
   "source_char_sections_used",  
   "generated_at_page",  
   "created_by_skill",  
   "supersedes",  
   "status",  
   "bound_stent_ids",  
   "profile_revision",  
   "body_schema_version",  
   "profile_hash",  
   "voice_block_hash",  
   "page_packet_hash",  
   "section_hashes"  
 ],  
 "properties": {  
   "id": { "type": "string", "pattern": "^STCHAR-(0|[1-9][0-9]*)$" },  
   "story_id": { "type": "string", "pattern": "^STORY-(0|[1-9][0-9]*)$" },  
   "story_slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },  
   "world_slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },  
   "source_kind": {  
     "type": "string",  
     "enum": ["world_char", "story_local", "hybrid", "regenerated"]  
   },  
   "source_char_id": {  
     "type": ["string", "null"],  
     "pattern": "^CHAR-(0|[1-9][0-9]*)$"  
   },  
   "source_char_hash": { "type": ["string", "null"] },  
   "source_char_sections_used": {  
     "type": "array",  
     "items": { "type": "string", "minLength": 1 }  
   },  
   "story_local_inputs_used": {  
     "type": "array",  
     "items": {  
       "type": "string",  
       "pattern": "^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|STPLAN|STEMO|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$"  
     }  
   },  
   "generated_at_page": {  
     "oneOf": [  
       { "type": "string", "const": "story_bootstrap" },  
       { "type": "string", "pattern": "^PG-(0|[1-9][0-9]*)$" },  
       { "type": "null" }  
     ]  
   },  
   "created_by_skill": { "type": "string", "minLength": 1 },  
   "created_at": { "type": "string", "minLength": 1 },  
   "supersedes": {  
     "type": ["string", "null"],  
     "pattern": "^STCHAR-(0|[1-9][0-9]*)$"  
   },  
   "superseded_by": {  
     "type": ["string", "null"],  
     "pattern": "^STCHAR-(0|[1-9][0-9]*)$"  
   },  
   "status": { "type": "string", "enum": ["active", "superseded", "retired"] },  
   "bound_stent_ids": {  
     "type": "array",  
     "items": { "type": "string", "pattern": "^STENT-(0|[1-9][0-9]*)$" }  
   },  
   "profile_revision": { "type": "integer", "minimum": 1 },  
   "body_schema_version": { "type": "string", "const": "stchar.v1" },  
   "profile_hash_algorithm": {  
     "type": "string",  
     "const": "sha256_normalized_stchar_v1"  
   },  
   "profile_hash": { "type": "string", "pattern": "^sha256:[0-9a-f]{64}$" },  
   "voice_block_hash": { "type": "string", "pattern": "^sha256:[0-9a-f]{64}$" },  
   "page_packet_hash": { "type": "string", "pattern": "^sha256:[0-9a-f]{64}$" },  
   "section_hashes": { "type": "object" }  
 },  
 "additionalProperties": false,  
 "allOf": [  
   {  
     "if": { "properties": { "source_kind": { "const": "world_char" } } },  
     "then": { "required": ["source_char_id", "source_char_hash"] }  
   },  
   {  
     "if": { "properties": { "source_kind": { "const": "story_local" } } },  
     "then": {  
       "properties": {  
         "source_char_id": { "type": "null" },  
         "source_char_hash": { "type": "null" }  
       }  
     }  
   }  
 ]  
}

### **`story-entity.schema.json`**

Replace `bound_char_id` with:

"bound_stchar_id": {  
 "type": ["string", "null"],  
 "pattern": "^STCHAR-[0-9]+$"  
}

Add conditional rule:

if role_in_story contains anything other than background,  
then bound_stchar_id must be string.

### **`story-page.schema.json`**

Add:

"STCHAR": {  
 "type": "array",  
 "items": { "type": "string", "pattern": "^STCHAR-[0-9]+$" }  
}

### **`story-choice.schema.json`**

Add `STCHAR` to `grounded_in.records[]`:

^(STCHAR|STENT|STSTAT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA|STPLAN|STEMO|CLK|STSEC|STQ|STINT|SF)-[0-9]+$

### **`story-event.schema.json`**

Update record ID pattern or all specific unions to include `STCHAR`.

Add `STCHAR` to `record_introductions[].class`:

"enum": ["CLK", "STSEC", "STQ", "THR", "STENT", "STCHAR", "SREL", "STPLAN", "STEMO"]

Add STCHAR triggers:

{  
 "class": "STCHAR",  
 "trigger": "selected_world_character_bootstrapped | persistent_character_enters_story | story_local_character_becomes_complex | character_profile_regenerated | character_profile_superseded"  
}

Add STCHAR to `state_delta.create/supersede/close` pattern.

Do not add STCHAR to `promotion_claims[].source_record` unless a separate explicit STCHAR-to-world-character promotion workflow is built.

## **8.5 Structural validators**

New validators:

stent_requires_stchar  
 Non-background STENT must have bound_stchar_id.

stchar_resolves  
 Every STENT.bound_stchar_id and active_records.STCHAR id resolves.

stchar_active_for_bound_stent  
 Every active non-background STENT’s bound STCHAR is active on the same PG.

stchar_supersession_integrity  
 No active page references superseded/retired STCHAR unless page predates supersession.

no_char_authority_in_story_runtime  
 Story runtime records/page plans/receipts do not cite CHAR-* as operational character authority.

page_plan_stchar_packet_presence  
 Required characters have STCHAR-derived packets.

page_plan_stchar_hash_consistency  
 Packet hashes match active STCHAR projection.

character_grounding_for_choices  
 CHC includes STCHAR when choice is character-specific.

character_grounding_for_plans_emotions  
 STPLAN/STEMO derived_from includes STCHAR when persona/appraisal profile is load-bearing.

Judgment-assisted checks should stay in prose-attach or health-audit reports, not deterministic validators:

voice truly sounds like STCHAR  
emotion subtly follows appraisal map  
viewpoint narration captures perception style  
relationship-specific conduct feels faithful

## **8.6 MCP/index changes**

Add node type:

"story_character_authority_record"

Add record type to `list_records`:

"story_character_authority_record"

Add resolver support:

get_record(record_id="STCHAR-1", story_slug=<story_slug>)  
get_record(record_id="STCHAR-1", story_slug=<story_slug>, section_path="body.Page-Plan Voice Block")  
get_records(record_ids=["STCHAR-1", "STCHAR-2"], story_slug=<story_slug>)  
get_records_field(record_ids=[...], field_path=["frontmatter", "voice_block_hash"])

Add story-bundle context summary:

active_story_characters:  
 - id: STCHAR-1  
   status: active  
   bound_stent_ids: [STENT-1]  
   source_kind: world_char  
   source_char_id: CHAR-1  
   profile_revision: 1  
   profile_hash: sha256:...  
   voice_block_hash: sha256:...  
   page_packet_hash: sha256:...  
   packet_preview: <short preview>

Add optional focused projection tool:

mcp__worldloom__get_story_character_packet(  
 world_slug,  
 story_slug,  
 stchar_id,  
 packet_kind = "page_plan" | "voice" | "authority_summary" | "full"  
)

This is not strictly required if `get_record(section_path=...)` is robust, but it would reduce repeated section-path logic in story skills.

Add edge types:

stent_character_authority  
 STENT.bound_stchar_id -> STCHAR

stchar_source_character  
 STCHAR.source_char_id -> CHAR

stchar_supersedes  
 STCHAR.supersedes -> STCHAR

stchar_bound_stent  
 STCHAR.bound_stent_ids[] -> STENT

Existing generic edges such as `page_active_record`, `choice_grounded_in`, `plan_derived_from`, and `emotion_derived_from` should accept STCHAR after union updates.

## **8.7 Patch engine**

Add ID allocation:

stchar_ids?: string[]

Add operation kinds:

"create_stchar_profile"  
"supersede_stchar_profile"  
"retire_stchar_profile"

Add hybrid writer modeled on `append_character_record`, but scoped to story bundle:

op: create_stchar_profile  
target_world: <world_slug>  
target_file: worlds/<world_slug>/stories/<story_slug>/story-characters/STCHAR-<id>.md  
payload:  
 story_slug: <story_slug>  
 stchar_frontmatter: <schema-validated frontmatter>  
 body_markdown: <markdown body>  
 filename: STCHAR-<id>.md

Add stale-index detection for:

stories/*/story-characters/STCHAR-*.md

Add `describe_envelope_schema` coverage for the new ops.

---

# **9. Page-plan changes**

The page plan is the external prose writer’s only authority. It must not ask the writer to infer voice or behavior from record IDs.

Replace or reorganize the current optional character/style sections with a mandatory STCHAR section:

## 16. STCHAR-derived character authority packets

For every viewpoint, speaker, major actor, direct target, emotionally salient  
character, or character whose behavior/voice materially shapes the page, include  
a packet below.

### Character packet: STENT-<id> / STCHAR-<id> / <display name>

**Required on this page because**:  
<viewpoint | speaker | major_actor | direct_target | emotionally_salient | behavior_shapes_page>

**Hashes**  
- STCHAR profile_hash: sha256:...  
- voice_block_hash: sha256:...  
- page_packet_hash: sha256:...

**Story-facing identity for this page**  
<Human-usable prose.>

**Voice/dialogue authority**  
<Copy or faithful projection of STCHAR §7 when speaking or viewpoint-rendering.>

**Relevant appraisal rules**  
<Only the pressure types relevant to this page. Include full detail when needed.>

**Relevant pressure behavior**  
<Cornered / tempted / humiliated / aroused / empowered / exposed / intimate / injured etc.>

**Relationship-specific conduct**  
<Only the active relationship conduct relevant to this page.>

**Perception and embodiment**  
<Required for viewpoint or internalized narration.>

**Agency and planning tendency**  
<Required for action-driving characters.>

**Prose must show**  
- ...

**Prose must not imply**  
- ...

**Anti-generic failure warnings**  
- ...

Rules:

* No word-count ceiling.  
* Use human prose, not IDs as shorthand.  
* Include voice block whenever the character speaks.  
* Include perception block whenever viewpoint or close narration is affected.  
* Include pressure behavior when the page threatens, tempts, humiliates, injures, arouses, exposes, empowers, or emotionally pressures the character.  
* Include relationship conduct when the page turns on a relationship.  
* Cite STCHAR hashes so prose-attach can validate packet consistency.

Keep existing sections:

§5 Active cast/status  
 still needed for physical/location/life/agency state.

§9 Relationships/beliefs  
 still needed for temporal SREL/BEL state.

§9b Plans  
 still needed for temporal STPLAN state.

§9c Emotions  
 still needed for temporal STEMO state.

§17 Style/register notes  
 keep for page-level prose style, not character voice authority.  
---

# **10. Prose-attach voice/profile fidelity design**

## **10.1 Deterministic receipt additions**

Add to prose receipt:

stchar_authority:  
 required_packets:  
   - stent_id: STENT-1  
     stchar_id: STCHAR-1  
     reason: [speaker, major_actor]  
     packet_present: true  
     active_in_snapshot: true  
     profile_hash_expected: sha256:...  
     profile_hash_observed: sha256:...  
     voice_block_hash_expected: sha256:...  
     voice_block_hash_observed: sha256:...  
     page_packet_hash_expected: sha256:...  
     page_packet_hash_observed: sha256:...  
     deterministic_verdict: PASS  
 char_authority_leak:  
   verdict: PASS  
   notes: []

Fail conditions:

packet missing  
STCHAR not active in PG snapshot  
hash mismatch  
page plan cites CHAR-* as operational authority  
prose receipt omits required stchar_authority block

## **10.2 Judgment-assisted receipt additions**

profile_fidelity:  
 overall: PASS | WARN | FAIL | NA  
 character_checks:  
   - stchar_id: STCHAR-1  
     stent_id: STENT-1  
     display_name: <name>  
     voice_fidelity: pass | minor_drift | major_drift | not_applicable  
     appraisal_fidelity: pass | minor_drift | major_drift | not_applicable  
     pressure_behavior_fidelity: pass | minor_drift | major_drift | not_applicable  
     relationship_conduct_fidelity: pass | minor_drift | major_drift | not_applicable  
     evidence:  
       - prose_excerpt: <short excerpt>  
         issue: <why it drifts or passes>  
     repair_recommendation: none | revise_prose | revise_page_plan | regenerate_stchar | run_turn_cycle_repair

Use judgment here honestly. Voice fidelity is not deterministic. The deterministic layer proves the authority was present and hash-consistent; the judgment layer assesses artistic fidelity.

---

# **11. Mid-story character introduction workflow**

## **11.1 Trivial background**

Allowed:

id: STENT-99  
role_in_story: [background]  
bound_stchar_id: null

Conditions:

* no speaking role;  
* no viewpoint role;  
* no persistent identity;  
* no relationship-bearing role;  
* no choice target;  
* no pressure driver;  
* no information-source function;  
* no obligation/consequence/thread participant.

## **11.2 Complex or persistent character**

Not allowed to commit without STCHAR.

Turn-cycle should emit a routing result instead of committing:

status: blocked_requires_stchar  
required_skill: story-character-profile  
mode: create_story_local  
proposed_display_name: The stairwell watcher  
intended_role_in_story: [witness, pressure_source]  
emergence_context_records:  
 - PG-4  
 - SE-4  
 - BEL-8  
reason: >  
 The character is a persistent witness and pressure source. A story-local  
 character authority profile is required before creating a meaningful STENT.

Then the user invokes:

story-character-profile mode=create_story_local

After STCHAR exists, rerun turn-cycle. The event can then create both `STENT` and active STCHAR references lawfully.

## **11.3 New world `CHAR-*` enters mid-run**

Same workflow, but mode is:

story-character-profile mode=create_from_world_char source_char_id=CHAR-<n>

The dedicated skill reads the world dossier, creates STCHAR, and the next turn-cycle creates or binds STENT.

---

# **12. Regeneration workflow**

Regeneration must be **from zero** and **append/supersede**, not in-place rewrite.

Workflow:

1. User invokes story-character-profile mode=regenerate_from_zero target_stchar_id=STCHAR-1.  
2. Skill loads:  
  - old STCHAR,  
  - active STENTs bound to it,  
  - source CHAR if allowed/needed,  
  - relevant story-local records,  
  - recent page-plan/prose fidelity failures if supplied.  
3. Skill allocates STCHAR-2.  
4. Skill drafts a new complete STCHAR profile from zero.  
5. Skill validates hashes and section anchors.  
6. Skill creates STCHAR-2 with supersedes: STCHAR-1.  
7. Skill marks STCHAR-1 superseded or creates a lifecycle ledger edge.  
8. Next story state transition supersedes active STCHAR in PG.active_records:  
  close/supersede STCHAR-1, create/activate STCHAR-2.  
9. Future page plans use STCHAR-2.

Historical pages remain valid if they referenced STCHAR-1 while it was active. Do not retroactively rewrite old page plans unless the user explicitly requests a repair workflow.

---

# **13. Validation and test plan**

## **13.1 Deterministic validators**

Required validators:

record_schema_compliance  
 includes story-character-authority schema and updated unions.

stent_requires_stchar  
 rejects non-background STENT with null/missing bound_stchar_id.

stchar_reference_resolution  
 all STCHAR ids in STENT, PG active_records, CHC, STPLAN, STEMO resolve.

snapshot_replay_equality  
 includes STCHAR in active_records and state_delta replay.

recursive_reference_closure  
 accepts STCHAR and follows STENT -> STCHAR, STCHAR -> STENT/source CHAR edges.

no_char_authority_in_story_runtime  
 rejects direct CHAR authority in page plans, CHC, STPLAN/STEMO, story-event rationale,  
 except STCHAR provenance or explicit promotion/adjudication workflows.

page_plan_stchar_packet_presence  
 verifies required packets exist.

page_plan_stchar_hash_consistency  
 verifies profile/voice/page-packet hashes.

stchar_supersession_integrity  
 prevents active references to superseded/retired STCHAR in future pages.

prose_receipt_stchar_block_required  
 verifies prose receipts carry deterministic and judgment-assisted STCHAR fields.

## **13.2 Judgment-assisted checks**

Route to prose-attach or health-audit notes:

dialogue voice fidelity  
emotion/appraisal plausibility  
pressure behavior plausibility  
viewpoint perception fidelity  
relationship conduct fidelity

## **13.3 Unit and integration tests**

Update or replace fixtures:

* `tools/world-mcp/tests/tools/story-bundle-fixture.ts` should create at least one `STCHAR-1.md` and bind `STENT-2.bound_stchar_id: STCHAR-1`. Existing `bound_char_id` fixtures should be removed.  
* Add a fixture for pure background STENT with `bound_stchar_id: null`.  
* Add a fixture for invalid witness/pressure-source STENT with null `bound_stchar_id`.

Test matrix:

schema/story-character-authority  
 validates required frontmatter  
 rejects missing hashes  
 rejects source_kind/world_char without source_char_id/hash  
 rejects story_local with source_char_id

schema/story-entity  
 accepts bound_stchar_id  
 rejects bound_char_id  
 rejects non-background STENT with null bound_stchar_id  
 accepts exactly background STENT with null bound_stchar_id

schema/story-page  
 accepts active_records.STCHAR  
 rejects malformed STCHAR id

schema/story-choice  
 accepts STCHAR in grounded_in.records

schema/story-event  
 accepts STCHAR in record_introductions and state_delta  
 rejects STCHAR in promotion_claims unless explicit separate schema says otherwise

patch-engine  
 allocate_next_id supports STCHAR  
 create_stchar_profile writes story-characters/STCHAR-N.md  
 supersede_stchar_profile creates new file and lifecycle marks old profile  
 stale-index guard detects changed STCHAR file

world-index  
 indexes STCHAR as story_character_authority_record  
 emits stent_character_authority  
 emits stchar_source_character  
 emits stchar_supersedes  
 emits page_active_record for active STCHAR

world-mcp  
 get_record resolves STCHAR with story_slug  
 get_record section_path returns frontmatter/body section/page-plan voice block  
 list_records returns STCHAR records  
 story_bundle_context includes active_story_characters  
 get_context_packet story_turn_cycle includes STCHAR summaries

validators  
 snapshot_replay_equality includes STCHAR  
 recursive_reference_closure follows STCHAR  
 no_char_authority_in_story_runtime catches direct CHAR authority  
 page_plan_stchar_packet_presence catches missing packets  
 page_plan_stchar_hash_consistency catches hash mismatch

skills  
 bootstrap aborts if selected cast STCHAR generation fails  
 bootstrap creates STENT bound_stchar_id  
 turn-cycle blocks complex new STENT without STCHAR  
 prose-attach writes profile_fidelity receipt  
 health-audit reports stale/superseded/missing STCHAR  
---

# **14. Risks, failure modes, and anti-patterns**

## **14.1 Risks**

**STCHAR bloat**  
 Accept the bloat when complexity requires it. The fix is section projection and page-plan packet extraction, not word caps.

**Overfitting STCHAR to one page**  
 Avoid writing page-specific emotions into STCHAR. Page-specific state belongs in `STEMO`, `STPLAN`, `BEL`, and `SREL`.

**Split authority**  
 The worst outcome is some skills reading STCHAR while others keep reading CHAR. The `no_char_authority_in_story_runtime` validator and health-audit check are mandatory.

**Persona as plot rail**  
 STCHAR must not encode “this character must betray on page 7.” It can say “under humiliation, this character tends to retaliate by exposing someone else’s weakness.” Runtime state decides whether that happens.

**Auto-promoting story-local characters**  
 Never. STCHAR is story-local. World `CHAR-*` creation from story-local characters needs explicit adjudication.

## **14.2 Anti-patterns to reject**

Reject these explicitly:

Adding act structure, dramatic units, or global drama manager fields.

Adding character arc stage fields to STCHAR.

Letting SLT predicates inspect wound/appetite fields mechanically.

Keeping STENT.bound_char_id as operational authority.

Using CHAR-* in page plans after STCHAR exists.

Treating STCHAR as BEL basis/access record.

Using terse page-plan capsules for complex speakers.

Imposing word-count ceilings on STCHAR or character packets.

Auto-updating STCHAR when source CHAR changes.

Silently promoting STCHAR to world canon.  
---

# **15. Exact implementation requirements / ticket breakdown**

## **Ticket 1 — Contract/spec update**

Files:

docs/FOUNDATIONS.md  
.claude/skills/_shared-templates/story-state-contract.md  
.claude/skills/_shared-templates/story-record-schemas.md  
docs/CONTEXT-PACKET-CONTRACT.md  
docs/MACHINE-FACING-LAYER.md

Acceptance criteria:

* STCHAR is listed as a story-local authority class.  
* World/story separation rule is explicit.  
* Page-plan minimum contract includes STCHAR packets.  
* `STENT.bound_stchar_id` replaces `bound_char_id`.  
* Active-record, grounding, and lifecycle surfaces are enumerated.

## **Ticket 2 — STCHAR schema and validators**

Files:

tools/validators/src/schemas/story-character-authority.schema.json  
tools/validators/src/schemas/story-entity.schema.json  
tools/validators/src/schemas/story-page.schema.json  
tools/validators/src/schemas/story-choice.schema.json  
tools/validators/src/schemas/story-event.schema.json  
tools/validators/src/structural/*  
tools/validators/tests/structural/*

Acceptance criteria:

* STCHAR schema validates hybrid frontmatter.  
* STCHAR accepted in intended unions.  
* STCHAR rejected where not intended.  
* Non-background STENT without STCHAR fails.  
* Direct CHAR runtime authority fails.

## **Ticket 3 — Patch-engine support**

Files:

tools/patch-engine/src/envelope/schema.ts  
tools/patch-engine/src/ops/*  
tools/patch-engine/src/apply.ts  
tools/world-mcp/src/tools/describe-envelope-schema.ts  
tools/world-mcp/tests/tools/validate-patch-plan.test.ts

Acceptance criteria:

* `stchar_ids` allocation supported.  
* `create_stchar_profile`, `supersede_stchar_profile`, `retire_stchar_profile` available.  
* Hybrid STCHAR writes land under `stories/<story_slug>/story-characters/`.  
* Stale-index guard covers STCHAR files.  
* Envelope schema describes new ops.

## **Ticket 4 — World-index support**

Files:

tools/world-index/src/schema/types.ts  
tools/world-index/src/parsers/*  
tools/world-index/src/edges/*  
tools/world-index/tests/*

Acceptance criteria:

* STCHAR indexed as `story_character_authority_record`.  
* Frontmatter/body sections parsed.  
* Edges emitted for STENT→STCHAR, STCHAR→CHAR, STCHAR supersession, STCHAR→STENT.  
* Existing `page_active_record`, `choice_grounded_in`, `plan_derived_from`, `emotion_derived_from` accept STCHAR.

## **Ticket 5 — MCP retrieval and context packets**

Files:

tools/world-mcp/src/tools/get-record.ts  
tools/world-mcp/src/tools/list-records.ts  
tools/world-mcp/src/tools/get-record-schema.ts  
tools/world-mcp/src/context-packet/*  
tools/world-mcp/tests/tools/*

Acceptance criteria:

* `get_record(STCHAR, story_slug)` works.  
* `section_path` works for frontmatter/body sections/page-plan voice block.  
* `list_records(record_type="story_character_authority_record")` works.  
* `story_bundle_context.active_story_characters` exists.  
* Story turn-cycle context includes active STCHAR summaries and does not rely on world CHAR full bodies.  
* Optional `get_story_character_packet` works if implemented.

## **Ticket 6 — Bootstrap skill patch**

File:

.claude/skills/branching-story-bootstrap/SKILL.md

Acceptance criteria:

* Selected cast `CHAR-*` is converted to STCHAR before state creation.  
* Bootstrap aborts if STCHAR generation fails.  
* STENT records use `bound_stchar_id`.  
* `cast_bind_list` uses `stchar_id` and non-operational `source_char_id`.  
* Initial page plan includes STCHAR packets.

## **Ticket 7 — New STCHAR authoring skill**

File:

.claude/skills/story-character-profile/SKILL.md

Acceptance criteria:

* Supports create from world CHAR.  
* Supports story-local character creation.  
* Supports regenerate from zero.  
* Supports supersession.  
* Does not mutate world CHAR.  
* Produces schema-valid STCHAR with hashes and required sections.

## **Ticket 8 — Turn-cycle skill patch**

Files:

.claude/skills/branching-story-turn-cycle/SKILL.md  
.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md  
.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md  
.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md

Acceptance criteria:

* Pre-flight loads active STCHAR.  
* No runtime characterization from CHAR.  
* Complex new characters require STCHAR before commit.  
* Page plan includes mandatory STCHAR packets.  
* CHC/STPLAN/STEMO grounding rules reference STCHAR.

## **Ticket 9 — Prose-attach patch**

File:

.claude/skills/branching-story-prose-attach/SKILL.md

Acceptance criteria:

* Receipt includes deterministic STCHAR authority checks.  
* Receipt includes judgment-assisted profile_fidelity checks.  
* Missing/hash-inconsistent packets fail deterministically.  
* Voice/profile drift produces actionable repair recommendations.

## **Ticket 10 — Health-audit patch**

File:

.claude/skills/branching-story-health-audit/SKILL.md

Acceptance criteria:

* Adds STCHAR authority health phase.  
* Reports missing/stale/split-authority/page-plan/prose-fidelity failures.  
* Does not normally read world CHAR for drift.

## **Ticket 11 — Promotion skill patch**

Files:

.claude/skills/story-fact-promotion-to-canon/SKILL.md  
.claude/skills/story-promotion-closeout/SKILL.md

Acceptance criteria:

* STCHAR can appear as supporting evidence context.  
* STCHAR is not automatic promotion source.  
* Story-local character-to-world-character promotion is explicitly out of scope or routed to a future dedicated workflow.

## **Ticket 12 — Fixtures and regression tests**

Files:

tools/world-mcp/tests/tools/story-bundle-fixture.ts  
tools/validators/tests/structural/contract-schema-roundtrip.test.ts  
tools/world-mcp/tests/tools/get-record-schema.test.ts

Acceptance criteria:

* No fixture uses `bound_char_id`.  
* At least one active STENT binds to STCHAR.  
* At least one background-only STENT has null STCHAR.  
* Invalid fixtures prove validators catch missing STCHAR, bad hashes, stale supersession, and direct CHAR authority leakage.

---

# **16. FOUNDATIONS alignment table**

| FOUNDATIONS principle | STCHAR alignment |
| ----- | ----- |
| No floating facts | STCHAR is indexed, hash-backed, active in page snapshots, and referenced through resolvable IDs. |
| World/story separation | `CHAR-*` remains world-level and story-agnostic; STCHAR is story-local and downstream. |
| Canon storage discipline | STCHAR lives inside story bundle, never in world `characters/`. |
| Page plan is authority; prose is receipt | Page plans must include STCHAR-derived packets; prose-attach validates against them. |
| Schema-minimalism | Every STCHAR field is consumed by retrieval, validation, supersession, page-plan rendering, prose-attach, audit, or skill logic. |
| Commitment blocks are causal moves | STCHAR does not add arcs/acts; it informs behavior and pressure response. |
| Present causal state, not narrative shape | STCHAR guides persona/appraisal; `BEL`, `STINT`, `STPLAN`, `STEMO`, etc. remain present-state records. |
| Belief vs fact | STCHAR is not epistemic access; do not use it as `BEL.basis.access_records` by default. |
| Observer firewall | STCHAR can explain how a character acts, but cannot grant knowledge the character lacks. |
| No word-count metrics | STCHAR and page-plan packets have no artificial length cap. |
| No silent retcons | STCHAR regeneration is append/supersede, not in-place rewrite. |
| No globalization by accident | STCHAR is story-local and never silently becomes world canon. |

**Bottom line:** build STCHAR as a first-class, hybrid, story-local authority layer. Do not patch around the problem by fetching bigger chunks of `CHAR-*`. The existing repo already has the right machinery—story snapshots, patch engine, validators, context packets, prose receipts, health audits—but its character authority surface is missing. STCHAR fills that gap cleanly without violating `FOUNDATIONS.md`.



---

## Outcome

Archived on 2026-05-22 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
