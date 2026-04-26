# Retrieval Tool Decision Tree

Per-phase map of which MCP retrieval tool to invoke during `canon-addition`. The skill flow names the tools at key points; this reference records why each call belongs in that phase so the operator does not need to inspect TypeScript source mid-run.

## Pre-flight

- `mcp__worldloom__allocate_next_id(world_slug, id_class)` for each needed id class. Allocate `PA` for every run, `CF` / `CH` for accept branches, and `M` / `OQ` only when repair work manufactures bounded unknowns or open questions.
- `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_status`, and `mystery_resolution_safety`. This catches enum drift before patch-plan validation.
- `mcp__worldloom__get_context_packet(task_type='canon_addition', seed_nodes=[<proposal_seed_nodes>], token_budget>=15000)` to gather Kernel, Invariants, relevant CF / CH / M / OQ records, named-entity neighbors, and section context. Treat packet `body_preview` fields as an index; follow up with `get_record` for full content before citing a record.

## Phase 0-2: Normalize, Scope, Invariants

- `mcp__worldloom__get_record(record_id)` for every CF / M / OQ / SEC id the proposal cites directly or indirectly. Do not reason from context-packet previews alone when validating a proposal's claim about existing canon.
- `mcp__worldloom__find_named_entities(names)` for pre-figuring scans of named entities the proposal commits, filtered to `node_type` values relevant to character or diegetic-artifact records. This searches canonical entity names, entity aliases, scoped-reference display names, and scoped-reference aliases; it does not scan prose bodies.
- Pair `find_named_entities` with `mcp__worldloom__search_nodes(query)` when the target string may appear only inside section, diegetic-artifact, character, or adjudication prose. `search_nodes` exercises the lexical layer.

## Phase 3-6: Capability, Prerequisites, Diffusion, Consequence Propagation

- `mcp__worldloom__get_neighbors(node_id, edge_types, depth)` for one-hop ontology neighbors when scope detection is unclear or when candidate CFs need disambiguation.
- `mcp__worldloom__get_record(record_id)` for any SEC record listed in `likely_required_downstream_updates`, because Phase 13a needs the current `touched_by_cf[]` and `extensions[]` state before assembling a patch plan.
- For records too large to fit comfortably in the main context, dispatch a read-only subagent with explicit field-extraction instructions over the raw record fields. The subagent does not write files.

## Escalation Gate / Phase 6b

- `mcp__worldloom__get_context_packet(...)` may be invoked per critic role with role-scoped seed nodes and a smaller token budget. Do not pass the full pre-flight packet to every critic by default.

## Phase 12a: Modification-History Axis-C Judgment

- `mcp__worldloom__find_sections_touched_by(cf_id)` for each candidate parent CF from axis (a) `derived_from_cfs`. Use the returned SEC set to decide whether the new CF extends the candidate's substantive footprint or is only an orthogonal cross-reference.
- `mcp__worldloom__find_impacted_fragments(node_ids)` for candidate accepted CFs, parent CFs, and named seed nodes when the proposal's downstream-update list may be incomplete. Use it to identify additional CFs, SECs, and hybrid artifacts that may need review before Phase 13a.

## Phase 13a: Patch-Plan Assembly

- No new retrieval call is required by default. Assemble `PatchOperation[]` from the phase evidence above, including the bidirectional `required_world_updates` / `append_touched_by_cf` pair for every affected SEC.

## Phase 14a: Validation

- `mcp__worldloom__validate_patch_plan(plan)` runs the validator stack against the assembled envelope. Treat any failure as a loop-back to the phase that produced the bad field or missing update.

## Phase 15a: Submit After HARD-GATE

- Persist the final envelope to `/tmp/<plan-id>.json`.
- Issue the approval token with `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>`.
- Call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and token after explicit user approval.
