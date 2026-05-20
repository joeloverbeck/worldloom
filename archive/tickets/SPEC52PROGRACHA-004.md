# SPEC52PROGRACHA-004: New deepen-character-proposal skill

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new skill `.claude/skills/deepen-character-proposal/` (SKILL.md + templates/upgraded-proposal-card.md, new directory). No impact on existing skills; consumes the shared reference (001) and reuses the existing `propose_new_characters` MCP task type.
**Deps**: archive/tickets/SPEC52PROGRACHA-001.md

## Problem

At intake, there was no skill to deepen a single existing brief or NCP card into a stronger proposal. SPEC-52 D2 added `deepen-character-proposal`: a single-seed radicalizer that extracts the seed essence, generates several radical world-valid mutations, scores them, rejects weaker directions, and emits one upgraded NCP card. It never writes canon and never writes a CHAR dossier.

## Assumption Reassessment (2026-05-20)

1. `.claude/skills/deepen-character-proposal/` did not exist at intake; this ticket created it. The id allocator supports the `NCP` class — confirmed at `tools/world-mcp/src/tools/allocate-next-id.ts` (`NCP: { width: 1, zeroPad: false, regex: /^NCP-(\d+)$/ }`), so `mcp__worldloom__allocate_next_id(world_slug, 'NCP')` is valid. The skill mutates only `worlds/<world_slug>/character-proposals/`.
2. SPEC-52 §Phase 2 + Deliverable 2 specify the skill contract (args `world_slug`, `input_path`, `upgrade_intensity`, `canon_risk_tolerance`, `output_mode`), the HARD-GATE preconditions, the 14-step process, and the output (one NCP card + INDEX update; no NCB manifest required for single-seed upgrades). §Phase 6 mandates reusing `task_type='propose_new_characters'` — do NOT add a `character_proposal_upgrade` task type.
3. Cross-skill boundary: the emitted NCP card's `memorability_profile` + `upgrade_lineage` blocks MUST match `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (001) and the `propose-new-characters` proposal-card template completed in `archive/tickets/SPEC52PROGRACHA-002.md`; the card is directly consumable by `character-generation` via `character_brief_path` (003), and conforms to the NCP JSON schema (005). The skill reuses `propose_new_characters`'s ranking profile (`tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`).
4. FOUNDATIONS Rule 2 (No Pure Cosmetics): every mutation must be world-produced, not cosmetic. Rule 7 (Preserve Mystery): the HARD-GATE loads invariant + Mystery Reserve firewall surfaces; canon-requiring mutations list implied facts and route each to `canon-addition` (precise/local) or `propose-new-canon-facts` (systemic), NEVER writing canon — the skill is canon-reading and must not weaken the Mystery Reserve firewall.
5. The drafted skill dry-run proof is not executable in this Codex context: there is no repo-local runner that invokes `.claude/skills/deepen-character-proposal` as a skill and captures emitted previews. The accepted proof boundary is file-existence checks, grep-proof, manual contract review against the shared reference and proposal-card template, and a no-hit check for the deferred dedicated task-type literal.

## Architecture Check

1. A single-seed radicalizer distinct from the batch generator (`propose-new-characters`) keeps the two concerns separate while sharing one doctrine (001) and one retrieval profile (Phase 6 no-op). Reusing the `propose_new_characters` task type avoids a premature dedicated task type (YAGNI per §Key Design Decisions).
2. No backwards-compatibility aliasing/shims — net-new skill; `batch_id` is omitted on single-seed upgrades (`upgrade_lineage.origin_kind: upgraded_seed | user_seed`).

## Verification Layers

1. SKILL.md frontmatter declares name/description/user-invocable/arguments; HARD-GATE block present → grep-proof + skill-structure review.
2. Canon-routing classifies `canon-safe | canon-edge | canon-requiring` and never writes canon → manual review (Mystery Reserve firewall audit).
3. Emitted-card `memorability_profile` / `upgrade_lineage` field names match 001 and `archive/tickets/SPEC52PROGRACHA-002.md` → grep-proof + cross-check.
4. Context loads via `task_type='propose_new_characters'` (Phase 6 no-op confirmed) → grep-proof (no new task type added).

## Landed Changes

### 1. Author `.claude/skills/deepen-character-proposal/SKILL.md`

Created the skill with the required description, `user-invocable: true`, and arguments: `world_slug`, `input_path`, `upgrade_intensity`, `canon_risk_tolerance`, and `output_mode`. The SKILL.md includes the required HARD-GATE, process flow, pre-flight/context loading with `task_type='propose_new_characters'`, seed-essence extraction, blandness diagnosis, world-pressure mapping, 5-8 mutation spread, two-layer scoring, rejection triggers, canon routing, NCP composition, deterministic validation, critic passes, preview, and approval-gated write. Output is `worlds/<world_slug>/character-proposals/NCP-<integer>-<slug>.md` plus a `character-proposals/INDEX.md` update.

### 2. Author `.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md`

Created an NCP-compatible upgraded-card template carrying `memorability_profile` + `upgrade_lineage` (`origin_kind`, `source_path`, `source_proposal_id`, `mutation_summary`, `rejected_directions_audit[]`) + a `## Rejected Directions Audit` body section.

## Files to Touch

- `.claude/skills/deepen-character-proposal/SKILL.md` (new)
- `.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md` (new)

## Out of Scope

- Any canon write (the skill routes canon-requiring facts; it never writes CF/CH records).
- Any CHAR dossier write (that is `character-generation`, 003).
- A dedicated `character_proposal_upgrade` MCP task type / ranking profile / budget (deferred per §Phase 6 / Out of Scope).
- An `NCU-<integer>` upgrade-audit record class (deferred; the compact audit lives in `upgrade_lineage.rejected_directions_audit[]`).

## Acceptance Criteria

### Tests That Must Pass

1. `test -f .claude/skills/deepen-character-proposal/SKILL.md` and `test -f .claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md`.
2. `grep -n "task_type='propose_new_characters'\|propose_new_characters" .claude/skills/deepen-character-proposal/SKILL.md` confirms reuse; `grep -c "character_proposal_upgrade" .claude/skills/deepen-character-proposal/SKILL.md` returns 0.
3. Manual contract review confirms the skill can consume both a markdown brief and an existing NCP card, requires a preview before write, composes one upgraded NCP card with a ≥3-entry rejected-directions audit, and routes canon-requiring implied facts without writing canon.

### Invariants

1. The skill mutates only `worlds/<world_slug>/character-proposals/`; never canon, never CHAR dossiers.
2. Emitted-card field names match the shared reference (001) and the `propose-new-characters` proposal-card template completed in `archive/tickets/SPEC52PROGRACHA-002.md`.
3. No new MCP task type is introduced (Phase 6 no-op); the Mystery Reserve firewall is loaded and never weakened (Rule 7).

## Test Plan

### New/Modified Tests

1. `None — skill-authoring ticket; verification is grep-proof + manual contract review, named in Assumption Reassessment and Acceptance.`

### Commands

1. `grep -nE "<HARD-GATE>|propose_new_characters|memorability_profile|upgrade_lineage" .claude/skills/deepen-character-proposal/SKILL.md`
2. Manual contract review: inspect `.claude/skills/deepen-character-proposal/SKILL.md` and `templates/upgraded-proposal-card.md` against the shared reference, SPEC-52 Phase 2, and the NCP proposal-card template.

## Outcome

Completed: 2026-05-20

Created `.claude/skills/deepen-character-proposal/SKILL.md` and `.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md`. The new skill is a single-seed protagonist-grade NCP upgrade workflow with approval-gated writes, reuses `task_type='propose_new_characters'`, confines mutations to `worlds/<world_slug>/character-proposals/`, omits NCB manifests for single-seed upgrades, routes canon-requiring implications to `canon-addition` or `propose-new-canon-facts`, and never writes canon or CHAR dossiers.

## Verification Result

1. `test -f .claude/skills/deepen-character-proposal/SKILL.md` — passed.
2. `test -f .claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md` — passed.
3. `grep -nE "<HARD-GATE>|propose_new_characters|memorability_profile|upgrade_lineage" .claude/skills/deepen-character-proposal/SKILL.md` — passed.
4. `grep -c "character_proposal_upgrade" .claude/skills/deepen-character-proposal/SKILL.md` — returned `0`; no dedicated upgrade task type was introduced.
5. Field-name grep over `.claude/skills/deepen-character-proposal/SKILL.md` and `templates/upgraded-proposal-card.md` — passed; all 10 protagonist-grade engine field names appear on the new skill/template surfaces.
6. Manual contract review — passed; the skill preserves Rule 2 world-producedness, Rule 7 canon routing, the no-canon/no-CHAR write boundary, explicit preview/approval gating, and the shared `memorability_profile` / `upgrade_lineage` contract.

## Deviations

- The drafted skill dry-run proof was replaced with manual contract review plus grep proof because this Codex session has no executable runner for `.claude/skills/deepen-character-proposal` that can produce non-writing previews from a markdown brief and an existing NCP card.
