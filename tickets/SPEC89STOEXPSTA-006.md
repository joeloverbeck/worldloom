# SPEC89STOEXPSTA-006: Plan & Prose tab — page plan + receipt + 10 validation surfaces

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies the `tabs/PlanProseTab.tsx` stub created by SPEC89STOEXPSTA-001 to render the page plan body, the prose receipt summary, and the ten prose-attach validation surfaces
**Deps**: SPEC89STOEXPSTA-001, SPEC89STOEXPSTA-002

## Problem

SPEC-89 §4.3 defines Plan & Prose as the X-Ray tab that surfaces the page-plan body (`pages-prose-plans/PG-<n>.md`), the prose receipt summary (`pages-prose-receipts/PG-<n>.yaml`), and the ten validation surfaces from the `branching-story-prose-attach` skill (eight deterministic checks per shared contract §4.6 plus the `char_authority_leak` verdict plus per-§16a-packet STCHAR `profile_fidelity[]` blocks). The plan body is fetched via SPEC-87's `/page-plans/:pageId` route; the receipt via `/prose-receipts/:pageId`. Both fetches fire on-demand when the user opens this tab. The plan body is rendered as sanitized markdown and clearly labeled as "Page Plan (rendering instructions, not reader prose)" per the SPEC-89 §4.3 boundaries banner.

This tab honors the FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary: the plan body NEVER appears in the reading-surface prose panel (per SPEC-88), and the receipt summary makes the prose-quality verdict visible alongside the plan without conflating them.

## Assumption Reassessment (2026-05-26)

1. `tabs/PlanProseTab.tsx` exists as a stub after SPEC89STOEXPSTA-001 lands (intra-batch dependency). SPEC-87 `/api/.../page-plans/:pageId` route exists per `tools/story-explorer/src/server/routes/prose.ts:35` (verified). SPEC-87 `/api/.../prose-receipts/:pageId` route exists per `tools/story-explorer/src/server/routes/prose.ts:48` (verified). The receipt response includes verdict, state-hash status, and per-check verdicts per the prose-attach skill's receipt schema at `.claude/skills/branching-story-prose-attach/SKILL.md:325-332`.
2. SPEC-89 §4.3 (Plan & Prose tab specification, updated 2026-05-26 to clarify "ten validation surfaces" — 8 deterministic checks + `char_authority_leak` verdict + STCHAR `profile_fidelity[]` blocks). SPEC-88's `lib/sanitize-markdown.ts` per `tools/story-explorer/web/src/lib/sanitize-markdown.ts` is the canonical markdown sanitization surface.
3. Cross-skill boundary: SPEC-87's two routes are the data sources. `branching-story-prose-attach`'s receipt schema is the authoritative shape for the per-check verdicts; the skill's SKILL.md §Phase 3 + Phase 6 define the ten validation surfaces' names (`hash_integrity`, `engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `choice_consequence_visibility`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`, `char_authority_leak`, `stchar_authority[].profile_fidelity[]`). The tab consumes whichever verdicts the receipt records and displays them with their PASS/WARN/FAIL chips.
4. FOUNDATIONS principle restatement: §Story Bundles §4a — Plan-Authority Boundary. The page plan is engine-readable engine artifact, not reader prose; SPEC-89 §4.3's "labeled clearly as 'Page Plan (rendering instructions, not reader prose)'" and "Plan body is NEVER rendered as prose anywhere else in the UI" rules enforce this boundary at the X-Ray layer. The Plan & Prose tab is the ONLY place the plan body appears; SPEC-88's `<ProseMissingPlaceholder>` never substitutes the plan for missing prose.

## Architecture Check

1. Lazy on-demand fetching (both `/page-plans/:pageId` and `/prose-receipts/:pageId` only fire when the tab opens) keeps PageDetail responses bounded — SPEC-87 §4 explicitly chose this separation: `PageDetail` returns only `pagePlanSummary` and `receiptSummary`, with full body on-demand. The alternative (eager fetch from XRayPanel) would force every page-load to fetch a potentially-large markdown plan; lazy is cheaper and aligns with the SPEC-87 contract.
2. No backwards-compatibility aliasing or shims — modifies the SPEC89STOEXPSTA-001 stub in place; the markdown sanitizer from SPEC-88 is reused without a fallback path.

## Verification Layers

1. Plan body fetches `/page-plans/:pageId` on tab open and renders via SPEC-88's sanitize-markdown helper → mock-fetch render test → vitest + RTL.
2. Receipt summary fetches `/prose-receipts/:pageId` and renders the verdict + state-hash status + per-check verdicts → mock-fetch test with a full-receipt fixture.
3. Each of the ten validation surfaces is rendered as a labeled row with a PASS/WARN/FAIL chip → snapshot test of the receipt-display block.
4. FOUNDATIONS alignment: §Story Bundles §4a — the boundaries banner reads "Plan, prose, and receipt are distinct artifacts. PG is the authoritative page snapshot." → render test asserting the banner string is present → FOUNDATIONS-alignment check via grep on the rendered DOM.

## What to Change

### 1. Modify `tabs/PlanProseTab.tsx`

Replace the placeholder with the real implementation:

- Accept `pageDetail: PageDetail` as a prop.
- On mount: fetch `/api/.../page-plans/{pageId}` and `/api/.../prose-receipts/{pageId}` in parallel via Promise.all.
- Render the **boundaries banner** at the top: `<aside>Plan, prose, and receipt are distinct artifacts. PG is the authoritative page snapshot.</aside>` (visually styled but textually verbatim).
- Render the **plan section**:
  - Header: `<h3>Page Plan (rendering instructions, not reader prose)</h3>` (label is verbatim per §4.3 + SPEC-89 §13 §Story Bundles §4a row).
  - Body: sanitized markdown of the response body via SPEC-88's `lib/sanitize-markdown.ts`.
  - Plan-hash advisory chip: `{computed-vs-recorded}` status (per SPEC-89 §4.3 "Plan hash present / missing — advisory chip"); fetched alongside the body.
- Render the **receipt section**:
  - Header: `<h3>Prose Receipt</h3>` with the verdict chip (`accept` / `reject` / `revise` / etc.).
  - State-hash status: `match | mismatch | not-checked` chip (verdict-driving per prose-attach contract).
  - **Per-check results table**: one row per validation surface, with the surface name and a PASS/WARN/FAIL chip:
    1. hash_integrity
    2. engine_jargon_leak
    3. forbidden_mystery_resolution
    4. required_event_rendered
    5. choice_consequence_visibility
    6. entity_status_consistency
    7. invented_structural_fact
    8. canon_claim_without_authority
    9. char_authority_leak
    10. STCHAR fidelity (per-packet `profile_fidelity[]` blocks)
  - When the receipt is missing entirely, render "No receipt for this page" rather than fabricating one.

### 2. Add `tabs/__tests__/PlanProseTab.test.tsx`

Render tests covering: (a) full plan + full receipt fixture; (b) missing receipt fixture; (c) plan-hash mismatch fixture; (d) the boundaries banner is present.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/tabs/PlanProseTab.tsx` (modify — replace stub from SPEC89STOEXPSTA-001)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` (new)

## Out of Scope

- Modifying SPEC-87's `/page-plans/:pageId` or `/prose-receipts/:pageId` route shapes — those are landed and the SPEC-87 fence forbids edits without an explicit SPEC-87 amendment.
- Re-validating the prose against the receipt's per-check rules client-side — the receipt's verdicts are authoritative; the X-Ray displays them.
- Linked-record navigation behavior (SPEC89STOEXPSTA-008).
- Rendering the plan body in the prose panel (SPEC-88's `<ProsePanel>` never does this; the Plan & Prose tab is the only allowed surface).
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- PlanProseTab.test` — full plan + receipt + missing-receipt + plan-hash mismatch fixtures all pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. Visual smoke in dev mode: open PG-1 with a known plan + receipt fixture; tab renders the boundaries banner + plan body + 10-row receipt table.

### Invariants

1. The plan body NEVER appears outside this tab. Grep-proof: `tools/story-explorer/web/src/components/ProsePanel.tsx` MUST NOT import `PlanProseTab` and MUST NOT reference plan body fetching.
2. The boundaries banner text is verbatim from SPEC-89 §4.3; any rewording is a Rule 6 silent retcon and is rejected.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` — fixture-driven render tests covering the four primary scenarios.

### Commands

1. `cd tools/story-explorer/web && npm test -- PlanProseTab.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.
