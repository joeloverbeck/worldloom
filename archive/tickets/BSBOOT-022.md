# BSBOOT-022: Truth storylet-pool-authoring bootstrap seed sizing docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `storylet-pool-authoring` skill prose only. No tool, validator, schema, patch-engine, or world-content change.
**Deps**: archive/tickets/BSBOOT-011.md

## Problem

At intake, BSBOOT-011 had made `branching-story-bootstrap` compute the bootstrap seed `target_pool_size` from `intended_scale` + state complexity, with `storylet_pool_seed_size` as an explicit override. That changed the bootstrap caller contract, but `storylet-pool-authoring` still contained stale downstream wording:

- `.claude/skills/storylet-pool-authoring/SKILL.md:3` described "`seed` mode (~20 storylets, invoked by branching-story-bootstrap Phase 6 as a no-write sub-routine)".
- `.claude/skills/storylet-pool-authoring/SKILL.md:19` said `target_pool_size` defaults to "~20 in seed mode".
- `.claude/skills/storylet-pool-authoring/SKILL.md:195` said the seed-mode default is calibrated for fresh story bundles, explicitly naming the `parent_skill_invocation: true` bootstrap sub-routine path.

That wording conflated two different callers:

1. `branching-story-bootstrap` parent invocation, where the caller supplies a computed `target_pool_size` per `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` §Computing target_pool_size.
2. Direct `storylet-pool-authoring` seed/top-up invocation against an existing bundle, where the existing `~20` / top-up arithmetic remains a reasonable local default.

Leaving the stale wording in place would have made operators think bootstrap still asks `storylet-pool-authoring` for a fixed 20-ish seed pool even though the bootstrap-side formula had landed.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-011.md` completed the bootstrap-side formula and archived the active ticket. The landed bootstrap Phase 6 reference now says bootstrap computes `target_pool_size` from `intended_scale` + state complexity and passes either that computed value or the explicit `storylet_pool_seed_size` override.
2. At intake, `.claude/skills/storylet-pool-authoring/SKILL.md:3,19,195` still carried fixed `~20` bootstrap-seed/default wording. The stale surface was prose only; no code, schema, validator, or engine op consumed the phrase.
3. Cross-skill / cross-artifact boundary: `branching-story-bootstrap` is the producer/caller of the bootstrap seed sizing decision; `storylet-pool-authoring` is the downstream sub-routine that receives `target_pool_size`.
4. `branching-story-page-cycle` was reviewed as a downstream consumer. Its JIT path uses `storylet-pool-authoring mode=jit` with `target_pool_size=1`, and its normal path reads whatever storylet pool exists. It does not compute or validate bootstrap seed pool size.
5. `branching-story-health-audit` was reviewed as a downstream consumer. It audits the current storylet pool and batch history, emits RSP cards for `storylet-pool-authoring mode=audit`, and does not use the bootstrap formula or a fixed seed default.
6. `story-fact-promotion-to-canon` was reviewed as a downstream consumer. It checks canon-promotion and mystery-resolution authority; it does not consume storylet pool sizing.
7. FOUNDATIONS alignment: this is a documentation truthing ticket for a canon-reading/content-generation skill. It does not weaken HARD-GATE semantics, Mystery Reserve handling, canon mutation discipline, or append-only ID allocation.
8. Adjacent contradiction classification: `tickets/BSBOOT-012.md` already owns SLT id pre-allocation using the completed `target_pool_size` formula, but it does not own `storylet-pool-authoring`'s stale default-size wording. This ticket is a separate downstream truthing slice.

## Architecture Check

1. **Why cleaner**: split the documented sizing authority by caller. Bootstrap owns scale-aware sizing for fresh bundle creation; `storylet-pool-authoring` owns direct seed/top-up defaults for existing bundles and the invariant that it honors caller-supplied `target_pool_size`.
2. No backwards-compatibility aliasing/shims introduced. This is prose truthing only.

## Verification Layers

1. Bootstrap parent invocation does not advertise a fixed `~20` pool in `storylet-pool-authoring` -> codebase grep-proof over `storylet-pool-authoring/SKILL.md`.
2. Direct seed/top-up default remains documented as local to direct invocation -> manual review of `storylet-pool-authoring/SKILL.md` `target_pool_size` argument and Inputs section.
3. Non-consuming downstream skills remain untouched -> codebase grep-proof that `branching-story-page-cycle`, `branching-story-health-audit`, and `story-fact-promotion-to-canon` do not contain stale BSBOOT-011-specific seed-size claims.

## Landed Changes

### 1. `.claude/skills/storylet-pool-authoring/SKILL.md`

- In the skill description, replaced "`seed` mode (~20 storylets, invoked by branching-story-bootstrap Phase 6 as a no-write sub-routine)" with wording that distinguishes:
  - direct seed mode defaults to the skill's local seed/top-up sizing, and
  - bootstrap parent invocation supplies a computed `target_pool_size`.
- In the `target_pool_size` argument doc, replaced "Default: ~20 in seed mode" with wording that says:
  - direct seed mode defaults to the local seed/top-up rules in Inputs §`target_pool_size`;
  - bootstrap parent invocation requires the caller-supplied computed `target_pool_size`.
- In Inputs §`target_pool_size`, removed the statement that the seed-mode default is calibrated for fresh bootstrap bundles. Preserved the existing direct seed/top-up rules for existing bundles, and added a bootstrap-parent sentence pointing to `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` §Computing `target_pool_size`.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)

## Out of Scope

- Editing `branching-story-bootstrap`; BSBOOT-011 already landed the producer formula.
- Editing `branching-story-page-cycle`; its JIT path remains `target_pool_size=1` and does not consume bootstrap sizing.
- Editing `branching-story-health-audit`; it audits the realized/current pool and RSP routing, not bootstrap sizing.
- Editing `story-fact-promotion-to-canon`; it is a canon-promotion workflow and does not consume storylet pool size.
- Changing `storylet-pool-authoring` generation, validation, schema, or direct seed/top-up arithmetic.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n '~20 storylets|~20-storylet|fresh story bundles \\(existing pool size 0' .claude/skills/storylet-pool-authoring/SKILL.md` returns no stale bootstrap-parent wording.
2. `rg -n 'computed target_pool_size|Computing target_pool_size|branching-story-bootstrap/references/phase-6-storylet-pool-seed.md' .claude/skills/storylet-pool-authoring/SKILL.md` returns matches showing bootstrap parent invocation consumes the BSBOOT-011 formula.
3. `rg -n 'target_pool_size=1|target_pool_size\\s*=\\s*1|mode=jit|mode=.jit.' .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring/SKILL.md` confirms the page-cycle JIT path remains one-storylet sized and untouched.
4. `rg -n 'target_pool_size|storylet_pool_seed_size|~20|20-storylet|20 storylet' .claude/skills/branching-story-health-audit .claude/skills/story-fact-promotion-to-canon` returns no BSBOOT-011 sizing consumers, or only unrelated examples that are manually classified.

### Invariants

1. Bootstrap fresh-bundle seed sizing is owned by `branching-story-bootstrap`.
2. `storylet-pool-authoring` honors caller-supplied `target_pool_size`.
3. Direct seed/top-up defaults for existing bundles remain `storylet-pool-authoring` local policy.
4. Page-cycle JIT remains exactly one branch-scoped storylet.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual consumer review.

### Commands

1. `rg -n '~20 storylets|~20-storylet|fresh story bundles \(existing pool size 0' .claude/skills/storylet-pool-authoring/SKILL.md`
2. `rg -n 'computed target_pool_size|Computing target_pool_size|branching-story-bootstrap/references/phase-6-storylet-pool-seed.md' .claude/skills/storylet-pool-authoring/SKILL.md`
3. `rg -n 'target_pool_size=1|target_pool_size\s*=\s*1|mode=jit|mode=.jit.' .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring/SKILL.md`
4. `rg -n 'target_pool_size|storylet_pool_seed_size|~20|20-storylet|20 storylet' .claude/skills/branching-story-health-audit .claude/skills/story-fact-promotion-to-canon`

## Outcome

Updated `.claude/skills/storylet-pool-authoring/SKILL.md` so bootstrap parent invocation no longer appears to request a fixed `~20` seed pool. The skill now documents direct seed/top-up sizing as local policy, while bootstrap parent invocation supplies the computed `target_pool_size` from `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` §Computing `target_pool_size`, or the explicit `storylet_pool_seed_size` override.

No tool, validator, schema, patch-engine, or world-content changes were made.

## Verification Result

1. `rg -n '~20 storylets|~20-storylet|fresh story bundles \(existing pool size 0' .claude/skills/storylet-pool-authoring/SKILL.md` — passed with no matches.
2. `rg -n 'computed target_pool_size|Computing target_pool_size|branching-story-bootstrap/references/phase-6-storylet-pool-seed.md' .claude/skills/storylet-pool-authoring/SKILL.md` — passed; matches show bootstrap parent invocation consumes the computed target and points to the Phase 6 formula reference.
3. `rg -n 'target_pool_size=1|target_pool_size\s*=\s*1|mode=jit|mode=.jit.' .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring/SKILL.md` — passed; matches are the existing JIT-mode/page-cycle references, including `target_pool_size=1`.
4. `rg -n 'target_pool_size|storylet_pool_seed_size|~20|20-storylet|20 storylet' .claude/skills/branching-story-health-audit .claude/skills/story-fact-promotion-to-canon` — passed with no matches.

## Deviations

None.
