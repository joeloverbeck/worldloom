# BSBOOT-012: Pre-allocate SLT id range before storylet-pool-authoring delegation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Cross-skill prose change (`branching-story-bootstrap` Phase 6 + `storylet-pool-authoring` `parent_skill_invocation: true` contract + triage scope note). No engine, validator, or schema code change.
**Deps**: archive/tickets/BSBOOT-011.md (the pre-allocation count depends on the completed scale-aware `target_pool_size` formula).

## Problem

At intake, `storylet-pool-authoring/SKILL.md:211, 221` documented the parent-skill-invocation contract for bootstrap seed mode:

> "When `parent_skill_invocation: true`, no files are written by this skill. The output is an in-memory return packet … `branching-story-bootstrap` assigns final SLT ids and writes seed records during its Phase 11 transaction."
> "For `parent_skill_invocation: true` bootstrap seed generation, this skill does not allocate `SLB` and does not reserve the SLT range itself. `branching-story-bootstrap` owns final SLT id assignment because it is constructing a new story bundle and writes the returned storylets inside its Phase 11 transaction."

But by the time bootstrap reaches Phase 11, downstream records have already been constructed referencing SLT ids:

- `PG-0001.storylet_realized` (Phase 7, `templates/story-records.yaml:286`) references the chosen genesis SLT id.
- `CHC-NNNN` continuation references (Phase 8, `references/phase-8-choice-generation.md:45`) check the seed pool for matching storylets — i.e. reference SLT ids.
- `OBL.coverage_cache.compatible_storylets[]` (`templates/story-records.yaml:142`) is "advisory only" but populated against the seed pool — i.e. reference SLT ids.

Before this ticket, if Phase 6 returned SLT records without final ids, then Phases 7-8 either (a) referenced provisional/symbolic ids that needed a late remap pass, or (b) froze the in-memory id assignment between Phase 6 and Phase 11, with Phase 11 doing a no-op remap. Either path was fragile: a remap pass that missed any record (a forgotten OBL.coverage_cache entry, a CHC continuation that captured the provisional id) could leave a dangling reference at write time.

## Assumption Reassessment (2026-05-06)

1. `storylet-pool-authoring/SKILL.md:211` — verified.
2. `storylet-pool-authoring/SKILL.md:221` — verified ("does not reserve the SLT range itself" for `parent_skill_invocation: true`).
3. `templates/story-records.yaml:142, 286` — OBL.coverage_cache and PG.storylet_realized reference SLT ids. Verified.
4. `references/phase-8-choice-generation.md:45` — CHC continuations reference seed-pool SLTs. Verified.
5. Cross-skill / cross-artifact boundary: the contract surface is `parent_skill_invocation: true` between bootstrap and storylet-pool-authoring. The change inverts the id-ownership: bootstrap pre-allocates the range, storylet-pool-authoring's seed sub-routine consumes it.
6. FOUNDATIONS / hard-gate principle: Phase 9 gate 12 (recursive reference closure) is the bootstrap-time backstop for dangling refs. BSBOOT-008 broadens gate 12's closure root to PG-0001; this ticket prevents the most-likely dangling-ref source by removing the late-binding window entirely. The two tickets are complementary — BSBOOT-008 catches what slips through; BSBOOT-012 prevents most slips.
7. Schema-extension classification: this is a delegation-contract change. The bootstrap pre-allocates by calling `mcp__worldloom__allocate_next_id(world_slug, 'SLT', story_slug=<story-slug>)` N times before delegating; storylet-pool-authoring's seed sub-routine accepts a new caller-supplied argument (`target_slt_ids[]`) and emits SLT records using those ids in deterministic order. Unused tail ids (when the sub-routine produces fewer surviving records than allocated) are discarded; the next allocation simply skips the unused range — append-only allocation tolerates skipped ids.
8. Tail discipline: storylet-pool-authoring Phase 2 produces `target_pool_size + ceil(target_pool_size × 0.30)` candidate seeds (per `storylet-pool-authoring/references/phase-2-generation-seeds.md:3`). Phase 4 may reject some; Phase 5 may cull more. The bootstrap pre-allocates the full upper-bound count (`target_pool_size + buffer`); the sub-routine returns at most `target_pool_size` records with the first N ids; the unused tail (between the returned count and the pre-allocated count) is discarded.
9. Page-cycle JIT path is OUT OF SCOPE for this ticket. Page-cycle's `parent_skill_invocation: true` JIT path already supplies the SLT id in caller context (per `storylet-pool-authoring/SKILL.md:223`); only the bootstrap-seed path is being converted to the same shape.
10. Same-seam triage drift: `docs/triage/2026-05-06-branching-story-bootstrap-fixes-triage.md` says BSBOOT-012 changes only bootstrap-side prose and does not require a `storylet-pool-authoring` contract change. Live reassessment contradicts that: `storylet-pool-authoring` must require and consume `target_slt_ids[]` for bootstrap seed sub-routine calls, so this ticket owns the triage-doc correction.
11. Draft timing correction: the drafted "Pre-flight" wording is not literally executable because the BSBOOT-011 `target_pool_size` formula consumes Phase 5 outputs (high-salience OBLs, active mystery-edge threads, and reachable-location state). The truthful timing is Phase 6 pre-delegation allocation: after Phase 5 computes the story state and Phase 6 computes `target_pool_size`, but before invoking `storylet-pool-authoring` and before Phases 7-8/OBL coverage caches capture SLT references.

## Architecture Check

1. **Why cleaner**: removing the late-binding window eliminates the entire class of "provisional id leaked into a downstream record" failures. Bootstrap-time records (PG, CHC, OBL.coverage_cache) reference final SLT ids from Phase 6 onward; Phase 11 writes records as-is without a remap pass.
2. **Alternative considered**: a symbolic-id-then-remap pass (ChatGPT-Pro's `id_map: { ROOT_ENTRY: SLT-0001, REL_CONFRONTATION_A: SLT-0002 }` proposal). Rejected: a remap pass adds an explicit closure step that this ticket's pre-allocation approach makes unnecessary; if remap is forgotten somewhere, the dangling-ref bug returns. Pre-allocation is structurally safer.
3. No backwards-compatibility shim. The `parent_skill_invocation: true` contract changes wholesale; old in-memory-without-id behaviour is removed.

## Verification Layers

1. Bootstrap Phase 6 pre-delegation step pre-allocates SLT ids after `target_pool_size` is computable → codebase grep-proof (the new step appears in `references/phase-6-storylet-pool-seed.md`).
2. Phase 6 delegation passes `target_slt_ids[]` to storylet-pool-authoring → codebase grep-proof.
3. storylet-pool-authoring's seed sub-routine consumes `target_slt_ids[]` and emits SLT records with those ids → codebase grep-proof + manual review of the `parent_skill_invocation: true` contract paragraph.
4. Phase 7 / Phase 8 / Phase 5 OBL records reference final SLT ids by Phase 11 → manual review (no provisional-id residue in the prose).
5. Tail-id discipline — unused pre-allocated ids are discarded, not written → manual review.
6. Cross-skill consistency — page-cycle's JIT path is unchanged → codebase grep-proof.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md`

- Added a Pre-flight note that bootstrap-seed `SLT-NNNN` ids are not allocated in literal Pre-flight because `target_pool_size` is only computable after Phase 5. The note points operators to Phase 6's pre-delegation allocation step.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`

- Added Phase 6's pre-delegation SLT range allocation step, including the upper-bound candidate count `target_pool_size + ceil(target_pool_size * 0.30)`, one allocator call per candidate id, deterministic `target_slt_ids[]` consumption, and unused-tail discard discipline.
- Updated the delegation contract to pass `target_slt_ids[]` and the return contract to state that returned SLT records already carry final ids; bootstrap writes them as-is in Phase 11.

### 3. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Updated the process-flow and procedure text so Phase 6 computes `target_pool_size`, pre-allocates `target_slt_ids[]`, then delegates to `storylet-pool-authoring` and receives final-id SLTs.

### 4. `.claude/skills/storylet-pool-authoring/SKILL.md`

- Added the `target_slt_ids` argument and input documentation.
- Updated parent-invocation output and ID-allocation prose: bootstrap seed mode requires caller-supplied ids, consumes them from the head in deterministic order, returns unused tail ids in the internal validation packet, and does not allocate `SLT` ids inside `storylet-pool-authoring`.
- Left the page-cycle JIT path unchanged.

### 5. `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md`

- Added the seed-mode prerequisite requiring `target_slt_ids[]` for `parent_skill_invocation: true` bootstrap calls, and updated the bootstrap sub-routine skip/return paragraph to carry final ids and unused-tail ids.

### 6. `docs/triage/2026-05-06-branching-story-bootstrap-fixes-triage.md`

- Corrected the BSBOOT-012 scope note: page-cycle remains untouched, but `storylet-pool-authoring` does receive a bootstrap seed sub-routine contract update.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `docs/triage/2026-05-06-branching-story-bootstrap-fixes-triage.md` (modify — same-seam stale scope note)

## Out of Scope

- Adding an "allocate id range" MCP operation. The single-id-per-call `allocate_next_id` is called N times in Phase 6 before delegation; cost is negligible.
- Migrating bundles built under the old contract. Forward-only.
- Changing page-cycle's JIT path (already supplies the id in caller context).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "target_slt_ids" .claude/skills/branching-story-bootstrap/ .claude/skills/storylet-pool-authoring/` returns matches in both skills' docs (Pre-flight note, Phase 6 reference, SKILL.md, and storylet-pool-authoring pre-flight reference).
2. `grep -nE "Pre-allocate the SLT id range" .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` returns the new pre-delegation step.
3. `grep -nE "owns final SLT id assignment|assigns final SLT ids" .claude/skills/storylet-pool-authoring/SKILL.md` returns no matches (the late-binding wording is removed).
4. The page-cycle JIT path documentation (line 223 region of storylet-pool-authoring) is unchanged.

### Invariants

1. SLT ids are final by the time storylet-pool-authoring returns its in-memory packet.
2. `target_slt_ids[]` is required for `parent_skill_invocation: true` AND `mode=seed`.
3. Tail-id discipline: unused pre-allocated ids are discarded; the next allocation skips them.
4. Page-cycle JIT path is unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "target_slt_ids|pre-allocat" .claude/skills/branching-story-bootstrap/ .claude/skills/storylet-pool-authoring/` — surfaces every place the new contract is documented.
2. `grep -rn "assigns final SLT ids\|owns final SLT id assignment" .claude/skills/` — expected: empty (the late-binding wording is gone).
3. (Manual) trace a hypothetical bootstrap walkthrough: Phase 6 computes `target_pool_size=20`, allocates 26 SLT ids (`20 + ceil(20 * 0.30)`), delegates with `target_slt_ids[]`, receives 18 surviving SLTs with ids [SLT-0001..SLT-0018], discards tail ids [SLT-0019..SLT-0026], and Phase 11 writes 18 SLT files; the next bootstrap or runtime call allocates from SLT-0027.

## Outcome

Completion date: 2026-05-06.

Implemented the forward-only bootstrap seed id contract. Bootstrap now documents Phase 6 pre-delegation SLT range allocation, passes `target_slt_ids[]` into `storylet-pool-authoring`, and receives final-id SLT records before Phase 7/Phase 8 references are built. `storylet-pool-authoring` now requires and consumes `target_slt_ids[]` for bootstrap seed sub-routine calls, returns unused tail ids in the internal validation packet, and leaves page-cycle JIT allocation unchanged.

Also corrected the same-seam triage scope note that previously said `storylet-pool-authoring` did not need a BSBOOT-012 contract update.

## Verification Result

1. `grep -nE "target_slt_ids|pre-allocat" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md .claude/skills/storylet-pool-authoring/SKILL.md .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` — passed; output shows the Phase 6 allocation step, delegation contract, storylet-pool argument/input, and seed-mode prerequisite.
2. `grep -rn "assigns final SLT ids\|owns final SLT id assignment" .claude/skills/` — passed; no matches in live skill docs.
3. `rg -n 'pre-allocates the SLT range at its Pre-flight|pre-allocated at Pre-flight|Pre-flight pre-allocates|bootstrap-side delegation contract only|no upstream contract change' .claude/skills docs/triage/2026-05-06-branching-story-bootstrap-fixes-triage.md` — passed; no live stale scope/timing hits remain.
4. Manual review — passed: page-cycle JIT allocation text remains unchanged in `storylet-pool-authoring/SKILL.md` and `storylet-pool-authoring/references/pre-flight-and-prerequisites.md`; the bootstrap seed path is the only path that now requires `target_slt_ids[]`.

## Deviations

The drafted "Pre-flight allocates SLT ids" timing was corrected during implementation. Literal Pre-flight cannot know the final count because `target_pool_size` depends on Phase 5 story state; the landed contract allocates in Phase 6 immediately before delegation, which still removes the late-binding window before downstream records capture SLT references.
