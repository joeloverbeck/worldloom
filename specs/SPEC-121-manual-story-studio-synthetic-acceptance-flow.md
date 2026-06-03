# SPEC-121 — Manual Story Studio: Synthetic One-Real-Story Acceptance Flow

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (`tools/manual-story-studio`; a single end-to-end acceptance test over an existing, synthetic, world-agnostic fixture; no LLM/MCP/patch-engine; no production code change required beyond test scaffolding).
**Depends on:** `archive/specs/SPEC-117-manual-story-studio-post-segment-record-workbench.md` (post-segment workbench — step 19), `archive/specs/SPEC-118-manual-story-studio-prompt-visibility-and-language.md` (`never_prompt`/exclusion — step 13), and the landed core-loop specs SPEC-112…SPEC-116 (pickers, inclusion ledger, delete lifecycle, source browser, health gating).
**Blocks:** —
**Related:** `tools/manual-story-studio/test/`, the read/write/prompt/health/segment layers exercised end-to-end, a new synthetic fixture world.
**Source:** critical triage of `reports/manual-story-studio-fourth-iteration.md` §§28 / 45 + Stage 8 (ChatGPT-Pro, 2026-06-02). Deferred in iterations 2–3 (lift-condition "until the core-loop feature specs land"); the user selected it for this batch (AskUserQuestion, 2026-06-02) now that the loop is complete.

---

## 1. Context & Motivation

The package has broad unit/route coverage but no **single end-to-end proof that one real author loop completes**. Per the report (§28): "That one flow matters more than another dozen isolated tests." The iteration-2 triage rejected a *standalone test-layer spec* because per-feature acceptance sufficed during the build-out; now that the loop's features have landed (and SPEC-117/118 complete the post-segment + prompt-safety pieces), a deliberately tiny, **world-agnostic** acceptance flow is warranted to lock the loop against regression.

The flow must **not** be tied to a real world (e.g., `animalia`); it uses a synthetic, self-contained fixture so the test is hermetic and stable.

## 2. Scope

### In scope

1. **Synthetic fixture world** "The Glass Orchard" (report §45): orchard trees hold memories; a guild taxes memory-fruit; a character hides a broken grafting knife. Cast: Mira (tax-guild inspector), Len (orchard keeper). Created under a test-only world root the read layer can browse, so the source-browser step is real (read-only) without touching any production world.
2. **One end-to-end acceptance test** driving the actual read/write/prompt/health/segment layers (browser-like at the API/service level; no live external LLM — pasted prose is a fixture) through the report §45 steps, condensed to the load-bearing assertions:
   - create manual story; browse synthetic world source (read-only); create Mira/Len cast + facts from literal source;
   - create belief / emotion / plan / relationship / clock / secret / question / consequence via the record layer; link non-cast records through the selector data;
   - set the Prompt Working Set; **exclude the true answer from the prompt** (assert it does not appear — exercising archived SPEC-118 `never_prompt`/`excluded_records`);
   - compose prompt for **3-5 beats** (assert archived SPEC-118 default); inspect included/excluded/suppressed (assert the resolution ledger reflects the working set); save/copy prompt (assert no hard lint, no internal IDs in markdown);
   - paste an accepted segment; read compiled manuscript;
   - land on the **post-segment workbench** (SPEC-117) and assert the broad-referrer "touches this segment" pile (not the deleted checklist); update records (plan changes, belief changes, clock advances, new consequence);
   - delete an unreferenced obsolete fact (hard delete); attempt to delete a referenced secret and assert it **blocks with referrer cards**;
   - use repair mode for one artificial segment error;
   - corrupt current-context and assert **scoped** health blocking (only dependent actions blocked, per the report §27 scoping note).
3. **Hermetic teardown** — the test creates and removes its synthetic world/story in a temp location; it must not leave artifacts under any real `worlds/<slug>/`.

### Out of scope

- Any live external LLM call (prose is a fixture; the boundary is honored).
- A browser/Playwright harness if the existing test runner can drive the service layer adequately (prefer the lower-ceremony path; the report calls it "browser-like," not "in a browser"). If a real DOM-level harness is later wanted, that is a separate tooling spec.
- Asserting the deferred broad schema fields (triage D1) — the test uses current record fields.
- Tying the fixture to a production world.

## 3. Key decisions

- **Synthetic and hermetic.** A self-contained fixture world keeps the test stable and world-agnostic (report §28 explicitly: "do not tie this to `animalia`").
- **Service-level, not necessarily DOM-level.** Drive the real read/write/prompt/health/segment code paths; only reach for a browser harness if the service layer cannot express a step. Lower ceremony, less flake.
- **One flow, load-bearing assertions.** Condense the 23-step script to the assertions that prove the loop (exclusion holds, prompt composes clean, workbench uses broad scan, referenced delete blocks, health scoping works) rather than mechanically scripting every UI click.
- **Sequenced last.** It exercises archived SPEC-117 and archived SPEC-118 and the landed loop; it lands after them.

## 4. Files to touch

**Create:**
- `tools/manual-story-studio/test/fixtures/glass-orchard/` — the synthetic world (WORLD_KERNEL + a couple of `_source` facts + two characters), minimal and read-only.
- `tools/manual-story-studio/test/acceptance/one-real-story.test.ts` — the end-to-end flow with the §2 assertions and hermetic setup/teardown.
- (if needed) a small test helper to spin a temp manual-story root + temp world root.

**Modify:**
- none expected in production code; if a step reveals a missing read-only seam (e.g., the test needs a service entry point that only the route exposes), prefer a minimal additive test-friendly export over duplicating logic, and note it.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Fail-fast / validated state at the boundary | aligns @ health-scoping assertion | The test asserts the health layer blocks only *dependent* actions on a corrupted current-context, proving the fail-fast rail is scoped, not blanket (report §27). |
| Prose/state separation | aligns @ pasted-fixture prose | Prose is an external fixture; the test never has the tool infer state from prose — it asserts the post-segment workbench surfaces candidates without inferring changes. |
| Prompt-boundary safety | aligns @ exclusion + no-ID assertions | The test asserts the excluded/`never_prompt` true answer never reaches the prompt and that no internal ID appears in the composed markdown. |
| §Canonical Storage Layer / Hook 3 | aligns @ hermetic teardown | The synthetic world lives in a temp/test location and is torn down; the test never writes a real `worlds/<slug>/` or any `_source/` surface. |

## 6. Acceptance criteria

1. One test creates the synthetic Glass Orchard world + a manual story, runs the full loop, and tears everything down hermetically (no leftover artifacts under real `worlds/`).
2. The excluded/`never_prompt` "true answer" record is asserted absent from the composed prompt markdown; no internal `mXXX-n` ID appears in the markdown.
3. Composed prompt uses the `3-5` beat default.
4. Post-segment step lands on the workbench and asserts the broad-referrer "touches this segment" pile (a record linked via `holder`/`between`/`held_by` appears).
5. Hard-delete of an unreferenced fact succeeds; delete of a referenced secret blocks with referrer information; force path is repair-gated.
6. A corrupted current-context blocks only dependent actions (scoped health), not all actions.
7. `cd tools/manual-story-studio && npm run test:backend` (which includes this acceptance test) passes; full `npm test` green.

## 7. Test plan

- Backend (includes the acceptance test): `cd tools/manual-story-studio && npm run test:backend`
- Full: `cd tools/manual-story-studio && npm test`
