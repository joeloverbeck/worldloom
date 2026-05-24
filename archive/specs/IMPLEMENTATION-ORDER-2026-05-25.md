# Implementation Order Row Archive - 2026-05-25

Completed row removed from `specs/IMPLEMENTATION-ORDER.md` when SPEC-80 shipped.

| Order | Spec | Change shape | Depends on | Notes / gating risk |
|---|---|---|---|---|
| 1 | [`SPEC-80`](SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md) | Authoring-time driver-kind x pressure-source-class coverage diagnostic in bootstrap Phase 6 + commitment-block-authoring Phase 1 + optional health-audit Phase 2o | archived SPEC-81 (soft) | Closes the iteration-1 reactivity loop at the pool-coverage layer (the upstream cause that SPEC-76's active-pressure handling discipline could only mitigate downstream). Prefer SPEC-81 projection API; fallback to `list_records(include_full_body=true)` only if projection access is unavailable. |
