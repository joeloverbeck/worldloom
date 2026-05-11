# Prose Rendering Out-of-Skill — Ticket Triage

**Date**: 2026-05-10
**Source design doc**: [`docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`](../plans/2026-05-10-prose-rendering-out-of-skill-design.md)
**Source diagnosis**: [`reports/prose-issues.md`](../../reports/prose-issues.md) (ChatGPT-Pro deep research)
**Approach taken**: Approach 1 — Two-phase commit with deferred prose-coupled validators and a dedicated finalize skill.

## Decision summary

The prose-rendering-out-of-skill rework decomposes into 9 implementation tickets across three architectural concerns: preservation/schema, skill rework, and cascades/continuity. Tier ordering reflects implementation dependency:

| Tier | Tickets | Concern |
|---|---|---|
| Tier A — Preservation & Schema | PROSESPLIT-001, PROSESPLIT-002, PROSESPLIT-003 | Report extraction + PG schema additions + plan template creation |
| Tier B — Skill Rework | PROSESPLIT-005, PROSESPLIT-006, PROSESPLIT-007 | Finalize skill + bootstrap rework + page-cycle rework |
| Tier C — Cascades & Continuity | PROSESPLIT-004, PROSESPLIT-008, PROSESPLIT-009 | Validator skip + sibling-skill prose_status awareness + documentation cascade |

## Accepted items (one row per ticket)

| Ticket | Path | One-line rationale |
|---|---|---|
| PROSESPLIT-001 | `tickets/PROSESPLIT-001.md` | Extract `reports/prose-quality-instructions.md` from canonical skill references — the external-renderer prompt body. Self-contained; no skill or validator changes. Lowest-risk first move. |
| PROSESPLIT-002 | `tickets/PROSESPLIT-002.md` | Extend PG record schema with `prose_plan_path` / `prose_status` / `deferred_validation_trace`; add `pages-prose-plans/` to world-index enumerate. Foundation for all downstream tickets. |
| PROSESPLIT-003 | `tickets/PROSESPLIT-003.md` | Create `.claude/skills/_shared-templates/page-plan.md` — the canonical comprehensive plan template with frontmatter + 19-section body. One template, two shapes (selected_arc_id != null vs null). |
| PROSESPLIT-004 | `tickets/PROSESPLIT-004.md` | Add conditional skip on `arc_trace_evidence_alignment.ts` validator when `prose_status != "rendered"`. Defense-in-depth. `prose_ledger_consistency` is skill-resident only — no validator file exists, that gate's deferral lives in PROSESPLIT-006/007. |
| PROSESPLIT-005 | `tickets/PROSESPLIT-005.md` | Implement new `branching-story-page-prose-finalize` skill — 7 phases (pre-flight, plan/prose pairing, deterministic pre-critic, 8-axis prose critic, conditional ARC_TRACE extraction, deferred Phase 9 gate resolution, HARD-GATE approval, engine submit + INDEX edit). |
| PROSESPLIT-006 | `tickets/PROSESPLIT-006.md` | Rework `branching-story-bootstrap` Phase 7/7.5/9/9.5/10/11 — plan authoring instead of prose render; declared-affordance validation; deferred prose-coupled gates; `plan_completeness_check` + `plan_self_containment` added. |
| PROSESPLIT-007 | `tickets/PROSESPLIT-007.md` | Rework `branching-story-page-cycle` Phase 7/7.5/7.6/9/10/11 — plan authoring; ARC_TRACE Layer 2/3 deferred to finalize; §14 hard pre-flight block (parent.prose_status != rendered aborts); `create_arc_trace_record` op removed from page-cycle envelope. |
| PROSESPLIT-008 | `tickets/PROSESPLIT-008.md` | prose_status awareness in three sibling skills: health-audit (graceful degradation + informational `pending_prose_count`), story-fact-promotion-to-canon (HARD block on pending evidence), storylet-pool-authoring (graceful degradation + STORY_KERNEL fallback). |
| PROSESPLIT-009 | `tickets/PROSESPLIT-009.md` | Documentation cascade: CLAUDE.md, WORKFLOWS.md, FOUNDATIONS.md, HARD-GATE-DISCIPLINE.md, tools/hooks/README.md updated to reflect plan + finalize pipeline shape and serialized authoring loop. |

## Dependency graph

```
PROSESPLIT-001 ──────────────────────────────────┐
                                                  │
PROSESPLIT-002 (PG schema) ──┬─→ PROSESPLIT-005 ──┼─→ PROSESPLIT-006 (bootstrap)
                              │                   │      │
                              ├─→ PROSESPLIT-004  │      ├─→ PROSESPLIT-008 (siblings)
                              │                   │      │
PROSESPLIT-003 (template) ───┘                   │      └─→ PROSESPLIT-009 (docs)
                                                  │
                                                  └─→ PROSESPLIT-007 (page-cycle) ──┘
```

- PROSESPLIT-001 has no dependencies — can be done first or last; has no downstream consumers.
- PROSESPLIT-002, PROSESPLIT-003, PROSESPLIT-004 are independent and can be done in any order.
- PROSESPLIT-005 (finalize skill) depends on PROSESPLIT-002 and PROSESPLIT-003.
- PROSESPLIT-006 (bootstrap rework) and PROSESPLIT-007 (page-cycle rework) both depend on PROSESPLIT-002, PROSESPLIT-003, PROSESPLIT-005. They should be done together or close in sequence so the pipeline doesn't have one half-skill that produces prose while the other doesn't.
- PROSESPLIT-008 (sibling-skill prose_status) lands after PROSESPLIT-006/007.
- PROSESPLIT-009 (documentation cascade) lands last to capture final reality.

## Suggested rollout

Minimum-viable rollout: tickets 1-7 land together (the new pipeline works end-to-end); tickets 8-9 are fast-follow.

Conservative rollout: each tier as a separate PR (Tier A first, Tier B second, Tier C third).

## Dismissed items

None. The brainstorm explored two alternatives (Approach 2 — drop validators entirely; Approach 3 — generate stub prose alongside the plan) and rejected them for reasons captured in the design doc:
- Approach 2 (structural — leaves canon promotion blocked behind audit; breaks story-fact-promotion-to-canon during the rendering gap).
- Approach 3 (structural — doesn't fix the harness-bias problem since stub prose IS coding-harness prose).

## Open decisions deferred to implementation

These were flagged during the brainstorm and don't block any of the 9 tickets — finalize at the relevant ticket's implementation time:

1. **PROSESPLIT-005 Phase 1 canon-drift posture** — currently proposed: detect drift, require `accept_plan_drift=true` flag to proceed. Alternative: always proceed, just warn.
2. **PROSESPLIT-008 storylet-pool-authoring early-bundle fallback** — currently proposed: graceful degradation to STORY_KERNEL alone with provenance warning. Alternative: hard-block until PG-0001 finalized.
3. **PROSESPLIT-009 FOUNDATIONS.md update granularity** — currently proposed: minimal clarifications to Rules 1+7 plus one §Story Bundles paragraph. Alternative: explicit new §Plan-and-Finalize Pipeline section.

## Follow-up work not scoped here

- **Re-finalize mode** — `branching-story-page-prose-finalize` does not currently support replacing already-rendered prose. The `prose_status: superseded` enum value is reserved for future use but not implemented in PROSESPLIT-005 scope.
- **Pre-rework bundle migration** — existing PG records lack the three new schema fields. The plan is grandfathering via per-world `audits/validation-grandfathering.yaml` entries (existing pattern). A one-shot migration script for renaming `pages-prose/PG-NNNN.md` retroactively into a synthetic plan is NOT scoped here; if needed, a follow-up ticket can add it.
- **Automated re-extraction of `reports/prose-quality-instructions.md`** — manual re-extraction is acceptable for now since the prose-craft-contract changes infrequently. If the contract starts evolving rapidly, automation can be a follow-up ticket.
