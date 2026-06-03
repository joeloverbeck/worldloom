# SPEC121MANSTOSTU-001: Synthetic one-real-story acceptance test (Glass Orchard)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: None — added a backend acceptance test + an inline test-fixture helper under `tools/manual-story-studio/test/acceptance/`; no production code change or engine-routed world-content write. Also truthed same-seam SPEC-121 / implementation-order status notes.
**Deps**: None — exercises only already-landed SPEC-112…SPEC-118 surfaces (all COMPLETED + archived); no in-batch or pending ticket blocks it.

## Problem

At intake, `tools/manual-story-studio/` had broad unit/route coverage but **no single end-to-end proof that one real author loop completes** (SPEC-121 §1; report `reports/manual-story-studio-fourth-iteration.md` §28: "That one flow matters more than another dozen isolated tests"). With the core-loop features landed (SPEC-112 pickers, SPEC-113 inclusion ledger, SPEC-114 delete lifecycle, SPEC-115 source browser, SPEC-116 health gating, SPEC-117 post-segment workbench, SPEC-118 `never_prompt`/beat default), this ticket added a deliberately tiny, **world-agnostic** acceptance flow over a synthetic "Glass Orchard" fixture. The test is not tied to a real world (e.g., `animalia`); it uses a synthetic, self-contained fixture built inline under a temp root so the test is hermetic and stable.

## Assumption Reassessment (2026-06-03)

1. **Service-layer surfaces the test drives all exist and are directly callable** (verified at reassessment + Step 2 spot-check): `readWorldSource(repoRoot, slug)` (`src/read/world-source.ts:50`, reads `<repoRoot>/worlds/<slug>/`); `createRecord`/`updateRecord`/`deleteRecord` (`src/write/records.ts:56,68,127`, with `force` flag → `force_deleted` + `repair-log.yaml`); `composePrompt` (`src/prompt/compose.ts`, `excluded_records` at `:136`, `never_prompt` suppression at `:217`); `no_internal_record_ids` lint (`src/prompt/lint.ts:90` `INTERNAL_ID_REGEX=/\bm[a-z]+-[0-9]+\b/g`); health compute (`src/health/compute.ts`); `scanReferences` broad-referrer scan (`src/read/records.ts`, link fields `holder`/`between`/`held_by` at `:249-263`). The post-segment-workbench is a landed route (`src/server/routes/post-segment-workbench.ts:158`) reachable via Fastify `inject` (precedent: `test/server/*-routes.test.ts`); **no production code change is expected** (SPEC-121 §4). The 3-5 beat default is `src/prompt/sections/section-5-required-beat-cluster.ts:5 DEFAULT_BEAT_COUNT="3-5"` + `src/write/manual-story-metadata.ts:80`.
2. **Spec + landed predecessor surfaces** (verified): SPEC-121 (this spec, reassessed 2026-06-03); SPEC-112…SPEC-118 all COMPLETED + archived under `archive/specs/`. SPEC-117 and SPEC-118 both carry `Blocks: SPEC-121`. The fixture-construction approach follows the established sibling-test precedent in `test/capstone-spec104.test.ts` (`mkFixture()` → `mkdtempSync` temp `repoRoot` + `resolveManualStoryRoot` + `safeWriteFile` + `cpSync`) and `test/read/world-source.test.ts` (inline `worlds/<slug>/WORLD_KERNEL.md` writes).
3. **Cross-artifact boundary under audit**: the manual-story-studio **service/route API contract** spanning the read / write / prompt / health / segment layers. This ticket audits that the contract is exercisable end-to-end at the API/service level (browser-like, not DOM-level — SPEC-121 §3) without duplicating production logic and without a real DOM/Playwright harness. The test consumes the layers' exported functions and the existing HTTP routes (via Fastify `inject`); it must not reach into module internals or re-implement composition/scan/health logic.
4. **FOUNDATIONS §Canonical Storage Layer / Hook 3 + prompt-boundary safety** motivate this ticket. §Canonical Storage Layer: `_source/*.yaml` is engine-only; the test therefore builds its synthetic world **inline at runtime under a `mkdtempSync` temp `repoRoot`** (via `fs`/`safeWriteFile`) and tears it down (`rmSync`), never writing or mutating a real `worlds/<slug>/` or `_source/` surface — and committing static `_source/*.yaml` fixture files is avoided (no static `_source/*.yaml` fixtures exist in the package's test trees today, and authoring engine-only `_source/<subdir>/*.yaml` via the editor trips Hook 3). Prompt-boundary safety: the test asserts the working-set-`excluded_records` true answer never reaches the composed markdown and that no internal `mXXX-n` ID appears. Both are honesty/boundary assertions, not canon mutations — manual-story-studio is the SPEC-100 write-enabled-but-canon-fenced package; this ticket adds no canon-mediation surface.
5. **Final implementation boundary**: no production seam was missing, so no production code changed. Closeout added a dated implementation note to `archive/specs/SPEC-121-manual-story-studio-synthetic-acceptance-flow.md` and updated `archive/specs/IMPLEMENTATION-ORDER-2026-06-03.md` so same-seam status prose no longer says SPEC-121 is still only last-to-land pending work.

## Architecture Check

1. **One coherent end-to-end test over the real layers beats a dozen more isolated unit tests** (report §28): the per-feature suites already prove each surface in isolation; the gap is a single proof that the composed loop completes. Driving the actual service/route code paths (not mocks) at the API level is lower-ceremony and less flake-prone than a DOM/Playwright harness while still exercising the real composition (SPEC-121 §3 "Service-level, not necessarily DOM-level").
2. No backwards-compatibility shims or aliases introduced — this is net-new test code. The fixture helper is a private test module consumed only by this acceptance test; it duplicates no production logic (it constructs input data and calls the real service functions). The test condenses the report §45 23-step script to the load-bearing assertions (exclusion holds, prompt composes clean, workbench uses the broad scan, referenced delete blocks, scoped health) rather than mechanically scripting every UI click.

## Verification Layers

1. Full author loop completes end-to-end over a synthetic world with hermetic setup/teardown → skill/integration test (the acceptance test itself), asserting no leftover artifacts under any real `worlds/<slug>/` (everything under `mkdtempSync` tmpdir, removed in teardown).
2. Working-set-`excluded_records` "true answer" absent from composed markdown; no internal `mXXX-n` ID present → composed-prompt assertion + `lint.ts` `no_internal_record_ids` check (grep-equivalent assertion on the markdown).
3. Composed prompt uses the `3-5` beat default → assertion against `section-5-required-beat-cluster.ts` output.
4. Post-segment workbench surfaces the broad-referrer "touches this segment" pile (a record linked via `holder`/`between`/`held_by` appears) → route assertion via Fastify `inject` against `GET …/post-segment-workbench` (or direct `scanReferences` assertion).
5. Hard-delete of an unreferenced fact succeeds; delete of a referenced secret blocks with referrer information; force path is repair-gated (force → `force_deleted` + `repair-log.yaml` entry) → `deleteRecord` service assertions (parallels `test/write/delete-lifecycle.test.ts`).
6. A corrupted current-context blocks only dependent actions, not all actions → health-compute assertion (parallels `test/health/dependency-scoped-blocking.test.ts`).

## Landed Changes

### 1. Inline Glass Orchard fixture helper

Added `tools/manual-story-studio/test/acceptance/glass-orchard-fixture.ts`: a helper that, given a `mkdtempSync` temp `repoRoot`, builds the synthetic world inline (NOT as committed static files) —
- `worlds/glass-orchard/WORLD_KERNEL.md` (minimal), a couple of `_source` facts (orchard trees hold memories; a guild taxes memory-fruit), and two `characters/*.md` (Mira — tax-guild inspector; Len — orchard keeper), written via `fs`/`safeWriteFile` so the read layer can browse them read-only (`readWorldSource` reads `<repoRoot>/worlds/<slug>/`).
- A temp manual-story root via `resolveManualStoryRoot(repoRoot, worldSlug, msSlug)` + `safeWriteFile("manual-story.yaml", …)`.
It follows the `test/capstone-spec104.test.ts` temp-root pattern and provides a teardown helper (`rmSync(repoRoot, {recursive, force})`).

### 2. End-to-end acceptance test

Added `tools/manual-story-studio/test/acceptance/one-real-story.test.ts` driving the report §45 flow condensed to load-bearing assertions:
- create manual story; browse synthetic world source (read-only); create Mira/Len story-local cast + facts from literal source;
- create belief / emotion / plan / relationship / clock / secret / question via the record layer; link non-cast records through the selector data (`holder`/`between`/`held_by`);
- set the Prompt Working Set; **exclude the true answer** via the working-set `excluded_records` list; compose prompt for 3-5 beats; inspect included/excluded/suppressed (resolution ledger reflects the working set); assert the excluded answer is absent from the composed markdown and no internal `mXXX-n` ID appears; save/copy prompt (no hard lint);
- paste an accepted segment; read compiled manuscript;
- hit the post-segment workbench (Fastify `inject` on the landed route) and assert the broad-referrer "touches this segment" pile (a `holder`/`between`/`held_by`-linked record appears — not the deleted checklist); update records (plan changes, belief changes, clock advances, new consequence);
- hard-delete an unreferenced obsolete fact; attempt to delete a referenced secret and assert it blocks with referrer cards; assert the force path is repair-gated (`force` → `force_deleted` + `repair-log.yaml`);
- use repair mode for one artificial segment error;
- corrupt current-context and assert scoped health blocking (only dependent actions blocked).
Hermetic setup/teardown: create + remove the synthetic world/story in the temp location; never leave artifacts under any real `worlds/<slug>/`.

### 3. Same-seam spec/order truthing

Updated `archive/specs/SPEC-121-manual-story-studio-synthetic-acceptance-flow.md` with `Status: COMPLETED` and a dated implementation note. Updated `archive/specs/IMPLEMENTATION-ORDER-2026-06-03.md` so the SPEC-121 row reflects completion and archival.

## Files to Touch

- `tools/manual-story-studio/test/acceptance/one-real-story.test.ts` (new)
- `tools/manual-story-studio/test/acceptance/glass-orchard-fixture.ts` (new)
- `archive/specs/SPEC-121-manual-story-studio-synthetic-acceptance-flow.md` (modify)
- `archive/specs/IMPLEMENTATION-ORDER-2026-06-03.md` (modify)

## Out of Scope

- Any live external LLM call — pasted prose is a fixture; the boundary is honored.
- A browser/Playwright DOM-level harness — prefer the service-layer path; a real DOM harness, if later wanted, is a separate tooling spec.
- Asserting the deferred broad schema fields (triage D1) — the test uses current record fields.
- Tying the fixture to a production world (`animalia` or any real `worlds/<slug>/`).
- Re-scripting SPEC-118 `never_prompt` per-record precedence — already covered in isolation by `test/prompt/never-prompt.test.ts`.
- Any production code change beyond a minimal additive read-only test seam if (and only if) a step reveals a missing one (note it if used).

## Acceptance Criteria

### Tests That Must Pass

1. The acceptance test creates the synthetic Glass Orchard world + a manual story, runs the full loop, and tears everything down hermetically — no leftover artifacts under any real `worlds/`.
2. The working-set-`excluded_records` "true answer" record is asserted absent from the composed prompt markdown; no internal `mXXX-n` ID appears in the markdown.
3. The composed prompt uses the `3-5` beat default.
4. The post-segment step lands on the workbench and asserts the broad-referrer "touches this segment" pile (a record linked via `holder`/`between`/`held_by` appears).
5. Hard-delete of an unreferenced fact succeeds; delete of a referenced secret blocks with referrer information; the force path is repair-gated (force → `force_deleted` + a persisted `repair-log.yaml` entry).
6. A corrupted current-context blocks only dependent actions (scoped health), not all actions.
7. `cd tools/manual-story-studio && npm run test:backend` (which includes this acceptance test) passes; full `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. The test never writes to or mutates a real `worlds/<slug>/` or any `_source/` surface; all world/story state lives under a `mkdtempSync` temp root removed at teardown.
2. The test drives the real service/route code paths (no mocks, no re-implemented composition/scan/health logic) and reaches no module internals; it consumes only exported functions and existing HTTP routes.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/acceptance/one-real-story.test.ts` — the end-to-end acceptance flow with the §2 load-bearing assertions and hermetic setup/teardown.
2. `tools/manual-story-studio/test/acceptance/glass-orchard-fixture.ts` — inline synthetic-world + manual-story fixture builder + teardown helper (consumed only by the acceptance test).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend` — compiles backend + runs `node --test "dist/test/**/*.test.js"` (includes the new acceptance test).
2. `cd tools/manual-story-studio && npm test` — full suite (backend + web) green.
3. The package-local `cd <pkg> && npm test` form is the correct boundary: tests compile to `dist/test/**/*.test.js` and the new `test/acceptance/*.test.ts` files match that glob without further wiring.

## Outcome

Implemented the synthetic Glass Orchard acceptance lane without production code changes. The new fixture helper creates temp-only prompt docs, world source, and manual-story metadata; the acceptance test creates story-local records, composes and saves a prompt, saves and compiles prose, exercises the post-segment workbench route, updates records, verifies hard/block/force delete behavior, performs a repair-mode segment replacement, and asserts current-context health scoping. Same-seam SPEC-121 and implementation-order status prose was truthed after the package proof passed.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` — PASS on 2026-06-03; compiled backend and ran 87 backend tests, including `dist/test/acceptance/one-real-story.test.js`.
2. `cd tools/manual-story-studio && npm test` — PASS on 2026-06-03; compiled backend, ran 489 backend/web-adjacent Node tests, then ran `npm --prefix web test`.
3. Package README/user-facing surface inspected: no README or command/documentation change required because this ticket adds private package test coverage and no new user-facing command/API.
4. Post-ticket review archived this ticket to `archive/tickets/SPEC121MANSTOSTU-001.md` and repaired active SPEC-121 / implementation-order references to the archived path.

## Deviations

- No production code change was needed; the contingency for a minimal additive read-only test seam did not fire.
- Closeout added `archive/specs/SPEC-121-manual-story-studio-synthetic-acceptance-flow.md` and `archive/specs/IMPLEMENTATION-ORDER-2026-06-03.md` to the touched file set because their same-seam status prose would otherwise remain stale. Archival was performed later by `$post-ticket-review` and the user's finished-spec archival request.
