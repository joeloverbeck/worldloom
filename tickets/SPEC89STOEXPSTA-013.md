# SPEC89STOEXPSTA-013: Capstone smoke test — hybrid manual runbook + automated coverage

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/story-explorer/test/capstone-spec89-smoke.test.ts` parallel to SPEC-88's landed capstone-spec88-smoke.test.ts pattern
**Deps**: SPEC89STOEXPSTA-012

## Problem

SPEC-89 §15 prescribes a capstone proof for the X-Ray surface, paralleling SPEC-88's `tools/story-explorer/test/capstone-spec88-smoke.test.ts` pattern. The capstone records the manual X-Ray runbook (open each tab, expand a card, follow a linked-record chip, expand a hybrid STCHAR card, observe a broken-reference chip) AND adds portable automated coverage for the X-Ray's built-bundle membership, reading-surface source-map membership, and any test-suite-runnable invariants. Per the Spec-Integration Ticket Shape's **manual-dry-run capstone variant** (some §15 bullets require human interaction — clicking through tabs, observing visual states), the test file is structured as a hybrid: header-comment manual runbook + automated test body for the test-suite-runnable portion.

## Assumption Reassessment (2026-05-26)

1. SPEC-88's `tools/story-explorer/test/capstone-spec88-smoke.test.ts` exists and is the structural reference for the SPEC-89 capstone (verified). SPEC-88 §10 chained build/test scripts at the package root produce both backend and web halves; SPEC-89's automated capstone tests integrate into the same test runner (`node --test` for backend-side tests; the X-Ray's web-side tests are covered by the vitest suite). The capstone's check is package-integration-boundary verification, not deep X-Ray behavior testing (which is owned by the per-component tests in -001 through -012).
2. SPEC-89 §15 (Build & test) prescribes the capstone shape. SPEC-88's landed capstone uses `fs.cpSync` to copy a fixture-world bundle to a temp root and verifies post-build artifacts; the SPEC-89 capstone follows the same fixture pattern.
3. Cross-skill boundary: SPEC-88's capstone is the canonical pattern this ticket mirrors. The X-Ray's automated assertions are a SUPERSET of SPEC-88's (X-Ray source-map membership IS the new assertion; the manual runbook covers the rest). The capstone runs as part of `npm test` at the package root and does not require world-content fixtures to be present in the checkout (uses temp-seeded fixtures per SPEC-87's capstone deviation).

## Architecture Check

1. Hybrid manual-runbook + automated capstone (per the Spec-Integration Ticket Shape's manual-dry-run capstone variant) — the alternative (fully automated) would require headless-browser instrumentation to click through tabs, which is heavy for the marginal coverage gain; the hybrid approach lets the automated layer verify what tests CAN verify (bundle artifacts, source maps, post-build state) and leaves the human-driven interactive verification to a documented runbook.
2. No backwards-compatibility aliasing or shims — the capstone is greenfield; the SPEC-88 capstone-spec88 file remains untouched.

## Verification Layers

1. Built X-Ray bundle includes the new components (XRayPanel, RecordCardCompact, etc.) — source-map membership check via reading `web/dist/assets/*.js.map` for the expected source filenames → automated assertion.
2. `npm test` at the package root passes both halves (backend `node --test` + web vitest) including all X-Ray tests from -001 through -012 → automated assertion via subprocess invocation.
3. Manual runbook header documents the human-interactive verification steps for the §15 §15 bullets that require skill dry-runs / visual confirmation → comment-only; implementer follows the runbook before declaring SPEC-89 landed.

## What to Change

### 1. Create `tools/story-explorer/test/capstone-spec89-smoke.test.ts`

Structure mirrors `tools/story-explorer/test/capstone-spec88-smoke.test.ts`:

**File header comment — manual runbook**:
```ts
/**
 * SPEC-89 Capstone Smoke — Manual Runbook
 *
 * Before declaring SPEC-89 landed, manually verify the following in dev mode
 * against a real story bundle (e.g., worlds/erotica-world/stories/red-bunny/
 * when present in your checkout, or a temp-seeded equivalent):
 *
 * 1. Open a reading page; the State X-Ray section appears below the choice list.
 * 2. Click each of the four tabs — Current State / What Changed Here / Plan & Prose / Validation & Integrity.
 *    Each tab renders its prescribed content (records, SE delta, plan body + receipt, validation trace).
 * 3. In Current State, expand a record card; the expanded view shows fields + provenance trail + raw-view button.
 * 4. In Current State, click a record-ID chip pointing to another active record; the X-Ray scrolls to that card.
 * 5. In Current State, click a record-ID chip pointing to a not-active record; a right-side peek panel opens.
 * 6. In Validation & Integrity, observe a broken-reference chip (intentionally introduce one by editing a
 *    record off-pipeline) renders with the cited ID.
 * 7. In Current State, expand a STCHAR card; the body splits into section disclosures (Capabilities, Voice, etc.).
 * 8. Resize the viewport: desktop shows the sticky right rail; mobile shows the inline summary bar.
 * 9. Use ArrowRight/ArrowLeft on the tab list; focus + aria-selected cycle through tabs.
 * 10. Set `prefers-reduced-motion: reduce` in browser devtools; expand/collapse animations are disabled.
 *
 * Steps 1-10 are checklist items for the implementer; the automated assertions below cover the
 * test-suite-runnable portion (built bundle membership, source maps, npm test pass).
 */
```

**Automated test body** — `node --test` style asserting:
- The built X-Ray bundle exists at `web/dist/`.
- Source-map files contain `XRayPanel`, `RecordCardCompact`, `RecordCardExpanded`, `XRayTabs` (proves they're built into the bundle).
- `npm test` from the package root passes (subprocess assertion).
- API routes remain enveloped post-X-Ray (regression check against SPEC-87's read-only fence).
- Absent-`web/dist` graceful fallback (when web bundle hasn't been built, backend still starts).

### 2. Wire into the package test chain

SPEC-88 §10's chained `npm test` already runs the backend test suite via `node --test dist/test/*.js`; the new capstone file is picked up automatically once compiled into `dist/test/`. No package.json change needed.

## Files to Touch

- `tools/story-explorer/test/capstone-spec89-smoke.test.ts` (new)

## Out of Scope

- Modifying SPEC-88's capstone-spec88 file — it stays untouched.
- Headless-browser instrumentation for the manual-runbook steps — that's a heavyweight surface change; the runbook + automated bundle-membership approach is the chosen pattern.
- Modifying the package-root test runner — the new capstone is picked up automatically.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run build:backend && node --test dist/test/capstone-spec89-smoke.test.js` — automated assertions pass.
2. `cd tools/story-explorer && npm test` — full package test suite (backend + web) passes including the new capstone.
3. Manual runbook (10 steps in the file header) completed by the implementer before declaring SPEC-89 landed.

### Invariants

1. The capstone NEVER mutates checkout-local files — uses `fs.cpSync` to copy fixtures to a temp root, parallel to SPEC-87 + SPEC-88 capstone patterns.
2. The manual runbook is the test file's header comment, not a separate document — keeping it co-located with the automated assertions ensures both surfaces evolve together.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/capstone-spec89-smoke.test.ts` — new capstone with hybrid runbook + automated assertions.

### Commands

1. `cd tools/story-explorer && npm run build:backend && node --test dist/test/capstone-spec89-smoke.test.js` — targeted capstone run.
2. `cd tools/story-explorer && npm test` — full package suite.
3. Manual runbook in the test file header — implementer checklist.
