# SPEC37STOPIPTEN-002: Extend expected_witness_coverage with public-DA-trace indirect-propagation check

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/structural/expected-witness-coverage.ts` (existing structural validator); extends its test file; aligns Phase 4 / Phase 2d prose in two consumer skills. No new validator, no new schema field — the validator consumes the existing dormant `BEL.basis.access_route` enum.
**Deps**: None

## Problem

At intake, `tools/validators/src/structural/expected-witness-coverage.ts` resolved only direct co-located witnesses (alive + non-incapacitated STENTs at the actor's STLOC) and used `PUBLIC_BEL_VISIBILITIES = {public, shared, factional, rumored}` and `PUBLIC_DA_CIRCULATION = {public, factional}` as binary triggers. The validator did not consume `BEL.basis.access_route` or `BEL.basis.access_records` for indirect artifact propagation, even though both consumer skills already prescribed indirect-propagation computation in prose. An author could emit a public-circulation DA in an SE's `state_delta.create[]` without a corresponding BEL chain referencing that DA via an indirect-route `access_route`, and the event passed validation as long as direct-witness checks were satisfied. This was the "social reality becomes fake when public actions leave no rumor, institutional, documentary, artifact, or location trace" gap the tenth audit named; this ticket closes deterministic enforcement for the public/factional DA cue family the skills already prescribe.

## Assumption Reassessment (2026-05-17)

1. `tools/validators/src/structural/expected-witness-coverage.ts` contained the existing direct-witness logic and four verdict codes (`expected_witness_coverage_missing_public_bel`, `_wrong_group_label`, `_partial_bel_coverage`, `_tag_records_unresolved`). This ticket adds a fifth verdict code, `expected_witness_coverage_missing_indirect_propagation`, while preserving the direct-witness verdict flow.
2. `.claude/skills/_shared-templates/story-state-contract.md` §4.1 confirms the `BEL.basis.access_route` enum and the basis record-list field name `access_records`, not `source_records`. Reassessment corrected the spec/ticket draft to use `basis.access_records[]` as the deterministic DA reference field. `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4 prescribes the `expected_witnesses` computation (direct + indirect) and the closed non-propagation reason set (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`); `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d prescribes the same. Both now name SPEC-37 D2 / the new verdict for the public/factional DA enforcement cue.
3. Cross-skill / cross-artifact boundary under audit: the deterministic indirect-witness enforcement contract spanning `expected_witness_coverage` (validator), `branching-story-turn-cycle` Phase 4 (author-time prescription), and `branching-story-health-audit` Phase 2d (audit-time replay). All three must agree on (a) which cue triggers indirect coverage (public/factional DA creation), (b) which `access_route` values count as indirect coverage (the closed `INDIRECT_ACCESS_ROUTES` set), and (c) which non-propagation reason is valid as a coverage override (`event_leaves_no_accessible_trace` only, since the other four reasons are direct-witness-scoped and contradict public-circulation semantics).
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Story Bundles §5 Rule 5 (No Consequence Evasion) — public artifacts that propagate no belief trace are consequence evasion at the indirect-channel surface. §Story Bundles §6a (Belief vs. Fact) makes BEL the canonical record for observer-side belief consequences, including indirect-channel observers. Schema Minimalism — the validator consumes the dormant `BEL.basis.access_route` enum (already on the contract) and emits one new verdict code; no schema field is added.
5. Canon Safety Check surface: `expected_witness_coverage` is a structural validator under `tools/validators/src/structural/` running at the patch engine's pre-apply phase. Adding the `expected_witness_coverage_missing_indirect_propagation` verdict code preserves the Mystery Reserve firewall — the indirect-propagation check fires only on public/factional DA cues, never inspecting MR records; the closed non-propagation reason `event_leaves_no_accessible_trace` is the explicit author escape valve when a public DA legitimately produces no trace, so the check does not silently resolve any MR entry.

## Architecture Check

1. Extending the existing validator (rather than authoring a sibling `indirect_witness_propagation` validator) keeps trigger-resolution logic single-source — parent-PG snapshot retrieval, actor STSTAT lookup, location resolution, public/factional cue extraction all live in one place. A sibling validator would duplicate that infrastructure and double the registry surface. The scoping decision is structural, not pragmatic.
2. The conservative trigger condition (only public/factional DA creation in `state_delta.create[]`) bounds the v1 calibration surface to one cue family. Multi-location supersession (spatial spread) and STENT-death-with-SREL-ties (social spread) are deferred to a future iteration; landing one cue family first lets pilot authoring surface calibration evidence before broader cue families land. No backwards-compatibility shims — existing direct-witness behavior stays green, and one legacy direct-witness fixture was re-anchored away from public DA creation so it still tests direct non-propagation rather than the new indirect cue.

## Verification Layers

1. Indirect-coverage check fires on public/factional DA without indirect-route BEL → `npm test` in `tools/validators/` exercises the new test fixtures.
2. Indirect-coverage check accepts public DA with indirect-route BEL → same test command verifies the positive-acceptance path.
3. `event_leaves_no_accessible_trace` tag overrides the indirect requirement → same test command verifies the explicit non-propagation acceptance.
4. No false positives on private DA → the no-trigger test fixture verifies the check stays scoped to public/factional circulation.
5. Skill-prose alignment → `grep -n "expected_witness_coverage_missing_indirect_propagation" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns the new consumer-skill paragraphs.

## Landed Changes

### 1. Validator extension at `tools/validators/src/structural/expected-witness-coverage.ts`

Preserve all existing direct-witness logic unchanged (lines 12-13 constants, lines 22 + 113 tag parsing, lines 135-240 direct-witness resolution, lines 319-355 verdict emission). Add a new module-local constant:

```typescript
const INDIRECT_ACCESS_ROUTES = new Set([
  "document",
  "object_trace",
  "location_trace",
  "rumor",
  "surveillance",
  "institutional_channel",
  "magic_tech"
]);
```

Added `indirectPropagationVerdicts(event, parsedEvent, eventId, tags, maps)` and called it from the existing event-processing loop after the direct-witness check resolves cleanly. Direct-witness failures still return first; if direct coverage is valid, indirect coverage is checked independently. The helper:

- Reads `parsedEvent.state_delta?.create` as a list; for each id matching `/^DA-\d+$/`, looks up the DA record in `maps.byId`; reads its parsed `circulation` value. If `circulation` is not in `PUBLIC_DA_CIRCULATION`, skip (private/concealed/suppressed DAs do not trigger indirect coverage).
- For each public/factional DA-id, scans the same SE's `state_delta.create[]` for BEL records whose `parsed.basis.access_records` contains the DA-id AND whose `parsed.basis.access_route` is in `INDIRECT_ACCESS_ROUTES`. If at least one such BEL exists, the DA is covered — no verdict for this DA.
- If no covering BEL exists, scan parsed `non_propagation` tags from `world_logic_rationale` (reuse the existing `TAG_PATTERN` parse at line 22). If a tag exists whose `<reason>` is exactly `event_leaves_no_accessible_trace` AND whose `records=[...]` includes the DA-id, the DA is covered.
- Other non-propagation reasons (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`) are NOT valid for indirect coverage on a public-circulation DA — a public DA by definition leaves traces; the only valid non-propagation reason at this surface is `event_leaves_no_accessible_trace`.
- On failure (uncovered public/factional DA), emit verdict:

```typescript
{
  validator: "expected_witness_coverage",
  severity: "fail",
  code: "expected_witness_coverage_missing_indirect_propagation",
  message: `event ${eventId} creates DA ${daId} with circulation '${circulationValue}' but no BEL with indirect access_route (one of: document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech) references it and no event_leaves_no_accessible_trace tag covers it`,
  location: { file: eventFilePath, node_id: eventId },
  suggested_fix: "Create a BEL whose basis.access_records names the DA and whose basis.access_route is in {document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}, or add a non_propagation:event_leaves_no_accessible_trace tag naming the DA in SE.world_logic_rationale."
}
```

Document `testimony`, `inference`, and `authorial_initialization` exclusion rationale as code comments at the `INDIRECT_ACCESS_ROUTES` definition — they are excluded because (a) `testimony` requires a multi-hop chain the validator cannot deterministically verify, (b) `inference` is not evidence-bearing, (c) `authorial_initialization` is the story-genesis marker, not a propagation channel.

### 2. Test extension at `tools/validators/tests/structural/expected-witness-coverage.test.ts`

Added five new test cases and adjusted one pre-existing direct-witness non-propagation fixture so it keeps testing direct-witness non-propagation without also creating a public DA that should now trigger indirect enforcement:

- `expected_witness_coverage_rejects_public_da_without_indirect_propagation` — fixture: SE with `state_delta.create: ["DA-1", ...]` where DA-1 has `circulation: public`; one direct-witness BEL satisfies the direct-witness check; no BEL references DA-1; no non-propagation tag mentions DA-1. Assert verdict array contains exactly one verdict with `code === "expected_witness_coverage_missing_indirect_propagation"`.
- `expected_witness_coverage_rejects_factional_da_without_indirect_propagation` — fixture as above with `circulation: factional`. Same assertion.
- `expected_witness_coverage_accepts_public_da_with_indirect_route_bel` — fixture as above plus an additional BEL whose `basis.access_records: ["DA-1"]` and `basis.access_route: document`. Assert no `expected_witness_coverage_missing_indirect_propagation` verdict.
- `expected_witness_coverage_accepts_public_da_with_event_leaves_no_accessible_trace_tag` — fixture as above but with `SE.world_logic_rationale` containing `non_propagation:event_leaves_no_accessible_trace(group=public_general, records=[DA-1])`. Assert no `expected_witness_coverage_missing_indirect_propagation` verdict.
- `expected_witness_coverage_does_not_trigger_indirect_check_for_private_da` — fixture: SE with `state_delta.create: ["DA-2"]` where DA-2 has `circulation: private`. Assert no `expected_witness_coverage_missing_indirect_propagation` verdict (existing direct-witness check still applies independently — assert only on indirect-verdict absence).

### 3. Skill-prose alignment at `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4

After the existing `indirect:` bullet describing the conceptual indirect-witness group, inserted a paragraph naming the deterministic enforcement scope:

```
The structural validator `expected_witness_coverage` enforces the
indirect-witness obligation deterministically for one specific cue: when the
SE's `state_delta.create[]` produces a DA with `circulation` in
{public, factional}, at least one BEL referencing that DA via
`basis.access_records[]` MUST carry `basis.access_route` in the indirect-route
set `{document, object_trace, location_trace, rumor, surveillance,
institutional_channel, magic_tech}`, or the SE's `world_logic_rationale` MUST
carry a parseable
`non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[<DA-id>])`
tag. Other indirect-witness obligations (multi-location supersession,
STENT-death with SREL ties, environmental change) remain authorial discipline
and are not yet enforced by the validator; see SPEC-37 §Risks for the
indirect-cue calibration roadmap.
```

### 4. Skill-prose alignment at `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d

After the existing indirect-witness prescription, appended an analogous paragraph citing `expected_witness_coverage_missing_indirect_propagation` as the validator-emitted verdict authors should expect when the public-DA cue fires. Authors reading Phase 2d findings can map the new verdict code to the prescription paragraph above it without inference.

## Files to Touch

- `tools/validators/src/structural/expected-witness-coverage.ts` (modify)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 4 prose insertion)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2d prose append)

## Out of Scope

- Multi-location-supersession indirect-propagation cue (SEs whose `state_delta.supersede[]` spans ≥2 distinct STLOCs requiring per-location belief consequences) — explicitly scoped out per SPEC-37 §Risks "D2 indirect-cue scoping" entry; routed to a future iteration.
- STENT life/agency-supersession with SREL-tie propagation (death/capture supersessions naming SREL-connected social neighbors who should learn) — explicitly scoped out per SPEC-37 §Risks; routed to a future iteration.
- `testimony` / `inference` / `authorial_initialization` route handling — `testimony` excluded because multi-hop verification is out of reach for a single-pass validator; `inference` excluded because it is not evidence-bearing; `authorial_initialization` excluded because it is the story-genesis marker, not a propagation channel.
- Behavioral changes to the existing direct-witness checks — they stay green; one fixture was rewritten only to avoid overlapping the new indirect public-DA cue.
- Schema field additions — explicitly honoring the audit's anti-recommendation against schema expansion for witness coverage.

## Acceptance Criteria

### Tests That Must Pass

1. The five new test cases in `tools/validators/tests/structural/expected-witness-coverage.test.ts` all pass.
2. The existing eight test cases in the same file remain green.
3. `cd tools/validators && npm run build && npm test` exits 0.

### Invariants

1. `INDIRECT_ACCESS_ROUTES` membership matches `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}` — exclusions of `testimony`, `inference`, `authorial_initialization`, `direct_observation` are intentional and documented.
2. The indirect-coverage check fires only when the SE's `state_delta.create[]` contains a DA with `circulation ∈ {public, factional}` — private/concealed/suppressed DAs never trigger the check.
3. The only valid non-propagation reason for indirect coverage on a public/factional DA is `event_leaves_no_accessible_trace` — the other four closed-set reasons remain valid only for direct-witness coverage.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/expected-witness-coverage.test.ts` — five new cases per §Landed Changes §2; covers public/factional DA rejection (×2), indirect-route BEL acceptance, `event_leaves_no_accessible_trace` tag acceptance, no-false-trigger on private DA.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators package verification.
2. `grep -n "INDIRECT_ACCESS_ROUTES" tools/validators/src/structural/expected-witness-coverage.ts` — verify the new constant landed in the validator.
3. `grep -n "expected_witness_coverage_missing_indirect_propagation" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — verify the new verdict code is cited in both consumer skill phase prose surfaces.

## Outcome

Completed: 2026-05-17

`expected_witness_coverage` now checks a public/factional DA indirect-propagation cue after direct-witness coverage succeeds. The validator accepts a same-SE BEL that cites the DA through `basis.access_records[]` and an indirect `basis.access_route`, accepts an explicit `event_leaves_no_accessible_trace` tag naming the DA, ignores private DAs for this new check, and emits `expected_witness_coverage_missing_indirect_propagation` when a public/factional DA has neither coverage path.

The validators test file now covers public and factional missing-propagation failures, indirect-route BEL acceptance, non-propagation tag acceptance, and private-DA non-trigger behavior. The two consumer skills now name the deterministic public/factional DA cue, the indirect-route set, the `basis.access_records[]` field, and the new verdict.

## Verification Result

1. `cd tools/validators && npm test` — passed; package build succeeded and `node --test dist/tests/**/*.test.js` reported 342 passing tests.
2. `node --test dist/tests/structural/expected-witness-coverage.test.js` — initially isolated the one legacy fixture failure after the first package run; after adjusting that fixture, the full package run above passed.
3. `grep -n "INDIRECT_ACCESS_ROUTES" tools/validators/src/structural/expected-witness-coverage.ts` — returned the new constant definition and use.
4. `grep -n "expected_witness_coverage_missing_indirect_propagation" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — returned both consumer skill references.

## Deviations

- The draft ticket and spec used `basis.source_records[]` in several D2 examples. Live `docs/FOUNDATIONS.md` / story-state contract authority uses `basis.access_records[]`, so the implementation and consumer skill prose use `access_records`.
- The pre-existing `expected_witness_coverage_accepts_valid_non_propagation_evidence` fixture originally created a public DA. Under the landed contract, that fixture should also trigger indirect-propagation enforcement, so it now uses a non-DA direct-witness trigger and remains a direct-witness non-propagation test.
