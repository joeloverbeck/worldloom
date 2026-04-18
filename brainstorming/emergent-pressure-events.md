# Emergent pressure events

## Purpose

Generate new world pressures and event seeds from the current world state without immediately hard-canonizing them.

This pipeline helps the world feel alive over time.

It is especially useful for:
- live worldbuilding
- campaign settings
- game-lore evolution
- simulating years between stories
- generating new book seeds

---

## Boundary with Adjacent Pipelines

Three pipelines occupy overlapping territory around "candidate canon material." The boundaries:

### vs `story-kernel-generation`
Emergent pressure events are **world-level** — they can exist without a protagonist. A trade collapse, a rumor wave, a ritual breach. They describe what the world is doing.

Story kernels are **narrative-bound** — they require a protagonist under incompatible pressure, a dramatic question, tellability. A kernel *consumes* pressure events (among other inputs) but adds character-specific structure, four-lens evaluation, and scene yield.

Pressure events that never become stories are still valuable — they season the world's background and may inform later campaign play or future canon.

`story-kernel-generation` Phase 1 consumes the current EPE card pool; it does not re-generate world-level pressure material that EPE already owns.

### vs `propose-new-canon-facts`
`propose-new-canon-facts` diagnoses **thinness gaps** in existing canon — synchronic enrichment aimed at closing missing domains (institutional adaptations, contested knowledge, mystery seeds, cross-domain couplings).

`emergent-pressure-events` simulates **temporal evolution** — diachronic progression that treats the world as a living system producing new developments from existing pressure.

An EPE card routed to `canonize` (see Downstream Routing below) may be:
- passed directly to `canon-addition` as a proposal (when the event implies a single, well-scoped canon fact), OR
- passed first through `propose-new-canon-facts` (when the event implies multiple facts, distribution-sensitive scope, or would benefit from thinness/diversification framing before adjudication).

Both routes are valid. The EPE card's `routing_rationale` field should indicate which is preferred.

### vs `canon-addition`
`canon-addition` is authoritative for canon mutation — it alone writes to `CANON_LEDGER.md` and produces `CH-NNNN` change log entries. EPE never mutates canon. EPE cards marked `canonize` are *candidates* for `canon-addition`; the user reviews and explicitly routes them.

---

## Inputs

- current world state (all 12 canon world files + `docs/FOUNDATIONS.md`)
- pressure systems
- active institutions
- unresolved conflicts
- seasonal / temporal context (current date / season / period)
- current mysteries in play (with firewall enforcement)
- recent canon additions (change log)
- existing EPE card pool (to detect recurrence, escalation, or contradiction)

---

## Output

### Artifact Structure

- `worlds/<world-slug>/pressure-events/EPE-NNNN-<slug>.md` — one card per event seed
- `worlds/<world-slug>/pressure-events/INDEX.md` — auto-updated index (partitioned by `status`: active / resolved / superseded)
- `worlds/<world-slug>/pressure-events/batches/BATCH-NNNN.md` — batch manifest when multiple cards are produced in one run

### ID Convention

`EPE-NNNN` allocated append-only at pre-flight by scanning the existing `pressure-events/` directory. Distinct namespace from `PR-NNNN` / `CHAR-NNNN` / `DA-NNNN` / `CF-NNNN` / `CH-NNNN` / `PA-NNNN`. Never reuse or overwrite.

### Card Content

A set of:
- plausible events
- social reactions
- institutional moves
- rumor waves
- local crises
- opportunity structures

These are not canon until reviewed and routed through `canon-addition`.

---

## Event Source Types

Generate from:
- scarcity pressure
- succession pressure
- ecological disruption
- taboo breach
- technology / magic leakage
- migration
- faction rivalry
- disease
- black market expansion
- theological dispute
- historical anniversary
- relic discovery
- trade collapse
- climate irregularity

---

## Traceability Rule

Do not generate events out of nowhere.

Every event must be traceable to:
- prior canon facts (cite `CF-NNNN` IDs)
- active institutions
- material conditions
- known pressures

The card's `traceability` field is mandatory. Seeds that cannot cite at least one concrete origin are rejected and regenerated from a different pressure point.

---

## Downstream Routing

Each EPE card carries a mandatory `downstream_routing` value with three options. This routing is the skill's **recommendation**; the user reviews during the HARD-GATE approval and may override per card.

### `canonize`
The event implies a new canon fact that should become world-level truth (addition, retcon, or new soft canon).

Downstream: the card is consumed by `canon-addition` as a `proposal_path`, or passed first through `propose-new-canon-facts` for formal PR shaping when scope/distribution/diversification framing is needed.

Use when:
- the event introduces a lasting institutional/material/social change that other canon will rely on
- the event retcons or narrows an existing fact
- the event creates a new soft canon truth (local practice, regional adaptation)

### `story_fuel`
The event is narratively pregnant but not itself canon-needing — the pressure it names is real, but the event is a temporary disturbance rather than a world-level truth.

Downstream: the card is listed as a dynamic input to `story-kernel-generation` Phase 1.

Use when:
- the event creates a concrete pressure collision a protagonist could inherit
- the event touches canon-edge or mystery-edge without requiring resolution
- the event's consequences are story-shaped (force choice, reveal institutional response) but do not need to be pinned as world-level truth

### `ambient`
The event colors the world's texture. No canon action. No story action expected.

Downstream: the card remains in `pressure-events/` as background. May be re-evaluated later (escalation, recurrence, or coupling with new events).

Use when:
- the event is a routine fluctuation (seasonal price change, recurring rumor)
- the event resolves or fades without lasting consequence
- the event's value is mood and verisimilitude, not narrative or canonical force

Ambient routing is valid only when the event still changes visible-consequence fields (benefits, sufferers, rumors). A card with empty consequence fields is not ambient — it is a pure-cosmetic violation of FOUNDATIONS Rule 2 and must be rejected.

---

## Canon Safety Check

Before any card is written, each must pass three sub-checks:

### 1. Invariant Conformance
No event may violate any invariant in `INVARIANTS.md`. Events that imply a new ontological / causal / distribution / social / aesthetic truth incompatible with existing invariants are either rejected or flagged as retcon candidates requiring `canon-addition` review.

### 2. Mystery Reserve Firewall
No event may accidentally resolve, explain, or contradict any entry in `MYSTERY_RESERVE.md`. Events that brush against mystery (a high-value move) must be routed `canonize` or `story_fuel` with explicit `mysteries_touched` citation — never `ambient`.

### 3. Distribution Discipline
Events that imply institutional or capability change must specify scope (`local` / `regional` / `global`) and cite why the change is not universal. Local events must not be silently treated as global (FOUNDATIONS Rule 4).

Any sub-check failure triggers: (a) narrow the event's scope, (b) reclassify as contested, (c) add missing costs, or (d) drop the card from the batch and regenerate from a different pressure.

---

## Event Card Template

```yaml
---
event_id: EPE-NNNN
world_slug: <slug>
batch_id: BATCH-NNNN   # optional, only if produced in a batch run
slug: <kebab-case-slug>
title: <short title>

event_seed: >
  <what the event is, in 1-3 sentences>

origin_type: pressure_collision | scarcity | succession | ecological_disruption |
             taboo_breach | technology_leakage | migration | faction_rivalry |
             disease | black_market | theological_dispute | anniversary |
             relic_discovery | trade_collapse | climate

traceability:
  cited_canon_facts: [CF-NNNN, ...]           # REQUIRED — at least one
  cited_institutions: [...]                    # optional
  cited_material_conditions: [...]             # optional
  cited_pressures: [...]                       # optional

actors_involved: [...]
what_changes_immediately: [...]
what_might_change_if_unchecked: [...]
who_benefits: [...]
who_suffers: [...]
rumor_waves: [...]
mysteries_touched: [M-NN, ...]                # Mystery Reserve firewall declaration

scope:
  geographic: local | regional | global
  temporal: acute | seasonal | chronic | cyclical
  why_not_universal: [...]

downstream_routing: canonize | story_fuel | ambient
routing_rationale: >
  <one-paragraph justification for the routing choice; if `canonize`, indicate
  whether direct to canon-addition or via propose-new-canon-facts>

canon_safety_flags:
  invariant_conformance: pass | needs_review
  mystery_reserve_firewall: pass | needs_review
  distribution_discipline: pass | needs_review

status: active | resolved | superseded
---

# Body

## Narrative Expansion
<prose describing the event>

## Consequence Propagation Notes
<first-order / second-order / third-order propagation>

## Routing Discussion
<why this routing, what would change if re-routed>
```

---

## Success Condition

The world should begin to feel as if new developments are latent within it, not imported by author whim.

Every card produced must satisfy:
- **traceability** (cites concrete origin in existing canon)
- **consequence visibility** (something outside a protagonist's feelings changes)
- **canon safety** (all three firewall sub-checks pass)
- **routing coherence** (routing_rationale matches the event's shape and downstream needs)

If any of these fail, the card is not ready — regenerate from a different pressure, or drop it.
