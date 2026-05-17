<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-37 — Story Pipeline Tenth-Iteration Fixes

**Status**: DRAFT
**Date**: 2026-05-17
**Supersedes**: closes the runtime/deployed MCP capability parity carry-over deferred at `archive/specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §Risks & Open Questions ("Runtime / deployed-MCP parity for D5"). Adds two new structural-validator hardening deliverables intaken from the tenth external audit.

## Problem Statement

`reports/story-related-improvements-tenth-iteration.md` is the tenth external review (ChatGPT-Pro, GitHub code-search + file-viewing integration, source-only — running MCP server not invoked). It produced a verification ledger reconciling ninth-iteration issues against current source, three explicit active findings (WL-T10-P1-001, WL-T10-P1-002, WL-T10-P2-003), a red-team support matrix, a research-synthesis section, and an anti-recommendations section reaffirming worldloom's existing positions (no drama manager, no plot rails, no BEL/SF collapse, no prose-as-state). The auditor's executive verdict — *"basically sound, not architecturally broken, and not overcomplicated in the dangerous way... the main remaining work is not architecture. It is validator/test hardening, promotion-package safety validation, indirect social-propagation coverage, and runtime/deployed capability currency"* — survives codebase verification verbatim across three parallel claim clusters.

Codebase verification (three parallel Explore agents across the three finding clusters — proposal-package validator surface; expected-witness-coverage validator surface; MCP build-info / capability-parity surface) confirms all three findings hold against current source at HEAD (commit `c8478d5`):

- **WL-T10-P1-001** verified: `tools/validators/src/structural/proposal-package-shape.ts:53-64` enforces candidate purity and `source_basis` placement only; the conditional safety-block predicates `requiresEpistemicProfile` / `requiresExceptionGovernance` and the rationale-quality helper `naRationaleVerdicts` that `tools/validators/src/structural/record-schema-compliance.ts:140-153,161-167,190-207` uses on accepted CF records are never invoked on proposal-package candidates. The canonical-vocabularies constants `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` / `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` exist at `tools/world-index/src/public/canonical-vocabularies.ts:150-168` and are already exported. `tools/validators/tests/structural/proposal-package-shape.test.ts` has 6 tests, none for safety-sensitive candidate types. The `.claude/skills/story-fact-promotion-to-canon/SKILL.md` does not prescribe safety-block authoring; only a template comment at `templates/proposal-package.yaml:52-70` mentions the requirement, and even that defers to FOUNDATIONS.
- **WL-T10-P1-002** verified: `tools/validators/src/structural/expected-witness-coverage.ts:135-240` handles direct co-located witnesses (alive + non-incapacitated STENTs at the actor's STLOC) and uses `PUBLIC_BEL_VISIBILITIES = {public, shared, factional, rumored}` and `PUBLIC_DA_CIRCULATION = {public, factional}` as triggers. The validator never consumes `BEL.basis.access_route` (a verified-existing enum at `.claude/skills/_shared-templates/story-state-contract.md` §4.1 with values `direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization`). `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4 and `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d both already prescribe indirect-witness computation in prose ("law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or accessible DA/STOBJ evidence") — the validator does not catch when authors omit the propagation. This is the worst gap shape: prescribed in skill prose, judgment-only at enforcement.
- **WL-T10-P2-003** verified: `tools/world-mcp/src/build-info.ts:23-41` computes `source_schema_hash` as SHA-256 over normalized tool capabilities (sorted `{name, description, input_schema_enums}` per tool). Validator source content, record-schema files, and the patch-operation schema manifest are NOT hashed. `tools/world-mcp/tests/server/capability-parity.test.ts:113-126` asserts the validator-registry name list matches an expected hardcoded set but cannot detect validator-source drift inside an unchanged name. `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46` and `tools/world-mcp/tests/server/dispatch.test.ts:948-1021` exercise the built `dist/src/server.js` through the MCP boundary for `describe_capabilities`, but no smoke test invokes `validate_patch_plan` against a known-bad fixture, so a stale validator bundle in `dist/` can return a false `pass` verdict while source is up to date. `docs/MACHINE-FACING-LAYER.md` does not document the `build_info` field surface, so any fingerprint extension must introduce field documentation as new prose.

Production-readiness window matches SPEC-36's: no active pilot story bundles depend on these surfaces yet (the most recent implementation-order document is `archive/specs/IMPLEMENTATION-ORDER-2026-05-09.md`). Blast radius: one validator extension on a non-canon surface (D1), one validator extension on a story-canon surface (D2), one test file extension (D3), one build-info module extension + one capability-parity test extension + one docs section (D4). No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields — the report's §13 anti-recommendation against schema expansion for witness coverage and proposal safety is honored verbatim.

### Key design decisions

- **Considered modeling indirect social propagation via SREL faction/institution axis pattern; chose `BEL.basis.access_route` enum as the deterministic anchor `(structural)`.** Initial draft assumed `SREL.axis` carried institutional/factional values the validator could pattern-match for "expect institutional-channel BEL when SE creates factional DA with actor-in-faction-X SREL evidence." Verification refuted this: `SREL.axis` at `.claude/skills/_shared-templates/story-state-contract.md` §4.4b is a 14-value closed enum of strictly interpersonal axes (`trust`, `fear`, `desire`, `debt`, `intimacy`, `loyalty`, `resentment`, `power_imbalance`, `attention`, `familiarity`, `approval`, `respect`, `obligation`, `hostility`) with `participants: [STENT-<integer>]* # exactly 2 participants`. SREL models pairwise social ties between two STENT entities — not institutional or factional membership. The deterministic indirect-propagation cue must therefore rest on `BEL.basis.access_route` (the existing enum with `document | object_trace | location_trace | rumor | surveillance | institutional_channel | magic_tech` values) and `DA.circulation` (`public | factional | private | concealed | suppressed`). Choosing this anchor is structurally correct, not pragmatic — the cleaner alternative (SREL-driven inference) is unavailable.

- **Considered extending D2 with multi-location-supersession and STENT-death-with-SREL-ties cues; chose to scope D2 to public-DA-trace coverage only and route the other cues to §Risks `(pragmatic — scoping)`.** The full deterministic indirect-propagation surface has at least three cue families: (a) public/factional DA circulation requires indirect-route BEL or non-propagation tag; (b) state_delta supersessions spanning ≥2 distinct STLOCs require per-location belief consequences; (c) STENT life/agency supersessions (death, capture) with SREL ties require BEL records held by connected STENTs. The report's amendments-table row 4 names only public-artifact-trace coverage as the new test target. Implementing all three cue families in one deliverable broadens scope significantly and increases miscalibration risk; landing the public-DA cue first establishes the access-route-consumption pattern, after which cues (b) and (c) become incremental additions in a future iteration. Worked precedent: SPEC-36 D2 landed `expected_witness_coverage` with direct-witness scope only, deferring indirect cues to "validator-hardening-III iteration is likely" in its §Risks. Under no-scope-constraint conditions, cues (b) and (c) would land here.

- **Considered creating a sibling `indirect_witness_propagation` validator beside `expected_witness_coverage`; chose to extend the existing validator `(structural)`.** Two separate validators would duplicate the trigger-resolution logic (parent-PG snapshot retrieval, actor STSTAT lookup, location resolution, public/factional cue extraction) and double the registry surface. Extending the existing validator keeps trigger logic single-source while adding the indirect-coverage check as a new verdict code (`expected_witness_coverage_missing_indirect_propagation`) alongside the existing four (`missing_public_bel`, `wrong_group_label`, `partial_bel_coverage`, `tag_records_unresolved`).

- **Considered prioritizing the build-info fingerprint extension over the deployment smoke test in WL-T10-P2-003 remediation; chose smoke-test-first ordering `(structural)`.** The report's amendments table lists fingerprint extension (`validator_registry_hash`, `record_schema_manifest_hash`, `patch_operation_schema_hash`) as the headline remediation. Fingerprints are passive currency indicators — they tell you whether something changed but not whether validators actually work. A deployment smoke test (`validate_patch_plan` invoked through the running MCP boundary against a known-bad causal-dependency-clobbering fixture) directly exercises the validator code path: if the deployed validator bundle is stale or missing, the smoke test fails. Fingerprints are supporting evidence. D3 lands the smoke test (load-bearing); D4 lands the fingerprint extension (supporting, plus the new MACHINE-FACING-LAYER.md field documentation the report assumes exists).

- **Considered hashing validator names only (the report's literal `validator_registry_hash` interpretation); chose to hash validator source-file content `(structural)`.** The report's concern is "running MCP server lacks the rebuilt validator bundle." A name-list hash does not detect implementation drift inside a validator's body — most validator changes do not add or remove validators, they change predicate logic. To actually catch "deployed validator returns stale verdict while source has the fix", the hash must cover the bytes the validator runs on. D4 specifies hashing the SHA-256 of each `tools/validators/src/structural/*.ts` and `tools/validators/src/rules/*.ts` file's source content (sorted by path, concatenated), so any byte-level validator-source change produces a different fingerprint regardless of whether the validator's name changed.

- **Considered skipping `MACHINE-FACING-LAYER.md` documentation updates as "implementation detail"; chose to include them in D4 because the report assumes existing field documentation that does not exist.** Agent verification refuted the implicit assumption that `MACHINE-FACING-LAYER.md` documents the `build_info` field surface — it mentions `describe_capabilities` by name but never enumerates the returned fields (`git_commit_hash`, `build_timestamp`, `source_schema_hash`, and the new fingerprints). Adding fingerprint fields to the runtime surface without documenting them perpetuates the documentation gap. D4 includes a new `### Build-info fields` sub-section under the existing `describe_capabilities` paragraph.

---

## Approach

Each deliverable targets a single named finding. The four deliverables fall into two architectural concerns:

- **Structural validator extensions on existing validators** (D1, D2): D1 extends `proposal_package_shape` with the conditional safety-block check that `record_schema_compliance` already implements for accepted CF records; D2 extends `expected_witness_coverage` with the deterministic public-DA-trace indirect-coverage check that consumes `BEL.basis.access_route` (a dormant enum the validator does not currently read). Both reuse already-exported constants and helpers; neither introduces new validators, new schemas, or new patch-engine ops. Both update consumer skill-prose to align prescription with enforcement.
- **MCP capability-currency hardening** (D3, D4): D3 lands the load-bearing deployment smoke test that invokes `validate_patch_plan` through the running MCP boundary against a known-bad causal-dependency-clobbering fixture, catching stale validator bundles directly. D4 adds the supporting build-info fingerprint extension (`validator_registry_hash` over validator-source content, `patch_operation_schema_hash` over the op-schema manifest) plus the new `### Build-info fields` documentation in `docs/MACHINE-FACING-LAYER.md`. Together they close the runtime/deployed parity carry-over deferred from SPEC-36 §Risks.

Cross-iteration discipline: D3 + D4 discharge SPEC-36's "Runtime / deployed-MCP parity for D5" §Risks deferral. The skill-prose updates at the D1 consumer (`.claude/skills/story-fact-promotion-to-canon/SKILL.md`) and the D2 consumers (`.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4 and `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d) align skill prescription with the newly enforced validator coverage — without these alignments, prose-vs-enforcement drift persists.

Implementation phasing recommendation (for ticket decomposition):

- **Phase 1 (independent, parallelizable)**: D1, D3, D4. All three touch separate surfaces and can land in any order.
  - D1 touches `tools/validators/src/structural/proposal-package-shape.ts`, its test file, and one skill SKILL.md.
  - D3 touches `tools/world-mcp/tests/server/dispatch.test.ts` (extend) and adds one fixture-generation helper if needed.
  - D4 touches `tools/world-mcp/src/build-info.ts`, `tools/world-mcp/tests/server/capability-parity.test.ts`, and `docs/MACHINE-FACING-LAYER.md`.
- **Phase 2 (after Phase 1, optional ordering preference)**: D2. Larger; benefits from landing after D3/D4 so the smoke test surface is in place to verify the new validator code path under deployed conditions (the smoke test fixture can be reused or paralleled for an indirect-propagation negative fixture). D2 is independent of D1.

No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields. The blast radius is two validator-source extensions + their tests + skill-prose alignment (D1, D2), one test file extension (D3), one build-info source extension + capability-parity test extension + docs section (D4).

---

## Deliverables

Deliverables grouped by severity (P1 → P2). Each is self-contained and can land as its own ticket.

### D1 — Extend `proposal_package_shape` with conditional safety-block enforcement (P1, intake WL-T10-P1-001)

**Implementation note (2026-05-17)**: D1 landed in `archive/tickets/SPEC37STOPIPTEN-001.md`. `proposal_package_shape` now emits proposal-stage safety-block verdicts for missing `exception_governance`, missing `epistemic_profile`, missing `candidate.type`, and thin `{ n_a: ... }` rationales; the validators package proof was `cd tools/validators && npm test` with 337 passing tests. The remaining D1 prose below is retained as historical intake/design context unless a later ticket explicitly reopens this surface.

**Problem**: `tools/validators/src/structural/proposal-package-shape.ts:53-64` enforces candidate purity (every key in `candidate` must be in `CANON_FACT_FIELDS` and not in `CANDIDATE_PROMOTION_FIELDS`) and `source_basis` property placement only. The validator never invokes the conditional safety-block predicates that `tools/validators/src/structural/record-schema-compliance.ts:140-153` runs against accepted CF records:

```typescript
if (requiresExceptionGovernance(type) && parsed.exception_governance === undefined) {
  verdicts.push(customSchemaVerdict(
    record,
    "record_schema_compliance.missing_exception_governance",
    `${record.node_id} canon safety block violation: type '${type}' requires exception_governance`
  ));
}
if (requiresEpistemicProfile(type) && parsed.epistemic_profile === undefined) {
  verdicts.push(customSchemaVerdict(
    record,
    "record_schema_compliance.missing_epistemic_profile",
    `${record.node_id} canon safety block violation: type '${type}' requires epistemic_profile`
  ));
}
```

The predicates `requiresExceptionGovernance(type: string)` and `requiresEpistemicProfile(type: string)` live in `record-schema-compliance.ts:161-167`. The rationale-quality helper `naRationaleVerdicts()` lives at `record-schema-compliance.ts:190-207` and accepts an `n_a` block whose `rationale` contains any keyword from `ONTOLOGY_CATEGORY_KEYWORDS`. The canonical-vocabularies constants `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` (values `capability | bloodline | magic_practice | technology | divine_action | artifact_dependent_truth | exception_introducing_fact`) and `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` (the above plus `institution_with_secrecy | knowledge_asymmetric_fact`) at `tools/world-index/src/public/canonical-vocabularies.ts:150-168` are already exported and reusable.

Current behavior: a promotion proposal with `candidate.type: technology` or `candidate.type: knowledge_asymmetric_fact` passes `proposal_package_shape` with no `exception_governance` or `epistemic_profile` blocks. `canon-addition`'s `record_schema_compliance` will catch the gap, but only after the proposal has been authored, surfaced for human review at `story-promotion-closeout`, and submitted. The promotion skill `.claude/skills/story-fact-promotion-to-canon/SKILL.md` does not prescribe safety-block authoring in its prose; only a template comment at `templates/proposal-package.yaml:52-70` notes the conditional requirement and even that defers to FOUNDATIONS.

Audit motivation (verbatim from §9): *"the proposal candidate omits epistemic/exception governance for secrecy, technology, magic, or other distribution-sensitive facts, the review pipeline can normalize unsafe canon candidates before the actual canon-addition step catches them — or worse, train authors to omit the very safety reasoning that Worldloom requires."*

**Change**:

1. **Validator extension** (`tools/validators/src/structural/proposal-package-shape.ts`): import `requiresEpistemicProfile`, `requiresExceptionGovernance`, and `naRationaleVerdicts` from `./record-schema-compliance` (or extract them to a shared helper module if both validators benefit from independent access). After the existing candidate-purity loop (line 57) and before the `source_basis` loop (line 59), insert a new block that:

   - Reads `candidate.type` as a string. If absent, emit `proposal_candidate_missing_type`.
   - If `requiresExceptionGovernance(type)` returns true AND `candidate.exception_governance === undefined`, emit verdict code `proposal_candidate_exception_governance_missing` with message `proposal candidate type '<type>' requires exception_governance (see CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED)`.
   - If `candidate.exception_governance` is present and has shape `{ n_a: <string> }`, invoke `naRationaleVerdicts(block, record_path, "exception_governance")` and append any returned verdicts. (This catches substantive-rationale failures using the same helper logic as `record_schema_compliance`.)
   - If `requiresEpistemicProfile(type)` returns true AND `candidate.epistemic_profile === undefined`, emit verdict code `proposal_candidate_epistemic_profile_missing` with analogous message.
   - If `candidate.epistemic_profile` is present and has shape `{ n_a: <string> }`, invoke `naRationaleVerdicts` analogously.

   The new verdict codes use the `proposal_candidate_*` prefix (not `record_schema_compliance.*`) to keep proposal-package-scoped failures distinct from accepted-CF-scoped failures in adjudication logs. Reuse the same helper logic to keep the rationale-quality check single-source.

2. **Test extension** (`tools/validators/tests/structural/proposal-package-shape.test.ts`): add five tests beyond the existing six.

   - `proposal_package_shape_rejects_safety_sensitive_candidate_without_epistemic_profile` — fixture: proposal package with `candidate.type: knowledge_asymmetric_fact`, all other candidate fields valid, no `epistemic_profile`. Expect verdict `proposal_candidate_epistemic_profile_missing`.
   - `proposal_package_shape_rejects_safety_sensitive_candidate_without_exception_governance` — fixture: proposal package with `candidate.type: technology`, no `exception_governance`. Expect verdict `proposal_candidate_exception_governance_missing`.
   - `proposal_package_shape_accepts_non_sensitive_event_candidate_without_safety_blocks` — fixture: proposal package with `candidate.type: event` (a type in neither `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` nor `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED`), no safety blocks. Expect no safety-block verdict (existing other checks still apply).
   - `proposal_package_shape_accepts_substantive_n_a_safety_rationale` — fixture: proposal package with `candidate.type: technology` and `candidate.exception_governance: { n_a: "no exception axis applies because this artifact's effect is universally available across the populace, per ontology category ..." }` (substantive rationale containing an `ONTOLOGY_CATEGORY_KEYWORDS` keyword). Expect no verdict.
   - `proposal_package_shape_rejects_thin_n_a_safety_rationale` — fixture: same as above but `n_a: "N/A"`. Expect verdict from `naRationaleVerdicts` rejecting the thin rationale.

3. **Skill-prose alignment** at `.claude/skills/story-fact-promotion-to-canon/SKILL.md`: add a directive paragraph in the proposal-package-authoring section (the Process Flow or Phase section that drafts the proposal-package candidate). Recommended placement: immediately after the existing candidate-shape guidance, before the submission step.

   ```
   When `candidate.type` is in `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` (`capability`, `bloodline`, `magic_practice`, `technology`, `divine_action`, `artifact_dependent_truth`, `exception_introducing_fact`, `institution_with_secrecy`, `knowledge_asymmetric_fact`) OR `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` (the same list minus the last two), the candidate MUST include the corresponding `epistemic_profile` and/or `exception_governance` block — either as a full object, or as `{ n_a: "<substantive rationale citing an ontology category>" }`. Do not defer this reasoning to `canon-addition`; `proposal_package_shape` enforces it at validation time. The reasoning lives in the candidate because it is part of what story-promotion-closeout reviewers need to evaluate the proposal, not part of the canon-addition adjudication.
   ```

**FOUNDATIONS alignment**: §Canon Fact Record Schema §epistemic_profile / §exception_governance (the conditional safety-block contract); §Canon Layers (story-local truth cannot become world canon without epistemic/exception reasoning at the proposal stage); Rule 2 (No Pure Cosmetics — schema-required safety blocks are not optional adornment).

**Acceptance criteria**:
- `proposal_package_shape` validator emits `proposal_candidate_epistemic_profile_missing` and `proposal_candidate_exception_governance_missing` verdicts for the relevant fixtures.
- All five new test cases pass; the existing six tests remain unchanged and passing.
- `naRationaleVerdicts` invocation produces matching rationale-quality verdicts for thin `n_a` blocks.
- `npm run build && npm test` green in `tools/validators/`.
- Grep across `.claude/skills/story-fact-promotion-to-canon/SKILL.md` for the new safety-block directive returns the inserted paragraph.

---

### D2 — Extend `expected_witness_coverage` with public-DA-trace indirect-propagation check (P1, intake WL-T10-P1-002)

**Implementation note (2026-05-17)**: D2 landed in `archive/tickets/SPEC37STOPIPTEN-002.md`. `expected_witness_coverage` now emits `expected_witness_coverage_missing_indirect_propagation` for public/factional DA creates that lack a same-SE indirect-route BEL via `basis.access_records[]` or an `event_leaves_no_accessible_trace` tag. The validators package proof was `cd tools/validators && npm test` with 342 passing tests. The remaining D2 prose below is retained as historical intake/design context; any mentions of `basis.source_records[]` should be read as the draft-era name corrected by implementation to the live `basis.access_records[]` contract.

**Problem**: `tools/validators/src/structural/expected-witness-coverage.ts:135-240` resolves only direct co-located witnesses (alive + non-incapacitated STENTs at the actor's STLOC) and uses `PUBLIC_BEL_VISIBILITIES = {public, shared, factional, rumored}` and `PUBLIC_DA_CIRCULATION = {public, factional}` as binary triggers. The validator never consumes `BEL.basis.access_route` (verified at `.claude/skills/_shared-templates/story-state-contract.md` §4.1):

```yaml
basis:
  source_event: SE-<integer>*
  access_route: direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization*
  access_records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | DA-<integer> | BEL-<integer> | SF-<integer> | SE-<integer>]
```

Both consumer skills already prescribe indirect-propagation computation in their phase prose:

- `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4: *"indirect: public or factional holders who would receive the event through law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or other accessible evidence (DA / STOBJ / location-state traces)."*
- `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d: *"compute indirect witnesses from public or factional holders reached through law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or accessible DA / STOBJ evidence; treat concealed, offstage, unconscious, socially barred, or access-lacking entities as excluded."*

The validator catches none of this prescription deterministically. An author who emits a public-circulation DA in an SE's `state_delta.create[]` but never emits a corresponding BEL chain referencing that DA via `access_route ∈ {document, object_trace, rumor, institutional_channel, surveillance, magic_tech, location_trace}` passes validation as long as the direct-witness check is satisfied. This is the gap shape the report's P1 names: *"social reality becomes fake when public actions leave no rumor, institutional, documentary, artifact, or location trace."*

Audit motivation (verbatim from §9): *"A public trial, posted notice, broken relic, missing body, altered gate, or factional memo can matter even when no named direct witness is co-located."*

**Change**:

1. **Validator extension** (`tools/validators/src/structural/expected-witness-coverage.ts`): preserve all existing direct-witness logic unchanged. Add a new indirect-propagation check that fires after the direct-witness check resolves successfully. New helper `indirectPropagationCheck(event, parsedEvent, maps)` returns either `[]` (covered or trigger does not apply) or a verdict array.

   **Deterministic trigger condition** (conservative — the report explicitly asks for "fire only when cue is explicit"):

   The check fires when ALL of the following hold:
   - The SE's `state_delta.create[]` contains at least one DA-id whose record exists in `maps.byId` AND whose parsed `circulation` value is in `PUBLIC_DA_CIRCULATION = {public, factional}` (reuse existing constant).
   - The SE is not exempt under existing audit-only / concealed-location logic (existing exemptions apply unchanged).

   **Indirect-coverage requirement**. For each public/factional DA-id in the SE's `state_delta.create[]`, the validator accepts when EITHER:

   - At least one BEL record exists in the same SE's `state_delta.create[]` (or in the immediate child PG's snapshot if the SE is a multi-step delta — operator's call which scope is canonical; default to same-SE scope for v1) whose `basis.access_records[]` contains the DA-id AND whose `basis.access_route` is in the INDIRECT_ACCESS_ROUTES set: `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}`. (`direct_observation` is excluded because direct observation maps to the existing direct-witness check; `testimony` is excluded because it requires a chain of belief that the validator cannot deterministically verify in one hop; `inference` and `authorial_initialization` are excluded because they are not evidence-bearing channels.)

   - The SE's `world_logic_rationale` contains a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[...])` tag whose `records=[...]` references the public/factional DA-id, marking that the author has explicitly declared the DA does not propagate beyond its immediate creation context. Other non-propagation reasons (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`) are not valid for indirect coverage on a public-circulation DA — by definition a public DA leaves traces; the only valid non-propagation reason at this surface is `event_leaves_no_accessible_trace`.

   On failure (DA created with public/factional circulation, no indirect-route BEL referencing it, no valid non-propagation tag), emit verdict code `expected_witness_coverage_missing_indirect_propagation` with message `event <SE-id> creates DA <DA-id> with circulation '<value>' but no BEL with indirect access_route references it and no event_leaves_no_accessible_trace tag covers it`.

2. **Test extension** (`tools/validators/tests/structural/expected-witness-coverage.test.ts`): add four tests beyond the existing eight.

   - `expected_witness_coverage_rejects_public_da_without_indirect_propagation` — fixture: SE with `state_delta.create: ["DA-1"]` where DA-1 has `circulation: public`; one direct-witness BEL satisfies the direct-witness check; no BEL references DA-1; no non-propagation tag. Expect verdict `expected_witness_coverage_missing_indirect_propagation`.
   - `expected_witness_coverage_rejects_factional_da_without_indirect_propagation` — fixture: as above with `circulation: factional`. Expect verdict.
   - `expected_witness_coverage_accepts_public_da_with_indirect_route_bel` — fixture: as above but with an additional BEL whose `basis.access_records: ["DA-1"]` and `basis.access_route: document`. Expect no verdict.
   - `expected_witness_coverage_accepts_public_da_with_event_leaves_no_accessible_trace_tag` — fixture: as above but with `SE.world_logic_rationale` containing `non_propagation:event_leaves_no_accessible_trace(group=public_general, records=[DA-1])`. Expect no verdict.
   - `expected_witness_coverage_does_not_trigger_indirect_check_for_private_da` — fixture: SE with `state_delta.create: ["DA-2"]` where DA-2 has `circulation: private`. Expect no verdict from the new indirect check (existing direct-witness check still applies independently).

3. **Skill-prose alignment** at the two consumer sites:

   - `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4: after the existing `indirect:` bullet describing the conceptual indirect-witness group, add a paragraph naming the deterministic enforcement scope:

     ```
     The structural validator `expected_witness_coverage` enforces the indirect-witness obligation deterministically for one specific cue: when the SE's `state_delta.create[]` produces a DA with `circulation` in {public, factional}, at least one BEL referencing that DA via `basis.access_records[]` MUST carry `basis.access_route` in the indirect-route set `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}`, or the SE's `world_logic_rationale` MUST carry a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[<DA-id>])` tag. Other indirect-witness obligations (multi-location supersession, STENT-death with SREL ties, environmental change) remain authorial discipline and are not yet enforced by the validator; see SPEC-37 §Risks for the indirect-cue calibration roadmap.
     ```

   - `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d: append an analogous paragraph after the existing indirect-witness prescription, citing `expected_witness_coverage_missing_indirect_propagation` as the validator-emitted verdict authors should expect when the public-DA cue fires.

**FOUNDATIONS alignment**: §Story Bundles §5 Rule 5 (No Consequence Evasion — public artifacts must leave belief traces in the holders that would mechanically receive them); §Story Bundles §6a (Belief vs. Fact — BEL records are the canonical surface for observer consequences, including indirect-channel observers); Schema Minimalism (no new fields; validator consumes the dormant `BEL.basis.access_route` enum that already exists).

**Acceptance criteria**:
- `expected_witness_coverage` validator emits `expected_witness_coverage_missing_indirect_propagation` for the new failure-case fixtures.
- All four new test cases pass; the existing eight direct-witness tests remain unchanged and passing.
- Grep across `tools/validators/src/structural/expected-witness-coverage.ts` for `INDIRECT_ACCESS_ROUTES` returns the new constant definition.
- `npm run build && npm test` green in `tools/validators/`.
- Skill-prose updates at the two consumer sites cite the new verdict code.

---

### D3 — Deployed-MCP validator-currency smoke test (P2 — load-bearing, intake WL-T10-P2-003)

**Implementation note (2026-05-17)**: D3 landed in `archive/tickets/SPEC37STOPIPTEN-003.md`. `tools/world-mcp/tests/server/dispatch.test.ts` now contains `deployed_mcp_rejects_known_bad_causal_dependency_plan` and `deployed_mcp_rejects_known_bad_expected_witness_plan`, both invoking `validate_patch_plan` through the in-memory MCP dispatch boundary against known-bad story patch plans. The focused proof was `cd tools/world-mcp && npm run build && node --test dist/tests/server/dispatch.test.js` with 32 passing tests. The broad `cd tools/world-mcp && npm test` lane rebuilt successfully but remains red on the pre-existing sibling capability-parity registry expectation for `prose_receipt_schema_compliance`; D4 / the capability-parity surface remains active. The remaining D3 prose below is retained as historical intake/design context unless a later ticket explicitly reopens this surface.

**Problem**: `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46` exercises the built `dist/src/server.js` for stdin/stdout liveness; `tools/world-mcp/tests/server/dispatch.test.ts:948-1021` exercises `describe_capabilities` through the MCP boundary and validates `build_info` shape. Neither test invokes `validate_patch_plan` against a known-bad fixture, so a stale validator bundle in `dist/` — for example, a freshly added validator (`expected_witness_coverage`, `causal_dependency_threat_scan`) whose source landed in `tools/validators/src/structural/` but whose compiled artifact never reached `tools/world-mcp/dist/`'s validator-bundle dependency — can return a false `pass` verdict while source advertises the fix. Source-level capability-parity tests (`tools/world-mcp/tests/server/capability-parity.test.ts`) catch tool-order and op-kind drift but cannot reach validator-execution behavior.

Audit motivation (verbatim from §9): *"if a running MCP server lacks the rebuilt validator bundle, validate_patch_plan can give a stale pass/fail surface while source appears fixed. This is especially dangerous after recent validator additions."*

The load-bearing remediation is a smoke test that actually exercises the validator code path through the deployed MCP boundary. Fingerprint extension (D4) is the supporting passive currency indicator.

**Change**:

1. **Test extension** (`tools/world-mcp/tests/server/dispatch.test.ts`): add two new test cases, following the existing `withServerClient` pattern at lines 948+. The tests boot the built `dist/src/server.js` (per the integration-test pattern at `tests/integration/server-stdio.test.ts`) and invoke `validate_patch_plan` through the MCP client.

   - `deployed_mcp_rejects_known_bad_causal_dependency_plan` — construct a minimal patch plan via the public envelope shape that:
     - Includes one `create_se_record` op for an SE whose `state_delta.close: ["STOBJ-1"]`.
     - Includes one `create_pg_record` op for a child PG whose `snapshot.active_records.CHC` includes `CHC-1` AND `CHC-1.grounded_in.records[]` contains `STOBJ-1` (i.e., a choice grounded in a closed object).
     - All other shape requirements satisfied for the envelope to pass schema validation.

     Invoke `validate_patch_plan` through the MCP client; assert the response contains at least one verdict with `code: causal_dependency_threat_scan.choice_dependency_clobbered` (or analogous — match the verdict-code convention `causal_dependency_threat_scan` uses post-SPEC-36 D1). If the response is `pass`, the deployed validator bundle is stale relative to source — the test fails loudly with a message naming the suspected drift.

   - `deployed_mcp_rejects_known_bad_expected_witness_plan` — construct a patch plan that:
     - Includes one `create_se_record` op for an SE at a non-concealed STLOC with two active co-located STENTs other than actor.
     - Does NOT include the BEL records the direct-witness check requires.
     - Does NOT include a valid non-propagation tag.

     Invoke `validate_patch_plan` through the MCP client; assert the response contains a verdict from `expected_witness_coverage` (any of the existing direct-witness failure codes, e.g., `expected_witness_coverage_missing_public_bel`). If the response is `pass`, the deployed validator bundle is stale. If D2 has landed, an additional fixture variant exercising the new `expected_witness_coverage_missing_indirect_propagation` verdict can be added; the v1 test exercises the direct-witness path since that is the longest-standing validator and the best smoke-test for "validator bundle current at all."

2. **Fixture-construction helper** (optional, `tools/world-mcp/tests/server/known-bad-plan-fixtures.ts`): if the inline fixture construction grows beyond ~50 lines per test, factor the two patch-plan fixtures into a helper module that exports `buildKnownBadCausalDependencyPlan()` and `buildKnownBadExpectedWitnessPlan()`. Helper-style fixtures are preferable when the same fixture might be reused by D4's capability-parity test extension or by future smoke-test additions.

3. **CI integration**: confirm `.github/workflows/ci-world-mcp.yml` (lines 48-50 per agent verification: `npm test` rebuilds and runs compiled tests from `dist/tests/`) runs the new dispatch tests automatically — no CI config changes expected since the new tests are in an existing test file. If the test boot time grows by more than ~10 seconds per smoke test, route the smoke tests to a separate `npm run test:smoke` invocation in the package.json, executed in the same CI job after the main test suite.

**FOUNDATIONS alignment**: §Machine-Facing Layer (capability and schema-discovery currency — runtime parity is a prerequisite for trusting `validate_patch_plan` to enforce structural integrity); §Read Discipline (test artifacts train contributors that the deployed validator bundle currency is mechanically checked, not assumed).

**Acceptance criteria**:
- `deployed_mcp_rejects_known_bad_causal_dependency_plan` and `deployed_mcp_rejects_known_bad_expected_witness_plan` pass against current source.
- If validator bundle currency drift is artificially induced (e.g., by stubbing `causal_dependency_threat_scan` to always return `[]`), the tests fail loudly.
- `npm run build && npm test` green in `tools/world-mcp/`.
- CI runs the new tests automatically without configuration changes.

---

### D4 — Build-info validator/schema fingerprint extension and `MACHINE-FACING-LAYER.md` field documentation (P2 — supporting, intake WL-T10-P2-003)

**Problem**: `tools/world-mcp/src/build-info.ts:23-41` computes `source_schema_hash` as SHA-256 over normalized tool capabilities (`name`, `description`, `input_schema_enums`). Validator source content, record-schema files, and the patch-operation schema manifest are NOT hashed. `tools/world-mcp/tests/server/capability-parity.test.ts:113-126` validates the validator-registry name list against a hardcoded expected set but cannot detect implementation drift inside an unchanged-name validator. `docs/MACHINE-FACING-LAYER.md` mentions `describe_capabilities` at line 83 and prose at lines 93, 112 but does NOT document the `build_info` field surface (verified REFUTED at agent claim 6) — any fingerprint extension introduces new field documentation as new prose.

D4 is the supporting passive currency indicator that complements D3's load-bearing smoke test. The smoke test catches stale validator bundles by exercising them; fingerprints catch stale validator bundles by exposing their identity to inspection. Together they cover both runtime-behavioral and runtime-introspective currency.

**Change**:

1. **Build-info source extension** (`tools/world-mcp/src/build-info.ts`): extend the `BuildInfo` interface and the `computeBuildInfo` function (or whatever the source-of-truth function is named — agents verified the interface but did not name the construction function).

   ```typescript
   export interface BuildInfo {
     git_commit_hash: string;
     build_timestamp: string;
     source_schema_hash: string;
     validator_registry_hash: string;     // NEW
     patch_operation_schema_hash: string; // NEW
   }
   ```

   - `validator_registry_hash`: SHA-256 over the concatenated source-content bytes of all files matching `tools/validators/src/structural/*.ts` and `tools/validators/src/rules/*.ts`, sorted by relative path (deterministic ordering). The hash MUST cover file CONTENTS, not just names — name-list hashing fails to detect predicate-body changes inside an unchanged-named validator, which is the actual drift class the report fears. Computed at build time (server startup); the file-read uses `fs.readFileSync` with `utf-8` encoding and `\n` line normalization (strip `\r` if present) to keep cross-OS builds reproducible.
   - `patch_operation_schema_hash`: SHA-256 over the JSON.stringify of the op-schema manifest — for each kind in `OPERATION_KINDS` (verified at `tools/patch-engine/src/envelope/schema.ts:58-92`), include the kind and the corresponding op-schema bytes from the source-of-truth file (the envelope schema module). Sorted by kind for determinism. This catches the case where an op kind's payload schema changes (e.g., a required field added or removed) without the kind name changing.

   The existing `source_schema_hash` is preserved unchanged for backward compatibility — it tells consumers "tool capability surface changed"; the new hashes tell consumers "validator behavior surface changed" and "patch-operation contract changed" respectively.

2. **Capability-parity test extension** (`tools/world-mcp/tests/server/capability-parity.test.ts`): add two new test cases.

   - `describe_capabilities_exposes_validator_registry_hash` — invoke `describe_capabilities` via the in-memory server (existing test pattern); assert that `result.build_info.validator_registry_hash` is a 64-character hexadecimal string. Compute the expected hash locally in the test (read the same files, hash with the same algorithm) and assert equality. This is the parity check — if the runtime hash diverges from the locally computed hash, the build is stale.
   - `describe_capabilities_exposes_patch_operation_schema_hash` — analogous, asserting `result.build_info.patch_operation_schema_hash` matches a locally computed manifest hash.

3. **Documentation extension** (`docs/MACHINE-FACING-LAYER.md`): add a new sub-section under the existing `describe_capabilities` paragraph (currently at line 83 per agent verification). Suggested header: `### Build-info fields`.

   ```markdown
   ### Build-info fields

   `describe_capabilities` returns a `build_info` object alongside the tool list. Each field exposes a different currency surface:

   - `git_commit_hash` — the git commit the server source was built from. `unknown` when the build environment lacks git context.
   - `build_timestamp` — ISO-8601 timestamp of the build (server-start moment). Useful for "when was this binary made" inspection; not a fingerprint.
   - `source_schema_hash` — SHA-256 over normalized tool capabilities (sorted `{name, description, input_schema_enums}` per tool). Changes when the tool surface itself changes (new tool added, enum value added, description rewritten). Does NOT change when validator or patch-operation internals change without affecting the tool surface.
   - `validator_registry_hash` — SHA-256 over the concatenated source bytes of every file in `tools/validators/src/structural/` and `tools/validators/src/rules/`, sorted by path. Changes when ANY validator's source content changes, even when the validator's name is unchanged. The fingerprint a consumer checks to verify "does this running server have validator bundle X?"
   - `patch_operation_schema_hash` — SHA-256 over the patch-operation schema manifest (op-kind → op-schema mapping, sorted by kind). Changes when an op-kind's payload schema changes (required-field addition or removal, type change, enum value change). Useful for catching schema drift in deployed servers where the tool surface name might be unchanged but the underlying contract has shifted.

   Consumers verifying server currency should compare BOTH `validator_registry_hash` AND `patch_operation_schema_hash` against locally computed expectations — neither alone catches all drift. `validator_registry_hash` catches validator-implementation drift; `patch_operation_schema_hash` catches contract drift. The deployed smoke test at `tools/world-mcp/tests/server/dispatch.test.ts` (per SPEC-37 D3) complements these passive fingerprints by actively exercising validator code paths against known-bad fixtures.
   ```

   Cross-reference: the existing `describe_capabilities` prose at line 93 says *"call `mcp__worldloom__describe_capabilities()` for enum/contract inspection when deployed server is stale"* — extend that sentence to also mention `validator_registry_hash` and `patch_operation_schema_hash` as the deterministic comparison surface, not just "enum/contract inspection."

**FOUNDATIONS alignment**: §Machine-Facing Layer (capability and schema-discovery currency — the runtime surface must expose enough fingerprinting for consumers to verify "this running server has the validator/schema bundle I expect"); §Read Discipline (machine-facing layer documentation must enumerate what each runtime-exposed field means).

**Acceptance criteria**:
- `BuildInfo` interface includes `validator_registry_hash` and `patch_operation_schema_hash` fields, both populated with 64-character hexadecimal strings at server-startup time.
- `validator_registry_hash` differs after any byte-level change to any file in `tools/validators/src/structural/` or `tools/validators/src/rules/`.
- `patch_operation_schema_hash` differs after any byte-level change to any op-schema in the patch-operation envelope manifest.
- The two new capability-parity tests pass; the locally computed hashes match the runtime-exposed hashes.
- `docs/MACHINE-FACING-LAYER.md` contains a `### Build-info fields` sub-section documenting all five fields including the two new fingerprints.
- `npm run build && npm test` green in `tools/world-mcp/`.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Canon Fact Record Schema §epistemic_profile / §exception_governance | aligns | D1 enforces the same conditional safety-block contract on proposal-package candidates that `record_schema_compliance` enforces on accepted CF records. The proposal stage is part of the canon-promotion path; safety-block reasoning belongs at the moment a candidate is authored, not deferred to canon-addition. |
| §Story Bundles §5 Rule 5 (No Consequence Evasion) | aligns | D2's indirect-propagation check enforces that public/factional DA creations leave belief traces in observers reached through documentary, institutional, rumor, or surveillance channels. A public artifact with no propagation evidence and no parseable non-propagation tag is consequence evasion at the indirect-channel surface. |
| §Story Bundles §6a (Belief vs. Fact) | aligns | D2 consumes the existing `BEL.basis.access_route` enum as the deterministic surface for indirect-channel observers, treating BEL as the canonical record for observer-side belief consequences regardless of whether the observer was direct-witnessed or document/rumor/institutional-reached. |
| §Machine-Facing Layer (capability and schema-discovery currency) | aligns | D3 lands the load-bearing deployment smoke test that catches stale validator bundles by exercising them; D4 adds the supporting passive fingerprint surface (`validator_registry_hash`, `patch_operation_schema_hash`) that catches stale bundles by exposing their identity. Together they close the runtime/deployed parity gap deferred from SPEC-36. |
| Schema Minimalism | aligns | Zero new schema fields. D1 reuses existing `CF_TYPE_*` constants and helpers; D2 consumes the existing dormant `BEL.basis.access_route` enum; D3 exercises existing op kinds; D4 adds runtime build-info fields (not record-schema fields). The report's §13 explicit anti-recommendation against schema expansion for witness/promotion coverage is honored verbatim. |

---

## Verification

Test artifacts per deliverable:

| Deliverable | Test artifact |
|---|---|
| D1 | Five new test cases appended to `tools/validators/tests/structural/proposal-package-shape.test.ts` covering safety-sensitive type rejection, non-sensitive type acceptance, substantive `n_a` rationale acceptance, and thin `n_a` rationale rejection. |
| D2 | Five new test cases appended to `tools/validators/tests/structural/expected-witness-coverage.test.ts` covering public/factional DA rejection without indirect propagation, acceptance with indirect-route BEL, acceptance with `event_leaves_no_accessible_trace` tag, and no-false-trigger on private DA. |
| D3 | Two new test cases appended to `tools/world-mcp/tests/server/dispatch.test.ts` (`deployed_mcp_rejects_known_bad_causal_dependency_plan`, `deployed_mcp_rejects_known_bad_expected_witness_plan`) invoking `validate_patch_plan` through the running MCP boundary. Optional fixture helper at `tools/world-mcp/tests/server/known-bad-plan-fixtures.ts`. |
| D4 | Two new test cases appended to `tools/world-mcp/tests/server/capability-parity.test.ts` validating `validator_registry_hash` and `patch_operation_schema_hash` against locally computed expectations. New `### Build-info fields` sub-section in `docs/MACHINE-FACING-LAYER.md`. |

Full-suite proof at spec close: `npm test` green across `tools/validators/`, `tools/world-mcp/`, `tools/patch-engine/`, and `tools/hooks/`. CLI integration sanity via `world-validate` against a representative story-bundle fixture (the SPEC-36 D5 capstone fixture or its successor) confirming the new validator extensions (D1, D2) integrate cleanly into the existing validation harness. Manual smoke test: spin up `dist/src/server.js`, call `describe_capabilities` via the MCP CLI client, confirm the response includes the two new fingerprint fields populated with 64-character hexadecimal strings.

---

## Out of Scope

- **Multi-location-supersession indirect-propagation cue**: SEs whose `state_delta.supersede[]` changes STSTAT for entities across ≥2 distinct STLOCs (i.e., spatially distributed effect) should require per-location belief consequences or per-location non-propagation tags. Scoped out of D2 — see §Risks. The single-cue scoping (public-DA-trace only) keeps D2's calibration risk bounded and establishes the access-route-consumption pattern; multi-location supersession is the next incremental cue family.
- **STENT life/agency-supersession with SREL-tie propagation**: when SE supersedes a STENT's STSTAT to `life: dead` or `agency: captive`, the entity's SREL connections (any axis) name social neighbors who should learn about the change. Scoped out of D2 — see §Risks. The SREL-tie cue family is the natural follow-on to the public-DA cue family.
- **Sibling-story-bundle cross-contradiction validator**: the report's §8 Red-team support matrix names "sibling story bundles contradict one another" as judgment-assisted with no deterministic full cross-story contradiction validator verified. Out of scope here — cross-bundle contradiction detection requires bundle-graph traversal infrastructure beyond this spec's surface and is not load-bearing for tenth-iteration carry-over closure.
- **Repo-wide fixture lint for retired schema fields**: SPEC-36 D3 swept story-bundle ID regexes and named fixture files; a complete non-archived scan for the full retired-field list (`derived_from_cf`, `world_ent_id`, `storylet_realized`, `chosen_choice_id`, `arc_contract`, `dramatic_unit`, `execution_envelope`, `stop_policy`) across docs, briefs, and proposals remains out of scope. The report's §15 carry-over item 4 routes this to a separate doc-hygiene pass.
- **Generated `dist/` freshness check**: the report's §15 carry-over item 2 (`dist/` not present in inspected GitHub tree because gitignored). A CI step that asserts the running `dist/` matches the source-tree hash at deployment time is a separate-scope deployment-pipeline contract.
- **New patch-engine ops**: zero — D1, D2, D3 all consume existing op kinds; D4 introduces no new ops.
- **New MCP retrieval tools**: zero — D3/D4 extend existing `describe_capabilities` and dispatch surfaces.
- **Hook 3 modifications**: zero.
- **Schema field additions**: zero — explicitly honoring the report's §13 anti-recommendation against schema expansion for these findings.

---

## Risks & Open Questions

- **D2 indirect-cue scoping `(pragmatic — scoping)`.** D2 lands only the public/factional DA-trace cue. The full deterministic indirect-propagation surface has at least two more cue families: multi-location supersession (spatial spread) and STENT-death-with-SREL-ties (social spread). Both are landable in a future iteration once the access-route-consumption pattern is in place. Under no-scope-constraint conditions (e.g., a single dedicated indirect-propagation spec), all three cue families would land together. The choice to scope is pragmatic — landing one cue family at a time bounds the miscalibration surface that pilot-tier authoring will surface. If post-pilot calibration shows public-DA cue alone catches the majority of "social reality becomes fake" failures the report names, the remaining cue families become lower-priority; if not, validator-hardening-IV is likely.

- **D2 access-route subset calibration `(pragmatic — heuristic boundary)`.** The `INDIRECT_ACCESS_ROUTES` set (`document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech`) excludes `testimony`, `inference`, and `authorial_initialization`. `testimony` is excluded because it requires a chain of belief verification the validator cannot deterministically perform in one hop (B testifies to A's perception; the validator would need to verify B was a direct witness, which is a multi-hop check). `inference` is excluded because it is not evidence-bearing — a holder inferring from prior context does not constitute the kind of trace the audit motivation requires. `authorial_initialization` is excluded because it is the "starts-the-story" marker, not a propagation channel. If pilot-tier evidence shows `testimony` chains are the primary propagation channel for certain story shapes (e.g., legal-investigation bundles), revisit the set in a future iteration.

- **D2 non-propagation-tag scope clarification `(structural)`.** The new indirect-coverage check accepts only `non_propagation:event_leaves_no_accessible_trace(...)` as the valid non-propagation reason on a public/factional DA. The other four reasons (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`) are semantically about direct-witness scenarios — a public DA by definition leaves traces, so claiming "no witness" or "witness incapacitated" is contradictory. The non-propagation-tag-shape validator itself does not enforce this constraint; the new check enforces it at the coverage layer. If a future use case surfaces where a public DA legitimately has no accessible trace despite its public-circulation flag (e.g., a public notice immediately destroyed before anyone could see it), the author's recourse is either to mark the DA `circulation: suppressed` (existing enum value) or to use the `event_leaves_no_accessible_trace` reason explicitly.

- **D3 smoke-test fixture maintenance `(pragmatic — maintenance burden)`.** The known-bad-plan fixtures (causal-dependency clobbering, expected-witness omission) must remain syntactically valid against the patch-plan envelope schema. When the envelope schema evolves (e.g., D4's `patch_operation_schema_hash` change detection catches schema drift), the fixtures may break. Mitigation: the fixtures live in test code and are exercised by every CI run, so breakage surfaces immediately rather than as silent currency drift. If fixture maintenance proves disproportionate, route fixture construction through a builder helper that consumes the canonical envelope-schema types, so schema evolution propagates automatically.

- **D4 validator-source-hash file-discovery brittleness `(pragmatic)`.** `validator_registry_hash` is computed by reading all files matching `tools/validators/src/structural/*.ts` and `tools/validators/src/rules/*.ts` at server-startup time. If a future restructuring moves validator source files (e.g., to `tools/validators/src/structural/sub-category/`), the hash logic must be updated to find them — a missed update would silently exclude moved validators from the hash, producing false-passing parity tests. Mitigation: D4's capability-parity test computes the same hash locally using the same glob pattern, so a moved-but-missed file produces an immediate test failure on the next CI run. The brittleness is the cost of glob-based file discovery; an explicit import-and-introspect approach would be tighter but couples build-info to validator-import topology in ways that complicate refactoring.

- **D4 server-startup cost `(pragmatic — performance)`.** Computing `validator_registry_hash` requires reading every validator source file at server startup; depending on validator-count growth, this could add 10-50ms to startup time. For an MCP server invoked per-task (cold-start dominated), this matters. Mitigation: compute the hash at build time (in the same step that produces `dist/`) and embed it as a compile-time constant in `build-info.ts`, rather than computing at runtime. The capability-parity test computes the same hash on-demand for verification; runtime read of validator sources is unnecessary and harmful for cold-start performance.

- **Pilot-tier calibration unknowns.** Both D2's indirect-cue check and D1's safety-block enforcement are validated against synthetic fixtures only. Pilot-tier story-bundle authoring will surface calibration needs — false positives (validator fires when author's design is intentional), false negatives (validator misses a class of public-DA shape), and author-friction signals (validator obligates patterns authors find unnatural). The validator-hardening-IV iteration is likely.

- **No active story bundles yet.** This spec lands during the pre-pilot window. The blast radius on existing content is zero — there are no pilot-tier story bundles whose D1/D2 fixtures could break under tightened enforcement. D3/D4 changes are purely additive on test and build-info surfaces; no existing capability consumer breaks.
