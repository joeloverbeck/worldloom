# BSBOOT-017: Tighten Phase 11 atomicity wording (staged commit, not single transaction)

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/SKILL.md` + Phase 6 + Phase 7 references + template comment only.
**Deps**: none

## Problem

At intake, the skill described Phase 11 as a "single transaction" in multiple bootstrap-owned places, but the actual mechanism was staged-commit with documented partial-failure recovery:

- `.claude/skills/branching-story-bootstrap/SKILL.md` — output section heading: "Story bundle structure (single transaction)".
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` — Phase 11 "transaction" wording for returned SLT records.
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — "Phase 11 inside the atomic transaction".
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` — "Bootstrap's Phase 11 atomic transaction writes the delegated batch's SLT files".

The actual mechanism in `.claude/skills/branching-story-bootstrap/SKILL.md` is six discrete steps:

1. Directory setup with `mkdir -p` + `.gitkeep` files.
2. Direct `Write` of `STORY_KERNEL.md`.
3. Patch-engine submission of all `_source/<class>/*.yaml` records (this IS atomic per the engine).
4. Direct `Write` of `pages-prose/PG-0001.md`.
5. Direct `Write` of per-bundle `INDEX.md`.
6. Direct `Edit` of per-world `stories/INDEX.md` (last so partial failure does not poison discoverability).

The Phase 11 partial-failure paragraph explicitly documents: "if patch-engine submission fails, no `_source` YAML should land ... If a later markdown write fails, the user receives the failure with the specific path and instruction to either manually clean up the partial bundle or repair the markdown surface." That's not a single transaction across the whole story bundle — it's a staged commit with a documented partial-failure recovery path.

The contradiction was wording-only. The mechanism is fine: per-world INDEX.md last gives the user a clean reset path; slug-collision check at Pre-flight prevents re-runs from clobbering a partial bundle. But "single transaction" overclaimed the atomicity guarantee in a way that was misleading for any reader who tries to reason about failure modes.

## Assumption Reassessment (2026-05-06)

1. `.claude/skills/branching-story-bootstrap/SKILL.md` — verified wording vs. mechanism mismatch: the output heading overclaimed whole-bundle transactionality, while Phase 11 already described patch-engine YAML submission followed by direct markdown writes and partial-failure recovery.
2. `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`, `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md`, and `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` — verified additional bootstrap-owned "transaction" / "atomic transaction" wording instances.
3. `docs/HARD-GATE-DISCIPLINE.md` documents the engine's approval-token + envelope discipline; the patch-engine envelope IS a single atomic transaction for the YAML records, but the bootstrap's Phase 11 is broader (markdown writes happen outside the engine envelope).
4. Cross-skill / cross-artifact boundary: this is a wording change only. No cross-skill contract is touched. Similar page-cycle and storylet-pool transaction wording is sibling workflow scope and remains excluded.
5. FOUNDATIONS / hard-gate principle: the HARD-GATE itself is unchanged. The wording fix does not relax any gate.
6. Schema-extension classification: pure documentation. No record, schema, or engine-op change.
7. ChatGPT-Pro's `.bootstrap-in-progress` marker proposal is explicitly NOT included in this ticket per the triage manifest (`docs/triage/2026-05-06-branching-story-bootstrap-fixes-triage.md` §Follow-ups identified). The existing slug-collision check + per-world-INDEX-last ordering already gives a clean reset; introducing a marker file is overengineering for the failure modes the existing mechanism already covers.

## Architecture Check

1. **Why cleaner**: "staged commit (engine YAML transaction + sequenced markdown writes)" accurately describes what Phase 11 does — the engine envelope IS atomic for `_source/<class>/*.yaml` records (single submit_patch_plan call); the surrounding markdown writes are sequential. Readers reasoning about failure modes see the truth.
2. No backwards-compatibility shim. Wording change only.

## Verification Layers

1. SKILL.md output heading + Phase 11 step-list intro use "staged commit" wording → codebase grep-proof.
2. Phase 6 + Phase 7 references and the templates/story-records.yaml comment use the same vocabulary → codebase grep-proof.
3. The existing partial-failure recovery instructions in `.claude/skills/branching-story-bootstrap/SKILL.md` are preserved → manual review.
4. The patch-engine transaction (the YAML write subset of Phase 11) is still correctly described as atomic for `_source/<class>/*.yaml` records → manual review.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Changed the output heading to "Story bundle structure (staged commit - engine YAML transaction + sequenced markdown writes)".
- Added Phase 11 intro wording that states the phase is a staged commit, not a single all-or-nothing transaction: the engine envelope is atomic for `_source/<class>/*.yaml` records, while surrounding markdown writes are sequential and recoverable per the partial-failure note below.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`

- Replaced Phase 11 transaction wording with staged-commit wording that distinguishes the engine envelope's atomic `_source/storylets/SLT-*.yaml` writes from sequenced markdown writes.
- Added staged-commit wording to the returned-records paragraph.

### 3. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md`

- Replaced "inside the atomic transaction" with staged-commit wording that names the engine YAML transaction and sequenced markdown writes.

### 4. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- Replaced "atomic transaction" with staged-commit wording for the delegated SLT batch and identified the engine YAML transaction subset.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)

## Out of Scope

- Adding a `.bootstrap-in-progress` marker file. Per the triage manifest's §Follow-ups identified, this is overengineering for the failure modes the existing mechanism already covers.
- Adding a `BOOTSTRAP_INCOMPLETE.md` artifact on partial failure. The existing instruction (cite the failed path; let the operator clean up) is sufficient.
- Changing the actual mechanism (engine envelope, markdown write order, per-world-INDEX-last).
- Migration of any existing committed bundle whose docs use the old wording.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "single transaction\|atomic transaction" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns no matches.
2. `grep -rn "staged commit" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns matches in SKILL.md, both reference files, and the templates comment.
3. `grep -n "Partial-failure recovery" .claude/skills/branching-story-bootstrap/SKILL.md` confirms the recovery paragraph is preserved.

### Invariants

1. The Phase 11 mechanism is unchanged — only wording.
2. The engine envelope's atomicity for `_source/<class>/*.yaml` records is still accurately described.
3. The per-world INDEX.md ordering rule (last) is preserved.
4. No new artifact (marker file, BOOTSTRAP_INCOMPLETE.md) is introduced.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "single transaction\|atomic transaction" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — confirms no surviving stale bootstrap-owned transaction wording remains in the edited surfaces.
2. `grep -rn "staged commit" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — confirms new wording is present in SKILL.md, both phase references, and the templates comment.
3. `grep -n "Partial-failure recovery" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms the recovery paragraph is preserved.

## Outcome

Completed: 2026-05-06.

Completed the wording-only correction for bootstrap Phase 11. The bootstrap skill now names the story-bundle write as a staged commit and explicitly distinguishes the engine YAML transaction subset from sequenced markdown writes. Phase 6, Phase 7, and the story-record template now use the same vocabulary.

No engine behavior, schema, HARD-GATE approval path, marker file, or world content changed.

## Verification Result

1. `grep -rn "single transaction\|atomic transaction" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — passed; no stale matches in the edited bootstrap-owned surfaces.
2. `grep -rn "staged commit" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — passed; matches appear in SKILL.md, both reference files, and the template comment.
3. `grep -n "Partial-failure recovery" .claude/skills/branching-story-bootstrap/SKILL.md` — passed; the partial-failure recovery paragraph remains present and unchanged except for line movement caused by the added Phase 11 sentence above it.
4. Manual review against `docs/HARD-GATE-DISCIPLINE.md` — passed; this ticket preserves engine atomicity wording for `_source` YAML records and does not relax approval, token, validate, submit, or pre-apply validation behavior.
5. `git diff --check` — passed.

## Deviations

- The broad discovery sweep found `single transaction` / `atomic transaction` wording in sibling workflows (`branching-story-page-cycle` and `storylet-pool-authoring`) and in `branching-story-bootstrap/references/engine-envelope-shape.md` partial-failure guidance. Those are intentionally outside BSBOOT-017 because they describe other workflow semantics or engine-envelope behavior, not bootstrap's whole Phase 11 story-bundle commit.
