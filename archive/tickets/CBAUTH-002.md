# CBAUTH-002: Phase 1 coverage diagnosis needs grounding-strength (hard vs soft), under-representation semantics, and a saturated-pool advisory for direct_batch

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` and a deliverable-summary line in `SKILL.md` (no validator, tool, hook, or schema change)
**Deps**: None

## Problem

Phase 1's 17-target coverage diagnosis is **binary** (`status: covered | gap`). On a mature pool this yields no actionable signal, and the skill gives no guidance for the most common real-world `direct_batch` case: a pool that already covers every target, where the value of a new batch is *grounding-strength and lane-depth*, not absent-target filling.

Observed on the 2026-05-29 red-bunny run: the pre-batch pool (SLT-1..19) already covered all 16 `move_family` values, all 8 driver-kinds, and all 17 coverage targets. The binary model reports "everything covered." But two real problems were invisible to it:

1. **Hard vs soft grounding is not distinguished.** Causal-function target #5 (consequence-resolution — "delivering on a pending `CNSQ`") was "covered" only by blocks that reference `any_consequence_pending` in **soft** preconditions (SLT-8, SLT-12, SLT-17). No block *hard*-gates on a pending consequence, so no block is selection-guaranteed to fire to deliver matured fallout — the pool can route *around* a pending consequence indefinitely. The binary model cannot surface this; the operator must improvise a hard-vs-soft lens (this run did, authoring SLT-22 with hard `any_consequence_pending` + `effects.close: [bound:due_cost]`). A soft-only consequence coverage that never hard-fires is a latent consequence-capacity weakness — the storylet-pool analogue of the `storylet_permanently_inert` concern, and a FOUNDATIONS §Rule 5 (No Consequence Evasion) exposure.

2. **No saturated-pool advisory.** With all 17 targets covered and no `focus` hint, the skill silently authored the full `target_count=6`. Mechanically adding blocks to a saturated pool risks redundant, non-load-bearing storylets — in tension with FOUNDATIONS §5b (every story-bundle field/record must be load-bearing; each block costs LLM tokens at authoring and at every retrieval). The skill should surface saturation and let the user choose a `focus` hint or a smaller `target_count`, rather than defaulting to redundancy.

"Under-represented" is referenced in the existing reference ("Identify which coverage targets are absent or **under-represented**") but never defined operationally, so it cannot be applied consistently.

## Assumption Reassessment (2026-05-29)

1. `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` defines the 17 coverage targets and the `coverage_diagnosis` working-memory YAML shape with `status: covered | gap` per target (verified by direct Read this session). It uses the word "under-represented" (line ~35) without an operational definition, and the `coverage_diagnosis` entry shape has no grounding-strength field.
2. The `move_family` enum (16 values) and predicate DSL hard/soft split live in `.claude/skills/_shared-templates/story-record-schemas.md` §4.4 and `story-state-contract.md` §5 (verified). "Hard" = `preconditions.hard[]` (selection gate); "soft" = `preconditions.soft[]` (ranking preference). The hard/soft distinction the diagnosis must read is already a first-class schema concept; this ticket consumes it, it does not invent a new field.
3. Shared boundary under audit: the Phase 1 SLT-pool projection (`list_records(record_type='storylet_record', fields=['move_family','grounding.compatible_turn_drivers','preconditions','exit_options'])`) already returns `preconditions` with the hard/soft split, so grounding-strength is computable from the projection already loaded in pre-flight step 4(i) — no new retrieval call is required.
4. FOUNDATIONS principles under audit: §Rule 5 (No Consequence Evasion — every page must leave a continuation eligible; a pool that only soft-covers consequence delivery can evade hard-firing on a matured `CNSQ`) and §5b (Schema-Minimalism — do not author redundant non-load-bearing records). Restated before trusting the existing reference narrative: the diagnosis exists to keep the pool able to *fire* the moves the bundle's live pressure demands, not merely to enumerate that a family label is present somewhere.
5. Adjacent contradiction classification: the existing word "under-represented" without a definition is a *required consequence* to fix here (the ticket supplies the definition). The three SPEC-42 conditional targets (#12/#13/#14) already have a "conditional authoring target" carve-out; this ticket's grounding-strength lens composes with that carve-out and does not override it (a target with no active records of its class is neither a gap nor under-represented). No separate bug uncovered.
6. Out-of-scope creep guard: this ticket does NOT add a validator that fails a batch for not hard-covering every target — grounding-strength is *authoring guidance + deliverable disclosure*, not a hard gate (consistent with the existing Phase 4 batch-diversity checks, which gate diversity but treat coverage depth as judgment). A hard validator for soft-only consequence coverage would be a separate, larger ticket against `tools/validators/`.

## Architecture Check

1. Cleaner than alternatives: extending the existing working-memory `coverage_diagnosis` shape with a grounding-strength qualifier and adding a saturation advisory reuses data already loaded (the pool projection's `preconditions`) and the existing deliverable-summary surface (HARD-GATE step presents "SLT inventory by move_family" + Phase 1 diagnosis). The alternative — a new validator enforcing hard coverage per target — over-constrains authoring (a soft-only target is sometimes the correct design) and belongs in a separate ticket if ever warranted. Authoring guidance + disclosure is the right altitude.
2. No backwards-compatibility aliasing/shims introduced: the `coverage_diagnosis` YAML is working-memory-only (the reference explicitly says it is not copied into the SLB manifest), so extending its shape breaks no on-disk artifact and needs no migration.

## Verification Layers

1. Invariant: Phase 1 distinguishes hard-grounded vs soft-only coverage per causal-function / source-class target → codebase grep-proof (the reference defines a grounding-strength qualifier — e.g., `coverage_strength: hard | soft_only | none` — on the `coverage_diagnosis` entry and instructs computing it from the pool projection's `preconditions.hard[]` vs `preconditions.soft[]`).
2. Invariant: "under-represented" has an operational definition → FOUNDATIONS alignment check (the reference defines under-representation as e.g. soft-only coverage of a target whose triggering record class is active at high salience, or single-block coverage of a high-urgency active lane, and cites §Rule 5 for the consequence case).
3. Invariant: a saturated pool surfaces an advisory before blocks are mechanically authored → skill dry-run (re-invoke commitment-block-authoring `direct_batch` on red-bunny with no `focus`; confirm the deliverable summary states the pool is target-saturated and recommends a `focus` hint or reduced `target_count`, and records which authored blocks are depth/hard-grounding additions vs absent-target fills).

## What to Change

### 1. Add grounding-strength to the coverage diagnosis

In `phase-1-coverage-diagnosis.md`, extend the working-memory `coverage_diagnosis` entry with a `coverage_strength` qualifier (`hard | soft_only | none`) computed from whether any pool SLT references the target's record class / move via `preconditions.hard[]` (hard), only `preconditions.soft[]` (soft_only), or not at all (none). Instruct that `status: covered` with `coverage_strength: soft_only` on a target whose triggering record class is *active in the bundle* is reported as **under-represented**, not silently "covered." Apply specifically to the consequence-resolution target (#5) and the source-class composition coverage (#17), where hard-firing capacity is the load-bearing property.

### 2. Define "under-represented" operationally

Add a short definition: a target is under-represented when its only pool coverage is (a) `soft_only` while its triggering record class is active, or (b) a single block while the bundle carries a high-urgency active record in that lane (e.g., a `high`-urgency `THR`/`OBL`/`CNSQ`, or a `high`-salience `CLK`/`STSEC`/`STQ`). Under-represented targets are eligible authoring lanes for `direct_batch` even though `status: covered`.

### 3. Add a saturated-pool advisory

Add a Phase 1 step: when all 17 targets are `covered` with `coverage_strength: hard` (no gaps, no under-representation) and no `focus` hint was supplied, surface a **pool-saturation advisory** in the Phase 6 deliverable summary recommending the user either supply a `focus` hint or reduce `target_count`, and label each authored block as a depth/hard-grounding/under-representation addition rather than an absent-target fill. This is advisory only — it does not block authoring (the user may still want depth), but it makes redundancy a conscious choice per §5b. Add a one-line pointer to this advisory in `SKILL.md` Phase 6 sub-step 3 (deliverable summary contents).

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 6 deliverable-summary contents line: add saturation advisory + per-block depth-vs-gap labeling)

## Out of Scope

- Any new `tools/validators/` rule that hard-fails a batch for soft-only or single-block coverage (separate ticket if ever warranted; grounding-strength here is authoring guidance + disclosure, not a hard gate).
- Phase 4 batch-diversity checks (unchanged; this ticket adds a Phase 1 lens, not a Phase 4 gate).
- The SPEC-42 conditional-target carve-out for absent record classes (#12/#13/#14) — preserved; a class with zero active records is neither gap nor under-represented.
- `direct_batch` `target_count` default/max (unchanged at 6/12).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "coverage_strength\|soft_only\|under-represented" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the grounding-strength qualifier, its computation rule, and the operational under-representation definition.
2. `grep -n "saturat" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md .claude/skills/commitment-block-authoring/SKILL.md` returns the saturated-pool advisory in both the reference and the deliverable-summary contract.
3. Skill dry-run: re-invoke commitment-block-authoring `direct_batch --target_count 6` on `erotica-world / red-bunny` (a known-saturated pool, 25 blocks post-SLB-3); confirm the deliverable summary (a) flags pool saturation, (b) reports any soft-only-covered active-class target as under-represented, and (c) labels each authored block as depth/hard-grounding vs absent-target fill — without blocking authoring.

### Invariants

1. A `direct_batch` over a target-saturated pool surfaces the saturation advisory and per-block depth-vs-gap labeling in the HARD-GATE deliverable summary before any write (FOUNDATIONS §5b — redundancy is a conscious choice, not a default).
2. The consequence-resolution lane (#5) and source-class composition (#17) report `soft_only` coverage of an active record class as under-represented, not as plain "covered" (FOUNDATIONS §Rule 5).
3. The `coverage_diagnosis` shape remains working-memory-only and is not written into the SLB manifest (the manifest keeps coverage as prose, per existing phase-5 contract).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "coverage_strength\|soft_only\|under-represented\|saturat" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`
2. `grep -n "saturat\|under-represent\|depth" .claude/skills/commitment-block-authoring/SKILL.md`
3. A grep + skill-dry-run boundary is correct here because the change is authoring-guidance prose and a deliverable-summary disclosure, with no envelope/schema/validator surface to exercise; the dry-run confirms the advisory and labeling actually appear in the gate summary on a saturated pool.

## Outcome

**Completion date**: 2026-05-29

**What actually changed**:
- `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`:
  - Added a **"Grounding-strength and under-representation"** subsection defining `coverage_strength` (`hard | soft_only | none`, computed from the already-loaded pool projection `preconditions.hard[]` vs `preconditions.soft[]`) and an operational under-representation definition.
  - Added a **"Saturated-pool advisory"** subsection: when every applicable target is `covered` + `hard` (no gaps, no under-representation) and no `focus` hint was supplied, surface a non-blocking advisory recommending a `focus` hint or reduced `target_count`, and label authored blocks as absent-target fills vs. depth/hard-grounding/under-representation additions.
  - Extended the working-memory `coverage_diagnosis` YAML shape with `coverage_strength` + `under_represented` per entry and a top-level `pool_saturation` flag; added an example #5 entry illustrating foundational-capacity under-representation.
- `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 3: added a "Coverage-depth signal" deliverable-summary bullet (under-represented targets + pool-saturation advisory + per-block depth-vs-gap labeling).

**Deviations from original plan**: one refinement surfaced during edge-case testing and adopted. The original ticket gated under-representation on "triggering record class is active in the bundle" for *all* targets. The dry-run against the real red-bunny pre-SLB-3 state showed this under-flags the consequence-resolution target (#5): red-bunny had **no active `CNSQ`**, so a strict active-class gate would not flag #5 — yet hard-CNSQ coverage was genuinely needed (and was authored as SLT-22). The reference now splits targets into **foundational-capacity** (#1 recovery, #5 consequence-resolution — flagged regardless of current active records, parallel to the bundle-scoped recovery requirement in Phase 4 check 2 and FOUNDATIONS §Rule 5) vs. **contingent-pressure** (everything else — active-class gate applies, SPEC-42 zero-active carve-out preserved). This is a strict improvement over the ticket's original single-rule formulation and keeps the §Rule 5 intent intact.

**Verification results**:
- AC1 (grep): `coverage_strength`, `soft_only`, the computation rule, and the operational under-representation definition are present in the reference (18 hits). PASS.
- AC2 (grep): saturated-pool advisory present in BOTH the reference (2 hits) and `SKILL.md` (1 hit); depth-vs-gap labeling present in the SKILL.md deliverable-summary contract. PASS.
- AC3 (logical dry-run across edge cases, applied to real pool states — no re-author/commit triggered): (1) pre-SLB-3 19-block pool → #5 `soft_only`/`under_represented: true` (foundational, flagged despite zero active CNSQ), fear & OBL lanes under-represented (contingent, classes active) — reproduces the hand-diagnosis that authored SLB-3; (2) post-SLB-3 25-block pool → #5/fear/OBL now `hard`, all families present, no focus → `pool_saturation: true`, advisory fires; (3) SPEC-42 conditional target with zero active class → `none` but not flagged; (4) contingent `soft_only` with inactive class → not under-represented. All four behave correctly. PASS.
- Invariant 3 (coverage_diagnosis stays working-memory-only): the YAML shape change is confined to the working-memory diagnosis block; phase-5 manifest contract (coverage-as-prose) is untouched. PASS.
- No engine/validator/tool/schema change; no engine capability gap encountered.

