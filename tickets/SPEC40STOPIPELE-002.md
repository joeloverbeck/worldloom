# SPEC40STOPIPELE-002: Extend `expected_witness_coverage` fixtures with 4 indirect-route variants + clarify health-audit Phase 2d prose

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/validators/tests/structural/expected-witness-coverage.test.ts` with new fixtures (no validator-source modification) and rewrites the Phase 2d witness-completeness prose in `.claude/skills/branching-story-health-audit/SKILL.md`.
**Deps**: None

## Problem

D2 of SPEC-40, scope-path-A. The `expected_witness_coverage` validator at `tools/validators/src/structural/expected-witness-coverage.ts:17-25` already consumes all 7 indirect `BEL.basis.access_route` values (`document`, `object_trace`, `location_trace`, `rumor`, `surveillance`, `institutional_channel`, `magic_tech`) when triggered by a DA creation with `circulation ∈ {public, factional}`. But the existing test fixtures at `tools/validators/tests/structural/expected-witness-coverage.test.ts:90-100` only exercise the `document` route; the other 4 indirect routes are mechanized in source but not stress-tested. A regression in `INDIRECT_ACCESS_ROUTES` membership or the route-vs-BEL-vs-DA matching logic at `hasIndirectBelForArtifact()` (`:195-210`) would land silently. Separately, `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d (around line 198) names broader propagation routes — "law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or accessible DA / STOBJ evidence" — that the validator does NOT mechanize, without classifying the gap. Audit readers cannot tell which prose-named routes have deterministic enforcement and which are author-discipline only.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/validators/src/structural/expected-witness-coverage.ts:17-25` declares the `INDIRECT_ACCESS_ROUTES` set covering all 7 indirect access_route values; `:164-193` `indirectPropagationVerdicts()` triggers only on DA creation with `circulation ∈ {public, factional}`; `:195-210` `hasIndirectBelForArtifact()` matches BEL against the DA via `basis.access_records[]` and validates `basis.access_route` membership in the indirect-route set. Existing fixture at `tests/structural/expected-witness-coverage.test.ts:90-100` exercises `access_route: "document"`. Four routes (`institutional_channel`, `rumor`, `location_trace`, `object_trace`) lack fixture coverage.
2. Spec: SPEC-40 §D2 names the 5 P1 red-team test fixtures the auditor recommended (4 new accepts + paired negatives = 8 tests total), plus the Phase 2d prose clarification classifying non-mechanized routes as `judgment_assisted_indirect_propagation_unverified`. The skill-prose source is `.claude/skills/branching-story-health-audit/SKILL.md` at the Phase 2d witness-completeness section beginning around line 198 (`compute 'indirect' witnesses from public or factional holders reached through law, ritual, bureaucracy, ...`).
3. Cross-skill boundary: the test fixtures land at `tools/validators/tests/`; the prose change lands at `.claude/skills/branching-story-health-audit/SKILL.md`. The shared contract under audit is the prose-vs-enforcement boundary — skill prose may name propagation routes the validator does not mechanize, but the classification must be explicit (`judgment_assisted_indirect_propagation_unverified`) rather than implicit-passing. The validator source at `tools/validators/src/structural/expected-witness-coverage.ts` is NOT modified by this ticket; only the test surface and the consumer skill's prose framing.
4. FOUNDATIONS principle: §Story Bundles §5b (Schema-Minimalism At Story Scope) at `docs/FOUNDATIONS.md:626` motivates the no-new-fields scope — the auditor's own §F-02 Recommendation explicitly says *"Do not add fields. Add deterministic checks only where current records already encode evidence."* This ticket adds tests against existing fields and clarifies prose; it adds no new validator code, no new schema fields, no new records. The deferred full mechanization (multi-location supersession, STENT-death-with-SREL, STOBJ-as-independent-route) routes to a future validator-hardening-III spec per SPEC-40 §Risks & Open Questions.

## Architecture Check

1. Adding tests against the existing `INDIRECT_ACCESS_ROUTES` set + clarifying skill prose at the consumer boundary is structurally cleaner than extending the validator. The validator already consumes the full route enum; the only gap is fixture coverage. Modifying the validator (e.g., adding multi-location-supersession cues or STOBJ-as-independent-route detection) would expand scope into a separate cluster the spec explicitly defers to validator-hardening-III.
2. No backwards-compatibility aliasing or shims — new tests are pure additions; the prose rewrite replaces an implicit-pass framing with an explicit classification. Existing tests and the skill's adjacent prose continue to work unchanged.

## Verification Layers

1. Fixture coverage → test run: `cd tools/validators && npm test` passes with 8 new tests (4 accept + 4 paired negative) covering `institutional_channel`, `rumor`, `location_trace`, `object_trace` routes.
2. Skill-prose discipline → codebase grep-proof: `grep -nE 'judgment_assisted_indirect_propagation_unverified' .claude/skills/branching-story-health-audit/SKILL.md` returns the new classification phrase at the Phase 2d witness-completeness section.
3. Cross-artifact boundary preservation → manual review: the prose change explicitly names the deterministic-vs-judgment-assisted boundary (the 7 indirect access_route values the validator mechanizes when DA-anchored vs. the broader prose-named routes that remain authorial discipline), so audit readers can quote the boundary verbatim.

## What to Change

### 1. Test fixture extensions

At `tools/validators/tests/structural/expected-witness-coverage.test.ts`, add 4 new accept tests + 4 paired negative tests modeled on the existing `expected_witness_coverage_accepts_public_da_with_indirect_route_bel` test at `:90-100`:

- `expected_witness_coverage_accepts_public_da_with_institutional_channel_route` — fixture: SE creates public DA; BEL with `access_route: "institutional_channel"` and `access_records: ["DA-1"]`. Expect no verdict. Paired negative: same fixture without the BEL — expect `expected_witness_coverage_missing_indirect_propagation`.
- `expected_witness_coverage_accepts_factional_da_with_rumor_route` — fixture: SE creates factional DA; BEL with `access_route: "rumor"` and `access_records: ["DA-1"]`. Expect no verdict. Paired negative: same fixture with `access_route: "direct_observation"` (a non-indirect route) — expect the missing-indirect-propagation verdict.
- `expected_witness_coverage_accepts_public_da_with_location_trace_route` — fixture: SE creates public DA at a non-concealed STLOC; BEL with `access_route: "location_trace"` and `access_records: ["DA-1"]`. Expect no verdict. Paired negative: same fixture without the BEL — expect the verdict.
- `expected_witness_coverage_accepts_public_da_with_object_trace_route` — fixture: SE creates public DA referencing STOBJ-1; BEL with `access_route: "object_trace"` and `access_records: ["DA-1"]`. Expect no verdict. Paired negative: same fixture with `access_route: "magic_tech"` instead of `"object_trace"` — expect no verdict (magic_tech is still an indirect route; this fixture documents that all 7 routes pass the matcher).

### 2. Health-audit Phase 2d prose clarification

In `.claude/skills/branching-story-health-audit/SKILL.md`, locate the Phase 2d witness-completeness section (the paragraph beginning *"compute `indirect` witnesses from public or factional holders reached through law, ritual, bureaucracy, ..."*) and append (or rewrite the trailing prose to incorporate) the following classification language:

> When a propagation route is named in prose or rationale but no `DA` / `STOBJ` / `STLOC` / `BEL.basis` record encodes the evidence path, classify the audit verdict as `judgment_assisted_indirect_propagation_unverified` and surface it in the audit report alongside the deterministic findings. The `expected_witness_coverage` validator mechanizes only the DA-anchored cue: SE creates a `DA` with `circulation ∈ {public, factional}`, and one of the created BELs references that DA via `basis.access_records[]` with `basis.access_route` in the indirect-route set `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}`, OR `SE.world_logic_rationale` carries a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[<DA-id>])` tag. Other propagation routes — multi-location supersession, STENT-death with SREL ties, environmental change inferred from STLOC modification without DA evidence, STOBJ-as-independent-route propagation — remain authorial discipline and must be classified `judgment_assisted_indirect_propagation_unverified` in the audit report rather than silently treated as covered; see the validator-hardening-III deferral in a future spec for the mechanization roadmap.

## Files to Touch

- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (modify) — append 8 new tests.
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify) — rewrite Phase 2d witness-completeness paragraph trailing prose.

## Out of Scope

- No validator-source modification (`tools/validators/src/structural/expected-witness-coverage.ts` is unchanged).
- No new schema fields, no record-schema changes.
- No mechanization of multi-location supersession, STENT-death-with-SREL, environmental-change-via-STLOC-modification, or STOBJ-as-independent-route cues (deferred to validator-hardening-III per SPEC-40 §Risks & Open Questions).
- No registry change.
- No MCP, hook, or patch-engine changes.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` passes with 8 new tests (4 accept + 4 paired negative) covering the four uncovered indirect access_route values.
2. Each new test exercises a distinct indirect `access_route` value not previously covered by fixtures (`institutional_channel`, `rumor`, `location_trace`, `object_trace`).
3. Reading `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d after the change makes the deterministic-vs-judgment-assisted boundary explicit; `grep -nE 'judgment_assisted_indirect_propagation_unverified' .claude/skills/branching-story-health-audit/SKILL.md` returns the new classification phrase.

### Invariants

1. Validator source remains unchanged — `INDIRECT_ACCESS_ROUTES` set membership and `indirectPropagationVerdicts()` trigger logic are not modified by this ticket.
2. Skill prose distinguishes deterministic enforcement (the 7 DA-anchored indirect-route values) from judgment-assisted classification (broader prose-named routes); no implicit-pass framing remains.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/expected-witness-coverage.test.ts` (modify) — append 8 new tests organized as 4 accept/negative pairs, one pair per uncovered indirect route.

### Commands

1. `cd tools/validators && npm test` — runs the full validators test suite including the 8 new tests.
2. `cd tools/validators && npm run build` — TypeScript build (typecheck via tsc).
3. `grep -nE 'judgment_assisted_indirect_propagation_unverified' .claude/skills/branching-story-health-audit/SKILL.md` — confirms the new classification phrase is present in the Phase 2d prose.
