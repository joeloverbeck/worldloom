# SPEC74STCHARDISBOU-002: branching-story-bootstrap/SKILL.md Phase 1b Ledger + phase-routing hardening

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` (new Phase 1b + Phase 2/4-5/8 rewrites; no schema/validator code touched)
**Deps**: None

## Problem

`branching-story-bootstrap/SKILL.md` Phase 2 produces STCHAR profiles before Phase 4/5 produces opening state records, with no explicit temporal-state extraction pass between Phase 1 (cast selection) and Phase 2 (STCHAR distillation). The authoring model can fold opening-scene state (bruises, current fear, current location, current beliefs) into the durable STCHAR profile because there's no upfront ledger separating "this routes to STCHAR" from "this routes to STSTAT/STEMO/BEL/STPLAN/etc." The empirically observed contamination on `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` originated at this Phase 2 distillation step.

## Assumption Reassessment (2026-05-23)

1. Verified current SKILL.md content at `.claude/skills/branching-story-bootstrap/SKILL.md`: Phase 2 ("Distill selected cast → STCHAR profiles") is at lines ~67-82; Phases 4-5 (state record creation) follow Phase 2; no Phase 1b currently exists; no Distillation Boundary Ledger mentioned anywhere; Phase 2 contains no explicit temporal-contamination warning; Phase 8 (root page-plan) does not currently constrain §16a current-state grounding.
2. Verified SPEC-74 §4.2 lists 4 wording changes mapped to this ticket: new Phase 1b insertion, Phase 2 STCHAR distillation rewrite, Phase 4/5 routing addition, Phase 8 root page-plan addition.
3. Cross-skill boundary under audit: the bootstrap-state routing contract this skill defines IS consumed by `branching-story-turn-cycle` (subsequent state records inherit the routing convention) and by `branching-story-health-audit` (Phase 2m findings flag contamination of the form this skill's ledger prevents). The ledger is a working-memory prompt-process hard gate, not a persistent schema field — Phase 4/5 reads it implicitly via the categorized rows.
4. FOUNDATIONS principle restated: §Story Bundles §5c ("Present Causal State, Not Narrative Shape") + §6a ("Belief vs. Fact" — current distrust routes to `BEL` with `truth_relation`/`belief_mode`/`visibility`, not STCHAR Emotional Appraisal Map) are the load-bearing principles. The Distillation Boundary Ledger operationalizes the split at bootstrap authoring time.

## Architecture Check

1. Phase 1b is a working-memory prompt-process hard gate (no new schema field, no validator surface). This is the cheapest possible fix — sharper routing at authoring time. Alternative approaches (a) adding a new "temporal-state" record class is over-engineered (the existing STSTAT/STEMO/BEL/STPLAN/etc. taxonomy already covers every temporal category the ledger needs), and (b) adding a runtime validator that detects post-hoc contamination is a less-good fix because the contamination has already been written into durable STCHAR by the time the validator runs — Phase 1b prevents the contamination at the source.
2. No backwards-compatibility shims; existing bundles that bootstrapped without Phase 1b will be migrated through SPEC74STCHARDISBOU-013's remediation pass.

## Verification Layers

1. **Phase 1b present** → codebase grep-proof: `grep -nE '^## Phase 1b' .claude/skills/branching-story-bootstrap/SKILL.md` returns exactly 1 match.
2. **Distillation Boundary Ledger named with categorized routing rows** → grep-proof: `grep -n 'Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md` returns ≥3 matches (Phase 1b heading, Phase 2 reference, Phase 4/5 reference).
3. **Phase 2 explicitly forbids opening-temporal-state copy** → grep-proof: `grep -n 'forbid copying opening temporal state\|do not copy opening temporal state' .claude/skills/branching-story-bootstrap/SKILL.md` returns ≥1 match in the Phase 2 section.
4. **Phase 4/5 consumes the ledger** → grep-proof: `grep -n 'Consume the Distillation Boundary Ledger\|consumption of the Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md` returns ≥1 match in the Phase 4 or Phase 5 section.

## What to Change

### 1. Insert new `## Phase 1b: Extract Opening Temporal State and Build the Distillation Boundary Ledger`

Between Phase 1 and Phase 2. The ledger is a working-memory prompt-process hard gate (NOT a persistent schema field) with 10 categorized rows naming what routes where:

| Category | Route |
|---|---|
| Stable persona, voice, appraisal, pressure behavior, agency tendency, relationship-specific conduct, embodiment, capabilities, limits, dormant operational source material | STCHAR |
| Current physical condition, injury, clothing state, fatigue, location, concealment, ability to act | STSTAT / STOBJ / STLOC / PG.state_snapshot / page-plan §5/§6/§16 |
| Opening event or recent causal incident | SE / THR / CNSQ / CLK / STQ / STSEC as applicable |
| Current affective pressure, fear, shame, anger, exhaustion, suppression, dissociation | STEMO |
| Knowledge, misunderstanding, suspicion, distrust, lie, uncertainty, witness access | BEL |
| Current intention, tactical blockage, next step, fallback, inability to proceed | STINT / STPLAN |
| Current relationship state or branch-local change in relation | SREL |
| Active obligation, threat, consequence, debt, staged pressure | OBL / THR / CNSQ / CLK |
| Page-local presentation, "who the player/protagonist sees," current voice modulation, prose must-show for this page | page-plan §16a + prose plan sections |
| Provenance, source compression, omission rationale, validation trace | Source Distillation / Stable Source Material Inventory / Validation / Audit Anchors |

Include the rule: "Opening-page relevance is not an omission criterion. At bootstrap, future branches are unknown; stable operational source material should be retained unless it is genuinely outside the story scope or non-operational trivia."

State that Phase 2 may draft STCHAR only from the "Stable → STCHAR" row plus stable equivalents derived from transient facts, and Phase 4/5 must consume the temporal rows to create the initial story-state records.

### 2. Replace Phase 2 STCHAR distillation rule

Phase 2 draws on stable source sections (identity, embodied constraints, voice, stable dispositions, relationships, pressure behavior, known canon limits, all 10 `dramatic_core` fields, `## Capabilities`, `## Signature Scene Behavior`, and other loaded sections containing stable operational character material). Explicitly forbid copying opening temporal state into STCHAR. For each transient opening fact that seems character-relevant, require the authoring model to decide whether a stable dispositional equivalent exists; if yes, write only the durable equivalent in an operational STCHAR section; if no, route the fact entirely to state records or §16a. Require both preservation layers for `source_kind: world_char`: `source_operational_fact_map` for the 10 `dramatic_core` fields AND `Stable Source Material Inventory` for stable operational material from all loaded sections.

### 3. Add to Phase 4/5 initial state creation

Explicit consumption of the Distillation Boundary Ledger — every opening-current fact identified as temporal state must be represented in the appropriate initial record class BEFORE root `PG` and page-plan authoring. List the routing:
- injury / fatigue / visibility / current location → STSTAT, STOBJ, STLOC, PG.state_snapshot
- recent pursuit / opening incident → SE, THR, CNSQ, CLK when ongoing pressure exists
- fear, shame, exhaustion, dissociation, bravado failing under pressure → STEMO
- distrust, suspicion, misunderstanding, knowledge, lie, witness access → BEL
- inability to work, go home, speak, flee, or approach → STPLAN / STINT
- active relationship change or counterpart-specific current stance → SREL
- page-local "seen as" presentation and current voice modulation → root page-plan §16a

Closing rule: "If a fact is not durable enough for STCHAR and no state record is created for it, it must not appear in the root page plan as an unexplained assertion."

### 4. Add to Phase 8 root page plan

Explicit instruction that root §16a is the first page-local projection of STCHAR + active opening state, and may mention current fear / bruises / exhaustion / location / tactical blockage / current distrust / page-specific voice fracture ONLY when grounded in active STEMO/BEL/STPLAN/STSTAT/STOBJ/SREL/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG records. Closing rule: "Do not repair missing state by copying temporal prose into STCHAR. Create the state record or omit the claim."

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)

## Out of Scope

- story-character-profile/SKILL.md durable-authority hardening (SPEC74STCHARDISBOU-001).
- §16a packet contract in shared templates (SPEC74STCHARDISBOU-003, -005).
- Schema field or validator code (SPEC74STCHARDISBOU-006 through -011).
- Health-audit Phase 2m findings (SPEC74STCHARDISBOU-012).
- Existing red-bunny STCHAR profile remediation (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE '^## Phase 1b' .claude/skills/branching-story-bootstrap/SKILL.md` returns exactly 1 match.
2. `grep -n 'Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md` returns ≥3 matches.
3. `grep -nE 'do not copy opening temporal state|forbid copying opening temporal state' .claude/skills/branching-story-bootstrap/SKILL.md` returns ≥1 match.
4. `grep -nE 'Consume the Distillation Boundary Ledger|consumption of the Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md` returns ≥1 match in Phase 4 or Phase 5.
5. Phase 2 prose explicitly names the "Stable → STCHAR" row of the ledger as Phase 2's permitted source.
6. Phase 8 prose explicitly names active STEMO/BEL/STPLAN/STSTAT/STOBJ/SREL/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG as the only valid grounding for §16a current-state mentions.

### Invariants

1. Bootstrap Phase 2 may draft STCHAR only from stable source material; opening-temporal state is segregated to Phase 4/5.
2. Every opening-current fact in the Distillation Boundary Ledger that routes to a state record class MUST appear as an initial record of that class before root page-plan authoring.
3. Root page-plan §16a current-state mentions MUST cite the active state record they ground in; uncited current-state assertions are forbidden.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE '^## Phase 1b' .claude/skills/branching-story-bootstrap/SKILL.md` (confirms new phase heading)
2. `grep -n 'Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md` (confirms ledger referenced across Phase 1b + Phase 2 + Phase 4/5)
3. Manual inspection of Phase 1b ledger table rows for the 10 categories listed in §4.2; Phase 2 explicit forbid-copy-opening-temporal-state rule; Phase 4/5 routing list; Phase 8 grounding-records rule.
