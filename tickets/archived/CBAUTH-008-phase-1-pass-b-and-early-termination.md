# CBAUTH-008: Add Phase 1 Pass B (moment-fit gap diagnosis), three-state saturation verdict, early-termination, and Phase 6 deliverable-summary surfacing

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` + `.claude/skills/commitment-block-authoring/SKILL.md` + optional `.claude/skills/commitment-block-authoring/references/governance-and-foundations.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: CBAUTH-007 (consumes the moment_signature working-memory artifact produced by pre-flight step 4(iii))

## Problem

CBAUTH-007 lands pre-flight step 4(iii) producing a moment_signature working-memory artifact. Phase 1 currently runs two passes computed entirely from the pool projection — Pass A (17-target coverage diagnosis) and the saturated-pool advisory with the 6-lane depth-criteria checklist (CBAUTH-005). Neither consumes the moment signature, so the diagnostic still cannot ask "does the pool fit the moment that just happened?".

Design `docs/plans/2026-05-30-commitment-block-authoring-moment-signature-design.md` §4 introduces a new Pass B that walks the pool projection against the moment signature to surface moment-fit gaps (supersession-axis lanes, dominant-action-family lanes, cast-role-engagement-at-moment lanes). §5 escalates the saturated-pool advisory's binary `pool_saturation` flag to a three-state enum (`false | pool_only | moment_and_pool`) and adds an actionable early-termination verdict that fires when the pool is fit to both the pool-wide 17-target check AND the moment signature, the operator supplied no `focus` hint, and `target_count` was defaulted (operator-intent split per Approach C).

The Phase 6 deliverable summary must surface the new artifacts so the HARD-GATE moment carries the audit trail the operator needs to confirm the verdict: `moment_signature` echoed for traceability, `moment_fit_lanes` examined and addressed, and the `early_termination` state (fired vs not, with suggested-override invocations when fired). This ticket lands the Phase 1 consumption logic AND the Phase 6 summary surfacing as one reviewable unit, because the summary contract is the only externally-visible side of the Phase 1 work — splitting them would land a silent Phase 1 change that fails Acceptance Criteria invariant 2 ("audit trail surfaced at HARD-GATE").

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (post-CBAUTH-005) names the saturated-pool advisory subsection with the binary `pool_saturation` flag and the 6-lane depth-criteria checklist. Verified by direct Read this session. The "Output shape" YAML at the bottom of the file enumerates the working-memory `coverage_diagnosis` shape with per-target `status` / `coverage_strength` / `under_represented` / `addressed_by_blocks` fields and the `pool_saturation: bool` flag. This ticket extends both the prose and the output-shape YAML.
2. `.claude/skills/commitment-block-authoring/SKILL.md:127-135` Phase 6 sub-step 3 deliverable-summary bullet list enumerates: mode + source, SLT inventory by `move_family`, coverage-depth signal (post-CBAUTH-005 depth-criteria lane labeling), per-block one-line summary, per-block validation trace, batch-diversity result, skipped RSP cards, SLB manifest preview. Verified by direct Read this session. This ticket adds three new bullets: `moment_signature` echo, `moment_fit_lanes` examined/addressed, `early_termination` state.
3. Shared boundary under audit: the Phase 1 → Phase 6 deliverable-summary contract. CBAUTH-005's deliverable-summary contract addition (depth-criteria lane labeling) is the immediate precedent for how Phase 6 surfaces new Phase 1 outputs. This ticket follows the same pattern. Phase 2 / Phase 3 / Phase 4 are not modified — Phase 2 authoring guidance ships in CBAUTH-009.
4. FOUNDATIONS principle under audit: §Story Bundles §5b (Schema-Minimalism — every record load-bearing) + §5c (Driver salience is local). The early-termination verdict is the §5b enforcement at saturated-and-moment-covered pools — preventing redundant author-pool growth. Pass B is the authoring-time analogue of §5c's local-salience-ranking principle.
5. HARD-GATE semantics under audit: early-termination's no-write verdict is still a HARD-GATE-blocked moment — the user explicitly approves "no batch authored" rather than the skill silently terminating. This preserves single-approval-surface discipline. The HARD-GATE prose at SKILL.md (a)/(b)/(c) does not need amendment; the deliverable summary's new content is what the user approves.
6. Output-schema extension classification: the working-memory `coverage_diagnosis` YAML (consumed only within the skill's own Phase 1 → Phase 6 flow) is the only schema extended. Extension is additive — new fields (`moment_signature`, `moment_fit_diagnosis`, `early_termination`) are added; existing fields (`coverage_diagnosis[]`, `pool_saturation`) are preserved with `pool_saturation` widened from `bool` to a three-state enum. No persisted-record schema is touched. No consumer outside the skill's own flow reads the working-memory YAML.
7. Adjacent contradiction classification: CBAUTH-005's `pool_saturation: bool` is widened to a three-state enum. Consumers of the boolean reading (the saturated-pool advisory's "pool target-saturated" check) still work when `pool_saturation in {'pool_only', 'moment_and_pool'}` — both truthy values mean "saturated against pool-wide check". CBAUTH-005's existing advisory prose is extended, not replaced. Required-consequence sequencing.

## Architecture Check

1. Cleaner than alternatives: the alternative of folding Pass B into Pass A's 17-target loop would require recomputing the moment signature inline during the loop (CBAUTH-007 explicitly designs pre-flight digest separately to avoid this) AND would tangle pool-wide and moment-anchored gap diagnosis in a single output structure, breaking the operator's ability to inspect them separately in the Phase 6 summary. Keeping Pass B as a separate pass between A and C preserves operator-visible decomposition. The alternative of three-state-as-string-tag rather than enum widening would prevent future enum extension (e.g., a fourth state "moment_only" if Pass A coverage ever becomes optional).
2. No backwards-compatibility aliasing/shims introduced: existing CBAUTH-005 advisory prose is extended, not replaced. The `pool_saturation` field widening from `bool` to enum is breaking only for consumers outside this skill — there are none (verified by sibling-skill scan: no `.claude/skills/branching-story-*/` or `.claude/skills/story-*/` reference reads the commitment-block-authoring Phase 1 working-memory output).

## Verification Layers

1. Invariant: Pass B procedure is documented as 4 steps in the phase-1 reference, each step naming its input (signature subsystem) and output (moment_fit_lane emission criterion) → codebase grep-proof.
2. Invariant: the three-state `pool_saturation` enum is documented with all three values (`false | pool_only | moment_and_pool`), each with a one-line firing rule → codebase grep-proof.
3. Invariant: the `early_termination` verdict shape is documented with all four top-level fields (`fired`, `reason`, `examined`, `suggested_overrides`) and the three firing conditions (a/b/c) are enumerated → codebase grep-proof.
4. Invariant: Phase 6 deliverable-summary contract in SKILL.md adds three new bullets (`moment_signature` echo, `moment_fit_lanes`, `early_termination` state) → codebase grep-proof.
5. Invariant: when early-termination fires, Phase 2 / Phase 3 / Phase 4 / Phase 5 / Phase 6 patch-envelope construction MUST be skipped; the HARD-GATE fires on the no-batch verdict alone → manual review + skill dry-run (target-saturated bundle with no `focus` and defaulted `target_count` should reach HARD-GATE without drafting any SLT records).
6. Invariant: when the operator supplies `focus` OR explicit `target_count`, early-termination MUST NOT fire even if Pass A and Pass B are both clean; the skill proceeds normally with a strong advisory → manual review + skill dry-run.
7. Invariant: `audit_repair` mode is unaffected; Pass B is skipped, three-state enum collapses to today's behavior, no early-termination evaluation → codebase grep-proof + skill dry-run on a representative SAU/RSP-driven `audit_repair` invocation.

## What to Change

### 1. Add §"Pass B — Moment-fit gap diagnosis" to phase-1 reference

In `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`, after the existing §Depth-criteria checklist subsection and before the §Output shape YAML, add a new §"Pass B — Moment-fit gap diagnosis" covering the 4-step procedure:

```
Pass B (consumes the moment_signature artifact emitted by pre-flight step 4(iii); skipped when moment_signature_skipped: true; skipped entirely for audit_repair mode):

1. For each move_family value (16-value enum per shared contract §4.4), count pool SLTs that hard-fire on the signature's active_high_salience_records (i.e., hard precondition referencing one of those record's classes, urgencies, or role-filters). Under-represented move_families with active high-salience records targeting them emit a moment_fit_lane named `move_family_under_represented_at_moment:<move_family>`.

2. For each supersession_set entry, check whether the pool carries a block whose hard preconditions match the *new* record's shape (e.g., for a THR supersession with axis "protect/possess collapse": any pool SLT hard-gating on `any_thread_active(tag~="protect", urgency=high)` AND `any_relationship_axis(axis=desire, value=high)`). If zero, emit a moment_fit_lane named after the supersession axis (`protect_possess_collapse_under_desire`).

3. For each dominant_action_family in forward_affordance_fingerprint, check pool SLTs whose exit_options[].action_family includes that family AND whose hard preconditions intersect the active_high_salience set. If under-represented, emit a moment_fit_lane named `<dominant_family>_under_<dominant_active_pressure_axis>`.

4. For each non-empty cast_role_engagement_at_moment entry, check whether a pool SLT names that role in a precondition role-filter (per the existing cast-role determinism rule in target #15). Augments target #15 with moment-anchored urgency: a role exercised by the signature with no engaging SLT IS a moment-fit gap; a role unengaged-by-the-moment that has a pool block hard-gating on it elsewhere is NOT.

Pass B is computable from the pool projection already loaded at pre-flight step 4(i) + the moment_signature artifact from step 4(iii); no new MCP retrieval is added.
```

### 2. Rename §"Saturated-pool advisory" → §"Saturation verdict (three-state)" with extended semantics

In `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`, rename the existing §Saturated-pool advisory subsection to §Saturation verdict (three-state). Extend prose to document the three-state `pool_saturation` enum:

- `false` — Pass A or Pass B (or both) found gaps; depth-criteria checklist may also apply for any under-representation found. Author normally.
- `pool_only` — Pass A clean (all 17 targets covered hard, not under-represented), but Pass B emitted moment_fit_lanes. Author against the moment_fit_lanes; existing depth-criteria checklist lanes apply alongside.
- `moment_and_pool` — Pass A clean AND Pass B clean (no moment_fit_lanes emitted). Pool is fit to both pool-wide check and the moment signature. Triggers the §Early-termination verdict below.

CBAUTH-005's existing depth-criteria-lane labeling for the deliverable summary is preserved; the new moment_fit_lanes become an additional lane family the operator can label authored blocks with.

### 3. Add §"Early-termination verdict" subsection

In the same `references/phase-1-coverage-diagnosis.md` file, after the §Saturation verdict (three-state) subsection, add a new §"Early-termination verdict" covering the working-memory shape and the three firing conditions:

```yaml
early_termination:
  fired: true
  reason: moment_already_covered            # | pool_saturated_no_focus (existing advisory escalated)
  examined:
    pool_targets_covered_hard: 17
    moment_fit_lanes_examined: [<lane>, ...]
    moment_fit_lanes_already_covered: [<lane>, ...]
  suggested_overrides:
    - {invocation: "focus='<lane-name>'", effect: "author depth blocks targeting that moment lane"}
    - {invocation: "target_count=<N>", effect: "author N depth blocks despite moment coverage"}
```

Firing conditions (ALL must hold):
- (a) `pool_saturation == "moment_and_pool"`
- (b) no `focus` hint supplied
- (c) `target_count` either defaulted to 6 OR not supplied (operator gave no explicit count)

When fired, Phase 2 / Phase 3 / Phase 4 / Phase 5 / Phase 6 patch-envelope construction MUST be skipped. The HARD-GATE still fires on the no-batch verdict — the deliverable summary surfaces the verdict, the examined lanes, and the suggested overrides. User approval at this gate means "acknowledge the no-batch verdict and end the skill cleanly"; user rejection or counter-instruction with override re-runs the skill with the override args.

When the operator supplied `focus` OR explicit `target_count`, early-termination does NOT fire — the skill proceeds normally with a strong advisory in the Phase 6 deliverable summary noting the moment is covered and the batch is depth-fill at operator override.

### 4. Extend §Output shape YAML

In the same file's §Output shape subsection, extend the working-memory `coverage_diagnosis` YAML to include the new fields:

```yaml
coverage_diagnosis:
  # ... existing per-target entries unchanged ...

moment_signature: {<echoed pre-flight artifact, for audit-trail traceability into the Phase 6 deliverable summary>}

moment_fit_diagnosis:
  signature: <embedded moment_signature>
  moment_fit_lanes:
    - {lane_id: "<name>", source: <supersession_set|forward_affordance+active_high_salience|cast_role_engagement|move_family_under_represented_at_moment>, addressed_by_blocks: [SLT-NEW-<N>, ...]}
  moment_signature_skipped: false
  moment_signature_skip_reason: null

pool_saturation: <false | pool_only | moment_and_pool>     # widened from bool to three-state enum

early_termination:
  fired: <true | false>
  reason: <moment_already_covered | pool_saturated_no_focus | null>
  examined: {pool_targets_covered_hard: <int>, moment_fit_lanes_examined: [...], moment_fit_lanes_already_covered: [...]}
  suggested_overrides: [...]
```

### 5. Update SKILL.md Phase 6 sub-step 3 deliverable-summary contract

In `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 3 deliverable-summary bullet list (around lines 127-135), add three new bullets:

```
- moment_signature echo: parent_page, parent_event, parent_event_resolution; active_high_salience_records counts by class; supersession_set entries (old → new @ shifted_at, axis); dominant_action_families + outlier_action_families; cast_role_engagement_at_moment by role. When `moment_signature_skipped: true`, surface the skip reason instead.
- moment_fit_lanes: per-lane id + source + addressed_by_blocks (when Pass B emitted lanes); explicit `none — pool fit to moment` when Pass B emitted no lanes.
- early_termination state: when fired, surface verdict + reason + examined + suggested_overrides so the operator can choose: approve no-batch (HARD-GATE confirms termination), or re-invoke with focus/target_count override. When not fired, surface `early_termination: not fired` with the firing-condition status so operator can confirm the proceed reasoning.
```

Also update the per-block label vocabulary (CBAUTH-005's extension) to include moment-fit-lane labeling alongside depth-criteria-lane labeling:

```
Label each authored block as an absent-target fill vs. an under-representation addition (criterion (a) / (b) / cast-role gap) vs. a depth addition (action-family combo / specific-pressure-shape / single-block-move_family / action-family single-block / paired-pressure-shape / hard-grounding lane) vs. a moment-fit addition (lane_id from Pass B), or — when none apply — explicitly flag the block as "no documented lane; authorial judgment" with a stated rationale.
```

### 6. (Optional) Add §5c row to governance-and-foundations.md FOUNDATIONS Alignment table

In `.claude/skills/commitment-block-authoring/references/governance-and-foundations.md` §FOUNDATIONS Alignment table, add a row noting the §5c alignment:

```
| §Story Bundles §5c (Driver salience is local) | Pre-flight step 4(iii), Phase 1 Pass B | Moment-signature is the authoring-time analogue of §5c's runtime local-salience-ranking pass for driver selection; Phase 1 Pass B reads the present configuration at the latest committed PG without computing target narrative shape or arc-position lookahead. |
```

This row is optional but recommended — it makes the §5c alignment explicit in the skill's own FOUNDATIONS table so a future operator does not need to derive the principle from the prose.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (modify — new §Pass B subsection, rename §Saturated-pool advisory → §Saturation verdict (three-state) with extended prose, new §Early-termination verdict subsection, extended §Output shape YAML)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 6 sub-step 3 deliverable-summary contract: three new bullets, per-block label vocabulary extension to include moment-fit-lane labeling)
- `.claude/skills/commitment-block-authoring/references/governance-and-foundations.md` (optional modify — add §5c row to FOUNDATIONS Alignment table)

## Out of Scope

- Pre-flight step 4(iii) and the `supersession_window_pages` arg — CBAUTH-007 lands those.
- Phase 2 authoring guidance against moment-fit lanes — CBAUTH-009 lands that.
- Phase 5 batch-manifest moment-signature inline-prose section — CBAUTH-010 lands that.
- New schema fields on SLT, SLB, PG, SE, or any other story-bundle record class. Pass B output is working-memory only.
- New patch-op kinds, new validators, new MCP capability.
- Phase 3 validation gates (the 6 schema/predicate gates are lens-agnostic; moment-signature is input to Phase 2 drafting but not to Phase 3 validation).
- Phase 4 batch-diversity gates (the 4 checks are not relaxed by moment-fit lane coverage; move-family / recovery / belief-or-relationship / no-branch-local-dependencies enforcement is preserved).
- `audit_repair` mode behavior. Pass B is skipped; early-termination is not evaluated; today's behavior is preserved.
- Heuristic for choosing among moment-fit lanes when multiple apply. Multiple-lane selection is authorial in Phase 2 (CBAUTH-009 territory).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Pass B\|moment-fit gap diagnosis\|moment_fit_lane\|move_family_under_represented_at_moment" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the new Pass B subsection with all 4 steps and emission criteria.
2. `grep -n "Saturation verdict\|three-state\|pool_only\|moment_and_pool" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the renamed subsection and the three-state enum prose.
3. `grep -n "Early-termination verdict\|moment_already_covered\|suggested_overrides\|pool_saturated_no_focus" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the new subsection with the working-memory shape and the three firing conditions.
4. `grep -n "moment_signature echo\|moment_fit_lanes\|early_termination" .claude/skills/commitment-block-authoring/SKILL.md` returns the three new Phase 6 deliverable-summary bullets and the extended per-block label vocabulary.
5. Skill dry-run on `erotica-world / red-bunny` (PG-6 baseline) with `direct_batch` defaults: confirm the deliverable summary surfaces the moment_signature echo + moment_fit_lanes diagnosis + early_termination state. Verify either:
   - early_termination fires (if Pass A clean + Pass B clean) — HARD-GATE confirms no-batch verdict; no SLT records drafted; or
   - moment_fit_lanes emit and Phase 2 drafts against them — deliverable summary labels blocks with moment-fit-lane ids alongside any depth-criteria-lane labels.
6. Skill dry-run on the same bundle with `target_count=4` (explicit, no focus): confirm early_termination does NOT fire even if Pass A + Pass B would both be clean; advisory in Phase 6 summary notes pure depth-fill against moment-covered pool.
7. Skill dry-run on the same bundle with `focus="negotiation under door-or-leash belief"`: confirm focus wins; deliverable summary surfaces moment-signature's competing recommendation as audit-trail note; no early-termination.
8. Skill dry-run on a representative SAU/RSP-driven `audit_repair` invocation: confirm Pass B is skipped; pool_saturation collapses to today's bool semantics; no early_termination evaluation; behavior identical to pre-ticket baseline.

### Invariants

1. Pass B is computable from the pool projection already loaded at pre-flight step 4(i) + the moment_signature artifact from step 4(iii); no new MCP retrieval is added.
2. Early-termination's no-write verdict is still a HARD-GATE-blocked moment; the user explicitly approves "no batch" rather than the skill silently terminating (preserves single-approval-surface discipline).
3. When the operator supplied `focus` OR explicit `target_count`, early-termination does NOT fire; the skill proceeds normally with a strong advisory in Phase 6 summary (operator intent is preserved).
4. The three-state `pool_saturation` enum extension is additive; CBAUTH-005's existing depth-criteria-lane labeling is preserved alongside the new moment-fit-lane labeling.
5. `audit_repair` mode is unaffected; Pass B and early-termination are not evaluated; today's behavior is identical.
6. The signature is shape extraction, not id binding; Pass B's lane_id naming MUST reference predicate-class / urgency / role / axis / action-family shapes rather than branch-local record ids (preserves Character-Fit Selection Contract §11a discipline).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and skill-dry-run-based per Acceptance Criteria. Pass B is reference-prose elaboration consuming an existing working-memory artifact; no automated test surface is added.`

### Commands

1. `grep -n "Pass B\|moment-fit gap diagnosis\|moment_fit_lane\|Saturation verdict\|three-state\|pool_only\|moment_and_pool\|Early-termination verdict\|moment_already_covered\|suggested_overrides" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`
2. `grep -n "moment_signature echo\|moment_fit_lanes\|early_termination\|moment-fit addition" .claude/skills/commitment-block-authoring/SKILL.md`
3. `grep -n "§Story Bundles §5c\|Driver salience is local" .claude/skills/commitment-block-authoring/references/governance-and-foundations.md` (optional, if §5c row is added)
4. Skill dry-run on `erotica-world / red-bunny` (PG-6 baseline) with `direct_batch` defaults; inspect Phase 6 deliverable summary for the three new bullets; verify early_termination semantics per Acceptance Criteria test 5.
5. Skill dry-run on the same bundle with `target_count=4` (explicit); verify early_termination does NOT fire (Acceptance Criteria test 6).
6. Skill dry-run on the same bundle with `focus="..."`; verify focus wins (Acceptance Criteria test 7).
7. Skill dry-run on a representative `audit_repair` invocation; verify Pass B and early-termination are skipped (Acceptance Criteria test 8).
