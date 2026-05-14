<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-27: FOUNDATIONS Amendments — Canon Schema Correctness, Rule-Numbering Map, and Story-Integrity Hardening

**Status**: DRAFT
**Supersedes**: nothing. Additive amendment of `docs/FOUNDATIONS.md` plus the schema / validator / MCP / skill surfaces those amendments cascade into.
**Source**: triage of `reports/worldloom_foundations_amendment_proposal.md` — an external review (ChatGPT-Pro) of `docs/FOUNDATIONS.md` conducted against the `docs/` set only, with **no codebase access**. The proposal offered 12 numbered amendments; each was reassessed against the actual schemas, validators, MCP layer, and skills. The full per-amendment triage is recorded at `docs/triage/2026-05-14-foundations-amendment-proposal-triage.md`.

## Problem Statement

`docs/FOUNDATIONS.md` was amended organically across SPEC-09 through SPEC-26 and has accumulated internal inconsistencies and undocumented decisions. An external reviewer, fed only the `docs/` set, produced `reports/worldloom_foundations_amendment_proposal.md` proposing 12 amendments. Because the reviewer could not see the codebase, its *diagnoses* are largely accurate but its *prescriptions* over-build — several proposed amendments duplicate validator-enforced mechanisms that already exist, and several proposed *fixes* invent fields (`mystery_links[]`) or shapes (a structured-object `required_world_updates`) that contradict what the codebase enforces.

Reassessment against the codebase recalibrates the proposal to **nine accepted deliverables** (D1–D9), grouped: D1–D4 are world-canon schema / documentation correctness; D5–D9 are story-scope integrity hardening. Four proposed amendments are rejected outright (see §Out of Scope), and one proposed sub-part — minting a new "Rule 13" — is rejected as duplicative of already-shipped SPEC-18 machinery.

Each accepted deliverable closes, or makes enforceable, a real gap verified against the working tree:

1. **The CF `status` enum is internally inconsistent.** `docs/FOUNDATIONS.md` §Canon Layers names five canon layers (Hard / Derived / Soft / Contested / Mystery Reserve), but the CF Record `status` enum at `FOUNDATIONS.md:274` — and the binding schema `tools/validators/src/schemas/canon-fact-record.schema.json` plus `tools/world-index/src/schema/types.ts` `CanonFactStatus` — is `hard_canon | soft_canon | contested_canon | mystery_reserve`. `derived_canon` is absent (derived canon is currently encoded only via `source_basis.derived_from`, not as a status), and `mystery_reserve` is present yet used by **zero** CF records across both real worlds — Mystery Reserve is a separate first-class `M-<integer>` record class with its own schema.
2. **The CF schema example uses retired markdown filenames.** `FOUNDATIONS.md:312-316` shows `required_world_updates` as a flat list of retired root markdown files (`INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `EVERYDAY_LIFE.md`, `TIMELINE.md`) — files that `FOUNDATIONS.md:518` *itself* states "do not exist on machine-layer-enabled worlds." The actually-enforced shape (`tools/validators/src/structural/touched-by-cf-completeness.ts`, `tools/patch-engine/src/ops/append-extension.ts`) is a flat list of bare UPPER_SNAKE SEC file-class names. `.claude/skills/skill-creator/templates/canon-fact-record.yaml` is stale the same way, and `.claude/skills/canon-addition/examples/accept-with-required-updates.md` is inconsistent in the opposite direction (it uses SEC *record IDs*, which the validator does not accept).
3. **The Validation Rule numbering gap is undocumented in-place.** `FOUNDATIONS.md` §Validation Rules defines Rules 1–7, then jumps to 11–12; Rules 9 and 10 are only *referenced*, Rule 8 and Rule 13 are absent. The gap is intentional — `archive/specs/SPEC-09-canon-safety-expansion.md:214` rejected Rule 8 (folding it into the "Default Reality" principle) and demoted Rules 9/10 to cross-reference notes while keeping the externally-proposed numbers 11/12 — but FOUNDATIONS never records this, so every new spec reading it must reverse-engineer the gap. Separately, `canon-addition`'s internal "Validation Tests" are a *distinct numbering scheme* that collides at 11–13 (`docs/WORKFLOWS.md:11` cites "Test 13"; there is no Rule 13), inviting mistaken cross-references.
4. **The "Default Reality" principle is stated but enforced only post-hoc.** `FOUNDATIONS.md:24` requires that first canonization of a previously-unmodeled area "acknowledge that prior silence and route through Rule 6." The only enforcement is `continuity-audit` Phase 4k — a *post-acceptance* retcon-proposal generator that never hard-fails. `canon-addition`, the skill that actually canonizes, has zero references to prior-silence acknowledgment; it can canonize an unmodeled domain with no acknowledgment at all.
5. **Cosmetic player choices are structurally legal.** `story-state-contract.md` §4.3 explicitly states there is no `state_delta.no_change` signal — an `accept`-routed choice that creates / supersedes / closes nothing and changes no visibility or affordance is legal. `CHC.grounded_in` is an *availability anchor* (what makes a choice appear), not a *consequence guarantee* (what selecting it changes). Nothing forbids fake agency at story scope.
6. **Canon baseline drift is a phantom feature.** `docs/CONTEXT-PACKET-CONTRACT.md:246,258,264` describe `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` context-packet profiles delivering a `change_log_entry` node "so the page can persist `state_snapshot.canon_revision`" and "so Phase 4 can compare the bundle's `canon_revision` baseline against recent canon movement." The *consuming* side does not exist: `state_snapshot.canon_revision` is not in the PG schema (`story-state-contract.md` §4.2), no story skill reads or writes it, no `canon_sync` patch-engine op exists, and `branching-story-health-audit` has no canon-drift sub-phase. The retrieval doc describes a feature the schema and skills never implemented.
7. **The information / observer firewall covers belief propagation but not move generation.** The `expected_witnesses` mechanism (`branching-story-turn-cycle` Phase 4, landed via SPEC-26 D5) ensures that *after* an event, every witness group gets a `BEL` record. But nothing gates whether an emitted `CHC` or a selected `SLT`'s actor-binding respects the *acting entity's own* `BEL` state — an NPC or a player-facing choice can be generated using knowledge the actor cannot possess.
8. **Cumulative mystery narrowing is unchecked.** `PG.state_snapshot.unresolved_mystery_claims[].status` already carries an accretion-aware enum (`preserved | clue_added | narrowed | apparent_resolution | held_for_promotion`), but turn-cycle and health-audit check only *direct* forbidden-mystery resolution. Nothing checks whether accumulated `clue_added` / `narrowed` statuses across a branch have effectively resolved a Mystery Reserve entry without any single page stating the answer — a Rule 7 integrity gap.
9. **HARD-GATE rationales require existence, not authority.** `docs/HARD-GATE-DISCIPLINE.md:11` and both `CLAUDE.md` files require each validation test to "record PASS with a one-line rationale" and treat a bare "PASS" as FAIL — but neither requires the rationale to *cite* the record id, validator result, or packet layer it rests on. `canon-addition` Phase 14a already practices a stronger discipline (cite the named mechanical validator + cite phase findings) skill-locally; it is not generalized.

### Key design decisions

- **Considered adopting the reviewer's `integration_chain` required schema block; rejected it** because verification mapped ~9 of its 15 sub-fields to existing CF fields (several near-exact: `exception_governance.rate_limits`, `.nondeployment_reasons`, `epistemic_profile.evidence_left`), and the 11-phase `canon-addition` process already forces all five integration questions as phases enforced by ~11 validators. A new required block duplicates schema + phases + validators and taxes every CF authoring / retrieval against §Story Bundles §5b schema-minimalism. The reviewer's premise — "existing fields do not force the author to answer" — is refuted by the skill phases. *(structural)*
- **Considered the reviewer's structured-object `required_world_updates` shape (`target_class` / `target_record_ids` / `discovery_required`); chose to document the actually-enforced shape instead** — a flat list of bare UPPER_SNAKE SEC file-class names — because the validator and patch engine already enforce that shape; the reviewer's invented shape would contradict working code.
- **Considered minting the reviewer's new "Rule 13: No Perfect Recognition by Default"; rejected it** because misrecognition is already enforced via SPEC-18 (`canon-addition` Phase 0 misrecognition probe + Validation Test 13 + the `epistemic_profile` `distortion_vectors` / `knowledge_exclusions` fields). A new Rule 13 would duplicate shipped machinery and *worsen* the Rule-vs-Test numbering collision. The D2 enforcement map documents the existing Test 13 ↔ §Acceptance Tests #9 linkage instead.
- **Considered adopting the reviewer's `impact_surface_map` Change Control expansion; rejected it** because §Change Control Policy is already operationalized as the executable CH (Change Log Entry) record schema, which *exceeds* the prose spec (`retcon_policy_checks`, `latent_burdens_introduced[]`, `impact_on_existing_texts[]`). The proposal would duplicate the CH schema; its one genuinely-new element ("story bundles to audit") is architecturally excluded because story bundles are a derived layer. *(structural)* — D1's scope is limited to making the §Change Control Policy *prose* point at the CH schema that already realizes it.
- **Considered the reviewer's six-state silence taxonomy (`unmodeled / default_baseline / implied / forbidden / hidden / contested`) as a CF schema field; chose a canonization-time acknowledgment step with a lightweight classification** because the load-bearing gap is *enforcement placement* (the obligation lives in FOUNDATIONS but is only audited post-hoc), not a missing taxonomy. D3 relocates enforcement into `canon-addition` Phase 0 and keeps the classification minimal.
- **Considered the reviewer's new `mystery_effect` field on `SLT` records; chose to reuse the existing `PG.state_snapshot.unresolved_mystery_claims[].status` vocabulary** because that enum already distinguishes `clue_added` / `narrowed` / `apparent_resolution`; the missing piece is a *cumulative-narrowing check*, not new schema surface.
- **Considered the reviewer's full `§4c Authorship and Authority Boundary` section; rejected it** because the authority hierarchy is already fully covered by `story-state-contract.md` §1 (Authority Model), `FOUNDATIONS.md` §4a (Plan-Authority Boundary), §6 action routing ("silent rejection is forbidden"), and `branching-story-prose-attach`'s `invented_structural_fact` check. It is pure restatement with zero new enforcement. *(structural)*
- **Considered the reviewer's `§1a Story-Local Operationalization of Invariants`; rejected it** as a quality nudge rather than a load-bearing gap — `STORY_KERNEL.md` §7 already lists invariant constraints; requiring per-invariant "operational consequence" prose is tone-preservation polish, not an enforceable integrity invariant.
- **Considered scoping Canon Baseline Drift (D6) out as its own follow-up spec; chose to keep it in SPEC-27** because the `CONTEXT-PACKET-CONTRACT.md` phantom-feature text is an active doc-correctness bug that misleads any future spec regardless of D6's fate, so the doc correction must land here; the full mechanism is then a coherent unit with it. D6 is flagged as the heaviest implementation surface — see §Risks & Open Questions.

## Approach

Nine deliverables. D1–D4 touch world-canon schema, FOUNDATIONS documentation, `canon-addition`, and HARD-GATE discipline; they carry low-to-moderate implementation risk. D5–D9 touch `FOUNDATIONS.md` §Story Bundles, the shared story-state contract, story-bundle schemas, and the story-pipeline skills; D6 is the heaviest. SPEC-27 amends documentation and contracts; ticket decomposition sequences the implementation.

**Enabling fact**: there are zero production story bundles, so every story-scope schema edit in D5–D9 is a pure greenfield change with no migration or retrofit cost. Every story-scope rejection in §Out of Scope is therefore **structural**, not a pragmatic / migration-cost softening.

### D1 — CF schema correctness: `status` enum, `required_world_updates` shape, stale-surface sweep

**Implementation note (2026-05-14, SPEC27FOUCAN-001).** D1 landed the CF status enum and `required_world_updates` corrections across `docs/FOUNDATIONS.md`, `tools/validators`, `tools/world-index`, the two CF templates, `canon-addition`'s worked example, and the current CF-parity producer templates in `story-fact-promotion-to-canon` and `continuity-audit`. Remaining D1 prose below is historical intake context unless a later ticket explicitly owns broader pipeline-wide cleanup.

**Current state.** `FOUNDATIONS.md:274` and the binding schema/type surfaces carry `status: hard_canon | soft_canon | contested_canon | mystery_reserve`; `derived_canon` is absent and `mystery_reserve` is dead enum surface. `FOUNDATIONS.md:312-316` shows `required_world_updates` with retired `.md` filenames, contradicting `FOUNDATIONS.md:518`. `skill-creator/templates/canon-fact-record.yaml:54-57` is stale the same way; `canon-addition/examples/accept-with-required-updates.md:120` uses SEC record IDs, which the validator rejects.

**Change.**
- `FOUNDATIONS.md:274` → `status: hard_canon | derived_canon | soft_canon | contested_canon`. `tools/validators/src/schemas/canon-fact-record.schema.json` and `tools/world-index/src/schema/types.ts` `CanonFactStatus` adopt the same enum: accept `derived_canon`, reject `mystery_reserve` on CF records appended after this schema extension. The genesis-world / append-only-ledger rule grandfathers historical CFs (no real CF uses `mystery_reserve` today, so the grandfather clause is precautionary).
- A note added immediately after the CF schema block: Mystery Reserve entries are first-class `M-<integer>` records, not a CF status; relate a CF to an `M` record via `source_basis` / change-log / extension mechanisms, not via `status`.
- `FOUNDATIONS.md:312-316` `required_world_updates` example → a flat list of bare UPPER_SNAKE SEC file-class names drawn from `GEOGRAPHY | PEOPLES_AND_SPECIES | INSTITUTIONS | ECONOMY_AND_RESOURCES | MAGIC_OR_TECH_SYSTEMS | EVERYDAY_LIFE | TIMELINE`, with a one-line note that retired root markdown filenames must not appear.
- `skill-creator/templates/canon-fact-record.yaml` updated to the enforced shape; `canon-addition/examples/accept-with-required-updates.md` corrected to file-class names.
- `FOUNDATIONS.md` §Change Control Policy prose (lines 466–476) gains a one-line pointer to the CH record schema as its operationalization (no `impact_surface_map` — see §Out of Scope).
- The CF status-value templates at `create-base-world/templates/canon-fact-record.yaml` and `skill-creator/templates/canon-fact-record.yaml` are updated in lockstep per their own sync-discipline comments.

### D2 — Rule Numbering and Enforcement Map

**Implementation note (2026-05-14, SPEC27FOUCAN-002).** D2 landed in `docs/FOUNDATIONS.md` §Validation Rules as an in-place Rule Numbering and Enforcement Map. The map declares Rules 1-7, 11, and 12; records the disposition of Rules 8, 9, 10, and 13; and distinguishes `canon-addition` Validation Tests from FOUNDATIONS Validation Rules. Remaining D2 prose below is historical intake context unless a later ticket explicitly owns further wording cleanup.

**Current state.** `FOUNDATIONS.md` §Validation Rules has Rules 1–7, 11, 12; Rules 8/9/10/13 are absent or reference-only; the gap's rationale lives only in `archive/specs/SPEC-09`. `canon-addition`'s "Validation Tests" are a separate scheme colliding at 11–13.

**Change.** Add a "Rule Numbering and Enforcement Map" subsection at the top of §Validation Rules stating:
- Rules 1–7, 11, 12 are the defined rules; their names and enforcement surfaces (validator file, skill phase, or both — including "Rule 3: judgment-only, no validator").
- Rule 8 was rejected (SPEC-09) and folded into the §Core Principle "Default Reality" paragraph; Rules 9 and 10 are demoted-to-cross-reference-note status, enforced by named skill phases. No skill may cite a rule number whose meaning is not declared here.
- `canon-addition`'s numbered "Validation Tests" are a distinct numbering scheme from FOUNDATIONS "Validation Rules"; Test N ≠ Rule N. In particular, `canon-addition` Validation Test 13 (misrecognition probe) maps to FOUNDATIONS §Acceptance Tests #9, not to any Rule.
- No new "Rule 13" is minted (see §Out of Scope).

### D3 — Silence Semantics enforced at canonization time

**Implementation note (2026-05-14, SPEC27FOUCAN-003).** D3 landed the Silence Semantics paragraph in `docs/FOUNDATIONS.md` §Core Principle and the matching `canon-addition` Phase 0 prior-silence acknowledgment requirement across `SKILL.md` and the Phase 0 / PA body-shape references. Remaining D3 prose below is historical intake context unless a later ticket explicitly owns further enforcement changes.

**Current state.** The "Default Reality" obligation is stated at `FOUNDATIONS.md:24` but enforced only post-hoc by `continuity-audit` Phase 4k; `canon-addition` does not classify prior silence.

**Change.**
- `FOUNDATIONS.md` §Core Principle gains an explicit "Silence Semantics" paragraph after "Default Reality", naming a lightweight prior-silence classification (the load-bearing distinctions: previously-unmodeled vs. already-implied vs. default-baseline vs. deliberately-unknown), without introducing a CF schema field.
- `canon-addition` gains a Phase 0 prior-silence-acknowledgment sub-step (parallel to the existing misrecognition probe): when a CF's `domains_affected` introduces a domain no prior CF covered, the skill must record a one-line prior-silence acknowledgment in `cf.notes` or `cf.source_basis`, or record an explicit "not previously silent" rationale. `continuity-audit` Phase 4k remains as the post-hoc backstop.

### D4 — Authority-cited HARD-GATE rationales

**Implementation note (2026-05-14, SPEC27FOUCAN-004).** D4 landed the authority-cited HARD-GATE rationale rule in `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 and added the matching pointer in `docs/FOUNDATIONS.md` §Tooling Recommendation. Remaining D4 prose below is historical intake context unless a later ticket explicitly owns broader skill-local or `CLAUDE.md` wording cleanup.

**Current state.** `HARD-GATE-DISCIPLINE.md:11` and both `CLAUDE.md` files require a non-empty one-line rationale; neither requires it to cite an authority record. `canon-addition` Phase 14a already practices the stronger discipline skill-locally.

**Change.** `docs/HARD-GATE-DISCIPLINE.md` execution-pattern step 3 is strengthened: a canon-safety HARD-GATE PASS / FAIL rationale must cite the record ids, packet layer, validator result, or retrieved field that supports the judgment; a rationale resting only on model memory or prose impression is treated as FAIL. `FOUNDATIONS.md` §Tooling Recommendation gains a one-line pointer to this discipline. This generalizes and codifies `canon-addition`'s existing Phase 14a practice; it does not invent a new mechanism.

### D5 — Choice Consequence Integrity (story-scope Rule 5)

**Current state.** Empty `SE.state_delta` is explicitly legal; `CHC.grounded_in` is an availability anchor, not a consequence guarantee.

**Change.**
- `FOUNDATIONS.md` §Story Bundles §5 gains a "Choice Consequence Integrity" clause under the Rule 5 story-scope paragraph: no accepted player choice or accepted write-in may be cosmetic-only — every committed `CHC` selection or accepted write-in must produce at least one grounded consequence (a non-empty `SE.state_delta`; a new/superseded/closed story-bundle record; a changed visibility or affordance state; or a recorded failure/refusal/block that is itself a consequence). Purely rhetorical/expressive choice variants are permitted only when the page plan explicitly marks them as such.
- The shared story-state contract (`story-state-contract.md` §7) gains a hard-gate clause for this; `branching-story-turn-cycle` Phase 9 enforces it at turn commit; `branching-story-health-audit` adds the corresponding replay finding.

### D6 — Canon Baseline Drift (story-scope §4b) + phantom-feature correction

**Current state.** `CONTEXT-PACKET-CONTRACT.md:246,258,264` describe a `canon_revision` baseline that the PG schema, story skills, and patch-engine ops never implemented.

**Change.**
- `FOUNDATIONS.md` §Story Bundles gains §4b "Canon Baseline Drift": a committed story page is evaluated against the world-canon revision it loaded at page-plan commit; later world-canon changes do not silently rewrite committed records; a new turn must compare the parent page's recorded baseline against current canon and classify drift (`compatible` / `grandfathered` / `requires_health_audit` / `requires_repair_turn` / `promotion_or_retcon_conflict`); no story-pipeline skill may silently treat stale story-local assumptions as world-valid.
- The shared story-state contract adds `state_snapshot.canon_revision` to the PG schema; `branching-story-turn-cycle` persists the baseline at page commit and runs the drift classification at turn start; `branching-story-health-audit` gains a canon-drift structural sub-phase.
- `docs/CONTEXT-PACKET-CONTRACT.md` lines 246 / 258 / 264 are reconciled so the retrieval-side description matches the now-real consuming side (rather than describing a phantom).

### D7 — Information / Observer Firewall on move generation (story-scope §6b)

**Current state.** `expected_witnesses` covers belief *propagation* after events; nothing gates `CHC` emission or `SLT` actor-binding against the acting entity's own `BEL` state.

**Change.** `FOUNDATIONS.md` §Story Bundles gains §6b "Information / Observer Firewall", scoped narrowly to move/choice **generation**: a storylet selection, an emitted choice, or a character action must not rely on information unavailable to the acting entity unless the plan records a valid access route (direct observation, testimony, document, inference, surveillance, institutional channel, magic/tech, or another canonically valid mechanism). The clause explicitly notes that the existing `expected_witnesses` mechanism already covers the post-event belief-propagation side. The shared story-state contract gates `CHC` emission and `SLT` actor-binding accordingly; `branching-story-turn-cycle` and `branching-story-health-audit` enforce/audit it.

### D8 — Mystery Accretion Discipline (story-scope, under Rule 7)

**Current state.** `PG.state_snapshot.unresolved_mystery_claims[].status` carries `clue_added` / `narrowed`, but nothing checks cumulative narrowing.

**Change.** `FOUNDATIONS.md` §Story Bundles §5 Rule 7 paragraph gains a "Mystery Accretion" clause: story-pipeline skills must check *cumulative* narrowing of a Mystery Reserve entry across a branch's pages, not merely direct answer statements — repeated clues can resolve a mystery by accumulation. Implementation reuses the existing `unresolved_mystery_claims[].status` vocabulary; `branching-story-health-audit` Phase 2e gains a cumulative-narrowing check that walks a branch's page chain. No new `SLT` field is added.

### D9 — Integration capstone

A final reconciliation pass: run the `tools/validators` and affected `tools/` package test lanes, run a cross-skill stale-vocabulary sweep for `mystery_reserve` (as a CF status) and retired-`.md`-filename residues, and confirm `docs/WORKFLOWS.md` and `docs/MACHINE-FACING-LAYER.md` reflect the amended CF status enum and the rule-numbering map.

## Deliverables

| ID | Deliverable | Primary surfaces |
|---|---|---|
| D1 | CF `status` enum + `required_world_updates` doc shape + stale-surface sweep + Change Control prose pointer | `FOUNDATIONS.md` (CF schema, §Change Control Policy); `canon-fact-record.schema.json`; `world-index` `types.ts`; `create-base-world` & `skill-creator` CF templates; current CF-parity producer templates in `story-fact-promotion-to-canon` and `continuity-audit`; `canon-addition/examples/accept-with-required-updates.md` |
| D2 | Rule Numbering and Enforcement Map | `FOUNDATIONS.md` §Validation Rules |
| D3 | Silence Semantics at canonization time | `FOUNDATIONS.md` §Core Principle; `canon-addition` Phase 0 |
| D4 | Authority-cited HARD-GATE rationales | `docs/HARD-GATE-DISCIPLINE.md`; `FOUNDATIONS.md` §Tooling Recommendation |
| D5 | Choice Consequence Integrity | `FOUNDATIONS.md` §Story Bundles §5; `story-state-contract.md` §7; `branching-story-turn-cycle`; `branching-story-health-audit` |
| D6 | Canon Baseline Drift §4b + phantom-feature correction | `FOUNDATIONS.md` §Story Bundles §4b; `story-state-contract.md` §4.2 (PG schema); `branching-story-turn-cycle`; `branching-story-health-audit`; `docs/CONTEXT-PACKET-CONTRACT.md` |
| D7 | Observer Firewall on move generation §6b | `FOUNDATIONS.md` §Story Bundles §6b; `story-state-contract.md` §5/§7; `branching-story-turn-cycle`; `branching-story-health-audit` |
| D8 | Mystery Accretion Discipline | `FOUNDATIONS.md` §Story Bundles §5 (Rule 7 clause); `branching-story-health-audit` Phase 2e |
| D9 | Integration capstone | `tools/validators` + affected package test lanes; `docs/WORKFLOWS.md`; `docs/MACHINE-FACING-LAYER.md` |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Canon Layers (Hard / Derived / Soft / Contested / Mystery Reserve) | aligns | D1 reconciles the CF `status` enum with the five named layers — adding `derived_canon`, removing the layer-confusing `mystery_reserve` value. |
| Rule 6 — No Silent Retcons | aligns | D3 moves prior-silence acknowledgment to canonization time; D6 forbids story-pipeline skills from silently treating stale canon baselines as world-valid — both are Rule 6 enforcement at their respective scopes. |
| Rule 7 — Preserve Mystery Deliberately | aligns | D8 closes the cumulative-narrowing gap so mysteries cannot be resolved by clue accretion without a single page stating the answer. |
| Story Bundles §5 — Validation Rules At Story Scope | aligns | D5 (Choice Consequence Integrity) is the story-scope analogue of Rule 2 — No Pure Cosmetics; D7 extends the BEL/SF separation to move generation. |
| Story Bundles §5b — Schema-Minimalism At Story Scope | aligns | D8 reuses the existing `unresolved_mystery_claims[].status` vocabulary instead of adding a new `SLT` field; the rejected `integration_chain` block (§Out of Scope) is rejected partly on this principle. |
| §Canonical Storage Layer / engine-routed writes | aligns | D1's schema-enum change flows through the validator and patch-engine surfaces; no record is mutated outside the engine. Existing CFs are grandfathered per the append-only-ledger rule. |

## Verification

- **D1**: `canon-fact-record.schema.json` accepts a CF with `status: derived_canon` and rejects `status: mystery_reserve` on a newly-appended CF; `world-index` typechecks with the amended `CanonFactStatus`; `FOUNDATIONS.md:274/312-316` and both CF templates show the enforced shapes; a repo-wide grep finds no remaining retired-`.md`-filename `required_world_updates` examples and no `mystery_reserve` CF-status example. Each PASS entry carries a one-line rationale citing the file/line checked.
- **D2**: `FOUNDATIONS.md` §Validation Rules opens with the map; a reader can determine, from FOUNDATIONS alone, why 8/9/10/13 are absent and that Test N ≠ Rule N.
- **D3**: `canon-addition` Phase 0 prose names the prior-silence acknowledgment step; `FOUNDATIONS.md` §Core Principle carries the Silence Semantics paragraph.
- **D4**: `HARD-GATE-DISCIPLINE.md` step 3 requires authority-cited rationales; a bare or impression-only rationale is documented as FAIL.
- **D5–D8**: each new `FOUNDATIONS.md` §Story Bundles clause is present; the shared story-state contract carries the matching gate/schema change; the named turn-cycle / health-audit phases reference the new check. Because there are zero production bundles, verification is contract-and-prose conformance plus the `tools/validators` test lane, not bundle replay.
- **D9**: `tools/validators` and affected package test lanes pass; the cross-skill stale-vocabulary sweep returns no operational hits.

## Out of Scope

- **Reviewer Amendment 3 — "Canon Integration Chain" required schema block.** Rejected: ~9/15 sub-fields duplicate existing CF fields, the 11-phase `canon-addition` process already forces all five integration questions, and a new required block taxes every CF authoring/retrieval against §Story Bundles §5b schema-minimalism. *(structural — the proposal's premise that existing fields "don't force the author" is refuted by the skill phases.)*
- **Reviewer Amendment 7 — "§4c Authorship and Authority Boundary".** Rejected: fully covered by `story-state-contract.md` §1, `FOUNDATIONS.md` §4a, §6 action routing, and prose-attach's `invented_structural_fact` check. Pure restatement, zero new enforcement. *(structural)*
- **Reviewer Amendment 10 — "impact_surface_map" Change Control expansion.** Rejected: §Change Control Policy is already operationalized as the executable CH record schema, which exceeds the prose spec; the only genuinely-new element ("story bundles to audit") is architecturally excluded. D1 limits itself to a one-line prose pointer to the CH schema. *(structural)*
- **Reviewer Amendment 12 — "§1a Story-Local Operationalization of Invariants".** Rejected: `STORY_KERNEL.md` §7 already lists invariant constraints; per-invariant "operational consequence" prose is tone-preservation polish, not an enforceable integrity gap. *(structural — judged nice-to-have under the conservative, load-bearing-only review brief.)*
- **A new "Rule 13: No Perfect Recognition by Default".** Rejected: misrecognition is already enforced via SPEC-18 (`canon-addition` Phase 0 probe + Validation Test 13 + `epistemic_profile` fields); a new Rule 13 would duplicate shipped machinery and worsen the Rule-vs-Test numbering collision. D2 documents the existing linkage instead. *(structural)*
- **The reviewer's invented `mystery_links[]` CF field** — does not exist and is not introduced; CF-to-`M` relationships use existing `source_basis` / change-log / extension mechanisms.
- **The reviewer's structured-object `required_world_updates` shape** — contradicts the enforced flat UPPER_SNAKE-file-class-list shape; D1 documents the enforced shape, not the invented one.
- **Ticket decomposition and implementation** — SPEC-27 amends documentation and contracts; the implementation tickets are produced by a separate decomposition step.

## Risks & Open Questions

- **D6 is the heaviest implementation surface** *(structural)*. It adds a PG-schema field, a turn-cycle comparison step, a health-audit sub-phase, and a `CONTEXT-PACKET-CONTRACT.md` reconciliation. If ticket decomposition shows D6's surface is disproportionate to the rest of SPEC-27, it is the natural candidate to split into a follow-up spec — but the `CONTEXT-PACKET-CONTRACT.md` phantom-feature correction must land here regardless, since it is an active doc-correctness bug independent of whether the full mechanism ships.
- **D1 enum change blast radius**. The `mystery_reserve` → `derived_canon` swap touches three enforcement surfaces (JSON schema, TS type, templates) plus illustrative prose across ~13 skill files. D9's sweep is the backstop; the illustrative-prose hits (`hard_canon` / `soft_canon` examples) are mostly safe but must be spot-checked for any that assert the *old* four-value enum.
- **D3 classification granularity is deliberately under-specified.** The spec mandates a canonization-time acknowledgment step but leaves the exact classification vocabulary to ticket-time judgment, to avoid re-introducing the reviewer's over-built six-state taxonomy. Ticket authoring should pick the minimum set of distinctions `continuity-audit` Phase 4k already keys on.
- **D5 / D7 enforcement depth.** The spec defines the FOUNDATIONS clauses and the contract gates; whether `branching-story-health-audit` enforcement is a full structural-replay sub-phase or a lighter prose check is a ticket-time decision, consistent with how SPEC-26 D4/D5 were scoped.
- **Whether D4 should also touch the two `CLAUDE.md` files.** D4 strengthens `HARD-GATE-DISCIPLINE.md`; the `CLAUDE.md` "bare PASS = FAIL" note is consistent with the strengthening but not identical. Ticket authoring should decide whether to also amend the `CLAUDE.md` note or leave it as the weaker-but-not-contradictory summary.
