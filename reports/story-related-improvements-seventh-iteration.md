# Worldloom Story Pipeline — Seventh-Iteration Audit

**Scope:** document-level audit of the supplied Worldloom story-pipeline corpus.  
**Date:** 2026-05-15.  
**Audit posture:** source-backed, implementation-sensitive, but implementation-unverified because the supplied corpus contains authority documents and skill documents, not validator / schema / MCP / patch-engine source code or tests.

---

## 1. Executive verdict

The current story-related system is **basically sound at the architecture level**, but **implementation-unverifiable from the supplied source**, **test-deficient from the supplied source**, and still carrying several **cross-skill / contract drifts** that should be fixed before relying on it for production story bundles.

Bluntly: the design direction is right. The present-causal-state architecture is much stronger than a plot-shape architecture for interactive branching fiction. The docs have absorbed most of the sixth-iteration concerns: no act structure, no global drama manager, no prose-as-state, full PG hash discipline, story-local seed discipline, closeout linked-record verification, BEL/SF separation, STSTAT-derived status, and canon-baseline drift by full CH window. The weak point is not the conceptual model. The weak point is that the implementation surfaces the prompt asked to verify were not supplied, and several doc-to-skill mismatches remain.

### Main remaining work

| Area | Verdict |
|---|---|
| Architecture | Mostly sound. Preserve it. |
| Schemas | Mostly sound in the shared contract, but implementation schemas were unavailable. |
| Validators | Conceptually specified; code unavailable. Confidence low. |
| Tests | Required but unavailable. Confidence low. |
| Skill wording | Needs targeted P1/P2 cleanup. |
| Retrieval / MCP | Contract is strong; implementation unavailable; consuming skill recovery wording incomplete. |
| Patch engine | Contract is strong; implementation unavailable. |
| Deployment / capability currency | Well documented; runtime unavailable. |
| Migration / fixture cleanup | Unverifiable. |
| Fixture / golden cleanup | Unverifiable. |

### Confidence split

| Confidence kind | Level | Reason |
|---|---:|---|
| Source-backed document confidence | Medium-high | The five authority docs and seven skills are present and mutually rich enough for a document-level audit. |
| Implementation confidence | Low | Validator, schema, MCP, patch-engine, hooks, and code artifacts are not supplied. |
| Test confidence | Low | No deterministic tests, fixtures, migrations, or golden files are supplied. |
| Runtime / deployed-capability confidence | Low | No `describe_capabilities`, running MCP output, or built validator bundle evidence is supplied. |

The system should not be called implementation-verified. It should be called **document-verified with implementation debt explicitly open**.

---

## 2. Source inventory and artifact availability

### 2.1 Files actually inspected

| Path supplied | Mapped role | Type | Inspected? | Notes |
|---|---|---|---|---|
| `Pasted text(4).txt` | User’s seventh-iteration audit prompt | prompt | Yes | Establishes required audit scope, authority order, required sections, failure modes, research requirement, and artifact availability gate. |
| `FOUNDATIONS(1).md` | `docs/FOUNDATIONS.md` | authority doc | Yes | Top authority. Governs story bundle principles, canon layers, mystery reserve, storage/write discipline, no act structure, no global drama manager, schema minimalism. |
| `story-state-contract(1).md` | `.claude/skills/_shared-templates/story-state-contract.md` | authority contract | Yes | Authoritative for story-bundle schemas, PG/SE lifecycle, hard gates, action routing, hashes, replay, write order, predicate DSL. |
| `CONTEXT-PACKET-CONTRACT(1).md` | `docs/CONTEXT-PACKET-CONTRACT.md` | retrieval contract | Yes | Governs packet shape, `story_bundle_context`, seed-node discipline, full-body delivery, persisted-summary recovery. |
| `HARD-GATE-DISCIPLINE(1).md` | `docs/HARD-GATE-DISCIPLINE.md` | approval / patch discipline doc | Yes | Governs HARD-GATE, approval tokens, validate / submit MCP and CLI equivalence, write order principles. |
| `MACHINE-FACING-LAYER(1).md` | `docs/MACHINE-FACING-LAYER.md` | operational doc | Yes | Governs index, MCP tools, patch engine, validators, hooks, capability discovery, stale bundle workaround. |
| `SKILL(7).md` | `branching-story-bootstrap` | story skill | Yes | Present. PG-authoring skill. |
| `SKILL(8).md` | `branching-story-health-audit` | story skill | Yes | Present. Audit skill. |
| `SKILL(9).md` | `branching-story-prose-attach` | story skill | Yes | Present. Receipt/prose validator. |
| `SKILL(10).md` | `branching-story-turn-cycle` | story skill | Yes | Present. PG-authoring skill. |
| `SKILL(11).md` | `commitment-block-authoring` | story skill | Yes | Present. SLT authoring skill. |
| `SKILL(12).md` | `story-fact-promotion-to-canon` | story skill | Yes | Present. Proposal-package skill. |
| `SKILL(13).md` | `story-promotion-closeout` | story skill | Yes | Present. Promotion closeout skill. |

All seven required story-pipeline skills are present.

### 2.2 Expected implementation artifacts not supplied

| Expected artifact family | Availability classification | Confidence impact |
|---|---|---|
| Story-bundle JSON/YAML schema files | Missing from supplied corpus | Cannot verify schema strictness or field rejection. |
| Validator schemas | Missing from supplied corpus | Cannot verify validator/source contract drift. |
| Validator implementations | Missing from supplied corpus | Cannot verify `record_schema_compliance`, replay, branch isolation, BEL/STSTAT, Mystery Reserve, canon drift, or choice validators. |
| Validator registration / dispatch | Missing from supplied corpus | Cannot verify that named validators actually run. |
| `record_schema_compliance` | Implementation unavailable, doc-only inference required | Cannot claim enforcement. |
| `snapshot_replay_equality` | Implementation unavailable, doc-only inference required | Cannot claim replay correctness. |
| `choice_set_noncollapse` | Implementation unavailable, doc-only inference required | Cannot claim choice menu enforcement. |
| `causal_dependency_threat_scan` | Implementation unavailable, doc-only inference required | Cannot claim dependency-clobber enforcement. |
| Branch-isolation validators | Implementation unavailable, doc-only inference required | Cannot claim runtime prevention. |
| Observer-firewall / BEL / STSTAT validators | Implementation unavailable, doc-only inference required | Cannot claim runtime prevention. |
| Mystery Reserve validators | Implementation unavailable, doc-only inference required | Cannot claim deterministic firewall enforcement. |
| Canon-baseline drift validators | Implementation unavailable, doc-only inference required | Cannot claim CH-window traversal implementation. |
| Patch-engine envelope schema | Implementation unavailable, doc-only inference required | Cannot verify op acceptance/rejection. |
| Patch-engine per-op schemas | Implementation unavailable, doc-only inference required | Cannot verify story-record op coverage. |
| Story-bundle patch ops | Implementation unavailable, doc-only inference required | Cannot verify all required ops exist. |
| Patch-engine write-order / atomicity code | Implementation unavailable, doc-only inference required | Cannot verify two-phase commit or tiered order. |
| Approval-token validation | Implementation unavailable, doc-only inference required | Cannot verify HMAC, single-use, expiry, or plan binding. |
| MCP retrieval implementation | Implementation unavailable, doc-only inference required | Cannot verify `story_bundle_context`, warnings, or persisted-summary recovery. |
| Context-packet story task profiles | Implementation unavailable, doc-only inference required | Contract present; code absent. |
| Targeted retrieval tools | Implementation unavailable, doc-only inference required | Tool contracts present; code absent. |
| Hooks blocking raw reads/writes | Implementation unavailable, doc-only inference required | Hook behavior documented but not inspected. |
| Tests / fixtures / migrations / golden files | Missing from supplied corpus | Cannot verify any deterministic coverage. |
| Fifth/sixth iteration reports | Missing from supplied corpus | Prior issue status mostly unverifiable, except where current docs mention known debts. |
| Accepted tickets / commits / migration notes | Missing from supplied corpus | Cannot verify rollout completion. |
| `reports/prose-quality-instructions.md` | Referenced by docs but not found | Page-plan self-contained contract cannot be fully verified. |
| `templates/proposal-package.yaml` | Referenced by skill but not found | Proposal package shape only skill-defined here. |
| `templates/story-promotion-ledger.md` | Referenced by skill but not found | Ledger template unavailable. |

### 2.3 Audit constraint

Because code, schemas, tests, fixtures, and runtime introspection were unavailable, every implementation statement below is either:

1. **doc-level verified**, when present in the authority docs / skills; or
2. **implementation-unverified**, when the doc claims an implementation behavior but no code/test/runtime artifact was supplied.

---

## 3. Authority extraction

### 3.1 Authority order used

1. `FOUNDATIONS.md`.
2. `story-state-contract.md`, unless contradicted by `FOUNDATIONS.md`.
3. Individual skills, which must not redefine shared schemas or lifecycle rules.
4. `CONTEXT-PACKET-CONTRACT.md`.
5. `HARD-GATE-DISCIPLINE.md`.
6. `MACHINE-FACING-LAYER.md`.
7. Machine-facing code, schemas, validators, MCP, patch engine, hooks, and tests should operationalize those docs — but were unavailable.
8. Where docs and code would disagree, classification would be docs stale / code stale / tests stale / schemas stale / ambiguous authority / unclear rollout. No such implementation comparison was possible.

### 3.2 Binding rules that matter

#### FOUNDATIONS constraints

- Worldloom rejects dramatic act structure, midpoint/climax tracking, global drama managers, plot rails, fixed endings, word-count targets, prose-as-state, overbroad narrator memory, automatic reconvergence, and story-skill world-canon mutation outside `story-fact-promotion-to-canon → canon-addition → story-promotion-closeout`.
- Story engine is present-causal-state: it tracks what is true now and what that licenses next.
- Story-bundle records are story-local. They do not become world canon without the promotion path.
- Mystery Reserve is bounded and protected; forbidden mysteries must never be resolved.
- BEL and SF are separate: BEL is what a holder believes / claims / witnesses / lies about; SF is branch truth.
- STSTAT carries life / agency / location; `PG.state_snapshot.entity_status` is derived from active STSTAT.
- Schema minimalism is binding: every field must be consumed by a validator, replay primitive, predicate, fork operation, retrieval path, patch-engine op, audit-trail rule, or deterministic test.

#### Story-state contract rules

- PG is authoritative at page-plan commit.
- Rendered prose and prose receipts are publication artifacts, not PG fields.
- Any committed PG can be a parent for turn-cycle, regardless of prose rendering.
- Every player action, including impossible ones, produces an SE and a page plan. Silent rejection is broken.
- PG-authoring skills must run eight hard gates: input legality, parent snapshot compatibility, mystery/invariant firewall, branch isolation, append-only delta, consequence/terminal proof, plan grounding, canon promotion hold.
- `event_kind: prose_attach` and `event_kind: promotion_closeout` are audit-only SE records: no PG input, no branch snapshot mutation, no state delta.
- PG hashes must be computed by canonical `compute-pg-hashes` helper; hand-rolled hashing is forbidden.
- Page-plan direct writes must be post-write hash-verified before `INDEX.md` updates.
- Branching / rewind must load the parent snapshot only; no sibling-branch prose for state assembly.
- Canon-baseline drift must use full intervening CH window and affected-CF traversal, not just latest CH.

#### Context-packet contract rules

- Story-pipeline `seed_nodes` are world-scope / hybrid world records only. Story-local ids must come through `story_slug`, `story_bundle_context`, or targeted retrieval.
- Story-pipeline task types requiring bundle context must supply `story_slug`; bootstrap uses target slug with null `story_bundle_context`.
- Latest CH in packet is only a drift trigger; CH window and reverse lookup are classification evidence.
- Oversized packet / get-records / envelope-schema results may return `persisted_with_summary`; consumers must use `get_persisted_packet_slice` or narrower retrieval.

#### HARD-GATE rules

- Every skill must complete pre-flight, analysis, validation, deliverable summary, explicit user approval, then patch-engine submission / direct writes as appropriate.
- Approval tokens are single-use, expiry-bound, plan-bound.
- MCP validate/submit paths and CLI validate/submit paths are documented as equivalent.
- Auto Mode does not relax gates.
- Skills do not git commit.

#### Machine-facing layer rules

- Retrieval should use MCP tools, not raw world-canon reads.
- `describe_envelope_schema` is the machine-readable path for op payloads.
- `describe_capabilities` is the deployed server currency check.
- Stale validator bundles require rebuild + restart; CLI is a fresh-process workaround.
- Hooks are intended to block raw writes to engine-only `_source` surfaces.

---

## 4. Prior-iteration status table

No fifth-iteration report, sixth-iteration report, accepted-proposal tickets, commits, or migration notes were supplied. Current-source status can only be inferred where the current docs and skills explicitly mention landed items.

| Prior issue / proposal | Current status | Evidence | Remaining work | Regression risk |
|---|---|---|---|---|
| Prose-attach Mystery Reserve fields should not rely on undocumented fields | Fixed at doc level | Prose-attach uses `get_firewall_content` fields or plan-inlined fields only; no undocumented fields are named. | Implementation/test verification missing. | Medium if implementation still reads old fields. |
| Turn-cycle context-packet seed nodes should be world-scope only | Partially fixed | Contract and turn-cycle explicitly forbid story-local seed ids. | Turn-cycle also names unsupported schema fields for anchor derivation. | Medium. |
| Closeout should verify linked CF / CH / PA via MCP | Fixed at doc level | Closeout pre-flight requires MCP retrieval of linked CF/CH and PA. | Implementation/test verification missing. | Medium if code still reads raw files. |
| Page-plan hash post-write verification before INDEX update | Fixed at doc level | Shared write order, bootstrap, and turn-cycle include post-write verification. | Implementation/test verification missing. | Medium. |
| PG-authoring skills should use canonical `compute-pg-hashes.js` | Fixed at doc level | Bootstrap and turn-cycle use canonical CLI. | Contract runtime path wording has minor TS/JS drift. | Low-medium. |
| Persisted-summary recovery | Partially fixed | Context/MFL contracts define it. | Consuming skills do not consistently state recovery branches. | High under oversized packets. |
| Patch-engine op schema coverage | Unverifiable | Skills list op names. | Code/schema unavailable. | High. |
| Direct-write artifacts separated from `_source/*.yaml` | Fixed at doc level | Shared write order and skills separate direct markdown from patch-engine records. | Hook/code verification missing. | Medium. |
| Audit-only `prose_attach` / `promotion_closeout` no-op replay | Fixed at doc level | Shared SE §4.3a and health-audit replay no-op. | Validator/replay implementation unavailable. | Medium. |
| Known integration debt notes current | Unverifiable / partially stale risk | Some skills claim code paths “now landed”; code not supplied. | Convert claims to runtime capability checks or provide implementation evidence. | Medium. |

---

## 5. What should not change

These decisions are correct and should be preserved.

1. **Present-causal-state discipline.** It is the reason the engine can survive player refusal, early deaths, branch divergence, secrets, and abandoned threads without railroading.
2. **No act structure.** Act structures encode future dramatic obligations; the story pipeline needs present causal obligations.
3. **No global drama manager.** Local salience plus hard gates is enough; a global target-shape selector would suppress coherent player choices.
4. **Plan-authority boundary.** PG is real at page-plan commit; prose is a receipt / rendering, not a second state transition.
5. **Prose as receipt, not state.** Prose can fail validation, but PG/SE/state snapshots remain authoritative.
6. **Branch-local story truth separate from world canon.** SF/BEL/SE can hold branch truth or candidates; world-canon mutation stays gated by promotion + canon-addition.
7. **BEL/SF separation.** This is essential for lies, rumors, contested claims, witness asymmetry, and propaganda.
8. **STSTAT-derived entity status.** Life / agency / location need replayable records, not prose interpretations.
9. **Mystery Reserve firewall.** Protected unknowns are not weak memory gaps; they are design constraints.
10. **HARD-GATE / patch-engine discipline.** Approval, token binding, validation, and patch submission keep user control and write atomicity.
11. **Context packet plus targeted retrieval.** The packet identifies relevant nodes; targeted retrieval supplies full bodies and slices.
12. **Schema minimalism.** The current system is already large. Add tests and validators before adding fields.
13. **Local salience over global plot optimization.** Storylet urgency and eligibility are appropriate; global plot optimization is not.
14. **Append-only / supersession discipline.** This is the backbone of replay and audit.
15. **Audit-only SE no-op replay discipline.** Optional prose/promotion ledger events should not mutate branch snapshots.

---

## 6. Red-team support matrix

This matrix classifies **document-level support**. Implementation/test confidence remains low unless noted.

| Failure mode | Current support | Mechanism / source evidence | Notes |
|---|---|---|---|
| Player kills or incapacitates a major actor early | Handled but undertested | Turn-cycle treats deaths/removals as first-class, uses STSTAT supersession, and requires same-delta reconciliation of intentions, obligations, relationships, witness beliefs, objects, and future choice availability. Health audit checks causal dependency health. | Implementation unavailable. |
| Player refuses the premise | Handled but undertested | Action routing includes `world_block`, `accommodate`, `attempt`, and `terminal`; silent rejection is forbidden. | No act-structure rails proposed. |
| Player abandons the current thread | Handled but undertested | OBL/CNSQ/THR/STINT active records with urgency; health-audit debt health and unactionable/ignored debt checks. | Needs fixtures. |
| Player lies publicly | Handled but undertested | BEL records model claims/deception separately from SF; health audit flags `lie_promoted_silently`. | Good model. Needs tests. |
| Player acts on unavailable information | Handled but undertested | Information / Observer Firewall over SLT selection, CHC emission, and character actions. | Needs deterministic and judgment-assisted tests. |
| Player attempts something impossible | Handled but undertested | `world_block` route still produces SE + page plan with rationale. | Good. |
| Player discovers or appears to discover protected mystery | Partially handled | Gate 3, prose-attach forbidden mystery scan, health-audit mystery accretion, promotion hold. | Cumulative accretion is judgment-assisted unless schema-backed policy exists. |
| Player creates branch-local counterfactual | Handled but undertested | `SF.authority: branch_local_counterfactual`; promotion rejects hard-canon promotion. | Needs branch tests. |
| Rendered prose invents structural fact | Handled but undertested | Prose receipt `invented_structural_fact` and repair recommendations. | One P1 path bug below: promotion claims lookup. |
| Canon changes after pages committed | Handled but undertested | PG `canon_revision`; full CH window + `find_sections_touched_by` traversal before drift classification. | Good doc-level fix. |
| Story-local claim proposed for canon promotion | Handled but undertested | `story-fact-promotion-to-canon` proposal package; canon-addition handoff; closeout. | Implementation missing. |
| Sibling branches contradict one another | Handled but undertested | Branch isolation, branch-local record vocabulary, health audit branch isolation / contradiction checks. | Contradiction may be legitimate; audit flags. |
| Sibling story bundles contradict one another | Handled but undertested | Health-audit `cross_story`; promotion downstream impact. | Flag-only, appropriate. |
| Social consequences propagate through witnesses, rumors, institutions, artifacts, misunderstandings | Handled but undertested | Expected witnesses, BEL creation/supersession, non-propagation tags, DA/STOBJ access routes. | Needs adversarial tests. |
| Expected social propagation does not occur | Handled but undertested | Health audit reports missing/malformed non-propagation tags and missing BELs. | Good. |
| Branch-local records leak into global author-pool storylets | Handled but undertested | Gate 4 and commitment-block branch-scope legality. | Needs validator code/test. |
| Storylet alias binding fails or binds wrong record | Handled but undertested | Closed predicate DSL, `bound:<alias>` same-SLT requirement, SE alias bindings, health-audit resolved-binding checks. | Needs deterministic tests. |
| Page snapshot replay diverges from SE deltas | Handled but implementation-unverified | Health-audit replay; `snapshot_replay_equality` named; STSTAT-derived entity status. | Code unavailable. |
| Terminal branch leaves unresolved debts without proof | Handled but undertested | Gate 6 terminal proof; health audit terminal rationale / orphan debt checks. | Good. |
| Accepted choices are cosmetic | Handled but undertested | Choice Consequence Integrity and `choice_set_noncollapse`. | Needs tests. |
| Non-terminal leaf becomes unactionable | Handled but undertested | Gate 6 and health audit `unactionable_leaf`. | Good. |
| Prose receipt fails but turn-cycle continues correctly from PG state | Handled doc-level | Plan-authority boundary; turn-cycle can advance from committed PG regardless of rendered prose. | Good. |
| Promotion closeout records fake or unresolved canon-addition outputs | Handled doc-level, implementation-unverified | Closeout pre-flight verifies linked CF/CH/PA via MCP retrieval. | Good; test required. |
| Context packet omits required governing records or story-bundle context | Handled by contract, implementation-unverified | Packet has required layer semantics, story_bundle_context, full-body reservation. | Code/test absent. |
| Patch-engine schemas permit forbidden records or reject required records | Unverifiable because source missing | Skills list required ops; schema code absent. | P1 verification need. |
| Persisted context-packet or get-records summary returned but consuming skill fails to retrieve slices | Partially handled | Contract documents recovery; consuming skills do not all specify recovery branches. | Finding WL-S7-P1-006. |
| Schema discovery or deployed MCP capability stale | Handled doc-level, runtime-unverified | `describe_capabilities`, `describe_envelope_schema`, rebuild/restart/CLI workaround. | Needs runtime test. |
| Validator bundle stale relative to rebuilt source | Handled doc-level, runtime-unverified | MFL stale-bundle workaround with CLI fresh process. | Needs operational test. |
| Page-plan direct write succeeds but bytes mismatch `PG.plan.plan_hash` | Handled doc-level | Shared write order + bootstrap/turn-cycle post-write verification. | Needs test. |
| Audit-only SE events accidentally enter page replay | Handled doc-level, implementation-unverified | SE §4.3a says no-op; health-audit replay treats no-op. | Needs replay test. |
| BEL/SF separation collapses because lie / rumor / contested claim becomes SF | Handled but undertested | BEL/SF separation and health-audit `lie_promoted_silently`. | Needs tests. |
| STSTAT-derived `entity_status` diverges from active status records | Handled but implementation-unverified | Schema says derived projection; replay validator named. | Needs validator/test. |
| Social non-propagation tags malformed / accepted without evidence | Handled but undertested | Closed tag grammar and health-audit malformed/missing tag findings. | Needs parser tests. |
| Canon-baseline drift uses only latest CH instead of full window | Handled doc-level, implementation-unverified | Contract and turn-cycle/health audit require full CH window + affected traversal. | Needs integration test. |

---

## 7. Cross-document and code comparison

### 7.1 Verified document-level drift

| Drift | Type | Summary |
|---|---|---|
| Turn-cycle seed derivation references unsupported fields | cross-skill / schema drift | Turn-cycle mentions `STENT.bound_ent_id` and `STLOC.governing_section_id`; shared schemas inspected only define `STENT.bound_char_id` and `STLOC.bound_ent`. |
| Prose-attach references `PG.SE.promotion_claims[]` | schema / lifecycle drift | PG does not contain SE; PG links to SE through `input.resolved_event_id`; SE holds `promotion_claims[]`. |
| Prose-attach optional SE write order | shared-write-order drift | Prose-attach writes receipt and INDEX before optional `create_se_record`; shared write order puts patch submit before direct artifacts and INDEX last. |
| Closeout proposal-package paths | cross-skill drift | Closeout refers to package `source_records[]` / branch path as if top-level; story-fact proposal package nests `source_records` and branch under `proposal_evidence`. |
| Closeout STSTAT output/ops | patch-op / skill drift | Output table includes STSTAT supersession; prerequisites, record schemas list, source disposition template, and Phase 5 op list omit STSTAT. |
| `PG.validation_trace.gates[]` wording | contract internal drift | PG schema and skills use flat mapping; §7 says `gates[]`. |
| Runtime CLI path wording | stale wording | Contract §10 references TS source path for CLI helper; skills invoke dist JS helper. |
| Prose-attach “No world-canon retrieval needed” | stale wording | Same skill uses `get_firewall_content` unless plan inlines firewall fields. |
| Health-audit `accretion_policy.max_clues or equivalent` | possible undocumented-field drift | Health audit references policy-backed M fields not defined in supplied M schema excerpts. Needs schema-discovery gating. |
| Known integration debt notes | rollout/capability drift risk | Skills claim code paths “now landed”; code unavailable. |

### 7.2 Implementation drift

No verified implementation drift can be reported because implementation source was not supplied.

### 7.3 Test drift

No verified test drift can be reported because tests, fixtures, migrations, and golden files were not supplied.

### 7.4 Source unavailable / unverifiable risks

- Patch-engine op schemas may not match skills.
- Validators may not implement named checks.
- MCP may not implement `story_local_seed_nodes_ignored`, persisted-summary recovery, or full-body reservation exactly.
- Hooks may not block story-bundle `_source/*.yaml`.
- Deployed MCP server may be stale relative to docs.
- Validator bundle may be stale relative to built source.
- Code may still use raw reads where docs require MCP retrieval.

---

## 8. Findings

### WL-S7-P1-001 — Turn-cycle seed derivation references unsupported story schema fields

**Severity:** P1  
**Affected files:** `branching-story-turn-cycle`; `story-state-contract.md`  
**Affected sections:** Turn-cycle World-State Prerequisites; `STENT` and `STLOC` schemas  
**Issue type:** schema mismatch / context-packet retrieval drift  
**Evidence level:** doc-level  
**Exact problem:** Turn-cycle derives world-scope `seed_nodes` through `STENT.bound_ent_id` and `STLOC.governing_section_id`, but the shared schemas only define `STENT.bound_char_id` and `STLOC.bound_ent`.  
**Why it matters:** If the skill follows unsupported fields, it can fail to derive world-scope seeds, accidentally pass story-local ids, or produce incomplete context.  
**Recommendation:** Rewrite seed derivation to use only schema-backed anchors: `STENT.bound_char_id`, `STLOC.bound_ent`, unresolved mystery M ids, active-period world anchors, and parent CF ids from active mirrored SF records. If no world anchor exists, do not seed that story-local record; load it through `story_slug` / `story_bundle_context` / targeted retrieval.  
**Mechanical consumer:** context-packet assembly; turn-cycle pre-flight; deterministic seed-node legality test.  
**Schema change required?** No.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** No unless implementation currently depends on unsupported fields.  
**Migration/fixture change required?** Possible if fixtures carry unsupported fields.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** medium; docs inspected, code unavailable.

---

### WL-S7-P1-002 — Prose-attach uses invalid `PG.SE.promotion_claims[]` path

**Severity:** P1  
**Affected files:** `branching-story-prose-attach`; `story-state-contract.md`  
**Affected sections:** Prose-attach Phase 1 / deterministic check 8; SE schema; PG input link  
**Issue type:** schema mismatch / prose lifecycle drift  
**Evidence level:** doc-level  
**Exact problem:** Prose-attach says canon-claim-without-authority should check corresponding `PG.SE.promotion_claims[]`; PG has no nested SE. The authoritative link is `PG.input.resolved_event_id`, and `promotion_claims[]` lives on SE.  
**Why it matters:** A prose page that asserts a canon claim with a valid promotion hold could be falsely failed, or an invalid assertion could pass if the check looks at the wrong object.  
**Recommendation:** Replace `PG.SE.promotion_claims[]` with: “Load the resolved SE via `PG.input.resolved_event_id`; inspect `SE.promotion_claims[]`.”  
**Mechanical consumer:** prose-attach deterministic check; receipt validation; canon-claim test.  
**Schema change required?** No.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** No.  
**Migration/fixture change required?** Fixtures with prose-attach cases may need update.  
**Deterministic vs judgment-assisted:** deterministic for path resolution; semantic claim detection remains judgment-assisted.  
**Confidence:** high doc-level; implementation unavailable.

---

### WL-S7-P1-003 — Prose-attach optional SE write path violates shared write order

**Severity:** P1  
**Affected files:** `branching-story-prose-attach`; `story-state-contract.md`  
**Affected sections:** Prose-attach Phase 6; shared write order §10  
**Issue type:** cross-skill drift / patch-engine discipline drift  
**Evidence level:** doc-level  
**Exact problem:** Shared write order requires patch-plan submission before direct artifacts and INDEX. Prose-attach, when `emit_attach_event: true`, writes receipt, updates INDEX, then submits optional `create_se_record`.  
**Why it matters:** INDEX could show attached prose while the optional ledger SE failed to commit, leaving inconsistent audit state.  
**Recommendation:** When `emit_attach_event=true`, build/validate/submit the audit-only SE patch first, then write the receipt, then update INDEX. If the optional patch fails, write no receipt/INDEX for that invocation and surface the failure, or rerun with `emit_attach_event=false` after user approval.  
**Mechanical consumer:** shared write order; patch-engine op; prose-attach integration test.  
**Schema change required?** No.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** No.  
**Migration/fixture change required?** No unless existing receipts rely on prior order.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** high doc-level.

---

### WL-S7-P1-004 — Closeout reads proposal package fields at the wrong level

**Severity:** P1  
**Affected files:** `story-promotion-closeout`; `story-fact-promotion-to-canon`  
**Affected sections:** Closeout prerequisites / Phase 2 / Phase 3 / ledger; proposal package shape  
**Issue type:** cross-skill drift  
**Evidence level:** doc-level  
**Exact problem:** The proposal package produced by `story-fact-promotion-to-canon` places branch and source records under `proposal_evidence.story_branch` and `proposal_evidence.source_records[]`. Closeout repeatedly refers to `source_records[]`, `branch_path`, and `source_records inventory` as if those were top-level.  
**Why it matters:** Closeout can fail to find source records, incorrectly mark disposition completeness, or close out the wrong branch.  
**Recommendation:** Update closeout to read `proposal_evidence.source_records[]` and `proposal_evidence.story_branch`. If legacy top-level fields ever existed, require an explicit migration / compatibility branch.  
**Mechanical consumer:** closeout disposition completeness gate; closeout fixture test.  
**Schema change required?** No if proposal package stays as currently defined.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** No.  
**Migration/fixture change required?** Maybe for legacy SP packages.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** high doc-level.

---

### WL-S7-P1-005 — Closeout STSTAT support is declared but not propagated into op/prereq/disposition wording

**Severity:** P1  
**Affected files:** `story-promotion-closeout`; `story-state-contract.md`; patch-engine op schema unavailable  
**Affected sections:** Closeout output table, prerequisites, Phase 2, Phase 3 disposition map, Phase 5 patch ops  
**Issue type:** cross-skill drift / patch-engine drift risk  
**Evidence level:** doc-level  
**Exact problem:** Closeout output table says STSTAT can be superseded for character-outcome evidence. But closeout’s prerequisites list output schemas as SF/BEL/STENT/SREL/DA/SE; the disposition map omits STSTAT; Phase 5 op list omits `create_ststat_record`.  
**Why it matters:** A character outcome that becomes canon-linked may need status-chain evidence updated or explicitly marked ledger-only. Current wording invites a supersession the patch plan does not include.  
**Recommendation:** Add STSTAT to closeout prerequisites, disposition template, Phase 2 verdict patterns, and Phase 5 op list with `create_ststat_record`; or remove STSTAT from the output table and explicitly make STSTAT evidence ledger-only. The smaller propagation-consistent fix is to add STSTAT where already implied.  
**Mechanical consumer:** patch-engine `create_ststat_record`; closeout disposition completeness gate; record_schema_compliance.  
**Schema change required?** No.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** Only if `create_ststat_record` is missing; implementation unavailable.  
**Migration/fixture change required?** Potentially.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** medium; code unavailable.

---

### WL-S7-P1-006 — Persisted-summary recovery is specified in contracts but under-specified in consuming skills

**Severity:** P1  
**Affected files:** all context-heavy story skills; especially turn-cycle, health-audit, story-fact-promotion, closeout, commitment-block-authoring  
**Affected sections:** Pre-flight retrieval, `get_records`, `describe_envelope_schema` usage  
**Issue type:** context-packet / retrieval drift  
**Evidence level:** doc-level  
**Exact problem:** `CONTEXT-PACKET-CONTRACT` and `MACHINE-FACING-LAYER` define `delivery_status: persisted_with_summary` and recovery by `get_persisted_packet_slice`. Skills usually say “load context packet” or “load get_records” but do not consistently require recovery when the tool returns only a summary.  
**Why it matters:** Under large bundles or broad CH windows, a skill may proceed from a summary, missing required governing records, story_bundle_context, linked CF/CH/PA bodies, or envelope schemas.  
**Recommendation:** Add a shared pre-flight recovery paragraph to every consuming skill: if `get_context_packet`, `get_records`, or `describe_envelope_schema` returns `persisted_with_summary`, immediately retrieve the required slices before analysis; summary-only metadata is not enough for validation rationales.  
**Mechanical consumer:** retrieval path; deterministic integration tests.  
**Schema change required?** No.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** No if tools already implement contract.  
**Migration/fixture change required?** No.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** medium; implementation unavailable.

---

### WL-S7-P2-007 — `PG.validation_trace.gates[]` wording conflicts with flat schema

**Severity:** P2  
**Affected files:** `story-state-contract.md`; all PG-authoring skills by reference  
**Affected sections:** §7 Eight Shared Hard Gates; PG schema §4.2  
**Issue type:** stale wording / schema mismatch  
**Evidence level:** doc-level  
**Exact problem:** §7 says gate results are recorded in `PG.validation_trace.gates[]`, but the PG schema and skills use a flat mapping (`input_legality`, `parent_snapshot_compatibility`, etc.).  
**Why it matters:** A validator or author might implement an array shape rejected by the schema, or accept two competing shapes.  
**Recommendation:** Replace `PG.validation_trace.gates[]` with `PG.validation_trace.<gate_key>` flat mapping.  
**Mechanical consumer:** record_schema_compliance; PG fixtures.  
**Schema change required?** No; wording cleanup.  
**Validator/test change required?** Yes: flat mapping pass, `gates[]` rejected.  
**MCP/patch-engine change required?** No.  
**Migration/fixture change required?** Only if fixtures use `gates[]`.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** high doc-level.

---

### WL-S7-P2-008 — Runtime hash helper path wording is inconsistent

**Severity:** P2  
**Affected files:** `story-state-contract.md`, PG-authoring skills  
**Affected sections:** shared write order §10; deterministic PG hash tooling §4.2a  
**Issue type:** stale wording  
**Evidence level:** doc-level  
**Exact problem:** §10 names the canonical helper at `tools/world-mcp/src/cli/compute-pg-hashes.ts`, but skills invoke `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`.  
**Why it matters:** Operators may invoke TS source path instead of runtime CLI, causing avoidable hash drift or command failures.  
**Recommendation:** State: “Implementation source: `tools/world-mcp/src/cli/compute-pg-hashes.ts`; runtime invocation: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js ...`.”  
**Mechanical consumer:** PG-authoring skill instructions; docs-lint.  
**Schema change required?** No.  
**Validator/test change required?** Optional docs-lint.  
**MCP/patch-engine change required?** No.  
**Migration/fixture change required?** No.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** high doc-level.

---

### WL-S7-P2-009 — Prose-attach says no world-canon retrieval is needed while requiring `get_firewall_content`

**Severity:** P2  
**Affected files:** `branching-story-prose-attach`  
**Affected sections:** FOUNDATIONS alignment / Tooling Recommendation row; Phase 3 check 3  
**Issue type:** stale wording  
**Evidence level:** doc-level  
**Exact problem:** Prose-attach says no world-canon retrieval is needed because the plan inlines canon, but its forbidden-mystery check retrieves firewall fields via `get_firewall_content` unless the plan already inlines them.  
**Why it matters:** A skill runner could skip required targeted retrieval and validate against incomplete plan excerpts.  
**Recommendation:** Replace with: “No context-packet retrieval is normally needed; targeted `get_firewall_content` is required when plan §11 does not inline the firewall fields.”  
**Mechanical consumer:** prose-attach pre-flight; firewall test.  
**Schema change required?** No.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** No.  
**Migration/fixture change required?** No.  
**Deterministic vs judgment-assisted:** deterministic for retrieval branch.  
**Confidence:** high doc-level.

---

### WL-S7-P2-010 — Health-audit mystery accretion policy references hypothetical M fields without schema-discovery discipline

**Severity:** P2  
**Affected files:** `branching-story-health-audit`; possibly M schema  
**Affected sections:** Phase 2e mystery accretion  
**Issue type:** missing validation / possible undocumented-field drift  
**Evidence level:** doc-level  
**Exact problem:** Health audit says to enforce `accretion_policy.max_clues or equivalent` if M exposes a validator-backed field, but does not require schema discovery before using it.  
**Why it matters:** This could repeat the same undocumented-Mystery-field problem the prompt explicitly asked to avoid.  
**Recommendation:** Add a schema-discovery guard: only enforce a policy field if `get_record_schema('mystery_reserve_entry')` or validator metadata exposes it; otherwise use schema-backed progression and judgment-assisted review.  
**Mechanical consumer:** health-audit mystery accretion; get_record_schema; deterministic test.  
**Schema change required?** No.  
**Validator/test change required?** Yes.  
**MCP/patch-engine change required?** No.  
**Migration/fixture change required?** No.  
**Deterministic vs judgment-assisted:** deterministic for schema discovery; accretion remains judgment-assisted without policy.  
**Confidence:** medium.

---

### WL-S7-P2-011 — Known integration-debt notes claim code verification that was not supplied

**Severity:** P2  
**Affected files:** skills with known debt notes; machine-facing docs  
**Affected sections:** known integration debt / landed claims  
**Issue type:** rollout / capability drift  
**Evidence level:** doc-level only; implementation missing  
**Exact problem:** Some skills claim items are “now landed” with exact code paths, but code was not supplied in this audit.  
**Why it matters:** A future audit could trust stale prose and miss deployed MCP / validator / patch-op drift.  
**Recommendation:** Treat these as implementation claims requiring `describe_capabilities`, `describe_envelope_schema`, and/or code/test evidence. In docs, prefer “expected deployed check” wording over “verified” unless a linked test/runtime proof is present.  
**Mechanical consumer:** deployed capability checks; docs-lint; audit-trail rule.  
**Schema change required?** No.  
**Validator/test change required?** Yes, capability currency tests.  
**MCP/patch-engine change required?** No unless capabilities mismatch.  
**Migration/fixture change required?** No.  
**Deterministic vs judgment-assisted:** deterministic.  
**Confidence:** medium.

---

## 9. Exact proposed amendments

### A1 — Fix turn-cycle seed derivation

**File:** `branching-story-turn-cycle/SKILL.md`  
**Section:** World-State Prerequisites  
**Operation:** replace

**Replace the seed derivation paragraph with:**

```markdown
World canon context packet via
`mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle',
story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>,
token_budget=<default>)`.

Derive `seed_nodes` only from schema-backed world-scope anchors:

- active `STENT.bound_char_id` values when non-null;
- active `STLOC.bound_ent` values when non-null;
- parent `PG.state_snapshot.unresolved_mystery_claims[].mystery_id`;
- parent CF ids named by active mirrored `SF.derived_from[]`;
- active-period `CH` / `SEC` / `CF` / `ENT` anchors only when already known from loaded world-canon context.

Do not derive seeds from story-local ids or from fields not present in the shared story-state contract. In particular, do not pass `STENT`, `STLOC`, `SF`, `BEL`, `PG`, `SE`, `CHC`, `SLT`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STOBJ`, `STSTAT`, `BR`, `SLB`, `SAU`, `SP`, or `RSP` ids as context-packet `seed_nodes`. Story-local records are loaded through `story_slug` + `story_bundle_context`, `mcp__worldloom__get_records(record_ids=..., story_slug=<story_slug>)`, or `mcp__worldloom__list_records(record_type=..., story_slug=<story_slug>)`.
```

**Downstream affected:** turn-cycle; context packet tests; any implementation seed derivation.  
**Validators/tests:** add seed derivation tests.  
**Patch/MCP changes:** none unless code currently expects unsupported fields.  
**Migration/fixture impact:** remove unsupported anchor fields from fixtures if present.  
**Pre-fix expected failure:** STLOC with only `bound_ent` fails to seed correctly if implementation looks for `governing_section_id`.  
**Post-fix pass condition:** only world-scope seed ids are passed; story-local records load through story-scoped retrieval.

---

### A2 — Fix prose-attach promotion-claims path

**File:** `branching-story-prose-attach/SKILL.md`  
**Section:** Phase 1 and Phase 3 check 8  
**Operation:** replace

**Replace:**

```markdown
including `plan.plan_hash`, `state_hash`, and `SE.promotion_claims[]` if any.
```

**With:**

```markdown
including `plan.plan_hash`, `state_hash`, and `input.resolved_event_id`. Load the resolved `SE-<integer>` through that id when the page's selected event, `resolution.player_visible_feedback`, or `promotion_claims[]` are needed.
```

**Replace:**

```markdown
without corresponding `PG.SE.promotion_claims[]` evidence
```

**With:**

```markdown
without corresponding `SE.promotion_claims[]` evidence on the event loaded through `PG.input.resolved_event_id`
```

**Downstream affected:** prose-attach receipt checks.  
**Tests:** prose-claim authority test.  
**Pre-fix expected failure:** valid SE promotion claim not detected because lookup path is wrong.  
**Post-fix pass condition:** prose attach loads resolved SE and correctly recognizes promotion claims.

---

### A3 — Fix prose-attach optional SE write order

**File:** `branching-story-prose-attach/SKILL.md`  
**Section:** Phase 6 Commit / Write  
**Operation:** replace

**Replacement ordering:**

```markdown
4. On approval:
   - If `emit_attach_event: true`, first build a single-op patch envelope with
     `create_se_record` for `event_kind: prose_attach` conforming to story-state
     contract §4.3a. Dry-run validate, obtain the approval token, and submit via
     `mcp__worldloom__submit_patch_plan`. If this optional patch fails, write no
     receipt or INDEX update for this invocation; surface the patch failure and
     allow the user to re-run with `emit_attach_event=false` or repair the patch.
   - Write `pages-prose-receipts/<page_id>.yaml`.
   - Update bundle `INDEX.md` to reflect prose status + receipt verdict.
```

**Downstream affected:** prose-attach only.  
**Tests:** integration test for write ordering.  
**Pre-fix expected failure:** receipt/INDEX can land while optional SE patch fails.  
**Post-fix pass condition:** patch failure blocks receipt/INDEX for `emit_attach_event=true`.

---

### A4 — Fix closeout proposal package paths

**File:** `story-promotion-closeout/SKILL.md`  
**Sections:** prerequisites, Phase 1, Phase 2, Phase 3 gate 6, ledger template  
**Operation:** replace/clarify

**Replacement wording:**

```markdown
Read source records from
`proposal_evidence.source_records[]` in
`SP-<integer>-proposal-package.yaml`. Read the source branch from
`proposal_evidence.story_branch`. Do not look for top-level `source_records[]`
or top-level `branch_path` in the current package shape.
```

**Disposition wording:**

```markdown
The `source_record_dispositions:` key set MUST exactly equal
`proposal_evidence.source_records[]`.
```

**Downstream affected:** closeout; proposal package fixtures.  
**Tests:** closeout fixture with current SP package shape.  
**Pre-fix expected failure:** closeout cannot find `source_records[]` at top level.  
**Post-fix pass condition:** closeout loads nested fields and validates disposition completeness.

---

### A5 — Propagate STSTAT closeout support

**File:** `story-promotion-closeout/SKILL.md`  
**Sections:** World-State Prerequisites; Phase 2; Phase 3; Phase 4 ledger; Phase 5 op list  
**Operation:** add

**Add STSTAT to read/write schema list:**

```markdown
`STSTAT` (§4.5.13) — may be superseded only when a source STSTAT in
`proposal_evidence.source_records[]` needs an amended-schema update after the
canon-addition verdict, such as character-outcome status evidence becoming
canon-linked or explicitly retained as branch-local after rejection.
```

**Add to disposition map:**

```yaml
STSTAT-<integer>: superseded | ledger_only | unchanged_no_schema_field_changed
```

**Add to Phase 5 op list:**

```markdown
`create_ststat_record` for STSTAT supersessions.
```

**Downstream affected:** closeout, patch-engine op schemas, record_schema_compliance, tests.  
**Patch-engine changes:** only if `create_ststat_record` is not currently implemented.  
**Pre-fix expected failure:** STSTAT source record marked superseded but no patch op exists.  
**Post-fix pass condition:** STSTAT dispositions and ops are complete, or ledger-only when no schema field changes.

---

### A6 — Add persisted-summary recovery wording to consuming skills

**Files:** bootstrap, turn-cycle, health-audit, commitment-block-authoring, story-fact-promotion-to-canon, closeout  
**Section:** Pre-flight Check  
**Operation:** add

**Shared paragraph:**

```markdown
If `get_context_packet`, `get_records`, or `describe_envelope_schema` returns
`delivery_status: persisted_with_summary`, the inline summary is not sufficient
for validation. Retrieve every load-bearing omitted slice via
`mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` before
continuing. For oversized `get_records`, retrieve `records[<N>].record.record`
for every required id. For oversized `describe_envelope_schema`, either
re-invoke with the specific `op_kind` or retrieve the relevant
`op_schemas.<op_kind>` slice. Validation rationales may cite only retrieved
records, fields, packet layers, slices, or validator results, not summary
metadata alone.
```

**Downstream affected:** all context-heavy skills, MCP retrieval tests.  
**Pre-fix expected failure:** skill continues from summary-only packet and misses load-bearing context.  
**Post-fix pass condition:** skill retrieves required slices before validation.

---

### A7 — Fix `validation_trace.gates[]` stale wording

**File:** `story-state-contract.md`  
**Section:** §7 Eight Shared Hard Gates  
**Operation:** replace

**Replace:**

```markdown
gate results are recorded in `PG.validation_trace.gates[]`
```

**With:**

```markdown
gate results are recorded in the flat `PG.validation_trace` mapping using the
eight schema keys defined in §4.2
```

**Downstream affected:** PG schema docs, bootstrap, turn-cycle, validators/tests.  
**Pre-fix expected failure:** alternate `gates[]` shape accepted or authored.  
**Post-fix pass condition:** only flat mapping is accepted.

---

### A8 — Clarify hash helper runtime path

**File:** `story-state-contract.md`  
**Section:** §10 Shared Write Order / §4.2a Tooling  
**Operation:** clarify

**Add:**

```markdown
Implementation source path: `tools/world-mcp/src/cli/compute-pg-hashes.ts`.
Runtime invocation path after build: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-md-path> --pg <pg-record-path>`.
```

---

### A9 — Correct prose-attach retrieval wording

**File:** `branching-story-prose-attach/SKILL.md`  
**Section:** FOUNDATIONS Alignment / Tooling Recommendation  
**Operation:** replace

**Replace:**

```markdown
No world-canon retrieval needed — plan body inlines all load-bearing canon per shared contract §8.
```

**With:**

```markdown
No context-packet retrieval is normally needed because the plan body inlines the load-bearing canon. Targeted `mcp__worldloom__get_firewall_content` retrieval is still required when plan §11 does not already inline the Mystery Reserve firewall fields used by the forbidden-mystery check.
```

---

### A10 — Gate health-audit accretion policy by schema discovery

**File:** `branching-story-health-audit/SKILL.md`  
**Section:** Phase 2e Mystery / canon safety  
**Operation:** clarify

**Replacement wording:**

```markdown
If `mcp__worldloom__get_record_schema(node_type='mystery_reserve_entry')` or
validator metadata exposes a concrete accretion-policy field, enforce that
field deterministically. Otherwise, do not inspect or infer undocumented M
fields; enforce only schema-backed progression and record cumulative collapse as
judgment-assisted.
```

---

## 10. Cross-skill / code propagation matrix

| Proposed change | FOUNDATIONS | Story contract | Context contract | HARD-GATE | MFL | Bootstrap | Turn-cycle | Prose attach | Commitment block | Health audit | Story promotion | Closeout | MCP | Patch engine | Validators | Schemas | Tests | Fixtures | Migrations | Deployed checks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 seed derivation | — | ref only | — | — | — | — | X | — | — | — | — | — | maybe | — | X | — | X | maybe | maybe | X |
| A2 prose SE path | — | ref only | — | — | — | — | — | X | — | — | — | — | maybe | — | X | — | X | X | — | — |
| A3 prose write order | — | X | — | X | — | — | — | X | — | — | — | — | — | maybe | X | — | X | — | — | — |
| A4 closeout package paths | — | — | — | — | — | — | — | — | — | — | X | X | maybe | — | X | maybe | X | X | maybe | — |
| A5 STSTAT closeout | — | ref only | — | — | — | — | — | — | — | — | — | X | maybe | X | X | maybe | X | X | maybe | X |
| A6 persisted recovery | — | — | X | — | X | X | X | — | X | X | X | X | X | — | — | — | X | X | — | X |
| A7 validation_trace wording | — | X | — | — | — | X | X | — | — | — | — | — | — | — | X | X | X | X | maybe | — |
| A8 hash helper path | — | X | — | — | X | X | X | — | — | — | — | — | — | — | — | — | docs-lint | — | — | — |
| A9 prose targeted retrieval | X | — | X | — | X | — | — | X | — | — | — | — | X | — | — | — | X | — | — | — |
| A10 accretion schema discovery | X | maybe | — | — | X | — | — | — | — | X | — | — | X | — | X | maybe | X | X | — | X |

---

## 11. Validator and test plan

### 11.1 P0 blocking tests

No P0 findings were identified from the supplied document corpus. The P1 tests below should still be run before production story use.

### 11.2 P1 red-team tests

| Test name | Purpose | Fixture shape | Expected pre-fix behavior | Expected post-fix behavior | Type | Likely affected file |
|---|---|---|---|---|---|---|
| `story_turn_cycle_seed_derivation_uses_only_schema_backed_world_anchors` | Ensure turn-cycle does not read unsupported fields | Parent PG with STENT.bound_char_id, STLOC.bound_ent, active SF.derived_from; no bound_ent_id/governing_section_id | Skill attempts unsupported fields or emits incomplete seeds | Seeds only CHAR/ENT/M/CF/etc.; no story-local seed ids | deterministic / integration | turn-cycle preflight |
| `story_local_seed_warning_and_rerouting` | Ensure story-local seeds are ignored and rerouted | Context-packet request intentionally includes STENT/SF/PG ids | Skill proceeds as if seed worked | Warning detected; story-local ids loaded via story_slug targeted retrieval | integration | MCP + turn-cycle |
| `prose_attach_canon_claim_uses_resolved_event_promotion_claims` | Fix PG.SE path | PG.input.resolved_event_id=SE-2; SE-2 has promotion_claims | Prose attach fails to find claim or reads nonexistent PG.SE | Loads SE-2 and classifies correctly | deterministic | prose-attach |
| `prose_attach_emit_event_submits_patch_before_receipt_index` | Enforce shared write order | emit_attach_event true; patch engine rejects SE | Receipt/INDEX written before failed patch | No receipt/INDEX; failure surfaced | integration | prose-attach |
| `closeout_reads_proposal_evidence_source_records_and_story_branch` | Closeout reads current package shape | SP package with nested `proposal_evidence.source_records` | Closeout reports missing source_records | Loads nested records and branch | deterministic | closeout |
| `closeout_ststat_source_record_disposition_requires_create_ststat_record_when_superseded` | Propagate STSTAT closeout support | SP source_records include STSTAT; verdict requires supersession | Disposition map/patch op incomplete | `create_ststat_record` included or ledger-only chosen | deterministic / integration | closeout + patch schema |
| `story_turn_cycle_persisted_context_recovery` | Enforce persisted summary recovery | Mock context packet returns persisted_with_summary with dropped story_bundle_context | Skill uses summary only | Skill retrieves slices before validation | integration | MCP + skills |
| `oversized_get_records_persisted_summary_recovery_closeout` | Enforce oversized linked-record recovery | `get_records(CF+CH)` returns persisted summary | Closeout validates from metadata only | Closeout slices each required record body | integration | closeout + MCP |

### 11.3 P1/P2 required tests from prompt coverage

| Test name | Purpose | Fixture shape | Expected pre-fix behavior | Expected post-fix behavior | Type | Likely affected file |
|---|---|---|---|---|---|---|
| `root_page_bootstrap_validity` | Bootstrap PG-1 shape, both-null input legality, branch_path, hashes | Minimal bundle genesis | Invalid root state may pass | Valid root passes; invalid fails | deterministic / fixture | record_schema_compliance |
| `chosen_choice_vs_writein_input_legality` | XOR source action | Parent PG with CHCs; both/none supplied | Silent ambiguity possible | Gate 1 fails | deterministic | turn-cycle |
| `impossible_writein_produces_se_and_plan` | No silent rejection | Manual impossible action | Dropped action | `world_block` SE + plan | integration | turn-cycle |
| `observer_firewall_violation` | Actor unavailable knowledge | Choice based on hidden BEL held by other actor | Choice emitted | Gate/audit flags | deterministic/judgment-assisted | observer firewall |
| `social_witness_propagation` | BEL updates for public event | Violence/law/status event with witnesses | No BELs accepted | BELs or valid tags required | deterministic | turn-cycle/health |
| `social_nonpropagation_rationale` | Valid non-prop tag accepted | No witnesses, records=[] | Missing rationale accepted | Valid tag accepted | deterministic | parser/health |
| `malformed_social_nonpropagation_tag_rejection` | Malformed tag rejected | Bad reason/group syntax | Accepted | `expected_witness_tag_malformed` | deterministic | health |
| `death_incapacity_reconciliation` | Same-delta reconciliation | Actor death with open OBL/STINT/SREL/STOBJ | Unreconciled state passes | Gate/audit flags | deterministic/integration | turn-cycle/health |
| `branch_isolation` | Sibling branch records not active | Branch B snapshot includes Branch A record | Passes | Gate/audit error | deterministic | branch validator |
| `sibling_branch_contradiction` | Branch contradictions remain branch-local | Two branches contradictory SF | Canon promoted silently | Audit flags only; no canon mutation | fixture | health |
| `sibling_story_contradiction` | Cross-story contradiction scan | Two story bundles with contradictory candidates | Unseen | Cross-story finding | integration | health |
| `mystery_accretion` | Cumulative narrowing | Branch with repeated narrowed claims | Not detected | Health audit warning/error | judgment-assisted unless policy | health |
| `forbidden_mystery_protection` | Forbidden M resolution blocked | SE or prose resolves forbidden M | Passes | Gate/prose/audit fails | deterministic + judgment | turn-cycle/prose/health |
| `canon_baseline_full_ch_window` | Avoid latest-CH only | Parent baseline stale by multiple CH entries | Latest-only classification passes | Retrieves full CH window and cites CH | integration | turn-cycle/health |
| `canon_promotion_hold` | Candidate held not asserted as canon | SE promotion_claims canon_candidate | SF treated canon | Gate 8 fails unless held | deterministic | turn-cycle |
| `canon_promotion_proposal_purity` | Branch evidence outside candidate | SP package candidate includes branch ids in source_basis | Accepted | Rejected | deterministic | story-fact-promotion |
| `canon_closeout_linked_record_verification` | Verify CF/CH/PA through MCP | Missing linked PA | Closeout writes ledger | Pre-flight aborts | integration | closeout |
| `closeout_fake_output_rejection` | Fake canon-addition outputs rejected | Nonexistent CF/CH/PA | Closeout succeeds | linked-record-not-found | integration | closeout |
| `prose_structural_invention` | Prose cannot mutate state | Prose introduces new law | Receipt PASS | invented_structural_fact or canon_claim fail | judgment-assisted | prose-attach |
| `prose_receipt_does_not_mutate_pg` | Receipt never changes PG | Failed prose attach | PG edited | Only receipt written | deterministic | prose-attach |
| `prose_attach_audit_only_se_noop` | Optional audit SE no replay delta | prose_attach SE in ledger | Replay changes state | Replay ignores no-op | deterministic | snapshot replay |
| `promotion_closeout_audit_only_se_noop` | Optional closeout SE no replay delta | promotion_closeout SE | Replay changes state | Replay ignores no-op | deterministic | snapshot replay |
| `storylet_alias_binding` | bound alias resolves correctly | SLT any_belief alias used in effect | unresolved bound accepted | fails if unbound / wrong class | deterministic | predicate DSL |
| `global_author_pool_branch_local_leakage` | No branch-local references | global SLT references non-genesis record | Accepted | Validator fails | deterministic | branch validator |
| `unactionable_leaf_detection` | Non-terminal leaf must continue | Leaf open, no CHC/SLT | Accepted | error | deterministic | health |
| `cosmetic_choice_detection` | Accepted choice must matter | CHC selected, empty delta, no rhetorical marker | Accepted | error | deterministic | turn-cycle/health |
| `terminal_proof_unresolved_debts` | Terminal rationale covers debts | Terminal leaf with open high OBL | Accepted | warning/error | deterministic | turn-cycle/health |
| `context_packet_story_bootstrap_behavior` | Bootstrap target slug no bundle context | story_bootstrap with target slug | Requires existing bundle | `story_bundle_context:null` | integration | MCP |
| `context_packet_story_turn_cycle_behavior` | Turn-cycle requires story_slug and bundle context | missing story_slug | succeeds | fails / returns expected error | integration | MCP |
| `patch_engine_schema_acceptance_rejection_changed_records` | Op schemas match docs | Create all story record classes + forbidden field | Unknown | Required ops accepted; forbidden rejected | integration | patch engine |
| `deployed_mcp_capability_currency` | Runtime enum/op currency | describe_capabilities stale | undetected | mismatch flagged | integration | MCP |
| `stale_validator_bundle_cli_equivalence` | CLI fresh-process workaround | MCP stale validators | stuck | CLI validate/submit equivalent | integration | MFL |
| `post_write_plan_hash_mismatch_blocks_index` | Direct write bytes checked | Plan file altered post-patch | INDEX updated | INDEX blocked | integration | bootstrap/turn-cycle |
| `ststat_entity_status_replay_equality` | Projection matches active STSTAT | PG entity_status differs | Passes | replay/hash fails | deterministic | snapshot validator |
| `belief_fact_separation_lies_rumors` | BEL false/deceives not promoted to SF | BEL false -> SF branch_local | Passes | `lie_promoted_silently` | deterministic | health |

### 11.4 P2 production-hardening tests

- `docs_no_runtime_ts_cli_invocation`: docs-lint for runtime CLI paths.
- `validation_trace_flat_mapping_only`: schema fixture test rejecting `gates[]`.
- `health_audit_accretion_policy_requires_schema_discovery`: no undocumented M field reads.
- `prose_attach_firewall_targeted_retrieval_required_when_plan_lacks_fields`: targeted retrieval branch.
- `known_integration_debt_runtime_verification`: docs claims of landed ops must be backed by `describe_capabilities` or `describe_envelope_schema`.

### 11.5 Optional research-inspired tests

- `storylet_salience_no_global_shape`: ensure SLT selection rationales never mention act/midpoint/climax.
- `social_practice_affordance_access`: actor can use only social practices / affordances reachable through BEL, STSTAT, DA/STOBJ, or institution access.
- `narrative_consistency_adversarial_logs`: replay LLM-generated branch logs and classify contradictions by source record evidence.
- `plot_graph_mutual_exclusion_without_plot_rails`: use graph-style mutual exclusion only for contradiction detection, not path selection.

---

## 12. Research synthesis

This research was used only to pressure-test Worldloom’s architecture. It does not justify act structure, a global drama manager, plot optimization, automatic reconvergence, prose-as-state, or hidden LLM memory.

### 12.1 Storylets and salience-based narrative

**What it suggests:** Storylets are discrete units of narrative content whose availability is gated by current game state; salience/quality-based approaches rank available pieces rather than forcing a fixed plot sequence.

**Worldloom status:** Already implemented in spirit through SLT records, predicate preconditions, `saliency.urgency`, local ranking, and hard gates.

**Adopt / adapt / reject:**  
- **Already implemented:** commitment blocks as causal moves.  
- **Adapt:** strengthen eligibility and noncollapse tests.  
- **Reject:** using storylets as hidden plot beats or act proxies.

**Why it fits:** It preserves present-causal-state discipline and schema minimalism.

### 12.2 Quality-based narrative / resource narrative

**What it suggests:** Story progression can emerge from resources, qualities, and local state changes rather than a drama manager.

**Worldloom status:** Already implemented through OBL/CNSQ/THR/STINT urgency and local SLT selection.

**Adopt / adapt / reject:**  
- **Already implemented:** local urgency and debt salience.  
- **Adapt:** saliency-starvation tests.  
- **Reject:** AI-director style pacing.

### 12.3 Prom Week / Comme il Faut and social simulation

**What it suggests:** Social state should be explicit and rule-governed. Characters should act from beliefs, relationships, status, and social practices.

**Worldloom status:** Partially implemented through BEL, SREL, expected witnesses, non-propagation tags, and observer firewall.

**Adopt / adapt / reject:**  
- **Adapt:** more BEL/SREL/witness propagation tests.  
- **Reject:** broad autonomous NPC simulation that mutates PG/SE without HARD-GATE.

**Why it fits:** It strengthens social coherence while staying explicit and replayable.

### 12.4 Versu / social practices

**What it suggests:** Social practices can be modeled as affordance systems: they expose possible actions and interpretations without forcing a plot.

**Worldloom status:** SLT + action_family + visible_affordances already approximate this.

**Adopt / adapt / reject:**  
- **Adapt:** treat ritual/legal/social SLTs as affordance-granting practices, not act beats.  
- **Reject:** autonomous practice execution outside the page-cycle.

### 12.5 Narrative planning / IPOCL

**What it suggests:** Narrative coherence benefits from explicit causal links and character intentionality.

**Worldloom status:** Already implemented through `SE.world_logic_rationale`, `STINT`, BEL grounding, state deltas, and motivation grounding.

**Adopt / adapt / reject:**  
- **Adapt:** motivation-grounding tests and causal-dependency threat scans.  
- **Reject:** planner that optimizes for fixed ending or dramatic shape.

### 12.6 Scheherazade-IF / plot graphs

**What it suggests:** Graph-based representations can validate order, prerequisites, mutual exclusions, and impossible transitions.

**Worldloom status:** Branch paths, state hashes, predicate DSL, and health audit already cover part of this.

**Adopt / adapt / reject:**  
- **Adapt:** graph-style contradiction and mutual-exclusion tests.  
- **Reject:** plot graph as authoritative route or reconvergence mechanism.

### 12.7 Knowledge-graph-assisted storytelling

**What it suggests:** Retrieval over explicit knowledge graphs improves grounding and consistency.

**Worldloom status:** Already implemented conceptually through world index, typed edges, context packet, targeted retrieval, and `find_sections_touched_by`.

**Adopt / adapt / reject:**  
- **Adapt:** persisted-summary recovery tests and graph traversal fixtures.  
- **Reject:** letting graph retrieval silently promote story-local truth to canon.

### 12.8 LLM-assisted IF and consistency benchmarks

**What it suggests:** LLM outputs often fail long-horizon consistency unless checked against explicit state and evidence.

**Worldloom status:** Strongly aligned. PG/SE/state snapshots, prose receipts, and health audit are exactly the right response.

**Adopt / adapt / reject:**  
- **Adapt:** adversarial consistency fixtures and evidence-grounded checkers.  
- **Reject:** hidden LLM memory as state.

### 12.9 Research transfer filter

Every accepted research-backed idea above satisfies:

1. It preserves present-causal-state discipline.
2. It does not introduce act structure, dramatic phases, or a global drama manager.
3. It does not make rendered prose authoritative.
4. It does not widen story-local truth into world canon.
5. It does not weaken Mystery Reserve.
6. It respects schema minimalism.
7. It adds no new fields here.
8. It can be propagated as validator/test/retrieval work.
9. It can be mechanically tested, except mystery accretion semantic collapse which remains judgment-assisted.
10. It does not duplicate an existing mechanism except by adding missing tests.

---

## 13. Anti-recommendations

| Tempting idea | Reject reason |
|---|---|
| Add act structure / midpoint / climax tracking | Violates present-causal-state discipline and suppresses valid player choices. |
| Add a global drama manager | Reintroduces railroading through optimization. |
| Add word-count targets | Explicitly rejected; pacing belongs in beats and stop conditions. |
| Let prose mutate PG / SE | Breaks plan-authority boundary and replay. |
| Use broad LLM narrator memory as hidden state | Unverifiable, non-replayable, and contrary to source-backed validation. |
| Auto-reconverge branches | Erases branch-local causality and player consequences. |
| Add a global rumor graph immediately | BEL + expected witnesses already handle social propagation; add tests before fields. |
| Broad autonomous NPC simulation that mutates state | Violates HARD-GATE and explicit SE delta discipline. |
| Add fields for every audit convenience | Violates schema minimalism unless mechanically consumed. |
| Widen story-local truth into canon | Violates canon authority and promotion path. |
| Bypass HARD-GATE for “simple” writes | Explicitly forbidden. |
| Bypass patch engine for `_source/*.yaml` | Breaks atomicity and schema validation. |
| Raw world-canon file reads where MCP retrieval is required | Breaks retrieval guarantees and stale-index/capability discipline. |
| Duplicate existing validators | Prefer tests and propagation fixes where mechanisms already exist. |
| Enforce undocumented Mystery Reserve fields | Recreates the exact firewall fragility the seventh iteration is meant to prevent. |

---

## 14. Implementation order

### P0 before any production story

No P0 fixes were identified from the supplied docs alone. Production should still not proceed as “implementation verified” until code/tests/runtime are supplied.

### P1 before large-scale red-team testing

1. **Fix prose-attach path and write order.** Apply A2 and A3; add tests.
2. **Fix closeout package path and STSTAT propagation.** Apply A4 and A5; add closeout fixtures and patch-op schema tests.
3. **Fix turn-cycle seed derivation.** Apply A1; add seed warning/rerouting tests.
4. **Add persisted-summary recovery wording and tests.** Apply A6 to consuming skills.
5. **Run patch-engine op coverage verification.** Use `describe_envelope_schema` and code tests for every story record class named by docs.
6. **Run deployed capability checks.** `describe_capabilities` and stale-validator workaround tests.

### P1 red-team story bundle prerequisites

- Root bootstrap validity fixture.
- Turn-cycle impossible write-in fixture.
- Observer firewall fixture.
- Death/incapacity reconciliation fixture.
- Social propagation and malformed non-propagation tag fixtures.
- Branch isolation / branch-local leak fixture.
- Canon-baseline full CH window fixture.
- Prose invention fixture.
- Closeout fake-output rejection fixture.
- Audit-only SE no-op replay fixture.

### P2 production hardening after first red-team bundle

1. Apply A7–A10 stale wording / schema-discovery fixes.
2. Add docs-lint for forbidden runtime path drift and `validation_trace` shape.
3. Add capability currency checks to every skill pre-flight that depends on new enum/op values.
4. Add fixture cleanup for unsupported schema fields.
5. Add migration notes for any legacy proposal package or pre-SCAUD PG hash shape.

### Optional future research

- Add a benchmark-style adversarial narrative log suite for long-horizon consistency.
- Add graph mutual-exclusion checks for contradiction detection, not plot steering.
- Add social-practice-oriented SLT coverage tests for law, ritual, status, and institution affordances.
- Add corpus-level mystery accretion review heuristics, kept judgment-assisted unless schema-backed policy is introduced.

---

## Closing verdict

The architecture is worth preserving. The smallest material changes are not new fields or new managers; they are:

1. tighten mismatched skill paths,
2. enforce persisted-summary recovery in consuming skills,
3. propagate closeout STSTAT support or remove it,
4. correct prose-attach ordering,
5. add deterministic tests for the already-specified gates.

That is enough to materially strengthen the story pipeline without bloating the model or betraying the present-causal-state design.
