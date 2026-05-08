# SPEC21SCECOM-007: SKILL.md + storylet-batch-manifest.md cross-cutting docs ticket

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — coordinated updates to `.claude/skills/storylet-pool-authoring/SKILL.md` (Process Flow ASCII diagram, HARD-GATE block, phase descriptions, mode discipline) and `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (per-arc summary line for arc semantics)
**Deps**: `archive/tickets/SPEC21SCECOM-001.md`, `archive/tickets/SPEC21SCECOM-002.md`, `archive/tickets/SPEC21SCECOM-003.md`, `archive/tickets/SPEC21SCECOM-004.md`, `archive/tickets/SPEC21SCECOM-005.md`, `archive/tickets/SPEC21SCECOM-006.md` (all upstream Phase rewrites + new template + governance update — SKILL.md must reflect ALL Phase rewrites; manifest must reflect arc semantics from Phase 4-5)

## Problem

At intake, after the upstream Phase rewrites landed (SPEC21SCECOM-001 through SPEC21SCECOM-006), the skill's top-level `SKILL.md` was internally inconsistent: the HARD-GATE block enumerated "9 Phase 4 gates" while the Phase 4-5 reference enumerated 14; the Process Flow ASCII diagram described per-shape diversity while Phase 5 measured per-commitment_class; the JIT mode procedure description did not match SPEC-21 §E's template-cascade specification; the SLB batch manifest template's per-storylet summary line listed v1 fields (`<shape>` distribution) while Phase 6 deliverable summary needed commitment_class + arc_archetype + value_delta_target.axes[]. This cross-cutting docs ticket landed the post-upstream alignment with no production code changes.

## Assumption Reassessment (2026-05-08)

1. At reassessment, `.claude/skills/storylet-pool-authoring/SKILL.md` had multiple v1-anchored references: HARD-GATE block enumerated "9 Phase 4 per-storylet gates" (`mystery firewall, resolution-authority declaration, invariant compatibility, consequence capacity, dedup, content-intensity coherence, predicate DSL parsability, branch-contamination, schema completeness`); Process Flow ASCII diagram described Phase 4 as 9 gates and Phase 5 as 6 axes including `shape ≤40%`; Phase 5 axis count described `six diversity-axis checks`. Mode-router procedure step 5 referenced "all 9 Phase 4 per-storylet gates". This ticket updated those parent-skill references to the landed 14-gate and v2 Phase 5 arc-axis contract.
2. At reassessment, `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` was the template for the SLB-NNNN.md batch manifest and still used v1 fields (`<shape>`, `<intensity>`). Per SPEC-21 §Deliverables row 8, the landed per-storylet summary line includes `commitment_class`, `arc_archetype`, and `value_delta_target.axes[]`.
3. Cross-skill boundary under audit: the SKILL.md HARD-GATE block is the user-facing safety contract for direct invocation. Modifying it from "9 gates" to "14 gates" is a HARD-GATE-semantics-touching change — the change adds new HARD-REJECT failure modes (gates 10-14) but does NOT weaken the existing 9 gates' enforcement. Per FOUNDATIONS Rule 7 (Preserve Mystery Deliberately): gate 1 mystery-firewall hard-reject of canon_candidate-on-author-pool storylets is preserved as a structurally-prior refusal — the change strengthens (not weakens) the Mystery Reserve firewall by adding the v2 envelope-level discipline.
4. HARD-GATE / canon-write ordering surface under audit: this ticket does NOT modify canon-write ordering (the skill remains a story-bundle write-only authoring skill that routes through `submit_patch_plan` with `create_slt_record` ops; world-canon mutation continues to route through `story-fact-promotion-to-canon` → `canon-addition` HARD-GATE handoff). The HARD-GATE block update is an enumeration update (9 → 14 gate names), not an ordering change.
5. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 reconciled the gate count (14), Phase 5 axes (commitment_class ≤30%, arc_archetype ≤25%, dramatic-unit-coverage from `beat_plan.beats[].state_significance` 8-axis), Gate 14 trigger (fact_create + world_level + exception_governance), and §Out of Scope routing for Phase 5b coverage. Implementation must reflect all four reconciliations in the SKILL.md prose.
6. Same-seam correction from archived dependency closeout: `archive/tickets/SPEC21SCECOM-005.md` explicitly left parent `SKILL.md` v1 `choice_templates` references for this ticket. The live Phase 5b inline block still describes `record_schema_compliance` as requiring `4-6 choice_templates`, which contradicts Phase 3's v2 choice-template retirement. This ticket owns the parent-skill correction: Phase 5b remains the same pre-validation phase and validator list, but the storylet-record backstop prose must name v2 structural fields and `exit_portfolio.native_seeds[]` instead of `choice_templates`.

## Architecture Check

1. Cross-cutting docs ticket pattern (per §Cross-Cutting Docs Ticket Shape) is the right shape because: (a) ≥1 docs surface (HARD-GATE block) requires all upstream surfaces to exist coherently before it can land — naming "14 gates" before SPEC21SCECOM-006 lands the gate enumeration would be a forward-reference to a non-existent definition; (b) the SLB manifest template's per-arc summary line requires Phase 4-5's commitment_class / arc_archetype / value_delta_target axes vocabulary to be authoritative. Per-ticket docs decoupling would create a staleness window where the SKILL.md HARD-GATE references gates that don't yet exist in the Phase 4-5 reference.
2. No backwards-compatibility shims — the Process Flow diagram, HARD-GATE block, and mode-router procedure are all updated in place; v1 references to per-shape diversity and 9 gates are replaced (not aliased).

## Verification Layers

1. SKILL.md HARD-GATE 14-gate enumeration invariant → codebase grep-proof: `grep -E "(14 Phase 4|14 gates|all 14)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match in the HARD-GATE block; `grep -E "all 9 Phase 4|9 gates" .claude/skills/storylet-pool-authoring/SKILL.md` returns 0 matches in any user-facing prose (legacy 9-gate references retired).
2. Process Flow Phase 5 axes invariant → grep-proof: the Phase 5 ASCII-diagram description references commitment_class + arc_archetype + dramatic-unit-coverage rather than per-shape ≤40%.
3. JIT mode template-cascade procedure invariant → manual review: the SKILL.md description of `mode=jit` matches SPEC-21 §E's eight-step template-cascade specification (classify commitment → select archetype → fill minimum viable fields → validate → render → mark provenance → cache → defer promotion).
4. Manifest per-arc line invariant → grep-proof: `grep -E "(commitment_class|arc_archetype|value_delta_target)" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` returns ≥3 matches (the per-arc summary line has been updated).
5. Out-of-scope Phase 5b routing note invariant → manual review: per SPEC-21 §Out of Scope (post-reassessment), Phase 5b remains the existing engine pre-validation phase and keeps the same validator list; this ticket only corrects parent-skill v1 storylet-record backstop prose such as `choice_templates` and gate-count references to the v2 structural contract.
6. FOUNDATIONS Rule 7 alignment check: HARD-GATE block's gate 1 description still includes the canon_candidate-on-author-pool refusal (verified via grep against the existing prose).

## Landed Changes

### 1. Updated `.claude/skills/storylet-pool-authoring/SKILL.md`

Coordinated updates across Process Flow, HARD-GATE, phase descriptions, and mode discipline:

- **HARD-GATE block**: changed the Phase 4 enumeration to all 14 gates, including Arc envelope conformance, Stop-policy parsability, Effect-model legality, Exit-portfolio completeness, and Rule 11 spectator-caste leverage. The canon_candidate-on-author-pool firewall paragraph remains present. Phase 5 now names mode-appropriate v2 diversity-axis checks.
- **Process Flow ASCII diagram**: Phase 1-5 now use arc semantics: commitment_class / arc_archetype diagnosis, 11-field arc seeds, SLT v2 arc drafting with archetype excerpts, all 14 Phase 4 gates, and v2 Phase 5 axes including dramatic-unit-coverage from `beat_plan.beats[].state_significance`.
- **Procedure section**: step 2 names the commitment_class / arc_archetype diagnosis matrix, step 4 names `templates/arc-archetypes.md`, step 5 names all 14 gates, and Phase 5b record-schema prose now names v2 structural fields.
- **JIT mode procedure**: Inputs now describe SPEC-21 §E's template cascade: classify commitment, select archetype, fill minimum viable runtime fields, validate, render through the caller, mark provenance, cache, and defer promotion.
- **Schema transition note**: revised from forward-warning to current-state note after SPEC21SCECOM-001 through SPEC21SCECOM-006.
- **Phase 5b inline block**: preserved the engine pre-validation phase and validator list, while retiring v1 `choice_templates` backstop prose in favor of v2 structural blocks and `exit_portfolio.native_seeds[]`.
- **Phase 6 deliverable summary template**: replaced shape distribution with commitment_class / arc_archetype distribution and updated the per-storylet summary line to include commitment_class, arc_archetype, value_delta_target axes, and intensity.
- **Phase 7 INDEX.md guidance**: storylet-pool summary now updates per-commitment_class / per-arc_archetype / per-content_intensity distributions.

### 2. Updated `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md`

Per SPEC-21 §Deliverables row 8: the per-arc summary line now includes `commitment_class`, `arc_archetype`, and `value_delta_target.axes[]`. The diversity summary section now uses per-commitment_class + per-arc_archetype distribution + dramatic-unit-coverage axis distribution, and rejected-candidate rows include gates 10-14.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — Process Flow + HARD-GATE + procedure + JIT mode + Phase 6 deliverable summary template)
- `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (modify — per-arc summary line + diversity summary section)
- `tickets/SPEC21SCECOM-007.md` (modify — reassessment correction + completed closeout)

## Out of Scope

- Production code changes (this is a docs-only ticket; no `tools/` or `validators/` edits)
- SPEC-22 Track 2 validator implementations (owned by SPEC-22)
- Updates to sibling skills (`branching-story-bootstrap`, `branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon`) — those updates are owned by SPEC-22 Track 4
- Updates to `tools/world-index/src/public/canonical-vocabularies.ts` (owned by SPEC-22 Track 3)
- The Phase 5b inline block keeps the same engine pre-validation phase and validator list; v1 storylet-record backstop prose is corrected to the v2 structural contract as same-seam parent-skill fallout

## Acceptance Criteria

### Tests That Must Pass

1. SKILL.md HARD-GATE block references 14 gates: `grep -nE "(14 Phase 4|14 gates|all 14)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match in the HARD-GATE block (lines ~56-58)
2. Legacy 9-gate references retired: `grep -nE "(all 9 Phase 4|9 gates|nine Phase 4)" .claude/skills/storylet-pool-authoring/SKILL.md` returns 0 matches in active prose (only the historical §Schema transition note may retain the term as a historical-context reference, if any)
3. Phase 5 v2 axes referenced in Process Flow + HARD-GATE: `grep -nE "(commitment_class.*≤30|arc_archetype.*≤25|dramatic-unit-coverage)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥3 matches across Process Flow + HARD-GATE + procedure
4. Legacy per-shape diversity reference retired: `grep -nE "shape ≤40%|per-shape distribution" .claude/skills/storylet-pool-authoring/SKILL.md` returns 0 matches in active prose
5. JIT mode template-cascade described: `grep -nE "(template cascade|template-cascade)" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match
6. Manifest per-arc line updated: `grep -nE "(commitment_class|arc_archetype|value_delta_target)" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` returns ≥3 matches
7. Phase 5b inline block keeps the existing pre-validation phase and validator list while retiring v1 `choice_templates` backstop prose: `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -E "(record_schema_compliance|storylet_predicate_dsl_parsability|rule11_action_space|rule12_redundancy)"` returns the existing validator coverage list, and `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -n "choice_templates"` returns 0
8. Gate 1 mystery-firewall canon_candidate refusal preserved: `grep "canon_candidate.*author-pool" .claude/skills/storylet-pool-authoring/SKILL.md` returns ≥1 match in the HARD-GATE block

### Invariants

1. SKILL.md is internally consistent with the upstream Phase rewrites (SPEC21SCECOM-001 through SPEC21SCECOM-006): gate count = 14, axis basis = `beat_plan.beats[].state_significance`, JIT mode = template cascade
2. HARD-GATE block strengthens the Mystery Reserve firewall (v2 envelope-level discipline added to v1 storylet-level discipline) — does NOT weaken FOUNDATIONS Rule 7 enforcement
3. canon_candidate-on-author-pool refusal preserved as a structurally-prior pre-HARD-GATE refusal
4. Phase 5b remains the same engine pre-validation phase and validator list — only v1 storylet-record backstop prose is corrected to the v2 structural contract

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. End-to-end skill dry-run (`storylet-pool-authoring mode=seed` against a real story bundle, verifying internal consistency between HARD-GATE summary, Phase 4 enumeration in references/, and SLB manifest output) becomes runnable when SPEC-22 Track 2 validators land.

### Commands

1. `grep -nE "(14 Phase 4|14 gates|all 14)" .claude/skills/storylet-pool-authoring/SKILL.md` (expect ≥1 — HARD-GATE block updated)
2. `grep -nE "(all 9 Phase 4|9 gates|shape ≤40)" .claude/skills/storylet-pool-authoring/SKILL.md` (expect 0 — legacy references retired)
3. `grep -nE "(commitment_class|arc_archetype|value_delta_target)" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (expect ≥3 — manifest updated)
4. `grep -n "canon_candidate.*author-pool" .claude/skills/storylet-pool-authoring/SKILL.md` (expect ≥1 — gate 1 firewall preserved)
5. `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -E "(record_schema_compliance|storylet_predicate_dsl_parsability|rule11_action_space|rule12_redundancy)"` (expect the existing validator coverage list intact — Phase 5b phase shape preserved)
6. `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -n "choice_templates"` (expect 0 — v1 storylet-record backstop prose retired)

## Outcome

Completed 2026-05-08. Updated the parent `storylet-pool-authoring` skill and SLB manifest template so the cross-cutting surfaces now match the landed SPEC-21 phase references: 14 Phase 4 gates, v2 Phase 5 arc-diversity axes, SPEC-21 JIT template cascade, v2 Phase 5b record-schema backstop prose, and commitment_class / arc_archetype / value_delta_target batch-manifest fields.

## Verification Result

1. `grep -nE "(14 Phase 4|14 gates|all 14)" .claude/skills/storylet-pool-authoring/SKILL.md` -> matched the summary, HARD-GATE block, Process Flow, procedure, and Phase 6 validation verdict template.
2. `grep -nE "(all 9 Phase 4|9 gates|shape ≤40)" .claude/skills/storylet-pool-authoring/SKILL.md` -> no output, exit 1 as expected.
3. `grep -nE "(commitment_class|arc_archetype|value_delta_target)" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` -> 3 matching lines.
4. `grep -n "canon_candidate.*author-pool" .claude/skills/storylet-pool-authoring/SKILL.md` -> matched the preserved HARD-GATE firewall and related guardrail prose.
5. `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -E "(record_schema_compliance|storylet_predicate_dsl_parsability|rule11_action_space|rule12_redundancy)"` -> matched the existing Phase 5b validator coverage list.
6. `awk '/^## Phase 5b/,/^## Phase 6/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -n "choice_templates"` -> no output, exit 1 as expected.
7. `grep -nE "(commitment_class.*≤30|arc_archetype.*≤25|dramatic-unit-coverage)" .claude/skills/storylet-pool-authoring/SKILL.md | wc -l` -> 4.
8. `grep -nE "(template cascade|template-cascade)" .claude/skills/storylet-pool-authoring/SKILL.md | wc -l` -> 1.
9. `rg -n "\bshape/content\b|all 9 Phase 4|9 gates|six Phase 5|6 axes|shape ≤40|per-shape distribution|Shape distribution|choice_templates" .claude/skills/storylet-pool-authoring/SKILL.md .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` -> no output, exit 1 as expected.

## Deviations

- The active ticket absorbed the same-seam Phase 5b `choice_templates` correction from `archive/tickets/SPEC21SCECOM-005.md`. The Phase 5b phase shape and validator list stayed intact; only the parent-skill storylet-record backstop prose changed to the v2 structural contract.
- No executable `storylet-pool-authoring` dry-run was run. The live repo has no executable skill runner for this docs-only surface, so verification remained grep/manual-review based as planned.
