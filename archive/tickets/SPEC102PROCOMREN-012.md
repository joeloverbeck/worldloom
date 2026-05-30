# SPEC102PROCOMREN-012: MomentComposer page

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`. No impact on existing pages.
**Deps**: 011

## Problem

The author needs an in-app screen to assemble a compose-input package: the moment directive (free-form text), the involved cast (multi-select defaulting to `cast_order`), the relevant records (auto-suggested + author-pinnable), and an optional beat-template selector. The screen culminates in a "Generate Prompt" action that calls `previewPrompt` (ticket 011) and navigates to the Prompt Preview screen (ticket 013) carrying the compose result.

## Assumption Reassessment (2026-05-30)

1. Verified the existing page pattern at `tools/manual-story-studio/web/src/pages/Dashboard.tsx`, `Records.tsx`, `CastAndProfiles.tsx`, `CreateManualStory.tsx`. Each page consumes `useParams` from `react-router-dom` for `worldSlug` / `msSlug`, fetches data via the api/ client, renders forms, and navigates via `useNavigate`. The MomentComposer follows the same shape. The existing `api/records.ts` exposes record listing; the new `api/prompts.ts` exposes preview/save.
2. SPEC-102 §Scope item 1 enumerates the Moment Composer's UI surface: mandatory moment directive text area (lint rejects empty); involved cast multi-select (defaults to `cast_order`, author may narrow); relevant records picker (auto-suggests active records with `importance: high | central` + active records referencing involved cast; author may add/remove pins); optional move-family / tag / location selector (consumed by SPEC-104 — present in this iteration as inert form controls if convenient, OR deferred); optional selected beat template (deferred to SPEC-104); "Generate Prompt" button → navigates to Prompt Preview.
3. Cross-artifact shared boundary: the page calls `previewPrompt(worldSlug, msSlug, input)` from the api client (ticket 011) and navigates to `/worlds/:worldSlug/manual-stories/:msSlug/prompts/preview` (the route wired in ticket 013). Navigation carries the compose result via `useNavigate`'s state argument so the Preview page can render immediately without a redundant API call. The compose input shape (`PromptComposeRequestInput`) is the contract — `{ moment_directive, included_cast, included_records, included_template_path? }`.

## Architecture Check

1. A single page component co-locating the directive textarea, cast multi-select, and records picker keeps the compose-input authoring in one place; modal-split alternatives (separate cast picker modal, separate records picker modal) would fragment the input shape across UI states without simplifying review. The existing `CreateManualStory.tsx` precedent uses a single-page form for similar multi-section input.
2. Pre-fetching records on mount via `listRecords(worldSlug, msSlug)` populates the auto-suggest set; the page filters client-side by `importance` and cast-ref criteria. Server-side filter could be added later; not needed for this iteration.
3. No backwards-compatibility aliasing — page is greenfield.

## Verification Layers

1. Page renders with the four input surfaces — codebase grep-proof (`grep -nE 'role="textbox"|aria-label="moment directive"|aria-label="involved cast"|aria-label="relevant records"' tools/manual-story-studio/web/src/pages/MomentComposer.tsx` returns 4 matches OR equivalent JSX confirming each input is present).
2. "Generate Prompt" calls `previewPrompt` — codebase grep-proof (`grep -nE '\bpreviewPrompt\(' tools/manual-story-studio/web/src/pages/MomentComposer.tsx` returns a match).
3. Empty moment directive is gated client-side — schema validation (manual UI dry-run in capstone runbook: empty directive disables Generate Prompt button).
4. Cast multi-select defaults to `cast_order` — codebase grep-proof on the initialization branch.

## What to Change

### 1. Create `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`

Structure:

```tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listRecords } from "../api/records.js";
import { previewPrompt } from "../api/prompts.js";
import { getManualStoryMetadata } from "../api/manual-story.js"; // see existing api/ pattern; if helper missing, add a thin wrapper

export function MomentComposer() {
  const { worldSlug, msSlug } = useParams<{ worldSlug: string; msSlug: string }>();
  const navigate = useNavigate();

  const [momentDirective, setMomentDirective] = useState("");
  const [includedCast, setIncludedCast] = useState<string[]>([]);
  const [includedRecords, setIncludedRecords] = useState<string[]>([]);
  const [allCast, setAllCast] = useState<ManualRecordSummary[]>([]);
  const [allRecords, setAllRecords] = useState<ManualRecordSummary[]>([]);
  const [castOrderDefault, setCastOrderDefault] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch metadata to seed cast_order default + manual_story_slug context.
    // Fetch all cast records + all non-cast records (filtered to active client-side).
    // ...
  }, [worldSlug, msSlug]);

  const suggestedRecordIds = useMemo(() => {
    // Auto-suggest: active records with importance in {high, central} OR
    // referencing any id in includedCast (refs.characters intersection).
    // ...
  }, [allRecords, includedCast]);

  const canGenerate = momentDirective.trim().length > 0 && includedCast.length > 0;

  async function onGenerate() {
    if (!canGenerate) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await previewPrompt(worldSlug!, msSlug!, {
        moment_directive: momentDirective,
        included_cast: includedCast,
        included_records: includedRecords,
      });
      navigate(`/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`, {
        state: { composeResult: result, composeInput: { moment_directive: momentDirective, included_cast: includedCast, included_records: includedRecords } },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "preview_failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="moment-composer-heading">
      <h2 id="moment-composer-heading">Moment Composer</h2>
      <label>
        Moment directive
        <textarea
          aria-label="moment directive"
          value={momentDirective}
          onChange={(e) => setMomentDirective(e.target.value)}
          required
        />
      </label>
      {/* Cast multi-select bound to includedCast. Default: castOrderDefault. */}
      {/* Records picker: render suggested set + author-pinned set; allow add/remove. */}
      {/* Optional beat-template selector — disabled / placeholder until SPEC-104. */}
      <button onClick={onGenerate} disabled={!canGenerate || submitting}>
        Generate Prompt
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
```

Concrete UI controls:
- Moment directive: `<textarea>` (rows=6, required, aria-labelled).
- Involved cast: multi-select rendered as a checklist of cast titles (each `mchar-N` summary shows `title`); default-checked from `cast_order`. Author can narrow.
- Relevant records picker: two-column layout — left is "suggested" (auto-derived); right is "pinned" (author's explicit additions). Add/remove buttons move records between columns. Each row shows `title`, class label, and `importance`.
- Optional move-family / tag / location selector: a placeholder section commented "Reserved for SPEC-104" — not implemented this iteration.
- Generate Prompt button: disabled when empty directive OR empty cast.

### 2. Tests

Frontend tests use TypeScript typecheck only (per `web/package.json`'s `test` script). The capstone (ticket 014) includes a manual dry-run runbook for the page.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (new)

## Out of Scope

- App.tsx route wiring — ticket 013 lands `/moment-composer` and `/prompts/preview` routes together since adding both routes in one diff is the smaller-and-more-coherent change.
- PromptPreview page — ticket 013.
- Beat-template picker — SPEC-104.
- Server-side suggestion ranking — client-side filter is sufficient for this iteration.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm run build` typechecks the new page.
2. `grep -nE 'export function MomentComposer' tools/manual-story-studio/web/src/pages/MomentComposer.tsx` returns a match.
3. `grep -nE 'previewPrompt\(' tools/manual-story-studio/web/src/pages/MomentComposer.tsx` returns a match.
4. Manual dry-run (ticket 014 runbook AC #4): empty directive disables Generate Prompt; selecting cast + records + non-empty directive enables it; clicking Generate navigates to `/prompts/preview` with state.

### Invariants

1. The page does NOT call `savePrompt` — only `previewPrompt`. Save happens on the Prompt Preview screen.
2. The page does NOT write to disk; all state is in-memory plus the API call.
3. Cast multi-select defaults to `cast_order` from manual story metadata.

## Test Plan

### New/Modified Tests

1. None directly — frontend tests run as `tsc --noEmit`. The capstone test (ticket 014) includes a manual dry-run runbook for AC #4.

### Commands

1. `cd tools/manual-story-studio/web && npm run build` — typecheck.
2. `cd tools/manual-story-studio && npm test` — full pipeline.
