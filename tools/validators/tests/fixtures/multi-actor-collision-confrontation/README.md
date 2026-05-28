# Multi-Actor Collision Confrontation

SPEC-85 golden fixture for the `multi_actor_collision` non-player driver kind.

The canonical fixture models two rival plans colliding in the player's scene:

- `SE-1` is a `turn_resolution` driven by `turn_driver.kind: multi_actor_collision`.
- `turn_driver.initiator` is `unknown`, because no single actor owns the collision.
- `turn_driver.driver_records` cites `STPLAN-1`, `STPLAN-2`, and `OBL-1`, spanning at least two STENT actors.
- `turn_driver.player_response_mode` is `responds`.
- `pov_visibility: perceived_directly` is lawful because the confrontation happens in the player's sightline.
- Parent `PG-1` carries high-urgency `STPLAN-1`, `STPLAN-2`, `OBL-1`, and thresholded `CLK-1`.
- Legacy page plan section `7a` names every driver record and accounts for all high-urgency active pressure rows.
- The selected SLT resolves the local dockside collision and avoids target-narrative-shape fields.
- The emitted CHC is grounded in the colliding records.

The integration test mutates this fixture into two failure variants:

- single-actor driver records -> `turn_driver_initiator_pattern_violation`
- response choice grounded away from the collision -> `chc_response_topical_grounding_missing`
