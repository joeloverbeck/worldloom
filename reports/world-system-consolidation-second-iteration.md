# **Second World-System Consolidation Audit for Worldloom**

## **1. Executive verdict**

The world system is **sound but under-validated, schema/MCP-drift-prone, and still dangerously ambiguous around approval semantics**.

The core conceptual model is much healthier than the first audit’s fault pattern: `FOUNDATIONS.md` now clearly distinguishes accepted world canon, proposals, realized hybrid artifacts, pressure affordances, audits, adjudications, pre-world proposals, and downstream story records. It also explicitly separates world generativity from story-bundle execution state, and reserves `source_basis.direct_user_approval` for accepted Canon Fact provenance rather than proposal review state.

The biggest current risk is **not that the skills have no doctrine**. The biggest risk is that the doctrine is stronger than the validator/schema layer. Skill prose repeatedly says the right things, but several schemas are loose where the conceptual boundary matters most, and several validators report structure without enforcing the manual-repair-compatible incompatibility posture the user wants.

The most serious risks are:

1. **Approval semantics remain too collapsed under `user_approved`.** The system forbids `source_basis.direct_user_approval` outside accepted CFs, but then actively instructs proposal-side artifacts to use generic `source_basis.user_approved`. That keeps “reviewed,” “kept in a batch,” “write approved,” “recommended,” “selected,” and “canon accepted” too close together.  
2. **Artifact maturity exists as a spine, but adoption is partial.** `FOUNDATIONS.md` and `artifact_maturity` define a real authority/maturity model, but there is no dedicated shared skill reference, no schema-backed constant field across direct-write artifacts, and full-world compatibility posture is mostly warning/reporting rather than strict incompatibility.  
3. **Diegetic claim versus canon is still under-validated.** The diegetic-artifact skill has strong prose guardrails, but the active DA frontmatter schema leaves `claim_map` as an untyped array and treats `world_consistency`, `source_basis`, `author_profile`, and `epistemic_horizon` as loose objects. That is the single clearest remaining canon-laundering seam.  
4. **Mystery discipline validates M records, not cross-surface mystery use.** The Rule 7 validator checks M-record internal fields and status/safety coupling, but it does not mechanically check whether DA, EPE, PR, RP, NWP, NCP, AU, or story-promotion surfaces misuse a forbidden mystery as a clue-discovery mystery or promise revelation.  
5. **Direct-write surfaces are only partially validated.** Many proposal/audit/pressure/world-proposal schemas exist, which is good. But they are largely frontmatter-focused, many semantic blocks allow `additionalProperties`, body-section promises are mostly prose-only, and every `INDEX.md` surface is intentionally skipped by the structural file scanner.  
6. **MCP/schema drift risk remains high because too many local taxonomies look canonical.** Canonical vocabularies exist in code, and MCP exposes vocabulary/schema/capability tools, but many skills still maintain local enums and score axes whose authority is not consistently labeled.

Bottom line: **do not grow the world-system surface further until the validator layer is upgraded from “frontmatter/schema lint plus prose discipline” to “strict authority/maturity/provenance/mystery/direct-surface compatibility diagnostics.”**

---

## **2. Method and sources**

### **Active repo files inspected**

Core docs inspected:

| File | Reason |
| ----- | ----- |
| `docs/FOUNDATIONS.md` | Governing design constitution; artifact authority/maturity, canon layers, story boundary, validation rules. |
| `docs/MACHINE-FACING-LAYER.md` | MCP, patch engine, validators, hooks, schemas, retrieval contract. |
| `docs/CONTEXT-PACKET-CONTRACT.md` | `task_type`, `story_slug`, packet layers, world/story boundary. |
| `docs/HARD-GATE-DISCIPLINE.md` | Approval-token discipline, write gates, patch-engine submission, direct-write exceptions. |
| `docs/REPOSITORY-MAP.md` | Current repo surface, artifact locations, story-bundle layout, skill categories. |
| `docs/ID-ALLOCATION.md` | Current ID classes and path conventions. |

The mission brief was the uploaded pasted text and governed this pass.

### **Active skills inspected**

Scoped world-system skills inspected:

| Skill | Status |
| ----- | ----- |
| `.claude/skills/canon-addition` | Active canon-mutating skill. |
| `.claude/skills/canon-facts-from-diegetic-artifacts` | Active proposal-producing skill. |
| `.claude/skills/character-generation` | Active realized-hybrid producer. |
| `.claude/skills/continuity-audit` | Active audit / retcon-proposal producer. |
| `.claude/skills/create-base-world` | Active canon-mutating genesis skill. |
| `.claude/skills/deepen-character-proposal` | Active single-NCP upgrade skill. |
| `.claude/skills/diegetic-artifact-generation` | Active realized-hybrid DA producer. |
| `.claude/skills/emergent-pressure-events` | Active pressure-affordance / sidecar proposal producer. |
| `.claude/skills/propose-new-canon-facts` | Active PR / BATCH producer. |
| `.claude/skills/propose-new-characters` | Active NCP / NCB producer. |
| `.claude/skills/propose-new-worlds-from-preferences` | Active root-level NWP / NWB producer. |

Related active skill-surface inspected:

| File | Reason |
| ----- | ----- |
| `.claude/skills/skill-audit/references/cross-skill-consistency.md` | Current skill taxonomy and sibling-scan discipline. |
| `.claude/skills/mcp-integration-audit/SKILL.md` | Discovered as active meta/audit surface; not deeply audited because this mission is world-system content surface. |
| Story-pipeline skill names and contracts | Inspected only as needed for upstream/downstream boundary. |

### **References/templates/examples inspected**

I inspected active skill references/templates/examples through targeted file discovery and representative contract-bearing reads. The highest-confidence drift evidence came from current `SKILL.md` files, active schemas, active validators, MCP contract docs, and active canonical vocabulary source.

I did **not** fully line-read every example body under every scoped skill. That is an explicit residual risk. The implementation follow-up should include a dedicated stale-template/example sweep driven by the drift table in sections 6, 10, and 11.

### **Active schemas / validators / MCP / patch-engine files inspected**

Validator/source files inspected:

| File | Reason |
| ----- | ----- |
| `tools/validators/src/public/registry.ts` | Active validator registry. |
| `tools/validators/src/structural/approval-semantics.ts` | Approval field enforcement. |
| `tools/validators/src/structural/artifact-maturity.ts` | Maturity/authority enforcement. |
| `tools/validators/src/structural/record-schema-compliance.ts` | Schema validation coverage. |
| `tools/validators/src/structural/utils.ts` | Indexed file coverage and skipped surfaces. |
| `tools/validators/src/structural/proposal-package-shape.ts` | Story-promotion candidate purity / provenance separation. |
| `tools/validators/src/structural/compatibility-drift.ts` | Current compatibility validator scope. |
| `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` | Mystery Reserve mechanical enforcement. |
| `tools/world-index/src/public/canonical-vocabularies.ts` | Canonical enum authority. |
| `tools/world-mcp/src/tool-names.ts` | Active MCP tool names. |

Schemas inspected:

| Schema | Notes |
| ----- | ----- |
| `proposal-card.schema.json` | PR frontmatter; contains `mystery_reserve` / `invariant_revision` in `proposed_status`. |
| `proposal-batch.schema.json` | BATCH frontmatter; generic `user_approved`. |
| `pressure-event-card.schema.json` | EPE frontmatter; `proposal_card_extract` loose. |
| `pressure-event-batch.schema.json` | EPE batch manifest. |
| `pressure-event-sidecar-proposal.schema.json` | Sidecar PR shape. |
| `audit-report.schema.json` | AU report frontmatter. |
| `retcon-proposal-card.schema.json` | RP candidate shape. |
| `world-proposal-card.schema.json` | NWP card shape; loose mystery/canon-safety blocks. |
| `world-proposal-batch.schema.json` | NWB manifest shape. |
| `character-proposal-card.schema.json` | NCP shape. |
| `character-proposal-batch.schema.json` | NCB shape. |
| `character-frontmatter.schema.json` | CHAR realized-hybrid frontmatter. |
| `diegetic-artifact-frontmatter.schema.json` | DA realized-hybrid frontmatter; major loose claim-map gap. |

### **Story-system files inspected, and why**

I did not audit the full story system. I inspected story-system docs/contracts only where needed to evaluate boundary leakage:

* `docs/CONTEXT-PACKET-CONTRACT.md`, because it distinguishes world-canon task types from story-pipeline task types and states that `story_bundle_context` is null for world-canon tasks.  
* `docs/REPOSITORY-MAP.md`, because it maps story bundles under `worlds/<slug>/stories/<story-slug>/` and differentiates story `_source` records from world `_source` records.  
* `proposal-package-shape.ts`, because story-fact promotion is the key downstream-to-upstream provenance seam and already models candidate CF purity separately from story-local evidence.

I did not inspect individual story skills end-to-end because the current mission is a world-system audit. The world-story boundary was sufficiently testable through shared docs, MCP task semantics, repository layout, and the story-promotion proposal package validator.

### **Archived files read**

No archived file body was read. Searches returned archive hits, but I did not open them. That complies with the mission’s instruction to avoid broad `archive/*` work unless a current active file explicitly names a specific archived file as relevant.

### **Online research sources used**

Research sources used as architectural lenses:

* W3C PROV overview for provenance/authority modeling.  
* JSON Schema official object reference for strict object/property validation.  
* Pact documentation for contract testing and consumer/provider drift.  
* Riedl & Young narrative planning paper for explicit world state, causal progression, and character intentionality.  
* Public narratology/literary-theory references on chronotope and novum as conceptual lenses for world premise, time/space coupling, and consequence propagation.  
* Recent LLM fiction/world-state research as a caution about model self-consistency and explicit state.

### **Areas not inspected**

Not fully inspected:

1. Every example body under every active skill.  
2. Every local reference file under every active skill.  
3. Full story-system implementation.  
4. Full patch-engine op implementation beyond docs and schema/interface references.  
5. Active tests in detail.

Reason: the audit surfaced enough current doc/schema/validator drift to produce concrete requirements, and the mission deliverable is a proposal pass, not implementation or certification. This report should drive a follow-up implementation/audit pass that reads every example/template body before editing.

---

## **3. Research synthesis**

Worldloom is closer to a **world-state operating system** than a generic writing assistant. The research lens supports that direction: explicit state, provenance, causality, and contract validation matter more than prose richness alone.

W3C PROV defines provenance as information about entities, activities, and people involved in producing data or things, used to assess quality, reliability, or trustworthiness; it also emphasizes identification, attribution, processing steps, versioning, procedures, and derivation. That maps directly onto Worldloom’s need to distinguish accepted CFs, proposal cards, DA claims, audit findings, story evidence, approval tokens, patch plans, and downstream promotion packages. Worldloom should therefore treat `source_basis`, `proposal_evidence`, `approval_token`, `PA`, `CH`, and artifact maturity as provenance machinery, not as decorative metadata.

JSON Schema’s object reference is directly relevant because it notes that unspecified additional properties are allowed by default and that `additionalProperties: false` or `unevaluatedProperties: false` are needed to close objects. Worldloom currently uses strict schemas in some places but leaves the highest-risk DA claim surfaces loose. A schema that says `claim_map: array` without item structure is barely better than prose-only discipline.

Pact’s contract-testing documentation frames integration safety as a shared understanding between consumer and provider, enforced by executable examples rather than only static specifications. Worldloom’s skills are consumers of MCP/schema/validator contracts; the MCP server, schemas, and validators are providers. Skill prose that names `record_type`, `node_type`, `task_type`, `id_class`, `cf_type`, or envelope fields should be tested as a consumer/provider contract, not trusted by inspection.

Narrative planning research emphasizes causally sound event progression and believable character intentionality, often modeled as transformations from an initial world state to goal states. For Worldloom, this supports the split between upstream world state and downstream story execution: world artifacts should encode causal affordances, constraints, pressures, and institutions, while story bundles should own page/choice/storylet execution state.

Recent LLM-fiction research reports that many models struggle to maintain a consistent fictional worldview/state and argues for testing/creating story worlds that models can inhabit. This reinforces Worldloom’s fail-fast validation posture: relying on LLM prose self-consistency is not enough; explicit schemas, retrieval contracts, provenance, and validators must catch drift.

The chronotope lens is useful but should not become jargon in the implementation. It says time and space are not separable background dimensions; they shape genre and action. Worldloom’s SEC classes, CF consequences, base-world genesis, pressure events, and ordinary-life tests should therefore force geography, timeline, institutions, resources, and daily life to cohere rather than letting “setting” become static backdrop.

The novum lens supports Worldloom’s primary-difference / CF-1 logic: a world-generating departure should be specific and consequence-bearing, not a decorative magic/tech premise. But it also argues against overloading one CF with every consequence. The novum should seed propagation; the record model should allow genesis facts to split when the primary difference creates separable material, institutional, epistemic, and historical commitments.

Repo-facing implication: **Worldloom’s next consolidation should not add more creative knobs. It should harden provenance, schema closure, contract tests, maturity authority, and cross-surface compatibility diagnostics.**

---

## **4. Current world-system map**

### **4.1 Skill-by-skill matrix**

| Skill | Current role | Main outputs | Write surface | Authority / maturity | Downstream consumers | Schema coverage | Validator coverage | Primary risk |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `create-base-world` | Creates new world from premise. | `WORLD_KERNEL.md`, `ONTOLOGY.md`, genesis CF/CH/INV/M/OQ/ENT/SEC records. | Root markdown direct, `_source` via patch engine. | Accepted world-canon genesis. | All world skills. | Engine/record schemas. | Patch-plan validators, record schema, rules. | CF-1 overburden; genesis adequacy; story-generativity terms must stay upstream. |
| `canon-addition` | Adjudicates one proposal into accepted canon or non-accept PA. | CF, CH, SEC/M/OQ extensions, PA. | Patch engine only for canon/hybrid append. | Accepted canon if accepted; PA adjudication otherwise. | All world/story downstream. | CF/CH/SEC/PA schemas. | Patch-plan validators. | Approval/provenance purity; proposal route normalization; stale PR fields. |
| `propose-new-canon-facts` | Generates candidate canon facts. | PR cards, BATCH manifest, proposals INDEX. | Direct write under `proposals/`. | Candidate canon proposal. | `canon-addition`. | PR/BATCH schemas. | Schema + maturity, but semantics loose. | `user_approved`; proposed status includes non-CF destinations; body not validated. |
| `canon-facts-from-diegetic-artifacts` | Mines DA claims into candidate PRs. | PR cards, BATCH manifest, proposals INDEX. | Direct write under `proposals/`. | Candidate canon proposal derived from DA. | `canon-addition`. | PR/BATCH schemas. | Schema + maturity. | Depends on DA claim-map quality that schema does not enforce. |
| `character-generation` | Realizes CHAR dossier from brief/NCP. | CHAR hybrid file, characters INDEX. | CHAR via patch engine append; INDEX direct. | Realized canon-reading hybrid, not canon. | Story skills, DA, proposal mining context. | CHAR schema. | Schema + maturity. | Story-facing fields acceptable but need fencing; INDEX unvalidated. |
| `diegetic-artifact-generation` | Realizes in-world document/artifact. | DA hybrid file, DA INDEX. | DA via patch engine append; INDEX direct. | Realized canon-reading hybrid; DA existence is artifact record, DA claims are not canon. | DA mining, continuity audit, story skills. | DA schema exists but weak. | Schema + maturity, weak claim semantics. | Canon laundering via loose `claim_map`; INDEX unvalidated. |
| `emergent-pressure-events` | Generates current pressure-affordance events. | EPE card, EPE sidecar PR, EPE BATCH, pressure INDEX. | Direct write under `pressure-events/`. | EPE pressure affordance; sidecar candidate canon proposal. | `canon-addition`, story bootstrap/page-cycle as passive consumer. | EPE/card/batch/sidecar schemas. | Schema + maturity, but EPE base not retrieval-indexed. | `story_fuel` needs fencing; sidecar extract loose; EPE batch maturity gap. |
| `continuity-audit` | Audits continuity and emits retcon proposals. | AU report, RP cards, audits INDEX. | Direct write under `audits/`. | Audit artifact; RP candidate canon proposal. | `canon-addition`; human repair. | AU/RP schemas. | Schema + maturity; optional compatibility appendix. | Compatibility is report-only; audit findings/body mostly unstructured. |
| `propose-new-characters` | Generates NCP character proposal batch. | NCP cards, NCB manifest, character-proposals INDEX. | Direct write under `character-proposals/`. | Candidate character proposal. | `character-generation`, possible canon follow-up. | NCP/NCB schemas. | Schema + maturity. | Story-facing vocabulary and generic approval; canon assumption flags need stronger schema. |
| `deepen-character-proposal` | Upgrades one seed/NCP into stronger NCP. | One NCP card, character-proposals INDEX. | Direct write under `character-proposals/`. | Candidate character proposal. | `character-generation`, canon follow-up. | Upgraded NCP template/schema via NCP family. | Schema + maturity if indexed. | No NCB manifest; approval/index consistency; must keep no plot destiny. |
| `propose-new-worlds-from-preferences` | Generates pre-world proposal batch from user preferences and existing worlds. | NWP, NWB, root INDEX, LINEAGE, first-run `.gitignore`/`.gitkeep`. | Direct write under root `world-proposals/` plus gated `.gitignore`. | Pre-world proposal, not a world. | `create-base-world`. | NWP/NWB schemas. | Schema + maturity. | `intended_canon_layer` and bootstrap wording blur pre-world status; root INDEX/LINEAGE validation unclear. |

### **4.2 Artifact-maturity matrix**

| Artifact | Producer | Path | Authority level | Maturity level | Canon? | Proposal? | Realized hybrid? | Downstream consumable? | Evidence for canon-addition? | Write mechanism | Approval semantics | Validator coverage | Schema coverage | MCP / index coverage | Likely confusion |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `NWP` | `propose-new-worlds-from-preferences` | `world-proposals/NWP-*.md` | Pre-world idea | Pre-world proposal | No | Yes | No | `create-base-world` premise | No direct canon evidence | Direct | Review/kept in batch | Schema + maturity | Yes | Root-level; not world index | `intended_canon_layer` sounds canonized. |
| `NWB` | Same | `world-proposals/batches/NWB-*.md` | Batch metadata | Pre-world batch | No | Batch of proposals | No | Future NWP runs / human | No | Direct | Batch review | Schema + maturity | Yes | Root-level; index/lineage weak | `bootstrap_writes_*` may sound like world creation. |
| `PR` | `propose-new-canon-facts`, DA mining, EPE sidecar | `proposals/PR-*.md` or EPE sidecar file | Candidate only | Candidate canon proposal | No | Yes | No | `canon-addition` | Yes, as proposal input | Direct | Review/kept, not canon | Schema + maturity | Yes | Indexed as proposal if supported | `proposed_status` contains non-CF routes. |
| `BATCH` | `propose-new-canon-facts`, DA mining | `proposals/batches/BATCH-*.md` | Batch metadata | Candidate proposal batch | No | Batch | No | Human / audit | No direct | Direct | Batch review | Schema + maturity | Yes | Indexed if supported | Generic `user_approved`. |
| `RP` | `continuity-audit` | `audits/AU-*/retcon-proposals/RP-*.md` | Candidate repair | Candidate canon proposal | No | Yes | No | `canon-addition` | Yes, as retcon proposal | Direct | Recommendation kept | Schema + maturity | Yes | Indexed as retcon proposal if supported | Audit recommendation can be mistaken for applied repair. |
| `EPE` | `emergent-pressure-events` | `pressure-events/EPE-*.md` | Pressure affordance | Pressure affordance | No | Candidate event/affordance | No | Story skills / sidecar creation | Only via sidecar | Direct | Kept in pressure batch | Schema + maturity | Yes | Repo map says EPE base cards are allocator-tracked but not retrieval-indexed | `canonize` route can be mistaken for canon. |
| `EPE*.proposal.md` | `emergent-pressure-events` | `pressure-events/EPE-*.proposal.md` | Candidate canon proposal | Candidate canon proposal | No | Yes | No | `canon-addition` | Yes | Direct | Proposal review | Schema + maturity | Yes | Sidecar indexed if schema/node exists | File name is EPE, ID is PR. |
| `NCP` | `propose-new-characters`, `deepen-character-proposal` | `character-proposals/NCP-*.md` | Candidate character | Candidate character proposal | No | Yes | No | `character-generation` | Maybe indirectly if canon-requiring | Direct | Review/kept | Schema + maturity | Yes | Indexed if supported | `intended_narrative_role` can sound story-state-ish. |
| `NCB` | `propose-new-characters` | `character-proposals/batches/NCB-*.md` | Batch metadata | Candidate character batch | No | Batch | No | Human / future proposal runs | No | Direct | Batch review | Schema + maturity | Yes | Indexed if supported | `story_scale_mix` needs fencing. |
| `CHAR` | `character-generation` | `characters/CHAR-*.md` or slugged file with `character_id` | Realized world-scope hybrid | Realized canon-reading hybrid | No, except dossier existence as authored artifact | No | Yes | Story skills, DA, audits | Can be cited as context, not accepted fact | Patch engine append + direct INDEX | Artifact write approval | Schema + maturity | Yes | Indexed hybrid record | Dossier prose may be mistaken for CF. |
| `DA` | `diegetic-artifact-generation` | `diegetic-artifacts/DA-*.md` | Realized in-world artifact | Realized canon-reading hybrid | DA existence yes as artifact record; claims no | No | Yes | DA mining, continuity audit, story skills | Yes as claim source, not truth | Patch engine append + direct INDEX | Artifact write approval | Schema + maturity weak | Yes, weak | Indexed hybrid record | In-world claims can launder into canon. |
| `PA` | `canon-addition` | `adjudications/PA-*.md` | Decision provenance | Adjudication/provenance | Not a CF; records adjudication | No | Hybrid provenance | Audit/history | Supports provenance | Patch engine append | Canon-addition adjudication | Schema + maturity | Yes | Indexed hybrid record | Non-accept PA can be mistaken for canon rejection law. |
| `AU` | `continuity-audit` | `audits/AU-*.md` | Diagnostic | Audit artifact | No | Audit recommendation source | No | Human / RP / compatibility appendix | Indirect via RP | Direct | Report reviewed | Schema + maturity | Yes | Indexed if supported | Audit findings can be mistaken for applied retcon. |
| `CF` | `canon-addition`, `create-base-world` | `_source/canon/CF-*.yaml` | World canon | Accepted world canon | Yes | No | No | All systems | Yes | Patch engine only | `source_basis.direct_user_approval` for accepted CF | Schema + rules | Yes | MCP/index primary | `contested_canon` means accepted contested truth, not rumor. |
| `CH` | Same | `_source/change-log/CH-*.yaml` | Change provenance | Accepted change log | Yes, as change record | No | No | Audits/retrieval | Yes | Patch engine only | Patch-plan approval | Schema | Yes | MCP/index primary | Can be skipped if proposal writes bypass canon. |
| `INV` | Same | `_source/invariants/*.yaml` | Governing constraint | Accepted world canon constraint | Yes | No | No | All skills | Yes | Patch engine only | Patch-plan approval | Schema + rule checks | Yes | MCP/index primary | Some skills test all INV by prose, not validator. |
| `M` | Same | `_source/mystery-reserve/M-*.yaml` | Protected unknown | Accepted Mystery Reserve record | Yes, but not CF status | No | No | All generation/audit/story skills | Yes as firewall | Patch engine only | Patch-plan approval | Rule 7 | Yes | MCP/index primary | Forbidden vs discovery not cross-surface validated. |
| `OQ` | Same | `_source/open-questions/OQ-*.yaml` | Deferred design question | Accepted open question | Yes as unresolved design surface | No | No | Proposal/canon/audit | Yes | Patch engine only | Patch-plan approval | Schema | Yes | MCP/index primary | Can be mistaken for mystery. |
| `ENT` | Same | `_source/entities/ENT-*.yaml` | Named entity registry | Accepted world canon entity | Yes | No | No | Retrieval/all skills | Yes | Patch engine only | Patch-plan approval | Schema | Yes | MCP/index primary | ONTOLOGY no longer stores registry. |
| `SEC` | Same | `_source/<sec-dir>/SEC-*.yaml` | Canonical prose section record | Accepted world canon prose | Yes | No | No | All world/story consumers | Yes | Patch engine only | Patch-plan approval | Schema + touched-by-CF validator | Yes | MCP/index primary | Root compiled prose views retired. |
| `INDEX.md` surfaces | Many direct-write skills | Per artifact directory | Navigational only | Generated/index surface | No | No | No | Human/tool navigation | No | Direct | Should follow artifact review | Mostly skipped | No meaningful schema | Often not indexed/validated | Orphan/missing rows can mislead humans. |
| `LINEAGE.md` | `propose-new-worlds-from-preferences` | `world-proposals/LINEAGE.md` | Cross-batch proposal lineage | Root-level proposal history | No | Metadata | No | Future NWP runs | No | Direct | Batch review | Unclear/weak | Not clear | Root-level | Proposed-but-not-realized niches may look authoritative. |

---

## **5. Landed-surface / regression check**

The first audit’s major concepts appear integrated in the current surface:

* `FOUNDATIONS.md` now includes an explicit artifact authority/maturity model and says only accepted world-canon records have world-canon authority.  
* The validator registry now includes `approval_semantics`, `artifact_maturity`, `record_schema_compliance`, `proposal_package_shape`, and `compatibility_drift`.  
* World-canon task types and story-pipeline task types are separated in the context-packet contract, and `story_bundle_context` is null for world-canon task types.  
* `HARD-GATE-DISCIPLINE.md` now makes approval-token / patch-plan binding explicit and says invocation is not approval.  
* The canonical vocabulary source centralizes domains, verdicts, mystery statuses, SEC file classes, entity kinds, change types, and CF types.

Residual regressions or partially-applied concepts:

| Prior fault class | Current state | Residual problem |
| ----- | ----- | ----- |
| Artifact maturity | Concept exists in FOUNDATIONS and validator. | No dedicated shared skill reference; no schema-backed constants; full-world enforcement is weak; EPE batch classification appears incomplete. |
| Approval semantics | `direct_user_approval` is reserved for accepted CF. | Generic `user_approved` remains everywhere else and is too ambiguous. |
| Diegetic claims vs canon | DA skill and DA mining prose are strong. | DA schema does not enforce claim-map structure; validators do not mechanically prevent claim laundering. |
| Forbidden mystery rigidity | Prose now allows active/passive/forbidden and NWP can omit forbidden with rationale. | Validators only check M record coupling, not whether downstream artifacts misuse forbidden/discovery semantics. |
| Proposal surface validation | Many direct surfaces now have JSON schemas. | Schemas are too loose in semantic blocks; body sections and INDEX surfaces are not robustly validated. |
| Story-facing terminology | FOUNDATIONS allows world-generativity terms and bans story-bundle state. | Some skill/schema terms remain ambiguous and need fencing, not deletion. |
| Taxonomy authority | Canonical vocabulary source exists. | Local taxonomies proliferate without a single authority inventory. |
| MCP vocabulary drift | Active MCP tool list is clear. | Skills still contain fallback/older-server language and local assumptions; no contract-test harness proves skill prose vs MCP capabilities. |
| Continuity-audit compatibility | Optional compatibility appendix exists. | Current compatibility validator is story-bundle-specific and report-only, not strict world-system incompatibility. |

---

## **6. Validator / MCP / schema drift audit**

### **6.1 Dedicated drift table**

| Boundary | Docs/skills claim | Schemas allow | Validators enforce | MCP/source exposes | Mismatch | Tests cover it? | Proposed correction |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| Accepted CF approval | `direct_user_approval` belongs to accepted CF provenance only. | CF schema supports `source_basis.direct_user_approval`; proposal schemas often forbid it. | `approval_semantics` rejects `direct_user_approval` outside CF. | Patch engine + PA/CH provenance. | Good on `direct_user_approval`; bad fallback to generic `user_approved`. | Partial. | Replace generic proposal-side `user_approved` with semantically named review/write/recommendation fields. |
| Proposal review approval | Skills say `user_approved` means kept in batch, not canon. | PR/BATCH/EPE/NCP/NWP/AU schemas require or allow `user_approved`. | Validator recommends `source_basis.user_approved`. | No MCP special meaning. | Dangerous naming persists. | Likely partial. | New approval schema vocabulary + validator. |
| Artifact maturity | FOUNDATIONS defines classes. | Most schemas do not require explicit maturity or authority class. | `artifact_maturity` infers by path/node type and warns/fails by mode. | Index node types expose some classes. | Maturity is implicit and not shared in skill references. | Partial. | Add shared maturity reference; add constant schema fields or strict path-derived validator. |
| DA claim/canon separation | DA skill says in-world claims are not canon and each claim needs truth status/provenance. | DA schema has `claim_map: array` only and loose objects. | No DA-specific claim-map validator found. | DA record indexed as hybrid. | Major laundering gap. | No meaningful mechanical coverage. | Typed DA claim-map schema + cross-surface claim validator. |
| Mystery status/safety | M records must couple status and future resolution safety. | M schema/source vocabulary supports `active`, `passive`, `passive_depth`, `forbidden`; safety enum. | Rule 7 enforces M internal fields and status/safety. | MCP vocabulary exposes mystery status/safety. | Cross-surface uses not checked. | M-record tests likely yes; consumer tests mostly prose. | Add mystery cross-surface compatibility validator. |
| PR `proposed_status` | Candidate CF should become hard/soft/contested CF or route to non-CF action. | PR schema includes `mystery_reserve`, `invariant_revision`. | Schema accepts this. | CF status vocabulary does not include MR. | CF status and proposal route conflated. | Schema tests likely preserve bug. | Split `proposed_cf_status` from `proposal_route`. |
| EPE sidecar extract | EPE canonize sidecar must be parse-ready PR. | `proposal_card_extract` is loose in EPE schema. | Some schema compliance, but nested extract not strict enough. | Sidecar file schema exists. | Parent EPE can carry malformed extract until sidecar generation. | Unknown. | Use `$ref` to PR schema for extract or validate extract as PR candidate. |
| Direct INDEX surfaces | Skills update INDEX last; recovery manual. | No schema. | File scanner skips `INDEX.md`. | Repo map says indexes exist. | Human-facing navigation can drift. | No. | Add `index_surface_consistency` validator. |
| Compatibility audit | Continuity audit can append read-only compatibility report. | AU schema can carry appendix but not detailed typed findings. | `compatibility_drift` is story optional-record focused. | CLI `world-validate --compatibility`. | No world-system strict compatibility suite. | No. | Add `world_system_compatibility_strict` validator suite. |
| Story leakage | FOUNDATIONS bans story-bundle state in world artifacts. | Schemas allow many free-text fields. | No broad banned-field/term validator found. | Context packet separates story bundle context. | Prose relies on discipline. | Unknown. | Add `world_story_leakage` validator over field names and structured frontmatter. |
| Taxonomy authority | Canonical vocabulary via code/MCP. | Local schemas include many enums and loose strings. | Some schema enum checks. | `get_canonical_vocabulary`, `describe_capabilities`. | No taxonomy inventory authority file. | No. | Add taxonomy authority reference + MCP/schema contract tests. |
| Schema error detail | Mission wants path, violation, authority, why, fix. | Ajv gives instance path/message. | `record_schema_compliance` returns exact but terse schema messages. | CLI returns verdicts. | Not enough conceptual/manual-repair guidance. | Some. | Add error-message contract and mapped conceptual error codes. |

### **6.2 Key validator observations**

`record_schema_compliance` is valuable and broad: it validates indexed records and many direct hybrid/proposal surfaces, including CHAR, DA, PR/BATCH, pressure events, sidecars, audit reports, retcon proposals, world proposals, character proposals, and adjudications.

But the file scanner explicitly skips `INDEX.md`, which means every direct-write INDEX surface can drift without schema enforcement.

`artifact_maturity` is the closest thing to a mechanical maturity spine, but it is path/node-type inferred and full-world severity is warning-level. That is not enough for the desired “private mature world fails with detailed reasons” posture.

`compatibility_drift` is not a world-system compatibility validator. It classifies story-bundle optional active-record directories and page snapshot shape. Useful, but orthogonal to maturity/approval/DA/mystery/world-proposal compatibility.

`proposal_package_shape` is a strong model to imitate: it rejects promotion-only fields inside CF-shaped candidates and keeps story evidence outside the candidate. That same pattern should be applied to DA-mined PRs, EPE sidecars, RP cards, and NWP-to-CBW handoff.

---

## **7. Consolidation fault matrix**

### **Fault 1 — Generic `user_approved` still collapses distinct approvals**

**Severity:** blocker

**Affected skills/files:** `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`, `emergent-pressure-events`, `continuity-audit`, `propose-new-characters`, `deepen-character-proposal`, `propose-new-worlds-from-preferences`, CHAR/DA source basis, proposal/batch schemas, `approval-semantics.ts`.

**Evidence from repo:** The approval validator rejects `source_basis.direct_user_approval` outside CFs but recommends proposal-side `source_basis.user_approved`. Multiple schemas require or allow `user_approved`, and skills repeatedly define it as “kept in batch after review,” not canon acceptance.

**Conceptual problem:** The system has many approvals: proposal review, batch review, world proposal review, character realization write approval, DA write approval, EPE inclusion approval, audit report review, audit recommendation approval, HARD-GATE approval-token issuance, patch-engine submission approval, and accepted canon approval. One boolean name cannot safely carry all of them.

**FOUNDATIONS alignment problem:** `FOUNDATIONS.md` explicitly says proposal review approval, artifact-write approval, audit recommendation approval, pressure-event approval, and story acceptance are not canon acceptance.

**Research support:** Provenance systems need enough role separation to assess reliability and trustworthiness; collapsing roles weakens provenance.

**Recommended resolution:** Replace `user_approved` with semantic status fields. Do not keep it as a canonical schema field for new artifacts.

**Exact replacement text, confident:**

Insert into `docs/FOUNDATIONS.md` after the current approval-semantics paragraph:

### Approval vocabulary discipline

Worldloom uses distinct approval fields for distinct authority transitions.

- `source_basis.direct_user_approval` is reserved for accepted `CF` records only. It means the user directly approved the canon fact that now exists in world canon.  
- Proposal review, batch review, audit review, pressure-event inclusion, character-dossier write approval, diegetic-artifact write approval, and world-proposal selection MUST NOT use `direct_user_approval`.  
- Direct-write artifacts MUST name the approval transition they actually record:  
 - proposal cards: `proposal_review_status`  
 - proposal batches: `batch_review_status`  
 - pressure-event cards: `pressure_event_review_status`  
 - audit reports: `audit_report_review_status`  
 - retcon proposal cards: `recommendation_review_status`  
 - character dossiers and diegetic artifacts: `artifact_write_approval`  
 - world proposal cards: `world_proposal_review_status`  
- A review status never means canon acceptance unless a later `canon-addition` run emits an accepted `CF` and `CH`.

**Validation requirement:** `approval_semantics` must reject generic `user_approved` on new schema versions and emit detailed repair guidance.

**Deletion/merge/rename:** Rename, do not delete the underlying concept.

---

### **Fault 2 — Maturity spine exists, but is not shared enough or strict enough**

**Severity:** major

**Affected files:** `FOUNDATIONS.md`, `artifact-maturity.ts`, all world skill guardrails, direct-write schemas.

**Evidence:** `artifact_maturity` infers classes including pre-world proposal, candidate canon proposal, candidate character proposal, realized hybrid, accepted world canon, adjudication, audit, pressure affordance, and downstream story record.

**Conceptual problem:** The maturity model is present, but most skills do not cite a shared reference, schemas do not consistently encode constant maturity class, and compatibility mode is too soft for old private worlds.

**FOUNDATIONS alignment problem:** FOUNDATIONS governs the maturity model, but skills/templates/schemas can drift because the model lives in a long constitutional doc and a validator, not in a concise shared operational reference.

**Recommended resolution:** Add `.claude/skills/_shared-references/world-artifact-authority-and-maturity.md` and require every world-system skill to cite it.

**Exact new shared reference outline, confident:**

# World Artifact Authority and Maturity

This reference is subordinate to `docs/FOUNDATIONS.md`.

## Rule

Only accepted world-canon records under `worlds/<slug>/_source/` have world-canon authority.

All other artifacts are one of:  
- pre-world proposal  
- candidate canon proposal  
- candidate character proposal  
- pressure affordance  
- realized canon-reading hybrid  
- audit artifact  
- adjudication/provenance artifact  
- generated/index surface  
- downstream story-bundle record

## Forbidden collapses

- A PR/RP/EPE sidecar is not a CF.  
- An NCP is not a CHAR.  
- An NWP is not a world.  
- An AU recommendation is not an applied repair.  
- A DA claim is not canon.  
- A CHAR dossier is not a CF.  
- An EPE card is not canon.  
- Story-bundle state is not upstream world canon.

## Approval reminder

Review approval records that an artifact was kept, written, or recommended. It does not make the artifact canon.

**Validation requirement:** Add a strict compatibility mode where every artifact’s derived maturity class must match any declared `maturity_class` or authority statement; stale worlds fail with actionable messages.

**Deletion/merge/rename:** Merge local maturity prose into shared reference; keep FOUNDATIONS as governing authority.

---

### **Fault 3 — DA claim-map is the most important remaining canon-laundering seam**

**Severity:** blocker

**Affected files:** `diegetic-artifact-generation`, `canon-facts-from-diegetic-artifacts`, DA schema, DA validators.

**Evidence:** The DA skill requires truth discipline and claim provenance, but `diegetic-artifact-frontmatter.schema.json` leaves `claim_map` as an untyped array and several critical fields as loose objects.

**Conceptual problem:** DA claims are where unreliable in-world knowledge, propaganda, rumor, and possible canon proposals meet. Loose schema here invites exactly the laundering the system is designed to prevent.

**FOUNDATIONS alignment problem:** FOUNDATIONS distinguishes accepted canon from diegetic material; current DA schema does not make that distinction mechanically enforceable.

**Recommended resolution:** Make `claim_map.items` strict and add a DA claim/canon validator.

**Exact schema shape, confident as replacement direction:**

claim_map:  
 type: array  
 minItems: 1  
 items:  
   type: object  
   additionalProperties: false  
   required:  
     - claim_id  
     - claim_text  
     - claim_kind  
     - narrator_belief  
     - truth_relation_to_canon  
     - source_of_claim  
     - cited_cf_ids  
     - related_mystery_ids  
     - canonization_allowed  
   properties:  
     claim_id:  
       type: string  
       pattern: "^DAC-[0-9]+$"  
     claim_text:  
       type: string  
       minLength: 1  
     claim_kind:  
       enum:  
         - direct_observation  
         - author_belief  
         - rumor  
         - propaganda  
         - myth  
         - lie  
         - local_truth_claim  
         - contested_claim  
         - candidate_canon_seed  
         - quoted_external_claim  
     narrator_belief:  
       enum:  
         - believes  
         - doubts  
         - performs_belief  
         - conceals_doubt  
         - unknown  
         - not_applicable  
     truth_relation_to_canon:  
       enum:  
         - corroborates_cited_canon  
         - contradicts_cited_canon  
         - extends_soft_canon  
         - unaddressed_by_canon  
         - impossible_for_narrator_to_verify  
         - forbidden_to_assert  
     source_of_claim:  
       enum:  
         - witnessed  
         - learned_from_authority  
         - inherited_tradition  
         - common_rumor  
         - institutional_record  
         - coerced_testimony  
         - hallucination_or_vision  
         - unknown  
     cited_cf_ids:  
       type: array  
       items:  
         type: string  
         pattern: "^CF-[0-9]+$"  
     related_mystery_ids:  
       type: array  
       items:  
         type: string  
         pattern: "^M-[0-9]+$"  
     canonization_allowed:  
       type: boolean  
     canonization_notes:  
       type: string

**Validation requirement:** Reject any DA claim with `truth_relation_to_canon: corroborates_cited_canon` and empty `cited_cf_ids`; reject any `canonization_allowed: true` claim with `claim_kind` of `propaganda`, `lie`, or `myth` unless a `canonization_notes` rationale says it is being proposed as “canon fact about the belief’s existence,” not truth of the claim.

**Deletion/merge/rename:** No deletion; tighten.

---

### **Fault 4 — `proposed_status` conflates CF status with proposal route**

**Severity:** major

**Affected files:** `proposal-card.schema.json`, `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`, EPE sidecars, `canon-addition`.

**Evidence:** PR schema allows `proposed_status: mystery_reserve` and `invariant_revision`; FOUNDATIONS treats Mystery Reserve as first-class `M` records, not a CF status.

**Conceptual problem:** A candidate can propose a CF, a Mystery Reserve seed, or an invariant revision, but those are different target record classes. Encoding all as `proposed_status` blurs record type and canon layer.

**Recommended resolution:** Split:

proposal_route:  
 enum:  
   - canon_fact_candidate  
   - mystery_reserve_candidate  
   - invariant_revision_candidate  
   - retcon_candidate

proposed_cf_status:  
 enum:  
   - hard_canon  
   - soft_canon  
   - contested_canon

`proposed_cf_status` is required only when `proposal_route: canon_fact_candidate` or a retcon emits a replacement CF.

**Validation requirement:** `canon-addition` Phase 0 must reject a PR with `proposal_route != canon_fact_candidate` unless the skill explicitly supports converting that route into a patch plan for the target record type.

**Deletion/merge/rename:** Rename `proposed_status` to `proposed_cf_status`; add route.

---

### **Fault 5 — Mystery policy is internally validated but cross-surface blind**

**Severity:** major

**Affected files:** M schema/validator, DA, EPE, NWP, NCP, PR/RP, AU, story-promotion package boundary.

**Evidence:** Rule 7 validator only checks M records’ internal fields and status/safety coupling.

**Conceptual problem:** The dangerous failure is not only “M record malformed.” It is “downstream artifact treats M-7 as forbidden forever while DA/EPE/PR/NWP promises clue discovery and eventual revelation.”

**Recommended resolution:** Add a cross-surface validator named `mystery_policy_cross_surface`.

**Validation requirement:** It must inspect:

* M records.  
* DA `claim_map`.  
* EPE `mysteries_touched`, routing, and sidecar extracts.  
* PR/RP proposed statements and source basis.  
* NWP mystery seeds.  
* NCP canon safety checks.  
* AU findings.  
* Story-promotion proposal packages if present.

**Sample error:**

INCOMPATIBLE_WORLD_MYSTERY_POLICY:  
worlds/arden/_source/mystery-reserve/M-7.yaml status=forbidden future_resolution_safety=none,  
but worlds/arden/pressure-events/EPE-12-ash-market.md marks M-7 as a clue trail and  
worlds/arden/diegetic-artifacts/DA-4-abbot-ledger.md claim DAC-3 says the answer can be recovered.  
Choose one: reclassify M-7 as active/passive with bounded future_resolution_safety, or revise the downstream  
artifacts so they no longer promise revelation.  
Authority: docs/FOUNDATIONS.md Rule 7 / Mystery Reserve.

**Deletion/merge/rename:** Do not delete forbidden mysteries. Add `resolution_intent` to M records or extensions.

---

### **Fault 6 — Direct `INDEX.md` surfaces are intentionally skipped**

**Severity:** moderate, potentially major in mature worlds

**Affected files:** all `INDEX.md` surfaces under characters, diegetic-artifacts, proposals, audits, pressure-events, character-proposals, root world-proposals.

**Evidence:** `listSupportedWorldFiles` skips `INDEX.md`.

**Conceptual problem:** INDEX surfaces are not canon, but they are the human/tool navigation layer. If stale, they can cause an operator or future skill to miss or misclassify artifacts.

**Recommended resolution:** Add `index_surface_consistency` validator.

**Validation requirement:** It should check:

* Every artifact file has an INDEX row unless directory rules say otherwise.  
* Every INDEX row points to an existing file.  
* Row ID matches target frontmatter ID.  
* Row route/status matches target frontmatter.  
* EPE sidecar references show PR id and EPE parent id unambiguously.  
* `LINEAGE.md` rows match `NWB` files and shipped NWP cluster data.

**Deletion/merge/rename:** Keep indexes, validate them.

---

### **Fault 7 — Story-facing vocabulary is mostly acceptable, but not mechanically fenced**

**Severity:** moderate

**Affected files:** EPE, character proposal, character generation, world proposal, base-world genesis.

**Evidence:** FOUNDATIONS permits world-generativity terms but bans story-bundle execution state. Skills use `story_fuel`, `natural story engines`, `native story procedures`, `intended_narrative_role`, `likely_story_scale`, `story_scale_mix`, and “Likely Story Hooks.”

**Conceptual problem:** These terms are appropriate when they mean world affordance. They become dangerous if schemas or future templates evolve toward page/choice/storylet/act/plot-destiny state.

**Recommended resolution:** Add `world-generativity-not-story-state.md` shared reference and a validator that rejects banned structured field names and high-risk terms in frontmatter keys.

**Validation requirement:** Mechanical reject in world-system frontmatter for keys matching:

page_id, choice_id, storylet_id, act_position, midpoint, climax,  
companion_quest, plot_destiny, story_local_clock, branch_state,  
current_page, turn_state

Warn on body text unless the phrase appears in an explicit boundary/guardrail section.

**Deletion/merge/rename:** Do not delete `story_fuel`; define it as `world_affordance_for_story_consumers`.

---

### **Fault 8 — Taxonomy authority is too scattered**

**Severity:** moderate

**Affected files:** schemas, skills, canonical vocabulary source, FOUNDATIONS, local references.

**Evidence:** Canonical vocabulary source defines domain, verdict, mystery, invariant, entity, SEC, change, and CF type enums. Skills add many local taxonomies: EPE origin types, world proposal axes, character depth classes, audit categories, retcon types, approval statuses, proposal families.

**Conceptual problem:** Not all taxonomies should be merged, but every taxonomy must say whether it is canonical, schema-backed local, heuristic, scoring-only, or routing-only.

**Recommended resolution:** Add `docs/TAXONOMY-AUTHORITY.md`.

**Validation requirement:** Every schema enum must appear in the inventory with `authority_class`.

**Deletion/merge/rename:** Merge duplicate domain lists where possible; keep local heuristic taxonomies if clearly labeled.

---

### **Fault 9 — Base-world genesis overburdens CF-1**

**Severity:** moderate

**Affected files:** `create-base-world`, CF schema expectations, genesis tests.

**Evidence:** `create-base-world` currently makes CF-1 the primary-difference fact and requires ≥4 domains plus three orders of consequence.

**Conceptual problem:** A single CF can become an overloaded omnibus fact. The world starts thin but concrete; that is correct. But concreteness does not require all genesis causality to live inside one CF.

**Recommended resolution:** Allow optional multi-CF genesis:

* `CF-1`: primary difference anchor.  
* `CF-2`: material/embodied/ecological consequence.  
* `CF-3`: institutional/economic consequence.  
* `CF-4`: epistemic/mystery/misrecognition consequence.

`CH-1` still records genesis bundle creation.

**Validation requirement:** If CF-1 has too many `domains_affected` or too many unrelated consequence clusters, validator warns/fails with split guidance.

**Deletion/merge/rename:** Do not delete CF-1. Add split rule.

---

### **Fault 10 — Compatibility posture is not yet the requested strict world-incompatibility posture**

**Severity:** major

**Affected files:** `continuity-audit`, validators CLI, `compatibility-drift.ts`.

**Evidence:** Continuity audit’s compatibility appendix is optional and report-only. Current compatibility validator is story-bundle optional active-record focused.

**Conceptual problem:** The user wants strong validation and detailed manual repair reasons, not migration/backcompat. Current compatibility machinery is too soft and too story-specific.

**Recommended resolution:** Add `world-validate --world-system-compatibility-strict`.

**Validation requirement:** Must run the validators proposed in section 12 and fail incompatible worlds with detailed repair guidance.

**Deletion/merge/rename:** Keep continuity-audit appendix as read-only report, but do not treat it as the strict validator.

---

## **8. Proposed conceptual spine**

The repo now has a **partial conceptual spine**:

* `FOUNDATIONS.md` defines the constitution.  
* `artifact_maturity.ts` mechanizes maturity classification.  
* `approval-semantics.ts` mechanizes one important approval boundary.  
* `canonical-vocabularies.ts` centralizes many enums.  
* `CONTEXT-PACKET-CONTRACT.md` separates world task types from story task types.  
* `HARD-GATE-DISCIPLINE.md` controls approval-token and patch-plan execution.

That is enough to say the system is no longer conceptually incoherent. It is not enough to say the system is consolidated.

### **8.1 Required new shared references**

Add these shared references:

1. `.claude/skills/_shared-references/world-artifact-authority-and-maturity.md`  
2. `.claude/skills/_shared-references/approval-semantics.md`  
3. `.claude/skills/_shared-references/diegetic-claim-authority.md`  
4. `.claude/skills/_shared-references/world-generativity-not-story-state.md`  
5. `.claude/skills/_shared-references/proposal-family-contract.md`  
6. `docs/TAXONOMY-AUTHORITY.md`

### **8.2 Skills that should cite the maturity reference**

Every scoped world-system skill should cite `world-artifact-authority-and-maturity.md`.

Minimum citations:

| Skill | Citation reason |
| ----- | ----- |
| `create-base-world` | Distinguish genesis accepted canon from pre-world proposal. |
| `canon-addition` | Distinguish PR/RP/EPE sidecar from accepted CF/CH/PA. |
| `propose-new-canon-facts` | Candidate proposal status. |
| `canon-facts-from-diegetic-artifacts` | DA claim source versus PR candidate. |
| `character-generation` | CHAR realized hybrid not canon. |
| `diegetic-artifact-generation` | DA realized hybrid; claims not canon. |
| `emergent-pressure-events` | EPE pressure affordance; sidecar candidate. |
| `continuity-audit` | AU diagnostic; RP candidate. |
| `propose-new-characters` | NCP not CHAR. |
| `deepen-character-proposal` | Single NCP not CHAR. |
| `propose-new-worlds-from-preferences` | NWP not world. |

### **8.3 Language to remove from individual skills once shared references exist**

Remove repeated local paragraphs that define:

* “Proposals are not canon.”  
* “Cards are candidates.”  
* “`user_approved` means kept in batch.”  
* “This skill does not invoke downstream skill.”  
* “Story_fuel is passive.”  
* “DA claims are not canon.”

Replace them with concise local statements plus shared-reference citation. This reduces prose drift.

### **8.4 Interaction with `FOUNDATIONS.md`**

`FOUNDATIONS.md` remains the constitution. Shared references are operational distillations. Any conflict is resolved in favor of FOUNDATIONS.

---

## **9. `FOUNDATIONS.md` recommendations**

### **Recommendation 1 — Add approval vocabulary discipline**

**Insertion point:** After artifact authority/maturity and approval-semantics discussion.

**Reason:** Generic `user_approved` remains the biggest residual ambiguity.

**Exact insertion text:** Use the text from Fault 1.

**Downstream skills affected:** All direct-write proposal/audit/pressure/character/world proposal skills, CHAR/DA producers, `canon-addition`.

**Validators/schemas affected:** `approval_semantics`, all proposal/batch/pressure/audit/character/world proposal schemas, CHAR/DA schemas.

---

### **Recommendation 2 — Clarify proposal route versus target record status**

**Insertion point:** Canon Layers / Artifact Authority and Maturity.

**Reason:** PR schema currently permits `mystery_reserve` and `invariant_revision` inside `proposed_status`.

**Exact insertion text:**

A proposal may target different future record classes, but target class is not the same as canon status.

- `proposed_cf_status` applies only to candidate Canon Fact records and may be `hard_canon`, `soft_canon`, or `contested_canon`.  
- Proposals that target Mystery Reserve entries, invariant revisions, open-question updates, or retcon repairs MUST declare a separate `proposal_route`.  
- `mystery_reserve` is never a Canon Fact status.  
- `invariant_revision` is never a Canon Fact status.

**Downstream skills affected:** `propose-new-canon-facts`, DA mining, EPE sidecars, continuity audit RP, canon-addition.

**Validators/schemas affected:** PR schema, EPE sidecar schema, proposal normalization, canon-addition preflight.

---

### **Recommendation 3 — Add diegetic claim authority**

**Insertion point:** Diegetic artifacts / Canon Layers.

**Reason:** DA claim/canon firewall must become constitutional, not only skill prose.

**Exact insertion text:**

Diegetic artifact claims are claims made inside the world. They are not canon facts merely because the artifact exists.

A diegetic artifact may contain:  
- direct observation  
- author belief  
- narrator belief  
- rumor  
- propaganda  
- lie  
- myth  
- local truth claim  
- contested claim  
- candidate canon seed

Only an accepted `CF` can make the claim true at world-canon level. A DA-derived proposal must preserve claim provenance and must distinguish “canon fact about the existence of a belief/rumor/document” from “canon fact that the claim is true.”

**Downstream skills affected:** DA generation, DA mining, canon-addition, continuity audit.

**Validators/schemas affected:** DA schema, PR schema, claim/canon validator.

---

### **Recommendation 4 — Add mystery resolution intent**

**Insertion point:** Mystery Reserve section.

**Reason:** Current `status` and `future_resolution_safety` are not enough to distinguish forbidden forever from active clue-discovery, story-reserved, passive depth, or author-known/local-unknown.

**Exact insertion text:**

Mystery `status` describes current world-facing activity. `future_resolution_safety` describes whether future resolution is allowed. When a mystery is intended for discovery or later revelation, that intent must not be encoded as `forbidden`.

Mystery records may carry `resolution_intent`:  
- `forbidden_forever`  
- `active_discovery`  
- `clue_discovery`  
- `passive_depth`  
- `author_known_local_unknown`  
- `story_reserved`  
- `deliberately_unresolved_boundary`

For `status: forbidden`, `resolution_intent` must be `forbidden_forever` or `deliberately_unresolved_boundary`, and `future_resolution_safety` must be `none`.

**Downstream skills affected:** create-base-world, EPE, NWP, DA, continuity audit, story-promotion boundary.

**Validators/schemas affected:** M schema, Rule 7, cross-surface mystery validator.

---

### **Recommendation 5 — Add strict compatibility posture**

**Insertion point:** Validation Rules or Machine Layer summary.

**Reason:** User explicitly does not want migration/backcompat as default.

**Exact insertion text:**

Compatibility validation is not migration.

When an existing world does not comply with the current world-system contract, validators should report incompatibility with exact file/path/field, governing authority, conceptual violation, and manual repair options. They should not silently normalize, auto-migrate, or treat historical shape as acceptable unless the validator is explicitly running in an advisory legacy mode.

**Downstream skills affected:** continuity audit, validators CLI, all skills that mention compatibility.

**Validators/schemas affected:** `world-validate`, `record_schema_compliance`, `artifact_maturity`, new compatibility validators.

---

## **10. Skill-by-skill recommendations**

### **10.1 `create-base-world`**

**Current role:** Genesis skill; creates new world root markdown and atomic `_source` records through patch plan.

**Healthy boundaries:** Patch-engine genesis for accepted canon; no existing-world overwrite; one world per invocation; HARD-GATE with approval token.

**Detected drift:** CF-1 can become too overloaded. Genesis mysteries require at least active/passive/forbidden, but the system also needs active discovery and clue-discovery semantics. Native story procedures are acceptable but should cite world-generativity boundary.

**Concepts to merge/delete/rename:** Do not delete CF-1. Add optional multi-CF genesis split rule.

**Guardrail changes:** Add: “A pre-world NWP is premise input, not authority; any NWP field must be revalidated before it becomes CF/M/INV/SEC.”

**Schema changes:** Allow genesis patch plan to create more than one CF while preserving CH-1 as genesis change.

**Validator additions:** `genesis_cf_overload` validator.

**Exact replacement text, confident:**

CF-1 is the primary-difference anchor, not a dumping ground. If the genesis premise requires separable material, institutional, epistemic, or historical commitments, emit additional genesis CFs in the same CH-1 patch plan rather than compressing unrelated commitments into CF-1. The world remains thin by limiting the number of genesis records, not by making CF-1 semantically overloaded.  
---

### **10.2 `canon-addition`**

**Current role:** Canon-mutating adjudicator; accepts/rejects/revises candidate proposal into CF/CH/SEC/M/OQ extensions and PA.

**Healthy boundaries:** Patch-engine only; no direct `_source` writes; PA records adjudication; accepted CF sets `direct_user_approval`.

**Detected drift:** Needs stronger rejection for PR route/status confusion. Should not accept `proposed_status: mystery_reserve` as CF status.

**Guardrail changes:** Add route preflight:

Phase 0 must reject a proposal whose `proposal_route` targets a non-CF record class unless this skill has an explicit route handler for that class. A proposal route is not a CF status.

**Validator additions:** `proposal_route_target_class` preflight.

**MCP checks:** Use `get_record_schema` and `get_canonical_vocabulary` as hard preflight, not advisory, for CF status/type/domain.

---

### **10.3 `propose-new-canon-facts`**

**Current role:** Candidate PR/BATCH generator.

**Healthy boundaries:** Direct writes under `proposals/`; no canon mutation; user review does not canonize.

**Detected drift:** Generic `user_approved`, PR status/route conflation, schema allows non-CF proposed statuses.

**Reference/template changes:** Replace local “not canon” boilerplate with shared maturity reference.

**Schema changes:** Replace `proposed_status` as described in Fault 4.

**Exact replacement text:**

A PR card records a proposed future canon operation. Its review status means only that the card was kept for possible adjudication. It does not make the statement true, accepted, or canon.  
---

### **10.4 `canon-facts-from-diegetic-artifacts`**

**Current role:** Mines DA claims into candidate PR cards.

**Healthy boundaries:** Prose-primary mining; rejects narrator belief, propaganda, contradiction, and unreliable claims as PR truth unless framed correctly.

**Detected drift:** Depends on DA claim discipline that the DA schema does not enforce.

**Guardrail changes:** Require typed DA claim-map before mining. If DA lacks strict claim map, emit no PR and produce diagnostic batch.

**Validator additions:** `da_claim_map_required_for_mining`.

**Exact replacement text:**

If the source DA does not expose a typed `claim_map`, this skill must not infer canon candidates from body prose alone. It may emit an empty batch with a diagnostic explaining that the artifact must first be repaired to classify each in-world claim.  
---

### **10.5 `character-generation`**

**Current role:** Creates realized CHAR hybrid dossier via patch-engine append.

**Healthy boundaries:** No canon mutation; dossier is not CF; NCP input remains proposal until realized.

**Detected drift:** `intended_narrative_role` and “Likely Story Hooks” are acceptable but should be fenced as world affordances, not story-bundle execution. INDEX unvalidated.

**Shared reference changes:** Cite realized-hybrid policy and world-generativity boundary.

**Schema changes:** Add `artifact_write_approval` instead of `source_basis.user_approved`.

**Validator additions:** `realized_hybrid_index_consistency`.

---

### **10.6 `diegetic-artifact-generation`**

**Current role:** Creates realized DA hybrid in-world artifact.

**Healthy boundaries:** DA claims are in-world claims, not canon; no canon writes; downstream mining required.

**Detected drift:** DA schema is too loose.

**Schema changes:** Strict `claim_map`; strict `world_consistency`; strict `source_basis`; explicit `artifact_write_approval`.

**Validator additions:** `da_claim_authority`, `da_mystery_claim_firewall`.

**Exact replacement text:**

The DA file makes the artifact exist. It does not make the artifact's claims true. Each claim must be classified before any mining skill may treat it as a canon candidate.  
---

### **10.7 `emergent-pressure-events`**

**Current role:** Generates pressure-affordance EPE cards and canonize-routed sidecar PRs.

**Healthy boundaries:** EPE is not canon; sidecar is candidate PR; no canon writes; `story_fuel` is passive.

**Detected drift:** `proposal_card_extract` is loose; `story_fuel` needs fencing; older-server fallback for EPE id allocation weakens fail-fast posture; EPE batch maturity classification appears incomplete.

**Schema changes:** `proposal_card_extract` should validate against the PR candidate schema or a strict extract schema.

**Guardrail changes:** Replace “continue with older-server fallbacks” with fail-fast capability mismatch for normal operation.

**Exact replacement text:**

If `describe_capabilities` does not expose the required `task_type`, `id_class`, or schema route for EPE generation, abort with a capability-drift error. Do not silently fall back during normal operation; fallback scanning is a debugging recovery path only.  
---

### **10.8 `continuity-audit`**

**Current role:** Produces AU audit report and optional RP retcon proposal cards.

**Healthy boundaries:** Proposes, does not apply; optional compatibility appendix is read-only.

**Detected drift:** Compatibility appendix is too weak for user’s desired strict incompatibility posture. AU body findings are not strongly typed.

**Schema changes:** Add typed finding records in AU frontmatter or body-adjacent YAML block.

**Validator additions:** `audit_report_finding_shape`, `world_system_compatibility_strict`.

**Exact replacement text:**

Compatibility reporting in continuity-audit is advisory. Strict world-system compatibility is enforced by `world-validate --world-system-compatibility-strict`, not by the audit report appendix.  
---

### **10.9 `propose-new-characters`**

**Current role:** Candidate NCP/NCB batch generator.

**Healthy boundaries:** NCP is not CHAR; canon-requiring facts are routed, not asserted.

**Detected drift:** `intended_narrative_role`, `likely_story_scale`, and `story_scale_mix` should be fenced. `canon_assumption_flags` should be stricter.

**Schema changes:** `canon_assumption_flags.implied_new_facts[]` should have strict shape and route enum.

**Validator additions:** `ncp_canon_assumption_flags_complete`.

**Exact replacement text:**

`intended_narrative_role` describes world-facing affordance and character function. It must not encode act position, branch role, plot destiny, companion quest status, or story-bundle execution state.  
---

### **10.10 `deepen-character-proposal`**

**Current role:** Upgrades one seed/NCP into one stronger NCP.

**Healthy boundaries:** No canon, no CHAR, no batch manifest; guards explicitly ban plot destiny/companion quest.

**Detected drift:** Single-card upgrades omit NCB, so INDEX consistency and lineage must carry enough context.

**Schema changes:** Add `upgrade_lineage.input_path` and `upgrade_lineage.origin_kind` as required and strict.

**Validator additions:** `ncp_upgrade_lineage_consistency`.

**Exact replacement text:** Current no-story-state guardrail is strong; retain and cite shared boundary reference.

---

### **10.11 `propose-new-worlds-from-preferences`**

**Current role:** Generates root-level pre-world NWP/NWB proposals.

**Healthy boundaries:** NWP is not a world; writes root-level proposal space only; reads existing worlds for distinctness.

**Detected drift:** `intended_canon_layer` sounds too much like actual canon. `bootstrap_writes_required/performed` can sound like world bootstrapping rather than proposal-directory bootstrap.

**Schema changes:**

* Rename `intended_canon_layer` to `future_seed_destination`.  
* Rename `bootstrap_writes_required` to `proposal_surface_bootstrap_required`.  
* Rename `bootstrap_writes_performed` to `proposal_surface_bootstrap_performed`.

**Exact replacement text:**

An NWP card is a premise candidate for `create-base-world`. Its fields describe future seeding intent, not current canon layer. No NWP card creates a world or canon record.  
---

## **11. Shared references / templates / schemas / examples recommendations**

### **11.1 New shared references**

| New file | Purpose |
| ----- | ----- |
| `_shared-references/world-artifact-authority-and-maturity.md` | Operational maturity/authority ladder. |
| `_shared-references/approval-semantics.md` | Approval/status field names and meanings. |
| `_shared-references/diegetic-claim-authority.md` | DA claim classification and canon-laundering prevention. |
| `_shared-references/world-generativity-not-story-state.md` | Allowed and banned story-facing terminology. |
| `_shared-references/realized-hybrid-artifact-policy.md` | Shared CHAR/DA policy. |
| `docs/TAXONOMY-AUTHORITY.md` | Canonical vs local taxonomy inventory. |

### **11.2 Modified schemas**

| Schema | Required change |
| ----- | ----- |
| `proposal-card.schema.json` | Split `proposal_route` from `proposed_cf_status`; remove `mystery_reserve` and `invariant_revision` from CF status. |
| `proposal-batch.schema.json` | Replace `user_approved` with `batch_review_status`. |
| `pressure-event-card.schema.json` | Strictly validate `proposal_card_extract`; rename review approval; require M-id patterns. |
| `pressure-event-batch.schema.json` | Clarify `sidecars_emitted` as sidecar objects `{ epe_id, proposal_id, path }`. |
| `audit-report.schema.json` | Add typed findings; replace `user_approved`. |
| `retcon-proposal-card.schema.json` | Add route/status split and recommendation review status. |
| `world-proposal-card.schema.json` | Rename `intended_canon_layer`; tighten `mystery_reserve_seeds` and `canon_safety_check`. |
| `world-proposal-batch.schema.json` | Rename proposal-surface bootstrap fields. |
| `character-proposal-card.schema.json` | Tighten `canon_assumption_flags`; fence story-facing fields. |
| `character-frontmatter.schema.json` | Replace loose `source_basis` approval with `artifact_write_approval`. |
| `diegetic-artifact-frontmatter.schema.json` | Strict claim-map and claim/canon separation. |

### **11.3 Examples and templates**

The stale-example sweep should check for:

* Any `user_approved` field.  
* Any PR with `proposed_status: mystery_reserve` or `invariant_revision`.  
* Any DA example without typed `claim_map`.  
* Any EPE sidecar where sidecar path/id confusion is unclear.  
* Any NWP implying it is an accepted world.  
* Any NCP implying it is an established character.  
* Any AU/RP implying recommendation equals applied repair.  
* Any story-facing term that means plot execution rather than world affordance.

### **11.4 Patch-engine / envelope checks**

No broad patch-engine rewrite is recommended. The patch engine’s tiered write order, two-phase commit, per-world lock, and approval-token discipline are the correct foundation.

Required additions are validator-side and schema-side:

* Validate proposal route target class before patch plan construction.  
* Validate `expected_id_allocations` against new route classes.  
* Add capability/contract tests for skill-mentioned op names and envelope fields.

### **11.5 MCP vocabulary checks**

Add a test suite that parses skill prose/templates for:

* `task_type`  
* `record_type`  
* `node_type`  
* `id_class`  
* `cf_type`  
* `domain`  
* `sec_file_class`  
* `mystery_status`  
* `mystery_resolution_safety`  
* patch op names  
* envelope fields

Then compare against:

* `canonical-vocabularies.ts`  
* `tool-names.ts`  
* `get_record_schema`  
* `describe_capabilities`  
* `describe_envelope_schema`

This is Worldloom’s equivalent of consumer/provider contract testing; static docs alone will keep drifting.

---

## **12. Validation and incompatibility plan**

This plan explicitly rejects migration/backcompat as the primary goal. Existing private worlds that do not match the current contract should fail with detailed, actionable incompatibility reports.

### **12.1 Validator: `approval_semantics_strict`**

**Checks:** Rejects generic `user_approved`; reserves `direct_user_approval` for accepted CF; validates semantic review fields.

**Runs:** Pre-apply, incremental touched-file, full-world strict compatibility.

**Inspects:** CF, PR, BATCH, RP, AU, EPE, sidecars, NCP, NCB, NWP, NWB, CHAR, DA, PA.

**Sample error:**

APPROVAL_FIELD_AMBIGUOUS:  
worlds/arden/proposals/PR-14-ash-tithe.md source_basis.user_approved is no longer allowed.  
This artifact is a candidate proposal, not accepted canon. Replace with  
proposal_review_status=kept_for_adjudication. Do not use source_basis.direct_user_approval  
unless canon-addition emits an accepted CF.  
Authority: docs/FOUNDATIONS.md Approval vocabulary discipline.  
Manual repair: edit the frontmatter field name and status value; do not change the proposal statement.

**Mechanical or judgment-only:** Mechanical.

**Blocks writes:** Yes.

**Requires schema changes:** Yes.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

### **12.2 Validator: `artifact_maturity_strict`**

**Checks:** Path/node/artifact type matches maturity class; artifact text/frontmatter does not claim higher authority.

**Runs:** Pre-apply, incremental, full-world strict.

**Inspects:** All artifact classes in matrix.

**Sample error:**

ARTIFACT_AUTHORITY_COLLAPSE:  
worlds/arden/character-proposals/NCP-9-glass-smuggler.md describes itself as an "established character".  
NCP is candidate_character_proposal, not CHAR and not canon. Either realize it through  
character-generation or revise the wording to "candidate character proposal".  
Authority: docs/FOUNDATIONS.md Artifact Authority and Maturity.

**Mechanical or judgment-only:** Mechanical for fields and known phrases; warning for body prose.

**Blocks writes:** Yes for frontmatter/known authority phrases; warn for body prose in non-strict mode.

**Requires schema changes:** Optional constant maturity fields.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

### **12.3 Validator: `da_claim_authority`**

**Checks:** DA claim-map typed; DA claims do not assert canon truth without CF citation; DA-mined PRs preserve claim provenance.

**Runs:** Pre-apply for DA append; full-world strict; DA-mining preflight.

**Inspects:** DA files, DA-derived PRs.

**Sample error:**

DA_CLAIM_CANON_LAUNDERING:  
worlds/arden/diegetic-artifacts/DA-3-oracle-ledger.md claim_map[2] says  
truth_relation_to_canon=corroborates_cited_canon but cited_cf_ids is empty.  
A diegetic claim cannot be marked canon-corroborating without the accepted CF it corroborates.  
Authority: docs/FOUNDATIONS.md Diegetic artifact claims are not canon.  
Manual repair: either cite the relevant CF id, or change truth_relation_to_canon to  
unaddressed_by_canon / contested_claim / impossible_for_narrator_to_verify.

**Mechanical or judgment-only:** Mechanical for frontmatter; judgment-only for prose/body mismatch.

**Blocks writes:** Yes.

**Requires schema changes:** Yes.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

### **12.4 Validator: `mystery_policy_cross_surface`**

**Checks:** Cross-surface mystery use against M status/safety/resolution intent.

**Runs:** Full-world strict; pre-apply for any patch touching M or artifact fields referencing M; incremental for direct artifacts.

**Inspects:** M, DA, EPE, PR, RP, NWP, NCP, AU, story-promotion packages.

**Sample error:** Use sample from Fault 5.

**Mechanical or judgment-only:** Mixed. Mechanical for explicit M references and fields; judgment-only semantic scan for body claims.

**Blocks writes:** Mechanical failures block; semantic warnings can block in strict compatibility.

**Requires schema changes:** Yes for `resolution_intent`.

**Requires MCP changes:** Maybe no, if indexed fields are available; yes if `get_firewall_content` should expose `resolution_intent`.

**Requires tests:** Yes.

---

### **12.5 Validator: `proposal_route_target_class`**

**Checks:** Proposal route matches intended target record class and status fields.

**Runs:** PR/RP/EPE sidecar creation and canon-addition preflight.

**Inspects:** PR/RP/sidecar proposal cards.

**Sample error:**

PROPOSAL_ROUTE_STATUS_MISMATCH:  
worlds/arden/proposals/PR-22-silent-well.md proposed_status=mystery_reserve.  
Mystery Reserve is not a Canon Fact status. Use proposal_route=mystery_reserve_candidate  
and omit proposed_cf_status, or change this to proposal_route=canon_fact_candidate with  
proposed_cf_status=hard_canon|soft_canon|contested_canon.  
Authority: docs/FOUNDATIONS.md Canon Layers / proposal route discipline.

**Mechanical or judgment-only:** Mechanical.

**Blocks writes:** Yes.

**Requires schema changes:** Yes.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

### **12.6 Validator: `index_surface_consistency`**

**Checks:** INDEX rows match files and frontmatter.

**Runs:** Full-world strict; post-direct-write optional; incremental when INDEX or artifact files touched.

**Inspects:** All INDEX surfaces plus artifact dirs.

**Sample error:**

INDEX_SURFACE_STALE:  
worlds/arden/pressure-events/INDEX.md lists EPE-18-bread-riot.md, but no such file exists.  
INDEX surfaces are navigational, not canon, but stale rows mislead downstream operators.  
Manual repair: remove the row or restore the missing EPE file; then rerun world-validate.

**Mechanical or judgment-only:** Mechanical.

**Blocks writes:** Warn in normal mode; fail in strict compatibility.

**Requires schema changes:** No.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

### **12.7 Validator: `world_story_leakage`**

**Checks:** Banned story-bundle execution fields/terms in world-system frontmatter.

**Runs:** Direct artifact schema validation; full-world strict.

**Inspects:** NWP/NCP/PR/RP/EPE/CHAR/DA/AU frontmatter and selected body guardrail sections.

**Sample error:**

WORLD_STORY_STATE_LEAKAGE:  
worlds/arden/character-proposals/NCP-5-bell-runner.md frontmatter contains act_position=midpoint.  
World-scope character proposals may describe world affordance, not story-bundle execution state.  
Authority: docs/FOUNDATIONS.md World Generativity vs Story-Bundle State.  
Manual repair: remove act_position. If this belongs to a story bundle, encode it under  
worlds/<slug>/stories/<story-slug>/, not in NCP.

**Mechanical or judgment-only:** Mechanical for field names; judgment-only for body prose.

**Blocks writes:** Yes for frontmatter.

**Requires schema changes:** Optional.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

### **12.8 Validator: `taxonomy_authority_consistency`**

**Checks:** Every enum used in schemas/skills is registered as canonical, local schema enum, heuristic, scoring, or routing sentinel.

**Runs:** CI/tooling audit, not per-world validation.

**Inspects:** Schemas, canonical vocabulary source, skill docs/templates.

**Sample error:**

TAXONOMY_AUTHORITY_UNDECLARED:  
emergent-pressure-events references origin_type=technology_leakage, but docs/TAXONOMY-AUTHORITY.md  
does not classify the origin_type taxonomy. Declare it as schema-backed local enum or route sentinel.

**Mechanical or judgment-only:** Mechanical.

**Blocks writes:** Blocks schema/skill changes in tooling audit.

**Requires schema changes:** No.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

### **12.9 Validator: `mcp_skill_contract_consistency`**

**Checks:** Skill prose/tool references match current MCP tool names, task types, record types, node types, id classes, and envelope fields.

**Runs:** Tooling/CI audit.

**Inspects:** Skill docs/templates/references; MCP source/docs/schema introspection.

**Sample error:**

MCP_SKILL_CONTRACT_DRIFT:  
.claude/skills/emergent-pressure-events/SKILL.md references id_class=EPE, but  
describe_capabilities for the active MCP server does not expose EPE.  
Normal operation must fail fast rather than silently scanning filenames.  
Manual repair: update MCP id-class support or revise the skill to remove EPE allocation.

**Mechanical or judgment-only:** Mechanical.

**Blocks writes:** Blocks skill updates / can fail preflight.

**Requires schema changes:** No.

**Requires MCP changes:** Possibly.

**Requires tests:** Yes.

---

### **12.10 Validator: `genesis_minimum_world_structure`**

**Checks:** Base world genesis has concrete institutions, daily life, resources, geography, history, entities, pressure points, mysteries, and split-CF rationale.

**Runs:** `create-base-world` pre-commit and full-world strict for genesis worlds.

**Inspects:** CF-1..n, CH-1, initial SEC, INV, M, OQ, ENT.

**Sample error:**

GENESIS_WORLD_UNDERCOOKED:  
worlds/arden/_source/everyday-life/SEC-ELF-1.yaml contains no concrete first-order consequence  
of CF-1 despite CF-1.required_world_updates including EVERYDAY_LIFE.  
A base world may be thin, but touched sections must materialize the primary difference.  
Manual repair: add one concrete daily-life consequence or remove EVERYDAY_LIFE from CF-1.required_world_updates.  
Authority: create-base-world Phase 4 / FOUNDATIONS Rule 5.

**Mechanical or judgment-only:** Mixed.

**Blocks writes:** Yes for structural gaps; judgment-only warnings can block in skill self-validation.

**Requires schema changes:** No.

**Requires MCP changes:** No.

**Requires tests:** Yes.

---

## **13. Priority plan**

### **Must fix before more world-system growth**

1. Replace `user_approved` with semantic approval/review/write status fields.  
2. Split proposal route from CF status.  
3. Strict DA claim-map schema and DA claim/canon validator.  
4. Add cross-surface mystery policy validator.  
5. Add strict world-system compatibility CLI mode.  
6. Add shared artifact authority/maturity reference and require all world skills to cite it.  
7. Add MCP/schema/skill contract drift test harness.

### **Should fix before next mature world**

1. Validate all INDEX surfaces.  
2. Tighten EPE `proposal_card_extract`.  
3. Add `world_story_leakage` validator.  
4. Add taxonomy authority inventory.  
5. Add typed AU finding schema.  
6. Add NCP canon-assumption strict schema.  
7. Add genesis split rule and undercooked-world validator.

### **Nice-to-have consolidation**

1. Reduce repeated “not canon” prose by moving to shared references.  
2. Rename NWP `intended_canon_layer` and proposal-surface bootstrap fields.  
3. Add explicit maturity constants to direct artifacts if path-derived validation proves insufficient.  
4. Add validator output formatting helpers for conceptual/manual-repair messages.  
5. Add example/template stale-text sweep after schemas change.

### **Deferred research questions**

1. Whether Mystery Reserve needs `resolution_intent` as first-class schema field or extension block.  
2. Whether `derived_canon` belongs in CF status everywhere or only in certain retcon flows.  
3. Whether NWP/NCP scoring axes should remain schema-backed or move to body-only heuristic sections.  
4. Whether root-level `world-proposals/LINEAGE.md` should be indexed or remain validated by file scan only.  
5. Whether compatibility strict mode should fail all historical current-schema gaps or distinguish “non-load-bearing stale field name” from “dangerous authority collapse.”

---

## **14. Open questions / decisions for user**

1. Should the implementation phase **hard-remove `user_approved` immediately**, breaking old private worlds until manually repaired, or allow one strict-compatibility cycle where `user_approved` fails with detailed repair messages but schemas still parse it?  
2. Should `resolution_intent` become a required M-record field now, or should it first live in `extensions[]` while validators enforce it only when downstream artifacts reference the mystery?  
3. Should direct artifacts carry explicit `maturity_class` fields, or should maturity remain path/node-type-derived with validator reporting? My recommendation is path-derived first, explicit constants only for ambiguous direct-write surfaces.  
4. Should `create-base-world` support multi-CF genesis immediately, or should it first add a CF-1 overload warning and keep the one-CF default?  
5. Should `world-validate --world-system-compatibility-strict` be allowed to fail on stale `INDEX.md` rows, or should index drift remain warning-only unless the referenced artifact is missing?

