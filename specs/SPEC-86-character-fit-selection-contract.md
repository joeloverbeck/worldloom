# SPEC-86: Character-Fit Selection Contract

**Status:** ready
**Date:** 2026-05-25
**Source brainstorm:** [`reports/slt-chc-overhaul-fourth-iteration.md`](../reports/slt-chc-overhaul-fourth-iteration.md) §1 "Executive verdict", §8 "Recommended architecture", §16 "STCHAR ⇄ current-state mediation model", §18 SPEC-A.
**Triage:** [`docs/triage/2026-05-25-slt-chc-overhaul-fourth-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-fourth-iteration-triage.md) §ACCEPT — SPEC-A folded into SPEC-86.
**Predecessors:** archived [`SPEC-79-chc-associated-commitment-block-removal.md`](../archive/specs/SPEC-79-chc-associated-commitment-block-removal.md) (late-binding established), archived [`SPEC-81-indexed-storylet-candidate-retrieval.md`](../archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md) (projection-based filtering established), archived [`SPEC-85-non-player-driver-golden-fixtures.md`](../archive/specs/SPEC-85-non-player-driver-golden-fixtures.md) (driver-kind selection coverage established).

## 1. Problem

Across four iterations of the STCHAR ⇄ SLT ⇄ CHC overhaul (iter-1 SPEC-76/77/78, iter-2 SPEC-79/80/81/82, iter-3 SPEC-83/84/85), the team has converged on a stable architectural understanding:

- `STCHAR` is durable story-local character authority — stable persona, voice, pressure behavior, capability/limit, perception, agency tendencies. It is **not** current state.
- Current state lives in `STPLAN` / `STEMO` / `BEL` / `SREL` / `STINT` / `STSTAT` / `OBL` / `CNSQ` / `THR` / `CLK` / `STSEC` / `STQ` / `DA` / `STOBJ` / `STLOC`.
- `SLT` selection should be **character-mediated through current-state records**, not through direct STCHAR predicates in the global author pool. Direct `record_active(STCHAR-X)` is lawful only at branch-scoped or branch-prefix-scoped visibility.
- `CHC` selection happens late, against the live pool filtered by parent-PG snapshot + chosen CHC's grounding + driver records.

This understanding is **operationally implicit** across the skill family today — it is encoded in `character-grounding-consistency` (CHCs touching persona-specific surfaces must cite STCHAR), `stchar-temporal-reference-boundary` (STCHAR cannot store current state), `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing` (non-player driver responds-mode CHCs cite driver records), and `slt-grounding-minimal-integrity` (SLT.grounding must name a reason to exist and avoid banned narrative-shape phrases) — but it is **not stated as a discipline contract anywhere in the shared story-state contract**. Verified absence: `.claude/skills/_shared-templates/story-state-contract.md` has no "Character-Fit Selection Contract", "Character-Fit Selection", or equivalent section as of HEAD (sections enumerated at §1 Authority Model, §2 Schema-Minimalism Doctrine, §3 Record Class Inventory, §4 Record Schemas, §5 Closed Predicate DSL, §6 Action Routing, §7 Nine Shared Hard Gates, §8 Page Plan Minimum Contract, §9 Branching and Rewind, §10 Shared Write Order, §11 Mystery and Canon Authority, §12 How Skills Use This Contract — no Character-Fit section between them).

This absence creates two recurring drift risks:

1. **Authoring drift in commitment blocks**: without a canonical contract, authors of global author-pool SLTs may reach for `record_active(STCHAR-X)` in `hard.preconditions[]` (legal under the predicate DSL but architecturally wrong at global visibility — STCHAR identity is not portable across branches). The existing `slt-grounding-minimal-integrity` validator does not catch this — it only checks `grounding.reason_to_exist` length and banned-phrase content.
2. **Drift in skill prose**: each skill's `SKILL.md` re-implements its own understanding of STCHAR's role in selection (compare `story-character-profile/SKILL.md`'s "Story-State Derivation Guide" subsection against `commitment-block-authoring/SKILL.md`'s eligibility prose against `branching-story-turn-cycle`'s Phase-2/8 reference text). Drift between these is the symptom; the absence of a contract anchor is the cause.

## 2. Goals

- Add a **§11a Character-Fit Selection Contract** section to `.claude/skills/_shared-templates/story-state-contract.md` between the existing §11 Mystery and Canon Authority and §12 How Skills Use This Contract. The section codifies the four-layer mediation model (stable constraint → current-state derivation → eligibility/ranking → rendering/surface) and the global-vs-branch-scoped STCHAR predicate discipline.
- Update §12 "How Skills Use This Contract" to add §11a to its enumeration of cited sections.
- Add minimal skill-prose anchors in the four skills whose SKILL.md or referenced phase docs currently re-implement the contract content, replacing scattered prose with a single citation to §11a:
  - `.claude/skills/story-character-profile/SKILL.md` — Story-State Derivation Guide drafting prose.
  - `.claude/skills/commitment-block-authoring/SKILL.md` — direct-batch and audit-repair eligibility prose where STCHAR's role in SLT selection is referenced.
  - `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — first-choice-generation prose where CHC grounding categories are listed.
  - `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — selection-rationale prose where STCHAR ↔ current-state mediation is described.

Each skill-prose anchor is **a one-paragraph citation that points to §11a**, not a copy of its content and not the addition of new ritual passes (Specificity Pass, Choice Stance Pass, etc., proposed in iter-4 §10 are out of scope here — see §3).

## 3. Non-goals

- **No schema changes.** STCHAR / SLT / CHC / SE / PG record schemas are unchanged. Iter-4 §9 explicitly proposes no JSON-schema changes; this spec honors that.
- **No new validators.** Iter-4 SPEC-C's five proposed warning validators (`slt_character_specificity_warning`, `selected_slt_specificity_trace_warning`, `chc_character_specificity_warning`, `non_player_response_richness_warning`, `stchar_current_state_mediation_warning`) are deferred. The iter-3 SPEC-88 lift-condition — "real playtest surfaces a pattern existing validators miss with a concrete rejection example" — remains unmet (no playtest pressure has surfaced between iter-3 and iter-4). Two of the five (`chc_character_specificity_warning`, `non_player_response_richness_warning`) partially overlap existing validators (`character-grounding-consistency`, `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing`); the remaining three are heuristic and false-positive-prone. See triage §DEFER on SPEC-C.
- **No MCP changes.** Iter-4 SPEC-B's proposed six denormalized projection columns (`slt_projection_predicate_classes_json`, etc.), `specificity_signature` input, and `specificity_trace` response are deferred. Verification confirmed 5 of 6 projection columns are accessible via single edge join today (`storylet_predicate_class`, `storylet_predicate_ref`, `storylet_action_family`, `storylet_compatible_driver` edges at `tools/world-index/src/parse/atomic.ts:819-864`); the 6th (`stchar_refs_json`) is reachable via existing `storylet_predicate_ref` edges since STCHAR IDs are extracted as predicate refs (`atomic.ts:1625-1635`); the existing `intent_signature` input field already accepts `action_families` / `grounding_record_classes` / `grounding_record_ids` (`tools/world-mcp/src/tools/select-storylet-candidates.ts:32-36`); and `specificity_trace` is consumer-circular without the SPEC-C validators landing. SPEC-81's 1000-SLT synthetic proof shows the current edge-join shape scales. FOUNDATIONS §Story Bundles §5b ("Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline") is the load-bearing test these fail today. See triage §DEFER on SPEC-B.
- **No new golden fixtures.** Iter-4 SPEC-D's six fixture types are deferred: 3 are already covered (`large synthetic pool` → SPEC-81; `replay/newer-global` → SPEC-84; `non-player-driver character-specific` → SPEC-85); 1 (`STCHAR boundary`) is enforced by existing `stchar-temporal-reference-boundary` validator; the remaining 2 (`generic SLT failure`, `generic CHC failure`) need SPEC-C validators to be meaningful test surfaces. See triage §DEFER on SPEC-D.
- **No new health-audit mode.** Iter-4 SPEC-E's "Character-Specificity Mode" is deferred — it is fully consumer-dependent on SPEC-B's specificity_trace and SPEC-C's warning validators; the existing `branching-story-health-audit` structural mode's Phase 2m "STCHAR authority health" check already covers what's actionable today. See triage §DEFER on SPEC-E.
- **No structured `SE.commitment.selection_rationale` field.** Iter-4 SPEC-F itself defers this pending production playtest evidence; aligned with FOUNDATIONS §5b. See triage §CONFIRMS-EXISTING-POSITION on SPEC-F.
- **No iter-4 ritual passes in skill phase prose.** "Specificity Pass" in Phase 2 (proposed iter-4 §10) and "Choice Stance Pass" in Phase 8 (proposed iter-4 §10) add authoring rituals without a structural reader; deferred pending validator consumers. The skill-prose anchors in §2 above point to the contract section but do not introduce these passes.

## 4. Design

### 4.1 New `§11a Character-Fit Selection Contract` section in shared contract

Inserted into `.claude/skills/_shared-templates/story-state-contract.md` between the existing §11 and §12. Verbatim text:

```markdown
## 11a. Character-Fit Selection Contract

The story-skill family selects `SLT` records for a turn through a four-layer mediation model anchored on the durable / current-state separation between `STCHAR` and the temporal record classes (`STPLAN`, `STEMO`, `BEL`, `SREL`, `STINT`, `STSTAT`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, `DA`, `STOBJ`, `STLOC`). This section codifies the contract; per-phase mechanics live in each skill.

### Four-layer mediation model

1. **Stable constraint layer (STCHAR).** A character's stable persona core, emotional appraisal map, pressure behavior, voice bible, perception/embodiment, agency/planning tendencies, relationship-specific behavior, capability/limit, and refusal patterns are durable authority. They do not change page-to-page; they shape *how* current state arises and is surfaced.

2. **Current-state derivation layer (`STPLAN` / `STEMO` / `BEL` / `SREL` / `STINT` / `STSTAT` / `OBL` / `CNSQ` / `THR` / `CLK` / `STSEC` / `STQ` / `DA` / `STOBJ` / `STLOC`).** Active records on the parent PG snapshot are the *operational surface* through which character specificity enters selection. STCHAR explains *why* a plan is blocked, *why* an emotion arose, *why* a relationship is fragile; the current records carry *that it is so right now*.

3. **Eligibility / ranking layer (`SLT` predicates + MCP filter pipeline).** Symbolic legality is decided by the predicate DSL against active records (see §5). Character specificity enters here as **predicate / edge overlap with current state**, not as direct STCHAR predicates in the global pool.

4. **Rendering / surface layer (page plan §16a + `CHC` wording).** The character-specific surface — viewpoint voice, refusal phrasing, relationship pressure, stance — is expressed at page-plan compose time and CHC authoring. §16a's `required_because` vocabulary is the authoring-time discipline for STCHAR packet inclusion.

### Global-pool vs branch-scoped STCHAR predicate discipline

`SLT.preconditions[].hard[]` may use `record_active(STCHAR-<integer>)` **only** when the SLT's `scope.visibility` is `branch_scoped` or `branch_prefix_scoped`. Global-author-pool SLTs (`scope.visibility: global_author_pool`) must express character relevance through:

- existential predicates over current-state classes (`any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`, `any_obligation_active`, etc.); or
- role-keyed predicates referencing `holder_role: primary_actor` / `holder_role: relevant_actor` plus a current-state class; or
- driver-record overlap (`SE.turn_driver.driver_records[]` is the universal current-state hook that crosses driver kinds).

This is a discipline contract, not a schema contract. The predicate DSL technically accepts `record_active(STCHAR-X)` at any visibility; the discipline above is operational. The `stchar-temporal-reference-boundary` validator enforces the inverse direction (STCHAR body cannot reference temporal records); the in-direction discipline lives here.

### What belongs in STCHAR

Stable persona core; stable appraisal patterns; pressure behavior; voice / dialogue authority; perception / embodiment; agency / planning tendencies; capability limits and costs; relationship-specific conduct; derivation guide; prose-rendering constraints.

### What belongs in current-state records

Current emotion (`STEMO`); current plan (`STPLAN`); current belief / knowledge / access route (`BEL`); current relation state (`SREL`); current intention (`STINT`); current status / location / agency (`STSTAT`); current obligation / consequence / thread (`OBL` / `CNSQ` / `THR`); current clock / secret / question (`CLK` / `STSEC` / `STQ`); current artifact / object / location affordance (`DA` / `STOBJ` / `STLOC`).

### CHC quality discipline (judgment-territory)

A `CHC` freezes intent, stance, accessible grounding, and likely pressure direction (see §4.5.12 in `story-record-schemas.md`). It does not promise exact outcome, hidden truth, success, selected storylet, state delta, NPC inner state without access route, or canonical promotion. Where a CHC's surface depends on character-specific refusal / appetite / fear / relationship pressure / voice / plan / belief / emotion, it cites the active `STCHAR` and the active temporal record(s) that make the choice available now. The `character-grounding-consistency` validator enforces the STCHAR-citation requirement when a CHC's text indicates a persona-specific surface. Deeper judgment criteria (whether choices reveal character, whether alternatives are morally / relationally distinct, whether the menu feels like agency rather than verbs) belong to health-audit and human / LLM review, not hard schema law.

### Non-player driver discipline

Under non-player initiative (`npc_action`, `offstage_action`, `world_pressure`, `clock_fire`, `secret_reveal`, `multi_actor_collision`), the selected SLT represents the initiator's character-specific committed move grounded in active driver records. Emitted CHCs for the player's response side must offer agency through stance variation (oppose, protect, question, withhold, redirect, interpret, refuse, expose, conceal, stay-silent, constrained write-in) and ground in driver records when the response mode is `responds`. The `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing` validator enforces the driver-record grounding requirement; stance-variation richness is health-audit / judgment territory.

### Hard discipline vs warning vs judgment

- **Hard discipline (validator-enforced)**: STCHAR body cannot store temporal state (`stchar-temporal-reference-boundary`); persona-specific CHCs must cite STCHAR (`character-grounding-consistency`); `responds`-mode CHCs must cite driver records (`turn-cycle-output-grounding-integrity`); SLT.grounding must name a reason to exist and avoid banned narrative-shape phrases (`slt-grounding-minimal-integrity`); CHC ↔ selected SLT trace closure (`chc-slt-selected-commitment-trace`); choice-set material noncollapse on the three deterministic axes (`rule_choice_set_noncollapse`).
- **Authoring discipline (skill-prose-enforced)**: the four-layer model above; the global-vs-branch-scoped STCHAR predicate rule above; CHC quality criteria; non-player driver stance variation richness.
- **Judgment territory (health-audit / human / LLM)**: whether a selection is dramatically alive given the active state; whether STCHAR is being operationalized through current state vs. being absorbed by current state; whether a non-player response choice set offers genuine agency vs. topical-but-passive options. The `branching-story-health-audit` structural mode's Phase 2m ("STCHAR authority health") is the current consumer site; deeper character-specificity audits live there if and when validator support lands.
```

### 4.2 Update to §12 enumeration

Existing §12 first paragraph reads:

> Each story-skill `SKILL.md` references this contract for: record schemas (§4), predicate DSL (§5), action-routing semantics (§6), the nine hard gates (§7), the page plan §19-section contract plus §7a turn-driver trace (§8), branching procedure (§9), shared write order (§10), and mystery/canon authority (§11).

Replace with:

> Each story-skill `SKILL.md` references this contract for: record schemas (§4), predicate DSL (§5), action-routing semantics (§6), the nine hard gates (§7), the page plan §19-section contract plus §7a turn-driver trace (§8), branching procedure (§9), shared write order (§10), mystery/canon authority (§11), and the character-fit selection contract (§11a).

### 4.3 Skill-prose anchor updates

Each skill anchor adds **one paragraph** citing §11a and pointing readers to the contract for the operational surface. The anchor replaces (rather than augments) any existing prose that duplicates §11a content. Where existing prose already cites parts of §11a's territory, the existing prose is replaced verbatim with a citation.

#### `.claude/skills/story-character-profile/SKILL.md`

In the section governing **Story-State Derivation Guide** authoring, add the following paragraph at the section's start:

> When drafting the Story-State Derivation Guide, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. The guide names *how* this character's stable authority generates or constrains current-state records (`STPLAN`, `STEMO`, `BEL`, `SREL`, `STINT`, `STSTAT`, `OBL` / `CNSQ` / `THR`, `CLK` / `STSEC` / `STQ`, `DA` / `STOBJ` / `STLOC`). Runtime selection skills consume those current-state records, not STCHAR vibes — the derivation guide is the bridge.

#### `.claude/skills/commitment-block-authoring/SKILL.md`

In the **direct-batch** and **audit-repair** mode sections governing SLT eligibility-predicate authoring, add this paragraph near the eligibility prose:

> When choosing `hard.preconditions[]` predicates, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. Global-author-pool SLTs (`scope.visibility: global_author_pool`) express character relevance through existential current-state predicates (`any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`), role-keyed predicates, or driver-record overlap — never through direct `record_active(STCHAR-<integer>)`. The direct-STCHAR form is reserved for `branch_scoped` and `branch_prefix_scoped` visibility, where a specific character's stable authority is the reason the block exists.

#### `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`

In the first-choice-generation section, add this paragraph where CHC grounding categories are described:

> When emitting first-page CHCs, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. Each non-write-in CHC grounds in at least one active record class — stable STCHAR is lawful but bare-STCHAR grounding is usually weak; pair STCHAR with one or more of `STEMO` / `STPLAN` / `BEL` / `SREL` / `OBL` / `CLK` / `STSEC` / `STQ` / `DA` to give the choice operational specificity. Bootstrap's "first three options that differ only by verb" failure mode is exactly what §11a's CHC quality discipline targets.

#### `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`

In the selection-rationale prose, add this paragraph:

> Selection rationale follows §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. The selected `SLT` is justified through the active current-state records that make it specific to this actor on this branch right now — `STPLAN` blockage, `STEMO` appraisal, `BEL` knowledge, `SREL` axis pressure, `OBL` / `CLK` / `STSEC` / `STQ` pressure, or `DA` / `STOBJ` / `STLOC` affordance. Where STCHAR appears in the rationale, it explains *why* the current-state record matters to this actor — not as a replacement for the current-state record. Branch-scoped SLTs with direct `record_active(STCHAR-<integer>)` predicates are the one lawful exception: there the STCHAR identity is the eligibility predicate itself.

## 5. Files Touched

- `.claude/skills/_shared-templates/story-state-contract.md` — insert §11a between §11 and §12 (verbatim §4.1 above); update §12 first paragraph to enumerate §11a (§4.2 above).
- `.claude/skills/story-character-profile/SKILL.md` — add §11a citation paragraph in Story-State Derivation Guide section (§4.3 above).
- `.claude/skills/commitment-block-authoring/SKILL.md` — add §11a citation paragraph in eligibility-predicate authoring section (§4.3 above).
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — add §11a citation paragraph in first-choice-generation section (§4.3 above).
- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — add §11a citation paragraph in selection-rationale section (§4.3 above).

No schema, validator, world-index, MCP tool, or test changes. The spec is documentation-only.

## 6. Acceptance Criteria

- §11a exists in `story-state-contract.md` between §11 and §12 with the four-layer model, global-vs-branch-scoped predicate discipline, STCHAR / current-state inventories, CHC quality discipline, non-player driver discipline, and three-tier validator/authoring/judgment classification.
- §12 enumerates §11a.
- Each of the four skill anchors carries the §11a citation paragraph in the correct section, and any pre-existing prose that duplicates §11a content has been replaced with the citation (no double-source for the same discipline).
- Existing validators (`stchar-temporal-reference-boundary`, `character-grounding-consistency`, `turn-cycle-output-grounding-integrity`, `slt-grounding-minimal-integrity`, `chc-slt-selected-commitment-trace`, `rule_choice_set_noncollapse`) continue to pass on all `tools/validators/tests/fixtures/` story-bundle fixtures — no behavior change.
- No schema file, JSON schema, validator registry entry, MCP tool, or test fixture is touched.

## 7. Validation Tests

This is a documentation-only spec; no code-level validation tests are added. The acceptance check is:

- **Manual diff review** — confirm §11a placement, §12 enumeration update, and four skill anchor citations.
- **Existing structural tests pass unchanged** — `npm test` in `tools/validators/`, `tools/world-mcp/`, `tools/world-index/` reports no regression (PASS: documentation-only change cannot affect compiled validator or MCP-tool behavior; the test command is run as a regression sanity check, not a behavioral assertion).
- **Skill-prose consistency check** — grep the four touched skill files for `§11a` and `Character-Fit Selection Contract` and confirm the citation paragraph is present in each. (PASS: structural confirmation that the contract anchor is in place at the four named skill sites.)

## 8. FOUNDATIONS Alignment

| FOUNDATIONS principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5a "Commitment Blocks Are Causal Moves" — SLT is a reusable causal move with preconditions / beats / effects / exits / saliency, not a dramatic act | aligns @ contract surface | §11a's eligibility/ranking layer formalizes the predicate-DSL-over-current-state pattern as the lawful character-fit surface, reinforcing the causal-move framing rather than introducing arc-shape fields. |
| §Story Bundles §5b "Schema-Minimalism At Story Scope" — every field must be load-bearing | aligns @ contract surface (no schema additions); also load-bearing for the §3 deferrals (4 of iter-4's 5 active SPECs fail this test) | The spec adds zero schema fields. §3 explicitly defers SPEC-B's six projection columns / signature input / trace response, SPEC-C's five warning validators, SPEC-D's six fixtures, and SPEC-E's audit mode — none have a load-bearing consumer today. |
| §Story Bundles §5c "Present Causal State, Not Narrative Shape" — story state encodes present causal obligations, not future dramatic obligations | aligns @ authoring discipline | §11a's four-layer model puts current-state records at the eligibility/ranking center; STCHAR informs but does not predict. The non-goals block re-affirms the iter-2 §Out-of-Scope rejection of `arc_contract` / `dramatic_unit` / global drama manager. |
| §Story Bundles §6.1 "Story-Local Character Authority" — story `STCHAR-*` is the runtime authority; world `CHAR-*` is not consumed at story runtime | aligns @ contract surface | §11a anchors selection on `STCHAR-*` (with the durable / current-state split) and never references world `CHAR-*`. |
| Rule 4 ("No Globalization by Accident") at story scope — branch isolation | aligns @ predicate discipline | §11a's global-vs-branch-scoped STCHAR predicate rule prevents author-pool SLTs from acquiring branch-local exact-STCHAR dependencies that would silently apply across branches at replay/fork. |
| Rule 5 ("No Consequence Evasion") at story scope — page consequence capacity preserved | N/A | Spec is documentation-only; consequence capacity is unaffected. |
| Rule 7 ("Preserve Mystery Deliberately") at story scope | N/A | Spec adds no mystery-touching contract; existing mystery-firewall validators are unchanged. |

## 9. Open Questions

1. **Skill-anchor scope creep risk**: future iterations may pressure the four skill anchors to grow back into duplicate-content forms. The §11a contract is the canonical source; any future content addition to character-fit selection should land in §11a first, then anchors update. This discipline is captured implicitly in §12's general rule ("Skills must not duplicate the contract's content. They cite it.") and does not need a separate enforcement.
2. **§11a vs §13 numbering**: §11a inserts under the §11 cluster pattern (alongside the existing §5a / §7a / §9b / §9c / §16a sub-numbered sections elsewhere in the contract). A future restructure could renumber §11a to a top-level §13; this spec uses §11a to minimize renumbering pressure on the existing §12 reference text.
3. **Lift conditions for the four iter-4 deferrals** are recorded in the companion triage file's §DEFER bucket. Re-evaluation should happen at the next iteration boundary or when concrete playtest / scaling evidence materializes — whichever comes first. The triage file is the authoritative re-evaluation register.
