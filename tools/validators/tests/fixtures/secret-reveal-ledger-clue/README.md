# Secret Reveal Ledger Clue

SPEC-85 golden fixture for `secret_reveal`.

The player finds DA-1, a ledger margin clue that licenses a partial reveal of STSEC-1: the chamberlain has a secret debt. The fixture keeps the creditor's identity unresolved, so the reveal is bounded by the access route rather than a full Mystery Reserve answer.

Driver proof:

- `SE-1.turn_driver.kind`: `secret_reveal`
- `SE-1.turn_driver.driver_records`: `STSEC-1`
- `SE-1.turn_driver.pov_visibility`: `reported`
- Access route: `BEL-1.basis.access_records` includes `STSEC-1` and `DA-1`
- Response CHC: `CHC-1.grounded_in.records` includes `STSEC-1`

Expected mutation failures:

- direct perception of hidden STSEC -> `turn_driver_hidden_state_leak`
- missing access-route BEL -> `turn_driver_missing_access_route`
- response CHC grounded away from STSEC -> `chc_response_topical_grounding_missing`
