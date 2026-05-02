# STPOOL-001: Implement audit mode in storylet-pool-authoring (consume RSP cards from branching-story-health-audit)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/storylet-pool-authoring/SKILL.md` (replace audit-mode "deferred until branching-story-health-audit ships" with full audit-mode implementation: parse `source_audit_path`, drive Phase 1 diagnosis from RSP card targeting fields, drive Phase 2 seed generation from RSP `sketch` block, propagate `provenance.origin: audit_remediation` and `visibility` per RSP `proposed_visibility.scope`); update Pre-flight to allow `mode=audit` (currently aborts); extend tests / fixtures
**Deps**: branching-story-health-audit shipping (already landed in this batch — produces RSP cards consumable as `source_audit_path`); `archive/tickets/MCPENH-016-add-rsp-id-class-to-allocator-sub-audit-scoped.md` completed RSP allocator support, so audit-produced RSP ids now come from `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)`

## Problem

`storylet-pool-authoring` declares four modes: `seed`, `focus`, `jit`, and `audit`. The first three are fully implemented. `audit` mode is documented but aborts at Pre-flight with "audit mode requires `branching-story-health-audit`, which is not yet shipping; use `mode=seed` or `mode=focus` until it lands" (per the storylet-pool-authoring skill's Pre-flight Check section + its World-State Prerequisites footnote line 230). The audit skill IS now shipping (May 2026 batch), so the abort is factually incorrect AND the audit-mode functionality should be wired.

The audit skill produces `RSP-NNNN-<slug>.md` cards under `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/`. Each card's frontmatter mirrors `storylet-pool-authoring`'s `source_audit_path` parse-time consumer schema byte-for-byte (per `branching-story-health-audit/templates/remediation-storylet-proposal-card.md` frontmatter comment naming the parity intent). Wiring audit mode to consume one or more RSP cards as `source_audit_path` lets the audit skill's diagnosis flow into structured-content generation that closes the gaps the audit identified.

This ticket also corrects the storylet-pool-authoring prose at the multiple "deferred until branching-story-health-audit ships" sites that no longer match reality.

## Assumption Reassessment (2026-05-03)

1. `.claude/skills/storylet-pool-authoring/SKILL.md` enumerates audit-mode references at lines 3, 13, 28, 49, 59, 172, 177, 230, 570, 573 (per the reverse-seam-scan output of skill-creator's compile run for branching-story-health-audit). Each names the audit skill as not-yet-shipping; each must be updated.
2. The storylet-pool-authoring skill's audit-mode design is largely sketched in its existing prose (visibility scope inheritance from RSP `target_branch` per Phase 3 line 366; `provenance.origin: audit_remediation` per Phase 3 line 367) but the actual Pre-flight + Phase 1 + Phase 2 wiring is absent. The prose anticipates the wiring; this ticket performs it.
3. RSP card schema (per `branching-story-health-audit/templates/remediation-storylet-proposal-card.md`): frontmatter carries `rsp_id`, `audit_id`, `story_id`, `finding_ids`, `target_obligation` / `target_thread` / `target_consequence` / `target_relationship` (at least one non-null), `proposed_shape`, `proposed_intensity`, `target_branch`, `proposed_visibility` (`scope` + `visible_branch_path_prefix`), `sketch` (`hard_preconds`, `fact_effects`, `pays_off_obligations`, `opens_obligations`, `addresses_consequences`, `choice_templates`), `rationale`. Each field has a documented role in audit-mode generation.
4. Cross-skill / cross-artifact boundary: the consumer (storylet-pool-authoring) parses card frontmatter at Phase 1 of audit mode. The audit skill's templates/remediation-storylet-proposal-card.md is the canonical source of truth for the schema — any schema evolution must update both files in lockstep.
5. FOUNDATIONS Rule 6 spirit: storylet-pool-authoring's audit-mode emissions carry `provenance.origin: audit_remediation` AND `provenance.source_audit: SAU-NNNN` AND `provenance.source_rsp: RSP-NNNN` so the audit-derived storylets are traceable back to their source finding via the audit's report. The provenance trail is the storylet-pool's local realization of audit-as-honest-epistemic-artifact.

## Architecture Check

1. The wiring is mechanically straightforward: Pre-flight reads `source_audit_path`, validates the file exists, parses frontmatter, validates schema. Phase 1 diagnosis matrix is REPLACED (not augmented) by the RSP card's targeting fields (the gap is what the RSP says it is; no need to re-diagnose). Phase 2 seed generation uses the RSP's `sketch.hard_preconds` / `fact_effects` / `choice_templates` as the LLM prompt's seed brief. Phase 3 onward proceeds as in seed/focus modes with the addition of provenance/visibility propagation.
2. Multi-card consumption: a single audit run can produce multiple RSP cards. Audit mode should accept a comma-separated list of RSP card paths via `source_audit_path` (or accept a SAU directory and consume all RSP cards within it; both shapes are reasonable — pick one and document). Each card produces one or more storylet seeds (count per `target_pool_size` distribution).
3. Visibility scope inheritance is already documented in storylet-pool-authoring Phase 3 line 366: "`mode=audit` (deferred): visibility inherits from the source RSP card's `target_branch` field — `global pool` → `global_author_pool`; concrete branch path → `branch_prefix_scoped` with that prefix; branch-local-fact-dependent → `branch_scoped`." Wire this from the deferred prose into actual Phase 3 logic.

## Verification Layers

1. **Pre-flight allows mode=audit when source_audit_path resolves to a valid RSP card** → integration: invoke `storylet-pool-authoring world_slug=<slug> story_slug=<slug> mode=audit source_audit_path=worlds/<slug>/stories/<slug>/audits/SAU-0001/remediation-storylet-proposals/RSP-0001-<slug>.md` → does NOT abort.
2. **Pre-flight rejects mode=audit when source_audit_path points to a non-RSP file or missing file** → integration: invoke with a malformed path → returns specific error.
3. **Phase 1 diagnosis derives gap targets from the RSP card's targeting fields** → audit-mode batch produces seeds whose target_obligation matches the RSP's frontmatter.
4. **Phase 2 seed generation incorporates the RSP card's sketch block** → resulting SLT records' hard_preconds / fact_effects / choice_templates trace to the RSP's sketch (with LLM elaboration).
5. **Phase 3 visibility scope inherits from RSP's proposed_visibility** → SLT records' visibility.scope matches RSP `proposed_visibility.scope`.
6. **Phase 3 provenance carries audit-trail fields** → SLT records' `provenance.origin: audit_remediation`, `provenance.source_audit: SAU-NNNN`, `provenance.source_rsp: RSP-NNNN`.
7. **Phase 4 mystery firewall STILL hard-rejects forbidden-M resolution even from audit-mode seeds** → defense-in-depth: even if the audit somehow produced an RSP-NNNN card pointing at a forbidden M (it shouldn't — Phase 8 Per-Card Validation test 2 catches this), the storylet-pool's own Phase 4 gate 1 catches it again.
8. **Storylet-pool-authoring prose corrections land** → grep storylet-pool-authoring for "deferred until branching-story-health-audit ships" returns no matches.

## What to Change

### 1. Replace audit-mode abort with implementation

In `.claude/skills/storylet-pool-authoring/SKILL.md` Pre-flight Check section, replace:

> If `mode=audit`, abort with "audit mode requires `branching-story-health-audit`, which is not yet shipping; use `mode=seed` or `mode=focus` until it lands."

With:

> If `mode=audit`: validate `source_audit_path` is provided and resolves to a real RSP card under `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md`. Parse the RSP card's YAML frontmatter; abort if any required field is missing per `branching-story-health-audit/templates/remediation-storylet-proposal-card.md` schema. Bind the RSP card's frontmatter into in-memory context for Phase 1 diagnosis (targeting fields), Phase 2 seed generation (sketch block), and Phase 3 visibility/provenance propagation.

Multi-card variant: the `source_audit_path` argument accepts either a single RSP file path OR a directory path under `audits/SAU-NNNN/remediation-storylet-proposals/`; in the directory case, all RSP cards in that directory are consumed. Document the chosen shape; Pre-flight enumerates and validates each card.

### 2. Replace Phase 1 deferred-prose with audit-mode branch

Phase 1 Coverage Diagnosis currently has branches for bootstrap_seed, focus, jit. Add an audit branch:

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

### 3. Replace Phase 2 deferred-prose with audit-mode seed generation

Phase 2 currently has bootstrap-mix / focus-mode / JIT-mode branches. Add audit-mode branch:

```
For mode=audit: each RSP card produces seeds whose:
- shape: RSP.proposed_shape
- tone register: derived from RSP.rationale + STORY_KERNEL.tone_constraints
- content_intensity band: RSP.proposed_intensity
- state preconditions: RSP.sketch.hard_preconds (LLM elaborates)
- core dramatic transaction: RSP.rationale + RSP.sketch.fact_effects synthesis

target_pool_size in audit mode defaults to one seed per RSP card; user may
override to produce multiple seeds per card if the gap is wide. Diversity audit
(Phase 5) bypasses for audit mode in the same way JIT mode bypasses, OR runs
with weakened thresholds — pick (and document) one.
```

### 4. Replace Phase 3 visibility inheritance prose with implementation

Phase 3 line 366 already documents the visibility-inheritance rule for audit mode; promote it from deferred-prose ("(deferred)") to active wiring. Drop the `(deferred)` marker.

Add provenance fields:

```
For mode=audit: SLT records carry:
- provenance.origin: audit_remediation
- provenance.source_audit: <RSP.audit_id>
- provenance.source_rsp: <RSP.rsp_id>
- provenance.created_at_page: null (author-pool unless visibility.scope is branch_scoped, in which case the RSP's target_branch must include a leaf PG-NNNN)
```

### 5. Update all "deferred until branching-story-health-audit ships" references

Edit the following sites in `.claude/skills/storylet-pool-authoring/SKILL.md`:

- **Line 3 (description)**: drop `or audit mode (deferred until branching-story-health-audit ships)` — replace with `or audit mode (consumes RSP cards from branching-story-health-audit's audits/SAU-NNNN/remediation-storylet-proposals/ output, per STPOOL-001)`.
- **Line 13 (mode argument)**: drop `Audit mode is deferred and aborts at Pre-flight until branching-story-health-audit ships.` — replace with factual description of audit-mode behavior.
- **Line 28 (source_audit_path argument)**: drop `DEFERRED — Pre-flight aborts until branching-story-health-audit ships.` — replace with the actual usage rules.
- **Line 49 (skill purpose paragraph)**: drop `or — once branching-story-health-audit ships — audit` — replace with factual `or audit`.
- **Line 59 (Process Flow ASCII)**: drop `refuse mode=audit until branching-story-health-audit ships;` — replace with the audit-mode handling line.
- **Line 172 (Inputs §Optional, mode argument re-stated)**: parallel update.
- **Line 177 (source_audit_path argument re-stated)**: parallel update.
- **Line 230 (World-State Prerequisites footnote)**: drop the entire `If mode=audit, abort with "audit mode requires branching-story-health-audit, which is not yet shipping..."` clause.
- **Line 570 (Guardrails §Known integration debt)**: replace the `branching-story-health-audit (future skill) — Pre-flight aborts on mode=audit until this skill ships.` entry with a forward-looking note that audit mode is wired per STPOOL-001 — OR if STPOOL-001 has already landed when this edit applies, remove the entry entirely from §Known integration debt and move to §Sibling interop §Consumes (existing).
- **Line 573 (Sibling interop §Consumes (deferred))**: move `branching-story-health-audit` from `Consumes (deferred)` to `Consumes (existing)` with the audit-mode wiring note.

### 6. Add audit-mode integration tests

Add a fixture: a synthetic RSP card under a synthetic SAU directory; run storylet-pool-authoring with `mode=audit source_audit_path=<fixture path>`; verify the resulting SLT records carry the expected provenance + visibility + sketch-derived fields.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — replace audit-mode deferred-prose with implementation across ~10 sites)
- (optional) test fixtures under a tests/ directory if storylet-pool-authoring grows test coverage in the future

## Out of Scope

- Page-cycle audit-flag wiring — separate ticket BSPAG-002.
- SAU allocator support — completed in `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md`; RSP allocator support — completed in `archive/tickets/MCPENH-016-add-rsp-id-class-to-allocator-sub-audit-scoped.md`; audit task-type ranking remains tracked in MCPENH-017.
- Tuning audit-mode diversity-audit threshold relaxation (Phase 5 bypass vs weakened) — pick one for now; tune after real-world use.
- Multi-card-batched RSP consumption optimization (e.g., one storylet that addresses multiple findings simultaneously) — defer to later iteration after single-card consumption proves out.

## Acceptance Criteria

### Tests That Must Pass

1. Manual integration: invoke `storylet-pool-authoring world_slug=<slug> story_slug=<slug> mode=audit source_audit_path=worlds/<slug>/stories/<slug>/audits/SAU-0001/remediation-storylet-proposals/RSP-0001-<slug>.md` → does NOT abort; produces a single SLT record carrying the expected provenance fields.
2. Manual integration: invoke with a directory path → all RSP cards in that directory consumed.
3. `grep -rn "deferred until branching-story-health-audit ships\|audit mode is deferred\|audit mode aborts at Pre-flight" .claude/skills/storylet-pool-authoring/SKILL.md` returns no matches after the edit.
4. Generated SLT records carry `provenance.origin: audit_remediation` + `provenance.source_audit: SAU-NNNN` + `provenance.source_rsp: RSP-NNNN`.
5. Generated SLT records' `visibility.scope` matches the source RSP's `proposed_visibility.scope`.

### Invariants

1. Audit-mode SLT records are traceable to their source RSP via the provenance chain.
2. Phase 4 mystery firewall remains the structural backstop — even an audit-derived seed cannot resolve a forbidden M.
3. Audit mode does NOT bypass the user-facing HARD-GATE — the Phase 6 batch manifest deliverable summary still requires explicit user approval.

## Test Plan

### New/Modified Tests

1. None automated initially — documentation-and-prose-driven plus manual integration. Future iteration may add fixture-based tests.

### Commands

1. Manual: produce a small SAU + RSP card via `branching-story-health-audit` on a test bundle; invoke `storylet-pool-authoring mode=audit` consuming the card.
2. `grep -rn "deferred until branching-story-health-audit ships" .claude/skills/storylet-pool-authoring/` — verify no matches.
3. `grep -rn "branching-story-health-audit" .claude/skills/storylet-pool-authoring/SKILL.md` — verify only factual references remain (no "future skill" / "not yet shipping" framing).
