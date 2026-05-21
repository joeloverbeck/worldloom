# SPEC62FOUANDDOC-005: diegetic-artifact-generation — DA-claims prose precision fix

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/diegetic-artifact-generation/SKILL.md` prose (≈lines 106, 178); no schema, firewall, or code change.
**Deps**: None

## Problem

At intake, `diegetic-artifact-generation/SKILL.md` said a DA's claims were "contested canon (FOUNDATIONS §Canon Layers) at their strongest." This conflated a DA's raw in-world assertions with the **accepted** Contested Canon layer (`status: contested_canon` on a CF). The completed change replaces that wording with an in-world-assertions distinction without touching the `claim_map.canon_status` field or the Phase 7 firewall.

## Assumption Reassessment (2026-05-21)

1. At intake, `.claude/skills/diegetic-artifact-generation/SKILL.md` contained 2 "contested canon" prose sites (≈line 106: "The artifact's claims are *contested canon* (FOUNDATIONS §Canon Layers) at their strongest"; ≈line 178: "The artifact is contested canon — an in-world voice, not world-level truth"). The completed edit replaced both with in-world-assertions wording. The `claim_map.canon_status` enum (`canonically_true | canonically_false | partially_true | contested | mystery_adjacent | prohibited_for_this_artifact`) lives in `templates/diegetic-artifact.md:82` and the phase references — it never uses `contested_canon`, so the field name is already precise and is NOT renamed.
2. SPEC-62 §2.6 (lines 136–151) is the source deliverable; triage R2 explicitly **rejects** the report's `canon_status` → `claim_relation_to_canon` rename (premise refuted; name precise; Phase 7 firewall already prevents claim→canon laundering). Only the two prose sites are imprecise.
3. Single-skill ticket; the boundary under audit is the SKILL.md prose ↔ the `claim_map.canon_status` field + the Phase 7 diegetic-to-world firewall — the fix must sharpen the prose WITHOUT implying any field rename or firewall change (both are explicitly preserved).
4. FOUNDATIONS principle restated: §Canon Layers — Contested Canon is "claims present in-world but not world-level truth," and (per the accepted-layer reading) a CF carrying `status: contested_canon` is accepted canon ABOUT a disputed claim. A DA's raw assertions are neither: they are in-world assertions that become world truth only if a later `canon-addition` accepts a CF about their existence, circulation, belief, disputed status, or truth. The fix aligns the prose with this layer distinction.

## Architecture Check

1. Correcting only the prose (not the field or firewall) is the minimal change that fixes the conflation — the field name is already precise and the Phase 7 firewall already enforces the non-laundering the prose was loosely gesturing at.
2. No backwards-compatibility aliasing/shims — prose replacement in place; no field, enum, or phase renamed.

## Verification Layers

1. Neither prose site still equates DA claims with the accepted Contested Canon layer "at their strongest" → codebase grep-proof (`grep -n "contested canon\|in-world assertion" SKILL.md` returns only the corrected in-world-assertions wording).
2. The `claim_map.canon_status` enum is unchanged (still `canonically_true | … | prohibited_for_this_artifact`, no `contested_canon`) → codebase grep-proof against `templates/diegetic-artifact.md`.
3. The Phase 7 diegetic-to-world firewall is unchanged → manual review / grep-proof of the Phase 7 section.
4. The corrected prose matches the §Canon Layers distinction → FOUNDATIONS alignment check.

## Landed Changes

### 1. Replace the imprecise "contested canon at their strongest" prose (≈lines 106, 178)

Replaced both sites with precise wording: a DA's claims are **in-world assertions**, not canon; the artifact may exist as a world artifact and may cite or distort accepted CFs, but its statements become world truth only if a later `canon-addition` accepts a CF about their existence, circulation, belief, disputed status, or truth.

## Files to Touch

- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify)

## Out of Scope

- The `claim_map.canon_status` field and its enum — the rename is rejected (R2); the field name is already precise and is NOT changed.
- The Phase 7 diegetic-to-world firewall logic — unchanged.
- `templates/diegetic-artifact.md` and any reference file — the imprecision is only in the SKILL.md prose at the two named sites.
- Any FOUNDATIONS edit (§Canon Layers is referenced, not modified).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "contested canon\|in-world assertion" .claude/skills/diegetic-artifact-generation/SKILL.md` returns only the corrected in-world-assertions wording; no remaining "contested canon" or "at their strongest"-style equation of DA claims with the accepted Contested Canon layer remains in `SKILL.md`.
2. `grep -n "canon_status" .claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` confirms the enum is unchanged (still includes `contested`, never `contested_canon`; no field rename).
3. The Phase 7 firewall section is unchanged — `grep -n "Phase 7" .claude/skills/diegetic-artifact-generation/SKILL.md` plus a read confirms no firewall edit.

### Invariants

1. No field, enum value, or phase is renamed or removed — the change is prose-only at two sites.
2. The corrected prose preserves the diegetic-to-world firewall's intent: DA claims become world truth only via a subsequent `canon-addition` CF acceptance.

## Test Plan

### New/Modified Tests

1. `None — documentation-only (skill prose) ticket; verification is grep-based and the skill's own Phase 7/8 self-validation covers behavior at invocation time.`

### Commands

1. `grep -n "contested canon\|in-world assertion" .claude/skills/diegetic-artifact-generation/SKILL.md`
2. `grep -n "canon_status" .claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` — confirm no field rename.
3. Narrower-command rationale: a two-site prose precision edit with no executable surface and an explicit no-field-change / no-firewall-change contract; grep-proof of the corrected prose plus the field-unchanged check is the complete verification boundary.

## Outcome

Completed: 2026-05-21

What changed:
- `.claude/skills/diegetic-artifact-generation/SKILL.md` now describes DA claims as in-world assertions, not canon, in the output contract and the hard rules.
- The wording states that DA statements become world truth only through later `canon-addition` acceptance.

Deviations from original plan:
- None. The change remained prose-only; no template, enum, field, phase, schema, validator, or world-data surface changed.

## Verification Result

Commands/reviews run:

1. `grep -n "contested canon\|in-world assertion" .claude/skills/diegetic-artifact-generation/SKILL.md` — returned the two corrected `in-world assertions, not canon` sites and no remaining `contested canon` site in `SKILL.md`.
2. `grep -n "canon_status" .claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` — confirmed the `claim_map.canon_status` field remains present with the unchanged enum `canonically_true | canonically_false | partially_true | contested | mystery_adjacent | prohibited_for_this_artifact`.
3. Manual review of `.claude/skills/diegetic-artifact-generation/SKILL.md` §Phase 7 confirmed the Canon Safety Check/firewall wording was not edited.

## Deviations

None.
