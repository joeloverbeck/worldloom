# CBAUTH-006: Specify INDEX.md descriptor-line update in Phase 6 step 6 INDEX update contract

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/SKILL.md` (no validator, tool, hook, or schema change)
**Deps**: None

## Problem

`SKILL.md` Phase 6 step 6 specifies the INDEX update shape: "append a row per new SLT to the bundle's `## Commitment Block Pool` table (columns: SLT id, title, move_family, compatible_turn_drivers); add a `## Storylet Batches` section (or append to it when it already exists) with a row per new SLB manifest (columns: SLB id, mode, records, manifest path). Match the table conventions established at bundle bootstrap; `branching-story-bootstrap` is the canonical INDEX initializer."

But the `## Commitment Block Pool` section also has a one-line **descriptor line** above the table cataloging the pool's provenance composition — e.g., the red-bunny INDEX before SLB-4: "All `global_author_pool`. SLT-1..7 are `bootstrap_seed`; SLT-8..13 are `author_batch` (SLB-1); SLT-14..19 are `author_batch` (SLB-2); SLT-20..25 are `author_batch` (SLB-3)." The descriptor line is informational metadata that becomes stale the moment a new batch lands and the table grows. The skill's INDEX-update spec doesn't name it; a future operator could append the table rows correctly and leave the descriptor line stale, producing an INDEX whose intro contradicts its own table.

Observed on the 2026-05-30 red-bunny SLB-4 run: I manually updated the descriptor line to include "SLT-26..31 are `author_batch` (SLB-4)" because I noticed the inconsistency. A careless operator would not have updated it. The "Match the table conventions established at bundle bootstrap" line is a hand-wave that depends on the operator inspecting the existing INDEX and noticing the descriptor convention, rather than the skill spec naming it.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/SKILL.md:142` Phase 6 step 6 verified by direct Read this session. The INDEX-update prose names two specific table updates (Commitment Block Pool row append; Storylet Batches row append) and ends with the hand-wave delegation to bootstrap convention. The descriptor-line update is not named.
2. The descriptor line is authored by `branching-story-bootstrap` as part of its INDEX initialization (verified by reading red-bunny's INDEX.md "Commitment Block Pool" section: the descriptor line was present at bundle creation and has been extended by each subsequent SLB landing — visible in the red-bunny INDEX before SLB-4 listing SLB-1, SLB-2, SLB-3 inline). The convention is well-established but enforced only by operator vigilance, not by the spec.
3. Shared boundary under audit: the SKILL.md Phase 6 step 6 INDEX update contract and the bundle INDEX.md "Commitment Block Pool" section's descriptor-line convention. This ticket aligns the spec with the established convention. No schema change.
4. FOUNDATIONS principle under audit: §Tooling Recommendation (the INDEX is a derived rendering of bundle state; if its prose surface contradicts its table, the derived view loses authority). Restated: INDEX consistency between descriptor metadata and table content is a Tooling-Recommendation discipline that the spec should enforce by naming the update explicitly.
5. Enforcement-surface note: this ticket touches the post-write Phase 6 step 6 markdown-update prose, not the patch engine or any gate logic. The patch engine writes the `_source/storylets/SLT-N.yaml` files; the INDEX update is a direct-write markdown step the operator performs after patch success. No firewall/gate impact.
6. Adjacent contradiction classification: the spec's hand-wave delegation ("Match the table conventions established at bundle bootstrap") is the *cause* of the descriptor-line ambiguity. The fix is a required consequence of operationalizing the convention. No separate bug uncovered.

## Architecture Check

1. Cleaner than alternatives: a one-sentence addition to Phase 6 step 6 naming the descriptor-line update is the lowest-blast-radius fix. The alternative — automating the INDEX rebuild via a CLI tool — is over-engineered for a one-line markdown edit and would couple INDEX rendering to a new tool surface. Authoring guidance + explicit spec is the right altitude.
2. No backwards-compatibility aliasing/shims introduced: prose addition to one SKILL.md step. Existing bundles' INDEX.md files keep their current descriptor-line shape; the spec change applies forward at next-batch authoring time.

## Verification Layers

1. Invariant: `SKILL.md` Phase 6 step 6 explicitly names the descriptor-line update as part of the INDEX-update obligation → codebase grep-proof (the spec line names "descriptor line" or equivalent, with a concrete example of the convention being extended).
2. Invariant: the descriptor-line update is operator-reproducible from the existing INDEX state + the new batch's SLT id range + SLB id → manual review (the spec names the format pattern, e.g., "SLT-<lo>..<hi> are `author_batch` (SLB-N)", so the operator can extend it without inspecting prior batches).
3. Invariant: bundle INDEX consistency between descriptor metadata and table content → skill dry-run (re-invoke `direct_batch` on any bundle; confirm both the table rows and the descriptor line are updated in the post-patch INDEX edit step).

## What to Change

### 1. Name the descriptor-line update in Phase 6 step 6

In `.claude/skills/commitment-block-authoring/SKILL.md:142` Phase 6 step 6 INDEX update specification, after the existing "append a row per new SLT to the bundle's `## Commitment Block Pool` table" sentence, add: "Also extend the `## Commitment Block Pool` descriptor line above the table to catalog the new batch's SLT id range and SLB id. The descriptor line takes the form: `All \`global_author_pool\`. SLT-<lo>..<hi> are \`bootstrap_seed\`; SLT-<lo>..<hi> are \`author_batch\` (SLB-N); ...` — branching-story-bootstrap initializes it with the bootstrap-seed and any seed SLB ranges; each subsequent batch's authoring step appends `; SLT-<new-lo>..<new-hi> are \`author_batch\` (SLB-<new>)` to the existing descriptor line. This keeps the descriptor metadata consistent with the table content."

### 2. Worked example

Add a short worked example referencing the SLB-4 case for concreteness: "Before SLB-4, red-bunny's descriptor line read: 'All `global_author_pool`. SLT-1..7 are `bootstrap_seed`; SLT-8..13 are `author_batch` (SLB-1); SLT-14..19 are `author_batch` (SLB-2); SLT-20..25 are `author_batch` (SLB-3).' After SLB-4 the line reads: '... SLT-20..25 are `author_batch` (SLB-3); SLT-26..31 are `author_batch` (SLB-4).' "

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 6 step 6 INDEX-update prose)

## Out of Scope

- Any change to the patch engine, validator framework, or `_source/storylets/SLT-N.yaml` write surface. This ticket is purely the post-patch markdown-update spec.
- Automating the INDEX rebuild via a CLI tool. The INDEX is a direct-write markdown artifact per `docs/FOUNDATIONS.md` §Story Bundles §2; the spec change is enough.
- Retroactive descriptor-line updates on existing bundles. Existing INDEX.md descriptor lines are already consistent with their tables; this ticket prevents future drift, not retroactive repair.
- Other INDEX section conventions (Cast Roster, Active Threads, etc.) — those are authored by other skills (bootstrap, turn-cycle) and have their own update contracts.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "descriptor line\|All .global_author_pool" .claude/skills/commitment-block-authoring/SKILL.md` returns the descriptor-line update specification with the format pattern and worked example.
2. Skill dry-run: invoke `direct_batch --target_count 3` on any bundle; confirm the post-patch INDEX update step extends both the `## Commitment Block Pool` table rows AND the descriptor line above it, and the descriptor line matches the format pattern named in the spec.
3. Manual inspection of the post-batch INDEX.md confirms the descriptor line and the table content remain consistent (every SLT id in the table appears in exactly one descriptor-line range).

### Invariants

1. Phase 6 step 6 INDEX-update spec enumerates every INDEX surface the skill must update (table rows AND descriptor line); no convention is left to operator inspection of bootstrap precedent (FOUNDATIONS §Tooling Recommendation — derived view consistency).
2. The descriptor-line update format is reproducible from inputs the operator has at hand (new SLT id range + SLB id); no new retrieval call is required.
3. The skill never edits other INDEX sections (Cast Roster, Active Threads, Pages, etc.); the descriptor-line spec is scoped to the `## Commitment Block Pool` and `## Storylet Batches` sections that the skill already owns.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "descriptor line\|All .global_author_pool\|author_batch\` (SLB" .claude/skills/commitment-block-authoring/SKILL.md`
2. Skill dry-run on a representative bundle and inspect the post-batch INDEX.md against the spec; confirm the descriptor-line update is performed and matches the format pattern.
3. A grep + skill-dry-run boundary is correct here because the change is markdown-update prose with no envelope/schema/validator surface to exercise; the dry-run confirms the spec is consumed at the post-patch INDEX-edit step.
