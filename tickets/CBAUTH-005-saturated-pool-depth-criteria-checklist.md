# CBAUTH-005: Add depth-criteria checklist for saturated-pool authoring (depth / hard-grounding vs under-representation lane enumeration)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (no validator, tool, hook, or schema change)
**Deps**: CBAUTH-002 (the saturated-pool advisory and the depth-vs-fill labeling contract this ticket extends)

## Problem

CBAUTH-002 added the saturated-pool advisory and the deliverable-summary contract: "Label each authored block as an absent-target fill vs. a depth / hard-grounding / under-representation addition." Under-representation has documented criteria (`coverage_strength: soft_only` with an active triggering class, OR single-block coverage of a high-salience active lane). But the operational depth-criteria checklist — what counts as a legitimate **depth** or **hard-grounding** lane on a saturated pool when no under-representation criterion fires — is not enumerated.

Saturated pool is the common real-world `direct_batch` case (CBAUTH-002 observed this directly). A future operator hitting saturation must improvise depth criteria from first principles, producing non-reproducible batches.

Observed on the 2026-05-30 red-bunny SLB-4 run: pool was target-saturated post-SLB-3 (25 blocks, all 17 targets covered hard, no `focus` hint). I authored 6 depth blocks. Two mapped to documented under-representation criteria:

- SLT-26 → STSEC-1 single-block hard coverage (criterion (b))
- SLT-29 → STENT-3 authority cast-role lane (CBAUTH-003 territory)

The remaining four were depth additions whose criteria I improvised:

- SLT-27 → action-family combo (`transfer` + `protect` no-strings protection) not covered as one block by existing SLT-15 + SLT-19
- SLT-28 → specific-pressure-shape block (THR-4 "protect or possess" collapse at transformation altitude, distinct from SLT-16 generic transformation)
- SLT-30 → single-block move_family depth (only SLT-1 covers orient — re-orient after a hinge moment)
- SLT-31 → action-family single-block (`harm` only in SLT-12) + paired-pressure-shape (THR external hazard + CLK exposure)

These depth criteria (action-family combo, specific-pressure-shape, single-block move_family, action-family single-block, paired-pressure-shape) are legitimate lanes for a saturated-pool depth addition. None are documented. Each was an authorial discovery this run. A future operator authoring against a different saturated pool would have to rediscover them — and might miss them, defaulting to either redundant repeat-coverage or no addition at all.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md:44` (saturated-pool advisory, post-CBAUTH-002) names the advisory and the depth-vs-fill labeling but does not enumerate depth-criteria lanes. Verified by direct Read this session. The "Contingent-pressure targets" subsection lines ~40 gives two **under-representation** criteria (a) soft-only with active class, (b) single-block with high-salience active lane — both are under-representation lanes, not depth-or-hard-grounding lanes.
2. `.claude/skills/commitment-block-authoring/SKILL.md:130` deliverable-summary contract says "Label each authored block as an absent-target fill vs. a depth / hard-grounding / under-representation addition." Verified. The three labels are defined (under-representation has criteria; absent-target fill is binary on a non-saturated pool) but **depth** and **hard-grounding** are conceptually distinct labels without operational criteria.
3. Shared boundary under audit: the Phase 1 saturated-pool advisory subsection and the Phase 6 deliverable-summary contract. This ticket adds depth-criteria lane enumeration to the advisory, paralleling the under-representation criteria already there. No new schema or validator surface.
4. FOUNDATIONS principle under audit: §Story Bundles §5b (Schema-Minimalism — every record load-bearing; a saturated-pool depth addition that does not map to a legitimate depth lane is non-load-bearing and violates §5b). Restated: depth-criteria enumeration operationalizes the §5b discipline at saturated-pool authoring time, making "depth" a load-bearing choice rather than a residual-bucket label.
5. Adjacent contradiction classification: CBAUTH-002 surfaced the advisory and the labeling contract but deliberately deferred the depth-criteria enumeration (CBAUTH-002 was scoped to the under-representation lens, not depth). This ticket completes the saturation-advisory's full operationalization. Required-consequence pairing, not a separate bug.
6. Out-of-scope creep guard: this ticket does NOT add a Phase 4 batch-diversity gate keyed on depth-criteria coverage (depth additions stay authorial under §5b discipline, with the deliverable summary as the audit surface). Nor does it change the saturated-pool advisory's non-blocking character — the user may still author non-depth blocks when they choose; the criteria help the operator identify legitimate depth lanes when they want them.

## Architecture Check

1. Cleaner than alternatives: the depth-criteria checklist lives in the same `references/phase-1-coverage-diagnosis.md` "Saturated-pool advisory" subsection that already names the labeling contract. The operator reading the advisory sees the depth-criteria enumeration in the same scroll. The alternative — a separate `references/phase-1b-saturated-pool-authoring.md` file — fragments the reference and forces the operator to load two docs for one decision point.
2. No backwards-compatibility aliasing/shims introduced: prose elaboration within an existing reference subsection. The working-memory `coverage_diagnosis` YAML shape extends optionally with depth-criteria tags but the existing `pool_saturation` flag + `under_represented` flag are preserved unchanged.

## Verification Layers

1. Invariant: the saturated-pool advisory subsection enumerates a depth-criteria checklist of legitimate depth lanes → codebase grep-proof (each depth-criteria lane is named with a one-line operational definition in the reference; the count is documented).
2. Invariant: each depth-criteria lane is a property of the existing pool projection that the operator can compute without new retrieval → manual review (the criteria consume `move_family` counts, action-family counts across `exit_options[]`, predicate-hard-vs-soft counts, and pressure-shape patterns from the pool projection already loaded at pre-flight step 4(i)).
3. Invariant: depth additions on a saturated pool map to a documented depth-criteria lane → skill dry-run (re-invoke `direct_batch --target_count 6` on a target-saturated bundle; confirm each authored depth block is labelled with the matching depth-criteria lane and the labeling is reproducible from the prose).

## What to Change

### 1. Enumerate depth-criteria lanes in the Saturated-pool advisory subsection

In `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` "Saturated-pool advisory" subsection (after line ~44), add a depth-criteria checklist enumerating the legitimate depth lanes the operator should consider on a saturated pool. Suggested set (derived from SLB-4 SLT-27/28/30/31 authoring against the red-bunny target-saturated pool):

- **Action-family combo**: a block whose `exit_options[].action_family` set is a combination not covered by any single existing pool block (e.g., `transfer` + `protect` for no-strings protection-by-resource-transfer; `harm` + `protect` + `evade` for hazard-contest with shield options).
- **Specific-pressure-shape block**: a block whose preconditions narrow a generically-covered move_family to a specific high-urgency `THR` / `OBL` / `CNSQ` / `SREL` shape — e.g., `transformation` narrowed to a specific high-urgency protect/possess `THR` collapse, distinct from a generic `transformation` block that any active thread can fire.
- **Single-block move_family depth**: a second block in a `move_family` currently covered by exactly one pool SLT, with a distinct trigger profile (different precondition shape, different driver-kind set, different role-filter posture).
- **Action-family single-block depth**: a second block whose `exit_options[].action_family` set includes an action family currently appearing in exactly one pool block's exits (e.g., `harm` previously only in SLT-12), giving that action family non-monopolistic coverage.
- **Paired-pressure-shape block**: a block whose hard preconditions pair two active-state classes the existing pool covers individually but not jointly (e.g., `any_thread_active` + `any_clock_active(kind=exposure)` for a hazard-with-exposure conflict block).
- **Hard-grounding lane**: a block that adds *hard*-grounded selection on a triggering record class currently covered only via existing pool blocks' `soft` predicates (the per-target `coverage_strength` lift from `soft_only` to `hard` at the pool level — this overlaps with under-representation criterion (a) but extends it: any target whose pool coverage has zero hard-grounding SLTs is a hard-grounding lane regardless of active-class status).

The list is not exhaustive — author judgment may identify additional legitimate depth lanes — but it operationalizes the most common ones and gives a reproducible default checklist for the saturated-pool case.

### 2. Extend the deliverable-summary label vocabulary

Update `SKILL.md` Phase 6 sub-step 3's deliverable-summary contract so the per-block label includes the depth-criteria lane name (when applicable), not just the generic three-bucket label:

- "Label each authored block as an absent-target fill vs. an under-representation addition (criterion (a) / (b) / cast-role gap) vs. a depth addition (action-family combo / specific-pressure-shape / single-block-move_family / action-family single-block / paired-pressure-shape / hard-grounding lane), or — when none apply — explicitly flag the block as 'no documented lane; authorial judgment' so the deliverable summary surfaces the rationale."

This makes the label load-bearing: an operator who cannot map a depth addition to a documented lane is prompted to state the authorial-judgment rationale explicitly, rather than silently labeling it "depth."

### 3. Optional: extend the working-memory `coverage_diagnosis` YAML shape

Add an optional `depth_lanes_addressed: [<lane-name>]` field per planned new block in the Phase 1 working-memory `coverage_diagnosis` output (named in `phase-1-coverage-diagnosis.md` lines ~50-79 example). Field is working-memory-only and is not written to the SLB manifest (the manifest keeps coverage as inline prose per CBAUTH-002's existing rule).

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (modify — Saturated-pool advisory subsection)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 6 sub-step 3 deliverable-summary label contract)

## Out of Scope

- Any Phase 4 batch-diversity gate keyed on depth-criteria lane coverage. Depth additions on a saturated pool remain authorial; the criteria help identify lanes, not constrain selection.
- Coverage targets #1–#17 (CBAUTH-002 already gave them grounding-strength + under-representation; this ticket touches only the saturated-pool depth path).
- Any change to the working-memory `coverage_diagnosis` YAML shape beyond the optional `depth_lanes_addressed[]` field. The on-disk SLB manifest's coverage-as-prose contract is preserved per CBAUTH-002.
- A heuristic for choosing among depth lanes when multiple apply. Multiple-lane scoring is authorial.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "action-family combo\|specific-pressure-shape\|single-block move_family\|action-family single-block\|paired-pressure-shape\|hard-grounding lane" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the depth-criteria lane enumeration with one-line operational definitions per lane.
2. `grep -n "depth addition\|authorial judgment" .claude/skills/commitment-block-authoring/SKILL.md` returns the extended deliverable-summary label vocabulary, including the "no documented lane; authorial judgment" escape valve.
3. Skill dry-run: re-invoke `direct_batch --target_count 4` on `erotica-world / red-bunny` post-SLB-4 (now 31-block, plausibly still saturated); confirm each authored depth block is labelled with a documented depth-criteria lane in the deliverable summary, and that labeling is reproducible from the prose alone.

### Invariants

1. Saturated-pool depth additions map to a documented depth-criteria lane OR carry an explicit "authorial judgment" flag with a stated rationale in the deliverable summary (FOUNDATIONS §Story Bundles §5b — every record load-bearing by conscious choice).
2. The depth-criteria checklist is computable from the pool projection already loaded at pre-flight step 4(i); no new retrieval call is added.
3. The saturated-pool advisory remains non-blocking — the user may still author non-depth blocks; the criteria identify lanes, they do not gate selection (consistent with CBAUTH-002's non-blocking-advisory stance).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "action-family combo\|specific-pressure-shape\|single-block move_family\|action-family single-block\|paired-pressure-shape\|hard-grounding lane\|depth_lanes_addressed" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`
2. `grep -n "depth addition\|authorial judgment\|depth-criteria" .claude/skills/commitment-block-authoring/SKILL.md`
3. Skill dry-run on a target-saturated bundle and inspect the deliverable summary's per-block label assignment against the new prose; confirm operator-independence on lane assignment when criteria apply.
