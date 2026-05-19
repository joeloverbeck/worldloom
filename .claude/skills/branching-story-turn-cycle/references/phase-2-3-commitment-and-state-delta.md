# Phases 2-3: Commitment Block Selection and State Delta

## Phase 2: Select or JIT-create a commitment block

Filter the bundle's `SLT` records for eligibility against the parent snapshot:

- All `preconditions.hard` predicates evaluate true (per shared contract §5 closed predicate DSL).
- `scope.visibility: global_author_pool` blocks are universally eligible (subject to predicates); `scope.visibility: branch_prefix_scoped` blocks are eligible when `scope.branch_id` is in the active branch's lineage; `scope.visibility: branch_scoped` blocks are eligible only when `scope.branch_id` matches the active or new branch.
- For action grounding, prefer `affordance_available_to(<actor>, <action_family>)`; `has_affordance(<action_family>)` is only an actor-agnostic author-pool prefilter when the actor is not yet bound.
- Resolve the existential predicates (`any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`) against the parent snapshot before ranking. Each satisfied existential predicate binds its `alias` to the matched active record for this selection only. The match must satisfy every supplied filter (`kind`, `urgency`, role, axis/comparator/value, belief mode, truth relation, or visibility); if multiple records match, retain all bindings for ranking and choose the concrete binding with the selected block.
- Apply the Information / Observer Firewall before selecting the block: the proposed actor-binding and move may rely only on information available to the acting entity through active `BEL`, direct observation, accessible `DA` / `STOBJ` evidence, testimony, document access, inference, surveillance, institutional channel, magic/tech, or another recorded access route. If the block's target, precondition match, or planned beat depends on narrator-only knowledge or knowledge held only by another actor, the block is ineligible unless the plan records a valid access route for the acting entity and the supporting record ids that make the route auditable.
- Evaluate `record_age(<record_id | bound:<alias>>, comparator, pages)` by deriving the matched record's age from its `created_at_page` position in the parent page's `branch_path` through the evaluating page. Use it only as present causal state: pressure can mature because a record has remained open across pages, never because the story reached an act or dramatic timer.
- Enforce `saliency.cooldown_pages`: scan prior pages in the active `PG.branch_path`, read each page's resolved `SE.commitment.selected_slt_id`, and reject an `SLT` whose last firing is within its `saliency.cooldown_pages` window of the current page. `cooldown_pages: 0` means no cooldown rejection.
- `mystery_policy.forbidden_resolutions` does not include any mystery the resolved action would resolve.
- `mystery_policy.allowed_authority` is compatible with `outcome_route`.

Rank eligible blocks by: (1) `move_family` × `action_family` match; (2) `saliency.urgency` (high > medium > low); (3) coverage of `target_records`; (4) diversity (avoid repeating the most-recently-used `move_family` on this branch).

**Alias-binding resolution order**: bind first, select second, instantiate third. During eligibility, evaluate every hard precondition and build the candidate alias-binding set. During ranking/selection, choose one concrete binding set for the selected `SLT`. Before Phase 3 drafts the `SE.state_delta`, replace every `bound:<alias>` in the selected block's `effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects` with the bound record id from that chosen set. If any `bound:<alias>` lacks a same-`SLT` binding, the block is invalid and cannot be selected; do not defer alias resolution to prose planning or approval time.

If no eligible block exists, create one branch-scoped JIT block:

- `scope.visibility: branch_scoped`, `scope.branch_id: <active or new branch>`, `created_at_page: <new PG id>`, `provenance.origin: runtime_jit`.
- 1–5 beats authored from the action + current state.
- Predicates reference only records active in the parent snapshot. JIT blocks are branch-scoped, so use exact-ID predicates rather than the existential author-pool prefilters.
- `mystery_policy` honors the firewall.

Avoid pre-emptive JIT creation. If a flexible author-pool block fits with slight reframing, prefer that block. JIT blocks follow FOUNDATIONS §Story Bundles §5a (commitment blocks are causal moves, not dramatic acts or arcs) — no `arc_contract` / `dramatic_unit` / `execution_envelope` / `stop_policy` / shape discriminators.

## Phase 3: Apply the state delta

Apply exactly one causal delta from parent snapshot. The delta may:

- Apply the mid-story introduction rule when the selected or
  JIT-created `SLT` makes that object true in this accepted event. After
  binding the `SLT`, ask whether the event creates a new `CLK`, `STSEC`,
  `STQ`, `THR`, `STENT`, or `SREL` that is not reducible to an existing active
  record and that changes future eligibility, visibility, obligations,
  pressure, witness propagation, relationship constraints, affordances, or
  choice grounding. If yes, include the new id in `SE.state_delta.create[]`
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
