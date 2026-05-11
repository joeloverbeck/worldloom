---
name: branching-story-page-prose-finalize
description: "Use when finalizing rendered prose for a page in an existing branching story bundle — given an existing pages-prose-plans/PG-NNNN.md plan and a user-supplied pages-prose/PG-NNNN.md rendered prose file, runs the deferred prose-coupled validators, extracts ARC_TRACE if the page has a selected arc, updates the PG record's prose_status to rendered, and emits the audit-trail SE event. Produces: PG-NNNN.yaml field updates (prose_path, prose_status, deferred_validation_trace, state_snapshot.arc_trace_emitted, state_snapshot.arc_trace_id) + SE-NNNN.yaml (action: prose_finalized) + optional ARCTRACE-NNNN.yaml + INDEX.md edit. Mutates: only worlds/<world-slug>/stories/<story-slug>/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any worlds/<world-slug>/_source/<world-subdir>/*.yaml record); world-canon mutation routes through story-fact-promotion-to-canon (HARD-GATE preserved)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if missing."
    required: true
  - name: story_slug
    description: "Directory slug of an existing story bundle under worlds/<world-slug>/stories/<story-slug>/. Pre-flight aborts if missing."
    required: true
  - name: page_id
    description: "PG-NNNN belonging to this story. Pre-flight aborts if missing or if PG.prose_status != pending."
    required: true
  - name: execution_mode
    description: "One of: authoring (default) | interactive_runtime | batch_generation. Same per-mode HARD-GATE-visibility semantics as branching-story-page-cycle."
    required: false
  - name: accept_plan_drift
    description: "Boolean flag (default false). When true, pre-flight skips the canon-drift check between the plan's canon_revision_at_plan_time and PG.state_snapshot.canon_revision. Used when canon was deliberately updated between plan-commit and prose-render."
    required: false
---

# Branching Story Page Prose Finalize

Runs the convergence step between the plan-authoring path (Claude Code) and the prose-rendering path (manual or external LLM). Reads the comprehensive plan at `pages-prose-plans/PG-NNNN.md`, reads the user-supplied rendered prose at `pages-prose/PG-NNNN.md`, runs the deferred prose-coupled validators (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`), extracts ARC_TRACE Layer 2 / 3 when the page has a selected scene-commitment arc, flips the PG record's transitional state fields (`prose_path`, `prose_status`, `deferred_validation_trace.*`, `state_snapshot.arc_trace_emitted`, `state_snapshot.arc_trace_id`), and emits the immutable SE audit event. The skill never writes the prose file itself — the user supplies it.

<HARD-GATE>
Do NOT submit a patch envelope to the engine, do NOT `Edit` the bundle's `INDEX.md`, until:

(a) Pre-flight resolves the bundle; validates that `pages-prose-plans/PG-NNNN.md` exists; validates that `pages-prose/PG-NNNN.md` exists; reads the PG record and validates `prose_status == "pending"`; reads the plan's frontmatter and either confirms `plan.state_hash_at_plan_time == PG.state_hash` and `plan.canon_revision_at_plan_time == PG.state_snapshot.canon_revision` OR `accept_plan_drift == true` (then records the drift in the SE event's `notes`); pre-allocates `SE-NNNN` always and `ARCTRACE-NNNN` when `PG.storylet_realized != null` via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`; resolves `execution_mode`; loads `docs/FOUNDATIONS.md` into working context (Rule 1, Rule 6, Rule 7 — the firewall posture this skill is the finalize-side enforcer of); confirms the content_policy block is loaded for the Phase 3 critic prompt.
(b) Phase 2 (deterministic pre-critic) PASSes — no engine-vocabulary leakage in the rendered prose, no forbidden-mystery resolution detected, REQUIRED TURN heuristic satisfied.
(c) Phase 3 (8-axis prose critic) returns `PASS` or `SOFT_FAIL` (the latter allowed only when the user explicitly elects ACCEPT_AS_IS at Phase 6). `HARD_FAIL` halts.
(d) Phase 4 (ARC_TRACE extraction) — when `PG.storylet_realized != null` — produces a structurally valid ARCTRACE record under the per-execution-mode Layer 3 budget. When `PG.storylet_realized == null` (bootstrap PG-0001 root case), Phase 4 is skipped and no ARCTRACE op enters the envelope.
(e) Phase 5 (deferred gate resolution) records `PASS` or `FAIL` with one-line rationale for each of the three deferred gates (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`).
(f) `execution_mode == authoring` (default): the user has explicitly approved the Phase 6 deliverable summary once per finalize run. `interactive_runtime`: Phase 6 hidden; auto-commits after Phase 5 PASS. `batch_generation`: hidden until a configured checkpoint or any Phase 2/3/4/5 failure.

The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` is NOT triggered by this skill. Finalize does NOT promote story facts to world canon; that route remains exclusive to `story-fact-promotion-to-canon` and runs under its own HARD-GATE.
</HARD-GATE>

## Process Flow

```
Pre-flight     resolve story bundle; verify pages-prose-plans/PG-NNNN.md exists;
               verify pages-prose/PG-NNNN.md exists; read PG record; verify
               prose_status == pending; pre-allocate SE-NNNN always and
               ARCTRACE-NNNN when PG.storylet_realized != null; resolve
               execution_mode; load FOUNDATIONS.md, content_policy
   |
   v
Phase 1        Plan/prose pairing — read plan frontmatter; compare
               state_hash_at_plan_time and canon_revision_at_plan_time against
               PG.state_hash / PG.state_snapshot.canon_revision; on drift,
               either abort (default) or note in SE.notes (accept_plan_drift)
   |
   v
Phase 2        Deterministic pre-critic — engine-vocabulary leakage regex over
               rendered prose (forbidden_engine_vocabulary list verbatim from
               plan frontmatter); forbidden-mystery resolution scan against
               plan.forbidden_resolutions[]; REQUIRED TURN heuristic check
               (cue keywords from plan §18 present). FAIL surfaces cited
               offenses to user; halt — no re-prompt loop (user revises prose
               externally and re-runs the skill).
   |
   v
Phase 3        8-axis prose critic — LLM critic over rendered prose with
               prose-craft-contract verbatim + prior 1-2 pages-prose/PG-*.md
               along branch_path for cross-page tic detection. Verdict shape:
               PASS / SOFT_FAIL / HARD_FAIL with axis-by-axis cited instances.
               HARD_FAIL halts. SOFT_FAIL surfaces and routes to Phase 6
               ACCEPT_AS_IS / REVISE.
   |
   v
Phase 4        ARC_TRACE extraction — Layer 2 (LLM trace extraction) and
               Layer 3 (semantic conformance critic) per per-execution-mode
               budget. Skipped when PG.storylet_realized == null (bootstrap
               PG-0001 root). Emits ARCTRACE-NNNN payload to working buffer.
   |
   v
Phase 5        Deferred gate resolution — three gates:
               prose_ledger_consistency (deterministic prose-claim-vs-state
               comparison), arc_trace_evidence_alignment (validates the
               Phase 4 ARCTRACE's evidence_spans), prose_critic_8_axis
               (verdict from Phase 3). Each records PASS/FAIL with one-line
               rationale into PG.deferred_validation_trace.
   |
   v
Phase 6        HARD-GATE approval — per-execution-mode visibility. Deliverable
               summary: PG finalized + Phase 3 critic verdict + Phase 5 gate
               verdicts + ARC_TRACE summary + target field updates + new
               records list. ACCEPT / ACCEPT_AS_IS (when SOFT_FAIL only) /
               REVISE-prose (user revises externally; re-run) / REJECT.
   |
 accept (or auto-pass per execution_mode)
   |
   v
Phase 7        Engine submit + INDEX.md edit — single patch envelope:
               update_record_field on PG.prose_path, .prose_status,
               .deferred_validation_trace.{three keys},
               .state_snapshot.arc_trace_emitted,
               .state_snapshot.arc_trace_id (the latter two only when
               Phase 4 ran);
               create_se_record for SE-NNNN (action: prose_finalized);
               create_arc_trace_record for ARCTRACE-NNNN (only when
               Phase 4 ran). Submit via mcp__worldloom__submit_patch_plan
               (or CLI submit-patch-plan.js for envelopes >50KB). After
               successful submit, Edit INDEX.md LAST to flip the page row's
               prose_status from pending to rendered. NO git commit.
```

## Inputs

### Required

- `world_slug` — directory slug of an existing world under `worlds/<world-slug>/`.
- `story_slug` — directory slug of an existing story bundle under `worlds/<world-slug>/stories/<story-slug>/`. Pre-flight aborts if missing.
- `page_id` — `PG-NNNN` belonging to this story. Pre-flight aborts if missing OR if `PG.prose_status != "pending"`.

### Optional

- `execution_mode` — `authoring | interactive_runtime | batch_generation`. Per-mode behavior governs Phase 6 HARD-GATE visibility. The Phase 4.5 canon-promotion HARD-GATE handoff to `story-fact-promotion-to-canon` is NOT triggered by this skill in any mode.
- `accept_plan_drift` — boolean (default false). When true, Phase 1 records canon drift in `SE.notes` and proceeds rather than aborting.

### Reads (no writes)

The full reads list (FOUNDATIONS.md; the comprehensive plan at `pages-prose-plans/PG-NNNN.md`; the user-supplied rendered prose at `pages-prose/PG-NNNN.md`; the PG record; the parent page record for branch-path continuity; prior 1-2 prose pages along `branch_path`; the prose-craft-contract; whole-class M and INV firewall loads for the Phase 2 forbidden-mystery scan; the selected arc record when `PG.storylet_realized != null`; content_policy) is in `references/pre-flight-and-prerequisites.md`.

## Output

### Files written (single transaction at Phase 7)

| Class | File path | Created when |
|---|---|---|
| Page (updated) | `_source/pages/PG-NNNN.yaml` (existing record; field updates via `update_record_field`) | Always |
| Story event | `_source/events/SE-NNNN.yaml` (`action: prose_finalized`) | Always |
| ARC_TRACE | `_source/arc-traces/ARCTRACE-NNNN.yaml` | Only when `PG.storylet_realized != null` AND Phase 4 Layer 2 produced a structurally valid trace |

`pages-prose/PG-NNNN.md` is NOT written by this skill — the user (or external LLM renderer) places it on disk before invoking finalize.

`worlds/<world-slug>/stories/<story-slug>/INDEX.md` — direct `Edit` to flip the page row's `prose_status: pending` to `prose_status: rendered`. Done LAST in Phase 7 so partial-failure recovery leaves the index unmutated until engine-submit and prose-already-on-disk are both confirmed.

### No canon-file mutations

This skill never writes `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. The Phase 4.5 `canon_candidate` route lives in `branching-story-page-cycle` and `story-fact-promotion-to-canon`; finalize never promotes facts to world canon.

### ID Conventions — branch-isolation invariant

- `SE-NNNN` (always allocated) — `created_at_page: PG-NNNN` (the page being finalized).
- `ARCTRACE-NNNN` (conditionally allocated) — `created_at_page: PG-NNNN` (same page).

Both are story-bundle-scoped; allocate via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`.

## Procedure

1. **Pre-flight.** Validate args; verify both `pages-prose-plans/PG-NNNN.md` and `pages-prose/PG-NNNN.md` exist; read the PG record via `mcp__worldloom__get_record`; verify `PG.prose_status == "pending"`; pre-allocate `SE-NNNN` and (conditionally) `ARCTRACE-NNNN`; resolve `execution_mode`; load FOUNDATIONS.md and content_policy. Load `references/pre-flight-and-prerequisites.md`.

2. **Phase 1 — Plan/prose pairing.** Read the plan's frontmatter. Compare `plan.state_hash_at_plan_time` to `PG.state_hash` and `plan.canon_revision_at_plan_time` to `PG.state_snapshot.canon_revision`. On match: proceed. On drift with `accept_plan_drift == false`: abort with the cited drift values. On drift with `accept_plan_drift == true`: record the drift in the SE event's `notes` field and proceed. Load `references/phase-1-plan-prose-pairing.md`.

3. **Phase 2 — Deterministic pre-critic.** Run the engine-vocabulary leakage regex over rendered prose (token list verbatim from `plan.forbidden_engine_vocabulary`); run the forbidden-mystery scan against `plan.forbidden_resolutions[]`; run the REQUIRED TURN keyword heuristic against `plan §18`'s REQUIRED TURN cue. Any FAIL halts with citations. Load `references/phase-2-deterministic-pre-critic.md`.

4. **Phase 3 — 8-axis prose critic.** Assemble the LLM critic prompt with `content_policy` verbatim FIRST + `references/prose-craft-contract.md` of `branching-story-page-cycle` verbatim + rendered prose + prior 1-2 `pages-prose/PG-*.md` files along `branch_path` (for cross-page tic detection). Return verdict shape (PASS / SOFT_FAIL / HARD_FAIL with axis-by-axis cited instances). HARD_FAIL halts. Load `references/phase-3-prose-critic.md`.

5. **Phase 4 — ARC_TRACE extraction.** When `PG.storylet_realized == null` (bootstrap PG-0001 root): skip. Otherwise: run Layer 2 (LLM trace extraction) producing the ARCTRACE record body, then Layer 3 (semantic conformance critic) per the per-execution-mode budget. Load `references/phase-4-arc-trace-extraction.md`.

6. **Phase 5 — Deferred gate resolution.** Run the three deferred gates:
   - `prose_ledger_consistency` — deterministic comparison of prose claims to `PG.state_snapshot` (same logic as branching-story-health-audit's Rule 1+7 boundary check).
   - `arc_trace_evidence_alignment` — validates the Phase 4 ARCTRACE's `evidence_spans[]` against the rendered prose (or PASS auto-rationale when `arc_trace_emitted == false`).
   - `prose_critic_8_axis` — records the Phase 3 verdict directly.

   Each gate records `PASS — <rationale>` or `FAIL — <reason>` into `PG.deferred_validation_trace.<gate>`. A bare PASS without rationale is treated as FAIL. Load `references/phase-5-deferred-gate-resolution.md`.

7. **Phase 6 — HARD-GATE approval.** Per `execution_mode`:

   | Mode | Phase 6 visibility |
   |---|---|
   | `authoring` (default) | HARD-GATE shown — user must explicitly approve before Phase 7 |
   | `interactive_runtime` | HARD-GATE hidden; auto-commits to Phase 7 after Phase 5 PASS; user is shown the gate only on Phase 2/3/4/5 failure |
   | `batch_generation` | HARD-GATE hidden until a configured checkpoint or any Phase 2/3/4/5 failure |

   When the gate is shown, present the deliverable summary (see `references/phase-6-hard-gate-approval.md` §Deliverable Summary). User options:

   - **ACCEPT** → proceed to Phase 7.
   - **ACCEPT_AS_IS** → available only when Phase 3 returned `SOFT_FAIL`; proceeds to Phase 7 with the soft-fail axes recorded in `SE.notes`.
   - **REVISE-prose** → no writes; user revises `pages-prose/PG-NNNN.md` externally and re-runs the skill (re-running is idempotent because `prose_status` is still `pending`).
   - **REJECT** → no writes; halt.

8. **Phase 7 — Engine submit + INDEX.md edit.** Assemble a single patch envelope, dry-run validate, sign the approval token, submit. After successful submit, `Edit` `INDEX.md` LAST. Detailed op list, envelope shape, partial-failure recovery, and temp-file lifecycle in `references/phase-7-engine-submit.md`.

## Hard Rules

- **HARD-GATE is per-execution-mode liftable.** The Phase 6 gate is shown in `authoring` (default), hidden in `interactive_runtime` and `batch_generation` after Phase 5 PASS. Any Phase 2/3/4/5 failure surfaces in every mode.
- **Never write `pages-prose/PG-NNNN.md`.** The user (or external LLM renderer) supplies the file. This skill consumes it.
- **Never write world-level canon.** Never `Write` or `Edit` `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. Finalize is a canon-reading skill from the world-canon perspective; it mutates only story-bundle state.
- **Never promote story facts to world canon.** The Phase 4.5 `canon_candidate` route is exclusive to `branching-story-page-cycle` and `story-fact-promotion-to-canon`. Finalize records story-local validation verdicts; it never crosses the story-to-world boundary.
- **PG identity is preserved.** Finalize emits `update_record_field` ops on the existing PG record — NEVER a new PG record citing `supersedes`. PG identity is the page's branch-path identity; superseding would break thousands of `branch_path` references.
- **The SE event is the audit trail.** Every finalize run emits one `SE-NNNN` with `action: prose_finalized`. The SE event provides the immutable Rule 6 audit trail for the `pending → rendered` state transition.
- **`INDEX.md` is the LAST direct write.** Partial-failure recovery: if engine-submit fails, no `_source` YAML lands; no INDEX edit either. If INDEX edit fails after a successful submit, the YAML records are the authoritative state and the operator hand-edits INDEX next.
- **Worktree discipline.** If invoked inside a worktree, all paths resolve from the worktree root. **Do NOT commit to git.**

## Final Rule

A finalize is not a rubber stamp. It is the convergence point where the plan-and-validate path (Claude Code) and the prose-rendering path (manual or external LLM) meet — and it is the only step in the rework that can catch a prose render that drifts from the plan's contract. If finalize cannot find a forbidden-M resolution, an engine-vocabulary leak, a REQUIRED TURN miss, a craft-contract violation, or an arc-envelope conformance failure that the rendered prose introduced, those failures land in the bundle as silent corruption. The skill's discipline is what makes the manual-rendering path safe.
