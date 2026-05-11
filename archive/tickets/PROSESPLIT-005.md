# PROSESPLIT-005: Implement branching-story-page-prose-finalize skill

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new skill at `.claude/skills/branching-story-page-prose-finalize/`. No new patch-engine ops; uses existing `update_record_field`, `create_se_record`, `create_arc_trace_record`. No new ID class.
**Deps**: PROSESPLIT-002 (PG schema fields), PROSESPLIT-003 (plan template). PROSESPLIT-004 is independent (validator skip is defense-in-depth; finalize directly resolves prose_status).

## Problem

The plan-and-finalize rework relocates creative prose generation outside Claude Code. Bootstrap and page-cycle (after PROSESPLIT-006 / PROSESPLIT-007) emit a comprehensive plan file at `pages-prose-plans/PG-NNNN.md` and a PG record with `prose_status: pending`. The user (or external OpenRouter LLM) renders prose against the plan and saves it to `pages-prose/PG-NNNN.md`. **Nothing currently exists** to:

- Validate the rendered prose against the plan's contract (forbidden mysteries, engine-vocabulary leakage, REQUIRED TURN compliance, prose-craft-contract 8-axis critic).
- Extract the ARC_TRACE record from rendered prose (Phase 7.6 Layer 2 / 3 logic, deferred from page-cycle).
- Run the deferred Phase 9 gates (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`) over the rendered prose.
- Update the PG record's `prose_path` / `prose_status` / `deferred_validation_trace` / `arc_trace_emitted` / `arc_trace_id` fields.
- Emit the audit-trail SE event marking prose finalization.

This ticket creates the new `branching-story-page-prose-finalize` skill that owns all of the above. The skill is the convergence point between the plan-authoring path (Claude Code) and the prose-rendering path (manual or external).

## Assumption Reassessment (2026-05-10)

1. PG record schema additions (`prose_plan_path`, `prose_status`, `deferred_validation_trace`) land in PROSESPLIT-002. This skill READS those fields at pre-flight and WRITES them at Phase 7. Verified the schema additions are atomic to PROSESPLIT-002 and precede this ticket in the implementation order.
2. Plan template at `.claude/skills/_shared-templates/page-plan.md` lands in PROSESPLIT-003. This skill READS the plan's frontmatter at Phase 1 (state_hash_at_plan_time, canon_revision_at_plan_time, forbidden_resolutions, declared_intended_beats, declared_stop_condition). Verified the frontmatter shape in PROSESPLIT-003.
3. `update_record_field` op exists at `tools/patch-engine/src/ops/update-record-field.ts:10` and supports `set`, `append_list`, `append_text` operations on top-level and nested field paths (verified via inspection). Setting `deferred_validation_trace.prose_ledger_consistency` uses the nested-path pattern (path: `["deferred_validation_trace", "prose_ledger_consistency"]`, operation: `set`, value: PASS/FAIL string).
4. `create_se_record` op exists at `tools/patch-engine/src/ops/create-story-record.ts` (story-record op factory; SE is one of the ID classes). Verified `create_se_record` is in the supported op list.
5. `create_arc_trace_record` op exists at `tools/patch-engine/src/ops/create-story-record.ts` and emits to `_source/arc-traces/ARCTRACE-NNNN.yaml`. Verified.
6. `mcp__worldloom__allocate_next_id` supports `SE` and `ARCTRACE` ID classes, both story-bundle-scoped (require `story_slug` argument). Verified per CLAUDE.md §ID Allocation Conventions.
7. The 8-axis prose critic logic currently lives in `branching-story-page-cycle/references/phase-7-page-render.md` §Post-Render Prose Critic (lines 88-130). The same logic is consumed by this skill's Phase 3 — the canonical source-of-truth (the prose-craft-contract.md file) is read directly at finalize Phase 3, no duplication needed.
8. ARC_TRACE Layer 2 (LLM trace extraction) and Layer 3 (semantic conformance critic) currently live in `branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` §Layer 2 / §Layer 3. PROSESPLIT-007 deletes that reference's contents from page-cycle; this skill's Phase 4 absorbs the Layer 2 / Layer 3 logic.
9. Cross-skill / cross-artifact boundary under audit: this skill is the only consumer of the `pending → rendered` transition on PG records. It is also the only emitter of `create_arc_trace_record` ops post-rework (page-cycle stops emitting per PROSESPLIT-007). Health-audit, story-fact-promotion-to-canon, and storylet-pool-authoring (per PROSESPLIT-008) read PG.prose_status as a filter; this skill writes that field.
10. FOUNDATIONS principles under audit: Rule 1 (No Cosmetic Output) — the SE event, ARCTRACE record, and PG field updates are load-bearing; Rule 6 (No Silent Retcons) — the SE event provides the immutable audit trail; Rule 7 (Mystery Reserve Preservation) — Phase 2 deterministic forbidden-mystery scan + Phase 3 LLM critic together enforce the firewall over rendered prose.
11. Schema extension classification: not applicable — this ticket consumes the schema additions from PROSESPLIT-002 but does not add new fields itself.
12. HARD-GATE semantics: this skill follows the bicameral pattern of `branching-story-page-cycle` — Phase 6 (HARD-GATE approval) is per-execution-mode liftable (`authoring` shows; `interactive_runtime` and `batch_generation` auto-commit after gates pass). The Phase 4.5 canon-promotion handoff is NOT triggered by finalize — finalize does not promote story facts to world canon; that route remains exclusive to `story-fact-promotion-to-canon`.
13. Adjacent contradictions: page-cycle's pre-flight allocation list (PROSESPLIT-007 trims) currently includes `ARCTRACE-NNNN`. After PROSESPLIT-007, page-cycle no longer pre-allocates ARCTRACE; this skill pre-allocates it. The semantic identity of ARCTRACE-NNNN is preserved (still attached to its referenced PG); only the allocation site moves.
14. Hook 3 implication: `update_record_field` and `create_se_record` and `create_arc_trace_record` are engine-routed ops; Hook 3 already blocks direct `Edit`/`Write` to `worlds/<slug>/stories/<slug>/_source/<class>/*.yaml`. The user cannot finalize by hand-editing PG-NNNN.yaml. `pages-prose/PG-NNNN.md` is a direct-write surface; the user (or external LLM) writes that file directly per the existing hook policy.

## Architecture Check

1. The skill is structurally a sibling of `branching-story-page-cycle` — same HARD-GATE / patch-engine / per-mode discipline, same ID-allocation pattern, same INDEX-last partial-failure recovery. Reuses the proven page-cycle template rather than inventing new conventions.
2. `update_record_field` on the existing PG record (rather than supersession-via-new-PG-record) preserves PG identity in `branch_path` references. PG record id IS the page's branch-path identity. The PG `prose_status` field is explicitly designed as a transitional state field, fitting `update_record_field` semantics.
3. The SE event provides the immutable audit trail for finalization. Read-back: querying SE records with `action: "prose_finalized"` and filtering by `created_at_page` reconstructs the finalize history per page.
4. ARC_TRACE emission concentrates at finalize because evidence spans require rendered prose to extract from. Emitting at plan-commit (current state) produces an artifact without ground truth; deferring is the correct architectural shape, not a workaround.
5. No backwards-compatibility shims. The skill is brand new.
6. Alternative considered: bake finalize into page-cycle as a "Phase 12" that runs after the user supplies prose. Rejected because (a) page-cycle's HARD-GATE / per-mode model would conflate plan-authoring approval with prose-validation approval, (b) running both phases in one skill confuses the failure-mode narrative ("which phase failed?"), (c) a separate skill makes the workflow's serialized authoring loop visible at the skill-invocation surface.

## Verification Layers

1. Skill exists with correct path and HARD-GATE block → codebase grep-proof: `test -f .claude/skills/branching-story-page-prose-finalize/SKILL.md` and `rg -n "<HARD-GATE>" .claude/skills/branching-story-page-prose-finalize/SKILL.md`.
2. Pre-flight aborts when `pages-prose/PG-NNNN.md` is missing → skill dry-run: invoke with a story bundle whose PG-0001 has `prose_status: pending` and no prose file; expect explicit pre-flight abort message.
3. Pre-flight aborts when `prose_status != "pending"` → skill dry-run: invoke twice on the same PG; second run aborts with "already rendered" message.
4. Phase 2 deterministic checks catch engine-vocabulary leakage → skill dry-run: invoke with a prose file containing literal "OBL-0001"; expect Phase 2 fail with cited offense.
5. Phase 3 prose critic emits an 8-axis verdict → skill dry-run: invoke with a prose file containing filter words; expect SOFT_FAIL or HARD_FAIL with axis-by-axis citations.
6. Phase 4 emits ARCTRACE record only when `selected_arc_id != null` → skill dry-run: invoke against bootstrap PG-0001 (no arc); expect Phase 4 skipped, no ARCTRACE record emitted. Invoke against page-cycle PG-0002 (with arc); expect ARCTRACE-NNNN emitted with realized_beats[] and evidence_spans[] populated.
7. Phase 7 envelope contains the expected ops → schema validation: dry-run validate the patch envelope structure against `tools/patch-engine/src/envelope/schema.ts` `Operation` type; ops should be `update_record_field` (multiple, on PG fields), `create_se_record`, optionally `create_arc_trace_record`.
8. PG record post-finalize has `prose_status: rendered` and populated `deferred_validation_trace` → after-state record read.
9. INDEX.md post-finalize reflects prose_status flip → INDEX read.
10. FOUNDATIONS Rule 6 alignment → manual review: SE event captures `action: "prose_finalized"` and references the PG record, providing immutable audit trail.

## What to Change

### 1. Create `.claude/skills/branching-story-page-prose-finalize/SKILL.md`

Skill frontmatter follows the page-cycle pattern:

```yaml
---
name: branching-story-page-prose-finalize
description: "Use when finalizing rendered prose for a page in an existing branching story bundle — given an existing pages-prose-plans/PG-NNNN.md plan and a user-supplied pages-prose/PG-NNNN.md rendered prose file, runs the deferred prose-coupled validators, extracts ARC_TRACE if the page has a selected arc, updates the PG record's prose_status to rendered, and emits the audit-trail SE event. Produces: PG-NNNN.yaml field updates (prose_path, prose_status, deferred_validation_trace, arc_trace_emitted, arc_trace_id) + SE-NNNN.yaml (action: prose_finalized) + optional ARCTRACE-NNNN.yaml + INDEX.md edit. Mutates: only worlds/<world-slug>/stories/<story-slug>/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any worlds/<world-slug>/_source/<world-subdir>/*.yaml record); world-canon mutation routes through story-fact-promotion-to-canon (HARD-GATE preserved)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world. Pre-flight aborts if missing."
    required: true
  - name: story_slug
    description: "Directory slug of an existing story bundle. Pre-flight aborts if missing."
    required: true
  - name: page_id
    description: "PG-NNNN belonging to this story. Pre-flight aborts if missing or if PG.prose_status != pending."
    required: true
  - name: execution_mode
    description: "One of: authoring (default) | interactive_runtime | batch_generation. Same per-mode HARD-GATE-visibility semantics as branching-story-page-cycle."
    required: false
  - name: accept_plan_drift
    description: "Boolean flag (default false). When true, pre-flight skips the canon-drift check between plan's canon_revision_at_plan_time and PG.state_hash. Used when canon was deliberately updated between plan-commit and prose-render."
    required: false
---
```

The body of SKILL.md follows the page-cycle template:
- HARD-GATE block (writes to `_source/<class>/*.yaml` records and `INDEX.md`; pre-flight readiness; per-execution-mode visibility for Phase 6).
- Process Flow ASCII diagram (the 7 phases per the design doc Tier C.1).
- Inputs / Output sections.
- Per-phase Procedure sections that load the corresponding `references/phase-N-*.md` files.
- Hard Rules / Final Rule.

### 2. Create `.claude/skills/branching-story-page-prose-finalize/references/`

Eight reference files:
- `pre-flight-and-prerequisites.md` — argument validation; PG record read; prose file existence check; plan file existence check; ARCTRACE-NNNN and SE-NNNN pre-allocation; FOUNDATIONS load.
- `phase-1-plan-prose-pairing.md` — read plan frontmatter; compare `state_hash_at_plan_time` to `PG.state_hash`; canon-drift detection; `accept_plan_drift` override semantics.
- `phase-2-deterministic-pre-critic.md` — engine-vocabulary leakage regex over rendered prose (Rule 9 token list); forbidden-mystery resolution scan against `forbidden_resolutions[]`; REQUIRED TURN heuristic check (keyword presence). FAIL routes return citations to user; no re-prompt loop (user revises externally and re-runs).
- `phase-3-prose-critic.md` — 8-axis LLM critic (filter_word_saturation, recurring_metaphor_across_pages, identical_anchor_recurrence, self_narrating_self, bracket_paraphrasing_dialogue, ledger_jargon_leakage, abstract_noun_saturation, padding_or_truncation). Inputs: rendered prose, prose-craft-contract verbatim, prior 1-2 pages along branch_path for cross-page tic detection. Verdict shape (PASS / SOFT_FAIL / HARD_FAIL with cited instances) per the existing prose-craft-contract structure. HARD_FAIL halts; SOFT_FAIL surfaces but allows ACCEPT_AS_IS at Phase 6.
- `phase-4-arc-trace-extraction.md` — Layer 2 (LLM trace extraction) and Layer 3 (semantic conformance critic). Skipped when `PG.selected_arc_id == null` (bootstrap PG-0001 case). Per-mode budget: same as today's Phase 7.6 (`authoring`: full Layer 2 + 3; `interactive_runtime`: Layer 2 only; `batch_generation`: configured checkpoints). Emits ARCTRACE-NNNN payload to working buffer.
- `phase-5-deferred-gate-resolution.md` — three gates: `prose_ledger_consistency` (deterministic comparison of prose claims to PG.state_snapshot — same logic as health-audit's Rule 1+7 boundary check), `arc_trace_evidence_alignment` (validates the just-emitted ARCTRACE's evidence_spans align with prose), `prose_critic_8_axis` (verdict from Phase 3). Each records PASS/FAIL + rationale into the PG record's `deferred_validation_trace` field.
- `phase-6-hard-gate-approval.md` — per-execution-mode visibility (same shape as page-cycle Phase 10). Deliverable summary: PG-NNNN finalized + Phase 3 critic verdict + Phase 5 gate verdicts + ARC_TRACE summary + target field updates + new records list. ACCEPT / REVISE-prose (user revises externally; re-run skill) / REJECT.
- `phase-7-engine-submit.md` — patch envelope assembly:
  - `update_record_field` on PG record's `prose_path` (set to `pages-prose/PG-NNNN.md`)
  - `update_record_field` on PG.prose_status (set to `"rendered"`)
  - `update_record_field` on PG.deferred_validation_trace.* (set each gate's verdict)
  - `update_record_field` on PG.arc_trace_emitted (set to `true` if Phase 4 ran)
  - `update_record_field` on PG.arc_trace_id (set to `"ARCTRACE-NNNN"` if Phase 4 ran)
  - `create_se_record` for SE-NNNN (action: `"prose_finalized"`, actor: `"system"`, source.parent_page_id: PG.parent_page_id, target: PG.id, ops: [], notes: "Prose finalized; deferred validators resolved; ARCTRACE emitted: <bool>.")
  - `create_arc_trace_record` for ARCTRACE-NNNN (when Phase 4 ran)

  Submit via `mcp__worldloom__submit_patch_plan` (or CLI submit-patch-plan.js for envelopes >50KB; envelope is small for finalize, MCP path likely fits). After successful submit, edit `worlds/<world-slug>/stories/<story-slug>/INDEX.md` to flip the page row's prose_status.

  `pages-prose/PG-NNNN.md` is NOT written by this skill — the user already placed it before invoking finalize.

### 3. Create `.claude/skills/branching-story-page-prose-finalize/templates/` (if needed)

Likely no templates directory needed — the skill consumes the canonical `prose-craft-contract.md` and the plan template directly. If the Phase 3 critic prompt or Phase 4 ARCTRACE-extraction prompt benefits from a template, add it under `templates/` at implementation time.

## Files to Touch

- `.claude/skills/branching-story-page-prose-finalize/SKILL.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/pre-flight-and-prerequisites.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/phase-1-plan-prose-pairing.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/phase-2-deterministic-pre-critic.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/phase-3-prose-critic.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/phase-5-deferred-gate-resolution.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/phase-6-hard-gate-approval.md` (new)
- `.claude/skills/branching-story-page-prose-finalize/references/phase-7-engine-submit.md` (new)
- (optional) `.claude/skills/branching-story-page-prose-finalize/templates/` — only if implementation reveals a template need.

## Out of Scope

- Removing prose render from bootstrap and page-cycle. Covered in PROSESPLIT-006 and PROSESPLIT-007.
- Updating sibling skills' prose_status awareness. Covered in PROSESPLIT-008.
- Documentation cascade (CLAUDE.md, WORKFLOWS.md, FOUNDATIONS.md, hooks/README.md). Covered in PROSESPLIT-009.
- Backporting the finalize semantics to existing pre-rework bundles whose PG records lack the new schema fields. Operational migration, not a skill change.
- Adding a "re-finalize" mode that supersedes a previously-rendered page's prose. The PG.prose_status enum supports `superseded` for future use, but this skill's initial scope is the pending → rendered transition. Re-finalize can be a follow-up ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `test -f .claude/skills/branching-story-page-prose-finalize/SKILL.md` succeeds.
2. `rg -n "<HARD-GATE>" .claude/skills/branching-story-page-prose-finalize/SKILL.md` matches.
3. `rg -nc "^# Phase " .claude/skills/branching-story-page-prose-finalize/references/phase-*.md` shows 7 phase reference files (one per phase).
4. Skill dry-run on a fixture story bundle:
   - Place a rendered prose file at `worlds/test/stories/alpha/pages-prose/PG-0001.md` (where the bundle was created with `prose_status: pending`).
   - Invoke `branching-story-page-prose-finalize` with `world_slug=test`, `story_slug=alpha`, `page_id=PG-0001`, `execution_mode=authoring`.
   - Expect HARD-GATE summary, ACCEPT path produces PG record `prose_status: rendered`, SE record with `action: prose_finalized`.
5. Skill dry-run with engine-vocabulary leakage: place prose containing "OBL-0001" → Phase 2 abort with cited offense.
6. Skill dry-run with forbidden mystery resolution: place prose that resolves a `forbidden_resolutions[]` entry → Phase 2 abort with cited offense.

### Invariants

1. The skill never writes `pages-prose/PG-NNNN.md` — the user supplies it.
2. The skill emits `update_record_field` ops, not new PG records — PG identity preserved in branch_path references.
3. Phase 4 (ARCTRACE extraction) is skipped iff `PG.selected_arc_id == null` (bootstrap PG-0001 root case).
4. Phase 4.5 canon-promotion handoff (per the page-cycle skill) is NOT triggered by finalize. Finalize does not promote story facts to world canon.
5. Hook 3 enforces engine routing: `update_record_field`, `create_se_record`, `create_arc_trace_record` are the only mutation paths; direct edits to `_source/<class>/*.yaml` are blocked.
6. INDEX.md edit is the LAST step of Phase 7 (partial-failure recovery: a partial finalize never appears in the index until the engine submit succeeds).

## Test Plan

### New/Modified Tests

1. Skill dry-run fixtures under `tools/validators/tests/integration/` or equivalent — exercise the happy path, the engine-vocabulary leakage abort, the forbidden-mystery abort, and the canon-drift `accept_plan_drift` flow.
2. No new structural validators are introduced by this skill (Phase 5 deferred gate resolution updates an existing PG field; the validators that READ `prose_status` are PROSESPLIT-004 territory).

### Commands

1. `test -f .claude/skills/branching-story-page-prose-finalize/SKILL.md`
2. `rg -nc "^# Phase " .claude/skills/branching-story-page-prose-finalize/references/`
3. `rg -n "update_record_field|create_se_record|create_arc_trace_record" .claude/skills/branching-story-page-prose-finalize/references/phase-7-engine-submit.md`
4. Skill dry-run invocation against a test fixture bundle (exact command verified at implementation time).
