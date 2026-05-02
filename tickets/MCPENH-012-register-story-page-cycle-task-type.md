# MCPENH-012: Register `story_page_cycle` task type for context-packet retrieval

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (context-packet profile registry), `.claude/skills/branching-story-page-cycle/SKILL.md` (revert `task_type='other'` fallback after landing)
**Deps**: MCPENH-009 (story_bootstrap task type precedent)

## Problem

`branching-story-page-cycle` Pre-flight loads premise-and-state-bounded world canon via `mcp__worldloom__get_context_packet(world_slug, task_type='story_page_cycle', seed_nodes=[...], token_budget=18000)`. The `task_type='story_page_cycle'` profile is NOT yet registered in the context-packet retrieval profile registry. Until landed, the skill ships with `task_type='other'` as a fallback (per Shape A integration posture).

The fallback works (the skill assembles seed nodes explicitly and `task_type='other'` returns a generic packet), but loses the per-task-class prioritization that the registered profile would encode — specifically:

- World-canon CFs scoped to `seed_nodes` (cast_present STENT.world_ent_id resolution + parent_page.current_location + active period)
- INV records governing the seed scope (subset of the whole-class load — the page-cycle still does whole-class loading separately, but a packet-level INV layer would prioritize governing INVs near the top of the budget)
- Mystery Reserve records orbiting the seed scope (subset of the whole-class load — same logic as INV)
- Named-entity neighbors of seeds (one-hop relation resolution)
- WORLD_KERNEL summary + ONTOLOGY governing context (top-of-packet always)

Without a registered profile, the page-cycle's runtime context retrieval is shaped by `task_type='other'`'s generic priorities, which over-fetch peripheral records and under-prioritize the cast-and-location-scoped CF/INV/M layer the runtime actually needs.

## Assumption Reassessment (2026-05-02)

1. The current context-packet profile registry lives under `tools/world-mcp/src/context-packet/` per the file listing in CLAUDE.md's repository layout. MCPENH-009 added the `story_bootstrap` profile; this ticket follows the same pattern. Confirm the actual file path before implementation: `grep -r "story_bootstrap" tools/world-mcp/src/`.
2. `branching-story-bootstrap`'s `task_type='story_bootstrap'` profile (per MCPENH-009) is the structural precedent. The page-cycle profile is similar but state-bounded (parent_page.state_snapshot is the bedrock; cast_present and current_location come from there) rather than premise-bounded (the bootstrap derives seeds from the user's premise text). The two profiles share the prioritization shape but differ in seed-resolution semantics.
3. The shared boundary under audit is the contract between (a) `branching-story-page-cycle` Pre-flight retrieval, (b) the context-packet assembler, and (c) the page-cycle's downstream Phase 4 / Phase 7 / Phase 9 consumers (which read CF / INV / M / ENT records identified by the packet).
4. **FOUNDATIONS principle**: §Tooling Recommendation's "non-negotiable" load discipline. The recommendation says "skills should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + Invariants + relevant CFs + affected domain files + unresolved contradictions list + Mystery Reserve entries touching the same domain." The registered profile is what makes the recommendation operational for this skill's task class.
5. This ticket does NOT touch HARD-GATE semantics. It tunes retrieval prioritization within an existing read mechanism.
6. Adds a single profile entry; does not modify the retrieval API shape. Additive-only. Consumers of `task_type='other'` are unaffected.
7. No skill / tool / hook / validator / schema field is renamed or removed.
8. No adjacent contradictions exposed.

## Architecture Check

1. Per-task-class profiles are the right primitive (vs a one-size-fits-all retrieval). The packet shape and prioritization are task-specific by design — `propose_new_canon_facts` retrieves differently than `story_bootstrap` differently than `story_page_cycle`. The MCPENH-009 precedent established the pattern; this ticket continues it.
2. No backwards-compatibility aliasing: a new profile entry is added; nothing is renamed.

## Verification Layers

1. **Profile-registry unit test** — assert `task_type='story_page_cycle'` is registered with the documented prioritization (Kernel/Ontology summary → seed-scoped CFs → governing INVs → orbiting Mystery Reserve entries → named-entity neighbors → recent CH-NNNN audit-trail). Use a fixture world + fixture story bundle.
2. **Skill integration check** — `branching-story-page-cycle` Pre-flight switches from `task_type='other'` to `task_type='story_page_cycle'`; integration smoke test fires the skill against a fixture and asserts the packet contains the expected layers.
3. **Skill-revert sub-task** — after landing, update `.claude/skills/branching-story-page-cycle/SKILL.md` §World-State Prerequisites + §Pre-flight Check + §Guardrails to remove the "Task-type registration deferred per `tickets/MCPENH-012`" disclosures and the `task_type='other'` fallback prose. Replace with a single `task_type='story_page_cycle'` call.

## What to Change

### 1. Add profile registration

Register `story_page_cycle` in the context-packet profile registry with prioritization:

- **Top layer** (always included): `WORLD_KERNEL` summary + `ONTOLOGY` Categories + Relation Types in use.
- **Layer 1**: CFs reachable from `seed_nodes` (cast_present's world ENT ids + parent_page.current_location + active period). Hard-canon CFs prioritized over derived/soft.
- **Layer 2**: INV records governing the seed-scoped CFs (subset of the whole-class load — top-of-packet placement so the runtime has the most-relevant INVs available before falling back to whole-class).
- **Layer 3**: Mystery Reserve records orbiting the seed scope (subset of the whole-class load — same top-of-packet logic).
- **Layer 4**: Named-entity neighbors of seeds (one-hop graph traversal).
- **Layer 5** (audit-trail): the latest `CH-NNNN` record from `_source/change-log/` so the page can record `state_snapshot.canon_revision`.

### 2. Document the profile

Add a section to `docs/CONTEXT-PACKET-CONTRACT.md` (or wherever profile docs live) describing `story_page_cycle`'s prioritization, parallel to MCPENH-009's `story_bootstrap` documentation.

### 3. Skill-revert (after landing)

Remove the deferred-MCPENH-012 disclosure and the `task_type='other'` fallback prose from `branching-story-page-cycle` SKILL.md.

## Files to Touch

- `tools/world-mcp/src/context-packet/profiles/` (or actual location — confirm via grep) (modify or new)
- `tools/world-mcp/src/context-packet/` profile-registry test file (modify or new)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — add `story_page_cycle` profile section)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify post-landing — separate revert sub-task)

## Out of Scope

- Adding profiles for `storylet-pool-authoring`, `story-fact-promotion-to-canon`, or `branching-story-health-audit` — those skills don't exist yet; their profiles ship with their generation.
- Optimizing the whole-class M / INV loads — those remain whole-class for the page-cycle's class-bounded firewall semantics, separate from the packet's prioritization layer.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__get_context_packet(world_slug='animalia', task_type='story_page_cycle', seed_nodes=['entity:wolf-pack', 'entity:village-square'], token_budget=18000)` returns a packet with the documented six-layer structure.
2. The packet's `truncation_summary` reports an honest layer-truncation order (CF before ENT before audit-trail) when token budget forces drops.
3. `branching-story-page-cycle` integration test: fire the skill against a fixture story bundle; assert Pre-flight's retrieval call uses `task_type='story_page_cycle'` and the packet returns expected layers.

### Invariants

1. The registered profile is additive — consumers using `task_type='other'` continue to receive the generic packet shape.
2. No story-bundle records are loaded by the packet (the packet returns world-canon only; story-bundle records are direct-Read by the skill itself).

## Test Plan

### New/Modified Tests

1. Profile-registry unit test for `story_page_cycle` (mirror MCPENH-009's test for `story_bootstrap`).
2. `branching-story-page-cycle` integration smoke test: assert Pre-flight retrieval uses the registered profile.

### Commands

1. `pnpm --filter world-mcp test` (or equivalent) for the profile-registry tests.
2. Manual smoke: bootstrap a fixture story, run one page-cycle turn, inspect the assembled packet shape against the documented layers.
