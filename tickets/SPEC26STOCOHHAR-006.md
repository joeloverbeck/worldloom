# SPEC26STOCOHHAR-006: Add expected-witness discipline to turn-cycle and health-audit

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-turn-cycle` and `branching-story-health-audit` skill prose. No schema, MCP, or validator change.
**Deps**: None

## Problem

`branching-story-turn-cycle` Phase 4 is *mandatory* for events involving secrecy / betrayal / deception / violence / law / status / public ritual, and Phase 9 additional check 3 "verifies coverage" — but there is no *expected-witness computation*. "Coverage" can therefore only mean "some `BEL` records were drafted", not "every entity who would witness this is accounted for". SPEC-26 D5 strengthens the discipline: compute the expected witness groups, then require a `BEL` record or an explicit non-propagation rationale for each.

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `branching-story-turn-cycle/SKILL.md` Phase 4 (`:250`–`:261`) instructs drafting `BEL` records for public/witnessed/hidden/deceptive events and is "mandatory for any action involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual"; `:261` states "Phase 9 turn-cycle-additional check 3 verifies coverage". Phase 9 additional check 3 is "belief/visibility coverage" (confirmed at `:43`, `:342`). `branching-story-health-audit/SKILL.md` Phase 2d is "Belief / visibility health (per FOUNDATIONS §Story Bundles §6a)" (`:180`).
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D5: the expected-witness computation runs over `STSTAT.location`, event targets, active `BEL`, and active `DA` / `STOBJ` evidence — all post-SPEC-25 existing state, so **no schema change**. Witness groups: **direct** (active `STENT` at the event location per active `STSTAT`, with `agency` not unconscious/dead/incapacitated), **indirect** (public/factional holders when the event occurs through law, ritual, bureaucracy, artifact circulation, public violence, or visible environmental change), **excluded** (`STENT` concealed/offstage/unconscious/socially-barred/lacking-access). Each relevant group requires a created/superseded `BEL` (`knows`/`suspects`/`misremembers`/`reports`/`deceives`) OR an explicit non-propagation rationale (no witness / witness incapacitated / evidence concealed / institution suppresses report / event leaves no accessible trace).
3. Cross-skill / cross-artifact boundary under audit: the belief-propagation invariant shared between `branching-story-turn-cycle` Phase 4 (the computation + drafting), Phase 9 additional check 3 (turn-time coverage enforcement), and `branching-story-health-audit` Phase 2d (audit-time replay enforcement). All three consume the same already-landed substrate (`STSTAT`, `BEL`, `DA`, `STOBJ`); the expected-witness definition must be stated once and referenced consistently so turn-time and audit-time verdicts agree.
4. FOUNDATIONS principle under audit: §Story Bundles §6a (Belief vs. Fact) — `SF` records what is true; `BEL` records what a holder believes/witnesses/suspects/denies. The witness firewall depends on `BEL` records being *complete*, not merely *present*: a witnessed event with no `BEL` for a conscious bystander leaves a silent knowledge gap that breaks the lies/secrets/betrayals coherence §6a exists to protect. The strengthened check makes "coverage" mean structural completeness.
5. HARD-GATE / gate-validation surface (per `tickets/README.md` check 9): this ticket strengthens `branching-story-turn-cycle` Phase 9 additional check 3 — a check in the validation phase preceding the Phase 10 HARD-GATE — and adds to health-audit Phase 2d. Confirmed: the expected-witness pass concerns `BEL` completeness only; it does not touch gate 3 (the mystery/invariant firewall), does not resolve any `forbidden`-status mystery, and does not reorder the 8 shared hard gates. The Mystery Reserve firewall and HARD-GATE semantics are unchanged.

## Architecture Check

1. Deterministic validation over existing state (`STSTAT.location`, event targets, active `BEL`/`DA`/`STOBJ`) is cleaner than the rejected alternative — a new `SE.perception` schema block: the computation is fully derivable from landed state, so adding a schema field would violate §Story Bundles §5b schema-minimalism. The report itself recommends this restraint.
2. No backwards-compatibility aliasing or shims — Phase 4 and check 3 are strengthened in place; no parallel old/new coverage path is kept.

## Verification Layers

1. The expected-witness computation is defined in Phase 4 -> codebase grep-proof: `expected_witnesses` (direct/indirect/excluded groups) appears in `branching-story-turn-cycle/SKILL.md` Phase 4 with the per-group `BEL`-or-non-propagation-rationale requirement.
2. Phase 9 check 3 enforces completeness, not mere presence -> codebase grep-proof: Phase 9 additional check 3 prose verifies every expected witness group is accounted for, replacing "some `BEL` records exist".
3. The health audit catches an uncovered witness on replay -> skill dry-run: a fixture event of public violence at a location with an active, conscious bystander `STENT` and no `BEL` for that entity raises the Phase 2d expected-witness-completeness finding; the same event with an explicit "evidence concealed" non-propagation rationale passes.
4. (Single-layer not applicable — this is a cross-skill ticket; the three layers map the computation invariant, the turn-time-enforcement invariant, and the audit-time-replay invariant to distinct proof surfaces.)

## What to Change

### 1. turn-cycle Phase 4 — compute expected_witnesses

In `branching-story-turn-cycle/SKILL.md` Phase 4, before drafting `BEL` records, compute the `expected_witnesses` groups (direct / indirect / excluded) per Assumption Reassessment item 2, then require for each relevant group either a created/superseded `BEL` or an explicit non-propagation rationale from the named closed set.

### 2. turn-cycle Phase 9 — strengthen additional check 3

Strengthen Phase 9 additional check 3 ("belief/visibility coverage") to verify that every expected witness group is accounted for by a `BEL` or a recorded non-propagation rationale — not merely that some `BEL` records were drafted.

### 3. health-audit Phase 2d — expected-witness-completeness check

In `branching-story-health-audit/SKILL.md` Phase 2d, add an expected-witness-completeness check: flag events involving secrecy / betrayal / deception / violence / law / status / public ritual whose computed witness groups are not covered by a `BEL` or a recorded non-propagation rationale.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Any schema, MCP, patch-engine, or validator change — `SE.perception` is explicitly rejected (SPEC-26 §Out of Scope; §5b schema-minimalism); the computation uses only landed `STSTAT`/`BEL`/`DA`/`STOBJ` state.
- A full autonomous perception simulator (explicitly out of scope per SPEC-26 / the source report).
- The schema-reference prose reconciliation (SPEC26STOCOHHAR-001) and the causal-dependency threat scan (SPEC26STOCOHHAR-005) in the same two files — disjoint sections, separate tickets.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'expected_witnesses\|non-propagation rationale' .claude/skills/branching-story-turn-cycle/SKILL.md` returns the Phase 4 computation and the per-group requirement.
2. `grep -n 'expected-witness\|expected witness' .claude/skills/branching-story-health-audit/SKILL.md` returns the Phase 2d completeness check.
3. Skill dry-run: a fixture public-violence event with a conscious bystander `STENT` and no `BEL` for that entity raises the Phase 2d finding; adding an explicit non-propagation rationale clears it.

### Invariants

1. "Belief/visibility coverage" means structural completeness — every computed expected witness group has a `BEL` record or an explicit non-propagation rationale; mere `BEL`-record presence is no longer sufficient.
2. The expected-witness definition is stated consistently across turn-cycle Phase 4, turn-cycle Phase 9 check 3, and health-audit Phase 2d — turn-time and audit-time verdicts cannot diverge.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The discipline is skill-prose deterministic validation matching health-audit Phase 2's existing skill-prose architecture; verification is grep-proof + skill dry-run.

### Commands

1. `grep -rnE 'expected_witnesses|expected-witness|non-propagation rationale' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
2. `grep -n 'belief/visibility coverage' .claude/skills/branching-story-turn-cycle/SKILL.md` (confirms Phase 9 check 3 prose was strengthened)
3. A grep-plus-dry-run boundary is correct: the discipline is skill-prose with no machine-layer surface — there is no validator binary to invoke, mirroring how Phase 2d itself is verified.
