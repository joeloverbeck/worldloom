# SPEC123MANSTOSTU-001: Rename `current-context` → `prompt-working-set` (identifiers, files, routes, filename, tests)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` backend + web; no impact on any other tool/package (the package is canon-fenced and has no external consumers).
**Deps**: None

## Problem

Manual Story Studio's prompt-working-set selector was introduced as `current-context` (SPEC-109). A later iteration renamed only its **UI label** to "Prompt Working Set" (SPEC-113) and deliberately left the storage filename, schema type, API routes, functions, and identifiers as `current-context`. The result is a split-brain: the UI says "Prompt Working Set" while the code, routes, on-disk filename, and type say `current-context`. SPEC-123 lifts the prior deferral (no compatibility shim is needed, and there is no on-disk `current-context.yaml` to migrate) and performs a clean-break rename of the whole identifier/file/route surface so the concept name is coherent end-to-end. This ticket covers the identifier/file/route/filename/test rename (SPEC-123 §2 in-scope items 1–6); the narrow field rename `current_handoff_summary` → `handoff_summary` is split into SPEC123MANSTOSTU-002.

## Assumption Reassessment (2026-06-03)

1. The full `current-context` surface was enumerated by a package-wide grep (`current-context|currentContext|CurrentContext|current_context`, excluding `dist/` and `web/node_modules/`): backend `src/{read,write,validate,schema,server/routes}/current-context.ts`, `src/server/http.ts` (route registration via `registerCurrentContextReadRoute`/`registerCurrentContextWriteRoute`), `src/prompt/compose.ts`, `src/health/compute.ts` (carries health error-code strings `current-context-yaml-parse-failed` / `current-context-reference-broken`), `src/read/records.ts` (produces `current-context:`-prefixed reference keys via `scanReferences`), `src/write/records.ts` (`import { dropLegacyReviewKey } from "../read/current-context.js"`); web `api/current-context.ts` (`fetchCurrentContext`/`saveCurrentContext`), `EditCurrentContext.tsx`, `CurrentStatePanel.tsx`, `Dashboard.tsx`, `MomentComposer.tsx`, `StoryPageNav.tsx:7` (nav `path: "current-context/edit"`), `App.tsx:111` (route path `…/current-context/edit`), `types/manual-story.ts`; tests `test/current-context/` (6 files), `test/acceptance/one-real-story.test.ts`, and seven further files outside `test/current-context/` (`test/prompt/{inclusion-ledger,inspector-payload,never-prompt}.test.ts` import `type CurrentContext` + write `current-context.yaml`; `test/read/referrers.test.ts` asserts `current-context:` ref-keys + `current-context.yaml`; `test/web/{record-picker,useUnsavedChanges}.test.ts` read `EditCurrentContext.tsx` by path string).
2. SPEC-123 was reassessed in-session (2026-06-03); source report `reports/manual-story-studio-fifth-iteration.md` §§1.1/14/30 and triage item R3. Sibling specs `specs/SPEC-122-*.md` and `specs/SPEC-124-*.md` touch disjoint file sets (grep-confirmed: neither references `current-context`).
3. Shared boundary under audit: the **wire-path + filename lockstep**. The HTTP route string (`http.ts`/`routes/*.ts` ↔ web client URL in `api/*.ts`) and the on-disk filename literal (read layer ↔ write layer) are the two non-mechanical edits — both must change together or the app compiles but breaks at runtime (404 on the route, or write-new/read-old filename divergence). AC#2/#3 are the guards.
4. FOUNDATIONS: `manual-story-studio` is a canon-fenced package (writes only under `worlds/<slug>/manual-stories/`; `package.json` excludes `@worldloom/patch-engine`/`@worldloom/world-mcp`). FOUNDATIONS §Canonical Storage Layer / Hook 3 is N/A — this rename touches no `_source/` or canon surface; the renamed file stays a freely-editable author-maintained sidecar (Mutable local truth, distinct from canon). Rule 6 (No Silent Retcons): this modifies existing code — the retcon justification is that the half-rename split-brain is itself the smell the prior triages tried to avoid; a clean break with no shim is now correct because no on-disk data exists to migrate.
5. (was template item 7 — rename blast radius) Pipeline-wide grep confirms the blast radius is the `tools/manual-story-studio` package only: zero `current-context`/`CurrentContext`/`prompt-working-set` consumers in `tools/` outside the package; the only `.claude/skills/` hit is `reassess-spec/references/codebase-validation.md` (a historical/illustrative reference, intentionally excluded per SPEC-123 §8 — rewriting it would falsify a record of past state). Doc/triage historical references are likewise out of scope.

## Architecture Check

1. A clean-break rename (no transition alias, no read-fallback) is cleaner than a half-rename or a shim: the concept name becomes coherent across UI ↔ storage ↔ API ↔ type, and no compatibility burden is carried. There is no on-disk `current-context.yaml` under `worlds/*/manual-stories/` (only `worlds/erotica-world/manual-stories` exists, with no such file), so the clean break loses no data.
2. No backwards-compatibility aliasing/shims are introduced — per SPEC-123 §3 and `tickets/README.md` §Core Architectural Contract item 1.

## Verification Layers

1. No `current-context`-family identifier survives in package code/tests → codebase grep-proof (AC#1).
2. Wire path agrees client↔server; nav/route path renamed → skill dry-run (load + save the Prompt Working Set page end-to-end) + codebase grep-proof on `http.ts`/`api/*.ts`/`App.tsx`/`StoryPageNav.tsx`.
3. On-disk filename agrees read↔write → codebase grep-proof (no `current-context.yaml` literal remains; `prompt-working-set.yaml` used by both layers).
4. No behavior change (composition/inclusion/health identical for an equivalent working set) → full test suite (`npm test`) green + manual smoke.

## What to Change

### 1. Backend file + identifier rename

- `src/schema/current-context.ts` → `src/schema/prompt-working-set.ts`; type `CurrentContext` → `PromptWorkingSet` (keep field `current_handoff_summary` unchanged here — renamed in 002).
- `src/read/current-context.ts` → `src/read/prompt-working-set.ts` (`readCurrentContext` → `readPromptWorkingSet`; filename literal `current-context.yaml` → `prompt-working-set.yaml`; `dropLegacyReviewKey` keeps its name).
- `src/write/current-context.ts` → `src/write/prompt-working-set.ts` (`writeCurrentContext` → `writePromptWorkingSet`; filename literal).
- `src/validate/current-context.ts` → `src/validate/prompt-working-set.ts` (`validateCurrentContext` → `validatePromptWorkingSet`).
- `src/server/routes/current-context.ts` → `src/server/routes/prompt-working-set.ts` (route handlers; `registerCurrentContextReadRoute`/`registerCurrentContextWriteRoute` → `registerPromptWorkingSetReadRoute`/`registerPromptWorkingSetWriteRoute`; the `/current-context` route-path string → `/prompt-working-set`).
- `src/server/http.ts` — update the route-registrar imports + calls, and any `/current-context` registration to `/prompt-working-set`.
- `src/prompt/compose.ts`, `src/health/compute.ts`, `src/read/records.ts`, `src/write/records.ts` — update `CurrentContext` type imports, the renamed read/write/validate function imports, the import path `../read/current-context.js` → `../read/prompt-working-set.js`, the health error-code strings (`current-context-yaml-parse-failed` → `prompt-working-set-yaml-parse-failed`, `current-context-reference-broken` → `prompt-working-set-reference-broken`), and the `current-context:` reference-key prefix produced by `scanReferences`.

### 2. Web file + identifier + route rename

- `web/src/api/current-context.ts` → `web/src/api/prompt-working-set.ts` (`fetchCurrentContext`/`saveCurrentContext` → `fetchPromptWorkingSet`/`savePromptWorkingSet`; client URL `/current-context` → `/prompt-working-set`).
- `web/src/pages/EditCurrentContext.tsx` → `web/src/pages/EditPromptWorkingSet.tsx` (export rename `EditCurrentContext` → `EditPromptWorkingSet`).
- `web/src/components/CurrentStatePanel.tsx` — update `CurrentContext`-typed props/imports → `PromptWorkingSet` (renaming the component itself is optional polish at implementer discretion; if kept, its name carrying `CurrentContext` is the one allowed AC#1 exception).
- `web/src/pages/Dashboard.tsx`, `web/src/pages/MomentComposer.tsx` — update imports/usages of the renamed type/api.
- `web/src/components/StoryPageNav.tsx:7` — nav `path: "current-context/edit"` → `"prompt-working-set/edit"`.
- `web/src/App.tsx` — route path `…/current-context/edit` → `…/prompt-working-set/edit`; update the `EditCurrentContext` import/element to `EditPromptWorkingSet`.
- `web/src/types/manual-story.ts` — type `CurrentContext` → `PromptWorkingSet` (keep field `current_handoff_summary` here — renamed in 002).

### 3. Test rename + consumer updates

- `test/current-context/` (6 files) → `test/prompt-working-set/`; update assertions, filename literals, type names, route strings, and the renamed read/write/validate function names. (Rename the per-file `current-context-*.test.ts` basenames to `prompt-working-set-*` for consistency.)
- `test/acceptance/one-real-story.test.ts` — update `current-context` references (route, filename, type).
- `test/prompt/{inclusion-ledger,inspector-payload,never-prompt}.test.ts` — update `type CurrentContext` imports → `PromptWorkingSet`, the import path, and the `current-context.yaml` literal → `prompt-working-set.yaml`.
- `test/read/referrers.test.ts` — update `CurrentContext` import, `current-context.yaml` literal, and the asserted `current-context:`-prefixed reference-key strings → `prompt-working-set:`.
- `test/web/{record-picker,useUnsavedChanges}.test.ts` — update the `EditCurrentContext.tsx` path strings → `EditPromptWorkingSet.tsx`.

## Files to Touch

- `tools/manual-story-studio/src/schema/current-context.ts` → `prompt-working-set.ts` (rename)
- `tools/manual-story-studio/src/read/current-context.ts` → `prompt-working-set.ts` (rename)
- `tools/manual-story-studio/src/write/current-context.ts` → `prompt-working-set.ts` (rename)
- `tools/manual-story-studio/src/validate/current-context.ts` → `prompt-working-set.ts` (rename)
- `tools/manual-story-studio/src/server/routes/current-context.ts` → `prompt-working-set.ts` (rename)
- `tools/manual-story-studio/src/server/http.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/src/health/compute.ts` (modify)
- `tools/manual-story-studio/src/read/records.ts` (modify)
- `tools/manual-story-studio/src/write/records.ts` (modify)
- `tools/manual-story-studio/web/src/api/current-context.ts` → `prompt-working-set.ts` (rename)
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` → `EditPromptWorkingSet.tsx` (rename)
- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `tools/manual-story-studio/web/src/components/StoryPageNav.tsx` (modify)
- `tools/manual-story-studio/web/src/App.tsx` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/test/current-context/` (6 files) → `test/prompt-working-set/` (rename)
- `tools/manual-story-studio/test/acceptance/one-real-story.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/inspector-payload.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/never-prompt.test.ts` (modify)
- `tools/manual-story-studio/test/read/referrers.test.ts` (modify)
- `tools/manual-story-studio/test/web/record-picker.test.ts` (modify)
- `tools/manual-story-studio/test/web/useUnsavedChanges.test.ts` (modify)

## Out of Scope

- The field rename `current_handoff_summary` → `handoff_summary` — owned by SPEC123MANSTOSTU-002.
- Any compatibility shim or read fallback (clean break per SPEC-123 §2/§3).
- New working-set fields (`default_beat_target`, `brief_style_note`, `recent_segment_policy`, `working_set_notes`) and the `active_secrets_questions` → `active_reveal_controls` rename — deferred per SPEC-123 §2.
- Any behavior change to composition, inclusion/exclusion, or health.
- Doc/triage historical references to `current-context` and `.claude/skills/reassess-spec/references/codebase-validation.md` — historical records, intentionally not renamed (SPEC-123 §8).
- The UI prose string `"…active in the current context)"` at `web/src/pages/PromptPreview.tsx:243` — English copy with a space, not an identifier; left as-is per SPEC-123 §2.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "current-context\|currentContext\|CurrentContext\|current_context" tools/manual-story-studio --include=*.ts --include=*.tsx` returns **zero** hits outside `dist/` (the optional `CurrentStatePanel` component name is the one allowed exception if the implementer keeps it). (SPEC-123 AC#1)
2. No code path references `current-context.yaml`; the working-set layer reads/writes `prompt-working-set.yaml`. (SPEC-123 AC#2)
3. The API route is `/prompt-working-set` and the nav/route path is `prompt-working-set/edit`; client and server agree — the Prompt Working Set page loads and saves end-to-end. (SPEC-123 AC#3)
4. `cd tools/manual-story-studio && npm test` is green; the renamed `test/prompt-working-set/` suite runs. (SPEC-123 AC#6)

### Invariants

1. Composition, inclusion/exclusion, and health produce identical results for an equivalent working set (no behavior change). (SPEC-123 AC#5)
2. No backwards-compatibility alias or read fallback exists for the old `current-context` name in any layer.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-working-set/*` — renamed from `test/current-context/`; assertions/filename-literals/type-names/route-strings updated.
2. `tools/manual-story-studio/test/{acceptance,prompt,read,web}/*` — the seven consumer tests outside `test/current-context/` updated for the renamed type, filename literal, ref-key prefix, and page path strings.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio/web && npm test`
3. `cd tools/manual-story-studio && npm test` — full suite (backend build + `node --test` + web typecheck), the correct end-to-end verification boundary for a package-scoped rename.
