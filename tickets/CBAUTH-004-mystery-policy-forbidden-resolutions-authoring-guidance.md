# CBAUTH-004: Add per-block `mystery_policy.forbidden_resolutions[]` defensive-inclusion authoring guidance to mirror the existing `allowed_authority` per-move_family heuristic

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (no validator, tool, hook, or schema change)
**Deps**: None

## Problem

Phase 2 commitment-block drafting tells the operator the `mystery_policy` shape (`forbidden_resolutions: [M-<integer>]`, `allowed_authority: apparent | branch_local_counterfactual | canon_candidate | none`) and Phase 3 gate 4 enforces that `forbidden_resolutions[]` "does NOT include any mystery the block's effects could resolve" — but the **authoring** side of the field is not documented. There is no guidance for "when to defensively include `M-<integer>` in `forbidden_resolutions[]` for a block whose move thematically touches a bounded mystery's territory even though its effects do not directly resolve it."

By contrast, the `allowed_authority` field got a per-`move_family` default heuristic (`phase-2-draft-blocks.md:59`): `none` for pressure-dramatization families, `apparent` for state-shaping families, with overrides. So one half of `mystery_policy` has a documented authoring heuristic; the other half does not.

Observed on the 2026-05-30 red-bunny SLB-4 run: when drafting the six new blocks I had to grep the existing pool to discover the defensive-inclusion convention by topic-territory:

- SLT-7 (disclosure of concealed truth → CF-0005/CF-0006 territory) → `[M-5, M-6]`
- SLT-24 (the wanting shows through → ONT-1 / CF-0001 erotic-salience territory) → `[M-3]`
- SLT-25 (master the pull → restraint against saturation pull) → `[M-3]`
- SLT-1 (orient — no specific mystery touched) → `[]`

I then inferred the convention and applied it to the new blocks:
- SLT-26 (clue surfaces → CF-0005/CF-0006 territory) → `[M-5, M-6]`
- SLT-28 (restraint cracks → saturation-pull intensification) → `[M-3]`
- SLT-31 (street threat reconverges → CF-0006 hazard) → `[M-5]`
- SLT-27 / SLT-29 / SLT-30 → `[]`

The defensive-inclusion choices were defensible but operator-improvised. A future operator authoring against a different bundle would have to re-derive the convention from pool examples, and a careless operator might emit `forbidden_resolutions: []` on every block without realizing thematic-touch territory deserves defensive inclusion.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md:36-37` shows the `mystery_policy` skeleton in the SLT draft template. Verified by direct Read this session. The `allowed_authority` per-move_family default heuristic appears at the same reference at line 59 (post-CBAUTH-001 / 002 work). The `forbidden_resolutions[]` field has no parallel heuristic.
2. `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md:13` Phase 3 gate 4 mystery / invariant firewall verifies that `forbidden_resolutions[]` does NOT include any mystery the block's effects could resolve, and that `allowed_authority` is compatible with the block's effects. Verified — the gate is the enforcement surface but it does not direct the authoring choice. An empty `forbidden_resolutions: []` always passes gate 4 because empty cannot conflict with effects; the gate cannot detect missing defensive inclusion.
3. Shared boundary under audit: the `mystery_policy` field on the SLT record schema (shared contract §4.4) and the per-block firewall load in pre-flight step 6 (CBAUTH-001 made the forbidden-Mystery-Reserve whole-class load unconditional). The forbidden-status M bodies and the bundle's `mysteries_in_play` list are both in context when the block is drafted; the only gap is the authoring heuristic.
4. FOUNDATIONS principle under audit: §Rule 7 (Preserve Mystery Deliberately) — defensive inclusion in `forbidden_resolutions[]` is a Phase 2 authoring contribution to the per-block mystery firewall. The gate-4 check is necessary but not sufficient: a block whose effects do not directly resolve M-3 but whose runtime SE could plausibly drift into saturation-source territory is materially safer when M-3 is in `forbidden_resolutions[]` than when it is not. The authoring heuristic operationalizes the discipline.
5. Adjacent contradiction classification: CBAUTH-001 made the firewall bodies available; CBAUTH-002 added grounding-strength to Phase 1; this ticket completes the Phase 2 authoring-side `mystery_policy` documentation symmetry. Required-consequence trio with the prior CBAUTH tickets. No separate bug.
6. Out-of-scope creep guard: this ticket does NOT add a validator that auto-flags missing defensive inclusion (the heuristic is a thematic-touch judgment the operator makes from `move_family` + concrete bundle state — automating it would be over-constraining and brittle). It does NOT change Phase 3 gate 4 logic.

## Architecture Check

1. Cleaner than alternatives: the `phase-2-draft-blocks.md` reference already hosts the `allowed_authority` per-move_family heuristic; adding a parallel `forbidden_resolutions[]` defensive-inclusion heuristic to the same subsection is the lowest-blast-radius fix and the location any operator drafting a block will see. The alternative — a Phase 3 gate that auto-suggests defensive inclusions — is over-constraining (thematic touch is genuinely authorial), and the auto-suggestion machinery would have to scan move-family + topic vocabulary, which is not a clean engine surface.
2. No backwards-compatibility aliasing/shims introduced: prose elaboration within an existing reference subsection. No schema change. Existing bundles' SLT records keep their `forbidden_resolutions[]` values unchanged (the heuristic is forward-looking authoring guidance, not a retrofit).

## Verification Layers

1. Invariant: `phase-2-draft-blocks.md` contains a per-block `forbidden_resolutions[]` defensive-inclusion heuristic, parallel in shape to the existing `allowed_authority` heuristic → codebase grep-proof (`forbidden_resolutions` appears in a defensive-inclusion-by-thematic-territory subsection, not only in the bare schema skeleton).
2. Invariant: the heuristic consumes the firewall bodies already loaded at pre-flight step 6 (CBAUTH-001) and the bundle's `mysteries_in_play` list, with no new retrieval call → manual review (the heuristic prose references the existing inputs by name; no new pre-flight bullet is added).
3. Invariant: defensive-inclusion is forward-looking authoring guidance, not a retrofit → FOUNDATIONS alignment check (the heuristic explicitly says it applies at draft-time and does not require updating existing pool blocks; existing `forbidden_resolutions[]` values remain valid).

## What to Change

### 1. Add `forbidden_resolutions[]` defensive-inclusion heuristic

In `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md`, in or adjacent to the existing `allowed_authority` default-heuristic paragraph (line 59), add a parallel paragraph: "`forbidden_resolutions[]` defensive-inclusion heuristic — include `M-<integer>` for any forbidden-status M whose territory the block's `move_family` thematically touches, even when the block's effects do not directly resolve the mystery. The heuristic uses the M's `domains_touched` (loaded whole-class at pre-flight step 6) against the block's beats/exit-options:

- `disclosure`, `investigation` moves that surface or chase a concealed truth grounded in an M's `knowns` → defensively include that M
- `transformation`, `evasion`, `bond_shift` moves that intensify or strain against an ontological M's substrate (e.g., the world's saturation property) → defensively include that M
- `world_pressure`, `pursuit`, `conflict` moves over a hazard cohort whose perpetrator-structure is bounded by an M → defensively include that M
- `orient`, `decision`, `recovery`, `negotiation`, `resource_exchange`, `protection`, `ritual_protocol`, `status_shift` moves whose beats and exits do not touch any forbidden-M domain → `forbidden_resolutions: []` is the default and is correct

Defensive inclusion strengthens the per-block Phase 3 gate 4 firewall by surfacing a thematic-territory match the gate would otherwise miss (empty `forbidden_resolutions[]` always passes gate 4). Author judgment may add an M not enumerated by these triggers when the block's intended runtime semantics warrant it."

### 2. Worked examples grounded in the existing pool

Add a short worked-example list mirroring the SLB-1..SLB-4 conventions actually present in the red-bunny pool:

- "SLT-7 disclosure of concealed truth grounded in CF-0005/CF-0006 → `forbidden_resolutions: [M-5, M-6]` (M-5 covers captivity-network-structure boundedness; M-6 covers cross-population CF-0007 demographic claim boundedness)"
- "SLT-24 / SLT-25 / SLT-28 desire / restraint moves intensifying the ONT-1 saturation substrate → `forbidden_resolutions: [M-3]` (M-3 covers the forbidden saturation-source boundedness)"
- "SLT-1 orient block whose beats do not touch any forbidden-M domain → `forbidden_resolutions: []`"

This makes the heuristic re-derivable on any bundle by the operator examining the pool's existing convention.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (modify)

## Out of Scope

- Any new validator or hook that auto-flags missing defensive inclusion. Defensive inclusion is a thematic-touch judgment, not a mechanical check.
- Any change to Phase 3 gate 4 logic, the `mystery_policy` field schema (shared contract §4.4), or the `M-<integer>` Mystery Reserve record schema.
- Any retroactive update to existing bundle SLT records' `forbidden_resolutions[]` values. Existing values stay; the heuristic applies forward at draft time.
- A heuristic for `allowed_authority` overrides beyond what `phase-2-draft-blocks.md:59` already documents.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "forbidden_resolutions\|defensive" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` returns the defensive-inclusion heuristic paragraph and the worked-example list, not only the bare schema skeleton at line ~36-37.
2. Skill dry-run: invoke commitment-block-authoring `direct_batch --target_count 3 --focus disclosure` on `erotica-world / red-bunny` (or any bundle); confirm at least one drafted disclosure-family block carries a non-empty `forbidden_resolutions[]` derived from the new heuristic, and that the deliverable summary's per-block validation trace cites the heuristic as the authoring rationale for the chosen M ids.
3. The `validate-patch-plan` dry-run still returns `status: pass` on representative SLT batches (the heuristic is authoring guidance only; no envelope/schema impact).

### Invariants

1. Phase 2 draft-time authoring guidance for `mystery_policy.forbidden_resolutions[]` is documented at the same altitude as the existing `allowed_authority` per-move_family heuristic (symmetric documentation depth for both `mystery_policy` sub-fields).
2. The heuristic consumes inputs already loaded at pre-flight step 6 (CBAUTH-001's unconditional whole-class M load); no new pre-flight retrieval is required.
3. Phase 3 gate 4 mystery / invariant firewall enforcement logic is unchanged (FOUNDATIONS §Rule 7 — the gate continues to govern effects-vs-forbidden-resolutions compatibility; the heuristic strengthens the inputs the gate sees).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "forbidden_resolutions\|defensive\|thematic\|domains_touched" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md`
2. Skill dry-run on a representative bundle and inspect the deliverable summary's per-block `forbidden_resolutions[]` rationale against the new heuristic.
3. A grep + skill-dry-run boundary is correct here because the change is authoring-guidance prose with no envelope/schema/validator surface to exercise; the dry-run confirms the heuristic is consumed at draft time and produces non-empty `forbidden_resolutions[]` where the move thematically touches a forbidden M.
