# STPOOL-001: Implement audit mode in storylet-pool-authoring (consume RSP cards from branching-story-health-audit)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/storylet-pool-authoring/SKILL.md` (replace audit-mode "deferred until branching-story-health-audit ships" with full audit-mode implementation: parse `source_audit_path`, drive Phase 1 diagnosis from RSP card targeting fields, drive Phase 2 seed generation from RSP `sketch` block, propagate `provenance.origin: audit_remediation` and `visibility` per RSP `proposed_visibility.scope`); update producer-side `branching-story-health-audit` prose/template/example references that still describe STPOOL-001 as pending
**Deps**: branching-story-health-audit shipping (already landed in this batch — produces RSP cards consumable as `source_audit_path`); `archive/tickets/MCPENH-016-add-rsp-id-class-to-allocator-sub-audit-scoped.md` completed RSP allocator support, so audit-produced RSP ids now come from `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)`

## Problem

At intake, `storylet-pool-authoring` declared four modes: `seed`, `focus`, `jit`, and `audit`. The first three were implemented in the prose workflow, while `audit` mode was documented but still aborted at Pre-flight with STPOOL-001/deferred-wiring language. The audit skill was already shipping in the May 2026 batch, so the abort was factually stale and the audit-mode consumer contract needed to be wired.

The audit skill produces `RSP-NNNN-<slug>.md` cards under `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/`. Each card's frontmatter mirrors `storylet-pool-authoring`'s `source_audit_path` parse-time consumer schema byte-for-byte (per `branching-story-health-audit/templates/remediation-storylet-proposal-card.md` frontmatter comment naming the parity intent). Wiring audit mode to consume one or more RSP cards as `source_audit_path` lets the audit skill's diagnosis flow into structured-content generation that closes the gaps the audit identified.

This ticket also corrected the storylet-pool-authoring prose and the same-seam producer-side handoff prose that still described STPOOL-001 as pending.

## Assumption Reassessment (2026-05-03)

1. At intake, `.claude/skills/storylet-pool-authoring/SKILL.md` enumerated audit-mode references at lines 3, 13, 28, 49, 59, 172, 177, 230, 570, 573 (per the reverse-seam-scan output of skill-creator's compile run for branching-story-health-audit). The landed edit updated those former pending/deferred surfaces to active RSP-consumer wording.
2. At intake, the storylet-pool-authoring skill's audit-mode design was partly sketched in existing prose (visibility scope inheritance from RSP target/visibility fields and `provenance.origin: audit_remediation`) but the actual Pre-flight + Phase 1 + Phase 2 wiring was absent. The landed edit makes those branches explicit.
3. RSP card schema (per `branching-story-health-audit/templates/remediation-storylet-proposal-card.md`): frontmatter carries `rsp_id`, `audit_id`, `story_id`, `finding_ids`, `target_obligation` / `target_thread` / `target_consequence` / `target_relationship` (at least one non-null), `proposed_shape`, `proposed_intensity`, `target_branch`, `proposed_visibility` (`scope` + `visible_branch_path_prefix`), `sketch` (`hard_preconds`, `fact_effects`, `pays_off_obligations`, `opens_obligations`, `addresses_consequences`, `choice_templates`), `rationale`. Each field has a documented role in audit-mode generation.
4. Cross-skill / cross-artifact boundary: the consumer (storylet-pool-authoring) parses card frontmatter at Phase 1 of audit mode. The audit skill's templates/remediation-storylet-proposal-card.md is the canonical source of truth for the schema — any schema evolution must update both files in lockstep.
5. FOUNDATIONS Rule 6 spirit: storylet-pool-authoring's audit-mode emissions carry `provenance.origin: audit_remediation` AND `provenance.source_audit: SAU-NNNN` AND `provenance.source_rsp: RSP-NNNN` so the audit-derived storylets are traceable back to their source finding via the audit's report. The provenance trail is the storylet-pool's local realization of audit-as-honest-epistemic-artifact.
6. HARD-GATE check: this ticket removes the audit-mode Pre-flight abort but preserves the direct-invocation user-facing HARD-GATE. Audit mode still cannot write SLT/SLB/INDEX output until Pre-flight validates RSP inputs, Phase 4 per-storylet gates pass, Phase 5 audit-mode branch-contamination/RSP-visibility checks pass, and the user explicitly approves the Phase 6 batch manifest deliverable.
7. Reassessment correction: this repo has no executable runner for invoking prose skills or fixture-backed `storylet-pool-authoring` tests. The truthful proof surface is skill/manual contract review plus grep/schema-template checks over `.claude/skills/storylet-pool-authoring/` and the same-seam producer references in `.claude/skills/branching-story-health-audit/`.
8. Same-seam producer sweep found STPOOL-specific pending wording in `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md`, and `.claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md`; those are producer-consumer handoff surfaces and are included in this ticket's prose truthing.

## Architecture Check

1. The wiring is mechanically straightforward: Pre-flight reads `source_audit_path`, validates the file exists, parses frontmatter, validates schema. Phase 1 diagnosis matrix is REPLACED (not augmented) by the RSP card's targeting fields (the gap is what the RSP says it is; no need to re-diagnose). Phase 2 seed generation uses the RSP's `sketch.hard_preconds` / `fact_effects` / `choice_templates` as the LLM prompt's seed brief. Phase 3 onward proceeds as in seed/focus modes with the addition of provenance/visibility propagation.
2. Multi-card consumption: `source_audit_path` accepts either one RSP card path or the containing `audits/SAU-NNNN/remediation-storylet-proposals/` directory. Directory input consumes every `RSP-*.md` card in deterministic path order. Each card produces at least one storylet seed; if `target_pool_size` is larger than the card count, extra seeds are distributed across cards without merging multiple RSPs into one storylet.
3. Visibility scope inheritance is driven by `RSP.proposed_visibility`: `global_author_pool` remains author-pool; `branch_prefix_scoped` requires the RSP `visible_branch_path_prefix`; `branch_scoped` requires the same prefix plus a leaf page used for `provenance.created_at_page`.

## Verification Layers

1. **Pre-flight allows mode=audit when source_audit_path resolves to a valid RSP card or remediation-storylet-proposals directory** → manual contract review of `.claude/skills/storylet-pool-authoring/SKILL.md` confirms the abort is replaced by validation and binding.
2. **Pre-flight rejects mode=audit when source_audit_path points to a non-RSP file or missing file** → manual contract review confirms specific fail-closed diagnostics remain.
3. **Phase 1 diagnosis derives gap targets from the RSP card's targeting fields** → skill prose maps target_obligation / target_thread / target_consequence / target_relationship to diagnosis rows.
4. **Phase 2 seed generation incorporates the RSP card's sketch block** → skill prose maps sketch.hard_preconds / fact_effects / choice_templates and rationale into seed briefs.
5. **Phase 3 visibility scope inherits from RSP's proposed_visibility** → skill prose requires SLT visibility to match RSP `proposed_visibility.scope`.
6. **Phase 3 provenance carries audit-trail fields** → skill prose requires `provenance.origin: audit_remediation`, `provenance.source_audit: SAU-NNNN`, `provenance.source_rsp: RSP-NNNN`.
7. **Phase 4 mystery firewall STILL hard-rejects forbidden-M resolution even from audit-mode seeds** → manual review confirms the existing Phase 4 gates remain unchanged and apply to audit-mode candidates.
8. **Storylet-pool-authoring and producer-side prose corrections land** → stale-anchor grep over both skill directories finds no remaining pending/deferred STPOOL wording in live consumer/producer handoff surfaces.

## Landed Changes

### 1. Replaced audit-mode abort with RSP validation

`.claude/skills/storylet-pool-authoring/SKILL.md` Pre-flight now allows `mode=audit` when `source_audit_path` resolves to either one RSP card or a containing `audits/SAU-NNNN/remediation-storylet-proposals/` directory. It validates the path, parses frontmatter, checks required RSP fields against the producer template schema, and binds validated cards into `audit_cards[]`.

Directory input consumes every `RSP-*.md` card in deterministic path order. Missing, malformed, out-of-bundle, non-RSP, or empty directory inputs abort before `SLB` / `SLT` allocation.

### 2. Added Phase 1 audit-mode diagnosis

Phase 1 now treats validated RSP frontmatter as the primary diagnosis:

```
For mode=audit: the RSP card's frontmatter IS the diagnosis. Emit one or more
diagnosis-matrix rows directly from the card:

- target_record_id: <RSP.target_obligation | RSP.target_thread | RSP.target_consequence | RSP.target_relationship>
- gap_kind: <derived from which target field is non-null: obl_payoff_coverage | thr_coverage | cnsq_coverage | srel_continuity>
- priority_weight: max
- source_rsp: <RSP.rsp_id>
- source_audit: <RSP.audit_id>

When multiple RSP cards are consumed, emit one matrix row per card.
```

### 3. Added Phase 2 audit-mode seed generation

Phase 2 now generates audit-mode seeds from each RSP card:

```
For mode=audit: each RSP card produces seeds whose:
- shape: RSP.proposed_shape
- tone register: derived from RSP.rationale + STORY_KERNEL.tone_constraints
- content_intensity band: RSP.proposed_intensity
- state preconditions: RSP.sketch.hard_preconds (LLM elaborates)
- core dramatic transaction: RSP.rationale + RSP.sketch.fact_effects synthesis

target_pool_size in audit mode defaults to one seed per RSP card; user may
override to produce multiple seeds per card if the gap is wide. The six
diversity-axis checks are bypassed for audit mode because remediation batches
are target-shaped by RSP cards, but Phase 5 still runs the batch-level
branch-contamination audit and the RSP visibility-match check.
```

### 4. Implemented Phase 3 visibility and provenance propagation

Phase 3 now treats `RSP.proposed_visibility` as the structural visibility authority and records audit provenance:

Add provenance fields:

```
For mode=audit: SLT records carry:
- provenance.origin: audit_remediation
- provenance.source_audit: <RSP.audit_id>
- provenance.source_rsp: <RSP.rsp_id>
- provenance.created_at_page: null (author-pool unless visibility.scope is branch_scoped, in which case the RSP's target_branch must include a leaf PG-NNNN)
```

### 5. Updated all pending-audit wording

Updated the former storylet-pool-authoring pending sites in the description, argument metadata, purpose paragraph, process flow, Inputs, World-State Prerequisites, Pre-flight, Guardrails, and Sibling interop. `branching-story-health-audit` is now listed under `Consumes (existing)` for audit-mode RSP card input, and the STPOOL-specific known-debt entry was removed from `storylet-pool-authoring`.

### 6. Truthed producer-side pending STPOOL references

Updated `branching-story-health-audit` skill/template/example wording that still described `storylet-pool-authoring mode=audit` as post-STPOOL or abort-until-shipping. Those producer surfaces now say that RSP cards are directly consumable by the wired audit mode.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — replace audit-mode deferred-prose with implementation across ~10 sites)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — truth same-seam producer/consumer interop references)
- `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` (modify — truth frontmatter parity comment)
- `.claude/skills/branching-story-health-audit/examples/sau-mixed-severity.md` (modify — truth routing example)
- `archive/tickets/STPOOL-001-implement-storylet-pool-authoring-audit-mode.md` (modify — closeout, proof truthing, and archival)

## Out of Scope

- Page-cycle audit-flag wiring — separate ticket BSPAG-002.
- SAU allocator support — completed in `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md`; RSP allocator support — completed in `archive/tickets/MCPENH-016-add-rsp-id-class-to-allocator-sub-audit-scoped.md`; audit task-type ranking — completed in `archive/tickets/MCPENH-017-register-branching-story-health-audit-task-type.md`.
- Tuning audit-mode diversity-audit threshold relaxation beyond the landed choice. This ticket chose to bypass the six diversity axes for audit mode while preserving batch-level branch-contamination and RSP visibility-match checks.
- Multi-card-batched RSP consumption optimization (e.g., one storylet that addresses multiple findings simultaneously) — defer to later iteration after single-card consumption proves out.

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review: `.claude/skills/storylet-pool-authoring/SKILL.md` Pre-flight documents `mode=audit` validation for one RSP card path and for a remediation-storylet-proposals directory, rather than aborting.
2. Manual contract review: `.claude/skills/storylet-pool-authoring/SKILL.md` Phase 1/2/3/5 prose maps RSP target fields, sketch fields, provenance, visibility, and audit-mode Phase 5 checks.
3. `rg -n 'deferred until branching-story-health-audit ships|audit mode is deferred|audit mode aborts at Pre-flight|Pre-flight currently aborts on mode=audit|until STPOOL-001 wires|post-STPOOL-001|abort-until-shipping|Once landed' .claude/skills/storylet-pool-authoring .claude/skills/branching-story-health-audit` returns no live stale handoff hits.
4. Manual review confirms generated SLT records are required to carry `provenance.origin: audit_remediation` + `provenance.source_audit: SAU-NNNN` + `provenance.source_rsp: RSP-NNNN`.
5. Manual review confirms generated SLT records' `visibility.scope` must match the source RSP's `proposed_visibility.scope`.

### Invariants

1. Audit-mode SLT records are traceable to their source RSP via the provenance chain.
2. Phase 4 mystery firewall remains the structural backstop — even an audit-derived seed cannot resolve a forbidden M.
3. Audit mode does NOT bypass the user-facing HARD-GATE — the Phase 6 batch manifest deliverable summary still requires explicit user approval.

## Test Plan

### New/Modified Tests

1. None — prose-skill contract change; this repo has no executable storylet-pool-authoring runner or fixture harness.

### Commands

1. `rg -n 'deferred until branching-story-health-audit ships|audit mode is deferred|audit mode aborts at Pre-flight|Pre-flight currently aborts on mode=audit|until STPOOL-001 wires|post-STPOOL-001|abort-until-shipping|Once landed' .claude/skills/storylet-pool-authoring .claude/skills/branching-story-health-audit`
2. `rg -n 'mode=audit|source_audit_path|audit_remediation|proposed_visibility|target_obligation|target_thread|target_consequence|target_relationship|sketch' .claude/skills/storylet-pool-authoring/SKILL.md`
3. Manual review of `.claude/skills/storylet-pool-authoring/SKILL.md` and `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` for RSP schema parity and HARD-GATE preservation.

## Outcome

Completed: 2026-05-03.

Completed. `storylet-pool-authoring` audit mode is now documented as an active RSP consumer. Pre-flight validates RSP file or directory input, Phase 1 derives diagnosis rows from RSP target fields, Phase 2 seeds from RSP sketches and rationale, Phase 3 propagates `audit_remediation` provenance plus RSP visibility, and Phase 5 runs audit-mode branch-contamination / RSP visibility-match checks while bypassing the six diversity axes. Same-seam producer handoff references in `branching-story-health-audit` were also truthed.

## Verification Result

1. `rg -n 'deferred until branching-story-health-audit ships|audit mode is deferred|audit mode aborts at Pre-flight|Pre-flight currently aborts on mode=audit|until STPOOL-001 wires|post-STPOOL-001|abort-until-shipping|Once landed|currently aborts at Pre-flight|currently aborts on mode=audit' .claude/skills/storylet-pool-authoring .claude/skills/branching-story-health-audit` — passed; no matches.
2. `rg -n 'mode=audit|source_audit_path|audit_remediation|proposed_visibility|target_obligation|target_thread|target_consequence|target_relationship|sketch' .claude/skills/storylet-pool-authoring/SKILL.md` — passed; audit-mode contract anchors are present in arguments, Pre-flight, Phases 1/2/3/5, provenance, and interop prose.
3. Manual review confirmed `.claude/skills/storylet-pool-authoring/SKILL.md` preserves the direct-invocation HARD-GATE and Phase 4 Mystery Reserve firewall while replacing only the audit-mode fail-fast branch with RSP validation and RSP-driven generation.
4. Manual review confirmed `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` remains the RSP schema authority mirrored by storylet-pool-authoring's `source_audit_path` consumer.
5. `git diff --check` — passed.

## Deviations

1. No executable `storylet-pool-authoring` integration test was added or run because this repo has no prose-skill runner or fixture harness for that workflow. The accepted proof is grep/manual contract review over the changed skills and template.
2. The drafted "manual integration" acceptance was narrowed to the truthful current repo boundary. Running either content-generating skill would require a user-facing HARD-GATE and real world content, which is outside this implementation-only ticket.
