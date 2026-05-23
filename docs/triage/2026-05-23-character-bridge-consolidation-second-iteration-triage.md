# Triage — character-bridge consolidation (second iteration)

**Date:** 2026-05-23
**Source report:** `reports/character-bridge-consolidation-second-iteration.md` (ChatGPT-Pro, 18 sections, 6 prioritized proposals + 7 false-confidence paths + 4 open questions)
**Prior decision record:** first-iteration character-bridge triage, materialized as `archive/specs/SPEC-70-char-stchar-semantic-preservation.md` (completed 2026-05-22). This triage is a delta against that spec and the just-merged VALSTCHAR-001..004 tickets.
**Method:** every load-bearing codebase claim verified against actual schema/validator source on `main` via parallel `Explore` agents; cross-checked against the SPEC-70 first-iteration lineage and the post-base-SHA ticket merges (VALSTCHAR-001..004).

## Lead correction

The report audits the "current merged implementation" at base SHA `1c51393b` but predates VALSTCHAR-001..004, which already (a) removed STCHAR-global `page_packet_hash` and relocated it to page-plan §16a packets and prose receipts only, and (b) added receipt-level **verbatim composite** `required_because` matching at `story-record-schemas.md:948` (the receipt now must carry "every comma-separated qualifier"). Several proposals are partially addressed by those tickets, were already deliberately rejected in the first-iteration character-bridge triage (folded into SPEC-70 §4), or recreate the "checklist machine" the report's own §12 forbids. The genuinely-new FOUNDATIONS-aligned actionable surface is **one spec, SPEC-71** — the multi-label parsing of `Required because:` so composite values containing `speaker` / `viewpoint` / `voice_shapes_page` trigger the voice-block requirement (the report's false-confidence path #4 — the only one rated "Preventable: yes" without caveat).

## Verdicts

### Accept → SPEC-71 (page-packet `required_because` multi-label parsing)

| Item | Verdict | Rationale |
|---|---|---|
| §15 Proposal 1 — *parsing core only* (multi-label `required_because` + presence-based voice-block trigger) | **accept-with-modification** | Verified live bug at `page-plan-stchar-packet-integrity.ts:188` — `SPEAKER_VOICE_REQUIRED.has(packet.requiredBecause)` is exact-match against the whole captured string. The §16a contract at `story-state-contract.md:466` already documents the composite pipe-vocabulary, and VALSTCHAR-001's receipt contract treats composites as the norm. So `Required because: speaker, direct_target` evades the voice gate. **Modification scope:** (a) split `required_because` into a label set; (b) require voice block when the set intersects `{speaker, viewpoint, voice_shapes_page}` (adds the documented-but-unchecked `voice_shapes_page`); (c) fix the parallel exact-match drift in the offstage_causal locational guard at `:141`; (d) warn (not fail) on labels outside the documented closed vocabulary so legacy plans aren't broken; (e) negative tests. **Drops from the proposal:** the broad role-demand matrix (see Reject row below). |
| §11 false-confidence path #4 (composite role evades voice check) | **accept (folded)** | Same finding as Proposal 1's parsing core; folded into SPEC-71. |
| §15 Proposal 6 — expanded negative fixtures | **fold** | Only the fixtures backing accepted work (composite-role-evades-voice-block + composite-offstage-on-present-STENT + unknown-label warn) are warranted. Folded into SPEC-71 §4.4 test plan. Capability-loss / role-demand / overlay fixtures depend on rejected/deferred proposals and fall away with them. |

### Reject

| Item | Verdict | Alternative path |
|---|---|---|
| §15 Proposal 1 — **role-demand matrix** (`capability_mechanism` → require capability+limit; `relationship_mechanism` → require relationship conduct; `promise_thread_carrier` / `consequence_carrier` → require active record reference; `plan_holder` → STPLAN overlay; `emotion_holder` → STEMO overlay; `absence_matters` / `continuity_mention`) | **reject** | Re-proposes the broad §16a role taxonomy the first-iteration character-bridge triage already rejected (folded into SPEC-70 as out-of-scope: "no named consumer; offstage_causal already landed; YAGNI scope-creep"). No consumer demands `capability_mechanism` enforcement; assigning these labels is itself author judgment, and gating on them recreates the "force a fact per role" pattern the report's own §12 warns against. *Alternative:* revisit only when a concrete consumer (a real packet-starvation failure traced to a missing role demand) appears with named symptoms. |
| §15 Proposal 2 — extend `source_operational_fact_map` beyond the 10 `dramatic_core` fields (`operational_class` + `source_anchor`; classes `capability_affordance`, `capability_limit_cost_access`, `embodiment_perception`, `voice_pressure_pattern`, `signature_scene_behavior`, `relationship_conduct`, `likely_story_hook`, `agency_planning_tendency`, `canon_constraint`) | **reject** | Re-proposes SPEC-70's explicitly-documented Out-of-Scope §4. SPEC-70 deliberately gated coverage to the 10 machine-parseable `dramatic_core` fields and left body-capability fidelity to contract + non-empty operational-home subsections (verified: `stchar-body-integrity.ts:42-56` enforces `### Operational capabilities and affordances`, `### Capability limits, costs, and access constraints`, `### Signature scene behaviors to render`) — precisely to avoid fragile prose-parsing false-positives. The report's own open question #2 admits section anchors may be "too fuzzy." Honoring the prior decision. *Alternative:* if real capability-loss is observed in a specific bundle, file a narrow ticket against that case — don't pre-build the taxonomy. |
| §15 Proposal 4 — `packet_coverage` block (`stchar_sections_projected` / `current_records_projected` / `omitted_role_demands`) | **reject** | A hand-maintained coverage manifest validated against role demands that don't exist (coupled to the rejected role-demand matrix). The report itself concedes it "bloats page plans" and notes it isn't standalone ("can merge with Proposal 1 or 3"). This is the checklist-machine §12 warns against; marginal value over SPEC-71 is negative. *Alternative:* none required; deterministic hashing + receipt verbatim-composite matching + SPEC-71's parsing fix already cover the verified deterministic surface. |

### Already-resolved / confirms-existing-position (no action)

| Item | Verdict | Rationale |
|---|---|---|
| §15 Proposal 5 — staleness-triage repair routing (`revise_prose` / `revise_page_plan` / `regenerate_stchar` / `run_turn_cycle_repair` boundary) | **already-resolved** | Verified at `branching-story-prose-attach/SKILL.md` Phase 5 lines 296-307: the four-way ladder is documented with a sharp decision boundary (structural failures → `run_turn_cycle_repair`; prose-only → `revise_prose`; character authority → `profile_fidelity[].repair_recommendation`). Verified at `branching-story-health-audit/SKILL.md` Phase 2m: missing / stale / split / fidelity-drift authority already distinguished. The report's proposed boundary already exists. |
| §11 false-confidence path #1 (dramatic-core covered, body capability lost) | **confirms-existing-position** | Diagnosis correct; remediation is SPEC-70's explicit choice (contract + operational-home subsections as authoring discipline, not validator coverage). The remaining residual risk is intentional. |
| §16 non-goals (no FOUNDATIONS amendment; no bridge redesign; no STCHAR as volatile-state dumping ground; no literary validators; no full-packet-for-every-entity) | **confirms-existing-position** | Fully FOUNDATIONS-aligned; matches both SPEC-70's first-iteration discipline and the second-iteration STCHAR-audit triage's anti-pattern rejections. |

### Defer

| Item | Verdict | deferred_to |
|---|---|---|
| §15 Proposal 3 — page-level `current_story_state_overlays` in §16a packets | **defer** | Verified as a real gap: §16a packets do not reference active STPLAN/STEMO/SREL/STSTAT/OBL/CNSQ/THR; that state lives in §9b/§9c/§10b and is read by the renderer from there. But (a) the page plan already carries the active state in dedicated sections, (b) the report's "require overlays when role labels demand them" depends on the rejected role-demand matrix above, (c) no consumer demands it today — prose-attach `profile_fidelity[]` already judges stale-self rendering. *deferred_to:* a demonstrated case where rendered prose shows the bootstrap-self despite active overlays present in §9b/§9c, traceable to packet omission rather than renderer error. Reformulate then as a **warning-only** "active overlay present for packeted STENT but unreferenced in §16a" check (no new role labels required). |
| §18 open questions 1, 3 | **resolved by SPEC-71** | OQ1 (prose line vs YAML block): SPEC-71 keeps the prose line and parses it — exactly the report's own recommendation. OQ3 (legacy migration aggressiveness): SPEC-71 uses warn for unknown labels (one-release window); fails only the genuine voice-block omission and offstage-on-present cases the parsing fix newly catches. |
| §18 open questions 2, 4 | **moot** | OQ2 (section-anchor vs `operational_fact_manifest`) moot under reject of Proposal 2. OQ4 (offstage-causal hard fail from inferred story state) moot under defer of Proposal 3. |

## Deliverables

- `specs/SPEC-71-page-packet-required-because-label-parsing.md`
- `specs/IMPLEMENTATION-ORDER.md` rewritten for the new sprint (SPEC-71 is the sole active spec); prior file archived as `archive/specs/IMPLEMENTATION-ORDER-2026-05-23.md`.

## Named assumptions (state if invalidated)

1. The verified bug at `page-plan-stchar-packet-integrity.ts:188` (exact-match `Set.has` against the whole captured string) is the live behavior on `main`; no in-flight PR is concurrently changing this parsing.
2. The receipt-side verbatim-composite contract added by VALSTCHAR-001 (`story-record-schemas.md:948`) is the authoritative spelling of composite `required_because` values, and SPEC-71's parsing aligns with it.
3. The closed vocabulary at `story-state-contract.md:466` (eight labels) is the intended documented surface; promoting the SPEC-71 warning to a hard schema enum is left to a future spec and not currently warranted.
4. No production page plan today legitimately uses a `Required because:` label outside the documented vocabulary for which a warning would be inappropriate; if one is found, SPEC-71's warn-not-fail policy gives a release window to migrate.
