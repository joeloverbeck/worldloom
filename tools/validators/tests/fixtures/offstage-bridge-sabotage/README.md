# Offstage Bridge Sabotage

SPEC-85 golden fixture for the `offstage_action` non-player driver kind.

The canonical fixture models an enemy operative sabotaging a bridge outside the player's sightline:

- `SE-1` is a `turn_resolution` driven by `turn_driver.kind: offstage_action`.
- `turn_driver.driver_records` cites both `STPLAN-1` and `DA-1`: the offstage plan and the witness report that makes the offstage event player-visible.
- `turn_driver.player_response_mode` is `responds`.
- The player receives a report after the fact, so `pov_visibility: reported` is lawful.
- `BEL-1` is active on parent `PG-1` and grants the access route to both driver records.
- Page plan section `7a` names the DA/BEL access route and accounts for the high-urgency STPLAN pressure.
- The emitted CHC is grounded in `DA-1`, proving response grounding through accessible evidence rather than hidden interiority.

The integration test mutates this fixture into three failure variants:

- direct offstage visibility -> `turn_driver_offstage_perceived_directly`
- missing access-route BEL -> `turn_driver_missing_access_route`
- page-plan hidden-mind narration -> `turn_driver_offstage_direct_mind_access`
