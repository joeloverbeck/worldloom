# SPEC47STPSTE-010: Update story-state-contract §5 predicate-DSL table + §5a tag-grammar prose

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `.claude/skills/_shared-templates/story-state-contract.md` §5 closed-predicate-DSL table with 6 new predicates + §5a tag-grammar specification with 2 new class entries, their trigger vocabularies, and the new `plan_relation:` tag pattern; no code changes
**Deps**: `archive/tickets/SPEC47STPSTE-008.md`, `archive/tickets/SPEC47STPSTE-009.md`

## Problem

SPEC-47 `archive/tickets/SPEC47STPSTE-008.md` lands the 6 new predicates in the validator framework (predicate-dsl-grammar.ts); `archive/tickets/SPEC47STPSTE-009.md` lands the §5a tag-grammar parser extensions for STPLAN/STEMO + plan_relation. The shared contract at `.claude/skills/_shared-templates/story-state-contract.md` §5 (closed-predicate-DSL table) and §5a (mid-story introduction tag grammar specification) document what those code surfaces provide; without updating the docs, story-pipeline skill authors and reviewers see a stale closed-grammar table that omits the 6 new predicates and a stale tag-grammar specification that doesn't enumerate the STPLAN/STEMO classes or the new `plan_relation:` pattern. Per SPEC-47 §Approach §B D-B7, this docs-sync ticket lands after the code tickets it documents.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `.claude/skills/_shared-templates/story-state-contract.md` §5 contains the closed-predicate-DSL table currently enumerating 33 individual predicates + 3 combinators (per the reassess-spec session's exact count); §5a contains the tag-grammar specification with the 6-class `class` enum and per-class trigger vocabularies (CLK / STSEC / STQ / THR / STENT / SREL). Both sections need extension per SPEC-47 §Approach §B D-B7.
2. Verified SPEC-47 §Approach §B specifies the 6 new predicates' shapes and consumers (table in §B) and the new §5a grammar additions (regex witness, STPLAN/STEMO triggers, plan_relation pattern, all enumerated in the §5a-and-related Approach §B detail). Verified `archive/tickets/SPEC47STPSTE-008.md` lands the code-side predicate extensions and `archive/tickets/SPEC47STPSTE-009.md` lands the parser extensions; this ticket synchronizes the contract docs to match.
3. Cross-skill boundary under audit: the story-state-contract is the shared contract for the 7 Skill Category 2c story-pipeline skills; §5 + §5a are the authoritative reference for predicate-DSL grammar and mid-story tag grammar respectively. Other Category 2c skill SKILL.md files cite §5 / §5a by section number; docs-sync here lands the canonical post-SPEC-47 reference text without modifying any other skill's SKILL.md.

## Architecture Check

1. Docs-sync after code lands preserves the canonical contract — skills consume the contract docs at pre-flight; outdated contract docs would mislead skill authors about what the closed grammar provides. Landing docs-sync as its own ticket (rather than co-edit with `archive/tickets/SPEC47STPSTE-008.md` / `archive/tickets/SPEC47STPSTE-009.md`) keeps the contract-edit reviewable independently of the code change.
2. No backwards-compatibility aliasing/shims introduced — docs additions only. Existing §5 table entries (33 predicates + 3 combinators) and §5a content (6 classes + their triggers) are unchanged.

## Verification Layers

1. §5 closed-predicate-DSL table includes 6 new predicate rows → codebase grep-proof
2. §5a tag-grammar specification includes 2 new `class` enum values (STPLAN, STEMO) + 6 STPLAN trigger rows + 7 STEMO trigger rows + new `plan_relation:` tag-pattern specification with 7 closed relations → codebase grep-proof
3. Cross-skill consumers (other Category 2c skills citing §5 / §5a) continue to resolve — section numbering unchanged → grep `\§5\|\§5a` across .claude/skills/*/SKILL.md returns the same matches before and after this ticket

## What to Change

### 1. Extend §5 closed-predicate-DSL table

Add 6 new rows to the predicate table (parallel to existing per-predicate rows). Format (per the existing table):

```text
| `plan_active(holder, plan?)` | Actor has an active `STPLAN`. When `plan` is supplied, matches that specific plan id; otherwise matches any. | turn-cycle eligibility, plan grounding |
| `plan_blocked(holder)` | Actor has at least one active `STPLAN` with `plan_status: blocked`. | turn-cycle eligibility |
| `any_plan_active(alias, holder_role?)` | Actor-unbound existential over active `STPLAN`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `emotion_active(holder, kind?, min_intensity?)` | Actor has an active `STEMO`. `kind` filters by closed-enum `affect_kind`; `min_intensity` is one of `low | medium | high | extreme` and matches that intensity or higher. | turn-cycle eligibility, plan grounding |
| `any_emotion_active(alias, holder_role?, kind?, min_intensity?)` | Actor-unbound existential over active `STEMO`. Binds `alias` to the matched record. | author-pool / branch-prefix prefiltering |
| `emotion_pressure(holder, pressure)` | Actor has an active `STEMO` whose `behavioral_pressure[]` includes the named closed-enum pressure. | turn-cycle eligibility |
```

Update the closing prose sentence describing closed-grammar size: "Closed grammar grows from 33 individual predicates to 39 (combinators `not | all | any` unchanged at 3, for 42 total entries)."

### 2. Extend §5a tag-grammar specification

Update the `class` enum in the grammar witness from 6 alternatives to 8:

```text
class := "CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "SREL" | "STPLAN" | "STEMO"
```

Add two new trigger-vocabulary tables after the existing 6 class tables:

**STPLAN Triggers** (6):

```text
| `tactical_approach_committed` | Actor moves from open intention to a specific multi-step tactical approach in the accepted event. |
| `resource_gained_enables_plan` | Actor acquired a resource / leverage / ally / piece of information in this event that newly makes a previously-blocked plan tractable. |
| `blocker_requires_plan` | Actor encountered an obstacle in this event that requires explicit planning (negotiation, deception, alliance-building) rather than ad-hoc reaction. |
| `pressure_forces_plan` | External pressure produced by this event (clock fires, deadline declared, antagonist move) forces the actor to formalize a tactical response. |
| `opportunity_recognized` | The event surfaced a specific opportunity in the current state that warrants planned (vs. reactive) pursuit. |
| `counterparty_plan_observed` | Actor inferred another actor's plan from this event and forms a counter-plan in response. |
```

**STEMO Triggers** (7):

```text
| `event_revealed_truth_to_actor` | Actor learned something new in the event (witness, reveal, document discovery, testimony); affective shift is appraisal-driven. |
| `event_threatened_actor_or_charge` | Actor or someone they are responsible for came under threat in the event. |
| `event_harmed_actor_or_charge` | Actor or someone they care about was harmed, lost, or damaged in the event. |
| `event_relieved_pressure_on_actor` | Pressure on the actor was removed in the event (rescue, deadline averted, threat neutralized, accusation withdrawn). |
| `event_violated_actor_principle_or_value` | Actor's belief, principle, oath, or value was violated by the event. |
| `event_changed_relationship_with_other` | Relationship state with another actor moved on a load-bearing axis in this event (betrayal, intimacy, debt, authority shift). |
| `accumulated_pressure_crossed_threshold` | Sustained pressure (clock value rising across pages, repeated micro-stresses) became affectively load-bearing without a single triggering event; the cited `trigger_event` names the latest contributing SE. |
```

### 3. Add new `plan_relation:` tag-pattern specification

Insert a new sub-section in §5a (parallel to the `intro:<CLASS>` and `non_propagation:` tag-pattern specifications):

```text
**plan_relation tag pattern** (parallel to `intro:<CLASS>` and `non_propagation:` patterns; rides on `SE.world_logic_rationale`):

plan_relation_tag := "plan_relation:" relation "(plan=" record_id ")"
relation         := "advances" | "tests" | "blocks" | "revises" | "fulfills" | "abandons" | "ignores"
record_id        := "STPLAN-" positive_integer

Worked example: plan_relation:advances(plan=STPLAN-12)
```

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify) — §5 predicate-DSL table + §5a tag-grammar specification; shared-file with tickets 002 + 015 (mechanical merge expected per §Step 6.5 shared-file overlaps — each ticket modifies a different section)

## Out of Scope

- Code-side predicate-DSL extensions — covered by `archive/tickets/SPEC47STPSTE-008.md`.
- Code-side parser extensions for STPLAN/STEMO + plan_relation — covered by `archive/tickets/SPEC47STPSTE-009.md`.
- Section §3 record-class inventory update — covered by ticket 002.
- Section §8 page-plan minimum contract update — covered by ticket 015.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -cE "plan_active|plan_blocked|any_plan_active|emotion_active|any_emotion_active|emotion_pressure" .claude/skills/_shared-templates/story-state-contract.md` returns ≥6 (one per new predicate row in §5).
2. `grep -nE "STPLAN|STEMO" .claude/skills/_shared-templates/story-state-contract.md` returns matches in §5a class-enum + STPLAN/STEMO trigger tables + plan_relation pattern.
3. `grep -n "plan_relation:" .claude/skills/_shared-templates/story-state-contract.md` returns matches in §5a plan_relation specification.
4. Manual review confirms section numbering (§5 / §5a / §6 / §7 / §8) is unchanged; only intra-section content is extended.

### Invariants

1. Existing §5 table entries (33 predicates + 3 combinators) are unchanged — only 6 new rows appended.
2. Existing §5a class triggers (CLK / STSEC / STQ / THR / STENT / SREL trigger tables) are unchanged — only 2 new class tables appended.
3. Section headers (§5, §5a, §6, ...) and their numbering are unchanged — only intra-section content is extended.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -cE "plan_active|plan_blocked|any_plan_active|emotion_active|any_emotion_active|emotion_pressure" .claude/skills/_shared-templates/story-state-contract.md` (returns ≥6)
2. `grep -n "STPLAN Triggers\|STEMO Triggers\|plan_relation tag pattern" .claude/skills/_shared-templates/story-state-contract.md` (returns 3 matches, one per new sub-section)
3. `awk '/^## 5\. Closed Predicate DSL/,/^## 6\./' .claude/skills/_shared-templates/story-state-contract.md | grep -c "^| \`"` (predicate-DSL table row count: original 33 + combinators row + new 6 = 40 or similar — verify count matches expectation)
