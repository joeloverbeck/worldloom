# SPEC20SCECOM-011: Spec Integration — §Verification End-to-End Exercise

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — fixture-based test exercise of SPEC-20 §Verification matrix (no production code changes; introduces test fixtures and dry-run scripts in skill testing surfaces). No new skill, tool, hook, or validator is introduced; the ticket exercises the pipeline composed by SPEC20SCECOM-001..-010.
**Deps**: SPEC20SCECOM-009 (transitive head — composes all earlier phase tickets via SKILL.md Process Flow + Phase descriptions); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22's validator implementations are required for the empirical verification of choice-worthiness, replay-safety, evidence-alignment, narrative-point classification gates)

## Problem

SPEC-20 §Verification names six empirical bullets that exercise the v2 page-cycle pipeline end-to-end: snapshot-replay equality at arc cadence, token-cost reduction (descriptive), choice-surface gate correctness across modes, choice-worthiness enforcement (0 CHCs with empty `likely_effects`), strong-axis collective difference, ARC_TRACE evidence alignment, and HARD-GATE preservation. After SPEC20SCECOM-001..-010 land their per-phase reference files, SKILL.md surface, Phase 9 gate list, and side-deliverables, the spec's §Verification matrix needs a capstone exercise that proves the assembled pipeline matches the spec's commitments. Per §Spec-Integration Ticket Shape, this ticket lands a single trailing exercise that (a) fixture-copies a v2 story bundle, (b) re-enumerates expected counts, (c) asserts each §Verification bullet, (d) records token-cost and HARD-GATE-fire-count empirically.

## Assumption Reassessment (2026-05-07)

1. Verified SPEC-20 §Verification (lines 305-313 of `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`) names six empirical bullets: snapshot-replay equality, token-cost reduction, choice-surface gate correctness, choice-worthiness enforcement, strong-axis collective difference, ARC_TRACE evidence alignment, HARD-GATE preservation. Each bullet maps to a fixture assertion in this ticket's test matrix.
2. Verified `worlds/animalia/` exists at session-start with no story bundle (per IMPLEMENTATION-ORDER.md Tier 4 plan); `worlds/erotica-world/stories/red-bunny/` exists at session-start but is scheduled for discard at SPEC-22 §Track 5. The capstone test fixture will use a v2-native bundle bootstrapped on a fresh world (e.g., `worlds/animalia/`) per IMPLEMENTATION-ORDER.md Tier 4.
3. Cross-skill boundary: this ticket consumes the entire SPEC-20 + SPEC-22 implementation (validators, patch-engine ops, canonical-vocabularies, sibling-skill alignment). It produces no new skill or tool — the capstone IS the spec's §Verification matrix realized as a fixture-based exercise. The contract under audit is per-§Verification-bullet PASS — each bullet must produce a verifiable assertion against the fixture.
4. FOUNDATIONS All — renumbered from template item 4: this ticket exercises Rule 1 (No Floating Facts via choice-worthiness gate), Rule 5 (No Consequence Evasion via replay-safety + arc-level effect application), Rule 6 (No Silent Retcons via SPEC-20 reassessment audit-trail attribution preserved), Rule 7 (Preserve Mystery via Phase 7.6 Layer 1 forbidden_resolutions check). Each rule maps to a §Verification bullet's assertion surface.
5. HARD-GATE / Mystery Reserve firewall semantics — renumbered from template item 5: HARD-GATE preservation bullet asserts that `authoring` mode fires Phase 10 user-approval per arc-page (not per beat-render — ~5x reduction); Phase 4.5 canon-promotion handoff fires per `canon_candidate` route regardless of mode. Test by running a story-fact promotion through a v2 page-cycle.

## Architecture Check

1. Per §Spec-Integration Ticket Shape, this ticket introduces NO new production code; it exercises the pipeline composed by earlier tickets. A fixture-world copy strategy (using `fs.cpSync` to a temp root, or the equivalent worldloom-side fixture mechanism) keeps the real `worlds/<slug>/` tree untouched so the test never mutates canon.
2. Re-enumerated expected counts (not hardcoded) keep the test valid as canon grows. For example, the choice-worthiness assertion ("0 CHCs with empty `likely_effects` across a 50-page test run") is computed at test start: enumerate the fixture's CHC count; assert that 0 of them have empty `likely_effects` post-Phase-8.
3. Per the §Spec-Integration Ticket Shape, leave the spec's aspirational performance target (token-cost reduction; ~4 LLM calls per arc vs. ~5 per beat × N beats per scene per v1) as a dev-loop expectation rather than a CI gate — performance characterization happens during Tier 4 pilot per IMPLEMENTATION-ORDER.md, not as a hard gate in this capstone.
4. `Deps` = SPEC20SCECOM-009 (transitive head) — the DAG already records the full chain through 009's own `Deps` (which lists 001-008). Per §Spec-Integration Ticket Shape, transitive-head dependency is preferred over enumerating every upstream ticket.
5. No backwards-compatibility aliasing/shims: capstone exercises the v2 pipeline only; v1 test bundle (`worlds/erotica-world/stories/red-bunny/`) is discarded at SPEC-22 §Track 5 before this ticket's test surface lands.

## Verification Layers

1. Snapshot-replay equality at arc cadence → schema validation (SPEC-22's `effect_model_replay_safety` validator); fixture-replay assertion comparing replayed state against on-disk state at every PG record's `state_snapshot`.
2. Token-cost reduction → manual review (descriptive metric, not a CI gate); record measurement in capstone test report for Tier 4 pilot follow-up.
3. Choice-surface gate correctness → skill dry-run on fixtures spanning all execution modes (`authoring` / `interactive_runtime` / `batch_generation`); assert per-mode HARD-GATE fire count matches §Verification bullet 3.
4. Choice-worthiness enforcement → schema validation (SPEC-22's `choice_worthiness_completeness` validator); 0 empty `likely_effects` across 50-page test run (re-enumerated count).
5. Strong-axis collective difference → schema validation (SPEC-22's extended `choice_pair_distance` validator).
6. ARC_TRACE evidence alignment → schema validation (SPEC-22's `arc_trace_evidence_alignment` validator); assertion that every evidence_span resolves within prose byte-range.
7. HARD-GATE preservation → manual review + skill dry-run; assertion that `authoring` mode fires Phase 10 once per arc-page (not per beat-render); Phase 4.5 canon-promotion handoff fires per `canon_candidate` route.

## What to Change

### 1. Test fixture under skill testing surface

Create a v2 story-bundle test fixture (location TBD per skill testing conventions; likely `tools/validators/test/fixtures/spec-20-capstone/` or analogous worldloom test root). The fixture is a v2-native bundle bootstrapped on a fresh world (e.g., `worlds/animalia/` per IMPLEMENTATION-ORDER.md Tier 4) — copied via `fs.cpSync` (or skill testing equivalent) to a temp root before each test run.

### 2. Capstone test assertions (one per §Verification bullet)

Implement assertions in the capstone test matrix:

- **Replay-equality**: replay the chain of chosen choices from genesis on the fixture; resulting state equals on-disk state at every PG record's `state_snapshot`. Beat-internal state need not match (per SPEC-20 §B).
- **Token-cost descriptive metric**: empirically measure LLM call count per scene; compare against v1 baseline (~5 calls per beat × N beats vs. ~4 per arc); record in test report.
- **Choice-surface gate per-mode**: `interactive_runtime` mode auto-chains CONTINUE_ARC + CONTINUE_ONLY_PAUSE pages without Phase 10 pause; NATURAL_COMMITMENT_HINGE + INTERRUPT_HINGE + TERMINAL_OR_CHAPTER_CLOSE pages fire Phase 10 in `authoring` mode. Manual test: a scene whose arcs span 3-4 beats produces 1 user-facing menu in `interactive_runtime`, 1 menu + 1 implicit Continue in `authoring`.
- **Choice-worthiness enforcement**: enumerate CHC count from fixture; assert 0 of them have empty `likely_effects` post-Phase-8.
- **Strong-axis collective difference**: every emitted menu (≥2 CHCs) covers ≥2 distinct `strong_axes`.
- **ARC_TRACE evidence alignment**: every ARC_TRACE has all evidence_spans within prose byte-range; every `effect_evidence` references a real `required_effects` index.
- **HARD-GATE preservation**: `authoring` mode fires Phase 10 once per arc-page (count per fixture); Phase 4.5 canon-promotion handoff fires per `canon_candidate` route. Test by running a story-fact promotion through a v2 page-cycle.

### 3. Test report output

Capstone test produces a structured report listing each §Verification bullet's assertion result (PASS / FAIL with rationale per existing skill discipline — bare PASS without rationale is treated as FAIL).

## Files to Touch

- Test fixture path (locations TBD — per skill testing conventions; this is the implementer's call): likely `tools/validators/test/fixtures/spec-20-capstone/` or analogous (new files)
- Capstone test scaffolding: likely `tools/validators/test/spec-20-capstone.test.ts` or equivalent (new)

The exact locations depend on the worldloom test-runner conventions; the implementer chooses a location consistent with existing `tools/validators/test/` patterns.

## Out of Scope

- Production-code changes: this ticket exercises the pipeline; SPEC20SCECOM-001..-010 (and SPEC-22) own production-code changes.
- New skills, tools, hooks, or validators: none introduced.
- Performance regressions or optimization: performance is a descriptive metric in this capstone; optimization happens in Tier 4 pilot per IMPLEMENTATION-ORDER.md, not in this ticket.
- v1 test bundle migration: `worlds/erotica-world/stories/red-bunny/` is discarded at SPEC-22 §Track 5; this ticket runs against v2-native fixtures only.

## Acceptance Criteria

### Tests That Must Pass

1. Capstone test executes the full §Verification matrix; each of the seven bullet's assertions returns PASS with rationale.
2. Fixture-world copy strategy: the real `worlds/<slug>/` tree is untouched after the capstone test; canon mutation happens only against the temp-root fixture.
3. Re-enumerated counts: CHC count, page count, ARC_TRACE count are computed at test start (not hardcoded); assertions reference the computed values.

### Invariants

1. Every §Verification bullet maps to ≥1 assertion in the capstone test matrix (no bullet silently dropped).
2. The fixture-copy strategy never mutates `worlds/<slug>/` — production canon is invariant under capstone test execution.
3. Token-cost is a descriptive metric, NOT a CI gate (per §Spec-Integration Ticket Shape: "leave the spec's aspirational target as a dev-loop expectation rather than a CI gate").

## Test Plan

### New/Modified Tests

1. `tools/validators/test/spec-20-capstone.test.ts` (or skill-testing equivalent) — capstone test matrix exercising SPEC-20 §Verification bullets. Rationale: per §Spec-Integration Ticket Shape, this is the canonical capstone surface for the spec.

### Commands

1. `pnpm --filter @worldloom/validators test spec-20-capstone` (or equivalent skill-testing command) — runs the capstone test against fixtures; emits per-bullet PASS/FAIL report.
2. `world-validate worlds/<fixture-temp-root>/<bundle> --story <story-slug>` — validates fixture state post-capstone-run against SPEC-22 §Track 2 validators (cross-spec dependency).
3. Token-cost descriptive metric: capstone test log includes per-scene LLM call count; manually inspected during Tier 4 pilot per IMPLEMENTATION-ORDER.md (not asserted as CI gate).
