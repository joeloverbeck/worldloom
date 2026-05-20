# SPEC-51 — CHC/SLT Selected-Commitment Trace Closure

Status: DRAFT
Supersedes: none
Extends/corrects: SPEC-50 (STPLAN/STEMO/CHC/SLT exploitation parity) — corrects one SPEC-50 regression (C-series affordance-ordinal), closes the existential-predicate trace SPEC-50 D.2 left static-only, and aligns skill prose SPEC-50 left partially drifted.
Source audit: `reports/ontology-exploitation-second-iteration.md` (2026-05-20)

## Problem Statement

The active story ontology is structurally complete and should remain closed: the source audit re-rejects all new active record classes, all six derived render packets, and all act/arc/beat structures, and SPEC-50 landed the schema parity that lets `STPLAN`/`STEMO`/`STSTAT`/`CLK`/`STSEC`/`STQ` be created, snapshotted, grounded, and bound. The remaining problem is **trace closure**: the most important causal path — *active state → eligible `SLT` → emitted `CHC` → selected `CHC`/write-in → selected `SLT` → `SE.commitment.alias_bindings` → `SE.state_delta`/`state_relations` → next `PG.state_snapshot`* — is not deterministically proven when the eligibility predicate is **existential**.

Every gap below was verified directly against post-SPEC-50 source on 2026-05-20 (the audit describes post-SPEC-50 state but inspected GitHub without cloning or running the suite; this spec corrects the audit where verification diverged).

### Verified gaps (in scope)

**1. Existential-predicate / alias-binding trace is unclosed (P0).** `chc_slt_eligibility_source_grounding` (`tools/validators/src/structural/chc-slt-eligibility-source-grounding.ts:70-98`) collects only *literal* record IDs from `SLT.preconditions.hard[]`/`soft[]` predicate arguments and compares them to `CHC.grounded_in.records[]`. For existential predicates (`any_plan_active`, `any_emotion_active`, `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_belief`, `any_intention`, `any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`) the selected concrete record is known only through `SE.commitment.alias_bindings`, so the validator skips it. No validator anywhere:
- resolves an existential predicate to its bound record via `SE.commitment.alias_bindings` and checks the bound record is class-correct and active in the parent `PG` snapshot;
- proves `SLT.effects.{create,supersede,close}` of the form `bound:<alias>` resolve through the same `alias_bindings` and land in the matching `SE.state_delta.{create,supersede,close}` list;
- proves the storylet-derived `CHC` grounds in the bound record (or is explicitly background-only).

`snapshot-replay-equality.ts` proves the child `PG` snapshot equals (parent snapshot + applied `SE` ops), but treats `SE.state_delta` as a black box — it does not tie the delta back to the selected `SLT`'s effects. `observer-firewall.ts:161-164,385-403` *does* resolve predicate holders through `alias_bindings` at runtime for `selected_choice`/`write_in_attempt` events — this is reusable machinery the new validator builds on, not duplicates.

**2. Write-ins traverse the same trace but are untested (P0, folded into #1).** Contrary to the audit's "bypass" framing, write-ins are **not** an open escape hatch: the event schema's conditional `allOf` (`tools/validators/src/schemas/story-event.schema.json`) requires `commitment.selected_slt_id` (`^SLT-...$`) and `selection_source` for every non-system event kind including `write_in_attempt`, and `observer-firewall.ts:35` applies the firewall to `write_in_attempt` identically to `selected_choice`. The genuine residual is that the existential trace (#1) is untested for `write_in_attempt` events. Because write-ins carry the same `selected_slt_id` + `alias_bindings`, they are in scope of the #1 validator with **no separate validator** — only added test cases.

**3. MCP `list_records` / `get_record_schema` omit STPLAN/STEMO (P1).** `tools/world-mcp/src/tools/list-records.ts:21` (`SUPPORTED_LIST_RECORD_TYPES`) and `tools/world-mcp/src/tools/get-record-schema.ts:13` (`SUPPORTED_RECORD_SCHEMA_NODE_TYPES`) are hand-maintained per-tool allowlists that omit `story_plan_record` and `story_emotion_record`, even though the canonical registry `tools/world-index/src/schema/types.ts:6-55` (`NODE_TYPES`) and `tools/world-mcp/src/tools/_shared.ts` (`STORY_BUNDLE_NODE_TYPES`) include them, and `get_record`/`get_records` (`get-record.ts:138-139`, via `isStoryBundleNodeType`) plus context packets (`story-bundle-context.ts:770-794`) already support them. The machine layer thus contradicts SPEC-50 E.2's own targeted-retrieval discipline: a skill can read the packet summary but cannot list the records or discover their schema through the documented surfaces.

**4. World-index CHC affordance-ordinal edge reads a non-schema field (P1, SPEC-50 regression).** `tools/world-index/src/parse/atomic.ts:716` reads `parent_page_id` to anchor the `choice_affordance_ordinal` edge, but `CHC` has no such field — the schema (`tools/validators/src/schemas/story-choice.schema.json`) uses `created_at_page` with `additionalProperties: false`. SPEC-50 C.1 (`SPEC50STPSTECHC-005`) introduced `edgesForChoice` reading the wrong field. Two parser fixtures (`tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts:16`, `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`) mask the bug by injecting the illegal `parent_page_id`; they are not schema-validated. A schema-conformant `CHC` produces affordance-ordinal edges anchored to the `CHC` node id instead of its creating page, so affordance-grounded choices are not queryable by page.

**5. Stale predicate enumerations and motivation list in skill prose (P1).** Three skills enumerate only the six original social-state existential predicates and omit the five added since (`any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`), diverging from the canonical DSL in `.claude/skills/_shared-templates/story-state-contract.md` §5 (lines 158-199, 11 existential predicates): `branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md:10`, `branching-story-health-audit/SKILL.md:248`, `branching-story-bootstrap/SKILL.md:313`. Separately, the Phase-6 motivation-grounding list `branching-story-turn-cycle/references/phase-6-page-snapshot.md:39-49` omits `STPLAN` (active plans) and `STEMO` (active emotions) as valid direct motivation sources for `SE.world_logic_rationale`, although plan-driven and emotion-driven actions are first-class. (`commitment-block-authoring` already lists all 11 — it is the correct exemplar.)

### Already resolved by SPEC-50 (recorded; no work in this spec)

- **Accept-route consequence visibility (audit Rec 5).** SPEC-50 D.3 (`SPEC50STPSTECHC-010`) landed a deterministic skill-procedural check in `branching-story-prose-attach/SKILL.md:220`: for `accept` routes it compares the selected `CHC.likely_state_pressure`, `CHC.grounded_in.records[]`, page-plan §13, and committed `SE.state_delta`/`SE.state_relations[]` — explicitly *not* `SE.resolution` (absent on accept). The audit's "no deterministic validator found" conflates an executable validator with the existing deterministic skill check. The audit's only novel ask — promote it to an executable hard gate — is deferred (see Out of Scope).
- **Patch-engine STPLAN/STEMO operation tests (audit Rec 8).** Present and green: `tools/patch-engine/tests/ops/create-story-record.test.ts:337-420` (STPLAN/STEMO staging + target-directory correctness), `tools/patch-engine/tests/integration/create-bel-record.test.ts:59-95` (ID-allocation consumption + receipt-node assertions), `tools/world-mcp/tests/server/capability-parity.test.ts:145-167` (`describe_envelope_schema` covers every op kind). The audit's "appears untested" is a GitHub-inspection blind spot, not a real gap.

## Approach

Repair and prove the existing surface; grow nothing. Zero new record classes, zero new schema fields, zero new MCP packet surfaces, zero new page-plan sections. The single new validator reads only already-committed fields (`SE.commitment.alias_bindings`, `SE.state_delta`, `SE.state_relations`, `SLT.preconditions`/`effects`, `CHC.grounded_in`, parent/child `PG.state_snapshot.active_records`). The MCP and world-index fixes reference the canonical node-type registry so the omission/field-name classes cannot recur. The skill-prose fix aligns local enumerations to the authoritative shared contract. The migration posture follows SPEC-44/49/50: the validator ships warning-first across one revision cycle where it could touch legacy private bundles, failing closed only after the compatibility window; the world-index fix is reindex-only; MCP and skill-prose changes need no migration.

### A. Selected-commitment trace validator (P0)

**A.1 New structural validator `chc_slt_selected_commitment_trace`.** For each `SE` event whose `event_kind` is a committing action (i.e., carries `commitment.selected_slt_id`, covering both `selected_choice` and `write_in_attempt`), validate one trace at a time:

1. **Predicate satisfaction & binding.** Load the selected `SLT`. For each *hard* precondition predicate:
   - if it is a **static** predicate naming a literal record id, that record must be active in the parent `PG.state_snapshot.active_records` (FAIL otherwise) — this preserves the existing static check;
   - if it is an **existential** predicate (`any_*`), there must be an entry in `SE.commitment.alias_bindings` for the predicate's alias, the bound record must be of the class the predicate selects (e.g., `any_plan_active` → `STPLAN`), and the bound record must be active in the parent snapshot (FAIL otherwise). Unbound `bound:`/existential aliases → FAIL.
2. **Bound-effect reconciliation.** For each `SLT.effects.{create,supersede,close}` entry of the form `bound:<alias>`, the alias must appear in `SE.commitment.alias_bindings`, and the resolved record must appear in the matching `SE.state_delta.{create,supersede,close}` list (FAIL on omission). Static (literal-id) SLT effects must likewise appear in the matching `SE.state_delta` list. Effects are *expected* effects: a declared `SLT` effect absent from `SE.state_delta` is a FAIL (the committing event silently dropped a selected move); `SE.state_delta` entries with no corresponding SLT effect are permitted (the event may commit consequences beyond the block) but every `bound:<alias>` in the delta must resolve through `alias_bindings`.
3. **CHC grounding link (when `SE.commitment.selection_source = emitted_choice`).** The selected `CHC` (resolvable from the event/page) must ground in at least one record that satisfied the selecting predicate — the bound record for an existential predicate, or the literal record for a static predicate — unless the choice carries the SPEC-50 D.2 background-only marker. Missing required grounding → FAIL **only when the selected `CHC` uniquely resolves** — the `selected_slt_id` maps to exactly one emitted `CHC` via `page_emitted_choice` ∩ `choice_associated_storylet`; when the mapping is ambiguous (multiple emitted CHCs share the selected `SLT` as `associated_commitment_block`) or otherwise unresolvable, the sub-check **degrades to WARN, not FAIL**. The `SE` record carries no `selected_choice_id` field (verified — `commitment` holds only `selected_slt_id` / `selection_source` / `alias_bindings`), so unique resolution is not guaranteed and the WARN path may be the common case; see §Risks "selected-CHC resolvability". Weak/incidental grounding → WARN. This extends SPEC-50 D.2 from static-only to existential resolution; it does **not** introduce a second eligibility validator (see A.3).
4. **Alias hygiene.** Every `SE.commitment.alias_bindings` entry must be referenced by some selected-`SLT` existential predicate or `bound:` effect (no orphan bindings → WARN); every bound record must be branch-local (reuse the `branch-isolation` locality check) → FAIL on cross-branch.

Child-`PG`-snapshot consistency (created/superseded/closed records reflected in the next snapshot) is **already** covered by `snapshot-replay-equality`; A.1 deliberately does not duplicate it. A.1 closes the gap that replay treats as a black box: the link from selected-`SLT` eligibility/effects through `alias_bindings` into `SE.state_delta`.

**Explicitly out of scope of A.1:** any check that scores a choice *set* against an aggregate "active-state pressure distribution" or salience target — that drifts toward the global-drama-manager pattern FOUNDATIONS §5c rejects. A.1 is a per-event causal trace, not a pool-level audit.

**A.2 Write-in coverage.** No separate validator. A.1 applies to `write_in_attempt` events because they carry `selected_slt_id` + `alias_bindings` (schema-enforced) and traverse the same trace. The deliverable is test coverage (see Test Plan) proving a write-in with a JIT `SLT` resolves its existential bindings, bound effects, and state delta identically to an emitted choice, and that a write-in whose `SE.state_delta` omits a declared bound effect FAILs.

**A.3 Relationship to `chc_slt_eligibility_source_grounding`.** A.1 subsumes the existential case the existing validator skips. To avoid two overlapping validators, fold the existing validator's static-predicate grounding check into A.1's step 3, or have A.1 invoke the shared helper; the existing validator's registry entry and tests are updated, not duplicated. Decide at implementation time based on the cleanest registry shape; the contract is that there is exactly one CHC↔SLT grounding validator after this spec, covering static + existential.

### B. MCP STPLAN/STEMO list/schema parity (P1)

**B.1** Add `story_plan_record` and `story_emotion_record` to `SUPPORTED_LIST_RECORD_TYPES` and the `RECORD_TYPE_TO_NODE_TYPE` map in `tools/world-mcp/src/tools/list-records.ts`, and to `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and `NODE_TYPE_TO_SCHEMA_FILE` in `tools/world-mcp/src/tools/get-record-schema.ts` (mapping to `story-plan.schema.json` / `story-emotion.schema.json`).

**B.2 Drift guard.** Add a meta-test asserting that the two tools' supported-type allowlists are supersets of `STORY_BUNDLE_NODE_TYPES` (or otherwise reconcile against the canonical registry), so a future story-bundle record class cannot be added without surfacing through `list_records`/`get_record_schema`. This converts the per-tool-allowlist failure mode into a caught regression.

### C. World-index CHC affordance-ordinal fix (P1, corrective)

**C.1** Change `tools/world-index/src/parse/atomic.ts:716` (`edgesForChoice`) to read `created_at_page` instead of `parent_page_id` for the `choice_affordance_ordinal` parent anchor. The edge target keeps the SPEC-50 C.1 form (`<page-node-id>#affordance:<ordinal>`); only the source field changes.

**C.2** Correct the masking fixtures to be schema-conformant: replace `parent_page_id` with `created_at_page` in `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` and `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`, and route the CHC fixture through `story-choice.schema.json` validation in at least one test so a future field-name drift fails the schema gate (the absence of schema validation on these fixtures is what masked the regression).

### D. Stale skill-reference alignment (P1)

**D.1** In `branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md:10`, `branching-story-health-audit/SKILL.md:248`, and `branching-story-bootstrap/SKILL.md:313`, extend the existential-predicate enumeration to all 11 predicates per the shared contract §5 (add `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`), or replace the inline list with a citation to the contract to prevent future drift.

**D.2** In `branching-story-turn-cycle/references/phase-6-page-snapshot.md:39-49`, add `STPLAN` (a plan held by / current step authored for the actor) and `STEMO` (an active emotion of the actor with behavioral pressure) to the valid direct motivation sources for `SE.world_logic_rationale`.

**D.3** Do **not** modify the Phase-7 page-plan reference: verification confirmed it already carries the shared-contract §9b/§9c obligations (it delegates predicate evaluation upstream to Phase 2). The audit's claim that Phase 7 omits §9b/§9c is refuted; this spec records the correction so it is not re-litigated.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| **§Story Bundles §5a — Commitment Blocks Are Causal Moves** | aligns | A.1's bound-effect reconciliation enforces the §5a/§4.4 invariant that "each block's `effects.*` mirrors `SE.state_delta` (`create | supersede | close`)" — it proves the mirror holds at commit time rather than assuming it. |
| **§Story Bundles §5b — Schema-Minimalism At Story Scope** | aligns | Zero new record classes, fields, MCP packets, or page-plan sections. A.1 reads only already-load-bearing fields; B/C/D are registry references, a field-name correction, and skill-prose alignment. |
| **§Story Bundles §5c — Present Causal State, Not Narrative Shape** | aligns | A.1 is explicitly bounded to a per-event causal trace and excludes any aggregate pressure-distribution / salience-target scoring, which would reintroduce a global drama manager. It asks only whether the selected move's bindings and effects are consistent now. |
| **§Story Bundles §6b — Information / Observer Firewall** | aligns | A.1 reuses the runtime alias-binding resolution and branch-locality machinery the observer firewall already applies to `selected_choice`/`write_in_attempt`; firewall coverage widens to existential bindings, it is not bypassed. |
| **§Story Bundles §5 — Rule 1 (No Floating Facts)** | aligns | A.1 makes existential-predicate eligibility and `bound:<alias>` effects structurally checkable instead of silently floating; C.1 makes affordance-ordinal grounding queryable against the real creating page. |
| **§Story Bundles §4a — Plan-Authority Boundary** | aligns | A.1 validates committed `SE`/`PG` records read-only and introduces no second state-transition pass; story state stays authoritative at page-plan commit. |
| **§Canonical Storage Layer — append-only** | aligns | No schema changes; the validator ships warning-first across one revision cycle before failing closed on legacy private bundles; no committed record is mutated. |
| **§Tooling Recommendation — Index + Targeted Retrieval** | aligns | B surfaces existing STPLAN/STEMO records through the documented `list_records`/`get_record_schema` surfaces (honoring SPEC-50 E.2's Index+Follow-Up discipline); C makes the affordance-ordinal edge resolve to the correct page node. Neither adds a parallel projection. |
| **§Story Bundles §4 — Write Discipline (engine-only `_source/` writes)** | N/A defensive | No patch-engine op surface is touched; `create_stplan_record`/`create_stemo_record` remain the only lawful STPLAN/STEMO mutation path. |

## Out of Scope

Re-affirmed from the audit and SPEC-50; not re-litigated.

- **Promoting accept-route consequence visibility to an executable hard-gate validator.** SPEC-50 D.3's deterministic skill-procedural check is the accepted form; there is no prose-attach dry-run runner in this repo context to host an executable gate. Deferred until a runner exists. (Audit Rec 5 residual.)
- **Suspicious-overgrounding and semantic-noncollapse warnings (audit Rec 7, P2).** SPEC-50 placed over-grounding/verbosity heuristics and threshold tuning in Out of Scope, deferred to sample-story evidence (audit Priority 3). Thresholds cannot be calibrated without sample stories, and aggregate-salience scoring risks the §5c drama-manager drift. Defer.
- **Active-state-underuse warnings beyond SPEC-50 D.4's set** (STINT/SF/SREL/STSTAT/STLOC/STOBJ/DA). Warning-first salience heuristics; defer threshold work to sample-story evidence (audit Priority 2/3).
- **New active record classes; derived render packets; act/arc/beat/drama-manager structures; mandatory storylet coverage families per state class; "every active record must affect every choice" hard gates; deterministic prose-quality validators.** Rejected categorically — FOUNDATIONS §5b/§5c and SPEC-50 §Out of Scope.
- **Named `supersede_stplan_record`/`supersede_stemo_record` patch ops.** The create-with-`supersedes` path is consistent with current story-state classes (the audit agrees); no parity addition.

## Deliverables

### Phase A — Selected-commitment trace validator (P0)
- A.1.1 `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` — the per-event trace validator (predicate satisfaction & existential binding, bound-effect reconciliation, CHC grounding link, alias hygiene, branch-locality). Register in the structural validator registry; ship warning-first for one revision cycle, then fail-closed.
- A.1.2 Fold the static-predicate grounding of `chc_slt_eligibility_source_grounding` into A.1 (single CHC↔SLT grounding validator post-spec); update its registry entry and tests rather than leaving two overlapping validators.
- A.1.3 The alias-resolution logic lives inside the `observer-firewall` validator body and the branch-locality logic inside the `branchIsolation` validator object — verified, neither is exported as a standalone helper today. Extract both into shared helpers that the new validator and the existing ones import, rather than reusing a non-existent export or duplicating the logic.

### Phase B — MCP STPLAN/STEMO parity (P1)
- B.1 `tools/world-mcp/src/tools/list-records.ts` + `get-record-schema.ts` — add `story_plan_record`/`story_emotion_record` to both allowlists and their node-type/schema-file maps.
- B.2 Meta-test reconciling both allowlists against `STORY_BUNDLE_NODE_TYPES`.

### Phase C — World-index affordance-ordinal fix (P1, corrective)
- C.1 `tools/world-index/src/parse/atomic.ts` — `edgesForChoice` reads `created_at_page`.
- C.2 Correct + schema-validate the two masking parser fixtures.

### Phase D — Skill-prose alignment (P1)
- D.1 Three predicate-enumeration sites → 11-predicate list or contract citation.
- D.2 Phase-6 motivation list → add STPLAN/STEMO.
- D.3 (No-op, recorded) Phase-7 §9b/§9c already current.

## Test Plan

Each PASS entry must carry a one-line rationale at implementation time (a bare PASS is treated as FAIL per the project's validation-test contract).

- **A.1 existential families** — for each existential-predicate-bindable class (`STPLAN`, `STEMO`, `CLK`, `STSEC`, `STQ`, `OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, `STINT`): a selected-`SLT` event whose eligibility used `any_<class>_active` and whose `alias_bindings` binds the correct active record → PASS; same with the alias bound to a wrong-class record → FAIL; same with no alias binding for the predicate → FAIL; same with the bound record not active in the parent snapshot → FAIL.
- **A.1 bound-effect reconciliation** — selected `SLT` with `effects.supersede: [bound:plan]`, `alias_bindings` binding the alias, and `SE.state_delta.supersede` containing the resolved record → PASS; same with the record omitted from `SE.state_delta.supersede` → FAIL; a `bound:<alias>` in `SE.state_delta` with no matching `alias_bindings` entry → FAIL.
- **A.1 CHC grounding link** — emitted-choice event whose selected `CHC` grounds in the bound existential record → PASS; grounds in an unrelated record with no background-only marker → FAIL; carries the background-only marker → PASS; weak incidental grounding → WARN; an emitted-choice event where multiple CHCs share the selected `SLT` as `associated_commitment_block` so the selected CHC is not uniquely resolvable → WARN (not FAIL), per the resolvability degradation in §Risks.
- **A.1 alias hygiene / branch-locality** — orphan `alias_bindings` entry referenced by no predicate/effect → WARN; bound record from a foreign branch → FAIL.
- **A.1 negative / no-overreach** — `SE.state_delta` entry with no corresponding SLT effect → PASS (events may commit beyond the block); a static-only SLT event unchanged from SPEC-50 D.2 behavior → still PASS/FAIL as before (regression-proves the fold-in).
- **A.2 write-in** — `write_in_attempt` event with a JIT `SLT`, existential bindings, bound effects, and matching `SE.state_delta` → PASS, validated by the same A.1 path; a write-in whose `SE.state_delta` omits a declared bound effect → FAIL.
- **B.1/B.2** — `list_records(record_type="story_plan_record")` and `"story_emotion_record"` return rows; `get_record_schema(node_type=...)` returns each schema; story-slug scoping disambiguates duplicate IDs across stories; meta-test fails if either allowlist drops a `STORY_BUNDLE_NODE_TYPES` member.
- **C.1/C.2** — schema-conformant `CHC` fixture (with `created_at_page`, validated against `story-choice.schema.json`) produces `choice_affordance_ordinal` edges anchored to the page node; the corrected fixtures still assert the intended edge set; a fixture with the old `parent_page_id` fails schema validation.
- **D** — focused grep/manual review confirms the three enumeration sites list all 11 existential predicates (or cite the contract) and Phase-6 lists STPLAN/STEMO; meta-check that no story skill's inline existential list omits a contract §5 predicate (optional lint).
- **Whole-suite** — `npm run build` + `npm test` green in `tools/validators`, `tools/world-index`, `tools/world-mcp`, `tools/patch-engine`; `world-validate` clean on a representative bundle.

## Risks & Open Questions

- **A.1 false positives on legacy bundles.** Existing private committed events may not carry complete `alias_bindings` for existential eligibility (the binding requirement post-dates SPEC-50 A.3). Mitigation: ship A.1 warning-first for one revision cycle (SPEC-44/49/50 precedent); fail-closed only after the compatibility window. Quantify by running A.1 in warn mode over available private bundles before flipping to fail.
- **A.3 validator-merge shape.** Folding `chc_slt_eligibility_source_grounding` into A.1 vs. invoking a shared helper is an implementation decision; the invariant is exactly one CHC↔SLT grounding validator afterward. Re-grep for callers/tests of the existing validator at implementation time.
- **A.1 selected-CHC resolvability.** The validator must resolve "the selected CHC" from the event/page for `selection_source = emitted_choice`. Confirm the link is reconstructable from indexed edges (`event_selected_storylet`, `page_emitted_choice`, `choice_associated_storylet`) without a new field; if not reconstructable, the CHC-grounding sub-check (A.1 step 3) degrades to WARN rather than forcing a schema addition (which §5b forbids).
- **B drift guard scope.** The meta-test reconciles only the two parity allowlists; other per-tool allowlists are out of scope unless verification finds the same omission class elsewhere.

## Outcome

(Pending implementation.)
