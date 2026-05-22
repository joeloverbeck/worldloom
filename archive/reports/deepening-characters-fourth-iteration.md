**Status**: COMPLETED

## **1. Final Verdict**

**NEEDS ONE MORE IMPLEMENTATION PASS**

The third-iteration fixes closed several important plumbing and schema gaps: `batch_id` enforcement for batch NCPs, `card_ids` for NCBs, MCP schema exposure for `character_proposal_card` / `character_proposal_batch`, NCP/NCB list-record support, NCP/NCB world-index node types, and NCP→NCB structured edges are all substantially present on current `main`.

But the system is **not done**. The most important previously identified gap remains open: **deterministic NCP body-section validation is still too thin**. Current validators can reject malformed/missing frontmatter, schema-invalid frontmatter, placeholders, canon-requiring NCPs without implied facts, and weak upgraded/user-seed rejected-direction arrays. They do **not** deterministically reject frontmatter-valid but body-hollow NCPs, missing `Niche Analysis`, missing `Canon Safety Check Trace`, missing upgraded `Seed Essence`, missing upgraded `Upgrade Diagnosis`, or empty required NCP body sections. The current structural tests even accept simplified proposal-card bodies that do not resemble the current templates, so they prove plumbing, not closure.

This is **not** a major redesign problem. The architecture is basically right. It needs one targeted implementation/test pass focused on validator closure, realistic fixtures, and a few retrieval/story-boundary polish items.

Highest-value remaining changes:

1. Add deterministic NCP body-section validation for batch and upgraded/user-seed proposal cards.  
2. Replace simplified NCP validator/MCP/index fixtures with current-template-shaped fixtures.  
3. Add full-world-index build/sync coverage for realistic `character-proposals/*.md` and `character-proposals/batches/*.md`.  
4. Improve hybrid `get_record_field` error guidance, or explicitly test the unsupported hybrid path.  
5. Add explicit story-pipeline guardrails so story retrieval never treats NCP/NCB proposal records as story-consumable cast.

This audit follows the uploaded mission brief and its repository-only constraints.

---

## **2. Current Fourth-Iteration Architecture Snapshot**

Worldloom’s current character architecture is conceptually coherent. `docs/FOUNDATIONS.md` remains the design constitution: local causality, no silent canonization, material/institutional grounding, Mystery Reserve discipline, explicit canon routing, concrete state, and clean story/world separation are all still the governing principles.

The shared protagonist-grade character doctrine is centralized in `.claude/skills/_shared-references/protagonist-grade-character-engine.md`. It defines the required engine fields and insists on byte-for-byte alignment across doctrine, templates, schemas, validators, and skill prose. The required engine shape is strong: wound, appetite, self-mythology, contradiction, pressure behavior, relational charge, moral/psychological edge, signature behaviors, voice under pressure, and non-swappability.

`propose-new-characters` is now a world-authoring proposal pipeline. It writes NCP cards under `worlds/<world_slug>/character-proposals/` and NCB manifests under `worlds/<world_slug>/character-proposals/batches/`, not realized CHAR dossiers and not canon facts. Its template includes `batch_id`, `memorability_profile`, canon assumption flags, critic traces, and the expected body sections including `Niche Analysis` and `Canon Safety Check Trace`.

The NCB manifest template uses current `card_ids`, not stale `proposal_ids`, and carries batch metadata, registry summaries, dropped cards, user approval status, and batch rationale surfaces.

`deepen-character-proposal` is correctly positioned as a single-seed radicalization pass, not a realization skill and not a new canon writer. It may produce upgraded/user-seed NCPs without `batch_id`, and its upgraded template includes `Seed Essence`, `Upgrade Diagnosis`, `Rejected Directions Audit`, and `Canon Safety Check Trace`.

`character-generation` is the realization bridge from brief or NCP to CHAR. Its doctrine says an NCP’s `memorability_profile` becomes the CHAR `dramatic_core`, and NCP-derived dossiers must carry `source_basis.source_proposal_id`. Phase 0 parses NCP memorability into an `input_memorability_contract`; Phase 4b preserves it into `dramatic_core`; later phases expose anti-flattening tradeoffs.

The CHAR template has a `dramatic_core` surface aligned with the shared protagonist-grade engine and an optional `source_basis.source_proposal_id` field.

Schemas are materially upgraded. `character-proposal-card.schema.json` conditionally requires `batch_id` for batch-generated cards, allows omission for upgraded/user-seed cards, requires the full `memorability_profile`, enforces upgraded critic/rejected-direction shapes, and rejects canon-requiring NCPs without `implied_new_facts`. The NCB schema requires `card_ids` and no longer uses stale `proposal_ids`. The CHAR frontmatter schema requires `dramatic_core` and supports `source_basis.source_proposal_id`.

Validator registration includes YAML parse integrity, record-schema compliance, and character memorability structure. But the structural NCP body validator is the major weak point: it validates only a narrow upgraded/user-seed body heading plus some frontmatter-derived conditions, not the actual NCP body contract.

World-index support is mostly in place. Prose parsing recognizes `character-proposals/*.md` as `character_proposal_card`, `character-proposals/batches/*.md` as `character_proposal_batch`, and derives node ids from `proposal_id` / `batch_id`. Enumeration includes both directories. Scoped reference parsing treats NCPs as proposal-provenance sources. Structured-edge extraction creates NCP→NCB edges from `batch_id`.

MCP support is much better than before. `get_record` accepts NCP/NCB hybrid ids and supports `frontmatter.*` and `body.<section>` projections. `get_records` delegates consistently. `list_records` supports `character_proposal_card` and `character_proposal_batch`, including `include_full_body=true` with parsed frontmatter and body sections. `get_record_schema` exposes both proposal schemas. Server capability enums now include the relevant schema/list enum values.

Story consumers remain downstream. Story bootstrap and turn-cycle consume selected `CHAR-<integer>` ids and story-local state records, not NCP/NCB proposals or character-generation internals.

---

## **3. Third-Iteration Fix Verification**

| Previous issue | Current status | Finding |
| ----- | ----- | ----- |
| NCP body-section validation too thin | **Still open** | Structural validator still does not require real NCP sections such as `Material Reality`, `Niche Analysis`, or `Canon Safety Check Trace`. |
| Frontmatter-only NCP can pass | **Still open** | If frontmatter passes schema, current structural validator has no general required body-section check. |
| Body-only / malformed-frontmatter NCP skipped | **Mostly closed** | Missing frontmatter is caught by schema compliance; malformed YAML is caught by YAML integrity. |
| Missing `Niche Analysis` and `Canon Safety Check Trace` | **Still open** | Templates require them, validators do not. |
| Upgraded/user-seed body checks for `Seed Essence`, `Upgrade Diagnosis`, `Rejected Directions Audit` | **Partially closed** | `Rejected Directions Audit` heading and min count are checked; `Seed Essence` and `Upgrade Diagnosis` are not. |
| Batch NCP cards may omit `batch_id` | **Closed** | Schema conditionally requires `batch_id` for batch-generated cards. |
| MCP `get_record_schema` missing NCP/NCB | **Closed** | Both node types are in supported schema node types and mapped to validator schemas. |
| MCP/index tests used stale/simple fixtures | **Partially open** | Schema tests improved, but structural/MCP/index fixtures still use simplified NCP bodies that do not match real templates. |
| NCB `proposal_ids` drift | **Closed in current schema/templates** | Current NCB schema and template use `card_ids`. |
| CHAR/NCP provenance drift around `source_basis.source_proposal_id` | **Partially closed** | Schema/template/docs/tests recognize the field; deterministic validation only format-checks when present. |
| NCP→CHAR anti-flattening weak in tests | **Partially open** | Skill doctrine is strong; deterministic comparison/acceptance coverage remains weak. |
| Validator failure messages | **Partially closed** | YAML/schema messages are decent; missing/empty NCP body-section messages do not exist yet. |
| Story retrieval blast radius | **Mostly closed** | Story profiles and skills center CHAR/world canon, not NCP/NCB; minor seed-node loophole remains. |

---

## **4. Alignment and Drift Audit**

### **Field-alignment table**

| Surface | Current alignment | Finding |
| ----- | ----- | ----- |
| `character_proposal_card` spelling | Aligned across schema, validator mapping, world-index node type, MCP list/schema. | Closed. |
| `character_proposal_batch` spelling | Aligned across schema, index, MCP. | Closed. |
| `proposal_id` | NCP template/schema/index canonical id aligned. | Closed. |
| `batch_id` | NCP batch link and NCB id aligned; schema pattern matches `NCB-<integer>`. | Closed. |
| `card_ids` vs `proposal_ids` | Current template/schema use `card_ids`. | Closed, but add explicit stale-fixture rejection test. |
| `source_basis.source_proposal_id` | CHAR template/schema/docs recognize it; validator checks format if present. | Partially closed: not deterministically required for NCP-derived CHAR. |
| `memorability_profile` → `dramatic_core` | NCP and CHAR surfaces align conceptually and by fields. | Closed in doctrine; weak in test enforcement. |
| 10 protagonist-grade fields | Shared doctrine, schemas, templates align. | Closed. |
| `pressure_behavior` subfields | Aligned: `cornered`, `tempted`, `humiliated`, `offered_power`, `protecting_attachment`. | Closed. |
| `voice_under_pressure` subfields | Aligned: `lying`, `begging`, `threatening`, `grieving_or_hiding_ignorance`. | Closed. |
| `relational_charge` subfields | Aligned: `target_or_relation_type`, `need`, `resentment_or_fear`, `likely_harm_or_betrayal`. | Closed. |
| `critic_pass_trace` batch vs upgraded shape | Conditional schema enforces batch vs upgrade shape. | Closed. |
| `upgrade_lineage.rejected_directions_audit` | Schema forces upgraded/user-seed object array min 3; structural validator checks array/min count. | Mostly closed; failure wording should mention object shape. |
| NCP body sections | Templates/prose require them; deterministic validator does not. | **Open high-severity drift.** |
| `occupancy_strength`, `score_aggregate` | Present in template; not required by schema. | Medium/low drift. |

### **Lifecycle boundary alignment**

The lifecycle boundary is clean in doctrine:

`NCP / NCB` are proposal records, not canon. `CHAR` is realized world character. Story systems consume realized `CHAR` records and story-local mirrors/state, not NCPs.

The implementation mostly respects this. The remaining drift is not conceptual; it is validation/test realism.

---

## **5. Validator and Failure-Message Audit**

### **Schema validation**

Schema validation is now strong for frontmatter. It catches missing NCP required engine fields, canon-requiring NCPs without implied facts, missing batch `batch_id`, wrong critic trace shape, upgraded/user-seed rejected-direction arrays under three items, and NCB `card_ids` shape.

Schema validation does **not** validate Markdown body sections. That is correct in principle; body-section validation belongs in structural validators. The problem is that the structural validator does not currently do enough.

### **Structural validation**

CHAR structural validation is reasonably strong. It requires body surfaces for protagonist-grade core, pressure behavior, self-mythology/blind spots, relational charge, moral/psychological edge, and signature scene behavior; it also checks weak/duplicated pressure behavior and placeholder text.

NCP structural validation is underpowered. It currently checks:

* upgraded/user-seed `Rejected Directions Audit` heading;  
* upgraded/user-seed rejected-directions count;  
* canon-requiring with missing implied facts;  
* placeholder text;  
* some CHAR-related provenance/shape checks.

It does **not** check the actual NCP section contract. That means structurally hollow NCPs can still pass.

### **YAML/frontmatter validation**

Missing frontmatter and malformed frontmatter are covered. Record-schema compliance reports missing/parseable frontmatter issues for hybrid files; YAML parse integrity preserves parse-error detail for malformed YAML.

### **Canon-routing validation**

Canon-requiring NCPs with empty `implied_new_facts` are rejected at schema level and also structurally checked. That closes the “suppress brilliance to avoid canon work” failure mode better than before: canon-requiring brilliance may surface, but must be explicitly routed.

### **Anti-placeholder validation**

The placeholder detector is useful and intentionally avoids false positives for phrases like “no TODO.” That is good.

### **Failure-message quality**

Good enough:

* malformed YAML;  
* missing frontmatter;  
* unsupported schema node types;  
* list-record projection keys.

Weak or missing:

* missing NCP body section;  
* empty NCP body section;  
* missing upgraded `Seed Essence`;  
* missing upgraded `Upgrade Diagnosis`;  
* hybrid `get_record_field` rejection should point users to `get_record(section_path='frontmatter.x'|'body.Section')`;  
* rejected-directions errors should state “minimum three object entries” and expected object fields.

### **Over-validation risk**

Current validation is not over-bureaucratic. If anything, NCP validation is too permissive. The next pass should avoid judging literary greatness; it should only require exact headings, non-empty content, and shape/provenance/canon-routing surfaces.

---

## **6. Retrieval / MCP / World-Index Audit**

### **NCP/NCB indexing**

Index enumeration includes `character-proposals/*.md` and `character-proposals/batches/*.md`. Prose parsing maps those paths to `character_proposal_card` and `character_proposal_batch`, using frontmatter `proposal_id` / `batch_id` as canonical ids.

### **Structured NCP→NCB references**

`structured-edges.ts` creates a structured edge from NCP `batch_id` to the matching NCB `batch_id`. The structured-edge test covers NCP→NCB edge creation, but with a minimal fake body, not a current-template-shaped file.

### **Scoped references**

Scoped parsing treats NCPs as proposal-provenance sources. That is the right trust model: NCP scoped references are useful proposal evidence, not realized canon.

### **MCP `get_record`**

`get_record` supports NCP and NCB as hybrid records. It parses frontmatter, body sections, and projections such as `frontmatter.memorability_profile`, `body.Niche Analysis`, and `body.Canon Safety Check Trace` when the section exists.

### **MCP `get_records`**

`get_records` delegates to `get_record` and returns per-id success/error entries. That should work consistently for NCP/NCB.

### **MCP `get_record_field` / `get_records_field`**

These tools are still atomic/story-bundle field readers, not hybrid readers. The server description says that, so this is not a functional contradiction. But the error path should be more useful for NCP/NCB: it should explicitly say to use `get_record(section_path='frontmatter.<field>')` or `get_record(section_path='body.<section>')`.

### **MCP `list_records`**

`list_records` accepts `character_proposal_card` and `character_proposal_batch`. With `include_full_body=true`, hybrid records return parsed frontmatter and body sections. Current tests cover proposal metadata listing, but the fixtures are simplified.

### **MCP `get_record_schema`**

This is closed. `get_record_schema` supports both character proposal node types, and tests explicitly verify proposal schema exposure.

### **Ranking/profile suitability**

`propose_new_characters` has a ranking profile built around world canon, invariants, Mystery Reserve, existing CHARs, artifacts, adjudications, named entities, and sections. It does not accidentally make proposals story-consumable.

Story profiles prioritize canon facts, invariants, Mystery Reserve, named entities, sections, and realized `character_record`; they do not boost NCP/NCB proposal records.

One minor issue remains: context-packet assembly will treat any resolvable world-scope seed node as local authority, and `NCP` / `NCB` are world-scope ids, not story-local ids. Story skills themselves seed with CHAR ids and world anchors, so this is not actively contaminating story consumers. Still, story-pipeline docs or code should explicitly ignore/warn on NCP/NCB seed nodes.

### **`deepen-character-proposal` context profile**

It is acceptable that `deepen-character-proposal` reuses the `propose_new_characters` context profile. I found no evidence that a dedicated profile is necessary. The skill is world-authoring, proposal-focused, and needs the same anti-duplication/canon-locality surfaces.

---

## **7. Character-Quality and Anti-Flattening Audit**

The system’s quality doctrine is strong. It explicitly wants significant world characters, not disposable background texture; the shared engine pushes against generic dossiers by requiring pressure behavior, relational charge, moral/psychological edge, voice under stress, and non-swappability.

`propose-new-characters` still makes protagonist-grade force the default. The proposal card template requires memorability fields and body sections that should expose material reality, institutional embedding, epistemic position, goals/pressures, capabilities, voice, contradiction, niche, and canon safety.

`deepen-character-proposal` is still framed as radicalization, not polishing. It requires multiple mutations and rejected directions.

`character-generation` has the right anti-flattening doctrine: Phase 0 extracts the input memorability contract; Phase 4b maps it into `dramatic_core`; Phase 7 canon repair cannot silently erase load-bearing memorability; Phase 8/9 must expose anti-flattening tradeoffs.

Direct answers:

* **Can the system still produce valid-but-dull cards?** Yes. The deterministic schema can ensure engine fields exist, but the NCP body validator will currently allow hollow bodies. The LLM critic is supposed to catch dullness, but tests do not prove it.  
* **Can `deepen-character-proposal` still become a polish pass?** Less likely by doctrine, but still possible if the model ignores the mutation/rejection instructions. Deterministic checks catch rejected-direction count, not radicalization quality.  
* **Can `character-generation` still flatten a strong NCP?** Yes, in principle. The docs forbid it, but deterministic validators do not compare source NCP memorability to output CHAR `dramatic_core`.  
* **Are critic passes strong enough?** The written critic passes are strong. Test-backed enforcement is weaker.  
* **Are anti-flattening tests adequate?** No. They are better as acceptance prose, but not enough as regression tests.

---

## **8. Test Realism Audit**

### **Schema tests**

Schema tests are much stronger than before. They cover batch NCP success/failure, missing `batch_id`, upgraded omission of `batch_id`, critic trace shape, missing memorability profile, canon-requiring without facts, and NCB `card_ids`.

Remaining gaps:

* Add explicit `user_seed` no-`batch_id` success test.  
* Add explicit stale `proposal_ids` NCB rejection test.  
* Consider testing real frontmatter extracted from current templates, not only hand-built objects.

### **Structural validator tests**

This is the weak spot. `character-memorability-structure.test.ts` uses simplified NCP bodies that do not include the current proposal-card body sections. It even accepts a valid proposal card with only a generic `## Proposal` body.

That is test theater for the exact bug class the audit is meant to close.

### **YAML/frontmatter tests**

The underlying YAML/frontmatter validators are appropriate, but NCP-specific tests should explicitly cover body-only and malformed-frontmatter NCPs in current paths.

### **World-index parser/build/sync tests**

Structured-edge unit coverage exists for NCP→NCB, but it uses minimal fake frontmatter/body fixtures. I did not find convincing full build/sync integration coverage using current-template-shaped `character-proposals/*.md` and `character-proposals/batches/*.md`.

### **MCP retrieval/schema/field tests**

`get_record_schema` proposal coverage is good. `list_records` proposal coverage exists, but uses simplified NCP/NCB fixtures. I did not find strong current-template-shaped `get_record(NCP)`, `get_record(NCB)`, `get_records([NCP,NCB])`, or NCP body-section projection tests.

### **Anti-flattening acceptance tests**

The acceptance prose exists; deterministic regression coverage remains weak.

### **Story blast-radius tests**

The story skills themselves are clean. I did not find explicit tests proving story context retrieval excludes/ignores NCP/NCB proposal records when accidentally supplied as seeds.

---

## **9. Story-System Blast-Radius Audit**

Story separation is mostly intact.

`branching-story-bootstrap` requires `selected_cast` as `CHAR-<integer>` ids from the world’s `characters/INDEX.md`, not NCP proposal ids. It loads a `story_bootstrap` context packet seeded by selected CHARs and world anchors; its outputs are story-bundle state records and story kernel/page-plan artifacts.

`branching-story-turn-cycle` advances story-local state from committed `PG` pages and story-local records. It consumes world canon and realized cast context, not proposal batches or character-generation internals.

The context-packet contract says story-pipeline task types populate `story_bundle_context` separately and that story-local ids are not world-scope seed authority. It also lists story task full-body candidates as canon facts, invariants, Mystery Reserve, and open questions—not NCPs/NCBs.

Remaining blast-radius risk is narrow: NCP/NCB are world-scope indexed nodes, so a story-pipeline packet could include them if an operator mistakenly supplies them as seed nodes. The current story skills do not do that, and profiles do not prioritize them, so this is not a current breakage. Still, add a warning/drop rule or explicit docs: **story-pipeline seed nodes must not include NCP/NCB; use realized CHAR only.**

---

## **10. Stress-Test Results**

### **Layer 1 — Fourth-Iteration Regression Stress Matrix**

| # | Case | Expected behavior / responsible surface | Current status | Needed fix |
| ----- | ----- | ----- | ----- | ----- |
| 1 | Batch NCP with valid `batch_id` | Pass schema; index NCP; edge to NCB if target exists. | Sufficient. | Add real-template test. |
| 2 | Batch NCP missing `batch_id` | Reject. Schema. | Closed. | None. |
| 3 | Upgraded existing-NCP without `batch_id` | Pass. Schema. | Closed. | None. |
| 4 | User-seed upgraded NCP without `batch_id` | Pass. Schema. | Mostly closed. | Add explicit test. |
| 5 | NCB manifest using `card_ids` | Pass. Schema/index. | Closed. | None. |
| 6 | NCB using stale `proposal_ids` | Reject. Schema. | Likely closed. | Add explicit test. |
| 7 | NCP with batch critic trace | Pass only batch-generated shape. | Closed. | None. |
| 8 | NCP with upgraded critic trace | Pass only upgraded/user-seed shape. | Closed. | None. |
| 9 | Upgraded/user-seed string rejected-directions audit | Reject. Schema conditional. | Closed. | Improve message. |
| 10 | Upgraded/user-seed object rejected-directions audit | Pass with ≥3 objects. | Closed. | None. |
| 11 | Fewer than three rejected directions | Reject. Schema + structural. | Closed. | None. |
| 12 | NCP frontmatter-only | Reject missing body sections. | **Open.** | Add body-section validator. |
| 13 | NCP body-only | Reject missing frontmatter. | Mostly closed. | Add explicit NCP test. |
| 14 | NCP malformed frontmatter | Reject with parse detail. | Closed. | None. |
| 15 | NCP missing `Niche Analysis` | Reject. | **Open.** | Add body-section validator. |
| 16 | NCP missing `Canon Safety Check Trace` | Reject. | **Open.** | Add body-section validator. |
| 17 | Upgraded/user-seed missing `Seed Essence` | Reject. | **Open.** | Add upgraded body-section validator. |
| 18 | Upgraded/user-seed missing `Upgrade Diagnosis` | Reject. | **Open.** | Add upgraded body-section validator. |
| 19 | Canon-requiring NCP with no implied facts | Reject. | Closed. | Improve message. |
| 20 | NCP/NCB `get_record` | Support hybrid record. | Implemented. | Add tests. |
| 21 | NCP/NCB `get_records` | Batch per-id support. | Implemented. | Add tests. |
| 22 | NCP `get_record` body-section projection | `body.Niche Analysis` works if section exists. | Implemented. | Add tests with real sections. |
| 23 | NCP/NCB `get_record_field` | Either support or clear rejection. | Clear-ish unsupported path. | Improve error/test. |
| 24 | NCP/NCB `list_records` | Supported. | Closed, but simplified tests. | Real-template fixtures. |
| 25 | NCP/NCB `get_record_schema` | Supported. | Closed and tested. | None. |
| 26 | NCP/NCB world-index build/sync | Enumerate/index real files. | Implemented, weak tests. | Add full build/sync integration. |
| 27 | NCP→NCB structured edge | Edge from `batch_id`. | Closed in adapter/unit test. | Add real fixture. |
| 28 | NCP scoped references | Proposal provenance. | Implemented. | Add test. |
| 29 | NCP→CHAR anti-flattening | Preserve memorability. | Doctrine strong, tests weak. | Add acceptance/regression fixture. |
| 30 | Story retrieval accidentally pulling proposals | Should not happen in normal story flows. | Mostly closed. | Add story seed guard/warning. |

### **Layer 2 — Character-Quality Stress Seeds**

| Seed | What system should do | Deterministic check | LLM critic role | Current sufficiency |
| ----- | ----- | ----- | ----- | ----- |
| Bland canon-safe occupational seed | Mutate into pressure-specific protagonist-grade NCP. | Required engine fields. | Reject dull/swappable outcome. | Doctrine good; tests weak. |
| Strong uncomfortable moral/psychological edge | Preserve if world-valid; route canon if needed. | Canon flags/facts shape. | Judge gratuitousness vs engine value. | Good. |
| Canon-requiring worthwhile seed | Surface brilliance; do not silently canonize. | `implied_new_facts[]` non-empty. | Judge whether fact is worth routing. | Good. |
| Erotic/status/social transgression | Allow if grounded and non-gratuitous. | Structure/canon routing only. | Judge world-validity and pressure value. | Good doctrine. |
| Mystery Reserve risk | Avoid cheap answer; preserve epistemic firewall. | Canon safety and implied facts shape. | Identify mystery contamination. | Body trace not enforced. |
| Specialness-inflation risk | Reject chosen-one/global exception unless grounded. | Limited deterministic coverage. | Main critic burden. | Doctrine good. |
| Ordinary surface needing protagonist force | Deepen through relation, voice, pressure. | Engine fields present. | Ensure non-generic transformation. | Doctrine good; validators permissive. |
| Duplicate existing niche | Use registry/niche analysis to reject or differentiate. | Could require `Niche Analysis` section. | Judge real duplication. | **Currently weak because body section not enforced.** |
| Strong NCP flattened by generation | Preserve load-bearing memorability into CHAR. | Provenance + dramatic_core shape. | Compare source vs output. | Partially sufficient. |
| Secondary character | Still protagonist-grade, not background texture. | Required fields. | Judge force/non-swappability. | Good doctrine; tests limited. |

---

## **11. Remaining Gaps and Proposed Changes**

### **Critical**

None. The system does not need another conceptual redesign.

### **High**

#### **1. NCP body-section validation remains open**

Affected files:

* `tools/validators/src/structural/character-memorability-structure.ts`  
* `tools/validators/tests/structural/character-memorability-structure.test.ts`

Why it matters:

This is the core closure failure. The current template requires body sections that make NCPs material, institutional, epistemic, pressured, distinct, canon-routed, and non-duplicative. The validator does not enforce them. A frontmatter-perfect but body-hollow NCP can still pass.

Proposed fix:

Add deterministic heading/empty-section validation for:

Batch-generated NCPs:

* `Material Reality`  
* `Institutional Embedding`  
* `Epistemic Position`  
* `Goals and Pressures`  
* `Capabilities`  
* `Voice and Perception`  
* `Contradictions and Tensions`  
* `Likely Story Hooks`  
* `Niche Analysis`  
* `Canon Safety Check Trace`

Upgraded/user-seed NCPs:

* `Seed Essence`  
* `Upgrade Diagnosis`  
* `Material Reality`  
* `Institutional Embedding`  
* `Epistemic Position`  
* `Goals and Pressures`  
* `Capabilities`  
* `Voice and Perception`  
* `Contradictions and Tensions`  
* `Niche Analysis`  
* `Canon Routing`  
* `Rejected Directions Audit`  
* `Canon Safety Check Trace`

Acceptance criteria:

* frontmatter-only NCP fails;  
* missing section fails with exact section name;  
* present-but-empty section fails differently from missing;  
* current batch template passes;  
* current upgraded template passes;  
* no prose-quality judgment is attempted.

#### **2. Simplified NCP fixtures still mask real-template failures**

Affected files:

* `tools/validators/tests/structural/character-memorability-structure.test.ts`  
* `tools/world-mcp/tests/tools/list-records.test.ts`  
* world-index structured/build tests

Why it matters:

Tests using `## Proposal` or `## Character Seed` prove only parser plumbing. They do not prove current template compliance.

Proposed fix:

Use real-template-shaped NCP/NCB fixtures in structural, MCP, and world-index tests.

#### **3. NCP→CHAR anti-flattening remains mostly LLM-only**

Affected files:

* `.claude/skills/character-generation/references/phase-0-normalize-brief.md`  
* `.claude/skills/character-generation/references/phases-1-6-character-construction.md`  
* `.claude/skills/character-generation/references/phase-8-validation-tests.md`  
* relevant acceptance tests if present/new

Why it matters:

A strong NCP can still become a safer/duller CHAR if the model ignores the anti-flattening doctrine.

Proposed fix:

Add an acceptance fixture: a strong uncomfortable NCP with load-bearing `memorability_profile`, then a deliberately flattened CHAR candidate that should fail acceptance because it erases specific pressure behavior, voice, moral edge, or relational charge.

Deterministic validation possibility:

Require `source_basis.source_proposal_id` format when a generated CHAR declares NCP source. Full flattening judgment remains LLM critic responsibility.

### **Medium**

#### **4. `get_record_field` hybrid error guidance is not actionable enough**

Affected files:

* `tools/world-mcp/src/tools/get-record-field.ts`  
* `tools/world-mcp/src/tools/get-records-field.ts`

Proposed fix:

When record id is `CHAR`, `DA`, `PA`, `NCP`, or `NCB`, return an error saying hybrid records are projected through `get_record(section_path='frontmatter.<field>')` or `get_record(section_path='body.<section>')`.

#### **5. Story-pipeline NCP/NCB seed loophole**

Affected files:

* `tools/world-mcp/src/tools/get-context-packet.ts`  
* `docs/CONTEXT-PACKET-CONTRACT.md`  
* story skills only if docs need a one-line warning

Proposed fix:

Either reject/warn/drop NCP/NCB seed nodes for story-pipeline task types, or explicitly document that story tasks must seed realized `CHAR` ids only.

#### **6. Schema/template small drift**

Affected files:

* `tools/validators/src/schemas/character-proposal-card.schema.json`  
* proposal templates

Proposed fix:

Decide whether `occupancy_strength`, `score_aggregate`, and `source_basis.batch_id` should be required for batch-generated cards. If they are load-bearing, require them. If advisory, leave optional but document that status.

### **Low**

* Add explicit `user_seed` no-`batch_id` schema success test.  
* Add explicit stale `proposal_ids` NCB schema failure test.  
* Improve Ajv-facing operator messages for `batch_id`, rejected directions, and canon-route fields.  
* Consider `card_ids.minItems: 1` if an empty NCB is never valid.

---

## **12. Candidate File Edits / Replacement Sections**

### **A. Structural validator requirements for NCP body sections**

Add a section parser and required-section check to `tools/validators/src/structural/character-memorability-structure.ts`.

Coherent implementation requirements:

const BATCH_NCP_REQUIRED_BODY_SECTIONS = [  
 "Material Reality",  
 "Institutional Embedding",  
 "Epistemic Position",  
 "Goals and Pressures",  
 "Capabilities",  
 "Voice and Perception",  
 "Contradictions and Tensions",  
 "Likely Story Hooks",  
 "Niche Analysis",  
 "Canon Safety Check Trace"  
] as const;

const UPGRADED_NCP_REQUIRED_BODY_SECTIONS = [  
 "Seed Essence",  
 "Upgrade Diagnosis",  
 "Material Reality",  
 "Institutional Embedding",  
 "Epistemic Position",  
 "Goals and Pressures",  
 "Capabilities",  
 "Voice and Perception",  
 "Contradictions and Tensions",  
 "Niche Analysis",  
 "Canon Routing",  
 "Rejected Directions Audit",  
 "Canon Safety Check Trace"  
] as const;

Validation behavior:

function validateRequiredProposalBodySections(args: {  
 nodeId: string;  
 filePath: string;  
 body: string;  
 sections: readonly string[];  
}): Finding[] {  
 // Parse level-2 Markdown headings exactly:  
 // /^##s+(.+?)s*$/gm  
 // Capture content until next /^##s+/m or EOF.  
 //  
 // For each required section:  
 // - if heading absent:  
 //   code: "missing_proposal_body_section"  
 //   message: `${filePath} (${nodeId}) is missing required NCP body section '## ${section}'.`  
 // - if heading present but captured content trims to empty:  
 //   code: "empty_proposal_body_section"  
 //   message: `${filePath} (${nodeId}) has required NCP body section '## ${section}' but it is empty.`  
}

Routing:

const originKind = frontmatter.upgrade_lineage?.origin_kind;  
const isUpgradedOrUserSeed =  
 originKind === "upgraded_seed" || originKind === "user_seed";

validateRequiredProposalBodySections({  
 nodeId,  
 filePath,  
 body,  
 sections: isUpgradedOrUserSeed  
   ? UPGRADED_NCP_REQUIRED_BODY_SECTIONS  
   : BATCH_NCP_REQUIRED_BODY_SECTIONS  
});

This should not judge prose quality. It should only enforce that the structural surfaces exist and are non-empty.

### **B. Structural validator test replacements**

Replace the simplified `validProposalCard()` body with two realistic helpers:

* `validBatchProposalCardBody()` matching `.claude/skills/propose-new-characters/templates/proposal-card.md`;  
* `validUpgradedProposalCardBody()` matching `.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md`.

Add tests:

test("rejects frontmatter-only NCP cards", ...);  
test("rejects batch NCP missing Niche Analysis", ...);  
test("rejects batch NCP with empty Canon Safety Check Trace", ...);  
test("rejects upgraded NCP missing Seed Essence", ...);  
test("rejects upgraded NCP missing Upgrade Diagnosis", ...);  
test("accepts upgraded user-seed NCP without batch_id when required body sections are present", ...);

### **C. MCP/index fixture upgrade**

Add current-template-shaped fixtures for:

* `NCP-0001.md`  
* `NCB-0001.md`

Then assert:

get_record({ record_id: "NCP-0001", section_path: "frontmatter.memorability_profile" });  
get_record({ record_id: "NCP-0001", section_path: "body.Niche Analysis" });  
get_record({ record_id: "NCP-0001", section_path: "body.Canon Safety Check Trace" });  
get_records({ record_ids: ["NCP-0001", "NCB-0001"] });  
list_records({ record_type: "character_proposal_card", include_full_body: true });  
list_records({ record_type: "character_proposal_batch", include_full_body: true });

### **D. Story seed guard**

Either document or implement:

const STORY_PIPELINE_AUTHORING_PROPOSAL_SEED_PATTERN =  
 /^(?:NCP|NCB)-d+$/;

For story-pipeline `get_context_packet`, warn/drop those seeds:

"authoring_proposal_seed_nodes_ignored"

This preserves the clean separation: proposal records are authoring surfaces, not story cast.

---

## **13. Final Recommendation**

Run **one more implementation pass**, not another major audit.

Fix first:

1. NCP body-section structural validation.  
2. Real-template-shaped structural/MCP/world-index tests.  
3. Hybrid field-projection error guidance.  
4. Story-pipeline NCP/NCB seed guard.  
5. Anti-flattening acceptance fixture.

A further major audit is likely unnecessary after those changes. “Done” should mean:

* frontmatter-only NCPs fail;  
* body-only/malformed-frontmatter NCPs fail with useful messages;  
* missing/empty required NCP body sections fail deterministically;  
* upgraded/user-seed cards require `Seed Essence`, `Upgrade Diagnosis`, `Rejected Directions Audit`, and at least three object-shaped rejected directions;  
* batch NCPs require `batch_id`;  
* NCBs use `card_ids`;  
* NCP→NCB edges survive realistic index build/sync;  
* MCP retrieval/schema/list behavior works with real current template shapes;  
* story consumers continue to see realized CHAR records, not proposal records;  
* NCP→CHAR generation preserves load-bearing memorability or explicitly reports a canon-required repair.

The system is close. It is not finished yet.



---

## Outcome

Archived on 2026-05-22 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
