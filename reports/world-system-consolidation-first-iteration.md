# **1. Executive verdict**

The world system is **structurally promising but dangerously under-validated and semantically overgrown**.

The core architecture is basically right: world canon lives in `_source`, canon mutation is supposed to run through the patch engine, realized CHAR/DA artifacts read canon without mutating it, proposal surfaces stay non-canon, and the story system is downstream. That spine aligns with `FOUNDATIONS.md`, the machine-facing layer, and the hard-gate discipline.

The defect is not that the repo has no conceptual model. The defect is that the model is **distributed across skill prose, templates, partial validators, MCP vocabulary, and local warnings** instead of enforced by one shared world-system authority ladder. The result is a system where humans can probably do the right thing, but validators cannot reliably tell when a proposal has been semantically laundered into canon, when a diegetic claim has been misnamed as canon, when “approval” means review rather than acceptance, or when story-bundle concepts have leaked upstream.

Bluntly: **the world system is sound in intention, but the current consolidation state is not safe enough for more mature-world growth.** It needs fewer overlapping concepts, stricter schema coverage, and fail-fast compatibility diagnostics before more feature work.

The biggest blockers are:

1. **Approval semantics are overloaded.** `user_approved`, `source_basis.user_approved`, and `source_basis.direct_user_approval` are used across proposals, audits, CHAR, DA, and accepted canon with different meanings. The most dangerous case is `continuity-audit` writing RP cards with `source_basis.direct_user_approval: true` even though `FOUNDATIONS.md` reserves direct user approval for accepted canon facts.  
2. **Diegetic artifact truth language is wrong in one key place.** `diegetic-artifact-generation` says artifact claims are “contested canon at their strongest.” That should be replaced. A DA contains in-world assertions; only an accepted CF/PA can canonize the existence, circulation, disputed status, or truth of those assertions.  
3. **Forbidden mysteries are over-mandated.** `create-base-world` and `propose-new-worlds-from-preferences` require forbidden mysteries as an absolute. That conflicts with discovery-driven worlds and with the user’s stated target posture. Forbidden mysteries should be a strong default, not a universal law.  
4. **Proposal/audit/pressure/world-proposal surfaces are not schema-covered enough.** The validator currently covers `_source`, CHAR, DA, PA, NCP, NCB, and story records, but not PR/BATCH, EPE, EPE sidecars, AU/RP, NWP/NWB. Those are exactly the surfaces where maturity and approval confusion is most likely.  
5. **Taxonomies have multiplied without a single authority map.** Some vocabularies are canonical MCP/validator enums; others are local scoring heuristics; others look canonical but are not. This is survivable only if the repo adds an explicit vocabulary-authority layer.

The right consolidation move is not “add features.” It is to add a **world artifact maturity ladder**, rename approval fields, strengthen validators, relax forbidden-mystery absolutism, and fence story-facing vocabulary as world generativity rather than story-bundle state.

---

# **2. Method and sources**

## **Mission source**

This audit follows the uploaded mission prompt and its user decisions.

## **Active repo files inspected**

Active docs:

* `docs/FOUNDATIONS.md`  
* `docs/MACHINE-FACING-LAYER.md`  
* `docs/CONTEXT-PACKET-CONTRACT.md`  
* `docs/HARD-GATE-DISCIPLINE.md`  
* `docs/REPOSITORY-MAP.md`  
* `.claude/skills/skill-audit/references/cross-skill-consistency.md`

Scoped skills:

* `.claude/skills/canon-addition/SKILL.md`  
* `.claude/skills/create-base-world/SKILL.md`  
* `.claude/skills/character-generation/SKILL.md`  
* `.claude/skills/diegetic-artifact-generation/SKILL.md`  
* `.claude/skills/propose-new-canon-facts/SKILL.md`  
* `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md`  
* `.claude/skills/emergent-pressure-events/SKILL.md`  
* `.claude/skills/continuity-audit/SKILL.md`  
* `.claude/skills/propose-new-characters/SKILL.md`  
* `.claude/skills/deepen-character-proposal/SKILL.md`  
* `.claude/skills/propose-new-worlds-from-preferences/SKILL.md`

Representative active templates and schemas:

* `propose-new-canon-facts/templates/proposal-card.md`  
* `emergent-pressure-events/templates/pressure-event-card.md`  
* `propose-new-worlds-from-preferences/templates/proposal-card.md`  
* `diegetic-artifact-generation/templates/diegetic-artifact.md`  
* `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`  
* `tools/validators/src/schemas/character-frontmatter.schema.json`  
* `tools/validators/src/schemas/character-proposal-card.schema.json`

Active code searched/inspected:

* `tools/world-index/src/public/canonical-vocabularies.ts`  
* `tools/validators/src/structural/record-schema-compliance.ts`  
* `tools/validators/src/structural/utils.ts`  
* `tools/patch-engine/src/envelope/schema.ts`  
* `tools/patch-engine/src/commit/order.ts`  
* `tools/world-index/src/schema/types.ts`  
* `tools/world-mcp/README.md`

## **Archived files read**

None.

Search results surfaced archived hits for `story_fuel`, EPE allocator history, and patch-engine prior art, but I did not open archived files. The mission forbids broad archive use unless a current active file explicitly names a specific archived file as relevant.

## **Online research sources used**

The research was targeted at architectural implications: storyworlds as structured possible worlds, chronotope/time-space, novum/primary difference, emergent narrative, explicit world state, narrative planning, provenance, and schema validation.

Key sources used:

* Bakhtin/chronotope scholarship: time-space as genre/world structure.  
* Suvin’s novum/cognitive estrangement tradition: a world-making difference should propagate structurally, not sit as aesthetic dressing.  
* Interactive fiction/world generation research emphasizing explicit storyworld state, locations, objects, themes, and common-sense constraints.  
* Emergent narrative and simulation-first design research, including possible-world/tension-space approaches.  
* Narrative planning research emphasizing causality and character intentionality.  
* W3C PROV provenance model and overview.  
* JSON Schema validation concepts.  
* LLM/narrative-generation research on inconsistent story worlds and the need for explicit state.  
* Knowledge-graph-assisted narrative reasoning and storytelling coherence/control.

## **Areas not fully inspected**

I did not inspect every example file or every phase reference for every skill. I inspected the active SKILL files, critical templates, active schemas, active validator code, MCP/patch-engine contracts, and enough representative templates to verify schema, approval, maturity, write-surface, and vocabulary boundaries.

I did not inspect the two private mature worlds because they are unavailable and the mission explicitly says not to ask for them.

I did not execute validators or MCP tools. This was an audit/proposal pass through Git/code search and targeted fetches only.

Some long skill files returned truncated fetch output, but the relevant hard gates, outputs, write surfaces, schema references, and boundary language were visible.

---

# **3. Research synthesis**

## **Explicit world state is the right foundation**

Interactive narrative research repeatedly converges on the need for explicit world state: locations, objects, events, constraints, entities, and theme-bearing structure. Knowledge-graph-assisted storytelling work similarly treats structured world knowledge as a way to improve coherence and controllability.

**Repo implication:** Worldloom’s `_source` model is correct. Canon facts, entities, invariants, sections, mysteries, open questions, and change logs should remain machine-readable and validator-gated. The defect is that several pre-canon surfaces are not yet schema-backed, not that the canonical `_source` idea is wrong.

## **Chronotope supports “world affordance” language**

Chronotope theory treats time-space as an organizing structure of narrative possibility, not as decorative setting. A world’s geography, temporality, travel cost, historical layering, and social rhythm determine what kinds of events can naturally happen there.

**Repo implication:** `Natural Story Engines` and `Native Story Procedures` are not inherently wrong. They become wrong only when they imply downstream story-bundle state. The world system should keep world-generativity, but rename or fence ambiguous terms. “World affordances” is the better umbrella term.

## **Novum supports CF-1, but not CF-1 bloat**

Suvin’s novum tradition supports the idea of a central world-making difference whose consequences propagate through society, economy, embodiment, knowledge, and institutions.

**Repo implication:** `create-base-world` is right to create a primary-difference CF-1 and demand consequence propagation. But CF-1 should not be forced to contain every independent genesis premise. Some worlds need CF-1 plus two or three sibling genesis CFs rather than one overloaded mega-fact.

## **Emergent narrative supports EPE, but not `story_fuel`**

Emergent narrative research argues that stories can arise from simulated tensions, agents, and world rules rather than fixed authored plot beats.

**Repo implication:** `emergent-pressure-events` is conceptually justified. The problem is vocabulary: `story_fuel` sounds like downstream execution. EPE cards should be framed as **pressure affordances** or **world affordances**. Sidecar PRs may become canon proposals; base EPE cards should remain non-canon pressure artifacts.

## **Narrative planning supports character pressure, not plot destiny**

Narrative planning research emphasizes causal progression and character intentionality.

**Repo implication:** `character-generation` and `propose-new-characters` are right to require appetite, contradiction, pressure behavior, and relational charge. Those fields create world-embedded agents. But `intended_narrative_role`, `desired_arc_type`, and “story hooks” should not imply act beats, plot destiny, companion quests, or storylet logic.

## **Provenance theory supports approval-field separation**

The W3C PROV model separates entities, activities, agents, derivation, attribution, and generated artifacts so users can reason about reliability and trust.

**Repo implication:** Worldloom needs field names that encode provenance precisely. “User approved” is not precise enough. Proposal review, artifact write approval, canon acceptance, and direct source approval are different provenance events and must not share names.

## **Schema validation is the right enforcement layer**

JSON Schema is well-suited to structural validation of required fields, enums, object shapes, and forbidden additional properties.

**Repo implication:** It is not enough for SKILL prose to say “this is not canon.” PR, BATCH, EPE, AU, RP, NWP, and NWB need schema-backed validators so maturity boundaries are enforced mechanically.

## **LLM story systems need explicit consistency constraints**

LLM fiction generation research continues to identify weak persistent world models and inconsistent state as core problems.

**Repo implication:** Worldloom’s strict validation posture is not optional polish. It is the core defense against plausible-sounding but incoherent world growth.

---

# **4. Current world-system map**

## **4.1 Skill-by-skill current-state matrix**

| Skill | Current role | Writes | Authority level | Healthy boundary | Main drift |
| ----- | ----- | ----- | ----- | ----- | ----- |
| `create-base-world` | Genesis world creation | `WORLD_KERNEL.md`, `ONTOLOGY.md`, `_source` records via patch engine | Genesis + accepted canon | Creates initial world state only | Forbidden mystery too mandatory; CF-1 may be overburdened; story-procedure wording needs fencing |
| `canon-addition` | Canon adjudication | PA + accepted `_source` records through patch engine | Accepted canon if accept verdict | Only route that canonizes PR/RP/EPE sidecars | Mostly healthy; depends on proposal surfaces being honest |
| `character-generation` | Realized character dossier | `characters/CHAR*.md` via engine, `characters/INDEX.md` direct | Realized canon-reading hybrid | Reads canon; does not mutate canon | `source_basis.user_approved`; `intended_narrative_role` schema term |
| `diegetic-artifact-generation` | Realized in-world artifact | `diegetic-artifacts/DA*.md` via engine, index direct | Realized canon-reading hybrid | Reads canon; artifact claims not canon | “contested canon at strongest” is dangerous; DA claim schema weak |
| `propose-new-canon-facts` | Candidate canon facts | PR + BATCH + index direct | Candidate canon proposal | Input to `canon-addition` only | `user_approved`; heuristic vocab looks canonical; not schema-backed by current validator |
| `canon-facts-from-diegetic-artifacts` | Mines DA into PRs | PR + BATCH + index direct | Candidate canon proposal | Laundering firewall; contradictions go to audit | Healthy conceptually; same approval/schema gaps |
| `emergent-pressure-events` | Candidate pressure events | EPE, EPE sidecar PR, BATCH, index direct | Pressure affordance + candidate canon sidecar | Base EPE not canon; sidecar to `canon-addition` | `story_fuel`; pressure-events missing from repo/validator map; approval naming |
| `continuity-audit` | Post-hoc audit + retcon proposals | AU + RP + index direct | Audit artifact; RP candidate proposal | Proposes retcons only | `direct_user_approval` misuse on RP; lacks maturity/approval/story-leakage checks |
| `propose-new-characters` | Candidate character proposals | NCP + NCB + index direct | Candidate character proposal | Input to `character-generation` | `intended_narrative_role`, `likely_story_scale`, approval naming |
| `deepen-character-proposal` | Upgrades one seed/NCP | one NCP + index direct | Candidate character proposal | No CHAR/canon write | Good guardrails; still uses story-facing field names and fallback vocabulary |
| `propose-new-worlds-from-preferences` | Pre-world proposal generation | NWP, NWB, INDEX, LINEAGE, bootstrap files | Pre-world proposal | Input to `create-base-world` only | Forbidden mystery mandatory; huge heuristic taxonomy; approval naming |

## **4.2 Artifact maturity matrix**

| Artifact | Producer | Path | Authority level | Canon? | Proposal? | Hybrid realized artifact? | Downstream consumption | Evidence for canon-addition? | Write mechanism | Approval semantics | Validator coverage | Likely confusion |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `NWP` | `propose-new-worlds-from-preferences` | `world-proposals/NWP-*.md` | Pre-world proposal | No | Yes | No | `create-base-world` premise | No direct canon evidence | Direct write | Review kept in batch | Not in current validator schema | Looks like a world seed with canon layer fields |
| `NWB` | same | `world-proposals/batches/NWB-*.md` | Batch manifest | No | Batch | No | Future proposal generation | No | Direct write | Batch review | Not schema-backed | Pipeline-scoped vs world-scoped ID |
| `PR` | `propose-new-canon-facts`, DA mining, EPE sidecar | `proposals/PR-*.md` or `pressure-events/EPE*.proposal.md` | Candidate canon proposal | No | Yes | No | `canon-addition` | Yes, as proposal source | Direct write | Review kept in batch | Not schema-backed in current structural validator | Proposed status mistaken for accepted status |
| `BATCH` | PR/EPE proposal skills | `proposals/batches/BATCH-*.md`, `pressure-events/batches/BATCH-*.md` | Batch manifest | No | Batch | No | Human/audit | Indirect | Direct write | Batch review | Not schema-backed except NCB | `user_approved` sounds canon-grade |
| `RP` | `continuity-audit` | `audits/AU-*/retcon-proposals/RP-*.md` | Candidate retcon proposal | No | Yes | No | `canon-addition` | Yes | Direct write | Audit recommendation approval | Not schema-backed | Uses `direct_user_approval`, the worst approval collision |
| `EPE` | `emergent-pressure-events` | `pressure-events/EPE-*.md` | Pressure affordance | No | Sort of; not canon PR unless sidecar | No | Human, story downstream, sidecar route | Base card can inspire sidecar | Direct write | Review kept in batch | Allocator scans, but no schema-backed record | `story_fuel`, `status`, and `canonize` routing blur authority |
| `EPE*.proposal.md` | `emergent-pressure-events` | `pressure-events/EPE-*.proposal.md` | Candidate canon proposal | No | Yes | No | `canon-addition` | Yes | Direct write | Review kept in batch | Not schema-backed | PR-shaped card outside `proposals/` |
| `NCP` | `propose-new-characters`, `deepen-character-proposal` | `character-proposals/NCP-*.md` | Candidate character proposal | No | Yes | No | `character-generation` | Only if implied facts routed | Direct write | Character-proposal review | Schema-backed | Can be mistaken for character dossier |
| `NCB` | `propose-new-characters` | `character-proposals/batches/NCB-*.md` | Batch manifest | No | Batch | No | Human/skills | No | Direct write | Batch review | Schema-backed | Good relative to other proposal batches |
| `CHAR` | `character-generation` | `characters/*.md` | Realized canon-reading hybrid | Not canon fact; established world artifact | No | Yes | DA author, story downstream | Yes, as evidence/source | Engine op + index direct | Dossier write approval | Schema-backed | `intended_narrative_role`; approval field |
| `DA` | `diegetic-artifact-generation` | `diegetic-artifacts/*.md` | Realized in-world artifact | Artifact exists; claims not canon | No | Yes | Mining, story downstream | Yes, via DA mining/canon-addition | Engine op + index direct | Artifact write approval | Schema-backed but claim_map weak | “Contested canon” wording |
| `PA` | `canon-addition` | `adjudications/PA-*.md` | Adjudication/provenance artifact | Not itself the CF truth | No | Yes | Audit/provenance | Yes | Engine op | Canon-addition gate approval | Schema-backed | Could be misread as canon rather than decision record |
| `AU` | `continuity-audit` | `audits/AU-*.md` | Audit artifact | No | Recommendations | No | Human, RP generation | Indirect | Direct write | Audit report approved/acknowledged | Not schema-backed | Findings may be mistaken for applied fixes |
| `CF` | `create-base-world`, `canon-addition` | `_source/canon/CF-*.yaml` | Accepted world canon | Yes | No | No | All world/story systems | N/A | Patch engine | `direct_user_approval` only after accepted gate | Schema-backed | Contested CF vs DA claim |
| `CH` | same | `_source/change-log/CH-*.yaml` | Accepted change provenance | Canon ledger | No | No | Audit/retrieval | N/A | Patch engine | Gate-approved canon change | Schema-backed | `creates_new_story_engines` wording |
| `INV` | `create-base-world`, `canon-addition` | `_source/invariants/*.yaml` | Accepted governing constraint | Yes | No | No | Validators/skills | N/A | Patch engine | Gate-approved | Schema-backed | IDs vs record_type names |
| `M` | same | `_source/mystery-reserve/M-*.yaml` | Accepted mystery policy | Yes, as bounded unknown | No | No | Firewalls/skills | N/A | Patch engine | Gate-approved | Schema-backed | Forbidden vs discovery mystery |
| `OQ` | same | `_source/open-questions/OQ-*.yaml` | Accepted open design question | Canon-adjacent | No | No | Skills/audit | N/A | Patch engine | Gate-approved | Schema-backed | May be confused with mystery |
| `ENT` | same | `_source/entities/ENT-*.yaml` | Accepted named entity | Yes | No | No | Retrieval/mentions | N/A | Patch engine | Gate-approved | Schema-backed | Scoped references vs entities |
| `SEC` | same | `_source/<section-class>/SEC-*.yaml` | Accepted structured section | Yes/context | No | No | Context packets/retrieval | N/A | Patch engine | Gate-approved | Schema-backed | SEC file classes vs domains |

---

# **5. Consolidation fault matrix**

## **Fault 1 — No single artifact maturity ladder**

**Severity:** blocker  
 **Affected files/skills:** all scoped world skills; especially proposal, DA, EPE, AU/RP surfaces.  
 **Evidence:** Existing cross-skill consistency divides skills into categories, but there is no authoritative artifact lifecycle reference.  
 **Conceptual problem:** “Not canon,” “candidate,” “accepted,” “realized artifact,” “audit,” and “downstream” are repeated in local prose. Local prose drifts.  
 **FOUNDATIONS alignment problem:** `FOUNDATIONS.md` defines canon layers but not artifact maturity across NWP/NCP/PR/EPE/AU/CHAR/DA/PA.  
 **Research support:** Provenance systems need explicit entities, activities, derivation, and authority boundaries for trust.  
 **Recommended resolution:** Add `.claude/skills/_shared-references/world-artifact-maturity-ladder.md`; every scoped skill cites it.  
 **Validation requirement:** `artifact_maturity_validator`.  
 **Deletion/merge/rename:** Merge local maturity boilerplate into the shared reference; keep only skill-specific surfaces in each SKILL.

## **Fault 2 — Approval semantics laundering**

**Severity:** blocker  
 **Affected:** PR, BATCH, RP, EPE, NCP, NCB, NWP, NWB, CHAR, DA, AU.  
 **Evidence:** Proposal cards and EPE templates use `source_basis.user_approved`; continuity-audit writes RP cards with `source_basis.direct_user_approval: true`; accepted CFs use `source_basis.direct_user_approval` as canon provenance.  
 **Conceptual problem:** The same approval-looking fields mean “kept in batch,” “approved write,” “audit recommendation kept,” and “accepted as canon.”  
 **FOUNDATIONS alignment problem:** `direct_user_approval` belongs to accepted CF source basis, not pre-canon recommendations.  
 **Recommended resolution:** Reserve `direct_user_approval` for accepted CF records only. Rename all proposal/hybrid review fields.  
 **Exact replacement field map:**

| Old field | Replacement |
| ----- | ----- |
| `source_basis.user_approved` on PR | `source_basis.proposal_review_approved` |
| `user_approved` on PR batch | `batch_review_approved` |
| `source_basis.user_approved` on NCP | `source_basis.character_proposal_review_approved` |
| `user_approved` on NCB | `batch_review_approved` |
| `source_basis.user_approved` on CHAR | `source_basis.dossier_write_approved` |
| `source_basis.user_approved` on DA | `source_basis.artifact_write_approved` |
| `source_basis.user_approved` on EPE | `source_basis.pressure_event_review_approved` |
| `source_basis.user_approved` on EPE sidecar | `source_basis.proposal_review_approved` |
| `source_basis.direct_user_approval` on RP | `source_basis.audit_recommendation_approved` |
| `user_approved` on AU | `audit_report_reviewed` |
| `source_basis.user_approved` on NWP | `source_basis.world_proposal_review_approved` |
| `user_approved` on NWB | `batch_review_approved` |

**Validation requirement:** `approval_semantics_validator`; hard fail for any non-CF use of `source_basis.direct_user_approval`.  
 **Deletion/merge/rename:** Rename required.

## **Fault 3 — Diegetic claims called “contested canon”**

**Severity:** blocker  
 **Affected:** `diegetic-artifact-generation`, DA template, DA schema, DA mining.  
 **Evidence:** The DA skill says artifact claims are “contested canon at their strongest,” while DA template also maintains a `claim_map` with claim-level canon-like statuses.  
 **Conceptual problem:** In-world assertions are not canon. At most, canon can say a claim exists, circulates, is believed, is disputed, or is propaganda.  
 **FOUNDATIONS alignment problem:** `FOUNDATIONS.md` has a legitimate `contested_canon` layer, but that layer belongs to accepted canon, not raw artifact assertions.  
 **Recommended resolution:** Replace “contested canon at strongest” with “diegetic assertions.” Rename DA `claim_map.canon_status` to `claim_relation_to_canon`.  
 **Exact replacement text:**

A diegetic artifact’s claims are in-world assertions, not canon. The artifact may canonically exist as a world artifact, and it may cite or distort accepted CFs, but its statements do not become accepted world truth by appearing in the artifact. A later `canon-addition` run may accept a CF stating that a claim exists, circulates, is believed, is disputed, is propagandistic, or is true/false. Only that accepted CF may use `status: contested_canon`.

**Validation requirement:** `in_world_claim_vs_canon_validator`; DA `claim_map` item schema.  
 **Deletion/merge/rename:** Rename `canon_status` field.

## **Fault 4 — Forbidden mystery absolutism**

**Severity:** major  
 **Affected:** `create-base-world`, `propose-new-worlds-from-preferences`, Mystery Reserve validators/templates.  
 **Evidence:** `create-base-world` seeds active/passive/forbidden; NWP template requires forbidden mystery “MANDATORY.”  
 **Conceptual problem:** Some worlds depend on discovering central truths. If every central unknown is forbidden forever, discovery-driven fiction is crippled.  
 **FOUNDATIONS alignment problem:** Rule 7 says preserve mystery deliberately; it does not require every world to lock major truths forever.  
 **Recommended resolution:** Add `resolution_intent`; make forbidden mystery a strong default with rationale, not an absolute.  
 **Validation requirement:** `mystery_policy_validator`.  
 **Deletion/merge/rename:** No deletion; sharpen statuses and add intent.

## **Fault 5 — Proposal/audit/pressure/world-proposal surfaces lack schema coverage**

**Severity:** blocker  
 **Affected:** PR/BATCH, EPE, EPE sidecars, AU/RP, NWP/NWB.  
 **Evidence:** Validator schema coverage includes `_source`, CHAR, NCP/NCB, DA, PA, story records; it does not structurally validate PR/BATCH/EPE/AU/RP/NWP/NWB.  
 **Conceptual problem:** The least mature artifacts are exactly where maturity and approval semantics need the most validation.  
 **Recommended resolution:** Add JSON Schemas and structural validators for PR, PR batch, EPE, EPE sidecar, AU, RP, NWP, NWB.  
 **Validation requirement:** `proposal_surface_schema_validator`.  
 **Deletion/merge/rename:** None; add schemas.

## **Fault 6 — Story-facing terminology is partly unfenced**

**Severity:** major  
 **Affected:** `character-generation`, `propose-new-characters`, `emergent-pressure-events`, `create-base-world`, `propose-new-worlds-from-preferences`, CH schema.  
 **Evidence:** Active terms include `story_fuel`, `intended_narrative_role`, `likely_story_scale`, `Native Story Procedures`, `Natural Story Engines`, and `creates_new_story_engines`.  
 **Conceptual problem:** Some are valid world-generativity language; some sound like downstream execution.  
 **FOUNDATIONS alignment problem:** Story bundles are downstream; world canon must not assume story-bundle state.  
 **Recommended resolution:** Rename the worst offenders and define allowed story-generativity language in `FOUNDATIONS.md`.  
 **Validation requirement:** `story_leakage_linter`.  
 **Deletion/merge/rename:** Rename `story_fuel`, `intended_narrative_role`, `desired_arc_type`, and `creates_new_story_engines`.

## **Fault 7 — Taxonomy proliferation without authority map**

**Severity:** major  
 **Affected:** all proposal/generation skills.  
 **Evidence:** Canonical vocabularies exist in code; skill-local taxonomies include 23 baseline domains, 13 exposition domains, 14 EPE origin types, 14-layer world essence, 80+ pattern axes, proposal families, depth classes, and enrichment categories.  
 **Conceptual problem:** Useful heuristics look like canonical enums.  
 **Recommended resolution:** Every closed list must declare one of: canonical validator vocabulary, schema-backed local enum, skill-local diagnostic vocabulary, routing sentinel, or prose heuristic.  
 **Validation requirement:** `taxonomy_authority_validator`.  
 **Deletion/merge/rename:** Merge duplicate domain vocab where possible; otherwise label authority.

## **Fault 8 — MCP vocabulary drift and fallback posture**

**Severity:** major  
 **Affected:** retrieval prose across skills.  
 **Evidence:** MCP README explicitly says `record_type` and `node_type` are related but not interchangeable; active supported schema/node vocab differs from some skill prose forms such as `canon_fact` vs `canon_fact_record`.  
 **Conceptual problem:** Skills can silently drift from deployed server contracts.  
 **Recommended resolution:** Pre-flight `describe_capabilities`, `get_record_schema`, `get_canonical_vocabulary`, and `describe_envelope_schema` must be treated as source-of-truth checks. No manual fallback except where active MCP contract explicitly documents it.  
 **Validation requirement:** `mcp_contract_validator`.  
 **Deletion/merge/rename:** Delete older-server fallback language from active skills unless explicitly required for diagnostics.

## **Fault 9 — EPE surface is active but under-mapped**

**Severity:** moderate-to-major  
 **Affected:** `emergent-pressure-events`, `REPOSITORY-MAP`, validators, MCP record schemas.  
 **Evidence:** EPE skill writes `pressure-events/`; repo map does not list it as a standard world surface; MCP allocator supports EPE by scanning files, but schema discovery/list_records does not expose EPE records.  
 **Conceptual problem:** EPE is important enough to have an allocator and sidecar contract, but not enough validator/index authority.  
 **Recommended resolution:** Either make EPE schema-backed/indexed or explicitly classify it as direct-write unindexed pressure affordance with its own validator. The better answer is schema-backed/indexed.  
 **Validation requirement:** `pressure_event_schema_validator`.  
 **Deletion/merge/rename:** Rename `story_fuel`.

## **Fault 10 — Base-world genesis is thin but not quite shaped right**

**Severity:** moderate  
 **Affected:** `create-base-world`, NWP template.  
 **Evidence:** CF-1 carries primary difference with ≥4 domains and consequence orders; one SEC per prose concern; mandatory active/passive/forbidden mysteries.  
 **Conceptual problem:** “Thin but concrete” is good. Overloading CF-1 and forcing forbidden mysteries is not.  
 **Recommended resolution:** Allow CF-1 plus 1–3 sibling genesis CFs; keep SEC minimal; make forbidden optional-with-rationale.  
 **Validation requirement:** `genesis_world_shape_validator`.  
 **Deletion/merge/rename:** Rename “Native Story Procedures.”

## **Fault 11 — Continuity audit does not yet audit consolidation defects**

**Severity:** major  
 **Affected:** `continuity-audit`.  
 **Evidence:** It audits contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, diegetic leakage, and silent-area canonization, but not maturity confusion, approval semantics, taxonomy misuse, or story-leakage as first-class compatibility checks.  
 **Conceptual problem:** The post-hoc integrity tool cannot detect the defects this mission is about.  
 **Recommended resolution:** Add a compatibility appendix or create a separate `world-system-compatibility-audit`. Prefer separate validator plus optional continuity-audit reporting.  
 **Validation requirement:** `world_compatibility_validator`.  
 **Deletion/merge/rename:** Rename RP approval field immediately.

---

# **6. Proposed conceptual spine**

## **6.1 Add shared reference**

**Proposed path:**

.claude/skills/_shared-references/world-artifact-maturity-ladder.md

Every scoped world-system skill should cite it in its Governance or Prerequisites section.

## **6.2 Full proposed contents**

# World Artifact Maturity Ladder

This reference defines the authority level of world-system artifacts. It is subordinate to `docs/FOUNDATIONS.md` and exists to prevent proposal/canon, diegetic/canon, audit/canon, and world/story boundary collapse.

## Non-negotiable rules

1. Canon is record authority, not prose confidence. A statement becomes accepted world canon only when it is represented by an accepted `_source/` record created or updated through the canon mutation path.  
2. A proposal file is never canon because it exists, because it was reviewed, or because it contains `approved` language.  
3. A realized hybrid artifact may exist inside the world and may read canon, but it does not mutate canon.  
4. A diegetic artifact’s claims are in-world assertions. They are not canon unless a later accepted CF canonizes their truth, circulation, disputed status, or existence.  
5. Audit artifacts are epistemic recommendations, not applied repairs.  
6. Story-bundle records are downstream. World artifacts may describe world affordances and natural conflict procedures, but must not contain story-bundle state such as pages, choices, storylets, act beats, companion quests, plot destiny, or story-local clocks.  
7. Approval vocabulary must name the approved act. Review approval, artifact-write approval, audit-recommendation approval, and canon acceptance are different events.

## Level 0 — Pre-world proposal

Examples: `NWP-*`, `NWB-*`.

Authority: candidate world idea.

Canon status: not canon; not a world.

Allowed consumers: `create-base-world`.

Write surface: `world-proposals/`.

Approval field: `world_proposal_review_approved` or `batch_review_approved`.

Forbidden language: do not say the world “exists” because an NWP exists.

## Level 1 — Genesis world state

Examples: `WORLD_KERNEL.md`, `ONTOLOGY.md`, `CF-1`, `CH-1`, initial `INV`, `M`, `OQ`, `ENT`, `SEC`.

Authority: initial accepted world state.

Canon status: accepted canon for `_source` records; root authored governance for kernel/ontology.

Allowed producer: `create-base-world`.

Write surface: root files plus patch-engine-routed `_source` records.

Approval field: canon-creation HARD-GATE approval; accepted CFs may use `source_basis.direct_user_approval`.

## Level 2 — Candidate canon proposal

Examples: `PR-*`, `RP-*`, `EPE-*.proposal.md`.

Authority: candidate canon change.

Canon status: not canon.

Allowed consumer: `canon-addition`.

Write surface: proposal/audit/pressure-event sidecar surfaces.

Approval field: `proposal_review_approved` or `audit_recommendation_approved`.

Forbidden language: do not use `source_basis.direct_user_approval`; do not say “accepted” except as a future canon-addition outcome.

## Level 3 — Candidate character proposal

Examples: `NCP-*`, `NCB-*`.

Authority: candidate character dossier input.

Canon status: not canon; not an established character.

Allowed consumer: `character-generation`.

Write surface: `character-proposals/`.

Approval field: `character_proposal_review_approved` or `batch_review_approved`.

Canon edge rule: implied new facts must be listed under `canon_assumption_flags`; they must not be asserted as canon.

## Level 4 — Realized canon-reading hybrid artifact

Examples: `CHAR-*` dossiers and `DA-*` diegetic artifacts.

Authority: existing world artifact/dossier that reads canon.

Canon status: not a CF; does not mutate `_source`.

Allowed consumers: story system, DA generation, DA mining, proposal generation, continuity audit.

Write surface: patch-engine-routed hybrid append ops plus direct index update.

Approval fields: `dossier_write_approved` for CHAR; `artifact_write_approved` for DA.

Evidence rule: may serve as evidence/source for later proposals; evidence does not equal canonization.

## Level 5 — Accepted world canon

Examples: `CF`, `CH`, `INV`, `M`, `OQ`, `ENT`, `SEC`.

Authority: accepted world state.

Canon status: canon or canon-governance record.

Allowed producers: `create-base-world`, `canon-addition`.

Write surface: patch engine only.

Approval field: accepted CFs may use `source_basis.direct_user_approval`.

Validation: schema, hard gate, patch engine, validators.

## Level 6 — Adjudication/provenance artifact

Examples: `PA-*`.

Authority: adjudication record documenting canon-addition decision.

Canon status: not a substitute for CF truth; authoritative as provenance.

Allowed producer: `canon-addition`.

Write surface: patch-engine-routed adjudication append.

Approval field: canon-addition gate approval metadata, not proposal review approval.

## Level 7 — Audit artifact

Examples: `AU-*`.

Authority: diagnostic report.

Canon status: not canon; not applied repair.

Allowed consumers: human reviewer, future proposal generation, `canon-addition` via emitted RP cards.

Write surface: `audits/`.

Approval field: `audit_report_reviewed`.

## Level 8 — Pressure affordance artifact

Examples: base `EPE-*` cards.

Authority: non-canon pressure event candidate representing what the current world could plausibly produce.

Canon status: not canon.

Allowed consumers: human reviewer, downstream story system, or sidecar proposal route.

Write surface: `pressure-events/`.

Approval field: `pressure_event_review_approved`.

Routing values: `canonize`, `world_affordance`, `ambient`. Avoid `story_fuel`.

## Level 9 — Story-system downstream records

Examples: story entities, pages, choices, storylets, story facts, story clocks, story secrets.

Authority: story-bundle-local execution state.

Canon status: downstream consumer state; not upstream world canon unless promoted through an explicit story-fact-promotion path.

Write surface: `worlds/<slug>/stories/<story>/...`.

Rule: world-system skills must not depend on story-bundle state.

## **6.3 Skills that should cite it**

All scoped skills:

* `create-base-world`  
* `canon-addition`  
* `character-generation`  
* `diegetic-artifact-generation`  
* `propose-new-canon-facts`  
* `canon-facts-from-diegetic-artifacts`  
* `emergent-pressure-events`  
* `continuity-audit`  
* `propose-new-characters`  
* `deepen-character-proposal`  
* `propose-new-worlds-from-preferences`

## **6.4 Language to remove from individual skills**

Remove repeated local warnings such as:

* “This is not canon” blocks duplicated across every proposal template.  
* “user_approved means kept in batch” explanations.  
* “proposals are not characters/canon/worlds” repeated in every skill.

Replace with:

Authority and approval semantics follow `.claude/skills/_shared-references/world-artifact-maturity-ladder.md`. This skill’s artifact level is: <level name>.

Local skill files should still name their exact write paths and consumers.

## **6.5 Interaction with `FOUNDATIONS.md`**

`FOUNDATIONS.md` remains the constitution. The maturity ladder should not redefine canon layers. It should explain how **files and artifacts move toward or away from those layers**.

---

# **7. `FOUNDATIONS.md` recommendations**

## **7.1 Insert artifact maturity section after Canon Layers**

**Reason:** `FOUNDATIONS.md` defines canon layers but not artifact maturity.

**Exact insertion text:**

## Artifact Authority and Maturity

Canon layer and artifact maturity are separate.

A file may discuss canon without being canon. A proposal may recommend a canon fact without being a canon fact. A diegetic artifact may contain an in-world assertion without making that assertion true. An audit may recommend a retcon without applying it.

The world system recognizes these artifact maturity classes:

1. **Pre-world proposal** — candidate world idea such as `NWP-*`; not a world and not canon.  
2. **Candidate canon proposal** — candidate canon change such as `PR-*`, `RP-*`, or an EPE sidecar proposal; not canon until accepted by `canon-addition`.  
3. **Candidate character proposal** — candidate dossier input such as `NCP-*`; not an established character.  
4. **Realized canon-reading hybrid artifact** — existing world artifact such as `CHAR-*` or `DA-*`; reads canon and may be cited as evidence, but does not mutate canon.  
5. **Accepted world canon** — `_source/` records such as `CF`, `CH`, `INV`, `M`, `OQ`, `ENT`, and `SEC`; engine-routed and validator-gated.  
6. **Adjudication/provenance artifact** — `PA-*`; records an adjudication decision but does not replace the accepted records it creates or updates.  
7. **Audit artifact** — `AU-*`; diagnostic and recommendation-bearing, not an applied change.  
8. **Downstream story record** — story-bundle-local state; a consumer of world canon, not upstream world canon.

Only accepted world-canon records may claim accepted world-canon authority. Proposal review, artifact write approval, and audit recommendation approval are not canon acceptance.

## **7.2 Replace Contested Canon wording**

**Reason:** Prevent DA assertions from being treated as canon.

**Exact replacement text:**

- **Contested canon**: accepted canon about the existence, circulation, force, or disputed status of a claim, belief, legend, propaganda line, false scholarship, local interpretation, or unreliable tradition. Contested canon does not mean “whatever an in-world artifact says.” A diegetic artifact may contain in-world assertions, but those assertions become canon only if `canon-addition` accepts a CF about their truth, falsehood, circulation, or contested status.

## **7.3 Replace Mystery Reserve status section**

**Reason:** Current implementation already includes `passive_depth`, and forbidden mysteries should not be absolute.

**Exact replacement text:**

Mystery Reserve entries use a `status` and a `future_resolution_safety`.

Statuses:

- `active` — a live mystery that characters, institutions, or artifacts may pursue or contest.  
- `passive` — background uncertainty that deepens the world but is not currently driving major action.  
- `passive_depth` — atmospheric or metaphysical depth that should usually remain peripheral unless deliberately promoted.  
- `forbidden` — a deliberately protected unknown whose answer should not be revealed by ordinary canon growth.

Resolution safety:

- `forbidden` mysteries must use `future_resolution_safety: none`.  
- `active`, `passive`, and `passive_depth` mysteries must use `low`, `medium`, or `high`.

Forbidden mysteries are a strong default, not an absolute law. A world should usually preserve at least some bounded unknowns, but some worlds depend on discovering central truths. When a world omits forbidden mysteries, or when a central mystery is intended for eventual revelation, the record must explain the policy explicitly rather than pretending every mystery is permanently unknowable.

Recommended `resolution_intent` values:

- `unknown_forever`  
- `clue_discovery`  
- `eventual_revelation`  
- `author_known_local_unknown`  
- `story_reserved`  
- `passive_depth`  
- `metaphysical_boundary`

A mystery intended for clue-discovery or eventual revelation must not be marked `forbidden`.

## **7.4 Add approval semantics paragraph**

**Reason:** Approval field collision is the single most dangerous semantic defect.

**Exact insertion text:**

## Approval Semantics

Approval fields must name the approved act.

`source_basis.direct_user_approval` is reserved for accepted canon facts and means the user directly approved this fact’s acceptance into world canon through the canon mutation path.

Do not use `source_basis.direct_user_approval` on proposal cards, retcon proposal cards, audits, character proposals, pressure events, diegetic artifacts, or character dossiers.

Use explicit review/write fields instead, such as:

- `proposal_review_approved`  
- `batch_review_approved`  
- `character_proposal_review_approved`  
- `world_proposal_review_approved`  
- `dossier_write_approved`  
- `artifact_write_approved`  
- `pressure_event_review_approved`  
- `audit_report_reviewed`  
- `audit_recommendation_approved`

None of those fields means canon acceptance.

## **7.5 Add story-generativity boundary paragraph**

**Reason:** Preserve world-generativity without story-bundle leakage.

**Exact insertion text:**

## World Generativity vs Story-Bundle State

Worldbuilding may describe the kinds of conflicts, procedures, pressures, revelations, and story possibilities a world structurally produces. Terms such as “natural story engine” are acceptable only when they mean world-level generativity.

World-canon and world-proposal artifacts must not encode downstream story-bundle execution state: page ids, choice ids, storylet ids, act beats, plot destiny, companion quests, story-local clocks, or story-local state transitions.

Prefer `world_affordance`, `pressure_affordance`, `native world procedure`, or `discovery procedure` when a field is meant to describe generative possibility rather than downstream story execution.

## **7.6 Rename change-log story field**

**Reason:** `creates_new_story_engines` is acceptable in intention but ambiguous in canon metadata.

**Recommendation:** Replace with:

creates_new_world_affordances: true | false

If the field is retained temporarily, define it as:

`creates_new_story_engines` means “creates new world-level affordances for future stories.” It does not refer to story-bundle state or downstream execution.  
---

# **8. Skill-by-skill recommendations**

## **8.1 `create-base-world`**

**Current role:** creates genesis world state.  
 **Healthy boundaries:** root kernel/ontology plus engine-routed `_source`; no story-bundle assumptions.  
 **Detected drift:** mandatory forbidden mystery; CF-1 overburden risk; “Native Story Procedures” wording.  
 **Merge/delete/rename:**

* Rename `Native Story Procedures` → `Native World Procedures`.  
* Rename `Natural Story Engines` heading only if the project wants maximum clarity; otherwise define it as world-generativity.  
* Allow multiple genesis CFs when needed.

**Exact replacement text for mystery requirement:**

Seed at least two bounded mysteries. At least one should be active, passive, passive_depth, clue-discovery, or author-known-local-unknown. A forbidden mystery is strongly recommended when the premise has a protected metaphysical boundary or an answer whose revelation would collapse the world’s generativity, but it is not mandatory. If no forbidden mystery is seeded, write `forbidden_mystery_absence_rationale` explaining why discovery or eventual revelation is structurally necessary for this world.

**Validation additions:**

* `genesis_world_shape_validator`  
* `mystery_policy_validator`  
* CF-1 split warning: if CF-1 has multiple independent impossible facts, require split.

## **8.2 `canon-addition`**

**Current role:** adjudicates proposals and creates accepted canon.  
 **Healthy boundaries:** patch-engine mutation, PA provenance, HARD-GATE approval.  
 **Detected drift:** mostly healthy; vulnerable to bad proposal inputs.  
 **Guardrail changes:**

* Reject proposal cards using `source_basis.direct_user_approval`.  
* Normalize proposal review fields to evidence only.  
* If proposal path is EPE sidecar, validate it as sidecar maturity level before adjudication.

**Exact insertion text:**

Before Phase 0 proposal parsing, run artifact maturity validation. A proposal card may carry `proposal_review_approved`, `audit_recommendation_approved`, or `pressure_event_review_approved`, but these are review provenance only. They must not be copied into accepted CF `source_basis`. Accepted CFs set `source_basis.direct_user_approval: true` only after this skill’s verdict, HARD-GATE approval, approval-token issuance, and successful patch-engine submission.

## **8.3 `character-generation`**

**Current role:** creates CHAR dossier.  
 **Healthy boundaries:** realized hybrid artifact; reads canon; no `_source` mutation.  
 **Detected drift:** `source_basis.user_approved`; `intended_narrative_role`; story hooks.  
 **Rename:**

* `source_basis.user_approved` → `source_basis.dossier_write_approved`  
* `intended_narrative_role` → `world_affordance_role`  
* `Likely Story Hooks` → `World Affordances / Possible Uses`

**Validation additions:**

* Require `source_basis.dossier_write_approved`.  
* Forbid page/choice/storylet/act-position fields.  
* Preserve protagonist-grade engine as world-character quality, not plot destiny.

## **8.4 `diegetic-artifact-generation`**

**Current role:** creates DA artifact.  
 **Healthy boundaries:** realized in-world artifact; engine-routed hybrid; no canon mutation.  
 **Detected drift:** “contested canon at strongest”; weak claim_map schema; `source_basis.user_approved`.  
 **Rename:**

* `source_basis.user_approved` → `source_basis.artifact_write_approved`  
* `claim_map.canon_status` → `claim_map.claim_relation_to_canon`

**Exact replacement text:** use the DA text in Fault 3.

**Validation additions:**

* DA `claim_map` item schema.  
* No `contested_canon` string inside DA claim_map.  
* Every world-level true claim must cite CF.  
* Every mystery-adjacent claim must cite M and comply with `resolution_intent`.

## **8.5 `propose-new-canon-facts`**

**Current role:** emits PR candidate canon cards.  
 **Healthy boundaries:** direct-write proposal surface; no canon mutation; input to `canon-addition`.  
 **Detected drift:** `user_approved`; `story_yield`; heuristic taxonomies unlabeled.  
 **Rename:**

* `source_basis.user_approved` → `source_basis.proposal_review_approved`  
* batch `user_approved` → `batch_review_approved`  
* `story_yield` → `world_affordance_yield`

**Validation additions:**

* PR schema.  
* BATCH schema.  
* Ensure `proposed_status` is proposal intent, not accepted status.  
* Reject `source_basis.direct_user_approval`.

## **8.6 `canon-facts-from-diegetic-artifacts`**

**Current role:** mines DA assertions into PRs with laundering firewall.  
 **Healthy boundaries:** conceptually strong; prose-primary extraction is correct.  
 **Detected drift:** same PR approval/schema gaps.  
 **Guardrail changes:**

* Use new DA claim language.  
* Require mined PR to distinguish:  
  * claim exists in artifact  
  * claim socially circulates  
  * claim is true  
  * claim is false  
  * claim is disputed

**Validation additions:**

* Mining output must use `source_basis.derived_from: [DA-*]`.  
* No single-narrator canonization without evidence-breadth rationale.  
* Reject direct conversion of DA `claim_relation_to_canon=unaddressed_in_canon` into hard canon without independent evidence.

## **8.7 `emergent-pressure-events`**

**Current role:** emits non-canon pressure events and optional canon proposal sidecars.  
 **Healthy boundaries:** good idea; pressure events are world affordances, not canon.  
 **Detected drift:** `story_fuel`; `pressure-events/` under-mapped; approval naming; EPE sidecar PR outside normal proposal directory.  
 **Rename:**

* `downstream_routing: story_fuel` → `downstream_routing: world_affordance`  
* `rumor_waves: story-fuel staple` → `rumor_waves: downstream affordance signal`  
* `source_basis.user_approved` → `source_basis.pressure_event_review_approved`

**Validation additions:**

* EPE schema.  
* EPE sidecar schema.  
* Sidecar must declare `maturity_level: candidate_canon_proposal`.  
* Base EPE must declare `maturity_level: pressure_affordance`.  
* Add `pressure-events/` to repository map and validator/index scan.

## **8.8 `continuity-audit`**

**Current role:** audits continuity and emits RP candidate retcons.  
 **Healthy boundaries:** proposes; does not apply.  
 **Detected drift:** RP `source_basis.direct_user_approval`; lacks world-system compatibility checks.  
 **Rename:**

* RP `source_basis.direct_user_approval` → `source_basis.audit_recommendation_approved`  
* AU `user_approved` → `audit_report_reviewed`

**Validation additions:**

* RP schema.  
* AU schema.  
* Compatibility appendix:  
  * maturity confusion  
  * approval field misuse  
  * DA claim/canon confusion  
  * forbidden mystery overuse  
  * story-leakage  
  * taxonomy misuse

**Recommendation:** Do not overload continuity-audit as the only compatibility validator. Add a separate validator and let continuity-audit report its findings.

## **8.9 `propose-new-characters`**

**Current role:** emits candidate character proposals.  
 **Healthy boundaries:** NCP is not CHAR; canon-requiring facts are routed, not asserted.  
 **Detected drift:** `intended_narrative_role`, `likely_story_scale`, `desired_arc_type`, approval naming.  
 **Rename:**

* `intended_narrative_role` → `world_affordance_role`  
* `likely_story_scale` → `likely_affordance_scale`  
* `desired_arc_type` → `desired_pressure_trajectory`  
* `source_basis.user_approved` → `source_basis.character_proposal_review_approved`

**Validation additions:**

* Existing NCP schema should be updated for renamed fields.  
* Forbid story-bundle execution fields.  
* Keep `canon_assumption_flags` as-is; it is good.

## **8.10 `deepen-character-proposal`**

**Current role:** upgrades one seed/NCP into stronger NCP.  
 **Healthy boundaries:** no canon, no CHAR, no batch.  
 **Detected drift:** inherits NCP story-facing fields; older fallback posture.  
 **Changes:**

* Use renamed NCP fields.  
* Remove older-server fallback unless failure is diagnostic-only.  
* Require `mcp_contract_validator` before run.

## **8.11 `propose-new-worlds-from-preferences`**

**Current role:** emits pre-world proposals.  
 **Healthy boundaries:** NWP is not a world; downstream to `create-base-world`.  
 **Detected drift:** mandatory forbidden mystery; very large heuristic taxonomy; story-procedure wording; approval naming.  
 **Rename:**

* `source_basis.user_approved` → `source_basis.world_proposal_review_approved`  
* `Native Story Procedures` → `Native World Procedures`  
* `Natural Story Engines` → either keep with definition or rename `World Affordances`

**Exact replacement text for mystery section:**

## Mystery Reserve Seeds

Each proposal must include a deliberate mystery policy. It should usually include at least one bounded unknown, but it does not always need a forbidden mystery.

- **Active or clue-discovery mystery**: intended to generate investigation or revelation pressure.  
- **Passive or passive-depth mystery**: intended to deepen the world without requiring near-term resolution.  
- **Forbidden mystery**: strongly recommended when an answer would collapse the world’s metaphysical boundary or generative tension; optional when the proposal depends on eventual discovery.

If no forbidden mystery is included, populate `forbidden_mystery_absence_rationale`.

**Validation additions:**

* NWP/NWB schema.  
* No absolute forbidden requirement.  
* Cross-world MR firewall still required when existing worlds exist.

---

# **9. Shared references/templates/schema recommendations**

## **9.1 New shared references**

Add:

.claude/skills/_shared-references/world-artifact-maturity-ladder.md

Do not add five new references. One strong spine is better than a new pile of partial policies.

Optional later extraction if this grows too large:

.claude/skills/_shared-references/world-vocabulary-authority.md

But first put vocabulary authority inside the maturity ladder.

## **9.2 Template changes**

Required template changes:

* PR proposal card:  
  * `source_basis.user_approved` → `source_basis.proposal_review_approved`  
  * `story_yield` → `world_affordance_yield`  
  * Add `maturity_level: candidate_canon_proposal`  
* PR batch:  
  * `user_approved` → `batch_review_approved`  
  * Add `maturity_level: proposal_batch`  
* RP card:  
  * `source_basis.direct_user_approval` → `source_basis.audit_recommendation_approved`  
  * Add `maturity_level: candidate_canon_proposal`  
* EPE card:  
  * `story_fuel` → `world_affordance`  
  * `source_basis.user_approved` → `source_basis.pressure_event_review_approved`  
  * Add `maturity_level: pressure_affordance`  
* EPE sidecar:  
  * Add `maturity_level: candidate_canon_proposal`  
  * Use `source_basis.proposal_review_approved`  
* NCP card:  
  * `intended_narrative_role` → `world_affordance_role`  
  * `desired_arc_type` → `desired_pressure_trajectory`  
  * `source_basis.user_approved` → `source_basis.character_proposal_review_approved`  
  * Add `maturity_level: candidate_character_proposal`  
* CHAR dossier:  
  * `intended_narrative_role` → `world_affordance_role`  
  * `source_basis.user_approved` → `source_basis.dossier_write_approved`  
  * Add `maturity_level: realized_character_dossier`  
* DA artifact:  
  * `source_basis.user_approved` → `source_basis.artifact_write_approved`  
  * `claim_map.canon_status` → `claim_map.claim_relation_to_canon`  
  * Add `maturity_level: realized_diegetic_artifact`  
* NWP:  
  * `source_basis.user_approved` → `source_basis.world_proposal_review_approved`  
  * Forbidden mystery requirement becomes optional-with-rationale  
  * Add `maturity_level: pre_world_proposal`  
* NWB:  
  * `user_approved` → `batch_review_approved`  
  * Add `maturity_level: pre_world_batch`

## **9.3 Schema recommendations**

Add or update schemas:

proposal-card.schema.json  
proposal-batch.schema.json  
pressure-event-card.schema.json  
pressure-event-sidecar-proposal.schema.json  
audit-report.schema.json  
retcon-proposal-card.schema.json  
world-proposal-card.schema.json  
world-proposal-batch.schema.json

Strengthen existing schemas:

* DA `claim_map` item schema.  
* DA `source_basis` explicit fields.  
* CHAR `source_basis` explicit fields.  
* NCP renamed fields and prohibition of story-bundle execution fields.  
* Mystery schema: add `resolution_intent`.

## **9.4 MCP vocabulary checks**

Every world skill pre-flight should call or require the deployed equivalent of:

* `describe_capabilities`  
* `get_canonical_vocabulary`  
* `get_record_schema`  
* `describe_envelope_schema` when submitting patch plans

If the deployed MCP contract does not support a skill-required enum, record type, node type, or operation, fail with a detailed incompatibility error. Do not silently fall back to older prose assumptions.

## **9.5 Patch-engine/envelope checks**

Patch-engine coverage is appropriate for `_source`, PA, CHAR, and DA. Operation kinds confirm that PR/EPE/AU/NWP surfaces are not engine ops today.

Do not force every proposal direct-write surface through patch engine immediately. Instead:

1. Schema-validate proposal direct-write surfaces.  
2. Add maturity validators.  
3. Add index consistency checks.  
4. Consider engine ops later if direct-write recovery remains painful.

---

# **10. Validation and incompatibility plan**

This plan explicitly rejects migration/backwards compatibility as the primary goal. The desired behavior is fail-fast validation with detailed incompatibility messages and manual repair.

## **10.1 `world_compatibility_validator`**

**Checks:** high-level world compatibility with current world-system rules.  
 **Runs:** before world-system write skills and as standalone CLI.  
 **Inspects:** root files, `_source`, CHAR, DA, PA, proposals, audits, pressure-events, world-proposals.  
 **Blocks or warns:** blocks canon/hybrid writes; warns for read-only audit mode.  
 **Mechanical or judgment:** mostly mechanical.

**Sample error:**

INCOMPATIBLE_WORLD_APPROVAL_FIELD:  
worlds/ash/proposals/PR-12-burial-tax.md sets source_basis.direct_user_approval=true.  
That field is reserved for accepted CF records under _source/canon. A proposal may use  
source_basis.proposal_review_approved=true, but it is not canon acceptance. Rename the  
field or route the proposal through canon-addition.

**Human repair:** edit the proposal frontmatter field name and rerun validation.

## **10.2 `artifact_maturity_validator`**

**Checks:** artifact prefix/path/frontmatter maturity consistency.  
 **Runs:** all proposal, audit, CHAR, DA, PA, canon mutation skills.  
 **Inspects:** artifact path, ID prefix, `maturity_level`, consumer field.  
 **Blocks or warns:** blocks writes.  
 **Mechanical or judgment:** mechanical.

**Sample error:**

ARTIFACT_MATURITY_COLLAPSE:  
worlds/ash/character-proposals/NCP-9.md declares maturity_level=realized_character_dossier  
but lives under character-proposals/ and has id NCP-9. NCP files are candidate character  
proposals, not established characters. Set maturity_level=candidate_character_proposal  
or generate a CHAR dossier through character-generation.

**Human repair:** fix maturity field or route through correct skill.

## **10.3 `approval_semantics_validator`**

**Checks:** approval fields are allowed for artifact class.  
 **Runs:** all schema-backed surfaces.  
 **Inspects:** `source_basis`, batch frontmatter, PA/CF fields.  
 **Blocks or warns:** blocks.  
 **Mechanical or judgment:** mechanical.

**Sample error:**

APPROVAL_SEMANTICS_RESERVED_FIELD:  
audits/AU-4/retcon-proposals/RP-2-scope-repair.md uses source_basis.direct_user_approval.  
Retcon cards are recommendations, not accepted canon. Replace with  
source_basis.audit_recommendation_approved. Only accepted CF records may use  
source_basis.direct_user_approval.

**Human repair:** rename field.

## **10.4 `mystery_policy_validator`**

**Checks:** status/safety/intent consistency and forbidden-mystery balance.  
 **Runs:** create-base-world, canon-addition, proposal generation, continuity audit.  
 **Inspects:** M records, NWP mystery seeds, DA/EPE claims touching M.  
 **Blocks or warns:** blocks contradictions; warns on no forbidden mystery with rationale.  
 **Mechanical or judgment:** mixed.

**Sample error:**

INCOMPATIBLE_WORLD_MYSTERY_POLICY:  
M-7 is marked forbidden with future_resolution_safety=none, but DA-12 and CF-22 both  
treat it as a clue-discovery mystery intended for eventual revelation. Choose one:  
reclassify M-7 as active with resolution_intent=clue_discovery and future_resolution_safety  
low|medium|high, or revise downstream claims to stop promising revelation.

**Human repair:** reclassify M or revise downstream artifacts.

## **10.5 `taxonomy_authority_validator`**

**Checks:** canonical fields use canonical vocab; local taxonomies are labeled.  
 **Runs:** schema validation for all surfaces.  
 **Inspects:** `domains_affected`, `domains_touched`, `origin_type`, `proposal_family`, `depth_class`, `sec_file_class`, `cf_type`.  
 **Blocks or warns:** blocks canonical enum misuse; warns unlabeled local taxonomy.  
 **Mechanical or judgment:** mechanical.

**Sample error:**

TAXONOMY_AUTHORITY_MISMATCH:  
PR-18 uses domains_affected=['grave_labor'], but domains_affected must use the canonical  
domain vocabulary. If this is a local diagnostic category, move it to diagnostic_domains  
or map it to canonical domains such as labor, religion, economy, or death-related section  
content.

**Human repair:** map to canonical domain or move to local field.

## **10.6 `write_surface_validator`**

**Checks:** writes occur only on allowed surfaces and through correct mechanism.  
 **Runs:** pre-write and patch-plan validation.  
 **Inspects:** target path, op kind, skill name.  
 **Blocks or warns:** blocks.  
 **Mechanical or judgment:** mechanical.

**Sample error:**

WRITE_SURFACE_VIOLATION:  
diegetic-artifact-generation attempted direct Write to diegetic-artifacts/sermon.md.  
DA files must be written through append_diegetic_artifact_record. Direct Edit is allowed  
only for diegetic-artifacts/INDEX.md after the engine write succeeds.

**Human repair:** rerun through engine-routed path.

## **10.7 `story_leakage_linter`**

**Checks:** downstream story-bundle state terms in world artifacts.  
 **Runs:** all world-system outputs.  
 **Inspects:** frontmatter fields and body headings.  
 **Blocks or warns:** blocks canonical records and realized hybrids; warns proposals unless severe.  
 **Mechanical or judgment:** mixed.

**Sample error:**

WORLD_STORY_LEAKAGE:  
NCP-14 contains field desired_arc_type='midpoint betrayal'. World-system character  
proposals may describe pressure trajectories but not act-position or plot-destiny fields.  
Rename to desired_pressure_trajectory and describe the world-produced pressure instead.

**Human repair:** rename/rewrite field.

## **10.8 `in_world_claim_vs_canon_validator`**

**Checks:** DA claims are not named as canon statuses.  
 **Runs:** DA creation, DA mining, continuity audit.  
 **Inspects:** DA `claim_map`, CF `truth_scope`, CF `status`.  
 **Blocks or warns:** blocks DA schema misuse; blocks contested CF without truth_scope.  
 **Mechanical or judgment:** mixed.

**Sample error:**

DIEGETIC_CLAIM_CANON_LAUNDERING:  
diegetic-artifacts/DA-8.md claim_map[3] uses claim_relation_to_canon='contested_canon'.  
DA claims cannot be canon statuses. Use supported_by_cf, contradicted_by_cf,  
partially_supported_by_cf, unaddressed_in_canon, mystery_adjacent, or prohibited_for_artifact.  
If the claim's circulation should become canon, emit a PR card and route it through  
canon-addition.

**Human repair:** retag DA claim; optionally create PR.

## **10.9 `mcp_contract_validator`**

**Checks:** deployed MCP supports required record types, node types, task types, id classes, vocabularies, and envelope ops.  
 **Runs:** skill pre-flight.  
 **Inspects:** `describe_capabilities`, `get_record_schema`, `get_canonical_vocabulary`, `describe_envelope_schema`.  
 **Blocks or warns:** blocks.  
 **Mechanical or judgment:** mechanical.

**Sample error:**

INCOMPATIBLE_MCP_VOCABULARY:  
diegetic-artifact-generation requested node_type='canon_fact'. The deployed MCP schema  
exposes 'canon_fact_record'. Do not fall back to lexical search. Update the skill  
reference or server contract, then rerun.

**Human repair:** update skill or server contract.

## **10.10 `proposal_surface_schema_validator`**

**Checks:** PR/BATCH/EPE/AU/RP/NWP/NWB frontmatter shape.  
 **Runs:** before direct writes and in compatibility audit.  
 **Inspects:** all non-canon proposal/audit/pressure surfaces.  
 **Blocks or warns:** blocks direct write.  
 **Mechanical or judgment:** mechanical.

**Sample error:**

PROPOSAL_SCHEMA_MISSING_MATURITY:  
world-proposals/NWP-3-iron-rain.md has no maturity_level. NWP cards must declare  
maturity_level=pre_world_proposal so create-base-world and validators cannot confuse  
the card with a realized world.

**Human repair:** add required field.

---

# **11. Priority plan**

## **Must fix before more world-system growth**

1. Add `world-artifact-maturity-ladder.md`.  
2. Rename approval fields and enforce `source_basis.direct_user_approval` as accepted-CF-only.  
3. Replace DA “contested canon” language and strengthen DA claim_map schema.  
4. Relax forbidden mystery absolutism in `create-base-world` and `propose-new-worlds-from-preferences`.  
5. Add schemas/validators for PR, BATCH, EPE, EPE sidecar, AU, RP, NWP, NWB.  
6. Add MCP contract fail-fast validation; delete older-server/manual fallback language where it hides incompatibility.  
7. Add `pressure-events/` to the active repository map and validator/index policy.

## **Should fix before next mature world**

1. Rename or fence story-facing fields:  
   * `story_fuel`  
   * `intended_narrative_role`  
   * `likely_story_scale`  
   * `desired_arc_type`  
   * `creates_new_story_engines`  
2. Add taxonomy-authority labels to all closed lists.  
3. Add `resolution_intent` to M records and proposal mystery seeds.  
4. Add continuity-audit compatibility checks or a separate `world-system-compatibility-audit`.  
5. Add base-world CF-1 split guidance.  
6. Strengthen CHAR/DA `source_basis` schemas.

## **Nice-to-have consolidation**

1. Extract `world-vocabulary-authority.md` if the maturity ladder becomes too large.  
2. Add index consistency validator for all INDEX.md files.  
3. Normalize `domains_touched` vs `domains_affected`.  
4. Add fixtures showing incompatible worlds and expected validator messages.  
5. Add EPE as a fully indexed `pressure_event_record` if pressure events become frequent enough.

## **Deferred research questions**

1. Should PA be split into accepted/rejected/revised adjudication subclasses?  
2. Should base EPE cards become first-class indexed records or remain schema-validated direct-write artifacts?  
3. Should `Natural Story Engines` be globally renamed to `World Affordances`, or kept with a strict definition?  
4. Should `resolution_intent` be a field on M records, or should the mystery status enum expand further?

---

# **12. Open questions / decisions for user**

1. Accept the approval-field rename set exactly as proposed, or choose shorter names before implementation.  
2. Decide whether `Natural Story Engines` should remain as a familiar heading with a strict definition, or be globally renamed to `World Affordances`.  
3. Decide whether EPE should become a fully indexed/schema-backed record type or remain a validated direct-write pressure-affordance surface.  
4. Decide whether Mystery Reserve should add `resolution_intent` as a new field, or encode those distinctions by expanding `status`. My recommendation is a new field; it preserves the existing status/safety coupling while adding discovery semantics.

