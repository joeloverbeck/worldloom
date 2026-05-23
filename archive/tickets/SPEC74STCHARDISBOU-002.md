# SPEC74STCHARDISBOU-002: branching-story-bootstrap Phase 1b Ledger + phase-routing hardening

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` and loaded references under `.claude/skills/branching-story-bootstrap/references/` (new Phase 1b + Phase 2/4-5/8 routing hardening; no schema/validator code touched)
**Deps**: None

## Problem

Before this ticket, `branching-story-bootstrap/SKILL.md` Phase 2 produced STCHAR profiles before Phase 4/5 produced opening state records, with no explicit temporal-state extraction pass between Phase 1 (cast selection) and Phase 2 (STCHAR distillation). The authoring model could fold opening-scene state (bruises, current fear, current location, current beliefs) into the durable STCHAR profile because there was no upfront ledger separating "this routes to STCHAR" from "this routes to STSTAT/STEMO/BEL/STPLAN/etc." The empirically observed contamination on `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` originated at this Phase 2 distillation step.

## Assumption Reassessment (2026-05-23)

1. At intake, `.claude/skills/branching-story-bootstrap/SKILL.md` listed Phase 2 ("Distill selected cast -> STCHAR profiles") before Phases 4-5 state-record creation; no Phase 1b appeared in the process flow; no Distillation Boundary Ledger appeared in the top-level skill; and Phase 8 did not constrain §16a current-state grounding.
2. Live reassessment found that the substantive Phase 1/2, Phase 4, Phase 5, and Phase 8 authoring instructions are delegated to loaded reference files: `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md`, `phase-3-4-facts-beliefs-da.md`, `phase-5-debts-and-optional-seeds.md`, and `phase-8-9-page-plan-and-choices.md`. The ticket's original single-file `Files to Touch` list was stale; the implementation widened within the same bootstrap-skill seam so the actual loaded instructions changed.
3. Verified SPEC-74 §4.2 lists 4 wording changes mapped to this ticket: new Phase 1b insertion, Phase 2 STCHAR distillation rewrite, Phase 4/5 routing addition, Phase 8 root page-plan addition.
4. Cross-skill boundary under audit: the bootstrap-state routing contract this skill defines IS consumed by `branching-story-turn-cycle` (subsequent state records inherit the routing convention) and by `branching-story-health-audit` (Phase 2m findings flag contamination of the form this skill's ledger prevents). The ledger is a working-memory prompt-process hard gate, not a persistent schema field.
5. FOUNDATIONS principle restated: §Story Bundles §5c ("Present Causal State, Not Narrative Shape") + §6a ("Belief vs. Fact" — current distrust routes to `BEL` with `truth_relation`/`belief_mode`/`visibility`, not STCHAR Emotional Appraisal Map) are the load-bearing principles. The Distillation Boundary Ledger operationalizes the split at bootstrap authoring time.
6. HARD-GATE read: `docs/HARD-GATE-DISCIPLINE.md` was read because this edits a content-generating skill's gated phase-completion requirements. The change strengthens the pre-write working-memory requirements while preserving explicit user approval, patch-engine submission, approval-token behavior, write order, and no-write-before-approval discipline.

## Architecture Check

1. Phase 1b is a working-memory prompt-process hard gate (no new schema field, no validator surface). This is the cheapest possible fix — sharper routing at authoring time. Alternative approaches (a) adding a new "temporal-state" record class is over-engineered (the existing STSTAT/STEMO/BEL/STPLAN/etc. taxonomy already covers every temporal category the ledger needs), and (b) adding a runtime validator that detects post-hoc contamination is a less-good fix because the contamination has already been written into durable STCHAR by the time the validator runs — Phase 1b prevents the contamination at the source.
2. No backwards-compatibility shims; existing bundles that bootstrapped without Phase 1b will be migrated through SPEC74STCHARDISBOU-013's remediation pass.

## Verification Layers

1. **Phase 1b present** → codebase grep-proof: `grep -nE '^## Phase 1b' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` returns exactly 1 match.
2. **Distillation Boundary Ledger named across top-level skill and loaded references** → grep-proof: `grep -n 'Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/*.md` returns top-level hard-gate/procedure hits plus Phase 1b, Phase 2, Phase 4, and Phase 5 reference hits.
3. **Phase 2 explicitly forbids opening-temporal-state copy** → grep-proof: `grep -nE 'do not copy opening temporal state|forbid copying opening temporal state' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` returns ≥1 match in the Phase 2 section.
4. **Phase 4/5 consumes the ledger** → grep-proof: `grep -nE 'Consume the Distillation Boundary Ledger|consumption of the Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md .claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` returns ≥1 match in the top-level procedure and both loaded phase references.
5. **Phase 8 active-state grounding list present** → grep-proof: `grep -nE 'STEMO|BEL|STPLAN|STSTAT|STOBJ|SREL|THR|OBL|CNSQ|CLK|STSEC|STQ|SE|PG' .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` returns the §16a grounding paragraph.

## Landed Changes

### 1. Inserted new `## Phase 1b: Extract Opening Temporal State and Build the Distillation Boundary Ledger`

Inserted in `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` between Phase 1 and Phase 2. The ledger is a working-memory prompt-process hard gate (NOT a persistent schema field) with 10 categorized rows naming what routes where:

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

Included the rule: "Opening-page relevance is not an omission criterion. At bootstrap, future branches are unknown; stable operational source material should be retained unless it is genuinely outside the story scope or non-operational trivia."

The top-level `SKILL.md` hard-gate and procedure now name Phase 1b and require the Distillation Boundary Ledger before STCHAR or opening state records are finalized.

### 2. Replaced Phase 2 STCHAR distillation rule

Phase 2 now draws on stable source sections (identity, embodied constraints, voice, stable dispositions, relationships, pressure behavior, known canon limits, all 10 `dramatic_core` fields, `## Capabilities`, `## Signature Scene Behavior`, and other loaded sections containing stable operational character material). It explicitly says to use only the Distillation Boundary Ledger's Stable -> STCHAR row plus stable equivalents derived from transient facts, and to not copy opening temporal state into STCHAR. It requires both preservation layers for `source_kind: world_char`: `source_operational_fact_map` for the 10 `dramatic_core` fields AND `Stable Source Material Inventory` for stable operational material from all loaded sections.

### 3. Added to Phase 4/5 initial state creation

Added explicit consumption of the Distillation Boundary Ledger to `phase-3-4-facts-beliefs-da.md` and `phase-5-debts-and-optional-seeds.md` — every opening-current fact identified as temporal state must be represented in the appropriate initial record class BEFORE root `PG` and page-plan authoring. The loaded references now list routing for:
- injury / fatigue / visibility / current location → STSTAT, STOBJ, STLOC, PG.state_snapshot
- recent pursuit / opening incident → SE, THR, CNSQ, CLK when ongoing pressure exists
- fear, shame, exhaustion, dissociation, bravado failing under pressure → STEMO
- distrust, suspicion, misunderstanding, knowledge, lie, witness access → BEL
- inability to work, go home, speak, flee, or approach → STPLAN / STINT
- active relationship change or counterpart-specific current stance → SREL
- page-local "seen as" presentation and current voice modulation → root page-plan §16a

Both references include the closing rule: "If a fact is not durable enough for STCHAR and no state record is created for it, it must not appear in the root page plan as an unexplained assertion."

### 4. Added to Phase 8 root page plan

Added explicit instruction in `phase-8-9-page-plan-and-choices.md` that root §16a is the first page-local projection of STCHAR + active opening state, and may mention current fear / bruises / exhaustion / location / tactical blockage / current distrust / page-specific voice fracture ONLY when grounded in active STEMO/BEL/STPLAN/STSTAT/STOBJ/SREL/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG records. It also adds the closing rule: "Do not repair missing state by copying temporal prose into STCHAR. Create the state record or omit the claim."

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)

## Out of Scope

- story-character-profile/SKILL.md durable-authority hardening (`archive/tickets/SPEC74STCHARDISBOU-001.md`).
- §16a packet contract in shared templates (SPEC74STCHARDISBOU-003, -005).
- Schema field or validator code (SPEC74STCHARDISBOU-006 through -011).
- Health-audit Phase 2m findings (SPEC74STCHARDISBOU-012).
- Existing red-bunny STCHAR profile remediation (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE '^## Phase 1b' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` returns exactly 1 match.
2. `grep -n 'Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/*.md` returns hits across the hard-gate/procedure, Phase 1b, Phase 2, Phase 4, and Phase 5 surfaces.
3. `grep -nE 'do not copy opening temporal state|forbid copying opening temporal state' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` returns ≥1 match.
4. `grep -nE 'Consume the Distillation Boundary Ledger|consumption of the Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md .claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` returns hits in Phase 4 and Phase 5 guidance.
5. Phase 2 prose explicitly names the `Stable -> STCHAR` row of the ledger as Phase 2's permitted source.
6. Phase 8 prose explicitly names active STEMO/BEL/STPLAN/STSTAT/STOBJ/SREL/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG as the only valid grounding for §16a current-state mentions.

### Invariants

1. Bootstrap Phase 2 may draft STCHAR only from stable source material; opening-temporal state is segregated to Phase 4/5.
2. Every opening-current fact in the Distillation Boundary Ledger that routes to a state record class MUST appear as an initial record of that class before root page-plan authoring.
3. Root page-plan §16a current-state mentions MUST cite the active state record they ground in; uncited current-state assertions are forbidden.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE '^## Phase 1b' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (confirms new phase heading)
2. `grep -n 'Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/*.md` (confirms ledger referenced across top-level gating/procedure, Phase 1b, Phase 2, and Phase 4/5)
3. `grep -nE 'do not copy opening temporal state|forbid copying opening temporal state' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` (confirms Phase 2 explicit forbid-copy-opening-temporal-state rule)
4. `grep -nE 'Consume the Distillation Boundary Ledger|consumption of the Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md .claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` (confirms Phase 4/5 ledger consumption)
5. Manual inspection of Phase 1b ledger table rows for the 10 categories listed in SPEC-74 §4.2; Phase 2 `Stable -> STCHAR` source rule; Phase 4/5 routing list; Phase 8 grounding-records rule.

## Outcome

Completed: 2026-05-23.

Implemented the bootstrap distillation boundary hardening in the top-level `branching-story-bootstrap` skill and the loaded phase references. The skill now requires a Phase 1b Distillation Boundary Ledger before STCHAR or opening state records are finalized, Phase 2 now draws only from the ledger's stable row and forbids copying opening temporal state into STCHAR, Phases 4 and 5 consume temporal ledger rows into initial state records, and Phase 8 requires root §16a current-state mentions to be grounded in active state records.

No schema, validator, shared-template §16a contract, health-audit, turn-cycle, or red-bunny STCHAR migration work landed in this ticket; those remain owned by the later SPEC74STCHARDISBOU tickets named in `Out of Scope`.

## Verification Result

1. `grep -nE '^## Phase 1b' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` — PASS; returned exactly one Phase 1b heading.
2. `grep -n 'Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/*.md` — PASS; returned hard-gate/procedure hits plus Phase 1b, Phase 2, Phase 4, and Phase 5 reference hits.
3. `grep -nE 'do not copy opening temporal state|forbid copying opening temporal state' .claude/skills/branching-story-bootstrap/references/phase-1-2-state-seed-and-stchar-distillation.md` — PASS; returned the Phase 2 "do not copy opening temporal state into STCHAR" rule.
4. `grep -nE 'Consume the Distillation Boundary Ledger|consumption of the Distillation Boundary Ledger' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md .claude/skills/branching-story-bootstrap/references/phase-5-debts-and-optional-seeds.md` — PASS; returned the top-level procedure plus Phase 4 and Phase 5 reference hits.
5. `grep -nE 'STEMO|BEL|STPLAN|STSTAT|STOBJ|SREL|THR|OBL|CNSQ|CLK|STSEC|STQ|SE|PG' .claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — PASS; returned the §16a paragraph naming the active grounding record classes.
6. Manual review — PASS; the Phase 1b ledger has the 10 SPEC-74 categories, Phase 2 names `Stable -> STCHAR` as the permitted source, Phase 4/5 include the no-unexplained-root-page assertion rule, and Phase 8 says not to repair missing state by copying temporal prose into STCHAR.

## Deviations

The implementation touched the loaded phase references in addition to top-level `SKILL.md`. Reassessment found the top-level skill delegates the actual Phase 1/2, 4/5, and 8 authoring instructions to those references, so changing only `SKILL.md` would have left the operational instruction surface stale.
