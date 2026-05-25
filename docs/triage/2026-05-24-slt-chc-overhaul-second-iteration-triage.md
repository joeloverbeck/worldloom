# Triage — `archive/reports/slt-chc-overhaul-second-iteration.md`

**Date:** 2026-05-24
**Source report:** [`archive/reports/slt-chc-overhaul-second-iteration.md`](../../archive/reports/slt-chc-overhaul-second-iteration.md) (1128 lines; research-driven storylet-selection / CHC binding / driver-aware narrative causality proposal from ChatGPT-Pro, iteration 2 of the SLT/CHC overhaul brainstorm)
**Prior iteration:** [`docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`](2026-05-23-slt-chc-overhaul-first-iteration-triage.md); iteration-1 deliverables [`archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md`](../../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md), [`archive/specs/SPEC-77-slt-grounding-provenance-minimal.md`](../../archive/specs/SPEC-77-slt-grounding-provenance-minimal.md), [`archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md`](../../archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md), all archived 2026-05-24.
**Trigger:** Originating user concern, "the first iteration left some issues that worried me, for example the declaration in CHC of what SLT was bound." ChatGPT-Pro produced iteration 2 in response.
**Deliverables produced:** [`specs/SPEC-79-story-bundle-schema-drift-repairs.md`](../../specs/SPEC-79-story-bundle-schema-drift-repairs.md). No `IMPLEMENTATION-ORDER.md` (single spec).
**Companion-file rationale:** This triage file is written despite the single-deliverable sub-threshold count, per the `brainstorm` skill's `references/deliverable-classification.md` §Triage-file composition multi-iteration audit lineage / durable rejection-record value override. Iteration 2 demonstrated that the iteration-1 IMPLEMENTATION-ORDER §Out-of-Scope disclaimer ("so future operators do not silently re-propose them") is load-bearing — the same structural overhaul proposals re-emerged. A second documented rejection iteration strengthens the prior-decision record before any iteration 3 emerges.

## Triage summary

ChatGPT-Pro's iteration-2 report proposes **8 specs (SPEC-79 through SPEC-86)** built around three macro-architecture changes: (i) a hybrid `CHC.binding` object replacing the scalar `associated_commitment_block`; (ii) a persistent `SSEL` selection-trace record class; (iii) a driver-first indexed candidate-retrieval pipeline with a new `select_storylet_candidates` MCP tool. Verification against the codebase plus the iteration-1 triage record yields:

- **5 of 8 proposals are re-treads** of iteration-1 rejections with the same FOUNDATIONS grounds (`docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md` R1, R4-R7, D5 plus the iteration-1 IMPLEMENTATION-ORDER §Out-of-Scope items and SPEC-77's explicit 5-field cut).
- **1 of 8 is premature per YAGNI** — no production stories exist; no consumer has reached the pool size at which the proposed indexed retrieval would help.
- **1 of 8 reuses iteration-1 D4's deferral rationale unchanged** — the prose-attach hidden-mind-leak check still has no rendered-prose consumer.
- **1 of 8 contains genuinely new concrete drift findings** — three local repairs that warrant action now and form the entire scope of SPEC-79.

The user's specific concern ("the declaration in CHC of what SLT was bound") is addressed by reaffirming iteration-1 R1: the existing scalar is fine; the validator does not hard-fail on stale binding (verified at `chc-slt-selected-commitment-trace.ts:388` — soft resolution with WARN-degradation, not strict ID match); no playtest pain has surfaced to justify reversing R1's deferral. The concern is recorded in SPEC-79 §4 Out of Scope for iteration-3 visibility, with iteration-1 R1's `CHC.late_bound: bool` alternative path preserved as the minimal repair if pain emerges.

The user pre-authorized spec creation contingent on the verdict. Pre-authorization activated when the triage recommendation was presented in chat; SPEC-79 and this triage file were written in the same turn per the `brainstorm` skill's §Non-plan-mode fast-track for template-structured deliverables.

## Verification ground truth

Iteration 2 makes ~30 codebase claims. The verification pass below is condensed; all underlying file:line citations are reproducible at the SHA noted in iteration 2's §2 (`7a808d4c670eff6af53ce82cf33bf76d1ee54bb2`).

- **`CHC.associated_commitment_block` required + nullable**: VERIFIED. `tools/validators/src/schemas/story-choice.schema.json` lines 13, 54-57. Required field; pattern `^SLT-(0|[1-9][0-9]*)$`; nullable via `type: ["string", "null"]`.
- **All proposed `binding` / `intent_signature` / `replay_policy` / `promise_limits` fields**: REFUTED present; structurally forbidden by `additionalProperties: false` on the CHC schema.
- **`SLT.grounding` minimal-2 shape**: VERIFIED. `story-storylet.schema.json` lines 242-269. Required: `compatible_turn_drivers[]`, `reason_to_exist`; `additionalProperties: false`. All 5 fields ChatGPT-Pro proposes adding (`causal_pressure_classes`, `required_active_record_classes`, `role_lanes`, `actor_binding_policy`, `source_records`) are exactly the 5 SPEC-77 §4 dropped with derivability rationale.
- **`SE.turn_driver` 8-kind enum + per-kind constraints**: VERIFIED. `story-event.schema.json` lines 88-122, 132-235. Player kinds enforce empty `driver_records`; `npc_action` requires ≥1 STPLAN/STEMO/CLK/THR/STCHAR; `clock_fire` requires CLK; `secret_reveal` requires STSEC; `multi_actor_collision` requires ≥2.
- **`SE.commitment` shape**: VERIFIED. Current fields are `selected_slt_id`, `selection_source`, `alias_bindings`. ChatGPT-Pro's proposed `source_choice_id` and `selection_trace_id` additions would be additive and structurally rejected without schema change.
- **5 driver-primitive validators registered**: VERIFIED all five (`turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`, `slt_grounding_minimal_integrity`) in `tools/validators/src/public/registry.ts`.
- **`chc_slt_selected_commitment_trace` validator behavior**: VERIFIED at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:388`. Resolves emitted-choice → selected SLT softly via `associated_commitment_block` lookup, with fallback scan of `parent_page.emitted_choices` and `ambiguous`-resolution → WARN degradation (per SPEC-51 §A.1 step 3). NOT a hard ID-match fail; ChatGPT-Pro's §3.4 framing overstates the coupling.
- **STQ `payoff_due` field**: REFUTED — not in `story-question.schema.json` (`additionalProperties: false`). **PARTIAL on validator claim**: `page-plan-active-pressure.ts:102` does read `parsed.payoff_due` (a confirmed dead branch — STQ pressure can never escalate to active). The helper is shared by `active-pressure-handling-discipline.ts:15` and `page-plan-turn-driver-consistency.ts:14`.
- **Red Kiln Ambush fixture CHC drift**: VERIFIED. `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` lines 180-253 — five CHC entries use `choice_text` (not a schema field) and `player_response_mode` (canonical on `SE.turn_driver`, not CHC). Required CHC fields (`surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, `associated_commitment_block`) are missing.
- **Bootstrap stale-comment**: VERIFIED. `.claude/skills/branching-story-bootstrap/SKILL.md:166` references SPEC-77's `compatible_turn_drivers` field as "future" though SPEC-77 landed.
- **`list_records` scan-and-filter behavior**: VERIFIED at `tools/world-mcp/src/tools/list-records.ts:414-507`. Linear scan over typed rows, parse YAML per row, filter in-process. No indexed predicate columns.
- **Context packet `MAX_VISIBLE_STORYLETS = 50`**: VERIFIED at `tools/world-mcp/src/context-packet/story-bundle-context.ts:48`.
- **World-index SLT/CHC edges**: VERIFIED 8 edge classes (`page_emitted_choice`, `choice_grounded_in`, `choice_associated_storylet`, `choice_affordance_ordinal`, `storylet_predicate_ref`, `storylet_effect_ref`, `storylet_exit_likely_effect_ref`, `event_selected_storylet`) at `tools/world-index/src/schema/types.ts:108-168`. Driver-compatibility, grounding-features, and predicate-class projection edges are NOT indexed.
- **No `select_storylet_candidates` MCP tool exists**: VERIFIED. `tools/world-mcp/src/tool-names.ts` enumerates 24 tools; no match.
- **No SSEL / `create_ssel_record` patch-engine op exists**: VERIFIED. `tools/patch-engine/src/envelope/schema.ts` enumerates story-bundle creation ops; no match.

## Verdicts

### REJECT — re-tread of iteration-1 rejections

#### SPEC-79 (CHC binding object replacing `associated_commitment_block`)

**Verdict:** reject.
**Alternative path:** Iteration-1 R1's deferral stands. If a future playtest surfaces stale-binding pain, evaluate a minimal `CHC.late_bound: bool` flag (or analog) at that point.
**Ground:**

1. Direct re-tread of iteration-1 R1, which is explicitly listed in `archive/specs/IMPLEMENTATION-ORDER-2026-05-24.md` §Out of Scope precisely "so future operators do not silently re-propose them."
2. ChatGPT-Pro's §3.4 framing — that `chc_slt_selected_commitment_trace` "proves the current system is structurally tied to direct CHC→SLT association" — overstates the coupling. Verification at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:388` confirms the resolution is soft (WARN-degradation on ambiguity, not FAIL on mismatch).
3. The proposed `binding` object (4-mode enum + 7-field `intent_signature` + `candidate_slt_ids` + `exact_slt_id` + `replay_policy` + `promise_limits`) duplicates existing CHC root fields (`target_or_action_families`, `grounded_in.records`, `surface_label`, `player_visible_intent`) and a separate proposed SPEC-83's "replay policy" carrier. Fails FOUNDATIONS §Story Bundles §5b's load-bearing test.
4. Bootstrap convention already documents null-default for `associated_commitment_block` when no specific SLT is pre-identifiable (`.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md:25`). The "live global pool" behavior the proposal seeks is the runtime model when `associated_commitment_block: null` — already operational.

#### SPEC-80 (Rich SLT grounding fields)

**Verdict:** reject.
**Alternative path:** Existing minimal grounding (SPEC-77 §3.1) is sufficient. Each proposed field is derivable from existing surface per SPEC-77 §4 Out of Scope.
**Ground:** Direct re-tread of iteration-1 R4-R7 plus SPEC-77 §4 explicit cut, plus SPEC-77's `additionalProperties: false` structural forbid. The 5 proposed fields map exactly to the 5 SPEC-77 dropped:

- `causal_pressure_classes` ← iteration-1 R5; derivable from `preconditions.hard[]` predicate kinds.
- `required_active_record_classes` ← iteration-1 R6 / SPEC-77 §4; derivable from `preconditions.hard[]` record-id references.
- `role_lanes` ← iteration-1 D1 / SPEC-77 §4; deferred as STCHAR-axis taxonomy work.
- `actor_binding_policy` ← iteration-1 R7 / SPEC-77 §4; `scope.visibility` already encodes binding capability.
- `source_records` ← iteration-1 R6 / SPEC-77 §4; duplicates `preconditions.hard[]` record-id references.

The iteration-1 triage explicitly states future Claude should not silently re-propose these; iteration 2's emergence of the same fields confirms the disclaimer is load-bearing.

#### SPEC-81 (SSEL persistent selection-trace record class)

**Verdict:** reject.
**Alternative path:** SPEC-51's chosen trace surface — `SE.commitment.alias_bindings` + `SE.state_delta` + `SLT.effects.bound:<alias>` + `CHC.grounded_in`. The trace lives entirely in already-committed fields.
**Ground:**

1. Re-tread of iteration-1 D5 (Candidate-commitment record `SCOM` / `STCAND`).
2. Direct conflict with SPEC-51's design choice. SPEC-51 §FOUNDATIONS Alignment §5b row commits to "Zero new record classes, fields, MCP packets, or page-plan sections." Adding SSEL reverses that commitment without empirical justification.
3. The proposed `filter_trace` object (8 named filter-stage count fields plus shortlist + selection reason) is the recorded-optimization-trace pattern §5c rejects. Selection is local salience ranking, not a recorded optimization path.

#### SPEC-83 (Replay/fork live global pool)

**Verdict:** reject.
**Alternative path:** Already the runtime model. CHCs with `associated_commitment_block: null` filter from the live global pool against the parent PG snapshot at replay/fork time.
**Ground:** Depends on SPEC-79 (rejected) for the `binding.replay_policy` carrier. Without the binding object, the proposal has no schema home. The behavior the proposal describes — replay sees newer global SLTs when they pass all gates — is already operational when bootstrap follows its documented null-default convention. The exact-bound stale-SLT diagnostic the proposal cites is a real edge case but is already covered by existing validator codes (`selection_source: emitted_choice` with stale `selected_slt_id` fails predicate evaluation).

#### SPEC-85 (Storylet generation matrix)

**Verdict:** reject.
**Alternative path:** Current `commitment-block-authoring` direct-batch mode diagnoses move-family and causal-function coverage. Per-block discipline (SPEC-77 banned-phrase list) is the local-grounding check.
**Ground:** Drama-manager-adjacent. SPEC-50 D.2 explicitly excludes pool-level pressure distribution / aggregate-salience targeting as "drifts toward the global-drama-manager pattern FOUNDATIONS §Story Bundles §5c rejects." The proposed `driver-kind × pressure-source × role-lane × action-family` coverage matrix at pool level is exactly that pattern.

### DEFER — premature per YAGNI

#### SPEC-82 (Indexed candidate retrieval + `select_storylet_candidates` MCP tool)

**Verdict:** defer.
**Re-evaluate when:** A real production story bundle reaches SLT pool size ≥ 200 AND `commitment-block-authoring`'s `list_records(include_full_body=true)` call measurably slows the skill.
**Ground:** The scalability concern is real but speculative at current scale. No production story bundles exist; the `MAX_VISIBLE_STORYLETS = 50` context-packet cap is not yet binding on any real consumer. Per the `brainstorm` skill's `references/carve-outs.md` capability-expansion guard, a capability addition requires at least one concrete current or near-term consumer at the relevant scale — neither exists. Implementation cost estimate (~5,000-8,000 LOC across `tools/world-index/`, `tools/world-mcp/`, `tools/patch-engine/` plus integration tests) is substantial enough that the deferral is principled, not optional.

### DEFER — iteration-1 D4 rationale unchanged

#### SPEC-84 (Non-player driver semantics expansion)

**Verdict:** defer (the prose-attach hidden-mind-leak component specifically; other components are already implemented or refuted).
**Re-evaluate when:** A real renderer emits prose for non-player driver pages and a playtest surfaces hidden-mind-leak prose that the page-commit-time `turn_driver_pov_observer_firewall` validator did not catch upstream.
**Ground:** Re-tread of iteration-1 D4 ("defer until rendered prose confirms the prose-receipt surface needs to record driver fidelity"). The structural risk is absorbed at page-commit time by `turn_driver_pov_observer_firewall` (verified registered). The prose-attach pass is the remaining theoretical gap, but no rendered prose for non-player driver pages exists in the repo. The other components of SPEC-84 (NPC / offstage / clock / secret / multi-actor fixtures) are already covered by SPEC-76's per-kind `contains` constraints and the Red Kiln Ambush fixture verifies `npc_action`.

### ACCEPT — genuinely new concrete drift

#### SPEC-86 (Schema drift repairs) → adopted as SPEC-79

**Verdict:** accept (expanded scope: three concrete drift artifacts surfaced for the first time in iteration 2's verification).
**Lands in:** `specs/SPEC-79-story-bundle-schema-drift-repairs.md`.
**Items:**

1. **`STQ.payoff_due` dead branch** at `tools/validators/src/structural/page-plan-active-pressure.ts:102`. The branch reads a field absent from `story-question.schema.json` (`additionalProperties: false`); STQ pressure can never escalate to active in either consumer validator. Repair: replace `payoff_due === "true"` with `salience === "high"` (parallel to THR/OBL/CNSQ's `urgency === "high"` checks in the same helper).
2. **Red Kiln Ambush fixture CHC schema drift** at `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` lines 180-253. Five CHC entries use `choice_text` (not a schema field) and `player_response_mode` on CHC (canonical on `SE.turn_driver`, not CHC, per SPEC-76). Required CHC fields missing. Repair: rewrite each entry to conform to the current CHC schema.
3. **Bootstrap stale-future-tense comment** at `.claude/skills/branching-story-bootstrap/SKILL.md:166`. References SPEC-77's `compatible_turn_drivers` field as "future" though SPEC-77 landed. Repair: verify Phase 6 grounding population (extend Phase 6 if missing), then replace the stale comment with current-tense guidance.

### CONFIRMS-EXISTING-POSITION

#### Source report §1 executive verdict (SPEC-76's driver primitive is "the right direction")

**Verdict:** confirms-existing-position. No spec needed. The driver primitive landed in archived SPEC-76; the active-pressure handling discipline landed alongside. The user's iteration-1 reactivity concern was addressed at the structural level. Iteration 2's reaffirmation of this direction is welcome but operationally null.

## Refuted by codebase verification

### V1 — Report's framing of `CHC.associated_commitment_block` as "structurally tied"

**Report claim** (§3.4 / §4): The validator "still resolves an emitted-choice event by checking that the selected `SLT` matches the chosen `CHC.associated_commitment_block`. This proves the current system is structurally tied to direct CHC→SLT association, not merely informally using it."

**Verification:** `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:388` uses `associated_commitment_block` as a soft resolution mechanism — find which emitted CHC the selected SLT belongs to. The validator falls back to scanning `parent_page.emitted_choices` (line 397) and on ambiguity downgrades to WARN (`turn_resolution_unresolvable`, line 214) per SPEC-51 §A.1 step 3. Not a hard ID-match fail.

**Consequence:** The "stale binding by design" framing overstates the actual coupling. This was already noted in iteration-1 V1; iteration 2 repeats the misframing.

### V2 — Report's framing of `player_response_mode` as a CHC field

**Report claim** (§3.7, §5.9, §17.10): Implies that `player_response_mode` belongs on CHC and the schema is missing it.

**Verification:** `player_response_mode` is canonical on `SE.turn_driver` per SPEC-76. It does not belong on CHC. The Red Kiln Ambush fixture's per-CHC use is the schema drift, not the schema's omission.

**Consequence:** The fixture-repair direction is "remove `player_response_mode` from CHC entries," not "add `player_response_mode` to CHC schema." Recorded in SPEC-79 §3.2 and §4 Out of Scope.

### V3 — Report's claim that bootstrap "does not populate that future field"

**Report claim** (§9.1): Cites bootstrap's stale comment as evidence that bootstrap needs to be updated to populate the field.

**Verification:** The comment IS stale (SPEC-77 landed and the field is required). Whether the underlying implementation gap exists (bootstrap doesn't populate `grounding` for seeded SLTs) is unverified from the comment alone. SPEC-79 §3.3 prescribes verify-then-fix: if Phase 6 already populates grounding, the repair is documentation-only; if not, Phase 6 amendment is in scope.

## Confirms-existing-position (additional)

### C1 — Source report §15.6 "Historical reproducibility comes from `SSEL` selection traces, not from freezing old pages to old global pools by default."

The principle (historical reproducibility = re-runnable from snapshot, not frozen-pool replay) matches FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) — PG snapshots are the fork primitive. The proposed mechanism (SSEL) is rejected per the verdict on SPEC-81; the principle stands and is already operationalized.

### C2 — Source report §18 non-goals list

All ten non-goals (outcome-promising CHCs; global drama manager; STCHAR-as-current-state; omniscient NPCs; hard-validating literary quality; loading thousands of full storylets; generic SLT generation; backwards-compatibility shims; embeddings as legality filters; silent reinterpretation of stale exact-bound choices) align with existing FOUNDATIONS / SPEC-50 / SPEC-51 / SPEC-76 / SPEC-77 commitments. No spec needed; recorded for cross-iteration continuity.

## Implementation note

Per the User pre-authorization clause in the originating request ("If changes aligned with docs/FOUNDATIONS.md are warranted, create specs in specs/* with the specifications"), the triage recommendation was presented in chat and the SPEC-79 + this triage file were written in the same turn. The user did not redirect during the presentation, activating the pre-authorization.

`specs/IMPLEMENTATION-ORDER.md` is NOT created — only one spec is warranted; the user's instruction triggers IMPLEMENTATION-ORDER only on multi-spec output.

Historical-triage next step from the `brainstorm` skill Step 6 menu: the user chooses among reassess-spec, spec-to-tickets, implement-directly, or done.

## Open questions (for iteration 3 visibility)

1. **CHC binding declaration semantics**: the user's originating concern remains nominally open. If iteration-1 R1's deferral continues to hold under future playtest evidence, R1's alternative path (minimal `CHC.late_bound: bool` flag) remains the indicated minimal repair. Iteration 3 should resist re-proposing the full binding-object overhaul without new empirical pain.
2. **Per-CHC response-mode authority**: if a real consumer surfaces that needs per-CHC (not per-SE) player-response-mode authority (the Red Kiln fixture currently expresses this via the schema-drifting `player_response_mode` field on CHC), a future spec would need to amend `story-record-schemas.md` §4.5.12 and `story-choice.schema.json` simultaneously. No such consumer exists today.
3. **SLT pool scaling threshold**: SPEC-82's deferral is keyed to a pool-size threshold (≥ 200) that no current bundle approaches. Iteration 3 should not re-propose SPEC-82 in the absence of a real bundle reaching this size.

## Update — 2026-05-24 — User redirection on three verdicts

After the initial triage was presented in chat with a 1-spec deliverable plan (the schema-drift-repairs spec), the user redirected on three of the verdicts above. The redirections are recorded here so the audit trail captures both the initial reasoning and the corrected verdicts.

### Reversal 1 — SPEC-79 (CHC binding object) moves from reject (re-tread) to **accept-with-modification (field REMOVAL, not structural binding object)**

**User redirection (verbatim):** "I explicitly asked ChatGPT-Pro to research if we should remove associated_commitment_block. I don't want a skill being tempted to choose a SLT of a storypool that may have changed massively, just because a SLT is named in associated_commitment_block. I think this needs to go."

**What the initial triage missed:** the framing of the user's concern. The initial triage treated the iteration-1 R1 deferral as the operative ground ("no playtest pain → defer") and read iteration-2 SPEC-79's structural binding-object proposal as a re-tread of that deferral. The user's concern is operational and stronger: the field's MERE PRESENCE creates a temptation surface — turn-cycle can lock into a stale SLT named at CHC-emission time even after the pool has grown. The fix is removal of the field, not a structural overhaul replacing one binding mechanism with another. Iteration-1 R1's `CHC.late_bound: bool` alternative path is itself a temptation surface (it suggests there is some authorial benefit to NOT being late-bound) and is foreclosed by the removal.

**Architectural ground for the reversal:** Verification confirmed that `PG.input.choice_id` already carries the authoritative "which CHC was selected" information (`story-page.schema.json` lines 13, 36, 38), and the `chc_slt_selected_commitment_trace` validator already falls back to a `parent_page.emitted_choices` scan when `associated_commitment_block` lookup fails. The fallback path is the load-bearing one. The field therefore fails FOUNDATIONS §Story Bundles §5b's load-bearing test: removing it does not break any validation gate, replay primitive, predicate, fork operation, or audit-trail discipline.

**Landed in:** [`archive/specs/SPEC-79-chc-associated-commitment-block-removal.md`](../../archive/specs/SPEC-79-chc-associated-commitment-block-removal.md). The spec rewrote the schema to drop the field, switched the validator to `PG.input.choice_id` resolution, updated bootstrap to stop emitting the field, updated turn-cycle Phase 8 to emit CHCs without it, and absorbed the Red Kiln Ambush fixture CHC repair (since the fixture must be schema-conformant under the post-removal CHC shape regardless).

### Reversal 2 — SPEC-85 (storylet generation matrix) moves from reject (drama-manager-adjacent) to **accept-with-modification (narrow to driver-kind × pressure-source-class coverage at authoring time)**

**User redirection (verbatim):** "I don't see how having in mind how considering 'pressure-source' for storylet generation diversity approaches a global drama manager; if other characters than the player have plans, emotions, obligations, etc., they will naturally create pressure of their own. It has nothing to do with artificially creating drama."

**What the initial triage missed:** the distinction between AUTHORING-time coverage diagnostics and RUNTIME pool-level pressure-distribution scoring. The initial triage conflated the two and rejected the proposal as drama-manager-adjacent per SPEC-50 D.2. The user correctly identified that authoring-time coverage diagnostics are structurally different: they ensure the pool CAN express the pressures the world's existing active records produce, never that the pool SHOULD weight any pressure higher at runtime.

**Architectural ground for the reversal:** The existing bootstrap `references/phase-6-commitment-blocks.md` already prescribes cast-role coverage — "ensure at least one seed block engages each pressure-bearing role". This is the same structural pattern. Extending to driver-kind coverage (NPC / clock / secret-reveal compatibility) and pressure-source-class coverage (SLTs binding to STPLAN / STEMO / CLK pressures) is the natural complement, and directly closes the iteration-1 reactivity loop UPSTREAM of where SPEC-76's active-pressure handling discipline could only mitigate downstream. SPEC-50 D.2's prohibition is on "pool-level pressure distribution / aggregate-salience target" — runtime ranking, not authoring-time coverage. SPEC-80 §3 is explicit about the distinction.

**Lands in:** [`archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md`](../../archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md). The spec narrows ChatGPT-Pro's 8-axis matrix to the two axes the user named (driver-kind, pressure-source-class). The remaining 6 axes are either already covered by existing diagnostics, already per-SLT schema fields without consumer demand for pool-level coverage, or speculative.

### Reversal 3 — SPEC-82 (indexed candidate retrieval) moves from defer (YAGNI) to **accept**

**User redirection (verbatim):** "We don't have a production story now because we deleted it before we did this CHC - SLT overhaul, as it would have been incompatible. But by page 4 we already had like 25 storylets. This will become a real problem real fast, so I think the MCP solution should be studied."

**What the initial triage missed:** the empirical scaling evidence. The initial triage applied the capability-expansion YAGNI guard against "no current consumer at pool size ≥ 50," concluding the proposal was premature. The user supplied the missing evidence: the prior production bundle had ~25 storylets by page 4. Extrapolating, the 50-cap context-packet threshold and the `list_records(include_full_body=true)` scan cost will bind well before the next production bundle reaches the page count that would have justified the deferral.

**Architectural ground for the reversal:** Iteration-2 verification confirmed the scaling pressure points: `tools/world-mcp/src/tools/list-records.ts:414-507` is a linear scan with per-row YAML parse + in-process filter (no indexed predicate columns), and `tools/world-mcp/src/context-packet/story-bundle-context.ts:48` caps `MAX_VISIBLE_STORYLETS = 50`. At 25 SLTs both are acceptable; at 100-200+ SLTs the parse cost dominates and the LLM-facing context loses visibility above the cap. SPEC-81 closes both pressure points with indexed projection columns + a new `select_storylet_candidates` MCP tool, while preserving the existing `list_records` path as backward-compatible fallback.

**Lands in:** [`archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md`](../../archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md). The spec deliberately does NOT include the persistent SSEL trace record class from ChatGPT-Pro's original proposal (SPEC-51 §FOUNDATIONS Alignment §5b's "zero new record classes" commitment is preserved); the filter trace is a per-call diagnostic, not a persistent record.

### Revised deliverable

The single-spec plan from the initial triage is superseded by a **four-spec plan plus archived implementation-order history**:

- [`archive/specs/SPEC-79-chc-associated-commitment-block-removal.md`](../../archive/specs/SPEC-79-chc-associated-commitment-block-removal.md) — CHC field removal (user's named operational priority; completed 2026-05-24).
- [`archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md`](../../archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md) — authoring-time pool coverage diagnostics (closes the iteration-1 reactivity loop upstream; completed 2026-05-25).
- [`archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md`](../../archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md) — indexed projection + new MCP tool (scaling).
- [`archive/specs/SPEC-82-remaining-schema-drift-repairs.md`](../../archive/specs/SPEC-82-remaining-schema-drift-repairs.md) — STQ active-pressure dead-branch fix + bootstrap stale-comment repair (the Red Kiln CHC fixture repair migrated to SPEC-79).
- [`archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md`](../../archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md) — sequencing (SPEC-82 -> SPEC-79 -> SPEC-81 -> SPEC-80) and the rejected/deferred Out-of-Scope list for iteration-3 visibility.

The initial triage's verdicts on the other five iteration-2 items (SPEC-80 rich grounding → reject; SPEC-81 SSEL record class → reject; SPEC-83 live global pool replay → reject and now subsumed by SPEC-79; SPEC-84 non-player-driver semantics → defer per unchanged iteration-1 D4 rationale; SPEC-86 schema drift repairs → accept, expanded as SPEC-82 here) are unchanged.

### Audit-trail value of this reversal record

The initial triage's three errors had different root causes: Reversal 1 underweighted the user's already-stated concern (the deferral framing missed that the user's concern was the field's existence, not its semantics); Reversal 2 conflated two structurally different patterns (authoring-time coverage vs runtime drama-manager scoring); Reversal 3 lacked empirical evidence (the deleted-production-bundle context was not in the codebase). Recording all three reversals here, with the verbatim user quotes and the architectural grounds, prevents a future operator from re-running the same incomplete reasoning and arriving at the same wrong conclusion.

The pattern these three reversals share: the initial triage was over-deferential to prior-iteration decisions (R1, SPEC-50 D.2) and under-curious about the specific shape of the new proposal. The user's redirection in each case was to look more closely at what was actually being proposed rather than at which prior-decision bucket it nominally fell into. Iteration-3 triage operators should apply the same closer-look discipline: a re-tread by surface similarity is not the same as a re-tread by load-bearing semantics.
