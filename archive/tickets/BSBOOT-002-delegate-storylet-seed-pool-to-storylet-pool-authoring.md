# BSBOOT-002: Delegate `branching-story-bootstrap` Phase 6 storylet-seed-pool to `storylet-pool-authoring`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` (Phase 6 prose; FOUNDATIONS Alignment; Guardrails sibling-interop), `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (SLT seam markers reverted; SLT shape inherited via cross-reference rather than inlined), `.claude/skills/storylet-pool-authoring/SKILL.md` (bootstrap sub-routine invocation mode)
**Deps**: `.claude/skills/storylet-pool-authoring/SKILL.md` (now shipping; this ticket closes the seam BSBOOT named at line 364 / line 586 / line 119); archive/tickets/BSBOOT-001-delegate-bootstrap-seams-to-page-cycle.md (precedent for closing inlined-with-seams to a now-shipping sibling); archive/tickets/MCPENH-014-add-slb-id-class-to-allocator.md (SLB allocator support — closes the SLB defensive-recovery fallback path bootstrap inherits if it delegates with explicit allocation control); archive/tickets/MCPENH-013-register-storylet-pool-authoring-task-type.md (storylet_pool_authoring task type — registered profile improves retrieval prioritization for the delegated seed batch)

## Problem

At intake, `branching-story-bootstrap` Phase 6 inlined a minimal SLT seed shape with explicit seam markers naming `storylet-pool-authoring` as the future authority:

- `.claude/skills/branching-story-bootstrap/SKILL.md` line 364: `- Seam: when storylet-pool-authoring ships, refactor Phase 6 to delegate to its seed-mode entrypoint (focus_area: bootstrap_mix, target_pool_size: <seed-size>, source_audit_path: null). Until then, this skill inlines the minimal seed shape.`
- `.claude/skills/branching-story-bootstrap/SKILL.md` line 586: `**Consumes (future, not yet shipping)**: storylet-pool-authoring (Phase 6 delegation seam); branching-story-health-audit; story-fact-promotion-to-canon.`
- `.claude/skills/branching-story-bootstrap/SKILL.md` line 119 (Process Flow ASCII): `seam: future delegation to storylet-pool-authoring`.
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` line 194 (per the Section 6a/Phase 6 inline minimal seed shape): `# SLT-NNNN — Storylet (bootstrap minimal seed shape; refactor when storylet-pool-authoring ships)`.

`storylet-pool-authoring` ships now (per the current ticket batch). This ticket delegated bootstrap's Phase 6 to it, eliminating the inlined-minimal-shape prose and the storylet seam markers.

The delegation shape was specified at the seam point: use `storylet-pool-authoring` with `mode='seed'`, `focus_area='bootstrap_mix'`, `target_pool_size=<bootstrap's storylet_pool_seed_size argument>`, and `parent_skill_invocation: true`. Because bootstrap Phase 6 runs before `worlds/<world-slug>/stories/<story-slug>/` exists, the delegated storylet-pool path must run as an in-memory bootstrap sub-routine: it applies storylet-pool seed generation and validation, returns approved SLT records to bootstrap, and does not allocate/write an SLB manifest or edit the bundle index. Bootstrap's Phase 11 remains the single write transaction for the new story bundle.

## Assumption Reassessment (2026-05-02)

1. Today's bootstrap Phase 6 is at `.claude/skills/branching-story-bootstrap/SKILL.md` lines 346-364 (per current state on 2026-05-02). It produces ~20 SLT-NNNN records with deterministic shape weighting (entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3) and inlines the minimal SLT shape from `templates/story-records.yaml` line 194.
2. The shipping `storylet-pool-authoring` skill at `.claude/skills/storylet-pool-authoring/SKILL.md` Phase 2 §Bootstrap-mix shape weighting reproduces the same shape weighting bootstrap currently uses, so delegation is shape-byte-compatible. Phase 4 gate set (9 gates) and Phase 5 diversity audit (6 axes + branch-contamination) supersede bootstrap's inline mystery_safety / canon-safety check, providing strictly stronger validation.
3. The shared boundary under audit is the contract between (a) bootstrap's Phase 6 entrypoint, (b) `storylet-pool-authoring`'s `seed` mode public surface with `parent_skill_invocation: true` (world_slug + story_slug + target_pool_size + `focus_area='bootstrap_mix'` + bootstrap Phases 1-5 in-memory context + provenance.origin: bootstrap_seed), and (c) bootstrap's Phase 7 / Phase 9 / Phase 10 / Phase 11 downstream (the seed pool flows into Phase 7's PG-0001 storylet selection, Phase 9 gate 9 storylet diversity check, and Phase 11's `_source/storylets/SLT-*.yaml` writes). The delegation must preserve all three dependencies.
4. **FOUNDATIONS principle**: The motivation is operational consistency — every other deferred-sibling seam in worldloom closes once the named sibling ships (per BSBOOT-001's archive precedent). The pipeline-wide discipline is "if a skill names another skill in a `# Seam: refactor when X ships` marker, file the closing ticket once X ships." This is that ticket for the BSBOOT → storylet-pool-authoring seam.
5. This ticket touches a skill HARD-GATE presentation surface but does not weaken canon safety. Bootstrap's HARD-GATE remains its Phase 10 deliverable approval; the storylet-pool-authoring direct-invocation HARD-GATE remains absolute. With `parent_skill_invocation: true`, storylet-pool-authoring's Phase 6 becomes an internal validation/return packet and no storylet-pool write phase runs; bootstrap's Phase 10 is the user-facing approval surface for the combined story bundle. `docs/HARD-GATE-DISCIPLINE.md` still governs direct user-invoked content-generation skills, and this sub-routine path writes nothing by itself.
6. This ticket extends the bootstrap skill's interop surface (now consuming a shipping sibling rather than inlining); does NOT extend any output schema. Storylet records returned by storylet-pool-authoring's bootstrap sub-routine match the exact SLT schema authority in `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`; bootstrap assigns the new story's SLT ids and writes those records in Phase 11.
7. No skill / tool / hook / validator / schema field is renamed or removed. The `templates/story-records.yaml` SLT-NNNN block is reduced to a one-line cross-reference: `# SLT-NNNN: see .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml — bootstrap delegates Phase 6 to storylet-pool-authoring's seed mode.`
8. Reassessment correction: the drafted Shape A incorrectly implied storylet-pool-authoring could run its normal Pre-flight/Phase 7 write path during bootstrap. Live `storylet-pool-authoring` Pre-flight aborts when `worlds/<world-slug>/stories/<story-slug>/` is missing, while bootstrap Phase 6 intentionally runs before the bundle directory exists. The landed shape is a hybrid of the draft's Shape A and Shape B: `parent_skill_invocation: true` is the explicit sub-routine flag, but for `mode='seed'` + `focus_area='bootstrap_mix'` it runs against bootstrap's in-memory Phases 1-5 context, returns approved SLT records and validation summaries to bootstrap, and suppresses storylet-pool SLB allocation, Phase 6 user-facing HARD-GATE presentation, Phase 7 writes, and bundle INDEX edits.
9. Reassessment correction: no executable `branching-story-bootstrap` fixture runner exists in the current repo. Verification is therefore grep proof plus manual contract review of the prose skills and templates, not an end-to-end dry-run.

## Architecture Check

1. Delegation > inlining for two reasons: (a) storylet-pool-authoring's Phase 4 (9 gates) is strictly stronger than bootstrap's inline mystery_safety check, so delegation strengthens the canon-safety surface; (b) future improvements to storylet-pool-authoring (new gates, better diversity audit, refined shape weighting) propagate to bootstrap automatically rather than requiring parallel updates to two inlined shapes.
2. No backwards-compatibility aliasing. The `templates/story-records.yaml` SLT-NNNN inlined block is replaced with a cross-reference, not preserved as an alias. Bootstrap's Phase 6 prose is rewritten, not appended-to.

## Verification Layers

1. **Skill prose grep proof** — `rg -n "storylet-pool-authoring.*(future|pending BSBOOT-002|still inlines)|inline minimal seed shape|delegation refactor pending BSBOOT-002|refactor when storylet-pool-authoring ships|seam: delegation" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns zero hits; the storylet-pool seam's "future/pending/inline" wording is gone while unrelated future-sibling wording for other skills remains untouched.
2. **Template grep proof** — `grep -n "storylet-pool-authoring\|refactor when" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns one hit: the cross-reference comment pointing to the storylet-pool-authoring template.
3. **Manual skill contract review** — inspect `branching-story-bootstrap` Phase 6 / Phase 7 / Phase 9 / Phase 11 and `storylet-pool-authoring` Pre-flight / Phase 6 / Phase 7 to confirm the delegated bootstrap sub-routine returns SLTs that (a) carry `provenance.origin: bootstrap_seed`, (b) match the bootstrap-mix shape distribution, (c) pass storylet-pool-authoring's Phase 4 9-gate set, and (d) flow into bootstrap's Phase 7 PG-0001 selection and Phase 11 write set without requiring a pre-existing story bundle.
4. **FOUNDATIONS alignment check** — bootstrap's FOUNDATIONS Alignment table Rule 7 row updates to cite delegation rather than inlined firewall; the Mystery Reserve enforcement surface is now the storylet-pool-authoring Phase 4 gate 1 + 2 pair, with bootstrap retaining Phase 4 mystery firewall (premise-vs-M check) and Phase 9 gate 1 prose ledger consistency check as additional defense-in-depth layers.

## Landed Changes

### 1. Bootstrap Phase 6 prose

`.claude/skills/branching-story-bootstrap/SKILL.md` Phase 6 now uses `storylet-pool-authoring` as an in-memory sub-routine with `mode='seed'`, `focus_area='bootstrap_mix'`, `target_pool_size=<storylet_pool_seed_size argument>`, `parent_skill_invocation: true`, and bootstrap Phases 1-5 as caller context. The inlined shape weighting table is replaced by a citation to storylet-pool-authoring's Phase 2 §Bootstrap-mix shape weighting.

The seam marker was removed. Bootstrap now states that storylet-pool-authoring returns approved SLTs and validation summaries in memory, while bootstrap assigns SLT ids and writes the returned records in Phase 11's single transaction.

### 2. Bootstrap Process Flow ASCII

`.claude/skills/branching-story-bootstrap/SKILL.md` Process Flow now describes Phase 6 as delegated to storylet-pool-authoring seed mode with `focus_area: bootstrap_mix`, `parent_skill_invocation: true`, and an in-memory approved-SLT return.

### 3. Bootstrap FOUNDATIONS Alignment table

`.claude/skills/branching-story-bootstrap/SKILL.md` Rule 7 and Rule 4 rows now cite storylet-pool-authoring's returned validation verdicts and Phase 4 gates instead of bootstrap's former inline `mystery_safety: pass` cross-check.

### 4. Bootstrap Guardrails sibling-interop

`.claude/skills/branching-story-bootstrap/SKILL.md` Guardrails > Sibling interop:

Landed: `storylet-pool-authoring` is listed as an existing consumed skill. The entry documents `focus_area: bootstrap_mix`, `parent_skill_invocation: true`, and bootstrap's Phase 11 write ownership.

### 5. Bootstrap templates/story-records.yaml SLT block

`.claude/skills/branching-story-bootstrap/templates/story-records.yaml` SLT-NNNN block was replaced with this cross-reference:

```yaml
# SLT-NNNN — Storylet records are produced by storylet-pool-authoring (delegated from
# Phase 6) and conform to .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml.
# Bootstrap's Phase 11 atomic transaction writes the delegated batch's SLT files into
# _source/storylets/. The storylet-pool-authoring template is the single source of truth.
```

The inlined minimal SLT YAML shape was removed.

### 6. storylet-pool-authoring sub-routine flag

`.claude/skills/storylet-pool-authoring/SKILL.md`:

Landed:

- Added `parent_skill_invocation` to the frontmatter arguments and Inputs > Optional list.
- Documented the bootstrap sub-routine carve-out in Pre-flight. With `parent_skill_invocation: true`, `mode='seed'`, and `focus_area='bootstrap_mix'`, the caller supplies bootstrap Phases 1-5 in-memory context, the story bundle directory may be absent, no SLB id is allocated, no current storylet pool is loaded, and bootstrap assigns SLT ids for its Phase 11 write set.
- Renamed Phase 6 to "Approval / Return" and added "Sub-routine invocation" describing the internal validation return packet.
- Clarified that Phase 7 is skipped for sub-routine invocation.
- Updated Guardrails and Final Rule so direct invocation keeps its absolute HARD-GATE while the bootstrap path remains no-write and governed by bootstrap's parent HARD-GATE.

### 7. Verification

Verification used grep proof plus manual contract review because these skills are prose workflow definitions and no executable bootstrap fixture runner exists in the current repo.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify; Phase 6 prose, Process Flow, FOUNDATIONS Alignment, Guardrails)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify; SLT block reduced to cross-reference)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify; add parent_skill_invocation argument + sub-routine sub-section)
- `archive/tickets/BSBOOT-002-delegate-storylet-seed-pool-to-storylet-pool-authoring.md` (modify; reassessment, closeout, and archival record)

## Out of Scope

- BSPAG-001 (page-cycle JIT delegation) — separate ticket.
- MCPENH-013 landed independently at archive/tickets/MCPENH-013-register-storylet-pool-authoring-task-type.md; MCPENH-014 landed independently at archive/tickets/MCPENH-014-add-slb-id-class-to-allocator.md and is not a blocker.
- Patch-engine ops for SLT records — Shape A integration posture preserved (direct Write remains correct).
- `branching-story-health-audit` — deferred sibling, not closing this seam set.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "storylet-pool-authoring.*(future|pending BSBOOT-002|still inlines)|inline minimal seed shape|delegation refactor pending BSBOOT-002|refactor when storylet-pool-authoring ships|seam: delegation" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — returns zero hits after this ticket lands.
2. Manual contract review confirms bootstrap Phase 6 uses `storylet-pool-authoring` as a no-write bootstrap sub-routine, the returned SLTs pass storylet-pool-authoring's Phase 4 9-gate set and Phase 5 diversity audit, and bootstrap Phase 11 writes them in its single new-bundle transaction.

### Invariants

1. Bootstrap's Phase 6 produces SLT records whose schema matches `storylet-pool-authoring/templates/storylet-record.yaml` byte-for-byte (no schema fork between the two skills).
2. The storylet-pool-authoring HARD-GATE absoluteness is preserved for direct user invocation; only the documented `parent_skill_invocation: true` sub-routine path downgrades the user-facing gate.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `rg -n "storylet-pool-authoring.*(future|pending BSBOOT-002|still inlines)|inline minimal seed shape|delegation refactor pending BSBOOT-002|refactor when storylet-pool-authoring ships|seam: delegation" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — should return zero lines.
2. Manual contract review of `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/storylet-pool-authoring/SKILL.md`, and `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`.

## Outcome

Completed on 2026-05-02.

`branching-story-bootstrap` Phase 6 now delegates seed storylet generation to `storylet-pool-authoring` as a no-write bootstrap sub-routine. Bootstrap no longer inlines a minimal SLT seed shape; `storylet-pool-authoring/templates/storylet-record.yaml` is the SLT schema authority, and bootstrap writes returned SLTs in Phase 11.

`storylet-pool-authoring` now documents `parent_skill_invocation: true` for bootstrap seed generation. Direct user invocation still requires the storylet-pool HARD-GATE and writes SLT/SLB/INDEX outputs only after approval. The bootstrap sub-routine path instead accepts parent-supplied in-memory context, skips SLB allocation and writes, returns approved SLTs plus validation summaries, and relies on bootstrap's Phase 10 HARD-GATE as the user-facing approval surface.

Post-ticket review found that `.claude/skills/branching-story-bootstrap/SKILL.md` still had stale same-seam FOUNDATIONS Alignment wording: the Rule 7 row under `## FOUNDATIONS Alignment` still cited "Phase 6 SLT cross-check" instead of storylet-pool-authoring Phase 4 gates 1 and 2 / the no-write parent validation return packet. The resumed implementation corrected that row before archival.

## Verification Result

1. `rg -n "storylet-pool-authoring.*(future|pending BSBOOT-002|still inlines)|inline minimal seed shape|delegation refactor pending BSBOOT-002|refactor when storylet-pool-authoring ships|seam: delegation" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returned no hits.
2. `grep -n "storylet-pool-authoring\\|refactor when" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returned only the SLT cross-reference comment.
3. `rg -n "inline minimal seed shape|delegation refactor pending|Phase 6 still inlines|future delegation|Seam:|refactor when" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml .claude/skills/storylet-pool-authoring/SKILL.md` returned no hits.
4. Manual contract review confirmed the live bootstrap/storylet-pool handoff preserves bootstrap Phase 11 write ownership, keeps storylet-pool direct-invocation HARD-GATE behavior, and does not require a pre-existing story bundle in the bootstrap sub-routine path.
5. Post-review resumed proof: `rg -n "Phase 6 SLT cross-check" .claude/skills/branching-story-bootstrap/SKILL.md` returned no hits after correcting the bootstrap FOUNDATIONS Alignment row. The phrase remains only in this ticket as labelled historical post-review evidence.

## Deviations

1. The drafted fixture dry-run was not run because these branching-story skills are prose workflow definitions and the repo has no executable `branching-story-bootstrap` fixture runner. The truthful proof boundary is grep plus manual contract review.
2. The original broad negative grep included `future, not yet shipping` and would match unrelated future-sibling guardrail entries for `branching-story-health-audit` and `story-fact-promotion-to-canon`. The accepted proof was narrowed to the actual storylet-pool seam markers.
3. Reassessment changed the drafted Shape A: storylet-pool-authoring cannot use its normal existing-bundle Pre-flight and Phase 7 write path during bootstrap because the story bundle does not exist yet. The landed sub-routine is explicitly no-write and in-memory.
4. Post-ticket review initially blocked archival on stale bootstrap FOUNDATIONS Alignment Rule 7 wording. The resumed implementation corrected that row; no same-seam blocker remains.
