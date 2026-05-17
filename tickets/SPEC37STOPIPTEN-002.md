# SPEC37STOPIPTEN-002: Extend expected_witness_coverage with public-DA-trace indirect-propagation check

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/structural/expected-witness-coverage.ts` (existing structural validator); extends its test file; aligns Phase 4 / Phase 2d prose in two consumer skills. No new validator, no new schema field — the validator consumes the existing dormant `BEL.basis.access_route` enum.
**Deps**: None

## Problem

`tools/validators/src/structural/expected-witness-coverage.ts:135-240` resolves only direct co-located witnesses (alive + non-incapacitated STENTs at the actor's STLOC) and uses `PUBLIC_BEL_VISIBILITIES = {public, shared, factional, rumored}` (line 12) and `PUBLIC_DA_CIRCULATION = {public, factional}` (line 13) as binary triggers. The validator never consumes `BEL.basis.access_route` — a verified-existing 11-value enum at `.claude/skills/_shared-templates/story-state-contract.md` §4.1 line 81 (`direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization`). Both consumer skills already prescribe indirect-propagation computation in prose (`.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4 lines 302-310; `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d line 196), but the validator catches none of that prescription deterministically. An author who emits a public-circulation DA in an SE's `state_delta.create[]` but never emits a corresponding BEL chain referencing that DA via an indirect-route `access_route` passes validation as long as direct-witness checks are satisfied. This is the "social reality becomes fake when public actions leave no rumor, institutional, documentary, artifact, or location trace" gap the tenth audit names; closing it brings deterministic enforcement to the cue family the skills already prescribe.

## Assumption Reassessment (2026-05-17)

1. `tools/validators/src/structural/expected-witness-coverage.ts` exists at 361 lines; the existing direct-witness logic and four verdict codes (`expected_witness_coverage_missing_public_bel`, `_wrong_group_label`, `_partial_bel_coverage`, `_tag_records_unresolved`) sit at lines 319-355; the `non_propagation:<reason>(group=<label>, records=[...])` tag pattern is parsed via `TAG_PATTERN` at line 22 and consumed at line 113 (`world_logic_rationale` extraction). The new indirect-check helper appends a fifth verdict code without altering existing logic.
2. `.claude/skills/_shared-templates/story-state-contract.md` §4.1 line 81 confirms the `BEL.basis.access_route` enum verbatim (all 11 values match the spec). `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4 lines 302-320 prescribes the `expected_witnesses` computation (direct + indirect) and the closed non-propagation reason set (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`); `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d line 196 prescribes the same. Both already reference SPEC-36 D2 for the direct-witness validator; this ticket extends the validator and updates the same prose surfaces with SPEC-37 D2 attribution.
3. Cross-skill / cross-artifact boundary under audit: the deterministic indirect-witness enforcement contract spanning `expected_witness_coverage` (validator), `branching-story-turn-cycle` Phase 4 (author-time prescription), and `branching-story-health-audit` Phase 2d (audit-time replay). All three must agree on (a) which cue triggers indirect coverage (public/factional DA creation), (b) which `access_route` values count as indirect coverage (the closed `INDIRECT_ACCESS_ROUTES` set), and (c) which non-propagation reason is valid as a coverage override (`event_leaves_no_accessible_trace` only, since the other four reasons are direct-witness-scoped and contradict public-circulation semantics).
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Story Bundles §5 Rule 5 (No Consequence Evasion, line 452) — public artifacts that propagate no belief trace are consequence evasion at the indirect-channel surface. §Story Bundles §6a (Belief vs. Fact) makes BEL the canonical record for observer-side belief consequences, including indirect-channel observers. Schema Minimalism — the validator consumes the dormant `BEL.basis.access_route` enum (already on the contract) and emits one new verdict code; no schema field is added.
5. Canon Safety Check surface: `expected_witness_coverage` is a structural validator under `tools/validators/src/structural/` running at the patch engine's pre-apply phase. Adding the `expected_witness_coverage_missing_indirect_propagation` verdict code preserves the Mystery Reserve firewall — the indirect-propagation check fires only on public/factional DA cues, never inspecting MR records; the closed non-propagation reason `event_leaves_no_accessible_trace` is the explicit author escape valve when a public DA legitimately produces no trace, so the check does not silently resolve any MR entry.

## Architecture Check

1. Extending the existing validator (rather than authoring a sibling `indirect_witness_propagation` validator) keeps trigger-resolution logic single-source — parent-PG snapshot retrieval, actor STSTAT lookup, location resolution, public/factional cue extraction all live in one place. A sibling validator would duplicate that infrastructure and double the registry surface. The scoping decision is structural, not pragmatic.
2. The conservative trigger condition (only public/factional DA creation in `state_delta.create[]`) bounds the v1 calibration surface to one cue family. Multi-location supersession (spatial spread) and STENT-death-with-SREL-ties (social spread) are deferred to a future iteration; landing one cue family first lets pilot authoring surface calibration evidence before broader cue families land. No backwards-compatibility shims — the existing eight direct-witness tests stay green; the new check is additive.

## Verification Layers

1. Indirect-coverage check fires on public/factional DA without indirect-route BEL → `npm test` in `tools/validators/` exercises the new test fixtures.
2. Indirect-coverage check accepts public DA with indirect-route BEL → same test command verifies the positive-acceptance path.
3. `event_leaves_no_accessible_trace` tag overrides the indirect requirement → same test command verifies the explicit non-propagation acceptance.
4. No false positives on private DA → the no-trigger test fixture verifies the check stays scoped to public/factional circulation.
5. Skill-prose alignment → `grep -n "expected_witness_coverage_missing_indirect_propagation\|INDIRECT_ACCESS_ROUTES" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns the new paragraphs.

## What to Change

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

Add a new helper `indirectPropagationCheck(event, parsedEvent, maps)` that returns `Verdict[]`. Call it from the existing event-processing loop after the direct-witness check resolves (whether the direct-witness check emitted verdicts or not — indirect coverage is an independent concern). The helper:

- Reads `parsedEvent.state_delta?.create` as a list; for each id matching `/^DA-\d+$/`, looks up the DA record in `maps.byId`; reads its parsed `circulation` value. If `circulation` is not in `PUBLIC_DA_CIRCULATION`, skip (private/concealed/suppressed DAs do not trigger indirect coverage).
- For each public/factional DA-id, scans the same SE's `state_delta.create[]` for BEL records whose `parsed.basis.source_records` (or whichever field name carries the basis-anchored record id list — confirm exact field name against the existing validator's BEL handling) contains the DA-id AND whose `parsed.basis.access_route` is in `INDIRECT_ACCESS_ROUTES`. If at least one such BEL exists, the DA is covered — no verdict for this DA.
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
  suggested_fix: "Create a BEL whose basis.source_records names the DA and whose basis.access_route is in {document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}, or add a non_propagation:event_leaves_no_accessible_trace tag naming the DA in SE.world_logic_rationale."
}
```

Document `testimony`, `inference`, and `authorial_initialization` exclusion rationale as code comments at the `INDIRECT_ACCESS_ROUTES` definition — they are excluded because (a) `testimony` requires a multi-hop chain the validator cannot deterministically verify, (b) `inference` is not evidence-bearing, (c) `authorial_initialization` is the story-genesis marker, not a propagation channel.

### 2. Test extension at `tools/validators/tests/structural/expected-witness-coverage.test.ts`

Add five new test cases (preserving the existing eight unchanged):

- `expected_witness_coverage_rejects_public_da_without_indirect_propagation` — fixture: SE with `state_delta.create: ["DA-1", ...]` where DA-1 has `circulation: public`; one direct-witness BEL satisfies the direct-witness check; no BEL references DA-1; no non-propagation tag mentions DA-1. Assert verdict array contains exactly one verdict with `code === "expected_witness_coverage_missing_indirect_propagation"`.
- `expected_witness_coverage_rejects_factional_da_without_indirect_propagation` — fixture as above with `circulation: factional`. Same assertion.
- `expected_witness_coverage_accepts_public_da_with_indirect_route_bel` — fixture as above plus an additional BEL whose `basis.source_records: ["DA-1"]` and `basis.access_route: document`. Assert no `expected_witness_coverage_missing_indirect_propagation` verdict.
- `expected_witness_coverage_accepts_public_da_with_event_leaves_no_accessible_trace_tag` — fixture as above but with `SE.world_logic_rationale` containing `non_propagation:event_leaves_no_accessible_trace(group=public_general, records=[DA-1])`. Assert no `expected_witness_coverage_missing_indirect_propagation` verdict.
- `expected_witness_coverage_does_not_trigger_indirect_check_for_private_da` — fixture: SE with `state_delta.create: ["DA-2"]` where DA-2 has `circulation: private`. Assert no `expected_witness_coverage_missing_indirect_propagation` verdict (existing direct-witness check still applies independently — assert only on indirect-verdict absence).

### 3. Skill-prose alignment at `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4

After the existing `indirect:` bullet at line 308 describing the conceptual indirect-witness group, insert a paragraph naming the deterministic enforcement scope:

```
The structural validator `expected_witness_coverage` enforces the
indirect-witness obligation deterministically for one specific cue: when the
SE's `state_delta.create[]` produces a DA with `circulation` in
{public, factional}, at least one BEL referencing that DA via
`basis.source_records[]` MUST carry `basis.access_route` in the indirect-route
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

After the existing indirect-witness prescription at line 196, append an analogous paragraph citing `expected_witness_coverage_missing_indirect_propagation` as the validator-emitted verdict authors should expect when the public-DA cue fires (referencing SPEC-37 D2 in the same line-of-prose convention SPEC-36 D2 was cited). Authors reading Phase 2d findings should be able to map the new verdict code to the prescription paragraph above it without inference.

## Files to Touch

- `tools/validators/src/structural/expected-witness-coverage.ts` (modify)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 4 prose insertion)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2d prose append)

## Out of Scope

- Multi-location-supersession indirect-propagation cue (SEs whose `state_delta.supersede[]` spans ≥2 distinct STLOCs requiring per-location belief consequences) — explicitly scoped out per SPEC-37 §Risks "D2 indirect-cue scoping" entry; routed to a future iteration.
- STENT life/agency-supersession with SREL-tie propagation (death/capture supersessions naming SREL-connected social neighbors who should learn) — explicitly scoped out per SPEC-37 §Risks; routed to a future iteration.
- `testimony` / `inference` / `authorial_initialization` route handling — `testimony` excluded because multi-hop verification is out of reach for a single-pass validator; `inference` excluded because it is not evidence-bearing; `authorial_initialization` excluded because it is the story-genesis marker, not a propagation channel.
- Modification of the existing eight direct-witness tests — they stay green unchanged.
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

1. `tools/validators/tests/structural/expected-witness-coverage.test.ts` — five new cases per §What to Change §2; covers public/factional DA rejection (×2), indirect-route BEL acceptance, `event_leaves_no_accessible_trace` tag acceptance, no-false-trigger on private DA.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators package verification.
2. `grep -n "INDIRECT_ACCESS_ROUTES" tools/validators/src/structural/expected-witness-coverage.ts` — verify the new constant landed in the validator.
3. `grep -n "expected_witness_coverage_missing_indirect_propagation" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — verify the new verdict code is cited in both consumer skill phase prose surfaces.
