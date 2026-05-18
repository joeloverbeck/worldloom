# SPEC-43 Mid-Story Introduction Fixtures

These fixtures are clustered YAML manifests for downstream validator tickets. They are intentionally not full copied story bundles yet; tickets `SPEC43PRECAUSTO-003` through `SPEC43PRECAUSTO-012` can import the clusters they need and adapt them into `IndexedRecord` objects or temporary bundle trees.

Records that are intentionally invalid for a future validator include `expected_verdict` metadata. Records that prefigure SPEC-43 schema widening, such as `SE.state_delta.create[]` entries for `CLK`, `STSEC`, and `STQ`, are YAML-parseable but are not claimed to pass the current schema until the downstream schema or validator ticket owns that behavior.

## Clusters

- `creation-pass/all-classes.yaml` exercises lawful introduction of `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, and `SREL`.
- `creation-fail/failure-cases.yaml` enumerates one expected validator verdict per malformed introduction case.
- `lifecycle-still-valid/lifecycle-cases.yaml` preserves non-introduction paths: existing clock tick and existing entity status update.
- `narrative-shape-fail/prohibited-fields.yaml` gives one prohibited future-shape field per protected record class.
- `compatibility/legacy-snapshot.yaml` captures old-style PG snapshots with absent optional keys and a current-contract child snapshot with full keys.
