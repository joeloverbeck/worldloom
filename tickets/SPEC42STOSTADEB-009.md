# SPEC42STOSTADEB-009: branching-story-turn-cycle Phase 4 + Phase 7 integration for CLK/STSEC/STQ

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `branching-story-turn-cycle` SKILL.md with Phase 4 (state-delta computation) integration for ticking clocks, revealing secrets, and advancing story questions during SE state-delta computation; extends Phase 7 (page-plan rendering) with a new §10b "Open Setups, Active Clocks, Hidden Secrets" per-page-computed section; no new skill phases introduced
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md, archive/tickets/SPEC42STOSTADEB-005.md, archive/tickets/SPEC42STOSTADEB-006.md, archive/tickets/SPEC42STOSTADEB-007.md, SPEC42STOSTADEB-008

## Problem

Once the CLK/STSEC/STQ class foundations land along with their per-class validators (SPEC42STOSTADEB-001 through -008), the turn-cycle skill must be extended to actually USE the new classes during page commits — ticking active clocks based on SE outcomes, revealing secrets when SE.state_delta names them, advancing STQ status transitions, and surfacing the active records in the page plan so the external prose renderer has the necessary context. Without this integration, the new classes exist on disk but the page-cycle never modifies them, defeating the purpose of present-causal pressure tracking, story-local revelation discipline, and open-setup tracking.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/branching-story-turn-cycle/SKILL.md` exists; existing Phase 4 (belief/visibility/witness propagation per `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` per SPEC-42 brainstorm agent reports) handles BEL updates during SE state-delta computation — the new integration extends this Phase to also tick CLK, reveal STSEC, and advance STQ when the SE.state_delta names them. Existing Phase 7 (page-plan rendering) inlines §2 / §3 / §19 verbatim per `.claude/skills/_shared-templates/story-state-contract.md` §8; new §10b is per-page-computed (per SPEC-42 §Risks recommendation), not inlined verbatim.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 1 / Phase 2 / Phase 3 (each phase mentions `branching-story-turn-cycle` tick/reveal/advance integration); §E Phase 4 (Phase 7 plan extension for §10b); §Risks "Phase 4 page-plan section addition" open question (RECOMMENDATION: §10b is per-page-computed, not inlined verbatim) — this ticket implements the per-page-computed recommendation.
3. Cross-skill / cross-tool shared boundary: `branching-story-turn-cycle` is a Skill Category 2c (story-pipeline content-generation) skill per FOUNDATIONS §Story Bundles §7. It depends on (a) the new patch-engine ops from -001 / -002 / -003 (tick_pressure_clock, reveal_story_secret, answer_story_question, abandon_story_question, append_secret_clue_carrier, mark_secret_clue_discovered, resolve_pressure_clock) being available at engine pre-apply; (b) the per-class validators from -005 / -006 / -007 being registered so commits pass; (c) the shared validators from -008 handling the new active_records[] entries; (d) the predicate DSL extensions from -005 / -006 / -007 being available for storylet preconditioning. This ticket DOES NOT extend the shared story-state contract beyond what -001 / -002 / -003 already did; the §10b page-plan section is documented in -014 (cross-class contract doc) but the turn-cycle's USE of §10b is implemented here.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) motivates this ticket: *"Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. A `PG` record is real the moment the patch engine accepts the page-cycle plan; rendered prose is supplied externally and attached later via a prose receipt. Page snapshots are the fork primitive. Any committed page is a valid parent for `branching-story-turn-cycle`, regardless of whether its prose has been rendered. There is no parallel 'did the prose realize the planned arc' state engine — no ARC_TRACE class, no second state-transition pass."* This ticket's Phase 4 integration ensures the new-class state transitions (clock ticks, secret reveals, STQ status changes) commit at page-plan time as part of SE.state_delta — making them authoritative at commit. Phase 7's §10b page-plan section makes the post-commit state visible to the external prose renderer per §4a — the renderer receives the state, does not produce it. SPEC42STOSTADEB-013's prose-attach verification then observes prose-vs-state divergence as receipt observations only, never HARD-REJECTing the commit per §4a's strict prose-is-receipt discipline.

## Architecture Check

1. **Phase 4 extension as one cohesive ticket**: tick / reveal / advance integration is one logical change (during SE state-delta computation, materialize the new-class transitions). Splitting per-class would force three near-identical Phase 4 extensions; bundling keeps the integration reviewable as a unit.
2. **Phase 7 §10b is per-page-computed, not inlined verbatim**: per SPEC-42 §Risks recommendation. The existing §2 / §3 / §19 inlining convention is for content the external LLM renderer has no cross-plan state to compute on; §10b is per-page state (different active CLK/STSEC/STQ per page) — should be computed per-page like §5 (active cast) and §6 (location/affordances).
3. **No new skill phases**: this ticket extends Phase 4 and Phase 7 only. The 8-phase turn-cycle structure is unchanged.
4. **All 8 shared hard gates continue to apply**: the new class transitions land via the same patch-engine envelope as existing transitions; pre-apply validation (per -005 / -006 / -007 / -008) gates them.

## Verification Layers

1. Turn-cycle on an SE that crosses a CLK threshold materializes the threshold's `effects.create[]` / `supersede[]` / `close[]` records in SE.state_delta → skill dry-run + patch-engine commit test
2. Turn-cycle on an SE that reveals a STSEC binds the STSEC.reveal_event and produces SE.state_delta entries for BEL/SF/DA updates derived from STSEC.reveal_records[] → skill dry-run
3. Turn-cycle on an SE that answers a STQ binds the STQ.answer_event and produces SE.state_delta entries for STQ.answer_records[] → skill dry-run
4. Turn-cycle Phase 7 page plan includes §10b "Open Setups, Active Clocks, Hidden Secrets" with current-page-active CLK/STSEC/STQ records (per-page-computed, not inlined verbatim) → skill dry-run + grep-proof against rendered plan
5. Turn-cycle's existing 8 shared hard gates continue to pass on commits involving new-class transitions → integration test (deferred to SPEC42STOSTADEB-015 capstone)

## What to Change

### 1. Phase 4 extension — CLK ticking during SE state-delta computation

Modify `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 4 (or its reference file at `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` if Phase 4 logic is documented there — confirm at edit time). Add a sub-step for tick-clock processing: when SE.state_delta names a CLK record, emit a `tick_pressure_clock` op with `event: SE-<integer>` + `delta` + `cause`. If the tick crosses a CLK.thresholds[].at value, also emit the threshold's `effects.create[]` / `supersede[]` / `close[]` operations as part of the same SE.state_delta.

### 2. Phase 4 extension — STSEC reveal integration with witness propagation

Add a sub-step for secret-reveal processing: when SE.state_delta names a STSEC record with reveal intent (carrier-discovery-flip-flop or explicit `reveal_story_secret`), emit the appropriate op (`mark_secret_clue_discovered` for a single carrier update; `reveal_story_secret` for full reveal). Integrate with existing witness-propagation logic: a STSEC reveal event is a "secrecy/betrayal/deception" event per the existing eight categories (verified in SPEC-42 brainstorm agent reports), so witness propagation MUST fire — derived BEL records for direct/indirect/excluded witnesses are produced.

### 3. Phase 4 extension — STQ advancement during SE state-delta computation

Add a sub-step for STQ advancement: when SE.state_delta resolves a STQ (status transition: open → complicated, open → answered, open → paid_off, open → abandoned, etc.), emit `answer_story_question` or `abandon_story_question` as appropriate. Bind `answer_event` / `abandonment_rationale` per the SE's actor + world_logic_rationale.

### 4. Phase 7 extension — §10b page-plan section

Modify Phase 7 (page-plan rendering — verify exact location at edit time; likely `.claude/skills/branching-story-turn-cycle/references/phase-7-*.md` or in the main SKILL.md). Add a new optional §10b "Open Setups, Active Clocks, Hidden Secrets" section to the comprehensive page plan. The section is **per-page-computed** (not inlined verbatim per SPEC-42 §Risks recommendation): renders the current page's active CLK records (with current value/max + nearest threshold + salience), active STSEC records (with status + holders + carrier discovery count), and active STQ records (with status + salience + audience_visibility). When all three sets are empty, the section may be omitted entirely. Sub-sections render only when relevant content exists (CLK sub-section omitted when no active CLK; etc.).

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 4 sub-step additions; Phase 7 §10b section addition; verify exact line locations at edit time)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify — if Phase 4 logic is in this reference file, extend with tick/reveal/advance sub-steps; otherwise omit and put logic in SKILL.md)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class validators + predicates — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- MCP retrieval surface — owned by archive/tickets/SPEC42STOSTADEB-004.md
- Other skill integrations (bootstrap, commitment-block-authoring, health-audit, prose-attach) — owned by SPEC42STOSTADEB-010 through -013
- Cross-class contract doc updates (story-state-contract.md §5 predicate list, §6 integration matrix, §8 page-plan section) — owned by SPEC42STOSTADEB-014
- CLAUDE.md inventory update — owned by SPEC42STOSTADEB-014

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `branching-story-turn-cycle` on a representative SE that names a CLK record materializes a `tick_pressure_clock` op in the resulting patch plan
2. Skill dry-run: `branching-story-turn-cycle` on a representative SE that reveals a STSEC produces both the `reveal_story_secret` op AND the derived BEL records for witnesses (existing Phase 4 witness propagation integration preserved)
3. Skill dry-run: `branching-story-turn-cycle` on a representative SE that answers a STQ produces `answer_story_question` op with answer_event binding
4. Grep-proof: the rendered page plan for a page with active CLK/STSEC/STQ records contains a §10b section with the per-class sub-sections populated; for a page with NO active CLK/STSEC/STQ records, §10b is omitted entirely (or empty per the optional-section convention)
5. Existing 8 shared hard gates continue to PASS on commits involving new-class transitions — verified at the engine pre-apply layer via the per-class validators (-005 / -006 / -007 / -008)

### Invariants

1. CLK tick logic respects `tick_pressure_clock`'s value-range constraint (per the op's validation; out-of-range deltas are rejected by the engine pre-apply)
2. STSEC reveal logic ALWAYS fires witness propagation (the reveal is a secrecy/betrayal/deception event per the existing eight-category witness firewall)
3. STQ advancement preserves the §5c discipline: no `expected_payoff_mode` is set on the resulting STQ status transition (the schema-level + validator-level §5c defense from -003 + -007 catches any leak)
4. §10b is per-page-computed (different content per page); does NOT inline verbatim like §2 / §3 / §19

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/...` or skill-fixture tests (path depends on existing turn-cycle test structure; confirm at edit time) — new fixture demonstrating CLK tick, STSEC reveal, STQ advance during a single turn cycle
2. Skill-level integration test: turn-cycle on a page-cycle that crosses a CLK threshold; verify the threshold's effects.create[] records land in SE.state_delta

### Commands

1. `npm test --prefix tools/patch-engine` — verifies the turn-cycle's emitted ops pass the patch-engine pre-apply gates
2. `npm test --prefix tools/validators` — verifies the resulting page commits pass validators
3. Skill dry-run (manual or via skill-test harness if available): invoke `branching-story-turn-cycle` on a representative fixture bundle and inspect the produced page plan + patch plan
4. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
