<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-36 — Story Pipeline Ninth-Iteration Fixes

**Status**: DRAFT
**Date**: 2026-05-16
**Supersedes**: completes the validator-hardening-II cluster deferred at `archive/specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` §Risks & Open Questions (D4 full witness coverage; D5 `causal_dependency_threat_scan` four-subcase implementation)

## Problem Statement

`reports/story-related-improvements-ninth-iteration.md` is the ninth external review (ChatGPT-Pro, with GitHub code-search and file-viewing integration, source-only — running MCP not invoked). It produced an eighth-fix verification ledger (F1–F9: 5 fully fixed, 1 still open, 3 partially fixed), 5 explicit P1/P2 findings (WL-N9-P1-001 through WL-N9-P2-005), 5 amendment recommendations (A–E), a red-team support matrix, and a research-synthesis section. The auditor's executive verdict — *"basically sound but still test-deficient, partially implementation-drifted, runtime/deployed-unverified, and carrying two important eighth-iteration leftovers... the eighth-iteration fixes landed where they mattered most, but `causal_dependency_threat_scan` is still not mechanized, witness coverage is only tag-shape validation, and padded test fixtures still normalize old contracts"* — survives codebase verification verbatim.

Codebase verification (four parallel Explore agents across the four claim clusters — validator registry; MCP capability surface; context-packet / story-state contract; spec-authoring conventions) confirms all five findings hold up against current source at HEAD. Two of the findings (P1-001 `causal_dependency_threat_scan`; P1-002 `expected_witness_coverage`) are explicit carry-overs SPEC-35 itself routed into the "validator-hardening-II" cluster; this spec discharges that cluster. Three (P2-003 padded test IDs; P2-004 archive citation; P2-005 capability parity tests) are pre-existing drift the ninth iteration surfaced. One out-of-report finding (PG/BEL/SE context-packet seed-variant test coverage) extends the F3 / SPEC-35-D3 test surface and rolls into D6.

Production-readiness window matches SPEC-35's: zero active `_source/` story bundles depend on the surfaces this spec touches; pilot-tier story bundles remain pending per the most recent `archive/specs/IMPLEMENTATION-ORDER-2026-05-09.md`. The blast radius is two new validator files (D1, D2), one fixture sweep with regex-tightening (D3), one docs file (D4), one new test file + minor extensions (D5), and one test-extension (D6). No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields. Skill-prose updates at the consumers of D1 and D2 (turn-cycle, health-audit) flip the existing "deferred — see SPEC-35 §Risks" pointers to "validator-backed; see this spec".

### Key design decisions

- **Considered implementing `expected_witness_coverage` with the auditor's natural-language event-class trigger (events involving "secrecy, betrayal, deception, violence, sex, law, status, or public ritual"); chose a deterministic STLOC + STSTAT co-location trigger over semantic event-class classification `(pragmatic — scoping)`.** The strictly-correct version would semantically classify event kinds, which puts the validator on an inherently judgment-shaped surface (no `event_kind` enum carries those classifications; adding one would be a schema change that §13 Anti-recommendations explicitly rejects). The chosen heuristic — "SE whose STLOC has `location` not in {concealed, offstage} AND whose actor's `state_delta` either creates BEL with `visibility` in {public, shared, factional, rumored} or supersedes any other STENT's STSTAT — must either create BEL records for active co-located STENTs or carry a `non_propagation:` tag with a computed-matching group" — is computable from existing fields (verified at `story-event.schema.json` `state_delta`, `story-status.schema.json` `location/life/agency`, `story-belief.schema.json` `holder/visibility/basis`) and covers the red-team motivation ("public betrayal that fails to create BEL still passes") under the most common shape. The remaining semantic judgment (which event kinds are "expected" to be public) stays in skill prose where it already lives. Under stricter constraints (e.g., adding an `SE.requires_witness_coverage` boolean field), a tighter check would be possible — explicitly rejected here per §13 schema-minimalism.

- **Considered scoping `causal_dependency_threat_scan` to fewer than the auditor's four subchecks; chose all four (`choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, `slt_precondition_clobbered`) because each maps cleanly to one existing schema relationship.** CHC.grounded_in.records, STLOC/STOBJ/STENT life/agency/location, OBL.owed_by/owed_to, and SLT.preconditions are all verified-existing fields; no subcheck requires schema extension. Splitting the four across multiple specs would force four registry registrations, four sets of skill-prose updates, and four CLI-integration sanity passes for marginal benefit.

- **Considered tightening schema regexes (e.g., `^PG-[0-9]+$` → `^PG-(0|[1-9][0-9]*)$`) as part of D3; chose to include the tightening rather than defer.** The loose `[0-9]+` form admits both padded and unpadded IDs and is the mechanical reason F8 / WL-N9-P2-003 keeps recurring; tightening converts a fixture-discipline issue into a structural enforcement. Acceptance criterion includes a negative golden test that padded IDs fail `record_schema_compliance`. Worked precedent: SPEC-35 D8 swept fixtures but did not touch regexes; the audit shows fixture-only fixes are insufficient to prevent recurrence.

- **Considered adding a deterministic doc-lint for archive citations (the auditor's optional Amendment D "doc lint: current docs must not cite `archive/` without `historical`, `archived`, or `not current authority`"); chose to scope D4 to the named README line only and route the doc-lint to §Risks & Open Questions as a follow-up `(pragmatic)`.** A repo-wide doc-lint requires deciding which directories count as "current docs", scanning their entire contents, and authoring a regex that distinguishes legitimate historical-pointer phrasing from drift. The named single-line README replacement closes the audit-trail drift now; the lint is a separate-scope hardening that can land in a future doc-hygiene pass without blocking this spec.

- **Considered framing D5 capability parity as a runtime/deployed-server integration test; chose source-level parity assertions extending the existing `list-tools.test.ts` pattern.** The auditor's own §14 acknowledges runtime verification is unverifiable from source-only inspection; a source-level test cannot catch "deployed MCP server stale relative to rebuilt source" — that is a deployment/operational concern. What a source-level test CAN catch is internal drift between MCP_TOOL_ORDER, describe_capabilities output, OPERATION_KINDS, describe_envelope_schema op kinds, and the validator registry. The auditor's "build metadata recency" sub-item is dropped (vague — "recent enough" can't be operationalized in CI). Runtime/deployed verification stays a tenth-iteration carry-over.

- **Considered including D6 (PG/BEL/SE context-packet seed-variant tests) as a separate spec; chose to roll it into this spec because it is a small extension of F3 / SPEC-35-D3 already documented in the audit's §11.3 P2 test #5.** The test addition is a single test file extension touching the same `get-context-packet.story-pipeline.test.ts` surface SPEC-35 D3 added; landing it here is cheaper than spinning a separate spec.

---

## Approach

Each deliverable targets a single named finding or audit-traced gap. The six deliverables fall into three architectural concerns:

- **New deterministic structural validators** (D1, D2): two validators implementing the validator-hardening-II cluster deferred from SPEC-35. Both operate over existing fields; both register in `tools/validators/src/public/registry.ts`; both consume the same patch-plan validation entry points (`validate_patch_plan`, `submit_patch_plan`); both surface in the existing health-audit replay phases.
- **Schema and fixture hardening** (D3): convert padded mock IDs to unpadded in the two named test files (and any sibling fixtures the operator's authoring-time grep sweep surfaces); tighten story-bundle ID regexes from `^<PREFIX>-[0-9]+$` to `^<PREFIX>-(0|[1-9][0-9]*)$` so padded IDs fail `record_schema_compliance` mechanically going forward; add one negative golden test.
- **Docs and capability-parity hardening** (D4, D5, D6): D4 replaces the archived-spec citation in `tools/validators/README.md`; D5 adds source-level capability-parity assertions to the existing `list-tools.test.ts` pattern; D6 extends the SPEC-35-D3 context-packet seed-variant test with PG/BEL/SE seed types.

Cross-iteration discipline: D1 and D2 discharge SPEC-35's §Risks & Open Questions deferrals (validator-hardening-II); both must update the skill-prose pointers at `branching-story-turn-cycle/SKILL.md:439,443` and `branching-story-health-audit/SKILL.md:196,236` from "deferred — see SPEC-35 §Risks" to "validator-backed; see SPEC-36 D1/D2". D3 closes the recurrence channel SPEC-35 D8 swept but did not seal. D4 follows SPEC-35 D9's pattern (archive citation → current authority + historical caveat). D5 follows the existing `tools/world-mcp/tests/server/list-tools.test.ts` pattern (extend rather than parallel). D6 follows SPEC-35 D3's test-extension pattern.

Implementation phasing recommendation (for ticket decomposition):

- **Phase 1 (independent, parallelizable)**: D3 (fixtures + regexes), D4 (README), D5 (parity tests), D6 (seed-variant tests). All four are self-contained and can land in any order.
- **Phase 2 (after Phase 1)**: D1 (causal_dependency_threat_scan) and D2 (expected_witness_coverage). Larger; benefit from landing after D3 to avoid mixing validator-implementation churn with fixture cleanup. D1 and D2 are independent of each other and can land in parallel within Phase 2.
- **Phase 3 (after D1 + D2 land)**: skill-prose update sweep at the four consumer sites (turn-cycle Phase 9 prose; health-audit Phase 2d / Phase 2g prose). Small ordering preference; one-deliverable scope per skill.

No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields. The blast radius is two new validator source files + their tests + registry entries (D1, D2), one regex-tightening + fixture sweep (D3), one README line (D4), one test-extension file (D5), one test-extension (D6), and skill-prose edits at the four consumer sites (D1 and D2 only).

---

## Deliverables

Deliverables grouped by severity (P1 → P2). Each is self-contained and can land as its own ticket.

### D1 — Implement `causal_dependency_threat_scan` validator (P1, intake WL-N9-P1-001 / Amendment A)

**Problem**: `tools/validators/src/public/registry.ts:33-54` exposes 20 structural validators; `causal_dependency_threat_scan` is not among them. Both `branching-story-turn-cycle/SKILL.md:443` and `branching-story-health-audit/SKILL.md:236` explicitly state *"Full deterministic `causal_dependency_threat_scan` validator implementation deferred — see SPEC-35 §Risks & Open Questions"*. The deferred work covers four named subcases — choice / affordance / obligation / SLT dependencies — that protect against turns clobbering the dependency surface visible CHC, OBL, and SLT records rely on. SPEC-35 §Risks routed the cluster to a follow-up validator-hardening-II spec; this is that spec.

**Change**:

1. **New validator file** (`tools/validators/src/structural/causal-dependency-threat-scan.ts`): implement the validator with `name: "causal_dependency_threat_scan"`, `severity_mode: "fail"`, applying to patch plans that include any of `create_se_record | create_pg_record | create_chc_record | create_slt_record` ops. Emit four verdict codes:

   - `choice_dependency_clobbered`: for each CHC visible in the child PG snapshot (those listed in `PG.snapshot.active_records.CHC` after the SE resolves), check each ID in `CHC.grounded_in.records[]`. If the resolving SE's `state_delta.close[]`, `state_delta.supersede[]` (when the supersession changes life/agency/location), or any STSTAT supersession by the same SE renders the grounded record inactive/unavailable, and the CHC is not itself superseded or closed by the same SE, emit verdict.

   - `affordance_dependency_clobbered`: for each STLOC/STOBJ/STENT referenced in active CHC grounded_in records or in `PG.snapshot.affordances[]` (if the snapshot carries them), check whether the resolving SE's `state_delta` invalidates the source: for STLOC, an SE that moves all active STENTs out (per STSTAT supersessions) or supersedes the STLOC itself with `location` enum drift; for STOBJ, supersession or close; for STENT, STSTAT life=dead or agency in {incapacitated, captive, dead} without a corresponding affordance close.

   - `obligation_counterparty_unavailable_without_transfer`: for each active OBL in the snapshot, check `OBL.owed_by` and `OBL.owed_to` STENT references. If the resolving SE supersedes any of those STENTs' STSTAT with `life: dead` OR `agency` in {incapacitated, captive, dead, unconscious} OR `location` in {unknown, concealed, offstage}, AND the same SE does not close the OBL (`state_delta.close` does not include the OBL id) AND does not transfer it (no superseding OBL with the same `owed_by`/`owed_to` but different counterparty), emit verdict.

   - `slt_precondition_clobbered`: for each SLT in the global author pool (or bundle-scope, per `SLT.scope`) whose `preconditions.hard[]` evaluated true against the parent PG snapshot, check whether the resolving SE's `state_delta` invalidates any precondition record (the same STSTAT / STLOC / STOBJ / OBL invalidation logic above). If the SLT is high-salience (operator-defined: any SLT bound to an OBL with `urgency` in {high, critical} OR any SLT explicitly tagged `causal_critical: true` if the field exists; otherwise all SLTs) and a precondition is clobbered AND no replacement SLT is emitted in the same patch plan AND the depending OBL/CNSQ/THR is not closed, emit verdict.

2. **Registry registration** (`tools/validators/src/public/registry.ts`): add the import and append `causalDependencyThreatScan` to the `structuralValidators` array. Maintain alphabetical-by-export-name convention if other validators already follow it; otherwise append at the end. Update `tools/validators/tests/structural/registry.test.ts` to include `"causal_dependency_threat_scan"` in the expected validator-name list.

3. **Test file** (`tools/validators/tests/structural/causal-dependency-threat-scan.test.ts`): one test per subcase plus one accept-path per subcase (eight tests minimum):

   - `causal_dependency_threat_scan_rejects_choice_dependency_clobbered` — fixture: PG parent with CHC grounded in STOBJ-1; SE state_delta.close includes STOBJ-1; child PG still emits the CHC. Expect verdict `choice_dependency_clobbered`.
   - `causal_dependency_threat_scan_accepts_clobbered_dependency_when_choice_also_closed` — same fixture, but child PG snapshot drops the CHC. Expect no verdict.
   - `causal_dependency_threat_scan_rejects_affordance_dependency_clobbered` — fixture: visible affordance tied to STLOC; SE supersedes STLOC. Expect verdict `affordance_dependency_clobbered`.
   - `causal_dependency_threat_scan_accepts_affordance_when_destination_provided` — same fixture with replacement STLOC and CHC re-grounding. Expect no verdict.
   - `causal_dependency_threat_scan_rejects_obligation_counterparty_unavailable_without_transfer` — fixture: active OBL with `owed_to: STENT-1`; SE supersedes STSTAT-for-STENT-1 with `life: dead`; OBL not closed. Expect verdict.
   - `causal_dependency_threat_scan_accepts_obligation_transferred` — same fixture, but a new OBL is created with the same `owed_by` and different `owed_to`, and the original OBL is closed. Expect no verdict.
   - `causal_dependency_threat_scan_warns_slt_precondition_clobbered` — fixture: high-urgency OBL with eligible SLT in author pool; SE invalidates a precondition record without SLT replacement. Expect verdict `slt_precondition_clobbered`.
   - `causal_dependency_threat_scan_accepts_slt_precondition_clobbered_when_replacement_emitted` — same fixture with a replacement SLT emitted in the same patch plan. Expect no verdict.

4. **Skill-prose alignment** at the two consumer sites:

   - `.claude/skills/branching-story-turn-cycle/SKILL.md:443`: replace *"Causal dependency threat scan (judgment-based pre-apply review; full deterministic `causal_dependency_threat_scan` validator implementation deferred — see SPEC-35 §Risks & Open Questions)"* with *"Causal dependency threat scan (deterministic validator `causal_dependency_threat_scan`; see `tools/validators/src/structural/causal-dependency-threat-scan.ts` and SPEC-36 D1)"*. Preserve the rest of the bullet (the four-subcase enumeration is still informative for skill readers).
   - `.claude/skills/branching-story-health-audit/SKILL.md:236`: replace *"Full deterministic `causal_dependency_threat_scan` validator implementation is deferred; see SPEC-35 §Risks & Open Questions"* with *"Full deterministic `causal_dependency_threat_scan` validator is registered; see `tools/validators/src/structural/causal-dependency-threat-scan.ts` and SPEC-36 D1. Replay sub-checks listed here remain in place to surface the same verdicts during health-audit replay even when patch-plan validation was bypassed during initial commit"*.

**FOUNDATIONS alignment**: §Story Bundles §4a (Plan-Authority Boundary — clobbering a dependency a visible record relies on violates the snapshot's authority over what the player can act on); §Story Bundles §5 Rule 5 (No Consequence Evasion — a closed/superseded record can't silently still offer an affordance); Schema Minimalism (no new fields; validator computes over existing relationships).

**Acceptance criteria**:
- `causal_dependency_threat_scan` appears in `structuralValidators` array exports and in `registry.test.ts` expected list.
- All eight test cases pass; failure-case tests fail pre-implementation (or pass trivially if validator absent — depending on test harness), pass after implementation.
- `npm run build && npm test` green in `tools/validators/`.
- Grep for *"causal_dependency_threat_scan ... deferred"* across `.claude/skills/` returns zero matches.

---

### D2 — Implement `expected_witness_coverage` validator (P1, intake WL-N9-P1-002 / Amendment B)

**Problem**: `tools/validators/src/structural/non-propagation-tag-shape.ts:4-7` source comment explicitly states *"Full witness coverage (computing direct/indirect witnesses from active STSTAT.location/agency, event kind/targets, BEL.basis.source_event) is planned for validator-hardening-II; see SPEC-35 Risks & Open Questions"*. The current `non_propagation_tag_shape` validator checks tag syntax, closed-reason coverage, and record-ID shape only — never queries SE/BEL/STSTAT to compute expected witness groups. Both `branching-story-turn-cycle/SKILL.md:439` and `branching-story-health-audit/SKILL.md:196` describe the gap consistently. Audit motivation: a public betrayal / violence / status event that fails to create BEL records can pass `non_propagation_tag_shape` if the SE author wrote a syntactically valid tag for a wrong group label.

**Change**:

1. **New validator file** (`tools/validators/src/structural/expected-witness-coverage.ts`): implement the validator with `name: "expected_witness_coverage"`, `severity_mode: "fail"`, applying to patch plans that include `create_se_record` ops. Keep `non_propagation_tag_shape` unchanged (do not modify or delete the existing validator).

   **Deterministic trigger condition**. The validator fires on an SE record when ALL of the following hold:

   - `SE.event_kind` is not `audit_only` (audit-only SE shapes are exempt; see `audit_only_se_shape` validator).
   - The actor's STSTAT-derived `location` (from the most recent active STSTAT for `SE.actor` at parent-PG snapshot) is in the schema's STLOC set (i.e., a STLOC-N id) AND that STLOC's `location` field is not in {`concealed`, `offstage`}. (Locations explicitly tagged as non-witnessable surface no expected-witness obligation.)
   - The SE's `state_delta` either (a) creates one or more BEL records with `visibility` in {`public`, `shared`, `factional`, `rumored`}, OR (b) supersedes any STSTAT for a STENT other than the actor, OR (c) creates/supersedes any STENT, OR (d) creates one or more DA records with `visibility` matching the same set.

   This trigger is mechanically computable from existing fields and does not require classifying event kinds semantically. Skill prose continues to describe the audit-flavored "secrecy, betrayal, deception, violence, sex, law, status, public ritual" intent for authors; the validator catches the subset of those events whose deltas produce mechanically-visible consequences at non-concealed STLOCs.

   **Expected-witness group computation**. For each triggering SE, compute:

   - `direct_witness_group`: all active STENT-ids whose most-recent STSTAT at parent-PG snapshot has `location` equal to the SE actor's `location` AND `life: alive` AND `agency` not in {`incapacitated`, `unconscious`, `dead`}, excluding the actor itself.
   - `indirect_witness_group`: all active STENT-ids whose most-recent STSTAT at parent-PG snapshot has `location` matching any STLOC in the same `parent_location` chain as the actor's STLOC (per `STLOC.parent_location` if the field exists; otherwise empty), with the same alive/agency filter.

   **Coverage check**. For the triggering SE, the validator accepts when EITHER:

   - The SE's `state_delta.create[]` includes BEL records whose `holder` covers every STENT in `direct_witness_group` (one BEL per STENT, OR one BEL with `holder` in `group:<label>` / `public` form whose semantic membership the validator can verify against the computed group), AND whose `basis.source_event` matches the triggering SE id, AND whose `visibility` is appropriate to the holder type; OR
   - The SE's `world_logic_rationale` contains a parseable `non_propagation:<reason>(group=<label>, records=[...])` tag whose `<reason>` is in the closed set (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`), whose `<label>` matches a computed direct or indirect group label, AND whose `records=[...]` ids exist and correspond to that group.

   On failure, emit one of:
   - `expected_witness_coverage_missing_public_bel` — trigger fires; neither BEL coverage nor a valid non-propagation tag is present.
   - `expected_witness_coverage_wrong_group_label` — non-propagation tag's `<label>` does not match any computed witness group.
   - `expected_witness_coverage_partial_bel_coverage` — BEL coverage for the computed group is incomplete (some STENTs in `direct_witness_group` lack a BEL).
   - `expected_witness_coverage_tag_records_unresolved` — non-propagation tag cites records that do not exist or do not belong to the computed group.

2. **Registry registration** (`tools/validators/src/public/registry.ts`): add the import and append `expectedWitnessCoverage` to the `structuralValidators` array. Update `tools/validators/tests/structural/registry.test.ts` to include `"expected_witness_coverage"` in the expected validator-name list.

3. **Test file** (`tools/validators/tests/structural/expected-witness-coverage.test.ts`): one test per verdict code plus accept-paths (seven tests minimum):

   - `expected_witness_coverage_rejects_missing_public_bel` — fixture: SE at non-concealed STLOC with two active co-located STENTs other than actor; state_delta creates public-visibility DA but no BEL records and no non-propagation tag. Expect verdict.
   - `expected_witness_coverage_rejects_wrong_group_label` — fixture: SE at public STLOC; non-propagation tag with `group=guards` when computed group label is `group=tavern_patrons`. Expect verdict.
   - `expected_witness_coverage_rejects_partial_bel_coverage` — fixture: SE at public STLOC with three co-located STENTs; only one BEL created. Expect verdict.
   - `expected_witness_coverage_rejects_tag_records_unresolved` — fixture: valid non-propagation tag but `records=[STENT-99]` where STENT-99 does not exist. Expect verdict.
   - `expected_witness_coverage_accepts_full_bel_coverage` — fixture: BEL records for every direct witness; expect no verdict.
   - `expected_witness_coverage_accepts_valid_non_propagation_evidence` — fixture: offstage/concealed event with valid tag citing DA/STOBJ evidence. Expect no verdict.
   - `expected_witness_coverage_does_not_trigger_for_concealed_location` — fixture: SE at STLOC with `location: concealed`; no BEL, no tag. Expect no verdict (trigger does not fire).

4. **Skill-prose alignment** at the two consumer sites:

   - `.claude/skills/branching-story-turn-cycle/SKILL.md:439`: replace *"The deployed structural validator for tag syntax is `non_propagation_tag_shape` (full witness coverage planned but not yet implemented; see SPEC-35 Risks & Open Questions)"* with *"The deployed structural validators are `non_propagation_tag_shape` (tag-syntax check) and `expected_witness_coverage` (semantic STLOC + STSTAT co-location coverage check; see SPEC-36 D2). Authors may rely on either BEL creation or a valid non-propagation tag for the computed witness group"*.
   - `.claude/skills/branching-story-health-audit/SKILL.md:196`: replace the *"full witness coverage planned but not yet implemented; see SPEC-35 Risks & Open Questions"* clause with *"the structural validator `expected_witness_coverage` performs semantic STLOC + STSTAT co-location witness-group computation; see `tools/validators/src/structural/expected-witness-coverage.ts` and SPEC-36 D2"*.

5. **Source comment cleanup** at `tools/validators/src/structural/non-propagation-tag-shape.ts:4-7`: replace the *"Full witness coverage ... is planned for validator-hardening-II; see SPEC-35 Risks & Open Questions"* comment with *"Full witness coverage is performed by the sibling validator `expected_witness_coverage` (see `./expected-witness-coverage.ts`). This validator remains the tag-syntax check for non-propagation tags"*.

**FOUNDATIONS alignment**: §Story Bundles §5 Rule 5 (No Consequence Evasion — public events must produce belief consequences in observers); §Story Bundles §6a (Belief vs. Fact — BEL records are the canonical surface for observer consequences); Schema Minimalism (no new fields; validator computes over existing STLOC/STSTAT/BEL/SE relationships).

**Acceptance criteria**:
- `expected_witness_coverage` appears in `structuralValidators` array exports and in `registry.test.ts` expected list.
- `non_propagation_tag_shape` continues to pass all its existing tests unchanged.
- All seven test cases pass.
- `npm run build && npm test` green in `tools/validators/`.
- Grep for *"full witness coverage planned but not yet implemented"* across `.claude/skills/` and `tools/validators/src/` returns zero matches.

---

### D3 — Tighten story-bundle ID regexes and convert padded test fixtures (P2, intake WL-N9-P2-003 / Amendment C)

**Problem**: `tools/validators/tests/structural/observer-firewall.test.ts:9-12` and `tools/validators/tests/structural/branch-isolation.test.ts:9-14` use padded mock IDs (`PG-0001`, `CHC-0001`, `BEL-0001`, `SF-0001`, `BR-0001`, `STENT-0001`). FOUNDATIONS-002 mandates unpadded natural-integer IDs. The current schema regex pattern `^PG-[0-9]+$` (verified at `tools/validators/src/schemas/story-page.schema.json:22` and analogous for sibling story-bundle schemas) accepts both forms, so padded IDs pass `record_schema_compliance` and the fixture rot persists. SPEC-35 D8 swept other fixture files but did not address the regex.

**Change**:

1. **Tighten regex on all story-bundle ID schemas**. For each story-bundle record schema in `tools/validators/src/schemas/` (story-page, story-choice, story-event, story-belief, story-fact, story-obligation, story-consequence, story-thread, story-relationship, story-status, story-location, story-object, story-entity, story-intention, story-storylet, story-branch, plus any sibling story diegetic-artifact / SLT-batch / promotion / closeout / RSP schemas — operator's authoring-time grep sweep enumerates the full set), replace each `^<PREFIX>-[0-9]+$` pattern with `^<PREFIX>-(0|[1-9][0-9]*)$`. This admits `0` and any non-zero integer without leading zeros, rejecting padded forms. Reference-field patterns within those schemas (e.g., `BEL.basis.source_event` pattern `^SE-[0-9]+$`) receive the same tightening for consistency.

2. **Convert padded mock IDs in the two named files**. In `tools/validators/tests/structural/observer-firewall.test.ts` and `tools/validators/tests/structural/branch-isolation.test.ts`, replace `PG-0001` → `PG-1`, `CHC-0001` → `CHC-1`, `BEL-0001` → `BEL-1`, `SF-0001` → `SF-1`, `BR-0001` → `BR-1`, `STENT-0001` → `STENT-1`, `SE-0001` → `SE-1`, `SLT-0001` → `SLT-1`. Do not change test logic; only IDs.

3. **Authoring-time sibling sweep**. Before declaring D3 complete, grep across `tools/validators/tests/` and `tools/world-mcp/tests/` for `-[0]{2,}[0-9]+` patterns matching story-bundle prefix tokens (`PG|CHC|BEL|SF|SE|BR|STENT|SLT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STINT|STSTAT|DA`). For each hit, convert to unpadded unless the test explicitly asserts padded-ID rejection (in which case keep the padded form and add a comment naming the negative-test intent).

4. **Negative golden test** (`tools/validators/tests/structural/record-schema-compliance.padded-id-rejection.test.ts` or appended to existing `record-schema-compliance` test file): a single test that constructs a minimal PG fixture with id `PG-0001`, runs `record_schema_compliance`, and asserts the verdict array contains an error referencing the regex violation. Repeat for one BEL fixture with `BEL-0001` to cover both schema files. Two tests minimum.

**FOUNDATIONS alignment**: FOUNDATIONS-002 (unpadded natural-integer ID convention — schema tightening converts a documentation convention into mechanical enforcement); §Read Discipline (test fixtures train contributors into current contracts).

**Implementation note (2026-05-16 / SPEC36STOPIPNIN-004)**: D3 landed the schema tightening plus validators-package fixture normalization, appended PG/BEL padded-id rejection tests to the existing class-specific `record_schema_compliance` tests, and also updated `tools/validators/src/structural/recursive-reference-closure.ts` so branch-prefix storylet visibility uses the same unpadded `PG` id pattern now enforced by `story-storylet.schema.json`. `tools/world-mcp/tests/` padded literals were classified as allocator/legacy/world-level or consumer-package fixtures and left out of this validators-package ticket.

**Acceptance criteria**:
- Grep across `tools/validators/src/schemas/` for `\\[0-9\\]\\+\\$` returns zero matches in story-bundle schema files (all replaced with `(0|[1-9][0-9]*)$` pattern); world-canon schemas (CF, CH, INV, M, OQ, ENT, SEC) are out of scope and unchanged.
- Grep across `tools/validators/tests/` and `tools/world-mcp/tests/` for `-[0]{2,}[0-9]+` matching story-bundle prefixes returns zero matches, OR every match carries a comment naming the negative-test intent.
- The two negative golden tests pass: padded `PG-0001` and `BEL-0001` fail `record_schema_compliance`.
- Existing test suites pass after the conversion: `npm run build && npm test` green in `tools/validators/`.

---

### D4 — Replace archive citation in validators README (P2, intake WL-N9-P2-004 / Amendment D)

**Problem**: `tools/validators/README.md:5` cites `**Design**: ../../archive/specs/SPEC-04-validator-framework.md` without a historical caveat. The ninth-iteration authority order — and SPEC-35 D9's precedent — say archived files are not current authority; current docs citing archive as design authority can resurrect stale specs in reader memory.

**Change**:

1. **README replacement**. Replace `tools/validators/README.md:5`:

   ```
   **Design**: `../../archive/specs/SPEC-04-validator-framework.md`
   ```

   with:

   ```
   **Current authority**: `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `docs/MACHINE-FACING-LAYER.md`, and the current non-archived validator source under `tools/validators/src/`.

   Historical note: `archive/specs/SPEC-04-validator-framework.md` is archived prior art only. It is not current design authority.
   ```

2. **No test artifact required for the deliverable itself**. The optional repo-wide doc-lint (the auditor's "current docs must not cite `archive/` without `historical`, `archived`, or `not current authority`") is routed to §Risks & Open Questions as a separate-scope follow-up.

**FOUNDATIONS alignment**: §Read Discipline (current-source-over-archived discipline applies to validator docs too).

**Acceptance criteria**:
- Grep `tools/validators/README.md` for `archive/specs/` returns either zero hits, OR the only hit is the historical-note line where the path appears next to the explicit "archived prior art only" caveat.
- The cited current authorities (`docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/validators/src/`) all exist.

---

### D5 — Add MCP capability parity tests (P2, intake WL-N9-P2-005 / Amendment E)

**Problem**: `tools/world-mcp/tests/server/list-tools.test.ts` verifies `client.listTools()` matches `getRegisteredToolNames()` (and thus `MCP_TOOL_ORDER`). It does NOT verify that `describe_capabilities` output, `describe_envelope_schema` op-kind coverage, and the validator registry match their respective source-of-truth lists. A fix can land in TypeScript source while one of these capability surfaces drifts. The audit-flagged runtime/deployed-server staleness is acknowledged out-of-scope here (source-level tests cannot detect runtime drift); D5 closes source-level parity gaps only.

**Change**:

1. **New test file** (`tools/world-mcp/tests/server/capability-parity.test.ts`): three test cases.

   - `describe_capabilities_lists_every_registered_tool` — instantiate the server-level describe-capabilities builder, assert that the `tools[]` array's `name` field set equals `MCP_TOOL_ORDER` (the source-of-truth in `tools/world-mcp/src/tool-names.ts`). Order-sensitive comparison since `MCP_TOOL_ORDER` is order-significant per its existing contract.

   - `describe_envelope_schema_covers_every_operation_kind` — for each kind in `OPERATION_KINDS` (`tools/patch-engine/src/envelope/schema.ts:58-92`), call `describe_envelope_schema` for that kind, assert the result is non-error, and assert that the `properties.record.$ref` field is present (i.e., every op kind maps to a record schema or returns a structured envelope). Fail loudly if any kind returns `not_supported` or analogous.

   - `validator_registry_contains_every_named_validator` — import `structuralValidators` from `tools/validators/src/public/registry.ts` and `rulesValidators` (if a separate export exists), build the set of `name` values, and assert it equals an explicit expected set hardcoded in this test (a literal string array containing every validator name this iteration knows about, including the SPEC-36 additions `causal_dependency_threat_scan` and `expected_witness_coverage`). The hardcoded list is the source of audit-trail intent: future validator additions force a deliberate update to this test, surfacing accidental drops.

2. **Drop the report's "build metadata recency" sub-item**. The auditor's Amendment E mentions checking that "build metadata/ref is present and recent enough for deployment check". "Recent enough" cannot be operationalized in CI without a deployment-stamp comparison that goes beyond source-level testing. Source-level tests confirm the surface; runtime parity remains a tenth-iteration carry-over (see §Risks & Open Questions).

3. **No handler/tool implementation changes intended**. The new test consumes existing exports. Reassessment may truth small same-seam capability-metadata ordering drift if the parity test exposes it; `tools/world-mcp/src/tools/` remains out of scope.

**Implementation note (2026-05-17 / SPEC36STOPIPNIN-003)**: D5 landed `tools/world-mcp/tests/server/capability-parity.test.ts` with source-level parity checks for `describe_capabilities`, `describe_envelope_schema`, and the validators registry. Reassessment corrected the drafted uniform `payload.properties.record.$ref` assertion to the live operation-specific payload schema shape, fixed a real `describe_capabilities` ordering drift in `tools/world-mcp/src/server.ts` by ordering the capability list via `MCP_TOOL_ORDER`, and truthed the `get_record_schema` storylet regex expectation in `tools/world-mcp/tests/tools/get-record-schema.test.ts` to SPEC-36 D3's unpadded id contract.

**FOUNDATIONS alignment**: §Machine-Facing Layer (capability and schema-discovery currency — source-level parity is a prerequisite for any runtime parity check).

**Acceptance criteria**:
- All three test cases pass against current source.
- The hardcoded validator-name list in `validator_registry_contains_every_named_validator` includes the SPEC-36 additions (asserts that D1 and D2 actually landed in the registry).
- `npm run build && npm test` green in `tools/world-mcp/` and `tools/validators/`.

---

### D6 — Extend context-packet story-local seed test with PG/BEL/SE variants (P2, intake §11.3 P2 test #5 / out-of-report extension of SPEC-35 D3 / F3)

**Problem**: `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` currently exercises only SF and STENT seed-id types against the story-local-seed filter at `tools/world-mcp/src/tools/get-context-packet.ts:30`. The filter pattern matches 20 story-local types (SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STENT, STSTAT, STLOC, STOBJ, BR, PG, CHC, SLT, SLB, SAU, SP, RSP). The audit's §11.3 P2 test #5 asks for PG/BEL/SE seed-variant coverage. Without these, SPEC-35 D3's coverage has gaps where a regression that broke PG-seed filtering specifically would slip past CI.

**Change**:

1. **Test extension** (`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`): add three test cases following the existing SF / STENT pattern.

   - `get_context_packet_ignores_pg_seed_nodes` — supply seed_nodes `["PG-1", "CF-1"]` (mixed story-local + world-canon); assert PG-1 is filtered, CF-1 is preserved, and the warning `story_local_seed_nodes_ignored` is emitted.
   - `get_context_packet_ignores_bel_seed_nodes` — supply seed_nodes `["BEL-1", "CF-1"]`; assert BEL-1 is filtered, CF-1 is preserved, and the warning is emitted.
   - `get_context_packet_ignores_se_seed_nodes` — supply seed_nodes `["SE-1", "CF-1"]`; assert SE-1 is filtered, CF-1 is preserved, and the warning is emitted.

2. **No changes to `tools/world-mcp/src/tools/get-context-packet.ts`**. The filter pattern already matches these types; D6 only adds test coverage of the existing behavior.

**FOUNDATIONS alignment**: §Story Bundles §3 (Read Discipline — story-local records load through `story_slug`-scoped tools, not world-scope context-packet seeds).

**Acceptance criteria**:
- All three new test cases pass.
- `npm run build && npm test` green in `tools/world-mcp/`.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §4a (Plan-Authority Boundary) | aligns | D1's `causal_dependency_threat_scan` enforces that the committed page snapshot's authority survives a turn — visible CHC/affordance/OBL/SLT records cannot be left in an incoherent state by the resolving SE. |
| §Story Bundles §5 Rule 5 (No Consequence Evasion) | aligns | D1 protects against silent consequence evasion (a closed record still appearing to offer affordances); D2's `expected_witness_coverage` protects against silent observer-consequence evasion (a public event with no BEL records and no valid non-propagation tag). |
| §Story Bundles §6a (Belief vs. Fact) | aligns | D2 enforces that public events with mechanically-visible deltas at non-concealed STLOCs produce the BEL records or evidence-cited non-propagation tags the contract requires. |
| §Story Bundles §3 (Read Discipline) | aligns | D6 extends the existing test surface for story-local seed filtering with three additional seed types, hardening the discipline that story-local records load through `story_slug`-scoped tools. |
| FOUNDATIONS-002 (unpadded natural-integer ID convention) | aligns | D3 tightens story-bundle ID schemas to mechanically reject padded forms and converts named fixture files; converts a documentation convention into structural enforcement. |
| §Machine-Facing Layer (capability and schema-discovery currency) | aligns | D5 closes three source-level parity gaps (describe_capabilities, describe_envelope_schema, validator registry); runtime/deployed-server parity remains a tenth-iteration carry-over. |
| §Read Discipline (current-source-over-archived) | aligns | D4 replaces the archived-spec design citation in `tools/validators/README.md` with current authorities + an explicit historical caveat. |
| Schema Minimalism | aligns | No new schema fields introduced. Both new validators (D1, D2) compute over existing CHC/OBL/SLT/STSTAT/STLOC/BEL/SE relationships. |

---

## Verification

Test artifacts per deliverable:

| Deliverable | Test artifact |
|---|---|
| D1 | `causal_dependency_threat_scan_*` test suite (eight cases) in `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts`. Registry test extension in `tools/validators/tests/structural/registry.test.ts`. |
| D2 | `expected_witness_coverage_*` test suite (seven cases) in `tools/validators/tests/structural/expected-witness-coverage.test.ts`. Registry test extension in `tools/validators/tests/structural/registry.test.ts`. |
| D3 | `record_schema_compliance_rejects_padded_pg_id` and `record_schema_compliance_rejects_padded_bel_id` golden tests in `tools/validators/tests/structural/`. Plus existing observer-firewall / branch-isolation tests pass under unpadded fixtures. |
| D4 | Grep-based acceptance check on `tools/validators/README.md` (no uncaveated `archive/` references). |
| D5 | Three-case capability parity test in `tools/world-mcp/tests/server/capability-parity.test.ts`. |
| D6 | Three new seed-variant test cases appended to `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`. |

Full-suite proof at spec close: `npm test` green across `tools/validators/`, `tools/world-mcp/`, `tools/patch-engine/`, and `tools/hooks/`. CLI integration sanity via `world-validate` against a representative story-bundle fixture (the SPEC-34 D5 capstone fixture or its SPEC-35 D8 successor), with at least one fixture variant per new validator (D1, D2) exercising the failure-case verdict path.

---

## Out of Scope

- **Runtime / deployed-MCP capability parity verification**: the auditor's §14 carry-over. Source-level parity (D5) is a prerequisite, but actually invoking a running MCP server, calling `describe_capabilities` and `describe_envelope_schema` against the deployed instance, and comparing against post-rebuild source state requires deployment-side tooling beyond this spec's surface. Routed to tenth-iteration carry-over per the auditor's §14 item 1.
- **Generated `dist/` freshness check**: source vs compiled-artifact drift. Build scripts already exist; a freshness assertion would require a separate build-pipeline contract. Routed to tenth-iteration carry-over per the auditor's §14 item 2.
- **Repo-wide archive-citation doc-lint**: the auditor's Amendment D optional "current docs must not cite `archive/` without `historical`, `archived`, or `not current authority`" deterministic lint. Requires deciding which directories count as "current docs" (excluding `archive/`, `worlds/`, possibly `reports/`), authoring a regex that distinguishes legitimate historical-pointer phrasing from drift, and sweeping the full repo for residues. Out of scope here; routed to §Risks & Open Questions as a follow-up doc-hygiene spec.
- **Full repo-wide archive-excluded grep for retired schema fields**: the auditor's §14 item 4 (a complete non-archived scan for `-[0]{2,}d+`, `derived_from_cf`, `world_ent_id`, `storylet_realized`, `chosen_choice_id`, `arc_contract`, `dramatic_unit`, `execution_envelope`, `stop_policy`). SPEC-35 D8 swept the validator/MCP test surfaces; D3 here sweeps story-bundle fixtures specifically. A repo-wide cleanup of all retired-field residues across docs, briefs, and proposals is out of scope here.
- **New patch-engine ops**: zero — D1 and D2 consume existing op kinds via the existing `validate_patch_plan` / `submit_patch_plan` entry points.
- **New MCP retrieval tools**: zero — D6 is a test-extension on existing `get_context_packet` behavior.
- **Hook 3 modifications**: zero.
- **Schema field additions**: zero — both new validators compute over existing fields. The auditor's §13 Anti-recommendations explicitly reject schema expansion for witness coverage and causal dependencies; this spec honors that.

---

## Risks & Open Questions

- **`expected_witness_coverage` deterministic-trigger calibration `(pragmatic)`.** D2's trigger condition (STLOC non-concealed + state_delta produces public-visibility BEL/DA/STSTAT supersessions) is a deterministic heuristic that approximates the audit's natural-language event-class list ("secrecy, betrayal, deception, violence, sex, law, status, public ritual"). It will under-trigger for some intended-public events whose `state_delta` does not produce mechanically-visible signals (e.g., a "public oath" SE whose only delta is creating an OBL with `owed_to: public`), and may over-trigger on SE events whose semantic shape is not actually witness-bearing despite producing mechanically-visible deltas (e.g., narrator-voice exposition formalized as SE). The full-strictness alternative (adding `SE.event_kind` enum values or an `SE.requires_witness_coverage` boolean field) is explicitly rejected by §13 schema-minimalism. If pilot-tier story bundles reveal high-frequency miscalibration, a future revision could add a closed-set `SE.witness_obligation` enum (`automatic`, `none`, `explicit_tag_required`) that the validator reads — schema change at that point, but with empirical justification.

- **`causal_dependency_threat_scan` SLT-precondition predicate evaluation `(pragmatic)`.** D1's `slt_precondition_clobbered` subcheck requires evaluating SLT.preconditions.hard[] predicates against snapshot state — the predicate DSL (storylet predicate language) has its own evaluator at `tools/validators/src/` (per the existing `storylet_predicate_dsl` validator). The new validator must either reuse the existing evaluator or rely on a simpler "any reference to a clobbered record id in any hard precondition counts as clobbered" overapproximation. Implementing predicate-aware evaluation is the structurally-cleaner path; the overapproximation is cheaper but produces false positives. Operator judgment at implementation time; flagged here so the ticket-decomposition pass can scope the choice explicitly.

- **Repo-wide archive-citation doc-lint deferral `(pragmatic — scope-doubling)`.** D4 closes the named README line; the optional repo-wide lint would close future regressions. The lint requires a separate-scope discipline (deciding "current docs" set, regex design, sweep across hundreds of files) and approximately doubles this spec's scope. Routed to a follow-up doc-hygiene spec. Under stronger documentation-discipline pressure (e.g., if future audits keep finding new archive-citation regressions), the lint becomes higher-priority.

- **Runtime / deployed-MCP parity for D5 `(pragmatic)`.** D5 closes source-level parity. The auditor's actual concern — "a fix can land in TypeScript source while the deployed MCP server still exposes old schemas" — requires runtime invocation that source-level tests cannot provide. The most-cleanly-correct extension would be a CI / deployment-script step that boots the actual server post-build and runs the same parity checks against `client.describe_capabilities` and `client.describe_envelope_schema`. Operator's call whether to follow up in a tenth-iteration spec or a separate deployment-pipeline spec.

- **D3 regex-tightening blast radius on out-of-tree consumers.** Tightening story-bundle schema regexes mechanically rejects padded IDs going forward. Any author-owned fixture, brainstorming document, or briefs file under user-private `briefs/` (gitignored) or `worlds/` (gitignored content) that uses padded IDs will surface as a validation error on the next run touching that content. Acceptable side-effect: the FOUNDATIONS-002 convention has been canonical since SPEC-13; padded IDs in author-owned content are already drift. If breakage surfaces, the fix is unpadded-ID migration at the source, not regex relaxation.

- **D1 / D2 health-audit replay integration.** The skill-prose updates at `branching-story-health-audit/SKILL.md:196,236` describe the validators as patch-plan-enforced AND health-audit-replay-enforced. The validators themselves are written for patch-plan validation entry points; the health-audit's Phase 2d / Phase 2g replay logic must be updated to invoke the same validators against replayed state. This is in-scope for D1 and D2 acceptance, but the precise integration shape (do the validators need a replay-mode flag? do they consume a parent-snapshot context the patch-plan path doesn't supply?) is not specified here. Operator judgment at implementation time; surfaced as a Risk so the ticket-decomposition pass can scope it explicitly.

- **No active story bundles yet.** This spec lands during the pre-pilot window. D1 and D2 are tested against synthetic fixtures only; their behavior under real pilot bundles (with realistic witness-group sizes, realistic OBL/SLT dependency depths, realistic SE-per-page densities) is untested. Pilot-tier authoring will surface calibration needs the synthetic fixtures cannot anticipate; the validator-hardening-III iteration is likely.
