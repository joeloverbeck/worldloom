# SPEC20SCECOM-004: Phase 7.6 (NEW) — ARC_TRACE Extraction + Three-Layer Validation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — NEW reference file `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md`; ARC_TRACE record class consumed (record class itself defined in archived SPEC-19 §C); `arc_envelope_conformance` Phase 9 gate clarification documented at end of file.
**Deps**: SPEC20SCECOM-003 (Phase 7 produces the prose that Phase 7.6 traces); `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (SPEC-22 §Track 1 implements the `create_arc_trace_record` patch-engine op; §Track 2 implements `arc_trace_evidence_alignment` validator; §Track 3 implements `narrative_point` enum in canonical-vocabularies)

## Problem

The scene-commitment-arc pivot introduces ARC_TRACE — a derived per-page validation/debugging artifact that records what beats were realized, what envelope items the prose touched, what stop condition fired, and how the chosen variant's required_effects manifest in the prose. ARC_TRACE is non-authoritative for replay (replay is governed by `state_snapshot.applied_effect_variant` per SPEC20SCECOM-001); it exists for debugging arc-level pathologies and for the Phase 7.6 three-layer validation that protects render quality. SPEC-20 §E specifies the new Phase 7.6 (between Phase 7 and Phase 8) with three layers: deterministic structural (engine-only), post-render trace extraction (LLM critic), and semantic conformance critic (LLM critic). This ticket creates the reference file and documents the per-execution-mode budget that bounds Layer 3's token cost.

## Assumption Reassessment (2026-05-07)

1. Verified the target path `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` does NOT yet exist (this ticket creates it); parent directory `.claude/skills/branching-story-page-cycle/references/` confirmed present and writable.
2. Verified archived SPEC-19 §C (`archive/specs/SPEC-19-scene-commitment-arc-schema.md`) defines the ARC_TRACE record class with all required blocks: `id`, `story_id`, `created_at_page`, `arc_realized`, `effect_variant_applied`, `realized_beats[]`, `observed_actions[]`, `observed_claims[]`, `possible_violations[]`, `stop_condition_hit`, `effect_evidence[]`, `semantic_critic_verdict`, `notes`. SPEC-22 §Track 1 owns the `create_arc_trace_record` patch-engine op; SPEC-22 §Track 2 owns the `arc_trace_evidence_alignment` validator.
3. Cross-skill boundary: this ticket consumes (a) the rendered prose from SPEC20SCECOM-003 (Phase 7); (b) the chosen variant from SPEC20SCECOM-001 (Phase 4b); (c) the arc record's `beat_plan`, `execution_envelope`, `stop_policy` blocks. It produces an ARC_TRACE record consumed by Phase 8 (SPEC20SCECOM-005) for narrative-point classification AND by SPEC-22's `arc_trace_evidence_alignment` validator at Phase 9.
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately) — renumbered from template item 4: Layer 1's deterministic check that all `forbidden_resolutions[]` M ids are absent from any extracted claim's `canon_status: forbidden_risk` is the load-bearing Mystery-Reserve firewall at the page-cycle runtime. Documented as a HARD-FAIL surface — re-prompt budget exhaustion escalates to user with the constraint failures inlined.
5. HARD-GATE / Mystery Reserve firewall semantics — renumbered from template item 5: Phase 7.6 does NOT modify Phase 4.5's canon-promotion HARD-GATE handoff to `story-fact-promotion-to-canon` (preserved as never-elided in every execution_mode). Layer 3's `reject_arc` verdict triggers a Phase 4 re-run with the current arc excluded — this is a structural recovery, not a Mystery Reserve firewall weakening.
6. Schema extension (renumbered from template item 6): consumes ARC_TRACE record class (defined in archived SPEC-19 §C; landed via SPEC19SCECOM-002 in `record-schemas.md` prose anchor); does not extend the schema itself. Additive consumer-side documentation.

## Architecture Check

1. Three layers in this order (deterministic → trace extraction → semantic conformance) is structurally cleaner than a single LLM critic call because (a) Layer 1's deterministic checks fail-fast cheap pathologies (markdown headers, beat-count violations, forbidden-M risk) without burning critic-LLM tokens; (b) Layer 2's structured trace extraction produces an independently-validatable artifact (the ARC_TRACE record) that Layer 3 consumes; (c) Layer 3's semantic critic operates on the structured trace + arc record, not on raw prose, which makes the verdict more reproducible.
2. Per-execution-mode budget for Layer 3 (authoring: always run; interactive_runtime: only on Layer 1/2 surface; batch_generation: skip by default) is the right cost-discipline shape because authoring sessions tolerate higher critic cost in exchange for catch rate, while interactive_runtime sessions need amortized cost without abandoning the firewall.
3. ARC_TRACE non-authoritative for replay — deletion or omission does not break replay-equality. Under low-budget interactive_runtime configurations, the trace may be omitted (`arc_trace_emitted: false`); debugging an arc-level pathology then requires re-running the page in `authoring` mode. This trade-off is intentional and documented.
4. No backwards-compatibility aliasing/shims: NEW phase + NEW record class; no v1 surface to preserve.

## Verification Layers

1. NEW reference file exists at the documented path → codebase grep-proof.
2. Layer 1 deterministic checks (5 sub-checks: markdown-header absence, beat-count fidelity, forbidden_resolutions M-id absence, branch-scope legality, effect-variant legality) → codebase grep-proof in the new reference file for each sub-check.
3. Layer 2 trace extraction produces a valid ARC_TRACE record → schema validation via SPEC-22's `arc_trace_evidence_alignment` validator (cross-spec).
4. Layer 3 semantic conformance critic verdict (one of: pass / revise_prose / reject_arc / promote_interrupt) → codebase grep-proof in the new reference file for the four-value verdict enum.
5. Per-execution-mode budget for Layer 3 → codebase grep-proof for the per-mode budget table.
6. `arc_envelope_conformance` Phase 9 gate clarification → codebase grep-proof for the gate's check description (envelope-conformance against ARC_TRACE `possible_violations[]` evidence).

## What to Change

### 1. NEW file: `phase-7-6-arc-trace-extraction.md`

Create `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` with the following structure:

- **Phase placement**: between Phase 7 (render) and Phase 8 (choice-surface gate).
- **Layer 1 — Deterministic Structural Validation** (engine-only, no LLM):
  - Markdown-header absence in prose.
  - Beat-count fidelity: `realized_beats[].count` ∈ `[arc.beat_plan.min_beats, arc.beat_plan.max_beats]`. The engine-side `safety_valves.max_words` is enforced as an absolute runaway-cutoff only — exceeding it is HARD-FAIL (re-prompt with runaway-defense surfacing); coming in under any word count is NOT a fail at this layer per Prose Craft Contract Rule 11.
  - All `forbidden_resolutions[]` M ids absent from any extracted claim's `canon_status: forbidden_risk`.
  - Branch-scope legality (no sibling-branch references).
  - Effect-variant legality (chosen variant exists in arc's `effect_model.variants[]`).
- **Layer 2 — Post-Render Trace Extraction** (LLM critic call): produces ARC_TRACE record per archived SPEC-19 §C; structurally validated by SPEC-22's `arc_trace_evidence_alignment` validator.
- **Layer 3 — Semantic Conformance Critic** (LLM critic call; per-execution-mode budget): verdict ∈ `{pass, revise_prose, reject_arc, promote_interrupt}`; per-mode budget:
  - `authoring`: always run; max 2 critic calls per arc render (1 initial + 1 after revise).
  - `interactive_runtime`: run only if Layer 1 or Layer 2 surfaced a possible violation; max 1 critic call.
  - `batch_generation`: skip by default; sample at configured checkpoints.
- **ARC_TRACE persistence**: created via `create_arc_trace_record` op (SPEC-22); under low-budget interactive_runtime, may be omitted with `arc_trace_emitted: false`.
- **Phase 9 gate `arc_envelope_conformance`** (deterministic; consumes the ARC_TRACE produced above): for pages whose ARC_TRACE was emitted, validates that no `possible_violations[]` entry of `severity: high` slipped past Layers 1-3 unaddressed; that every `possible_violations[].envelope_item` references a real entry in `arc.execution_envelope.{invariants, required_functions, prohibited_actions}`; and that the trace's `effect_evidence[]` realized-status is consistent with the chosen variant's `required_effects[]`. Validator implementation owned by SPEC-22 §Track 2 (currently lists 7 validators; this gate is an 8th — see SPEC-22 §Risks cross-spec note). Pages with `arc_trace_emitted: false` auto-PASS this gate with rationale `"ARC_TRACE not emitted under low-budget interactive_runtime configuration"`.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` (new)

## Out of Scope

- ARC_TRACE record class schema text (already landed via SPEC19SCECOM-002 in `record-schemas.md`).
- `create_arc_trace_record` patch-engine op (SPEC-22 §Track 1).
- `arc_trace_evidence_alignment` validator implementation (SPEC-22 §Track 2).
- `narrative_point` enum implementation in canonical-vocabularies (SPEC-22 §Track 3).
- ARC_TRACE record-id allocation pre-flight discipline (SPEC20SCECOM-008).
- Phase 11 envelope op-enumeration extension to include `create_arc_trace_record` (SPEC20SCECOM-008).
- Phase 9 gate count update from 12 → 17 (SPEC20SCECOM-009).
- SKILL.md Process Flow diagram update to include Phase 7.6 (SPEC20SCECOM-009).

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `branching-story-page-cycle` advances one tick on a v2 fixture story; Phase 7 produces prose; Phase 7.6 Layer 1 passes (no markdown headers, beat-count in range, no forbidden-M risk); Layer 2 produces a valid ARC_TRACE record; Layer 3 verdict is `pass`.
2. Layer 1 fail-fast: a fixture render with a markdown header `## Beat 1` triggers re-prompt; budget is consumed; after 3 re-prompts the user is escalated.
3. Per-mode budget: `interactive_runtime` mode with no Layer 1/2 violation skips Layer 3 (cost-discipline); `authoring` mode always runs Layer 3.

### Invariants

1. ARC_TRACE record's `created_at_page` matches the page being rendered (branch-isolation invariant per `archive/tickets/SPEC20SCECOM-002.md`).
2. Layer 3 verdict is one of `{pass, revise_prose, reject_arc, promote_interrupt}` — no other values legal.
3. `arc_envelope_conformance` gate auto-PASSes when `arc_trace_emitted: false`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket creating a NEW reference file; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Full-pipeline empirical verification owned by SPEC20SCECOM-011 capstone.

### Commands

1. `test -f .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` — confirms NEW file exists.
2. `grep -nE "Layer 1|Layer 2|Layer 3" .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` — confirms three-layer structure documented.
3. `grep -nE "authoring|interactive_runtime|batch_generation" .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` — confirms per-execution-mode budget documented.
4. `grep -n "arc_envelope_conformance" .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` — confirms Phase 9 gate clarification lands.
5. `grep -nE "pass|revise_prose|reject_arc|promote_interrupt" .claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` — confirms Layer 3 verdict enum lands.
