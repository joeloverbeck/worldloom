# Persisted-Packet Recovery - Shared Discipline

This shared discipline applies to every story-pipeline skill whose Pre-flight
invokes `mcp__worldloom__get_context_packet`,
`mcp__worldloom__get_records`, or
`mcp__worldloom__describe_envelope_schema`. The contracts at
`docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery and
`docs/MACHINE-FACING-LAYER.md` §Retrieval Tool Scope are authoritative; this
file is the skill-facing discipline that operationalizes them.

## When Recovery Fires

If `get_context_packet`, `get_records`, or `describe_envelope_schema` returns
`task_header.delivery_status: persisted_with_summary` (or the equivalent
envelope field on `get_records` / `describe_envelope_schema`), the inline
response is a recovery summary, not the full payload. The full packet lives
at `task_header.persisted_output_path`. Validation rationales may cite only
retrieved records, fields, packet layers, slices, or validator results -
never summary metadata alone.

## Recovery Action

Retrieve every load-bearing omitted slice before continuing analysis:

- For oversized `get_context_packet`: call
  `mcp__worldloom__get_persisted_packet_slice(persisted_path=<persisted_output_path>,
  slice_path=<dot-path>)` for each required layer or node id (e.g.,
  `governing_world_context.nodes` for governing records, or
  `local_authority.nodes[id=<seed_id>]` for a specific seed).
- For oversized `get_records`: retrieve
  `records[<N>].record.record` (or equivalent slice path) for every required
  id.
- For oversized `describe_envelope_schema`: either re-invoke with the
  specific `op_kind` argument, or slice `op_schemas.<op_kind>` from the
  persisted file.

The inline `governing_summary` is an index, not a substitute. Use it to
identify which slices to retrieve, then retrieve.

## Abort Condition

If a required slice cannot be retrieved (e.g., the persisted file is
inaccessible or the slice path is malformed), abort the workflow and surface
the persisted path to the user for post-session analysis. Do not validate
from summary-only context.

## When Required Classes Cannot Fit

`get_context_packet` may also return a hard error of the form
`packet_incomplete_required_classes` when the packet's required full bodies
exceed the configured ceilings — distinct from the soft-degradation
`persisted_with_summary` mode above. The error body reports two independent
constraint axes: `minimum_required_budget` (the token budget needed) and
`minimum_required_harness_ceiling_chars` (the character ceiling needed).
When `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars`,
the harness ceiling is fixed by the operator's environment, NOT by the
caller's `token_budget` argument — no `token_budget` retry can succeed even
though `minimum_required_budget` is reported for diagnosis. Inspect whether
the error details include `retry_with` before retrying; only retry with
`retry_with.token_budget` when that field is present, which means the token
budget is the binding constraint under the current harness ceiling.

When the harness ceiling is binding (or when any retry is impractical), the
documented operator-recovery path is the top-level `fallback_advice` plus
direct per-class retrieval of the missing records:

- For named seed records (Mystery Reserve entries, Invariants, governing
  CF / SEC / ENT records the packet would have delivered as full bodies):
  call `mcp__worldloom__get_records(record_ids=[<ids>], world_slug=<slug>)`
  with the record-ids of every required seed. The error body's
  `missing_classes` field names which packet layers failed to fit; the
  caller's own seed list (typically the `seed_nodes` argument originally
  passed to `get_context_packet`) is the authority for which records to
  retrieve directly.
- For whole-class loads (every Mystery Reserve entry, every Invariant by
  category, every entity-registry entry), call
  `mcp__worldloom__list_records(record_type=<type>, world_slug=<slug>,
  include_full_body=true)` per class. This bypasses the per-packet ceiling
  by retrieving each class independently under the per-call harness ceiling.

Record the recovery path taken in the consuming skill's working memory so
the page-plan / audit-report / proposal rationale can cite the retrieved
records by id rather than by "context packet". Do not validate from the
incomplete-packet error response alone — retrieve the missing records and
continue with full content.
