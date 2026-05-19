# SPEC48SESTRINT-002: Rewrite `story-state-contract.md` §5a tag grammar → structured field schema + update SE schema documentation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — rewrites `.claude/skills/_shared-templates/story-state-contract.md` §5a (authoritative contract for mid-story introduction grammar); updates `.claude/skills/_shared-templates/story-record-schemas.md` SE entry
**Deps**: None

## Problem

SPEC-48's contract layer is `story-state-contract.md` §5a — currently titled "Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies" and documenting the parseable tag patterns (`intro:<CLASS>(...)`, `plan_relation:<...>(plan=...)`, `non_propagation:<...>(group=..., records=[...])`) that ride on `SE.world_logic_rationale`. SPEC-48 §D2 makes `world_logic_rationale` prose-only after the clean break; the contract must reflect the new structured-field schema, not the deprecated grammar. The 7 story-pipeline skills + `da-authoring-reference.md` (updated separately by ticket 011) consume this contract verbatim; without §5a rewriting, skill authors continue authoring tag-syntax under a deprecated grammar that the post-clean-break validators reject.

## Assumption Reassessment (2026-05-19)

1. `.claude/skills/_shared-templates/story-state-contract.md` §5a currently begins at line 209 (header `### §5a. Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies` verified by grep during SPEC-48 reassess-spec); the 8 per-class trigger tables span the subsequent lines and document the same vocabulary that ticket 001 migrates to JSON-schema. `.claude/skills/_shared-templates/story-record-schemas.md` SE entry exists and is the canonical SE-record schema documentation.
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
4. Closed-regex specifications removed → grep proof: `grep -n "intro:(CLK|STSEC\|plan_relation:.*\\\\(plan=\|non_propagation:.*\\\\(group=" .claude/skills/_shared-templates/story-state-contract.md` returns zero matches in operational §5a content (audit-trail prose mentioning the removed grammar is acceptable, scoped to retrospective explanation).

## What to Change

### 1. Rewrite `story-state-contract.md` §5a title and preamble

Update the H3 header from `### §5a. Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies` to `### §5a. Mid-Story Introduction Structured Fields`. Replace the existing preamble paragraph (which currently describes the parseable tag patterns riding on `world_logic_rationale`) with a new preamble describing the 3 structured fields on `SE` and naming `world_logic_rationale` as prose-only.

### 2. Move per-class trigger tables under the structured-field framing

The 8 per-class trigger tables (`CLK Triggers`, `STSEC Triggers`, ..., `STEMO Triggers`) currently document the parseable `intro:<CLASS>(trigger=...)` grammar. Reframe each table's introduction to describe the `record_introductions[].trigger` field, preserving the trigger lists verbatim. The closed regex specifications (the `intro_tag := "intro:" class "(" args ")"` BNF and the matching regex around `story-state-contract.md:230`) are deleted — replaced by a single sentence pointing at `tools/validators/src/schemas/story-event.schema.json` as the canonical schema-level source of truth (per ticket 001).

### 3. Add `state_relations` sub-section

Add a new H4 sub-section `#### §5a.1 `state_relations[]` field` documenting the 7-value relation enum (`advances | tests | blocks | revises | fulfills | abandons | ignores`) and naming the consumers (`stplan-event-plan-relation-consistency`, `stplan-closure-status-requires-closure-event`, `stemo-agency-effect-compatibility`). Move the existing `plan_relation:` tag documentation (around `story-state-contract.md:241-242`) into this sub-section, rewritten as structured-field documentation.

### 4. Add `non_propagation_facts` sub-section

Add a new H4 sub-section `#### §5a.2 `non_propagation_facts[]` field` documenting the 5-value reason enum + `group` + `records[]` shape. Name the consumers (`expected-witness-coverage`, `non_propagation_facts_completeness`). The existing non-propagation example near `story-state-contract.md:97` and tag specification near `story-state-contract.md:241` is rewritten as structured-field documentation.

### 5. Add explicit prose-field-discipline statement

Add a normative paragraph to §5a (placement: end of preamble, before the per-class trigger tables): "`SE.world_logic_rationale` is prose-only. Validators MUST NOT attempt to parse `world_logic_rationale` for structural facts. The structured WHAT lives in `record_introductions[]`, `state_relations[]`, and `non_propagation_facts[]`; the prose WHY (the human-readable explanation of what the event means) lives in `world_logic_rationale`."

### 6. Update `story-record-schemas.md` SE entry

Document the 3 new optional fields on the SE schema, with one worked YAML example per field:

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

Name each field's closed enum and reference `story-state-contract.md` §5a + the schema file as the authoritative sources.

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
