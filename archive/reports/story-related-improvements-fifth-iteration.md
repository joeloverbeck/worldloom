According to the uploaded documents from May 15, 2026, the story pipeline is already much stronger than the average interactive-narrative architecture. The remaining problems are mostly lifecycle/schema drift and validator coverage, not foundational design failure.

# **1. Executive verdict**

**Verdict: basically sound, with several sharp P0/P1 contract mismatches that should be fixed before production-story authoring.**

The core architecture is right: page plans are authoritative, prose is a receipt/rendering surface, `PG` snapshots are fork primitives, story state is branch-local, world canon is separate, and story-to-canon promotion is gated. That aligns with the stated FOUNDATIONS rule that rendered prose must not create state, that `branching-story-turn-cycle` may advance from any committed page regardless of rendered prose, and that no `ARC_TRACE` or second prose-state engine exists.

The strongest parts are the **present-causal-state model**, **BEL/SF separation**, **STSTAT life/agency/location projection**, **closed predicate DSL**, **six-route action resolver**, **eight hard gates**, and **context-packet + patch-engine + validators discipline**. These give Worldloom a real chance of handling early deaths, refusal of premise, branch-local counterfactuals, lies, unavailable information, impossible actions, canon drift, and social propagation without secretly falling back to rails.

The weak spots are not “missing story theory.” They are **schema/lifecycle contradictions**: `PG` still carries prose receipt fields even though prose never mutates `PG`; audit-only `SE` events are optional but under-specified; `SLT.created_at_page` conflicts between the shared contract and commitment-block authoring; `story_bootstrap` context-packet requirements drift across docs; Machine-Facing Layer still mentions `ARCTRACE`; closeout still instructs direct world-canon file reads; and promotion packaging risks mixing branch evidence into a CF-shaped candidate.

Bluntly: **do not redesign the engine. Tighten the contracts and validators.**

# **2. What should not change**

| Decision to preserve | Why it should remain stable |
| ----- | ----- |
| **Present-causal-state discipline** | It is exactly what supports refusal, early death, abandonment, lies, and impossible actions. Tracking dramatic position would make the engine protect a shape instead of truth. FOUNDATIONS explicitly rejects act structure and global drama management. |
| **Plan-authority boundary** | The page plan is the committed state artifact; rendered prose is a receipt. This prevents prose from inventing branch state and keeps fork replay deterministic. |
| **No prose-as-state** | Prose may expose mistakes, but fixes route through revise prose, repair turn, or promotion—not silent `PG` mutation. |
| **BEL/SF separation** | It is the right primitive for lies, rumors, secrets, witness asymmetry, public claims, and misunderstandings. |
| **STSTAT as life/agency/location state** | This directly supports death, incapacity, capture, absence, and location consistency without bloating `STENT`. |
| **Closed predicate DSL** | Storylet eligibility must be mechanically checkable. Free-form preconditions would reintroduce model-memory validation. |
| **Six-route action resolver** | `accept`, `accommodate`, `attempt`, `world_block`, `promotion_hold`, and `terminal` cover the needed player-action outcomes without silent rejection. |
| **Mystery Reserve firewall** | The firewall is one of the architecture’s strongest features. Do not weaken it into “the model will remember not to reveal this.” |
| **Patch-engine and HARD-GATE discipline** | Engine-routed mutation and explicit approval are essential. The architecture correctly makes validation and approval structural, not stylistic. |
| **No word-count targets** | The prose-length discipline is correct. Length should follow beats and stopping point, not quotas. |
| **No global drama manager** | Research systems using drama managers are useful references, but Worldloom’s stated purpose is coherence under arbitrary player action, not plot optimization. |

# **3. Findings**

| ID | Severity | Affected files / sections | Exact problem | Why it matters in branching play | Issue type | Concrete recommendation |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| F-01 | **P0** | `story-state-contract.md` §4.2, §4.2a; `branching-story-bootstrap`; `branching-story-turn-cycle`; `branching-story-prose-attach`; `branching-story-health-audit` | `PG` has `prose_path` and `prose_receipt_path`, but prose-attach explicitly never mutates `PG`, bootstrap/turn-cycle set both to null, and FOUNDATIONS says rendered prose is not state. | A page could be rendered and receipted while the authoritative `PG` forever says `null`; health audit currently keys prose checks off stale fields. That is a lifecycle lie. | schema mismatch; missing validation; cross-skill drift | **Delete both fields from `PG`**. Discover prose/receipt by deterministic paths and `INDEX.md`, not `PG`. Recompute new PG hashes over `PG` minus only `state_hash`. |
| F-02 | **P1** | `story-state-contract.md` §4.3; `branching-story-prose-attach`; `story-promotion-closeout`; `branching-story-health-audit` | Optional `prose_attach` / `promotion_closeout` `SE` events exist, but their lifecycle is not fully specified. The contract says `selection_source:none` and `selected_slt_id:null` for these, but does not define whether they are causal ticks, snapshot inputs, or replay deltas. | Audit-only events can corrupt replay if treated as page-producing events. | missing validation; implementation/test gap | Define them as **audit-only non-page SEs** with empty delta, no `PG.input`, no branch snapshot update, and replay ignored except as ledger evidence. |
| F-03 | **P1** | `story-state-contract.md` §4.4; `commitment-block-authoring` Phase 2 | Contract says `SLT.created_at_page: null only for global_author_pool`; commitment-block-authoring says `created_at_page:null` for both `direct_batch` and `audit_repair`, including possible branch-scoped blocks. | Branch-scoped repair blocks can become schema-invalid or force fake page provenance. | schema mismatch; cross-skill drift | Amend `created_at_page` condition: page-independent authoring origins may be null; `runtime_jit` must name the creating page. Validate origin/scope consistency. |
| F-04 | **P1** | `CONTEXT-PACKET-CONTRACT.md`; `MACHINE-FACING-LAYER.md`; `branching-story-bootstrap` Pre-flight | Context Packet says `story_bootstrap` supplies target `story_slug` and returns `story_bundle_context:null`; Machine-Facing says `story_bootstrap` requires `story_slug` and returns populated story context; bootstrap skill call omits `story_slug`. | Bootstrap is the first production entry point. A mismatch here breaks the root-page contract. | schema mismatch; stale wording; implementation/test gap | Standardize: `story_bootstrap` requires target `story_slug`, returns `story_bundle_context:null`, and has reserved governing full bodies. Update skill call. |
| F-05 | **P1** | `MACHINE-FACING-LAYER.md` Retrieval Tool Scope | `get_record` still lists `ARCTRACE`, which FOUNDATIONS says does not exist. It also lists world-level `DA` but does not clearly disambiguate story-local `DA` with the same prefix. | Tool docs can send skills looking for removed classes or resolving the wrong artifact record. | stale wording; schema mismatch | Remove `ARCTRACE`; explicitly define story-local `DA` resolution when `story_slug` is supplied. |
| F-06 | **P1** | `story-promotion-closeout` World-State Prerequisites / Pre-flight | Closeout instructs direct reads of `worlds/<slug>/_source/canon`, change-log, and adjudication files. FOUNDATIONS/Machine-Facing say skills should use MCP retrieval for world canon. | A closeout could bypass retrieval guarantees and cite stale or inaccessible world records. | cross-skill drift; implementation/test gap | Replace raw world reads with `get_records` / `get_record` for linked CF/CH/PA. Story-bundle reads may remain direct or indexed per current story-bundle read discipline. |
| F-07 | **P1** | `story-fact-promotion-to-canon` source-kind mapping; `story-state-contract.md` §4.3 promotion claims | `mystery_resolution` requires `M-<integer>` as a source record, but source records must trace to a branch. Contract says `SE.promotion_claims[].source_record` for mystery resolution is `SF` or `BEL`; `M` is governing world record, not branch evidence. | Promotion may try to treat a world mystery record as story-local provenance. | schema mismatch; Mystery firewall risk | Make `SF`/`BEL` the required source records; load `M` as governing firewall target, not branch source evidence. |
| F-08 | **P1** | `story-fact-promotion-to-canon` Phase 2 / Phase 6 | The “CF-shaped candidate” is said to strictly match the CF schema, but includes promotion-only fields inside `candidate.source_basis` and `promotion_provenance`. | Canon-addition could accidentally copy story evidence into accepted CF records, widening branch evidence into canon metadata. | schema mismatch; canon-widening risk | Keep `candidate` CF-compatible only. Move branch/prose/promotion evidence to top-level `proposal_evidence`. |
| F-09 | **P1** | `branching-story-turn-cycle` Phase 4; `branching-story-health-audit` Phase 2d | Expected-witness non-propagation rationales are required but live in “authoring notes” / prose `world_logic_rationale`, not a mechanically parseable convention. | Social consequences can be silently skipped while the audit cannot deterministically tell whether omission was intentional. | missing validation; research-backed improvement | Do not add a field. Require parseable tags inside existing `SE.world_logic_rationale`, e.g. `non_propagation:evidence_concealed(group=..., records=[...])`. |
| F-10 | **P1** | `CONTEXT-PACKET-CONTRACT.md`; `branching-story-turn-cycle`; `branching-story-health-audit` Phase 2h | Canon drift checks compare baseline to latest `CH`, but the skills do not require loading the intervening CH window and affected records. | A page could be marked compatible because only “latest” was seen, while an intervening change invalidated active story state. | missing validation; implementation/test gap | On drift, retrieve all CH entries newer than baseline plus touched CF/M/INV/SEC ids before classifying. |
| F-11 | **P2** | `branching-story-health-audit` Phase 2e; FOUNDATIONS Mystery Reserve | Health audit mentions `M.accretion_policy.max_clues` / equivalent, but FOUNDATIONS only requires known/unknown/forbidden-answer/future-resolution fields. | Audit may depend on a field that the M schema does not guarantee. | schema mismatch; judgment-only risk | Treat policy fields as optional. Use status/evidence progression deterministically; mark “collectively answers unknown” as judgment-assisted unless an M policy exists. |
| F-12 | **P2** | `branching-story-prose-attach` Phase 3 | `invented_structural_fact` is presented as deterministic, but many structural inventions require semantic judgment. | Overclaiming determinism will create false confidence or brittle regex validators. | missing validation; judgment-only gap | Split into deterministic subchecks plus judgment-assisted semantic review while retaining one receipt field. |
| F-13 | **P2** | `story-state-contract.md` §3; `branching-story-turn-cycle`; `story-promotion-closeout` | Stale wording says “next `-NNNN` id”; turn-cycle uses `CHC-0003`; closeout says CF has “5 layer values,” but CF has four statuses and Mystery Reserve is separate. | Padded examples conflict with ID allocation and can create invalid references. | stale wording | Replace with unpadded `<CLASS>-<integer>` examples; fix CF-status wording. |
| F-14 | **P2** | `CONTEXT-PACKET-CONTRACT.md`; `MACHINE-FACING-LAYER.md`; health/commitment/promotion skill Pre-flights | Some skills describe `seed_nodes` containing story-local ids, but context-packet locality is mostly world-record oriented while story records are delivered through `story_slug` / `story_bundle_context`. | Packet calls may fail or silently under-deliver if story-local ids are passed as world seed nodes. | cross-skill drift | Clarify: use world ids as `seed_nodes`; use `story_slug` / `story_bundle_context` or targeted `get_records(..., story_slug=...)` for story-local records. |
| R-01 | reject | All | Add dramatic acts/midpoints/climax trackers. | Would suppress valid divergent play. | unnecessary bloat candidate | Reject. |
| R-02 | reject | All | Add global drama manager / optimal-story planner. | Conflicts with FOUNDATIONS; research supports usefulness in other systems, not this one. | anti-recommendation | Reject. |
| R-03 | reject | Story social layer | Add a global rumor graph field now. | BEL + access routes + witness propagation already cover this; a rumor graph would be schema bloat. | unnecessary bloat candidate | Reject unless first red-team bundles prove BEL insufficient. |
| R-04 | reject | Prose/page plans | Add word-count targets or pacing budgets. | Directly violates current prose-length discipline. | stale temptation | Reject. |
| R-05 | reject | Branching model | Auto-merge/reconverge sibling branches. | Branch contradictions are lawful; merging is dangerous unless explicit compatibility is proven. | unnecessary bloat candidate | Reject. |

# **4. Exact proposed amendments**

## **A-01 — Delete prose publication fields from `PG` (P0)**

**File:** `story-state-contract.md`  
 **Section:** §4.2 `PG`; §4.2a hash computation  
 **Operation:** delete + replace wording.

Delete from `PG` schema:

prose_path: pages-prose/PG-<integer>.md | null

prose_receipt_path: pages-prose-receipts/PG-<integer>.yaml | null

Replace the paragraph after `validation_trace` with:

Rendered prose and prose receipts are publication artifacts discovered by deterministic paths:

`pages-prose/PG-<integer>.md` and `pages-prose-receipts/PG-<integer>.yaml`.

They are not page-state fields and are not included in `PG`. `INDEX.md` may render

publication status for human navigation, but `PG` remains the authoritative fork-state

record.

Replace §4.2a exclusion list with:

The fork-state payload is the complete PG mapping except `state_hash` itself.

Rendered prose and prose receipts are not PG fields and therefore are not hash inputs.

**Downstream updates:** `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, schema files, snapshot hash helper tests.  
 **Validator/test changes:** `record_schema_compliance` rejects `PG.prose_path` / `PG.prose_receipt_path`; `snapshot_replay_equality` uses new hash payload.  
 **Migration impact:** none for production; for test bundles, delete the two fields and recompute PG hashes.

## **A-02 — Define audit-only `SE` lifecycle (P1)**

**File:** `story-state-contract.md`  
 **Section:** §4.3 `SE`; §9 Branching and Rewind  
 **Operation:** add.

Add after the route consistency table:

#### 4.3a Audit-only SE events

`event_kind: prose_attach` and `event_kind: promotion_closeout` are audit-only event

records. They do not produce a page, do not appear in any `PG.input.resolved_event_id`,

and do not alter branch snapshots.

Required shape:

- `commitment.selected_slt_id: null`

- `commitment.selection_source: none`

- `commitment.alias_bindings: {}`

- `outcome_route: accept`

- `resolution` absent

- `state_delta.create: []`

- `state_delta.supersede: []`

- `state_delta.close: []`

- `promotion_claims: []`

- `parent_page_id` names the page whose prose or promotion closeout is being audited,

 or `null` only when the bundle has no relevant page anchor.

Snapshot replay ignores audit-only SE records except as ledger evidence.

**Downstream updates:** `branching-story-prose-attach`, `story-promotion-closeout`, `branching-story-health-audit`.  
 **Validator/test changes:** add `audit_only_se_shape`; health audit replay must ignore unreferenced audit-only SEs.  
 **Migration impact:** none.

## **A-03 — Fix `SLT.created_at_page` origin/scope rule (P1)**

**File:** `story-state-contract.md`  
 **Section:** §4.4 `SLT`  
 **Operation:** clarify.

Replace:

created_at_page: PG-<integer> | null        # null only for global_author_pool

With:

created_at_page: PG-<integer> | null        # required for provenance.origin: runtime_jit; may be null for page-independent authoring origins

Add:

`created_at_page` is provenance for page-local creation, not branch scope. For

`provenance.origin: runtime_jit`, it MUST name the page whose turn created the block.

For `bootstrap_seed`, `author_batch`, `manual_authoring`, and `audit_repair`, it MAY be

null when the block is authored outside a page turn. Branch legality is determined by

`scope.visibility`, `scope.branch_id`, and `scope.visible_branch_path_prefix`, not by

`created_at_page`.

**Downstream updates:** `commitment-block-authoring` Phase 2, Phase 3 gate 1; `branching-story-turn-cycle` JIT block wording.  
 **Validator/test changes:** `slt_created_at_page_origin_consistency`.  
 **Migration impact:** none.

## **A-04 — Normalize `story_bootstrap` context-packet behavior (P1)**

**Files:** `CONTEXT-PACKET-CONTRACT.md`, `MACHINE-FACING-LAYER.md`, `branching-story-bootstrap`  
 **Sections:** Packet layer semantics; `get_context_packet`; bootstrap Pre-flight  
 **Operation:** replace/clarify.

In `CONTEXT-PACKET-CONTRACT.md`, keep:

For `story_bootstrap`, callers supply `story_slug` as the target slug before the bundle exists; `story_bundle_context` is `null`.

Add `story_bootstrap` to the full-body candidates table:

| `story_bootstrap` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |

In `MACHINE-FACING-LAYER.md`, replace the `get_context_packet` sentence with:

`story_bootstrap`, `story_turn_cycle`, `commitment_block_authoring`,

`branching_story_health_audit`, and `story_fact_promotion_to_canon` require `story_slug`.

For `story_bootstrap`, the slug is the target bundle slug and `story_bundle_context` is

`null` because the bundle does not yet exist. For the other story-pipeline task types,

`story_bundle_context` is populated from indexed story-bundle records.

In `branching-story-bootstrap` Pre-flight step 6, replace the call with:

mcp__worldloom__get_context_packet(

 world_slug,

 task_type='story_bootstrap',

 story_slug=<story_slug>,

 seed_nodes=<cast CHAR ids + initial_location label if provided>,

 token_budget=<default>

)

**Validator/test changes:** bootstrap context-packet fixture: required `story_slug`, null `story_bundle_context`, reserved INV/M full bodies.  
 **Migration impact:** none.

## **A-05 — Remove `ARCTRACE`; disambiguate story-local `DA` (P1)**

**File:** `MACHINE-FACING-LAYER.md`  
 **Section:** Retrieval Tool Scope / `get_record`  
 **Operation:** replace.

Replace the story-bundle id list with:

Story-bundle ids such as PG / SE / SF / OBL / CNSQ / THR / SREL / STINT /

STENT / STSTAT / STLOC / STOBJ / BR / CHC / SLT / SLB / SAU / SP / RSP

require `story_slug` because authored story ids are unique only within

`(world_slug, story_slug)`. Story-local `DA-<integer>` records also require

`story_slug`; world-level/hybrid DA records resolve only in world scope. `ARC_TRACE`

is not a valid record class.

**Validator/test changes:** retrieval schema rejects `ARCTRACE`; DA lookup requires explicit story scope when story-local.  
 **Migration impact:** none.

## **A-06 — Closeout must use retrieval for linked world records (P1)**

**File:** `story-promotion-closeout`  
 **Sections:** World-State Prerequisites; Pre-flight steps 5; Phase 1  
 **Operation:** replace.

Replace direct world paths with:

- `mcp__worldloom__get_records(record_ids=<linked_cf_ids + linked_ch_ids>, world_slug=<world_slug>)`

 for linked CF / CH records.

- `mcp__worldloom__get_records(record_ids=<linked_pa_ids>, world_slug=<world_slug>)`

 or `get_record` for PA records when adjudication retrieval is supported; otherwise use the

 documented hybrid retrieval path for PA.

Replace Pre-flight step 5 with:

On accepted-flavored verdicts: verify each linked CF / CH / PA id resolves through MCP

retrieval. Abort with linked-record-not-found on any miss. Do not raw-read world-canon

`_source/` paths.

**Validator/test changes:** closeout fixture with raw-read mock blocked; retrieval success required.  
 **Migration impact:** none.

## **A-07 — Fix `mystery_resolution` promotion source mapping (P1)**

**File:** `story-fact-promotion-to-canon`  
 **Sections:** Inputs source-kind mapping; Pre-flight; Phase 1; Phase 4  
 **Operation:** replace.

Replace the `mystery_resolution` row with:

| `mystery_resolution` | `SF-<integer>` or `BEL-<integer>` that states the apparent, held, or candidate resolution | resolving `SE`, pre-resolution BEL chain, relevant `PG.state_snapshot.unresolved_mystery_claims[]` evidence | Required; governing `M-<integer>` records are loaded for firewall but are not branch source records |

Add:

For `mystery_resolution`, `M-<integer>` ids are governing firewall records, not

`source_record_ids`. The branch-local evidentiary source is the SF or BEL named by

`SE.promotion_claims[].source_record` or by the page's unresolved-mystery evidence chain.

Fix malformed YAML in Phase 4:

mystery_firewall_report:

 mysteries_scanned: <count of M-<integer> records loaded>

**Validator/test changes:** promotion rejects `source_record_ids: [M-...]`; requires source SF/BEL plus governing M.  
 **Migration impact:** none.

## **A-08 — Move promotion-only provenance outside CF-shaped candidate (P1)**

**File:** `story-fact-promotion-to-canon`  
 **Sections:** Phase 2; Phase 6  
 **Operation:** replace schema.

Replace `candidate.source_basis` with CF-compatible contents only:

source_basis:

 direct_user_approval: false

 derived_from: [CF-<integer>]   # [] for novel candidate; never story ids

Add top-level proposal evidence:

proposal_evidence:

 story_branch: BR-<integer>

 story_slug: <story_slug>

 source_kind: <source_kind>

 source_records: [<source_record_ids>]

 supporting_pages: [<supporting_page_ids>]

 authoring_events: [SE-<integer>]

 belief_witnesses: [BEL-<integer>]

 rendered_prose_receipts: [pages-prose-receipts/PG-<integer>.yaml]

 rationale: <natural-language explanation>

Replace Phase 6 package shape accordingly.

**Validator/test changes:** `proposal_package_schema`: candidate must not contain `story_branch`, `story_evidence`, or `promotion_provenance`.  
 **Migration impact:** none.

## **A-09 — Make non-propagation rationale parseable without adding a field (P1)**

**Files:** `branching-story-turn-cycle`, `branching-story-health-audit`, optionally `story-state-contract.md` §4.3 note  
 **Operation:** clarify/add convention.

Add to `story-state-contract.md` under `SE.world_logic_rationale`:

When an expected witness group receives no BEL create/supersession, the rationale MUST

include a parseable non-propagation tag:

`non_propagation:<reason>(group=<label>, records=[<record ids>])`

Valid `<reason>` values are:

`no_witness`, `witness_incapacitated`, `evidence_concealed`,

`institution_suppresses_report`, `event_leaves_no_accessible_trace`.

The tag is carried inside `world_logic_rationale` to avoid adding a schema field, but it

is mechanically consumed by turn-cycle validation and health-audit replay.

**Validator/test changes:** `expected_witness_coverage` parser; health-audit Phase 2d fixture.  
 **Migration impact:** none.

## **A-10 — Require CH-window retrieval for canon drift (P1)**

**Files:** `branching-story-turn-cycle`, `branching-story-health-audit`, `CONTEXT-PACKET-CONTRACT.md`  
 **Operation:** clarify.

Add to turn-cycle Pre-flight after drift comparison:

If `parent.state_snapshot.canon_revision != current_world_canon_revision`, retrieve every

CH entry newer than the parent baseline and the affected CF / M / INV / SEC ids named by

those CH records before classifying drift. The latest CH from the context packet is only

the trigger; the CH window is the evidence.

Add to health audit Phase 2h:

For each stale baseline, classify drift using the CH window between

`PG.state_snapshot.canon_revision` and the current revision, not only the latest CH id.

**Validator/test changes:** canon drift fixtures for compatible, repair-turn, promotion conflict, grandfathered.  
 **Migration impact:** none.

## **A-11 — Make mystery accretion policy conditional (P2)**

**File:** `branching-story-health-audit` Phase 2e  
 **Operation:** replace.

Replace the `accretion_policy.max_clues` wording with:

If the M record exposes a validator-backed accretion policy field, enforce that policy

deterministically. If no such field exists, enforce only the schema-backed progression:

evidence_records non-empty for narrowing statuses; no forbidden-status resolution; no

status escalation to `apparent_resolution` or `held_for_promotion` without promotion

pause. Whether the accumulated evidence chain collectively answers the mystery is a

judgment-assisted finding unless a validator-backed M policy makes it deterministic.

**Validator/test changes:** deterministic status progression tests; judgment-assisted mystery-collapse review.  
 **Migration impact:** none.

## **A-12 — Split deterministic vs judgment-assisted prose invention (P2)**

**File:** `branching-story-prose-attach` Phase 3  
 **Operation:** clarify.

Replace `invented_structural_fact` wording with:

`invented_structural_fact` has deterministic and judgment-assisted subchecks. Deterministic

FAIL cases include: prose contradicts active STSTAT life/agency/location; prose asserts a

record id or named canon fact absent from plan §4/§7/state snapshot; prose states a

forbidden mystery resolution pattern. Judgment-assisted WARN/FAIL cases include semantic

structural inventions not reducible to exact patterns, such as implied faction alignment,

new capability, or institutional rule not present in the plan.

**Validator/test changes:** deterministic prose fixtures plus human/judgment-assisted review protocol.  
 **Migration impact:** none.

## **A-13 — Clean stale ID/status wording (P2)**

**Files:** `story-state-contract.md`; `branching-story-turn-cycle`; `story-promotion-closeout`  
 **Operation:** replace.

* Replace “next `-NNNN` id” with “next `<CLASS>-<integer>` id.”  
* Replace `CHC-0003` / `CHC-0004` examples with `CHC-3` / `CHC-4`.  
* Replace closeout “CF records’ status (5 layer values)” with:

Read linked CF records' `status` values (`hard_canon`, `derived_canon`,

`soft_canon`, `contested_canon`). Mystery Reserve entries are separate `M-<integer>`

records, not CF statuses.

**Validator/test changes:** docs lint for padded story ids and invalid status wording.  
 **Migration impact:** none.

## **A-14 — Clarify story-local retrieval vs packet seed nodes (P2)**

**Files:** `CONTEXT-PACKET-CONTRACT.md`; `MACHINE-FACING-LAYER.md`; health/commitment/promotion skills  
 **Operation:** clarify.

Add:

For story-pipeline task types, `seed_nodes` should preferentially name world-canon or

hybrid world records. Story-bundle records are supplied through `story_slug` and

`story_bundle_context`; when exact story-local records are needed, use

`get_records(record_ids, story_slug=<story_slug>)` or `list_records(..., story_slug=...)`.

Do not rely on world-scope seed expansion for story-local ids unless the deployed MCP

capability explicitly documents that support.

**Validator/test changes:** packet assembly test rejects/flags unsupported story-local seed nodes.  
 **Migration impact:** none.

# **5. Cross-skill propagation matrix**

Legend: **M** = must update, **T** = tests/validators only, **—** = unaffected.

| Change | FOUNDATIONS | Contract | Bootstrap | Turn-cycle | Prose attach | Commitment blocks | Health audit | Promotion | Closeout | Context / retrieval | Patch / validators / schemas | Tests |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| A-01 remove `PG.prose_*` | — | **M** | **M** | **M** | **M** | — | **M** | — | — | — | **M** | **M** |
| A-02 audit-only SE shape | — | **M** | — | — | **M** | — | **M** | — | **M** | — | **M** | **M** |
| A-03 `SLT.created_at_page` | — | **M** | — | **M** | — | **M** | **T** | — | — | — | **M** | **M** |
| A-04 bootstrap packet | — | — | **M** | — | — | — | — | — | — | **M** | **T** | **M** |
| A-05 remove ARCTRACE / DA lookup | — | — | — | — | — | — | **T** | **T** | — | **M** | **M** | **M** |
| A-06 closeout retrieval | — | — | — | — | — | — | — | — | **M** | **M** | **T** | **M** |
| A-07 mystery promotion mapping | — | **T** | — | **T** | — | — | **T** | **M** | — | — | **M** | **M** |
| A-08 proposal evidence outside candidate | — | — | — | — | — | — | — | **M** | **T** | — | **M** | **M** |
| A-09 non-propagation tags | — | **M** | — | **M** | — | — | **M** | — | — | — | **M** | **M** |
| A-10 CH-window drift | — | **T** | — | **M** | — | — | **M** | **T** | — | **M** | **M** | **M** |
| A-11 mystery accretion conditional | — | — | — | — | — | — | **M** | **T** | — | — | **T** | **M** |
| A-12 prose invention split | — | — | — | — | **M** | — | **T** | **T** | — | — | **T** | **M** |
| A-13 stale id/status cleanup | **M** | **M** | **T** | **M** | — | — | — | — | **M** | **M** | **T** | **M** |
| A-14 story-local seed clarity | — | **M** | **T** | **T** | — | **M** | **M** | **M** | — | **M** | **T** | **M** |

# **6. Validator and test plan**

| Test | Purpose | Type |
| ----- | ----- | ----- |
| Root page bootstrap validity | `PG-1` has `story_start`, no parent, no input action, full snapshot, one active `STSTAT` per active `STENT`, no `prose_*` fields, valid hashes. | fixture/golden + deterministic |
| Chosen choice vs write-in input legality | Non-root pages must have exactly one of `choice_id` / `manual_action_text`; root must have neither. | deterministic + property-based |
| Impossible write-in still produces SE and page plan | `manual_action_text` outside world logic routes to `world_block`, with `SE.resolution`, `player_visible_feedback`, page plan §7, and no silent rejection. | fixture/golden |
| Observer firewall violation | Actor tries to use hidden info known only to another actor; selected `SLT` or emitted `CHC` must fail unless access route exists. | deterministic + judgment-assisted for semantic route |
| Social witness propagation | Public/deceptive/violent/status event creates BELs or parseable `non_propagation:*` tags for all expected witness groups. | deterministic |
| Death/incapacity reconciliation | Death or incapacity supersedes STSTAT and reconciles STINT/OBL/SREL/STOBJ/BEL/choices in same delta. | fixture/golden |
| Branch isolation | Sibling-branch record appears in active snapshot or global author-pool SLT references branch-local record; validator rejects. | property-based |
| Sibling-branch contradiction | Two sibling branches contradict through SF/BEL but remain isolated; audit flags only if promotion/cross-story mode requires. | fixture/golden |
| Mystery accretion | Evidence chain progresses `clue_added → narrowed`; deterministic status rules enforced; “collectively answered” marked judgment-assisted unless policy field exists. | deterministic + judgment-assisted |
| Canon baseline drift | Parent baseline older than current CH; retrieve CH window and classify compatible/grandfathered/repair/promotion conflict. | fixture/golden |
| Canon promotion hold | `outcome_route: promotion_hold` or `canon_candidate` claim must not assert world truth in state delta; promotion claim emitted. | deterministic |
| Prose structural invention | Deterministic cases: dead actor speaks, new canon rule absent from plan, location contradiction. Semantic invention gets judgment-assisted receipt note. | deterministic + judgment-assisted |
| Storylet eligibility / alias binding | Existential `any_*` predicates bind aliases; every `bound:<alias>` in effects/likely effects must resolve before selection. | property-based |
| Unactionable leaf detection | Non-terminal leaf has no eligible author-pool or JIT-able SLT. | deterministic |
| Cosmetic choice detection | Accepted CHC/write-in with no delta, visibility change, affordance change, or recorded failure is rejected unless parent plan marked rhetorical. | deterministic |
| Terminal proof with unresolved debts | Terminal page must name how high-urgency OBL/CNSQ/THR/STINT debts were closed, abandoned, inherited, or intentionally unresolved. | deterministic + judgment-assisted |
| No `PG.prose_*` fields | PG schema rejects `prose_path` and `prose_receipt_path`; prose audit uses deterministic artifact paths. | deterministic |
| Audit-only SE shape | `prose_attach` / `promotion_closeout` SEs must be empty-delta, no selected SLT, no PG input, ignored by replay. | deterministic |
| Bootstrap context packet | `story_bootstrap` requires target `story_slug`; returns `story_bundle_context:null`; reserves INV/M full bodies. | fixture/golden |
| DA / ARCTRACE retrieval | `ARCTRACE` rejected; story-local DA requires `story_slug`; world DA resolution does not collide. | deterministic |
| Closeout retrieval discipline | Closeout verifies linked CF/CH/PA through MCP retrieval, not direct world `_source` reads. | fixture/golden |
| Proposal candidate purity | `candidate` contains only CF-compatible fields; branch/prose evidence must live under `proposal_evidence`. | deterministic |

# **7. Research synthesis**

| Source / system | What it suggests | Adopt / adapt / reject | Fit with Worldloom |
| ----- | ----- | ----- | ----- |
| Emily Short / quality-based and salience-based narrative | Storylets are unlocked by qualities/state and selected by salience rather than fixed global plot shape. | **Adopt, already mostly done** | `SLT.preconditions`, `saliency`, and local eligibility are exactly the right model. Do not add act structure. |
| Kreminski & Wardrip-Fruin, storylets design space | Storylets are discrete content modules gated by current state, with variation in preconditions, repeatability, internal structure, and selection architecture. | **Adapt** | Worldloom should keep `SLT` compact and validator-friendly; add tests for predicate/alias binding, not more fields. |
| Comme il Faut / Prom Week | Reusable social rules, relationships, statuses, and social exchanges can produce varied emergent social stories. | **Adapt** | Supports BEL/SREL/STSTAT and witness propagation. Do not copy CiF’s full social-network schema yet; BEL + SREL is enough. |
| Versu | Social practices provide affordances but do not directly control agents; individual agents choose via reactive utility. | **Adapt** | Supports Worldloom’s `SLT` as available causal move, not plot command. Good reason to keep observer firewall and actor motivation grounding. |
| Riedl & Young narrative planning / IPOCL | Understandable narratives need causal progression and believable intentional agents. | **Adapt narrowly** | Keep causal dependency scan and motivation grounding. Reject goal-state narrative planning as engine driver. |
| Interactive narrative surveys / Mimesis-style mediation | Player actions can disrupt planned stories; mediation/drama systems often prevent, repair, or redirect threats to a story plan. | **Note / mostly reject** | Worldloom should dramatize impossible or disruptive actions as state transitions, not protect planned arcs. |
| Façade / beat sequencing | Drama-manager systems can sequence beats for a coherent dramatic experience. | **Reject as engine model** | Useful historical reference, but it conflicts with the no-global-drama-manager rule. |
| Story2Game | LLM-generated interactive fiction benefits from explicit preconditions/effects and game-state grounding. | **Adapt** | Strong support for `SLT.preconditions`, `SE.state_delta`, and action routing. |
| WHAT-IF / GENEVA | LLMs can generate branching graphs, but systems often start from a linear story or generate reconverging branches. | **Note / reject reconvergence default** | Graph visualization is useful; auto-rejoining branches is unsafe unless state compatibility is proven. |
| LLM IF graph repair work | Structural graph analysis catches unreachable endings, defective branches, inconsistent merges, and state inconsistencies. | **Adapt** | Supports health-audit graph/replay tests, unactionable leaf detection, sibling contradiction scans, and terminal proof. |
| Knowledge-graph-guided storytelling | Structured knowledge reduces hallucinations and helps maintain consistency in long stories; common LLM failures include geography, object properties, and character behavior. | **Adopt, already core** | Worldloom’s machine-facing layer and context packets are the correct response. |
| Recent LLM consistency-bug work | Long-form narrative models still struggle with factual/detail consistency and timeline/plot logic. | **Adopt as validation rationale** | Do not rely on narrator memory; keep state external, hashable, replayable, and validator-backed. |

# **8. Anti-recommendations**

**Do not add act structure, midpoint/climax tracking, or dramatic-phase fields.** These would turn the engine into a future-shape protector. The current model correctly asks what is true now, not what act the story is in.

**Do not add a global drama manager.** Research drama managers can be useful in other systems, but Worldloom’s core value is coherence under player disruption, not optimization toward a target story.

**Do not let rendered prose mutate `PG`, `SE`, or branch state.** Prose mistakes must route to revise prose, repair turn, or promotion. They must not become state by being pretty.

**Do not add `who_knows` to `SF`.** `BEL` exists precisely to avoid mixing truth and knowledge. Adding `who_knows` to facts would duplicate and eventually contradict the belief layer.

**Do not add a global rumor graph yet.** The existing BEL/access-route/expected-witness model is enough. Add parseable non-propagation tags first.

**Do not widen branch-local facts into canon through promotion packaging.** Branch evidence is evidence, not authority. Keep accepted CF provenance clean.

**Do not add prose word-count targets.** This is already settled correctly in FOUNDATIONS.

**Do not auto-merge sibling branches.** Sibling contradictions are lawful. Merge only after explicit compatibility proof or canon closeout.

**Do not rely on LLM memory for validator rationales.** HARD-GATE rationales must cite record ids, packet layers, retrieved fields, or validator results.

# **9. Implementation order**

## **P0 before any production story**

1. **A-01:** Remove `PG.prose_path` and `PG.prose_receipt_path`; update hashes, schema, bootstrap, turn-cycle, prose-attach, health-audit prose mode.  
2. Add tests for root page validity, prose receipt path discovery, and PG schema rejection of prose fields.

## **P1 before large-scale testing**

3. **A-02:** Define audit-only `SE` shape and replay behavior.  
4. **A-03:** Fix `SLT.created_at_page` origin/scope rule.  
5. **A-04:** Normalize `story_bootstrap` context-packet behavior.  
6. **A-05:** Remove `ARCTRACE`; disambiguate story-local DA retrieval.  
7. **A-06:** Replace closeout raw world reads with MCP retrieval.  
8. **A-07/A-08:** Fix promotion source mapping and CF-shaped candidate purity.  
9. **A-09:** Add parseable non-propagation tags.  
10. **A-10:** Require CH-window retrieval for drift classification.

## **P2 after first red-team story bundle**

11. **A-11:** Make mystery accretion policy conditional and judgment-assisted where necessary.  
12. **A-12:** Split deterministic vs judgment-assisted prose invention.  
13. **A-13:** Clean stale ID/status wording.  
14. **A-14:** Clarify story-local seed node usage.

## **Optional future research**

15. Add visualization over branch trees, active debts, BEL propagation, and mystery evidence chains.  
16. Consider an M-record `accretion_policy` only after real red-team bundles show that status/evidence-chain rules are insufficient.  
17. Consider a richer social diffusion model only if BEL/access-route/witness tags fail under actual play.

# **10. Final readiness checklist**

The story pipeline is ready for production-story authoring only when the following are true:

* `PG` schema has no prose publication fields.  
* `snapshot_replay_equality` uses the amended PG hash payload.  
* Bootstrap creates a valid root `PG-1` with no rendered prose lifecycle.  
* Turn-cycle accepts both chosen choices and write-ins with XOR input legality.  
* Impossible write-ins still produce `SE` + page plan via `world_block`.  
* Audit-only `SE` events are schema-valid and ignored by snapshot replay.  
* `SLT.created_at_page` rules no longer conflict with commitment-block authoring.  
* Storylet eligibility and `bound:<alias>` binding are mechanically tested.  
* Observer firewall tests reject unavailable knowledge.  
* Expected witness propagation either creates/supersedes BELs or emits parseable non-propagation tags.  
* Death/incapacity reconciliation closes/transfers affected intentions, obligations, relationships, objects, beliefs, and choices.  
* Branch isolation rejects sibling records in active snapshots.  
* Sibling-branch contradiction is allowed until promotion/cross-story audit makes it relevant.  
* Mystery accretion audit walks page chains and distinguishes deterministic from judgment-assisted findings.  
* Canon drift classification uses the CH window, not just latest CH.  
* Promotion packages keep branch evidence outside the CF-shaped candidate.  
* Closeout verifies linked CF/CH/PA through retrieval, not raw world-canon reads.  
* Prose structural invention checks are honest about deterministic vs judgment-assisted cases.  
* `ARCTRACE` is gone from all docs/tool schemas.  
* Story-local DA lookup is unambiguous.  
* No story skill introduces act structure, global drama management, prose-as-state, word-count targets, or schema fields without mechanical consumers.

**Final call:** after A-01 through A-10 and their tests land, the architecture is ready for the first serious red-team story bundle. After that bundle, decide whether mystery accretion and social propagation need more schema. Right now, they do not.

