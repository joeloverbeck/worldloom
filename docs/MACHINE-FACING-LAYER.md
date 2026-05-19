# Machine-Facing Layer

Worldloom's human-facing contract lives in markdown and YAML under `worlds/<slug>/`. The machine-facing layer is the retrieval, mutation, validation, and enforcement stack that lets skills operate on that world state structurally instead of by loading or editing prose directly.

This doc is the operational overview. The design details still live in the numbered specs and the tool package READMEs.

## Layers

1. **World index (`tools/world-index/`, SPEC-01)**  
   Builds `worlds/<slug>/_index/world.db`, a deterministic SQLite artifact containing parsed nodes, typed edges, anchor checksums, and search surfaces.
2. **Retrieval MCP (`tools/world-mcp/`, SPEC-02)**  
   Exposes the index as `mcp__worldloom__*` tools such as `search_nodes`, `get_node`, `get_neighbors`, and `get_context_packet`.
3. **Patch engine (`tools/patch-engine/`, SPEC-03)**  
   Applies typed patch plans with anchor-based targeting, append-only vocabulary, two-phase commit, and engine-controlled write ordering.
4. **Validators (`tools/validators/`, SPEC-04)**  
   Turn the mechanized FOUNDATIONS Validation Rules (1-7, 11, and 12) and structural invariants into executable checks, exposed through `world-validate` and the engine pre-apply gate. Rules 8, 9, 10, and 13 are not validator selectors; the numbering gap is documented in `docs/FOUNDATIONS.md` §Validation Rules. On the validation path, `validate_patch_plan` reports validator-run telemetry via `validators_run[]`; on the patch-engine submission path, the same shape is reported via `PatchReceipt.validators_run[]` (success) or `EngineError.validators_run[]` (failure). Each entry carries `validator_name`, `status` (`pass` / `fail` / `skipped`), `duration_ms`, and an optional `detail` populated when status is not `pass`. Consumers that don't read `validators_run` are unaffected by its presence.
5. **Hooks (`tools/hooks/`, SPEC-05)**  
   Make retrieval and mutation discipline structural in Claude Code by blocking oversized reads, blocking direct writes to engine-only surfaces, bootstrapping subagents, and auto-running validation.

## How The Layers Compose

```text
world markdown/YAML
  -> world-index init/build/sync
  -> _index/world.db
  -> world-mcp retrieval tools
  -> context packet or localized node reads
  -> skill analysis
  -> patch plan
  -> validators + patch engine
  -> working tree writes
  -> index refresh / follow-up validation
```

Read-side work can stop after the retrieval layer. Write-side work adds validators, approval-token discipline, and patch-engine submission.

## Phase Boundaries

- **Phase 1 live surface**: `world-index` is implemented; the docs now reserve the retrieval and hook contract that SPEC-02, SPEC-05 Part A, and SPEC-06 Part A target.
- **Phase 1.5 canonical storage layer**: on machine-layer-enabled worlds, `_source/` atomic YAML is the sole source-of-truth for atomized CF / CH / INV / M / OQ / ENT / SEC records. The retired root-level files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, and `PEOPLES_AND_SPECIES.md`) do not exist on those worlds. Merged markdown views are human-facing, read-only, and not persisted; story-bundle records can be rendered with `world-index render <world-slug> --story <story-slug>`, while world-canon `--file <class>` rendering remains a future human-UX surface. LLM agents consume atomic world records via `mcp__worldloom__get_record` / `get_context_packet` instead. See SPEC-13 and `docs/FOUNDATIONS.md` §Canonical Storage Layer for the full contract.
- **Phase 2 live surface**: patch-engine writes, validator gating, and engine-only mutation guards become active.

The docs describe the intended steady-state contract, but any workflow should still be read against the phase it is actually running in.

## Which Layer To Reach For

| Need | Reach for |
|---|---|
| Bootstrap, rebuild, or refresh machine-readable world state | `world-index init <world>`, `world-index build <world>`, or `world-index sync <world>`; inspect `_index/world.db.skipped_records.log` when sync reports schema-failed skipped records |
| Render indexed story-bundle records for human inspection | `world-index render <world> --story <story-slug>` |
| Inspect indexed structure or diagnose retrieval misses | `world-index stats`, `world-index inspect`, or retrieval MCP tools |
| Gather a skill-sized input bundle | `mcp__worldloom__get_context_packet` |
| Localize specific nodes, records, persisted-packet slices, record fields, story-state provenance, entities, or neighborhoods | `search_nodes`, `get_node`, `get_record`, `get_records`, `get_records_field`, `get_story_state_provenance`, `get_persisted_packet_slice`, `list_records`, `get_record_field`, `get_neighbors`, `find_named_entities` |
| Localize source-local names that are not world-level canonical entities | `find_named_entities.scoped_matches`, `get_node.scoped_references`, and `search_nodes` with `reference_name` or `include_scoped_references` |
| Estimate downstream impact before a write | `find_impacted_fragments`, then validators |
| Validate a patch plan envelope without mutating world content | `validate_patch_plan`, which returns `status: "pass"`, `status: "fail"` with validator verdicts, or `status: "skipped"` with a reason when the envelope cannot be validated. `pass` and `fail` responses include `validators_run[]`; `skipped` responses include `validators_run: []`. Envelope-shape validation also checks the canonical record-id field for world-canon `create_*_record` payloads, so `create_ch_record` requires `payload.ch_record.change_id` while the other world-canon create ops require `id`; misshapen create payloads skip before validator delegation with an `invalid_input` field path such as `patch_plan.patches[N].payload.ch_record.change_id`. For envelopes too large for MCP transport, or for a temporary stale-validator-bundle workaround when restart is not immediately available, use the equivalent CLI path from the project root or active git worktree root: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>`. The CLI/engine path resolves world state from `process.cwd()`, so an invocation from another cwd can report `Index missing for world '<slug>'`. |
| Apply world-level changes on machine-layer-enabled worlds | `submit_patch_plan` via the patch engine |
| Inspect the patch-plan envelope and per-op payload contract before assembly | `describe_envelope_schema`, optionally filtered by `op_kind` |
| Prove structural integrity | `world-validate <world> --structural` |

## Story-Bundle Edge Types

`world-index` emits 65 story-bundle edge types. The original story-edge surface covers world bindings, page provenance, thread links, branch/page links, and SPEC-45 event provenance:

- `world_entity_binding` — `STENT.world_ent_id` to a world-canon entity id.
- `story_fact_derived_from` — `SF.derived_from_cf` to the originating CF.
- `created_at_page` — story records with `created_at_page` / `provenance.created_at_page` to the creating `PG`.
- `state_delta_create`, `state_delta_supersede`, `state_delta_close` — `SE.state_delta.create[]` / `SE.state_delta.supersede[]` / `SE.state_delta.close[]` to affected story records.
- `creation_evidence` — `SE.record_introductions[]` evidence links from the introduced record to its evidence records.
- `event_state_relation_target` — `SE.state_relations[].target_record` to the related story record.
- `event_alias_binding` — each structured record id value in `SE.commitment.alias_bindings`.
- `event_introduces_record` — `SE.record_introductions[].record_id` from the event to the introduced record.
- `parent_page`, `leaf_page` — `PG` / `CHC` / `BR` page-tree links.
- `page_active_record` — each record id listed in `PG.state_snapshot.active_records.<class>[]`.
- `page_visible_affordance_record` — each record id named by `PG.state_snapshot.visible_affordances[].grounded_in[]`.
- `page_emitted_choice` — each `CHC` id named by `PG.emitted_choices[]`.
- `dependent_fact` — `OBL.dependent_facts[]` to fact records.
- `thread_obligation` — `THR.obligations[]` to obligation records.

SPEC-46 extends that graph surface with 22 additional edge types for existing story-bundle record classes:

| Source | Edge type | Target | Meaning |
|---|---|---|---|
| `BEL` | `belief_holder` | `STENT` | The actor or entity that holds the belief. |
| `BEL` | `belief_basis_event` | `SE` | The event named by `basis.source_event`. |
| `BEL` | `belief_access_record` | record | Records named by `basis.access_records[]`. |
| `BEL` | `belief_opens` | record | Records opened by `consequences.opens[]`. |
| `SREL` | `relationship_participant` | `STENT` | Each participant in the relationship. |
| `SREL` | `relationship_derived_from` | record | Records named by `derived_from[]`. |
| `STINT` | `intention_holder` | `STENT` | The actor or entity that owns the intention. |
| `STINT` | `intention_supersedes` | `STINT` | The prior intention superseded by the current record. |
| `STSTAT` | `status_entity` | `STENT` | The entity whose status is being recorded. |
| `CLK` | `clock_linked_record` | record | Records named by `linked_records[]`. |
| `CLK` | `clock_driver` | `STENT` | The record-id driver for the pressure clock. |
| `CLK` | `clock_tick_event` | `SE` | The event named by each `tick_history[].event`. |
| `STSEC` | `secret_truth_anchor` | `SF` / `BEL` / `DA` | The record named by `truth_anchor` when present. |
| `STSEC` | `secret_holder` | `STENT` | Record-id holders named by `holders[]`. |
| `STSEC` | `secret_clue_carrier` | record | The record named by each `clue_carriers[].record`. |
| `STSEC` | `secret_reveal_record` | `BEL` / `SF` / `DA` / `STQ` | Records named by `reveal_records[]`. |
| `STQ` | `story_question_source` | record | Records named by `source_records[]`. |
| `STQ` | `story_question_payoff_of` | `STQ` | The setup question named by scalar `payoff_of`. |
| `STQ` | `story_question_answer_record` | record | Records named by `answer_records[]`. |
| `SE` | `event_actor` | `STENT` | The structured-id actor for the event. |
| `SE` | `event_target` | record | Each record named by `targets[]`. |
| `SE` | `event_selected_storylet` | `SLT` | The selected storylet named by `commitment.selected_slt_id`. |

SPEC-47 and SPEC-49 extend that graph surface with 20 additional edge types for STPLAN and STEMO records:

| Source | Edge type | Target | Meaning |
|---|---|---|---|
| `STPLAN` | `plan_holder` | `STENT` | The actor or entity that owns the plan. |
| `STPLAN` | `plan_root_intention` | `STINT` | The intention the plan pursues. |
| `STPLAN` | `plan_belief_basis` | `BEL` | Each belief named by `belief_basis[]`. |
| `STPLAN` | `plan_resource_basis` | `SF` / `STOBJ` / `STLOC` / `DA` / `SREL` / `OBL` | Each resource named across `resource_basis.facts[]`, `objects[]`, `locations[]`, `artifacts[]`, `relationships[]`, and `obligations[]`. |
| `STPLAN` | `plan_blocker` | record | Each record named by `blockers[]`. |
| `STPLAN` | `plan_current_step_target` | record | Each record named by `current_step.target_records[]`. |
| `STPLAN` | `plan_fallback_step_target` | record | Each record named by `fallback_steps[].target_records[]`. |
| `STPLAN` | `plan_success_predicate_ref` | record | Record ids parsed from `current_step.success_condition.predicates[].pred`. |
| `STPLAN` | `plan_fallback_predicate_ref` | record | Record ids parsed from `fallback_steps[].trigger_predicates[].pred`. |
| `STPLAN` | `plan_derived_from` | record | Each record named by `derived_from[]`. |
| `STPLAN` | `plan_expires_when_ref` | record | Record ids parsed from scalar `expires_when`. |
| `STPLAN` | `plan_created_by_event` | `SE` | The event named by `created_by_event`. |
| `STPLAN` | `plan_supersedes` | `STPLAN` | The prior plan named by scalar `supersedes`, when present. |
| `STEMO` | `emotion_holder` | `STENT` | The actor or entity whose affective state is recorded. |
| `STEMO` | `emotion_trigger_event` | `SE` | The event named by `trigger_event`. |
| `STEMO` | `emotion_appraisal_basis` | `BEL` | Each belief named by `appraisal_basis[]`. |
| `STEMO` | `emotion_oriented_toward` | record | Each record named by `orientation.toward_records[]`. |
| `STEMO` | `emotion_supersedes` | `STEMO` | The prior emotion record named by scalar `supersedes`, when present. |
| `STEMO` | `emotion_derived_from` | record | Each record named by `derived_from[]`. |
| `STEMO` | `emotion_expires_when_ref` | record | Record ids parsed from scalar `expires_when`. |

SPEC-50 removes the legacy `SLT` obligation-field edges (`opens_obligation`, `pays_off_obligation`, `complicates_obligation`, `transfers_obligation`) because the current `SLT` schema uses `effects` and `exit_options` instead of those fields. It adds six CHC/SLT exploitation edges, plus the page and event-completion edges listed above:

| Source | Edge type | Target | Meaning |
|---|---|---|---|
| `CHC` | `choice_grounded_in` | record | Each record named by `grounded_in.records[]`. |
| `CHC` | `choice_associated_storylet` | `SLT` | The source commitment block named by `associated_commitment_block`. |
| `CHC` | `choice_affordance_ordinal` | page affordance attribute | Each ordinal named by `grounded_in.affordance_ordinals[]`, encoded as `story:PG#affordance:<ordinal>` when the parent page is known. |
| `SLT` | `storylet_predicate_ref` | record | Record ids parsed from hard and soft precondition predicate strings. |
| `SLT` | `storylet_effect_ref` | record | Concrete record ids named by `effects.create[]`, `effects.supersede[]`, and `effects.close[]`; `bound:<alias>` placeholders are skipped. |
| `SLT` | `storylet_exit_likely_effect_ref` | record | Concrete record ids named by `exit_options[].likely_effects[]`; `bound:<alias>` placeholders are skipped. |

### Placeholder Skip Convention

Story-bundle edges represent record-to-record graph links. When a source field permits placeholders, `world-index` emits an edge only when the value resolves to a structured record id. Placeholder values such as `group:<name>`, `system`, `unknown`, and `narrator` are silently skipped for edge emission. This applies to `CLK.driver`, `STSEC.holders[]`, `SE.actor`, and any STPLAN/STEMO reference-bearing field that can carry placeholder prose rather than a structured record id. The skipped value remains on the source record and is retrievable with `get_record`.

### Tick-History Granularity

`clock_tick_event` emits one edge per `CLK.tick_history[].event`. The `delta` and `cause` payload fields are not encoded as edge properties; they stay on the source `CLK` record and should be read with `get_record` when the payload matters. This mirrors `creation_evidence`: edges carry traversal data, while entry-level payload stays on the record body.

### Future Consumers

The SPEC-46 edge expansion is foundation work for deferred render and audit packets such as dramatic-irony, social-pressure, reader-expectation, and branch-possibility-space. Those packets are not introduced by the edge enumeration itself.

`world-index` schema migrations are also responsible for parser-vocabulary staleness. When a schema-version bump changes the `node_type` emitted for unchanged source content, the migration file must delete the rows that would be reclassified, delete dependent rows, and clear the affected `file_versions` entries so the next `world-index sync` re-parses those files. Comment-only migrations are valid only when no existing rows would be reclassified; `world-index verify` can flag drift but does not auto-correct this class of stale indexed vocabulary.

## Retrieval Tool Scope

| Tool | Reads |
|---|---|
| `search_nodes` | FTS5 lexical node content plus structured filters such as node type, file path, canonical entity name, scoped-reference name, and `story_slug`. Default mode is capped and ranked. Use `exhaustive: true` for Rule 6 audit scans that need presence/absence confirmation across prose bodies; exhaustive results are sorted by `node_id` and include `match_locations[]`. When `story_slug` is omitted, search stays in the world-canon / hybrid retrieval scope; supplying `story_slug` limits results to one indexed story bundle. |
| `get_node` | One indexed node plus its structured links, mentions, scoped references, and file metadata. |
| `get_record` | The full parsed record for a structured id such as CF / CH / M / OQ / SEC / PA / DA / CHAR. World-level DA records are hybrid markdown records and do not require `story_slug`; story-local `DA-<integer>` records are story-bundle records and require `story_slug`. Other story-bundle ids such as PG / SE / BEL / SF / OBL / CNSQ / THR / SREL / STINT / STENT / STSTAT / STLOC / STOBJ / BR / CHC / SLT / SLB / SAU / SP / RSP require `story_slug` because authored story ids are unique only within `(world_slug, story_slug)`. `ARC_TRACE` is not a valid record class. Use this after context-packet previews before citing record content. Optional `section_path` projects parsed atomic/story records by dotted path, such as `effect_evidence` or `semantic_critic_verdict.status`; for hybrid PA / world-level DA / CHAR records it can project `frontmatter`, `body`, `frontmatter.<key>`, or `body.<section>`. If an unprojected hybrid response would exceed the effective inline ceiling, the bounded response is `delivery_status: "oversize_with_projection_suggestions"` with `persisted_output_path`, `total_chars`, `response_cap_chars`, and `suggested_section_paths`; retry with one of the suggested `section_path` values for structured slice retrieval. When the suggestion list itself must be shortened to keep the recovery response under the cap, `suggested_section_paths_omitted_count` reports how many valid paths were omitted from the inline hint. |
| `get_records` | Multiple full parsed records by structured id in one ordered call. Optional `story_slug` scopes bundle-scoped story ids. Use when a packet, claim map, dossier trace, or audit step already has a known id set and would otherwise issue N independent `get_record` calls. Inline responses carry `delivery_status: "inline"` and preserve request order. If the ordered batch would exceed the effective inline ceiling, the tool persists the full inline-shaped JSON and returns `delivery_status: "persisted_with_summary"` with `persisted_output_path`, per-record summary metadata, and slice hints such as `records[0].record.record`. |
| `get_records_field` | One field from multiple parsed atomic or story-bundle records in one ordered call. Optional `story_slug` scopes bundle-scoped story ids. Use when a packet, claim map, dossier trace, or audit step already has a known id set but only one small field is needed across all records. `field_path` uses the same `(string \| number)[]` segment contract as `get_record_field`; each response entry either carries `field_value` plus provenance or a per-id error without aborting the batch. |
| `get_story_state_provenance` | Story-event provenance for one story-bundle record. Requires `story_slug` for bundle-scoped ids and returns `{ record_id, record_class, creating_se_id, modifying_se_ids, evidence_records }` from indexed `state_delta_create`, `state_delta_supersede`, and `creation_evidence` edges. Use this instead of walking every `SE-*.yaml` file when a skill needs the SEs that authored or superseded a source record. |
| `get_persisted_packet_slice` | A structured slice from package-persisted JSON emitted by `get_context_packet`, `get_records`, or `describe_envelope_schema` when they return `delivery_status: 'persisted_with_summary'`. Dot paths address object fields, array indexes such as `records[0]`, and node id selection such as `local_authority.nodes[id=entity:donostia]`. |
| `list_records` | Indexed records for one supported atomic, hybrid, or story-bundle record type. Story-bundle record types require `story_slug` and include `story_entity_record`, `story_status_record`, `belief_record`, `story_fact_record`, `story_event_record`, `obligation_record`, `consequence_record`, `thread_record`, `relationship_record_story`, `intention_record`, `story_location_record`, `story_object_record`, `branch_record`, `page_record`, `choice_record`, `storylet_record`, `story_diegetic_artifact_record`, `audit_record_story`, `promotion_record`, `storylet_batch_manifest`, and `remediation_storylet_proposal_card`. `section_record` enumerates atomic SEC-*-NNN YAML records only; WORLD_KERNEL.md narrative H2 spans are indexed as narrative sections for search/context and are retrieved directly by `get_record(record_id="<world>:WORLD_KERNEL.md:<H2 text>:0")` when needed. Optional `filters` narrow rows before projection/full-body wrapping by parsed body field path. Filter values are scalars for exact match or arrays for any-of membership; dotted paths address nested fields, such as `{ move_family: ["investigation", "disclosure"], "scope.visibility": "global_author_pool", "exit_options.action_family": ["investigate", "communicate"] }`. Array-valued record fields match when any record value is present in the filter set. Atomic and story-bundle default/projection modes validate `fields` against top-level parsed-record keys from the filtered response rows; `record_id` is always included in projected records. Hybrid default/projection mode returns compact metadata (`record_id`, `record_kind`, `title`, `content_hash`, `file_path`) for `character_record`, `diegetic_artifact_record`, and `adjudication_record`; `fields` is validated against those response-shape top-level keys. Unknown `fields` entries return `invalid_input` with `details.unknown_projection_keys` and sorted `details.accepted_projection_keys` instead of being silently dropped. Empty atomic/story-bundle result sets return `accepted_projection_keys: []` plus a `details.note` because accepted keys cannot be derived from matched rows. Hybrid filters can address frontmatter fields directly or through `frontmatter.<key>`. `include_full_body: true` returns `{ record_id, content_hash, file_path, body }` per record and ignores `fields`; hybrid `body` is `{ record_kind, frontmatter, body_sections }`. Use full-body mode for deliberate whole-class sweeps such as every invariant, every Mystery Reserve firewall block, continuity-audit cross-check, or structured hybrid registry enumeration; for large storylet pools or other predictable hard-filter loads, apply `filters` before falling back to persisted-output recovery. |
| `get_record_field` | A single field of a parsed atomic or story-bundle record. Use when the field is small and the record body is large, such as `touched_by_cf` on a large SEC record. Reuses `get_record`'s record-resolution path. |
| `get_record_schema` | JSON Schema for a record node type plus transitively referenced schemas, required fields, and validator-sourced conditional block requirements, including story-bundle schemas such as `belief_record` and `story_status_record`. Use to discover field constraints, regex patterns, enum values, required/optional fields, and CF taxonomy rules such as when `epistemic_profile` or `exception_governance` is required before authoring a record draft. For `canon_fact_record`, the current CF `status` enum is `hard_canon`, `derived_canon`, `soft_canon`, and `contested_canon`; Mystery Reserve entries are separate `M-<integer>` records, not CF status values. |
| `describe_envelope_schema` | JSON Schema for the `validate_patch_plan` / `submit_patch_plan` envelope plus per-op payload wrappers. Use before assembling patch plans so required transport fields such as `approval_token`, `patches[].target_file`, `expected_id_allocations`, and typed payload keys are machine-readable instead of copied from prose. Pay special attention to the world-canon create-op ID asymmetry: `create_ch_record` uses `ch_record.change_id`; the other world-canon create ops use `id`. Pass `op_kind` for one operation when possible; unfiltered responses may return `delivery_status: "persisted_with_summary"` with `summary.available_op_kinds` and schema slice hints. For `create_slt_record`, `referenced_schemas` also includes `https://worldloom.local/schemas/predicate-dsl-grammar.schema.json`, the per-predicate argument grammar for `preconditions.hard[]` and `preconditions.soft[]`. |
| `get_neighbors` | Graph edges from the indexed node/record graph. Use for ontology and locality expansion. Story-bundle authored ids require `story_slug`. |
| `get_context_packet` | Ranked packet of Kernel, Invariants, relevant records, neighbors, section context, and story-bundle context for story-pipeline task types. `story_bootstrap`, `story_turn_cycle`, `commitment_block_authoring`, `branching_story_health_audit`, and `story_fact_promotion_to_canon` require `story_slug`. For `story_bootstrap`, the slug is the target bundle slug and `story_bundle_context` is `null` because the bundle does not yet exist; for the other story-pipeline task types, `story_bundle_context` is populated from indexed story-bundle records plus `STORY_KERNEL.md` frontmatter. World-canon task types return `story_bundle_context: null`. Story-pipeline `seed_nodes` are world-scope seeds; story-local records should be read via `story_slug` + `story_bundle_context` or targeted `get_records` / `list_records`, and misuse is surfaced through `task_header.warnings` (see `docs/CONTEXT-PACKET-CONTRACT.md` §Assembly Discipline). Body previews are generally truncated and full text requires `get_record`; selected task-critical classes in `local_authority`, `governing_world_context`, and `exact_record_links` may carry additive `full_body`, with delivered classes reported in `task_header.full_body_classes_delivered` and budget downgrades reported in `truncation_summary.full_body_downgrades`. `character_generation`, `diegetic_artifact_generation`, `story_bootstrap`, `story_turn_cycle`, `commitment_block_authoring`, `branching_story_health_audit`, and `story_fact_promotion_to_canon` reserve governing-context invariant and Mystery Reserve full bodies before opportunistic layers; `task_header.governing_full_body_priority` reports that policy, and insufficient budget/ceiling for those required governing bodies returns `packet_incomplete_required_classes` instead of silent downgrades. Task-specific governing nodes may also carry parsed `record` projections, such as `character_generation` invariant records and Mystery Reserve firewall fields. Omitted budgets use per-task defaults (`story_bootstrap`, `story_turn_cycle`, and `commitment_block_authoring` currently 18000; `canon_addition` currently 16000; `propose_new_canon_facts`, `propose_new_characters`, and `emergent_pressure_events` 15000; `propose_new_worlds_from_preferences`, `canon_facts_from_diegetic_artifacts`, and `branching_story_health_audit` 12000; `story_fact_promotion_to_canon` and remaining task types 8000). Incomplete-packet errors include `retry_with.token_budget` only when the token budget is the binding constraint; if the minimum required harness ceiling exceeds the effective harness ceiling, the error omits `retry_with` and uses top-level `fallback_advice` to point callers to targeted `get_record` / `get_records` / `get_record_field` recovery. Successful packets expose `task_header.delivery_status`, `task_header.harness_ceiling_chars` (default 60000; server override `WORLDLOOM_MCP_HARNESS_CEILING_CHARS`), `task_header.envelope_overhead_reserve_chars` (default 4000), and `task_header.estimator_version`; inline packet bodies are kept under `harness_ceiling_chars - envelope_overhead_reserve_chars`, and when the fully assembled packet would exceed that effective ceiling, `delivery_status: 'persisted_with_summary'` returns `governing_summary` inline plus `task_header.persisted_output_path` for structured slice recovery. Optional `delivery_mode: 'full' \| 'summary_only'` (default `'full'`) selects per-node payload shape — `summary_only` replaces every node's `body_preview` with a ≤100-char `summary` for "what's relevant" index passes while preserving eligible `full_body` delivery (see `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery, §Task-Aware Full-Body Delivery, and §Delivery Modes). |
| `find_impacted_fragments` | Records and fragments likely affected by proposed changes to named nodes or CFs. Use before write assembly to catch incomplete downstream-update lists. Story-bundle authored ids require `story_slug`. |
| `find_sections_touched_by` | SEC records whose `touched_by_cf[]` currently cites a candidate CF. Use for modification-history axis-(c) judgments. |
| `find_named_entities` | Canonical entity names, entity aliases, scoped-reference display names, and scoped-reference aliases. This is exact-match resolution, not full-text search. Optional `story_slug` adds `story_local_matches[]` from indexed story-bundle records alongside world-canon matches. Optional `node_type_filter` restricts canonical matches to entities with mention groups in the requested node types. Region descriptors (`drylands`, `canal-heartland`) and era descriptors (`Charter-Era`, `Incident Wave`) that appear only as parts of compound tokens may return empty with `hints[]`; each hint carries `matching_record_ids[]` with up to 10 source record ids for direct `get_record` retrieval. Use `search_nodes(query=...)` when `record_count` exceeds the capped id list or the hint has no usable ids. Pair with `search_nodes(exhaustive: true)` for lexical-only Rule 6 evidence. |
| `get_canonical_vocabulary` | Canonical enum values for skill reasoning before patch-plan submission. Current classes are `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, and `cf_type`. `mystery_reserve_effect` is sourced from the change-log-entry schema. The `cf_type` response includes conditional-block coupling metadata for `epistemic_profile` and `exception_governance`. |
| `describe_capabilities` | Read-only server introspection. Returns server-start build metadata plus registered tool names and enum-valued input contracts, so skills can compare their assumed `task_type`, `id_class`, or `record_type` values against the deployed MCP server instead of only against source. |

`record_type` and `node_type` are related but not interchangeable vocabulary layers. `list_records.record_type` is the operator-facing retrieval vocabulary. `get_record_schema.node_type` exposes only current validator-backed schema files, including `belief_record` for BEL story records and `story_status_record` for STSTAT story records.

**Recommended composition**: packet first (locality survey via `get_context_packet`), then `get_record` / `get_records` / `get_record_field` / `get_records_field` for full bodies or field projections of load-bearing nodes the packet cites unless a task-specific governing node already carries the required parsed `record` projection. Use `get_persisted_packet_slice` when `get_context_packet`, `get_records`, or `describe_envelope_schema` returns `delivery_status: "persisted_with_summary"`; use `get_records` when the needed ids are already known as a set and full records are needed, and `get_records_field` when the same known set only needs one field. See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern.

**Persisted tool results**: `get_context_packet` overflow, unprojected hybrid `get_record` overflow, oversized `get_records`, and oversized `describe_envelope_schema` use the same package-owned results directory. Set `WORLDLOOM_MCP_TOOL_RESULTS_DIR` to override it; otherwise the default is `/tmp/worldloom-mcp-tool-results/`. These persisted JSON files are recovery artifacts for the current local agent session, not canon or durable project outputs.

### Build-info fields

`describe_capabilities` returns a `build_info` object alongside the tool list.
Each field exposes a different currency surface:

- `git_commit_hash` — the git commit the server source was built from.
  `unknown` when the build environment lacks git context.
- `build_timestamp` — ISO-8601 timestamp of server-start build-info capture.
  Useful for "when was this server instance made" inspection; not a fingerprint.
- `source_schema_hash` — SHA-256 over normalized tool capabilities (sorted
  `{name, description, input_schema_enums}` per tool). Changes when the tool
  surface itself changes (new tool added, enum value added, description
  rewritten). It does not change when validator or patch-operation internals
  change without affecting the tool surface.
- `validator_registry_hash` — SHA-256 over the concatenated source bytes of
  every `.ts` file in `tools/validators/src/structural/` and
  `tools/validators/src/rules/`, sorted by path. Changes when any validator's
  source content changes, even when the validator name is unchanged. This is the
  fingerprint a consumer checks to verify whether the running server has the
  expected validator bundle.
- `patch_operation_schema_hash` — SHA-256 over the patch-operation schema
  manifest (op-kind to op-schema mapping, sorted by kind). Changes when an
  op-kind's payload schema changes, such as required-field additions/removals,
  type changes, or enum value changes. Use it to catch schema drift in deployed
  servers where the tool surface name may be unchanged but the underlying
  contract has shifted.

Consumers verifying server currency should compare both
`validator_registry_hash` and `patch_operation_schema_hash` against locally
computed expectations. Neither alone catches all drift:
`validator_registry_hash` catches validator-implementation drift;
`patch_operation_schema_hash` catches contract drift.
`tools/world-mcp/tests/server/dispatch.test.ts` complements these passive
fingerprints in memory by actively exercising validator code paths against
known-bad fixtures. `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts`
spawns `dist/src/server.js` and checks the same currency across the deployed
stdio boundary.

### Pre-deploy capability-currency smoke

Before claiming capability currency for a freshly built `dist/` server:

1. Run `cd tools/world-mcp && npm run build`.
2. Run `cd tools/world-mcp && npm test`.
3. Confirm `server-capabilities-hash-parity` passes. A mismatch means
   `dist/` is stale and must be rebuilt before the server is restarted in a
   live MCP session.

## Schema Currency Verification

When source adds a new MCP enum value, tool, validator behavior, or patch-operation contract, the running server may still be older than the checkout if `tools/world-mcp/dist/` was not rebuilt or the MCP server/client session was not restarted. Use `mcp__worldloom__describe_capabilities()` to inspect the deployed server's build metadata, enum-valued input contracts, `build_info.validator_registry_hash`, and `build_info.patch_operation_schema_hash`. If the deployed contract is stale, run `cd tools/world-mcp && npm run build`, rebuild `tools/validators` when validator source changed, then restart the MCP server/client session so it loads `tools/world-mcp/dist/src/server.js` and the rebuilt validator bundle.

For patch-plan assembly, use `mcp__worldloom__describe_envelope_schema(op_kind?)` to retrieve the current deployed envelope and operation-payload shapes for `validate_patch_plan` and `submit_patch_plan`. This is the machine-readable path for fields that previously lived only in skill prose, such as `patch_plan.approval_token`, `patches[].target_file`, and `payload.cf_record`.

For storylet assembly, query `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` and inspect `referenced_schemas['https://worldloom.local/schemas/predicate-dsl-grammar.schema.json']` for the closed predicate DSL's per-predicate required arguments and ID patterns, such as `obligation_open.obligation` and `consequence_pending.consequence`.

## Trust tiers

Retrieval now distinguishes four trust tiers instead of flattening everything into either canonical entities or lexical hits:

1. **Canonical entity** — world-level ontology or other declared canonical authority.
2. **Exact structured record edge** — deliberate record-to-record linkage already present in structured ids or fields.
3. **Scoped reference** — explicit source-local retrieval anchor declared on an authority-bearing record without promoting it to world-level ontology.
4. **Lexical evidence** — unresolved phrase evidence used for recall and debugging, not authority.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Retrieval tools report missing nodes or persistent `stale_index` | `_index/world.db` is absent, incompatible, or still stale after the retrieval layer's one-shot auto-sync recovery | Run `world-index init <world>` for an empty bootstrap, or `world-index build <world>` / `world-index sync <world>` for populated world state. If a successful retrieval response includes `freshness_audit.pre_call_index_was_stale: true`, auto-sync already recovered the stale index and no manual retry is needed. |
| A record exists under `_source/` or `stories/<story>/_source/` but is missing from retrieval/index queries | The record's extracted id failed the registered schema pattern, so `world-index build` / `sync` skipped it instead of inserting an invalid node | Inspect `worlds/<slug>/_index/world.db.skipped_records.log` for the file path, node type, extracted id, skip reason, and expected pattern. Legacy suffixed STINT ids such as `STINT-1-<char>` are preserved on disk but skipped by the current bare-numeric `STINT-<integer>` index contract. |
| A tool rejects an enum value that exists in source, such as a new `task_type` or `id_class` | The running MCP server is older than the source checkout, or `tools/world-mcp/dist/` was not rebuilt after the source change | Run `mcp__worldloom__describe_capabilities()` to inspect the deployed enum contract. If it is stale, run `cd tools/world-mcp && npm run build`, then restart the MCP server/client session so it loads `tools/world-mcp/dist/src/server.js`. This is the schema currency verification path introduced after the MCPENH-005 / ENGINESYNC-002 friction case. |
| A tool's pre-apply validators reject a patch plan with verdicts inconsistent with the just-rebuilt validators source | The running MCP server still holds the pre-rebuild `@worldloom/validators` compiled bundle in memory. `describe_capabilities()` exposes `build_info.validator_registry_hash` as the deterministic fingerprint over validator source content; compare the runtime value against a locally computed hash to detect validator-bundle staleness directly. | Principled fix: run `cd tools/validators && npm run build`, then restart the MCP server/client session so the world-mcp process re-imports the rebuilt validators bundle. Temporary workaround when session restart is not immediately available: invoke the pre-apply validators through `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` and the patch engine through `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>`. Both CLI scripts spawn fresh Node processes that load the just-rebuilt validators bundle, bypassing the running server's startup-time cache. The CLI paths are functionally equivalent to the MCP tools: same engine wiring, same `PatchReceipt` output, same failure-mode codes. |
| A skill still wants giant raw reads | Retrieval integration is incomplete for that skill or phase | Use the current skill contract, but treat the context-packet path as the target state |
| Direct Edit/Write is blocked on protected paths | Hook 3 sees an engine-only surface | Route the change through a patch plan instead of direct file editing |
| Validation fails after a write | Rule or structural invariant violation | Fix the underlying world state and rerun validation; do not bypass the validator surface |

The `tools/world-mcp/dist/src/cli/` scripts serve two distinct escape-valve purposes: transport-size escape for patch-plan envelopes that exceed the MCP transport's practical threshold, and fresh-process escape for cases where the running MCP server holds stale dependency code in memory and a full session restart is not immediately available. Operators should default to the principled fix, which is rebuild plus session restart, and reserve the CLI workaround for the in-session mid-flow case. This applies to `validate-patch-plan.js`, `submit-patch-plan.js`, `sign-approval-token.js`, and the `compute-pg-hashes.js` helper introduced by MCPENH-045.

## Where Details Live

- `docs/FOUNDATIONS.md` — authoritative contract
- [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md) — formal packet shape
- `tools/README.md` — package map
- `tools/world-index/README.md` — index CLI and artifact contract
- `tools/world-mcp/README.md` — retrieval tool inventory and approval-token notes
- `tools/patch-engine/README.md` — op vocabulary, atomicity, write order
- `tools/validators/README.md` — validator inventory and CLI
- `tools/hooks/README.md` — hook inventory and rollout phases

## Rollback Posture

The machine-facing layer is deliberately degradable:

- Removing `_index/` only removes the derived index; human-facing world files remain authoritative.
- If hooks are not configured, Claude continues to run; enforcement falls back to skill and operator discipline.
- If the patch engine is not yet live for a workflow, the existing skill-side write path remains the current behavior.

That degradation path is a migration feature, not a license to bypass the machine-facing contract once a world or workflow has been moved onto it.
