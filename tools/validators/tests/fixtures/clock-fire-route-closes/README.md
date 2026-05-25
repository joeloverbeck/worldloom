# Clock Fire Route Closes

SPEC-85 golden fixture for the `clock_fire` non-player driver kind.

The canonical fixture models a toll-gate clock reaching its closing threshold:

- `SE-1` is a `turn_resolution` driven by `turn_driver.kind: clock_fire`.
- `turn_driver.driver_records` cites `CLK-1`, which is active and at threshold on parent `PG-1`.
- `turn_driver.player_response_mode` is `responds`; emitted CHCs carry no per-choice response-mode field.
- The player directly observes the route closing, so `pov_visibility: perceived_directly` is lawful.
- Page plan section `7a` projects the driver and accounts for the high-urgency CLK pressure.
- The emitted CHC is grounded in `CLK-1`, proving topical response grounding.

The integration test mutates this fixture into three failure variants:

- empty driver records -> `turn_driver_driver_records_empty_for_non_player`
- missing active-pressure row -> `high_urgency_active_record_unhandled`
- response CHC grounded away from the driver -> `chc_response_topical_grounding_missing`
