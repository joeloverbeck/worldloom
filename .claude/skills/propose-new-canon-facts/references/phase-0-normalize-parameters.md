# Phase 0: Normalize Generation Parameters

Parse `parameters_path` if provided; otherwise interview the user. Extract:

- `batch_size` (default 7)
- `novelty_range` (default `moderate`; valid: `conservative` / `moderate` / `bold`)
- `enrichment_types` (default: all 10 from the taxonomy; filter if user-specified)
- `taboo_areas` (default: empty; free-form list of topics to exclude)
- `upstream_audit_path` (optional)

If `upstream_audit_path` is provided, load it into working context for Phase 1.

**Rule**: Parameters define the *search space*, not the *content*. A `parameters_path` that attempts to dictate specific canon facts is rejected — those are proposals, not parameters, and belong in `canon-addition`'s `proposal_path`.

**FOUNDATIONS cross-ref**: Tooling Recommendation (parameters-to-world-state binding happens here — every generated seed in later phases must trace back to loaded state, not to a dictated fact).
