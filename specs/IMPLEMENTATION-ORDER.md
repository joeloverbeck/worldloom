# Implementation Order — SPEC-105 through SPEC-111

**Date:** 2026-06-01
**Scope:** the seven specs derived from the critical triage of `reports/manual-story-studio-second-iteration.md`. All seven are Manual Story Studio (`tools/manual-story-studio`) tooling-adjacent work; none touch canon, MCP, patch engine, or world-index beyond `enumerate.ts`'s already-shipped exclusion.
**Status:** SPEC-105, SPEC-106, SPEC-107, and SPEC-108 are completed and archived; this order now governs SPEC-109 through SPEC-111.

---

## Dependency graph

```
SPEC-105 (integrity foundation)
  ├─→ SPEC-108 (segment lifecycle — depends on typed-error reads)
  ├─→ SPEC-109 (current-context layer — depends on typed-error reads)
  ├─→ SPEC-110 (beat template fields — depends on typed-error reads)
  └─→ SPEC-111 (UX cockpit pieces — depends on /health endpoint + HealthBanner scaffold)

SPEC-106 (prompt leakage hard-tier) — complete
SPEC-107 (prose/state contract correction) — complete

SPEC-109 (current-context layer)
  └─→ SPEC-111 (UX cockpit pieces — Dashboard CurrentStatePanel consumes current-context)
```

SPEC-107 had no inbound dependencies and is complete. SPEC-106 had no inbound dependencies and is complete.

## Recommended landing order

1. **SPEC-105** — Fail-fast state integrity + health endpoint + build-script inclusion.
   *Completed and archived.* Downstream specs should treat `archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md` as landed. It unblocks 108 / 109 / 110 / 111 because every downstream spec consumes its `ReadResult<T>` discriminated union or its `/health` endpoint or both.
2. **SPEC-106** — Prompt leakage hard-tier promotion.
   *Completed and archived.* Downstream references should treat `archive/specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md` as landed. Ticket evidence lives in `archive/tickets/SPEC106MANSTOSTU-001.md` through `archive/tickets/SPEC106MANSTOSTU-004.md`.
3. **SPEC-107** — Prose/state contract correction + doc cleanup.
   *Completed and archived.* Downstream references should treat `archive/specs/SPEC-107-manual-story-studio-prose-state-contract-correction.md` as landed. Ticket evidence lives in `archive/tickets/SPEC107MANSTOSTU-001.md`.
4. **SPEC-108** — Segment lifecycle append-only by default.
   *Completed and archived.* Downstream references should treat `archive/specs/SPEC-108-manual-story-studio-segment-lifecycle-append-only.md` as landed. Ticket evidence lives in `archive/tickets/SPEC108MANSTOSTU-001.md` through `archive/tickets/SPEC108MANSTOSTU-008.md`.
5. **SPEC-109** — Current-context selector layer.
   *Depends on 105.* Lands after 105; introduces a new authoring artifact (`current-context.yaml`) and plumbs the prompt composer.
6. **SPEC-110** — Beat template pressure/turn card fields.
   *Depends on 105.* Lands after 105. Independent of 108 / 109 in implementation; can land in parallel with either of them. (When SPEC-109's current-context is present, SPEC-110's filter tie-breaker engages — but the filter changes ship as a SPEC-110-internal concern; SPEC-109 does not need to land first for SPEC-110 to be useful.)
7. **SPEC-111** — UX cockpit pieces (health banner persistence, sibling-page nav, ID hiding, unsaved-change handling).
   *Depends on 105 + 109.* Lands last; consumes both the health-banner scaffold from 105 and the current-context surface from 109 for the Dashboard cockpit reshape.

## Concurrency hint

A small team or a single contributor with parallel branches can ship in the following waves:

- **Wave 1**: SPEC-105 alone (complete).
- **Wave 2**: SPEC-106, SPEC-107, and SPEC-108 complete; SPEC-109 + SPEC-110 can continue in parallel branches off of post-105 main.
- **Wave 3**: SPEC-111 after SPEC-109 ships.

A solo contributor working serially follows the remaining numbered list above (109 → 110 → 111). The numeric order is one valid implementation sequence and the recommended default; the dependency graph above is authoritative.

## Notes

- All seven specs are `tooling-adjacent` per the brainstorm classification; none require canon-pipeline review or FOUNDATIONS amendments. Each spec's §5 FOUNDATIONS Alignment table is included for discipline (verifies the spec does not inadvertently engage canon surfaces it should leave alone), not because FOUNDATIONS principles drive the design.
- The report's §31 Stages 6 (schema deepening), 9 (acceptance test layer as standalone), and 10 (optional world-canon import) are **explicitly deferred** per the triage; they are not in this implementation order and do not have specs in this batch.
- The report's §15 lowercase-ID rename, §8 same-basename sidecar collapse, and §8/§30 beat-template directory move are **explicitly rejected** per the triage and do not have specs.
- The Stage 9 "acceptance test layer" recommendation is satisfied by each spec carrying its own acceptance tests in its Acceptance Criteria section, not by a standalone testing-infrastructure spec.

## Triage reference

Full per-finding verdicts and rationale: `docs/triage/2026-06-01-manual-story-studio-second-iteration-triage.md`.
