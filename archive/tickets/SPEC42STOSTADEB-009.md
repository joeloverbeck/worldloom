# SPEC42STOSTADEB-009: branching-story-turn-cycle Phase 4 + Phase 7 integration for CLK/STSEC/STQ

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `branching-story-turn-cycle` SKILL.md with Phase 4 (state-delta computation) integration for ticking clocks, revealing secrets, and advancing story questions during SE state-delta computation; extends Phase 7 (page-plan rendering) with a new §10b "Open Setups, Active Clocks, Hidden Secrets" per-page-computed section; no new skill phases introduced
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md, archive/tickets/SPEC42STOSTADEB-005.md, archive/tickets/SPEC42STOSTADEB-006.md, archive/tickets/SPEC42STOSTADEB-007.md, archive/tickets/SPEC42STOSTADEB-008.md

## Problem

At intake, the CLK/STSEC/STQ class foundations had landed along with their per-class validators (SPEC42STOSTADEB-001 through -008), but the turn-cycle skill still needed to use the new classes during page commits — ticking active clocks based on SE outcomes, revealing secrets when SE.state_delta names them, advancing STQ status transitions, and surfacing active records in the page plan so the external prose renderer has the necessary context.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/branching-story-turn-cycle/SKILL.md` exists; existing Phase 4 (belief/visibility/witness propagation per `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` per SPEC-42 brainstorm agent reports) handles BEL updates during SE state-delta computation — the new integration extends this Phase to also tick CLK, reveal STSEC, and advance STQ when the SE.state_delta names them. Existing Phase 7 (page-plan rendering) inlines §2 / §3 / §19 verbatim per `.claude/skills/_shared-templates/story-state-contract.md` §8; new §10b is per-page-computed (per SPEC-42 §Risks recommendation), not inlined verbatim.
2. Spec verified at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 1 / Phase 2 / Phase 3 (each phase mentions `branching-story-turn-cycle` tick/reveal/advance integration); §E Phase 4 (Phase 7 plan extension for §10b); §Risks "Phase 4 page-plan section addition" open question (RECOMMENDATION: §10b is per-page-computed, not inlined verbatim) — this ticket implements the per-page-computed recommendation.
3. Cross-skill / cross-tool shared boundary: `branching-story-turn-cycle` is a Skill Category 2c (story-pipeline content-generation) skill per FOUNDATIONS §Story Bundles §7. It depends on (a) the new patch-engine ops from -001 / -002 / -003 (tick_pressure_clock, reveal_story_secret, answer_story_question, abandon_story_question, append_secret_clue_carrier, mark_secret_clue_discovered, resolve_pressure_clock) being available at engine pre-apply; (b) the per-class validators from -005 / -006 / -007 being registered so commits pass; (c) the shared validators from -008 handling the new active_records[] entries; (d) the predicate DSL extensions from -005 / -006 / -007 being available for storylet preconditioning. This ticket DOES NOT extend the shared story-state contract beyond what -001 / -002 / -003 already did; the §10b page-plan section is documented in -014 (cross-class contract doc) but the turn-cycle's USE of §10b is implemented here.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) motivates this ticket: *"Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. A `PG` record is real the moment the patch engine accepts the page-cycle plan; rendered prose is supplied externally and attached later via a prose receipt. Page snapshots are the fork primitive. Any committed page is a valid parent for `branching-story-turn-cycle`, regardless of whether its prose has been rendered. There is no parallel 'did the prose realize the planned arc' state engine — no ARC_TRACE class, no second state-transition pass."* This ticket's Phase 4 integration ensures the new-class state transitions (clock ticks, secret reveals, STQ status changes) commit at page-plan time as part of SE.state_delta — making them authoritative at commit. Phase 7's §10b page-plan section makes the post-commit state visible to the external prose renderer per §4a — the renderer receives the state, does not produce it. SPEC42STOSTADEB-013's prose-attach verification then observes prose-vs-state divergence as receipt observations only, never HARD-REJECTing the commit per §4a's strict prose-is-receipt discipline.
5. Live reassessment on 2026-05-18 found the Phase 4 and Phase 7 details live in `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` and `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, with `SKILL.md` acting as the phase router and output inventory. The owned implementation therefore updates all three skill surfaces.
6. HARD-GATE discipline was read on 2026-05-18 because this is a content-generating story skill with a `<HARD-GATE>` block. The landed edits do not change approval timing, write order, PASS/FAIL criteria, approval-token behavior, or submit/validate semantics; they add in-memory state-delta and page-plan guidance before the existing Phase 9 / Phase 10 gates.
7. The drafted skill dry-run / representative fixture harness was not present as an executable repo command. Verification was narrowed to manual contract review plus grep-proof over the edited skill surfaces and active spec. Package-level patch-engine and validator tests for the underlying ops remain owned by the archived foundation/validator tickets and the capstone ticket.

## Architecture Check

1. **Phase 4 extension as one cohesive ticket**: tick / reveal / advance integration is one logical change (during SE state-delta computation, materialize the new-class transitions). Splitting per-class would force three near-identical Phase 4 extensions; bundling keeps the integration reviewable as a unit.
2. **Phase 7 §10b is per-page-computed, not inlined verbatim**: per SPEC-42 §Risks recommendation. The existing §2 / §3 / §19 inlining convention is for content the external LLM renderer has no cross-plan state to compute on; §10b is per-page state (different active CLK/STSEC/STQ per page) — should be computed per-page like §5 (active cast) and §6 (location/affordances).
3. **No new skill phases**: this ticket extends Phase 4 and Phase 7 only. The 8-phase turn-cycle structure is unchanged.
4. **All 8 shared hard gates continue to apply**: the new class transitions land via the same patch-engine envelope as existing transitions; pre-apply validation (per -005 / -006 / -007 / -008) gates them.

## Verification Layers

1. Turn-cycle Phase 4 instructs authors to materialize CLK threshold `effects.create[]` / `supersede[]` / `close[]` records in the same `SE.state_delta` after `tick_pressure_clock` → manual contract review + grep-proof over `phase-4-5-belief-and-mystery.md`
2. Turn-cycle Phase 4 instructs authors to bind STSEC reveal through `reveal_story_secret` and mandatory witness `BEL` propagation → manual contract review + grep-proof over `phase-4-5-belief-and-mystery.md`
3. Turn-cycle Phase 4 instructs authors to advance STQ through `answer_story_question` / `abandon_story_question` while preserving §5c prohibited-field discipline → manual contract review + grep-proof over `phase-4-5-belief-and-mystery.md`
4. Turn-cycle Phase 7 page plan includes optional §10b "Open Setups, Active Clocks, Hidden Secrets" with current-page-active CLK/STSEC/STQ records, per-page-computed and omitted when empty → manual contract review + grep-proof over `phase-7-page-plan.md`
5. Turn-cycle's existing 8 shared hard gates continue to apply unchanged to commits involving new-class transitions → manual review of `SKILL.md`, `docs/HARD-GATE-DISCIPLINE.md`, and `.claude/skills/_shared-templates/story-state-contract.md`

## Landed Changes

### 1. Phase 4 extension — CLK ticking during SE state-delta computation

`.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` now instructs Phase 4 to emit `tick_pressure_clock` / `resolve_pressure_clock`, carry `event`, `delta`, and `cause`, and materialize crossed threshold effects into the same `SE.state_delta` after Phase 2 alias resolution.

### 2. Phase 4 extension — STSEC reveal integration with witness propagation

`.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` now instructs Phase 4 to emit `mark_secret_clue_discovered` or `reveal_story_secret` as appropriate and treats STSEC reveal as a secrecy / betrayal / deception event that requires the existing witness propagation discipline.

### 3. Phase 4 extension — STQ advancement during SE state-delta computation

`.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` now instructs Phase 4 to emit `answer_story_question` or `abandon_story_question`, bind `answer_event` or `abandonment_rationale`, and preserve the STQ §5c prohibited-field boundary.

### 4. Phase 7 extension — §10b page-plan section

`.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` now adds optional §10b "Open Setups, Active Clocks, Hidden Secrets", computed per page from post-delta active CLK/STSEC/STQ records and omitted when empty. `.claude/skills/branching-story-turn-cycle/SKILL.md` now routes Phase 7 to that §10b guidance and names the new-class operations in the output and patch-plan inventories.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — output inventory, process flow, phase router, and patch-plan operation inventory)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify — Phase 4 CLK/STSEC/STQ state-transition guidance)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify — Phase 7 optional §10b page-plan guidance)
- `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` (modify — same-seam spec wording corrected from "inlined" §10b to per-page-computed §10b)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class validators + predicates — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by archive/tickets/SPEC42STOSTADEB-008.md
- MCP retrieval surface — owned by archive/tickets/SPEC42STOSTADEB-004.md
- Other skill integrations (bootstrap, commitment-block-authoring, health-audit, prose-attach) — owned by SPEC42STOSTADEB-010 through -013
- Cross-class contract doc updates (story-state-contract.md §5 predicate list and §8 page-plan section) — landed in archive/tickets/SPEC42STOSTADEB-014.md
- CLAUDE.md inventory update — landed in archive/tickets/SPEC42STOSTADEB-014.md

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: Phase 4 references `tick_pressure_clock`, `resolve_pressure_clock`, threshold effects, and `SE.state_delta`.
2. Grep-proof: Phase 4 references `mark_secret_clue_discovered`, `reveal_story_secret`, and mandatory witness `BEL` propagation for STSEC reveals.
3. Grep-proof: Phase 4 references `answer_story_question`, `abandon_story_question`, and the STQ prohibited-field boundary.
4. Grep-proof: Phase 7 references §10b "Open Setups, Active Clocks, Hidden Secrets", active CLK/STSEC/STQ records, and empty-section omission.
5. Manual review: existing 8 shared hard gates and Phase 10 approval / submit flow are preserved unchanged; capstone integration remains owned by SPEC42STOSTADEB-015.

### Invariants

1. CLK tick logic respects `tick_pressure_clock`'s value-range constraint (per the op's validation; out-of-range deltas are rejected by the engine pre-apply)
2. STSEC reveal logic ALWAYS fires witness propagation (the reveal is a secrecy/betrayal/deception event per the existing eight-category witness firewall)
3. STQ advancement preserves the §5c discipline: no `expected_payoff_mode` is set on the resulting STQ status transition (the schema-level + validator-level §5c defense from -003 + -007 catches any leak)
4. §10b is per-page-computed (different content per page); does NOT inline verbatim like §2 / §3 / §19

## Test Plan

### New/Modified Tests

1. None — skill-prose integration ticket; no executable turn-cycle dry-run harness or skill-fixture test structure is present in this repo.

### Commands

1. `rg -n 'tick_pressure_clock|resolve_pressure_clock|threshold.*effects|SE.state_delta|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question|expected_payoff_mode|Open Setups, Active Clocks, Hidden Secrets|omit §10b' .claude/skills/branching-story-turn-cycle`
2. `if rg -n 'inlined into the comprehensive plan' archive/specs/SPEC-42-story-state-debt-secret-clock-records.md .claude/skills/branching-story-turn-cycle; then exit 1; fi`
3. `rg -n 'computed per page|per-page-computed|§10b' archive/specs/SPEC-42-story-state-debt-secret-clock-records.md archive/tickets/SPEC42STOSTADEB-009.md .claude/skills/branching-story-turn-cycle`
4. `git diff --check -- .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md archive/specs/SPEC-42-story-state-debt-secret-clock-records.md archive/tickets/SPEC42STOSTADEB-009.md`
5. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone.

## Outcome

Completed on 2026-05-18.

The turn-cycle skill now recognizes CLK/STSEC/STQ as page-cycle state surfaces: its output inventory names the classes, Phase 4 applies the new-class state transitions before belief propagation, Phase 10 lists the new patch-engine ops, and Phase 7 can emit a per-page §10b "Open Setups, Active Clocks, Hidden Secrets" section for active CLK/STSEC/STQ records. The spec's same-seam wording was corrected so §10b is per-page-computed, matching the risk recommendation.

## Verification Result

1. `rg -n 'tick_pressure_clock|resolve_pressure_clock|threshold.*effects|SE.state_delta|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question|expected_payoff_mode|Open Setups, Active Clocks, Hidden Secrets|omit §10b' .claude/skills/branching-story-turn-cycle` — passed; found the expected Phase 4 and Phase 7 guidance.
2. `if rg -n 'inlined into the comprehensive plan' archive/specs/SPEC-42-story-state-debt-secret-clock-records.md .claude/skills/branching-story-turn-cycle; then exit 1; fi` — passed; the old conflicting active-spec wording is gone from current operational surfaces.
3. `rg -n 'computed per page|per-page-computed|§10b' archive/specs/SPEC-42-story-state-debt-secret-clock-records.md archive/tickets/SPEC42STOSTADEB-009.md .claude/skills/branching-story-turn-cycle` — passed; current surfaces describe §10b as per-page-computed.
4. `git diff --check -- .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md archive/specs/SPEC-42-story-state-debt-secret-clock-records.md archive/tickets/SPEC42STOSTADEB-009.md` — passed.

## Deviations

- The drafted skill dry-run and representative fixture proof were replaced with manual contract review plus grep-proof because the repo does not expose an executable `branching-story-turn-cycle` dry-run harness. SPEC42STOSTADEB-015 remains the capstone owner for full-pipeline integration proof.
- The active spec received a narrow same-seam correction from "§10b inlined into the comprehensive plan" to "§10b computed per page"; this matches the spec's own Risks recommendation and the landed skill behavior.
