# BSBOOT-017: Tighten Phase 11 atomicity wording (staged commit, not single transaction)

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/SKILL.md` + Phase 6 + Phase 7 references + template comment only.
**Deps**: none

## Problem

The skill describes Phase 11 as a "single transaction" in multiple places, but the actual mechanism is staged-commit with documented partial-failure recovery:

- `SKILL.md:171` — output section heading: "Story bundle structure (single transaction)".
- `references/phase-6-storylet-pool-seed.md:3, 26` — "Phase 11 single transaction" / "Phase 11's single transaction".
- `references/phase-7-root-page-render.md:68` — "Phase 11 inside the atomic transaction".
- `templates/story-records.yaml:199` — "Bootstrap's Phase 11 atomic transaction writes the delegated batch's SLT files".

The actual mechanism per `SKILL.md:283-297` is six discrete steps:

1. Directory setup with `mkdir -p` + `.gitkeep` files.
2. Direct `Write` of `STORY_KERNEL.md`.
3. Patch-engine submission of all `_source/<class>/*.yaml` records (this IS atomic per the engine).
4. Direct `Write` of `pages-prose/PG-0001.md`.
5. Direct `Write` of per-bundle `INDEX.md`.
6. Direct `Edit` of per-world `stories/INDEX.md` (last so partial failure does not poison discoverability).

`SKILL.md:295` explicitly documents: "if patch-engine submission fails, no `_source` YAML should land … If a later markdown write fails, the user receives the failure with the specific path and instruction to either manually clean up the partial bundle or repair the markdown surface." That's not a single transaction — it's a staged commit with a documented partial-failure recovery path.

The contradiction is wording-only. The mechanism is fine: per-world INDEX.md last gives the user a clean reset path; slug-collision check at Pre-flight prevents re-runs from clobbering a partial bundle. But "single transaction" overclaims the atomicity guarantee in a way that's misleading for any reader who tries to reason about failure modes.

## Assumption Reassessment (2026-05-06)

1. `SKILL.md:171, 283-297` — verified wording vs. mechanism mismatch.
2. `references/phase-6-storylet-pool-seed.md:3, 26` and `phase-7-root-page-render.md:68` and `templates/story-records.yaml:199` — verified additional "single transaction" / "atomic transaction" wording instances.
3. `docs/HARD-GATE-DISCIPLINE.md` documents the engine's approval-token + envelope discipline; the patch-engine envelope IS a single atomic transaction for the YAML records, but the bootstrap's Phase 11 is broader (markdown writes happen outside the engine envelope).
4. Cross-skill / cross-artifact boundary: this is a wording change only. No cross-skill contract is touched.
5. FOUNDATIONS / hard-gate principle: the HARD-GATE itself is unchanged. The wording fix does not relax any gate.
6. Schema-extension classification: pure documentation. No record, schema, or engine-op change.
7. ChatGPT-Pro's `.bootstrap-in-progress` marker proposal is explicitly NOT included in this ticket per the triage manifest (`docs/triage/2026-05-06-branching-story-bootstrap-fixes-triage.md` §Follow-ups identified). The existing slug-collision check + per-world-INDEX-last ordering already gives a clean reset; introducing a marker file is overengineering for the failure modes the existing mechanism already covers.

## Architecture Check

1. **Why cleaner**: "staged commit (engine YAML transaction + sequenced markdown writes)" accurately describes what Phase 11 does — the engine envelope IS atomic for `_source/<class>/*.yaml` records (single submit_patch_plan call); the surrounding markdown writes are sequential. Readers reasoning about failure modes see the truth.
2. No backwards-compatibility shim. Wording change only.

## Verification Layers

1. SKILL.md output heading + Phase 11 step-list intro use "staged commit" wording → codebase grep-proof.
2. Phase 6 + Phase 7 references and the templates/story-records.yaml comment use the same vocabulary → codebase grep-proof.
3. The existing partial-failure recovery instructions at `SKILL.md:295` are preserved → manual review.
4. The patch-engine transaction (the YAML write subset of Phase 11) is still correctly described as atomic for `_source/<class>/*.yaml` records → manual review.

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Line 169-171 (Output heading): change "### Story bundle structure (single transaction)" to "### Story bundle structure (staged commit — engine YAML transaction + sequenced markdown writes)".
- Line 283 (Phase 11 intro): retain the existing accurate wording ("Directory setup plus a patch-engine transaction for atomic YAML records, followed by direct markdown writes…"). The next sentence's "File order matters — the per-world INDEX.md is the LAST direct write so partial failure leaves the per-world index unmutated" is also correct. No edits needed in this block; it's the heading that overclaims.
- Add one sentence at the end of the Phase 11 intro paragraph (after line 283's period): "The phase is a staged commit, not a single all-or-nothing transaction: the engine envelope is atomic for `_source/<class>/*.yaml` records, but the surrounding markdown writes (STORY_KERNEL.md, pages-prose/PG-0001.md, per-bundle INDEX.md, per-world INDEX.md) are sequential and recoverable per the partial-failure note below."

### 2. `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`

- Line 3: replace "Bootstrap assigns final SLT ids and writes the records inside its Phase 11 single transaction." with "Bootstrap writes the records inside Phase 11's staged commit (the engine envelope holds all `_source/storylets/SLT-*.yaml` writes atomically; markdown writes are sequenced separately)." (After BSBOOT-012 lands, the "Bootstrap assigns final SLT ids" portion is moot — pre-allocation handles ids — but this ticket's wording fix stands regardless of BSBOOT-012's status.)
- Line 26: replace "writes the returned records in Phase 11's single transaction" with "writes the returned records in Phase 11's staged commit (engine YAML transaction subset)".

### 3. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md`

- Line 68: replace "disk write happens at Phase 11 inside the atomic transaction" with "disk write happens at Phase 11's staged commit (engine YAML transaction for `_source/<class>/*.yaml` records; sequenced markdown writes for STORY_KERNEL.md, pages-prose/PG-0001.md, INDEX.md)".

### 4. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- Line 199: replace "Bootstrap's Phase 11 atomic transaction writes the delegated batch's SLT files" with "Bootstrap's Phase 11 staged commit writes the delegated batch's SLT files (engine YAML transaction subset)".

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

1. `grep -nE "single transaction" .claude/skills/branching-story-bootstrap/` returns no matches.
2. `grep -nE "atomic transaction" .claude/skills/branching-story-bootstrap/` returns no matches as a description of Phase 11 at large (the engine subset MAY still be described as the "engine YAML transaction" or "atomic for YAML records" — that's accurate).
3. `grep -nE "staged commit" .claude/skills/branching-story-bootstrap/` returns matches in SKILL.md, both reference files, and the templates comment.
4. The existing partial-failure recovery paragraph at `SKILL.md:295` is preserved unchanged.

### Invariants

1. The Phase 11 mechanism is unchanged — only wording.
2. The engine envelope's atomicity for `_source/<class>/*.yaml` records is still accurately described.
3. The per-world INDEX.md ordering rule (last) is preserved.
4. No new artifact (marker file, BOOTSTRAP_INCOMPLETE.md) is introduced.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "single transaction\|atomic transaction" .claude/skills/branching-story-bootstrap/` — expected: no surviving "single transaction" matches; "atomic transaction" only appears (if at all) qualified to the engine YAML subset.
2. `grep -rn "staged commit" .claude/skills/branching-story-bootstrap/` — confirms new wording is present in SKILL.md, both phase references, and the templates comment.
3. `grep -n "Partial-failure recovery" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms the recovery paragraph is preserved.
