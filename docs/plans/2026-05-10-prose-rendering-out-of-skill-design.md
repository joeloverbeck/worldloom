# Prose Rendering Out-of-Skill — Design

## Brainstorm Context

**Original request.** Rework the two prose-producing skills (`branching-story-bootstrap`, `branching-story-page-cycle`) so they no longer render creative prose inside Claude Code. Instead, produce a comprehensive prose plan file as the primary deliverable; rendered prose is supplied externally (manual or OpenRouter Opus 4.7) and merged into the bundle by a new finalize skill. Extract the existing prose-quality instructions to a `reports/` artifact so they are not lost in the rework.

**Reference file.** `reports/prose-issues.md` — ChatGPT-Pro deep-research analysis. Bottom-line finding: Claude Code's coding harness AND the current Phase 7 prompt architecture both flatten creative prose. The harness pushes the model toward software-engineering register; the Phase 7 prompt embeds the full ledger/arc/validator machinery into the prose call, training the model to act as a ledger executor rather than a novelist. Recommendation: separate prose generation into a different execution lane; the present design implements that recommendation by relocating prose generation outside Claude Code entirely.

**Approach selected.** Approach 1 — Two-phase commit with deferred prose-coupled validators and a dedicated finalize skill. Approaches 2 (drop validators) and 3 (stub prose) were considered and rejected (Approach 2 leaves canon promotion blocked behind audit; Approach 3 doesn't actually fix the harness-bias problem since stub prose IS coding-harness prose).

**Key decisions made during this brainstorm:**

- Considered compact prose packet (per the report's recommendation); chose **comprehensive self-contained plan** because the user requirement is that the external renderer reads only the plan file — no other repo file. The plan inlines all canonical context verbatim (CFs, CHAR dossiers, story-local records, prior prose, arc envelope, prose-craft-contract, content-policy).
- Considered making prior-prose-continuity inlining (§14) soft (blank when parent prose absent); chose **hard pre-flight block** in page-cycle when `parent.prose_status != rendered`. This serializes the authoring loop but guarantees plans are always renderable against rich continuity. Forking from non-rendered pages is also blocked.
- Considered separate plan templates for bootstrap vs page-cycle; chose **one template with conditional sections** — §15 "Selected scene-commitment arc" + §16 "Chosen variant" are present when `selected_arc_id != null`, replaced by a single "§15-alt: Entry pressure framing" section for the PG-0001 root case.
- Considered superseding the PG record at finalize-time (new PG record citing `supersedes`); chose **`update_record_field` on the existing PG record** plus a new SE event for audit trail. PG identity is the page's branch-path identity; superseding it would break references. The PG record's `prose_status` is explicitly a transitional state field, fitting `update_record_field` semantics naturally.
- Considered keeping ARC_TRACE emission at page-cycle plan-commit (with placeholder evidence); chose **defer to finalize entirely**. ARC_TRACE inherently needs rendered prose to extract evidence spans from; emitting at plan-commit produces an artifact without ground truth. Finalize emits ARCTRACE only when prose lands.

**Final confidence.** ~95% — directive is fully specified, three named assumptions resolved through user clarification (§14 hard block, §15 conditional sections, three new PG fields). Remaining open decisions are Tier C edge-case dispositions (canon-drift posture, storylet-pool early-bundle fallback, FOUNDATIONS update granularity); these are flagged in their respective sections for finalization at implementation time, not blockers for the design.

---

## Problem Statement

The two existing prose-producing skills tightly couple prose generation to engine state mutation:

1. Phase 7 in both skills assembles an LLM prompt containing content_policy + world_kernel + prose_craft_contract + arc_contract + dramatic_unit + beat_plan + execution_envelope + stop_policy + required_effects + scene_context + recent_prose + governor_nudge, then asks Claude Code to render continuous fiction prose against an 11-rule prose craft contract.
2. Claude Code's coding harness systematically biases the model toward software-engineering register: terse, validator-aware, structurally precise — exactly the wrong register for fiction.
3. The prompt architecture compounds the bias by surrounding the prose call with engine vocabulary, validator rationales, and arc-execution language. The model cannot help but treat prose as evidence-for-a-validator.
4. Downstream consumers (`branching-story-health-audit`, `story-fact-promotion-to-canon`, `tools/validators/src/rules/arc_trace_evidence_alignment.ts`, `storylet-pool-authoring`) read the rendered prose to do their own jobs — so any quality regression at Phase 7 propagates throughout the pipeline.

The fix is structural: relocate prose generation out of Claude Code, give the bundle a comprehensive plan as its bundle-commit artifact, and converge plan + externally-rendered prose at a finalize step that runs the prose-coupled validators.

---

## Tier A — Preservation & Schema

### A.1 Report extraction → `reports/prose-quality-instructions.md`

A self-contained markdown document, designed to be passed verbatim (or sectionally) as the system / context prompt for an external OpenRouter Opus 4.7 call.

**Sections:**

1. **Content Policy block (NC-21)** — verbatim from `templates/content-policy.txt`. FIRST in the document so any consumer that prepends from the top picks it up first.
2. **Prose Craft Contract** — verbatim from `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` (all 11 rules + Diagnostic Vocabulary).
3. **Render-time instruction template** — the literal LLM-facing instruction body (length-follows-content per Rule 11, no beat headers, no ledger jargon, render-through-what-happens, modality-from-substrate). Extracted from `phase-7-page-render.md` and `phase-7-root-page-render.md`, deduplicated.
4. **Anti-pathology checklist** — the 8-axis diagnostic vocabulary table reformatted as "what to avoid" rather than "what the critic flags."
5. **Voice / register guidance** — Rule 7 (substrate, not checklist) extracted into a standalone caveat.
6. **External-renderer usage guide** — short prose section explaining concatenation order: plan body + render-time instruction block as the user-facing prompt; expect continuous prose output only; no commentary.

**Source-of-truth posture.** The canonical prose-craft-contract stays at `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md`. The report is a derivative for external use, regenerated by manual re-extraction when the contract evolves. The contract changes infrequently — no automated re-extraction is needed.

### A.2 Plan template → `.claude/skills/_shared-templates/page-plan.md`

The plan is a hybrid markdown file with YAML frontmatter (engine-readable, consumed by validators and Phase 7.5) plus a long markdown body (consumed by the external renderer or the human author).

**Frontmatter schema:**

```yaml
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
selected_arc_id: SLT-NNNN | null  # null for PG-0001 scene-setter root case
chosen_variant_id: <variant> | null
required_effects: [...]  # variant.required_effects[] copied for engine readback
declared_visible_affordances:  # plan's authored affordance map (replaces parse-from-prose)
  - { affordance_text, affordance_type, mapped_state_id, grounding_source }
declared_intended_beats:  # plan's authored beats (replaces parse-from-prose)
  - { beat_function, scene_movement_summary }
declared_stop_condition: { exit_class, exit_signal }
forbidden_resolutions: [M-NNNN, ...]  # carried forward for finalize-time firewall check
forbidden_engine_vocabulary: [CF, CH, CHAR, OBL, ...]  # canonical engine-vocabulary list
deferred_validation_trace:
  - prose_ledger_consistency: DEFERRED — awaiting prose render
  - arc_trace_evidence_alignment: DEFERRED — awaiting prose render
  - prose_critic_8_axis: DEFERRED — awaiting prose render
```

**Markdown body sections** (numbered for cross-reference; sections are conditional where noted):

1. **§ How to use this plan** — short instruction for the external renderer / human author.
2. **§ Content Policy** — verbatim NC-21 block.
3. **§ Prose Craft Contract** — verbatim 11-rule contract.
4. **§ Story kernel context** — premise, designing principle, central dramatic question, tone constraints, themes, content_intensity_baseline, POV mode, language_register hints.
5. **§ World canon snapshot relevant to this scene** — every CF touching cast/location/period inlined verbatim (statement + level + mode + scope + invariants_supported). Generated by greedy expansion of the page's `state_snapshot.objective_facts[]` plus their `derived_from_cf` resolution against world canon.
6. **§ World invariants in play** — every INV referenced by an active obligation, thread, or cast intention, inlined verbatim with `break_conditions[]`.
7. **§ Mysteries in play (firewall posture)** — every M-NNNN with `status` and `forbidden_resolutions[]` inlined; explicitly marks which mysteries the renderer must NOT resolve.
8. **§ Cast in this scene** — for each STENT in `cast_present`, full inlined dossier:
   - World-level CHAR dossier verbatim (essence, niche, voice signature, relationships, visible/hidden traits) when `world_character_id` is set.
   - Story-local STENT record (role_in_story, current narrative function).
   - Current STINT (goals, fears, current_pressure, beliefs, emotional_state).
   - Relevant SREL records (axes between this character and other cast in scene).
9. **§ Story-local facts visible in this scene** — every SF in the page's `state_snapshot` filtered by POV-accessibility. Each SF inlined with `epistemic_class`, `certainty`, `known_by[]`, `derived_from_cf` if applicable.
10. **§ Open obligations** — every OBL in `obligations_open` inlined: salience, urgency, who owes whom, payoff_modes[], age, consequence_on_neglect.
11. **§ Active threads** — every THR in `threads_active` inlined: status, current_pressure, type.
12. **§ Pending consequences** — every CNSQ in `consequences_pending` inlined: required_aftermath_text, urgency, source SE.
13. **§ Locations & objects in scope** — current_location, accessible_locations, objects_in_scope, inventory_by_entity. STLOC/STOBJ records inlined.
14. **§ Recent prose continuity along this branch** — verbatim contents of the last 1-2 `pages-prose/PG-*.md` along `branch_path` (not sibling branches). Marked: "for continuity ONLY; do NOT reuse phrasings, metaphor tokens, or specific concrete anchors verbatim." **Hard pre-flight block in page-cycle**: this section requires the parent's prose to exist; pre-flight aborts when `parent.prose_status != rendered`.
15. **§ Selected scene-commitment arc** — full inlined arc record (arc_contract, dramatic_unit, beat_plan with min/max/beat-functions, execution_envelope, stop_policy.normal_exits, effect_model.variants[]). **Conditional**: present when `selected_arc_id != null`.
   - **§ 15-alt: Entry pressure framing** — present when `selected_arc_id == null` (PG-0001 root case). Captures STORY_KERNEL.central_dramatic_question + Phase 5 initial obligations/threads + Phase 4 mysteries_in_play + a summary of the seed-pool's available `commitment_class[]` affordances (without selecting one).
16. **§ Chosen variant for this turn** — the chosen variant id and its `required_effects[]` inlined; explicitly: "the prose must realize these as scene consequences." **Conditional**: present when `chosen_variant_id != null` (paired with §15).
17. **§ Governor nudge** — the per-turn homeostat signal.
18. **§ Scene direction** — entry pressure, scene question, value_delta_target, REQUIRED TURN (the page must end with X), STOPPING POINT (end when Y becomes available), DO NOT REVEAL (forbidden M list, forbidden engine-vocabulary list).
19. **§ Render-time instruction block** — the literal LLM-facing instruction (length-follows-content, no beat headers, render through what happens, modality from substrate, output prose only).

**Concatenation contract.** §1 through §19 in order produces a self-contained external-LLM input. The plan IS the prompt.

### A.3 PG record schema additions

Three new fields on `_source/pages/PG-NNNN.yaml`:

```yaml
# Existing field, now nullable
prose_path: pages-prose/PG-NNNN.md  # null when prose_status != rendered

# New fields
prose_plan_path: pages-prose-plans/PG-NNNN.md  # always present after rework
prose_status: pending | rendered | superseded   # default pending at bundle commit
deferred_validation_trace:
  prose_ledger_consistency: DEFERRED — awaiting prose render | PASS — <rationale> | FAIL — <reason>
  arc_trace_evidence_alignment: DEFERRED — awaiting prose render | PASS — <rationale> | FAIL — <reason>
  prose_critic_8_axis: DEFERRED — awaiting prose render | PASS — <rationale> | FAIL — <reason>
```

`prose_path` becomes nullable; `prose_plan_path` is mandatory. `prose_status: pending` at bundle commit; finalize flips to `rendered`. The `deferred_validation_trace` is structurally distinct from the existing `validation_trace`, keeping commit-time vs finalize-time gate execution separable in the audit trail.

### A.4 Directory structure

```
worlds/<world-slug>/stories/<story-slug>/
├── _source/...
├── pages-prose/             ← rendered prose, may be empty initially; .gitkeep when empty
│   ├── PG-0001.md           ← absent until finalize
│   └── PG-0002.md
├── pages-prose-plans/       ← NEW — comprehensive plans, always present
│   ├── PG-0001.md           ← always written at bundle commit
│   └── PG-0002.md
├── STORY_KERNEL.md
└── INDEX.md
```

`pages-prose-plans/` is a new direct-write markdown surface (sibling to `pages-prose/`). Hook 3 already permits direct writes to `worlds/<slug>/stories/<slug>/` markdown surfaces outside `_source/`, so no hook change is needed; `tools/hooks/README.md` Row 3 should mention the new path explicitly.

---

## Tier B — Skill Rework

### B.1 Bootstrap — Phase 7 becomes "Root Page Plan Authoring"

Phase 7's job changes from rendering prose to authoring a comprehensive plan. The phase still uses an LLM call (Claude Code's Opus), but the task it's asked to perform is **structured composition** — assembling context, citing records, populating templated sections. That's a task the agentic harness handles well; only fiction-prose generation is the harness's weak spot.

- Phase 7's LLM prompt becomes "author the page-plan body for PG-0001 by populating each of the 19 plan sections per `_shared-templates/page-plan.md`. Inline all referenced records verbatim. Do NOT generate prose."
- The post-render 8-axis prose critic is **removed** (no prose to critique).
- The post-LLM cross-check (does the prose stage entities not in cast_present, etc.) is **replaced** by deterministic plan-completeness validation: every required plan section populated, every inlined record id resolves, the plan's `forbidden_resolutions[]` matches the firewall.
- Phase 7 emits PG-0001 + BR-0001 + SE-0001 with `prose_path: null`, `prose_plan_path: pages-prose-plans/PG-0001.md`, `prose_status: pending`, `arc_trace_emitted: false`.

### B.2 Bootstrap — Phase 7.5 becomes "Declared-Affordance Validation"

Deterministic validation of the plan's `declared_visible_affordances[]` frontmatter list against `cast_present` / `objects_in_scope` / `accessible_locations`. Any declared affordance that doesn't resolve to a state id is a re-prompt to Phase 7 (re-author the plan). Output is the same Visible Affordance Map shape that Phase 8 consumes.

### B.3 Bootstrap — Phase 9 gate changes

| Gate | Status under rework |
|---|---|
| mystery_firewall | RUNS — over plan + state |
| invariant_compatibility | RUNS — over plan + state |
| content_policy_presence | RUNS — verify plan §2 contains the verbatim content_policy block |
| id_uniqueness | RUNS |
| branch_path_consistency | RUNS |
| cast_intention_coverage | RUNS |
| obligation_salience | RUNS |
| epistemic_class_declared | RUNS |
| storylet_diversity (commitment_class) | RUNS |
| **prose_ledger_consistency** | **DEFERRED — awaiting prose render** |
| choice_consequence_capacity | RUNS |
| recursive_reference_closure | RUNS |
| state_snapshot_integrity | RUNS |
| arc_envelope_conformance (PG-0001 root case) | AUTO-PASS as today |
| effect_model_replay_safety (PG-0001 root case) | AUTO-PASS as today |
| **arc_trace_evidence_alignment** | AUTO-PASS as today (no arc at root) |
| narrative_point_classification | AUTO-PASS as today |
| choice_worthiness_completeness | RUNS |
| **plan_completeness_check** (NEW) | RUNS — every required plan section populated, every inlined record id resolves, frontmatter fields well-formed |

Phase 9.5 discipline validator gets one new check: **`plan_self_containment`** — verifies the plan inlines (rather than references) every CF / CHAR / SF / OBL / THR / SREL / STINT / STLOC / STOBJ / SLT / DA whose id appears in any plan section.

### B.4 Bootstrap — Phase 10 deliverable summary

The "OPENING PROSE PREVIEW" block becomes a "**PLAN COMPREHENSIVENESS PREVIEW**":

```
PLAN: pages-prose-plans/PG-0001.md (~<word count> words; <byte count> bytes)

Plan section coverage:
- §5 World canon snapshot: <N> CFs inlined
- §8 Cast in this scene: <N> dossiers inlined (CHAR-NNNN, CHAR-NNNN, ...)
- §9 Story-local facts visible: <N> SFs inlined
- §10 Open obligations: <N> OBLs inlined
- §11 Active threads: <N> THRs inlined
- §15-alt Entry pressure framing: <one-sentence summary>
- §18 Scene direction:
    REQUIRED TURN: <one sentence>
    STOPPING POINT: <one sentence>
    DO NOT REVEAL: <list of M-NNNN forbidden + engine-vocabulary list>
- §19 Render-time instruction block: present

Plan self-containment check: PASS (every record id in plan is inlined)
```

### B.5 Bootstrap — Phase 11 commit changes

- Step 4 (formerly `Write pages-prose/PG-0001.md`) becomes **`Write pages-prose-plans/PG-0001.md`**.
- `pages-prose/` directory still `mkdir -p`'d with `.gitkeep` so finalize can later write into it.
- PG-0001.yaml carries the three new schema fields.

### B.6 Bootstrap references file rewrites

- `phase-7-root-page-render.md` → renamed to `phase-7-root-page-plan.md`. Full rewrite around plan authoring.
- `phase-7-5-visible-affordance-extraction.md` → rewritten as "Declared-Affordance Validation" (deterministic, no LLM).
- `phase-9-validation-gates.md` → updated gate table per B.3.
- `phase-9-5-bootstrap-discipline-validator.md` → adds `plan_self_containment` check.
- `governance-and-foundations.md` → updates reflecting "Phase 7 produces a plan; rendered prose is a finalize-time concern."

### B.7 Page-cycle — Phase 7 becomes "Multi-Beat Arc Plan Authoring"

Same shape as B.1, with arc/variant context page-cycle has but bootstrap doesn't:
- Plan body's §15 + §16 populated from Phase 4 / 4b selections.
- Plan body's §17 populated from Phase 6 governor recompute.
- Plan body's §14 inlines verbatim contents of the last 1-2 `pages-prose/PG-*.md` along `branch_path` (the §14 hard pre-flight already verified `parent.prose_status == rendered`).
- LLM call structure: "author the page-plan body" — same composition task.
- Post-render 8-axis prose critic **removed**.

### B.8 Page-cycle — Phase 7.5

Same as B.2 — declared-affordance validation, deterministic.

### B.9 Page-cycle — Phase 7.6 ARC_TRACE deferral

- **Layer 1 (deterministic structural)** runs over the plan's `declared_intended_beats[]` frontmatter — beat count fidelity against `arc.beat_plan.min_beats` / `max_beats` checked against declared beats.
- **Layer 2 (LLM trace extraction)** is **deferred to finalize**.
- **Layer 3 (semantic conformance critic)** is **deferred to finalize**.
- ARC_TRACE record is NOT emitted at plan-commit; PG record carries `arc_trace_emitted: false`.
- ARCTRACE id allocation moves from page-cycle pre-flight to finalize pre-flight.

### B.10 Page-cycle — Phase 9 gate changes

Same DEFERRED entries as B.3 (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`). Other gates run normally over plan + state. Plus new **`plan_completeness_check`** and **`plan_self_containment`** checks.

### B.11 Page-cycle — Pre-flight new check (the §14 hard block)

Add to pre-flight, BEFORE any LLM work:

```
If parent_page_id != null:
  Read parent PG record.
  If parent.prose_status != "rendered":
    ABORT with message:
      "Parent page <PG-NNNN> has prose_status=<status>. Run
      branching-story-page-prose-finalize on the parent before authoring
      this page's plan, so §14 (Recent prose continuity) can inline the
      parent's rendered prose."
```

This blocks both straight-line continuation AND fork-from-non-leaf when the non-leaf isn't rendered.

### B.12 Page-cycle — Phase 11 changes

- Step 2 (`Write pages-prose/PG-NNNN.md`) becomes **`Write pages-prose-plans/PG-NNNN.md`**.
- `create_arc_trace_record` op NOT emitted at plan-commit (deferred).
- ARCTRACE id no longer pre-allocated at page-cycle pre-flight.
- Other ops (PG, SE, SF, OBL, CNSQ, THR, SREL, STINT, CHC, JIT-SLT, STLOC, STOBJ, DA, BR) emit as today.

### B.13 Page-cycle — Phase 10 deliverable summary

Same shape as B.4 — "PROSE PREVIEW" becomes "PLAN COMPREHENSIVENESS PREVIEW" with chosen arc summary + scene direction + cast dossier coverage.

### B.14 prose-craft-contract.md disposition

Stays at `branching-story-page-cycle/references/prose-craft-contract.md` as canonical source. Embedded verbatim in plan §3. The 8-axis diagnostic vocabulary becomes the basis for the deferred `prose_critic_8_axis` gate (run by finalize) and the "anti-pathology checklist" in `reports/prose-quality-instructions.md`. `storylet-pool-authoring`'s existing reference to Rule 11 is unaffected.

### B.15 templates/content-policy.txt disposition

NC-21 block stays at the same path in both skills' templates/. Inlined verbatim into STORY_KERNEL.md preamble (bootstrap), plan §2 (both skills), `reports/prose-quality-instructions.md` §1.

---

## Tier C — Cascades & Continuity

### C.1 New skill: `branching-story-page-prose-finalize`

Self-contained skill at `.claude/skills/branching-story-page-prose-finalize/`. Mirrors page-cycle's HARD-GATE / patch-engine discipline.

**Inputs:**

- `world_slug` (required)
- `story_slug` (required)
- `page_id` — PG-NNNN; pre-flight verifies it belongs to the story (required)
- `execution_mode` — optional override; defaults to STORY_KERNEL's `execution_mode_default`. Same three modes as page-cycle.
- `accept_plan_drift` — boolean flag, default false. When true, pre-flight skips the canon-drift check (Phase 1).

**HARD-GATE block.** Standard shape. Writes happen only to `_source/<class>/*.yaml` records and `INDEX.md`; `pages-prose/PG-NNNN.md` is already user-supplied. Gate fires before any record mutation.

**Phase flow:**

```
Pre-flight   resolve bundle; verify pages-prose/PG-NNNN.md exists and non-empty;
             verify pages-prose-plans/PG-NNNN.md exists; read PG record;
             verify prose_status == pending; pre-allocate ARCTRACE-NNNN
             (if PG.selected_arc_id != null) and SE-NNNN; load FOUNDATIONS.md
   |
   v
Phase 1      Plan/prose pairing — verify plan's state_hash_at_plan_time matches
             PG.state_hash. If canon_revision drift detected: warn user;
             require accept_plan_drift=true to proceed.
   |
   v
Phase 2      Deterministic pre-critic checks
             - Engine-vocabulary leakage regex (Rule 9)
             - Forbidden-mystery resolution scan
             - REQUIRED TURN keyword presence check (heuristic; soft-fail)
             FAIL routes to user with cited offenses; no re-prompt loop
             (Claude isn't rendering; user revises externally and re-runs).
   |
   v
Phase 3      Prose critic (8-axis, LLM call)
             Same critic shape as today's Phase 7 post-render critic, against
             prose-craft-contract.md, with prior 1-2 pages along branch_path
             for cross-page tic detection.
             Verdict: PASS / SOFT_FAIL / HARD_FAIL with cited instances.
             HARD_FAIL halts; user revises externally and re-runs.
             SOFT_FAIL surfaces but allows ACCEPT_AS_IS at Phase 6.
   |
   v
Phase 4      ARC_TRACE extraction (LLM, conditional)
             Skipped if PG.selected_arc_id == null (bootstrap PG-0001 case).
             Otherwise: Layer 2 extraction → Layer 3 semantic conformance critic.
             Same per-mode budget as today's Phase 7.6.
             Emits ARCTRACE-NNNN payload to working buffer for Phase 7 commit.
   |
   v
Phase 5      Deferred Phase 9 gate resolution
             - prose_ledger_consistency
             - arc_trace_evidence_alignment
             - prose_critic_8_axis (verdict from Phase 3)
             Each records PASS/FAIL with rationale into PG.deferred_validation_trace.
   |
   v
Phase 6      HARD-GATE approval (per execution_mode, same shape as page-cycle)
             Deliverable summary:
             - PG-NNNN: prose now finalized (<word count> words)
             - Phase 3 critic verdict (axis-by-axis)
             - Phase 5 gate verdicts
             - ARC_TRACE summary (if emitted)
             - Target field updates
             - New record: ARCTRACE-NNNN (if applicable) + SE-NNNN (always)
   |
 accept (or auto per execution_mode)
   |
   v
Phase 7      Engine submit + INDEX.md edit
             Single patch envelope:
             - update_record_field for PG.prose_path, .prose_status,
               .deferred_validation_trace, .arc_trace_emitted, .arc_trace_id
             - create_se_record for SE-NNNN (action: "prose_finalized")
             - create_arc_trace_record for ARCTRACE-NNNN (if applicable)
             Then direct edit of INDEX.md to flip page row's prose_status.
             pages-prose/PG-NNNN.md is NOT written — user already placed it.
```

**ID allocation:** finalize allocates `SE-NNNN` always and `ARCTRACE-NNNN` conditionally. No new ID class.

**Mutation pattern:** `update_record_field` on the existing PG record (rather than supersession-via-new-PG) plus a new SE event for audit trail. PG identity is the page's branch-path identity; the PG `prose_status` field is explicitly designed as a transitional state field, fitting `update_record_field` naturally. The SE event provides the immutable audit trail.

**Hook 3 implication:** `update_record_field` and `create_se_record` are already engine-routed. The user cannot finalize by hand-editing PG-NNNN.yaml — Hook 3's existing block on direct `Edit`/`Write` to `_source/<class>/*.yaml` covers this.

### C.2 Validator and tooling changes

**`tools/validators/src/rules/arc_trace_evidence_alignment.ts`** — add a conditional skip at the top:

```ts
if (pgRecord.prose_status !== "rendered") {
  return { status: "PASS", rationale: "DEFERRED — page prose not rendered; rule re-runs at finalize" };
}
// existing logic continues
```

**`tools/validators/src/rules/prose_ledger_consistency.ts`** (or equivalent) — same conditional skip pattern.

**`tools/validators/src/rules/record_schema_compliance.ts`** — extend the PG record schema:
- `prose_plan_path: string` (required, must match `^pages-prose-plans/PG-\d{4}\.md$`)
- `prose_status: "pending" | "rendered" | "superseded"` (required)
- `deferred_validation_trace: { [gateName: string]: string }` (required, three keys)
- `prose_path: string | null` (relax from required-string)

**`tools/world-index/src/enumerate.ts`** line 61 — add `"pages-prose-plans"` to the indexable story-bundle directories list.

**`tools/world-mcp`** — no changes; existing context-packet retrieval naturally includes the new directory once world-index enumerates it.

**`tools/patch-engine`** — verify `update_record_field` op supports the three new PG fields. Likely zero code change needed (op is field-name-agnostic and validates against `record_schema_compliance`); the schema update flows through automatically.

### C.3 Sibling skill updates

**`branching-story-health-audit`:**
- Pre-flight: filter in-scope `pages-prose/PG-*.md` read set to pages where `prose_status == rendered`. Pages with `prose_status == pending` noted in audit's "Coverage" section, excluded from prose-coupled checks.
- Phase 3 (mystery firewall vs prose) and Phase 5 (repetition + similar-scene clustering): operate only on rendered pages.
- New finding type: `pending_prose_count` — informational, not severity-bearing.
- "Prose-Ledger Consistency" findings only fire on rendered pages.

**`story-fact-promotion-to-canon`:**
- Pre-flight HARD block: for every PG-NNNN cited as supporting evidence, verify `prose_status == rendered`. If any cited page is `pending`: ABORT with directive to run finalize first.
- Non-negotiable gate: canon promotion requires prose evidence (Rule 6 + §Default Reality posture).

**`storylet-pool-authoring`:**
- Pre-flight reads "last ~10 `pages-prose/PG-NNNN.md`" — filter to `prose_status == rendered`.
- If fewer than ~10 rendered pages exist: read what's available.
- If zero rendered pages exist (freshly bootstrapped bundle whose PG-0001 hasn't been finalized): fall back to STORY_KERNEL.md context alone, with warning recorded in storylet batch's provenance.
- Graceful degradation, not abort.

### C.4 Documentation updates

**`CLAUDE.md`:**
- §Skill Architecture → add `branching-story-page-prose-finalize` to canon-reading skill list with note about plan/finalize split.
- §Repository Layout → add `pages-prose-plans/` under stories/<slug>/ tree.
- §ID Allocation Conventions → no new ID class.
- §Non-Negotiables → add: "Prose pages are author-supplied (manual or external LLM); pipeline produces a plan first and finalize validates the prose against the plan."

**`docs/WORKFLOWS.md`:**
- New section: "Authoring loop after the prose-rendering split" with the serialized authoring diagram.
- Forking note: forks work from any rendered page; do NOT work from `pending`-status pages (§14 hard block).
- Document `branching-story-page-prose-finalize` arguments and example invocation.

**`docs/FOUNDATIONS.md`:**
- §Story Bundles — add paragraph: "Pipeline produces a comprehensive prose plan at bundle commit; rendered prose is supplied externally and merged via `branching-story-page-prose-finalize`. Plan is engine-readable and validation-bearing; rendered prose is the authorial artifact."
- Rule 1 (No Cosmetic Output) — clarify: a plan IS load-bearing engine output; producing a plan without yet-rendered prose satisfies Rule 1.
- Rule 7 (Mystery Reserve Preservation) — clarify firewall splits: plan-time check (forbidden M not in declared_resolutions; deterministic) + finalize-time check (rendered prose doesn't resolve forbidden M; deterministic regex + LLM critic).

**`docs/HARD-GATE-DISCIPLINE.md`:**
- Note finalize as a new HARD-GATE-bearing skill in story-bundle family.

**`tools/hooks/README.md` Row 3:**
- Add `pages-prose-plans/` to allowed direct-write story-bundle markdown surfaces.

### C.5 Tier A.1 report extraction — finalize cross-wiring

The canonical prose-craft-contract source-of-truth (`branching-story-page-cycle/references/prose-craft-contract.md`) drives:

1. The "Prose Craft Contract" section of `reports/prose-quality-instructions.md` (extracted at implement-time; manually re-extracted when contract evolves).
2. Plan §3 inlined contract (filled in by plan-authoring LLM at Phase 7).
3. Finalize Phase 3 critic's input (read directly from canonical reference).

There is one canonical source. The report is a derivative artifact for external use; the plan inlines for self-containment; finalize reads directly. If the contract changes, canonical source updates → plan template re-inlines on next plan-authoring run → report regenerated by re-extracting.

---

## Workflow consequence: serialized authoring loop

The §14 hard pre-flight block in page-cycle changes the authoring rhythm from "render-as-you-go" to "**plan → render externally → finalize → next plan**":

```
bootstrap-plan PG-0001 → external prose render → finalize PG-0001
                                                ↓
     page-cycle-plan PG-0002 ← (only after PG-0001.prose_status == rendered)
                            ↓
     external prose render → finalize PG-0002
                            ↓
     page-cycle-plan PG-0003 ← ...
```

Branching is unaffected as long as the fork's parent is rendered. Forking from a `pending`-status page is blocked by the §14 check.

This is a real workflow change: authoring throughput now includes an external prose-rendering step between every page. It's the load-bearing tradeoff for getting prose generation out of the coding harness.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 1 — No Cosmetic Output | aligns | Plans are load-bearing engine output (consumed by finalize, validators, sibling skills) — producing a plan satisfies Rule 1 even before prose lands. |
| Rule 4 — Choices Have Continuation Capacity | aligns | Phase 8 still emits CHCs validated for continuation_capacity; the validation operates on plan+state rather than prose+state. |
| Rule 6 — No Silent Retcons | aligns | `update_record_field` on PG.prose_status is an explicit, audited state transition (paired with SE event). The PG record's transitional state field semantics make this not a retcon. |
| Rule 7 — Mystery Reserve Preservation | aligns (with split) | Firewall checks split into plan-time (deterministic against declared_resolutions) and finalize-time (deterministic regex + LLM critic over rendered prose). Both gates remain mandatory. |
| §Default Reality | aligns | Story-bundle scoping unchanged; world-canon mutation still routes only through `story-fact-promotion-to-canon`. |
| §Story Bundles | extends | Adds plan/finalize separation as a sub-pattern within story-bundle pipeline. |

---

## Implementation sequencing — suggested ticket decomposition

The full implementation surface is large (12+ files affected, plus a new skill). Decomposing into tickets reduces risk and review burden. Suggested order:

1. **Ticket 1** — Extract `reports/prose-quality-instructions.md` from existing skill references. Self-contained; no skill or validator changes. (Tier A.1)
2. **Ticket 2** — Add the three new PG record schema fields + update `record_schema_compliance.ts` + add `pages-prose-plans/` to `enumerate.ts`. Tooling layer only; no skill changes yet. (A.3 + C.2 partial)
3. **Ticket 3** — Create `_shared-templates/page-plan.md`. Just the template; no skill consumption yet. (A.2)
4. **Ticket 4** — Add conditional-skip to `arc_trace_evidence_alignment.ts` and `prose_ledger_consistency.ts` rules. Validator layer; defensive. (C.2 partial)
5. **Ticket 5** — Implement `branching-story-page-prose-finalize` skill end-to-end. New skill, no changes to existing skills yet. (C.1)
6. **Ticket 6** — Rework `branching-story-bootstrap` Phase 7/7.5/9/9.5/10/11. Includes references rewrites. (B.1-B.6)
7. **Ticket 7** — Rework `branching-story-page-cycle` Phase 7/7.5/7.6/9/10/11 + add §14 pre-flight block. Includes references rewrites. (B.7-B.13)
8. **Ticket 8** — Update sibling skills (`branching-story-health-audit`, `story-fact-promotion-to-canon`, `storylet-pool-authoring`) for prose_status awareness. (C.3)
9. **Ticket 9** — Documentation cascade (CLAUDE.md, WORKFLOWS.md, FOUNDATIONS.md, HARD-GATE-DISCIPLINE.md, hooks README). (C.4)

Tickets 1-4 are independent and can be done in any order. Tickets 5 must precede 6+7 (so finalize exists when bootstrap/page-cycle stop producing prose). Tickets 6+7 should be done together or close in sequence (so the pipeline doesn't have one half-skill that produces prose while the other doesn't). Ticket 8 should land after 6+7. Ticket 9 closes the loop.

A minimum-viable rollout could land tickets 1-7 together (the new pipeline works end-to-end) and treat 8-9 as fast-follow.

---

## Open decisions deferred to implementation

These were flagged during the brainstorm and don't block the design; finalize at implementation time:

1. **C.1 Phase 1 canon-drift posture** — currently proposed: detect drift, require `accept_plan_drift=true` flag to proceed. Alternative: always proceed, just warn. Pick when implementing finalize.
2. **C.3 storylet-pool-authoring early-bundle fallback** — currently proposed: graceful degradation to STORY_KERNEL alone with provenance warning. Alternative: hard-block until PG-0001 finalized. Pick during ticket 8.
3. **C.4 FOUNDATIONS.md update granularity** — currently proposed: minimal clarifications to Rules 1+7 plus one §Story Bundles paragraph. Alternative: explicit new §Plan-and-Finalize Pipeline section. Pick during ticket 9.

---

## Assumptions confirmed

1. Prose-coupled validators at bundle commit → DEFER (record `DEFERRED — awaiting render`) rather than DROP, with finalize skill as the deferred-gate runner. **Confirmed.**
2. Plan file richness → comprehensive self-contained plan (inlines all canonical context verbatim), not compact prose packet. **Confirmed by user clarification.**
3. Finalize path → thin new skill `branching-story-page-prose-finalize` rather than treating prose-fill as a manual edit. **Confirmed.**
4. §14 prior-prose-continuity inlining → hard pre-flight block in page-cycle (`parent.prose_status != rendered` aborts). **Confirmed by user.**
5. PG-0001 case → conditional sections in single shared plan template (§15 ↔ §15-alt). **Author decision per user delegation.**
6. Three new PG schema fields → confirmed (`prose_plan_path`, `prose_status`, `deferred_validation_trace`). **Confirmed by user.**
