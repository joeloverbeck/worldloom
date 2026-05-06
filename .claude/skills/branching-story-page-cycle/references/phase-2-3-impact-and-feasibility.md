# Phases 2-3: Impact Analysis + Continuation Feasibility

## Phase 2: Impact Analysis

For the validated `ProposedEvent`, compute:

```yaml
facts_created: [SF-template, ...]
facts_invalidated: [SF-NNNN, ...]
obligations_affected:
  opened: [OBL-template, ...]
  paid_off: [OBL-NNNN, ...]
  complicated: [OBL-NNNN, ...]
  transferred: [{from_owner, to_owner, OBL-NNNN}, ...]
  abandoned_with_acknowledgment: [OBL-NNNN, ...]
intentions_pressure_deltas:
  - {STENT-NNNN, pressure_delta, emotional_state_delta, beliefs_changed}
threads_pressure_deltas:
  - {THR-NNNN, pressure_delta, status_change}
impossible_storylets: [SLT-NNNN, ...]    # storylets in pool whose hard_preconds will be invalidated
newly_eligible_storylets: [SLT-NNNN, ...] # storylets newly satisfied
transferable_functions:                   # if a character is killed/incapacitated
  - {from: STENT-NNNN, to: STENT-NNNN | object,
     function: <secret_holder | clue_carrier | rival | mentor | ...>}
required_aftermath:                       # consequences that MUST be addressable downstream
  - {kind: body_discovery | faction_reaction | rumor_wave | guilt_or_justification | ...,
     scope, urgency}
```

Every `SF-template` in `facts_created` carries `visible_to_reader` and
`reader_visibility_basis`. The safe default is `visible_to_reader: false` with
`reader_visibility_basis: unrevealed_objective_truth`. Use
`visible_to_reader: true` only when the turn deliberately creates reader-facing
knowledge, and then use a positive basis:
`shown_in_pg0001`, `known_to_pov`, `dramatic_irony`, or
`diegetic_artifact_visible`.

The destructive-choice case is the canonical example: when the protagonist shoots the mentor, the engine identifies `mentor_dead`, invalidates `mentor_available`, transfers the secret-holder function to `mentor_journal`, transfers the moral-judgment function to `rival`, and emits `body_discovery`, `protagonist_guilt_or_justification`, and `faction_reaction` as required_aftermath items.

**Rule**: `required_aftermath` is NOT a temporary analysis artifact — it is persisted as `CNSQ-NNNN` records in Phase 5. Storylet selection on subsequent turns reads `state_snapshot.consequences_pending` and prefers storylets whose effects address those consequences (Phase 4 salience scoring). Without persistence, the engine identifies "body discovery" once and then forgets — turning the promise/consequence engine into a goldfish. Phase 9 gate 12 (consequence persistence) is the structural backstop.

## Phase 3: Continuation Feasibility Check

After applying the ProposedEvent, the engine checks:

- Are there ≥1 storylets satisfied by the new state? (in pool OR JIT-generatable per a brief LLM probe)
- Are all `required_aftermath` items addressable by some storylet (existing or JIT)?
- Are open `forbidden`-status M-NNNN entries still preserved (firewall intact)?
- Does the new state violate any world INV (cross-checked against the whole-class INV load from Pre-flight)?

### Terminal Feasibility

A choice does NOT fail continuation feasibility if it produces a coherent terminal branch — sometimes a wild user choice produces an honest ending and the engine should honor it rather than contort itself to keep the branch alive.

A terminal branch must:
- resolve or acknowledge all required-closure obligations visible to the reader (acknowledgment may be `abandoned_with_acknowledgment`, `tragic_loss`, or `failed_expectation` — never silent abandonment)
- address all pending high-salience consequences (CNSQ with `salience >= 7`)
- produce a terminal page whose `state_snapshot.branch_terminal: true`
- update the branch's `BR-NNNN` status to `terminal` via supersession at Phase 11

When the engine detects terminal feasibility, Phase 8's emitted choices may include explicit terminal options (clearly labeled as potentially final without spoiling the exact outcome).

### On Infeasibility

Surface to user:

```
The choice you've selected would dead-end the story:
- Reason: <e.g., "no storylet can absorb the body-discovery aftermath given current pool">
- Required aftermath items unaddressable: <list>

Options:
1. Accept anyway — the story may struggle to continue coherently
2. Transform — engine reshapes the choice (e.g., wound instead of kill)
3. Treat as attempt — action attempted but fails diegetically
4. Pick a different choice
```

User picks. If "Accept anyway", the runtime proceeds with reduced consequence-capacity guarantees and flags the resulting page via `narrative_health.flagged_for_audit: true` for later review by `branching-story-health-audit` (see its `audit_focus=flagged_pages_priority` value).
