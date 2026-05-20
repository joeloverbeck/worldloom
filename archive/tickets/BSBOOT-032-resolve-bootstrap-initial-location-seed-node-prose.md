# BSBOOT-032: Resolve bootstrap initial-location seed-node prose to world-scope anchors

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` skill prose only.
**Deps**: `archive/tickets/MCPENH-058.md`

## Problem

At intake, `branching-story-bootstrap` still instructed callers to request world canon context with `seed_nodes=<cast CHAR ids + initial_location label if provided>`. An `initial_location` argument is a proposed story-local `STLOC` label plus grounding canon, not necessarily an indexed world-scope node id. During the `red-bunny` bootstrap run, that exact prose caused `get_context_packet(... seed_nodes=["the park near the Leka Enea school"])` to fail before MCPENH-058 hardened the tool. After MCPENH-058, the packet no longer aborts, but the skill still taught a lossy call shape: the free-text location label was skipped with a warning instead of anchoring local authority.

This ticket owns the caller-side prose correction for bootstrap. The skill now tells callers to resolve any location grounding to world-scope anchors before the packet call, or omit the location from `seed_nodes` when no such anchor exists.

## Assumption Reassessment (2026-05-20)

1. At intake, live skill prose still named the bad call shape in `.claude/skills/branching-story-bootstrap/SKILL.md`: the World-State Prerequisites bullet said `seed_nodes=<cast CHAR ids + initial_location label if provided>`, and Pre-flight step 6 repeated the same phrase. This ticket replaced both with `seed_nodes=<world-scope seed ids>` plus explicit world-anchor eligibility rules.
2. MCPENH-058 landed the server-side robustness layer and public docs: unresolved seed nodes are skipped with `task_header.warnings[]`; they are not name-resolved to entities. That makes the bootstrap prose issue a remaining authoring-discipline problem, not an MCP behavior bug.
3. Shared boundary under audit: `branching-story-bootstrap` is the story-pipeline caller, and `get_context_packet` is the retrieval consumer. The caller must pass only world-scope seed ids; story-local or free-text location material should use `story_slug` and targeted retrieval paths, not `seed_nodes`.
4. FOUNDATIONS §Tooling Recommendation requires story-pipeline skills to depend on the MCP retrieval surface for world-canon reads. This ticket keeps bootstrap on that surface while making its seed-node guidance compatible with world-scope retrieval.
5. Adjacent coverage check: `archive/tickets/SPEC32STOCONHAR-003.md` fixed the analogous `branching-story-turn-cycle` ambiguity for active cast/location story-local IDs. It did not touch bootstrap's `initial_location` label prose.

## Architecture Check

1. Correcting the skill prose is cleaner than adding location-label resolution inside `get_context_packet`; the MCP tool should resolve graph node ids, not infer entity matches from free-text authoring labels.
2. No backwards-compatibility shim is introduced. The skill's pre-flight call shape becomes explicit about seed-node eligibility.

## Verification Layers

1. Bootstrap seed guidance no longer says to pass `initial_location label` as a seed node -> grep-proof against `.claude/skills/branching-story-bootstrap/SKILL.md`.
2. Bootstrap pre-flight explains the resolution path -> manual review confirms it says to derive location seeds from world-scope anchors such as existing `ENT`, `SEC`, `CF`, `M`, or `OQ` ids, and to omit the location seed when only a free-text label exists.
3. MCP graceful degradation remains unchanged -> no MCP code changes; MCPENH-058's existing package tests remain the behavior proof.

## Landed Changes

### 1. World-State Prerequisites packet bullet

Replaced `seed_nodes=<cast CHAR ids + initial_location label if provided>` with wording that requires world-scope seed ids only. The wording tells bootstrap callers to:

- include selected cast `CHAR-<integer>` ids;
- include location-related world-scope anchors only when `initial_location` grounding already identifies them;
- derive those anchors from existing world `ENT`, `SEC`, `CF`, `M`, or `OQ` ids when applicable;
- omit the location from `seed_nodes` when the input is only a proposed STLOC/free-text label.

### 2. Pre-flight Check step 6

Mirrored the same rule in the executable pre-flight checklist so the call shape and the checklist cannot drift.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)

## Out of Scope

- MCP server behavior changes.
- Free-text entity-name resolution inside `get_context_packet`.
- Changes to story-bundle record schemas, validators, or world content.
- Reworking unrelated bootstrap phases.

## Acceptance Criteria

### Tests That Passed

1. `rg -n "initial_location label if provided" .claude/skills/branching-story-bootstrap/SKILL.md` returns no matches.
2. `rg -n "world-scope.*seed" .claude/skills/branching-story-bootstrap/SKILL.md` returns matches in both World-State Prerequisites and Pre-flight Check.
3. `rg -n "MCPENH-058|unresolved seed|warnings" .claude/skills/branching-story-bootstrap/SKILL.md` confirms the prose acknowledges that unresolved seeds are skipped with warnings rather than used as anchors.

### Invariants

1. Bootstrap still loads `get_context_packet(world_slug, task_type='story_bootstrap', story_slug=<story_slug>, ...)` during pre-flight.
2. The skill does not weaken its hard gate or move any canon-writing step before user approval.
3. Seed nodes for story-pipeline context remain world-scope ids only; story-local bootstrap records are not passed as `seed_nodes`.

## Test Plan

### New/Modified Tests

1. `None — skill-prose-only ticket; verification is grep/manual review, with MCP behavior already covered by MCPENH-058.`

### Commands

1. `rg -n "initial_location label if provided" .claude/skills/branching-story-bootstrap/SKILL.md` (must return no matches)
2. `rg -n "world-scope.*seed" .claude/skills/branching-story-bootstrap/SKILL.md`
3. `rg -n "MCPENH-058|unresolved seed|warnings" .claude/skills/branching-story-bootstrap/SKILL.md`

## Outcome

Completed: 2026-05-20.

`branching-story-bootstrap` now instructs callers to pass only world-scope seed ids to `get_context_packet` during bootstrap. Selected cast `CHAR-<integer>` ids remain valid seeds; location-related seeds must come from existing world anchors such as `ENT`, `SEC`, `CF`, `M`, or `OQ` ids. Proposed `STLOC` labels and free-text location labels are explicitly omitted from `seed_nodes` unless they have a world-scope anchor.

## Verification Result

1. `rg -n "initial_location label if provided" .claude/skills/branching-story-bootstrap/SKILL.md` returned no matches (exit 1 as the expected no-match proof).
2. `rg -n "world-scope.*seed" .claude/skills/branching-story-bootstrap/SKILL.md` returned two matches: the World-State Prerequisites packet bullet and Pre-flight Check step 6.
3. `rg -n "MCPENH-058|unresolved seed|warnings" .claude/skills/branching-story-bootstrap/SKILL.md` returned two matches: both edited surfaces now describe unresolved-seed warnings and the rule that missing labels are not local authority.
4. Manual review of `.claude/skills/branching-story-bootstrap/SKILL.md` lines 202 and 218 confirmed the edit did not change the existing `<HARD-GATE>` block or any canon-writing order.

## Deviations

No source-code, MCP behavior, schema, validator, or world-content changes were made. A broader discovery grep still finds the old call shape in archived spec/report provenance and in this ticket's historical intake evidence; those are not live bootstrap caller guidance and were left unchanged.
