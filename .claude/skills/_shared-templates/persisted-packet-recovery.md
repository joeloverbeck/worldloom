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
