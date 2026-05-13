<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions + Out of Scope. -->

# SPEC-23: Story State Contract Taxonomies Reassessment

**Phase**: Independent — amends the shared story state contract and its three implementation surfaces (validator schemas, predicate DSL grammar, patch-engine record-ops) ahead of the first production use of the rebuilt story-pipeline skill family.
**Depends on**: None (the rebuilt story-skill family has landed; per FOUNDATIONS §Story Bundles §5b the contract is the authoritative source for story-record schemas).
**Blocks**: First production story-bundle authoring against the rebuilt skills (the contract/schema mismatches catalogued in Workstream 1 would otherwise reproduce drift on every committed SLT, BEL, and PG).
**Status (2026-05-13)**: PROPOSED

## Problem Statement

The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` is the single source of truth for the seven Skill Category 2c story-pipeline skills' record schemas, predicate DSL, action-routing semantics, and hard-gate validation surface (per FOUNDATIONS §Story Bundles §5b). An external reassessment of the contract (reports/story-skills-taxonomies.md, ChatGPT-Pro deep-research output) identified twelve enum-layer and predicate-layer defects that would, if left in place, force authors to mislabel records and would leave engine-side state checks under-specified.

Codebase exploration during triage also surfaced three classes of pre-existing drift that the external reassessment could not have seen because it worked from the contract markdown plus FOUNDATIONS only:

1. **Contract↔schema mismatches** on three SLT enums where the JSON schemas under `tools/validators/src/schemas/story-storylet.schema.json` already enforce a different vocabulary than the contract documents.
2. **Predicate DSL contract↔grammar mismatch** where the contract claims 10 closed predicates while the grammar constants at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` enforce 21 PRED_TYPES, with several name-level disagreements (`entity_status` vs `entity_state`, `relationship_axis` vs `relationship` + `fact_matches` sub-type, `belief` vs `epistemic`, and no `thread_active` or `has_affordance` in the grammar).
3. **`STENT.role_in_story` is an untyped string** in `tools/world-mcp/src/context-packet/shared.ts` despite FOUNDATIONS §Story Bundles §7 naming it as a sibling-scan shared surface — there is no closed vocabulary anywhere in the codebase or the contract.

These pre-existing mismatches make a clean enum-layer reassessment impossible without first reconciling the layers, because half the proposed amendments would extend a stale baseline (e.g., adding `manual_authoring` to `SLT.provenance.origin` requires picking which of the two existing four-value sets to extend).

**Source context**: `reports/story-skills-taxonomies.md` (external reassessment) + this brainstorm's triage findings. The triage's per-proposal verdicts (accepted as proposed / accepted with modification / rejected) feed directly into the workstreams below.

### Key design decisions

- **Single spec, not N tickets.** The thirteen reassessment items are interconnected: BEL's epistemic split (Workstream 3) feeds the predicate DSL's refined `belief(...)` (Workstream 5); the shared `action_family` taxonomy (Workstream 4) feeds the new `affordance_available_to(...)` predicate (Workstream 5). Decomposing into independent tickets first would force re-litigation of the coordinations during implementation. The spec captures the architectural coherence; ticket decomposition (via `spec-to-tickets`) is a downstream phase.
- **Reject the "controlled-open" vocabulary policy framing.** The external reassessment's headline proposal — split story-state vocabularies into "hard-closed operational enums" vs "controlled-open semantic taxonomies" with a registry of definitions, examples, and consumers — was considered and rejected. Worldloom's existing discipline (closed enums + amend-the-contract per FOUNDATIONS §Story Bundles §5b) already provides the governance the proposal targets: the contract IS the registry, amendment IS the registration ceremony. Adding a meta-layer would impose author overhead without runtime benefit. The substantive enum expansions the reassessment bundles under the framing (shared `action_family`, defined `STENT.role_in_story`, defined `SREL.axis`) are accepted on their own merits as closed enums.
- **Keep `event_kind` field name; only trim its values.** Renaming `event_kind` → `event_origin` was considered and rejected — the rename would force coordinated edits across `tools/patch-engine/src/ops/create-se-record.ts`, the validator schema for `SE`, all seven story-pipeline skill prose files, and every test fixture, without operational benefit (the field's semantics are unchanged). The accepted value-level changes (drop `world_block`, split `repair`) deliver the diagnostic improvements without the cosmetic rename. Pragmatic softening **(pragmatic — strict-cleanup-by-rename would be valid in a greenfield rebuild, but this spec is amending an already-landed surface)**.
- **Reconcile `SREL.axis` to the grammar's existing 14 axes, not the reassessment's proposed 12.** `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:58-73` already encodes a 14-axis vocabulary that includes load-bearing axes the reassessment dropped (`debt`, `power_imbalance`, `hostility`, `attention`, `desire`, `approval`, `intimacy`). The grammar is the implementation truth; the contract should adopt it verbatim with operational definitions added per axis.
- **Trim `move_family` of arc-positional residues.** The reassessment's proposed 20-value `move_family` taxonomy is mostly causal-move-flavored but retains four arc-positional values (`aftermath`, `consequence_payoff`, `transition`, `closure`) that FOUNDATIONS §Story Bundles §5a explicitly forbids as commitment-block framing. The spec adopts the trim to 16 strictly-causal values; the four trimmed concepts remain expressible as state effects (state-delta closes) or as plain pacing without an enum value.
- **Defer `BEL.visibility` vocabulary expansion until FOUNDATIONS §6a is amended in lockstep.** FOUNDATIONS §Story Bundles §6a documents `BEL.visibility: private | shared | public | concealed | suppressed` as the canonical set. Adding `factional` and `rumored` requires editing FOUNDATIONS as part of this spec's deliverables, not just the contract. The lockstep edit is included; without it the contract would silently diverge from FOUNDATIONS, violating the contract's own §12 rule that FOUNDATIONS wins on disagreement.

## Approach

Six coordinated workstreams, applied in this order to avoid mid-implementation re-litigation of pre-existing drift.

1. **Workstream 1 — Contract/schema reconciliation (pre-spec cleanup).** Resolve the three SLT contract↔schema mismatches and the predicate DSL contract↔grammar mismatch before any new enum values land. Each mismatch is resolved by picking the implementation-truth side (the schema or the grammar) and aligning the contract to it, except where the schema's values are themselves the drift artifact and the contract names are clearer.
2. **Workstream 2 — Schema-minimalism enum cleanups.** Normalize `PG.entity_status` (drop `missing` from life; add `coerced`, `incapacitated`, `unknown` to agency; add `concealed`, `offstage` to location). Refine mystery claim `status` (`advanced` → `clue_added | narrowed | apparent_resolution`). Add `action` to `SLT.beats.function`. Trim `SE.event_kind` (drop `world_block`, split `repair` into `system_repair | audit_repair`).
3. **Workstream 3 — Vocabulary expansions.** Define `STENT.role_in_story` as a closed 12-value list. Split BEL's epistemic block (`belief_mode` separated from `confidence`; add `future_contingent` to `truth_relation`; add `factional` and `rumored` to `visibility` with FOUNDATIONS lockstep). Rename `SLT.purpose` → `move_family` with a 16-value causal-move taxonomy.
4. **Workstream 4 — Shared `action_family` taxonomy.** Replace both `PG.visible_affordances[].action_families` (ad-hoc) and `SLT.exit_options[].intent` (different vocabulary) with one shared 20-value `action_family` taxonomy. Remove the `custom` escape hatch from `exit_options`.
5. **Workstream 5 — Predicate DSL expansion.** Add `record_active`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to` predicates to the closed grammar. Deprecate `has_affordance` to author-pool prefilter only (preserving the actor-agnostic check for batch synthesis while the engine uses actor-specific affordance grounding for plan-time eligibility).
6. **Workstream 6 — Record-class inventory + provenance amendment.** Add `SLB`, `SAU`, `SP`, `RSP` auxiliary classes to the contract's §3 inventory. Add `manual_authoring` to `SLT.provenance.origin` (after Workstream 1 reconciles the existing four-value set).

The contract markdown is the human-readable canon for these surfaces; the JSON schemas under `tools/validators/src/schemas/` and the TypeScript grammar at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` are the implementation-truth surfaces. Both update in lockstep with the contract; FOUNDATIONS §Story Bundles §6a updates in lockstep with the BEL changes.

## Deliverables

### Workstream 1 — Contract/schema reconciliation

| Path | Change |
|---|---|
| `.claude/skills/_shared-templates/story-state-contract.md` §4.4 | `SLT.provenance.origin` enum: contract currently says `bootstrap_seed \| author_batch \| audit_repair \| runtime_jit`; schema (`story-storylet.schema.json:278`) says `bootstrap_seed \| focus_authoring \| audit_remediation \| runtime_jit`. Reconcile by canonizing the contract's names (`author_batch`, `audit_repair`) — they are clearer to authors. |
| `tools/validators/src/schemas/story-storylet.schema.json:278` | Rename schema enum values `focus_authoring` → `author_batch`, `audit_remediation` → `audit_repair`. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.4 | `SLT.scope.visibility` enum: contract says `author_pool \| branch_scoped` (2); schema (`story-storylet.schema.json:292`) says `global_author_pool \| branch_prefix_scoped \| branch_scoped` (3). The schema's three-way split has operational meaning: `global_author_pool` is bundle-wide; `branch_prefix_scoped` is shared by a branch and its descendants; `branch_scoped` is leaf-branch-only. Canonize the schema's three-value set in the contract. |
| `tools/validators/src/schemas/story-storylet.schema.json:292` | No change (schema already correct; contract aligns to it). |
| `tools/validators/src/schemas/story-storylet.schema.json:174` | `SLT.mystery_policy.allowed_authority` enum currently shows `["apparent", "branch_local_counterfactual", "canon_candidate"]`; the contract has a fourth value `none`. Add `none` to the schema enum to match contract. |
| `.claude/skills/_shared-templates/story-state-contract.md` §5 | Predicate DSL contract↔grammar reconciliation. The contract currently claims 10 closed predicates (`fact_true \| belief \| entity_status \| relationship_axis \| obligation_open \| consequence_pending \| thread_active \| location \| has_affordance \| all/any/not`); the grammar (`predicate-dsl-grammar.ts:4-26`) defines 21 PRED_TYPES. Audit the grammar's full set, identify which entries are load-bearing (consumed by `rule_storylet_predicate_dsl_parsability.ts` and storylet preconditions) vs which are legacy from the prior storylet-pool-authoring pipeline. Canonize the live set in the contract; remove dead entries from the grammar. The §5 table grows to match. |
| `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:1` | Update file-header comment ("derived from .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md") to reference the canonical contract path instead — the storylet-pool-authoring skill no longer exists in the rebuilt family (replaced by `commitment-block-authoring`). |

### Workstream 2 — Schema-minimalism enum cleanups

| Path | Change |
|---|---|
| `.claude/skills/_shared-templates/story-state-contract.md` §4.2 | `PG.entity_status.life`: `alive \| dead \| incapacitated \| missing \| unknown` → `alive \| dead \| unknown`. (`incapacitated` moves to agency; `missing` is expressible as `life: unknown` + `location: unknown\|concealed`.) |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.2 | `PG.entity_status.agency`: `free \| constrained \| captive \| unconscious \| dead` → `free \| constrained \| coerced \| captive \| incapacitated \| unconscious \| dead \| unknown`. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.2 | `PG.entity_status.location`: `STLOC-NNNN \| unknown` → `STLOC-NNNN \| unknown \| concealed \| offstage`. |
| `tools/validators/src/schemas/story-page.schema.json` | Add nested validation for `state_snapshot.entity_status.*` (currently the schema only validates top-level PG structure). Encode the three enums per the new contract values. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.2 | `unresolved_mystery_claims[].status`: `preserved \| advanced \| held_for_promotion` → `preserved \| clue_added \| narrowed \| apparent_resolution \| held_for_promotion`. |
| `tools/validators/src/schemas/story-page.schema.json` | Add nested validation for `state_snapshot.unresolved_mystery_claims[].status` enum. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.4 | `SLT.beats.function`: `setup \| pressure \| turn \| consequence \| exit` → `setup \| action \| pressure \| turn \| consequence \| exit`. |
| `tools/validators/src/schemas/story-storylet.schema.json:140` | Add enum constraint to the `beats[].function` property (currently `type: string` with no enum). |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.3 | `SE.event_kind`: drop `world_block` (redundant with `outcome_route` value of same name); split `repair` into `system_repair \| audit_repair`; keep `prose_attach` (required by `branching-story-prose-attach`'s `emit_attach_event=true` path); keep field name as `event_kind`. New enum: `story_start \| selected_choice \| write_in_attempt \| system_repair \| audit_repair \| prose_attach \| promotion_closeout`. |
| `tools/validators/src/schemas/story-event.schema.json` | Add enum constraint to `event_kind` per the new contract values. |
| `.claude/skills/branching-story-prose-attach/SKILL.md` | No prose change (the skill already names `event_kind: prose_attach` and emits a single `create_se_record` op when `emit_attach_event=true`; the value remains valid post-cleanup). |
| `.claude/skills/branching-story-turn-cycle/SKILL.md` | Any prose mentioning `event_kind: world_block` updates to reflect the redundancy fix (engine emits `outcome_route: world_block` on a no-op SE rather than a separate `event_kind: world_block`). |
| `.claude/skills/branching-story-health-audit/SKILL.md` | Audit prose mentioning `event_kind: repair` updates to differentiate `system_repair` (engine-initiated, e.g., schema gate failure repair) from `audit_repair` (audit-finding-driven). |

### Workstream 3 — Vocabulary expansions

| Path | Change |
|---|---|
| `.claude/skills/_shared-templates/story-state-contract.md` (new §4.6 or §3 sub-block) | Define `STENT.role_in_story` as a closed list field (not scalar — multi-valued). Values: `viewpoint \| player_proxy \| primary_actor \| opposing_actor \| allied_actor \| authority \| dependent \| witness \| information_source \| pressure_source \| social_bridge \| background` with one-sentence operational definitions per value. |
| `tools/validators/src/schemas/story-entity.schema.json` | Add enum constraint on `role_in_story` (currently absent or untyped). Constrain to a `type: array` with `items: { enum: [...] }`. |
| `tools/world-mcp/src/context-packet/shared.ts` | Update type signature: `role_in_story: string` → `role_in_story: RoleInStory[]` (where `RoleInStory` is the closed enum). Update `tools/world-mcp/src/context-packet/story-bundle-context.ts`'s `asString(entry.role_in_story)` call accordingly to project a list. |
| `.claude/skills/branching-story-bootstrap/SKILL.md` | Replace any `role_in_story` example prose with the closed-vocabulary values; remove any open-string framing. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.1 | `BEL` schema gains a new required field `belief_mode` (10 values: `knows \| believes \| suspects \| doubts \| denies \| reports \| claims \| deceives \| misremembers \| interprets`). |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.1 | `BEL.truth_relation` adds `future_contingent` (for oaths, predictions, threats). New set: `true \| false \| partly_true \| unknown \| contested \| branch_counterfactual \| future_contingent`. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.1 | `BEL.confidence` shrinks to subjective-certainty axis only: `certain \| high \| medium \| low \| uncommitted`. Removes the conflated `rumor` and `performative_lie` values (now expressed via `belief_mode: reports`/`belief_mode: deceives` plus `visibility`). |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.1 | `BEL.visibility` adds `factional` and `rumored`. New set: `private \| shared \| factional \| public \| rumored \| concealed \| suppressed`. |
| `tools/validators/src/schemas/story-belief.schema.json:31-37` | Update three enum constraints to match new values; add `belief_mode` as a required property. |
| `docs/FOUNDATIONS.md` §Story Bundles §6a | Update the documented `BEL.visibility` set to include `factional` and `rumored`. Update the documented `BEL.truth_relation` set to include `future_contingent`. Add a one-line mention of the new `belief_mode` field separating sincerity/mode from confidence. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.4 | Rename `SLT.purpose` field → `move_family`. New 16-value taxonomy (causal-move-only; arc-positional residues trimmed): `orient \| world_pressure \| pursuit \| investigation \| disclosure \| negotiation \| bond_shift \| status_shift \| conflict \| evasion \| protection \| resource_exchange \| transformation \| ritual_protocol \| decision \| recovery`. Each value gets a one-sentence operational definition. |
| `tools/validators/src/schemas/story-storylet.schema.json` | Rename property `purpose` → `move_family`; add enum constraint with the 16 values. |
| `.claude/skills/commitment-block-authoring/SKILL.md` | Replace all `purpose` references with `move_family`. Update the per-mode authoring guidance to reflect the new taxonomy's causal-move framing. |
| `.claude/skills/branching-story-turn-cycle/SKILL.md` | Update SLT-selection guidance prose to reference `move_family`. |
| `.claude/skills/branching-story-health-audit/SKILL.md` | Update audit prose to reference `move_family`. |
| `.claude/skills/_shared-templates/story-state-contract.md` (new §3a or §4 sub-block) | Define `SREL.axis` as a closed list lifted from the grammar's existing 14 axes (`trust \| fear \| desire \| debt \| intimacy \| loyalty \| resentment \| power_imbalance \| attention \| familiarity \| approval \| respect \| obligation \| hostility`) with one-sentence operational definitions per axis. |
| `tools/validators/src/schemas/story-relationship.schema.json` | Add enum constraint on `axis` (currently absent). |
| `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:58-73` | No change to the values (already canonical); only the file-header comment update from Workstream 1 applies. |

### Workstream 4 — Shared `action_family` taxonomy

| Path | Change |
|---|---|
| `.claude/skills/_shared-templates/story-state-contract.md` (new §3b or as part of §4.4) | Define `action_family` as a single 20-value shared taxonomy: `move \| evade \| pursue \| perceive \| investigate \| communicate \| persuade \| negotiate \| bond \| oppose \| harm \| protect \| control \| transfer \| use \| make_change \| ritual_protocol \| recover \| wait \| decide`. One-sentence operational definition per value. Note that this is a coarse top-level taxonomy; per-affordance and per-exit-option `surface_hint: string` and `likely_effects: [<label>]` fields carry local specificity. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.2 | `PG.visible_affordances[].action_families`: examples remove `escape, hide, pursue` ad-hoc list, reference the shared `action_family` taxonomy by name. Field becomes `action_families: [<action_family>]`. |
| `tools/validators/src/schemas/story-page.schema.json` | Add enum constraint on `state_snapshot.visible_affordances[].action_families` items per the shared taxonomy. |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.4 | `SLT.exit_options[].intent` → `SLT.exit_options[].action_family` (field rename). Remove `custom` value (no escape hatch in committed records). Use the shared 20-value taxonomy. |
| `tools/validators/src/schemas/story-storylet.schema.json` | Add validation for `exit_options[]`: rename `intent` property → `action_family`; add enum constraint with the 20 values. |
| `.claude/skills/commitment-block-authoring/SKILL.md` | Update authoring prose: exit options are typed by `action_family`, not `intent`. Remove any "custom" escape-hatch language. |
| `.claude/skills/branching-story-bootstrap/SKILL.md` + `branching-story-turn-cycle/SKILL.md` | Update affordance-construction prose to reference the shared `action_family` taxonomy by name when authoring `PG.visible_affordances`. |

### Workstream 5 — Predicate DSL expansion

| Path | Change |
|---|---|
| `.claude/skills/_shared-templates/story-state-contract.md` §5 | Add five new closed predicates: `record_active(<record_id>)` (record must be active in current PG snapshot; accepts STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / DA); `intention_active(STINT-NNNN)`; `object_accessible(STENT-NNNN, STOBJ-NNNN)`; `artifact_accessible(STENT-NNNN, DA-NNNN)`; `affordance_available_to(STENT-NNNN, <action_family>)`. One-line consumer notes per predicate. |
| `.claude/skills/_shared-templates/story-state-contract.md` §5 | Deprecate `has_affordance(<action_family>)` to author-pool prefilter only — explicitly note that branch-execution eligibility checks use `affordance_available_to(<actor>, <family>)`. |
| `.claude/skills/_shared-templates/story-state-contract.md` §5 | Refine `belief(holder, claim, confidence?)` → `belief(holder, claim, mode?, confidence_floor?)` to consume the new BEL split (mode = `belief_mode` value; confidence_floor = minimum `confidence` value). |
| `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` | Add the five new predicate names to `PRED_TYPES`; add helper constants for the new predicates' argument schemas (mirroring `STOP_PREDICATE_ARG_SCHEMAS`). |
| `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` | Extend parser to validate the new predicates' argument shapes (record-id classes, action_family values, BEL belief_mode + confidence_floor cross-references). |
| `.claude/skills/commitment-block-authoring/SKILL.md` | Update predicate-authoring guidance: prefer `affordance_available_to` over `has_affordance` for branch-scoped blocks; document the new accessibility predicates. |
| `.claude/skills/branching-story-turn-cycle/SKILL.md` | Update eligibility-evaluation prose to consume the new actor-specific affordance predicate. |

### Workstream 6 — Record-class inventory + provenance amendment

| Path | Change |
|---|---|
| `.claude/skills/_shared-templates/story-state-contract.md` §3 | Split the record-class inventory into two tables. **Core page-cycle state records** (existing 16: STENT through SLT) and **Auxiliary story-bundle records** (new section): `SLB` (storylet/commitment-block batch manifest), `SAU` (story-bundle audit), `SP` (story-promotion record), `RSP` (remediation/response card scoped under an audit). |
| `.claude/skills/_shared-templates/story-state-contract.md` §4.4 | `SLT.provenance.origin` adds `manual_authoring` (one-off block authored outside a batch). Final set after Workstream 1 reconciliation: `bootstrap_seed \| manual_authoring \| author_batch \| audit_repair \| runtime_jit`. (`promotion_closeout` is NOT added — `story-promotion-closeout` does not create SLT records per its skill description.) |
| `tools/validators/src/schemas/story-storylet.schema.json:278` | Add `manual_authoring` to the (now-reconciled) provenance enum. |

## Risks & Open Questions

- **Predicate DSL reconciliation outcome.** Workstream 1 calls for an audit of which entries in `PRED_TYPES` (21 values), `FACT_MATCHES_PREDICATES` (7 values), and `STOP_PREDICATES` (19 values) are load-bearing vs legacy from the prior storylet-pool-authoring pipeline. The audit's outcome affects the size of the §5 table in the contract and the deletions in `predicate-dsl-grammar.ts`. **Risk (pragmatic — full audit could expand spec scope)**: if more than half the grammar entries are dead code, the cleanup is large; if fewer than half, the cleanup is targeted. Either way the audit must precede Workstream 5's new predicate additions to avoid stacking new predicates on a stale grammar. Open question: should the audit be folded into this spec's implementation or extracted to a follow-up cleanup ticket? Recommended: fold in, because Workstream 5 needs the audited base.
- **`SLT.scope.visibility` three-way model.** The schema's `global_author_pool | branch_prefix_scoped | branch_scoped` is more expressive than the contract's `author_pool | branch_scoped`. The contract aligning to the schema preserves the existing implementation, but the seven story-pipeline skills' prose may need to be re-audited to confirm they correctly handle `branch_prefix_scoped`. **Risk (structural)**: if skills currently treat any branch-scoped block as leaf-only, `branch_prefix_scoped` is a latent bug. Open question: does any skill currently emit `branch_prefix_scoped`-tagged SLTs?
- **`move_family` arc-positional trim.** The spec drops four values (`aftermath`, `consequence_payoff`, `transition`, `closure`) from the reassessment's proposed 20-value taxonomy on the grounds that they are arc-positional, not causal-move. If author experience surfaces a need for one of these post-implementation (e.g., authors find no natural value for what is currently `aftermath`-flavored blocks), the contract is amendable. **Risk (pragmatic — could resurface)**: trimmed values can be re-added; the cost is one contract amendment plus schema-enum update.
- **`BEL.belief_mode` adoption cost in authoring.** Adding a required field to BEL is a schema-breaking change. The user has stated the rebuilt story-skills have not yet been used in production, so there is presumed to be zero `_source/.../bel/*.yaml` corpus to migrate; verify before implementation. **Risk (structural)**: if any pilot BEL records exist, they need re-validation under the new required `belief_mode`.
- **`role_in_story` projection in `context-packet/shared.ts`.** Changing `role_in_story: string` to `role_in_story: RoleInStory[]` is a TypeScript breaking change to the public context-packet shape. Consumers of `story_bundle_context.entities[].role_in_story` need to handle the list shape. **Risk (structural)**: identify all consumers before implementation; the projection change should land in the same patch as the schema change.
- **FOUNDATIONS lockstep timing.** Workstream 3 amends `docs/FOUNDATIONS.md` §Story Bundles §6a in the same spec as the contract changes. FOUNDATIONS edits are higher-stakes than contract edits (broader read surface, governs more than just story-skills). The amendment is small (extend documented BEL.visibility and BEL.truth_relation sets; mention the new belief_mode field) but it must land *before* the contract's BEL schema change is published, to honor the contract's §12 "FOUNDATIONS wins on disagreement" rule.

## Out of Scope

- **Migration of pre-existing story bundles.** Assumed none exist (user reports the rebuilt skills have not yet been used). If any pilot bundles exist, migration is a follow-up task.
- **The "controlled-open" vocabulary policy framing.** Considered and rejected at triage time; see Problem Statement §Key design decisions.
- **`STENT.role_in_story` registry-style governance.** The closed-list approach is intentional; controlled-open governance is rejected per the same decision.
- **`SE.event_kind` field rename to `event_origin`.** Cosmetic; rejected per the same decision.
- **Per-skill workflow phase updates beyond contract references.** Each story-pipeline SKILL.md will need prose updates to consume the new vocabularies; those updates are bounded edits (per the Deliverables tables above) and do not change skill workflow shape.
- **Compiler/parser implementations of the new predicates' runtime evaluation.** This spec specifies the grammar and validator-side argument-shape checks; the runtime evaluator (which executes predicates against `PG.state_snapshot`) is unchanged in this spec — it consumes the same predicate-name dispatch.
- **Word-count guidance, render-time directives, or prose-quality contract changes.** This spec amends story-state structure only; per FOUNDATIONS §Story Bundles §9, length follows content and is not part of the contract surface.
- **New record classes.** This spec extends inventories and vocabularies for existing classes only; no new record class (no `STORY`, `EPISODE`, `CHAPTER`, etc.) is introduced.
