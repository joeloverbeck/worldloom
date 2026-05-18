<!-- spec-drafting-rules.md not present; using SPEC-42's structure (Status / Phase / Depends on / Blocks / Source header + Problem Statement + Key Design Decisions + Approach + per-phase sections + FOUNDATIONS Alignment + Out of Scope + Deliverables + Risks & Open Questions + Test Plan). -->

# SPEC-46: Story-Pipeline Machine-Facing Layer Foundation Fixes for Existing Record Classes

**Status**: DRAFT
**Phase**: wave-1 machine-facing layer reconciliation (no new story-bundle record classes; existing-record retrieval surface fixes)
**Depends on**: SPEC-42 (introduced CLK / STSEC / STQ — the new classes this spec catches the retrieval surface up to); SPEC-45 (story-state provenance indexing — established the pattern of expanding `STORY_EDGE_TYPES` for previously-unindexed story-record fields)
**Blocks**: follow-up specs for `STPLAN` (actor-owned tactical plan), `STEMO` (actor-owned affective state), the Priority 2 render packets (present-causal-situation, dramatic-irony, reader-expectation, social-pressure, pressure-texture, branch-possibility-space), and the `SE.record_introductions[]` migration brainstorm — none in this spec's scope
**Source**: `reports/new-story-structures-proposal.md` (ChatGPT-Pro deep-research proposal, 2026-05-18, Priority 0 only); brainstorm-triage cross-checked against `docs/FOUNDATIONS.md` §Story Bundles §4a / §5a / §5b / §5c, `.claude/skills/_shared-templates/story-state-contract.md` §3-5 / §7-8, `.claude/skills/_shared-templates/story-record-schemas.md`, archived SPEC-42 (CLK / STSEC / STQ contract precedent), archived SPEC-45 (provenance edge precedent), and `tools/validators/src/`, `tools/patch-engine/src/`, `tools/world-mcp/src/`, `tools/world-index/src/` verified codebase state.

**Implementation note (2026-05-18)**: `archive/tickets/SPEC46STOPIPMAC-002.md` landed the Phase B actor-bound MCP summaries `active_intentions`, `active_statuses`, `active_intention_ids`, and `active_status_entities` in `tools/world-mcp`. The remaining Phase B/Phase C absence claims below remain active for tickets 003-015 unless a later implementation note supersedes them.

---

## Problem Statement

The proposal at `reports/new-story-structures-proposal.md` makes a two-layer claim: (1) Worldloom's story ontology is rich (20 record classes, eight hard gates, 22-predicate closed DSL — verified), and (2) its **machine-facing retrieval surface and rendering support underuse that ontology**. Brainstorm-triage verification confirmed the second claim at three concrete sites:

1. **MCP context-packet projection drift for `OBL`.** The current `OBL` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.4 (lines 448-464) carries `obligation_kind`, `description`, `owed_by`, `owed_to`, `trigger_to_close`, and `urgency: low | medium | high` (closed enum). The MCP context builder at `tools/world-mcp/src/context-packet/story-bundle-context.ts:197-211` (`buildOpenObligations`) instead emits a projection with `type` (not `obligation_kind`), `owner` (absent from schema), `subjects` (absent from schema), numeric `salience` (absent from schema), and numeric `urgency` (schema is enum). Skills relying on `mcp__worldloom__get_context_packet` with `story_slug` receive a story-bundle-context obligation summary that does not reflect the persisted records — silent retrieval drift. The most-likely cause is field-name evolution against an earlier `OBL` shape that was never propagated into the projection layer.

2. **MCP context-packet absent active-record summaries.** The story-bundle context (`buildStoryBundleContext` at `tools/world-mcp/src/context-packet/story-bundle-context.ts:455-486`) projects twelve summary fields: `storylet_pool_summary`, `open_obligations`, `active_threads`, `active_clocks`, `hidden_secrets`, `open_story_questions`, `longest_active_branch_path`, `recent_pages_along_longest_active_branch`, `mysteries_in_play`, `mystery_evidence_chains`, `cast_bind_list`, `invariants_acknowledged`. It does not surface `STINT` (active intentions), `BEL` (active beliefs by holder), `SREL` (active relationships by participant), `STSTAT` (entity status), `STLOC` (location state in scope), `STOBJ` (object state in scope), or story-local `DA` (story-local diegetic artifact). Skills that need this state today fall back on raw file reads (blocked by Hook 2 for oversized `_source/<class>/*.yaml` reads, then routed to per-id `get_record`), which makes the existing context-packet promise — "directly or via the documented context-packet + targeted-retrieval pattern" per FOUNDATIONS §Tooling Recommendation — fail to deliver the story-bundle equivalent of what world canon already receives.

3. **World-index story edge extraction limited to 14 edge types.** `STORY_EDGE_TYPES` at `tools/world-index/src/schema/types.ts:84-99` enumerates exactly 14 edges: `world_entity_binding`, `story_fact_derived_from`, `created_at_page`, `state_delta_create`, `state_delta_supersede`, `creation_evidence`, `opens_obligation`, `pays_off_obligation`, `complicates_obligation`, `transfers_obligation`, `parent_page`, `leaf_page`, `dependent_fact`, `thread_obligation`. The extraction site is `edgesForStoryRecord` at `tools/world-index/src/parse/atomic.ts:564`. Many ownership / provenance / participation / clue-carrier / actor / target relations on the current record set are not extracted as edges and therefore cannot be queried via `get_neighbors`, `find_referencing_symbols`-style traversal, or graph-walking MCP helpers. Concretely the unindexed fields are: `BEL.holder`, `BEL.basis.source_event`, `BEL.basis.access_records[]`, `BEL.consequences.opens[]`; `SREL.participants[]`, `SREL.derived_from[]`; `STINT.holder`, `STINT.supersedes`; `STSTAT.entity`; `CLK.linked_records[]`, `CLK.driver`, `CLK.tick_history[].event`; `STSEC.truth_anchor`, `STSEC.holders[]`, `STSEC.clue_carriers[].record`, `STSEC.reveal_records[]`; `STQ.source_records[]`, `STQ.payoff_of[]`, `STQ.answer_records[]`; `SE.actor`, `SE.targets[]`, `SE.commitment.selected_slt_id`. SPEC-45 added three of the current fourteen edges (`state_delta_create`, `state_delta_supersede`, `creation_evidence`) for SE-provenance traversal; the present spec extends the same pattern to the remaining unindexed fields above.

### Key design decisions

- **Considered bundling STPLAN and STEMO into this spec (the proposal's Priority 1); chose to defer both to follow-up specs.** Reason: the proposal's own ordering states "First fix MCP/index/page-plan support for the ontology Worldloom already has. Then add `STPLAN` and `STEMO`." STPLAN in particular needs a focused §5b stress-test (proposed fields `risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale` lack named-validator consumers in the proposal) and §5c safeguards (no future PG ids; no guaranteed-outcome framing; supersession-on-revision discipline) that warrant their own design pass. Precedent: archived SPEC-42 §Key Design Decisions explicitly deferred STPLAN to a follow-up spec on identical grounds. STEMO's schema is more defensible but depends on the same retrieval surface this spec lands.
- **Considered bundling the Priority 2 packets (present-causal-situation, dramatic-irony, reader-expectation, social-pressure, pressure-texture, branch-possibility-space) into this spec; chose to defer all six.** Reason: each packet introduces a new page-plan section into the 19-section template defined at `.claude/skills/_shared-templates/story-state-contract.md` §8 (lines 335-359), which is consumed by every page-authoring skill (`branching-story-bootstrap`, `branching-story-turn-cycle`, prose-attach validators). A page-plan-template change of this size is its own design concern; landing it without the underlying retrieval surface (this spec) would force each new section to raw-author through skill prose rather than receive structured data, and landing it with this spec roughly doubles the surface area. Pragmatic deferral — not structural.
- **Considered the proposal's "Priority 0 item 4: Fix `SE.commitment.alias_bindings` to include CLK, STSEC, STQ"; rejected outright.** Reason: verification at `.claude/skills/_shared-templates/story-record-schemas.md:177-178` showed that `alias_bindings` is defined as a free-form `<alias>: <record_id>` mapping with no class enumeration or restriction. CLK / STSEC / STQ ids can be bound to aliases today; nothing in the schema or validator chain blocks this. The proposal's claim is empirically false at HEAD; there is no gap to fix.
- **Considered the proposal's "Priority 0 item 5: replace parseable `intro:<CLASS>(...)` tags with structured `SE.record_introductions[]`"; deferred to its own brainstorm.** Reason: the existing intro-tag grammar (`.claude/skills/_shared-templates/story-state-contract.md` §5a) is live, parser-backed at `tools/validators/src/structural/midstory-introduction-utils.ts`, and consumed by `midstory_record_introduction_grounding`. The proposal frames it as "workable but brittle"; replacing it is a structural migration with cross-skill prose churn that does not block any other Priority 0 item. Separable concern.
- **Considered the proposal's "Priority 0 item 6: add page-plan render packet helper or equivalent MCP surface" (`get_page_render_packet(story_slug, page_id)`); deferred.** Reason: a single mega-packet helper aggregating "selected event + active plans + emotional states + present situation + dramatic irony + reader expectation + social pressure + clocks/secrets/questions + required beats + forbidden moves + choices" would (a) embed five non-state packets that this spec defers, (b) couple a wide surface that's better composed from targeted retrieval helpers as concrete consumers identify needs, and (c) overlap with `get_context_packet`'s `story_bundle_context` layer. Let consumer-driven need surface the right shape.
- **Considered also auditing the projection completeness of `hidden_secrets` (claim: missing clue-carrier visibility distinction) and `open_story_questions` (claim: missing source / payoff / answer / progression metadata); scoped this spec to the **verified** drift on `OBL` only.** Reason: the proposal claims projection drift on three projections; only `OBL` has been verified at HEAD against schema. The other two require a focused audit pass that may discover additional gaps — better as a follow-up audit ticket than smuggled into this spec on hearsay.

---

## Approach

Three additive phases. All changes are **additive at the retrieval surface** — no existing record schema is altered, no existing validator is changed in behavior, no existing context-packet field is renamed (the `OBL` projection fix is an internal-shape correction; the surface field name `open_obligations` stays). Bundles untouched by this spec remain valid; consumers unaware of the new MCP fields and edge types continue to work.

### A. Fix `open_obligations` MCP projection drift to match the current `OBL` schema

**Site**: `tools/world-mcp/src/context-packet/story-bundle-context.ts:197-211` (`buildOpenObligations`) and the corresponding `ContextPacketStoryBundleContext["open_obligations"]` type declaration in the shared MCP types module (currently exported from the same file's `types.ts` neighbor or `tools/world-mcp/src/context-packet/types.ts` — implementation ticket confirms).

**Current shape** (per the verified drift):

```typescript
open_obligations: Array<{
  id: string;
  type: string;            // misnamed (schema: obligation_kind)
  owner: string;           // absent from schema
  subjects: string[];      // absent from schema
  salience: number;        // absent from schema
  urgency: number;         // schema is enum: low | medium | high
  possible_payoff_modes?: string[];
  coverage_cache_compatible_storylets?: string[];
}>
```

**Corrected shape** (matches `OBL` schema at `story-record-schemas.md:448-464`):

```typescript
open_obligations: Array<{
  id: string;
  obligation_kind: string;                // OBL.obligation_kind
  description: string;                    // OBL.description
  owed_by: string;                        // OBL.owed_by (closed enum or entity ref per schema)
  owed_to: string;                        // OBL.owed_to (same)
  urgency: "low" | "medium" | "high";     // OBL.urgency (closed enum)
  trigger_to_close: string;               // OBL.trigger_to_close
  status: string;                         // OBL.status
}>
```

The `possible_payoff_modes` and `coverage_cache_compatible_storylets` derived fields are out of scope of the schema-fidelity fix; if either is in production use today, the implementation ticket preserves them as an additional optional layer derived from cross-record query, not as fabricated drift. If neither is referenced by any current consumer, the ticket removes them as dead drift.

**Cross-package impact**: the `ContextPacketStoryBundleContextSummary` partial at line 431-450 derives `open_obligation_ids` from `open_obligations.map((obligation) => obligation.id)` — id is preserved through the rename, so the summary is unaffected.

**Consumer audit**: the implementation ticket greps the repository for callers of the context-packet's `open_obligations` field and updates each to the corrected field names. Likely call sites: story-pipeline skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`) and any persisted-packet recovery surfaces (`tools/world-mcp/src/context-packet/` siblings). The drift's silent character means most consumers may already be tolerant of missing fields — the fix replaces silence with truth.

### B. Add MCP context-packet active-record summaries for `STINT`, `BEL`, `SREL`, `STSTAT`, `STLOC`, `STOBJ`, story-local `DA`

**Site**: `tools/world-mcp/src/context-packet/story-bundle-context.ts` — add seven new builder functions (one per class) modeled after `buildOpenObligations` / `buildActiveThreads` / `buildActiveClocks` (lines 197-264), wire into `buildStoryBundleContext` at line 455-486, and extend `ContextPacketStoryBundleContext` type accordingly.

Each new summary projects only the load-bearing-for-skill-retrieval subset of the record schema. Field-by-field load-bearing checks per FOUNDATIONS §Story Bundles §5b (each emitted field consumed by a known retrieval-surface consumer):

| New field | Projection shape | Consumers |
|---|---|---|
| `active_intentions` | `[{id, holder, intent, urgency, expires_when}]` | turn-cycle eligibility scoring; health-audit stale-intention detection; future STPLAN root-intention linking |
| `active_beliefs_by_holder` | `[{holder, beliefs: [{id, claim, belief_mode, truth_relation, confidence, visibility}]}]` grouped by `holder` | observer firewall; dramatic-irony queries; future STEMO appraisal-basis access |
| `active_relationships_by_participant` | `[{participants: [STENT, STENT], axes: [{axis, value}], status}]` | social-state firewall prefiltering; turn-cycle eligibility for `relationship_axis` predicates; future social-pressure packet |
| `active_statuses` | `[{entity, life, agency, location}]` | turn-cycle eligibility for `entity_status` predicates; health-audit life/agency consistency |
| `active_locations_in_scope` | `[{id, name, status, affordances: [{action_family, accessible_to}]}]` (in-scope = locations of any actor in `cast_bind_list` or any location referenced by an active record on this branch) | turn-cycle eligibility for `location` and `has_affordance` predicates |
| `active_objects_in_scope` | `[{id, name, location, accessible_to: [STENT]}]` (in-scope = same heuristic) | turn-cycle eligibility for `object_accessible` predicates |
| `active_story_diegetic_artifacts` | `[{id, name, kind, holders, location, accessible_to}]` (story-local DA only — world-level DA continues to route through `list_records(record_type='diegetic_artifact_record')`) | turn-cycle eligibility for `artifact_accessible` predicates; future dramatic-irony packet |

**Scope heuristic for `active_locations_in_scope` / `active_objects_in_scope`**: the proposal does not specify how "in scope" is bounded, and projecting every active location/object on every retrieval would defeat the context-packet's purpose. The implementation ticket adopts the heuristic: a record is in scope if it is referenced by any other active record on the current branch path (transitive over `location_of_entity` / `object_at_location` / similar edges once those edges land in Phase C). Until Phase C lands, the heuristic is purely id-list-based: in scope iff the id appears in any other active record's body. The heuristic is named explicitly in the new summary's JSDoc so consumers can verify what they receive.

**Token budget discipline**: each new summary is independently capped under the existing token-budget mechanism that governs `get_context_packet`. The summary-builder integration at `buildStoryBundleContext` continues to use whatever budget-management strategy is in place at line 455-486; per-field omission under pressure is the existing pattern.

**`ContextPacketStoryBundleContextSummary` extension**: the partial summary type at line 431-450 gains parallel `*_ids` lists (`active_intention_ids`, `active_belief_holders`, `active_relationship_participants`, `active_status_entities`, `active_location_ids`, `active_object_ids`, `active_story_da_ids`) so summary-level retrieval continues to give skills enough to pivot to targeted `get_record` calls when full bodies are wanted.

### C. Expand `STORY_EDGE_TYPES` and `edgesForStoryRecord` for currently-unindexed fields on existing record classes

**Site**: `tools/world-index/src/schema/types.ts:84-99` (`STORY_EDGE_TYPES` constant) and `tools/world-index/src/parse/atomic.ts:564-...` (`edgesForStoryRecord` switch).

**New edge types** (added to the existing 14, following SPEC-45's pattern):

| Edge type | Source field | Source class | Target class |
|---|---|---|---|
| `belief_holder` | `BEL.holder` | `BEL` | `STENT` |
| `belief_basis_event` | `BEL.basis.source_event` | `BEL` | `SE` |
| `belief_access_record` | `BEL.basis.access_records[]` | `BEL` | record (any) |
| `belief_opens` | `BEL.consequences.opens[]` | `BEL` | record (any) |
| `relationship_participant` | `SREL.participants[]` | `SREL` | `STENT` |
| `relationship_derived_from` | `SREL.derived_from[]` | `SREL` | record (any) |
| `intention_holder` | `STINT.holder` | `STINT` | `STENT` |
| `intention_supersedes` | `STINT.supersedes` | `STINT` | `STINT` |
| `status_entity` | `STSTAT.entity` | `STSTAT` | `STENT` |
| `clock_linked_record` | `CLK.linked_records[]` | `CLK` | record (any) |
| `clock_driver` | `CLK.driver` | `CLK` | `STENT` or null (group:/system/unknown drivers do not emit) |
| `clock_tick_event` | `CLK.tick_history[].event` | `CLK` | `SE` |
| `secret_truth_anchor` | `STSEC.truth_anchor` | `STSEC` | `SF` / `BEL` / `DA` (skip when null) |
| `secret_holder` | `STSEC.holders[]` | `STSEC` | `STENT` (skip `group:` and `narrator` entries — same exclusion pattern as `clock_driver`) |
| `secret_clue_carrier` | `STSEC.clue_carriers[].record` | `STSEC` | record (any per `clue_carriers[].kind`) |
| `secret_reveal_record` | `STSEC.reveal_records[]` | `STSEC` | `BEL` / `SF` / `DA` / `STQ` |
| `story_question_source` | `STQ.source_records[]` | `STQ` | record (any) |
| `story_question_payoff_of` | `STQ.payoff_of[]` | `STQ` | record (any) |
| `story_question_answer_record` | `STQ.answer_records[]` | `STQ` | record (any) |
| `event_actor` | `SE.actor` | `SE` | `STENT` |
| `event_target` | `SE.targets[]` | `SE` | record (any per `SE.targets[]`'s polymorphic shape) |
| `event_selected_storylet` | `SE.commitment.selected_slt_id` | `SE` | `SLT` (skip when null per audit-only `SE` events that omit commitment) |

**Total**: 22 new edges. Combined with the existing 14, `STORY_EDGE_TYPES.length` becomes 36.

**Group/system reference convention**: several source fields accept `group:<name>`, `system`, `unknown`, or `narrator` placeholder values alongside record-id values (`STSEC.holders[]`, `CLK.driver`). The convention adopted here, matching SPEC-45's `creation_evidence` handling of non-id evidence, is that the edge extractor emits an edge only when the field value resolves to a known node id; placeholder values are silently skipped. The semantic concept "this clock has no entity driver" is preserved on the record itself; the edge graph captures only record-to-record relations.

**Extractor implementation pattern**: follow SPEC-45 §Phase 1 step 3 (`edgesForStoryEvent`). Add per-class helpers (`edgesForStoryBelief`, `edgesForStoryRelationship`, `edgesForStoryIntention`, `edgesForStoryStatus`, `edgesForStoryClock`, `edgesForStorySecret`, `edgesForStoryQuestion`, plus extend `edgesForStoryEvent` for actor/target/selected_storylet). Wire each helper into the existing `edgesForStoryRecord` dispatch at `tools/world-index/src/parse/atomic.ts:564`. Each helper is independently testable.

**Tick-history granularity**: `CLK.tick_history[]` is a list of `{event, delta, cause}` entries. The `clock_tick_event` edge emits one row per `event` entry; `delta` and `cause` are not encoded as edge properties (they remain on the source record, retrievable via `get_record`). This matches the convention for `creation_evidence` (per SPEC-45): edges carry traversal data, not entry-level payload.

**Idempotent rebuild**: `world-index build` is fully deterministic; running on an existing world after this spec lands rebuilds the index with the new edges populated against the same atomic records. No bundle migration required.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Tooling Recommendation — "LLM agents should never operate on prose alone" | **aligns** | Phases A / B / C all extend the documented context-packet + targeted-retrieval surface to cover existing record classes whose state is currently invisible to that surface; the principle is preserved at the story-bundle scope by this spec, not weakened. |
| §Canonical Storage Layer | **aligns (N/A)** | No `_source/<class>/*.yaml` writes; this is a retrieval-layer spec. Hook 3 write-discipline is unaffected. |
| §Story Bundles §4a Plan-Authority Boundary | **aligns (N/A)** | No page-state mutation; no commitment-block authoring change; no prose-attach pathway change. |
| §Story Bundles §5a Commitment Blocks Are Causal Moves | **aligns (N/A)** | `SLT` schema is unchanged; no new predicates added (the closed DSL grows when STPLAN / STEMO land in their own specs). |
| §Story Bundles §5b Schema-Minimalism | **aligns** | The seven new MCP summary projections enumerate each field's named consumer in the per-class table in Phase B; fields without a named consumer are not projected. The 22 new edges each correspond directly to a schema field on an existing record class — no new field invention. |
| §Story Bundles §5c Present Causal State, Not Narrative Shape | **aligns** | This spec adds zero engine-state framing about narrative shape, dramatic arc, scene structure, act position, or pacing. All additions describe **present causal state** that already lives on the records — they just make it queryable / projectable. The deferred Priority 2 packets (present-causal-situation, dramatic-irony, reader-expectation, social-pressure, pressure-texture, branch-possibility-space) would each need their own §5c discipline statement and are explicitly not in this spec's scope. |
| §Story Bundles §6a Belief vs. Fact | **aligns** | Phase B's `active_beliefs_by_holder` projection preserves the `belief_mode` / `truth_relation` / `visibility` / `confidence` distinctions exactly as the §4.1 schema records them — no collapsing of belief into claim or truth. |
| §Story Bundles §6b Information / Observer Firewall | **aligns** | Phase B's projections expose the access-route fields (`BEL.basis.access_records`, `DA.accessible_to`, `STOBJ.accessible_to`, `STLOC.affordances[].accessible_to`) that the firewall already consumes at move-generation; making them queryable supports rather than weakens the firewall. |
| Rule 1 No Floating Facts | **aligns (N/A)** | Validator behavior unchanged; no canon-mutation surface. |
| Rule 4 No Globalization by Accident | **aligns** | World-index edge extraction respects existing bundle scoping (story-edges carry `story_slug`); no cross-bundle edge emission. |
| Rule 6 No Silent Retcons | **aligns** | Append-only record discipline unchanged. The `OBL` projection-fix in Phase A surfaces correct field names — it does not rewrite history; persisted records are unchanged. |

---

## Out of Scope

The following items from `reports/new-story-structures-proposal.md` are **explicitly out of scope** for SPEC-46 and routed as named below:

1. **`STPLAN` (actor-owned tactical plan record class)** — deferred to a follow-up spec. Requires its own §5b stress-test on proposed fields (`risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`) and §5c safeguard design (forbidding future PG ids, guaranteed-outcome framing, supersession-on-revision discipline). Depends on this spec's Phase B for actor-state retrieval and Phase C for plan-basis edge traversal.
2. **`STEMO` (actor-owned affective state record class)** — deferred to a follow-up spec. Schema is more defensible than STPLAN but depends on this spec's Phase B for belief / status retrieval.
3. **Present-causal-situation packet** (proposal §3, page-plan §8b) — deferred. Composes existing state but introduces a new page-plan section into the 19-section template.
4. **Reader-expectation / payoff packet** (proposal §4, page-plan §10c) — deferred. Same reasoning.
5. **Dramatic-irony packet** (proposal §5, page-plan §11b) — deferred. Composes existing state (BEL / STSEC / DA + visibility / firewall) but introduces a new page-plan section.
6. **Social-pressure packet** (proposal §6, page-plan §9d) — deferred. Sharpens existing SREL/BEL/OBL/CLK/group-STENT use; introduces a new page-plan section.
7. **Branch-possibility-space map** (proposal §7) — deferred. MCP/audit view; depends on this spec's Phase C edges to walk branch-leaf state cleanly.
8. **Pressure-texture page-plan note** (proposal §non-state-support, page-plan §17b) — deferred. Independent of this spec.
9. **`get_page_render_packet(story_slug, page_id)` mega-helper** — deferred. Single mega-packet aggregates five deferred packets above; better composed from targeted helpers once consumer needs are concrete.
10. **`SE.commitment.alias_bindings` "fix" to include CLK / STSEC / STQ** — **rejected outright**. Verified at `story-record-schemas.md:177-178` that `alias_bindings` is a free-form `<alias>: <record_id>` mapping with no class restriction; CLK / STSEC / STQ ids already work as alias targets. The proposal's claim is empirically false; no gap exists.
11. **`SE.record_introductions[]` structured replacement for intro tags** (proposal Priority 0 item 5) — deferred to its own brainstorm. Current intro-tag grammar (`story-state-contract.md` §5a, parser at `tools/validators/src/structural/midstory-introduction-utils.ts`) works; replacement is a structural migration with cross-skill prose churn, separable from this spec.
12. **Projection-completeness audits for `hidden_secrets` and `open_story_questions`** (proposal §MCP schema drift fixes, second and third bullets) — deferred to a focused audit ticket. This spec scopes the projection-drift fix to verified `OBL` drift only; the proposal's claims about `hidden_secrets` (clue-carrier visibility distinction missing) and `open_story_questions` (source / payoff / answer / progression metadata missing) require their own per-projection schema-vs-builder verification pass.
13. **Negative recommendations from the proposal** (`STNORM`, `STCLUE`, `SCENE`/`SCONF`, `STPROM`, `STREP`, `STRES`, `STTHEME`, `STMOTIF`, `STSUB`, `STARC`, act/midpoint/climax/beat-position records, global drama manager, quest journal record) — **agreed and rejected**, matching the proposal's own verdicts. These are not deferred; they are rejected on §5a / §5b / §5c grounds and recorded here for audit-trail completeness.

---

## Deliverables

Per-phase deliverables that will be decomposed into implementation tickets by a subsequent `spec-to-tickets` invocation:

### Phase A: `OBL` MCP projection drift fix

- D-A1: Update `ContextPacketStoryBundleContext["open_obligations"]` type definition to match the corrected shape (field-by-field per the Phase A table).
- D-A2: Update `buildOpenObligations` at `tools/world-mcp/src/context-packet/story-bundle-context.ts:197-211` to emit the corrected projection.
- D-A3: Consumer-audit sweep — grep for `open_obligations` field consumers (story-pipeline skills, persisted-packet recovery, any context-packet integration test) and update each to the corrected field names.
- D-A4: Add a regression test asserting that `buildOpenObligations` over a fixture `OBL` record emits exactly the schema-defined field set, with no fabricated fields and no missing required fields.

### Phase B: Seven new MCP active-record summaries

- D-B1: Extend `ContextPacketStoryBundleContext` type with the seven new optional summary fields (per the Phase B table).
- D-B2: Implement `buildActiveIntentions`, `buildActiveBeliefsByHolder`, `buildActiveRelationshipsByParticipant`, `buildActiveStatuses`, `buildActiveLocationsInScope`, `buildActiveObjectsInScope`, `buildActiveStoryDiegeticArtifacts` builders in `tools/world-mcp/src/context-packet/story-bundle-context.ts`, modeled after the existing builder pattern at lines 197-264.
- D-B3: Wire each new builder into `buildStoryBundleContext` at lines 455-486, with rows fetched via the same `rowsForNodeType` / equivalent retrieval used by existing builders.
- D-B4: Extend `ContextPacketStoryBundleContextSummary` at lines 431-450 with parallel `*_ids` / `*_holders` / `*_participants` / `*_entities` fields.
- D-B5: Document the `active_locations_in_scope` / `active_objects_in_scope` scope heuristic in JSDoc and (separately) in `docs/CONTEXT-PACKET-CONTRACT.md` under the `story_bundle_context` section.
- D-B6: Add per-summary fixture tests asserting field-set fidelity and scope-heuristic correctness.
- D-B7: Update `tools/world-mcp/src/tools/describe-capabilities.ts` (or equivalent capability-description surface) to enumerate the new summary fields.

### Phase C: World-index story edge extraction expansion

- D-C1: Extend `STORY_EDGE_TYPES` at `tools/world-index/src/schema/types.ts:84-99` with the 22 new edge type strings; assert `STORY_EDGE_TYPES.length === 36` in a registry-completeness test.
- D-C2: Implement per-class edge extractor helpers (`edgesForStoryBelief`, `edgesForStoryRelationship`, `edgesForStoryIntention`, `edgesForStoryStatus`, `edgesForStoryClock`, `edgesForStorySecret`, `edgesForStoryQuestion`) in `tools/world-index/src/parse/atomic.ts`, modeled after SPEC-45's `edgesForStoryEvent` at the lines around 645.
- D-C3: Extend the existing `edgesForStoryEvent` helper to emit `event_actor`, `event_target`, `event_selected_storylet` edges.
- D-C4: Wire each new per-class helper into `edgesForStoryRecord` at line 564.
- D-C5: Apply the group-/system-/narrator-placeholder skip convention uniformly across `STSEC.holders[]`, `CLK.driver`, and any other placeholder-tolerating field.
- D-C6: Add per-helper unit tests with one positive case (record with the field populated → edge emitted) and one negative case (record with the field empty or placeholder-valued → no edge emitted).
- D-C7: Update `docs/MACHINE-FACING-LAYER.md` story-edge enumeration to list the 22 new edge types and their semantic shapes.

### Cross-phase

- D-X1: `world-index build` regression run on a representative test world (the existing test fixture used by SPEC-45's regression tests is sufficient) — assert the new edges appear in the rebuilt index without rebuild errors and without disturbing existing edges.
- D-X2: Per-skill documentation review — `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout` SKILL.md retrieval-step prose should be reviewed for raw-file-read patterns that the new MCP summaries / index edges now obviate; update any such patterns to route through the new retrieval surface. Strictly opt-in per-skill (no skill prose is mandated to change in this spec).

---

## Risks & Open Questions

- **R-1: Consumer breakage from `OBL` projection rename.** Phase A renames `type` → `obligation_kind`, removes `owner` / `subjects` / numeric `salience`, narrows `urgency` to enum. Any consumer reading the drift-shaped projection breaks at update time. **Mitigation**: D-A3's audit sweep updates every in-repo consumer before the rename lands; the consumer-update commit precedes the projection-shape commit so each intermediate state remains consistent. Out-of-repo consumers (none expected at this stage of the pipeline) would receive a breaking change — accepted because the current projection is silently wrong and "preserve incorrect bytes" is not a viable contract.
- **R-2: Scope-heuristic accuracy for `active_locations_in_scope` / `active_objects_in_scope`.** The id-list-based heuristic ("in scope iff referenced by any other active record's body") may under-include (a location with no current actor reference but visible in the current `PG.state_snapshot.visible_affordances`) or over-include (a referenced-but-distant location that no actor can reach this turn). **Mitigation**: the JSDoc and `CONTEXT-PACKET-CONTRACT.md` both name the heuristic explicitly so consumers can verify; the heuristic upgrades when Phase C's location / object edges land (the implementation ticket may opportunistically tighten the heuristic in the same change, since both phases land in this spec). Refinement is a deliberate follow-up if the heuristic proves too lossy in practice.
- **R-3: `STSEC.holders[]` / `CLK.driver` placeholder semantics.** Skipping placeholder values from edge emission means downstream graph walks cannot distinguish "this secret is held by an entity not yet indexed" from "this secret is held by an abstract group". The information remains on the record body, retrievable via `get_record`. **Mitigation**: the convention is consistent with SPEC-45's `creation_evidence` handling and is documented in `MACHINE-FACING-LAYER.md` per D-C7. If a downstream consumer needs to walk-and-include placeholders, the edge-walk plus a record-body fetch is the documented path.
- **R-4: Token-budget pressure from seven new summaries.** Existing story-bundle context already projects 12 summaries; adding 7 more increases the per-packet token cost. **Mitigation**: per-field omission under budget pressure is the existing pattern; each new summary is independently omittable. Implementation tickets must verify that `get_context_packet` budget-management remains correct after the additions and that the summary-level fallback (`ContextPacketStoryBundleContextSummary`) covers each new full summary.
- **R-5: Scope creep into Priority 2 or Priority 1 during implementation.** Once Phase B's `active_beliefs_by_holder` / `active_relationships_by_participant` summaries land, the temptation to add a dramatic-irony or social-pressure packet "while we're at it" is high. **Mitigation**: this spec's Out of Scope section is binding; any in-scope-drift change requires its own spec, even if the implementation surface seems trivial. The discipline is precedent-established by SPEC-42's deferral of STPLAN despite touching SLT predicates.
- **R-6: Discovery of additional projection drift during D-A3's audit sweep.** The drift on `OBL` may have parallels on the other ten projection builders that this spec does not audit. **Mitigation**: if the audit sweep surfaces additional verified drift (not the proposal's unverified claims), the audit findings are captured in a follow-up ticket — they are not silently absorbed into this spec's scope.
- **Q-1: Does the existing context-packet retrieval pipeline already provide an extension hook for the new summaries, or does adding fields require a corresponding API-version bump?** Implementation ticket investigates the current `ContextPacketStoryBundleContext` versioning surface (if any) before adding the new optional fields.
- **Q-2: Are `possible_payoff_modes` / `coverage_cache_compatible_storylets` in production use today?** Implementation ticket greps for callers; if neither is referenced, they drop in Phase A; if either is referenced, the reference site is captured in the consumer-audit notes for a separate decision.

---

## Test Plan

- **T-1 (Phase A schema fidelity)**: Fixture-load five representative `OBL` records spanning the `obligation_kind` / `urgency` enum space; assert `buildOpenObligations` emits exactly `{id, obligation_kind, description, owed_by, owed_to, urgency, trigger_to_close, status}` per record with no fabricated keys and no missing required keys.
- **T-2 (Phase A consumer-audit regression)**: Add an integration test that loads a fixture world's full `story_bundle_context` via `mcp__worldloom__get_context_packet({task_type: 'page_authoring', seed_nodes: [...], story_slug: ...})` and asserts the corrected `open_obligations` shape end-to-end.
- **T-3 (Phase B summary completeness)**: Per new summary, fixture-load a representative record set, assert the projection field set matches the Phase B table, and assert the scope heuristic includes / excludes correctly for `active_locations_in_scope` / `active_objects_in_scope`.
- **T-4 (Phase B summary-fallback parity)**: Assert that for every new summary field, the corresponding `*_ids` entry in `ContextPacketStoryBundleContextSummary` enumerates exactly the ids of the records the summary projects (no orphans, no missing).
- **T-5 (Phase B per-field consumer-availability)**: For each new summary field's named consumer (per the Phase B table), add a smoke test that the consumer's existing retrieval pattern receives the new field shape and parses it without error.
- **T-6 (Phase C registry completeness)**: Assert `STORY_EDGE_TYPES.length === 36` and `new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length` (no duplicates).
- **T-7 (Phase C per-edge extraction)**: For each new edge type, a paired positive test (fixture record with the field populated → edge emitted with correct source/target/`edge_type`) and negative test (fixture record with the field empty or placeholder-valued → no edge emitted).
- **T-8 (Phase C end-to-end rebuild)**: Run `world-index build` on the SPEC-45 regression-test world fixture; assert the resulting `world.db` contains the 22 new edge rows where expected and zero new edge rows where the source fields are empty.
- **T-9 (cross-phase no-regression)**: Existing test suites for `world-mcp`, `world-index`, `patch-engine`, `validators`, and the seven story-pipeline skills pass unchanged after this spec's deliverables land.
- **T-10 (cross-phase FOUNDATIONS compliance)**: Lint pass over the new Phase B summary type asserting no field name carries narrative-shape framing (no `act_*`, `climax_*`, `beat_*`, `arc_*`, `expected_outcome_*`, `target_curve_*`); same lint over the new Phase C edge type names. Codifies §5c discipline structurally.
