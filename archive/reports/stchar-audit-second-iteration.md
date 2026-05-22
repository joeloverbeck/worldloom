**Status**: COMPLETED

# Historical — superseded by the merged SPEC-58/59/60/63 STCHAR contracts; retained for audit trail

## **1\. Executive verdict**

**Verdict: mostly complete with critical final gaps.** The merged STCHAR implementation is not a failed architecture; it is clearly the right direction and is already present across the shared story contract, bootstrap, turn-cycle, commitment-block authoring, prose attach, health audit, MCP/context-packet documentation, patch-envelope schema, world-index node/edge vocabulary, and validators. The current system has real hard validators for STCHAR resolution, active STCHAR on pages, page-plan §16a packet integrity, prose-receipt STCHAR integrity, direct `CHAR-*` runtime leakage, and legacy `bound_char_id` in `STORY_KERNEL.md`. That is substantial.

It is **not final** because the remaining gaps are exactly the class this mission warns about: independent story identifier unions are drifting; some schemas are too broad; some validators are too narrow in when they run; page snapshots are not schema-tight enough; world-index edge coverage is incomplete for several currently documented reference fields; and no deterministic surface yet proves that full or targeted STCHAR body sections were used before character-dependent state was created. The mission’s required posture is STCHAR-as-load-bearing-authority, not STCHAR-as-present-somewhere-nearby.

Highest-priority fixes:

1. **Create a single story-record registry / union source of truth** and use it to drive JSON schema patterns, validator class sets, world-index parser edges, MCP record-type docs, patch-envelope ID-allocation docs, and snapshot tests.
2. **Tighten `SE.state_delta`, `SE.commitment.alias_bindings`, and `SLT.effects / likely_effects` unions.** They currently over-allow classes such as `SE`, `PG`, `BR`, `CHC`, and `SLT` in places where the story-state contract’s intent is narrower.
3. **Expand STCHAR validator applicability.** The existing STCHAR validators are good, but their `applies_to` trigger set misses several character-dependent record classes.
4. **Add deterministic STCHAR body / section / hash integrity validation.** Current STCHAR frontmatter is validated, but the 13 required body sections and body-derived hash semantics need hard checking.
5. **Harden `PG.state_snapshot.active_records`.** The schema should require the complete active-state key set and reject unknown keys; empty arrays are fine, silent omissions and typo buckets are not.
6. **Close world-index edge parity gaps** for currently documented fields such as `STLOC.bound_ent`, `STOBJ.owner`, `STOBJ.current_location`, `OBL.owed_by`, `OBL.owed_to`, `derived_from` surfaces, `STCHAR.superseded_by`, `STSEC.source_records`, `STSEC.protected_mystery_refs`, and scalar STQ event fields.
7. **Add negative tests for stale pre-STCHAR authority.** In particular: no `bound_char_id`, no direct operational `CHAR-*` in story runtime, no STCHAR as BEL evidence, no STCHAR as promotion source, no summary-only STCHAR authority for new character-dependent state.

## **2\. Audit methodology**

I used targeted GitHub repository search and file fetches against `joeloverbeck/worldloom` on `main`. I did not clone the repository and did not modify files. I inspected active, non-archive surfaces: `docs/FOUNDATIONS.md`, the shared story-state and record-schema contracts, the STCHAR/profile/bootstrap/turn-cycle/prose-attach/commitment-block/health-audit skills, validator schemas and structural validators, MCP/context-packet docs, machine-facing-layer docs, world-index parser/types, patch-engine envelope schema, and search results for active tests/fixtures/reports.

I did not use archive content as authority. Archive hits appeared in search results, but the audit conclusions below are based on active docs/code only. No online research was used because the repo’s active contracts already answer the STCHAR retrieval/validation question.

## **3\. Current merged implementation summary**

`docs/FOUNDATIONS.md` now treats `STCHAR` as part of the story structure inventory and makes the decisive split-authority rule: story runtime consumes active story-local character authority, not world `CHAR-*`; `STCHAR.source_char_id` is provenance only; STCHAR is not a BEL evidence source or canon-promotion source. It also forbids the overengineering traps this audit must avoid: act structure, global drama-manager logic, character-arc rails, artificial prose length ceilings, and automatic story-to-world promotion.

The shared story contracts have incorporated STCHAR into active state, page plans, choice grounding, state deltas, STPLAN/STEMO/SREL derivation guidance, prose receipts, and the page-plan §16a authority packet. Page plans must include STCHAR-derived packets for viewpoint characters, speakers, major actors, direct targets, emotionally salient characters, and any character whose behavior, voice, appraisal, pressure behavior, relationship conduct, perception, embodiment, or agency shapes the page. They also require STCHAR packet hashes and forbid direct `CHAR-*` authority once STCHAR exists.

The STCHAR profile skill is structurally strong. It supports world-CHAR-derived profiles, story-local profiles, and regeneration. It requires full source authority rather than thin summaries, avoids mutating world `CHAR-*`, exposes section structure for targeted retrieval, computes profile/voice/page-packet hashes, and requires a 13-section body including Stable Persona Core, Emotional Appraisal Map, Pressure Behavior, Voice Bible, Page-Plan Voice Block, Perception and Embodiment, Agency and Planning Tendencies, Relationship-Specific Behavior, Story-State Derivation Guide, and validation anchors.

Bootstrap is also directionally correct. It allocates STCHAR IDs before other meaningful story state, drafts and validates STCHAR before STENT/STSTAT/SF/BEL/etc., binds STENT to STCHAR, adds STCHAR to `PG-1.state_snapshot.active_records`, and uses `STORY_KERNEL.md.cast_bind_list` with `stchar_id`, `stent_id`, and provenance-only `source_char_id`. It explicitly says selected world `CHAR-*` records are read only to seed STCHAR, not later story runtime.

Turn-cycle is written with the right retrieval posture: `story_bundle_context.active_story_characters` is an index, not full authoring authority; full or projected STCHAR sections must be retrieved before persona, voice, appraisal, pressure, relationship, perception, embodiment, agency, choice, plan, or emotion derivation; newly introduced non-background individuals require active bound STCHAR; and direct world `CHAR-*` reads are forbidden in normal runtime.

Commitment-block authoring has the strongest FOUNDATIONS-aligned rule: global-author-pool SLTs must not exact-reference `STCHAR-*`; branch-scoped or branch-prefix-scoped blocks may use `record_active(STCHAR-*)` only when the block is character-specific and the relevant full/projected STCHAR sections were retrieved. There is no `any_story_character_active(...)` predicate and no persona/arc predicate surface such as `character_has_wound` or `character_arc_stage`.

The validator layer is materially improved. It has hard-failing validators for unresolved STCHAR references, active STCHAR for active non-background STENTs, `CHAR-*` leakage in story runtime/page-plan/prose-receipt surfaces, page-plan §16a packet/hash integrity, prose-receipt STCHAR integrity, and legacy `bound_char_id` in the story kernel.

MCP/context-packet documentation now says `story_bundle_context.active_story_characters` is a **status-based STCHAR inventory with packet previews**, not a current-page cast snapshot and not full authoring authority. Normal story runtime should use `story_slug`, the active STCHAR inventory, and targeted `get_record`, `get_records`, or `list_records(record_type='story_character_authority_record')` retrieval for STCHAR authority. World `CHAR-*` seeds are for bootstrap/profile-source reads only.

The machine-facing docs and world-index implementation now cover many story node and edge types, including STCHAR nodes, STENT→STCHAR edges, STCHAR source/bound/supersedes edges, page active-record edges, CHC/SLT edges, and STPLAN/STEMO edges.

## **4\. STCHAR load-bearing read/order audit**

### **What counts as a valid STCHAR read**

A valid STCHAR read for creating or superseding character-dependent story state should be one of:

| Valid read type | Counts for state creation? | Notes |
| ----- | ----- | ----- |
| `get_record(STCHAR-*, story_slug=..., section_path=...)` retrieving required body section(s) | Yes | Best targeted form. |
| `get_records([...STCHAR], story_slug=...)` full body or persisted slice recovery | Yes | Good for multi-character scenes. |
| `list_records(record_type='story_character_authority_record', story_slug=..., include_full_body=true)` | Yes | Good for audits or whole-cast authoring. |
| Page-plan §16a verified packet | Usually no for new state; yes for prose/prose-attach validation | It is committed-page prose authority, not general state-authoring authority. |
| `story_bundle_context.active_story_characters[].packet_preview` | No | Inventory/ranking only; insufficient by repo contract. |
| `source_char_id` / world `CHAR-*` | No in runtime | Provenance only after STCHAR exists. |

This rule follows the repo’s actual retrieval architecture: the context packet identifies relevant STCHAR records and previews them, while targeted retrieval delivers the full body or body sections. The docs explicitly classify `active_story_characters` as an indexed inventory with hashes and packet previews, not a page-scoped authority packet or full body.

### **Bootstrap**

Bootstrap is **mostly load-bearing**. The skill drafts STCHAR before STENT/story state, binds STENT to STCHAR, puts STCHAR in the initial page snapshot, and states that selected world `CHAR-*` dossiers are read only to create STCHAR. The remaining gap is not the bootstrap skill text; it is mechanical proof. Current validators can prove that STCHAR exists, resolves, and is active, but they cannot yet prove that BEL/STINT/SREL/STPLAN/STEMO/CHC/SE/PG content was authored from the required STCHAR body sections rather than from a generic summary.

Implementation-ready requirement: bootstrap-created `STINT`, `SREL`, `STPLAN`, `STEMO`, persona-dependent `CHC`, and persona-dependent `SE.world_logic_rationale` must either cite the relevant `STCHAR-*` in existing schema fields (`derived_from`, `grounded_in.records`, or `state_relations` where appropriate) or be rejected by a new deterministic validator when a holder/participant/actor STENT has a bound STCHAR and the record’s semantics are character-dependent. BEL remains special: STCHAR can inform authoring, but it must not appear as BEL evidence.

### **Turn-cycle**

Turn-cycle is **well-specified but under-enforced**. The skill has the right order: load relevant active STCHAR before action resolution, before character-specific SLT selection/JIT authoring, before drafting/superseding BEL/STINT/SREL/STPLAN/STEMO/CHC/SE/PG/page-plan content, and before meaningful non-background STENT creation. But the validator trigger set does not cover every character-dependent patch operation. `stchar-utils.ts` only treats a subset of operations as STCHAR-relevant: STENT, PG, CHC, SE, STPLAN, STEMO, and STCHAR append/supersede. It omits obvious character-dependent classes such as SREL, STINT, BEL, OBL, CNSQ, THR, SF, CLK, STSEC, STQ, story DA, STLOC, STOBJ, and STSTAT.

Implementation-ready requirement: expand `STCHAR_RELEVANT_OPS` and touched-directory matching in `tools/validators/src/structural/stchar-utils.ts` so STCHAR validators run whenever a patch touches any class that can encode character behavior, belief, relationship, intention, plan, emotion, consequence, pressure, choice, page, event, or page-plan/prose-receipt authority.

### **Commitment-block authoring**

The current commitment-block rule should stand. Do **not** require all active STCHAR in pre-flight for every global block. Require full/projected STCHAR only when a block is character-specific. Global author-pool blocks should remain generic causal moves with role/existential predicates and must not bake in exact `STCHAR-*` dependencies. Branch-scoped or branch-prefix-scoped blocks may exact-reference `STCHAR-*` using `record_active(STCHAR-*)` when the branch snapshot contains that STCHAR and the block’s beats/effects actually depend on persona, pressure behavior, relationship conduct, appraisal, agency, or voice.

### **Prose attach**

Prose-attach is **strong** for committed pages. It validates plan/page/prose hashes, consumes the `no_char_authority_in_story_runtime` validator, populates `stchar_authority[]`, checks STCHAR packet presence/active snapshot/hash consistency, and adds judgment-assisted `profile_fidelity[]` axes for voice, appraisal, pressure behavior, and relationship conduct.

Gap: `no_char_authority_in_story_runtime` scans page plans and prose receipts, not rendered prose bodies. Prose bodies should also hard-fail on literal `CHAR-\d+` engine IDs if they appear.

### **Health audit**

Health audit is **directionally correct**. Default structural mode includes STCHAR authority health, source-drift mode is opt-in only, and source-drift reads world `CHAR-*` only to compare provenance hashes without superseding STCHAR.

Gap: the detailed Phase 2m rule needs to be backed by the same deterministic validators proposed here, not only report prose. Health audit should consume and summarize the exact STCHAR structural validators: resolve, active-for-bound-STENT, no-CHAR-authority, page-plan packet integrity, prose-receipt STCHAR integrity, stale/superseded STCHAR active, and character-dependent record grounding.

## **5\. STCHAR content-to-structure dependency map**

| Structure / surface | Required STCHAR sections before authoring | Deterministic output evidence |
| ----- | ----- | ----- |
| `BEL` | Story-State Derivation Guide, Emotional Appraisal Map, Relationship-Specific Behavior, Perception and Embodiment, relevant Source Distillation if worldview-shaped | Do **not** cite STCHAR in `basis.access_records`; BEL evidence must remain event/access/evidence records. Validator should reject STCHAR as BEL evidence. |
| `STINT` | Stable Persona Core, Agency and Planning Tendencies, Pressure Behavior, Relationship-Specific Behavior when social | `holder` STENT has bound STCHAR; `derived_from[]` includes STCHAR when persona-shaped. |
| `SREL` | Relationship-Specific Behavior, Stable Persona Core, Pressure Behavior, relevant Source Distillation | `participants[]` STENTs resolve; `derived_from[]` includes event/BEL and relevant STCHAR when relationship conduct is persona-shaped. |
| `STPLAN` | Agency and Planning Tendencies, Stable Persona Core, Pressure Behavior, Relationship-Specific Behavior, Story-State Derivation Guide | `holder` STENT bound to active STCHAR; `derived_from[]` includes STCHAR when plan style/strategy is persona-shaped; `belief_basis`, `resource_basis`, blockers resolve. |
| `STEMO` | Emotional Appraisal Map, Pressure Behavior, Relationship-Specific Behavior, Perception and Embodiment | `holder` STENT bound to active STCHAR; `trigger_event`, `appraisal_basis`, `orientation.toward_records`, and `derived_from[]` resolve; STCHAR included when appraisal/pressure behavior is profile-shaped. |
| `CHC` | Page-Plan Voice Block if wording matters; Stable Persona, Agency, Pressure Behavior, Relationship-Specific Behavior for salience/availability | `grounded_in.records[]` includes relevant STCHAR for persona-dependent choices; associated SLT resolves if present. |
| `SE.world_logic_rationale` | Stable Persona Core, Agency, Appraisal, Pressure Behavior | Natural-language rationale may cite STCHAR, but structured WHAT remains in `state_delta`, `record_introductions`, `state_relations`, and aliases. |
| `PG.state_snapshot` | No new derivation; must carry active STCHAR for active non-background STENT | Hard validator already exists; schema should require complete active-record key set. |
| Page-plan §16a | All page-relevant STCHAR sections; reduced tier for offstage-causal only | Existing packet/hash validator; keep no word ceiling. |
| `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, story `DA` | STCHAR only when character behavior, obligation, secrecy, setup/payoff, artifact access, or pressure depends on persona | Require STCHAR grounding only when holder/driver/source is character-specific and the existing schema has a lawful field. |
| `SF`, `STLOC`, `STOBJ`, `STSTAT` | Usually not STCHAR-derived; use only when story-local status/object/location exists because of a character-facing fact | Do not force STCHAR everywhere; avoid over-broad unions. |

The key distinction: **STCHAR is authoring authority, not universal evidence.** It should shape character-dependent state, but it must not become a floating justification record that replaces events, beliefs, access records, or physical evidence.

## **6\. Skill-by-skill audit**

| Skill | Current status | Required improvement |
| ----- | ----- | ----- |
| `story-character-profile` | Strong. Supports world-derived, story-local, and regeneration flows; requires rich sections and hashes; avoids world `CHAR-*` mutation. | Add hard validator for required body sections and hash consistency between frontmatter and body/projections. |
| `branching-story-bootstrap` | Mostly correct. STCHAR comes before STENT/state; STENT binds STCHAR; world CHAR read is source-only. | Add negative fixtures proving BEL/STINT/SREL/STPLAN/STEMO/CHC cannot be generated from direct `CHAR-*` or summary-only authority. |
| `branching-story-turn-cycle` | Correct written order and retrieval discipline. | Expand validators to all character-dependent touched classes; require STCHAR grounding evidence for persona-dependent outputs. |
| `commitment-block-authoring` | Correct: global pool avoids exact STCHAR; branch-scoped blocks may use exact STCHAR after targeted retrieval. | Add tests that global-author-pool SLTs with exact `STCHAR-*` fail; branch-scoped exact STCHAR passes only when active. |
| `branching-story-prose-attach` | Strong deterministic packet/hash/receipt checks and judgment-assisted profile fidelity. | Add rendered-prose `CHAR-*` scan; keep profile fidelity judgment-assisted. |
| `branching-story-health-audit` | Correct mode separation: structural STCHAR audit by default, source drift only when explicit. | Consume new STCHAR/body/grounding validators and report deterministic vs judgment-assisted findings separately. |
| `story-fact-promotion-to-canon` / `story-promotion-closeout` | Secondary. Current schemas already exclude STCHAR from promotion source records. | Keep STCHAR as context only; no auto-promotion of story-local character profiles to world canon. |

## **7\. Comprehensive story identifier surface catalog**

The active story universe should be treated as these classes:

`STORY`, `STCHAR`, `STENT`, `STSTAT`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STLOC`, `STOBJ`, story-local `DA`, `BR`, `PG`, `SE`, `CHC`, `SLT`, `SLB`, `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`, `SAU`, `SP`, `RSP`.

World-level IDs that legitimately appear in story structures:

`CHAR` only as STCHAR provenance, `CF` in story-fact derivation/promotion context, `CH` as canon revision/provenance, `M` as mystery reserve references, `OQ` where promotion/adjudication needs open-question context, `ENT` for world bindings, `SEC-*` / invariant IDs as governing/context/provenance references, and world-level `DA` only when distinguishable from story-local `DA`.

The repo already recognizes most story classes across index/node vocabulary and MCP retrieval. `NODE_TYPES` includes story entity/status/belief/fact/event/obligation/consequence/thread/relationship/intention/location/object/branch/page/choice/storylet/clock/secret/question/plan/emotion/character authority/story DA/audit/promotion/storylet batch/remediation proposal classes.

The issue is not absence of STCHAR from the repo. The issue is **same concept, different union**.

## **8\. Identifier-set matrix**

Compact matrix of the discovered high-risk surfaces:

| Surface | Current behavior | Intended set | Drift / proposed change | Deterministic test |
| ----- | ----- | ----- | ----- | ----- |
| `PG.state_snapshot.active_records.<class>[]` | Contract lists active story-state classes; JSON schema only requires `STCHAR` and permits additional keys. | Exact `ACTIVE_STATE`: `STENT`, `STCHAR`, `STSTAT`, `STINT`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`, `SREL`, `STLOC`, `STOBJ`, `DA`. | Make all keys required arrays, empty allowed; `additionalProperties: false`. | Fixture with typo key and omitted key fails. |
| `PG.visible_affordances[].grounded_in[]` | Schema allows `STLOC` / `STOBJ`; parser emits `page_visible_affordance_record`. | Keep `STLOC` / `STOBJ`. | Do not add STCHAR here; character authority belongs in active STCHAR and §16a/CHC grounding. | Negative STCHAR in affordance grounding fails. |
| `PG.unresolved_mystery_claims[].evidence_records[]` | Allows `SF`, `BEL`, `DA`, `SE`. | Keep. | Do not add STCHAR. | Negative STCHAR evidence fails. |
| `PG.emitted_choices[]` | `CHC`. Parser emits `page_emitted_choice`. | Keep `CHC`. | None. | Existing edge fixture. |
| `PG.input.resolved_event_id` | \`SE | null\`. | Keep \`SE | null\`. |
| `STENT.bound_stchar_id` | \`STCHAR | null\`; background-only null rule is documented and structurally checked. | Keep. Non-background requires active bound STCHAR. | Good. |
| `STCHAR.source_char_id` | \`CHAR | null\`, provenance-only. | Keep provenance only. | No runtime operational reads. |
| `STCHAR.bound_stent_ids[]` | `STENT[]`; parser emits `stchar_bound_stent`. | Keep. | Add bidirectional consistency validator: STENT.bound\_stchar\_id and STCHAR.bound\_stent\_ids agree. | Missing reciprocal link fails. |
| `STCHAR.supersedes` / `superseded_by` | Schema has both, but `superseded_by` is not required; parser emits `stchar_supersedes` only. | Require null-or-STCHAR for both, or explicitly remove `superseded_by`. Prefer require both. | Add `stchar_superseded_by` edge and stale-active validator. | Superseded active STCHAR fails. |
| `STORY_KERNEL.md.cast_bind_list` | Validator rejects `bound_char_id`, requires `stchar_id`, checks source provenance. | Keep. | No change except docs/report cleanup. | Existing negative fixture. |
| `CHC.grounded_in.records[]` | Allows broad active story-state set including STCHAR/STPLAN/STEMO/CLK/STSEC/STQ/STINT/SF. | Keep for choices. | Add rule: persona-dependent choice must include relevant STCHAR. | Character-specific CHC without STCHAR fails. |
| `CHC.associated_commitment_block` | \`SLT | null\`; parser emits edge. | Keep. | None. |
| `SE.actor` | \`STENT | system | unknown\`; parser skips placeholders and edges STENT. | Keep. |
| `SE.targets[]` | Currently \`STENT | STLOC | STOBJ\`; parser emits event target. | Keep unless event target can be `DA/STSEC/STQ`. Do not broaden blindly. |
| `SE.state_delta.create/supersede/close[]` | Schema and validator allow `STENT`, `STCHAR`, `STSTAT`, `STINT`, `SF`, `BEL`, `SE`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`, `SREL`, `STLOC`, `STOBJ`, `DA`, `BR`, `PG`, `CHC`, `SLT`. | Narrow to `EVENT_STATE_DELTA`: active state classes only; exclude `SE`, `PG`, `BR`, `CHC`, `SLT`, `SLB`, `SAU`, `SP`, `RSP`. | Critical over-allow. Patch schema \+ validator together. | Negative state\_delta refs to `PG`, `SE`, `CHC`, `SLT`, `BR` fail. |
| `SE.record_introductions[]` | Allows `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `STCHAR`, `SREL`, `STPLAN`, `STEMO`; event schema includes STCHAR triggers. | Keep, but add `OBL/CNSQ/BEL/STINT/SF/STSTAT/STLOC/STOBJ/DA` only if introductions are expected for all new records. | Current set may be intentionally “special introduction” classes. Shared contract should explain why. | Contract/schema parity test. |
| `SE.commitment.alias_bindings` | Over-broad: accepts many exact story ids, including `STCHAR`, `SE`, `PG`, `CHC`, `SLT`. | `ALIAS_BINDABLE`: classes actually bound by existential predicates: `OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, `STINT`, `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`, maybe `DA` only if predicate exists. | Critical drift. Alias bindings should not be generic record dump. | Alias binding to `STCHAR`, `PG`, `SE`, `CHC`, `SLT` fails. |
| `SE.promotion_claims[].source_record` | Allows `SF`, `BEL`, `DA`, `STENT`, `STSTAT`, `SREL`; excludes STCHAR. | Keep. | Good. STCHAR remains context only. | Negative STCHAR source fails. |
| `BEL.basis.access_records[]` | `STENT`, `STLOC`, `STOBJ`, `DA`, `BEL`, `SF`, `SE`; no STCHAR. | Keep. | Good. Add explicit negative test. | BEL with STCHAR evidence fails. |
| `SREL.derived_from[]` | Broad record ids; contract says include STCHAR when persona/relationship conduct shapes it. | Event/BEL/STCHAR as appropriate. | Add validator for participant-bound STCHAR when persona-shaped; judgment needed for “persona-shaped” unless default hard rule. | SREL with participants and no event/BEL/STCHAR grounding fails under strict mode. |
| `STPLAN.*` | Schemas and parser cover holder, root intention, beliefs, resources, blockers, target records, predicates, derived\_from, created\_by\_event, supersedes. | Keep but require STCHAR when holder’s plan style is persona-shaped. | Add grounding validator and registry-driven parser tests. | STPLAN holder bound STCHAR but no STCHAR grounding fails when created from character action. |
| `STEMO.*` | Schemas and parser cover holder, trigger event, appraisal basis, orientation, supersedes, derived\_from, expires refs. | Keep but require STCHAR for profile-shaped appraisal/pressure. | Add grounding validator. | STEMO holder bound STCHAR and no STCHAR/trigger/appraisal basis fails. |
| `SLT.preconditions.*` | Predicate grammar is explicit and includes exact and existential predicates; no `any_story_character_active`. | Keep; exact STCHAR only via `record_active` and scope rules. | Global-author-pool exact STCHAR forbidden by skill and validator. | Global SLT with `record_active(STCHAR-*)` fails. |
| `SLT.effects.*` / `likely_effects[]` | Schema over-allows `bound:<alias>` or generic `[A-Z]+-\d+`. | `EVENT_STATE_DELTA` \+ valid `bound:<alias>` only. | Tighten schema and validator. | `CF-1`, `M-1`, `PG-1`, `SLT-1` effects fail. |
| World-index story edges | Many core edges exist, including STCHAR, CHC, SLT, PG, STPLAN, STEMO, SE. | Every schema reference field either emits an edge or is explicitly documented as non-indexed. | Add missing edge parity. | Edge snapshot fixture per field. |
| MCP `get_record` / `list_records` | Docs support current story ids, including STCHAR/STPLAN/STEMO/SAU/SP/RSP; list\_records includes story\_character\_authority\_record. | Keep. | Add registry parity tests. | Tool enum snapshot test. |
| Patch-engine ops / expected allocations | Ops include STCHAR append/supersede, STPLAN/STEMO, CLK/STSEC/STQ/story DA; allocations include STCHAR/STPLAN/STEMO/story DA but not direct-write SLB/SAU/SP/RSP. | Keep ops; document direct-write classes clearly. | Consider `additionalProperties: false` on allocation schema after registry. | Unknown allocation key fails or is documented allowed. |

## **9\. Same-concept, different-union drift audit**

The drift pattern is real:

1. **`SE.state_delta` drift.** The shared contract describes lifecycle-managed story-state classes; schema and validator allow page/event/branch/choice/storylet classes too. This creates a route for story-forward state mutation to smuggle structural artifacts into an event delta.
2. **Alias binding drift.** `SE.commitment.alias_bindings` currently accepts a broad story-id set, but aliases are supposed to be values bound by predicate DSL existential predicates. `STCHAR`, `PG`, `SE`, `CHC`, and `SLT` should not be generic alias payloads.
3. **PG snapshot drift.** The shared contract enumerates active state classes, but the JSON schema only requires `STCHAR` and allows arbitrary extra keys. That undermines deterministic validation of snapshot shape.
4. **STCHAR supersession drift.** `superseded_by` exists in the STCHAR schema but is optional and not indexed as an edge. If the field is meaningful, require it and index it; if it is not meaningful, remove it from the contract.
5. **SLT effect-reference drift.** The predicate grammar is carefully closed, but SLT effect references are too broad in schema. That creates a backdoor for world IDs or non-state story structures.
6. **Validator trigger drift.** STCHAR validators are strong but only run for a subset of STCHAR-relevant operations. The presence of a good validator is not enough if it does not run on relationship, intention, belief, obligation, consequence, thread, artifact, secret, question, object, location, and status patches.
7. **World-index edge parity drift.** The index emits many story edges, but not every documented reference field appears covered. Edge omissions are especially likely for OBL/CNSQ derived/owed fields, STLOC/STOBJ binding/location fields, STCHAR `superseded_by`, STSEC `source_records` / protected mystery refs, and scalar STQ event fields.

Single-source-of-truth proposal: add a small registry, not a huge generator framework.

Suggested location: `tools/story-record-registry/src/story-record-classes.ts`, or if minimizing package footprint, `tools/validators/src/shared/story-record-registry.ts`.

It should export at least:

* `ACTIVE_STATE_CLASSES`
* `EVENT_STATE_DELTA_CLASSES`
* `PAGE_ACTIVE_RECORD_KEYS`
* `CHOICE_GROUNDING_CLASSES`
* `BEL_ACCESS_RECORD_CLASSES`
* `PROMOTION_SOURCE_RECORD_CLASSES`
* `ALIAS_BINDABLE_CLASSES`
* `SLT_EFFECT_CLASSES`
* `RECORD_ACTIVE_PREDICATE_CLASSES`
* `WORLD_PROVENANCE_CLASSES`
* `STCHAR_RELEVANT_OPS`
* edge-field specs: source node type, field path, target union, edge type, placeholder behavior

Use it to generate or snapshot-check JSON schema fragments, validator sets, parser edge cases, MCP docs/tool enums, patch-envelope allocation keys, and test fixtures. Do not overbuild a universal schema generator immediately; start with registry-driven tests that fail when sets diverge.

## **10\. CHAR access / split-authority audit**

Current split-authority posture is mostly correct.

Allowed world `CHAR-*` use:

* `story-character-profile`, when creating/regenerating STCHAR from a world character.
* `branching-story-bootstrap`, only to seed initial STCHAR from selected cast.
* `branching-story-health-audit`, only in explicit `source_drift` / provenance mode.
* Promotion/closeout skills, only for explicit provenance or world-canon adjudication.

Defective world `CHAR-*` use:

* Any direct operational `CHAR-*` in `PG`, `CHC`, `SLT`, `SE`, `BEL`, `SREL`, `STINT`, `STPLAN`, `STEMO`, page plans, prose receipts, or normal story-runtime context.

The repo already has a good hard-failing validator for direct runtime `CHAR-*` leakage, with explicit allowance only for STCHAR provenance and promotion/adjudication surfaces.

Required changes:

1. Expand the validator’s text-surface scan to rendered prose files as well as page plans and prose receipts.
2. Ensure promotion/adjudication allowance is not a broad loophole. Schema already excludes STCHAR and CHAR as promotion source records; keep that hard.
3. Expand `appliesToStcharStoryState` so the no-CHAR validator runs when any character-dependent story class is patched, not only the current subset.

## **11\. Page-plan and prose-receipt STCHAR audit**

Page-plan §16a is one of the strongest parts of the merged implementation. The contract requires character packets for all materially relevant page characters, includes no word-count ceiling, distinguishes offstage-causal reduced packets, and requires identity, voice, appraisal, pressure, relationship conduct, perception/embodiment, agency/planning, must-show/not-imply, and anti-generic warnings.

The validator is also strong. It parses §16a packets, requires active non-background present STENTs to have STCHAR packets, checks packet hashes against stored STCHAR hashes, rejects inactive STCHAR packets, and requires voice blocks for speaker/viewpoint packets.

Recommended stance: keep the stricter validator. It is slightly stronger than the prose contract’s “relevant character” language because it effectively requires packets for present active non-background STENTs unless offstage. That is acceptable and FOUNDATIONS-aligned because the repo explicitly rejects artificial prose/plan length ceilings. If this becomes noisy, introduce a deterministic `required_because: background_present_no_material_behavior` exemption only if it is schema-backed and consumed by prose-attach. Otherwise, do not weaken it.

Prose receipts are also strong. The schema and validator require `stchar_authority[]`, hash comparisons, active snapshot status, deterministic verdicts, and judgment-assisted `profile_fidelity[]`.

Required change: add rendered prose body to `CHAR-*` text leak checks, or explicitly route that through prose-attach’s engine-jargon scanner.

## **12\. Validation audit**

### **Deterministic hard-fail validators to keep**

* STCHAR id resolves.
* Active non-background STENT has active bound STCHAR on the same page.
* Page-plan §16a packet exists for required active character and hashes match.
* Prose receipt STCHAR authority matches page-plan packet and active snapshot.
* Direct runtime `CHAR-*` references fail.
* `STORY_KERNEL.md.cast_bind_list` rejects `bound_char_id` and requires STCHAR bindings.
* `SE.state_delta` references resolve and use permitted classes.

These already exist in partial or complete form.

### **Deterministic validators to add or strengthen**

1. **`stchar_body_integrity`**
   * Path: `tools/validators/src/structural/stchar-body-integrity.ts`
   * Checks: required 13 H2 sections present; no empty body; frontmatter hashes match canonical section projections; `profile_hash`, `voice_block_hash`, `page_packet_hash` are valid and current.
   * Negative tests: missing Voice Bible, missing Page-Plan Voice Block, stale hash.
2. **`stchar_binding_consistency`**
   * Checks: `STENT.bound_stchar_id` and `STCHAR.bound_stent_ids[]` are reciprocal; no active STENT points to retired/superseded STCHAR; no STCHAR status `superseded|retired` appears in active page snapshot.
   * Negative tests: active superseded STCHAR; one-way binding only.
3. **`character_grounding_consistency`**
   * Checks: persona-dependent `CHC`, `STPLAN`, `STEMO`, `SREL`, `STINT`, and character-specific `SE` surfaces cite relevant STCHAR where schema allows.
   * Deterministic default: if record has a `holder`, `participants`, or `actor` STENT with active bound STCHAR and the record is created/superseded after STCHAR exists, require STCHAR grounding unless the class is explicitly excluded.
   * Exclusions: BEL evidence must not cite STCHAR; background STENTs exempt.
4. **`story_identifier_union_parity`**
   * Checks registry vs schema vs validator vs parser docs.
   * Failure message: exact set difference per surface.
5. **`world_index_edge_parity`**
   * Checks every registry edge-field spec has parser edge fixture and docs row.
   * Negative tests: known field omitted from parser fails snapshot.
6. **`stchar_runtime_validator_scope`**
   * Checks STCHAR validators run for every op in `STCHAR_RELEVANT_OPS`; this is a meta-test around `applies_to`.

### **Judgment-assisted checks**

Do not pretend these are deterministic:

* Does dialogue actually sound like the Voice Bible?
* Does a subtle emotion follow appraisal rules?
* Does viewpoint narration capture perception style?
* Is the page-plan packet sufficiently rich for a complex scene?
* Does a relationship shift feel faithful to relationship-specific conduct?

These belong in prose-attach profile fidelity and health-audit advisory findings, with evidence excerpts and repair recommendations.

## **13\. MCP / world-index / patch-engine audit**

### **MCP / context packets**

MCP is mostly complete. `get_record`, `get_records`, `get_records_field`, `list_records`, and `get_record_schema` are documented for current story classes, including STCHAR, STPLAN, STEMO, SAU, SP, and RSP. `get_record` can project STCHAR hybrid body sections, which is exactly what targeted retrieval needs.

Required improvement: expose the STCHAR body-section names in `get_record_schema` or `get_record` projection suggestions in a way tests can snapshot. This makes targeted retrieval mechanically discoverable instead of skill prose only.

### **World-index**

The parser and schema already cover many story edges: STENT→STCHAR, STCHAR source/supersedes/bound STENT, page active records, CHC grounding, SLT predicate/effect refs, BEL/SREL/STINT/STSTAT/CLK/STSEC/STQ/STPLAN/STEMO/SE edges.

Required edge additions or explicit non-indexed decisions:

* `STCHAR.superseded_by` → `stchar_superseded_by`
* `STLOC.bound_ent` → `story_location_bound_entity`
* `STOBJ.owner` → `story_object_owner`
* `STOBJ.current_location` → `story_object_current_location`
* `OBL.owed_by`, `OBL.owed_to` → obligation party edges
* `OBL.derived_from`, `CNSQ.derived_from`, `THR.derived_from`
* story-local `DA.derived_from`
* `STSTAT.location` when structured
* `STSEC.source_records[]`
* `STSEC.protected_mystery_refs[]` to world `M-*`
* `STQ.source_event`
* `STQ.answer_event`
* any `CLK.thresholds[].effects.create/supersede/close` references if those are schema-backed

### **Patch-engine / envelope**

Patch-engine operation coverage is mostly complete for STCHAR/STPLAN/STEMO/story DA and the main story records. `OPERATION_KINDS` includes STCHAR append/supersede, STPLAN/STEMO creation, clock/secret/question creation/supersession, and story DA append; ID allocation keys include `stchar_ids`, `stplan_ids`, `stemo_ids`, and `story_da_ids`.

Required improvements:

* Decide and document why `SLB`, `SAU`, `SP`, and `RSP` are direct-write / non-patch-engine artifacts. If they allocate IDs through MCP, document that they are outside patch-envelope `expected_id_allocations`.
* After registry lands, make `expected_id_allocations` reject unknown keys, or explicitly keep `additionalProperties: true` with a reason. The current MCP envelope schema allows arbitrary allocation keys.
* Ensure `describe_envelope_schema` derives operation and allocation descriptions from the same registry or has snapshot parity tests.

## **14\. Test and fixture audit**

Existing active tests cover parts of the STCHAR pipeline, prose receipt integrity, STCHAR structural validators, STPLAN/STEMO integration, and several structural validators. Search surfaced active tests such as `spec57-stchar-pipeline-integration.test.ts`, `prose-receipt-stchar-integrity.test.ts`, `stchar-structural-validators.test.ts`, and `spec47-stplan-stemo-integration.test.ts`.

Required test additions:

| Test area | Required positive fixture | Required negative fixture |
| ----- | ----- | ----- |
| STCHAR body integrity | Full 13-section STCHAR with correct hashes passes | Missing section or stale hash fails |
| Bootstrap STCHAR order | STCHAR → STENT → state records pass | BEL/STPLAN/STEMO/CHC derived from `CHAR-*` or no STCHAR grounding fails |
| Turn-cycle new character | Non-background STENT \+ STCHAR \+ active snapshot passes | New non-background STENT without STCHAR fails |
| Validator trigger scope | SREL/STINT/BEL/OBL/CNSQ/THR/etc. patches run STCHAR validators | Same patch bypassing validator fails meta-test |
| PG active records | Exact active-state keys, empty arrays allowed | Missing key or typo key fails |
| State delta union | Active state classes pass | `PG`, `SE`, `BR`, `CHC`, `SLT`, `CF`, `CHAR` fail |
| Alias binding | Bound existential classes pass | `STCHAR`, `PG`, `SE`, `SLT`, `CHC` fail |
| SLT effect refs | Active state ids or `bound:<alias>` pass | World ids and non-state story ids fail |
| World-index edges | Fixture emits every registry edge | Missing parser edge breaks snapshot |
| CHAR authority | STCHAR.source\_char\_id allowed | Runtime `CHAR-*` in page plan/prose/prose receipt/CHC/STPLAN fails |
| Promotion | `SF/BEL/DA/STENT/STSTAT/SREL` source passes | `STCHAR` or `CHAR` promotion source fails |
| Commitment blocks | Branch-scoped exact STCHAR passes when active | Global-author-pool exact STCHAR fails |

## **15\. Stale active docs/reports audit**

Search for `bound_char_id` found active mentions in reports/triage plus the active validator that rejects it. The active operational skills and shared contracts I inspected no longer rely on `bound_char_id`; `story-kernel-cast-bind-list-integrity.ts` treats it as a legacy defect and hard-fails it.

Required cleanup:

* Add a “historical / superseded by current STCHAR contracts” header to active reports such as `archive/reports/stchar-audit-first-iteration.md` and `archive/reports/stchar-implementation-first-iteration.md` if they remain in active `reports/`.
* Do the same for `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md` if it mentions old assumptions.
* Do not change the validator’s `bound_char_id` references; those are current enforcement, not stale advice.

## **16\. Research-informed improvement opportunities**

No external research was necessary. The repo already contains the relevant architectural rule: summaries/previews are not full authority, STCHAR is runtime authority, world `CHAR-*` is provenance after STCHAR creation, and targeted retrieval is the mechanism for full body or section access.

## **17\. Proposed improvements**

### **Critical**

1. **Add story record registry / union parity tests**
   * Files:
     * New: `tools/validators/src/shared/story-record-registry.ts` or `tools/story-record-registry/src/story-record-classes.ts`
     * Update: `tools/validators/src/schemas/*.schema.json`
     * Update: `tools/validators/src/structural/*.ts`
     * Update: `tools/world-index/src/parse/atomic.ts`
     * Update: `tools/world-index/src/schema/types.ts`
     * Update: `tools/world-mcp/src/tools/describe-envelope-schema.ts`
     * Update: `docs/MACHINE-FACING-LAYER.md`
   * Acceptance: registry snapshot test fails if schema, validator, parser, MCP docs, or patch-envelope sets diverge.
2. **Tighten event state delta and validator**
   * Files:
     * `tools/validators/src/schemas/story-event.schema.json`
     * `tools/validators/src/structural/state-delta-class-integrity.ts`
     * `.claude/skills/_shared-templates/story-state-contract.md`
   * Acceptance: `SE.state_delta` allows active state only; rejects `SE`, `PG`, `BR`, `CHC`, `SLT`, world IDs, and unknown prefixes.
3. **Tighten alias bindings**
   * Files:
     * `tools/validators/src/schemas/story-event.schema.json`
     * predicate/alias validator files
     * commitment-block tests
   * Acceptance: aliases can bind only classes produced by closed existential predicates; exact STCHAR is not alias-bindable.
4. **Expand STCHAR validator applicability**
   * File:
     * `tools/validators/src/structural/stchar-utils.ts`
   * Acceptance: STCHAR validators run for every operation/touched directory that can create or modify character-dependent state.
5. **Add STCHAR body/hash integrity validator**
   * Files:
     * New: `tools/validators/src/structural/stchar-body-integrity.ts`
     * `tools/validators/src/schemas/story-character-authority.schema.json`
     * tests under `tools/validators/tests/structural/`
   * Acceptance: missing required H2, empty section, stale hash, or missing page-plan voice block fails.
6. **Harden PG active-record schema**
   * File:
     * `tools/validators/src/schemas/story-page.schema.json`
   * Acceptance: all active-state keys required; no unknown active-record keys; every referenced id resolves.

### **Important**

7. **Add missing world-index edges**
   * Files:
     * `tools/world-index/src/parse/atomic.ts`
     * `tools/world-index/src/schema/types.ts`
     * `docs/MACHINE-FACING-LAYER.md`
     * world-index parser tests
   * Acceptance: every registry edge-field spec has an emitted edge fixture or explicit non-indexed note.
8. **Add `stchar_binding_consistency` validator**
   * Acceptance: reciprocal STENT/STCHAR binding; no retired/superseded STCHAR active in page snapshots.
9. **Add `character_grounding_consistency` validator**
   * Acceptance: character-specific CHC/STINT/SREL/STPLAN/STEMO/SE surfaces require STCHAR grounding when mechanically inferable.
10. **Clarify STCHAR page-plan packet authority boundary**
    * Files:
      * `.claude/skills/_shared-templates/story-state-contract.md`
      * `branching-story-turn-cycle/SKILL.md`
      * `branching-story-prose-attach/SKILL.md`
    * Acceptance: §16a packets are sufficient for prose/prose-attach validation, not default authority for new state creation.
11. **Document direct-write classes**
    * Files:
      * `tools/patch-engine/src/envelope/schema.ts`
      * `tools/world-mcp/src/tools/describe-envelope-schema.ts`
      * `docs/MACHINE-FACING-LAYER.md`
    * Acceptance: `SLB`, `SAU`, `SP`, `RSP` are either explicitly direct-write/non-envelope or represented in allocation schemas consistently.

### **Nice-to-have**

12. **Expose STCHAR section projections in schema/tool suggestions**
    * Acceptance: `get_record_schema` or `get_record` projection suggestions list canonical STCHAR body section paths.
13. **Add historical headers to active reports/triage**
    * Acceptance: no active report can be mistaken for current operational guidance on `bound_char_id` or direct `CHAR-*` runtime use.

## **18\. Rejected changes / anti-patterns**

Do **not** add character-arc predicates, wound predicates, act structure, dramatic-unit schemas, global drama-manager logic, or “character must follow an arc” rails. Commitment blocks are causal moves, not plot beats.

Do **not** make world `CHAR-*` story-aware. STCHAR is the story-local authority. World CHAR remains source/provenance and world-canon context only.

Do **not** make STCHAR a universal evidence record. BEL, promotion claims, mystery evidence, and canon claims need events/access/evidence records, not “the character profile says so.”

Do **not** impose word-count ceilings on STCHAR or page-plan §16a packets. If the character content is necessary for prose fidelity, include it.

Do **not** auto-promote story-local STCHAR to world canon or world `CHAR-*`. Any story-local character-to-world-character path must be explicit, opt-in, adjudicated, and outside normal runtime.

Do **not** broaden every identifier union “just in case.” The correct repair is narrower, generated/registry-backed unions with explicit exceptions.

## **19\. FOUNDATIONS alignment table**

| Proposed change | FOUNDATIONS alignment |
| ----- | ----- |
| STCHAR body/hash validator | Preserves story-local character authority and prevents generic-character drift. |
| Expanded no-CHAR/STCHAR validator triggers | Enforces normal runtime consuming STCHAR rather than world `CHAR-*`. |
| Narrow `SE.state_delta` | Supports append-only story state and prevents structural artifacts from masquerading as event consequences. |
| Tight alias bindings | Keeps commitment blocks causal and predicate-bound, not arbitrary record bags. |
| Harden PG active-record keys | Supports no-floating-facts and replayable snapshots. |
| CHC/STPLAN/STEMO/SREL/STINT grounding checks | Makes STCHAR load-bearing where character behavior, appraisal, agency, planning, and relationship conduct matter. |
| BEL evidence exclusion for STCHAR | Preserves belief-vs-fact and observer/evidence discipline. |
| Promotion exclusion for STCHAR | Prevents silent story-local-to-world-canon promotion. |
| World-index edge parity | Supports retrieval completeness and machine-facing validation without broad raw-file reads. |
| Commitment-block exact STCHAR scope rule | Prevents generic drift while avoiding persona rails in global author-pool blocks. |
| Page-plan §16a no word ceiling | Aligns with prose length discipline and fictive-dream preservation. |
| No act/arc/drama-manager additions | Preserves FOUNDATIONS schema minimalism and causal-move model. |


---

## Outcome

Archived on 2026-05-22 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
