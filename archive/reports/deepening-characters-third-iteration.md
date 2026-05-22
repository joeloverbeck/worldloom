**Status**: COMPLETED

## **1. Final Verdict**

**NEEDS ONE MORE IMPLEMENTATION PASS**

The second-iteration fixes closed the major **schema/MCP/index retrieval** regressions, but they did **not** close the character system enough to call it finished. The remaining problems are implementation/test gaps, not conceptual redesign problems.

Highest-value remaining changes:

1. Add deterministic **NCP markdown/body-structure validation** for required proposal sections, frontmatter presence, malformed frontmatter, upgraded/user-seed sections, and non-empty body sections.  
2. Require `batch_id` for batch-generated NCP cards, while preserving omission for upgraded/user-seed single-seed cards.  
3. Add `get_record_schema` support for `character_proposal_card` and `character_proposal_batch`.  
4. Replace simplified MCP/schema test fixtures with real-template-shape fixtures for NCP/NCB.  
5. Add anti-flattening acceptance tests for NCP → CHAR preservation.

No further major audit is warranted after those fixes land, unless the implementation pass reveals unexpected architectural problems.

---

## **2. Current Architecture Snapshot**

Worldloom’s project authority remains `docs/FOUNDATIONS.md`, which centers locality, concrete canon state, non-silent retcon discipline, Mystery Reserve boundaries, material/institutional grounding, and clean separation between world canon and story-local state. The character system’s current doctrine correctly extends that constitution: the shared protagonist-grade engine defines `memorability_profile` for NCP cards and `dramatic_core` for CHAR dossiers, and it requires byte-for-byte field alignment across doctrine, templates, schemas, validators, and skill prose.

`propose-new-characters` is now a protagonist-grade NCP/NCB proposal system, not a disposable-NPC generator. It writes NCP cards under `character-proposals/`, NCB manifests under `character-proposals/batches/`, blocks canon mutation, and tells the skill to produce proposal cards with NCP body sections plus `Niche Analysis` and `Canon Safety Check Trace`. The batch NCP template carries the full character-generation compatibility frontmatter, `memorability_profile`, batch-shaped `critic_pass_trace`, optional `upgrade_lineage`, and required proposal body sections. The NCB manifest template uses `batch_id`, `card_ids`, registry summary, dropped cards, and Phase 15 test reporting.

`deepen-character-proposal` is correctly framed as a single-seed radicalizer, not a batch generator and not a realization skill. It reuses the `propose_new_characters` context profile, omits `batch_id` for single-seed upgrades, requires `upgrade_lineage.origin_kind` of `upgraded_seed` or `user_seed`, requires mutation spread and rejected directions, and writes exactly one NCP. Its upgraded-card template now has the intended upgraded trace fields: `seed_essence_extractor`, `world_pressure_mapper`, `blandness_executioner`, and `protagonist_grade_critic`, plus object-shaped rejected-direction audit entries.

`character-generation` now treats NCPs as high-pressure briefs, not loose prompts. Phase 0 parses NCP `memorability_profile` into an `input_memorability_contract`; Phase 4b maps it into CHAR `dramatic_core`; Phase 7 repair is not supposed to erase load-bearing memorability; and Phase 8/9 surface anti-flattening tradeoffs. The CHAR dossier template has the expected `dramatic_core` frontmatter and protagonist-grade body sections.

Schemas are mostly in place. `character-proposal-card.schema.json` defines the canonical NCP `memorability_profile`, accepts both batch and upgraded critic trace shapes, requires object-shaped rejected directions for upgraded/user-seed cards, and enforces `implied_new_facts` for canon-requiring cards. `character-frontmatter.schema.json` defines CHAR `dramatic_core`; `character-proposal-batch.schema.json` defines NCB manifest frontmatter.

Validators are only partially in place. `record_schema_compliance` recognizes NCP/NCB hybrid markdown files and applies the right JSON schemas. `character_memorability_structure` validates CHAR body sections, CHAR `dramatic_core` structural minima, NCP rejected-directions requirements for upgraded/user-seed cards, canon-requiring NCP facts, and placeholder text. It does **not** validate the full NCP body-section contract.

World-index and MCP are mostly aligned. The prose indexer recognizes `character-proposals/*.md` as `character_proposal_card`, `character-proposals/batches/*.md` as `character_proposal_batch`, and prefers canonical NCP/NCB frontmatter ids. Node types include both NCP and NCB classes. Scoped references support NCP cards, and structured edges support NCP `batch_id` → NCB `batch_id`. MCP `get_record` and `list_records` now expose NCP/NCB as hybrid records.

Story consumers remain downstream CHAR consumers. `branching-story-bootstrap` requires `selected_cast` as `CHAR-<integer>` ids and verifies them against existing CHAR dossiers; it does not consume NCPs/NCBs or character-generation internals. Story context profiles prioritize `character_record`, not proposal records, which preserves the boundary.

---

## **3. Regression Closure Findings**

| Known bug/gap | Status | Finding |
| ----- | ----- | ----- |
| Upgraded single-seed NCP cards did not match schema | **Closed** | Schema accepts upgraded/user-seed trace shape and omission of `batch_id`; tests cover upgraded cards without `batch_id`. |
| Upgraded `critic_pass_trace` drift | **Closed** | Schema has separate batch and upgrade trace definitions, and tests reject swapped trace shapes. |
| `upgrade_lineage.rejected_directions_audit` drift | **Mostly closed** | Upgraded/user-seed cards require object entries and at least three items. Batch-generated cards may still use string arrays, which is acceptable if intentional. |
| Single-seed upgraded NCPs needed `batch_id` omission support | **Closed** | Deepening skill and upgraded template omit `batch_id`; schema permits that. |
| Batch NCP cards should include `batch_id` | **Still open** | Schema allows `batch_id` but does not require it for batch-generated cards. That can silently remove the NCP→NCB structured edge. |
| NCP/NCB MCP `get_record` / `list_records` | **Closed** | `get_record` accepts NCP/NCB ids, parses frontmatter/body sections, and supports section projection; `list_records` supports both record types and full-body hybrid output. |
| NCP/NCB world-index recognition | **Closed** | Indexer, node types, scoped refs, and structured edges are wired. Tests cover canonical IDs and NCP→NCB edges. |
| NCP body-section validation | **Still open** | Current structural validator does not require `Niche Analysis`, `Canon Safety Check Trace`, base NCP body sections, `Seed Essence`, or `Upgrade Diagnosis`. Frontmatter-only NCPs can pass if frontmatter validates. Body-only/malformed-frontmatter NCPs can be skipped. |
| NCP→CHAR anti-flattening | **Partially closed** | Skill doctrine is strong, but deterministic tests/acceptance fixtures do not prove a strong NCP cannot become a safer/duller CHAR. |
| Field-name byte-for-byte alignment | **Mostly closed** | Core protagonist-grade names align. There are test/doc drifts around batch `card_ids` vs MCP fixture `proposal_ids`, `source_basis.generated_from` vs `source_proposal_id`, and prose-only acceptance names like `institutional_embedding_checklist`. |

---

## **4. Alignment and Drift Audit**

### **Field-name alignment**

Core protagonist-grade fields are byte-for-byte aligned across shared doctrine, NCP `memorability_profile`, upgraded NCP `memorability_profile`, CHAR `dramatic_core`, proposal schema, character schema, and tests:

| Field | Shared doctrine | NCP | Upgraded NCP | CHAR | Schema/tests |
| ----- | ----- | ----- | ----- | ----- | ----- |
| `world_produced_wound` | yes | yes | yes | yes | yes |
| `active_appetite` | yes | yes | yes | yes | yes |
| `self_mythology` | yes | yes | yes | yes | yes |
| `irreconcilable_contradiction` | yes | yes | yes | yes | yes |
| `pressure_behavior` | yes | yes | yes | yes | yes |
| `relational_charge` | yes | yes | yes | yes | yes |
| `moral_psychological_edge` | yes | yes | yes | yes | yes |
| `signature_scene_behaviors` | yes | yes | yes | yes | yes |
| `voice_under_pressure` | yes | yes | yes | yes | yes |
| `cannot_be_swapped_out_because` | yes | yes | yes | yes | yes |

The NCP-only `seed_essence_preserved` is correctly present in `memorability_profile` but absent from CHAR `dramatic_core`; CHAR is supposed to preserve the essence through `dramatic_core`, not copy that field directly.

Subfields are also aligned: `pressure_behavior` uses `cornered`, `tempted`, `humiliated`, `offered_power`, and `protecting_attachment`; `voice_under_pressure` uses `lying`, `begging`, `threatening`, and `grieving_or_hiding_ignorance`.

### **Drift findings**

There are five concrete drifts:

1. **Batch `batch_id` is optional in schema but operationally required for batch cards.** The template and structured-edge design expect it; schema does not require it for batch-generated cards.  
2. **NCB fixture drift: `proposal_ids` vs `card_ids`.** The NCB template/schema use `card_ids`; MCP tests seed NCB frontmatter with `proposal_ids`. The MCP test proves parsing, but not current manifest-schema fidelity.  
3. **CHAR provenance drift in tests: `generated_from` vs `source_proposal_id`.** The character schema fixture accepts `source_basis: { generated_from: "NCP-12" }`, while the structural validator only checks `source_basis.source_proposal_id` format when present. The skill expects `source_proposal_id`.  
4. **Proposal Phase 15 names pseudo-fields that are not fields.** `institutional_embedding_checklist` and `repeated_forced_choice` appear as acceptance-test concepts, but not as schema/template frontmatter fields. They should be renamed as body-section assertions or made actual fields; right now the wording invites false byte-for-byte expectations.  
5. **MCP schema retrieval omits NCP/NCB.** `get_record_schema` supports `character_record` but not `character_proposal_card` or `character_proposal_batch`, even though validators have schemas for both and MCP retrieves both.

---

## **5. Character-Quality Audit**

The doctrine is good. It is not timid, not comfort-polished, and not story-contaminated. It explicitly permits harsh, abrasive, humiliating, morally compromised, sexually/socially strange, or otherwise uncomfortable cores when those cores are world-valid and canon-routed. The protagonist-grade engine’s required fields are the right ones: wound, appetite, self-myth, contradiction, pressure behavior, relational charge, moral/psychological edge, signature scene behavior, pressure voice, and cannot-swap reason.

**Can the system still produce valid-but-dull cards?** Yes. A valid-but-dull card can still satisfy schema if the LLM writes non-empty but shallow strings. That is not fully solvable deterministically without turning the validator into a bad literary judge. The right fix is not “score prose quality in TypeScript”; it is to strengthen acceptance fixtures and critic trace expectations.

**Can `deepen-character-proposal` still become a polish pass?** It is much harder than before, but still possible. The skill demands 5–8 mutations, rejected directions, strongest-not-safest selection, and explicit canon routing. However, deterministic validation only checks existence/count of rejected directions, not whether the mutations were genuinely divergent or radical.

**Can `character-generation` still flatten a strong NCP?** Yes, if the model ignores the anti-flattening instructions. The skill docs are strong: Phase 0 captures an `input_memorability_contract`, Phase 4b maps NCP fields into `dramatic_core`, and Phase 8 has explicit anti-flattening tests. But there is no deterministic or fixture-based regression test showing “strong NCP in, safer/duller CHAR rejected.”

**Are critic passes strong enough?** In doctrine, yes. In machine enforcement, only partially. The schema accepts any non-empty critic string; it does not require the rationale to name concrete world pressure, scene behavior, cannot-swap reason, and rejected weaker alternative. That is acceptable as an LLM-only quality judgment, but current tests are not strong enough to prevent a shallow `PASS: seems distinctive` rationale from slipping through.

---

## **6. Retrieval / MCP / World-Index Audit**

NCP/NCB retrieval is now first-class enough for the main workflows.

`get_record(NCP-<integer>)` and `get_record(NCB-<integer>)` are accepted as hybrid records. The parser returns `frontmatter`, `body_sections`, `content_hash`, and `file_path`, and section projection supports `frontmatter`, `body`, `frontmatter.<key>`, and `body.<section heading>`. Invalid record-id messages now list NCP/NCB support.

`list_records(record_type='character_proposal_card')` and `list_records(record_type='character_proposal_batch')` are accepted. Compact listing returns hybrid metadata; `include_full_body=true` returns parsed frontmatter and body sections. Tests cover both proposal hybrid types.

World-index and MCP agree on the main names:

| Surface | NCP | NCB |
| ----- | ----- | ----- |
| Canonical id | `NCP-<integer>` | `NCB-<integer>` |
| File path | `character-proposals/*.md` | `character-proposals/batches/*.md` |
| Index node type | `character_proposal_card` | `character_proposal_batch` |
| MCP hybrid kind | `character_proposal_card` | `character_proposal_batch` |
| Body projection | MCP hybrid parser | MCP hybrid parser |
| Scoped refs | yes for NCP | not needed |
| Structured edge | `batch_id` → NCB | target |

The NCP→NCB structured edge is implemented and tested.

The one retrieval gap is `get_record_schema`: it does not expose `character_proposal_card` or `character_proposal_batch`, despite those schemas existing and despite `list_records` error guidance suggesting schema consultation.

The ranking profile situation is acceptable. `deepen-character-proposal` should continue reusing `propose_new_characters`; no dedicated profile is justified. The profile already prioritizes existing characters, canon, invariants, Mystery Reserve, artifacts, adjudications, and names; deepening also uses direct `list_records` registry retrieval, so a separate profile would be premature.

---

## **7. Validator and Test Audit**

### **Schema validation**

Good coverage:

* Batch NCP schema success.  
* Upgraded NCP schema success without `batch_id`.  
* Upgraded NCP rejects fewer than three rejected directions.  
* Upgraded NCP rejects batch critic trace.  
* Batch NCP rejects upgrade critic trace.  
* Missing `memorability_profile` rejected.  
* Canon-requiring NCP without `implied_new_facts` rejected.  
* NCB schema success.  
* CHAR schema success and missing `dramatic_core` failure.  
* CHAR signature behavior min-items failure.

Weakness: schema tests use in-memory simplified objects, not parsed real markdown templates. They are valuable unit tests, but they do not prove the actual templates validate end-to-end.

### **Structural validation**

Good coverage:

* CHAR missing body headings.  
* CHAR weak behavior lists.  
* malformed CHAR `source_proposal_id`.  
* upgraded/user-seed NCP rejected directions audit.  
* canon-requiring NCP without implied facts.  
* placeholder text.  
* placeholder absence statement exception.

Major missing coverage:

* NCP frontmatter-only file should fail.  
* NCP body-only file should fail.  
* malformed NCP frontmatter should fail instead of being skipped.  
* missing `Niche Analysis` should fail.  
* missing `Canon Safety Check Trace` should fail.  
* upgraded/user-seed missing `Seed Essence` should fail.  
* upgraded/user-seed missing `Upgrade Diagnosis` should fail.  
* batch NCP without `batch_id` should fail.  
* NCB real-template shape should validate with `card_ids`, not `proposal_ids`.

### **MCP/index tests**

Good coverage:

* `get_record` returns NCP frontmatter/body sections and section projection.  
* `get_record` returns NCB frontmatter/body sections.  
* `list_records` returns compact metadata for NCP/NCB.  
* `list_records(include_full_body=true)` covers NCP/NCB.  
* whole-file index prefers NCP/NCB frontmatter ids.  
* structured edge extraction emits NCP→NCB `references_record`.

Weakness: MCP NCB fixtures use `proposal_ids`, not the current `card_ids` manifest schema. That means retrieval tests prove generic hybrid parsing, not current NCB fidelity.

### **Anti-flattening acceptance tests**

Still missing. Current skill docs are good; tests do not yet lock the behavior. This is the main remaining quality-regression risk.

### **LLM critic responsibilities**

Correct boundary: deterministic validators should enforce presence, shape, routing, and useful failure messages. They should not grade literary greatness. Blandness, memorability, discomfort validity, and radicalization quality remain LLM critic responsibilities.

---

## **8. Story-System Blast-Radius Audit**

No story-system rewrite is needed.

The story system consumes realized CHAR dossiers. `branching-story-bootstrap` requires `selected_cast` as existing `CHAR-<integer>` ids and verifies those ids before bundle creation. It does not consume NCPs, NCBs, proposal batches, or character-generation internals.

Story retrieval profiles continue to prioritize canon, invariants, Mystery Reserve, named entities, sections, and `character_record`; they do not make NCP/NCB part of story runtime state.

The current character fields are not story-specific by accident. `dramatic_core` is world-character state; it is not an act structure, plot destiny, branch obligation, or storylet hook.

---

## **9. Stress-Test Results**

### **Layer 1 — Bug-regression stress matrix**

| Case | Expected behavior / responsible surface | Current result | Needed fix |
| ----- | ----- | ----- | ----- |
| 1. Batch NCP card | Schema accepts only real batch shape; structural validator checks required body sections | Frontmatter mostly covered; body sections not covered | Add NCP body validator |
| 2. Upgraded existing-NCP card | No `batch_id`; upgraded trace; object rejected-directions ≥3 | Schema closed; body validation incomplete | Add upgraded body-section checks |
| 3. User-seed upgraded NCP card | Same as upgraded, `origin_kind: user_seed` | Schema closed; body validation incomplete | Same |
| 4. NCB manifest | Schema validates manifest; MCP retrieves | Schema exists; MCP tests use `proposal_ids`, not `card_ids` | Update MCP fixtures to real NCB schema |
| 5. NCP with `batch_id` | Batch NCP should link to NCB | Edge works if `batch_id` exists | Require `batch_id` for batch cards |
| 6. NCP without `batch_id` | Allowed only for upgraded/user-seed | Currently also allowed for batch | Add schema conditional |
| 7. NCP with batch critic trace | Accepted for batch-generated | Closed | None |
| 8. NCP with upgraded critic trace | Accepted only for upgraded/user-seed | Closed | None |
| 9. String rejected-directions audit | Allowed only for batch-generated if kept | Currently allowed generally but narrowed by upgraded conditional | Accept or explicitly restrict to batch |
| 10. Object rejected-directions audit | Required for upgraded/user-seed | Closed | None |
| 11. NCP frontmatter-only file | Should fail missing body sections | Likely passes if frontmatter valid | Add structural body checks |
| 12. NCP body-only / malformed frontmatter | Should fail missing/malformed frontmatter | Can be skipped by current validators | Add frontmatter presence/parse verdict |
| 13. Canon-requiring NCP no facts | Should fail | Closed in schema and structural validator | None |
| 14. NCP/NCB `get_record` | Should retrieve hybrid body | Closed | None |
| 15. NCP/NCB `list_records` | Should list and full-body retrieve | Closed | None |
| 16. NCP→NCB structured edge | Should emit `references_record` | Closed if `batch_id` exists | Require batch `batch_id` |
| 17. NCP→CHAR anti-flattening | Should preserve `memorability_profile` into `dramatic_core` or name tradeoff | Skill docs strong; tests missing | Add acceptance fixture/test |

### **Layer 2 — Character-quality stress seeds**

| Seed | System should do | Deterministic check | LLM critic must judge | Current sufficiency |
| ----- | ----- | ----- | ----- | ----- |
| Bland canon-safe occupational seed | Reject or mutate until pressure-specific and cannot-swap | Required fields, no placeholders | Blandness, non-swappability | Partially sufficient; shallow PASS still easy |
| Uncomfortable moral/psychological edge | Keep if world-valid and non-gratuitous | Canon routing, no prohibited story fields | Whether edge is earned | Sufficient in doctrine |
| Canon-requiring worthwhile seed | Surface brilliance, route implied facts, do not silently canonize | `canon-requiring` requires `implied_new_facts` | Whether canon work is worthwhile | Good |
| Erotic/status/social transgression | Allow if world-valid, grounded, not gratuitous | Canon flags and body structure only | Taste, world validity, non-gratuity | Doctrine good; validator neutral |
| Mystery Reserve risk | Firewall and avoid cheap answers | `mystery_reserve_firewall` field presence | Whether the proposal leaks protected unknowns | Good retrieval; critic-dependent |
| Specialness inflation risk | Reject unique powers/status without distribution grounding | Canon facts / implied facts shape | Whether uniqueness is justified | Partially sufficient |
| Ordinary surface needing pressure | Mutate through institution, relation, appetite, voice | Required fields | Whether ordinary becomes protagonist-grade | Doctrine good; tests weak |
| Duplicate CHAR/NCP niche | Detect overlap and decisive difference | Registry/list_records support | Niche distinctiveness | Retrieval good; deterministic duplicate test absent |
| Strong NCP flattened by CHAR | Preserve or explicitly repair tradeoff | Source id and dramatic_core fields | Whether preservation is real | Still weak in tests |
| Secondary character | Must still be protagonist-grade, not disposable texture | `depth_class`, required fields | Whether they feel self-protagonizing | Doctrine good; shallow schema can pass dullness |

---

## **10. Remaining Gaps and Proposed Changes**

### **Critical**

None. There is no conceptual or architectural flaw requiring another major audit.

### **High**

**Gap: NCP body-section validation is still too thin.**

Affected files:

* `tools/validators/src/structural/character-memorability-structure.ts`  
* `tools/validators/src/structural/yaml-parse-integrity.ts`  
* `tools/validators/src/structural/record-schema-compliance.ts`  
* `tools/validators/tests/structural/character-memorability-structure.test.ts`

Why it matters: This was a known second-iteration gap and remains open. The system can accept an NCP that is valid frontmatter plus no meaningful body, which undermines the proposal-to-character pipeline.

Proposed fix: Extend structural validation to require NCP frontmatter presence, parseable frontmatter, core NCP body sections, non-empty section content, upgraded/user-seed `Seed Essence`, `Upgrade Diagnosis`, and `Rejected Directions Audit`.

Deterministic validation possibility: High. This is structural, not literary.

LLM critic role: Judge whether the sections are good, surprising, non-generic, and world-valid.

Acceptance criteria:

* Frontmatter-only NCP fails.  
* Body-only NCP fails.  
* Malformed-frontmatter NCP fails.  
* Missing `Niche Analysis` fails.  
* Missing `Canon Safety Check Trace` fails.  
* Upgraded/user-seed missing `Seed Essence` fails.  
* Upgraded/user-seed missing `Upgrade Diagnosis` fails.  
* Empty required sections fail.  
* Placeholder text still fails.

### **High**

**Gap: batch-generated NCPs can omit `batch_id`.**

Affected files:

* `tools/validators/src/schemas/character-proposal-card.schema.json`  
* `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts`

Why it matters: NCP→NCB structured edges depend on `batch_id`. If a batch card omits it, the proposal still validates but loses batch lineage.

Proposed fix: Add schema conditional requiring `batch_id` when `upgrade_lineage` is absent or `origin_kind: batch_generated`.

Deterministic validation possibility: High.

LLM critic role: None.

Acceptance criteria:

* Batch NCP without `batch_id` fails.  
* Upgraded/user-seed NCP without `batch_id` passes.  
* Upgraded/user-seed NCP with `batch_id` may either pass or fail depending on desired strictness; I would allow it only if there is a real lineage reason, otherwise omit.

### **Medium**

**Gap: NCP/NCB schemas are not exposed through `get_record_schema`.**

Affected files:

* `tools/world-mcp/src/tools/get-record-schema.ts`  
* `tools/world-mcp/src/server.ts`  
* `tools/world-mcp/tests/tools/get-record-schema*.test.ts` if present, or new tests

Why it matters: MCP can retrieve/list NCP/NCB, validators have schemas, but schema retrieval cannot describe them.

Proposed fix: Add `character_proposal_card` and `character_proposal_batch` to `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and map them to the existing schema files.

Deterministic validation possibility: High.

LLM critic role: None.

Acceptance criteria:

* `get_record_schema(node_type='character_proposal_card')` returns `character-proposal-card.schema.json`.  
* `get_record_schema(node_type='character_proposal_batch')` returns `character-proposal-batch.schema.json`.  
* Server capability enum includes both.

### **Medium**

**Gap: anti-flattening tests are not strong enough.**

Affected files:

* `.claude/skills/character-generation/references/phase-8-validation-tests.md`  
* `tools/validators/tests/structural/character-memorability-structure.test.ts`, if a limited structural fixture is added  
* Possibly a new acceptance fixture under tests/docs

Why it matters: The docs tell character-generation not to flatten, but there is no regression fixture demonstrating a strong NCP becoming a duller CHAR and being rejected.

Proposed fix: Add an acceptance test fixture with a strong NCP `memorability_profile` and a deliberately flattened CHAR `dramatic_core`. The deterministic part should only check trace/source wiring and obvious missing fields; the LLM-facing acceptance should require named preservation or named repair tradeoff.

Deterministic validation possibility: Medium for shape and provenance; low for artistry.

LLM critic role: High. It must judge whether the NCP’s force survived.

Acceptance criteria:

* CHAR derived from NCP must include `source_basis.source_proposal_id`.  
* Phase 8 test requires anti-flattening rationale when source proposal exists.  
* Flattened `dramatic_core` fixture is rejected by acceptance rubric, not by fake prose scoring.

### **Low**

**Gap: fixture and terminology drift.**

Affected files:

* `tools/world-mcp/tests/tools/get-record-hybrid.test.ts`  
* `tools/world-mcp/tests/tools/list-records.test.ts`  
* `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts`  
* `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md`

Why it matters: Tests are easier to trust when they use the same field names as live templates.

Proposed fix:

* Replace NCB test fixture `proposal_ids` with `card_ids`.  
* Replace CHAR schema fixture `generated_from` with `source_proposal_id` where NCP provenance is intended.  
* Rename prose-only acceptance concepts so they do not look like required schema fields.

Deterministic validation possibility: High.

LLM critic role: None.

Acceptance criteria:

* Test fixtures mirror live templates byte-for-byte for field names.  
* No acceptance-test prose names nonexistent frontmatter fields unless explicitly marked “body prose concept.”

---

## **11. Candidate File Edits / Replacement Sections**

### **11.1 `character-proposal-card.schema.json`: require `batch_id` for batch cards**

Replace the existing batch-generated conditional block inside `allOf` with this version:

{  
 "if": {  
   "anyOf": [  
     { "not": { "required": ["upgrade_lineage"] } },  
     {  
       "properties": {  
         "upgrade_lineage": {  
           "type": "object",  
           "properties": {  
             "origin_kind": { "const": "batch_generated" }  
           },  
           "required": ["origin_kind"]  
         }  
       },  
       "required": ["upgrade_lineage"]  
     }  
   ]  
 },  
 "then": {  
   "required": ["batch_id"],  
   "properties": {  
     "critic_pass_trace": { "$ref": "#/$defs/batchCriticPassTrace" }  
   }  
 }  
}

Add tests:

test("character proposal card schema rejects batch-generated cards without batch_id", () => {  
 const validate = compileSchema("character-proposal-card");  
 const card = validCard();  
 delete card.batch_id;

 assert.equal(validate(card), false);  
 assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.message?.includes("batch_id")));  
});

test("character proposal card schema still accepts upgraded seeds without batch_id", () => {  
 const validate = compileSchema("character-proposal-card");  
 const card = validCard({  
   upgrade_lineage: {  
     origin_kind: "upgraded_seed",  
     source_path: "briefs/maren.md",  
     source_proposal_id: "",  
     mutation_summary: "Kept the toll role and sharpened the debt appetite.",  
     rejected_directions_audit: rejectedDirectionAuditEntries()  
   },  
   critic_pass_trace: upgradeCriticPassTrace()  
 });  
 delete card.batch_id;

 assert.equal(validate(card), true, JSON.stringify(validate.errors));  
});

### **11.2 `get-record-schema.ts`: expose NCP/NCB schemas**

Add these node types:

"character_proposal_card",  
"character_proposal_batch",

Add these schema mappings:

character_proposal_card: "character-proposal-card.schema.json",  
character_proposal_batch: "character-proposal-batch.schema.json",

Acceptance tests:

test("getRecordSchema exposes character proposal schemas", async () => {  
 const card = await getRecordSchema({ node_type: "character_proposal_card" as any });  
 assert.ok(!("code" in card));  
 assert.equal(card.source_path, "tools/validators/src/schemas/character-proposal-card.schema.json");

 const batch = await getRecordSchema({ node_type: "character_proposal_batch" as any });  
 assert.ok(!("code" in batch));  
 assert.equal(batch.source_path, "tools/validators/src/schemas/character-proposal-batch.schema.json");  
});

### **11.3 `character-memorability-structure.ts`: add NCP body checks**

Add constants:

const REQUIRED_PROPOSAL_SECTIONS = [  
 "Material Reality",  
 "Institutional Embedding",  
 "Epistemic Position",  
 "Goals and Pressures",  
 "Capabilities",  
 "Voice and Perception",  
 "Contradictions and Tensions",  
 "Niche Analysis",  
 "Canon Safety Check Trace"  
] as const;

const REQUIRED_UPGRADED_PROPOSAL_SECTIONS = [  
 "Seed Essence",  
 "Upgrade Diagnosis",  
 "Rejected Directions Audit"  
] as const;

Add helper:

function sectionBody(content: string, heading: string): string | null {  
 const pattern = new RegExp(  
   `^## ${escapeRegExp(heading)}s*$([sS]*?)(?=^##s+|z)`,  
   "m"  
 );  
 const match = pattern.exec(content);  
 return match?.[1]?.trim() ?? null;  
}

function requiredSectionVerdicts(  
 filePath: string,  
 nodeId: string,  
 content: string,  
 sections: readonly string[],  
 codePrefix: string  
): Verdict[] {  
 const verdicts: Verdict[] = [];  
 for (const section of sections) {  
   const body = sectionBody(content, section);  
   if (body === null) {  
     verdicts.push(verdict(  
       filePath,  
       nodeId,  
       `${codePrefix}_missing_section`,  
       `${nodeId} missing required NCP body section '## ${section}'.`  
     ));  
   } else if (body.length === 0) {  
     verdicts.push(verdict(  
       filePath,  
       nodeId,  
       `${codePrefix}_empty_section`,  
       `${nodeId} required NCP body section '## ${section}' must not be empty.`  
     ));  
   }  
 }  
 return verdicts;  
}

Then start `proposalVerdicts` with:

verdicts.push(...requiredSectionVerdicts(  
 filePath,  
 nodeId,  
 content,  
 REQUIRED_PROPOSAL_SECTIONS,  
 "proposal"  
));

And inside the upgraded/user-seed branch:

verdicts.push(...requiredSectionVerdicts(  
 filePath,  
 nodeId,  
 content,  
 REQUIRED_UPGRADED_PROPOSAL_SECTIONS,  
 "upgraded_proposal"  
));

Also add frontmatter-specific failure handling. Today `parseFrontmatter` returns `{}` when no frontmatter exists and `null` when malformed, causing proposal checks to be weak or skipped. Replace that behavior with explicit verdicts for relevant character/proposal files, or add a pre-check before parsing:

function frontmatterPresenceVerdicts(filePath: string, content: string): Verdict[] {  
 if (!PROPOSAL_CARD_PATH.test(filePath) || PROPOSAL_BATCH_PATH.test(filePath)) {  
   return [];  
 }

 const frontmatter = frontmatterFor(content);  
 if (frontmatter === null) {  
   return [verdict(  
     filePath,  
     filePath,  
     "proposal_missing_frontmatter",  
     `${filePath} NCP card must begin with YAML frontmatter.`  
   )];  
 }

 try {  
   yaml.load(frontmatter, { schema: yaml.JSON_SCHEMA });  
   return [];  
 } catch {  
   return [verdict(  
     filePath,  
     filePath,  
     "proposal_malformed_frontmatter",  
     `${filePath} NCP card frontmatter must be parseable YAML.`  
   )];  
 }  
}

### **11.4 `yaml-parse-integrity.ts`: include character proposals**

Replace the markdown-frontmatter condition with:

if (  
 (  
   normalizedPath.startsWith("characters/") ||  
   normalizedPath.startsWith("diegetic-artifacts/") ||  
   normalizedPath.startsWith("character-proposals/")  
 ) &&  
 normalizedPath.endsWith(".md")  
) {  
 return frontmatterFor(content);  
}

This catches malformed NCP/NCB frontmatter through the general YAML integrity path.

### **11.5 Test fixture replacements**

Use current live field names:

# NCB test fixture frontmatter  
---  
batch_id: NCB-0001  
world_slug: seeded  
summary: Brinewick supporting cast proposals  
card_ids:  
 - NCP-0001  
---

Use current CHAR provenance:

source_basis:  
 world_slug: animalia  
 source_proposal_id: NCP-12  
---

## **12. Final Recommendation**

Do one more implementation pass. Do **not** redesign the character system. Do **not** create another deepening skill. Do **not** make the story system aware of NCPs or NCBs.

Fix first: NCP body validation. That is the largest real closure failure and the one most likely to let malformed or hollow cards into the pipeline.

Second: require `batch_id` for batch-generated NCPs. That protects NCP→NCB lineage and structured retrieval.

Third: update tests to use real template field names and add anti-flattening acceptance fixtures.

After those fixes, “done” means:

* Batch NCPs, upgraded NCPs, user-seed NCPs, NCB manifests, and CHAR dossiers validate through intended schema/structural paths.  
* NCP/NCB retrieval works through index, `get_record`, `list_records`, and `get_record_schema`.  
* NCP body structure is enforced without pretending to judge literary greatness.  
* Character-generation has at least one regression fixture proving a strong NCP is not silently flattened.  
* Story systems continue to consume only realized CHAR dossiers.

At that point, no further major character-system audit should be needed.



---

## Outcome

Archived on 2026-05-22 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
