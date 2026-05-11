# PROSESPLIT-007: Rework branching-story-page-cycle Phase 7/7.5/7.6/9/10/11 + add §14 hard pre-flight block

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/SKILL.md` and references rewritten; `references/record-schemas.md` PG-NNNN section extended. No new patch-engine ops.
**Deps**: PROSESPLIT-002 (PG schema fields), PROSESPLIT-003 (plan template), PROSESPLIT-005 (finalize skill must exist before page-cycle stops emitting ARC_TRACE), PROSESPLIT-006 (bootstrap rework — page-cycle pre-flight reads bootstrap-produced PG records).

## Problem

`branching-story-page-cycle` Phase 7 currently assembles an LLM prompt with content_policy + story kernel + prose_craft_contract + arc_contract + dramatic_unit + beat_plan + execution_envelope + stop_policy + required_effects + scene_context + recent_prose_continuity + governor_nudge, then asks Claude Code to render multi-beat arc prose under an 8-axis post-render critic. Phase 7.6 extracts ARC_TRACE evidence from the rendered prose. Same harness-bias and prompt-architecture issues as bootstrap (see `reports/prose-issues.md`).

This ticket reworks page-cycle's Phase 7 to author the comprehensive plan template (PROSESPLIT-003) instead of rendering prose. Phase 7.5 changes from parsing rendered prose to validating declared affordances. Phase 7.6 ARC_TRACE extraction Layer 2 / Layer 3 DEFER to finalize (Layer 1 deterministic structural validation runs at plan-commit over the plan's `declared_intended_beats[]`). Phase 9 prose-coupled gates DEFER. Phase 10 deliverable summary changes from "PROSE PREVIEW" to "PLAN COMPREHENSIVENESS PREVIEW." Phase 11 commit writes `pages-prose-plans/PG-NNNN.md` instead of `pages-prose/PG-NNNN.md`; `create_arc_trace_record` op is REMOVED from page-cycle's envelope; ARCTRACE-NNNN id is no longer pre-allocated at page-cycle pre-flight.

A new pre-flight check (the §14 hard block) aborts when `parent.prose_status != "rendered"` so the plan's §14 (Recent prose continuity) can always inline the parent's rendered prose. This serializes the authoring loop: bootstrap-plan → finalize → page-cycle-plan → finalize → page-cycle-plan → ...

## Assumption Reassessment (2026-05-10)

1. Page-cycle SKILL.md at `.claude/skills/branching-story-page-cycle/SKILL.md` (verified ~440 lines). Phase 7 reference at `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` (verified). Phase 7.5 reference at `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` (verified). Phase 7.6 reference at `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` (verified). Phase 9 reference at `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (verified). Pre-flight reference at `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (verified).
2. `references/prose-craft-contract.md` is the canonical Prose Craft Contract source-of-truth — verified. STAYS at this path under the rework. No content change in this ticket; the contract is still embedded verbatim into plan §3 (per PROSESPLIT-003) AND consumed by finalize Phase 3 (per PROSESPLIT-005).
3. `references/record-schemas.md` documents the PG-NNNN record schema in narrative form (verified). Per PROSESPLIT-002 the PG schema gains three new fields; this ticket updates the PG-NNNN section in `references/record-schemas.md` to match.
4. `templates/content-policy.txt` (verified). NO change in this ticket — it stays embedded verbatim into plan §2.
5. ARCTRACE-NNNN pre-allocation currently happens in pre-flight per the SKILL.md HARD-GATE block (line 47): "pre-allocate all per-class IDs the envelope will populate ... `ARCTRACE` when Phase 7.6 will emit a trace under the per-execution-mode budget". Under the rework, ARCTRACE moves to finalize (PROSESPLIT-005); this skill's pre-flight removes ARCTRACE from its allocation list.
6. `create_arc_trace_record` op currently emitted by page-cycle's Phase 11 envelope (per SKILL.md line 396: "`create_arc_trace_record` for `_source/arc-traces/ARCTRACE-NNNN.yaml` IF Phase 7.6 emitted an ARC_TRACE this turn"). Under the rework, this op is REMOVED from the page-cycle envelope. PROSESPLIT-005 finalize emits it instead.
7. Plan template at `.claude/skills/_shared-templates/page-plan.md` is created in PROSESPLIT-003. Page-cycle's Phase 7 references that template by path; the LLM authors a plan file by populating the template (selected_arc_id != null shape).
8. The finalize skill at `.claude/skills/branching-story-page-prose-finalize/` is created in PROSESPLIT-005. Page-cycle's Phase 10 deliverable summary instructs the user to run finalize after rendering prose externally.
9. Cross-skill / cross-artifact boundary under audit: page-cycle and bootstrap (PROSESPLIT-006) consume identical surfaces — same plan template, same PG schema additions, same finalize convergence point. The only structural difference is the conditional shape (selected_arc_id != null in page-cycle vs null in bootstrap PG-0001).
10. FOUNDATIONS principles under audit:
    - Rule 1 (No Cosmetic Output) — the plan IS load-bearing engine output; same as bootstrap.
    - Rule 6 (No Silent Retcons) — `update_record_field` on PG.prose_status by finalize is an explicit, audited transition; page-cycle does not perform that mutation in this ticket's scope.
    - Rule 7 (Mystery Reserve Preservation) — Phase 4.5 mystery resolution authority is unchanged; the firewall split (plan-time vs finalize-time) is documented in finalize.
11. Schema extension classification: PG-NNNN field documentation in `references/record-schemas.md` extends additively — three new fields documented; existing fields untouched.
12. HARD-GATE semantics: page-cycle's HARD-GATE block (line 44-54 of current SKILL.md) gates writes to `_source/` and `pages-prose/`. Under the rework: (a) Phase 7 renders no prose, so the HARD-GATE no longer gates a prose-write; (b) the gate gates plan write to `pages-prose-plans/` and engine ops to `_source/`; (c) Phase 4.5 canon-promotion handoff is preserved unchanged; (d) Phase 9 gate list updates (deferred entries plus new `plan_completeness_check`).
13. Adjacent contradictions: Phase 7.5 currently feeds Phase 8 (choice-surface gate) with the Visible Affordance Map. Under the rework, Phase 7.5 still produces the Map (same schema) from declared frontmatter rather than parsed prose. Phase 8 contract is unchanged. Phase 7.6 Layer 1 (deterministic structural beat-count fidelity) MOVES to operate over `declared_intended_beats[]` frontmatter; Layer 2 / Layer 3 (LLM extraction + semantic critic) DEFER to finalize.
14. The §14 pre-flight hard block is a NEW pre-Phase-1 check. It reads the parent PG record's `prose_status` field; if not "rendered" (and `parent_page_id != null`), pre-flight aborts with directive to run finalize on the parent first. This applies to both straight-line continuation AND fork-from-non-leaf.
15. Page-cycle's Phase 11 cleanup (step 4 — `rm -f /tmp/<plan-id>.json /tmp/<plan-id>.token`) is unchanged in scope. The temp-file pattern still applies to plan-commit envelopes.

## Architecture Check

1. Same canonical plan template as bootstrap (PROSESPLIT-003) — single source of truth, no duplication.
2. The §14 hard pre-flight block is the load-bearing serialization mechanism. Plans always have rich prior-prose continuity to inline; the renderer always has a coherent prior page to continue from. Forking from non-rendered pages is correctly blocked.
3. Deferring ARC_TRACE Layer 2 / Layer 3 to finalize is structurally honest: extracting evidence spans from prose requires the prose to exist. Layer 1 (deterministic beat-count fidelity) can run at plan-commit over `declared_intended_beats[]` because that's a plan-time contract.
4. Removing `create_arc_trace_record` from page-cycle's envelope simplifies the envelope. Finalize owns ARCTRACE emission end-to-end.
5. The post-render 8-axis prose critic is REMOVED from Phase 7 (no prose to critique). The critic logic moves to finalize Phase 3 (PROSESPLIT-005). The canonical `prose-craft-contract.md` source is unchanged; only the consumption site moves.
6. No backwards-compatibility shims. Existing pre-rework bundles' PG records grandfather per PROSESPLIT-002. Existing ARCTRACE records emitted by pre-rework page-cycle runs remain valid (no migration needed; finalize emits ARCTRACE for new pages going forward).
7. Alternative considered: keep ARCTRACE Layer 1 emission at page-cycle (with placeholder evidence_spans, filled in at finalize). Rejected because (a) emitting an artifact with placeholder evidence is exactly the cosmetic output Rule 1 forbids, (b) splitting one record across two skills is a maintenance hazard, (c) no validator would accept placeholder evidence_spans without a special-case skip.

## Verification Layers

1. SKILL.md Phase 7 description prose mentions plan authoring, not prose rendering → grep-proof: `rg -n "Multi-Beat Arc Plan|plan authoring|pages-prose-plans" .claude/skills/branching-story-page-cycle/SKILL.md` matches; `rg -n "render the arc as continuous prose|post-render prose critic|render the next arc-page" .claude/skills/branching-story-page-cycle/SKILL.md` matches no occurrences.
2. Phase 7.5 description prose mentions declared-affordance validation → grep-proof.
3. Phase 7.6 description: Layer 1 only at plan-commit; Layer 2 / Layer 3 deferred to finalize → grep-proof.
4. Phase 9 gate table includes `prose_ledger_consistency: DEFERRED — awaiting prose render`, `arc_trace_evidence_alignment: DEFERRED — awaiting prose render`, `prose_critic_8_axis: DEFERRED — awaiting prose render`, plus `plan_completeness_check: RUNS` → grep-proof.
5. Pre-flight description includes the §14 hard block (parent.prose_status check) → grep-proof: `rg -n "parent.prose_status" .claude/skills/branching-story-page-cycle/`.
6. Phase 10 deliverable summary mentions "PLAN COMPREHENSIVENESS PREVIEW" not "PROSE PREVIEW" → grep-proof.
7. Phase 11 commit step writes `pages-prose-plans/PG-NNNN.md` → grep-proof.
8. Phase 11 envelope no longer contains `create_arc_trace_record` op for the page being authored → grep-proof.
9. ARCTRACE pre-allocation removed from pre-flight → grep-proof.
10. SKILL.md description (top-of-file frontmatter) updated to reflect plan-as-deliverable → grep-proof.
11. `references/record-schemas.md` PG-NNNN section documents `prose_plan_path`, `prose_status`, `deferred_validation_trace` fields → grep-proof.
12. Skill dry-run on a fixture bundle: page-cycle on PG-0001-already-finalized produces `pages-prose-plans/PG-0002.md` with all 19 plan sections populated; PG-0002.yaml carries `prose_status: pending`; no ARCTRACE record emitted at this commit; INDEX.md page row shows pending status — manual review.
13. Skill dry-run on a bundle whose parent PG is `prose_status: pending`: page-cycle aborts at pre-flight with directive to run finalize first — manual review.

## What to Change

### 1. Rewrite `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md`

Either rename to `phase-7-page-plan.md` (preferred for consistency with bootstrap's `phase-7-root-page-plan.md` rename per PROSESPLIT-006) or keep the filename and rewrite contents. Implementation chooses; cross-references in SKILL.md follow.

The new content documents:
- Phase 7's job: author the comprehensive plan body for the next page by populating `.claude/skills/_shared-templates/page-plan.md` with `selected_arc_id != null` shape (§15 + §16 present; §15-alt absent). Inline all referenced records verbatim. The plan's `declared_intended_beats[]` is populated with the selected arc's `beat_plan` realized as concrete scene-movement beats.
- LLM prompt assembly: instruct the LLM to populate the plan template (NOT to generate prose); content_policy block FIRST (template requires it in §2); story kernel; cast / state / SF / OBL / THR / CNSQ / SREL / STINT / STLOC / STOBJ; selected arc record (full SLT verbatim into §15); chosen variant.required_effects[] (verbatim into §16); recent prose continuity (last 1-2 along branch_path verbatim into §14 — guaranteed non-empty by §14 hard pre-flight block); governor nudge (§17); scene direction (§18 — REQUIRED TURN, STOPPING POINT, DO NOT REVEAL).
- Plan-completeness post-LLM check: every required section populated; every inlined record id resolves; frontmatter fields well-formed.
- Emit PG record into working buffer with new fields (analogous to bootstrap PROSESPLIT-006).
- The 8-axis post-render prose critic is REMOVED (no prose to critique). Cross-reference: `branching-story-page-prose-finalize/references/phase-3-prose-critic.md` is the new home for the critic logic.

### 2. Rewrite `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md`

Same shape as PROSESPLIT-006's bootstrap Phase 7.5 rewrite — validate-declared-affordances flow against state. The page-cycle case has richer state (full arc + variant context) but the validation logic is the same.

### 3. Rewrite `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md`

Replace Layer 2 / Layer 3 sections with a redirect to finalize. Phase 7.6 at plan-commit time runs ONLY:
- Layer 1 (deterministic structural validation) — beat-count fidelity against `arc.beat_plan.min_beats` / `max_beats` checked against the plan's `declared_intended_beats[]` frontmatter array. Markdown-header absence is N/A (plan has structured sections by template; no beat headers leak into a non-existent prose render). Forbidden Mystery preservation runs over `forbidden_resolutions[]`. Branch-scope legality runs over the plan's inlined records. Effect-variant legality runs over the plan's `chosen_variant_id` field against the selected arc's `effect_model.variants[]`.
- Layer 2 / Layer 3: DEFERRED. Cross-reference: `branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md`.

The reference's existing test/cross-check infrastructure stays (Layer 1 is unchanged in mechanism, just re-targeted).

### 4. Update `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`

Same DEFERRED entries as bootstrap (PROSESPLIT-006 §3): `prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis` all `DEFERRED — awaiting prose render`. Add new gate `plan_completeness_check: RUNS`. Other gates (mystery_firewall, invariant_compatibility, recursive_reference_closure, snapshot_replay_equality, id_uniqueness, content_policy_presence, choice_contract_integrity, choice_consequence_capacity, state_snapshot_integrity, epistemic_class_declared, consequence_persistence, arc_envelope_conformance, effect_model_replay_safety, narrative_point_classification, choice_worthiness_completeness) run as today.

### 5. Update `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md`

Add the §14 hard pre-flight block:

```
If parent_page_id != null:
  Read parent PG record from worlds/<world-slug>/stories/<story-slug>/_source/pages/<parent_page_id>.yaml.
  If parent.prose_status != "rendered":
    ABORT with message:
      "Parent page <PG-NNNN> has prose_status=<status>. Run
      branching-story-page-prose-finalize on the parent before authoring
      this page's plan, so §14 (Recent prose continuity) can inline the
      parent's rendered prose."

This applies to both straight-line continuation AND fork-from-non-leaf — any
parent page must be rendered before its child can be planned.
```

Also remove `ARCTRACE` from the pre-allocation list (the per-class IDs the envelope will populate). ARCTRACE is now finalize's responsibility.

### 6. Update `.claude/skills/branching-story-page-cycle/SKILL.md`

- Frontmatter `description`: update "renders the next page" to "authors the comprehensive prose plan for the next page; rendered prose is supplied externally and merged via branching-story-page-prose-finalize".
- HARD-GATE block: update preconditions to include `plan_completeness_check` PASS; remove ARCTRACE from the pre-allocation list; add §14 pre-flight check; preserve Phase 4.5 canon-promotion handoff unchanged.
- Process Flow ASCII diagram: update Phase 7 box from "Multi-beat arc render" to "Multi-beat arc plan authoring"; update Phase 7.5 from "Visible affordance extraction" to "Declared-affordance validation"; update Phase 7.6 from "ARC_TRACE extraction + three-layer validation" to "ARC_TRACE Layer 1 only (Layer 2/3 deferred to finalize)".
- Phase 7 description block in SKILL.md body: rewrite to reflect plan authoring; remove "render the arc as continuous prose, not beat-headered enumeration" wording; remove "post-render 8-axis prose critic and beat-header check"; add "delegate prose rendering to external lane via branching-story-page-prose-finalize".
- Phase 7.5 description: rewrite to validate-declared.
- Phase 7.6 description: Layer 1 only.
- Phase 9 description: list 18 gates (added `plan_completeness_check`); deferred gates noted.
- Phase 10 deliverable summary template: replace "PROSE PREVIEW: <first ~300 words>" with "PLAN COMPREHENSIVENESS PREVIEW" per the design doc Tier B.13.
- Phase 11 commit step 2: change `Write pages-prose/PG-NNNN.md` to `Write pages-prose-plans/PG-NNNN.md`. Add `mkdir -p pages-prose/` (with `.gitkeep`) so finalize can later write into it.
- Phase 11 envelope assembly (step 1a): REMOVE `create_arc_trace_record` from the op list. Update the prose comment that documents the op list accordingly.
- Procedure section per-phase reference paths: update `phase-7-page-render.md` reference (if renamed to `phase-7-page-plan.md`).
- Hard Rules section: update the "ARC_TRACE persistence (Phase 7.6) does not change ..." Hard Rule to reflect that Phase 7.6 now runs Layer 1 only and ARCTRACE emission is finalize's responsibility.
- Final Rule paragraph: keep the "page is not a passage of prose" framing; reframe "render at Phase 7" as "plan authored at Phase 7; prose finalized externally and merged via finalize."

### 7. Update `.claude/skills/branching-story-page-cycle/references/record-schemas.md`

Extend the PG-NNNN section to document the three new fields (per PROSESPLIT-002 schema) — analogous to bootstrap's `templates/story-records.yaml` PG-NNNN block extension in PROSESPLIT-006 §6.

### 8. Update `.claude/skills/branching-story-page-cycle/references/governance-and-foundations.md`

Reflect "Phase 7 produces a plan; rendered prose and ARC_TRACE are finalize-time concerns." Update the FOUNDATIONS Alignment table per the design doc Tier C governance section. Note Rule 7 firewall split (plan-time vs finalize-time).

### 9. NO change to `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md`

The contract is byte-unchanged. It's still the canonical source of truth, embedded into plan §3 (PROSESPLIT-003) and consumed by finalize Phase 3 (PROSESPLIT-005). PROSESPLIT-001's `reports/prose-quality-instructions.md` is also derived from this file.

### 10. NO change to `.claude/skills/branching-story-page-cycle/templates/content-policy.txt`

NC-21 block stays unchanged.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` (modify — rewrite, optionally rename to `phase-7-page-plan.md`)
- `.claude/skills/branching-story-page-cycle/references/phase-7-5-visible-affordance-extraction.md` (modify — rewrite)
- `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify — PG-NNNN section extension)
- `.claude/skills/branching-story-page-cycle/references/governance-and-foundations.md` (modify)

## Out of Scope

- Bootstrap changes. Covered in PROSESPLIT-006.
- Sibling-skill prose_status awareness. Covered in PROSESPLIT-008.
- Documentation cascade. Covered in PROSESPLIT-009.
- Finalize skill itself. Covered in PROSESPLIT-005.
- PG schema field additions in JSON. Covered in PROSESPLIT-002.
- Plan template creation. Covered in PROSESPLIT-003.
- Touching `references/prose-craft-contract.md` (unchanged).
- Touching `templates/content-policy.txt` (unchanged).
- Migrating existing pre-rework PG records to the new schema (operational; not a skill change).
- Updating `references/engine-envelope-shape.md` if it documents ARCTRACE op. (Implementation: check; if it documents `create_arc_trace_record` as a page-cycle envelope op, update to note "now finalize-emitted only" — small additive edit.)

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "Multi-Beat Arc Plan|plan authoring|pages-prose-plans" .claude/skills/branching-story-page-cycle/SKILL.md` matches.
2. `rg -n "render the arc as continuous prose|post-render prose critic|Render the arc" .claude/skills/branching-story-page-cycle/SKILL.md` returns no matches.
3. `rg -n "pages-prose-plans/PG-NNNN.md|pages-prose-plans" .claude/skills/branching-story-page-cycle/SKILL.md` matches in Phase 11 step 2.
4. `rg -n "create_arc_trace_record" .claude/skills/branching-story-page-cycle/SKILL.md` returns no matches in the Phase 11 envelope op list (the doc may still reference the op name in a "now finalize-emitted only" sentence; the op list itself omits it).
5. `rg -n "parent.prose_status|prose_status != .rendered." .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` matches.
6. `rg -n "plan_completeness_check" .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` matches.
7. `rg -n "Layer 2|Layer 3" .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` shows the layers documented as DEFERRED to finalize.
8. `rg -n "ARCTRACE" .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` returns no matches in the pre-allocation list (the file may reference ARCTRACE in cross-references but not as a pre-allocated id).
9. `rg -n "prose_status|prose_plan_path|deferred_validation_trace" .claude/skills/branching-story-page-cycle/references/record-schemas.md` matches all three new field names in the PG-NNNN section.
10. Skill dry-run on a fixture: page-cycle on a finalized parent PG produces `pages-prose-plans/PG-NNNN.md` with all 19 plan sections populated; PG-NNNN.yaml carries the three new fields; envelope contains no `create_arc_trace_record` op; INDEX.md updated.
11. Skill dry-run on a fixture with `parent.prose_status: pending`: pre-flight aborts with the §14 directive message.

### Invariants

1. The skill never writes `pages-prose/PG-NNNN.md`.
2. PG-NNNN.yaml at plan-commit always has `prose_status: pending`, `prose_path: null`, `prose_plan_path: pages-prose-plans/PG-NNNN.md`, `arc_trace_emitted: false`.
3. The plan file's frontmatter `selected_arc_id` is the SLT-NNNN id of the Phase-4-selected arc (non-null in page-cycle); the body contains §15 + §16, NOT §15-alt.
4. Page-cycle's Phase 11 envelope contains NO `create_arc_trace_record` op for the page being authored.
5. ARCTRACE-NNNN id is NOT pre-allocated at page-cycle pre-flight.
6. §14 hard pre-flight block aborts when `parent.prose_status != "rendered"` and `parent_page_id != null`.
7. Phase 4.5 canon-promotion handoff is preserved unchanged.
8. Phase 8 contract (Visible Affordance Map → 4-6 CHCs with continuation_capacity) is structurally unchanged.

## Test Plan

### New/Modified Tests

1. None — skill-prose-only ticket; verification is grep + skill dry-run + manual review.

### Commands

1. `rg -n "Multi-Beat Arc Plan|plan authoring|pages-prose-plans" .claude/skills/branching-story-page-cycle/`
2. `rg -n "render the arc as continuous prose|post-render prose critic" .claude/skills/branching-story-page-cycle/SKILL.md`
3. `rg -n "create_arc_trace_record" .claude/skills/branching-story-page-cycle/SKILL.md`
4. `rg -n "parent.prose_status" .claude/skills/branching-story-page-cycle/`
5. Skill dry-run invocation against a test fixture (exact command verified at implementation time).
