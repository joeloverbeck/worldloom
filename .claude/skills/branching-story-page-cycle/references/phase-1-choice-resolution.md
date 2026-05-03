# Phase 1: Choice Resolution

Two paths converge into a single validated `ProposedEvent`.

## Path A — Standard Choice

- `chosen_choice_id ∈ parent_page.emitted_choices` (verified at Pre-flight).
- Load `_source/choices/<chosen_choice_id>.yaml`.
- `ProposedEvent` populated directly from CHC's structured fields: `operation`, `actor`, `target`, `instrument` (if present), `uses_fact`, `likely_effects`, `choice_mode`, `poetic_effect`, `choice_contract` (carries `allowed_outcome_band` and `forbidden_outcomes` — Phase 7 / Phase 8 / Phase 9 honor this contract).

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

### B.4 Rule

A write-in input is NEVER silently rejected. The four-way routing is the contract. The user always gets a coherent in-world response, even if their intended action is impossible.
