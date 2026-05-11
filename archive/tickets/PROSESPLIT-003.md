# PROSESPLIT-003: Create _shared-templates/page-plan.md (comprehensive plan template)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new shared-template directory `.claude/skills/_shared-templates/` and template file. No skill SKILL.md changes in this ticket; PROSESPLIT-006 and PROSESPLIT-007 wire the consumers.
**Deps**: None (the template is self-contained; PROSESPLIT-006 and PROSESPLIT-007 depend on this template existing).

## Problem

The plan-and-finalize rework requires a single canonical plan template consumed by both `branching-story-bootstrap` Phase 7 (root-page case) and `branching-story-page-cycle` Phase 7 (multi-beat-arc case). The template defines:

- A YAML frontmatter schema (engine-readable; consumed by validators, Phase 7.5 declared-affordance validation, and `branching-story-page-prose-finalize`).
- A 19-section markdown body that inlines all canonical context the external prose renderer needs (so the renderer reads only the plan file — no other repo file).

The template has two structural shapes governed by `selected_arc_id`:
- `selected_arc_id != null` → §15 "Selected scene-commitment arc" + §16 "Chosen variant" present (page-cycle case).
- `selected_arc_id == null` → §15-alt "Entry pressure framing" replaces §15 + §16 (bootstrap PG-0001 root case).

One template, two shapes, no template duplication.

## Assumption Reassessment (2026-05-10)

1. `.claude/skills/_shared-templates/` does not currently exist. Verified: `ls .claude/skills/_shared-templates/` returns no such directory. This ticket creates it.
2. No existing skill template directory contains shared cross-skill templates today. The pattern of a `_`-prefixed directory under `.claude/skills/` for shared resources is novel for worldloom but matches the convention of `_TEMPLATE.md` and `_helpers/` elsewhere (e.g., `tools/validators/src/_helpers/`).
3. PG record schema additions (PROSESPLIT-002) define the engine-readable fields the plan's frontmatter mirrors (`prose_plan_path`, `prose_status`, `deferred_validation_trace`). The plan's frontmatter is broader — it includes `state_hash_at_plan_time`, `canon_revision_at_plan_time`, `declared_visible_affordances[]`, `declared_intended_beats[]`, `declared_stop_condition`, `forbidden_resolutions[]`, `forbidden_engine_vocabulary[]` — fields that live on the plan file's frontmatter, not on the PG record itself. These are plan-time contract fields, not engine-state fields.
4. Cross-skill / cross-artifact boundary under audit: the plan template is consumed by (a) bootstrap Phase 7 LLM prompt (PROSESPLIT-006), (b) page-cycle Phase 7 LLM prompt (PROSESPLIT-007), (c) Phase 7.5 declared-affordance validation in both skills (deterministic; reads frontmatter), (d) finalize Phase 1 plan/prose pairing (PROSESPLIT-005; reads frontmatter), (e) external prose renderer (reads markdown body for prompt construction). The template's shape is a multi-consumer contract.
5. FOUNDATIONS principle under audit: Rule 1 (No Cosmetic Output) — the plan IS load-bearing engine output; sections 1-3 (content_policy, prose_craft_contract, story_kernel) are constant boilerplate but every other section carries page-specific state. Rule 7 (Mystery Reserve Preservation) — plan §7 (Mysteries in play) and §18 DO NOT REVEAL inline forbidden_resolutions, making the firewall enforceable at finalize time.
6. Schema extension classification: this ticket creates a NEW template; no existing schema is extended.
7. Adjacent contradictions: storylet records (`SLT-NNNN`) referenced in plan §15 carry their own schema at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` and `tools/validators/src/schemas/storylet.schema.json`. Plan §15 inlines the storylet record body verbatim — the template documents the inlining requirement but does not re-declare the storylet schema (single source of truth preserved).

## Architecture Check

1. Single shared template eliminates the duplication risk of maintaining bootstrap-specific and page-cycle-specific templates separately. Both skills consume the same canonical structure; conditional sections (§15 ↔ §15-alt) are signaled via frontmatter (`selected_arc_id: null` flips the shape).
2. Hybrid YAML-frontmatter + markdown-body format matches the existing pattern used by `worlds/<slug>/characters/CHAR-NNNN.md`, `worlds/<slug>/diegetic-artifacts/DA-NNNN.md`, and `worlds/<slug>/adjudications/PA-NNNN-<verdict>.md`. Engine-readable frontmatter, prose body — no novel format invention.
3. No backwards-compatibility shims. The template is brand new.
4. Alternative considered: keep separate templates per skill. Rejected because the structural overlap is ~95% (only §15 vs §15-alt differs), and template drift is a real risk with two copies.

## Verification Layers

1. Template file exists with correct path → codebase grep-proof: `test -f .claude/skills/_shared-templates/page-plan.md`.
2. Template frontmatter declares the required engine-readable fields → grep-proof: every field name from the design doc Tier A.2 frontmatter schema appears in the template's frontmatter section as a placeholder line.
3. Template body has 19 numbered section headings (with §15 vs §15-alt clearly marked as conditional) → grep-proof: `rg -nc "^## §" .claude/skills/_shared-templates/page-plan.md` shows the expected count.
4. Template includes inlining-instruction prose for the LLM that authors plans → manual review: every section that requires verbatim-record-inlining (§5 World canon, §6 INV, §7 Mysteries, §8 Cast, §9 SF, §10 OBL, §11 THR, §12 CNSQ, §13 STLOC/STOBJ, §14 prior prose, §15/§16 arc/variant) has explicit "INLINE the full record body verbatim — do NOT reference by id alone" guidance.
5. FOUNDATIONS Rule 1 + Rule 7 alignment → manual review: §7 and §18 instruct the plan author to enumerate forbidden_resolutions; §3 instructs the plan author to inline the prose-craft-contract verbatim.

## What to Change

### 1. Create `.claude/skills/_shared-templates/` directory

Add `.gitkeep` if needed for git to track the empty directory; otherwise the template file alone establishes the directory.

### 2. Create `.claude/skills/_shared-templates/page-plan.md`

The template file is the canonical reference for both bootstrap and page-cycle plan authoring. Structure:

```markdown
<!--
This is the canonical comprehensive plan template for branching-story page rendering.

Consumers:
- branching-story-bootstrap Phase 7 (LLM prompt assembly; selected_arc_id == null shape)
- branching-story-page-cycle Phase 7 (LLM prompt assembly; selected_arc_id != null shape)
- Phase 7.5 declared-affordance validation (deterministic frontmatter read)
- branching-story-page-prose-finalize Phase 1 (plan/prose pairing; reads state_hash_at_plan_time)
- External prose renderer (reads §1-§19 of the markdown body as the prompt)

The plan IS the prompt. The external renderer reads ONLY this file plus reports/prose-quality-instructions.md.
Every record id referenced in any plan section MUST be inlined verbatim in that section.

Authoring rule: when in doubt, include more rather than less. The plan is the only context the renderer
gets. Verbosity is a feature, not a defect.
-->

---
plan_id: PG-NNNN
story_id: STORY-NNNN
world_slug: <slug>
story_slug: <slug>
parent_page_id: PG-NNNN | null
branch_id: BR-NNNN
branch_path: [PG-NNNN, ...]
state_hash_at_plan_time: <hash>
canon_revision_at_plan_time: <revision>
prose_status: pending  # pending | rendered | superseded
plan_authored_at: <iso8601>
plan_authored_by: branching-story-bootstrap | branching-story-page-cycle
selected_arc_id: SLT-NNNN | null  # null for bootstrap PG-0001 scene-setter root case
chosen_variant_id: <variant-id> | null  # null when selected_arc_id is null
required_effects: [...]  # variant.required_effects[] copied for engine readback; empty array when selected_arc_id is null
declared_visible_affordances:
  - affordance_text: "<short description>"
    affordance_type: actor | object | location | exit | tension | question
    mapped_state_id: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | OBL-NNNN | THR-NNNN | M-NNNN
    grounding_source: cast_present | objects_in_scope | accessible_locations | obligations_open | threads_active | mysteries_in_play
declared_intended_beats:
  - beat_function: <e.g., "establish entry pressure" | "first commitment surface" | ...>
    scene_movement_summary: "<one-sentence summary of what changes in this beat>"
declared_stop_condition:
  exit_class: normal | terminal | interrupt
  exit_signal: "<one-sentence narrative cue that fires the stop>"
forbidden_resolutions: [M-NNNN, ...]  # carried forward from mysteries_in_play with status=forbidden
forbidden_engine_vocabulary:
  - CF-NNNN
  - CH-NNNN
  - CHAR-NNNN
  - DA-NNNN
  - SF-NNNN
  - OBL-NNNN
  - THR-NNNN
  - SREL-NNNN
  - STINT-NNNN
  - SE-NNNN
  - SLT-NNNN
  - CHC-NNNN
  - PG-NNNN
  - BR-NNNN
  - STLOC-NNNN
  - STOBJ-NNNN
  - STENT-NNNN
  - ARCTRACE-NNNN
  - INV-N
  - ONT-N
  - CAU-N
  - SOC-N
  - AES-N
  - DIS-N
  - M-NNNN
  - OQ-NNNN
  - ENT-NNNN
  - SEC-*
deferred_validation_trace:
  prose_ledger_consistency: "DEFERRED — awaiting prose render"
  arc_trace_evidence_alignment: "DEFERRED — awaiting prose render"
  prose_critic_8_axis: "DEFERRED — awaiting prose render"
---

## §1 How to use this plan

This file is the comprehensive prompt for rendering page <PG-NNNN>. Concatenate this file's body
(§1 through §19) and append the render-time instruction block from `reports/prose-quality-instructions.md`
§3. Send the concatenation as the user-facing prompt to your prose renderer (manual or external LLM).

Output: continuous fiction prose only. No headers, no commentary, no engine vocabulary, no analysis.
Save the rendered prose to `pages-prose/PG-NNNN.md` (a plain markdown file with prose text only;
no frontmatter), then run `branching-story-page-prose-finalize` to validate and merge.

## §2 Content Policy

<!-- INLINE: verbatim from .claude/skills/branching-story-page-cycle/templates/content-policy.txt -->

## §3 Prose Craft Contract

<!-- INLINE: verbatim from .claude/skills/branching-story-page-cycle/references/prose-craft-contract.md -->

## §4 Story kernel context

<!-- INLINE: premise + designing principle + central dramatic question + tone constraints + themes
     + content_intensity_baseline + POV mode + language_register hints from STORY_KERNEL.md -->

## §5 World canon snapshot relevant to this scene

<!-- INLINE: every CF touching cast/location/period as full record body (statement + level + mode
     + scope + invariants_supported). Generate by greedy expansion of state_snapshot.objective_facts[]
     plus their derived_from_cf resolution. Do NOT reference by CF-NNNN alone. -->

## §6 World invariants in play

<!-- INLINE: every INV referenced by an active obligation, thread, or cast intention, with full
     break_conditions[]. Do NOT reference by ONT-N / CAU-N / SOC-N / AES-N / DIS-N alone. -->

## §7 Mysteries in play (firewall posture)

<!-- INLINE: every M-NNNN with status and forbidden_resolutions[]. Mark which mysteries the
     renderer must NOT resolve in this page. -->

## §8 Cast in this scene

<!-- For each STENT in cast_present, INLINE in this order:
     - World-level CHAR dossier verbatim (essence, niche, voice signature, relationships, visible/hidden traits)
       when world_character_id is set;
     - Story-local STENT record (role_in_story, current narrative function);
     - Current STINT (goals, fears, current_pressure, beliefs, emotional_state);
     - Relevant SREL records (axes between this character and other cast in scene). -->

## §9 Story-local facts visible in this scene

<!-- INLINE: every SF in state_snapshot filtered by POV-accessibility, with epistemic_class,
     certainty, known_by[], derived_from_cf if applicable. -->

## §10 Open obligations

<!-- INLINE: every OBL in obligations_open with salience, urgency, who owes whom, payoff_modes[],
     age, consequence_on_neglect. -->

## §11 Active threads

<!-- INLINE: every THR in threads_active with status, current_pressure, type. -->

## §12 Pending consequences

<!-- INLINE: every CNSQ in consequences_pending with required_aftermath_text, urgency, source SE. -->

## §13 Locations & objects in scope

<!-- INLINE: current_location, accessible_locations, objects_in_scope, inventory_by_entity.
     STLOC and STOBJ records inlined verbatim. -->

## §14 Recent prose continuity along this branch

<!-- INLINE: verbatim contents of the last 1-2 pages-prose/PG-*.md along branch_path (NOT sibling
     branches). Mark: "for continuity ONLY; do NOT reuse phrasings, metaphor tokens, or specific
     concrete anchors verbatim."

     PRE-FLIGHT GUARANTEE: page-cycle aborts when parent.prose_status != "rendered", so this section
     always has rendered prose to inline (except for the bootstrap PG-0001 case, which has no parent —
     in that case this section reads "(no prior prose; this is the root page)"). -->

## §15 Selected scene-commitment arc

<!-- CONDITIONAL: present when frontmatter selected_arc_id != null. -->

<!-- INLINE: full SLT-NNNN arc record (arc_contract, dramatic_unit, beat_plan with min/max/beat-functions,
     execution_envelope, stop_policy.normal_exits, effect_model.variants[]). -->

### §15-alt Entry pressure framing

<!-- CONDITIONAL: present when frontmatter selected_arc_id == null (bootstrap PG-0001 root case);
     replaces §15 and §16. -->

<!-- INLINE: STORY_KERNEL.central_dramatic_question + Phase 5 initial obligations + Phase 5 initial
     threads + Phase 4 mysteries_in_play + summary of seed-pool's available commitment_class[]
     affordances (without selecting one). -->

## §16 Chosen variant for this turn

<!-- CONDITIONAL: present when frontmatter chosen_variant_id != null. -->

<!-- INLINE: chosen variant id + variant.required_effects[] verbatim. Mark: "the prose must realize
     these as scene consequences, not as ledger jargon." -->

## §17 Governor nudge

<!-- INLINE: per-turn homeostat signal from Phase 6 narrative governor (e.g., "obligation density
     is high; favor reflection cadence over action"). One short paragraph. -->

## §18 Scene direction

<!-- AUTHOR-WRITTEN, not record-inlined. Five fields:

ENTRY PRESSURE: <one-paragraph framing of what the scene opens with>

SCENE QUESTION: <the dramatic question this page answers>

VALUE DELTA TARGET: <what shifts by page end (positive/negative/complicated)>

REQUIRED TURN: <one-sentence binding outcome the page MUST end with — e.g., "Iker takes the
envelope but does not open it">

STOPPING POINT: <one-sentence narrative cue at which the page ends — e.g., "End when Mara
notices that Iker recognized the handwriting">

DO NOT REVEAL:
- <list of M-NNNN forbidden resolutions, with one-line summary of what each forbids>
- engine vocabulary tokens (frontmatter forbidden_engine_vocabulary list) -->

## §19 Render-time instruction block

<!-- INLINE: the literal LLM-facing instruction from reports/prose-quality-instructions.md §3.
     This is the last section of the plan; the renderer reads §1-§19 in order. -->
```

### 3. Document the template's authoring contract inline

The HTML-comment block at the top of the template (above the frontmatter) names the consumers and the inlining rule. This makes the template self-documenting without requiring a sibling README.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (new)
- `.claude/skills/_shared-templates/.gitkeep` (new — only if directory needs explicit tracking; otherwise the template file alone is sufficient)

## Out of Scope

- Wiring bootstrap or page-cycle Phase 7 to consume this template. Covered in PROSESPLIT-006 and PROSESPLIT-007.
- Wiring the finalize skill to read this template's frontmatter. Covered in PROSESPLIT-005.
- Updating `reports/prose-quality-instructions.md` (PROSESPLIT-001) — that ticket landed independently.
- Adding a worked example plan file. The template is the contract; worked examples can be added later as `.claude/skills/_shared-templates/examples/page-plan-example.md` if needed (separate ticket).

## Acceptance Criteria

### Tests That Must Pass

1. `test -f .claude/skills/_shared-templates/page-plan.md` succeeds.
2. `rg -nc "^## §" .claude/skills/_shared-templates/page-plan.md` shows the 19 numbered sections plus §15-alt (so 20 heading hits including the alt section).
3. `rg -n "^plan_id:|^prose_status:|^selected_arc_id:|^declared_visible_affordances:|^declared_intended_beats:|^forbidden_resolutions:|^deferred_validation_trace:" .claude/skills/_shared-templates/page-plan.md` matches all listed frontmatter fields.
4. `rg -n "INLINE:|INLINE in this order:|INLINE: verbatim from" .claude/skills/_shared-templates/page-plan.md` shows ≥10 inlining-instruction comments (one per record-inlining section).
5. `rg -n "CONDITIONAL: present when frontmatter selected_arc_id" .claude/skills/_shared-templates/page-plan.md` matches both §15 and §15-alt.

### Invariants

1. Every section that requires record inlining has an explicit "INLINE" instruction in an HTML comment.
2. The template's frontmatter is a strict superset of the PG record schema fields added in PROSESPLIT-002 (the plan carries plan-time fields the PG record does not).
3. The conditional shape (§15 + §16 vs §15-alt) is signaled by frontmatter only; no other field switches behavior.
4. Section §18 (Scene direction) is the only section authored fresh per page; all other sections inline existing records or boilerplate.

## Test Plan

### New/Modified Tests

1. None — template-creation ticket; verification is grep + manual structural review.

### Commands

1. `test -f .claude/skills/_shared-templates/page-plan.md && echo OK`
2. `rg -nc "^## §" .claude/skills/_shared-templates/page-plan.md`
3. `rg -n "INLINE" .claude/skills/_shared-templates/page-plan.md | wc -l`
4. `rg -n "CONDITIONAL" .claude/skills/_shared-templates/page-plan.md`
