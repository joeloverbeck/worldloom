# Phase 6: Narrative Governor Recompute + Nudge (with Phase 6.5 Closure Readiness)

## Recompute Narrative Health

Recompute health metrics for `this_page`:

```yaml
narrative_health:
  open_obligation_count: <count of OBLs in obligations_open>
  high_salience_unpaid_count: <count of OBLs with salience >= 7>
  average_obligation_age: <avg pages since OBL.introduced_at_page>
  contradiction_risk: <0..1; rises with retcons, fact invalidations, abandoned high-salience obligations>
  causal_connectivity: <0..1; how many recent events causally chain to prior events>
  character_motivation_coverage: <0..1; how many active actions are explicable by current STINT>
  unresolved_threat_pressure: <sum of THR.current_pressure for type==threat>
  recent_consequence_density: <consequence-bearing pages / last N pages>
  recent_reflection_density: <reflection-shape pages / last N pages>
  novelty: <1 - similarity to recent prose>
  tension: <0..1>
  agency_score: <0..1; ratio of pages where user choice changed state materially vs forced>
  flagged_for_audit: <bool — true if Phase 3 §On Infeasibility took the Accept-anyway route>
```

## Generate `governor_nudge`

The nudge biases Phase 8 choice generation (and Phase 4 of the NEXT turn). The governor is a homeostat on narrative debt — **NOT an act-spine**.

| Health condition | Nudge |
|---|---|
| `high_salience_unpaid_count >= 4` | Bias toward payoff / closure storylets and choices |
| `recent_consequence_density < 0.3` AND `unresolved_threat_pressure > 5` | Bias toward escalation |
| `recent_consequence_density > 0.7` AND `recent_reflection_density < 0.2` | Bias toward reflection / consolidation |
| `recent_reflection_density > 0.5` AND `tension < 0.3` | Bias toward action / breach |
| Reader knows a high-emotional-weight secret for ≥6 pages | Bias toward reveal / exploit / reframe |
| Actor performed extreme action ≤2 pages ago | Bias toward justification / fallout |
| `agency_score < 0.5` | Bias toward choices that materially change state |
| `pace_hint` set in input | Override above; honor user pace request |

**The governor never enforces milestones.** It nudges weighting; it never says "we need the Act II turning point now."

## Phase 6.5: Closure Readiness Detection

Closure readiness is **derived from state**, not from milestones.

A branch becomes closure-ready when ALL of:
- no `required_closure: true` OBL remains open, OR all remaining required-closure OBLs have explicit abandonment / tragic-loss / failed-expectation acknowledgment routes available in the storylet pool
- no high-urgency CNSQ remains pending (`urgency >= 7`)
- at least one major THR is resolved, failed, transformed, or deliberately left open
- character-intention changes caused by recent events have been acknowledged (no STINT shows a >3-step pressure delta from its parent without a refresh in the recent ~5 pages)
- contradiction risk is below threshold (`narrative_health.contradiction_risk < 0.4`)

When closure-ready, Phase 8 should include at least one branch-ending or branch-pausing choice in the emitted set, alongside continuation choices if the story remains open-ended. This honors user agency: the player can choose to end the branch coherently, continue, or fork.

The branch is **not** forced to terminate when closure-ready. The signal only widens the choice set.
