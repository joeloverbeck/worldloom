<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Migration + Risks & Open Questions. -->

# SPEC-43: Present-Causal Mid-Story State Introduction and Non-Retcon Bundle Compatibility Repair

**Status**: DRAFT
**Phase**: wave-2 turn-cycle authoring + validator + audit extensions
**Depends on**: SPEC-13 (atomic-source per-record-per-file `_source/<class>/<ID>.yaml`); SPEC-34 (validator registry pattern); SPEC-38 (story-local diegetic artifacts); SPEC-42 (CLK / STSEC / STQ classes — establishes the bootstrap creation path the turn-cycle gap mirrors)
**Blocks**: follow-up spec (working title SPEC-44 or later) covering dedicated `branching-story-compatibility-repair` skill, `story_system_contract_revision` marker, and CLK `linked_records[]` widening
**Source**: `reports/mid-story-state-introduction.md` (ChatGPT-Pro deep-research response, 2026-05-18); `reports/mid-story-state-introduction-research-brief.md` (Claude Opus brief, 2026-05-18); brainstorm-triage at `docs/triage/2026-05-18-mid-story-state-introduction-triage.md`; cross-checked against `docs/FOUNDATIONS.md` §Story Bundles §4a / §4b / §5a / §5b / §5c / §6a / §6b, archived SPEC-19 through SPEC-22 (scene-commitment-arc, rolled back), `.claude/skills/_shared-templates/story-state-contract.md`, and verified codebase state under `tools/patch-engine/src/`, `tools/validators/src/`, and `.claude/skills/branching-story-*`.

---

## Problem Statement

Two related gaps in the story-pipeline accumulate authoring friction and silent technical debt as bundles age. They share the §5c discipline ("present causal state, not narrative shape") and overlap deliverable surfaces (validators, audit-mode integration, PG-snapshot replay semantics), so they bundle into a single spec.

### Problem 1 — Mid-story introduction gap

The patch-engine ops to create `CLK`, `STSEC`, `STQ`, `THR`, `STENT`, and `SREL` records mid-story all exist: `create_stent_record` / `create_thr_record` / `create_srel_record` / `create_clk_record` / `create_stsec_record` / `create_stq_record` at `tools/patch-engine/src/envelope/schema.ts:78, 84, 85, 94, 98, 103`, with id-allocation slots `stent_ids` / `thr_ids` / `srel_ids` / `clk_ids` / `stsec_ids` / `stq_ids` at lines 26, 32, 33, 43, 44, 45. `.claude/skills/branching-story-bootstrap/SKILL.md:283-289` exercises these ops to seed optional `CLK` / `STSEC` / `STQ` at root, and `branching-story-turn-cycle/SKILL.md:155` Phase 10 uses a wildcard `create_*_record` for every changed record class that deliberately covers all six.

But the turn-cycle skill's documented authoring surface — the Output table at SKILL.md:113-129 and the Phase 2/3 + Phase 4/5 reference prose — frames these six classes exclusively as either "(existing record update)" via lifecycle ops (CLK: `tick_pressure_clock` / `resolve_pressure_clock`; STSEC: `mark_secret_clue_discovered` / `reveal_story_secret`; STQ: `answer_story_question` / `abandon_story_question`) or "(supersession)" (THR / STENT / SREL). The phase reference files (`references/phase-2-3-commitment-and-state-delta.md`, `references/phase-4-5-belief-and-mystery.md`) similarly cover only advance / supersede / lifecycle and never creation. There is no documented authoring path for mid-story creation.

The result is that authors who need a new pressure to enter mid-story — a faction arrives bearing news; a character lies for the first time; a discovered letter raises a new question; a stranger walks on stage; a new alliance forms; a new ongoing investigation opens — have three failure modes: (1) over-seed at bootstrap (drifts toward narrative-shape pre-planning, exactly what §5c forbids); (2) shoehorn into supersessions of unrelated `THR` or `BEL` records (the anti-pattern SPEC-42 itself cited at archived SPEC-42 §Problem Statement); (3) drop the structure entirely (breaks predicates, storylet selection, witness firewall, audit trail).

### Problem 2 — Non-retcon bundle compatibility repair

Story bundles bootstrapped before SPEC-38 / SPEC-42 lack the `_source/{clocks,secrets,story-questions,artifacts}/` subdirectories AND lack `CLK` / `STSEC` / `STQ` / `DA` keys in their `PG.state_snapshot.active_records` maps. SPEC-42 §Verification guarantees backwards compatibility — these bundles remain valid — but there is no workflow that detects the drift structurally and reports it, distinguishes "schema-drift compatibility repair" from "narrative state change" for audit readers, or lets a turn advancing from a pre-contract parent page emit a current-contract child page without forcing PG-rewrites that violate append-only / supersession discipline.

The production case study is `worlds/erotica-world/stories/red-bunny/` (bootstrapped 2026-05-17, one day before SPEC-42 merged 2026-05-18; missing all four post-SPEC-38 / SPEC-42 subdirectories; PG snapshots include `DA: []` empty placeholder but omit CLK / STSEC / STQ keys entirely).

### Key design decisions

- **Considered direct Phase-3-op mid-story introduction (without storylet mediation); chose storylet-mediated introduction.** Reason: keeps introduction inside the existing `SLT` causal-move primitive per §5a, so introduction is the effect of a binding causal move rather than an out-of-band engine event. Authors who need bare introduction use a JIT `SLT` with the new record as a side effect.
- **Considered new predicate DSL entries (e.g., `pressure_emerged`, `secret_became_actionable`, `setup_explicitly_introduced`); rejected.** Reason: the predicate DSL at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:4-41` is eligibility-over-active-state language; mid-story introduction is proof-about-just-committed-event, structurally a different surface. Adding "what the accepted event did" predicates would conflate the surfaces and risk drift toward narrative-shape predicates ("the story needed pressure"). Use parseable `SE.world_logic_rationale` tags instead.
- **Considered deferring `introduction_observer_firewall` to Wave 3 as the source report recommended; chose Wave 2 ship with explicit-record-reference access routes.** Reason: §6b (Observer Firewall) is foundational — choices grounded in a freshly-introduced record must respect the acting entity's access route. The existing `observer_firewall` validator already handles the access-route check; the new validator's job is to enumerate new-record class IDs and feed them through. The "inferential access" handling stays Wave 3, but explicit-reference access ships now.
- **Considered bundling a dedicated `branching-story-compatibility-repair` skill into Wave 2; chose Wave 3 deferral.** Reason (structural): a dedicated repair skill is genuinely scope-distinct from mid-story introduction — distinct user surface, distinct authoring posture. Wave 2 ships read-only detection + reporting; Wave 3 adds the repair-author surface.
- **Considered the `story_system_contract_revision` marker for Wave 2; chose Wave 3 deferral.** Reason (pragmatic): structurally cleaner if shipped with Wave 2 (makes drift detection deterministic instead of heuristic), but the retrofit cost of stamping the marker on every existing bundle plus marker-aware validator-normalization plumbing exceeds the Wave 2 surface budget.
- **Considered hard-`fail` severity for `compatibility_drift` on "new current-contract page omits required active-record shape" in Wave 2; chose `warn` only.** Reason: without the Wave 3 contract marker, "current-contract" detection is heuristic. Wave 2 ships `info` / `warn`; Wave 3 hardens to `fail` once the marker enables deterministic classification.
- **Considered widening CLK `linked_records[]` to allow BEL / SF / DA / STENT grounding in Wave 2; chose Wave 3 deferral.** Reason (pragmatic): the current 8-class pattern at `tools/validators/src/schemas/story-pressure-clock.schema.json:39` (THR / OBL / CNSQ / STINT / SREL / STLOC / STOBJ / STQ) may prove too narrow for psychological-pressure introductions (addiction, dread, slow-corrupt). Wave 2 fixture authoring tracks workarounds; Wave 3 widens conditional on ≥3 friction cases.
- **Considered amending Phase 10 op enumeration as the source report recommended; chose to drop that amendment.** Reason (corrective): the wildcard `create_*_record` at SKILL.md:155 already deliberately covers all six create ops — no Phase 10 op-enumeration amendment is needed. The gap is in the Output table + Phase 2/3 + Phase 4/5 prose narrative only.

---

## Approach

### A. Mid-story introduction doctrine

A new story-bundle structure (`CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `SREL`) may be introduced mid-story only when the just-committed event or current branch state creates a new persistent causal object that is not reducible to an existing active record and that changes future eligibility, visibility, obligations, pressure, witness propagation, relationship constraints, affordances, or choice grounding.

Six binding corollaries:

1. **Same-event authority.** The introduction must be visible in the same accepted page-cycle plan: selected `SLT` / JIT `SLT`, `SE.state_delta.create[]`, patch create op, next `PG.state_snapshot.active_records`.
2. **Existing-record preference.** Escalation / complication / discovery / tick / answer / reveal / status change / relationship-axis change of an existing record supersedes the existing record; does not create a fresh one.
3. **No prose-only structures.** Pressure / secret / question / thread / entity / relationship that will constrain future engine behavior cannot live only in rendered prose.
4. **No bootstrap over-seeding.** The system does not force authors to seed every possible future pressure / secret / question at root. Mid-story introduction is lawful and expected.
5. **No future-shape contracts.** The new record may represent an open causal situation but must not promise a future scene sequence, payoff mode, climax, midpoint, act position, or dramatic curve.
6. **Introduction is not mandatory.** Background color, one-off interactions, flavor NPCs, and reader curiosity may remain prose / `SF` / `BEL` / ordinary `SE` evidence if they do not need engine representation.

### B. `intro:<CLASS>(...)` rationale tag grammar

A new parseable tag in `SE.world_logic_rationale`, following the existing non-propagation tag pattern. Grammar (exported from `tools/validators/src/structural/_shared/midstory-introduction-tag-parser.ts`):

```
intro_tag    := "intro:" class "(" args ")"
class        := "CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "SREL"
args         := id_arg "," trigger_arg "," evidence_arg "," distinct_arg
id_arg       := "id=" record_id
trigger_arg  := "trigger=" trigger_name
evidence_arg := "evidence=[" record_id_list "]"
distinct_arg := "distinct_from=[" record_id_list "]"
record_id    := uppercase_id "-" positive_integer
trigger_name := lowercase_snake_case
```

A required tag for every mid-story-created CLK / STSEC / STQ / THR / STENT / SREL. The parser accepts whitespace around delimiters and is case-sensitive on class names. Validators consume the tag to verify evidence ids exist and are parent-active or same-event-created.

Per-class closed trigger vocabularies (lift verbatim into `.claude/skills/_shared-templates/story-state-contract.md` §4.5.X):

- **CLK**: `deadline_declared`, `pursuit_started`, `exposure_accumulation_started`, `faction_mobilized`, `environmental_degradation_started`, `mission_or_race_started`, `staged_danger_became_trackable`.
- **STSEC**: `lie_made_hidden_truth_branch_relevant`, `hidden_truth_constrains_action`, `clue_carrier_enters_play`, `holder_access_changed`, `protected_mystery_story_secret_needed`.
- **STQ**: `promise_made`, `explicit_question_raised`, `unexplained_evidence_introduced`, `affordance_setup_introduced`, `open_decision_created`.
- **THR**: `new_ongoing_causal_concern`, `investigation_line_opened`, `recovery_line_opened`, `negotiation_line_opened`, `mission_line_opened`, `social_fallout_line_opened`.
- **STENT**: `actor_enters_branch`, `witness_needed`, `information_source_enters`, `pressure_driver_enters`, `counterparty_enters`, `choice_target_enters`.
- **SREL**: `alliance_forms`, `rivalry_forms`, `debt_relation_forms`, `authority_relation_forms`, `trust_axis_becomes_relevant`, `intimacy_axis_becomes_relevant`, `hostility_axis_becomes_relevant`.

Each trigger names something that became true at the committed event. No trigger names act position, expected payoff, planned sequence, or any future-shape claim.

### C. Per-class mid-story introduction rules

Per-class creation thresholds, supersede thresholds, minimum grounding, required turn-cycle handling, validator checks, and anti-patterns — lift en bloc from source report §6 (CLK / STSEC / STQ / THR / STENT / SREL) into a new reference file `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md`. The §6 STSEC "first lie rule" (a first lie becomes `BEL`; STSEC only when the hidden truth must be tracked / protected / revealed through engine state) is load-bearing for §6a (Belief vs. Fact) discipline.

### D. Nine new validators (Wave 2)

| Validator | Severity | Inputs | Failure codes | Wave |
|---|---|---|---|---|
| `midstory_record_introduction_grounding` (generic) | fail | patch plan, created SE, created PG, created records | `midstory_intro_missing_state_delta`, `midstory_intro_created_at_mismatch`, `midstory_intro_missing_tag`, `midstory_intro_evidence_missing` | 2 |
| `clock_introduction_grounding_integrity` | fail | new CLK, parent snapshot, same-event creates | `clock_intro_missing_driver`, `clock_intro_missing_linked_record`, `clock_intro_link_not_active`, `clock_intro_missing_grounding_link` | 2 |
| `secret_introduction_anchor_integrity` | fail | new STSEC, source records, truth anchor, mystery refs | `secret_intro_missing_source`, `secret_intro_truth_anchor_missing`, `secret_intro_holder_missing` | 2 |
| `story_question_introduction_grounding_integrity` (extends `story_question_grounding_integrity`) | fail | new STQ, source event/records | `stq_intro_source_event_mismatch`, `stq_intro_source_not_active` | 2 |
| `thread_introduction_grounding_integrity` | fail | new THR, derived_from, parent snapshot | `thread_intro_missing_derived_from`, `thread_intro_grounding_missing` | 2 |
| `entity_introduction_status_pairing` | fail | new STENT, same-event STSTAT, next PG | `entity_intro_missing_status`, `entity_intro_multiple_active_status` | 2 |
| `relationship_introduction_grounding_integrity` | fail/warn | new SREL, participants, derived_from | `srel_intro_participant_inactive`, `srel_intro_missing_derived_from`, `srel_intro_duplicate_axis` | 2 |
| `introduction_observer_firewall` (explicit-reference scope) | fail | selected SLT, actor, created records, BEL/access | `intro_observer_no_access_route` | 2 |
| `narrative_shape_field_rejection` (extends per-class beyond existing STQ check) | fail | all story records (CLK / STSEC / THR / SREL / STENT) | `narrative_shape_forbidden_field` | 2 |

Scoping notes:

- `entity_introduction_status_pairing` precondition is `SE.state_delta.create[]` contains at least one `STENT-<integer>` id. Existing-entity status updates (the common case — entity stays alive, life / agency / location changes) do NOT trigger the pairing requirement.
- `narrative_shape_field_rejection` extends per-class prohibitions beyond the existing STQ check at `record_schema_compliance` (`.claude/skills/_shared-templates/story-record-schemas.md:720-731`). Wave 2 prohibition list per class (act_position / midpoint / climax / dramatic_curve_position / tension_arc / expected_chapter / scene_sequence / expected_payoff_mode) applies uniformly to CLK / STSEC / THR / SREL / STENT — these classes had not previously had explicit narrative-shape prohibitions.
- `introduction_observer_firewall` Wave 2 scope: validator enumerates new-record class IDs from `SE.state_delta.create[]` and feeds them to the existing `observer_firewall` validator's access-route check. Inferential access (where access is implied by social/institutional context rather than an explicit record reference) defers to Wave 3.

### E. Compatibility-drift reporting (Wave 2)

New `compatibility_drift` validator with `info` / `warn` severities. Detects:

- Missing newer optional subdirectories (`_source/clocks/`, `_source/secrets/`, `_source/story-questions/`, `_source/artifacts/`) — severity `info`.
- Older `PG.state_snapshot.active_records` maps missing newer keys (CLK / STSEC / STQ / DA) — severity `info` for old-style parent PG, `warn` if a NEW PG omits required keys without grandfathered-parent explanation.
- Stale validators that assume newer keys without normalizing absent optional arrays — severity `warn`.

Classifications: `current_contract`, `compatible_optional_absence`, `grandfathered_snapshot_shape`, `compatible_with_advisory`, `requires_compatibility_audit`, `requires_migration_patch`, `manual_review`, `blocked_contract_break`.

New health-audit mode at `branching-story-health-audit`: `compatibility` or `structural,compatibility`. SAU reports gain a `Compatibility drift` section listing classifications + counts + per-finding evidence. Per §10 of the source report: no automatic `CLK` / `STSEC` / `STQ` creation; pure compatibility scan writes SAU/SCMP only; advisory RSP cards may be emitted but authorial adoption is optional.

### F. Snapshot-key normalization

The `snapshot_replay_equality` validator and `state_snapshot_integrity` validator treat missing CLK / STSEC / STQ / DA keys on any parent `PG.state_snapshot.active_records` as empty arrays. No PG-rewrites — the parent PG remains historical state. PG schema at `tools/validators/src/schemas/story-page.schema.json:68` already has `additionalProperties: true` and no `required` constraint on `active_records`, so schema-side support is in place; the normalization is a replay-side change.

When a turn advances from any parent PG, the new child PG MUST materialize the full current active-record map, including empty arrays for the four optional classes (`CLK: []`, `STSEC: []`, `STQ: []`, `DA: []`) when no records of that class are active. This is the boundary at which "compatibility era" ends and "current contract" begins — every new commit is current-contract regardless of parent.

For the rare case where an unavoidable `_source` repair requires an event (rather than pure metadata/audit), use `event_kind: system_repair`, `actor: system`, and `world_logic_rationale` tag `compatibility_migration(..., no_fiction_change=true)`. This should be rare and never the default path.

### G. Turn-cycle skill amendments

- **Output table rows** for CLK / STSEC / STQ / THR / STENT / SREL extended from "(existing record update)" / "(supersession)" to "(new or supersession)" or "(new or lifecycle update)" with IF-clauses covering both fresh creation and lifecycle.
- **Phase 2/3 commitment + state delta**: explicit mid-story introduction rule added after binding/selecting the `SLT` — ask whether the accepted event creates any new persistent causal object not reducible to an active record; if yes, draft the new record in `SE.state_delta.create[]` and include the `intro:<CLASS>(...)` tag.
- **Phase 4/5 belief, visibility, and new-class state**: before lifecycle updates to existing CLK / STSEC / STQ, apply any same-event creations for those classes. Any new STSEC, deceptive event, public relationship formation, new witness-bearing entity, or newly visible pressure MUST pass belief/visibility propagation discipline.
- **Page-plan §10b**: when the turn creates or activates CLK / STSEC / STQ, page-plan §10b includes their render-relevant visibility (what the renderer may show, what remains hidden, who knows, which choices are grounded).
- **Phase 9 validation gates**: Gates 12-15 added per Table D above.
- **Phase 10 op enumeration**: NO amendment (wildcard `create_*_record` at SKILL.md:155 already covers the six create ops).

### H. Phase 2i (health-audit) vs Phase 9 (turn-cycle) clarification

The new mid-story-introduction validators are per-commit gates in **Phase 9 of turn-cycle**, NOT Phase 2i retrospective audits. Phase 2i at `branching-story-health-audit/SKILL.md:280` retains its "absence of CLK / STSEC / STQ records is never itself a finding" rule + retrospective mechanism-rot audits. The new `compatibility_drift` reporting IS a Phase 2i extension (new audit-mode `compatibility` or `structural,compatibility`); the introduction validators are NOT.

---

## Deliverables

- `.claude/skills/branching-story-turn-cycle/SKILL.md` — Output table updates (six rows), Phase 9 gates added.
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — Phase 3 mid-story introduction subsection.
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` — Phase 4 belief-propagation hook for STSEC creation + general mid-story-creation precedence rule.
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — §10b extension covering newly-introduced CLK / STSEC / STQ visibility.
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — Gates 12-15 added.
- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` — new reference file with per-class creation/supersede thresholds, minimum grounding, anti-patterns, examples.
- `.claude/skills/_shared-templates/story-state-contract.md` — new §4.5.X subsection enumerating per-class closed trigger vocabularies + `intro:<CLASS>(...)` tag grammar reference.
- `.claude/skills/branching-story-health-audit/SKILL.md` — new `compatibility` audit mode + `Compatibility drift` SAU report section.
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (generic).
- `tools/validators/src/structural/clock-introduction-grounding-integrity.ts`
- `tools/validators/src/structural/secret-introduction-anchor-integrity.ts`
- `tools/validators/src/structural/story-question-introduction-grounding-integrity.ts` (extends existing `story-question-grounding-integrity.ts` or registers as sibling).
- `tools/validators/src/structural/thread-introduction-grounding-integrity.ts`
- `tools/validators/src/structural/entity-introduction-status-pairing.ts`
- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts`
- `tools/validators/src/structural/introduction-observer-firewall.ts` (Wave 2 explicit-reference scope; inferential access deferred to Wave 3).
- `tools/validators/src/structural/narrative-shape-field-rejection.ts` (extends per-class prohibition coverage beyond existing STQ check).
- `tools/validators/src/structural/compatibility-drift.ts` (`info` / `warn` only for Wave 2).
- `tools/validators/src/structural/_shared/midstory-introduction-tag-parser.ts` (exported tag parser utility + tests).
- Updated `snapshot_replay_equality` / `state_snapshot_integrity` validators to normalize missing optional-class keys to `[]` on parent PG reads.
- Synthetic fixture bundle exercising all six mid-story creation classes + old-style PG snapshot grandfathering + future-shape rejection + observer-firewall enforcement (under `tools/validators/tests/fixtures/midstory-introduction/`).

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §4a Plan-Authority Boundary | aligns | Mid-story introduction is decided pre-prose, in the page-plan + patch envelope; rendered prose remains downstream receipt. New child `PG.state_snapshot.active_records` is the authoritative state commit including newly-introduced records. |
| §4b Canon Baseline Drift | aligns | Compatibility-drift classification is operational (schema-drift) and orthogonal to fictional canon-revision-drift; the two run as parallel classification ladders without interaction. |
| §5a Commitment Blocks Are Causal Moves | aligns | Mid-story introduction is mediated by `SLT` / JIT `SLT` selection; the introduction is the effect of a causal move, never an out-of-band engine event. No `arc_contract`, `dramatic_unit`, `execution_envelope`, `effect_model`, `stop_policy`, or `shape:` discriminators added to any record. |
| §5b Schema-Minimalism | aligns | No new schema fields added to existing records. The `intro:<CLASS>(...)` tag is parseable text within the existing `SE.world_logic_rationale` field — no schema change. Closed trigger vocabularies live in `_shared-templates/story-state-contract.md` §4.5.X, not in new schema fields. |
| §5c Present Causal State, Not Narrative Shape | aligns | Every per-class trigger names something that became true at the committed event. The `narrative_shape_field_rejection` validator extends §5c discipline to CLK / STSEC / THR / SREL / STENT beyond the existing STQ check at `record_schema_compliance` (`story-record-schemas.md:720-731`). Explicit non-goals list (act position, midpoint, climax, dramatic-curve position, expected payoff mode) lifted verbatim from source report §13. Cautionary precedent: archived SPEC-19 through SPEC-22 (scene-commitment-arc) rolled back for §5c violations; SPEC-43 avoids the same trap by ensuring every trigger is past-event-grounded. |
| §6a Belief vs. Fact | aligns | STSEC "first lie rule" — a first lie becomes `BEL`; STSEC only when the hidden truth must be tracked / protected / revealed through engine state. Prevents lie-equals-secret conflation that would conflate belief-mode with branch-truth tracking. |
| §6b Information / Observer Firewall | aligns | `introduction_observer_firewall` validator (Wave 2) checks that any choice grounded in a freshly-introduced record names an access route through the existing observer-firewall mechanism (BEL / DA / STOBJ / STLOC / institutional channels / direct observation / testimony / surveillance). Inferential access deferred to Wave 3. |

---

## Verification

- Mid-story `CLK` creation passes: event declares deadline; same `SE` creates `OBL` or `THR`; new `CLK` links to grounding record; `intro:CLK(...)` tag parses; next `PG.active_records.CLK` includes id.
- Vague-pressure `CLK` fails (`clock_intro_missing_grounding_link`): no driver / linked record / trigger evidence.
- Existing-clock tick remains valid: no new creation; `tick_pressure_clock` produces valid tick provenance.
- Mid-story `STSEC` creation passes: event creates deceptive `BEL` + truth anchor + secret; valid holder + source records; mystery firewall respected.
- Author-only-future-twist `STSEC` fails: no source records / holder / clue carrier / truth anchor.
- Mid-story `STQ` creation passes: event creates `DA` letter raising concrete open question; `source_event` equals creating `SE`; source records active.
- Future-shape `STQ` fails (`narrative_shape_forbidden_field`): `expected_payoff_mode` or `climax` field present.
- Future-shape `CLK` / `STSEC` / `THR` / `SREL` / `STENT` fail: same validator extends rejection per-class.
- New `STENT` + same-event `STSTAT` passes: courier enters, can act, has status/location.
- New `STENT` without `STSTAT` fails (`entity_intro_missing_status`).
- Existing-entity status update does NOT trigger pairing requirement: validator checks `STENT` IS in `SE.state_delta.create[]` before requiring pairing.
- New `SREL` creation passes: two active participants + `derived_from[]` cites the event / belief / obligation.
- Believed-only relationship as `SREL` fails or warns: correct repair is `BEL`, not objective `SREL`.
- New `THR` creation passes: ongoing investigation line opens with `derived_from[]`.
- Thematic `THR` fails: no grounding, named as theme / arc.
- Choice grounded in freshly-introduced record fails observer-firewall (`intro_observer_no_access_route`) when actor lacks explicit access route.
- Absence of optional `CLK` / `STSEC` / `STQ` remains valid: health audit emits no finding for absence (re-affirms Phase 2i rule).
- Old-style `PG.active_records` compatibility drift reported (`info` for old parent; `warn` for new PG omitting keys without explanation); replay normalizes missing keys to `[]`; new child PG emits full map.
- `red-bunny` bundle passes `world-validate --story red-bunny` cleanly; emits `compatible_optional_absence` + `grandfathered_snapshot_shape` classifications in compatibility-mode audit.
- Compatibility repair does NOT create fiction: pure compatibility scan writes SAU/SCMP only; no `SE` or `PG` mutation for empty-key normalization; no automatic `CLK` / `STSEC` / `STQ` creation.

---

## Migration

- No existing bundle requires modification. Pre-SPEC-43 PG snapshots remain valid via grandfathering (`additionalProperties: true` is already permissive at `story-page.schema.json:68`).
- Existing turn-cycle invocations continue to work; the new mid-story creation paths are additive.
- Existing storylets / `SLT` records continue to work; new `SLT.effects.create[]` ids for fresh CLK / STSEC / STQ / THR / STENT / SREL are additive.
- Existing validators continue to fire; the new validators register additively per SPEC-34's registry pattern.
- `red-bunny` and other pre-SPEC-42 bundles are picked up by the new compatibility-drift reporting as `compatible_optional_absence` + `grandfathered_snapshot_shape` — no action required unless authors choose to act on advisory RSP cards.

---

## Out of Scope

Deferred to Wave 3 (working title SPEC-44 or later) with explicit re-evaluation triggers:

- **Dedicated `branching-story-compatibility-repair` skill** authoring minimum lawful repair-supersession sets with explicit compatibility receipts (`audits/compatibility/SCMP-<id>-<date>.md`). _Trigger to re-evaluate_: Wave 2 compatibility-drift reporting surfaces ≥1 `requires_migration_patch` classification on a real bundle. _Deferral type_: structural — distinct user surface and authoring posture.
- **`story_system_contract_revision` marker** in `STORY_KERNEL.md` frontmatter + marker-aware validator normalization (`last_compatibility_audit: SCMP-<id>` companion field). _Trigger to re-evaluate_: the repair skill needs deterministic "current-contract" vs "legacy" detection. _Deferral type_: pragmatic — structurally cleaner if bundled but retrofit cost too high for Wave 2.
- **CLK `linked_records[]` widening** to allow BEL / SF / DA / STENT grounding for psychological-pressure introductions. _Trigger to re-evaluate_: Wave 2 fixture authoring tracks ≥3 documented workaround cases. _Deferral type_: pragmatic.
- **Inferential-access handling in `introduction_observer_firewall`** (beyond Wave 2's explicit-reference scope). _Trigger to re-evaluate_: Wave 2 false-negative reports from authors. _Deferral type_: pragmatic.
- **Hard `fail` severity for `compatibility_drift`** validator's "new current-contract page omits required active-record shape" finding. _Trigger to re-evaluate_: the contract marker is shipped, making "current-contract" detection deterministic. _Deferral type_: pragmatic.
- **Private production-batch audit tooling** (local-only sweep over multiple bundles, classification summary). _Trigger to re-evaluate_: authors with multiple legacy bundles request batch handling. _Deferral type_: structural — standalone tooling surface.

Explicit non-goals (lifted verbatim from source report §13):

- No act structure.
- No global drama manager.
- No midpoint / climax / dramatic-curve fields.
- No expected payoff mode.
- No automatic clock creation because "the story needs tension."
- No secret creation for author-only future twists.
- No story question for mere reader curiosity.
- No `THR` as theme / arc label.
- No `STENT` for background mentions.
- No `SREL` for planned relationships not yet state-real.
- No direct edits to `_source/*.yaml` (Hook 3 already blocks this).
- No treating absent optional `CLK` / `STSEC` / `STQ` as invalid (re-affirms existing health-audit Phase 2i rule at SKILL.md:280).
- No superseding old `PG` snapshots merely to add empty active-record keys.
- No compatibility repair disguised as an in-fiction retcon.

---

## Risks & Open Questions

- **`intro:<CLASS>(...)` tag malformed by authors** (pragmatic — would block Wave 2 authoring). Mitigation: parser surfaces clear error messages naming the malformed field; SPEC-43 ships `_shared/midstory-introduction-tag-parser.ts` with regex + tests; SKILL.md prose includes worked examples for each class.
- **Compatibility-drift `info` severity may be ignored** (pragmatic — could leak into Wave 3 with no real signal). Mitigation: `world-validate` accepts `--severity info,warn,fail` flag so authors can surface info-level findings on demand; document the recommended cadence in health-audit skill prose.
- **Closed trigger vocabularies may need expansion mid-Wave-2** (pragmatic — early authoring may surface valid causal events not covered by the initial vocabulary). Mitigation: vocabulary lives in `_shared-templates/story-state-contract.md` §4.5.X (version-controlled); follow-up tickets can extend without amending SPEC-43.
- **`STENT`-without-`STSTAT` over-fire** (pragmatic — incorrect validator scoping could break existing-entity status updates). Mitigation: validator precondition is explicitly `SE.state_delta.create[]` containing ≥1 `STENT-<integer>` id; fixture test covers the existing-entity-only path.
- **CLK `linked_records[]` narrowness blocks Wave 2 introductions** (pragmatic — current 8-class pattern at `story-pressure-clock.schema.json:39` may force authoring workarounds). Mitigation: Wave 2 fixture authoring tracks workarounds with explicit notes; ≥3 documented cases triggers Wave 3 schema widening.
- **Phase 2i (health-audit) vs Phase 9 (turn-cycle) confusion** (structural — skill authors might wire the new validators into the wrong phase). Mitigation: SPEC-43 §Approach H explicitly names "Phase 9 turn-cycle gates, NOT Phase 2i retrospective audits"; SAU report's compatibility section IS the new Phase 2i extension; the introduction validators are not.
- **Belief-propagation hook for STSEC creation may double-fire** (pragmatic — Phase 4 already runs belief propagation for existing-secret reveal/discovery; adding a hook for STSEC creation could fire twice on the same event). Mitigation: Phase 4 reference file explicitly distinguishes creation-time propagation (initial holder + clue-carrier propagation) from lifecycle-time propagation (reveal / discovery propagation); validator covers both.
