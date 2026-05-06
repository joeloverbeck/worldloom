<!--
Per-bundle INDEX.md template — used by branching-story-bootstrap Phase 11 step 5.

Lives at worlds/<world-slug>/stories/<story-slug>/INDEX.md (one file per story
bundle, distinct from worlds/<world-slug>/stories/INDEX.md which lists all
bundles in the world).

The runtime page-cycle and branching-story-health-audit both consume this
file to summarize branch status, active threads, mysteries in play, and
storylet pool shape distribution.
-->

# Story <story_slug>

**STORY-NNN**: STORY-NNNN
**World**: <world-slug>
**Created**: <iso8601>
**Designing principle**: <one sentence — same string as STORY_KERNEL.md §Designing Principle>

## Branches

| BR | Leaf page | Branch path | Status | Health |
|---|---|---|---|---|
| BR-0001 | PG-0001 | [PG-0001] | active | open: <count>, debt: <level> |

## Active threads

| THR | Type | Status | Pressure |
|---|---|---|---|
| THR-0001 | <type> | active | <0..10> |

## Mysteries in play

| M | Resolution safety | Touched at |
|---|---|---|
| M-N | low / medium / high / forbidden | declared at bootstrap |

## Storylet pool

Total: <count> author-pool storylets.

Shape distribution: entry_pressure: N | cast_introduction: N | threat_escalation: N | relational_dynamics: N | routine_disruption: N | aftermath_sequel: N | reflection_dilemma: N

## Pages rendered

| PG | Branch | Storylet | Choices emitted | Content intensity |
|---|---|---|---|---|
| PG-0001 | BR-0001 | SLT-NNNN | <count> | <intensity> |

## Cast

<For each STENT in cast_bind_list, one line:>

- **<name> (<STENT-NNNN>)** — `<role_in_story>` — <current_location>
