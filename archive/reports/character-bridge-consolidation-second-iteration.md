**Status**: COMPLETED

# **Worldloom Character-to-Story Bridge Consolidation Audit**

## **1. Executive verdict**

The current `CHAR → STCHAR → packets → page plan → prose` bridge is **basically sound, but still partially fragile at the packet/page-plan boundary**. The recent architecture is much stronger than a vague “summarize the character” pipeline: `CHAR` now has structured protagonist-grade operational fields, `STCHAR` has a formal semantic-preservation contract, `source_operational_fact_map` exists, `STCHAR` bodies have required operational homes, runtime `CHAR-*` leakage is forbidden, page plans carry §16a packets, and prose receipts validate packet/hash authority. That is the right architecture.

The highest-risk current gap is **false confidence from valid packets that are semantically underpowered**. The system can prove that a §16a packet exists, cites the right `STCHAR`, carries matching hashes, and has a voice block for `speaker` / `viewpoint`; it cannot yet reliably prove that the packet contains the page-relevant capability limit, relationship hook, offstage causal mechanism, promise/thread/consequence role, or current story-state overlay that the prose renderer needs. Hashes prove identity and integrity, not adequacy.

The first fix should be a **validator-readable packet role-demand contract**: make `required_because` parseable as a closed multi-label set, then enforce role-specific minimum packet material. A `capability_mechanism` role should require capability + limit/cost/access material; a `relationship_mechanism` role should require relationship conduct and active `SREL` / §9 grounding; `offstage_causal` should require the mechanism of causal bearing and should not drag in voice. This strengthens the bridge without turning prose judgment into schema law.

Do **not** change `FOUNDATIONS.md`, do **not** collapse `CHAR` and `STCHAR`, do **not** put volatile story state into stable `STCHAR`, and do **not** force full voice/persona packets for every offstage or continuity-only character. The current separation between stable persona authority and volatile story-state records is correct and should be preserved.

---

## **2. Repository evidence base**

Branch SHA used: `1c51393b5aef7660d0b71a0b3f5e4ddbfdf6eaa9`. The commit fetch succeeded against `joeloverbeck/worldloom` and resolved to the current target commit used throughout this audit.

The original mission required repository metadata, current default branch, exact branch SHA, and a live tree manifest or equivalent full path inventory before analysis. The connector still did not expose recursive tree listing directly, but you provided the exact `git ls-tree -r --name-only 1c51393b5aef7660d0b71a0b3f5e4ddbfdf6eaa9` output, which satisfies the mission’s “equivalent full path inventory” requirement. I used that manifest for discovery, then fetched files directly from GitHub at the exact SHA.

Code search snippets were **not** used as evidence. I also did **not** clone the repository.

Files fetched and why:

* Constitutional and machine contracts: `docs/FOUNDATIONS.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/HARD-GATE-DISCIPLINE.md`. These define the authority model, retrieval discipline, story-state boundaries, and hard-gate rules.  
* Character source surfaces: `.claude/skills/character-generation/SKILL.md`, `_shared-references/protagonist-grade-character-engine.md`, `propose-new-characters`, and `deepen-character-proposal`. These define how proposal/NCP material becomes structured `CHAR` authority.  
* Bridge skills: `story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, and `branching-story-prose-attach`. These define `CHAR → STCHAR`, bootstrap distillation, runtime use, page-plan §16a, and prose receipt behavior.  
* Record/schema contracts: `_shared-templates/story-state-contract.md`, `_shared-templates/story-record-schemas.md`, `character-frontmatter.schema.json`, and `story-character-authority.schema.json`. These define `CHAR`, `STCHAR`, `PG`, §16a, and prose-receipt contracts.  
* Validators: `stchar-source-fact-coverage`, `stchar-body-integrity`, `page-plan-stchar-packet-integrity`, `prose-receipt-stchar-integrity`, `no-char-authority-in-story-runtime`, `stent-requires-stchar`, and `stchar-bound-stent-reciprocity`. These are the deterministic backstops for the bridge.  
* Tests: `stchar-source-fact-coverage.test.ts`, `stchar-body-integrity.test.ts`, `page-plan-stchar-packet-integrity.test.ts`, and `prose-receipt-stchar-integrity.test.ts`. These show the current negative and happy-path coverage.

Relevant files not found as separate active contracts: there does not appear to be a standalone active `STCHAR` template file separate from the `story-character-profile` skill plus shared story-record/schema contracts. That is not inherently bad; it means the source of truth is currently distributed across the skill, schema, shared contract, and validators.

Tool limitation: direct recursive Git tree fetch via the connector remained unavailable, but the user-supplied `git ls-tree` manifest removed that blocker. All repository content analysis used direct file fetches at the exact SHA.

---

## **3. Research base**

The useful research signal is narrow:

First, provenance systems are valuable because they record the entities, activities, and people involved in producing data so downstream systems can assess quality, reliability, and trustworthiness. W3C PROV also explicitly supports derivation, versioning, procedures, and validation concepts. That directly supports Worldloom’s `source_char_hash`, `source_operational_fact_map`, profile hashes, and packet hashes—but it also warns against a common trap: provenance proves derivation history, not domain adequacy. A packet can be perfectly traceable and still omit the thing the page needed.

Second, BDI-style agent models distinguish beliefs, goals/desires, intentions, and plans; intentions are committed plans of action, not just personality color. That aligns strongly with Worldloom’s separation of `BEL`, `STINT`, `STPLAN`, `STEMO`, and `STCHAR`: stable character authority should not absorb volatile beliefs, tactical plans, or emotions. The bridge should synthesize `STCHAR + current story state` at page-plan time, not mutate `STCHAR` every time a character is angry or blocked.

Third, interactive narrative work repeatedly treats character behavior and story control as coupled systems. Façade is a classic example: believable agents and drama management were integrated rather than left as separate prompt fragments. Recent LLM interactive-drama work makes the same point in a newer idiom: authorial control and character behavior have to coordinate, or the plot may progress while character identity degrades.

Fourth, storylet-style systems are useful because they combine responsive generation with explicit triggers or conditions. That supports Worldloom’s current `SLT`, predicate, and page-plan architecture, but it also implies that packet roles should be explicit enough to trigger the right character projection. Natural-language “this character matters” is too weak; the packet needs to say *how* they matter.

Research-to-repo conclusion: `FOUNDATIONS.md` wins, and the research supports the existing Worldloom architecture rather than a redesign. The change needed is not “more character detail everywhere”; it is **traceable, role-specific projection**.

---

## **4. Current bridge map**

Current bridge:

NCP proposal / deepened proposal  
 → CHAR dossier  
 → STCHAR story-local authority profile  
 → story_bundle_context active STCHAR summaries + targeted STCHAR retrieval  
 → page-plan §16a STCHAR-derived character authority packets  
 → prose receipt stchar_authority + profile_fidelity  
 → rendered prose implications

`NCP` and deepened proposal cards carry `memorability_profile` fields that are deliberately aligned with the protagonist-grade character engine. The engine defines ten canonical operational fields: wound, appetite, self-mythology, contradiction, pressure behavior, relational charge, moral/psychological edge, signature scene behavior, voice under pressure, and cannot-be-swapped-out reason.

`CHAR` realizes that engine as `dramatic_core` in frontmatter and as body sections including Material Reality, Epistemic Position, Capabilities, Voice and Perception, Pressure Behavior, Signature Scene Behavior, and Likely Story Hooks. The `character-generation` skill explicitly validates capabilities by how learned, cost, teacher, ordinary/unusual status, and body/class/place distribution.

`STCHAR` is story-local character authority, not world canon and not belief state. It has frontmatter provenance (`source_kind`, `source_char_id`, `source_char_hash`, source sections, story-local inputs, lifecycle fields, hashes) plus a 13-section body. The required operational homes include Stable Persona Core, Pressure Behavior, Voice Bible, Page-Plan Voice Block, Perception and Embodiment, Agency and Planning Tendencies, Relationship-Specific Behavior, Story-State Derivation Guide, and Prose Rendering Constraints.

The semantic-preservation contract is now explicit: every structured operational source fact from a world `CHAR` must be copied, transformed, compressed, intentionally omitted with rationale, or marked story-irrelevant; retained source facts may not survive only in `Source Distillation` or audit prose.

Runtime story records must use `STCHAR`, not world `CHAR`. Non-background `STENT` records must bind an active `STCHAR`; reciprocal binding is validated; page plans and receipts are scanned for illegal `CHAR-*` authority leaks.

Page plans use §16a STCHAR-derived packets. The shared contract says packets are required for viewpoint characters, speakers, major actors, direct targets, emotionally salient characters, and anyone whose behavior, voice, appraisal, relationship conduct, perception, embodiment, or agency shapes the page. Present-character packets should include voice, appraisal, pressure behavior, relationship conduct, embodiment, agency, capabilities/limits, must-show/must-not-imply, and anti-generic warnings; reduced `offstage_causal` packets omit voice but preserve causal relevance.

Prose attach reads page plan + prose + PG state and writes a receipt. It verifies deterministic STCHAR authority through `stchar_authority[]` and hashes, then uses judgment-assisted `profile_fidelity[]` for voice, appraisal, pressure behavior, and relationship conduct.

---

## **5. Semantic preservation findings**

What is preserved well:

* The ten `dramatic_core` source fields are strongly represented and validated. `CHAR` frontmatter requires them; `STCHAR` schema allows a map for them; `stchar_source_fact_coverage` checks that present fields are mapped, not duplicated, not targeted only to `Source Distillation`, and not omitted without rationale.  
* The test suite covers missing maps, Source Distillation misuse, omitted-without-rationale, legacy warning behavior, and source-hash drift. That is real negative coverage, not just happy-path testing.  
* The architecture correctly treats `source_char_id` as provenance only. Runtime authority is `STCHAR`, not world `CHAR`.

What can still be lost:

* The preservation validator currently enumerates the ten `dramatic_core` fields. It does **not** directly enumerate all operational material in the `CHAR` body, especially detailed capability provenance, capability limits/costs/access, embodiment constraints, sensory access, body-section signature behavior elaboration, Likely Story Hooks, or relationship-specific body prose. The STCHAR skill tells authors to use those sections, and `stchar_body_integrity` requires capability subsections, but the preservation map’s source enum is still narrower than the full operational source surface.  
* Capabilities are the biggest remaining semantic-loss risk. The current bridge requires an STCHAR “Operational capabilities and affordances” subsection and “Capability limits, costs, and access constraints” subsection, but it does not prove that each source `CHAR` capability and each source cost/limit/access fact made it across.  
* Signature behaviors have a better path because they are part of `dramatic_core.signature_scene_behaviors`, but the richer body elaboration may still be compressed into generic prose unless the source map grows beyond the ten frontmatter fields.

Current source coverage creates genuine safety for `dramatic_core`, but **false confidence for body-origin operational facts**. A `STCHAR` can pass because every `dramatic_core` field is mapped while a `CHAR` body capability such as “can track a quarry only after ritual preparation and only in dry weather” becomes “good tracker” in STCHAR. That is exactly the sort of loss the next consolidation pass should target.

---

## **6. STCHAR structure assessment**

The existing `STCHAR` structure is broadly adequate. Its 13 sections cover identity, provenance, stable persona, emotion/appraisal, pressure behavior, voice, page voice projection, perception/embodiment, agency/planning, relationships, state derivation, prose rendering, and validation anchors. This is the right shape for story-local authority.

The best recent addition is the required operational-home subsections: capabilities/affordances, capability limits/costs/access constraints, and signature scene behaviors to render. These are exactly the homes that prevent “character as vibe summary.”

Missing homes are not the main problem. The problem is **insufficient machine-readable linkage into those homes**. A section can be present and non-empty while still being too generic. The next layer should not add ten more prose sections; it should add a compact `source_operational_fact_map` extension and a page-packet coverage map.

What belongs in STCHAR:

* Stable voice and dialogue authority.  
* Stable pressure behavior.  
* Stable agency/planning tendencies.  
* Stable relationship conduct patterns.  
* Stable capability affordances and durable limits.  
* Stable embodiment/perception constraints.  
* Prose rendering constraints that should survive across pages.

What belongs in volatile story-state records:

* Current belief (`BEL`).  
* Current intention (`STINT`).  
* Tactical plan and blockers (`STPLAN`).  
* Current affective state (`STEMO`).  
* Current relationship state (`SREL`).  
* Life/agency/location/status (`STSTAT`).  
* Current obligations, consequences, threads, clocks, secrets, and questions.

What belongs only in the page packet:

* The subset of stable STCHAR material relevant to this page role.  
* The synthesis of stable persona with active `BEL` / `STPLAN` / `STEMO` / `SREL` / `THR` / `CNSQ` / `OBL`.  
* Offstage causal mechanism when the person is not rendered but still moves the page.

What belongs in prose judgment:

* Whether the voice is artfully rendered.  
* Whether pressure behavior is subtle enough.  
* Whether implication beats exposition.  
* Whether a scene feels alive.

---

## **7. Packet sufficiency and role-selection assessment**

The packet system is the current weak seam.

The shared contract describes a strong §16a packet: it should include role, hashes, identity, voice, appraisal, pressure behavior, relationship conduct, perception/embodiment, agency, capabilities/limits, must-show/must-not-imply, and anti-generic warnings. It also correctly defines reduced `offstage_causal` packets without voice bloat.

The validator currently proves a narrower set of facts:

* A required packet exists for active non-background present characters.  
* Offstage active characters may omit packets.  
* `offstage_causal` cannot be used for present characters.  
* Declared hashes match stored `STCHAR` hashes.  
* The page-packet hash recomputes from packet text.  
* `speaker` and `viewpoint` packets require a voice block.

That is useful, but it does not validate role-specific semantic adequacy. It does not say: “this page depends on a capability, therefore the packet must include the capability and its cost/limit/access.” It does not say: “this character is a consequence carrier, therefore the packet must name the consequence/obligation/thread relation.” It does not say: “this offstage character is actively pressuring the scene, therefore the packet must name the offstage mechanism.”

There is also a parser fragility: `required_because` is effectively raw text. The prose-attach skill expects comma-separated qualifiers copied verbatim, but `page_plan_stchar_packet_integrity` only requires voice when `requiredBecause` is exactly `speaker` or exactly `viewpoint`. A packet with `Required because: direct_target, emotionally_salient, behavior_shapes_page, speaker` can plausibly fail to trigger the voice requirement because the validator is not parsing a multi-label vocabulary.

Role-selection recommendation: keep reduced/offstage tiers, but make roles machine-readable and demand-specific.

---

## **8. Page-plan adequacy assessment**

Page plans are structurally strong. Bootstrap and turn-cycle both require the 19-section page-plan contract, optional §9b active plans, optional §9c emotions, optional §10b clock/secret/question state, and mandatory §16a packets for relevant characters. Turn-cycle also requires active STCHAR summaries to be loaded and full/projected STCHAR sections retrieved before persona, voice, appraisal, pressure behavior, relationship conduct, perception, embodiment, agency, choice, plan, or emotion derivation.

The remaining issue is page-plan **selection precision**. The page plan may contain a §16a packet and active state sections, but nothing currently forces the exact connection:

This page role requires this character fact  
because this active story record / scene function depends on it.

Examples:

* A character uses a rare capability, but the packet includes only “agency tendency.”  
* A character’s limitation should block a choice, but the packet lists the ability without its cost.  
* A relationship is load-bearing, but §16a omits relationship-specific conduct and leaves it buried in §9.  
* An offstage actor is causing pressure through a plan or clock, but no reduced offstage packet is required.  
* A `STEMO` changes how a character speaks on this page, but §16a still exports only stable voice.

The fix is not bigger packets. It is **role-scoped packet obligations** and a small “current overlays” block that synthesizes `STCHAR + active story records`.

---

## **9. STCHAR evolution / staleness assessment**

A `STCHAR` can become stale in two different ways:

1. **Stable-authority staleness**: the character’s durable voice, body, moral boundary, pressure behavior, relationship conduct, or capability profile has changed enough that old STCHAR authority is no longer true. This should trigger `story-character-profile` regenerate mode, creating a new `STCHAR` with `supersedes`, not editing the old one. The current story-character-profile skill already provides regenerate mode and requires append-only supersession.  
2. **Page-context staleness**: the stable STCHAR remains correct, but current story state changes what the page needs. A fresh `BEL`, `STPLAN`, `STEMO`, `SREL`, `STSTAT`, `OBL`, `CNSQ`, or `THR` may make a stable trait relevant, irrelevant, intensified, suppressed, or misleading. This should **not** regenerate STCHAR; it should be synthesized in the page packet.

The current architecture recognizes this distinction, but the validators do not yet enforce the synthesis. Prose-attach judges profile fidelity against the page-plan packet first and retrieves full STCHAR only when the packet is insufficient or inconsistent. That is sensible, but it means the page-plan packet is the choke point.

Recommended boundary:

* Regenerate STCHAR only for durable persona-authority changes.  
* Keep volatile changes in story-state records.  
* Require page packets to list active overlays when role labels demand them.  
* Let health audit warn on repeated profile-fidelity drift that suggests a stable authority update.

---

## **10. Validation assessment**

Deterministically validatable now:

* Non-background `STENT` must bind `STCHAR`.  
* `STENT` / `STCHAR` binding reciprocity.  
* Runtime `CHAR-*` authority leaks in story records, page plans, and receipts.  
* `STCHAR` body section presence, uniqueness, non-emptiness, operational-home subsections, and profile/voice hash integrity.  
* `dramatic_core` source fact map coverage and Source Distillation misuse.  
* §16a packet presence for present active characters, hash consistency, offstage/present mismatch, and speaker/viewpoint voice block in narrow cases.  
* Receipt authority entry presence, matching `required_because`, hash comparisons, snapshot activity, and profile-fidelity entry presence.

Validatable with schema/MCP/validator changes:

* Multi-label `required_because` parsing and closed vocabulary.  
* Role-demanded packet fields.  
* Capability mechanism requires capability + limit/cost/access lines.  
* Relationship mechanism requires relationship conduct plus current relationship grounding.  
* Consequence/promise/thread carrier requires active record reference.  
* Offstage causal packet requires causal mechanism text and forbids/omits voice bloat.  
* Page packet declares active overlays from `BEL`, `STPLAN`, `STEMO`, `SREL`, `STSTAT`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ` when role demands them.  
* Source map extension for `CHAR` body operational facts beyond `dramatic_core`.

LLM-judgment-only:

* Whether the prose rendered the voice beautifully.  
* Whether signature behavior was subtle enough.  
* Whether a character’s silence is dramatically effective.  
* Whether a moral edge feels psychologically credible.  
* Whether the amount of page-plan detail is artistically balanced.

Should not be validated:

* “Every source fact must appear in every page.”  
* “Every offstage character must have a packet.”  
* “Every speaker must use all voice traits.”  
* “Every character must display a signature behavior each page.”  
* “Every profile-fidelity minor drift is a failure.”

---

## **11. False confidence paths**

1. **Structured dramatic-core coverage passes, but body capability detail is lost.**  
    Why it passes: current coverage validator enumerates the ten `dramatic_core` fields, not every operational body fact. User-visible failure: prose makes the character generically capable, ignoring limits/costs/access. Preventable: yes, with an extended operational-source fact manifest. Risk of overconstraint: manageable if omission/compression/story-irrelevant dispositions remain legal.  
2. **STCHAR has required capability subsections, but they are too thin.**  
    Why it passes: body integrity checks presence/non-empty, not semantic completeness. User-visible failure: page plans know “has skill,” not when/how/at what cost. Preventable: partly, by linking source capability classes to target sections; final literary adequacy remains judgment.  
3. **§16a packet hashes pass, but packet omits the page-relevant fact.**  
    Why it passes: hash integrity checks identity of packet text, not adequacy of selected content. User-visible failure: renderer starves and writes flat prose. Preventable: yes, for declared roles; no, for every latent literary need.  
4. **Comma-separated `required_because` values evade exact-match voice checks.**  
    Why it passes: validator treats `requiredBecause` as raw string and checks only exact `speaker` / `viewpoint`. User-visible failure: a speaking packet can omit voice if role text is composite. Preventable: yes, parse labels.  
5. **Offstage causal character is active but unpacketed.**  
    Why it passes: missing packet is allowed when location is `offstage`. User-visible failure: offstage pressure becomes vague or causally invisible. Preventable: partly. If an active event/thread/clock/plan references that STENT/STCHAR, a warning or fail can be deterministic; whether an offstage character “matters” absent such references remains authorial judgment.  
6. **Prose receipt passes authority checks but the original packet was inadequate.**  
    Why it passes: receipt compares receipt to page-plan packet and STCHAR hashes; profile fidelity is judgment-assisted. User-visible failure: official receipt says PASS while character rendering is underfed. Preventable upstream at packet validation; receipt should not become a full literary validator.  
7. **Stable STCHAR remains valid while story-state overlays alter page behavior.**  
    Why it passes: stable authority is not stale, but page packet may omit active `STPLAN` / `STEMO` / `BEL` / `SREL` overlays. User-visible failure: character acts as their bootstrap self after major events. Preventable: require role-demanded overlay references in §16a.

---

## **12. Overconstraint and validator false-positive risks**

The main danger is turning a flexible fiction system into a checklist machine.

Hard fail should be reserved for:

* Missing required packet for present relevant character.  
* Illegal `CHAR-*` runtime authority.  
* Hash mismatch.  
* Missing voice block for parsed `speaker`, `viewpoint`, or `voice_shapes_page`.  
* Declared `capability_mechanism` without capability/limit material.  
* Declared `relationship_mechanism` without relationship conduct.  
* Declared `offstage_causal` without offstage causal mechanism.

Warning should be used for:

* Active offstage character with story-state evidence of causal pressure but no packet.  
* Active `STPLAN` / `STEMO` / `SREL` for a packeted character not reflected in §16a overlays.  
* Capability source facts compressed heavily but still present.  
* Repeated profile-fidelity minor drift across receipts.

Judgment-assisted audit note should be used for:

* Whether a packet is artistically sufficient.  
* Whether the prose implication is too subtle.  
* Whether silence is intentional characterization or omission.  
* Whether a relationship behavior should be foregrounded this page.

No validation should be added for:

* Forcing signature behaviors every page.  
* Forcing all active characters into §16a.  
* Forcing voice blocks for non-speaking offstage characters.  
* Forcing all source facts to survive.  
* Forcing prose to display every packet fact explicitly.

---

## **13. Redundancy and divergence assessment**

Useful deliberate denormalization:

* `CHAR.dramatic_core` plus body prose. Keep it. Frontmatter gives machine structure; body gives authorial richness.  
* `STCHAR` source map plus operational sections. Keep it. The map proves disposition; sections carry usable prose authority.  
* §16a packet plus `STCHAR` profile. Keep it. The packet is page-local projection; the profile is stable authority.  
* Prose receipt `stchar_authority` plus `profile_fidelity`. Keep it. One is deterministic; one is judgment-assisted.

Harmful divergence risk:

* `required_because` as prose text in packet and receipt. It should become parseable labels or have a parser-enforced closed vocabulary.  
* STCHAR capability sections can diverge from source CHAR capability details because no source capability map exists yet.  
* Page packet can diverge from active story-state overlays because packet hash only covers packet text, not whether the packet selected the right material.

Generate rather than author manually where possible:

* Hashes already follow this principle.  
* Packet role-demand scaffolds should be generated from role labels.  
* A `packet_coverage` block should be generated/validated against declared role labels and active state references.

Validate consistency for:

* Source fact disposition → target operational section.  
* Role labels → required packet lines.  
* Packet active overlays → active story records.  
* Receipt authority → page packet and stored STCHAR hashes.

---

## **14. Tests / fixtures / golden evidence assessment**

Existing tests are meaningful. `stchar_source_fact_coverage` tests Source Distillation misuse, missing maps, omission rationale, source hash drift, and legacy warnings. `stchar_body_integrity` tests missing/duplicate/empty sections, required subsections, and hash recomputation. `page_plan_stchar_packet_integrity` tests missing packets, offstage omissions, offstage_causal handling, inactive STCHARs, hash mismatches, packet-hash recompute, and missing voice block for `speaker`. `prose_receipt_stchar_integrity` tests missing receipt authority, hash mismatch, active snapshot mismatch, missing profile fidelity, and offstage voice non-applicability.

Missing negative cases:

* Composite `required_because` containing `speaker` but not exactly equal to `speaker`.  
* Declared capability-bearing role with no capability/limit packet line.  
* Retained source capability without retained cost/access/limit.  
* STCHAR source map complete for `dramatic_core` while CHAR body operational capability is dropped.  
* Offstage causal packet with no causal mechanism.  
* Offstage active actor linked to an active `STPLAN` / `CLK` / `THR` but omitted from §16a.  
* Page packet hash valid while content is semantically generic.  
* Receipt passes authority while profile fidelity flags major drift; ensure repair recommendation escalates correctly.  
* Story-evolved `STPLAN` / `STEMO` overlay absent from packet for a declared plan/emotion role.

Recommended golden fixture:

* One source `CHAR` with a nontrivial capability, limit, cost, access constraint, signature behavior, relationship behavior, voice pressure pattern, and body/sensory constraint.  
* One derived `STCHAR` that maps every operational source class.  
* One page plan where the character is a speaker and capability-bearing actor.  
* One reduced offstage packet for another character whose plan/clock causes pressure.  
* One prose receipt that passes deterministic authority and contains profile-fidelity evidence.  
* Negative variants for each omission.

Current tests prove structure and a subset of semantic transfer. They do **not** yet prove full semantic transfer from rich `CHAR` body material or role-specific page-packet adequacy.

---

## **15. Prioritized proposals**

### **Proposal 1 — Add parsed packet role labels and a role-demand matrix**

Problem: `required_because` is prose-like. Validators rely on exact strings, so composite roles can evade required checks.

Evidence: Prose-attach expects comma-separated qualifiers copied verbatim, while page-plan validator checks exact `speaker` / `viewpoint` membership only by raw string equality.

Recommended change: Define a closed packet-role label set:

viewpoint  
speaker  
major_actor  
direct_target  
emotionally_salient  
behavior_shapes_page  
voice_shapes_page  
capability_mechanism  
relationship_mechanism  
promise_thread_carrier  
consequence_carrier  
plan_holder  
emotion_holder  
offstage_causal  
absence_matters  
continuity_mention

Allow multiple labels. Parse comma-separated or list-form labels. Then enforce minimum packet obligations:

* `speaker`, `viewpoint`, `voice_shapes_page` → voice/dialogue block required.  
* `capability_mechanism` → capability plus limit/cost/access required.  
* `relationship_mechanism` → relationship conduct required.  
* `promise_thread_carrier` / `consequence_carrier` → active `THR` / `OBL` / `CNSQ` reference required.  
* `plan_holder` → active `STPLAN` overlay or explicit irrelevant rationale.  
* `emotion_holder` → active `STEMO` overlay or explicit not-applicable rationale.  
* `offstage_causal` → offstage causal mechanism required; voice block should be omitted unless explicitly justified.

FOUNDATIONS alignment: strong. It preserves state/prose separation and improves plan grounding without literary overreach.

Affected systems: shared story-state contract, bootstrap/turn-cycle page-plan authoring, page-plan packet validator, prose receipt validator/schema, prose-attach skill, tests, fixtures, possibly MCP packet preview formatting.

Blast radius: moderate. Existing page plans may need migration or compatibility parsing. Legacy composite strings should parse as labels; unknown labels should warn first, fail for new/touched plans.

Validation impact: high. This closes the most obvious false-confidence path.

Migration impact: old packets can be parsed leniently; newly created packets should use the closed vocabulary.

Risk: low to medium. The risk is label proliferation. Keep the vocabulary small.

Sequencing: first.

---

### **Proposal 2 — Extend semantic preservation beyond the ten `dramatic_core` fields**

Problem: `dramatic_core` transfer is now guarded, but operational body facts can still be lost—especially capabilities, limits/costs/access, embodiment/perception, likely story hooks, and richer signature behavior elaboration.

Evidence: `stchar_source_fact_coverage` enumerates the ten dramatic-core fields; STCHAR body integrity requires capability subsections but does not link them back to source capability material.

Recommended change: Add `source_operational_fact_map_v2` or extend the existing map with `operational_class` and `source_anchor`. Initial classes:

dramatic_core.*  
capability_affordance  
capability_limit_cost_access  
embodiment_perception  
voice_pressure_pattern  
signature_scene_behavior  
relationship_conduct  
likely_story_hook  
agency_planning_tendency  
canon_constraint

Do not force every prose sentence to map. Map only story-operational facts extracted from stable source sections.

FOUNDATIONS alignment: strong. It prevents silent loss while preserving omission and story-irrelevance as legal outcomes.

Affected systems: `story-character-profile`, bootstrap Phase 2, STCHAR schema, `stchar_source_fact_coverage`, character-generation template guidance, tests, fixtures, possibly MCP `get_record` section retrieval.

Blast radius: moderate to high. It touches source-generation, distillation, validator, and migration.

Validation impact: high for capability preservation.

Migration impact: legacy `STCHAR` should warn; new/touched `STCHAR` should fail if v2 required classes are missing.

Risk: medium. The risk is over-mapping. Avoid this by mapping classes, not every line.

Sequencing: second.

---

### **Proposal 3 — Add page-level `current_story_state_overlays` inside §16a packets**

Problem: Stable `STCHAR` can remain valid while current story state changes page behavior.

Evidence: Turn-cycle already updates `STPLAN`, `STEMO`, `BEL`, `SREL`, `STSTAT`, and other records when events change tactical agency, affective pressure, belief, visibility, relationship state, or status; page plans already include §9b/§9c/§10b, but §16a does not yet have a validator-readable overlay contract.

Recommended change: Add a compact field to each §16a packet:

- Current story-state overlays:  
 - STPLAN-3: current step / blocker relevant to this page  
 - STEMO-2: behavioral pressure relevant to this page  
 - SREL-4: relationship conduct relevant to this exchange

Require overlays only when role labels demand them.

FOUNDATIONS alignment: strong. It keeps volatile state out of STCHAR while giving page plans the synthesis prose needs.

Affected systems: page-plan contract, bootstrap/turn-cycle skills, page-plan validator, prose receipt schema/validator, context packet story-bundle summaries, tests.

Blast radius: moderate.

Validation impact: medium-high. Deterministic when role labels and active records are declared.

Migration impact: new packets only; old packets warn when active overlays are evident.

Risk: low. This is a consolidation of existing state, not new state.

Sequencing: third.

---

### **Proposal 4 — Add `packet_coverage` as a deterministic companion to hashes**

Problem: `page_packet_hash` proves that packet text is stable, not that packet text contains the required projections.

Evidence: Page-plan validator recomputes packet hash and compares stored values, while prose receipt compares expected/observed hashes and deterministic authority entries. Neither proves adequacy.

Recommended change: Add a generated/validator-readable `packet_coverage` block:

packet_coverage:  
 stchar_sections_projected:  
   - Voice Bible / Dialogue Authority  
   - Agency and Planning Tendencies  
   - Relationship-Specific Behavior  
 current_records_projected:  
   - STPLAN-3  
   - SREL-4  
 omitted_role_demands:  
   - role: emotion_holder  
     rationale: no active STEMO for this STENT

FOUNDATIONS alignment: strong. This is provenance/coverage, not prose judgment.

Affected systems: §16a contract, hash helper if coverage is inside hashed packet text, validators, prose receipt, tests.

Blast radius: medium.

Validation impact: high against false confidence.

Migration impact: use warning mode first.

Risk: medium. If too verbose, it bloats page plans. Keep it compact.

Sequencing: can merge with Proposal 1 or 3.

---

### **Proposal 5 — Add staleness triage rules to health-audit/prose-attach handoff**

Problem: repeated profile-fidelity drift may indicate either bad prose, bad page packet, stale STCHAR, or state-overlay omission. Current repair recommendation can name `regenerate_stchar`, but the decision boundary should be sharper.

Evidence: Prose-attach profile fidelity recommends `revise_prose`, `revise_page_plan`, `regenerate_stchar`, or `run_turn_cycle_repair`; `story-character-profile` supports regenerate mode.

Recommended change: Define staleness triage:

* `revise_prose`: packet adequate, prose drifted.  
* `revise_page_plan`: full STCHAR adequate, packet omitted needed material.  
* `run_turn_cycle_repair`: active story state missing/wrong.  
* `regenerate_stchar`: stable persona authority no longer true or repeated major drift across pages.

FOUNDATIONS alignment: strong. Append-only and no silent retcon.

Affected systems: prose-attach, health audit, story-character-profile regenerate docs, tests.

Blast radius: low to moderate.

Validation impact: mostly judgment-assisted, but repair routing can be checked structurally.

Migration impact: none.

Risk: low.

Sequencing: fourth.

---

### **Proposal 6 — Expand negative fixtures around capability and packet starvation**

Problem: current tests are solid structurally but not yet adversarial enough for semantic starvation.

Evidence: Existing tests cover source maps, body sections, hashes, packet presence, offstage handling, and receipt authority, but do not cover capability-loss, composite-role parsing, role-demand fields, or active-state overlay omission.

Recommended change: Add a golden bridge fixture plus negative variants described in §14.

FOUNDATIONS alignment: strong. Tests enforce contracts without changing story aesthetics.

Affected systems: validators tests, story fixture generator, maybe package fixtures.

Blast radius: low.

Validation impact: high confidence.

Migration impact: none.

Risk: low.

Sequencing: alongside Proposals 1–3.

---

## **16. Non-goals**

Do not amend `FOUNDATIONS.md`. The current foundations already support the necessary fix: state authority, append-only mutation, local story state, mystery firewall, retrieval discipline, and no prose-as-state are all correct.

Do not redesign the bridge. `CHAR → STCHAR → packet → prose receipt` is the right separation.

Do not make `STCHAR` a dumping ground for current emotions, plans, secrets, beliefs, or relationship deltas. Those belong in story-state records.

Do not add validators that grade literary quality. Validate provenance, presence, role-demanded coverage, hashes, and lawful authority; leave subtlety and art to judgment-assisted receipt/profile-fidelity.

Do not require full packets for every active/offstage/background entity. That would create bloat and punish useful negative space.

Do not use prior audit reports as evidence. This audit is grounded in current-main fetched files.

---

## **17. Implementation handoff plan for a later Claude Code session**

Phase 1: specify the packet role vocabulary and parser.  
 Acceptance criteria: composite `required_because` values parse to a label set; unknown labels warn/fail according to legacy/new mode; `speaker` inside a composite triggers voice requirements.

Phase 2: implement role-demand validation.  
 Acceptance criteria: capability, relationship, promise/thread/consequence, plan, emotion, and offstage causal roles require the appropriate packet fields or rationale.

Phase 3: extend semantic source coverage for non-`dramatic_core` operational classes.  
 Acceptance criteria: capability affordance and capability limit/cost/access cannot silently disappear from `CHAR` to `STCHAR` in new/touched records.

Phase 4: add page-level overlay coverage.  
 Acceptance criteria: role-demanded active `STPLAN` / `STEMO` / `SREL` / `THR` / `OBL` / `CNSQ` overlays are referenced in §16a or intentionally marked irrelevant.

Phase 5: strengthen prose-attach repair routing.  
 Acceptance criteria: receipt recommendations distinguish prose drift, packet starvation, stale STCHAR, and state error.

Phase 6: add golden and negative fixtures.  
 Acceptance criteria: tests fail for valid-hash/empty-capability packet, composite speaker role without voice, retained capability without cost, offstage causal without mechanism, and active overlay omitted for role-demanded packet.

No specs or tickets are written here; this is the proposal handoff.

---

## **18. Open questions**

1. Should `required_because` become a YAML/list block inside §16a packets, or should the existing prose line remain but be parsed into labels? My recommendation: keep the prose line for readability, but add parser-enforced labels.  
2. Should extended source coverage map only `CHAR` frontmatter + named body sections, or should `character-generation` emit a dedicated `operational_fact_manifest` during `CHAR` creation? My recommendation: start with section-based mapping; add a manifest only if section anchors prove too fuzzy.  
3. How aggressive should legacy migration be? My recommendation: warnings for untouched legacy STCHAR/page plans; hard fails only for new/touched records and pre-apply plans.  
4. Should offstage causal omission ever be a hard fail inferred from story state? My recommendation: hard fail only when the page plan or event explicitly declares offstage causal dependence; otherwise warn.

## Outcome

Archived on 2026-05-25 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
