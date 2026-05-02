# Retrieval Tool Decision Tree

Per-phase map of which MCP retrieval tool to invoke during `canon-addition`. The skill flow names the tools at key points; this reference records why each call belongs in that phase so the operator does not need to inspect TypeScript source mid-run.

## Pre-flight

- `mcp__worldloom__allocate_next_id(world_slug, id_class)` for each needed id class. Allocate `PA` for every run, `CF` / `CH` for accept branches, and `M` / `OQ` only when repair work manufactures bounded unknowns or open questions.
- `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty`, and `cf_type`. This catches enum drift before patch-plan validation and exposes CF-type conditional-block coupling before record assembly.
- `mcp__worldloom__get_context_packet(task_type='canon_addition', seed_nodes=[<proposal_seed_nodes>])` to gather Kernel, Invariants, relevant CF / CH / M / OQ records, named-entity neighbors, and section context. The canon-addition default budget is 16000; if the packet is incomplete, retry once with `retry_with.token_budget`. Treat packet `body_preview` fields as an index; follow up with `get_record` for one id, `get_records` for a known id set, or `get_records_field` when the known id set only needs one shared field before citing records.
- **Retrieval freshness audit**: retrieval tools auto-sync and retry once when they detect a stale explicit world index. When that recovery happens, successful responses include `freshness_audit.pre_call_index_was_stale: true` plus the synced drifted paths. Persistent retrieval staleness still surfaces `stale_index` for diagnosis. Submit-time `index_stale` handling remains under §Phase 15a.

## Phase 0-2: Normalize, Scope, Invariants

- `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)` for known sets of CF / M / OQ / SEC ids the proposal cites directly or indirectly. Use singular `mcp__worldloom__get_record(record_id)` when exactly one record is needed or the next id depends on reading the prior result. Do not reason from context-packet previews alone when validating a proposal's claim about existing canon.
- `mcp__worldloom__get_record_schema(node_type)` before drafting or repairing structured records whose constraints are easy to misremember, such as `pre_figured_by`'s `CF-NNNN` pattern or CF taxonomy rules that require `epistemic_profile` / `exception_governance` blocks.
- `mcp__worldloom__find_named_entities(names, node_type_filter=['character_record', 'diegetic_artifact_record'])` for pre-figuring scans of named entities the proposal commits. Server-side filtering returns only canonical matches with mentions in character or diegetic-artifact records. This searches canonical entity names, entity aliases, scoped-reference display names, and scoped-reference aliases; it does not scan prose bodies.
- Pair `find_named_entities` with `mcp__worldloom__search_nodes(query, exhaustive: true)` when the target string may appear only inside section, diegetic-artifact, character, or adjudication prose. Exhaustive `search_nodes` exercises the lexical layer as an audit scan rather than a best-N relevance search.

## Phase 3-6: Capability, Prerequisites, Diffusion, Consequence Propagation

- `mcp__worldloom__get_neighbors(node_id, edge_types, depth)` for one-hop ontology neighbors when scope detection is unclear or when candidate CFs need disambiguation.
- `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)` for SEC records listed in `likely_required_downstream_updates`, because Phase 13a needs the current `touched_by_cf[]` and `extensions[]` state before assembling a patch plan.
- `mcp__worldloom__get_records_field(record_ids=[...], field_path=[...], world_slug=<slug>)` for narrow batch inspection of parsed atomic records when the same field is needed across a known id set, such as capability CF `distribution` blocks.
- `mcp__worldloom__get_record_field(record_id, field_path)` for narrow inspection of one large atomic record when only one field is needed.

## Escalation Gate / Phase 6b

- `mcp__worldloom__get_context_packet(...)` may be invoked per critic role with role-scoped seed nodes and a smaller token budget. Do not pass the full pre-flight packet to every critic by default.
- `mcp__worldloom__search_nodes(query, exhaustive: true)` for Rule 6 audit-trail scans that must confirm a string's presence or absence in prose bodies. Use this before relying on a proposal's self-claim about whether a name or phrase is prefigured.

## Phase 12a: Modification-History Axis-C Judgment

- `mcp__worldloom__find_sections_touched_by(cf_id)` for each candidate parent CF from axis (a) `derived_from_cfs`. Use the returned SEC set to decide whether the new CF extends the candidate's substantive footprint or is only an orthogonal cross-reference.
- `mcp__worldloom__get_record_field(SEC-id, ["touched_by_cf"])` when the only needed fact from a large SEC record is its current CF list.
- `mcp__worldloom__get_records_field(record_ids=[...SEC-ids...], field_path=["touched_by_cf"], world_slug=<slug>)` when axis-(c) judgment needs the current CF lists across several known SEC records.
- `mcp__worldloom__find_impacted_fragments(node_ids)` for candidate accepted CFs, parent CFs, and named seed nodes when the proposal's downstream-update list may be incomplete. Use it to identify additional CFs, SECs, and hybrid artifacts that may need review before Phase 13a.

## Phase 13a: Patch-Plan Assembly

- No new retrieval call is required by default. Assemble `PatchOperation[]` from the phase evidence above, including the bidirectional `required_world_updates` / `append_touched_by_cf` pair for every affected SEC.

## Phase 14a: Validation

- `mcp__worldloom__validate_patch_plan(plan)` runs the validator stack against the assembled envelope. For envelopes >50KB, use the equivalent CLI path instead: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>`. Treat any `fail` as a loop-back to the phase that produced the bad field or missing update; treat `skipped` as envelope-shape repair before signing or submit.

## Phase 15a: Submit After HARD-GATE

- Persist the final envelope to `/tmp/<plan-id>.json`.
- Issue the approval token with `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>`.
- Call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and token after explicit user approval. For envelopes >50KB, use the equivalent CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>`.
- On `approval_expired`, re-sign and resubmit. On `approval_replayed`, do not resubmit. On `index_stale`, run `node tools/world-index/dist/src/cli.js sync <world-slug>` and resubmit the unchanged patch plan with the same approval token if it has not expired. On `validator_failed`, inspect `detail.verdicts[].location.file`: fix and resubmit only when the cited file is one of the records or hybrid PA/adjudication targets this patch plan creates or extends; if it names unrelated existing world state, pause and escalate instead of editing another canon-adjacent file.
