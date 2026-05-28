# Phase 5: Initial Debts and Optional CLK / STSEC / STQ / STPLAN / STEMO Seeds

Covers original §Phase 5 (Create initial debts).

Create 1-3 `THR` records tracking the opening pressure. Create `OBL` / `CNSQ` records only when they constrain a choice, demand response, track promise / risk / threat / cost, or create a future consequence if ignored. Every `OBL`, `CNSQ`, and `THR` record must set `urgency: low | medium | high` so later debt-salience checks can rank them uniformly. Create `SREL` records for relationships that constrain opening choice. Each `SREL.direction` uses the structured form from shared contract §4.5.7: `kind: directed` requires non-null `from` and `to` STENT ids, while `kind: bidirectional` requires `from: null` and `to: null`.

Consume the Distillation Boundary Ledger while seeding these records. Every opening-current fact routed to pressure, affect, plan, relationship, or staged debt must be represented before root `PG` and choice authoring:

- recent pursuit / opening incident -> SE, THR, CNSQ, CLK when ongoing pressure exists
- fear, shame, exhaustion, dissociation, or bravado failing under pressure -> STEMO
- inability to work, go home, speak, flee, or approach -> STPLAN / STINT
- active relationship change or counterpart-specific current stance -> SREL
- active obligation, threat, consequence, debt, or staged pressure -> OBL / THR / CNSQ / CLK

If a fact is not durable enough for STCHAR and no state record is created for it, it must not appear in bootstrap choices or downstream render handoff as an unexplained assertion.

**Cross-class provenance for `THR` / `SREL` / `CNSQ` / `SF` / story-`DA`.** The `derived_from` of these classes is the canonical record-id set — it accepts the active state classes (`CLK`, `STSEC`, `STQ`, `STSTAT`, `STPLAN`, `STEMO`), not only the legacy `SF` / `SREL` / `CNSQ` / `BEL` set. When a record's existence is *caused by* a seeded active record, ground it there rather than routing around it: a `THR` whose tension **is** a pressure clock derives from that `CLK`; a `THR` or `SF` that exists because of a concealed truth derives from the `STSEC`; a `SREL` shift driven by a seeded affective state derives from the `STEMO`; a `CNSQ` set in motion by an actor's tactical plan derives from the `STPLAN`. Reach for the most direct cause — under-linking provenance to a legacy proxy (e.g., grounding a clock-driven thread in a downstream `CNSQ` because the clock "wasn't allowed") is the staleness this guidance closes.

```yaml
direction:
  kind: directed
  from: STENT-1
  to: STENT-2

direction:
  kind: bidirectional
  from: null
  to: null
```

**Good debt** changes what a cast member can actually do at the opening. **Bad debt** restates the premise, names a theme, encodes an act structure, or predicts a future plot beat. Do not create bad debt.

Optional SPEC-42 seed records are allowed in this same phase, but they are not mandatory at bundle creation. Seed them only when the premise warrants them and when their first record is needed to make root-page choices or state truthful:

- Deadline-flavored, pursuit, exposure, faction, mission, or worsening-condition pressure -> seed a `CLK` pressure clock. Example: "the evacuation must finish before the dam breaks" starts a deadline clock; "the patrol sweep closes one district per night" starts an exposure or pursuit clock. Use the schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.14 and create via `create_clk_record`.
- Conspiracy, betrayal, concealed identity, hidden relationship, secret motive, or institutional cover-up -> seed a `STSEC` story secret when multiple BEL / SF / DA anchors point at one hidden truth. Example: "Captain Sera lied about the ferry manifests to protect her brother" can seed a secret with clue carriers and holder visibility. Use §4.5.15 and create via `create_stsec_record`.
- Explicitly introduced setup, promise, or dramatic question that is already open at root -> seed a `STQ` story question / open setup. Example: "the sealed letter implies betrayal, but no one knows whose" can seed a present-causal open setup; do not add `expected_payoff_mode`, act-position, or other §5c prohibited fields. Use §4.5.16 and create via `create_stq_record`.

When optional CLK / STSEC / STQ records are seeded, include their ids in `SE-1.state_delta.create[]`, `PG-1.state_snapshot.active_records`, relevant `CHC.grounded_in.records[]`, and the patch plan. If none of the premise-flavor cues are present, seed zero CLK/STSEC/STQ records and continue with the existing OBL / CNSQ / THR / SREL posture.

Optional SPEC-47 seed records are allowed in this same phase, but only when they are load-bearing present-causal state:

- Seed `STPLAN` for an actor whose medium-range tactical agency matters at story start: the actor has an active `STINT`, a concrete objective, a current step, belief/resource basis, and known blockers or fallbacks that will shape the first choices or downstream scene plan. Do not create plans for every cast member by default; bootstrap over-seeding is later visible to `branching-story-health-audit` as bootstrap-drift.
- Seed `STEMO` for an actor whose transient affective pressure changes choices, prose interpretation, or state interpretation at story start. Use closed `affect_kind` / `behavioral_pressure` values from shared schema §4.5.18; do not record ambient mood, prose tone, or a planned emotional arc.
- If a seeded `STEMO` has `agency_effect: constraining`, the Rule 1 / Rule 5 receipt is downstream grounding: an emitted `CHC.grounded_in.records[]` entry naming the `STEMO`, a holder-matched active `STPLAN.derived_from[]` entry, or an active `SREL.derived_from[]` entry whose `participants[]` includes the holder. `SE-1.non_propagation_facts[]` and `SE-1.state_relations[]` do not discharge affective-constraint grounding.

When optional STPLAN / STEMO records are seeded, include their ids in `SE-1.state_delta.create[]`, `PG-1.state_snapshot.active_records`, relevant `CHC.grounded_in.records[]` when choices depend on them, and the patch plan. Downstream scene plans render active plans and emotions when they are relevant to prose.

When STCHAR stable conduct, pressure behavior, appraisal, or relationship-specific behavior is load-bearing for an initial `SREL`, `STPLAN`, or `STEMO`, include the relevant `STCHAR-*` in that record's `derived_from[]` per the shared schema commentary. `STINT` may derive its appetite, refusal, or pressure behavior from STCHAR when those traits make the initial intention lawful. `BEL` does not use STCHAR as an epistemic basis; belief access still routes through observation, testimony, memory, documents, or another lawful access route.
