# SPEC92SCERANPRO-008: branching-story-scene-plan skill

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new skill `.claude/skills/branching-story-scene-plan/` plus focused skill references; no impact on existing skills (additive; the page-plan pipeline coexists).
**Deps**: archive/tickets/SPEC92SCERANPRO-003.md, archive/tickets/SPEC92SCERANPRO-004.md, archive/tickets/SPEC92SCERANPRO-005.md, archive/tickets/SPEC92SCERANPRO-006.md

## Problem

External prose is currently planned per-PG. This skill introduces scene-level planning: select a contiguous single-branch PG range, create / supersede the SCN record, and derive a renderer-clean novelist-facing scene plan from the committed PGs — rendering once per scene instead of per PG.

## Assumption Reassessment (2026-05-28)

1. At intake, no `.claude/skills/branching-story-scene-plan/` existed. This ticket added the skill and references that compose the `create_scn_record` / `supersede_scn_record` op (-003), the SCN allocator + retrieval (-004), the world-index SCN reads (-005), and the scene-plan validators (-006) — all Deps.
2. SPEC-92 §2 (skill), §4 (boundary selection), §5 (scene-plan structure) define the skill. The renderer-clean section list + verbatim §2/§3/§render-time come from the contract (-001).
3. Cross-artifact boundary under audit: the skill consumes the op (-003), allocator/retrieval (-004), index (-005), and validators (-006); it produces `_source/scenes/SCN-<n>.yaml` (via the op) + `scene-prose-plans/SCN-<n>.md` (direct markdown write). It reads committed PGs via MCP retrieval, NOT from sibling prose plans.
4. FOUNDATIONS §Tooling Recommendation (derive the scene plan from committed PG records via `get_record` / `get_records` / `get_context_packet`, never from prose) + §Story Bundles §5c (no narrative-shape framing) motivate the skill.
5. Skill HARD-GATE / Canon Safety surface: the skill carries a HARD-GATE requiring explicit user approval before any write, AND — per the SPEC-92 reassessment (finding M3) — a judgment-level §5c affirmation (author confirms `scene_descriptor` / `boundary_rationale` describe committed beats, not future dramatic obligation). The token validator (-006) is the deterministic backstop; this affirmation is the semantic guard. Confirm the skill writes no world-canon and touches no MR firewall (story-bundle scope; SCN is non-authoritative).
6. Live reassessment found no executable story-skill runner or checked fixture world in this checkout for an actual `branching-story-scene-plan` dry-run. The accepted proof is therefore skill contract review plus grep proof over the new skill and references, and source review against the live validator names implemented by -006.

## Architecture Check

1. The skill derives the scene plan from committed PG records (authoritative state) rather than from prose plans — removing the page-plan crutch and satisfying §Tooling Recommendation. Boundary selection is auto-suggest + manual override.
2. No shims: the skill is net-new; it does not modify the page-plan skills (coexistence).

## Verification Layers

1. Scene plan derived from PG records (not prose) -> skill-prose review + §Tooling alignment check.
2. SCN range contiguous / single-branch / no-sibling -> the -006 validators (skill invokes them pre-commit).
3. Renderer body zero-ID/hash/validator; §2/§3/§render-time verbatim -> the -006 validators.
4. §5c affirmation present in the HARD-GATE -> skill-structure review + grep-proof.

## Landed Changes

### 1. New skill SKILL.md (+ references)

Authored `branching-story-scene-plan/SKILL.md`: pre-flight (load FOUNDATIONS + shared contract), HARD-GATE (user approval + §5c affirmation), boundary selection (default policy + manual override), SCN create/supersede via `create_scn_record` / `supersede_scn_record`, scene-plan derivation from committed PGs, renderer-clean structure per the contract, and candidate/live validation duties.

Added focused references for boundary/range selection, scene-plan structure, and validation/write order.

## Files to Touch

- `.claude/skills/branching-story-scene-plan/SKILL.md` (new)
- `.claude/skills/branching-story-scene-plan/references/boundary-and-range.md` (new)
- `.claude/skills/branching-story-scene-plan/references/scene-plan-structure.md` (new)
- `.claude/skills/branching-story-scene-plan/references/validation-and-write-order.md` (new)

## Out of Scope

- The scene-prose-attach skill (-009).
- Validator / op / schema implementation (-002 / -003 / -006).
- FOUNDATIONS §7 roster update + WORKFLOWS invocation entry (-010).

## Acceptance Criteria

### Tests That Must Pass

1. Skill contract review: scene-plan over a contiguous PG range is specified to produce a renderer-clean plan + SCN record; the -006 validators are named as required zero-FAIL gates.
2. Skill contract review: sibling-branch ranges are rejected through `branch_path` / single-branch / no-sibling checks and `scene_range_integrity`.
3. Skill pre-flight loads FOUNDATIONS + the shared contract; HARD-GATE + §5c affirmation present (grep-proof).

### Invariants

1. The scene plan is derived from committed PG records, never from a prose plan.
2. The skill writes no world-canon and creates no causal state (SCN is non-authoritative).

## Test Plan

### New/Modified Tests

1. `None — skill deliverable; verification is skill contract review + grep-proof of HARD-GATE / §5c affirmation / validator names, per Assumption Reassessment.`

### Commands

1. `rg -n "HARD-GATE|5c|scene_descriptor|branching-story-scene-plan|scene_plan_|scn_no_narrative_shape_language|scene_range_integrity" .claude/skills/branching-story-scene-plan`
2. Manual contract review against `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.20, and the live validator names in `tools/validators/src/structural/`.

## Outcome

Completed: 2026-05-28

Added `.claude/skills/branching-story-scene-plan/` as a new content-generating story skill. The skill loads FOUNDATIONS and shared story contracts, requires a HARD-GATE before SCN patch submission or direct scene-plan writes, derives scene plans from committed PG records via typed retrieval, encodes the SPEC-92 §5c judgment affirmation for `scene_descriptor` / `boundary_rationale`, and routes SCN membership changes through `create_scn_record` / `supersede_scn_record`.

The new references keep the large workflow readable while making the boundary/range rules, renderer-clean scene-plan shape, and validation/write order explicit.

## Verification Result

1. `rg -n "HARD-GATE|5c|scene_descriptor|branching-story-scene-plan|scene_plan_|scn_no_narrative_shape_language|scene_range_integrity" .claude/skills/branching-story-scene-plan` passed: the new skill contains the HARD-GATE, §5c affirmation, `scene_descriptor` handling, and the live SPEC-92 validator names.
2. Manual contract review passed against `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.20, and the live validator implementations under `tools/validators/src/structural/`.

## Deviations

The drafted proof named a live skill dry-run against a fixture bundle. This checkout does not provide an executable story-skill runner or checked fixture world for that dry-run, so the ticket narrowed proof to the strongest available skill-deliverable surface: contract review plus grep proof over the new skill and references.
