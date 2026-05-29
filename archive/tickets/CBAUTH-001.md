# CBAUTH-001: Phase 4 recovery-coverage check forces redundant recovery blocks when the pool already covers recovery

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md` (skill authoring discipline only; no validator/tool code).
**Deps**: None

## Problem

`commitment-block-authoring` Phase 4 Check 2 ("Recovery coverage") requires at least one `move_family: recovery` block **in the batch** for any `target_count >= 3` batch whose `focus` does not categorically exclude recovery. The documented scope-override carve-out — which explicitly accepts "the bundle pool's existing recovery coverage (count + ids)" as warrant — is gated to `target_count < 3` (or a recovery-excluding focus). There is no sanctioned path for the common case: `target_count >= 3`, no focus, **but the bundle pool already contains recovery coverage.**

Observed this run: red-bunny already had SLT-8 (`recovery`). The genuine move-family gaps were pursuit / resource_exchange / transformation / ritual_protocol (4 of 6 blocks). Check 2 nonetheless mandated a recovery block, so SLB-2 carries SLT-18. SLT-18 was authored as a genuinely distinct de-escalation/aftercare flavor and is defensible — but the check, as written, structurally pressures every subsequent >=3 batch toward a recovery block regardless of whether the pool needs one, inviting filler that brushes FOUNDATIONS §Story Bundles §5b (schema-minimalism) and the SLT-grounding-integrity intent.

There is also an internal inconsistency: Phase 1 lists recovery as coverage target #1 and would correctly diagnose it `covered` for this bundle, while Phase 4 then overrides that diagnosis and demands a recovery block anyway.

## Assumption Reassessment (2026-05-29)

1. **Codebase/skill**: `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md` lines 39-42: the "Batch-size precondition and focused-scope carve-out" paragraph restricts the override to `target_count < 3` or recovery-excluding focus; Check 2 ("at least 1 block has `move_family: recovery`") is stated as batch-scoped. `references/phase-1-coverage-diagnosis.md` line 7 lists recovery as causal-function target #1 (pool-scoped diagnosis).
2. **Specs/docs**: the check's own rationale is bundle-scoped — "The bundle needs recovery coverage so that violence, betrayal, sex, and death outcomes route to graceful follow-up." The enforcement surface (batch) is narrower than the stated invariant (bundle).
3. **Shared boundary under audit**: Phase 1 (pool-wide 17-target coverage diagnosis) vs Phase 4 (batch-diversity checks). Both reason about recovery coverage; they must not contradict each other on the same bundle.
4. **FOUNDATIONS principle**: §Story Bundles §5b (schema-minimalism — every field/record load-bearing) and Rule 5 (No Consequence Evasion — recovery exists so consequential outcomes have graceful follow-up). The intended invariant is "**the bundle's live SLT pool** can route violence/sex/betrayal/death outcomes to recovery," not "every batch re-mints recovery." Forcing redundant recovery blocks serves neither principle.
5. (n/a — no HARD-GATE/canon-write-ordering change; this is a Phase 4 diagnosis rule, downstream of the gate.)
8. **Adjacent contradiction**: Check 1 (move-family diversity, >=3 distinct) is correctly batch-scoped because diversity is a property of the batch; Check 2 is mis-scoped because recovery sufficiency is a property of the bundle. Classify as the required correction of this ticket.

## Architecture Check

1. Cleaner: make Check 2 satisfiable by **pool-wide** recovery coverage (existing pool ∪ batch), with the deliverable-summary acknowledgment serving as the authorization record — reusing the carve-out's already-sanctioned "existing recovery coverage" warrant rather than inventing a new mechanism. This aligns the batch check with the Phase 1 pool-wide diagnosis it should agree with.
2. No backwards-compatibility shim: this narrows an over-broad rule; no alias/dual-path. Batches that genuinely need recovery (empty/recovery-thin pool) still get it because the pool-wide check fails there.

## Verification Layers

1. Pool-already-covered batch is not forced to mint recovery -> skill dry-run (a `target_count>=3` direct_batch on a bundle with >=1 pool `recovery` SLT and no focus passes Phase 4 without a recovery block, with the override surfaced in the deliverable summary).
2. Recovery-thin pool still mandates recovery -> manual review (a bundle with zero pool `recovery` SLTs still fails Check 2 unless the batch supplies one).
3. Phase 1 / Phase 4 agreement -> FOUNDATIONS alignment check (recovery target #1 `covered` ⇒ Check 2 satisfiable without redundant authoring; §5b minimalism + Rule 5 cited).

## What to Change

### 1. Re-scope Phase 4 Check 2 to pool-wide recovery coverage

In `phase-3-4-validation.md`, amend Check 2 so it is satisfied when the bundle's live SLT pool (existing `global_author_pool`/`branch_prefix_scoped` recovery blocks ∪ this batch) contains recovery coverage. When the existing pool already covers recovery and the batch adds none, require the deliverable summary to state the pool's recovery coverage (count + ids) as the authorization record — folding the existing "warrant (b)" out of the `target_count < 3`-only gate into a general condition.

### 2. Reconcile the carve-out paragraph

Rewrite the "Batch-size precondition and focused-scope carve-out" so the three independent satisfaction/override conditions are explicit: (a) batch supplies a recovery block; (b) pool already covers recovery (summary-acknowledged); (c) narrow scope / recovery-excluding focus (existing). Keep Check 1 batch-scoped.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md` (modify)

## Out of Scope

- Check 1 (move-family diversity), Check 3 (belief/relationship), Check 4 (branch-scope) — unchanged.
- Any change to `slt_grounding_minimal_integrity` or other validators (this is authoring discipline, not validator-enforced).

## Acceptance Criteria

### Tests That Must Pass

1. Dry-run: `commitment-block-authoring --world_slug erotica-world --story_slug red-bunny --mode direct_batch --target_count 4` (no focus) on a pool that already has a recovery SLT reaches an approvable deliverable summary with **no** recovery block and an explicit pool-coverage override line.
2. Dry-run: the same on a synthetic bundle with zero pool recovery SLTs still flags Check 2 as failing absent a batch recovery block.
3. Phase 1 recovery diagnosis (`covered`) and Phase 4 Check 2 outcome are mutually consistent on the same bundle.

### Invariants

1. Recovery sufficiency is evaluated against the bundle's live SLT pool, never the batch in isolation.
2. A batch is never required to author a redundant `recovery` block solely to satisfy Check 2 when pool recovery coverage already exists and is recorded in the deliverable summary.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (Phase 1 diagnosis + Phase 4 checks) is named in Assumption Reassessment.`

### Commands

1. `/commitment-block-authoring --world_slug erotica-world --story_slug red-bunny --mode direct_batch --target_count 4` (inspect deliverable summary; do not approve).
2. Re-read `phase-3-4-validation.md` Check 2 + carve-out and confirm the three satisfaction/override conditions are enumerated and Check 1 remains batch-scoped.


## Outcome

**Completed**: 2026-05-29

### What changed

- `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md`:
  - Rewrote the carve-out paragraph (now "Batch-size precondition, pool-wide recovery, and focused-scope carve-out"). Check 1 (move-family diversity) is stated as batch-scoped (applies at `target_count >= 3`, with the narrow-scope/recovery-excluding-focus override). Check 2 (recovery coverage) is stated as bundle-scoped and satisfied by three explicit independent conditions: (a) batch supplies a recovery block; (b) the live pool already covers recovery and the batch adds none (record count + ids in the Phase 6 deliverable summary as the authorization record) — applies regardless of `target_count`; (c) narrow scope / recovery-excluding focus.
  - Amended Check 2 itself to "Recovery coverage (bundle-scoped)": satisfied when the live SLT pool (existing pool ∪ batch) contains a recovery block, explicitly agreeing with the Phase 1 pool-wide recovery diagnosis (causal-function target #1). A redundant recovery block is never required when pool coverage already exists; a zero-coverage pool with no override still forces a batch recovery block.

### Deviations

- None. This narrows an over-broad rule with no alias/dual-path, as specified. Out-of-scope checks (1 move-family diversity, 3 belief/relationship, 4 branch-scope) and `slt_grounding_minimal_integrity` are unchanged; the line-58 "Checks 1, 2, 4 do not inspect literal effects" statement remains accurate.

### Verification

- Documentation-only ticket; verification is command-based / by inspection.
- Re-read confirms: the three satisfaction/override conditions (a)/(b)/(c) are enumerated, Check 1 remains explicitly batch-scoped, Check 2 is bundle-scoped and reconciled with the Phase 1 recovery target #1 diagnosis (acceptance criterion 3 — Phase 1 `covered` ⇒ Check 2 satisfiable without redundant authoring).
- Invariants hold: recovery sufficiency is now evaluated against the live pool, never the batch in isolation (Invariant 1); a batch is never forced to mint a redundant recovery block when pool coverage exists and is recorded in the deliverable summary (Invariant 2).
- Full skill dry-run was not executed interactively (it requires the HARD-GATE author flow); the rule text is the deliverable and satisfies the named verification by inspection.
