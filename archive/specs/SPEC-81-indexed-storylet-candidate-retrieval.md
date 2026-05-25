# SPEC-81 — Indexed Storylet-Candidate Retrieval

**Spec ID:** SPEC-81
**Date:** 2026-05-24
**Source brainstorm:** `archive/reports/slt-chc-overhaul-second-iteration.md` triaged at `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`.
**Status:** COMPLETED

## §1 Goal

Add a compiled storylet-candidate retrieval surface to the machine-facing layer: SLT projection columns and edges in `tools/world-index/`, a new MCP tool `select_storylet_candidates` in `tools/world-mcp/`, and consumer wiring in `branching-story-turn-cycle` Phase 2.1 and `commitment-block-authoring` Phase 1. The new surface replaces full-body `list_records(record_type='storylet_record', include_full_body=true)` scans on the hot path with indexed predicate-shape filtering plus a small shortlist materialization; the existing `list_records` path remains available for cases where full bodies are genuinely needed.

## §2 Background

### §2.1 The scaling evidence

Per the user's iteration-2 redirection: a prior production story bundle (since deleted because the upcoming SLT/CHC overhaul would have been incompatible) had ~25 storylets by page 4. Extrapolating: 50-100 by page 10-20, growing further as authoring proceeds. The current architecture has two hot-path scaling pressures:

1. **`commitment-block-authoring` Phase 1** reads the entire SLT pool via `list_records(record_type='storylet_record', world_slug, story_slug, include_full_body=true)` to compute gap diagnostics. Per iteration-2 verification at `tools/world-mcp/src/tools/list-records.ts` (the body of `listRecordsImpl`, approximately lines 409-517), the implementation is a linear scan over typed rows with per-row YAML parse + in-process filter. At 25 SLTs the scan is sub-second; at 200+ SLTs the parse cost begins to dominate.
2. **Story-bundle context packet** caps `MAX_VISIBLE_STORYLETS = 50` (`tools/world-mcp/src/context-packet/story-bundle-context.ts:48`). Above 50, full SLT bodies disappear from the packet and only the aggregate distribution remains. Turn-cycle Phase 2's SLT-selection inputs become truncated; turn-cycle still works (it filters against the parent PG snapshot directly) but the LLM-facing context loses visibility.

The user has named the threshold: this becomes a real problem fast. SPEC-81 closes it before the next production bundle hits the wall.

### §2.2 What is and is not "compiled retrieval"

Compiled retrieval means: at world-index build time, project the load-bearing filter fields of each SLT into indexed columns; at query time, the MCP server applies symbolic predicates against the index and materializes full bodies only for the shortlist. This is the §Tooling Recommendation pattern of FOUNDATIONS — LLM agents see compact, lawful summaries plus a small set of full bodies, not the entire pool.

What this spec is NOT:
- Not a precondition-DSL compiler. Predicate evaluation against the parent PG snapshot remains in process (the turn-cycle Phase 2 evaluator); the index pre-filters by predicate KIND and REFERENCED CLASS, then in-process evaluation runs only on the shortlist.
- Not an embedding-similarity surface. Per FOUNDATIONS §Story Bundles §5c and ChatGPT-Pro iteration-2 §10.4, legality decisions are symbolic; embeddings (if ever added) sit on top of symbolic candidates, not under them.
- Not a runtime planner. Selection-time ranking remains local-salience per FOUNDATIONS §5c. The MCP tool returns shortlist + filter-trace; the consumer decides.

### §2.3 Relationship to other iteration-2 specs

SPEC-79 (`CHC.associated_commitment_block` removal) and SPEC-82 (remaining schema-drift repairs) have already shipped (2026-05-24) and are archived at `archive/specs/SPEC-79-chc-associated-commitment-block-removal.md` and `archive/specs/SPEC-82-remaining-schema-drift-repairs.md` respectively. Both were independent of this spec in mechanics.

Outcome amended 2026-05-25: the former active sibling SPEC-80 is now archived at `archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md`. It had a soft dependency on this spec: its coverage diagnostic operates against SLT projection records and benefits from this spec's projection API where a projection path is appropriate. SPEC-81 is complete, so SPEC-80 uses `select_storylet_candidates` for projection-backed consumers and `list_records(include_full_body=true)` where a whole-pool health-audit read would make parent-page / turn-driver filters inappropriate.

## §3 World-Index Changes

### §3.1 New projection columns on SLT nodes

**File:** `tools/world-index/src/schema/types.ts` (per iteration-2 verification at lines 108-168, this is where node/edge type declarations live; per `parse/atomic.ts:784-848`, this is where the parse path emits per-node fields). The schema layer adds projection columns specifically for `node_type: storylet_record`.

**New columns** (each is a top-level node-row column or a typed-edge target, not a free-form JSON blob; this is the load-bearing distinction from "store the parsed YAML as JSON"):

| Column / edge | Source field on SLT | Cardinality | Purpose |
|---|---|---|---|
| `slt_scope_visibility` | `scope.visibility` | 1 (enum: `global_author_pool | branch_prefix_scoped | branch_scoped`) | filter by visibility |
| `slt_scope_branch_id` | `scope.branch_id` | 0-1 | branch-scope filter |
| `slt_scope_branch_path_prefix` | `scope.visible_branch_path_prefix` | 0-1 | branch-prefix filter |
| `slt_provenance_origin` | `provenance.origin` | 1 (enum) | runtime/JIT/seed origin filter |
| `slt_move_family` | `move_family` | 1 (enum) | move-family filter |
| `slt_exit_action_families` | `exit_options[].action_family` | 0-N edges | action-family filter |
| `slt_saliency_urgency` | `saliency.urgency` | 1 (enum: `low | medium | high`) | salience filter |
| `slt_saliency_cooldown_pages` | `saliency.cooldown_pages` | 0-1 | cooldown filter |
| `slt_mystery_policy_allowed_authority` | `mystery_policy.allowed_authority` | 1 (enum) | mystery-authority filter |
| `slt_grounding_compatible_turn_drivers` | `grounding.compatible_turn_drivers[]` | 1-8 edges (closed enum) | driver-kind filter (SPEC-77 surface) |
| `slt_predicate_pred` | `preconditions.hard[].pred` + `preconditions.soft[].pred` | 0-N edges | predicate-kind filter (the `pred` field on each precondition object, matching the schema's predicateObject required field and the `PRED_TYPES` enum in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`) |
| `slt_predicate_referenced_class` | predicate `record_class` / `holder_role` / `kind` arguments | 0-N edges | source-class filter (SPEC-80 surface) |
| `slt_source_record_id` | predicate literal-ID references (e.g., `STPLAN-9`) | 0-N edges | branch-leak validation |

The columns above project fields that already exist on SLT per `story-storylet.schema.json`; no schema change is implied.

### §3.2 New edge types

Per iteration-2 verification, current SLT-related edges are: `storylet_predicate_ref`, `storylet_effect_ref`, `storylet_exit_likely_effect_ref`, `event_selected_storylet`, plus CHC-side edges. **Added edges:**

- `storylet_compatible_driver` (SLT → driver-kind enum value)
- `storylet_predicate_pred` (SLT → `pred` enum value from `PRED_TYPES`)
- `storylet_predicate_class` (SLT → record-class enum value)
- `storylet_action_family` (SLT → action-family enum value via exit_options)

(`storylet_predicate_ref` and `storylet_effect_ref` remain as-is; the new edges are coarser-grained projections suitable for filter prefiltering before the existing fine-grained edges are consulted on the shortlist.)

### §3.3 Build invalidation

The new columns are derived; world-index `build` and `update` paths recompute them per affected SLT row. Hash invalidation follows the existing per-node anchor-hash discipline — no new invalidation surface.

## §4 New MCP Tool: `select_storylet_candidates`

### §4.1 Tool name and registration

**Tool name:** `mcp__worldloom__select_storylet_candidates`.

**Registration:** Add to `tools/world-mcp/src/tool-names.ts` and the tool-registry entry. Permission gating follows the existing read-tool pattern (story-bundle-scoped; requires `world_slug` + `story_slug`).

### §4.2 Input shape

```yaml
world_slug: string
story_slug: string
parent_page_id: string                  # PG-N — the parent page snapshot to filter against
turn_driver:                            # the in-flight turn driver
  kind: enum (the 8-value SPEC-77 enum)
  initiator: string | null
  driver_records: string[]              # active record ids cited by the driver
intent_signature:                       # optional; the player intent or NPC commitment shape
  action_families: string[]             # filter on exit_options action_family
  grounding_record_classes: string[]    # filter on predicate referenced classes
  grounding_record_ids: string[]        # filter on literal source records
max_candidates: integer                 # default 24
include_rejection_summary: boolean      # default true
```

Note: `intent_signature` does NOT carry a `binding.mode` (no such schema field — SPEC-79 explicitly rejected adding `binding` / `binding.mode` to CHC; the binding intent on CHC is carried by `CHC.grounded_in.records` + `CHC.target_or_action_families`). The intent shape is derived by the consumer from `CHC.target_or_action_families` + `CHC.grounded_in.records` (for player-choice resolution) or from the driver's `driver_records` (for non-player drivers).

### §4.3 Output shape

```yaml
candidate_projection_hash: string       # content-hash of the projection columns used; enables cache invalidation
filter_trace:                           # per-stage counts for diagnostics + audit
  pool_total: integer
  after_scope: integer
  after_driver_kind: integer
  after_action_family: integer
  after_predicate_shape: integer
  after_predicate_class: integer
  after_source_record_id: integer
  after_mystery_policy: integer
  after_cooldown: integer
shortlisted_candidate_ids: string[]     # at most max_candidates
shortlisted_projection_records:         # compact projection rows for each shortlist entry
  - id: string
    move_family: string
    scope_visibility: string
    saliency_urgency: string
    compatible_turn_drivers: string[]
    predicate_classes: string[]
    action_families: string[]
requires_full_body_ids: string[]        # subset of shortlist for which the consumer needs full bodies (typically all of them, but the consumer can elide)
```

The consumer then issues `mcp__worldloom__get_records(record_ids=requires_full_body_ids, story_slug=...)` for the full bodies it needs (predicate evaluation, alias binding, prose-plan synthesis). For a 1000-SLT pool reduced to 12-24 shortlist, full-body retrieval is ≤24 reads instead of 1000.

### §4.4 Filtering pipeline (server-side)

The tool runs the following symbolic pipeline against the world-index projection columns, in order:

1. **Story scope filter** — `world_slug + story_slug` (SQL `WHERE`).
2. **Branch visibility filter** — `slt_scope_visibility ∈ {global_author_pool} ∪ {branch_prefix_scoped where slt_scope_branch_path_prefix matches parent_page.branch_path} ∪ {branch_scoped where slt_scope_branch_id == parent_page.branch_id}`. Prefix matching is PG-array-prefix: `slt_scope_branch_path_prefix` is an array of `PG-N` IDs (per `tools/validators/src/schemas/story-storylet.schema.json` `scope.visible_branch_path_prefix`), and "matches" means every element of the prefix array appears in order at the head of the parent page's `branch_path`. (The schema is the ground truth here; see §10 follow-up.)
3. **Driver-kind filter** — `turn_driver.kind ∈ slt_grounding_compatible_turn_drivers`.
4. **Action-family filter** (when `intent_signature.action_families` is supplied) — intersection check against `slt_exit_action_families`.
5. **Predicate-shape filter** — predicate-kind set of `slt_predicate_pred` must include at least one `pred` value whose evaluation against the parent PG snapshot could plausibly succeed (cheap structural check; full predicate evaluation runs on the shortlist).
6. **Predicate-class filter** — referenced-class set must contain at least one class present in the parent PG's `active_records`.
7. **Source-record-id filter** — two combined checks: (a) static branch-leak prevention — every literal record-id reference on the SLT (projected as `slt_source_record_id`) must resolve in the bundle, and a `global_author_pool` SLT must not reference a branch-local record id; (b) when `intent_signature.grounding_record_ids` is supplied — the SLT's `slt_source_record_id` set must intersect non-emptily with the input's `grounding_record_ids` (the SLT must reference at least one of the records the intent grounds against). When `intent_signature.grounding_record_ids` is omitted, only (a) runs.
8. **Mystery-policy filter** — `mystery_policy.allowed_authority` must be compatible with the parent PG's `unresolved_mystery_claims`. The schema enum is `["apparent", "branch_local_counterfactual", "canon_candidate", "none"]`. Per-value semantics: `none` → SLT is mystery-agnostic; passes regardless of `unresolved_mystery_claims`. `apparent` / `branch_local_counterfactual` / `canon_candidate` → SLT is mystery-touching and requires at least one active claim in `unresolved_mystery_claims[]` whose `status` matches the declared authority (the coarse pre-filter; full firewall — including forbidden-mystery prevention — runs on the shortlist in the existing turn-cycle Phase 2 evaluator).
9. **Cooldown filter** — `saliency.cooldown_pages` must be satisfied by recent-use history.
10. **Salience + diversity ranking** — order surviving rows by `saliency.urgency` descending then by move-family diversity; truncate to `max_candidates`.
11. **Emit shortlist + projection records + filter trace**.

The pipeline is fully symbolic until step 5 (predicate-shape filter); step 5 reads predicate kinds (`pred` values) from the projection columns and applies a cheap "could this `pred` succeed against active records of class X" structural check. Full predicate evaluation (substituting alias bindings, evaluating comparators) runs on the shortlist in the existing turn-cycle Phase 2 evaluator — this spec does NOT move the predicate evaluator server-side.

### §4.5 No full-body server-side

`select_storylet_candidates` never returns full SLT bodies. The output contains projection records only. Consumers fetch full bodies via `get_records` on the shortlist. This is the load-bearing distinction from `list_records(include_full_body=true)` — the new tool guarantees that even a 10,000-SLT pool yields ≤`max_candidates` full-body reads per call.

## §5 Consumer Wiring

### §5.1 `branching-story-turn-cycle` Phase 2.1

**File:** `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 2 + `references/phase-2-3-commitment-and-state-delta.md`.

**Current state:** Phase 2 currently filters the SLT pool against the parent PG snapshot in-process using the 10-step pipeline at `references/phase-2-3-commitment-and-state-delta.md:5-17`, plus the SPEC-77 driver-kind filter at line 32.

**Proposed state:** Phase 2 calls `mcp__worldloom__select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature)` to obtain the shortlist plus filter trace. The existing in-process predicate-evaluation pipeline runs only on the shortlist. The SLT-selection LLM call (Phase 2's LLM-facing surface) sees the shortlist's full bodies plus the filter trace's stage counts, never the full pool.

### §5.2 `commitment-block-authoring` Phase 1

**File:** `.claude/skills/commitment-block-authoring/SKILL.md` Phase 1.

**Current state (per iteration-2 verification):** Phase 1 calls `list_records(record_type='storylet_record', world_slug, story_slug, include_full_body=true)` to compute gap diagnostics over the full pool.

**Proposed state:** Phase 1 calls `select_storylet_candidates` with `max_candidates: pool_size` (effectively all) and `include_rejection_summary: true` to obtain projection records for the whole pool plus the filter trace. Gap diagnostics (move-family, causal-function, plus SPEC-80's driver-kind × pressure-source) operate on projection records — no full bodies needed for the coverage check. Full bodies are read only for blocks the skill plans to mutate (`replace` / `extend` ops).

For backward compatibility during the SPEC-81 rollout (before all consumers are wired), `list_records(include_full_body=true)` remains available; only `commitment-block-authoring` and `turn-cycle` are migrated in this spec.

### §5.3 Context packet `story_bundle_context`

**File:** `tools/world-mcp/src/context-packet/story-bundle-context.ts`.

**Change:** The existing `MAX_VISIBLE_STORYLETS = 50` cap (line 48) is preserved for the human-readable summary. When the packet is assembled for a story-pipeline task type with a `parent_page_id` available, the packet additionally embeds the output of `select_storylet_candidates(turn_driver: derived_or_player_default)` with `max_candidates: 12-24` — this is the LLM-facing shortlist. The visible-storylets summary (50-cap) and the shortlist (12-24-cap) coexist; the LLM sees both, with the shortlist labeled as "candidates already filtered by driver-kind + active-class compatibility."

## §6 Patch-Engine Changes

None. `select_storylet_candidates` is a read-only MCP tool. SLT mutation continues to route through the existing `create_slt_record` op (`tools/patch-engine/src/envelope/schema.ts:96`); supersession of SLTs is currently not a patch-engine op and is out of scope for this spec.

## §7 Out of Scope

- **New patch-engine ops**. The SPEC-81 surface is read-only. The post-shortlist mutation path (create SLT, supersede SLT) uses existing ops.
- **SSEL selection-trace record class** (iteration-2 SPEC-81 original framing). Rejected per `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md` SPEC-81 verdict and SPEC-51 §FOUNDATIONS Alignment §5b. The filter trace this spec emits is a per-call diagnostic, not a persistent record class. Selection-time provenance lives in `SE.commitment.alias_bindings` + `SE.world_logic_rationale` per SPEC-51.
- **Server-side predicate evaluation**. The MCP tool runs the cheap structural predicate-kind/class check; full predicate evaluation with alias substitution stays in the turn-cycle Phase 2 evaluator. Moving evaluation server-side is a separate spec contingent on profiling evidence.
- **Embedding similarity surface**. Rejected per FOUNDATIONS §5c. Symbolic filtering only; if embeddings are ever added, they sit ABOVE the symbolic shortlist as a diversification pass, not under it.
- **Context-packet cap reduction below 50**. The 50-cap summary is preserved; the shortlist is additive.
- **Migration of `list_records(include_full_body=true)` callers outside turn-cycle and commitment-block-authoring**. Other callers may continue using the existing path; migration to projections happens spec-by-spec as needs surface.

## §8 FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Tooling Recommendation | aligns | "LLM agents should never operate on prose alone... directly or via the documented context-packet + targeted-retrieval pattern." `select_storylet_candidates` is exactly this pattern applied to SLT pools that exceed the packet's full-body envelope. |
| §Machine-Facing Layer | aligns | Extends the world-index → MCP → patch-engine triple with a new read tool. The schema and write surface are unchanged; the addition is a read-side filtering layer that respects the existing Hook 2 large-read redirect discipline. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | No new schema fields on any story-bundle record. The projection columns are derived index artifacts, not record schema. |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns | The filtering pipeline is symbolic and local — each filter stage tests a structural compatibility against the parent PG snapshot, never against a target narrative shape. Salience ranking at step 10 uses per-SLT `saliency.urgency` (existing field), not aggregate distribution scoring. |
| §Story Bundles §6b (Information / Observer Firewall) | aligns | The MCP tool is server-side and operates over fully-derived indexed columns; it does not introspect hidden state. The observer-firewall validation continues at the page-commit-time `turn_driver_pov_observer_firewall` validator (SPEC-76 surface). |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | aligns | The shortlist is a set of causal moves whose preconditions structurally CAN apply at the parent page. The downstream consumer (turn-cycle Phase 2 LLM call) does the narrative-fit selection among lawful candidates — the §5a framing is preserved. |

## §9 Validation Tests

1. **Index-build correctness**: After `world-index build` against a bundle with 50 SLTs of varying scope/driver/predicate shapes, the projection columns and new edges exactly match the source SLT fields (no drift). Verification mechanism: a build-time roundtrip check that re-derives each projection column from the parsed SLT full body and asserts equality against the persisted column — implementable as a `world-validate` rule or a one-shot script invoked from the test harness. Any mismatch fails the build.
2. **Synthetic 1000-SLT pool**: Generate a synthetic story-bundle fixture with 1000 SLTs (varied scope, driver compatibility, predicate shapes). `select_storylet_candidates(turn_driver=player_action, ...)` returns ≤24 shortlisted ids; the consumer's full-body read count is ≤24. Reject any code path that reads >24 full bodies in a single Phase 2 invocation.
3. **Filter-trace counts**: For a hand-crafted 100-SLT bundle with known counts at each filter stage (e.g., 70 global, 30 branch-scoped; 40 npc_action-compatible; etc.), `filter_trace` stage counts exactly match the hand-counted values.
4. **Turn-cycle end-to-end**: A turn-cycle invocation on the 1000-SLT bundle completes in measurably less wall time than the equivalent `list_records(include_full_body=true)` path. (Quantitative threshold deferred to implementation; the spec asserts a measurable improvement, not a specific ms target.)
5. **commitment-block-authoring end-to-end**: A direct_batch invocation on the 1000-SLT bundle produces the same gap-diagnostic output it would have produced via `list_records` — the projection contains all fields the diagnostic reads (move_family, compatible_turn_drivers, predicate classes).
6. **Backward compatibility**: `list_records(record_type='storylet_record', include_full_body=true)` continues to work and continues to return full bodies. The new tool is additive.
7. **Context packet integration**: For a story-pipeline task type with `parent_page_id` supplied, the packet contains both the existing 50-cap visible_storylets summary AND the new shortlist (12-24 entries with projection records).

## §10 Implementation Notes

- **Sequencing**: The implementation has three phases that can ship as separate tickets within this single spec. (1) World-index projection columns and edges. (2) MCP tool implementation against the new columns. (3) Consumer wiring in turn-cycle Phase 2.1, commitment-block-authoring Phase 1, and story_bundle_context. Phase 1 ships without consumer impact; Phase 2 lets consumers opt in; Phase 3 makes the migration active. Intermediate states are safe: consumers using `list_records(record_type='storylet_record', include_full_body=true)` continue to work throughout phases 1-2 and remain on that path until they explicitly opt in at phase 3.
- **Cost estimate**: ~3,000-5,000 LOC across `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/schema/types.ts`, a new SQL migration in `tools/world-index/src/schema/migrations/` (to add the projection columns and new edge-type allowances), `tools/world-mcp/src/tools/select-storylet-candidates.ts` (new), `tools/world-mcp/src/tool-names.ts`, `tools/world-mcp/src/context-packet/story-bundle-context.ts`, plus integration tests. Lower than ChatGPT-Pro's iteration-2 estimate (5,000-8,000 LOC) because this spec does NOT introduce a new persistent record class, new patch-engine ops, or server-side predicate evaluation.
- **Phase-2-3 doc reconciliation**: Implemented by archive/tickets/SPEC81INDSTOCAN-003.md on 2026-05-24 as part of the Phase 2 shortlist rewrite. The old `branch_prefix_scoped` wording that described "`scope.branch_id` is in the active branch's lineage" was removed from `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`; branch visibility is now delegated to `select_storylet_candidates`, whose §4.4 step 2 uses schema-grounded `visible_branch_path_prefix` PG-array-prefix semantics.
- **SPEC-80 unblocking**: SPEC-81 shipped the projection API, so SPEC-80's coverage diagnostics can call `select_storylet_candidates` with `max_candidates: pool_size` to obtain projection records for the coverage check. SPEC-80 retains `list_records` only as a local fallback if projection access is unavailable.
- **`SLT.grounding.compatible_turn_drivers[]` is already indexed via the SPEC-77 schema field**; this spec adds the typed-edge surface (`storylet_compatible_driver`) for symbolic filtering. The schema field is unchanged.
- **Replay correctness**: `select_storylet_candidates` is a pure projection-of-current-state query; replaying from a parent PG snapshot uses that snapshot's `active_records` as the predicate-class filter input. There is no read-time drift; the projection columns are recomputed per index build, and replay does not require historical projections.

## Outcome

Completed on 2026-05-24.

SPEC-81 landed as six archived tickets:

- `archive/tickets/SPEC81INDSTOCAN-001.md` — world-index SLT projection columns and coarse filter edges.
- `archive/tickets/SPEC81INDSTOCAN-002.md` — `select_storylet_candidates` MCP tool and docs.
- `archive/tickets/SPEC81INDSTOCAN-003.md` — `branching-story-turn-cycle` Phase 2.1 shortlist wiring and Phase 2 reference reconciliation.
- `archive/tickets/SPEC81INDSTOCAN-004.md` — `commitment-block-authoring` Phase 1 projection-read wiring.
- `archive/tickets/SPEC81INDSTOCAN-005.md` — context-packet `story_bundle_context.selection_shortlist` embedding.
- `archive/tickets/SPEC81INDSTOCAN-006.md` — capstone integration tests for SPEC-81 §9.2, §9.3, §9.6, and §9.7, plus manual runbook documentation for §9.4 and §9.5.

Final verification:

- PASS — `cd tools/world-mcp && npm run build`
- PASS — `cd tools/world-mcp && node --test dist/tests/integration/spec81-storylet-candidate-retrieval.test.js` (4 tests passed)
- PASS — `cd tools/world-mcp && npm test` (442 tests passed)
- PASS — `cd tools/world-index && npm run build`
- PASS — `cd tools/world-index && npm test` (132 tests passed)

Deviation: the capstone documents the interactive Claude skill dry-runs for turn-cycle and commitment-block-authoring as manual operator runbooks rather than executing them in Codex. The package-level automated tests prove the indexed projection, MCP tool, batched full-body retrieval, backward-compatible `list_records` path, and context-packet shortlist surfaces those skills consume.
