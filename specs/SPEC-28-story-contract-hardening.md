<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-28: Story Contract Hardening — Pre-Production Schema and Skill-Contract Fixes

**Status**: DRAFT — produced 2026-05-15; not yet reassessed against the codebase or decomposed into tickets.
**Supersedes**: nothing. Additive hardening of the shared story-state contract plus the story-pipeline skill surfaces and the context-packet contract.
**Source**: triage of `reports/story-related-improvements-third-iteration.md` — a "third iteration" external review (ChatGPT-Pro) of the branching-story system, conducted against `docs/FOUNDATIONS.md`, the seven story-pipeline skills, and `.claude/skills/_shared-templates/` only — with **no access to `tools/`, `docs/HARD-GATE-DISCIPLINE.md`, or `docs/CONTEXT-PACKET-CONTRACT.md`**. The report offered 10 P0, 5 P1, and 1 P2 items; each was reassessed against the working tree. The full per-item triage is recorded at `docs/triage/2026-05-15-story-related-improvements-triage.md`.

## Problem Statement

`reports/story-related-improvements-third-iteration.md` reviews a post-SPEC-27 snapshot of the branching-story system. Its executive judgment — the architecture is sound and needs contract hardening, not conceptual redesign — is **confirmed** against `docs/FOUNDATIONS.md` §Story Bundles; its "what not to add" list (no act structure, no global drama manager, no generic quality bag, no prose-as-state) matches FOUNDATIONS §5c almost verbatim. The report's weakness is **categorization, not diagnosis**: because it could not see the non-story-skill surfaces, it re-proposed a concern SPEC-27 shipped the same day (its P0.5 ↔ SPEC-27 D4), miscategorized two feature-additions as P0 contract bugs (its P0.4, P0.5), and built a "purge legacy vocabulary" task on a misread of an already-completed greenfield rebuild (its P0.10).

Reassessment against the working tree recalibrates the 16 intake items to **seven accepted deliverables** (D1–D7) and nine rejections (see §Out of Scope). Each accepted deliverable closes a gap verified against the current files:

1. **prose-attach hash-drift behavior is undefined by contradiction.** `branching-story-prose-attach/SKILL.md` argument prose says `accept_plan_drift=false` makes a `plan_hash` / `state_hash` mismatch "fail the receipt", but Phase 2 says drift is recorded in `notes` and "the verdict is exclusively driven by the 7 deterministic checks at Phase 3" — none of which is a hash check. The skill cannot say whether hash drift fails the receipt.
2. **`SLT.saliency.cooldown_pages` is a dead field.** `branching-story-turn-cycle` Phase 2 asserts `saliency.cooldown_pages` "permits use" with zero enforcement logic; no `SE` or `PG` field records which `SLT` fired on which page, so cooldown is unenforceable by any deterministic mechanism — a §5b violation that SPEC-24's per-property minimalism audit did not catch, because SPEC-24 audited whether *present* fields are load-bearing, not whether the engine can *enforce* them.
3. **SPEC-27 D7's §6b observer firewall is not auditable post-hoc.** D7 added the move-generation firewall, but `BEL.basis` records only `source_event`; `story-state-contract.md:85-86` *explicitly* discards the access-route refinement ("`witnessed_page`, `told_by`, `inferred_from` … are not retained at this layer"), so `branching-story-health-audit` Phase 2d must re-derive each belief's access route from prose/plans rather than read it.
4. **SPEC-27 D6's count cascade is incomplete.** D6 added "Canon Baseline Drift" as `branching-story-turn-cycle`'s 7th turn-cycle-additional check (Phase 9) and `branching-story-health-audit`'s 8th structural sub-phase (2h), but turn-cycle's HARD-GATE block still says "the 6 turn-cycle-additional checks" and health-audit still says "Seven sub-phases run in sequence." Separately, health-audit cites the prose receipt as `§4.5`; the shared contract defines it at `§4.6`.
5. **The promotion-package template carries a semantically wrong instruction.** `source_basis.direct_user_approval` is inert repo-wide (no validator, skill, or patch-engine op reads it) and `story-fact-promotion-to-canon`'s implementation already keeps it `false` — but the template *comments* in `SKILL.md` and `templates/proposal-package.yaml` say "set true at Phase 7 HARD-GATE approval". Package approval authorizes *proposal creation*, not *canon acceptance*; canon acceptance is `canon-addition`'s exclusive authority. Separately, `derived_from: [<parent CF id … or null if novel>]` yields `[null]` for novel candidates — a null-inside-an-ID-list hazard, inconsistent with the flat `[]` SPEC-24 already established for `SF.derived_from`.
6. **`story-promotion-closeout` contradicts itself on supersession.** `SKILL.md` line 177 says supersede story-local source records "only when an amended-schema field must change"; the line-221 validation gate says "every source record gets a corresponding supersession … Missing supersessions for accepted-flavored verdicts indicate the closeout is incomplete; abort." The two cannot both hold.
7. **Every story-pipeline context packet silently loses mysteries / cast / invariants.** `docs/CONTEXT-PACKET-CONTRACT.md` §6 and `tools/world-mcp/src/context-packet/story-bundle-context.ts` both read STORY_KERNEL.md *YAML frontmatter* fields `mysteries_in_play`, `cast_bind_list`, and `invariants_acknowledged` — but `branching-story-bootstrap` produces STORY_KERNEL.md as eight ordered markdown sections with **no frontmatter at all**. `parseStoryKernelFrontmatter` returns `{}`, so every `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` context packet reports zero mysteries, zero cast bindings, and zero acknowledged invariants.

### Key design decisions

- **Considered the report's full `SE.commitment` block (`selected_slt_id`, `selection_source`, `actor_binding`, `target_bindings`, `alias_bindings`); chose to trim `actor_binding` and `target_bindings`** because `SE` already carries `actor` and `targets` — duplicating them would itself violate §5b. D2 keeps `selected_slt_id`, `selection_source`, and `alias_bindings` (the alias→record map has no existing equivalent and is required to replay a block's predicate-DSL bindings). *(structural — minimalism applied to the fix.)*
- **Considered deferring P0.3 (`BEL.basis` access routes) because it reverses an explicit §5b minimalism decision; chose to include it (user-confirmed)** because SPEC-27 D7's §6b observer firewall — shipped 2026-05-15 — gives `access_route` / `access_records` a concrete downstream consumer (`branching-story-health-audit` Phase 2d's `observer_firewall_violation` finding), clearing the §5b load-bearing bar. D3 therefore *rewrites* the `story-state-contract.md:85-86` "not retained" note rather than leaving it contradictory.
- **Considered P0.5 (structured `validation_trace` with `authority_refs`) as an accept; rejected it on verification** because SPEC-27 D4 — shipped the same day — already generalized authority-cited HARD-GATE rationale discipline via `docs/HARD-GATE-DISCIPLINE.md` (the discipline route, not a schema restructure), and no validator consumes a structured `validation_trace`. The report flagged it as a gap only because `HARD-GATE-DISCIPLINE.md` was outside its input set.
- **Considered P0.10 (purge legacy ARC vocabulary) as an accept; rejected as framed** because exact-match search confirmed the live story skills and `story-state-contract.md` carry zero occurrences of `arc_archetype` / `narrative_point` / `arc_trace` — the greenfield story-skill rebuild already purged them — and the tools-layer survivors are partly *deliberate* (`docs/triage/2026-05-14-story-state-contract-property-audit-triage.md` records SCAUD-003 retaining the `commitment_family` / `commitment_class` MCP vocabulary surface intentionally). The one genuine residue, the stale "shape/intensity counts" line in `CONTEXT-PACKET-CONTRACT.md`, folds into D7.
- **Considered prescribing the report's exact `hash_integrity` 8th-check schema for D1; chose to require only the load-bearing outcome** — that hash drift becomes *verdict-driving* when `accept_plan_drift=false`, resolving the contradiction — and leave the receipt shape (an 8th entry in `checks:` versus a separate receipt field) to ticket-time judgment.
- **Considered scoping P0.6 out as janitorial; kept it in (D4)** because two of its three mismatches are SPEC-27 D6's own incomplete count cascade — leaving them desyncs the skills' HARD-GATE prose from their just-shipped validators and invites the exact drift D4 corrects.

## Approach

Seven deliverables. D1–D3 amend `.claude/skills/_shared-templates/story-state-contract.md` (schema surfaces) and the story-pipeline skills that produce/consume those records; D4–D7 reconcile skill-contract prose, a producer template, and `docs/CONTEXT-PACKET-CONTRACT.md`. SPEC-28 amends contracts and skill prose; ticket decomposition sequences the implementation.

**Enabling fact**: there are zero production story bundles — SPEC-24 removed the red-bunny test bundle and re-bootstrapping has not produced a replacement — so every schema amendment in D1–D3 is a pure greenfield change with no migration or retrofit cost. Every rejection in §Out of Scope is therefore **structural**, not a pragmatic / migration-cost softening.

### D1 — prose-attach hash-drift contract reconciliation (intake P0.1)

**Implementation note (2026-05-15, SPEC28STOCONHAR-001).** D1 is landed. The live `branching-story-prose-attach` skill and `story-state-contract.md` §4.6 now use `checks.hash_integrity` as the eighth deterministic prose-receipt check. Remaining D1 intake wording below is historical context for why the ticket existed.

**Intake state.** `branching-story-prose-attach/SKILL.md`'s `accept_plan_drift` argument prose said a mismatch under `accept_plan_drift=false` "fails the receipt"; Phase 2 said drift was recorded in `notes` and "the verdict is exclusively driven by the 7 deterministic checks at Phase 3". None of the seven checks (`engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `choice_consequence_visibility`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`) inspected the plan/state hash. The two passages contradicted.

**Change.** Make hash drift verdict-driving when `accept_plan_drift=false`. The recommended resolution adds an eighth deterministic receipt check, `hash_integrity`, with three-valued semantics — `PASS` (recorded `plan_hash` / `state_hash` match the computed values and are sha256-shaped), `WARN` (drift accepted because `accept_plan_drift=true`), `FAIL` (mismatch with `accept_plan_drift=false`, or PG hash fields missing / placeholder / non-sha256). `story-state-contract.md` §4.6 (prose receipt) gains the `hash_integrity` field; `branching-story-prose-attach/SKILL.md` updates every "7 deterministic checks" reference to eight and aligns Phase 2 + the HARD-GATE summary with the new verdict-driving behavior. The exact receipt shape (8th `checks:` entry vs. a separate receipt field) is a ticket-time decision; the load-bearing requirement is only that the contradiction is resolved in favor of hash drift being verdict-driving. Ticket SPEC28STOCONHAR-001 confirmed the live prose-attach skill did contain a placeholder-hash subcase; D1 absorbs that subcase into `hash_integrity: FAIL` because placeholder hashes are not valid page-plan/state hashes.

**Surfaces.** `branching-story-prose-attach/SKILL.md`; `story-state-contract.md` §4.6.

### D2 — `SE.commitment`: record the selected `SLT` and its bindings (intake P0.2)

**Current state.** `branching-story-turn-cycle` selects an `SLT`, resolves its predicate-DSL aliases, binds an actor, applies effects, and writes a `PG` — but `SE` (§4.3) has no field for the selected `SLT` or the resolved binding map, and `PG` does not either. `SLT.saliency.cooldown_pages` is consequently a dead field: turn-cycle Phase 2 says it "permits use" with no enforcement, because nothing records which `SLT` fired on which page.

**Change.** `story-state-contract.md` §4.3 (`SE`) gains a `commitment:` block:

```
commitment:
  selected_slt_id: SLT-<integer> | null   # null iff selection_source is none
  selection_source: emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none
  alias_bindings:
    <alias>: <record_id>
```

Rules: `selection_source: none` (and therefore `selected_slt_id: null`) exactly for `event_kind ∈ {story_start, prose_attach, promotion_closeout}`; every `bound:<alias>` referenced by the selected block's preconditions/effects must appear in `alias_bindings`. Actor and target binding reuse the **existing** `SE.actor` and `SE.targets` fields — `commitment:` does not duplicate them. `branching-story-turn-cycle` Phase 2 writes `commitment:` on the emitted `SE` and gains the actual cooldown check (scan prior `SE.commitment.selected_slt_id` along `PG.branch_path` against `SLT.saliency.cooldown_pages`); `branching-story-health-audit` consumes `commitment:` in its replay sub-phases so it can deterministically answer "why did this move fire?" and verify the bound actor against the §6b firewall.

**Surfaces.** `story-state-contract.md` §4.3; `branching-story-turn-cycle/SKILL.md` (Phase 2 write + cooldown enforcement); `branching-story-health-audit/SKILL.md` (replay/audit consumption).

### D3 — `BEL.basis` access routes: make the §6b observer firewall auditable (intake P0.3)

**Current state.** SPEC-27 D7 added the §6b observer firewall gating move/choice generation against the acting entity's `BEL` state, but `BEL.basis` records only `source_event`, and `story-state-contract.md:85-86` explicitly states the access-route refinements "are not retained at this layer." `branching-story-health-audit` Phase 2d must therefore re-derive each belief's access route from prose/plans/notes.

**Change.** `story-state-contract.md` §4.1 (`BEL`) amends `basis`:

```
basis:
  source_event: SE-<integer>*
  access_route: direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization
  access_records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | DA-<integer> | BEL-<integer> | SF-<integer> | SE-<integer>]
```

The `access_route` enum aligns with the routes FOUNDATIONS §6b already enumerates ("direct observation, testimony, document, inference, surveillance, institutional channel, magic/tech, or another canonically valid mechanism"). The `story-state-contract.md:85-86` "not retained" note is **rewritten** to state that `basis.access_route` records *how* the holder gained access and `basis.access_records` cites the enabling records, consumed by `branching-story-health-audit` Phase 2d's `observer_firewall_violation` audit. `branching-story-turn-cycle` records `access_route` / `access_records` when it writes a `BEL` (the firewall check it already performs at move generation is now retained as state rather than discarded).

**Surfaces.** `story-state-contract.md` §4.1 (BEL schema) and the §5b "not retained" note; `branching-story-turn-cycle/SKILL.md` (BEL authoring); `branching-story-health-audit/SKILL.md` Phase 2d.

### D4 — count and citation cascade cleanup (intake P0.6)

**Implementation note (2026-05-15, SPEC28STOCONHAR-004).** D4 is landed. `branching-story-turn-cycle/SKILL.md` now states 7 turn-cycle-additional checks everywhere the Phase 9 count is operationally summarized. `branching-story-health-audit/SKILL.md` now states eight structural sub-phases and cites the prose receipt at `§4.6`. Remaining D4 intake wording below is historical context for why the ticket existed.

**Current state.** `branching-story-turn-cycle` HARD-GATE says "the 6 turn-cycle-additional checks" while Phase 9 enumerates seven (SPEC-27 D6 added "Canon Baseline Drift"). `branching-story-health-audit` says "Seven sub-phases run in sequence" while its process flow lists eight (2a–2h; SPEC-27 D6 added 2h "canon baseline drift"). `branching-story-health-audit` cites the prose receipt as `§4.5`; `story-state-contract.md` defines it at `§4.6`.

**Change.** Update turn-cycle's HARD-GATE to "7 turn-cycle-additional checks"; update health-audit's "Seven sub-phases" to "Eight sub-phases"; correct the health-audit `§4.5` prose-receipt citation to `§4.6`. The sweep also reconciles any count reference affected by D1's seven-to-eight deterministic-check bump in `branching-story-prose-attach`. This deliverable is documentation-only — no schema or behavior change — but it closes SPEC-27 D6's incomplete cascade and prevents skill/validator drift.

**Surfaces.** `branching-story-turn-cycle/SKILL.md`; `branching-story-health-audit/SKILL.md`.

### D5 — promotion-package authority consistency (intake P0.7)

**Current state.** `story-fact-promotion-to-canon/SKILL.md` (~line 198) and `templates/proposal-package.yaml` (~line 62) initialize `source_basis.direct_user_approval: false` with a comment "set true at Phase 7 HARD-GATE approval"; the skill's Phase 7 never actually sets it true, and no validator/skill/patch-engine op reads the field. `derived_from` is documented as `[<parent CF id if mirrored, or null if novel>]`, yielding `[null]` for novel candidates.

**Change.** Correct the misleading comments: `direct_user_approval` stays `false` through the entire `story-fact-promotion-to-canon` flow — package approval at the Phase 7 HARD-GATE authorizes *proposal creation*, not *canon acceptance*; `canon-addition` owns canon acceptance. Change the `derived_from` documentation so a novel candidate uses the flat empty list `[]`, never `[null]` and never branch ids — consistent with the flat `derived_from: []` SPEC-24 established for `SF`. Whether the inert `direct_user_approval` field should exist at all in the world-canon CF schema is out of scope (see §Out of Scope).

**Surfaces.** `story-fact-promotion-to-canon/SKILL.md`; `story-fact-promotion-to-canon/templates/proposal-package.yaml`.

### D6 — closeout supersession/disposition reconciliation (intake P0.8)

**Current state.** `story-promotion-closeout/SKILL.md` line 177 says supersede source records "only when an amended-schema field must change"; the line-221 validation gate effectively requires a supersession per source record for accepted-flavored verdicts and aborts on a "missing" one. The conditional and the mandatory readings contradict.

**Change.** Replace the supersession-count validation gate with an **explicit-disposition** requirement: the closeout ledger must record a `source_record_dispositions:` map carrying one disposition per source record in the proposal package's `source_records` inventory — `superseded` | `ledger_only` | `unchanged_no_schema_field_changed`. The line-177 wording (supersede only on a real schema-field change) is preserved; the gate now checks *completeness of disposition*, not *count of supersessions*. This keeps the closeout audit complete while preserving §5b schema-minimalism (no forced supersessions). The `SP-<integer>-closeout.md` ledger schema gains the `source_record_dispositions:` map.

**Surfaces.** `story-promotion-closeout/SKILL.md` (line-177/221 wording + validation gate + closeout-ledger schema).

### D7 — context-packet ↔ STORY_KERNEL.md frontmatter reconciliation (intake P0.9; absorbs the genuine sliver of intake P0.10)

**Current state.** `docs/CONTEXT-PACKET-CONTRACT.md` §6 states the story-bundle context layer is "populated from indexed story-bundle records plus `STORY_KERNEL.md` frontmatter" and carries `STORY_KERNEL.md` `mysteries_in_play`, `cast_bind_list`, and `invariants_acknowledged`; `tools/world-mcp/src/context-packet/story-bundle-context.ts` parses those frontmatter fields. `branching-story-bootstrap` produces STORY_KERNEL.md as eight ordered markdown sections with no frontmatter, so the parser always returns empty. The same contract paragraph still lists "shape/intensity counts" — retired storylet vocabulary.

**Change.** `branching-story-bootstrap`'s STORY_KERNEL.md contract gains a required YAML frontmatter block preceding the eight markdown sections, carrying the machine-read fields the context packet expects — `story_id`, `story_slug`, `root_branch_id`, `root_page_id`, `cast_bind_list`, `player_agency_surface`, `mysteries_in_play`, `invariants_acknowledged` — with a note that the frontmatter is authoritative for machine retrieval and the markdown sections (`## Cast and Roles`, `## Protected Mystery and Invariant Boundaries`) are its human rendering, kept in sync. `docs/CONTEXT-PACKET-CONTRACT.md` §6 drops the stale "shape/intensity counts" item and clarifies `story_bootstrap` task-type behavior: the bundle does not exist yet, so `story_slug` is accepted as a *target* slug and `story_bundle_context` is empty (a world-canon-only packet). `tools/world-mcp/src/context-packet/story-bundle-context.ts` already parses the frontmatter correctly; once bootstrap writes it, the silent-data-loss bug closes with no tools change. (`CONTEXT-PACKET-CONTRACT.md` was edited by SPEC-27 D6 in a different section — ticket authoring should rebase against the post-SPEC-27 file state.)

**Surfaces.** `branching-story-bootstrap/SKILL.md` (STORY_KERNEL.md contract); `docs/CONTEXT-PACKET-CONTRACT.md` §6.

## Deliverables

| ID | Deliverable | Primary surfaces |
|---|---|---|
| D1 | prose-attach hash-drift contract reconciliation (verdict-driving `hash_integrity`) | `branching-story-prose-attach/SKILL.md`; `story-state-contract.md` §4.6 |
| D2 | `SE.commitment` block — selected `SLT` + `alias_bindings`; cooldown enforcement | `story-state-contract.md` §4.3; `branching-story-turn-cycle/SKILL.md`; `branching-story-health-audit/SKILL.md` |
| D3 | `BEL.basis` access routes; rewrite the §5b "not retained" note | `story-state-contract.md` §4.1 + §5b note; `branching-story-turn-cycle/SKILL.md`; `branching-story-health-audit/SKILL.md` Phase 2d |
| D4 | count + citation cascade cleanup (completes SPEC-27 D6's cascade) | `branching-story-turn-cycle/SKILL.md`; `branching-story-health-audit/SKILL.md` |
| D5 | promotion-package authority consistency (`direct_user_approval` comments; `derived_from` → `[]`) | `story-fact-promotion-to-canon/SKILL.md`; `story-fact-promotion-to-canon/templates/proposal-package.yaml` |
| D6 | closeout supersession/disposition reconciliation (`source_record_dispositions:` map) | `story-promotion-closeout/SKILL.md` |
| D7 | context-packet ↔ STORY_KERNEL.md frontmatter reconciliation | `branching-story-bootstrap/SKILL.md`; `docs/CONTEXT-PACKET-CONTRACT.md` §6 |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Story Bundles §5b — Schema-Minimalism At Story Scope | aligns (with disclosed tension) | D2 adds `SE.commitment` only after establishing that `SLT.saliency.cooldown_pages` is currently a consumer-less dead field — itself a §5b violation; each new field is load-bearing (cooldown enforcement, replay, firewall audit). D3 adds `BEL.basis` access fields and **rewrites** the §5b "not retained" note — justified by SPEC-27 D7's §6b consumer. D2 trims the report's proposal (`actor_binding` / `target_bindings` dropped as duplicative of `SE.actor` / `SE.targets`). |
| Story Bundles §6b — Information / Observer Firewall (SPEC-27 D7) | aligns | D2's `alias_bindings` + `selected_slt_id` and D3's `access_route` / `access_records` make SPEC-27 D7's move-generation firewall auditable post-hoc — `branching-story-health-audit` Phase 2d reads a recorded access route instead of re-deriving it from prose. |
| Story Bundles §5a — Commitment Blocks Are Causal Moves | aligns | D2 records *which causal move fired* and *what it bound to* — pure causal-move provenance, with no arc / act / dramatic-shape semantics introduced. |
| Story Bundles §4a — Plan-Authority Boundary | aligns | D1's `hash_integrity` check protects the plan-hash ↔ rendered-prose boundary (a drifted prose render fails the receipt) while the receipt still never mutates the `PG` record. |
| Rule 1 — No Floating Facts | aligns | D2 resolves `SLT.saliency.cooldown_pages` from a floating, consumer-less field into a grounded, enforceable one. |

## Verification

- **D1**: `branching-story-prose-attach/SKILL.md` Phase 2 + the argument prose + the HARD-GATE summary agree that a `plan_hash` / `state_hash` mismatch under `accept_plan_drift=false` is verdict-driving (FAIL); `story-state-contract.md` §4.6 carries the `hash_integrity` field; every deterministic-check count in the skill reads eight. Each PASS entry cites the file/line checked.
- **D2**: `story-state-contract.md` §4.3 carries the `commitment:` block; `branching-story-turn-cycle` Phase 2 prose both writes `commitment:` and performs the cooldown scan over prior `SE.commitment.selected_slt_id`; `branching-story-health-audit` references `SE.commitment` in its replay sub-phases. Because there are zero production bundles, verification is contract-and-prose conformance, not bundle replay.
- **D3**: `story-state-contract.md` §4.1 `basis` carries `access_route` + `access_records`; the lines-85-86 note no longer says the refinements are discarded; `branching-story-health-audit` Phase 2d reads `BEL.basis.access_route`.
- **D4**: `branching-story-turn-cycle` HARD-GATE says "7"; `branching-story-health-audit` says "Eight sub-phases" and cites the prose receipt as `§4.6`; a grep for "6 turn-cycle-additional", "Seven sub-phases", and "§4.5" in the two skills returns no operational hits.
- **D5**: `story-fact-promotion-to-canon/SKILL.md` and `templates/proposal-package.yaml` show `direct_user_approval: false` with a comment stating it stays false through promotion; `derived_from` documentation shows `[]` for novel candidates with a no-null / no-branch-ids note.
- **D6**: `story-promotion-closeout/SKILL.md` line-177 wording is preserved; the validation gate checks `source_record_dispositions` completeness, not supersession count; the `SP-<integer>-closeout.md` ledger schema carries the disposition map.
- **D7**: `branching-story-bootstrap/SKILL.md` STORY_KERNEL.md contract specifies the YAML frontmatter block; `docs/CONTEXT-PACKET-CONTRACT.md` §6 no longer lists "shape/intensity counts" and clarifies `story_bootstrap` packet behavior; the frontmatter field names match what `story-bundle-context.ts` parses.

## Out of Scope

- **Intake P0.4 — diegetic time on `PG.state_snapshot`.** Rejected: a feature addition miscategorized as a contract bug. A `temporal_state` block plus `time_order` / `time_label` predicates with no validator, gate, or `SLT` precondition consuming them would violate §5b on day one; no production stories exist to prove page-count is insufficient. *(structural — revisit when a real story's deadline / travel / recovery scenario demonstrably defeats page-count.)*
- **Intake P0.5 — structured `PG.validation_trace` with `authority_refs`.** Rejected: redundant with SPEC-27 D4 (shipped 2026-05-15), which generalized authority-cited HARD-GATE rationale discipline via `docs/HARD-GATE-DISCIPLINE.md` — the discipline route, not a schema restructure — and no validator consumes a structured `validation_trace`. The report flagged it because `HARD-GATE-DISCIPLINE.md` was not in its input set. *(structural)*
- **Intake P0.10 — purge legacy ARC vocabulary.** Rejected as framed: exact-match search confirms the live story skills and `story-state-contract.md` carry zero `arc_archetype` / `narrative_point` / `arc_trace` occurrences — the greenfield rebuild already purged them — and the tools-layer survivors are partly deliberate (SCAUD-003 retained the `commitment_family` / `commitment_class` MCP vocabulary surface intentionally). The one genuine residue (the stale "shape/intensity counts" line in `CONTEXT-PACKET-CONTRACT.md`) is absorbed into D7; the broader tools-layer question is flagged in the companion triage file. *(structural)*
- **Intake P1.1 — branch-viability forecasting.** Rejected: SPEC-27 D5 already shipped the core (Choice Consequence Integrity — no accepted choice may be cosmetic). P1.1 extends it to *emitted* (pre-selection) choices with new health-audit findings — an enhancement to a diagnostic skill, not a load-bearing contract gap. *(structural)*
- **Intake P1.2–P1.5 — character-initiative checks, social-practice storylet batches, temporal-continuity findings, choice-explanation tooling.** Rejected: all are enhancements to a diagnostic skill or authoring conventions that consume existing structure; none adds a load-bearing structural property. P1.4 is moot (depends on the rejected P0.4). *(structural — nice-to-have under the conservative, load-bearing-only review brief.)*
- **Intake P2 — hostile test-fixture suite.** Rejected for this spec: a QA investment, not contract hardening, and several of its assertions ("selected `SLT` recorded", "no silent rejection") depend on D2 landing first. *(structural — recommended as a dedicated follow-up spec after SPEC-28; noted in the companion triage file.)*
- **The CF-schema-level `direct_user_approval` field-without-a-consumer question.** D5 fixes the misleading *story-skill* comments; whether the field should exist at all in the *world-canon* CF schema is a `docs/FOUNDATIONS.md` / `canon-addition` scope question. Flagged in the companion triage file.
- **Tools-layer arc-vocabulary cleanup.** Per the triage decision, flagged in the companion triage file as an out-of-report finding, not actioned here.
- **Ticket decomposition and implementation.** SPEC-28 amends contracts and skill prose; implementation tickets are produced by a separate decomposition step.

## Risks & Open Questions

- **D1 receipt shape.** Whether `hash_integrity` is an eighth entry in the receipt's `checks:` map or a separate top-level receipt field is a ticket-time decision. The load-bearing requirement is only that hash drift becomes verdict-driving under `accept_plan_drift=false`; the placement choice does not affect that. *(structural)*
- **D3 reverses an explicit §5b decision.** `access_records`' load-bearingness rests on `branching-story-health-audit` Phase 2d (SPEC-27 D7's `observer_firewall_violation` audit) actually consuming it. If a future per-property schema audit re-examines `BEL.basis`, the §6b consumer must be cited as the justification. *(structural — the consumer exists as of SPEC-27 D7.)*
- **D7 dual-surface sync.** The STORY_KERNEL.md frontmatter `cast_bind_list` duplicates information in the `## Cast and Roles` markdown section. The bootstrap skill must declare the frontmatter authoritative for machine retrieval and the section its human rendering, with an explicit sync note — the same dual-surface discipline the CF templates carry.
- **D7 rebase against SPEC-27.** `docs/CONTEXT-PACKET-CONTRACT.md` was edited by SPEC-27 D6 (the `canon_revision` phantom-feature correction) in a different section; ticket authoring should rebase D7's §6 edits against the post-SPEC-27 file state.
- **Greenfield enabling fact.** Zero production story bundles exist (SPEC-24 removed the red-bunny test bundle), so D1–D3's schema amendments carry no migration cost. This is why "now, before the first production story" is the correct time — every §Out of Scope rejection is structural, not a migration-cost softening.
