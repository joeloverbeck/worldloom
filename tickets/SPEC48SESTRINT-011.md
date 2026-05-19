# SPEC48SESTRINT-011: Update 7 story-pipeline SKILL.md files + `da-authoring-reference.md` — replace tag-syntax with structured-field shape

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — updates SE-authoring prose in 7 story-pipeline SKILL.md files + 1 shared template (`da-authoring-reference.md`); content-only edits, no structural skill changes
**Deps**: 002

## Problem

SPEC-48 §Phase E D-E1 + D-E1.5 specify content updates to all 8 surfaces that author SE records (or document the SE schema): the 7 story-pipeline SKILL.md files (per FOUNDATIONS §Story Bundles §7 enumeration) + `.claude/skills/_shared-templates/da-authoring-reference.md`. Each file contains SE-authoring examples in YAML or prose that currently demonstrate the `intro:<CLASS>(...)` / `plan_relation:<...>(plan=...)` / `non_propagation:<...>(group=..., records=[...])` tag syntax inside `world_logic_rationale`. Under SPEC-48's clean break (per ticket 002's §5a rewrite), these examples are deprecated — skill authors must produce structured-field shapes instead. The reassessment I2 finding identified `da-authoring-reference.md:157` as the third shared-template site (alongside `story-record-schemas.md` and `story-state-contract.md` covered by ticket 002) carrying a `non_propagation:` example that needs updating; without this update, deprecated grammar remains in authoritative documentation consumed by `diegetic-artifact-generation` + the story-bundle DA workflow.

## Assumption Reassessment (2026-05-19)

1. **8 surface files verified**: `ls .claude/skills/branching-story-*/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` returns 7 SKILL.md files matching the FOUNDATIONS §Story Bundles §7 enumeration (verified via Pre-Write Files-to-Touch existence check). `.claude/skills/_shared-templates/da-authoring-reference.md` exists; line 157 carries the `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` syntax example (verified via SPEC-48 reassess-spec I2 finding's grep).
2. **SPEC-48 D-E1 + D-E1.5 enumeration**: D-E1 covers the 7 story-pipeline SKILL.md files — replace every tag-syntax occurrence with structured-field shape; rewrite skill-discipline statements that reference "parseable tag in `world_logic_rationale`". D-E1.5 covers `da-authoring-reference.md:157` — replace the `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` syntax example with the structured-field equivalent.
3. **Cross-skill boundary**: 8 story-pipeline / authoring surfaces are coordinated by this ticket — the contract authority for the new structured-field syntax is established by ticket 002 (§5a rewrite); this ticket propagates the contract into the skills' prose. Per FOUNDATIONS §Story Bundles §7, the 7 SKILL.md files constitute Skill Category 2c (story-pipeline content-generation); the shared template at `_shared-templates/da-authoring-reference.md` is consumed by `diegetic-artifact-generation` (Skill Category 2b) per the canon-reading content-generation classification. Both categories' prose must reflect the post-clean-break authoring surface.

## Architecture Check

1. **Contract-mirrors-prose discipline**: with ticket 002 establishing `story-state-contract.md` §5a as the authoritative structured-field schema and `story-record-schemas.md` SE entry carrying worked examples, the skill prose updates mirror that contract in the operational authoring context. Cleaner than embedding contract details in every SKILL.md: skills cite the contract, ticket 002 owns the contract; this ticket propagates the citation surface.
2. **No backwards-compatibility aliasing**: no "transitional" tag-syntax remains anywhere in the updated files. Every `intro:<CLASS>(...)` / `plan_relation:<...>(...)` / `non_propagation:<...>(...)` example is rewritten to its structured-field equivalent; every "parseable tag in `world_logic_rationale`" prose statement is rewritten to reference `SE.record_introductions[]` / `SE.state_relations[]` / `SE.non_propagation_facts[]` directly. The CI gate at ticket 010 (skill-prose tag-syntax-absence) enforces this; the gate would fail if any deprecated substring remained.

## Verification Layers

1. Skill-prose tag-syntax absent → grep proof: `grep -rn "intro:<CLASS>\|intro:CLK(\|intro:STSEC(\|intro:STQ(\|intro:THR(\|intro:STENT(\|intro:SREL(\|intro:STPLAN(\|intro:STEMO(\|plan_relation:\|non_propagation:" .claude/skills/` returns zero matches in `*.md` files AFTER this ticket lands. (This is the same closed substring list the CI gate at ticket 010 enforces; landing this ticket is the precondition for the gate passing.)
2. Structured-field references present → grep proof: `grep -rln "record_introductions\|state_relations\|non_propagation_facts" .claude/skills/branching-story-*/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/_shared-templates/da-authoring-reference.md` returns ≥1 hit per file where SE-authoring examples are documented (or no hit when the file's SE-authoring surface is purely abstract; documented per-file in the implementation notes).
3. Skill-discipline statement rewrites → grep proof: `grep -rn "parseable tag in.*world_logic_rationale\|parseable tag in world_logic_rationale" .claude/skills/` returns zero matches in `*.md` files AFTER this ticket lands.

## What to Change

### 1. Update `.claude/skills/branching-story-bootstrap/SKILL.md`

Locate every SE-authoring example that demonstrates `intro:<CLASS>(...)` / `plan_relation:<...>(plan=...)` / `non_propagation:<...>(group=..., records=[...])` syntax in YAML or prose. Rewrite each example to the structured-field shape:

- `intro:CLK(id=CLK-7, trigger=deadline_declared, evidence=[SE-3], distinct_from=[])` → `record_introductions: [{record_id: CLK-7, class: CLK, trigger: deadline_declared, evidence: [SE-3], distinct_from: []}]`
- `plan_relation:advances(plan=STPLAN-12)` → `state_relations: [{relation: advances, target_record: STPLAN-12}]`
- `non_propagation:event_leaves_no_accessible_trace(group=direct_witnesses, records=[DA-4])` → `non_propagation_facts: [{reason: event_leaves_no_accessible_trace, group: direct_witnesses, records: [DA-4]}]`

Rewrite any skill-discipline statement referencing "parseable tag in `world_logic_rationale`" (or equivalent) to reference the structured fields directly.

### 2. Update `.claude/skills/branching-story-turn-cycle/SKILL.md`

Same pattern as ticket #1 above — replace every tag-syntax example with structured-field shape; rewrite skill-discipline statements.

### 3. Update `.claude/skills/branching-story-prose-attach/SKILL.md`

Same pattern.

### 4. Update `.claude/skills/branching-story-health-audit/SKILL.md`

Same pattern.

### 5. Update `.claude/skills/commitment-block-authoring/SKILL.md`

Same pattern.

### 6. Update `.claude/skills/story-fact-promotion-to-canon/SKILL.md`

Same pattern.

### 7. Update `.claude/skills/story-promotion-closeout/SKILL.md`

Same pattern.

### 8. Update `.claude/skills/_shared-templates/da-authoring-reference.md:157`

Replace the `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` syntax example with `SE.non_propagation_facts[]` entry: `{reason: event_leaves_no_accessible_trace, group: <label>, records: [DA-<N>]}`. Preserve the surrounding prose context (which describes when authors should emit non-propagation facts for diegetic artifacts).

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `.claude/skills/_shared-templates/da-authoring-reference.md` (modify)

## Out of Scope

- Contract document rewrite at `story-state-contract.md` §5a + SE entry at `story-record-schemas.md` (covered by ticket 002).
- Schema file extension (covered by ticket 001).
- Validator refactor (covered by tickets 003-007).
- World-index refactor (covered by ticket 008).
- Parser deletion (covered by ticket 009).
- CI gate addition (covered by ticket 010).
- MCP / docs surface updates (deferred to ticket 012).
- Structural SKILL.md changes (HARD-GATE block, Pre-flight Check, Canon Safety Check, etc.) — this ticket is content-only edits; no structural surface is touched.

## Acceptance Criteria

### Tests That Must Pass

1. Grep proof of tag-syntax absence: `grep -rn "intro:<CLASS>\|intro:CLK(\|intro:STSEC(\|intro:STQ(\|intro:THR(\|intro:STENT(\|intro:SREL(\|intro:STPLAN(\|intro:STEMO(\|plan_relation:\|non_propagation:" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/_shared-templates/da-authoring-reference.md` returns zero matches.
2. Grep proof of structured-field-reference presence: `grep -rln "record_introductions\|state_relations\|non_propagation_facts" .claude/skills/branching-story-*/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/_shared-templates/da-authoring-reference.md` returns ≥1 hit per file where SE-authoring examples are documented.
3. The ticket-010 CI gate `skill-prose-tag-syntax-absence.test.ts` passes when run against the post-this-ticket tree.

### Invariants

1. No deprecated tag-syntax substring remains in the 8 updated files; all 11 patterns of the M1-refined closed substring list (per ticket 010 D-C4) are absent.
2. Skill-discipline statements no longer claim parseable-tag authority for `world_logic_rationale`; the field is documented (consistent with ticket 002's §5a prose-field-discipline statement) as prose-only.

## Test Plan

### New/Modified Tests

1. `None — content-only documentation ticket; verification is grep-based against the 8 updated files and the CI gate at ticket 010 is the regression backstop.`

### Commands

1. `grep -rcn "intro:CLK(\|intro:STSEC(\|intro:STQ(\|intro:THR(\|intro:STENT(\|intro:SREL(\|intro:STPLAN(\|intro:STEMO(\|plan_relation:\|non_propagation:" .claude/skills/branching-story-*/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/_shared-templates/da-authoring-reference.md` — each file reports zero matches.
2. `npm test --prefix tools/validators -- --test-name-pattern=skill-prose-tag-syntax-absence` — the ticket-010 CI gate passes against the post-update tree.
