# Red Kiln Ambush

SPEC-76 golden fixture for the turn-driver primitive and pressure-driven turn cycle.

The canonical fixture models Varro firing through the west window at the Red Kiln:

- `SE-2` is a `turn_resolution` driven by `turn_driver.kind: npc_action`.
- `turn_driver.driver_records` cites `STPLAN-9`, `STEMO-12`, `CLK-3`, and `THR-4`.
- `turn_driver.player_response_mode` is `responds`; emitted CHCs carry no per-choice response-mode field.
- Jon directly sees the shot line, so `pov_visibility: perceived_directly` is lawful.
- Legacy page plan section `7a` projects the driver and accounts for every high-urgency active pressure.
- Emitted CHCs use the post-SPEC-79 choice schema and at least one is grounded in a driver record.

The integration test mutates this fixture into three failure variants:

- no driver -> `turn_driver_missing`
- hidden mind leak -> `turn_driver_hidden_state_leak`
- wrong response mode -> `turn_driver_response_mode_invalid` on the driving SE record
