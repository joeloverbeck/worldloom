# SPEC43PRECAUSTO-013: Turn-Cycle SKILL.md Output Table + Phase 9 Gates 12-15

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-turn-cycle/SKILL.md` (Output table rows for 6 mid-story-introducible classes) + `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (adds Gates 12-15 referencing the 9 new validators from tickets 003-011 + the compatibility-drift validator from ticket 012). No impact on Phase 10 op enumeration (wildcard `create_*_record` already covers all 6 create ops per R-correction-A).
**Deps**: 003, 004, 005, 006, 007, 008, 009, 010, 011

## Problem

SPEC-43 §Approach G + the spec's R-correction-A require turn-cycle skill amendments at TWO surfaces: (a) the SKILL.md Output table rows at lines 113-129 currently frame CLK / STSEC / STQ / THR / STENT / SREL as "(existing record update)" or "(supersession)" only — these rows must be extended to "(new or supersession)" or "(new or lifecycle update)" with IF-clauses covering both fresh creation and lifecycle; (b) phase-9-validation-gates.md must enumerate the 9 new Phase 9 gates that the per-class introduction validators implement, plus the cross-class validators (narrative-shape-field-rejection, introduction-observer-firewall). Per R-correction-A, NO amendment to Phase 10 op enumeration is needed — the wildcard `create_*_record` at SKILL.md:155 already deliberately covers all 6 create ops.

## Assumption Reassessment (2026-05-18)

1. SKILL.md Output table rows for CLK/STSEC/STQ/THR/STENT/SREL at lines 113-129 (verified via brainstorm exploration). The Phase 10 op enumeration at line 155 already uses wildcard `create_*_record` for every changed record class — deliberately covers all 6 create ops; NO amendment to Phase 10 is needed (correction noted per SPEC-43 §Key design decisions).
2. SPEC-43 §Approach G specifies: Output table rows extended from "(existing record update)" / "(supersession)" to "(new or supersession)" or "(new or lifecycle update)" with IF-clauses covering both fresh creation and lifecycle. SPEC-43 §Approach D Table enumerates the 9 new validators (8 ship in Wave 2 per the table; compatibility-drift is the 9th); SPEC-43 §Approach H is explicit that introduction validators are Phase 9 per-commit gates, NOT Phase 2i retrospective audits.
3. Cross-skill boundary under audit: turn-cycle Phase 9 references the validator registry at `tools/validators/src/public/registry.ts`; each new gate's documentation in `phase-9-validation-gates.md` cites the corresponding validator's `name` field. Downstream ticket 014 amends phase-2-3 + phase-4-5 + phase-7 reference files; ticket 015 creates the new `mid-story-record-introduction.md` reference file; ticket 016 amends health-audit SKILL.md for the compatibility mode.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) + §5a (Commitment Blocks Are Causal Moves) restated: Output table amendments make mid-story creation visible as an authoring affordance in the page-plan commit envelope; Phase 9 gates 12-15 enforce that authoring is constrained by SPEC-43's §5c discipline at engine pre-apply time. The plan-authority boundary is preserved — introduction happens in the page-plan + patch envelope, not in rendered prose.
5. HARD-GATE / Canon Safety surface: Phase 9 IS the gating surface where the new validators run per-commit. The change adds 4 new gate descriptions (Gates 12-15) without modifying existing gates 1-11. Does not weaken Mystery Reserve firewall (preserved by `secret_mystery_firewall_compliance` + ticket 005's STSEC introduction validator running independently).

## Architecture Check

1. Cleaner than alternative #1 (amend SKILL.md only, leave phase-9 reference unchanged): the Output table at the top names WHAT records can be produced; the phase-9 reference at the bottom names HOW each is gated. Both must reflect the new mid-story-creation path; only updating one leaves the skill internally inconsistent.
2. Cleaner than alternative #2 (amend Phase 10 op enumeration as the source report originally suggested): per R-correction-A, the wildcard `create_*_record` already covers all 6 create ops — a Phase 10 amendment would be redundant noise. The amendment correctly targets the Output table + Phase 9 gates only.
3. No backwards-compatibility aliasing/shims introduced: the amendments are purely additive to the existing Output table rows and Phase 9 gates list.

## Verification Layers

1. Output table amendment → codebase grep-proof: `grep -nE "CLK-<integer>.*new or|STSEC-<integer>.*new or|STQ-<integer>.*new or|THR-<integer>.*new or|STENT-<integer>.*new or|SREL-<integer>.*new or" .claude/skills/branching-story-turn-cycle/SKILL.md` returns 6 lines (one per class row).
2. Phase 9 gates 12-15 → codebase grep-proof: `grep -nE "^(Gate )?1[2-5]\b" .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` returns the 4 new gates.
3. Phase 10 op enumeration unchanged → codebase grep-proof: `grep -n "create_\*_record" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the existing wildcard line (no new entries added).
4. FOUNDATIONS §4a + §5a alignment → FOUNDATIONS alignment check: amendments preserve the plan-authority boundary (introduction decided in page-plan + patch envelope, not in rendered prose); preserve the causal-move primitive (introduction is the effect of an SLT, not an out-of-band engine event).

## What to Change

### 1. Amend SKILL.md Output table rows (lines ~113-129)

For each of the 6 mid-story-introducible classes, extend the existing row with the "new or" framing:

- `CLK-<integer>` (new or lifecycle update) | `_source/clocks/CLK-<integer>.yaml` | IF the event creates a new staged pressure through `create_clk_record`, OR advances/resolves an active pressure clock through `tick_pressure_clock` / `resolve_pressure_clock`.
- `STSEC-<integer>` (new or lifecycle update) | `_source/secrets/STSEC-<integer>.yaml` | IF hidden truth becomes branch-relevant through `create_stsec_record`, OR an accepted event adds/discovers clue carriers or reveals an existing secret.
- `STQ-<integer>` (new or lifecycle update) | `_source/story-questions/STQ-<integer>.yaml` | IF the event opens a concrete setup/question/promise through `create_stq_record`, OR answers/pays off/abandons an existing open setup.
- `THR-<integer>` (new or supersession) | `_source/threads/THR-<integer>.yaml` | IF a new ongoing causal concern opens, OR an existing thread advances, escalates, resolves, or is abandoned.
- `STENT-<integer>` (new or supersession) | `_source/entities/STENT-<integer>.yaml` | IF a person/group/entity first earns story-local representation through agency, witness role, information-source role, pressure-driving role, choice grounding, or relationship/obligation participation; OR IF identity mirror / role metadata changes. Fresh STENT requires same-event STSTAT.
- `SREL-<integer>` (new or supersession) | `_source/relationships/SREL-<integer>.yaml` | IF an objective branch-local relationship first constrains choices/state, OR an existing relationship changes.

### 2. Add Gates 12-15 to phase-9-validation-gates.md

Append after the existing Gates 1-11:

- **Gate 12: Mid-story introduction grounding** — every newly-created CLK / STSEC / STQ / THR / STENT / SREL satisfies (a) same-event `SE.state_delta.create[]` membership; (b) valid `created_at_page` (equals the new child PG); (c) grounding records active in parent PG OR created same event; (d) parseable `intro:<CLASS>(...)` tag per ticket 001's grammar. Enforced by `midstory_record_introduction_grounding` (ticket 003) + per-class validators (tickets 004-009).
- **Gate 13: Fresh entity status pairing** — every fresh STENT in `SE.state_delta.create[]` has exactly one same-event STSTAT in `state_delta.create[]` whose `entity` field points to the new STENT. Enforced by `entity_introduction_status_pairing` (ticket 008).
- **Gate 14: Relationship participant grounding** — every fresh SREL names active or same-event-created participants AND has non-empty `derived_from[]`. Enforced by `relationship_introduction_grounding_integrity` (ticket 009).
- **Gate 15: Narrative-shape field rejection** — no new CLK / STSEC / THR / SREL / STENT carries prohibited future-shape fields (`expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`). Enforced by `narrative_shape_field_rejection` (ticket 010). Note: STQ has its own pre-existing prohibition at `record_schema_compliance` line 177-193 (unchanged by SPEC-43).

Plus a brief mention of Gate 12 sub-rule: introduction observer firewall (`introduction_observer_firewall` per ticket 011) — Wave 2 scope is explicit-reference access routes only; inferential access deferred Wave 3.

### 3. No changes to Phase 10 op enumeration

Per R-correction-A: the wildcard `create_*_record` at SKILL.md:155 already deliberately covers all 6 create ops (`create_clk_record`, `create_stsec_record`, `create_stq_record`, `create_thr_record`, `create_srel_record`, `create_stent_record`). Document this explicitly in a one-line addendum near the wildcard ("includes `create_clk_record` / `create_stsec_record` / `create_stq_record` / `create_thr_record` / `create_srel_record` / `create_stent_record` for mid-story introduction per SPEC-43 — no separate enumeration needed").

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- Phase 2/3 (commitment + state delta) amendments — handled by ticket 014.
- Phase 4/5 (belief, visibility, new-class state) amendments — handled by ticket 014.
- Phase 7 (page-plan §10b extension) amendments — handled by ticket 014.
- NEW mid-story-record-introduction reference file — handled by ticket 015.
- Health-audit skill amendments — handled by ticket 016.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "CLK-<integer>.*new or|STSEC-<integer>.*new or|STQ-<integer>.*new or|THR-<integer>.*new or|STENT-<integer>.*new or|SREL-<integer>.*new or" .claude/skills/branching-story-turn-cycle/SKILL.md` returns 6 lines.
2. `grep -cE "^(Gate )?1[2-5]\b" .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` returns ≥4.
3. `grep -n "create_clk_record\|create_stsec_record\|create_stq_record" .claude/skills/branching-story-turn-cycle/SKILL.md` returns the new Phase 10 addendum naming the 6 create ops (or returns the existing wildcard line, depending on implementation choice for the addendum format).
4. Skill prose remains internally consistent: every Output table row's IF-clause is reachable through one of the documented Phase 9 gates.

### Invariants

1. Phase 10 op enumeration is NOT modified — the wildcard already covers create ops. Addendum is documentation-only.
2. The 4 new Phase 9 gates are additive — existing Gates 1-11 retain their numbering and semantics.
3. Output table rows preserve the existing schema for non-amendment columns (path, IF-clause format).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The per-validator behavior is tested by tickets 003-012; ticket 013 only updates skill prose to reflect those validators in the Phase 9 gate list + Output table.

### Commands

1. `grep -nE "new or supersession|new or lifecycle update" .claude/skills/branching-story-turn-cycle/SKILL.md` (sanity grep that the 6 rows landed).
2. `grep -nE "Gate 1[2-5]|gate 1[2-5]" .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (sanity grep that the 4 new gates landed).
