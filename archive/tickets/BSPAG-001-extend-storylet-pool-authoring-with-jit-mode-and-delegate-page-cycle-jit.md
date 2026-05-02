# BSPAG-001: Extend `storylet-pool-authoring` with `jit` mode and delegate `branching-story-page-cycle` Phase 4 JIT expansion to it

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/storylet-pool-authoring/SKILL.md` (`jit` mode added to Inputs + Phase 1 / Phase 2 / Phase 3 / Phase 4 / Phase 5 / Phase 6 / Phase 7 sub-routes), `.claude/skills/branching-story-page-cycle/SKILL.md` (Phase 4 JIT expansion delegated; JIT future-sibling seam removed; Guardrails sibling-interop)
**Deps**: `.claude/skills/storylet-pool-authoring/SKILL.md` (now shipping; this ticket extends it with the runtime JIT mode and closes the seam page-cycle named at lines 565, 1228); archive/tickets/BSBOOT-002-delegate-storylet-seed-pool-to-storylet-pool-authoring.md (precedent for sub-routine invocation pattern via `parent_skill_invocation` flag)

## Problem

At intake, `branching-story-page-cycle` Phase 4 inlined a minimal JIT-storylet shape with explicit seam markers naming `storylet-pool-authoring` as the future authority for runtime JIT generation:

- `.claude/skills/branching-story-page-cycle/SKILL.md` line 565: `**Future-sibling seam**: when storylet-pool-authoring ships, refactor JIT generation to delegate to its JIT-mode entrypoint; until then, this skill inlines the minimal JIT shape per the proposal.`
- `.claude/skills/branching-story-page-cycle/SKILL.md` line 1228: `**storylet-pool-authoring** — the JIT-mode entrypoint for Phase 4 fallback storylet generation, and the seed-mode entrypoint for branching-story-bootstrap's Phase 6. Until shipping, this skill inlines the minimal JIT shape per the proposal's discipline.`
- Additional in-prose references at lines 340, 579, 1151 are factual (not "not yet shipping") and need only minor revision to match the now-shipping storylet-pool-authoring SKILL.md.

At intake, `storylet-pool-authoring` shipped but exposed only `seed`, `focus`, and (deferred) `audit` modes. It did NOT yet expose a `jit` mode that produces single-storylet branch-scoped runtime expansions. This ticket had two halves:

- **Half A**: extend `storylet-pool-authoring` with a new `jit` mode that produces ONE storylet (default) at `visibility.scope: branch_scoped` + `provenance.origin: runtime_jit` + `provenance.created_at_page: <calling page>`, suitable for runtime emission during page-cycle Phase 4 fallback.
- **Half B**: refactor page-cycle Phase 4 JIT expansion to invoke `storylet-pool-authoring` with `mode='jit'`, `parent_skill_invocation: true` (per BSBOOT-002 sub-routine pattern), `target_pool_size: 1`, `created_at_page: <PG-NNNN>`, and the parent page's `state_snapshot` as context.

Both halves must land together — neither is meaningful without the other.

## Assumption Reassessment (2026-05-02)

1. Today's page-cycle Phase 4 is at `.claude/skills/branching-story-page-cycle/SKILL.md` (the JIT-expansion sub-section, after the storylet-selection logic). It produces ONE branch-scoped SLT-NNNN record when no candidate from the current pool scores above the eligibility threshold AND consequence-capacity required JIT (per the Phase 4 ascii at line 110 of bootstrap, mirrored in page-cycle's process flow). The minimal JIT shape page-cycle inlines is structurally compatible with the storylet-pool-authoring SLT template — they both descend from the proposal's §Storylet Schema.
2. `storylet-pool-authoring` Phase 1 (Coverage Diagnosis), Phase 2 (Generation Seeds), Phase 3 (Structured Drafting), Phase 4 (per-storylet 9 gates), and Phase 5 (batch-level 6 axes + branch-contamination) are all shaped for batch invocation. JIT-mode invocation needs sub-routes:
   - Phase 1 → reduced to "the calling page's `state_snapshot.current_storylet_eligibility_failure_reason`" (one-row diagnosis matrix, not a full pool scan)
   - Phase 2 → reduced to ONE seed sized to the failure-reason context (not target_pool_size + 30%)
   - Phase 3 → unchanged (per-seed prompt assembly + engine wrap)
   - Phase 4 → unchanged (9 gates apply per-storylet — JIT mode is per-storylet by definition)
   - Phase 5 → bypassed (single-storylet batch has no diversity surface; the 6 axes are vacuous; the batch-level branch-contamination check still applies but reduces to a single per-storylet check, already covered by Phase 4 gate 8)
   - Phase 6 → bypassed in sub-routine mode (parent skill's HARD-GATE governs)
   - Phase 7 → skipped in the `parent_skill_invocation: true` page-cycle sub-routine; page-cycle's Phase 11 writes the returned SLT-NNNN and updates INDEX.md inside the page tick's single transaction. SLB-NNNN manifest is not emitted for JIT runs (the manifest is for batch authoring; runtime JIT is per-page-tick).
3. The shared boundary under audit is the contract between (a) page-cycle's Phase 4 JIT-expansion entrypoint, (b) storylet-pool-authoring's new `jit` mode public surface (world_slug + story_slug + mode='jit' + parent_skill_invocation=true + target_pool_size=1 + created_at_page=<PG-NNNN> + caller_state_snapshot=<inline state>), and (c) page-cycle's Phase 5 / Phase 9 / Phase 11 downstream that consume the JIT-emitted SLT (Phase 5 applies the storylet's effects; Phase 9 gate 1 mystery firewall re-checks defense-in-depth; Phase 11 atomic-write includes the new SLT-NNNN.yaml).
4. **FOUNDATIONS principle**: Operational consistency, parallel to BSBOOT-002. Once a deferred-sibling seam can close, it should close — propagating storylet-pool-authoring's 9-gate canon-safety to runtime JIT strengthens the page-cycle's Phase 4 + Phase 9 firewall (storylet-pool-authoring gate 1 mystery firewall + gate 2 resolution-authority + gate 8 branch-contamination supersede the page-cycle's inline runtime checks).
5. This ticket touches HARD-GATE presentation semantics but does not weaken them. Page-cycle's HARD-GATE remains its Phase 10 deliverable approval (gated by execution_mode); storylet-pool-authoring's direct-invocation HARD-GATE remains absolute; `mode='jit'` is accepted only as a `parent_skill_invocation: true` page-cycle sub-routine and returns an internal validation packet plus one approved SLT to the caller without writing. The Phase 4.5 canon-promotion handoff to story-fact-promotion-to-canon is preserved untouched — storylet-pool-authoring's gate 2 enforces "canon_candidate authority requires branch_scoped visibility" which is exactly the JIT-mode default, so the promotion handoff continues to fire from page-cycle's Phase 4.5 (NOT from storylet-pool-authoring's Phase 4) — the gate 2 check ensures runtime JIT can carry canon_candidate authority legitimately when the page-cycle's runtime context demands it.
6. This ticket extends storylet-pool-authoring's mode enum (`seed | focus | audit | jit`) and adds runtime invocation surface; does NOT extend any output schema. JIT-emitted SLT records match the same `templates/storylet-record.yaml` schema as seed/focus, with `provenance.origin: runtime_jit`, `provenance.created_at_page: <PG-NNNN>`, and `visibility.scope: branch_scoped` (always — a `global_author_pool` JIT storylet is structurally invalid and is rejected at gate 8).
7. No skill / tool / hook / validator / schema field is renamed or removed. Page-cycle's inlined-minimal-JIT-shape prose is replaced with a delegation reference; the seam markers at lines 565 + 1228 are removed.
8. Reassessment correction: page-cycle SKILL.md at lines 340, 579, 1151 contains additional `storylet-pool-authoring` references that are NOT seam markers — they are factual cross-references ("set at storylet-pool-authoring time", "hard-rejected at storylet-pool-authoring time", "predicate per the Predicate DSL in storylet-pool-authoring"). Those references are correct now that the skill ships and need only minor wording revision: `set at storylet-pool-authoring time` → `set by storylet-pool-authoring at authoring time`; `predicate per the Predicate DSL in storylet-pool-authoring` → `predicate per templates/predicate-dsl.md in .claude/skills/storylet-pool-authoring/`.
9. Reassessment correction: the drafted Phase 7 write note for `storylet-pool-authoring` is not the live hard-gate-safe boundary. BSBOOT-002 established `parent_skill_invocation: true` as a no-write sub-routine return packet, and page-cycle already owns the Phase 11 single transaction for all records produced during a page tick. Therefore JIT mode returns one approved `runtime_jit` SLT in memory; page-cycle writes that SLT and updates INDEX.md in Phase 11 if the page-cycle validation and applicable gate posture permit the turn to commit.

## Architecture Check

1. The `jit` mode extension to storylet-pool-authoring is the right primitive (vs page-cycle inlining a parallel minimal shape) for two reasons: (a) storylet-pool-authoring's 9-gate canon-safety check applies uniformly, eliminating a per-skill inline check that could drift; (b) future improvements to storylet-pool-authoring (new gates, refined predicate DSL) propagate to runtime JIT automatically.
2. Sub-routine invocation via `parent_skill_invocation: true` matches BSBOOT-002's pattern, preserving the worldloom skill-non-chaining guardrail (skills don't invoke other skills runtime-style; the flag is a documented invocation-shape variation describing a sub-skill use mode).
3. No backwards-compatibility aliasing. The page-cycle Phase 4 JIT inline shape is replaced with a delegation reference, not preserved as an alias. Storylet-pool-authoring's `jit` mode is a new mode, not an aliased rename of any existing mode.

## Verification Layers

1. **Skill prose grep proof — page-cycle** — `rg -n 'minimal JIT shape|pending BSPAG-001|JIT-shape seams stay open|inlines the minimal JIT shape|forthcoming.*jit' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md` returned zero hits.
2. **Skill prose grep proof — storylet-pool-authoring** — `grep -n "mode: jit\|mode='jit'\|jit mode" .claude/skills/storylet-pool-authoring/SKILL.md` returned hits documenting the new mode in Inputs, Phase 1 sub-route, Phase 2 sub-route, Phase 5 bypass, Phase 6 internal return, and Phase 7 no-write sub-routine skip.
3. **Manual contract review** — inspected `branching-story-page-cycle` Phase 4 / Phase 5 / Phase 9 / Phase 11 and `storylet-pool-authoring` Pre-flight / Phase 1-7. Confirmed: (a) page-cycle delegates to storylet-pool-authoring; (b) the delegated JIT call returns ONE SLT with `provenance.origin: runtime_jit` + `provenance.created_at_page: <calling PG-NNNN>` + `visibility.scope: branch_scoped`; (c) the SLT passes storylet-pool-authoring's Phase 4 9-gate set; (d) the SLT flows into page-cycle's Phase 5 mutation, Phase 9 validation, and Phase 11 atomic-write.
4. **FOUNDATIONS alignment check** — storylet-pool-authoring's FOUNDATIONS Alignment table now acknowledges `runtime_jit`; page-cycle's FOUNDATIONS Alignment table Rule 7 row now cites delegated storylet-pool-authoring JIT gates.

## Landed Changes

### 1. storylet-pool-authoring — added `jit` mode

`.claude/skills/storylet-pool-authoring/SKILL.md`:

- §Inputs > Optional > `mode` now includes `seed | focus | audit | jit`; `jit` is documented as the runtime sub-routine for `branching-story-page-cycle` Phase 4.
- Added optional arguments `created_at_page: PG-NNNN` and `caller_state_snapshot`; both are required for `mode=jit`.
- Process Flow and Phases 1 / 2 / 5 / 6 / 7 now document the reduced JIT sub-routes: one continuation-failure diagnosis row, one seed, Phase 5 diversity bypass, internal validation packet return, and no child writes.
- Phase 3 / Phase 4 now document `runtime_jit` provenance, branch-scoped visibility, the `created_at_page` structural precondition, and the normal 9-gate validation set.
- Validation Rules, FOUNDATIONS Alignment, Guardrails, and Final Rule now acknowledge runtime JIT while preserving direct HARD-GATE and page-cycle Phase 4.5 canon-promotion ownership.

### 2. page-cycle — refactored Phase 4 JIT expansion

`.claude/skills/branching-story-page-cycle/SKILL.md`:

- Phase 4 JIT expansion now delegates to `storylet-pool-authoring` with `mode='jit'`, `parent_skill_invocation=true`, `target_pool_size=1`, `created_at_page=<this_PG_id>`, and `caller_state_snapshot=<this_state_snapshot>`.
- The old JIT-specific future-sibling / inline-minimal-shape prose was removed.
- JIT record descriptions now include `provenance.origin: runtime_jit`, `created_at_page: this_PG`, and `visibility.scope: branch_scoped`.
- The factual cross-references at the branch-isolation field note, forbidden-M defense-in-depth sentence, Predicate DSL schema snippet, mandatory roles, record schema, FOUNDATIONS Alignment, and sibling interop are updated to the delegated contract.

### 3. Verification

Verification used grep proof and manual contract review. The current repo has prose workflow definitions for these branching-story skills and no executable `branching-story-page-cycle` fixture runner; manual review of the page-cycle diff confirmed no inlined minimal-JIT-shape remains, and manual review of the storylet-pool-authoring diff confirmed the new `jit` mode is documented across Phase 1-7 sub-routes.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify; add `jit` mode across Inputs / Process Flow / Phase 1-7 / FOUNDATIONS Alignment / Guardrails)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify; Phase 4 JIT delegation prose, line 565 seam removal, line 1228 sibling-interop revision, lines 340 / 579 / 1151 factual cross-reference revisions, FOUNDATIONS Alignment, Guardrails)

## Out of Scope

- Bootstrap seed delegation — separate ticket; landed independently at archive/tickets/BSBOOT-002-delegate-storylet-seed-pool-to-storylet-pool-authoring.md. The `parent_skill_invocation` flag is shared infrastructure introduced there and reused here.
- MCPENH-013 landed independently at archive/tickets/MCPENH-013-register-storylet-pool-authoring-task-type.md; MCPENH-014 landed independently at archive/tickets/MCPENH-014-add-slb-id-class-to-allocator.md and is not a blocker.
- Patch-engine ops for SLT records — Shape A integration posture preserved (direct Write remains correct).
- `branching-story-health-audit` — deferred sibling, not closing this seam set.
- The Phase 4.5 canon-promotion handoff to story-fact-promotion-to-canon — untouched by this ticket; the JIT-mode delegation preserves the existing handoff path.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'minimal JIT shape|pending BSPAG-001|JIT-shape seams stay open|inlines the minimal JIT shape|forthcoming.*jit' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md` — returned zero hits.
2. `grep -n "mode: jit\|mode='jit'\|jit mode\|runtime_jit" .claude/skills/storylet-pool-authoring/SKILL.md` — returned multiple hits documenting the new mode across Inputs, Process Flow, Phase 1-7 sub-routes, FOUNDATIONS Alignment, and Guardrails.
3. Manual contract review: inspect `branching-story-page-cycle` Phase 4 / Phase 5 / Phase 9 / Phase 11 and `storylet-pool-authoring` Pre-flight / Phase 1-7 to confirm the delegated SLT carries `provenance.origin: runtime_jit`, `provenance.created_at_page: <calling PG-NNNN>`, `visibility.scope: branch_scoped`, passes storylet-pool-authoring's Phase 4 9-gate set, and is written by page-cycle Phase 11 rather than by the sub-routine.

### Invariants

1. JIT-mode invocation produces SLT records whose schema matches `storylet-pool-authoring/templates/storylet-record.yaml` byte-for-byte (no schema fork between modes).
2. The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` continues to fire from page-cycle's Phase 4.5 in every execution_mode; storylet-pool-authoring's gate 2 (resolution-authority) does NOT short-circuit it.
3. JIT-mode HARD-GATE absoluteness is preserved for direct user invocation of storylet-pool-authoring with `mode='jit'` + `parent_skill_invocation=false`; that shape aborts rather than writing. Only the documented sub-routine path (page-cycle Phase 4 calling with `parent_skill_invocation=true`) returns an internal validation packet, and page-cycle's own gate posture governs the eventual write.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `rg -n 'minimal JIT shape|pending BSPAG-001|JIT-shape seams stay open|inlines the minimal JIT shape|forthcoming.*jit' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md` — returned zero lines.
2. `grep -n "mode: jit\|mode='jit'\|jit mode\|runtime_jit" .claude/skills/storylet-pool-authoring/SKILL.md` — returned multiple hits.
3. Manual contract review of `.claude/skills/branching-story-page-cycle/SKILL.md`, `.claude/skills/storylet-pool-authoring/SKILL.md`, and `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`.

## Outcome

Completed on 2026-05-02.

`storylet-pool-authoring` now exposes `mode=jit` as a `branching-story-page-cycle` Phase 4 sub-routine. The mode requires `parent_skill_invocation: true`, `target_pool_size=1`, `created_at_page`, and `caller_state_snapshot`; direct `mode=jit` invocation aborts before allocation or write. JIT produces one branch-scoped `runtime_jit` SLT plus validation packet in memory, bypasses batch diversity, and performs no child writes.

`branching-story-page-cycle` Phase 4 now delegates JIT fallback to `storylet-pool-authoring`. The returned SLT is applied as the selected storylet, rechecked by page-cycle validation, and written by page-cycle Phase 11 inside the page tick's single transaction if the turn commits.

## Verification Result

1. `rg -n 'minimal JIT shape|pending BSPAG-001|JIT-shape seams stay open|inlines the minimal JIT shape|forthcoming.*jit' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md` returned no hits.
2. `grep -n "mode: jit\|mode='jit'\|jit mode\|runtime_jit" .claude/skills/storylet-pool-authoring/SKILL.md` returned hits across the `jit` mode process flow, inputs, pre-flight, phase sub-routes, validation/FIELDS, FOUNDATIONS Alignment, and Guardrails.
3. Manual contract review confirmed page-cycle Phase 4 delegates JIT generation, storylet-pool-authoring returns one `runtime_jit` branch-scoped SLT without writing, page-cycle Phase 5/9/11 consume and write it, and `storylet-record.yaml` already includes `runtime_jit` in `provenance.origin`.
4. `git diff --check` passed.

## Deviations

1. The drafted fixture dry-run was not run because these branching-story skills are prose workflow definitions and the repo has no executable `branching-story-page-cycle` fixture runner. The truthful proof boundary is grep proof plus manual contract review.
2. The drafted child-skill Phase 7 write boundary was corrected. `parent_skill_invocation: true` remains a no-write sub-routine, and page-cycle owns the Phase 11 write transaction for JIT SLTs.
