# BSBOOT-002: Delegate `branching-story-bootstrap` Phase 6 storylet-seed-pool to `storylet-pool-authoring`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` (Phase 6 prose; FOUNDATIONS Alignment; Guardrails sibling-interop), `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (SLT seam markers reverted; SLT shape inherited via cross-reference rather than inlined)
**Deps**: `.claude/skills/storylet-pool-authoring/SKILL.md` (now shipping; this ticket closes the seam BSBOOT named at line 364 / line 586 / line 119); archive/tickets/BSBOOT-001-delegate-bootstrap-seams-to-page-cycle.md (precedent for closing inlined-with-seams to a now-shipping sibling); MCPENH-014 (SLB allocator support — closes the SLB defensive-recovery fallback path bootstrap inherits if it delegates with explicit allocation control); MCPENH-013 (storylet_pool_authoring task type — registered profile improves retrieval prioritization for the delegated seed batch)

## Problem

`branching-story-bootstrap` Phase 6 currently inlines a minimal SLT seed shape with explicit seam markers naming `storylet-pool-authoring` as the future authority:

- `.claude/skills/branching-story-bootstrap/SKILL.md` line 364: `- Seam: when storylet-pool-authoring ships, refactor Phase 6 to delegate to its seed-mode entrypoint (focus_area: bootstrap_mix, target_pool_size: <seed-size>, source_audit_path: null). Until then, this skill inlines the minimal seed shape.`
- `.claude/skills/branching-story-bootstrap/SKILL.md` line 586: `**Consumes (future, not yet shipping)**: storylet-pool-authoring (Phase 6 delegation seam); branching-story-health-audit; story-fact-promotion-to-canon.`
- `.claude/skills/branching-story-bootstrap/SKILL.md` line 119 (Process Flow ASCII): `seam: future delegation to storylet-pool-authoring`.
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` line 194 (per the Section 6a/Phase 6 inline minimal seed shape): `# SLT-NNNN — Storylet (bootstrap minimal seed shape; refactor when storylet-pool-authoring ships)`.

`storylet-pool-authoring` ships now (per the current ticket batch). Bootstrap's Phase 6 should delegate to it, eliminating the inlined-minimal-shape prose and the seam markers.

The delegation shape was specified at the seam point: invoke `storylet-pool-authoring` with `mode='seed'` (or equivalently `focus_area='bootstrap_mix'`, since the storylet skill treats that pair as equivalent), `target_pool_size=<bootstrap's storylet_pool_seed_size argument>`, and rely on its Pre-flight + Phase 1-7 to produce the seed pool that bootstrap's Phase 11 atomic-write transaction will adopt.

## Assumption Reassessment (2026-05-02)

1. Today's bootstrap Phase 6 is at `.claude/skills/branching-story-bootstrap/SKILL.md` lines 346-364 (per current state on 2026-05-02). It produces ~20 SLT-NNNN records with deterministic shape weighting (entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3) and inlines the minimal SLT shape from `templates/story-records.yaml` line 194.
2. The shipping `storylet-pool-authoring` skill at `.claude/skills/storylet-pool-authoring/SKILL.md` Phase 2 §Bootstrap-mix shape weighting reproduces the same shape weighting bootstrap currently uses, so delegation is shape-byte-compatible. Phase 4 gate set (9 gates) and Phase 5 diversity audit (6 axes + branch-contamination) supersede bootstrap's inline mystery_safety / canon-safety check, providing strictly stronger validation.
3. The shared boundary under audit is the contract between (a) bootstrap's Phase 6 entrypoint, (b) `storylet-pool-authoring`'s `seed` mode public surface (world_slug + story_slug + target_pool_size + provenance.origin: bootstrap_seed), and (c) bootstrap's Phase 9 / Phase 10 / Phase 11 downstream (the seed pool flows into Phase 7's PG-0001 storylet selection, Phase 9 gate 9 storylet diversity check, and Phase 11's `_source/storylets/SLT-*.yaml` writes). The delegation must preserve all three dependencies.
4. **FOUNDATIONS principle**: The motivation is operational consistency — every other deferred-sibling seam in worldloom closes once the named sibling ships (per BSBOOT-001's archive precedent). The pipeline-wide discipline is "if a skill names another skill in a `# Seam: refactor when X ships` marker, file the closing ticket once X ships." This is that ticket for the BSBOOT → storylet-pool-authoring seam.
5. This ticket does NOT touch HARD-GATE semantics. Bootstrap's HARD-GATE remains its Phase 10 deliverable approval; the storylet-pool-authoring skill's HARD-GATE (Phase 6 batch deliverable) is suppressed when invoked as a sub-routine of bootstrap (because bootstrap's higher-level HARD-GATE already gates user approval — running both gates would interrupt the bootstrap flow twice, which is not the intent). The delegation must carry an explicit "suppress sub-skill HARD-GATE" mode flag OR the storylet-pool-authoring skill must learn to recognize sub-routine invocation and downgrade Phase 6 to an internal validation pass with the batch flowing back to the caller.
6. This ticket extends the bootstrap skill's interop surface (now consuming a shipping sibling rather than inlining); does NOT extend any output schema. Storylet records produced by storylet-pool-authoring's Phase 7 atomic-write match the exact SLT schema bootstrap currently produces (`templates/storylet-record.yaml` is structurally parallel to the SLT shape inlined at `templates/story-records.yaml` line 194).
7. No skill / tool / hook / validator / schema field is renamed or removed. The `templates/story-records.yaml` SLT-NNNN block is reduced to a one-line cross-reference: `# SLT-NNNN: see .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml — bootstrap delegates Phase 6 to storylet-pool-authoring's seed mode.`
8. Reassessment exposure: the storylet-pool-authoring HARD-GATE suppression in sub-routine mode is a substantive design decision that this ticket must resolve. Two architectural shapes are admissible:
   - **Shape A (sub-routine flag in storylet-pool-authoring)**: add a new optional argument `parent_skill_invocation: true | false` (default false) which, when true, downgrades Phase 6 from a HARD-GATE deliverable summary to a pass-through return of the batch manifest + approved SLT records to the caller. Bootstrap sets `parent_skill_invocation: true`. The storylet-pool-authoring skill's HARD-GATE absoluteness is preserved for direct user invocation.
   - **Shape B (caller-facing batch contract)**: storylet-pool-authoring exposes a separate "library mode" public-surface contract that returns the batch in-memory without writing. Bootstrap's Phase 11 then writes the SLT/SLB records as part of the bootstrap atomic transaction. This preserves bootstrap's existing single-transaction discipline at the cost of duplicating storylet-pool-authoring's Phase 7 write logic.
   - Shape A is preferred per the worldloom skill-non-chaining guardrail (skills don't invoke other skills; a sub-routine flag is a documented invocation-shape variation, not a runtime call from one skill to another). Shape B is the alternative if the user prefers strict skill-isolation. **Decision deferred to ticket implementation**; both shapes preserve the integration's correctness contract.

## Architecture Check

1. Delegation > inlining for two reasons: (a) storylet-pool-authoring's Phase 4 (9 gates) is strictly stronger than bootstrap's inline mystery_safety check, so delegation strengthens the canon-safety surface; (b) future improvements to storylet-pool-authoring (new gates, better diversity audit, refined shape weighting) propagate to bootstrap automatically rather than requiring parallel updates to two inlined shapes.
2. No backwards-compatibility aliasing. The `templates/story-records.yaml` SLT-NNNN inlined block is replaced with a cross-reference, not preserved as an alias. Bootstrap's Phase 6 prose is rewritten, not appended-to.

## Verification Layers

1. **Skill prose grep proof** — `grep -n "storylet-pool-authoring" .claude/skills/branching-story-bootstrap/SKILL.md` returns hits ONLY in the Phase 6 prose's delegation reference, the FOUNDATIONS Alignment table's row, and the Guardrails sibling-interop "Consumes (existing)" line; the "future, not yet shipping" wording, the "Seam: when storylet-pool-authoring ships" marker, and the Process Flow "seam: future delegation" annotation are gone.
2. **Template grep proof** — `grep -n "storylet-pool-authoring\|refactor when" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns one hit: the cross-reference comment pointing to the storylet-pool-authoring template.
3. **Skill dry-run** — invoke `branching-story-bootstrap` against a fixture world with a fixture premise and small cast; confirm Phase 6 produces a seed pool whose SLTs (a) carry `provenance.origin: bootstrap_seed`, (b) match the bootstrap-mix shape distribution, (c) pass storylet-pool-authoring's Phase 4 9-gate set, and (d) flow correctly into bootstrap's Phase 7 PG-0001 selection.
4. **FOUNDATIONS alignment check** — bootstrap's FOUNDATIONS Alignment table Rule 7 row updates to cite delegation rather than inlined firewall; the Mystery Reserve enforcement surface is now the storylet-pool-authoring Phase 4 gate 1 + 2 pair, with bootstrap retaining Phase 4 mystery firewall (premise-vs-M check) and Phase 9 gate 1 prose ledger consistency check as additional defense-in-depth layers.

## What to Change

### 1. Bootstrap Phase 6 prose

`.claude/skills/branching-story-bootstrap/SKILL.md` Phase 6: rewrite to invoke `storylet-pool-authoring` as a sub-routine with `mode='seed'`, `focus_area='bootstrap_mix'`, `target_pool_size=<storylet_pool_seed_size argument>`, `parent_skill_invocation: true` (per Shape A in §8 above). Replace the inlined shape weighting table with a one-line confirmation that storylet-pool-authoring's Phase 2 §Bootstrap-mix shape weighting is the contract.

Remove the seam marker: `- Seam: when storylet-pool-authoring ships, refactor Phase 6 to delegate to its seed-mode entrypoint...`. Replace with a Phase 11 cross-reference confirming the delegated batch's SLT records flow into bootstrap's atomic-transaction write order.

### 2. Bootstrap Process Flow ASCII

`.claude/skills/branching-story-bootstrap/SKILL.md` line 119 (Process Flow box for Phase 6): replace `seam: future delegation to storylet-pool-authoring` with `delegated to storylet-pool-authoring seed mode (parent_skill_invocation: true)`.

### 3. Bootstrap FOUNDATIONS Alignment table

`.claude/skills/branching-story-bootstrap/SKILL.md` Rule 7 row: update mechanism citation from "Phase 6 SLT cross-check" to "Phase 6 delegation to storylet-pool-authoring (which enforces the 9-gate canon-safety check; see its Validation Rules This Skill Upholds)."

### 4. Bootstrap Guardrails sibling-interop

`.claude/skills/branching-story-bootstrap/SKILL.md` Guardrails > Sibling interop:

- Move `storylet-pool-authoring` from "Consumes (future, not yet shipping)" to "Consumes (existing)".
- Update the description: `storylet-pool-authoring (Phase 6 delegation — bootstrap invokes its seed mode with parent_skill_invocation: true)`.

### 5. Bootstrap templates/story-records.yaml SLT block

`.claude/skills/branching-story-bootstrap/templates/story-records.yaml` SLT-NNNN block (currently lines 194 onward): replace with a one-line cross-reference comment:

```yaml
# SLT-NNNN — Storylet records are produced by storylet-pool-authoring (delegated from
# Phase 6) and conform to .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml.
# Bootstrap's Phase 11 atomic transaction writes the delegated batch's SLT files into
# _source/storylets/. The storylet-pool-authoring template is the single source of truth.
```

Remove the inlined minimal SLT YAML shape.

### 6. storylet-pool-authoring sub-routine flag

`.claude/skills/storylet-pool-authoring/SKILL.md`:

- Add `parent_skill_invocation` to the Inputs > Optional list.
- §Phase 6: add a sub-section "Sub-routine invocation" describing how `parent_skill_invocation: true` downgrades the HARD-GATE deliverable summary to an internal validation pass with the batch + approved SLT records returned in-memory to the caller.
- §Guardrails > HARD-GATE: clarify that HARD-GATE absoluteness applies to direct user invocation; sub-routine invocation by `branching-story-bootstrap` is a documented exception with the parent skill's HARD-GATE serving as the user-facing approval surface.

### 7. Verification

After landing, run `branching-story-bootstrap` against a fixture world to confirm seed pool produces correctly. Manual review of the bootstrap diff confirms no inlined SLT shape remains.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify; Phase 6 prose, Process Flow, FOUNDATIONS Alignment, Guardrails)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify; SLT block reduced to cross-reference)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify; add parent_skill_invocation argument + sub-routine sub-section)

## Out of Scope

- BSPAG-001 (page-cycle JIT delegation) — separate ticket.
- MCPENH-013 / MCPENH-014 — landed independently; not blocked.
- Patch-engine ops for SLT records — Shape A integration posture preserved (direct Write remains correct).
- `branching-story-health-audit` — deferred sibling, not closing this seam set.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "future, not yet shipping\|Seam: when storylet-pool-authoring ships\|seam: future delegation to storylet-pool-authoring\|refactor when storylet-pool-authoring ships" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — returns zero hits after this ticket lands.
2. Skill dry-run: invoke `branching-story-bootstrap` against a representative fixture; confirm Phase 6 produces a seed pool that passes storylet-pool-authoring's Phase 4 9-gate set and flows into bootstrap's Phase 11 atomic-write transaction without modification.

### Invariants

1. Bootstrap's Phase 6 produces SLT records whose schema matches `storylet-pool-authoring/templates/storylet-record.yaml` byte-for-byte (no schema fork between the two skills).
2. The storylet-pool-authoring HARD-GATE absoluteness is preserved for direct user invocation; only the documented `parent_skill_invocation: true` sub-routine path downgrades the user-facing gate.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "future, not yet shipping\|Seam: when storylet-pool-authoring ships\|seam: future delegation to storylet-pool-authoring\|refactor when storylet-pool-authoring ships" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — should return zero lines.
2. Manual skill dry-run of `branching-story-bootstrap` against a fixture world.
