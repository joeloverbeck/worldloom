# Pre-flight and World-State Prerequisites

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles (especially §4a Plan-Authority Boundary, §4b Canon Baseline Drift, §5 / §5a / §5b, §6a Belief vs. Fact) governs this skill
- `.claude/skills/_shared-templates/story-state-contract.md` — predicate DSL (§5), action routing (§6), nine hard gates (§7), branching procedure (§9), shared write order (§10)
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4 record schemas (BEL §4.1, PG §4.2, SE §4.3, SLT §4.4, plus §4.4a/§4.4b taxonomies, §4.5.X additional classes, §4.6 receipt)
- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` and `INDEX.md` — bundle root context
- `worlds/<world_slug>/stories/<story_slug>/_source/pages/<parent_page_id>.yaml` — parent page; MUST exist
- Parent's `state_snapshot.active_records` resolved via `mcp__worldloom__get_records(record_ids=<active record id list>, story_slug=<story_slug>)` per FOUNDATIONS §Tooling Recommendation; direct `Read` of individual `_source/<class>/*.yaml` files is permissible but does not exercise the indexed retrieval surface
- Optional `pages-prose/<recent>.md` for §14 continuity (only when parent prose exists)
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>, token_budget=<default>)`. NOTE: the `story_turn_cycle` profile reserves Mystery Reserve and Invariants full bodies per `tools/world-mcp/src/context-packet/shared.ts` (`invariants: "reserve"` / `mystery_reserve: "reserve"`); the default harness budget often returns `packet_incomplete_required_classes` — inspect `minimum_required_budget` in the error and either re-invoke with that budget OR follow the persisted-summary-recovery procedure below (lines 51-69) to load via targeted retrieval.
  Derive world-scope `seed_nodes` only from schema-backed anchors per the shared story-state contract §4 schemas:
  - active `STENT.bound_stchar_id` values are story-local authority pointers, not world-scope seeds; load their corresponding active `STCHAR` records through `story_bundle_context.active_story_characters`, `PG.state_snapshot.active_records.STCHAR`, and targeted story-scoped retrieval, and use `STCHAR.source_char_id` only as non-operational provenance when a skill explicitly needs provenance rather than runtime characterization;
  - active `STLOC.bound_ent` values when non-null;
  - parent `PG.state_snapshot.unresolved_mystery_claims[].mystery_id`;
  - parent `CF-<integer>` ids named by active mirrored `SF.derived_from[]`;
  - active-period `CH-<integer>` / `SEC-*` / `CF-<integer>` / `ENT-<integer>` anchors when already known from loaded world-canon context.
  Do not derive seeds from story-local ids or from fields not defined in the shared story-state contract. In particular, do not pass `STENT`, `STCHAR`, `STLOC`, `STSTAT`, `SF`, `BEL`, `PG`, `SE`, `CHC`, `SLT`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STOBJ`, `BR`, `SLB`, `SAU`, `SP`, or `RSP` ids as context-packet `seed_nodes`; story-local records are loaded through `story_slug` + `story_bundle_context`, `mcp__worldloom__get_records(record_ids=..., story_slug=<story_slug>)`, or `mcp__worldloom__list_records(record_type=..., story_slug=<story_slug>)`. The MCP server-side `story_local_seed_nodes_ignored` warning is a defensive backstop, not a substitute for this discipline. The latest `change_log_entry` in governing context is the current world-canon revision for §4b drift-trigger comparison. If the parent baseline is stale, targeted follow-up retrieval of the intervening CH window and CF-to-section reverse links is required before drift classification.
  Seed derivation conforms to story-state contract §4.5.1 (STENT) and §4.5.8 (STLOC); deviation requires contract amendment first.
- `tools/world-mcp` / `tools/world-index` PG state-hash tooling — canonical deterministic PG state-hash computation per shared contract §4.2a "Tooling" subsection; consumed at Phase 8 after the envelope PG record is finalized. The implementation reuses `canonicalJsonStringify` / `computePgStateHash` from `@worldloom/world-index/hash/content`, matching the validator's `snapshot_replay_equality` path when the input is JSON extracted from the same `patches[N].payload.record` that will be submitted (canonical extraction command: `jq '.patches[<PG-OP-INDEX>].payload.record' envelope.json > /tmp/PG-<integer>.record.json`). YAML input is rejected. Hand-rolling the canonical-JSON serializer is forbidden.

The bundle MUST exist (non-bootstrap variant); parent page MUST exist; the new `_source/pages/PG-<integer>.yaml` MUST NOT exist (collision aborts Pre-flight).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md` into working context. Abort with clear missing-file error on any unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if the directory does not exist or is missing `STORY_KERNEL.md` / `_source/`.
3. Load `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` and its `## Player Agency Contract` section. Abort with agency-contract-missing error if the section is absent or does not name the agency surface, write-in envelope, and viewpoint limits.
4. Load `worlds/<world_slug>/stories/<story_slug>/_source/pages/<parent_page_id>.yaml`. Abort with parent-not-found error if missing.
5. Verify action source against `action_source_mode`: `resolve_selected_choice` requires `chosen_choice_id` and forbids `manual_action_text`; `resolve_write_in` requires `manual_action_text` and forbids `chosen_choice_id`; `advance_initiative` requires both player-action fields absent and selects a non-player driver from active parent pressure; `repair_turn` requires an explicit repair source and uses the repair event-kind path. If `chosen_choice_id` is supplied, verify the CHC exists, was emitted by `parent_page_id`, and is not retired. Abort with action-source error on any failure.
6. Detect continuation vs fork: continuation when `parent_page_id` is the active leaf of `parent.branch_id` (the page with the highest `turn_index` on that branch and no descendant page citing it as `parent_page_id`) and no `force_branch_id` is set; fork otherwise. Allocate a new `BR-<integer>` via `mcp__worldloom__allocate_next_id(world_slug, 'BR', story_slug=<story_slug>)` for forks.
7. Verify parent prose policy: if `accept_parent_unrendered: false` and `worlds/<world_slug>/stories/<story_slug>/pages-prose/<parent_page_id>.md` is absent on disk, abort with parent-unrendered error. Default `true` bypasses the check.
8. Allocate ids via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)` for: `SE`, `PG`, optional `BR`, candidate ids per record class (lazily on first use), `CHC` ids in Phase 7 after the page stop-point is known.
9. Load parent's `state_snapshot.active_records` into working state via `mcp__worldloom__get_records(record_ids=<active record id list>, story_slug=<story_slug>)`; this batches the per-record retrieval into one or two calls (the response shape mirrors per-record `get_record` for each requested id). Direct `Read` of individual story-bundle `_source/<class>/*.yaml` files is permissible but slower at scale and does not exercise the indexed retrieval surface FOUNDATIONS §Tooling Recommendation prescribes. Load whole-class Mystery Reserve and Invariants via context packet. Extract the current world-canon revision from the latest `change_log_entry` in the context packet (`CH-<integer>`, or `null` only if no change log exists).
   - Load active STCHAR authority before action resolution, SLT selection/JIT creation, BEL/STINT/SREL/STPLAN/STEMO drafting, or choice generation. Use `story_bundle_context.active_story_characters` as the index/summary surface, cross-check it against `parent.state_snapshot.active_records.STCHAR`, and retrieve the full or projected STCHAR sections with `mcp__worldloom__get_record(section_path=...)` / `mcp__worldloom__get_records(..., story_slug=<story_slug>)` when persona, voice, appraisal, pressure behavior, relationship conduct, perception/embodiment, or agency materially shapes the turn. **Direct `Read` on STCHAR `.md` hybrid files is NOT a sanctioned fallback** — `section_path` projection is the only mechanism that delivers the targeted operational sections without loading the audit-only Source Distillation and frontmatter content.
   - For every active non-background `STENT`, verify `bound_stchar_id` resolves to an active STCHAR in the parent snapshot. A missing, inactive, or superseded binding is a pre-flight blocker unless the turn's only lawful action is to route to health audit or repair before creating new state. Background-only `STENT` records may have `bound_stchar_id: null` only when `role_in_story` is exactly `[background]`.
   - Do not retrieve world `CHAR-*` dossiers for runtime characterization. `STCHAR.source_char_id` may be cited as provenance only; characterization authority comes from STCHAR content and active story-state records.
10. If `parent.state_snapshot.canon_revision != current_world_canon_revision`, retrieve the full CH window before classification:
    - Call `mcp__worldloom__get_records(record_ids=<every CH id newer than parent baseline>, world_slug=<world_slug>)`.
    - For every CH `affected_fact_ids[]` entry, call `mcp__worldloom__find_sections_touched_by(cf_id)` or equivalent targeted retrieval to enumerate SEC / M / INV records whose `touched_by_cf[]` back-pointers include that CF id.
    - Treat the latest CH as the trigger only; classify from the full intervening CH window plus CF reverse-lookup evidence.
11. Compare `parent.state_snapshot.canon_revision` against the current world-canon revision and classify canon-baseline drift as exactly one of `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict`. Abort before Phase 1 unless the classification is `compatible` or `grandfathered`; route the other classifications to `branching-story-health-audit`, a repair turn, or `story-fact-promotion-to-canon` / `canon-addition` as appropriate. Record the classification and cited CH ids in working memory for `validation_trace.parent_snapshot_compatibility` rationale.
12. Verify the new `_source/pages/PG-<integer>.yaml` does NOT already exist (defensive against a stale allocator state). Abort on collision.

Persisted-summary recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices via
`mcp__worldloom__get_persisted_packet_slice` before continuing. If
`get_context_packet` instead returns a hard
`packet_incomplete_required_classes` error (typical when the
`story_turn_cycle` profile's reserve-priority full bodies for Mystery
Reserve / Invariants cannot fit the harness's character ceiling — inspect
the error's `minimum_required_harness_ceiling_chars` vs
`effective_harness_ceiling_chars` to distinguish from a budget-binding case),
follow the operator-recovery procedure documented at
`.claude/skills/_shared-templates/persisted-packet-recovery.md` §When
Required Classes Cannot Fit: retrieve the named seed-record ids directly via
`mcp__worldloom__get_records(record_ids=[...])` or load whole classes via
`mcp__worldloom__list_records(record_type=..., include_full_body=true)`. Do
not retry unless the error details include `retry_with.token_budget`; when
`retry_with` is absent, follow the error's `fallback_advice` and use targeted
retrieval.

Stale-index auto-recovery: if any pre-flight retrieval call returns `stale_index`, the MCP freshness guard auto-recovers in two rungs — it runs `world-index sync <world_slug>` once and retries, then escalates to a full `world-index build <world_slug>` and retries once more (incremental `sync` can under-reconcile story-bundle records such as storylet/STCHAR drift). A successful response carrying `freshness_audit.pre_call_index_was_stale: true` means recovery already happened and no manual retry is needed. Only a surfaced `recovery_outcome: still_stale_after_build` (or `build_failed`) means recovery is exhausted — run `world-index build <world_slug>` manually and investigate why disk and index diverge before retrying.

If any precondition fails, the skill aborts before Phase 1.
