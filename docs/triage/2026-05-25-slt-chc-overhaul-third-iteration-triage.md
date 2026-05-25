# Triage — `reports/slt-chc-overhaul-third-iteration.md`

**Date:** 2026-05-25
**Source report:** [`reports/slt-chc-overhaul-third-iteration.md`](../../reports/slt-chc-overhaul-third-iteration.md) (1527 lines; ChatGPT-Pro's third-iteration hardening-pass proposal for the SLT/CHC overhaul, produced after iteration 2's significant structural changes shipped as archived SPEC-79 / SPEC-80 / SPEC-81 / SPEC-82).
**Prior iterations:**
- [`docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`](2026-05-23-slt-chc-overhaul-first-iteration-triage.md); iteration-1 deliverables [`archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md`](../../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md), [`archive/specs/SPEC-77-slt-grounding-provenance-minimal.md`](../../archive/specs/SPEC-77-slt-grounding-provenance-minimal.md), [`archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md`](../../archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md).
- [`docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`](2026-05-24-slt-chc-overhaul-second-iteration-triage.md); iteration-2 deliverables [`archive/specs/SPEC-79-chc-associated-commitment-block-removal.md`](../../archive/specs/SPEC-79-chc-associated-commitment-block-removal.md), [`archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md`](../../archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md), [`archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md`](../../archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md), [`archive/specs/SPEC-82-remaining-schema-drift-repairs.md`](../../archive/specs/SPEC-82-remaining-schema-drift-repairs.md), all archived 2026-05-24 / 2026-05-25.
**Trigger:** User-supplied request: "Please analyze carefully reports/slt-chc-overhaul-third-iteration.md . It was produced by ChatGPT-Pro after the second iteration made significant structural changes. I need you to be critical of ChatGPT-Pro's report: reassess for correctness and benefit. If changes aligned with docs/FOUNDATIONS.md are warranted, create specs in specs/* with the specifications. If more than one spec is created, create specs/IMPLEMENTATION-ORDER.md"
**Deliverables produced:**
- [`archive/specs/SPEC-83-slt-cooldown-window-correctness.md`](../../archive/specs/SPEC-83-slt-cooldown-window-correctness.md)
- [`archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md`](../../archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md)
- [`specs/SPEC-85-non-player-driver-golden-fixtures.md`](../../specs/SPEC-85-non-player-driver-golden-fixtures.md)
- [`specs/IMPLEMENTATION-ORDER.md`](../../specs/IMPLEMENTATION-ORDER.md)

## Triage summary

ChatGPT-Pro's iteration-3 report is **substantially correct in its executive verdict and architecture analysis**. Unlike iteration 2, this report does **not** re-propose the iteration-2 §Out-of-Scope items: no CHC.binding object, no SSEL, no rich SLT.grounding, no global drama manager. The discipline of recording rejections in the iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope list held. The report's §1-8 verdict — preserve the landed minimal schema, fix the cooldown bug, add fixtures, improve diagnostics without adding new record classes — mirrors the iteration-2 architectural commitments.

The report's **7 proposed specs (SPEC-83 through SPEC-89)** + skill-prose additions vary widely in load-bearing strength. The verification pass below adjudicates:

- **3 specs accepted (3 of 7 fold into the 3 deliverables above)**: cooldown bug (verified at exact line:col), replay/fork + branch-scope fixtures (verified absence in test corpus, combined into one spec), non-player driver golden fixtures (verified gap per driver kind).
- **3 specs deferred (consumer-thin / lift-condition unmet)**: page-plan §7a candidate-filter prose + new validator, choice-promise / non-player response language validators, authored large-pool fixture.
- **1 skill-prose addition rejected as re-tread**: `branching-story-prose-attach` non-player-driver hidden-mind-leak validator — direct iteration-2 §Out-of-Scope re-tread; lift-condition (real renderer emits non-player-driver prose) unmet.
- **1 skill-prose addition deferred**: STORY_KERNEL Player Agency Modes contract amendment — 4 of 5 modes already exist as the `player_response_mode` schema enum; the cited consumer is the deferred prose-attach pass.
- **Report §1-8 architecture verdict**: confirms-existing-position; no spec needed.

The user pre-authorized spec creation contingent on the verdict. Pre-authorization activated when the triage recommendation was presented in chat; the three SPEC files + IMPLEMENTATION-ORDER + this triage file were written in the same turn per the `brainstorm` skill's §Non-plan-mode fast-track for template-structured deliverables. No material-deliverable-shape fork (per the brainstorm skill's Guardrails §User pre-authorization patterns) fired: the deliverable shape matched the user's explicit contingent instruction (multiple specs + IMPLEMENTATION-ORDER).

## Verification ground truth

Iteration 3 makes ~25-30 codebase claims. The verification pass below condenses the load-bearing subset; file:line citations are reproducible at the SHA noted in iteration 3's §2 (`16a1b69`, which matches the repo's current `main`).

### Bug claim — cooldown filter is binary, not numeric (load-bearing for SPEC-83)

- **Report claim** (§6 "Repo-specific bugs or mismatches found"): "The MCP cooldown logic is wrong. It loads prior selected storylet IDs and then treats any prior occurrence as blocked whenever `cooldown_pages > 0`; it does not compare against the numeric cooldown window."
- **Verification**: VERIFIED. `tools/world-mcp/src/tools/select-storylet-candidates.ts:439-446` defines `matchesCooldown` as a binary `Set<string>` membership check; the SLT's numeric `cooldown_pages` is collapsed to "any > 0 triggers permanent block." The parent PG's `branchPath` is loaded into `PageState.branchPath` at line 237 but never threaded into `matchesCooldown`. `loadSelectedStoryletIds` at lines 408-437 scans every `story_event_record` globally (no branch filter, no page-order context). Bug is real and stronger than the report frames it — it also causes a **cross-branch leak**: a selection on sibling branch BR-2 blocks the same SLT on BR-1. → SPEC-83 fix covers both the numeric-window collapse AND the cross-branch leak.

### Fixture-coverage claim — only `npc_action` has a rich golden fixture (load-bearing for SPEC-85)

- **Report claim** (§3 "Current tests and fixtures" + §6 "Non-player driver storylet applicability"): The only rich authored fixture is Red Kiln Ambush (`npc_action`); `offstage_action`, `clock_fire`, `secret_reveal`, `multi_actor_collision` need equivalent fixtures.
- **Iteration-2 counter-claim** (`docs/triage/2026-05-24-...-second-iteration-triage.md` §SPEC-84 verdict): "The other components of SPEC-84 (NPC / offstage / clock / secret / multi-actor fixtures) are already covered by SPEC-76's per-kind `contains` constraints and the Red Kiln Ambush fixture verifies `npc_action`."
- **Verification**: PARTIAL — the iteration-2 counter-claim understates the gap. Per-kind schema `contains` constraints in `story-event.schema.json:88-235` validate field-shape only. Structural unit tests at `turn-driver-schema-compliance.test.ts:7-23` and `turn-driver-pov-observer-firewall.test.ts:7-20` cover minimal records under single validators per kind. Neither equals end-to-end composition through all 6 driver-primitive validators with a realistic page-plan §7a + active-pressure table + emitted CHCs. Red Kiln Ambush IS the only rich authored bundle (verified `tools/validators/tests/fixtures/` listing: only Red Kiln, Midstory-Introduction (temporal-structure focus, not driver-kind), and small atomic-record fixtures). → SPEC-85 closes the four-kind fixture gap.

### Test-coverage claim — replay/fork with newer global SLT is unproven (load-bearing for SPEC-84)

- **Report claim** (§3 "Not yet proven" + §16 "Replay / fork semantics"): "Replay/fork behavior for newer global SLTs is now conceptually correct, but it is not proven by a golden fixture."
- **Iteration-2 status** (`docs/triage/2026-05-24-...-second-iteration-triage.md` §SPEC-83 verdict): "The behavior the proposal describes — replay sees newer global SLTs when they pass all gates — is already operational when bootstrap follows its documented null-default convention."
- **Verification**: VERIFIED. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` carries 15+ replay tests covering snapshot/hash equality but none cover pool-refresh semantics with a newer-global-SLT. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts:131-148` exercises branch-scope filtering with 9 synthetic projection rows on a single parent page — no replay context, no sibling-branch sequencing. Post-SPEC-79 the replay behavior became automatic structurally, but its proof is doctrinal (bootstrap's null-default convention), not test-verified. → SPEC-84 (combined with the branch-scope fixture proof) closes both gaps.

### Validator-scope claim — `choice_set_noncollapse` checks only three axes (load-bearing for SPEC-88 DEFER)

- **Report claim** (§6 "Choice quality"): "`choice_set_noncollapse` catches full material collapse, but not: outcome-promising labels; fake agency under non-player initiative; all choices being different phrasings of submission; response choices that ignore the driver; stale affordances that are grounded but irrelevant."
- **Verification**: VERIFIED. `tools/validators/src/rules/rule_choice_set_noncollapse.ts:115-125` (`materialSignature`) checks exactly three axes: `target_or_action_families`, `grounded_in.records`, `likely_state_pressure`. None of the five report-listed gaps are checked. The gaps are real. → BUT the report's proposed language-pattern validators (`choice_promises_success`, etc.) are heuristic and false-positive-prone; the report itself notes "This must not be hard schema law because language is contextual." DEFER until a real playtest produces an outcome-promise pattern the existing two validators (`choice_set_noncollapse` + `chc_slt_selected_commitment_trace`) miss with a concrete example.

### Schema-existence claim — Player Agency Modes already exist as a schema enum (load-bearing for §10 DEFER)

- **Report claim** (§6 "Player agency contract under non-player initiative" + §10 STORY_KERNEL changes): The Player Agency Contract must distinguish initiator / responder / witness / continuation_confirmer / constrained_write_in_author modes.
- **Verification**: 4 of 5 already exist as the `player_response_mode` schema enum on `SE.turn_driver` (`tools/validators/src/schemas/story-event.schema.json:114-116`: `initiates` / `responds` / `witnesses` / `chooses_continuation` / `none`). Naming differs (singular vs plural noun-vs-verb), but the modes are present. The 5th (`constrained_write_in_author`) is genuinely new prose. The Player Agency Contract IS a real STORY_KERNEL section (per `.claude/skills/branching-story-bootstrap/references/story-kernel-contract.md:32`) with 3 required bullets (agency surface / write-in envelope / viewpoint limits). Adding a 4th bullet enumerating modes is contract amendment territory. → DEFER: the cited consumer (prose-attach hidden-mind-leak check) is itself deferred per iteration-2 §Out-of-Scope; without a reader, the contract amendment is bloat.

### Section-content claim — page-plan §7a does not currently carry candidate-filter content (load-bearing for SPEC-87 DEFER)

- **Report claim** (§10 turn-cycle + §11 + §17 SPEC-87): Page-plan §7a should record candidate-filter summary (driver kind, before/after counts, selected SLT, top rejection reason classes); a new `candidate_filter_trace_shape` validator should check this.
- **Verification**: VERIFIED current §7a content (per `.claude/skills/_shared-templates/story-state-contract.md` §8.7a, lines 441-460): driver kind, initiator, driver records, player response mode, POV visibility, observer-firewall note, optional active-pressure disposition table. No candidate-filter content. The proposed addition is purely additive (no conflict with current semantics). → BUT no named deterministic consumer exists: the per-call `filter_trace` already carries the counts; the proposed §7a obligation has no reader other than the proposed new validator (consumer-circular). DEFER until a real audit-trail or replay-debugging failure cannot be diagnosed from existing `filter_trace` + `SE.commitment` fields. **Cooldown-specific subset folded into SPEC-83** (the `cooldown_active_samples` extension to `filter_trace` is the load-bearing portion that ships now).

## Verdicts

### ACCEPT — verified gap with no FOUNDATIONS tension

#### SPEC-83 (Cooldown window correctness) — verified bug

**Verdict:** accept.
**Landed in:** [`archive/specs/SPEC-83-slt-cooldown-window-correctness.md`](../../archive/specs/SPEC-83-slt-cooldown-window-correctness.md).
**Ground:** Verified bug at `tools/world-mcp/src/tools/select-storylet-candidates.ts:439-446`. The fix is small (one function rewrite + one helper update + interface extension), single-file, well-covered by new + existing tests. Aligns with FOUNDATIONS §Story Bundles §5b (schema-minimalism — no schema change), Rule 4 at story scope (branch isolation), Rule 5 at story scope (consequence capacity restored). The fold-in of report SPEC-87's `cooldown_active_samples` diagnostic is small and sits on the response contract, not on persisted records.

#### SPEC-84 (Replay/fork + branch-scope golden fixtures) — combined

**Verdict:** accept (combined; test-only, no schema change).
**Lands in:** [`archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md`](../../archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md).
**Ground:** Verified absence of replay-with-newer-global-SLT golden fixture and replay-context branch-scope/branch-prefix fixture. Iteration-2 §Out-of-Scope rejected replay as a **separate structural spec** ("Subsumed by SPEC-79 — the live global pool semantics is automatic"); a **test-only** fixture spec is consistent with the iteration-2 record — the behavior IS automatic but unproven, and replay/fork is the exact place the pre-SPEC-79 stale-binding bug manifested. Combining report SPEC-84 (replay) + report SPEC-85 (branch-scope) into one spec keeps fixture authoring coherent — both prove replay-time SLT visibility correctness across scope dimensions.

#### SPEC-85 (Non-player driver golden fixtures) — verified per-kind fixture gap

**Verdict:** accept (renumbered from report SPEC-86 for sequential continuation from archived SPEC-82; test-only, no schema change).
**Lands in:** [`specs/SPEC-85-non-player-driver-golden-fixtures.md`](../../specs/SPEC-85-non-player-driver-golden-fixtures.md).
**Ground:** Verified fixture-coverage gap: only `npc_action` has a rich authored bundle (Red Kiln Ambush); `offstage_action`, `clock_fire`, `secret_reveal`, `multi_actor_collision` have only schema-level + structural-unit coverage. The iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope deferral on "Non-player driver semantics expansion" specifically targets the **prose-attach hidden-mind-leak validator** (no rendered-prose consumer), explicitly NOT the fixtures themselves — the iteration-2 record actually understated the fixture gap. A fixture-only spec (no prose-attach validator, no new schema) is consistent with iteration-2's scope discipline.

### DEFER — consumer-thin / lift-condition unmet

#### Report SPEC-87 — Candidate filter trace diagnostics (non-cooldown portion)

**Verdict:** defer (cooldown portion folded into SPEC-83; the rest deferred).
**Re-evaluate when:** A real audit-trail or replay-debugging failure cannot be diagnosed from existing `filter_trace` + `SE.commitment` fields.
**Ground:** Verified current `filter_trace` already carries pool_total + per-stage counts on every `select_storylet_candidates` response (no page-plan additions required). The proposed page-plan §7a candidate-filter summary obligation + new `candidate_filter_trace_shape` validator add an authoring burden without a named structural reader (the proposed validator IS the only consumer — consumer-circular). Per Step 1 sub-step 7 capability-expansion rule + FOUNDATIONS §Story Bundles §5b (every field must be load-bearing), defer.

#### Report SPEC-88 — Choice promise / non-player response language validators

**Verdict:** defer.
**Re-evaluate when:** A real playtest surfaces an outcome-promise pattern the existing `choice_set_noncollapse` and `chc_slt_selected_commitment_trace` validators miss, with a concrete rejection example.
**Ground:** The gaps the report identifies in `choice_set_noncollapse` (3-axis material collapse only) are real, but the proposed remediation (language-pattern warning validators `choice_promises_success`, `choice_promises_secret_reveal`, `choice_promises_npc_compliance`, `non_player_driver_no_response_choice`) is heuristic. The report itself notes "This must not be hard schema law because language is contextual." No empirical pain has surfaced. Adjacent to FOUNDATIONS §Story Bundles §5c "judgment-territory" boundary on choice quality.

#### Report SPEC-89 — Authored large-pool fixture

**Verdict:** defer (YAGNI).
**Re-evaluate when:** A real production bundle reaches 100+ SLTs AND playtest surfaces a retrieval-correctness issue the synthetic SPEC-81 proof did not catch.
**Ground:** SPEC-81's 1,000-SLT synthetic proof IS the scaling proof; authoring 300 fixture SLTs is ~3-5k LOC of YAML with no current consumer near that scale. The user's empirical input that informed iteration-2 SPEC-81 acceptance ("by page 4 we had 25 storylets") establishes a real trajectory but does not yet cross the authoring-cost threshold.

#### Report §10 Player Agency Modes contract amendment (STORY_KERNEL)

**Verdict:** defer.
**Re-evaluate when:** The prose-attach hidden-mind-leak check lifts from deferred (i.e., a real renderer emits non-player-driver prose), at which point Player Agency Modes contract prose becomes the structurally appropriate carrier.
**Ground:** Verified 4 of 5 proposed modes already exist as the `player_response_mode` schema enum on `SE.turn_driver` (`initiates`/`responds`/`witnesses`/`chooses_continuation`/`none`, naming variations only). The cited consumer (prose-attach pass) is itself deferred. Without a reader, the contract amendment is bloat. The 5th mode (`constrained_write_in_author`) is genuinely new but adds prose obligation without a structural consumer.

### REJECT — re-tread of iteration-2 §Out-of-Scope

#### Report §10 `branching-story-prose-attach` non-player-driver hidden-mind-leak validator

**Verdict:** reject.
**Alternative path:** Iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope deferral stands verbatim: "Non-player driver semantics expansion / prose-attach hidden-mind-leak check (iteration-2 SPEC-84). Deferred — re-tread of iteration-1 D4. The page-commit-time `turn_driver_pov_observer_firewall` validator absorbs the structural risk; the prose-attach pass is the remaining theoretical gap, deferred until a real renderer emits non-player-driver prose."
**Ground:** No renderer change since iteration-2. No real rendered prose for non-player driver pages exists in the repo. Lift-condition (real renderer emits non-player-driver prose) unmet. The page-commit-time `turn_driver_pov_observer_firewall` validator (verified registered in `tools/validators/src/public/registry.ts`) absorbs the structural risk.

### CONFIRMS-EXISTING-POSITION

#### Report §1-8 executive verdict + architecture map + alternatives ranking (A+B over C, D, E, F)

**Verdict:** confirms-existing-position. No spec needed.
**Ground:** The verdict — preserve current implementation, fix the cooldown bug, add fixtures, improve diagnostics without new record classes — mirrors the iteration-2 IMPLEMENTATION-ORDER's explicit rejections (no CHC.binding, no SSEL, no rich SLT.grounding, no drama manager). That the iteration-3 report does NOT re-propose any of those is a positive signal that the iteration-2 §Out-of-Scope discipline is working.

#### Report §19 Non-goals (13 items)

**Verdict:** confirms-existing-position. All 13 non-goals (outcome-promising CHCs; reintroducing `CHC.associated_commitment_block`; hybrid `CHC.binding`; persistent SSEL; global drama manager; STCHAR as current state; omniscient NPCs; literary-quality as hard schema law; loading thousands of full storylets; generic SLT generation without grounding; embeddings as legality filters; backwards-compatibility shims for retired CHC fields; rich SLT grounding without consumers) align with existing FOUNDATIONS / archived-spec commitments. Recorded for iteration-4 visibility.

## Refuted by codebase verification

### V1 — Report's framing of cooldown bug understates the cross-branch leak

**Report claim** (§6): The cooldown filter "treats any prior occurrence as blocked whenever `cooldown_pages > 0`."

**Verification**: True, AND the bug also produces a cross-branch leak: `loadSelectedStoryletIds` (lines 408-437) scans `story_event_record` rows globally with no `branch_path` filter, so a selection on sibling BR-2 blocks the same SLT on BR-1 regardless of cooldown semantics.

**Consequence:** SPEC-83's fix corrects both the numeric-window collapse AND the cross-branch leak. Recorded in SPEC-83 §1 and §4.1.

### V2 — Iteration-2 counter-claim on fixture coverage understated the gap

**Iteration-2 triage claim** (re-quoted from `docs/triage/2026-05-24-...-second-iteration-triage.md` §SPEC-84): "Per-kind `contains` constraints" + Red Kiln verify all non-player driver kinds.

**Verification:** False as stated — `contains` constraints validate field-shape; structural unit tests cover single-validator behavior; neither equals end-to-end composition through 6 driver-primitive validators with realistic page-plan + active-pressure + CHC composition. Only Red Kiln has the end-to-end coverage; the other four kinds have only schema-level + structural-unit coverage.

**Consequence:** SPEC-85 (this iteration) closes the gap with one authored bundle per remaining kind. The iteration-2 counter-claim was directionally correct but understated.

## Confirms-existing-position (additional)

### C1 — Report §16 "Replay / fork semantics" policy bullet list

The replay policy the report enumerates (consider current global pool; reject global SLTs with branch-local exact refs; accept only when predicates pass; exclude unrelated branch_scoped; include branch_prefix_scoped only when prefix matches) mirrors the existing `matchesScope` (line 318-344) + `matchesSourceRecordIds` (line 383-401) implementation in `select-storylet-candidates.ts`. The policy is correct; SPEC-84's fixtures prove it works end-to-end.

### C2 — Report §15 "Storylet generation / pool diversity model"

The bootstrap seed policy (4-8 minimal, 8-14 standard, no exact branch-local refs, existential predicates preferred, driver-kind × pressure-source coverage) matches archived SPEC-80's landed scope. The report adds no new structural ask in this section.

## Implementation note

Per the User pre-authorization clause in the originating request ("If changes aligned with docs/FOUNDATIONS.md are warranted, create specs in specs/* with the specifications. If more than one spec is created, create specs/IMPLEMENTATION-ORDER.md"), the triage recommendation was presented in chat and SPEC-83 / SPEC-84 / SPEC-85 + IMPLEMENTATION-ORDER + this triage file were written in the same turn. The user did not redirect during the presentation, activating the pre-authorization.

`specs/IMPLEMENTATION-ORDER.md` is created fresh (the prior iteration-2 IMPLEMENTATION-ORDER was archived as `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md` after its sequence completed).

Per the `brainstorm` skill's `references/deliverable-classification.md` §Triage-file composition, a triage producing ≥2 specs requires a mandatory companion triage file — this file is that companion.

Historical-triage next step from the `brainstorm` skill Step 6 menu: the user chooses among reassess-spec, spec-to-tickets, implement-directly, or done.

## Open questions (for iteration 4 visibility)

1. **Cooldown bug audit trail**: did the iteration-2 SPEC-81 implementation introduce this bug, or did the prior `list_records`-based selection pipeline also have the same collapse? Worth a brief git-blame check before iteration 4 to confirm SPEC-83 is closing a regression rather than an inherited bug. If inherited, the deeper question is whether any pre-SPEC-81 production work was affected — likely none, since the prior pre-overhaul production bundle was deleted.
2. **`filter_trace.cooldown_active_samples` shape stability**: SPEC-83's diagnostic addition is on the response contract. If iteration 4 surfaces a need for richer per-stage rejection samples (the deferred portion of report SPEC-87), the sample-shape pattern from SPEC-83 should be re-used (uniform `{slt_id, stage, reason, ...}` shape) rather than each stage inventing its own.
3. **Player Agency Modes contract amendment timing**: deferred here pending the prose-attach pass lift. If iteration 4 produces a real renderer that emits non-player-driver prose, the Player Agency Modes contract amendment + prose-attach hidden-mind-leak validator should land as one package rather than separately — they share a single consumer surface.
4. **SPEC-89 large-pool fixture threshold**: deferred here at the 100-SLT real-bundle threshold. Iteration 4 should not re-propose SPEC-89 without empirical evidence that a real bundle has reached the threshold AND the synthetic proof failed to catch a real regression.
