# Phase 1: Choice Resolution

Two paths converge into a single validated `ProposedEvent`.

## Path A — Standard Choice

- `chosen_choice_id ∈ parent_page.emitted_choices` (verified at Pre-flight).
- Load `_source/choices/<chosen_choice_id>.yaml`.
- `ProposedEvent` is populated from the selected CHC record's structured
  fields: `choice_kind`, `commitment_class`, `strategy_cluster`,
  `choice_worthiness`, `choice_contract`, `likely_effects`, and
  `continuation_capacity`, plus any deterministic operation/actor/target
  payload fields carried by the choice's `choice_contract`.
- Carry the selected CHC's `commitment_class` forward to Phase 4; the arc
  selection hard filter admits only arcs whose `arc.arc_contract.commitment_class`
  matches that value. Phase 7 / Phase 8 / Phase 9 continue to honor
  `choice_contract` and `continuation_capacity`.

## Path B — Write-In (LLM acts as parser)

### B.1 Parse

LLM parser receives:
- `parent_page.state_snapshot` (cast_present, facts visible to POV, open OBLs, intentions).
- `manual_action_text` (the user's typed action).
- content_policy preamble (verbatim, FIRST in prompt).

LLM produces a tentative `ProposedEvent`:

```yaml
action: <verb>
actor: <STENT-id>          # who performs (defaults to POV)
target: <STENT-id | object | location>
instrument: <STENT-id | object | null>
possible_outcomes:
  - {outcome_id, description, probability_hint}
narrative_intent: >
  <one-line description of what the user is trying to achieve narratively>
```

### B.2 Engine Validation

Validate `ProposedEvent` against `state_snapshot`:
- actor exists in `cast_present`?
- target exists / is in scope (in cast_present, or known object in inventory, or accessible location)?
- instrument is in protagonist's possession or accessible?
- actor has the knowledge required for the action (e.g., confessing a secret requires knowing it)?
- the verb's hard preconditions are satisfied (e.g., "shoot" requires a firearm available, line of sight to target, target alive)?

### B.3 Routing on Validation Failure

| Routing | When | Response shape |
|---|---|---|
| **REFUSE_ONLY_THROUGH_WORLD_LOGIC** | Action is impossible at this state — actor / target / instrument absent or out of scope | Render an in-world reason. NEVER silently block. ("You reach for the pistol — but it's still on the dresser in your room three streets away.") |
| **TREAT_AS_ATTEMPT** | Action is possible, but full success is not sufficiently supported by current state: opposition, distance, knowledge gaps, tools, character ability, environmental constraints, or established consequences make success uncertain | Action is attempted; fails or partially succeeds diegetically; leaves consequences. ("You draw, but he sees the motion and knocks your arm aside.") |
| **ACCEPT_BUT_TRANSFORM** | Action is viable but needs reframing for coherence | Adjust outcome; ask user to confirm. ("You fire, but the shot wounds him; he survives long enough to say one fragment of the secret.") |
| **ACCEPT** | State can absorb the action as proposed | Proceed |

The `TREAT_AS_ATTEMPT` framing is **causal, not authorial**: the question is whether the current state (cast, instruments, knowledge, opposition, environment, prior consequences) supports full success — never "would instant success break pacing?". Authorial pace-protection is the narrative governor's job (Phase 6), NOT Phase 1's.

Multiple plausible outcomes (e.g., shoot → miss / wound / kill): the engine either asks the user to pick or selects per a state-coherence weighting (the LLM proposes per-outcome rationales; the engine weights). Configurable per story.

### B.4 Write-In Commitment-Class Classification

After the four-way routing decision, an additional commitment-class classification
step runs for write-ins that proceed past impossible-state refusal:

1. The LLM parser reads the user's free-form `manual_action_text`, the routing
   verdict, and the arc-eligible `commitment_class` enum loaded via
   `mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'})`.
2. It classifies the manual action's intended commitment into exactly one entry of
   the closed `commitment_class` enum.
3. If classification fails because the action does not fit any commitment class,
   route via `REFUSE_ONLY_THROUGH_WORLD_LOGIC` even if the four-way routing
   initially returned `ACCEPT`.

The classified `commitment_class` is handed to Phase 4 as an arc-selection filter.
See `phase-4-storylet-and-mystery-authority.md` §Hard Filters for the consumer-side
filter that matches `arc.arc_contract.commitment_class` against the chosen CHC's
commitment class or this write-in classifier output.

### B.5 Rule

A write-in input is NEVER silently rejected. The four-way routing is the contract. The user always gets a coherent in-world response, even if their intended action is impossible.
