# SPEC-80 — Storylet Pool Coverage by Driver-Kind × Pressure-Source-Class

**Spec ID:** SPEC-80
**Date:** 2026-05-24
**Source brainstorm:** `reports/slt-chc-overhaul-second-iteration.md` triaged at `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`.
**Status:** active
**Depends on:** `archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md` (indexed candidate retrieval) for the projection-driven coverage diagnostics. SPEC-81 is complete, so implementation should prefer the projection API; the existing `list_records(include_full_body=true)` path remains a fallback only where the projection API is unavailable.

## §1 Goal

Extend the storylet-pool coverage diagnostics already present in `branching-story-bootstrap` Phase 6 (cast-role coverage) and `commitment-block-authoring` Phase 1 (gap diagnosis) with a **driver-kind × pressure-source-class** coverage check. The pool must be able to express the pressures the world naturally produces — NPC plans (STPLAN), affective pressure (STEMO), clock thresholds (CLK), live threats (THR), unrevealed secrets (STSEC), open story-questions (STQ), and offstage / world-pressure consequences — not only player-action-driven moves. Bundles whose active NPC and world-pressure records have no SLT in the pool that can resolve through them produce the iteration-1 reactivity problem (active high-urgency pressure records sitting inert while turn-cycle has nothing to select for non-player drivers).

This is an authoring-time coverage diagnostic, not a runtime pool-level scoring mechanism. It diagnoses what the pool CAN express, not what the pool SHOULD ranked-prefer at any given turn. The runtime selection model (local salience ranking, per FOUNDATIONS §Story Bundles §5c) is unchanged.

## §2 Background

### §2.1 The user's iteration-2 redirection

Iteration-2 triage initially classified ChatGPT-Pro SPEC-85 ("storylet generation matrix") as a drama-manager-adjacent re-tread of SPEC-50 D.2. The user redirected: pool coverage by pressure-source is structurally different from a global drama manager. Drama managers steer toward a TARGET narrative shape by ranking-prefer at runtime; authoring-time coverage diagnostics ensure the pool can express the pressures the world ALREADY contains. The distinction is real and operationally important.

The iteration-1 SPEC-76 active-pressure handling discipline made INERT high-urgency pressure structurally impossible at the page-plan level (the page plan must dispose of every active high-urgency record). But that discipline only fires if the storylet pool has SLTs the turn-cycle can select to enact the pressure. If the pool is player-action-skewed, the only disposition available for an active NPC STPLAN is "deferred" — which is technically valid but defeats the user's iteration-1 reactivity intent.

### §2.2 Existing precedent: bootstrap cast-role coverage

`.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` already prescribes cast-role coverage:

> when seeding the pool, also enumerate each active `STENT`'s `role_in_story` and ensure at least one seed block engages each pressure-bearing role (`pressure_source`, `opposing_actor`, `authority`, `dependent`, or `information_source`) — offstage characters (`entity_status.location: offstage`) are not exempt; their offstage activity is a legitimate seed-block lane via intrusion-shaped (`world_pressure` family), looms-without-arriving-shaped (`status_shift` family), or pursuit-shaped (`pursuit` family) blocks.

This spec extends the same pattern to driver-kind and pressure-source-class. It does NOT introduce a new coverage primitive; it adds two orthogonal axes to the existing one.

### §2.3 Scope discipline (against ChatGPT-Pro's 8-axis matrix)

ChatGPT-Pro's iteration-2 §14.2 proposed an 8-axis coverage matrix (driver kind, move family, response/action family, pressure source class, actor role lane, onstage/offstage, mystery/canon authority, aftermath/recovery/de-escalation). This spec implements only TWO of those axes (driver-kind, pressure-source-class) because they are the axes the user named and the axes that directly close the iteration-1 reactivity loop. Onstage/offstage is already implicit in the existing role coverage (offstage characters carry an explicit branch in the bootstrap rule). Mystery/canon authority is already a per-SLT field (`mystery_policy.allowed_authority`) and adding a pool-level coverage check for it without a concrete consumer is speculative. Aftermath/recovery/de-escalation overlaps with the existing move-family coverage. The remaining axes are deferred until a consumer surfaces.

## §3 Coverage Model

### §3.1 Driver-kind coverage

For each driver-kind value in the closed enum `[player_action, player_write_in, npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision]` (per `story-event.schema.json` and `story-storylet.schema.json` `grounding.compatible_turn_drivers[]`), the pool must contain at least one SLT whose `grounding.compatible_turn_drivers[]` includes that value, IF the bundle's current state contains at least one active record that could initiate that driver kind. The conditional clause is load-bearing — bundles without any STSEC need not seed a `secret_reveal`-compatible SLT; bundles without any active CLK need not seed a `clock_fire`-compatible SLT; etc.

**Per-driver-kind active-record trigger map** (closed; extends mechanically when a new driver kind is added):

| Driver kind | Required-if-present active record(s) |
|---|---|
| `player_action` / `player_write_in` | always required; player is always present |
| `npc_action` | any active STPLAN, STEMO, or STCHAR-bound STENT not assigned to the player |
| `offstage_action` | any STENT with `entity_status.location: offstage` plus an active STPLAN or STEMO held by that STENT |
| `world_pressure` | any active THR or open OBL/CNSQ with non-player owner |
| `clock_fire` | any active CLK record |
| `secret_reveal` | any STSEC record with `status` in {`active`, `partially_revealed`} |
| `multi_actor_collision` | any ≥2 simultaneously-active STPLAN records held by different STENT |

### §3.2 Pressure-source-class coverage

For each active high-urgency / load-bearing record class present in the bundle's state, the pool must contain at least one SLT whose `preconditions.hard[]` (or `preconditions.soft[]`) references that class via an existential predicate (`any_plan_active`, `any_emotion_active`, `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_thread_active`, `any_obligation_open`, `any_consequence_pending`, `any_belief`, `any_intention`, `any_relationship_axis`) OR a literal record-id reference.

**Source-class trigger map:**

| Record class | Existential predicate(s) |
|---|---|
| STPLAN | `any_plan_active` |
| STEMO | `any_emotion_active` |
| CLK | `any_clock_active` |
| STSEC | `any_secret_unrevealed` |
| STQ | `any_story_question_open` |
| THR | `any_thread_active` |
| OBL | `any_obligation_open` |
| CNSQ | `any_consequence_pending` |
| BEL | `any_belief` |
| STINT | `any_intention` |
| SREL | `any_relationship_axis` |

### §3.3 Composition

The two coverage axes compose: for each (driver-kind, source-class) pair the trigger maps in §3.1 and §3.2 jointly demand, at least one SLT in the pool must satisfy BOTH. (E.g., a bundle with an active STPLAN owned by an NPC demands at least one SLT with `compatible_turn_drivers: [..., npc_action, ...]` AND a precondition referencing STPLAN via `any_plan_active` or a literal STPLAN-N reference.) Driver-kind and pressure-source coverage are not redundant — a `world_pressure`-only SLT that references CLK satisfies the CLK source-class but NOT a `clock_fire`-driver requirement.

## §4 Skill Changes

### §4.1 `branching-story-bootstrap` Phase 6

**File:** `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` (and any sibling reference that enumerates Phase 6 seed-block rules).

**Addition (after the existing Cast-role coverage paragraph):**

> **Driver-kind coverage**: enumerate the bundle's active records per the §3.1 trigger map above and ensure at least one seed block exists with `grounding.compatible_turn_drivers[]` containing each triggered driver kind. The closed enum is `[player_action, player_write_in, npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision]`; seed-block authors pick the kinds the block's predicates structurally support.

> **Pressure-source coverage**: enumerate the bundle's load-bearing record classes per the §3.2 trigger map and ensure at least one seed block's `preconditions.hard[]` or `preconditions.soft[]` references each class via the appropriate existential predicate (`any_plan_active`, `any_emotion_active`, `any_clock_active`, etc.) or a literal record-id reference.

> **Composition**: for each (driver-kind, source-class) pair the bundle demands, at least one seed block must satisfy both axes simultaneously. The simplest case: bundles with active NPC STPLAN records need at least one seed block with `compatible_turn_drivers` containing `npc_action` AND a precondition referencing STPLAN.

These additions extend the existing cast-role coverage rule; they do not replace it. The bootstrap HARD-GATE flow at Phase 10 fails if any of the three coverage axes is unmet at minimal-or-standard `seed_commitment_blocks`. The `none` mode bypasses the coverage check because runtime JIT is the explicit alternative.

### §4.2 `commitment-block-authoring` Phase 1

**File:** `.claude/skills/commitment-block-authoring/SKILL.md` Phase 1 (gap-diagnosis).

**Addition:** Phase 1's current gap-diagnosis output enumerates move-family and causal-function gaps. Add per-axis coverage diagnostics for driver-kind and pressure-source-class using the §3 trigger maps applied to the CURRENT bundle state (loaded via the SPEC-81 `select_storylet_candidates(max_candidates=pool_size)` projection path; use `list_records(... include_full_body=true)` only as a fallback if the projection API is unavailable).

**Output shape** (additive to existing Phase 1 output):

```yaml
driver_kind_coverage:
  triggered_kinds: [player_action, npc_action, clock_fire]
  uncovered_kinds: [npc_action]   # bundle has active STPLAN/STEMO but no SLT with compatible_turn_drivers: [..., npc_action, ...]
pressure_source_coverage:
  triggered_classes: [STPLAN, STEMO, CLK, OBL]
  uncovered_classes: [STEMO]      # bundle has active STEMO but no SLT with any_emotion_active or literal STEMO-N reference
composition_gaps:
  - {driver: npc_action, source: STPLAN}
  - {driver: npc_action, source: STEMO}
```

Phase 1 diagnoses gaps; Phase 2-4 of `commitment-block-authoring` (existing) generates blocks to close them. The skill remains additive — it does not auto-generate; it informs authoring.

### §4.3 `branching-story-health-audit` (optional Phase 2-coverage extension)

**File:** `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 (audit surfaces).

**Addition:** New sub-phase `Phase 2o — Storylet Pool Coverage`. Runs the §3 coverage check against the current bundle state. Emits warnings (not hard fails) for uncovered driver-kind, pressure-source-class, and composition gaps. Aligns with the existing reactivity-inertness audit (Phase 2n) — that audit detects DOWNSTREAM symptoms (active records sitting inert); this audit detects UPSTREAM cause (pool can't express).

Emission shape parallel to existing Phase 2 audits; warnings carry the gap shape from §4.2 with the actionable hint "extend the pool via `commitment-block-authoring` direct_batch addressing these gaps."

## §5 Schema Changes

None. The coverage diagnostics operate over existing SLT fields (`grounding.compatible_turn_drivers[]`, `preconditions.hard[]`, `preconditions.soft[]`) and existing active-record class membership. No new schema surface is added.

## §6 Out of Scope

- **Pool-level pressure-distribution scoring** (drama-manager pattern). Rejected per SPEC-50 D.2 / FOUNDATIONS §Story Bundles §5c. This spec diagnoses presence/absence of coverage, not aggregate weighting or steering.
- **The remaining 6 axes of ChatGPT-Pro's matrix** (move family, response/action family, actor role lane, onstage/offstage, mystery/canon authority, aftermath/recovery/de-escalation). Either already covered by existing diagnostics (move family, role lane, onstage/offstage), already a per-SLT schema field with no consumer demand for pool-level coverage (mystery/canon authority), or speculative without consumer (aftermath/recovery/de-escalation).
- **Runtime SLT ranking by pressure-source priority**. Selection-time ranking remains local per FOUNDATIONS §5c. This spec is authoring-time only.
- **Auto-generation of SLTs to close coverage gaps**. The Phase 1 diagnostic INFORMS authoring; it does not auto-write SLTs. Authoring remains human-supervised through `commitment-block-authoring`'s existing HARD-GATE flow.

## §7 FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | aligns | Coverage diagnostics ensure the pool of causal moves can express the causes the bundle's state contains. Aligned with §5a's "when these conditions hold, this kind of action can happen" framing. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | No new schema fields. Diagnostics operate over existing SLT fields and active-record class membership. |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns | The coverage check is structurally local — it asks "for each present causal-state element X, can the pool express a move whose driver/source includes X?" This is the §5c local-salience pattern applied at authoring time, not a target-narrative-shape planner. The distinction from drama-manager scoring is the load-bearing one; this spec sits firmly on the §5c side because the diagnostic decides presence/absence only, never relative weighting. |
| §Story Bundles §6b (Information / Observer Firewall) | aligns | Coverage check is over predicate references and grounding fields; it does not introspect any record's hidden state. No firewall surface is touched. |
| Validation Rule 5 (No Consequence Evasion) | aligns | The check directly serves Rule 5 at the pool level — an active high-urgency consequence record without any pool storylet that can resolve through it is a consequence-evasion risk. The diagnostic surfaces the upstream cause of the iteration-1 reactivity problem. |

## §8 Validation Tests

1. **Coverage check positive case (bootstrap)**: A bootstrap run with `seed_commitment_blocks: minimal` against a bundle containing two NPC STENT + one STPLAN + one STEMO + one CLK produces seed blocks whose union covers `[player_action, npc_action, clock_fire]` driver-kinds and `[STPLAN, STEMO, CLK]` source-classes plus their composition pairs. Phase 10 HARD-GATE passes.
2. **Coverage check negative case (bootstrap)**: The same bundle but with seed blocks restricted to `player_action`-only fails the Phase 6 coverage rule with a clear error naming the uncovered driver-kinds, source-classes, and composition gaps.
3. **`commitment-block-authoring` Phase 1 diagnostic**: Against a synthetic bundle with the same shape as test 1, Phase 1 emits the coverage YAML in §4.2's shape and lists composition gaps if any block is missing.
4. **Health-audit Phase 2o**: On a bundle whose pool drifted out of coverage post-bootstrap (e.g., active records changed via supersession), Phase 2o emits warnings naming the gaps.
5. **Negative — no false positive on `none` mode**: A bootstrap run with `seed_commitment_blocks: none` skips the coverage check entirely; runtime JIT is the explicit alternative and the bundle is allowed to commit without any seeded SLT.

## §9 Implementation Notes

- SPEC-81 is complete and archived, so the preferred read path is `select_storylet_candidates(max_candidates=pool_size)`. The diagnostic code is unchanged because the relevant fields (`grounding.compatible_turn_drivers[]`, `preconditions.hard[]`) are projected by SPEC-81. The existing `list_records(... include_full_body=true)` path remains a fallback if the projection API is unavailable in a local operator context.
- The trigger maps in §3.1 and §3.2 are closed enumerations tied to currently-landed FOUNDATIONS surfaces. If a future spec adds a new driver kind or active record class, this spec's trigger maps must be extended — list this dependency in any such future spec's "Affects" section.
- The composition coverage at §3.3 is the strictest check; bundles with many active records will produce many composition pairs. The Phase 1 / Phase 2o output should be readable — emit at most the top-N gaps by triggering-record count if the gap list exceeds a presentation limit (suggest N=20).
- This spec is implementable independently of SPEC-79 (CHC field removal) and SPEC-82 (drift repairs). It depends on archived SPEC-81 only for the projection-driven read path; the fallback path makes that dependency soft.
