# STOTURNCYC-007: Document the `eligibility_background_only` rationale marker for CHC.likely_state_pressure in Phase 7

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — skill-prose-only update to `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (and optionally a one-line nudge in SKILL.md Phase 7)
**Deps**: None

## Problem

The validator `chc_slt_selected_commitment_trace` (at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:17,243,540`) recognizes a load-bearing author marker `eligibility_background_only: <reason>` inside CHC `likely_state_pressure` prose: when the selected resolving SLT's predicate bindings overlap the CHC's `grounded_in.records[]` only in class (not exact id), the validator emits a `weak_incidental_grounding` warn whose `suggested_fix` instructs the author to "add an `eligibility_background_only` rationale to `likely_state_pressure`"; when the CHC grounds in zero selecting-predicate records, the validator escalates to `missing_eligibility_source` (FAIL) and the same `eligibility_background_only` marker is the canonical escape valve. The marker is real, validator-consumed, and the difference between a clean validation pass and an unresolved warn (or a hard fail in the missing-source case). But it is undocumented in skill prose: `grep -rn eligibility_background_only .claude/skills/branching-story-turn-cycle/` returns zero matches across `SKILL.md` and all 11 reference files. Authors cannot use an escape valve they do not know exists.

This session's PG-7→PG-8 commit surfaced the warn on parent CHC-33 because SLT-21's existential-predicate bindings (SREL-6, STINT-2, BEL-15) did not exact-id match CHC-33's grounded_in (SREL-2, STINT-4, …) — same SREL and STINT classes, different ids. The parent emission (by an earlier `branching-story-turn-cycle` run) could not have anticipated which SLT would later resolve CHC-33, so an `eligibility_background_only: emitted_pre_resolution_class_match_only` marker would have correctly told the validator "yes, this is incidental class-grounding, not load-bearing predicate-grounding, and that is intended." Without the marker documented, every future cross-turn emission risks the same warn.

## Assumption Reassessment (2026-05-30)

1. Validator source-of-truth: `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:17` declares `BACKGROUND_MARKER = /eligibility_background_only\s*:\s*([^.;\n]+)/i`; line 243 emits `weak_incidental_grounding` (warn) and line 245 emits `missing_eligibility_source` (FAIL) — both code paths suppress when the marker matches the regex inside `CHC.likely_state_pressure`. Line 540's `suggested_fix` prose instructs authors to author the marker. The marker is verified present at HEAD.
2. Skill-prose gap confirmed: `grep -rn eligibility_background_only .claude/skills/branching-story-turn-cycle/` returns zero matches across `SKILL.md` and all 11 reference files (`pre-flight-and-prerequisites.md`, `phase-1-action-resolution.md`, `phase-2-3-commitment-and-state-delta.md`, `phase-4-5-belief-and-mystery.md`, `phase-6-page-snapshot.md`, `phase-7-page-plan.md`, `phase-8-choice-generation.md`, `phase-9-validation-gates.md`, `governance-and-foundations.md`, `append-only-state-lifecycle.md`, `mid-story-record-introduction.md`).
3. Cross-skill audit: the only consumer of the marker is `chc_slt_selected_commitment_trace.ts`; no other validator, hook, or pipeline consumer needs to know about the marker. The fix is bounded to `branching-story-turn-cycle`'s prose for the Phase 7 CHC-emission step. `branching-story-bootstrap` does not emit CHCs through this path at first glance, but a follow-up check during implementation should confirm — and if it does emit, the same prose update should land there in a sibling ticket (out of scope here).
4. FOUNDATIONS principle under audit: §Tooling Recommendation ("the skill prose is the operational contract") and Rule 6 (No Silent Retcons) — a validator-enforced author affordance that the skill prose does not document is a silent contract gap. Closing the gap is purely additive.

## Architecture Check

1. The cleanest fix is to add a focused "Eligibility grounding and the `eligibility_background_only` rationale marker" subsection to `references/phase-8-choice-generation.md`. The reference is already the canonical home for CHC field discipline (grounding, observer firewall, choice-set noncollapse), so adding the marker contract here keeps the documentation graph cohesive.
2. A one-sentence cross-reference in SKILL.md Phase 7 (or in the existing Phase 7 sentence about grounding) is optional but cheap: it makes the marker discoverable from the inline SKILL.md without forcing every reader into the reference doc.
3. No backwards-compatibility shims — purely additive prose. No schema change, no validator change.

## Verification Layers

1. Marker exists and is consumed by the validator at HEAD → codebase grep-proof: `grep -n eligibility_background_only tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns the three existing match sites (line 17 declaration, line 243 warn-suppression site, line 540 suggested-fix prose). No code change required.
2. Post-fix skill prose documents the marker → codebase grep-proof: `grep -rn eligibility_background_only .claude/skills/branching-story-turn-cycle/` returns at least one match in `references/phase-8-choice-generation.md` (and optionally one in `SKILL.md`).
3. Documented marker contract matches the validator regex shape → manual review: the documented form must be `eligibility_background_only: <natural-language reason>` (free-form reason, terminator one of `.`, `;`, or newline), exactly matching `BACKGROUND_MARKER = /eligibility_background_only\s*:\s*([^.;\n]+)/i`. A worked example must show the marker inside `CHC.likely_state_pressure` prose, not as a separate YAML key.
4. The documented contract explains BOTH the warn case (`weak_incidental_grounding`: same class, different id) AND the fail case (`missing_eligibility_source`: no selecting-predicate record in CHC.grounded_in.records at all), so authors know when the marker is the right tool vs when the cleaner fix is to add the exact predicate record to `grounded_in.records[]` instead → manual review against the two validator code paths.

## What to Change

### 1. Add a "Eligibility grounding and the `eligibility_background_only` rationale marker" subsection to `references/phase-8-choice-generation.md`

Append a focused subsection after the existing "Information / Observer Firewall" prose. The subsection must cover:

- The validator `chc_slt_selected_commitment_trace` checks whether a resolved CHC's `grounded_in.records[]` overlaps with the selecting SLT's predicate-binding records (exact id, not just class). Two failure modes:
  - `weak_incidental_grounding` (warn): same record class is present in both sets, but no exact id matches. Typical at cross-turn emission, where the parent skill could not anticipate which SLT would later resolve the CHC.
  - `missing_eligibility_source` (FAIL): no selecting-predicate record is grounded at all, AND no rationale marker is present.
- The escape valve: when the author intends the grounding to be incidental rather than load-bearing — typically because the SLT that resolves this CHC is not yet known at emission time, or because the selecting predicates are all existentials that bind to records the emission could not pre-commit to — add an `eligibility_background_only: <natural-language reason>` rationale inside the CHC's `likely_state_pressure` prose (NOT as a separate YAML key; the regex scans the existing free-form `likely_state_pressure` string).
- A worked example: a CHC emitted at PG-N that grounds in `SREL-2` (the canonical power-imbalance axis) but is later resolved by an SLT whose existential predicate binds `SREL-6` (a fear axis) at PG-N+1; the parent skill adds `eligibility_background_only: emitted at PG-N before the resolving SLT's existential bindings were known; the SREL grounding is canonical-axis context, not exact-binding load-bearing` to the CHC's `likely_state_pressure`. After the marker lands, the validator suppresses the warn.
- The marker form must match the validator regex `BACKGROUND_MARKER = /eligibility_background_only\s*:\s*([^.;\n]+)/i` — case-insensitive, requires a colon, captures up to the next `.`, `;`, or newline. Cite the validator source at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:17` so authors can grep to verify the contract.
- The marker is not a replacement for genuine load-bearing grounding. When the resolving SLT IS predictable at emission time (a same-turn CHC where the SLT is already selected, or a JIT-block-driven emission), prefer adding the exact selecting predicate records to `grounded_in.records[]` directly — that path produces a stronger CHC-to-SLT trace than the marker does.

### 2. Optional cross-reference in `SKILL.md` Phase 7

Add a single sentence to the existing Phase 7 paragraph in SKILL.md instructing authors that when emission cannot anticipate the resolving SLT's exact predicate bindings, the canonical recourse is the `eligibility_background_only` rationale marker documented in `references/phase-8-choice-generation.md`. Keep it terse — the full contract belongs in the reference.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify — append subsection)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — optional one-sentence cross-reference)

## Out of Scope

- Any change to `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (the validator is correct; the gap is in skill prose).
- Any change to the CHC schema (`story-choice.schema.json`).
- Changing the ranking criteria in `references/phase-2-3-commitment-and-state-delta.md` to weight CHC.grounded_in ↔ SLT.bindings overlap (a separate determinism question; rejected at this retrospective's Phase 4 as folded into the marker-documentation fix — once authors can mark incidental grounding explicitly, the ranking-criteria gap is addressed).
- Documenting the marker in `branching-story-bootstrap` (would be a sibling skill ticket if that skill ever emits CHCs through this path; out of scope here).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn eligibility_background_only .claude/skills/branching-story-turn-cycle/` returns at least one match in `references/phase-8-choice-generation.md` after the edit.
2. The documented marker form in the reference matches the validator regex `BACKGROUND_MARKER = /eligibility_background_only\s*:\s*([^.;\n]+)/i` (case-insensitive, colon-separated, free-form reason).
3. The reference documents both validator failure modes (`weak_incidental_grounding` warn AND `missing_eligibility_source` fail) and explains when the marker is the right tool vs when adding an exact selecting-predicate record to `grounded_in.records[]` is the cleaner fix.

### Invariants

1. The marker contract documented in skill prose remains byte-aligned with `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (any future regex change to `BACKGROUND_MARKER` invalidates the documented form and requires the reference to update).
2. The reference does not propose the marker as a YAML schema field on CHC — it is a free-form prose marker inside `likely_state_pressure`, consumed by regex.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` already exercises both validator paths.

### Commands

1. `grep -rn eligibility_background_only .claude/skills/branching-story-turn-cycle/` (must return at least one match in `phase-8-choice-generation.md` after the edit).
2. `grep -n BACKGROUND_MARKER tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (must return the line 17 declaration; the documented prose must mirror this regex shape).
3. `grep -n 'weak_incidental_grounding\|missing_eligibility_source' tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (must return both verdict codes; the documented prose must explain both).
