<!--
Per-bundle INDEX.md template — used by branching-story-bootstrap Phase 11 step 5.

Lives at worlds/<world-slug>/stories/<story-slug>/INDEX.md (one file per story
bundle, distinct from worlds/<world-slug>/stories/INDEX.md which lists all
bundles in the world).

The runtime page-cycle and branching-story-health-audit both consume this
file to summarize branch status, active threads, mysteries in play, and
storylet pool commitment_family and commitment_class distribution.
-->

# Story <story_slug>

**Story ID**: STORY-NNNN
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
| M-NNNN | low / medium / high / forbidden | declared at bootstrap |

## Storylet pool

Total: <count> seed scene-commitment arcs covering <commitment_families> / <commitment_classes>.

Commitment family distribution: inquiry_discovery: N | care_help_protection: N | pressure_coercion: N

Commitment class distribution: ask_one_bounded_question: N | offer_practical_help: N | stay_available_without_pressure: N | withdraw_without_abandoning: N | tighten_pressure: N

## Pages

| PG | Branch | Storylet | Choices emitted | Content intensity | Prose status | Plan path |
|---|---|---|---|---|---|---|
| PG-0001 | BR-0001 | — | <count> | <intensity> | pending | pages-prose-plans/PG-0001.md |

<!--
Prose status legend:
- `pending` — comprehensive plan written by branching-story-bootstrap or
  branching-story-page-cycle; rendered prose at pages-prose/PG-NNNN.md not
  yet supplied; branching-story-page-prose-finalize has not yet run.
- `rendered` — branching-story-page-prose-finalize merged the user-supplied
  pages-prose/PG-NNNN.md; deferred validators flipped from DEFERRED to
  PASS (or FAIL with rationale).
- `superseded` — a subsequent re-render via finalize replaced a prior
  rendered prose file (rare).
-->


## Cast

<For each STENT in cast_bind_list, one line:>

- **<name> (<STENT-NNNN>)** — `<role_in_story>` — <current_location>
