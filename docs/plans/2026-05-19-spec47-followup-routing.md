# SPEC-47 Cross-Spec Follow-Ups — Routing Recommendation

**Date**: 2026-05-19
**Source**: `reports/new-story-structures-proposal.md` (the origin design report)
**Inputs**: SPEC-46 §Out of Scope items 1-13; SPEC-47 §Out of Scope items 1-10; SPEC-47 ticket batch (`SPEC47STPSTE-001` … `-017`, all archived).
**Status**: triage recommendation — not a spec.
**Authority**: routing only. Each accept-routed brainstorm produces its own spec; this document is the routing register.

---

## Context

SPEC-46 (story-pipeline machine-facing foundation fixes for existing record classes) and SPEC-47 (`STPLAN` + `STEMO`) shipped Priority 0 and Priority 1 of the origin report's ranked roadmap. Three categories of work remain explicitly deferred to follow-up specs:

- **Group 3** — `SE.record_introductions[]` structured replacement (origin report Priority 0 item 5; SPEC-46 §Out of Scope item 11; SPEC-47 §Out of Scope item 8).
- **Group 1** — Priority 2 packets: present-causal-situation, dramatic-irony, reader-expectation/payoff, social-pressure, branch-possibility-space, pressure-texture, `get_page_render_packet` aggregator (origin report Priority 2 items 1-7; SPEC-46 §Out of Scope items 3-9; SPEC-47 §Out of Scope items 5-7).
- **Group 2** — STPLAN extension fields (`risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`) + STEMO `orientation.toward_claim` (SPEC-47 §Out of Scope items 1-2).

---

## Verdict summary

| Group | Items | Verdict |
|---|---|---|
| Group 3 — `SE.record_introductions[]` structured replacement | 1 | **ACCEPT — brainstorm next** |
| Group 1 — Priority 2 packets (6 packets + 1 aggregator) | 7 | **DEFER — trigger by authoring evidence, one brainstorm per packet** |
| Group 2 — STPLAN extension fields + STEMO `orientation.toward_claim` | 5 fields | **DEFER — watch list; no work until §5b-class consumer surfaces** |

---

## Group 3: `SE.record_introductions[]` structured replacement — ACCEPT, brainstorm next

**Verdict**: `accept` → run `/brainstorm` on this item as the next brainstorm cycle, producing one focused spec.

**Rationale**:
- Prerequisite (SPEC-47 `STPLAN`/`STEMO` schema + `plan_relation:` tag + new class enum values for the parser at `tools/world-index/src/parse/intro-tag-parser.ts`) has just landed. Deferral is no longer blocked on the upstream surface.
- Every deferral cycle accumulates new tag patterns the structured replacement must later migrate. SPEC-47 added the `plan_relation:` pattern with 7 closed relations on top of the existing `intro:<CLASS>(...)` patterns — 8 total §5a patterns now to migrate. Doing the structured replacement before any Priority 2 packet brainstorm prevents another round of patterns (situation-introduction, irony-marker, payoff-handling) from being added to a grammar that will then need migration support.
- The only deferred item that is **both** unblocked **and** carries a concrete, demonstrated consumer-pressure signal (parser churn at every story-pipeline spec).

**Modification scope**: the brainstorm should explicitly resolve the migration-discipline question — does `SE.record_introductions[]` co-exist with parseable tags during transition (warn-level until N pages migrated), or does it cut over hard? SPEC-43 set the precedent of "deterministic grammar via closed regex + per-class triggers", so the brainstorm needs to decide whether the structured replacement is a full migration or a sibling representation indexed alongside the tag grammar.

**Sequencing**: must run **before** any Priority 2 packet brainstorm.

---

## Group 1: Priority 2 packets — DEFER each, trigger by authoring evidence

**Verdict**: `defer` (6 of 7); `accept-with-modification` (1: present-causal-situation, marked as Priority 2 front-runner once Group 3 lands); `bundle-candidate` for pressure-texture (may merge with present-causal-situation's spec).

**Rationale (applies across the group)**:
- All 7 items are **non-state MCP / page-plan / audit projections**. The origin report itself ranks them as "Priority 2: support/rendering/audit improvements" and states "these are high value but should not become active state."
- The MCP/index foundation for all 5 packets is already in place after SPEC-46 (Phase B added 7 active-record summaries: `active_beliefs_by_holder`, `active_relationships_by_participant`, `active_statuses`, `active_locations_in_scope`, `active_objects_in_scope`, `active_story_diegetic_artifacts`, `active_intentions`) + SPEC-47 (added `active_actor_plans`, `active_emotional_states` + 14 new edges). So these are **not blocked**; they are **not yet justified**.
- Eagerly queueing 6 packet specs creates a queue that will outpace observed authoring need. YAGNI: each packet fires on concrete authoring deficit evidence — failed prose-attach receipt patterns, health-audit findings showing the gap in real bundles, branching-story-bootstrap or turn-cycle skill-prose pointing at a missing summary.

**Per-packet treatment**:

| Packet | Treatment | Trigger / notes |
|---|---|---|
| Present-causal-situation (origin §3, page-plan §8b) | `accept-with-modification` as Priority 2 front-runner | Origin report calls this "the most important non-state prose improvement." When Group 3 lands, this is the natural next brainstorm. Spec must cite SPEC-47 tickets 005, 006, 011, 013 (now landed) as the actor-state retrieval dependency. |
| Pressure-texture page-plan note (origin §non-state-support, page-plan §17b) | `defer` but `bundle-candidate` with present-causal-situation | Lightest of the 7 (page-plan + audit guidance only; no MCP/world-index work). If present-causal-situation's brainstorm reveals natural pressure-texture overlap (both are page-local render guidance), bundle into one spec; otherwise keep separate. |
| Dramatic-irony (origin §5, page-plan §11b) | `defer` | Triggered by: prose passes that mis-handle audience-vs-actor knowledge (observer-firewall violations in prose-attach receipts) OR health-audit findings showing high-salience STSEC ignored for too long. |
| Reader-expectation/payoff (origin §4, page-plan §10c) | `defer` | Triggered by: STQ payoff/foregrounding misses in prose-attach receipts OR health-audit findings showing high-salience STQ never foregrounded / paid off without records. |
| Social-pressure (origin §6, page-plan §9d) | `defer` | Triggered by: SREL/OBL/group-STENT pressure failing to render in prose passes. Lowest priority of the 5 — schema sharpening of SREL + group-STENT may prove sufficient without a dedicated packet. |
| Branch-possibility-space map (origin §7) | `defer` | Triggered by: health-audit `cross_story` mode authoring need OR concrete branch-fork audit pattern requesting a packet. |
| `get_page_render_packet` aggregator | `defer-last` | **Must come after** ≥4 of the packets above land; it composes them. Authoring it earlier creates a packet over an incomplete surface. |

**Sequencing**: after Group 3 lands. Within Group 1, present-causal-situation (± pressure-texture bundle) is the natural next, but only when an authoring-evidence trigger fires.

---

## Group 2: STPLAN extension fields + STEMO `orientation.toward_claim` — DEFER, watch list only

**Verdict**: `defer` — keep on the named-extension watch list inscribed in SPEC-47 §Out of Scope items 1-2. No brainstorm queued.

**Rationale**:
- SPEC-47 §Out of Scope item 1 made the consumer-driven discipline explicit and binding: "Each may land in a follow-up spec that names a concrete §5b-class consumer (validation gate / replay primitive / predicate / fork operation / audit-trail discipline). Render-only consumption does not satisfy §5b."
- This is **not** a deferred work item; it is an **inscribed constraint** on future specs. When a future spec proposes (e.g.) a new validator that needs `STPLAN.risk_posture`, that future spec's brainstorm spawns this work — at which point the watch-list field gets a concrete consumer and lands as a named extension under the proposing spec.
- The 5 fields are individually independent (`risk_posture`, `visibility`, `current_step.rationale`, `fallback_steps[*].rationale`, `STEMO.orientation.toward_claim`). Do not bundle them speculatively. Each lands with the spec whose §5b-class consumer demands it.

**No action**: no brainstorm, no spec, no ticket. The watch list IS the audit-trail mechanism.

**Watch list (verbatim from SPEC-47 §Out of Scope)**:
- `STPLAN.risk_posture`
- `STPLAN.visibility`
- `STPLAN.current_step.rationale`
- `STPLAN.fallback_steps[*].rationale`
- `STEMO.orientation.toward_claim` (free-form string; closed `orientation.toward_records[]` list already covers the observer-firewall input use case)

---

## Recommended sequencing

```
NOW    → /brainstorm Group 3 (SE.record_introductions[] structured replacement)
           → spec → tickets → merge

THEN   → (only when authoring evidence surfaces)
         /brainstorm present-causal-situation (± pressure-texture bundle)
           → spec → tickets → merge

THEN   → (only when subsequent authoring evidence surfaces, one at a time)
         /brainstorm next Priority 2 packet
           → spec → tickets → merge

LAST   → /brainstorm get_page_render_packet aggregator
           → spec → tickets → merge (only after ≥4 packets above land)

NEVER  → /brainstorm Group 2 fields directly. They land via a future
         consumer's spec, not in their own spec.
```

---

## Named assumptions

These three assumptions are load-bearing for the verdicts above. If any is wrong, re-run the triage.

1. **Authoring-evidence trigger discipline** — Priority 2 packets fire on concrete authoring/audit gap evidence in real bundles, not on schedule. If the discipline is "ship all 5 packets in Q3", the recommendation re-ranks toward eager queueing.
2. **No external commitment to ship all packets** — reading the origin report's "high value but should not become active state" as authorizing per-packet pacing. If a downstream commitment (external prose-LLM evaluation deadline, demo) requires all 5 packets shipped together, the recommendation shifts toward eager queueing.
3. **Group 3 is the next brainstorm cycle** — Group 3 is recommended as the immediate next brainstorm because it is the only unblocked + consumer-pressured item. If the current tag grammar is considered durable (no structural replacement desired), Group 3 flips to `defer`.

---

## Verification notes

- SPEC-47 tickets 005, 006, 011, 013 (named in the SPEC-47 prose as the present-causal-situation cross-ticket dependency) all reside in `archive/tickets/SPEC47STPSTE-*` — the SPEC-47 batch has landed. When Priority 2 packet specs are drafted, their prose should cite this dependency as satisfied.
- SPEC-46 §Out of Scope items 3-9 and SPEC-47 §Out of Scope items 5-7 list the same 7 Priority 2 packets with consistent deferral grounds across both specs. Wave-3 routing is precedent-established, not novel.
- The origin report (`reports/new-story-structures-proposal.md`) has not been archived; it remains the canonical source for any Priority 2 packet brainstorm and should be cited by each.
