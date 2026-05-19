# SPEC48SESTRINT-002: Rewrite `story-state-contract.md` §5a tag grammar → structured field schema + update SE schema documentation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — rewrites `.claude/skills/_shared-templates/story-state-contract.md` §5a (authoritative contract for mid-story introduction grammar); updates `.claude/skills/_shared-templates/story-record-schemas.md` SE entry
**Deps**: None

## Problem

At intake, SPEC-48's contract layer was `story-state-contract.md` §5a titled "Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies" and documented parseable tag patterns (`intro:<CLASS>(...)`, `plan_relation:<...>(plan=...)`, `non_propagation:<...>(group=..., records=[...])`) riding on `SE.world_logic_rationale`. SPEC-48 §D2 makes `world_logic_rationale` prose-only after the clean break; the contract now reflects the new structured-field schema, not the deprecated grammar. The 7 story-pipeline skills + `da-authoring-reference.md` are updated separately by ticket 011.

## Assumption Reassessment (2026-05-19)

1. At intake, `.claude/skills/_shared-templates/story-state-contract.md` §5a began at line 209 with header `### §5a. Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies`; this ticket rewrote that section to `### §5a. Mid-Story Introduction Structured Fields`. The 8 per-class trigger tables were preserved while their framing changed from tag grammar to `record_introductions[]`. `.claude/skills/_shared-templates/story-record-schemas.md` SE entry exists and is the canonical SE-record schema documentation.
2. SPEC-48 D-A4/D-A5/D-A6 enumerate three contract surfaces: (i) `story-record-schemas.md` SE entry adds the 3 new fields with one worked YAML example per field; (ii) `story-state-contract.md` §5a is rewritten from tag-grammar specification to structured-field schema specification, preserving the 8 trigger tables verbatim under the new structured-field framing; (iii) explicit prose-field-discipline statement added to §5a ("`SE.world_logic_rationale` is prose-only. Validators MUST NOT parse `world_logic_rationale` for structural facts.").
3. Cross-skill boundary under audit: `story-state-contract.md` §5a is consumed verbatim by all 7 story-pipeline SKILL.md files (per FOUNDATIONS §Story Bundles §7 enumeration) + `da-authoring-reference.md`. Ticket 011 propagates the contract changes into skill prose; this ticket establishes the contract authority. The contract is also referenced by the schema-vs-vocabulary parity test in ticket 003 (the typed-reader source-of-truth assertion).
4. FOUNDATIONS principle motivating this ticket: **§Story Bundles §5b (Schema-Minimalism At Story Scope)** — the 3 new fields each have closed-enum constraints and named §5b-class consumers (the 12 refactored validators are validation gates + replay primitives + predicate-input sources). The §5a rewrite is the contract-level expression of that schema-minimalism commitment; without §5a authority, future skill-prose extensions can drift back toward the deprecated grammar.

## Architecture Check

1. **Contract-first authority**: rewriting §5a establishes the authoritative shape for the structured fields BEFORE any validator refactor (Phase B, tickets 003-007) consumes them or any skill prose (ticket 011) propagates them. This avoids the inverse drift where skill prose references a contract surface that hasn't been updated yet. The contract is the source of truth that validators and skills mirror; landing the contract first is the cleanest sequencing.
2. **No backwards-compatibility aliasing**: §5a's rewrite deletes the closed-regex specifications entirely (JSON-schema is now the source of truth per ticket 001); no fallback prose to the deprecated tag grammar is retained except as audit-trail prose explaining what was replaced and why.

## Verification Layers

1. §5a structural rewrite → manual review of the rewritten section (8 trigger tables preserved verbatim; `plan_relation:` documentation moved to `state_relations` sub-section; `non_propagation:` documentation moved to `non_propagation_facts` sub-section).
2. Prose-field-discipline statement present → grep proof: `grep -n "prose-only" .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 hit referencing `SE.world_logic_rationale`.
3. SE schema documentation extended → grep proof: `grep -n "record_introductions\|state_relations\|non_propagation_facts" .claude/skills/_shared-templates/story-record-schemas.md` returns ≥3 hits naming the 3 new fields.
4. Closed-regex specifications removed → grep proof: `! grep -nE "intro_tag *= *\"intro:\"" .claude/skills/_shared-templates/story-state-contract.md` confirms the BNF-style grammar is absent; the broader old-tag-shape sweep in `## Verification Result` confirms operational examples are absent from the edited template surfaces.

## Landed Changes

### 1. Rewrote `story-state-contract.md` §5a title and preamble

Updated the H3 header from `### §5a. Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies` to `### §5a. Mid-Story Introduction Structured Fields`. Replaced the old parseable-tag preamble with a structured-field preamble describing `SE.record_introductions[]`, `SE.state_relations[]`, and `SE.non_propagation_facts[]`, and naming `world_logic_rationale` as prose-only.

### 2. Moved per-class trigger tables under the structured-field framing

The 8 per-class trigger tables (`CLK Triggers`, `STSEC Triggers`, ..., `STEMO Triggers`) now document `record_introductions[].trigger` under structured-field framing. The closed regex specifications and parser-path authority prose were deleted and replaced by a schema-source-of-truth statement pointing at `tools/validators/src/schemas/story-event.schema.json`.

### 3. Added `state_relations` sub-section

Added ``#### §5a.1 `state_relations[]` Field`` documenting the 7-value relation enum (`advances | tests | blocks | revises | fulfills | abandons | ignores`) and naming the consumers (`stplan-event-plan-relation-consistency`, `stplan-closure-status-requires-closure-event`, `stemo-agency-effect-compatibility`).

### 4. Added `non_propagation_facts` sub-section

Added ``#### §5a.2 `non_propagation_facts[]` Field`` documenting the 5-value reason enum + `group` + `records[]` shape. Named the consumers (`expected-witness-coverage`, `non_propagation_facts_completeness`). Rewrote the DA non-propagation note near the top of the same contract to reference `SE.non_propagation_facts[]`.

### 5. Added explicit prose-field-discipline statement

Added the normative paragraph: "`SE.world_logic_rationale` is prose-only. Validators MUST NOT attempt to parse `world_logic_rationale` for structural facts. The structured WHAT lives in `record_introductions[]`, `state_relations[]`, and `non_propagation_facts[]`; the prose WHY lives in `world_logic_rationale`."

### 6. Updated `story-record-schemas.md` SE entry

Documented the 3 new optional fields on the SE schema, with one worked YAML example per field:

```yaml
SE-12:
  # ... existing required fields ...
  record_introductions:
    - record_id: CLK-7
      class: CLK
      trigger: deadline_declared
      evidence: [SE-11, OBL-3]
      distinct_from: []
  state_relations:
    - relation: advances
      target_record: STPLAN-5
  non_propagation_facts:
    - reason: event_leaves_no_accessible_trace
      group: direct_witnesses
      records: [DA-4]
```

Named each field's closed enum and referenced `story-state-contract.md` §5a + the schema file as the authoritative sources.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- Skill prose updates that propagate the new contract into the 7 story-pipeline SKILL.md files (deferred to ticket 011).
- `da-authoring-reference.md` line 157 non-propagation example update (folded into ticket 011 as D-E1.5).
- Schema file extension (covered by ticket 001).
- Validator refactor consuming the new fields (deferred to tickets 003-007).
- World-index parser refactor (deferred to ticket 008).
- Integration test (deferred to ticket 013).

## Acceptance Criteria

### Tests That Must Pass

1. Grep proof of §5a structural rewrite: `grep -n "### §5a\\." .claude/skills/_shared-templates/story-state-contract.md` returns the new header `Mid-Story Introduction Structured Fields` and the 2 new sub-sections (`state_relations`, `non_propagation_facts`).
2. Grep proof of prose-field-discipline: `grep -n "prose-only" .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 hit naming `SE.world_logic_rationale`.
3. Grep proof of SE schema documentation: `grep -n "record_introductions\|state_relations\|non_propagation_facts" .claude/skills/_shared-templates/story-record-schemas.md` returns ≥3 hits documenting the 3 new fields.
4. Grep proof of regex-spec deletion: `grep -nE "intro_tag *:= *\"intro:\"" .claude/skills/_shared-templates/story-state-contract.md` returns zero matches (the BNF-style regex specification is deleted; the structured field schema in `tools/validators/src/schemas/story-event.schema.json` is the new source of truth).

### Invariants

1. The 8 per-class trigger tables remain verbatim — no trigger value is added, removed, renamed, or reordered. (This ticket migrates the table's framing from tag-grammar to structured-field; it does not modify the vocabulary itself.)
2. `world_logic_rationale` is documented as prose-only with explicit "MUST NOT parse" prohibition. Any future validator-author or skill-author reading §5a sees that the field is off-limits for structural-fact parsing.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against the rewritten contract sections and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "### §5a\\." .claude/skills/_shared-templates/story-state-contract.md` — confirms §5a structural rewrite landed.
2. `grep -n "prose-only" .claude/skills/_shared-templates/story-state-contract.md` — confirms the prose-field-discipline statement is present.
3. `grep -c "record_introductions\|state_relations\|non_propagation_facts" .claude/skills/_shared-templates/story-record-schemas.md` — confirms ≥3 hits documenting the new SE fields.

## Outcome

Completed: 2026-05-19

This ticket rewrote `.claude/skills/_shared-templates/story-state-contract.md` §5a from tag-grammar authority to structured-field authority, added the prose-only `SE.world_logic_rationale` discipline, added `state_relations[]` and `non_propagation_facts[]` subsections, and updated the DA non-propagation note to use the structured field. It also extended `.claude/skills/_shared-templates/story-record-schemas.md` with the three optional SE structured fields and worked YAML examples.

No validator behavior, schema source, story-pipeline skill prose, or `da-authoring-reference.md` prose was changed here; those remain owned by sibling tickets in the SPEC-48 family.

## Verification Result

Passed:

1. `grep -n "### §5a\\." .claude/skills/_shared-templates/story-state-contract.md` returned the new §5a header plus the two new subsections.
2. `grep -n "prose-only" .claude/skills/_shared-templates/story-state-contract.md` returned the `SE.world_logic_rationale` prose-only discipline.
3. `grep -c "record_introductions\|state_relations\|non_propagation_facts" .claude/skills/_shared-templates/story-record-schemas.md` returned `10`.
4. `! grep -nE "intro_tag *= *\"intro:\"" .claude/skills/_shared-templates/story-state-contract.md` passed; the BNF-style `intro_tag` grammar is absent.
5. `! grep -nE "intro:\(CLK|intro:CLK\(|intro:STSEC\(|intro:STQ\(|intro:THR\(|intro:STENT\(|intro:SREL\(|intro:STPLAN\(|intro:STEMO\(|plan_relation:.*\\(plan=|non_propagation:.*\\(group=" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` passed; old operational tag-shape examples are absent from the edited template surfaces.
6. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` passed.

## Deviations

- The existing page-plan §9b line `This page's plan_relation: advances | tests | blocks | revises | fulfills | abandons | ignores` remains in `story-state-contract.md`. It is not the deprecated `plan_relation:<relation>(plan=...)` tag syntax and does not instruct parsing `SE.world_logic_rationale`; downstream skill prose propagation and page-plan wording are owned by ticket 011.
