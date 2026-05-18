# Phase 1: Resolve the action

If `chosen_choice_id` is supplied, load the `CHC` record; its action-family list, `associated_commitment_block`, and `success_policy` (if any) drive the routing.

If `manual_action_text` is supplied, parse it into a structured `proposed_action`:

```yaml
proposed_action:
  actor: STENT-<integer> | player_character | unknown
  action_family: move | evade | pursue | perceive | investigate | communicate | persuade | negotiate | bond | oppose | harm | protect | control | transfer | use | make_change | ritual_protocol | recover | wait | decide
  target_records: [<record id>]
  intended_outcome: <natural-language statement>
  visible_method: <natural-language statement>
  implied_claims: [<short label>]
```

The `## Player Agency Contract` is a required routing input for `manual_action_text`. Parse the action against:

- **Agency surface** — the actor must be the controlled `STENT` or a permitted multi-entity/proxy action named by the contract.
- **Write-in envelope** — the action family and method must fit the bundle's admissible manual-action categories; out-of-envelope actions route to `world_block` or `promotion_hold` as appropriate, never silent rejection.
- **Viewpoint limits** — private knowledge not available to the viewpoint character can guide a write-in only when the contract explicitly permits player-over-character knowledge.

Route to exactly one of six outcomes per shared contract §6:

- `accept` — the action can happen as stated given current state + world canon.
- `accommodate` — the intent is honored but world constraints transform the surface.
- `attempt` — success is uncertain; resolve by state / capability / opposition / consequences; define a success / partial-success / failure path.
- `world_block` — the action is impossible in the current world/state; the page dramatizes the failed attempt or the impossibility itself.
- `promotion_hold` — the action asserts a world-level truth or canon mystery resolution; pauses for `story-fact-promotion-to-canon`. The state delta records ONLY the branch-local appearance, not the canon claim as already true.
- `terminal` — the action coherently closes the branch.

Draft `SE.resolution` before leaving Phase 1:

- Required for `attempt`, `accommodate`, and `world_block`.
- `attempt` uses `result: success | partial_success | failure`.
- `accommodate` uses `result: partial_success | transformed`.
- `world_block` uses `result: impossible | failure`.
- `promotion_hold` may omit `resolution`, or use `result: held_for_promotion` when the page should explicitly surface that the result is held for promotion.
- `terminal` may omit `resolution`, or use `result: success | partial_success | failure | transformed` when the closure needs explicit consequence feedback.
- `accept` omits `resolution`.

When `resolution` is present, set `player_visible_feedback` to one sentence naming what the player should be able to perceive about why the action resolved this way. Do not add `reason_class`; the route, result, rationale, and state delta are sufficient.

**Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` record with `world_logic_rationale` explaining the route plus a page plan that dramatizes the outcome.
