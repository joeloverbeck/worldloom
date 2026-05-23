# SPEC74STCHARDISBOU-012: branching-story-health-audit/SKILL.md Phase 2m 3-finding registration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2m (add 3 new findings: `stchar_temporal_authority_contamination`, `stchar_semantic_loss_risk`, `stchar_regeneration_reason_invalid`)
**Deps**: `archive/tickets/SPEC74STCHARDISBOU-008.md`, `archive/tickets/SPEC74STCHARDISBOU-009.md`, 011

## Problem

`branching-story-health-audit/SKILL.md` Phase 2m ("STCHAR authority health") currently enumerates structural findings around STCHAR resolution, supersession, reciprocity, and packet hashes (the post-SPEC-71 set). It does NOT enumerate the 3 new structural findings emitted by `archive/tickets/SPEC74STCHARDISBOU-008.md` / `archive/tickets/SPEC74STCHARDISBOU-009.md` / -011: temporal-contamination, semantic-loss, and invalid-regeneration-reason. Without registering these findings in Phase 2m, the health-audit skill cannot surface them to operators running structural audits on red-bunny or any future bundle. The Stage 7 step in SPEC-74 §8 sequencing is this docs registration.

## Assumption Reassessment (2026-05-23)

1. Verified current `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2m at line 341 ("Phase 2m: STCHAR authority health"); existing findings enumerated at lines 347-355 (the post-SPEC-71 set including `stchar_unresolved`, `stchar_not_active_for_bound_stent`, `stchar_superseded_still_active`, `page_plan_missing_stchar_packet`, etc.). The 3 new findings from SPEC-74 §4.6 are NOT currently present (grep confirmed at reassess-spec verification time).
2. Verified SPEC-74 §4.6 specifies the 3 new findings + the per-finding repair_kind / severity per the fail-everywhere policy chosen at SPEC-74 §5. The §4.6 first finding's wording was harmonized at /reassess-spec time to use the cleaner "FAIL on all profiles (fail-everywhere policy chosen at triage; see §5)" form matching the sibling entries.
3. Cross-skill boundary under audit: the health-audit skill Phase 2m findings list IS the operator-facing surface for STCHAR validator diagnostics; the 3 new findings describe what the operator sees when the `archive/tickets/SPEC74STCHARDISBOU-008.md` / `archive/tickets/SPEC74STCHARDISBOU-009.md` / -011 validators FAIL on red-bunny or other bundles. The findings depend on those validator names existing (which is why Deps lists the archived 008, archived 009, and active 011) — documenting findings the validators don't emit would create a stale skill description.
4. FOUNDATIONS principle restated: §Story Bundles §6.1 ("Story-Local Character Authority") — the new findings operationalize the principle by surfacing structural violations of STCHAR's role as durable story-local authority (temporal contamination, semantic loss, invalid regeneration rationale).
5. HARD-GATE / Canon Safety Check surface touched: the health-audit's Phase 2m findings feed operator decisions about STCHAR remediation (turn-cycle repair / prose revision / branch flag for regeneration); the 3 new findings cite STCHAR validator outputs and gate operator action on canon-adjacent surfaces (STCHAR records under `worlds/<slug>/stories/<slug>/_source/`). The docs change adds new findings to an existing skill phase; it does NOT weaken the Mystery Reserve firewall (STCHAR is story-local; MR firewall is canon-pipeline scope).

## Architecture Check

1. Registering the findings as Phase 2m documentation is the canonical worldloom approach: validator diagnostics are surfaced through health-audit phases, with per-finding `repair_kind` guidance directing the operator to the right remediation surface (turn_repair / prose_revision / branch_flag). Alternative (inlining the findings in each validator's own diagnostic message) would scatter the operator-facing description across N files instead of consolidating in Phase 2m.
2. No backwards-compatibility shims; the new findings are additive entries in the existing Phase 2m findings list.

## Verification Layers

1. **3 new finding names present in Phase 2m** → codebase grep-proof: `grep -nE 'stchar_temporal_authority_contamination|stchar_semantic_loss_risk|stchar_regeneration_reason_invalid' .claude/skills/branching-story-health-audit/SKILL.md` returns ≥3 matches.
2. **`repair_kind` guidance per finding** → grep-proof: each new finding entry names `repair_kind: turn_repair`, `repair_kind: prose_revision`, or `repair_kind: branch_flag` per the SPEC-74 §4.6 specification.
3. **Fail-everywhere severity phrasing consistent across the 3 findings** → manual inspection confirms each new entry uses the harmonized phrasing (per reassess-spec correction).
4. **Phase name accuracy** → grep confirms the docs use "Phase 2m" (current code phase name) and refer to the `compatibility_drift` mode as `Phase 2j` (NOT the source-report's stale "Phase 2n source_drift" naming, per /reassess-spec verification that the current code uses `Phase 2j: Compatibility drift (conditional on 'compatibility' in 'mode')` at line 358).

## What to Change

### 1. Add `stchar_temporal_authority_contamination` finding to Phase 2m

Append to the existing Phase 2m findings list (immediately following the last existing entry at line ~354):

> - **`stchar_temporal_authority_contamination`** — an operational STCHAR section or `Page-Plan Voice Block` cites active temporal story-state records as durable authority, or otherwise uses `PG`, `SE`, `STEMO`, `BEL`, `STPLAN`, `STINT`, `STSTAT`, `STOBJ`, `STLOC`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, or `STQ` as if current state belongs in the durable profile. Allowed contexts: frontmatter provenance fields, `Source Distillation`, `story_local_inputs_used`, `Validation / Audit Anchors` when the record is clearly cited as evidence/provenance. FAIL on all profiles (fail-everywhere policy chosen at triage; see SPEC-74 §5). `repair_kind: turn_repair` when missing state records must be created; `repair_kind: prose_revision` when only §16a/page-plan text is wrong; `repair_kind: branch_flag` when durable regeneration is needed.

### 2. Add `stchar_semantic_loss_risk` finding to Phase 2m

> - **`stchar_semantic_loss_risk`** — a `source_kind: world_char` STCHAR lacks a `Stable Source Material Inventory`, maps retained stable source material only to `Source Distillation`, or uses `story_irrelevant` at bootstrap with rationale equivalent to opening-page irrelevance. FAIL on all profiles under fail-everywhere policy. `repair_kind: branch_flag` unless a specific later page already needs the omitted durable material, in which case recommend `story-character-profile regenerate`.

### 3. Add `stchar_regeneration_reason_invalid` finding to Phase 2m

> - **`stchar_regeneration_reason_invalid`** — a regenerated/superseding STCHAR lacks a durable `regeneration_reason_class`, or the reason is an ordinary current-state change rather than one of the 5 valid reasons (`source_world_char_material_change`, `durable_branch_transformation`, `profile_fidelity_failure`, `story_local_character_promotion`, `stable_source_material_omission_repair`). FAIL on all regenerated profiles.

### 4. Verify the source_drift mode phase name reference

Per /reassess-spec verification, the current code uses `Phase 2j: Compatibility drift` (NOT the source-report's stale "Phase 2n source_drift"). The new finding entries should reference the correct phase name when cross-referencing the mode that produces the `compatibility_drift` validator output. No changes to existing phase headings; just ensure new entries don't propagate the stale name.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The validators that emit the diagnostics the findings describe (`archive/tickets/SPEC74STCHARDISBOU-008.md` / -009 / -011).
- The skill authoring discipline these findings describe violations of (`archive/tickets/SPEC74STCHARDISBOU-001.md`).
- Migration of existing red-bunny STCHAR profiles that trigger the findings (SPEC74STCHARDISBOU-013).
- Any modification to the existing Phase 2m findings or the Phase 2j (compatibility_drift) phase prose; this ticket only ADDS the 3 new findings.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'stchar_temporal_authority_contamination|stchar_semantic_loss_risk|stchar_regeneration_reason_invalid' .claude/skills/branching-story-health-audit/SKILL.md` returns ≥3 matches (one per new finding).
2. Each new finding entry includes the `repair_kind:` guidance per SPEC-74 §4.6.
3. The "FAIL on all profiles (fail-everywhere policy chosen at triage; see §5)" phrasing is used consistently across the 3 new entries (no touched/legacy artifact phrasing).
4. `grep -nE 'Phase 2n source_drift|stchar source-drift mode' .claude/skills/branching-story-health-audit/SKILL.md` returns 0 matches NEAR THE NEW ENTRIES (the stale name is not propagated into the new docs; the line-28 prose mention of "STCHAR source-drift reporting" is a separate pre-existing description-prose drift outside this ticket's scope).

### Invariants

1. The Phase 2m findings list enumerates every structural STCHAR violation the validator-framework can detect (post-this-ticket: existing findings + 3 new ones).
2. Each new finding's `repair_kind:` guidance correctly routes operators to the right remediation surface (turn_repair / prose_revision / branch_flag).
3. The new finding entries do NOT propagate the stale "Phase 2n source_drift" naming from the source report.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'stchar_temporal_authority_contamination|stchar_semantic_loss_risk|stchar_regeneration_reason_invalid' .claude/skills/branching-story-health-audit/SKILL.md` (confirms 3 new findings present)
2. `grep -nE 'repair_kind: turn_repair|repair_kind: prose_revision|repair_kind: branch_flag' .claude/skills/branching-story-health-audit/SKILL.md` (confirms repair_kind guidance present near the new entries)
3. Manual inspection: cross-check the 3 new entries against SPEC-74 §4.6 wording for bit-for-bit alignment (including the harmonized fail-everywhere phrasing).
