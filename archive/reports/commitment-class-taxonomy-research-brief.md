# Commitment Class Taxonomy Research Brief

## Purpose

This report is a handoff brief for researching whether Worldloom's
`commitment_class` taxonomy is broad enough for general interactive fiction, and
if not, what taxonomy should replace or extend it.

The specific research question:

> Can a finite, practical taxonomy of player-side narrative commitments cover the
> breadth of fiction well enough to drive an LLM-assisted branching narrative
> engine, or should Worldloom use a smaller set of routing families plus
> story-specific commitment labels?

This brief does not answer that question. It defines what `commitment_class`
currently means in the engine and lists the current values that a research pass
should evaluate.

## What `commitment_class` Represents

`commitment_class` is the user-side commitment encoded by a choice or write-in:
what the protagonist is committing to do at the level of scene strategy.

It is not meant to describe:

- the surface action label;
- the prose tone;
- a gesture or microbeat;
- the scene's dramatic structure;
- the final outcome.

The paired concept `arc_archetype` describes how the commitment plays out
structurally. `commitment_class` answers "what kind of commitment did the user
make?" `arc_archetype` answers "what dramatic shape carries that commitment?"

Operationally, `commitment_class` is a routing key. It is used to:

- classify a user-facing CHC choice;
- classify free-form write-ins after basic action validation;
- select eligible scene-commitment storylets;
- prove that a CHC has continuation capacity;
- measure storylet-pool and realized-arc coverage;
- detect over-representation or "commitment monoculture."

Because of those uses, it is more load-bearing than `arc_archetype`. If
`commitment_class` becomes fully free-form, deterministic matching between
choices and storylets becomes weaker unless another normalized routing layer is
introduced.

## Current Contract

The current active contract treats `commitment_class` as a closed enum.

The active instructions say:

- storylets use `commitment_class: <commitment_class enum>`;
- diagnosis distributions must use `COMMITMENT_CLASSES`;
- write-ins are classified into exactly one `commitment_class` enum value;
- RSP remediation cards must use canonical `target_commitment_class` values.

The current JSON schemas are looser than the prose contract: they require a
non-empty string but do not enforce enum membership. The design intent is still
closed-enum, and the MCP surface exposes `commitment_class` as a canonical
vocabulary.

## Current Values

Current `COMMITMENT_CLASSES`:

| Value | Plain-English reading |
|---|---|
| `stay_available_without_pressure` | Remain present, supportive, and non-coercive without forcing disclosure or response. |
| `offer_practical_help` | Offer concrete help, safety, service, repair, or support. |
| `ask_one_bounded_question` | Ask a limited question without widening into interrogation. |
| `withdraw_without_abandoning` | Step back or leave space while preserving care, availability, or future return. |
| `confess_one_thing` | Disclose one bounded fact, feeling, secret, or vulnerability. |
| `accept_offered_help` | Accept another character's aid, offer, care, guidance, or protection. |
| `refuse_with_grace` | Decline without escalating, shaming, severing, or punishing. |
| `escalate_to_confrontation` | Move into direct challenge, conflict, accusation, demand, or exposed disagreement. |
| `conceal_under_pressure` | Hide, deflect, mask, or protect information while pressure exists. |
| `seek_third_party` | Bring in, consult, summon, or route through another actor or authority. |
| `change_venue` | Move the scene to a different place, route, room, or situational frame. |
| `make_public_commitment` | Make a promise, allegiance, declaration, or stance visible to others. |
| `private_betrayal` | Violate trust, loyalty, privacy, or confidence in a concealed/private way. |
| `bear_witness` | Observe, acknowledge, remember, or validate without necessarily intervening. |
| `release_pressure` | De-escalate, let go, forgive, drop a demand, or lower tension. |
| `tighten_pressure` | Increase urgency, demand clarity, press advantage, or narrow available exits. |
| `defer_decision` | Postpone choice, delay commitment, preserve options, or wait for more context. |
| `force_disclosure` | Compel, expose, corner, or demand revelation. |
| `mirror_acknowledgment` | Reflect back what another character has shown or said, recognizing it without adding much new action. |
| `intimacy_advance` | Move toward greater intimacy, vulnerability, erotic/romantic contact, or relational closeness. |

## Known Concerns

The 20-value set was created as an initial scene-commitment vocabulary. It may be
too narrow for broad fiction because commitments vary by genre and social frame.

Possible missing or under-specified areas include:

- investigation, experimentation, and hypothesis-testing;
- bargaining, trade, negotiation, and compromise;
- command, leadership, and delegation;
- deception beyond concealment;
- play, seduction, ritual, performance, and social display;
- violence, defense, rescue, pursuit, evasion, and surrender;
- moral judgment, punishment, mercy, and restitution;
- resource expenditure and sacrifice;
- allegiance shifts, oath-taking, and institution-facing commitments;
- teaching, mentoring, caretaking, and stewardship;
- world-facing commitments such as travel, exploration, craft, study, or survival.

Some of these might be covered by existing values through interpretation. The
research task is to determine whether that compression is useful or whether it
will cause repeated misclassification.

## Research Questions

1. What taxonomies already exist for narrative actions, player intents,
   social moves, dramatic functions, or scene-level goals?
2. Can those taxonomies be adapted into a practical `commitment_class` set for
   prose-based interactive fiction?
3. What is the right granularity: 20 classes, 40-80 classes, hierarchical
   families, verb frames, speech-act classes, or genre-local extensions?
4. Should `commitment_class` remain closed, become open, or become hybrid:
   `commitment_family` closed + `commitment_class` story-specific?
5. What taxonomy best supports deterministic routing without flattening the
   breadth of possible fictional commitments?

## Design Options To Evaluate

### Option A: Closed Expanded Enum

Replace the current 20 values with a larger closed taxonomy.

Strength: deterministic matching stays simple.

Risk: any fixed list may still fail across genres, and expansion becomes a
maintenance burden.

### Option B: Open Orienting Label

Treat `commitment_class` like `arc_archetype`: a preferred library value, but
story-specific labels are allowed.

Strength: expressive breadth.

Risk: CHC-to-SLT matching, write-in classification, and coverage reports lose a
stable join key.

### Option C: Hybrid Routing Family + Specific Label

Use a closed routing layer and an open semantic layer:

```yaml
commitment_family: offer_practical_help
commitment_class: protect_someone_from_social_exposure
```

or:

```yaml
base_commitment_class: offer_practical_help
commitment_class: protect_someone_from_social_exposure
```

Strength: preserves deterministic routing while allowing story-specific
precision.

Risk: schema and skill changes are broader than simply expanding the enum.

## Suggested Output From Deep Research

A useful research answer should include:

- a proposed taxonomy or hierarchy;
- rationale for each top-level category;
- examples across genres;
- mapping from the current 20 values to the proposed system;
- guidance on whether current values should remain as base classes;
- recommendation on closed vs open vs hybrid representation;
- citations to narrative theory, game design, interactive narrative, planning,
  speech-act theory, or social-action taxonomies where applicable.

## Source Pointers In This Repo

- `tools/world-index/src/public/canonical-vocabularies.ts` defines the current
  `COMMITMENT_CLASSES`.
- `archive/specs/SPEC-19-scene-commitment-arc-schema.md` defines the conceptual
  distinction between `commitment_class` and `arc_archetype`.
- `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`
  describes write-in classification into `commitment_class`.
- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`
  shows the SLT field where `commitment_class` is used.
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md`
  uses `commitment_class` distribution as a diversity axis.
- `.claude/skills/branching-story-health-audit/SKILL.md` uses
  `commitment_class` for continuation-capacity and coverage audits.
