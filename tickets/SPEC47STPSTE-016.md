# SPEC47STPSTE-016: Update 7 story-pipeline SKILL.md files for STPLAN/STEMO awareness

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — extends 7 story-pipeline SKILL.md files (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) with STPLAN/STEMO-awareness prose; cross-cutting docs ticket landing atomically after all upstream implementation tickets ship
**Deps**: `archive/tickets/SPEC47STPSTE-005.md`, 006, 007, 008, 009, 011, 013, 015

## Problem

SPEC-47's STPLAN/STEMO records, MCP context-packet summaries, world-index edges, predicate-DSL extensions, tag-grammar parser extensions, validator chain, and page-plan template sections all need consuming skill prose so the 7 story-pipeline skills (Skill Category 2c per FOUNDATIONS §Story Bundles §7) actually USE these new surfaces. Without updating the skill SKILL.md files, the new records exist as queryable state but story-pipeline skills don't emit them at bootstrap, don't maintain them at turn-cycle, don't validate them at prose-attach, don't audit them at health-audit, don't author commitment-blocks against them, and don't recognize them at promotion-closeout. This is the §Cross-Cutting Docs Ticket Shape: a single trailing ticket whose Files to Touch are markdown docs landing atomically once all upstream implementation tickets ship.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified all 7 story-pipeline SKILL.md files exist at HEAD per the pre-Write verification: `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`. These are the 7 Skill Category 2c skills per FOUNDATIONS §Story Bundles §7 and per `.claude/skills/skill-audit/references/cross-skill-consistency.md` §Skill Category Classification.
2. Verified SPEC-47 §Approach §C D-C10 specifies updating all 7 SKILL.md files with per-skill prose detail: bootstrap (load-bearing STPLAN/STEMO discipline + first-page §9b/§9c render), turn-cycle (maintenance lifecycle + intro/plan_relation tag emission + §9b/§9c render), prose-attach (prose-validation against §9b/§9c), health-audit (bootstrap-drift check + stale-active-plan + stale-active-emotion + SE-plan-relation consistency walk), commitment-block-authoring (6 new predicates available for SLT preconditions), story-fact-promotion-to-canon (STPLAN/STEMO as evidence context only; not promotion source classes), story-promotion-closeout (canon-verdict-driven supersession of affected STPLAN/STEMO).
3. Cross-skill boundary under audit: the 7 SKILL.md files constitute the operational surface of the story-pipeline (Skill Category 2c). They reference the shared `story-state-contract.md`, the validator framework, the MCP retrieval surface, the world-index edges, and the page-plan template — all of which SPEC-47 extends via tickets 003-015. This cross-cutting docs ticket lands the consuming-skill awareness atomically after all upstream surfaces ship (per the §Cross-Cutting Docs Ticket Shape's "Deps: list every implementation ticket whose surface the docs reference" rule).
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) — story state is authoritative at page-plan commit; rendered prose is supplied externally and validated by prose-attach. Adding STPLAN/STEMO awareness to bootstrap + turn-cycle + prose-attach preserves the §4a discipline: bootstrap seeds load-bearing STPLAN/STEMO at story_start (state authoritative at commit), turn-cycle maintains them at every page (state authoritative at commit), prose-attach validates that rendered prose reflects the planned §9b/§9c content (does not create new STPLAN/STEMO state from prose). Plus §Tooling Recommendation — the per-skill prose updates teach skills to consume the new MCP context-packet summaries and world-index edges via the documented retrieval surface, preserving the "directly or via the documented context-packet + targeted-retrieval pattern" principle.

## Architecture Check

1. Cross-cutting docs ticket landing atomically (rather than per-skill ticket per upstream surface) preserves the documentation coherence — every skill's STPLAN/STEMO awareness ships in one diff that reviewers can verify holistically against the spec. Per-skill granular tickets would force reviewers to mentally reconstruct cross-skill coherence across N separate diffs.
2. No backwards-compatibility aliasing/shims introduced — additions to skill prose only. Existing skill prose continues to work for non-STPLAN/STEMO bundles; the new prose explains when and how to use the new records.

## Verification Layers

1. All 7 SKILL.md files contain STPLAN/STEMO references → codebase grep-proof `grep -lE "STPLAN|STEMO" .claude/skills/branching-story-*/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md | wc -l` returns 7
2. Per-skill prose follows SPEC-47 §Approach §C D-C10 detail → manual review per skill
3. Cross-skill consistency: each skill's STPLAN/STEMO prose references the same canonical surfaces (story-state-contract.md §4.5.17/§4.5.18 schemas; story-state-contract.md §9b/§9c page-plan sections; predicate-DSL grammar at §5; tag grammar at §5a; MCP summaries at CONTEXT-PACKET-CONTRACT.md; world-index edges at MACHINE-FACING-LAYER.md) → grep across SKILL.md files for consistent citations
4. Bootstrap-drift health-audit check named in `branching-story-health-audit/SKILL.md` per SPEC-47 §Approach §C ("SAU mode adds a check flagging STPLAN/STEMO records seeded at story_start that were never queried/superseded/consumed across the bundle's branch tree")

## What to Change

### 1. Update `.claude/skills/branching-story-bootstrap/SKILL.md`

Add load-bearing STPLAN/STEMO discipline ("seed plans for actors whose medium-range agency matters at story start; seed emotions only where load-bearing for choice / prose / state interpretation"). Note first-page plan §9b/§9c render integration (delegate to turn-cycle's render procedure per ticket 015). Discipline lives in skill prose + health-audit drift check (per SPEC-47 §Key Design Decisions item 5); no validator-enforced numeric cap at story_start.

### 2. Update `.claude/skills/branching-story-turn-cycle/SKILL.md`

Add STPLAN/STEMO maintenance lifecycle:
- Create/supersede STPLAN on belief-basis / resource-basis / blocker / status change
- Create/supersede STEMO on causal affective shift (trigger event of one of 7 STEMO trigger categories)
- Emit `intro:STPLAN(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag in SE.world_logic_rationale for mid-story STPLAN introductions
- Emit `intro:STEMO(id=..., trigger=..., evidence=[...], distinct_from=[...])` tag for mid-story STEMO introductions
- Emit `plan_relation:<relation>(plan=STPLAN-X)` tag for SE events citing active plans
- Own the §9b/§9c page-plan render procedure (parallel to existing §10b ownership)

### 3. Update `.claude/skills/branching-story-prose-attach/SKILL.md`

Add prose-validation checks against §9b "Prose must show / must not imply" and §9c "Prose must render / must avoid" sub-bullets. Validate no engine-jargon leak. Validate affective transition presence when §9c marks it required.

### 4. Update `.claude/skills/branching-story-health-audit/SKILL.md`

Add 4 new check categories:
- Bootstrap-drift check (STPLAN/STEMO seeded at story_start never queried/superseded/consumed across branch tree)
- Stale-active-plan check (STPLAN with plan_status: active whose belief_basis/resource_basis records are inactive or superseded)
- Stale-active-emotion check (STEMO with status: active for many pages with no reflection/transformation/suppression)
- SE-plan-relation consistency walk (SE events with `plan_relation:advances(plan=X)` tag must create/supersede records cited by plan X's current_step.target_records or success_condition.predicates)

### 5. Update `.claude/skills/commitment-block-authoring/SKILL.md`

Note the 6 new predicates available for SLT preconditions (plan_active, plan_blocked, any_plan_active, emotion_active, any_emotion_active, emotion_pressure). Add plan/emotion-aware authoring patterns. Coverage targets unchanged (the existing 11 causal-function coverage targets cover plan/emotion-driven moves under the existing taxonomy without adding a new family).

### 6. Update `.claude/skills/story-fact-promotion-to-canon/SKILL.md`

Note STPLAN/STEMO are evidence context only (citable in promotion-proposal rationale); not promotion source classes. The 6 existing source kinds (story_fact, mystery_resolution, character_outcome, artifact_canonization, relationship_or_institutional_outcome, other_branch_claim) remain the closed set.

### 7. Update `.claude/skills/story-promotion-closeout/SKILL.md`

Add canon-verdict-driven supersession logic: when a canon verdict invalidates a plan's `belief_basis` or an emotion's `appraisal_basis`, the closeout flow may supersede the affected STPLAN with `plan_status: abandoned` or STEMO with `status: transformed`, citing the canon verdict (`PA-<integer>`) as closure-event evidence in the supersession's `SE.world_logic_rationale`.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)

## Out of Scope

- Code-side implementation of the new surfaces (validators, MCP summaries, edges, predicates, parser, page-plan sections) — covered by tickets 005-015.
- Contract docs synchronization (story-state-contract.md §3 / §5 / §5a / §8) — covered by tickets 002, 010, 015.
- World-index docs and CONTEXT-PACKET-CONTRACT.md — covered by tickets 012, 014.
- Per-skill ticket decomposition (this ticket is intentionally cross-cutting per the §Cross-Cutting Docs Ticket Shape).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -lE "STPLAN|STEMO" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md | wc -l` returns 7.
2. `grep -nE "intro:STPLAN|intro:STEMO|plan_relation:" .claude/skills/branching-story-turn-cycle/SKILL.md` returns matches (turn-cycle owns tag emission).
3. `grep -nE "bootstrap-drift|stale-active-plan|stale-active-emotion|SE-plan-relation consistency" .claude/skills/branching-story-health-audit/SKILL.md` returns matches (4 new check categories).
4. `grep -nE "plan_active|emotion_active|emotion_pressure" .claude/skills/commitment-block-authoring/SKILL.md` returns matches (6 new predicates available).
5. Each skill's STPLAN/STEMO prose cites the same canonical surfaces (story-state-contract.md §4.5.17/§4.5.18; §9b/§9c; predicate-DSL §5; tag grammar §5a; CONTEXT-PACKET-CONTRACT.md; MACHINE-FACING-LAYER.md) → cross-skill grep.

### Invariants

1. Each skill's existing prose remains valid for bundles without STPLAN/STEMO records — the new prose adds when-and-how-to-use STPLAN/STEMO without breaking existing flows.
2. Cross-skill consistency: canonical surface citations are uniform across all 7 SKILL.md files (no skill cites a different schema path or section number for the same concept).
3. SPEC-47 §Approach §C D-C10 per-skill detail is preserved verbatim in skill prose where appropriate (lifecycle bullets, check categories, predicate enumerations).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `for s in branching-story-bootstrap branching-story-turn-cycle branching-story-prose-attach branching-story-health-audit commitment-block-authoring story-fact-promotion-to-canon story-promotion-closeout; do echo "=== $s ==="; grep -cE "STPLAN|STEMO" .claude/skills/$s/SKILL.md; done` (each skill returns ≥1 match)
2. `grep -lE "STPLAN|STEMO" .claude/skills/*/SKILL.md | sort` (returns all 7 expected skill paths plus any other unexpected matches for review)
3. Cross-skill consistency grep: `grep -nE "story-state-contract.md §4\.5\.(17|18)" .claude/skills/branching-story-*/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md` (returns consistent §4.5.17/§4.5.18 citations across skills referencing the new schemas)
