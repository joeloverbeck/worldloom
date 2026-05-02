# BSPAG-001: Extend `storylet-pool-authoring` with `jit` mode and delegate `branching-story-page-cycle` Phase 4 JIT expansion to it

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/storylet-pool-authoring/SKILL.md` (new `jit` mode added to Inputs + Phase 1 / Phase 2 / Phase 3 / Phase 4 / Phase 5 / Phase 6 / Phase 7 sub-routes), `.claude/skills/branching-story-page-cycle/SKILL.md` (Phase 4 JIT expansion prose; Future-sibling seam removed; Guardrails sibling-interop)
**Deps**: `.claude/skills/storylet-pool-authoring/SKILL.md` (now shipping; this ticket extends it with the runtime JIT mode and closes the seam page-cycle named at lines 565, 1228); archive/tickets/BSBOOT-002-delegate-storylet-seed-pool-to-storylet-pool-authoring.md (precedent for sub-routine invocation pattern via `parent_skill_invocation` flag)

## Problem

`branching-story-page-cycle` Phase 4 currently inlines a minimal JIT-storylet shape with explicit seam markers naming `storylet-pool-authoring` as the future authority for runtime JIT generation:

- `.claude/skills/branching-story-page-cycle/SKILL.md` line 565: `**Future-sibling seam**: when storylet-pool-authoring ships, refactor JIT generation to delegate to its JIT-mode entrypoint; until then, this skill inlines the minimal JIT shape per the proposal.`
- `.claude/skills/branching-story-page-cycle/SKILL.md` line 1228: `**storylet-pool-authoring** — the JIT-mode entrypoint for Phase 4 fallback storylet generation, and the seed-mode entrypoint for branching-story-bootstrap's Phase 6. Until shipping, this skill inlines the minimal JIT shape per the proposal's discipline.`
- Additional in-prose references at lines 340, 579, 1151 are factual (not "not yet shipping") and need only minor revision to match the now-shipping storylet-pool-authoring SKILL.md.

`storylet-pool-authoring` ships now (per the current ticket batch) but exposes only `seed`, `focus`, and (deferred) `audit` modes. It does NOT yet expose a `jit` mode that produces single-storylet branch-scoped runtime expansions. This ticket has two halves:

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
   - Phase 7 → reduced to "single SLT-NNNN write to `_source/storylets/` + INDEX.md storylet-pool counter increment"; SLB-NNNN manifest is not emitted for JIT runs (the manifest is for batch authoring; runtime JIT is per-page-tick)
3. The shared boundary under audit is the contract between (a) page-cycle's Phase 4 JIT-expansion entrypoint, (b) storylet-pool-authoring's new `jit` mode public surface (world_slug + story_slug + mode='jit' + parent_skill_invocation=true + target_pool_size=1 + created_at_page=<PG-NNNN> + caller_state_snapshot=<inline state>), and (c) page-cycle's Phase 5 / Phase 9 / Phase 11 downstream that consume the JIT-emitted SLT (Phase 5 applies the storylet's effects; Phase 9 gate 1 mystery firewall re-checks defense-in-depth; Phase 11 atomic-write includes the new SLT-NNNN.yaml).
4. **FOUNDATIONS principle**: Operational consistency, parallel to BSBOOT-002. Once a deferred-sibling seam can close, it should close — propagating storylet-pool-authoring's 9-gate canon-safety to runtime JIT strengthens the page-cycle's Phase 4 + Phase 9 firewall (storylet-pool-authoring gate 1 mystery firewall + gate 2 resolution-authority + gate 8 branch-contamination supersede the page-cycle's inline runtime checks).
5. This ticket does NOT touch HARD-GATE semantics. Page-cycle's HARD-GATE remains its Phase 10 deliverable approval (gated by execution_mode); the storylet-pool-authoring HARD-GATE is suppressed via the same `parent_skill_invocation: true` flag introduced by BSBOOT-002. The Phase 4.5 canon-promotion handoff to story-fact-promotion-to-canon is preserved untouched — storylet-pool-authoring's gate 2 enforces "canon_candidate authority requires branch_scoped visibility" which is exactly the JIT-mode default, so the promotion handoff continues to fire from page-cycle's Phase 4.5 (NOT from storylet-pool-authoring's Phase 4) — the gate 2 check ensures runtime JIT can carry canon_candidate authority legitimately when the page-cycle's runtime context demands it.
6. This ticket extends storylet-pool-authoring's mode enum (`seed | focus | audit | jit`) and adds runtime invocation surface; does NOT extend any output schema. JIT-emitted SLT records match the same `templates/storylet-record.yaml` schema as seed/focus, with `provenance.origin: runtime_jit`, `provenance.created_at_page: <PG-NNNN>`, and `visibility.scope: branch_scoped` (always — a `global_author_pool` JIT storylet is structurally invalid and is rejected at gate 8).
7. No skill / tool / hook / validator / schema field is renamed or removed. Page-cycle's inlined-minimal-JIT-shape prose is replaced with a delegation reference; the seam markers at lines 565 + 1228 are removed.
8. Reassessment correction: page-cycle SKILL.md at lines 340, 579, 1151 contains additional `storylet-pool-authoring` references that are NOT seam markers — they are factual cross-references ("set at storylet-pool-authoring time", "hard-rejected at storylet-pool-authoring time", "predicate per the Predicate DSL in storylet-pool-authoring"). Those references are correct now that the skill ships and need only minor wording revision: `set at storylet-pool-authoring time` → `set by storylet-pool-authoring at authoring time`; `predicate per the Predicate DSL in storylet-pool-authoring` → `predicate per templates/predicate-dsl.md in .claude/skills/storylet-pool-authoring/`.

## Architecture Check

1. The `jit` mode extension to storylet-pool-authoring is the right primitive (vs page-cycle inlining a parallel minimal shape) for two reasons: (a) storylet-pool-authoring's 9-gate canon-safety check applies uniformly, eliminating a per-skill inline check that could drift; (b) future improvements to storylet-pool-authoring (new gates, refined predicate DSL) propagate to runtime JIT automatically.
2. Sub-routine invocation via `parent_skill_invocation: true` matches BSBOOT-002's pattern, preserving the worldloom skill-non-chaining guardrail (skills don't invoke other skills runtime-style; the flag is a documented invocation-shape variation describing a sub-skill use mode).
3. No backwards-compatibility aliasing. The page-cycle Phase 4 JIT inline shape is replaced with a delegation reference, not preserved as an alias. Storylet-pool-authoring's `jit` mode is a new mode, not an aliased rename of any existing mode.

## Verification Layers

1. **Skill prose grep proof — page-cycle** — `grep -n "Future-sibling seam\|Until shipping, this skill inlines the minimal JIT shape\|Until then, this skill inlines the minimal JIT shape" .claude/skills/branching-story-page-cycle/SKILL.md` returns zero hits after this ticket lands.
2. **Skill prose grep proof — storylet-pool-authoring** — `grep -n "mode: jit\|mode='jit'\|jit mode" .claude/skills/storylet-pool-authoring/SKILL.md` returns hits documenting the new mode in Inputs, Phase 1 sub-route, Phase 2 sub-route, Phase 5 bypass, Phase 6 bypass, and Phase 7 single-storylet write.
3. **Skill dry-run** — invoke `branching-story-page-cycle` against a fixture story bundle in a state that triggers Phase 4 JIT (no candidate scores above eligibility threshold AND consequence-capacity requires JIT). Confirm: (a) page-cycle delegates to storylet-pool-authoring; (b) the delegated JIT call returns ONE SLT with `provenance.origin: runtime_jit` + `provenance.created_at_page: <calling PG-NNNN>` + `visibility.scope: branch_scoped`; (c) the SLT passes storylet-pool-authoring's Phase 4 9-gate set; (d) the SLT flows into page-cycle's Phase 5 mutation, Phase 9 validation, and Phase 11 atomic-write.
4. **FOUNDATIONS alignment check** — storylet-pool-authoring's FOUNDATIONS Alignment table updates Rule 7 + Canon Layering rows to acknowledge the new `jit` mode; page-cycle's FOUNDATIONS Alignment table Rule 7 row updates from "Phase 4 JIT mystery firewall" to "Phase 4 JIT delegated to storylet-pool-authoring (which enforces gate 1 mystery firewall + gate 2 resolution-authority + gate 8 branch-contamination)."

## What to Change

### 1. storylet-pool-authoring — add `jit` mode

`.claude/skills/storylet-pool-authoring/SKILL.md`:

- §Inputs > Optional > `mode`: extend the enum to `seed | focus | audit | jit`. Document `jit` as "runtime JIT invocation by branching-story-page-cycle Phase 4 — produces a single branch-scoped storylet for the calling page; sub-routine-only (parent_skill_invocation: true required)."
- Add new optional argument `created_at_page: PG-NNNN` (required when mode='jit'; ignored otherwise — used to populate `provenance.created_at_page` and to scope the branch_path for the new storylet's `branch_scoped` visibility).
- Add new optional argument `caller_state_snapshot: <inline JSON>` (required when mode='jit' and parent_skill_invocation=true; ignored otherwise — provides the page's state_snapshot to drive Phase 1's reduced single-row diagnosis).
- §Process Flow ASCII: add a "JIT mode" branch annotation showing Phase 1 / Phase 2 / Phase 5 / Phase 6 sub-routes.
- §Phase 1: add §Sub-route for jit mode — "Diagnosis is reduced to a single row: {gap_kind: 'continuation_failure', target_record_id: <calling page's failure_reason record-id>, priority_weight: max}. No pool scan, no recent-history scan."
- §Phase 2: add §Sub-route for jit mode — "Produce ONE seed sized to the failure-reason context. The calling page's `state_snapshot.current_storylet_eligibility_failure_reason` is the seed brief's input. Shape weighting is bypassed (single-seed batch has no shape distribution)."
- §Phase 3: unchanged (per-seed prompt assembly + engine wrap apply uniformly).
- §Phase 4: unchanged — 9 gates apply per-storylet; JIT-mode adds an explicit "visibility.scope MUST be branch_scoped" pre-gate check (a structural pre-condition, not a 10th gate — a JIT call producing global_author_pool would fail gate 8 anyway).
- §Phase 5: add §Bypass for jit mode — "Diversity audit is bypassed for single-storylet batches. The batch-level branch-contamination check is bypassed (Phase 4 gate 8 already covers the per-storylet check, which is the only check meaningful for single-storylet batches)."
- §Phase 6: add §Bypass for jit mode — "When parent_skill_invocation=true, HARD-GATE deliverable summary is downgraded to an internal validation pass; the batch + approved SLT records are returned in-memory to the caller. The caller's HARD-GATE governs the user-facing approval surface."
- §Phase 7: add §Sub-route for jit mode — "Atomic write is reduced: write ONE SLT-NNNN.yaml to `_source/storylets/`; INDEX.md storylet-pool counter increment is the LAST write. SLB-NNNN manifest is NOT emitted for JIT runs (no storylet-batches/SLB-*.md write); the JIT run's audit trail lives on the calling page's record (`PG-NNNN.applied_storylet_jit_provenance`)."
- §Validation Rules: confirm 4 rules apply uniformly across modes.
- §FOUNDATIONS Alignment: add a row noting `jit` mode is the runtime sub-route producing branch_scoped storylets with provenance.origin=runtime_jit; canon-promotion handoff stays at page-cycle Phase 4.5.
- §Guardrails: add a bullet documenting `jit` mode's sub-routine-only invocation contract.

### 2. page-cycle — refactor Phase 4 JIT expansion

`.claude/skills/branching-story-page-cycle/SKILL.md`:

- §Phase 4 JIT-expansion sub-section: replace the inlined minimal JIT shape prose with a delegation: "When JIT expansion fires (no candidate scores above eligibility threshold AND consequence-capacity requires JIT), invoke `storylet-pool-authoring` with `mode='jit'`, `parent_skill_invocation=true`, `target_pool_size=1`, `created_at_page=<this_PG_id>`, `caller_state_snapshot=<this_state_snapshot>`. The delegated call returns ONE SLT-NNNN record carrying `provenance.origin: runtime_jit`, `provenance.created_at_page: <this_PG>`, and `visibility.scope: branch_scoped`. The SLT flows into Phase 5 state mutation as the realized storylet for this turn."
- §line 565 (Future-sibling seam): remove.
- §line 1228 (storylet-pool-authoring entry under "Sibling interop"): rewrite from "Until shipping, this skill inlines the minimal JIT shape per the proposal's discipline" to "Phase 4 JIT delegation: page-cycle invokes storylet-pool-authoring's jit mode when no candidate from the current pool meets eligibility threshold; the delegated call produces a single branch_scoped SLT-NNNN that flows into Phase 5."
- §line 340 (factual cross-reference): revise wording from "set at storylet-pool-authoring time" to "set by storylet-pool-authoring at authoring time (seed/focus/jit modes)."
- §line 579 (factual cross-reference): unchanged in meaning; verify wording is current.
- §line 1151 (predicate DSL cross-reference): revise wording from "predicate per the Predicate DSL in storylet-pool-authoring" to "predicate per templates/predicate-dsl.md in `.claude/skills/storylet-pool-authoring/`."
- §FOUNDATIONS Alignment table Rule 7 row: update mechanism citation to acknowledge JIT delegation.
- §Guardrails > Sibling interop: confirm storylet-pool-authoring is in "Consumes (existing)" with the JIT-delegation contract documented.

### 3. Verification

After landing, run `branching-story-page-cycle` against a fixture story bundle in a state that triggers Phase 4 JIT. Manual review of the page-cycle diff confirms no inlined minimal-JIT-shape remains; manual review of the storylet-pool-authoring diff confirms the new `jit` mode is documented across Phase 1-7 sub-routes.

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

1. `grep -n "Future-sibling seam\|Until shipping, this skill inlines the minimal JIT shape\|Until then, this skill inlines the minimal JIT shape" .claude/skills/branching-story-page-cycle/SKILL.md` — returns zero hits after this ticket lands.
2. `grep -n "mode: jit\|mode='jit'\|jit mode\|runtime_jit" .claude/skills/storylet-pool-authoring/SKILL.md` — returns multiple hits documenting the new mode across Inputs, Process Flow, Phase 1-7 sub-routes, FOUNDATIONS Alignment, and Guardrails.
3. Skill dry-run: invoke `branching-story-page-cycle` against a fixture in a JIT-triggering state; confirm the delegated SLT carries `provenance.origin: runtime_jit`, `provenance.created_at_page: <calling PG-NNNN>`, `visibility.scope: branch_scoped`, and passes storylet-pool-authoring's Phase 4 9-gate set.

### Invariants

1. JIT-mode invocation produces SLT records whose schema matches `storylet-pool-authoring/templates/storylet-record.yaml` byte-for-byte (no schema fork between modes).
2. The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` continues to fire from page-cycle's Phase 4.5 in every execution_mode; storylet-pool-authoring's gate 2 (resolution-authority) does NOT short-circuit it.
3. JIT-mode HARD-GATE absoluteness is preserved for direct user invocation of storylet-pool-authoring with `mode='jit'` + `parent_skill_invocation=false`; only the documented sub-routine path (page-cycle Phase 4 calling with `parent_skill_invocation=true`) downgrades the user-facing gate.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "Future-sibling seam\|Until shipping, this skill inlines the minimal JIT shape\|Until then, this skill inlines the minimal JIT shape" .claude/skills/branching-story-page-cycle/SKILL.md` — should return zero lines.
2. `grep -n "mode: jit\|mode='jit'\|jit mode\|runtime_jit" .claude/skills/storylet-pool-authoring/SKILL.md` — should return multiple hits.
3. Manual skill dry-run of `branching-story-page-cycle` against a JIT-triggering fixture.
