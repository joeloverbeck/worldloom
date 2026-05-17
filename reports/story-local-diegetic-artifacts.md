## **1. Executive recommendation**

Worldloom should make story-local diegetic artifacts robust by adding **one reusable DA authoring policy** and then embedding that policy into **bootstrap**, **turn-cycle**, and **health-audit**. The mechanism already exists. The product gap is not the patch engine; it is authoring judgment.

My concrete recommendation:

1. Add a new skill/reference named **`.claude/skills/story-diegetic-artifact-authoring/SKILL.md`**.  
2. Amend **`branching-story-bootstrap`** and **`branching-story-turn-cycle`** so every opening situation and every page delta runs a mandatory **DA triage pass**.  
3. Do **not** immediately expand the schema. The current `DA` schema is sufficient for a strong first version: `title`, `author`, `genre`, `body`, `intended_audience`, `circulation`, `truth_relation`, `supersedes`, and `derived_from` already cover most cases. The main missing feature is a clean link from story-local DA to world-level DA, but that can be deferred or added as a narrow optional field later.  
4. Treat every DA as **evidence, voice, artifact-content, and access surface**, not as truth. Claims inside a DA must not silently become `SF` or canon.  
5. Make public/factional DA creation mechanically tied to `BEL` propagation and observer-firewall validation. The repository already has a validator hook for this exact failure mode: public/factional DAs created in an event need same-event BEL propagation through an indirect access route, or a parseable non-propagation tag.

The design principle should be blunt:

A story-local DA is not “a cool bit of lore.” It is a branch-local in-world evidence object whose text, authorship, circulation, accessibility, and trust status can change what characters know, what choices are available, what mysteries narrow, what claims can later be promoted, and what continuity audits can verify.

---

## **2. Repository findings**

I excluded `archive/*`. Some searches returned archive hits, but I did not use them as evidence.

### **Foundations**

`docs/FOUNDATIONS.md` is the governing document. Its core model says a world is not a “bag of cool facts” but a constrained model of ontology, space, time, causality, institutions, culture, knowledge, history, mystery reserves, and pressure points. It also says every canon fact must live somewhere in that model; silence is not permission to invent long-standing truth later without retcon discipline.

The Canon Layers section is directly relevant: “contested canon” includes legends, propaganda, false scholarship, conflicting chronicles, folk explanations, court lies, and priestly doctrine. That is basically the world-level analogue of why story-local DAs matter: they let in-world voices exist without becoming objective truth.

The Canon Fact schema includes explicit epistemic and provenance fields, including `truth_scope`, `source_basis`, `epistemic_profile`, and relation types such as `recorded_in`, `suppressed_by`, and `distorted_by`. That strongly supports keeping artifact claims separate from truth claims.

The Story Bundles section says story bundles are distinct from world canon; they are a per-world derived layer containing branch-local, provisional, counterfactual, or story-local truths. It also states story `_source` writes go through the patch engine and explicitly names `append_story_diegetic_artifact_record`.

### **Shared story-state contract**

`.claude/skills/_shared-templates/story-state-contract.md` defines the story authority model: world canon outranks story state, story state outranks rendered prose, and rendered prose does **not** create story state by itself. This is central: a document mentioned only in prose is not a real DA until the page-plan/state layer records it.

The same contract defines schema minimalism: fields must be load-bearing, consumed by validation, replay, predicates, fork operations, or audit discipline. This argues against adding rich DA metadata too early.

The story-local `DA` schema is defined in §4.5.10 as an in-story text or artifact whose authorship is diegetic. Its fields are `id`, `story_id`, `created_at_page`, `supersedes`, `title`, `author`, `genre`, `body`, `intended_audience`, `circulation`, `truth_relation`, and `derived_from`. The same section emphasizes that story-local `DA-*` IDs are distinct from world-level DAs.

The contract also defines `CHC.grounded_in.records[]` as able to reference `DA-*`, and the predicate DSL includes `artifact_accessible(STENT, DA)`. That means DAs are already meant to unlock and ground choices, not merely decorate page plans.

`BEL` already has the right provenance structure for artifact evidence: `basis.access_route` includes `document`, `object_trace`, `location_trace`, `institutional_channel`, `rumor`, and similar routes, while `basis.access_records[]` can include `DA-*`.

### **Schema and patch engine**

`tools/validators/src/schemas/story-diegetic-artifact.schema.json` mirrors the shared contract. It requires `id`, `story_id`, `created_at_page`, `title`, `author`, `genre`, `body`, `intended_audience`, `circulation`, and `truth_relation`; it permits `supersedes` and `derived_from`; and it rejects additional properties.

`tools/patch-engine/src/envelope/schema.ts` includes `story_da_ids` in expected allocations and includes `append_story_diegetic_artifact_record` in the patch op vocabulary.

`tools/patch-engine/src/ops/create-story-record.ts` maps `append_story_diegetic_artifact_record` to story artifact records under `_source/artifacts`, uses `story_da_ids`, and recognizes node type `story_diegetic_artifact_record`.

`tools/world-mcp/tests/tools/validate-patch-plan.test.ts` already has a positive pre-apply validation test for `append_story_diegetic_artifact_record`, with `expected_id_allocations: { story_da_ids: ["DA-1"] }` and target file `stories/.../_source/artifacts/DA-1.yaml`.

### **Existing producer paths**

`branching-story-bootstrap` can create story-local DAs at opening when an in-story artifact is in play. Its output table includes `DA-*` under `_source/artifacts/DA-*.yaml`, and its patch phase can include `append_story_diegetic_artifact_record` with `expected_id_allocations.story_da_ids`.

`branching-story-turn-cycle` can create or alter DAs during page deltas. Phase 3 explicitly permits creating or altering story-local artifacts, and Phase 4 describes witness and visibility obligations, including the special public/factional DA propagation check.

### **Existing non-producer paths**

`commitment-block-authoring` creates `SLT` records, not DAs. It can use `artifact_accessible(...)` predicates and author future moves that depend on artifact access, but actual DA creation belongs to runtime state deltas.

`branching-story-prose-attach` validates rendered prose against committed page state; it can flag invented structural facts or canon claims, but it never turns prose-only artifacts into state records.

`branching-story-health-audit` is read-only. It checks belief, visibility, observer firewall, mystery/canon safety, and continuation health; it does not author DAs.

`story-fact-promotion-to-canon` consumes story-local DAs for `source_kind: artifact_canonization`. It writes promotion packages and explicitly does not mutate world canon.

`story-promotion-closeout` can supersede a story-local DA after canon adjudication if a DA field must change, using `append_story_diegetic_artifact_record`, but it is a closeout path, not an original authoring path.

### **World-level DA skills**

`.claude/skills/diegetic-artifact-generation` is much richer than story-local DA handling. It has phases for author reality construction, epistemic horizon, claim selection, genre convention, social texture, bias, distortion, and canon safety. It also states the generated artifact is an in-world voice, not world-level truth.

The world-level DA template includes `epistemic_horizon`, `claim_map`, `world_consistency`, `cannot_know`, and other audit surfaces. Those fields are too heavy for story-local DAs, but the procedure is valuable as a model for story DA policy.

`.claude/skills/canon-facts-from-diegetic-artifacts` uses a diegetic-to-world laundering firewall, treats artifact prose as primary evidence, and writes candidate proposal cards rather than canon. This is exactly the discipline story-local DAs need at smaller scale.

---

## **3. Foundations alignment**

The proposal aligns with `docs/FOUNDATIONS.md` in five ways.

First, it respects **No Floating Facts**. A DA must have author, audience, circulation, truth relation, provenance, and downstream use. It should not be a decorative lore blob.

Second, it respects **Contested Canon**. A DA can contain propaganda, myth, lies, false scholarship, factional doctrine, or sincere but wrong testimony without forcing those claims into `SF` or `CF`.

Third, it respects **Belief vs. Fact**. The story system already separates `SF` as branch truth from `BEL` as what a holder knows, believes, reports, suspects, denies, misremembers, or lies about. DAs should feed `BEL`; they should not bypass it.

Fourth, it respects the **Information / Observer Firewall**. A DA can ground an action only when the acting entity can access it through `artifact_accessible`, a BEL with document basis, direct possession/access, institutional channel, rumor, or another valid access route.

Fifth, it respects **schema minimalism**. I am not recommending a heavy story-local DA schema modeled after the world-level DA template. Story-local DAs need just enough structure to support page state, choices, beliefs, audits, and promotion.

---

## **4. External research findings**

### **Research evidence**

Narrative theory supports treating documents as **framed, situated utterances**, not neutral truth. Focalization theory distinguishes who sees from who speaks, which maps cleanly to Worldloom’s separation between artifact author, character reader, player/protagonist access, and branch truth.

Epistolary fiction and found-manuscript traditions use letters, diaries, newspapers, fragments, and “discovered” documents to create realism, immediacy, uncertainty, and layered testimony. That supports giving story DAs enough body text and provenance to be reusable rather than reducing them to abstract “clue exists” flags.

Paratext theory is relevant because artifacts often frame interpretation: a title, seal, redaction, archive label, marginalia, or factional header can change how the content is read. That maps to `title`, `genre`, `author`, `intended_audience`, and `circulation`.

Game and interactive narrative design strongly support artifact records as clue, memory, pacing, and choice infrastructure. Emily Short’s storylet writing frames narrative content as small units with prerequisites and effects, which is close to Worldloom’s `SLT`/`CHC`/state-delta architecture.

The Alexandrian’s “Three Clue Rule” argues that scenario-critical conclusions should have multiple clue paths, not one brittle gate. For Worldloom, that means DA-derived facts should not be single-point-of-failure unless the fragility is deliberate; DAs should create clue trails across BEL, SF, STOBJ, and later choices.

Outer Wilds is a useful design analogy because knowledge itself becomes progression: logs, rumors, and discoveries do not just add lore; they restructure what the player can understand and attempt.

Her Story and Return of the Obra Dinn show two different artifact/evidence models: search-and-fragment reconstruction versus logbook/evidence/fate validation. Both support the idea that Worldloom DAs should be explicit records that can be searched, cited, contradicted, and used to ground later choices.

Heaven’s Vault is especially relevant for damaged, partial, and translated artifacts: inscriptions can be uncertain, later reinterpreted, and context-dependent. That argues for handling translation, redaction, lacunae, and uncertainty explicitly in `body`, `truth_relation`, `BEL`, and supersession.

Provenance-aware knowledge modeling supports Worldloom’s current design. W3C PROV treats provenance as entities, activities, agents, derivations, versions, and responsibility chains; it is explicitly useful for assessing reliability and trustworthiness.

Belief-revision and reason-maintenance work supports keeping base evidence, assumptions, derived conclusions, and revisions separate. In Worldloom terms: DA text is evidence; BEL is a holder’s epistemic state; SF is branch truth; CF is canon; supersession records revision.

For agent procedure, ReAct-style work supports interleaving reasoning with external retrieval/action to reduce hallucination and error propagation. Design inference: DA creation should be procedural and checklist-driven, not left to a vague “if relevant” instruction.

### **Design inference**

The research points to a simple product principle:

Story DAs become valuable when they are not just lore, but reusable epistemic infrastructure: clues, records, receipts, lies, testimony, archives, altered texts, access gates, and social propagation channels.

Worldloom already has the right low-level substrate. It needs sharper authoring prompts, validation messages, and examples.

---

## **5. Definition and boundary rules**

### **What counts as a story-local DA**

A story-local diegetic artifact should be created when an in-story communicative artifact has **persistent narrative or state value**.

Use a story-local DA when the thing has at least two of these properties:

1. It has **diegetic authorship**: someone in the story wrote, recorded, inscribed, copied, translated, forged, posted, or transmitted it.  
2. It has **recoverable content**: text, inscription, diagram, map labels, audio transcript, encoded message, seal wording, ledger entries, marginalia, redactions, or visual information.  
3. It can affect **beliefs, suspicion, knowledge, deception, rumor, or testimony**.  
4. It can ground **choices**: read, quote, cite, reveal, hide, destroy, steal, forge, translate, publish, challenge, copy, compare, or follow.  
5. It can affect **mystery progression** or later canon promotion.  
6. Its **circulation** matters: private, factional, public, concealed, suppressed.  
7. Its **truth status** matters: true, false, partly true, contested, unknown, counterfactual, future-contingent.  
8. It will likely be referenced beyond the paragraph where it appears.

Positive examples:

* A private letter in the protagonist’s starting inventory.  
* A faction briefing memo.  
* A public proclamation posted in the square.  
* A diary page found under floorboards.  
* A forged warrant.  
* A damaged map with missing labels.  
* A redacted archive file.  
* A confession recorded by a character during the story.  
* A translation of an inscription.  
* A ledger page naming payments.  
* A rumor sheet, pamphlet, cult tract, official notice, wanted poster, oath tablet, will, treaty, codex excerpt, trial transcript, audio log, or photograph with caption.

### **What does not count**

Do **not** create a DA for every sign, note, or spoken line.

Use another record class when the load-bearing thing is different:

| Case | Better record |
| ----- | ----- |
| Physical possession, location, custody, damage, or carrier matters more than content | `STOBJ` |
| Actual branch truth is established independently | `SF` |
| A character believes, suspects, reports, misremembers, or lies about something | `BEL` |
| A purely atmospheric inscription/sign with no later use | prose-only |
| A one-turn choice label that does not persist | `CHC` / affordance |
| A world-level reusable artifact outside this story | world-level `diegetic-artifact-generation` |
| An accepted world truth | `CF` through canon-addition |
| A rumor with no durable text/object | `BEL`, not DA |
| A sealed object whose content is unknown and inaccessible | `STOBJ` now; DA when opened/read |

### **DA versus STOBJ**

The clean rule:

`STOBJ` is the carrier. `DA` is the communicative content.

A physical letter in someone’s pocket may need both:

STOBJ: "sealed blue letter, carried_by:STENT-1"

DA: "The text of the blue letter"

But if possession is not important and only the content matters, a DA alone is enough.

### **DA versus SF**

A DA saying “The king is dead” does **not** make the king dead.

Possible records:

DA: proclamation text claiming the king is dead

BEL: crowd believes the proclamation

SF: proclamation exists in the city square

Only create `SF: the king is dead` if branch truth independently establishes it or the event deliberately creates branch-local truth with the correct authority.

### **DA versus BEL**

A DA can exist unread. A BEL records who has access, what they think it means, and how confident they are.

A hidden diary page can be:

DA.circulation: concealed

with no protagonist BEL until discovered.

### **DA versus world-level DA**

Use a story-local DA when the artifact is created, discovered, altered, translated, copied, or made relevant **inside this branch/story**.

Use world-level DA when the artifact is a reusable world object that should exist across stories, independent of this branch.

---

## **6. Bootstrap workflow**

### **Detection**

At bootstrap, scan the user’s premise, opening scene, starting situation, starting inventory, faction briefing, rumor, public notice, private letter, requested mystery, requested clue, existing world-level DA reference, map, testimony, recording, inscription, or object-with-text.

Run this triage:

1. **Is there a diegetic communicative artifact?**  
    Letter, notice, map, diary, recording, inscription, order, ledger, codex, proclamation, rumor sheet, briefing, transcript, seal, diagram.  
2. **Is it persistent or reusable?**  
    It can be read later, cited, hidden, copied, compared, translated, or used as evidence.  
3. **Does it change state?**  
    It creates belief, access, suspicion, choice grounding, mystery evidence, obligation, faction reaction, or canon-promotion potential.  
4. **Is it story-local?**  
    It belongs to this opening situation or branch. If it is an existing world-level artifact, create a story-local excerpt/copy/instance only if this story needs local access, body, circulation, or belief propagation.  
5. **Is it accessible at opening?**  
    Decide whether the protagonist/player, party, faction, public, or nobody can read it yet.

### **Authoring obligations**

For every bootstrap DA:

* Allocate `DA-*` through story-bundle ID allocation.  
* Write via `append_story_diegetic_artifact_record`.  
* Include `DA-*` in `SE-1.state_delta.create`.  
* Include `DA-*` in `PG-1.state_snapshot.active_records.DA`.  
* If a starting choice depends on it, include it in `CHC.grounded_in.records`.  
* If the protagonist or another actor has read it, create a `BEL` with `basis.access_route: document` or `authorial_initialization`, and `basis.access_records` including the DA.  
* If public/factional at opening, create `BEL` records for the relevant holder (`public`, `group:<faction>`, or specific witnesses) or record a valid non-propagation reason.  
* If physical possession, location, seal, damage, or custody matters, also create a `STOBJ`.

### **Linking to existing world-level DAs**

Current schema ambiguity: world-level and story-local DAs both use `DA-*`, but the shared contract says story-local IDs are distinct.

No-change option:

* Put a brief reference in `body` or `derived_from` only when unambiguous in context.  
* Treat the story-local DA as “copy/excerpt/translation of world artifact X.”  
* Do not pretend the story-local DA is the world-level file.

Minimal future schema improvement:

source_world_artifact: DA-<integer> | null

or namespaced:

derived_from:

 - world:DA-12

I recommend deferring this until one or two story examples prove the need.

### **Avoiding unsupported canon**

At bootstrap, the DA can contain a claim the user requests, but the system must classify it correctly:

* “The letter claims the duke murdered his brother” → DA + BEL.  
* “The duke murdered his brother” → `SF` only if branch-local truth is deliberately established.  
* “The duke murdered his brother and this is world canon” → route to promotion/canon-addition discipline, not silent bootstrap canon.

### **Seeding choices and beliefs**

Opening artifacts should create choices such as:

* Read it again.  
* Hide it.  
* Show it to someone.  
* Burn it.  
* Compare it with another record.  
* Follow its map.  
* Challenge its author.  
* Leak it to the public.  
* Translate or decode it.  
* Test whether it is forged.

Each choice should be grounded in the DA and, when actor knowledge matters, also grounded in the relevant BEL.

Example grounding:

grounded_in:

 records: [DA-1, BEL-1, STOBJ-2]

### **Access decision**

At bootstrap, decide access with this rule:

* If the protagonist has read it: `BEL` exists.  
* If the protagonist physically holds it but has not read it: `STOBJ` exists; DA may exist only if exterior/known content matters.  
* If it is public: `DA.circulation: public` plus public/factional BEL as appropriate.  
* If it is hidden: `DA.circulation: concealed` and no protagonist BEL until discovery.  
* If it is suppressed: `DA.circulation: suppressed` and likely BELs for suppressing institution/faction only.

---

## **7. Turn-cycle workflow**

### **When a turn should create a new DA**

Create a DA during turn-cycle when the selected choice, write-in, or event causes one of these:

* A character writes, dictates, records, signs, posts, publishes, sends, hides, steals, leaks, forges, translates, copies, annotates, redacts, or destroys-with-readable-remnant an artifact.  
* The protagonist discovers and reads a meaningful artifact.  
* A public/factional document enters circulation.  
* A clue becomes embodied as a durable artifact.  
* A document becomes the basis for new choices or beliefs.  
* A found object’s information content matters, not merely its physical custody.

### **When to supersede an existing DA**

Supersede a DA when the **same artifact record** has materially changed:

* The text is altered.  
* The artifact is redacted.  
* A correction or new edition replaces the old one.  
* A previously hidden artifact is officially released and its `circulation` changes.  
* A translation replaces the prior accessible version.  
* Canon closeout changes a schema field.

Use `supersedes: DA-*` and create a new DA ID through `append_story_diegetic_artifact_record`.

### **When to create a new derived DA instead**

Create a new DA with `derived_from: [DA-*]` when the new artifact is a separate communicative object:

* Copy.  
* Excerpt.  
* Forgery.  
* Translation.  
* Public leak of a private letter.  
* Annotated version.  
* Damaged fragment separated from the original.  
* Transcript of a recording.

### **When only BEL/SF/STOBJ should change**

Do not create or supersede a DA when:

* Only a character changes their mind about the same text → supersede/create `BEL`.  
* Only the physical carrier moves → supersede `STOBJ`.  
* Only the real truth is established outside the artifact → create/supersede `SF`.  
* Someone orally repeats the content with no durable artifact → `BEL` with `access_route: testimony` or `rumor`.  
* A choice references prior known content but no artifact state changes → ground the choice in existing DA/BEL.

### **Found documents**

If the document is found and read now:

* Create DA if not already active.  
* Create BEL for each reader/witness.  
* Add choices grounded in DA/BEL.

If the document is found but sealed/unread:

* Create or update `STOBJ`.  
* Do not create DA unless the exterior text/seal/label is itself meaningful.

If the document was already a DA but newly discovered by another actor:

* Do not duplicate DA.  
* Create BEL for the new reader/access holder.

### **Character-authored documents**

When a character writes a confession, diary entry, note, order, or letter during play:

* `author: STENT-*`  
* `created_at_page: current PG`  
* `circulation` starts as `private`, `concealed`, `factional`, or `public` depending on delivery/posting.  
* Create BEL for author only when the document changes their state or creates future consequences. Do not assume writing always creates a new belief; often it expresses an existing one.  
* Create BEL for recipients/readers once they access it.

### **Forged, damaged, translated, redacted, or contested artifacts**

Forgery:

* DA body contains the forged text.  
* `author` should be actual author if known; otherwise `unknown` or `anonymous`.  
* Claimed authorship can be represented in the body/title.  
* `truth_relation: false` only if the system knows the key claim is false; otherwise `unknown` or `contested`.  
* Victims get `BEL.belief_mode: believes` or `interprets`; forgers may get `BEL.belief_mode: deceives`.

Damage/redaction:

* Preserve visible text with `[illegible]`, `[torn away]`, `[redacted]`.  
* `truth_relation: partly_true` when enough survives to imply something but not reliably.  
* `truth_relation: unknown` when the remaining content cannot be adjudicated.

Translation:

* New DA if the translation is a separate artifact.  
* `derived_from: [DA-original]`.  
* `truth_relation: partly_true` or `unknown` if translation uncertainty matters.  
* Add BEL for translator/interpreter.

Contestation:

* Do not collapse contradictory documents into a single truth.  
* Use multiple DAs and multiple BELs.  
* Create `SF` only for established branch truth, such as “two contradictory proclamations are circulating.”

### **Duplicate prevention**

Before creating a new DA, scan active `DA` records for:

* Same title.  
* Same author.  
* Same body or near-body.  
* Same source event.  
* Same physical carrier.  
* Same `derived_from`.

If it is the same artifact, do not duplicate. Create BEL/access records or supersede the existing DA.

---

## **8. Field semantics**

### **`truth_relation`**

Current enum is sufficient. Use it as follows:

| Value | Meaning |
| ----- | ----- |
| `true` | The artifact’s key claim is corroborated as true in branch/canon. Use sparingly. |
| `false` | The artifact’s key claim is false or deceptive relative to branch truth. |
| `partly_true` | Mixed, incomplete, technically true but misleading, outdated, redacted, damaged, or missing context. |
| `unknown` | Not yet verified, unreadable, encoded, inaccessible, or not adjudicated. |
| `contested` | Socially disputed, factional, mythic, propagandistic, testimonial, interpretive, or contradicted. |
| `branch_counterfactual` | True or meaningful only in this branch, or deliberately contradictory to canon/sibling branch state. |
| `future_contingent` | Prophecy, forecast, threat, order, contract, plan, or prediction whose truth depends on future events. |

Specific mappings:

| Artifact type | Recommended `truth_relation` |
| ----- | ----- |
| Corroborated confession | `true` |
| Known forged warrant | `false` |
| Redacted truthful report | `partly_true` |
| Damaged map with missing route | `partly_true` or `unknown` |
| Faction propaganda | `contested` or `partly_true` |
| Unverified witness statement | `contested` or `unknown` |
| Prophecy | `future_contingent` |
| Myth/legend | `contested` |
| Fiction-within-fiction | `false` if mistaken for reality; otherwise `contested` or `unknown` |
| Mechanically true but misinterpreted | DA `partly_true`; reader BEL `interprets` |
| Outdated report | `partly_true` or superseded DA |
| Branch-only document | `branch_counterfactual` |

Interaction rules:

* `truth_relation` does **not** create `SF`.  
* `truth_relation: true` should require either canon support, branch-local SF support, or very explicit event evidence.  
* `truth_relation: false` should normally create or support BEL asymmetry: someone may still believe it.  
* Promotion to canon must use `story-fact-promotion-to-canon`, not the DA field alone.  
* Health audit should warn when `truth_relation: true` lacks provenance.  
* Choices should rely on actor-accessible DA/BEL, not omniscient DA truth.

### **`circulation`**

Current enum is also sufficient for first version.

| Value | Meaning |
| ----- | ----- |
| `private` | Held by one character, a small party, a recipient, or a closed personal channel. |
| `factional` | Available to a faction, institution, guild, crew, bureaucracy, cult, army, or defined group. |
| `public` | Posted, broadcast, printed, archived, read aloud, or otherwise publicly accessible. |
| `concealed` | Hidden, sealed, encoded, buried, locked away, undiscovered, or secret but discoverable. |
| `suppressed` | Actively censored, confiscated, destroyed, banned, or institutionally contained. |

Special cases:

| Case | Encoding |
| ----- | ----- |
| Character-specific | `private` + `intended_audience: STENT-*` |
| Party-visible | `private` + `intended_audience: group:party` |
| Location-bound notice | `public` if visible to visitors; `concealed` if hidden at location |
| Secret but discoverable | `concealed` |
| Rumored document | DA only if durable text exists; otherwise BEL |
| Restricted archive | `factional`, `private`, or `suppressed` depending access |
| Destroyed but read | Keep DA as historical record; update STOBJ and rely on BEL |
| Copy/excerpt | New DA with `derived_from` |
| Translation/transmission | New DA with `derived_from` or supersession if same artifact |

Propagation rules:

* `public` and `factional` DAs require BEL propagation or a non-propagation tag under current validator discipline.  
* `private` DAs propagate only to holders/readers/witnesses.  
* `concealed` DAs should not create protagonist knowledge until discovered.  
* `suppressed` DAs may create BELs for suppressors, victims, or rumor channels, but should not imply broad access.

### **`body`**

`body` is the diegetic content or a diegetic transcript/description of non-text content.

Rules:

* Full text when short and central: private letter, notice, confession, diary entry, oath.  
* Excerpt when long: include the exact clue-bearing phrases, names, dates, symbols, contradictions, and oddities.  
* Summary only when the artifact is long or visual, but make the summary diegetically useful.  
* Never write “contains a clue.” Write the clue.  
* For maps: include labels, route marks, legends, missing pieces, annotations.  
* For recordings: include transcript excerpt and sound/source cues if relevant.  
* For images/photos/seals: include the visible inscriptions, marks, captions, and contested interpretation.  
* Use `[redacted]`, `[illegible]`, `[torn away]`, `[translation uncertain: ...]` for material uncertainty.  
* Do not reveal hidden underlying text unless state supports it.

### **`derived_from`**

Use `derived_from` for provenance and dependency:

* `derived_from: [SE-*]` for an event-created artifact.  
* `derived_from: [DA-*]` for copy, excerpt, translation, forgery, redaction, or response.  
* `derived_from: [STOBJ-*]` when tied to a carrier object.  
* `derived_from: [BEL-*]` when produced from testimony or rumor.  
* `derived_from: [SF-*]` when branch truth caused the artifact.

Avoid overloading it with world-level DA IDs until namespacing is clarified.

### **`supersedes`**

Use `supersedes` when the same logical artifact record is replaced by a later version:

* revised proclamation;  
* corrected report;  
* newly redacted version;  
* release from suppressed to public;  
* canon closeout changing a DA field.

Use `derived_from`, not `supersedes`, for copies, translations, excerpts, and forgeries.

---

## **9. System interactions**

### **Choices**

DAs should influence choices in these ways:

* Unlock a choice: “Follow the map’s eastern road.”  
* Justify a choice: “Confront Mira with the ledger entry.”  
* Create a risk: “Leak the proclamation.”  
* Create a resource: “Trade the diary page for protection.”  
* Create a social act: “Read the confession aloud.”  
* Create a destructive act: “Burn the warrant.”  
* Create a transformation: “Translate the inscription.”  
* Create a deception: “Forge a copy.”

`CHC.grounded_in.records` should include the DA whenever the choice relies on artifact content. If the actor’s knowledge matters, include the relevant BEL too.

Bad:

grounded_in:

 records: [DA-4]

when the protagonist has never seen `DA-4`.

Better:

grounded_in:

 records: [DA-4, BEL-9]

where `BEL-9.basis.access_records` includes `DA-4`.

### **Beliefs**

DA creation should trigger BEL creation when someone has access.

Examples:

belief_mode: knows

truth_relation: unknown

basis:

 access_route: document

 access_records: [DA-2, SE-4]

Contradictory artifacts should create contradictory BELs, not force truth resolution.

Do not propagate BELs when:

* the artifact is sealed;  
* the reader is unconscious/incapacitated;  
* the artifact is hidden;  
* a faction suppresses the report;  
* the event leaves no accessible trace;  
* the actor lacks location/object/document access.

Use the parseable non-propagation tag when the validator expects witness coverage:

non_propagation:event_leaves_no_accessible_trace(group=direct_witnesses, records=[DA-7])

### **Story facts**

DAs can support `SF` in two safe ways:

1. Artifact-existence fact:

SF: "A proclamation claiming the prince's abdication is posted at the east gate."

derived_from: [DA-3]

2. Branch truth supported by artifact plus event evidence:

SF: "The guard captain accepted forged orders and opened the gate."

derived_from: [DA-5, SE-9, BEL-12]

Do not create `SF: "The prince abdicated"` just because a proclamation says so.

### **Canon promotion**

For canon promotion:

* Use `story-fact-promotion-to-canon` with `source_kind: artifact_canonization` when the story-local DA itself is the source record.  
* Keep branch provenance in proposal evidence, not inside the CF candidate as authority.  
* Run mystery firewall and scope-inflation checks.  
* After canon-addition adjudicates, use `story-promotion-closeout`.  
* Only supersede DA during closeout if a DA schema field actually changes.

### **Story objects**

Boundary rules:

* Letter text: DA.  
* Letter as carried/sealed/burned/stolen object: STOBJ.  
* Sealed box: STOBJ; document inside becomes DA when exposed.  
* Map information: DA.  
* Physical map custody/damage: STOBJ.  
* Recording device: STOBJ.  
* Recording transcript/content: DA.  
* Forged warrant as paper: STOBJ.  
* Forged warrant text: DA.  
* Belief caused by warrant: BEL.  
* “The warrant is forged” as established truth: SF.  
* Destroyed after reading: STOBJ superseded; DA remains as story record; later choices rely on BEL/memory unless another copy exists.  
* Copies/excerpts: new DA with `derived_from`.

### **Prose attach**

`branching-story-prose-attach` should not create DAs. It should flag prose that introduces a load-bearing letter/map/log/decree/diary/recording not present in state as either:

* `invented_structural_fact: WARN/FAIL`, or  
* repair recommendation: run a repair turn that creates DA/BEL/STOBJ.

### **Commitment blocks**

`commitment-block-authoring` should not create DAs. It should:

* Use `artifact_accessible(...)` when a future move requires access to an existing DA.  
* Use `any_belief(...)` when the content is known through belief rather than current artifact access.  
* Avoid author-pool blocks that name branch-local DAs unless branch-scoped or prefix-scoped.

### **Health audit**

Health audit should become the main safety net for underproduction, access leakage, duplicate artifacts, and DA-derived choices.

---

## **10. Validation and audit rules**

Recommended severities:

### **Error / FAIL**

1. **DA created but not active**  
    `SE.state_delta.create[]` includes `DA-*`, but `PG.state_snapshot.active_records.DA[]` omits it.  
2. **Active DA missing source record**  
    `PG.state_snapshot.active_records.DA[]` references a nonexistent DA file.  
3. **Choice uses absent DA**  
    `CHC.grounded_in.records[]` includes `DA-*` not active on the emitting page.  
4. **Inaccessible artifact knowledge**  
    A `CHC`, selected `SLT`, or character action relies on a DA the actor cannot access through `artifact_accessible`, BEL basis, possession, location, institution, rumor, or explicit valid route.  
5. **Public/factional DA missing propagation**  
    Existing validator already handles this for created public/factional DAs: no same-event BEL with valid indirect access route and no valid `event_leaves_no_accessible_trace` tag.  
6. **DA claim promoted without provenance**  
    `SF` or promotion package depends on DA content but does not list DA in `derived_from`, `promotion_claims`, or proposal evidence.  
7. **Invalid supersession**  
    `supersedes` names missing DA, sibling-branch DA, or non-active DA without explanation.  
8. **Invalid derived_from**  
    `derived_from` names nonexistent record.  
9. **Schema enum violation**  
    Invalid `truth_relation` or `circulation`. The schema already enforces this.

### **Warning**

1. **Prose mentions load-bearing artifact but no DA**  
    A page plan/prose mentions a letter, map, diary, log, decree, confession, recording, inscription, or briefing that creates knowledge/choice implications, but no DA exists.  
2. **DA body too vague**  
    Body says “contains a clue” or “reveals a secret” instead of preserving the clue-bearing content.  
3. **DA physical action but no STOBJ**  
    A choice destroys, steals, hides, carries, seals, or trades an artifact, but there is no STOBJ carrier and no reason the physical state is irrelevant.  
4. **Likely duplicate DA**  
    Same title/author/body/circulation appears without `supersedes` or `derived_from`.  
5. **`truth_relation: true` without support**  
    DA says it is true, but no branch/canon support is present.  
6. **Circulation/BEL mismatch**  
    `DA.circulation: public`, but only private BEL exists; or `private` DA has public BEL without revealing event.  
7. **Suppressed artifact with no suppressor evidence**  
    `circulation: suppressed` but no BEL, faction, STOBJ custody, or event explains suppression.  
8. **World-level DA import ambiguity**  
    Story-local DA appears derived from a world-level DA but there is no clear provenance note.

### **Info**

1. **Body may be overlong**  
    Suggest excerpt/full-text split when a long body is not choice-relevant.  
2. **DA could be promoted later**  
    Suggest `story-fact-promotion-to-canon` if artifact evidence appears to establish world-level truth.

Suggested messages:

* `da_mentioned_not_recorded`: “Page mentions a load-bearing in-story document, but no active DA records it. Create DA or mark as prose-only.”  
* `da_choice_access_violation`: “CHC uses DA-7, but acting STENT lacks artifact access or BEL basis.”  
* `da_public_without_bel`: “DA-3 is public/factional but no same-SE BEL references it through an indirect access route.”  
* `da_body_non_specific`: “DA-4 body is too abstract to support later quotation, clue comparison, or audit.”  
* `da_claim_canonized_without_laundering`: “SF/CF candidate uses DA claim without preserving artifact-as-claim distinction.”

---

## **11. Recommended skill/doc changes**

### **Add new skill**

Create:

.claude/skills/story-diegetic-artifact-authoring/SKILL.md

I prefer this name over `story-local-diegetic-artifact-authoring`: it is shorter, still precise, and matches the story record class.

Purpose:

* reusable DA triage;  
* authoring rubric;  
* repair workflow for missing or under-specified DAs;  
* examples;  
* anti-patterns;  
* patch obligations;  
* BEL/witness/choice obligations.

Inputs:

world_slug: required

story_slug: required

page_id: optional

trigger_context: required

artifact_candidate: required

access_context: optional

physical_carrier_matters: optional

desired_use: optional

existing_world_artifact: optional

Outputs:

* one or more `DA` records;  
* optional `STOBJ`;  
* optional `BEL`;  
* optional `SF`;  
* optional choice grounding recommendations;  
* patch plan using `append_story_diegetic_artifact_record`.

### **Amend `branching-story-bootstrap`**

Add a mandatory phase before state materialization:

**Story-local DA triage.** Scan premise, opening situation, starting inventory, faction briefings, rumors, public notices, private letters, requested clues, maps, recordings, inscriptions, object-with-text, and existing world DA references. For each candidate, decide DA vs STOBJ vs BEL vs SF vs prose-only. Create DA only when content/authorship/circulation/truth relation has state value.

Bootstrap must also add:

* opening BEL rules;  
* opening access rules;  
* `SE-1.state_delta.create` inclusion;  
* `PG-1.state_snapshot.active_records.DA` inclusion;  
* CHC grounding rules.

### **Amend `branching-story-turn-cycle`**

Add a subsection inside Phase 3:

**DA creation/supersession triage.** Before finalizing `SE.state_delta`, scan event effects for written, found, read, posted, forged, translated, copied, redacted, damaged, broadcast, suppressed, or destroyed communicative artifacts.

Add a subsection inside Phase 4:

**DA circulation and BEL propagation.** For every new/superseded DA, compute who has access and create BELs or non-propagation tags.

### **Amend shared contract**

Add commentary under §4.5.10 clarifying:

* DA is communicative content, not physical carrier.  
* `truth_relation` is relation of artifact content to branch/canon truth, not reader belief.  
* `circulation` is access/distribution state, not intended audience.  
* Claims inside DA do not become SF/canon automatically.  
* Public/factional DAs require BEL propagation discipline.

Do not add fields yet.

### **Amend `branching-story-health-audit`**

Add DA-specific checks listed in section 10.

### **Amend `branching-story-prose-attach`**

Add prose-detection warning:

If rendered prose introduces a load-bearing document/artifact absent from page state, classify as invented structural fact or recommend a repair turn.

### **Amend `commitment-block-authoring`**

Add anti-pattern:

An SLT may require `artifact_accessible` or `belief_record` but must not fabricate DA existence. Runtime state delta creates/supersedes DAs.

### **Amend promotion skills**

`story-fact-promotion-to-canon` should emphasize:

* `artifact_canonization` promotes claims **from** DA evidence;  
* DA existence is not proof;  
* proposal evidence must include authoring SE and witness BELs.

`story-promotion-closeout` should emphasize:

* DA supersession only when DA schema fields change;  
* otherwise verdict lives in closeout ledger.

---

## **12. Schema and patch-engine recommendations**

### **No-change option**

Recommended immediate path.

The current schema is enough for robust first implementation:

* provenance: `created_at_page`, `derived_from`, `supersedes`;  
* access/distribution: `intended_audience`, `circulation`;  
* truth: `truth_relation`;  
* content: `body`;  
* patching: `append_story_diegetic_artifact_record`;  
* ID allocation: `expected_id_allocations.story_da_ids`.

Patch engine already supports the op and has tests.

### **Minimal-change option A: world-level DA link**

Add optional:

source_world_artifact: DA-<integer> | null

Why needed:

* The user explicitly wants bootstrap to reference existing world-level artifacts.  
* Current story-local and world-level DAs both use `DA-*`, but the shared contract says story-local IDs are distinct.  
* `derived_from: [DA-12]` is ambiguous without namespace.

Affected files:

* shared story-state contract;  
* story DA schema;  
* validators;  
* patch-engine schema only if it validates payload strictly through schema;  
* bootstrap/turn-cycle docs;  
* promotion docs.

Migration risk:

* Low if optional and nullable.  
* Existing records remain valid.

Deferrable:

* Yes. Use body/provenance note until examples prove need.

### **Minimal-change option B: carrier object link**

Add optional:

carrier_object: STOBJ-<integer> | null

Why:

* Would simplify DA/STOBJ audits.

Against:

* Current `derived_from: [STOBJ-*]` can already express this.  
* Schema minimalism argues against adding it until validators consume it.

Recommendation:

* Defer.

### **Minimal-change option C: body mode**

Add optional:

body_mode: full | excerpt | summary | transcript | visual_description

Why:

* Helps audit body fidelity.

Against:

* Not yet load-bearing.  
* Can be encoded in `genre` or body header.

Recommendation:

* Defer.

### **Do not change yet**

Do not immediately change `truth_relation` into a structured object. The enum is adequate if documented.

Do not immediately change `circulation` into a structured object. Use BELs, STOBJs, and access predicates for specifics.

Do not add structured `claims[]` to story-local DA yet. That would duplicate world-level DA complexity and increase authoring burden.

---

## **13. Examples**

### **Example 1: bootstrap private letter**

**Situation:** The premise says the protagonist starts with a private letter from their missing sister.

**Why DA:** It has in-world authorship, body text, private circulation, and creates choices.

Expected DA:

id: DA-1

story_id: STORY-1

created_at_page: PG-1

supersedes: null

title: "Mira's Last Letter"

author: STENT-2

genre: "private letter"

body: >

 Rell, if the east bell rings before dawn, do not come to the house.

 The ledger is not in Father's desk. It is under the blue tile where

 Mother used to hide the winter salt. Trust no seal stamped in green wax.

intended_audience: STENT-1

circulation: private

truth_relation: unknown

derived_from: []

Expected `SE-1.state_delta`:

create: [STENT-1, STENT-2, DA-1, BEL-1, STOBJ-1, CHC-1, CHC-2, CHC-3]

supersede: []

close: []

Expected `PG-1.state_snapshot.active_records.DA`:

DA: [DA-1]

Expected BEL:

id: BEL-1

holder: STENT-1

claim: "Rell has read Mira's warning about the green wax seal and the blue tile."

belief_mode: knows

truth_relation: unknown

confidence: high

visibility: private

basis:

 source_event: SE-1

 access_route: authorial_initialization

 access_records: [DA-1, SE-1]

Expected choices:

CHC-1:

 surface_label: "Search beneath the blue tile"

 grounded_in:

   records: [DA-1, BEL-1]

Do not canonize automatically:

* The ledger’s location.  
* The sister’s trustworthiness.  
* The danger of green wax seals as world truth.

---

### **Example 2: bootstrap public notice / faction proclamation**

**Situation:** Opening scene begins under a posted decree by the River Guard.

**Why DA:** Public artifact, factional authorship, public belief propagation, choice grounding.

Expected DA:

id: DA-2

story_id: STORY-1

created_at_page: PG-1

supersedes: null

title: "River Guard Quarantine Notice"

author: group:river_guard

genre: "public proclamation"

body: >

 By order of the River Guard, no ferry shall cross after moonrise.

 All grain barges are subject to search. Harbor bells mark lawful passage;

 unmarked crossings will be treated as plague-running.

intended_audience: public

circulation: public

truth_relation: contested

derived_from: []

Expected `SE-1.state_delta`:

create: [DA-2, BEL-2, CHC-4, CHC-5]

supersede: []

close: []

Expected active records:

DA: [DA-2]

BEL: [BEL-2]

Expected BEL:

id: BEL-2

holder: public

claim: "The River Guard has posted a quarantine notice restricting ferry crossings."

belief_mode: reports

truth_relation: true

confidence: high

visibility: public

basis:

 source_event: SE-1

 access_route: document

 access_records: [DA-2, SE-1]

Expected choices:

CHC-4:

 surface_label: "Challenge the notice at the guard post"

 grounded_in:

   records: [DA-2, BEL-2]

CHC-5:

 surface_label: "Look for an unmarked crossing"

 grounded_in:

   records: [DA-2, BEL-2]

Do not canonize automatically:

* That plague exists.  
* That the River Guard’s stated reason is honest.  
* That all unmarked crossings are actually plague-running.

---

### **Example 3: discovered forged document**

**Situation:** During turn-cycle, the protagonist finds a warrant that appears to authorize an arrest, but the seal is wrong.

**Why DA:** It is a discovered in-world document with forged content and choice consequences.

Expected DA:

id: DA-7

story_id: STORY-1

created_at_page: PG-5

supersedes: null

title: "Arrest Warrant Bearing the Green Seal"

author: unknown

genre: "forged warrant"

body: >

 By authority of the South Court, bearer is empowered to detain

 Tavin Ors for debt evasion and river-theft. Witnessed under green wax.

intended_audience: group:city_watch

circulation: concealed

truth_relation: false

derived_from: [STOBJ-5, SE-5]

Expected `SE-5.state_delta`:

create: [DA-7, BEL-14, STOBJ-5, CHC-18, CHC-19]

supersede: []

close: []

Expected active records:

DA: [DA-1, DA-2, DA-7]

Expected BEL:

id: BEL-14

holder: STENT-1

claim: "Rell has found a warrant whose green seal suggests forgery."

belief_mode: suspects

truth_relation: false

confidence: medium

visibility: private

basis:

 source_event: SE-5

 access_route: document

 access_records: [DA-7, STOBJ-5, SE-5]

Expected choices:

CHC-18:

 surface_label: "Confront the watch captain with the warrant"

 grounded_in:

   records: [DA-7, BEL-14]

CHC-19:

 surface_label: "Hide the warrant before anyone sees it"

 grounded_in:

   records: [DA-7, BEL-14, STOBJ-5]

Do not canonize automatically:

* Who forged it.  
* That the South Court is corrupt.  
* That Tavin is innocent, unless separately established.

---

### **Example 4: damaged or redacted map**

**Situation:** The player discovers a burned map fragment with partial route labels.

**Why DA:** Map information matters; damage and uncertainty matter.

Expected DA:

id: DA-10

story_id: STORY-1

created_at_page: PG-8

supersedes: null

title: "Burned Ferry-Route Map"

author: unknown

genre: "damaged map"

body: >

 A river map, burned along the eastern margin. Visible labels:

 "Old Chain Ferry"; "salt lock"; "[torn away] gate"; and a red ink mark

 beside a marsh channel. A note in the lower corner reads:

 "Do not cross when the bell is muffled."

intended_audience: none

circulation: concealed

truth_relation: partly_true

derived_from: [STOBJ-9, SE-8]

Expected `SE-8.state_delta`:

create: [DA-10, STOBJ-9, BEL-21, CHC-27, CHC-28]

supersede: []

close: []

Expected BEL:

id: BEL-21

holder: STENT-1

claim: "Rell has a partial map suggesting a dangerous ferry route and an unclear warning about a muffled bell."

belief_mode: interprets

truth_relation: partly_true

confidence: medium

visibility: private

basis:

 source_event: SE-8

 access_route: document

 access_records: [DA-10, STOBJ-9, SE-8]

Expected choices:

CHC-27:

 surface_label: "Follow the red-marked marsh channel"

 grounded_in:

   records: [DA-10, BEL-21]

CHC-28:

 surface_label: "Ask a ferryman about the muffled bell"

 grounded_in:

   records: [DA-10, BEL-21]

Do not canonize automatically:

* The full route.  
* The missing gate label.  
* The meaning of the muffled bell.

---

### **Example 5: character-authored confession during turn-cycle**

**Situation:** A captured smuggler writes a confession under pressure.

**Why DA:** New character-authored text; potential deception/coercion; later choice/evidence.

Expected DA:

id: DA-12

story_id: STORY-1

created_at_page: PG-11

supersedes: null

title: "Kell's Written Confession"

author: STENT-6

genre: "coerced confession"

body: >

 I, Kell Marr, carried the silver hooks through the west sluice

 and paid the lockmaster two crowns for silence. I did not know

 the hooks were marked for plague burial.

intended_audience: group:river_guard

circulation: factional

truth_relation: contested

derived_from: [SE-11]

Expected `SE-11.state_delta`:

create: [DA-12, BEL-30, BEL-31, CHC-34, CHC-35]

supersede: [SREL-8]

close: []

Expected active records:

DA: [DA-1, DA-2, DA-7, DA-10, DA-12]

Expected BELs:

BEL-30:

 holder: STENT-6

 claim: "Kell has signed a confession naming himself and the lockmaster."

 belief_mode: claims

 truth_relation: contested

 confidence: low

 visibility: factional

 basis:

   source_event: SE-11

   access_route: document

   access_records: [DA-12, SE-11]

BEL-31:

 holder: group:river_guard

 claim: "The River Guard has a written confession implicating Kell and the lockmaster."

 belief_mode: reports

 truth_relation: contested

 confidence: medium

 visibility: factional

 basis:

   source_event: SE-11

   access_route: institutional_channel

   access_records: [DA-12, SE-11]

Because `DA-12.circulation: factional`, same-event BEL propagation is required unless a valid non-propagation tag exists. The BEL above satisfies that.

Expected choices:

CHC-34:

 surface_label: "Question Kell about the missing details"

 grounded_in:

   records: [DA-12, BEL-30]

CHC-35:

 surface_label: "Leak the confession to the dockworkers"

 grounded_in:

   records: [DA-12, BEL-31]

Do not canonize automatically:

* That Kell actually carried the hooks.  
* That the lockmaster took bribes.  
* That the confession is voluntary.  
* That plague burial practices work as implied.

---

## **14. Implementation roadmap**

### **Immediate: doc and skill changes**

1. Add `.claude/skills/story-diegetic-artifact-authoring/SKILL.md`.  
2. Add DA field semantics to `.claude/skills/_shared-templates/story-state-contract.md`.  
3. Amend `branching-story-bootstrap` with DA triage.  
4. Amend `branching-story-turn-cycle` with DA creation/supersession and circulation/BEL propagation substeps.  
5. Amend `branching-story-health-audit` with DA-specific findings.  
6. Amend `branching-story-prose-attach` to flag prose-only load-bearing artifacts.  
7. Add five example records matching section 13 to a non-archive examples or tests location.

### **Medium-term validation**

1. Add validator/audit check: DA in `CHC.grounded_in.records` must be active in emitting PG.  
2. Add observer-firewall check specific to DA-grounded CHCs.  
3. Add duplicate-DA heuristic in health audit.  
4. Add DA-body-specific warning for vague content.  
5. Add prose/plan mention scan for load-bearing unrecorded artifacts.  
6. Add consistency check for `circulation` versus BEL visibility.  
7. Add audit check for DA-to-SF/canon promotion provenance.

### **Optional schema improvements**

1. Add `source_world_artifact` only after examples show existing world-level DA import is common.  
2. Add `carrier_object` only if DA/STOBJ audits remain ambiguous.  
3. Defer `body_mode`.  
4. Defer structured `claims[]`.  
5. Defer expanded `truth_relation`/`circulation`.

### **Tests to add**

1. Patch-plan success: private DA + BEL + CHC grounding.  
2. Patch-plan failure/audit: public DA without BEL propagation.  
3. Health audit: CHC grounded in inaccessible DA.  
4. Health audit: duplicate DA without `derived_from`/`supersedes`.  
5. Prose attach: prose mentions load-bearing diary absent from state.  
6. Promotion: `artifact_canonization` package requires DA source and BEL/prose evidence.  
7. Closeout: accepted artifact promotion supersedes DA only when field changes.

Priority order:

1. Skill/doc triage.  
2. Bootstrap/turn-cycle amendments.  
3. Health audit checks for CHC access and missing DA.  
4. Examples/tests.  
5. Optional schema field for world-level DA link.

---

## **15. Open questions**

1. **Should story-local DA link directly to world-level DA?**  
    Current schema does not cleanly namespace story-local `DA-*` versus world-level `DA-*`. A product decision is needed: optional `source_world_artifact`, namespaced `derived_from`, or no schema change.  
2. **How should `artifact_accessible(STENT, DA)` be computed exactly?**  
    The predicate exists, but access semantics depend on circulation, BEL basis, STOBJ possession, location, faction membership, and suppression. A validator-backed resolution algorithm would make this more reliable.  
3. **Should `circulation: private` include party-visible by default?**  
    I recommend no. Use `intended_audience: group:party` or BELs to specify. But this deserves a convention in the shared contract.  
4. **Should physical carriers be required for every DA?**  
    I recommend no. Many DAs can be informational records without modeled physical custody. Create STOBJ only when possession/location/material state matters.  
5. **How aggressively should prose-attach flag missing DAs?**  
    There is a risk of overproduction. The audit should warn only when the artifact has state value: choices, beliefs, mystery evidence, repeated reference, or physical affordance.  
6. **Should body length be validator-enforced?**  
    I recommend no. The Foundations prose-length discipline argues against arbitrary word budgets. Use qualitative warnings for “too vague” or “bloated and unused,” not hard limits.

---

# **Copy-pasteable spec section**

## Story-Local Diegetic Artifact Authoring

A story-local `DA` records an in-story communicative artifact whose authorship, content, circulation, truth relation, or access state affects story state. It is evidence and voice, not automatic truth.

### Triage

Create a `DA` when an in-story artifact has persistent state value: letter, diary, map, inscription, proclamation, faction briefing, recording, transcript, forged warrant, redacted file, public notice, ledger, clue document, translated text, copied excerpt, or other authored/recorded communicative object.

Do not create a `DA` for every sign, spoken line, or decorative text. Use:

- `STOBJ` for the physical carrier, possession, location, custody, damage, sealing, hiding, or destruction.

- `BEL` for what a holder knows, believes, suspects, reports, misremembers, or lies about.

- `SF` for what is actually true in the branch.

- prose-only detail for trivial text with no state effect.

- world-level `diegetic-artifact-generation` for reusable world artifacts outside the story bundle.

- `story-fact-promotion-to-canon` for any DA-derived claim that should become world canon.

### Required DA obligations

For every new DA:

1. Allocate `DA-*` through story-bundle ID allocation.

2. Write through `append_story_diegetic_artifact_record`.

3. Include the DA in `SE.state_delta.create`.

4. Include the DA in `PG.state_snapshot.active_records.DA`.

5. If any emitted `CHC` relies on the artifact, include the DA in `CHC.grounded_in.records`.

6. If the actor’s knowledge of the artifact matters, ground the choice/action in a `BEL` whose `basis.access_records[]` includes the DA.

7. If physical custody, location, damage, sealing, or destruction matters, create or supersede a `STOBJ` carrier.

8. If `circulation` is `public` or `factional`, create same-event BEL propagation through a valid indirect route (`document`, `object_trace`, `location_trace`, `rumor`, `surveillance`, `institutional_channel`, `magic_tech`) or include a parseable non-propagation tag in `SE.world_logic_rationale`.

### Truth relation

Use `truth_relation` as the relation between the artifact’s key claim/content and branch/canon truth:

- `true`: corroborated true in branch/canon.

- `false`: key claim is false or deceptive.

- `partly_true`: mixed, incomplete, misleading, redacted, damaged, outdated, or technically true but context-missing.

- `unknown`: not verified, unreadable, encoded, inaccessible, or unadjudicated.

- `contested`: disputed, factional, propagandistic, mythic, testimonial, opinionated, or contradicted.

- `branch_counterfactual`: meaningful only in this branch or contradictory to canon/sibling branch state.

- `future_contingent`: prophecy, forecast, threat, order, contract, plan, or prediction.

A DA claim does not become `SF` or canon merely because the artifact exists.

### Circulation

Use `circulation` as artifact access/distribution state:

- `private`: one character, a private recipient, or a small closed group.

- `factional`: available through a faction, institution, crew, cult, bureaucracy, army, guild, or other defined group.

- `public`: posted, broadcast, archived, printed, read aloud, or openly accessible.

- `concealed`: hidden, sealed, locked, buried, encoded, undiscovered, or secret but discoverable.

- `suppressed`: actively censored, confiscated, destroyed, banned, or institutionally contained.

`intended_audience` is who the artifact was meant for. `circulation` is who can actually access or receive it now.

### Body

`body` must preserve enough diegetic content to support later references, quotes, clues, choices, beliefs, and audits.

Use full text for short/central artifacts. Use excerpt for long artifacts. Use diegetic transcript/description for maps, diagrams, seals, photos, recordings, inscriptions, or visual artifacts. Represent material uncertainty with `[redacted]`, `[illegible]`, `[torn away]`, or `[translation uncertain: ...]`.

Never write only “contains a clue.” Write the clue.

### Supersession and derivation

Use `supersedes` when the same artifact is materially changed: altered text, corrected edition, redacted version, circulation change, or closeout field change.

Use `derived_from` when a separate artifact depends on another record: copy, excerpt, translation, forgery, transcript, annotation, leaked version, damaged fragment, testimony-derived document, or event-created document.

### Belief propagation

A DA can exist unread. A `BEL` records who knows, believes, suspects, reports, denies, misremembers, interprets, or is deceived by its content.

When a DA becomes accessible to a holder, create or supersede BEL with:

```yaml

basis:

 source_event: SE-<integer>

 access_route: document | object_trace | location_trace | institutional_channel | rumor | testimony | surveillance | magic_tech | authorial_initialization

 access_records: [DA-<integer>, ...]

Do not let actor choices or SLT bindings rely on DA knowledge unless the actor has a valid access route.

### **Anti-patterns**

* Creating DA for every trivial sign or flavor note.  
* Treating DA body as branch truth.  
* Using `truth_relation: true` without supporting SF/CF/event evidence.  
* Creating public/factional DA without BEL propagation.  
* Grounding a choice in a DA the actor cannot access.  
* Modeling a physical letter only as DA when possession/custody/destruction matters.  
* Duplicating the same artifact instead of creating BEL access or superseding.  
* Promoting DA claims to canon without `story-fact-promotion-to-canon`.

