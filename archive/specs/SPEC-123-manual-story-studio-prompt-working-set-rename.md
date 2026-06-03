# SPEC-123 — Manual Story Studio: `current-context` → `prompt-working-set` Rename

**Status:** COMPLETED
**Date:** 2026-06-03
**Classification:** tooling-adjacent (`tools/manual-story-studio`; mechanical identifier/storage/route rename; no LLM/MCP/patch-engine; no behavior change).
**Depends on:** — (independent surface; no file overlap with SPEC-122 or SPEC-124).
**Blocks:** —
**Related:** the full `current-context` identifier surface — §4 is the authoritative, exhaustive enumeration. It spans backend read/write/validate/schema/routes, `http.ts`, `compose.ts`, `health/compute.ts`, `read/records.ts`, `write/records.ts`, the prompt-payload layer (`prompt/types.ts`, `prompt/sections/section-3-current-situation.ts`), web `api/current-context.ts`, `EditCurrentContext.tsx`, `CurrentStatePanel.tsx`, `Dashboard.tsx`, `MomentComposer.tsx`, `StoryPageNav.tsx`, `App.tsx`, `types/manual-story.ts`, the `test/current-context/` directory (6 files), and seven further test files outside it (`test/prompt/{inclusion-ledger,inspector-payload,never-prompt}.test.ts`, `test/read/referrers.test.ts`, `test/web/{record-picker,useUnsavedChanges}.test.ts`, plus the `test/acceptance/one-real-story.test.ts` capstone). A full-package grep is the source of truth; see §4 and the AC#1 gate.
**Source:** critical triage of `reports/manual-story-studio-fifth-iteration.md` §§1.1 / 14 / 30 (ChatGPT-Pro, 2026-06-03). See `docs/triage/2026-06-03-manual-story-studio-fifth-iteration-triage.md` item R3. **Reverses a prior deferral** (the on-disk rename was declined iter-3, confirmed-defer iter-4); the user confirmed the reversal via `AskUserQuestion` on 2026-06-03.

---

## 1. Context & Motivation

The selector layer that controls what story truth enters a prompt was introduced (SPEC-109) as `current-context`. Later iterations renamed its **UI label** to "Prompt Working Set" (SPEC-113) but deliberately left the storage filename, schema, API routes, functions, and type as `current-context` — the on-disk rename was declined twice as "churn, zero functional gain."

That partial rename created a **split-brain state**: the UI says "Prompt Working Set" everywhere while the code, routes, file, and type say `current-context`. Verified (live tree):

- UI label "Prompt Working Set" at `StoryPageNav.tsx:7` (and "Edit/Save Prompt Working Set" on the edit page), while the nav **path** is still `current-context/edit`.
- Backend `src/{read,write,validate,schema,server/routes}/current-context.ts`; type `CurrentContext`; consumed in `compose.ts`, `health/compute.ts`, `read/records.ts`, `http.ts`.
- Web `api/current-context.ts` (`fetchCurrentContext` / `saveCurrentContext`), `EditCurrentContext.tsx`, `CurrentStatePanel.tsx`, `Dashboard.tsx`, `MomentComposer.tsx`, `types/manual-story.ts` (`CurrentContext`).
- Tests under `test/current-context/` (6 files) + `test/acceptance/one-real-story.test.ts`.

The fifth-iteration report's reframing is what lifts the prior deferral: it proposes a **clean break with no compatibility shim**, and the split itself is now the smell the prior triages were trying to avoid. Two facts make the clean break cheap and safe:

1. **No on-disk data to migrate.** The only manual-stories directory on disk (`worlds/erotica-world/manual-stories`) contains **no `current-context.yaml`** (verified). There is no production artifact to read-fallback for.
2. **The rename is mechanical.** Every identifier is caught by the TypeScript build except the HTTP route-path string and the on-disk filename — both bounded and enumerated below.

This also honors the author's standing preference against state-coupling on freely-editable artifacts (`prompt-working-set.yaml` is author-editable; no migration shim, no version coupling).

## 2. Scope

### In scope

A complete rename of the `current-context` concept to `prompt-working-set`, no behavior change:

1. **On-disk filename:** `current-context.yaml` → `prompt-working-set.yaml` (written by the write layer; read by the read layer). Because no such file exists on disk yet, no migration of existing data is required.
2. **Schema file + type:** `src/schema/current-context.ts` → `src/schema/prompt-working-set.ts`; type `CurrentContext` → `PromptWorkingSet`; web `types/manual-story.ts` `CurrentContext` → `PromptWorkingSet`.
3. **Backend modules:** `src/read/current-context.ts`, `src/write/current-context.ts`, `src/validate/current-context.ts`, `src/server/routes/current-context.ts` → `prompt-working-set.ts` filenames; `readCurrentContext`/`writeCurrentContext`/`validateCurrentContext` → `read/write/validatePromptWorkingSet`; consumers in `compose.ts`, `health/compute.ts`, `read/records.ts`, `http.ts` updated.
4. **API routes + wire path:** `/current-context` → `/prompt-working-set` (Fastify route registration in `http.ts` + the web client URL in `api/current-context.ts`). The nav path `current-context/edit` → `prompt-working-set/edit` (`StoryPageNav.tsx`, `App.tsx` routing).
5. **Web client + components:** `api/current-context.ts` → `api/prompt-working-set.ts`; `fetchCurrentContext`/`saveCurrentContext` → `fetchPromptWorkingSet`/`savePromptWorkingSet`; `EditCurrentContext.tsx` → `EditPromptWorkingSet.tsx`; `CurrentStatePanel.tsx` retains its display role but its `CurrentContext`-typed props rename.
6. **Tests:** rename `test/current-context/` → `test/prompt-working-set/`; update the acceptance test and any fixtures.
7. **Field rename (narrow, from report §30):** `current_handoff_summary` → `handoff_summary`, **in lockstep across both declarations of the field** — the `CurrentContext`/`PromptWorkingSet` schema field (`src/schema/`, `web/src/types/`) AND the *independent* prompt-payload field at `src/prompt/types.ts` (consumed at `src/prompt/compose.ts` payload key and `src/prompt/sections/section-3-current-situation.ts`). The payload declaration is NOT compiler-forced by the schema rename and is NOT caught by AC#1's grep pattern (`current_context` does not match the token `current_handoff_summary`), so it must be renamed explicitly and guarded by AC#7. **Keep** `must_not_reveal` (already clear). Other field names stay as-is.

### Out of scope

- **No compatibility shim / read fallback.** Clean break per the report and user confirmation; there is no on-disk file to fall back to.
- **New fields** the report "also consider" lists (`default_beat_target`, `brief_style_note`, `recent_segment_policy`, `working_set_notes`) and the `active_secrets_questions` → `active_reveal_controls` rename — deferred; this spec is a rename, not a schema expansion (YAGNI; no consumer named).
- Any behavior change to composition, inclusion/exclusion, or health.
- The doc/triage-file historical references to `current-context` (the three prior triage files + `reassess-spec/references/codebase-validation.md`) — those are **historical records** and stay as written; only live code/storage is renamed. (See §8.)
- **The UI prose string** `"…active in the current context)"` at `web/src/pages/PromptPreview.tsx:243` (asserted by `test/web/prompt-inspector.test.ts:86`) — this is English copy with a space, not the `current-context` identifier, and is **not** matched by AC#1's grep pattern. Left as-is: this is an identifier/storage/route/field rename, not a prose-polish pass. Recorded here so it is not mistaken for a missed rename site.

## 3. Key decisions

- **Clean break, no shim.** The decline rationale that previously blocked this ("adds coupling to a freely-editable artifact") applied to a *migration shim*; with no on-disk data and no shim, that objection is gone, and the remaining "churn" cost buys end-to-end coherence the half-rename actively undermines.
- **Rename the wire path too.** Leaving the route at `/current-context` would re-create a smaller split-brain. The route path and nav path move with everything else; client+server change in lockstep.
- **`CurrentStatePanel` keeps its name or renames to taste.** Its display role ("current state" panel) is arguably a separate UI concept from the working-set file; renaming its `CurrentContext`-typed props is required, renaming the component itself is optional polish — implementer's discretion, noted so it isn't mistaken for a missed site.
- **Field renames kept minimal.** Only `current_handoff_summary` → `handoff_summary` (the report's one clearly-justified field rename); the speculative additions and `active_reveal_controls` rename are deferred to avoid scope creep.

## 4. Files to touch

**Backend (rename file + identifiers):**
- `src/schema/current-context.ts` → `src/schema/prompt-working-set.ts` (type `CurrentContext` → `PromptWorkingSet`; `current_handoff_summary` → `handoff_summary`).
- `src/read/current-context.ts` → `src/read/prompt-working-set.ts` (`readCurrentContext` → `readPromptWorkingSet`; filename literal `current-context.yaml` → `prompt-working-set.yaml`).
- `src/write/current-context.ts` → `src/write/prompt-working-set.ts` (`writeCurrentContext` → `writePromptWorkingSet`; filename literal).
- `src/validate/current-context.ts` → `src/validate/prompt-working-set.ts` (`validateCurrentContext` → `validatePromptWorkingSet`).
- `src/server/routes/current-context.ts` → `src/server/routes/prompt-working-set.ts` (route handlers).
- `src/server/http.ts` — route registration `/current-context` → `/prompt-working-set`.
- `src/prompt/compose.ts`, `src/health/compute.ts`, `src/read/records.ts` — update `CurrentContext` type import + any `current-context` references. `compose.ts` additionally carries the prompt-payload `current_handoff_summary` key (`:370`) and `read/records.ts` produces `current-context:`-prefixed reference keys via `scanReferences` — both rename.
- `src/write/records.ts` — `import { dropLegacyReviewKey } from "../read/current-context.js"`: update the import path (the `dropLegacyReviewKey` symbol itself is unaffected; only the module path moves to `../read/prompt-working-set.js`).
- `src/prompt/types.ts`, `src/prompt/sections/section-3-current-situation.ts` — the prompt-payload layer carries its own `current_handoff_summary` field (independent of the schema field); rename to `handoff_summary` in lockstep per §2 item 7.

(The function/symbol names called out above are illustrative, not exhaustive — `dropLegacyReviewKey` and the route registrars `registerCurrentContextReadRoute`/`registerCurrentContextWriteRoute` in `http.ts`/`routes/current-context.ts` also rename for coherence. All such identifier renames are caught by the TypeScript build; AC#1's grep + `tsc` together are the completeness backstop for this enumeration.)

**Web (rename file + identifiers):**
- `web/src/api/current-context.ts` → `web/src/api/prompt-working-set.ts` (`fetchCurrentContext`/`saveCurrentContext` → `fetch/savePromptWorkingSet`; URL `/current-context` → `/prompt-working-set`).
- `web/src/pages/EditCurrentContext.tsx` → `web/src/pages/EditPromptWorkingSet.tsx`.
- `web/src/components/CurrentStatePanel.tsx` — update `CurrentContext`-typed props/imports (component rename optional).
- `web/src/pages/Dashboard.tsx`, `web/src/pages/MomentComposer.tsx` — update imports/usages.
- `web/src/components/StoryPageNav.tsx` (`:7`) — nav path `current-context/edit` → `prompt-working-set/edit`.
- `web/src/App.tsx` — route path for the edit page.
- `web/src/types/manual-story.ts` — `CurrentContext` → `PromptWorkingSet`; `current_handoff_summary` → `handoff_summary`.

**Tests:**
- `test/current-context/` (6 files) → `test/prompt-working-set/`; update assertions, filename literals, type names.
- `test/acceptance/one-real-story.test.ts` — update `current-context` references (route, filename, type).
- Seven further test files outside `test/current-context/` reference the renamed surface and must be updated:
  - `test/prompt/inclusion-ledger.test.ts`, `test/prompt/inspector-payload.test.ts`, `test/prompt/never-prompt.test.ts` — each imports `type CurrentContext` and writes a `current-context.yaml` literal in a local helper.
  - `test/read/referrers.test.ts` — imports `CurrentContext`, writes `current-context.yaml`, and asserts `current-context:`-prefixed reference keys (update the type, filename literal, and the asserted key strings together).
  - `test/web/record-picker.test.ts`, `test/web/useUnsavedChanges.test.ts` — read the renamed page by path string (`…/EditCurrentContext.tsx` → `…/EditPromptWorkingSet.tsx`); a runtime path read, not compiler-caught, so the test fails at run time if missed.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Mutable local truth, distinct from canon (report §8) | aligns @ storage naming | The renamed file stays a freely-editable author-maintained sidecar outside the canon layers; the rename adds no coupling, no shim, no version state — consistent with the author's standing preference against state-coupling on editable artifacts. |
| Naming/vocabulary coherence (product-coherence, not a FOUNDATIONS canon rule) | aligns @ UI↔storage↔API surface | A single concept name end-to-end removes the split-brain the prior partial rename created; the author's mental model ("this is the prompt working set") is no longer contradicted by the storage/route layer. |
| §Canonical Storage Layer / Hook 3 | N/A @ write boundary | Manual Studio writes only under `manual-stories/`; touches no world canon or `_source/`. Listed defensively only. |

## 6. Acceptance criteria

1. `grep -rn "current-context\|currentContext\|CurrentContext\|current_context" tools/manual-story-studio --include=*.ts --include=*.tsx` returns **zero** hits outside `dist/` (the historical doc/triage references in `docs/` and `.claude/skills/` are intentionally excluded — see §8). The optional `CurrentStatePanel` component name is the one allowed exception if the implementer keeps it; if kept, it carries no `current-context` substring beyond its own component name, which is acceptable.
2. The on-disk file written/read by the working-set layer is `prompt-working-set.yaml`; no code path references `current-context.yaml`.
3. The API route is `/prompt-working-set` and the nav/route path is `prompt-working-set/edit`; client and server agree (the working-set page loads and saves end-to-end — the wire-path lockstep guard).
4. The type is `PromptWorkingSet` in both `src/schema/` and `web/src/types/`; `current_handoff_summary` is renamed to `handoff_summary` in **both** declarations — the schema/web-types field AND the prompt-payload field in `src/prompt/types.ts` (with its consumers `compose.ts` and `section-3-current-situation.ts`); `must_not_reveal` is unchanged.
5. No behavior change: composition, inclusion/exclusion, and health produce identical results for an equivalent working set.
6. `cd tools/manual-story-studio && npm --prefix web test` and `npm run test:backend` pass; full `npm test` green; the renamed `test/prompt-working-set/` suite runs.
7. `grep -rn "current_handoff_summary" tools/manual-story-studio --include=*.ts --include=*.tsx` returns **zero** hits outside `dist/`. This is a separate gate from AC#1 because the AC#1 pattern (`current_context`) does not match the field token `current_handoff_summary`; without AC#7 the prompt-payload field rename (`src/prompt/types.ts`) has no grep guard and could be left inconsistent with the schema field.

## 7. Test plan

- Backend: `cd tools/manual-story-studio && npm run test:backend`
- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Full: `cd tools/manual-story-studio && npm test`
- Manual smoke: open the Prompt Working Set page, edit, save, generate a prompt — confirm the working set still drives inclusion (wire-path lockstep).

## 8. Risks & Assumptions

- **Wire-path + filename lockstep.** The route path string (`http.ts` ↔ `api/prompt-working-set.ts`) and the on-disk filename literal (read ↔ write layer) are the two non-mechanical edits. Both must change together; a half-rename compiles but breaks at runtime (404 on the route, or write-to-new / read-from-old filename divergence). AC#2/#3 are the guards.
- **Historical doc/triage references are intentionally NOT renamed.** `docs/triage/2026-06-01…`, `…third…`, `…fourth-iteration-triage.md`, and `.claude/skills/reassess-spec/references/codebase-validation.md` mention `current-context` as a record of past state. Rewriting history would be wrong; AC#1's grep is scoped to `tools/manual-story-studio` for exactly this reason.
- **No on-disk migration (verified).** No `current-context.yaml` exists under `worlds/*/manual-stories/`; the clean break loses no data. **Assumption:** the author has no un-committed local manual story carrying a `current-context.yaml`; if one exists, it must be renamed manually (a one-line `mv`), since there is no read-fallback by design.
- **`reorderPatches`/engine surfaces are not involved** — Manual Studio does not route through the patch engine; this is a plain file rename.
- **Scope discipline.** This is a rename only. The speculative new fields and `active_reveal_controls` rename are explicitly deferred; do not fold them in.

## Outcome

Completed: 2026-06-03

What changed:
- `current-context` was renamed to `prompt-working-set` across Manual Story Studio backend files, type names, route registration and wire path, read/write filename, prompt composition, health, record referrers, web API/page/routing/type consumers, and tests.
- The persisted sidecar is now `prompt-working-set.yaml`; no compatibility shim or read fallback for `current-context.yaml` was introduced.
- The narrow field rename `current_handoff_summary` to `handoff_summary` landed across the backend schema, web type, prompt-payload type, prompt composition mapping, section 3 emitter, UI consumers, fixtures, and tests. `must_not_reveal` was left unchanged.
- The active implementation tickets were completed and archived as `archive/tickets/SPEC123MANSTOSTU-001.md` and `archive/tickets/SPEC123MANSTOSTU-002.md`.

Deviations:
- No manual browser smoke was run; the accepted proof boundary is the package's backend route tests, web typecheck, full package test suite, and grep gates.
- The explicitly out-of-scope PromptPreview English copy `"active in the current context"` remains unchanged.
- Test assertion ordering was updated where the renamed keys sort differently from the old names.

Verification:
- `rg -n "current-context|currentContext|CurrentContext|current_context" tools/manual-story-studio -g '!dist/**' -g '!web/node_modules/**'` returned zero hits.
- `rg -n "current-context\\.yaml" tools/manual-story-studio -g '!dist/**' -g '!web/node_modules/**'` returned zero hits.
- `rg -n "current_handoff_summary" tools/manual-story-studio -g '!dist/**' -g '!web/node_modules/**'` returned zero hits.
- `cd tools/manual-story-studio && npm run test:backend` passed after both ticket slices.
- `cd tools/manual-story-studio/web && npm test` passed after both ticket slices.
- `cd tools/manual-story-studio && npm test` passed after both ticket slices.
- `git diff --check` passed for the final spec archival edit set.
