# SPEC92SCERANPRO-008: branching-story-scene-plan skill

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new skill `.claude/skills/branching-story-scene-plan/`; no impact on existing skills (additive; the page-plan pipeline coexists).
**Deps**: archive/tickets/SPEC92SCERANPRO-003.md, archive/tickets/SPEC92SCERANPRO-004.md, archive/tickets/SPEC92SCERANPRO-005.md, SPEC92SCERANPRO-006

## Problem

External prose is currently planned per-PG. This skill introduces scene-level planning: select a contiguous single-branch PG range, create / supersede the SCN record, and derive a renderer-clean novelist-facing scene plan from the committed PGs — rendering once per scene instead of per PG.

## Assumption Reassessment (2026-05-28)

1. No `.claude/skills/branching-story-scene-plan/` exists yet (new skill). It composes the `create_scn_record` op (-003), the SCN allocator + retrieval (-004), the world-index SCN reads (-005), and the scene-plan validators (-006) — all Deps.
2. SPEC-92 §2 (skill), §4 (boundary selection), §5 (scene-plan structure) define the skill. The renderer-clean section list + verbatim §2/§3/§render-time come from the contract (-001).
3. Cross-artifact boundary under audit: the skill consumes the op (-003), allocator/retrieval (-004), index (-005), and validators (-006); it produces `_source/scenes/SCN-<n>.yaml` (via the op) + `scene-prose-plans/SCN-<n>.md` (direct markdown write). It reads committed PGs via MCP retrieval, NOT from sibling prose plans.
4. FOUNDATIONS §Tooling Recommendation (derive the scene plan from committed PG records via `get_record` / `get_records` / `get_context_packet`, never from prose) + §Story Bundles §5c (no narrative-shape framing) motivate the skill.
5. Skill HARD-GATE / Canon Safety surface: the skill carries a HARD-GATE requiring explicit user approval before any write, AND — per the SPEC-92 reassessment (finding M3) — a judgment-level §5c affirmation (author confirms `scene_descriptor` / `boundary_rationale` describe committed beats, not future dramatic obligation). The token validator (-006) is the deterministic backstop; this affirmation is the semantic guard. Confirm the skill writes no world-canon and touches no MR firewall (story-bundle scope; SCN is non-authoritative).

## Architecture Check

1. The skill derives the scene plan from committed PG records (authoritative state) rather than from prose plans — removing the page-plan crutch and satisfying §Tooling Recommendation. Boundary selection is auto-suggest + manual override.
2. No shims: the skill is net-new; it does not modify the page-plan skills (coexistence).

## Verification Layers

1. Scene plan derived from PG records (not prose) -> skill-prose review + §Tooling alignment check.
2. SCN range contiguous / single-branch / no-sibling -> the -006 validators (skill invokes them pre-commit).
3. Renderer body zero-ID/hash/validator; §2/§3/§render-time verbatim -> the -006 validators.
4. §5c affirmation present in the HARD-GATE -> skill-structure review + grep-proof.

## What to Change

### 1. New skill SKILL.md (+ references)

Author `branching-story-scene-plan/SKILL.md`: pre-flight (load FOUNDATIONS + shared contract), HARD-GATE (user approval + §5c affirmation), boundary selection (default policy + manual override), SCN create/supersede via `create_scn_record`, scene-plan derivation from committed PGs, renderer-clean structure per the contract, scene-plan validators invoked pre-commit.

## Files to Touch

- `.claude/skills/branching-story-scene-plan/SKILL.md` (new)
- `.claude/skills/branching-story-scene-plan/references/*.md` (new, as needed — boundary policy / scene-plan structure)

## Out of Scope

- The scene-prose-attach skill (-009).
- Validator / op / schema implementation (-002 / -003 / -006).
- FOUNDATIONS §7 roster update + WORKFLOWS invocation entry (-010).

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: scene-plan over a contiguous PG range produces a renderer-clean plan + SCN record; the -006 validators pass.
2. Skill dry-run with a sibling-branch range is rejected (no-sibling rule).
3. Skill pre-flight loads FOUNDATIONS + the shared contract; HARD-GATE + §5c affirmation present (grep-proof).

### Invariants

1. The scene plan is derived from committed PG records, never from a prose plan.
2. The skill writes no world-canon and creates no causal state (SCN is non-authoritative).

## Test Plan

### New/Modified Tests

1. `None — skill deliverable; verification is skill dry-run + grep-proof of HARD-GATE / §5c affirmation, per Assumption Reassessment.`

### Commands

1. Skill dry-run (manual): invoke `branching-story-scene-plan` against a fixture bundle's committed PG range; inspect the SCN record + scene plan without commit.
2. `grep -n "HARD-GATE\|5c\|scene_descriptor" .claude/skills/branching-story-scene-plan/SKILL.md`
