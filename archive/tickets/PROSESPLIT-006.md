# PROSESPLIT-006: Rework branching-story-bootstrap Phase 7/7.5/9/9.5/10/11 — plan instead of prose

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` and references rewritten; `templates/story-records.yaml` PG-NNNN field documentation extended. No new patch-engine ops.
**Deps**: PROSESPLIT-002 (PG schema fields), PROSESPLIT-003 (plan template), PROSESPLIT-005 (finalize skill must exist before bootstrap stops producing prose, otherwise no convergence path).

## Problem

`branching-story-bootstrap` Phase 7 currently assembles an LLM prompt with content_policy + world_kernel + prose_craft_contract + cast bound + state context + entry pressure framing, then asks Claude Code to render PG-0001 prose under an 8-axis post-render critic. The harness's coding bias and the prompt's ledger-vocabulary embedding compound to flatten creative prose (see `reports/prose-issues.md`).

This ticket reworks bootstrap's Phase 7 to author the comprehensive plan template (PROSESPLIT-003) instead of rendering prose. Phase 7.5 changes from parsing rendered prose to validating declared affordances. Phase 9 prose-coupled gates DEFER. Phase 9.5 adds a `plan_self_containment` discipline check. Phase 10 deliverable summary changes from "OPENING PROSE PREVIEW" to "PLAN COMPREHENSIVENESS PREVIEW." Phase 11 commit writes `pages-prose-plans/PG-0001.md` instead of `pages-prose/PG-0001.md`.

## Assumption Reassessment (2026-05-10)

1. Bootstrap SKILL.md at `.claude/skills/branching-story-bootstrap/SKILL.md` (verified 332 lines). Phase 7 reference at `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` (verified 142 lines). Phase 7.5 reference at `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` (verified). Phase 9 reference at `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (verified). Phase 9.5 reference at `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (verified).
2. `templates/story-records.yaml` documents the PG-NNNN field shape (verified). Per PROSESPLIT-002 the PG schema gains three new fields; this ticket updates the PG-NNNN block in `templates/story-records.yaml` to match.
3. `templates/content-policy.txt` (verified). NO change in this ticket — it stays embedded verbatim into STORY_KERNEL.md preamble and into plan §2.
4. `templates/story-bundle-index.md` (verified). Per-bundle INDEX template includes a page-list section — needs minor update to surface `prose_status` per page.
5. `templates/story-kernel.md` (verified). NO content change in this ticket; STORY_KERNEL.md generation remains unchanged.
6. Plan template at `.claude/skills/_shared-templates/page-plan.md` is created in PROSESPLIT-003. This skill's Phase 7 references that template by path; the LLM authors a plan file by populating the template.
7. The finalize skill at `.claude/skills/branching-story-page-prose-finalize/` is created in PROSESPLIT-005. Bootstrap's deliverable summary (Phase 10) instructs the user to run finalize after rendering prose externally.
8. Cross-skill / cross-artifact boundary under audit: bootstrap consumes the plan template (PROSESPLIT-003), the PG schema (PROSESPLIT-002), and the finalize-skill convergence point (PROSESPLIT-005). Page-cycle (PROSESPLIT-007) consumes the same surfaces — both skills use the canonical plan template, identical schema additions, identical finalize convergence.
9. FOUNDATIONS principles under audit:
   - Rule 1 (No Cosmetic Output) — the plan IS load-bearing engine output (consumed by Phase 7.5 declared-affordance validation, Phase 9 plan_completeness_check, Phase 9.5 plan_self_containment, finalize Phase 1 plan/prose pairing). Producing a plan without yet-rendered prose satisfies Rule 1.
   - Rule 7 (Mystery Reserve Preservation) — Phase 4 mystery firewall continues to run over the plan's `forbidden_resolutions[]`; Phase 9 mystery_firewall gate continues to PASS. Finalize's Phase 2/3 (PROSESPLIT-005) handles the rendered-prose firewall check.
10. Schema extension classification: PG-NNNN field documentation in `templates/story-records.yaml` extends additively — three new fields documented; existing fields untouched.
11. Adjacent contradictions: Phase 8 (initial choice generation) currently delegates to page-cycle's choice-surface gate in PG-0001 special-case mode. Phase 7.5's output (Visible Affordance Map) feeds Phase 8. Under the rework, Phase 7.5 still produces the Map (same schema), just from declared frontmatter rather than parsed prose. Phase 8 contract is unchanged.
12. HARD-GATE semantics: bootstrap's HARD-GATE block (line 60-62 of current SKILL.md) gates writes to `worlds/<world-slug>/stories/<story-slug>/`. Under the rework, the gate's preconditions update to include `plan_completeness_check` and `plan_self_containment` PASSes; the gate's structural enforcement is unchanged.
13. The phase-7 reference rename (`phase-7-root-page-render.md` → `phase-7-root-page-plan.md`) requires updating SKILL.md's "Procedure" section reference at line 246: `Load \`references/phase-7-root-page-render.md\`` becomes `Load \`references/phase-7-root-page-plan.md\``.
14. Phase 11 commit step 4 currently writes `pages-prose/PG-0001.md`. Under the rework it writes `pages-prose-plans/PG-0001.md`. The `pages-prose/` directory is still `mkdir -p`'d with `.gitkeep` so finalize can later write into it.

## Architecture Check

1. Reusing the canonical plan template (PROSESPLIT-003) means bootstrap and page-cycle (PROSESPLIT-007) share a single source of truth for plan structure. No template duplication.
2. Replacing parse-from-prose with read-from-frontmatter in Phase 7.5 makes the affordance map deterministic and auditable. The plan author (LLM) declares affordances explicitly; the validator checks them against state. No more "the prose accidentally introduced an ungrounded object" failure mode at plan-commit.
3. Adding `plan_completeness_check` (Phase 9 gate 19) and `plan_self_containment` (Phase 9.5 discipline check) makes plan quality structurally enforceable: missing sections fail; bare CF-NNNN references that should have been inlined fail.
4. Deferring `prose_ledger_consistency` to finalize is the only architecturally honest option — there is no rendered prose to compare to state at plan-commit. Recording DEFERRED with rationale preserves the audit trail.
5. `arc_trace_evidence_alignment` AUTO-PASS at PG-0001 root remains correct (no arc selected at root). PROSESPLIT-004's validator skip is defense-in-depth; bootstrap's Phase 9 still records the gate as AUTO-PASS per PG-0001-root-special-case.
6. No backwards-compatibility shims. Existing pre-rework bundles' PG records lack the new schema fields and grandfather via per-world `audits/validation-grandfathering.yaml` entries (per PROSESPLIT-002).

## Verification Layers

1. SKILL.md Phase 7 description prose mentions plan authoring, not prose rendering → grep-proof: `rg -n "Root Page Plan|plan authoring|pages-prose-plans" .claude/skills/branching-story-bootstrap/SKILL.md` matches; `rg -n "render PG-0001 prose|render the opening prose" .claude/skills/branching-story-bootstrap/SKILL.md` matches no occurrences.
2. Phase 7.5 description prose mentions declared-affordance validation, not parse-from-prose → grep-proof.
3. Phase 9 gate table includes `prose_ledger_consistency: DEFERRED — awaiting prose render` and `plan_completeness_check: RUNS` → grep-proof.
4. Phase 9.5 references include `plan_self_containment` → grep-proof.
5. Phase 10 deliverable summary mentions "PLAN COMPREHENSIVENESS PREVIEW" not "OPENING PROSE PREVIEW" → grep-proof.
6. Phase 11 commit step writes `pages-prose-plans/PG-0001.md` → grep-proof.
7. SKILL.md description (top-of-file frontmatter) updated to reflect plan-as-deliverable → grep-proof.
8. `templates/story-records.yaml` PG-NNNN block documents `prose_plan_path`, `prose_status`, `deferred_validation_trace` fields → grep-proof.
9. Skill dry-run on a fixture bundle: bootstrap produces `pages-prose-plans/PG-0001.md` with all 19 plan sections populated; PG-0001.yaml carries `prose_status: pending`, `prose_plan_path: pages-prose-plans/PG-0001.md`, `prose_path: null` — manual review.
10. Phase 8 initial choice generation continues to receive the Visible Affordance Map and produces 4-6 CHCs → manual review of Phase 8 output.

## What to Change

### 1. Rewrite `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` → `phase-7-root-page-plan.md`

Delete the existing file; create the new file. The new file documents:
- Phase 7's job: author the comprehensive plan body for PG-0001 by populating `.claude/skills/_shared-templates/page-plan.md`. Inline all referenced records verbatim. Generate the plan's `selected_arc_id: null` shape (§15-alt entry-pressure framing replaces §15 + §16).
- LLM prompt assembly: instruct the LLM to populate the plan template (NOT to generate prose); content_policy block FIRST (template requires it in §2); story kernel context (§4); cast / state (§5-§13); entry pressure framing (§15-alt) drawn from STORY_KERNEL.central_dramatic_question + Phase 5 obligations/threads + Phase 4 mysteries_in_play + Phase 6 seed-pool commitment_class affordances summary.
- Plan-completeness post-LLM check: every required section populated; every inlined record id resolves; frontmatter fields well-formed.
- Emit PG-0001 + BR-0001 + SE-0001 records into working buffer with new fields: `prose_path: null`, `prose_plan_path: pages-prose-plans/PG-0001.md`, `prose_status: pending`, `arc_trace_emitted: false`, `deferred_validation_trace: { prose_ledger_consistency: "DEFERRED — awaiting prose render", arc_trace_evidence_alignment: "DEFERRED — awaiting prose render", prose_critic_8_axis: "DEFERRED — awaiting prose render" }`.
- The 8-axis post-render prose critic is REMOVED (no prose to critique).
- Cross-references at the bottom: cross-link to `_shared-templates/page-plan.md`, `phase-7-5-visible-affordance-extraction.md`, `phase-9-validation-gates.md`, `branching-story-page-prose-finalize/SKILL.md`.

### 2. Rewrite `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md`

Replace the parse-from-prose flow with the validate-declared-affordances flow:
- Read the plan's `declared_visible_affordances[]` frontmatter array.
- For each entry, validate `mapped_state_id` resolves to an entity in `cast_present` / `objects_in_scope` / `accessible_locations` / `obligations_open` / `threads_active` / `mysteries_in_play`, per the entry's `affordance_type` and `grounding_source`.
- Any unresolvable mapped_state_id triggers a Phase 7 re-prompt (re-author the plan; correct the declared affordances).
- Emit the Visible Affordance Map (same schema as today) for Phase 8 consumption.

### 3. Rewrite `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`

Update the gate table per the design doc Tier B.3:
- Mark `prose_ledger_consistency` as `DEFERRED — awaiting prose render` at PG-0001 commit.
- `arc_trace_evidence_alignment` continues to AUTO-PASS at PG-0001 root (no arc selected); cite "PG-0001 root special case, no arc selected" rationale.
- Add new gate: `plan_completeness_check` — every required plan section populated; every inlined record id resolves; frontmatter fields well-formed.
- Other gates run as today.

### 4. Update `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md`

Add new check: `plan_self_containment` — verify the plan inlines (rather than references) every CF / CHAR / SF / OBL / THR / SREL / STINT / STLOC / STOBJ / SLT / DA whose id appears in any plan section. Fails if the plan emits a bare `CF-NNNN` reference without inlining the CF record body.

### 5. Update `.claude/skills/branching-story-bootstrap/SKILL.md`

- Frontmatter `description`: update "rendered root page (PG-0001) and its first 4-6 generated choices" to "comprehensive prose plan for the root page (PG-0001) and its first 4-6 generated choices; rendered prose is supplied externally and merged via branching-story-page-prose-finalize".
- HARD-GATE block: update preconditions to include `plan_completeness_check` PASS and `plan_self_containment` PASS.
- Process Flow ASCII diagram: update Phase 7 box from "Root Page Render" to "Root Page Plan Authoring"; update Phase 7.5 box from "Visible Affordance Extraction" to "Declared-Affordance Validation".
- Phase 7 description block in SKILL.md body: rewrite to reflect plan authoring; remove "render the opening prose" wording; remove "post-render prose critic (8 axes against the contract)".
- Phase 7.5 description: rewrite to validate-declared.
- Phase 9 description: list 19 gates (added `plan_completeness_check`); deferred gates noted.
- Phase 9.5 description: 11 discipline checks (added `plan_self_containment`).
- Phase 10 deliverable summary template: replace "OPENING PROSE PREVIEW: <first ~300 words>" with "PLAN COMPREHENSIVENESS PREVIEW" per the design doc Tier B.4.
- Phase 11 commit step 4: change `Write worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-0001.md` to `Write worlds/<world-slug>/stories/<story-slug>/pages-prose-plans/PG-0001.md`. Add a `mkdir -p` step (already in step 1) for `pages-prose/` with `.gitkeep` (kept for finalize's later write).
- Procedure section line 246: update reference path to `phase-7-root-page-plan.md`.
- Final Rule paragraph: keep the canonical-engine-ledgers list intact, but reframe "rendered prose" as "comprehensive plan + deferred prose validators" so the rule reflects post-rework reality.

### 6. Update `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

Extend the PG-NNNN block to document the three new fields (per PROSESPLIT-002 schema):
- `prose_path: pages-prose/PG-NNNN.md | null  # null at bundle commit; populated by finalize`
- `prose_plan_path: pages-prose-plans/PG-NNNN.md  # always present after this rework`
- `prose_status: pending | rendered | superseded  # default pending at bundle commit`
- `deferred_validation_trace: { prose_ledger_consistency, arc_trace_evidence_alignment, prose_critic_8_axis }  # each DEFERRED at commit; PASS/FAIL after finalize`

### 7. Update `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md`

Update the per-bundle INDEX page-list section to surface `prose_status` per page (e.g., `- PG-0001 (pending)` becomes `- PG-0001 (pending; plan: pages-prose-plans/PG-0001.md)`). Exact format detail: implementation time.

### 8. Update `.claude/skills/branching-story-bootstrap/references/governance-and-foundations.md`

Reflect "Phase 7 produces a plan; rendered prose is a finalize-time concern." Update the FOUNDATIONS Alignment table per the design doc Tier C governance section. Note Rule 7 firewall split (plan-time vs finalize-time).

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` (delete)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (new)
- `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` (modify — rewrite)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify — PG-NNNN block extension)
- `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` (modify — page-list prose_status)

## Out of Scope

- Page-cycle changes. Covered in PROSESPLIT-007.
- Sibling-skill prose_status awareness. Covered in PROSESPLIT-008.
- Documentation cascade. Covered in PROSESPLIT-009.
- Finalize skill itself. Covered in PROSESPLIT-005.
- PG schema field additions in JSON. Covered in PROSESPLIT-002.
- Plan template creation. Covered in PROSESPLIT-003.
- Touching `templates/content-policy.txt` (NC-21 block stays unchanged).
- Touching `templates/story-kernel.md` (STORY_KERNEL.md generation unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "Root Page Plan|plan authoring" .claude/skills/branching-story-bootstrap/SKILL.md` matches.
2. `rg -n "render the opening prose|render PG-0001 prose|post-render prose critic" .claude/skills/branching-story-bootstrap/` returns no matches (modulo deleted `phase-7-root-page-render.md`).
3. `rg -n "pages-prose-plans/PG-0001.md" .claude/skills/branching-story-bootstrap/SKILL.md` matches in Phase 11 step 4.
4. `rg -n "prose_status|prose_plan_path|deferred_validation_trace" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` matches all three new field names.
5. `rg -n "plan_completeness_check" .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` matches.
6. `rg -n "plan_self_containment" .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` matches.
7. `test -f .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` succeeds; `test -f .claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` fails.
8. Skill dry-run on a fixture: bootstrap a small test bundle; expect `pages-prose-plans/PG-0001.md` written; `pages-prose/PG-0001.md` NOT written; PG-0001.yaml carries the three new fields with correct values.

### Invariants

1. The skill never writes `pages-prose/PG-0001.md` (under the rework, that file is only written externally by the user).
2. PG-0001.yaml at bundle commit always has `prose_status: pending`, `prose_path: null`, `prose_plan_path: pages-prose-plans/PG-0001.md`.
3. The plan file's frontmatter `selected_arc_id` is null at PG-0001 (root case); the body contains §15-alt entry-pressure framing, NOT §15 + §16.
4. `pages-prose/` directory exists with `.gitkeep` so finalize can later write into it without recreating the dir.
5. HARD-GATE preconditions include `plan_completeness_check` PASS and `plan_self_containment` PASS.
6. Phase 8 contract (Visible Affordance Map → 4-6 scene-commitment CHCs) is structurally unchanged; only the affordance map's source (frontmatter declaration) differs.

## Test Plan

### New/Modified Tests

1. None — skill-prose-only ticket; verification is grep + skill dry-run + manual review. Existing skill-audit and skill-internal-coherence flows continue to apply.

### Commands

1. `rg -n "Root Page Plan|plan authoring|pages-prose-plans" .claude/skills/branching-story-bootstrap/`
2. `rg -n "render the opening prose|render PG-0001 prose|post-render prose critic" .claude/skills/branching-story-bootstrap/SKILL.md`
3. `rg -n "prose_status|prose_plan_path|deferred_validation_trace" .claude/skills/branching-story-bootstrap/templates/`
4. Skill dry-run invocation against a test fixture (exact command verified at implementation time).
