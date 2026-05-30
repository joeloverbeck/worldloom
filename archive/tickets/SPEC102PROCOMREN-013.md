# SPEC102PROCOMREN-013: PromptPreview page + App.tsx route wiring

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` and registers two new routes in `web/src/App.tsx`.
**Deps**: 011, 012

## Problem

The author needs an in-app screen to inspect the composed Markdown, see the lint status (clean or itemized violations), copy the prompt to the clipboard, save the prompt (with optional soft-override on lint), regenerate the prompt with current inputs, or navigate back to Moment Composer with a specific section focused for editing. App.tsx must register the two new routes per SPEC-102 §4 Files to touch — Modify: `/worlds/:worldSlug/manual-stories/:msSlug/moment-composer` and `/worlds/:worldSlug/manual-stories/:msSlug/prompts/preview`.

## Assumption Reassessment (2026-05-30)

1. Verified the existing `App.tsx` route registration pattern matches the spec's prefix convention exactly: existing routes follow `/worlds/:worldSlug/manual-stories/:msSlug/...` (dashboard, records, cast). The two new routes slot in alongside without restructuring. Existing pages (Dashboard, Records, CastAndProfiles, ManualStories, CreateManualStory) live under `web/src/pages/` and are imported into App.tsx with `.js` extension per the project's Vite/TS module resolution.
2. SPEC-102 §Scope item 6 enumerates the Prompt Preview surface: composed Markdown in a monospace pane; lint status (clean / numbered violations with section + offset); Copy to clipboard button; Save Prompt button (writes md + sidecar); Regenerate button (re-runs compose); Edit Directive / Edit Cast / Edit Records / Edit Template navigate-back buttons (focus a specific Moment Composer section). The lint badge component shipped in ticket 011 renders the lint status.
3. Cross-artifact shared boundary: the page receives the compose result via `useLocation().state` from MomentComposer's `navigate` call (ticket 012); on `Regenerate` it calls `previewPrompt` again with the same input; on `Save Prompt` it calls `savePrompt` (passing `lint_override` when the user accepts the soft-override prompt for a non-clean lint result). The page also reads `useNavigate` for the Edit-* navigation back to Moment Composer with the appropriate focus hint via state.

## Architecture Check

1. Receiving compose result via router state (set by MomentComposer.tsx during navigation) avoids a redundant API call on initial render and keeps the navigation flow direct. The page tolerates direct URL navigation (no state present) by showing a "navigate back to compose" hint rather than re-composing without inputs.
2. App.tsx changes are additive — two `<Route>` lines. No restructuring of the existing routing layout.
3. No backwards-compatibility aliasing — both the page and the routes are greenfield.

## Verification Layers

1. App.tsx route registration — codebase grep-proof (`grep -nE '/moment-composer|/prompts/preview' tools/manual-story-studio/web/src/App.tsx` returns 2 matches).
2. Page UI surfaces — codebase grep-proof (`grep -nE 'Copy to clipboard|Save Prompt|Regenerate|Edit Directive|Edit Cast|Edit Records' tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns matches for each control).
3. Soft-override flow — codebase grep-proof (`grep -nE 'lint_override|copy_anyway' tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns matches).
4. Manual dry-run (capstone runbook AC #5 / #6 / #9): copy, save (clean), regenerate, edit-back navigation, and soft-override save all work end-to-end.

## What to Change

### 1. Create `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`

Structure:

```tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { previewPrompt, savePrompt } from "../api/prompts.js";
import { LintBadge } from "../components/LintBadge.js";

interface NavState {
  composeResult?: PromptComposeResult;
  composeInput?: PromptComposeRequestInput;
}

export function PromptPreview() {
  const { worldSlug, msSlug } = useParams<{ worldSlug: string; msSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as NavState;

  const [composeResult, setComposeResult] = useState<PromptComposeResult | null>(navState.composeResult ?? null);
  const [composeInput, setComposeInput] = useState<PromptComposeRequestInput | null>(navState.composeInput ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!composeResult || !composeInput) {
    return (
      <section>
        <p role="alert">No compose context. Return to Moment Composer to generate a prompt.</p>
        <button onClick={() => navigate(`/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`)}>Back to Moment Composer</button>
      </section>
    );
  }

  async function onCopy() {
    await navigator.clipboard.writeText(composeResult!.markdown);
    setSaveStatus("copied");
  }

  async function onRegenerate() {
    setSubmitting(true);
    try {
      const fresh = await previewPrompt(worldSlug!, msSlug!, composeInput!);
      setComposeResult(fresh);
      setSaveStatus(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    setSubmitting(true);
    try {
      const lint = composeResult!.lint;
      let lint_override: { findings: PromptLintFinding[]; copied_anyway_at: string } | undefined;
      if (!lint.cleanForCopy) {
        if (lint.blockingForCopy) {
          // Hard findings — Save button is disabled; this branch unreachable.
          return;
        }
        const accept = window.confirm(`This prompt has ${lint.findings.length} soft lint violations — save anyway?`);
        if (!accept) return;
        lint_override = { findings: lint.findings, copied_anyway_at: new Date().toISOString() };
      }
      const saved = await savePrompt(worldSlug!, msSlug!, { ...composeInput!, lint_override });
      setSaveStatus(`saved as ${saved.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  function onEditBack(focusHint: "directive" | "cast" | "records" | "template") {
    navigate(`/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`, {
      state: { ...composeInput, focusHint },
    });
  }

  const lint = composeResult.lint;
  const sectionCount = (composeResult.markdown.match(/^## /gm) ?? []).length;

  return (
    <section aria-labelledby="prompt-preview-heading">
      <h2 id="prompt-preview-heading">Prompt Preview</h2>
      <LintBadge lint={lint} sectionCount={sectionCount} />
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{composeResult.markdown}</pre>
      <div role="toolbar">
        <button onClick={onCopy} disabled={lint.blockingForCopy}>Copy to clipboard</button>
        <button onClick={onSave} disabled={lint.blockingForCopy || submitting}>Save Prompt</button>
        <button onClick={onRegenerate} disabled={submitting}>Regenerate</button>
        <button onClick={() => onEditBack("directive")}>Edit Directive</button>
        <button onClick={() => onEditBack("cast")}>Edit Cast</button>
        <button onClick={() => onEditBack("records")}>Edit Records</button>
        <button onClick={() => onEditBack("template")} disabled>Edit Template (SPEC-104)</button>
      </div>
      {saveStatus ? <p role="status">{saveStatus}</p> : null}
    </section>
  );
}
```

### 2. Modify `tools/manual-story-studio/web/src/App.tsx`

Add imports and route registrations:

```tsx
import { MomentComposer } from "./pages/MomentComposer.js";
import { PromptPreview } from "./pages/PromptPreview.js";
```

Inside the `<Routes>` block:

```tsx
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/moment-composer"
  element={<MomentComposer />}
/>
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/prompts/preview"
  element={<PromptPreview />}
/>
```

Add the routes alongside the existing five (Worlds, ManualStories, CreateManualStory, Dashboard, Records, CastAndProfiles) without restructuring.

### 3. Tests

Frontend tests run as `tsc --noEmit` per `web/package.json`'s `test` script. The capstone (ticket 014) includes a manual dry-run runbook covering AC #4 (UI flow), #5 (write + sidecar), #9 (override flow).

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify) — adds 2 imports + 2 `<Route>` lines

## Out of Scope

- MomentComposer page (ticket 012).
- Backend routes (ticket 010).
- LintBadge component (ticket 011).
- Beat-template editing — SPEC-104; the Edit Template button is rendered disabled.
- Per-finding inline navigation to a specific source field — the lint output identifies section + offset; the UI lists them but does NOT auto-scroll into source fields this iteration.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm run build` typechecks the new page + App.tsx changes.
2. `grep -nE '/moment-composer|/prompts/preview' tools/manual-story-studio/web/src/App.tsx` returns exactly 2 matches.
3. `grep -nE 'export function PromptPreview' tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns a match.
4. `grep -nE 'Copy to clipboard|Save Prompt|Regenerate|Edit Directive|Edit Cast|Edit Records' tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns the 6 control labels.
5. Manual dry-run (capstone runbook): clean prompt → Copy/Save succeed; soft-violation prompt → confirm dialog → Save with `lint_override`; hard-violation prompt → Copy/Save buttons disabled.

### Invariants

1. The page receives compose result via router state to avoid a redundant API call; it gracefully degrades when state is missing.
2. Save with hard lint findings is blocked at the UI layer (button disabled) AND at the server layer (409 response per ticket 010).
3. Soft-override saves persist `lint_override` into the sidecar (per SPEC-102 §3 Key Decisions "Override is logged in the prompt sidecar").
4. Edit-* buttons navigate back to Moment Composer carrying input state.

## Test Plan

### New/Modified Tests

1. None directly — frontend tests run as `tsc --noEmit`. Capstone (ticket 014) covers integration with a manual dry-run runbook.

### Commands

1. `cd tools/manual-story-studio/web && npm run build` — typecheck.
2. `cd tools/manual-story-studio && npm test` — full pipeline.
