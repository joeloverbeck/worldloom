## **1. Executive verdict**

**The story architecture is basically sound.** The inspected docs are not overdesigned in the dangerous way: they reject act structure, reject a global drama manager, keep prose non-authoritative, separate `SF` from `BEL`, protect Mystery Reserve, use page snapshots as fork primitives, and route story-to-world canon through a narrow promotion pipeline. The system is strongest where it insists that story state is a causal, epistemic, social, branch-local machine rather than a dramatic-shape machine. That is exactly the right center of gravity.

**But I cannot certify implementation readiness from the uploaded corpus.** The actual validator schemas, validator implementations, patch-engine op schemas, MCP server implementation, migrations, fixtures, and tests were not uploaded and are not present under `/mnt/data`. I inspected the uploaded contract/docs/skills only. That means this is a **source-doc architecture audit with implementation-risk findings**, not a verified live-code audit.

Main remaining work:

| Area | Verdict |
| ----- | ----- |
| Architecture | Strong. Do not redesign it. |
| Schemas | Likely strong in docs; actual JSON/YAML schemas not inspectable. |
| Validators | Critical unknown. Docs name validators, but code not inspectable. |
| Tests | Critical unknown. No test files uploaded/discovered. |
| Skill wording | Mostly good; a few sharp wording/retrieval drifts. |
| Retrieval/MCP | Good contract; one skill has ambiguous seed-node wording. |
| Patch-engine | Good documented discipline; actual op schemas not inspectable. |
| Migration cleanup | Unknown; some “known integration debt” notes may be stale. |

The biggest verified risks are **not conceptual**. They are: missing implementation evidence, a prose-attach Mystery Reserve field mismatch, ambiguous turn-cycle context-packet seed wording, a closeout retrieval wording contradiction, and a small page-plan hash post-write integrity gap.

---

## **2. Source inventory**

### **Uploaded / inspected docs**

| File inspected | Role in story system |
| ----- | ----- |
| `/mnt/data/FOUNDATIONS.md` | Highest authority. Defines world canon, story bundles, canon/story separation, present-causal-state discipline, no act structure, no global drama manager, no word counts, BEL/SF separation, Mystery Reserve, HARD-GATE / retrieval / patch-engine principles. |
| `/mnt/data/story-state-contract.md` | Shared story-state contract. Authoritative for story-bundle schemas, lifecycle, PG/SE/SLT/BEL shapes, action routing, closed predicate DSL, eight hard gates, branch/replay/hash discipline, prose receipts. |
| `/mnt/data/CONTEXT-PACKET-CONTRACT.md` | Retrieval-side contract for `get_context_packet`, packet layers, story-bundle context, full-body reservation, story-pipeline task profiles, drift follow-up retrieval, focused retrieval tools. |
| `/mnt/data/HARD-GATE-DISCIPLINE.md` | HARD-GATE execution discipline, approval token flow, patch-engine submission discipline, validation rationale discipline, CLI/MCP equivalence. |
| `/mnt/data/MACHINE-FACING-LAYER.md` | Operational overview for world-index, MCP retrieval, patch engine, validators, hooks, retrieval tools, schema-currency checks, envelope-schema discovery. |

### **Uploaded / inspected skill files**

| Uploaded file | Skill name |
| ----- | ----- |
| `/mnt/data/SKILL.md` | `branching-story-bootstrap` |
| `/mnt/data/SKILL(1).md` | `branching-story-health-audit` |
| `/mnt/data/SKILL(2).md` | `branching-story-prose-attach` |
| `/mnt/data/SKILL(3).md` | `branching-story-turn-cycle` |
| `/mnt/data/SKILL(4).md` | `commitment-block-authoring` |
| `/mnt/data/SKILL(5).md` | `story-fact-promotion-to-canon` |
| `/mnt/data/SKILL(6).md` | `story-promotion-closeout` |

**All seven story-pipeline skills are present.** FOUNDATIONS names exactly these seven as Skill Category 2c: `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, and `story-promotion-closeout`.

### **Expected but not present in the uploaded/discovered corpus**

These were **not uploaded** and were **not discoverable in `/mnt/data`**:

| Expected artifact | Status |
| ----- | ----- |
| `reports/prose-quality-instructions.md` | Missing from audit corpus. Important because page plans require verbatim §2 / §3 / §19 from it. |
| Actual `.claude/skills/_shared-templates/story-state-contract.md` path | Represented by uploaded `story-state-contract.md`, but the project path itself was not present. |
| Validator schema files | Missing. |
| Validator implementations | Missing. |
| Patch-engine envelope/op schema files | Missing. |
| MCP retrieval implementation/contracts in code | Missing. |
| Tests / fixtures / migrations | Missing. |
| Fifth-iteration report | Not provided. No prior findings can be marked fixed/still-open except where current docs mention integration debt. |

Because code/schema/test files were not available, any conclusion about implementation behavior is constrained to: **“documented contract says X; implementation not verified.”**

---

## **3. What should not change**

These are the design decisions to preserve.

**Present-causal-state discipline.** FOUNDATIONS explicitly says the engine tracks what is true now and what licenses next; it does not track where the run “should” be in an arc. That is the architecture’s core strength. It directly protects play from premise refusal, early deaths, abandoned threads, betrayal, lies, and branch-local counterfactuals.

**No act structure.** Act/midpoint/climax machinery would impose future dramatic obligations. FOUNDATIONS correctly rejects it because it would break when the player kills an antagonist, refuses the premise, joins the enemy, or otherwise makes a coherent but shape-breaking move.

**No global drama manager.** Selection is local salience ranking gated by hard coherence gates, not global optimization toward a target narrative shape. That should remain untouched.

**Plan-authority boundary.** Story state is authoritative at page-plan commit. A committed `PG` is real before prose exists, and any committed page can be a parent for turn-cycle. Rendered prose is receipt text, not state.

**Prose as receipt, not state.** Prose-attach validates rendered prose and writes a receipt; it does not mutate the page record, and drift is recorded in the receipt rather than written back into `PG`.

**Branch-local story truth separate from world canon.** Story bundles are derivative, per-world layers; story-bundle records may be branch-scoped, counterfactual, provisional, or local to a narrative run, while world canon remains CF / CH / INV / M / OQ / ENT / SEC.

**BEL/SF separation.** `SF` records what is true in the branch; `BEL` records what actors believe, claim, witness, suspect, deny, misremember, or deceive about. This is the right way to model lies, rumors, witness asymmetry, and public misinformation.

**Mystery Reserve firewall.** Forbidden `M` entries must never be resolved. The docs correctly make the plan-time firewall authoritative and prose-attach a downstream redundant guard.

**HARD-GATE / patch-engine discipline.** Every content-generating or canon-mutating skill must stop for explicit user approval, produce authority-cited PASS rationales, then route `_source` writes through the patch engine with approval tokens.

**Schema-minimalism.** The story-state contract is right to require every field to be consumed by a validator, replay primitive, predicate, fork operation, retrieval path, patch op, or audit rule. Nice-to-have fields would erode reliability.

---

## **4. Red-team support matrix**

| Failure mode | Current support | Mechanism / source evidence |
| ----- | ----- | ----- |
| Player kills or incapacitates a major actor early | Handled but undertested | Turn-cycle makes deaths/removals first-class and requires same-delta reconciliation through `STSTAT`, intentions, obligations, relationships, objects, BEL, and choice availability. |
| Player refuses the premise | Handled | Turn-cycle routes every selected choice or write-in to exactly one outcome; silent rejection is forbidden, and impossible/refusal cases still produce `SE` + page plan. |
| Player abandons the current thread | Handled but undertested | OBL/CNSQ/THR/STINT urgency, consequence capacity, terminal proof, debt health, and saliency-starvation audit cover abandoned pressure. |
| Player lies publicly | Handled but undertested | BEL/SF separation, `BEL.truth_relation`, `BEL.visibility`, witness propagation, and health-audit lie-promotion checks. |
| Player acts on unavailable information | Handled but undertested | Observer firewall governs SLT selection, CHC emission, and character actions; audit checks unavailable-knowledge use post-hoc. |
| Player attempts something impossible | Handled | `world_block` is a first-class route; impossible actions still generate `SE`, rationale, and a page plan. |
| Player discovers or appears to discover a protected mystery | Partially handled | Plan-time firewall exists, but prose-attach references undocumented `denial_patterns`; see Finding F2. |
| Player creates a branch-local counterfactual | Handled | `SF.authority` separates `branch_local`, `branch_local_counterfactual`, `canon_candidate`, and `canon_linked`; promotion skill caps counterfactual promotion. |
| Rendered prose invents a structural fact | Handled but judgment-assisted | Prose-attach has `invented_structural_fact`; health-audit flags unrepaired prose inventions. |
| Canon changes after pages have already been committed | Handled but code-unverified | `PG.state_snapshot.canon_revision`, drift classification, CH-window retrieval, and health-audit Phase 2h. |
| Story-local claim is proposed for canon promotion | Handled | `story-fact-promotion-to-canon` creates a CF-shaped candidate package but never mutates world canon; `canon-addition` decides; closeout records verdict. |
| Sibling branches contradict one another | Handled but undertested | Branch isolation, branch-scope vocabulary, and health-audit branch isolation / counterfactual checks. |
| Sibling story bundles contradict one another | Handled as audit signal | Health-audit `cross_story` mode flags mirrored-fact, promotion, and inherited-debt contradictions without auto-repair. |
| Social consequences propagate through witnesses, rumors, institutions, artifacts, and misunderstandings | Handled but undertested | Turn-cycle Phase 4 expected-witness computation and BEL creation / non-propagation tags; audit Phase 2d checks completeness. |
| Expected social propagation does not occur | Handled but undertested | Non-propagation closed tag set and health-audit malformed/missing tag findings. |
| Branch-local records leak into global author-pool storylets | Handled but undertested | FOUNDATIONS branch isolation plus commitment-block authoring branch-scope legality. |
| Storylet alias binding fails or binds wrong record | Handled but undertested | Closed predicate DSL and same-SLT alias-binding discipline; turn-cycle bind-first/select-second/instantiate-third. |
| Page snapshot replay diverges from SE deltas | Handled in docs, implementation unverified | `snapshot_replay_equality`, deterministic hashes, and health-audit replay are documented; actual validator code missing. |
| Terminal branch leaves unresolved debts without proof | Handled but undertested | Gate 6 terminal proof plus health-audit `terminal_without_rationale` / `orphan_debt_at_terminal`. |
| Accepted choices are cosmetic | Handled but undertested | Choice Consequence Integrity and `choice_set_noncollapse`. |
| Non-terminal leaf becomes unactionable | Handled but undertested | Health-audit `unactionable_leaf` and turn-cycle consequence capacity. |
| Prose receipt fails but turn-cycle continues correctly from PG state | Handled | Prose receipt never mutates `PG`; parent prose is optional for turn-cycle. |
| Promotion closeout records fake or unresolved canon-addition outputs | Handled in docs, code-unverified | Closeout pre-flight requires linked CF / CH / PA existence verification through MCP; actual retrieval implementation not inspected. |
| Context packet omits required governing records or story-bundle context | Partially handled | Contract has required layers, full-body reservation, persisted recovery, and story-bundle context; turn-cycle seed wording has ambiguity. |
| Patch-engine schemas permit forbidden records or reject required records | Not verifiable | Docs point to `describe_envelope_schema` and `record_schema_compliance`, but actual schema/op code absent. |

---

## **5. Findings**

### **F1 — P0 — Implementation evidence gap: code, schemas, validators, patch-engine ops, MCP implementation, and tests were not inspectable**

**Affected files / areas:** missing `tools/validators`, `tools/patch-engine`, `tools/world-mcp`, JSON/YAML schemas, migrations, fixtures, tests.

**Problem:** The architecture docs are strong, but the requested “live-source audit” cannot verify the current codebase because only docs and skills were uploaded/discoverable.

**Evidence:** MACHINE-FACING-LAYER points to `get_record_schema`, `describe_envelope_schema`, validators, `record_schema_compliance`, and patch-plan validation as implementation surfaces, but those source files are not present in the corpus.

**Why it matters in branching play:** A schema typo or missing patch op can make a documented guarantee fake. The most dangerous examples are PG hash validation, BEL/STSTAT schema enforcement, branch-local leakage, story-local DA ops, closeout linked-record verification, and CH-window drift classification.

**Issue type:** implementation/test gap.

**Recommendation:** Treat production readiness as blocked until actual schemas, validators, patch-engine envelope/op schemas, MCP retrieval code, migrations, and tests are inspected or regenerated into an audit artifact.

**Schema change required:** No.

**Validator/test change required:** Yes — see Section 8.

**Deterministic or judgment-assisted:** Deterministic audit blocker.

---

### **F2 — P1 — Prose-attach Mystery Reserve check references an undocumented `denial_patterns` field**

**Affected file:** `branching-story-prose-attach` / `SKILL(2).md`.

**Affected section:** Phase 3 deterministic check `forbidden_mystery_resolution`.

**Problem:** Prose-attach says to use patterns derived from each mystery’s `denial_patterns`, but the context-packet focused firewall tool documents `title`, `status`, `unknowns`, `common_interpretations`, and `disallowed_cheap_answers`, not `denial_patterns`.

**Evidence:** FOUNDATIONS defines Mystery Reserve entries around what is known, unknown, forbidden, and future resolution safety, and says forbidden mysteries are never resolved. The retrieval contract exposes `get_firewall_content` for firewall-relevant fields, but not `denial_patterns`.

**Why it matters in actual branching play:** A rendered page could appear to resolve a protected mystery, and prose-attach might either fail because it cannot find `denial_patterns` or pass because the deterministic check is looking for a field no retrieval path supplies.

**Issue type:** context-packet/retrieval drift; missing validation.

**Concrete recommendation:** Replace `denial_patterns` with retrieval-backed derivation from `get_firewall_content(...).disallowed_cheap_answers[]`, `unknowns[]`, and plan §11. Do not add a new Mystery Reserve schema field unless validators and retrieval consume it.

**Mechanical consumer:** `branching-story-prose-attach` deterministic `forbidden_mystery_resolution`; health-audit mystery-accretion replay.

**Schema change required:** No.

**Validator/test change required:** Yes.

**Deterministic or judgment-assisted:** Deterministic for exact disallowed-answer matches; judgment-assisted for semantic narrowing.

---

### **F3 — P1 — Turn-cycle context-packet seed wording can accidentally pass story-local IDs as world-scope seeds**

**Affected file:** `branching-story-turn-cycle` / `SKILL(3).md`.

**Affected section:** World-State Prerequisites and Pre-flight context-packet load.

**Problem:** The skill says the context packet is seeded with “active cast + active location + parent’s unresolved mystery claims.” That is ambiguous: in story state, active cast/location can mean `STENT` and `STLOC`, but the context-packet contract says story-pipeline `seed_nodes` should preferentially be world-canon or hybrid world records, and story-local records should be loaded through `story_slug`, `story_bundle_context`, or targeted retrieval.

**Evidence:** MACHINE-FACING-LAYER repeats that story-pipeline seed nodes are world-scope seeds and story-local records should be read through `story_slug` + story-bundle context or targeted retrieval.

**Why it matters in actual branching play:** A turn from a branch-local location or entity could retrieve the wrong locality, drop governing context, or trigger `story_local_seed_nodes_ignored` without the skill rerouting.

**Issue type:** context-packet/retrieval drift.

**Concrete recommendation:** Clarify that turn-cycle must resolve active `STENT`/`STLOC` to bound world `CHAR`/`ENT`/`SEC`/`CF` IDs before passing `seed_nodes`; story-local IDs are loaded separately.

**Mechanical consumer:** MCP `story_local_seed_nodes_ignored` warning; turn-cycle Pre-flight retrieval; context-packet integration tests.

**Schema change required:** No.

**Validator/test change required:** Yes.

**Deterministic or judgment-assisted:** Deterministic.

---

### **F4 — P1 — Promotion closeout has contradictory wording on linked CF / CH / PA retrieval**

**Affected file:** `story-promotion-closeout` / `SKILL(6).md`.

**Affected sections:** Pre-flight, World-State Prerequisites, FOUNDATIONS Alignment / Tooling Recommendation row.

**Problem:** Pre-flight correctly requires linked CF / CH / PA records to be existence-verified through MCP retrieval, but the FOUNDATIONS Alignment row says linked canon-addition records are loaded via “direct file reads.”

**Evidence:** FOUNDATIONS says world-canon reads by story-pipeline skills route through MCP retrieval tools; direct story-bundle reads are allowed, but world-canon `_source` reads are not the story-pipeline norm.

**Why it matters in actual branching play:** Closeout is the defense against fake canon-addition outcomes. A direct-read loophole could let a closeout ledger cite non-indexed, stale, malformed, or manually edited world-canon files.

**Issue type:** cross-skill drift; context-packet/retrieval drift.

**Concrete recommendation:** Replace the direct-read wording with MCP `get_records` / `get_record` wording for linked CF / CH / PA.

**Mechanical consumer:** closeout Pre-flight; MCP retrieval test; closeout fake-output rejection test.

**Schema change required:** No.

**Validator/test change required:** Yes.

**Deterministic or judgment-assisted:** Deterministic.

---

### **F5 — P1 — Page-plan hash is computed before patch submission, but the direct-written plan bytes need a post-write verification step**

**Affected files:** `story-state-contract.md`, `branching-story-bootstrap`, `branching-story-turn-cycle`.

**Affected sections:** shared write order; bootstrap Phase 10; turn-cycle Phase 10.

**Problem:** The contract correctly computes `PG.plan.plan_hash` over the future page-plan bytes and requires the exact bytes to be written after patch success. But the docs do not explicitly require re-reading the direct-written plan file before updating `INDEX.md`.

**Evidence:** PG hashes are deterministic, rendered prose and receipts are excluded from hash inputs, and every PG-authoring skill must use `compute-pg-hashes.js`; markdown page plans are written directly after patch submission.

**Why it matters in actual branching play:** If a formatting or file-write glitch changes the page plan after the PG record is accepted, the committed `PG.plan.plan_hash` no longer proves the renderer prompt that was actually stored. Prose-attach catches it later, but the bundle index could already advertise a healthy page plan.

**Issue type:** implementation/test gap.

**Concrete recommendation:** Add a post-write plan-hash verification step before bundle `INDEX.md` update.

**Mechanical consumer:** deterministic hash helper; bootstrap/turn-cycle write flow; tests.

**Schema change required:** No.

**Validator/test change required:** Yes.

**Deterministic or judgment-assisted:** Deterministic.

---

### **F6 — P2 — “Eight gates in every state-changing story-pipeline skill” wording is too broad for non-PG skills**

**Affected files:** FOUNDATIONS, story-state-contract, possibly HARD-GATE-DISCIPLINE wording.

**Problem:** The eight shared hard gates are page-plan commit gates. Non-PG skills such as prose-attach, health-audit, story-fact-promotion-to-canon, and closeout preserve the same invariants through skill-local gates, but they do not all produce `PG.validation_trace`.

**Evidence:** story-state-contract says the eight gates validate page-plan commit; prose-attach has receipt checks; promotion has scope/firewall/downstream checks; closeout has linked-output and disposition checks.

**Why it matters in actual branching play:** Ambiguous wording can cause implementers to invent fake PG-style traces for non-PG artifacts or duplicate gates unnecessarily.

**Issue type:** stale wording / cross-skill drift.

**Concrete recommendation:** Clarify that PG-authoring skills use the eight gates; non-PG story skills enforce the same invariants through their own validation phases.

**Schema change required:** No.

**Validator/test change required:** No, unless tests assert doc strings.

**Deterministic or judgment-assisted:** Deterministic wording cleanup.

---

### **F7 — P2 — “Known integration debt” notes may be stale or inconsistent**

**Affected files:** health-audit, commitment-block-authoring, story-fact-promotion-to-canon, story-promotion-closeout.

**Problem:** Several skills still list MCPENH / PEENH / VALENH integration debt, while closeout says at least `create_bel_record` has landed. The actual code was not inspectable, so this cannot be resolved from the uploaded corpus.

**Why it matters in actual branching play:** Stale “known debt” makes operators distrust valid op paths or miss real missing op/schema paths.

**Issue type:** stale wording; implementation/test gap.

**Concrete recommendation:** After code inspection, update all known-debt sections consistently: fixed, still open, or superseded.

**Schema change required:** No.

**Validator/test change required:** Possibly, depending on code.

**Deterministic or judgment-assisted:** Deterministic once code is available.

---

### **F8 — Optional / P2 — `reports/prose-quality-instructions.md` was not available**

**Affected files:** bootstrap, turn-cycle, story-state-contract.

**Problem:** Page plans require verbatim §2 / §3 / §19 from `reports/prose-quality-instructions.md`, but that file was not uploaded/discoverable.

**Why it matters in actual branching play:** The page plan’s self-contained external-renderer contract depends on that source.

**Issue type:** missing audit source.

**Concrete recommendation:** Include the prose-quality source in the next audit and add exact-inlining tests.

**Schema change required:** No.

**Validator/test change required:** Yes, test only.

**Deterministic or judgment-assisted:** Deterministic.

---

## **6. Exact proposed amendments**

### **A1 — Fix prose-attach Mystery Reserve retrieval field**

**File:** `SKILL(2).md` / `branching-story-prose-attach`  
 **Section:** Phase 3, check 3, `forbidden_mystery_resolution`  
 **Operation:** Replace.

**Replacement wording:**

3. **`forbidden_mystery_resolution`** (`PASS | FAIL`) — retrieve firewall fields for every `M-<integer>` named in plan §11 via `mcp__worldloom__get_firewall_content(world_slug, m_ids=<plan §11 ids>)`, unless the page plan already inlines the same fields. Derive deterministic checks from `disallowed_cheap_answers[]`, protected-answer titles/names explicitly listed in the Mystery Reserve record, and exact resolution strings implied by `unknowns[]` plus plan §11. Do not rely on an undocumented `denial_patterns` field.

Any direct assertion matching a disallowed cheap answer, or any statement that collapses a protected unknown into a single resolved answer, is `FAIL` and routes to `repair_recommendation: revise_prose`. Ambiguous cumulative narrowing that does not directly match a disallowed answer is recorded as a judgment-assisted note and routed to `branching-story-health-audit` mystery-accretion review when needed.

**Downstream affected:** prose-attach; bootstrap/turn-cycle page-plan §11 content; health-audit mystery-accretion review.

**Validators/tests to add/change:** prose-attach fixture tests for `disallowed_cheap_answers`, missing M id, and semantic narrowing note.

**Patch-engine/MCP changes:** No patch-engine change. MCP already documents `get_firewall_content`; test that prose-attach uses it.

**Migration impact:** None.

**Pre-fix expected failure:** A forbidden mystery can slip if no `denial_patterns` field exists.

**Post-fix expected pass condition:** A prose file that states a disallowed cheap answer fails receipt deterministically.

---

### **A2 — Clarify turn-cycle context packet seed resolution**

**File:** `SKILL(3).md` / `branching-story-turn-cycle`  
 **Section:** World-State Prerequisites, context-packet bullet  
 **Operation:** Replace.

**Replacement wording:**

World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>, token_budget=<default>)`.

Derive `seed_nodes` from the parent snapshot by resolving story-local state to world-scope anchors: active `STENT.bound_char_id` / resolved world `ENT` ids, `STLOC.bound_ent` or governing SEC / CF ids for the current location, `M-<integer>` ids from `PG.state_snapshot.unresolved_mystery_claims[]`, and active-period CH / SEC / CF ids when known. Do not pass `STENT`, `STLOC`, `SF`, `BEL`, `PG`, `SE`, `CHC`, or `SLT` ids as context-packet `seed_nodes`; load those through `story_slug` + `story_bundle_context`, `get_records`, or `list_records`.

**Downstream affected:** turn-cycle; context-packet integration tests; MCP warning handling.

**Validators/tests to add/change:** `context_packet_story_turn_cycle_story_local_seed_warns_and_skill_reroutes`.

**Patch-engine/MCP changes:** No schema change. Possibly add a skill-side preflight check that rejects story-local seed IDs before MCP call.

**Migration impact:** None.

**Pre-fix expected failure:** Skill may call context packet with story-local IDs and receive ignored seeds.

**Post-fix expected pass condition:** Skill passes only world-scope seeds and loads story-local records through story-bundle retrieval.

---

### **A3 — Fix closeout retrieval wording**

**File:** `SKILL(6).md` / `story-promotion-closeout`  
 **Section:** FOUNDATIONS Alignment, Tooling Recommendation row  
 **Operation:** Replace.

**Replacement wording:**

Linked canon-addition records are loaded read-only through `mcp__worldloom__get_records(record_ids=<linked_cf_ids + linked_ch_ids>, world_slug=<world_slug>)` and per-PA `mcp__worldloom__get_record(record_id=<linked_pa_id>, world_slug=<world_slug>)`. No context packet is needed because the accepted-output ids are known. Direct world-canon `_source` file reads are not used for linked-output verification.

**Downstream affected:** closeout; MCP retrieval tests.

**Validators/tests to add/change:** `closeout_linked_records_verified_or_abort`.

**Patch-engine/MCP changes:** None.

**Migration impact:** None.

**Pre-fix expected failure:** A closeout may appear to permit direct file reads for CF / CH / PA.

**Post-fix expected pass condition:** Missing linked CF / CH / PA from MCP retrieval aborts before any write.

---

### **A4 — Add post-write plan-hash verification**

**Files:** `story-state-contract.md`, `SKILL.md` / bootstrap, `SKILL(3).md` / turn-cycle  
 **Sections:** shared write order; bootstrap Phase 10; turn-cycle Phase 10  
 **Operation:** Add.

**Wording to add after page-plan direct write and before `INDEX.md` update:**

After writing `pages-prose-plans/<PG-id>.md`, immediately re-read the file bytes and recompute the plan hash with the same canonical helper used by `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`. The recomputed hash MUST equal the committed `PG.plan.plan_hash` before `INDEX.md` is updated. If it differs, treat this as a direct-artifact partial failure: do not update `INDEX.md`; surface the mismatch; repair the file to the already-approved bytes or re-run approval if the page-plan content changes.

**Downstream affected:** bootstrap, turn-cycle, health-audit, prose-attach.

**Validators/tests to add/change:** `bootstrap_plan_hash_postwrite_mismatch_blocks_index`, `turn_cycle_plan_hash_postwrite_mismatch_blocks_index`.

**Patch-engine/MCP changes:** None.

**Migration impact:** None for existing pages; applies to new writes.

**Pre-fix expected failure:** Direct-written page plan can drift before index update.

**Post-fix expected pass condition:** `INDEX.md` is not updated when plan bytes mismatch `PG.plan.plan_hash`.

---

### **A5 — Clarify eight-gate scope**

**Files:** `story-state-contract.md`, `FOUNDATIONS.md`  
 **Sections:** story-state-contract §7; FOUNDATIONS Rule 7 firewall paragraph  
 **Operation:** Clarify.

**Replacement wording for story-state-contract §7 opening:**

Every PG-authoring story skill validates these eight gates at page-plan commit. Non-PG story skills preserve the same invariants through their skill-local validation phases and HARD-GATE discipline; when they emit audit-only SE records, §4.3a applies.

**Replacement wording for FOUNDATIONS Rule 7 firewall paragraph:**

For PG-authoring state changes, the authoritative Mystery / invariant firewall is gate 3 of the shared eight hard gates. Non-PG story skills enforce the same firewall through their own named validation phases. The deterministic forbidden-mystery-resolution check inside `branching-story-prose-attach` remains a redundant downstream guard on rendered prose, not a second authoritative state-transition gate.

**Downstream affected:** all seven skills, but wording only.

**Validators/tests to add/change:** None.

**Patch-engine/MCP changes:** None.

**Migration impact:** None.

**Pre-fix expected failure:** Implementers may try to fake PG-style eight-gate traces for non-PG artifacts.

**Post-fix expected pass condition:** PG-authoring and non-PG skill validation surfaces remain distinct.

---

## **7. Cross-skill / code propagation matrix**

| Change | FOUNDATIONS | story-state-contract | Context packet | HARD-GATE | Machine-facing | bootstrap | turn-cycle | prose-attach | commitment-block | health-audit | promotion | closeout | MCP/retrieval | patch-engine | validators | schemas | tests | migrations |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| A1 Mystery firewall field fix |  |  |  |  |  | §11 plan content | §11 plan content | **X** |  | mystery-accretion alignment |  |  | **X** |  | receipt validator/tests |  | **X** |  |
| A2 turn-cycle seed clarification |  |  |  |  | maybe docs cross-ref |  | **X** |  |  |  |  |  | **X** |  |  |  | **X** |  |
| A3 closeout retrieval wording |  |  |  |  | maybe docs cross-ref |  |  |  |  |  |  | **X** | **X** |  |  |  | **X** |  |
| A4 post-write plan hash |  | **X** |  |  |  | **X** | **X** | reads result |  | reads result |  |  |  |  | snapshot/hash tests |  | **X** |  |
| A5 eight-gate scope wording | **X** | **X** |  | maybe |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| F1 implementation audit completion |  |  |  |  | **X** |  |  |  |  |  |  |  | **X** | **X** | **X** | **X** | **X** | **X** |
| F7 known-debt cleanup | maybe | maybe | maybe |  | maybe | maybe | maybe | maybe | maybe | maybe | maybe | maybe | maybe | maybe | maybe | maybe | maybe |  |

---

## **8. Validator and test plan**

| Test name | Purpose | Fixture shape | Expected pre-fix behavior | Expected post-fix behavior | Type | Likely file/area |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `bootstrap_root_page_accepts_story_start_input_nulls` | Root page bootstrap validity | PG-1 with null choice/write-in, `SE-1.story_start`, branch_path `[PG-1]` | Should pass if schema matches docs | Pass | Fixture/golden | story page schema / bootstrap |
| `turn_cycle_xor_choice_writein_legality` | Chosen choice vs write-in legality | One fixture with both, one with neither, one valid XOR | Unknown without tests | Invalid fail, valid pass | Deterministic | turn-cycle validator |
| `turn_cycle_impossible_writein_emits_world_block_se_and_plan` | Impossible write-in still produces SE/page plan | Write-in impossible under canon | Unknown | `SE.outcome_route: world_block`, resolution feedback, plan exists | Integration | turn-cycle |
| `observer_firewall_rejects_hidden_knowledge_choice` | Observer firewall violation | Actor lacks BEL/access route but CHC uses secret | Unknown | Fail gate 7 / audit finding | Deterministic | observer firewall validator |
| `expected_witness_bel_created_for_public_violence` | Social witness propagation | Public violent event with co-located witness | Unknown | BEL create/supersession required | Deterministic | turn-cycle / health-audit |
| `non_propagation_tag_required_for_uncovered_witness_group` | Social non-propagation rationale | Witness group not given BEL | Unknown | Requires parseable `non_propagation:*` tag | Deterministic | turn-cycle / health-audit |
| `death_incapacity_reconciles_debts_and_status` | Death/incapacity reconciliation | Actor dies with active STINT/OBL/SREL/STOBJ | Unknown | Same delta updates/ closes/transfers affected records | Integration | turn-cycle |
| `branch_isolation_rejects_sibling_active_record` | Branch isolation | PG snapshot includes record created on sibling branch | Unknown | Reject / audit error | Deterministic | branch isolation validator |
| `sibling_branch_counterfactuals_flagged_not_reconciled` | Sibling-branch contradiction | Two branches with contradictory SF authority | Unknown | Audit flag, no auto-reconvergence | Integration | health-audit |
| `cross_story_promotion_contradiction_error` | Sibling story contradiction | Two bundles promote contradictory canon candidates | Unknown | cross_story ERROR | Integration | health-audit cross_story |
| `mystery_accretion_chain_warns_or_errors` | Mystery accretion | Multi-page narrowing chain | Unknown | Flag overflow or judgment-assisted warning | Fixture/golden + judgment | health-audit |
| `prose_attach_disallowed_cheap_answer_fails` | Forbidden mystery protection | M record with `disallowed_cheap_answers`; prose asserts one | Likely fail to test if `denial_patterns` missing | Receipt FAIL | Deterministic | prose-attach |
| `canon_baseline_ch_window_required` | Canon baseline drift | Parent baseline older than two CH entries | Unknown | Must retrieve full CH window and cite CH id | Integration | turn-cycle / health-audit |
| `promotion_hold_blocks_canon_candidate_assertion` | Canon promotion hold | SE has `promotion_claims.authority: canon_candidate` | Unknown | State delta records only branch-local appearance | Deterministic | turn-cycle |
| `promotion_candidate_source_basis_purity` | Promotion proposal purity | SP package includes branch id inside candidate.source_basis | Unknown | Reject; branch evidence only in proposal_evidence | Deterministic | promotion |
| `closeout_linked_records_verified_or_abort` | Closeout fake-output defense | Accepted verdict with missing linked CF / CH / PA | Unknown | Abort before write | Integration | closeout / MCP |
| `prose_structural_invention_routes_repair` | Prose structural invention | Prose gives dead actor full agency / new law | Unknown | Receipt FAIL or WARN with repair path | Fixture/golden | prose-attach |
| `prose_receipt_does_not_mutate_pg` | Prose receipt does not mutate PG | Existing PG + failing prose receipt | Should be documented | PG unchanged, receipt written | Deterministic | prose-attach |
| `slt_any_alias_binding_instantiates_effects` | Storylet eligibility / alias binding | SLT uses `any_obligation_open(debt)` and `bound:debt` | Unknown | Bound id recorded in SE.alias_bindings | Deterministic | DSL / turn-cycle |
| `global_author_pool_rejects_branch_local_id` | Global author-pool branch leakage | Global SLT references record created after PG-1 outside branch path | Unknown | Reject | Deterministic | SLT validator |
| `health_unactionable_leaf_error` | Unactionable leaf detection | Open leaf, no CHC, no eligible SLT | Unknown | ERROR | Deterministic | health-audit |
| `choice_set_noncollapse_catches_cosmetic_choices` | Cosmetic choice detection | Multiple CHCs same material signature | Unknown | Fail unless marked rhetorical | Deterministic | choice validator |
| `terminal_requires_debt_proof` | Terminal proof with unresolved debts | Terminal page with high-urgency OBL not named | Unknown | Warning/error per health audit | Deterministic | health-audit |
| `context_packet_story_bootstrap_story_bundle_null` | Bootstrap context behavior | `task_type=story_bootstrap`, target story slug | Unknown | `story_bundle_context: null` | Integration | MCP |
| `context_packet_story_turn_cycle_story_local_seed_warns` | Story-local seed warning | `seed_nodes=[STENT-1]` | Unknown | Warning emitted; skill reroutes | Integration | MCP / turn-cycle |
| `patch_engine_accepts_required_story_ops_rejects_forbidden_fields` | Patch-engine schema acceptance/rejection | All story ops + forbidden legacy SLT field | Unknown | Required ops accepted; forbidden fields rejected | Property/integration | patch-engine/schema |
| `plan_hash_postwrite_mismatch_blocks_index` | Page-plan post-write integrity | Write altered plan bytes after PG commit | Currently unspecified | INDEX update blocked | Integration | bootstrap/turn-cycle |
| `pg_snapshot_replay_equals_se_deltas` | Page snapshot replay divergence | SE delta and PG snapshot mismatch | Unknown | `snapshot_replay_equality` fail | Deterministic | validator |
| `closeout_source_record_disposition_complete` | Closeout disposition completeness | Proposal source_records include SF/BEL; closeout omits BEL | Unknown | Abort | Deterministic | closeout |

---

## **9. Research synthesis**

The research does **not** justify a redesign. It mostly supports what Worldloom already does.

| Source | Lesson for Worldloom | Adopt / adapt / reject / note only | Fit with FOUNDATIONS |
| ----- | ----- | ----- | ----- |
| Emily Short on quality/salience-based narrative | Storylet systems work by selecting eligible chunks from a pool based on state variables / salience; this supports Worldloom’s `SLT` pool + predicate + saliency approach. | Already implemented | Fits. Reinforces local salience over global plot shape. |
| Comme il Faut / Prom Week | Reusable social norms and social interactions can reduce authoring burden for large social possibility spaces. | Adapt | Worldloom already uses BEL/SREL/expected witnesses. Adapt only as tests for social propagation; reject a global social AI layer unless evidence demands it. |
| Versu | Social-practice modeling can encode roles, conversation, motivations, beliefs, and social context. | Adapt | Fits as `ritual_protocol`, `SREL`, `BEL`, and institution-grounded SLTs. Reject autonomous NPC simulation as authority over PG/SE. |
| Riedl & Young narrative planning / IPOCL | Causal progression and character intentionality improve narrative understandability. | Adapt / reject | Adapt motivation-grounding audits. Reject goal-state plot planning because FOUNDATIONS forbids global drama planning. |
| Generative Agents | Memory, reflection, and planning can produce believable emergent social behavior. | Note / reject broad form | Use as support for provenance-rich BEL/access routes. Reject overbroad narrator memory or autonomous agent plans mutating story state. |
| Scheherazade-IF | Executable plot graphs can define legal event spaces for interactive narratives. | Note / partial reject | Worldloom should keep legality, but not adopt plot graphs as author-intended event order rails. Use only as inspiration for graph-validation tests. |
| KG-assisted LLM storytelling | Knowledge graphs can improve long-form coherence and user control in generated stories. | Already implemented / adapt | Worldloom’s MCP/index/story-bundle records are already the stronger version. Add retrieval/validator tests, not more schema fields. |
| ConStory-Bench / consistency bug taxonomy | Long-form LLM narratives need evidence-backed consistency checks; automated checkers should support judgments with exact textual evidence. | Adapt | Fits HARD-GATE evidence discipline and prose receipts. Supports exact evidence in audit findings, not LLM memory. |

Research-backed amendment impact: only A1 and the test plan are materially research-supported. The research does **not** justify act structure, word counts, automatic reconvergence, or prose-as-state.

---

## **10. Anti-recommendations**

| Rejected idea | Why it would damage this architecture |
| ----- | ----- |
| Dramatic act structure | It would replace present-causal obligations with future shape obligations, suppressing coherent player moves. |
| Midpoint / climax / “refusal of call” tracking | Same failure mode: it encodes story-shape expectations instead of causal truth. |
| Global drama manager | It would optimize toward a target narrative and reintroduce rails through selection pressure. |
| Word-count targets | FOUNDATIONS explicitly rejects them because they cause padding/truncation; pacing should come from beats and stopping point. |
| Prose-as-state | Would break replay, branch forking, and PG authority. Prose must stay receipt-only. |
| Overbroad LLM narrator memory | Would bypass BEL/SF/PG/SE evidence discipline and allow model memory to become hidden state. |
| Automatic branch reconvergence | Would erase branch-local counterfactuals and sibling contradictions that should remain auditable. |
| Global rumor graph | Tempting, but currently duplicate. BEL visibility, expected witnesses, non-propagation tags, and health-audit checks already cover propagation. Add tests first. |
| Schema bloat | Violates schema-minimalism; every new field must have a mechanical consumer. |
| Widening story-local truth into canon | Violates canon/story separation and promotion discipline. |
| Bypassing HARD-GATE or patch engine | Destroys approval-token integrity, append-only discipline, and engine-controlled write ordering. |
| Adding `denial_patterns` just because prose-attach mentions it | Wrong fix. Use existing Mystery Reserve firewall fields first; add a field only if a validator and retrieval path consume it. |

---

## **11. Implementation order**

### **P0 — Before any production story**

1. **Inspect actual code and schemas.** Verify `record_schema_compliance`, `snapshot_replay_equality`, `choice_set_noncollapse`, `causal_dependency_threat_scan`, `recursive_reference_closure`, patch-engine op schemas, MCP task profiles, `get_firewall_content`, and `compute-pg-hashes`.  
2. **Run or create the deterministic tests in Section 8.**  
3. **Verify all story ops exist:** `create_pg_record`, `create_se_record`, `create_bel_record`, `create_ststat_record`, `create_chc_record`, `create_slt_record`, `append_story_diegetic_artifact_record`, and closeout supersession ops.  
4. **Resolve stale integration-debt notes** after code inspection.

### **P1 — Before large-scale red-team testing**

1. Apply A1: prose-attach Mystery Reserve retrieval fix.  
2. Apply A2: turn-cycle context-packet seed clarification.  
3. Apply A3: closeout linked-output MCP wording.  
4. Apply A4: post-write page-plan hash verification.  
5. Add adversarial branch fixtures: early death, public lie, impossible write-in, protected mystery near-miss, sibling-branch contradiction, canon-baseline drift.

### **P2 — After the first red-team story bundle**

1. Apply A5 wording cleanup if implementers show confusion.  
2. Expand health-audit fixture/golden tests for saliency starvation, unactionable leaves, and cross-story contradictions.  
3. Add research-inspired social-propagation fixtures only where current tests reveal gaps.

### **Optional future research**

1. Explore social-practice templates as **SLT authoring aids**, not engine-level social simulation.  
2. Explore KG-assisted story QA as audit tooling over existing PG/SE/BEL/SF records.  
3. Explore LLM-assisted judgment only where deterministic validators already provide evidence anchors.

---

## **12. Final readiness checklist**

### **Ready for first red-team bundle**

* Architecture is coherent enough to red-team.  
* All seven story-pipeline skills are present.  
* Shared authority docs are present.  
* No act-structure / drama-manager / word-count regression in inspected docs.  
* Prose remains non-authoritative over story state.  
* Story-local truth remains separate from world canon.  
* Actual schemas/validators/op schemas/tests inspected.  
* A1–A4 fixed or consciously accepted as red-team risks.

**Verdict:** Ready for a controlled first red-team bundle **only if implementation code exists and basic schema/patch/MCP smoke tests pass**.

### **Ready for production-story authoring**

* P0 implementation audit complete.  
* P1 amendments applied.  
* Required tests in Section 8 passing.  
* `reports/prose-quality-instructions.md` included and exact-inlining tested.  
* Closeout fake-output test passing.  
* Canon-baseline drift CH-window test passing.  
* Prose structural invention and forbidden mystery tests passing.

**Verdict:** Not yet certifiable from the uploaded corpus.

### **Ready for long-running multi-branch production use**

* Multi-branch replay fixtures pass.  
* Sibling branch and sibling story contradiction audits pass.  
* Canon drift over multiple CH entries passes.  
* Mystery accretion over long branch chains is tested.  
* Social propagation / non-propagation tests cover witnesses, rumors, institutions, artifacts, and misunderstandings.  
* Patch-engine op schema rejects forbidden legacy fields and accepts every required story record class.  
* Health-audit remediation cards route correctly without directly mutating state.

**Final blunt verdict:** The design is strong. The remaining risk is not “bad architecture”; it is **implementation verification and a few exact wording/retrieval fixes**. Do not redesign. Tighten the sharp edges, inspect the missing code, and test the hell out of the validators.

