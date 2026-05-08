# SPEC21SCECOM-007: SKILL.md + storylet-batch-manifest.md cross-cutting docs ticket

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — coordinated updates to `.claude/skills/storylet-pool-authoring/SKILL.md` (Process Flow ASCII diagram, HARD-GATE block, phase descriptions, mode discipline) and `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (per-arc summary line for arc semantics)
**Deps**: `archive/tickets/SPEC21SCECOM-001.md`, `archive/tickets/SPEC21SCECOM-002.md`, SPEC21SCECOM-003, SPEC21SCECOM-004, SPEC21SCECOM-005, SPEC21SCECOM-006 (all upstream Phase rewrites + new template + governance update — SKILL.md must reflect ALL Phase rewrites; manifest must reflect arc semantics from Phase 4-5)

## Problem

After the upstream Phase rewrites land (SPEC21SCECOM-001 through SPEC21SCECOM-006), the skill's top-level `SKILL.md` is internally inconsistent: the HARD-GATE block enumerates "9 Phase 4 gates" while the Phase 4-5 reference enumerates 14; the Process Flow ASCII diagram describes per-shape diversity while Phase 5 measures per-commitment_class; the JIT mode procedure description doesn't match SPEC-21 §E's template-cascade specification; the SLB batch manifest template's per-storylet summary line lists v1 fields (`<shape>` distribution) while Phase 6 deliverable summary needs commitment_class + arc_archetype + value_delta_target.axes[]. This is a cross-cutting docs ticket per the §Cross-Cutting Docs Ticket Shape pattern: no production code, atomic landing of multiple docs surfaces once the upstream implementation tickets ship, verified through grep-proofs against the post-implementation tree.

## Assumption Reassessment (2026-05-08)

1. The current `.claude/skills/storylet-pool-authoring/SKILL.md` (verified during SPEC-21 reassessment 2026-05-08) has multiple v1-anchored references that need updating: HARD-GATE block enumerates "9 Phase 4 per-storylet gates" (`mystery firewall, resolution-authority declaration, invariant compatibility, consequence capacity, dedup, content-intensity coherence, predicate DSL parsability, branch-contamination, schema completeness`); Process Flow ASCII diagram describes Phase 4 as 9 gates and Phase 5 as 6 axes including `shape ≤40%`; Phase 5 axis count described as `six diversity-axis checks`. Mode-router procedure step 5 references "all 9 Phase 4 per-storylet gates" — must update to 14. The §Schema transition note at line 54 documents the v1-to-v2 boundary disclosure and may be revised post-implementation now that SPEC21SCECOM-003 through SPEC21SCECOM-006 have rewritten the operational phases.
2. The current `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (verified during SPEC-21 reassessment Step 2) is the template for the SLB-NNNN.md batch manifest. Per SPEC-21 §Deliverables row 8, the per-storylet summary line must include `commitment_class`, `arc_archetype`, and `value_delta_target.axes[]`. The current template likely uses v1 fields (`<shape>`, `<intensity>`); this ticket updates the per-arc line accordingly.
3. Cross-skill boundary under audit: the SKILL.md HARD-GATE block is the user-facing safety contract for direct invocation. Modifying it from "9 gates" to "14 gates" is a HARD-GATE-semantics-touching change — the change adds new HARD-REJECT failure modes (gates 10-14) but does NOT weaken the existing 9 gates' enforcement. Per FOUNDATIONS Rule 7 (Preserve Mystery Deliberately): gate 1 mystery-firewall hard-reject of canon_candidate-on-author-pool storylets is preserved as a structurally-prior refusal — the change strengthens (not weakens) the Mystery Reserve firewall by adding the v2 envelope-level discipline.
4. HARD-GATE / canon-write ordering surface under audit: this ticket does NOT modify canon-write ordering (the skill remains a story-bundle write-only authoring skill that routes through `submit_patch_plan` with `create_slt_record` ops; world-canon mutation continues to route through `story-fact-promotion-to-canon` → `canon-addition` HARD-GATE handoff). The HARD-GATE block update is an enumeration update (9 → 14 gate names), not an ordering change.
5. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 reconciled the gate count (14), Phase 5 axes (commitment_class ≤30%, arc_archetype ≤25%, dramatic-unit-coverage from `beat_plan.beats[].state_significance` 8-axis), Gate 14 trigger (fact_create + world_level + exception_governance), and §Out of Scope routing for Phase 5b coverage. Implementation must reflect all four reconciliations in the SKILL.md prose.

## Architecture Check

1. Cross-cutting docs ticket pattern (per §Cross-Cutting Docs Ticket Shape) is the right shape because: (a) ≥1 docs surface (HARD-GATE block) requires all upstream surfaces to exist coherently before it can land — naming "14 gates" before SPEC21SCECOM-006 lands the gate enumeration would be a forward-reference to a non-existent definition; (b) the SLB manifest template's per-arc summary line requires Phase 4-5's commitment_class / arc_archetype / value_delta_target axes vocabulary to be authoritative. Per-ticket docs decoupling would create a staleness window where the SKILL.md HARD-GATE references gates that don't yet exist in the Phase 4-5 reference.
2. No backwards-compatibility shims — the Process Flow diagram, HARD-GATE block, and mode-router procedure are all updated in place; v1 references to per-shape diversity and 9 gates are replaced (not aliased).

## Verification Layers

1. SKILL.md HARD-GATE 14-gate enumeration invariant → codebase grep-proof: `grep -E "(14 Phase 4|14 gates|all 14)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match in the HARD-GATE block; `grep -E "all 9 Phase 4|9 gates" .claude/skills/storylet-pool-authoring/SKILL.md` returns 0 matches in any user-facing prose (legacy 9-gate references retired).
2. Process Flow Phase 5 axes invariant → grep-proof: the Phase 5 ASCII-diagram description references commitment_class + arc_archetype + dramatic-unit-coverage rather than per-shape ≤40%.
3. JIT mode template-cascade procedure invariant → manual review: the SKILL.md description of `mode=jit` matches SPEC-21 §E's eight-step template-cascade specification (classify commitment → select archetype → fill minimum viable fields → validate → render → mark provenance → cache → defer promotion).
4. Manifest per-arc line invariant → grep-proof: `grep -E "(commitment_class|arc_archetype|value_delta_target)" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` returns ≥3 matches (the per-arc summary line has been updated).
5. Out-of-scope Phase 5b routing note invariant → grep-proof: per SPEC-21 §Out of Scope (post-reassessment), Phase 5b coverage extends transitively via SPEC-22 Track 2; SKILL.md's Phase 5b inline block at lines 246-255 stays unchanged structurally (the validators it lists remain the same; SPEC-22 extends them transparently). Manual review confirms Phase 5b inline block is NOT modified by this ticket beyond updating the Phase 4 gate-count reference if any.
6. FOUNDATIONS Rule 7 alignment check: HARD-GATE block's gate 1 description still includes the canon_candidate-on-author-pool refusal (verified via grep against the existing prose).

## What to Change

### 1. Update `.claude/skills/storylet-pool-authoring/SKILL.md`

Coordinated updates across Process Flow, HARD-GATE, phase descriptions, and mode discipline:

- **HARD-GATE block (line 56-58)**: change "9 Phase 4 per-storylet gates" enumeration to 14 gates, naming gates 10-14 inline (Arc envelope conformance, Stop-policy parsability, Effect-model legality, Exit-portfolio completeness, Rule 11 spectator-caste leverage). Preserve the canon_candidate-on-author-pool firewall paragraph unchanged. Update "all six Phase 5 diversity-audit checks" to the v2 axis count (commitment_class, arc_archetype, tone, theme, content-intensity, OBL-engagement, cast usage, dramatic-unit-coverage = 8 axes; or articulate as "all Phase 5 diversity-axis checks" to avoid hardcoding the count).
- **Process Flow ASCII diagram (line 60-187)**: update Phase 4 description to "all 14 gates" and enumerate the new gate names; update Phase 5 description to v2 axes (commitment_class ≤30%, arc_archetype ≤25%, dramatic-unit-coverage from `beat_plan.beats[].state_significance` ≥30% per axis); other phase descriptions reflect arc-granular semantics (Phase 1 diagnosis matrix per-commitment_class; Phase 2 arc-seed format with 11 fields; Phase 3 arc-schema fill).
- **Procedure section (line 232-244)**: update step 5 description to "all 14 Phase 4 per-storylet gates" and "Phase 5's <axis-count> diversity-axis checks"; update step 4 to mention archetype excerpts in the LLM prompt; update step 2 to describe per-commitment_class diagnosis matrix.
- **JIT mode procedure**: update the description in §Process Flow + §Inputs to match SPEC-21 §E's eight-step template-cascade specification.
- **§Schema transition note (line 54)**: revise to indicate that SPEC-21 has now landed the operational phase rewrites (refer to SPEC21SCECOM-001 through SPEC21SCECOM-006 by spec name); the boundary disclosure becomes a historical-context note rather than a forward-warning.
- **§Phase 6 deliverable summary template (line 261-309)**: update the SHAPE DISTRIBUTION block label to "COMMITMENT_CLASS DISTRIBUTION" and "ARC_ARCHETYPE DISTRIBUTION"; update the per-storylet summary line format to include `<commitment_class>, <arc_archetype>, <value_delta_target.axes>` instead of `<shape>`.

### 2. Update `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md`

Per SPEC-21 §Deliverables row 8: update the per-arc summary line in the manifest template to include `commitment_class`, `arc_archetype`, and `value_delta_target.axes[]`. The diversity summary section likewise updates from per-shape distribution to per-commitment_class + per-arc_archetype distribution + dramatic-unit-coverage axis distribution.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — Process Flow + HARD-GATE + procedure + JIT mode + Phase 6 deliverable summary template)
- `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (modify — per-arc summary line + diversity summary section)

## Out of Scope

- Production code changes (this is a docs-only ticket; no `tools/` or `validators/` edits)
- SPEC-22 Track 2 validator implementations (owned by SPEC-22)
- Updates to sibling skills (`branching-story-bootstrap`, `branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon`) — those updates are owned by SPEC-22 Track 4
- Updates to `tools/world-index/src/public/canonical-vocabularies.ts` (owned by SPEC-22 Track 3)
- The Phase 5b inline block at SKILL.md lines 246-255 remains structurally unchanged (the validators it lists extend transparently via SPEC-22 Track 2; per SPEC-21 §Out of Scope reassessment-2026-05-08 addition)

## Acceptance Criteria

### Tests That Must Pass

1. SKILL.md HARD-GATE block references 14 gates: `grep -nE "(14 Phase 4|14 gates|all 14)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match in the HARD-GATE block (lines ~56-58)
2. Legacy 9-gate references retired: `grep -nE "(all 9 Phase 4|9 gates|nine Phase 4)" .claude/skills/storylet-pool-authoring/SKILL.md` returns 0 matches in active prose (only the historical §Schema transition note may retain the term as a historical-context reference, if any)
3. Phase 5 v2 axes referenced in Process Flow + HARD-GATE: `grep -nE "(commitment_class.*≤30|arc_archetype.*≤25|dramatic-unit-coverage)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥3 matches across Process Flow + HARD-GATE + procedure
4. Legacy per-shape diversity reference retired: `grep -nE "shape ≤40%|per-shape distribution" .claude/skills/storylet-pool-authoring/SKILL.md` returns 0 matches in active prose
5. JIT mode template-cascade described: `grep -nE "(template cascade|template-cascade)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match
6. Manifest per-arc line updated: `grep -nE "(commitment_class|arc_archetype|value_delta_target)" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` returns ≥3 matches
7. Phase 5b inline block unchanged: `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | wc -l` returns roughly the same line count as before this ticket (Phase 5b coverage list extends transparently via SPEC-22; no SPEC-21 changes required per §Out of Scope)
8. Gate 1 mystery-firewall canon_candidate refusal preserved: `grep "canon_candidate.*author-pool" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match in the HARD-GATE block

### Invariants

1. SKILL.md is internally consistent with the upstream Phase rewrites (SPEC21SCECOM-001 through SPEC21SCECOM-006): gate count = 14, axis basis = `beat_plan.beats[].state_significance`, JIT mode = template cascade
2. HARD-GATE block strengthens the Mystery Reserve firewall (v2 envelope-level discipline added to v1 storylet-level discipline) — does NOT weaken FOUNDATIONS Rule 7 enforcement
3. canon_candidate-on-author-pool refusal preserved as a structurally-prior pre-HARD-GATE refusal
4. Phase 5b inline block is structurally unchanged — its validator coverage list extends transparently via SPEC-22 Track 2

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. End-to-end skill dry-run (`storylet-pool-authoring mode=seed` against a real story bundle, verifying internal consistency between HARD-GATE summary, Phase 4 enumeration in references/, and SLB manifest output) becomes runnable when SPEC-22 Track 2 validators land.

### Commands

1. `grep -nE "(14 Phase 4|14 gates|all 14)" .claude/skills/storylet-pool-authoring/SKILL.md` (expect ≥1 — HARD-GATE block updated)
2. `grep -nE "(all 9 Phase 4|9 gates|shape ≤40)" .claude/skills/storylet-pool-authoring/SKILL.md` (expect 0 — legacy references retired)
3. `grep -nE "(commitment_class|arc_archetype|value_delta_target)" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (expect ≥3 — manifest updated)
4. `grep -n "canon_candidate.*author-pool" .claude/skills/storylet-pool-authoring/SKILL.md` (expect ≥1 — gate 1 firewall preserved)
5. `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -E "(record_schema_compliance|storylet_predicate_dsl_parsability|rule11_action_space|rule12_redundancy)"` (expect the existing 4-validator coverage list intact — Phase 5b unchanged)
