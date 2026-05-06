# BSBOOT-012: Pre-allocate SLT id range before storylet-pool-authoring delegation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Cross-skill prose change (`branching-story-bootstrap` Phases 1/6/11 + `storylet-pool-authoring` `parent_skill_invocation: true` contract). No engine, validator, or schema code change.
**Deps**: archive/tickets/BSBOOT-011.md (the pre-allocation count depends on the completed scale-aware `target_pool_size` formula).

## Problem

`storylet-pool-authoring/SKILL.md:211, 221` documents the parent-skill-invocation contract for bootstrap seed mode:

> "When `parent_skill_invocation: true`, no files are written by this skill. The output is an in-memory return packet … `branching-story-bootstrap` assigns final SLT ids and writes seed records during its Phase 11 transaction."
> "For `parent_skill_invocation: true` bootstrap seed generation, this skill does not allocate `SLB` and does not reserve the SLT range itself. `branching-story-bootstrap` owns final SLT id assignment because it is constructing a new story bundle and writes the returned storylets inside its Phase 11 transaction."

But by the time bootstrap reaches Phase 11, downstream records have ALREADY been constructed referencing SLT ids:

- `PG-0001.storylet_realized` (Phase 7, `templates/story-records.yaml:286`) references the chosen genesis SLT id.
- `CHC-NNNN` continuation references (Phase 8, `references/phase-8-choice-generation.md:45`) check the seed pool for matching storylets — i.e. reference SLT ids.
- `OBL.coverage_cache.compatible_storylets[]` (`templates/story-records.yaml:142`) is "advisory only" but populated against the seed pool — i.e. reference SLT ids.

If Phase 6 returns SLT records without final ids, then Phases 7-8 either (a) reference provisional/symbolic ids that need a late remap pass, or (b) freeze the in-memory id assignment between Phase 6 and Phase 11, with Phase 11 doing a no-op remap. Either path is fragile: a remap pass that misses any record (a forgotten OBL.coverage_cache entry, a CHC continuation that captured the provisional id) leaves a dangling reference at write time.

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

## Architecture Check

1. **Why cleaner**: removing the late-binding window eliminates the entire class of "provisional id leaked into a downstream record" failures. Bootstrap-time records (PG, CHC, OBL.coverage_cache) reference final SLT ids from Phase 6 onward; Phase 11 writes records as-is without a remap pass.
2. **Alternative considered**: a symbolic-id-then-remap pass (ChatGPT-Pro's `id_map: { ROOT_ENTRY: SLT-0001, REL_CONFRONTATION_A: SLT-0002 }` proposal). Rejected: a remap pass adds an explicit closure step that this ticket's pre-allocation approach makes unnecessary; if remap is forgotten somewhere, the dangling-ref bug returns. Pre-allocation is structurally safer.
3. No backwards-compatibility shim. The `parent_skill_invocation: true` contract changes wholesale; old in-memory-without-id behaviour is removed.

## Verification Layers

1. Bootstrap Pre-flight pre-allocates SLT ids → codebase grep-proof (the new step appears in `references/pre-flight-and-prerequisites.md`).
2. Phase 6 delegation passes `target_slt_ids[]` to storylet-pool-authoring → codebase grep-proof.
3. storylet-pool-authoring's seed sub-routine consumes `target_slt_ids[]` and emits SLT records with those ids → codebase grep-proof + manual review of the `parent_skill_invocation: true` contract paragraph.
4. Phase 7 / Phase 8 / Phase 5 OBL records reference final SLT ids by Phase 11 → manual review (no provisional-id residue in the prose).
5. Tail-id discipline — unused pre-allocated ids are discarded, not written → manual review.
6. Cross-skill consistency — page-cycle's JIT path is unchanged → codebase grep-proof.

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md`

- After the existing "Allocate next `STORY-NNN`" step (around line 38-40), add a new step:

  > - **Pre-allocate the SLT id range for the seed pool.** Compute the upper-bound count: `target_pool_size + ceil(target_pool_size × 0.30)` where `target_pool_size` is the value from `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` §Computing target_pool_size (landed by `archive/tickets/BSBOOT-011.md`), or the explicit `storylet_pool_seed_size` argument when supplied. Call `mcp__worldloom__allocate_next_id(world_slug, 'SLT', story_slug=<story-slug>)` once per id; collect the returned ids into `target_slt_ids[]`. The list is passed to Phase 6 as the bound id range; the storylet-pool-authoring sub-routine consumes them in deterministic order. Unused tail ids (when the sub-routine returns fewer than `len(target_slt_ids)` records after Phase 4 rejections + Phase 5 culls) are discarded; append-only id allocation tolerates skipped ranges.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`

- Update the §Delegation contract list (lines 13-19) to add `target_slt_ids: <list pre-allocated at Pre-flight>`. Update the surrounding prose: "The bootstrap pre-allocates the SLT id range at Pre-flight (see `references/pre-flight-and-prerequisites.md` §Pre-allocate the SLT id range); the sub-routine consumes the supplied ids in deterministic order. SLT records returned to the bootstrap carry final ids — no remap pass at Phase 11."
- Update §In-memory return contract (lines 22-28) to remove the "Bootstrap assigns the new bundle's `SLT-NNNN` ids" sentence; replace with "The sub-routine returns SLT records with the pre-allocated ids already populated; bootstrap writes them as-is in Phase 11."

### 3. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Phase 6 description (line 112-117): replace "(delegated to storylet-pool-authoring seed mode with focus_area: bootstrap_mix and parent_skill_invocation: true; returns approved SLTs in memory)" with "(delegated to storylet-pool-authoring seed mode with focus_area: bootstrap_mix, parent_skill_invocation: true, and pre-allocated target_slt_ids[]; returns approved SLTs with final ids in memory)".

### 4. `.claude/skills/storylet-pool-authoring/SKILL.md`

- §Arguments — add a new entry for `target_slt_ids`:

  > - `target_slt_ids` — list of pre-allocated `SLT-NNNN` ids in deterministic order. Required when `parent_skill_invocation: true` AND `mode=seed` (the bootstrap-seed sub-routine path). The sub-routine consumes ids from the head of the list as it produces records; survivors after Phase 4 rejections and Phase 5 culling are emitted with the consumed ids. Unused tail ids are returned to the caller in the response packet so the caller can verify the full range vs. the consumed prefix.

- Update the §Output for `parent_skill_invocation: true` paragraph (lines 211, 221) so it documents the new contract:

  - Replace line 211 ("`branching-story-bootstrap` assigns final SLT ids and writes seed records during its Phase 11 transaction.") with: "`branching-story-bootstrap` pre-allocates the SLT range at its Pre-flight, supplies `target_slt_ids[]`, and writes the final-id storylet records during its Phase 11 transaction."
  - Replace line 221 ("`branching-story-bootstrap` owns final SLT id assignment because it is constructing a new story bundle and writes the returned storylets inside its Phase 11 transaction.") with: "`branching-story-bootstrap` pre-allocates the SLT range and supplies it via `target_slt_ids[]`. This skill consumes ids from the head of the supplied list in deterministic order; the bootstrap writes the returned storylets with their final ids inside its Phase 11 transaction."
- Page-cycle JIT path (line 223) remains unchanged.

### 5. `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md`

- Add a new line under the seed-mode prerequisites: "When `parent_skill_invocation: true` AND `mode=seed`: `target_slt_ids[]` MUST be supplied by the caller (the bootstrap pre-allocation per `branching-story-bootstrap/references/pre-flight-and-prerequisites.md`). The sub-routine does NOT call `allocate_next_id` for SLT in this path."

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify)

## Out of Scope

- Adding an "allocate id range" MCP operation. The single-id-per-call `allocate_next_id` is called N times at Pre-flight; cost is negligible.
- Migrating bundles built under the old contract. Forward-only.
- Changing page-cycle's JIT path (already supplies the id in caller context).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "target_slt_ids" .claude/skills/branching-story-bootstrap/ .claude/skills/storylet-pool-authoring/` returns matches in both skills' docs (pre-flight, phase-6 reference, SKILL.md).
2. `grep -nE "Pre-allocate the SLT id range" .claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` returns the new step.
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
3. (Manual) trace a hypothetical bootstrap walkthrough: Pre-flight allocates 26 SLT ids for an `arc`-scale bundle (target_pool_size 20 + 30% = 26); Phase 6 returns 18 surviving SLTs with ids [SLT-0001..SLT-0018]; tail ids [SLT-0019..SLT-0026] are discarded; Phase 11 writes 18 SLT files; next bootstrap or runtime call allocates from SLT-0027.
