# Phases 2-3: Commitment Block Selection and State Delta

## Phase 2: Select or JIT-create a commitment block

Selection rationale follows §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. The selected `SLT` is justified through the active current-state records that make it specific to this actor on this branch right now — `STPLAN` blockage, `STEMO` appraisal, `BEL` knowledge, `SREL` axis pressure, `OBL` / `CLK` / `STSEC` / `STQ` pressure, or `DA` / `STOBJ` / `STLOC` affordance. Where STCHAR appears in the rationale, it explains *why* the current-state record matters to this actor — not as a replacement for the current-state record. Branch-scoped SLTs with direct `record_active(STCHAR-<integer>)` predicates are the one lawful exception: there the STCHAR identity is the eligibility predicate itself.

Call `mcp__worldloom__select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature)` to obtain the projection-filtered shortlist (24 candidates by default, bounded by `max_candidates`) plus `filter_trace`. The MCP pipeline applies story scope, branch visibility, driver kind, optional action family, predicate shape/class, source-record-id, mystery-policy, cooldown, and salience/diversity filters against indexed projection columns. The shortlist's full bodies are retrieved deliberately through `mcp__worldloom__get_records(record_ids=requires_full_body_ids, story_slug=...)`; those full bodies plus `filter_trace` are the LLM-facing SLT-selection input. Do not scan or expose the entire author-pool `SLT` body set on the hot path.

Derive the MCP `intent_signature` before the call:

- For `driver.kind: player_action | player_write_in`, set `intent_signature.action_families` from the chosen `CHC.target_or_action_families`, set `intent_signature.grounding_record_ids` from `CHC.grounded_in.records`, and derive `intent_signature.grounding_record_classes` from those grounded record ids.
- For non-player drivers, `intent_signature` may be omitted when the selected `turn_driver.driver_records[]` already provides the source-record hints for projection filtering.

Evaluate the returned shortlist against the parent snapshot before final selection:

- All `preconditions.hard` predicates evaluate true (per shared contract §5 closed predicate DSL).
- Branch visibility and driver-kind compatibility have already been narrowed server-side; reject any shortlisted record whose full body contradicts the projection result rather than widening the pool locally.
- For action grounding, prefer `affordance_available_to(<actor>, <action_family>)`; `has_affordance(<action_family>)` is only an actor-agnostic author-pool prefilter when the actor is not yet bound.
- Resolve existential predicates from shared contract §5 (`any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`, `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`) against the parent snapshot for each shortlisted `SLT` before ranking. Each satisfied existential predicate binds its `alias` to the matched active record for this selection only. The match must satisfy every supplied filter (`kind`, `urgency`, role, axis/comparator/value, belief mode, truth relation, visibility, clock kind/salience, secret kind/salience, setup kind/salience, holder role, affect kind, or minimum intensity); if multiple records match, retain all bindings for ranking and choose the concrete binding with the selected block.
- Apply the Information / Observer Firewall before selecting the block: the proposed actor-binding and move may rely only on information available to the acting entity through active `BEL`, direct observation, accessible `DA` / `STOBJ` evidence, testimony, document access, inference, surveillance, institutional channel, magic/tech, or another recorded access route. If the block's target, precondition match, or planned beat depends on narrator-only knowledge or knowledge held only by another actor, the block is ineligible unless the plan records a valid access route for the acting entity and the supporting record ids that make the route auditable.
- Apply the Mystery Reserve firewall on the shortlisted full bodies. `select_storylet_candidates` only performs the coarse `mystery_policy.allowed_authority` pre-filter; Phase 2 still rejects forbidden resolutions and any block whose resolved action would launder narrator-only mystery knowledge into branch truth.
- Evaluate `record_age(<record_id | bound:<alias>>, comparator, pages)` by deriving the matched record's age from its `created_at_page` position in the parent page's `branch_path` through the evaluating page. Use it only as present causal state: pressure can mature because a record has remained open across pages, never because the story reached an act or dramatic timer.
- Re-check `saliency.cooldown_pages` after full-body retrieval by scanning prior pages in the active `PG.branch_path`, reading each page's resolved `SE.commitment.selected_slt_id`, and rejecting an `SLT` whose last firing is within its `saliency.cooldown_pages` window of the current page. `cooldown_pages: 0` means no cooldown rejection.
- `mystery_policy.allowed_authority` remains compatible with `outcome_route`.

Rank eligible blocks by: (1) `move_family` × `action_family` match; (2) `saliency.urgency` (high > medium > low); (3) coverage of `target_records`; (4) diversity (avoid repeating the most-recently-used `move_family` on this branch).

**Alias-binding resolution order**: bind first, select second, instantiate third. During eligibility, evaluate every hard precondition and build the candidate alias-binding set. During ranking/selection, choose one concrete binding set for the selected `SLT`. Before Phase 3 drafts the `SE.state_delta`, replace every `bound:<alias>` in the selected block's `effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects` with the bound record id from that chosen set. If any `bound:<alias>` lacks a same-`SLT` binding, the block is invalid and cannot be selected; do not defer alias resolution to prose planning or approval time.

If no eligible block exists, create one branch-scoped JIT block:

- `scope.visibility: branch_scoped`, `scope.branch_id: <active or new branch>`, `created_at_page: <new PG id>`, `provenance.origin: runtime_jit`.
- 1–5 beats authored from the action + current state.
- Predicates reference only records active in the parent snapshot. JIT blocks are branch-scoped, so use exact-ID predicates rather than the existential author-pool prefilters.
- `mystery_policy` honors the firewall.

Avoid pre-emptive JIT creation. If a flexible author-pool block fits with slight reframing, prefer that block. JIT blocks follow FOUNDATIONS §Story Bundles §5a (commitment blocks are causal moves, not dramatic acts or arcs) — no `arc_contract` / `dramatic_unit` / `execution_envelope` / `stop_policy` / shape discriminators.

### Phase 2.1: Driver-kind compatibility filter

When `SE.turn_driver.kind` is set on a `turn_resolution` event, `mcp__worldloom__select_storylet_candidates` applies the `SLT.grounding.compatible_turn_drivers[]` compatibility filter server-side as part of the projection query. The returned shortlist is already driver-kind-narrowed before local predicate eligibility checks, alias binding, ranking, or instantiation. This remains a local-salience-narrowing pass per FOUNDATIONS §Story Bundles §5c ("Driver salience is local"), and it composes with the shared hard gates in `_shared-templates/story-state-contract.md` §7 by running before those gates validate the narrowed eligible pool. FOUNDATIONS §Story Bundles §6b still applies locally: the MCP pre-filter never replaces the in-process Information / Observer Firewall or Mystery Reserve firewall on the shortlisted full bodies.

The compatible driver-kind vocabulary is the SPEC-76 `SE.turn_driver.kind` enum, in this exact order:

1. `player_action`
2. `player_write_in`
3. `npc_action`
4. `offstage_action`
5. `world_pressure`
6. `clock_fire`
7. `secret_reveal`
8. `multi_actor_collision`

A `runtime_jit`-origin SLT created during Phase 2 must declare `grounding.compatible_turn_drivers` as a singleton list containing the current `SE.turn_driver.kind`, for example `[npc_action]` when the selected driver is `npc_action`.

**Responsibility split with `slt_grounding_minimal_integrity` (SPEC-77 §3.4)**: the validator enforces singleton-length at storage time via the `slt_grounding_runtime_jit_driver_kind_singleton` code; a `runtime_jit` SLT with `compatible_turn_drivers.length > 1` fails the storage-time gate. The validator does not enforce singleton-value match, meaning it does not cross-check that the stored singleton equals the resolved `SE.turn_driver.kind` for the event that created the JIT. That match is enforced by this Phase 2.1 filter at selection time: a stored singleton-value mismatch makes the JIT ineligible because its `compatible_turn_drivers` does not contain the current driver kind. This split is intentional; Phase 2 creates the JIT from the resolved `SE.turn_driver.kind`, so a stored mismatch would indicate Phase 2 authoring drift, while a cross-record validator would over-couple SLT validation to SE/PG retrieval.

## Phase 3: Apply the state delta

Apply exactly one causal delta from parent snapshot. The delta may:

- Apply the mid-story introduction rule when the selected or
  JIT-created `SLT` makes that object true in this accepted event. After
  binding the `SLT`, ask whether the event creates a new `CLK`, `STSEC`,
  `STQ`, `THR`, `STENT`, `STCHAR`, `SREL`, `STPLAN`, or `STEMO` that is not
  reducible to an existing active record and that changes future eligibility,
  visibility, obligations, pressure, witness propagation, character authority,
  relationship constraints, affordances, plans, emotional pressure, or choice
  grounding. If yes, include the new id in `SE.state_delta.create[]`
  and include a matching `SE.record_introductions[]` entry
  `{record_id: <CLASS>-<N>, class: <CLASS>, trigger: <closed trigger>, evidence: [...], distinct_from: [...]}`
  per shared contract §5a.
- Prefer advancing, superseding, discovering, ticking, answering, revealing,
  changing status, or changing a relationship axis on an existing active record
  when the event is only a complication of that existing record. Fresh creation
  is reserved for genuinely new causal objects. Use
  `references/mid-story-record-introduction.md` as the per-class threshold
  authority.
- Honor the selected `SLT`'s instantiated effects: after Phase 2's bind-then-instantiate step, any former `bound:<alias>` targets are concrete record ids and must be treated like exact effect targets in `SE.state_delta`.
- Create new facts (`SF`) or beliefs (`BEL`).
- Supersede beliefs when truth-relation or visibility changes (every public discovery, betrayal, lie, or confession produces at least one `BEL` create or supersession in this phase or Phase 4 per FOUNDATIONS §6a).
- Change entity status (life / agency / location) via `STSTAT` supersession — death, incapacity, absence, injury, capture, escape are first-class.
- Update intentions (`STINT` supersession).
- Update relationships (`SREL` supersession).
- Open / close / escalate obligations (`OBL` supersession or new), always setting `urgency` on the emitted record.
- Create consequences (`CNSQ` new), always setting `urgency` on the emitted record.
- Advance or close threads (`THR` supersession).
- Move entities or objects (`STSTAT.location` supersession for entity movement; `STOBJ` supersession for object movement).
- Create or alter story-local artifacts (`DA` new, supersession, or
  derivation).
- Mark the branch terminal (set `PG-<integer>.state_snapshot.continuation.terminal_status: terminal_closed` with `terminal_rationale`).

Supersession is file-level append-only per shared contract §3 — a new record file (e.g., a new `SREL-<integer>.yaml` or `STSTAT-<integer>.yaml`) carries `supersedes: <prior-id>` in its YAML body. The existing `create_*_record` patch ops handle this.

**DA creation / supersession / derivation triage.** Before finalizing
`SE.state_delta`, scan the selected choice / write-in / event effects for
written, found, read, posted, forged, translated, copied, redacted, damaged,
broadcast, suppressed, or destroyed communicative artifacts. Apply the triage
rubric and decision matrix at
`.claude/skills/_shared-templates/da-authoring-reference.md` §Triage and
§Decision matrix to decide whether the turn should create a new DA, supersede
an existing DA, create a derived DA (`derived_from: [DA-*]`), or modify only
`BEL` / `SF` / `STOBJ`. Satisfy the patch obligations at
`.claude/skills/_shared-templates/da-authoring-reference.md` §Patch
obligations for every DA created or superseded.

For every life / agency / location change, supersede the affected entity's active `STSTAT` record and include both the superseded id and the new `STSTAT` id in `SE.state_delta` (`supersede` and `create`, respectively). Do not encode those status changes by superseding `STENT`; `STENT` remains stable identity / role metadata. Recompute `PG.state_snapshot.entity_status` from the resulting active `STSTAT` set.

**Deaths and removals are first-class outcomes.** Do not protect "main characters" with out-of-world logic. When an entity dies, becomes incapacitated, or becomes unavailable, reconcile in the same delta:

- Their open `STINT` records — close each in `SE.state_delta.close`; for an intention transferred to another holder, create a replacement `STINT` with the new `holder` and `supersedes` linking the closed/replaced intention. `STINT` has no `status` or `derived_from` field.
- `OBL` owed by or to them (supersede or close).
- Affected `SREL` records — supersede by changing `axis` / `direction` / `value` / `valence` / `description` as the death/incapacity warrants. `SREL` has no `status` field. `SREL.direction` uses shared contract §4.5.7's structured form: `kind: directed` requires non-null `from` and `to` STENT ids, while `kind: bidirectional` requires `from: null` and `to: null`.

```yaml
direction:
  kind: directed
  from: STENT-1
  to: STENT-2

direction:
  kind: bidirectional
  from: null
  to: null
```
- Witness `BEL` records (Phase 4 covers).
- Affected `STOBJ` records — supersede `owner` and/or `current_location` when death, capture, incapacity, or transfer changes custody. Do not use any separate control/custody field.
- Future choice availability (Phase 9 gate 7 filters).
