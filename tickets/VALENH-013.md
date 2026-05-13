# VALENH-013: storylet_predicate_dsl_parsability sees in-plan record creates during pre-apply

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`; paired tests under `tools/validators/tests/rules/`.
**Deps**:

## Problem

The `storylet_predicate_dsl_parsability` validator builds its set of "active story records" by querying the world index (`ctx.index.query(record_type)`), which reflects on-disk state only. In pre-apply mode, story-bundle records being CREATED in the same patch envelope are invisible to the predicate validator's `activeRecordIds` set — so a storylet's precondition that references a same-plan record fails with `predicate.unresolved_reference`.

The branching-story-bootstrap session of 2026-05-13 hit this directly: `SLT-0004` (the "name the bruise on her arm aloud" storylet in the red-bunny bundle) included `{pred: "record_active", record: "CNSQ-0001"}` as a hard precondition — the CNSQ-0001 bruise consequence record was being created in the same patch envelope alongside the SLT. The validator rejected with `"SLT-0004: preconditions.hard[2].record references missing CNSQ-0001"`. The operator removed the precondition to ship the bundle; the disclosure-storylet now lacks the structural CNSQ-active guard that would block selection of the bruise-naming move when the bruise has already healed or been closed in a future page state.

The same pattern would affect any SLT/STINT/SF/BEL/SREL/STLOC/STOBJ/THR/OBL reference from a storylet precondition to a story-bundle record that is created in the same patch as the storylet — i.e., every bootstrap envelope and every same-plan SLT+supporting-record turn-cycle commit. The validator must consider in-plan creates as part of the active-record set during pre-apply validation.

## Assumption Reassessment (2026-05-13)

1. Current validator state (HEAD): `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts:91-130` defines `loadReferenceSets(ctx)` which queries `ctx.index.query({ world_slug, record_type, story_slug? })` for each story-bundle record type. The world index reflects on-disk parsed records only; pre-apply patches are not pre-loaded into the index. Verified at line 130's `queryStoryScoped` invocation and the `query` callback at line 92.
2. Current pre-apply infrastructure (HEAD): `Context` carries `ctx.patch_plan?.patches[]` (used by `applies_to` at line 65: `ctx.patch_plan?.patches.some((patch) => patch.op === "create_slt_record")`). The patch list is available at the validator's runtime — it just isn't being read into the reference-set builder. Verified by grep: `grep -nE "patch_plan" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`.
3. Shared boundary under audit: the predicate-validator's contract for the closed DSL (`fact_true`, `belief`, `record_active`, etc., per `.claude/skills/_shared-templates/story-state-contract.md` §5) — the contract is that predicate references must resolve to active story-bundle records in the page's state_snapshot. In pre-apply mode, the page's state_snapshot is the patch-plan's intent; in-plan creates ARE the active records the page declares. The validator's index-only read is a stale-implementation drift that loses the in-plan visibility.
4. FOUNDATIONS principle restated: §Story Bundles §4 (the eight shared hard gates) — gate 5 ("append-only delta") and gate 7 ("plan grounding") both depend on the predicate validator correctly identifying which records are active at the new page. When the validator can't see in-plan records, gate 7's grounding check is silently weakened (any precondition referencing a same-plan create fails, forcing operators to drop the precondition or hard-code its absence).
5. Adjacent contradiction surfaced during reassessment: this same in-plan-blindness affects other story-record validators that query the index for cross-references — `cross_file_reference`, `state_snapshot_integrity`, etc. The contradiction is the same: pre-apply validators that query the on-disk index miss in-plan creates. Classification: future cleanup — name as a separate `VALENH-NNN` ticket after this one lands, scoped to the wider in-plan-visibility audit; do NOT bundle into this ticket since the predicate validator's `activeRecordIds` is the most specific surface.

## Architecture Check

1. The proposed change extends `loadReferenceSets` to merge in-plan record creates into the index-derived set during pre-apply mode (when `ctx.run_mode === "pre-apply"` and `ctx.patch_plan?.patches` is non-empty). This is cleaner than: (a) requiring operators to author SLT preconditions only against pre-existing records (which forces a multi-envelope-submit pattern that defeats the single-patch-envelope bootstrap design); (b) silently passing references to in-plan records (which loses the validator's purpose); (c) requiring the patch engine to two-phase commit (write records first, validate predicates second), which adds round-trip latency.
2. No backwards-compatibility shim: the existing index-query code path is preserved for `full-world` and `incremental` run modes; the new in-plan-merge is added for `pre-apply` mode only, scoped to the same record-type set the existing query covers.

## Verification Layers

1. Pre-apply validator with a patch plan that creates SLT + CNSQ in the same envelope: the SLT's `record_active(CNSQ-NNNN)` precondition resolves cleanly → unit test under `tools/validators/tests/rules/`.
2. Pre-apply validator with a patch plan creating only SLT (referencing an existing CNSQ): existing behavior preserved → existing test continues to pass.
3. Pre-apply validator with a patch plan whose SLT references a NON-existent CNSQ (neither on-disk nor in-plan): still fails with `predicate.unresolved_reference` → unit test.
4. Full-world and incremental modes continue to query the index alone (no in-plan merge for those modes) → grep-proof + existing-test-pass.

## What to Change

### 1. Reference-set builder: merge in-plan creates during pre-apply

In `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, modify `loadReferenceSets(ctx)` to:

- After the existing per-record-type queries (lines 92-114 at HEAD), check `ctx.run_mode === "pre-apply"` and `ctx.patch_plan?.patches`.
- Iterate the patches; for each `create_<class>_record` op that maps to a story-bundle record type (story_fact_record → facts, belief_record → beliefs, story_consequence_record → consequences, etc.), extract the record id from `patch.payload.record.id` and add it to the corresponding map's `storyKeyFor`-indexed set.
- Use the patch's `payload.story_slug` to derive the storyKey for the in-plan record (matches the existing `storyKeyFor(record)` form used for index results).
- Preserve all index-derived ids; the merge is additive, not replacing.

### 2. Tests for in-plan visibility

Add unit tests under `tools/validators/tests/rules/` (or wherever the predicate-DSL tests live) that:

- Build a pre-apply context with a patch plan containing `create_cnsq_record` (CNSQ-0001) + `create_slt_record` (SLT-0001 with `{pred: 'record_active', record: 'CNSQ-0001'}` precondition). Assert zero `predicate.unresolved_reference` verdicts.
- Build a pre-apply context with a patch plan containing only `create_slt_record` referencing CNSQ-0099 (not in-plan, not on-disk). Assert one `predicate.unresolved_reference` verdict.
- Build a full-world mode context with on-disk CNSQ-0001 + SLT-0001 referencing it. Assert zero verdicts (existing behavior, regression guard).
- Build an incremental mode context — assert the in-plan-merge does NOT fire (incremental reads from the index, not from patches).

### 3. Update validator docstring / code comment

Add an inline comment near the modified `loadReferenceSets` body explaining the pre-apply in-plan-merge contract, citing this ticket for audit-trail purposes (per Rule 6 No Silent Retcons — the session evidence at red-bunny bootstrap IS the retcon justification).

## Files to Touch

- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — add pre-apply in-plan-merge cases)

## Out of Scope

- Re-emitting the already-committed `red-bunny` bundle's SLT-0004 to restore the `record_active(CNSQ-0001)` precondition (the bundle remains as-shipped; future bundles can use the precondition once the validator sees in-plan records).
- In-plan-visibility fixes for OTHER pre-apply validators (`cross_file_reference`, `state_snapshot_integrity`, etc.); those route to a separate follow-up ticket scoped to the wider in-plan-visibility audit.
- Two-phase patch-engine commit (orthogonal architectural change; would be a much larger ticket).
- Skill-prose updates encouraging operators to use `record_active` predicates against in-plan creates (route via `/skill-audit` after this lands).

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: pre-apply validator with a `create_cnsq_record` + `create_slt_record` patch plan where the SLT references the CNSQ produces zero `predicate.unresolved_reference` verdicts.
2. New unit test: pre-apply validator with a `create_slt_record` patch plan where the SLT references a CNSQ that is neither in-plan nor on-disk still produces one `predicate.unresolved_reference` verdict.
3. Existing tests under `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` continue to pass without modification (no regression on full-world or incremental modes).

### Invariants

1. The pre-apply in-plan merge is additive only — it does NOT replace the index-derived set; on-disk records remain visible.
2. The merge fires only in `pre-apply` run mode — `full-world` and `incremental` modes continue to read the index alone (same surface as current behavior).
3. Each in-plan record type maps to the correct reference-set bucket (CNSQ → consequences, SF → facts, BEL → beliefs, etc.); no bucket-mixing.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — add pre-apply in-plan-merge cases for every story-bundle record type the validator currently queries (facts, entities, beliefs, obligations, consequences, threads, relationships, locations, objects, artifacts, intentions).

### Commands

1. Targeted: `cd tools/validators && pnpm test -- predicate_dsl`
2. Full-package: `cd tools/validators && pnpm test`
3. End-to-end: re-validate the `red-bunny` bootstrap envelope (`/tmp/red-bunny-bootstrap/envelope.json` if still present, or a fresh one) with SLT-0004's `record_active(CNSQ-0001)` precondition restored; assert zero `predicate.unresolved_reference` verdicts.
