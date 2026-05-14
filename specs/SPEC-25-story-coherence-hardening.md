<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-25: Story Coherence Hardening — Replayable Status, Authority, Debt Salience, and Reusable Predicates

**Status**: DRAFT
**Supersedes**: nothing. Additive hardening of the SPEC-23 / SPEC-24 story-state contract.
**Source**: triage of `reports/story-related-upgrades.md` (ChatGPT-Pro external review), reassessed against the landed story pipeline.

**Implementation note (2026-05-14)**: SPEC25STOCOHHAR-001 landed the `STSTAT` machine layer. SPEC25STOCOHHAR-002 landed the D1 validator/contract replay slice: `PG.state_snapshot.active_records` includes `STSTAT`, `entity_status` is replay-checked as a projection from active `STSTAT`, and the closed predicate DSL uses `entity_status(..., field, value)`. SPEC25STOCOHHAR-003 landed the D1 story-pipeline skill emission/consumption slice: bootstrap emits initial `STSTAT` records, turn-cycle supersedes `STSTAT` on status changes, health-audit replay reads the `STSTAT` projection, and prose-attach checks the `STSTAT`-derived `entity_status` projection. SPEC25STOCOHHAR-004 landed D2: `SF.authority` is required in the shared contract and JSON Schema, the validators include a `story_fact_authority` structural check for `canon_linked` CF backing, and the story-pipeline skills now write/read the four-value `SF.authority` enum. SPEC25STOCOHHAR-005 landed D3: `OBL` and `CNSQ` now require `urgency: low | medium | high` in the shared contract and JSON Schemas; validators reject missing/out-of-enum urgency values; bootstrap/turn-cycle emitters, health-audit Gate 6 debt checks, page-plan §10 prose guidance, and commitment-block authoring prose read the field as the uniform debt-salience surface. SPEC25STOCOHHAR-006 landed the D4 grammar/schema/validator slice: the closed DSL now includes the six actor-unbound `any_*` predicates, `bound:<alias>` references are schema-valid for storylet effects/likely effects, and `storylet_predicate_dsl_parsability` validates alias binding plus author-pool / branch-prefix scope restrictions. SPEC25STOCOHHAR-007 landed D4 skill integration for `commitment-block-authoring`, `branching-story-turn-cycle`, and `branching-story-health-audit`; SPEC25STOCOHHAR-011 landed D4 bootstrap seed-block integration in `branching-story-bootstrap`. SPEC25STOCOHHAR-008 landed D5: `CHC.grounded_in` is required in the shared contract and JSON Schema; `recursive_reference_closure` now enforces choice grounding against the emitting page's active records and visible-affordance ordinals; bootstrap/turn-cycle emitters and health-audit prose read the field as the gate-7 grounding surface.

## Problem Statement

The story-skill family was recently rebuilt as a branching causal state machine — no act structure, internally coherent under any player choice — with all structural schemas explicitly declared in `.claude/skills/_shared-templates/story-state-contract.md` and enforced by the MCP retrieval surface and the `tools/validators/` JSON schemas (SPEC-23, SPEC-24). There are **zero production story bundles**, so every change here is a pure greenfield schema edit with no migration or retrofit cost.

`reports/story-related-upgrades.md` proposes 13 changes across three priority tiers. That report was produced from `FOUNDATIONS.md` + the story-state contract + the *initial brainstorming docs* — not the *landed skills*. Reassessment against the actual codebase recalibrates it sharply:

- **Its self-declared highest-priority fix (P0 #1, schema-drift cleanup) is moot.** All nine sub-claims (padded IDs, `SLT.purpose`, `author_pool`, stale action families, `plan.path`, `exit_options[].intent`, singular `target_or_action_family`, invalid `BEL.confidence` values, prose-receipt §-reference) verify clean against the landed skills, and the validators already reject legacy fields via `additionalProperties: false` plus explicit tests (`tools/validators/tests/structural/record-schema-compliance-arc.test.ts`).
- **Two of its five P0 items target problems the landed skills already solved deliberately.** `story-promotion-closeout` explicitly keeps canon links in its markdown ledger rather than spreading verdict fields across record schemas (P0 #4 / `SCX`), and branch status is cross-branch meta-hygiene the ledger + `INDEX.md` already handle (P0 #5 / `BRSTAT`).
- **What survives scrutiny is a smaller set of genuine structural gaps**, each confirmed against actual code: five accepted hardening changes plus one skill-text cleanup and a FOUNDATIONS reconciliation.

The five accepted gaps each break, or fail to enforce, an invariant the architecture depends on:

1. **`entity_status` is not replayable.** `tools/validators/src/structural/snapshot-replay-equality.ts:181-183` states in its own comment that `entity_status` is *"not reconstructible from state_delta alone and intentionally not compared here."* `SE.state_delta` carries only record-ID lists; `entity_status` (life / agency / location) has no record backing it. A death, captivity, or movement can silently fail to propagate across a page boundary or a fork, and no validator catches it. The new `state_delta` schema regressed from the legacy `cast_change` op, which carried entity-status payloads.
2. **`SF.authority` was read but did not exist at intake.** Landed `story-fact-promotion-to-canon` Phase 3.1 and Phase 4.3 branch on `SF.authority == branch_local_counterfactual`; SPEC25STOCOHHAR-004 has now added that field to the contract and schema. The original gap was that the promotion pipeline's scope-inflation cap and mystery-firewall counterfactual check were aspirational without a schema-backed field.
3. **Gate 6 cannot evaluate debt salience uniformly.** Gate 6 (terminal proof) reasons about *"high-salience debts."* Debts are open `OBL` / `CNSQ` / `THR`. `THR` has `urgency`, `SLT` has `saliency.urgency`, `STINT` has `urgency` — but `OBL` and `CNSQ` do not.
4. **Global author-pool storylets are structurally shallow.** The contract designed `has_affordance` as the one actor-unbound author-pool-prefilter predicate; every other predicate in the closed DSL is exact-ID. Gate 4 / Rule 4 forbid global-author-pool blocks from referencing branch-local IDs. So global pool blocks can prefilter only on affordances — not on the social state (`OBL` / `CNSQ` / `THR` / `SREL` / `BEL` / `STINT`) the architecture makes first-class. `commitment-block-authoring`'s `direct_batch` mode and `branching-story-bootstrap`'s global seed blocks are shallow by construction.
5. **Gate 7 cannot enforce CHC grounding.** Gate 7 (plan grounding) requires *"every CHC emitted by this page is grounded."* `CHC` has no grounding field; gate 7 can only weakly infer grounding by matching `target_or_action_families` against affordance action-families, missing grounding in non-affordance state (an `OBL`, a `BEL`, a `SREL`).

### Key design decisions

- **Considered extending `STENT` with life / agency / location fields; chose a new `STSTAT` record class** because `STENT` is stable identity (`display_name` / `bound_char_id` / `role_in_story`) — co-locating frequently-changing location state would churn the identity record on every move, whereas `STSTAT` carries clean `derived_from: [SE]` causal chaining and makes `entity_status` a derived projection symmetric with `active_records`.
- **Considered ChatGPT-Pro's `SCX` crosslink record and `BRSTAT` branch-status record; rejected both** because the landed `story-promotion-closeout` skill deliberately keeps canon links in its markdown ledger, and `SF.authority` (D2) plus the existing `SF.derived_from` (which already accepts `CF-<integer>`) make a promoted fact self-honest. A new record class for machine-queryable crosslinks is audit convenience, not coherence.
- **Considered ChatGPT-Pro's "require `derived_from` / `basis` on all state records" causal-support validator; rejected** because `snapshot_replay_equality` already enforces `SE`-delta causal linkage for the record-based snapshot, and those fields are deliberately optional (a net-new originating `SF` legitimately has empty `derived_from`) — the only un-replayed snapshot field is `entity_status`, which D1 fixes.
- **Considered ChatGPT-Pro's `urgency` + `tags` pair on `OBL` / `CNSQ`; chose `urgency` only** because `obligation_kind` / `consequence_kind` are already open-vocabulary categorizers and `tags` would duplicate them.
- **Considered the full 7-predicate DSL v2 (including `any_accessible_object`); chose 6, deferring `any_accessible_object`** because `STOBJ` access overlaps `has_affordance` grounding, while `OBL` / `CNSQ` / `THR` / `SREL` / `BEL` / `STINT` are the first-class social state with no actor-unbound predicate today.

## Approach

Six implementation deliverables (D1–D6) plus one FOUNDATIONS reconciliation (D7). D1–D5 are the accepted hardening changes; D6 is a skill-text cleanup found during exploration; D7 propagates the schema additions and a pre-existing doc-drift fix into `docs/FOUNDATIONS.md`.

Per the user's standing directive, every accepted change carries its non-negotiable updates to **(a)** the story-state contract, **(b)** the MCP / patch-engine / allocator surface, and **(c)** the validator JSON schemas and structural / rule logic — plus the consuming story-pipeline skills. The deliverables below enumerate each surface explicitly.

The seven story-pipeline skills in scope: `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`.

Recommended implementation order: **D1 → D2 → D3 → D5 → D4 → D6 → D7**. D1 is the largest single change (new record class touching every machine surface) and unblocks the replay validator; D4 (predicate DSL v2 with binding) is the most novel and benefits from D3 (`OBL` / `CNSQ` `urgency`) landing first so the existential predicates can filter on it; D7 lands last so it reconciles the final contract state.

## Deliverables

### D1 — `STSTAT`: replayable entity status

A new story-bundle record class carrying each active entity's life / agency / location, so `entity_status` becomes a derived projection that `snapshot_replay_equality` can verify.

**Contract** (`.claude/skills/_shared-templates/story-state-contract.md`):
- New §4.5.13 `STSTAT` schema:
  ```yaml
  id: STSTAT-<integer>*
  story_id: STORY-<integer>*
  created_at_page: PG-<integer>*
  supersedes: STSTAT-<integer> | null            # default null
  entity: STENT-<integer>*
  life: alive | dead | unknown*
  agency: free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown*
  location: STLOC-<integer> | unknown | concealed | offstage*
  derived_from: [SE-<integer> | <record_id>]     # default []
  ```
- §3 record-class inventory table: add `STSTAT` (the inventory becomes 17 core/auxiliary story-bundle classes); update the §4 preamble count.
- §4.2 `PG.state_snapshot`: add `STSTAT` to `active_records`; redefine `entity_status` as a **derived projection** of active `STSTAT` records (one entry per active `STENT`, computed from that entity's current `STSTAT`), not an independently-authored block.
- §5 closed predicate DSL: `entity_status(STENT-<integer>, field, value)` now resolves against active `STSTAT` records. Reconcile the predicate's argument name — the grammar uses `axis`, the contract prose uses `field`; pick one (`field` recommended, matching the contract) and align both.

**MCP / patch-engine / allocator**:
- New `tools/validators/src/schemas/story-status.schema.json` (JSON Schema 2020-12, `additionalProperties: false`, mirroring the §4.5.13 field list).
- `tools/world-mcp/src/tools/get-record-schema.ts`: map the new schema file to a `story_status_record` node-type constant.
- `mcp__worldloom__allocate_next_id`: register `STSTAT` as a story-bundle-scoped id class.
- `tools/patch-engine/src/envelope/schema.ts`: add `create_ststat_record` to the operation-kind enum (alongside the other `create_*_record` story ops) and to the `OperationBase` union with `StoryRecordPayload`.
- `tools/patch-engine/src/ops/create-story-record.ts`: register `create_ststat_record` with allocation key `ststat_ids`, the `^STSTAT-[0-9]+$` ID pattern, node type `story_status_record`, and source directory `status` (records land at `_source/status/STSTAT-<integer>.yaml`).
- `mcp__worldloom__describe_envelope_schema`: surface the new op's payload shape.

**Validator**:
- `tools/validators/src/_helpers/state-snapshot-replay.ts`: add `STSTAT` to `ACTIVE_RECORDS_CLASSES`.
- `tools/validators/src/structural/snapshot-replay-equality.ts` `runNewSchemaReplay`: derive expected `entity_status` from the replayed active `STSTAT` set and compare it against the page's `entity_status` block — removing `entity_status` from the "intentionally not compared" exclusion. `visible_affordances` / `unresolved_mystery_claims` / `continuation` remain genuinely page-local and stay excluded.
- `record_schema_compliance` picks up the new schema automatically.

**Skills**:
- `branching-story-bootstrap`: when building `PG-1`, emit one `STSTAT` per active `STENT` and include them in `active_records` + `SE.state_delta.create`.
- `branching-story-turn-cycle`: on death / captivity / incapacity / unconsciousness / escape / concealment / movement, supersede the affected `STSTAT` and include the ids in `SE.state_delta`; `entity_status` is no longer authored directly.
- `branching-story-health-audit`: replay now covers `entity_status`; the structural sub-phase relies on the strengthened `snapshot_replay_equality`.
- `branching-story-prose-attach`: the `entity_status_consistency` receipt check reads the `STSTAT`-derived projection.

### D2 — `SF.authority`

Add the authority field the promotion pipeline already reads.

**Contract**: §4.5.3 `SF` schema gains `authority: branch_local | branch_local_counterfactual | canon_candidate | canon_linked*` (required; default `branch_local`). Document that on canon acceptance the CF link rides the existing `SF.derived_from` (which already accepts `CF-<integer>`), consistent with `story-promotion-closeout` Phase 2 — no separate canon-link field is added.

**MCP / schema**: `tools/validators/src/schemas/story-fact.schema.json` — add `authority` with the four-value enum to `properties` and to `required`.

**Validator**: `record_schema_compliance` enforces shape automatically. Optionally add a structural check that an `SF` with `authority: canon_linked` carries at least one `CF-<integer>` in `derived_from`.

**Skills**:
- `branching-story-bootstrap` + `branching-story-turn-cycle`: set `authority` on every `SF` creation (`branch_local` by default; `branch_local_counterfactual` for deliberate canon contradictions; `canon_candidate` when paired with `SE.promotion_claims`).
- `story-fact-promotion-to-canon`: Phase 3.1 / Phase 4.3 now read a schema-backed field — verify the skill text matches the four-value enum.
- `story-promotion-closeout`: Phase 2 `accepted` supersedes the source `SF` with `authority: canon_linked` and the parent CF id in `derived_from` — this is now schema-backed rather than aspirational.

### D3 — `urgency` on `OBL` and `CNSQ`

**Contract**: §4.5.4 `OBL` and §4.5.5 `CNSQ` each gain `urgency: low | medium | high*` (required). `tags` is **not** added — `obligation_kind` / `consequence_kind` already serve categorization.

**MCP / schema**: `story-obligation.schema.json` and `story-consequence.schema.json` — add `urgency` to `properties` and `required`.

**Skills**:
- `branching-story-bootstrap` + `branching-story-turn-cycle`: set `urgency` on every `OBL` / `CNSQ` creation.
- `branching-story-health-audit`: gate 6 / debt-threshold checks now read `OBL` / `CNSQ` `urgency` uniformly with `THR.urgency`.
- `commitment-block-authoring`: the D4 existential predicates can filter on `urgency`.
- Page-plan §10 (open obligations / consequences / threads): debt rendering may surface `urgency`.

### D4 — Predicate DSL v2: existential social-state predicates with binding

Add six actor-unbound existential predicates so global-author-pool storylets can prefilter on first-class social state without referencing branch-local IDs, plus alias binding so `SLT.effects` can target what a precondition matched.

**Contract** (§5 closed predicate DSL):
- Add six predicates: `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)`, `any_consequence_pending(alias, kind?, urgency?, derived_from?)`, `any_thread_active(alias, tag?, urgency?)`, `any_relationship_axis(alias, axis, comparator, value, participant_role?)`, `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)`, `any_intention(alias, holder_role?, urgency?)`. Role arguments reference `STENT.role_in_story` values (§4.4b).
- Define alias binding: an existential predicate binds `alias` to the matched record; `SLT.effects.{create|supersede|close}` and `exit_options[].likely_effects` may reference `bound:<alias>`.
- These predicates are valid for `global_author_pool` and `branch_prefix_scoped` scopes (actor-unbound prefiltering); branch-execution eligibility still uses exact-ID predicates where an actor is bound.

**MCP / schema**:
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`: add the six predicates to `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS`.
- `tools/validators/src/schemas/story-storylet.schema.json`: `effects.{create|supersede|close}` items may be a `bound:<alias>` token in addition to a record id.
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`: parse and validate the new predicates and the `bound:<alias>` effect references; verify every `bound:<alias>` in `effects` resolves to an alias bound by a `preconditions` predicate.

**Skills**:
- `commitment-block-authoring`: `direct_batch` mode authors global-pool blocks with existential predicates against the 11 causal-function coverage targets; `audit_repair` mode likewise.
- `branching-story-turn-cycle`: `SLT` eligibility resolves existential predicates against current branch state, binds aliases, and instantiates `effects` from bound aliases at block selection.
- `branching-story-health-audit`: unactionable-debt / plan-grounding checks account for binding-predicate storylets.

### D5 — `CHC.grounded_in`

Make gate 7's CHC-grounding requirement enforceable with an explicit grounding field.

**Contract**: §4.5.12 `CHC` schema gains:
```yaml
grounded_in:
  records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | BEL-<integer> | OBL-<integer> | CNSQ-<integer> | THR-<integer> | SREL-<integer> | DA-<integer>]*
  affordance_ordinals: [integer]                 # PG.state_snapshot.visible_affordances[].ordinal
```

**MCP / schema**: `story-choice.schema.json` — add the `grounded_in` object (`records` required, `affordance_ordinals` optional).

**Validator**: add a structural check (gate-7 / plan-grounding home) that every `CHC.grounded_in.records` entry resolves to a record active in the emitting page's `state_snapshot.active_records`, and every `affordance_ordinals` entry resolves to a `visible_affordances[].ordinal` on that page. The implementer must locate gate 7's validator home — it may currently be skill-side only; candidate hosts are `recursive-reference-closure.ts` or a new structural validator.

**Skills**:
- `branching-story-bootstrap`: `PG-1` first-choice generation populates `grounded_in`.
- `branching-story-turn-cycle`: choice generation populates `grounded_in`.
- `branching-story-health-audit`: dangling-choice checks read `grounded_in`.

### D6 — `story-promotion-closeout` BR-supersession cleanup

`story-promotion-closeout` SKILL.md references "supersede a `BR`" in Phase 2 branch-handling (the `flag` and `archive` bullets), lists `BR-<integer>` (supersession) in its Output table, and lists `create_br_record` for branch supersession in Phase 5. But `BR`'s schema (§4.5.11) has **no `supersedes` field** and the contract states *"Branches fork; they do not supersede."* This is dead / impossible logic.

**Skill**: strike the BR-supersession path from `story-promotion-closeout` SKILL.md — Phase 2 `flag` / `archive` bullets, the Output-table `BR` row, and the Phase 5 op list. Branch disposition is ledger / `INDEX.md`-only, which the skill already supports ("otherwise branch disposition is ledger/INDEX-only"). No schema, MCP, or validator change.

### D7 — `docs/FOUNDATIONS.md` amendments

**§6 Story-Bundle ID Classes**: add `STSTAT` to the per-bundle records list ("Per-bundle records include STENT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, … and STSTAT").

**§5 / §5b Validation Rules + Schema-Minimalism At Story Scope**: §5 enumerates examples of Rule-1-required story-bundle schema fields — extend the examples to reflect the new load-bearing fields (`STSTAT` life/agency/location, `SF.authority`, `OBL`/`CNSQ` `urgency`, `CHC.grounded_in`, the DSL v2 predicates). §5b's schema-minimalism gate is satisfied by this spec's Deliverables, each of which justifies its field as load-bearing; no §5b text change is required beyond confirming the contract remains the authoritative schema source.

**§9 Prose Length Discipline At Story Scope (C2 — pre-existing doc-drift)**: §9 still references `arc.beat_plan.min_beats`, `max_beats`, and `STORY_KERNEL.cadence_policy.max_arcs_without_menu_soft` / `max_arcs_without_player_commitment_soft` — residue from the archived SPEC-19/20 scene-commitment-arc era. The landed contract §4.4 `SLT` schema has a flat `beats: 1-5` list and no `arc` field. Reconcile §9's structural-pacing references against the landed contract. The implementer **must verify the current `STORY_KERNEL.md` template's actual `cadence_policy` field set** before rewording — this spec prescribes the reconciliation, not specific replacement text.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 1 (No Floating Facts) | aligns | D1 / D2 / D3 / D5 are all Rule-1 grounding fields; D5 specifically makes gate 7's CHC-grounding requirement structurally enforceable rather than weakly inferred. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | Every new field is justified load-bearing in its Deliverable; D3 explicitly drops the non-load-bearing `tags`; the eight rejected report items are kept out of scope. |
| §Story Bundles §4a (Plan-Authority Boundary) | aligns | `STSTAT` is page-snapshot state; the page snapshot remains the fork primitive, and replay from any committed page is *strengthened* (entity_status becomes replay-checked). |
| Rule 4 (No Globalization by Accident) | aligns | D4's existential predicates are actor-unbound and reference no branch-local IDs, so global-author-pool blocks stay branch-isolated per gate 4 / §5 branch-isolation. |
| §Story Bundles §5 (Validation Rules At Story Scope) | aligns | D2's `SF.authority` makes the `apparent` / `branch_local_counterfactual` / `canon_candidate` / `canon_linked` discipline schema-backed — the promotion pipeline already assumes it. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | aligns | D4 adds causal-state predicates, not arc / plot-rail structure; the rejected act-structure and drama-search items are explicitly out of scope. |

## Verification

- **Contract self-consistency**: every new / changed field in `story-state-contract.md` §3–§5 is reflected in the corresponding `tools/validators/src/schemas/story-*.schema.json` file and vice versa; `record_schema_compliance` round-trips a valid record of each amended class.
- **D1 replay**: a constructed two-page fixture where an entity dies on the parent page replays correctly — `snapshot_replay_equality` now *fails* a child page whose `entity_status` does not match the `STSTAT`-derived projection, and *passes* a correct one. The legacy-schema replay path (pre-`input.resolved_event_id` pages) is untouched.
- **D2**: `story-fact-promotion-to-canon` Phase 3.1 / 4.3 logic exercises a real schema field; a `branch_local_counterfactual` `SF` is correctly capped at `contested_canon`.
- **D3**: a terminal-proof (gate 6) fixture distinguishes a `high`-urgency open `OBL` from a `low`-urgency one.
- **D4**: `rule_storylet_predicate_dsl_parsability` accepts a global-pool `SLT` using `any_obligation_open` + `bound:<alias>` effects, and rejects a `bound:<alias>` effect with no binding precondition.
- **D5**: the new structural check fails a `CHC` whose `grounded_in.records` cites a record absent from the emitting page's `active_records`.
- **D6**: `story-promotion-closeout` SKILL.md contains no remaining "supersede a `BR`" reference; a cross-skill grep for `create_br_record` in closeout returns clean.
- **D7**: `FOUNDATIONS.md` §6 lists `STSTAT`; §9 contains no `arc.beat_plan` reference.
- **Cross-skill sweep**: after all deliverables, grep the seven story-pipeline skills + the contract + the validator package for the old `entity_status`-as-authored-block assumption and any stale schema vocabulary.

## Out of Scope

The following `reports/story-related-upgrades.md` items are rejected; all rejections are **structural** (the zero-production-stories greenfield position means no rejection is a pragmatic / migration-cost softening):

- **P0 #1 — schema-drift cleanup** *(structural)*: already done; the landed skills and validators conform to the contract.
- **P0 #4 — `SCX` crosslink record** *(structural)*: `story-promotion-closeout` deliberately keeps canon links in its markdown ledger; D2 + existing `SF.derived_from` make a promoted fact self-honest.
- **P0 #5 — `BRSTAT` branch-status record** *(structural)*: branch status is cross-branch meta-hygiene the ledger + `INDEX.md` handle; the only real fragment is the D6 skill-text cleanup.
- **P1 #8 — explicit causal-support validation** *(structural)*: `snapshot_replay_equality` already enforces `SE`-delta causal linkage; the "require `derived_from` / `basis` everywhere" framing contradicts those fields' deliberate optionality.
- **P1 #10 — local salience scoring** *(structural)*: a turn-cycle ranking heuristic touching no schema / MCP / contract; coherence is unaffected (gate 7 grounds whatever block is selected).
- **P2 #11 — derived branch pressure index** *(structural)*: nice-to-have audit convenience; the report itself defers it post-pilot.
- **P2 #12 — mystery-progress ledger** *(structural)*: `PG.state_snapshot.unresolved_mystery_claims` already carries per-mystery authority + status.
- **P2 #13 — semantic audit mode** *(structural)*: explicitly optional, explicitly separate from structural validity.

ChatGPT-Pro's four "explicitly reject" items (act structure, global drama-management search, prose-as-state, full autonomous-agent simulation) are concurred with and require no action — the architecture already rejects them.

## Risks & Open Questions

- **D4 binding semantics** *(resolved for turn-cycle by SPEC25STOCOHHAR-007 and bootstrap by SPEC25STOCOHHAR-011)*: the `bound:<alias>` mechanism in `SLT.effects` remains the most novel surface in this spec. SPEC25STOCOHHAR-007 pinned the operational resolution order for `branching-story-turn-cycle` as bind first, select second, instantiate third; SPEC25STOCOHHAR-011 aligned direct bootstrap seed-block authoring with the same predicate DSL v2 alias-binding discipline.
- **D5 gate-7 validator home** *(resolved by SPEC25STOCOHHAR-008)*: gate 7 (plan grounding) is enforced in `tools/validators/src/structural/recursive-reference-closure.ts`, which already runs for `create_pg_record` pre-apply and resolves emitted-choice references in branch scope.
- **D7 §9 reconciliation** *(structural)*: the current `STORY_KERNEL.md` template's actual `cadence_policy` field set must be verified against the landed template before rewording `FOUNDATIONS.md` §9 — the spec prescribes reconciliation, not specific replacement text.
- **`entity_status` predicate argument name** *(structural)*: the closed-DSL grammar names the `entity_status` argument `axis` while the contract prose names it `field`. D1 reconciles this; flagged here in case any other caller depends on the current grammar name.
